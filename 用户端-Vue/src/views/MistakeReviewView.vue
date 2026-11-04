<script setup>
/* ============================================================
   错题复习（独立会话页，不复用每日题目）
   ------------------------------------------------------------
   题源只有错题本：一道一题，做完立刻判，判完立刻排下一次。
   答对 = 订正（间隔按 1/2/4/7/15/30 往后推）；
   答错 = 次数 +1、退回最短档。排程算法在 qbank.js（QB.mistake*）。
   ============================================================ */
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { QB } from '../lib/qbank.js';
import { SUBJ_C, LETTER, plain, cut, ago, fmtDate } from '../lib/fmt.js';
import { FX } from '../lib/fx.js';

const route = useRoute();

const queue = ref(null);
const idx = ref(0);
const graded = ref(false);
const res = ref(null);
const finished = ref(false);
const empty = ref(false);
const mark = reactive({});
const ansChoice = ref([]);
const ansFill = reactive({});
const ansShort = ref('');
const shaking = ref(false);
const toastMsg = ref('');
const ringEl = ref(null);
const resEl = ref(null);
const submittedAns = ref(null);
const bump = ref(0);
let toastTimer = null;

const cur = computed(() => (queue.value ? queue.value.list[idx.value] : null));

function qsStr(v) { return Array.isArray(v) ? (v[0] || '') : String(v == null ? '' : v); }
function has(flag) { return flag in route.query; }

/* ---------- 小工具 ---------- */
function subjColor(name) { return SUBJ_C[name] || 'var(--brand)'; }
function typeCls(t) { return t === 'fill_blank' ? 'fill' : (t === 'short_answer' ? 'short' : t); }
function typeLabel(t) { return (QB.typeInfo[t] || {}).label || ''; }

function toast(msg) {
  toastMsg.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 1800);
}

function ansText(item, a) {
  if (a == null) return '';
  if (item.type === 'choice') {
    const arr = [].concat(a);
    return arr.map((id) => {
      const i = (item.options || []).findIndex((o) => o.id === id);
      return i >= 0 ? LETTER[i] : '?';
    }).join('、');
  }
  if (item.type === 'fill_blank') {
    return (item.blanks || []).map((b) => {
      const v = a[b.n];
      return b.label + ' ' + (v == null || v === '' ? '（空）' : v);
    }).join('　');
  }
  return String(a).trim();
}

function rightHTML(item) {
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (item.type === 'choice') {
    return (item.answer || []).map((id) => {
      const i = (item.options || []).findIndex((o) => o.id === id);
      if (i < 0) return '';
      return '<b>' + LETTER[i] + '</b> ' + esc(item.options[i].text);
    }).join('　');
  }
  if (item.type === 'fill_blank') {
    return (item.blanks || []).map((b) => b.label + ' <b>' + esc((b.accept && b.accept[0]) || '—') + '</b>').join('　');
  }
  if (item.answer_text) return item.answer_text;
  return (item.rubric || []).map((r) => esc(r.point)).join('；') || '按采分点判分';
}

/* ---------- 题干 / 材料 ---------- */
function stemParts(item) {
  const blanks = item.blanks || [];
  const parts = [];
  const s = String(item.stem || '');
  const re = /\{\{(\d+)\}\}/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push({ t: 'html', v: s.slice(last, m.index) });
    const n = +m[1];
    const b = blanks.find((x) => x.n === n);
    const w = Math.max(4, Math.min(14, (((b && b.accept && b.accept[0]) || '').length) + 2));
    parts.push({ t: 'blank', n, w });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ t: 'html', v: s.slice(last) });
  return parts;
}

function matParas(b, targetBlank) {
  const inline = QB.isInline(b);
  return (b.material.paragraphs || []).map((p) => {
    const s = String(p);
    if (!inline) return [{ t: 'html', v: s }];
    const parts = [];
    const re = /\{\{(\d+)\}\}/g;
    let last = 0, m;
    while ((m = re.exec(s))) {
      if (m.index > last) parts.push({ t: 'html', v: s.slice(last, m.index) });
      parts.push({ t: 'mark', n: +m[1], on: +m[1] === targetBlank });
      last = m.index + m[0].length;
    }
    if (last < s.length) parts.push({ t: 'html', v: s.slice(last) });
    return parts;
  });
}

/* ---------- 进度点 ---------- */
const dots = computed(() => {
  if (!queue.value) return [];
  return queue.value.list.map((r, i) => {
    const st = mark[r.item.id] || '';
    return {
      cls: 'rv-dot' + (i === idx.value ? ' cur' : '') + (st ? ' ' + st : ''),
      txt: st === 'ok' ? '✓' : (st === 'bad' ? '✕' : String(i + 1)),
      title: '第 ' + (i + 1) + ' 道'
    };
  });
});

const isClosed = computed(() => !!cur.value && (cur.value.e.wrong || 0) >= 3);
const dueInfo = computed(() => (cur.value ? (cur.value.due || QB.mistakeDue(cur.value.e)) : null));

/* 判完之后排程会变，用 bump 触发重算（QB 的存储不是响应式的） */
const sched = computed(() => {
  bump.value;
  if (!cur.value) return null;
  const e = QB.mistakeOf(cur.value.item.id) || cur.value.e;
  const d = QB.mistakeDue(e);
  return { gap: d.gap, at: d.at, fixed: !!e.fixed };
});

/* ---------- 上次作答 ---------- */
const lastStrip = computed(() => {
  if (!cur.value || graded.value) return null;
  const a = QB.attemptOf(cur.value.item.id);
  if (!a) return { first: true, text: '当时是答错进来的，这次把它做对就算订正。' };
  const t = ansText(cur.value.item, a.ans);
  if (!t) return null;
  return { first: false, ok: !!a.ok, text: cut(t, 60), at: ago(a.at) };
});

/* ---------- 会话 ---------- */
function boot() {
  if (has('demo')) QB.mistakeSeedDemo();

  const ids = String(qsStr(route.query.ids) || '').split(',').map((s) => s.trim()).filter(Boolean);
  const scope = qsStr(route.query.scope) || 'today';
  const limit = Math.max(1, Math.min(12, parseInt(qsStr(route.query.limit), 10) || 6));

  queue.value = QB.mistakeQueue({ ids, scope, limit: ids.length || limit });
  idx.value = 0;
  finished.value = false;
  empty.value = !queue.value.list.length;
  if (empty.value) return;
  renderCard();
}

function renderCard() {
  graded.value = false;
  res.value = null;
  ansChoice.value = [];
  Object.keys(ansFill).forEach((k) => { delete ansFill[k]; });
  ansShort.value = '';
  shaking.value = false;
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function pick(o) {
  if (graded.value) return;
  const id = o.id;
  const at = ansChoice.value.indexOf(id);
  if (at >= 0) ansChoice.value.splice(at, 1);
  else if (cur.value.item.multi) ansChoice.value.push(id);
  else ansChoice.value = [id];
}

function optionCls(o) {
  const it = cur.value.item;
  const on = ansChoice.value.indexOf(o.id) >= 0;
  const isR = (it.answer || []).indexOf(o.id) >= 0;
  let cls = 'q-opt';
  if (on) cls += ' on';
  if (graded.value) {
    if (isR) cls += ' right';
    else if (on) cls += ' pick-wrong';
  }
  return cls;
}

const answered = computed(() => {
  const it = cur.value && cur.value.item;
  if (!it) return false;
  if (it.type === 'choice') return ansChoice.value.length > 0;
  if (it.type === 'fill_blank') return Object.keys(ansFill).some((k) => String(ansFill[k] || '').trim());
  return !!String(ansShort.value || '').trim();
});

function currentAns() {
  const it = cur.value.item;
  if (it.type === 'choice') return ansChoice.value.slice();
  if (it.type === 'fill_blank') return { ...ansFill };
  return ansShort.value;
}

function doSubmit() {
  if (!answered.value) {
    shaking.value = false;
    void document.body.offsetWidth;
    shaking.value = true;
    toast('先作答再提交');
    return;
  }

  const it = cur.value.item;
  const a = currentAns();
  const g = QB.grade(it, a);
  g.unanswered = false;
  submittedAns.value = a;
  graded.value = true;
  res.value = g;

  QB.save(it.id, {
    ans: a, ok: g.ok, score: g.score, max: g.max,
    hits: (g.hits || []).map((h) => h.point),
    at: Date.now(), from: 'review'
  });

  if (g.ok) QB.mistakeRight(it.id, true);
  else QB.mistakeWrong(it.id);

  mark[it.id] = g.ok ? 'ok' : 'bad';
  bump.value++;

  nextTick(() => {
    if (resEl.value && resEl.value.scrollIntoView) {
      resEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (g.ok && FX && FX.burstFrom) {
      const v = resEl.value && resEl.value.querySelector('.rv-verdict');
      if (v) FX.burstFrom(v, 14);
    }
  });
}

function advance() {
  if (idx.value >= queue.value.list.length - 1) { showDone(); return; }
  idx.value++;
  renderCard();
}

function doSkip() {
  mark[cur.value.item.id] = 'skip';
  advance();
}

/* ---------- 小结 ---------- */
const summary = ref(null);

function showDone() {
  const list = queue.value.list;
  let okN = 0, badN = 0, skipN = 0;
  list.forEach((r) => {
    const m = mark[r.item.id];
    if (m === 'ok') okN++;
    else if (m === 'bad') badN++;
    else skipN++;
  });
  const s = QB.mistakeStats();
  const n = list.length;
  summary.value = {
    okN, badN, skipN, n,
    pct: Math.round(okN / n * 100),
    pending: s.pending,
    praise: okN === n ? '这一轮全对，错题本又轻了一点。'
      : okN >= n / 2 ? '过了一半，剩下那几道明天再见。'
        : '没关系 —— 错题本来就是要反复才记住的。'
  };
  finished.value = true;
  nextTick(() => {
    if (ringEl.value && FX && FX.ring) FX.ring(ringEl.value, summary.value.pct);
    window.scrollTo({ top: 0, behavior: 'auto' });
  });
}

const emptyInfo = computed(() => {
  const st = QB.mistakeStats();
  return { total: st.total, pending: st.pending };
});

/* ---------- 键盘 ---------- */
function onKey(e) {
  if (e.key !== 'Enter' || e.shiftKey) return;
  const t = e.target;
  const tag = (t.tagName || '').toLowerCase();
  if (t.isContentEditable) return;
  if (tag === 'textarea') return;
  if (t.classList && t.classList.contains('q-blank')) return;
  if (!graded.value) { e.preventDefault(); doSubmit(); }
  else { e.preventDefault(); advance(); }
}

onMounted(() => {
  boot();
  document.addEventListener('keydown', onKey);
  /* ?selftest：给无头验证一个可断言的出口 */
  if (has('selftest')) runSelftest();
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  clearTimeout(toastTimer);
});

function runSelftest() {
  const out = [];
  const chk = (name, cond, extra) => {
    out.push((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '=' + extra : ''));
  };
  chk('queue', !!queue.value && queue.value.list.length > 0, queue.value ? queue.value.list.length : 0);
  chk('dots', dots.value.length === (queue.value ? queue.value.list.length : 0));

  const it = cur.value && cur.value.item;
  if (!it) { document.body.setAttribute('data-selftest', out.join(';')); return; }

  if (it.type === 'choice') {
    const opts = it.options || [];
    const pickOpt = has('wrong') ? opts[opts.length - 1] : opts[0];
    if (pickOpt) pick(pickOpt);
    chk('pick', ansChoice.value.length > 0, ansChoice.value.join(','));
  } else if (it.type === 'fill_blank') {
    (it.blanks || []).forEach((b) => {
      ansFill[b.n] = has('wrong') ? 'zzz' : ((b.accept && b.accept[0]) || 'x');
    });
    chk('fill', Object.keys(ansFill).length > 0);
  } else {
    ansShort.value = has('wrong') ? '不会' : '测试作答';
    chk('short', !!ansShort.value);
  }

  chk('answered', answered.value);
  const before = cur.value.e.wrong || 0;
  doSubmit();
  chk('graded', graded.value);
  chk('has-verdict', !!res.value);
  chk('mark', !!mark[it.id], mark[it.id]);
  chk('attempt-saved', !!QB.attemptOf(it.id));
  const after = QB.mistakeOf(it.id) || {};
  chk('wrong-delta', (after.wrong || 0) === before + (res.value.ok ? 0 : 1), (after.wrong || 0) + '/' + before);
  chk('fixed-flag', !!after.fixed === !!res.value.ok);

  if (has('walk')) {
    let guard = 0;
    while (guard++ < 30 && !finished.value) {
      if (graded.value) advance();
      if (finished.value) break;
      const it2 = cur.value && cur.value.item;
      if (!it2) break;
      if (it2.type === 'choice') pick((it2.options || [])[0]);
      else if (it2.type === 'fill_blank') (it2.blanks || []).forEach((b) => { ansFill[b.n] = 'x'; });
      else ansShort.value = '测试作答';
      doSubmit();
    }
    chk('walk-rounds', guard < 30, guard);
    chk('done-shown', finished.value);
  }
  document.body.setAttribute('data-selftest', out.join(';'));
}
</script>

<template>
  <div>
    <!-- 复习进度条：空态也保留（旧版常驻），否则没有返回错题本的入口 -->
    <div v-if="queue" class="rv-bar">
      <RouterLink class="qb-back" :to="{ name: 'mistakes' }" aria-label="返回错题本">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14.6 5.6 8.2 12l6.4 6.4"/>
        </svg>
      </RouterLink>
      <div class="rv-dots">
        <span v-for="(d, i) in dots" :key="i" :class="d.cls" :title="d.title">{{ d.txt }}</span>
      </div>
      <span class="rv-pos">{{ queue.list.length ? Math.min(idx + 1, queue.list.length) + ' / ' + queue.list.length : '—' }}</span>
    </div>

    <!-- 当前错题 -->
    <article v-if="cur && !finished" class="rv-card" :class="{ shake: shaking }">
      <div class="rv-head">
        <span class="rv-stage">第 {{ dueInfo.stage }} 次复习</span>
        <span class="chip q-subj"><i class="dot" :style="{ background: subjColor(cur.block.subject) }"></i>{{ cur.block.subject }}</span>
        <span class="qtype" :class="'qtype-' + typeCls(cur.item.type)">{{ typeLabel(cur.item.type) }}</span>
        <span class="rv-wrong" :class="{ hot: isClosed }">错过 {{ cur.e.wrong || 1 }} 次</span>
      </div>
      <p class="rv-kp">
        {{ cur.block.kp }} · {{ cur.item.score }} 分
        <template v-if="cur.block.material"> · 材料第 {{ cur.item.ord }} 小问</template>
      </p>

      <!-- 材料 -->
      <div v-if="cur.block.material" class="rv-mat">
        <p class="rv-mat-t">{{ cur.block.material.title }}</p>
        <p v-for="(parts, i) in matParas(cur.block, cur.item.blank || 0)" :key="i">
          <template v-for="(p, j) in parts" :key="j">
            <span v-if="p.t === 'html'" v-html="p.v"></span>
            <span v-else-if="p.on" class="rv-blank-on">{{ p.n }}</span>
            <span v-else class="rv-blank-off">＿＿</span>
          </template>
        </p>
        <p v-if="cur.block.material.source" class="rv-mat-s">— {{ cur.block.material.source }}</p>
      </div>

      <!-- 题干 + 作答 -->
      <div class="rv-ask">
        <!-- 选择 -->
        <template v-if="cur.item.type === 'choice'">
          <div class="q-stem" v-html="cur.item.stem || (cur.item.blank ? '第 ' + cur.item.blank + ' 空' : '')"></div>
          <div v-if="cur.item.figures && cur.item.figures.length" class="q-figures">
            <figure v-for="(f, i) in cur.item.figures" :key="i" class="q-figure">
              <span v-html="f.svg"></span>
              <figcaption v-if="f.caption">{{ f.caption }}</figcaption>
            </figure>
          </div>
          <div class="q-opts">
            <button v-for="(o, i) in cur.item.options" :key="o.id" :class="optionCls(o)"
                    type="button" :disabled="graded" @click="pick(o)">
              <span class="q-opt-k">{{ LETTER[i] }}</span>
              <span class="q-opt-t">{{ o.text }}</span>
              <span v-if="graded && (cur.item.answer || []).indexOf(o.id) >= 0" class="q-opt-flag">正确</span>
            </button>
          </div>
        </template>

        <!-- 填空 -->
        <template v-else-if="cur.item.type === 'fill_blank'">
          <div class="q-stem">
            <template v-for="(p, i) in stemParts(cur.item)" :key="i">
              <span v-if="p.t === 'html'" v-html="p.v"></span>
              <span v-else class="qb-wrap">
                <b class="qb-no">{{ p.n }}</b>
                <input class="q-blank" type="text" :data-n="p.n" autocomplete="off" spellcheck="false"
                       :style="{ width: p.w + 'em' }" v-model="ansFill[p.n]"
                       :readonly="graded" :aria-label="'第 ' + p.n + ' 空'">
              </span>
            </template>
          </div>
          <div v-if="cur.item.figures && cur.item.figures.length" class="q-figures">
            <figure v-for="(f, i) in cur.item.figures" :key="i" class="q-figure">
              <span v-html="f.svg"></span>
              <figcaption v-if="f.caption">{{ f.caption }}</figcaption>
            </figure>
          </div>
        </template>

        <!-- 简答 / 材料小问 -->
        <template v-else>
          <div class="q-stem" v-html="cur.item.stem || ''"></div>
          <div v-if="cur.item.figures && cur.item.figures.length" class="q-figures">
            <figure v-for="(f, i) in cur.item.figures" :key="i" class="q-figure">
              <span v-html="f.svg"></span>
              <figcaption v-if="f.caption">{{ f.caption }}</figcaption>
            </figure>
          </div>
          <textarea v-model="ansShort" class="q-ta" rows="6" :readonly="graded"
                    placeholder="按要点一条一条写，判分是按采分点给的…"></textarea>
          <div class="q-ta-foot">
            <span class="q-words">已写 {{ plain(ansShort).length }} 字</span>
            <span class="q-words-tip">写完检查一遍要点有没有漏</span>
          </div>
        </template>
      </div>

      <!-- 上次答的什么 -->
      <p v-if="lastStrip" class="rv-last">
        <template v-if="lastStrip.first">
          <span class="rv-last-k">第一次复习</span>
          <span class="rv-last-v">{{ lastStrip.text }}</span>
        </template>
        <template v-else>
          <span class="rv-last-k">{{ lastStrip.ok ? '上次答对了' : '上次你答的' }}</span>
          <span class="rv-last-v" :class="lastStrip.ok ? 'ok' : 'bad'">{{ lastStrip.text }}</span>
          <span class="rv-last-t">{{ lastStrip.at }}</span>
        </template>
      </p>
    </article>

    <!-- 判定结果 -->
    <section v-if="graded && res" ref="resEl" class="rv-res">
      <div class="rv-verdict" :class="res.ok ? 'ok' : 'bad'">
        <span class="rv-v-ico">{{ res.ok ? '✓' : '✕' }}</span>
        <span class="rv-v-txt">
          <b>{{ res.ok ? '订正成功' : '还差一点' }}</b>
          <i>{{ res.ok ? '做对一次就算订正，这道从待订正里出去了' : '错题没销号，错误次数 +1，明天再来一次' }}</i>
        </span>
      </div>

      <div class="rv-score">
        <span class="rv-score-n">{{ res.score }}<i>/{{ res.max }}</i></span>
        <span class="rv-score-t">本题得分</span>
        <span class="chip" :class="res.ok ? 'ok' : 'warn'">{{ res.ok ? '全对' : '未通过' }}</span>
      </div>

      <div class="rv-cmp">
        <div class="rv-cmp-row">
          <span class="rv-cmp-k">你的答案</span>
          <span class="rv-cmp-v" :class="res.ok ? 'good' : 'bad'">{{ ansText(cur.item, submittedAns) || '未作答' }}</span>
        </div>
        <div class="rv-cmp-row">
          <span class="rv-cmp-k">正确答案</span>
          <span class="rv-cmp-v good" v-html="rightHTML(cur.item)"></span>
        </div>
      </div>

      <!-- 填空题逐空 -->
      <div v-if="res.marks && res.marks.length" class="rv-marks">
        <div v-for="(m, i) in res.marks" :key="i" class="rv-mark" :class="m.ok ? 'ok' : 'bad'">
          <span class="rv-mark-k">{{ m.label }}</span>
          <span class="rv-mark-v">{{ m.val || '（空）' }}</span>
          <span class="rv-mark-need">{{ m.ok ? '✓' : '应填 ' + m.need }}</span>
        </div>
      </div>

      <!-- 简答采分点 -->
      <div v-if="res.hits || res.miss" class="rv-rubric">
        <p class="rv-rubric-h">采分点命中 {{ (res.hits || []).length }} / {{ (res.hits || []).length + (res.miss || []).length }}</p>
        <p v-for="(r, i) in res.hits || []" :key="'h' + i" class="rv-rub ok">
          <b>✓</b>{{ r.point }}<i>{{ r.score }} 分</i>
        </p>
        <p v-for="(r, i) in res.miss || []" :key="'m' + i" class="rv-rub bad">
          <b>✕</b>{{ r.point }}<i>缺这 {{ r.score }} 分</i>
        </p>
      </div>

      <!-- 讲解 -->
      <div v-if="cur.item.explanation || cur.item.answer_text" class="rv-why">
        <p class="rv-why-h">{{ cur.item.explanation ? '讲解' : '参考答案' }}</p>
        <div class="rv-why-b" v-html="cur.item.explanation || cur.item.answer_text"></div>
      </div>

      <!-- 下一次 -->
      <div v-if="sched" class="rv-sched" :class="res.ok ? 'ok' : 'bad'">
        <span class="rv-sched-k">下次复习</span>
        <span class="rv-sched-v">{{ sched.gap }} 天后 · {{ fmtDate(sched.at) }}</span>
        <span class="rv-sched-t">{{ res.ok ? (sched.fixed ? '已订正，间隔拉到最长做终检' : '') : '还是没对，间隔回到最短档' }}</span>
      </div>
    </section>

    <!-- 本轮小结 -->
    <section v-if="finished && summary" class="rv-done">
      <div class="rv-done-top">
        <div ref="ringEl" class="rv-done-ring" :data-ring="summary.pct">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle class="track" cx="60" cy="60" r="50"></circle>
            <circle class="val" cx="60" cy="60" r="50"></circle>
          </svg>
          <div class="hero-ring-txt"><b>{{ summary.okN }}</b><span>/ {{ summary.n }} 道</span></div>
        </div>
        <div class="rv-done-txt">
          <p class="rv-done-k">本轮复习结束</p>
          <h2 class="rv-done-h">订正 {{ summary.okN }} 道</h2>
          <p class="rv-done-p">{{ summary.praise }}</p>
          <div class="chips">
            <span v-if="summary.okN" class="chip ok">订正 {{ summary.okN }} 道</span>
            <span v-if="summary.badN" class="chip warn">仍待订正 {{ summary.badN }} 道</span>
            <span v-if="summary.skipN" class="chip">跳过 {{ summary.skipN }} 道</span>
            <span class="chip">错题本待订正 {{ summary.pending }} 道</span>
          </div>
        </div>
      </div>
      <div class="rv-done-act">
        <RouterLink class="btn-brand" :to="{ name: 'mistakes' }">回错题本</RouterLink>
        <RouterLink v-if="summary.pending" class="btn-ghost"
                    :to="{ name: 'mistake-review', query: { scope: 'all' } }">再过一轮（{{ summary.pending }} 道待订正）</RouterLink>
        <RouterLink class="btn-ghost" :to="{ name: 'daily' }">回每日任务</RouterLink>
      </div>
      <p class="rv-done-note">每道错题按 1 / 2 / 4 / 7 / 15 / 30 天的间隔排复习：
        答对一次就把间隔往后推一档，答错一次就退回最短档 —— 什么时候再见面由你的表现决定。</p>
    </section>

    <!-- 空态 -->
    <section v-if="empty" class="rv-done">
      <div class="rv-empty">
        <template v-if="emptyInfo.total">
          <div class="rv-empty-ico">✓</div>
          <h2>今天没有到期的错题</h2>
          <p>错题本里还有 <b>{{ emptyInfo.pending }}</b> 道待订正，但都还没到复习时间。
            想提前过一遍也行 —— 提前做对了同样算订正。</p>
          <div class="rv-empty-act">
            <RouterLink v-if="emptyInfo.pending" class="btn-brand"
                        :to="{ name: 'mistake-review', query: { scope: 'all' } }">提前复习（{{ emptyInfo.pending }} 道）</RouterLink>
            <RouterLink class="btn-ghost" :to="{ name: 'mistakes' }">回错题本</RouterLink>
          </div>
        </template>
        <template v-else>
          <div class="rv-empty-ico">＋</div>
          <h2>错题本还是空的</h2>
          <p>每日题目里答错的题会自动收进来，也可以在做题时手动点「加入错题本」。
            收进来之后，这里就按 1 / 2 / 4 / 7 / 15 / 30 天的节奏提醒你复习。</p>
          <div class="rv-empty-act">
            <RouterLink class="btn-brand" :to="{ name: 'daily' }">去看今日任务</RouterLink>
            <RouterLink class="btn-ghost" :to="{ name: 'mistakes' }">回错题本</RouterLink>
          </div>
        </template>
      </div>
    </section>

    <!-- 吸底操作条 -->
    <div v-if="!finished && !empty" class="rv-foot">
      <button class="btn-ghost" type="button" :disabled="graded" @click="doSkip">这道跳过</button>
      <button v-if="!graded" class="btn-brand" type="button" @click="doSubmit">提交答案</button>
      <button v-else class="btn-brand" type="button" @click="advance">
        {{ idx >= queue.list.length - 1 ? '完成本轮' : '下一题' }}
      </button>
    </div>

    <Teleport to="body">
      <div v-if="toastMsg" class="toast on">{{ toastMsg }}</div>
    </Teleport>
  </div>
</template>
