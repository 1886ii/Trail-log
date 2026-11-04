/* ============================================================
   作文模块数据层
   ------------------------------------------------------------
   · ESSAY_TASKS   列表页的任务卡（管理端下发）
   · ESSAY_DETAIL  写作页的题目原文 / 要求 / 引导（按 id）
   · WORKS         优秀作文库（管理端审核通过后收录）
   · ESSAY_RESULT  AI 初评 + 老师终评的演示数据
   正式版：全部来自 GET /api/essay-tasks 与 /api/works
   ============================================================ */

/* 列表页任务卡：step = 1 写作 / 2 AI 评阅 / 3 人工审核 / 4 展示结果 */
export const ESSAY_TASKS = [
  {
    id: 't1', title: 'My Weekend', subject: '英语', genre: '记叙文',
    meta: '80 词左右 · 建议 30 分钟 · 主要用一般过去时',
    due: '周五 20:00 前提交',
    step: 1, state: 'todo'
  },
  {
    id: 't2', title: '那一次，我读懂了坚持', subject: '语文', genre: '记叙文',
    meta: '不少于 600 字 · 建议 45 分钟 · 写一件真实经历，要有细节',
    due: '今天 09:12 提交 · 等待老师审核',
    step: 3, score: 85, state: 'audit'
  },
  {
    id: 't3', title: '我的家乡', subject: '语文', genre: '说明文',
    meta: '500 字左右 · 建议 40 分钟 · 至少用两种说明方法',
    due: '10 月 3 日 · 已通过审核',
    step: 4, score: 82, state: 'done'
  }
];

export const STEP_NAMES = ['写作', 'AI 评阅', '人工审核', '展示结果'];

/* 写作页详情 */
export const ESSAY_DETAIL = {
  t1: {
    title: 'My Weekend', subject: '英语', genre: '记叙文', unit: '词', need: 80,
    prompt: {
      lead: '假如你是李华，你的英国朋友 Peter 想了解你的周末生活。请你给他写一封邮件，介绍你上个周末的活动。',
      pointsTitle: '内容包括：',
      points: ['你去了哪里，做了什么', '和谁一起去的', '你的感受'],
      notes: '词数 80 左右；可以适当增加细节，使行文连贯；邮件的开头和结尾已给出，不计入总词数。'
    },
    req: { words: '80 词左右', minutes: '建议 30 分钟', focus: '主要用一般过去时' },
    due: { state: 'open', label: '周五 20:00 前提交', note: '还剩 2 天 6 小时' },
    guide: [
      ['开头交代什么', '你的周末是「忙碌型」还是「放松型」，用一句话点出来'],
      ['中间写两件事，选哪两件', '提示：一件和家人的，一件和你自己的爱好有关的'],
      ['结尾用不用「感觉」类句式', '建议句：What a wonderful weekend I had!']
    ],
    start: 'write'
  },
  t2: {
    title: '那一次，我读懂了坚持', subject: '语文', genre: '记叙文', unit: '字', need: 600,
    prompt: {
      lead: '请以「那一次，我读懂了坚持」为题，写一篇记叙文。想一想：有没有这样一件事，你本来已经想放弃，最后却坚持了下来？把它写出来。',
      pointsTitle: '写作提示：',
      points: [
        '写一件你亲身经历的事，真实为上',
        '要有具体的细节和画面，让读者看得见',
        '写出心理变化：从「想放弃」到「坚持下来」'
      ],
      notes: '不少于 600 字；文中不得出现真实的人名、校名；不要写成议论文。'
    },
    req: { words: '不少于 600 字', minutes: '建议 45 分钟', focus: '写一件真实经历，要有细节' },
    due: { state: 'submitted', label: '今天 09:12 已提交', note: '等待老师审核' },
    guide: [
      ['选事：写哪一次', '选一件你真的想放弃、但坚持下来的事，越小越好写'],
      ['细节：写三个画面', '一个动作、一个声音、一个感受，让读者看得见'],
      ['转折：心理怎么变', '中间要有一处「我本来想放弃」的心理描写'],
      ['结尾：不要喊口号', '把道理藏在最后一句话里，别写「我懂得了坚持」']
    ],
    start: 'result', audit: 'wait'
  },
  t3: {
    title: '我的家乡', subject: '语文', genre: '说明文', unit: '字', need: 500,
    prompt: {
      lead: '每个人心里都有一个家乡。请你选择家乡的一个对象，写一篇说明文，把它介绍给没去过的人。',
      pointsTitle: '写作提示：',
      points: [
        '选一个具体的对象：一条街、一座桥、一种吃食……',
        '至少用两种说明方法，用透而不是堆砌',
        '开头可以用一个观察或疑问，不要直接下定义'
      ],
      notes: '500 字左右；说明方法要自然融入；不得抄袭。'
    },
    req: { words: '500 字左右', minutes: '建议 40 分钟', focus: '至少用两种说明方法' },
    due: { state: 'done', label: '10 月 3 日 已通过审核', note: '得分 82 分' },
    guide: [
      ['先定对象', '写家乡的什么：一条街、一座桥、一种吃食'],
      ['说明方法别堆砌', '列数字、打比方选两种用透，比全用一遍好'],
      ['让人有兴趣读', '开头可以用一个观察或疑问，不要直接下定义']
    ],
    start: 'result', audit: 'ok'
  }
};

/* ---------- 优秀作文：excerpt 卡片节选；full 全文分段（**…** 为亮点句） ---------- */
export const WORKS = [
  {
    id: 'w1', title: '那束光', cat: '记叙文', by: '初三(3)班 · 安静', time: '本周',
    score: 96,
    excerpt: '那天晚自习后，走廊的灯坏了一盏，只剩尽头的应急灯亮着。我扶着栏杆往下走，听见身后有人喊我的名字——是宿管阿姨，她举着手电，光柱一直送到楼梯口。后来我才知道，她每晚都在那个位置等最后一个学生走完。',
    note: '以「光」贯穿全篇，细节真实、情绪克制，结尾点睛不喊口号。',
    full: [
      '晚自习结束的铃声响过之后，教学楼会有一段奇特的安静——像有人把音量键一把拧到了底。那天我收拾书包磨蹭到最后一个，走廊的灯已经灭了一半，只剩尽头那盏应急灯，绿幽幽地亮着。',
      '我扶着栏杆往下走，脚步声被楼道的空旷吞掉。走到三楼拐角时，身后忽然有人喊我的名字。那声音不大，甚至有点哑，但在那么静的地方，像有人在我背上轻轻拍了一下。',
      '是宿管阿姨。她站在楼梯口，手里举着一只手电，光柱从高处斜斜地落下来，正好铺在我脚下那几级台阶上。她没往前走，只是把光一直往我这边送，像钓鱼的人耐心地垂着线。**「慢慢走，别摸黑。」**',
      '我有点不好意思，加快了脚步。光一路跟着我，等我踩到一楼大厅的方砖上，她才把手电收回去，转身往宿舍楼走。我回头看了一眼，她的背有点驼，手里的手电还亮着，一晃一晃。',
      '后来我才知道，她每晚都在那个位置等最后一个学生走完。不止是我，还有周四留值日的、周三被叫去补作业的、周二和我一样爱磨蹭的。她记得每个人的名字，也知道谁走得最晚。',
      '我至今记得那束光的温度——它并不亮，甚至照不清她的脸。但走廊再黑的时候，我总觉得自己脚下有几级台阶是亮的。**原来有些光不是为了照亮一整条路，它只需要照亮你迈出去的下一个地方。**'
    ]
  },
  {
    id: 'w2', title: 'My Favourite Season', cat: '英语', lang: 'en', by: '初三(1)班 · 陈屿', time: '上周',
    score: 94,
    excerpt: 'Autumn is my favourite season, not because of the cool weather, but because of the smell. When the wind blows through the ginkgo trees on my way to school, I always slow down and take a deep breath — it smells like the beginning of something.',
    note: '句式有变化，用感官细节代替套话；「the beginning of something」收得漂亮。',
    full: [
      'Autumn is my favourite season, not because of the cool weather, but because of the smell.',
      'On my way to school there is a short street lined with ginkgo trees. In the middle of October they turn the colour of egg yolk, and the fallen leaves lie on the ground like small fans that somebody forgot to close.',
      '**When the wind blows through them, I always slow down and take a deep breath — it smells like the beginning of something.**',
      'Autumn is also the season of new notebooks. Every September I choose a fresh exercise book, write my name on the first line, and promise myself to keep it neat. By November the promise is usually broken, but making it still feels good.',
      'Winter will come, and then spring. But for a few weeks each year, the air on that street smells like a promise — **and I like who I am in it.**'
    ]
  },
  {
    id: 'w3', title: '一座桥的自述', cat: '说明文', by: '初三(2)班 · 林一舟', time: '上周',
    score: 92,
    excerpt: '我是一座石拱桥，今年一百二十七岁。我的脊背被车轮磨出了浅槽，槽里积过雨水、落过桂花瓣，也承过挑担人的脚步。人们总在桥上匆匆走过，很少有人停下来看看那些被磨圆的棱角——那是我最诚实的地方。',
    note: '用第一人称自述降低说明文的说教感，列数字与摹状貌结合得自然。',
    full: [
      '我是一座石拱桥，今年一百二十七岁。',
      '我的结构很朴素：一个半圆的拱，两块厚实的桥台，桥面铺着三十六级青石台阶。拱券由一百二十七块条石砌成，每块重约两百斤，石缝里灌的是石灰浆掺糯米汁。这套配方在今天看来笨拙，却让我在七次大水里一次也没塌。',
      '**我的脊背被车轮磨出了浅槽，最深处约三厘米，槽里积过雨水、落过桂花瓣，也承过挑担人的脚步。**人们总在桥上匆匆走过，很少有人停下来看看那些被磨圆的棱角——那是我最诚实的地方。',
      '说桥，还得说说看不见的部分。水下有一层分水尖，用整块石头削成三角形，像鱼的脊背，能把洪水劈成两股，减少对桥墩的正面冲击。这些东西没人看得见，但少了它，我活不到今天。',
      '如果要打比方，我更像个慢性子的人：不着急长高，也不着急变新。我身上最老的一块石头来自一百二十七年前，最新的一块是去年换的护栏——它们在同一座桥上，一起承担着每天上千次的脚步。',
      '现在桥上装了路灯，夜里亮起来，像给我戴了顶帽子。我还是老样子：**能站一天，就为过桥的人站一天。**'
    ]
  },
  {
    id: 'w4', title: '慢慢来，比较快', cat: '议论文', by: '初三(5)班 · 周叙', time: '9 月',
    score: 93,
    excerpt: '我们习惯了把「快」等同于「好」。可真正把一件事做透的人，往往都慢：他们愿意在一道错题上停 20 分钟，愿意把一篇课文读上七遍。慢不是效率的敌人，浅才是。',
    note: '论点集中、不并列铺开；用「慢不是效率的敌人，浅才是」做转折句，力度足。',
    full: [
      '我们习惯了把「快」等同于「好」：作业要快，刷题要快，连背单词都想着三天记完一本。可真正把一件事做透的人，往往都慢。',
      '慢，是因为他们在做「有摩擦」的工作。一道错题停二十分钟，不是磨蹭，是在找错因；一篇课文读七遍，不是笨，是在让语言长出回声。',
      '我见过一个数学很好的同学，他的错题本一年只写满两本，但每道题旁边都留着三种解法。他说，把一道题拆三次，比刷三十道题更赚。一个学期下来，他的分数涨得并不快，却没有掉过。',
      '有人会说，考试不等人。这话没错。但「快」有两种：一种是手快，一种是心里有底。心里有底的人，看起来慢，上了考场反而不必回头检查。',
      '**慢不是效率的敌人，浅才是。**真正拉开差距的，从来不是谁走得急，而是谁在走过的路上留下了脚印。'
    ]
  }
];

export const WORK_CATS = ['all', '记叙文', '说明文', '议论文', '英语'];

export function lenText(w) {
  const t = w.full.join('').replace(/\*\*/g, '');
  if (w.lang === 'en') return t.split(/\s+/).filter(Boolean).length + ' 词';
  return t.replace(/\s/g, '').length + ' 字';
}

/* 段落里的 **…** → 高亮；其余转义 */
export function paraHTML(s) {
  const esc = String(s).replace(/[&<>"]/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
  ));
  return '<p class="rd-p">' + esc.replace(/\*\*(.+?)\*\*/g, '<mark>$1</mark>') + '</p>';
}

/* ---------- 评阅结果演示数据（正式版来自大模型 / 教师审核接口） ---------- */
export const ESSAY_RESULT = {
  text: [
    '记得那是去年冬天，学校要办长跑比赛。我第一个报了名，却在第一次训练时就想放弃。那天跑完两圈，我的腿像灌了铅，嗓子冒着火气，坐在跑道边半天说不出话。妈妈知道后没有劝我，只是把闹钟调早了半小时。',
    '后来的二十天，我每天天不亮就出门。清晨的路灯还亮着，呼出的白气一团一团，我开始数着路边梧桐树往学校跑。有一次下雪，我在结冰的拐角摔了一跤，膝盖破了皮，爬起来的时候眼泪掉在雪地上。可我还是跑完了那三圈。',
    '比赛那天，我没有拿到名次。冲过终点线的时候，我却笑了——因为我终于把「放弃」这两个字，从自己的字典里划掉了。'
  ],
  marks: [
    { p: 0, q: '嗓子冒着火气', fix: '喉咙像被砂纸磨过一样' },
    { p: 1, q: '可我还是跑完了那三圈', fix: '可我还是咬牙跑完了最后半圈' }
  ],
  annots: [
    { orig: '嗓子冒着火气', why: '表述偏口语，和前句「腿像灌了铅」的比喻不搭', fix: '喉咙像被砂纸磨过一样' },
    { orig: '可我还是跑完了那三圈', why: '与上句「摔了一跤」之间有跳跃，缺一句心理变化', fix: '可我还是咬牙跑完了最后半圈，心里憋着一股劲' }
  ],
  ai: {
    score: 85,
    items: [
      { name: '内容与立意（30）', val: 28, pct: 93 },
      { name: '结构与层次（25）', val: 21, pct: 84 },
      { name: '语言表达（30）', val: 26, pct: 87 },
      { name: '标点与规范（15）', val: 10, pct: 67 }
    ],
    line: '选材真实、有画面感，是一篇有「自己的事」的记叙文',
    sub: '主要丢分点：第二段的心理变化缺一句过渡，标点有两处误用（逗号连接了两个完整句）',
    chips: ['比喻贴切', '细节真实', '需补心理描写'],
    good: '「膝盖破了皮，爬起来的时候眼泪掉在雪地上」把坚持写得很具体；结尾用「字典」作比，收得住，不喊口号。',
    improve: '第二段摔跤之后，补一句当时的心理（想放弃 / 为什么没放弃）；「嗓子冒着火气」换成比喻，和前后句式统一。'
  },
  final: {
    score: 88,
    items: [
      { name: '内容与立意（30）', val: 29, pct: 97 },
      { name: '结构与层次（25）', val: 22, pct: 88 },
      { name: '语言表达（30）', val: 26, pct: 87 },
      { name: '标点与规范（15）', val: 11, pct: 73 }
    ],
    line: '老师已审核 · 立意与细节优于班级平均，建议作为本节课范文片段',
    sub: '老师在 AI 初评（85 分）基础上，内容项 +1、结构项 +1、标点项 +1 —— 选材的价值 AI 容易低估',
    chips: ['已收录成长记录', '可作范文片段'],
    reviewer: '张老师',
    reviewAt: '10 月 10 日 10:20',
    comment: '细节写得实，「字典」这个比喻留着，很好。第二段的心理变化补一句就完整了 —— 你原稿里有这个感受，只是没写出来。'
  }
};
