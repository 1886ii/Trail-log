<script setup>
/* ============================================================
   发布记录
   ------------------------------------------------------------
   Quill 2 在这里是命令式组件：Vue 只负责外壳（标题 / 类型 /
   可见范围 / 卡片图 / 发布），编辑器本体、气泡条、取色板、大图
   预览、快捷键面板都按旧原型的 DOM 行为照搬，避免重写引入偏差。
   数据落点仍是 localStorage('xj-feed')，正式版换 POST /api/posts。
   ============================================================ */
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { loadPosts, savePosts, pidOf as feedPidOf } from '../lib/posts.js';

const route = useRoute();
const router = useRouter();

const MAX_IMG = 9;
const TAGS = ['图文记录', '学习笔记', '随感'];
const VIS = ['仅自己', '家人可见', '公开'];

let quill = null;
let QuillCtor = null;        /* 动态 import 拿到的 Quill 构造器：大图预览删除、草稿清洗要用 */
let pidSeq = 0;
let cardItems = [];          /* [{ pid, src, on }] 顺序 = 正文出现顺序 */
let lastSig = '';
let draftTimer = null;
let autoTimer = null;
let wantPlain = false;

const host = ref(null);
const fallbackEl = ref(null);
const coverAddEl = ref(null);
const kbdBtnEl = ref(null);
const bubbleEl = ref(null);
const paletteEl = ref(null);
const titleEl = ref(null);
const fileInput = ref(null);

const title = ref('');
const tag = ref('图文记录');
const vis = ref('仅自己');
const editingId = ref(null);      /* 非空 = 编辑已有记录（?edit=<pid>），发布变保存修改 */
const isEdit = computed(() => editingId.value != null);
const cards = ref([]);            /* 渲染用：{ pid, src, on, order } */
const wc = ref(0);
const imgwc = ref(0);
const errMsg = ref('');
const noQuill = ref(false);
const autosaveTip = ref('每 2 秒自动存一次草稿，关页不丢');
const draftBtnText = ref('存草稿');
const focusOn = ref(false);

const coverNote = computed(() => (cards.value.length && !cards.value.some((c) => c.on)
  ? '一张都没勾：卡片只显示文字；正文里的图仍然保存着，不会被删。'
  : ''));
const coverCount = computed(() => (cards.value.length
  ? '· 已选 ' + cards.value.filter((c) => c.on).length + ' / 共 ' + cards.value.length + ' 张'
  : ''));

/* ---------- 气泡条 / 取色板 / 快捷键 / 大图 ---------- */
const bubble = ref({ show: false, left: 0, top: 0, bold: false, italic: false, underline: false, strike: false, color: '' });
const palette = ref({ show: false, left: 0, top: 0, kindOpen: false });
const kbd = ref({ show: false, left: 0, top: 0 });
const viewer = ref({ show: false, src: '', label: '' });

let bubbleSel = null;
let viewerNode = null;

/* ---------- 编辑器初始化 ---------- */
async function initQuill() {
  /* Quill 按需加载：写作页不是首屏，别让它进首包 */
  QuillCtor = (await import('quill')).default;
  const Quill = QuillCtor;

  /* 颜色 / 底色用内联样式记录（Quill 默认按 class 记，颜色一多要逐个补 CSS） */
  try {
    const C = Quill.import('attributors/style/color');
    const B = Quill.import('attributors/style/background');
    if (C) Quill.register(C, true);
    if (B) Quill.register(B, true);
  } catch (e) { /* 取不到就退回默认实现 */ }

  /* 分割线：Quill 没有内置，用 BlockEmbed 造一个 <hr> */
  try {
    const BlockEmbed = Quill.import('blots/block/embed');
    const DividerBlot = class extends BlockEmbed {};
    DividerBlot.blotName = 'divider';
    DividerBlot.tagName = 'hr';
    DividerBlot.className = 'ql-divider';
    DividerBlot.create = () => document.createElement('hr');
    Quill.register(DividerBlot, true);
  } catch (e) { /* 注册失败只是少一个按钮 */ }

  quill = new Quill(host.value, {
    theme: 'snow',
    placeholder: '记下今天的想法、感受…… 可以直接粘贴或拖入截图。',
    modules: {
      toolbar: {
        container: [
          ['bold', 'italic', 'underline', 'strike', 'code'],
          [{ script: 'sub' }, { script: 'super' }],
          [{ size: ['small', false, 'large', 'huge'] }],
          [{ header: [1, 2, 3, false] }],
          [{ color: [] }, { background: [] }],
          [{ list: 'ordered' }, { list: 'bullet' }, { list: 'checked' }],
          [{ indent: '-1' }, { indent: '+1' }],
          [{ align: [] }],
          ['blockquote', 'code-block', 'divider'],
          ['image', 'link'],
          ['undo', 'redo'],
          ['clean']
        ],
        handlers: {
          image: () => pickFiles(),
          divider: () => insertDivider(),
          undo: () => { if (quill) quill.history.undo(); },
          redo: () => { if (quill) quill.history.redo(); }
        }
      }
    }
  });

  localizeToolbar();
  decorateToolbar();
  initMarkdown();
  initBubble();
  initPasteDrop();
  initViewer();
  initWordCount();
  syncTopbarH();

  quill.on('text-change', () => { refreshCards(); scheduleDraft(); });
  quill.on('selection-change', (range) => {
    if (range) placeBubble(range);
    else { bubble.value.show = false; palette.value.show = false; }
  });
  quill.on('text-change', () => { if (bubble.value.show) placeBubble(); });
  quill.root.addEventListener('mouseup', schedulePlace);
  quill.root.addEventListener('keyup', schedulePlace);
  quill.root.addEventListener('scroll', closeBubble);
  window.addEventListener('scroll', closeBubble, true);
  window.addEventListener('resize', onResize);

  restoreOrEdit();
  autoTimer = setInterval(() => {
    if (editingId.value != null) return;   /* 编辑已有记录时不碰草稿箱 */
    const c = getContent();
    if (!c.empty || title.value.trim()) saveDraft(true);
  }, 20000);

  if ('demo' in route.query) seedDemo();
}

function localizeToolbar() {
  const tb = quill && quill.getModule('toolbar');
  const box = tb && tb.container;
  if (!box) return;
  const TIPS = {
    'ql-bold': '加粗 Ctrl+B', 'ql-italic': '斜体 Ctrl+I', 'ql-underline': '下划线 Ctrl+U',
    'ql-strike': '删除线', 'ql-code': '行内代码 Ctrl+E',
    'ql-size': '字号', 'ql-header': '标题级别',
    'ql-color': '文字颜色', 'ql-background': '底色高亮',
    'ql-list': '列表', 'ql-indent': '缩进', 'ql-align': '对齐方式',
    'ql-blockquote': '引用', 'ql-code-block': '代码块', 'ql-divider': '插入分割线',
    'ql-image': '插入图片', 'ql-link': '插入链接',
    'ql-undo': '撤销 Ctrl+Z', 'ql-redo': '重做 Ctrl+Y', 'ql-clean': '清除格式'
  };
  Object.keys(TIPS).forEach((k) => {
    box.querySelectorAll('.' + k).forEach((el) => el.setAttribute('title', TIPS[k]));
  });
  box.querySelectorAll('.ql-script').forEach((el) => {
    el.setAttribute('title', el.value === 'super' ? '上标' : '下标');
  });
}

/* Quill 只给内置格式画图标，自定义按钮要自己补 SVG */
function decorateToolbar() {
  const tb = quill && quill.getModule('toolbar');
  const box = tb && tb.container;
  if (!box) return;
  const ICONS = {
    divider: '<svg viewBox="0 0 18 18"><line class="ql-stroke" x1="2" y1="9" x2="16" y2="9"/>' +
      '<circle class="ql-fill" cx="9" cy="3.4" r="1.1"/><circle class="ql-fill" cx="9" cy="14.6" r="1.1"/></svg>',
    undo: '<svg viewBox="0 0 18 18"><polyline class="ql-stroke" points="6.5,5 2.5,9 6.5,13"/>' +
      '<path class="ql-stroke" d="M2.5 9h7.5a4.6 4.6 0 0 1 0 9.2H8"/></svg>',
    redo: '<svg viewBox="0 0 18 18"><polyline class="ql-stroke" points="11.5,5 15.5,9 11.5,13"/>' +
      '<path class="ql-stroke" d="M15.5 9H8a4.6 4.6 0 0 0 0 9.2h2"/></svg>'
  };
  Object.keys(ICONS).forEach((k) => {
    const b = box.querySelector('.ql-' + k);
    if (b && !b.querySelector('svg')) b.innerHTML = ICONS[k];
  });
}

function insertDivider() {
  if (!quill) return;
  const sel = quill.getSelection(true);
  const at = sel ? sel.index : quill.getLength() - 1;
  if (sel && sel.length) quill.deleteText(sel.index, sel.length, 'user');
  quill.insertEmbed(at, 'divider', true, 'user');
  quill.setSelection(at + 1, 0, 'user');
  refreshCards();
}

/* ---------- 图片：选择 / 压缩 / 粘贴 / 拖入 ---------- */
function pickFiles() { if (fileInput.value) fileInput.value.click(); }

function imgCountInEditor() {
  return quill ? quill.root.querySelectorAll('img').length : 0;
}

/* 长边压到 1600px / JPEG 0.82：手机原图直接 base64 会撑爆 localStorage。
   ⚠️ 所有路径都要「解码验证」：
   · toDataURL 失败时返回 'data:,'（truthy！）——直接入库就是九宫格里的空白格子
   · HEIC 等浏览器放不了的格式，FileReader 能读出来但渲染不出来
   这两条以前都是静默的：选 8 张只出 3 张，剩下全程无提示。 */
function compressFile(file, cb) {
  const finish = (data) => {
    cb(data && /^data:image\//i.test(data) && data.length > 512 ? data : null);
  };
  const viaCanvas = (url) => {
    const im = new Image();
    im.onload = () => {
      let out = null;
      try {
        const max = 1600;
        const sc = Math.min(1, max / Math.max(im.naturalWidth || 1, im.naturalHeight || 1));
        const w = Math.max(1, Math.round((im.naturalWidth || 1) * sc));
        const h = Math.max(1, Math.round((im.naturalHeight || 1) * sc));
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const g = cv.getContext('2d');
        g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
        g.drawImage(im, 0, 0, w, h);
        out = cv.toDataURL('image/jpeg', 0.82);
      } catch (e) { out = null; }
      URL.revokeObjectURL(url);
      finish(out);
    };
    im.onerror = () => { URL.revokeObjectURL(url); cb(null); };
    im.src = url;
  };
  if (file.size < 260 * 1024) {
    /* 小图保留原样（GIF 动图不丢），但先解码验证一次，放不了的就地判废 */
    const url = URL.createObjectURL(file);
    const probe = new Image();
    probe.onload = () => {
      URL.revokeObjectURL(url);
      const fr = new FileReader();
      fr.onload = () => finish(fr.result);
      fr.onerror = () => cb(null);
      fr.readAsDataURL(file);
    };
    probe.onerror = () => { URL.revokeObjectURL(url); cb(null); };
    probe.src = url;
    return;
  }
  viaCanvas(URL.createObjectURL(file));
}

function addFiles(files, range) {
  if (!quill || !files || !files.length) return;
  let list = Array.from(files).filter((f) => f && f.type && f.type.indexOf('image') === 0);
  if (!list.length) return;

  const room = MAX_IMG - imgCountInEditor();
  if (room <= 0) { showError('正文最多 ' + MAX_IMG + ' 张图 —— 和朋友圈一样'); return; }
  if (list.length > room) {
    list = list.slice(0, room);
    showError('正文最多 ' + MAX_IMG + ' 张图，已插入前 ' + room + ' 张');
  }

  /* 粘贴/拖入带上光标位置：图插在光标处，不再一律甩到末尾。
     有选区时粘贴 = 替换选区（和系统行为一致）；选区推迟到第一张图真正落地才删，
     全部识别失败就不会白丢选中的文字。压缩是异步串行的，起点锁定，不受过程影响。 */
  let at = (range && typeof range.index === 'number' && range.index >= 0) ? range.index : null;
  let selLen = (at != null) ? (range.length || 0) : 0;
  let placed = false;

  let i = 0;
  let skipped = 0;
  (function next() {
    if (i >= list.length) {
      if (skipped) showError(skipped + ' 张图无法识别，已跳过 —— 换 JPG / PNG 试试');
      refreshCards();
      return;
    }
    compressFile(list[i++], (data) => {
      if (!data) { skipped++; next(); return; }
      if (at == null) at = quill.getLength() - 1;
      if (!placed && selLen) { quill.deleteText(at, selLen, 'user'); selLen = 0; }
      placed = true;
      quill.insertEmbed(at, 'image', data, 'user');
      quill.setSelection(at + 1, 0, 'silent');
      at += 1;
      next();
    });
  })();
}

function onFilePick(e) {
  addFiles(e.target.files);
  e.target.value = '';
}

function imgFilesOf(dt) {
  const out = [];
  if (!dt) return out;
  if (dt.items) {
    for (let i = 0; i < dt.items.length; i++) {
      const it = dt.items[i];
      if (it.kind === 'file' && it.type && it.type.indexOf('image') === 0) {
        const f = it.getAsFile();
        if (f) out.push(f);
      }
    }
  }
  if (!out.length && dt.files) {
    for (let j = 0; j < dt.files.length; j++) {
      if (dt.files[j].type && dt.files[j].type.indexOf('image') === 0) out.push(dt.files[j]);
    }
  }
  return out;
}

/* 粘贴 / 拖入都走 addFiles。
   ⚠️ 挂在 document 捕获阶段：Quill 自带剪贴板上传也监听 paste，
   只在 root 上拦会「一张图变两张」。 */
function onPaste(e) {
  if (!quill) return;
  const t = e.target;
  if (!(t && quill.root.contains(t))) return;
  const files = imgFilesOf(e.clipboardData);
  if (!files.length) {
    if (wantPlain && e.clipboardData) {
      const txt = e.clipboardData.getData('text/plain');
      wantPlain = false;
      if (txt) {
        e.preventDefault();
        e.stopPropagation();
        const sel = quill.getSelection(true);
        const at = sel ? sel.index : quill.getLength() - 1;
        if (sel && sel.length) quill.deleteText(sel.index, sel.length, 'user');
        quill.insertText(at, txt, 'user');
        quill.setSelection(at + txt.length, 0, 'user');
      }
    }
    return;
  }
  e.preventDefault();
  e.stopPropagation();
  /* getSelection(true)：强制 focus + 实时同步，缓存丢失时不至于掉回「插到末尾」 */
  addFiles(files, quill.getSelection(true));
}

function onDrop(e) {
  if (!quill) return;
  const t = e.target;
  if (!(t && quill.root.contains(t))) return;
  const files = imgFilesOf(e.dataTransfer);
  if (!files.length) return;
  e.preventDefault();
  e.stopPropagation();
  addFiles(files, quill.getSelection(true));
}

function onKeydownPlain(e) {
  wantPlain = !!(e.shiftKey && (e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V'));
}
function onKeyupPlain() { wantPlain = false; }

function initPasteDrop() {
  document.addEventListener('keydown', onKeydownPlain, true);
  document.addEventListener('keyup', onKeyupPlain, true);
  document.addEventListener('paste', onPaste, true);
  document.addEventListener('drop', onDrop, true);
}

/* ---------- 卡片图片 ---------- */
function pidOf(im) {
  if (!im.__pid) im.__pid = ++pidSeq;
  return im.__pid;
}
function editorImgs() {
  if (!quill) return [];
  return Array.from(quill.root.querySelectorAll('img')).filter((im) => !!im.getAttribute('src'));
}

function refreshCards() {
  const imgs = editorImgs();
  const sig = imgs.map(pidOf).join(',') + '|' + cardItems.map((it) => (it.on ? 1 : 0)).join('');
  if (sig === lastSig) return;
  lastSig = sig;

  /* 一对一继承旧状态：先按 pid 认元素，pid 认不到（Quill 重建过 DOM）
     再按 src 找一张没用过的旧项兜底；都不是就是新图，默认勾上 */
  const pool = cardItems.slice();
  cardItems = imgs.map((im) => {
    const src = im.getAttribute('src') || '';
    const pid = pidOf(im);
    let k = pool.findIndex((p) => p.pid === pid);
    if (k < 0) k = pool.findIndex((p) => p.src === src);
    if (k < 0) return { pid, src, on: true };
    return { pid, src, on: pool.splice(k, 1)[0].on };
  });

  let n = 0;
  cards.value = cardItems.map((it) => ({ ...it, order: it.on ? ++n : 0 }));
}

function toggleCard(i) {
  const it = cardItems[i];
  if (!it) return;
  it.on = !it.on;
  lastSig = '';
  refreshCards();
  scheduleDraft();
}

/* ---------- Markdown 快捷输入 ---------- */
const MD_RULES = [
  ['- [ ] ', { list: 'checked' }],
  ['[ ] ', { list: 'checked' }],
  ['### ', { header: 3 }],
  ['## ', { header: 2 }],
  ['# ', { header: 1 }],
  ['1. ', { list: 'ordered' }],
  ['---', { divider: true }],
  ['- ', { list: 'bullet' }],
  ['* ', { list: 'bullet' }],
  ['> ', { blockquote: true }],
  ['```', { 'code-block': true }]
];

function cursorFromDelta(delta) {
  if (!delta || !delta.ops) return null;
  let pos = 0;
  delta.ops.forEach((op) => {
    if (typeof op.retain === 'number') pos += op.retain;
    else if (typeof op.insert === 'string') pos += op.insert.length;
    else if (op.insert) pos += 1;
  });
  return pos;
}

function mdConvert(delta) {
  if (!quill) return;
  const sel = quill.getSelection();
  let idx = cursorFromDelta(delta);
  if (idx == null) idx = (sel && !sel.length) ? sel.index : null;
  if (idx == null) return;
  const line = quill.getLine(idx)[0];
  if (!line) return;
  const start = line.offset();
  if (idx <= start) return;
  const before = quill.getText(start, idx - start);

  for (let i = 0; i < MD_RULES.length; i++) {
    const p = MD_RULES[i][0];
    if (before !== p) continue;
    const fmt = MD_RULES[i][1];
    quill.deleteText(start, p.length, 'user');
    if (fmt.divider) {
      quill.insertEmbed(start, 'divider', true, 'user');
      quill.setSelection(start + 1, 0, 'silent');
      return;
    }
    quill.formatLine(start, 1, fmt, 'user');
    return;
  }
}

function initMarkdown() {
  quill.on('text-change', (d, o, src) => { if (src === 'user') mdConvert(d); });
}

/* ---------- 选中气泡条 ---------- */
function placeBubble(range) {
  if (!quill) return;
  const sel = range || quill.getSelection();
  if (!sel || !sel.length) { bubble.value.show = false; palette.value.show = false; return; }
  bubbleSel = sel;
  const b = quill.getBounds(sel.index, sel.length);
  if (!b) { bubble.value.show = false; return; }
  const hostRect = quill.container.getBoundingClientRect();
  let top = hostRect.top + b.top - 44;
  let left = hostRect.left + b.left + b.width / 2;
  bubble.value.show = true;
  const bw = bubbleEl.value ? (bubbleEl.value.offsetWidth || 210) : 210;
  left = Math.max(8, Math.min(window.innerWidth - bw - 8, left - bw / 2));
  top = Math.max(8, top);

  const fmt = quill.getFormat(sel.index, sel.length);
  bubble.value = {
    show: true, left: Math.round(left), top: Math.round(top),
    bold: !!fmt.bold, italic: !!fmt.italic, underline: !!fmt.underline, strike: !!fmt.strike,
    color: fmt.color || ''
  };
}
function schedulePlace() {
  setTimeout(() => { const r = quill && quill.getSelection(); if (r && r.length) placeBubble(r); }, 0);
}
function closeBubble() { bubble.value.show = false; palette.value.show = false; }

function openPalette() {
  if (!paletteEl.value) return;
  const br = bubbleEl.value.getBoundingClientRect();
  const pw = paletteEl.value.offsetWidth || 216;
  const ph = paletteEl.value.offsetHeight || 132;
  let left = Math.max(8, Math.min(window.innerWidth - pw - 8, br.left));
  let top = br.bottom + 6;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, br.top - ph - 6);
  palette.value = { show: true, left: Math.round(left), top: Math.round(top), kindOpen: true };
}

function applyPalette(kind, v) {
  const sel = quill.getSelection() || bubbleSel;
  if (!sel) return;
  const val = v === 'false' ? false : v;
  if (!sel.length) quill.format(kind, val, 'user');
  else {
    quill.formatText(sel.index, sel.length, kind, val, 'user');
    quill.setSelection(sel.index, sel.length, 'silent');
  }
  palette.value.show = false;
  placeBubble();
}

function bubbleAction(f) {
  if (!quill) return;
  if (f === 'palette') { if (!palette.value.show) openPalette(); else palette.value.show = false; return; }
  const sel = quill.getSelection();
  if (!sel || !sel.length) return;
  if (f === 'clean') quill.removeFormat(sel.index, sel.length, 'user');
  else if (f === 'link') {
    const url = prompt('链接地址', 'https://');
    if (url) quill.formatText(sel.index, sel.length, 'link', url, 'user');
  } else {
    const on = !!quill.getFormat(sel.index, sel.length)[f];
    quill.formatText(sel.index, sel.length, f, !on, 'user');
  }
  placeBubble();
}

function initBubble() {
  /* mousedown 阻止默认：点面板 / 气泡条时别把选区丢掉 */
  bubbleEl.value.addEventListener('mousedown', (e) => e.preventDefault());
  paletteEl.value.addEventListener('mousedown', (e) => e.preventDefault());
}

/* ---------- 大图预览 ---------- */
function initViewer() {
  quill.root.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || t.tagName !== 'IMG') return;
    e.preventDefault();
    e.stopPropagation();
    const list = editorImgs();
    const i = list.indexOf(t);
    viewerNode = t;
    viewer.value = {
      show: true,
      src: t.getAttribute('src') || '',
      label: i < 0 ? '' : '第 ' + (i + 1) + ' / ' + list.length + ' 张'
    };
    document.body.classList.add('no-scroll');
  }, true);
}
function closeViewer() {
  viewer.value = { show: false, src: '', label: '' };
  viewerNode = null;
  document.body.classList.remove('no-scroll');
}
function deleteViewerImg() {
  const node = viewerNode;
  closeViewer();
  if (!node) return;
  const blot = QuillCtor && QuillCtor.find ? QuillCtor.find(node) : null;
  if (!blot) return;
  const idx = quill.getIndex(blot);
  if (idx == null || idx < 0) return;
  quill.deleteText(idx, 1, 'user');
  refreshCards();
  scheduleDraft();
}

/* ---------- 字数 ---------- */
function initWordCount() {
  const upd = () => {
    wc.value = quill.getText().replace(/\s+/g, '').length;
    imgwc.value = imgCountInEditor();
  };
  quill.on('text-change', upd);
  upd();
}

/* ---------- 工具栏吸附避让顶栏 ---------- */
function syncTopbarH() {
  const tb = document.querySelector('.topbar');
  const h = tb ? Math.round(tb.getBoundingClientRect().height) : 0;
  document.documentElement.style.setProperty('--tb-h', h + 'px');
}

/* ---------- 专注模式 / 快捷键面板 ---------- */
function toggleFocus() {
  focusOn.value = !focusOn.value;
  document.body.classList.toggle('focus-mode', focusOn.value);
  if (focusOn.value && quill) quill.focus();
}

function toggleKbd() {
  if (kbd.value.show) { kbd.value.show = false; return; }
  const r = kbdBtnEl.value.getBoundingClientRect();
  const pw = 260, ph = 240;
  let left = Math.max(8, Math.min(window.innerWidth - pw - 8, r.right - pw));
  let top = r.top - ph - 8;
  if (top < 8) top = r.bottom + 8;
  kbd.value = { show: true, left: Math.round(left), top: Math.round(top) };
}

function onDocClick(e) {
  if (!kbd.value.show) return;
  if (kbdBtnEl.value && kbdBtnEl.value.contains(e.target)) return;
  if (kbd.value.show) kbd.value.show = false;
}
function onDocKey(e) {
  if (e.key !== 'Escape') return;
  if (kbd.value.show) kbd.value.show = false;
  if (palette.value.show) palette.value.show = false;
  if (viewer.value.show) closeViewer();
  if (focusOn.value) toggleFocus();
}
function onResize() { closeBubble(); syncTopbarH(); }

/* ---------- 错误提示 ---------- */
function showError(msg) {
  errMsg.value = msg;
  setTimeout(() => { if (errMsg.value === msg) errMsg.value = ''; }, 6000);
}

/* ---------- 内容 / 草稿 ---------- */
function getContent() {
  if (quill) {
    return {
      html: quill.root.innerHTML,
      empty: !quill.getText().trim() && !quill.root.querySelector('img')
    };
  }
  const txt = (fallbackEl.value && fallbackEl.value.value || '').trim();
  const esc = txt.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return { html: esc.split(/\n+/).map((p) => '<p>' + p + '</p>').join(''), empty: !txt };
}

function draftPayload() {
  const c = getContent();
  return {
    title: title.value.trim(),
    tag: tag.value,
    vis: vis.value,
    html: c.html,
    imgs: cardItems.filter((it) => it.on).map((it) => it.src),
    at: Date.now()
  };
}

function saveDraft(silent) {
  try {
    localStorage.setItem('xj-draft', JSON.stringify(draftPayload()));
    if (silent) {
      const d = new Date();
      autosaveTip.value = '草稿已自动保存 ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    }
    return true;
  } catch (e) {
    showError('图片太多，本地存不下草稿 —— 少放几张再试');
    return false;
  }
}

function scheduleDraft() {
  if (editingId.value != null) return;     /* 编辑已有记录时不碰草稿箱 */
  clearTimeout(draftTimer);
  draftTimer = setTimeout(() => {
    const c = getContent();
    if (!c.empty || title.value.trim()) saveDraft(true);
  }, 2000);
}

function onSaveDraft() {
  const ok = saveDraft(false);
  draftBtnText.value = ok ? '草稿已存 ✓' : '保存失败';
  setTimeout(() => { draftBtnText.value = '存草稿'; }, 1400);
}

/* 草稿/编辑回填共用：按 src 计数勾卡片图（同图两份各自还原） */
function applyCardSel(imgs) {
  if (!Array.isArray(imgs)) return;
  const left = {};
  imgs.forEach((s) => { left[s] = (left[s] || 0) + 1; });
  cardItems.forEach((it) => {
    if (left[it.src] > 0) { it.on = true; left[it.src]--; }
    else it.on = false;
  });
  lastSig = '';
  refreshCards();
}

function restoreOrEdit() {
  const q = route.query.edit;
  if (q != null && q !== '') { loadForEdit(q); return; }
  restoreDraft();
}

/* ?edit=<pid>：把已有记录装进编辑器，发布变「保存修改」 */
function loadForEdit(pid) {
  const list = loadPosts();
  const i = list.findIndex((p, k) => feedPidOf(p, k) === String(pid));
  if (i < 0) { showError('没有找到要编辑的记录，已按新发布打开'); return; }
  const p = list[i];
  editingId.value = feedPidOf(p, i);
  title.value = p.title || '';
  if (quill) {
    quill.root.innerHTML = p.html || '';
    lastSig = '';
    refreshCards();
    applyCardSel(p.imgs);
  } else if (fallbackEl.value) {
    fallbackEl.value.value = (p.html || '').replace(/<[^>]+>/g, '');
  }
  if (TAGS.indexOf(p.tag) >= 0) tag.value = p.tag;
  if (VIS.indexOf(p.vis) >= 0) vis.value = p.vis;
  autosaveTip.value = '正在修改已发布的记录 —— 不影响草稿箱';
}

function restoreDraft() {
  try {
    const d = JSON.parse(localStorage.getItem('xj-draft') || 'null');
    if (!d) return;
    title.value = d.title || '';
    if (quill && d.html) {
      quill.root.innerHTML = d.html;
      /* 历史坏图清洗：修压缩管线之前存进草稿的 'data:,'（toDataURL 失败产物）
         等无效 src，恢复出来就是九宫格里的空白格 —— 恢复时一律清掉并提示 */
      const bad = [...quill.root.querySelectorAll('img')].filter((im) => {
        const s = im.getAttribute('src') || '';
        return !(/^data:image\//i.test(s) && s.length > 512);
      });
      bad.forEach((im) => {
        const blot = QuillCtor && QuillCtor.find ? QuillCtor.find(im) : null;
        if (blot) {
          const idx = quill.getIndex(blot);
          if (idx != null && idx >= 0) { quill.deleteText(idx, 1, 'silent'); return; }
        }
        im.remove();
      });
      if (bad.length) showError('恢复了草稿，其中 ' + bad.length + ' 张损坏的图已清除');
    }
    if (!quill && d.html && fallbackEl.value) fallbackEl.value.value = d.html.replace(/<[^>]+>/g, '');
    if (d.tag && TAGS.indexOf(d.tag) >= 0) tag.value = d.tag;
    if (d.vis && VIS.indexOf(d.vis) >= 0) vis.value = d.vis;
    lastSig = '';
    refreshCards();
    /* 草稿里记的勾选状态回填 */
    applyCardSel(d.imgs);
    if (d.at) {
      const dt = new Date(d.at);
      autosaveTip.value = '已恢复 ' + ('0' + (dt.getMonth() + 1)).slice(-2) + '-' + ('0' + dt.getDate()).slice(-2) +
        ' ' + ('0' + dt.getHours()).slice(-2) + ':' + ('0' + dt.getMinutes()).slice(-2) + ' 的草稿';
    }
  } catch (e) { /* 坏草稿直接忽略 */ }
}

function publish() {
  const c = getContent();
  if (c.empty) { showError('写点什么再发布吧 —— 文字或图片都可以'); return; }

  const chosen = cardItems.filter((it) => it.on).map((it) => it.src);
  /* 总量预检：浏览器 localStorage 一般 5MB，正文 html 里也是同一批 base64，
     超了发布必失败 —— 提前拦下来把话说明白 */
  const totalKB = Math.round(chosen.reduce((n, s) => n + (s || '').length, 0) / 1024);
  if (totalKB > 3200) {
    showError('图片整体约 ' + Math.round(totalKB / 1024 * 10) / 10 + ' MB，本地存不下 —— 少选几张再发布');
    return;
  }

  if (editingId.value != null) { updatePost(c, chosen); return; }

  let posts = [];
  try { posts = JSON.parse(localStorage.getItem('xj-feed') || '[]'); } catch (e) {}

  try {
    const s = JSON.parse(localStorage.getItem('xj-session') || 'null') || {};
    posts.unshift({
      id: Date.now(),
      name: s.name || '同学',
      initial: s.initial || '学',
      time: '刚刚',
      tag: tag.value,
      title: title.value.trim(),
      html: c.html,
      imgs: chosen,
      cover: chosen[0] || null,
      noCardImgs: chosen.length === 0,
      vis: vis.value,
      likes: 0,
      cmts: []
    });
    localStorage.setItem('xj-feed', JSON.stringify(posts));
    localStorage.removeItem('xj-draft');
    router.push({ name: 'home' });
  } catch (e) {
    showError(e && (e.name === 'QuotaExceededError' || e.code === 22)
      ? '图片太多，浏览器本地存不下 —— 少放几张或换小图再发布'
      : '发布失败，请重试');
  }
}

/* 编辑模式保存：原位更新，不新增、不动时间与点赞 */
function updatePost(c, chosen) {
  const list = loadPosts();
  const i = list.findIndex((p, k) => feedPidOf(p, k) === String(editingId.value));
  if (i < 0) { showError('原记录已不存在（可能刚被删除）'); return; }
  const p = list[i];
  p.title = title.value.trim();
  p.tag = tag.value;
  p.vis = vis.value;
  p.html = c.html;
  p.imgs = chosen;
  p.cover = chosen[0] || null;
  p.noCardImgs = chosen.length === 0;
  if (!savePosts(list)) { showError('图片太多，本地存不下 —— 少选几张再试'); return; }
  router.push({ name: 'myposts' });
}

/* 降级：Quill 起不来时用纯文本框，卡片图片不可用 */
function fallbackMode() {
  noQuill.value = true;
  if (coverAddEl.value) coverAddEl.value.hidden = true;
}

/* ?demo：塞一条示例内容（排版 / 卡片图预览用） */
function seedDemo() {
  if (!quill || quill.getText().trim()) return;
  function pic(c1, c2, c3) {
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='640' height='480'>" +
      "<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>" +
      "<stop offset='0' stop-color='" + c1 + "'/><stop offset='0.62' stop-color='" + c2 + "'/>" +
      "<stop offset='1' stop-color='" + c3 + "'/></linearGradient></defs>" +
      "<rect width='640' height='480' fill='url(%23g)'/>" +
      "<circle cx='480' cy='120' r='46' fill='rgba(255,250,235,0.92)'/>" +
      "<path d='M0 340 L150 240 L290 330 L430 250 L640 360 L640 480 L0 480 Z' fill='rgba(20,30,58,0.55)'/>" +
      "<path d='M0 400 L180 320 L360 405 L520 330 L640 410 L640 480 L0 480 Z' fill='rgba(12,18,40,0.72)'/></svg>";
    return 'data:image/svg+xml,' + svg.replace(/#/g, '%23');
  }
  title.value = '周六的湖畔自习';
  quill.insertText(0, '下午在湖边写了两张卷子，风一直吹。\n', 'user');
  quill.insertText(quill.getLength() - 1, '顺手把错的题抄进错题本：', 'user');
  ['#FFD9A0|#F0906A|#5A3860', '#9FD8FF|#5C8DE0|#1E2A5E', '#C9F0E8|#5FB8A8|#204A58'].forEach((t) => {
    const c = t.split('|');
    quill.insertEmbed(quill.getLength() - 1, 'image', pic(c[0], c[1], c[2]), 'user');
  });
  refreshCards();
}

onMounted(async () => {
  await nextTick();
  try {
    initQuill();
  } catch (e) {
    fallbackMode();
  }
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onDocKey);
});

onBeforeUnmount(() => {
  clearTimeout(draftTimer);
  clearInterval(autoTimer);
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onDocKey);
  document.removeEventListener('keydown', onKeydownPlain, true);
  document.removeEventListener('keyup', onKeyupPlain, true);
  document.removeEventListener('paste', onPaste, true);
  document.removeEventListener('drop', onDrop, true);
  window.removeEventListener('scroll', closeBubble, true);
  window.removeEventListener('resize', onResize);
  document.body.classList.remove('no-scroll', 'focus-mode');
});
</script>

<template>
  <div class="post-grid">
    <!-- ============ 左：编辑器 ============ -->
    <section class="section reveal" style="margin-top:18px">
      <div class="editor-card">
        <input ref="titleEl" v-model="title" class="editor-title" type="text"
               placeholder="给这条记录起个标题（可不填）" maxlength="60" @input="scheduleDraft">
        <div ref="host" v-show="!noQuill"></div>
        <textarea v-if="noQuill" ref="fallbackEl" class="editor-fallback"
                  placeholder="编辑器组件加载失败（可能离线），先用简单文本框记录……"></textarea>

        <div class="editor-foot">
          <span class="md-tip"># 标题 · - 列表 · &gt; 引用 · ``` 代码 · --- 分割线</span>
          <span class="editor-tools">
            <button ref="kbdBtnEl" class="ef-btn" type="button" title="常用快捷键" @click.stop="toggleKbd">
              <span class="ef-k">⌘</span> 快捷键
            </button>
            <button class="ef-btn" type="button" :class="{ on: focusOn }" title="专注模式（Esc 退出）" @click="toggleFocus">
              {{ focusOn ? '⤢ 退出专注' : '⤢ 专注' }}
            </button>
          </span>
          <span class="editor-wc"><b>{{ wc }}</b> 字 · 图 <b>{{ imgwc }}</b>/9</span>
        </div>
      </div>

      <!-- 快捷键面板 -->
      <div v-show="kbd.show" class="kbd-pop" :style="{ left: kbd.left + 'px', top: kbd.top + 'px' }">
        <p class="kbd-title">编辑快捷键</p>
        <ul class="kbd-list">
          <li><span>加粗 / 斜体 / 下划线</span><em><kbd>Ctrl</kbd>+<kbd>B</kbd> <kbd>I</kbd> <kbd>U</kbd></em></li>
          <li><span>撤销 / 重做</span><em><kbd>Ctrl</kbd>+<kbd>Z</kbd> / <kbd>Ctrl</kbd>+<kbd>Y</kbd></em></li>
          <li><span>行内代码</span><em><kbd>Ctrl</kbd>+<kbd>E</kbd></em></li>
          <li><span>有序 / 无序列表</span><em><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>7</kbd> / <kbd>8</kbd></em></li>
          <li><span>粘贴为纯文本</span><em><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd></em></li>
          <li><span>换行不换段</span><em><kbd>Shift</kbd>+<kbd>Enter</kbd></em></li>
          <li><span>插入图片</span><em>直接粘贴 / 拖入 / 工具栏</em></li>
        </ul>
      </div>

      <!-- 图片大图预览 -->
      <div v-show="viewer.show" class="img-viewer" @click.self="closeViewer">
        <div class="iv-bar">
          <span class="iv-idx">{{ viewer.label }}</span>
          <span class="iv-acts">
            <button id="iv-del" class="iv-btn" type="button" @click="deleteViewerImg">删除这张</button>
            <button class="iv-btn" type="button" @click="closeViewer">关闭</button>
          </span>
        </div>
        <img :src="viewer.src" alt="图片预览">
      </div>

      <!-- 选中文字气泡条 -->
      <div v-show="bubble.show" ref="bubbleEl" class="bubble-bar"
           :style="{ left: bubble.left + 'px', top: bubble.top + 'px' }">
        <button v-for="f in [
                  { k: 'bold', t: 'B', title: '加粗 Ctrl+B', cls: 'b' },
                  { k: 'italic', t: 'I', title: '斜体 Ctrl+I', cls: 'i' },
                  { k: 'underline', t: 'U', title: '下划线 Ctrl+U', cls: 'u' },
                  { k: 'strike', t: 'S', title: '删除线', cls: 's' }
                ]" :key="f.k" type="button" :title="f.title" :class="{ on: bubble[f.k] }"
                @click="bubbleAction(f.k)">
          <b v-if="f.cls === 'b'">B</b><i v-else-if="f.cls === 'i'">I</i><u v-else-if="f.cls === 'u'">U</u><s v-else>S</s>
        </button>
        <span class="bubble-sep"></span>
        <button type="button" title="文字颜色 / 底色高亮" :class="{ on: palette.show }" @click="bubbleAction('palette')">
          <span class="a-mark" :style="{ '--c': bubble.color || 'currentColor' }">A</span>
        </button>
        <button type="button" title="链接" @click="bubbleAction('link')">🔗</button>
        <button type="button" title="清除格式" @click="bubbleAction('clean')">⌫</button>
      </div>

      <!-- 颜色 / 底色面板 -->
      <div v-show="palette.show" ref="paletteEl" class="palette"
           :style="{ left: palette.left + 'px', top: palette.top + 'px' }">
        <p class="pal-label">文字颜色</p>
        <div class="pal-row">
          <button v-for="c in ['#E5484D', '#E8890C', '#0F9D58', '#3E63DD', '#8E4EC6', '#5B6472']"
                  :key="'c' + c" type="button" :data-v="c" :style="{ '--c': c }" @click="applyPalette('color', c)"></button>
          <button type="button" class="pal-clear" data-v="false" title="恢复默认颜色"
                  @click="applyPalette('color', 'false')">✕</button>
        </div>
        <p class="pal-label">底色高亮</p>
        <div class="pal-row">
          <button v-for="c in ['#FFF3B0', '#D8F5E4', '#DCE7FF', '#FFE1EA', '#EDE4FF', '#EEF1F5']"
                  :key="'b' + c" type="button" :data-v="c" :style="{ '--c': c }" @click="applyPalette('background', c)"></button>
          <button type="button" class="pal-clear" data-v="false" title="去掉底色"
                  @click="applyPalette('background', 'false')">✕</button>
        </div>
      </div>
    </section>

    <!-- ============ 右：发布设置 ============ -->
    <aside style="display:flex;flex-direction:column;gap:12px">
      <div class="side-card reveal">
        <p class="side-title">记录类型</p>
        <div class="tag-opts">
          <button v-for="t in TAGS" :key="t" class="tag-opt" :class="{ active: tag === t }"
                  type="button" @click="tag = t">{{ t }}</button>
        </div>
      </div>

      <div class="side-card reveal">
        <p class="side-title">卡片图片 <span class="cover-count">{{ coverCount }}</span></p>
        <p class="row-meta cover-lead">
          {{ noQuill ? '降级文本框模式下暂不支持卡片图片。' : '勾选要放进卡片的图（1–9 张），没勾的只留在正文里。' }}
        </p>
        <div class="cover-grid">
          <button v-for="(c, i) in cards" :key="c.pid" class="cover-opt"
                  :class="c.on ? 'on' : 'off'" type="button"
                  :aria-pressed="c.on ? 'true' : 'false'"
                  :title="c.on ? '点一下：不放进卡片' : '点一下：放进卡片'"
                  @click="toggleCard(i)">
            <img :src="c.src" alt="">
            <span class="ck">{{ c.on ? c.order : '' }}</span>
            <i v-if="c.order === 1">首图</i>
          </button>
        </div>
        <button v-if="!noQuill" ref="coverAddEl" class="cover-add" type="button" @click="pickFiles">＋ 添加图片</button>
        <p v-if="coverNote" class="cover-note">{{ coverNote }}</p>
      </div>

      <div class="side-card reveal">
        <p class="side-title">谁可以看</p>
        <div class="tag-opts">
          <button v-for="v in VIS" :key="v" class="tag-opt" :class="{ active: vis === v }"
                  type="button" @click="vis = v">{{ v }}</button>
        </div>
        <p class="row-meta" style="margin-top:12px">
          默认仅自己可见；改成「家人可见」后，家长端能看到这条记录。
        </p>
      </div>

      <div class="reveal">
        <div v-if="errMsg" class="auth-error" style="margin:0 0 12px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="8.6"/><path d="M12 8v4.4"/><path d="M12 15.8h.01"/>
          </svg>
          <span>{{ errMsg }}</span>
        </div>
        <button class="btn-brand full" type="button" style="width:100%" @click="publish">
          {{ isEdit ? '保存修改' : '发布到首页' }}
        </button>
        <button v-if="!isEdit" class="btn-ghost full" type="button" style="margin-top:10px" @click="onSaveDraft">{{ draftBtnText }}</button>
        <p class="row-meta" style="margin-top:10px;text-align:center">{{ autosaveTip }}</p>
      </div>
    </aside>

    <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onFilePick">
  </div>
</template>
