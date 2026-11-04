<script setup>
/* 顶栏：品牌 · 五格导航 · 主题 · 头像下拉（个人中心 / 我的记录 / 我的错题 / 退出） */
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import VIcon from './VIcon.vue';
import { NAV } from '../lib/nav.js';
import { auth, signOut } from '../lib/session.js';
import { theme, toggleTheme } from '../lib/theme.js';
import { stGetJSON } from '../lib/storage.js';

const route = useRoute();
const router = useRouter();

const menuOpen = ref(false);

const user = computed(() => auth.user || { name: '同学', initial: '同', role: '学生' });
const activeId = computed(() => route.meta.nav || route.name);

/* 头像：有上传图就用图，否则用姓氏首字色块 */
const avatarUrl = computed(() => {
  const p = stGetJSON('xj-profile', {}) || {};
  return p.avatar || '';
});

/* 错题本待订正数：直接读存储，不依赖题库（顶栏每页都能显示红点） */
const mkPending = computed(() => {
  const _ = route.fullPath;                       /* 切页即重算 */
  const m = stGetJSON('xj-mistakes', {}) || {};
  return Object.keys(m).filter((k) => !m[k].fixed).length;
});

function closeMenu() { menuOpen.value = false; }
function onDocClick() { closeMenu(); }
function onKey(e) { if (e.key === 'Escape') closeMenu(); }

onMounted(() => {
  document.addEventListener('click', onDocClick);
  document.addEventListener('keydown', onKey);
});
onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  document.removeEventListener('keydown', onKey);
});

watch(() => route.fullPath, closeMenu);

function go(name) {
  closeMenu();
  router.push({ name });
}

function doLogout() {
  signOut();
  closeMenu();
  router.replace({ name: 'login' });
}
</script>

<template>
  <div class="topbar-row">
    <RouterLink class="topbar-brand" :to="{ name: 'home' }" title="回到首页" aria-label="回到首页">
      <span class="brand-mark">学</span>
      <span class="brand-word">学迹</span>
    </RouterLink>

    <nav class="topnav" aria-label="主导航">
      <RouterLink v-for="n in NAV" :key="n.id" :to="{ name: n.name }"
                  :class="{ active: n.id === activeId }"
                  :aria-current="n.id === activeId ? 'page' : undefined">
        <VIcon :name="n.iconName" />
        <span>{{ n.label }}</span>
      </RouterLink>
    </nav>

    <div class="topbar-right">
      <button class="icon-btn" type="button" @click="toggleTheme"
              title="切换深色 / 浅色" aria-label="切换深色或浅色模式">
        <VIcon :name="theme === 'dark' ? 'sun' : 'moon'" />
      </button>

      <div class="avatar-wrap">
        <button class="avatar avatar-btn" type="button"
                aria-haspopup="true" :aria-expanded="menuOpen ? 'true' : 'false'"
                title="个人中心" @click.stop="menuOpen = !menuOpen">
          <img v-if="avatarUrl" :src="avatarUrl" alt="">
          <template v-else>{{ user.initial || '同' }}</template>
        </button>

        <div class="avatar-menu" v-show="menuOpen" @click.stop>
          <div class="avatar-menu-head">
            <b>{{ user.name }}</b>
            <span>{{ user.role }}</span>
          </div>
          <button type="button" class="avatar-menu-item" @click="go('me')">
            <VIcon name="user" />个人中心
          </button>
          <button type="button" class="avatar-menu-item" @click="go('myposts')">
            <VIcon name="pencil" />我的记录
          </button>
          <button type="button" class="avatar-menu-item" @click="go('mistakes')">
            <VIcon name="mistake" />我的错题
            <span v-if="mkPending > 0" class="avatar-menu-badge">{{ mkPending }}</span>
          </button>
          <button type="button" class="avatar-menu-item danger" @click="doLogout">
            <VIcon name="logout" />退出登录
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
