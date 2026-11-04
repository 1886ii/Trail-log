<script setup>
/* ============================================================
   我的错题（独立模块首页）
   ------------------------------------------------------------
   这一页只做「看 + 挑」：概览 → 今日待复习 → 分布 → 清单。
   真正做题在错题复习会话（mistake-review），不复用每日题目流程。
   ============================================================ */
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import VIcon from '../components/VIcon.vue';
import { QB } from '../lib/qbank.js';
import { SUBJ_C, LETTER, plain, cut, ago, fmtDate, answerText, rightAnswerText } from '../lib/fmt.js';

const route = useRoute();

/* 数据变更计数：QB 是同步的 localStorage 封装，改完 bump 一下让 computed 重算 */
const bump = ref(0);
const touch = () => { bump.value++; };

const fSubj = ref('all');
const fState = ref('all');
const opened = ref({});

/* ---------- 读库 ---------- */
const all = computed(() => {
  bump.value;
  return (QB.mistakeList() || []).map((r) => ({ ...r, due: QB.mistakeDue(r.e) }));
});

const stats = computed(() => { bump.value; return QB.mistakeStats(); });
const queue = computed(() => { bump.value; return QB.mistakeQueue({ limit: 12 }); });

const pct = computed(() => (stats.value.total ? Math.round(stats.value.fixed / stats.value.total * 100) : 0));
const hardest = computed(() => all.value.filter((r) => (r.e.wrong || 0) >= 3).length);

/* ---------- 排序：待订正在前（到期的更前）→ 错得多的 → 最近错的 ---------- */
function sortList(list) {
  return list.slice().sort((a, b) => {
    const af = a.e.fixed ? 1 : 0;
    const bf = b.e.fixed ? 1 : 0;
    if (af !== bf) return af - bf;
    if (!af && (a.due.due !== b.due.due)) return a.due.due ? -1 : 1;
    if ((b.e.wrong || 0) !== (a.e.wrong || 0)) return (b.e.wrong || 0) - (a.e.wrong || 0);
    return (b.e.lastAt || 0) - (a.e.lastAt || 0);
  });
}

const picked = computed(() => sortList(all.value.filter((r) => {
  if (fSubj.value !== 'all' && r.block.subject !== fSubj.value) return false;
  if (fState.value === 'pending' && r.e.fixed) return false;
  if (fState.value === 'fixed' && !r.e.fixed) return false;
  return true;
})));

const anyFilter = computed(() => fSubj.value !== 'all' || fState.value !== 'all');

/* ---------- 今日待复习 ---------- */
const dueList = computed(() => queue.value.list.slice(0, 4));

const dueEmptyText = computed(() => {
  if (all.value.length) {
    return '目前没有到复习时间的错题。' + queue.value.pendingN + ' 道待订正可以提前过一遍 —— 提前做对同样算订正。';
  }
  return '错题本还是空的。做题时答错的题会自动收进来，收进来之后这里按 1 / 2 / 4 / 7 / 15 / 30 天的节奏提醒你。';
});

/* ---------- 主按钮 ---------- */
const startBtn = computed(() => {
  const q = queue.value;
  const s = stats.value;
  if (q.dueN) return { label: '开始今日复习（' + q.dueN + ' 道）', scope: 'today' };
  if (s.pending) return { label: '提前复习（' + s.pending + ' 道待订正）', scope: 'all' };
  if (s.total) return { label: '都订正完了 · 过一遍终检', scope: 'fixed' };
  return { label: '还没有错题可复习', scope: null };
});

/* ---------- 四个数 ---------- */
const quad = computed(() => {
  const s = stats.value;
  const q = queue.value;
  return [
    { n: s.total,   t: '错题总数', c: '' },
    { n: s.pending, t: '待订正',   c: 'warn' },
    { n: q.dueN,    t: '今日到期', c: 'brand' },
    { n: s.fixed,   t: '已订正',   c: 'ok' }
  ];
});

/* ---------- 错在哪 ---------- */
const bySubj = computed(() => {
  const m = {};
  all.value.forEach((r) => { m[r.block.subject] = (m[r.block.subject] || 0) + 1; });
  return m;
});
const byKp = computed(() => {
  const m = {};
  all.value.forEach((r) => { const k = r.block.kp || '未标注'; m[k] = (m[k] || 0) + 1; });
  return m;
});
const subjRank = computed(() => Object.keys(bySubj.value).sort((a, b) => bySubj.value[b] - bySubj.value[a]));
const kpRank = computed(() => Object.keys(byKp.value).sort((a, b) => byKp.value[b] - byKp.value[a]).slice(0, 5));
const subjMax = computed(() => (subjRank.value.length ? bySubj.value[subjRank.value[0]] : 1));

/* ---------- 筛选条 ---------- */
const stateOpts = computed(() => {
  const s = stats.value;
  return [['all', '全部', s.total], ['pending', '待订正', s.pending], ['fixed', '已订正', s.fixed]];
});
const subjOpts = computed(() => {
  const s = stats.value;
  return Object.keys(s.subjects || {}).sort((a, b) => s.subjects[b] - s.subjects[a]);
});

/* ---------- 卡片上的小工具 ---------- */
const typeLabel = (t) => ({ choice: '选择题', fill_blank: '填空题', short_answer: '简答题', material: '材料题' }[t] || '题目');
const typeCls = (t) => (t === 'fill_blank' ? 'fill' : (t === 'short_answer' ? 'short' : t));

function myAnswerText(item, ans) {
  const t = answerText(item, ans);
  return t || '未作答';
}

function dueChip(r) {
  const d = r.due || QB.mistakeDue(r.e);
  if (r.e.fixed) return { cls: 'ok', text: '已订正 · ' + d.gap + ' 天后终检' };
  if (d.due) return { cls: 'due', text: '今天该复习' };
  return { cls: 'wait', text: (d.days <= 0 ? '今天稍后' : d.days + ' 天后复习') };
}

function schedText(r) {
  const d = r.due || QB.mistakeDue(r.e);
  const base = r.e.fixed
    ? '已订正 · 下次终检 ' + fmtDate(d.at) + '（' + d.gap + ' 天后）'
    : (d.due
        ? '已到期 · 今天复习一次，答对就销号'
        : '下次复习 ' + fmtDate(d.at) + '（' + Math.max(0, d.days) + ' 天后）');
  return base + ' · 错过 ' + (r.e.wrong || 1) + ' 次，间隔 ' + d.gap + ' 天';
}

/* ---------- 操作 ---------- */
function toggleFix(id) {
  const cur = QB.mistakeOf(id);
  QB.mistakeFix(id, !(cur && cur.fixed));
  touch();
}
function removeOne(id) {
  QB.mistakeRemove(id);
  delete opened.value[id];
  touch();
}
function toggleOpen(id) {
  opened.value = { ...opened.value, [id]: !opened.value[id] };
}
function clearFilter() {
  fSubj.value = 'all';
  fState.value = 'all';
}

/* ---------- 环形进度：交给 FX，和旧版同一套动画 ---------- */
const ringEl = ref(null);
function paintRing() {
  if (ringEl.value && window.FX && window.FX.ring) window.FX.ring(ringEl.value, pct.value);
}
watch(pct, () => nextTick(paintRing));

onMounted(() => {
  /* ?demo：塞几道演示错题（时间往前推 → 立刻能看到「到期」）。
     两种写法都认：?demo=1#/mistakes（search）与 #/mistakes?demo（hash query） */
  const inSearch = (() => {
    try { return new URLSearchParams(window.location.search).has('demo'); } catch (e) { return false; }
  })();
  if (route.query.demo !== undefined || inSearch) { QB.mistakeSeedDemo(); touch(); }
  nextTick(paintRing);
});
</script>

<template>
  <!-- 错题本总览 -->
  <section class="mk-hero reveal">
    <div class="mk-hero-main">
      <div class="hero-ring" ref="ringEl" :data-ring="pct" role="img" :aria-label="'错题订正进度 ' + pct + '%'">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="track" cx="60" cy="60" r="50"></circle>
          <circle class="val" cx="60" cy="60" r="50"></circle>
        </svg>
        <div class="hero-ring-txt">
          <b>{{ stats.fixed }}</b><span>/ {{ stats.total }} 道</span>
        </div>
      </div>

      <div class="mk-hero-txt">
        <p class="mk-hero-k">错题本 · 独立模块</p>
        <h1 class="mk-hero-h">待订正 <b>{{ stats.pending }}</b> 道</h1>
        <p class="mk-hero-meta">
          {{ stats.total
            ? '共 ' + stats.total + ' 道错题 · 覆盖 ' + Object.keys(stats.subjects || {}).length + ' 科 · 今日到期 ' + queue.dueN + ' 道'
            : '还没有错题 —— 做题时答错会自动收进来' }}
        </p>
        <div class="chips">
          <span v-if="queue.dueN" class="chip warn">今日到期 {{ queue.dueN }} 道</span>
          <span v-if="stats.pending && !queue.dueN" class="chip brand">有待订正 · 还没到复习时间</span>
          <span v-if="!stats.pending && stats.total" class="chip ok">全部订正完</span>
          <span v-if="hardest" class="chip">反复错 {{ hardest }} 道</span>
          <span v-if="stats.week" class="chip brand">本周新增 {{ stats.week }} 道</span>
        </div>
      </div>
    </div>

    <div class="mk-hero-act">
      <RouterLink v-if="startBtn.scope" class="btn-brand"
                  :to="{ name: 'mistake-review', query: { scope: startBtn.scope } }">
        {{ startBtn.label }}
      </RouterLink>
      <button v-else class="btn-brand" type="button" disabled>{{ startBtn.label }}</button>

      <RouterLink v-if="stats.pending > 0" class="btn-ghost"
                  :to="{ name: 'mistake-review', query: { scope: 'all' } }">
        全部待订正（{{ stats.pending }}）
      </RouterLink>
    </div>

    <p class="mk-hero-note">
      错题只从这里复习：答错自动收进来，重做答对就算订正。每日题目里只练新题，两边不混着算进度。
    </p>
  </section>

  <!-- 今日待复习 -->
  <section class="section reveal">
    <h2 class="section-title">今日待复习
      <span class="count">· {{ queue.dueN ? queue.dueN + ' 道到期' : '今天没有到期' }} · 共 {{ all.length }} 道错题</span>
    </h2>

    <div class="mk-due">
      <RouterLink v-for="r in dueList" :key="r.e.itemId"
                  class="mk-due-card" :class="{ 'is-fixed': r.e.fixed }"
                  :to="{ name: 'mistake-review', query: { ids: r.e.itemId } }">
        <span class="mk-due-top">
          <i class="dot" :style="{ background: SUBJ_C[r.block.subject] || 'var(--brand)' }"></i>
          <span class="mk-due-subj">{{ r.block.subject }}</span>
          <span v-if="r.e.fixed" class="mk-due-tag ok">终检</span>
          <span v-else class="mk-due-tag">第 {{ r.due.stage }} 次</span>
        </span>
        <span class="mk-due-q">{{ cut(plain(r.item.stem), 46) }}</span>
        <span class="mk-due-foot">
          <span class="mk-due-wrong">错 {{ r.e.wrong || 1 }} 次</span>
          <span class="mk-due-go">复习 ›</span>
        </span>
      </RouterLink>

      <RouterLink v-if="dueList.length" class="mk-due-more"
                  :to="{ name: 'mistake-review', query: { scope: 'today' } }">
        <span class="mk-due-more-n">{{ queue.dueN }}</span>
        <span class="mk-due-more-t">道到期<br>一次做完 ›</span>
      </RouterLink>
    </div>

    <p class="mk-due-empty" v-if="!dueList.length">
      {{ dueEmptyText }}
      <RouterLink v-if="all.length" :to="{ name: 'mistake-review', query: { scope: 'all' } }">提前复习 ›</RouterLink>
    </p>
  </section>

  <!-- 四个数 -->
  <section class="section reveal">
    <div class="mk-quad">
      <div v-for="r in quad" :key="r.t" class="mk-stat" :class="r.c">
        <b>{{ r.n }}</b><span>{{ r.t }}</span>
      </div>
    </div>
  </section>

  <!-- 错在哪 -->
  <section class="section reveal">
    <h2 class="section-title">错在哪 <span class="count">· 科目分布与高频错点</span></h2>
    <div class="mk-dist">
      <div class="mk-dist-col">
        <p class="mk-dist-h">按科目</p>
        <div class="mk-bars">
          <div v-for="k in subjRank" :key="k" class="mk-bar">
            <span class="mk-bar-k">{{ k }}</span>
            <i class="mk-bar-t">
              <b :style="{ width: Math.round(bySubj[k] / subjMax * 100) + '%', background: SUBJ_C[k] || 'var(--brand)' }"></b>
            </i>
            <em class="mk-bar-n">{{ bySubj[k] }}</em>
          </div>
          <p v-if="!subjRank.length" class="mk-dist-none">还没有数据。</p>
        </div>
      </div>

      <div class="mk-dist-col">
        <p class="mk-dist-h">最容易错的点</p>
        <ul class="mk-kps">
          <li v-for="(k, i) in kpRank" :key="k" class="mk-kp">
            <span class="mk-kp-no">{{ i + 1 }}</span>
            <span class="mk-kp-n">{{ k }}</span>
            <span class="mk-kp-c">{{ byKp[k] }} 道</span>
          </li>
          <li v-if="!kpRank.length" class="mk-dist-none">还没有数据。</li>
        </ul>
      </div>
    </div>
  </section>

  <!-- 错题清单 -->
  <section class="section reveal">
    <h2 class="section-title">错题清单
      <span class="count">· {{ picked.length }} 道{{ anyFilter ? '（筛选自 ' + all.length + ' 道）' : '' }} · 点卡片展开解析</span>
    </h2>

    <div class="flt-row">
      <button v-for="o in stateOpts" :key="o[0]" type="button" class="flt" :class="{ on: fState === o[0] }"
              @click="fState = o[0]">{{ o[1] }} <b>{{ o[2] }}</b></button>
    </div>

    <div class="flt-row">
      <button v-if="subjOpts.length > 1" type="button" class="flt" :class="{ on: fSubj === 'all' }"
              @click="fSubj = 'all'">全部科目</button>
      <button v-for="k in subjOpts" :key="k" type="button" class="flt" :class="{ on: fSubj === k }"
              @click="fSubj = k">{{ k }} <b>{{ stats.subjects[k] }}</b></button>
    </div>

    <div class="mk-list">
      <article v-for="r in picked" :key="r.e.itemId" class="mkc" :class="{ 'is-fixed': r.e.fixed }">
        <header class="mkc-head" @click="toggleOpen(r.e.itemId)">
          <div class="mkc-line1">
            <span class="mk-dot" :class="r.e.fixed ? 'ok' : (r.due.due ? 'due' : '')"></span>
            <span class="qtype" :class="'qtype-' + typeCls(r.item.type)">{{ typeLabel(r.item.type) }}</span>
            <span class="chip q-subj">
              <i class="dot" :style="{ background: SUBJ_C[r.block.subject] || 'var(--brand)' }"></i>{{ r.block.subject }}
            </span>
            <span class="q-star">
              <template v-for="i in 3" :key="i">
                <template v-if="i <= (r.block.star || 0)">★</template>
                <i v-else>★</i>
              </template>
            </span>
            <span v-if="r.e.wrong >= 3" class="mkc-hot">反复错</span>
          </div>

          <p class="mkc-stem">{{ cut(plain(r.item.stem), 110) }}</p>

          <p class="mkc-cmp">
            <span class="mkc-cmp-k">上次</span>
            <span class="mkc-cmp-v bad">{{ myAnswerText(r.item, r.attempt ? r.attempt.ans : null) }}</span>
            <span class="mkc-cmp-ar">→</span>
            <span class="mkc-cmp-v good">{{ rightAnswerText(r.item) }}</span>
          </p>

          <div class="mkc-foot">
            <span class="mkc-kp">{{ r.block.kp }}</span>
            <span class="mkc-times">{{ r.e.wrong ? '错 ' + r.e.wrong + ' 次' : '手动收藏' }}</span>
            <span class="mkc-tag" :class="dueChip(r).cls">{{ dueChip(r).text }}</span>
            <span class="mkc-ago">{{ ago(r.e.lastAt) }}</span>
            <span class="mkc-fold">{{ opened[r.e.itemId] ? '收起 ▴' : '展开解析 ▾' }}</span>
          </div>
        </header>

        <div class="mkc-body" v-show="opened[r.e.itemId]">
          <p class="mk-ans">我的答案：<b class="bad">{{ myAnswerText(r.item, r.attempt ? r.attempt.ans : null) }}</b></p>
          <p class="mk-ans">正确答案：<b class="good">{{ rightAnswerText(r.item) }}</b></p>
          <div v-if="r.item.explanation" class="mk-why"><b>讲解：</b><span v-html="r.item.explanation"></span></div>

          <p class="mkc-sched">
            <span class="mkc-sched-k">复习节奏</span>{{ schedText(r) }}
          </p>

          <div class="mkc-acts">
            <RouterLink class="btn-brand sm"
                        :to="{ name: 'mistake-review', query: { ids: r.e.itemId } }">复习这道</RouterLink>
            <button class="btn-ghost" :class="{ done: r.e.fixed }" type="button" @click.stop="toggleFix(r.e.itemId)">
              {{ r.e.fixed ? '✓ 已订正 · 撤销' : '标记已订正' }}
            </button>
            <button class="btn-ghost" type="button" @click.stop="removeOne(r.e.itemId)">移出错题本</button>
          </div>
        </div>
      </article>
    </div>

    <!-- 空态 -->
    <div class="mk-empty" v-if="!picked.length">
      <p class="mk-empty-ico">＋</p>
      <template v-if="all.length && anyFilter">
        <p class="mk-empty-h">这个筛选下没有错题</p>
        <p class="mk-empty-p">换个条件看看，或者直接看全部。</p>
      </template>
      <template v-else-if="all.length">
        <p class="mk-empty-h">没有可显示的错题</p>
        <p class="mk-empty-p"></p>
      </template>
      <template v-else>
        <p class="mk-empty-h">错题本还是空的</p>
        <p class="mk-empty-p">做题时答错的题会自动收进来，也可以在题面上手动点「加入错题本」。</p>
      </template>

      <div class="mk-empty-act">
        <button v-if="all.length && anyFilter" class="btn-ghost" type="button" @click="clearFilter">看全部错题</button>
        <RouterLink v-if="!all.length" class="btn-brand" :to="{ name: 'daily' }">去每日题目做题</RouterLink>
      </div>
    </div>
  </section>

  <!-- 说明 -->
  <section class="section reveal">
    <div class="q-note">
      <span class="qn-ico">
        <VIcon name="mistake" />
      </span>
      <span class="qn-txt">
        <b>错题是怎么进来、又怎么出去的？</b>
        <span>提交作答时答错会自动收进来，也可以在题面上点「加入错题本」手动收。
              重做一次答对，就自动标成已订正 —— 不靠手动清，靠真会了。
              每道题按「错过几次」排在 1 / 2 / 4 / 7 / 15 / 30 天后复习，答错一次就退回最短间隔。</span>
      </span>
      <RouterLink class="qn-go" :to="{ name: 'mistake-review' }">去复习 ›</RouterLink>
    </div>
  </section>
</template>
