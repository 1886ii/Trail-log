<script setup>
/* 内容区首行标题：首页动态问候，其余页取 TOPBAR 配置 */
import { computed } from 'vue';
import { pageTitle, pageSub } from '../lib/nav.js';
import { auth } from '../lib/session.js';

const props = defineProps({
  page: { type: String, default: '' }
});

const title = computed(() => pageTitle(props.page, (auth.user || {}).name));
const sub = computed(() => pageSub(props.page));
</script>

<template>
  <div class="page-head reveal">
    <h1 class="js-greet">{{ title }}</h1>
    <p class="js-sub">{{ sub }}</p>
  </div>
</template>
