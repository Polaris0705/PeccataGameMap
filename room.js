/* ============================================================
   Ⅶ・peccata — 내 방 (내려다보는 시점 · 칸 하나 32×32 도트 · 부분별 색 바꾸기)
   데이터: progress/{uid}.room = {v:4, wall, floor, ow:[소유 벽지·바닥], cols:{wall,floor,frame}, arc:{wall,floor,frame},
           inv:{가구:개수}(예전 방식), invc:[{k,col,rc}], dye, items:[{id,k,c,r,col:{a,b,c},rc}]}
           r = -1 이면 벽 장식(벽 칸 c), 0 이상이면 바닥 칸 (c,r) = 가구가 차지하는 칸의 왼쪽 위
   ============================================================ */
const T = 32, COLS = 12, ROWS = 9, OX = 12, OY = 12, WALL_H = 120;
const FY = OY + WALL_H, RW = OX * 2 + COLS * T, RH = FY + ROWS * T + OY;   // 408 × 444

/* ---------- 색 · 램프 ---------- */
const OL = '#24160e', K = OL, GOLD = '#e0b050', GOLD2 = '#ffe27a', GOLDD = '#a07028';
function hexHsl(h) { h = h.replace('#', ''); const r = parseInt(h.substr(0, 2), 16) / 255, g = parseInt(h.substr(2, 2), 16) / 255, b = parseInt(h.substr(4, 2), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let H = 0, S = 0; const L = (mx + mn) / 2;
  if (mx !== mn) { const d = mx - mn; S = L > .5 ? d / (2 - mx - mn) : d / (mx + mn); H = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; H /= 6; } return [H, S, L]; }
function hslHex(h, s, l) { const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); const v = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(v * 255).toString(16).padStart(2, '0'); }; return '#' + f(0) + f(8) + f(4); }
const RAMPS = {};
function ramp(hex) {
  hex = (hex || '#888888').toLowerCase(); if (RAMPS[hex]) return RAMPS[hex];
  const [h, s, l] = hexHsl(hex), cl = v => Math.max(0, Math.min(1, v)), f = (dl, ds) => hslHex(h, cl(s + (ds || 0)), cl(l + dl));
  return RAMPS[hex] = { L: f(.2, -.08), l: f(.1), t: hex, f: f(-.1, .02), d: f(-.2, .04), o: f(Math.max(-.36, -l + .06), .05) };
}
const SWATCH = ['#a8344a', '#d8485a', '#f08ab0', '#e8a060', '#e0b050', '#f1e6cc', '#ffffff', '#79b26e', '#4f8a55', '#2e6a5a', '#5a9ad8', '#3a5a8a', '#6a4a8a', '#c4864e', '#8a5530', '#5a3a24', '#7a7a84', '#2a2a32'];

/* ---------- 그리기 도구 ---------- */
/* 화면 픽셀에 딱 맞춰 그리기: 배율이 정수가 아니어도 1px 선이 사라지지 않게 사각형 경계를 반올림해요 */
function snapCtx(g, S) {
  if (!g._fr) { g._fr = g.fillRect.bind(g); g.fillRect = (x, y, w, h) => { const s = g._S || 1, X1 = Math.round(x * s), Y1 = Math.round(y * s), X2 = Math.round((x + w) * s), Y2 = Math.round((y + h) * s); g._fr(X1, Y1, Math.max(1, X2 - X1), Math.max(1, Y2 - Y1)); }; }
  g._S = S; g.setTransform(1, 0, 0, 1, 0, 0);
}
function pen(g, x0, y0, mw, k) { k = k || 1;
  const base = (x, y, w, h, col) => { if (w <= 0 || h <= 0) return; g.fillStyle = col; g.fillRect(x0 + (mw ? mw - x - w : x) * k, y0 + y * k, w * k, h * k); };
  return mkPen(base);
}
/* 90도 돌린 펜 (러그용): (x,y) → (W-1-y, x) */
function rotPen(p, W) { return mkPen((x, y, w, h, col) => p.c(W - y - h, x, h, w, col)); }
function mkPen(c) {
  const o = (x, y, w, h, f, l) => { c(x, y, w, h, l || OL); c(x + 1, y + 1, w - 2, h - 2, f); };
  const ln = (x1, y1, x2, y2, col, wd) => { const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1); for (let i = 0; i <= n; i++) c(Math.round(x1 + (x2 - x1) * i / n), Math.round(y1 + (y2 - y1) * i / n), wd || 1, wd || 1, col); };
  const el = (cx, cy, rx, ry, col) => { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + .01)))); c(cx - w, cy + y, w * 2, 1, col); } };
  const rr = (x, y, w, h, col, r) => { r = r == null ? 2 : r; for (let i = 0; i < h; i++) { const ins = Math.max(0, r - Math.min(i, h - 1 - i)); c(x + ins, y + i, w - ins * 2, 1, col); } };
  const orr = (x, y, w, h, f, l, r) => { rr(x, y, w, h, l || OL, r); rr(x + 1, y + 1, w - 2, h - 2, f, Math.max(0, (r == null ? 2 : r) - 1)); };
  const sub = (dx, dy) => mkPen((x, y, w, h, col) => c(x + dx, y + dy, w, h, col));
  return { c: (x, y, w, h, col) => c(x, y, w, h, col), o, ln, el, rr, orr, sub };
}
/* 윗면 + 앞면 상자 */
function box(p, x, y, w, h, front, R) { const { c } = p;
  c(x, y, w, h, R.o); c(x + 1, y + 1, w - 2, h - 2 - front, R.t); c(x + 1, y + 1, w - 2, 1, R.L); c(x + 1, y + 2, w - 2, 1, R.l);
  c(x + 1, y + h - 1 - front, w - 2, front, R.f); c(x + 1, y + h - 1 - front, w - 2, 1, R.d); c(x + 1, y + h - 2, w - 2, 1, R.d); }
/* 쿠션 (둥근 모서리 + 빛 + 그늘) */
function cush(p, x, y, w, h, R, tuft) { const { c, orr } = p;
  orr(x, y, w, h, R.t, R.o, 3); c(x + 3, y + 2, w - 6, 2, R.l); c(x + 2, y + 3, 2, Math.max(1, h - 7), R.l); c(x + 3, y + h - 3, w - 6, 1, R.f); c(x + w - 3, y + 3, 1, Math.max(1, h - 6), R.f);
  if (tuft) for (let i = 1; i < tuft + 1; i++) { const tx = x + Math.round(w * i / (tuft + 1)); c(tx, y + Math.floor(h / 2), 1, 1, R.d); c(tx, y + Math.floor(h / 2) - 1, 1, 1, R.l); } }
/* 나뭇결 */
function grain(p, x, y, w, h, R, seed) { for (let i = 0; i < Math.floor(w * h / 60); i++) { const gx = x + (hsh(i, seed) % w), gy = y + (hsh(seed, i) % h); p.c(gx, gy, 3 + (i % 3), 1, R.f); } }
function books(p, x, y, w, h, seed) { const cols = ['#a8344a', '#3a5a8a', '#c9a96a', '#4f8a55', '#6a4a8a', '#b8693d', '#e8dcc0', '#2a6a6a', '#8a2a3a', '#d8c070'];
  let bx = x, i = seed; while (bx < x + w - 2) { const bw = [3, 4, 3, 5, 2, 4][i % 6], bh = h - (hsh(i, seed) % 5); if (bx + bw > x + w) break; const col = cols[hsh(i, 3) % cols.length], R = ramp(col);
    if (i % 9 === 5 && bx + 9 < x + w) { p.c(bx, y + h - 4, 9, 4, R.t); p.c(bx, y + h - 4, 9, 1, R.l); p.c(bx, y + h - 1, 9, 1, R.d); bx += 10; i++; continue; }
    p.c(bx, y + h - bh, bw, bh, R.t); p.c(bx, y + h - bh, 1, bh, R.l); p.c(bx + bw - 1, y + h - bh, 1, bh, R.f); p.c(bx, y + h - bh + 3, bw, 1, R.d); p.c(bx, y + h - 4, bw, 1, GOLD); bx += bw; if (i % 5 === 4) bx++; i++; } }
function pot(p, x, y, w, h, R) { const { c, orr } = p; orr(x, y, w, h, R.t, R.o, 2); c(x + 1, y + 1, w - 2, 3, R.f); c(x + 2, y + 4, 2, h - 7, R.L); c(x + w - 4, y + 5, 2, h - 8, R.f); c(x + 2, y + 1, w - 4, 2, '#4a2e1a'); }
function leaf(p, x1, y1, x2, y2, G, wd) { p.ln(x1, y1, x2, y2, G.f, wd || 3); p.ln(x1, y1 - 1, x2, y2 - 1, G.t, Math.max(1, (wd || 3) - 1)); p.ln(x1 + 1, y1 - 2, x2, y2 - 2, G.l, 1); p.c(x2 - 1, y2 - 2, 3, 3, G.t); p.c(x2, y2 - 2, 1, 1, G.L); }
function glow(p, cx, cy, r, a) { for (let i = 3; i >= 1; i--) p.el(cx, cy, Math.round(r * i / 3), Math.round(r * i / 3 * .7), `rgba(255,220,140,${(a || .05)})`); }
function flame(p, x, y, t) { const f = t % 2; p.c(x, y + 1, 3, 4, f ? '#ff9a3a' : '#ffb347'); p.c(x + 1, y - 1 + f, 1, 3, '#ffe8a0'); p.c(x + 1, y + 3, 1, 1, '#fff6d0'); }
const hsh = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
function todSky(p, t, x, y, w, h) {
  const tod = (typeof curTod === 'function' && curTod()) || 'night', { c } = p;
  const S = { morning: ['#f2b890', '#f9d6aa', '#fff0d4'], day: ['#4f9ae0', '#7cbcf0', '#b4dcf8'], evening: ['#4a3070', '#b25060', '#f0905a'], night: ['#080c28', '#121a44', '#1d2a62'] }[tod];
  const b = Math.ceil(h / 3); c(x, y, w, b, S[0]); c(x, y + b, w, b, S[1]); c(x, y + 2 * b, w, h - 2 * b, S[2]);
  if (tod === 'night') { for (let i = 0; i < 9; i++) { const a = hsh(i, 2) % w, d = hsh(i, 9) % (h - 8); if ((t + i) % 7) c(x + a, y + d, 1, 1, '#f4ecd0'); } c(x + w - 11, y + 4, 7, 7, '#f4ecd0'); c(x + w - 9, y + 3, 6, 6, S[0]); }
  if (tod === 'day') { c(x + w - 12, y + 4, 7, 7, '#fff2a0'); c(x + w - 13, y + 6, 9, 3, '#fff2a0'); c(x + 3, y + 10, 11, 3, '#fff'); c(x + 5, y + 8, 6, 2, '#fff'); c(x + 14, y + 18, 8, 2, '#eef6ff'); }
  if (tod === 'morning') { c(x + 3, y + h - 15, 9, 7, '#fff0a0'); c(x + 15, y + 7, 10, 2, '#fff'); }
  if (tod === 'evening') { c(x + w - 15, y + h - 13, 11, 6, '#ffd27a'); c(x + 3, y + 7, 12, 2, '#e8a0a0'); }
  const tr = { morning: '#4a6a3a', day: '#3a6a3a', evening: '#2a2030', night: '#060a18' }[tod];
  c(x, y + h - 6, w, 6, tr); for (let i = 0; i < w; i += 7) c(x + i, y + h - 9 - (hsh(i, 4) % 6), 5, 9, tr);
}

/* ---------- 가구 목록 ----------
   w×d = 바닥 칸, h = 그림 높이(px), cat = 가구점 분류, parts = 색을 바꿀 수 있는 부분 {a,b,c}
   draw(p, t, C)  C.a / C.b / C.c = 각 부분의 색 램프 */
const PN = { cushion: '쿠션', sheet: '시트', pattern: '무늬', border: '테두리', rose: '장미', runner: '러너', cloth: '천', wood: '나무', metal: '장식', stone: '돌', leaf: '잎', pot: '화분', glass: '유리', curtain: '커튼', frame: '틀', body: '몸', fur: '털', paper: '종이', light: '불빛', hair: '머리카락', face: '얼굴' };
const FURN = {
  /* ===== 침실 ===== */
  bed: { name: '침대', cat: 'bed', cost: 60, hi: true, dirs: [0, 1, 2, 3], dims: d => d % 2 ? { w: 3, d: 2, h: 75 } : { w: 2, d: 3, h: 110 },
    parts: { a: ['cloth', '#a8344a'], b: ['wood', '#8a5530'], c: ['sheet', '#f1e6cc'] }, drawHi(p, t, C, dir) { if (dir % 2) BEDHI.side(p, t, C); else BEDHI.front(p, t, C, dir === 2); } },
  canopy: { name: '천개 침대', cat: 'bed', cost: 220, hi: true, dims: () => ({ w: 3, d: 3, h: 150 }), parts: { a: ['curtain', '#6a2a5a'], b: ['wood', '#5a3a24'], c: ['sheet', '#f1e6cc'] }, drawHi(p, t, C) { CANOPYHI(p, t, C); } },
  sbed: { name: '작은 침대', cat: 'bed', cost: 40, hi: true, dims: () => ({ w: 1, d: 3, h: 104 }), parts: { a: ['cloth', '#3a5a8a'], b: ['wood', '#c4864e'], c: ['sheet', '#f1e6cc'] }, drawHi(p, t, C) { SBEDHI(p, t, C); } },
  nstand: { name: '협탁', cat: 'bed', cost: 20, hi: true, dims: () => ({ w: 1, d: 1, h: 44 }), parts: { b: ['wood', '#8a5530'], a: ['light', '#f1e6cc'] }, drawHi(p, t, C) { NSTANDHI(p, t, C); } },
  dresser: { name: '화장대', cat: 'bed', cost: 80, hi: true, dirs: [0, 1, 2, 3], dims: d => d % 2 ? { w: 1, d: 2, h: 106 } : { w: 2, d: 1, h: 74 }, parts: { b: ['wood', '#c4864e'], c: ['metal', '#e0b050'], a: ['glass', '#9ab8c4'] },
    drawHi(p, t, C, dir) { if (dir % 2) DRESSERHI.side(p, t, C); else if (dir === 2) DRESSERHI.back(p, t, C); else DRESSERHI.front(p, t, C); } },
  wardrobe: { name: '옷장', cat: 'bed', cost: 70, hi: true, dirs: [0, 1, 2, 3], dims: d => d % 2 ? { w: 1, d: 2, h: 118 } : { w: 2, d: 1, h: 92 }, parts: { b: ['wood', '#93592f'], c: ['metal', '#e0b050'] },
    drawHi(p, t, C, dir) { if (dir % 2) WARDHI.side(p, t, C); else if (dir === 2) WARDHI.back(p, t, C); else WARDHI.front(p, t, C); } },
  desk: { name: '책상', cat: 'living', cost: 30, hi: true, dirs: [0, 1, 2, 3], dims: d => d % 2 ? { w: 1, d: 2, h: 68 } : { w: 2, d: 1, h: 36 }, parts: { b: ['wood', '#93592f'], c: ['metal', '#e0b050'], a: ['paper', '#3a5a8a'] },
    drawHi(p, t, C, dir) { if (dir % 2) DESKHI.side(p, t, C); else if (dir === 2) DESKHI.back(p, t, C); else DESKHI.front(p, t, C); } },
  chest: { name: '보물상자', cat: 'bed', cost: 45, hi: true, dirs: [0, 1, 2, 3], dims: d => d % 2 ? { w: 1, d: 2, h: 76 } : { w: 2, d: 1, h: 44 }, parts: { b: ['wood', '#93592f'], c: ['metal', '#e0b050'] },
    drawHi(p, t, C, dir) { if (dir % 2) CHESTHI.side(p, t, C); else if (dir === 2) CHESTHI.back(p, t, C); else CHESTHI.front(p, t, C); } },
  trunk: { name: '여행 가방', cat: 'small', cost: 30, hi: true, dims: () => ({ w: 1, d: 1, h: 34 }), parts: { a: ['body', '#6a4428'], c: ['metal', '#e0b050'] }, drawHi(p, t, C) { TRUNKHI(p, t, C); } },
  sofa: { name: '벨벳 소파', cat: 'living', cost: 90, hi: true, dirs: [0, 1, 2, 3], dims: d => d % 2 ? { w: 1, d: 3, h: 112 } : { w: 3, d: 1, h: 62 },
    parts: { a: ['cloth', '#a8344a'], b: ['wood', '#5a3a24'] }, drawHi(p, t, C, dir) { if (dir % 2) SOFAHI.side(p, t, C); else if (dir === 2) SOFAHI.back(p, t, C); else SOFAHI.front(p, t, C); } },
  loveseat: { name: '2인 소파', cat: 'living', cost: 60, hi: true, dirs: [0, 1, 2, 3], dims: d => d % 2 ? { w: 1, d: 2, h: 90 } : { w: 2, d: 1, h: 58 }, parts: { a: ['cloth', '#3a5a8a'], b: ['wood', '#5a3a24'] },
    drawHi(p, t, C, dir) { if (dir % 2) LOVEHI.side(p, t, C); else if (dir === 2) LOVEHI.back(p, t, C); else LOVEHI.front(p, t, C); } },
  armchair: { name: '안락의자', cat: 'living', cost: 40, hi: true, dirs: [0, 1, 2, 3], dims: () => ({ w: 1, d: 1, h: 50 }), parts: { a: ['cloth', '#4f8a55'], b: ['wood', '#5a3a24'] },
    drawHi(p, t, C, dir) { if (dir % 2) ARMCHAIRHI.side(p, t, C); else if (dir === 2) ARMCHAIRHI.back(p, t, C); else ARMCHAIRHI.front(p, t, C); } },
  chair: { name: '나무 의자', cat: 'living', cost: 15, hi: true, dirs: [0, 1, 2, 3], dims: () => ({ w: 1, d: 1, h: 46 }), parts: { b: ['wood', '#8a5530'], a: ['cloth', '#a8344a'] },
    drawHi(p, t, C, dir) { if (dir % 2) CHAIRHI.side(p, t, C); else if (dir === 2) CHAIRHI.back(p, t, C); else CHAIRHI.front(p, t, C); } },
  stool: { name: '등받이 없는 의자', cat: 'living', cost: 12, hi: true, dims: () => ({ w: 1, d: 1, h: 32 }), parts: { a: ['cloth', '#e8a060'], b: ['wood', '#5a3a24'] }, drawHi(p, t, C) { STOOLHI(p, t, C); } },
  ottoman: { name: '바닥 쿠션', cat: 'living', cost: 15, hi: true, dims: () => ({ w: 1, d: 1, h: 22 }), parts: { a: ['cloth', '#f08ab0'] }, drawHi(p, t, C) { OTTOMANHI(p, t, C); } },
  ctable: { name: '티 테이블', cat: 'living', cost: 35, hi: true, dims: () => ({ w: 2, d: 1, h: 40 }), parts: { b: ['wood', '#c4864e'], a: ['cloth', '#3f6b3a'] }, drawHi(p, t, C) { CTABLEHI(p, t, C); } },
  rtable: { name: '원탁', cat: 'living', cost: 70, hi: true, dims: () => ({ w: 2, d: 2, h: 64 }), parts: { a: ['cloth', '#f1e6cc'], b: ['wood', '#5a3a24'], c: ['metal', '#e0b050'] }, drawHi(p, t, C) { RTABLEHI(p, t, C); } },
  dtable: { name: '긴 식탁', cat: 'living', cost: 110, hi: true, dims: () => ({ w: 3, d: 2, h: 70 }), parts: { a: ['cloth', '#f1e6cc'], b: ['wood', '#6a4428'], c: ['runner', '#a8344a'] }, drawHi(p, t, C) { DTABLEHI(p, t, C); } },
  shelf: { name: '책장', cat: 'living', cost: 120, eff: '수수께끼 힌트 20% 할인', hi: true, dirs: [0, 1, 2, 3], dims: d => d % 2 ? { w: 1, d: 2, h: 105 } : { w: 2, d: 1, h: 88 },
    parts: { b: ['wood', '#93592f'] }, drawHi(p, t, C, dir) { if (dir % 2) SHELFHI.side(p, t, C); else if (dir === 2) SHELFHI.back(p, t, C); else SHELFHI.front(p, t, C); } },
  tallshelf: { name: '높은 서가', cat: 'living', cost: 160, eff: '수수께끼 힌트 20% 할인', hi: true, dims: () => ({ w: 2, d: 1, h: 112 }), parts: { b: ['wood', '#5a3a24'], c: ['metal', '#e0b050'] }, drawHi(p, t, C) { TALLSHELFHI(p, t, C); } },
  cabinet: { name: '유리 장식장', cat: 'living', cost: 100, hi: true, dims: () => ({ w: 2, d: 1, h: 88 }), parts: { b: ['wood', '#6a4428'], c: ['metal', '#e0b050'] }, drawHi(p, t, C) { CABINETHI(p, t, C); } },
  piano: { name: '피아노', cat: 'living', cost: 250, hi: true, dirs: [0, 1, 2, 3], dims: d => d % 2 ? { w: 1, d: 3, h: 118 } : { w: 3, d: 1, h: 76 }, parts: { b: ['body', '#2a2226'], c: ['metal', '#e0b050'] },
    drawHi(p, t, C, dir) { if (dir % 2) PIANOHI.side(p, t, C); else if (dir === 2) PIANOHI.back(p, t, C); else PIANOHI.front(p, t, C); } },
  fireplace: { name: '벽난로', cat: 'living', cost: 220, hi: true, dims: () => ({ w: 3, d: 1, h: 92 }), parts: { a: ['stone', '#8a8a92'], b: ['wood', '#c4864e'] }, drawHi(p, t, C) { FIREHI(p, t, C); } },
  rug: { name: '줄무늬 러그', cat: 'living', cost: 40, flat: true, hi: true, dirs: [0, 1], dims: d => d % 2 ? { w: 2, d: 3, h: 96 } : { w: 3, d: 2, h: 64 }, parts: { a: ['cloth', '#f1e6cc'], c: ['border', '#a8344a'] },
    drawHi(p, t, C, dir) { if (dir % 2) { const q = rotPen(p, 128); hrug(q, 192, 128, C.a, C.c, 'stripe'); } else hrug(p, 192, 128, C.a, C.c, 'stripe'); } },
  persian: { name: '페르시안 카펫', cat: 'living', cost: 70, flat: true, hi: true, dirs: [0, 1], dims: d => d % 2 ? { w: 2, d: 3, h: 96 } : { w: 3, d: 2, h: 64 }, parts: { a: ['cloth', '#7e2236'], c: ['pattern', '#3a3a6a'] },
    drawHi(p, t, C, dir) { if (dir % 2) { const q = rotPen(p, 128); hrug(q, 192, 128, C.a, C.c, 'persian'); } else hrug(p, 192, 128, C.a, C.c, 'persian'); } },
  roundrug: { name: '둥근 러그', cat: 'living', cost: 50, flat: true, hi: true, dims: () => ({ w: 2, d: 2, h: 64 }), parts: { a: ['cloth', '#4f8a55'], c: ['pattern', '#f1e6cc'] }, drawHi(p, t, C) { ROUNDRUGHI(p, t, C); } },
  runner: { name: '긴 러너', cat: 'living', cost: 30, flat: true, hi: true, dirs: [0, 1], dims: d => d % 2 ? { w: 3, d: 1, h: 32 } : { w: 1, d: 3, h: 96 }, parts: { a: ['cloth', '#3a5a8a'], c: ['pattern', '#e0b050'] },
    drawHi(p, t, C, dir) { if (dir % 2) RUNNERHI(rotPen(p, 192), t, C); else RUNNERHI(p, t, C); } },
  teaset: { name: '찻상', cat: 'living', cost: 150, eff: '티룸 팁 +1', hi: true, dims: () => ({ w: 2, d: 1, h: 48 }), parts: { a: ['cloth', '#f1e6cc'], b: ['wood', '#5a3a24'], c: ['metal', '#3a5a8a'] }, drawHi(p, t, C) { TEASETHI(p, t, C); } },
  teacart: { name: '티 카트', cat: 'living', cost: 65, hi: true, dims: () => ({ w: 2, d: 1, h: 54 }), parts: { c: ['metal', '#e0b050'], a: ['glass', '#f8f4ec'] }, drawHi(p, t, C) { TEACARTHI(p, t, C); } },
  lamp: { name: '스탠드', cat: 'living', cost: 25, hi: true, dims: () => ({ w: 1, d: 1, h: 80 }), parts: { a: ['light', '#f1e6cc'], c: ['metal', '#4a4a54'] }, drawHi(p, t, C) { LAMPHI(p, t, C); } },
  gclock: { name: '괘종시계', cat: 'living', cost: 300, eff: '혼자 하는 게임 하루 보상 +1회', hi: true, dims: () => ({ w: 1, d: 1, h: 92 }), parts: { b: ['wood', '#93592f'], c: ['metal', '#e0b050'] }, drawHi(p, t, C) { GCLOCKHI(p, t, C); } },
  padlock: { name: '자물쇠', cat: 'small', cost: 60, max: 3, top: true, eff: '내 금고를 따기 어려워져요 (하나당 1단계, 최대 3)', hi: true, dims: () => ({ w: 1, d: 1, h: 30 }), parts: { a: ['metal', '#c9a036'], c: ['metal', '#b8bcc4'] }, drawHi(p, t, C) { PADLOCKHI(p, t, C); } },
  safe: { name: '금고', cat: 'small', cost: 200, eff: '출석 보상 +3 (최대 2개)', max: 2, hi: true, dims: () => ({ w: 1, d: 1, h: 38 }), parts: { a: ['body', '#5a606a'], c: ['metal', '#e0b050'] }, drawHi(p, t, C) { SAFEHI(p, t, C); } },
  globe: { name: '지구본', cat: 'living', cost: 55, hi: true, dims: () => ({ w: 1, d: 1, h: 50 }), parts: { a: ['body', '#3a6a9a'], c: ['metal', '#e0b050'] }, drawHi(p, t, C) { GLOBEHI(p, t, C); } },
  telescope: { name: '망원경', cat: 'living', cost: 90, hi: true, dims: () => ({ w: 1, d: 1, h: 60 }), parts: { c: ['metal', '#e0b050'], b: ['wood', '#5a3a24'] }, drawHi(p, t, C) { TELESCOPEHI(p, t, C); } },
  gramophone: { name: '축음기', cat: 'living', cost: 80, hi: true, dims: () => ({ w: 1, d: 1, h: 58 }), parts: { c: ['metal', '#e0b050'], b: ['wood', '#93592f'] }, drawHi(p, t, C) { GRAMOPHONEHI(p, t, C); } },
  easel: { pic: { w: 23, h: 37 }, name: '이젤', cat: 'living', cost: 45, hi: true, dims: () => ({ w: 1, d: 1, h: 70 }), parts: { b: ['wood', '#c4864e'], a: ['paper', '#4f8a55'] }, drawHi(p, t, C) { EASELHI(p, t, C); } },
  harp: { name: '하프', cat: 'living', cost: 140, hi: true, dims: () => ({ w: 1, d: 1, h: 80 }), parts: { c: ['metal', '#e0b050'], b: ['wood', '#93592f'] }, drawHi(p, t, C) { HARPHI(p, t, C); } },
  /* ===== 고딕 저택 ===== */
  mannequin: { name: '세일러 원피스 마네킹', cat: 'gothic', cost: 160, hi: true, dims: () => ({ w: 1, d: 1, h: 68 }), parts: { a: ['cloth', '#34406a'], b: ['wood', '#c4864e'], c: ['pattern', '#f4f0e8'] }, drawHi(p, t, C) { MANNEQUINHI(p, t, C); } },
  chandefloor: { name: '큰 촛대', cat: 'gothic', cost: 35, hi: true, dims: () => ({ w: 1, d: 1, h: 58 }), parts: { c: ['metal', '#e0b050'] }, drawHi(p, t, C) { CHANDEFLOORHI(p, t, C); } },
  apron: { name: '에이프런 드레스 마네킹', cat: 'gothic', cost: 160, hi: true, dims: () => ({ w: 1, d: 1, h: 68 }), parts: { a: ['cloth', '#7ab0e0'], b: ['wood', '#c4864e'], c: ['pattern', '#fbf8f2'] }, drawHi(p, t, C) { ALICEHI(p, t, C); } },
  lectern: { name: '책 독서대', cat: 'gothic', cost: 70, hi: true, dims: () => ({ w: 1, d: 1, h: 64 }), parts: { a: ['cloth', '#7e2236'], b: ['wood', '#5a3a24'], c: ['metal', '#e0b050'] }, drawHi(p, t, C) { LECTERNHI(p, t, C); } },
  rosedome: { name: '유리돔 장미', cat: 'gothic', cost: 90, hi: true, dims: () => ({ w: 1, d: 1, h: 48 }), parts: { a: ['rose', '#d8303a'], b: ['wood', '#3a2418'], c: ['glass', '#cfe6ee'] }, drawHi(p, t, C) { ROSEDOMEHI(p, t, C); } },
  raven: { name: '까마귀 횃대', cat: 'gothic', cost: 60, hi: true, dims: () => ({ w: 1, d: 1, h: 72 }), parts: { b: ['wood', '#5a3a24'], a: ['fur', '#1e1e26'] }, drawHi(p, t, C) { RAVENHI(p, t, C); } },
  /* ===== 식물 · 소품 ===== */
  plant: { name: '화분', cat: 'plant', cost: 80, plant: true, eff: '온실 성장 5% 빨라짐 (화분류 최대 3개)', hi: true, dims: () => ({ w: 1, d: 1, h: 48 }), parts: { a: ['leaf', '#4f8a55'], b: ['pot', '#ece8e0'] }, drawHi(p, t, C) { PLANTHI(p, t, C); } },
  bigplant: { name: '큰 야자 화분', cat: 'plant', cost: 110, plant: true, eff: '온실 성장 5% 빨라짐 (화분류 최대 3개)', hi: true, dims: () => ({ w: 1, d: 1, h: 80 }), parts: { a: ['leaf', '#8ab04a'], b: ['pot', '#ece8e0'] }, drawHi(p, t, C) { BIGPLANTHI(p, t, C); } },
  monstera: { name: '몬스테라', cat: 'plant', cost: 95, plant: true, eff: '온실 성장 5% 빨라짐 (화분류 최대 3개)', hi: true, dims: () => ({ w: 1, d: 1, h: 62 }), parts: { a: ['leaf', '#3a7a4a'], b: ['pot', '#3a3a44'] }, drawHi(p, t, C) { MONSTERAHI(p, t, C); } },
  cactus: { name: '선인장', cat: 'plant', cost: 35, plant: true, eff: '온실 성장 5% 빨라짐 (화분류 최대 3개)', hi: true, dims: () => ({ w: 1, d: 1, h: 44 }), parts: { a: ['leaf', '#5f9a50'], b: ['pot', '#c87a4a'] }, drawHi(p, t, C) { CACTUSHI(p, t, C); } },
  fern: { name: '고사리 바구니', cat: 'plant', cost: 45, plant: true, eff: '온실 성장 5% 빨라짐 (화분류 최대 3개)', hi: true, dims: () => ({ w: 1, d: 1, h: 40 }), parts: { a: ['leaf', '#6aa050'], b: ['wood', '#c8a060'] }, drawHi(p, t, C) { FERNHI(p, t, C); } },
  flowers: { name: '꽃병', cat: 'plant', cost: 40, hi: true, dims: () => ({ w: 1, d: 1, h: 52 }), parts: { a: ['cloth', '#f08ab0'], b: ['glass', '#5a9ad8'], c: ['leaf', '#4f8a55'] }, drawHi(p, t, C) { FLOWERSHI(p, t, C); } },
  rosebush: { name: '장미 덤불', cat: 'plant', cost: 75, plant: true, eff: '온실 성장 5% 빨라짐 (화분류 최대 3개)', hi: true, dims: () => ({ w: 1, d: 1, h: 50 }), parts: { a: ['rose', '#d8303a'], c: ['leaf', '#3f6b3a'], b: ['pot', '#9a6234'] }, drawHi(p, t, C) { ROSEBUSHHI(p, t, C); } },
  cushion: { name: '장식 쿠션', cat: 'small', cost: 12, hi: true, top: true, dims: () => ({ w: 1, d: 1, h: 24 }), parts: { a: ['cloth', '#4f8a55'] },
    drawHi(p, t, C) { const A = C.a; p.el(32, 43, 21, 4, 'rgba(30,15,5,.18)'); hpillow(p, 9, 10, 46, 34, A, 4.6); p.c(12, 12, 3, 3, A.f); p.c(49, 12, 3, 3, A.f); p.c(12, 40, 3, 3, A.d); p.c(49, 40, 3, 3, A.d); } },
  books: { name: '책 더미', cat: 'small', cost: 15, hi: true, dims: () => ({ w: 1, d: 1, h: 30 }), parts: { a: ['paper', '#a8344a'], c: ['pattern', '#3a5a8a'] }, drawHi(p, t, C) { BOOKSHI(p, t, C); } },
  teddy: { name: '곰 인형', cat: 'small', cost: 30, hi: true, dims: () => ({ w: 1, d: 1, h: 34 }), parts: { a: ['fur', '#c4864e'], c: ['cloth', '#a8344a'] }, drawHi(p, t, C) { TEDDYHI(p, t, C); } },
  bunny: { name: '토끼 인형', cat: 'small', cost: 35, hi: true, dims: () => ({ w: 1, d: 1, h: 40 }), parts: { a: ['fur', '#f4ece4'], c: ['cloth', '#f08ab0'] }, drawHi(p, t, C) { BUNNYHI(p, t, C); } },
  pdoll: { name: '도자기 인형', cat: 'small', cost: 60, hi: true, dims: () => ({ w: 1, d: 1, h: 44 }), parts: { a: ['cloth', '#6a8ac0'], b: ['hair', '#c9a060'] }, drawHi(p, t, C) { PDOLLHI(p, t, C); } },
  sheep: { name: '양 인형', cat: 'small', cost: 30, hi: true, dims: () => ({ w: 1, d: 1, h: 32 }), parts: { a: ['fur', '#f4f0e8'], b: ['face', '#3a3034'], c: ['metal', '#e0b050'] }, drawHi(p, t, C) { SHEEPHI(p, t, C); } },
  owl: { name: '부엉이 인형', cat: 'small', cost: 40, hi: true, dims: () => ({ w: 1, d: 1, h: 36 }), parts: { a: ['fur', '#9a6a44'], c: ['cloth', '#2a2a3a'] }, drawHi(p, t, C) { OWLHI(p, t, C); } },
  birdcage: { name: '새장', cat: 'small', cost: 70, hi: true, dims: () => ({ w: 1, d: 1, h: 66 }), parts: { c: ['metal', '#e0b050'], a: ['fur', '#ffd060'] }, drawHi(p, t, C) { BIRDCAGEHI(p, t, C); } },
  cat: { name: '검은 고양이', cat: 'small', cost: 180, eff: '이스터에그 반짝임 범위 넓어짐', hi: true, dims: () => ({ w: 1, d: 1, h: 26 }), parts: { a: ['fur', '#24242c'], c: ['light', '#e8c77a'] }, drawHi(p, t, C) { CATHI(p, t, C); } },
  candle: { name: '촛대', cat: 'small', cost: 20, hi: true, dims: () => ({ w: 1, d: 1, h: 46 }), parts: { c: ['metal', '#e0b050'] }, drawHi(p, t, C) { CANDLEHI(p, t, C); } },
  /* ===== 칠죄종 ===== */
  wrath: { name: '분노의 난로', cat: 'sin', cost: 130, hi: true, dims: () => ({ w: 1, d: 1, h: 54 }), parts: { c: ['metal', '#3a3a44'], a: ['light', '#ff6a2a'] }, drawHi(p, t, C) { WRATHHI(p, t, C); } },
  greed: { name: '탐욕의 보석함', cat: 'sin', cost: 130, hi: true, dims: () => ({ w: 1, d: 1, h: 34 }), parts: { c: ['metal', '#e0b050'] }, drawHi(p, t, C) { GREEDHI(p, t, C); } },
  sloth: { name: '나태의 흔들의자', cat: 'sin', cost: 130, hi: true, dims: () => ({ w: 2, d: 1, h: 38 }), parts: { a: ['cloth', '#8a9ad8'], c: ['cushion', '#f1e6cc'] }, drawHi(p, t, C) { SLOTHHI(p, t, C); } },
  gluttony: { name: '폭식의 케이크 스탠드', cat: 'sin', cost: 130, hi: true, dims: () => ({ w: 1, d: 1, h: 62 }), parts: { a: ['cloth', '#f08ab0'], c: ['sheet', '#fff4e4'] }, drawHi(p, t, C) { GLUTTONYHI(p, t, C); } },
  pride: { name: '오만의 탐정 황금상', cat: 'sin', cost: 130, hi: true, dims: () => ({ w: 1, d: 1, h: 86 }), parts: { c: ['metal', '#e0b050'], a: ['stone', '#efe6d0'] }, drawHi(p, t, C) { PRIDEHI(p, t, C); } },
  envy: { name: '질투의 거울', cat: 'sin', cost: 130, hi: true, dims: () => ({ w: 1, d: 1, h: 84 }), parts: { c: ['metal', '#4f8a55'], a: ['glass', '#a8d8b8'] }, drawHi(p, t, C) { ENVYHI(p, t, C); } },
  lust: { name: '색욕의 장미 데이베드', cat: 'sin', cost: 130, hi: true, dims: () => ({ w: 2, d: 1, h: 52 }), parts: { a: ['cloth', '#c03a6a'], b: ['wood', '#3a2418'], c: ['rose', '#d8303a'] }, drawHi(p, t, C) { LUSTHI(p, t, C); } },
  /* ===== 벽 장식 (벽 칸 w개, h = 그림 높이, wy = 벽 위쪽에서 떨어진 거리) ===== */
  window: { name: '창문', cat: 'window', wall: true, cost: 30, w: 2, h: 76, wy: 6, hi: true, parts: { a: ['curtain', '#a8344a'], b: ['frame', '#f1e6cc'] }, drawHi(p, t, C) { WINDOWHI(p, t, C); } },
  archwin: { name: '아치 창문', cat: 'window', wall: true, cost: 60, w: 2, h: 90, wy: 4, parts: { a: ['curtain', '#3a5a8a'], b: ['frame', '#5a3a24'] }, hi: true, drawHi(p, t, C) { ARCHWINHI(p, t, C); } },
  roundwin: { name: '둥근 창', cat: 'window', wall: true, cost: 40, w: 1, h: 36, wy: 18, parts: { b: ['frame', '#e0b050'] }, hi: true, drawHi(p, t, C) { ROUNDWINHI(p, t, C); } },
  stained: { name: '스테인드글라스', cat: 'window', wall: true, cost: 120, w: 2, h: 92, wy: 4, parts: { b: ['frame', '#3a3a44'], a: ['glass', '#a8344a'], c: ['pattern', '#3a5a8a'] }, hi: true, drawHi(p, t, C) { STAINEDHI(p, t, C); } },
  tallwin: { name: '레이스 커튼 창', cat: 'window', wall: true, cost: 50, w: 2, h: 84, wy: 6, parts: { a: ['curtain', '#f8f4ec'], b: ['frame', '#c4864e'] }, hi: true, drawHi(p, t, C) { TALLWINHI(p, t, C); } },
  painting: { pic: { w: 54, h: 35 }, name: '풍경화', cat: 'deco', wall: true, cost: 40, w: 2, h: 46, wy: 20, parts: { c: ['frame', '#e0b050'], a: ['paper', '#3a4a7a'] }, hi: true, drawHi(p, t, C) { PAINTINGHI(p, t, C); } },
  gallery: { pic: { w: 27, h: 21 }, name: '액자 모음', cat: 'deco', wall: true, cost: 60, w: 2, h: 70, wy: 10, parts: { a: ['frame', '#f1e6cc'], c: ['border', '#6a4a32'] }, hi: true, drawHi(p, t, C) { GALLERYHI(p, t, C); } },
  portrait: { pic: { w: 25, h: 49 }, name: '초상화', cat: 'deco', wall: true, cost: 60, w: 1, h: 56, wy: 12, parts: { c: ['frame', '#e0b050'], a: ['cloth', '#7e2236'] }, hi: true, drawHi(p, t, C) { PORTRAITHI(p, t, C); } },
  mirror: { name: '거울', cat: 'deco', wall: true, cost: 50, w: 1, h: 64, wy: 10, parts: { c: ['frame', '#e0b050'], a: ['glass', '#9ab8c4'] }, hi: true, drawHi(p, t, C) { MIRRORHI(p, t, C); } },
  antlers: { name: '사슴뿔 장식', cat: 'gothic', wall: true, cost: 65, w: 2, h: 44, wy: 16, parts: { b: ['wood', '#5a3a24'], a: ['body', '#efe6d0'] }, hi: true, drawHi(p, t, C) { ANTLERSHI(p, t, C); } },
  chandelier: { name: '샹들리에', cat: 'gothic', wall: true, cost: 150, w: 2, h: 52, wy: 0, parts: { c: ['metal', '#e0b050'] }, hi: true, drawHi(p, t, C) { CHANDELIERHI(p, t, C); } },
  garland: { name: '별 가랜드', cat: 'deco', wall: true, cost: 25, w: 2, h: 24, wy: 4, parts: { c: ['light', '#ffe27a'] }, hi: true, drawHi(p, t, C) { GARLANDHI(p, t, C); } },
  sconce: { name: '벽촛대', cat: 'deco', wall: true, cost: 30, w: 1, h: 40, wy: 26, parts: { c: ['metal', '#e0b050'] }, hi: true, drawHi(p, t, C) { SCONCEHI(p, t, C); } },
  wclock: { name: '벽시계', cat: 'deco', wall: true, cost: 45, w: 1, h: 32, wy: 18, parts: { b: ['wood', '#93592f'] }, hi: true, drawHi(p, t, C) { WCLOCKHI(p, t, C); } },
  wallshelf: { name: '벽 선반', cat: 'deco', wall: true, cost: 35, w: 2, h: 36, wy: 30, parts: { b: ['wood', '#c4864e'] }, hi: true, drawHi(p, t, C) { WALLSHELFHI(p, t, C); } },
  hangplant: { name: '걸이 화분', cat: 'plant', wall: true, plant: true, eff: '온실 성장 5% 빨라짐 (화분류 최대 3개)', cost: 50, w: 1, h: 66, wy: 0, parts: { a: ['leaf', '#4f8a55'], b: ['pot', '#ece8e0'] }, hi: true, drawHi(p, t, C) { HANGPLANTHI(p, t, C); } },
};
function o3(p, x, y, w, h, R) { p.c(x, y, w, h, R.o); p.c(x + 1, y + 1, w - 2, h - 2, R.t); p.c(x + 1, y + 1, w - 2, 1, R.L); }
function o4(p, x, y, w, h, R) { o3(p, x, y, w, h, R); p.c(x + 1, y + h - 2, w - 2, 1, R.d); }
function curtains(p, A, W, H) { const { c } = p; for (const [x0, dir] of [[0, 1], [W - 14, -1]]) { c(x0, 0, 14, H, A.t);
  for (let i = 0; i < 14; i += 4) { c(x0 + i, 0, 1, H, A.l); c(x0 + i + 2, 0, 1, H, A.f); } c(x0 + (dir > 0 ? 13 : 0), 0, 1, H, A.d); c(x0, H - 3, 14, 3, A.f); c(x0 + 2, Math.round(H * .55), 10, 3, GOLD); } }


/* ============================================================
   고해상도 가구 (칸 하나 = 64×64 도트) · 앞(0) 왼쪽(1) 뒤(2) 오른쪽(3)
   ============================================================ */
function hgrain(p, x, y, w, h, R, seed, vert, den) {
  for (let i = 0; i < Math.floor(w * h / (den || 40)); i++) { const gx = x + (hsh(i, seed) % Math.max(1, w)), gy = y + (hsh(seed, i) % Math.max(1, h)), len = 4 + (i % 9);
    if (vert) p.c(gx, gy, 1, Math.min(len, y + h - gy), i % 4 ? R.f : R.l); else p.c(gx, gy, Math.min(len, x + w - gx), 1, i % 4 ? R.f : R.l); }
}
/* 둥글고 폭신한 베개 (초타원 + 모서리 귀) */
function hpillow(p, x, y, w, h, S, nn) { const { c } = p, n = nn || 2.6, cx = (w - 1) / 2, cy = (h - 1) / 2;
  const half = (v, R) => R * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(v), n)), 1 / n);
  for (let yy = 0; yy < h; yy++) { const v = (yy - cy) / cy, hw = Math.round(half(v, cx) + (Math.abs(v) > .72 ? 1.5 : 0)); if (hw <= 0) continue;
    const x1 = Math.round(x + cx - hw), x2 = Math.round(x + cx + hw); c(x1, y + yy, x2 - x1 + 1, 1, S.f);
    if (yy === 0 || yy === h - 1) continue; const iw = Math.max(0, hw - 1), ix = Math.round(x + cx - iw), tone = v < -.45 ? S.L : v > .5 ? S.t : S.l; c(ix, y + yy, Math.round(iw * 2) + 1, 1, tone);
    if (v > .2) c(Math.round(x + cx + iw * .55), y + yy, Math.round(iw * .45), 1, S.t); }
  const { el } = p; el(Math.round(x + cx - w * .1), Math.round(y + cy - h * .12), Math.round(w * .3), Math.round(h * .22), S.L); el(Math.round(x + cx - w * .16), Math.round(y + cy - h * .2), Math.round(w * .14), Math.round(h * .1), nn ? S.L : '#fffdf6');
  c(Math.round(x + w * .3), y + 2, Math.round(w * .3), 1, '#ffffff');
  // 가운데 눌린 자국 · 모서리 주름
  c(Math.round(x + cx - w * .12), Math.round(y + cy + h * .14), Math.round(w * .24), 1, S.f); c(x + 3, y + 3, 3, 1, S.f); c(x + w - 6, y + 3, 3, 1, S.f); c(x + 3, y + h - 4, 3, 1, S.d); c(x + w - 6, y + h - 4, 3, 1, S.d); }
/* 물결치는 밑단과 둥근 모서리의 이불 (세로 방향) */
function hblanket(p, x, y, w, h, A, seed) { const { c } = p, r = 9, step = 16;
  for (let i = 0; i < w; i++) { const e = Math.min(i, w - 1 - i), top = e < r ? Math.round(r - Math.sqrt(r * r - (r - e) * (r - e))) : 0;
    const drape = e < 10 ? Math.round((10 - e) * .35) : 0, bot = h - 4 + Math.round(Math.sin(i / 6 + seed) * 1.6 + Math.sin(i / 13) * 1.2) + drape;
    c(x + i, y + top, 1, bot - top, A.o); if (i === 0 || i === w - 1) continue;
    c(x + i, y + top + 1, 1, bot - top - 2, A.t); c(x + i, y + top + 1, 1, 2, A.L); c(x + i, y + bot - 7, 1, 5, A.f); c(x + i, y + bot - 3, 1, 1, A.d);
    if (e < 12) c(x + i, y + top + 3, 1, bot - top - 8, e < 6 ? A.f : A.t);
    for (let yy = top + 14; yy < bot - 9; yy++) { const u = (i + yy) % step, v = (i - yy + 999 * step) % step; if (e >= 12 && (u === 0 || v === 0)) c(x + i, y + yy, 1, 1, A.f); else if (e >= 12 && (u === step / 2 && v === step / 2)) c(x + i, y + yy, 1, 1, A.d); } }
  for (let i = 3; i < 12; i += 4) { c(x + i, y + 16, 1, h - 26, A.d); c(x + w - 1 - i, y + 16, 1, h - 26, A.d); }
}
/* 접힌 시트 띠 (물결 가장자리) */
function hfold(p, x, y, w, S) { const { c } = p;
  for (let i = 0; i < w; i++) { const e = Math.min(i, w - 1 - i), t0 = Math.round(Math.sin(i / 18) * 1) + (e < 4 ? 4 - e : 0), b0 = 15 + Math.round(Math.sin(i / 14 + 1) * 1.4);
    c(x + i, y + t0, 1, b0 - t0, S.d); c(x + i, y + t0 + 1, 1, b0 - t0 - 2, S.l); c(x + i, y + t0 + 1, 1, 2, S.L); c(x + i, y + b0 - 4, 1, 2, S.t); c(x + i, y + b0, 1, 3, 'rgba(0,0,0,.2)'); } }
function hquilt(p, x, y, w, h, A, step) { const { c } = p; step = step || 16;
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) { const u = (xx + yy) % step, v = (xx - yy + 999 * step) % step;
    if (u === 0 || v === 0) c(x + xx, y + yy, 1, 1, A.f); else if ((u === 1 || v === 1) && (xx + yy) % 2) c(x + xx, y + yy, 1, 1, A.l); }
  for (let yy = step / 2; yy < h; yy += step) for (let xx = ((yy / step + .5) % 2 < 1 ? 0 : step / 2); xx < w; xx += step) { c(x + xx, y + yy, 1, 1, A.d); }
  c(x, y, w, 3, 'rgba(255,255,255,.08)'); c(x, y + h - 6, w, 6, 'rgba(0,0,0,.12)'); }
function hpost(p, x, y, h, B, M) { const { c, orr, el } = p;
  orr(x, y, 14, h, B.f, B.o, 3); c(x + 2, y + 2, 3, h - 4, B.l); c(x + 3, y + 2, 1, h - 4, B.L); c(x + 10, y + 2, 2, h - 4, B.d);
  c(x, y + 10, 14, 3, B.o); c(x + 1, y + 11, 12, 1, B.l); el(x + 7, y - 2, 8, 7, B.o); el(x + 7, y - 2, 7, 6, B.t); el(x + 5, y - 4, 3, 3, B.L); c(x + 6, y - 9, 2, 3, M.t); }
const BEDHI = {
  front(p, t, C, back) { const { c, orr, el } = p, A = C.a, B = C.b, S = C.c, M = ramp(GOLD);
    if (!back) { // 머리판
      orr(8, 4, 112, 58, B.t, B.o, 16); c(18, 7, 92, 3, B.L); c(12, 12, 104, 2, B.l);
      orr(20, 16, 88, 40, B.f, B.d, 10); orr(23, 19, 82, 34, B.t, B.d, 8); hgrain(p, 26, 22, 76, 28, B, 3);
      el(64, 30, 12, 7, B.o); el(64, 30, 11, 6, M.t); el(62, 28, 6, 3, M.L); c(52, 30, 24, 1, M.f); c(40, 22, 2, 2, M.t); c(86, 22, 2, 2, M.t);
      hpost(p, 0, 8, 54, B, M); hpost(p, 114, 8, 54, B, M);
    }
    // 프레임 · 매트리스
    c(4, 50, 120, 150, B.o); c(6, 50, 116, 148, B.f); hgrain(p, 6, 60, 4, 130, B, 9, true); hgrain(p, 118, 60, 4, 130, B, 11, true);
    p.rr(10, back ? 70 : 52, 108, back ? 112 : 132, S.f, 6); p.rr(11, back ? 71 : 53, 106, back ? 110 : 130, S.t, 5); c(13, back ? 72 : 54, 102, 2, S.L);
    if (!back) { hpillow(p, 11, 53, 52, 38, S); hpillow(p, 65, 53, 52, 38, S); }
    // 이불
    const top = back ? 76 : 94; hblanket(p, 1, top, 126, 196 - top, A, 0);
    if (!back) hfold(p, 3, top - 2, 122, S);
    if (back) { orr(0, 48, 128, 26, B.t, B.o, 5); c(4, 50, 120, 3, B.L); c(3, 60, 122, 10, B.f); hgrain(p, 8, 62, 112, 6, B, 23); hpost(p, 0, 50, 26, B, M); hpost(p, 114, 50, 26, B, M); }
    // 발판
    if (!back) { orr(0, 186, 128, 30, B.t, B.o, 5); c(4, 188, 120, 3, B.L); } c(3, 200, 122, 12, B.f); c(3, 200, 122, 1, B.d); hgrain(p, 8, 202, 112, 8, B, 21);
    orr(54, 192, 20, 7, M.t, M.o, 2); c(56, 193, 8, 2, M.L);
    c(4, 214, 9, 6, B.o); c(115, 214, 9, 6, B.o);
    if (back) { // 뒤에서 본 높은 머리판
      orr(6, 150, 116, 66, B.f, B.o, 14); for (let x = 12; x < 118; x += 13) { c(x, 156, 11, 56, B.t); c(x, 156, 2, 56, B.l); c(x + 10, 156, 1, 56, B.d); }
      c(10, 154, 108, 3, B.L); hpost(p, 0, 156, 62, B, M); hpost(p, 114, 156, 62, B, M); c(4, 214, 120, 4, B.d); }
  },
  side(p, t, C) { const { c, orr, el } = p, A = C.a, B = C.b, S = C.c, M = ramp(GOLD);    // 머리가 왼쪽, 192×150
    c(10, 40, 172, 82, B.o); c(12, 40, 168, 80, B.f);
    p.rr(14, 34, 164, 82, S.f, 6); p.rr(15, 35, 162, 80, S.t, 5); c(17, 36, 158, 2, S.L);
    hpillow(p, 18, 38, 38, 74, S);
    // 이불: 윗면 + 앞으로 늘어진 자락 (밑단 물결)
    for (let i = 0; i < 124; i++) { const e = Math.min(i, 123 - i), top = 30 + (e < 8 ? Math.round(8 - Math.sqrt(64 - (8 - e) * (8 - e))) : 0), bot = 130 + Math.round(Math.sin(i / 6) * 1.8 + Math.sin(i / 15) * 1.2);
      c(62 + i, top, 1, bot - top, A.o); if (i === 0 || i === 123) continue; c(62 + i, top + 1, 1, 82, A.t); c(62 + i, top + 1, 1, 2, A.L); c(62 + i, 112, 1, bot - 113, A.f); c(62 + i, 112, 1, 1, A.d); c(62 + i, bot - 2, 1, 1, A.d);
      if (i % 11 === 5) { c(62 + i, 114, 1, bot - 117, A.d); c(63 + i, 114, 1, bot - 119, A.l); }
      for (let yy = 42; yy < 108; yy++) { const u = (i + yy) % 16, v = (i - yy + 9999) % 16; if (i > 18 && (u === 0 || v === 0)) c(62 + i, yy, 1, 1, A.f); } }
    for (let yy = 0; yy < 100; yy++) { const l0 = Math.round(Math.sin(yy / 16) * 1), r0 = 17 + Math.round(Math.sin(yy / 13 + 2) * 1.3), Y = 29 + yy; if (Y > 126) break;
      c(60 + l0, Y, r0 - l0, 1, S.d); c(61 + l0, Y, r0 - l0 - 2, 1, S.l); c(61 + l0, Y, 2, 1, S.L); c(r0 + 56, Y, 2, 1, S.t); c(r0 + 60, Y, 3, 1, 'rgba(0,0,0,.2)'); }
    c(10, 120, 172, 20, B.o); c(12, 121, 168, 17, B.t); c(12, 121, 168, 2, B.L); hgrain(p, 14, 125, 164, 10, B, 31); c(12, 136, 168, 2, B.d);
    c(14, 140, 8, 10, B.o); c(170, 140, 8, 10, B.o);
    orr(0, 0, 18, 146, B.t, B.o, 4); c(2, 2, 4, 140, B.l); c(3, 2, 1, 140, B.L); c(13, 2, 3, 140, B.d); el(9, -2, 9, 7, B.o); el(9, -2, 8, 6, B.t); el(7, -4, 3, 3, B.L); c(8, -10, 2, 4, M.t);
    hgrain(p, 6, 10, 6, 126, B, 41, true); orr(4, 40, 10, 40, M.t, M.o, 3);
    orr(176, 52, 16, 94, B.t, B.o, 4); c(178, 54, 3, 88, B.l); c(188, 54, 2, 88, B.d); el(184, 50, 8, 6, B.o); el(184, 50, 7, 5, B.t);
  },
};

/* 폭신한 덩어리 (초타원) — 쿠션 · 팔걸이용. 위쪽은 밝게, 아래쪽은 어둡게 */
function hpuff(p, x, y, w, h, R, n, light) { const { c } = p; n = n || 3; const cx = (w - 1) / 2, cy = (h - 1) / 2;
  for (let yy = 0; yy < h; yy++) { const v = (yy - cy) / cy, hw = Math.round(cx * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(v), n)), 1 / n)); if (hw <= 0) continue;
    const x1 = Math.round(x + cx - hw); c(x1, y + yy, hw * 2 + 1, 1, R.o); if (yy === 0 || yy === h - 1) continue;
    const tone = v < -.55 ? (light ? R.L : R.l) : v < .35 ? R.t : v < .75 ? R.f : R.d; c(x1 + 1, y + yy, hw * 2 - 1, 1, tone);
    if (v > -.55 && v < .55) { c(x1 + 1, y + yy, 2, 1, R.l); c(x1 + hw * 2 - 2, y + yy, 2, 1, R.f); } }
  p.el(Math.round(x + cx - w * .12), Math.round(y + cy - h * .22), Math.round(w * .22), Math.max(1, Math.round(h * .12)), light ? '#ffffff22' : R.L); }

/* 이어진 쿠션 띠 — 쿠션끼리 홈 없이 붙고, 윗변만 쿠션마다 살짝 볼록 (가로 방향) */
function hband(p, x, y, w, h, n, R, o) { const { c } = p; o = o || {}; const amp = o.amp == null ? 3 : o.amp, rad = o.rad == null ? 9 : o.rad, sw = w / n, front = o.front || 0;
  for (let i = 0; i < w; i++) { const u = (i % sw) / sw, e = Math.min(i, w - 1 - i), corner = e < rad ? Math.round(rad - Math.sqrt(rad * rad - (rad - e) * (rad - e))) : 0;
    const top = Math.max(corner, amp - Math.round(Math.sin(Math.PI * u) * amp)), bot = h - (e < rad * .6 ? Math.round((rad * .6 - e) * .6) : 0);
    c(x + i, y + top, 1, bot - top, R.o); if (i === 0 || i === w - 1) continue; const H = bot - top - 2, ft = front ? Math.round(front) : 0;
    for (let k = 0; k < H; k++) { const f = k / Math.max(1, H - ft); const tone = k >= H - ft ? (k === H - ft ? R.d : R.f) : f < .06 ? R.L : f < .22 ? R.l : f < .78 ? R.t : R.f; c(x + i, y + top + 1 + k, 1, 1, tone); }
    if (e < 3) c(x + i, y + top + 2, 1, H - 2, R.f); else if (e < 5) c(x + i, y + top + 2, 1, H - 2 - ft, R.l); }
  for (let s2 = 1; s2 < n; s2++) { const xb = x + Math.round(s2 * sw); c(xb, y + amp + 2, 1, h - amp - 6, R.f); c(xb + 1, y + amp + 3, 1, h - amp - 10, R.l); }
  if (o.tuft) for (let s2 = 0; s2 < n; s2++) { const cx = x + Math.round((s2 + .5) * sw); [[-9, h * .42], [9, h * .42], [0, h * .62]].forEach(([dx, dy]) => { c(cx + dx, y + Math.round(dy), 2, 2, R.d); c(cx + dx, y + Math.round(dy) - 1, 2, 1, R.l); }); }
}
/* 세로 방향 (옆모습): 왼쪽 변만 쿠션마다 살짝 볼록 */
function hbandV(p, x, y, w, h, n, R, o) { const { c } = p; o = o || {}; const amp = o.amp == null ? 3 : o.amp, rad = o.rad == null ? 8 : o.rad, sh = h / n, front = o.front || 0;
  for (let j = 0; j < h; j++) { const u = (j % sh) / sh, e = Math.min(j, h - 1 - j), corner = e < rad ? Math.round(rad - Math.sqrt(rad * rad - (rad - e) * (rad - e))) : 0;
    const lft = Math.max(corner, amp - Math.round(Math.sin(Math.PI * u) * amp)), rgt = w - corner; c(x + lft, y + j, rgt - lft, 1, R.o); if (j === 0 || j === h - 1) continue;
    const W = rgt - lft - 2; for (let k = 0; k < W; k++) { const f = k / Math.max(1, W); const tone = k < front ? (k === front - 1 ? R.d : R.f) : f < .1 ? R.l : f < .7 ? R.t : R.f; c(x + lft + 1 + k, y + j, 1, 1, tone); }
    if (e < 3) c(x + lft + 1, y + j, W, 1, R.f); else if (e < 6) c(x + lft + 1 + front, y + j, W - front, 1, R.l); }
  for (let s2 = 1; s2 < n; s2++) { const yb = y + Math.round(s2 * sh); c(x + amp + 2, yb, w - amp - 5, 1, R.f); c(x + amp + 3, yb + 1, w - amp - 8, 1, R.l); }
}
const SOFAHI = {
  front(p, t, C) { const { c, el } = p, A = C.a, B = C.b, P = C.c;
    // 등받이: 이어진 쿠션 3칸 (단추 장식)
    hband(p, 6, 0, 180, 54, 3, A, { amp: 4, rad: 12, tuft: true });
    // 앉는 쿠션: 이어진 3칸, 아래쪽은 앞면
    c(14, 46, 164, 22, A.o); c(15, 46, 162, 21, A.d); hband(p, 26, 54, 140, 40, 3, A, { amp: 3, rad: 6, front: 15 });
    // 팔걸이 (낮고 덜 둥글게)
    [0, 162].forEach(x => { c(x + 2, 56, 26, 50, A.o); c(x + 3, 57, 24, 48, A.f); c(x + 4, 62, 3, 40, A.t); c(x + 22, 62, 3, 40, A.d); hpuff(p, x, 44, 30, 22, A, 4, true); });
    // 치마단 · 파이핑 · 다리
    c(4, 92, 184, 18, A.o); c(5, 93, 182, 16, A.f); c(5, 93, 182, 2, A.t); c(5, 100, 182, 1, A.d); for (let x = 9; x < 186; x += 9) c(x, 101, 1, 7, A.d);
    [10, 90, 170].forEach(x => { c(x, 110, 12, 4, B.o); c(x + 2, 110, 8, 14, B.o); c(x + 3, 110, 6, 13, B.t); c(x + 3, 110, 2, 13, B.l); c(x + 3, 121, 6, 2, GOLD); });
    // 쿠션 (색 바꿀 수 있는 부분)
  },
  back(p, t, C) { const { c } = p, A = C.a, B = C.b;
    hpuff(p, 0, 36, 30, 22, A, 4, true); hpuff(p, 162, 36, 30, 22, A, 4, true);
    hpuff(p, 6, 0, 180, 30, A, 4, true); c(8, 16, 176, 78, A.o); c(9, 17, 174, 76, A.t); c(9, 17, 174, 3, A.l);
    for (let x = 30; x < 180; x += 46) { c(x, 20, 1, 70, A.f); c(x + 1, 20, 1, 70, A.l); }
    c(9, 84, 174, 8, A.f); c(9, 84, 174, 1, A.d); for (let i = 0; i < 18; i++) c(16 + hsh(i, 3) % 160, 26 + hsh(i, 4) % 50, 2, 1, A.f);
    c(4, 92, 184, 18, A.o); c(5, 93, 182, 16, A.f); c(5, 100, 182, 1, A.d);
    [10, 90, 170].forEach(x => { c(x + 2, 110, 8, 14, B.o); c(x + 3, 110, 6, 13, B.t); c(x + 3, 121, 6, 2, GOLD); });
  },
  side(p, t, C) { const { c, el } = p, A = C.a, B = C.b, P = C.c;   // 앞이 왼쪽 · 64×224 (바닥 64×192)
    // 등받이 (오른쪽) · 앉는 쿠션 (이어진 3칸)
    hbandV(p, 38, 6, 26, 196, 3, A, { amp: 3, rad: 10 });
    hbandV(p, 4, 26, 40, 162, 3, A, { amp: 3, rad: 6, front: 8 });
    // 쿠션
    // 먼 쪽 팔걸이 (위) · 가까운 쪽 팔걸이 (아래, 앞면이 보임)
    hpuff(p, 2, 12, 60, 22, A, 4, true);
    c(2, 192, 60, 18, A.o); c(3, 193, 58, 16, A.f); c(3, 193, 58, 3, A.t); hpuff(p, 2, 182, 60, 20, A, 4, true);
    c(2, 208, 60, 6, A.d); for (let x = 6; x < 60; x += 9) c(x, 209, 1, 5, A.o);
    c(4, 214, 8, 10, B.o); c(5, 214, 6, 9, B.t); c(52, 214, 8, 10, B.o); c(53, 214, 6, 9, B.t); c(5, 221, 6, 2, GOLD); c(53, 221, 6, 2, GOLD);
  },
};

/* 돌린 다리 (나무) */
function hleg(p, x, y, h, B) { const { c } = p; c(x, y, 5, h, B.o); c(x + 1, y, 3, h - 1, B.t); c(x + 1, y, 1, h - 1, B.l); c(x, y + Math.round(h * .3), 5, 2, B.o); c(x + 1, y + Math.round(h * .3), 3, 1, B.L); c(x, y + h - 3, 5, 3, B.d); }
const CHAIRHI = {
  front(p, t, C) { const { c, orr } = p, B = C.b, A = C.a;
    hleg(p, 11, 62, 22, ramp(B.f)); hleg(p, 48, 62, 22, ramp(B.f));                 // 뒷다리
    orr(11, 5, 42, 42, A.t, A.o, 4); c(14, 8, 36, 3, A.l); c(14, 41, 36, 3, A.f); c(14, 11, 2, 28, A.l);
    c(9, 5, 6, 59, B.o); c(11, 5, 2, 59, B.t); c(49, 5, 6, 59, B.o); c(51, 5, 2, 59, B.t);
    orr(7, 0, 50, 8, B.t, B.o, 4); c(10, 1, 44, 2, B.L); c(29, 3, 6, 3, GOLD); [[24, 24], [40, 24], [32, 32]].forEach(([x, y]) => { c(x, y, 2, 2, A.d); c(x, y - 1, 2, 1, A.L); });
    c(12, 46, 40, 2, B.f);
    hband(p, 8, 44, 48, 26, 1, A, { amp: 2, rad: 6, front: 7 });
    c(9, 68, 46, 6, B.o); c(10, 68, 44, 5, B.t); c(10, 68, 44, 1, B.L); c(10, 72, 44, 1, B.d);
    hleg(p, 10, 72, 20, B); hleg(p, 49, 72, 20, B);
  },
  back(p, t, C) { const { c, orr } = p, B = C.b, A = C.a;
    hband(p, 10, 24, 44, 22, 1, A, { amp: 2, rad: 6 });
    hleg(p, 10, 60, 24, ramp(B.f)); hleg(p, 49, 60, 24, ramp(B.f));
    orr(10, 25, 44, 41, B.f, B.o, 3); c(13, 29, 38, 2, B.t); for (let x = 16; x < 50; x += 5) c(x, 33, 1, 28, B.d);
    c(8, 25, 6, 67, B.o); c(10, 25, 2, 67, B.t); c(50, 25, 6, 67, B.o); c(52, 25, 2, 67, B.t);
    orr(6, 20, 52, 8, B.t, B.o, 4); c(9, 21, 46, 2, B.L);
    c(14, 66, 36, 4, B.f); c(14, 66, 36, 1, B.l);
  },
  side(p, t, C) { const { c, orr } = p, B = C.b, A = C.a;     // 앞이 왼쪽
    hleg(p, 40, 64, 26, ramp(B.f));
    c(39, 5, 7, 42, A.o); c(40, 6, 5, 40, A.t); c(40, 6, 1, 40, A.l);
    c(44, 0, 5, 70, B.o); c(45, 0, 3, 70, B.t); c(45, 0, 1, 70, B.L); orr(42, 0, 10, 7, B.t, B.o, 3);
    hband(p, 6, 46, 39, 22, 1, A, { amp: 2, rad: 6, front: 6 });
    c(7, 66, 42, 6, B.o); c(8, 66, 40, 5, B.t); c(8, 66, 40, 1, B.L);
    hleg(p, 9, 70, 22, B); hleg(p, 42, 70, 22, B);
  },
};
const ARMCHAIRHI = {
  front(p, t, C) { const { c } = p, A = C.a, B = C.b;
    hband(p, 4, 0, 56, 54, 1, A, { amp: 3, rad: 14, tuft: false }); [[18, 16], [32, 16], [46, 16], [25, 28], [39, 28]].forEach(([x, y]) => { c(x, y, 2, 2, A.d); c(x, y - 1, 2, 1, A.l); c(x - 4, y + 4, 3, 1, A.f); c(x + 3, y + 4, 3, 1, A.f); });
    hband(p, 10, 44, 44, 34, 1, A, { amp: 2, rad: 6, front: 14 });
    [0, 50].forEach(x => { c(x + 1, 50, 13, 40, A.o); c(x + 2, 51, 11, 38, A.f); c(x + 3, 54, 2, 32, A.t); hpuff(p, x, 40, 14, 18, A, 4, true); });
    c(2, 86, 60, 8, A.o); c(3, 87, 58, 6, A.f); c(3, 87, 58, 1, A.t); for (let x = 6; x < 60; x += 7) c(x, 88, 1, 5, A.d);
    hleg(p, 5, 92, 9, B); hleg(p, 54, 92, 9, B);
  },
  back(p, t, C) { const { c } = p, A = C.a, B = C.b;
    hpuff(p, 0, 38, 14, 18, A, 4, true); hpuff(p, 50, 38, 14, 18, A, 4, true);
    hband(p, 4, 0, 56, 30, 1, A, { amp: 3, rad: 14 }); c(5, 22, 54, 66, A.o); c(6, 22, 52, 64, A.t); c(6, 22, 52, 3, A.l); c(31, 26, 1, 56, A.f); c(32, 26, 1, 56, A.l); c(6, 76, 52, 10, A.f);
    c(2, 86, 60, 8, A.o); c(3, 87, 58, 6, A.f); hleg(p, 5, 92, 9, B); hleg(p, 54, 92, 9, B);
  },
  side(p, t, C) { const { c, orr } = p, A = C.a, B = C.b;     // 앞이 왼쪽 · 등받이 + 앉는 자리 + 팔걸이를 한 덩어리로
    hbandV(p, 38, 2, 24, 80, 1, A, { amp: 2, rad: 10 });
    orr(2, 30, 60, 58, A.t, A.o, 9); c(5, 32, 52, 3, A.L); c(5, 35, 52, 4, A.l);
    c(4, 44, 56, 3, A.L); c(4, 47, 56, 3, A.l); c(4, 52, 56, 2, A.f); for (let x = 10; x < 56; x += 11) c(x, 44, 1, 8, A.t);
    c(3, 58, 58, 28, A.f); c(3, 58, 58, 1, A.d); c(4, 59, 2, 26, A.t); for (let x = 9; x < 58; x += 8) { c(x, 64, 1, 20, A.d); c(x + 1, 64, 1, 18, A.t); }
    c(2, 86, 60, 8, A.o); c(3, 87, 58, 6, A.f); c(3, 87, 58, 1, A.t); hleg(p, 5, 92, 9, B); hleg(p, 54, 92, 9, B);
  },
};
const RTABLEHI = (p, t, C) => { const { c, el } = p, A = C.a, B = C.b, M = C.c, cx = 64, cy = 44, rx = 61, ry = 34;
  // 받침 (천 아래로 살짝)
  el(64, 122, 22, 5, B.o); el(64, 121, 20, 4, B.t); c(58, 104, 12, 18, B.o); c(59, 104, 10, 17, B.t); c(60, 104, 2, 17, B.l);
  // 늘어진 식탁보: 상판 아래 테두리를 따라 물결치며 내려와요
  for (let i = -rx; i <= rx; i++) { const yb = cy + Math.round(ry * Math.sqrt(Math.max(0, 1 - (i * i) / (rx * rx)))), drop = 26 - Math.round(Math.abs(i) / rx * 8) + Math.round(Math.sin(i / 5) * 2), x = cx + i;
    const fold = ((i + 64) % 12); c(x, yb - 2, 1, drop + 2, A.o); if (Math.abs(i) < rx) { c(x, yb - 1, 1, drop, fold < 2 ? A.d : fold < 5 ? A.f : fold < 9 ? A.t : A.l); c(x, yb + drop - 3, 1, 2, A.f); if ((i + 64) % 4 === 0) c(x, yb + drop - 1, 1, 2, A.L); } }
  // 상판 (타원 전체)
  el(cx, cy, rx + 1, ry + 1, A.o); el(cx, cy, rx, ry, A.t); el(cx - 6, cy - 6, rx - 12, ry - 10, A.l); el(cx - 14, cy - 12, rx - 36, ry - 24, A.L);
  for (let k = 0; k < 72; k++) { const a = k / 72 * Math.PI * 2, x = cx + Math.round(Math.cos(a) * (rx - 3)), y = cy + Math.round(Math.sin(a) * (ry - 3)); c(x, y, 2, 1, k % 2 ? A.f : A.L); }
  // 촛대 · 찻잔
  el(64, 46, 12, 4, M.o); el(64, 45, 11, 3, M.t); c(62, 30, 4, 16, M.t); c(62, 30, 1, 16, M.L); c(48, 34, 32, 3, M.t); c(48, 34, 32, 1, M.L);
  [[48, 20], [62, 14], [76, 20]].forEach(([x, y], i) => { c(x - 1, y, 6, 15, '#a09a90'); c(x, y, 4, 14, '#f4f0e8'); c(x, y, 1, 14, '#ffffff'); c(x + 1, y - 5 + ((t + i) % 2), 2, 5, (t + i) % 2 ? '#ffb347' : '#ffd27a'); c(x + 1, y - 2, 1, 2, '#fff6d0'); });
  [[30, 52], [92, 54]].forEach(([x, y]) => { el(x, y, 9, 4, '#9a948a'); el(x, y - 1, 8, 3, '#f8f4ec'); c(x - 4, y - 7, 8, 6, '#9a948a'); c(x - 3, y - 6, 6, 4, '#f8f4ec'); c(x - 3, y - 5, 6, 2, '#a8603a'); c(x + 4, y - 5, 2, 3, '#9a948a'); });
};

/* 손잡이 · 서랍 */
function hknob(p, x, y, M) { p.c(x, y, 4, 4, M.o); p.c(x + 1, y + 1, 2, 2, M.t); p.c(x + 1, y + 1, 1, 1, M.L); }
function hdrawer(p, x, y, w, h, B, M) { const { c } = p; c(x, y, w, h, B.o); c(x + 1, y + 1, w - 2, h - 2, B.t); c(x + 1, y + 1, w - 2, 1, B.l); c(x + 1, y + h - 2, w - 2, 1, B.f); hknob(p, x + Math.floor(w / 2) - 2, y + Math.floor(h / 2) - 2, M); }
const DESKHI = {
  front(p, t, C) { const { c, el, orr } = p, B = C.b, M = C.c, A = C.a;     // 128 × 72
    // 상판
    c(0, 12, 128, 18, B.o); c(2, 13, 124, 15, B.t); c(2, 13, 124, 2, B.L); c(2, 26, 124, 2, B.f); hgrain(p, 4, 16, 120, 9, B, 3);
    // 앞면 (왼쪽 서랍장 + 가운데 서랍 + 오른쪽 다리)
    c(2, 30, 124, 6, B.o); c(3, 30, 122, 5, B.f); c(3, 30, 122, 1, B.d);
    c(4, 34, 44, 34, B.o); c(5, 34, 42, 33, B.f); hdrawer(p, 7, 36, 38, 14, B, M); hdrawer(p, 7, 51, 38, 14, B, M);
    hdrawer(p, 52, 35, 40, 10, B, M);
    c(110, 34, 12, 34, B.o); c(111, 34, 10, 33, B.t); c(112, 34, 2, 33, B.l); c(119, 34, 1, 33, B.d);
    c(4, 66, 44, 4, B.d); c(110, 66, 12, 4, B.d);
    // 책상 위: 책, 종이, 잉크병 · 깃펜, 촛대
    orr(8, 4, 24, 14, A.t, A.o, 2); c(9, 5, 22, 2, A.l); c(10, 14, 20, 2, '#f1ead8'); c(29, 6, 2, 9, A.f);
    c(40, 8, 22, 14, '#9a948a'); c(41, 7, 20, 14, '#f8f4ec'); [10, 13, 16].forEach(y => c(43, y, 15, 1, '#b8b0a0'));
    el(74, 16, 5, 4, '#1a1a22'); el(74, 15, 4, 3, '#3a3a4a'); c(73, 13, 2, 1, '#6a6a80'); p.ln(76, 14, 86, 0, '#f4f0e8', 1); p.ln(77, 14, 87, 1, '#d8d0c0', 1); c(85, 0, 3, 3, '#f4f0e8');
    el(108, 20, 7, 3, M.o); el(108, 19, 6, 2, M.t); c(106, 6, 4, 13, '#f4f0e8'); c(106, 6, 1, 13, '#ffffff'); c(107, 2 + (t % 2), 2, 4, t % 2 ? '#ffb347' : '#ffd27a'); c(107, 4, 1, 2, '#fff6d0');
  },
  back(p, t, C) { const { c } = p, B = C.b;
    c(0, 12, 128, 18, B.o); c(2, 13, 124, 15, B.t); c(2, 13, 124, 2, B.L); hgrain(p, 4, 16, 120, 9, B, 5);
    c(2, 28, 124, 40, B.o); c(3, 29, 122, 38, B.f); for (let x = 3; x < 124; x += 20) { c(x, 29, 1, 38, B.d); c(x + 1, 29, 1, 38, B.l); }
    c(3, 64, 122, 4, B.d); c(2, 68, 10, 4, B.o); c(116, 68, 10, 4, B.o);
  },
  side(p, t, C) { const { c } = p, B = C.b, A = C.a;    // 앞이 왼쪽 · 64 × 136
    c(4, 4, 56, 100, B.o); c(6, 5, 52, 97, B.t); c(6, 5, 52, 2, B.L); hgrain(p, 8, 8, 48, 90, B, 9, true, 90);
    p.orr(20, 16, 12, 18, A.t, A.o, 2); c(21, 17, 10, 2, A.l); c(30, 18, 2, 14, '#f1ead8'); c(16, 50, 20, 14, '#9a948a'); c(17, 49, 18, 14, '#f8f4ec'); [53, 56, 59].forEach(y => c(19, y, 13, 1, '#b8b0a0')); p.el(28, 80, 4, 3, '#1a1a22'); p.ln(29, 79, 36, 70, '#f4f0e8', 1);
    c(4, 102, 56, 30, B.o); c(5, 103, 54, 28, B.f); c(5, 103, 54, 2, B.t); c(8, 108, 48, 18, B.d); c(9, 109, 46, 16, B.f); c(4, 130, 8, 6, B.o); c(52, 130, 8, 6, B.o);
  },
};
const WARDHI = {
  front(p, t, C) { const { c, orr } = p, B = C.b, M = C.c;    // 128 × 184
    c(0, 10, 128, 170, B.o); c(2, 11, 124, 168, B.f);
    // 왕관 장식
    orr(0, 0, 128, 16, B.t, B.o, 2); c(2, 2, 124, 3, B.L); c(2, 12, 124, 2, B.d); orr(44, -6, 40, 10, B.t, B.o, 4); c(60, -4, 8, 4, M.t); c(61, -3, 3, 2, M.L);
    // 문 두 짝
    [5, 65].forEach((x, i) => { c(x, 18, 58, 148, B.o); c(x + 2, 19, 54, 145, B.t); c(x + 2, 19, 54, 2, B.L); c(x + 2, 19, 2, 145, B.l); c(x + 52, 19, 2, 145, B.f);
      [[26, 52], [86, 72]].forEach(([y, h]) => { c(x + 8, y, 42, h, B.d); c(x + 9, y + 1, 40, h - 2, B.f); c(x + 10, y + 2, 38, h - 4, B.t); c(x + 10, y + 2, 38, 1, B.l); hgrain(p, x + 12, y + 4, 34, h - 8, B, x + y, true, 140); });
      c(x + (i ? 4 : 50), 78, 4, 18, M.o); c(x + (i ? 5 : 51), 79, 2, 16, M.t); c(x + (i ? 5 : 51), 79, 1, 6, M.L); });
    c(62, 18, 4, 148, B.o);
    // 받침 · 다리
    c(2, 166, 124, 10, B.t); c(2, 166, 124, 2, B.L); c(2, 174, 124, 2, B.d); c(4, 176, 14, 8, B.o); c(110, 176, 14, 8, B.o); c(6, 176, 10, 6, B.f); c(112, 176, 10, 6, B.f);
  },
  back(p, t, C) { const { c, orr } = p, B = C.b;
    c(0, 10, 128, 170, B.o); orr(0, 0, 128, 16, B.t, B.o, 2); c(2, 2, 124, 3, B.L);
    for (let x = 2; x < 126; x += 18) { c(x, 16, 17, 150, B.f); c(x, 16, 2, 150, B.l); c(x + 16, 16, 1, 150, B.d); hgrain(p, x + 3, 20, 12, 142, B, x, true, 120); c(x + 8, 22, 2, 2, B.o); c(x + 8, 158, 2, 2, B.o); }
    c(2, 166, 124, 10, B.t); c(2, 174, 124, 2, B.d); c(4, 176, 14, 8, B.o); c(110, 176, 14, 8, B.o);
  },
  side(p, t, C) { const { c, orr } = p, B = C.b;    // 앞이 왼쪽 · 64 × 236
    orr(6, 0, 52, 72, B.t, B.o, 2); c(8, 2, 48, 3, B.L); hgrain(p, 10, 8, 44, 60, B, 4, false, 120);
    c(6, 70, 52, 156, B.o); c(8, 71, 48, 154, B.f); c(8, 71, 48, 12, B.t); c(8, 71, 48, 2, B.L); c(8, 82, 48, 2, B.d);
    c(14, 92, 36, 116, B.d); c(15, 93, 34, 114, B.t); c(15, 93, 34, 1, B.l); hgrain(p, 17, 96, 30, 108, B, 11, true, 140);
    c(4, 74, 4, 150, B.d); c(8, 214, 48, 10, B.t); c(8, 222, 48, 2, B.d); c(8, 224, 12, 12, B.o); c(44, 224, 12, 12, B.o);
  },
};
/* 창문 (벽 장식 · 128 × 152) */
/* 묶은 커튼 한 쪽 (기본 창문과 같은 모양): 바깥선 ox에서 안쪽으로 폭 E(y).
   위는 넓게(wTop) → 안쪽 가장자리가 부드럽게 휘며 끈(tie)에서 wTie까지 모임 → 아래로 다시 wBot까지 퍼짐.
   o.rings: 봉에 끼운 고리 · 윗단 물결, o.lace: 반투명 레이스 */
function hcurtain(p, ox, mir, y0, y1, tie, wTop, wTie, wBot, A, o) { const { c } = p; o = o || {};
  const E = y => y <= tie ? wTie + (wTop - wTie) * Math.cos(Math.PI / 2 * (y - y0) / (tie - y0)) : wTie + (wBot - wTie) * Math.sqrt((y - tie) / (y1 - tie)), X = i => mir ? ox - i : ox + i, W0 = Math.round(E(y0));
  for (let y = y0; y < y1; y++) { const w = Math.round(E(y)); for (let i = 0; i < w; i++) { const wave = o.rings ? Math.round(Math.abs(Math.sin(i / Math.max(1, W0 - 1) * Math.PI * 5)) * 2) : 0; if (y < y0 + 3 + wave) continue;
      const k = Math.floor(i / w * 13 + (y < y0 + 8 ? (i % 2) : 0)) % 4, edge = i === w - 1 || y === y1 - 1 || y < y0 + 4 + wave;
      if (o.lace) { c(X(i), y, 1, 1, edge ? 'rgba(255,255,255,.75)' : k === 2 ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.4)'); if ((i * 3 + y) % 7 === 0 && y % 3 === 0 && !edge) c(X(i), y, 1, 1, A.t); }
      else c(X(i), y, 1, 1, edge ? (y === y1 - 1 ? A.d : A.o) : y < y0 + 8 ? (i % 3 ? A.t : A.f) : k === 0 ? A.f : k === 1 ? A.t : k === 2 ? A.l : A.t); } }
  if (o.rings) for (let k = 0; k < 6; k++) { const x = X(2 + Math.round(k * (W0 - 5) / 5)); c(x - 2, y0 - 5, 5, 1, GOLDD); c(x - 2, y0 - 4, 1, 6, GOLDD); c(x + 2, y0 - 4, 1, 6, GOLDD); c(x - 1, y0 - 5, 3, 1, GOLD2); c(x - 1, y0 + 2, 3, 1, GOLDD); c(x, y0 + 2, 1, 2, o.lace ? 'rgba(255,255,255,.8)' : A.o); }
  const tx = mir ? ox - 15 : ox; if (!o.noTie) { c(tx, tie - 2, 16, 5, GOLDD); c(tx + 1, tie - 1, 14, 3, GOLD); c(tx + 1, tie - 1, 14, 1, GOLD2); } }
function WINDOWHI(p, t, C) { const { c } = p, A = C.a, F = C.b;
  // 창틀
  c(14, 8, 100, 124, F.o); c(16, 10, 96, 120, F.t); c(16, 10, 96, 3, F.L); c(16, 126, 96, 2, F.d);
  todSky(p, t, 22, 16, 84, 108); c(22, 16, 84, 3, 'rgba(0,0,0,.25)');
  c(62, 16, 4, 108, F.t); c(62, 16, 1, 108, F.L); c(22, 68, 84, 4, F.t); c(22, 68, 84, 1, F.L);
  c(26, 20, 3, 18, 'rgba(255,255,255,.35)'); c(30, 20, 2, 10, 'rgba(255,255,255,.25)'); c(70, 76, 3, 16, 'rgba(255,255,255,.3)');
  // 창턱
  c(8, 130, 112, 10, F.o); c(9, 131, 110, 7, F.t); c(9, 131, 110, 2, F.L); c(10, 138, 108, 3, 'rgba(0,0,0,.25)');
  // 커튼 (공통 모양 · 봉 고리에 매달림)
  hcurtain(p, 0, false, 6, 148, 92, 42, 18, 33, A, { rings: true, noRingDraw: true }); hcurtain(p, 127, true, 6, 148, 92, 42, 18, 33, A, { rings: true });
  // 커튼 봉 (고리 위로)
  c(0, 2, 128, 6, '#3a2418'); c(1, 3, 126, 3, GOLD); c(1, 3, 126, 1, GOLD2); [[0, 2], [122, 2]].forEach(([x, y]) => { c(x, y - 2, 6, 10, GOLDD); c(x + 1, y - 1, 4, 8, GOLD); });
  [[0, false], [127, true]].forEach(([ox, mir]) => { for (let k = 0; k < 6; k++) { const x = mir ? ox - (2 + Math.round(k * 37 / 5)) : ox + 2 + Math.round(k * 37 / 5); c(x - 2, 1, 5, 1, GOLDD); c(x - 2, 2, 1, 6, GOLDD); c(x + 2, 2, 1, 6, GOLDD); c(x - 1, 1, 3, 1, GOLD2); } });
}

/* 끝이 뾰족한 잎 (가운데 잎맥) */
function hleaf(p, x1, y1, x2, y2, w, G) { const { c } = p, dx = x2 - x1, dy = y2 - y1, L = Math.max(1, Math.hypot(dx, dy)), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  for (let i = 0; i <= L; i += .5) { const half = (w / 2) * Math.sin(Math.PI * Math.min(1, i / L) * .95 + .05), cx = x1 + ux * i, cy = y1 + uy * i;
    for (let k = -half; k <= half; k += .5) { const px = Math.round(cx + nx * k), py = Math.round(cy + ny * k); c(px, py, 1, 1, Math.abs(k) > half - 1 ? G.o : k < 0 ? G.l : G.t); } }
  for (let i = 2; i < L - 2; i++) c(Math.round(x1 + ux * i), Math.round(y1 + uy * i), 1, 1, G.f); }
function hpot(p, x, y, w, h, R) { const { c, el } = p;
  for (let yy = 0; yy < h; yy++) { const ins = Math.round(yy / h * w * .14), ww = w - ins * 2; c(x + ins, y + yy, ww, 1, R.o); c(x + ins + 1, y + yy, ww - 2, 1, yy < 4 ? R.l : R.t); c(x + ins + 2, y + yy, 3, 1, R.L); c(x + ins + ww - 6, y + yy, 4, 1, R.f); }
  c(x - 2, y - 2, w + 4, 6, R.o); c(x - 1, y - 1, w + 2, 4, R.l); c(x, y - 1, w, 1, R.L); el(x + w / 2, y + 1, w / 2 - 2, 2, '#4a2e1a'); }
const PLANTHI = (p, t, C) => { const G = C.a, s = (t >> 2) % 2;
  [[-26, -24 - s], [24, -28], [-18, -46], [18, -50 + s], [0, -58], [-28, -2], [28, -6], [-8, -36], [10, -30], [-14, -14], [16, -16]].forEach(([dx, dy], i) => hleaf(p, 32, 64, 32 + dx, 64 + dy, i < 5 ? 11 : 9, G));
  hpot(p, 16, 66, 32, 30, C.b); };
const LAMPHI = (p, t, C) => { const { c, el } = p, A = C.a, M = C.c;
  for (let r = 5; r >= 1; r--) el(32, 60, 12 + r * 6, 6 + r * 4, `rgba(255,220,140,${.025})`);
  el(32, 154, 18, 5, M.o); el(32, 153, 16, 4, M.t); el(30, 152, 8, 2, M.L); c(29, 44, 6, 108, M.o); c(30, 44, 4, 108, M.t); c(30, 44, 1, 108, M.L); c(27, 96, 10, 4, M.o); c(28, 97, 8, 2, M.L);
  for (let i = 0; i < 40; i++) { const w = 28 + Math.round(i * .7), x = 32 - Math.ceil(w / 2); c(x - 1, 4 + i, w + 2, 1, A.o); for (let k = 0; k < w; k++) { const f = (k + Math.round(i * .15)) % 6; c(x + k, 4 + i, 1, 1, i < 3 ? A.L : f === 0 ? A.f : f < 3 ? A.t : A.l); } }
  c(18, 2, 28, 3, A.o); c(19, 3, 26, 1, GOLD); c(10, 44, 44, 3, GOLD); c(10, 44, 44, 1, GOLD2); c(24, 47, 16, 4, '#ffe8a0'); c(26, 47, 12, 2, '#fff6d0'); };
const FIREHI = (p, t, C) => { const { c, el } = p, A = C.a, B = C.b;   // 192 × 184
  c(0, 20, 192, 164, A.o); c(2, 22, 188, 160, A.t);
  for (let y = 24, r = 0; y < 170; y += 14, r++) { c(2, y + 13, 188, 1, A.f); for (let x = 2 + (r % 2) * 14; x < 190; x += 28) { c(x, y, 1, 13, A.f); c(x + 1, y + 1, Math.min(26, 189 - x), 2, A.l); if (hsh(x, r) % 3 === 0 && x + 14 < 190) c(x + 6, y + 6, 8, 2, A.f); } }
  // 벽난로 선반
  c(-6, 14, 204, 16, B.o); c(-5, 15, 202, 12, B.t); c(-5, 15, 202, 3, B.L); c(-5, 25, 202, 2, B.d); hgrain(p, 0, 18, 192, 6, B, 7);
  // 선반 위 소품: 시계 · 촛대 · 액자
  p.orr(84, -14, 24, 28, B.f, B.o, 6); el(96, -2, 8, 8, '#e0b050'); el(96, -2, 6, 6, '#fff8ec'); c(96, -7, 1, 5, '#2a1a10'); c(96, -2, 4, 1, '#2a1a10');
  [[20, -12], [164, -12]].forEach(([x, y], i) => { c(x - 4, 10, 12, 4, GOLD); c(x, y, 4, 22, '#f4f0e8'); c(x, y, 1, 22, '#ffffff'); c(x + 1, y - 6 + ((t + i) % 2), 2, 6, (t + i) % 2 ? '#ffb347' : '#ffd27a'); });
  p.orr(42, -10, 26, 24, GOLD, GOLDD, 2); c(45, -7, 20, 18, '#3a4a7a'); c(45, 3, 20, 8, '#3e6a40');
  // 아치형 입구
  for (let y = 0; y < 120; y++) { const top = 60, rx = 56; let half = rx; if (y < 40) half = Math.round(rx * Math.sqrt(1 - Math.pow((40 - y) / 40, 2))); c(96 - half - 6, top + y, (half + 6) * 2, 1, A.o); c(96 - half - 4, top + y, (half + 4) * 2, 1, A.d); c(96 - half, top + y, half * 2, 1, '#120808'); }
  c(40, 176, 112, 6, A.d);
  // 불 (화격자 · 장작 · 불꽃)
  const f = t % 3; for (let k = 0; k < 4; k++) el(96, 150, 40 - k * 8, 22 - k * 4, `rgba(255,140,40,${.05 + k * .03})`);
  c(56, 166, 80, 4, '#3a3a44'); for (let x = 60; x < 134; x += 8) c(x, 156, 2, 12, '#3a3a44');
  [[62, 156, 32, 8], [96, 158, 34, 8]].forEach(([x, y, w, h]) => { p.orr(x, y, w, h, '#7a4a28', '#3a2010', 3); c(x + 3, y + 2, w - 6, 1, '#9a6238'); el(x + w - 3, y + h / 2, 3, 3, '#c89060'); });
  [[64, 126, 18, 34], [80, 110 + f, 22, 50], [100, 118 - f, 20, 42], [116, 130 + f, 14, 30]].forEach(([x, y, w, h], i) => {
    for (let yy = 0; yy < h; yy++) { const hw = Math.round(w / 2 * Math.sin(Math.PI * Math.min(1, (yy + 2) / h)) * (1 + (yy % 6 === (t + i) % 6 ? .15 : 0))); const cx = x + w / 2 + Math.round(Math.sin((yy + t * 3 + i * 7) / 5) * 2);
      c(cx - hw, y + yy, hw * 2, 1, '#e8501a'); if (hw > 3) c(cx - hw + 2, y + yy, hw * 2 - 4, 1, '#ff9a3a'); if (hw > 6 && yy > h * .3) c(cx - hw + 5, y + yy, hw * 2 - 10, 1, '#ffd27a'); if (hw > 9 && yy > h * .55) c(cx - 3, y + yy, 6, 1, '#fff2c0'); } });
  if (t % 4 === 0) { c(90 + (t % 20), 96 + (t % 9), 2, 2, '#ffd27a'); c(108 - (t % 14), 100, 1, 1, '#ffb347'); }
};
const PIANOHI = {
  front(p, t, C) { const { c } = p, B = C.b, M = C.c;   // 192 × 152
    c(0, 0, 192, 122, B.o); c(2, 2, 188, 118, B.t); c(2, 2, 188, 18, B.l); c(2, 2, 188, 3, B.L); c(2, 18, 188, 2, B.d);
    c(6, 24, 180, 40, B.f); c(8, 26, 176, 36, B.t); c(8, 26, 176, 2, B.f); for (let x = 30; x < 170; x += 46) { c(x, 30, 30, 28, B.f); c(x + 1, 31, 28, 26, B.t); c(x + 1, 31, 28, 1, B.l); }
    // 악보대 · 악보
    c(66, 24, 60, 4, B.d); p.orr(70, 28, 52, 30, '#f8f4ec', '#9a948a', 2); [34, 40, 46, 52].forEach(y => c(74, y, 44, 1, '#a09a90')); [[80, 36], [90, 42], [100, 33], [110, 45]].forEach(([x, y]) => { c(x, y, 4, 3, '#222'); c(x + 3, y - 7, 1, 8, '#222'); });
    // 건반
    c(2, 68, 188, 8, B.d); c(4, 76, 184, 22, '#f8f4ec'); c(4, 96, 184, 2, '#c8c0b8'); for (let x = 4; x < 188; x += 7) c(x, 76, 1, 22, '#b8b0b0');
    for (let x = 4, i = 0; x < 182; x += 7, i++) if (i % 7 !== 2 && i % 7 !== 6) { c(x + 4, 76, 5, 13, '#141014'); c(x + 5, 76, 2, 12, '#3a3438'); }
    c(2, 98, 188, 6, B.f); c(2, 98, 188, 1, B.L);
    // 다리 · 페달
    [8, 172].forEach(x => { c(x, 104, 12, 40, B.o); c(x + 2, 104, 8, 38, B.t); c(x + 3, 104, 2, 38, B.l); c(x - 2, 140, 16, 8, B.o); c(x, 141, 12, 5, B.t); });
    c(80, 130, 32, 10, B.f); [86, 94, 102].forEach(x => { c(x, 136, 5, 8, M.o); c(x + 1, 137, 3, 6, M.t); c(x + 1, 137, 1, 2, M.L); });
    // 촛대
    [[14, -18], [170, -18]].forEach(([x, y], i) => { c(x - 4, -2, 14, 4, M.t); c(x, y, 5, 18, '#f4f0e8'); c(x, y, 1, 18, '#ffffff'); c(x + 1, y - 6 + ((t + i) % 2), 3, 6, (t + i) % 2 ? '#ffb347' : '#ffd27a'); });
  },
  back(p, t, C) { const { c } = p, B = C.b;
    c(0, 0, 192, 140, B.o); c(2, 2, 188, 136, B.f); c(2, 2, 188, 3, B.l); for (let x = 20; x < 180; x += 38) { c(x, 10, 6, 124, B.d); c(x + 1, 10, 4, 124, B.t); }
    c(10, 40, 172, 4, B.d); c(10, 100, 172, 4, B.d); [8, 172].forEach(x => { c(x - 2, 138, 16, 10, B.o); c(x, 139, 12, 6, B.t); });
  },
  side(p, t, C) { const { c } = p, B = C.b;   // 앞이 왼쪽 · 64 × 236
    c(20, 0, 42, 220, B.o); c(22, 2, 38, 216, B.t); c(22, 2, 38, 3, B.L); c(22, 2, 6, 216, B.l); c(54, 2, 6, 216, B.f);
    c(2, 80, 22, 70, B.o); c(4, 82, 18, 66, B.t); c(4, 82, 18, 3, B.L); c(4, 84, 4, 62, '#f8f4ec'); for (let y = 86; y < 146; y += 7) c(4, y, 4, 1, '#b8b0b0');
    c(4, 150, 10, 60, B.o); c(6, 150, 6, 58, B.t); c(2, 206, 16, 10, B.o); c(4, 207, 12, 6, B.t); c(22, 216, 38, 6, B.d);
  },
};
/* 러그 (바닥에 까는 것, 가로 w × 세로 h) */
function hrug(p, w, h, A, Bc, kind) { const { c, el } = p;
  if (kind === 'stripe') { c(6, 4, w - 12, h - 8, A.d); c(8, 6, w - 16, h - 12, A.t); for (let x = 12; x < w - 12; x += 10) c(x, 7, 4, h - 14, A.f); c(8, 6, w - 16, 6, Bc.t); c(8, h - 12, w - 16, 6, Bc.t); c(8, 12, w - 16, 1, Bc.f); c(8, h - 13, w - 16, 1, Bc.f); }
  if (kind === 'persian') { c(4, 4, w - 8, h - 8, A.o); c(6, 6, w - 12, h - 12, A.t); c(12, 12, w - 24, h - 24, A.f); c(16, 16, w - 32, h - 32, '#c9a96a'); c(20, 20, w - 40, h - 40, Bc.t);
    const cx = w / 2, cy = h / 2; for (let i = 0; i < 22; i++) { c(cx - i * 2, cy - 22 + i, i * 4 + 1, 1, i % 4 < 2 ? '#c9a96a' : A.t); c(cx - i * 2, cy + 22 - i, i * 4 + 1, 1, i % 4 < 2 ? '#c9a96a' : A.t); } c(cx - 6, cy - 4, 12, 8, A.d); c(cx - 3, cy - 2, 6, 4, GOLD);
    for (let x = 10; x < w - 10; x += 8) { c(x, 8, 4, 3, GOLD); c(x, h - 11, 4, 3, GOLD); } [[24, 24], [w - 32, 24], [24, h - 32], [w - 32, h - 32]].forEach(([x, y]) => { c(x, y, 8, 8, A.t); c(x + 2, y + 2, 4, 4, GOLD); }); }
  for (let y = 6; y < h - 6; y += 3) { c(0, y, 5, 1, '#fff4dc'); c(w - 5, y, 5, 1, '#fff4dc'); c(1, y + 1, 3, 1, '#e8dcc0'); c(w - 4, y + 1, 3, 1, '#e8dcc0'); }
}
const ROUNDRUGHI = (p, t, C) => { const { el } = p, A = C.a, B = C.c; el(64, 64, 62, 60, A.o); el(64, 64, 60, 58, A.t); el(64, 64, 52, 50, B.t); el(64, 64, 48, 46, A.f); el(64, 64, 34, 32, B.t); el(64, 64, 30, 28, A.t); el(64, 64, 14, 13, B.l); el(64, 64, 8, 7, A.l);
  for (let k = 0; k < 40; k++) { const a = k / 40 * Math.PI * 2; p.c(64 + Math.round(Math.cos(a) * 41), 64 + Math.round(Math.sin(a) * 39), 3, 3, B.d); } };

/* ── 소품 가구 (고해상도) ── */
function hcup(p, x, y, M, tea) { const { c, el } = p;   // 받침 접시 + 찻잔, (x,y)=잔 윗면 가운데
  el(x, y + 9, 11, 3, '#9a948a'); el(x, y + 8, 10, 2, '#f8f4ec'); c(x - 7, y - 1, 14, 9, '#9a948a'); c(x - 6, y - 1, 12, 8, '#f8f4ec'); c(x - 6, y - 1, 2, 8, '#ffffff'); c(x - 6, y + 3, 12, 2, M.t);
  c(x + 7, y + 1, 3, 1, '#9a948a'); c(x + 9, y + 1, 1, 4, '#9a948a'); c(x + 7, y + 4, 3, 1, '#9a948a'); el(x, y - 1, 6, 2, '#9a948a'); el(x, y - 1, 5, 1, tea || '#a8603a'); }
function hsteam(p, x, y, t, k) { const st = ((t >> 1) + (k || 0)) % 4; for (let i = 0; i < 3; i++) p.c(x + Math.round(Math.sin((i + st) * 1.3) * 2), y - i * 3 - st, 1, 3, `rgba(255,255,255,${.42 - i * .1})`); }
function hpotTea(p, x, y, M, P) { const { c, el, ln } = p;   // 찻주전자, (x,y)=몸통 가운데
  for (let yy = -7; yy <= 7; yy++) for (let xx = -6; xx <= 6; xx++) { const o = (xx * xx) / 36 + (yy * yy) / 49, n = (xx * xx) / 12 + (yy * yy) / 20; if (o <= 1 && n > 1) c(x - 15 + xx, y - 1 + yy, 1, 1, o > .62 || xx < -3 ? '#9a948a' : '#f8f4ec'); }
  ln(x + 10, y + 2, x + 19, y - 8, '#9a948a', 4); ln(x + 11, y + 2, x + 19, y - 7, '#f8f4ec', 2);
  el(x, y, 14, 11, '#9a948a'); el(x, y, 13, 10, '#f8f4ec'); el(x - 4, y - 4, 5, 3, '#ffffff'); c(x - 13, y - 1, 26, 3, M.t); c(x - 13, y - 1, 26, 1, M.L);
  el(x, y - 10, 8, 3, '#9a948a'); el(x, y - 10, 7, 2, '#f8f4ec'); c(x - 2, y - 16, 4, 4, GOLDD); c(x - 1, y - 16, 2, 3, GOLD); }
const GCLOCKHI = (p, t, C) => { const { c, el, ln } = p, B = C.b, M = C.c;   // 64 × 184
  c(28, 0, 8, 7, M.o); c(29, 1, 6, 5, M.t); c(30, 1, 2, 2, M.L);
  p.orr(4, 6, 56, 54, B.t, B.o, 16); c(10, 9, 44, 3, B.L); c(7, 18, 3, 36, B.l); c(54, 18, 3, 36, B.f);
  el(32, 32, 20, 20, M.o); el(32, 32, 19, 19, M.t); el(31, 31, 17, 17, M.L); el(32, 32, 16, 16, '#fff8ec'); el(32, 32, 15, 15, '#f4ecd8');
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = 12, big = i % 3 === 0; c(32 + Math.round(Math.sin(a) * r) - (big ? 1 : 0), 32 - Math.round(Math.cos(a) * r) - (big ? 1 : 0), big ? 3 : 1, big ? 3 : 1, OL); }
  const m = (t % 60) / 60 * Math.PI * 2, h = ((t / 12) % 60) / 60 * Math.PI * 2 + 1.2;
  ln(32, 32, 32 + Math.round(Math.sin(h) * 7), 32 - Math.round(Math.cos(h) * 7), OL, 2); ln(32, 32, 32 + Math.round(Math.sin(m) * 11), 32 - Math.round(Math.cos(m) * 11), '#a8344a', 1); el(32, 32, 2, 2, M.o); c(32, 32, 1, 1, M.L);
  c(8, 58, 48, 6, B.o); c(9, 59, 46, 3, B.L); c(9, 62, 46, 1, B.d);
  c(12, 64, 40, 98, B.o); c(14, 64, 36, 97, B.t); c(14, 64, 4, 97, B.l); c(46, 64, 4, 97, B.f); hgrain(p, 18, 66, 28, 92, B, 11, true, 60);
  p.orr(18, 70, 28, 80, '#1e120a', B.o, 8); c(20, 74, 2, 70, 'rgba(255,255,255,.10)');
  const sw = Math.round(Math.sin(t / 2.2) * 6); ln(32, 74, 32 + sw, 128, M.t, 2); c(31, 72, 4, 3, M.o);
  el(32 + sw, 132, 8, 8, M.o); el(32 + sw, 132, 7, 7, M.t); el(30 + sw, 130, 3, 3, M.L);
  ln(26, 80, 26, 140, M.f, 1); ln(38, 84, 38, 142, M.f, 1); c(25, 140, 3, 4, M.t); c(37, 142, 3, 4, M.t);
  c(8, 160, 48, 14, B.o); c(10, 161, 44, 11, B.t); c(10, 161, 44, 2, B.L); c(10, 170, 44, 2, B.d);
  [8, 46].forEach(x => { c(x, 172, 10, 11, B.o); c(x + 2, 172, 6, 9, B.t); c(x + 2, 172, 2, 9, B.l); });
};
function hmac(p, x, y, col) { const { c } = p, R = ramp(col);   // 마카롱 9 × 7
  c(x + 1, y, 7, 1, R.d); c(x, y + 1, 9, 2, R.t); c(x + 1, y + 1, 3, 1, R.L); c(x + 7, y + 1, 1, 2, R.f);
  c(x, y + 3, 9, 1, '#fff8ec'); c(x, y + 4, 9, 2, R.t); c(x + 1, y + 4, 2, 1, R.l); c(x + 8, y + 4, 1, 2, R.f); c(x + 1, y + 6, 7, 1, R.d); }
function hplate(p, x, y, rx, ry) { p.el(x, y + 1, rx + 1, ry + 1, '#9a948a'); p.el(x, y, rx, ry, '#f8f4ec'); p.el(x, y, rx - 3, ry - 1, '#ece6da'); p.el(x - 2, y - 1, rx - 5, Math.max(1, ry - 2), '#f8f4ec'); }
const TEASETHI = (p, t, C) => { const { c, el } = p, A = C.a, B = C.b, M = C.c;   // 128 × 96
  // 받침 기둥 · 발 (천 아래로 살짝)
  c(58, 72, 12, 14, B.o); c(60, 72, 8, 14, B.t); c(61, 72, 2, 14, B.l); el(64, 88, 24, 6, B.o); el(64, 87, 22, 5, B.t); el(60, 86, 12, 2, B.l);
  // 윗면 원판
  el(64, 40, 58, 13, A.o); el(64, 40, 57, 12, A.l); el(64, 39, 54, 10, A.L); el(64, 41, 46, 8, A.l); el(64, 40, 44, 7, A.L);
  for (let k = 0; k < 44; k++) { const a = k / 44 * Math.PI * 2; c(64 + Math.round(Math.cos(a) * 50), 40 + Math.round(Math.sin(a) * 9.5), 2, 1, A.t); }
  // 늘어진 테이블보: 원판 앞쪽 가장자리에서 바로 이어져 내려옴, 밑단은 둥근 호
  const yb = x => 40 + Math.round(13 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 64) / 58.5, 2))));
  const hemY = x => 56 + Math.round(17 * Math.sqrt(Math.max(0, 1 - Math.pow((x - 64) / 61, 2))) + Math.sin((x - 64) / 2.6) * .9);
  for (let y = 40; y <= 74; y++) { const hw = 58 + Math.min(1, (y - 40) / 24) * 2;
    for (let x = Math.ceil(64 - hw); x <= Math.floor(64 + hw); x++) { const top = yb(x), hy = hemY(x); if (y < top || y > hy) continue;
      const ax = Math.abs(x - 64), fold = Math.sin((x - 64) / 2.6 + .4) * .8 + Math.sin((x - 64) / 9) * .3, cyl = ax / hw;
      let col = fold > .6 ? A.l : fold > .05 ? A.t : fold > -.55 ? A.f : A.d; if (y - top < 4 && col === A.d) col = A.f; if (cyl > .8) col = col === A.l ? A.t : col === A.t ? A.f : A.d;
      const side = ax > hw - 1;
      c(x, y, 1, 1, side ? A.o : y === hy ? A.d : y === top ? A.t : col); } }
  // 레이스 단 (밑단 호를 따라)
  for (let x = 6; x < 120; x += 6) { const hy = hemY(x + 3); el(x + 3, hy + 2, 3, 3, A.o); el(x + 3, hy + 1, 2, 3, '#fff8ec'); c(x + 3, hy + 1, 1, 1, A.f); c(x, hy - 1, 7, 1, '#fff8ec'); }
  for (let x = 8; x < 120; x += 3) c(x, hemY(x) - 4, 1, 1, A.L);
  // 마카롱 접시 (윗면 안쪽)
  hplate(p, 84, 44, 13, 4); hmac(p, 75, 37, '#f08ab0'); hmac(p, 85, 36, '#9ad0a0'); hmac(p, 79, 41, '#c9a0e0'); hmac(p, 88, 41, '#f1d48a');
  hpotTea(p, 57, 30, M, A.l); hsteam(p, 76, 16, t, 0);
  hcup(p, 32, 37, M); hsteam(p, 32, 31, t, 2); hcup(p, 104, 32, M); hsteam(p, 104, 26, t, 1);
  c(47, 47, 9, 2, GOLDD); c(47, 47, 3, 1, GOLD2);
};
const CTABLEHI = (p, t, C) => { const { c, el } = p, B = C.b, A = C.a;   // 128 × 80
  c(0, 14, 128, 20, B.o); c(2, 15, 124, 17, B.t); c(2, 15, 124, 2, B.L); c(2, 30, 124, 2, B.f); hgrain(p, 4, 18, 120, 10, B, 3);
  c(4, 34, 120, 10, B.o); c(5, 34, 118, 9, B.f); c(5, 34, 118, 1, B.d); for (let x = 12; x < 118; x += 16) el(x + 4, 42, 5, 2, B.d);
  [6, 116].forEach(x => { c(x, 42, 6, 34, B.o); c(x + 1, 42, 4, 32, B.t); c(x + 1, 42, 1, 32, B.l); c(x + (x < 64 ? -2 : 2), 72, 8, 4, B.o); c(x + (x < 64 ? -1 : 3), 72, 6, 2, B.t); });
  [24, 98].forEach(x => { c(x, 44, 4, 26, B.o); c(x + 1, 44, 2, 25, B.f); });
  c(42, 13, 44, 20, A.o); c(43, 14, 42, 18, A.t); c(43, 14, 42, 2, A.l); c(42, 33, 44, 12, A.o); c(43, 33, 42, 10, A.t); c(43, 33, 42, 1, A.d);
  for (let x = 44; x < 86; x += 6) { c(x, 43, 2, 4, GOLD); } c(46, 17, 36, 1, GOLD); c(46, 29, 36, 1, GOLD);
  hcup(p, 22, 6, { t: '#3a5a8a', L: '#6a8ac0' }); hsteam(p, 22, 0, t, 0);
  p.orr(92, 2, 26, 14, '#7e2236', '#3a1018', 2); c(93, 3, 24, 2, '#a8344a'); c(94, 12, 22, 2, '#f1ead8'); c(115, 4, 2, 9, '#5a1424'); c(102, 5, 6, 1, GOLD);
  el(66, 8, 7, 3, '#9a948a'); el(66, 7, 6, 2, '#f8f4ec'); [62, 67].forEach(x => { c(x - 2, 2, 5, 4, OL); c(x - 1, 3, 3, 2, '#d8a058'); });
};
const DRESSERHI = {
  front(p, t, C) { const { c, el } = p, B = C.b, M = C.c, G = C.a;   // 128 × 148
    [24, 96].forEach(x => { c(x, 36, 8, 50, B.o); c(x + 2, 36, 4, 50, B.t); c(x + 2, 36, 1, 50, B.l); });
    el(64, 40, 34, 40, M.o); el(64, 40, 32, 38, M.t); el(63, 39, 30, 36, M.L); el(64, 40, 29, 35, M.t); el(64, 40, 26, 32, M.o); el(64, 40, 25, 31, G.t); el(64, 46, 22, 24, G.l);
    for (let i = 0; i < 18; i++) { c(46 + i, 22 + i * 2, 3, 2, G.L); c(54 + i, 18 + i * 2, 1, 2, G.L); }
    c(58, 0, 12, 5, M.o); c(59, 1, 10, 3, M.t); c(62, 1, 4, 1, M.L); c(30, 38, 4, 4, M.t); c(94, 38, 4, 4, M.t);
    c(-2, 82, 132, 12, B.o); c(0, 83, 128, 9, B.t); c(0, 83, 128, 2, B.L); c(0, 91, 128, 1, B.d); hgrain(p, 2, 86, 124, 4, B, 5);
    c(2, 94, 124, 46, B.o); c(3, 94, 122, 45, B.f); c(3, 94, 122, 1, B.d);
    [6, 86].forEach(x => { hdrawer(p, x, 97, 36, 19, B, M); hdrawer(p, x, 118, 36, 19, B, M); });
    hdrawer(p, 46, 97, 36, 12, B, M); c(46, 112, 36, 27, B.d); c(47, 113, 34, 25, '#1e120a');
    [4, 114].forEach(x => { c(x, 138, 10, 10, B.o); c(x + 2, 138, 6, 8, B.t); c(x + 2, 138, 2, 8, B.l); });
    // 향수병 · 립스틱 · 보석함
    c(12, 70, 10, 13, '#5a6a80'); c(13, 71, 8, 11, G.l); c(14, 72, 2, 8, '#ffffff'); c(15, 66, 4, 4, GOLD); el(17, 64, 3, 2, '#f08ab0');
    c(25, 74, 4, 9, OL); c(26, 75, 2, 8, GOLD); c(26, 71, 2, 4, '#d8303a');
    p.orr(100, 70, 22, 13, '#a8344a', '#4a1424', 2); c(101, 71, 20, 3, '#d8607a'); c(109, 74, 4, 4, GOLD); c(110, 75, 2, 1, GOLD2);
  },
  back(p, t, C) { const { c, el } = p, B = C.b;
    [24, 96].forEach(x => { c(x, 36, 8, 50, B.o); c(x + 2, 36, 4, 50, B.f); });
    el(64, 40, 34, 40, B.o); el(64, 40, 32, 38, B.t); el(64, 40, 24, 30, B.f); el(64, 40, 22, 28, B.t); hgrain(p, 44, 16, 40, 48, B, 4, true, 70);
    c(-2, 82, 132, 12, B.o); c(0, 83, 128, 9, B.t); c(0, 83, 128, 2, B.L);
    c(2, 94, 124, 46, B.o); c(3, 94, 122, 45, B.f); for (let x = 3; x < 124; x += 20) { c(x, 94, 1, 45, B.d); c(x + 1, 94, 1, 45, B.t); }
    [4, 114].forEach(x => { c(x, 138, 10, 10, B.o); c(x + 2, 138, 6, 8, B.t); });
  },
  side(p, t, C) { const { c, el } = p, B = C.b, M = C.c, G = C.a;   // 앞이 왼쪽 · 64 × 212
    c(4, 96, 56, 54, B.o); c(6, 97, 52, 51, B.t); c(6, 97, 52, 2, B.L); c(6, 97, 4, 51, B.l); hgrain(p, 10, 100, 46, 46, B, 9, true, 60);
    // 거울 (비스듬히 돌아간 타원) + 받침 기둥
    [44, 128].forEach(y => { c(44, y - 40, 6, 44, B.o); c(45, y - 40, 4, 44, B.t); });
    el(44, 64, 14, 52, M.o); el(44, 64, 13, 51, M.t); el(43, 63, 12, 49, M.L); el(44, 64, 11, 48, M.t); el(43, 64, 9, 45, M.o); el(43, 64, 8, 44, G.t); el(42, 70, 6, 32, G.l);
    for (let i = 0; i < 30; i++) c(38 + Math.round(i / 6), 30 + i * 2, 2, 2, G.L); c(42, 8, 4, 6, M.t);
    c(12, 112, 8, 12, '#5a6a80'); c(13, 113, 6, 10, G.l); c(14, 114, 2, 6, '#ffffff'); c(14, 109, 4, 3, GOLD);
    p.orr(10, 128, 18, 16, '#a8344a', '#4a1424', 2); c(11, 129, 16, 3, '#d8607a'); c(17, 134, 4, 4, GOLD);
    c(2, 144, 60, 10, B.o); c(3, 145, 58, 7, B.t); c(3, 145, 58, 2, B.L);
    c(4, 154, 56, 46, B.o); c(5, 154, 54, 45, B.f); c(9, 158, 46, 36, B.d); c(10, 159, 44, 34, B.f); c(10, 159, 44, 1, B.t);
    [162, 184].forEach(y => { c(1, y, 4, 5, M.o); c(2, y + 1, 2, 3, M.t); });
    [4, 50].forEach(x => { c(x, 198, 10, 12, B.o); c(x + 2, 198, 6, 10, B.t); c(x + 2, 198, 2, 10, B.l); });
  },
};
function hchestLid(p, x, y, w, h, B) { const { c } = p;   // 둥글게 솟은 뚜껑 (위로 갈수록 좁아지는 아치)
  for (let yy = 0; yy < h; yy++) { const k = Math.max(0, 1 - yy / Math.min(10, h)), ins = Math.round(6 * k * k * 1.6 + (yy === 0 ? 2 : 0)); c(x + ins, y + yy, w - ins * 2, 1, B.o);
    c(x + ins + 1, y + yy + (yy === 0 ? 1 : 0), w - ins * 2 - 2, 1, yy < 4 ? B.L : yy < 9 ? B.l : yy < h - 6 ? B.t : B.f); }
  c(x + 1, y + h - 1, w - 2, 1, B.d); }
function hmetal(p, x, y, w, h, M) { const { c } = p; c(x, y, w, h, M.o); c(x + 1, y + 1, w - 2, h - 2, M.t); c(x + 1, y + 1, 2, h - 2, M.L); c(x + w - 3, y + 1, 2, h - 2, M.f); for (let yy = y + 6; yy < y + h - 4; yy += 13) c(x + Math.floor(w / 2) - 1, yy, 2, 2, M.L); }
const CHESTHI = {
  front(p, t, C) { const { c, el } = p, B = C.b, M = C.c;   // 128 × 88
    hchestLid(p, 2, 4, 124, 34, B); c(0, 34, 128, 6, B.o); c(2, 35, 124, 4, B.d);
    c(2, 40, 124, 44, B.o); c(4, 40, 120, 42, B.t); c(4, 40, 120, 2, B.f); [54, 68].forEach(y => { c(4, y, 120, 1, B.f); c(4, y + 1, 120, 1, B.l); }); [[14, 46], [60, 60], [96, 47], [36, 74], [84, 75]].forEach(([x, y]) => c(x, y, 10, 1, B.f));
    c(2, 82, 124, 6, B.o); c(4, 82, 120, 4, B.d);
    hmetal(p, 18, 4, 10, 84, M); hmetal(p, 100, 4, 10, 84, M);
    [[2, 72], [112, 72]].forEach(([x, y]) => { c(x, y, 14, 16, M.o); c(x + 1, y + 1, 12, 14, M.t); c(x + 1, y + 1, 12, 2, M.L); c(x + 5, y + 6, 2, 2, M.L); });
    p.orr(52, 28, 24, 26, M.t, M.o, 4); c(54, 30, 20, 2, M.L); c(54, 30, 2, 22, M.L); el(64, 38, 3, 3, OL); c(63, 40, 3, 7, OL);
    if (t % 8 < 2) { c(40, 30, 2, 2, '#fff6d0'); } el(42, 37, 4, 2, GOLDD); el(42, 36, 3, 1, GOLD2); el(86, 37, 4, 2, GOLDD); el(86, 36, 3, 1, GOLD);
  },
  back(p, t, C) { const { c } = p, B = C.b, M = C.c;
    hchestLid(p, 2, 4, 124, 34, B); c(0, 34, 128, 6, B.o); c(2, 35, 124, 4, B.d);
    c(2, 40, 124, 44, B.o); c(4, 40, 120, 42, B.f); [54, 68].forEach(y => c(4, y, 120, 1, B.d)); c(2, 82, 124, 6, B.o);
    hmetal(p, 18, 4, 10, 84, M); hmetal(p, 100, 4, 10, 84, M); [44, 76].forEach(x => { c(x, 32, 10, 8, M.o); c(x + 1, 33, 8, 6, M.t); });
  },
  side(p, t, C) { const { c, el } = p, B = C.b, M = C.c;   // 앞이 왼쪽 · 64 × 152
    // 뚜껑 윗면: 좌우(앞뒤)로 둥글어서 가운데가 밝음
    c(4, 8, 56, 94, B.o); [[5, B.f], [9, B.t], [18, B.l], [26, B.L], [30, B.l], [38, B.t], [54, B.f]].forEach(([x, col], k, a) => c(x, 9, (a[k + 1] ? a[k + 1][0] : 59) - x, 92, col));
    [[16, 9], [36, 9], [48, 9]].forEach(([x]) => c(x, 9, 1, 92, B.f)); [22, 80].forEach(y => { c(4, y, 56, 10, M.o); c(5, y + 1, 54, 8, M.t); c(5, y + 1, 54, 2, M.L); c(30, y + 4, 2, 2, M.L); });
    // 옆 마구리: 아치형 뚜껑 단면 + 몸통
    for (let yy = 0; yy < 20; yy++) { const hw = Math.round(28 * Math.sqrt(Math.min(1, (yy + 4) / 20))); c(32 - hw, 98 + yy, hw * 2, 1, B.o); if (hw > 2) c(32 - hw + 1, 98 + yy, hw * 2 - 2, 1, yy < 4 ? B.l : B.t); }
    c(6, 104, 52, 1, B.L); c(2, 116, 60, 5, B.o); c(3, 117, 58, 3, B.d);
    c(4, 120, 56, 26, B.o); c(5, 120, 54, 25, B.t); c(5, 120, 54, 1, B.l); c(5, 132, 54, 1, B.f); c(4, 144, 56, 6, B.o); c(5, 144, 54, 4, B.d);
    c(22, 124, 20, 3, M.o); c(23, 124, 18, 2, M.t); c(22, 124, 3, 10, M.o); c(39, 124, 3, 10, M.o); c(22, 132, 20, 3, M.o); c(23, 132, 18, 1, M.L);
    c(1, 102, 5, 14, M.o); c(2, 103, 3, 12, M.t); [4, 52].forEach(x => { c(x, 136, 8, 14, M.o); c(x + 1, 137, 6, 12, M.t); });
  },
};
const NSTANDHI = (p, t, C) => { const { c, el } = p, B = C.b, A = C.a, M = ramp('#e0b050');   // 64 × 88
  for (let k = 0; k < 4; k++) el(32, 16, 18 + k * 5, 12 + k * 3, 'rgba(255,220,140,.04)');
  el(32, 38, 10, 3, M.o); el(32, 37, 9, 2, M.t); c(30, 20, 4, 17, M.o); c(31, 20, 2, 17, M.t); c(31, 20, 1, 17, M.L);
  for (let i = 0; i < 20; i++) { const w = 22 + Math.round(i * .7), x = 32 - Math.ceil(w / 2); c(x - 1, 2 + i, w + 2, 1, A.o); for (let k = 0; k < w; k++) { const f = (k + 1) % 5; c(x + k, 2 + i, 1, 1, i < 2 ? A.L : f === 0 ? A.f : f < 3 ? A.t : A.l); } }
  c(17, 22, 30, 2, GOLD); c(26, 24, 12, 3, '#ffe8a0');
  c(2, 40, 60, 8, B.o); c(3, 41, 58, 5, B.t); c(3, 41, 58, 1, B.L); c(3, 46, 58, 1, B.d);
  c(4, 48, 56, 32, B.o); c(5, 48, 54, 31, B.f); hdrawer(p, 8, 50, 48, 13, B, M);
  c(8, 65, 48, 13, '#1e120a'); c(12, 67, 5, 11, '#3a5a8a'); c(17, 68, 5, 10, '#a8344a'); c(22, 66, 4, 12, '#4f8a55'); c(13, 68, 1, 9, '#6a8ac0');
  [5, 52].forEach(x => { c(x, 80, 7, 8, B.o); c(x + 1, 80, 5, 6, B.t); c(x + 1, 80, 1, 6, B.l); });
};
const TRUNKHI = (p, t, C) => { const { c } = p, A = C.a, M = C.c;   // 64 × 68
  c(24, 2, 16, 3, OL); c(24, 2, 3, 12, OL); c(37, 2, 3, 12, OL); c(27, 3, 10, 1, '#6a4a30');
  p.orr(2, 12, 60, 54, A.t, A.o, 6); c(6, 14, 52, 3, A.L); c(4, 18, 3, 44, A.l); c(57, 18, 3, 44, A.f); c(4, 38, 56, 2, A.d); c(4, 40, 56, 1, A.l);
  [14, 44].forEach(x => { c(x, 12, 7, 54, '#3a2414'); c(x + 1, 12, 1, 54, '#5a3a24'); c(x - 1, 30, 9, 7, M.o); c(x, 31, 7, 5, M.t); c(x + 2, 32, 3, 3, '#3a2414'); });
  [[2, 12], [52, 12], [2, 56], [52, 56]].forEach(([x, y]) => { c(x, y, 10, 10, M.o); c(x + 1, y + 1, 8, 8, M.t); c(x + 1, y + 1, 8, 1, M.L); });
  c(24, 44, 16, 12, '#9a948a'); c(25, 45, 14, 10, '#f1e6cc'); c(25, 47, 14, 2, '#a8344a'); c(27, 51, 10, 1, '#8a7a6a'); c(27, 53, 7, 1, '#8a7a6a');
};
const TEACARTHI = (p, t, C) => { const { c, el } = p, M = C.c, A = C.a;   // 128 × 108
  c(118, 4, 4, 30, M.o); c(119, 4, 2, 30, M.t); c(110, 2, 14, 4, M.o); c(111, 3, 12, 2, M.L);
  [6, 118].forEach(x => { c(x, 28, 4, 68, M.o); c(x + 1, 28, 2, 68, M.t); c(x + 1, 28, 1, 68, M.L); });
  [[36, 28], [78, 70]].forEach(([y, gy]) => { c(4, gy, 120, 2, M.t); for (let x = 8; x < 122; x += 8) c(x, gy + 2, 1, y - gy - 2 + 0 || 6, M.f);
    c(2, y, 124, 6, M.o); c(4, y, 120, 4, M.t); c(4, y, 120, 1, M.L); c(4, y + 4, 120, 1, M.d); });
  [[14, 100], [114, 100]].forEach(([x, y]) => { el(x, y, 7, 7, OL); el(x, y, 5, 5, '#4a4a54'); el(x, y, 2, 2, M.t); c(x - 1, y - 6, 2, 3, M.o); });
  hpotTea(p, 30, 22, M, A.l); hsteam(p, 49, 8, t, 0);
  hcup(p, 62, 26, M); hcup(p, 80, 26, M); hsteam(p, 62, 20, t, 2);
  c(102, 10, 2, 26, GOLDD); el(103, 34, 12, 3, '#9a948a'); el(103, 33, 11, 2, '#f8f4ec'); el(103, 20, 9, 2, '#9a948a'); el(103, 19, 8, 2, '#f8f4ec');
  [[93, '#f08ab0'], [103, '#9ad0a0']].forEach(([x, col]) => hmac(p, x, 26, col)); [[95, '#f1d48a'], [102, '#c9a0e0']].forEach(([x, col]) => hmac(p, x, 12, col));
  el(34, 76, 18, 4, '#9a948a'); el(34, 75, 17, 3, '#f8f4ec'); [[24, 70], [34, 69], [44, 70], [29, 66], [39, 66]].forEach(([x, y], i) => { const R = ramp(['#d8a058', '#c89048', '#e0b068', '#d09850', '#e8c070'][i]); el(x, y + 1, 5, 3, R.d); el(x, y, 5, 3, R.t); el(x - 1, y - 1, 3, 1, R.L); c(x + 1, y, 1, 1, '#5a3420'); c(x - 2, y + 1, 1, 1, '#5a3420'); });
  [0, 3, 6].forEach(d => { el(90, 76 - d, 14, 3, '#9a948a'); el(90, 75 - d, 13, 2, A.t); });
};

/* ── 직접 넣은 그림 (도트로 바꿔 저장한 작은 PNG) ── */
let HI_IMG = null, HI_PH = 0, HI_MS = 140; const PIXC = {};
function picPixels(url) { if (!url) return null; const e = PIXC[url]; if (e) return e.px ? e : null; PIXC[url] = { loading: true };
  const im = new Image(); im.onload = () => { const cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height; const g = cv.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, im.width, im.height).data, px = [];
    for (let i = 0; i < d.length; i += 4) px.push(`rgb(${d[i]},${d[i + 1]},${d[i + 2]})`); PIXC[url] = { w: im.width, h: im.height, px }; }; im.src = url; return null; }
function hpic(p, x, y, w, h) { const P = picPixels(HI_IMG); if (!HI_IMG) return false; if (!P) { p.c(x, y, w, h, '#2a2230'); return true; }
  // 움직이는 그림: 세로로 이어 붙인 프레임 중 지금 장면만
  const fh = HI_PH && P.h > HI_PH && P.h % HI_PH === 0 ? HI_PH : P.h, nf = P.h / fh, o = nf > 1 ? Math.floor(Date.now() / (HI_MS || 140)) % nf * fh : 0;
  const sx = w / P.w, sy = h / fh; for (let j = 0; j < fh; j++) for (let i = 0; i < P.w; i++) { const x1 = Math.round(i * sx), y1 = Math.round(j * sy); p.c(x + x1, y + y1, Math.round((i + 1) * sx) - x1, Math.round((j + 1) * sy) - y1, P.px[(o + j) * P.w + i]); }
  p.c(x, y, w, 1, 'rgba(0,0,0,.25)'); p.c(x, y, 1, h, 'rgba(0,0,0,.2)'); p.c(x + 2, y + 2, Math.round(w * .3), 1, 'rgba(255,255,255,.18)'); return true; }
/* ── 식물 · 벽 장식 (고해상도) ── */
function hflame(p, x, y, t, k) { const { c, el } = p, f = ((t + (k || 0)) % 3);   // (x,y)=심지 위치
  for (let r = 4; r >= 1; r--) el(x, y - 4, 6 + r * 4, 6 + r * 4, 'rgba(255,210,120,.035)');
  el(x, y - 4 - f, 3, 6 + f, '#ff8a2a'); el(x, y - 3 - f, 2, 5 + f, '#ffc04a'); el(x, y - 2, 1, 3, '#fff2c0'); c(x, y, 1, 2, '#3a2a20'); }
function hfrond(p, x0, y0, ang, len, droop, G, lw) { const { c, ln } = p, dx = Math.cos(ang), dy = Math.sin(ang); lw = lw || 12;
  const pt = i => { const s = i / len; return [x0 + dx * i, y0 + dy * i + droop * s * s * len]; };
  const L = [];
  for (let i = 3; i <= len; i += 2) { const s = i / len, [x, y] = pt(i), [x2, y2] = pt(Math.min(len, i + 1)), tl = Math.hypot(x2 - x, y2 - y) || 1, tx = (x2 - x) / tl, ty = (y2 - y) / tl, ll = lw * Math.sin(Math.PI * Math.min(.97, s * .9 + .08)) + 2;
    [[-ty, tx], [ty, -tx]].forEach(([nx, ny], k) => { const ex = x + (nx * .75 + tx * .35) * ll, ey = y + (ny * .75 + ty * .35 + .55) * ll; L.push([x, y, ex, ey, k, i]); }); }
  L.forEach(([x, y, ex, ey]) => ln(Math.round(x), Math.round(y), Math.round(ex), Math.round(ey), G.o, 3));
  L.forEach(([x, y, ex, ey, k, i]) => { ln(Math.round(x), Math.round(y), Math.round(ex), Math.round(ey), k ? G.t : (i % 4 ? G.l : G.t), 2); c(Math.round((x + ex) / 2), Math.round((y + ey) / 2) - 1, 1, 1, k ? G.l : G.L); });
  for (let i = 0; i <= len; i++) { const [x, y] = pt(i); c(Math.round(x), Math.round(y), 2, 2, G.d); } }
function hmon(p, x1, y1, x2, y2, w, G) { const { c, ln } = p; hleaf(p, x1, y1, x2, y2, w, G);
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  for (let k = 1; k <= 4; k++) { const s = .2 + k * .16, half = (w / 2) * Math.sin(Math.PI * s * .95 + .05), cx = x1 + ux * L * s, cy = y1 + uy * L * s;
    [1, -1].forEach(sg => ln(Math.round(cx + nx * sg * (half + 1) + ux * 2), Math.round(cy + ny * sg * (half + 1) + uy * 2), Math.round(cx + nx * sg * half * .35), Math.round(cy + ny * sg * half * .35), G.o, 1)); }
  [[.38, .5], [.6, -.45]].forEach(([s, o]) => { const half = (w / 2) * Math.sin(Math.PI * s), x = x1 + ux * L * s + nx * half * o, y = y1 + uy * L * s + ny * half * o; c(Math.round(x), Math.round(y), 2, 2, G.o); }); }
function hrose(p, x, y, R) { const { c, el } = p; el(x, y, 5, 4, R.o); el(x, y, 4, 3, R.t); el(x - 1, y - 1, 2, 1, R.l); c(x - 1, y, 3, 1, R.d); c(x + 1, y - 1, 1, 2, R.d); c(x - 2, y + 1, 1, 1, R.d); c(x, y - 2, 2, 1, R.L); }
const BIGPLANTHI = (p, t, C) => { const { c } = p, G = C.a, s = (t >> 2) % 2;   // 64 × 160
  for (let y = 50; y < 132; y++) { const w = 8 + Math.round((y - 50) / 82 * 4), x = 32 - Math.floor(w / 2) + Math.round(Math.sin(y / 14) * 1.5); c(x - 1, y, w + 2, 1, '#4a2e1a'); c(x, y, w, 1, (y % 7) < 2 ? '#6a4428' : '#93592f'); c(x, y, 2, 1, '#b07a48'); }
  [[-1.6, 26, .25], [-2.05, 34, .5], [-1.1, 34, .5], [-2.6, 38, .55], [-.55, 38, .55], [-3.05, 34, .4], [-.1, 34, .4]].forEach(([a, L, d], i) => hfrond(p, 32, 50, a + (i > 4 ? s * .04 : 0), L, d, G, 8));
  p.el(32, 50, 6, 4, G.d); p.el(31, 49, 3, 2, G.t);
  hpot(p, 14, 132, 36, 26, C.b); };
const MONSTERAHI = (p, t, C) => { const { ln } = p, G = C.a;   // 64 × 124
  const Lv = [[20, 40, 2, 16, 24], [44, 34, 62, 12, 24], [30, 26, 26, 0, 22], [16, 66, 0, 54, 18], [48, 62, 63, 46, 18], [36, 50, 46, 26, 20]];
  Lv.forEach(([x, y]) => ln(32, 94, x, y, G.d, 2));
  Lv.forEach(([x1, y1, x2, y2, w]) => hmon(p, x1, y1, x2, y2, w, G));
  const B = C.b; p.c(16, 92, 32, 30, B.o); p.c(17, 92, 30, 29, B.t); p.c(17, 92, 4, 29, B.l); p.c(42, 92, 5, 29, B.f); p.c(14, 90, 36, 5, B.o); p.c(15, 91, 34, 3, B.L); p.el(32, 92, 15, 1, '#3a2414'); p.c(18, 118, 28, 3, B.d); };
const CACTUSHI = (p, t, C) => { const { c, el } = p, G = C.a;   // 64 × 88
  const col = (x, y, w, h) => { p.orr(x, y, w, h, G.t, G.o, Math.floor(w / 2)); c(x + 2, y + 4, 2, h - 8, G.l); c(x + w - 3, y + 4, 1, h - 8, G.f); for (let xx = x + 4; xx < x + w - 3; xx += 4) c(xx, y + 4, 1, h - 6, G.f); for (let yy = y + 5; yy < y + h - 3; yy += 6) for (let xx = x + 3; xx < x + w - 2; xx += 4) c(xx + ((yy / 6) % 2 ? 2 : 0), yy, 1, 1, '#f8f4e0'); };
  col(10, 26, 10, 24); col(44, 18, 10, 26); c(18, 42, 8, 8, G.o); c(18, 43, 7, 6, G.t); c(40, 36, 6, 8, G.o); c(39, 37, 6, 6, G.t);
  col(23, 8, 18, 56);
  [[32, 6, '#f08ab0'], [15, 25, '#ffd060']].forEach(([x, y, f]) => { const R = ramp(f); [[-3, 0], [3, 0], [0, -3], [-2, -2], [2, -2]].forEach(([dx, dy]) => el(x + dx, y + dy, 2, 2, R.t)); el(x, y - 1, 2, 2, '#ffe27a'); });
  hpot(p, 14, 62, 36, 24, C.b); };
const FERNHI = (p, t, C) => { const { c } = p, G = C.a, B = C.b;   // 64 × 80
  [[-3.05, 30, 1.3], [-.1, 30, 1.3], [-2.7, 28, 1.0], [-.45, 28, 1.0], [-2.3, 26, .8], [-.85, 26, .8], [-2.05, 30, .75], [-1.1, 30, .75], [-1.8, 30, .55], [-1.35, 30, .55], [-1.6, 28, .35]].forEach(([a, L, d]) => hfrond(p, 32, 44, a, L, d, G, 8));
  c(10, 44, 44, 34, B.o); for (let y = 45; y < 77; y++) for (let x = 11 + Math.round((y - 45) / 8); x < 53 - Math.round((y - 45) / 8); x++) c(x, y, 1, 1, ((x >> 2) + (y >> 2)) % 2 ? B.t : B.l);
  for (let y = 48; y < 77; y += 4) c(12, y, 40, 1, B.f); c(8, 42, 48, 5, B.o); c(9, 43, 46, 3, B.L); c(9, 45, 46, 1, B.f); };
const FLOWERSHI = (p, t, C) => { const { c, el, ln } = p, F = C.a, V = C.b, L = C.c;   // 64 × 104
  [[20, 22], [32, 12], [44, 22], [26, 34], [40, 36], [14, 40], [50, 40]].forEach(([x, y]) => ln(32, 70, x, y, L.f, 1));
  [[12, 50, -1], [52, 48, 1], [22, 56, -1], [42, 56, 1]].forEach(([x, y, d]) => { el(x, y, 6, 3, L.o); el(x, y, 5, 2, L.t); c(x - 3 * d, y - 1, 3, 1, L.l); });
  const bloom = (x, y, R, r) => { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; el(x + Math.round(Math.cos(a) * r), y + Math.round(Math.sin(a) * r * .8), r, r, R.o); }
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2; el(x + Math.round(Math.cos(a) * r), y + Math.round(Math.sin(a) * r * .8), r - 1, r - 1, k < 3 ? R.t : R.l); } el(x, y, Math.max(2, r - 1), Math.max(2, r - 1), '#ffd060'); c(x - 1, y - 1, 1, 1, '#fff2a0'); };
  bloom(20, 22, F, 5); bloom(44, 22, F, 5); bloom(32, 12, F, 6); bloom(26, 34, ramp('#f8f4ec'), 4); bloom(40, 36, F, 4); bloom(14, 40, ramp('#f8f4ec'), 3); bloom(50, 40, ramp('#f8f4ec'), 3);
  for (let y = 0; y < 38; y++) { const w = Math.round(14 + 8 * Math.sin(Math.PI * (y + 6) / 44)), x = 32 - w; c(x - 1, 64 + y, w * 2 + 2, 1, V.o); c(x, 64 + y, w * 2, 1, y < 8 ? V.l : V.t); c(x + 2, 64 + y, 2, 1, V.L); c(32 + w - 4, 64 + y, 3, 1, V.f); if (y > 12) c(x + 6, 64 + y, w * 2 - 12, 1, y === 13 ? V.L : V.f); }
  for (let y = 80; y < 98; y++) { c(29 + ((y >> 3) % 2), y, 1, 1, 'rgba(40,80,40,.35)'); c(34 - ((y >> 3) % 2), y, 1, 1, 'rgba(40,80,40,.35)'); }
  c(22, 62, 20, 4, V.o); c(23, 62, 18, 3, V.L); };
const ROSEBUSHHI = (p, t, C) => { const { el } = p, R = ramp(C.a.t), L = C.c;   // 64 × 100
  [[32, 40, 24, 30], [16, 52, 12, 14], [48, 50, 12, 14], [32, 18, 14, 12]].forEach(([x, y, rx, ry]) => { el(x, y, rx, ry, L.o); el(x, y, rx - 1, ry - 1, L.t); });
  for (let k = 0; k < 70; k++) { const a = k * 2.399, r = Math.sqrt(k / 70) * 24, x = 32 + Math.round(Math.cos(a) * r), y = 40 + Math.round(Math.sin(a) * r * 1.15); el(x, y, 3, 2, k % 3 ? L.l : L.f); p.c(x - 1, y - 1, 1, 1, L.L); }
  [[32, 14], [20, 26], [44, 24], [14, 44], [50, 42], [28, 38], [40, 50], [22, 58], [46, 62], [32, 66], [36, 28]].forEach(([x, y]) => hrose(p, x, y, R));
  hpot(p, 14, 72, 36, 26, C.b); };
const HANGPLANTHI = (p, t, C) => { const { c, ln, el } = p, G = C.a, B = C.b, s = (t >> 2) % 2;   // 벽 · 64 × 132
  c(28, 0, 8, 4, '#3a3a44'); el(32, 6, 3, 3, '#3a3a44'); el(32, 6, 1, 1, '#8a8a92');
  [[14, 58], [32, 60], [50, 58]].forEach(([x, y]) => ln(32, 8, x, y, '#c8a878', 1));
  [[14, 66], [22, 70], [42, 70], [50, 66], [32, 72]].forEach(([x, y], i) => { const len = 26 + i * 8 - (i === 4 ? 20 : 0); let px = x, py = y;
    for (let j = 0; j < len; j++) { const xx = x + Math.round(Math.sin((j + i * 5) / 8 + s * .3) * 4); c(xx, y + j, 2, 1, G.d); }
    for (let j = 2; j < len; j += 5) { const xx = x + Math.round(Math.sin((j + i * 5) / 8 + s * .3) * 4), d = (j / 5 | 0) % 2 ? 1 : -1, lx = xx + d * 4, ly = y + j; el(lx, ly, 4, 3, G.o); el(lx, ly, 3, 2, (j / 5 | 0) % 3 ? G.t : G.l); c(lx - d, ly - 1, 1, 1, G.L); c(lx, ly + 2, 1, 1, G.o); } });
  [[-2.8, 16, .7], [-.35, 16, .7], [-1.57, 12, .2], [-2.2, 14, .4], [-.95, 14, .4]].forEach(([a, L, d]) => hfrond(p, 32, 58, a, L, d, G, 6));
  hpot(p, 12, 58, 40, 22, B); };
function hframe(p, x, y, w, h, M, bev) { const { c } = p; bev = bev || 6; c(x, y, w, h, M.o); c(x + 1, y + 1, w - 2, h - 2, M.t); c(x + 1, y + 1, w - 2, 2, M.L); c(x + 1, y + 1, 2, h - 2, M.l); c(x + 1, y + h - 3, w - 2, 2, M.d); c(x + w - 3, y + 1, 2, h - 2, M.f);
  c(x + bev - 1, y + bev - 1, w - bev * 2 + 2, h - bev * 2 + 2, M.o); c(x + bev - 2, y + bev - 2, w - bev * 2 + 4, 1, M.f); c(x + bev - 2, y + h - bev + 1, w - bev * 2 + 4, 1, M.L);
  for (let k = 0; k < 2; k++) [[x + 2, y + 2], [x + w - 6, y + 2], [x + 2, y + h - 6], [x + w - 6, y + h - 6]].forEach(([a, b]) => { c(a, b, 4, 4, M.L); c(a + 1, b + 1, 2, 2, M.f); }); }
const PAINTINGHI = (p, t, C) => { const { c, el } = p, M = C.c, A = C.a;   // 벽 · 128 × 92
  c(60, 0, 8, 4, M.f); hframe(p, 2, 4, 124, 86, M, 8);
  const X = 10, Y = 12, W = 108, H = 70; if (hpic(p, X, Y, W, H)) return; for (let y = 0; y < 42; y++) c(X, Y + y, W, 1, y < 14 ? A.d : y < 28 ? A.t : A.l);
  el(X + 84, Y + 12, 6, 6, '#f8f0d0'); el(X + 82, Y + 11, 4, 4, '#fffbe8'); [[12, 6], [30, 14], [52, 4], [70, 18], [100, 26]].forEach(([x, y]) => c(X + x, Y + y, 1, 1, '#f8f4ec'));
  for (let x = 0; x < W; x++) { const h1 = Math.round(24 + 6 * Math.sin(x / 15) + 3 * Math.sin(x / 5)), h2 = Math.round(14 + 4 * Math.sin(x / 11 + 2)); for (let y = H - h1; y < H; y++) c(X + x, Y + y, 1, 1, y < H - h1 + 2 ? '#5a7a6a' : '#3e5a4e'); for (let y = H - h2; y < H; y++) c(X + x, Y + y, 1, 1, y < H - h2 + 2 ? '#6a9a5a' : '#4f7a46'); }
  [[18, 46], [26, 50], [90, 44], [98, 48]].forEach(([x, y]) => { el(X + x, Y + y, 5, 7, '#2e4a34'); el(X + x - 1, Y + y - 2, 3, 3, '#3e6a44'); c(X + x, Y + y + 6, 1, 4, '#3a2a20'); });
  const hx = X + 50, hy = Y + 42; c(hx, hy + 6, 22, 14, '#e8dcc0'); c(hx, hy + 6, 22, 1, '#b8a888'); for (let i = 0; i < 9; i++) c(hx - 2 + i, hy + 6 - i, 26 - i * 2, 1, '#8a2a34'); c(hx + 4, hy + 10, 5, 5, (t >> 3) % 2 ? '#ffd27a' : '#ffc050'); c(hx + 14, hy + 12, 4, 8, '#5a3a24'); c(hx + 17, hy - 4, 3, 6, '#6a5a50');
  c(X, Y, W, 1, 'rgba(0,0,0,.25)'); c(X, Y, 1, H, 'rgba(0,0,0,.2)'); };
const GALLERYHI = (p, t, C) => { const { c, el } = p, A = C.a, B = C.c;   // 벽 · 128 × 140
  const fr = (x, y, w, h) => { c(x, y, w, h, B.o); c(x + 1, y + 1, w - 2, h - 2, A.t); c(x + 1, y + 1, w - 2, 1, A.L); c(x + 1, y + h - 2, w - 2, 1, A.f); c(x + 4, y + 4, w - 8, h - 8, B.o); };
  fr(4, 8, 44, 58); c(9, 13, 34, 48, '#e8a060'); c(9, 13, 34, 20, '#f0b878'); el(26, 46, 9, 13, '#c8c8d0'); el(26, 34, 6, 6, '#e8d0b0'); el(26, 31, 7, 4, '#5a3a24');
  fr(56, 2, 34, 42); c(61, 7, 24, 32, '#4f8a55'); c(61, 7, 24, 14, '#9ac0d8'); el(73, 30, 8, 8, '#3e6a40'); c(72, 32, 2, 7, '#5a3a24');
  fr(96, 12, 28, 34); c(101, 17, 18, 24, '#8a8ab0'); el(110, 28, 5, 6, '#f1e6cc'); el(110, 28, 3, 4, '#d8303a');
  el(26, 104, 22, 28, B.o); el(26, 104, 21, 27, A.t); el(25, 103, 19, 25, A.L); el(26, 104, 18, 24, A.t); el(26, 104, 15, 21, B.o); el(26, 104, 14, 20, '#f1e6cc'); el(26, 100, 6, 7, '#3a2a20'); el(26, 114, 9, 8, '#3a2a20');
  fr(58, 52, 64, 52); if (!hpic(p, 63, 57, 54, 42)) { c(63, 57, 54, 42, '#f8f4ec'); for (let k = 0; k < 4; k++) c(66 + k * 12, 62, 8, 30, ['#e8a060', '#c8c8d0', '#9ad0a0', '#f08ab0'][k]); c(63, 92, 54, 7, '#d8d0c0'); }
  fr(64, 110, 24, 28); c(69, 115, 14, 18, '#3a5a8a'); el(76, 120, 3, 3, '#ffe27a'); fr(94, 110, 30, 22); c(99, 115, 20, 12, '#c87a4a');
  [[26, 2], [73, 0], [110, 8]].forEach(([x, y]) => c(x - 1, y, 2, 3, '#3a3a44')); };
const PORTRAITHI = (p, t, C) => { const { c, el } = p, M = C.c, A = C.a;   // 벽 · 64 × 112
  hframe(p, 0, 0, 64, 112, M, 7); if (hpic(p, 7, 7, 50, 98)) return;
  for (let y = 7; y < 105; y++) c(7, y, 50, 1, y < 40 ? '#4a3626' : '#3a2a20'); el(32, 36, 18, 22, '#5a4230');
  for (let y = 66; y < 105; y++) { const hw = Math.min(25, Math.round(9 + Math.sqrt(Math.max(0, y - 66)) * 4.2)); c(32 - hw, y, hw * 2, 1, A.o); if (hw > 1) { c(33 - hw, y, hw * 2 - 2, 1, A.t); c(33 - hw, y, 3, 1, A.l); c(29 + hw, y, 2, 1, A.f); } }
  c(31, 82, 2, 22, A.f);
  el(32, 72, 10, 6, '#f8f4ec'); for (let x = 22; x < 43; x += 3) el(x + 1, 77, 1, 1, '#d8d0c0'); el(32, 78, 3, 3, M.o); el(32, 78, 2, 2, '#a8344a');
  c(28, 58, 8, 12, '#e8c8a8'); c(28, 66, 8, 2, '#d0a888');
  el(32, 40, 11, 14, '#2a1a10'); el(32, 44, 9, 12, '#e8c8a8'); el(31, 42, 5, 6, '#f4dcc0'); el(32, 30, 12, 7, '#2a1a10'); c(21, 32, 4, 20, '#2a1a10'); c(39, 32, 4, 20, '#2a1a10');
  c(27, 42, 3, 2, OL); c(34, 42, 3, 2, OL); c(27, 41, 3, 1, '#6a4a3a'); c(34, 41, 3, 1, '#6a4a3a'); c(31, 46, 2, 2, '#d0a888'); c(29, 51, 6, 1, '#b05060'); el(26, 48, 2, 1, 'rgba(240,120,120,.35)'); el(38, 48, 2, 1, 'rgba(240,120,120,.35)');
  c(7, 7, 50, 1, 'rgba(0,0,0,.3)'); };
const MIRRORHI = (p, t, C) => { const { c } = p, M = C.c, G = C.a;   // 벽 · 64 × 128 · 위가 둥근 아치형
  // 위는 반원 아치, 아래 모서리는 살짝 둥글게(rb)
  const arch = (x0, y0, w, h, col) => { const r = w / 2, ry = Math.round(r), rb = 4; for (let y = 0; y < h; y++) { let half = r;
      if (y < ry) { const v = (ry - y - .5) / ry; half = r * Math.sqrt(Math.max(0, 1 - v * v)); }
      else if (y >= h - rb) { const v = y - (h - rb) + .5; half = r - rb + Math.sqrt(Math.max(0, rb * rb - v * v)); }
      const hw = Math.round(half); if (hw > 0) c(Math.round(x0 + r - hw), y0 + y, hw * 2, 1, col); } };
  arch(8, 6, 48, 120, 'rgba(0,0,0,.18)');
  arch(6, 2, 52, 122, M.o); arch(7, 3, 50, 120, M.t); arch(8, 4, 48, 3, M.L); c(8, 16, 2, 100, M.l); c(54, 16, 2, 100, M.f); c(10, 120, 44, 2, M.d);
  arch(11, 7, 42, 112, M.o); arch(12, 8, 40, 110, G.t);
  for (let y = 60; y < 118; y++) c(12, y, 40, 1, y < 90 ? G.t : G.l);
  for (let i = 0; i < 40; i++) { c(16 + Math.round(i * .45), 26 + i * 2, 4, 2, G.L); c(26 + Math.round(i * .45), 20 + i * 2, 2, 2, G.L); }
  c(15, 12, 2, 8, '#ffffff'); c(18, 10, 2, 4, '#ffffff'); c(14, 115, 36, 2, G.f);
};
const WCLOCKHI = (p, t, C) => { const { c, el, ln } = p, B = C.b;   // 벽 · 64 × 64
  el(32, 32, 30, 30, B.o); el(32, 32, 29, 29, B.t); el(30, 30, 26, 26, B.l); el(32, 32, 26, 26, B.t); el(32, 32, 23, 23, B.o); el(32, 32, 22, 22, '#fff8ec'); el(33, 33, 20, 20, '#f4ecd8');
  for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, big = i % 5 === 0, r = big ? 17 : 19; c(32 + Math.round(Math.sin(a) * r) - (big ? 1 : 0), 32 - Math.round(Math.cos(a) * r) - (big ? 1 : 0), big ? 3 : 1, big ? 3 : 1, big ? OL : '#8a7a6a'); }
  const m = (t % 60) / 60 * Math.PI * 2, h = ((t / 12) % 60) / 60 * Math.PI * 2 + 2.1;
  ln(32, 32, 32 + Math.round(Math.sin(h) * 10), 32 - Math.round(Math.cos(h) * 10), OL, 2); ln(32, 32, 32 + Math.round(Math.sin(m) * 15), 32 - Math.round(Math.cos(m) * 15), '#a8344a', 1); el(32, 32, 2, 2, GOLDD); c(32, 32, 1, 1, GOLD2);
  c(26, 44, 12, 3, '#d8c8a8'); };
const WALLSHELFHI = (p, t, C) => { const { c, el } = p, B = C.b;   // 벽 · 128 × 72
  [14, 106].forEach(x => { c(x, 56, 8, 14, B.o); c(x + 1, 56, 6, 12, B.t); for (let i = 0; i < 8; i++) c(x + 1 + i * .5 | 0, 58 + i, 6 - i * .6 | 0, 1, B.t); });
  c(0, 48, 128, 10, B.o); c(1, 49, 126, 8, B.t); c(1, 49, 126, 2, B.L); c(1, 55, 126, 2, B.d); hgrain(p, 3, 51, 122, 3, B, 6);
  // 꽃병 · 책 · 유리병 · 액자 · 초
  for (let y = 0; y < 22; y++) { const w = Math.round(5 + 4 * Math.sin(Math.PI * (y + 3) / 25)); c(14 - w, 26 + y, w * 2, 1, y ? '#3a5a8a' : '#24364e'); c(14 - w + 1, 26 + y, 2, 1, '#6a8ac0'); } [[10, 16, '#f08ab0'], [17, 14, '#f8f4ec'], [14, 20, '#ffd060']].forEach(([x, y, f]) => { p.ln(14, 26, x, y, '#4f8a55', 1); el(x, y, 3, 3, ramp(f).o); el(x, y, 2, 2, f); });
  [['#a8344a', 7, 24], ['#3a5a8a', 6, 22], ['#c9a96a', 6, 26], ['#4f8a55', 7, 20]].forEach(([col, w, h], i, a) => { const x = 30 + a.slice(0, i).reduce((s, q) => s + q[1] + 1, 0), R = ramp(col); c(x, 48 - h, w, h, R.o); c(x + 1, 49 - h, w - 2, h - 1, R.t); c(x + 1, 49 - h, 1, h - 1, R.l); c(x + 1, 52 - h, w - 2, 1, GOLD); c(x + 1, 44 - (h > 22 ? 2 : 0), w - 2, 1, GOLD); });
  c(60, 26, 9, 22, '#a8344a'); c(61, 27, 7, 20, '#d8607a'); c(61, 27, 1, 20, '#f08ab0'); c(60, 24, 9, 3, GOLD);
  p.orr(74, 32, 16, 16, '#d8ecf0', '#8aa0a8', 3); c(76, 38, 12, 9, '#e0b050'); c(77, 39, 3, 6, '#f8e0a0'); c(75, 29, 14, 4, '#c4864e'); c(76, 30, 12, 1, '#e8b070');
  hframe(p, 94, 22, 20, 26, ramp('#e0b050'), 3); c(97, 25, 14, 20, '#9ac0d8'); el(104, 38, 5, 5, '#4f8a55');
  c(118, 34, 6, 14, '#f4f0e8'); c(118, 34, 1, 14, '#ffffff'); el(121, 47, 5, 2, GOLDD); hflame(p, 121, 33, t, 1); };
const SCONCEHI = (p, t, C) => { const { c, el, ln } = p, M = C.c;   // 벽 · 64 × 80
  p.orr(24, 42, 16, 34, M.t, M.o, 6); c(27, 45, 10, 2, M.L); c(26, 48, 2, 24, M.l); el(32, 58, 4, 5, M.f); el(32, 58, 2, 3, M.L);
  for (let i = 0; i <= 14; i++) { const x = 32 + Math.round(Math.sin(i / 14 * Math.PI) * 10) - (i > 7 ? 0 : 0), y = 58 - i * 2; c(x - 1, y, 3, 2, M.o); c(x, y, 1, 1, M.L); }
  el(32, 30, 9, 3, M.o); el(32, 29, 8, 2, M.t); el(30, 28, 4, 1, M.L); c(29, 31, 6, 3, M.f);
  c(28, 12, 8, 17, '#f4f0e8'); c(28, 12, 2, 17, '#ffffff'); c(34, 12, 2, 17, '#d8d0c0'); c(29, 16, 2, 4, '#ffffff'); c(35, 14, 1, 6, '#e8e0d0');
  hflame(p, 32, 11, t, 0); };

/* ── 남은 가구 (고해상도) ── */
const BOOKC = ['#a8344a', '#3a5a8a', '#c9a96a', '#4f8a55', '#6a4a8a', '#b8693d', '#e8dcc0', '#2a6a6a', '#8a2a3a', '#d8c070'];
function hbooks(p, x, y, w, h, seed) { const { c } = p; let xx = x, i = 0;
  while (xx < x + w - 4) { const bw = 5 + hsh(i, seed) % 5, bh = h - (hsh(seed, i) % 9); if (xx + bw > x + w) break; const R = ramp(BOOKC[hsh(i + seed, 7) % BOOKC.length]), top = y + h - bh;
    c(xx, top, bw, bh, R.o); c(xx + 1, top + 1, bw - 2, bh - 1, R.t); c(xx + 1, top + 1, 1, bh - 1, R.l); if (bw > 6) c(xx + bw - 2, top + 1, 1, bh - 1, R.f);
    if (hsh(i, seed + 3) % 3) { c(xx + 1, top + 4, bw - 2, 1, GOLD); c(xx + 1, y + h - 6, bw - 2, 1, GOLD); } if (hsh(i, seed + 5) % 4 === 0) c(xx + 2, top + 8, bw - 4, 3, R.L);
    xx += bw; i++; if (hsh(i, seed) % 11 === 0 && xx < x + w - 16) xx += 5; } }
const CABINETHI = (p, t, C) => { const { c, el } = p, B = C.b, M = C.c;   // 128 × 176
  c(0, 0, 128, 14, B.o); c(1, 1, 126, 11, B.t); c(1, 1, 126, 3, B.L); c(1, 10, 126, 2, B.d); p.orr(48, -6, 32, 10, B.t, B.o, 4); c(60, -4, 8, 4, M.t); c(61, -3, 3, 2, M.L);
  c(2, 14, 124, 120, B.o); c(4, 14, 120, 118, B.f);
  [6, 66].forEach((x, d) => { c(x, 18, 56, 110, B.o); c(x + 1, 19, 54, 108, B.t); c(x + 1, 19, 54, 2, B.L); c(x + 1, 19, 2, 108, B.l);
    const gx = x + 6, gy = 24, gw = 44, gh = 98; c(gx - 1, gy - 1, gw + 2, gh + 2, B.d); c(gx, gy, gw, gh, '#3a4a54'); c(gx, gy, gw, gh, 'rgba(184,208,216,.35)');
    [56, 90].forEach(y => { c(gx, y, gw, 3, B.t); c(gx, y, gw, 1, B.L); });
    // 진열품: 찻잔 · 세워둔 접시 · 화병 · 작은 상
    if (!d) { el(gx + 12, 44, 9, 9, '#9a948a'); el(gx + 12, 44, 8, 8, '#f8f4ec'); el(gx + 12, 44, 5, 5, '#3a5a8a'); el(gx + 12, 44, 3, 3, '#f8f4ec'); hcup(p, gx + 32, 46, { t: '#a8344a', L: '#d8607a' });
      for (let y = 0; y < 20; y++) { const w = Math.round(4 + 4 * Math.sin(Math.PI * (y + 2) / 22)); c(gx + 14 - w, 68 + y, w * 2, 1, '#2a6a6a'); c(gx + 14 - w + 1, 68 + y, 2, 1, '#5aa0a0'); } c(gx + 12, 66, 4, 2, '#2a6a6a'); hcup(p, gx + 32, 80, { t: '#e0b050', L: '#ffe27a' });
      el(gx + 12, 116, 9, 3, '#9a948a'); el(gx + 12, 115, 8, 2, '#f8f4ec'); c(gx + 26, 106, 14, 15, '#c9a96a'); c(gx + 27, 107, 12, 3, '#e8d098'); }
    else { el(gx + 32, 44, 9, 9, '#9a948a'); el(gx + 32, 44, 8, 8, '#f8f4ec'); el(gx + 32, 44, 5, 5, '#a8344a'); el(gx + 32, 44, 3, 3, '#f8f4ec'); hcup(p, gx + 12, 46, { t: '#3a5a8a', L: '#6a8ac0' });
      el(gx + 14, 80, 6, 7, '#e0b050'); el(gx + 13, 78, 2, 2, '#ffe27a'); c(gx + 12, 86, 4, 2, '#a07028'); el(gx + 30, 82, 8, 6, '#9a68c8'); el(gx + 28, 80, 3, 2, '#c9a0e0');
      hbooks(p, gx + 4, 100, 36, 21, 31); }
    for (let i = 0; i < 40; i++) { c(gx + 4 + Math.round(i * .4), gy + 4 + i * 2, 3, 2, 'rgba(255,255,255,.22)'); c(gx + 14 + Math.round(i * .4), gy + 2 + i * 2, 1, 2, 'rgba(255,255,255,.16)'); }
    c(x + (d ? 3 : 50), 66, 3, 14, M.o); c(x + (d ? 4 : 51), 67, 1, 12, M.L); });
  c(62, 18, 4, 110, B.o);
  c(2, 132, 124, 30, B.o); c(3, 133, 122, 28, B.t); c(3, 133, 122, 2, B.L); hdrawer(p, 8, 138, 54, 18, B, M); hdrawer(p, 66, 138, 54, 18, B, M);
  c(0, 160, 128, 8, B.o); c(1, 161, 126, 5, B.t); c(1, 161, 126, 1, B.L); [4, 112].forEach(x => { c(x, 166, 12, 10, B.o); c(x + 2, 166, 8, 8, B.t); c(x + 2, 166, 2, 8, B.l); });
};
const TALLSHELFHI = (p, t, C) => { const { c, el } = p, B = C.b, M = C.c;   // 128 × 224
  c(0, 0, 128, 18, B.o); c(1, 1, 126, 14, B.t); c(1, 1, 126, 3, B.L); c(1, 13, 126, 2, B.d); p.orr(44, -6, 40, 10, B.t, B.o, 4); c(60, -4, 8, 4, M.t); c(4, 5, 120, 1, B.l); c(4, 9, 120, 1, B.f);
  c(0, 18, 128, 192, B.o); c(2, 18, 124, 190, B.t); c(2, 18, 6, 190, B.l); c(120, 18, 6, 190, B.f); c(8, 20, 112, 186, '#24140a');
  const rows = [[22, 62], [66, 106], [110, 150], [154, 196]];
  rows.forEach(([y0, y1], i) => { c(8, y0, 112, 3, 'rgba(0,0,0,.4)'); if (i === 1) { hbooks(p, 10, y0 + 4, 108, y1 - y0 - 4, 11); }
    else if (i === 2) { hbooks(p, 10, y0 + 4, 46, y1 - y0 - 4, 23); c(66, y1 - 14, 50, 14, '#5a3a24'); c(66, y1 - 14, 50, 2, '#7a5034'); c(70, y1 - 20, 40, 6, '#a8344a'); c(70, y1 - 20, 40, 1, '#d8607a'); c(70, y1 - 26, 36, 6, '#3a5a8a'); c(70, y1 - 26, 36, 1, '#6a8ac0');
      c(110, y1 - 36, 6, 22, '#f4f0e8'); c(110, y1 - 36, 1, 22, '#ffffff'); el(113, y1 - 13, 6, 2, GOLDD); hflame(p, 113, y1 - 37, t, 2); }
    else hbooks(p, 10, y0 + 4, 108, y1 - y0 - 4, 5 + i * 13);
    c(2, y1, 124, 5, B.o); c(3, y1, 122, 3, B.t); c(3, y1, 122, 1, B.L); });
  c(0, 206, 128, 10, B.o); c(1, 207, 126, 7, B.t); c(1, 207, 126, 2, B.L); [4, 112].forEach(x => { c(x, 214, 12, 10, B.o); c(x + 2, 214, 8, 8, B.t); });
};
const DTABLEHI = (p, t, C) => { const { c, el } = p, A = C.a, B = C.b, R = C.c, M = ramp(GOLD);   // 192 × 140
  [14, 170].forEach(x => { c(x, 96, 8, 40, B.o); c(x + 1, 96, 6, 38, B.f); });
  c(0, 10, 192, 72, A.o); c(1, 11, 190, 70, A.t); c(1, 11, 190, 3, A.L); c(1, 14, 190, 4, A.l); for (let y = 22; y < 80; y += 6) c(1, y, 190, 1, A.l);
  c(0, 34, 192, 22, R.o); c(1, 35, 190, 20, R.t); c(1, 35, 190, 2, R.l); c(1, 53, 190, 1, R.f); for (let x = 10; x < 186; x += 16) { c(x + 4, 41, 2, 8, GOLD); c(x + 2, 43, 6, 4, GOLD); c(x + 4, 44, 2, 2, R.t); } c(1, 37, 190, 1, GOLD); c(1, 52, 190, 1, GOLD);
  // 앞으로 늘어진 식탁보 (주름 + 레이스)
  for (let x = 0; x < 192; x++) { const fold = Math.sin(x / 2.6) * .8 + Math.sin(x / 9) * .3, hy = 102 + Math.round(Math.sin(x / 2.6) * .9) - (x < 4 || x > 187 ? 2 : 0);
    for (let y = 81; y <= hy; y++) c(x, y, 1, 1, x === 0 || x === 191 ? A.o : y === hy ? A.d : y === 81 ? A.f : fold > .6 ? A.l : fold > .05 ? A.t : fold > -.55 ? A.f : A.d); }
  for (let x = 2; x < 188; x += 6) { el(x + 3, 105, 3, 3, A.o); el(x + 3, 104, 2, 3, '#fff8ec'); c(x + 3, 104, 1, 1, A.f); c(x, 101, 7, 1, '#fff8ec'); }
  c(0, 34, 2, 76, R.o); c(190, 34, 2, 76, R.o); c(0, 82, 2, 24, R.t); c(190, 82, 2, 24, R.t); [0, 189].forEach(x => { c(x - 1, 106, 4, 6, GOLD); c(x, 112, 2, 4, GOLDD); });
  // 자리 4개: 접시 · 포크 · 나이프 · 잔
  [[34, 24], [158, 24], [34, 68], [158, 68]].forEach(([x, y], i) => { hplate(p, x, y, 13, 5); el(x, y, 7, 3, i % 2 ? '#d8a058' : '#e8c070'); c(x - 3, y - 1, 2, 1, '#a86030');
    c(x - 19, y - 4, 1, 10, '#c8c8d0'); c(x - 21, y - 4, 1, 3, '#c8c8d0'); c(x - 17, y - 4, 1, 3, '#c8c8d0'); c(x + 17, y - 4, 2, 10, '#c8c8d0'); c(x + 17, y - 4, 1, 4, '#ffffff');
    if (i < 2) { c(x + 22, y - 14, 6, 8, '#e8f0f4'); c(x + 23, y - 12, 4, 4, '#a8344a'); c(x + 24, y - 6, 2, 5, '#e8f0f4'); el(x + 25, y - 1, 4, 1, '#e8f0f4'); } });
  // 가운데 촛대 (세 갈래)
  el(96, 58, 12, 4, M.o); el(96, 57, 11, 3, M.t); el(94, 56, 5, 1, M.L); c(94, 34, 4, 22, M.o); c(95, 34, 2, 22, M.t); c(95, 34, 1, 22, M.L); c(80, 32, 32, 3, M.o); c(81, 32, 30, 2, M.t); c(81, 32, 30, 1, M.L);
  [[82, 30], [96, 26], [110, 30]].forEach(([x, y], i) => { el(x, y + 2, 4, 2, M.t); c(x - 2, y - 14, 5, 16, '#f4f0e8'); c(x - 2, y - 14, 1, 16, '#ffffff'); hflame(p, x, y - 15, t, i); });
  [12, 176].forEach(x => { c(x, 104, 10, 34, B.o); c(x + 2, 104, 6, 32, B.t); c(x + 2, 104, 2, 32, B.l); c(x, 116, 10, 3, B.o); c(x + 1, 117, 8, 1, B.L); c(x - 1, 134, 12, 5, B.o); c(x, 135, 10, 3, B.t); });
};
const LOVEHI = {
  front(p, t, C) { const { c } = p, A = C.a, B = C.b;
    hband(p, 6, 0, 116, 54, 2, A, { amp: 4, rad: 12, tuft: true });
    c(14, 46, 100, 22, A.o); c(15, 46, 98, 21, A.d); hband(p, 26, 54, 76, 40, 2, A, { amp: 3, rad: 6, front: 15 });
    [0, 98].forEach(x => { c(x + 2, 56, 26, 50, A.o); c(x + 3, 57, 24, 48, A.f); c(x + 4, 62, 3, 40, A.t); c(x + 22, 62, 3, 40, A.d); hpuff(p, x, 44, 30, 22, A, 4, true); });
    c(4, 92, 120, 18, A.o); c(5, 93, 118, 16, A.f); c(5, 93, 118, 2, A.t); c(5, 100, 118, 1, A.d); for (let x = 9; x < 122; x += 9) c(x, 101, 1, 7, A.d);
    [10, 58, 106].forEach(x => { c(x + 2, 110, 8, 6, B.o); c(x + 3, 110, 6, 5, B.t); c(x + 3, 110, 2, 5, B.l); c(x + 3, 113, 6, 1, GOLD); });
  },
  back(p, t, C) { const { c } = p, A = C.a, B = C.b;
    hpuff(p, 0, 36, 30, 22, A, 4, true); hpuff(p, 98, 36, 30, 22, A, 4, true);
    hpuff(p, 6, 0, 116, 30, A, 4, true); c(8, 16, 112, 78, A.o); c(9, 17, 110, 76, A.t); c(9, 17, 110, 3, A.l); c(63, 20, 1, 70, A.f); c(64, 20, 1, 70, A.l);
    c(9, 84, 110, 8, A.f); c(9, 84, 110, 1, A.d); c(4, 92, 120, 18, A.o); c(5, 93, 118, 16, A.f); c(5, 100, 118, 1, A.d);
    [10, 58, 106].forEach(x => { c(x + 2, 110, 8, 6, B.o); c(x + 3, 110, 6, 5, B.t); });
  },
  side(p, t, C) { const { c } = p, A = C.a, B = C.b;   // 앞이 왼쪽 · 64 × 180
    hbandV(p, 38, 6, 26, 152, 2, A, { amp: 3, rad: 10 });
    hbandV(p, 4, 26, 40, 118, 2, A, { amp: 3, rad: 6, front: 8 });
    hpuff(p, 2, 12, 60, 22, A, 4, true);
    c(2, 148, 60, 18, A.o); c(3, 149, 58, 16, A.f); c(3, 149, 58, 3, A.t); hpuff(p, 2, 138, 60, 20, A, 4, true);
    c(2, 164, 60, 6, A.d); for (let x = 6; x < 60; x += 9) c(x, 165, 1, 5, A.o);
    c(4, 170, 8, 10, B.o); c(5, 170, 6, 9, B.t); c(52, 170, 8, 10, B.o); c(53, 170, 6, 9, B.t); c(5, 176, 6, 1, GOLD); c(53, 176, 6, 1, GOLD);
  },
};
const STOOLHI = (p, t, C) => { const { c, el } = p, A = C.a, B = C.b;   // 64 × 64
  hleg(p, 19, 28, 30, ramp(B.f)); hleg(p, 40, 28, 30, ramp(B.f));
  c(6, 20, 52, 12, B.o); c(7, 21, 50, 10, B.t); c(7, 21, 50, 2, B.L); c(7, 29, 50, 1, B.d);
  el(32, 16, 27, 10, A.o); el(32, 15, 26, 9, A.t); el(32, 14, 22, 6, A.l); el(28, 12, 10, 3, A.L); c(6, 16, 52, 5, A.t); c(6, 20, 52, 1, A.f); el(32, 15, 2, 2, A.d);
  c(14, 48, 36, 3, B.o); c(15, 48, 34, 1, B.l);
  hleg(p, 8, 30, 32, B); hleg(p, 51, 30, 32, B);
};
const OTTOMANHI = (p, t, C) => { const { c, el } = p, A = C.a;   // 64 × 44
  el(32, 40, 28, 4, 'rgba(0,0,0,.2)');
  c(4, 14, 56, 24, A.o); for (let x = 5; x < 59; x++) { const k = (x - 32) / 27, col = Math.abs(k) > .8 ? A.f : k < -.35 ? A.l : k < .4 ? A.t : A.f; c(x, 14, 1, 23, col); } el(32, 37, 28, 5, A.o); el(32, 36, 27, 4, A.f);
  for (let x = 8; x < 58; x += 8) c(x, 20, 1, 14, A.d);
  el(32, 14, 28, 10, A.o); el(32, 13, 27, 9, A.t); el(32, 12, 22, 6, A.l); el(27, 10, 9, 3, A.L);
  [[20, 12], [32, 9], [44, 12], [26, 16], [38, 16]].forEach(([x, y]) => { c(x, y, 2, 2, A.d); c(x, y - 1, 2, 1, A.L); });
  c(4, 24, 56, 2, GOLD); c(4, 24, 56, 1, GOLD2); c(30, 24, 4, 4, GOLDD); c(31, 28, 2, 8, GOLD); c(30, 34, 4, 4, GOLDD);
};
const SBEDHI = (p, t, C) => { const { c, orr, el } = p, A = C.a, B = C.b, S = C.c, M = ramp(GOLD);   // 64 × 208 (양옆으로 6씩 넘침)
  orr(-6, 0, 76, 40, B.t, B.o, 12); c(4, 3, 56, 3, B.L); orr(4, 10, 56, 24, B.f, B.d, 6); c(6, 12, 52, 1, B.l); hgrain(p, 8, 14, 48, 16, B, 7); el(32, 20, 5, 4, M.o); el(32, 20, 4, 3, M.t);
  c(-4, 32, 72, 158, B.o); c(-2, 32, 68, 156, B.f);
  p.rr(0, 34, 64, 150, S.f, 5); p.rr(1, 35, 62, 148, S.t, 4); c(2, 36, 60, 2, S.L);
  hpillow(p, 5, 38, 54, 24, S);
  hblanket(p, -6, 70, 76, 124, A, 2); hfold(p, -4, 68, 72, S);
  orr(-6, 184, 76, 20, B.t, B.o, 5); c(-2, 186, 68, 3, B.L); c(-5, 194, 74, 8, B.f); c(-5, 194, 74, 1, B.d);
  c(-5, 202, 9, 6, B.o); c(60, 202, 9, 6, B.o);
};
const RUNNERHI = (p, t, C) => { const { c } = p, A = C.a, B = C.c;   // 바닥 · 64 × 192 (세로)
  c(4, 6, 56, 180, A.o); c(5, 7, 54, 178, A.t); c(8, 10, 48, 172, B.t); c(10, 12, 44, 168, A.f); c(12, 14, 40, 164, A.t);
  for (let y = 22; y < 176; y += 22) { for (let i = 0; i < 9; i++) { c(32 - i, y + i - 8, i * 2 + 1, 1, i % 3 === 2 ? A.d : B.t); c(32 - i, y + 8 - i, i * 2 + 1, 1, i % 3 === 2 ? A.d : B.t); } c(30, y - 2, 4, 4, A.d); c(31, y - 1, 2, 2, B.L); c(14, y, 3, 3, B.t); c(47, y, 3, 3, B.t); }
  for (let y = 10; y < 182; y += 4) { c(9, y, 2, 2, B.l); c(53, y, 2, 2, B.l); }
  for (let x = 6; x < 58; x += 3) { c(x, 0, 1, 6, '#fff4dc'); c(x + 1, 1, 1, 4, '#e8dcc0'); c(x, 186, 1, 6, '#fff4dc'); c(x + 1, 187, 1, 4, '#e8dcc0'); }
};

/* ── 소품 · 창문 (고해상도) ── */
function clipPen(p, rowRange) { return mkPen((x, y, w, h, col) => { for (let yy = Math.floor(y); yy < y + h; yy++) { const r = rowRange(yy); if (!r) continue; const x1 = Math.max(x, r[0]), x2 = Math.min(x + w, r[1]); if (x2 > x1) p.c(x1, yy, x2 - x1, 1, col); } }); }
function archRange(x0, y0, w, y1) { const r = w / 2, cx = x0 + r; return yy => { if (yy < y0 || yy >= y1) return null; if (yy < y0 + r) { const v = (y0 + r - yy - .5) / r, hw = r * Math.sqrt(Math.max(0, 1 - v * v)); return [Math.round(cx - hw), Math.round(cx + hw)]; } return [x0, x0 + w]; }; }
function hdrape(p, x0, mir, y0, H, A, tie, W) { const { c } = p; W = W || 28;   // 묶은 커튼 한 쪽
  for (let i = 0; i < W; i++) { const xx = mir ? x0 + W - 1 - i : x0 + i;
    for (let y = y0; y < y0 + H; y++) { const pinch = y > tie - 30 && y < tie + 12 ? Math.round((1 - Math.abs(y - tie) / 30) * W * .45) : 0, edge = W - pinch; if (i >= edge) continue;
      const f = (i + Math.round(y / 40)) % 8, col = i === edge - 1 ? A.o : f < 2 ? A.f : f < 5 ? A.t : f < 7 ? A.l : A.d; c(xx, y, 1, 1, col); } }
  const x = mir ? x0 + 8 : x0 + 2; c(x, tie - 2, W - 10, 5, GOLDD); c(x + 1, tie - 1, W - 12, 3, GOLD); c(x + 1, tie - 1, W - 12, 1, GOLD2); }
const BOOKSHI = (p, t, C) => { const { c } = p;   // 64 × 60
  [[4, 48, 56, C.a], [8, 38, 48, C.c], [6, 28, 52, ramp('#c9a96a')], [11, 18, 42, C.a]].forEach(([x, y, w, R], i) => { const h = 11 - (i % 2);
    c(x, y, w, h, R.o); c(x + 1, y + 1, w - 2, h - 2, R.t); c(x + 1, y + 1, w - 2, 2, R.L); c(x + 1, y + h - 3, w - 2, 1, R.f);
    c(x + w - 7, y + 2, 6, h - 4, '#f4ecd8'); for (let yy = y + 3; yy < y + h - 2; yy += 2) c(x + w - 7, yy, 6, 1, '#d8ccb0'); c(x + 4, y + 4, 12, 1, GOLD); c(x + 4, y + h - 4, 12, 1, GOLD); c(x + 20, y + 2, 2, h - 4, R.d); });
  c(36, 6, 8, 12, '#f4f0e8'); c(36, 6, 2, 12, '#ffffff'); p.el(40, 17, 7, 2, GOLDD); p.el(40, 16, 6, 1, GOLD); hflame(p, 40, 5, t, 0); };
const BIRDCAGEHI = (p, t, C) => { const { c, el } = p, M = C.c, A = C.a, b = (t % 8) < 4 ? 0 : -2;   // 64 × 132
  c(30, 0, 4, 8, M.o); c(31, 0, 2, 8, M.t); el(32, 10, 5, 4, M.o); el(32, 10, 4, 3, M.t);
  const top = x => 30 - Math.round(Math.sqrt(Math.max(0, 1 - Math.pow((x - 32) / 26, 2))) * 16);
  c(14, 70, 36, 2, '#8a5a34'); c(14, 70, 36, 1, '#b07a48'); c(30, 72, 4, 4, '#6a4428');
  el(34, 62 + b, 9, 7, ramp(A.t).o); el(34, 62 + b, 8, 6, A.t); el(31, 59 + b, 4, 3, A.L); el(41, 56 + b, 5, 5, ramp(A.t).o); el(41, 56 + b, 4, 4, A.t); c(42, 54 + b, 2, 2, OL); c(43, 54 + b, 1, 1, '#ffffff'); c(45, 56 + b, 4, 2, '#e86a2a'); c(24, 62 + b, 6, 3, A.f); c(34, 69 + b, 1, 2, '#e86a2a'); c(37, 69 + b, 1, 2, '#e86a2a');
  if ((t >> 3) % 3 === 0) { c(52, 40, 3, 3, '#f4f0e8'); c(55, 38, 2, 2, '#f4f0e8'); }
  for (let x = 6; x <= 58; x += 6) { const y0 = top(x); c(x, y0, 2, 100 - y0, M.o); c(x, y0, 1, 100 - y0, M.t); }
  for (let x = 5; x < 59; x++) { c(x, top(x), 1, 2, M.o); c(x, top(x), 1, 1, M.L); } [44, 70].forEach(y => { c(5, y, 54, 2, M.o); c(5, y, 54, 1, M.t); });
  c(2, 98, 60, 8, M.o); c(3, 99, 58, 5, M.t); c(3, 99, 58, 1, M.L); c(6, 106, 52, 3, M.f);
  c(29, 108, 6, 16, M.o); c(30, 108, 4, 16, M.t); c(30, 108, 1, 16, M.L); el(32, 126, 14, 4, M.o); el(32, 125, 13, 3, M.t); el(29, 124, 6, 1, M.L); };
const CATHI = (p, t, C) => { const { c, el } = p, A = C.a, E = C.c, br = (t >> 2) % 3 === 0 ? 1 : 0, sw = Math.round(Math.sin(t / 5) * 2);   // 64 × 52
  el(32, 48, 28, 4, 'rgba(0,0,0,.22)');
  el(30, 36, 22, 12 + br, A.o); el(30, 36, 21, 11 + br, A.t); el(26, 30, 14, 4, A.l); el(22, 28, 7, 2, A.L);
  for (let i = 0; i <= 30; i++) { const u = i / 30, x = Math.round((1 - u) * (1 - u) * 10 + 2 * u * (1 - u) * 0 + u * u * (34 + sw)), y = Math.round((1 - u) * (1 - u) * 34 + 2 * u * (1 - u) * 52 + u * u * 46); c(x - 2, y - 2, 5, 5, A.o); }
  for (let i = 0; i <= 30; i++) { const u = i / 30, x = Math.round((1 - u) * (1 - u) * 10 + u * u * (34 + sw)), y = Math.round((1 - u) * (1 - u) * 34 + 2 * u * (1 - u) * 52 + u * u * 46); c(x - 1, y - 1, 3, 3, A.t); if (i % 5 === 0) c(x - 1, y - 2, 2, 1, A.l); }
  el(20, 44, 6, 3, A.o); el(20, 44, 5, 2, A.l); el(44, 45, 6, 3, A.o); el(44, 45, 5, 2, A.l);
  el(48, 26, 13, 11, A.o); el(48, 26, 12, 10, A.t); el(45, 21, 6, 3, A.l);
  [[38, 10, 42, 20, 36, 20], [52, 9, 58, 20, 49, 18]].forEach(([x1, y1, x2, y2, x3, y3]) => { for (let y = y1; y <= y2; y++) { const f = (y - y1) / (y2 - y1); c(Math.round(x3 + (x1 - x3) * (1 - f)) - 1, y, Math.round(4 + f * 7), 1, A.o); c(Math.round(x3 + (x1 - x3) * (1 - f)), y, Math.round(2 + f * 5), 1, f > .3 ? A.t : A.o); } });
  c(41, 14, 2, 4, '#c06080'); c(53, 13, 2, 4, '#c06080');
  const bl = (t % 23) < 2; if (bl) { c(41, 26, 5, 1, E.t); c(51, 26, 5, 1, E.t); } else { el(43, 25, 3, 3, E.o); el(43, 25, 2, 2, E.t); c(43, 23, 1, 5, OL); el(53, 25, 3, 3, E.o); el(53, 25, 2, 2, E.t); c(53, 23, 1, 5, OL); c(42, 24, 1, 1, '#ffffff'); c(52, 24, 1, 1, '#ffffff'); }
  c(47, 29, 3, 2, '#c06080'); c(48, 31, 1, 1, OL); c(46, 32, 2, 1, OL); c(49, 32, 2, 1, OL);
  [[36, 30], [36, 33], [60, 30], [60, 33]].forEach(([x, y], i) => c(x - (i < 2 ? 8 : 0), y, 8, 1, 'rgba(240,240,240,.45)'));
  if ((t % 23) < 3) { c(14, 2, 3, 3, '#ffffff99'); c(20, -2, 4, 3, '#ffffff77'); } };
const CANDLEHI = (p, t, C) => { const { c, el } = p, M = C.c;   // 64 × 92
  el(32, 86, 16, 5, M.o); el(32, 85, 15, 4, M.t); el(28, 84, 7, 1, M.L); el(32, 78, 6, 3, M.o); el(32, 77, 5, 2, M.t);
  c(29, 42, 6, 36, M.o); c(30, 42, 4, 36, M.t); c(30, 42, 1, 36, M.L); el(32, 60, 5, 3, M.o); el(32, 59, 4, 2, M.L);
  for (let i = 0; i <= 20; i++) { const y = 42 - Math.round(Math.sin(i / 20 * Math.PI) * 6); c(12 + i, y + 6, 2, 3, M.o); c(30 + i, y + 6, 2, 3, M.o); c(12 + i, y + 6, 2, 1, M.L); c(30 + i, y + 6, 2, 1, M.L); }
  [[12, 44], [32, 36], [52, 44]].forEach(([x, y], i) => { el(x, y + 3, 6, 2, M.o); el(x, y + 2, 5, 1, M.t); c(x - 3, y - 20, 7, 22, '#f4f0e8'); c(x - 3, y - 20, 2, 22, '#ffffff'); c(x + 2, y - 20, 2, 22, '#d8d0c0'); c(x - 3, y - 20, 7, 1, '#d8d0c0'); c(x + 1, y - 18, 2, 5, '#ffffff'); hflame(p, x, y - 21, t, i); }); };
const SAFEHI = (p, t, C) => { const { c, el } = p, A = C.a, M = C.c;   // 64 × 76
  p.orr(2, 4, 60, 64, A.t, A.o, 4); c(4, 6, 56, 3, A.L); c(4, 9, 3, 56, A.l); c(57, 9, 3, 56, A.f); c(4, 60, 56, 6, A.f);
  p.orr(8, 14, 48, 44, A.f, A.o, 3); c(10, 16, 44, 2, A.t); c(10, 54, 44, 2, A.d);
  [[10, 16], [50, 16], [10, 52], [50, 52]].forEach(([x, y]) => { c(x, y, 3, 3, A.L); c(x + 1, y + 1, 2, 2, A.d); });
  el(28, 36, 11, 11, M.o); el(28, 36, 10, 10, M.t); el(27, 35, 8, 8, M.L); el(28, 36, 7, 7, M.t); el(28, 36, 4, 4, A.d); for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; c(28 + Math.round(Math.cos(a) * 8), 36 + Math.round(Math.sin(a) * 8), 1, 1, A.o); } c(28, 26, 1, 4, '#a8344a');
  c(44, 30, 5, 14, M.o); c(45, 31, 3, 12, M.t); c(45, 31, 1, 12, M.L); c(5, 20, 4, 8, M.o); c(5, 44, 4, 8, M.o); c(6, 21, 2, 6, M.t); c(6, 45, 2, 6, M.t);
  [6, 50].forEach(x => { c(x, 68, 8, 8, A.o); c(x + 1, 68, 6, 6, A.d); }); };
const PADLOCKHI = (p, t, C) => { const { c, el } = p, A = C.a, M = C.c;   // 64 × 60
  el(32, 56, 17, 3, 'rgba(30,15,5,.2)');
  const arc = (r, w, col) => { for (let a = 0; a <= Math.PI + .001; a += .03) { const x = 32 + Math.cos(a) * r, y = 26 - Math.sin(a) * (r + 2); c(Math.round(x - w / 2), Math.round(y - w / 2), w, w, col); } };
  c(19, 26, 6, 8, M.o); c(39, 26, 6, 8, M.o); arc(10, 6, M.o); arc(10, 4, M.t); c(20, 26, 4, 8, M.t); c(40, 26, 4, 8, M.t); arc(10.6, 1.4, M.L); c(20, 26, 1, 7, M.L);
  p.orr(13, 31, 38, 26, A.t, A.o, 5); c(16, 33, 32, 2, A.L); c(15, 35, 2, 18, A.l); c(16, 51, 32, 4, A.f); c(47, 35, 2, 16, A.f);
  [[18, 37], [44, 37], [18, 50], [44, 50]].forEach(([x, y]) => { c(x, y, 2, 2, A.d); c(x, y, 1, 1, A.L); });
  el(32, 41, 4, 4, A.o); el(32, 41, 3, 3, '#2a1a10'); c(31, 42, 3, 8, '#2a1a10'); c(30, 49, 5, 1, A.o);
  if ((t >> 3) % 9 === 0) { c(22, 34, 2, 2, '#fff'); c(21, 35, 4, 1, '#fff'); } };
const GLOBEHI = (p, t, C) => { const { c, el } = p, A = C.a, M = C.c, B = ramp('#5a3a24');   // 64 × 100
  el(32, 94, 18, 5, B.o); el(32, 93, 17, 4, B.t); el(28, 92, 8, 1, B.l); c(29, 70, 6, 22, B.o); c(30, 70, 4, 22, B.t); c(30, 70, 1, 22, B.l); el(32, 80, 5, 3, B.o);
  el(32, 36, 25, 25, A.o); const sp = clipPen(p, yy => { const dy = yy - 36; if (Math.abs(dy) > 23) return null; const hw = Math.sqrt(23 * 23 - dy * dy); return [32 - hw, 32 + hw]; });
  const WM = ['................................', '.......####.......###...........', '..#######.##....##########.####.', '.#########......#############...', '..#######......############.##..', '...######......##########.......', '....###........####.#####.......', '.....##........#######..#.......', '......###......######...##......', '.......####.....####.....#......', '.......#####....####.....###....', '........###......##.....#####...', '........##..............####....', '........#.......................', '................................', '...######################.......'];
  const rot = (t / 40) % (Math.PI * 2), Rr = 23;
  for (let yy = -Rr; yy <= Rr; yy++) for (let xx = -Rr; xx <= Rr; xx++) { const d2 = xx * xx + yy * yy; if (d2 > Rr * Rr) continue; const z = Math.sqrt(Rr * Rr - d2), lat = Math.asin(yy / Rr), lon = Math.atan2(xx, z) + rot;
    const mx = Math.floor(((lon / (Math.PI * 2)) % 1 + 1) % 1 * 32), my = Math.min(15, Math.floor((lat / Math.PI + .5) * 16)), land = WM[my][mx] === '#', sh = (-xx * .5 - yy * .6 + z) / Rr;
    c(32 + xx, 36 + yy, 1, 1, land ? (sh > .9 ? '#a8d898' : sh > .45 ? '#79b26e' : '#4f8a55') : (sh > .9 ? A.l : sh > .45 ? A.t : A.f)); }
  sp.el(24, 26, 6, 5, 'rgba(255,255,255,.18)'); sp.el(22, 24, 2, 2, 'rgba(255,255,255,.35)');
  sp.c(8, 46, 48, 14, 'rgba(0,0,0,.18)'); sp.el(24, 26, 8, 7, 'rgba(255,255,255,.22)'); sp.el(22, 24, 3, 3, 'rgba(255,255,255,.35)');
  for (let a = -1.3; a < 4.45; a += .02) { const x = 32 + Math.round(Math.cos(a) * 28), y = 36 + Math.round(Math.sin(a) * 28); c(x - 1, y - 1, 3, 3, M.o); c(x, y, 1, 1, M.t); }
  c(30, 4, 4, 5, M.t); c(30, 62, 4, 10, M.o); c(31, 62, 2, 10, M.t); };
const TELESCOPEHI = (p, t, C) => { const { c, ln, el } = p, M = C.c, B = C.b;   // 64 × 120
  ln(32, 66, 10, 116, B.o, 4); ln(32, 66, 54, 116, B.o, 4); ln(32, 66, 32, 116, B.o, 4); ln(32, 66, 11, 115, B.t, 2); ln(32, 66, 53, 115, B.t, 2); ln(33, 66, 33, 115, B.l, 1);
  c(22, 96, 22, 3, B.o); el(32, 66, 6, 5, M.o); el(32, 66, 4, 4, M.t);
  for (let i = 0; i < 52; i++) { const x = 6 + i, y = 70 - Math.round(i * 1.05), r = i < 18 ? 4 : i < 36 ? 5 : 6; c(x, y - r, 2, r * 2, M.o); c(x, y - r + 1, 2, r * 2 - 2, M.t); c(x, y - r + 1, 2, 2, M.L); c(x, y + r - 3, 2, 1, M.f); if (i === 17 || i === 35) c(x, y - r - 1, 2, r * 2 + 2, M.d); }
  c(56, 6, 6, 18, M.o); c(57, 7, 4, 16, '#2a3a4a'); c(57, 8, 1, 4, '#8ab0d0'); c(2, 70, 6, 8, M.o); c(3, 71, 4, 6, M.t); };
const GRAMOPHONEHI = (p, t, C) => { const { c, el, ln } = p, M = C.c, B = C.b;   // 64 × 116
  c(2, 76, 60, 36, B.o); c(3, 77, 58, 34, B.t); c(3, 77, 58, 2, B.L); c(3, 77, 2, 34, B.l); c(57, 77, 4, 34, B.f); c(8, 86, 48, 20, B.f); c(9, 87, 46, 18, B.t); hgrain(p, 10, 89, 44, 14, B, 6);
  c(0, 70, 64, 8, B.o); c(1, 71, 62, 5, B.t); c(1, 71, 62, 1, B.L); [4, 54].forEach(x => c(x, 110, 6, 6, B.o));
  el(28, 70, 22, 5, '#141418'); el(28, 70, 20, 4, '#26262c'); el(28, 70, 14, 3, '#1a1a1e'); el(28, 70, 5, 2, '#a8344a'); c(28, 69, 1, 1, '#f4f0e8'); const sp = (t % 4); c(16 + sp * 4, 69, 3, 1, 'rgba(255,255,255,.25)');
  ln(50, 72, 40, 66, M.o, 3); ln(50, 72, 40, 66, M.t, 1); c(48, 70, 5, 5, M.o); c(49, 71, 3, 3, M.L);
  for (let i = 0; i < 40; i++) { const x = 46 - Math.round(i * .3), y = 64 - i, r = 2 + Math.round(Math.pow(i / 40, 2.2) * 22); el(x - Math.round(i * .25), y, r, Math.max(1, Math.round(r * .32)), i > 37 ? M.o : (i % 4 < 2 ? M.t : M.l)); }
  el(32, 22, 24, 9, M.o); el(32, 22, 23, 8, M.L); el(32, 23, 18, 6, M.t); el(33, 24, 11, 4, M.d); el(34, 25, 5, 2, '#3a2a10');
  const n = (t >> 2) % 3; [[6, 14 - n * 2], [12, 6 - n]].forEach(([x, y], i) => { if ((t + i) % 6 < 4) { c(x, y, 3, 3, '#f4f0e8'); c(x + 2, y - 6, 1, 7, '#f4f0e8'); c(x + 3, y - 6, 2, 2, '#f4f0e8'); } }); };
const EASELHI = (p, t, C) => { const { c, ln, el } = p, B = C.b, A = C.a;   // 64 × 140
  ln(32, 2, 32, 132, B.o, 4); ln(33, 2, 33, 132, B.f, 2);
  ln(22, 6, 8, 138, B.o, 5); ln(22, 6, 8, 138, B.t, 3); ln(21, 6, 7, 138, B.l, 1); ln(42, 6, 56, 138, B.o, 5); ln(42, 6, 56, 138, B.t, 3); ln(43, 6, 57, 138, B.L, 1);
  c(6, 92, 52, 6, B.o); c(7, 93, 50, 3, B.t); c(7, 93, 50, 1, B.L); c(26, 2, 12, 6, B.o); c(27, 3, 10, 3, B.t);
  c(6, 14, 52, 80, '#9a948a'); c(7, 15, 50, 78, '#f8f4ec');
  if (!hpic(p, 9, 17, 46, 74)) { c(9, 17, 46, 30, '#9ac8f0'); c(9, 17, 46, 10, '#b8dcf8'); el(44, 26, 5, 5, '#fff2a0'); for (let x = 9; x < 55; x++) { const h = Math.round(18 + 5 * Math.sin(x / 6)); c(x, 47 - h + 18, 1, h + 26, x % 9 < 4 ? A.t : A.l); } c(9, 72, 46, 19, A.f); el(22, 64, 6, 6, '#a8344a'); el(22, 63, 4, 4, '#d8607a'); el(38, 70, 4, 4, '#e0b050'); c(9, 17, 46, 1, 'rgba(0,0,0,.15)'); }
  el(16, 100, 9, 4, '#c8a878'); el(16, 99, 8, 3, '#e8d0a0'); [[11, 98, '#a8344a'], [15, 97, '#3a5a8a'], [19, 98, '#e0b050'], [22, 100, A.t]].forEach(([x, y, col]) => c(x, y, 3, 2, col)); c(46, 88, 10, 2, '#c8a878'); c(54, 86, 4, 4, '#2a2a2a'); };
const HARPHI = (p, t, C) => { const { c, ln, el } = p, M = C.c, B = C.b;   // 64 × 160
  for (let i = 0; i < 130; i++) { const y = 12 + i, x = 50 - Math.round(i * .26); c(x - 2, y, 9, 1, B.o); c(x - 1, y, 7, 1, B.t); c(x - 1, y, 2, 1, B.l); c(x + 4, y, 1, 1, B.f); }
  for (let i = 0; i <= 44; i++) { const x = 10 + i, y = 14 - Math.round(Math.sin(i / 44 * Math.PI) * 10) + Math.round(i * .1); c(x, y - 2, 2, 8, M.o); c(x, y - 1, 2, 5, M.t); c(x, y - 1, 2, 1, M.L); }
  for (let i = 0; i < 136; i++) { const x = 9 + Math.round(Math.sin(i / 136 * 2.6) * 4); c(x, 12 + i, 6, 1, M.o); c(x + 1, 12 + i, 4, 1, M.t); c(x + 1, 12 + i, 1, 1, M.L); }
  el(12, 10, 5, 5, M.o); el(12, 10, 4, 4, M.t); el(11, 9, 2, 2, M.L);
  for (let k = 0; k < 11; k++) { const x0 = 16 + k * 3, y0 = 14 - Math.round(Math.sin((x0 - 10) / 44 * Math.PI) * 10) + 4, x1 = 44 - Math.round((140 - y0) * 0) - k * .6; ln(x0, y0, Math.round(48 - (k * 2.6) - (k > 7 ? 2 : 0) - 26 + k * 2.2), 140 - k * 4, k % 7 === 0 ? 'rgba(220,60,60,.8)' : 'rgba(255,248,220,.8)', 1); }
  c(4, 146, 56, 10, B.o); c(5, 147, 54, 7, B.t); c(5, 147, 54, 1, B.L); c(6, 154, 8, 6, B.o); c(50, 154, 8, 6, B.o); };
const ARCHWINHI = (p, t, C) => { const { c } = p, A = C.a, F = C.b;   // 벽 · 128 × 180
  const ar = archRange(14, 6, 100, 166); clipPen(p, ar).c(14, 6, 100, 160, F.o); const ir = archRange(20, 12, 88, 160), sp = clipPen(p, ir);
  todSky(sp, t, 20, 12, 88, 148); sp.c(20, 12, 88, 3, 'rgba(0,0,0,.2)');
  sp.c(62, 12, 4, 148, F.t); sp.c(62, 12, 1, 148, F.L); [70, 116].forEach(y => { sp.c(20, y, 88, 4, F.t); sp.c(20, y, 88, 1, F.L); });
  sp.c(20, 54, 88, 4, F.t); sp.c(20, 54, 88, 1, F.L);
  sp.c(26, 64, 3, 20, 'rgba(255,255,255,.3)'); sp.c(30, 64, 2, 10, 'rgba(255,255,255,.2)');
  for (let yy = 6; yy < 60; yy++) { const r = ar(yy), r2 = ir(yy); if (!r) continue; if (r2) { c(r[0], yy, r2[0] - r[0], 1, F.t); c(r2[1], yy, r[1] - r2[1], 1, F.t); c(r2[0] - 1, yy, 1, 1, F.d); } else c(r[0], yy, r[1] - r[0], 1, F.t); }
  c(14, 60, 6, 106, F.t); c(108, 60, 6, 106, F.t); c(15, 60, 2, 106, F.L); c(112, 60, 1, 106, F.d);
  c(8, 160, 112, 10, F.o); c(9, 161, 110, 7, F.t); c(9, 161, 110, 2, F.L); c(10, 168, 108, 3, 'rgba(0,0,0,.25)');
  // 커튼 (기본 창문과 같은 모양 · 봉 고리에 매달림)
  hcurtain(p, 0, false, 8, 178, 118, 46, 18, 34, A, { rings: true }); hcurtain(p, 127, true, 8, 178, 118, 46, 18, 34, A, { rings: true });
  c(0, 2, 128, 4, '#3a2418'); c(1, 2, 126, 3, GOLD); c(1, 2, 126, 1, GOLD2); [[0, 1], [122, 1]].forEach(([x, y]) => { c(x - 1, y - 2, 7, 8, GOLDD); c(x, y - 1, 5, 6, GOLD); c(x + 1, y, 2, 2, GOLD2); }); };
const ROUNDWINHI = (p, t, C) => { const { c, el } = p, F = C.b;   // 벽 · 64 × 72
  el(32, 36, 31, 31, F.o); el(32, 36, 30, 30, F.t); el(30, 34, 27, 27, F.L); el(32, 36, 27, 27, F.t); el(32, 36, 24, 24, F.o);
  const sp = clipPen(p, yy => { const dy = yy - 36 + .5; if (Math.abs(dy) > 23) return null; const hw = Math.sqrt(23 * 23 - dy * dy); return [Math.round(32 - hw), Math.round(32 + hw)]; });
  todSky(sp, t, 9, 13, 46, 46); sp.c(30, 13, 4, 46, F.t); sp.c(30, 13, 1, 46, F.L); sp.c(9, 34, 46, 4, F.t); sp.c(9, 34, 46, 1, F.L);
  sp.c(16, 18, 3, 10, 'rgba(255,255,255,.35)'); sp.c(20, 17, 2, 5, 'rgba(255,255,255,.25)');
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + .39; c(32 + Math.round(Math.cos(a) * 28) - 1, 36 + Math.round(Math.sin(a) * 28) - 1, 3, 3, F.L); } };
const STAINEDHI = (p, t, C) => { const { c, el } = p, F = C.b, A = C.a, B = C.c;   // 벽 · 128 × 184
  const ar = archRange(14, 4, 100, 176); clipPen(p, ar).c(14, 4, 100, 172, F.o); const ir = archRange(20, 10, 88, 170), sp = clipPen(p, ir);
  const cols = [A.t, B.t, '#e0b050', '#4f8a55', A.l, B.l, '#9a68c8', A.d, B.d];
  for (let y = 10; y < 170; y += 12) for (let x = 20; x < 108; x += 11) { const off = (y / 12 | 0) % 2 ? 5 : 0, col = cols[hsh(x + off, y) % cols.length], R = ramp(col); sp.c(x + off - 5, y, 10, 11, R.t); sp.c(x + off - 5, y, 10, 2, R.l); sp.c(x + off - 5, y, 2, 3, 'rgba(255,255,255,.35)'); sp.c(x + off + 5, y, 1, 11, F.o); }
  for (let y = 10; y < 170; y += 12) sp.c(20, y + 11, 88, 1, F.o);
  el(64, 60, 26, 26, F.o); el(64, 60, 24, 24, '#ffe27a'); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; el(64 + Math.round(Math.cos(a) * 14), 60 + Math.round(Math.sin(a) * 14), 8, 8, F.o); el(64 + Math.round(Math.cos(a) * 14), 60 + Math.round(Math.sin(a) * 14), 6, 6, k % 2 ? A.t : B.t); el(62 + Math.round(Math.cos(a) * 14), 58 + Math.round(Math.sin(a) * 14), 2, 2, 'rgba(255,255,255,.4)'); }
  el(64, 60, 7, 7, F.o); el(64, 60, 5, 5, '#ffe27a'); el(63, 59, 2, 2, '#fff6c0');
  sp.c(62, 92, 4, 78, F.o); sp.c(20, 120, 88, 3, F.o);
  for (let k = 0; k < 4; k++) p.el(64, 100, 30 + k * 12, 40 + k * 10, 'rgba(255,230,160,.02)');
  c(8, 172, 112, 10, F.o); c(9, 173, 110, 6, F.t); c(9, 173, 110, 2, F.L); };
const TALLWINHI = (p, t, C) => { const { c } = p, A = C.a, F = C.b;   // 벽 · 128 × 168
  c(14, 6, 100, 150, F.o); c(16, 8, 96, 146, F.t); c(16, 8, 96, 3, F.L); todSky(p, t, 22, 14, 84, 136); c(22, 14, 84, 3, 'rgba(0,0,0,.25)');
  c(62, 14, 4, 136, F.t); c(62, 14, 1, 136, F.L); [58, 104].forEach(y => { c(22, y, 84, 4, F.t); c(22, y, 84, 1, F.L); }); c(28, 20, 3, 22, 'rgba(255,255,255,.3)');
  c(8, 152, 112, 10, F.o); c(9, 153, 110, 7, F.t); c(9, 153, 110, 2, F.L); c(10, 160, 108, 3, 'rgba(0,0,0,.25)');
  // 레이스 커튼 (기본 창문과 같은 모양 · 반투명 · 봉 고리에 매달림)
  hcurtain(p, 0, false, 6, 150, 100, 46, 18, 34, A, { rings: true, lace: true }); hcurtain(p, 127, true, 6, 150, 100, 46, 18, 34, A, { rings: true, lace: true });
  c(0, 0, 128, 5, '#3a2418'); c(1, 1, 126, 3, GOLD); c(1, 1, 126, 1, GOLD2); [[0, 0], [122, 0]].forEach(([x, y]) => { c(x, y - 2, 6, 9, GOLDD); c(x + 1, y - 1, 4, 7, GOLD); }); };
const GARLANDHI = (p, t, C) => { const { c } = p, M = C.c;   // 벽 · 128 × 48
  for (let x = 0; x < 128; x++) { const y = 4 + Math.round(12 * Math.sin(Math.PI * x / 127)); c(x, y, 1, 2, '#8a7a5a'); c(x, y, 1, 1, '#b0a080'); }
  const star = (x, y, col, R) => { for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k / 5 * Math.PI * 2; p.ln(x, y, x + Math.round(Math.cos(a) * 7), y + Math.round(Math.sin(a) * 7), R.o, 3); } for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k / 5 * Math.PI * 2; p.ln(x, y, x + Math.round(Math.cos(a) * 6), y + Math.round(Math.sin(a) * 6), col, 2); } p.el(x, y, 3, 3, col); p.c(x - 1, y - 2, 2, 2, R.L); };
  [[12, 12], [36, 20], [64, 24], [92, 20], [116, 12]].forEach(([x, y], i) => { const on = (t + i) % 3 !== 0, R = ramp(M.t); c(x, y - 4, 1, 4, '#8a7a5a'); if (on) for (let k = 3; k >= 1; k--) p.el(x, y + 6, 6 + k * 3, 6 + k * 3, 'rgba(255,230,140,.05)'); star(x, y + 7, on ? M.L : M.t, R); });
  [[24, 16], [50, 22], [78, 22], [104, 16]].forEach(([x, y], i) => { c(x, y, 3, 3, (t + i) % 2 ? '#f08ab0' : '#9ad0f0'); c(x + 1, y + 1, 1, 1, '#ffffff'); }); };


/* 인형: 모든 조각의 테두리를 먼저 그리고 그 위에 속을 칠해서, 조각끼리 맞닿는 곳엔 선이 없고 바깥 실루엣만 남게 해요 */
function hblob(p, L) { const { el, c } = p;
  L.forEach(([k, a, f, o]) => { if (o === 0) return; if (k === 'e') el(a[0], a[1], a[2] + 1, a[3] + 1, o || OL); else if (k === 'r') c(a[0] - 1, a[1] - 1, a[2] + 2, a[3] + 2, o || OL); else if (k === 'l') hleaf(p, a[0], a[1], a[2], a[3], a[4] + 2, { o: o || OL, l: o || OL, t: o || OL, f: o || OL }); });
  L.forEach(([k, a, f]) => { if (k === 'e') el(a[0], a[1], a[2], a[3], f); else if (k === 'r') c(a[0], a[1], a[2], a[3], f); else if (k === 'l') hleaf(p, a[0], a[1], a[2], a[3], a[4], { o: f, l: f, t: f, f: f }); }); }
function hface(p, x1, x2, y, b, cheek) {   // 반짝이는 동그란 눈 + 볼터치
  const { c, el } = p; if (b) { [x1, x2].forEach(x => { c(x - 2, y, 5, 1, '#2a1a14'); c(x - 3, y - 1, 1, 1, '#2a1a14'); c(x + 3, y - 1, 1, 1, '#2a1a14'); }); }
  else [x1, x2].forEach(x => { el(x, y, 2, 3, '#2a1a14'); c(x - 1, y - 2, 2, 2, '#ffffff'); c(x + 1, y + 1, 1, 1, '#c8c0d0'); });
  if (cheek) { el(x1 - 4, y + 5, 3, 2, cheek); el(x2 + 4, y + 5, 3, 2, cheek); } }
const TEDDYHI = (p, t, C) => { const { c, el } = p, A = C.a, R = C.c, bl = (t % 37) < 2, O = A.o;   // 64 × 68
  hblob(p, [['e', [19, 11, 6, 6], A.t, O], ['e', [45, 11, 6, 6], A.t, O], ['e', [32, 50, 17, 15], A.t, O], ['e', [19, 61, 8, 5], A.t, O], ['e', [45, 61, 8, 5], A.t, O],
    ['e', [19, 48, 5, 8], A.t, O], ['e', [45, 48, 5, 8], A.t, O], ['e', [32, 23, 17, 15], A.t, O]]);
  el(18, 9, 3, 2, A.f); el(46, 9, 3, 2, A.f); el(32, 53, 11, 9, A.l); el(32, 54, 9, 7, A.L);
  el(19, 62, 5, 3, A.L); el(45, 62, 5, 3, A.L); el(19, 62, 2, 1, A.f); el(45, 62, 2, 1, A.f);
  c(23, 43, 1, 12, A.f); c(40, 43, 1, 12, A.f); el(18, 45, 2, 4, A.l); el(44, 45, 2, 4, A.l); el(19, 54, 3, 2, A.L); el(45, 54, 3, 2, A.L);
  el(26, 16, 7, 4, A.l); el(32, 30, 8, 6, A.L); el(32, 37, 12, 1, A.f);
  hface(p, 25, 39, 21, bl, 'rgba(240,120,120,.35)'); el(32, 27, 3, 2, '#3a2418'); c(31, 29, 2, 2, '#3a2418'); c(29, 31, 3, 1, '#3a2418'); c(33, 31, 3, 1, '#3a2418');
  el(25, 40, 6, 4, R.t); el(39, 40, 6, 4, R.t); el(24, 39, 2, 1, R.L); el(40, 39, 2, 1, R.L); el(32, 40, 3, 3, R.f); c(26, 42, 3, 1, R.f); c(35, 42, 3, 1, R.f); };
const BUNNYHI = (p, t, C) => { const { c, el } = p, A = C.a, R = C.c, bl = (t % 41) < 2, O = A.o, fl = (t >> 3) % 2;   // 64 × 80
  hblob(p, [['l', [25, 34, 18, 2, 12], A.t, O], ['l', [39, 34, 50 + fl, 6, 12], A.t, O], ['e', [32, 62, 16, 15], A.t, O], ['e', [49, 69, 6, 5], '#ffffff', O],
    ['e', [22, 76, 8, 5], A.t, O], ['e', [42, 76, 8, 5], A.t, O], ['e', [21, 59, 4, 8], A.t, O], ['e', [43, 59, 4, 8], A.t, O], ['e', [32, 39, 17, 14], A.t, O]]);
  hleaf(p, 24, 32, 19, 6, 5, { o: '#f4b8c8', l: '#f4b8c8', t: '#f4b8c8', f: '#f4b8c8' }); hleaf(p, 40, 32, 48 + fl, 10, 5, { o: '#f4b8c8', l: '#f4b8c8', t: '#f4b8c8', f: '#f4b8c8' });
  el(32, 66, 9, 8, A.L); el(22, 77, 4, 2, '#f4b8c8'); el(42, 77, 4, 2, '#f4b8c8'); c(24, 54, 1, 11, A.f); c(39, 54, 1, 11, A.f);
  el(27, 34, 7, 4, A.L); el(32, 51, 11, 1, A.f);
  hface(p, 25, 39, 38, bl, 'rgba(240,120,140,.4)'); el(32, 43, 2, 1, '#e87890'); c(31, 45, 1, 1, '#3a2418'); c(29, 46, 2, 1, '#3a2418'); c(33, 46, 2, 1, '#3a2418');
  el(25, 53, 6, 3, R.t); el(39, 53, 6, 3, R.t); el(24, 52, 2, 1, R.L); el(32, 53, 3, 3, R.f); };
const PDOLLHI = (p, t, C) => { const { c, el } = p, A = C.a, H = C.b, F = ramp('#f8ece4'), bl = (t % 31) < 2;   // 64 × 88
  // 종 모양 치마: 밑단은 식탁보처럼 둥근 호 (가운데가 가장 낮고 양옆이 올라감)
  const skirt = y => Math.round(9 + 15 * Math.sqrt(Math.min(1, y / 24))), HW = 24, hem = x => 80 + Math.round(4 * Math.sqrt(Math.max(0, 1 - Math.pow(x / (HW + 1), 2))));
  for (let y = 0; y <= 28; y++) { const hw = skirt(y) + 1; for (let x = -hw; x < hw; x++) if (57 + y <= hem(x) + 1) c(32 + x, 57 + y, 1, 1, A.o); }
  hblob(p, [['e', [32, 34, 15, 15], H.t, H.o], ['r', [25, 46, 14, 13], A.t, A.o], ['e', [32, 31, 13, 13], F.t, H.o], ['e', [32, 22, 14, 9], H.t, H.o]]);
  for (let y = 0; y <= 27; y++) { const hw = skirt(y); for (let x = -hw; x < hw; x++) { if (57 + y > hem(x)) continue; const k = (x + hw) / (hw * 2), f = Math.sin(k * Math.PI * 7);
      c(32 + x, 57 + y, 1, 1, 57 + y === hem(x) ? A.d : k < .12 ? A.l : k > .88 ? A.f : f > .5 ? A.l : f > -.4 ? A.t : A.f); } }
  for (let x = -HW + 2; x < HW - 2; x += 4) { const y = hem(x + 2); el(32 + x + 2, y + 2, 2, 2, '#e8dcc8'); el(32 + x + 2, y + 1, 2, 2, '#fff8ec'); c(32 + x, y - 1, 4, 1, '#fff8ec'); }
  c(24, 56, 16, 3, '#fff8ec'); c(24, 58, 16, 1, '#e8dcc8'); el(32, 57, 3, 2, A.d); c(31, 58, 2, 4, A.d);
  c(26, 47, 12, 9, A.t); c(26, 47, 2, 9, A.l); c(36, 47, 2, 9, A.f); el(32, 47, 6, 2, '#fff8ec'); el(32, 48, 1, 1, GOLD);
  [[24, 52, -1], [40, 52, 1]].forEach(([x, y, d]) => { c(x - 2, y - 5, 4, 11, A.t); c(x + (d < 0 ? -2 : 1), y - 5, 1, 11, A.f); el(x, y + 7, 2, 2, F.t); el(x, y + 5, 3, 1, '#fff8ec'); });
  // 뒷머리 웨이브 (얼굴 양옆으로만 살짝)
  for (let i = 0; i < 4; i++) { el(19, 30 + i * 5, 2, 2, H.l); el(45, 30 + i * 5, 2, 2, H.l); el(19, 32 + i * 5, 2, 1, H.f); el(45, 32 + i * 5, 2, 1, H.f); }
  el(28, 28, 5, 4, F.L);
  // 앞머리 (얼굴 위를 덮는 둥근 머리 + 끝이 갈라진 앞머리)
  el(32, 22, 13, 7, H.t); el(28, 19, 6, 3, H.l); el(27, 18, 3, 1, H.L);
  for (let x = 20; x < 45; x++) { const d = 2 + Math.round(Math.abs(Math.sin((x - 20) / 25 * Math.PI * 3)) * 3); c(x, 26, 1, d, H.t); c(x, 26 + d, 1, 1, H.f); }
  // 헤드드레스: 주름 레이스 띠 + 리본
  for (let x = 18; x < 47; x++) { const y = 14 + Math.round(Math.pow((x - 32) / 14, 2) * 4); c(x, y - 2, 1, 5, '#e8dcc8'); c(x, y - 1, 1, 3, '#fff8ec'); if (x % 3 === 0) c(x, y - 3, 1, 2, '#fff8ec'); }
  for (let x = 19; x < 46; x += 3) { const y = 14 + Math.round(Math.pow((x - 32) / 14, 2) * 4); c(x, y, 1, 1, '#d8ccb8'); }
  el(42, 15, 4, 3, A.o); el(50, 17, 4, 3, A.o); el(42, 15, 3, 2, A.t); el(50, 17, 3, 2, A.t); c(45, 14, 4, 5, A.o); c(46, 15, 2, 3, A.l); c(47, 19, 2, 5, A.t); c(49, 19, 2, 4, A.f);
  hface(p, 27, 37, 32, bl, 'rgba(240,120,140,.45)'); el(32, 38, 2, 1, '#d8607a'); };
const SHEEPHI = (p, t, C) => { const { c, el } = p, A = C.a, B = C.b, M = C.c, bl = (t % 43) < 2;   // 64 × 64
  const puffs = []; for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; puffs.push(['e', [30 + Math.round(Math.cos(a) * 19), 39 + Math.round(Math.sin(a) * 12), 8, 7], A.l, A.d]); }
  hblob(p, [['r', [14, 50, 5, 10], B.t, B.o], ['r', [25, 52, 5, 9], B.t, B.o], ['r', [36, 52, 5, 9], B.t, B.o], ['r', [46, 50, 5, 10], B.t, B.o], ...puffs, ['e', [30, 39, 19, 12], A.l, 0],
    ['e', [40, 25, 5, 3], B.t, B.o], ['e', [60, 25, 5, 3], B.t, B.o], ['e', [50, 29, 10, 9], B.t, B.o], ['e', [44, 19, 5, 5], A.l, A.d], ['e', [50, 17, 5, 5], A.l, A.d], ['e', [56, 19, 5, 5], A.l, A.d]]);
  puffs.forEach(([, a], k) => { if (k > 8 || k < 3) el(a[0] - 2, a[1] - 2, 3, 2, A.L); }); el(24, 33, 8, 4, A.L); el(30, 46, 14, 3, A.t);
  c(15, 58, 3, 2, B.f); c(26, 59, 3, 2, B.f); c(37, 59, 3, 2, B.f); c(47, 58, 3, 2, B.f); el(47, 25, 4, 2, B.l); el(40, 25, 3, 1, B.L); el(60, 25, 3, 1, B.L);
  [45, 53].forEach(x => { if (bl) c(x - 1, 30, 5, 1, '#f8f4ec'); else { c(x - 1, 27, 5, 6, '#f8f4ec'); c(x, 28, 3, 4, '#2a1a14'); c(x, 28, 1, 1, '#ffffff'); c(x + 2, 31, 1, 1, '#c8c0d0'); } el(x - 1 + (x < 50 ? -2 : 5), 34, 2, 1, 'rgba(240,140,150,.5)'); }); c(49, 34, 3, 1, '#e8a0a8');
  c(44, 38, 12, 3, '#a8344a'); el(50, 43, 4, 4, M.o); el(50, 43, 3, 3, M.t); el(49, 42, 1, 1, M.L); c(49, 45, 3, 1, M.d); };
const OWLHI = (p, t, C) => { const { c, el } = p, A = C.a, M = C.c, bl = (t % 29) < 2, O = A.o, W = ramp(A.f);   // 64 × 72
  hblob(p, [['l', [23, 25, 18, 15, 6], A.t, O], ['l', [41, 25, 46, 15, 6], A.t, O], ['e', [32, 44, 21, 25], A.t, O], ['e', [15, 47, 5, 13], A.f, O], ['e', [49, 47, 5, 13], A.f, O],
    ['e', [24, 69, 5, 3], '#e0a040', '#a07028'], ['e', [40, 69, 5, 3], '#e0a040', '#a07028']]);
  el(32, 52, 15, 15, A.L); for (let y = 44; y < 64; y += 5) for (let x = 22 + ((y / 5) % 2) * 2; x < 42; x += 5) { c(x, y, 3, 1, A.l); c(x + 1, y + 1, 1, 1, A.l); }
  el(15, 45, 2, 7, A.t); el(49, 45, 2, 7, A.t); for (let i = 0; i < 3; i++) { c(12, 49 + i * 4, 5, 1, W.f); c(47, 49 + i * 4, 5, 1, W.f); } 
  // 동그랗고 순한 얼굴판 + 반짝이는 눈
  el(24, 31, 10, 9, A.l); el(40, 31, 10, 9, A.l); el(32, 33, 4, 4, A.l); el(24, 31, 8, 7, A.L); el(40, 31, 8, 7, A.L);
  if (bl) { [24, 40].forEach(x => { c(x - 4, 32, 9, 2, '#2a1a14'); }); } else [24, 40].forEach(x => { el(x, 32, 5, 5, '#2a1a14'); el(x - 1, 31, 4, 4, '#3a2418'); c(x - 2, 29, 3, 3, '#ffffff'); c(x + 2, 34, 1, 1, '#ffffff'); });
  el(19, 39, 3, 2, 'rgba(240,120,120,.35)'); el(45, 39, 3, 2, 'rgba(240,120,120,.35)');
  el(32, 38, 3, 3, '#e0a040'); c(31, 40, 2, 2, '#c08030');
  // 학사모
  c(20, 13, 24, 4, M.o); c(21, 13, 22, 3, M.t); c(21, 13, 22, 1, M.l); c(25, 16, 14, 6, M.o); c(26, 16, 12, 5, M.t); c(31, 11, 3, 3, M.f); c(32, 14, 1, 2, GOLD);
  const sw = Math.round(Math.sin(t / 4)); c(41, 15, 1, 8 + sw, GOLD); c(40, 23 + sw, 3, 3, GOLD); c(40, 25 + sw, 3, 1, GOLDD); };

/* ── 천개 침대 · 고딕 (고해상도) ── */
function hpanel(p, x, y, w, h, A, seed) { const { c } = p; for (let i = 0; i < w; i++) { const f = (i + (seed || 0)) % 9; c(x + i, y, 1, h, f < 2 ? A.f : f < 5 ? A.t : f < 7 ? A.l : A.d); } c(x, y, 1, h, A.o); c(x + w - 1, y, 1, h, A.o); }
function hscallop(p, x, y, w, A, M) { const { c, el } = p; c(x, y, w, 8, A.o); c(x, y + 1, w, 6, A.t); c(x, y + 1, w, 2, A.l); for (let k = x; k < x + w; k += 12) { el(k + 6, y + 8, 6, 5, A.o); el(k + 6, y + 7, 5, 4, A.t); el(k + 6, y + 6, 3, 1, A.l); if (M) c(k + 5, y + 11, 2, 3, M.t); } if (M) { c(x, y + 1, w, 1, M.t); c(x, y, w, 1, M.L); } }
const CANOPYHI = (p, t, C) => { const { c, orr, el } = p, A = C.a, B = C.b, S = C.c, M = ramp(GOLD);   // 192 × 300
  /* 투시: 바닥 3칸 = 세로 192. 뒤 바닥선 y=108, 앞 바닥선 y=300. 지붕 높이 108.
     → 뒤 가로대 y≈0, 앞 가로대 y≈192. 기둥은 화면에서 수직선.
     옆면 커튼은 시선과 나란한 면이라 얇은 띠로만 보이고, 뒤 커튼·머리판은 지붕 천에 가려져요.
     지붕 앞 가장자리 아래로 침대 발치가 보이고, 앞 커튼은 앞 가로대에서 바닥까지 내려와 앞 기둥에 묶여요. */
  BEDHI.front(p.sub(32, 76), t, C);
  c(10, 192, 172, 26, 'rgba(20,8,20,.45)'); c(10, 218, 172, 14, 'rgba(20,8,20,.22)');   // 지붕 아래 그늘
  // 지붕 천 (가운데로 모이는 주름 + 장식 단추)
  for (let y = 10; y < 192; y++) for (let x = 4; x < 188; x++) { const dx = (x - 96) / 92, dy = (y - 100) / 90, d = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx), f = Math.sin(a * 8) * .35 * Math.min(1, d * 2) + (1 - d) * .6;
    c(x, y, 1, 1, f > .5 ? A.l : f > .15 ? A.t : f > -.15 ? A.f : A.d); }
  c(4, 10, 184, 4, 'rgba(0,0,0,.2)'); el(96, 100, 7, 5, M.o); el(96, 100, 6, 4, M.t); el(94, 99, 2, 1, M.L);
  // 옆면 커튼 (옆 틀에서 바닥까지, 시선과 나란해서 얇은 띠 + 주름 볼록)
  [[8, 1], [176, -1]].forEach(([x0, d]) => { for (let y = 10; y < 298; y++) { const w = 6 + Math.round((Math.sin(y / 9) + 1) * 2); for (let i = 0; i < w; i++) { const xx = d > 0 ? x0 + i : x0 + 7 - i + 1; c(xx, y, 1, 1, i === w - 1 ? A.o : i < 2 ? A.f : (i + (y >> 3)) % 3 ? A.t : A.l); } } });
  // 앞 커튼 (기본 창문과 같은 모양): 앞 가로대에서 바닥까지, 앞 기둥 쪽으로 묶임
  hcurtain(p, 10, false, 194, 298, 252, 56, 14, 26, A, { noTie: true }); hcurtain(p, 181, true, 194, 298, 252, 56, 14, 26, A, { noTie: true });
  [[10, false], [181, true]].forEach(([ox, mir]) => { const x = mir ? ox - 13 : ox + 1; c(x, 249, 12, 6, M.o); c(x + 1, 250, 10, 4, M.t); c(x + 1, 250, 10, 1, M.L); c(x + 4, 255, 4, 9, M.t); c(x + 3, 263, 6, 3, M.f); });
  // 기둥 (가늘게) · 뒤 가로대 · 앞 가로대 + 주름 장식
  [4, 182].forEach(x => { orr(x, 4, 6, 296, B.t, B.o, 1); c(x + 1, 6, 1, 292, B.L); c(x + 4, 6, 1, 292, B.d); el(x + 3, 3, 4, 4, B.o); el(x + 3, 3, 3, 3, B.t); c(x + 2, -3, 2, 4, M.t); });
  orr(0, 4, 192, 7, B.t, B.o, 2); c(3, 5, 186, 1, B.L); hscallop(p, 6, 10, 180, A, M);
  orr(0, 186, 192, 7, B.t, B.o, 2); c(3, 187, 186, 1, B.L); hscallop(p, 6, 192, 180, A, M);
};
const CHANDEFLOORHI = (p, t, C) => { const { c, el, ln } = p, M = C.c;   // 64 × 116
  [[14, 114], [50, 114], [32, 112]].forEach(([x, y]) => { ln(32, 98, x, y, M.o, 4); ln(32, 98, x, y, M.t, 2); el(x, y, 3, 2, M.o); });
  c(29, 40, 6, 60, M.o); c(30, 40, 4, 60, M.t); c(30, 40, 1, 60, M.L); [52, 70, 88].forEach(y => { el(32, y, 5, 3, M.o); el(32, y, 4, 2, M.t); c(30, y - 1, 2, 1, M.L); });
  for (let i = 0; i <= 18; i++) { const y = 40 - Math.round(Math.sin(i / 18 * Math.PI) * 6); c(13 + i, y + 6, 2, 3, M.o); c(32 + i, y + 6, 2, 3, M.o); c(13 + i, y + 6, 2, 1, M.L); c(32 + i, y + 6, 2, 1, M.L); }
  [[13, 42], [32, 34], [51, 42]].forEach(([x, y], i) => { el(x, y + 3, 6, 2, M.o); el(x, y + 2, 5, 1, M.t); c(x - 3, y - 18, 7, 20, '#f4f0e8'); c(x - 3, y - 18, 2, 20, '#ffffff'); c(x + 2, y - 18, 2, 20, '#d8d0c0'); c(x - 1, y - 6, 2, 6, '#ece4d4'); hflame(p, x, y - 19, t, i); }); };
const RAVENHI = (p, t, C) => { const { c, el, ln } = p, B = C.b, A = C.a, tilt = (t >> 4) % 3 === 0 ? -1 : 0, bl = (t % 27) < 2;   // 64 × 144 · 날씬한 까마귀
  el(32, 140, 18, 4, B.o); el(32, 139, 17, 3, B.t); c(29, 60, 6, 80, B.o); c(30, 60, 4, 80, B.t); c(30, 60, 1, 80, B.l); c(8, 56, 48, 6, B.o); c(9, 57, 46, 3, B.t); c(9, 57, 46, 1, B.L); el(8, 59, 3, 3, B.o); el(56, 59, 3, 3, B.o);
  const R = ramp(A.t), sh = '#3a4a6a', O = '#0c0c12';
  hblob(p, [['l', [6, 66, 30, 46, 8], A.t, O], ['l', [18, 56, 46, 30, 15], A.t, O], ['e', [46 + tilt, 25, 7, 7], A.t, O], ['l', [16, 52, 40, 36, 9], R.f, O]]);
  for (let i = 0; i < 5; i++) c(24 + i * 3, 46 - i * 2, 6, 1, sh); c(42 + tilt, 22, 4, 1, sh); c(20, 50, 16, 1, R.l);
  for (let i = 0; i < 10; i++) c(52 + tilt + i, 25 + Math.round(i * .25), 1, 4 - Math.round(i * .3), i < 2 ? '#2a2a32' : '#3a3a44'); c(53 + tilt, 25, 8, 1, '#5a5a66');
  if (bl) c(46 + tilt, 23, 3, 1, '#8a8a96'); else { c(46 + tilt, 22, 3, 3, '#e8e0c8'); c(47 + tilt, 23, 2, 2, '#141418'); c(47 + tilt, 22, 1, 1, '#ffffff'); }
  [[30, 52], [36, 50]].forEach(([x, y]) => { c(x, y, 1, 5, '#3a3a44'); c(x - 2, y + 4, 5, 1, '#3a3a44'); }); };
const ANTLERSHI = (p, t, C) => { const { c, el } = p, B = C.b, A = C.a, AO = ramp(A.t).o;   // 벽 · 128 × 88
  // 굵기가 줄어드는 곡선 (2차 베지어). 테두리를 먼저 모두 그리고 속을 칠해 이음매가 보이지 않게
  const curves = [], beam = (x0, y0, x1, y1, x2, y2, r0, r1) => curves.push([x0, y0, x1, y1, x2, y2, r0, r1]);
  [-1, 1].forEach(s => { const X = v => 64 + s * v;
    beam(X(7), 41, X(30), 40, X(40), 8, 2.6, 1);            // 주 줄기: 판 위에서 시작해 옆으로 나갔다가 위로 휨
    beam(X(17), 39, X(14), 28, X(16), 14, 1.7, .7);         // 이마 쪽 가지
    beam(X(30), 31, X(28), 18, X(30), 4, 1.6, .7);          // 가운데 가지
    beam(X(37), 20, X(46), 14, X(50), 3, 1.3, .6);          // 바깥 가지
  });
  const walk = (cb) => curves.forEach(([x0, y0, x1, y1, x2, y2, r0, r1]) => { for (let i = 0; i <= 40; i++) { const u = i / 40, x = (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * x1 + u * u * x2, y = (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * y1 + u * u * y2, r = r0 + (r1 - r0) * u; cb(x, y, r, u); } });
  // 판을 먼저 그리고, 뿔은 판 윗선(y 44) 위에만
  const plaque = () => { for (let y = 0; y < 42; y++) { const hw = Math.round(20 * Math.sqrt(Math.max(0, 1 - Math.pow(Math.max(0, y - 18) / 24, 2)))); if (hw < 1) continue; c(64 - hw, 44 + y, hw * 2, 1, B.o); if (hw > 2) { c(64 - hw + 2, 44 + y, hw * 2 - 4, 1, y < 3 ? B.L : B.t); c(64 - hw + 2, 44 + y, 3, 1, B.l); c(60 + hw - 3, 44 + y, 2, 1, B.f); } }
    hgrain(p, 50, 50, 28, 26, B, 7, true, 70); el(64, 46, 9, 3, B.o); el(64, 45, 8, 2, ramp(A.t).f); };
  plaque();
  walk((x, y, r) => el(Math.round(x), Math.round(y), Math.round(r + 1), Math.round(r + 1), AO));
  walk((x, y, r, u) => { el(Math.round(x), Math.round(y), Math.max(1, Math.round(r)), Math.max(1, Math.round(r)), u > .85 ? A.L : A.t); if (r > 1.5) c(Math.round(x - r * .4), Math.round(y - r * .5), 1, 1, A.L); });
};
const CHANDELIERHI = (p, t, C) => { const { c, el, ln } = p, M = C.c;   // 벽(천장) · 128 × 104
  for (let k = 4; k >= 1; k--) el(64, 66, 40 + k * 8, 22 + k * 6, 'rgba(255,220,140,.035)');
  for (let y = 0; y < 30; y += 4) { c(62, y, 4, 3, M.o); c(63, y, 2, 2, M.t); }
  el(64, 34, 8, 6, M.o); el(64, 34, 7, 5, M.t); el(62, 32, 3, 2, M.L); c(62, 38, 4, 30, M.o); c(63, 38, 2, 30, M.t);
  el(64, 70, 22, 6, M.o); el(64, 70, 21, 5, M.t); el(64, 68, 16, 2, M.L); el(64, 76, 8, 5, M.o); el(64, 76, 7, 4, M.t); c(63, 80, 2, 8, M.t); el(64, 90, 3, 4, '#c8e8f8'); el(63, 89, 1, 2, '#ffffff');
  const arms = [[14, 46], [34, 40], [64, 36], [94, 40], [114, 46]];
  arms.forEach(([x, y]) => { for (let i = 0; i <= 20; i++) { const u = i / 20, xx = Math.round(64 + (x - 64) * u), yy = Math.round(70 + (y + 10 - 70) * u + Math.sin(u * Math.PI) * 8); c(xx - 1, yy - 1, 3, 3, M.o); c(xx, yy, 1, 1, M.L); } });
  for (let x = 30; x < 100; x += 6) { const y = 76 + Math.round(Math.sin((x - 30) / 70 * Math.PI) * 6); c(x, y, 1, 4, '#c8e8f8'); el(x, y + 6, 2, 3, '#c8e8f8'); c(x - 1, y + 5, 1, 1, '#ffffff'); }
  arms.forEach(([x, y], i) => { el(x, y + 10, 6, 2, M.o); el(x, y + 9, 5, 1, M.t); c(x - 3, y - 6, 6, 15, '#f4f0e8'); c(x - 3, y - 6, 2, 15, '#ffffff'); c(x + 1, y - 6, 2, 15, '#d8d0c0'); hflame(p, x, y - 7, t, i); }); };

/* 드레스 폼 상의: 어깨선이 비스듬한 몸판 + 둥근 퍼프소매 (scoop=둥근 목선 깊이) */
function hbodice(p, A, F, scoop, cuff) { const { c } = p;
  // 어깨 반폭 13 → 허리 반폭 11 로 살짝 좁아지는 몸판
  const SW = 13, bw = y => Math.round(SW - Math.max(0, y - 18) / 16 * 2);
  const topY = x => { const ax = Math.abs(x); let y = 17 + Math.round(Math.max(0, ax - 6) * .3); if (ax < 6) y = 17 + Math.round(scoop * Math.sqrt(1 - Math.pow(ax / 6, 2))); return y; };
  for (let x = -SW; x <= SW; x++) { const y0 = topY(x); c(32 + x, y0 - 1, 1, 1, A.o); for (let y = y0; y < 35; y++) { const w = bw(y); if (Math.abs(x) > w) continue; const k = (x + w) / (w * 2); c(32 + x, y, 1, 1, Math.abs(x) === w ? A.o : y === y0 ? A.L : k < .12 ? A.l : k > .88 ? A.f : A.t); } }
  // 퍼프소매 (작게): 어깨 끝에서 이어져 시작
  const sy = topY(SW);
  [-1, 1].forEach(d => { const rows = [];
    for (let y = sy - 1; y <= 29; y++) { const u = (y - sy + 1) / (30 - sy), hw = Math.round(2 + 2.8 * Math.sin(Math.PI * Math.min(1, u * 1.05))), cx = 32 + d * Math.round(SW + u * 2); rows.push([y, cx, hw]); }
    const inside = (x, y) => Math.abs(x - 32) <= SW && y < topY(x - 32) - 1;
    rows.forEach(([y, cx, hw]) => { for (let x = cx - hw - 1; x < cx + hw + 1; x++) if (!inside(x, y)) c(x, y, 1, 1, A.o); });
    rows.forEach(([y, cx, hw], i) => { for (let x = -hw; x < hw; x++) { if (inside(cx + x, y)) continue; const k = (x + hw) / (hw * 2); c(cx + x, y, 1, 1, i >= rows.length - 2 ? (cuff || A.d) : i < 2 ? A.L : (d < 0 ? k < .35 : k > .65) ? A.f : (x + 9) % 3 === 0 ? A.f : A.t); } }); });
  return topY; }
const MANNEQUINHI = (p, t, C) => { const { c, el, ln } = p, A = C.a, B = C.b, D = C.c, F = ramp('#e8d4b8');   // 64 × 136 · 드레스 폼에 입힌 세일러 칼라 원피스
  // 아래: 돌린 나무 받침 기둥 + 휘어진 세 발
  [[-1, 1], [1, 1]].forEach(([d]) => { for (let i = 0; i <= 14; i++) { const x = 32 + d * Math.round(3 + i * .9 + Math.pow(i / 14, 2) * 5), y = 122 + Math.round(Math.sin(i / 14 * Math.PI * .5) * 10); c(x - 2, y - 1, 4, 3, B.o); c(x - 1, y, 2, 1, i < 7 ? B.l : B.t); } });
  c(30, 124, 4, 10, B.o); c(31, 124, 2, 9, B.t);
  for (let y = 92; y < 126; y++) { const u = (y - 92) / 34, hw = Math.round(2 + Math.abs(Math.sin(u * Math.PI * 2.2)) * 3 + (u > .85 ? 2 : 0)); c(32 - hw - 1, y, hw * 2 + 2, 1, B.o); c(32 - hw, y, hw * 2, 1, B.t); c(32 - hw, y, 1, 1, B.L); c(31 + hw, y, 1, 1, B.f); }
  // 위: 나무 꼭지 + 몸통 폼(목 → 어깨)
  el(32, 4, 4, 4, B.o); el(32, 4, 3, 3, B.t); el(31, 3, 1, 1, B.L); c(30, 7, 4, 4, B.o); c(31, 7, 2, 4, B.t); el(32, 12, 6, 2, B.o); el(32, 12, 5, 1, B.t);
  for (let y = 0; y < 7; y++) { const hw = Math.min(6, Math.round(4 + y * .5)); c(32 - hw - 1, 13 + y, hw * 2 + 2, 1, F.o); c(32 - hw, 13 + y, hw * 2, 1, y < 2 ? F.L : F.t); c(32 - hw, 13 + y, 2, 1, F.l); c(30 + hw, 13 + y, 2, 1, F.f); }
  // 상의: 네모난 몸판 + 짧은 퍼프소매(납작하게 옆으로) · 가운데 단추
  const topY = hbodice(p, A, F, 2, D.t);
  // 세일러 칼라: 바깥선은 어깨 끝(±15)에서, 안쪽선은 목 옆(±6)에서 시작해 가슴 가운데 한 점으로 모이는 넓은 V
  const ho = y => 13 * (32 - y) / (32 - topY(13)), hi = y => Math.max(0, 5 * (28 - y) / 11);
  for (let x = -13; x <= 13; x++) for (let y = topY(x); y < 33; y++) { const ax = Math.abs(x) + .5; if (Math.abs(x) > Math.round(13 - Math.max(0, y - 18) / 16 * 2) - 1) continue;
    if (ax < hi(y)) c(32 + x, y, 1, 1, y < 22 ? (y < 19 ? F.f : F.t) : y === 23 ? D.t : A.t);
    else if (ax < ho(y)) c(32 + x, y, 1, 1, ramp(A.t).d); }
  [-1, 1].forEach(d => { const X = v => 32 + d * v - (d > 0 ? 1 : 0);
    ln(X(13), topY(13), X(0), 32, A.o, 1); ln(X(10.5), topY(11) + 1, X(0), 29, D.t, 1); ln(X(5), 17, X(0), 28, A.o, 1); });

  // 치마: 허리에서 A라인으로 넓게, 밑단은 둥근 호
  const top = 35, H = 54, hw = y => Math.round(11 + 19 * Math.pow(y / H, .85)), hem = x => top + H + Math.round(3 * Math.sqrt(Math.max(0, 1 - Math.pow(x / 31, 2))));
  for (let y = 0; y <= H + 4; y++) { const w = hw(Math.min(y, H)) + 1; for (let x = -w; x < w; x++) if (top + y <= hem(x) + 1) c(32 + x, top + y, 1, 1, A.o); }
  for (let y = 0; y <= H + 3; y++) { const w = hw(Math.min(y, H)); for (let x = -w; x < w; x++) { const yy = top + y; if (yy > hem(x)) continue; const k = (x + w) / (w * 2);
      c(32 + x, yy, 1, 1, yy >= hem(x) - 3 ? A.f : k < .1 ? A.l : k > .9 ? A.f : y < 3 ? A.L : A.t); } }
  // 주름 치마: 허리에서 퍼지는 주름선 (밝은 면 · 그늘)
  for (let k = -5; k <= 5; k++) for (let y = 2; y < H + 3; y++) { const w = hw(Math.min(y, H)), x = Math.round(k / 5.5 * w), yy = top + y; if (yy >= hem(x) - 1) continue; c(32 + x, yy, 1, 1, A.d); c(33 + x, yy, 1, 1, A.l); }
  // 밑단 흰 줄 두 개 (밑단 곡선을 따라)
  for (let x = -29; x < 29; x++) { const y = hem(x); c(32 + x, y - 5, 1, 1, D.t); c(32 + x, y - 8, 1, 1, D.t); }
  c(21, 34, 22, 2, A.d); c(21, 34, 22, 1, A.f);
  // 빨간 리본: V 아래 끝에 고리 두 개 + 매듭 + 늘어진 끝
  const Rr = ramp('#c83040'); [[-1], [1]].forEach(([d]) => { el(32 + d * 4, 31, 3, 2, Rr.o); el(32 + d * 4, 31, 2, 1, Rr.t); c(32 + d * 4 - (d > 0 ? 1 : 0), 30, 1, 1, Rr.L); });
  c(30, 29, 4, 4, Rr.o); c(31, 30, 2, 2, Rr.l); ln(31, 33, 29, 40, Rr.o, 2); ln(33, 33, 35, 40, Rr.o, 2); ln(31, 33, 29, 39, Rr.t, 1); ln(33, 33, 35, 39, Rr.t, 1);
};
const ALICEHI = (p, t, C) => { const { c, el, ln } = p, A = C.a, B = C.b, D = C.c, F = ramp('#e8d4b8'), W = ramp(D.t);   // 64 × 136 · 앨리스 모티브 에이프런 드레스
  // 아래: 돌린 나무 받침 기둥 + 휘어진 세 발
  [[-1, 1], [1, 1]].forEach(([d]) => { for (let i = 0; i <= 14; i++) { const x = 32 + d * Math.round(3 + i * .9 + Math.pow(i / 14, 2) * 5), y = 122 + Math.round(Math.sin(i / 14 * Math.PI * .5) * 10); c(x - 2, y - 1, 4, 3, B.o); c(x - 1, y, 2, 1, i < 7 ? B.l : B.t); } });
  c(30, 124, 4, 10, B.o); c(31, 124, 2, 9, B.t);
  for (let y = 92; y < 126; y++) { const u = (y - 92) / 34, hw = Math.round(2 + Math.abs(Math.sin(u * Math.PI * 2.2)) * 3 + (u > .85 ? 2 : 0)); c(32 - hw - 1, y, hw * 2 + 2, 1, B.o); c(32 - hw, y, hw * 2, 1, B.t); c(32 - hw, y, 1, 1, B.L); c(31 + hw, y, 1, 1, B.f); }
  // 위: 나무 꼭지 + 몸통 폼(목 → 어깨)
  el(32, 4, 4, 4, B.o); el(32, 4, 3, 3, B.t); el(31, 3, 1, 1, B.L); c(30, 7, 4, 4, B.o); c(31, 7, 2, 4, B.t); el(32, 12, 6, 2, B.o); el(32, 12, 5, 1, B.t);
  for (let y = 0; y < 7; y++) { const hw = Math.min(6, Math.round(4 + y * .5)); c(32 - hw - 1, 13 + y, hw * 2 + 2, 1, F.o); c(32 - hw, 13 + y, hw * 2, 1, y < 2 ? F.L : F.t); c(32 - hw, 13 + y, 2, 1, F.l); c(30 + hw, 13 + y, 2, 1, F.f); }
  // 하늘색 드레스: 퍼프소매 · 몸판 · A라인 치마 (둥근 밑단)
  hbodice(p, A, F, 2, W.t);
  const top = 35, H = 54, hw = y => Math.round(11 + 19 * Math.pow(y / H, .85)), hem = x => top + H + Math.round(3 * Math.sqrt(Math.max(0, 1 - Math.pow(x / 31, 2))));
  for (let y = 0; y <= H + 4; y++) { const w = hw(Math.min(y, H)) + 1; for (let x = -w; x < w; x++) if (top + y <= hem(x) + 1) c(32 + x, top + y, 1, 1, A.o); }
  for (let y = 0; y <= H + 3; y++) { const w = hw(Math.min(y, H)); for (let x = -w; x < w; x++) { const yy = top + y; if (yy > hem(x)) continue; const k = (x + w) / (w * 2);
      c(32 + x, yy, 1, 1, yy >= hem(x) - 1 ? A.d : k < .1 ? A.l : k > .9 ? A.f : y < 3 ? A.L : A.t); } }
  for (let kk = -4; kk <= 4; kk += 2) for (let y = 4; y < H; y++) { const w = hw(y), x = Math.round(kk / 5 * w); c(32 + x, top + y, 1, 1, A.f); }
  // 속치마 레이스 (밑단 아래로 살짝)
  for (let x = -29; x < 29; x += 3) { const y = hem(x + 1); el(32 + x + 1, y + 2, 2, 2, W.f); el(32 + x + 1, y + 1, 2, 1, W.t); }
  // 흰 둥근 깃 (피터팬 칼라) + 작은 검은 리본
  el(28, 20, 5, 3, W.f); el(36, 20, 5, 3, W.f); el(28, 20, 4, 2, W.t); el(36, 20, 4, 2, W.t); c(27, 17, 10, 2, W.t);
  c(31, 22, 2, 2, '#1e1e24'); el(28, 23, 2, 1, '#1e1e24'); el(36, 23, 2, 1, '#1e1e24'); c(30, 24, 1, 3, '#1e1e24'); c(33, 24, 1, 3, '#1e1e24');
  // 흰 에이프런: 작은 가슴판 + 가는 프릴 어깨끈 + 치마판(가운데) + 주머니
  for (let y = 27; y < 36; y++) { const w = Math.round(6 + (y - 27) * .25); c(32 - w - 1, y, w * 2 + 2, 1, W.f); c(32 - w, y, w * 2, 1, y < 29 ? W.L : W.t); }
  // 앞치마 어깨끈: 가슴판 윗모서리에서 어깨 위까지 길게 이어지는 프릴 끈
  [-1, 1].forEach(d => { const y1 = 17 + Math.round((11 - 6) * .3); for (let y = y1; y < 28; y++) { const u = (y - y1) / (28 - y1), x = 32 + d * Math.round(11 - u * 4); c(x - 1, y, 3, 1, (y % 2) ? W.t : W.L); c(x + d * 2, y, 1, 1, (y % 2) ? W.t : W.f); c(x - d * 2, y, 1, 1, W.f); }
    c(32 + d * 11 - 1, y1 - 1, 3, 1, W.f); });
  const aw = y => Math.round(8 + 8 * Math.pow(y / 44, .9)), ah = 44;
  for (let y = 0; y <= ah; y++) { const w = aw(y) + 1; c(32 - w, top + y, w * 2, 1, W.f); }
  for (let y = 0; y < ah; y++) { const w = aw(y); for (let x = -w; x < w; x++) { const k = (x + w) / (w * 2), f = Math.sin(k * Math.PI * 4); c(32 + x, top + y, 1, 1, y < 2 ? W.L : k < .12 ? W.L : k > .88 ? W.f : f > .5 ? W.L : W.t); } }
  for (let y = 2; y <= ah; y += 3) { const w = aw(y); c(32 - w - 2, top + y, 2, 2, W.t); c(32 + w, top + y, 2, 2, W.t); c(32 - w - 2, top + y + 2, 2, 1, W.f); c(32 + w, top + y + 2, 2, 1, W.f); }
  for (let x = -aw(ah) - 1; x < aw(ah) + 1; x += 3) { c(32 + x, top + ah + 1, 2, 2, W.t); c(32 + x, top + ah + 3, 2, 1, W.f); }
  c(26, 58, 6, 6, W.f); c(27, 59, 4, 4, W.t); c(27, 59, 4, 1, W.f); c(33, 60, 6, 6, W.f); c(34, 61, 4, 4, W.t); c(34, 61, 4, 1, W.f);
  // 허리끈 + 양옆 작은 리본 고리
  c(21, 34, 22, 2, W.f); c(22, 34, 20, 1, W.t); el(19, 36, 3, 2, W.f); el(45, 36, 3, 2, W.f); el(19, 36, 2, 1, W.t); el(45, 36, 2, 1, W.t); ln(19, 38, 17, 46, W.f, 1); ln(45, 38, 47, 46, W.f, 1);
};
const LECTERNHI = (p, t, C) => { const { c, el, ln } = p, B = C.b, A = C.a, M = C.c;   // 64 × 128 · 독서대 + 펼친 마법서
  [[14, 124], [50, 124]].forEach(([x, y]) => { ln(32, 110, x, y, B.o, 3); ln(32, 110, x, y, B.t, 1); el(x, y, 2, 1, B.o); });
  c(30, 44, 4, 68, B.o); c(31, 44, 2, 66, B.t); c(31, 44, 1, 66, B.l); [70, 94].forEach(y => { el(32, y, 4, 2, B.o); el(32, y, 3, 1, B.t); });
  for (let y = 0; y < 8; y++) { const x0 = 5 + Math.round(y * .3), w = 54 - Math.round(y * .6); c(x0, 34 + y, w, 1, B.o); c(x0 + 1, 34 + y, w - 2, 1, y < 2 ? B.L : y < 6 ? B.t : B.f); } c(6, 33, 52, 2, B.o); c(28, 42, 8, 3, B.o);
  // 펼친 책: 표지 · 양쪽 페이지 · 글줄 · 책갈피
  c(6, 20, 52, 16, A.o); c(7, 21, 50, 14, A.t); c(7, 21, 50, 1, A.l);
  for (let y = 0; y < 14; y++) { const lift = Math.round(Math.sin(Math.PI * y / 28) * 2); c(9, 18 + y - lift, 22, 1, y === 0 ? '#c8bca0' : '#f4ecd8'); c(33, 18 + y - lift, 22, 1, y === 0 ? '#c8bca0' : '#ece2c8'); }
  c(31, 17, 2, 16, '#c8bca0'); for (let k = 0; k < 4; k++) { c(11, 21 + k * 3, 17, 1, '#8a7a60'); c(35, 21 + k * 3, 17 - (k === 3 ? 7 : 0), 1, '#8a7a60'); } 
  c(44, 30, 3, 10, '#a8344a'); c(44, 39, 3, 2, '#7e2236');
  c(6, 24, 3, 8, M.o); c(7, 25, 1, 6, M.t); c(55, 24, 3, 8, M.o); c(56, 25, 1, 6, M.t); };
const ROSEDOMEHI = (p, t, C) => { const { c, el, ln } = p, A = C.a, G = C.c, B = C.b, L = ramp('#3f6b3a');   // 64 × 96 · 유리돔 장미
  el(32, 90, 20, 5, B.o); el(32, 89, 19, 4, B.t); el(28, 88, 8, 1, B.l); c(14, 80, 36, 10, B.o); c(15, 81, 34, 8, B.t); c(15, 81, 34, 2, B.L); el(32, 80, 18, 4, B.o); el(32, 79, 17, 3, B.l);
  ln(32, 78, 32, 40, L.o, 3); ln(32, 78, 32, 40, L.t, 1); [[32, 62, 24, 56], [32, 52, 41, 47]].forEach(([x1, y1, x2, y2]) => { hleaf(p, x1, y1, x2, y2, 6, L); });
  hrose(p, 32, 36, A); el(32, 34, 7, 6, A.o); el(32, 34, 6, 5, A.t); el(30, 32, 3, 2, A.l); c(31, 34, 3, 1, A.d); c(33, 32, 1, 3, A.d); c(29, 36, 2, 1, A.d); el(28, 37, 3, 2, A.t); el(36, 37, 3, 2, A.f);
  el(24, 79, 3, 1, A.t); const ph = (t >> 1) % 40; if (ph < 30) { const y = 40 + ph * 1.3, x = 36 + Math.round(Math.sin(ph / 4) * 4); el(x, Math.round(y), 2, 1, A.t); }
  // 유리돔
  for (let y = 0; y < 66; y++) { const r = 16, half = y < r ? Math.sqrt(Math.max(0, r * r - (r - y - .5) * (r - y - .5))) : r; const x1 = Math.round(32 - half), x2 = Math.round(32 + half); c(x1, 12 + y, 1, 1, G.o); c(x2 - 1, 12 + y, 1, 1, G.o); }
  c(16, 12 + 64, 32, 2, G.o); for (let y = 16; y < 70; y++) { c(19, y, 2, 1, 'rgba(255,255,255,.45)'); } for (let y = 22; y < 40; y++) c(23, y, 1, 1, 'rgba(255,255,255,.35)'); c(42, 30, 1, 30, 'rgba(255,255,255,.2)');
  el(32, 10, 3, 2, G.o); el(32, 9, 2, 1, G.L); };

/* 픽셀 마스크로 그리기: 칸을 칠한 뒤, 칠한 칸 바로 바깥에만 테두리 → 사람 같은 복잡한 실루엣도 깔끔한 외곽선 */
function hsprite(p, W, H, O, draw) { const M = new Array(W * H).fill(null), set = (x, y, col) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) M[y * W + x] = col; };
  draw(set); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const v = M[y * W + x]; if (v) { p.c(x, y, 1, 1, v); continue; }
    if ((x > 0 && M[y * W + x - 1]) || (x < W - 1 && M[y * W + x + 1]) || (y > 0 && M[(y - 1) * W + x]) || (y < H - 1 && M[(y + 1) * W + x])) p.c(x, y, 1, 1, O); } }
/* 불꽃: 아래는 둥글고 위로 갈수록 가늘어지며 끝이 흔들리는 물방울 모양을 바깥(진한색) → 안(밝은색) → 심(흰빛) 순서로 겹침 */
function hfire(p, cx, by, w, h, t, A, seed) { const { c } = p; seed = seed || 0;
  const flame = (fx, fw, fh, col, ph) => { for (let v = 0; v < fh; v++) { const u = v / fh, hw = fw / 2 * Math.pow(Math.sin(Math.PI * Math.min(1, (1 - u) * .9 + .1)), .7) * (u < .25 ? .75 + u : 1) * (1 - u * .55), sway = Math.sin(t * .9 + ph + u * 3) * u * u * 4;
      const x1 = Math.round(fx + sway - hw), x2 = Math.round(fx + sway + hw); if (x2 > x1) c(x1, by - v, x2 - x1, 1, col); } };
  const tongues = [[-w * .28, .55, .7, 0], [w * .26, .5, .62, 2.1], [0, .75, 1, 1.1]];
  tongues.forEach(([dx, sw, sh, ph]) => flame(cx + dx, w * sw, h * sh * (1 + Math.sin(t * .7 + ph + seed) * .08), A.d, ph));
  tongues.forEach(([dx, sw, sh, ph]) => flame(cx + dx, w * sw * .72, h * sh * .82, A.t, ph));
  tongues.forEach(([dx, sw, sh, ph]) => flame(cx + dx * .8, w * sw * .45, h * sh * .55, A.l, ph));
  flame(cx, w * .22, h * .32, '#fff2c0', 1.1); }
/* ── 칠죄종 (HO 설정에 맞춘 고해상도) ── */
// 분노 · 관의 주인(현 당주): 가문 문장이 박힌 무쇠 화로
const WRATHHI = (p, t, C) => { const { c, el, ln } = p, M = C.c, A = C.a;   // 64 × 108 · 당주의 다루마 난로 (배불뚝이 무쇠 난로 + 연통 + 주전자)
  const rgb = A.t.slice(1).match(/../g).map(h => parseInt(h, 16)).join(',');
  for (let k = 4; k >= 1; k--) el(32, 80, 12 + k * 5, 8 + k * 4, `rgba(${rgb},.05)`);
  // 연통
  c(27, 0, 10, 40, M.o); c(28, 0, 8, 40, M.t); c(28, 0, 2, 40, M.l); c(34, 0, 2, 40, M.f); c(26, 14, 12, 4, M.o); c(27, 15, 10, 2, M.l);
  // 받침판 · 다리
  c(8, 96, 48, 6, M.o); c(9, 97, 46, 3, M.l); c(9, 97, 46, 1, M.L); [[10], [48]].forEach(([x]) => { c(x, 102, 6, 6, M.o); c(x + 1, 102, 4, 4, M.t); });
  // 배불뚝이 몸통
  hsprite(p, 64, 98, M.o, set => { for (let y = 40; y < 96; y++) { const u = (y - 40) / 56, hw = Math.round(14 + Math.sin(Math.PI * Math.min(1, u * 1.1)) * 9); for (let x = 32 - hw; x < 32 + hw; x++) { const k = (x - 32 + hw) / (hw * 2); set(x, y, y < 43 ? M.L : (y === 62 || y === 63) ? M.f : k < .18 ? M.l : k > .82 ? M.d : M.t); } } });
  el(32, 40, 15, 3, M.o); el(32, 39, 14, 2, M.l); el(27, 39, 5, 1, M.L);
  // 가문 문장
  el(32, 52, 5, 5, GOLDD); el(32, 52, 4, 4, M.d); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k / 5 * Math.PI * 2; c(32 + Math.round(Math.cos(a) * 2.5), 52 + Math.round(Math.sin(a) * 2.5), 1, 1, GOLD); } c(32, 52, 1, 1, GOLD2);
  // 아치형 불창 + 창살 + 불
  for (let y = 0; y < 18; y++) { const hw = y < 6 ? Math.round(8 * Math.sqrt(1 - Math.pow((6 - y) / 6, 2))) : 8; c(32 - hw - 1, 70 + y, hw * 2 + 2, 1, M.o); c(32 - hw, 70 + y, hw * 2, 1, '#2a1410'); }
  const sp = clipPen(p, yy => { const y = yy - 70; if (y < 0 || y >= 18) return null; const hw = y < 6 ? 8 * Math.sqrt(1 - Math.pow((6 - y) / 6, 2)) : 8; return [32 - hw, 32 + hw]; });
  sp.c(24, 82, 16, 6, '#5a2010'); hfire(sp, 32, 87, 14, 16, t, A, 0); for (let x = 25; x < 40; x += 4) sp.c(x, 70, 1, 18, M.o); sp.c(24, 80, 16, 1, M.o);
  // 난로 뚜껑 위에 올린 주전자 (주둥이는 오른쪽) + 김
  hsprite(p, 64, 44, '#3a3028', set => { for (let y = 30; y < 39; y++) { const hw = Math.round(7 * Math.sin(Math.PI * (y - 28) / 12)); for (let x = 42 - hw; x < 42 + hw; x++) set(x, y, x < 40 ? '#b8a890' : '#8a7a60'); }
    for (let i = 0; i < 6; i++) { set(48 + i, 34 - i, '#8a7a60'); set(48 + i, 35 - i, '#8a7a60'); } for (let x = 39; x < 46; x++) set(x, 29, '#8a7a60'); set(42, 28, '#3a3028'); });
  for (let a = Math.PI; a < Math.PI * 2; a += .2) c(42 + Math.round(Math.cos(a) * 6), 30 + Math.round(Math.sin(a) * 6), 1, 1, '#3a3028');
  hsteam(p, 55, 26, t, 0); };
const GREEDHI = (p, t, C) => { const { c, el, ln } = p, M = C.c, V = ramp('#7a1830'), Bx = ramp('#3a1a24');   // 64 × 68 · 보석이 가득한 보석함 (위에서 들여다본 안쪽)
  el(32, 65, 26, 3, 'rgba(0,0,0,.2)');
  hsprite(p, 64, 68, Bx.o, set => {
    for (let y = 2; y < 24; y++) for (let x = 10; x < 54; x++) set(x, y, x < 13 || x > 50 || y < 5 ? M.t : V.t);          // 세워 연 뚜껑 (벨벳 안감)
    for (let y = 24; y < 40; y++) for (let x = 6; x < 58; x++) set(x, y, x < 9 || x > 54 || y < 26 ? M.t : V.d);           // 위에서 본 안쪽
    for (let y = 40; y < 60; y++) for (let x = 6; x < 58; x++) { const k = (x - 6) / 52; set(x, y, y < 42 ? M.L : k < .12 ? Bx.l : k > .88 ? Bx.f : Bx.t); }
    [[8], [50]].forEach(([x]) => { for (let y = 60; y < 64; y++) for (let k = 0; k < 6; k++) set(x + k, y, M.f); });
  });
  c(14, 8, 36, 1, V.l); c(14, 14, 36, 1, V.d); c(14, 20, 36, 1, V.d);
  // 큰 보석들 (반짝임) · 진주
  // 깎은 보석: 윗면(테이블) 밝게 · 아래 깎은 면 어둡게 · 반짝 점
  const gem = (x, y, col, kind) => { const G = ramp(col);
    if (kind === 'sq') { c(x - 3, y - 2, 7, 5, G.o); c(x - 2, y - 1, 5, 3, G.t); c(x - 1, y - 1, 3, 1, G.L); c(x - 2, y + 1, 5, 1, G.d); c(x - 1, y - 1, 1, 1, '#ffffff'); return; }
    c(x - 2, y - 3, 5, 1, G.o); c(x - 3, y - 2, 7, 1, G.o); c(x - 3, y - 1, 7, 2, G.o); c(x - 2, y + 1, 5, 1, G.o); c(x - 1, y + 2, 3, 1, G.o);
    c(x - 1, y - 2, 3, 1, G.L); c(x - 2, y - 1, 5, 1, G.l); c(x - 2, y, 5, 1, G.t); c(x - 1, y + 1, 3, 1, G.d); c(x - 1, y - 2, 1, 1, '#ffffff'); };
  for (let k = 0; k < 9; k++) { el(12 + k * 5, 37, 2, 2, '#d8d0c8'); c(11 + k * 5, 36, 1, 1, '#ffffff'); }
  gem(15, 31, '#c8303a'); gem(25, 30, '#3a8ae0', 'sq'); gem(35, 31, '#30b070'); gem(45, 30, '#9a50d0', 'sq'); gem(20, 35, '#e8c040'); gem(40, 35, '#e8e8f0'); gem(50, 35, '#e85a90');
  // 금 장식 · 자물쇠
  for (let x = 10; x < 56; x += 6) el(x, 50, 1, 1, M.t); c(8, 50, 48, 1, M.f); el(32, 51, 5, 5, M.o); el(32, 51, 4, 4, M.t); el(31, 50, 1, 1, M.L); c(31, 51, 2, 3, Bx.o);
  // 넘쳐 늘어진 목걸이 (진주 + 금줄 펜던트)
  for (let i = 0; i <= 20; i++) { const u = i / 20, x = Math.round(10 + u * 18), y = Math.round(38 + Math.sin(u * Math.PI) * 16); el(x, y, 1, 1, '#d8d0c8'); c(x - 1, y - 1, 1, 1, '#ffffff'); }
  const tw = (t >> 1) % 8; if (tw < 2) { const [sx, sy] = [[15, 29], [35, 29], [25, 28], [45, 28]][(t >> 4) % 4]; c(sx, sy - 2, 1, 5, '#ffffff'); c(sx - 2, sy, 5, 1, '#ffffff'); } };
const SLOTHHI = (p, t, C) => { const { c, el, ln } = p, A = C.a, P = C.c, W = ramp('#8a5a34'), rk = Math.round(Math.sin(t / 6) * 1.5);   // 128 × 76 · 사용인의 흔들의자 (담요 · 걸쳐 둔 앞치마 · 먼지떨이) + 작은 찻상
  el(46, 72, 34, 4, 'rgba(0,0,0,.2)'); el(104, 72, 14, 3, 'rgba(0,0,0,.2)');
  const q = p.sub(0, rk);
  // 흔들의자: 흔들 받침 → 다리 → 좌판 → 등받이 살 → 팔걸이
  hsprite(q, 96, 76, W.o, set => {
    for (let x = 10; x < 84; x++) { const y = 68 - Math.round(Math.pow((x - 47) / 37, 2) * 6); set(x, y, W.t); set(x, y + 1, W.f); }
    [[22, 50, 22, 66], [72, 50, 72, 66], [30, 46, 30, 62], [64, 46, 64, 62]].forEach(([x1, y1, x2, y2]) => { for (let y = y1; y < y2; y++) { set(x1, y, W.t); set(x1 + 1, y, W.f); } });
    for (let y = 44; y < 52; y++) for (let x = 18; x < 78; x++) set(x, y, y < 46 ? W.L : W.t);
    for (let y = 2; y < 46; y++) { const top = 2 + Math.round(Math.pow((47 - 47) / 30, 2)); [26, 36, 47, 58, 68].forEach(x => { set(x, y, W.t); set(x + 1, y, W.f); }); [24, 70].forEach(x => { set(x, y, W.l); set(x + 1, y, W.t); set(x + 2, y, W.f); }); }
    for (let x = 22; x < 74; x++) { const y = 2 + Math.round(Math.pow((x - 48) / 26, 2) * 4); for (let k = 0; k < 5; k++) set(x, y + k, k < 2 ? W.L : W.t); }
    [[14, 30], [70, 84]].forEach(([x1, x2]) => { for (let x = x1; x < x2; x++) { set(x, 30, W.L); set(x, 31, W.t); set(x, 32, W.f); } for (let y = 32; y < 46; y++) { set(x1 + 1, y, W.t); set(x2 - 2, y, W.t); } });
  });
  // 좌판 방석 · 담요 · 앞치마
  q.c(20, 40, 56, 6, P.o); q.c(21, 41, 54, 4, P.t); q.c(21, 41, 54, 1, P.L);
  // 담요: 등받이 꼭대기 위로 걸쳐 앞으로 늘어짐
  for (let x = 52; x < 70; x++) { const top = 2 + Math.round(Math.pow((x - 48) / 26, 2) * 4) - 2; q.c(x, top, 1, 3, x % 4 < 2 ? A.l : A.t); q.c(x, top - 1, 1, 1, A.o); }
  for (let y = 4; y < 34; y++) { const w = Math.round(16 + Math.sin(y / 4) * 1); q.c(53, y, w, 1, (y % 6) < 3 ? A.t : A.l); q.c(52, y, 1, 1, A.o); q.c(53 + w, y, 1, 1, A.o); } for (let x = 53; x < 69; x += 3) q.c(x, 34, 2, 3, A.f);
  for (let y = 6; y < 26; y++) { const hw = Math.round(6 + (y - 6) * .25); q.c(36 - hw, y, hw * 2, 1, y % 5 < 2 ? '#fffdf8' : '#f0ece4'); q.c(36 - hw - 1, y, 1, 1, '#c8c0b4'); q.c(36 + hw, y, 1, 1, '#c8c0b4'); } for (let x = 29; x < 44; x += 3) q.c(x, 26, 2, 2, '#fffdf8'); q.ln(30, 6, 24, 18, '#d8d0c4', 1); q.ln(42, 6, 46, 16, '#d8d0c4', 1);
  // 기대 놓은 먼지떨이
  ln(6, 72, 12, 36, '#5a3a24', 2); for (let k = 0; k < 9; k++) { const a = -2.2 + k * .22; ln(12, 36, 12 + Math.round(Math.cos(a) * 8), 36 + Math.round(Math.sin(a) * 8), k % 2 ? '#3a3a44' : '#6a6a78', 2); }
  // 작은 찻상 + 찻잔 · 책
  el(104, 44, 14, 4, W.o); el(104, 43, 13, 3, W.l); el(100, 42, 5, 1, W.L); c(102, 46, 4, 24, W.o); c(103, 46, 2, 24, W.t); el(104, 70, 8, 2, W.o);
  hcup(p, 99, 33, { t: '#3a5a8a', L: '#6a8ac0' }); hsteam(p, 99, 27, t, 1); c(107, 38, 10, 4, '#a8344a'); c(107, 38, 10, 1, '#d8607a'); c(115, 39, 2, 3, '#f4ecd8');
  if ((t >> 3) % 3 === 0) { const z = (t >> 1) % 6; c(78, 8 - z, 5, 1, '#f4f0e8'); c(81, 9 - z, 1, 1, '#f4f0e8'); c(78, 10 - z, 5, 1, '#f4f0e8'); } };
const GLUTTONYHI = (p, t, C) => { const { c, el, ln } = p, A = C.a, S = C.c, M = ramp(GOLD);   // 64 × 124 · 3단 케이크 스탠드 + 문지기의 열쇠 꾸러미
  el(32, 120, 16, 4, M.o); el(32, 119, 15, 3, M.t); el(30, 118, 6, 1, M.L); c(31, 26, 3, 94, M.o); c(32, 26, 1, 94, M.L);
  // 둥근 케이크 한 단: 옆면(스펀지 + 크림 띠) → 윗면 타원(크림) → 테두리 짜기 → 딸기
  const tier = (y, rx, h, berries) => { el(32, y + h + 1, rx + 5, 3, M.o); el(32, y + h, rx + 4, 2, '#f8f4ec');
    hsprite(p.sub(32 - rx - 1, y - 4), rx * 2 + 2, h + 10, ramp(A.t).o, set => { for (let yy = 0; yy < h + 4; yy++) for (let x = 0; x < rx * 2; x++) { const dx = (x - rx + .5) / rx, bottom = 4 + h + Math.round(Math.sqrt(Math.max(0, 1 - dx * dx)) * 3), top = 4 - Math.round(Math.sqrt(Math.max(0, 1 - dx * dx)) * 3);
      if (yy < top || yy > bottom) continue; const k = x / (rx * 2); set(x + 1, yy, yy < 4 + Math.round(Math.sqrt(Math.max(0, 1 - dx * dx)) * 3) ? (k < .3 ? S.L : S.t) : yy === Math.round(4 + h / 2) + 2 ? S.t : k < .15 ? A.L : k > .85 ? A.f : A.t); } });
    for (let k = 0; k < 14; k++) { const a = Math.PI * (k / 13), x = 32 - Math.round(Math.cos(a) * (rx - 1)), yy = y + Math.round(Math.sin(a) * 3); el(x, yy, 1, 1, S.L); }
    for (let k = 0; k < berries; k++) { const x = 32 - rx + 5 + k * Math.round((rx * 2 - 10) / Math.max(1, berries - 1)); el(x, y - 2, 2, 2, '#a8202a'); el(x, y - 2, 2, 1, '#e04050'); c(x - 1, y - 3, 1, 1, '#ffb0b0'); c(x, y - 4, 1, 1, '#4f8a55'); } };
  tier(92, 24, 14, 6); tier(64, 18, 13, 4); tier(38, 12, 12, 3);
  el(32, 33, 3, 3, '#a8202a'); el(32, 33, 3, 2, '#e04050'); c(31, 30, 2, 1, '#4f8a55');
  // 열쇠 꾸러미: 둥근 고리 + 열쇠 셋 (살짝 흔들림)
  const sw = Math.round(Math.sin(t / 4) * 1.5), kx = 52 + sw; for (let a = 0; a < Math.PI * 2; a += .2) c(kx + Math.round(Math.cos(a) * 4), 84 + Math.round(Math.sin(a) * 4), 1, 1, '#9a8a50');
  [[-3, 0], [0, 2], [3, 1]].forEach(([dx, dl]) => { const x = kx + dx; el(x, 90 + dl, 2, 2, '#c8a858'); c(x, 92 + dl, 1, 9, '#c8a858'); c(x + 1, 98 + dl, 2, 1, '#c8a858'); c(x + 1, 100 + dl, 2, 1, '#c8a858'); });
  ln(kx, 80, 52, 74, '#9a8a50', 1); };
const PRIDEHI = (p, t, C) => { const { c, el, ln } = p, G = C.c, A = C.a;   // 64 × 172 · 받침대 위 금빛 탐정상 (7.5등신, 왼쪽 위에서 빛)
  // 받침대
  c(8, 134, 48, 38, A.o); c(9, 135, 46, 36, A.t); c(9, 135, 46, 3, A.L); c(9, 135, 3, 36, A.l); c(52, 135, 3, 36, A.f); c(4, 128, 56, 8, A.o); c(5, 129, 54, 5, A.l); c(5, 129, 54, 1, A.L); c(4, 166, 56, 6, A.o); c(5, 167, 54, 4, A.f);
  c(18, 146, 28, 10, GOLDD); c(19, 147, 26, 8, GOLD); c(22, 150, 20, 1, GOLDD); c(26, 152, 12, 1, GOLDD);
  hsprite(p, 64, 132, G.o, set => {
    const shade = (x, cx, hw) => { const k = (x - (cx - hw)) / (hw * 2); return k < .22 ? G.L : k < .45 ? G.l : k < .78 ? G.t : G.f; };
    const span = (y, cx, hw, f) => { for (let x = Math.round(cx - hw); x < Math.round(cx + hw); x++) set(x, y, f ? f(x) : shade(x, cx, hw)); };
    // 다리 · 구두
    for (let y = 108; y < 124; y++) { span(y, 27, 3); span(y, 37, 3); }
    for (let y = 124; y < 128; y++) { span(y, 26, 5, () => y < 125 ? G.l : G.f); span(y, 38, 5, () => y < 125 ? G.l : G.f); }
    // 긴 코트 (망토 아래)
    for (let y = 52; y < 110; y++) { const hw = 11 + (y - 52) / 58 * 3.5; span(y, 32, hw); set(32, y, G.f); }
    [64, 74, 84].forEach(y => set(34, y, G.d));
    for (let x = 19; x < 46; x++) set(x, 109, G.f);
    // 목 · 머리 · 얼굴
    for (let y = 29; y < 34; y++) span(y, 32, 3);
    for (let y = 18; y < 30; y++) { const hw = y < 26 ? 6 : y < 28 ? 5 : 4; span(y, 32, hw); }
    for (let y = 18; y < 23; y++) { set(26, y, G.f); set(37, y, G.d); }                 // 옆머리 그늘
    set(29, 22, G.d); set(30, 22, G.d); set(34, 22, G.d); set(35, 22, G.d);              // 눈썹 그늘
    for (let y = 23; y < 26; y++) set(32, y, G.f); set(33, 26, G.d);                     // 코
    set(31, 28, G.d); set(32, 28, G.d);                                                  // 입
    // 사냥모자: 둥근 정수리 + 앞챙 + 위에 묶은 귀덮개 매듭
    for (let y = 12; y < 19; y++) { const hw = Math.round(4 + Math.min(1, (y - 12) / 3) * 3); span(y, 32, hw); }      // 머리에 맞는 둥근 캡
    for (let y = 15; y < 19; y++) { set(26, y, G.f); set(27, y, G.f); set(37, y, G.d); set(38, y, G.d); }   // 위로 접어 붙인 귀덮개 (옆면 그늘)
    for (let x = 28; x < 37; x++) { set(x, 19, x < 31 ? G.l : G.t); set(x, 20, G.f); }                                // 짧은 앞챙
    set(31, 10, G.l); set(33, 10, G.t); set(30, 11, G.l); set(34, 11, G.t); set(32, 11, G.f);                              // 정수리 매듭
    for (let y = 13; y < 18; y += 2) { set(29, y, G.f); set(35, y, G.f); }
    // 인버네스 망토: 어깨에서 팔꿈치까지 넓게, 밑단은 가운데가 살짝 내려감
    for (let y = 33; y < 60; y++) { const hw = y < 37 ? 9 + (y - 33) * 1.3 : 14 + (y - 37) * .18; for (let x = Math.round(32 - hw); x < Math.round(32 + hw); x++) { const ax = Math.abs(x - 32), bot = 59 - Math.round(ax / hw * 3); if (y > bot) continue; set(x, y, y === bot ? G.d : shade(x, 32, hw)); } }
    for (let y = 40; y < 57; y++) { set(Math.round(25 - (y - 40) * .15), y, G.f); set(Math.round(39 + (y - 40) * .15), y, G.d); }
    for (let x = 27; x < 38; x++) set(x, 33, G.f); set(29, 34, G.f); set(35, 34, G.f);    // 깃
    // 치켜든 오른팔 + 돋보기
    for (let i = 0; i <= 11; i++) { const x = 45 + i * .3, y = 57 - i; set(x - 1, y, G.l); set(x, y, G.t); set(x + 1, y, G.f); }   // 소매
    for (let x = 46; x < 50; x++) set(x, 45, G.d);                                                                      // 끝동
    for (let y = 40; y < 45; y++) for (let x = 46; x < 50; x++) set(x, y, x < 47 ? G.L : x < 49 ? G.l : G.t);          // 주먹
    set(46, 42, G.f); set(47, 42, G.f); set(48, 42, G.f);
    for (let y = 33; y < 41; y++) set(48, y, G.d);                                                                      // 손잡이 (곧게)
  });
  // 돋보기 렌즈 (마스크 밖에서 테 + 유리)
  el(48, 27, 6, 6, G.o); el(48, 27, 5, 5, G.t); el(47, 26, 4, 4, G.L); el(48, 27, 4, 4, G.o); el(48, 27, 3, 3, '#c8e8f8'); c(46, 25, 2, 2, '#ffffff');
  if ((t >> 2) % 5 === 0) { c(14, 40, 1, 5, '#fff6c0'); c(12, 42, 5, 1, '#fff6c0'); } };
const ENVYHI = (p, t, C) => { const { c, el, ln } = p, M = C.c, A = C.a;   // 64 × 168 · 아르데코 전신 거울 (계단식 머리 장식 + 부채꼴 햇살 + 금줄)
  // 계단식 받침
  c(12, 152, 40, 8, M.o); c(13, 153, 38, 6, M.t); c(13, 153, 38, 1, M.L); [[14], [46]].forEach(([x]) => { c(x, 160, 4, 6, M.o); c(x + 1, 160, 2, 5, M.t); });
  hsprite(p, 64, 156, M.o, set => {
    // 거울 판 + 테
    for (let y = 30; y < 150; y++) for (let x = 14; x < 50; x++) { const fr = x < 17 || x > 46 || y < 33 || y > 146; set(x, y, fr ? (x < 17 || y < 33 ? M.l : M.f) : y > 136 ? A.t : x < 26 ? A.L : A.l); }
    // 계단식 머리 장식 (지구라트)
    [[14, 50, 25], [22, 42, 19]].forEach(([x1, x2, y0], i) => { for (let y = y0; y < 30; y++) for (let x = x1; x < x2; x++) set(x, y, y < y0 + 2 ? M.L : M.t); });
  });
  // 금줄 · 부채꼴 햇살
  c(17, 33, 30, 1, GOLD); c(17, 146, 30, 1, GOLD); c(17, 33, 1, 114, GOLD); c(46, 33, 1, 114, GOLD);
  for (let k = 0; k < 5; k++) { const a = Math.PI + (k + .5) / 5 * Math.PI; ln(32, 28, 32 + Math.round(Math.cos(a) * 7), 28 + Math.round(Math.sin(a) * 6), GOLD, 1); } el(32, 28, 2, 2, GOLD);
  // 유리: 반사광 · 가끔 비치는 탐정 실루엣
  if ((t % 40) < 10) { const S = 'rgba(30,50,40,.3)'; el(32, 56, 6, 3, S); el(32, 52, 4, 3, S); el(32, 62, 5, 5, S); for (let y = 67; y < 136; y++) { const hw = Math.round(5 + (y - 67) * .1); c(32 - hw, y, hw * 2, 1, S); } }
  for (let i = 0; i < 34; i++) { c(19 + Math.round(i * .45), 38 + i * 3, 3, 3, 'rgba(255,255,255,.35)'); c(27 + Math.round(i * .45), 34 + i * 3, 1, 3, 'rgba(255,255,255,.25)'); }
  // 받침에 기대 둔 수첩 · 만년필
  c(38, 138, 12, 14, '#2a3a2e'); c(39, 139, 10, 12, '#4a6a50'); c(40, 144, 8, 1, '#f4ecd8'); c(48, 136, 2, 16, '#1e1e24'); c(48, 136, 2, 3, GOLD); };
const LUSTHI = (p, t, C) => { const { c, el, ln } = p, A = C.a, B = C.b, R = ramp(C.c.t);   // 128 × 104 · 푹신한 장미 데이베드 (단추 누빔 등받이 · 둥근 팔걸이 · 통통한 좌판) + 그림책 · 토끼 인형
  el(64, 100, 58, 4, 'rgba(0,0,0,.2)');
  // 나무 등받이 테 (장미 조각) · 다리 · 치마단
  p.orr(10, 8, 108, 40, B.t, B.o, 14); c(20, 10, 88, 3, B.l);
  [[64, 13]].forEach(([x, y]) => { hrose(p, x, y + 1, R); hrose(p, x - 12, y + 3, R); hrose(p, x + 12, y + 3, R); el(x - 20, y + 4, 3, 2, '#3f6b3a'); el(x + 20, y + 4, 3, 2, '#3f6b3a'); });
  [[16], [106]].forEach(([x]) => { c(x, 86, 6, 12, B.o); c(x + 1, 86, 4, 10, B.t); c(x + 1, 86, 1, 10, B.l); });
  // 푹신한 등받이 쿠션 (단추 누빔) · 좌판 쿠션
  hband(p, 16, 20, 96, 42, 3, A, { amp: 3, rad: 12, tuft: true });
  hband(p, 18, 56, 92, 30, 2, A, { amp: 3, rad: 8, front: 11 });
  // 둥글게 말린 팔걸이
  [[2], [104]].forEach(([x]) => { c(x + 2, 52, 18, 36, A.o); c(x + 3, 53, 16, 34, A.f); c(x + 4, 58, 3, 28, A.t); hpuff(p, x, 40, 22, 22, A, 3, true); });
  c(10, 84, 108, 4, B.o); c(11, 85, 106, 2, B.t);
  // 좌판 윗면(y 58~74)에 비스듬히 펼쳐 놓은 그림책 (위에서 본 평행사변형)
  const book = (x0, y0) => { const sk = .35, P = (u, v) => [x0 + u + v * sk * 2, y0 + v * .5];
    for (let v = 0; v < 20; v++) for (let u = -1; u < 31; u++) { const [x, y] = P(u, v); c(Math.round(x), Math.round(y), 1, 1, (u < 0 || u > 29 || v > 18) ? '#2a5a9a' : u === 14 || u === 15 ? '#c8bca0' : u < 14 ? (v < 10 ? '#9ad0f0' : '#79b26e') : (v < 10 ? '#9ad0f0' : '#79b26e')); }
    const pt = (u, v, col, w) => { const [x, y] = P(u, v); c(Math.round(x), Math.round(y), w || 1, 1, col); };
    pt(9, 4, '#ffd23a', 2); pt(9, 5, '#ffd23a', 2); for (let u = 2; u < 9; u++) pt(u, 11, '#5f9a50');
    for (let v = 9; v < 15; v++) for (let u = 19; u < 25; u++) pt(u, v, v < 12 ? '#d8303a' : '#f4e8d0'); pt(21, 14, '#8a5a34'); pt(22, 14, '#8a5a34');
    for (let u = -1; u < 31; u++) pt(u, 19, '#1e3a6a'); };
  book(30, 53);
  // 옆으로 쓰러진 토끼 인형 (귀가 늘어짐)
  hblob(p, [['e', [84, 56, 9, 6], '#f4ece4', '#c8b8a8'], ['e', [96, 52, 6, 6], '#f4ece4', '#c8b8a8'], ['l', [100, 48, 110, 42, 5], '#f4ece4', '#c8b8a8'], ['l', [100, 51, 111, 50, 5], '#f4ece4', '#c8b8a8'], ['e', [76, 60, 3, 2], '#f4ece4', '#c8b8a8'], ['e', [88, 61, 3, 2], '#f4ece4', '#c8b8a8']]);
  hleaf(p, 101, 48, 108, 44, 2, { o: '#f4b8c8', l: '#f4b8c8', t: '#f4b8c8', f: '#f4b8c8' });
  c(95, 50, 2, 2, OL); c(95, 50, 1, 1, '#ffffff'); c(98, 52, 1, 1, OL); el(93, 54, 1, 1, '#e87890'); c(88, 51, 3, 6, R.t); el(84, 58, 5, 3, '#ffffff'); };
const SHELFHI = {
  books(p, _x, y0, y1, seed, w) { const { c } = p, cols = ['#a8344a', '#3a5a8a', '#c9a96a', '#4f8a55', '#6a4a8a', '#b8693d', '#e8dcc0', '#2a6a6a', '#7a2a3a', '#d8c070', '#5a7a9a'];
    let x = 0, i = seed; const H = y1 - y0;
    while (x < w - 4) { const kind = hsh(i, seed + 3) % 13;
      if (kind === 0 && x + 22 < w) { // 눕힌 책 더미
        for (let k = 0; k < 3; k++) { const R = ramp(cols[hsh(i, k) % cols.length]), bw = 20 - k * 2; c(x + k, y1 - 5 - k * 5, bw, 5, R.o); c(x + k + 1, y1 - 4 - k * 5, bw - 2, 3, R.t); c(x + k + 1, y1 - 4 - k * 5, bw - 2, 1, R.l); c(x + k + bw - 4, y1 - 4 - k * 5, 2, 3, '#f4ecd8'); }
        x += 24; i++; continue; }
      if (kind === 1 && x + 14 < w) { // 작은 화분
        const G = ramp('#4f8a55'); p.el(x + 7, y1 - 16, 7, 6, G.o); p.el(x + 7, y1 - 16, 6, 5, G.t); c(x + 4, y1 - 19, 4, 2, G.l); p.orr(x + 2, y1 - 11, 10, 11, '#d08a5a', '#6a3a1a', 2); c(x + 3, y1 - 10, 2, 8, '#e8a878'); x += 16; i++; continue; }
      if (kind === 2 && x + 14 < w) { // 촛대 · 모래시계 · 해골
        const v = hsh(i, 7) % 3;
        if (v === 0) { c(x + 5, y1 - 16, 4, 12, '#f4f0e8'); c(x + 5, y1 - 16, 1, 12, '#ffffff'); c(x + 6, y1 - 20, 2, 4, '#ffb347'); c(x + 2, y1 - 4, 10, 4, GOLD); }
        else if (v === 1) { c(x + 1, y1 - 20, 12, 2, '#8a5530'); c(x + 1, y1 - 2, 12, 2, '#8a5530'); for (let k = 0; k < 8; k++) { const ww = Math.abs(k - 8) - 1; c(x + 7 - ww / 2 | 0, y1 - 18 + k, ww, 1, '#e8f4f8'); c(x + 7 - ww / 2 | 0, y1 - 10 + k, 10 - ww, 1, '#e8f4f8'); } c(x + 4, y1 - 8, 6, 5, '#e0c070'); }
        else { p.orr(x + 1, y1 - 16, 12, 11, '#efe6d0', '#8a7a60', 4); c(x + 3, y1 - 12, 3, 3, '#2a1a10'); c(x + 8, y1 - 12, 3, 3, '#2a1a10'); c(x + 4, y1 - 5, 6, 5, '#efe6d0'); c(x + 5, y1 - 5, 1, 3, '#8a7a60'); c(x + 8, y1 - 5, 1, 3, '#8a7a60'); }
        x += 16; i++; continue; }
      const bw = [5, 6, 7, 5, 8, 6, 4][i % 7], bh = Math.min(H - 2, 16 + hsh(i, seed) % 9), R = ramp(cols[hsh(i, 5) % cols.length]);
      if (x + bw > w) break;
      if (kind === 3 && x + bw + 6 < w) { // 기울어진 책
        for (let k = 0; k < bh; k++) { const sx = Math.round((bh - k) * .35); c(x + sx, y1 - k - 1, bw, 1, k === bh - 1 ? R.o : R.t); c(x + sx, y1 - k - 1, 1, 1, R.o); c(x + sx + bw - 1, y1 - k - 1, 1, 1, R.o); if (k === 5 || k === bh - 6) c(x + sx + 1, y1 - k - 1, bw - 2, 1, GOLD); }
        x += bw + 7; i++; continue; }
      c(x, y1 - bh, bw, bh, R.o); c(x + 1, y1 - bh + 1, bw - 2, bh - 1, R.t); c(x + 1, y1 - bh + 1, 1, bh - 1, R.l); c(x + bw - 2, y1 - bh + 1, 1, bh - 1, R.f);
      c(x + 1, y1 - bh + 3, bw - 2, 1, GOLD); c(x + 1, y1 - 4, bw - 2, 1, GOLD); if (bw >= 6) c(x + 2, y1 - bh + 6, bw - 4, 4, R.L);
      x += bw; if (hsh(i, 9) % 5 === 0) x += 1; i++; }
  },
  front(p, t, C) { const { c, orr } = p, B = C.b, M = ramp(GOLD);
    c(0, 6, 128, 170, B.o); c(1, 7, 126, 168, B.f);
    orr(0, 0, 128, 16, B.t, B.o, 2); c(2, 2, 124, 3, B.L); c(2, 11, 124, 2, B.d); for (let x = 6; x < 124; x += 8) c(x, 7, 4, 3, B.l);
    c(1, 16, 10, 152, B.t); c(117, 16, 10, 152, B.t); c(3, 16, 2, 152, B.L); c(9, 16, 2, 152, B.d); c(119, 16, 2, 152, B.l); c(125, 16, 1, 152, B.d);
    hgrain(p, 4, 20, 5, 140, B, 2, true); hgrain(p, 120, 20, 5, 140, B, 5, true);
    const rows = [[18, 46], [50, 78], [82, 110], [114, 136]];
    rows.forEach(([y0, y1], i) => { c(11, y0, 106, y1 - y0, '#2a160c'); c(11, y0, 106, 4, 'rgba(0,0,0,.45)'); c(11, y0, 3, y1 - y0, 'rgba(0,0,0,.3)');
      SHELFHI.books(p.sub(14, 0), 0, y0 + 3, y1, i * 11 + 3, 101); c(9, y1, 110, 4, B.t); c(9, y1, 110, 1, B.L); c(9, y1 + 3, 110, 1, B.d); });
    // 아래 장
    c(11, 140, 106, 28, B.d); [12, 65].forEach(x => { orr(x, 141, 51, 26, B.t, B.o, 2); orr(x + 4, 144, 43, 20, B.f, B.d, 2); c(x + 5, 145, 41, 2, B.l); hgrain(p, x + 6, 148, 39, 14, B, x); });
    orr(56, 149, 5, 8, M.t, M.o, 1); orr(67, 149, 5, 8, M.t, M.o, 1);
    c(0, 168, 128, 6, B.d); c(0, 168, 128, 1, B.l); c(2, 172, 10, 4, B.o); c(116, 172, 10, 4, B.o);
  },
  back(p, t, C) { const { c, orr } = p, B = C.b;
    c(0, 6, 128, 170, B.o); orr(0, 0, 128, 16, B.t, B.o, 2); c(2, 2, 124, 3, B.L);
    for (let x = 2; x < 126; x += 18) { c(x, 16, 17, 152, B.f); c(x, 16, 2, 152, B.l); c(x + 16, 16, 1, 152, B.d); hgrain(p, x + 3, 20, 12, 144, B, x, true); c(x + 8, 22, 2, 2, B.o); c(x + 8, 160, 2, 2, B.o); }
    c(0, 168, 128, 6, B.d); c(2, 172, 10, 4, B.o); c(116, 172, 10, 4, B.o);
  },
  side(p, t, C) { const { c, orr } = p, B = C.b;   // 앞면이 왼쪽 · 64×210
    orr(10, 0, 46, 80, B.t, B.o, 2); c(12, 2, 42, 3, B.L); hgrain(p, 14, 8, 38, 66, B, 7);
    c(10, 76, 46, 128, B.o); c(11, 77, 44, 126, B.f); c(11, 77, 44, 10, B.t); c(11, 77, 44, 2, B.L); c(11, 86, 44, 2, B.d);
    orr(16, 94, 34, 92, B.t, B.d, 3); c(18, 96, 30, 2, B.l); hgrain(p, 19, 100, 28, 82, B, 13, true);
    c(8, 78, 3, 124, B.d);
    c(10, 196, 46, 8, B.d); c(12, 204, 8, 6, B.o); c(46, 204, 8, 6, B.o);
  },
};

const FCATS = [['bed', '침실'], ['living', '거실'], ['gothic', '앤틱'], ['plant', '식물'], ['small', '소품'], ['sin', '칠죄종'], ['window', '창문·커튼'], ['deco', '벽 장식']];
const WALLS = {
  plain: { name: '기본 벽', cost: 0, col: '#6a5444' }, green: { name: '숲빛 얼룩', cost: 30, col: '#3e6e50' }, stripe: { name: '줄무늬', cost: 40, col: '#6a3440' },
  damask: { name: '다마스크', cost: 70, col: '#2e4434' }, panel: { name: '나무 패널', cost: 60, col: '#7a6050' }, brick: { name: '벽돌', cost: 50, col: '#7a3a2a' },
  night: { name: '별밤', cost: 90, col: '#1a1e3a' }, floral: { name: '꽃무늬', cost: 60, col: '#d8c8b0' }, plaid: { name: '격자 체크', cost: 55, col: '#3a5a8a' },
  argyle: { name: '아가일', cost: 65, col: '#5a3a5a' }, castle: { name: '성벽 돌', cost: 70, col: '#7a7a84' }, gothic: { name: '고딕 아치', cost: 85, col: '#2a2234' },
};
const FLOORS = {
  plank: { name: '나무 마루', cost: 0, col: '#c4864e' }, checker: { name: '체크 타일', cost: 50, col: '#2e2e34' }, carpet: { name: '카펫', cost: 60, col: '#7a2434' },
  stone: { name: '돌바닥', cost: 40, col: '#7a7a80' }, herring: { name: '헤링본', cost: 80, col: '#a87040' }, parquet: { name: '쪽매 마루', cost: 70, col: '#9a6238' },
  marble: { name: '대리석', cost: 100, col: '#e4e0d8' }, hex: { name: '육각 타일', cost: 60, col: '#4f8a7a' }, darkwood: { name: '어두운 마루', cost: 50, col: '#5a3a28' },
};
function drawWall(g, k, t, col) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, X = OX, Y = OY, W = COLS * T, H = WALL_H;
  const C = ramp(col || (WALLS[k] || WALLS.plain).col);
  R(X, Y, W, H, C.t);
  if (k === 'plain') for (let x = X; x < X + W; x += 24) { R(x, Y, 2, H, C.f); R(x + 2, Y, 1, H, C.l); }
  if (k === 'green') { for (let i = 0; i < 120; i++) { const x = X + hsh(i, 3) % W, y = Y + hsh(i, 5) % (H - 16); R(x, y, 3 + i % 3, 2, i % 2 ? C.l : C.f); } }
  if (k === 'stripe') for (let x = X; x < X + W; x += 24) { R(x, Y, 12, H, C.l); R(x + 17, Y, 2, H, C.L); R(x + 12, Y, 1, H, C.f); }
  if (k === 'damask') for (let y = Y + 6, r = 0; y < Y + H - 16; y += 20, r++) for (let x = X + (r % 2) * 12; x < X + W; x += 24) { R(x + 5, y, 4, 2, C.l); R(x + 3, y + 2, 8, 4, C.l); R(x + 1, y + 4, 12, 3, C.l); R(x + 5, y + 7, 4, 6, C.l); R(x + 6, y + 3, 2, 3, C.L); R(x + 3, y + 10, 8, 2, C.l); }
  if (k === 'panel') { R(X, Y + 50, W, H - 50, C.f); R(X, Y + 50, W, 4, C.L); R(X, Y + 54, W, 2, C.d); for (let x = X + 4; x < X + W; x += 48) { R(x, Y + 62, 40, 42, C.d); R(x + 2, Y + 64, 36, 38, C.t); R(x + 2, Y + 64, 36, 2, C.l); } for (let x = X; x < X + W; x += 6) R(x, Y + 10 + (x % 12 ? 0 : 4), 1, 1, C.l); }
  if (k === 'brick') for (let y = Y, r = 0; y < Y + H; y += 12, r++) { R(X, y, W, 2, C.d); for (let x = X + (r % 2) * 12 - 12; x < X + W; x += 24) { R(Math.max(X, x), y, 2, 12, C.d); const v = hsh(x, r) % 3; R(Math.max(X, x + 2), y + 2, 22, 2, v ? C.l : C.L); if (v === 2) R(Math.max(X, x + 6), y + 6, 8, 3, C.f); } }
  if (k === 'night') { for (let i = 0; i < 90; i++) { const x = X + hsh(i, 7) % W, y = Y + hsh(i, 13) % (H - 20); R(x, y, 1, 1, (t + i) % 9 ? '#c8c0a0' : '#ffffff'); if (i % 11 === 0) { R(x - 2, y, 5, 1, '#e8e0c0'); R(x, y - 2, 1, 5, '#e8e0c0'); } } R(X + W - 60, Y + 12, 16, 16, '#f1ead8'); R(X + W - 54, Y + 10, 14, 14, C.t); }
  if (k === 'floral') for (let y = Y + 8, r = 0; y < Y + H - 16; y += 22, r++) for (let x = X + (r % 2) * 14 + 4; x < X + W; x += 28) { const P = ramp('#c87a8a'); R(x + 2, y, 4, 2, P.t); R(x, y + 2, 8, 4, P.t); R(x + 2, y + 6, 4, 2, P.t); R(x + 3, y + 3, 2, 2, '#e0b050'); R(x + 9, y + 6, 5, 2, '#79a06a'); R(x - 4, y + 4, 4, 2, '#79a06a'); }
  if (k === 'plaid') { for (let x = X; x < X + W; x += 24) { R(x, Y, 8, H, C.l); R(x + 3, Y, 2, H, C.L); } for (let y = Y; y < Y + H; y += 24) { R(X, y, W, 8, 'rgba(0,0,0,.18)'); R(X, y + 3, W, 1, 'rgba(255,240,200,.25)'); } }
  if (k === 'argyle') for (let y = Y, r = 0; y < Y + H; y += 24, r++) for (let x = X - 12 + (r % 2) * 12; x < X + W; x += 24) for (let i = 0; i < 12; i++) { R(x + 12 - i, y + i, i * 2, 1, (r + x / 24) % 2 ? C.l : C.f); R(x + 1 + i, y + 12 + i, 22 - i * 2, 1, (r + x / 24) % 2 ? C.l : C.f); }
  if (k === 'castle') for (let y = Y, r = 0; y < Y + H; y += 16, r++) { R(X, y, W, 2, C.d); for (let x = X + (r % 2) * 16 - 16; x < X + W; x += 32) { R(Math.max(X, x), y, 2, 16, C.d); R(Math.max(X, x + 2), y + 2, 28, 2, C.l); if (hsh(x, r) % 4 === 0) R(Math.max(X, x + 8), y + 8, 10, 2, C.f); } }
  if (k === 'gothic') for (let x = X; x < X + W; x += 48) { R(x + 6, Y + 30, 36, H - 30, C.l); for (let i = 0; i < 18; i++) { const w = Math.round(18 * Math.sqrt(1 - Math.pow((18 - i) / 18, 2))); R(x + 24 - w, Y + 12 + i, w * 2, 1, C.l); } R(x + 10, Y + 34, 28, H - 40, C.d); R(x + 23, Y + 14, 2, H - 20, C.f); R(x + 6, Y + 30, 36, 2, '#e0b050'); }
  R(X, Y, W, 6, 'rgba(0,0,0,.22)'); R(X, Y + H - 10, W, 10, '#93592f'); R(X, Y + H - 10, W, 2, '#dca468'); R(X, Y + H - 2, W, 2, '#5a3a24');
}
function drawFloor(g, k, col) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, X = OX, Y = FY, W = COLS * T, H = ROWS * T;
  const C = ramp(col || (FLOORS[k] || FLOORS.plank).col);
  if (k === 'checker') { const L2 = ramp(hslHex(hexHsl(C.t)[0], .12, .86)); for (let y = 0; y < H; y += 24) for (let x = 0; x < W; x += 24) { const d = ((x + y) / 24) % 2; R(X + x, Y + y, 24, 24, d ? C.t : L2.t); R(X + x, Y + y, 24, 2, d ? C.l : L2.L); R(X + x, Y + y + 22, 24, 2, d ? C.f : L2.f); } }
  else if (k === 'carpet') { R(X, Y, W, H, C.t); for (let y = 8; y < H; y += 24) for (let x = (y % 48 > 24 ? 12 : 0); x < W; x += 24) { R(X + x + 4, Y + y, 4, 2, C.l); R(X + x + 2, Y + y + 2, 8, 2, C.l); R(X + x + 4, Y + y + 4, 4, 2, C.l); } R(X, Y + 4, W, 4, '#c9a96a'); R(X, Y + H - 8, W, 4, '#c9a96a'); for (let i = 0; i < 300; i++) R(X + hsh(i, 1) % W, Y + hsh(i, 2) % H, 1, 1, C.f); }
  else if (k === 'stone') { R(X, Y, W, H, C.d); for (let y = 0, r = 0; y < H; y += 24, r++) for (let x = (r % 2) * -24; x < W; x += 48) { const v = hsh(x, r) % 3, cs = [C.t, C.l, C.f][v], xx = Math.max(0, x + 2), ww = Math.min(46, W - xx); R(X + xx, Y + y + 2, ww, 22, cs); R(X + xx, Y + y + 2, ww, 2, C.L); if (hsh(r, x) % 4 === 0) R(X + xx + 12, Y + y + 12, 6, 1, C.d); } }
  else if (k === 'herring') { R(X, Y, W, H, C.d); for (let y = 0; y < H; y += 12) for (let x = 0; x < W; x += 24) { const s = ((y / 12) % 2) * 12; R(X + x + s, Y + y, 12, 12, C.l); R(X + x + s, Y + y, 12, 2, C.L); R(X + x + 12 - s, Y + y, 12, 12, C.t); R(X + x + 12 - s, Y + y + 10, 12, 2, C.f); } }
  else if (k === 'parquet') { for (let y = 0; y < H; y += 32) for (let x = 0; x < W; x += 32) { const v = ((x + y) / 32) % 2; for (let i = 0; i < 4; i++) { if (v) R(X + x + i * 8, Y + y, 8, 32, i % 2 ? C.t : C.l); else R(X + x, Y + y + i * 8, 32, 8, i % 2 ? C.t : C.l); } R(X + x, Y + y, 32, 1, C.d); R(X + x, Y + y, 1, 32, C.d); } }
  else if (k === 'marble') { R(X, Y, W, H, C.t); for (let y = 0; y < H; y += 48) for (let x = 0; x < W; x += 48) { R(X + x, Y + y, 48, 1, C.f); R(X + x, Y + y, 1, 48, C.f); } for (let i = 0; i < 26; i++) { let x = hsh(i, 4) % W, y = hsh(i, 8) % H; for (let s = 0; s < 30; s++) { R(X + x, Y + y, 1, 1, i % 3 ? C.f : C.d); x += (hsh(i, s) % 3) - 1 + 1; y += (hsh(s, i) % 3) - 1; if (x >= W || y < 0 || y >= H) break; } } }
  else if (k === 'hex') { R(X, Y, W, H, C.d); for (let y = 0, r = 0; y < H + 16; y += 16, r++) for (let x = (r % 2) * 14 - 14; x < W; x += 28) { for (let i = 0; i < 14; i++) { const ww = 12 + (i < 4 ? i * 2 : i > 9 ? (13 - i) * 2 : 8); const yy = y + i, xx = x + 14 - Math.round(ww / 2); if (yy >= 0 && yy < H) R(X + Math.max(0, xx), Y + yy, Math.min(ww, W - Math.max(0, xx)), 1, i < 2 ? C.l : (hsh(x, r) % 3 ? C.t : C.f)); } } }
  else { const dark = k === 'darkwood'; R(X, Y, W, H, C.t); for (let x = 0, cI = 0; x < W; x += 24, cI++) { R(X + x, Y, 2, H, C.f); R(X + x + 2, Y, 1, H, C.l);
      for (let y = (cI * 37) % 80; y < H; y += 80) R(X + x, Y + y, 24, 2, C.f); for (let i = 0; i < 10; i++) R(X + x + 5 + (i % 4) * 4, Y + hsh(cI, i) % H, 1, 4 + (i % 3) * 2, dark ? C.d : C.f); } }
  R(X, Y, W, 6, 'rgba(0,0,0,.18)'); R(X, Y + 6, W, 3, 'rgba(0,0,0,.08)');
}
function drawFrame(g, col) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, C = ramp(col || '#5a3a22');
  R(0, 0, RW, RH, '#120c08'); R(OX - 8, OY - 8, COLS * T + 16, WALL_H + ROWS * T + 16, C.t); R(OX - 7, OY - 7, COLS * T + 14, 2, C.L); R(OX - 8, OY + WALL_H + ROWS * T + 6, COLS * T + 16, 2, C.d);
  R(OX - 2, OY - 2, COLS * T + 4, WALL_H + ROWS * T + 4, C.o);
}

/* ---------- 방 데이터 ---------- */
let RM = { edit: false, sel: null, drag: null, hover: null, t: 0 };
let RV = null;                 // 놀러 간 방 주인 uid
let ROOMLIKES = [], GUESTBOOK = [], roomUnsubs = [];
const rmId = () => Math.random().toString(36).slice(2, 9);
const DYE_COST = 8, DYE5_COST = 35;
function defCol(k) { const f = FURN[k], o = {}; if (f && f.parts) Object.entries(f.parts).forEach(([s, [, hex]]) => o[s] = hex); return o; }
function colsOf(it) { const d = defCol(it.k), m = Object.assign({}, d, it.col || {}), o = {}; ['a', 'b', 'c'].forEach(s => o[s] = ramp(m[s] || d.a || '#888888')); return o; }
function defaultRoom() {
  return { v: 4, wall: 'plain', floor: 'plank', ow: ['plain', 'plank'], cols: { wall: {}, floor: {}, frame: '' }, arc: { wall: {}, floor: {}, frame: 0 }, inv: {}, invc: [], dye: 0,
    items: [{ id: rmId(), k: 'bed', c: 0, r: 0 }, { id: rmId(), k: 'desk', c: 8, r: 0 }, { id: rmId(), k: 'chair', c: 9, r: 1 }, { id: rmId(), k: 'window', c: 4, r: -1 }] };
}
function dimsOf(k, dir) { const f = FURN[k]; if (!f) return { w: 1, d: 1, h: 0 }; if (f.dims) return f.dims(dir || 0); return { w: f.w || 1, d: f.wall ? 0 : (f.d || 1), h: f.h }; }
const fw = (k, dir) => dimsOf(k, dir).w, fd = (k, dir) => (FURN[k] || {}).wall ? 0 : dimsOf(k, dir).d;
/* 예전 데이터 → 지금 형식 */
function migrateRoom(r) {
  let ch = false; const REN = { armor: 'mannequin', skeleton: 'lectern' };
  [...(r.items || []), ...(r.invc || [])].forEach(i => { if (REN[i.k]) { i.k = REN[i.k]; i.col = null; i.dir = 0; ch = true; } });
  if (!r.v || r.v < 3) {   // 정면 시점(8×3칸) 배치 → 12×9칸
    const old = r.items || []; r.items = []; ch = true;
    old.slice().sort((a, b) => (FURN[b.k] && FURN[b.k].flat ? 1 : 0) - (FURN[a.k] && FURN[a.k].flat ? 1 : 0)).forEach(i => {
      if (!FURN[i.k]) return; const f = FURN[i.k], tc = Math.round(i.c * COLS / 8), tr = f.wall ? -1 : Math.min(ROWS - fd(i.k), Math.max(0, (i.r | 0) * 3));
      const s = nearFree(r, i.k, tc, tr); if (s) r.items.push({ id: i.id || rmId(), k: i.k, c: s.c, r: s.r }); else r.inv[i.k] = (r.inv[i.k] || 0) + 1; });
  }
  if (r.v !== 4) { ch = true; r.v = 4; r.invc = r.invc || []; Object.entries(r.inv || {}).forEach(([k, n]) => { for (let i = 0; i < n; i++) if (FURN[k]) r.invc.push({ id: rmId(), k, col: null, rc: 0 }); }); r.inv = {};
    r.cols = r.cols || { wall: {}, floor: {}, frame: '' }; r.arc = r.arc || { wall: {}, floor: {}, frame: 0 }; r.dye = r.dye || 0;
    // 새 크기에서 자리가 안 맞는 가구는 보관함으로
    const keep = []; r.items.forEach(i => { if (!FURN[i.k]) return; const tmp = { items: keep }; if (fits(tmp, i.k, i.c, i.r)) keep.push(i); else { const s = nearFree(tmp, i.k, i.c, i.r); if (s) keep.push(Object.assign(i, s)); else r.invc.push({ id: rmId(), k: i.k, col: i.col || null, rc: i.rc || 0 }); } }); r.items = keep; }
  r.cols = r.cols || { wall: {}, floor: {}, frame: '' }; r.cols.wall = r.cols.wall || {}; r.cols.floor = r.cols.floor || {}; r.arc = r.arc || { wall: {}, floor: {}, frame: 0 }; r.arc.wall = r.arc.wall || {}; r.arc.floor = r.arc.floor || {}; r.invc = r.invc || []; r.dye = r.dye || 0;
  return ch;
}
function nearFree(room, k, c0, r0, dir, skip) {
  const f = FURN[k]; if (!f) return null; const cand = [], W = fw(k, dir);
  if (f.wall) { for (let c = 0; c <= COLS - W; c++) cand.push({ c, r: -1, d: Math.abs(c - c0) }); }
  else for (let r = 0; r <= ROWS - fd(k, dir); r++) for (let c = 0; c <= COLS - W; c++) cand.push({ c, r, d: Math.abs(c - c0) + Math.abs(r - r0) * 1.2 });
  cand.sort((a, b) => a.d - b.d); return cand.find(s => fits(room, k, s.c, s.r, skip, dir)) || null;
}
let ROOM_SAVE_T = 0;
const REMOVED_FURN = { gargoyle: 120, crystalball: 85, cauldron: 95, throne: 260, coffin: 90, tapestry: 80, batmirror: 75 };
function refundRemoved(r) { let back = 0, n = 0; const keep = i => { if (REMOVED_FURN[i.k] == null) return true; back += REMOVED_FURN[i.k]; n++; return false; };
  r.items = (r.items || []).filter(keep); r.invc = (r.invc || []).filter(keep); if (!n) return false;
  P.coins = (P.coins || 0) + back; setTimeout(() => toast(`분위기에 맞지 않아 빠진 가구 ${n}개의 값 ${back} 은화를 돌려드렸어요`), 400); return true; }
function myRoom() {
  if (!P.room) P.room = defaultRoom(); const r = P.room; r.inv = r.inv || {}; r.items = r.items || []; r.ow = r.ow || ['plain', 'plank'];
  if (refundRemoved(r)) { ROOM_SAVE_T = 0; setTimeout(() => saveP(), 0); }
  if (sinGift(r, typeof mySin === 'function' ? mySin() : '')) setTimeout(() => saveP(), 0);
  if (sinGift(r, 'safe')) setTimeout(() => saveP(), 0);
  if (migrateRoom(r) && Date.now() - ROOM_SAVE_T > 3000) { ROOM_SAVE_T = Date.now(); setTimeout(() => saveP(), 0); }
  return r;
}
/* 내 HO의 칠죄종 가구는 처음 한 번 무료로 방에 놓아 줘요 (자리가 없으면 보관함) */
function sinGift(r, s) {
  if (!s || !FURN[s]) return false; r.gift = r.gift || []; if (r.gift.includes(s)) return false; r.gift.push(s);
  if (r.items.some(i => i.k === s) || (r.inv && r.inv[s]) || (r.invc || []).some(x => x.k === s)) return true;   // 이미 가지고 있으면 표시만
  const p = nearFree(r, s, 5, 1); if (p) r.items.push({ id: rmId(), k: s, c: p.c, r: p.r }); else r.inv[s] = (r.inv[s] || 0) + 1; return true;
}
function hoRoom(uid) { if (ME && uid === ME.uid) return myRoom(); const p = PROGS.find(x => x.id === uid); const r = p && p.room ? JSON.parse(JSON.stringify(p.room)) : defaultRoom(); r.inv = r.inv || {}; r.items = r.items || []; migrateRoom(r); { const u = typeof USERS !== 'undefined' && USERS.find(x => x.id === uid); if (u && u.ho) sinGift(r, sinOf(u.ho)); if (u) sinGift(r, 'safe'); } return r; }
function roomCnt(k) { if (!P || !P.room) return 0; const items = (P.room.items || []); if (k === 'plant') return items.filter(i => FURN[i.k] && FURN[i.k].plant).length; if (k === 'shelf') return items.filter(i => i.k === 'shelf' || i.k === 'tallshelf').length; return items.filter(i => i.k === k).length; }
const wallCol = r => (r.cols.wall || {})[r.wall] || (WALLS[r.wall] || WALLS.plain).col, floorCol = r => (r.cols.floor || {})[r.floor] || (FLOORS[r.floor] || FLOORS.plank).col;

const layerOf = f => f.wall ? 0 : f.flat ? 1 : f.top ? 3 : 2;
/* 의자류는 책상·테이블 칸에 겹쳐 놓을 수 있어요 (끼워 넣은 모양) */
const SEATS = { chair: 1, stool: 1, armchair: 1 }, TABLES = { desk: 1, ctable: 1, rtable: 1, dtable: 1, teaset: 1, dresser: 1 };
const canOverlap = (a, b) => (SEATS[a] && TABLES[b]) || (SEATS[b] && TABLES[a]);
function fits(room, k, c, r, skipId, dir) {
  const f = FURN[k]; if (!f) return false; const w = fw(k, dir);
  if (c < 0 || c + w > COLS) return false;
  if (f.wall) return r === -1 && !room.items.some(i => { if (i.id === skipId || i.r !== -1 || !FURN[i.k]) return false; return c < i.c + fw(i.k, i.dir) && i.c < c + w; });
  const d = fd(k, dir); if (r < 0 || r + d > ROWS) return false;
  return !room.items.some(i => { if (i.id === skipId || i.r < 0) return false; const g = FURN[i.k]; if (!g || g.wall || layerOf(g) !== layerOf(f) || canOverlap(k, i.k)) return false;
    return c < i.c + fw(i.k, i.dir) && i.c < c + w && r < i.r + fd(i.k, i.dir) && i.r < r + d; });
}
function spotAt(k, x, y, dir) {
  const f = FURN[k]; if (!f) return null; const W = fw(k, dir), D = fd(k, dir);
  const c = Math.max(0, Math.min(COLS - W, Math.round((x - OX) / T - W / 2)));
  if (f.wall) return { c, r: -1 };
  return { c, r: Math.max(0, Math.min(ROWS - D, Math.round((y - FY) / T - D / 2))) };
}
function itemBox(i, room) {
  const f = FURN[i.k]; if (!f) return null; const dm = dimsOf(i.k, i.dir);
  const lift = f.top && room && room.items.some(j => j !== i && j.r >= 0 && FURN[j.k] && layerOf(FURN[j.k]) === 2 && i.c >= j.c && i.c < j.c + fw(j.k, j.dir) && i.r >= j.r && i.r < j.r + fd(j.k, j.dir)) ? 16 : 0;
  if (i.r === -1) return { x: OX + i.c * T, y: OY + (f.wy != null ? f.wy : Math.round((WALL_H - 12 - dm.h) / 2)), w: dm.w * T, h: dm.h };
  const bottom = FY + (i.r + dm.d) * T;
  return { x: OX + i.c * T, y: bottom - dm.h - lift, w: dm.w * T, h: dm.h, foot: { x: OX + i.c * T, y: FY + i.r * T, w: dm.w * T, h: dm.d * T } };
}
function itemAt(room, x, y) { return drawOrder(room).reverse().find(i => { const b = itemBox(i, room); return b && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h; }) || null; }
function drawOrder(room) {
  const L = i => { const f = FURN[i.k] || {}; return f.wall ? 0 : f.flat ? 1 : 2; };   // 위에 얹는 소품(top)은 같은 줄 가구 바로 뒤에 그려요
  // 앞뒤 순서: 아래쪽(앞) 줄일수록 나중에 · 같은 줄이면 의자가 책상 앞 · 직접 고른 앞뒤(z)는 한 줄씩 당기거나 미룸
  const key = i => i.r + fd(i.k, i.dir) + (FURN[i.k].top ? .5 : 0) + (i.z || 0) * 1.01;
  // 책상에 겹쳐 놓은 의자: 앞(정면)을 보면 책상 뒤에 앉은 모습(뒤에 그림), 그 밖의 방향은 책상 앞에 끼워 넣은 모습(앞에 그림)
  const ov = (a, b) => a.c < b.c + fw(b.k, b.dir) && b.c < a.c + fw(a.k, a.dir) && a.r < b.r + fd(b.k, b.dir) && b.r < a.r + fd(a.k, a.dir);
  const behind = i => (i.dir || 0) === 0 && i.k !== 'stool';   // 등받이 없는 스툴은 늘 앞에 끼워 넣음
  const pair = (a, b) => { if (L(a) !== L(b) || a.z || b.z) return 0; if (SEATS[a.k] && TABLES[b.k] && ov(a, b)) return behind(a) ? -1 : 1; if (SEATS[b.k] && TABLES[a.k] && ov(a, b)) return behind(b) ? 1 : -1; return 0; };
  return room.items.filter(i => FURN[i.k]).slice().sort((a, b) => L(a) - L(b) || pair(a, b) || key(a) - key(b) || (a.r + fd(a.k, a.dir)) - (b.r + fd(b.k, b.dir)) || a.c - b.c);
}
function drawSprite(g, k, x, y, t, alpha, col, dir, img) {
  const f = FURN[k]; if (!f) return; dir = dir || 0; HI_IMG = (f.pic && img) || null; HI_PH = f.pic ? f.pic.h : 0;
  g.save(); if (alpha != null) g.globalAlpha = alpha; const C = colsOf({ k, col });
  if (!g._fr || g._S == null) snapCtx(g, g.getTransform().a || 1);
  if (f.hi) { const dm = dimsOf(k, dir); f.drawHi(pen(g, x, y, dir === 3 ? dm.w * 64 : 0, .5), t || 0, C, dir); }
  else f.draw(pen(g, x, y), t || 0, C);
  g.restore();
}
function frameRect(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, 1); g.fillRect(x, y + h - 1, w, 1); g.fillRect(x, y, 1, h); g.fillRect(x + w - 1, y, 1, h); }
function paintRoom(cv, room, opts) {
  if (!cv) return; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const cssW = cv.clientWidth || RW * 2, want = Math.max(RW, Math.round(cssW * (window.devicePixelRatio || 1)));
  if (Math.abs(cv.width - want) > 1) { cv.width = want; cv.height = Math.round(want * RH / RW); }
  const S = cv.width / RW; snapCtx(g, S);
  const t = RM.t, edit = opts && opts.edit;
  drawFrame(g, room.cols.frame); drawWall(g, WALLS[room.wall] ? room.wall : 'plain', t, wallCol(room)); drawFloor(g, FLOORS[room.floor] ? room.floor : 'plank', floorCol(room));
  if (edit) { g.fillStyle = 'rgba(255,255,255,.09)'; for (let c = 0; c <= COLS; c++) g.fillRect(OX + c * T, FY, 1, ROWS * T); for (let r = 0; r <= ROWS; r++) g.fillRect(OX, FY + r * T, COLS * T, 1);
    for (let c = 0; c <= COLS; c++) g.fillRect(OX + c * T, OY + 4, 1, WALL_H - 16); }
  const dragId = RM.drag && RM.drag.moved ? RM.drag.id : null;
  drawOrder(room).forEach(i => {
    const b = itemBox(i, room); if (!b) return; const f = FURN[i.k];
    if (i.r >= 0 && !f.flat && !f.top) { g.fillStyle = 'rgba(30,15,5,.22)'; g.fillRect(b.x + 3, b.y + b.h - 5, b.w - 6, 6); g.fillRect(b.x + 7, b.y + b.h + 1, b.w - 14, 2); }
    HI_MS = i.imgMs || 140; drawSprite(g, i.k, b.x, b.y, t, i.id === dragId ? .35 : null, i.col, i.dir, i.img);
    if (edit && RM.sel === 'id:' + i.id) { frameRect(g, b.x, b.y, b.w, b.h, '#ffe08a'); if (b.foot) frameRect(g, b.foot.x, b.foot.y, b.foot.w, b.foot.h, 'rgba(255,224,138,.6)'); }
  });
  if (edit && RM.hover) {
    const k = RM.hover.k, s = RM.hover, ok = fits(room, k, s.c, s.r, RM.hover.skip, s.dir), b = itemBox({ k, c: s.c, r: s.r, dir: s.dir });
    g.fillStyle = ok ? 'rgba(120,220,120,.28)' : 'rgba(230,80,80,.32)';
    if (b.foot) g.fillRect(b.foot.x, b.foot.y, b.foot.w, b.foot.h); else g.fillRect(b.x, b.y, b.w, b.h);
    drawSprite(g, k, b.x, b.y, t, .65, RM.hover.col, s.dir);
  }
}

/* ---------- 화면 ---------- */
function roomTitle(uid) { const u = USERS.find(x => x.id === uid); if (!u) return '빈 방'; return (u.ho ? cname(u.ho) : uname(u)) + '의 방'; }
function likesOf(uid) { return ROOMLIKES.filter(l => l.owner === uid); }
function gbHtml(owner) {
  const list = GUESTBOOK.filter(g => g.owner === owner).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 40);
  const mine = ME && owner === ME.uid;
  return `<div class="panel"><h3 style="margin-top:0">📖 방명록 <span class="muted">${list.length}</span></h3>
   ${mine ? '' : `<div class="row"><input id="gbText" maxlength="300" placeholder="한마디 남기기…" onkeydown="if(event.key==='Enter'&&!event.isComposing)gbPost('${owner}')" style="flex:1"><button class="primary" onclick="gbPost('${owner}')">남기기</button></div>`}
   ${list.length ? list.map(g => `<div class="item" style="margin:6px 0"><div><b>${esc(g.code ? cname(g.code) : g.name)}</b> <span class="muted">${esc(g.name || '')} · ${ago(g.at)}</span><div class="utext" style="white-space:pre-wrap">${esc(g.text)}</div></div>
     ${(g.uid === ME.uid || mine || IS_ADMIN) ? `<button class="sm" onclick="gbDel('${g.id}')">삭제</button>` : ''}</div>`).join('') : '<p class="muted">아직 아무도 다녀가지 않았어요.</p>'}</div>`;
}
function effectsHtml(room) {
  const seen = {}, out = [];
  room.items.forEach(i => { const f = FURN[i.k]; if (!f || !f.eff) return; const key = f.plant ? 'plant' : (i.k === 'tallshelf' ? 'shelf' : i.k); seen[key] = seen[key] || { n: 0, f, name: f.plant ? '화분류' : f.name }; seen[key].n++; });
  Object.values(seen).forEach(s => out.push(`<span class="chip on" style="cursor:default">${s.name}${s.n > 1 ? ' ×' + s.n : ''} · ${s.f.eff}</span>`));
  return out.length ? `<div class="toggles">${out.join('')}</div>` : '<p class="muted" style="margin:4px 0">✨ 가구점의 일부 가구는 놓아두기만 해도 작은 효과가 있어요.</p>';
}
const fprev = (k, col, fit, dir) => { const dm = dimsOf(k, dir), W = dm.w * 32 + 4, H = Math.min(160, dm.h + 14), s = fit ? Math.min(fit / W, fit / H, 2) : 0;
  return `<canvas class="fprev" data-k="${k}" ${dir ? `data-dir="${dir}"` : ''} ${col ? `data-col='${esc(JSON.stringify(col))}'` : ''} width="${W * 2}" height="${H * 2}" ${s ? `style="width:${Math.round(W * s)}px;height:${Math.round(H * s)}px"` : ''}></canvas>`; };
function recolorLabel(rc, dye) { return rc < 1 ? '🎨 색 바꾸기 (무료 1회)' : `🎨 색 바꾸기 (염료 1 · 보유 ${dye})`; }
VIEWS.room = () => {
  const room = myRoom(), likes = likesOf(ME.uid).length;
  const selItem = RM.sel && RM.sel.startsWith('id:') ? room.items.find(i => 'id:' + i.id === RM.sel) : null;
  const selInv = RM.sel && RM.sel.startsWith('inv:') ? room.invc.find(x => 'inv:' + x.id === RM.sel) : null;
  const group = {}; room.invc.forEach(x => { if (FURN[x.k]) (group[x.k] = group[x.k] || []).push(x); });
  return `<div class="panel roompanel">
   <div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
     <h2 style="margin:0">🏠 ${esc(roomTitle(ME.uid))}</h2>
     <span class="muted">❤ ${likes} · 📖 ${GUESTBOOK.filter(g => g.owner === ME.uid).length} · 🎨 염료 ${room.dye}</span></div>
   <canvas id="roomCv" class="roomcv${RM.edit ? ' editing' : ''}" width="${RW * 2}" height="${RH * 2}"></canvas>
   <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:8px">
     <button class="${RM.edit ? 'primary' : ''}" onclick="roomEdit(${!RM.edit})">${RM.edit ? '✔ 꾸미기 끝' : '✏ 꾸미기'}</button>
     <button onclick="openFurnShop()">🛒 가구점</button>
     <button onclick="RV=null;go('visit')">👀 놀러 가기</button>
     <button onclick="go('map')">🚪 저택으로 나가기</button></div>
   ${RM.edit ? `<div class="roomedit">
     ${selItem ? `<p style="margin:6px 0"><b>${FURN[selItem.k].name}</b> 선택됨 — 옮길 칸을 누르거나 끌어서 옮겨요.</p>
        <div class="row" style="flex-wrap:wrap;gap:6px">${FURN[selItem.k].dirs ? `<button class="sm" onclick="rotateItem('${selItem.id}')">↻ 돌리기 (${DIRN[selItem.dir || 0]})</button>` : ''}<button class="sm" onclick="recolorItem('${selItem.id}')">${recolorLabel(selItem.rc || 0, room.dye)}</button>${FURN[selItem.k].pic ? `<button class="sm" onclick="picPick('${selItem.id}')">🖼 그림 넣기</button>${selItem.img ? `<button class="sm" onclick="picClear('${selItem.id}')">↺ 기본 그림</button>` : ''}` : ''}<button class="sm" onclick="zItem('${selItem.id}',1)">⬆ 앞으로</button><button class="sm" onclick="zItem('${selItem.id}',-1)">⬇ 뒤로</button><button class="sm" onclick="roomStore()">📦 보관함으로</button><button class="sm" onclick="RM.sel=null;render()">선택 해제</button></div>`
      : selInv ? `<p style="margin:6px 0"><b>${FURN[selInv.k].name}</b> — 놓을 칸을 눌러요. ${FURN[selInv.k].wall ? '(벽 장식은 위쪽 벽에)' : ''}</p><div class="row" style="flex-wrap:wrap;gap:6px">${FURN[selInv.k].dirs ? `<button class="sm" onclick="rotateItem('${selInv.id}',true)">↻ 돌리기 (${DIRN[selInv.dir || 0]})</button>` : ''}<button class="sm" onclick="recolorItem('${selInv.id}',true)">${recolorLabel(selInv.rc || 0, room.dye)}</button><button class="sm" onclick="RM.sel=null;RM.hover=null;render()">취소</button></div>`
      : '<p class="muted" style="margin:6px 0">가구를 눌러 고르고, 원하는 칸을 누르거나 끌어서 옮겨요.</p>'}
     <h4 style="margin:10px 0 4px">📦 보관함 <span class="muted">${room.invc.length}</span></h4>
     ${room.invc.length ? `<div class="toggles">${Object.entries(group).map(([k, list]) => list.map(x => `<span class="chip ${selInv === x ? 'on' : ''}" onclick="RM.sel='inv:${x.id}';RM.hover=null;render()">${fprev(k, x.col, 0, x.dir)} ${FURN[k].name}</span>`).join('')).join('')}</div>` : '<p class="muted">비어 있어요. 가구점에서 사 오세요.</p>'}
     <h4 style="margin:10px 0 4px">🧱 벽지 <button class="sm" onclick="recolorArea('wall')">${recolorLabel((room.arc.wall || {})[room.wall] || 0, room.dye).replace('색 바꾸기', '벽 색')}</button></h4><div class="toggles">${room.ow.filter(k => WALLS[k]).map(k => `<span class="chip ${room.wall === k ? 'on' : ''}" onclick="roomSet('wall','${k}')">${WALLS[k].name}</span>`).join('')}</div>
     <h4 style="margin:10px 0 4px">🪵 바닥 <button class="sm" onclick="recolorArea('floor')">${recolorLabel((room.arc.floor || {})[room.floor] || 0, room.dye).replace('색 바꾸기', '바닥 색')}</button></h4><div class="toggles">${room.ow.filter(k => FLOORS[k]).map(k => `<span class="chip ${room.floor === k ? 'on' : ''}" onclick="roomSet('floor','${k}')">${FLOORS[k].name}</span>`).join('')}</div>
     <h4 style="margin:10px 0 4px">🖼 방 테두리 <button class="sm" onclick="recolorArea('frame')">${recolorLabel(room.arc.frame || 0, room.dye).replace('색 바꾸기', '테두리 색')}</button></h4>
   </div>` : effectsHtml(room)}
  </div>${RM.edit ? '' : gbHtml(ME.uid)}`;
};
VIEWS.visit = () => {
  if (RV) {
    const room = hoRoom(RV), likes = likesOf(RV), liked = likes.some(l => l.uid === ME.uid);
    return `<div style="margin:-4px 0 10px"><button class="sm" onclick="RV=null;render()">← 방 목록</button> <button class="sm" onclick="go('room')">🏠 내 방으로</button> <button class="sm" onclick="RV=null;go('map')">🗺 지도로</button></div>
     <div class="panel roompanel"><div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
      <h2 style="margin:0">🚪 ${esc(roomTitle(RV))}</h2>
      ${RV === ME.uid ? `<span class="muted">❤ ${likes.length}</span>` : `<button class="${liked ? 'primary' : ''}" onclick="roomLike('${RV}')">${liked ? '❤' : '🤍'} 좋아요 ${likes.length}</button>`}</div>
      <canvas id="roomCv" class="roomcv" width="${RW * 2}" height="${RH * 2}"></canvas>${effectsHtml(room)}
      ${likes.length ? `<p class="muted" style="margin:6px 0 0">❤ ${likes.map(l => esc(l.name || '')).join(', ')}</p>` : ''}</div>${gbHtml(RV)}`;
  }
  const us = USERS.filter(u => u.ho).sort((a, b) => String(a.ho).localeCompare(String(b.ho)));
  return `<div style="margin:-4px 0 10px"><button class="sm" onclick="go('room')">← 내 방으로</button></div>
   <div class="panel"><h2 style="margin-top:0">👀 놀러 가기</h2><p class="muted">다른 손님의 방을 구경하고 좋아요와 방명록을 남겨 보세요.</p>
   <div class="grid g2">${us.map(u => `<div class="item rcard" onclick="RV='${u.id}';render();window.scrollTo(0,0)" style="cursor:pointer;display:block">
     <canvas class="rthumb roomcv" data-uid="${u.id}" width="${RW * 2}" height="${RH * 2}"></canvas>
     <div class="row" style="justify-content:space-between;margin-top:4px"><b>${esc(roomTitle(u.id))}</b><span class="muted">❤ ${likesOf(u.id).length} · 📖 ${GUESTBOOK.filter(g => g.owner === u.id).length}</span></div>
     <div class="muted">${esc(uname(u))}${u.id === ME.uid ? ' (나)' : ''}</div></div>`).join('') || '<p class="muted">아직 HO를 고른 손님이 없어요.</p>'}</div></div>`;
};

/* ---------- 렌더 후처리 · 애니메이션 ---------- */
function roomAfter() {
  if (tab !== 'room' && tab !== 'visit') return;
  const cv = document.getElementById('roomCv');
  if (cv) { const uid = tab === 'room' ? ME.uid : RV; paintRoom(cv, hoRoom(uid), { edit: tab === 'room' && RM.edit }); if (tab === 'room') bindRoomCv(cv); else bindViewCv(cv, uid); }
  document.querySelectorAll('canvas.rthumb').forEach(c => paintRoom(c, hoRoom(c.dataset.uid)));
  document.querySelectorAll('canvas.fprev').forEach(paintPreview);
}
function paintPreview(c) {
  const k = c.dataset.k, g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.setTransform(1, 0, 0, 1, 0, 0); g._S = 1; g.clearRect(0, 0, c.width, c.height);
  let col = null; try { col = c.dataset.col ? JSON.parse(c.dataset.col) : null; } catch (e) {}
  if (FURN[k]) { const dir = +(c.dataset.dir || 0), dm = dimsOf(k, dir), S = c.width / (dm.w * 32 + 4); snapCtx(g, S); const lh = c.height / S;
    drawSprite(g, k, 2, Math.max(8, lh - dm.h - 2), RM.t, null, col, dir); return; }
  const tmp = document.createElement('canvas'); tmp.width = RW; tmp.height = RH; const tg = tmp.getContext('2d');
  if (WALLS[k]) { drawWall(tg, k, 0, col && col.a); g.drawImage(tmp, OX + 40, OY + 20, 64, 64, 0, 0, c.width, c.height); }
  if (FLOORS[k]) { drawFloor(tg, k, col && col.a); g.drawImage(tmp, OX + 40, FY + 40, 64, 64, 0, 0, c.width, c.height); }
}
let RM_HALF = 0;
setInterval(() => {      // 140ms마다: 평소엔 두 번에 한 번 그리고, 움직이는 그림이 있으면 매번 그려요
  RM_HALF ^= 1; if (!RM_HALF) RM.t++;
  if (!ME || !P || (tab !== 'room' && tab !== 'visit') || document.hidden) return;
  const cv = document.getElementById('roomCv'), room = cv && hoRoom(tab === 'room' ? ME.uid : RV);
  if (cv && (!RM_HALF || room.items.some(i => i.imgMs))) paintRoom(cv, room, { edit: tab === 'room' && RM.edit });
  if (!RM_HALF && RM.t % 4 === 0) document.querySelectorAll('canvas.rthumb').forEach(c => paintRoom(c, hoRoom(c.dataset.uid)));
}, 140);

/* ---------- 조작 ---------- */
function cvPos(cv, ev) { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * RW, y: (ev.clientY - r.top) / r.height * RH }; }
const ROOM_TALK = { sofa: ['푹신한 벨벳 소파.'], loveseat: ['둘이 앉기 딱 좋다.'], fireplace: ['장작이 타닥타닥 탄다.'], armchair: ['앉으면 잠들 것 같다.'], wclock: ['째깍, 째깍.'], gallery: ['추억이 담긴 액자들.'],
  cat: ['냐아.', '골골골…', '(꼬리를 살랑인다)'], gclock: ['똑딱, 똑딱.'], piano: ['♪ 도-미-솔'], harp: ['♪ 맑은 소리가 울린다.'], gramophone: ['♪ 오래된 왈츠가 흐른다.'], teaset: ['향긋한 홍차 냄새.'], safe: ['단단히 잠겨 있다.'], chest: ['무엇이 들었을까?'],
  mirror: ['거울 속의 나와 눈이 마주쳤다.'], envy: ['거울 속 눈이… 나를 본다?'], window: ['창밖 숲이 보인다.'], plant: ['잎이 싱그럽다.'], bed: ['폭신해 보인다.'], canopy: ['공주님 침대 같다.'],
  mannequin: ['누가 입던 드레스일까.'], apron: ['어디선가 시계 소리가 들리는 것 같다.'], lectern: ['읽다 만 페이지에 책갈피가 끼워져 있다.'], rosedome: ['꽃잎이 하나 떨어졌다.'], raven: ['까악!'],
  wrath: ['불길이 거세다!'], greed: ['반짝반짝… 전부 내 거야.'], sloth: ['조금만 더 잘래…'], gluttony: ['한 입만…'], pride: ['역시 나야.'], lust: ['장미 향기가 난다.'], teddy: ['폭신폭신.'], birdcage: ['짹짹!'], globe: ['빙글빙글.'], telescope: ['별이 가까이 보인다.'] };
function roomPoke(i) { const f = FURN[i.k]; const l = ROOM_TALK[i.k]; sfx(i.k === 'cat' || i.k === 'raven' ? 'pop' : 'tap'); toast(`${f.name} — ${l ? l[Math.floor(Math.random() * l.length)] : ''}${f.eff ? ' (' + f.eff + ')' : ''}`); }
function bindViewCv(cv, uid) { cv.onclick = ev => { const p = cvPos(cv, ev), i = itemAt(hoRoom(uid), p.x, p.y); if (!i) return; if (i.k === 'safe' && typeof safeTry === 'function') safeTry(uid, i); else roomPoke(i); }; }
const selInvOf = room => RM.sel && RM.sel.startsWith('inv:') ? room.invc.find(x => 'inv:' + x.id === RM.sel) : null;
function bindRoomCv(cv) {
  cv.onpointerdown = ev => {
    const p = cvPos(cv, ev), room = myRoom();
    if (!RM.edit) { const i = itemAt(room, p.x, p.y); if (i) roomPoke(i); return; }
    const hit = itemAt(room, p.x, p.y);
    if (hit && !selInvOf(room)) { RM.drag = { id: hit.id, x0: p.x, y0: p.y, moved: false }; window.GAME_LOCK = true; try { cv.setPointerCapture(ev.pointerId); } catch (e) {} }
    else RM.drag = { id: null, x0: p.x, y0: p.y, moved: false };
    ev.preventDefault();
  };
  cv.onpointermove = ev => {
    if (!RM.edit) return; const p = cvPos(cv, ev), room = myRoom();
    if (RM.drag && RM.drag.id) {
      if (Math.abs(p.x - RM.drag.x0) + Math.abs(p.y - RM.drag.y0) > 10) RM.drag.moved = true;
      if (RM.drag.moved) { const it = room.items.find(i => i.id === RM.drag.id); const s = spotAt(it.k, p.x, p.y, it.dir); RM.hover = { k: it.k, c: s.c, r: s.r, skip: it.id, col: it.col, dir: it.dir }; paintRoom(cv, room, { edit: true }); }
    } else { const x = selInvOf(room); if (x && ev.pointerType === 'mouse') { const s = spotAt(x.k, p.x, p.y, x.dir); RM.hover = { k: x.k, c: s.c, r: s.r, col: x.col, dir: x.dir }; paintRoom(cv, room, { edit: true }); } }
  };
  cv.onpointerleave = () => { if (RM.edit && !(RM.drag && RM.drag.id) && RM.hover) { RM.hover = null; paintRoom(cv, myRoom(), { edit: true }); } };
  cv.onpointerup = ev => {
    if (!RM.edit) return; const p = cvPos(cv, ev), room = myRoom(), d = RM.drag; RM.drag = null; window.GAME_LOCK = false;
    if (d && d.id && d.moved) { const it = room.items.find(i => i.id === d.id); const s = spotAt(it.k, p.x, p.y, it.dir); RM.hover = null; RM.sel = 'id:' + it.id; moveItem(it, s); return; }
    const inv = selInvOf(room); if (inv) { placeInv(inv, spotAt(inv.k, p.x, p.y, inv.dir)); return; }
    const hit = itemAt(room, p.x, p.y);
    if (hit) { RM.sel = RM.sel === 'id:' + hit.id ? null : 'id:' + hit.id; sfx('tap'); render(); return; }
    if (RM.sel && RM.sel.startsWith('id:')) { const it = room.items.find(i => 'id:' + i.id === RM.sel); if (it) moveItem(it, spotAt(it.k, p.x, p.y, it.dir)); return; }
    render();
  };
  cv.onpointercancel = () => { RM.drag = null; RM.hover = null; window.GAME_LOCK = false; render(); };
}
function moveItem(it, s) { const room = myRoom(); if (!fits(room, it.k, s.c, s.r, it.id, it.dir)) { sfx('bad'); toast('거기엔 이미 무언가 있어요'); render(); return; } it.c = s.c; it.r = s.r; sfx('tap'); saveP(); render(); }
function placeInv(x, s) {
  const room = myRoom(), f = FURN[x.k]; if (!s) return;
  if (!fits(room, x.k, s.c, s.r, null, x.dir)) { sfx('bad'); toast('거기엔 이미 무언가 있어요'); return; }
  room.invc = room.invc.filter(y => y !== x); const it = { id: rmId(), k: x.k, c: s.c, r: s.r }; if (x.col) it.col = x.col; if (x.rc) it.rc = x.rc; if (x.dir) it.dir = x.dir; if (x.img) it.img = x.img; if (x.imgMs) it.imgMs = x.imgMs; room.items.push(it);
  const next = room.invc.find(y => y.k === x.k); RM.sel = next ? 'inv:' + next.id : null; RM.hover = null; sfx('pop'); saveP(); render();
  if (f.eff && f.max && roomCnt(x.k) > f.max) toast(`효과는 ${f.max}개까지만 적용돼요`);
}
function roomStore() {
  const room = myRoom(), it = room.items.find(i => 'id:' + i.id === RM.sel); if (!it) return;
  room.items = room.items.filter(i => i !== it); const sv = { id: rmId(), k: it.k, col: it.col || null, rc: it.rc || 0, dir: it.dir || 0 }; if (it.img) sv.img = it.img; if (it.imgMs) sv.imgMs = it.imgMs; room.invc.push(sv); RM.sel = null; sfx('tap'); saveP(); render();
}
const DIRN = ['앞', '왼쪽', '뒤', '오른쪽'];
function zItem(id, d) { const it = myRoom().items.find(i => i.id === id); if (!it) return; const z = Math.max(-3, Math.min(3, (it.z || 0) + d)); if (z === (it.z || 0)) { toast(d > 0 ? '더 앞으로는 못 가요' : '더 뒤로는 못 가요'); return; } it.z = z; if (!it.z) delete it.z; sfx('tap'); saveP(); render(); }
/* 그림 넣기: 고른 사진을 액자 비율로 잘라 작은 도트 그림으로 바꿔 저장 (방 구경하는 모두에게 보여요) */
function picPick(id) {
  const it = myRoom().items.find(i => i.id === id); if (!it || !FURN[it.k].pic) return;
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = async () => { const file = inp.files && inp.files[0]; if (!file) return;
    if (typeof gifStrip === 'function') { try { const s = await gifStrip(file, FURN[it.k].pic, pixelize); if (s) { it.img = s.url; it.imgMs = s.ms; delete PIXC[it.img]; saveP(); sfx('ok'); toast(`움직이는 그림을 넣었어요! (${s.n}장면)`); render(); return; } } catch (e) {} }
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => { try { it.img = pixelize(im, FURN[it.k].pic); delete it.imgMs; delete PIXC[it.img]; saveP(); sfx('ok'); toast('그림을 넣었어요! 도트로 바꿔서 걸었어요'); render(); } catch (e) { toast('그림을 바꾸지 못했어요'); } URL.revokeObjectURL(url); };
    im.onerror = () => { toast('이 파일은 그림으로 열 수 없어요'); URL.revokeObjectURL(url); }; im.src = url; };
  inp.click();
}
function pixelize(im, sz) {
  const W = sz.w, H = sz.h, ar = W / H, iw = im.naturalWidth || im.width, ih = im.naturalHeight || im.height;
  let sw = iw, sh = iw / ar; if (sh > ih) { sh = ih; sw = ih * ar; } const sx = (iw - sw) / 2, sy = (ih - sh) / 2;
  // 두 단계로 줄여서 평균 색을 얻고, 색 단계를 줄여 도트 느낌으로
  const mid = document.createElement('canvas'); mid.width = W * 4; mid.height = H * 4; const mg = mid.getContext('2d'); mg.imageSmoothingQuality = 'high'; mg.drawImage(im, sx, sy, sw, sh, 0, 0, mid.width, mid.height);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(mid, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H), a = d.data, q = v => Math.max(0, Math.min(255, Math.round(Math.round(v / 255 * 7) / 7 * 255)));
  for (let i = 0; i < a.length; i += 4) { const m = (a[i] + a[i + 1] + a[i + 2]) / 3; for (let k = 0; k < 3; k++) a[i + k] = q(m + (a[i + k] - m) * 1.15); a[i + 3] = 255; }
  g.putImageData(d, 0, 0); return cv.toDataURL('image/png');
}
function picClear(id) { const it = myRoom().items.find(i => i.id === id); if (!it) return; delete it.img; delete it.imgMs; saveP(); sfx('tap'); render(); }
function rotateItem(id, inInv) {
  const room = myRoom(), it = inInv ? room.invc.find(x => x.id === id) : room.items.find(i => i.id === id); if (!it) return; const f = FURN[it.k]; if (!f || !f.dirs) return;
  const cur = it.dir || 0, order = f.dirs, start = order.indexOf(cur);
  for (let n = 1; n <= order.length; n++) { const nd = order[(start + n) % order.length];
    if (inInv) { it.dir = nd; sfx('tap'); saveP(); render(); return; }
    if (fits(room, it.k, it.c, it.r, it.id, nd)) { it.dir = nd; sfx('tap'); saveP(); render(); return; }
    const s = nearFree(room, it.k, it.c, it.r, nd, it.id); if (s && Math.abs(s.c - it.c) + Math.abs(s.r - it.r) <= 3) { it.dir = nd; it.c = s.c; it.r = s.r; sfx('tap'); saveP(); render(); return; } }
  sfx('bad'); toast('돌릴 자리가 없어요');
}
function roomEdit(on) { RM.edit = on; RM.sel = null; RM.hover = null; render(); }
function roomSet(slot, k) { const room = myRoom(); room[slot] = k; sfx('tap'); saveP(); render(); }

/* ---------- 색 고르기 창 ---------- */
let CM = null;
function colorModal(o) { CM = o; cmDraw(); }
function cmDraw() {
  const o = CM; if (!o) return;
  const rows = o.parts.map(([s, label]) => `<div style="margin:8px 0"><b>${label}</b> <span class="muted" style="font-size:.8rem">${o.cols[s]}</span>
     <div class="swrow">${SWATCH.map(h => `<button class="sw ${o.cols[s] === h ? 'on' : ''}" style="background:${h}" onclick="CM.cols['${s}']='${h}';cmDraw()"></button>`).join('')}<label class="sw swc" title="직접 고르기"><input type="color" value="${o.cols[s]}" oninput="CM.cols['${s}']=this.value;cmPrev()" onchange="cmDraw()">＋</label></div></div>`).join('');
  modal(`<div class="cmodal"><h2 style="color:var(--gold2);margin-top:0">🎨 ${esc(o.title)}</h2>
   <div style="text-align:center;background:#1a1210;padding:8px;margin-bottom:6px"><canvas id="cmPrev" width="${o.pw * 2}" height="${o.ph * 2}" style="height:${Math.min(150, o.ph * 1.6)}px;image-rendering:pixelated"></canvas></div>
   ${rows}<p class="muted" style="margin:6px 0">${o.note || ''}</p>
   <div class="row"><button onclick="CM=null;closeModal();${o.back || ''}">취소</button><button onclick="cmReset()">기본 색</button><button class="primary" onclick="cmOk()">${esc(o.okText || '확인')}</button></div></div>`);
  cmPrev();
}
function cmPrev() { const c = document.getElementById('cmPrev'); if (!c || !CM) return; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.setTransform(1, 0, 0, 1, 0, 0); g._S = null; g.clearRect(0, 0, c.width, c.height); g.setTransform(2, 0, 0, 2, 0, 0); CM.preview(g, CM.cols); }
function cmReset() { CM.cols = Object.assign({}, CM.defs); cmDraw(); }
function cmOk() { const o = CM; CM = null; o.onOk(Object.assign({}, o.cols)); }
function furnColorModal(k, cols, title, okText, note, onOk, back) {
  const f = FURN[k], seen = {}, parts = Object.entries(f.parts || {}).map(([s, [n]]) => { let l = PN[n] || n; seen[l] = (seen[l] || 0) + 1; return [s, seen[l] > 1 ? l + ' ' + seen[l] : l]; }), defs = defCol(k);
  colorModal({ title, okText, note, back, parts, defs, cols: Object.assign({}, defs, cols || {}), pw: dimsOf(k).w * 32 + 8, ph: Math.min(160, dimsOf(k).h + 16),
    preview: (g, col) => drawSprite(g, k, 4, Math.max(10, Math.min(160, dimsOf(k).h + 16) - dimsOf(k).h - 4), RM.t, null, col), onOk });
}
function useRecolor(rc) { const room = myRoom(); if ((rc || 0) < 1) return true; if (room.dye > 0) { room.dye--; return true; } toast('염료가 없어요. 가구점 「염료」에서 살 수 있어요'); sfx('bad'); return false; }
function recolorItem(id, inInv) {
  const room = myRoom(), it = inInv ? room.invc.find(x => x.id === id) : room.items.find(i => i.id === id); if (!it) return; const rc = it.rc || 0;
  if (rc >= 1 && room.dye < 1) { toast('염료가 없어요. 가구점 「염료」에서 살 수 있어요'); sfx('bad'); return; }
  furnColorModal(it.k, it.col, `${FURN[it.k].name} 색 바꾸기`, rc < 1 ? '무료로 바꾸기' : '염료 1개로 바꾸기', rc < 1 ? '살 때 고른 뒤 한 번은 무료로 바꿀 수 있어요. 그다음부터는 염료가 들어요.' : `염료 보유 ${room.dye}개`,
    cols => { if (!useRecolor(rc)) return; it.col = cols; it.rc = rc + 1; saveP(); sfx('spark'); closeModal(); render(); });
}
function areaPreview(slot, style) { return (g, col) => { const tmp = document.createElement('canvas'); tmp.width = RW; tmp.height = RH; const tg = tmp.getContext('2d');
  if (slot === 'wall') { drawWall(tg, style, RM.t, col.a); g.drawImage(tmp, OX + 40, OY, 120, 96, 0, 0, 120, 96); }
  else if (slot === 'floor') { drawFloor(tg, style, col.a); g.drawImage(tmp, OX + 40, FY + 20, 120, 96, 0, 0, 120, 96); }
  else { drawFrame(tg, col.a); drawWall(tg, 'plain', 0); g.drawImage(tmp, 0, 0, 120, 96, 0, 0, 120, 96); } }; }
function recolorArea(slot) {
  const room = myRoom(), style = slot === 'wall' ? room.wall : slot === 'floor' ? room.floor : 'frame';
  const cur = slot === 'wall' ? wallCol(room) : slot === 'floor' ? floorCol(room) : (room.cols.frame || '#5a3a22');
  const def = slot === 'wall' ? WALLS[style].col : slot === 'floor' ? FLOORS[style].col : '#5a3a22';
  const rc = slot === 'frame' ? (room.arc.frame || 0) : ((room.arc[slot] || {})[style] || 0);
  if (rc >= 1 && room.dye < 1) { toast('염료가 없어요. 가구점 「염료」에서 살 수 있어요'); sfx('bad'); return; }
  colorModal({ title: { wall: '벽 색', floor: '바닥 색', frame: '방 테두리 색' }[slot], okText: rc < 1 ? '무료로 바꾸기' : '염료 1개로 바꾸기', note: rc < 1 ? '처음 한 번은 무료예요.' : `염료 보유 ${room.dye}개`,
    parts: [['a', '색']], defs: { a: def }, cols: { a: cur }, pw: 120, ph: 96, preview: areaPreview(slot, style),
    onOk: cols => { if (!useRecolor(rc)) return; if (slot === 'frame') { room.cols.frame = cols.a; room.arc.frame = rc + 1; } else { room.cols[slot][style] = cols.a; room.arc[slot][style] = rc + 1; } saveP(); sfx('spark'); closeModal(); render(); } });
}

/* ---------- 가구점 ---------- */
let SHOPTAB = 'bed';
const price = c => Math.round(c * (typeof shopMul === 'function' ? shopMul() : 1));
function openFurnShop() {
  const room = myRoom();
  const tabs = [...FCATS, ['wp', '벽지'], ['fl', '바닥'], ['dye', '염료']];
  if (!tabs.some(([k]) => k === SHOPTAB)) SHOPTAB = 'bed';
  const owned = k => room.invc.filter(x => x.k === k).length + room.items.filter(i => i.k === k).length;
  let list = '';
  if (SHOPTAB === 'dye') {
    list = `<div class="item" style="margin:6px 0"><div style="flex:1"><b>🎨 염료</b><div class="muted" style="font-size:.85rem">색을 다시 바꿀 때 1개씩 써요 (첫 한 번은 무료).</div><div>보유 <b>${room.dye}</b>개</div></div>
      <div style="display:flex;flex-direction:column;gap:4px"><button onclick="buyDye(1)" ${P.coins < price(DYE_COST) ? 'disabled' : ''}>1개 · ${price(DYE_COST)} 은화</button><button onclick="buyDye(5)" ${P.coins < price(DYE5_COST) ? 'disabled' : ''}>5개 · ${price(DYE5_COST)} 은화</button></div></div>`;
  } else if (SHOPTAB === 'wp' || SHOPTAB === 'fl') {
    const TT = SHOPTAB === 'wp' ? WALLS : FLOORS, slot = SHOPTAB === 'wp' ? 'wall' : 'floor';
    list = Object.entries(TT).map(([k, w]) => { const has = room.ow.includes(k), col = (room.cols[slot] || {})[k] || w.col; return `<div class="item" style="margin:6px 0">
      <canvas class="fprev" data-k="${k}" data-col='${JSON.stringify({ a: col })}' width="64" height="64" style="width:56px;height:56px"></canvas>
      <div style="flex:1;margin-left:10px"><b>${w.name}</b>${room[slot] === k ? ' <span class="badge live">사용 중</span>' : ''}</div>
      ${has ? (room[slot] === k ? '' : `<button onclick="roomSet('${slot}','${k}');openFurnShop()">적용</button>`) : `<button onclick="buyDeco('${slot}','${k}')" ${P.coins < price(w.cost) ? 'disabled' : ''}>${price(w.cost)} 은화</button>`}</div>`; }).join('');
  } else {
    list = Object.entries(FURN).filter(([k, f]) => f.cat === SHOPTAB).map(([k, f]) => `<div class="item" style="margin:6px 0">
      <div style="width:84px;text-align:center;flex:0 0 84px">${fprev(k, null, 84)}</div>
      <div style="flex:1;margin-left:8px"><b>${f.name}</b><span class="muted"> (${f.wall ? f.w + '칸' : fw(k) + '×' + fd(k) + '칸'}${f.dirs ? ' · 4방향' : ''})</span>${owned(k) ? ` <span class="badge">보유 ${owned(k)}</span>` : ''}
      ${f.eff ? `<div style="color:var(--gold2);font-size:.85rem">✨ ${f.eff}</div>` : ''}<div class="muted" style="font-size:.78rem">색: ${Object.values(f.parts || {}).map(([n]) => PN[n] || n).join(' · ')}</div></div>
      <button onclick="buyFurn('${k}')" ${P.coins < price(f.cost) ? 'disabled' : ''}>${price(f.cost)} 은화</button></div>`).join('');
  }
  modal(`<h2 style="color:var(--gold2);margin-top:0">🛒 저택 가구점</h2><p class="muted" style="margin:0 0 6px">보유 은화 <b>${P.coins}</b> · 염료 ${room.dye}${mySin() === 'envy' ? ' · 질투의 눈썰미로 10% 할인 중' : ''}</p>
   <div class="toggles">${tabs.map(([k, v]) => `<span class="chip ${SHOPTAB === k ? 'on' : ''}" onclick="SHOPTAB='${k}';openFurnShop()">${v}</span>`).join('')}</div>
   <div style="max-height:58vh;overflow:auto">${list}</div><button style="width:100%;margin-top:8px" onclick="closeModal();render()">닫기</button>`);
  document.querySelectorAll('#mbox canvas.fprev').forEach(c => { c.style.imageRendering = 'pixelated'; paintPreview(c); });
}
function buyFurn(k) {
  const f = FURN[k], c = price(f.cost); if (P.coins < c) return toast('은화가 부족해요');
  furnColorModal(k, null, `${f.name} — 색 고르고 사기`, `${c} 은화로 사기`, '산 뒤에도 한 번은 무료로 색을 바꿀 수 있어요.', cols => {
    if (!spend(c)) return; const room = myRoom(); room.invc.push({ id: rmId(), k, col: cols, rc: 0 }); saveP(); sfx('ok'); toast(`${f.name}을(를) 샀어요! 꾸미기에서 놓아 보세요`); openFurnShop(); }, 'openFurnShop()');
}
function buyDeco(slot, k) {
  const TT = slot === 'wall' ? WALLS : FLOORS, c = price(TT[k].cost); if (P.coins < c) return toast('은화가 부족해요');
  colorModal({ title: `${TT[k].name} — 색 고르고 사기`, okText: `${c} 은화로 사기`, note: '산 뒤에도 한 번은 무료로 색을 바꿀 수 있어요.', back: 'openFurnShop()', parts: [['a', '색']], defs: { a: TT[k].col }, cols: { a: TT[k].col }, pw: 120, ph: 96, preview: areaPreview(slot, k),
    onOk: cols => { if (!spend(c)) return; const room = myRoom(); if (!room.ow.includes(k)) room.ow.push(k); room[slot] = k; room.cols[slot][k] = cols.a; room.arc[slot][k] = 0; saveP(); sfx('ok'); openFurnShop(); } });
}
function buyDye(n) { const c = price(n === 5 ? DYE5_COST : DYE_COST); if (!spend(c)) return; const room = myRoom(); room.dye = (room.dye || 0) + n; saveP(); sfx('ok'); toast(`염료 ${n}개를 샀어요`); openFurnShop(); }

/* ---------- 좋아요 · 방명록 ---------- */
async function roomLike(owner) {
  if (!ME || owner === ME.uid) return; const id = owner + '_' + ME.uid;
  try { if (ROOMLIKES.some(l => l.id === id)) await B.del('roomLikes/' + id); else { await B.set('roomLikes/' + id, { owner, uid: ME.uid, name: PROF.name || '', at: Date.now() }); sfx('spark'); } }
  catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function gbPost(owner) {
  const el = document.getElementById('gbText'), text = (el && el.value || '').trim(); if (!text) return;
  try { await B.add('guestbook', { owner, uid: ME.uid, name: PROF.name || '', code: PROF.ho || '', text: text.slice(0, 300), at: Date.now() }); el.value = ''; el.blur(); sfx('ok'); render(); }
  catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function gbDel(id) { if (!confirm('이 글을 지울까요?')) return; try { await B.del('guestbook/' + id); } catch (e) { toast('실패: ' + (e.code || e.message)); } }

function roomOnAuth(u) {
  roomUnsubs.forEach(f => { try { f(); } catch (e) {} }); roomUnsubs = []; ROOMLIKES = []; GUESTBOOK = []; RM = { edit: false, sel: null, drag: null, hover: null, t: RM.t }; RV = null;
  if (!u) return;
  roomUnsubs.push(B.onCol('roomLikes', l => { ROOMLIKES = l; if (tab === 'room' || tab === 'visit') softRender(); }));
  if (typeof theftWatch === 'function') theftWatch();
  roomUnsubs.push(B.onCol('guestbook', l => { GUESTBOOK = l; if (tab === 'room' || tab === 'visit') softRender(); }));
}
