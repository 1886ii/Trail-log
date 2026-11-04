<script setup>
/* 锁页：只替换内容区，顶栏导航一点不碰（与旧原型 renderLock 一致） */
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { firstAllowed } from '../lib/perm.js';

const router = useRouter();
const next = computed(() => firstAllowed());

function go() {
  router.push({ name: next.value.name });
}
</script>

<template>
  <div class="lock-screen">
    <div class="lock-ico">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor"
           stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="4" y="10.5" width="16" height="10" rx="2.4" />
        <path d="M8 10.5V7a4 4 0 0 1 8 0v3.5" />
      </svg>
    </div>
    <h2 class="lock-title">这个功能还没有开放</h2>
    <p class="lock-sub">需要家长在管理端为你开启后才能使用</p>
    <button class="lock-btn" type="button" @click="go">去{{ next.label }}</button>
  </div>
</template>
