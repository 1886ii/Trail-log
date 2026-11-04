/* ============================================================
   主题（浅色 / 深色）
   —— 深色值写在 CSS 的 [data-theme="dark"] 上，这里只管切属性 + 存偏好。
   ============================================================ */
import { ref } from 'vue';
import { stGet, stSet } from './storage.js';

const THEME_KEY = 'xj-theme';

export const theme = ref(stGet(THEME_KEY) || 'light');

export function applyTheme(t) {
  theme.value = t === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', theme.value);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme.value === 'dark' ? '#0F1115' : '#F5F6F8');
}

export function toggleTheme(ev) {
  const next = theme.value === 'dark' ? 'light' : 'dark';

  /* 从点击位置圆形扩散；降级时直接切换 */
  let x = window.innerWidth - 30;
  let y = 30;
  const host = ev && (ev.currentTarget || ev.target);
  if (host && host.getBoundingClientRect) {
    const r = host.getBoundingClientRect();
    x = r.left + r.width / 2;
    y = r.top + r.height / 2;
  }

  const wipe = () => {
    stSet(THEME_KEY, next);
    applyTheme(next);
  };

  const FX = window.FX;
  if (FX && FX.themeWipe) FX.themeWipe(x, y, wipe);
  else wipe();
}

export function initTheme() {
  applyTheme(theme.value);
}
