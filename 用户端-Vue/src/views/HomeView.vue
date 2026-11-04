<script setup>
/* ============================================================
   首页
   ------------------------------------------------------------
   左：发布入口 + 记录流（用户发布在前，演示数据在后）
   右：天气 · 日历 · 每日一句 · 本周打卡
   表情面板全局只有一个，由这一层持有并按按钮位置浮层定位。
   ============================================================ */
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import PostCard from '../components/PostCard.vue';
import VIcon from '../components/VIcon.vue';
import { auth } from '../lib/session.js';
import { stGetJSON, stSetJSON } from '../lib/storage.js';

/* ---------- 演示数据（正式版来自服务端） ---------- */
const DEMO_POSTS = [
  {
    name: '小宇', initial: '宇', time: '今天 18:42', tag: '图文记录',
    title: '一元二次方程终于开窍了',
    html: '<p>今天把配方法彻底弄懂了 🎉 原来核心就一句话：<b>凑完全平方</b>。</p><p>错题本里那 3 道题重做全对，明天让老师再出两道变式试试。</p>',
    imgs: [
      { style: 'background:linear-gradient(135deg,#4A83FF,#7C5CFF)', label: '📷 笔记 P48 · 配方法三步' },
      { style: 'background:linear-gradient(135deg,#17B26A,#0E7A8A)', label: '📷 错题重做 · 全对' }
    ],
    likes: 12,
    cmts: [
      { id: 'c1', name: '妈妈', initial: '妈', time: '今天 19:02', text: '太棒了！晚饭给你加了鸡腿 🍗' },
      { id: 'c2', name: '小航', initial: '航', time: '今天 19:20', text: '学霸带带我，那道变式我也卡了半天' },
      { id: 'c3', name: '小宇', initial: '宇', time: '今天 19:26', text: '周末一起刷，我把笔记拍给你', replyTo: '小航', replyToId: 'c2' }
    ]
  },
  {
    name: '小宇', initial: '宇', time: '昨天 21:05', tag: '笔记',
    title: '',
    html: '<p>《骆驼祥子》第 3 章读完，印象最深的一句：</p><blockquote>“他甚至于一想起车，就想起自己的脸。”</blockquote><p>祥子把车当成脸面，可越是这样，后面丢车的时候才越疼吧。读后感素材 +1。</p>',
    imgs: [],
    likes: 5,
    cmts: [
      { name: '妈妈', initial: '妈', time: '昨天 21:40', text: '这句摘抄得真好，读后感记得用上' }
    ]
  },
  {
    name: '小宇', initial: '宇', time: '10 月 8 日', tag: '随感',
    title: '晚跑 3 公里',
    html: '<p>跑完第三公里的那一刻，一天的烦心事好像都被喘出去了。明天继续。</p>',
    imgs: [
      { style: 'background:linear-gradient(135deg,#E08A00,#D92D20)', label: '📷 操场 · 晚上 9 点' }
    ],
    likes: 8, cmts: []
  },
  {
    name: '小宇', initial: '宇', time: '10 月 6 日', tag: '图文记录',
    title: '《昆虫记》观察日记 · 九连拍',
    html: '<p>阳台上的甲虫标本观察满两周了，从卵到幼虫再到成虫，全程记录 📸</p><p>法布尔说得对：耐心是观察者最好的工具。</p>',
    imgs: [
      { style: 'background:linear-gradient(135deg,#4A83FF,#7C5CFF)', label: '📷 Day1 · 卵' },
      { style: 'background:linear-gradient(135deg,#17B26A,#0E7A8A)', label: '📷 Day3 · 卵' },
      { style: 'background:linear-gradient(135deg,#E08A00,#D92D20)', label: '📷 Day5 · 破卵' },
      { style: 'background:linear-gradient(135deg,#9333EA,#DB2777)', label: '📷 Day7 · 幼虫' },
      { style: 'background:linear-gradient(135deg,#0EA5E9,#2563EB)', label: '📷 Day9 · 幼虫' },
      { style: 'background:linear-gradient(135deg,#F59E0B,#EF4444)', label: '📷 Day11 · 蜕皮' },
      { style: 'background:linear-gradient(135deg,#10B981,#059669)', label: '📷 Day13 · 蛹' },
      { style: 'background:linear-gradient(135deg,#6366F1,#8B5CF6)', label: '📷 Day14 · 羽化' },
      { style: 'background:linear-gradient(135deg,#EC4899,#8B5CF6)', label: '📷 成虫 · 全家福' }
    ],
    likes: 21, cmts: []
  }
];

/* ---------- 记录流 ---------- */
const feedBump = ref(0);

function loadUserPosts() {
  const list = stGetJSON('xj-feed', []) || [];
  return list.map((p) => ({ ...p, mine: true }));
}

const userPosts = computed(() => { feedBump.value; return loadUserPosts(); });
const me = computed(() => auth.user || { name: '小宇', initial: '宇' });

/* 自己发的帖子：评论落盘 */
function persistComment(pid, c) {
  const list = stGetJSON('xj-feed', []) || [];
  const i = list.findIndex((p) => String(p.id) === String(pid));
  if (i < 0) return;
  if (!list[i].cmts) list[i].cmts = [];
  list[i].cmts.push(c);
  stSetJSON('xj-feed', list);
  feedBump.value++;
}

/* ---------- 日历 ---------- */
const now = new Date();
const calYear = now.getFullYear();
const calMonth = now.getMonth();
const calTitle = (calMonth + 1) + ' 月';

const calCells = computed(() => {
  const first = new Date(calYear, calMonth, 1);
  const start = (first.getDay() + 6) % 7;          /* 周一开头 */
  const days = new Date(calYear, calMonth + 1, 0).getDate();

  const marks = { 3: 1, 7: 1, 8: 1, 9: 1, 14: 1, 15: 1, 17: 1, 21: 1, 22: 1, 24: 1 };
  loadUserPosts().forEach((p) => {
    const d = new Date(p.ts);
    if (d.getFullYear() === calYear && d.getMonth() === calMonth) marks[d.getDate()] = 1;
  });

  const cells = [];
  for (let i = 0; i < start; i++) cells.push({ blank: true, key: 'b' + i });
  for (let d = 1; d <= days; d++) {
    cells.push({ d, today: d === now.getDate(), mark: !!marks[d], key: 'd' + d });
  }
  return cells;
});

const markCount = computed(() => calCells.value.filter((c) => c.mark).length);

/* ---------- 每日一句 ---------- */
const QUOTES = [
  ['种一棵树最好的时间是十年前，其次是现在。', '谚语'],
  ['我走得很慢，但我从不后退。', '林肯'],
  ['星光不问赶路人，时光不负有心人。', '大冰'],
  ['每一个不曾起舞的日子，都是对生命的辜负。', '尼采'],
  ['不要等待机会，而要创造机会。', '培根'],
  ['所谓努力，就是把不可能变成可能的过程。', '学迹']
];
const qIdx = ref(new Date().getDate() % QUOTES.length);
const quote = computed(() => QUOTES[qIdx.value]);

/* ---------- 评论表情面板（全局一个） ---------- */
const popEl = ref(null);
const popOpen = ref(false);
const popStyle = ref({});
let popBtn = null;
let popInput = null;

function placePop() {
  if (!popBtn || !popEl.value || !popOpen.value) return;
  const r = popBtn.getBoundingClientRect();
  const pw = popEl.value.offsetWidth || 252;
  const ph = popEl.value.offsetHeight || 190;
  const left = Math.min(Math.max(8, r.left), Math.max(8, window.innerWidth - pw - 8));
  let top = r.top - ph - 8;
  if (top < 8) top = Math.min(r.bottom + 8, window.innerHeight - ph - 8);
  popStyle.value = { left: Math.round(left) + 'px', top: Math.round(Math.max(8, top)) + 'px' };
}

async function openEmoji({ btn, input }) {
  /* 同一个按钮连点两次 = 收起 */
  if (popOpen.value && popBtn === btn) { closeEmoji(); return; }
  popBtn = btn;
  popInput = input;
  popOpen.value = true;
  await nextTick();
  if (popEl.value && window.EMOJI && !popEl.value.dataset.ready) {
    window.EMOJI.render(popEl.value, { def: '笑脸' });
    popEl.value.dataset.ready = '1';
  }
  placePop();
}

function closeEmoji() {
  popOpen.value = false;
  popBtn = null;
  popInput = null;
}

function onPopClick(e) {
  const cell = e.target.closest('.emoji-cell');
  if (!cell || !popInput) return;
  const em = cell.textContent;
  const inp = popInput;
  if (inp.value.length + em.length > 200) return;
  let s = inp.selectionStart;
  let t = inp.selectionEnd;
  if (s == null || t == null) { s = t = inp.value.length; }
  inp.value = inp.value.slice(0, s) + em + inp.value.slice(t);
  const pos = s + em.length;
  inp.focus();
  try { inp.setSelectionRange(pos, pos); } catch (err) { /* noop */ }
}

function onDocClick(e) {
  if (!popOpen.value) return;
  if (popEl.value && popEl.value.contains(e.target)) return;
  if (popBtn && popBtn.contains(e.target)) return;
  closeEmoji();
}
function onKey(e) { if (e.key === 'Escape') closeEmoji(); }
function onScroll() { if (popOpen.value) placePop(); }

onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
  window.addEventListener('scroll', onScroll, true);
  window.addEventListener('resize', placePop);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKey);
  window.removeEventListener('scroll', onScroll, true);
  window.removeEventListener('resize', placePop);
});
</script>

<template>
  <div class="home-grid">
    <!-- ============ 左：发布入口 + 图文记录流 ============ -->
    <div class="home-feed">
      <RouterLink class="composer-entry reveal" :to="{ name: 'post' }">
        <span class="avatar">{{ me.initial || '学' }}</span>
        <span class="ce-fake">记一段感想、发几张照片、写条笔记……</span>
        <span class="ce-act" title="发图文">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 5v14" /><path d="M5 12h14" />
          </svg>
        </span>
      </RouterLink>

      <section class="section reveal" style="margin-top:16px">
        <h2 class="section-title">我的记录 <span class="count">· 图片、感想与笔记</span></h2>
        <div class="feed">
          <PostCard v-for="(p, i) in userPosts" :key="p.id || ('up' + i)"
                    :post="p" :seed="p.id || 'up'" @open-emoji="openEmoji" @persist-comment="persistComment" />
          <PostCard v-for="(p, i) in DEMO_POSTS" :key="'demo' + i"
                    :post="p" :seed="'demo' + i" @open-emoji="openEmoji" />
        </div>
      </section>
    </div>

    <!-- ============ 右：信息栏 ============ -->
    <aside class="home-side">
      <div class="side-card reveal">
        <p class="side-title">今天 · 你所在的城市</p>
        <div class="wx-now">
          <span class="wx-ico">⛅</span>
          <div>
            <p class="wx-temp">14<i>°C</i></p>
            <p class="wx-desc">多云 · 17° / 9° · 空气优</p>
          </div>
        </div>
        <div class="wx-forecast">
          <span class="wx-f"><span class="d">周日</span><span class="e">☀️</span><span>16°/8°</span></span>
          <span class="wx-f"><span class="d">周一</span><span class="e">🌧️</span><span>13°/10°</span></span>
          <span class="wx-f"><span class="d">周二</span><span class="e">☁️</span><span>12°/8°</span></span>
          <span class="wx-f"><span class="d">周三</span><span class="e">☀️</span><span>15°/7°</span></span>
        </div>
      </div>

      <div class="side-card reveal">
        <div class="cal-head">
          <b>{{ calTitle }}</b>
          <span>{{ calYear }}</span>
        </div>
        <div class="cal-grid">
          <span v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w" class="cal-wd">{{ w }}</span>
          <span v-for="c in calCells" :key="c.key"
                class="cal-day" :class="{ today: c.today, 'has-dot': c.mark }">
            {{ c.blank ? '' : c.d }}<i v-if="c.mark"></i>
          </span>
        </div>
        <p class="cal-note"><b>●</b> 有记录的日子 · 本月已记 <b>{{ markCount }}</b> 天</p>
      </div>

      <div class="side-card quote-card reveal">
        <p class="side-title">每日一句
          <button class="quote-refresh" type="button" @click="qIdx = (qIdx + 1) % QUOTES.length">换一句</button>
        </p>
        <p class="quote-text">{{ quote[0] }}</p>
        <p class="quote-author">—— {{ quote[1] }}</p>
      </div>

      <div class="side-card reveal">
        <p class="side-title">本周打卡 <span style="font-weight:400;color:var(--text-3)">6 / 7 天</span></p>
        <div class="week-strip">
          <span class="week-day done"><i>✓</i>一</span>
          <span class="week-day done"><i>✓</i>二</span>
          <span class="week-day done"><i>✓</i>三</span>
          <span class="week-day done"><i>✓</i>四</span>
          <span class="week-day done"><i>✓</i>五</span>
          <span class="week-day done"><i>✓</i>六</span>
          <span class="week-day today"><i>…</i>日</span>
        </div>
      </div>
    </aside>
  </div>

  <!-- 评论表情面板：全局共用一个，浮在按钮上方 -->
  <div class="emoji-panel cmt-emoji-pop" ref="popEl" v-show="popOpen"
       :style="popStyle" @click="onPopClick"></div>
</template>
