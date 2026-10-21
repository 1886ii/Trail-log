/* ============================================================
   学迹 · 用户端（Web）
   1) 登录态：localStorage['xj-session']
   2) 未登录访问内页 → 自动跳回登录页
   3) 导航项只定义一次（NAV），统一渲染在页面顶部
      <768px：品牌行 + 导航行（竖排图标）
      ≥768px：收成一行（品牌 | 导航 | 操作）
   ============================================================ */

/* ---------- 图标（内联 SVG，零外部依赖） ---------- */
var ICO = {
  check:  '<circle cx="12" cy="12" r="8.6"/><path d="M8.4 12.3 11 14.9 15.7 9.7"/>',
  pencil: '<path d="M4.5 19.5h4L19 9a1.9 1.9 0 0 0 0-2.7l-1.3-1.3A1.9 1.9 0 0 0 15 5L4.5 15.5v4z"/><path d="M13.6 6.4 17.6 10.4"/>',
  card:   '<rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2.6"/><path d="M8.6 15.2 12 8.4l3.4 6.8"/><path d="M9.9 13.2h4.2"/>',
  book:   '<path d="M12 6.6C10.4 5.4 8.5 4.9 6 4.9H4.2v12.6H6.4c2.2 0 3.9.5 5.6 1.6"/><path d="M12 6.6c1.6-1.2 3.5-1.7 6-1.7h1.8v12.6h-2.2c-2.2 0-3.9.5-5.6 1.6"/><path d="M12 6.6v12.5"/>',
  doc:    '<path d="M6.6 3.4h6.9l4.9 4.9v12.3H6.6z"/><path d="M13.3 3.5v5.1h5.1"/><path d="M9.6 13.2h4.8M9.6 16.5h3.2"/>',
  mistake:'<path d="M6.6 3.4h6.9l4.9 4.9v12.3H6.6z"/><path d="M13.3 3.5v5.1h5.1"/><path d="M9.8 12.4l4.4 4.4M14.2 12.4l-4.4 4.4"/>',
  trend:  '<path d="M4.2 16.6 9.7 11l3.6 3.6 6.5-6.6"/><path d="M15.2 8h4.6v4.6"/>',
  user:   '<circle cx="12" cy="8.4" r="3.6"/><path d="M5 19.8c0-3.5 3.1-5.9 7-5.9s7 2.4 7 5.9"/>',
  sun:    '<circle cx="12" cy="12" r="4"/><path d="M12 2.6v2.2M12 19.2v2.2M2.6 12h2.2M19.2 12h2.2M5.4 5.4l1.6 1.6M17 17l1.6 1.6M18.6 5.4 17 7M7 17l-1.6 1.6"/>',
  moon:   '<path d="M20 13.4A8.2 8.2 0 0 1 10.6 4a8.2 8.2 0 1 0 9.4 9.4z"/>',
  logout: '<path d="M15 8.4V6.2A1.7 1.7 0 0 0 13.3 4.5H6.2A1.7 1.7 0 0 0 4.5 6.2v11.6a1.7 1.7 0 0 0 1.7 1.7h7.1a1.7 1.7 0 0 0 1.7-1.7v-2.2"/><path d="M9.4 12h10.1"/><path d="M16.9 9.2 19.7 12l-2.8 2.8"/>',
  clock:  '<circle cx="12" cy="12" r="8.6"/><path d="M12 7.4V12l3 1.8"/>',
  fire:   '<path d="M12 3.4c3 3.1 5.4 5.4 5.4 8.6a5.4 5.4 0 0 1-10.8 0c0-1.4.5-2.6 1.4-3.7.4 1 .9 1.7 1.7 2.1-.3-2.6.7-5.1 2.3-7z"/>',
  flag:   '<path d="M6.2 20.2V4.4"/><path d="M6.2 5.2h10.4l-.9 3.4.9 3.4H6.2"/>',
  chart:  '<path d="M4.4 19.6h15.2"/><path d="M7.6 19.6v-6.2M12 19.6V7.4M16.4 19.6v-4.1"/>',
  target: '<circle cx="12" cy="12" r="8.4"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1"/>',
  spark:  '<path d="M12 3.6l1.9 5.3 5.3 1.9-5.3 1.9L12 18l-1.9-5.3L4.8 10.8l5.3-1.9z"/><path d="M18.6 16.4l.7 1.9 1.9.7-1.9.7-.7 1.9-.7-1.9-1.9-.7 1.9-.7z"/>',
  eyeOn:  '<path d="M2.6 12S6 6.6 12 6.6 21.4 12 21.4 12 18 17.4 12 17.4 2.6 12 2.6 12z"/><circle cx="12" cy="12" r="2.8"/>',
  eyeOff: '<path d="M4 4l16 16"/><path d="M9.9 5.1A9.6 9.6 0 0 1 12 4.9c6 0 9.4 7.1 9.4 7.1a17 17 0 0 1-3 3.9"/><path d="M6.5 6.6A17 17 0 0 0 2.6 12s3.4 7.1 9.4 7.1a9.3 9.3 0 0 0 3.9-.85"/><path d="M9.9 9.9a2.8 2.8 0 0 0 4 4"/>',
  home:   '<path d="M4.4 10.2 12 4l7.6 6.2v8a1.4 1.4 0 0 1-1.4 1.4h-3.8v-5.8H9.6v5.8H5.8a1.4 1.4 0 0 1-1.4-1.4z"/>',
  grid:   '<rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/>',
  chevD:  '<path d="M7 10l5 5 5-5"/>',
  back:   '<path d="M14.6 5.6 8.2 12l6.4 6.4"/>',
  camera: '<path d="M4.6 8.6h2.5l1.3-2.1h7.2l1.3 2.1h2.5A1.5 1.5 0 0 1 20.9 10v7.5a1.5 1.5 0 0 1-1.5 1.5H4.6a1.5 1.5 0 0 1-1.5-1.5V10a1.5 1.5 0 0 1 1.5-1.4z"/><circle cx="12.7" cy="13.6" r="3.1"/>'
};

function svg(d, cls) {
  return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
         'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
}

/* ---------- 导航配置（唯一数据源，全站共用） ----------
   五个去处：首页 / 每日任务 / 阅读 / 作文 / 全科。
   每日任务把「每日题目 · 每日必备单词 · 每日阅读任务」收进一处，
   再配一张 todolist；练习、单词作为任务的落地页，不占导航。
   「我的」不占导航 → 点右上角头像出下拉菜单进入个人中心，
   成长记录已并入个人中心。                                      */
var NAV = [
  { id: 'home',    label: '首页',     href: 'home.html',    icon: ICO.home  },
  { id: 'daily',   label: '每日任务', href: 'daily.html',   icon: ICO.check },
  { id: 'reading', label: '阅读',     href: 'reading.html', icon: ICO.book  },
  { id: 'essay',   label: '作文',     href: 'essay.html',   icon: ICO.doc   },
  { id: 'all',     label: '全科',     href: 'all.html',     icon: ICO.grid  }
];

/* ---------- 各页标题（首页 today 的动态生成） ---------- */
var TOPBAR = {
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

/* ---------- 学生信息（登录成功后由会话填充） ---------- */
var USER = { name: '同学', initial: '同', role: '初三 · 学生' };

/* ============================================================
   功能权限 —— 「导航照常在，进去是一把锁」
   ------------------------------------------------------------
   家长在管理端给每个学生开/关 8 个模块，登录时随会话下发
   （正式版由 GET /api/me 返回）。这里只负责「进不进得去」：
   没权限的页面，顶栏与导航完全不动，只把内容区换成一把锁。
   注意：前端锁是体验，不是安全 —— 真正的门在后端接口鉴权。
   ============================================================ */
var PERM_PRESETS = {
  full:     { label: '全功能',   mods: { home:1, daily:1, reading:1, essay:1, all:1, mistakes:1, posts:1, post:1 } },
  learn:    { label: '学习专注', mods: { home:1, daily:1, reading:1, essay:1, all:1, mistakes:1, posts:1, post:0 } },
  task:     { label: '只做任务', mods: { home:1, daily:1, reading:0, essay:0, all:0, mistakes:0, posts:0, post:0 } },
  readonly: { label: '仅看记录', mods: { home:0, daily:0, reading:0, essay:0, all:0, mistakes:0, posts:1, post:0 } }
};

var PERM_MODS = ['home', 'daily', 'reading', 'essay', 'all', 'mistakes', 'posts', 'post'];

/* data-page → 权限模块。不在表内的页面永不锁：
   个人中心 / 编辑资料 / 周报海报 / 登录页 —— 锁了孩子就退不出登录了 */
var PAGE_MOD = {
  home: 'home',
  daily: 'daily', practice: 'daily', words: 'daily', calc: 'daily', answer: 'daily',
  reading: 'reading', read: 'reading',
  essay: 'essay', essayWrite: 'essay',
  all: 'all',
  mistakes: 'mistakes', 'mistake-review': 'mistakes',
  myposts: 'posts', post: 'post'
};

/* 模块 → 落点：登录落地与锁页出口都按此顺序取「第一个有权限的」 */
var MOD_PAGE = [
  ['home',     'home.html',     '首页'],
  ['daily',    'daily.html',    '每日任务'],
  ['reading',  'reading.html',  '阅读'],
  ['essay',    'essay.html',    '作文'],
  ['all',      'all.html',      '全科'],
  ['mistakes', 'mistakes.html', '我的错题'],
  ['posts',    'my-posts.html', '我的记录']
];

/* 当前生效的权限（boot 时按会话填充） */
var PERM = { preset: 'full', mods: null };

function permPreset(k) {
  var key = PERM_PRESETS[k] ? k : 'full';
  return { preset: key, mods: JSON.parse(JSON.stringify(PERM_PRESETS[key].mods)) };
}

/* 老会话 / 访客没有 perm → 按全功能走，不误锁 */
function loadPerm(s) {
  var raw = s && s.perm;
  if (!raw) return permPreset('full');
  if (typeof raw === 'string') return permPreset(raw);
  var src = raw.mods || {}, out = {};
  PERM_MODS.forEach(function (k) { out[k] = src[k] ? 1 : 0; });
  return { preset: raw.preset || 'full', mods: out };
}

function can(mod) { return !mod || !!(PERM.mods && PERM.mods[mod]); }

/* 登录落地 / 锁页出口：第一个有权限的页面（全关时兜底到我的记录） */
function firstAllowed() {
  for (var i = 0; i < MOD_PAGE.length; i++) {
    if (can(MOD_PAGE[i][0])) return { href: MOD_PAGE[i][1], label: MOD_PAGE[i][2] };
  }
  return { href: 'my-posts.html', label: '我的记录' };
}

/* 原型期调试：?perm=full|learn|task|readonly —— 模拟后台下发不同权限 */
function applyPermQuery(s) {
  var q = (location.search.match(/[?&]perm=([a-z]+)/i) || [])[1];
  if (!q || !PERM_PRESETS[q.toLowerCase()]) return s;
  s.perm = q.toLowerCase();
  setSession(s);
  return s;
}

/* 锁页：只动内容区，顶栏导航一点不碰 */
function renderLock() {
  var content = document.querySelector('.content');
  if (!content) return;
  content.classList.add('is-locked');

  var next = firstAllowed();
  var box = document.createElement('div');
  box.className = 'lock-screen';
  box.innerHTML =
    '<div class="lock-ico">' +
      '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" ' +
        'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
        '<rect x="4" y="10.5" width="16" height="10" rx="2.4"/>' +
        '<path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>' +
      '</svg>' +
    '</div>' +
    '<h2 class="lock-title">这个功能还没有开放</h2>' +
    '<p class="lock-sub">需要家长在管理端为你开启后才能使用</p>' +
    '<a class="lock-btn" href="' + next.href + '">去' + next.label + '</a>';
  content.appendChild(box);
}

/* ============================================================
   登录态
   ============================================================ */
var SESSION_KEY  = 'xj-session';
var REMEMBER_KEY = 'xj-remember';

/* ---------- 安全存储：localStorage 不可用（被隔离/禁用/清空）时自动降级，
   读写永不抛错 —— 这是「登录后又被弹回登录页」的根治之一 ---------- */
var memStore = {};                     /* 最后兜底：内存（仅本次页面有效） */

function stGet(k) {
  try { var v = localStorage.getItem(k);    if (v !== null) return v; } catch (e) {}
  try { var v2 = sessionStorage.getItem(k); if (v2 !== null) return v2; } catch (e) {}
  return (k in memStore) ? memStore[k] : null;
}
function stSet(k, v) {
  memStore[k] = v;
  try { localStorage.setItem(k, v); return; } catch (e) {}
  try { sessionStorage.setItem(k, v); } catch (e) {}   /* 尽力而为 */
}
function stDel(k) {
  delete memStore[k];
  try { localStorage.removeItem(k); } catch (e) {}
  try { sessionStorage.removeItem(k); } catch (e) {}
}

function getSession() {
  try { return JSON.parse(stGet(SESSION_KEY) || 'null'); }
  catch (e) { return null; }
}
function setSession(s) { stSet(SESSION_KEY, JSON.stringify(s)); }
function clearSession() { stDel(SESSION_KEY); }

function logout() {
  clearSession();
  window.location.href = 'index.html';
}

/* ============================================================
   演示账号表（原型期替代后端）
   —— 正式版：POST /api/auth/login { account, password } → 返回 { name, role, perm, token }
   —— 账号由家长在管理端「学生管理」建档时开好（1 账号 = 1 学生），没有绑定码这一步
   —— 每行对应管理端 seed 里的一个学生：账号 / 密码 / 姓名 / 权限档
   ============================================================ */
var DEMO_ACCOUNTS = [
  { account: 'jiayu',    pwd: '815203', name: '小宇', initial: '宇', role: '初三 · 学生', perm: 'full' },
  { account: 'yutong',   pwd: '604712', name: '小雨', initial: '雨', role: '初一 · 学生', perm: 'learn' },
  { account: 'xiaozhou', pwd: '390845', name: '小舟', initial: '舟', role: '初一 · 学生', perm: 'readonly' }
];

function findAccount(acc) {
  var k = String(acc || '').trim().toLowerCase();
  for (var i = 0; i < DEMO_ACCOUNTS.length; i++) {
    if (DEMO_ACCOUNTS[i].account === k) return DEMO_ACCOUNTS[i];
  }
  return null;
}

/* 首次登录 = 激活：管理端「激活状态」据此点亮。返回 true 表示这次是第一次 */
var ACT_KEY = 'xj-activated';
function markActivated(account) {
  var list = [];
  try { list = JSON.parse(stGet(ACT_KEY) || '[]') || []; } catch (e) { list = []; }
  if (list.indexOf(account) >= 0) return false;
  list.push(account);
  stSet(ACT_KEY, JSON.stringify(list));
  return true;
}

/* ============================================================
   主题
   ============================================================ */
var THEME_KEY = 'xj-theme';

function currentTheme() { return stGet(THEME_KEY) || 'light'; }

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);

  document.querySelectorAll('[data-theme-icon]').forEach(function (el) {
    el.innerHTML = svg(t === 'dark' ? ICO.sun : ICO.moon);
  });

  document.querySelectorAll('[data-theme-label]').forEach(function (el) {
    el.textContent = t === 'dark' ? '浅色模式' : '深色模式';
  });

  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'dark' ? '#0F1115' : '#F5F6F8');
}

function toggleTheme(ev) {
  var next = currentTheme() === 'dark' ? 'light' : 'dark';

  /* 从点击位置圆形扩散；降级时直接切换 */
  var x = window.innerWidth - 30, y = 30;
  if (ev && ev.clientX !== undefined) {
    var host = ev.currentTarget || ev.target;
    if (host && host.getBoundingClientRect) {
      var r = host.getBoundingClientRect();
      x = r.left + r.width / 2;
      y = r.top + r.height / 2;
    }
  }

  if (window.FX) {
    FX.themeWipe(x, y, function () {
      stSet(THEME_KEY, next);
      applyTheme(next);
    });
  } else {
    stSet(THEME_KEY, next);
    applyTheme(next);
  }
}

/* ============================================================
   顶部栏与导航渲染
   —— 导航只在页顶渲染一次（.topnav），三端共用同一份 NAV 数据，
      靠 CSS 断点决定「折成两行」还是「收成一行」
   ============================================================ */
function navLinks(active) {
  return NAV.map(function (n) {
    return '<a href="' + n.href + '"' +
           (n.id === active ? ' class="active" aria-current="page"' : '') + '>' +
           svg(n.icon) + '<span>' + n.label + '</span></a>';
  }).join('');
}

function pageTitle(active) {
  var info = TOPBAR[active] || { title: '', sub: '' };
  return info.title || (greeting() + '，' + USER.name);
}

function pageSub(active) {
  var info = TOPBAR[active] || { title: '', sub: '' };
  return info.sub || todayText();
}

function renderTopbar(active) {
  var el = document.getElementById('topbar');
  if (!el) return;

  el.innerHTML =
    '<div class="topbar-row">' +

      '<a class="topbar-brand" href="home.html" title="回到首页" aria-label="回到首页">' +
        '<span class="brand-mark">学</span>' +
        '<span class="brand-word">学迹</span>' +
      '</a>' +

      '<nav class="topnav" aria-label="主导航">' + navLinks(active) + '</nav>' +

      '<div class="topbar-right">' +
        '<button class="icon-btn" type="button" onclick="toggleTheme(event)" ' +
          'title="切换深色 / 浅色" aria-label="切换深色或浅色模式">' +
          '<span data-theme-icon></span>' +
        '</button>' +

        /* 头像 → 下拉菜单（个人中心 / 退出登录） */
        '<div class="avatar-wrap">' +
          '<button class="avatar avatar-btn" type="button" id="avatar-btn" ' +
            'aria-haspopup="true" aria-expanded="false" title="个人中心">' +
            avatarMarkup() +
          '</button>' +
          '<div class="avatar-menu" id="avatar-menu" hidden>' +
            '<div class="avatar-menu-head">' +
              '<b>' + USER.name + '</b>' +
              '<span>' + USER.role + '</span>' +
            '</div>' +
            '<a href="me.html" class="avatar-menu-item">' + svg(ICO.user) + '个人中心</a>' +
            '<a href="my-posts.html" class="avatar-menu-item">' + svg(ICO.pencil) + '我的记录</a>' +
            '<a href="mistakes.html" class="avatar-menu-item">' + svg(ICO.mistake) + '我的错题' +
              '<span class="avatar-menu-badge" data-mk-badge hidden></span></a>' +
            '<button type="button" class="avatar-menu-item danger" onclick="logout()">' +
              svg(ICO.logout) + '退出登录</button>' +
          '</div>' +
        '</div>' +

      '</div>' +

    '</div>';

  bindAvatarMenu();
}

/* ---------- 头像下拉菜单 ---------- */
/* 错题本待订正数：直接读存储，不依赖题库（这样每个页面都能显示红点数字） */
function mkPendingCount() {
  try {
    var raw = (typeof stGet === 'function') ? stGet('xj-mistakes') : null;
    var m = JSON.parse(raw || '{}') || {};
    var n = 0;
    Object.keys(m).forEach(function (k) { if (!m[k].fixed) n++; });
    return n;
  } catch (e) { return 0; }
}

function bindAvatarMenu() {
  var btn  = document.getElementById('avatar-btn');
  var menu = document.getElementById('avatar-menu');
  if (!btn || !menu || btn.dataset.bound) return;
  btn.dataset.bound = '1';

  var badge = menu.querySelector('[data-mk-badge]');
  var pending = mkPendingCount();
  if (badge && pending > 0) { badge.textContent = pending; badge.hidden = false; }

  function close() {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });

  menu.addEventListener('click', function (e) { e.stopPropagation(); });
  document.addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
}

/* 页面标题（问候语 / 页面名）放进内容区首行 */
function renderPageHead(active) {
  var content = document.querySelector('.content');
  if (!content || !document.getElementById('topbar')) return;

  var head = document.createElement('div');
  head.className = 'page-head reveal';
  head.innerHTML = '<h1 class="js-greet">' + pageTitle(active) + '</h1>' +
                   '<p class="js-sub">' + pageSub(active) + '</p>';
  content.insertBefore(head, content.firstChild);
}

function greeting() {
  var h = new Date().getHours();
  if (h < 5)  return '夜深了';
  if (h < 11) return '早上好';
  if (h < 13) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

function todayText() {
  var d = new Date();
  var w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  return (d.getMonth() + 1) + ' 月 ' + d.getDate() + ' 日 ' + w;
}

function bindScroll() {
  var tb = document.getElementById('topbar');
  if (!tb) return;
  var onScroll = function () { tb.classList.toggle('is-stuck', window.scrollY > 4); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ============================================================
   今日进度联动
   ============================================================ */
function refreshProgress() {
  var list = document.querySelectorAll('.todo');
  if (!list.length) return;
  var done  = document.querySelectorAll('.todo.done').length;
  var total = list.length;

  var bar = document.querySelector('.progress-bar i');
  if (bar) bar.style.width = (total ? (done / total) * 100 : 0) + '%';

  var dEl = document.getElementById('done-count');
  if (dEl) {
    if (window.FX) FX.countUp(dEl, done, 520);
    else dEl.textContent = done;
  }
  var tEl = document.getElementById('total-count');
  if (tEl) tEl.textContent = total;

  var pctEl = document.getElementById('progress-pct');
  if (pctEl) pctEl.textContent = (total ? Math.round(done / total * 100) : 0) + '%';

  var ringEl = document.querySelector('[data-ring]');
  if (ringEl && window.FX) FX.ring(ringEl, total ? done / total * 100 : 0);

  var label = document.getElementById('progress-label');
  if (label) {
    label.textContent = done === total
      ? '今天全部完成，漂亮'
      : '今天 ' + total + ' 件事 · 已完成 ' + done + ' 件';
  }

  /* 副标题在页头（.page-head）里，勾选待办时同步更新 */
  var left = total - done;
  var subText = left === 0
    ? todayText() + ' · 今日任务已清空'
    : todayText() + ' · 今天还有 ' + left + ' 件事';
  document.querySelectorAll('.js-sub').forEach(function (e) { e.textContent = subText; });
}

function bindTodos() {
  document.querySelectorAll('.todo-check').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var li = btn.closest('.todo');
      if (!li) return;
      var nowDone = !li.classList.contains('done');
      li.classList.toggle('done');
      btn.setAttribute('aria-pressed', nowDone ? 'true' : 'false');

      if (nowDone && window.FX) FX.burstFrom(btn, 11);   /* 勾选 → 粒子爆点 */
      refreshProgress();
    });
  });
  refreshProgress();
}

/* ============================================================
   登录页
   ============================================================ */
function initAuth() {
  var form = document.getElementById('login-form');
  if (!form) return;

  var account  = document.getElementById('account');
  var password = document.getElementById('password');
  var remember = document.getElementById('remember');
  var eyeBtn   = document.getElementById('toggle-pwd');
  var submit   = document.getElementById('submit-btn');
  var errBox   = document.getElementById('auth-error');
  var errText  = document.getElementById('auth-error-text');
  var fAcc     = document.getElementById('field-account');
  var fPwd     = document.getElementById('field-password');

  /* 密码可见性 */
  eyeBtn.innerHTML = svg(ICO.eyeOn);
  eyeBtn.addEventListener('click', function () {
    var show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    eyeBtn.innerHTML = svg(show ? ICO.eyeOff : ICO.eyeOn);
    eyeBtn.setAttribute('aria-label', show ? '隐藏密码' : '显示密码');
  });

  /* 回填「记住这台设备」 */
  var saved = stGet(REMEMBER_KEY);
  if (saved) { account.value = saved; remember.checked = true; }

  /* 已登录提示条 */
  var s = getSession();
  if (s) {
    document.getElementById('session-name').textContent = s.name || '同学';
    document.getElementById('auth-session').hidden = false;
    document.getElementById('session-continue').addEventListener('click', goHome);
  }

  /* 输入即清除错误 */
  [account, password].forEach(function (el) {
    el.addEventListener('input', clearError);
  });

  function showError(msg, fieldEl) {
    errText.textContent = msg;
    errBox.hidden = false;
    if (fieldEl) {
      fieldEl.classList.add('has-error');
      fieldEl.querySelector('input').focus();
    }
    form.classList.remove('shake');
    void form.offsetWidth;          /* 重排以重启动画 */
    form.classList.add('shake');
  }
  function clearError() {
    errBox.hidden = true;
    fAcc.classList.remove('has-error');
    fPwd.classList.remove('has-error');
  }

  function setLoading(on) {
    submit.disabled = on;
    submit.classList.toggle('is-loading', on);
    account.disabled = on;
    password.disabled = on;
  }

  function goHome() {
    /* 按刚拿到的权限决定落点：账号没有首页权限就落到第一个能用的页 */
    PERM = loadPerm(getSession());
    window.location.href = firstAllowed().href;
  }

  /* 忘记密码（原型阶段） */
  document.getElementById('forgot').addEventListener('click', function () {
    showError('密码是家长在管理端建档时给的。忘了就让家长去「学生详情 → 重置密码」生成一份新的。');
  });

  /* 提交 */
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearError();

    var acc = account.value.trim();
    var pwd = password.value;

    if (!acc)                        return showError('请输入账号', fAcc);
    if (!pwd)                        return showError('请输入密码', fPwd);
    if (pwd.length < 6)              return showError('密码至少 6 位', fPwd);

    setLoading(true);

    /* 原型期：在内置账号表里校验（正式版换成 POST /api/auth/login） */
    setTimeout(function () {
      var hit = findAccount(acc);

      if (!hit) {
        setLoading(false);
        return showError('没有这个账号。请用家长在管理端建档时开好的账号登录。', fAcc);
      }
      if (pwd !== hit.pwd) {
        setLoading(false);
        return showError('账号或密码不正确，请重新输入', fPwd);
      }

      if (remember.checked) stSet(REMEMBER_KEY, acc);
      else                  stDel(REMEMBER_KEY);

      var first = markActivated(hit.account);

      setSession({
        account: hit.account,
        name:    hit.name,
        initial: hit.initial,
        role:    hit.role,
        perm:    hit.perm,
        first:   first,
        loginAt: Date.now()
      });

      /* 成功态：按钮转绿后跳转 */
      submit.classList.remove('is-loading');
      submit.classList.add('is-done');
      submit.querySelector('.btn-label').textContent = first ? '首次登录 · 建议改密码' : '登录成功';
      submit.querySelector('.btn-label').style.visibility = 'visible';

      setTimeout(goHome, first ? 900 : 420);
    }, 850);
  });
}

/* ============================================================
   个人资料
   —— 原型阶段存 localStorage（xj-profile），正式版走后端 profile 接口。
      字段取舍唯一硬标准：有没有消费者（出题 / 计划提醒 / 界面 / 账号安全）。
      真正写进提示词的只有 6 个：年级、教材版本、当前单元、主攻科目、目标分、距大考天数。
   ============================================================ */
var PROFILE_KEY = 'xj-profile';

/* 初中九门。每门一行配置：on=是否出每日任务 / focus=是否重点 / progress=当前进度 / target=目标分 */
var SUBJECT_LIST  = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '道法', '地理'];
var SUBJECT_DEFAULT_ON = ['语文', '数学', '英语'];   /* 首期只开三主科 */

var PROFILE_DEFAULT = {
  /* 展示身份 */
  avatar: '', nickname: '小宇', realName: '', gender: '', signature: '',
  /* 学业档案 */
  grade: '初三', term: '上学期', textbook: '人教版',
  subjects: null,                       /* 由 makeSubjects() 生成，见下 */
  /* 目标与节奏 */
  examDate: '', startTime: '20:00', dailyCount: '10', restDay: '周日',
  /* 使用偏好 */
  fontSize: '标准', readAloud: true, notify: true
};

function makeSubjects() {
  return SUBJECT_LIST.map(function (n) {
    return {
      name: n,
      on: SUBJECT_DEFAULT_ON.indexOf(n) >= 0,
      focus: false,
      progress: '',
      target: ''
    };
  });
}

/* 目标分统一口径：单科满分 150。
   留空 = 这科不设目标；超 150 / 非正数 / 非数字一律当作没填（顺带清掉校验上线前存的脏数据）。 */
function cleanTarget(v) {
  var n = parseFloat(v);
  if (!(n > 0) || n > 150) return '';
  return String(Math.round(n));
}

/* 把存过的数据合并进来。
   旧结构（mainSubjects / practiceSubjects 两个平行数组 + 单值 progress/targetScore）
   在这里一次性升级成 subjects 数组，升级后 saved.subjects 即存在，迁移不会重跑。 */
function mergeSubjects(saved) {
  var out = makeSubjects();
  var byName = {};
  out.forEach(function (s) { byName[s.name] = s; });

  if (Array.isArray(saved.subjects)) {
    saved.subjects.forEach(function (s) {
      var t = byName[s && s.name];
      if (!t) return;
      t.on       = !!s.on;
      t.focus    = !!s.focus;
      t.progress = s.progress || '';
      t.target   = cleanTarget(s.target);
    });
    return out;
  }

  /* —— 旧结构迁移 —— */
  var oldOn    = Array.isArray(saved.practiceSubjects) ? saved.practiceSubjects : null;
  var oldFocus = Array.isArray(saved.mainSubjects)     ? saved.mainSubjects     : null;
  if (oldOn)    out.forEach(function (s) { s.on    = oldOn.indexOf(s.name) >= 0; });
  if (oldFocus) out.forEach(function (s) { s.focus = oldFocus.indexOf(s.name) >= 0; });
  return out;
}

function readProfile() {
  var p = {};
  for (var k in PROFILE_DEFAULT) {
    var v = PROFILE_DEFAULT[k];
    p[k] = Array.isArray(v) ? v.slice() : v;
  }
  p.subjects = makeSubjects();
  var s = getSession();
  if (s && s.name && !s.guest) p.nickname = s.name;    /* 昵称默认跟登录态走 */
  var saved = null;
  try { saved = JSON.parse(stGet(PROFILE_KEY) || 'null'); } catch (e) {}
  if (saved && typeof saved === 'object') {
    for (var k2 in saved) {
      if (saved[k2] === undefined || saved[k2] === null) continue;
      if (k2 === 'subjects') continue;
      if (k2 in p) p[k2] = saved[k2];
    }
    p.subjects = mergeSubjects(saved);
  }
  return p;
}

/* —— 科目相关的派生值 —— */
function onSubjects(p) {          /* 已开启练习的科目 */
  return p.subjects.filter(function (s) { return s.on; });
}
function focusSubjects(p) {       /* 标了重点的科目 */
  return p.subjects.filter(function (s) { return s.on && s.focus; });
}
function targetSum(p) {           /* 目标总分：所有已开启且填了分数的科目求和（单科钳到满分 150） */
  var n = 0;
  onSubjects(p).forEach(function (s) {
    var v = parseFloat(s.target);
    if (!isNaN(v) && v > 0) n += Math.min(v, 150);
  });
  return n;
}

function writeProfile(p) { stSet(PROFILE_KEY, JSON.stringify(p)); }

/* 头像：本地裁成 1:1、缩到 256×256 再存 dataURL（约 20–40KB）。
   正式版应改为上传对象存储、数据库只存 URL，并过一遍未成年人图片内容安全接口。 */
function compressAvatar(file, cb) {
  var fr = new FileReader();
  fr.onload = function () {
    var img = new Image();
    img.onload = function () {
      var S = 256, c = document.createElement('canvas');
      c.width = S; c.height = S;
      var side = Math.min(img.width, img.height);
      var sx = (img.width - side) / 2, sy = (img.height - side) / 2;
      c.getContext('2d').drawImage(img, sx, sy, side, side, 0, 0, S, S);
      try { cb(c.toDataURL('image/jpeg', 0.82)); } catch (e) { cb(''); }
    };
    img.onerror = function () { cb(''); };
    img.src = fr.result;
  };
  fr.onerror = function () { cb(''); };
  fr.readAsDataURL(file);
}

function pickFile(cb, camera) {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  if (camera) input.setAttribute('capture', 'environment');
  input.style.display = 'none';
  document.body.appendChild(input);
  input.addEventListener('change', function () {
    var f = input.files && input.files[0];
    /* 压缩失败就不回调，避免把已有头像覆盖成空 */
    if (f) compressAvatar(f, function (src) { if (src) cb(src); });
    if (input.parentNode) input.parentNode.removeChild(input);
  });
  input.click();
}

/* 换头像入口：拍照 / 相册 / 恢复默认。三路统一落库，
   回调给出最终 dataURL（恢复默认为空串）。 */
function changeAvatar(onDone) {
  function save(src) {
    var p = readProfile();
    p.avatar = src || '';
    writeProfile(p);
    if (onDone) onDone(p.avatar);
  }
  showSheet('更换头像', [
    { label: '拍照',           run: function () { pickFile(save, true); } },
    { label: '从相册选择照片', run: function () { pickFile(save); } },
    { label: '恢复默认头像',   danger: true, run: function () { save(''); } }
  ]);
}

/* 顶部栏头像内容：有上传头像用图，否则用昵称首字色块 */
function avatarMarkup() {
  var p = readProfile();
  if (p.avatar) return '<img src="' + p.avatar + '" alt="">';
  return USER.initial;
}

/* 底部动作弹层（通用） */
function showSheet(title, actions) {
  var mask = document.createElement('div');
  mask.className = 'sheet-mask';
  var html = '<div class="sheet" role="dialog" aria-modal="true">';
  if (title) html += '<p class="sheet-title">' + title + '</p>';
  actions.forEach(function (a, i) {
    html += '<button class="sheet-btn' + (a.danger ? ' danger' : '') +
            '" type="button" data-i="' + i + '">' + a.label + '</button>';
  });
  html += '<button class="sheet-btn sheet-cancel" type="button" data-cancel>取消</button></div>';
  mask.innerHTML = html;
  document.body.appendChild(mask);

  function close() { if (mask.parentNode) mask.parentNode.removeChild(mask); }

  mask.addEventListener('click', function (e) {
    var t = e.target;
    if (t === mask || t.hasAttribute('data-cancel')) { close(); return; }
    var btn = t.closest && t.closest('.sheet-btn[data-i]');
    if (!btn) return;
    var act = actions[+btn.getAttribute('data-i')];
    close();
    if (act && act.run) act.run();
  });

  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });
}

/* 距大考还有多少天 */
function daysTo(dateStr) {
  if (!dateStr) return 0;
  var t = new Date(dateStr + 'T00:00:00');
  if (isNaN(t.getTime())) return 0;
  return Math.max(0, Math.ceil((t - new Date()) / 86400000));
}

/* 原型阶段还没接后端的动作：给个明确说明，别静默无反应 */
function notReady(msg) {
  showSheet(msg || '原型阶段还没接入后端。', [
    { label: '知道了', run: function () {} }
  ]);
}

/* ============================================================
   考试成绩（个人中心 · 成绩进步路线）
   —— 原型存 localStorage（xj-scores）。正式版两张表：
      exam(id, name, date) + exam_score(exam_id, subject, score)。
      满分按 150 分制（中考口径），分数 0–150。
   ============================================================ */
var SCORES_KEY = 'xj-scores';

var SUBJ_COLOR = {
  '语文': 'var(--c-cn)',  '数学': 'var(--c-math)', '英语': 'var(--c-en)',
  '物理': 'var(--c-phy)', '化学': 'var(--c-che)',  '生物': 'var(--c-bio)',
  '历史': 'var(--c-his)', '道法': 'var(--c-pol)',  '地理': 'var(--c-geo)'
};
function subjColor(n) { return SUBJ_COLOR[n] || 'var(--brand)'; }

/* 首次打开时的演示成绩（满分 150） */
var SCORES_DEMO = [
  { name: '4月月考',  date: '2026-04-10', s: { '语文': 102, '数学': 112, '英语': 105 } },
  { name: '期中考试', date: '2026-05-08', s: { '语文': 108, '数学': 120, '英语': 118 } },
  { name: '5月月考',  date: '2026-06-05', s: { '语文': 105, '数学': 124, '英语': 128 } },
  { name: '6月月考',  date: '2026-07-03', s: { '语文': 112, '数学': 130, '英语': 132 } },
  { name: '期末考试', date: '2026-08-07', s: { '语文': 116, '数学': 133, '英语': 136 } },
  { name: '开学考试', date: '2026-09-04', s: { '语文': 124, '数学': 142, '英语': 135 } }
];

/* 按九科固定顺序排列科目名 */
function sortSubjects(list) {
  var seen = {};
  return list.filter(function (n) {
    if (seen[n] || SUBJECT_LIST.indexOf(n) < 0) return false;
    seen[n] = 1; return true;
  }).sort(function (a, b) { return SUBJECT_LIST.indexOf(a) - SUBJECT_LIST.indexOf(b); });
}

function readScores() {
  var saved = null;
  try { saved = JSON.parse(stGet(SCORES_KEY) || 'null'); } catch (e) {}
  if (saved && typeof saved === 'object') {
    var subs = (Array.isArray(saved.subjects) && saved.subjects.length)
      ? sortSubjects(saved.subjects) : SUBJECT_DEFAULT_ON.slice();
    var exams = Array.isArray(saved.exams) ? saved.exams.slice() : [];
    exams.sort(function (a, b) { return (a.date || '') < (b.date || '') ? -1 : 1; });
    return { subjects: subs, exams: exams };
  }
  /* 没记录时先给一份演示数据；用户一录入就被真实数据替换 */
  return {
    subjects: SUBJECT_DEFAULT_ON.slice(),
    exams: SCORES_DEMO.map(function (x) { return { name: x.name, date: x.date, s: x.s }; })
  };
}
function writeScores(d) { stSet(SCORES_KEY, JSON.stringify(d)); }

/* 各科目标线：一门课一条线，只给「填了目标分」的科目出线（没填就没线，不虚构参考值）。
   满分 150 分制；历史数据可能存过超 150 的值（校验上线前），这里钳到满分以内，别让线画出图外。 */
function scoreGoals(subs) {
  var p = readProfile();
  var out = [];
  subs.forEach(function (n) {
    var s = null;
    p.subjects.forEach(function (x) { if (x.name === n) s = x; });
    if (!s) return;
    var v = parseFloat(s.target);
    if (!(v > 0)) return;
    out.push({ name: n, value: Math.min(Math.round(v), 150) });
  });
  return out;
}

function isoDate(d) {
  var m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}

/* 轻提示 */
function toast(msg) {
  var el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  requestAnimationFrame(function () { el.classList.add('on'); });
  setTimeout(function () {
    el.classList.remove('on');
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
  }, 1700);
}

/* 添加一门要跟踪成绩的科目（默认只有语数英） */
function addScoreSubject(onAdded) {
  var d = readScores();
  var rest = SUBJECT_LIST.filter(function (n) { return d.subjects.indexOf(n) < 0; });
  if (!rest.length) { toast('九科都已经在成绩表里了'); return; }
  showSheet('添加要跟踪的科目', rest.map(function (n) {
    return {
      label: n,
      run: function () {
        var q = readScores();
        if (q.subjects.indexOf(n) < 0) q.subjects.push(n);
        q.subjects = sortSubjects(q.subjects);
        writeScores(q);
        toast('已添加 ' + n);
        if (onAdded) onAdded();
      }
    };
  }));
}

/* 录入一次考试成绩：考试名 + 日期 + 各科分数（0–150）。
   同名同日期视为同一次考试，直接覆盖。 */
function showScoreForm(onSaved) {
  var subs = sortSubjects(readScores().subjects);

  var mask = document.createElement('div');
  mask.className = 'sheet-mask';
  var html = '<div class="sheet sheet-form" role="dialog" aria-modal="true">' +
    '<p class="sheet-title">录入考试成绩 · 满分 150</p>' +
    '<div class="sf-body">' +
      '<div class="sf-row"><label for="sfName">考试名称</label>' +
        '<input class="pf-input" id="sfName" type="text" maxlength="10" autocomplete="off"' +
        ' placeholder="如：10 月月考"></div>' +
      '<div class="sf-row"><label for="sfDate">考试日期</label>' +
        '<input class="pf-input" id="sfDate" type="date"></div>';
  subs.forEach(function (n, i) {
    html += '<div class="sf-row"><label for="sfS' + i + '">' +
      '<i class="sc-dot" style="background:' + subjColor(n) + '"></i>' + n + '</label>' +
      '<input class="pf-input sf-score" id="sfS' + i + '" type="number" min="0" max="150"' +
      ' inputmode="numeric" placeholder="0 – 150"></div>';
  });
  html += '</div>' +
    '<p class="sf-err" id="sfErr" hidden></p>' +
    '<button class="btn-brand sf-save" type="button" id="sfSave">保存这次成绩</button>' +
    '<button class="sheet-btn sheet-cancel" type="button" data-cancel>取消</button>' +
    '</div>';
  mask.innerHTML = html;
  document.body.appendChild(mask);

  var nameEl = mask.querySelector('#sfName');
  var dateEl = mask.querySelector('#sfDate');
  var errEl  = mask.querySelector('#sfErr');
  dateEl.value = isoDate(new Date());

  function close() { if (mask.parentNode) mask.parentNode.removeChild(mask); }
  function fail(msg) { errEl.textContent = msg; errEl.hidden = false; }

  mask.addEventListener('click', function (e) {
    var t = e.target;
    if (t === mask || t.hasAttribute('data-cancel')) close();
  });
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
  });

  mask.querySelector('#sfSave').addEventListener('click', function () {
    var name = nameEl.value.trim();
    var date = dateEl.value;
    var s = {}, bad = '', filled = 0;
    subs.forEach(function (n, i) {
      var raw = mask.querySelector('#sfS' + i).value.trim();
      if (raw === '') return;
      var v = parseFloat(raw);
      if (isNaN(v) || v < 0 || v > 150) { if (!bad) bad = n; return; }
      s[n] = Math.round(v * 10) / 10;
      filled++;
    });
    if (bad)      { fail('「' + bad + '」的分数要填 0 – 150 之间的数字。'); return; }
    if (!name)    { fail('给这次考试起个名字，比如「10 月月考」。'); return; }
    if (!date)    { fail('选一下考试日期，曲线靠它排序。'); return; }
    if (!filled)  { fail('至少填一科的分数。'); return; }

    var d = readScores();
    var hit = null;
    d.exams.forEach(function (x) { if (x.name === name && x.date === date) hit = x; });
    if (hit) { for (var k in s) hit.s[k] = s[k]; }
    else d.exams.push({ name: name, date: date, s: s });

    var all = d.subjects.slice();
    for (var k2 in s) all.push(k2);
    d.subjects = sortSubjects(all);
    writeScores(d);

    close();
    toast(hit ? '已更新「' + name + '」' : '已保存「' + name + '」');
    if (onSaved) onSaved();
  });
}

/* 使用偏好落地（目前只有字号；用 zoom 整体缩放内容区） */
function applyPrefs() {
  var p = readProfile();
  var cls = document.body.classList;
  cls.toggle('fs-small', p.fontSize === '小');
  cls.toggle('fs-large', p.fontSize === '大');
}

/* ============================================================
   启动
   ============================================================ */

/* 访客提示条：登录态丢失时自动降级，不再把人弹回登录页 */
function renderGuestBar() {
  var content = document.querySelector('.content');
  if (!content || document.getElementById('guest-bar')) return;
  var bar = document.createElement('div');
  bar.className = 'guest-bar';
  bar.id = 'guest-bar';
  bar.innerHTML =
    '<span class="gb-ico">' + svg(ICO.user) + '</span>' +
    '<span class="gb-txt">本机登录态不可用（站点数据被隔离或已清空），已切换为<b>访客模式</b> —— 可以浏览，但发帖、草稿不会保存。</span>' +
    '<span class="spacer"></span>' +
    '<a class="gb-login" href="index.html">去登录</a>';
  content.insertBefore(bar, content.firstChild);
}

(function boot() {
  applyTheme(currentTheme());

  var page = document.body.getAttribute('data-page') || 'today';

  if (page === 'auth') {
    initAuth();
    if (window.FX) FX.init();
    return;
  }

  /* 内页登录态：取不到会话时**不再弹回登录页**（原型阶段 localStorage 可能因
     站点隔离 / 隐私模式 / 定期清理而丢失，硬弹体验极差），降级为「访客模式」
     直接进入，页面顶部给出提示条。真实登录后访客会话被覆盖。 */
  var s = getSession();
  if (!s) {
    s = { account: 'guest', name: '访客', initial: '客',
          role: '未登录 · 试看模式', guest: true, loginAt: Date.now() };
    setSession(s);
  }
  s = applyPermQuery(s);                 /* 原型期调试：?perm=readonly */

  /* 权限随会话下发；老会话 / 访客没有这一项就按全功能，不误锁 */
  var gp = loadPerm(s);
  PERM.preset = gp.preset;
  PERM.mods   = gp.mods;

  USER.name    = s.name    || '同学';
  USER.initial = s.initial || USER.name.charAt(0);
  USER.role    = s.role    || '初三 · 学生';

  /* 该页所属模块没开放 → 顶栏与导航照常渲染，只把内容区换成一把锁 */
  var lockMod = PAGE_MOD[page];
  if (lockMod && !can(lockMod)) {
    renderTopbar(page);
    renderLock();
    applyTheme(currentTheme());
    return;
  }

  renderTopbar(page);
  renderPageHead(page);
  if (s.guest) renderGuestBar();
  applyTheme(currentTheme());   /* 顶栏渲染后再刷一次主题图标，避免按钮空圈 */
  applyPrefs();                 /* 字号等使用偏好 */
  bindScroll();
  bindTodos();

  /* 视觉特效层：星空 / 光晕 / 入场 / 环形进度 */
  if (window.FX) {
    FX.init();
    FX.spotlight();
  }
})();
