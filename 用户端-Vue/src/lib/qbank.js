/* ============================================================
   学迹 · 题库与判分（原型演示数据）
   ------------------------------------------------------------
   结构对齐《题目模板精简版 v1》的存储契约：

     block（题组）  = 一块材料 / 一道题干      → question_blocks
     item （小题）  = 判分与掌握度的最小单元  → question_items

   独立题 = 只有 1 个 item 的 block；
   材料题 = 1 块材料 + N 个 item（子题可为选择 / 填空 / 简答）。

   四个模板（学生端只会遇到这四种渲染）：
     choice        选择题（单选 / 多选 / 判断）
     fill_blank    填空题（题干里 {{n}} 定位空位）
     short_answer  简答题（按采分点判）
     material      材料题（材料 + 上面三种子题；材料里插空 = 完形填空）

   ⚠️ 正式版铁律：answer / rubric 必须由服务端在「提交之后」下发，
      绝不能在取题接口里返回 —— 这里放在同一份数据里只是为了原型演示。
   ============================================================ */

/* 依赖安全存储（stGet/stSet 会在模块加载时挂到 window） */
import './storage.js';

var QBANK = [

  /* ---------- 1. 数学 · 选择题 ---------- */
  {
    id: 'q1', type: 'choice', subject: '数学', star: 2, difficulty: '中',
    kp: '一元二次方程 · 配方法', score: 3,
    items: [{
      id: 'q1-1', ord: 1, type: 'choice', score: 3,
      stem: '方程 x<sup>2</sup> − 4x + 3 = 0 用配方法可化为（　）',
      options: [
        { id: 'o1', text: '(x − 2)<sup>2</sup> = 1' },
        { id: 'o2', text: '(x − 2)<sup>2</sup> = 7' },
        { id: 'o3', text: '(x − 4)<sup>2</sup> = 1' },
        { id: 'o4', text: '(x − 4)<sup>2</sup> = 13' }
      ],
      answer: ['o1'],
      explanation: '两边同时加 4：x<sup>2</sup> − 4x + 4 = 1，左边正好凑成 (x − 2)<sup>2</sup>，' +
        '所以化成 (x − 2)<sup>2</sup> = 1。口诀「一次项系数一半的平方」。'
    }]
  },

  /* ---------- 2. 语文 · 填空题（古诗文默写，严格逐字） ---------- */
  {
    id: 'q2', type: 'fill_blank', subject: '语文', star: 2, difficulty: '易',
    kp: '九上 · 岳阳楼记 · 古诗文默写', score: 4,
    items: [{
      id: 'q2-1', ord: 1, type: 'fill_blank', score: 4,
      stem: '《岳阳楼记》中表现作者旷达胸襟的句子是「先天下之忧而忧，{{1}}」；' +
            '写洞庭湖气势的句子是「{{2}}，吞长江」。',
      blanks: [
        { n: 1, label: '空1', accept: ['后天下之乐而乐'], mode: 'strict',
          tip: '注意「而」的位置，默写错一个字即不给分' },
        { n: 2, label: '空2', accept: ['衔远山'], mode: 'strict',
          tip: '「衔」不要写成「街」' }
      ],
      explanation: '「先天下之忧而忧，后天下之乐而乐」是全文的议论句；' +
        '「衔远山，吞长江」用拟人写洞庭湖的气势。默写题按「严格逐字」判，同义词不给分。'
    }]
  },

  /* ---------- 3. 英语 · 选择题（单选） ---------- */
  {
    id: 'q3', type: 'choice', subject: '英语', star: 1, difficulty: '易',
    kp: '九上 · 过去完成时', score: 3,
    items: [{
      id: 'q3-1', ord: 1, type: 'choice', score: 3,
      stem: 'By the time we got there, the film ______ for ten minutes.',
      options: [
        { id: 'o1', text: 'had been on' },
        { id: 'o2', text: 'has been on' },
        { id: 'o3', text: 'was on' },
        { id: 'o4', text: 'is on' }
      ],
      answer: ['o1'],
      explanation: '「到我们赶到时」是过去的时间点，电影在此之前已经开演了十分钟 —— ' +
        '过去的过去 → 过去完成时 had + 过去分词；for ten minutes 要求延续性，所以用 had been on。'
    }]
  },

  /* ---------- 4. 物理 · 填空题（带单位容错） ---------- */
  {
    id: 'q4', type: 'fill_blank', subject: '物理', star: 1, difficulty: '易',
    kp: '力 · 重力计算 G = mg', score: 4,
    items: [{
      id: 'q4-1', ord: 1, type: 'fill_blank', score: 4,
      stem: '一个物体的质量是 2kg，g 取 10N/kg，它受到的重力是 {{1}} N；' +
            '把它带到月球上，质量{{2}}（选填「变大 / 变小 / 不变」）。',
      blanks: [
        { n: 1, label: '空1', accept: ['20'], mode: 'numeric', unit: 'N',
          tip: '填 20 或 20N 都算对 —— 单位已经在题干里了' },
        { n: 2, label: '空2', accept: ['不变'], mode: 'synonym', tip: '' }
      ],
      explanation: 'G = mg = 2kg × 10N/kg = 20N。把 20N 代入 M 与 g 的关系即可。' +
        '质量是物体本身的属性，位置变了质量不变，变的是重力。'
    }]
  },

  /* ---------- 5. 数学 · 选择题（带题干图） ---------- */
  {
    id: 'q5', type: 'choice', subject: '数学', star: 3, difficulty: '中',
    kp: '二次函数 · 图象与系数关系', score: 3,
    items: [{
      id: 'q5-1', ord: 1, type: 'choice', score: 3,
      stem: '如图是二次函数 y = ax<sup>2</sup> + bx + c 的图象，则 a、b、c 的符号是（　）',
      figures: [{
        svg: '<svg class="q-figure-svg" viewBox="0 0 240 190" role="img" ' +
             'aria-label="开口向上的抛物线，对称轴在 y 轴左侧，与 y 轴交于正半轴">' +
             '<line x1="18" y1="150" x2="228" y2="150" stroke="currentColor" stroke-width="1.3"/>' +
             '<path d="M228 150l-7-3.6v7.2z" fill="currentColor"/>' +
             '<line x1="130" y1="176" x2="130" y2="18" stroke="currentColor" stroke-width="1.3"/>' +
             '<path d="M130 18l-3.6 7h7.2z" fill="currentColor"/>' +
             '<path d="M46 73 Q90 267 134 73" fill="none" stroke="#2B6CF6" stroke-width="2.1"/>' +
             '<circle cx="70" cy="150" r="2.6" fill="#2B6CF6"/>' +
             '<circle cx="110" cy="150" r="2.6" fill="#2B6CF6"/>' +
             '<circle cx="130" cy="90" r="2.6" fill="#2B6CF6"/>' +
             '<text x="234" y="146" font-size="11" fill="currentColor">x</text>' +
             '<text x="136" y="20" font-size="11" fill="currentColor">y</text>' +
             '<text x="118" y="166" font-size="11" fill="currentColor">O</text>' +
             '</svg>',
        caption: '图 1'
      }],
      options: [
        { id: 'o1', text: 'a &gt; 0，b &gt; 0，c &gt; 0' },
        { id: 'o2', text: 'a &gt; 0，b &lt; 0，c &gt; 0' },
        { id: 'o3', text: 'a &lt; 0，b &gt; 0，c &lt; 0' },
        { id: 'o4', text: 'a &gt; 0，b &gt; 0，c &lt; 0' }
      ],
      answer: ['o1'],
      explanation: '① 开口向上 → a &gt; 0；② 对称轴 x = −b / (2a) 在 y 轴左侧 → b 与 a 同号 → b &gt; 0；' +
        '③ 与 y 轴交点 (0, c) 在正半轴 → c &gt; 0。所以 a &gt; 0，b &gt; 0，c &gt; 0。'
    }]
  },

  /* ---------- 6. 化学 · 填空题（多空 + 系数） ---------- */
  {
    id: 'q6', type: 'fill_blank', subject: '化学', star: 2, difficulty: '中',
    kp: '化学方程式 · 配平与反应类型', score: 4,
    items: [{
      id: 'q6-1', ord: 1, type: 'fill_blank', score: 4,
      stem: '配平：{{1}}Al + {{2}}O<sub>2</sub> <span class="q-cond">点燃</span> {{3}}Al<sub>2</sub>O<sub>3</sub>，' +
            '该反应属于{{4}}反应（填基本反应类型）。',
      blanks: [
        { n: 1, label: '系数1', accept: ['4'], mode: 'numeric', tip: '最小公倍数法：从氧原子入手' },
        { n: 2, label: '系数2', accept: ['3'], mode: 'numeric', tip: '先定 O₂ 再配 Al' },
        { n: 3, label: '系数3', accept: ['2'], mode: 'numeric', tip: '' },
        { n: 4, label: '空4', accept: ['化合', '化合反应'], mode: 'synonym', tip: '多变一' }
      ],
      explanation: '左边氧原子数为偶数，右边 Al<sub>2</sub>O<sub>3</sub> 有 3 个氧，取最小公倍数 6：' +
        '3O<sub>2</sub> → 2Al<sub>2</sub>O<sub>3</sub>，再配 Al 为 4。即 4Al + 3O<sub>2</sub> = 2Al<sub>2</sub>O<sub>3</sub>；' +
        '两种物质生成一种 → 化合反应。'
    }]
  },

  /* ---------- 7. 历史 · 简答题（采分点判分） ---------- */
  {
    id: 'q7', type: 'short_answer', subject: '历史', star: 2, difficulty: '中',
    kp: '中国古代史 · 商鞅变法', score: 6,
    items: [{
      id: 'q7-1', ord: 1, type: 'short_answer', score: 6, min_words: 60,
      stem: '商鞅变法中对后世地方行政制度影响最深远的措施是什么？这一措施有何作用？请结合所学简述。（6 分）',
      rubric: [
        { point: '答出措施是「建立县制，由国君直接派官吏治理」', score: 2, required: true,
          keys: ['县制', '派官', '国君直接'] },
        { point: '答出「加强了中央对地方的控制 / 君主的权力」', score: 2,
          keys: ['中央', '君主', '控制'] },
        { point: '答出「成为此后两千多年地方行政制度的基础」', score: 1,
          keys: ['两千年', '后世', '基础'] },
        { point: '语言条理清楚、史实表述准确', score: 1, keys: [] }
      ],
      answer_text: '措施：建立县制，把乡、邑、聚合并为县，由国君直接派官吏治理。' +
        '作用：县的长官由国君任免，不再世袭，加强了国君对地方的直接控制，' +
        '对后世影响深远 —— 成为此后两千多年地方行政制度的基础。'
    }]
  },

  /* ---------- 8. 语文 · 材料题（现代文阅读：2 选择 + 1 简答） ---------- */
  {
    id: 'm1', type: 'material', subject: '语文', star: 3, difficulty: '中',
    kp: '散文阅读 · 标题含义 · 句段作用', score: 11,
    material: {
      title: '秋天的怀念（节选）',
      paragraphs: [
        '双腿瘫痪后，我的脾气变得暴怒无常。望着望着天上北归的雁阵，我会突然把面前的玻璃砸碎；' +
        '听着听着李谷一甜美的歌声，我会猛地把手边的东西摔向四周的墙壁。这时，母亲就悄悄地躲出去，' +
        '在我看不见的地方偷偷地听着我的动静。当一切恢复沉寂，她又悄悄地进来，眼边红红的，看着我。',
        '那天我又独自坐在屋里，听着窗外的树叶「唰唰啦啦」地飘落。母亲进来了，挡在窗前：' +
        '「北海的菊花开了，我推着你去看看吧。」她憔悴的脸上现出央求般的神色。' +
        '「什么时候？」「你要是愿意，就明天？」她说。我的回答已经让她喜出望外了。',
        '她出去了，就再也没回来。……邻居们把她抬上车时，她还在大口大口地吐着鲜血。' +
        '我没想到她已经病成那样。看着三轮车远去，也绝没有想到那竟是永远的诀别。'
      ],
      source: '史铁生《秋天的怀念》'
    },
    items: [
      {
        id: 'm1-1', ord: 1, type: 'choice', score: 3,
        stem: '母亲「悄悄地躲出去」的直接目的是（　）',
        options: [
          { id: 'o1', text: '不想打扰「我」发泄情绪' },
          { id: 'o2', text: '不想看到「我」发脾气' },
          { id: 'o3', text: '去外面做家务' },
          { id: 'o4', text: '去买东西，准备推「我」去看菊花' }
        ],
        answer: ['o1'],
        explanation: '下文紧跟着「在我看不见的地方偷偷地听着我的动静」，说明她并没有走远，' +
          '而是给「我」留出独自宣泄的空间，又放心不下地守着。所以选 A，B 项是「回避」而非「成全」。'
      },
      {
        id: 'm1-2', ord: 2, type: 'choice', score: 3,
        stem: '文中写母亲「挡在窗前」这一细节，表达效果是（　）',
        options: [
          { id: 'o1', text: '怕「我」看到落叶萧瑟而更加伤感' },
          { id: 'o2', text: '窗外风大，怕「我」着凉' },
          { id: 'o3', text: '顺手关窗，没有特别用意' },
          { id: 'o4', text: '想让「我」注意到她带来的菊花' }
        ],
        answer: ['o1'],
        explanation: '落叶飘零容易让人联想到生命的衰败，母亲正是不愿「我」触景伤情，' +
          '才用身体挡住视线 —— 一个「挡」字写尽了她小心翼翼的体贴。'
      },
      {
        id: 'm1-3', ord: 3, type: 'short_answer', score: 5, min_words: 50,
        stem: '结合全文，说说你对标题「秋天的怀念」的理解。（5 分）',
        rubric: [
          { point: '点出怀念的对象是母亲', score: 2, required: true, keys: ['母亲'] },
          { point: '点出「秋天」的象征意味（凋零 / 诀别 / 成熟）', score: 1, keys: ['秋天', '落叶', '诀别', '凋零'] },
          { point: '点出怀念中含着愧疚与悔恨', score: 1, keys: ['愧疚', '悔恨', '后悔', '遗憾'] },
          { point: '结合文中具体细节（菊花、挡窗、诀别）分析', score: 1, keys: ['菊花', '挡', '诀别'] }
        ],
        answer_text: '「秋天」既是故事发生的季节，也象征着生命的凋零与诀别 —— 母亲在秋天离世，' +
          '「我」在秋天懂得了她的隐忍。怀念的对象是母亲，其中含着深深的愧疚与悔恨：' +
          '当年只顾着自己的痛苦，没能体谅她的病与她的爱。'
      }
    ]
  },

  /* ---------- 9. 英语 · 材料题（完形填空：材料里插空） ---------- */
  {
    id: 'm2', type: 'material', subject: '英语', star: 2, difficulty: '中',
    kp: '九上 · 完形填空 · 时态与比较级', score: 6,
    material: {
      title: 'A Letter to My Pen Pal',
      // 材料正文里有 {{n}} → 自动切换成「内嵌空位」形态（英语完形填空）
      paragraphs: [
        'Dear Tom,',
        'I still remember the day when you left. We {{1}} to the old park near my home and stayed ' +
        'there until sunset. It was the {{2}} afternoon I had ever had. I hope you can come back ' +
        '{{3}} next summer.',
        'Yours,\nLi Hua'
      ],
      source: '原型演示文本'
    },
    items: [
      {
        id: 'm2-1', ord: 1, type: 'choice', score: 2, blank: 1,
        options: [
          { id: 'o1', text: 'went' },
          { id: 'o2', text: 'have gone' },
          { id: 'o3', text: 'go' },
          { id: 'o4', text: 'will go' }
        ],
        answer: ['o1'],
        explanation: '空格前后都是过去时的叙述（remember / left / stayed），这里叙述当时的事，' +
          '用一般过去时 went。'
      },
      {
        id: 'm2-2', ord: 2, type: 'choice', score: 2, blank: 2,
        options: [
          { id: 'o1', text: 'happy' },
          { id: 'o2', text: 'happier' },
          { id: 'o3', text: 'happiest' },
          { id: 'o4', text: 'most happy' }
        ],
        answer: ['o3'],
        explanation: '空格前有 the，后有 I had ever had —— 「我所拥有过的最……的下午」，' +
          '用最高级 happiest。'
      },
      {
        id: 'm2-3', ord: 3, type: 'choice', score: 2, blank: 3,
        options: [
          { id: 'o1', text: 'visit' },
          { id: 'o2', text: 'to visit' },
          { id: 'o3', text: 'visiting' },
          { id: 'o4', text: 'visited' }
        ],
        answer: ['o2'],
        explanation: 'come back 表示「回来（目的）」时后接不定式表目的：come back to visit。'
      }
    ]
  }
];

/* ============================================================
   小工具：题型元信息
   ============================================================ */
var QB_TYPE = {
  choice:       { label: '选择题', short: '选择', desc: '题干 + 选项，程序精确比对' },
  fill_blank:   { label: '填空题', short: '填空', desc: '题干里挖空，归一化后比对' },
  short_answer: { label: '简答题', short: '简答', desc: '按采分点逐条判，AI 给分' },
  material:     { label: '材料题', short: '材料', desc: '一块材料 + 若干选择题/填空题/简答题子题' }
};

function qbKind(block) { return block.type || (block.items[0] && block.items[0].type); }
function qbTypeLabel(kind) { return (QB_TYPE[kind] || {}).label || kind; }
function qbTypeShort(kind) { return (QB_TYPE[kind] || {}).short || kind; }

/* 一个题组里子题的题型分布，如 { choice: 2, short_answer: 1 } */
function qbItemMix(block) {
  var mix = {};
  block.items.forEach(function (it) {
    mix[it.type] = (mix[it.type] || 0) + 1;
  });
  return mix;
}

/* 材料题是否「内嵌空位」形态（正文里插了空 → 英语完形填空） */
function qbIsInline(block) {
  if (qbKind(block) !== 'material' || !block.material) return false;
  return block.material.paragraphs.some(function (p) { return /\{\{\d+\}\}/.test(p); });
}

/* ============================================================
   作答记录（原型存 localStorage；正式版写 attempts 表）
   ============================================================ */
var ATTEMPT_KEY = 'xj-attempts';

function qbReadAttempts() {
  var raw = (typeof stGet === 'function') ? stGet(ATTEMPT_KEY)
                                          : (function () { try { return localStorage.getItem(ATTEMPT_KEY); } catch (e) { return null; } })();
  try { return JSON.parse(raw || '{}') || {}; }
  catch (e) { return {}; }
}
function qbWriteAttempts(map) {
  var s = JSON.stringify(map);
  if (typeof stSet === 'function') stSet(ATTEMPT_KEY, s);
  else { try { localStorage.setItem(ATTEMPT_KEY, s); } catch (e) {} }
}
function qbAttemptOf(itemId) { return qbReadAttempts()[itemId] || null; }

function qbSaveAttempt(itemId, res) {
  var map = qbReadAttempts();
  map[itemId] = res;
  qbWriteAttempts(map);
}
function qbClearBlock(block) {
  var map = qbReadAttempts();
  var dr  = qbReadDrafts();
  block.items.forEach(function (it) { delete map[it.id]; delete dr[it.id]; });
  qbWriteAttempts(map);
  qbWriteDrafts(dr);
}

/* ---------- 作答草稿（没提交就切走，回来还在） ---------- */
var DRAFT_KEY = 'xj-drafts';

function qbReadDrafts() {
  var raw = (typeof stGet === 'function') ? stGet(DRAFT_KEY)
                                          : (function () { try { return localStorage.getItem(DRAFT_KEY); } catch (e) { return null; } })();
  try { return JSON.parse(raw || '{}') || {}; }
  catch (e) { return {}; }
}
function qbWriteDrafts(map) {
  var s = JSON.stringify(map);
  if (typeof stSet === 'function') stSet(DRAFT_KEY, s);
  else { try { localStorage.setItem(DRAFT_KEY, s); } catch (e) {} }
}

/* ============================================================
   错题本（原型存 localStorage；正式版写 mistake_book 表）
   ------------------------------------------------------------
   只存「指针 + 状态」，题干 / 选项 / 解析一律展示时回查题库，
   避免同一道题在两处各存一份、改题后不同步。
     { itemId, blockId, src:'auto'|'manual', wrong, addedAt, lastAt, fixed }
   src=auto   答错自动进来的
   src=manual 自己点「加入错题本」进来的（错 0 次也留着）
   ============================================================ */
var MISTAKE_KEY = 'xj-mistakes';

function qbReadMistakes() {
  var raw = (typeof stGet === 'function') ? stGet(MISTAKE_KEY)
                                          : (function () { try { return localStorage.getItem(MISTAKE_KEY); } catch (e) { return null; } })();
  try { return JSON.parse(raw || '{}') || {}; }
  catch (e) { return {}; }
}
function qbWriteMistakes(map) {
  var s = JSON.stringify(map);
  if (typeof stSet === 'function') stSet(MISTAKE_KEY, s);
  else { try { localStorage.setItem(MISTAKE_KEY, s); } catch (e) {} }
}
function qbMistakeItem(itemId) { return qbReadMistakes()[itemId] || null; }

/* 找到某个小题属于哪个 block（错题本只记 itemId，展示时要回查） */
function qbBlockOfItem(itemId) {
  for (var i = 0; i < QBANK.length; i++) {
    var b = QBANK[i];
    for (var j = 0; j < b.items.length; j++) if (b.items[j].id === itemId) return b;
  }
  return null;
}

/* 加入错题本（已存在则不动计数） */
function qbMistakeAdd(itemId, src) {
  var block = qbBlockOfItem(itemId);
  if (!block) return null;
  var m = qbReadMistakes();
  var now = Date.now();
  if (m[itemId]) {
    if (src === 'manual') m[itemId].src = 'manual';
  } else {
    m[itemId] = { itemId: itemId, blockId: block.id, src: src || 'manual',
                  wrong: 0, addedAt: now, lastAt: now, fixed: false };
  }
  qbWriteMistakes(m);
  return m[itemId];
}

function qbMistakeRemove(itemId) {
  var m = qbReadMistakes();
  delete m[itemId];
  qbWriteMistakes(m);
}

/* 手动开关：返回 true 表示操作后「在错题本里」 */
function qbMistakeToggle(itemId) {
  if (qbMistakeItem(itemId)) { qbMistakeRemove(itemId); return false; }
  qbMistakeAdd(itemId, 'manual');
  return true;
}

/* 标记 / 取消「已订正」 */
function qbMistakeFix(itemId, fixed) {
  var m = qbReadMistakes();
  if (!m[itemId]) return;
  m[itemId].fixed = !!fixed;
  qbWriteMistakes(m);
}

/* 又错了一次：不在本里就收进来，在就把次数 +1 且退回「待订正」 */
function qbMistakeWrong(itemId) {
  var block = qbBlockOfItem(itemId);
  if (!block) return null;
  var m = qbReadMistakes();
  var now = Date.now();
  if (m[itemId]) {
    m[itemId].wrong += 1;
    m[itemId].lastAt = now;
    m[itemId].fixed = false;
  } else {
    m[itemId] = { itemId: itemId, blockId: block.id, src: 'auto',
                  wrong: 1, addedAt: now, lastAt: now, fixed: false };
  }
  qbWriteMistakes(m);
  return m[itemId];
}

/* 答对了：在本里就顺手标成已订正（订正的判定 = 重做一次答对）
   force=true：已订正的题再做对一次，也把复习时间往后推（错题复习里的终检） */
function qbMistakeRight(itemId, force) {
  var m = qbReadMistakes();
  if (!m[itemId]) return false;
  var changed = !m[itemId].fixed;
  if (changed || force) {
    m[itemId].fixed = true;
    m[itemId].lastAt = Date.now();
    qbWriteMistakes(m);
  }
  return changed;
}

/* 整个题组是否都在错题本里（题组卡头部的按钮状态） */
function qbBlockInMistakes(block) {
  var m = qbReadMistakes();
  return block.items.length > 0 && block.items.every(function (it) { return !!m[it.id]; });
}

/* 展开成可直接渲染的列表：按最近一次错误倒序 */
function qbMistakeList() {
  var m = qbReadMistakes();
  var out = [];
  Object.keys(m).forEach(function (itemId) {
    var e = m[itemId];
    var block = QBANK.filter(function (b) { return b.id === e.blockId; })[0] || qbBlockOfItem(itemId);
    if (!block) return;                                   /* 题被删了就不显示 */
    var item = null;
    block.items.forEach(function (it) { if (it.id === itemId) item = it; });
    if (!item) return;
    out.push({ e: e, block: block, item: item,
               attempt: qbAttemptOf(itemId) });
  });
  out.sort(function (a, b) { return (b.e.lastAt || 0) - (a.e.lastAt || 0); });
  return out;
}

function qbMistakeStats() {
  var m = qbReadMistakes();
  var ids = Object.keys(m);
  var week = Date.now() - 7 * 24 * 3600 * 1000;
  var total = 0, fixed = 0, pending = 0, fresh = 0, subj = {};
  ids.forEach(function (id) {
    var e = m[id];
    var block = QBANK.filter(function (b) { return b.id === e.blockId; })[0];
    if (!block) return;
    total++;
    if (e.fixed) fixed++; else pending++;
    if ((e.addedAt || 0) >= week) fresh++;
    subj[block.subject] = (subj[block.subject] || 0) + 1;
  });
  return { total: total, fixed: fixed, pending: pending, week: fresh, subjects: subj };
}

/* 按题组去重后统计覆盖了几道题（列表里按题组折叠时用） */
function qbMistakeBlocks() {
  var seen = {}, out = [];
  qbMistakeList().forEach(function (r) {
    if (seen[r.block.id]) return;
    seen[r.block.id] = 1;
    out.push(r.block);
  });
  return out;
}

/* ============================================================
   错题复习排程（错题模块自己的节奏，与每日题目互不干扰）
   ------------------------------------------------------------
   每道错题按「错过几次」排下一次复习间隔（艾宾浩斯 1/2/4/7/15/30 天）：
     第 1 次错 → 1 天后复习，第 2 次 → 2 天，第 3 次 → 4 天 …
   重做答对（fixed=true）→ 仍然排程，但间隔直接跳到末档（30 天）做终检。
   到期判定按「自然日」：今天之前（含今天更早时刻）就到期。
   ============================================================ */
var MK_GAP = [1, 2, 4, 7, 15, 30];
var DAY_MS = 24 * 3600 * 1000;

function qbMistakeGap(e) {
  if (e.fixed) return MK_GAP[MK_GAP.length - 1];
  var n = Math.max(1, e.wrong || 1);
  return MK_GAP[Math.min(n - 1, MK_GAP.length - 1)];
}

/* 今天 0 点的时间戳（按本机时区） */
function qbTodayStart(ts) {
  var d = new Date(ts == null ? Date.now() : ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/* 排程信息：{ gap, at, due, days, stage }  stage = 第几次复习 */
function qbMistakeDue(e) {
  var gap  = qbMistakeGap(e);
  var base = e.lastAt || e.addedAt || Date.now();
  var at   = base + gap * DAY_MS;
  var left = at - Date.now();
  return {
    gap:   gap,
    at:    at,
    due:   !e.fixed && left <= 0,
    days:  Math.max(0, Math.ceil(left / DAY_MS)),
    stage: Math.max(1, e.wrong || 1)
  };
}

/* 复习队列：默认「到期待订正」→ 不够再补「待订正（提前过）」→ 再补「已订正终检」 */
function qbMistakeQueue(opts) {
  opts = opts || {};
  var limit = opts.limit || 6;
  var all = qbMistakeList();
  var due = [], pending = [], fixed = [];

  all.forEach(function (r) {
    var d = qbMistakeDue(r.e);
    r.due = d;
    if (r.e.fixed) { fixed.push(r); return; }
    if (d.due) due.push(r); else pending.push(r);
  });

  /* 到期组：错得越多越先来；同一档按最早到期 */
  due.sort(function (a, b) { return (b.e.wrong || 0) - (a.e.wrong || 0) || a.due.at - b.due.at; });
  pending.sort(function (a, b) { return (b.e.wrong || 0) - (a.e.wrong || 0) || (a.e.lastAt || 0) - (b.e.lastAt || 0); });
  fixed.sort(function (a, b) { return (a.e.lastAt || 0) - (b.e.lastAt || 0); });

  var scope = opts.scope || 'today';
  var out, reason;

  if (opts.ids && opts.ids.length) {
    var byId = {};
    all.forEach(function (r) { byId[r.e.itemId] = r; });
    out = opts.ids.map(function (id) { return byId[id]; }).filter(Boolean);
    reason = 'picked';
  } else if (scope === 'all') {
    out = due.concat(pending).slice(0, limit);
    reason = 'all';
  } else if (scope === 'fixed') {
    out = fixed.slice(0, limit);
    reason = 'fixed';
  } else {
    out = due.slice(0, limit);
    if (out.length < limit) out = out.concat(pending.slice(0, limit - out.length));
    reason = due.length ? 'due' : (out.length ? 'early' : 'none');
  }

  return {
    list: out,
    total: all.length,
    dueN: due.length,
    pendingN: pending.length,
    fixedN: fixed.length,
    reason: reason        /* due 到期 / early 没有到期的先提前过 / all / fixed / none */
  };
}

/* 原型演示：塞几道错题进来（已存在的 id 不动），lastAt 往前推 → 能立刻看到「到期」 */
function qbMistakeSeedDemo() {
  var seeds = [
    { id: 'q1-1', wrong: 3, days: 4.2 },
    { id: 'q2-1', wrong: 1, days: 1.3 },
    { id: 'q3-1', wrong: 2, days: 2.4 },
    { id: 'q7-1', wrong: 1, days: 1.1 },
    { id: 'm1-2', wrong: 2, days: 5.1 },
    { id: 'q4-1', wrong: 1, days: 9, fixed: true }
  ];
  var m = qbReadMistakes();
  var now = Date.now();
  seeds.forEach(function (s) {
    if (!qbBlockOfItem(s.id)) return;
    var e = m[s.id] || (m[s.id] = {
      itemId: s.id, blockId: qbBlockOfItem(s.id).id, src: 'auto',
      wrong: 0, addedAt: now, lastAt: now, fixed: false
    });
    e.wrong  = s.wrong;
    e.fixed  = !!s.fixed;
    e.addedAt = now - (s.days + 1) * DAY_MS;
    e.lastAt  = now - s.days * DAY_MS;
  });
  qbWriteMistakes(m);
  return seeds.length;
}


function qbBlockState(block) {
  var map = qbReadAttempts();
  var done = 0, wrong = 0, got = 0, max = 0;
  block.items.forEach(function (it) {
    var a = map[it.id];
    if (!a) return;
    done++;
    got += (a.score || 0);
    max += (a.max || it.score || 0);
    if (a.ok === false || (a.score || 0) < (a.max || it.score || 0)) wrong++;
  });
  var total = block.items.length;
  return {
    done: done, total: total, wrong: wrong, got: got, max: max,
    state: done === 0 ? 'todo' : (done < total ? 'part' : (wrong ? 'wrong' : 'done'))
  };
}

function qbOverall() {
  var n = QBANK.length, done = 0, solved = 0, wrongBlocks = 0, items = 0, itemsDone = 0;
  QBANK.forEach(function (b) {
    var s = qbBlockState(b);
    items += s.total;
    itemsDone += s.done;
    if (s.state === 'done') { done++; solved++; }
    else if (s.state === 'wrong') { done++; wrongBlocks++; }
    else if (s.state === 'part') done++;
  });
  return { blocks: n, blocksDone: done, solved: solved, wrongBlocks: wrongBlocks,
           items: items, itemsDone: itemsDone };
}

/* ============================================================
   判分引擎（原型在本地跑，正式版在服务端）
   ============================================================ */

/* 归一化：默认去标点、去空白、转小写 */
function qNorm(s, keepPunct) {
  var t = String(s == null ? '' : s).replace(/\u3000/g, ' ');
  if (!keepPunct) {
    t = t.replace(/[，。；：、,.;:!?！？"'“”‘’（）()【】\[\]《》\s]/g, '');
  } else {
    t = t.trim().replace(/\s+/g, ' ');
  }
  return t.toLowerCase();
}

/* 数值等值：20 = 20.0 = 20N = ２0 */
function qNumEq(a, b) {
  var x = parseFloat(String(a).replace(/[^0-9.\-]/g, ''));
  var y = parseFloat(String(b).replace(/[^0-9.\-]/g, ''));
  if (isNaN(x) || isNaN(y)) return false;
  return Math.abs(x - y) < 1e-6;
}

/* 单个空是否算对 */
function qBlankOk(val, blank) {
  var accept = blank.accept || [];
  if (!qNorm(val)) return false;
  for (var i = 0; i < accept.length; i++) {
    if (blank.mode === 'numeric') {
      if (qNumEq(val, accept[i])) return true;
    } else if (blank.mode === 'synonym') {
      var nv = qNorm(val), na = qNorm(accept[i]);
      if (nv && na && (nv === na || nv.indexOf(na) >= 0 || na.indexOf(nv) >= 0)) return true;
    } else {                                   /* strict：严格逐字（古诗文默写） */
      if (qNorm(val) === qNorm(accept[i])) return true;
    }
  }
  return false;
}

/* 选择题：比 option_id，不比位置 */
function qGradeChoice(item, ans) {
  var picked = (ans || []).slice().sort().join(',');
  var right  = (item.answer || []).slice().sort().join(',');
  var ok = !!picked && picked === right;
  return {
    ok: ok, score: ok ? item.score : 0, max: item.score,
    need: item.answer || [], picked: ans || [], blank: item.blank || 0
  };
}

/* 填空题：逐空判定，得分按空均分 */
function qGradeFill(item, ans) {
  ans = ans || {};
  var blanks = item.blanks || [];
  var per = blanks.length ? item.score / blanks.length : item.score;
  var got = 0, marks = [];
  blanks.forEach(function (b) {
    var v = ans[b.n] == null ? '' : ans[b.n];
    var ok = qBlankOk(v, b);
    if (ok) got += per;
    marks.push({ n: b.n, label: b.label || ('空' + b.n), ok: ok, val: v,
                 need: (b.accept || [])[0] || '', tip: b.tip || '' });
  });
  got = Math.round(got * 10) / 10;
  var answered = blanks.some(function (b) { return qNorm(ans[b.n]); });
  return { ok: blanks.length ? marks.every(function (m) { return m.ok; }) : false,
           score: answered ? got : 0, max: item.score, marks: marks, blank: 0,
           answered: answered };
}

/* 简答题：按采分点关键词命中（AI 判分的原型替身） */
function qGradeShort(item, text) {
  var t = qNorm(text);
  var hits = [], miss = [], got = 0, requiredMiss = false;
  (item.rubric || []).forEach(function (r) {
    var hit = !!(t && (r.keys || []).length && (r.keys || []).some(function (k) {
      return t.indexOf(qNorm(k)) >= 0;
    }));
    /* 没有关键词的采分点（如「语言条理清楚」）按是否作答给分，演示用 */
    if (!hit && !(r.keys || []).length) hit = t.length >= 20;
    if (hit) { got += r.score; hits.push(r); }
    else { miss.push(r); if (r.required) requiredMiss = true; }
  });
  var answered = t.length > 0;
  var score = answered ? got : 0;
  if (requiredMiss) score = 0;                       /* 必答点没答出 → 整题 0 分 */
  var max = item.score || (item.rubric || []).reduce(function (a, r) { return a + r.score; }, 0);
  return {
    ok: answered && !requiredMiss && score >= max * 0.6,
    score: score, max: max, hits: hits, miss: miss,
    requiredMiss: requiredMiss, answered: answered,
    words: t.length, blank: 0
  };
}

/* 统一入口 */
function qGrade(item, ans) {
  if (item.type === 'choice') return qGradeChoice(item, ans);
  if (item.type === 'fill_blank') return qGradeFill(item, ans);
  return qGradeShort(item, ans);
}

/* 题组整体判分：ansMap = { itemId: 作答 } */
function qGradeBlock(block, ansMap) {
  var rows = [], got = 0, max = 0, allOk = true;
  block.items.forEach(function (it) {
    var a = ansMap[it.id];
    var filled;
    if (it.type === 'choice') filled = !!(a && a.length);
    else if (it.type === 'fill_blank') filled = !!(a && Object.keys(a).some(function (k) { return qNorm(a[k]); }));
    else filled = !!(a && qNorm(a));
    if (!filled) {
      rows.push({ item: it, res: { ok: false, score: 0, max: it.score, unanswered: true } });
      max += it.score; allOk = false;
      return;
    }
    var res = qGrade(it, a);
    res.unanswered = false;
    rows.push({ item: it, res: res });
    got += res.score; max += res.max;
    if (!res.ok) allOk = false;
  });
  return { rows: rows, got: Math.round(got * 10) / 10, max: max, allOk: allOk };
}

/* 暴露到 window，供 practice.html / answer.html 使用 */
window.QB = {
  bank: QBANK,
  typeInfo: QB_TYPE,
  kind: qbKind,
  typeLabel: qbTypeLabel,
  typeShort: qbTypeShort,
  mix: qbItemMix,
  isInline: qbIsInline,
  find: function (id) {
    for (var i = 0; i < QBANK.length; i++) if (QBANK[i].id === id) return QBANK[i];
    return null;
  },
  indexOf: function (id) {
    for (var i = 0; i < QBANK.length; i++) if (QBANK[i].id === id) return i;
    return -1;
  },
  state: qbBlockState,
  overall: qbOverall,
  attempts: qbReadAttempts,
  attemptOf: qbAttemptOf,
  drafts: qbReadDrafts,
  saveDrafts: qbWriteDrafts,
  save: qbSaveAttempt,
  clearBlock: qbClearBlock,
  grade: qGrade,
  gradeBlock: qGradeBlock,
  norm: qNorm,
  /* 错题本 */
  mistakes: qbReadMistakes,
  mistakeList: qbMistakeList,
  mistakeStats: qbMistakeStats,
  mistakeBlocks: qbMistakeBlocks,
  mistakeOf: qbMistakeItem,
  mistakeAdd: qbMistakeAdd,
  mistakeRemove: qbMistakeRemove,
  mistakeToggle: qbMistakeToggle,
  mistakeFix: qbMistakeFix,
  mistakeWrong: qbMistakeWrong,
  mistakeRight: qbMistakeRight,
  blockInMistakes: qbBlockInMistakes,
  /* 错题复习排程 */
  mistakeGap: qbMistakeGap,
  mistakeDue: qbMistakeDue,
  mistakeQueue: qbMistakeQueue,
  mistakeSeedDemo: qbMistakeSeedDemo,
  todayStart: qbTodayStart
};

/* ESM 桥接：qbank.js 以 IIFE 形式挂在 window.QB */
export const QB = window.QB;
export default QB;
