<script setup>
/* ============================================================
   每日计算
   ------------------------------------------------------------
   纸上做完 → 拍照上传 → AI 识别并逐题批改 → 错因 + 进错题本
   原型期：评阅结果是演示数据；正式版走 OCR + 大模型批改接口
   ============================================================ */
import { ref, computed, onBeforeUnmount } from 'vue';

const MAX_IMGS = 6;

const CALC_QS = [
  { q: '-3 + 5 × (-2)', a: '-13', tag: '有理数混合运算', ok: true },
  { q: '(-2)³ ÷ 4 + 6', a: '4', tag: '乘方运算', ok: true },
  { q: '24 × (1/2 - 1/3)', a: '4', tag: '分配律', ok: true },
  { q: '(-1)²⁰²⁶ + (-1)²⁰²⁵', a: '0', tag: '乘方符号规律', ok: true },
  { q: '|-5| - |-3| × 2', a: '-1', tag: '绝对值', ok: false },
  { q: '(1/2 - 2/3) × (-6)', a: '1', tag: '分数运算', ok: true },
  { q: '-2² + (-2)²', a: '0', tag: '乘方与相反数', ok: true },
  { q: '18 × (-2/3) - 4', a: '-16', tag: '有理数混合运算', ok: true },
  { q: '(-12) ÷ (-3) × 2', a: '8', tag: '乘除同级运算', ok: true },
  { q: '-| -(-4) | + 7', a: '3', tag: '多重符号化简', ok: true }
];

const imgs = ref([]);
const upErr = ref('');
const loading = ref(false);
const graded = ref(false);
const busy = ref(false);
const fileInput = ref(null);
let timer = null;

const rightN = computed(() => CALC_QS.filter((x) => x.ok).length);

function pick() { if (fileInput.value) fileInput.value.click(); }
function onPick(e) {
  const files = Array.from(e.target.files || []);
  e.target.value = '';
  files.forEach((f) => {
    if (!/^image\//.test(f.type)) return;
    if (imgs.value.length >= MAX_IMGS) { upErr.value = '最多上传 ' + MAX_IMGS + ' 张，多余的已忽略'; return; }
    const r = new FileReader();
    r.onload = () => imgs.value.push({ id: 'u' + Date.now() + Math.random(), src: r.result });
    r.readAsDataURL(f);
  });
  upErr.value = '';
}
function remove(id) { imgs.value = imgs.value.filter((i) => i.id !== id); }

function grade() {
  if (!imgs.value.length) { upErr.value = '请先上传至少一张答题图片'; return; }
  upErr.value = '';
  loading.value = true;
  graded.value = false;
  busy.value = true;
  timer = setTimeout(() => {
    loading.value = false;
    graded.value = true;
    busy.value = false;
  }, 1600);
}

onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <div>
    <!-- 任务卡 -->
    <section class="section reveal" style="margin-top:18px">
      <div class="side-card" style="padding:18px 20px">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <h2 style="font-size:17px;font-weight:500;margin:0">有理数混合运算 · 10 题</h2>
          <span class="chip brand">管理端发布</span>
          <span class="chip">数学</span>
        </div>
        <p class="row-meta" style="margin-top:8px">
          建议用时 20 分钟 · 在纸上完成后拍照上传，AI 识别并逐题评阅，错题自动进错题本
        </p>
        <div class="calc-steps">
          <span class="calc-step"><i>1</i>纸上完成 10 题</span>
          <span class="calc-step"><i>2</i>逐题拍照上传</span>
          <span class="calc-step"><i>3</i>AI 评阅</span>
          <span class="calc-step"><i>4</i>看错因 · 订正</span>
        </div>
      </div>
    </section>

    <!-- 今日计算题 -->
    <section class="section reveal">
      <h2 class="section-title">今日计算题 <span class="count">· 共 10 题 · 把过程写在纸上</span></h2>
      <div class="calc-grid">
        <div v-for="(it, i) in CALC_QS" :key="i" class="calc-q">
          <span class="q-no">{{ i + 1 }}</span>
          <span class="cq-expr">计算：{{ it.q }}</span>
          <span class="cq-tag">{{ it.tag }}</span>
        </div>
      </div>
    </section>

    <!-- 上传区 -->
    <section class="section reveal">
      <h2 class="section-title">上传答题图片 <span class="count">· 最多 6 张，每张一题拍清楚</span></h2>

      <div class="side-card">
        <div class="up-area" role="button" tabindex="0" aria-label="选择答题照片"
             @click="pick" @keydown.enter.prevent="pick" @keydown.space.prevent="pick">
          <b>点这里选择照片</b>
          <span>支持 JPG / PNG，也可以拍完在相册里选 · 拍正一点，字迹清楚评阅更准</span>
        </div>
        <input ref="fileInput" type="file" accept="image/*" multiple hidden @change="onPick">

        <div class="up-grid">
          <div v-for="im in imgs" :key="im.id" class="up-thumb">
            <img :src="im.src" alt="答题图片">
            <button class="up-x" type="button" aria-label="删除这张图片" @click="remove(im.id)">×</button>
          </div>
        </div>

        <div v-if="upErr" class="auth-error up-error">
          <span>{{ upErr }}</span>
        </div>

        <div class="up-foot">
          <button class="btn-brand" type="button" :disabled="busy" @click="grade">
            {{ busy ? '评阅中…' : (graded ? '重新评阅' : '提交 AI 评阅') }}
          </button>
          <span class="up-note">原型演示：评阅结果是演示数据 —— 正式版为「OCR 识别手写 + 大模型逐题批改」，图片走上传服务存服务器</span>
        </div>
      </div>
    </section>

    <!-- 评阅结果 -->
    <section v-if="loading || graded" class="section reveal">
      <h2 class="section-title">AI 评阅结果</h2>
      <div class="side-card">
        <div v-if="loading" class="ai-loading">
          <span class="ai-dots"><i></i><i></i><i></i></span>
          正在识别图片中的手写过程并逐题批改…
        </div>

        <div v-else>
          <div class="grade-head">
            <span class="grade-score">{{ rightN * 10 }}</span>
            <div>
              <p style="margin:0;font-size:14px">10 题对 {{ rightN }} 题 · 用时约 18 分钟（按上传时间估算）</p>
              <p class="row-meta" style="margin:2px 0 0">整体很稳，主要丢分点：绝对值与乘方混合运算的符号</p>
            </div>
            <span class="chip brand" style="margin-left:auto">已计入今日任务 ✓</span>
          </div>

          <div v-for="(it, i) in CALC_QS" :key="i" class="grade-row">
            <span class="grade-mark" :class="it.ok ? 'ok' : 'bad'">{{ it.ok ? '✓' : '✕' }}</span>
            <div style="flex:1;min-width:0">
              <p style="margin:0">{{ i + 1 }}. 计算：{{ it.q }}</p>
              <p class="row-meta" style="margin:2px 0 0">
                正确答案：{{ it.a }}<template v-if="!it.ok"> · 识别到你的答案：1</template>
              </p>
              <div v-if="!it.ok" class="grade-wrong">
                <b>错因：符号处理错误。</b>第 {{ i + 1 }} 题要先算绝对值 |−5| = 5、|−3| = 3，
                原式 = 5 − 3 × 2 = 5 − 6 = <b>−1</b>。你把「减去 3×2」写成了「减去 6 的相反数」，漏了负号方向。
                同类题已加入你的错题本，3 天后复习。
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
