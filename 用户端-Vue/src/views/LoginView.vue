<script setup>
/* 登录页
   —— 账号由家长在管理端建档时开好（1 账号 = 1 学生），没有绑定码这一步
   —— 正式版把 login() 换成 POST /api/auth/login 即可，校验顺序保持不变 */
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import VIcon from '../components/VIcon.vue';
import { auth, login, findAccount } from '../lib/session.js';
import { theme, toggleTheme } from '../lib/theme.js';
import { firstAllowed } from '../lib/perm.js';

const router = useRouter();
const route = useRoute();

const account = ref(auth.remembered || '');
const password = ref('');
const remember = ref(!!auth.remembered);
const showPwd = ref(false);

const errText = ref('');
const errField = ref('');
const loading = ref(false);
const done = ref(false);
const doneLabel = ref('登 录');

/* 已登录提示条：旧版 app.js 是「有会话就显示」（访客降级也算一次会话），照旧对齐 */
const lastSession = computed(() => auth.user || null);

function onInput() {
  if (errText.value) { errText.value = ''; errField.value = ''; }
}

function showError(msg, field) {
  errText.value = msg;
  errField.value = field || '';
  /* 重启动画：先移除再加回，让抖动每次都能看到 */
  const form = document.getElementById('login-form');
  if (form) { form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake'); }
}

function onSubmit() {
  if (loading.value || done.value) return;
  const r = login(account.value, password.value, remember.value);
  if (!r.ok) { showError(r.msg, r.field); return; }

  /* 与旧原型一致的节奏：转圈 850ms → 按钮转绿 → 再跳 */
  loading.value = true;

  setTimeout(() => {
    loading.value = false;
    done.value = true;
    doneLabel.value = r.first ? '首次登录 · 建议改密码' : '登录成功';

    const target = route.query.next && typeof route.query.next === 'string'
      ? route.query.next
      : null;

    setTimeout(() => {
      if (target && target !== '/login') router.replace(target);
      else router.replace({ name: firstAllowed().name });
    }, r.first ? 900 : 420);
  }, 850);
}

function onForgot() {
  showError('密码是家长在管理端建档时给的。忘了就让家长去「学生详情 → 重置密码」生成一份新的。');
}

function continueSession() {
  router.replace({ name: firstAllowed().name });
}

onMounted(() => {
  /* ?perm=readonly 这类原型期调试参数：登录后由管理端下发，这里不再处理 */
  if (findAccount(account.value) === null && account.value) account.value = '';
});
</script>

<template>
  <div class="auth">

    <!-- ===== 左侧品牌区（仅电脑端显示） ===== -->
    <aside class="auth-brand">
      <div class="brand-top">
        <div class="brand-mark">学</div>
        <div>
          <p class="brand-name">学迹</p>
          <p class="brand-tag">初中 · 语数英 · AI 辅助</p>
        </div>
      </div>

      <div class="brand-mid">
        <h1 class="brand-h1">把「今晚学什么」<br>交给系统安排</h1>
        <p class="brand-sub">出题 · 作答 · 批改 · 讲解 · 复习，每天一条线跑完，不再靠家长盯。</p>

        <ul class="brand-list">
          <li><span class="brand-dot"></span><span class="brand-li-t">今晚题目</span><span class="brand-li-m">数学 · 10 题 · 约 25 分钟</span></li>
          <li><span class="brand-dot"></span><span class="brand-li-t">每天单词</span><span class="brand-li-m">新词 12 个 · 复习 28 个</span></li>
          <li><span class="brand-dot"></span><span class="brand-li-t">计划阅读</span><span class="brand-li-m">《骆驼祥子》第 3 章</span></li>
        </ul>
      </div>

      <p class="brand-foot">初三 · 上学期 · 第 6 周</p>
    </aside>

    <!-- ===== 右侧表单区 ===== -->
    <main class="auth-side">
      <button class="icon-btn auth-theme" type="button" @click="toggleTheme"
              title="切换深色 / 浅色" aria-label="切换深色或浅色模式">
        <VIcon :name="theme === 'dark' ? 'sun' : 'moon'" />
      </button>

      <form class="auth-card" id="login-form" novalidate autocomplete="on" @submit.prevent="onSubmit">

        <div class="auth-mini">
          <div class="brand-mark">学</div>
          <div>
            <p class="brand-name">学迹</p>
            <p class="brand-tag">每天三件事，进步看得见</p>
          </div>
        </div>

        <!-- 已登录提示条 -->
        <div class="auth-session" v-if="lastSession">
          <span>上次登录：<b>{{ lastSession.name }}</b></span>
          <button class="link-muted" type="button" @click="continueSession">继续 →</button>
        </div>

        <h2 class="auth-title">欢迎回来</h2>
        <p class="auth-desc">登录后继续今天的学习</p>

        <p class="auth-error" v-if="errText" role="alert">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="8.6" /><path d="M12 7.8v4.6" />
            <circle cx="12" cy="15.9" r=".9" fill="currentColor" stroke="none" />
          </svg>
          <span>{{ errText }}</span>
        </p>

        <div class="auth-form">
          <div class="field" :class="{ 'has-error': errField === 'account' }">
            <label for="account">账号</label>
            <div class="field-box">
              <span class="field-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="8.4" r="3.6" /><path d="M5 19.8c0-3.5 3.1-5.9 7-5.9s7 2.4 7 5.9" />
                </svg>
              </span>
              <input id="account" v-model="account" name="account" type="text" inputmode="email"
                     autocomplete="username" placeholder="手机号或邮箱" required
                     :disabled="loading || done" @input="onInput">
            </div>
          </div>

          <div class="field" :class="{ 'has-error': errField === 'password' }">
            <label for="password">密码</label>
            <div class="field-box">
              <span class="field-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"
                     stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <rect x="4.8" y="10.4" width="14.4" height="9.6" rx="2.4" />
                  <path d="M8.4 10.4V7.8a3.6 3.6 0 0 1 7.2 0v2.6" />
                </svg>
              </span>
              <input id="password" v-model="password" name="password"
                     :type="showPwd ? 'text' : 'password'"
                     autocomplete="current-password" placeholder="请输入密码" required
                     :disabled="loading || done" @input="onInput">
              <button class="field-eye" type="button"
                      :aria-label="showPwd ? '隐藏密码' : '显示密码'"
                      title="显示 / 隐藏密码" @click="showPwd = !showPwd">
                <VIcon :name="showPwd ? 'eyeOff' : 'eyeOn'" />
              </button>
            </div>
          </div>

          <div class="login-row">
            <label class="checkbox">
              <input type="checkbox" v-model="remember" name="remember">
              <span>记住这台设备</span>
            </label>
            <button class="link-muted" type="button" @click="onForgot">忘记密码</button>
          </div>

          <button class="btn-primary" type="submit"
                  :class="{ 'is-loading': loading, 'is-done': done }"
                  :disabled="loading || done">
            <span class="btn-label" :style="done ? { visibility: 'visible' } : null">{{ doneLabel }}</span>
            <span class="btn-spin" aria-hidden="true"></span>
          </button>

          <p class="auth-hint">
            账号由家长在管理端建档时开好（1 账号 = 1 学生），没有绑定码这一步。<br>
            演示账号：<code>jiayu</code> / <code>815203</code> · 全功能　
            <code>yutong</code> / <code>604712</code> · 学习专注　
            <code>xiaozhou</code> / <code>390845</code> · 仅看记录
          </p>
        </div>
      </form>

      <p class="auth-copy">学迹 · 家庭试用版 v0.1</p>
    </main>
  </div>
</template>
