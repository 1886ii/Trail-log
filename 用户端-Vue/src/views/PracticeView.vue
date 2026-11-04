<script setup>
/* ============================================================
   每日题目（题组列表）
   ------------------------------------------------------------
   四个模板 = 选择 / 填空 / 简答 / 材料；作文不在这里，单独一条流程。
   数据全部来自 qbank.js（window.QB），与旧原型共用同一份题库与作答记录。
   ============================================================ */
import { ref, computed } from 'vue';
import { RouterLink } from 'vue-router';
import VIcon from '../components/VIcon.vue';
import { QB } from '../lib/qbank.js';
import { SUBJ_C, plain, cut } from '../lib/fmt.js';

const KIND_LABEL = { choice: '选择题', fill_blank: '填空题', short_answer: '简答题', material: '材料题' };
const KIND_CLS   = { choice: 'choice', fill_blank: 'fill', short_answer: 'short', material: 'material' };

const filter = ref('all');

const KIND_FILTERS = [
  ['all', '全部'], ['choice', '选择题'], ['fill_blank', '填空题'],
  ['short_answer', '简答题'], ['material', '材料题']
];

/* 题目列表：题组 + 状态一次算好，模板只负责画 */
const rows = computed(() => {
  return QB.bank
    .filter((b) => filter.value === 'all' || QB.kind(b) === filter.value)
    .map((b) => {
      const st = QB.state(b);
      const kind = QB.kind(b);
      const base = {
        id: b.id,
        no: QB.indexOf(b.id) + 1,
        kind,
        kindLabel: KIND_LABEL[kind],
        kindCls: KIND_CLS[kind],
        subject: b.subject,
        subjColor: SUBJ_C[b.subject] || 'var(--brand)',
        star: b.star,
        score: b.score,
        kp: b.kp,
        state: st.state,
        stateChip: st.state === 'part' ? { text: st.done + '/' + st.total, cls: 'part' }
          : st.state === 'wrong' ? { text: '有错题', cls: 'wrong' }
          : st.state === 'done' ? { text: '已完成', cls: 'done' }
          : { text: '未做', cls: 'todo' }
      };

      if (kind === 'material') {
        const mix = QB.mix(b);
        base.material = {
          title: b.material.title,
          source: b.material.source || '',
          count: b.items.length,
          inline: QB.isInline(b),
          chips: b.items.map((it, i) => ({ n: i + 1, t: QB.typeShort(it.type) })),
          mixText: ['choice', 'fill_blank', 'short_answer']
            .filter((k) => mix[k])
            .map((k) => QB.typeShort(k) + ' ' + mix[k]).join(' · ')
        };
      } else {
        base.stem = cut(plain(b.items[0].stem), 62);
      }
      return base;
    });
});

const counts = computed(() => {
  const kinds = { choice: 0, fill_blank: 0, short_answer: 0, material: 0 };
  QB.bank.forEach((b) => { kinds[QB.kind(b)]++; });
  return kinds;
});

const ov = QB.overall();

const pct = computed(() => (ov.blocks ? ov.blocksDone / ov.blocks * 100 : 0));

const subjects = computed(() => {
  const s = {};
  QB.bank.forEach((b) => { s[b.subject] = 1; });
  return Object.keys(s).length;
});

const meta = computed(() => (
  ov.blocks + ' 个题组 · ' + ov.items + ' 道小题 · 覆盖 ' + subjects.value + ' 科 · 预计 35 分钟'
));

/* 主按钮：从第一道没做的题开始 */
const next = computed(() => QB.bank.find((b) => QB.state(b).state !== 'done') || QB.bank[0]);
const startLabel = computed(() => (
  ov.blocksDone && ov.blocksDone < ov.blocks ? '继续做题' : (ov.blocksDone ? '重新过一遍' : '开始做题')
));
</script>

<template>
  <div>
    <!-- 今日题目 · 进度 -->
    <section class="hero reveal">
      <div class="hero-ring" :data-ring="pct" role="img" :aria-label="'今日题目进度 ' + Math.round(pct) + '%'">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="track" cx="60" cy="60" r="50"></circle>
          <circle class="val" cx="60" cy="60" r="50"></circle>
        </svg>
        <div class="hero-ring-txt">
          <b>{{ ov.blocksDone }}</b><span>/ {{ ov.blocks }} 组</span>
        </div>
      </div>

      <div class="hero-body">
        <p class="hero-title">今日题目 · 管理端发布</p>
        <p class="hero-meta">{{ meta }}</p>
        <div class="chips">
          <span class="chip brand">练习模式 · 即时反馈</span>
          <span class="chip">难度 中等</span>
          <span class="chip">选择 {{ counts.choice }} · 填空 {{ counts.fill_blank }} · 简答 {{ counts.short_answer }} · 材料 {{ counts.material }}</span>
          <span v-if="ov.itemsDone" class="chip ok">已作答 {{ ov.itemsDone }}/{{ ov.items }} 小题</span>
          <span v-else class="chip">还没开始</span>
        </div>
        <div style="margin-top:14px">
          <RouterLink class="btn-brand" :to="{ name: 'answer', query: { id: next.id } }">{{ startLabel }}</RouterLink>
        </div>
      </div>
    </section>

    <!-- 四大题型：模板说明 + 筛选 -->
    <section class="section reveal">
      <h2 class="section-title">题型 <span class="count">· 九科所有题目都由这 4 个模板拼出来</span></h2>

      <div class="qt-legend">
        <button class="qt-card" type="button" @click="filter = 'choice'">
          <span class="qtype qtype-choice">选择题</span>
          <span class="qt-desc">题干 + 选项，点一下作答。含多选与判断。</span>
          <span class="qt-num">{{ counts.choice }}</span>
        </button>
        <button class="qt-card" type="button" @click="filter = 'fill_blank'">
          <span class="qtype qtype-fill">填空题</span>
          <span class="qt-desc">在句子里挖空，答完按数值／同义／逐字比对。</span>
          <span class="qt-num">{{ counts.fill_blank }}</span>
        </button>
        <button class="qt-card" type="button" @click="filter = 'short_answer'">
          <span class="qtype qtype-short">简答题</span>
          <span class="qt-desc">写一段话，按采分点逐条判，告诉你缺哪一点。</span>
          <span class="qt-num">{{ counts.short_answer }}</span>
        </button>
        <button class="qt-card" type="button" @click="filter = 'material'">
          <span class="qtype qtype-material">材料题</span>
          <span class="qt-desc">一段材料 + 若干子题。语文、英语阅读与完形都是它。</span>
          <span class="qt-num">{{ counts.material }}</span>
        </button>
      </div>

      <div class="flt-row" style="margin-top:14px">
        <button v-for="f in KIND_FILTERS" :key="f[0]" class="flt" :class="{ on: filter === f[0] }"
                type="button" @click="filter = f[0]">{{ f[1] }}</button>
      </div>
    </section>

    <!-- 题目列表 -->
    <section class="section reveal">
      <h2 class="section-title">题目列表 <span class="count">· 共 {{ rows.length }} 个题组 · 点任意一题进入作答</span></h2>

      <div class="q-list">
        <template v-for="r in rows" :key="r.id">
          <!-- 普通题（选择 / 填空 / 简答：一段题干） -->
          <RouterLink v-if="r.kind !== 'material'" class="q-row" :class="{ 'is-done': r.state === 'done' }"
                      :to="{ name: 'answer', query: { id: r.id } }">
            <span class="q-no">{{ r.no }}</span>
            <div class="q-main">
              <div class="q-tags">
                <span class="qtype" :class="'qtype-' + r.kindCls">{{ r.kindLabel }}</span>
                <span class="chip q-subj"><i class="dot" :style="{ background: r.subjColor }"></i>{{ r.subject }}</span>
                <span class="q-star" :title="'难度 ' + r.star + ' 星'">
                  <template v-for="i in 3" :key="i"><i v-if="i > r.star">★</i><template v-else>★</template></template>
                </span>
                <span class="q-pt">{{ r.score }} 分</span>
              </div>
              <p class="q-stem">{{ r.stem }}</p>
              <p class="q-meta">{{ r.kp }}</p>
            </div>
            <span class="q-state" :class="r.stateChip.cls">{{ r.stateChip.text }}</span>
          </RouterLink>

          <!-- 材料题：一块材料 + 若干子题 -->
          <RouterLink v-else class="q-group" :class="{ 'is-done': r.state === 'done' }"
                      :to="{ name: 'answer', query: { id: r.id } }">
            <div class="qg-head">
              <span class="q-no">{{ r.no }}</span>
              <div class="q-tags">
                <span class="qtype qtype-material">材料题</span>
                <span class="chip q-subj"><i class="dot" :style="{ background: r.subjColor }"></i>{{ r.subject }}</span>
                <span class="q-star" :title="'难度 ' + r.star + ' 星'">
                  <template v-for="i in 3" :key="i"><i v-if="i > r.star">★</i><template v-else>★</template></template>
                </span>
                <span class="q-pt">{{ r.score }} 分</span>
                <span v-if="r.material.inline" class="chip warn">材料里插空 · 完形</span>
              </div>
              <span class="q-state" :class="r.stateChip.cls">{{ r.stateChip.text }}</span>
            </div>
            <p class="qg-title">{{ r.material.title }}</p>
            <p class="q-meta">{{ r.material.source }} · {{ r.material.count }} 道小题</p>
            <div class="qg-items">
              <span v-for="c in r.material.chips" :key="c.n" class="qgi"><b>{{ c.n }}</b>{{ c.t }}</span>
              <span class="qg-mix">{{ r.material.mixText }}</span>
            </div>
          </RouterLink>
        </template>
      </div>

      <p v-if="!rows.length" class="q-empty">这个题型今天没有安排题目。</p>
    </section>

    <!-- 作文不在题目区 -->
    <section class="section reveal">
      <h2 class="section-title">写作题 <span class="count">· 单独一类，不混在题目里</span></h2>
      <RouterLink class="q-note" :to="{ name: 'essay' }">
        <span class="qn-ico"><VIcon name="doc" /></span>
        <span class="qn-txt">
          <b>作文（含英语书面表达）在「作文」入口</b>
          <span>判分维度完全不同 —— 不打对错、不给「采分点分」，而是内容 / 结构 / 语言三档点评，所以它不占题目列表，单独一条流程。</span>
        </span>
        <span class="qn-go">去作文 ›</span>
      </RouterLink>
    </section>
  </div>
</template>
