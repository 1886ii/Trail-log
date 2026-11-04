/* ============================================================
   学生功能权限
   ------------------------------------------------------------
   四档预设（管理端下发 preset，也可以逐项覆盖 mods）；
   没权限的页面，顶栏与导航完全不动，只把内容区换成一把锁。
   ⚠️ 前端锁是体验，不是安全 —— 真正的门在后端接口鉴权。
   ============================================================ */
import { reactive, computed } from 'vue';
import { auth } from './session.js';

export const PERM_PRESETS = {
  full:     { label: '全功能',   mods: { home: 1, daily: 1, reading: 1, essay: 1, all: 1, mistakes: 1, posts: 1, post: 1 } },
  learn:    { label: '学习专注', mods: { home: 1, daily: 1, reading: 1, essay: 1, all: 1, mistakes: 1, posts: 1, post: 0 } },
  task:     { label: '只做任务', mods: { home: 1, daily: 1, reading: 0, essay: 0, all: 0, mistakes: 0, posts: 0, post: 0 } },
  readonly: { label: '仅看记录', mods: { home: 0, daily: 0, reading: 0, essay: 0, all: 0, mistakes: 0, posts: 1, post: 0 } }
};

export const PERM_MODS = ['home', 'daily', 'reading', 'essay', 'all', 'mistakes', 'posts', 'post'];

/* 页面 → 权限模块。不在表内的页面永不锁：
   个人中心 / 编辑资料 / 周报海报 / 登录页 —— 锁了孩子就退不出登录了 */
export const PAGE_MOD = {
  home: 'home',
  daily: 'daily', practice: 'daily', words: 'daily', calc: 'daily', answer: 'daily',
  reading: 'reading', read: 'reading',
  essay: 'essay', essayWrite: 'essay',
  all: 'all',
  mistakes: 'mistakes', 'mistake-review': 'mistakes',
  myposts: 'posts', post: 'post'
};

/* 模块 → 落点：登录落地与锁页出口都按此顺序取「第一个有权限的」 */
export const MOD_ROUTE = [
  ['home',     'home',    '首页'],
  ['daily',    'daily',   '每日任务'],
  ['reading',  'reading', '阅读'],
  ['essay',    'essay',   '作文'],
  ['all',      'all',     '全科'],
  ['mistakes', 'mistakes', '我的错题'],
  ['posts',    'myposts', '我的记录']
];

function presetOf(k) {
  const key = PERM_PRESETS[k] ? k : 'full';
  return { preset: key, mods: { ...PERM_PRESETS[key].mods } };
}

/* 老会话 / 访客没有 perm → 按全功能走，不误锁 */
export function loadPerm(s) {
  const raw = s && s.perm;
  if (!raw) return presetOf('full');
  if (typeof raw === 'string') return presetOf(raw);
  const src = raw.mods || {};
  const out = {};
  PERM_MODS.forEach((k) => { out[k] = src[k] ? 1 : 0; });
  return { preset: raw.preset || 'full', mods: out };
}

export const perm = reactive(loadPerm(auth.user));

/* 登录 / 登出 / 切换账号后重新装载 */
export function syncPerm(session) {
  const next = loadPerm(session);
  perm.preset = next.preset;
  perm.mods = next.mods;
}

export function can(mod) {
  return !mod || !!(perm.mods && perm.mods[mod]);
}

/* 当前路由对应的模块是否放行 */
export function canPage(page) {
  return can(PAGE_MOD[page]);
}

/* 登录落地 / 锁页出口：第一个有权限的页面（全关时兜底到我的记录） */
export function firstAllowed() {
  for (const [mod, name, label] of MOD_ROUTE) {
    if (can(mod)) return { name, label };
  }
  return { name: 'myposts', label: '我的记录' };
}

export const permLabel = computed(() => (PERM_PRESETS[perm.preset] || {}).label || '自定义');

/* 原型期调试：?perm=full|learn|task|readonly —— 模拟后台下发不同权限。
   Vue 版从地址栏 search 读（?perm=x#/home），只改当前会话，不落盘。 */
export function applyPermQuery(session) {
  if (!session) return session;
  let q = null;
  try { q = new URLSearchParams(window.location.search).get('perm'); } catch (e) { return session; }
  if (!q || !PERM_PRESETS[q.toLowerCase()]) return session;
  session.perm = q.toLowerCase();
  return session;
}
