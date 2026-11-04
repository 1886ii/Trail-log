<script setup>
/* ============================================================
   我的记录 = 时光隧道（3D 照片隧道）+ 类型筛选列表
   ------------------------------------------------------------
   数据源与首页共用 localStorage['xj-feed']，改可见范围时
   列表 / 回看弹层 / 隧道共用同一批对象引用，三处同时生效。
   ============================================================ */
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  TAGS, VIS, visMeta, visOf, loadPosts, savePosts, seedDemoPosts,
  htmlToText, imgCount, firstImg, pidOf
} from '../lib/posts.js';
import { createTunnel } from '../lib/tunnel.js';

const route = useRoute();
const router = useRouter();

const posts = ref([]);
const filter = ref('全部');
const canvasEl = ref(null);
const wrapEl = ref(null);
const barEl = ref(null);
const posEl = ref(null);

const modal = ref(null);        /* { card } */
const visSheet = ref(null);     /* { pid, title, cur } */
const delSheet = ref(null);     /* { pid, title } 删除确认 */

let tun = null;

/* ---------- 派生 ---------- */
const shown = computed(() => (filter.value === '全部'
  ? posts.value
  : posts.value.filter((p) => (p.tag || '图文记录') === filter.value)));

const countText = computed(() => (
  '· 共 ' + posts.value.length + ' 条' +
  (filter.value === '全部' ? '' : ' · ' + filter.value + ' ' + shown.value.length + ' 条')
));

const stats = computed(() => {
  let words = 0, imgs = 0, likes = 0;
  posts.value.forEach((p) => {
    words += htmlToText(p.html).length;
    imgs += imgCount(p);
    likes += p.likes || 0;
  });
  return [
    { n: posts.value.length, label: '条记录' },
    { n: words, label: '写的字' },
    { n: imgs, label: '张图片' },
    { n: likes, label: '次被点赞' }
  ];
});

function snipOf(p) {
  const t = htmlToText(p.html);
  if (t) return { text: t, only: false };
  if (imgCount(p)) return { text: '📷 图片记录', only: true };
  return null;
}

/* ---------- 可见范围 ---------- */
function openVis(pid, e) {
  if (e) e.stopPropagation();
  const p = posts.value.find((x, i) => pidOf(x, i) === String(pid));
  if (!p) return;
  visSheet.value = {
    pid: String(pid),
    title: p.title || htmlToText(p.html).slice(0, 14) || '这条记录',
    cur: visOf(p)
  };
}
function pickVis(v) {
  const s = visSheet.value;
  if (!s) return;
  const p = posts.value.find((x, i) => pidOf(x, i) === String(s.pid));
  if (p && visOf(p) !== v) {
    p.vis = v;
    const ok = savePosts(posts.value);
    if (!ok) alert('保存失败：本地存储空间不足');
    /* 触发一次重算，让列表 chip 跟着变 */
    posts.value = posts.value.slice();
    if (modal.value) modal.value = { card: { ...modal.value.card } };
  }
  visSheet.value = null;
}

/* ---------- 回看 ---------- */
function openModal(card) {
  modal.value = { card };
  document.body.classList.add('no-scroll');
}
function closeModal() {
  modal.value = null;
  document.body.classList.remove('no-scroll');
}
function onKey(e) {
  if (e.key !== 'Escape') return;
  if (delSheet.value) { delSheet.value = null; return; }
  if (visSheet.value) { visSheet.value = null; return; }
  if (modal.value) closeModal();
}

/* ---------- 编辑 / 删除 ---------- */
function goEdit(pid) {
  router.push({ name: 'post', query: { edit: pid } });
}
function askDel(pid, e) {
  if (e) e.stopPropagation();
  const p = posts.value.find((x, i) => pidOf(x, i) === String(pid));
  if (!p) return;
  delSheet.value = {
    pid: String(pid),
    title: p.title || htmlToText(p.html).slice(0, 14) || (imgCount(p) ? '图片记录' : '这条记录')
  };
}
function confirmDel() {
  const s = delSheet.value;
  if (!s) return;
  const left = posts.value.filter((x, i) => pidOf(x, i) !== s.pid);
  savePosts(left);
  posts.value = left;
  delSheet.value = null;
  /* 隧道与列表共用这批对象引用，删除后重建隧道（灯数量/进度随之更新） */
  mountTunnel();
}

const modalSnip = computed(() => {
  const t = (modal.value && modal.value.card.text) || '';
  return t ? (t.length > 120 ? t.slice(0, 120) + '…' : t) : '';
});

/* ---------- 初始化 ---------- */
function goLatest() {
  if (window.__tun && window.__tun.go) window.__tun.go(0);
}

function mountTunnel() {
  if (tun) { tun.destroy(); tun = null; }
  /* 全部删光时没有画布可挂，直接退出（列表空态接管展示） */
  if (!posts.value.length || !canvasEl.value) return;
  tun = createTunnel({
    canvas: canvasEl.value,
    wrap: wrapEl.value,
    bar: barEl.value,
    posEl: posEl.value,
    latestBtn: null,
    posts: posts.value,
    snapMode: 'snap' in route.query,
    deepMode: 'deep' in route.query,
    firstImg, imgCount, htmlToText, pidOf,
    onOpen: openModal
  });
}

onMounted(async () => {
  let list = loadPosts();
  if ('demo' in route.query && !list.length) {
    savePosts(seedDemoPosts());
    list = loadPosts();
    /* 与旧版一致：演示数据就绪后带 ?snap 重进，隧道直接停在最新（跳过开场穿梭） */
    router.replace({ query: { ...route.query, snap: '' } });
  }
  posts.value = list;
  document.addEventListener('keydown', onKey);
  await nextTick();
  mountTunnel();
});

onBeforeUnmount(() => {
  if (tun) tun.destroy();
  document.removeEventListener('keydown', onKey);
  document.body.classList.remove('no-scroll');
});
</script>

<template>
  <div>
    <!-- 时光隧道 -->
    <section v-if="posts.length" class="section reveal">
      <div ref="wrapEl" class="sky-panel">
        <div class="sky-canvas-wrap">
          <!-- id="tun-cv" 不能省：global.css 的画布尺寸（height:560px/移动端470px）挂在 #tun-cv 上 -->
          <canvas id="tun-cv" ref="canvasEl"></canvas>
        </div>
        <div class="sky-head">
          <span class="sky-title">✦ 我的时光隧道</span>
          <span class="sky-legend">
            <span><i style="background:#6C8DFF"></i>图文</span>
            <span><i style="background:#3DD68C"></i>笔记</span>
            <span><i style="background:#FFB65C"></i>随感</span>
          </span>
        </div>
        <div class="tun-progress"><div ref="barEl" class="tun-bar"></div></div>
        <div ref="posEl" class="tun-pos"></div>
        <button class="sky-reset" type="button" title="回到最新一条" @click="goLatest">⤓ 最新</button>
      </div>

      <div class="mp-stats-row">
        <div v-for="s in stats" :key="s.label" class="mp-stat">
          <b>{{ s.n }}</b><span>{{ s.label }}</span>
        </div>
      </div>
    </section>

    <!-- 记录列表 -->
    <section class="section reveal">
      <div class="mp-list-head">
        <h2 class="section-title">全部记录 <span class="count">{{ countText }}</span></h2>
        <div class="tag-opts mp-tabs">
          <button v-for="t in TAGS" :key="t" class="tag-opt" :class="{ active: filter === t }"
                  type="button" @click="filter = t">{{ t }}</button>
        </div>
      </div>

      <div v-if="shown.length" class="mp-list2">
        <article v-for="(p, i) in shown" :key="pidOf(p, i)" class="post mp-card"
                 title="去首页查看完整记录" @click="router.push({ name: 'home' })">
          <div class="mp-meta">
            <span class="chip brand">{{ p.tag || '图文记录' }}</span>
            <span>{{ p.time || '' }}</span>
            <button class="vis-chip" :class="visMeta(visOf(p)).cls" type="button"
                    title="点击修改可见范围" @click="openVis(pidOf(p, i), $event)">
              <span class="vis-chip-i">{{ visMeta(visOf(p)).ico }}</span>{{ visMeta(visOf(p)).v }}
            </button>
            <span class="mp-acts">
              <button class="mp-act" type="button" title="修改这条记录"
                      @click.stop="goEdit(pidOf(p, i))">✎ 编辑</button>
              <button class="mp-act danger" type="button" title="删除这条记录"
                      @click.stop="askDel(pidOf(p, i), $event)">🗑 删除</button>
            </span>
          </div>
          <p v-if="p.title" class="post-title-line">{{ p.title }}</p>
          <p v-if="snipOf(p)" class="mp-snip" :class="{ 'mp-snip-onlyimg': snipOf(p).only }">{{ snipOf(p).text }}</p>
          <div class="mp-stats">
            <span>♥ {{ p.likes || 0 }}</span>
            <span>💬 {{ (p.cmts && p.cmts.length) || 0 }}</span>
            <span v-if="imgCount(p)">📷 {{ imgCount(p) }} 图</span>
          </div>
        </article>
      </div>

      <div v-else-if="posts.length" class="panel mp-empty">
        <p class="mp-empty-title">这个类型下还没有记录</p>
        <p class="mp-empty-sub">换个类型看看，或去发布一条新的。</p>
      </div>

      <div v-if="!posts.length" class="panel mp-empty">
        <p class="mp-empty-title">隧道还没有灯</p>
        <p class="mp-empty-sub">发布第一条记录，点亮时光隧道的起点。</p>
        <RouterLink class="btn-brand" :to="{ name: 'post' }">去发布一条</RouterLink>
      </div>
    </section>

    <!-- 照片回看 -->
    <Teleport to="body">
      <div v-if="modal" class="tun-modal" @click.self="closeModal">
        <div class="tun-mcard">
          <button class="tun-mclose" type="button" title="关闭" @click="closeModal">✕</button>
          <div class="tun-mimg">
            <img v-if="modal.card.photo && modal.card.img !== null" :src="modal.card.photo" alt="">
          </div>
          <div class="tun-mbody">
            <p class="tun-mtitle">{{ modal.card.p.title || modal.card.title }}</p>
            <p class="tun-mmeta">
              {{ modal.card.tag }}{{ modal.card.date ? ' · ' + modal.card.date : '' }}
              · ♥ {{ modal.card.p.likes || 0 }} · 💬 {{ (modal.card.p.cmts && modal.card.p.cmts.length) || 0 }}
            </p>
            <button class="tun-mvis" type="button" title="点击修改可见范围"
                    @click="openVis(modal.card.pid)">
              <span>{{ visMeta(visOf(modal.card.p)).ico }}</span>可见范围：<b>{{ visMeta(visOf(modal.card.p)).v }}</b><span class="tun-mvis-go">修改 ›</span>
            </button>
            <p class="tun-msnip">{{ modalSnip }}</p>
            <RouterLink class="btn-brand" :to="{ name: 'home' }" @click="closeModal">去首页查看完整记录</RouterLink>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- 可见范围设置 -->
    <Teleport to="body">
      <div v-if="visSheet" class="vis-sheet" @click.self="visSheet = null">
        <div class="vis-card">
          <p class="vis-head">谁可以看这条记录</p>
          <p class="vis-sub">《{{ visSheet.title }}》· 当前 {{ visSheet.cur }}</p>
          <div class="vis-list">
            <button v-for="o in VIS" :key="o.v" class="vis-opt" :class="{ on: o.v === visSheet.cur }"
                    type="button" @click="pickVis(o.v)">
              <span class="vis-ico">{{ o.ico }}</span>
              <span class="vis-txt"><b>{{ o.v }}</b><i>{{ o.desc }}</i></span>
              <span class="vis-ck">✓</span>
            </button>
          </div>
          <button class="vis-cancel" type="button" @click="visSheet = null">取消</button>
        </div>
      </div>
    </Teleport>
    <!-- 删除确认 -->
    <Teleport to="body">
      <div v-if="delSheet" class="vis-sheet" @click.self="delSheet = null">
        <div class="vis-card">
          <p class="vis-head">删除这条记录？</p>
          <p class="vis-sub">《{{ delSheet.title }}》删除后不可恢复。</p>
          <button class="vis-del" type="button" @click="confirmDel">确认删除</button>
          <button class="vis-cancel" type="button" @click="delSheet = null">取消</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>
