/* ============================================================
   学迹 · 视觉特效层（零依赖）
   ------------------------------------------------------------
   1) 星空背景      canvas：星点 + 闪烁 + 视差 + 流星 + 星云
   2) 主题切换      圆形扩散（View Transitions API，可降级）
   3) 卡片光晕      鼠标跟随的 spotlight
   4) 数字滚动      [data-count] 元素入场时 count-up
   5) 完成反馈      勾选待办时的粒子爆点
   6) 滚动入场      区块淡入上浮
   ------------------------------------------------------------
   全部为「渐进增强」：JS 不跑或系统开了减少动效，页面照常可用。
   ============================================================ */
var FX = (function () {

  var reduce = !!(window.matchMedia &&
                 window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ============================================================
     1. 星空背景
     ============================================================ */
  var sky = {
    cv: null, ctx: null, dpr: 1, w: 0, h: 0,
    stars: [], meteors: [], nextMeteor: 0,
    raf: 0, px: 0, py: 0, tpx: 0, tpy: 0, sy: 0,
    on: false
  };

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function skyResize() {
    sky.dpr = Math.min(2, window.devicePixelRatio || 1);
    sky.w = window.innerWidth;
    sky.h = window.innerHeight;
    sky.cv.width  = Math.round(sky.w * sky.dpr);
    sky.cv.height = Math.round(sky.h * sky.dpr);
    sky.cv.style.width  = sky.w + 'px';
    sky.cv.style.height = sky.h + 'px';
    sky.ctx.setTransform(sky.dpr, 0, 0, sky.dpr, 0, 0);
  }

  function skyBuild() {
    var n = Math.round(Math.min(160, Math.max(46, (sky.w * sky.h) / 13000)));
    var out = [];
    for (var i = 0; i < n; i++) {
      var layer = Math.random() < 0.5 ? 0.35 : (Math.random() < 0.62 ? 0.7 : 1);
      out.push({
        x: Math.random() * sky.w,
        y: Math.random() * sky.h,
        r: (0.45 + Math.random() * 1.15) * layer,
        a: 0.22 + Math.random() * 0.62,
        ph: Math.random() * 6.2832,
        sp: 0.35 + Math.random() * 1.5,          /* 闪烁频率 */
        vy: (0.18 + Math.random() * 0.9) * layer, /* 缓慢上浮 */
        layer: layer
      });
    }
    sky.stars = out;
  }

  function spawnMeteor() {
    var fromLeft = Math.random() < 0.62;
    sky.meteors.push({
      x: fromLeft ? Math.random() * sky.w * 0.55 : sky.w * (0.45 + Math.random() * 0.55),
      y: Math.random() * sky.h * 0.4,
      vx: (fromLeft ? 1 : -1) * (4.2 + Math.random() * 3.2),
      vy: 2.2 + Math.random() * 1.8,
      life: 0,
      max: 62 + Math.random() * 34
    });
  }

  function skyDraw(ts) {
    var c = sky.ctx;
    if (!c) return;
    var w = sky.w, h = sky.h;

    c.clearRect(0, 0, w, h);

    var dark  = isDark();
    var rgb   = dark ? '255,255,255' : '52,98,196';
    var amax  = dark ? 1 : 0.5;

    /* 指针视差：平滑跟随 */
    sky.px += (sky.tpx - sky.px) * 0.06;
    sky.py += (sky.tpy - sky.py) * 0.06;

    var t = ts * 0.001, i, s, tw, a, x, y;

    for (i = 0; i < sky.stars.length; i++) {
      s  = sky.stars[i];
      tw = 0.5 + 0.5 * Math.sin(t * s.sp + s.ph);
      a  = s.a * (0.32 + 0.68 * tw) * amax;

      x = s.x + sky.px * 16 * s.layer;
      x = ((x % w) + w) % w;

      y = s.y - t * s.vy * 8 + sky.py * 12 * s.layer - sky.sy * 0.05 * s.layer;
      y = ((y % h) + h) % h;

      if (s.r > 1.05) {                       /* 亮星带光晕 */
        var g = c.createRadialGradient(x, y, 0, x, y, s.r * 4);
        g.addColorStop(0, 'rgba(' + rgb + ',' + (a * 0.34).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + rgb + ',0)');
        c.beginPath();
        c.arc(x, y, s.r * 4, 0, 6.2832);
        c.fillStyle = g;
        c.fill();
      }

      c.beginPath();
      c.arc(x, y, s.r, 0, 6.2832);
      c.fillStyle = 'rgba(' + rgb + ',' + a.toFixed(3) + ')';
      c.fill();
    }

    /* --- 流星 --- */
    if (!reduce && ts > sky.nextMeteor) {
      sky.nextMeteor = ts + 5200 + Math.random() * 9000;
      spawnMeteor();
    }

    for (i = sky.meteors.length - 1; i >= 0; i--) {
      var m = sky.meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life++;

      var fade = 1 - m.life / m.max;
      if (fade <= 0 || m.x < -260 || m.x > w + 260 || m.y > h + 260) {
        sky.meteors.splice(i, 1);
        continue;
      }

      var tx = m.x - m.vx * 11, ty = m.y - m.vy * 11;
      var lg = c.createLinearGradient(m.x, m.y, tx, ty);
      var head = (dark ? 0.85 : 0.42) * fade;
      lg.addColorStop(0, 'rgba(255,255,255,' + head.toFixed(3) + ')');
      lg.addColorStop(0.35, 'rgba(150,190,255,' + (head * 0.5).toFixed(3) + ')');
      lg.addColorStop(1, 'rgba(150,190,255,0)');

      c.beginPath();
      c.moveTo(m.x, m.y);
      c.lineTo(tx, ty);
      c.strokeStyle = lg;
      c.lineWidth = 1.7;
      c.lineCap = 'round';
      c.stroke();

      c.beginPath();
      c.arc(m.x, m.y, 1.5, 0, 6.2832);
      c.fillStyle = 'rgba(255,255,255,' + head.toFixed(3) + ')';
      c.fill();
    }
  }

  function skyLoop(ts) {
    if (!sky.on) return;
    skyDraw(ts || 0);
    sky.raf = window.requestAnimationFrame(skyLoop);
  }

  function skyStart() {
    if (sky.on || reduce) return;
    sky.on = true;
    sky.raf = window.requestAnimationFrame(skyLoop);
  }
  function skyStop() {
    sky.on = false;
    if (sky.raf) window.cancelAnimationFrame(sky.raf);
    sky.raf = 0;
  }

  function skyInit() {
    if (sky.cv) return;

    var host = document.createElement('div');
    host.id = 'sky';
    host.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(host, document.body.firstChild);

    var cv = document.createElement('canvas');
    host.appendChild(cv);

    sky.cv  = cv;
    sky.ctx = cv.getContext('2d');

    skyResize();
    skyBuild();

    window.addEventListener('resize', function () {
      skyResize(); skyBuild();
      if (reduce) skyDraw(0);
    }, { passive: true });

    window.addEventListener('scroll', function () {
      sky.sy = window.scrollY || window.pageYOffset || 0;
    }, { passive: true });

    window.addEventListener('pointermove', function (e) {
      sky.tpx = (e.clientX / window.innerWidth  - 0.5) * 2;
      sky.tpy = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) skyStop();
      else if (!reduce) skyStart();
    });

    if (reduce) { skyDraw(0); return; }   /* 尊重减少动效：只画一帧静态星空 */
    skyStart();
  }

  /* 主题变化后重画一帧，避免残留上一主题的颜色 */
  function skyRefresh() {
    if (reduce) { skyDraw(0); return; }
    if (!sky.on) skyStart();
  }

  /* ============================================================
     2. 主题切换：圆形扩散
     ============================================================ */
  function themeWipe(x, y, apply) {
    if (reduce || !document.startViewTransition) { apply(); skyRefresh(); return; }

    try {
      var t = document.startViewTransition(apply);
      t.ready.then(function () {
        var w = window.innerWidth, h = window.innerHeight;
        var r = Math.hypot(Math.max(x, w - x), Math.max(y, h - y));
        document.documentElement.animate(
          { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)',
                       'circle(' + r + 'px at ' + x + 'px ' + y + 'px)'] },
          { duration: 560, easing: 'cubic-bezier(.4,0,.2,1)',
            pseudoElement: '::view-transition-new(root)' }
        );
      });
      t.finished.then(skyRefresh, skyRefresh);
    } catch (e) {
      apply();
      skyRefresh();
    }
  }

  /* ============================================================
     3. 卡片光晕（鼠标跟随 spotlight）
     ============================================================ */
  var SPOT_SEL = '.card, .todo, .quick, .stat, .panel, .book';

  function spotlight(root) {
    if (reduce) return;
    (root || document).querySelectorAll(SPOT_SEL).forEach(function (el) {
      if (el.__spot) return;
      el.__spot = true;
      el.classList.add('has-spot');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty('--mx', ((e.clientX - r.left) / r.width  * 100).toFixed(1) + '%');
        el.style.setProperty('--my', ((e.clientY - r.top)  / r.height * 100).toFixed(1) + '%');
      }, { passive: true });
    });
  }

  /* ============================================================
     4. 数字滚动
     ============================================================ */
  function countUp(el, to, dur) {
    if (!el) return;
    to = Number(to) || 0;
    if (reduce) { el.textContent = to; return; }

    var from = Number(el.__v || 0);
    if (from === to) { el.textContent = to; return; }
    el.__v = to;

    dur = dur || 720;
    var t0 = performance.now();

    function step(now) {
      var p = Math.min(1, (now - t0) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(from + (to - from) * e);
      if (p < 1) window.requestAnimationFrame(step);
      else el.textContent = to;
    }
    window.requestAnimationFrame(step);
  }

  /* ============================================================
     5. 粒子爆点（勾选完成时）
     ============================================================ */
  var BURST_COLORS = ['#4A83FF', '#3DD68C', '#8DB0FF', '#F0B429'];

  function burst(x, y, n) {
    if (reduce) return;
    n = n || 11;

    var wrap = document.createElement('div');
    wrap.className = 'fx-burst';
    wrap.style.left = x + 'px';
    wrap.style.top  = y + 'px';

    for (var i = 0; i < n; i++) {
      var d = document.createElement('i');
      var ang = (i / n) * 6.2832 + Math.random() * 0.8;
      var dist = 20 + Math.random() * 20;
      d.style.setProperty('--dx', (Math.cos(ang) * dist).toFixed(1) + 'px');
      d.style.setProperty('--dy', (Math.sin(ang) * dist).toFixed(1) + 'px');
      d.style.background = BURST_COLORS[i % BURST_COLORS.length];
      d.style.animationDelay = (Math.random() * 70).toFixed(0) + 'ms';
      wrap.appendChild(d);
    }

    document.body.appendChild(wrap);
    window.setTimeout(function () { wrap.remove(); }, 820);
  }

  function burstFrom(el, n) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, n);
  }

  /* ============================================================
     6. 滚动入场
     ------------------------------------------------------------
     约定：入场元素在 HTML 里就带 class="reveal"（不是 JS 后加），
     配合 <head> 里的 js-on 标记，首屏第一帧就是「待入场」状态，
     不会出现「先显示 → 消失 → 再淡入」的闪烁。
     JS 不可用 / 减少动效 → 直接全部显示。
     ============================================================ */
  function reveal(root) {
    var els = (root || document).querySelectorAll('.reveal');
    if (!els.length) return;

    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        /* 入场时顺手把 [data-count] 跑起来 */
        var scope = en.target.querySelectorAll ? en.target.querySelectorAll('[data-count]') : [];
        Array.prototype.forEach.call(scope, function (n) {
          countUp(n, n.getAttribute('data-count'));
        });
        if (en.target.getAttribute && en.target.getAttribute('data-count') !== null) {
          countUp(en.target, en.target.getAttribute('data-count'));
        }
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });

    Array.prototype.forEach.call(els, function (e) { io.observe(e); });

    /* 保险：首屏附近若有元素迟迟没被触发（任何环境异常），
       1.5s 后直接放开，保证内容永远不会卡在透明状态 */
    window.setTimeout(function () {
      Array.prototype.forEach.call(els, function (e) {
        if (e.classList.contains('in')) return;
        var r = e.getBoundingClientRect();
        if (r.top < window.innerHeight * 1.25) {
          e.classList.add('in');
          var sc = e.querySelectorAll('[data-count]');
          Array.prototype.forEach.call(sc, function (n) { countUp(n, n.getAttribute('data-count')); });
        }
      });
    }, 1500);
  }

  /* ============================================================
     7. 环形进度（成长 / 单词 页用）
     ============================================================ */
  function ring(el, pct) {
    if (!el) return;
    var c = el.querySelector('circle.val');
    if (!c) return;
    pct = Math.max(0, Math.min(100, Number(pct) || 0));
    if (el.__pct === pct) { el.setAttribute('aria-label', pct + '%'); return; }
    el.__pct = pct;

    var r = Number(c.getAttribute('r'));
    var len = 6.2832 * r;
    c.style.strokeDasharray = len.toFixed(1);
    el.setAttribute('aria-label', pct + '%');

    if (reduce) { c.style.strokeDashoffset = (len * (1 - pct / 100)).toFixed(1); return; }

    c.style.transition = 'none';
    c.style.strokeDashoffset = len.toFixed(1);
    window.setTimeout(function () {
      c.style.transition = 'stroke-dashoffset .95s cubic-bezier(.4,0,.2,1)';
      c.style.strokeDashoffset = (len * (1 - pct / 100)).toFixed(1);
    }, 130);
  }

  /* 入场，按视口宽度挑一个稍小的幅度 */
  function init() {
    skyInit();
    spotlight();
    reveal();
    document.querySelectorAll('[data-ring]').forEach(function (el) {
      ring(el, Number(el.getAttribute('data-ring')));
    });
  }

  return {
    init: init,
    skyRefresh: skyRefresh,
    themeWipe: themeWipe,
    countUp: countUp,
    burst: burst,
    burstFrom: burstFrom,
    spotlight: spotlight,
    reveal: reveal,
    ring: ring,
    reduced: reduce
  };
})();
