/* ============================================================
   表情面板（两处共用）：首页「记录评论」+ 阅读页「留言墙」
   - 6 个分类，共 240 个表情，全部是常见 Unicode 表情（手机/平板/电脑都能显示）
   - 纯 emoji 文本，存库就是普通字符串（utf8mb4 / UTF-8 直接存，无需特殊处理）
   - 用法：EMOJI.render(panelEl, { def: '笑脸' })
     渲染出「分类 tab + 表情网格」，点击表情由调用方自己处理（各页插入逻辑不同）
   ============================================================ */
window.EMOJI = (function () {
  var GROUPS = [
    { name: '笑脸', list: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲',
      '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘',
      '😋', '😛', '😜', '🤪', '🤗', '🤔', '🤨', '🧐', '😏',
      '😐', '😑', '😶', '🙄', '😬', '🥹', '🫠', '😴', '😪',
      '😢', '😭', '🥺', '😤', '😠', '😱', '😳', '🤯', '🤒'
    ] },
    { name: '手势', list: [
      '👍', '👎', '👏', '🙌', '🫶', '🤝', '🙏', '✌️', '🤞',
      '🤟', '🤙', '👌', '🤌', '🤏', '✊', '👊', '💪', '🖐️',
      '✋', '👋', '🫰', '☝️', '👆', '👇', '👈', '👉', '✍️',
      '🙇', '🤦', '🤷', '💁', '🫡'
    ] },
    { name: '学习', list: [
      '📚', '📖', '📕', '📗', '📘', '📙', '📝', '📄', '📃',
      '📑', '🔖', '🖊️', '🖋️', '✏️', '🖍️', '🎓', '🎒', '🏫',
      '🧮', '📐', '📏', '🔬', '🧪', '🔭', '🧭', '🗺️', '🌍',
      '🌏', '🧠', '💡', '🔍', '🔎', '⏰', '⏳', '⌛', '📊',
      '📈', '📉', '✅', '❌'
    ] },
    { name: '加油', list: [
      '🎉', '🎊', '🎈', '🎁', '✨', '🌟', '⭐', '💫', '🔥',
      '💯', '🚀', '🏅', '🥇', '🥈', '🥉', '👑', '🏆', '🎵',
      '🎶', '📣', '💥', '⚡', '🎇', '🎆', '🧨', '💐', '🎀',
      '🎯', '💝', '❤️', '🧡', '💛', '💚', '💙', '💜', '🤍', '💖',
      '💗', '💕'
    ] },
    { name: '自然', list: [
      '🌙', '☀️', '🌤️', '⛅', '☁️', '🌧️', '⛈️', '❄️', '🌊',
      '🌈', '🌱', '🌿', '🍀', '🌸', '🌺', '🌻', '🌷', '🌹',
      '🍁', '🍂', '🌾', '🐛', '🐝', '🦋', '🐌', '🐞', '🐢',
      '🐬', '🐳', '🐟', '🐠', '🐧', '🦊', '🐼', '🐨', '🐰',
      '🐱', '🐶', '🦉', '🐦', '🦄', '🐙'
    ] },
    { name: '生活', list: [
      '🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🍒', '🍑', '🥕',
      '🌽', '🍞', '🍚', '🍜', '🍝', '🍰', '🧁', '🍪', '🍫',
      '🍬', '🍭', '🍵', '🥛', '☕', '🍦', '🍿', '⚽', '🏀',
      '🏸', '🎨', '🎬', '🎤', '🎹', '🎮', '🧩', '🧸', '🎪',
      '🎠', '🛏️', '💤', '🕹️', '🎧', '📷'
    ] }
  ];

  var last = null;   /* 记住这次会话里最后用过的分类，两个面板之间也能延续 */

  function total() {
    var n = 0;
    GROUPS.forEach(function (g) { n += g.list.length; });
    return n;
  }

  /* 渲染面板：分类 tab + 表情网格（网格可竖向滚动） */
  function render(panel, opts) {
    if (!panel) return;
    opts = opts || {};
    var order = opts.order || GROUPS.map(function (g) { return g.name; });
    var def   = opts.def || order[0];
    var cur   = (last && order.indexOf(last) >= 0) ? last
              : (order.indexOf(def) >= 0 ? def : order[0]);

    panel.setAttribute('role', 'group');
    panel.setAttribute('aria-label', '表情');
    panel.innerHTML =
      '<div class="emoji-tabs">' + order.map(function (n) {
        return '<button type="button" class="emoji-tab" data-cat="' + n + '">' + n + '</button>';
      }).join('') + '</div>' +
      '<div class="emoji-grid"></div>';

    var grid = panel.querySelector('.emoji-grid');
    var tabs = panel.querySelectorAll('.emoji-tab');

    function paint() {
      var g = GROUPS.filter(function (x) { return x.name === cur; })[0] || GROUPS[0];
      grid.innerHTML = g.list.map(function (e) {
        return '<button type="button" class="emoji-cell" aria-label="' + e + '">' + e + '</button>';
      }).join('');
      grid.scrollTop = 0;
      Array.prototype.forEach.call(tabs, function (b) {
        b.classList.toggle('on', b.getAttribute('data-cat') === cur);
      });
    }
    paint();

    /* 切分类（只重画网格，不关面板、不抢输入框焦点） */
    panel.addEventListener('click', function (e) {
      var tab = e.target.closest('.emoji-tab');
      if (!tab) return;
      e.preventDefault();
      cur = tab.getAttribute('data-cat');
      last = cur;
      paint();
    });
  }

  return { GROUPS: GROUPS, render: render, total: total };
})();
