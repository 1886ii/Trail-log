/* ============================================================
   记录（帖子）数据层
   ------------------------------------------------------------
   首页动态 / 我的记录 / 发布页共用 localStorage['xj-feed']。
   正式版换成 GET /api/posts + POST /api/posts，字段保持不变。
   ============================================================ */

export const TAGS = ['全部', '图文记录', '学习笔记', '随感'];
export const TAG_COLOR = { '图文记录': '#6C8DFF', '学习笔记': '#3DD68C', '随感': '#FFB65C' };
export const TAG_CHAR = { '图文记录': '图', '学习笔记': '笔', '随感': '随' };

export const VIS = [
  { v: '仅自己', ico: '🔒', cls: 'me', desc: '只有你自己能看到这条记录' },
  { v: '家人可见', ico: '👪', cls: 'fam', desc: '家长端可见，其他人看不到' },
  { v: '公开', ico: '🌐', cls: 'pub', desc: '所有人都能看到这条记录' }
];

export function visMeta(v) {
  return VIS.find((o) => o.v === v) || VIS[0];
}
export function visOf(p) { return (p && p.vis) || '仅自己'; }

export function loadPosts() {
  try { return JSON.parse(localStorage.getItem('xj-feed') || '[]'); } catch (e) { return []; }
}
export function savePosts(list) {
  try { localStorage.setItem('xj-feed', JSON.stringify(list)); return true; } catch (e) { return false; }
}

export function htmlToText(html) {
  const d = document.createElement('div');
  d.innerHTML = html || '';
  d.querySelectorAll('img').forEach((im) => im.remove());
  return (d.textContent || '').replace(/\s+/g, ' ').trim();
}

export function imgCount(p) {
  if (p.imgs && p.imgs.length) return p.imgs.length;
  const d = document.createElement('div');
  d.innerHTML = p.html || '';
  return d.querySelectorAll('img').length;
}

export function firstImg(p) {
  if (p.noCardImgs) return '';
  if (p.imgs && p.imgs.length && typeof p.imgs[0] === 'string') return p.imgs[0];
  if (p.cover) return p.cover;
  const m = /<img[^>]*\ssrc="([^"]+)"/i.exec(p.html || '');
  return m ? m[1] : '';
}

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function pidOf(p, i) { return p.id != null ? String(p.id) : 'i' + i; }

/* 演示图片：本地 SVG 渐变远山。data URI 里裸 # 会被当 fragment → 必须 %23 */
export function demoImg(c1, c2, c3) {
  const cc = (c) => c.replace('#', '%23');
  const A = cc(c1), B = cc(c2), C = cc(c3);
  const svg = "<svg xmlns='http://www.w3.org/2000/svg' width='640' height='480'>" +
    "<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'>" +
    "<stop offset='0' stop-color='" + A + "'/><stop offset='0.62' stop-color='" + B + "'/>" +
    "<stop offset='1' stop-color='" + C + "'/></linearGradient></defs>" +
    "<rect width='640' height='480' fill='url(%23g)'/>" +
    "<circle cx='480' cy='120' r='46' fill='rgba(255,250,235,0.92)'/>" +
    "<path d='M0 340 L150 240 L290 330 L430 250 L640 360 L640 480 L0 480 Z' fill='rgba(20,30,58,0.55)'/>" +
    "<path d='M0 400 L180 320 L360 405 L520 330 L640 410 L640 480 L0 480 Z' fill='rgba(12,18,40,0.72)'/>" +
    "<circle cx='90' cy='90' r='1.6' fill='rgb(255,255,255)' opacity='0.85'/>" +
    "<circle cx='210' cy='60' r='1.2' fill='rgb(255,255,255)' opacity='0.6'/>" +
    "<circle cx='330' cy='110' r='1.5' fill='rgb(255,255,255)' opacity='0.75'/>" +
    "<circle cx='560' cy='70' r='1.2' fill='rgb(255,255,255)' opacity='0.6'/></svg>";
  return 'data:image/svg+xml,' + svg;
}

/* ?demo 的六条演示记录 */
export function seedDemoPosts() {
  const p1 = demoImg('#FFD9A0', '#F0906A', '#5A3860');
  const p2 = demoImg('#9FD8FF', '#5C8DE0', '#1E2A5E');
  const p3 = demoImg('#C9F0E8', '#5FB8A8', '#204A58');
  const p4 = demoImg('#E8D8FF', '#A07BD8', '#30245E');
  const p5 = demoImg('#FFE9C4', '#F0B060', '#6A3A28');
  return [
    { id: 1756600000000, time: '8月 31日', tag: '图文记录', title: '第一次搭纸桥', likes: 12, cmts: [], vis: '家人可见',
      cover: p1, html: '用报纸和胶带搭了一座纸桥，压了三本字典还没塌。<img src="' + p1 + '">' },
    { id: 1757600000000, time: '9月 12日', tag: '学习笔记', title: '英语不规则动词表', likes: 9, cmts: [], vis: '仅自己',
      html: '把过去式和过去分词整理成一张表，明天默写。' },
    { id: 1758400000000, time: '9月 21日', tag: '随感', title: '晚自习后的操场', likes: 15, cmts: [], vis: '公开',
      cover: p2, html: '跑完八百米躺在草坪上，风吹过来的时候什么都不想。<img src="' + p2 + '">' },
    { id: 1759200000000, time: '9月 30日', tag: '图文记录', title: '园区看的那片湖', likes: 21, cmts: [], vis: '仅自己',
      cover: p3, html: '湖边的芦苇黄了，拍了好几张。<img src="' + p3 + '"><img src="' + p4 + '">' },
    { id: 1760000000000, time: '10月 5日', tag: '学习笔记', title: '一元二次方程错题本', likes: 8, cmts: [], vis: '仅自己',
      cover: p5, html: '配方法还是容易漏判别式，抄了五道错题。<img src="' + p5 + '">' },
    { id: 1760600000000, time: '10月 11日', tag: '随感', title: '今晚的月亮很圆', likes: 18, cmts: [], vis: '公开',
      html: '晾衣服的时候抬头看到的，忽然想到快月考了。' }
  ];
}
