<script setup>
/* ============================================================
   阅读（在读 / 书架 两个视图）
   ------------------------------------------------------------
   纸质书伴读：只管「读了没」—— 打卡推进度，读完一本出现留言墙。
   书目与状态在 lib/books.js（BOOKS / RD，同一份 localStorage）。
   弹幕墙是命令式 DOM 算法，见 lib/danmaku.js。
   ============================================================ */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { BOOKS, RD } from '../lib/books.js';
import { renderWall, appendWall } from '../lib/danmaku.js';
import { FX } from '../lib/fx.js';

const router = useRouter();
const route = useRoute();

/* ---------- 状态 ---------- */
const S = RD.load();
const view = ref('reading');            /* reading | shelf */
const tocPage = ref(1);
const PAGE_SIZE = 20;

/* 让 S 的读写驱动视图：用 bump 计数代替深响应（RD 是纯对象操作） */
const bump = ref(0);
const touch = () => { bump.value++; };

const BOOK = computed(() => { bump.value; return BOOKS[S.cur]; });
const BP = computed(() => { bump.value; return S.books[S.cur]; });
const curCh = computed(() => { bump.value; return RD.curChapter(S); });
const pct = computed(() => Math.round(BP.value.done / BOOK.value.total * 100));
const streak = computed(() => { bump.value; return RD.streak(S.checkins); });
const isToday = computed(() => { bump.value; return !!S.checkins[RD.dstr(new Date())]; });

/* ---------- 轻提示 ---------- */
const toastMsg = ref('');
let toastTimer = 0;
function toast(msg) {
  toastMsg.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 2200);
}

/* ---------- 进度环 ---------- */
const ringEl = ref(null);
function syncRing() {
  if (ringEl.value && FX && FX.ring) FX.ring(ringEl.value, pct.value);
}
watch(pct, () => nextTick(syncRing));

/* ---------- 目录（分页：正式版 = LIMIT/OFFSET，避免长书目一次拉全表） ---------- */
const tocPages = computed(() => Math.ceil(BOOK.value.total / PAGE_SIZE));

const tocRows = computed(() => {
  const B = BOOK.value, bp = BP.value;
  const pages = tocPages.value;
  const page = Math.min(Math.max(1, tocPage.value), pages);
  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(B.total, page * PAGE_SIZE);
  const rows = [];
  for (let n = start; n <= end; n++) {
    const u = B.units[n - 1] || { t: '第 ' + n + ' ' + B.unitName, b: '' };
    const ask = B.qEnabled && B.asks && B.asks[n];
    rows.push({
      n,
      t: u.t,
      b: u.b,
      done: n <= bp.done,
      cur: n === curCh.value && bp.done < B.total,
      dot: ask ? (bp.answers[n] ? 'ok' : 'warn') : ''
    });
  }
  return { rows, start, end, page };
});

const tocSub = computed(() => (
  '· 已读 ' + BP.value.done + ' / ' + BOOK.value.total + ' ' + BOOK.value.unitName + ' · 点篇目进入阅读'
));

/* 最近 7 天小条 + 本月打卡次数 */
const strip7 = computed(() => {
  const out = [];
  const d = new Date();
  d.setDate(d.getDate() - 6);
  for (let i = 0; i < 7; i++) {
    out.push(!!S.checkins[RD.dstr(d)]);
    d.setDate(d.getDate() + 1);
  }
  return out;
});
const stripTxt = computed(() => {
  const now = new Date();
  let mc = 0;
  Object.keys(S.checkins).forEach((k) => {
    const p = k.split('-');
    if (+p[0] === now.getFullYear() && +p[1] === now.getMonth() + 1) mc++;
  });
  return '连续 ' + streak.value + ' 天 · 本月 ' + mc + ' 次打卡';
});

function gotoPage(p) {
  if (p < 1 || p > tocPages.value) return;
  tocPage.value = p;
}
function openUnit(n) {
  router.push({ name: 'read', query: { ch: n } });
}
function scrollToToc() {
  const el = document.getElementById('toc');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- 打卡面板 ---------- */
const panelOpen = ref(false);
const pendingCh = ref(1);
const pendingMin = ref(0);

function openPanel() {
  if (panelOpen.value) { panelOpen.value = false; return; }
  pendingCh.value = curCh.value;
  pendingMin.value = 0;
  panelOpen.value = true;
}
function step(d) {
  pendingCh.value = Math.min(BOOK.value.total, Math.max(curCh.value, pendingCh.value + d));
}
function pickMin(m) {
  pendingMin.value = pendingMin.value === m ? 0 : m;
}
const btnCheckinEl = ref(null);
function saveCheckin() {
  RD.checkin(S, pendingCh.value, pendingMin.value);
  panelOpen.value = false;
  touch();
  if (FX && FX.burstFrom && btnCheckinEl.value) FX.burstFrom(btnCheckinEl.value, 14);
  toast(pendingCh.value >= BOOK.value.total
    ? '打卡成功 · 全书读完了！'
    : '打卡成功 · ' + BOOK.value.unitName + ' ' + pendingCh.value + ' 已读');
}

/* ---------- 书架 ---------- */
const shelf = computed(() => {
  bump.value;
  return Object.keys(BOOKS).map((id) => {
    const B = BOOKS[id], b = S.books[id], cur = id === S.cur;
    const p = Math.round(b.done / B.total * 100);
    return {
      id, cur, pct: p,
      initial: B.title.charAt(0),
      title: B.title,
      meta: B.author + ' · ' + B.total + ' ' + B.unitName,
      state: cur ? ('在读 · ' + p + '%')
        : (p >= 100 ? '已读完 · 点开回看' : (b.done > 0 ? '读到 ' + p + '% · 续读' : '未开始 · 点开开读'))
    };
  });
});

function pickBook(id) {
  if (id === S.cur) { view.value = 'reading'; return; }
  S.cur = id;
  tocPage.value = 1;
  RD.save(S);
  touch();
  view.value = 'reading';
  window.scrollTo(0, 0);
  toast('已切换到《' + BOOKS[id].title + '》');
}

function switchView(v) {
  view.value = v;
  if (v === 'shelf') tocPage.value = 1;
}

/* ---------- 留言墙 ---------- */
const wallEl = ref(null);
const msgIn = ref('');
const finishVisible = computed(() => BP.value.done >= BOOK.value.total);

const wallCards = computed(() => {
  const b = BP.value;
  const cards = (b.msgs || []).slice();
  Object.keys(b.answers || {}).forEach((n) => {
    const a = b.answers[n];
    if (a && a.text) cards.push({ t: a.text, meta: '一问 · ' + BOOK.value.unitName + ' ' + n });
  });
  return cards;
});
const todayStr = () => RD.dstr(new Date());

function paintWall() {
  if (!finishVisible.value || !wallEl.value) return;
  renderWall(wallEl.value, wallCards.value, todayStr());
}

/* 弹幕尺寸依赖视口，窗口变化要重排 */
let rsTimer = 0;
function onResize() {
  clearTimeout(rsTimer);
  rsTimer = setTimeout(paintWall, 300);
}

watch([() => S.cur, () => BP.value.done, () => (BP.value.msgs || []).length, finishVisible], async () => {
  await nextTick();
  paintWall();
});

function addMsg() {
  const v = msgIn.value.trim();
  if (!v) { toast('先写一句话，再贴上去'); msgIn.value = ''; return; }
  const b = BP.value;
  b.msgs = b.msgs || [];
  b.msgs.unshift({ t: v, meta: '留言 · ' + todayStr(), d: Date.now() });
  RD.save(S);
  msgIn.value = '';
  touch();
  nextTick(() => {
    if (wallEl.value) appendWall(wallEl.value, b.msgs[0], 0, todayStr());
  });
  if (FX && FX.burstFrom) FX.burstFrom(document.getElementById('msg-add'), 12);
  toast('已贴上留言墙');
}

/* ---------- 留言表情面板（与首页评论同一套定位） ---------- */
const emojiBtn = ref(null);
const emojiPanel = ref(null);
const emojiOpen = ref(false);
const emojiStyle = ref({});

function placeEmoji() {
  const btn = emojiBtn.value, panel = emojiPanel.value;
  if (!btn || !panel) return;
  const r = btn.getBoundingClientRect();
  const pw = panel.offsetWidth || 258;
  const ph = panel.offsetHeight || 250;
  const left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - pw - 8));
  let top = r.top - ph - 8;
  if (top < 8) top = Math.min(r.bottom + 8, window.innerHeight - ph - 8);
  emojiStyle.value = { left: Math.round(left) + 'px', top: Math.round(Math.max(8, top)) + 'px' };
}

async function toggleEmoji() {
  emojiOpen.value = !emojiOpen.value;
  if (!emojiOpen.value) return;
  await nextTick();
  if (emojiPanel.value && window.EMOJI && !emojiPanel.value.dataset.ready) {
    window.EMOJI.render(emojiPanel.value, { def: '学习' });   /* 阅读场景默认停在「学习」 */
    emojiPanel.value.dataset.ready = '1';
  }
  placeEmoji();
}

function onPanelClick(e) {
  const cell = e.target.closest('.emoji-cell');
  if (!cell) return;
  const em = cell.textContent;
  const inp = document.getElementById('msg-in');
  if (!inp) return;
  if (inp.value.length + em.length > 60) return;              /* 程序赋值绕过 maxlength，自己挡一道 */
  const s = inp.selectionStart == null ? inp.value.length : inp.selectionStart;
  const t = inp.selectionEnd == null ? s : inp.selectionEnd;
  msgIn.value = inp.value.slice(0, s) + em + inp.value.slice(t);
  const pos = s + em.length;
  nextTick(() => {
    inp.focus();
    try { inp.setSelectionRange(pos, pos); } catch (err) { /* noop */ }
  });
}

function onDocClick(e) {
  if (!emojiOpen.value) return;
  if (emojiPanel.value && emojiPanel.value.contains(e.target)) return;
  if (emojiBtn.value && emojiBtn.value.contains(e.target)) return;
  emojiOpen.value = false;
}

/* ---------- 生命周期 ---------- */
onMounted(() => {
  /* ?wall=1：无头验证旁路 —— 切到昆虫记（预置已读完 + 演示留言）看弹幕墙。
     注意 hash 路由下 query 在 # 后面，必须读 route.query 而不是 location.search */
  if (route.query.wall) { S.cur = 'kcj'; touch(); }
  paintWall();
  window.addEventListener('resize', onResize);
  document.addEventListener('click', onDocClick);
  nextTick(syncRing);
});
onBeforeUnmount(() => {
  clearTimeout(rsTimer);
  clearTimeout(toastTimer);
  window.removeEventListener('resize', onResize);
  document.removeEventListener('click', onDocClick);
});
</script>

<template>
  <div>
    <!-- 视图切换：在读 / 书架 -->
    <div class="view-tabs reveal" role="tablist" aria-label="阅读视图切换">
      <button type="button" class="view-tab" :class="{ active: view === 'reading' }"
              role="tab" :aria-selected="view === 'reading' ? 'true' : 'false'"
              aria-controls="view-reading" @click="switchView('reading')">在读</button>
      <button type="button" class="view-tab" :class="{ active: view === 'shelf' }"
              role="tab" :aria-selected="view === 'shelf' ? 'true' : 'false'"
              aria-controls="view-shelf" @click="switchView('shelf')">书架</button>
    </div>

    <!-- ============ 视图一：在读 ============ -->
    <div v-show="view === 'reading'" id="view-reading" role="tabpanel">

      <section class="hero reveal">
        <div class="hero-ring" ref="ringEl" :data-ring="pct" role="img" :aria-label="'本书阅读进度 ' + pct + '%'">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle class="track" cx="60" cy="60" r="50"></circle>
            <circle class="val" cx="60" cy="60" r="50"></circle>
          </svg>
          <div class="hero-ring-txt">
            <b>{{ pct }}</b><span>% 读</span>
          </div>
        </div>

        <div class="hero-body">
          <p class="hero-title">《{{ BOOK.title }}》· {{ BOOK.unitName }} {{ curCh }}</p>
          <p class="hero-meta">已读 {{ BP.done }} / {{ BOOK.total }} {{ BOOK.unitName }} · 连续打卡 {{ streak }} 天</p>
          <div class="chips">
            <span class="chip brand">{{ BOOK.tag || '必读书目' }}</span>
            <span class="chip">{{ BOOK.author }}</span>
            <span class="chip">共 {{ BOOK.total }} {{ BOOK.unitName }}</span>
            <span v-if="BOOK.qEnabled" class="chip">配阅读题</span>
          </div>

          <div style="margin-top:14px; display:flex; gap:10px; flex-wrap:wrap">
            <button ref="btnCheckinEl" class="btn-brand" :class="{ 'btn-ghost': isToday }" type="button"
                    :disabled="isToday" @click="openPanel">
              <template v-if="isToday">今日已打卡 · {{ BOOK.unitName }} {{ curCh }} 已读</template>
              <template v-else>今日打卡 · 读完{{ BOOK.unitName }} {{ curCh }}</template>
            </button>
            <button class="btn-ghost" type="button" @click="scrollToToc">看目录</button>
            <button class="btn-ghost" type="button" @click="switchView('shelf')">换本书</button>
          </div>

          <!-- 打卡面板：读完点一下，记下今天读到第几篇 -->
          <div v-show="panelOpen" class="rd-panel">
            <p class="rd-panel-t">今天读到第几篇？</p>
            <div class="rd-stepper">
              <button type="button" aria-label="减一篇" @click="step(-1)">−</button>
              <b>{{ pendingCh }}</b>
              <button type="button" aria-label="加一篇" @click="step(1)">＋</button>
              <span class="rd-panel-hint">读了多久可选可不选</span>
            </div>
            <div class="rd-mins">
              <button v-for="m in [15, 30, 45, 60]" :key="m" class="rd-min" :class="{ on: pendingMin === m }"
                      type="button" @click="pickMin(m)">{{ m === 60 ? '1 小时' : m + ' 分钟' }}</button>
            </div>
            <button class="btn-brand" type="button" @click="saveCheckin">记下 · 打卡</button>
          </div>
        </div>
      </section>

      <!-- 目录 -->
      <section class="section reveal">
        <h2 class="section-title">目录 <span class="count">{{ tocSub }}</span></h2>
        <div class="panel">
          <div id="toc" class="toc">
            <button v-for="r in tocRows.rows" :key="r.n" type="button" class="toc-row"
                    :class="{ done: r.done, cur: r.cur }" @click="openUnit(r.n)">
              <span class="toc-ck">{{ r.done ? '✓' : r.n }}</span>
              <span class="toc-main">
                <b class="toc-t">{{ r.t }}</b>
                <small class="toc-b">{{ r.b }}</small>
              </span>
              <i v-if="r.dot" class="toc-dot" :class="r.dot" :title="r.dot === 'ok' ? '一问已答' : '一问待答'"></i>
              <span class="toc-go">去阅读 ›</span>
            </button>
          </div>

          <div v-if="tocPages > 1" class="toc-pager">
            <button type="button" class="toc-pg" :disabled="tocRows.page <= 1" @click="gotoPage(tocRows.page - 1)">‹ 上一页</button>
            <span class="toc-pg-n">第 {{ tocRows.page }} / {{ tocPages }} 页 · {{ tocRows.start }}–{{ tocRows.end }} {{ BOOK.unitName }}</span>
            <button type="button" class="toc-pg" :disabled="tocRows.page >= tocPages" @click="gotoPage(tocRows.page + 1)">下一页 ›</button>
          </div>

          <div class="check-strip">
            <span>最近 7 天</span>
            <i aria-hidden="true"><b v-for="(on, i) in strip7" :key="i" :class="{ on }"></b></i>
            <span>{{ stripTxt }}</span>
          </div>
        </div>
      </section>

      <!-- 留言墙：读完整本才出现 -->
      <section v-if="finishVisible" class="section reveal">
        <h2 class="section-title">留言墙
          <span class="count">· 《{{ BOOK.title }}》读完纪念 · 写给这本书的话</span>
        </h2>
        <div class="panel">
          <div class="dm-stage" ref="wallEl"></div>
          <p class="dm-hint">留言像弹幕一样慢慢漂过 · 鼠标放上去会停下来</p>
          <div class="msg-compose">
            <div class="emoji-wrap">
              <button ref="emojiBtn" class="emoji-btn" type="button" title="表情" aria-label="插入表情"
                      @click.stop="toggleEmoji">😊</button>
              <div ref="emojiPanel" v-show="emojiOpen" class="emoji-panel cmt-emoji-pop"
                   :style="emojiStyle" @click="onPanelClick"></div>
            </div>
            <input id="msg-in" v-model="msgIn" maxlength="60" placeholder="写一句话，留给这本书…"
                   @keydown.enter.prevent="addMsg">
            <button id="msg-add" class="btn-brand" type="button" @click="addMsg">贴上去</button>
          </div>
        </div>
      </section>
    </div>

    <!-- ============ 视图二：书架 ============ -->
    <div v-show="view === 'shelf'" id="view-shelf" role="tabpanel">
      <section class="section reveal" style="margin-top:18px">
        <h2 class="section-title">书架 <span class="count">· 书单由管理端设置，点书即可切换在读</span></h2>
        <div class="shelf-grid">
          <button v-for="b in shelf" :key="b.id" class="shelf-book" :class="{ current: b.cur }"
                  type="button" @click="pickBook(b.id)">
            <span class="book-spine">{{ b.initial }}</span>
            <span class="shelf-main">
              <span class="shelf-title">{{ b.title }}</span>
              <span class="shelf-meta">{{ b.meta }}</span>
              <span class="book-prog"><i :style="{ width: b.pct + '%' }"></i></span>
              <span class="shelf-state">{{ b.state }}</span>
            </span>
          </button>
        </div>
      </section>
    </div>

    <!-- 轻提示 -->
    <div class="q-toast" :class="{ on: !!toastMsg }" role="status" aria-live="polite">{{ toastMsg }}</div>
  </div>
</template>
