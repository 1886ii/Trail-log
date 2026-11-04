<script setup>
/* 访客提示条：本机登录态不可用时的降级说明（旧原型行为，不要去掉） */
import { useRouter } from 'vue-router';
import VIcon from './VIcon.vue';

const router = useRouter();
</script>

<template>
  <div class="guest-bar" id="guest-bar">
    <span class="gb-ico"><VIcon name="user" /></span>
    <span class="gb-txt">
      本机登录态不可用（站点数据被隔离或已清空），已切换为<b>访客模式</b> —— 可以浏览，但发帖、草稿不会保存。
    </span>
    <span class="spacer"></span>
    <button class="gb-login" type="button" @click="router.push({ name: 'login' })">去登录</button>
  </div>
</template>
