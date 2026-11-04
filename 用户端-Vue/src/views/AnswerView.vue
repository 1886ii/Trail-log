<script setup>
/* ============================================================
   作答页（一个页面渲染四个模板：选择 / 填空 / 简答 / 材料题）
   流程：读题 → 作答 → 提交 → 本地判分（正式版为服务端 + LLM）→ 讲解
   迁移自 answer.html：原型的「整卡 innerHTML 重画」在这里全部换成
   响应式数据驱动，作答记录 / 草稿 / 错题本仍走 window.QB 同一份存储。
   ============================================================ */
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import { QB } from '../lib/qbank.js';
import { SUBJ_C, LETTER, plain } from '../lib/fmt.js';
import { FX } from '../lib/fx.js';

const route = useRoute();
const router = useRouter();

/* ---------- 状态 ---------- */
const block = ref(null);
const ans = reactive({});        /* { itemId: 作答 } */
const graded = ref(false);
const activeBlank = ref(0);      /* 完形填空：当前展开选项的空号 */
const mkFlash = ref(null);       /* 本次提交的错题本动作 { added, fixed, back } */
const result = ref(null);        /* QB.gradeBlock 的结果 */
const mkBump = ref(0);           /* 错题本开关变化计数（QB 是同步存储，bump 触发重算） */
const shaking = ref(false);
const folded = ref(false);       /* 材料折叠（窄屏） */
const toastMsg = ref('');
const cardEl = ref(null);
const resultEl = ref(null);
let toastTimer = null;

const isMaterial = computed(() => block.value && QB.kind(block.value) === 'material');
const isInline = computed(() => !!(block.value && QB.isInline(block.value)));
const asks = computed(() =>
  isMaterial.value ? block.value.items.filter((it) => !it.blank) : block.value.items
);

/* ---------- 载入（切换题组 / 首次进入共用） ---------- */
function load() {
  const id = String(route.query.id || '');
  const b = QB.find(id) || QB.bank[0];
  block.value = b;

  Object.keys(ans).forEach((k) => { delete ans[k]; });
  const prev = QB.attempts();
  const drafts = QB.drafts();

  if (b.items.some((it) => !!prev[it.id])) {
    /* 已提交过 → 回看模式 */
    graded.value = true;
    b.items.forEach((it) => { if (prev[it.id]) ans[it.id] = prev[it.id].ans; });
    result.value = QB.gradeBlock(b, { ...ans });
  } else {
    graded.value = false;
    result.value = null;
    b.items.forEach((it) => { if (drafts[it.id]) ans[it.id] = drafts[it.id]; });
  }
  activeBlank.value = 0;
  mkFlash.value = null;
  folded.value = false;
  window.scrollTo(0, 0);
}

watch(() => route.query.id, load);
onMounted(() => {
  load();
  document.addEventListener('keydown', onKey);

  /* ?mkauto / ?mkright：无头验证旁路（与旧原型对齐）——
     故意答错 / 答对第一道小题 → 提交，把错题本动向写进 body 属性供断言 */
  const q = route.query;
  if ('mkauto' in q || 'mkright' in q) mkAuto('mkright' in q);
});

function mkAuto(right) {
  const it = block.value.items[0];
  if (it.type === 'choice') {
    ans[it.id] = right ? (it.answer || []).slice() : ['__wrong__'];
  } else if (it.type === 'fill_blank') {
    const o = {};
    (it.blanks || []).forEach((b) => {
      o[b.n] = right ? ((b.accept && b.accept[0]) || '') : '故意答错';
    });
    ans[it.id] = o;
  } else {
    ans[it.id] = right ? (it.answer_text || '') : '故意写一句不对的答案';
  }
  doSubmit();
  const m = QB.mistakeOf(it.id);
  const st = QB.mistakeStats();
  nextTick(() => {
    document.body.setAttribute('data-mk-auto',
      'item=' + it.id + ';mode=' + (right ? 'right' : 'wrong') +
      ';in=' + (!!m) + ';wrong=' + (m ? m.wrong : 0) +
      ';fixed=' + (m ? m.fixed : '-') +
      ';total=' + st.total + ';pending=' + st.pending + ';fixedN=' + st.fixed +
      ';flash=' + JSON.stringify(mkFlash.value));
  });
}
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  clearTimeout(toastTimer);
});

/* ---------- 小工具 ---------- */
function toastBox(msg) {
  toastMsg.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 1800);
}

function subjColor(name) { return SUBJ_C[name] || 'var(--brand)'; }

/* 题干按 {{n}} 空位切开：文本段走 v-html，空位段渲染输入框 */
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

/* 材料段落同样按空位切开（仅完形内嵌空位可交互） */
function paraParts(p) {
  const s = String(p);
  if (!isInline.value) return [{ t: 'html', v: s.replace(/\n/g, '<br>') }];
  const parts = [];
  const re = /\{\{(\d+)\}\}/g;
  let last = 0, m;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push({ t: 'html', v: s.slice(last, m.index).replace(/\n/g, '<br>') });
    parts.push({ t: 'blank', n: +m[1] });
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push({ t: 'html', v: s.slice(last).replace(/\n/g, '<br>') });
  return parts;
}

function blankLetter(n) {
  const b = block.value;
  let item = null;
  b.items.forEach((it) => { if (it.blank === n) item = it; });
  const picked = item ? (ans[item.id] || []) : [];
  if (!picked.length) return '?';
  const idx = item.options.map((o) => o.id).indexOf(picked[0]);
  return idx >= 0 ? LETTER[idx] : '?';
}

function blankState(n) {
  const b = block.value;
  let item = null;
  b.items.forEach((it) => { if (it.blank === n) item = it; });
  const picked = item ? (ans[item.id] || []) : [];
  const idx = item && picked.length ? item.options.map((o) => o.id).indexOf(picked[0]) : -1;
  let cls = 'q-ib';
  if (idx >= 0) cls += ' on';
  if (activeBlank.value === n) cls += ' active';
  if (graded.value && item) cls += QB.grade(item, picked).ok ? ' right' : ' wrong';
  return cls;
}

function blankListItem(it) {
  const picked = ans[it.id] || [];
  const idx = picked.length ? it.options.map((o) => o.id).indexOf(picked[0]) : -1;
  let cls = 'qbl';
  if (graded.value) cls += QB.grade(it, picked).ok ? ' right' : ' wrong';
  else if (idx >= 0) cls += ' filled';
  return {
    blank: it.blank,
    cls,
    txt: idx >= 0 ? LETTER[idx] + ' · ' + plain(it.options[idx].text) : '未填'
  };
}

/* ---------- 作答交互 ---------- */
function setAnswer(id, v) {
  ans[id] = v;
  saveDraft();
}

function pick(item, oid) {
  if (graded.value) return;
  const picked = (ans[item.id] || []).slice();
  if (item.multi) {
    const at = picked.indexOf(oid);
    if (at >= 0) picked.splice(at, 1); else picked.push(oid);
  } else {
    picked.length = 0; picked.push(oid);
  }
  setAnswer(item.id, picked);
}

function setBlank(item, n, v) {
  const o = { ...(ans[item.id] || {}) };
  o[n] = v;
  setAnswer(item.id, o);
}

function blankVal(item, n) {
  const o = ans[item.id];
  return (o && o[n] != null) ? o[n] : '';
}

function shortWords(item) {
  return plain(String(ans[item.id] || '')).length;
}

function pickInline(n, item, oid) {
  if (graded.value) return;
  setAnswer(item.id, [oid]);
  activeBlank.value = 0;
}

function toggleBlank(n) {
  if (graded.value) return;
  activeBlank.value = activeBlank.value === n ? 0 : n;
}

function blankItem(n) {
  return block.value.items.find((it) => it.blank === n) || null;
}

function panelBlank() { return activeBlank.value && !graded.value ? blankItem(activeBlank.value) : null; }

function gotoBlank(n) {
  if (graded.value) return;
  activeBlank.value = n;
  nextTick(() => {
    const p = document.querySelector('.q-ib-panel');
    if (p && p.scrollIntoView) p.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
}

/* ---------- 错题本开关 ---------- */
const mkOn = (id) => { mkBump.value; return !!QB.mistakeOf(id); };

const groupMk = computed(() => {
  mkBump.value;
  if (!isMaterial.value) return null;
  const b = block.value;
  const all = QB.blockInMistakes(b);
  const some = b.items.some((it) => !!QB.mistakeOf(it.id));
  return {
    all, some,
    cls: all ? ' on' : (some ? ' some' : ''),
    txt: all ? '整组已在错题本' : (some ? '整组加入（部分已在）' : '整组加入错题本')
  };
});

function mkToggle(id) {
  const on = QB.mistakeToggle(id);
  toastBox(on ? '已加入错题本' : '已移出错题本');
  mkBump.value++;
}

function mkToggleGroup() {
  const b = block.value;
  const all = QB.blockInMistakes(b);
  b.items.forEach((it) => {
    if (all) QB.mistakeRemove(it.id); else QB.mistakeAdd(it.id, 'manual');
  });
  toastBox(all ? '整组已移出错题本' : '整组已加入错题本（' + b.items.length + ' 道）');
  mkBump.value++;
}

/* ---------- 草稿 / 提交 ---------- */
function saveDraft() {
  const b = block.value;
  const dr = QB.drafts();
  b.items.forEach((it) => {
    const v = ans[it.id];
    const has = (it.type === 'choice') ? (v && v.length)
      : (it.type === 'fill_blank') ? (v && Object.keys(v).some((k) => String(v[k] || '').trim()))
      : !!(v && String(v).trim());
    if (has) dr[it.id] = v; else delete dr[it.id];
  });
  QB.saveDrafts(dr);
}

function answeredCount(map) {
  const b = block.value;
  let n = 0;
  b.items.forEach((it) => {
    const a = map[it.id];
    if (it.type === 'choice') { if (a && a.length) n++; }
    else if (it.type === 'fill_blank') {
      if (a && Object.keys(a).some((k) => String(a[k] || '').trim())) n++;
    } else if (a && String(a).trim()) n++;
  });
  return n;
}

function doSubmit() {
  const b = block.value;
  const map = { ...ans };
  if (answeredCount(map) === 0) {
    shaking.value = false;
    requestAnimationFrame(() => { shaking.value = true; });
    setTimeout(() => { shaking.value = false; }, 500);
    toastBox('先作答再提交');
    return;
  }

  graded.value = true;
  activeBlank.value = 0;

  /* 落盘（正式版 POST /attempts） */
  const gr = QB.gradeBlock(b, map);
  gr.rows.forEach((r) => {
    if (r.res.unanswered) return;
    QB.save(r.item.id, {
      ans: map[r.item.id], ok: r.res.ok, score: r.res.score, max: r.res.max,
      hits: (r.res.hits || []).map((h) => h.point),
      at: Date.now()
    });
  });

  /* 错题本：答错自动收进来（次数 +1），答对顺手标成已订正 */
  let mkNew = 0, mkFixed = 0, mkBack = 0;
  gr.rows.forEach((r) => {
    if (r.res.unanswered) return;
    const had = !!QB.mistakeOf(r.item.id);
    if (!r.res.ok) {
      QB.mistakeWrong(r.item.id);
      if (!had) mkNew++; else mkBack++;
    } else if (QB.mistakeRight(r.item.id)) {
      mkFixed++;
    }
  });
  mkFlash.value = { added: mkNew, fixed: mkFixed, back: mkBack };
  mkBump.value++;

  /* 已提交，草稿清掉 */
  const dr = QB.drafts();
  b.items.forEach((it) => { delete dr[it.id]; });
  QB.saveDrafts(dr);

  result.value = gr;
  nextTick(() => {
    if (resultEl.value) {
      resultEl.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (gr.allOk && FX && FX.burstFrom) FX.burstFrom(resultEl.value);
    }
  });

  if (mkNew) toastBox(mkNew + ' 道错题已进错题本');
  else if (mkBack) toastBox(mkBack + ' 道又错了，错误次数 +1');
  else if (mkFixed) toastBox(mkFixed + ' 道已订正，漂亮');
}

function doRedo() {
  const b = block.value;
  QB.clearBlock(b);
  Object.keys(ans).forEach((k) => { delete ans[k]; });
  graded.value = false;
  activeBlank.value = 0;
  mkFlash.value = null;
  result.value = null;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ---------- 题号导航 / 翻页 ---------- */
const nums = computed(() => {
  if (!block.value) return [];
  const cur = QB.indexOf(block.value.id);
  return QB.bank.map((b, i) => {
    const st = QB.state(b);
    return {
      id: b.id, n: i + 1, cur: i === cur,
      done: st.state === 'done', wrong: st.state === 'wrong', part: st.state === 'part',
      title: b.subject + ' · ' + QB.typeInfo[QB.kind(b)].label
    };
  });
});

const curIdx = computed(() => (block.value ? QB.indexOf(block.value.id) : 0));

function go(step) {
  const i = curIdx.value + step;
  if (i < 0 || i >= QB.bank.length) return;
  router.push({ name: 'answer', query: { id: QB.bank[i].id } });
}

function onKey(e) {
  const tag = (e.target.tagName || '').toLowerCase();
  const typing = tag === 'input' || tag === 'textarea';
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { doSubmit(); return; }
  if (typing) return;
  if (e.key === 'ArrowLeft') go(-1);
  if (e.key === 'ArrowRight') go(1);
}

/* ---------- 判分结果展示 ---------- */
function verdictOf(res) {
  if (res.unanswered) return { cls: 'none', txt: '未作答' };
  if (res.ok) return { cls: 'ok', txt: '正确' };
  if (res.score > 0) return { cls: 'part', txt: '部分正确' };
  return { cls: 'bad', txt: '错误' };
}

function rightText(it) {
  return (it.answer || []).map((id) => {
    const idx = it.options.map((o) => o.id).indexOf(id);
    return LETTER[idx] + (it.options[idx] ? '· ' + plain(it.options[idx].text) : '');
  }).join('　');
}

function mineText(it, res) {
  if (res.unanswered) return '未作答';
  return (res.picked || []).map((id) => {
    const idx = it.options.map((o) => o.id).indexOf(id);
    return LETTER[idx];
  }).join('、');
}

const resPct = computed(() => (result.value && result.value.max ? Math.round(result.value.got / result.value.max * 100) : 0));
const okN = computed(() => (result.value ? result.value.rows.filter((r) => r.res.ok).length : 0));
const wrongN = computed(() => (result.value ? result.value.rows.filter((r) => !r.res.ok && !r.res.unanswered).length : 0));
const unansN = computed(() => (result.value ? result.value.rows.filter((r) => r.res.unanswered).length : 0));
const mkStats = computed(() => { mkBump.value; return QB.mistakeStats(); });

const mkLine = computed(() => {
  const f = mkFlash.value;
  if (!f || (!f.added && !f.fixed && !f.back)) return '';
  const bits = [];
  if (f.added) bits.push('新收 ' + f.added + ' 道');
  if (f.back) bits.push('又错 ' + f.back + ' 道（次数 +1）');
  if (f.fixed) bits.push('订正 ' + f.fixed + ' 道');
  return bits.join(' · ');
});

const kindCls = computed(() => {
  if (!block.value) return '';
  const k = QB.kind(block.value);
  return k === 'fill_blank' ? 'fill' : (k === 'short_answer' ? 'short' : k);
});

const tipText = computed(() => (graded.value
  ? '本题已作答（存在本机）。点「重做本题」可以清空重来。'
  : '提示：答案在提交前不会下发到本地。切到别的题再回来，作答会自动保留。'));
</script>

<template>
  <!-- 作答进度条：teleport 到顶栏下方（App 外壳预留的 #page-chrome 槽位） -->
  <Teleport to="#page-chrome">
    <div v-if="block" class="quiz-bar">
      <RouterLink class="qb-back" :to="{ name: 'practice' }" aria-label="返回题目列表">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M14.6 5.6 8.2 12l6.4 6.4" />
        </svg>
      </RouterLink>
      <div class="qb-nums">
        <RouterLink v-for="n in nums" :key="n.id" class="qnum"
                    :class="{ cur: n.cur, done: n.done, wrong: n.wrong, part: n.part }"
                    :to="{ name: 'answer', query: { id: n.id } }" :title="n.title">{{ n.n }}</RouterLink>
      </div>
      <span class="qb-count">第 {{ curIdx + 1 }} / {{ QB.bank.length }} 题</span>
    </div>
  </Teleport>

  <template v-if="block">
    <!-- 题面 -->
    <article class="qcard reveal" ref="cardEl" :class="{ shake: shaking }">
      <header class="qc-head">
        <div class="q-tags">
          <span class="qtype" :class="'qtype-' + kindCls">{{ QB.typeInfo[QB.kind(block)].label }}</span>
          <span class="chip q-subj"><i class="dot" :style="{ background: subjColor(block.subject) }"></i>{{ block.subject }}</span>
          <span class="q-star" :title="'难度 ' + block.star + ' 星'">
            <template v-for="i in 3" :key="i"><i v-if="i > block.star">★</i><template v-else>★</template></template>
          </span>
          <span class="q-pt">{{ block.score }} 分</span>
        </div>
        <p class="q-meta">{{ block.kp }} · 难度 {{ block.difficulty }}</p>
        <button v-if="groupMk" id="mk-group" class="q-mk" :class="groupMk.cls" type="button"
                :aria-pressed="groupMk.all ? 'true' : 'false'"
                title="这一组小题一起加入错题本" @click="mkToggleGroup">
          <span class="q-mk-i">{{ groupMk.all ? '✓' : '+' }}</span>
          <span class="q-mk-t">{{ groupMk.txt }}</span>
        </button>
      </header>

      <!-- 材料题：材料 + 小题两栏 -->
      <div v-if="isMaterial" class="q-split">
        <section class="q-material" :class="{ 'is-inline': isInline, folded: folded }">
          <div class="qm-head">
            <span class="qm-tag">材料</span>
            <b class="qm-title">{{ block.material.title }}</b>
            <span v-if="block.material.source" class="qm-src">{{ block.material.source }}</span>
            <button class="qm-fold" type="button" @click="folded = !folded">{{ folded ? '展开材料' : '收起材料' }}</button>
          </div>

          <div class="qm-body">
            <p v-for="(p, pi) in block.material.paragraphs" :key="pi">
              <template v-for="(pt, qi) in paraParts(p)" :key="pi + '-' + qi">
                <span v-if="pt.t === 'html'" v-html="pt.v"></span>
                <button v-else class="q-ib" :class="blankState(pt.n)" type="button"
                        :disabled="graded" @click="toggleBlank(pt.n)">{{ blankLetter(pt.n) }}</button>
              </template>
            </p>
          </div>

          <p v-if="isInline" class="qm-inline-tip">材料里的 <b>?</b> 就是空位 —— 点它，从下面选一个词填进去。</p>

          <div v-if="panelBlank()" class="q-ib-panel">
            <span class="qib-lbl">第 {{ activeBlank }} 空</span>
            <button v-for="(o, oi) in panelBlank().options" :key="o.id" class="qib-opt"
                    :class="{ on: (ans[panelBlank().id] || []).indexOf(o.id) >= 0 }"
                    type="button" @click="pickInline(activeBlank, panelBlank(), o.id)">
              <b>{{ LETTER[oi] }}</b>{{ o.text }}
            </button>
            <button class="qib-close" type="button" @click="activeBlank = 0">收起</button>
          </div>
        </section>

        <div class="q-asks">
          <p class="qa-count">共 {{ block.items.length }} 道小题{{ isInline ? '（空位在材料里）' : '' }}，分值 {{ block.score }} 分</p>

          <div v-if="isInline" class="q-blanklist">
            <p class="qa-count">空位一览 · 点一个去填</p>
            <button v-for="bl in block.items.map(blankListItem)" :key="bl.blank"
                    :class="bl.cls" type="button" :disabled="graded" @click="gotoBlank(bl.blank)">
              <b>{{ bl.blank }}</b><span>{{ bl.txt }}</span>
            </button>
          </div>

          <!-- 材料小题（非内嵌空位的那些） -->
          <section v-for="(it, i) in asks" :key="it.id" class="q-ask">
            <div class="qa-head">
              <span class="qa-no">{{ i + 1 }}</span>
              <span class="qa-score">{{ it.score }} 分</span>
              <span v-if="it.type === 'short_answer' && it.min_words" class="qa-hint">不少于 {{ it.min_words }} 字</span>
              <button class="q-mk" :class="{ on: mkOn(it.id) }" type="button"
                      :aria-pressed="mkOn(it.id) ? 'true' : 'false'"
                      :title="mkOn(it.id) ? '已在错题本，点一下移出' : '收藏到错题本，之后可以集中复习'"
                      @click="mkToggle(it.id)">
                <span class="q-mk-i">{{ mkOn(it.id) ? '✓' : '+' }}</span>
                <span class="q-mk-t">{{ mkOn(it.id) ? '已在错题本' : '加入错题本' }}</span>
              </button>
            </div>

            <div v-if="it.type !== 'fill_blank'" class="q-stem" v-html="it.stem"></div>
            <div v-else class="q-stem">
              <template v-for="(pt, pi) in stemParts(it)" :key="pi">
                <span v-if="pt.t === 'html'" v-html="pt.v"></span>
                <span v-else class="qb-wrap"><b class="qb-no">{{ pt.n }}</b>
                  <input class="q-blank" type="text" autocomplete="off" spellcheck="false"
                         :style="{ width: pt.w + 'em' }" :value="blankVal(it, pt.n)"
                         :readonly="graded" :aria-label="'第 ' + pt.n + ' 空'"
                         @input="setBlank(it, pt.n, $event.target.value)">
                </span>
              </template>
            </div>

            <div v-if="it.figures && it.figures.length" class="q-figures">
              <figure v-for="(f, fi) in it.figures" :key="fi" class="q-figure">
                <span v-html="f.svg"></span>
                <figcaption v-if="f.caption">{{ f.caption }}</figcaption>
              </figure>
            </div>

            <div v-if="it.type === 'choice'" class="q-opts" :class="{ multi: it.multi }">
              <button v-for="(o, oi) in it.options" :key="o.id" class="q-opt"
                      :class="{
                        on: (ans[it.id] || []).indexOf(o.id) >= 0,
                        right: graded && (it.answer || []).indexOf(o.id) >= 0,
                        'pick-wrong': graded && (it.answer || []).indexOf(o.id) < 0 && (ans[it.id] || []).indexOf(o.id) >= 0
                      }"
                      type="button" :disabled="graded" @click="pick(it, o.id)">
                <span class="q-opt-k">{{ LETTER[oi] }}</span>
                <span class="q-opt-t" v-html="o.text"></span>
                <span v-if="graded && (it.answer || []).indexOf(o.id) >= 0" class="q-opt-flag">正确</span>
              </button>
            </div>

            <div v-if="it.type === 'short_answer'">
              <textarea class="q-ta" rows="6" :value="String(ans[it.id] || '')" :readonly="graded"
                        placeholder="把要点一条一条写清楚，判分是按采分点给的…"
                        @input="setAnswer(it.id, $event.target.value)"></textarea>
              <div class="q-ta-foot">
                <span class="q-words">已写 {{ shortWords(it) }} 字</span>
                <span class="q-words-tip">写完检查一遍要点有没有漏</span>
              </div>
            </div>
          </section>
        </div>
      </div>

      <!-- 普通题：选择 / 填空 / 简答 -->
      <template v-else>
        <section v-for="(it, i) in block.items" :key="it.id" class="q-ask">
          <div class="qa-head">
            <span class="qa-no">{{ i + 1 }}</span>
            <span class="qa-score">{{ it.score }} 分</span>
            <span v-if="it.type === 'short_answer' && it.min_words" class="qa-hint">不少于 {{ it.min_words }} 字</span>
            <button class="q-mk" :class="{ on: mkOn(it.id) }" type="button"
                    :aria-pressed="mkOn(it.id) ? 'true' : 'false'"
                    :title="mkOn(it.id) ? '已在错题本，点一下移出' : '收藏到错题本，之后可以集中复习'"
                    @click="mkToggle(it.id)">
              <span class="q-mk-i">{{ mkOn(it.id) ? '✓' : '+' }}</span>
              <span class="q-mk-t">{{ mkOn(it.id) ? '已在错题本' : '加入错题本' }}</span>
            </button>
          </div>

          <div v-if="it.type !== 'fill_blank'" class="q-stem" v-html="it.stem"></div>
          <div v-else class="q-stem">
            <template v-for="(pt, pi) in stemParts(it)" :key="pi">
              <span v-if="pt.t === 'html'" v-html="pt.v"></span>
              <span v-else class="qb-wrap"><b class="qb-no">{{ pt.n }}</b>
                <input class="q-blank" type="text" autocomplete="off" spellcheck="false"
                       :style="{ width: pt.w + 'em' }" :value="blankVal(it, pt.n)"
                       :readonly="graded" :aria-label="'第 ' + pt.n + ' 空'"
                       @input="setBlank(it, pt.n, $event.target.value)">
              </span>
            </template>
          </div>

          <div v-if="it.figures && it.figures.length" class="q-figures">
            <figure v-for="(f, fi) in it.figures" :key="fi" class="q-figure">
              <span v-html="f.svg"></span>
              <figcaption v-if="f.caption">{{ f.caption }}</figcaption>
            </figure>
          </div>

          <div v-if="it.type === 'choice'" class="q-opts" :class="{ multi: it.multi }">
            <button v-for="(o, oi) in it.options" :key="o.id" class="q-opt"
                    :class="{
                      on: (ans[it.id] || []).indexOf(o.id) >= 0,
                      right: graded && (it.answer || []).indexOf(o.id) >= 0,
                      'pick-wrong': graded && (it.answer || []).indexOf(o.id) < 0 && (ans[it.id] || []).indexOf(o.id) >= 0
                    }"
                    type="button" :disabled="graded" @click="pick(it, o.id)">
              <span class="q-opt-k">{{ LETTER[oi] }}</span>
              <span class="q-opt-t" v-html="o.text"></span>
              <span v-if="graded && (it.answer || []).indexOf(o.id) >= 0" class="q-opt-flag">正确</span>
            </button>
          </div>

          <div v-if="it.type === 'short_answer'">
            <textarea class="q-ta" rows="6" :value="String(ans[it.id] || '')" :readonly="graded"
                      placeholder="把要点一条一条写清楚，判分是按采分点给的…"
                      @input="setAnswer(it.id, $event.target.value)"></textarea>
            <div class="q-ta-foot">
              <span class="q-words">已写 {{ shortWords(it) }} 字</span>
              <span class="q-words-tip">写完检查一遍要点有没有漏</span>
            </div>
          </div>
        </section>
      </template>
    </article>

    <!-- 判分结果 -->
    <section v-if="result" ref="resultEl" class="qresult">
      <div class="qr-total" :class="{ ok: result.allOk }">
        <div class="qrt-score"><b>{{ result.got }}</b><span>/ {{ result.max }} 分</span></div>
        <div class="qrt-body">
          <p class="qrt-title">{{ result.allOk ? '全部正确，漂亮' : '已判分 · 得分率 ' + resPct + '%' }}</p>
          <p class="q-meta">{{ result.rows.length }} 道小题 · {{ okN }} 对 · {{ wrongN }} 错<template v-if="unansN"> · {{ unansN }} 未作答</template></p>
          <p v-if="mkLine" class="qr-mk">错题本 · {{ mkLine }}</p>
          <div class="qrt-acts">
            <button class="btn-ghost" type="button" @click="doRedo">重做本题</button>
            <RouterLink v-if="wrongN" class="btn-ghost" :to="{ name: 'mistakes' }">
              {{ (mkFlash && mkFlash.added) ? mkFlash.added + ' 道错题已进错题本 · 去看' : '错题本（' + mkStats.pending + ' 道待订正）' }}
            </RouterLink>
            <RouterLink v-else-if="mkStats.total" class="btn-ghost" :to="{ name: 'mistakes' }">错题本 · {{ mkStats.pending }} 道待订正</RouterLink>
          </div>
        </div>
      </div>

      <div v-for="row in result.rows" :key="row.item.id" class="qr-row">
        <div class="qr-head">
          <span class="qr-no">第 {{ row.item.ord }} 题<template v-if="row.item.blank">（空 {{ row.item.blank }}）</template></span>
          <span class="qr-verdict" :class="verdictOf(row.res).cls">{{ verdictOf(row.res).txt }}</span>
          <span class="qr-score">{{ row.res.score || 0 }} / {{ row.res.max || row.item.score }} 分</span>
        </div>

        <!-- 选择 -->
        <template v-if="row.item.type === 'choice'">
          <p class="qr-line">你的答案：<b>{{ mineText(row.item, row.res) }}</b>
            <template v-if="row.item.blank"><span class="qr-where">（第 {{ row.item.blank }} 空）</span></template></p>
          <p class="qr-line">正确答案：<b class="ok">{{ rightText(row.item) }}</b></p>
        </template>

        <!-- 填空 -->
        <div v-else-if="row.item.type === 'fill_blank' && row.res.marks" class="qr-blanks">
          <div v-for="m in row.res.marks" :key="m.label" class="qr-blank" :class="m.ok ? 'ok' : 'bad'">
            <span class="qrb-k">{{ m.label }}</span>
            <span class="qrb-v">{{ m.ok ? '✓ ' : '✕ ' }}{{ m.val ? m.val : '未填' }}</span>
            <span v-if="!m.ok" class="qrb-need">应为「{{ m.need }}」</span>
            <span v-if="m.tip" class="qrb-tip">{{ m.tip }}</span>
          </div>
        </div>

        <!-- 简答 -->
        <template v-else-if="!row.res.unanswered || row.item.type === 'short_answer'">
          <div class="qr-rubric">
            <div v-for="r in (row.res.hits || [])" :key="'h' + r.point" class="qr-point got">
              <span class="qrp-m">✓</span><span class="qrp-t">{{ r.point }}</span><span class="qrp-s">+{{ r.score }}</span>
            </div>
            <div v-for="r in (row.res.miss || [])" :key="'m' + r.point" class="qr-point lost">
              <span class="qrp-m">✕</span><span class="qrp-t">{{ r.point }}</span>
              <span class="qrp-s">-{{ r.score }}{{ r.required ? ' · 必答' : '' }}</span>
            </div>
          </div>
          <p v-if="row.res.requiredMiss" class="qr-warn">关键采分点没答出来 → 本题按 0 分计。</p>
          <details v-if="row.item.answer_text" class="qr-ref">
            <summary>看参考答案</summary>
            <p v-html="row.item.answer_text"></p>
          </details>
        </template>

        <div v-if="row.item.explanation" class="qr-why" v-html="'<b>讲解：</b>' + row.item.explanation"></div>
      </div>

      <p class="qr-foot">判定由本地「归一化比对 + 采分点关键词」模拟；正式版这里是服务端 + 大模型判分，简答题认为判错可以点「我认为对了」进人工复核。</p>
    </section>

    <!-- 作答提示 -->
    <p class="q-tip">{{ tipText }}</p>

    <!-- 吸底操作条 -->
    <div class="qfoot">
      <button class="btn-ghost" type="button" :disabled="curIdx <= 0" @click="go(-1)">上一题</button>
      <button class="btn-brand" type="button" @click="doSubmit">{{ graded ? '更新作答' : '提交作答' }}</button>
      <button class="btn-ghost" type="button" :disabled="curIdx >= QB.bank.length - 1" @click="go(1)">下一题</button>
    </div>

    <!-- 轻提示 -->
    <div class="q-toast" :class="{ on: !!toastMsg }">{{ toastMsg }}</div>
  </template>
</template>
