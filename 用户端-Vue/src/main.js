/* ============================================================
   入口
   ------------------------------------------------------------
   顺序有意义：
   1) storage    —— 先把 stGet/stSet 挂到 window，qbank.js 靠它判分/存取
   2) styles     —— 全站样式沿用旧原型 style.css，保证视觉零漂移
   3) qbank/fx   —— 两者是 IIFE，导入即执行并挂 window.QB / window.FX
   4) 主题       —— 在挂载前设 data-theme，避免首屏闪白
   ============================================================ */
import './lib/storage.js';
/* Quill 主题样式必须排在 global.css 之前：global.css 里有一整套 .ql-* 覆盖，
   顺序反了主题会把自定义工具条样式盖掉（旧原型也是 CDN link 在前、style.css 在后） */
import './styles/quill.snow.css';
import './styles/global.css';
import './styles/vue.css';
import './lib/qbank.js';
import './lib/fx.js';
import './lib/emoji.js';

import { createApp } from 'vue';
import App from './App.vue';
import router from './router/index.js';
import { initTheme } from './lib/theme.js';

document.documentElement.classList.add('js-on');
initTheme();

createApp(App).use(router).mount('#app');
