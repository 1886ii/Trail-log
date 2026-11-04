<script setup>
/* ============================================================
   编辑资料
   ------------------------------------------------------------
   展示身份 / 学业档案 / 学习节奏。
   科目表「即改即存」（防抖 400ms），其余字段点「保存并返回」落盘；
   目标分单科满分 150，超限直接清空并提示。
   ============================================================ */
import { ref, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import {
  readProfile, writeProfile, onSubjects, targetSum, pickImage
} from '../lib/profile.js';

const router = useRouter();
const p = ref(readProfile());
const err = ref('');
const saved = ref(false);
const toastMsg = ref('');
let toastTimer = null;
let autoTimer = null;

const initial = computed(() => (p.value.nickname || '学').charAt(0));

function toast(msg) {
  toastMsg.value = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastMsg.value = ''; }, 1800);
}

/* ---------- 头像 ---------- */
async function changeAvatar() {
  const src = await pickImage(false);
  if (!src) return;
  const q = readProfile();
  q.avatar = src;
  writeProfile(q);
  p.value = { ...p.value, avatar: src };
}

/* ---------- 科目表 ---------- */
const MAX_SCORE = 150;
function scoreBad(v) {
  if (String(v == null ? '' : v).trim() === '') return '';
  const n = parseFloat(v);
  if (!(n > 0)) return 'zero';
  if (n > MAX_SCORE) return 'over';
  return '';
}

const total = computed(() => targetSum(p.value));
const onCount = computed(() => onSubjects(p.value).length);
const badCount = computed(() => onSubjects(p.value).filter((s) => scoreBad(s.target) === 'over').length);
const zeroCount = computed(() => onSubjects(p.value).filter((s) => scoreBad(s.target) === 'zero').length);

const note = computed(() => {
  if (!onCount.value) return '还没有开启任何科目';
  if (badCount.value) return '有 ' + badCount.value + ' 科的分数超过单科满分 150，超出会被清空，请改一下';
  if (zeroCount.value) return '目标分要填大于 0 的数字，或者留空不填';
  const filled = onSubjects(p.value).filter((s) => parseFloat(s.target) > 0).length;
  if (filled < onCount.value) return '已开 ' + onCount.value + ' 科 · ' + (onCount.value - filled) + ' 科还没填分数';
  return '已开 ' + onCount.value + ' 科 · 全部已填';
});

function autoSave() {
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => {
    const q = readProfile();
    q.subjects = p.value.subjects.map((s) => ({ ...s }));
    writeProfile(q);
  }, 400);
}

function toggleFocus(s) {
  s.focus = !s.focus;
  err.value = '';
  autoSave();
}
function toggleOn(s) {
  s.on = !s.on;
  err.value = '';
  autoSave();
}
function onTargetInput(s, e) {
  const v = e.target.value;
  const bad = scoreBad(v);
  if (bad === 'over') {
    e.target.value = '';
    s.target = '';
    toast('「' + s.name + '」目标分最多 150 分，已清空');
    autoSave();
    err.value = '';
    return;
  }
  s.target = v;
  autoSave();
  err.value = '';
}

/* ---------- 保存 ---------- */
function save() {
  const q = p.value;
  if (!q.nickname.trim()) { err.value = '昵称不能为空，家长在管理端靠它认出你。'; return; }
  if (!onSubjects(q).length) {
    err.value = '至少要把一个科目的「练习」打开，否则每天没有任务可发。';
    return;
  }
  const over = onSubjects(q).filter((s) => scoreBad(s.target) === 'over')[0];
  if (over) {
    err.value = '「' + over.name + '」的目标分填了 ' + over.target + ' 分，单科满分是 150 分，最多只能填 150。';
    return;
  }
  const bad = onSubjects(q).filter((s) => scoreBad(s.target) === 'zero')[0];
  if (bad) {
    err.value = '「' + bad.name + '」的目标分要填一个大于 0 的数字，或者留空不填。';
    return;
  }

  err.value = '';
  writeProfile({
    ...q,
    nickname: q.nickname.trim(),
    realName: q.realName.trim(),
    signature: q.signature.trim(),
    startTime: q.startTime || '20:00',
    subjects: q.subjects.map((s) => ({ ...s }))
  });
  saved.value = true;
  setTimeout(() => router.push({ name: 'me' }), 620);
}

onBeforeUnmount(() => {
  clearTimeout(autoTimer);
  clearTimeout(toastTimer);
});

const STAR = 'M12 3.5l2.65 5.37 5.93.86-4.29 4.18 1.01 5.9L12 17.02l-5.3 2.79 1.01-5.9-4.29-4.18 5.93-.86z';
</script>

<template>
  <div>
    <RouterLink class="pf-back reveal" :to="{ name: 'me' }">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M14.6 5.6 8.2 12l6.4 6.4"/>
      </svg>
      返回个人中心
    </RouterLink>

    <!-- 展示身份 -->
    <section class="section reveal">
      <div class="panel">
        <h2 class="pf-gtitle">展示身份</h2>

        <div class="pf-field">
          <span class="pf-label">头像</span>
          <div class="pf-ctrl" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
            <span v-if="!p.avatar" class="avatar" style="width:44px;height:44px;font-size:17px">{{ initial }}</span>
            <img v-else :src="p.avatar" alt="头像"
                 style="width:44px;height:44px;border-radius:50%;object-fit:cover">
            <button class="btn-ghost" type="button" @click="changeAvatar">更换头像</button>
            <span class="pf-hint" style="margin:0">正方形裁切后存 512×512，约 40KB</span>
          </div>
        </div>

        <div class="pf-field">
          <label class="pf-label" for="edNick">昵称<span class="req">*</span></label>
          <div class="pf-ctrl">
            <input id="edNick" v-model="p.nickname" class="pf-input" type="text" maxlength="12"
                   placeholder="例：小宇" autocomplete="off">
            <p class="pf-hint">最长 12 个字，家长在管理端也靠它认出你</p>
          </div>
        </div>

        <div class="pf-field">
          <label class="pf-label" for="edReal">真实姓名</label>
          <div class="pf-ctrl">
            <input id="edReal" v-model="p.realName" class="pf-input" type="text" maxlength="12"
                   placeholder="选填，只有家长能看到" autocomplete="off">
          </div>
        </div>

        <div class="pf-field">
          <span class="pf-label">性别</span>
          <div class="pf-ctrl">
            <div class="pf-seg">
              <button v-for="v in ['男', '女', '不填']" :key="v" type="button"
                      :class="{ on: p.gender === v }" @click="p.gender = v">{{ v }}</button>
            </div>
          </div>
        </div>

        <div class="pf-field">
          <label class="pf-label" for="edSign">个性签名</label>
          <div class="pf-ctrl">
            <textarea id="edSign" v-model="p.signature" class="pf-input" maxlength="40"
                      placeholder="不填就自动显示「年级 · 教材 · 主攻科目」"></textarea>
          </div>
        </div>
      </div>
    </section>

    <!-- 学业档案 -->
    <section class="section reveal">
      <div class="panel">
        <h2 class="pf-gtitle">学业档案 · 决定出题的难度与范围</h2>

        <div class="pf-field">
          <span class="pf-label">年级<span class="req">*</span></span>
          <div class="pf-ctrl">
            <div class="pf-seg">
              <button v-for="v in ['初一', '初二', '初三']" :key="v" type="button"
                      :class="{ on: p.grade === v }" @click="p.grade = v">{{ v }}</button>
            </div>
          </div>
        </div>

        <div class="pf-field">
          <span class="pf-label">学期<span class="req">*</span></span>
          <div class="pf-ctrl">
            <div class="pf-seg">
              <button v-for="v in ['上学期', '下学期']" :key="v" type="button"
                      :class="{ on: p.term === v }" @click="p.term = v">{{ v }}</button>
            </div>
          </div>
        </div>

        <div class="pf-field">
          <span class="pf-label">教材版本<span class="req">*</span></span>
          <div class="pf-ctrl">
            <div class="pf-chips">
              <button v-for="v in ['人教版', '北师大版', '苏科版', '沪科版', '外研版']" :key="v"
                      class="pf-chip" type="button" :class="{ on: p.textbook === v }"
                      @click="p.textbook = v">{{ v }}</button>
            </div>
            <p class="pf-hint">决定出题素材贴着哪个版本的课本</p>
          </div>
        </div>

        <div class="pf-field pf-field-wide">
          <span class="pf-label">科目与目标<span class="req">*</span></span>
          <div class="pf-ctrl">
            <div class="sb-head">
              <span>科目</span><span>重点</span><span>练习</span>
              <span>当前进度</span><span>目标分</span>
            </div>

            <div class="sb-list">
              <div v-for="s in p.subjects" :key="s.name" class="sb-row" :class="{ 'is-off': !s.on }">
                <span class="sb-name">{{ s.name }}</span>
                <button class="sb-star" :class="{ on: s.focus }" type="button"
                        :aria-pressed="s.focus ? 'true' : 'false'"
                        :title="s.focus ? '取消重点' : '设为重点科目'" @click="toggleFocus(s)">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path :d="STAR"/></svg>
                </button>
                <button class="sb-on" :class="{ on: s.on }" type="button"
                        :aria-pressed="s.on ? 'true' : 'false'" @click="toggleOn(s)">练</button>
                <input v-model="s.progress" class="pf-input sb-in sb-prog" type="text"
                       maxlength="12" autocomplete="off" placeholder="如 第 3 单元" :disabled="!s.on">
                <input :value="s.target" class="pf-input sb-in sb-score" type="number"
                       min="0" max="150" step="1" inputmode="numeric" placeholder="目标分"
                       :disabled="!s.on" :class="{ 'is-bad': scoreBad(s.target) === 'zero' }"
                       @input="onTargetInput(s, $event)">
              </div>
            </div>

            <div class="sb-total" :class="{ 'is-bad': !!(badCount || zeroCount) }">
              <span class="sb-total-lbl">目标总分</span>
              <b :class="{ 'is-bad': !!(badCount || zeroCount) }">{{ total }}</b><i>分</i>
              <span class="sb-total-note">{{ note }}</span>
            </div>

            <p class="pf-hint">
              「练习」决定每天出不出的这科的题；「重点」只是把它的比重调高，不出题的科目标了也不生效。
              进度留空则按学期自动推算。<br>
              目标分<b>单科满分 150</b>，填了就留在成绩曲线里当该科的目标线；填超 150 会被清空。
              这一块改完<b>立即保存</b>，不用等下面按钮。
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 学习节奏 -->
    <section class="section reveal">
      <div class="panel">
        <h2 class="pf-gtitle">学习节奏 · 决定计划的松紧</h2>

        <div class="pf-field pf-field-wide">
          <label class="pf-label" for="edExam">大考日期</label>
          <div class="pf-ctrl">
            <input id="edExam" v-model="p.examDate" class="pf-input" type="date">
            <p class="pf-hint">中考 / 期末 / 月考，填了才能按剩余天数倒排计划。各科要考到多少分，在上面「科目与目标」里逐科填。</p>
          </div>
        </div>

        <div class="pf-field">
          <label class="pf-label" for="edStart">开始时间</label>
          <div class="pf-ctrl">
            <input id="edStart" v-model="p.startTime" class="pf-input" type="time">
          </div>
        </div>

        <div class="pf-field">
          <span class="pf-label">每日题量</span>
          <div class="pf-ctrl">
            <div class="pf-seg">
              <button v-for="v in ['5', '10', '15', '20']" :key="v" type="button"
                      :class="{ on: p.dailyCount === v }" @click="p.dailyCount = v">{{ v }} 题</button>
            </div>
            <p class="pf-hint">按科目算，每天只轮 1–2 科</p>
          </div>
        </div>

        <div class="pf-field">
          <span class="pf-label">每周休息</span>
          <div class="pf-ctrl">
            <div class="pf-seg">
              <button v-for="v in ['周六', '周日', '不休息']" :key="v" type="button"
                      :class="{ on: p.restDay === v }" @click="p.restDay = v">{{ v }}</button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <p v-if="err" class="pf-err">{{ err }}</p>

    <div class="pf-savebar reveal">
      <button class="btn-brand" type="button" style="flex:1" :disabled="saved" @click="save">
        {{ saved ? '已保存' : '保存并返回' }}
      </button>
      <RouterLink class="btn-ghost" :to="{ name: 'me' }">取消</RouterLink>
    </div>

    <Teleport to="body">
      <div v-if="toastMsg" class="toast on">{{ toastMsg }}</div>
    </Teleport>
  </div>
</template>
