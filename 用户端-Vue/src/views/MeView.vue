<script setup>
/* ============================================================
   个人中心
   ------------------------------------------------------------
   资料卡 / 档案明细 / 成长记录 / 成绩曲线 / 活跃热力图 /
   本周报告 / 使用偏好 / 账号与数据。
   成绩曲线是手写 SVG：量程、目标线、涨幅 chips 都跟着视图走。
   ============================================================ */
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { auth, getSession, signOut } from '../lib/session.js';
import { applyTheme, theme, toggleTheme } from '../lib/theme.js';
import {
  readProfile, writeProfile, onSubjects, focusSubjects, targetSum, daysTo,
  pickImage, applyPrefs, SUBJECT_LIST, cleanTarget
} from '../lib/profile.js';
import {
  readScores, writeScores, sortSubjects, scoreGoals, subjColor, isoDate
} from '../lib/scores.js';

const router = useRouter();

const p = ref(readProfile());
const sess = getSession();
const account = (sess && sess.account) || '—';

/* ---------- 资料卡派生 ---------- */
const initial = computed(() => (p.value.nickname || '学').charAt(0));
const focus = computed(() => focusSubjects(p.value));
const autoSign = computed(() => (
  p.value.grade + ' · ' + p.value.textbook +
  (focus.value.length ? ' · 重点 ' + focus.value.map((s) => s.name).join('·') : '')
));
const tags = computed(() => {
  const t = [];
  if (p.value.gender) t.push(p.value.gender);
  t.push(p.value.grade + ' ' + p.value.term);
  t.push(p.value.textbook);
  if (p.value.examDate) t.push('距大考 ' + daysTo(p.value.examDate) + ' 天');
  return t;
});

const rows = computed(() => {
  const onList = onSubjects(p.value);
  const onNames = onList.map((s) => s.name);
  const perSubject = onList.filter((s) => parseFloat(s.target) > 0).map((s) => s.name + ' ' + s.target);
  const sum = targetSum(p.value);
  return [
    ['真实姓名', p.value.realName],
    ['性别', p.value.gender],
    ['年级', p.value.grade + ' · ' + p.value.term],
    ['教材版本', p.value.textbook],
    ['练习科目', onNames.length ? onNames.join(' · ') : ''],
    ['重点科目', focus.value.length ? focus.value.map((s) => s.name).join(' · ') : '未设置'],
    ['各科进度', onList.filter((s) => s.progress).map((s) => s.name + ' ' + s.progress).join(' · ') || '自动跟随学期'],
    ['各科目标', perSubject.length ? perSubject.join(' · ') : ''],
    ['目标总分', sum ? sum + ' 分' : ''],
    ['大考日期', p.value.examDate],
    ['开始时间', p.value.startTime],
    ['每日题量', p.value.dailyCount + ' 题 / 科'],
    ['每周休息', p.value.restDay]
  ];
});

/* ---------- 头像 ---------- */
async function changeAvatar() {
  sheet.value = {
    type: 'avatar',
    title: '更换头像',
    actions: [
      { label: '拍照', run: async () => { const src = await pickImage(true); if (src) saveAvatar(src); } },
      { label: '从相册选择照片', run: async () => { const src = await pickImage(false); if (src) saveAvatar(src); } },
      { label: '恢复默认头像', danger: true, run: () => saveAvatar('') }
    ]
  };
}
function saveAvatar(src) {
  const q = readProfile();
  q.avatar = src || '';
  writeProfile(q);
  p.value = { ...p.value, avatar: q.avatar };
}

/* ---------- 偏好 ---------- */
function setFont(v) {
  const q = readProfile();
  q.fontSize = v;
  writeProfile(q);
  p.value = { ...p.value, fontSize: v };
  applyPrefs(q);
}
function togglePref(key) {
  const q = readProfile();
  q[key] = !q[key];
  writeProfile(q);
  p.value = { ...p.value, [key]: q[key] };
}

/* ---------- 账号动作 ---------- */
function notReady(msg) {
  sheet.value = {
    type: 'msg',
    title: '还没接后端',
    msg,
    actions: [{ label: '知道了', run: () => {} }]
  };
}
function doLogout() {
  signOut();
  router.push({ name: 'login' });
}

/* ============================================================
   成绩曲线
   ============================================================ */
const chartEl = ref(null);
const view = ref('all');
const chartChips = ref([]);
const chartHint = ref('');
const scCount = ref('· 满分 150 分');
const tabs = ref([]);

const X0 = 26, X1 = 306, YT = 22, YB = 142;

function X(i, n) { return n <= 1 ? (X0 + X1) / 2 : X0 + i * (X1 - X0) / (n - 1); }
function md(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m ? (+m[2]) + '/' + (+m[3]) : (s || '');
}
function valsOf(exams, nm) {
  const out = [];
  exams.forEach((ex) => {
    const v = ex.s ? ex.s[nm] : undefined;
    if (v === undefined || v === null || v === '') return;
    out.push(Number(v));
  });
  return out;
}
function totalOf(ex, subs) {
  let sum = 0, cnt = 0;
  subs.forEach((nm) => {
    const v = ex.s ? ex.s[nm] : undefined;
    if (v === undefined || v === null || v === '') return;
    sum += Number(v); cnt++;
  });
  return cnt ? { sum, cnt } : null;
}

function renderChart() {
  const svgEl = chartEl.value;
  if (!svgEl) return;

  const d = readScores();
  const exams = d.exams.slice(-6);
  const subs = sortSubjects(d.subjects);
  const n = exams.length;
  const goals = scoreGoals(subs);
  const goalOf = {};
  let goalSum = 0;
  goals.forEach((g) => { goalOf[g.name] = g.value; goalSum += g.value; });

  const isTotal = view.value === 'total';
  const one = (!isTotal && view.value !== 'all') ? view.value : null;

  /* 切换器：全部 / 总分 / 各科 */
  tabs.value = [{ k: 'all', t: '全部', dot: '' }, { k: 'total', t: '总分', dot: 'var(--brand)' }]
    .concat(subs.map((nm) => ({ k: nm, t: nm, dot: subjColor(nm) })));

  const VMAX = isTotal ? Math.max(subs.length, 1) * 150 : 150;
  const VMIN = isTotal ? 0 : 60;
  const Y = (v) => YB - (v - VMIN) / (VMAX - VMIN) * (YB - YT);

  const ticks = isTotal
    ? [VMAX, Math.round(VMAX * 2 / 3), Math.round(VMAX / 3), 0]
    : [150, 120, 90, 60];

  const out = [];

  ticks.forEach((v) => {
    const y = Y(v).toFixed(1);
    out.push('<line class="grid" x1="' + X0 + '" y1="' + y + '" x2="' + X1 + '" y2="' + y + '"/>');
    out.push('<text class="axis" x="' + (X0 - 5) + '" y="' + (Y(v) + 3.2).toFixed(1) +
      '" text-anchor="end">' + v + '</text>');
  });

  const lines = [];
  if (isTotal) {
    if (goalSum > 0) lines.push({ value: goalSum, color: 'var(--brand)', text: '总目标 ' + goalSum });
  } else if (one) {
    if (goalOf[one]) lines.push({ value: goalOf[one], color: subjColor(one), text: '目标 ' + goalOf[one] });
  } else {
    goals.forEach((g) => lines.push({ value: g.value, color: subjColor(g.name), text: g.name + ' ' + g.value }));
  }
  lines.forEach((L) => {
    const gy = Y(L.value).toFixed(1);
    out.push('<line class="goal" style="stroke:' + L.color +
      ';opacity:.7;stroke-width:1.2" x1="' + X0 + '" y1="' + gy +
      '" x2="' + X1 + '" y2="' + gy + '"/>');
  });

  exams.forEach((ex, i) => {
    out.push('<text class="axis" x="' + X(i, n).toFixed(1) +
      '" y="160" text-anchor="middle">' + md(ex.date) + '</text>');
  });

  const series = [];
  if (isTotal) {
    const pts = [];
    let last = null;
    exams.forEach((ex, i) => {
      const t = totalOf(ex, subs);
      if (!t) return;
      const px = X(i, n), py = Y(t.sum);
      pts.push(px.toFixed(1) + ',' + py.toFixed(1));
      last = { x: px, y: py, tip: '总分 ' + t.sum + ' 分 · ' + t.cnt + ' 科 · ' + ex.name };
    });
    if (last) series.push({ color: 'var(--brand)', pts, last });
  } else {
    (one ? [one] : subs).forEach((nm) => {
      const pts = [];
      let last = null;
      exams.forEach((ex, i) => {
        const v = ex.s ? ex.s[nm] : undefined;
        if (v === undefined || v === null || v === '') return;
        const px = X(i, n), py = Y(Number(v));
        pts.push(px.toFixed(1) + ',' + py.toFixed(1));
        last = { x: px, y: py, tip: nm + ' · ' + ex.name + ' ' + v + ' 分' };
      });
      if (last) series.push({ color: subjColor(nm), pts, last });
    });
  }
  series.forEach((s) => {
    if (s.pts.length > 1) {
      out.push('<polyline class="ln" stroke="' + s.color + '" points="' + s.pts.join(' ') + '"/>');
    }
    out.push('<circle class="pt" cx="' + s.last.x.toFixed(1) + '" cy="' + s.last.y.toFixed(1) +
      '" r="3.6" fill="' + s.color + '"><title>' + s.last.tip + '</title></circle>');
  });

  /* 目标线标签：贴右端、拥挤时上下错开 */
  const lbls = lines.map((L) => ({ text: L.text, y: Y(L.value), color: L.color }));
  lbls.sort((a, b) => a.y - b.y);
  lbls.forEach((L, i) => {
    const floor = i ? lbls[i - 1].y + 10 : YT + 6;
    if (L.y < floor) L.y = floor;
  });
  lbls.forEach((L) => {
    out.push('<text class="goal-lbl" x="' + X1 + '" y="' + (L.y - 5).toFixed(1) +
      '" text-anchor="end" style="fill:' + L.color + '">' + L.text + '</text>');
  });

  svgEl.innerHTML = out.join('');
  svgEl.setAttribute('aria-label', isTotal ? '各科总分趋势，满分 ' + VMAX + ' 分'
    : one ? one + '成绩趋势，满分 150 分' : '各科考试成绩趋势，满分 150 分');

  /* 涨幅 / 目标达成 */
  const chips = [];
  function rangeChip(label, arr) {
    if (arr.length < 2) return;
    const diff = Math.round((arr[arr.length - 1] - arr[0]) * 10) / 10;
    if (!diff) return;
    chips.push({ text: label + ' ' + (diff > 0 ? '+' : '') + diff + ' 分', cls: diff > 0 ? 'ok' : '' });
  }
  function gapChip(label, now, goal) {
    const dd = Math.round((now - goal) * 10) / 10;
    chips.push({
      text: dd >= 0 ? label + ' 已达目标 ' + goal + ' 分'
        : label + ' 距目标 ' + goal + ' 还差 ' + Math.abs(dd) + ' 分',
      cls: dd >= 0 ? 'brand' : ''
    });
  }

  if (isTotal) {
    const tAll = [];
    exams.forEach((ex) => { const t = totalOf(ex, subs); if (t) tAll.push(t.sum); });
    rangeChip('总分', tAll);
    if (goalSum > 0 && tAll.length) gapChip('总分', tAll[tAll.length - 1], goalSum);
  } else if (one) {
    const oAll = valsOf(exams, one);
    rangeChip(one, oAll);
    if (goalOf[one] && oAll.length) gapChip(one, oAll[oAll.length - 1], goalOf[one]);
  } else {
    subs.forEach((nm) => rangeChip(nm, valsOf(exams, nm)));
    subs.filter((nm) => {
      const g = goalOf[nm];
      if (!g) return false;
      const v = valsOf(exams, nm);
      return v.length && v[v.length - 1] >= g;
    }).slice(0, 2).forEach((nm) => chips.push({ text: nm + ' 已过目标线', cls: 'brand' }));
  }
  chartChips.value = chips.length ? chips : [{ text: '录两次以上的考试，就能看到涨幅', cls: '' }];

  const lastExam = exams.length ? exams[exams.length - 1] : null;
  const tail = lastExam ? '最近一次：' + lastExam.name + '（' + md(lastExam.date) + '）。' : '';
  if (isTotal) {
    chartHint.value = '总分 = 各科分数相加（缺考的科目自动跳过）。' +
      (goalSum > 0 ? '图中虚线 = 总目标 ' + goalSum + ' 分（各科目标分之和）。'
        : '你还没填各科目标分，填了才会出现总目标线。') + tail;
  } else if (one) {
    chartHint.value = one + ' 满分 150 分。' +
      (goalOf[one] ? '图中虚线 = 这科的目标线 ' + goalOf[one] + ' 分。'
        : '你还没填这科的目标分，填了才会出现目标线。') + tail;
  } else {
    chartHint.value = '图中虚线 = 各科目标线（一门一条，颜色对应科目）：' +
      (goals.length
        ? goals.map((g) => g.name + ' ' + g.value).join(' · ') +
          '，去「编辑资料 → 科目与目标」逐科改。'
        : '暂时没有目标线 —— 去「编辑资料 → 科目与目标」填了目标分，那一科才会出现自己的目标线。') +
      tail;
  }
  scCount.value = (isTotal ? '· 满分 ' + VMAX + ' 分（' + subs.length + ' 科）' : '· 满分 150 分') +
    (exams.length ? ' · 最近 ' + exams.length + ' 次' : '');
}

/* ---------- 顶部分页 ---------- */
function pickView(k) {
  view.value = k;
  nextTick(renderChart);
}

/* ---------- 录入成绩 ---------- */
const scoreForm = ref(null);

function openScoreForm() {
  const subs = sortSubjects(readScores().subjects);
  const vals = {};
  subs.forEach((n) => { vals[n] = ''; });
  scoreForm.value = { name: '', date: isoDate(new Date()), subs, vals, err: '' };
}
function saveScoreForm() {
  const f = scoreForm.value;
  if (!f) return;
  const s = {};
  let bad = '', filled = 0;
  f.subs.forEach((n) => {
    const raw = String(f.vals[n] || '').trim();
    if (raw === '') return;
    const v = parseFloat(raw);
    if (isNaN(v) || v < 0 || v > 150) { if (!bad) bad = n; return; }
    s[n] = Math.round(v * 10) / 10;
    filled++;
  });
  if (bad) { f.err = '「' + bad + '」的分数要填 0 – 150 之间的数字。'; return; }
  if (!f.name.trim()) { f.err = '给这次考试起个名字，比如「10 月月考」。'; return; }
  if (!f.date) { f.err = '选一下考试日期，曲线靠它排序。'; return; }
  if (!filled) { f.err = '至少填一科的分数。'; return; }

  const d = readScores();
  let hit = null;
  d.exams.forEach((x) => { if (x.name === f.name.trim() && x.date === f.date) hit = x; });
  if (hit) Object.keys(s).forEach((k) => { hit.s[k] = s[k]; });
  else d.exams.push({ name: f.name.trim(), date: f.date, s });

  const all = d.subjects.slice();
  Object.keys(s).forEach((k) => all.push(k));
  d.subjects = sortSubjects(all);
  writeScores(d);

  const hitName = hit ? hit.name : f.name.trim();
  scoreForm.value = null;
  toast(hit ? '已更新「' + hitName + '」' : '已保存「' + hitName + '」');
  nextTick(renderChart);
}

/* ---------- 添加跟踪科目 ---------- */
function openAddSubject() {
  const d = readScores();
  const rest = SUBJECT_LIST.filter((n) => d.subjects.indexOf(n) < 0);
  if (!rest.length) { toast('九科都已经在成绩表里了'); return; }
  sheet.value = {
    type: 'subjects',
    title: '添加要跟踪的科目',
    actions: rest.map((n) => ({
      label: n,
      run: () => {
        const q = readScores();
        if (q.subjects.indexOf(n) < 0) q.subjects.push(n);
        q.subjects = sortSubjects(q.subjects);
        writeScores(q);
        toast('已添加 ' + n);
        nextTick(renderChart);
      }
    }))
  };
}

/* ---------- 轻提示 ---------- */
const toastMsg = ref('');
let toastTimer = null;
function toast(msg) {
  toastMsg.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 1800);
}

/* ---------- 通用底部弹层 ---------- */
const sheet = ref(null);
function runSheet(a) {
  const act = a;
  sheet.value = null;
  if (act && act.run) act.run();
}

/* ---------- 活跃热力图 ---------- */
const heatCells = computed(() => {
  let seed = 20261010;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - today.getDay() - 25 * 7);

  const fmt = (dt) => dt.getFullYear() + ' 年 ' + (dt.getMonth() + 1) + ' 月 ' + dt.getDate() + ' 日';
  const out = [];
  for (let i = 0; i < 26 * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d > today) { out.push({ l: 0, future: true, tip: '' }); continue; }
    const pr = rnd();
    const n = pr < 0.16 ? 0 : pr < 0.34 ? 1 : pr < 0.56 ? 2 : pr < 0.80 ? 3 : 4;
    out.push({
      l: n,
      future: false,
      tip: fmt(d) + ' · ' + (n === 0 ? '没有完成任务' : '完成 ' + n + (n >= 4 ? '+ 项任务' : ' 项任务'))
    });
  }
  return out;
});

const heatTip = ref({ show: false, text: '', left: 0, top: 0 });
function showHeatTip(e, tip) {
  if (!tip) return;
  const x = e.clientX, y = e.clientY;
  heatTip.value = { show: true, text: tip, left: x, top: y };
  nextTick(() => {
    const el = document.querySelector('.heat-tip');
    if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    let left = Math.min(Math.max(8, x - w / 2), window.innerWidth - w - 8);
    let top = y - h - 10;
    if (top < 8) top = y + 18;
    heatTip.value = { show: true, text: tip, left, top };
  });
}
function hideHeatTip() { heatTip.value.show = false; }

const themeLabel = computed(() => (theme.value === 'dark' ? '浅色模式' : '深色模式'));

onMounted(() => {
  applyTheme(theme.value);
  applyPrefs(p.value);
  nextTick(renderChart);
});
onBeforeUnmount(() => {
  clearTimeout(toastTimer);
  document.body.classList.remove('fs-small', 'fs-large');
});
</script>

<template>
  <div>
    <!-- 资料卡 -->
    <section class="pf-card reveal">
      <div class="pf-ava">
        <span v-if="!p.avatar" class="avatar">{{ initial }}</span>
        <img v-else :src="p.avatar" alt="头像">
        <button class="pf-ava-cam" type="button" title="更换头像" aria-label="更换头像" @click="changeAvatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 8.2c0-1 .8-1.9 1.9-1.9h1.7l1.2-1.8h6.4l1.2 1.8h1.7c1 0 1.9.8 1.9 1.9v8.6c0 1-.8 1.9-1.9 1.9H5.9c-1 0-1.9-.8-1.9-1.9z"/>
            <circle cx="12" cy="12.3" r="3.4"/>
          </svg>
        </button>
      </div>

      <div class="pf-main">
        <p class="pf-name">
          <span>{{ p.nickname || '同学' }}</span>
          <span class="chip brand">连续 7 天</span>
        </p>
        <p class="pf-sign">{{ p.signature || autoSign }}</p>
        <div class="pf-tags">
          <span v-for="t in tags" :key="t" class="chip">{{ t }}</span>
        </div>
      </div>

      <RouterLink class="btn-ghost pf-edit" :to="{ name: 'meEdit' }">编辑资料</RouterLink>
    </section>

    <!-- 我的档案 -->
    <section class="section reveal">
      <h2 class="section-title">我的档案 <span class="count">· 决定出题方向</span></h2>
      <div class="panel">
        <dl class="pf-lines">
          <template v-for="r in rows" :key="r[0]">
            <dt>{{ r[0] }}</dt><dd>{{ r[1] || '—' }}</dd>
          </template>
        </dl>
      </div>
    </section>

    <!-- 成长记录 -->
    <section id="growth" class="section reveal">
      <h2 class="section-title">成长记录 <span class="count">· 数据会说话</span></h2>
      <div class="stat-row cols-2">
        <div class="stat">
          <p class="stat-num"><b data-count="7">7</b><i>天</i></p>
          <p class="stat-lbl">连续打卡</p>
        </div>
        <div class="stat">
          <p class="stat-num"><b data-count="92">92</b><i>%</i></p>
          <p class="stat-lbl">任务完成率</p>
        </div>
      </div>
    </section>

    <!-- 成绩进步路线 -->
    <section id="score" class="section reveal">
      <h2 class="section-title">成绩进步路线 <span class="count">{{ scCount }}</span></h2>
      <div class="panel">
        <div class="sc-tools">
          <div class="sc-tabs" role="tablist" aria-label="切换查看方式">
            <button v-for="t in tabs" :key="t.k" class="sc-tab" :class="{ on: view === t.k }"
                    type="button" role="tab" :aria-selected="view === t.k" @click="pickView(t.k)">
              <i v-if="t.dot" class="sc-dot" :style="{ background: t.dot }"></i>{{ t.t }}
            </button>
          </div>
          <div class="sc-tools-r">
            <button class="btn-ghost sc-sm" type="button" @click="openAddSubject">＋ 添加科目</button>
            <button class="btn-brand sc-sm" type="button" @click="openScoreForm">录入成绩</button>
          </div>
        </div>

        <svg ref="chartEl" class="chart" viewBox="0 0 332 168" role="img"
             aria-label="各科考试成绩趋势，满分 150 分"></svg>

        <div class="chips" style="margin-top:14px">
          <span v-for="c in chartChips" :key="c.text" class="chip" :class="c.cls">{{ c.text }}</span>
        </div>
        <p class="pf-hint">{{ chartHint }}</p>
      </div>
    </section>

    <!-- 学习活跃度 -->
    <section class="section reveal">
      <h2 class="section-title">学习活跃度
        <span class="count">· 每格一天，颜色越深当天完成的任务越多</span>
      </h2>
      <div class="panel">
        <div class="heat-wrap">
          <div class="heat" role="img" aria-label="最近半年每天的学习活跃度热力图">
            <i v-for="(c, i) in heatCells" :key="i" :data-l="c.l"
               :data-future="c.future ? '1' : null"
               @mouseover="showHeatTip($event, c.tip)"
               @mousemove="showHeatTip($event, c.tip)"
               @mouseout="hideHeatTip"></i>
          </div>
        </div>
        <div class="heat-legend">
          <span>少</span>
          <i style="background:var(--heat-0)"></i>
          <i style="background:var(--heat-1)"></i>
          <i style="background:var(--heat-2)"></i>
          <i style="background:var(--heat-3)"></i>
          <i style="background:var(--heat-4)"></i>
          <span>多</span>
        </div>
      </div>
    </section>

    <!-- 本周报告 -->
    <section class="section reveal">
      <h2 class="section-title">本周报告 <span class="count">· 10 月 5 日 – 10 月 11 日</span></h2>
      <div class="panel">
        <div class="rep-bar">
          <p class="rep-hint">把这一周做成一张海报，发给家长或存下来</p>
          <button class="btn-ghost rep-btn" type="button" @click="router.push({ name: 'poster' })">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.6"/>
              <path d="M3.4 15.4l4.6-4.2 4 3.6 3.2-2.8 5.4 4.6"/>
              <circle cx="9" cy="9.4" r="1.4"/>
            </svg>
            生成海报
          </button>
        </div>

        <div class="row">
          <div class="row-ico ok">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M4.2 16.6 9.7 11l3.6 3.6 6.5-6.6"/><path d="M15.2 8h4.6v4.6"/>
            </svg>
          </div>
          <div class="row-main">
            <p class="row-title">数学正确率从 74% 升到 80%</p>
            <p class="row-meta">主要来自一元二次方程的巩固，这个知识点已经可以少练了</p>
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
            <p class="row-title">几何证明连续两周没动过</p>
            <p class="row-meta">掌握度停在 48%，建议下周把它的比重调高</p>
          </div>
        </div>

        <div class="row">
          <div class="row-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M12 3.4c3 3.1 5.4 5.4 5.4 8.6a5.4 5.4 0 0 1-10.8 0c0-1.4.5-2.6 1.4-3.7.4 1 .9 1.7 1.7 2.1-.3-2.6.7-5.1 2.3-7z"/>
            </svg>
          </div>
          <div class="row-main">
            <p class="row-title">连续 7 天没断，但三次拖到 21:30 之后</p>
            <p class="row-meta">建议把开始时间提到 20:00，睡前的正确率明显更低</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 使用偏好 -->
    <section class="section reveal">
      <h2 class="section-title">使用偏好</h2>
      <div class="panel">
        <div class="row">
          <div class="row-main">
            <p class="row-title">外观</p>
            <p class="row-meta">右上角圆钮也能切</p>
          </div>
          <button class="btn-ghost" type="button" @click="toggleTheme($event)">{{ themeLabel }}</button>
        </div>

        <div class="row">
          <div class="row-main">
            <p class="row-title">字体大小</p>
            <p class="row-meta">屏幕上字小的时候可以调大</p>
          </div>
          <div class="pf-seg">
            <button v-for="v in ['小', '标准', '大']" :key="v" type="button"
                    :class="{ on: p.fontSize === v }" @click="setFont(v)">{{ v }}</button>
          </div>
        </div>

        <div class="row">
          <div class="row-main">
            <p class="row-title">单词朗读</p>
            <p class="row-meta">单词卡上的喇叭自动发声</p>
          </div>
          <button class="pf-sw" :class="{ on: p.readAloud }" type="button" role="switch"
                  :aria-checked="p.readAloud ? 'true' : 'false'" aria-label="单词朗读"
                  @click="togglePref('readAloud')"></button>
        </div>

        <div class="row">
          <div class="row-main">
            <p class="row-title">每日提醒</p>
            <p class="row-meta">到开始时间提醒你今天还有题没做</p>
          </div>
          <button class="pf-sw" :class="{ on: p.notify }" type="button" role="switch"
                  :aria-checked="p.notify ? 'true' : 'false'" aria-label="每日提醒"
                  @click="togglePref('notify')"></button>
        </div>
      </div>
    </section>

    <!-- 账号与数据 -->
    <section class="section reveal">
      <h2 class="section-title">账号与数据</h2>
      <div class="panel">
        <div class="row">
          <div class="row-main">
            <p class="row-title">登录名</p>
            <p class="row-meta">家长在管理端建档时开好的账号</p>
          </div>
          <span class="chip">{{ account }}</span>
        </div>

        <div class="row">
          <div class="row-main">
            <p class="row-title">已登录设备</p>
            <p class="row-meta">这台设备 · 刚刚活跃</p>
          </div>
          <button class="btn-ghost" type="button"
                  @click="notReady('「踢出其他设备」要等账号体系接上后端才能用。')">全部退出</button>
        </div>

        <div class="row">
          <div class="row-main">
            <p class="row-title">家长账号</p>
            <p class="row-meta">家长能看到你的学习报告；忘了密码让家长在管理端重置</p>
          </div>
          <span class="chip ok">已关联</span>
        </div>

        <div class="row">
          <div class="row-main">
            <p class="row-title">导出学习数据</p>
            <p class="row-meta">导出为表格，随时带走</p>
          </div>
          <button class="btn-ghost" type="button"
                  @click="notReady('「导出学习数据」原型阶段还没接，正式版会导出成表格。')">导出</button>
        </div>
      </div>
    </section>

    <section class="section reveal">
      <button class="btn-ghost danger full" type="button" @click="doLogout">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M15 8.4V6.2A1.7 1.7 0 0 0 13.3 4.5H6.2A1.7 1.7 0 0 0 4.5 6.2v11.6a1.7 1.7 0 0 0 1.7 1.7h7.1a1.7 1.7 0 0 0 1.7-1.7v-2.2"/>
          <path d="M9.4 12h10.1"/><path d="M16.9 9.2 19.7 12l-2.8 2.8"/>
        </svg>
        退出登录
      </button>
    </section>

    <!-- 热力图提示：必须 teleport 到 body —— 根 div 带 transform（入场动画），
         留在里面会让 position:fixed 相对它定位，提示框偏到屏幕外 -->
    <Teleport to="body">
      <div v-if="heatTip.show" class="heat-tip on"
           :style="{ left: heatTip.left + 'px', top: heatTip.top + 'px' }">{{ heatTip.text }}</div>
    </Teleport>

    <!-- 轻提示 -->
    <Teleport to="body">
      <div v-if="toastMsg" class="toast on">{{ toastMsg }}</div>
    </Teleport>

    <!-- 底部动作弹层 -->
    <Teleport to="body">
      <div v-if="sheet" class="sheet-mask" @click.self="sheet = null">
        <div class="sheet" role="dialog" aria-modal="true">
          <p class="sheet-title">{{ sheet.title }}</p>
          <button v-for="(a, i) in sheet.actions" :key="i" class="sheet-btn" :class="{ danger: a.danger }"
                  type="button" @click="runSheet(a)">{{ a.label }}</button>
          <button class="sheet-btn sheet-cancel" type="button" @click="sheet = null">取消</button>
        </div>
      </div>
    </Teleport>

    <!-- 录入成绩 -->
    <Teleport to="body">
      <div v-if="scoreForm" class="sheet-mask" @click.self="scoreForm = null">
        <div class="sheet sheet-form" role="dialog" aria-modal="true">
          <p class="sheet-title">录入考试成绩 · 满分 150</p>
          <div class="sf-body">
            <div class="sf-row">
              <label for="sfName">考试名称</label>
              <input id="sfName" v-model="scoreForm.name" class="pf-input" type="text"
                     maxlength="10" autocomplete="off" placeholder="如：10 月月考">
            </div>
            <div class="sf-row">
              <label for="sfDate">考试日期</label>
              <input id="sfDate" v-model="scoreForm.date" class="pf-input" type="date">
            </div>
            <div v-for="n in scoreForm.subs" :key="n" class="sf-row">
              <label><i class="sc-dot" :style="{ background: subjColor(n) }"></i>{{ n }}</label>
              <input v-model="scoreForm.vals[n]" class="pf-input sf-score" type="number"
                     min="0" max="150" inputmode="numeric" placeholder="0 – 150">
            </div>
          </div>
          <p v-if="scoreForm.err" class="sf-err">{{ scoreForm.err }}</p>
          <button class="btn-brand sf-save" type="button" @click="saveScoreForm">保存这次成绩</button>
          <button class="sheet-btn sheet-cancel" type="button" @click="scoreForm = null">取消</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
