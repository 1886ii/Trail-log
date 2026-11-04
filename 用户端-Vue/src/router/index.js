/* ============================================================
   路由表
   ------------------------------------------------------------
   · hash 模式：正式版单端口同源托管（Spring Boot static/）时不用配 fallback
   · meta.page   → 写进 <body data-page>，让 style.css 里既有的
                    body[data-page="xxx"] 规则原样生效（这是零改样式迁移的关键）
   · meta.nav    → 顶栏高亮项（练习/单词/作答这些落地页归到「每日任务」）
   · meta.public → 免登录（目前只有登录页）
   ============================================================ */
import { createRouter, createWebHashHistory } from 'vue-router';
import { auth, ensureGuest } from '../lib/session.js';
import { syncPerm, firstAllowed, applyPermQuery } from '../lib/perm.js';

import LoginView from '../views/LoginView.vue';
import HomeView from '../views/HomeView.vue';
import MistakesView from '../views/MistakesView.vue';
import DailyView from '../views/DailyView.vue';
import WordsView from '../views/WordsView.vue';
import PracticeView from '../views/PracticeView.vue';
import AnswerView from '../views/AnswerView.vue';
import ReadingView from '../views/ReadingView.vue';
import ReadView from '../views/ReadView.vue';
import CalcView from '../views/CalcView.vue';
import EssayView from '../views/EssayView.vue';
import EssayWriteView from '../views/EssayWriteView.vue';
import AllView from '../views/AllView.vue';
import PostView from '../views/PostView.vue';
import MyPostsView from '../views/MyPostsView.vue';
import MeView from '../views/MeView.vue';
import MeEditView from '../views/MeEditView.vue';
import PosterView from '../views/PosterView.vue';
import MistakeReviewView from '../views/MistakeReviewView.vue';
import ComingSoon from '../views/ComingSoon.vue';

const routes = [
  { path: '/', redirect: { name: 'home' } },

  { path: '/login', name: 'login', component: LoginView,
    meta: { page: 'auth', layout: 'auth', public: true, title: '登录' } },

  { path: '/home', name: 'home', component: HomeView,
    meta: { page: 'home', nav: 'home', title: '首页', wide: true } },

  { path: '/daily', name: 'daily', component: DailyView,
    meta: { page: 'daily', nav: 'daily', title: '每日任务' } },
  { path: '/practice', name: 'practice', component: PracticeView,
    meta: { page: 'practice', nav: 'daily', title: '每日题目' } },
  { path: '/answer', name: 'answer', component: AnswerView,
    meta: { page: 'answer', nav: 'daily', title: '作答' } },
  { path: '/words', name: 'words', component: WordsView,
    meta: { page: 'words', nav: 'daily', title: '单词' } },
  { path: '/calc', name: 'calc', component: CalcView,
    meta: { page: 'calc', nav: 'daily', title: '每日计算', narrow: true } },

  { path: '/reading', name: 'reading', component: ReadingView,
    meta: { page: 'reading', nav: 'reading', title: '阅读' } },
  { path: '/read', name: 'read', component: ReadView,
    meta: { page: 'read', nav: 'reading', title: '阅读正文' } },

  { path: '/essay', name: 'essay', component: EssayView,
    meta: { page: 'essay', nav: 'essay', title: '作文', narrow: true } },
  { path: '/essay-write', name: 'essayWrite', component: EssayWriteView,
    meta: { page: 'essayWrite', nav: 'essay', title: '写作文', narrow: true } },

  { path: '/all', name: 'all', component: AllView,
    meta: { page: 'all', nav: 'all', title: '全科' } },

  { path: '/post', name: 'post', component: PostView,
    meta: { page: 'post', title: '发布记录', wide: true } },
  { path: '/my-posts', name: 'myposts', component: MyPostsView,
    meta: { page: 'myposts', title: '我的记录', wide: true } },

  { path: '/me', name: 'me', component: MeView,
    meta: { page: 'me', title: '个人中心' } },
  { path: '/me-edit', name: 'meEdit', component: MeEditView,
    meta: { page: 'meEdit', title: '编辑资料' } },
  { path: '/poster', name: 'poster', component: PosterView,
    meta: { page: 'poster', title: '周报海报', docTitle: '学迹 · 每周学习报告', layout: 'bare', public: true } },

  { path: '/mistakes', name: 'mistakes', component: MistakesView,
    meta: { page: 'mistakes', title: '我的错题' } },
  { path: '/mistake-review', name: 'mistake-review', component: MistakeReviewView,
    meta: { page: 'mistake-review', title: '错题复习' } },

  { path: '/:pathMatch(.*)*', redirect: { name: 'home' } }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, saved) {
    if (saved) return saved;
    if (to.path === from.path) return;
    return { top: 0 };
  }
});

router.beforeEach((to) => {
  const real = !!(auth.user && !auth.user.guest);

  /* 内页拿不到会话时不硬弹登录，降级为访客（与旧原型一致） */
  if (!to.meta.public && !auth.user) ensureGuest();

  /* 每次进来都按会话重算权限（管理端改档后刷新即生效） */
  syncPerm(applyPermQuery(auth.user));

  /* 已真正登录的人再进登录页 → 按权限落到第一个可用页；访客允许进登录页 */
  if (to.name === 'login' && real) {
    return { name: firstAllowed().name };
  }
  return true;
});

router.afterEach((to) => {
  /* style.css 里大量规则挂在 body[data-page] 上，这一行是视觉一致的前提 */
  document.body.setAttribute('data-page', to.meta.page || '');
  document.title = to.meta.docTitle
    || (to.meta.title ? to.meta.title + ' · 学迹' : '学迹');
});

export default router;
