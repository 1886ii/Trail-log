<script setup>
/* ============================================================
   每日任务
   ------------------------------------------------------------
   六件事：题目 / 单词 / 阅读 / 作文 / 计算 / 错题复习。
   勾选只影响今天的进度环与页头文案（原型期不落盘，正式版随
   POST /api/tasks/{id}/check 回写），旧原型也是这个行为。
   ============================================================ */
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { RouterLink } from 'vue-router';
import VIcon from '../components/VIcon.vue';
import { FX } from '../lib/fx.js';
import { todayText, setPageSub } from '../lib/nav.js';

/* 六件事的固定配置（正式版由管理端发布的任务下发） */
const TASKS = [
  { id: 'q',    title: '每日题目',   meta: '数学 · 一元二次方程 · 10 题 · 约 25 分钟',
    to: 'practice',        act: '开始',     ghost: false, done: false },
  { id: 'w',    title: '每日必备单词', meta: '新词 12 个 · 复习 28 个 · 正确率 89%',
    to: 'words',           act: '看看',     ghost: true,  done: true  },
  { id: 'r',    title: '每日阅读任务', meta: '《骆驼祥子》第 3 章 · 约 20 分钟',
    to: 'reading',         act: '继续',     ghost: false, done: false },
  { id: 'e',    title: '作文',        meta: '英语 · My Weekend · 不少于 80 词 · 有引导和批改',
    to: 'essay',           act: '去写',     ghost: false, done: false, tag: '周五前交' },
  { id: 'c',    title: '每日计算',    meta: '数学 · 有理数混合运算 · 10 题 · 纸上完成后拍照上传，AI 评阅',
    to: 'calc',            act: '上传批改', ghost: false, done: false, tag: '拍照批改' },
  { id: 'm',    title: '错题复习',    meta: '错题本 · 3 道到了复习节点 · 约 10 分钟 · 单独的复习流程',
    to: 'mistake-review',  act: '去复习',   ghost: true,  done: false, tag: '到复习时间' }
];

const doneMap = ref(
  TASKS.reduce((m, t) => { m[t.id] = t.done; return m; }, {})
);

const total = TASKS.length;
const doneN = computed(() => TASKS.filter((t) => doneMap.value[t.id]).length);
const pct = computed(() => Math.round((total ? doneN.value / total : 0) * 100));
const label = computed(() => (
  doneN.value === total ? '今天全部完成，漂亮' : '今天 ' + total + ' 件事 · 已完成 ' + doneN.value + ' 件'
));

const ringEl = ref(null);

function toggle(t, e) {
  const nowDone = !doneMap.value[t.id];
  doneMap.value[t.id] = nowDone;

  if (nowDone && FX && FX.burstFrom) FX.burstFrom(e.currentTarget, 11);
  if (FX && FX.ring) FX.ring(ringEl.value, pct.value);
}

/* 页头副标题跟着进度走（旧原型 refreshProgress 里的 .js-sub） */
function syncSub() {
  const left = total - doneN.value;
  setPageSub('daily', todayText() + (left === 0 ? ' · 今日任务已清空' : ' · 今天还有 ' + left + ' 件事'));
}

onMounted(() => { syncSub(); });
watch(doneN, () => nextTick(syncSub));
</script>

<template>
  <div>
    <!-- 今日进度 -->
    <section class="hero reveal">
      <div class="hero-ring" ref="ringEl" :data-ring="pct" role="img" :aria-label="'今日完成度 ' + pct + '%'">
        <svg viewBox="0 0 120 120" aria-hidden="true">
          <circle class="track" cx="60" cy="60" r="50"></circle>
          <circle class="val" cx="60" cy="60" r="50"></circle>
        </svg>
        <div class="hero-ring-txt">
          <b>{{ doneN }}</b>
          <span>/ {{ total }} 件</span>
        </div>
      </div>

      <div class="hero-body">
        <p class="hero-title">{{ label }}</p>
        <p class="hero-meta">任务由管理端每天发布 · 今日已学 25 分钟 · 连续打卡 7 天</p>
        <div class="chips">
          <span class="chip brand">数学</span>
          <span class="chip">英语</span>
          <span class="chip">阅读</span>
          <span class="chip">作文</span>
          <span class="chip">计算</span>
        </div>
      </div>
    </section>

    <!-- todolist：管理端发布的五类任务 + 错题复习 -->
    <section class="section reveal">
      <h2 class="section-title">今日任务 <span class="count">· 管理端发布 · 按顺序做完就算今天过关</span></h2>

      <ul class="todo-list">
        <li v-for="t in TASKS" :key="t.id" class="todo" :class="{ done: doneMap[t.id] }">
          <button class="todo-check" type="button"
                  :aria-pressed="doneMap[t.id] ? 'true' : 'false'"
                  :aria-label="'标记' + t.title + (doneMap[t.id] ? '为未完成' : '为完成')"
                  @click="toggle(t, $event)"></button>

          <div class="todo-main">
            <p class="todo-title">{{ t.title }}<template v-if="doneMap[t.id]"><span class="todo-tag tag-done">已完成</span></template><template v-else-if="t.tag"><span class="todo-tag tag-week">{{ t.tag }}</span></template></p>
            <p class="todo-meta">{{ t.meta }}</p>
          </div>

          <RouterLink class="todo-action" :class="{ ghost: t.ghost }" :to="{ name: t.to }">{{ t.act }}</RouterLink>
        </li>
      </ul>
    </section>

    <!-- 顺带看看 -->
    <section class="section reveal">
      <h2 class="section-title">顺带看看</h2>
      <div class="quick-grid">
        <RouterLink class="quick" :to="{ name: 'all' }">
          <div class="quick-ico"><VIcon name="grid" /></div>
          <div class="quick-txt">
            <p>全科掌握度</p>
            <p>三主科已开放 · 六门规划中</p>
          </div>
          <span class="quick-badge">看看</span>
        </RouterLink>

        <RouterLink class="quick" :to="{ name: 'me', hash: '#growth' }">
          <div class="quick-ico"><VIcon name="trend" /></div>
          <div class="quick-txt">
            <p>本周报告</p>
            <p>数学正确率 +6%</p>
          </div>
          <span class="quick-badge">已生成</span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>
