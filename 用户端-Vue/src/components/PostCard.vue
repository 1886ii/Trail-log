<script setup>
/* ============================================================
   一条记录（帖子）卡片
   ------------------------------------------------------------
   折叠规则（沿用旧原型，改动前先看注释）：
   · 文字超过约 6 行 → 裁高度 + 渐隐遮罩，按钮「展开全文」
   · 只有「正文里有图没放进卡片」时 → 不裁高度（短文字会被遮罩糊掉），
     只切换九宫格/正文图，按钮同样叫「展开全文」
   ============================================================ */
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { auth } from '../lib/session.js';

const props = defineProps({
  post: { type: Object, required: true },
  seed: { type: String, default: 'p' }
});
const emit = defineEmits(['open-emoji', 'persist-comment']);

const HEART = '<path d="M12 20.2S4 15.1 4 9.6a4.3 4.3 0 0 1 8-2.2 4.3 4.3 0 0 1 8 2.2c0 5.5-8 10.6-8 10.6z"/>';
const CHAT = '<path d="M20 11.6a7.6 7.6 0 0 1-7.7 7.4 8 8 0 0 1-3.2-.6L4 19.6l1.3-3.6a7.2 7.2 0 0 1-1.3-4.4A7.6 7.6 0 0 1 12.3 4 7.6 7.6 0 0 1 20 11.6z"/>';

const bodyEl = ref(null);
const inputEl = ref(null);
const emojiBtn = ref(null);

const folded = ref(true);      /* 先按折叠渲染，量完高再决定是否真的折叠 */
const measured = ref(false);
const textOver = ref(false);
const liked = ref(false);
const commentsOpen = ref(false);
const reply = ref({ name: '', id: '' });
const maxH = ref('');

/* ---------- 评论数据（规范化：补 id / 归位 replyToId / 清理脏引用） ---------- */
function normalizeCmts(list, seed) {
  const cmts = (list || []).map((c) => ({ ...c }));
  cmts.forEach((c, i) => { if (!c.id) c.id = seed + '-c' + (i + 1); });
  cmts.forEach((c) => {
    if (!c.replyToId && c.replyTo) {
      let target = null;
      cmts.forEach((t) => { if (t.id !== c.id && t.name === c.replyTo && !t.replyToId) target = t; });
      if (target) c.replyToId = target.id;
    }
  });
  const ids = {};
  cmts.forEach((c) => { ids[c.id] = 1; });
  cmts.forEach((c) => { if (c.replyToId && !ids[c.replyToId]) delete c.replyToId; });
  return cmts;
}

const cmts = ref(normalizeCmts(props.post.cmts, props.seed));

const roots = computed(() => cmts.value.filter((c) => !c.replyToId));
const subsOf = (id) => cmts.value.filter((c) => c.replyToId === id);

/* ---------- 评论 / 回复折叠 ----------
   · 根评论多于 CMT_SHOW 条 → 只显示前 CMT_SHOW 条，底部「展开全部 N 条评论」
   · 每条根评论的回复多于 SUB_SHOW 条 → 只显示前 SUB_SHOW 条，「展开 N 条回复」
   · 自己刚发的评论/回复如果落在折叠区，send() 里会自动展开对应层 */
const CMT_SHOW = 3;
const SUB_SHOW = 2;
const cmtsAllOpen = ref(false);
const subOpen = ref({});                       /* rootId -> true 该组回复已展开 */
const shownRoots = computed(() => (cmtsAllOpen.value ? roots.value : roots.value.slice(0, CMT_SHOW)));
const shownSubs = (id) => (subOpen.value[id] ? subsOf(id) : subsOf(id).slice(0, SUB_SHOW));
function toggleSubs(id) { subOpen.value[id] = !subOpen.value[id]; }

/* ---------- 正文 / 图片 ---------- */
const bodySrcs = computed(() => {
  const out = [];
  const re = /<img[^>]*\ssrc="([^"]+)"[^>]*>/g;
  let m;
  const html = props.post.html || '';
  while ((m = re.exec(html))) out.push(m[1]);
  return out;
});

const cardImgs = computed(() => props.post.imgs || []);

/* 图片区：用户发布的是字符串数组（真图），演示数据是占位块 */
const gridSrcs = computed(() => {
  const imgs = cardImgs.value;
  if (imgs.length && typeof imgs[0] === 'string') return imgs.slice(0, 9);
  return [];
});
const gridPhs = computed(() => {
  const imgs = cardImgs.value;
  if (imgs.length && typeof imgs[0] !== 'string') return imgs.slice(0, 9);
  return [];
});

/* 正文里有、但没进卡片的图（回退封面逻辑时用） */
const fallbackGrid = computed(() => {
  if (cardImgs.value.length) return [];
  if (props.post.noCardImgs) return [];
  const srcs = bodySrcs.value.slice();
  const cover = props.post.cover;
  if (cover && srcs.indexOf(cover) !== -1) {
    srcs.splice(srcs.indexOf(cover), 1);
    srcs.unshift(cover);
  }
  return srcs.slice(0, 9);
});

const shownSrcs = computed(() => (gridSrcs.value.length ? gridSrcs.value : fallbackGrid.value));
/* 旧版 home.html：占位块九宫格（演示数据）不设 grid-on，只有「真图进卡片」或
   「正文图回退成九宫格」才隐藏正文图。跟着对齐，避免有正文图的帖子在卡片态被藏图。 */
const gridOn = computed(() => shownSrcs.value.length > 0);
const hideBodyImgs = computed(() => shownSrcs.value.length > 0 || !!props.post.noCardImgs);

const extraImgs = computed(() => {
  if (!bodySrcs.value.length) return 0;
  const need = {};
  shownSrcs.value.forEach((s) => { need[s] = (need[s] || 0) + 1; });
  let rest = 0;
  bodySrcs.value.forEach((s) => {
    if (need[s] > 0) need[s] -= 1; else rest += 1;
  });
  return rest;
});

const canFold = computed(() => textOver.value || extraImgs.value > 0);

/* 坏图标记：src 键 → 加载失败后显示「图片丢失」占位 */
const broken = ref({});
function markBroken(key) { broken.value[key] = true; }

/* ---------- 折叠：量高时先把正文图藏掉，图片不参与「是否超过 6 行」 ---------- */
function measure() {
  const el = bodyEl.value;
  if (!el) return;
  el.classList.add('measuring');
  const h = el.scrollHeight;
  el.classList.remove('measuring');
  const lh = parseFloat(getComputedStyle(el).lineHeight) || 25;
  textOver.value = h > lh * 6 + 4;

  measured.value = true;

  if (!canFold.value) {
    folded.value = false;
    maxH.value = '';
    return;
  }
  folded.value = true;
  applyFold();
}

function applyFold() {
  const el = bodyEl.value;
  if (!el) return;
  if (folded.value && textOver.value) {
    el.classList.add('folded');
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 25;
    maxH.value = (lh * 6 + 4) + 'px';
  } else {
    el.classList.remove('folded');
    maxH.value = '';
  }
}

function toggleFold() {
  folded.value = !folded.value;
  applyFold();
}

onMounted(() => nextTick(measure));
watch(() => props.post.html, () => nextTick(measure));

/* ---------- 互动 ---------- */
function toggleLike(ev) {
  liked.value = !liked.value;
  if (liked.value && window.FX && window.FX.burstFrom) window.FX.burstFrom(ev.currentTarget, 9);
}

function toggleComments() {
  commentsOpen.value = !commentsOpen.value;
  if (commentsOpen.value) {
    /* 重新打开评论 = 回到折叠态：收起全靠评论气泡图标，不再单独给「收起评论」按钮 */
    cmtsAllOpen.value = false;
    nextTick(() => inputEl.value && inputEl.value.focus());
  }
}

function startReply(c) {
  const rootId = c.replyToId ? c.replyToId : c.id;
  reply.value = { name: c.name, id: rootId };
  commentsOpen.value = true;
  nextTick(() => inputEl.value && inputEl.value.focus());
}

function cancelReply() {
  reply.value = { name: '', id: '' };
}

function send() {
  const text = (inputEl.value && inputEl.value.value || '').trim();
  if (!text) return;

  const c = {
    id: 'c' + Date.now(),
    name: (auth.user || {}).name || '同学',
    initial: (auth.user || {}).initial || '学',
    time: '刚刚',
    text,
    replyTo: reply.value.name,
    replyToId: reply.value.id
  };
  cmts.value = cmts.value.concat([c]);
  inputEl.value.value = '';
  cancelReply();

  /* 新评论落在折叠区里会被藏住 → 发送后自动展开对应层 */
  if (c.replyToId) subOpen.value[c.replyToId] = true;
  else cmtsAllOpen.value = true;

  /* 自己发布的帖子：评论持久化到 xj-feed */
  if (props.post.id) emit('persist-comment', props.post.id, c);
}

function onEmoji() {
  emit('open-emoji', { btn: emojiBtn.value, input: inputEl.value });
}

/* 评论正文：先放大 emoji，再整体交给模板转义（Vue 插值本身会转义） */
const EMOJI_RE = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/gu;
function cmtParts(text) {
  const out = [];
  let last = 0;
  const s = String(text || '');
  s.replace(EMOJI_RE, (m, _g, idx) => {
    if (idx > last) out.push({ t: s.slice(last, idx) });
    out.push({ t: m, emoji: true });
    last = idx + m.length;
    return m;
  });
  if (last < s.length) out.push({ t: s.slice(last) });
  return out;
}

defineExpose({ cancelReply });
</script>

<template>
  <article class="post" :class="{ 'grid-on': gridOn || hideBodyImgs, expanded: measured && canFold && !folded }">
    <div class="post-head">
      <span class="avatar">{{ post.initial || '宇' }}</span>
      <span class="post-who"><b>{{ post.name || '小宇' }}</b><span>{{ post.time }}</span></span>
      <span class="chip brand">{{ post.tag }}</span>
    </div>

    <p class="post-title-line" v-if="post.title">{{ post.title }}</p>

    <div class="post-foldwrap">
      <div class="post-body" ref="bodyEl" :class="{ folded: folded && textOver }"
           :style="maxH ? { maxHeight: maxH } : null" v-html="post.html"></div>
    </div>

    <!-- 九宫格：用户发布的真图；加载失败的格子显式标出，不再静默空白 -->
    <div v-if="shownSrcs.length" class="post-imgs post-grid-f" :class="'n' + shownSrcs.length">
      <template v-for="(s, i) in shownSrcs" :key="i + s.slice(0, 64) + (s.length % 97)">
        <img v-if="!broken[i + s]" :src="s" alt="" @error="markBroken(i + s)">
        <div v-else class="ph ph-broken" title="这张图的本地数据已损坏或丢失">图片丢失</div>
      </template>
    </div>

    <!-- 九宫格：演示占位块 -->
    <div v-else-if="gridPhs.length" class="post-imgs" :class="'n' + gridPhs.length">
      <div v-for="(im, i) in gridPhs" :key="i" class="ph" :style="im.style">{{ im.label }}</div>
    </div>

    <button class="fold-btn" type="button" v-if="canFold" @click="toggleFold">
      {{ folded ? '展开全文 ▾' : '收起 ▴' }}
    </button>

    <div class="post-foot">
      <button class="foot-btn like-btn" :class="{ liked }" type="button" aria-label="点赞" @click="toggleLike">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="HEART"></svg>
        <b>{{ (post.likes || 0) + (liked ? 1 : 0) }}</b>
      </button>

      <button class="foot-btn comment-btn" type="button" aria-label="评论" @click="toggleComments">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" v-html="CHAT"></svg>
        <b>{{ cmts.length }}</b>
      </button>

      <span style="flex: 1"></span>
      <span v-if="post.mine" class="chip ok">刚发布</span>
    </div>

    <!-- 评论区：两级（顶级平铺，回复缩进） -->
    <div class="post-comments" v-show="commentsOpen">
      <div class="comment-list">
        <template v-for="r in shownRoots" :key="r.id">
          <div class="comment-item">
            <span class="avatar">{{ r.initial || (r.name || '').charAt(0) }}</span>
            <div class="comment-body">
              <p class="comment-name">{{ r.name }}</p>
              <p class="comment-text">
                <span v-if="r.replyTo" class="cmt-at">回复 @{{ r.replyTo }}</span>
                <template v-for="(p, i) in cmtParts(r.text)" :key="i">
                  <i v-if="p.emoji" class="emj">{{ p.t }}</i><template v-else>{{ p.t }}</template>
                </template>
              </p>
              <p class="comment-meta">
                <span class="comment-time">{{ r.time }}</span>
                <button class="cmt-reply" type="button" @click="startReply(r)">回复</button>
              </p>
            </div>
          </div>

          <div v-if="subsOf(r.id).length" class="cmt-subs">
            <div v-for="c in shownSubs(r.id)" :key="c.id" class="comment-item">
              <span class="avatar">{{ c.initial || (c.name || '').charAt(0) }}</span>
              <div class="comment-body">
                <p class="comment-name">{{ c.name }}</p>
                <p class="comment-text">
                  <span v-if="c.replyTo" class="cmt-at">回复 @{{ c.replyTo }}</span>
                  <template v-for="(p, i) in cmtParts(c.text)" :key="i">
                    <i v-if="p.emoji" class="emj">{{ p.t }}</i><template v-else>{{ p.t }}</template>
                  </template>
                </p>
                <p class="comment-meta">
                  <span class="comment-time">{{ c.time }}</span>
                  <button class="cmt-reply" type="button" @click="startReply(c)">回复</button>
                </p>
              </div>
            </div>

            <button v-if="subsOf(r.id).length > SUB_SHOW" class="cmt-more sub"
                    :class="{ open: subOpen[r.id] }" type="button"
                    :aria-expanded="subOpen[r.id] ? 'true' : 'false'"
                    @click="toggleSubs(r.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
              <span>{{ subsOf(r.id).length }} 条回复</span>
            </button>
          </div>
        </template>

        <button v-if="roots.length > CMT_SHOW" class="cmt-more"
                :class="{ open: cmtsAllOpen }" type="button"
                :aria-expanded="cmtsAllOpen ? 'true' : 'false'"
                @click="cmtsAllOpen = !cmtsAllOpen">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
          <span>{{ cmtsAllOpen ? '收起 ' + roots.length + ' 条评论' : '展开全部 ' + roots.length + ' 条评论' }}</span>
        </button>
      </div>

      <div class="comment-form">
        <span class="avatar">{{ (auth.user || {}).initial || '学' }}</span>
        <input ref="inputEl" class="comment-input" type="text" maxlength="200"
               :placeholder="reply.name ? '回复 @' + reply.name + '：' : '写评论，回车发送…'"
               @keydown.enter.prevent="send"
               @keydown.esc="cancelReply">
        <button ref="emojiBtn" class="emoji-btn cmt-emoji" type="button"
                title="表情" aria-label="插入表情" @click.stop="onEmoji">😊</button>
        <button class="comment-send" type="button" @click="send">发送</button>
      </div>
    </div>
  </article>
</template>
