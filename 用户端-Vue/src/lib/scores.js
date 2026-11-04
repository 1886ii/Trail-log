/* ============================================================
   考试成绩（个人中心 · 成绩进步路线）
   ------------------------------------------------------------
   原型存 localStorage('xj-scores')；正式版两张表：
   exam(id, name, date) + exam_score(exam_id, subject, score)。
   满分按 150 分制（中考口径）。
   ============================================================ */
import { stGet, stSet } from './storage.js';
import { SUBJECT_LIST, SUBJECT_DEFAULT_ON, readProfile } from './profile.js';

const SCORES_KEY = 'xj-scores';

export const SUBJ_COLOR = {
  '语文': 'var(--c-cn)', '数学': 'var(--c-math)', '英语': 'var(--c-en)',
  '物理': 'var(--c-phy)', '化学': 'var(--c-che)', '生物': 'var(--c-bio)',
  '历史': 'var(--c-his)', '道法': 'var(--c-pol)', '地理': 'var(--c-geo)'
};
export function subjColor(n) { return SUBJ_COLOR[n] || 'var(--brand)'; }

export const SCORES_DEMO = [
  { name: '4月月考', date: '2026-04-10', s: { '语文': 102, '数学': 112, '英语': 105 } },
  { name: '期中考试', date: '2026-05-08', s: { '语文': 108, '数学': 120, '英语': 118 } },
  { name: '5月月考', date: '2026-06-05', s: { '语文': 105, '数学': 124, '英语': 128 } },
  { name: '6月月考', date: '2026-07-03', s: { '语文': 112, '数学': 130, '英语': 132 } },
  { name: '期末考试', date: '2026-08-07', s: { '语文': 116, '数学': 133, '英语': 136 } },
  { name: '开学考试', date: '2026-09-04', s: { '语文': 124, '数学': 142, '英语': 135 } }
];

export function sortSubjects(list) {
  const seen = {};
  return list.filter((n) => {
    if (seen[n] || SUBJECT_LIST.indexOf(n) < 0) return false;
    seen[n] = 1; return true;
  }).sort((a, b) => SUBJECT_LIST.indexOf(a) - SUBJECT_LIST.indexOf(b));
}

export function readScores() {
  let saved = null;
  try { saved = JSON.parse(stGet(SCORES_KEY) || 'null'); } catch (e) {}
  if (saved && typeof saved === 'object') {
    const subs = (Array.isArray(saved.subjects) && saved.subjects.length)
      ? sortSubjects(saved.subjects) : SUBJECT_DEFAULT_ON.slice();
    const exams = Array.isArray(saved.exams) ? saved.exams.slice() : [];
    exams.sort((a, b) => ((a.date || '') < (b.date || '') ? -1 : 1));
    return { subjects: subs, exams };
  }
  return {
    subjects: SUBJECT_DEFAULT_ON.slice(),
    exams: SCORES_DEMO.map((x) => ({ name: x.name, date: x.date, s: { ...x.s } }))
  };
}
export function writeScores(d) { stSet(SCORES_KEY, JSON.stringify(d)); }

/* 各科目标线：只给填了目标分的科目出线，不虚构参考值 */
export function scoreGoals(subs) {
  const p = readProfile();
  const out = [];
  subs.forEach((n) => {
    const s = p.subjects.find((x) => x.name === n);
    if (!s) return;
    const v = parseFloat(s.target);
    if (!(v > 0)) return;
    out.push({ name: n, value: Math.min(Math.round(v), 150) });
  });
  return out;
}

export function isoDate(d) {
  const m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}
