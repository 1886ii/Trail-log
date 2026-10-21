# Trail-log · 学迹

初中九门大模型辅助学习系统 —— **双端纯 Web 原型**（零框架、零构建，双击即可打开）。

闭环：`出题 → 作答 → 批改 → 讲解 → 数据沉淀 → 反哺出题`。

## 目录

| 目录 | 说明 | 默认端口 |
|---|---|---|
| `用户端原型/` | 学生端，19 个页面 + 5 格导航（首页·任务·阅读·作文·全学科） | 8791 |
| `管理端原型/` | 管理端（自用后台），16 个页面，与学生端**零共用文件** | 8792 |

两端数据都落在浏览器 `localStorage`，互不共享：用户端 `xj-*`，管理端 `xjadmin-*`。
原型期没有后端，`window.DB` 已是 API 客户端的形状，正式版换 Spring Boot 3 + Spring AI 时内部换异步实现即可。

## 本地预览

```bash
# 必须用 http 服务打开（file:// 下 localStorage 与 CDN 行为不一致）
cd 用户端原型 && python -m http.server 8791
cd 管理端原型 && python -m http.server 8792
```

- 学生端：<http://127.0.0.1:8791/index.html>
  - 演示账号：`jiayu / 815203`（全功能）、`yutong / 604712`（学习专注）、`xiaozhou / 390845`（仅看记录）
- 管理端：<http://127.0.0.1:8792/index.html>
  - 演示账号：`admin / xueji2026`
  - 任意页面加 `?preview` 可跳过登录

## 学生端页面

| 文件 | 模块 |
|---|---|
| `index.html` | 登录 |
| `home.html` | 首页（打卡、今日任务、记录流） |
| `daily.html` | 每日任务 |
| `practice.html` / `answer.html` | 每日题目 / 作答 |
| `mistakes.html` / `mistake-review.html` | 我的错题 / 错题复习（独立模块，不复用练习流程） |
| `words.html` | 单词（词书→单元，艾宾浩斯排程） |
| `reading.html` / `read.html` | 整本书阅读 / 章节正文 |
| `essay.html` / `essay-write.html` | 作文 / 写作文 |
| `all.html` / `calc.html` | 全科 / 每日计算 |
| `post.html` / `my-posts.html` | 发布记录 / 我的记录 |
| `me.html` / `me-edit.html` / `poster.html` | 个人中心 / 编辑资料 / 周报海报 |

## 管理端页面

| 文件 | 模块 |
|---|---|
| `index.html` | 登录 |
| `dashboard.html` | 总览 |
| `students.html` / `student.html` | 学生管理 / 学生详情（档案 + 用户端账号） |
| `tasks.html` | 任务发布（六类任务各自专属字段） |
| `qbank.html` | 题库与出题（配图） |
| `review.html` | 审核队列（AI 预筛 + 低置信人工） |
| `books.html` | 阅读书单（逐章编辑器 + 正文） |
| `words.html` | 单词表（词书 / 单元 / 词条录入） |
| `essays.html` | 作文批改（佳作库） |
| `submissions.html` | 作答记录 |
| `mistakes.html` | 错题本 |
| `posts.html` | 记录管理 |
| `ai.html` | AI 中枢（用量 / 供应商密钥 / 模型分配切换） |
| `settings.html` | 设置 |

## 技术栈与约定

- 纯 HTML + CSS + 原生 JS，无框架、无构建步骤；富文本用 Quill 2（CDN）。
- 版本号铁律：改任何 CSS / JS，当天全站 `?v=` 一起升（当前 `20261021c`）。
- 管理端 `style.css` 是单文件全局命名空间，新增类名前先确认没被占用。
- 设计文档（需求决策、题型模板、权限设计等）暂放在私有工作目录，未纳入本仓库。

## 阶段

原型期（当前）：本仓库内容为可点可走的交互原型，数据为演示种子。
正式版：Spring Boot 3 单端口同源托管双端（前端文件进 `static/`），按小程序兼容规范写接口（Token Bearer / 纯 JSON / CDN 绝对地址）。
