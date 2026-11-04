# 学迹 · 学生端（Vue 3 + Vite）

旧原型（`../用户端原型/`，纯 HTML 多页）的 Vue 化重写。**两套并存**：旧原型保留作对照与回退，迁移期间功能以旧版为准、逐页搬到这里。

## 启动

```bash
npm install        # 首次；.npmrc 已把 npm 缓存指到 D 盘
npm run dev        # http://127.0.0.1:5178
npm run build      # 产物在 dist/，可直接进 Spring Boot 的 static/
```

## 结构

```
index.html                入口（含 js-on class，与旧版一致）
vite.config.js            base:'./'，端口 5178，产物 ES2019
src/
  main.js                 装配：storage → 样式 → qbank/fx/emoji → 路由 → 主题
  App.vue                 外壳：登录页独立布局；内页 = 顶栏 + .content
  router/index.js         路由表 + 守卫（登录态/权限/body data-page/标题）
  styles/global.css       ← 旧原型 style.css 原样搬入（视觉唯一真源，勿手改）
  styles/vue.css          仅放 SPA 化补充（路由入场、button 化的菜单项等）
  lib/
    storage.js            安全存储（localStorage→session→内存），挂 window.stGet*
    session.js            登录态（演示账号表、ensureGuest 访客降级）
    perm.js               四档权限 + PAGE_MOD + 锁页判定 + ?perm= 调试参数
    theme.js              浅/深主题（FX.themeWipe 圆形扩散）
    nav.js                NAV 五格 + TOPBAR 标题 + 问候语
    icons.js              ICO 图标表（与旧版逐字一致）
    fmt.js                esc/plain/cut/ago/answerText 等显示工具
    qbank.js              题库与判分（旧文件原样 + ESM 桥接 export QB）
    fx.js                 视觉特效层（同上，export FX）
    emoji.js              表情面板数据（window.EMOJI）
    books.js / danmaku.js 书目与弹幕（旧数据层）
    essays.js             作文任务/佳作墙/评阅结果数据
    posts.js              记录数据层（xj-feed、可见范围、演示图）
    tunnel.js             时光隧道 Canvas 2D（命令式，createTunnel）
    profile.js            学生档案（xj-profile、九科表、头像压缩）
    scores.js             成绩曲线数据（xj-scores）
  components/
    AppTopBar.vue         顶栏：品牌 · 五格导航 · 主题 · 头像菜单（错题红点）
    PageHead.vue          内容区首行标题（首页动态问候）
    LockView.vue          无权限锁页
    GuestBar.vue          访客模式提示条
    PostCard.vue          记录卡片（折叠/九宫格/点赞/两级评论/表情入口）
    VIcon.vue             图标渲染
  styles/quill.snow.css   ← Quill 2 官方主题（必须在 global.css **之前** 引入）
  styles/poster.css       ← 海报页样式，?raw 导入后挂 <style>，导出复用同一份
  views/                  19 个页面视图，一页一文件
```

## 冒烟自检（无头环境替代方案）

```bash
npx vite build --config vite.smoke.config.js   # IIFE 单文件 → dist-smoke/
node scripts/smoke.mjs                         # jsdom 逐路由挂载断言
```

本机若连不上 127.0.0.1:5178（无头 Edge `ERR_CONNECTION_REFUSED`），`file://` 又会因 ES module 被 CORS 拦，
就走上面这条：IIFE 打包 + jsdom 注入，断言每条路由挂载无运行时错误。

## 迁移进度（旧原型 19 页 → 全部迁完）

| 页面 | 路由 | 说明 |
|---|---|---|
| login | `/login` | 校验顺序/抖动/记住设备/首次登录提示 |
| home | `/home` | 记录流 + 折叠 + 两级评论 + 表情面板 + 日历 + 每日一句 |
| daily | `/daily` | 六类任务卡 + 今日进度 |
| words | `/words` | 今日词单（艾宾浩斯排程）+ 翻卡/拼写 |
| practice | `/practice` | 题目列表 + 难度/知识点筛选 |
| answer | `/answer` | 作答（T1–T4 四种模板）+ 判定 + 讲解 |
| reading | `/reading` | 书目/章节列表 + 进度 |
| read | `/read` | 章节正文 + 阅读设置 + 弹幕 |
| essay | `/essay` | 作文任务卡（四步条）+ 优秀作文墙 + 全文 sheet |
| essay-write | `/essay-write` | 三态：写作（Quill 无关，纯文本/手写稿）/ AI 评阅 / 结果 |
| calc | `/calc` | 每日计算 10 题 + 拍照上传 + 演示评阅 |
| all | `/all` | 九科入口（三主科进页，六门 soon 弹窗）+ 四类引擎 |
| post | `/post` | Quill 2 + Markdown 快捷 + 气泡条 + 卡片图勾选 + 草稿 |
| my-posts | `/my-posts` | 时光隧道（Canvas 2D）+ 统计 + 筛选列表 + 可见范围 |
| me | `/me` | 资料卡 + 档案 + 成绩曲线（手写 SVG）+ 热力图 + 偏好 + 退出 |
| me-edit | `/me-edit` | 展示身份 / 学业档案 / 学习节奏；科目表即改即存 |
| poster | `/poster` | 周报海报 540×720 舞台 + 深色预览 + PNG 导出（`layout:'bare'`） |
| mistakes | `/mistakes` | 概览/今日待复习/四数/分布/清单筛选，`?demo=1` 出演示数据 |
| mistake-review | `/mistake-review` | 独立复习会话：判定→排程→小结，`?selftest&walk` 自检 |

`ComingSoon.vue` 已无任何路由引用（保留文件备新增页占位）。

## 关键约定（改代码前必读）

- **`body[data-page]` 是视觉命门**：global.css 里大量规则挂在 `body[data-page="xxx"]` 上，路由 afterEach 会把 `meta.page` 写进 body。新增页面必须给 `meta.page`，取值沿用旧原型的页面 id。
- **样式只改 global.css 对应分节**，与旧原型保持同源；Vue 侧只在 `vue.css` 放增量，禁止覆盖旧类。
- **qbank.js / fx.js 是 IIFE 原样搬入**：靠副作用挂 `window.QB` / `window.FX`，文件尾部追加了 ESM 桥接 export；升级时从旧原型重新复制再补两行即可，不要手改内部逻辑。
- **未登录不硬弹登录页**：拿不到会话自动降级为访客（`ensureGuest`），这是旧版刻意设计；访客可以浏览，发帖/草稿不落盘。
- **Quill 样式顺序不能动**：`main.js` 里 `styles/quill.snow.css` 必须在 `styles/global.css` 之前 import——global.css 有整段 `.ql-*` 覆盖，反了会把编辑器皮肤打回原样。Quill 本体用 `await import('quill')` 动态加载（单独 61KB gzip chunk）。
- **海报页是独立布局**：`meta.layout:'bare'` → App.vue 不套 `.app` 外壳；`poster.css` 用 `?raw` 导入、挂载时注入 `<style id="poster-style">`，导出 PNG 复用的就是这段文本。
- **三个"命令式重"的模块保持命令式**：Quill 编辑器、时光隧道（`lib/tunnel.js`）、成绩曲线（MeView 内手写 SVG）。Vue 只管外壳与数据，避免重写引入像素偏差。
- 调试参数：`?demo=1`（错题演示数据）、`?perm=readonly|learn|task`（模拟权限档）——写在 `#` 之前的 search 上。
- npm 缓存已通过 `.npmrc` 固定在 `D:/apps/workbuddycache/.workbuddy/npm-cache`，不占 C 盘。
