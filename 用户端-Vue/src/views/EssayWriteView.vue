<script setup>
/* ============================================================
   写作文
   ------------------------------------------------------------
   三态：写作（在线写 / 拍手写稿）→ AI 评阅进度 → 评阅结果
   正式版：POST /api/essays → 后端调模型评分 → 进人工审核队列
   原型期：草稿存本机 xj-essay-draft-<taskId>，评阅结果用演示数据
   ============================================================ */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { ESSAY_DETAIL, ESSAY_RESULT, STEP_NAMES } from '../lib/essays.js';

const route = useRoute();
const taskId = computed(() => String(route.query.id || 't1'));
const T = computed(() => ESSAY_DETAIL[taskId.value] || ESSAY_DETAIL.t1);

/* ---------- 视图 ---------- */
const view = ref('write');
const mode = ref('online');
const audit = ref('wait');

const step = computed(() => {
  if (view.value === 'write') return 1;
  if (view.value === 'grading') return 2;
  return audit.value === 'ok' ? 4 : 3;
});

/* ---------- 写作正文 ---------- */
const text = ref('');
const draftHint = ref('草稿会自动保存在本机');
const writeErr = ref('');
const DRAFT_KEY = computed(() => 'xj-essay-draft-' + taskId.value);

function countText(t) {
  const cn = (t.match(/[\u4e00-\u9fa5]/g) || []).length;
  const en = (t.replace(/[\u4e00-\u9fa5]/g, ' ').match(/[A-Za-z][A-Za-z'-]*/g) || []).length;
  return cn + en;
}
const words = computed(() => countText(text.value));
const pctOfNeed = computed(() => Math.min(100, Math.round((words.value / T.value.need) * 100)));
const countLabel = computed(() => (
  '已写 ' + words.value + ' ' + T.value.unit + ' · 要求 ' + T.value.need + ' ' + T.value.unit + '（' + pctOfNeed.value + '%）'
));

function loadDraft() {
  text.value = '';
  draftHint.value = '草稿会自动保存在本机';
  try {
    const d = localStorage.getItem(DRAFT_KEY.value);
    if (d) { text.value = d; draftHint.value = '已恢复上次的草稿'; }
  } catch (e) { /* 隐私模式忽略 */ }
}
function onInput() {
  try { localStorage.setItem(DRAFT_KEY.value, text.value); } catch (e) { /* 配额满 */ }
}
function clearAll() {
  if (!confirm('清空正文？草稿也会一起删掉。')) return;
  text.value = '';
  try { localStorage.removeItem(DRAFT_KEY.value); } catch (e) {}
  draftHint.value = '草稿会自动保存在本机';
}

/* ---------- 手写稿上传（最多 4 张） ---------- */
const HW_MAX = 4;
const photos = ref([]);
const photoErr = ref(false);
const dragging = ref(false);
const hwInput = ref(null);
const camInput = ref(null);

function readFiles(files) {
  photoErr.value = false;
  Array.from(files || []).forEach((f) => {
    if (!/^image\//.test(f.type)) return;
    if (photos.value.length >= HW_MAX) return;
    const r = new FileReader();
    r.onload = () => {
      photos.value.push({ id: 'h' + Date.now() + Math.random(), src: r.result });
    };
    r.readAsDataURL(f);
  });
}
function onPick(e) { readFiles(e.target.files); e.target.value = ''; }
function onDrop(e) {
  dragging.value = false;
  readFiles(e.dataTransfer && e.dataTransfer.files);
}
function pickAlbum() { if (hwInput.value) hwInput.value.click(); }
function pickCamera() { if (camInput.value) camInput.value.click(); }
function removePhoto(id) { photos.value = photos.value.filter((p) => p.id !== id); }
const photoFull = computed(() => photos.value.length >= HW_MAX);

/* ---------- 评阅进度 ---------- */
const gStep = ref(0);
let timers = [];
function clearTimers() { timers.forEach(clearTimeout); timers = []; }

function submit() {
  view.value = 'grading';
  gStep.value = 0;
  clearTimers();
  let i = 0;
  (function next() {
    if (i >= 4) {
      timers.push(setTimeout(showResult, 420));
      return;
    }
    gStep.value = i + 1;
    i++;
    timers.push(setTimeout(next, 620));
  })();
}

function onSubmitText() {
  const n = words.value;
  if (n < Math.min(30, T.value.need * 0.5)) {
    writeErr.value = '正文才 ' + n + ' ' + T.value.unit + '，太短了（要求 ' + T.value.need + ' ' + T.value.unit + '），再多写一点再提交';
    return;
  }
  writeErr.value = '';
  submit();
}
function onSubmitPhoto() {
  if (!photos.value.length) { photoErr.value = true; return; }
  photoErr.value = false;
  submit();
}

/* ---------- 结果 ---------- */
const res = ref(null);
const ringEl = ref(null);

function showResult() {
  const isFinal = audit.value === 'ok';
  const data = isFinal ? ESSAY_RESULT.final : ESSAY_RESULT.ai;
  res.value = {
    isFinal, data,
    textHTML: ESSAY_RESULT.text.map((p, pi) => {
      let html = p;
      ESSAY_RESULT.marks.filter((m) => m.p === pi).forEach((m) => {
        html = html.replace(m.q, '<mark>' + m.q + '</mark>');
      });
      return html;
    })
  };
  view.value = 'result';
  nextTick(() => {
    const el = ringEl.value;
    if (el && window.FX && window.FX.ring) window.FX.ring(el);
  });
}

function rewrite() {
  audit.value = 'wait';
  view.value = 'write';
}
function passAudit() { audit.value = 'ok'; showResult(); }

/* ---------- 初始化 / 任务切换 ---------- */
function boot() {
  clearTimers();
  const t = T.value;
  audit.value = t.audit || 'wait';
  view.value = 'write';
  mode.value = 'online';
  photos.value = [];
  writeErr.value = '';
  photoErr.value = false;
  res.value = null;
  loadDraft();
  if (t.start === 'result') timers.push(setTimeout(showResult, 260));
  else view.value = 'write';
}

watch(taskId, boot);
onMounted(boot);
onBeforeUnmount(() => {
  clearTimers();
  document.body.classList.remove('no-scroll');
});

/* 截止时间的三种图标 */
const DUE_ICO = {
  open: '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3.1 1.9"/>',
  submitted: '<path d="M7.6 16.8h7.9a3.6 3.6 0 0 0 .3-7.2 4.9 4.9 0 0 0-9.3 1.1 3.1 3.1 0 0 0 1.1 6.1z"/><path d="M12 15.4v-5"/><path d="m9.9 12.4 2.1-2.1 2.1 2.1"/>',
  done: '<circle cx="12" cy="12" r="8.4"/><path d="M8.3 12.3 11 15 15.8 9.8"/>'
};
const dueIco = computed(() => DUE_ICO[T.value.due.state] || DUE_ICO.open);
const REQ_FIELDS = [['words', '字数'], ['minutes', '建议用时'], ['focus', '写作要求']];

const AI_STEPS = [
  '读取正文，纠正错别字与标点',
  '分析内容立意与结构层次',
  '检查语言表达，逐句标出可改进处',
  '生成评阅报告，提交人工审核'
];
</script>

<template>
  <div>
    <!-- 返回 -->
    <section class="section reveal" style="margin-top:16px">
      <RouterLink class="btn-ghost" :to="{ name: 'essay' }" style="display:inline-flex;align-items:center;gap:6px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14.5 5.5 8 12l6.5 6.5"/>
        </svg>
        返回作文列表
      </RouterLink>
    </section>

    <!-- 任务信息 -->
    <section class="section reveal">
      <div class="side-card" style="padding:18px 20px">
        <div class="task-top">
          <h2 style="font-size:18px;font-weight:500;margin:0">{{ T.title }}</h2>
          <span class="chip brand">管理端发布</span>
          <span class="chip">{{ T.subject }}</span>
          <span class="chip">{{ T.genre }}</span>
        </div>

        <div class="task-prompt">
          <p class="tp-head">题目</p>
          <p v-if="T.prompt.lead" class="tp-lead">{{ T.prompt.lead }}</p>
          <template v-if="T.prompt.points && T.prompt.points.length">
            <p class="tp-sub">{{ T.prompt.pointsTitle || '内容包括：' }}</p>
            <ol class="tp-points">
              <li v-for="(p, i) in T.prompt.points" :key="i">{{ p }}</li>
            </ol>
          </template>
          <p v-if="T.prompt.notes" class="tp-note"><b>注意：</b>{{ T.prompt.notes }}</p>
        </div>

        <div class="task-req">
          <p class="req-head">题目要求</p>
          <div class="req-grid">
            <div v-for="f in REQ_FIELDS" :key="f[0]" class="req-item">
              <span class="req-k">{{ f[1] }}</span>
              <span class="req-v">{{ T.req[f[0]] || '—' }}</span>
            </div>
          </div>
        </div>

        <div class="due-bar" :data-state="T.due.state">
          <span class="due-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
                 stroke-linecap="round" stroke-linejoin="round" v-html="dueIco"></svg>
          </span>
          <span class="due-main">{{ T.due.label }}</span>
          <span v-if="T.due.note" class="due-note">{{ T.due.note }}</span>
        </div>

        <div class="steps-mini">
          <template v-for="(n, i) in STEP_NAMES" :key="n">
            <span class="st" :class="i + 1 < step ? 'done' : (i + 1 === step ? 'cur' : '')">{{ i + 1 < step ? '✓ ' : '' }}{{ n }}</span>
            <span v-if="i < STEP_NAMES.length - 1" class="sep">›</span>
          </template>
        </div>
      </div>
    </section>

    <!-- ============ 写作 ============ -->
    <section v-if="view === 'write'" class="section reveal">
      <h2 class="section-title">开始写作 <span class="count">· 可以在线写，也可以写完拍照上传</span></h2>

      <div class="flt-row">
        <button class="flt" :class="{ on: mode === 'online' }" type="button" @click="mode = 'online'">在线写作</button>
        <button class="flt" :class="{ on: mode === 'photo' }" type="button" @click="mode = 'photo'">上传手写稿</button>
      </div>

      <!-- 写作引导 -->
      <div v-if="mode === 'online'" class="panel" style="margin-bottom:14px">
        <p class="row-title" style="margin-bottom:12px">写作引导 · 想清楚再动笔</p>
        <ul class="guide-list">
          <li v-for="(g, i) in T.guide" :key="i" class="guide-item">
            <span class="guide-num">{{ i + 1 }}</span>
            <div><p class="guide-q">{{ g[0] }}</p><p class="guide-a">{{ g[1] }}</p></div>
          </li>
        </ul>
      </div>

      <!-- 在线写作 -->
      <div v-show="mode === 'online'">
        <div class="write-box">
          <div class="write-head">
            <span>正文</span>
            <span style="color:var(--text-3)">·</span>
            <span>{{ draftHint }}</span>
          </div>
          <textarea class="write-body" spellcheck="false" v-model="text" @input="onInput"
            placeholder="从最容易写的那一段开始…&#10;&#10;写不下去的时候，先停 1 分钟，回忆一个具体的画面：当时的天色、声音、你说过的一句话。"></textarea>
          <div class="write-foot">
            <span class="write-count" :class="{ over: words >= T.need }">{{ countLabel }}</span>
            <span class="spacer"></span>
            <button class="btn-ghost" type="button" @click="clearAll">清空</button>
            <button class="btn-brand" type="button" @click="onSubmitText">提交批改</button>
          </div>
        </div>
        <div v-if="writeErr" class="auth-error" style="margin-top:10px">
          <span>{{ writeErr }}</span>
        </div>
      </div>

      <!-- 上传手写稿 -->
      <div v-show="mode === 'photo'">
        <div v-if="!photoFull" class="hw-drop" :class="{ dragover: dragging }" role="button" tabindex="0"
             aria-label="上传手写稿照片"
             @click="pickAlbum" @keydown.enter.prevent="pickAlbum" @keydown.space.prevent="pickAlbum"
             @dragover.prevent="dragging = true" @dragenter.prevent="dragging = true"
             @dragleave.prevent="dragging = false" @drop.prevent="onDrop">
          <span class="hw-ico" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                 stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 8.2c0-1 .8-1.9 1.9-1.9h1.7l1.2-1.8h6.4l1.2 1.8h1.7c1 0 1.9.8 1.9 1.9v8.6c0 1-.8 1.9-1.9 1.9H5.9c-1 0-1.9-.8-1.9-1.9z"/>
              <circle cx="12" cy="12.3" r="3.4"/>
            </svg>
          </span>
          <b>拍下你的手写稿</b>
          <span>纸上写完后，逐页拍照上传 · 最多 4 张</span>
          <div class="hw-actions">
            <button class="btn-brand" type="button" @click.stop="pickCamera">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4 8.2c0-1 .8-1.9 1.9-1.9h1.7l1.2-1.8h6.4l1.2 1.8h1.7c1 0 1.9.8 1.9 1.9v8.6c0 1-.8 1.9-1.9 1.9H5.9c-1 0-1.9-.8-1.9-1.9z"/>
                <circle cx="12" cy="12.3" r="3.4"/>
              </svg>
              打开相机拍照
            </button>
            <button class="btn-ghost" type="button" @click.stop="pickAlbum">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="4" y="4.5" width="16" height="15" rx="2"/>
                <circle cx="9.2" cy="9.6" r="1.6"/>
                <path d="m4.5 17 4.7-4.6 3.4 3.3 2.8-2.7 4.1 4"/>
              </svg>
              从相册选择
            </button>
          </div>
        </div>

        <p class="hw-tips" aria-label="拍摄小贴士">
          <span><i>✓</i>光线均匀不反光</span>
          <span><i>✓</i>文字方向摆正</span>
          <span><i>✓</i>一页拍一张、拍完整</span>
        </p>

        <input ref="hwInput" type="file" accept="image/*" multiple hidden @change="onPick">
        <input ref="camInput" type="file" accept="image/*" capture="environment" multiple hidden @change="onPick">

        <span v-if="photos.length" class="hw-count" :class="{ full: photoFull }">
          {{ photoFull ? '已传满 ' + photos.length + '/' + HW_MAX + ' 张，如需重拍请先删除'
                       : '已上传 ' + photos.length + '/' + HW_MAX + ' 张' }}
        </span>

        <div class="up-grid">
          <div v-for="(p, i) in photos" :key="p.id" class="up-thumb">
            <img :src="p.src" :alt="'手写稿第 ' + (i + 1) + ' 页'">
            <span class="up-no">第 {{ i + 1 }} 页</span>
            <button class="up-x" type="button" aria-label="删除这张" @click="removePhoto(p.id)">×</button>
          </div>
        </div>

        <div v-if="photoErr" class="auth-error" style="margin-top:10px">
          <span>请先上传至少一张手写稿照片</span>
        </div>

        <div class="write-foot hw-foot">
          <span class="write-count">提交后同样走「AI 评阅 → 人工审核」</span>
          <span class="spacer"></span>
          <button class="btn-brand" type="button" @click="onSubmitPhoto">提交批改</button>
        </div>
      </div>
    </section>

    <!-- ============ AI 评阅中 ============ -->
    <section v-else-if="view === 'grading'" class="section reveal">
      <h2 class="section-title">AI 评阅中</h2>
      <div class="side-card">
        <div class="ai-steps">
          <div v-for="(s, i) in AI_STEPS" :key="i" class="ai-step"
               :class="i + 1 < gStep ? 'done' : (i + 1 === gStep ? 'on' : '')">
            <span class="dot"></span>{{ s }}
          </div>
        </div>
      </div>
    </section>

    <!-- ============ 评阅结果 ============ -->
    <section v-else-if="view === 'result' && res" class="section reveal">
      <h2 class="section-title">评阅结果</h2>

      <div class="audit-bar" :class="res.isFinal ? 'ok' : 'wait'">
        <div v-if="res.isFinal" class="ab-main">
          <b>已通过人工审核</b> · {{ res.data.reviewer }} · {{ res.data.reviewAt }}<br>{{ res.data.comment }}
        </div>
        <div v-else class="ab-main">
          <b>AI 已评分，等待老师人工审核</b><br>审核通过后才会展示最终结果 —— 老师可以确认或调整 AI 的分数、补充评语。
        </div>
      </div>

      <div class="side-card">
        <!-- 分数头 -->
        <div class="essay-score-head">
          <div class="hero-ring" ref="ringEl" :data-ring="res.data.score" role="img"
               :aria-label="'作文得分 ' + res.data.score + ' 分'">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle class="track" cx="60" cy="60" r="50"></circle>
              <circle class="val" cx="60" cy="60" r="50"></circle>
            </svg>
            <div class="hero-ring-txt"><b>{{ res.data.score }}</b><span>分</span></div>
          </div>
          <div class="sh-main">
            <p style="font-size:14.5px">{{ res.data.line }}</p>
            <p class="row-meta">{{ res.data.sub }}</p>
            <div class="chips">
              <span v-for="c in res.data.chips" :key="c" class="chip" :class="{ ok: res.isFinal }">{{ c }}</span>
            </div>
          </div>
        </div>

        <!-- 分项得分 -->
        <p class="row-title" style="margin-bottom:12px">分项得分</p>
        <ul class="bars">
          <li v-for="it in res.data.items" :key="it.name" class="bar-row">
            <span class="bar-name">{{ it.name }}</span>
            <span class="bar-track">
              <i :class="it.pct >= 85 ? 'lv-3' : (it.pct >= 70 ? 'lv-2' : 'lv-1')" :style="{ '--w': it.pct + '%' }"></i>
            </span>
            <span class="bar-val">{{ it.val }}</span>
          </li>
        </ul>

        <!-- 逐句批注 -->
        <p class="row-title" style="margin:20px 0 10px">逐句批注</p>
        <div class="essay-text">
          <p v-for="(p, i) in res.textHTML" :key="i" style="margin:0 0 12px" v-html="p"></p>
        </div>
        <ul class="annots">
          <li v-for="(a, i) in ESSAY_RESULT.annots" :key="i" class="annot">
            <span class="no">{{ i + 1 }}</span>
            <div class="an-main">
              <p style="margin:0"><span class="an-wrong">{{ a.orig }}</span> —— {{ a.why }}</p>
              <p style="margin:2px 0 0;color:var(--text-2)">建议改成：<span class="an-right">{{ a.fix }}</span></p>
            </div>
          </li>
        </ul>

        <!-- 总评 -->
        <div style="margin-top:22px">
          <div class="row">
            <div class="row-ico ok">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="8.6"/><path d="M8.4 12.3 11 14.9 15.7 9.7"/>
              </svg>
            </div>
            <div class="row-main">
              <p class="row-title">写得好的地方</p>
              <p class="row-meta">{{ ESSAY_RESULT.ai.good }}</p>
            </div>
          </div>
          <div class="row">
            <div class="row-ico warn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 4.6 20 19H4z"/><path d="M12 10v4"/><path d="M12 16.4h.01"/>
              </svg>
            </div>
            <div class="row-main">
              <p class="row-title">下一步改什么</p>
              <p class="row-meta">{{ ESSAY_RESULT.ai.improve }}</p>
            </div>
          </div>
        </div>

        <!-- 底部动作 -->
        <div class="write-foot" style="border:none;border-top:1px solid var(--border);margin-top:18px;border-radius:0">
          <RouterLink class="btn-ghost" :to="{ name: 'essay' }">返回列表</RouterLink>
          <span class="spacer"></span>
          <button class="btn-ghost" type="button" @click="rewrite">再写一稿</button>
          <button v-if="!res.isFinal" class="btn-brand" type="button" @click="passAudit">模拟老师审核通过</button>
        </div>
        <p v-if="!res.isFinal" class="row-meta" style="margin-top:10px">
          演示按钮：正式版这一步由管理端完成 —— 老师在后台看到 AI 初评，确认或调整分数、补充评语，
          审核通过后学生端才会展示最终结果。
        </p>
      </div>
    </section>
  </div>
</template>
