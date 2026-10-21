/* ============================================================
   学迹 · 管理端 admin.js（独立文件，与用户端不共用任何代码/数据）
   职责：侧边栏 + 顶栏渲染、登录态守卫、主题、抽屉/弹层/轻提示、小工具
   页面约定：<body data-page="dashboard" data-title="总览" data-sub="…">
     - 仅 index.html 用 data-page="auth"（不做守卫）
     - 内容区由各页自己写，这里只负责外壳
   ============================================================ */
window.ADMIN = (function () {

  /* ---------- 图标（内联 SVG，零依赖） ---------- */
  var P = {
    grid:     '<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/>',
    users:    '<path d="M16 19v-1.6a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19"/><circle cx="9" cy="7.5" r="3.5"/><path d="M17 11.2a3.3 3.3 0 0 0 0-6.4"/><path d="M22 19v-1.6a4 4 0 0 0-3-3.8"/>',
    check:    '<path d="M5 4.5h14a1.5 1.5 0 0 1 1.5 1.5v13A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V6A1.5 1.5 0 0 1 5 4.5Z"/><path d="m8 12 2.6 2.6L16 9"/>',
    db:       '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
    shield:   '<path d="M12 3.5 5 6v5.5c0 4.2 2.9 7.6 7 9 4.1-1.4 7-4.8 7-9V6l-7-2.5Z"/><path d="m9 12 2 2 4-4.2"/>',
    book:     '<path d="M4.5 5.5A2 2 0 0 1 6.5 3.5H19v17H6.5a2 2 0 0 1-2-2v-13Z"/><path d="M4.5 17.5h14.5"/><path d="M8.5 8h6"/>',
    abc:      '<path d="M3.5 17 7 7l3.5 10"/><path d="M4.6 14h4.8"/><path d="M13 11.5h3.2a2.3 2.3 0 0 1 0 4.6H13V9h3a2 2 0 0 1 0 4"/>',
    pen:      '<path d="M11 4.5h7.5a2 2 0 0 1 2 2V19a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V9"/><path d="M8.5 12.5 12 9l5 5-3.5 3.5H8.5v-5Z"/><path d="M14.2 6.8 16 5l3 3-1.8 1.8"/>',
    image:    '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4.5 17 4.7-4.6 3.3 3.2 2.6-2.4 4.4 4"/>',
    layers:   '<path d="m12 3.5 8.5 4.3L12 12 3.5 7.8 12 3.5Z"/><path d="m4.6 12.2 7.4 3.7 7.4-3.7"/><path d="m4.6 16.4 7.4 3.7 7.4-3.7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 2.6 13.4 5l2.7-.5.6 2.7 2.5 1.2-1.2 2.5 1.2 2.5-2.5 1.2-.6 2.7-2.7-.5L12 21.4 10.6 19l-2.7.5-.6-2.7L4.8 15.6 6 13.1 4.8 10.6l2.5-1.2.6-2.7 2.7.5L12 2.6Z"/>',
    plus:     '<path d="M12 5v14"/><path d="M5 12h14"/>',
    search:   '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    bell:     '<path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z"/><path d="M10.3 19a2 2 0 0 0 3.4 0"/>',
    sun:      '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4"/>',
    moon:     '<path d="M20 14.2A8.4 8.4 0 0 1 9.8 4 8.5 8.5 0 1 0 20 14.2Z"/>',
    logout:   '<path d="M15 4.5h3.5a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H15"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h9"/>',
    chev:     '<path d="m6 9 6 6 6-6"/>',
    chevR:    '<path d="m9 6 6 6-6 6"/>',
    x:        '<path d="M6 6l12 12M18 6 6 18"/>',
    filter:   '<path d="M4 6h16"/><path d="M7 12h10"/><path d="M10 18h4"/>',
    refresh:  '<path d="M20 11a8 8 0 0 0-13.6-4.6L4 8.5"/><path d="M4 5v4h4"/><path d="M4 13a8 8 0 0 0 13.6 4.6L20 15.5"/><path d="M20 19v-4h-4"/>',
    sparkle:  '<path d="M12 3.5l1.9 4.8L19 10l-5.1 1.7L12 16.5l-1.9-4.8L5 10l5.1-1.7L12 3.5Z"/><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z"/>',
    upload:   '<path d="M12 16V4"/><path d="m8 8 4-4 4 4"/><path d="M4.5 15v3.5a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V15"/>',
    download: '<path d="M12 4v12"/><path d="m8 12 4 4 4-4"/><path d="M4.5 19.5h15"/>',
    edit:     '<path d="M16.5 4.5 19.5 7.5 9 18H6v-3l10.5-10.5Z"/><path d="M4 21h16"/>',
    trash:    '<path d="M4.5 7h15"/><path d="M9 7V4.8h6V7"/><path d="M6.5 7l1 12.2A2 2 0 0 0 9.5 21h5a2 2 0 0 0 2-1.8L17.5 7"/>',
    eye:      '<path d="M2.5 12S6 6.5 12 6.5 21.5 12 21.5 12 18 17.5 12 17.5 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.6"/>',
    eyeOff:   '<path d="M4 4.5 20 20.5"/><path d="M9.6 6.9A9.6 9.6 0 0 1 12 6.5c6 0 9.5 5.5 9.5 5.5a15 15 0 0 1-3 3.4"/><path d="M6.2 8.5A15 15 0 0 0 2.5 12S6 17.5 12 17.5a9.4 9.4 0 0 0 3.5-.7"/>',
    link:     '<path d="M10 13a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7L11.4 5.9"/><path d="M14 11a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.2-1.2"/>',
    chart:    '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    star:     '<path d="m12 4 2.5 5.2 5.5.8-4 3.9 1 5.5-5-2.8-5 2.8 1-5.5-4-3.9 5.5-.8L12 4Z"/>',
    flag:     '<path d="M5.5 21V4"/><path d="M5.5 5h10.8l-1.3 3.5 1.3 3.5H5.5"/>',
    clock:    '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    calendar: '<rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M3.5 10h17"/><path d="M8 3.5v4M16 3.5v4"/>',
    check2:   '<path d="m4.5 12.5 5 5 10-11"/>',
    alert:    '<path d="M12 4 2.8 20h18.4L12 4Z"/><path d="M12 10v4.5"/><path d="M12 17.4v.1"/>',
    info:     '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 7.9v.1"/>',
    copy:     '<rect x="8.5" y="8.5" width="12" height="12" rx="2"/><path d="M15.5 5.5A2 2 0 0 0 13.5 3.5h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2"/>',
    send:     '<path d="M21 3.5 10.5 14"/><path d="M21 3.5 14.5 21l-4-7.5L3 9.5 21 3.5Z"/>',
    target:   '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.6"/><circle cx="12" cy="12" r="1"/>',
    file:     '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5L14 3.5Z"/><path d="M14 3.5v5h5"/>'
  };
  function icon(n, cls) {
    var d = P[n] || P.info;
    return '<svg class="' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
           'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }

  /* ---------- 导航结构（唯一来源） ---------- */
  var NAV = [
    { group: '工作台', items: [
      { id: 'dashboard', label: '总览',     href: 'dashboard.html', icon: 'grid' },
      { id: 'students',  label: '学生管理', href: 'students.html',  icon: 'users' }
    ] },
    { group: '每天要发的', items: [
      { id: 'tasks',  label: '任务发布', href: 'tasks.html',  icon: 'check' },
      { id: 'wordsl', label: '单词表',   href: 'words.html',  icon: 'abc' },
      { id: 'books',  label: '阅读书单', href: 'books.html',  icon: 'book' },
      { id: 'essays', label: '作文批改', href: 'essays.html', icon: 'pen', badge: 'essay' }
    ] },
    { group: '题库', items: [
      { id: 'qbank',  label: '题库与出题', href: 'qbank.html',  icon: 'db' },
      { id: 'review', label: '审核队列',   href: 'review.html', icon: 'shield', badge: 'review' }
    ] },
    { group: '学情', items: [
      { id: 'submissions', label: '作答记录',   href: 'submissions.html', icon: 'check2' },
      { id: 'mistakes',    label: '错题本',     href: 'mistakes.html',    icon: 'alert', badge: 'mks' },
      { id: 'all',         label: '全科掌握度', href: 'all.html',         icon: 'layers', soon: '待实现' }
    ] },
    { group: '其它', items: [
      { id: 'ai',       label: 'AI 中枢',  href: 'ai.html',       icon: 'sparkle' },
      { id: 'posts',    label: '记录管理', href: 'posts.html',    icon: 'image' },
      { id: 'settings', label: '设置',     href: 'settings.html', icon: 'settings' }
    ] }
  ];

  /* ---------- 登录态 ---------- */
  var SES_KEY = 'xjadmin-session';
  function session() {
    try { return JSON.parse(localStorage.getItem(SES_KEY) || 'null'); } catch (e) { return null; }
  }
  function setSession(s) { try { localStorage.setItem(SES_KEY, JSON.stringify(s)); } catch (e) {} }
  function logout() {
    try { localStorage.removeItem(SES_KEY); } catch (e) {}
    location.replace('index.html');
  }

  /* ---------- 主题 ---------- */
  var TH_KEY = 'xjadmin-theme';
  function theme(t) {
    if (t) { document.documentElement.setAttribute('data-theme', t); try { localStorage.setItem(TH_KEY, t); } catch (e) {} }
    return document.documentElement.getAttribute('data-theme') || 'light';
  }
  (function initTheme() {
    var t = 'light';
    try { t = localStorage.getItem(TH_KEY) || 'light'; } catch (e) {}
    document.documentElement.setAttribute('data-theme', t);
  })();

  /* ---------- 当前学生（顶栏切换器，影响总览/任务发布等页） ---------- */
  var CUR_KEY = 'xjadmin-current';
  function currentId() {
    var v = null;
    try { v = localStorage.getItem(CUR_KEY); } catch (e) {}
    var list = DB.get('students', []);
    if (v && list.some(function (s) { return s.id === v; })) return v;
    return list.length ? list[0].id : null;
  }
  function setCurrent(id) { try { localStorage.setItem(CUR_KEY, id); } catch (e) {} }
  function currentStudent() {
    var id = currentId();
    return DB.get('students', []).filter(function (s) { return s.id === id; })[0] || null;
  }

  /* ---------- 待办数量（侧边栏 / 铃铛红点） ---------- */
  function pendingCounts() {
    var q = DB.get('qbank', []).filter(function (x) { return x.status === 'pending'; }).length;
    var e = DB.get('essays', []).reduce(function (n, t) {
      return n + (t.subs || []).filter(function (s) { return s.status === '待复核'; }).length;
    }, 0);
    var r = DB.get('posts', []).filter(function (p) { return p.status === '被举报'; }).length;
    var m = DB.get('mistakes', []).filter(function (x) { return x.status === 'open'; }).length;
    /* 错题不算「待办」——它是孩子的功课，不是家长要处理的，所以不进 total，只在侧边栏亮个数 */
    return { review: q, essay: e, report: r, mks: m, total: q + e + r };
  }

  /* ---------- 外壳渲染 ---------- */
  function shell() {
    var page = document.body.getAttribute('data-page');
    var title = document.body.getAttribute('data-title') || '';
    var sub = document.body.getAttribute('data-sub') || '';
    var ses = session() || { name: '管理员', account: 'admin' };
    var cnt = pendingCounts();
    var cur = currentStudent();

    /* 侧边栏 */
    var sb = document.getElementById('sb');
    if (sb) {
      var html = '<div class="sb-brand">' +
        '<div class="sb-logo">学</div>' +
        '<div><div class="sb-name">学迹</div><div class="sb-role">管理端 · ' + esc(ses.name) + '</div></div>' +
      '</div><nav class="sb-nav">';
      NAV.forEach(function (g) {
        html += '<div class="sb-group">' + g.group + '</div>';
        g.items.forEach(function (it) {
          var n = cnt[it.badge] || 0;
          html += '<a class="sb-item' + (it.id === page ? ' on' : '') + '" href="' + it.href + '">' +
            icon(it.icon) + '<span class="sb-label">' + it.label + '</span>' +
            (it.soon ? '<span class="sb-soon">' + it.soon + '</span>' : '') +
            (n ? '<span class="sb-badge">' + n + '</span>' : '') +
          '</a>';
        });
      });
      html += '</nav><div class="sb-foot">' +
        '<div class="sb-user" id="sb-user">' +
          '<span class="av sm c1">' + esc((ses.name || '管').charAt(0)) + '</span>' +
          '<div class="sb-user-txt"><div class="sb-user-name">' + esc(ses.name) + '</div>' +
          '<div class="sb-user-sub">' + esc(ses.account) + ' · 管理 ' + DB.get('students', []).length + ' 名学生</div></div>' +
          icon('chevR', '') +
        '</div>' +
      '</div>';
      sb.innerHTML = html;
      sb.insertAdjacentHTML('afterend', '<div class="sb-mask" id="sb-mask"></div>');
      var mask = document.getElementById('sb-mask');
      if (mask) mask.addEventListener('click', function () { document.body.classList.remove('sb-open'); });
    }

    /* 顶栏 */
    var tb = document.getElementById('tb');
    if (tb) {
      var students = DB.get('students', []);
      var menu = students.map(function (s) {
        return '<div class="picker-item' + (cur && s.id === cur.id ? ' on' : '') + '" data-sid="' + s.id + '">' +
          avatar(s, 'sm') +
          '<div class="picker-item-txt"><div>' + esc(s.name) + '</div>' +
          '<div class="picker-item-sub">' + esc(s.grade) + ' · 连续打卡 ' + s.streak + ' 天</div></div>' +
          (cur && s.id === cur.id ? icon('check2') : '') +
        '</div>';
      }).join('') || '<div class="picker-item"><span class="muted">还没有学生</span></div>';

      tb.innerHTML =
        '<button class="tb-btn tb-burger" id="tb-burger" aria-label="打开菜单">' + icon('grid') + '</button>' +
        '<div><div class="tb-title">' + esc(title) + '</div>' +
          (sub ? '<div class="tb-sub">' + esc(sub) + '</div>' : '') + '</div>' +
        '<div class="tb-spacer"></div>' +
        '<div class="picker">' +
          '<button class="picker-btn" id="picker-btn">' +
            (cur ? avatar(cur, 'sm') : '') +
            '<span>' + (cur ? esc(cur.name) : '选择学生') + '</span>' + icon('chev') +
          '</button>' +
          '<div class="picker-menu" id="picker-menu" hidden>' + menu +
            '<div class="picker-sep"></div>' +
            '<div class="picker-foot" id="picker-more">' + icon('plus') + ' 新建学生 / 查看全部</div>' +
          '</div>' +
        '</div>' +
        '<button class="tb-btn" id="tb-bell" aria-label="待办">' + icon('bell') +
          (cnt.total ? '<span class="dot">' + cnt.total + '</span>' : '') + '</button>' +
        '<button class="tb-btn" id="tb-theme" aria-label="切换主题">' +
          icon(theme() === 'dark' ? 'sun' : 'moon') + '</button>';

      var burger = document.getElementById('tb-burger');
      if (burger) burger.addEventListener('click', function () { document.body.classList.toggle('sb-open'); });

      var pb = document.getElementById('picker-btn'), pm = document.getElementById('picker-menu');
      pb.addEventListener('click', function (e) { e.stopPropagation(); pm.hidden = !pm.hidden; });
      pm.addEventListener('click', function (e) {
        var it = e.target.closest('.picker-item');
        if (it && it.getAttribute('data-sid')) {
          setCurrent(it.getAttribute('data-sid'));
          location.reload();
          return;
        }
        if (e.target.closest('#picker-more')) location.href = 'students.html';
      });
      document.addEventListener('click', function () { pm.hidden = true; });

      document.getElementById('tb-bell').addEventListener('click', function () {
        location.href = cnt.essay ? 'essays.html' : (cnt.review ? 'review.html' : 'posts.html');
      });
      document.getElementById('tb-theme').addEventListener('click', function () {
        var t = theme() === 'dark' ? 'light' : 'dark';
        theme(t);
        this.innerHTML = icon(t === 'dark' ? 'sun' : 'moon');
      });
    }

    /* 侧边栏底部的账号入口 */
    var su = document.getElementById('sb-user');
    if (su) su.addEventListener('click', function () { location.href = 'settings.html'; });
  }

  /* ---------- 小工具 ---------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  /* 头像：孩子在自己端上传过照片就显示照片，否则用首字母色块兜底 */
  function avatar(s, size) {
    if (!s) return '';
    var cls = 'av ' + (size || '') + ' ' + (s.color || 'c1');
    if (s.avatar) {
      return '<span class="' + cls + ' av-photo"><img src="' + esc(s.avatar) + '" alt=""></span>';
    }
    return '<span class="' + cls + '">' + esc(s.initial || (s.name || '学').charAt(0)) + '</span>';
  }
  function toast(msg, kind) {
    var wrap = document.getElementById('toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.className = 'toast-wrap';
      wrap.id = 'toast-wrap';
      document.body.appendChild(wrap);
    }
    var el = document.createElement('div');
    el.className = 'toast ' + (kind || 'ok');
    el.innerHTML = icon(kind === 'warn' ? 'alert' : 'check2') + '<span>' + esc(msg) + '</span>';
    wrap.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; el.style.transition = 'opacity .25s'; }, 1900);
    setTimeout(function () { el.remove(); }, 2250);
  }
  function copy(text, okMsg) {
    var done = function () { toast(okMsg || '已复制'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { toast('复制失败，请手动选择', 'warn'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { toast('复制失败', 'warn'); }
      ta.remove();
    }
  }

  /* 抽屉：openDrawer({title, body, foot}) */
  function drawer(opt) {
    closeDrawer();
    var mask = document.createElement('div');
    mask.className = 'drawer-mask';
    mask.id = 'drawer-mask';
    var d = document.createElement('div');
    d.className = 'drawer' + (opt.wide ? ' drawer-lg' : '');
    d.id = 'drawer';
    d.innerHTML =
      '<div class="drawer-head"><h3>' + esc(opt.title || '') + '</h3>' +
        '<div class="right"><button class="btn btn-ghost btn-icon" id="drawer-x" aria-label="关闭">' + icon('x') + '</button></div>' +
      '</div>' +
      '<div class="drawer-body">' + (opt.body || '') + '</div>' +
      (opt.foot ? '<div class="drawer-foot">' + opt.foot + '</div>' : '');
    document.body.appendChild(mask);
    document.body.appendChild(d);
    requestAnimationFrame(function () { mask.classList.add('on'); d.classList.add('on'); });
    mask.addEventListener('click', closeDrawer);
    d.querySelector('#drawer-x').addEventListener('click', closeDrawer);
    document.addEventListener('keydown', escClose);
    if (opt.onMount) opt.onMount(d);
    return d;
  }
  function closeDrawer() {
    var m = document.getElementById('drawer-mask'), d = document.getElementById('drawer');
    if (m) m.remove();
    if (d) d.remove();
    document.removeEventListener('keydown', escClose);
  }
  function escClose(e) { if (e.key === 'Escape') { closeDrawer(); closeModal(); } }

  /* 弹层：openModal({title, body, foot, onMount}) */
  function modal(opt) {
    closeModal();
    var mask = document.createElement('div');
    mask.className = 'modal-mask'; mask.id = 'modal-mask';
    var m = document.createElement('div');
    m.className = 'modal'; m.id = 'modal';
    m.innerHTML =
      '<div class="modal-head"><h3>' + esc(opt.title || '') + '</h3>' +
        '<div class="right"><button class="btn btn-ghost btn-icon" id="modal-x" aria-label="关闭">' + icon('x') + '</button></div>' +
      '</div>' +
      '<div class="modal-body">' + (opt.body || '') + '</div>' +
      (opt.foot ? '<div class="modal-foot">' + opt.foot + '</div>' : '');
    document.body.appendChild(mask); document.body.appendChild(m);
    requestAnimationFrame(function () { mask.classList.add('on'); m.classList.add('on'); });
    mask.addEventListener('click', closeModal);
    m.querySelector('#modal-x').addEventListener('click', closeModal);
    document.addEventListener('keydown', escClose);
    if (opt.onMount) opt.onMount(m);
    return m;
  }
  function closeModal() {
    var mask = document.getElementById('modal-mask'), m = document.getElementById('modal');
    if (mask) mask.remove();
    if (m) m.remove();
    document.removeEventListener('keydown', escClose);
  }

  /* 统一确认框 */
  function confirmBox(opt) {
    var okCls = opt.danger ? 'btn-danger' : 'btn-primary';
    modal({
      title: opt.title || '确认操作',
      body: '<p style="font-size:13.5px;line-height:1.7">' + esc(opt.text || '') + '</p>' +
            (opt.note ? '<p class="hint">' + esc(opt.note) + '</p>' : ''),
      foot: '<button class="btn" data-x="no">取消</button>' +
            '<button class="btn ' + okCls + '" data-x="yes">' + esc(opt.ok || '确定') + '</button>',
      onMount: function (m) {
        m.querySelector('[data-x="no"]').addEventListener('click', closeModal);
        m.querySelector('[data-x="yes"]').addEventListener('click', function () {
          closeModal();
          if (opt.onOk) opt.onOk();
        });
      }
    });
  }

  /* 分段选择：<div class="seg" data-seg="difficulty">…</div> */
  function seg(sel, onChange) {
    document.querySelectorAll(sel).forEach(function (box) {
      box.addEventListener('click', function (e) {
        var b = e.target.closest('button');
        if (!b) return;
        box.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        if (onChange) onChange(b.getAttribute('data-val'), b, box);
      });
    });
  }
  function segVal(box) {
    var b = box.querySelector('button.on');
    return b ? b.getAttribute('data-val') : null;
  }

  /* ============================================================
     学生档案表单（「新建学生」与「编辑档案」共用一套）
     字段口径与用户端「编辑资料」一一对应，九科表同结构：
       subjects = [{ name, on(出题), focus(重点), progress, target }]
     用法：
       ADMIN.drawer({ body: ADMIN.stuForm(s), onMount: function (d) {
         var f = ADMIN.stuFormBind(d);      // 绑交互，返回 { read, validate }
         ...
       }})
     ============================================================ */
  var PERM_LABEL2KEY = {};
  Object.keys(DB.PERM_PRESETS).forEach(function (k) { PERM_LABEL2KEY[DB.PERM_PRESETS[k].label] = k; });
  var STAR_PATH = '<path d="M12 3.8l2.6 5.3 5.8.85-4.2 4.1 1 5.8L12 17.05l-5.2 2.8 1-5.8-4.2-4.1 5.8-.85L12 3.8Z"/>';

  function segBox(id, vals, cur) {
    return '<div class="seg wrap" id="' + id + '">' + vals.map(function (v) {
      return '<button type="button" data-val="' + esc(v) + '"' +
        (v === cur ? ' class="on"' : '') + '>' + esc(v) + '</button>';
    }).join('') + '</div>';
  }
  function fieldSeg(id, label, vals, cur, hint) {
    return '<div class="field"><label>' + label + '</label>' + segBox(id, vals, cur) +
      (hint ? '<div class="hint">' + hint + '</div>' : '') + '</div>';
  }
  function fieldSel(id, label, vals, cur) {
    return '<div class="field"><label>' + label + '</label><select class="sel" id="' + id + '">' +
      vals.map(function (v) {
        return '<option' + (v === cur ? ' selected' : '') + '>' + esc(v) + '</option>';
      }).join('') + '</select></div>';
  }

  /* 九科表：重点 / 出题 / 当前进度 / 目标分（单科满分 150） */
  function subjTable(subs) {
    return '<div class="sf-subj">' +
      '<div class="sf-subj-head"><span>科目</span><span>重点</span><span>出题</span><span>当前进度</span><span>目标分</span></div>' +
      '<div id="f-subj">' + subs.map(function (s, i) {
        return '<div class="sf-subj-row' + (s.on ? '' : ' is-off') + '" data-i="' + i + '">' +
          '<span class="ss-name">' + esc(s.name) + '</span>' +
          '<button class="ss-star' + (s.focus ? ' on' : '') + '" type="button" data-act="focus"' +
            ' aria-pressed="' + !!s.focus + '" title="' + (s.focus ? '取消重点' : '设为重点科目') + '">' +
            '<svg viewBox="0 0 24 24" aria-hidden="true">' + STAR_PATH + '</svg></button>' +
          '<button class="ss-on' + (s.on ? ' on' : '') + '" type="button" data-act="on"' +
            ' aria-pressed="' + !!s.on + '">练</button>' +
          '<input class="inp ss-in ss-prog" value="' + esc(s.progress) + '" placeholder="如 第 3 单元"' +
            (s.on ? '' : ' disabled') + '>' +
          '<input class="inp ss-in ss-score" type="number" min="0" max="150" inputmode="numeric"' +
            ' value="' + esc(s.target) + '" placeholder="目标分"' + (s.on ? '' : ' disabled') + '>' +
        '</div>';
      }).join('') + '</div>' +
      '<div class="sf-subj-total">已开 <b id="f-son">' + DB.onSubj(subs).length + '</b> 科' +
        ' · 目标总分 <b id="f-tsum">' + DB.targetSum(subs) + '</b> 分' +
        '<span class="hint" style="margin:0 0 0 8px">「出题」关掉的科不会发每日任务；单科满分 150</span></div>' +
      '</div>';
  }

  function stuForm(s) {
    s = s || {};
    var isNew = !s.id;
    var h = [];
    h.push('<div class="form-grid">');

    /* ---- 展示身份 ---- */
    h.push('<div class="sf-g"><h4>展示身份<span class="sf-tip">孩子端「个人中心」里看到的</span></h4>');
    h.push('<div class="form-grid two">' +
      '<div class="field"><label>昵称<span class="req">*</span></label>' +
        '<input class="inp" id="f-name" maxlength="12" value="' + esc(s.name || '') + '" placeholder="例：小宇"></div>' +
      '<div class="field"><label>真实姓名（选填）</label>' +
        '<input class="inp" id="f-real" maxlength="12" value="' + esc(s.realName || '') + '" placeholder="只有家长能看到"></div>' +
      '</div>');
    h.push('<div class="form-grid two">' +
      fieldSeg('f-gender', '性别', DB.STU_GENDERS, s.gender || '不填') +
      '<div class="field"><label>头像色</label><div class="seg" id="f-color">' +
        ['c1', 'c2', 'c3', 'c4', 'c5'].map(function (c) {
          return '<button type="button" data-val="' + c + '" style="width:34px;padding:0"' +
            ((s.color || 'c1') === c ? ' class="on"' : '') + '>' +
            '<span class="av sm ' + c + '" style="margin:0 auto">' + esc((s.name || '学').charAt(0)) + '</span></button>';
        }).join('') + '</div>' +
        '<div class="hint">' + (s.avatar
          ? '孩子已上传头像，列表里显示照片；换色只影响没照片时的兜底色块'
          : '孩子在自己端上传照片后，列表里会显示照片') + '</div></div>' +
      '</div>');
    h.push('<div class="field"><label>个性签名（选填）</label>' +
      '<input class="inp" id="f-sign" maxlength="40" value="' + esc(s.signature || '') + '"' +
      ' placeholder="不填就显示「年级 · 教材 · 主攻科目」"></div>');
    h.push('</div>');

    /* ---- 学业档案 ---- */
    h.push('<div class="sf-g"><h4>学业档案<span class="sf-tip">决定出题的难度与范围</span></h4>');
    h.push('<div class="form-grid three">' +
      fieldSeg('f-grade', '年级<span class="req">*</span>', DB.STU_GRADES, s.grade || '初一') +
      fieldSeg('f-term', '学期', DB.STU_TERMS, s.term || '上学期') +
      fieldSel('f-edition', '教材版本', DB.STU_EDITIONS, s.edition || '人教版') +
      '</div>');
    h.push('<div class="field"><label>当前单元</label>' +
      '<input class="inp" id="f-unit" value="' + esc(s.unit || '') + '" placeholder="如 九上 · 第二十一章 一元二次方程">' +
      '<div class="hint">出题的核心依据 —— 学到哪，题就出到哪</div></div>');
    h.push(subjTable(DB.subjOf(s)));
    h.push('</div>');

    /* ---- 学习节奏 ---- */
    h.push('<div class="sf-g"><h4>学习节奏<span class="sf-tip">决定计划的松紧</span></h4>');
    h.push('<div class="form-grid two">' +
      '<div class="field"><label>大考名称</label><input class="inp" id="f-examName" value="' + esc(s.examName || '期末') + '"></div>' +
      '<div class="field"><label>大考日期</label><input class="inp" id="f-examDate" type="date" value="' + esc(s.examDate || '') + '"></div>' +
      '</div>');
    h.push('<div class="form-grid two">' +
      '<div class="field"><label>开始时间</label><input class="inp" id="f-start" type="time" value="' + esc(s.startTime || '20:00') + '"></div>' +
      fieldSeg('f-count', '每日题量', DB.STU_COUNTS.map(function (n) { return n + ' 题'; }),
               (s.dailyCount || '10') + ' 题', '按科目算，每天只轮 1–2 科') +
      '</div>');
    h.push(fieldSeg('f-rest', '每周休息', DB.STU_RESTDAYS, s.restDay || '周日'));
    h.push('</div>');

    /* ---- 用户端账号：建档 = 直接开好账号（2026-10-16 起没有绑定码了） ---- */
    h.push('<div class="sf-g"><h4>用户端账号<span class="sf-tip">孩子用这个账号登录用户端</span></h4>');
    h.push('<div class="form-grid two">' +
      '<div class="field"><label>登录账号<span class="req">*</span></label>' +
        '<input class="inp" id="f-account" value="' + esc(s.account || '') + '" autocomplete="off"' +
        ' placeholder="' + (isNew ? '留空自动生成，如 xj0004' : '') + '">' +
        '<div class="hint">' + (isNew
          ? '建议用孩子名字的拼音，孩子好记'
          : '改了账号，孩子下次要用新账号登录') + '</div></div>' +
      (isNew
        ? '<div class="field"><label>初始密码</label>' +
            '<div class="pw-line"><code class="mono" id="f-pwd">' + esc(s.pwdInit || DB.mkPwd()) + '</code>' +
            '<button class="btn btn-xs btn-ghost" type="button" id="f-pwd-new">' + icon('refresh') + '换一个</button></div>' +
            '<div class="hint">6 位数字，系统生成；创建后可一键复制给孩子</div></div>'
        : '<div class="field"><label>密码</label>' +
            '<div class="pw-line"><code class="mono">' +
              (s.pwdChanged ? '孩子已自行修改' : esc(s.pwdInit || '—')) + '</code></div>' +
            '<div class="hint">初始密码只在这里展示；要换密码去详情页「重置密码」</div></div>') +
      '</div>');
    h.push('</div>');

    /* ---- 班级与可见性 ---- */
    h.push('<div class="sf-g"><h4>班级与可见性</h4>');
    h.push('<div class="form-grid two">' +
      '<div class="field"><label>班级</label><input class="inp" id="f-cls" value="' + esc(s.cls || '') + '" placeholder="如 初三(3)班"></div>' +
      '<div class="field"><label>学校（可留空）</label><input class="inp" id="f-school" value="' + esc(s.school || '') + '" placeholder="默认不收集学校信息"></div>' +
      '</div>');
    h.push('<div class="form-grid two">' +
      fieldSeg('f-vis', '管理端可见范围', ['仅自己', '家人可见'], s.vis || '家人可见',
               '「家人可见」= 该学生的记录与学习数据你都能看到') +
      fieldSeg('f-perm', '功能权限',
               ['全功能', '学习专注', '只做任务', '仅看记录'].concat(
                 s.perm && s.perm.preset === 'custom' ? ['自定义（保持）'] : []),
               s.perm && s.perm.preset === 'custom' ? '自定义（保持）' : DB.permLabelOf(s),
               '选一个档位即可，之后能在详情页逐项细调') +
      '</div>');
    h.push('<div class="field"><label>备注标签</label>' +
      '<input class="inp" id="f-tag" value="' + esc(s.tag || (isNew ? '待激活' : '')) + '" placeholder="如 主号 / 妹妹 / 待激活"></div>');
    h.push('<p class="hint">档案由家长和孩子共同维护：孩子在自己端也能改资料，正式版以最后一次保存为准。' +
      '孩子自己设的「每天背几个新词」不在这里改（详情页只读展示）。</p>');
    h.push('</div>');

    h.push('</div>');
    return h.join('');
  }

  /* 绑交互 + 读数。返回 { read(), validate() }；selfId 传正在编辑的学生 id（校验账号不重复） */
  function stuFormBind(d, selfId) {
    var names = [];
    Array.prototype.forEach.call(d.querySelectorAll('#f-subj .ss-name'), function (el) {
      names.push(el.textContent);
    });

    ['#f-gender', '#f-color', '#f-grade', '#f-term', '#f-count', '#f-rest', '#f-vis', '#f-perm']
      .forEach(function (sel) { if (d.querySelector(sel)) seg(sel); });

    /* 「换一个」初始密码（只在新建时渲染这个按钮） */
    var pwNew = d.querySelector('#f-pwd-new');
    if (pwNew) pwNew.addEventListener('click', function () {
      d.querySelector('#f-pwd').textContent = DB.mkPwd();
    });

    function readSubj() {
      var out = [];
      Array.prototype.forEach.call(d.querySelectorAll('#f-subj .sf-subj-row'), function (row) {
        out.push({
          name: names[+row.getAttribute('data-i')] || '',
          on:      row.querySelector('.ss-on').classList.contains('on'),
          focus:   row.querySelector('.ss-star').classList.contains('on'),
          progress: row.querySelector('.ss-prog').value.trim(),
          target:  DB.cleanScore(row.querySelector('.ss-score').value)
        });
      });
      return out;
    }
    function repaint() {
      var subs = readSubj();
      d.querySelector('#f-son').textContent  = DB.onSubj(subs).length;
      d.querySelector('#f-tsum').textContent = DB.targetSum(subs);
    }

    var box = d.querySelector('#f-subj');
    box.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-act]');
      if (!btn) return;
      var row = btn.closest('.sf-subj-row');

      if (btn.getAttribute('data-act') === 'focus') {
        if (!row.querySelector('.ss-on').classList.contains('on')) {
          toast('先打开这一科的「出题」，再标重点', 'warn');
          return;
        }
        btn.classList.toggle('on');
        btn.setAttribute('aria-pressed', btn.classList.contains('on'));
        btn.title = btn.classList.contains('on') ? '取消重点' : '设为重点科目';
        repaint();
        return;
      }

      var on = !row.querySelector('.ss-on').classList.contains('on');
      if (!on) {
        var onN = readSubj().filter(function (s) { return s.on; }).length;
        if (onN <= 1) { toast('至少留一科出题，否则每天没有任务可发', 'warn'); return; }
      }
      var b = row.querySelector('.ss-on');
      b.classList.toggle('on', on);
      b.setAttribute('aria-pressed', on);
      row.classList.toggle('is-off', !on);
      row.querySelector('.ss-prog').disabled  = !on;
      row.querySelector('.ss-score').disabled = !on;
      if (!on) {                                  /* 关掉出题就顺手取消重点 */
        var st = row.querySelector('.ss-star');
        st.classList.remove('on'); st.setAttribute('aria-pressed', 'false');
      }
      repaint();
    });

    box.addEventListener('input', function (e) {
      var inp = e.target;
      if (!inp.classList || !inp.classList.contains('ss-score')) { repaint(); return; }
      if (String(inp.value).trim() !== '' && DB.cleanScore(inp.value) === '') {
        inp.value = '';
        toast('单科目标分最多 150 分，已清空', 'warn');
      }
      repaint();
    });

    return {
      read: function () {
        var val  = function (id) { var el = d.querySelector('#' + id); return el ? el.value.trim() : ''; };
        var segv = function (id) { var el = d.querySelector('#' + id); return el ? (segVal(el) || '') : ''; };
        var pwEl = d.querySelector('#f-pwd');
        var out = {
          name:      val('f-name'),
          realName:  val('f-real'),
          account:   val('f-account').toLowerCase(),
          gender:    segv('f-gender') || '不填',
          color:     segv('f-color') || 'c1',
          signature: val('f-sign'),
          grade:     segv('f-grade') || '初一',
          term:      segv('f-term') || '上学期',
          edition:   val('f-edition') || '人教版',
          unit:      val('f-unit'),
          subjects:  readSubj(),
          examName:  val('f-examName') || '期末',
          examDate:  val('f-examDate'),
          startTime: val('f-start') || '20:00',
          dailyCount: (segv('f-count').replace(/[^0-9]/g, '') || '10'),
          restDay:   segv('f-rest') || '周日',
          cls:       val('f-cls'),
          school:    val('f-school'),
          tag:       val('f-tag'),
          vis:       segv('f-vis') || '家人可见',
          /* 没选档位（自定义保持 / 未渲染）返回 null —— 页面据此不覆盖已细调的权限 */
          permPreset: PERM_LABEL2KEY[segv('f-perm')] || null
        };
        /* 只有新建时才有这个框；编辑时不返回，避免误覆盖浏览器里存的密码 */
        if (pwEl) out.pwdInit = pwEl.textContent.trim();
        return out;
      },
      validate: function () {
        var p = this.read();
        if (!p.name) return '请填写昵称，管理端和学生端都靠它认出这个孩子。';
        if (selfId && !p.account) return '登录账号不能为空，孩子要靠它登录用户端。';
        if (!DB.onSubj(p.subjects).length) return '至少打开一个科目的「出题」，否则每天没有任务可发。';
        if (p.account) {
          var dup = DB.get('students', []).filter(function (x) {
            return x.id !== selfId && String(x.account || '').toLowerCase() === p.account;
          })[0];
          if (dup) return '账号「' + p.account + '」已经被「' + dup.name + '」用了，换一个。';
        }
        return '';
      }
    };
  }

  /* 学生详情页「档案」区的 KV 行（页面自己套 .kv 渲染） */
  function stuRows(s) {
    var subs = DB.subjOf(s), on = DB.onSubj(s);
    var daysLeft = s.examDate ? Math.max(0, Math.round((new Date(s.examDate) - Date.now()) / 864e5)) : null;
    var dash = function (v) { return v ? esc(v) : '<span class="muted">未设置</span>'; };
    return [
      ['昵称', esc(s.name) + (s.realName ? ' <span class="muted">（' + esc(s.realName) + '）</span>' : '')],
      ['性别 / 签名', esc(s.gender || '不填') + (s.signature ? ' · ' + esc(s.signature) : ' <span class="muted">· 未填签名</span>')],
      ['年级 / 教材', esc(s.grade) + ' ' + esc(s.term) + ' · ' + esc(s.edition)],
      ['当前单元', dash(s.unit)],
      ['主攻科目', on.length
        ? '<span class="chip brand">' + esc(DB.mainSubject(s)) + '</span>' +
          ' <span class="muted">九科中已开 ' + on.length + ' 科出题</span>'
        : '<span class="muted">未开启任何科目</span>'],
      ['各科目标', on.length
        ? on.map(function (x) { return esc(x.name) + ' <b>' + (x.target || '—') + '</b>'; }).join('　') +
          '　<span class="muted">合计 ' + DB.targetSum(s) + ' 分</span>'
        : '<span class="muted">未设置</span>'],
      ['学习节奏', esc(s.startTime || '20:00') + ' 开始 · 每日 ' + esc(s.dailyCount) + ' 题 · ' + esc(s.restDay) + ' 休息'],
      ['大考', esc(s.examName) + ' · ' + (s.examDate
        ? esc(s.examDate) + (daysLeft !== null ? '（还剩 ' + daysLeft + ' 天）' : '')
        : '<span class="muted">未设置</span>')],
      ['学校 / 班级', (s.cls || s.school)
        ? esc((s.cls || '') + (s.cls && s.school ? ' · ' : '') + (s.school || ''))
        : '<span class="muted">未填写（默认不收集）</span>'],
      ['每日新词', (s.wordPerDay || 8) + ' 个 <span class="muted">· 孩子在用户端自己设，这里只读</span>'],
      ['进 prompt 的字段', '<span class="muted">年级、教材版本、当前单元、主攻科目、目标分、距考试天数 —— 这 6 项决定出题方向</span>']
    ];
  }

  /* ============================================================
     题目配图（题干 / 材料 / 子题通用一个「图区」）
     - 入图：点「添加图片」选文件（手机端会调起相册/相机）+ Ctrl+V 粘截图
     - 处理：等比压到最长边 1280 · JPEG 0.8（约 120–250KB/张），透明底压白底
     - 落库：交给 DB.imgPut 存成独立键，题目里只留引用 id
     - 正式版：把 imgCompress+imgPut 换成 multipart 上传 → 返回 URL 即可，其余不动
     ============================================================ */
  var IMG_EDGE = 1280, IMG_Q = 0.8, IMG_MAX = 3;
  var curBox = null;                 /* 当前图区焦点，粘贴时插给它 */

  function imgSrc(ref) {
    if (!ref) return '';
    if (/^(data:|blob:|https?:\/|\/)/.test(ref)) return ref;
    return (window.DB && DB.imgGet) ? DB.imgGet(ref) : '';
  }
  function imgRefs(box) { return box.__imgs || (box.__imgs = []); }

  function imgCompress(file, cb) {
    if (!/^image\//.test(file.type)) { cb(''); return; }
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
        var s = Math.min(1, IMG_EDGE / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(w * s));
        c.height = Math.max(1, Math.round(h * s));
        var cx = c.getContext('2d');
        cx.fillStyle = '#FFFFFF';                      /* PNG 透明底 → 白底，免截图黑边 */
        cx.fillRect(0, 0, c.width, c.height);
        cx.drawImage(img, 0, 0, c.width, c.height);
        var out = '';
        try { out = c.toDataURL('image/jpeg', IMG_Q); } catch (e) { out = ''; }
        cb(out);
      };
      img.onerror = function () { cb(''); };
      img.src = fr.result;
    };
    fr.onerror = function () { cb(''); };
    fr.readAsDataURL(file);
  }

  function imgHTML(opt) {
    opt = opt || {};
    var max = opt.max || IMG_MAX;
    return '<div class="imgbox" data-imgs data-max="' + max + '">' +
      '<div class="imgbox-top">' +
        '<span class="imgbox-lb">' + icon('image') + esc(opt.label || '配图') + '</span>' +
        '<span class="imgbox-hint">' + esc(opt.hint || '点添加或直接粘截图') + '</span>' +
        '<span class="imgbox-n">0/' + max + '</span>' +
      '</div>' +
      '<div class="imgbox-grid"></div>' +
      '<button type="button" class="imgbox-add">' + icon('plus') + '添加图片</button>' +
    '</div>';
  }

  function imgRender(box) {
    if (!box) return;
    var refs = imgRefs(box), max = +box.getAttribute('data-max') || IMG_MAX;
    var grid = box.querySelector('.imgbox-grid');
    var cnt = box.querySelector('.imgbox-n');
    var add = box.querySelector('.imgbox-add');
    grid.innerHTML = refs.length ? refs.map(function (r, i) {
      var src = imgSrc(r);
      return '<div class="imgcell" data-i="' + i + '">' +
        (src ? '<img src="' + src + '" alt="配图 ' + (i + 1) + '">' : '') +
        '<span class="imgcell-no">' + (i + 1) + '</span>' +
        '<button type="button" class="imgcell-x" title="删除这张">' + icon('x') + '</button>' +
      '</div>';
    }).join('') : '<div class="imgcell-empty">还没有配图</div>';
    if (cnt) cnt.textContent = refs.length + '/' + max;
    if (add) add.style.display = refs.length >= max ? 'none' : '';
    box.classList.toggle('has', refs.length > 0);
  }

  function focusBox(box) {
    if (curBox && curBox !== box) curBox.classList.remove('act');
    curBox = box;
    if (box) box.classList.add('act');
  }

  function imgSet(box, refs) {
    if (!box) return;
    box.__imgs = (refs || []).slice();
    imgRender(box);
  }
  function imgRead(box) { return (box && box.__imgs) ? box.__imgs.slice() : []; }
  /* 按 DOM 顺序收集 root 内所有图区的引用 */
  function imgReadAll(root) {
    return Array.prototype.map.call(root.querySelectorAll('.imgbox[data-imgs]'), imgRead);
  }

  function imgAdd(box, files) {
    var max = +box.getAttribute('data-max') || IMG_MAX;
    var refs = imgRefs(box);
    var room = max - refs.length;
    var imgs = files.filter(function (f) { return /^image\//.test(f.type); });
    if (!imgs.length) return;
    if (room <= 0) { toast('最多 ' + max + ' 张，先删一张再传', 'warn'); return; }
    if (imgs.length > room) { toast('最多 ' + max + ' 张，多出的已忽略', 'warn'); imgs = imgs.slice(0, room); }
    box.classList.add('busy');
    var left = imgs.length;
    imgs.forEach(function (f) {
      imgCompress(f, function (dataURL) {
        left--;
        if (!dataURL) { toast('有 1 张图片读取失败', 'warn'); }
        else {
          var id = (window.DB && DB.imgPut) ? DB.imgPut(dataURL) : dataURL;
          if (!id) toast('本地存储已满，这张没能存下', 'warn');
          else refs.push(id);
        }
        if (left <= 0) { box.classList.remove('busy'); imgRender(box); }
      });
    });
  }

  function imgPick(box) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      var fs = Array.prototype.slice.call(input.files || []);
      input.remove();
      if (fs.length) { focusBox(box); imgAdd(box, fs); }
    });
    input.click();
  }

  /* 图区事件：全局委托（抽屉里的图区是动态插入的） */
  document.addEventListener('click', function (e) {
    var add = e.target.closest('.imgbox-add');
    if (add) { var b = add.closest('.imgbox'); focusBox(b); imgPick(b); return; }

    var x = e.target.closest('.imgcell-x');
    if (x) {
      var box = x.closest('.imgbox');
      var i = +x.closest('.imgcell').getAttribute('data-i');
      var gone = imgRefs(box).splice(i, 1)[0];
      if (gone && window.DB && DB.imgDel) DB.imgDel(gone);
      imgRender(box);
      return;
    }

    var big = e.target.closest('.imgcell img');
    if (big) {
      modal({ title: '配图预览', body: '<div class="imgbig"><img src="' + big.getAttribute('src') + '" alt="配图"></div>' });
      return;
    }

    var box2 = e.target.closest('.imgbox');
    if (box2) focusBox(box2);
  });

  /* 粘贴：剪贴板里是图片才接管，纯文字粘贴照常走默认行为 */
  document.addEventListener('paste', function (e) {
    var dt = e.clipboardData || window.clipboardData;
    if (!dt || !dt.items) return;
    var files = [];
    for (var i = 0; i < dt.items.length; i++) {
      var it = dt.items[i];
      if (it.kind === 'file' && /^image\//.test(it.type)) {
        var f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (!files.length) return;
    var scope = document.getElementById('drawer') || document.getElementById('modal') || document;
    var boxes = scope.querySelectorAll('.imgbox[data-imgs]');
    if (!boxes.length) return;
    var box = (curBox && scope.contains(curBox)) ? curBox : boxes[0];
    /* 多个图区且没点过：落到第一个并说清楚粘到哪了（T4 材料 + 各子题时避免粘错） */
    if (boxes.length > 1 && !(curBox && scope.contains(curBox))) {
      var lb = box.querySelector('.imgbox-lb');
      toast('已粘到「' + (lb ? lb.textContent.trim() : '配图') + '」，点其它框可切换', 'ok');
    }
    e.preventDefault();
    focusBox(box);
    imgAdd(box, files);
  });

  /* 日期：今天 / N 天前 / 中文日期 */
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dayLabel(off) {
    var d = new Date(); d.setDate(d.getDate() + (off || 0));
    return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()];
  }
  function dateLabel(off) {
    var d = new Date(); d.setDate(d.getDate() + (off || 0));
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function ago(ts) {
    var s = (Date.now() - ts) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' 分钟前';
    if (s < 86400) return Math.round(s / 3600) + ' 小时前';
    if (s < 86400 * 30) return Math.round(s / 86400) + ' 天前';
    return dateLabel(Math.round(-s / 86400));
  }

  /* ---------- 启动 ---------- */
  function boot() {
    var page = document.body.getAttribute('data-page');
    if (page === 'auth') return;
    /* ?preview：无头截图/演示用，自动建立会话（不影响正常登录流程） */
    if (!session() && /preview/.test(location.search)) {
      setSession({ account: 'admin', name: '妈妈', role: 'admin', loginAt: Date.now() });
    }
    if (!session()) { location.replace('index.html'); return; }
    shell();
    var y = document.getElementById('year');
    if (y) y.textContent = new Date().getFullYear();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();

  return {
    icon: icon, esc: esc, avatar: avatar, toast: toast, copy: copy,
    drawer: drawer, closeDrawer: closeDrawer, modal: modal, closeModal: closeModal, confirm: confirmBox,
    seg: seg, segVal: segVal, theme: theme, logout: logout, session: session, setSession: setSession,
    stuForm: stuForm, stuFormBind: stuFormBind, stuRows: stuRows,
    currentId: currentId, setCurrent: setCurrent, currentStudent: currentStudent, pending: pendingCounts,
    imgs: { html: imgHTML, render: imgRender, read: imgRead, readAll: imgReadAll, set: imgSet,
            src: imgSrc, pick: imgPick, add: imgAdd, focus: focusBox, MAX: IMG_MAX, EDGE: IMG_EDGE },
    today: today, dayLabel: dayLabel, dateLabel: dateLabel, ago: ago, NAV: NAV
  };
})();
