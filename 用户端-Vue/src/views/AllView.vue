<script setup>
/* ============================================================
   全科
   ------------------------------------------------------------
   九门科目掌握度 + 四类练习引擎说明。
   首期只开放三主科，其余按钮点了给一句「排在 P5」的提示。
   ============================================================ */
import { RouterLink } from 'vue-router';

const SUBJECTS = [
  { name: '数学', open: true, to: 'practice', pct: 88, lv: 'lv-3', meta: '掌握度 88% · 上次正确率 80%' },
  { name: '英语', open: true, to: 'words', pct: 76, lv: 'lv-2', meta: '掌握度 76% · 单词已连背 7 天' },
  { name: '语文', open: true, to: 'essay', pct: 71, lv: 'lv-2', meta: '掌握度 71% · 阅读 + 写作进行中' },
  { name: '物理', pct: 0, meta: 'P5 阶段接入 · 计算推演引擎' },
  { name: '化学', pct: 0, meta: 'P5 阶段接入 · 计算推演引擎' },
  { name: '生物', pct: 0, meta: 'P5 阶段接入 · 记忆理解引擎' },
  { name: '历史', pct: 0, meta: 'P5 阶段接入 · 记忆理解引擎' },
  { name: '道法', pct: 0, meta: 'P5 阶段接入 · 记忆理解引擎', full: '道德与法治' },
  { name: '地理', pct: 0, meta: 'P5 阶段接入 · 记忆理解引擎' }
];

const ENGINES = [
  { name: '计算推演型', tags: '数 · 物 · 化', meta: '核心动作是「练」：出题 → 作答 → 批改 → 讲解 → 错题重练' },
  { name: '语言记忆型', tags: '英语', meta: '核心动作是「背」：背诵 → 检查 → 扩展，间隔排程复习' },
  { name: '阅读写作型', tags: '语文 · 英语写作', meta: '核心动作是「写」：命题引导 → 写作 → 结构点评与升格' },
  { name: '记忆理解型', tags: '生 · 史 · 道法 · 地', meta: '核心动作是「记」：知识点拆条 → 每日记忆卡 → 检查' }
];

function soon(name) {
  alert('「' + (name || '') + '」还没开放 —— 排在 P5 阶段，先把三主科的闭环跑通。');
}
</script>

<template>
  <div>
    <!-- 科目总览 -->
    <section class="section reveal" style="margin-top:18px">
      <h2 class="section-title">九门科目 <span class="count">· 首期开放三主科，其余陆续接入</span></h2>

      <div class="subj-grid">
        <template v-for="s in SUBJECTS" :key="s.name">
          <RouterLink v-if="s.open" class="subj" :to="{ name: s.to }">
            <div class="subj-head">
              <span class="subj-name">{{ s.name }}</span>
              <span class="chip brand">已开放</span>
            </div>
            <div class="bar-track"><i :class="s.lv" :style="{ '--w': s.pct + '%' }"></i></div>
            <p class="subj-meta">{{ s.meta }}</p>
          </RouterLink>

          <button v-else class="subj soon" type="button" @click="soon(s.full || s.name)">
            <div class="subj-head">
              <span class="subj-name">{{ s.name }}</span>
              <span class="chip">规划中</span>
            </div>
            <div class="bar-track"><i style="--w:0%"></i></div>
            <p class="subj-meta">{{ s.meta }}</p>
          </button>
        </template>
      </div>
    </section>

    <!-- 引擎说明 -->
    <section class="section reveal">
      <h2 class="section-title">四类引擎 <span class="count">· 九门科目共用四套练习引擎</span></h2>
      <div class="panel">
        <div v-for="e in ENGINES" :key="e.name" class="row">
          <div class="row-main">
            <p class="row-title">{{ e.name }} <span class="chip" style="margin-left:6px">{{ e.tags }}</span></p>
            <p class="row-meta">{{ e.meta }}</p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
