<script setup>
/* 图标渲染：只吐 path，尺寸交给 style.css 里既有的选择器控制 */
import { computed } from 'vue';
import { ICO } from '../lib/icons.js';

const props = defineProps({
  name: { type: String, required: true }
});

const path = computed(() => ICO[props.name] || '');
</script>

<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"
       aria-hidden="true" v-html="path"></svg>
</template>
