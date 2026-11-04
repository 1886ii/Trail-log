<script setup>
/* 应用外壳
   ------------------------------------------------------------
   登录页走独立布局（route.meta.layout === 'auth'）；
   其余页面统一是 .app > .main > 顶栏 + .content。
   权限不足时顶栏照常，只把内容区换成一把锁（旧原型行为）。
   ============================================================ */
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import AppTopBar from './components/AppTopBar.vue';
import PageHead from './components/PageHead.vue';
import LockView from './components/LockView.vue';
import GuestBar from './components/GuestBar.vue';
import { canPage } from './lib/perm.js';
import { auth } from './lib/session.js';

const route = useRoute();

const isAuth  = computed(() => route.meta.layout === 'auth');
const isBare  = computed(() => route.meta.layout === 'bare');   /* 海报页：不套 App 外壳 */
const page    = computed(() => route.meta.page || '');
const allowed = computed(() => canPage(page.value));
const isGuest = computed(() => !!(auth.user && auth.user.guest));

const stuck = ref(false);
function onScroll() { stuck.value = window.scrollY > 4; }

/* 视觉特效层：每次切页后重跑入场 / 环形进度（fx.js 自带防重入） */
async function afterNav() {
  await nextTick();
  if (window.FX && window.FX.init) window.FX.init();
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  afterNav();
});
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll));

watch(() => route.fullPath, afterNav);
</script>

<template>
  <RouterView v-if="isAuth || isBare" />

  <div v-else class="app">
    <main class="main">
      <header class="topbar" :class="{ 'is-stuck': stuck }">
        <AppTopBar />
      </header>

      <!-- 页面级附加条（作答页的 quiz-bar 从这里 teleport 进来；其余页保持空） -->
      <div id="page-chrome"></div>

      <div class="content" :class="{
        'content-wide': route.meta.wide,
        'content-narrow': route.meta.narrow,
        'is-locked': !allowed
      }">
        <GuestBar v-if="isGuest" />

        <template v-if="allowed">
          <PageHead :page="page" />
          <RouterView v-slot="{ Component }">
            <component :is="Component" :key="route.name" />
          </RouterView>
        </template>

        <LockView v-else />
      </div>
    </main>
  </div>
</template>
