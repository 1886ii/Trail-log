/* ============================================================
   学迹 · 管理端 demo.js
   演示数据 + 本地存储（键前缀 xjadmin-，与用户端 xj-* 完全隔离）
   - 首次打开自动灌入种子数据；「设置」页可一键重置
   - 所有页面通过 DB.get('key', 默认值) 读写
   ============================================================ */
window.DB = (function () {
  var KEY = 'xjadmin-db';
  var cache = null;

  /* ---------- 佳作库种子：两个入口各一条（手动录入的范文 + 从作文批改入选的学生作文） ----------
     佳作只在「作文批改」里产生：录入佳作 / 把学生作文设为佳作。
     记录（posts）不参与佳作。学生端「佳作」位读这一份合集。 */
  /* ---------- 学生功能权限：8 个开关 + 档位名 ----------
     与 vis（家长能否看到孩子记录）是两个独立维度，不要混。
     preset 只用于显示档位名，mods 才是实际生效值。           */
  var PERM_KEYS = ['home', 'daily', 'reading', 'essay', 'all', 'mistakes', 'posts', 'post'];
  var PERM_LABELS = {
    home: '首页', daily: '每日任务', reading: '阅读', essay: '作文',
    all: '全科', mistakes: '错题本', posts: '看记录', post: '发记录'
  };
  var PERM_DESC = {
    home: '打卡 · 连击 · 今日概览',
    daily: '题目 · 单词 · 阅读 · 计算',
    reading: '书目目录与正文',
    essay: '作文任务与批改',
    all: '九门科目掌握度',
    mistakes: '错过的题集中复习',
    posts: '查看自己发布的图文',
    post: '发新的图文记录'
  };
  var PERM_PRESETS = {
    full:     { label: '全功能',   mods: { home:1, daily:1, reading:1, essay:1, all:1, mistakes:1, posts:1, post:1 } },
    learn:    { label: '学习专注', mods: { home:1, daily:1, reading:1, essay:1, all:1, mistakes:1, posts:1, post:0 } },
    task:     { label: '只做任务', mods: { home:1, daily:1, reading:0, essay:0, all:0, mistakes:0, posts:0, post:0 } },
    readonly: { label: '仅看记录', mods: { home:0, daily:0, reading:0, essay:0, all:0, mistakes:0, posts:1, post:0 } }
  };
  /* 按档位造一份权限对象（深拷贝，避免预设被就地改坏） */
  function permNew(preset, at) {
    var p = PERM_PRESETS[preset] ? preset : 'full';
    return { preset: p, mods: JSON.parse(JSON.stringify(PERM_PRESETS[p].mods)), updatedAt: at || 0 };
  }
  /* 读学生权限：缺字段的老数据兜底成全功能，且只保留 8 个已知键 */
  function permOf(stu) {
    if (!stu || !stu.perm || !stu.perm.mods) return permNew('full');
    var m = stu.perm.mods, out = {};
    PERM_KEYS.forEach(function (k) { out[k] = m[k] ? 1 : 0; });
    var ps = stu.perm.preset || 'custom';
    if (ps !== 'custom' && !PERM_PRESETS[ps]) ps = 'custom';
    return { preset: ps, mods: out, updatedAt: stu.perm.updatedAt || 0 };
  }
  /* 与预设逐项比对：全对得上就是那个档位，否则算自定义 */
  function permMatch(mods) {
    var hit = null;
    Object.keys(PERM_PRESETS).forEach(function (k) {
      if (hit) return;
      var pm = PERM_PRESETS[k].mods, same = true;
      PERM_KEYS.forEach(function (x) { if (!!pm[x] !== !!mods[x]) same = false; });
      if (same) hit = k;
    });
    return hit || 'custom';
  }
  function permLabelOf(stu) {
    var p = permOf(stu);
    return PERM_PRESETS[p.preset] ? PERM_PRESETS[p.preset].label : '自定义';
  }
  function permOn(stu, k) { return !!permOf(stu).mods[k]; }

  /* ------------------------------------------------------------
     学生档案：字段口径与用户端「编辑资料」完全对齐
     - 用户端把档案存在 xj-profile，管理端存在 student 记录上；正式版是同一张表
     - 年级统一「初一 / 初二 / 初三」= 学生年级；书目、词书里的「七年级上」是教材分册，两回事
     - subjects 九科表是唯一真源；subject / target 是给题库、出题页读的兼容派生值，写库前由 stuSync 同步
     ------------------------------------------------------------ */
  var STU_GRADES   = ['初一', '初二', '初三'];
  var STU_TERMS    = ['上学期', '下学期'];
  var STU_EDITIONS = ['人教版', '北师大版', '苏科版', '沪科版', '外研版'];
  var STU_GENDERS  = ['男', '女', '不填'];
  var STU_RESTDAYS = ['周六', '周日', '不休息'];
  var STU_COUNTS   = ['5', '10', '15', '20'];
  var STU_STATUS   = { active: '在用', disabled: '已停用' };

  var SUBJ_ALL = ['语文', '数学', '英语', '物理', '化学', '生物', '历史', '道法', '地理'];
  var SUBJ_ON_DEFAULT = ['语文', '数学', '英语'];    /* 首期只开三主科 */

  /* 口径别名：老库里的「七年级」就是初一；「部编/统编」统一并到人教版 */
  var GRADE_ALIAS = { '六年级': '初一', '七年级': '初一', '八年级': '初二', '九年级': '初三' };
  var EDITION_ALIAS = { '人教': '人教版', '部编': '人教版', '统编': '人教版',
                        '北师大': '北师大版', '外研': '外研版', '苏教': '苏科版', '沪科': '沪科版' };
  function normGrade(g) {
    if (STU_GRADES.indexOf(g) >= 0) return g;
    return GRADE_ALIAS[g] || '初一';
  }
  function normEdition(e) {
    if (STU_EDITIONS.indexOf(e) >= 0) return e;
    return EDITION_ALIAS[e] || '人教版';
  }
  /* 单科目标分：0 < v ≤ 150，其余一律当没填 */
  function cleanScore(v) {
    var n = parseFloat(v);
    if (!(n > 0) || n > 150) return '';
    return String(Math.round(n));
  }

  /* 九科表一行：on=出每日任务 / focus=重点 / progress=当前进度 / target=目标分 */
  function subjSeed(mainSubject, target, onList) {
    var on = onList || SUBJ_ON_DEFAULT;
    var t  = cleanScore(target);
    return SUBJ_ALL.map(function (n) {
      return { name: n, on: on.indexOf(n) >= 0, focus: n === mainSubject,
               progress: '', target: (n === mainSubject && t) ? t : '' };
    });
  }
  /* 建一份带多科目标分的九科表（seed 与新建学生用） */
  function subjSet(mainSubject, targets, onList) {
    var out = subjSeed(mainSubject, '', onList);
    out.forEach(function (s) {
      if (targets && targets[s.name] !== undefined) s.target = cleanScore(targets[s.name]);
    });
    return out;
  }
  /* 规范化：固定 9 行、固定顺序 —— 少的补上，多的丢掉，脏值清掉
     入参可以是学生记录，也可以直接传科目数组 */
  function subjOf(stu) {
    var src = Array.isArray(stu) ? stu
            : (stu && Array.isArray(stu.subjects)) ? stu.subjects
            : null;
    if (!src) return subjSeed(stu && stu.subject, stu && stu.target);
    return SUBJ_ALL.map(function (n) {
      var hit = null;
      src.forEach(function (s) { if (s && s.name === n) hit = s; });
      return { name: n, on: !!(hit && hit.on), focus: !!(hit && hit.focus),
               progress: (hit && hit.progress) || '', target: cleanScore(hit && hit.target) };
    });
  }
  function onSubj(stu) { return subjOf(stu).filter(function (s) { return s.on; }); }
  /* 主攻科目：先看标了「重点」的科，再看第一个开了练习的科 */
  function mainSubject(stu) {
    var on = onSubj(stu);
    var f = on.filter(function (s) { return s.focus; })[0];
    return (f || on[0] || {}).name || '';
  }
  function targetSum(stu) {
    return onSubj(stu).reduce(function (n, s) { var v = parseFloat(s.target); return n + (v > 0 ? v : 0); }, 0);
  }
  /* 写库前统一过一遍：补默认字段 + 同步派生值（subject / target / initial） */
  function stuSync(stu) {
    if (!stu) return stu;
    stu.subjects  = subjOf(stu);
    stu.name      = String(stu.name || '').trim() || '学生';
    stu.initial   = stu.initial || stu.name.charAt(0);   /* 首字母色块的兜底字，改名时由页面更新 */
    stu.grade     = normGrade(stu.grade);
    stu.term      = STU_TERMS.indexOf(stu.term) >= 0 ? stu.term : '上学期';
    stu.edition   = normEdition(stu.edition);
    stu.gender    = STU_GENDERS.indexOf(stu.gender) >= 0 ? stu.gender : '不填';
    stu.restDay   = STU_RESTDAYS.indexOf(stu.restDay) >= 0 ? stu.restDay : '周日';
    stu.dailyCount= STU_COUNTS.indexOf(String(stu.dailyCount)) >= 0 ? String(stu.dailyCount) : '10';
    if (!stu.startTime)   stu.startTime = '20:00';
    if (stu.avatar === undefined)    stu.avatar = '';
    if (stu.realName === undefined)  stu.realName = '';
    if (stu.signature === undefined) stu.signature = '';
    if (stu.school === undefined)    stu.school = '';
    if (stu.cls === undefined)       stu.cls = '';
    if (stu.unit === undefined)      stu.unit = '';
    if (stu.examName === undefined)  stu.examName = '期末';
    if (stu.examDate === undefined)  stu.examDate = '';
    if (stu.status === undefined)    stu.status = 'active';
    if (stu.wordPerDay === undefined) stu.wordPerDay = 8;
    stu.subject = mainSubject(stu);
    var main = stu.subjects.filter(function (x) { return x.name === stu.subject; })[0];
    stu.target  = main ? (+main.target || 0) : 0;
    return stu;
  }
  /* ---------- 用户端账号体系（2026-10-16 起不再有绑定码） ----------
     管理端建档 = 直接开好用户端账号：账号 + 系统生成的 6 位初始密码。
     为什么不要绑定码：自用 + 单管理员 + 1 账号 = 1 学生，归属天然唯一，
     不需要「拿凭证兑换归属」这一层；孩子用账号密码登录，后端按账号直接找到档案。
       - account   孩子登录用的账号（建时可自定，建议真名/昵称拼音）
       - pwdInit   系统生成的 6 位数字初始密码（管理端可见，孩子首次登录后建议改）
       - pwdChanged 孩子是否已自行改过密码
       - activated / activatedAt  是否首次登录过（家长据此知道孩子有没有开始用）
       - lastDevice  最近登录设备（「强制下线」会清掉） */
  function mkPwd() {
    var s = '';
    for (var i = 0; i < 6; i++) s += Math.floor(Math.random() * 10);
    return s;
  }
  /* 账号兜底：家长没填时给 xj0001 这类顺序号，避让已占用的 */
  function mkAccount(excludeId) {
    var taken = get('students', []).filter(function (s) { return s.id !== excludeId; })
                                   .map(function (s) { return s.account; });
    for (var i = 1; i < 9999; i++) {
      var a = 'xj' + ('000' + i).slice(-4);
      if (taken.indexOf(a) < 0) return a;
    }
    return 'xj' + Date.now().toString(36).slice(-4);
  }

  /* 建学生：id、用户端账号、初始密码、统计位、默认权限一次给全
     （正式版由后端生成 id 与初始密码；账号用家长填的值） */
  function stuNew(p) {
    p = p || {};
    var rec = {
      id: 's' + Date.now().toString(36) + Math.floor(Math.random() * 90 + 10),
      account: String(p.account || '').trim().toLowerCase() || mkAccount(null),
      pwdInit: mkPwd(), pwdChanged: false,
      activated: false, activatedAt: null, lastDevice: '', createdAt: Date.now(),
      tag: '待激活', vis: '家人可见', status: 'active',
      streak: 0, minutes7: 0, rate7: 0, lastActive: null, points: 0,
      perm: permNew(p.permPreset || 'full', Date.now())
    };
    Object.keys(p).forEach(function (k) {
      if (k === 'permPreset' || k === 'id' || k === 'account' || k === 'pwdInit' ||
          k === 'pwdChanged' || k === 'activated' || k === 'activatedAt' || k === 'lastDevice') return;
      rec[k] = p[k];
    });
    stuSync(rec);
    var all = get('students', []);
    all.push(rec);
    set('students', all);
    return rec;
  }
  /* 重置密码：换一份新的初始密码（孩子下次登录要用新的；正式版同时吊销旧会话） */
  function stuResetPwd(id) {
    var hit = null;
    var all = get('students', []).map(function (s) {
      if (s.id !== id) return s;
      s.pwdInit = mkPwd();
      s.pwdChanged = false;
      s.kickedAt = Date.now();
      hit = s;
      return s;
    });
    set('students', all);
    return hit;
  }
  /* 强制下线：清掉记录中的登录设备（正式版由后端吊销 token） */
  function stuKick(id) {
    var hit = null;
    var all = get('students', []).map(function (s) {
      if (s.id !== id) return s;
      s.lastDevice = '';
      s.kickedAt = Date.now();
      hit = s;
      return s;
    });
    set('students', all);
    return hit;
  }
  /* 停用 / 恢复：停用不动数据，学生端下次进入时每个模块都是一把锁 */
  function stuDisable(id, off) {
    var hit = null;
    var all = get('students', []).map(function (s) {
      if (s.id !== id) return s;
      s.status = off ? 'disabled' : 'active';
      s.disabledAt = off ? Date.now() : null;
      hit = s;
      return s;
    });
    set('students', all);
    return hit;
  }
  /* 删学生：连带清掉他名下的学习数据，返回清理统计（确认框要如实告知删了什么） */
  function stuPurge(id) {
    var n = { tasks: 0, posts: 0, stats: 0, essaySubs: 0, bookProgress: 0 };

    set('students', get('students', []).filter(function (s) { return s.id !== id; }));

    var tasks = get('tasks', {});
    if (tasks[id]) { delete tasks[id]; n.tasks = 1; set('tasks', tasks); }

    ['activity', 'mastery', 'weak'].forEach(function (k) {
      var box = get(k, {});
      if (box[id] !== undefined) { delete box[id]; n.stats++; set(k, box); }
    });

    var posts = get('posts', []);
    var left  = posts.filter(function (p) { return p.sid !== id; });
    n.posts = posts.length - left.length;
    set('posts', left);

    var essays = get('essays', []);
    essays.forEach(function (t) {
      var before = (t.subs || []).length;
      t.subs = (t.subs || []).filter(function (s) { return s.sid !== id; });
      n.essaySubs += before - t.subs.length;
    });
    set('essays', essays);

    var books = get('books', []);
    books.forEach(function (b) {
      if (b.students) b.students = b.students.filter(function (x) { return x !== id; });
      if (b.progress && b.progress[id] !== undefined) { delete b.progress[id]; n.bookProgress++; }
    });
    set('books', books);

    var wbs = get('wordbooks', []);
    wbs.forEach(function (b) {
      if (b.students) b.students = b.students.filter(function (x) { return x !== id; });
    });
    set('wordbooks', wbs);
    return n;
  }

  function featuredSeed(now, essays) {
    var day = 86400000, hour = 3600000;
    var s1text = '';
    (essays || []).forEach(function (t) {
      if (t.id === 'E-318') (t.subs || []).forEach(function (s) { if (s.sid === 's1') s1text = s.text; });
    });
    return [
      { id: 'F-201', from: 'manual', subject: '语文', title: '那盏亮到很晚的台灯',
        author: '范文 · 满分作文选', sid: null, words: 806, tags: ['细节描写', '以物写人'],
        at: now - 2 * day, by: '我 · 手动录入',
        note: '以物写人的示范：台灯在开头、转折、结尾各出现一次，情绪层层递进。讲「细节描写」时可以直接拿它当范本。',
        text: '台灯是小学三年级买的，塑料灯罩早就黄了，可它亮着的时候，整个屋子都安静。\n' +
              '那天夜里，我趴在桌上改错题，改到第三遍还是错，手一推，草稿纸散了一地。抬头时看见那盏灯还亮着，' +
              '光晕里有妈妈弯腰捡纸的背影 —— 她一直没走，只是不出声。\n' +
              '灯亮到十一点半。后来我每次快撑不住，就会想起那团黄黄的光。\n\n（全文 806 字，此处为节选）',
        },
      { id: 'F-202', from: 'essay', refId: 'E-318|s1', subject: '英语', title: 'My Weekend',
        author: '小宇', sid: 's1', words: 96, tags: ['时态统一', '细节充足'],
        at: now - 18 * hour, by: '我 · 作文批改入选',
        note: '一般过去时全篇统一，活动细节 3 个以上，结构清楚，可作为本单元写作模板给小雨参考。',
        text: s1text }
    ];
  }

  /* 预置词书：七年级上册 / 七年级下册 / 中考词书
     —— seed 与老库迁移共用；用户可自行增删改（如再加八年级、高中词汇） */
  function presetWordBooks(now) {
    var t = now || Date.now(), D = 864e5;
    return [
      { id: 'wb-7a', name: '七年级上册单词', grade: '七年级上', unitName: 'Unit',
        units: ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'Unit 6'],
        target: 240, note: '七上全册词汇，按单元推进', published: true, createdAt: t - 30 * D },
      { id: 'wb-7b', name: '七年级下册单词', grade: '七年级下', unitName: 'Unit',
        units: ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5', 'Unit 6'],
        target: 260, note: '七下全册词汇，按单元推进', published: false, createdAt: t - 20 * D },
      { id: 'wb-zk', name: '中考词书', grade: '九年级', unitName: '分组',
        units: ['高频词', '核心词', '易错词'],
        target: 1600, note: '中考高频 + 核心词汇，考前按分组过', published: false, createdAt: t - 10 * D }
    ];
  }

  /* ---------- 作答记录 / 错题本：读取与统计 ----------
     sid 传学生 id = 只看这个学生；传 null/空 = 看全部学生（家长管多个孩子时用） */
  function subsOf(sid) {
    return get('submissions', []).filter(function (s) { return !sid || s.sid === sid; })
      .sort(function (a, b) { return b.at - a.at; });
  }
  function mistakesOf(sid) {
    var list = get('mistakes', []).filter(function (m) { return !sid || m.sid === sid; });
    list.sort(function (a, b) {
      if ((a.status === 'open') !== (b.status === 'open')) return a.status === 'open' ? -1 : 1;
      return b.lastAt - a.lastAt;
    });
    return list;
  }
  /* 近 N 天作答概览：次数 / 正确率 / 平均用时 / 得分 */
  function subStat(sid, days) {
    var from = days ? Date.now() - days * 864e5 : 0;
    var list = get('submissions', []).filter(function (s) { return (!sid || s.sid === sid) && s.at >= from; });
    var ok = list.filter(function (s) { return s.ok; }).length;
    var ms = list.reduce(function (n, s) { return n + (s.ms || 0); }, 0);
    return {
      n: list.length,
      right: list.length ? Math.round(ok * 100 / list.length) : 0,
      avgMs: list.length ? Math.round(ms / list.length) : 0,
      score: list.reduce(function (n, s) { return n + (s.score || 0); }, 0),
      full: list.reduce(function (n, s) { return n + (s.full || 0); }, 0)
    };
  }
  function mkStat(sid) {
    var list = get('mistakes', []).filter(function (m) { return !sid || m.sid === sid; });
    var subj = {}, open = 0;
    list.forEach(function (m) {
      subj[m.subject] = (subj[m.subject] || 0) + 1;
      if (m.status === 'open') open++;
    });
    return { total: list.length, open: open, fixed: list.length - open, subjects: subj };
  }

  /* 薄弱知识点：由作答记录按知识点聚合（正确率越低越靠前）—— 不再手填，
     和用户端的作答直接挂钩：孩子错在哪，这里就排前面 */
  function weakOf(sid) {
    var list = get('submissions', []).filter(function (s) { return !sid || s.sid === sid; });
    var by = {};
    list.forEach(function (s) {
      var k = s.kp || '未标注知识点';
      var o = by[k] || (by[k] = { kp: k, subject: s.subject, n: 0, ok: 0 });
      o.n++;
      if (s.ok) o.ok++;
    });
    return Object.keys(by).map(function (k) {
      var o = by[k];
      return { kp: o.kp, subject: o.subject, n: o.n, ok: o.ok, rate: o.ok / o.n };
    }).sort(function (a, b) { return a.rate - b.rate || b.n - a.n; });
  }

  /* ---------- 作答记录种子：学生端做题产生的流水 ----------
     这是「掌握度 / 薄弱点 / 错题本 / 全科」的共同数据源：
       ok=1 累计正确率、按知识点分组得薄弱点、答错自动进错题本。
     正式版由服务端判分后写入，管理端只读（家长改不了学生做过的题）。 ---------- */
  function seedSubs(qbank, now) {
    var hour = 3600000, day = 86400000;
    function mkSub(id, sid, qid, o) {
      var q = (qbank || []).filter(function (x) { return x.id === qid; })[0] || {};
      return {
        id: id, sid: sid, qid: qid, subject: q.subject || '', kp: q.kp || '', type: q.type || 'T1',
        from: o.from || 'practice',
        ans: o.ans, ok: !!o.ok, score: o.score, full: q.score || 3,
        ms: o.ms || 90000, at: o.at
      };
    }
    return [
      mkSub('sub-001', 's1', 'Q-1042', { ans: 'A', ok: 1, score: 3, ms: 48000, at: now - 3 * hour }),
      mkSub('sub-002', 's1', 'Q-1043', { ans: 'A', ok: 0, score: 0, ms: 132000, at: now - 4 * hour }),
      mkSub('sub-003', 's1', 'Q-1060', { ans: 'b=3，k=−2，图象过第一、二、四象限', ok: 1, score: 6, ms: 228000, at: now - 5 * hour }),
      mkSub('sub-004', 's1', 'Q-1044', { ans: '后天下之乐而乐', ok: 1, score: 4, ms: 36000, at: now - 26 * hour }),
      mkSub('sub-005', 's1', 'Q-1045', { ans: 'A', ok: 0, score: 0, ms: 74000, at: now - 27 * hour }),
      mkSub('sub-006', 's1', 'Q-1053', { ans: 'B', ok: 1, score: 3, ms: 41000, at: now - 28 * hour }),
      mkSub('sub-007', 's1', 'Q-1054', { ans: '2O / H2O', ok: 0, score: 2, ms: 96000, at: now - 29 * hour, from: 'calc' }),
      mkSub('sub-008', 's1', 'Q-1042', { ans: 'A', ok: 1, score: 3, ms: 33000, at: now - 2 * day }),
      mkSub('sub-009', 's1', 'Q-1046', { ans: 'x₁+x₂=5，x₁x₂=6，所以答案是 11', ok: 0, score: 4, ms: 310000, at: now - 2 * day - 2 * hour }),
      mkSub('sub-010', 's1', 'Q-1048', { ans: 'B', ok: 1, score: 3, ms: 52000, at: now - 2 * day - 4 * hour }),
      mkSub('sub-011', 's1', 'Q-1059', { ans: 'C', ok: 1, score: 3, ms: 28000, at: now - 2 * day - 20 * hour }),
      mkSub('sub-012', 's1', 'Q-1043', { ans: 'B', ok: 1, score: 3, ms: 88000, at: now - 3 * day, from: 'wrong' }),
      mkSub('sub-013', 's1', 'Q-1047', { ans: '在乎山水之间', ok: 0, score: 0, ms: 45000, at: now - 3 * day - 3 * hour }),
      mkSub('sub-014', 's1', 'Q-1049', { ans: '20+2x；W=−2x²+60x+800；降价 10 元时利润最大', ok: 0, score: 6, ms: 420000, at: now - 4 * day }),
      mkSub('sub-015', 's1', 'Q-1052', { ans: 'My favourite book is Journey to the West. It was written by Wu Cheng\'en. I like it because the story is exciting and the monkey king is brave.', ok: 1, score: 6, ms: 265000, at: now - 4 * day - 5 * hour }),
      mkSub('sub-016', 's1', 'Q-1042', { ans: 'A', ok: 1, score: 3, ms: 39000, at: now - 5 * day }),
      mkSub('sub-017', 's1', 'Q-1045', { ans: 'B', ok: 1, score: 3, ms: 61000, at: now - 5 * day - 4 * hour, from: 'wrong' }),
      mkSub('sub-018', 's1', 'Q-1053', { ans: 'B', ok: 1, score: 3, ms: 37000, at: now - 6 * day }),
      mkSub('sub-019', 's1', 'Q-1060', { ans: 'k=−2，b=3', ok: 0, score: 3, ms: 180000, at: now - 6 * day - 6 * hour, from: 'wrong' }),
      mkSub('sub-020', 's1', 'Q-1043', { ans: 'C', ok: 0, score: 0, ms: 145000, at: now - 7 * day, from: 'wrong' }),
      mkSub('sub-021', 's1', 'Q-1044', { ans: '后天下之乐而乐', ok: 1, score: 4, ms: 30000, at: now - 8 * day }),
      mkSub('sub-022', 's1', 'Q-1054', { ans: '2O / H₂O', ok: 1, score: 4, ms: 88000, at: now - 8 * day - 3 * hour, from: 'calc' }),
      mkSub('sub-023', 's1', 'Q-1049', { ans: 'W=−2x²+60x+800，降价 15 元，最大利润 1250 元', ok: 1, score: 12, ms: 360000, at: now - 9 * day, from: 'wrong' }),
      mkSub('sub-024', 's1', 'Q-1047', { ans: '在乎山水之间也', ok: 1, score: 4, ms: 42000, at: now - 9 * day - 5 * hour, from: 'wrong' }),
      mkSub('sub-101', 's2', 'Q-1055', { ans: 'B', ok: 1, score: 3, ms: 44000, at: now - 8 * hour }),
      mkSub('sub-102', 's2', 'Q-1058', { ans: '太平洋 / 亚洲', ok: 1, score: 4, ms: 68000, at: now - 9 * hour }),
      mkSub('sub-103', 's2', 'Q-1050', { ans: 'interesting', ok: 0, score: 0, ms: 92000, at: now - 30 * hour }),
      mkSub('sub-104', 's2', 'Q-1057', { ans: 'B', ok: 1, score: 3, ms: 40000, at: now - 2 * day }),
      mkSub('sub-105', 's2', 'Q-1056', { ans: '秦始皇统一了文字和货币', ok: 0, score: 2, ms: 210000, at: now - 4 * day }),
      mkSub('sub-106', 's2', 'Q-1055', { ans: 'B', ok: 1, score: 3, ms: 35000, at: now - 5 * day })
    ];
  }

  /* ---------- 错题本种子：答错自动收进、答对自动移出 ----------
     规则与学生端一致：答错 → 已在则 wrong+1、否则新增；答对 → status 记 corrected（订正）。
     lv = 复习轮次（复用艾宾浩斯节奏），nextAt = 下次复习日。
     管理端不造错题，只做查看 + 给一条「家长批注」。 ---------- */
  function seedMistakes(now) {
    var hour = 3600000, day = 86400000;
    return [
      { sid: 's1', qid: 'Q-1043', subject: '数学', kp: '二次函数 · 图象与系数关系',
wrong: 3, firstAt: now - 7 * day, lastAt: now - 4 * hour, lv: 2,
nextAt: now + 1 * day, status: 'open', note: '' },
      { sid: 's1', qid: 'Q-1045', subject: '英语', kp: '九上 · 过去完成时',
wrong: 2, firstAt: now - 5 * day, lastAt: now - 27 * hour, lv: 1,
nextAt: now + 2 * day, status: 'open', note: '「by the time」的时间轴画一遍就懂了' },
      { sid: 's1', qid: 'Q-1049', subject: '数学', kp: '二次函数 · 实际应用',
wrong: 2, firstAt: now - 9 * day, lastAt: now - 4 * day, lv: 1,
nextAt: now + 4 * day, status: 'open', note: '' },
      { sid: 's1', qid: 'Q-1047', subject: '语文', kp: '九上 · 醉翁亭记 · 默写',
        wrong: 1, firstAt: now - 3 * day, lastAt: now - 3 * day, lv: 1,
        nextAt: now + 4 * day, status: 'open', note: '' },
      { sid: 's1', qid: 'Q-1060', subject: '数学', kp: '八下 · 一次函数 · 图象与性质',
wrong: 2, firstAt: now - 6 * day, lastAt: now - 5 * hour, lv: 2,
nextAt: now + 5 * day, status: 'corrected', note: '', fixedAt: now - 5 * hour },
      { sid: 's2', qid: 'Q-1050', subject: '英语', kp: '八下 · 词汇 · 词形变化',
wrong: 1, firstAt: now - 30 * hour, lastAt: now - 30 * hour, lv: 0,
nextAt: now + 1 * day, status: 'open', note: '' },
      { sid: 's2', qid: 'Q-1056', subject: '历史', kp: '七上 · 秦朝 · 中央集权',
wrong: 1, firstAt: now - 4 * day, lastAt: now - 4 * day, lv: 0,
nextAt: now + 2 * day, status: 'open', note: '' }
    ];
  }

  /* ============================================================
     AI 中枢（2026-10-21）
     ------------------------------------------------------------
     · 供应商 providers：接口地址 + 密钥（可多把，指定主密钥）+ 模型价目
     · 路由 routes：每个环节（出题 / 识字 / 预筛 / 批改 / 讲解 / 单词 / 配题）
       用哪家哪个模型 —— 这就是「AI 的切换」
     · 用量 usage：已经花掉的账（种子阶段算定，不随路由改动回溯变化）
     · 预算 budget：月额度、提醒线、超额策略
     正式版：密钥服务端 AES-GCM 加密存库、只回显尾 4 位；用量由服务端
     在每次调用后落 ai_usage 表；这里的结构就是接口返回的形状。
     ============================================================ */
  var AI_KINDS = [
    { id: 'deepseek',  name: 'DeepSeek',        base: 'https://api.deepseek.com/v1',
      hint: '中文题感好、价格低，适合出题与讲解' },
    { id: 'dashscope', name: '通义千问（百炼）', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      hint: 'qwen-vl 系列能看图，题目拍照识别走它' },
    { id: 'zhipu',     name: '智谱 GLM',        base: 'https://open.bigmodel.cn/api/paas/v4',
      hint: 'glm-4-flash 有免费额度，适合做预筛' },
    { id: 'doubao',    name: '豆包（火山方舟）', base: 'https://ark.cn-beijing.volces.com/api/v3',
      hint: '按推理点 ID 调用，需先在方舟开通' },
    { id: 'openai',    name: 'OpenAI 兼容',     base: 'https://api.openai.com/v1',
      hint: '中转 / 自建服务多半兼容这一套，改地址即可' },
    { id: 'azure',     name: 'Azure OpenAI',    base: 'https://<资源名>.openai.azure.com/openai/deployments/<部署名>',
      hint: '路径里带部署名，鉴权走 api-key 头' },
    { id: 'gemini',    name: 'Gemini',          base: 'https://generativelanguage.googleapis.com/v1beta/openai',
      hint: '走官方 OpenAI 兼容层' },
    { id: 'ollama',    name: '本地 Ollama',     base: 'http://127.0.0.1:11434/v1',
      hint: '不花钱、不出网，慢；当兜底用' }
  ];

  /* 环节：tin / tout 是单次平均输入输出 tokens（成本估算与试跑都用它） */
  var AI_SCENES = [
    { id: 'gen',     name: '出题 · 题目生成', desc: '按知识点与难度批量出题，带答案与采分点', icon: 'db',     tin: 420,  tout: 620 },
    { id: 'ocr',     name: '出题 · 图片识字', desc: '拍照 / 截图转成结构化题干',               icon: 'image',  tin: 1200, tout: 300, vision: true },
    { id: 'review',  name: '审核 · 质量预筛', desc: '判重、判超纲、给置信分',                 icon: 'shield', tin: 280,  tout: 60  },
    { id: 'essay',   name: '批改 · 作文评分', desc: '按评分细则给分，逐条点评',               icon: 'pen',    tin: 1600, tout: 900 },
    { id: 'explain', name: '讲解 · 错题解析', desc: '错因归类、分步讲解、同类变式',           icon: 'alert',  tin: 520,  tout: 480 },
    { id: 'word',    name: '单词 · 例句释义', desc: '释义、例句、词形变化',                   icon: 'abc',    tin: 180,  tout: 90  },
    { id: 'readq',   name: '阅读 · 章节配题', desc: '按章节正文出理解题',                     icon: 'book',   tin: 900,  tout: 700 }
  ];
  /* 各环节在总调用量里的占比（种子造账用） */
  var AI_W = { gen: 0.26, review: 0.22, explain: 0.16, word: 0.13, essay: 0.08, readq: 0.08, ocr: 0.07 };

  /* 三档工作模式：一键把整张路由表换掉 */
  var AI_MODES = {
    save: {
      label: '省钱', desc: '能便宜就便宜，只有作文批改留一点余量',
      est: '约 ¥100–130 / 月',
      routes: { gen: ['pv-ds','deepseek-chat'], ocr: ['pv-zp','glm-4v-flash'], review: ['pv-zp','glm-4-flash'],
                essay: ['pv-ds','deepseek-chat'], explain: ['pv-ds','deepseek-chat'],
                word: ['pv-zp','glm-4-flash'], readq: ['pv-ds','deepseek-chat'] }
    },
    balanced: {
      label: '均衡', desc: '日常环节用便宜的，作文与识图用好一点的',
      est: '约 ¥120–160 / 月',
      routes: { gen: ['pv-ds','deepseek-chat'], ocr: ['pv-qw','qwen-vl-max'], review: ['pv-zp','glm-4-flash'],
                essay: ['pv-qw','qwen-max'], explain: ['pv-ds','deepseek-chat'],
                word: ['pv-zp','glm-4-flash'], readq: ['pv-ds','deepseek-chat'] }
    },
    best: {
      label: '最强', desc: '难题与批改都用最强的，出题也换成大模型',
      est: '约 ¥350–450 / 月',
      routes: { gen: ['pv-qw','qwen-max'], ocr: ['pv-qw','qwen-vl-max'], review: ['pv-zp','glm-4-plus'],
                essay: ['pv-qw','qwen-max'], explain: ['pv-ds','deepseek-reasoner'],
                word: ['pv-zp','glm-4-plus'], readq: ['pv-qw','qwen-max'] }
    }
  };

  function aiKey(id, label, key, on, primary, at, last) {
    return { id: id, label: label, key: key, on: on, primary: primary, addedAt: at, lastUsed: last };
  }

  function seedAI(now) {
    var DAY = 86400000, MIN = 60000;

    var providers = [
      { id: 'pv-ds', name: 'DeepSeek', kind: 'deepseek', base: 'https://api.deepseek.com/v1',
        keys: [
          aiKey('k-ds-1', '主密钥', 'sk-4f7c2b9e1a6d43f8b0c5e7d2a19c9a2e', true, true, now - 46 * DAY, now - 7 * MIN),
          aiKey('k-ds-2', '备用（8 月申请）', 'sk-8a1e5d3c7b904215e6f0a2c8d4b73e19', true, false, now - 9 * DAY, now - 6 * DAY)
        ],
        models: [
          { id: 'deepseek-chat',     pin: 0.002, pout: 0.008 },
          { id: 'deepseek-reasoner', pin: 0.004, pout: 0.016 }
        ],
        enabled: true, status: 'ok', checkedAt: now - 2 * DAY, latency: 640,
        timeout: 60, retry: 2, concurrency: 4,
        note: '主力：出题、讲解、配题都走它' },

      { id: 'pv-qw', name: '通义千问', kind: 'dashscope', base: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        keys: [ aiKey('k-qw-1', '主密钥', 'sk-9b1d47e0c25a4f83b6d9e1a7c0f84c77', true, true, now - 31 * DAY, now - 22 * MIN) ],
        models: [
          { id: 'qwen-plus',   pin: 0.0008, pout: 0.002  },
          { id: 'qwen-max',    pin: 0.0024, pout: 0.0096 },
          { id: 'qwen-vl-max', pin: 0.003,  pout: 0.009, vision: true }
        ],
        enabled: true, status: 'ok', checkedAt: now - 5 * DAY, latency: 880,
        timeout: 90, retry: 2, concurrency: 3,
        note: '作文批改与拍照识字用它' },

      { id: 'pv-zp', name: '智谱 GLM', kind: 'zhipu', base: 'https://open.bigmodel.cn/api/paas/v4',
        keys: [ aiKey('k-zp-1', '主密钥', '7c2a91f4d6b8e05a3c7d9f16b4e82f81', true, true, now - 18 * DAY, now - 41 * MIN) ],
        models: [
          { id: 'glm-4-flash',  pin: 0,     pout: 0     },
          { id: 'glm-4v-flash', pin: 0,     pout: 0, vision: true },
          { id: 'glm-4-plus',   pin: 0.005, pout: 0.005 },
          { id: 'glm-4v-plus',  pin: 0.004, pout: 0.004, vision: true }
        ],
        enabled: true, status: 'untested', checkedAt: 0, latency: 0,
        timeout: 60, retry: 1, concurrency: 2,
        note: 'glm-4-flash 免费额度够跑预筛；换 Key 后还没点过验证' },

      { id: 'pv-ol', name: '本机 Ollama', kind: 'ollama', base: 'http://127.0.0.1:11434/v1',
        keys: [ aiKey('k-ol-1', '本机（无需密钥）', 'ollama', true, true, now - 12 * DAY, 0) ],
        models: [ { id: 'qwen2.5:7b', pin: 0, pout: 0 } ],
        enabled: false, status: 'fail', checkedAt: now - 3 * DAY, latency: 0,
        timeout: 120, retry: 0, concurrency: 1,
        note: '当兜底用；这台机器上 ollama 服务没起，验证失败' }
    ];

    var routes = {
      gen:     { pv: 'pv-ds', model: 'deepseek-chat' },
      ocr:     { pv: 'pv-qw', model: 'qwen-vl-max' },
      review:  { pv: 'pv-zp', model: 'glm-4-flash' },
      essay:   { pv: 'pv-qw', model: 'qwen-max' },
      explain: { pv: 'pv-ds', model: 'deepseek-chat' },
      word:    { pv: 'pv-zp', model: 'glm-4-flash' },
      readq:   { pv: 'pv-ds', model: 'deepseek-chat' }
    };

    function pvOf(id) {
      for (var i = 0; i < providers.length; i++) if (providers[i].id === id) return providers[i];
      return null;
    }
    function mdOf(pvId, mid) {
      var p = pvOf(pvId); if (!p) return null;
      var hit = null;
      (p.models || []).forEach(function (m) { if (m.id === mid) hit = m; });
      return hit;
    }

    /* 固定种子伪随机：每次重置出来的账一样，截图能对照 */
    var s0 = 20261021;
    function rnd() { s0 = (s0 * 1103515245 + 12345) % 2147483648; return s0 / 2147483648; }
    function two(n) { return (n < 10 ? '0' : '') + n; }

    var byUse = {}, byModel = {}, days = [];
    AI_SCENES.forEach(function (s) { byUse[s.id] = { calls: 0, tin: 0, tout: 0, cost: 0, fail: 0, ms: 0 }; });

    for (var d = 13; d >= 0; d--) {
      var t = now - d * DAY, dt = new Date(t), wk = dt.getDay();
      var base = 780 + Math.round(rnd() * 560);
      if (wk === 0) base = Math.round(base * 0.62);   /* 周日明显少 */
      if (wk === 6) base = Math.round(base * 0.8);
      var dc = 0, dti = 0, dto = 0, dco = 0, df = 0, dms = 0;
      AI_SCENES.forEach(function (s) {
        var r = routes[s.id], md = mdOf(r.pv, r.model) || { pin: 0, pout: 0 };
        var c = Math.max(1, Math.round(base * AI_W[s.id] * (0.82 + rnd() * 0.36)));
        var ti = Math.round(c * s.tin * (0.88 + rnd() * 0.24));
        var to = Math.round(c * s.tout * (0.88 + rnd() * 0.24));
        var co = (ti * md.pin + to * md.pout) / 1000;
        var f = rnd() < 0.5 ? 0 : Math.round(c * (0.004 + rnd() * 0.014));
        var ms = Math.round((s.id === 'essay' ? 6400 : s.id === 'ocr' ? 3600 : s.id === 'explain' ? 2400 : 1500) * (0.75 + rnd() * 0.6));

        var u = byUse[s.id];
        u.calls += c; u.tin += ti; u.tout += to; u.cost += co; u.fail += f; u.ms += ms * c;

        var lab = pvOf(r.pv).name + ' · ' + r.model;
        var bm = byModel[lab] || (byModel[lab] = { calls: 0, tin: 0, tout: 0, cost: 0 });
        bm.calls += c; bm.tin += ti; bm.tout += to; bm.cost += co;

        dc += c; dti += ti; dto += to; dco += co; df += f; dms += ms * c;
      });
      days.push({ d: two(dt.getMonth() + 1) + '-' + two(dt.getDate()), at: t,
                  calls: dc, tin: dti, tout: dto, cost: +dco.toFixed(2), fail: df,
                  avgMs: Math.round(dms / dc) });
    }

    Object.keys(byUse).forEach(function (k) {
      var u = byUse[k];
      u.avgMs = Math.round(u.ms / u.calls);
      u.cost = +u.cost.toFixed(2);
      delete u.ms;
    });
    Object.keys(byModel).forEach(function (k) { byModel[k].cost = +byModel[k].cost.toFixed(2); });

    /* 最近调用流水：状态大多是成功，掺几条降级 / 失败 / 超时 */
    var pool = ['gen', 'review', 'explain', 'word', 'essay', 'readq', 'ocr', 'review', 'gen'];
    var st = ['ok', 'ok', 'ok', 'fallback', 'ok', 'ok', 'ok', 'fail', 'ok', 'ok', 'ok', 'slow'];
    var recent = [], at = now - 3 * MIN;
    for (var i = 0; i < 18; i++) {
      var sc = pool[Math.floor(rnd() * pool.length)];
      var sdef = null;
      AI_SCENES.forEach(function (x) { if (x.id === sc) sdef = x; });
      var rr = routes[sc], m = mdOf(rr.pv, rr.model) || { pin: 0, pout: 0 };
      var ti = Math.round(sdef.tin * (0.8 + rnd() * 0.5));
      var to2 = Math.round(sdef.tout * (0.8 + rnd() * 0.5));
      var status = st[Math.floor(rnd() * st.length)];
      recent.push({
        at: at, scene: sc, pv: rr.pv, model: rr.model,
        tin: ti, tout: to2,
        ms: status === 'slow' ? 18000 : status === 'fail' ? 0 : Math.round(sdef.id === 'essay' ? 6200 : 1400) + Math.round(rnd() * 900),
        cost: +(((ti * m.pin) + (to2 * m.pout)) / 1000).toFixed(4),
        status: status
      });
      at -= (3 + Math.round(rnd() * 24)) * MIN;
    }

    var spent = days.reduce(function (n, x) { return n + x.cost; }, 0);
    return {
      providers: providers,
      routes: routes,
      mode: 'balanced',
      modeAt: now - 6 * DAY,
      fallback: 'pv-ds',
      paused: false,
      mask: true,                       /* 全局：密钥默认打码，点眼睛才看全 */
      usage: {
        days: days,
        byUse: byUse,
        byModel: byModel,
        recent: recent,
        span: 14,
        since: days[0].at
      },
      budget: {
        month: 150,
        spent0: +(spent / 14 * 7).toFixed(1),   /* 本月 1–7 日（种子只造最近 14 天） */
        alertAt: 0.8,
        alertOn: true,
        over: 'downgrade'                       /* stop | essay | downgrade */
      },
      updatedAt: now
    };
  }

  function seed() {
    var now = Date.now();
    var min = 60 * 1000, hour = 60 * min, day = 24 * hour;

    /* ---------- 学生（管理端建档 = 直接开好用户端账号） ----------
       档案字段与用户端「编辑资料」一一对应：展示身份 / 学业档案 / 目标与节奏
       年级统一「初一~初三」；教材版本带「版」字；subjects 是九科表（唯一真源）
       账号体系：account（孩子登录用）+ pwdInit（6 位初始密码）+ activated（是否首次登录过） */
    var students = [
      { id: 's1', name: '小宇', initial: '宇', color: 'c1', avatar: '',
        realName: '李嘉宇', gender: '男', signature: '把每一道错题都当成礼物',
        grade: '初三', term: '上学期', edition: '人教版',
        school: '市第二中学', cls: '初三(3)班',
        unit: '九上 · 第二十一章 一元二次方程',
        subjects: subjSet('数学', { 数学: 105, 语文: 92, 英语: 88 }, ['语文', '数学', '英语']),
        examDate: '2027-06-20', examName: '中考',
        startTime: '20:00', dailyCount: '15', restDay: '周日',
        account: 'jiayu', pwdInit: '815203', pwdChanged: true,
        activated: true, activatedAt: now - 9 * day, lastDevice: 'Redmi K70',
        streak: 7, minutes7: 186, rate7: 82, lastActive: now - 4 * hour,
        vis: '家人可见', tag: '主号', points: 1280, wordPerDay: 8, status: 'active',
        perm: permNew('full', now - 9 * day) },
      { id: 's2', name: '小雨', initial: '雨', color: 'c3', avatar: '',
        realName: '李雨桐', gender: '女', signature: '每天进步一点点',
        grade: '初一', term: '上学期', edition: '人教版',
        school: '市第二中学', cls: '初一(1)班',
        unit: '七上 · Unit 3 My Family',
        subjects: subjSet('英语', { 语文: 85, 数学: 90, 英语: 95 }, ['语文', '数学', '英语']),
        examDate: '2027-01-15', examName: '期末',
        startTime: '19:30', dailyCount: '10', restDay: '周日',
        account: 'yutong', pwdInit: '604712', pwdChanged: false,
        activated: true, activatedAt: now - 4 * day, lastDevice: 'iPad Air',
        streak: 3, minutes7: 92, rate7: 74, lastActive: now - 26 * hour,
        vis: '家人可见', tag: '妹妹', points: 460, wordPerDay: 6, status: 'active',
        perm: permNew('learn', now - 4 * day) },
      { id: 's3', name: '小舟', initial: '舟', color: 'c4', avatar: '',
        realName: '', gender: '男', signature: '',
        grade: '初一', term: '上学期', edition: '苏科版',
        school: '实验中学', cls: '初一(5)班',
        unit: '七上 · 第三单元',
        subjects: subjSet('语文', { 语文: 88, 数学: 95 }, ['语文', '数学']),
        examDate: '2027-01-15', examName: '期末',
        startTime: '20:00', dailyCount: '10', restDay: '周日',
        account: 'xiaozhou', pwdInit: '390845', pwdChanged: false,
        activated: false, activatedAt: null, lastDevice: '',
        streak: 0, minutes7: 0, rate7: 0, lastActive: null,
        vis: '仅自己', tag: '待激活', points: 0, wordPerDay: 5, status: 'active',
        perm: permNew('readonly', 0) }
    ];
    /* seed 与老库走同一套规范化：subjects 定稿后同步 subject / target 等派生值 */
    students.forEach(stuSync);

    /* ---------- 每日任务（管理端每天发布，用户端「每日任务」页消费） ---------- */
    var tasks = {
      s1: {
        date: '2026-10-12',
        published: true,
        items: [
          { id: 't1', kind: 'practice', title: '每日题目', subject: '数学', kp: '一元二次方程 · 配方法',
            detail: '2 题 · 全部已入库', minutes: 25, done: true, score: 80,
            opt: { n: 2, grade: '初三', kw: '一元二次方程', qids: ['Q-1042', 'Q-1043'], pool: [] } },
          { id: 't2', kind: 'words', title: '每日必备单词', subject: '英语', kp: '七年级上册单词 · 整本推进',
            detail: '按遗忘曲线排 · 点「生成今日词单」看今天的词', minutes: 12, done: true, score: 89,
            opt: { wb: 'wb-7a', wbName: '七年级上册单词', perDay: 8, grade: '七年级上' } },
          { id: 't3', kind: 'reading', title: '每日阅读任务', subject: '语文', kp: '《骆驼祥子》第 3 章',
            detail: '约 20 分钟 · 读完弹一问', minutes: 20, done: false,
            opt: { bookId: 'ltxz', bookTitle: '骆驼祥子', chapter: '第 3 章 · 第一辆车' } },
          { id: 't4', kind: 'essay', title: '作文', subject: '英语', kp: 'My Weekend',
            detail: '不少于 80 词', minutes: 30, done: false, due: '10-17 20:00',
            opt: { topic: 'My Weekend', req: '不少于 80 词', dueAt: '2026-10-17T20:00' } },
          { id: 't5', kind: 'calc', title: '每日计算', subject: '数学', kp: '二次函数 · 图象与系数关系',
            detail: '1 题 · 拍照上传', minutes: 15, done: false,
            opt: { n: 1, submit: '拍照上传', grade: '初三', kw: '二次函数', qids: ['Q-1043'], pool: [] } },
          { id: 't6', kind: 'wrong', title: '错题复习', subject: '数学', kp: '3 道错题到复习节点',
            detail: '约 10 分钟', minutes: 10, done: false }
        ]
      },
      s2: {
        date: '2026-10-12',
        published: true,
        items: [
          { id: 'u1', kind: 'words', title: '每日必备单词', subject: '英语', kp: '七年级上册单词 · 整本推进',
            detail: '按遗忘曲线排 · 点「生成今日词单」看今天的词', minutes: 10, done: true, score: 92,
            opt: { wb: 'wb-7a', wbName: '七年级上册单词', perDay: 6, grade: '七年级上' } },
          { id: 'u2', kind: 'practice', title: '每日题目', subject: '英语', kp: '过去完成时 · 时态辨析',
            detail: '2 题 · 全部已入库', minutes: 15, done: false,
            opt: { n: 2, grade: '不限', kw: '过去完成时', qids: ['Q-1045', 'Q-1052'], pool: [] } }
        ]
      },
      s3: { date: '2026-10-12', published: false, items: [] }
    };
    tasks._history = {
      s1: [
        { date: '10-11', done: 6, total: 6, minutes: 41, rate: 90 },
        { date: '10-10', done: 5, total: 6, minutes: 36, rate: 84 },
        { date: '10-09', done: 6, total: 6, minutes: 48, rate: 88 },
        { date: '10-08', done: 4, total: 6, minutes: 22, rate: 71 },
        { date: '10-07', done: 6, total: 6, minutes: 39, rate: 86 },
        { date: '10-06', done: 6, total: 6, minutes: 44, rate: 92 }
      ],
      s2: [
        { date: '10-11', done: 2, total: 2, minutes: 18, rate: 80 },
        { date: '10-10', done: 2, total: 2, minutes: 21, rate: 76 },
        { date: '10-09', done: 1, total: 2, minutes: 9, rate: 60 }
      ],
      s3: []
    };

    /* ---------- 题库（status: pending 待审 / approved 已入库 / rejected 已退回） ----------
       grade 为必填维度：初一 / 初二 / 初三（与学生档案同一口径；七上 / 八下这类教材分册写在知识点里） */
    var qbank = [
      { id: 'Q-1042', subject: '数学', type: 'T1', kp: '一元二次方程 · 配方法', grade: '初三', star: 2, difficulty: '中',
        score: 3, status: 'approved', conf: 0.96, source: 'AI', by: 'AI · 出题通路一', at: now - 3 * day,
        stem: '方程 x<sup>2</sup> − 4x + 3 = 0 用配方法可化为（　）',
        options: ['(x − 2)<sup>2</sup> = 1', '(x − 2)<sup>2</sup> = −1', '(x + 2)<sup>2</sup> = 1', '(x − 4)<sup>2</sup> = 13'],
        answer: 'A', expl: '两边同时加 4：x<sup>2</sup> − 4x + 4 = 1，左边正好凑成 (x − 2)<sup>2</sup>。',
        used: 38, right: 0.79 },
      { id: 'Q-1043', subject: '数学', type: 'T1', kp: '二次函数 · 图象与系数关系', grade: '初三', star: 3, difficulty: '难',
        score: 3, status: 'approved', conf: 0.88, source: 'AI', by: 'AI · 出题通路一', at: now - 3 * day,
        stem: '如图是二次函数 y = ax<sup>2</sup> + bx + c 的图象，则 a、b、c 的符号是（　）',
        options: ['a>0, b>0, c>0', 'a>0, b<0, c>0', 'a<0, b>0, c<0', 'a<0, b<0, c<0'],
        answer: 'B', expl: '开口向上 a>0；对称轴在 y 轴右侧 −b/2a>0 → b<0；与 y 轴交点在正半轴 c>0。',
        used: 21, right: 0.52 },
      { id: 'Q-1044', subject: '语文', type: 'T2', kp: '九上 · 岳阳楼记 · 古诗文默写', grade: '初三', star: 2, difficulty: '易',
        score: 4, status: 'approved', conf: 0.94, source: 'AI', by: 'AI · 出题通路二', at: now - 2 * day,
        stem: '《岳阳楼记》中表现作者旷达胸襟的句子是「先天下之忧而忧，{{1}}」。',
        blanks: ['后天下之乐而乐'], answer: '后天下之乐而乐',
        expl: '「先天下之忧而忧，后天下之乐而乐」是全文的议论句，记牢「而」的位置。',
        used: 15, right: 0.86 },
      { id: 'Q-1045', subject: '英语', type: 'T1', kp: '九上 · 过去完成时', grade: '初三', star: 1, difficulty: '易',
        score: 3, status: 'approved', conf: 0.92, source: 'AI', by: 'AI · 出题通路三', at: now - 2 * day,
        stem: 'By the time we got there, the film ______ for ten minutes.',
        options: ['has begun', 'had been on', 'began', 'is on'],
        answer: 'B', expl: '「到我们赶到时」是过去的时间点，电影在此前已经开演并持续 —— by the time + 过去完成时。',
        used: 42, right: 0.68 },
      { id: 'Q-1046', subject: '数学', type: 'T3', kp: '一元二次方程 · 根与系数关系', grade: '初三', star: 3, difficulty: '中',
        score: 6, status: 'pending', conf: 0.71, source: 'AI', by: 'AI · 低置信待人工', at: now - 9 * hour,
        stem: '已知方程 x<sup>2</sup> − 5x + 6 = 0 的两根为 x₁、x₂，求 x₁<sup>2</sup> + x₂<sup>2</sup> 的值，并说明用到的根与系数关系。',
        points: [{ label: '求出 x₁ + x₂ = 5', k: ['5'] }, { label: '求出 x₁x₂ = 6', k: ['6'] },
                 { label: '结果为 13', k: ['13'] }],
        expl: 'x₁² + x₂² = (x₁ + x₂)² − 2x₁x₂ = 25 − 12 = 13。',
        used: 0, right: 0, flag: 'AI 置信 0.71：多步推导，需人工核对采分点' },
      { id: 'Q-1047', subject: '语文', type: 'T2', kp: '九上 · 醉翁亭记 · 默写', grade: '初三', star: 2, difficulty: '易',
        score: 4, status: 'pending', conf: 0.83, source: 'AI', by: 'AI · 低置信待人工', at: now - 7 * hour,
        stem: '「醉翁之意不在酒，{{1}}。」',
        blanks: ['在乎山水之间也'], answer: '在乎山水之间也',
        expl: '注意「乎」不是「于」。', used: 0, right: 0,
        flag: 'AI 置信 0.83：题干引文与教材版本可能有差异，请核对' },
      { id: 'Q-1048', subject: '英语', type: 'T1', kp: '九上 · 定语从句 · 关系代词', grade: '初三', star: 2, difficulty: '中',
        score: 3, status: 'pending', conf: 0.66, source: 'AI', by: 'AI · 低置信待人工', at: now - 5 * hour,
        stem: 'This is the boy ______ helped me yesterday.',
        options: ['which', 'who', 'whom', 'whose'],
        answer: 'B', expl: '先行词是 the boy（人），在从句中作主语 → who。',
        used: 0, right: 0, flag: 'AI 置信 0.66：选项 which/whom 干扰度偏低，建议改写' },
      { id: 'Q-1049', subject: '数学', type: 'T4', kp: '二次函数 · 实际应用', grade: '初三', star: 3, difficulty: '难',
        score: 12, status: 'pending', conf: 0.58, source: 'AI', by: 'AI · 低置信待人工', at: now - 3 * hour,
        stem: '某商店销售一种衬衣，每天售出 20 件，每件盈利 40 元。若每件降价 1 元，每天可多售出 2 件。请根据材料完成下面各题。',
        subs: [
          { type: 'choice', score: 3, stem: '若设每件降价 x 元，则每天售出的件数为（　）',
            options: ['20 + x', '20 + 2x', '20 − 2x', '20x'], answer: 'B' },
          { type: 'fill', score: 3, stem: '每天利润 W 关于 x 的函数表达式为 W = {{1}}（化为一般式）。',
            blanks: ['−2x² + 60x + 800'], answer: '−2x² + 60x + 800' },
          { type: 'short', score: 6, stem: '降价多少元时每天利润最大？最大利润是多少？',
            points: [{ label: '配方或顶点式求最值', k: ['顶点', '配方'] },
                     { label: '答出降价 15 元', k: ['15'] }, { label: '最大利润 1250 元', k: ['1250'] }] }
        ],
        expl: 'W = (40 − x)(20 + 2x) = −2(x − 15)² + 1250，x = 15 时取最大 1250 元。',
        used: 0, right: 0, flag: 'AI 置信 0.58：题干数字与采分点需人工确认（利润单位易错）' },
      { id: 'Q-1050', subject: '英语', type: 'T2', kp: '八下 · 词汇 · 词形变化', grade: '初二', star: 2, difficulty: '中',
        score: 4, status: 'pending', conf: 0.62, source: 'AI', by: 'AI · 低置信待人工', at: now - 2 * hour,
        stem: '用所给词的正确形式填空：He is ______ (interest) in playing the piano.',
        blanks: ['interested'], answer: 'interested',
        expl: 'be interested in 固定搭配，人作主语用 -ed 分词。', used: 0, right: 0,
        flag: 'AI 置信 0.62：与已有题目 Q-0911 表述高度相似，疑似重复' },
      { id: 'Q-1051', subject: '数学', type: 'T1', kp: '有理数 · 混合运算', grade: '初一', star: 1, difficulty: '易',
        score: 3, status: 'rejected', conf: 0.44, source: 'AI', by: 'AI · 出题通路一', at: now - 26 * hour,
        stem: '计算 −3 + 5 × (−2) = （　）',
        options: ['−13', '−4', '4', '13'], answer: 'A', expl: '先乘后加：5 × (−2) = −10，−3 + (−10) = −13。',
        used: 0, right: 0, rejectReason: '与题库已有题目重复（Q-0872）', rejectedAt: now - 25 * hour },
      { id: 'Q-1052', subject: '英语', type: 'T3', kp: '九上 · 写作 · 段落表达', grade: '初三', star: 2, difficulty: '中',
        score: 6, status: 'approved', conf: 0.90, source: '手动', by: '我 · 手动录入', at: now - 4 * day,
        stem: '用 3–5 句话介绍你最喜欢的一本书，说明书名、作者和喜欢的原因。',
        points: [{ label: '写出书名与作者', k: ['book', 'author'] }, { label: '给出至少两条理由', k: ['because', 'reason'] }],
        expl: '评分看要点齐全与句子完整，教师/家长可在批改时调整分档。', used: 27, right: 0.74 },
      /* 以下 8 道用于补齐「九门科目 × 三个年级」的筛选分布 */
      { id: 'Q-1053', subject: '物理', type: 'T1', kp: '九上 · 内能 · 比热容', grade: '初三', star: 2, difficulty: '中',
        score: 3, status: 'approved', conf: 0.93, source: 'AI', by: 'AI · 出题通路四', at: now - 2 * day,
        stem: '关于比热容，下列说法正确的是（　）',
        options: ['比热容越大的物质吸热一定越多', '水的比热容较大，常用作冷却剂',
                  '比热容与物质的状态无关', '比热容的单位是 J/(kg·℃)⁻¹'],
        answer: 'B', expl: '水的比热容 4.2×10³ J/(kg·℃)，相同条件下升温慢，适合做冷却剂；比热容与状态有关（冰与水不同）。',
        used: 26, right: 0.81 },
      { id: 'Q-1054', subject: '化学', type: 'T2', kp: '九上 · 物质的构成 · 化学用语', grade: '初三', star: 1, difficulty: '易',
        score: 4, status: 'approved', conf: 0.95, source: 'AI', by: 'AI · 出题通路四', at: now - 30 * hour,
        stem: '用化学用语填空：2 个氧原子 {{1}}；1 个水分子 {{2}}。',
        blanks: ['2O', 'H₂O'], answer: '2O / H₂O',
        expl: '化学式前面的数字表示粒子个数；水分子写作 H₂O。', used: 19, right: 0.88 },
      { id: 'Q-1055', subject: '生物', type: 'T1', kp: '七上 · 细胞 · 细胞器', grade: '初一', star: 1, difficulty: '易',
        score: 3, status: 'approved', conf: 0.91, source: 'AI', by: 'AI · 出题通路五', at: now - 3 * day,
        stem: '植物细胞中，进行光合作用的场所是（　）',
        options: ['线粒体', '叶绿体', '液泡', '细胞核'], answer: 'B',
        expl: '叶绿体含叶绿素，是光合作用的场所；线粒体是呼吸作用的主要场所。', used: 14, right: 0.90 },
      { id: 'Q-1056', subject: '历史', type: 'T3', kp: '七上 · 秦朝 · 中央集权', grade: '初一', star: 2, difficulty: '中',
        score: 6, status: 'pending', conf: 0.79, source: 'AI', by: 'AI · 低置信待人工', at: now - 6 * hour,
        stem: '简述秦朝为加强中央集权在政治上采取的主要措施。',
        points: [{ label: '确立皇帝制度', k: ['皇帝'] }, { label: '中央设三公（丞相、太尉、御史大夫）', k: ['三公', '丞相'] },
                 { label: '地方推行郡县制', k: ['郡县'] }],
        expl: '皇帝制 + 三公九卿 + 郡县制，构成秦代中央集权的基本框架。', used: 0, right: 0,
        flag: 'AI 置信 0.79：采分点表述需与教材版本对齐' },
      { id: 'Q-1057', subject: '道德与法治', type: 'T1', kp: '七上 · 网络生活 · 理性参与', grade: '初一', star: 2, difficulty: '中',
        score: 3, status: 'approved', conf: 0.90, source: 'AI', by: 'AI · 出题通路五', at: now - 4 * day,
        stem: '在网上看到一条未经证实的「紧急消息」，正确的做法是（　）',
        options: ['立刻转发提醒亲友', '先求证来源再决定是否转发', '截图保存后发到朋友圈', '当作没看见不再理会'],
        answer: 'B', expl: '网络信息真假难辨，先核实来源是理性参与网络生活的基本要求。', used: 11, right: 0.83 },
      { id: 'Q-1058', subject: '地理', type: 'T2', kp: '七上 · 大洲大洋 · 海陆分布', grade: '初一', star: 1, difficulty: '易',
        score: 4, status: 'approved', conf: 0.94, source: 'AI', by: 'AI · 出题通路五', at: now - 5 * day,
        stem: '全球面积最大的大洋是 {{1}}；面积最大的大洲是 {{2}}。',
        blanks: ['太平洋', '亚洲'], answer: '太平洋 / 亚洲',
        expl: '四大洋中太平洋面积最大；七大洲中亚洲面积最大、人口最多。', used: 17, right: 0.92 },
      { id: 'Q-1059', subject: '物理', type: 'T1', kp: '八上 · 声现象 · 声音的特性', grade: '初二', star: 1, difficulty: '易',
        score: 3, status: 'approved', conf: 0.92, source: 'AI', by: 'AI · 出题通路四', at: now - 4 * day,
        stem: '「闻其声知其人」主要依据声音的（　）',
        options: ['音调', '响度', '音色', '频率'], answer: 'C',
        expl: '音色由发声体的材料和结构决定，是辨别不同发声体的主要依据。', used: 23, right: 0.87 },
      { id: 'Q-1060', subject: '数学', type: 'T3', kp: '八下 · 一次函数 · 图象与性质', grade: '初二', star: 2, difficulty: '中',
        score: 6, status: 'approved', conf: 0.89, source: 'AI', by: 'AI · 出题通路一', at: now - 5 * day,
        stem: '已知一次函数 y = kx + b 的图象经过点 (0, 3) 和 (2, −1)，求 k、b 的值，并说明该函数图象经过哪些象限。',
        points: [{ label: '由 (0,3) 得 b = 3', k: ['3'] }, { label: '求出 k = −2', k: ['-2', '−2'] },
                 { label: '说明图象过第一、二、四象限', k: ['一', '四'] }],
        expl: 'b = 3；2k + 3 = −1 → k = −2。k<0 且 b>0，图象过第一、二、四象限。', used: 13, right: 0.72 }
    ];

    /* ---------- 阅读书单（管理端下发，用户端「阅读」页消费） ---------- */
    var books = [
      { id: 'ltxz', title: '骆驼祥子', author: '老舍', unitName: '章', total: 24,
        grade: '七年级下', intro: '老舍长篇代表作：一个北平车夫的三起三落。',
        tag: '语文 · 必读书目', cover: '', qEnabled: true, on: true, published: true,
        units: [
          { uid: 'ltxz-1', t: '第 1 章 · 立志', b: '祥子从乡下来到北平，认定靠力气也能吃上体面饭。' },
          { uid: 'ltxz-2', t: '第 2 章 · 攒钱', b: '省吃俭用，他像攒命根一样攒买车钱。' },
          { uid: 'ltxz-3', t: '第 3 章 · 第一辆车', b: '攒满三年，祥子终于买上了第一辆属于自己的车。',
            tx0: '（示例正文 · 为演示排版自撰的示意文字，非原著原文。）\n\n' +
                 '他生在乡间，长在乡间，十八岁那年失了父母与几亩薄田，便进了城。城里活路多，只要肯下力气，就不愁没饭吃。他打定了主意：拉车。车是租的，力气是自己的，一天跑下来，铜子儿能落进自己的腰包。\n\n' +
                 '拉了两年，他摸清了路子：要攒钱，先得省。他不吃零嘴，不喝酒，连冬天加件棉袄都要掂量几回。钱是一分一分攒的，攒够一百就换成现洋，塞进闷葫芦罐里；摇起来哗哗地响，越响，他心里越踏实。\n\n' +
                 '到第三年上，罐子沉得拿不动了。他数了三遍，又数一遍，数目对上了。那天他把车拉回来，擦得锃亮，连车把上的铜活都照得出人影。车是他的了 —— 从此一天挣的都是自己的，跑得再累，也是为自己跑。',
            q: '祥子攒了整整三年才买上第一辆车。这一章里的「车」，对祥子来说意味着什么？',
            points: [{ label: '点出车是他的梦想与希望', k: ['希望', '梦想'] },
                     { label: '点出车代表独立与尊严', k: ['尊严', '脸面', '独立'] },
                     { label: '点出车是安身立命的饭碗', k: ['饭碗', '谋生'] }] },
          { uid: 'ltxz-4', t: '第 4 章 · 车丢了', b: '乱兵把祥子连人带车抓走，他趁乱牵回三匹骆驼。',
            q: '车被乱兵抢走，这一章说明他的命运有什么特点？',
            points: [{ label: '点出个人力量在乱世面前不堪一击', k: ['乱', '世道'] },
                     { label: '点出劳动成果可被权势随意剥夺', k: ['权', '敲诈'] }] },
          { uid: 'ltxz-5', t: '第 5 章 · 骆驼祥子', b: '卖骆驼回到人和车厂，「骆驼祥子」的外号传开了。' }
        ],
        students: ['s1'], progress: { s1: 3 } },
      { id: 'wyj', title: '西游记', author: '吴承恩', unitName: '回', total: 100,
        grade: '七年级上', intro: '取经路上的神魔故事，取经即修心。',
        tag: '语文 · 必读书目', cover: '', qEnabled: false, on: false, published: false,
        units: [], students: [], progress: {} },
      { id: 'shz', title: '水浒传', author: '施耐庵', unitName: '回', total: 120,
        grade: '九年级', intro: '一百单八将聚义梁山，官逼民反的群像。',
        tag: '语文 · 选读', cover: '', qEnabled: false, on: false, published: false,
        units: [], students: [], progress: {} }
    ];

    /* ---------- 单词书（词书）：一本词书含若干单元，词条挂在「词书 + 单元」下 ---------- */
    var wordbooks = presetWordBooks(now);

    /* ---------- 单词表（管理端发布 / AI 生成 / 批量导入） ----------
       lv = 复习轮次：0 未学 · 1..5 在学（第 N 轮）· >=6 已掌握（退出排程）
       at = 上次学习时间戳 · right = 正确率
       —— 这三个是排程引擎的输入。本页（单词表）只做录入管理，不展示也不改它们；
          「今天该背哪些、该复习哪些」在「任务发布 · 单词任务」里算（正式版走服务端）。 */
    var words = [
      /* ===== 七年级上册 · Unit 1 ===== */
      { id: 'w-001', w: 'hi',         phon: '/haɪ/',            mean: 'int. 嗨；喂',          eg: 'Hi, I am Li Ming.',                 book: 'wb-7a', unit: 'Unit 1', lv: 6, at: now - 30 * day, right: 0.99 },
      { id: 'w-002', w: 'yes',        phon: '/jes/',            mean: 'adv. 是的',            eg: 'Yes, you are right.',               book: 'wb-7a', unit: 'Unit 1', lv: 6, at: now - 29 * day, right: 0.98 },
      { id: 'w-003', w: 'his',        phon: '/hɪz/',            mean: 'pron. 他的',           eg: 'His name is Tom.',                  book: 'wb-7a', unit: 'Unit 1', lv: 6, at: now - 28 * day, right: 0.97 },
      { id: 'w-004', w: 'her',        phon: '/hɜː(r)/',         mean: 'pron. 她的；她',       eg: 'Her bag is on the desk.',           book: 'wb-7a', unit: 'Unit 1', lv: 6, at: now - 27 * day, right: 0.96 },
      { id: 'w-005', w: 'morning',    phon: '/ˈmɔːnɪŋ/',        mean: 'n. 早晨；上午',        eg: 'Good morning, Miss Li!',            book: 'wb-7a', unit: 'Unit 1', lv: 4, at: now - 9 * day,  right: 0.95 },
      { id: 'w-006', w: 'name',       phon: '/neɪm/',           mean: 'n. 名字 v. 命名',      eg: "What's your name, please?",         book: 'wb-7a', unit: 'Unit 1', lv: 3, at: now - 7 * day,  right: 0.90 },
      { id: 'w-007', w: 'nice',       phon: '/naɪs/',           mean: 'adj. 好的；友好的',    eg: 'Nice to meet you.',                 book: 'wb-7a', unit: 'Unit 1', lv: 3, at: now - 5 * day,  right: 0.85 },
      { id: 'w-008', w: 'meet',       phon: '/miːt/',           mean: 'v. 遇见；结识',        eg: 'Glad to meet you here.',            book: 'wb-7a', unit: 'Unit 1', lv: 4, at: now - 6 * day,  right: 0.92 },
      { id: 'w-009', w: 'friend',     phon: '/frend/',          mean: 'n. 朋友',              eg: 'She is my best friend.',            book: 'wb-7a', unit: 'Unit 1', lv: 4, at: now - 9 * day,  right: 0.88 },
      { id: 'w-010', w: 'question',   phon: '/ˈkwestʃən/',      mean: 'n. 问题',              eg: 'May I ask you a question?',         book: 'wb-7a', unit: 'Unit 1', lv: 4, at: now - 3 * day,  right: 0.75 },
      { id: 'w-011', w: 'answer',     phon: '/ˈɑːnsə(r)/',      mean: 'n. 答案 v. 回答',      eg: 'Please answer my question.',        book: 'wb-7a', unit: 'Unit 1', lv: 0, at: 0,               right: 0 },

      /* ===== 七年级上册 · Unit 2 ===== */
      { id: 'w-012', w: 'family',     phon: '/ˈfæməli/',        mean: 'n. 家庭；家人',        eg: 'There are four people in my family.', book: 'wb-7a', unit: 'Unit 2', lv: 2, at: now - 3 * day, right: 0.70 },
      { id: 'w-013', w: 'parent',     phon: '/ˈpeərənt/',       mean: 'n. 父亲；母亲',        eg: 'My parents are both teachers.',     book: 'wb-7a', unit: 'Unit 2', lv: 2, at: now - 3 * day,  right: 0.60 },
      { id: 'w-014', w: 'cousin',     phon: '/ˈkʌzn/',          mean: 'n. 堂 / 表兄弟姐妹',   eg: 'My cousin lives in Shanghai.',      book: 'wb-7a', unit: 'Unit 2', lv: 2, at: now - 2 * day,  right: 0.50 },
      { id: 'w-015', w: 'photo',      phon: '/ˈfəʊtəʊ/',        mean: 'n. 照片',              eg: 'Here is a photo of my family.',     book: 'wb-7a', unit: 'Unit 2', lv: 3, at: now - 7 * day,  right: 0.80 },
      { id: 'w-016', w: 'sister',     phon: '/ˈsɪstə(r)/',      mean: 'n. 姐姐；妹妹',        eg: 'My sister is a nurse.',             book: 'wb-7a', unit: 'Unit 2', lv: 5, at: now - 18 * day, right: 0.96 },
      { id: 'w-017', w: 'brother',    phon: '/ˈbrʌðə(r)/',      mean: 'n. 哥哥；弟弟',        eg: 'My brother likes sports.',          book: 'wb-7a', unit: 'Unit 2', lv: 4, at: now - 8 * day,  right: 0.90 },
      { id: 'w-018', w: 'grandmother', phon: '/ˈɡrænmʌðə(r)/',  mean: 'n. 祖母；外祖母',      eg: 'My grandmother tells me stories.',  book: 'wb-7a', unit: 'Unit 2', lv: 1, at: now - 1 * day,  right: 0.55 },
      { id: 'w-019', w: 'aunt',       phon: '/ɑːnt/',           mean: 'n. 姑姑；姨母',        eg: 'My aunt works in a hospital.',      book: 'wb-7a', unit: 'Unit 2', lv: 0, at: 0,               right: 0 },

      /* ===== 七年级上册 · Unit 3 ===== */
      { id: 'w-020', w: 'classroom',  phon: '/ˈklɑːsruːm/',     mean: 'n. 教室',              eg: 'Our classroom is on the second floor.', book: 'wb-7a', unit: 'Unit 3', lv: 0, at: 0, right: 0 },
      { id: 'w-021', w: 'library',    phon: '/ˈlaɪbrəri/',      mean: 'n. 图书馆',            eg: 'I borrow books from the library.',  book: 'wb-7a', unit: 'Unit 3', lv: 0, at: 0, right: 0 },
      { id: 'w-022', w: 'playground', phon: '/ˈpleɪɡraʊnd/',    mean: 'n. 操场；运动场',      eg: 'We play games on the playground.',  book: 'wb-7a', unit: 'Unit 3', lv: 0, at: 0, right: 0 },
      { id: 'w-023', w: 'pencil',     phon: '/ˈpensl/',         mean: 'n. 铅笔',              eg: 'Can I borrow your pencil?',         book: 'wb-7a', unit: 'Unit 3', lv: 4, at: now - 2 * day,  right: 0.80 },
      { id: 'w-024', w: 'eraser',     phon: '/ɪˈreɪzə(r)/',     mean: 'n. 橡皮',              eg: 'Where is my eraser?',               book: 'wb-7a', unit: 'Unit 3', lv: 4, at: now - 1 * day,  right: 0.65 },
      { id: 'w-025', w: 'dictionary', phon: '/ˈdɪkʃənri/',      mean: 'n. 词典；字典',        eg: 'Look up the word in the dictionary.', book: 'wb-7a', unit: 'Unit 3', lv: 4, at: now, right: 0.60 },
      { id: 'w-026', w: 'schoolbag',  phon: '/ˈskuːlbæɡ/',      mean: 'n. 书包',              eg: 'My schoolbag is very heavy.',       book: 'wb-7a', unit: 'Unit 3', lv: 0, at: 0, right: 0 },
      { id: 'w-027', w: 'teacher',    phon: '/ˈtiːtʃə(r)/',     mean: 'n. 老师；教师',        eg: 'Our teacher is very kind.',         book: 'wb-7a', unit: 'Unit 3', lv: 4, at: now - 7 * day,  right: 0.85 },

      /* ===== 七年级上册 · Unit 4 ===== */
      { id: 'w-028', w: 'table',      phon: '/ˈteɪbl/',         mean: 'n. 桌子',              eg: 'The keys are on the table.',        book: 'wb-7a', unit: 'Unit 4', lv: 4, at: now - 4 * day,  right: 0.78 },
      { id: 'w-029', w: 'bed',        phon: '/bed/',            mean: 'n. 床',                eg: 'My cat is under the bed.',          book: 'wb-7a', unit: 'Unit 4', lv: 1, at: now - 1 * day,  right: 0.70 },
      { id: 'w-030', w: 'bookcase',   phon: '/ˈbʊkkeɪs/',       mean: 'n. 书架；书柜',        eg: 'The books are in the bookcase.',    book: 'wb-7a', unit: 'Unit 4', lv: 4, at: now - 5 * day,  right: 0.62 },
      { id: 'w-031', w: 'sofa',       phon: '/ˈsəʊfə/',         mean: 'n. 沙发',              eg: 'He is sitting on the sofa.',        book: 'wb-7a', unit: 'Unit 4', lv: 0, at: 0, right: 0 },
      { id: 'w-032', w: 'room',       phon: '/ruːm/',           mean: 'n. 房间',              eg: 'This is my room.',                  book: 'wb-7a', unit: 'Unit 4', lv: 0, at: 0, right: 0 },
      { id: 'w-033', w: 'clock',      phon: '/klɒk/',           mean: 'n. 时钟',              eg: 'The clock is on the wall.',         book: 'wb-7a', unit: 'Unit 4', lv: 0, at: 0, right: 0 },
      { id: 'w-034', w: 'model',      phon: '/ˈmɒdl/',          mean: 'n. 模型',              eg: 'He has a model plane.',             book: 'wb-7a', unit: 'Unit 4', lv: 0, at: 0, right: 0 },

      /* ===== 七年级上册 · Unit 5 ===== */
      { id: 'w-035', w: 'soccer',     phon: '/ˈsɒkə(r)/',       mean: 'n. 英式足球',          eg: 'We play soccer after school.',      book: 'wb-7a', unit: 'Unit 5', lv: 1, at: now, right: 0.58 },
      { id: 'w-036', w: 'basketball', phon: '/ˈbɑːskɪtbɔːl/',   mean: 'n. 篮球',              eg: 'He plays basketball very well.',    book: 'wb-7a', unit: 'Unit 5', lv: 0, at: 0, right: 0 },
      { id: 'w-037', w: 'volleyball', phon: '/ˈvɒlibɔːl/',      mean: 'n. 排球',              eg: 'Do you like volleyball?',           book: 'wb-7a', unit: 'Unit 5', lv: 0, at: 0, right: 0 },
      { id: 'w-038', w: 'tennis',     phon: '/ˈtenɪs/',         mean: 'n. 网球',              eg: 'She plays tennis on Sunday.',       book: 'wb-7a', unit: 'Unit 5', lv: 0, at: 0, right: 0 },
      { id: 'w-039', w: 'sport',      phon: '/spɔːt/',          mean: 'n. 运动；体育',        eg: 'Swimming is my favourite sport.',   book: 'wb-7a', unit: 'Unit 5', lv: 0, at: 0, right: 0 },
      { id: 'w-040', w: 'interesting', phon: '/ˈɪntrəstɪŋ/',    mean: 'adj. 有趣的',          eg: 'This book is very interesting.',    book: 'wb-7a', unit: 'Unit 5', lv: 0, at: 0, right: 0 },
      { id: 'w-041', w: 'boring',     phon: '/ˈbɔːrɪŋ/',        mean: 'adj. 无聊的；乏味的',  eg: 'The film is boring.',               book: 'wb-7a', unit: 'Unit 5', lv: 0, at: 0, right: 0 },

      /* ===== 七年级上册 · Unit 6 ===== */
      { id: 'w-042', w: 'banana',     phon: '/bəˈnɑːnə/',       mean: 'n. 香蕉',              eg: 'I eat a banana every morning.',     book: 'wb-7a', unit: 'Unit 6', lv: 0, at: 0, right: 0 },
      { id: 'w-043', w: 'hamburger',  phon: '/ˈhæmbɜːɡə(r)/',   mean: 'n. 汉堡包',            eg: 'He would like a hamburger.',        book: 'wb-7a', unit: 'Unit 6', lv: 0, at: 0, right: 0 },
      { id: 'w-044', w: 'tomato',     phon: '/təˈmɑːtəʊ/',      mean: 'n. 西红柿',            eg: 'There are two tomatoes in the box.', book: 'wb-7a', unit: 'Unit 6', lv: 0, at: 0, right: 0 },
      { id: 'w-045', w: 'strawberry', phon: '/ˈstrɔːbəri/',     mean: 'n. 草莓',              eg: 'Strawberries are sweet.',           book: 'wb-7a', unit: 'Unit 6', lv: 0, at: 0, right: 0 },
      { id: 'w-046', w: 'bread',      phon: '/bred/',           mean: 'n. 面包',              eg: 'I have bread for breakfast.',       book: 'wb-7a', unit: 'Unit 6', lv: 0, at: 0, right: 0 },
      { id: 'w-047', w: 'milk',       phon: '/mɪlk/',           mean: 'n. 牛奶',              eg: 'Drink a glass of milk every day.',  book: 'wb-7a', unit: 'Unit 6', lv: 0, at: 0, right: 0 },
      { id: 'w-048', w: 'birthday',   phon: '/ˈbɜːθdeɪ/',       mean: 'n. 生日',              eg: 'Happy birthday to you!',            book: 'wb-7a', unit: 'Unit 6', lv: 0, at: 0, right: 0 },

      /* ===== 七年级下册 · Unit 1 ===== */
      { id: 'w-049', w: 'guitar',     phon: '/ɡɪˈtɑː(r)/',      mean: 'n. 吉他',              eg: 'He can play the guitar well.',      book: 'wb-7b', unit: 'Unit 1', lv: 4, at: now - 9 * day, right: 0.88 },
      { id: 'w-050', w: 'dance',      phon: '/dɑːns/',          mean: 'v. 跳舞 n. 舞蹈',      eg: 'She dances every evening.',         book: 'wb-7b', unit: 'Unit 1', lv: 1, at: now - 1 * day, right: 0.45 },
      { id: 'w-051', w: 'chess',      phon: '/tʃes/',           mean: 'n. 国际象棋',          eg: 'Do you want to play chess?',        book: 'wb-7b', unit: 'Unit 1', lv: 0, at: 0, right: 0 },

      /* ===== 七年级下册 · Unit 2 ===== */
      { id: 'w-052', w: 'breakfast',  phon: '/ˈbrekfəst/',      mean: 'n. 早餐',              eg: 'I have breakfast at seven.',        book: 'wb-7b', unit: 'Unit 2', lv: 5, at: now - 16 * day, right: 0.92 },
      { id: 'w-053', w: 'homework',   phon: '/ˈhəʊmwɜːk/',      mean: 'n. 家庭作业',          eg: 'I finish my homework before dinner.', book: 'wb-7b', unit: 'Unit 2', lv: 3, at: now - 6 * day, right: 0.78 },
      { id: 'w-054', w: 'exercise',   phon: '/ˈeksəsaɪz/',      mean: 'n. 锻炼；练习 v. 锻炼', eg: 'We do morning exercises every day.', book: 'wb-7b', unit: 'Unit 2', lv: 2, at: now - 2 * day, right: 0.55 },

      /* ===== 中考词书 · 高频词 ===== */
      { id: 'w-055', w: 'improve',    phon: '/ɪmˈpruːv/',       mean: 'v. 改进；提高',        eg: 'Reading every day can improve your English.', book: 'wb-zk', unit: '高频词', lv: 3, at: now - 5 * day, right: 0.70 },
      { id: 'w-056', w: 'environment', phon: '/ɪnˈvaɪrənmənt/', mean: 'n. 环境',              eg: 'We should protect the environment.', book: 'wb-zk', unit: '高频词', lv: 1, at: now - 1 * day, right: 0.40 },
      { id: 'w-057', w: 'describe',   phon: '/dɪˈskraɪb/',      mean: 'v. 描述；形容',        eg: 'Can you describe the picture?',     book: 'wb-zk', unit: '高频词', lv: 0, at: 0, right: 0 },

      /* ===== 中考词书 · 核心词 ===== */
      { id: 'w-058', w: 'achieve',    phon: '/əˈtʃiːv/',        mean: 'v. 达到；实现',        eg: 'You can achieve your dream by working hard.', book: 'wb-zk', unit: '核心词', lv: 2, at: now - 3 * day, right: 0.65 },
      { id: 'w-059', w: 'develop',    phon: '/dɪˈveləp/',       mean: 'v. 发展；培养',        eg: 'It is important to develop good habits.', book: 'wb-zk', unit: '核心词', lv: 0, at: 0, right: 0 },
      { id: 'w-060', w: 'communicate', phon: '/kəˈmjuːnɪkeɪt/', mean: 'v. 交流；沟通',        eg: 'We communicate with each other by email.', book: 'wb-zk', unit: '核心词', lv: 0, at: 0, right: 0 }
    ];
    /* 老字段 tag（new / rev）保留兼容，统一从 lv 派生 */
    words.forEach(function (w) { if (!w.tag) w.tag = w.lv ? 'rev' : 'new'; });

    /* ---------- 作文任务 + 学生提交（AI 评阅 → 人工复核） ---------- */
    var essays = [
      { id: 'E-318', subject: '英语', title: 'My Weekend', minWords: 80, due: '本周五 20:00',
        published: true, students: ['s1'], points: ['时态统一（一般过去时）', '至少 3 个活动细节', '结尾一句感受'],
        subs: [
          { sid: 's1', at: now - 20 * hour, words: 96, status: '待复核', aiScore: 86,
            text: 'Last Saturday I got up at seven. I helped my mother wash the dishes and then went to the library with my friend. We read books about science for two hours. In the afternoon I played basketball in the park. I was very tired but happy. In the evening, I finished my homework and watched TV with my parents. What a wonderful weekend!',
            aiComment: '结构清晰、时态基本正确，活动细节充足（3 个以上）。扣分点：wash 应为 helped...wash 已正确；建议把 In the evening 后的动词时态与全文统一，并把 watched 改为 watched → 正确。可提升：增加 1–2 个形容词让画面更生动。',
            aiPoints: [{ label: '时态统一', ok: true }, { label: '活动细节 ≥3', ok: true }, { label: '结尾感受', ok: true }],
            reviewer: null, featured: true },
          { sid: 's2', at: now - 3 * day, words: 62, status: '已通过', aiScore: 74,
            text: 'On Sunday I went to the park. I played with my sister. We saw many flowers. Then we ate ice cream. It was a good day.',
            aiComment: '要点基本齐全但篇幅偏短（62 词 < 要求的 80 词），句子多为简单句。建议补充 1 个活动细节和 1 句感受。',
            aiPoints: [{ label: '时态统一', ok: true }, { label: '活动细节 ≥3', ok: false }, { label: '结尾感受', ok: true }],
            reviewer: '我', reviewedAt: now - 3 * day }
        ] },
      { id: 'E-319', subject: '语文', title: '那一次，我读懂了父亲', minWords: 600, due: '下周三 20:00',
        published: false, students: [], points: ['围绕一件事展开', '有 2 处以上细节描写', '结尾有感悟升华'], subs: [] }
    ];

    /* ---------- 学生发布的记录（用户端「我的记录」/首页，管理端可见全部） ---------- */
    var posts = [
      { id: 'P-901', sid: 's1', at: now - 2 * hour, tag: '随感', vis: '公开', status: '正常',
        title: '一元二次方程终于开窍了', likes: 12, cmts: 3, imgs: 2,
        text: '今天把配方法练得盖了，原来核心就一句话：凑完全平方。错题本里那 3 道题重做全对，明天让老师再出两道变式试试。' },
      { id: 'P-902', sid: 's1', at: now - 5 * hour, tag: '学习笔记', vis: '家人可见', status: '正常',
        title: '《骆驼祥子》第 3 章读完', likes: 6, cmts: 1, imgs: 1,
        text: '「他以为只要努力，就可以实现自己的梦。」祥子把车当成脸面，可越是攥着的东西越容易失去。读完还想聊聊「车」到底代表什么。' },
      { id: 'P-903', sid: 's2', at: now - 26 * hour, tag: '图文记录', vis: '家人可见', status: '正常',
        title: '晚跑 3 公里', likes: 8, cmts: 0, imgs: 3,
        text: '跑完第三公里的时候，一天的烦心事好像都被风吹出去了。明天继续。' },
      { id: 'P-904', sid: 's1', at: now - 30 * hour, tag: '图文记录', vis: '公开', status: '正常',
        title: '《昆虫记》观察日记 · 九连拍', likes: 15, cmts: 2, imgs: 9,
        text: '阳台上的甲虫标本也真够瞧了，从卵到幼虫再到成虫，全程记录。法布尔说得对：耐心是观察最好的工具。' },
      { id: 'P-905', sid: 's1', at: now - 3 * day, tag: '学习笔记', vis: '仅自己', status: '正常',
        title: '英语不规则动词表', likes: 3, cmts: 0, imgs: 0,
        text: '把过去式和过去分词整理成一张表，明天默写。' },
      { id: 'P-906', sid: 's2', at: now - 4 * day, tag: '随感', vis: '仅自己', status: '已隐藏',
        title: '今晚的月亮很圆', likes: 4, cmts: 1, imgs: 0,
        text: '晾衣服的时候抬头看到的，忽然想到快月考了。' },
      { id: 'P-907', sid: 's1', at: now - 6 * day, tag: '图文记录', vis: '公开', status: '正常',
        title: '第一次搭纸桥', likes: 18, cmts: 4, imgs: 1,
        text: '用报纸和胶带搭了一座纸桥，压了三本字典还没塌。' }
    ];

    /* ---------- 作答记录 + 错题本（种子生成见文件下方 seedSubs / seedMistakes，
       老库迁移走同一份逻辑，不重复写两遍数据） ---------- */
    var submissions = seedSubs(qbank, now);
    var mistakes = seedMistakes(now);

    /* ---------- 掌握度 / 活跃度 ---------- */
    var mastery = {
      s1: [ { subject: '数学', v: 88, trend: 6 }, { subject: '英语', v: 76, trend: 2 }, { subject: '语文', v: 71, trend: -1 },
            { subject: '物理', v: 0, soon: true }, { subject: '化学', v: 0, soon: true } ],
      s2: [ { subject: '英语', v: 74, trend: 4 }, { subject: '数学', v: 62, trend: 1 }, { subject: '语文', v: 68, trend: 0 } ],
      s3: []
    };
    var weak = {
      s1: [
        { kp: '二次函数 · 图象与系数关系', rate: 0.52, n: 21, subject: '数学' },
        { kp: '英语 · 过去完成时', rate: 0.68, n: 42, subject: '英语' },
        { kp: '一元二次方程 · 判别式', rate: 0.71, n: 18, subject: '数学' },
        { kp: '古诗文默写 · 岳阳楼记', rate: 0.86, n: 15, subject: '语文' }
      ],
      s2: [ { kp: '一般现在时 · 三单', rate: 0.61, n: 12, subject: '英语' } ],
      s3: []
    };
    var activity = {
      s1: [ { d: '周一', min: 22, done: 4, total: 6 }, { d: '周二', min: 39, done: 6, total: 6 },
            { d: '周三', min: 48, done: 6, total: 6 }, { d: '周四', min: 36, done: 5, total: 6 },
            { d: '周五', min: 41, done: 6, total: 6 }, { d: '周六', min: 18, done: 2, total: 6 },
            { d: '周日', min: 25, done: 1, total: 6 } ],
      s2: [ { d: '周三', min: 9, done: 1, total: 2 }, { d: '周四', min: 21, done: 2, total: 2 },
            { d: '周五', min: 18, done: 2, total: 2 }, { d: '周六', min: 0, done: 0, total: 2 },
            { d: '周日', min: 0, done: 0, total: 2 } ],
      s3: []
    };

    /* ---------- 审核日志 ---------- */
    var logs = [
      { at: now - 2 * hour, who: '我', act: '退回', target: 'Q-1050', note: '与 Q-0911 重复，退回重出' },
      { at: now - 25 * hour, who: '我', act: '退回', target: 'Q-1051', note: '与题库已有题目重复' },
      { at: now - 3 * day, who: 'AI 预筛', act: '自动通过', target: 'Q-1042', note: '置信 0.96 ≥ 0.85 直通' },
      { at: now - 3 * day, who: 'AI 预筛', act: '自动通过', target: 'Q-1043', note: '置信 0.88 ≥ 0.85 直通' },
      { at: now - 4 * day, who: '我', act: '通过', target: 'Q-1052', note: '手动录入，采分点已核对' }
    ];

    /* ---------- 管理端设置 ---------- */
    var settings = {
      adminName: '妈妈', adminAccount: 'admin', phone: '',
      aiModel: '标准档（日常出题）', aiHigh: '增强档（难题 / 作文）',
      autoPass: 0.85, reportDown: 3, dailySubjects: 2, quiet: '21:30', notifyAt: '20:00',
      poster: '3:4', heroNum: '连续打卡天数', showScore: false,
      checkIn: true, theme: 'light', defaultGrade: '初三'
    };

    return {
      students: students, tasks: tasks, qbank: qbank, books: books, words: words,
      wordbooks: wordbooks,
      essays: essays, posts: posts,
      submissions: submissions, mistakes: mistakes,
      mastery: mastery, weak: weak, activity: activity,
      logs: logs, settings: settings, featured: featuredSeed(now, essays),
      ai: seedAI(now), ver: VER
    };
  }

  /* ---------- 版本与迁移：VER 变更时不清库，只补字段 ---------- */
  var VER = 14;

  /* 章节稳定 id：正文键按 bookId-uid 定位，所以章节标题能改、能调序，uid 不能变 */
  function mkUid() {
    return 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e7).toString(36);
  }
  /* 生成实体 id（词书等） */
  function mkId(p) {
    return p + '-' + Date.now().toString(36) + Math.floor(Math.random() * 1e7).toString(36);
  }

  /* 老数据没有 grade 时按题目 id 回填，回填不到再按科目兜底 */
  /* 老数据没有 grade 时按题目 id 回填，回填不到再按科目兜底（都用初一/初二/初三口径） */
  var GRADE_BY_ID = {
    'Q-1042': '初三', 'Q-1043': '初三', 'Q-1044': '初三', 'Q-1045': '初三',
    'Q-1046': '初三', 'Q-1047': '初三', 'Q-1048': '初三', 'Q-1049': '初三',
    'Q-1050': '初二', 'Q-1051': '初一', 'Q-1052': '初三'
  };
  var GRADE_BY_SUBJ = { '数学': '初三', '语文': '初三', '英语': '初三', '物理': '初三',
                        '化学': '初三', '生物': '初一', '历史': '初一',
                        '道德与法治': '初一', '地理': '初一' };

  function migrate(d) {
    var changed = false;
    var v = d.ver || 0;
    if (v < 2) {
      (d.qbank || []).forEach(function (q) {
        if (!q.grade) {
          q.grade = GRADE_BY_ID[q.id] || GRADE_BY_SUBJ[q.subject] || '初三';
          changed = true;
        }
      });
      if (d.settings && !d.settings.defaultGrade) { d.settings.defaultGrade = '初三'; changed = true; }
    }
    if (v < 3) {
      /* T4 子题结构升级：老数据把整组采分点折成一道简答子题 */
      (d.qbank || []).forEach(function (q) {
        if (q.type === 'T4' && !q.subs) {
          q.subs = [{ type: 'short', score: q.score || 6, stem: '请根据材料作答。', points: q.points || [] }];
          delete q.points;
          changed = true;
        }
      });
    }
    if (v < 4) {
      /* 佳作库上线：老库补一份佳作集合，并让作文提交的 featured 标记与之对齐 */
      if (!d.featured) d.featured = featuredSeed(Date.now(), d.essays);
      var featRef = {};
      (d.featured || []).forEach(function (f) { if (f.from === 'essay' && f.refId) featRef[f.refId] = 1; });
      (d.essays || []).forEach(function (t) {
        (t.subs || []).forEach(function (s) {
          if (s.featured === undefined) s.featured = !!featRef[t.id + '|' + s.sid];
        });
      });
      changed = true;
    }
    if (v < 5) {
      /* 阅读书单改版：配题从书级的 asks（按序号）内嵌到每个 unit 上，
         并补上 封面 / 适用年级 / 简介 三个字段（老库为空字符串，不覆盖已有数据） */
      (d.books || []).forEach(function (b) {
        if (b.asks) {
          Object.keys(b.asks).forEach(function (k) {
            var i = +k - 1, a = b.asks[k] || {};
            if (b.units && b.units[i]) {
              if (a.q) { b.units[i].q = a.q; b.units[i].points = a.points || []; }
            } else if (a.q) {
              /* 序号超出已录单元：补一条占位单元，避免丢掉这条配题 */
              b.units = b.units || [];
              b.units.push({ t: '第 ' + k + ' ' + (b.unitName || '章') + ' · 待补标题', b: '', q: a.q, points: a.points || [] });
            }
          });
          delete b.asks;
        }
        (b.units || []).forEach(function (u) { if (!u.points) u.points = []; });
        if (b.grade === undefined) b.grade = '';
        if (b.intro === undefined) b.intro = '';
        if (b.cover === undefined) b.cover = '';
        if (b.createdAt === undefined) b.createdAt = 0;
      });
      changed = true;
    }
    if (v < 6) {
      /* 章节正文上线：给每个 unit 补稳定 uid 与 tx（正文字数，默认 0）
         —— 正文实体不进主库（见下方 TXT 段），这里只登记「这一章有没有正文」 */
      (d.books || []).forEach(function (b) {
        (b.units || []).forEach(function (u) {
          if (!u.uid) u.uid = mkUid();
          if (u.tx === undefined) u.tx = 0;
        });
      });
      changed = true;
    }
    if (v < 7) {
      /* 单词书上线：词条从「词单文本」升级为「词书 + 单元」两级
         - 预置七上 / 七下 / 中考词书；老数据的每个词单名升格成一本词书，词条挂上去，单元留空
         - 词条里已出现的单元名，自动补进所属词书的单元清单 */
      if (!d.wordbooks || !d.wordbooks.length) d.wordbooks = presetWordBooks(Date.now());
      var wbByName = {};
      d.wordbooks.forEach(function (b) {
        if (!b.units) b.units = [];
        if (b.target === undefined) b.target = 0;
        wbByName[b.name] = b;
      });
      (d.words || []).forEach(function (w) {
        if (!w.book) {
          var nm = w.list || '未归类';
          if (!wbByName[nm]) {
            var nb = { id: mkId('wb'), name: nm, grade: '', unitName: 'Unit', units: [],
                       target: 0, note: '由旧词单自动生成', published: false, createdAt: Date.now() };
            d.wordbooks.push(nb); wbByName[nm] = nb;
          }
          w.book = wbByName[nm].id;
          w.unit = '';
          delete w.list;
        }
        if (w.unit === undefined) w.unit = '';
      });
      var wbById = {};
      d.wordbooks.forEach(function (b) { wbById[b.id] = b; });
      (d.words || []).forEach(function (w) {
        var b = wbById[w.book];
        if (b && w.unit && b.units.indexOf(w.unit) < 0) b.units.push(w.unit);
      });
      changed = true;
    }
    if (v < 8) {
      /* 单词排程上线：词条补「复习轮次 lv」与排程要用的 at / right
         - 老库只有 tag（new / rev）和 right，按 right 反推一个轮次，保证排程立刻能跑
         - 学生补 wordPerDay（每天几个新词：用户端设定、后端存；老库给默认值） */
      (d.words || []).forEach(function (w, i) {
        if (!w.id) w.id = 'w-' + ('000' + (i + 1)).slice(-3);
        if (w.lv === undefined) {
          w.lv = w.tag === 'rev' ? Math.min(5, 1 + Math.round((w.right || 0) * 4)) : 0;
        }
        if (w.at === undefined) w.at = 0;
        if (w.right === undefined) w.right = 0;
        w.tag = w.lv ? 'rev' : 'new';
      });
      (d.students || []).forEach(function (s) {
        if (s.wordPerDay === undefined) s.wordPerDay = 8;
      });
      changed = true;
    }
    if (v < 9) {
      /* 功能权限上线：老库学生没有 perm，补一份「全功能」——不改变现有使用体验 */
      (d.students || []).forEach(function (x) {
        if (!x.perm || !x.perm.mods) { x.perm = permNew('full', Date.now()); changed = true; }
      });
    }
    if (v < 10) {
      /* 学生档案与用户端对齐（VER 10）
         - 年级口径统一「初一 / 初二 / 初三」：老库的七年级 → 初一；题库与学生档案必须同一口径，
           否则出题时按 student.grade 筛题库会一条都筛不到
         - 教材版本统一带「版」字：人教 → 人教版、部编/统编 → 人教版
         - 单科「主攻科目 + 目标分」升级成九科表 subjects（老库只把主攻那一科打开，目标分带过去）
         - 补齐用户端有、管理端原先没有的字段：性别 / 签名 / 学期 / 节奏三项 / 头像 / 状态 */
      (d.qbank || []).forEach(function (q) {
        if (q.grade && GRADE_ALIAS[q.grade]) q.grade = normGrade(q.grade);
      });
      if (d.settings && d.settings.defaultGrade) d.settings.defaultGrade = normGrade(d.settings.defaultGrade);

      var tk = d.tasks || {};
      Object.keys(tk).forEach(function (sid) {
        var t = tk[sid];
        ((t && t.items) || []).forEach(function (it) {
          if (it.opt && it.opt.grade && GRADE_ALIAS[it.opt.grade]) it.opt.grade = normGrade(it.opt.grade);
        });
      });

      (d.students || []).forEach(function (s) {
        s.grade   = normGrade(s.grade);
        s.edition = normEdition(s.edition);
        if (!Array.isArray(s.subjects) || !s.subjects.length) {
          s.subjects = subjSeed(s.subject, s.target, s.subject ? [s.subject] : SUBJ_ON_DEFAULT);
        }
        stuSync(s);
      });
      changed = true;
    }
    if (v < 11) {
      /* 账号体系上线（VER 11）：取消绑定码，改为「管理端建档 = 直接开用户端账号」
         - bindCode / bound / boundAt / device 四个字段退役
         - bound → activated、boundAt → activatedAt、device → lastDevice
         - 昵称拼音无从自动生成，账号给 xj0001 这类顺序号（家长可在编辑档案里改）
         - 补一份 6 位初始密码；老库已绑定的学生视为已激活，不改变现有使用体验 */
      var taken = [];
      (d.students || []).forEach(function (s) {
        var acc = s.account;
        if (!acc) acc = 'xj' + ('000' + (taken.length + 1)).slice(-4);
        while (taken.indexOf(acc) >= 0) acc += 'a';
        s.account = acc;
        taken.push(acc);

        if (!s.pwdInit) s.pwdInit = mkPwd();
        if (s.pwdChanged === undefined) s.pwdChanged = false;
        if (s.activated === undefined) s.activated = !!s.bound;
        if (s.activatedAt === undefined) s.activatedAt = s.boundAt || null;
        if (s.lastDevice === undefined) s.lastDevice = s.device || '';
        if (s.tag === '待绑定') s.tag = '待激活';
        delete s.bindCode; delete s.bound; delete s.boundAt; delete s.device;
      });
      changed = true;
    }
    if (v < 12) {
      /* 学情数据上线（VER 12）：补「作答记录」与「错题本」两个集合。
         正式版这两张表由服务端在判分时写入，管理端只读；老库这里补一份演示流水，
         保证升级后页面不是空的（要看真空库请用「重置数据」）。 */
      if (!d.submissions) d.submissions = seedSubs(d.qbank || [], Date.now());
      if (!d.mistakes) d.mistakes = seedMistakes(Date.now());
      changed = true;
    }
    if (v < 13) {
      /* AI 中枢上线（VER 13）：补供应商（含密钥）/ 环节路由 / 用量 / 预算。
         老的 settings.aiModel 档位被「按环节分配模型」取代，字段保留不删
         （用户端与旧页面还在读），只把入口从设置页挪到 AI 中枢。 */
      if (!d.ai) d.ai = seedAI(Date.now());
      changed = true;
    }
    if (v < 14) {
      /* 举报机制下线（VER 14）：记录只保留「正常 / 已隐藏」两种状态。
         老库里的 reports 明细与「被举报」状态一并清掉，避免记录管理页出现僵尸筛选。 */
      (d.posts || []).forEach(function (p) {
        if (p.reports) { delete p.reports; changed = true; }
        if (p.status === '被举报') { p.status = '正常'; changed = true; }
      });
    }
    if (v < VER) { d.ver = VER; changed = true; }
    return changed;
  }

  /* 演示书的示例正文：正文实体落到独立键，主库只留字数（tx0 是一次性种子字段） */
  function seedTxt(d) {
    (d.books || []).forEach(function (b) {
      (b.units || []).forEach(function (u) {
        if (u.tx0) {
          var n = txtSet(b.id, u.uid, u.tx0);
          u.tx = n < 0 ? 0 : n;
          delete u.tx0;
        }
        if (u.tx === undefined) u.tx = 0;
      });
    });
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) { var s = seed(); seedTxt(s); localStorage.setItem(KEY, JSON.stringify(s)); return s; }
      var d = JSON.parse(raw);
      if (!d) { var s2 = seed(); seedTxt(s2); localStorage.setItem(KEY, JSON.stringify(s2)); return s2; }
      if (migrate(d)) localStorage.setItem(KEY, JSON.stringify(d));
      return d;
    } catch (e) { return seed(); }
  }
  function all() { if (!cache) cache = load(); return cache; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) {} }
  function get(k, def) { var d = all(); return d[k] === undefined ? def : d[k]; }
  function set(k, v) { all(); cache[k] = v; save(); }
  function reset() { imgReset(); txtReset(); cache = seed(); seedTxt(cache); save(); return cache; }

  /* ------------------------------------------------------------
     题目配图：实体单独存键（xjadmin-img-<id>），题库里只放「引用」
     - 为什么独立存：xjadmin-db 是全量 JSON 单键，图片若混在里面，
       列表 / 筛选 / 审核每次读写都要序列化几 MB，页面会明显变卡
     - 正式版：引用由本地 id 换成对象存储 URL（https://…/q/xxx.webp），
       字段结构与前端读法都不用改，删图片时接口同时删存储对象
     ------------------------------------------------------------ */
  var IMG_P = 'xjadmin-img-';

  function imgPut(src) {
    var id = 'img-' + Date.now().toString(36) + '-' + Math.floor(Math.random() * 1e6).toString(36);
    try { localStorage.setItem(IMG_P + id, src); }
    catch (e) { return ''; }                    /* 配额写满：返回空串，调用方提示 */
    return id;
  }
  function imgGet(ref) {
    if (!ref) return '';
    /* 兼容直接存 URL / dataURL 的情况（正式版这里就是 http 地址） */
    if (/^(data:|blob:|https?:\/|\/)/.test(ref)) return ref;
    try { return localStorage.getItem(IMG_P + ref) || ''; } catch (e) { return ''; }
  }
  function imgDel(ref) {
    if (!ref || /^(data:|https?:\/)/.test(ref)) return;
    try { localStorage.removeItem(IMG_P + ref); } catch (e) {}
  }
  function imgKeys() {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(IMG_P) === 0) out.push(k.slice(IMG_P.length));
    }
    return out;
  }
  /* 张数 + 占用（localStorage 按 UTF-16 计，1 字符 ≈ 2 字节） */
  function imgStat() {
    var ks = imgKeys(), bytes = 0;
    ks.forEach(function (id) { bytes += (localStorage.getItem(IMG_P + id) || '').length * 2; });
    return { n: ks.length, bytes: bytes };
  }
  /* 回收：删掉题库里已无人引用的图片（删题 / 换图后调用） */
  function imgGC() {
    var used = {};
    (get('qbank', []) || []).forEach(function (q) {
      (q.stemImgs || []).forEach(function (r) { used[r] = 1; });
      (q.subs || []).forEach(function (s) { (s.imgs || []).forEach(function (r) { used[r] = 1; }); });
    });
    var killed = 0;
    imgKeys().forEach(function (id) { if (!used[id]) { imgDel(id); killed++; } });
    return killed;
  }
  function imgReset() { imgKeys().forEach(imgDel); }

  /* ------------------------------------------------------------
     章节正文：实体单独存键（xjadmin-txt-<bookId>-<uid>）
     - 理由同配图：xjadmin-db 是全量 JSON 单键，一本长篇正文动辄几十万字，
       混在里面则列表 / 筛选 / 保存每次都要序列化几 MB，卡顿且易顶到 5MB 配额
     - units[] 上只留 uid + tx（正文字符数），渲染章节列表完全不读正文
     - 键按 bookId-uid 定位：章节标题能改、能调序，标题当不了主键
     - 正式版：正文存对象存储 / 数据库长文本列，unit.tx 退化为字数，
       前端读法（有正文就渲染段落）不变
     ------------------------------------------------------------ */
  var TXT_P = 'xjadmin-txt-';
  function txKey(bookId, uid) { return TXT_P + bookId + '-' + uid; }
  function txChars(t) { return String(t == null ? '' : t).replace(/\s/g, '').length; }

  /* 写入正文 → 返回字数；正文为空则删键并返回 0；配额写满返回 -1 */
  function txtSet(bookId, uid, text) {
    text = String(text == null ? '' : text);
    if (!uid) return 0;
    var k = txKey(bookId, uid);
    if (!text.trim()) { try { localStorage.removeItem(k); } catch (e) {} return 0; }
    try { localStorage.setItem(k, text); } catch (e) { return -1; }
    return txChars(text);
  }
  function txtGet(bookId, uid) {
    if (!uid) return '';
    try { return localStorage.getItem(txKey(bookId, uid)) || ''; } catch (e) { return ''; }
  }
  function txtDel(bookId, uid) {
    if (!uid) return;
    try { localStorage.removeItem(txKey(bookId, uid)); } catch (e) {}
  }
  function txtKeys() {
    var out = [];
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf(TXT_P) === 0) out.push(k.slice(TXT_P.length));
    }
    return out;
  }
  /* 统计：已录章数 / 总字数 / 占用（localStorage 按 UTF-16 计，1 字符 ≈ 2 字节） */
  function txtStat() {
    var ks = txtKeys(), bytes = 0, chars = 0;
    ks.forEach(function (ref) {
      var t = '';
      try { t = localStorage.getItem(TXT_P + ref) || ''; } catch (e) {}
      bytes += t.length * 2; chars += txChars(t);
    });
    return { n: ks.length, chars: chars, bytes: bytes };
  }
  /* 回收：删掉书目里已不存在的正文键（删章 / 删书后调用） */
  function txtGC() {
    var used = {};
    (get('books', []) || []).forEach(function (b) {
      (b.units || []).forEach(function (u) { if (u.uid) used[b.id + '-' + u.uid] = 1; });
    });
    var killed = 0;
    txtKeys().forEach(function (ref) {
      if (!used[ref]) { try { localStorage.removeItem(TXT_P + ref); killed++; } catch (e) {} }
    });
    return killed;
  }
  function txtReset() {
    txtKeys().forEach(function (ref) { try { localStorage.removeItem(TXT_P + ref); } catch (e) {} });
  }

  /* ------------------------------------------------------------
     单词排程引擎（艾宾浩斯）
     - 正式版这一段跑在服务端；原型期放本地，管理端只做「预览 → 审查 → 发布」
     - 间隔表：学完第 1/2/3/4/5 轮，下次分别隔 1/2/4/7/15 天；到第 6 轮视作已掌握，退出排程
     - 词条三字段：lv 复习轮次（0 = 未学）、at 上次学习时间、right 正确率
     - 「每天背几个新词」由学生在用户端自己设定、存在后端（student.wordPerDay），
        管理端只读展示，排程时拿它当输入 —— 不在管理端改
     ------------------------------------------------------------ */
  var EBB = [1, 2, 4, 7, 15, 30];

  /* 这个词下次该复习的时间戳；未学返回 0 */
  function ebbDue(w) {
    if (!w || !w.lv) return 0;
    return (w.at || 0) + EBB[Math.min(w.lv, 6) - 1] * 864e5;
  }
  function dayStart(ts) { var d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }

  /* 算「今天该背哪些、该复习哪些」
     - 到期复习优先全给（逾期的一律算今天）
     - 新词按 perDay 从词书顺序里补，不够就少给
     - forecast = 未来 7 天每天到期的复习量（第 0 天含所有逾期） */
  function wordPlan(opt) {
    opt = opt || {};
    var units = opt.units || [];
    var perDay = Math.max(1, opt.perDay || 8);
    var scope = get('words', []).filter(function (w) {
      if (opt.bookId && w.book !== opt.bookId) return false;
      if (!units.length) return true;
      if (units.indexOf('__none__') >= 0 && !w.unit) return true;
      return units.indexOf(w.unit) >= 0;
    });
    var DAY = 864e5, t0 = dayStart(opt.now || Date.now());
    var due = [], fresh = [], stat = { total: scope.length, fresh: 0, learning: 0, mastered: 0 };
    scope.forEach(function (w) {
      var lv = w.lv || 0;
      if (lv >= 6) { stat.mastered++; return; }
      if (!lv) { stat.fresh++; fresh.push(w); return; }
      stat.learning++;
      if (ebbDue(w) < t0 + DAY) due.push(w);   /* 到期日 <= 今天（含逾期） */
    });
    due.sort(function (a, b) { return ebbDue(a) - ebbDue(b); });   /* 越早到期越靠前 */
    var forecast = [];
    for (var i = 0; i < 7; i++) {
      var a = t0 + i * DAY, b = a + DAY;
      forecast.push(scope.filter(function (w) {
        var lv = w.lv || 0;
        if (!lv || lv >= 6) return false;
        var d = ebbDue(w);
        return i === 0 ? d < b : (d >= a && d < b);
      }).length);
    }
    return {
      bookId: opt.bookId || '', units: units.slice(), perDay: perDay,
      due: due, fresh: fresh, dueTotal: due.length,
      freshTotal: fresh.length, freshLeft: Math.max(0, fresh.length - perDay),
      forecast: forecast, stat: stat, scope: scope.length, today: t0
    };
  }

  return {
    get: get, set: set, all: all, save: save, reset: reset, KEY: KEY, uid: mkUid,
    imgPut: imgPut, imgGet: imgGet, imgDel: imgDel, imgStat: imgStat, imgGC: imgGC, imgReset: imgReset,
    txtSet: txtSet, txtGet: txtGet, txtDel: txtDel, txtStat: txtStat, txtGC: txtGC, txtReset: txtReset,
    wordPlan: wordPlan, ebb: EBB, wDue: ebbDue,
    /* 学生功能权限（8 开关 + 四档预设） */
    permOf: permOf, permNew: permNew, permMatch: permMatch,
    permLabelOf: permLabelOf, permOn: permOn,
    PERM_KEYS: PERM_KEYS, PERM_LABELS: PERM_LABELS,
    PERM_DESC: PERM_DESC, PERM_PRESETS: PERM_PRESETS,
    /* 学生档案（与用户端「编辑资料」同口径） */
    STU_GRADES: STU_GRADES, STU_TERMS: STU_TERMS, STU_EDITIONS: STU_EDITIONS,
    STU_GENDERS: STU_GENDERS, STU_RESTDAYS: STU_RESTDAYS, STU_COUNTS: STU_COUNTS,
    STU_STATUS: STU_STATUS, SUBJ_ALL: SUBJ_ALL,
    subjOf: subjOf, subjSeed: subjSeed, subjSet: subjSet, onSubj: onSubj,
    mainSubject: mainSubject, targetSum: targetSum, cleanScore: cleanScore,
    normGrade: normGrade, normEdition: normEdition,
    stuSync: stuSync, stuNew: stuNew, stuDisable: stuDisable, stuPurge: stuPurge,
    /* 用户端账号（2026-10-16 起取代绑定码） */
    mkPwd: mkPwd, mkAccount: mkAccount, stuResetPwd: stuResetPwd, stuKick: stuKick,
    /* 学情：作答记录 / 错题本 */
    subsOf: subsOf, mistakesOf: mistakesOf, subStat: subStat, mkStat: mkStat, weakOf: weakOf,
    /* AI 中枢：环节表 / 供应商类型 / 三档模式（页面与设置页共用一份口径） */
    AI_SCENES: AI_SCENES, AI_KINDS: AI_KINDS, AI_MODES: AI_MODES, AI_W: AI_W
  };
})();
