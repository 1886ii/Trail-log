<script setup>
/* ============================================================
   阅读正文（?ch=n）
   ------------------------------------------------------------
   只管排版与阅读交互：字号、阅读进度条、读完打卡、每篇一问。
   正文原型期是占位段落（版权文本不能内置），正式版由服务端下发。
   ============================================================ */
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { BOOKS, QBANK, RD } from '../lib/books.js';
import { FX } from '../lib/fx.js';

const route = useRoute();
const router = useRouter();

/* ---------- 状态 ---------- */
const S = RD.load();
const bump = ref(0);
const touch = () => { bump.value++; };

const BOOK = computed(() => { bump.value; return BOOKS[S.cur]; });
const BP = computed(() => { bump.value; return S.books[S.cur]; });

const ch = computed(() => {
  const raw = parseInt(route.query.ch, 10);
  const total = BOOK.value.total;
  const n = parseInt(raw, 10);
  if (!n || n < 1 || n > total) return Math.min(BP.value.done + 1, total);
  return n;
});

const unit = computed(() => {
  const B = BOOK.value;
  return B.units[ch.value - 1] || { t: '第 ' + ch.value + ' ' + B.unitName, b: '' };
});

const readAlready = computed(() => BP.value.done >= ch.value);

/* 本书是否给这一篇配了题（书级开关 + 篇级题目）
   读后题引用题库（qid → QBANK），支持三种题型：
   T1 选择（点选项对答案）· T2 填空（输入比对）· T3 简答（采分点关键词判分）；
   旧版手写题（无 qid、带 q/points/ref 的数据）仍按简答方式作答与判分 */
const ask = computed(() => {
  const B = BOOK.value;
  const a = (B.qEnabled && B.asks && B.asks[ch.value]) || null;
  if (!a) return null;
  if (a.qid) {
    const q = QBANK[a.qid];
    if (!q) return null;
    return {
      qid: q.id, kind: q.type, q: q.stem,
      options: q.options, answer: q.answer, blanks: q.blanks || [],
      points: q.points, ref: q.expl
    };
  }
  return { kind: 'T3', q: a.q, points: a.points, ref: a.ref, legacy: true };
});
const KIND_NAME = { T1: '选择', T2: '填空', T3: '简答' };
const LET = ['A', 'B', 'C', 'D', 'E', 'F'];
const kindName = computed(() => KIND_NAME[ask.value && ask.value.kind] || '');
/* T2：题干按 {{n}} 占位切开，占位处内联输入框 */
const askParts = computed(() => ((ask.value && ask.value.q) || '').split(/\{\{\d+\}\}/));

/* ---------- 演示正文 ---------- */
const CN_NUM = '一二三四五六';
const bodyParas = computed(() => {
  const B = BOOK.value, u = unit.value;
  const out = [
    { demo: true, text: '（原型演示文本 · 正式版这里显示由管理端下发的正版章节内容，此页只负责舒适的排版与阅读交互。）' }
  ];
  for (let i = 1; i <= 6; i++) {
    out.push({
      demo: false,
      text: '这里是《' + B.title + '》' + u.t.replace(/ · /g, '，') +
        '的正文第' + CN_NUM.charAt(i - 1) + '段。放上占位文字是为了看真实的阅读版面：' +
        '段首空两格、两倍行距、合适的字号与页宽，读久了眼睛不累。'
    });
    if (i === 3) {
      out.push({ demo: true, text: '（正式版可在此插入插图 / 批注提示 / 生词注释，样式已预留。）' });
    }
  }
  return out;
});

const metaText = computed(() => (
  '《' + BOOK.value.title + '》· ' + BOOK.value.author +
  ' · ' + BOOK.value.unitName + ' ' + ch.value + ' / ' + BOOK.value.total +
  (readAlready.value ? ' · 已读 ✓' : '')
));

/* ---------- 字号（存本机） ---------- */
const FS = ref(17);
try {
  const saved = parseInt(localStorage.getItem('xj-rfs'), 10);
  if (saved) FS.value = Math.min(24, Math.max(14, saved));
} catch (e) { /* 隐私模式下忽略 */ }

function changeFs(d) {
  FS.value = Math.min(24, Math.max(14, FS.value + d));
  try { localStorage.setItem('xj-rfs', String(FS.value)); } catch (e) { /* noop */ }
}

/* ---------- 阅读进度条 ---------- */
const prog = ref(0);
function onScroll() {
  const h = document.documentElement;
  const max = h.scrollHeight - h.clientHeight;
  prog.value = max > 0 ? Math.min(100, Math.round(h.scrollTop / max * 100)) : 0;
}

/* ---------- 轻提示 ---------- */
const toastMsg = ref('');
let toastTimer = 0;
function toast(msg) {
  toastMsg.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 2200);
}

/* ---------- 翻页 ---------- */
function goCh(n) {
  if (n < 1 || n > BOOK.value.total) return;
  router.push({ name: 'read', query: { ch: n } });
}

/* ---------- 每篇一问 ---------- */
const askOpen = ref(false);
const askText = ref('');            /* T3 简答作答 */
const askPick = ref('');            /* T1 已选字母 */
const askBlanks = ref([]);          /* T2 各空输入 */
const askRes = ref(null);           /* { kind, ... , ts } */

const askCount = computed(() => askText.value.replace(/\s/g, '').length);
const allHit = computed(() => !!askRes.value && askRes.value.hits === askRes.value.total);

function normAns(s) { return String(s == null ? '' : s).replace(/\s+/g, '').toLowerCase(); }

function gradeAsk(text) {
  const a = ask.value;
  const hitIdx = [];
  (a.points || []).forEach((p, i) => {
    for (let j = 0; j < p.k.length; j++) {
      if (text.indexOf(p.k[j]) !== -1) { hitIdx.push(i); break; }
    }
  });
  return { kind: 'T3', text, hits: hitIdx.length, total: (a.points || []).length, hitIdx, ts: Date.now() };
}

function openAsk() {
  if (!ask.value) return false;
  const prev = BP.value.answers[ch.value];
  askRes.value = prev || null;
  askText.value = prev && prev.kind === 'T3' ? (prev.text || '') : '';
  askPick.value = prev && prev.kind === 'T1' ? prev.pick : '';
  const nb = (ask.value.blanks || []).length;
  askBlanks.value = prev && prev.kind === 'T2' && Array.isArray(prev.vals)
    ? prev.vals.slice() : Array.from({ length: nb }, () => '');
  askOpen.value = true;
  return true;
}

function hitOf(i) {
  return !!askRes.value && (askRes.value.hitIdx || []).indexOf(i) !== -1;
}

const askBtnEl = ref(null);
function submitAsk() {
  const a = ask.value;
  let r = null;
  if (a.kind === 'T1') {
    if (!askPick.value) { toast('先选一个选项，再交答案'); return; }
    r = { kind: 'T1', pick: askPick.value, right: askPick.value === a.answer, ts: Date.now() };
  } else if (a.kind === 'T2') {
    const vals = askBlanks.value.map((v) => (v || '').trim());
    if (vals.some((v) => !v)) { toast('把空都填上，再交答案'); return; }
    const oks = vals.map((v, i) => normAns(v) === normAns(a.blanks[i] || ''));
    r = { kind: 'T2', vals, oks, right: oks.every(Boolean), ts: Date.now() };
  } else {
    const text = askText.value.trim();
    if (!text) { toast('先写两句你的理解，再交答案'); return; }
    r = gradeAsk(text);
  }
  const b = BP.value;
  b.answers = b.answers || {};
  b.answers[ch.value] = r;
  RD.save(S);
  askRes.value = r;
  touch();
  if (FX && FX.burstFrom && askBtnEl.value) FX.burstFrom(askBtnEl.value, r.right ? 12 : 8);
  if (r.kind === 'T1') toast(r.right ? '答对了！' : '不对哦 —— 正确答案是 ' + a.answer);
  else if (r.kind === 'T2') toast(r.right ? '全对！' : '有空没填对 —— 对照一下正确答案');
  else toast(r.hits === r.total ? '全中！采分点 ' + r.hits + '/' + r.total : '收到 · 命中 ' + r.hits + '/' + r.total + ' 个采分点');
}

function nextChapter() {
  askOpen.value = false;
  if (ch.value < BOOK.value.total) goCh(ch.value + 1);
  else router.push({ name: 'reading' });
}

function skipAsk() {
  askOpen.value = false;
  router.push({ name: 'reading' });
}

/* ---------- 读完打卡：记进度 → 配题弹一问，否则回目录 ---------- */
let backTimer = 0;
const finishBtnEl = ref(null);

function finish() {
  const already = readAlready.value;
  RD.checkin(S, ch.value, 0);
  touch();
  if (FX && FX.burstFrom && finishBtnEl.value) FX.burstFrom(finishBtnEl.value, already ? 8 : 14);
  toast(already ? '打卡已记 · 今天读到' + BOOK.value.unitName + ' ' + ch.value
    : '读完了！' + BOOK.value.unitName + ' ' + ch.value + ' 已打卡');

  if (openAsk()) return;                       /* 有题：弹窗，答完/跳过再回目录 */
  backTimer = setTimeout(() => router.push({ name: 'reading' }), 950);
}

/* ---------- 生命周期 ---------- */
function refreshTitle() {
  document.title = unit.value.t + ' · 阅读 · 学迹';
}

watch(ch, () => {
  askOpen.value = false;
  askText.value = '';
  askPick.value = '';
  askBlanks.value = [];
  askRes.value = null;
  nextTick(refreshTitle);
});

onMounted(() => {
  refreshTitle();
  window.addEventListener('scroll', onScroll, { passive: true });
  nextTick(onScroll);
});
onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
  clearTimeout(toastTimer);
  clearTimeout(backTimer);
});
</script>

<template>
  <div>
    <div class="rdprog" aria-hidden="true"><i :style="{ width: prog + '%' }"></i></div>

    <div class="reader">
      <!-- 顶栏：回目录 · 字号 -->
      <div class="reader-top">
        <RouterLink class="btn-ghost" :to="{ name: 'reading' }">‹ 目录</RouterLink>
        <div class="reader-fs" role="group" aria-label="正文字号">
          <button type="button" aria-label="缩小字号" @click="changeFs(-1)">A−</button>
          <button type="button" aria-label="放大字号" @click="changeFs(1)">A＋</button>
        </div>
      </div>

      <!-- 篇目头 -->
      <h1 class="reader-title">{{ unit.t }}</h1>
      <p class="reader-meta">{{ metaText }}</p>
      <div v-if="unit.b" class="reader-brief">{{ unit.b }}</div>

      <!-- 正文（原型为演示文本） -->
      <article class="reader-body" :style="{ fontSize: FS + 'px' }">
        <p v-for="(p, i) in bodyParas" :key="i" :class="{ demo: p.demo }">{{ p.text }}</p>
      </article>

      <!-- 底部：上一篇 / 读完打卡 / 下一篇 -->
      <div class="reader-foot">
        <button class="btn-ghost" type="button" :disabled="ch <= 1" @click="goCh(ch - 1)">‹ 上一篇</button>
        <button ref="finishBtnEl" class="btn-brand" :class="{ 'btn-ghost': readAlready }" type="button" @click="finish">
          {{ readAlready ? '本篇已读 ✓ · 记一下打卡' : '读完这篇 · 打卡' }}
        </button>
        <button class="btn-ghost" type="button" :disabled="ch >= BOOK.total" @click="goCh(ch + 1)">下一篇 ›</button>
      </div>
    </div>

    <!-- 每篇一问：T1 选择 / T2 填空 / T3 简答（qid 引用题库；旧手写题按简答） -->
    <div v-if="askOpen && ask" class="askmask">
      <div class="askpop" role="dialog" aria-modal="true" aria-labelledby="ap-title">
        <p id="ap-title" class="askpop-t">
          每{{ BOOK.unitName }}一问 · {{ BOOK.unitName }} {{ ch }}
          <span class="chip">{{ kindName }}题</span>
        </p>

        <!-- T1 选择：点选项 → 交答案 -->
        <template v-if="ask.kind === 'T1'">
          <p class="ask-q">{{ ask.q }}</p>
          <div class="ask-opts">
            <button v-for="(o, i) in ask.options" :key="i" type="button" class="ask-opt"
                    :class="{ picked: askPick === LET[i] && !askRes,
                              right: askRes && LET[i] === ask.answer,
                              wrong: askRes && askRes.pick === LET[i] && !askRes.right }"
                    :disabled="!!askRes" @click="askPick = LET[i]">
              <b>{{ LET[i] }}</b><span>{{ o }}</span>
            </button>
          </div>
        </template>

        <!-- T2 填空：占位处内联输入 -->
        <template v-else-if="ask.kind === 'T2'">
          <p class="ask-q ask-q-t2">
            <template v-for="(seg, i) in askParts" :key="i"><span>{{ seg }}</span><input
              v-if="i < ask.blanks.length" v-model="askBlanks[i]" class="ask-blank"
              :disabled="!!askRes"
              :class="{ ok: askRes && askRes.oks[i], bad: askRes && !askRes.oks[i] }"
              autocomplete="off"></template>
          </p>
        </template>

        <!-- T3 简答 -->
        <template v-else>
          <p class="ask-q">{{ ask.q }}</p>
          <textarea class="q-ta" rows="3" v-model="askText" :readonly="!!askRes"
                    placeholder="写两句话，说说你的理解…"></textarea>
        </template>

        <div v-if="!askRes" class="ask-foot">
          <span class="ask-count">{{ ask.kind === 'T3' ? askCount + ' 字' : '' }}</span>
          <button ref="askBtnEl" class="btn-brand" type="button" @click="submitAsk">交答案</button>
        </div>

        <div v-else class="ask-result">
          <template v-if="ask.kind === 'T1'">
            <div class="ask-head">
              <span class="chip" :class="askRes.right ? 'ok' : 'danger'">{{ askRes.right ? '答对了' : '答错了' }}</span>
              <span v-if="askRes.right" style="font-size:12.5px;color:var(--ok);font-weight:500">选得准</span>
              <span v-else style="font-size:12.5px;color:var(--text-3)">正确答案：{{ ask.answer }}</span>
            </div>
          </template>

          <template v-else-if="ask.kind === 'T2'">
            <div class="ask-head">
              <span class="chip" :class="askRes.right ? 'ok' : 'warn'">{{ askRes.right ? '全对' : '有空没填对' }}</span>
            </div>
            <div class="ask-pts">
              <span v-for="(bl, i) in ask.blanks" :key="i" class="chip" :class="askRes.oks[i] ? 'ok' : 'danger'">
                {{ askRes.oks[i] ? '✓ ' : '✗ 正确：' }}{{ bl }}
              </span>
            </div>
          </template>

          <template v-else>
            <div class="ask-head">
              <span class="chip" :class="allHit ? 'ok' : 'warn'">命中采分点 {{ askRes.hits }} / {{ askRes.total }}</span>
              <span v-if="allHit" style="font-size:12.5px;color:var(--ok);font-weight:500">答得挺全</span>
            </div>
            <div class="ask-pts">
              <span v-for="(p, i) in ask.points" :key="i" class="chip" :class="hitOf(i) ? 'ok' : 'danger'">
                {{ hitOf(i) ? '✓ ' : '✗ ' }}{{ p.label }}
              </span>
            </div>
          </template>

          <p class="ask-ref"><b style="font-weight:500">参考答案 / 解析：</b>{{ ask.ref }}</p>
        </div>

        <div class="askpop-foot">
          <button v-if="!askRes" class="btn-ghost" type="button" @click="skipAsk">先不答，回目录</button>
          <button v-else class="btn-brand" type="button" @click="nextChapter">
            {{ ch < BOOK.total ? '下一' + BOOK.unitName + ' ›' : '回目录 · 全书读完' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 轻提示 -->
    <div class="q-toast" :class="{ on: !!toastMsg }" role="status" aria-live="polite">{{ toastMsg }}</div>
  </div>
</template>
