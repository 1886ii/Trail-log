<script setup>
/* ============================================================
   周报海报 · 独立页（不套 App 外壳）
   ------------------------------------------------------------
   画布 540 × 720（导出 2x = 1080 × 1440）。
   样式全部内联在 poster.css 里，导出时把同一份 CSS 塞进
   SVG foreignObject —— 服务端渲染也能复用同一份模板。
   配色只允许用设计令牌（--brand / 九科色 / --gold），不另造颜色。
   ============================================================ */
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import posterCss from '../styles/poster.css?raw';
import { theme, applyTheme } from '../lib/theme.js';
import { readProfile } from '../lib/profile.js';

const router = useRouter();

/* 数据入口：正式版由服务端替换成真实周报快照 */
const WEEKLY = window.__WEEKLY__ || {
  week: '第 41 周 · 10.05 – 10.11',
  streak: 7,
  title: '坚持之星',
  completeRate: 88,
  accuracy: 81,
  words: 40,
  subjects: [
    { name: '数学', rate: 86, key: 'math' },
    { name: '英语', rate: 74, key: 'en' },
    { name: '语文', rate: 68, key: 'cn' }
  ],
  days: [
    { d: '一', n: 3 }, { d: '二', n: 2 }, { d: '三', n: 4 }, { d: '四', n: 1 },
    { d: '五', n: 4 }, { d: '六', n: 3 }, { d: '日', n: 2 }
  ],
  summary: '数学正确率从 74% 升到 80%，主要来自一元二次方程的巩固；英语的完形填空连续两周没动过。',
  tips: ['① 把英语完形填空排进每日任务，每天 2 题', '② 周三只完成 1 项，试试把开始时间提到 20:00'],
  madeAt: '2026 年 10 月 11 日'
};

const SUB_KEY = {
  '语文': 'cn', '数学': 'math', '英语': 'en', '物理': 'phy', '化学': 'che',
  '生物': 'bio', '历史': 'his', '道法': 'pol', '地理': 'geo'
};

const ICONS = {
  shield: '<svg viewBox="0 0 24 24" fill="none">' +
    '<path d="M12 2.2l8 2.9v5.9c0 4.9-3.4 8.5-8 10.8-4.6-2.3-8-5.9-8-10.8V5.1z" style="fill:var(--brand)"/>' +
    '<path d="M8.2 12.1l2.6 2.6 5-5.1" style="stroke:#FFFFFF;stroke-width:2" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>',
  book: '<svg viewBox="0 0 24 24" fill="none">' +
    '<path d="M4 4.6h5.2c1.6 0 2.8 1.2 2.8 2.8v11.4c0-1.4-1.2-2.5-2.6-2.5H4z" style="fill:var(--c-en)" stroke-linejoin="round"/>' +
    '<path d="M20 4.6h-5.2c-1.6 0-2.8 1.2-2.8 2.8v11.4c0-1.4 1.2-2.5 2.6-2.5H20z" style="fill:var(--c-en);opacity:.62" stroke-linejoin="round"/>' +
    '</svg>',
  target: '<svg viewBox="0 0 24 24" fill="none">' +
    '<circle cx="12" cy="12" r="9" style="stroke:var(--c-cn);stroke-width:1.9"/>' +
    '<circle cx="12" cy="12" r="4.6" style="stroke:var(--c-cn);stroke-width:1.6"/>' +
    '<circle cx="12" cy="12" r="1.9" style="fill:var(--c-cn)"/>' +
    '</svg>',
  rise: '<svg viewBox="0 0 24 24" fill="none">' +
    '<path d="M3.4 16.8l5.4-5.6 3.6 3.6 8-8.2" style="stroke:var(--ok);stroke-width:2.1" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="M15.4 6.6h5v5" style="stroke:var(--ok);stroke-width:2.1" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>'
};

const MEDAL = '<svg viewBox="0 0 64 64" width="64" height="64" fill="none">' +
  '<circle cx="32" cy="32" r="27" style="fill:rgba(255,255,255,.10);stroke:var(--hero-line);stroke-width:1.4"/>' +
  '<circle cx="32" cy="32" r="21" style="fill:var(--gold)"/>' +
  '<circle cx="32" cy="32" r="21" style="fill:#FFFFFF;opacity:.14"/>' +
  '<path d="M32 18.4l4.2 8.5 9.4 1.4-6.8 6.6 1.6 9.4L32 39.9l-8.4 4.4 1.6-9.4-6.8-6.6 9.4-1.4z" style="fill:#FFFFFF"/>' +
  '</svg>';

/* ---------- 昵称 / 主题 ---------- */
const prof = readProfile();
const nick = ref((prof && prof.nickname) || '小宇');
const dark = ref(theme.value === 'dark');
const stageEl = ref(null);
const posterEl = ref(null);

function syncPosterTheme() {
  document.documentElement.setAttribute('data-theme', dark.value ? 'dark' : 'light');
}

/* ---------- 派生数据 ---------- */
const badges = computed(() => ([
  { n: '全勤王', ic: 'shield', on: WEEKLY.completeRate >= 80 },
  { n: '单词达人', ic: 'book', on: WEEKLY.words >= 30 },
  { n: '准确王', ic: 'target', on: WEEKLY.accuracy >= 85 },
  { n: '稳进者', ic: 'rise', on: WEEKLY.streak >= 5 }
]).map((b) => ({ ...b, svg: ICONS[b.ic] })));

const subRows = computed(() => {
  const subs = WEEKLY.subjects.slice().sort((a, c) => a.rate - c.rate);
  const min = subs.length ? subs[0].rate : 0;
  let weakUsed = false;
  return subs.map((s) => {
    const k = s.key || SUB_KEY[s.name] || 'math';
    const weak = s.rate === min && !weakUsed;
    if (weak) weakUsed = true;
    return { ...s, weak, color: weak ? 'var(--gold)' : 'var(--c-' + k + ')' };
  });
});

const dayBars = computed(() => {
  const OP = [0.32, 0.52, 0.76, 1];
  const max = Math.max(1, ...WEEKLY.days.map((d) => d.n));
  return WEEKLY.days.map((day) => {
    const lv = day.n === 0 ? 1 : Math.max(1, Math.min(4, Math.round(day.n / max * 4)));
    const top = day.n === max && max > 0;
    const h = top ? 46 : (10 + lv * 8);
    return { d: day.d, top, h, opacity: top ? 1 : OP[lv - 1] };
  });
});

/* ---------- 窄屏等比缩放 ---------- */
function fit() {
  const avail = window.innerWidth - 32;
  const s = Math.min(1, avail / 540);
  const stage = stageEl.value;
  if (!stage) return;
  if (s >= 1) {
    stage.style.transform = '';
    stage.style.width = '';
    stage.style.height = '';
    return;
  }
  stage.style.transform = 'scale(' + s + ')';
  stage.style.transformOrigin = 'top left';
  stage.style.width = (540 * s) + 'px';
  stage.style.height = (720 * s) + 'px';
}

/* ---------- 导出：SVG foreignObject → canvas（零依赖） ---------- */
function exportPng() {
  return new Promise((resolve, reject) => {
    const el = posterEl.value;
    let xml;
    try { xml = new XMLSerializer().serializeToString(el); }
    catch (e) { reject(new Error('serialize failed')); return; }

    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440" viewBox="0 0 540 720">' +
        '<foreignObject x="0" y="0" width="540" height="720">' +
          '<div xmlns="http://www.w3.org/1999/xhtml">' +
            '<style>' + posterCss + '</style>' + xml +
          '</div>' +
        '</foreignObject>' +
      '</svg>';

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1440;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = dark.value ? '#171A20' : '#FFFFFF';
      ctx.fillRect(0, 0, 1080, 1440);
      ctx.drawImage(img, 0, 0, 1080, 1440);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => reject(new Error('render failed'));
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

/* ---------- 交互 ---------- */
const saving = ref(false);
const maskUrl = ref('');
const toastMsg = ref('');
let toastTimer = null;

function toast(msg) {
  toastMsg.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 2200);
}

async function saveImage() {
  if (saving.value) return;
  saving.value = true;
  try {
    const url = await exportPng();
    maskUrl.value = url;
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = '学迹周报-2026W41.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) { /* 移动端靠长按保存 */ }
  } catch (e) {
    toast('导出失败，可以截图保存这一页');
  } finally {
    saving.value = false;
  }
}

function togglePreviewTheme() {
  dark.value = !dark.value;
  syncPosterTheme();
}

function goBack() {
  if (window.history.length > 1) router.back();
  else router.push({ name: 'me' });
}

/* 海报样式只在本书签页存在：注入 <style id="poster-style">，离开时移除 */
let styleEl = null;
onMounted(() => {
  styleEl = document.createElement('style');
  styleEl.id = 'poster-style';
  styleEl.textContent = posterCss;
  document.head.appendChild(styleEl);
  syncPosterTheme();
  fit();
  window.addEventListener('resize', fit);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', fit);
  clearTimeout(toastTimer);
  if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
  /* 还原成 App 的主题，避免「预览深色」把其他页面带黑 */
  applyTheme(theme.value);
});
</script>

<template>
  <div ref="stageEl" class="stage">
    <div ref="posterEl" class="poster" :class="{ dark }">
      <header class="p-head">
        <div class="p-who">
          <span class="p-logo">迹</span>
          <div>
            <p class="p-app">学迹 · 每周学习报告</p>
            <p class="p-week">{{ WEEKLY.week }}</p>
          </div>
        </div>
        <div class="p-user">
          <p class="p-nick">{{ nick }}</p>
          <span class="p-ava">{{ nick.charAt(0) }}</span>
        </div>
      </header>

      <section class="p-hero">
        <div class="p-hero-top">
          <div>
            <p class="p-kicker">本周连续打卡</p>
            <p class="p-num"><b>{{ WEEKLY.streak }}</b><i>天</i></p>
          </div>
          <span class="p-medal" v-html="MEDAL"></span>
        </div>
        <p class="p-title"><em>本周称号</em><span>{{ WEEKLY.title || '稳进者' }}</span></p>
        <div class="p-mini">
          <div class="p-m"><b>{{ WEEKLY.completeRate }}%</b><span>任务完成率</span></div>
          <div class="p-m"><b>{{ WEEKLY.accuracy }}%</b><span>平均正确率</span></div>
          <div class="p-m"><b>{{ WEEKLY.words }}</b><span>本周单词</span></div>
        </div>
      </section>

      <section class="p-badges">
        <div v-for="b in badges" :key="b.n" class="p-bd" :class="{ off: !b.on }">
          <span v-html="b.svg"></span><span>{{ b.n }}</span>
        </div>
      </section>

      <section class="p-card">
        <p class="p-ttl">各科正确率</p>
        <div class="p-rows">
          <div v-for="s in subRows" :key="s.name" class="p-row" :class="{ weak: s.weak }">
            <span class="p-dot" :style="{ background: s.color }"></span>
            <span class="p-sub">{{ s.name }}</span>
            <span class="p-track"><i :style="{ width: s.rate + '%', background: s.color }"></i></span>
            <b>{{ s.rate }}%</b>
          </div>
        </div>
      </section>

      <section class="p-card">
        <p class="p-ttl">一周节奏 <em>· 每天完成的任务数</em></p>
        <div class="p-bars">
          <div v-for="(d, i) in dayBars" :key="i" class="p-b" :class="{ top: d.top }">
            <i :style="{ height: d.h + 'px', opacity: d.opacity }"></i>
            <span>{{ d.d }}</span>
          </div>
        </div>
      </section>

      <section class="p-ai">
        <p class="p-ttl">AI 点评</p>
        <p class="p-sum">{{ WEEKLY.summary }}</p>
        <p class="p-tip">{{ WEEKLY.tips[0] || '' }}</p>
        <p class="p-tip">{{ WEEKLY.tips[1] || '' }}</p>
      </section>

      <footer class="p-foot">
        <span>学迹 · {{ WEEKLY.madeAt }}生成</span>
        <span>数据仅自己可见，分享前想一下给谁看</span>
      </footer>
    </div>
  </div>

  <div class="poster-toolbar-wrap">
    <div class="toolbar">
      <button class="tb-btn" type="button" @click="togglePreviewTheme">
        {{ dark ? '预览浅色' : '预览深色' }}
      </button>
      <button class="tb-btn" type="button" @click="goBack">返回</button>
      <button class="tb-btn primary" type="button" :disabled="saving" @click="saveImage">
        {{ saving ? '生成中…' : '保存图片' }}
      </button>
    </div>
  </div>

  <Teleport to="body">
    <div v-if="maskUrl" class="mask">
      <p class="mask-tip">图片已生成 · 长按可保存到相册</p>
      <img :src="maskUrl" alt="本周学习报告海报">
      <button class="tb-btn" type="button" @click="maskUrl = ''">关闭</button>
    </div>
    <div v-if="toastMsg" class="toast on">{{ toastMsg }}</div>
  </Teleport>
</template>
