/* ============================================================
   留言弹幕墙 · 车道调度（无状态间距模型 v2）
   ------------------------------------------------------------
   渲染几何：.dm-item 是 left:100% 的绝对定位 + translateX(0→-dist)
   无限循环动画，渲染位置 x = W + marginLeft − 进度×dist
   （W=舞台宽，进度∈[0,1) 随时间匀速增长）。
   速度 = dist/时长 = W/DM_CROSS —— 与各自圈长无关，全墙恒同速。
   因此「同车道不重叠」的充要条件只有两条：
   ① 全车道共用同一个 dist（圈长）；
   ② 圈上按行进顺序相邻两车的间距 ≥ GAP。
   满足后同速同圈，间距永不变化 —— 不需要任何运行时状态机。
   旧版（两版原型皆然）的排队/冻结/巡检状态机在多车交互下自激振荡，
   反而制造堆叠，全部删除。新车插入 = 在圈上找/造一个空档：
   · 圈缝够宽 → 直接放进去，已有车一根毫毛都不动；
   · 都不够 → 扩圈（只拉伸圈缝），已有车位置分毫不变（仅换算相位）。
   新车总是放在圈缝里（右端车尾巴之后），从右缘外自然进场上墙。
   ============================================================ */

const DM_CROSS = 22;                 /* 跑完一个舞台宽度的基准秒数 */
const GAP = 48;                      /* 圈上相邻两车最小间距 */

/* 弹幕里把 emoji 放大显示（含 ZWJ 序列 / 变体选择符） */
const EMOJI_RE = /(\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic})*)/gu;

function escHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function richText(raw) {
  return escHtml(raw).replace(EMOJI_RE, '<b class="emj">$1</b>');
}

function lanesOf(w) { return w < 500 ? 4 : 5; }

const laneOf = (el) => Math.round((parseInt(el.style.top, 10) - 4) / 56);

/* 造一颗弹幕节点（初次渲染与新贴共用） */
function makeEl(m, idx, fallbackMeta) {
  let raw = String(m.t || '');
  if (raw.length > 60) raw = raw.slice(0, 60) + '…';
  const el = document.createElement('span');
  el.className = 'dm-item mh' + ((idx % 5) + 1);
  el.innerHTML = richText(raw) +
    '<i class="dm-meta">' + escHtml(m.meta || fallbackMeta) + '</i>';
  return el;
}

/* 圈长下限：装得下「舞台 + 最宽的车」，也装得下「全员总宽 + 间距」 */
function laneDist(W, ws) {
  let maxW = 0, sum = 0;
  ws.forEach((w) => { maxW = Math.max(maxW, w); sum += w; });
  return Math.max(W + maxW, sum + GAP * (ws.length + 1));
}

/* 由「期望渲染位置 x」反推动画负延迟（换算相位但不改变位置）。
   渲染位置 x = W + ml − 进度×dist → 进度 = (W + ml − x)/dist 归一到 [0,1) */
function delayForMl(x, ml, W, dist, dur) {
  let p = (W + ml - x) / dist;
  p = ((p % 1) + 1) % 1;
  return (-p * dur).toFixed(2) + 's';
}

/* 收集一条车道上所有车的实时渲染状态 */
function laneSnapshot(wall, lane) {
  const rect = wall.getBoundingClientRect();
  const out = [];
  wall.querySelectorAll('.dm-item').forEach((el) => {
    if (!el.style.top || laneOf(el) !== lane) return;
    out.push({
      el,
      w: el.offsetWidth,
      x: el.getBoundingClientRect().left - rect.left,   /* 当前渲染位置 */
      ml: parseFloat(el.style.marginLeft) || 0,
      dist: parseFloat(el.style.getPropertyValue('--dist')) || 0,
    });
  });
  return out;
}

const reduced = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* 初次进场：分车道 + 每道统一圈长 + 负延迟让「进场即满屏」 */
function layout(wall) {
  const items = wall.querySelectorAll('.dm-item');
  if (!items.length) return;
  if (reduced()) {                                    /* 减弱动效：静态平铺，交给 CSS */
    items.forEach((el) => { el.style.marginLeft = ''; });
    return;
  }
  const W = wall.clientWidth || 600;
  const lanes = lanesOf(W);
  wall.style.height = (lanes * 56) + 'px';

  const byLane = [];
  for (let i = 0; i < lanes; i++) byLane.push([]);
  items.forEach((el, i) => {
    const lane = i % lanes;
    el.style.top = (lane * 56 + 4) + 'px';
    el.style.marginLeft = '';
    byLane[lane].push(el);
  });

  byLane.forEach((list) => {
    const metas = list.map((el) => ({ el, w: el.offsetWidth }));
    const dist = laneDist(W, metas.map((m) => m.w));
    const dur = DM_CROSS * dist / W;
    /* 先按错开的负延迟算初始位置（纯数学），再左到右强制 GAP */
    const placed = metas.map((m, i) => {
      const delay = -(((i * 5.3) + dur / 2) % dur);
      return { el: m.el, w: m.w, x: W - dist * (-delay / dur) };
    }).sort((a, b) => a.x - b.x);
    let prevRight = -Infinity;
    placed.forEach((m) => {
      if (m.x < prevRight + GAP) m.x = prevRight + GAP;
      prevRight = m.x + m.w;
    });
    /* 链整体钳回圈内：链尾不得越过右缘，圈缝不得小于 GAP（整链左移，间距不破坏） */
    const first = placed[0], last = placed[placed.length - 1];
    const over = Math.max(last.x + last.w - W, last.x + last.w + GAP - first.x - dist, 0);
    placed.forEach((m) => {
      m.el.style.setProperty('--dist', dist + 'px');
      m.el.style.animationDuration = dur.toFixed(1) + 's';
      m.el.style.animationDelay = delayForMl(m.x - over, 0, W, dist, dur);
    });
  });
}

/* 悬停暂停整条车道（不是单条）：同圈长同速下，静止的悬停车必然被绕回车
   周期性碾过，只有整道同停同走，间距才恒定。挂 wall 上一次即可 */
function bindLaneHover(wall) {
  if (wall.__dmHover) return;
  wall.__dmHover = true;
  const laneEls = (lane) => [...wall.querySelectorAll('.dm-item')]
    .filter((el) => el.style.top && laneOf(el) === lane);
  wall.addEventListener('mouseover', (e) => {
    const t = e.target.closest('.dm-item');
    if (!t || !t.style.top) return;
    laneEls(laneOf(t)).forEach((el) => { el.style.animationPlayState = 'paused'; });
  });
  wall.addEventListener('mouseout', (e) => {
    const t = e.target.closest('.dm-item');
    if (!t || !t.style.top) return;
    const to = e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.dm-item');
    if (to && to.style.top && laneOf(to) === laneOf(t)) return;   /* 道内换车不恢复 */
    laneEls(laneOf(t)).forEach((el) => { el.style.animationPlayState = ''; });
  });
}

/* 整墙渲染（切换书 / 窗口尺寸变化时用） */
export function renderWall(wall, cards, fallbackMeta) {
  if (!wall) return;
  bindLaneHover(wall);
  if (!cards.length) {
    wall.innerHTML = '<p class="msg-empty">这面墙还空着 —— 写第一句话贴吧。</p>';
    wall.style.height = 'auto';
    return;
  }
  wall.innerHTML = '';
  cards.forEach((m, i) => wall.appendChild(makeEl(m, i, fallbackMeta)));
  layout(wall);
}

/* 新贴一条：只追加节点，不打断已有弹幕（一根毫毛都不动） */
export function appendWall(wall, msg, idx, fallbackMeta) {
  if (!wall) return;
  const empty = wall.querySelector('.msg-empty');
  if (empty) empty.remove();

  const el = makeEl(msg, idx, fallbackMeta);
  el.classList.add('dm-new');                        /* 醒目态：描边+光环+NEW 角标 */
  wall.insertBefore(el, wall.firstChild);
  if (reduced()) return;                             /* 减弱动效：静态平铺，不做调度 */

  const W = wall.clientWidth || 600;
  const lanes = lanesOf(W);
  wall.style.height = (lanes * 56) + 'px';
  const wNew = el.offsetWidth;                       /* dm-new 态更宽，按宽的算，偏保守 */

  /* 选道：谁扩圈代价最小（现有总宽最小）用谁 —— 天然均衡 */
  let best = 0, bestDist = Infinity;
  for (let i = 0; i < lanes; i++) {
    const ws = laneSnapshot(wall, i).filter((s) => s.el !== el).map((s) => s.w);
    const d = laneDist(W, ws.concat([wNew]));
    if (d < bestDist) { bestDist = d; best = i; }
  }
  el.style.top = (best * 56 + 4) + 'px';

  const others = laneSnapshot(wall, best).filter((s) => s.el !== el)
    .sort((a, b) => a.x - b.x);                      /* 行进顺序：最左 → 最右 */
  let dist, xNew;

  if (!others.length) {
    dist = Math.max(W + wNew, wNew + 2 * GAP);
    xNew = W;                                        /* 空道：从右缘正点进 */
  } else {
    const distOld = Math.max(...others.map((s) => s.dist));
    /* 圈上间隙：g[i] = 下一辆车头 − 本车尾；g[n] = 圈缝（最右车尾 → 最左车下一圈头） */
    const gaps = [];
    for (let i = 0; i < others.length - 1; i++) {
      gaps.push(others[i + 1].x - (others[i].x + others[i].w));
    }
    const wrapGap = others[0].x + distOld - (others[others.length - 1].x + others[others.length - 1].w);

    if (wrapGap >= wNew + 2 * GAP) {
      /* 圈缝装得下：原地放入（右端车尾 + GAP），已有车纹丝不动，圈长不变 */
      dist = distOld;
      xNew = others[others.length - 1].x + others[others.length - 1].w + GAP;
    } else {
      let gi = -1, gBest = -Infinity;
      gaps.forEach((g, i) => { if (g > gBest) { gBest = g; gi = i; } });
      if (gBest >= wNew + 2 * GAP) {
        /* 最大的道内空档装得下：原地放入，圈长不变 */
        dist = distOld;
        xNew = others[gi].x + others[gi].w + GAP;
      } else {
        /* 都装不下：扩圈（只拉伸圈缝，间距只增不减），放回圈缝 */
        dist = Math.max(distOld + wNew + 2 * GAP,
          laneDist(W, others.map((s) => s.w).concat([wNew])));
        xNew = others[others.length - 1].x + others[others.length - 1].w + GAP;
        /* 已有车位置分毫不变，仅按新圈长换算相位（速度 = W/DM_CROSS 恒定）。
           ⚠️ 必须用 clone 重建而不是改写样式：对运行中的 CSS 动画改
           delay/duration/--dist 并不会让动画从新 delay 起跑（实测落点偏差
           上百 px，位置语义完全失控），clone 出的新元素才严格按新 delay 定位 */
        const dur = DM_CROSS * dist / W;
        others.forEach((s) => {
          const fresh = s.el.cloneNode(true);
          fresh.style.setProperty('--dist', dist + 'px');
          fresh.style.animationDuration = dur.toFixed(1) + 's';
          fresh.style.animationDelay = delayForMl(s.x, s.ml, W, dist, dur);
          if (fresh.classList.contains('dm-new')) {
            setTimeout(() => { fresh.classList.remove('dm-new'); }, 5200);
          }
          s.el.parentNode.replaceChild(fresh, s.el);
        });
      }
    }
  }

  const ml = Math.max(0, xNew - W);
  const dur = DM_CROSS * dist / W;
  el.style.setProperty('--dist', dist + 'px');
  el.style.animationDuration = dur.toFixed(1) + 's';
  el.style.marginLeft = ml ? ml.toFixed(0) + 'px' : '';
  el.style.animationDelay = delayForMl(xNew, ml, W, dist, dur);

  setTimeout(() => { el.classList.remove('dm-new'); }, 5200);
}
