/* ============================================================
   个人资料
   ------------------------------------------------------------
   原型存 localStorage('xj-profile')，正式版走后端 profile 接口。
   字段取舍唯一硬标准：有没有消费者（出题 / 提醒 / 界面 / 账号安全）；
   真正进提示词的只有 6 个：年级、教材版本、当前单元、主攻科目、目标分、距大考天数。
   —— 与管理端建档共用同一套字段（展示身份 / 学业档案 / 目标与节奏 / 管理）。
   ============================================================ */
import { stGet, stSet } from './storage.js';
import { getSession } from './session.js';

export const PROFILE_KEY = 'xj-profile';

/* 九门：on=出每日任务 / focus=重点 / progress=当前进度 / target=目标分 */
export const SUBJECT_LIST = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '道法', '地理'];
export const SUBJECT_DEFAULT_ON = ['语文', '数学', '英语'];

export const PROFILE_DEFAULT = {
  avatar: '', nickname: '小宇', realName: '', gender: '', signature: '',
  grade: '初三', term: '上学期', textbook: '人教版',
  subjects: null,
  examDate: '', startTime: '20:00', dailyCount: '10', restDay: '周日',
  fontSize: '标准', readAloud: true, notify: true
};

export function makeSubjects() {
  return SUBJECT_LIST.map((n) => ({
    name: n,
    on: SUBJECT_DEFAULT_ON.indexOf(n) >= 0,
    focus: false,
    progress: '',
    target: ''
  }));
}

/* 单科满分 150；留空 = 不设目标，超界/非法一律当没填 */
export function cleanTarget(v) {
  const n = parseFloat(v);
  if (!(n > 0) || n > 150) return '';
  return String(Math.round(n));
}

export function mergeSubjects(saved) {
  const out = makeSubjects();
  const byName = {};
  out.forEach((s) => { byName[s.name] = s; });

  if (Array.isArray(saved.subjects)) {
    saved.subjects.forEach((s) => {
      const t = byName[s && s.name];
      if (!t) return;
      t.on = !!s.on;
      t.focus = !!s.focus;
      t.progress = s.progress || '';
      t.target = cleanTarget(s.target);
    });
    return out;
  }

  /* 旧结构（mainSubjects / practiceSubjects）一次性升级 */
  const oldOn = Array.isArray(saved.practiceSubjects) ? saved.practiceSubjects : null;
  const oldFocus = Array.isArray(saved.mainSubjects) ? saved.mainSubjects : null;
  if (oldOn) out.forEach((s) => { s.on = oldOn.indexOf(s.name) >= 0; });
  if (oldFocus) out.forEach((s) => { s.focus = oldFocus.indexOf(s.name) >= 0; });
  return out;
}

export function readProfile() {
  const p = {};
  Object.keys(PROFILE_DEFAULT).forEach((k) => {
    const v = PROFILE_DEFAULT[k];
    p[k] = Array.isArray(v) ? v.slice() : v;
  });
  p.subjects = makeSubjects();

  const s = getSession();
  if (s && s.name && !s.guest) p.nickname = s.name;

  let saved = null;
  try { saved = JSON.parse(stGet(PROFILE_KEY) || 'null'); } catch (e) {}
  if (saved && typeof saved === 'object') {
    Object.keys(saved).forEach((k) => {
      if (saved[k] === undefined || saved[k] === null) return;
      if (k === 'subjects') return;
      if (k in p) p[k] = saved[k];
    });
    p.subjects = mergeSubjects(saved);
  }
  return p;
}

export function writeProfile(p) { stSet(PROFILE_KEY, JSON.stringify(p)); }

export function onSubjects(p) { return p.subjects.filter((s) => s.on); }
export function focusSubjects(p) { return p.subjects.filter((s) => s.on && s.focus); }

export function targetSum(p) {
  let n = 0;
  onSubjects(p).forEach((s) => {
    const v = parseFloat(s.target);
    if (!isNaN(v) && v > 0) n += Math.min(v, 150);
  });
  return n;
}

export function daysTo(dateStr) {
  if (!dateStr) return 0;
  const t = new Date(dateStr + 'T00:00:00');
  if (isNaN(t.getTime())) return 0;
  return Math.max(0, Math.ceil((t - new Date()) / 86400000));
}

/* 头像：裁 1:1 缩到 256×256 再存 dataURL（约 20–40KB）。
   正式版改为上传对象存储、库里只存 URL */
export function compressAvatar(file) {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const S = 256, c = document.createElement('canvas');
        c.width = S; c.height = S;
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
        c.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, S, S);
        try { resolve(c.toDataURL('image/jpeg', 0.82)); } catch (e) { resolve(''); }
      };
      img.onerror = () => resolve('');
      img.src = fr.result;
    };
    fr.onerror = () => resolve('');
    fr.readAsDataURL(file);
  });
}

export function pickImage(camera) {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (camera) input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', async () => {
      const f = input.files && input.files[0];
      const src = f ? await compressAvatar(f) : '';
      if (input.parentNode) input.parentNode.removeChild(input);
      if (src) resolve(src);
    });
    input.click();
  });
}

/* 字号偏好：给 body 挂 class，CSS 里用 zoom 缩放内容区 */
export function applyPrefs(p) {
  const cls = document.body.classList;
  const pref = p || readProfile();
  cls.toggle('fs-small', pref.fontSize === '小');
  cls.toggle('fs-large', pref.fontSize === '大');
}
