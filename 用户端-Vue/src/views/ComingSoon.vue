<script setup>
/* 迁移占位页：骨架阶段先把路由占住，避免导航点进来 404。
   逐批迁移时把对应路由的 component 换成真实视图即可。 */
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { TOPBAR } from '../lib/nav.js';

const route = useRoute();
const router = useRouter();
const title = computed(() => (TOPBAR[route.meta.page] || {}).title || '这一页');
</script>

<template>
  <section class="section reveal">
    <div class="q-note">
      <span class="qn-ico">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="8.6" /><path d="M12 8.2v4.4" /><circle cx="12" cy="16" r=".9" fill="currentColor" stroke="none" />
        </svg>
      </span>
      <span class="qn-txt">
        <b>{{ title }}还在迁移队列里</b>
        <span>Vue 版正按批次迁移页面，这一页的功能与数据还没接过来。旧版原型仍然可以正常使用，两边共用同一套 localStorage 数据。</span>
      </span>
      <button class="qn-go" type="button" @click="router.push({ name: 'home' })">回首页 ›</button>
    </div>
  </section>
</template>
