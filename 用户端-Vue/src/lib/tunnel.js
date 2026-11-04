/* ============================================================
   时光隧道 · 3D
   ------------------------------------------------------------
   纯手写针孔透视投影，不引 3D 库：相机停在隧道「最新」一端，
   travel = 已向深处（旧）穿梭的距离；卡片按黄金角螺旋挂壁，
   billboard 面向相机，深度雾 + 尽头光 + 飞掠粒子。
   逐帧 canvas 用命令式最稳，Vue 只提供画布与回调。
   ============================================================ */
import { TAG_COLOR, TAG_CHAR, visOf } from './posts.js';

export function createTunnel(opts) {
  const { canvas, wrap, bar, posEl, latestBtn, posts, snapMode, deepMode, firstImg, imgCount, htmlToText, pidOf, onOpen } = opts;
  if (!canvas || !posts.length) return { destroy() {} };

  const chrono = posts.slice().sort((a, b) => (a.id || 0) - (b.id || 0));
  const n = chrono.length;
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0, CX = 0, CY = 0, UNIT = 230;
  const FOCAL = 2.4, SPACING = 3.4, RX = 1.14, RY = 0.60;
  const maxTravel = (n - 1) * SPACING;

  let travel = snapMode ? 0 : maxTravel;
  let target = 0;
  if (deepMode) { travel = maxTravel; target = maxTravel; }
  let vT = 0;
  let dragging = false, moved = 0, lastX = 0, lastY = 0;
  let hoverI = -1, rects = [], lastKey = -1;
  let rt = travel;
  let raf = 0;

  function hash(str) {
    let h = 2166136261; str = String(str);
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) % 1000000) / 1000000;
  }
  function rgba(hex, a) {
    if (hex.charAt(0) !== '#') return hex;
    const nv = parseInt(hex.slice(1), 16);
    return 'rgba(' + (nv >> 16 & 255) + ',' + (nv >> 8 & 255) + ',' + (nv & 255) + ',' +
      Math.max(0, Math.min(1, a)) + ')';
  }

  const cards = chrono.map((p, i) => {
    const text = htmlToText(p.html);
    return {
      p, pid: pidOf(p, i),
      tag: p.tag || '图文记录',
      color: TAG_COLOR[p.tag] || '#B9C4FF',
      title: (p.title || text.slice(0, 18) || (imgCount(p) ? '图片记录' : '一条记录')),
      text,
      photo: firstImg(p), img: null,
      date: p.time || ''
    };
  });
  cards.forEach((c) => {
    if (!c.photo) return;
    const im = new Image();
    im.onload = () => { c.img = im; };
    im.src = c.photo;
    if (im.complete && im.naturalWidth) c.img = im;
  });

  cards.forEach((c, i) => {
    const a = i * 2.39996 + 0.7;
    c.ax = Math.cos(a) * RX;
    c.ay = Math.sin(a) * RY;
    c.z = (n - 1 - i) * SPACING;
  });

  const dust = [];
  const span = maxTravel + 80;
  for (let k = 0; k < 340; k++) {
    dust.push({
      x: (hash('dx' + k) * 2 - 1) * 3.0,
      y: (hash('dy' + k) * 2 - 1) * 2.0,
      wz: hash('dz' + k) * span,
      r: 0.5 + hash('dr' + k) * 1.25,
      a: 0.13 + hash('da' + k) * 0.5,
      warm: hash('dw' + k) > 0.86
    });
  }

  /* 联调 / 无头测试钩子 */
  window.__tun = {
    n, maxTravel,
    travel: () => travel,
    target: () => target,
    snap: () => { travel = target; },
    go: (t) => { target = Math.max(0, Math.min(maxTravel, t)); travel = target; },
    rects: () => rects,
    hover: () => hoverI,
    dust: () => dust.length,
    cards: () => cards.length
  };

  function depthOf(c) { return c.z - rt + SPACING; }
  function projS(d, ax, ay) {
    const s = FOCAL / Math.max(0.28, d);
    return { x: CX + ax * s * UNIT, y: CY + ay * s * UNIT, s };
  }
  function pathR(x, y, w, h, rT, rB) {
    rT = Math.min(rT, w / 2, h); rB = Math.min(rB == null ? rT : rB, w / 2, h);
    ctx.beginPath();
    ctx.moveTo(x + rT, y);
    ctx.arcTo(x + w, y, x + w, y + h, rT);
    ctx.lineTo(x + w, y + h - rB);
    ctx.arcTo(x + w, y + h, x, y + h, rB);
    ctx.lineTo(x + rB, y + h);
    ctx.arcTo(x, y + h, x, y + h - rB, rB);
    ctx.lineTo(x, y + rT);
    ctx.arcTo(x, y, x + w, y, rT);
    ctx.closePath();
  }

  function drawCard(c, d, i) {
    let fog = Math.max(0, Math.min(1, 1.35 - d / 15));
    const graze = d < SPACING ? Math.max(0, (d - 0.9) / (SPACING - 0.9)) : 1;
    fog *= graze;
    if (fog <= 0.02) return;
    const focus = Math.max(0.28, Math.min(1, (d - SPACING * 0.8) / (SPACING * 1.6)));
    const side = c.ax >= 0 ? 1 : -1;
    const pr = projS(d, c.ax * focus + (1 - graze) * 1.3 * side, c.ay * focus);
    const s = pr.s;
    const hov = (hoverI === i);
    const boost = W < 700 ? 1.32 : 1;
    const cw = 1.24 * UNIT * s * (hov ? 1.07 : 1) * boost;
    const ih = cw * 0.72;
    const bh = Math.max(11, cw * 0.155);
    const x = pr.x, yC = pr.y;
    const top = yC - (ih + bh) / 2;
    const rad = Math.max(3, cw * 0.075);
    const hasImg = !!(c.img && c.img.complete && c.img.naturalWidth);

    ctx.save();
    ctx.globalAlpha = fog;

    ctx.shadowColor = 'rgba(2,5,18,' + (0.55 * fog).toFixed(3) + ')';
    ctx.shadowBlur = 26 * s * boost;
    ctx.shadowOffsetY = 10 * s * boost;
    pathR(x - cw / 2, top, cw, ih + bh, rad, rad);
    ctx.fillStyle = 'rgba(251,252,255,.98)';
    ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

    ctx.save();
    pathR(x - cw / 2, top, cw, ih, rad, 0);
    ctx.clip();
    if (hasImg) {
      const im = c.img;
      const sc = Math.max(cw / im.naturalWidth, ih / im.naturalHeight);
      const dw = im.naturalWidth * sc, dh = im.naturalHeight * sc;
      ctx.drawImage(im, x - dw / 2, top + (ih - dh) / 2, dw, dh);
      if (d < SPACING * 2.8 && cw > 130) {
        const tg = ctx.createLinearGradient(0, top + ih * 0.60, 0, top + ih);
        tg.addColorStop(0, 'rgba(6,9,24,0)');
        tg.addColorStop(1, 'rgba(6,9,24,.72)');
        ctx.fillStyle = tg;
        ctx.fillRect(x - cw / 2, top, cw, ih);
        ctx.fillStyle = 'rgba(255,255,255,.96)';
        ctx.font = '600 ' + Math.max(10, cw * 0.085).toFixed(1) +
          'px -apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(c.title.slice(0, 16), x - cw / 2 + cw * 0.06, top + ih - cw * 0.055);
      }
    } else {
      const og = ctx.createLinearGradient(x, top, x, top + ih);
      og.addColorStop(0, rgba(c.color, 0.92));
      og.addColorStop(1, rgba(c.color, 0.45));
      ctx.fillStyle = og;
      ctx.fillRect(x - cw / 2, top, cw, ih);
      if (cw > 40) {
        ctx.font = '600 ' + (cw * 0.26).toFixed(1) +
          'px -apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(255,255,255,.94)';
        ctx.fillText(TAG_CHAR[c.tag] || '记', x, top + ih * 0.46);
        ctx.font = '700 ' + (cw * 0.72).toFixed(1) +
          'px -apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,.14)';
        ctx.fillText(TAG_CHAR[c.tag] || '记', x + cw * 0.26, top + ih * 0.86);
        ctx.font = '500 ' + Math.max(8, cw * 0.062).toFixed(1) +
          'px -apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = 'rgba(255,255,255,.85)';
        ctx.fillText(c.tag, x - cw / 2 + cw * 0.06, top + cw * 0.1);
      }
    }

    /* 可见范围角标 */
    if (cw > 104) {
      const vv = visOf(c.p);
      const vcol = vv === '公开' ? '#B7D2FF' : (vv === '家人可见' ? '#9FE7C0' : '#C9D1E8');
      const fs = Math.max(8, cw * 0.058);
      ctx.font = '600 ' + fs.toFixed(1) +
        'px -apple-system, "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
      const tw = ctx.measureText(vv).width;
      const pw = tw + fs * 1.5, ph = fs * 1.85;
      const px = x + cw / 2 - pw - cw * 0.045, py = top + cw * 0.045;
      ctx.fillStyle = 'rgba(6,9,24,.6)';
      pathR(px, py, pw, ph, ph / 2, ph / 2);
      ctx.fill();
      ctx.fillStyle = vcol;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(vv, px + pw / 2, py + ph / 2 + 0.5);
    }
    ctx.restore();

    const yB = top + ih + bh / 2;
    ctx.fillStyle = 'rgba(44,52,92,.86)';
    ctx.font = '500 ' + Math.max(8, bh * 0.46).toFixed(1) +
      'px -apple-system, "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText(c.date, x - cw / 2 + cw * 0.055, yB + 0.5);
    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.arc(x + cw / 2 - cw * 0.055, yB, Math.max(1.6, bh * 0.17), 0, 6.283);
    ctx.fill();

    if (hov) {
      pathR(x - cw / 2, top, cw, ih + bh, rad, rad);
      ctx.lineWidth = Math.max(1.2, cw * 0.012);
      ctx.strokeStyle = 'rgba(255,255,255,.95)';
      ctx.stroke();
    }
    ctx.restore();

    rects.push({ i, x: x - cw / 2, y: top, w: cw, h: ih + bh });
  }

  function syncInset() {
    const host = document.querySelector('.content');
    if (!host) return;
    const pr = wrap.getBoundingClientRect();
    const hr = host.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(host).paddingLeft) || 0;
    const inset = Math.max(12, Math.round(hr.left + pad - pr.left));
    wrap.style.setProperty('--sky-inset', inset + 'px');
  }

  function resize() {
    const dpr = window.devicePixelRatio || 1;
    W = wrap.clientWidth || 600;
    H = canvas.clientHeight || 560;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    CX = W / 2; CY = H * 0.48;
    UNIT = Math.min(W * 0.34, H * 0.44);
    syncInset();
  }

  let lastT = 0;
  function draw(now) {
    const dt = lastT ? Math.min(0.05, (now - lastT) / 1000) : 0.016;
    lastT = now;

    if (!dragging) {
      travel += (target - travel) * 0.078;
      travel += vT; vT *= 0.94;
      if (Math.abs(target - travel) < 0.001 && !vT) travel = target;
    }
    travel = Math.max(0, Math.min(maxTravel, travel));
    rt = travel + Math.sin(now / 2600) * 0.035;

    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'lighter';

    const cg = ctx.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * 0.62);
    cg.addColorStop(0, 'rgba(120,150,255,.20)');
    cg.addColorStop(0.4, 'rgba(90,116,230,.09)');
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg; ctx.fillRect(0, 0, W, H);

    const dzE = maxTravel + SPACING * 4 - rt + SPACING;
    const sE = FOCAL / Math.max(0.3, dzE);
    const rE = Math.max(56, UNIT * sE * 4.6) * (0.92 + 0.08 * Math.sin(now / 1900));
    const eg = ctx.createRadialGradient(CX, CY, 0, CX, CY, rE);
    eg.addColorStop(0, 'rgba(238,244,255,.85)');
    eg.addColorStop(0.22, 'rgba(190,210,255,.34)');
    eg.addColorStop(0.58, 'rgba(120,150,255,.12)');
    eg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = eg;
    ctx.fillRect(CX - rE, CY - rE, rE * 2, rE * 2);

    for (let k = 0; k < 9; k++) {
      const dz = k * SPACING * 1.6 - rt + SPACING * 1.4;
      if (dz < 1) continue;
      const s = FOCAL / dz;
      const rr = 2.05 * s * UNIT;
      const a = Math.max(0.012, Math.min(0.10, 0.16 - k * 0.017));
      const bg = ctx.createRadialGradient(CX, CY, rr * 0.55, CX, CY, rr);
      bg.addColorStop(0, 'rgba(0,0,0,0)');
      bg.addColorStop(0.75, 'rgba(130,160,255,' + a.toFixed(3) + ')');
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(CX - rr, CY - rr, rr * 2, rr * 2);
    }

    dust.forEach((d) => {
      const dz = d.wz - rt + SPACING;
      if (dz < 0.34 || dz > 58) return;
      const pr = projS(dz, d.x, d.y);
      const a = d.a * Math.max(0, Math.min(1, 1.5 - dz / 26)) * 1.35;
      ctx.fillStyle = rgba(d.warm ? '#FFE3B8' : '#DCE6FF', a);
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, Math.max(0.6, d.r * pr.s * 1.8), 0, 6.283);
      ctx.fill();
    });

    ctx.globalCompositeOperation = 'source-over';
    rects = [];
    const order = [];
    cards.forEach((c, i) => {
      const d = depthOf(c);
      if (d > 46) return;
      order.push({ c, d, i });
    });
    order.sort((a, b) => b.d - a.d);
    order.forEach((o) => drawCard(o.c, o.d, o.i));
    ctx.globalCompositeOperation = 'source-over';

    const key = Math.round(target * 4);
    if (key !== lastKey) {
      lastKey = key;
      const idx = Math.max(0, Math.min(n - 1, n - 1 - Math.round(target / SPACING)));
      bar.style.width = (maxTravel ? (target / maxTravel * 100) : 0).toFixed(1) + '%';
      posEl.textContent = '滚动 / 上下拖拽穿梭 · 点一张照片回看 · 第 ' + (idx + 1) + ' / ' + n + ' 张';
    }

    raf = requestAnimationFrame(draw);
  }

  function pick(mx, my) {
    let best = -1, bd = 1e9;
    rects.forEach((r) => {
      if (mx < r.x || mx > r.x + r.w || my < r.y || my > r.y + r.h) return;
      const dx = mx - (r.x + r.w / 2), dy = my - (r.y + r.h / 2);
      const dd = dx * dx + dy * dy;
      if (dd < bd) { bd = dd; best = r.i; }
    });
    return best;
  }

  function onPointerDown(e) {
    dragging = true; moved = 0;
    lastX = e.clientX; lastY = e.clientY;
    vT = 0;
    canvas.classList.add('dragging');
    canvas.setPointerCapture(e.pointerId);
  }
  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    if (dragging) {
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      const step = (-dy) * SPACING * 0.0042 + (-dx) * SPACING * 0.0016;
      target = Math.max(0, Math.min(maxTravel, target + step));
      vT = step * 0.55;
      hoverI = -1;
      return;
    }
    hoverI = pick(mx, my);
    canvas.style.cursor = hoverI >= 0 ? 'pointer' : '';
  }
  function onPointerUp(e) {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove('dragging');
    if (moved < 6) {
      const rect = canvas.getBoundingClientRect();
      const hi = pick(e.clientX - rect.left, e.clientY - rect.top);
      if (hi >= 0 && onOpen) onOpen(cards[hi]);
    }
  }
  function onPointerCancel() { dragging = false; canvas.classList.remove('dragging'); }
  function onPointerLeave() { if (!dragging) { hoverI = -1; canvas.style.cursor = ''; } }
  function onWheel(e) {
    e.preventDefault();
    target = Math.max(0, Math.min(maxTravel, target + e.deltaY * 0.0016 * SPACING));
    vT = 0;
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  if (latestBtn) latestBtn.addEventListener('click', () => { target = 0; vT = 0; });
  window.addEventListener('resize', resize);
  window.addEventListener('load', syncInset);   /* 与旧版一致：首屏图片/字体就位后再对齐一次出血 */

  resize();
  setTimeout(() => {
    document.body.setAttribute('data-tun',
      'n=' + n + ';travel=' + Math.round(travel) + ';rects=' + rects.length +
      ';dust=' + dust.length + ';imgs=' + cards.filter((c) => !!c.img).length);
  }, 600);
  raf = requestAnimationFrame(draw);

  return {
    cards,
    destroy() {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', resize);
      window.removeEventListener('load', syncInset);
      document.body.removeAttribute('data-tun');
    }
  };
}
