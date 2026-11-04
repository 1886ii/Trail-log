/* ============================================================
   路由级冒烟测试（jsdom + IIFE 单文件构建）
   ------------------------------------------------------------
   把 dist-smoke/smoke-bundle.js 以经典 <script> 注入 jsdom，
   逐页改 hash 并等待渲染，捕获运行时报错。
   用法：先 npx vite build --config vite.smoke.config.js，再 node scripts/smoke.mjs
   ============================================================ */
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

const BUNDLE = 'dist-smoke/smoke-bundle.js';
const bundle = readFileSync(BUNDLE, 'utf8');

const STUBS = `
window.matchMedia = window.matchMedia || function () {
  return { matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
};
window.scrollTo = function () {};
window.HTMLElement.prototype.scrollTo = function () {};
window.HTMLElement.prototype.scrollIntoView = window.HTMLElement.prototype.scrollIntoView || function () {};
(function () {
  var ctx = new Proxy({}, {
    get: function (t, k) {
      if (k === 'canvas') return {};
      return function () {
        if (k === 'createLinearGradient' || k === 'createRadialGradient') return { addColorStop: function () {} };
        if (k === 'measureText') return { width: 10 };
        return undefined;
      };
    },
    set: function () { return true; }
  });
  window.HTMLCanvasElement.prototype.getContext = function () { return ctx; };
})();
window.confirm = function () { return true; };
window.alert = function () {};
window.prompt = function () { return ''; };
window.__pageErrors = [];
window.addEventListener('error', function (e) {
  window.__pageErrors.push(String((e.error && e.error.stack) || e.message || 'script error'));
});
window.addEventListener('unhandledrejection', function (e) {
  window.__pageErrors.push('promise: ' + String((e.reason && e.reason.stack) || e.reason));
});
`;

const vc = new VirtualConsole();
vc.on('jsdomError', (e) => { /* 资源加载类的 jsdom 错误忽略 */ });
vc.forwardTo(console, { jsdomErrors: 'none' });

const dom = new JSDOM(
  `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
   <body><div id="app"></div>
   <script>${STUBS}</script>
   <script>${bundle.replace(/<\/script>/g, '<\\/script>')}</script>
   </body></html>`,
  {
    url: 'http://127.0.0.1:5178/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc
  }
);

const w = dom.window;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(1200);   /* 等首屏挂载 */

const PAGES = [
  ['#/home', '首页'],
  ['#/daily', '每日任务'],
  ['#/practice', '每日题目'],
  ['#/answer?id=q1', '作答·选择'],
  ['#/answer?id=q2', '作答·填空'],
  ['#/answer?id=m1', '作答·材料'],
  ['#/words', '单词'],
  ['#/reading', '阅读'],
  ['#/read?ch=3', '阅读正文'],
  ['#/essay', '作文'],
  ['#/essay-write?id=t1', '写作文·写作态'],
  ['#/essay-write?id=t2', '写作文·结果态'],
  ['#/essay-write?id=t3', '写作文·终评态'],
  ['#/calc', '每日计算'],
  ['#/all', '全科'],
  ['#/post', '发布记录'],
  ['#/my-posts?demo=1', '我的记录(演示)'],
  ['#/me', '个人中心'],
  ['#/me-edit', '编辑资料'],
  ['#/poster', '周报海报'],
  ['#/mistakes', '错题本'],
  ['#/mistake-review?demo=1', '错题复习'],
  ['#/mistake-review?demo=1&selftest&walk', '错题复习·走完']
];

let pass = 0, fail = 0;
for (const [hash, label] of PAGES) {
  w.__pageErrors.length = 0;
  w.location.hash = hash;
  await sleep(700);
  const errs = w.__pageErrors.slice();
  if (errs.length) {
    fail++;
    console.log('FAIL', label, '(' + hash + ')');
    errs.slice(0, 3).forEach((e) => console.log('   ', String(e).split('\n').slice(0, 3).join('\n    ')));
  } else {
    pass++;
    console.log('PASS', label);
  }
}

/* 顺带把错题复习的自检断言带出来 */
const st = w.document.body.getAttribute('data-selftest');
if (st) console.log('\nselftest:', st);

console.log('\n== smoke: ' + pass + ' pass, ' + fail + ' fail ==');
process.exit(fail ? 1 : 0);
