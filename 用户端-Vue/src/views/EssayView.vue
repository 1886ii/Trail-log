<script setup>
/* ============================================================
   作文
   ------------------------------------------------------------
   上半：管理端发布的作文任务（四步流程条 + 状态标签）
   下半：优秀作文墙（分类筛选 + 阅读全文底部弹框）
   ============================================================ */
import { ref, computed, onBeforeUnmount, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { ESSAY_TASKS, STEP_NAMES, WORKS, WORK_CATS, lenText, paraHTML } from '../lib/essays.js';

const tasks = ESSAY_TASKS;
const cat = ref('all');
const cats = WORK_CATS;

const list = computed(() => (
  cat.value === 'all' ? WORKS : WORKS.filter((w) => w.cat === cat.value)
));

function stateChip(t) {
  if (t.state === 'todo') return { cls: 'warn', text: '待写作' };
  if (t.state === 'audit') return { cls: 'brand', text: 'AI 已评 ' + t.score + ' · 待审核' };
  return { cls: 'ok', text: '已通过审核 ' + t.score + ' 分' };
}

function actionOf(t) {
  if (t.state === 'todo') return { text: '去写作', ghost: false };
  return { text: '查看' + (t.state === 'audit' ? '评语' : '结果'), ghost: true };
}

/* ---------- 阅读全文弹框 ---------- */
const cur = ref(null);
let fromEl = null;

function openRead(w, e) {
  fromEl = e && e.currentTarget ? e.currentTarget : null;
  cur.value = w;
  document.body.classList.add('no-scroll');
}
function closeRead() {
  cur.value = null;
  document.body.classList.remove('no-scroll');
  if (fromEl && fromEl.focus) fromEl.focus();
}
function onKey(e) { if (e.key === 'Escape') closeRead(); }

watch(cur, (v) => {
  if (v) document.addEventListener('keydown', onKey);
  else document.removeEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKey);
  document.body.classList.remove('no-scroll');
});
</script>

<template>
  <div>
    <!-- 作文任务 -->
    <section class="section reveal" style="margin-top:16px">
      <h2 class="section-title">作文任务 <span class="count">· 管理端发布</span></h2>
      <div class="essay-tasks">
        <article v-for="t in tasks" :key="t.id" class="task-card">
          <div class="task-top">
            <span class="task-title">{{ t.title }}</span>
            <span class="chip" :class="stateChip(t).cls">{{ stateChip(t).text }}</span>
            <span class="chip brand">管理端发布</span>
          </div>
          <p class="task-meta">{{ t.subject }} · {{ t.genre }} · {{ t.meta }}</p>
          <p class="task-meta" style="margin-top:3px">{{ t.due }}</p>

          <div class="steps-mini">
            <template v-for="(n, i) in STEP_NAMES" :key="n">
              <span class="st" :class="i + 1 < t.step ? 'done' : (i + 1 === t.step ? 'cur' : '')">{{ i + 1 < t.step ? '✓ ' : '' }}{{ n }}</span>
              <span v-if="i < STEP_NAMES.length - 1" class="sep">›</span>
            </template>
          </div>

          <div class="task-foot">
            <RouterLink class="todo-action" :class="{ ghost: actionOf(t).ghost }"
                        :to="{ name: 'essayWrite', query: { id: t.id } }">{{ actionOf(t).text }}</RouterLink>
          </div>
        </article>
      </div>
    </section>

    <!-- 优秀作文 -->
    <section class="section reveal">
      <h2 class="section-title">优秀作文 <span class="count">· 通过审核的佳作与范文</span></h2>

      <div class="flt-row">
        <button v-for="c in cats" :key="c" class="flt" :class="{ on: cat === c }"
                type="button" @click="cat = c">{{ c === 'all' ? '全部' : c }}</button>
      </div>

      <div class="essay-grid">
        <article v-for="w in list" :key="w.id" class="essay-card">
          <div class="ec-top">
            <span class="ec-title">{{ w.title }}</span>
            <span class="chip">{{ w.cat }}</span>
            <span class="ec-score">{{ w.score }} 分</span>
          </div>
          <p class="ec-by">{{ w.by }} · {{ w.time }}</p>
          <p class="ec-excerpt">{{ w.excerpt }}</p>
          <div class="ec-note"><b>点评：</b>{{ w.note }}</div>
          <div class="ec-foot">
            <button class="btn-ghost" type="button" @click="openRead(w, $event)">阅读全文</button>
            <span class="ec-len">全文 {{ lenText(w) }}</span>
          </div>
        </article>
        <p v-if="!list.length" class="row-meta">这个分类下还没有收录的佳作。</p>
      </div>
    </section>

    <!-- 阅读全文：底部上滑弹框 -->
    <Teleport to="body">
      <div v-if="cur" class="sheet-mask is-read" @click.self="closeRead">
        <div class="sheet sheet-read" role="dialog" aria-modal="true" aria-label="佳作全文">
          <div class="rd-head">
            <span class="rd-bar"></span>
            <div class="rd-titles">
              <span class="rd-title">{{ cur.title }}</span>
              <span class="chip">{{ cur.cat }}</span>
              <span class="ec-score">{{ cur.score }} 分</span>
            </div>
            <p class="rd-meta">{{ cur.by }} · {{ cur.time }} · 管理端推荐</p>
            <button class="rd-close" type="button" aria-label="关闭" @click="closeRead">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
                   stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>

          <div class="rd-body" :data-lang="cur.lang === 'en' ? 'en' : null">
            <p v-for="(p, i) in cur.full" :key="i" class="rd-p" v-html="paraHTML(p)"></p>
            <div class="ec-note rd-note"><b>点评：</b>{{ cur.note }}</div>
          </div>

          <div class="rd-foot">
            <span class="rd-count">全文 {{ lenText(cur) }}</span>
            <span class="spacer"></span>
            <button class="rd-done" type="button" @click="closeRead">收起</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
