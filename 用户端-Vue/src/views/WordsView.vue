<script setup>
/* ============================================================
   每日单词（背诵卡）
   ------------------------------------------------------------
   一卡一词，点卡翻面看释义，点喇叭朗读（浏览器本地 TTS，零成本）。
   正式版：词单由后端按艾宾浩斯排程算好下发，音频换预生成 mp3。
   ============================================================ */
import { ref, onBeforeUnmount } from 'vue';

const WORDS = [
  { word: 'abandon',   phon: '/əˈbændən/',  mean: 'v. 放弃；抛弃；遗弃',     eg: 'He abandoned his car in the snow.',    egCn: '他把车丢在雪地里不管了。', tag: 'new' },
  { word: 'absorb',    phon: '/əbˈzɔːb/',   mean: 'v. 吸收；使专心',         eg: 'Plants absorb water through roots.',   egCn: '植物通过根吸收水分。',     tag: 'new' },
  { word: 'academic',  phon: '/ˌækəˈdemɪk/', mean: 'adj. 学业的；学术的',    eg: 'Her academic record is amazing.',      egCn: '她的学业成绩非常出色。',   tag: 'new' },
  { word: 'accent',    phon: '/ˈæksent/',   mean: 'n. 口音；重音',           eg: 'He speaks with a southern accent.',    egCn: '他说话带南方口音。',       tag: 'rev' },
  { word: 'accept',    phon: '/əkˈsept/',   mean: 'v. 接受；认可',           eg: 'Please accept my apology.',            egCn: '请接受我的道歉。',         tag: 'rev' },
  { word: 'access',    phon: '/ˈækses/',    mean: 'n. 通道；使用权 v. 访问', eg: 'Students have access to the lab.',     egCn: '学生可以使用实验室。',     tag: 'new' },
  { word: 'accompany', phon: '/əˈkʌmpəni/', mean: 'v. 陪伴；伴随',           eg: 'I accompanied her to the station.',    egCn: '我陪她去了车站。',         tag: 'rev' },
  { word: 'achieve',   phon: '/əˈtʃiːv/',   mean: 'v. 达到；实现',           eg: 'You can achieve your goal.',           egCn: '你能实现自己的目标。',     tag: 'rev' },
  { word: 'adapt',     phon: '/əˈdæpt/',    mean: 'v. 适应；改编',           eg: 'She adapted quickly to city life.',    egCn: '她很快适应了城市生活。',   tag: 'new' }
];

const newN = WORDS.filter((w) => w.tag === 'new').length;
const revN = WORDS.filter((w) => w.tag === 'rev').length;

const flipped = ref({});
const playing = ref({});
const timers = [];

function toggle(i) {
  flipped.value[i] = !flipped.value[i];
}

function speak(word, i) {
  playing.value[i] = true;
  timers.push(setTimeout(() => { playing.value[i] = false; }, 1000));

  try {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();                 /* 打断上一段，连点不叠音 */
    const u = new SpeechSynthesisUtterance(word);
    u.lang = 'en-US';
    u.rate = 0.9;                             /* 稍慢，适合学生听清音节 */
    speechSynthesis.speak(u);
  } catch (e) { /* 无声环境不影响翻卡 */ }
}

function onSpeakKey(e, w, i) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  e.preventDefault();
  e.stopPropagation();
  speak(w.word, i);
}

onBeforeUnmount(() => timers.forEach(clearTimeout));
</script>

<template>
  <section class="section reveal">
    <h2 class="section-title">今日单词
      <span class="count">· 管理端发布 · 新词 {{ newN }} · 复习 {{ revN }} · 点卡片看释义</span>
    </h2>

    <div class="word-grid">
      <button v-for="(w, i) in WORDS" :key="w.word" class="word-face" type="button"
              :class="{ flipped: flipped[i] }"
              :aria-label="'单词卡 ' + w.word + '，点击翻面查看释义'"
              @click="toggle(i)">
        <span class="wf-inner">
          <span class="wf-front">
            <span v-if="w.tag === 'new'" class="wf-tag new">新词</span>
            <span v-else class="wf-tag rev">复习</span>

            <span class="wf-speak" :class="{ playing: playing[i] }" role="button" tabindex="0"
                  :aria-label="'朗读 ' + w.word" title="朗读"
                  @click.stop="speak(w.word, i)"
                  @keydown="onSpeakKey($event, w, i)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M4.2 9.3v5.4h3.3L12.8 19V5L7.5 9.3H4.2z" />
                <path d="M16.1 9a4.4 4.4 0 0 1 0 6" />
                <path d="M18.5 6.7a7.8 7.8 0 0 1 0 10.6" />
              </svg>
            </span>

            <span class="wf-word">{{ w.word }}</span>
            <span class="wf-phon">{{ w.phon }}</span>
          </span>

          <span class="wf-back">
            <span class="wf-mean">{{ w.mean }}</span>
            <span class="wf-eg">{{ w.eg }}<br>{{ w.egCn }}</span>
          </span>
        </span>
      </button>
    </div>
  </section>
</template>
