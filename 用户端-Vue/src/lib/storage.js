/* ============================================================
   安全存储
   —— 与旧原型 app.js 语义一致：localStorage 不可用时依次降级到
      sessionStorage → 内存，读写永不抛错（避免「登录后又被弹回登录页」）。
   —— qbank.js 里用的是 `typeof stGet === 'function'` 判断，所以这里必须
      把三个函数挂到 window，才能让它走同一套降级逻辑。
   ============================================================ */
const memStore = {};

export function stGet(k) {
  try { const v = localStorage.getItem(k); if (v !== null) return v; } catch (e) { /* noop */ }
  try { const v2 = sessionStorage.getItem(k); if (v2 !== null) return v2; } catch (e) { /* noop */ }
  return (k in memStore) ? memStore[k] : null;
}

export function stSet(k, v) {
  memStore[k] = v;
  try { localStorage.setItem(k, v); return; } catch (e) { /* noop */ }
  try { sessionStorage.setItem(k, v); } catch (e) { /* noop */ }
}

export function stDel(k) {
  delete memStore[k];
  try { localStorage.removeItem(k); } catch (e) { /* noop */ }
  try { sessionStorage.removeItem(k); } catch (e) { /* noop */ }
}

export function stGetJSON(k, fallback) {
  try {
    const raw = stGet(k);
    return raw ? (JSON.parse(raw) ?? fallback) : fallback;
  } catch (e) { return fallback; }
}

export function stSetJSON(k, v) { stSet(k, JSON.stringify(v)); }

/* 供 qbank.js / 旧代码复用（它按全局函数探测） */
if (typeof window !== 'undefined') {
  window.stGet = stGet;
  window.stSet = stSet;
  window.stDel = stDel;
}
