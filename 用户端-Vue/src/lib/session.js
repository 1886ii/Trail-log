/* ============================================================
   登录态与演示账号
   —— 正式版：POST /api/auth/login { account, password } → { name, role, perm, token }
   —— 账号由家长在管理端建档时开好（1 账号 = 1 学生），没有绑定码这一步
   ============================================================ */
import { reactive } from 'vue';
import { stGet, stSet, stDel } from './storage.js';

const SESSION_KEY  = 'xj-session';
const REMEMBER_KEY = 'xj-remember';
const ACT_KEY      = 'xj-activated';

/* 与管理端 seed 里的学生一一对应；改这里要同步改管理端的账号 */
export const DEMO_ACCOUNTS = [
  { account: 'jiayu',    pwd: '815203', name: '小宇', initial: '宇', role: '初三 · 学生', perm: 'full' },
  { account: 'yutong',   pwd: '604712', name: '小雨', initial: '雨', role: '初一 · 学生', perm: 'learn' },
  { account: 'xiaozhou', pwd: '390845', name: '小舟', initial: '舟', role: '初一 · 学生', perm: 'readonly' }
];

export function getSession() {
  try { return JSON.parse(stGet(SESSION_KEY) || 'null'); } catch (e) { return null; }
}
export function setSession(s) { stSet(SESSION_KEY, JSON.stringify(s)); }
export function clearSession() { stDel(SESSION_KEY); }

export function findAccount(acc) {
  const k = String(acc || '').trim().toLowerCase();
  return DEMO_ACCOUNTS.find((a) => a.account === k) || null;
}

/* 首次登录 = 激活：管理端「激活状态」据此点亮。返回 true 表示这次是第一次 */
export function markActivated(account) {
  let list = [];
  try { list = JSON.parse(stGet(ACT_KEY) || '[]') || []; } catch (e) { list = []; }
  if (list.indexOf(account) >= 0) return false;
  list.push(account);
  stSet(ACT_KEY, JSON.stringify(list));
  return true;
}

/* 全局响应式登录态：顶栏 / 路由守卫 / 个人中心都读这一个来源 */
export const auth = reactive({
  user: getSession(),
  remembered: stGet(REMEMBER_KEY) || ''
});

/**
 * 拿不到会话时降级为访客，而不是把人硬弹回登录页。
 * —— 原型阶段 localStorage 可能因站点隔离 / 隐私模式 / 定期清理而丢失，
 *    硬弹的体验极差；访客能浏览，只是发帖与草稿不落盘。
 * 真实登录后这个会话会被覆盖。
 */
export function ensureGuest() {
  if (auth.user) return auth.user;
  const g = {
    account: 'guest', name: '访客', initial: '客',
    role: '未登录 · 试看模式', perm: 'full', guest: true, loginAt: Date.now()
  };
  setSession(g);
  auth.user = g;
  return g;
}

/**
 * 校验并登录。
 * 返回 { ok:true, first } 或 { ok:false, field:'account'|'password', msg }
 */
export function login(acc, pwd, remember) {
  const a = String(acc || '').trim();
  if (!a)        return { ok: false, field: 'account',  msg: '请输入账号' };
  if (!pwd)      return { ok: false, field: 'password', msg: '请输入密码' };
  if (pwd.length < 6) return { ok: false, field: 'password', msg: '密码至少 6 位' };

  const hit = findAccount(a);
  if (!hit)          return { ok: false, field: 'account',  msg: '没有这个账号。请用家长在管理端建档时开好的账号登录。' };
  if (pwd !== hit.pwd) return { ok: false, field: 'password', msg: '账号或密码不正确，请重新输入' };

  if (remember) stSet(REMEMBER_KEY, a);
  else          stDel(REMEMBER_KEY);
  auth.remembered = remember ? a : '';

  const first = markActivated(hit.account);
  const user = {
    account: hit.account,
    name:    hit.name,
    initial: hit.initial,
    role:    hit.role,
    perm:    hit.perm,
    first,
    loginAt: Date.now()
  };
  setSession(user);
  auth.user = user;
  return { ok: true, first };
}

export function signOut() {
  clearSession();
  auth.user = null;
}
