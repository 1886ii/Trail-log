/* ============================================================
   显示层小工具（错题 / 作答 / 复习页共用）
   ============================================================ */

export const SUBJ_C = {
  '语文': 'var(--c-cn)',  '数学': 'var(--c-math)', '英语': 'var(--c-en)',
  '物理': 'var(--c-phy)', '化学': 'var(--c-che)',  '生物': 'var(--c-bio)',
  '历史': 'var(--c-his)', '道法': 'var(--c-pol)',  '地理': 'var(--c-geo)'
};

export const LETTER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

/* 纯文本转义：模板里一律用 v-text / 插值，这里是给「题库里带 HTML 的字段」用 */
export function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* 题干里的 {{1}} 空位 → ＿＿，并剥掉所有标签 */
export function plain(html) {
  return String(html || '').replace(/<[^>]*>/g, '').replace(/\{\{\d+\}\}/g, '＿＿')
    .replace(/\s+/g, ' ').trim();
}

export function cut(s, n) {
  s = String(s || '');
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function ago(ts) {
  if (!ts) return '—';
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1)   return '刚刚';
  if (m < 60)  return m + ' 分钟前';
  const h = Math.floor(m / 60);
  if (h < 24)  return h + ' 小时前';
  const dd = Math.floor(h / 24);
  if (dd < 30) return dd + ' 天前';
  const dt = new Date(ts);
  return (dt.getMonth() + 1) + ' 月 ' + dt.getDate() + ' 日';
}

export function fmtDate(ts) {
  const d = new Date(ts);
  return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日';
}

/* 选择题 id 数组 → 字母（A/B/C…） */
export function choiceLetters(item, ids) {
  const arr = [].concat(ids || []);
  return arr.map((id) => {
    const i = (item.options || []).findIndex((o) => o.id === id);
    return i >= 0 ? LETTER[i] : '?';
  });
}

/* 学生答案翻成人话（返回纯文本；「未作答」由调用方决定样式） */
export function answerText(item, ans) {
  if (ans == null) return '';
  if (item.type === 'choice') {
    const arr = [].concat(ans);
    return arr.length ? choiceLetters(item, arr).join('、') : '';
  }
  if (item.type === 'fill_blank') {
    return (item.blanks || []).map((b) => {
      const v = ans[b.n];
      return b.label + ' ' + (v == null || v === '' ? '未填' : v);
    }).join('　');
  }
  return String(ans).trim();
}

/* 正确答案翻成人话 */
export function rightAnswerText(item) {
  if (item.type === 'choice') {
    return (item.answer || []).map((id) => {
      const i = (item.options || []).findIndex((o) => o.id === id);
      if (i < 0) return '';
      return LETTER[i] + '· ' + plain(item.options[i].text);
    }).filter(Boolean).join('　');
  }
  if (item.type === 'fill_blank') {
    return (item.blanks || []).map((b) => {
      return b.label + ' ' + (b.accept && b.accept[0] ? b.accept[0] : '—');
    }).join('　');
  }
  if (item.answer_text) return cut(plain(item.answer_text), 140);
  return (item.rubric || []).map((r) => r.point).join('；') || '按采分点判分';
}
