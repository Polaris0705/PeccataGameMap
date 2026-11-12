/* =========================================================
   Ⅶ・peccata — 티룸 타이쿤 (도트 그래픽 · 조리 과정 · 하루 영업 2분 · 업그레이드)
   손님 주문 → 찻잔 → 찻잎 → 뜨거운 물(우리기 타이밍!) → 우유·꿀·레몬·휘핑 → 내놓기
   디저트는 진열장에서 골라 오븐에 굽고, 다 구워지면 꺼내요 (너무 오래 두면 타요)
   진행: P.tea = {v:2, day, cash(£), kettle, slots, oven, decor, menu, best, stars:{}}
   ========================================================= */
const TY_W = 192, TY_H = 272, TY_S = 3;
const TY_LEAF = { black: { n: '홍차', c: '#8a3a1a', m: '#c08a5a' }, green: { n: '녹차', c: '#7aa040', m: '#b8d08a' }, herb: { n: '허브', c: '#c8a040', m: '#e0c890' } };
const TY_RECIPES = [
  { id: 'black', n: '홍차', leaf: 'black', adds: [], p: 5, tier: 0 },
  { id: 'milk', n: '밀크티', leaf: 'black', adds: ['milk'], p: 8, tier: 0 },
  { id: 'lemon', n: '레몬티', leaf: 'black', adds: ['lemon'], p: 8, tier: 1 },
  { id: 'green', n: '녹차', leaf: 'green', adds: [], p: 6, tier: 1 },
  { id: 'herb', n: '꿀 허브티', leaf: 'herb', adds: ['honey'], p: 10, tier: 2 },
  { id: 'glatte', n: '녹차라떼', leaf: 'green', adds: ['milk', 'honey'], p: 12, tier: 3 },
  { id: 'royal', n: '로열 밀크티', leaf: 'black', adds: ['milk', 'honey', 'cream'], p: 15, tier: 4 },
];
const TY_DESSERTS = [{ id: 'scone', n: '스콘', p: 4, tier: 0, bake: 5 }, { id: 'macaron', n: '마카롱', p: 6, tier: 2, bake: 6 }, { id: 'cake', n: '케이크', p: 9, tier: 3, bake: 8 }];
const TY_ADD = { milk: '우유', honey: '꿀', lemon: '레몬', cream: '휘핑' };
const TY_UP = {
  kettle: { n: '은 주전자', d: '빨리 우러나고 "완벽" 구간이 넓어져요', cost: [60, 140, 260, 420] },
  slots: { n: '작업대 확장', d: '찻잔을 동시에 더 놓을 수 있어요 (2→4)', cost: [120, 300] },
  oven: { n: '오븐 개량', d: '디저트가 빨리 구워지고 덜 타요', cost: [80, 180, 320] },
  decor: { n: '티룸 인테리어', d: '손님이 더 오래 기다리고 팁이 늘어요', cost: [100, 220, 400, 650, 900] },
  menu: { n: '메뉴 연구', d: '새 차와 디저트를 배워요', cost: [90, 180, 300, 450] },
};
function tyLv() {
  const d = { v: 2, day: 1, cash: 0, kettle: 0, slots: 0, oven: 0, decor: 0, menu: 0, best: 0, stars: {} };
  if (!P.tea || P.tea.v !== 2) { const old = P.tea || {}; P.tea = Object.assign(d, { best: old.best || 0, decor: Math.min(2, old.decor || 0), menu: Math.min(2, old.menu || 0) }); }
  return P.tea;
}

/* ---------- 도트 도구 ---------- */
function tyPen(g) {
  const c = (x, y, w, h, col) => { if (w <= 0 || h <= 0) return; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const o = (x, y, w, h, f, l) => { c(x, y, w, h, l || '#2a1a12'); c(x + 1, y + 1, w - 2, h - 2, f); };
  const el = (cx, cy, rx, ry, col) => { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + .01)))); c(cx - w, cy + y, w * 2, 1, col); } };
  const tx = (s, x, y, col, size, align, bold) => { g.font = `${bold ? '700 ' : ''}${size || 8}px 'Galmuri11',monospace`; g.textAlign = align || 'left'; g.textBaseline = 'top'; g.fillStyle = '#140c06'; g.fillText(s, x + .5, y + .5); g.fillStyle = col || '#fff'; g.fillText(s, x, y); };
  return { c, o, el, tx, g };
}
/* 찻잔 (x,y = 왼쪽 위, 16×14) */
function tyCup(p, x, y, cup, t) {
  const { c, o, el } = p;
  el(x + 8, y + 12, 8, 2, '#d8d0c0'); el(x + 8, y + 12, 6, 1, '#f4f0e8');
  o(x + 2, y + 3, 12, 9, '#f8f4ec', '#8a8478'); c(x + 13, y + 5, 3, 1, '#8a8478'); c(x + 15, y + 5, 1, 4, '#8a8478'); c(x + 13, y + 8, 3, 1, '#8a8478');
  c(x + 3, y + 9, 10, 1, '#3a5a8a');
  if (cup && cup.leaf) {
    const L = TY_LEAF[cup.leaf], milky = cup.adds && cup.adds.includes('milk');
    let col = cup.water ? (milky ? L.m : L.c) : '#5a3a20';
    if (cup.water && cup.brew && cup.brew.q === 'bitter') col = '#3a1a0a'; if (cup.water && cup.brew && cup.brew.q === 'weak') col = '#d8c8a0';
    c(x + 3, y + 4, 10, cup.water ? 3 : 1, col);
    if (!cup.water) { c(x + 5, y + 4, 2, 1, cup.leaf === 'green' ? '#4f8a55' : cup.leaf === 'herb' ? '#9a7ac8' : '#3a2010'); c(x + 9, y + 4, 2, 1, '#2a1a10'); }
    if (cup.adds && cup.adds.includes('honey')) { c(x + 5, y + 5, 5, 1, '#ffd060'); }
    if (cup.adds && cup.adds.includes('lemon')) { c(x + 11, y + 1, 4, 4, '#ffe060'); c(x + 12, y + 2, 2, 2, '#fff8c0'); c(x + 11, y + 1, 4, 1, '#c8a020'); }
    if (cup.adds && cup.adds.includes('cream')) { el(x + 8, y + 2, 5, 2, '#ffffff'); c(x + 7, y - 1, 3, 2, '#ffffff'); c(x + 6, y + 2, 4, 1, '#e8e0d8'); }
    if (cup.water && (!cup.brew || !cup.brew.done) && t != null) { const s = (t >> 3) % 3; c(x + 5 + s, y - 2 - s, 1, 3, 'rgba(255,255,255,.55)'); c(x + 10 - s, y - 3 + s, 1, 3, 'rgba(255,255,255,.4)'); }
  }
}
function tyIcon(p, k, x, y, t) {   // 재료·디저트 아이콘 (약 14×14)
  const { c, o, el } = p;
  if (k === 'cup') return tyCup(p, x - 1, y, null);
  if (k === 'black' || k === 'green' || k === 'herb') {
    o(x + 1, y + 3, 12, 11, k === 'black' ? '#7a4a2a' : k === 'green' ? '#3f6b3a' : '#6a4a8a'); c(x + 2, y + 4, 10, 2, k === 'black' ? '#9a6a3a' : k === 'green' ? '#5f8a55' : '#8a6aa8');
    o(x + 3, y + 1, 8, 3, '#e8dcc0'); c(x + 4, y + 8, 6, 3, '#f4f0e8');
    if (k === 'herb') { c(x + 6, y + 8, 2, 3, '#9a7ac8'); } else c(x + 5, y + 9, 4, 1, k === 'black' ? '#3a2010' : '#4f8a55'); return; }
  if (k === 'milk') { o(x + 3, y + 2, 9, 12, '#f8f8f4', '#8a8a90'); c(x + 4, y + 7, 7, 2, '#5a8ad8'); c(x + 4, y + 1, 5, 2, '#f8f8f4'); c(x + 11, y + 5, 2, 4, '#8a8a90'); return; }
  if (k === 'honey') { o(x + 2, y + 4, 11, 10, '#ffc040', '#8a5a10'); c(x + 3, y + 5, 9, 2, '#ffe080'); o(x + 3, y + 1, 9, 4, '#c9a96a', '#6a4a20'); c(x + 5, y + 8, 5, 3, '#f8f0d0'); return; }
  if (k === 'lemon') { el(x + 7, y + 8, 6, 6, '#c8a020'); el(x + 7, y + 8, 5, 5, '#ffe060'); el(x + 7, y + 8, 3, 3, '#fff6b0'); c(x + 7, y + 3, 1, 10, '#e8c840'); c(x + 2, y + 8, 10, 1, '#e8c840'); return; }
  if (k === 'cream') { el(x + 7, y + 11, 6, 3, '#d8d0c8'); el(x + 7, y + 9, 5, 3, '#ffffff'); el(x + 7, y + 6, 3, 2, '#ffffff'); c(x + 6, y + 2, 2, 3, '#ffffff'); c(x + 4, y + 8, 6, 1, '#e8e0d8'); return; }
  if (k === 'trash') { o(x + 2, y + 4, 11, 10, '#7a808a', '#3a3e44'); o(x + 1, y + 2, 13, 3, '#9aa0aa', '#3a3e44'); c(x + 6, y + 1, 3, 1, '#3a3e44'); c(x + 5, y + 6, 1, 6, '#5a606a'); c(x + 9, y + 6, 1, 6, '#5a606a'); return; }
  if (k === 'scone') { el(x + 7, y + 9, 6, 4, '#8a5a24'); el(x + 7, y + 8, 6, 4, '#d8a058'); c(x + 3, y + 6, 8, 2, '#e8b870'); c(x + 5, y + 9, 1, 1, '#6a3a1a'); c(x + 9, y + 8, 1, 1, '#6a3a1a'); c(x + 4, y + 4, 6, 2, '#f0c888'); return; }
  if (k === 'macaron') { o(x + 2, y + 3, 11, 4, '#f08ab0', '#a04a6a'); c(x + 2, y + 7, 11, 2, '#fff0f4'); o(x + 2, y + 9, 11, 4, '#f08ab0', '#a04a6a'); c(x + 4, y + 4, 4, 1, '#ffb8d0'); return; }
  if (k === 'cake') { o(x + 1, y + 5, 13, 9, '#fff4e4', '#a08a6a'); c(x + 2, y + 8, 11, 2, '#f08ab0'); c(x + 2, y + 11, 11, 1, '#e8c890'); c(x + 2, y + 5, 11, 2, '#ffffff'); o(x + 6, y + 1, 4, 4, '#d8303a', '#8a1a20'); c(x + 7, y + 1, 1, 1, '#4f8a55'); return; }
  if (k === 'burnt') { el(x + 7, y + 9, 6, 4, '#1a1210'); el(x + 7, y + 8, 5, 3, '#2e2420'); c(x + 5, y + 2 - (t >> 3) % 2, 1, 3, 'rgba(120,120,120,.7)'); c(x + 9, y + 1, 1, 3, 'rgba(120,120,120,.6)'); return; }
}
/* 손님 (가운데 아래 기준, 20×30) */
const TY_SKIN = ['#f0c8a0', '#d8a878', '#a8784e', '#f6dcc4'], TY_HAIR = ['#2a1a10', '#6a4020', '#c89040', '#e8e0d0', '#8a2a2a', '#3a3a5a'];
const TY_CLOTH = ['#3a5a8a', '#7e2236', '#3f6b3a', '#5a3a7a', '#2a2a32', '#a8603a', '#6a8a9a'];
function tyGuest(p, g, cx, by, mood, t) {
  const { c, o } = p, x = Math.round(cx - 10), y = by - 30, bob = (t >> 4) % 2;
  const sk = TY_SKIN[g.sk], hr = TY_HAIR[g.hr], cl = TY_CLOTH[g.cl];
  o(x + 2, y + 15 + bob, 16, 15, cl, '#1a1210'); c(x + 3, y + 16 + bob, 14, 2, 'rgba(255,255,255,.18)'); c(x + 8, y + 16 + bob, 4, 5, g.vip ? '#ffe27a' : '#f4f0e8'); c(x + 9, y + 18 + bob, 2, 2, g.vip ? '#a07028' : cl);
  o(x + 5, y + 4 + bob, 10, 12, sk, '#5a3a24');
  if (g.st === 0) { c(x + 4, y + 3 + bob, 12, 4, hr); c(x + 4, y + 3 + bob, 2, 8, hr); c(x + 14, y + 3 + bob, 2, 8, hr); }
  else if (g.st === 1) { c(x + 4, y + 3 + bob, 12, 3, hr); c(x + 3, y + 5 + bob, 3, 11, hr); c(x + 14, y + 5 + bob, 3, 11, hr); }
  else { c(x + 5, y + 3 + bob, 10, 3, hr); c(x + 15, y + 5 + bob, 2, 3, hr); }
  if (g.hat === 1) { o(x + 6, y - 4 + bob, 8, 8, '#1a1a1e', '#000'); c(x + 3, y + 3 + bob, 14, 2, '#1a1a1e'); c(x + 7, y + 1 + bob, 6, 1, '#8a2433'); }
  if (g.hat === 2) { c(x + 3, y + 1 + bob, 14, 4, '#f4f0e8'); c(x + 4, y + 0 + bob, 12, 1, '#f4f0e8'); c(x + 13, y + 2 + bob, 3, 2, '#f08ab0'); }
  if (g.vip) { c(x + 6, y + 1 + bob, 8, 2, '#ffe27a'); c(x + 6, y + bob, 1, 1, '#ffe27a'); c(x + 9, y - 1 + bob, 2, 2, '#ffe27a'); c(x + 13, y + bob, 1, 1, '#ffe27a'); }
  const ey = y + 9 + bob;
  if (mood === 'happy') { c(x + 7, ey, 2, 1, '#2a1a10'); c(x + 11, ey, 2, 1, '#2a1a10'); c(x + 8, ey + 3, 4, 1, '#a04040'); c(x + 7, ey + 2, 1, 1, '#a04040'); c(x + 12, ey + 2, 1, 1, '#a04040'); }
  else if (mood === 'angry') { c(x + 7, ey - 1, 2, 1, '#2a1a10'); c(x + 11, ey - 1, 2, 1, '#2a1a10'); c(x + 7, ey, 2, 2, '#2a1a10'); c(x + 11, ey, 2, 2, '#2a1a10'); c(x + 8, ey + 4, 4, 1, '#2a1a10'); c(x + 5, ey + 1, 2, 1, 'rgba(220,60,60,.6)'); c(x + 13, ey + 1, 2, 1, 'rgba(220,60,60,.6)'); }
  else { c(x + 7, ey, 2, 2, '#2a1a10'); c(x + 11, ey, 2, 2, '#2a1a10'); c(x + 9, ey + 3, 2, 1, '#a06050'); }
  if (mood === 'angry' && (t >> 3) % 2) { c(x + 16, y + bob, 3, 1, '#e83a3a'); c(x + 17, y - 1 + bob, 1, 3, '#e83a3a'); }
}

/* ---------- 장면 ---------- */
function tyScene(p, st, t) {
  const { c, o, el, tx } = p, L = st.L, frac = st.t0 ? Math.min(1, st.elapsed / st.len) : .3;
  // 벽 (영업 시간에 따라 창밖이 아침 → 낮 → 저녁)
  c(0, 14, TY_W, 58, '#4a2a30'); for (let x = 0; x < TY_W; x += 10) { c(x, 14, 5, 58, '#56303a'); c(x + 7, 14, 1, 58, '#64404a'); }
  c(0, 14, TY_W, 2, 'rgba(0,0,0,.3)');
  if (L.decor >= 3) { c(0, 46, TY_W, 2, '#e0b050'); c(0, 48, TY_W, 24, '#5a3a24'); for (let x = 4; x < TY_W; x += 22) o(x, 51, 18, 18, '#6a4428', '#3e2414'); }
  const sky = frac < .3 ? ['#f6c49a', '#ffe6bc'] : frac < .75 ? ['#6ab0e8', '#b4dcf8'] : ['#c25a5a', '#f09a5a'];
  o(8, 20, 36, 26, '#f1e6cc', '#8a7a5a'); c(10, 22, 32, 11, sky[0]); c(10, 33, 32, 11, sky[1]); c(25, 22, 2, 22, '#f1e6cc'); c(10, 32, 32, 1, '#f1e6cc');
  const sx = 12 + Math.round(frac * 24), sy = 25 + Math.round(Math.abs(frac - .5) * 16); c(sx, sy, 4, 4, frac > .75 ? '#ffd27a' : '#fff2a0');
  c(10, 40, 32, 4, '#3a6a3a'); c(14, 37, 5, 3, '#3a6a3a'); c(30, 36, 7, 4, '#3a6a3a');
  c(4, 18, 6, 30, '#8a2433'); c(42, 18, 6, 30, '#8a2433'); c(5, 18, 1, 30, '#a83a4a'); c(46, 18, 1, 30, '#a83a4a'); c(3, 17, 46, 2, '#e0b050');
  // 간판
  o(68, 17, 56, 13, '#3a2418', '#e0b050'); tx('TEA ROOM', 96, 19, '#ffe27a', 8, 'center', true);
  // 문
  o(164, 26, 22, 46, '#6a4428'); c(166, 28, 18, 20, '#8a5a34'); c(166, 50, 18, 20, '#8a5a34'); c(180, 50, 2, 3, '#e0b050'); c(170, 32, 10, 12, sky[1]);
  if (L.decor >= 1) { [[52, 52], [140, 52]].forEach(([x, y]) => { o(x, y + 8, 10, 10, '#ece8e0', '#9a948a'); c(x + 4, y - 6, 2, 14, '#3a6a40'); el(x + 5, y, 7, 5, '#4f8a55'); el(x + 5, y - 1, 5, 3, '#79b26e'); }); }
  if (L.decor >= 2) { c(95, 14, 2, 10, '#a07028'); el(96, 27, 14, 3, '#e0b050'); for (let i = 0; i < 5; i++) { c(84 + i * 6, 23, 1, 4, '#f4f0e8'); c(84 + i * 6, 21 + (t + i) % 2, 1, 2, '#ffd27a'); } el(96, 34, 26, 6, 'rgba(255,230,150,.07)'); }
  if (L.decor >= 4) { o(126, 34, 16, 20, '#e0b050', '#a07028'); c(128, 36, 12, 16, '#3a2a20'); c(131, 39, 6, 6, '#e8c8a8'); c(130, 45, 8, 7, '#7e2236'); }
  if (L.decor >= 5) { for (let x = 0; x < TY_W; x += 24) { c(x + 10, 15, 3, 3, '#ffe27a'); } }
  // 바닥
  for (let y = 72; y < 100; y += 6) for (let x = 0; x < TY_W; x += 6) c(x, y, 6, 6, ((x + y) / 6) % 2 ? '#e4dccc' : '#3a3036');
  c(0, 72, TY_W, 2, 'rgba(0,0,0,.25)');
  // 손님
  st.guests.forEach((g, i) => { if (!g) return; const cx = TY_SPOT[i] + (g.walk || 0), mood = g.left ? (g.happy ? 'happy' : 'angry') : g.pat / g.max < .3 ? 'angry' : g.flash > 0 ? 'happy' : 'plain';
    tyGuest(p, g, cx, 100, mood, t + i * 7);
    if (!g.left && !g.walk) {   // 주문 말풍선
      const has = !!g.dessert, bw = has ? 36 : 22, bx = Math.round(cx - bw / 2), by = 36;
      o(bx, by, bw, 22, '#fffaf0', '#2a1a12'); c(cx - 2, by + 21, 4, 2, '#fffaf0'); c(cx - 1, by + 23, 2, 1, '#2a1a12');
      tyCup(p, bx + 3, by + 4, { leaf: g.rec.leaf, water: true, brew: { done: true, q: 'perfect' }, adds: g.rec.adds });
      if (has) tyIcon(p, g.dessert, bx + 19, by + 4, t);
      const fr = Math.max(0, g.pat / g.max); c(bx + 1, by + 19, Math.round((bw - 2) * fr), 2, fr > .5 ? '#5fc060' : fr > .25 ? '#f0c040' : '#e04040');
      if (st.selCup != null && st.cups[st.selCup] && st.cups[st.selCup].brew && st.cups[st.selCup].brew.done) { c(bx - 1, by - 1, bw + 2, 1, '#ffe27a'); }
    }
  });
  // 계산대
  o(0, 98, TY_W, 16, '#b97a46', '#3e2414'); c(1, 99, TY_W - 2, 2, '#dca468'); c(0, 108, TY_W, 6, '#8a5530'); for (let x = 8; x < TY_W; x += 32) c(x, 109, 16, 4, '#9a6238');
}
const TY_SPOT = [34, 88, 142];

/* ---------- 게임 ---------- */
let TY = null;
function tyStart() {
  const L = tyLv(), day = L.day;
  const recipes = TY_RECIPES.filter(r => r.tier <= L.menu), desserts = TY_DESSERTS.filter(d => d.tier <= L.menu);
  const nSlots = 2 + L.slots;
  TY = { L, day, recipes, desserts, nSlots, len: 120, elapsed: 0, t0: Date.now(), cash: 0, served: 0, perfect: 0, lost: 0, combo: 0, best: 0,
    guests: [null, null, null], cups: Array(nSlots).fill(null), selCup: null, stock: {}, oven: [null, null], fx: [], spawnIn: 1.2, over: false, frame: 0, pause: false };
  desserts.forEach(d => TY.stock[d.id] = 1);
  const box = gbox(); if (!box) return;
  box.innerHTML = `<div style="position:relative;max-width:480px;margin:0 auto"><canvas id="tyCv" width="${TY_W * TY_S}" height="${TY_H * TY_S}" style="width:100%;display:block;image-rendering:pixelated;touch-action:manipulation;border:2px solid var(--frame,#5a3a24)"></canvas></div>
   <div class="row" style="justify-content:center;margin-top:6px"><button class="sm" onclick="tyQuit()">그만두기</button></div>`;
  const cv = document.getElementById('tyCv'), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  cv.addEventListener('pointerdown', e => { e.preventDefault(); const r = cv.getBoundingClientRect(); tyTap((e.clientX - r.left) / r.width * TY_W, (e.clientY - r.top) / r.height * TY_H); });
  let last = performance.now(), raf = 0;
  const loop = now => {
    if (!TY || TY.over) return; const dt = Math.min(.1, (now - last) / 1000); last = now;
    if (!document.hidden && !TY.pause) tyStep(dt);
    if (!TY || TY.over) return;
    g.setTransform(TY_S, 0, 0, TY_S, 0, 0); g.imageSmoothingEnabled = false; tyDraw(tyPen(g));
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  lockGame(() => { cancelAnimationFrame(raf); if (TY) TY.over = true; });
  sfx('ok');
}
function tyQuit() { if (!TY) return; if (!confirm('오늘 영업을 그만둘까요? 지금까지 번 돈은 남아요.')) return; tyEnd(true); }
function tyNewGuest(i) {
  const st = TY, rec = st.recipes[rint(st.recipes.length)], vip = Math.random() < .08 + st.L.decor * .01;
  const dessert = st.desserts.length && Math.random() < .35 + st.day * .02 ? st.desserts[rint(st.desserts.length)].id : null;
  const max = Math.max(12, 24 - st.day * .5) + st.L.decor * 2.5;
  st.guests[i] = { rec, dessert, pat: max, max, sk: rint(4), hr: rint(6), cl: rint(7), st: rint(3), hat: Math.random() < .3 ? 1 + rint(2) : 0, vip, walk: 40, flash: 0 };
  sfx('pop');
}
function tyStep(dt) {
  const st = TY; st.frame++; st.elapsed += dt; const open = st.elapsed < st.len;
  // 손님
  st.spawnIn -= dt;
  if (open && st.spawnIn <= 0) { const free = st.guests.map((g, i) => g ? -1 : i).filter(i => i >= 0); if (free.length) { tyNewGuest(free[rint(free.length)]); st.spawnIn = Math.max(2.6, 6.5 - st.day * .25) * (.7 + Math.random() * .6); } else st.spawnIn = .5; }
  st.guests.forEach((g, i) => { if (!g) return;
    if (g.walk) { g.walk = Math.max(0, g.walk - dt * 90); return; }
    if (g.left) { g.leaveT -= dt; g.walkOut = (g.walkOut || 0) + dt * 80; if (g.leaveT <= 0) st.guests[i] = null; return; }
    g.pat -= dt; if (g.flash > 0) g.flash -= dt;
    if (g.pat <= 0) { g.left = true; g.happy = false; g.leaveT = .8; st.lost++; st.combo = 0; tyFx(TY_SPOT[i], 40, '떠났어요…', '#e86a6a'); sfx('bad'); } });
  // 우리기
  const brewT = Math.max(1.8, 3.4 - st.L.kettle * .35);
  st.cups.forEach(cp => { if (cp && cp.water && cp.brew && !cp.brew.done) { cp.brew.p += dt / brewT; if (cp.brew.p >= 1.35) tyStopBrew(cp, true); } });
  // 오븐
  const ovenK = 1 + st.L.oven * .3;
  st.oven.forEach((o, i) => { if (!o) return; o.p += dt * ovenK / TY_DESSERTS.find(d => d.id === o.k).bake; if (o.p >= 1 && !o.ready) { o.ready = true; sfx('spark'); } if (o.p >= 1 + (1.2 + st.L.oven * .4)) o.burnt = true; });
  st.fx = st.fx.filter(f => (f.t -= dt) > 0);
  if (!open && st.guests.every(g => !g || g.left)) tyEnd(false);
}
function tyStopBrew(cp, auto) {
  const w = .1 + TY.L.kettle * .03, p = cp.brew.p;
  cp.brew.q = Math.abs(p - .85) <= w ? 'perfect' : (p >= .55 && p < 1.1) ? 'good' : p < .55 ? 'weak' : 'bitter';
  cp.brew.done = true;
  const txt = { perfect: '완벽!', good: '좋아요', weak: '너무 연해요', bitter: '써요…' }[cp.brew.q];
  const i = TY.cups.indexOf(cp); tyFx(TY_SLOT_X(i) + 14, 120, txt, cp.brew.q === 'perfect' ? '#ffe27a' : cp.brew.q === 'good' ? '#bfe8a0' : '#e8a0a0');
  sfx(cp.brew.q === 'perfect' ? 'spark' : cp.brew.q === 'good' ? 'tap' : 'bad');
}
function tyFx(x, y, s, col) { TY.fx.push({ x, y, s, col, t: 1.1, T: 1.1 }); }
const TY_SLOT_X = i => 4 + i * 33;

/* ---------- 화면 배치 ---------- */
// 작업대 116~160: 찻잔 칸(최대 4) + 주전자 / 160~194: 진열장 + 오븐 / 196~272: 재료 버튼 2줄
const TY_BTNS = [['cup', '찻잔'], ['black', '홍차'], ['green', '녹차'], ['herb', '허브'], ['trash', '버리기'], ['milk', '우유'], ['honey', '꿀'], ['lemon', '레몬'], ['cream', '휘핑'], ['serve', '내놓기']];
function tyBtnRect(i) { const col = i % 5, row = Math.floor(i / 5); return { x: 3 + col * 37.6, y: 198 + row * 37, w: 35, h: 34 }; }
function tyDraw(p) {
  const st = TY, { c, o, tx, el } = p, t = st.frame;
  c(0, 0, TY_W, TY_H, '#140c06');
  tyScene(p, st, t);
  // HUD
  c(0, 0, TY_W, 14, '#1e1410'); c(0, 13, TY_W, 1, '#e0b050');
  tx(`DAY ${st.day}`, 4, 3, '#ffe27a', 8, 'left', true);
  const left = Math.max(0, st.len - st.elapsed); o(48, 3, 70, 8, '#2a1a12', '#5a3a24'); c(49, 4, Math.round(68 * left / st.len), 6, left < 20 ? '#e06040' : '#e0b050');
  tx(`${Math.ceil(left)}s`, 122, 3, '#f4f0e8', 8);
  tx(`£${st.cash}`, TY_W - 4, 3, '#bfe8a0', 8, 'right', true);
  if (st.combo >= 2) tx(`COMBO ×${st.combo}`, 96, 88, '#ffe27a', 8, 'center', true);
  // 작업대
  c(0, 114, TY_W, 82, '#3a3036'); for (let y = 114; y < 196; y += 8) for (let x = (y / 8) % 2 * 8; x < TY_W; x += 16) c(x, y, 8, 8, '#443a40');
  c(0, 114, TY_W, 2, 'rgba(0,0,0,.35)');
  for (let i = 0; i < 4; i++) { const x = TY_SLOT_X(i), y = 120, cp = st.cups[i], locked = i >= st.nSlots;
    o(x, y, 31, 36, locked ? '#2a2226' : '#5a4a50', '#1a1214'); if (locked) { tx('🔒', x + 15, y + 12, '#888', 8, 'center'); continue; }
    if (st.selCup === i) { c(x, y, 31, 1, '#ffe27a'); c(x, y + 35, 31, 1, '#ffe27a'); c(x, y, 1, 36, '#ffe27a'); c(x + 30, y, 1, 36, '#ffe27a'); }
    if (cp) { tyCup(p, x + 7, y + 7, cp, t);
      if (cp.water && cp.brew) { const w = .1 + st.L.kettle * .03; o(x + 3, y + 25, 25, 6, '#1a1214', '#000'); const zx = x + 4 + Math.round(23 * (.85 - w) / 1.35), zw = Math.round(23 * 2 * w / 1.35);
        c(x + 4, y + 26, 23, 4, '#4a3a3a'); c(x + 4 + Math.round(23 * .55 / 1.35), y + 26, Math.round(23 * .55 / 1.35), 4, '#5a6a3a'); c(zx, y + 26, zw, 4, '#5fc060');
        c(x + 4 + Math.min(22, Math.round(23 * cp.brew.p / 1.35)), y + 25, 1, 6, cp.brew.done ? '#fff' : '#ffe27a');
        if (!cp.brew.done && (t >> 3) % 2) tx('TAP!', x + 15, y + 1, '#ffe27a', 8, 'center', true); }
      else if (!cp.leaf) tx('찻잎?', x + 15, y + 26, '#a09a90', 8, 'center'); else if (!cp.water) tx('물!', x + 15, y + 26, '#8ac8f0', 8, 'center'); }
    else tx('빈 칸', x + 15, y + 15, '#6a5a60', 8, 'center'); }
  // 주전자
  const kx = 138; o(kx, 118, 50, 40, '#4a4048', '#1a1214'); c(kx + 4, 150, 42, 5, '#2a2226'); el(kx + 25, 150, 12, 2, '#e05a2a');
  o(kx + 12, 128, 26, 20, '#c8c8d0', '#5a5a66'); c(kx + 14, 130, 22, 3, '#e8e8f0'); o(kx + 20, 124, 10, 5, '#a8a8b0', '#5a5a66'); c(kx + 37, 132, 7, 3, '#a8a8b0'); c(kx + 42, 129, 3, 3, '#a8a8b0'); c(kx + 8, 132, 4, 10, '#5a5a66');
  if (st.L.kettle >= 2) { c(kx + 14, 136, 22, 2, '#e0b050'); } c(kx + 42 + (t >> 3) % 2, 125 - (t >> 2) % 4, 1, 3, 'rgba(255,255,255,.5)');
  tx('뜨거운 물', kx + 25, 119, '#f4f0e8', 8, 'center');
  // 진열장
  o(3, 160, 88, 34, '#6a4428', '#2a1a12'); c(5, 162, 84, 28, '#e8f0f4'); c(5, 162, 84, 2, '#ffffff'); c(5, 175, 84, 1, '#b8c8d0');
  st.desserts.forEach((d, i) => { const x = 7 + i * 28; tyIcon(p, d.id, x + 6, 163, t); tx(`×${st.stock[d.id] || 0}`, x + 13, 179, '#3a2418', 8, 'center', true); });
  if (!st.desserts.length) tx('디저트 없음', 47, 172, '#8a8a90', 8, 'center');
  // 오븐
  const ox = 95; o(ox, 160, 93, 34, '#3a3a42', '#141418'); c(ox + 2, 162, 89, 4, '#5a5a66');
  st.oven.forEach((ov, i) => { const x = ox + 4 + i * 45, y = 168; o(x, y, 41, 24, '#1a1214', '#000'); c(x + 1, y + 19, 39, 4, ov ? '#e05a2a' : '#3a2a26');
    if (ov) { tyIcon(p, ov.burnt ? 'burnt' : ov.k, x + 13, y + 3, t); if (!ov.ready) { c(x + 3, y + 17, Math.round(35 * Math.min(1, ov.p)), 2, '#ffe27a'); } else if (!ov.burnt && (t >> 3) % 2) { tx('꺼내기!', x + 20, y + 1, '#ffe27a', 8, 'center', true); } else if (ov.burnt) tx('탔어요', x + 20, y + 1, '#e8a0a0', 8, 'center'); }
    else tx('오븐', x + 20, y + 8, '#6a5a60', 8, 'center'); });
  // 재료 버튼
  c(0, 196, TY_W, 76, '#2a1a12'); c(0, 196, TY_W, 1, '#e0b050');
  TY_BTNS.forEach(([k, n], i) => { const r = tyBtnRect(i), dis = (k === 'green' || k === 'herb' || k === 'lemon' || k === 'honey' || k === 'cream') && !tyAllowed(k);
    o(r.x, r.y, r.w, r.h, dis ? '#2a2226' : k === 'serve' ? '#8a2433' : '#6a4428', '#140c06'); c(r.x + 1, r.y + 1, r.w - 2, 2, dis ? '#2a2226' : k === 'serve' ? '#a83a4a' : '#8a5a34');
    if (k === 'serve') { tx('▶', r.x + r.w / 2, r.y + 6, '#ffe27a', 8, 'center', true); } else { if (!dis) tyIcon(p, k, r.x + 10, r.y + 4, t); else tx('?', r.x + r.w / 2, r.y + 8, '#6a5a60', 8, 'center'); }
    tx(dis ? '잠김' : n, r.x + r.w / 2, r.y + 23, dis ? '#6a5a60' : '#f4f0e8', 8, 'center'); });
  // 효과 글자
  st.fx.forEach(f => { const a = f.t / f.T; p.g.globalAlpha = Math.min(1, a * 2); tx(f.s, f.x, f.y - (1 - a) * 12, f.col, 8, 'center', true); p.g.globalAlpha = 1; });
}
function tyAllowed(k) { return TY.recipes.some(r => r.leaf === k || r.adds.includes(k)); }

/* ---------- 누르기 ---------- */
function tyTap(x, y) {
  const st = TY; if (!st || st.over) return;
  // 재료 버튼
  for (let i = 0; i < TY_BTNS.length; i++) { const r = tyBtnRect(i); if (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h) return tyBtn(TY_BTNS[i][0]); }
  // 찻잔 칸
  for (let i = 0; i < st.nSlots; i++) { const sx = TY_SLOT_X(i); if (x >= sx && x < sx + 31 && y >= 120 && y < 156) {
    const cp = st.cups[i]; if (cp && cp.water && cp.brew && !cp.brew.done) { tyStopBrew(cp); st.selCup = i; return; }
    st.selCup = cp ? i : st.selCup; if (cp) sfx('tap'); return; } }
  // 주전자
  if (x >= 138 && y >= 118 && y < 158) return tyBtn('water');
  // 진열장 → 오븐에 굽기
  if (x >= 3 && x < 91 && y >= 160 && y < 194) { const i = Math.floor((x - 7) / 28), d = st.desserts[i]; if (!d) return;
    const free = st.oven.findIndex(o => !o); if (free < 0) { sfx('bad'); return tyFx(140, 162, '오븐이 꽉 찼어요', '#e8a0a0'); }
    st.oven[free] = { k: d.id, p: 0 }; sfx('tap'); return tyFx(140 + free * 45 - 20, 166, `${d.n} 굽기`, '#ffe27a'); }
  // 오븐 꺼내기
  if (x >= 95 && y >= 160 && y < 194) { const i = x < 140 ? 0 : 1, ov = st.oven[i]; if (!ov) return;
    if (ov.burnt) { st.oven[i] = null; sfx('bad'); return; }
    if (ov.ready) { st.stock[ov.k] = (st.stock[ov.k] || 0) + (st.L.oven >= 2 ? 2 : 1); st.oven[i] = null; sfx('coin'); return; } return; }
  // 손님에게 내놓기
  if (y >= 30 && y < 104) { let best = -1, bd = 99; TY_SPOT.forEach((cx, i) => { const d = Math.abs(cx - x); if (d < 26 && d < bd && st.guests[i] && !st.guests[i].left && !st.guests[i].walk) { bd = d; best = i; } });
    if (best >= 0) return tyServe(best); }
}
function tyBtn(k) {
  const st = TY, sel = st.selCup != null ? st.cups[st.selCup] : null;
  if (k === 'cup') { const i = st.cups.findIndex((c, j) => !c && j < st.nSlots); if (i < 0) { sfx('bad'); return tyFx(60, 118, '작업대가 꽉 찼어요', '#e8a0a0'); } st.cups[i] = { leaf: null, water: false, brew: null, adds: [] }; st.selCup = i; return sfx('tap'); }
  if (k === 'trash') { if (st.selCup == null || !sel) return; st.cups[st.selCup] = null; st.selCup = null; st.combo = 0; return sfx('bad'); }
  if (k === 'serve') { const ok = st.guests.map((g, i) => g && !g.left && !g.walk && sel && tyMatch(sel, g.rec) ? i : -1).filter(i => i >= 0);
    if (!sel || !sel.brew || !sel.brew.done) { sfx('bad'); return tyFx(60, 118, '먼저 차를 완성해요', '#e8a0a0'); }
    if (!ok.length) { sfx('bad'); return tyFx(96, 60, '이 차를 주문한 손님이 없어요', '#e8a0a0'); }
    return tyServe(ok.sort((a, b) => st.guests[a].pat - st.guests[b].pat)[0]); }
  if (!sel) { sfx('bad'); return tyFx(60, 118, '먼저 찻잔을 놓아요', '#e8a0a0'); }
  if (TY_LEAF[k]) { if (!tyAllowed(k)) return; if (sel.leaf) { sfx('bad'); return tyFx(TY_SLOT_X(st.selCup) + 14, 118, '이미 찻잎이 있어요', '#e8a0a0'); } sel.leaf = k; return sfx('tap'); }
  if (k === 'water') { if (!sel.leaf) { sfx('bad'); return tyFx(TY_SLOT_X(st.selCup) + 14, 118, '찻잎부터!', '#e8a0a0'); } if (sel.water) return; sel.water = true; sel.brew = { p: 0, done: false }; return sfx('pop'); }
  if (TY_ADD[k]) { if (!tyAllowed(k)) return; if (!sel.brew || !sel.brew.done) { sfx('bad'); return tyFx(TY_SLOT_X(st.selCup) + 14, 118, '우린 다음에 넣어요', '#e8a0a0'); }
    if (sel.adds.includes(k)) return; sel.adds.push(k); return sfx('tap'); }
}
function tyMatch(cup, rec) { return cup.leaf === rec.leaf && cup.brew && cup.brew.done && cup.adds.length === rec.adds.length && rec.adds.every(a => cup.adds.includes(a)); }
function tyServe(gi) {
  const st = TY, g = st.guests[gi], cp = st.selCup != null ? st.cups[st.selCup] : null;
  if (!cp || !cp.brew || !cp.brew.done) { sfx('bad'); return tyFx(TY_SPOT[gi], 60, '완성된 차를 골라요', '#e8a0a0'); }
  if (!tyMatch(cp, g.rec)) { g.pat -= 3; st.combo = 0; sfx('bad'); return tyFx(TY_SPOT[gi], 60, `${g.rec.n} 주세요!`, '#e8a0a0'); }
  if (g.dessert && !(st.stock[g.dessert] > 0)) { sfx('bad'); return tyFx(TY_SPOT[gi], 60, `${TY_DESSERTS.find(d => d.id === g.dessert).n}도요!`, '#ffd27a'); }
  const q = cp.brew.q, qm = { perfect: 1.3, good: 1, weak: .6, bitter: .6 }[q];
  let price = g.rec.p * qm + (g.dessert ? TY_DESSERTS.find(d => d.id === g.dessert).p : 0);
  if (g.dessert) st.stock[g.dessert]--;
  st.combo = q === 'perfect' ? st.combo + 1 : q === 'good' ? st.combo : 0; st.best = Math.max(st.best, st.combo);
  const tip = Math.round(g.rec.p * .5 * Math.max(0, g.pat / g.max)) + st.L.decor + (typeof roomCnt === 'function' && roomCnt('teaset') ? 1 : 0);
  const total = Math.round((price + tip) * (1 + .1 * Math.min(10, Math.max(0, st.combo - 1))) * (g.vip ? 2 : 1));
  st.cash += total; st.served++; if (q === 'perfect') st.perfect++;
  st.cups[st.selCup] = null; st.selCup = st.cups.findIndex(c => c && c.brew && c.brew.done); if (st.selCup < 0) st.selCup = null;
  g.left = true; g.happy = true; g.leaveT = .9; sfx('coin');
  tyFx(TY_SPOT[gi], 54, `+£${total}${g.vip ? ' VIP!' : ''}`, '#bfe8a0'); if (q === 'perfect') tyFx(TY_SPOT[gi], 66, 'PERFECT', '#ffe27a');
}
function tyEnd(quit) {
  const st = TY; if (!st || st.over) return; st.over = true;
  const L = st.L, g1 = 40 + st.day * 15, stars = quit ? 0 : st.cash >= g1 * 2.3 ? 3 : st.cash >= g1 * 1.6 ? 2 : st.cash >= g1 ? 1 : 0;
  L.cash += st.cash; L.best = Math.max(L.best || 0, st.cash);
  if (!quit && stars > 0) { L.stars[st.day] = Math.max(L.stars[st.day] || 0, stars); L.day++; }
  const silver = quit ? 0 : Math.min(20, stars * 5 + Math.floor(st.served / 4));
  const r = silver > 0 ? reward('tycoon', silver) : (saveP(), '');
  TY = null;
  finishGame(`<h2 style="color:var(--gold2);margin-top:0">🍵 Day ${st.day} 영업 종료</h2>
   <p style="font-size:1.6rem;margin:6px 0;letter-spacing:4px">${'★'.repeat(stars)}<span style="opacity:.25">${'★'.repeat(3 - stars)}</span></p>
   <p>매출 <b>£${st.cash}</b> <span class="muted">(목표 £${g1} · £${Math.round(g1 * 1.6)} · £${Math.round(g1 * 2.3)})</span></p>
   <p class="muted">손님 ${st.served}명 · 완벽 ${st.perfect}잔 · 최고 콤보 ${st.best} · 놓친 손님 ${st.lost}명</p>
   ${stars ? `<p>다음 날로 넘어가요! 보유 £${L.cash}</p>` : quit ? '' : '<p class="muted">별을 하나도 못 받아서 같은 날을 다시 해요.</p>'}
   <p class="muted">${r || ''}</p><div class="row"><button class="primary" onclick="closeModal();render()">티룸으로</button></div>`);
}

/* ---------- 시작 화면 · 업그레이드 ---------- */
VIEWS.tycoon = () => {
  const L = tyLv(), g1 = 40 + L.day * 15;
  const recs = TY_RECIPES.map(r => `<span class="chip ${r.tier <= L.menu ? 'on' : ''}" style="cursor:default">${r.tier <= L.menu ? '' : '🔒 '}${r.n} <span class="muted">£${r.p}</span></span>`).join('') + TY_DESSERTS.map(d => `<span class="chip ${d.tier <= L.menu ? 'on' : ''}" style="cursor:default">${d.tier <= L.menu ? '' : '🔒 '}${d.n} <span class="muted">£${d.p}</span></span>`).join('');
  const ups = Object.entries(TY_UP).map(([k, u]) => { const lv = L[k], cost = u.cost[lv]; return `<div class="item" style="margin:6px 0"><div><b>${u.n}</b> <span class="muted">Lv.${lv}/${u.cost.length}</span><div class="muted" style="font-size:.82rem">${u.d}</div></div>
    ${cost != null ? `<button onclick="tyBuy('${k}')" ${L.cash < cost ? 'disabled' : ''}>£${cost}</button>` : '<button disabled>최대</button>'}</div>`; }).join('');
  return `<div class="panel"><h2>🍵 티룸 타이쿤</h2>
   <div id="gbox"><canvas id="tyPrev" width="${TY_W * TY_S}" height="${114 * TY_S}" style="width:100%;max-width:480px;display:block;margin:0 auto;image-rendering:pixelated;border:2px solid var(--frame,#5a3a24)"></canvas>
   <div class="row" style="justify-content:space-between;margin:8px 0;flex-wrap:wrap"><b>DAY ${L.day}</b><span>보유 <b style="color:var(--gold2)">£${L.cash}</b></span><span class="muted">오늘 목표 £${g1} · 은화 보상 ${playsLeft('tycoon')}회 남음</span></div>
   <button class="primary" style="width:100%;font-size:1.1rem;padding:12px" onclick="tyStart()">▶ Day ${L.day} 영업 시작 (2분)</button></div>
   <details style="margin-top:10px"><summary><b>만드는 법</b></summary><p class="muted" style="line-height:1.8">① <b>찻잔</b> → ② <b>찻잎</b>(홍차·녹차·허브) → ③ <b>뜨거운 물</b>(주전자) → ④ 게이지가 <b style="color:#5fc060">초록 칸</b>에 왔을 때 찻잔을 <b>탭!</b> → ⑤ 주문대로 우유·꿀·레몬·휘핑 → ⑥ 손님을 누르거나 <b>내놓기</b>.<br>
     디저트는 아래 진열장을 눌러 오븐에 굽고, 다 구워지면 오븐을 눌러 꺼내요. 너무 오래 두면 타요.<br>완벽한 차를 연달아 내면 <b>콤보</b>로 값이 올라가고, 가끔 오는 <b>VIP</b> 손님은 두 배를 내요.</p></details>
   <h3>메뉴</h3><div class="toggles">${recs}</div>
   <h3>티룸 업그레이드 <span class="muted" style="font-size:.85rem">(영업으로 번 £ 사용)</span></h3>${ups}
   <p class="muted" style="font-size:.85rem">별을 받으면 다음 날로 넘어가요. 별 1개당 은화 5 + 손님 4명당 1 (최대 20, 하루 ${dailyCap()}회). 최고 매출 £${L.best || 0}</p></div>`;
};
function tyBuy(k) { const L = tyLv(), cost = TY_UP[k].cost[L[k]]; if (cost == null || L.cash < cost) return; L.cash -= cost; L[k]++; saveP(); sfx('ok'); toast(`${TY_UP[k].n} Lv.${L[k]}!`); render(); }
function tyPreview() {
  const cv = document.getElementById('tyPrev'); if (!cv || TY) return; const g = cv.getContext('2d');
  g.setTransform(TY_S, 0, 0, TY_S, 0, 0); g.imageSmoothingEnabled = false;
  const p = tyPen(g), fake = { L: tyLv(), guests: [{ rec: TY_RECIPES[1], dessert: 'scone', pat: 9, max: 10, sk: 0, hr: 2, cl: 1, st: 1, hat: 2, flash: 0 }, null, { rec: TY_RECIPES[0], dessert: null, pat: 4, max: 10, sk: 2, hr: 0, cl: 4, st: 0, hat: 1, flash: 0 }], t0: 0, elapsed: 0, len: 1, cups: [], selCup: null };
  g.fillStyle = '#140c06'; g.fillRect(0, 0, TY_W, 114); tyScene(p, fake, (RM && RM.t) || 0);
  g.fillStyle = '#1e1410'; g.fillRect(0, 0, TY_W, 14); p.tx('TEA ROOM TYCOON', 96, 3, '#ffe27a', 8, 'center', true);
}
setInterval(() => { if (typeof tab !== 'undefined' && tab === 'tycoon' && !TY) tyPreview(); }, 400);
