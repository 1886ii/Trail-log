/* ============================================================
   导航与页面标题（唯一数据源）
   —— 五个去处：首页 / 每日任务 / 阅读 / 作文 / 全科。
      每日任务把「每日题目 · 单词 · 阅读 · 作文 · 计算」收进一处；
      练习、单词是任务的落地页，不占导航。
      「我的」不占导航 → 点右上角头像进个人中心。
   ============================================================ */
import { reactive } from 'vue';

export const NAV = [
  { id: 'home',    label: '首页',     name: 'home',    iconName: 'home'  },
  { id: 'daily',   label: '每日任务', name: 'daily',   iconName: 'check' },
  { id: 'reading', label: '阅读',     name: 'reading', iconName: 'book'  },
  { id: 'essay',   label: '作文',     name: 'essay',   iconName: 'doc'   },
  { id: 'all',     label: '全科',     name: 'all',     iconName: 'grid'  }
];

/* 页面标题：key 沿用旧原型的页面 id，路由里用 meta.page 对齐 */
export const TOPBAR = {
  home:     { title: '',                sub: '记录今天的点滴' },
  daily:    { title: '每日任务',        sub: '每日题目 · 单词 · 阅读 · 作文 · 每日计算' },
  practice: { title: '每日题目',        sub: '选择 · 填空 · 简答 · 材料，四类模板覆盖九科' },
  answer:   { title: '作答',            sub: '即时反馈 · 逐空讲解 · 采分点判分' },
  words:    { title: '每日必备单词',    sub: '背诵 · 检查 · 扩展' },
  reading:  { title: '阅读',            sub: '打卡 · 目录 · 读完弹一问（书目可配题）' },
  read:     { title: '阅读正文',        sub: '伴读 · 读完打卡，节奏自己定' },
  essay:    { title: '作文',            sub: '作文任务 · 优秀作文 · 批改结果' },
  essayWrite: { title: '写作文',        sub: '写作 · AI 评阅 · 人工审核 · 结果' },
  calc:     { title: '每日计算',        sub: '拍照上传 · AI 评阅 · 错因讲解' },
  all:      { title: '全科',            sub: '九门科目 · 掌握度一览' },
  post:     { title: '发布记录',        sub: '图片 · 感想 · 笔记，今天的样子值得留一条痕迹' },
  me:       { title: '个人中心',        sub: '成长记录 · 账号 · 偏好 · 数据' },
  myposts:  { title: '我的记录',        sub: '我发布的图文 · 笔记 · 随感' },
  mistakes: { title: '我的错题',        sub: '错过的题集中复习 · 做对一次就算订正' },
  'mistake-review': { title: '错题复习', sub: '只复习错过的题 · 答对一次就算订正，答错退回最短间隔' },
  meEdit:   { title: '编辑资料',        sub: '身份 · 学业 · 目标，改完记得保存' }
};

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 5)  return '夜深了';
  if (h < 11) return '早上好';
  if (h < 13) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

export function todayText(d = new Date()) {
  const w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 ' + w;
}

export function pageTitle(page, userName) {
  const info = TOPBAR[page] || { title: '', sub: '' };
  return info.title || (greeting() + '，' + (userName || '同学'));
}

/* 页面可以临时接管副标题（旧原型里 bindTodos 会改 .js-sub 显示「今天还有 N 件事」）。
   按页面 id 分开存，换页不会串味；不设置就回落到 TOPBAR 的静态 sub。 */
const subOverride = reactive({});

export function setPageSub(page, text) {
  if (text == null) delete subOverride[page];
  else subOverride[page] = text;
}

export function pageSub(page) {
  if (subOverride[page]) return subOverride[page];
  const info = TOPBAR[page] || { title: '', sub: '' };
  return info.sub || todayText();
}
