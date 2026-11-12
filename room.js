/* ============================================================
   Ⅶ・peccata — 내 방 (도트 그래픽 방 꾸미기 · 놀러 가기 · 좋아요 · 방명록)
   데이터: progress/{uid}.room = {wall, floor, ow:[소유 벽지·바닥], inv:{가구:개수}, items:[{id,k,c,r}]}
           r = -1 이면 벽 장식(벽 칸 c), 0~2 면 바닥 줄
   ============================================================ */
const RW = 128, RH = 96, WALL_H = 44, FLOOR_Y = 48, CELL = 16, COLS = 8, ROWS = 3;

/* ---------- 도트 스프라이트 ---------- */
// d(c, t): c(x,y,w,h,색) 으로 그림, t = 애니메이션 프레임
const FURN = {
  bed: { name: '침대', cost: 60, w: 2, h: 16, draw(c) {
    c(0,0,3,16,'#3e2817'); c(0,0,3,1,'#5a3a24'); c(0,5,32,9,'#5a3a24'); c(3,4,28,6,'#f1ead8');
    c(11,4,20,8,'#8a2433'); c(11,4,20,1,'#a83a4a'); c(13,7,16,1,'#6e1b28'); c(4,2,7,5,'#fffaf0'); c(4,6,7,1,'#d8d0c0');
    c(29,5,3,11,'#3e2817'); c(1,14,2,2,'#2a1a0e'); c(29,14,2,2,'#2a1a0e'); } },
  desk: { name: '책상', cost: 30, w: 1, h: 16, draw(c) {
    c(0,5,16,3,'#7a4e2c'); c(0,5,16,1,'#9a6a3e'); c(1,8,2,8,'#5a3a24'); c(13,8,2,8,'#5a3a24');
    c(8,8,5,5,'#6a4426'); c(10,10,1,1,'#c9a96a'); c(2,2,6,3,'#3a5a8a'); c(2,2,6,1,'#4a6a9a'); c(10,2,2,3,'#222'); c(12,0,1,3,'#f1ead8'); } },
  chair: { name: '의자', cost: 15, w: 1, h: 16, draw(c) {
    c(3,0,10,2,'#6a4426'); c(3,0,2,10,'#6a4426'); c(11,0,2,10,'#6a4426'); c(5,2,6,6,'#8a2433');
    c(2,8,12,3,'#8a2433'); c(2,8,12,1,'#a83a4a'); c(3,11,2,5,'#5a3a24'); c(11,11,2,5,'#5a3a24'); } },
  shelf: { name: '책장', cost: 120, w: 1, h: 32, eff: '수수께끼 힌트 20% 할인', draw(c) {
    c(0,0,16,32,'#5a3a24'); c(1,1,14,30,'#2e1e12'); c(1,11,14,1,'#5a3a24'); c(1,21,14,1,'#5a3a24');
    const cols = ['#8a2433','#3a5a8a','#c9a96a','#3f6b3a','#6a4a8a','#a0522d','#e8dcc0'];
    [1,12,22].forEach((y, row) => { let x = 2; for (let i = 0; x < 14; i++) { const w = (i + row) % 3 ? 2 : 1, h = 8 + ((i * 7 + row) % 3) - 1; c(x, y + 9 - h, w, h, cols[(i * 3 + row * 2) % cols.length]); x += w; if (i % 3 === 2) x++; } }); } },
  plant: { name: '화분', cost: 80, w: 1, h: 24, eff: '온실 성장 5% 빨라짐 (최대 3개)', max: 3, draw(c, t) {
    const s = (t >> 2) % 2;
    c(4,16,8,8,'#a0522d'); c(3,16,10,2,'#b8693d'); c(5,22,6,2,'#8a4224');
    c(7,4,2,12,'#3f6b3a'); c(3-s,6,4,3,'#4f8a45'); c(9+s,3,4,3,'#4f8a45'); c(2,10,5,3,'#3f6b3a'); c(9,9,5,3,'#5fa055'); c(6,1,4,3,'#5fa055'); c(7,0,2,1,'#7fc070'); } },
  lamp: { name: '스탠드', cost: 25, w: 1, h: 32, draw(c) {
    c(4,29,8,3,'#3a3030'); c(7,10,2,19,'#6a5a4a'); c(3,2,10,8,'#e8c77a'); c(4,1,8,1,'#d8b76a'); c(3,9,10,1,'#c8a75a'); c(2,10,12,1,'rgba(255,242,192,.5)'); } },
  wardrobe: { name: '옷장', cost: 70, w: 1, h: 32, draw(c) {
    c(0,0,16,32,'#6a4426'); c(0,0,16,2,'#4a2e1a'); c(1,3,6,27,'#7a5030'); c(9,3,6,27,'#7a5030');
    c(2,4,4,10,'#8a5a38'); c(10,4,4,10,'#8a5a38'); c(6,16,1,3,'#c9a96a'); c(9,16,1,3,'#c9a96a'); c(1,30,2,2,'#3e2817'); c(13,30,2,2,'#3e2817'); } },
  rug: { name: '양탄자', cost: 40, w: 2, h: 16, flat: true, draw(c) {
    c(1,3,30,11,'#6e1b28'); c(3,5,26,7,'#a83a4a'); c(6,7,20,3,'#c9a96a'); c(14,6,4,5,'#6e1b28');
    for (let i = 0; i < 6; i++) { c(0,3+i*2,1,1,'#e8dcc0'); c(31,4+i*2,1,1,'#e8dcc0'); } } },
  teaset: { name: '찻상', cost: 150, w: 1, h: 16, eff: '티룸 팁 +1', draw(c, t) {
    c(2,8,12,2,'#e8e0d0'); c(2,10,12,1,'#c8c0b0'); c(7,11,2,4,'#5a3a24'); c(4,15,8,1,'#5a3a24');
    c(4,3,6,5,'#f4f0e8'); c(3,4,1,3,'#f4f0e8'); c(10,4,2,1,'#f4f0e8'); c(6,2,2,1,'#c9a96a'); c(5,5,4,1,'#3a5a8a'); c(11,6,2,2,'#f4f0e8');
    if ((t >> 1) % 3 === 0) c(11,1,1,2,'rgba(255,255,255,.5)'); else if ((t >> 1) % 3 === 1) c(12,0,1,2,'rgba(255,255,255,.4)'); } },
  safe: { name: '금고', cost: 200, w: 1, h: 16, eff: '출석 보상 +3 (최대 2개)', max: 2, draw(c) {
    c(1,2,14,13,'#3a3f48'); c(2,3,12,11,'#5a606a'); c(2,3,12,1,'#6a707a'); c(6,6,4,4,'#c9a96a'); c(7,7,2,2,'#3a3f48');
    c(11,8,2,1,'#c9a96a'); c(2,15,2,1,'#222'); c(12,15,2,1,'#222'); } },
  piano: { name: '피아노', cost: 250, w: 2, h: 24, draw(c) {
    c(0,2,32,18,'#1e1a1a'); c(0,2,32,1,'#3a3434'); c(11,5,10,6,'#f1ead8'); c(12,6,3,1,'#555'); c(16,8,4,1,'#555');
    c(1,12,30,4,'#f4f0e8'); for (let x = 3; x < 30; x += 4) { c(x,12,2,2,'#111'); } c(1,16,30,1,'#111');
    c(2,20,2,4,'#1e1a1a'); c(28,20,2,4,'#1e1a1a'); c(4,0,1,2,'#f4f0e8'); c(4,-1,1,1,'#ffb347'); } },
  gclock: { name: '괘종시계', cost: 300, w: 1, h: 32, eff: '혼자 하는 게임 하루 보상 +1회', draw(c, t) {
    c(3,1,10,31,'#5a3a24'); c(2,0,12,3,'#4a2e1a'); c(5,4,6,6,'#f1ead8'); c(7,5,1,3,'#222'); c(8,7,2,1,'#222');
    c(6,13,4,15,'#2a1a0e'); const sw = [0,1,1,0,-1,-1][t % 6]; c(7+sw,14,1,7,'#c9a96a'); c(6+sw,21,3,3,'#e8c77a'); c(2,30,12,2,'#4a2e1a'); } },
  cat: { name: '검은 고양이', cost: 180, w: 1, h: 16, eff: '이스터에그 반짝임 범위 넓어짐', draw(c, t) {
    const k = '#1a1a1e', tail = (t >> 1) % 4;
    c(4,8,8,7,k); c(3,14,10,2,k); c(5,3,6,6,k); c(5,2,1,2,k); c(10,2,1,2,k);
    if (t % 17) { c(6,5,1,1,'#e8c77a'); c(9,5,1,1,'#e8c77a'); } c(7,7,2,1,'#3a3a40');
    c(12,12,2,2,k); c(13 + (tail > 1 ? 1 : 0), 8 + tail, 1, 5 - tail, k); } },
  candle: { name: '촛대', cost: 35, w: 1, h: 16, draw(c, t) {
    c(6,14,4,2,'#c9a96a'); c(7,8,2,6,'#c9a96a'); c(3,8,10,1,'#c9a96a'); c(3,7,1,1,'#c9a96a'); c(12,7,1,1,'#c9a96a');
    c(3,4,2,3,'#f4f0e8'); c(7,3,2,5,'#f4f0e8'); c(11,4,2,3,'#f4f0e8');
    const f = t % 2 ? '#ffb347' : '#ffd27a'; c(3,2,2,2,f); c(7,1,2,2,f); c(11,2,2,2,f); c(8,0,1,1,'#fff2c0'); } },
  chest: { name: '보물상자', cost: 45, w: 1, h: 16, draw(c) {
    c(1,7,14,9,'#7a4e2c'); c(1,4,14,4,'#8a5a34'); c(2,3,12,1,'#8a5a34'); c(1,7,14,1,'#5a3a24');
    c(4,3,1,13,'#c9a96a'); c(11,3,1,13,'#c9a96a'); c(7,8,2,3,'#e8c77a'); } },
  /* --- 벽 장식 --- */
  painting: { name: '풍경화', cost: 40, wall: true, w: 1, h: 16, draw(c) {
    c(0,0,16,14,'#c9a96a'); c(1,1,14,12,'#8a6a3a'); c(2,2,12,10,'#2a3a5a'); c(9,3,2,2,'#f1ead8'); c(2,8,12,4,'#2e4a2e'); c(4,7,4,2,'#3e5a3e'); } },
  portrait: { name: '초상화', cost: 60, wall: true, w: 1, h: 20, draw(c) {
    c(1,0,14,20,'#c9a96a'); c(2,1,12,18,'#3a2a20'); c(6,4,4,5,'#e8c8a8'); c(5,3,6,2,'#2a1a10'); c(4,10,8,8,'#6e1b28'); c(7,10,2,3,'#f1ead8'); } },
  window: { name: '창문', cost: 30, wall: true, w: 1, h: 24, draw(c, t) {
    c(0,0,16,24,'#5a3a24'); c(2,2,5,9,'#1e2a5a'); c(9,2,5,9,'#1e2a5a'); c(2,13,5,9,'#1e2a5a'); c(9,13,5,9,'#1e2a5a');
    c(10,4,2,2,'#f1ead8'); if (t % 5) c(4,5,1,1,'#e8e0c0'); c(5,16,1,1,'#e8e0c0'); c(12,18,1,1,'#e8e0c0'); c(-1,0,2,24,'#8a2433'); c(15,0,2,24,'#8a2433'); } },
  mirror: { name: '거울', cost: 50, wall: true, w: 1, h: 24, draw(c) {
    c(4,0,8,24,'#c9a96a'); c(2,3,12,18,'#c9a96a'); c(5,2,6,20,'#9ab4c0'); c(3,5,10,14,'#9ab4c0'); c(5,5,1,7,'#e8f4f8'); c(6,4,1,2,'#e8f4f8'); } },
  garland: { name: '별 가랜드', cost: 25, wall: true, w: 1, h: 8, wy: 2, draw(c, t) {
    c(0,1,16,1,'#6a5a4a'); const a = t % 2 ? '#ffe08a' : '#c9a96a', b = t % 2 ? '#c9a96a' : '#ffe08a';
    c(1,2,3,3,a); c(2,5,1,1,a); c(7,3,3,3,'#f4f0e8'); c(12,2,3,3,b); c(13,5,1,1,b); } },
  sconce: { name: '벽촛대', cost: 30, wall: true, w: 1, h: 16, draw(c, t) {
    c(6,9,4,2,'#c9a96a'); c(7,11,2,4,'#c9a96a'); c(7,5,2,4,'#f4f0e8'); c(7,3,2,2,t % 2 ? '#ffb347' : '#ffd27a'); c(3,1,10,10,'rgba(255,200,120,.08)'); } },
};
const WALLS = {
  plain:  { name: '기본 벽', cost: 0 },  stripe: { name: '와인 줄무늬', cost: 40 }, damask: { name: '녹색 다마스크', cost: 70 },
  panel:  { name: '나무 패널', cost: 60 }, brick:  { name: '붉은 벽돌', cost: 50 },  night:  { name: '별밤', cost: 90 },
};
const FLOORS = {
  plank: { name: '나무 마루', cost: 0 }, checker: { name: '체크 타일', cost: 50 }, carpet: { name: '붉은 카펫', cost: 60 },
  stone: { name: '돌바닥', cost: 40 },   herring: { name: '헤링본', cost: 80 },
};

function drawWall(g, k, t) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const base = { plain: '#4a3a30', stripe: '#4a2228', damask: '#2e3a2e', panel: '#6a5444', brick: '#7a3a2a', night: '#1a1e3a' }[k] || '#4a3a30';
  R(0, 0, RW, WALL_H, base);
  if (k === 'plain') { for (let x = 0; x < RW; x += 8) R(x, 0, 1, WALL_H, '#453529'); }
  if (k === 'stripe') { for (let x = 0; x < RW; x += 8) R(x, 0, 4, WALL_H, '#5a2a30'); }
  if (k === 'damask') { for (let y = 2; y < WALL_H; y += 8) for (let x = (y >> 3) % 2 * 4; x < RW; x += 8) { R(x + 1, y, 2, 1, '#3e4e3e'); R(x, y + 1, 4, 1, '#3e4e3e'); R(x + 1, y + 2, 2, 1, '#3e4e3e'); } }
  if (k === 'panel') { R(0, 24, RW, 20, '#4a3020'); R(0, 24, RW, 1, '#5a3a24'); for (let x = 2; x < RW; x += 16) { R(x, 27, 12, 14, '#553826'); R(x, 27, 12, 1, '#3a2416'); } }
  if (k === 'brick') { for (let y = 0; y < WALL_H; y += 6) { R(0, y, RW, 1, '#5a2a1e'); for (let x = (y / 6 % 2) * 6; x < RW; x += 12) R(x, y, 1, 6, '#5a2a1e'); } }
  if (k === 'night') { const st = [[7,5],[23,13],[40,4],[61,18],[75,7],[96,15],[110,5],[121,22],[33,30],[86,32],[14,36],[52,38]];
    st.forEach(([x, y], i) => R(x, y, 1, 1, (t + i) % 7 ? '#e8e0c0' : '#ffffff')); R(100, 6, 6, 6, '#f1ead8'); R(102, 6, 4, 4, '#1a1e3a'); }
  R(0, 0, RW, 2, 'rgba(0,0,0,.25)');
  R(0, WALL_H, RW, 4, '#2a1a0e'); R(0, WALL_H, RW, 1, '#3e2817');
}
function drawFloor(g, k) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const H = RH - FLOOR_Y;
  if (k === 'checker') { for (let y = 0; y < H; y += 8) for (let x = 0; x < RW; x += 8) R(x, FLOOR_Y + y, 8, 8, ((x + y) >> 3) % 2 ? '#2a2a2e' : '#d8d0c0'); }
  else if (k === 'carpet') { R(0, FLOOR_Y, RW, H, '#6a1e2a'); for (let y = 2; y < H; y += 6) for (let x = (y % 12 ? 3 : 0); x < RW; x += 6) R(x, FLOOR_Y + y, 1, 1, '#8a2a3a'); R(0, FLOOR_Y, RW, 2, '#c9a96a'); }
  else if (k === 'stone') { R(0, FLOOR_Y, RW, H, '#5a5a5e'); for (let y = 0; y < H; y += 8) { R(0, FLOOR_Y + y, RW, 1, '#3e3e42'); for (let x = (y / 8 % 2) * 8; x < RW; x += 16) R(x, FLOOR_Y + y, 1, 8, '#3e3e42'); } }
  else if (k === 'herring') { R(0, FLOOR_Y, RW, H, '#7a4a28'); for (let y = 0; y < H; y += 4) for (let x = 0; x < RW; x += 8) R(x + ((y >> 2) % 2) * 4, FLOOR_Y + y, 4, 4, '#8a5a34'); }
  else { R(0, FLOOR_Y, RW, H, '#7a5030'); for (let y = 0; y < H; y += 4) { R(0, FLOOR_Y + y, RW, 1, '#6a4426'); for (let x = ((y / 4) * 11) % 24; x < RW; x += 24) R(x, FLOOR_Y + y, 1, 4, '#5a3a24'); } }
  g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, FLOOR_Y, RW, 3);
}

/* ---------- 방 데이터 ---------- */
let RM = { edit: false, sel: null, drag: null, hover: null, t: 0 };
let RV = null;                 // 놀러 간 방 주인 uid
let ROOMLIKES = [], GUESTBOOK = [], roomUnsubs = [];
const rmId = () => Math.random().toString(36).slice(2, 9);
function defaultRoom() {
  return { wall: 'plain', floor: 'plank', ow: ['plain', 'plank'], inv: {},
    items: [{ id: rmId(), k: 'bed', c: 0, r: 0 }, { id: rmId(), k: 'desk', c: 6, r: 0 }, { id: rmId(), k: 'chair', c: 6, r: 1 }, { id: rmId(), k: 'window', c: 3, r: -1 }] };
}
function myRoom() { if (!P.room) P.room = defaultRoom(); const r = P.room; r.inv = r.inv || {}; r.items = r.items || []; r.ow = r.ow || ['plain', 'plank']; return r; }
function hoRoom(uid) { if (ME && uid === ME.uid) return myRoom(); const p = PROGS.find(x => x.id === uid); return (p && p.room) || defaultRoom(); }
function roomCnt(k) { if (!P || !P.room) return 0; return (P.room.items || []).filter(i => i.k === k).length; }

function occupied(room, c, r, w, flat, skipId) {
  if (c < 0 || c + w > COLS) return true;
  if (r === -1) return room.items.some(i => i.id !== skipId && i.r === -1 && i.c === c);
  if (r < 0 || r >= ROWS) return true;
  return room.items.some(i => { if (i.id === skipId || i.r !== r) return false; const f = FURN[i.k]; if (!f || f.wall || !!f.flat !== !!flat) return false; return c < i.c + f.w && i.c < c + w; });
}
function spotAt(k, x, y) {
  const f = FURN[k]; if (!f) return null;
  const c = Math.max(0, Math.min(COLS - f.w, Math.floor(x / CELL - (f.w - 1) / 2)));
  if (f.wall) return { c: Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL))), r: -1 };
  const r = Math.max(0, Math.min(ROWS - 1, Math.floor((y - FLOOR_Y) / CELL)));
  return { c, r };
}
function itemBox(i) {
  const f = FURN[i.k]; if (!f) return null;
  if (i.r === -1) { const y = f.wy != null ? f.wy : Math.round(8 + (24 - f.h) / 2); return { x: i.c * CELL, y, w: f.w * CELL, h: f.h }; }
  const by = FLOOR_Y + (i.r + 1) * CELL; return { x: i.c * CELL, y: by - f.h, w: f.w * CELL, h: f.h };
}
function itemAt(room, x, y) {
  const order = drawOrder(room).reverse();
  return order.find(i => { const b = itemBox(i); return b && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h; }) || null;
}
function drawOrder(room) {
  const L = i => { const f = FURN[i.k] || {}; return f.wall ? 0 : f.flat ? 1 : 2; };
  return room.items.filter(i => FURN[i.k]).slice().sort((a, b) => L(a) - L(b) || a.r - b.r || a.c - b.c);
}
function drawSprite(g, k, x, y, t, alpha) {
  const f = FURN[k]; if (!f) return;
  g.save(); if (alpha != null) g.globalAlpha = alpha;
  f.draw((dx, dy, w, h, col) => { g.fillStyle = col; g.fillRect(x + dx, y + dy, w, h); }, t || 0);
  g.restore();
}
function paintRoom(cv, room, opts) {
  if (!cv) return; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const t = RM.t;
  drawWall(g, WALLS[room.wall] ? room.wall : 'plain', t); drawFloor(g, FLOORS[room.floor] ? room.floor : 'plank');
  const edit = opts && opts.edit;
  if (edit) { g.fillStyle = 'rgba(255,255,255,.07)'; for (let c = 0; c <= COLS; c++) g.fillRect(c * CELL, FLOOR_Y, 1, ROWS * CELL); for (let r = 0; r <= ROWS; r++) g.fillRect(0, FLOOR_Y + r * CELL, RW, 1);
    for (let c = 0; c <= COLS; c++) g.fillRect(c * CELL, 6, 1, 28); }
  const dragId = RM.drag && RM.drag.moved ? RM.drag.id : null;
  drawOrder(room).forEach(i => {
    const b = itemBox(i); if (!b) return;
    // 바닥 그림자
    if (i.r >= 0 && !FURN[i.k].flat) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(b.x + 1, b.y + b.h - 1, b.w - 2, 2); }
    drawSprite(g, i.k, b.x, b.y, t, i.id === dragId ? .35 : null);
    if (edit && RM.sel === 'id:' + i.id) { g.strokeStyle = '#ffe08a'; g.lineWidth = 1; g.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1); }
  });
  // 고스트
  if (edit && RM.hover) {
    const k = RM.hover.k, f = FURN[k], s = RM.hover;
    const ok = !occupied(room, s.c, s.r, f.w, f.flat, RM.hover.skip);
    const b = itemBox({ k, c: s.c, r: s.r });
    drawSprite(g, k, b.x, b.y, t, .6);
    g.fillStyle = ok ? 'rgba(120,220,120,.25)' : 'rgba(230,80,80,.3)';
    if (s.r === -1) g.fillRect(b.x, b.y, b.w, b.h); else g.fillRect(b.x, FLOOR_Y + s.r * CELL, b.w, CELL);
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
  const effs = Object.entries(FURN).filter(([k, f]) => f.eff).map(([k, f]) => { const n = room.items.filter(i => i.k === k).length; return n ? `<span class="chip on" style="cursor:default">${f.name}${n > 1 ? ' ×' + n : ''} · ${f.eff}</span>` : ''; }).join('');
  return effs ? `<div class="toggles">${effs}</div>` : '<p class="muted" style="margin:4px 0">✨ 가구점의 일부 가구는 놓아두기만 해도 작은 효과가 있어요.</p>';
}
VIEWS.room = () => {
  const room = myRoom(), likes = likesOf(ME.uid).length, inv = Object.entries(room.inv).filter(([k, n]) => n > 0 && FURN[k]);
  const selItem = RM.sel && RM.sel.startsWith('id:') ? room.items.find(i => 'id:' + i.id === RM.sel) : null;
  const selInv = RM.sel && RM.sel.startsWith('inv:') ? RM.sel.slice(4) : null;
  return `<div class="panel roompanel">
   <div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
     <h2 style="margin:0">🏠 ${esc(roomTitle(ME.uid))}</h2>
     <span class="muted">❤ ${likes} · 📖 ${GUESTBOOK.filter(g => g.owner === ME.uid).length}</span></div>
   <canvas id="roomCv" class="roomcv${RM.edit ? ' editing' : ''}" width="${RW}" height="${RH}"></canvas>
   <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:8px">
     <button class="${RM.edit ? 'primary' : ''}" onclick="roomEdit(${!RM.edit})">${RM.edit ? '✔ 꾸미기 끝' : '✏ 꾸미기'}</button>
     <button onclick="openFurnShop()">🛒 가구점</button>
     <button onclick="RV=null;go('visit')">👀 놀러 가기</button>
     <button onclick="go('map')">🚪 저택으로 나가기</button></div>
   ${RM.edit ? `<div class="roomedit">
     ${selItem ? `<p style="margin:6px 0"><b>${FURN[selItem.k].name}</b> 선택됨 — 옮길 칸을 누르거나 끌어서 옮겨요.</p>
        <button class="sm" onclick="roomStore()">📦 보관함으로</button> <button class="sm" onclick="RM.sel=null;render()">선택 해제</button>`
      : selInv ? `<p style="margin:6px 0"><b>${FURN[selInv].name}</b> — 놓을 칸을 눌러요. ${FURN[selInv].wall ? '(벽 장식은 위쪽 벽에)' : ''}</p><button class="sm" onclick="RM.sel=null;RM.hover=null;render()">취소</button>`
      : '<p class="muted" style="margin:6px 0">가구를 눌러 고르고, 원하는 칸을 누르거나 끌어서 옮겨요.</p>'}
     <h4 style="margin:10px 0 4px">📦 보관함</h4>
     ${inv.length ? `<div class="toggles">${inv.map(([k, n]) => `<span class="chip ${selInv === k ? 'on' : ''}" onclick="RM.sel='inv:${k}';RM.hover=null;render()"><canvas class="fprev" data-k="${k}" width="${FURN[k].w * 16}" height="32"></canvas> ${FURN[k].name}${n > 1 ? ' ×' + n : ''}</span>`).join('')}</div>` : '<p class="muted">비어 있어요. 가구점에서 사 오세요.</p>'}
     <h4 style="margin:10px 0 4px">🧱 벽지</h4><div class="toggles">${room.ow.filter(k => WALLS[k]).map(k => `<span class="chip ${room.wall === k ? 'on' : ''}" onclick="roomSet('wall','${k}')">${WALLS[k].name}</span>`).join('')}</div>
     <h4 style="margin:10px 0 4px">🪵 바닥</h4><div class="toggles">${room.ow.filter(k => FLOORS[k]).map(k => `<span class="chip ${room.floor === k ? 'on' : ''}" onclick="roomSet('floor','${k}')">${FLOORS[k].name}</span>`).join('')}</div>
   </div>` : effectsHtml(room)}
  </div>${RM.edit ? '' : gbHtml(ME.uid)}`;
};
VIEWS.visit = () => {
  if (RV) {
    const room = hoRoom(RV), likes = likesOf(RV), liked = likes.some(l => l.uid === ME.uid);
    return `<div style="margin:-4px 0 10px"><button class="sm" onclick="RV=null;render()">← 방 목록</button> <button class="sm" onclick="go('room')">🏠 내 방으로</button></div>
     <div class="panel roompanel"><div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
      <h2 style="margin:0">🚪 ${esc(roomTitle(RV))}</h2>
      ${RV === ME.uid ? `<span class="muted">❤ ${likes.length}</span>` : `<button class="${liked ? 'primary' : ''}" onclick="roomLike('${RV}')">${liked ? '❤' : '🤍'} 좋아요 ${likes.length}</button>`}</div>
      <canvas id="roomCv" class="roomcv" width="${RW}" height="${RH}"></canvas>${effectsHtml(room)}
      ${likes.length ? `<p class="muted" style="margin:6px 0 0">❤ ${likes.map(l => esc(l.name || '')).join(', ')}</p>` : ''}</div>${gbHtml(RV)}`;
  }
  const us = USERS.filter(u => u.ho).sort((a, b) => String(a.ho).localeCompare(String(b.ho)));
  return `<div style="margin:-4px 0 10px"><button class="sm" onclick="go('room')">← 내 방으로</button></div>
   <div class="panel"><h2 style="margin-top:0">👀 놀러 가기</h2><p class="muted">다른 손님의 방을 구경하고 좋아요와 방명록을 남겨 보세요.</p>
   <div class="grid g2">${us.map(u => `<div class="item rcard" onclick="RV='${u.id}';render();window.scrollTo(0,0)" style="cursor:pointer;display:block">
     <canvas class="rthumb roomcv" data-uid="${u.id}" width="${RW}" height="${RH}"></canvas>
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
  const k = c.dataset.k, g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height);
  if (FURN[k]) { const f = FURN[k]; drawSprite(g, k, Math.round((c.width - f.w * 16) / 2), Math.max(0, c.height - f.h - (f.wall ? Math.round((32 - f.h) / 2) : 0)), RM.t); return; }
  const tmp = document.createElement('canvas'); tmp.width = RW; tmp.height = RH; const tg = tmp.getContext('2d');
  if (WALLS[k]) { drawWall(tg, k, 0); g.drawImage(tmp, 0, 0, 32, 32, 0, 0, c.width, c.height); }
  if (FLOORS[k]) { drawFloor(tg, k); g.drawImage(tmp, 0, FLOOR_Y, 32, 32, 0, 0, c.width, c.height); }
}
setInterval(() => {
  RM.t++;
  if (!ME || !P || (tab !== 'room' && tab !== 'visit') || document.hidden) return;
  const cv = document.getElementById('roomCv');
  if (cv) paintRoom(cv, hoRoom(tab === 'room' ? ME.uid : RV), { edit: tab === 'room' && RM.edit });
  if (RM.t % 3 === 0) document.querySelectorAll('canvas.rthumb').forEach(c => paintRoom(c, hoRoom(c.dataset.uid)));
}, 280);

/* ---------- 조작 ---------- */
function cvPos(cv, ev) { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * RW, y: (ev.clientY - r.top) / r.height * RH }; }
const ROOM_TALK = { cat: ['냐아.', '골골골…', '(꼬리를 살랑인다)'], gclock: ['똑딱, 똑딱.'], piano: ['♪ 도-미-솔'], teaset: ['향긋한 홍차 냄새.'], safe: ['단단히 잠겨 있다.'], chest: ['무엇이 들었을까?'], mirror: ['거울 속의 나와 눈이 마주쳤다.'], window: ['숲 위로 달이 떠 있다.'], plant: ['잎이 싱그럽다.'], bed: ['폭신해 보인다.'] };
function roomPoke(i) { const f = FURN[i.k]; const l = ROOM_TALK[i.k]; sfx(i.k === 'cat' ? 'pop' : 'tap'); toast(`${f.name} — ${l ? l[Math.floor(Math.random() * l.length)] : ''}${f.eff ? ' (' + f.eff + ')' : ''}`); }
function bindViewCv(cv, uid) { cv.onclick = ev => { const p = cvPos(cv, ev), i = itemAt(hoRoom(uid), p.x, p.y); if (i) roomPoke(i); }; }
function bindRoomCv(cv) {
  cv.onpointerdown = ev => {
    const p = cvPos(cv, ev), room = myRoom();
    if (!RM.edit) { const i = itemAt(room, p.x, p.y); if (i) roomPoke(i); return; }
    const hit = itemAt(room, p.x, p.y);
    if (hit && !(RM.sel && RM.sel.startsWith('inv:'))) {
      RM.drag = { id: hit.id, x0: p.x, y0: p.y, moved: false }; window.GAME_LOCK = true;
      try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    } else RM.drag = { id: null, x0: p.x, y0: p.y, moved: false };
    ev.preventDefault();
  };
  cv.onpointermove = ev => {
    if (!RM.edit) return; const p = cvPos(cv, ev), room = myRoom();
    if (RM.drag && RM.drag.id) {
      if (Math.abs(p.x - RM.drag.x0) + Math.abs(p.y - RM.drag.y0) > 3) RM.drag.moved = true;
      if (RM.drag.moved) { const it = room.items.find(i => i.id === RM.drag.id); const s = spotAt(it.k, p.x, p.y); RM.hover = { k: it.k, c: s.c, r: s.r, skip: it.id }; paintRoom(cv, room, { edit: true }); }
    } else if (RM.sel && RM.sel.startsWith('inv:') && ev.pointerType === 'mouse') {
      const k = RM.sel.slice(4), s = spotAt(k, p.x, p.y); RM.hover = { k, c: s.c, r: s.r }; paintRoom(cv, room, { edit: true });
    }
  };
  cv.onpointerleave = () => { if (RM.edit && !(RM.drag && RM.drag.id) && RM.hover) { RM.hover = null; paintRoom(cv, myRoom(), { edit: true }); } };
  cv.onpointerup = ev => {
    if (!RM.edit) return; const p = cvPos(cv, ev), room = myRoom(), d = RM.drag; RM.drag = null;
    const unlock = () => { window.GAME_LOCK = false; };
    if (d && d.id && d.moved) { const it = room.items.find(i => i.id === d.id); const s = spotAt(it.k, p.x, p.y); RM.hover = null; RM.sel = 'id:' + it.id; unlock(); moveItem(it, s); return; }
    unlock();
    const hit = itemAt(room, p.x, p.y);
    if (RM.sel && RM.sel.startsWith('inv:')) { const k = RM.sel.slice(4); placeInv(k, spotAt(k, p.x, p.y)); return; }
    if (hit) { RM.sel = RM.sel === 'id:' + hit.id ? null : 'id:' + hit.id; sfx('tap'); render(); return; }
    if (RM.sel && RM.sel.startsWith('id:')) { const it = room.items.find(i => 'id:' + i.id === RM.sel); if (it) moveItem(it, spotAt(it.k, p.x, p.y)); return; }
    render();
  };
  cv.onpointercancel = () => { RM.drag = null; RM.hover = null; window.GAME_LOCK = false; render(); };
}
function moveItem(it, s) {
  const room = myRoom(), f = FURN[it.k];
  if (occupied(room, s.c, s.r, f.w, f.flat, it.id)) { sfx('bad'); toast('거기엔 이미 무언가 있어요'); render(); return; }
  it.c = s.c; it.r = s.r; sfx('tap'); saveP(); render();
}
function placeInv(k, s) {
  const room = myRoom(), f = FURN[k];
  if (!s || !(room.inv[k] > 0)) return;
  if (occupied(room, s.c, s.r, f.w, f.flat)) { sfx('bad'); toast('거기엔 이미 무언가 있어요'); return; }
  room.inv[k]--; if (!room.inv[k]) delete room.inv[k];
  const it = { id: rmId(), k, c: s.c, r: s.r }; room.items.push(it);
  RM.sel = room.inv[k] ? 'inv:' + k : null; RM.hover = null; sfx('pop'); saveP(); render();
  if (f.eff && f.max && roomCnt(k) > f.max) toast(`효과는 ${f.max}개까지만 적용돼요`);
}
function roomStore() {
  const room = myRoom(), it = room.items.find(i => 'id:' + i.id === RM.sel); if (!it) return;
  room.items = room.items.filter(i => i !== it); room.inv[it.k] = (room.inv[it.k] || 0) + 1; RM.sel = null; sfx('tap'); saveP(); render();
}
function roomEdit(on) { RM.edit = on; RM.sel = null; RM.hover = null; render(); }
function roomSet(slot, k) { const room = myRoom(); room[slot] = k; sfx('tap'); saveP(); render(); }

/* ---------- 가구점 ---------- */
let SHOPTAB = 'furn';
function openFurnShop() {
  const room = myRoom(), price = c => Math.round(c * (typeof shopMul === 'function' ? shopMul() : 1));
  const tabs = [['furn', '가구'], ['wall', '벽 장식'], ['wp', '벽지'], ['fl', '바닥']];
  const owned = k => (room.inv[k] || 0) + room.items.filter(i => i.k === k).length;
  let list = '';
  if (SHOPTAB === 'furn' || SHOPTAB === 'wall') {
    list = Object.entries(FURN).filter(([k, f]) => !!f.wall === (SHOPTAB === 'wall')).map(([k, f]) => `<div class="item" style="margin:6px 0">
      <canvas class="fprev" data-k="${k}" width="${f.w * 16}" height="32" style="width:${f.w * 28}px;height:56px"></canvas>
      <div style="flex:1;margin-left:10px"><b>${f.name}</b>${f.w > 1 ? ' <span class="muted">(2칸)</span>' : ''}${owned(k) ? ` <span class="badge">보유 ${owned(k)}</span>` : ''}
      ${f.eff ? `<div style="color:var(--gold2);font-size:.85rem">✨ ${f.eff}</div>` : ''}</div>
      <button onclick="buyFurn('${k}')" ${P.coins < price(f.cost) ? 'disabled' : ''}>${price(f.cost)} 은화</button></div>`).join('');
  } else {
    const T = SHOPTAB === 'wp' ? WALLS : FLOORS, slot = SHOPTAB === 'wp' ? 'wall' : 'floor';
    list = Object.entries(T).map(([k, w]) => { const has = room.ow.includes(k); return `<div class="item" style="margin:6px 0">
      <canvas class="fprev" data-k="${k}" width="32" height="32" style="width:48px;height:48px"></canvas>
      <div style="flex:1;margin-left:10px"><b>${w.name}</b>${room[slot] === k ? ' <span class="badge live">사용 중</span>' : ''}</div>
      ${has ? (room[slot] === k ? '' : `<button onclick="roomSet('${slot}','${k}');openFurnShop()">적용</button>`) : `<button onclick="buyDeco('${slot}','${k}')" ${P.coins < price(w.cost) ? 'disabled' : ''}>${price(w.cost)} 은화</button>`}</div>`; }).join('');
  }
  modal(`<h2 style="color:var(--gold2);margin-top:0">🛒 저택 가구점</h2><p class="muted" style="margin:0 0 6px">보유 은화 <b>${P.coins}</b>${mySin() === 'envy' ? ' · 질투의 눈썰미로 10% 할인 중' : ''}</p>
   <div class="toggles">${tabs.map(([k, v]) => `<span class="chip ${SHOPTAB === k ? 'on' : ''}" onclick="SHOPTAB='${k}';openFurnShop()">${v}</span>`).join('')}</div>
   <div style="max-height:60vh;overflow:auto">${list}</div><button style="width:100%;margin-top:8px" onclick="closeModal();render()">닫기</button>`);
  document.querySelectorAll('#mbox canvas.fprev').forEach(c => { c.style.imageRendering = 'pixelated'; paintPreview(c); });
}
function buyFurn(k) {
  const f = FURN[k], c = Math.round(f.cost * (typeof shopMul === 'function' ? shopMul() : 1));
  if (!spend(c)) return; const room = myRoom(); room.inv[k] = (room.inv[k] || 0) + 1; saveP(); sfx('ok');
  toast(`${f.name}을(를) 샀어요! 꾸미기에서 놓아 보세요`); openFurnShop();
}
function buyDeco(slot, k) {
  const T = slot === 'wall' ? WALLS : FLOORS, c = Math.round(T[k].cost * (typeof shopMul === 'function' ? shopMul() : 1));
  if (!spend(c)) return; const room = myRoom(); if (!room.ow.includes(k)) room.ow.push(k); room[slot] = k; saveP(); sfx('ok'); openFurnShop();
}

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
  roomUnsubs.push(B.onCol('guestbook', l => { GUESTBOOK = l; if (tab === 'room' || tab === 'visit') softRender(); }));
}
