/* ============================================================
   Ⅶ・peccata — 내 방 (내려다보는 시점 도트 방 · 꾸미기 · 놀러 가기 · 좋아요 · 방명록)
   데이터: progress/{uid}.room = {v:3, wall, floor, ow:[소유 벽지·바닥], inv:{가구:개수}, items:[{id,k,c,r}]}
           r = -1 이면 벽 장식(벽 칸 c), 0 이상이면 바닥 타일 (c,r) = 가구가 차지하는 칸의 왼쪽 위
   ============================================================ */
const T = 16, COLS = 12, ROWS = 9, OX = 6, OY = 6, WALL_H = 60;
const FY = OY + WALL_H, RW = OX * 2 + COLS * T, RH = FY + ROWS * T + OY;   // 204 × 210

/* ---------- 색 ---------- */
const OL = '#2a1a12', K = OL;
const WD = { t: '#c4864e', l: '#dca468', f: '#93592f', d: '#6a3e22' };        // 나무
const WN = { t: '#a8344a', l: '#cc5468', f: '#7e2236', d: '#5a1626' };        // 와인 벨벳
const GN = { t: '#4f8a55', l: '#79b26e', f: '#3a6a40', d: '#28502e' };        // 초록
const CR = { t: '#f1e6cc', l: '#fffaf0', f: '#d6c6a4', d: '#ab9a78' };        // 크림
const GOLD = '#e0b050', GOLD2 = '#ffe27a', GOLDD = '#a07028';

/* 그리기 도구 — c: 사각형, o: 테두리 사각형, ln: 도트 직선, el: 도트 타원 */
function pen(g, x0, y0) {
  const c = (x, y, w, h, col) => { if (w <= 0 || h <= 0) return; g.fillStyle = col; g.fillRect(x0 + x, y0 + y, w, h); };
  const o = (x, y, w, h, f, l) => { c(x, y, w, h, l || OL); c(x + 1, y + 1, w - 2, h - 2, f); };
  const ln = (x1, y1, x2, y2, col, wd) => { const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1); for (let i = 0; i <= n; i++) c(Math.round(x1 + (x2 - x1) * i / n), Math.round(y1 + (y2 - y1) * i / n), wd || 1, wd || 1, col); };
  const el = (cx, cy, rx, ry, col) => { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + .01)))); c(cx - w, cy + y, w * 2, 1, col); } };
  return { c, o, ln, el };
}
/* 윗면 + 앞면이 보이는 상자 (내려다보는 시점의 기본 형태) */
function box(p, x, y, w, h, front, P) {
  const { c } = p; c(x, y, w, h, OL); c(x + 1, y + 1, w - 2, h - 2 - front, P.t); c(x + 1, y + 1, w - 2, 1, P.l);
  c(x + 1, y + h - 1 - front, w - 2, front, P.f); c(x + 1, y + h - 1 - front, w - 2, 1, P.d);
}
function leafy(p, cx, cy, list, G) {
  list.forEach(([dx, dy], i) => { const tx = cx + dx, ty = cy + dy; p.ln(cx, cy, tx, ty, i % 2 ? G.f : G.t, 2); p.ln(cx + (dx > 0 ? 1 : -1), cy - 1, tx, ty - 1, G.l, 1); p.c(tx - 1, ty - 1, 2, 2, G.d); });
}
function todSky(p, t, x, y, w, h) {
  const tod = (typeof curTod === 'function' && curTod()) || 'night', { c } = p;
  const S = { morning: ['#f6c49a', '#ffe0b4', '#fff1d6'], day: ['#5aa4e6', '#86c2f0', '#b8def8'], evening: ['#5a3a7a', '#c25a5a', '#f09a5a'], night: ['#0a0f30', '#141c48', '#1f2b64'] }[tod];
  const b = Math.ceil(h / 3); c(x, y, w, b, S[0]); c(x, y + b, w, b, S[1]); c(x, y + 2 * b, w, h - 2 * b, S[2]);
  if (tod === 'night') { [[2, 3], [7, 8], [13, 2], [11, 12], [4, 14]].forEach(([a, d], i) => { if (a < w && d < h && (t + i) % 6) c(x + a, y + d, 1, 1, '#f4ecd0'); }); c(x + w - 6, y + 2, 4, 4, '#f4ecd0'); c(x + w - 5, y + 2, 2, 3, S[0]); }
  if (tod === 'day') { c(x + w - 7, y + 2, 4, 4, '#fff2a0'); c(x + 2, y + 6, 6, 2, '#fff'); c(x + 3, y + 5, 3, 1, '#fff'); }
  if (tod === 'morning') { c(x + 2, y + h - 8, 5, 4, '#fff0a0'); c(x + 9, y + 4, 5, 1, '#fff'); }
  if (tod === 'evening') { c(x + w - 8, y + h - 7, 6, 3, '#ffd27a'); c(x + 2, y + 4, 6, 1, '#e8a0a0'); }
  const tr = { morning: '#4a6a3a', day: '#3a6a3a', evening: '#2a2030', night: '#070b1a' }[tod];
  c(x, y + h - 3, w, 3, tr); c(x + 1, y + h - 5, 3, 2, tr); c(x + w - 5, y + h - 6, 4, 3, tr);
}

/* ---------- 가구 (w×d = 바닥에서 차지하는 칸, h = 그림 높이 px) ---------- */
const FURN = {
  bed: { name: '침대', cost: 60, w: 2, d: 3, h: 56, draw(p) { const { c, o } = p;
    o(0, 0, 32, 14, WD.f); c(1, 1, 30, 2, WD.l); c(0, 0, 3, 14, WD.d); c(29, 0, 3, 14, WD.d); c(14, 3, 4, 3, GOLD);
    o(0, 10, 32, 44, WD.f); c(2, 12, 28, 37, CR.t);
    o(4, 13, 11, 8, CR.l, CR.d); c(5, 19, 9, 1, CR.f); o(17, 13, 11, 8, CR.l, CR.d); c(18, 19, 9, 1, CR.f);
    o(2, 24, 28, 26, WN.t, WN.d); c(3, 25, 26, 4, WN.l); c(3, 29, 26, 1, WN.f);
    for (let y = 33; y < 48; y += 6) for (let x = 6 + ((y / 6) % 2) * 3; x < 28; x += 6) c(x, y, 2, 2, GOLD);
    c(1, 49, 30, 5, WD.f); c(1, 49, 30, 1, WD.d); c(2, 54, 3, 2, OL); c(27, 54, 3, 2, OL); } },
  desk: { name: '책상', cost: 30, w: 2, d: 1, h: 28, draw(p) { const { c, o } = p;
    box(p, 0, 4, 32, 21, 9, WD); o(18, 16, 11, 6, '#a86a3c'); c(22, 18, 3, 2, GOLD);
    c(1, 25, 3, 3, OL); c(28, 25, 3, 3, OL);
    o(3, 5, 10, 7, '#3a5a8a', '#1e3050'); c(4, 6, 8, 1, '#5a7aaa'); c(4, 10, 8, 1, '#f1ead8');
    c(15, 6, 8, 6, '#f4f0e8'); c(16, 7, 5, 1, '#a09a90'); c(16, 9, 4, 1, '#a09a90');
    o(25, 6, 4, 4, '#2a2a30'); c(28, 0, 1, 7, '#f4f0e8'); c(29, 0, 1, 3, '#d8d0c0'); } },
  chair: { name: '의자', cost: 15, w: 1, d: 1, h: 22, draw(p) { const { c, o } = p;
    o(3, 0, 10, 10, WD.f); c(5, 2, 6, 6, WN.t); c(5, 2, 6, 1, WN.l);
    o(2, 9, 12, 8, WN.t, WN.d); c(3, 10, 10, 2, WN.l); c(3, 15, 10, 1, WN.f);
    c(3, 17, 10, 2, WD.d); c(3, 19, 2, 3, OL); c(11, 19, 2, 3, OL); } },
  armchair: { name: '안락의자', cost: 40, w: 1, d: 1, h: 24, draw(p) { const { c, o } = p;
    o(1, 0, 14, 11, GN.f, GN.d); c(3, 2, 10, 7, GN.t); c(3, 2, 10, 1, GN.l);
    o(0, 7, 4, 13, GN.t, GN.d); o(12, 7, 4, 13, GN.t, GN.d); c(1, 8, 2, 1, GN.l); c(13, 8, 2, 1, GN.l);
    o(3, 10, 10, 8, GN.t, GN.d); c(4, 11, 8, 2, GN.l); c(1, 19, 14, 2, GN.d); c(2, 21, 2, 3, OL); c(12, 21, 2, 3, OL); } },
  sofa: { name: '벨벳 소파', cost: 90, w: 3, d: 1, h: 30, draw(p, t) { const { c, o } = p;
    o(2, 0, 44, 14, WN.f, WN.d); [3, 17, 31].forEach(x => { c(x, 2, 13, 10, WN.t); c(x, 2, 13, 1, WN.l); c(x + 5, 6, 3, 2, WN.f); });
    o(0, 8, 7, 18, WN.t, WN.d); o(41, 8, 7, 18, WN.t, WN.d); c(1, 9, 5, 1, WN.l); c(42, 9, 5, 1, WN.l);
    o(6, 12, 36, 10, WN.t, WN.d); c(7, 13, 34, 2, WN.l); c(18, 13, 1, 8, WN.f); c(30, 13, 1, 8, WN.f);
    o(31, 9, 9, 7, GN.t, GN.d); c(32, 10, 7, 1, GN.l); c(1, 26, 46, 2, WN.d); c(3, 28, 3, 2, OL); c(42, 28, 3, 2, OL); } },
  ctable: { name: '티 테이블', cost: 35, w: 2, d: 1, h: 20, draw(p, t) { const { c, o } = p;
    box(p, 0, 2, 32, 14, 4, WD); c(2, 16, 3, 4, OL); c(27, 16, 3, 4, OL);
    o(5, 4, 6, 5, '#f4f0e8', '#a09a90'); c(6, 5, 4, 2, '#a8603a'); c(4, 9, 8, 1, '#d8d0c0');
    o(16, 4, 10, 6, '#3f6b3a', '#28502e'); c(17, 5, 8, 1, '#5f8a55');
    if ((t >> 1) % 3) c(7 + ((t >> 1) % 2), 1, 1, 3, 'rgba(255,255,255,.4)'); } },
  shelf: { name: '책장', cost: 120, w: 2, d: 1, h: 42, eff: '수수께끼 힌트 20% 할인', draw(p) { const { c, o } = p;
    o(0, 0, 32, 42, WD.f); c(1, 1, 30, 4, WD.t); c(1, 1, 30, 1, WD.l); c(2, 6, 28, 34, '#3e2414');
    const cols = ['#a8344a', '#3a5a8a', '#c9a96a', '#4f8a55', '#6a4a8a', '#b8693d', '#e8dcc0', '#2a6a6a'];
    [[6, 16], [17, 28], [29, 39]].forEach(([top, bot], row) => { c(2, bot, 28, 1, WD.f); let x = 3, i = row * 3;
      while (x < 29) { const w = [2, 3, 2, 2, 3][i % 5], h = 7 + ((i * 7 + row) % 4); if (x + w > 29) break;
        if (i % 6 === 4 && x + 5 < 29) { c(x, bot - 3, 5, 3, cols[(i + 2) % 8]); c(x, bot - 3, 5, 1, '#ffffff44'); x += 6; i++; continue; }
        const col = cols[(i * 5 + row) % 8]; c(x, bot - h, w, h, col); c(x, bot - h, 1, h, '#ffffff33'); c(x, bot - h + 2, w, 1, '#00000044'); x += w; if (i % 4 === 3) x++; i++; } }); } },
  plant: { name: '화분', cost: 80, w: 1, d: 1, h: 30, eff: '온실 성장 5% 빨라짐 (최대 3개)', max: 3, draw(p, t) { const { c, o } = p, s = (t >> 2) % 2;
    leafy(p, 8, 19, [[-7, -6 - s], [7, -7], [-5, -14], [5, -15 + s], [0, -18], [-8, 0], [8, -1]], GN);
    o(3, 19, 10, 10, '#ece8e0', '#9a948a'); c(4, 20, 8, 2, '#5a3a24'); c(4, 22, 2, 6, '#ffffff'); c(10, 23, 2, 5, '#c8c2b8'); c(4, 29, 8, 1, 'rgba(0,0,0,.2)'); } },
  bigplant: { name: '큰 야자 화분', cost: 110, w: 1, d: 1, h: 40, eff: '온실 성장 5% 빨라짐 (최대 3개)', max: 3, draw(p, t) { const { c, o } = p, s = (t >> 2) % 2;
    c(7, 14, 2, 15, '#8a5a34'); c(7, 18, 2, 1, '#6a4026'); c(7, 23, 2, 1, '#6a4026');
    leafy(p, 8, 14, [[-8, -4], [8, -5 + s], [-6, -11], [6, -12], [0, -14 + s], [-8, 4], [8, 3]], { t: '#8ab04a', l: '#b8d870', f: '#5a8a3a', d: '#3a6028' });
    o(2, 28, 12, 12, '#ece8e0', '#9a948a'); c(3, 29, 10, 2, '#5a3a24'); c(3, 31, 2, 7, '#ffffff'); c(11, 32, 2, 6, '#c8c2b8'); } },
  lamp: { name: '스탠드', cost: 25, w: 1, d: 1, h: 40, draw(p) { const { c, o, el } = p;
    el(8, 37, 9, 3, 'rgba(255,230,160,.18)'); el(8, 37, 4, 2, '#3a3a44'); c(5, 36, 6, 1, '#5a5a66');
    c(7, 10, 2, 26, '#4a4a54'); c(7, 10, 1, 26, '#6a6a76');
    o(1, 0, 14, 11, CR.t, CR.d); c(2, 1, 12, 2, CR.l); c(2, 8, 12, 2, CR.f); c(6, 9, 4, 2, GOLD2); } },
  wardrobe: { name: '옷장', cost: 70, w: 2, d: 1, h: 46, draw(p) { const { c, o } = p;
    o(0, 0, 32, 44, WD.f); c(1, 1, 30, 5, WD.t); c(1, 1, 30, 1, WD.l); c(6, 2, 20, 2, GOLD);
    o(2, 7, 14, 35, '#a86a3c', WD.d); o(16, 7, 14, 35, '#a86a3c', WD.d);
    [4, 18].forEach(x => { o(x, 10, 10, 13, '#b8784a', WD.d); o(x, 26, 10, 13, '#b8784a', WD.d); c(x + 1, 11, 8, 1, WD.l); });
    c(14, 22, 1, 5, GOLD); c(17, 22, 1, 5, GOLD); c(2, 44, 4, 2, OL); c(26, 44, 4, 2, OL); } },
  rug: { name: '줄무늬 러그', cost: 40, w: 3, d: 2, h: 32, flat: true, draw(p) { const { c, o } = p;
    o(2, 1, 44, 30, CR.t, CR.d); for (let x = 5; x < 44; x += 4) c(x, 2, 2, 28, CR.f); c(3, 2, 42, 2, WN.t); c(3, 28, 42, 2, WN.t);
    for (let y = 2; y < 30; y += 2) { c(0, y, 2, 1, CR.l); c(46, y, 2, 1, CR.l); } } },
  persian: { name: '페르시안 카펫', cost: 70, w: 3, d: 2, h: 32, flat: true, draw(p) { const { c, o } = p;
    o(1, 1, 46, 30, '#7e2236', '#4a1220'); c(3, 3, 42, 26, '#a8344a'); c(6, 6, 36, 20, '#7e2236'); c(9, 9, 30, 14, '#c9a96a'); c(11, 11, 26, 10, '#3a3a6a');
    c(22, 12, 4, 8, GOLD); c(19, 15, 10, 2, GOLD); c(23, 13, 2, 6, '#a8344a');
    for (let x = 5; x < 44; x += 4) { c(x, 4, 2, 1, GOLD); c(x, 27, 2, 1, GOLD); } for (let y = 3; y < 30; y += 2) { c(0, y, 1, 1, CR.l); c(47, y, 1, 1, CR.l); } } },
  teaset: { name: '찻상', cost: 150, w: 2, d: 1, h: 24, eff: '티룸 팁 +1', draw(p, t) { const { c, o, el } = p;
    el(16, 12, 15, 6, OL); el(16, 11, 14, 5, CR.l); c(2, 13, 28, 4, CR.f); for (let x = 3; x < 29; x += 3) c(x, 17, 2, 1, CR.d);
    c(15, 17, 2, 5, WD.d); c(11, 22, 10, 2, WD.d);
    o(9, 3, 9, 8, '#f8f4ec', '#9a948a'); c(10, 6, 7, 1, '#3a5a8a'); c(12, 1, 3, 2, GOLD); c(18, 5, 3, 1, '#f8f4ec'); c(20, 4, 1, 2, '#f8f4ec'); c(7, 5, 2, 3, '#9a948a');
    o(22, 7, 5, 4, '#f8f4ec', '#9a948a'); c(23, 8, 3, 1, '#a8603a'); o(4, 8, 5, 4, '#f8f4ec', '#9a948a');
    const st = (t >> 1) % 3; c(24 + (st & 1), 3 - st, 1, 3, 'rgba(255,255,255,.45)'); } },
  safe: { name: '금고', cost: 200, w: 1, d: 1, h: 20, eff: '출석 보상 +3 (최대 2개)', max: 2, draw(p) { const { c, o } = p;
    o(1, 1, 14, 18, '#5a606a', '#22262c'); c(2, 2, 12, 4, '#7a808a'); c(2, 2, 12, 1, '#9aa0aa'); o(3, 7, 10, 10, '#4a5058', '#2a2e34');
    o(6, 9, 5, 5, GOLD, GOLDD); c(8, 11, 1, 1, OL); c(11, 11, 2, 2, GOLD); } },
  piano: { name: '피아노', cost: 250, w: 3, d: 1, h: 38, draw(p, t) { const { c, o } = p;
    o(0, 0, 48, 30, '#2a2226', '#0e0a0c'); c(1, 1, 46, 5, '#4a4048'); c(1, 1, 46, 1, '#6a6068'); c(2, 7, 44, 10, '#1e181c');
    o(17, 8, 14, 8, '#f4f0e8', '#a09a90'); c(18, 10, 12, 1, '#a09a90'); c(18, 13, 12, 1, '#a09a90'); c(21, 11, 2, 2, '#222'); c(26, 9, 2, 2, '#222');
    c(2, 18, 44, 7, '#f4f0e8'); c(2, 24, 44, 1, '#c8c0b8'); for (let x = 2; x < 46; x += 3) c(x, 18, 1, 7, '#b8b0b0');
    for (let x = 3, i = 0; x < 45; x += 3, i++) if (i % 7 !== 2 && i % 7 !== 6) c(x + 1, 18, 2, 4, '#111');
    c(2, 30, 3, 8, OL); c(43, 30, 3, 8, OL); c(21, 34, 6, 2, GOLD);
    o(4, -5, 3, 7, '#f4f0e8', '#a09a90'); c(5, -8, 1, 3, t % 2 ? '#ffb347' : '#ffd27a'); } },
  gclock: { name: '괘종시계', cost: 300, w: 1, d: 1, h: 46, eff: '혼자 하는 게임 하루 보상 +1회', draw(p, t) { const { c, o } = p;
    o(1, 0, 14, 15, WD.f); c(2, 1, 12, 1, WD.l); c(5, 0, 6, 1, GOLD); o(3, 3, 10, 10, CR.l, GOLDD);
    c(7, 4, 2, 1, OL); c(7, 11, 2, 1, OL); c(4, 7, 1, 2, OL); c(11, 7, 1, 2, OL); c(7, 6, 2, 3, OL); c(8, 8, 3, 1, WN.t);
    o(3, 14, 10, 28, WD.f); o(5, 17, 6, 20, '#3a2418', OL); const sw = [0, 1, 1, 0, -1, -1][t % 6];
    c(7 + sw, 18, 2, 12, GOLD); o(6 + sw, 29, 4, 4, GOLD2, GOLDD); o(2, 41, 12, 5, WD.d); } },
  fireplace: { name: '벽난로', cost: 220, w: 3, d: 1, h: 46, draw(p, t) { const { c, o } = p;
    o(0, 0, 48, 46, '#8a8a92', '#3a3a42'); for (let y = 8; y < 44; y += 6) for (let x = ((y / 6) % 2) * 6; x < 46; x += 12) { c(x + 1, y, 1, 6, '#6a6a72'); } for (let y = 8; y < 44; y += 6) c(1, y, 46, 1, '#6a6a72');
    o(0, 0, 48, 8, WD.t, OL); c(1, 1, 46, 1, WD.l); c(1, 6, 46, 1, WD.d); c(8, 2, 4, 3, GOLD); c(36, 2, 4, 3, GOLD);
    o(9, 16, 30, 30, '#1a1214', OL); c(10, 17, 28, 2, '#2a1a14');
    const f1 = t % 2 ? '#ff9a3a' : '#ffb347', f2 = t % 2 ? '#ffd27a' : '#ffe8a0';
    c(13, 40, 22, 3, '#5a3420'); c(15, 38, 18, 2, '#7a4a28');
    [[14, 30, 5, 9], [20, 26 + (t % 2), 7, 13], [28, 31 - (t % 2), 5, 8]].forEach(([x, y, w, h]) => { c(x, y, w, h, f1); c(x + 1, y + 2, w - 2, h - 3, f2); });
    c(12, 43, 24, 2, '#ff6a2a'); } },
  cat: { name: '검은 고양이', cost: 180, w: 1, d: 1, h: 14, eff: '이스터에그 반짝임 범위 넓어짐', draw(p, t) { const { c, el } = p, br = (t >> 2) % 2;
    el(8, 9, 7, 4 + br, '#141418'); el(8, 9, 6, 3 + br, '#2a2a32'); c(4, 7, 5, 1, '#4a4a56'); c(10, 6, 3, 1, '#4a4a56');
    c(1, 9, 3, 3, '#2a2a32'); c(1, 8, 1, 2, '#2a2a32'); c(13, 4, 2, 3, '#2a2a32'); c(10, 4, 2, 3, '#2a2a32'); c(10, 3, 1, 1, '#2a2a32'); c(14, 3, 1, 1, '#2a2a32');
    c(11, 5, 1, 1, '#c06080'); c(13, 5, 1, 1, '#c06080'); c(10, 7, 2, 1, '#e8c77a'); c(13, 7, 2, 1, '#e8c77a');
    if ((t % 23) < 3) { c(4, 0, 1, 1, '#ffffff99'); c(6, -1, 2, 1, '#ffffff77'); } } },
  candle: { name: '촛대', cost: 35, w: 1, d: 1, h: 24, draw(p, t) { const { c, o, el } = p;
    el(8, 6, 8, 6, 'rgba(255,200,120,.10)'); o(4, 20, 8, 4, GOLD, GOLDD); c(7, 10, 2, 10, GOLD); c(2, 10, 12, 2, GOLD); c(2, 10, 12, 1, GOLD2);
    o(1, 3, 3, 7, '#f4f0e8', '#a09a90'); o(6, 1, 4, 9, '#f4f0e8', '#a09a90'); o(12, 3, 3, 7, '#f4f0e8', '#a09a90');
    const f = t % 2 ? '#ffb347' : '#ffd27a'; c(2, 0, 1, 3, f); c(7, -3, 2, 4, f); c(7, -2, 1, 1, '#fff2c0'); c(13, 0, 1, 3, f); } },
  chest: { name: '보물상자', cost: 45, w: 2, d: 1, h: 22, draw(p) { const { c, o } = p;
    o(1, 1, 30, 9, '#b8784a', WD.d); c(2, 2, 28, 2, '#d09a68'); o(1, 9, 30, 12, WD.f, OL); c(2, 14, 28, 1, WD.d);
    c(7, 1, 3, 20, GOLD); c(22, 1, 3, 20, GOLD); c(7, 1, 3, 1, GOLD2); c(22, 1, 3, 1, GOLD2); o(14, 8, 5, 6, GOLD2, GOLDD); c(16, 10, 1, 2, OL); } },
  /* --- 벽 장식 (벽 칸 w개) --- */
  window: { name: '창문', cost: 30, wall: true, w: 2, h: 36, wy: 4, draw(p, t) { const { c, o } = p;
    o(4, 2, 24, 30, '#f1e6cc', '#8a7a5a'); todSky(p, t, 6, 4, 20, 26); c(15, 4, 2, 26, '#f1e6cc'); c(6, 16, 20, 2, '#f1e6cc'); c(7, 5, 1, 4, 'rgba(255,255,255,.3)');
    c(0, 0, 7, 34, WN.t); c(1, 0, 1, 34, WN.l); c(5, 0, 1, 34, WN.f); c(25, 0, 7, 34, WN.t); c(26, 0, 1, 34, WN.f); c(30, 0, 1, 34, WN.l);
    c(0, 0, 32, 2, GOLD); c(3, 32, 26, 3, WD.t); c(3, 34, 26, 1, WD.d); } },
  painting: { name: '풍경화', cost: 40, wall: true, w: 2, h: 22, wy: 9, draw(p) { const { c, o } = p;
    o(2, 0, 28, 20, GOLD, GOLDD); c(3, 1, 26, 1, GOLD2); c(4, 3, 24, 15, '#3a4a7a'); c(4, 3, 24, 5, '#5a6a9a'); c(21, 4, 3, 3, '#f1ead8');
    c(4, 12, 24, 6, '#3e6a40'); c(7, 10, 6, 2, '#4f8a55'); c(16, 11, 8, 1, '#4f8a55'); c(11, 13, 3, 3, '#a8344a'); c(12, 14, 1, 1, GOLD2); } },
  gallery: { name: '액자 모음', cost: 60, wall: true, w: 2, h: 34, wy: 5, draw(p) { const { c, o } = p;
    o(2, 2, 12, 15, '#f1e6cc', '#6a4a32'); c(4, 4, 8, 11, '#e8a060'); c(6, 8, 4, 7, '#c8c8d0'); c(7, 6, 2, 2, '#f1e6cc');
    o(16, 0, 9, 11, '#f1e6cc', '#6a4a32'); c(18, 2, 5, 7, '#4f8a55'); c(19, 4, 3, 3, '#c8c8d0');
    o(26, 3, 6, 8, '#f1e6cc', '#6a4a32'); c(27, 4, 4, 6, '#8a8ab0');
    o(4, 20, 8, 12, '#f1e6cc', '#6a4a32'); c(6, 22, 4, 8, '#4f8a55'); o(15, 14, 15, 18, '#f1e6cc', '#6a4a32'); c(17, 16, 11, 14, '#f8f4ec'); c(20, 18, 5, 5, '#e8a060'); c(18, 24, 9, 5, '#c8c8d0'); } },
  portrait: { name: '초상화', cost: 60, wall: true, w: 1, h: 28, wy: 6, draw(p) { const { c, o } = p;
    o(1, 0, 14, 28, GOLD, GOLDD); c(2, 1, 12, 1, GOLD2); c(3, 3, 10, 22, '#3a2a20');
    o(6, 6, 5, 7, '#e8c8a8', '#8a6a50'); c(5, 5, 7, 3, '#2a1a10'); c(5, 5, 1, 8, '#2a1a10'); c(11, 5, 1, 8, '#2a1a10');
    c(7, 9, 1, 1, OL); c(9, 9, 1, 1, OL); o(4, 14, 9, 11, WN.f, WN.d); c(7, 14, 3, 4, '#f1ead8'); c(8, 17, 1, 1, GOLD); } },
  mirror: { name: '거울', cost: 50, wall: true, w: 1, h: 32, wy: 6, draw(p) { const { c, el } = p;
    el(8, 16, 7, 15, OL); el(8, 16, 6, 14, GOLD); el(8, 16, 4, 12, '#9ab8c4'); c(5, 8, 1, 7, '#e8f4f8'); c(6, 6, 1, 3, '#e8f4f8'); c(7, 0, 2, 2, GOLD2); } },
  garland: { name: '별 가랜드', cost: 25, wall: true, w: 2, h: 12, wy: 2, draw(p, t) { const { c } = p;
    for (let x = 0; x < 32; x++) c(x, 1 + Math.round(3 * Math.sin(Math.PI * x / 31)), 1, 1, '#8a7a5a');
    [[5, 3], [16, 5], [27, 3]].forEach(([x, y], i) => { const col = (t + i) % 2 ? GOLD2 : (i === 1 ? '#f4f0e8' : GOLD); c(x, y + 1, 1, 1, '#8a7a5a'); c(x - 2, y + 4, 5, 1, col); c(x - 1, y + 3, 3, 3, col); c(x, y + 2, 1, 5, col); }); } },
  sconce: { name: '벽촛대', cost: 30, wall: true, w: 1, h: 20, wy: 12, draw(p, t) { const { c, o, el } = p;
    el(8, 6, 7, 6, 'rgba(255,200,120,.10)'); o(5, 10, 6, 8, GOLD, GOLDD); c(7, 7, 2, 4, GOLD); c(4, 6, 8, 2, GOLD);
    o(6, 0, 4, 7, '#f4f0e8', '#a09a90'); c(7, -3, 2, 3, t % 2 ? '#ffb347' : '#ffd27a'); } },
  wclock: { name: '벽시계', cost: 45, wall: true, w: 1, h: 16, wy: 8, draw(p, t) { const { c, el } = p;
    el(8, 8, 7, 7, OL); el(8, 8, 6, 6, WD.f); el(8, 8, 5, 5, CR.l); c(8, 4, 1, 4, OL); const m = [[9, 8, 3, 1], [8, 8, 1, 4], [5, 8, 3, 1], [8, 5, 1, 3]][(t >> 3) % 4]; c(m[0], m[1], m[2], m[3], WN.t); } },
};
const WALLS = {
  plain: { name: '기본 벽', cost: 0 }, green: { name: '숲빛 초록', cost: 30 }, stripe: { name: '와인 줄무늬', cost: 40 }, damask: { name: '녹색 다마스크', cost: 70 },
  panel: { name: '나무 패널', cost: 60 }, brick: { name: '붉은 벽돌', cost: 50 }, night: { name: '별밤', cost: 90 },
};
const FLOORS = {
  plank: { name: '나무 마루', cost: 0 }, checker: { name: '체크 타일', cost: 50 }, carpet: { name: '붉은 카펫', cost: 60 },
  stone: { name: '돌바닥', cost: 40 }, herring: { name: '헤링본', cost: 80 },
};
const hsh = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
function drawWall(g, k, t) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const X = OX, Y = OY, W = COLS * T, H = WALL_H;
  const base = { plain: '#6a5444', green: '#3e6e50', stripe: '#5a2a32', damask: '#2e4434', panel: '#7a6050', brick: '#7a3a2a', night: '#1a1e3a' }[k] || '#6a5444';
  R(X, Y, W, H, base);
  if (k === 'plain') for (let x = X; x < X + W; x += 12) R(x, Y, 1, H, '#624c3e');
  if (k === 'green') { for (let i = 0; i < 40; i++) { const x = X + hsh(i, 3) % W, y = Y + hsh(i, 5) % (H - 10); R(x, y, 2, 1, '#467a5a'); } R(X, Y, 10, 6, '#355e44'); R(X + W - 12, Y, 12, 5, '#355e44'); }
  if (k === 'stripe') for (let x = X; x < X + W; x += 12) { R(x, Y, 6, H, '#6a3440'); R(x + 9, Y, 1, H, '#7a4048'); }
  if (k === 'damask') for (let y = Y + 3; y < Y + H - 8; y += 10) for (let x = X + ((y / 10) % 2) * 6; x < X + W; x += 12) { R(x + 2, y, 2, 1, '#3e5a44'); R(x + 1, y + 1, 4, 2, '#3e5a44'); R(x + 2, y + 3, 2, 2, '#3e5a44'); R(x + 2, y + 1, 2, 1, '#4e6c52'); }
  if (k === 'panel') { R(X, Y + 22, W, H - 22, '#5a4030'); R(X, Y + 22, W, 2, '#8a6a50'); for (let x = X + 2; x < X + W; x += 24) { R(x, Y + 27, 20, 14, '#4a3226'); R(x + 1, Y + 28, 18, 12, '#664a38'); } }
  if (k === 'brick') for (let y = Y, r = 0; y < Y + H; y += 6, r++) { R(X, y, W, 1, '#5a2a1e'); for (let x = X + (r % 2) * 6; x < X + W; x += 12) { R(x, y, 1, 6, '#5a2a1e'); if (hsh(x, r) % 3 === 0) R(x + 1, y + 1, 11, 5, '#84402e'); } }
  if (k === 'night') { for (let i = 0; i < 36; i++) { const x = X + hsh(i, 7) % W, y = Y + hsh(i, 13) % (H - 10); R(x, y, 1, 1, (t + i) % 9 ? '#c8c0a0' : '#ffffff'); } R(X + W - 30, Y + 6, 8, 8, '#f1ead8'); R(X + W - 27, Y + 5, 7, 7, '#1a1e3a'); }
  // 벽 아래 걸레받이 · 위쪽 그림자
  R(X, Y, W, 3, 'rgba(0,0,0,.22)'); R(X, Y + H - 5, W, 5, WD.f); R(X, Y + H - 5, W, 1, WD.l); R(X, Y + H - 1, W, 1, WD.d);
}
function drawFloor(g, k) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const X = OX, Y = FY, W = COLS * T, H = ROWS * T;
  if (k === 'checker') for (let y = 0; y < H; y += 12) for (let x = 0; x < W; x += 12) { const d = ((x + y) / 12) % 2; R(X + x, Y + y, 12, 12, d ? '#2e2e34' : '#e4dccc'); R(X + x, Y + y, 12, 1, d ? '#3e3e46' : '#f4ecdc'); }
  else if (k === 'carpet') { R(X, Y, W, H, '#7a2434'); for (let y = 4; y < H; y += 12) for (let x = (y % 24 > 12 ? 6 : 0); x < W; x += 12) { R(X + x + 2, Y + y, 2, 1, '#9a3448'); R(X + x + 1, Y + y + 1, 4, 1, '#9a3448'); R(X + x + 2, Y + y + 2, 2, 1, '#9a3448'); } R(X, Y + 2, W, 2, '#c9a96a'); R(X, Y + H - 4, W, 2, '#c9a96a'); }
  else if (k === 'stone') { R(X, Y, W, H, '#4a4a50'); for (let y = 0, r = 0; y < H; y += 12, r++) for (let x = (r % 2) * -12; x < W; x += 24) { const cs = ['#7a7a80', '#848488', '#6e6e74'][hsh(x, r) % 3]; R(X + Math.max(0, x + 1), Y + y + 1, Math.min(23, W - x - 1), 11, cs); R(X + Math.max(0, x + 1), Y + y + 1, Math.min(23, W - x - 1), 1, '#9a9aa0'); } }
  else if (k === 'herring') { R(X, Y, W, H, '#6a4026'); for (let y = 0; y < H; y += 6) for (let x = 0; x < W; x += 12) { const s = ((y / 6) % 2) * 6; R(X + x + s, Y + y, 6, 6, '#b47a48'); R(X + x + s, Y + y, 6, 1, '#cc925c'); R(X + x + 6 - s, Y + y, 6, 6, '#9a6238'); } }
  else { R(X, Y, W, H, '#c4864e'); for (let x = 0, cI = 0; x < W; x += 12, cI++) { R(X + x, Y, 1, H, '#a06a3a'); R(X + x + 1, Y, 1, H, '#d29a60');
      for (let y = (cI * 37) % 40; y < H; y += 40) R(X + x, Y + y, 12, 1, '#a06a3a'); for (let i = 0; i < 4; i++) R(X + x + 3 + (i % 3) * 2, Y + hsh(cI, i) % H, 1, 3, '#b67a44'); } }
  R(X, Y, W, 3, 'rgba(0,0,0,.18)');
}
function drawFrame(g) {   // 방 바깥 나무 테두리
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  R(0, 0, RW, RH, '#120c08'); R(OX - 4, OY - 4, COLS * T + 8, WALL_H + ROWS * T + 8, '#5a3a22'); R(OX - 3, OY - 3, COLS * T + 6, 1, '#8a5a34'); R(OX - 1, OY - 1, COLS * T + 2, WALL_H + ROWS * T + 2, '#2a1a12');
}

/* ---------- 방 데이터 ---------- */
let RM = { edit: false, sel: null, drag: null, hover: null, t: 0 };
let RV = null;                 // 놀러 간 방 주인 uid
let ROOMLIKES = [], GUESTBOOK = [], roomUnsubs = [];
const rmId = () => Math.random().toString(36).slice(2, 9);
function defaultRoom() {
  return { v: 3, wall: 'plain', floor: 'plank', ow: ['plain', 'plank'], inv: {},
    items: [{ id: rmId(), k: 'bed', c: 0, r: 0 }, { id: rmId(), k: 'desk', c: 8, r: 0 }, { id: rmId(), k: 'chair', c: 9, r: 1 }, { id: rmId(), k: 'window', c: 4, r: -1 }] };
}
const fw = k => (FURN[k] || {}).w || 1, fd = k => (FURN[k] || {}).wall ? 0 : ((FURN[k] || {}).d || 1);
/* 예전(정면 시점 8×3칸) 배치를 새 격자로 옮겨요. 자리가 겹치면 보관함으로 */
function migrateRoom(r) {
  if (r.v === 3) return false;
  const old = r.items || []; r.items = []; r.v = 3;
  const order = old.slice().sort((a, b) => (FURN[b.k] && FURN[b.k].flat ? 1 : 0) - (FURN[a.k] && FURN[a.k].flat ? 1 : 0));
  order.forEach(i => {
    if (!FURN[i.k]) return;
    const f = FURN[i.k], tc = Math.round(i.c * COLS / 8), tr = f.wall ? -1 : Math.min(ROWS - fd(i.k), Math.max(0, (i.r | 0) * 3));
    const s = nearFree(r, i.k, tc, tr);
    if (s) r.items.push({ id: i.id || rmId(), k: i.k, c: s.c, r: s.r }); else r.inv[i.k] = (r.inv[i.k] || 0) + 1;
  });
  return true;
}
function nearFree(room, k, c0, r0) {
  const f = FURN[k]; if (!f) return null;
  const cand = [];
  if (f.wall) { for (let c = 0; c <= COLS - f.w; c++) cand.push({ c, r: -1, d: Math.abs(c - c0) }); }
  else for (let r = 0; r <= ROWS - fd(k); r++) for (let c = 0; c <= COLS - f.w; c++) cand.push({ c, r, d: Math.abs(c - c0) + Math.abs(r - r0) * 1.2 });
  cand.sort((a, b) => a.d - b.d); return cand.find(s => fits(room, k, s.c, s.r)) || null;
}
let ROOM_SAVE_T = 0;
function myRoom() {
  if (!P.room) P.room = defaultRoom(); const r = P.room; r.inv = r.inv || {}; r.items = r.items || []; r.ow = r.ow || ['plain', 'plank'];
  if (migrateRoom(r) && Date.now() - ROOM_SAVE_T > 3000) { ROOM_SAVE_T = Date.now(); setTimeout(() => saveP(), 0); }
  return r;
}
function hoRoom(uid) { if (ME && uid === ME.uid) return myRoom(); const p = PROGS.find(x => x.id === uid); const r = p && p.room ? JSON.parse(JSON.stringify(p.room)) : defaultRoom(); r.inv = r.inv || {}; r.items = r.items || []; migrateRoom(r); return r; }
function roomCnt(k) { if (!P || !P.room) return 0; const items = (P.room.items || []); if (k === 'plant') return items.filter(i => i.k === 'plant' || i.k === 'bigplant').length; return items.filter(i => i.k === k).length; }

function fits(room, k, c, r, skipId) {
  const f = FURN[k]; if (!f) return false; const w = f.w;
  if (c < 0 || c + w > COLS) return false;
  if (f.wall) return r === -1 && !room.items.some(i => { if (i.id === skipId || i.r !== -1 || !FURN[i.k]) return false; return c < i.c + fw(i.k) && i.c < c + w; });
  const d = fd(k); if (r < 0 || r + d > ROWS) return false;
  return !room.items.some(i => { if (i.id === skipId || i.r < 0) return false; const g = FURN[i.k]; if (!g || g.wall || !!g.flat !== !!f.flat) return false;
    return c < i.c + g.w && i.c < c + w && r < i.r + fd(i.k) && i.r < r + d; });
}
function spotAt(k, x, y) {
  const f = FURN[k]; if (!f) return null;
  const c = Math.max(0, Math.min(COLS - f.w, Math.round((x - OX) / T - f.w / 2)));
  if (f.wall) return { c, r: -1 };
  const r = Math.max(0, Math.min(ROWS - fd(k), Math.round((y - FY) / T - fd(k) / 2)));
  return { c, r };
}
function itemBox(i) {
  const f = FURN[i.k]; if (!f) return null;
  if (i.r === -1) return { x: OX + i.c * T, y: OY + (f.wy != null ? f.wy : Math.round((WALL_H - 6 - f.h) / 2)), w: f.w * T, h: f.h };
  const bottom = FY + (i.r + fd(i.k)) * T, h = Math.max(f.h, fd(i.k) * T);
  return { x: OX + i.c * T, y: bottom - f.h, w: f.w * T, h: f.h, top: bottom - h, foot: { x: OX + i.c * T, y: FY + i.r * T, w: f.w * T, h: fd(i.k) * T } };
}
function itemAt(room, x, y) {
  return drawOrder(room).reverse().find(i => { const b = itemBox(i); return b && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h; }) || null;
}
function drawOrder(room) {
  const L = i => { const f = FURN[i.k] || {}; return f.wall ? 0 : f.flat ? 1 : 2; };
  return room.items.filter(i => FURN[i.k]).slice().sort((a, b) => L(a) - L(b) || (a.r + fd(a.k)) - (b.r + fd(b.k)) || a.c - b.c);
}
function drawSprite(g, k, x, y, t, alpha) {
  const f = FURN[k]; if (!f) return;
  g.save(); if (alpha != null) g.globalAlpha = alpha; f.draw(pen(g, x, y), t || 0); g.restore();
}
function paintRoom(cv, room, opts) {
  if (!cv) return; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const t = RM.t, edit = opts && opts.edit;
  drawFrame(g); drawWall(g, WALLS[room.wall] ? room.wall : 'plain', t); drawFloor(g, FLOORS[room.floor] ? room.floor : 'plank');
  if (edit) { g.fillStyle = 'rgba(255,255,255,.08)'; for (let c = 0; c <= COLS; c++) g.fillRect(OX + c * T, FY, 1, ROWS * T); for (let r = 0; r <= ROWS; r++) g.fillRect(OX, FY + r * T, COLS * T, 1);
    for (let c = 0; c <= COLS; c++) g.fillRect(OX + c * T, OY + 2, 1, WALL_H - 8); }
  const dragId = RM.drag && RM.drag.moved ? RM.drag.id : null;
  drawOrder(room).forEach(i => {
    const b = itemBox(i); if (!b) return; const f = FURN[i.k];
    if (i.r >= 0 && !f.flat) { g.fillStyle = 'rgba(30,15,5,.22)'; g.fillRect(b.x + 2, b.y + b.h - 3, b.w - 4, 4); g.fillRect(b.x + 4, b.y + b.h + 1, b.w - 8, 1); }
    drawSprite(g, i.k, b.x, b.y, t, i.id === dragId ? .35 : null);
    if (edit && RM.sel === 'id:' + i.id) { g.strokeStyle = '#ffe08a'; g.lineWidth = 1; g.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1); if (b.foot) { g.strokeStyle = 'rgba(255,224,138,.6)'; g.strokeRect(b.foot.x + .5, b.foot.y + .5, b.foot.w - 1, b.foot.h - 1); } }
  });
  if (edit && RM.hover) {
    const k = RM.hover.k, s = RM.hover, ok = fits(room, k, s.c, s.r, RM.hover.skip), b = itemBox({ k, c: s.c, r: s.r });
    g.fillStyle = ok ? 'rgba(120,220,120,.28)' : 'rgba(230,80,80,.32)';
    if (b.foot) g.fillRect(b.foot.x, b.foot.y, b.foot.w, b.foot.h); else g.fillRect(b.x, b.y, b.w, b.h);
    drawSprite(g, k, b.x, b.y, t, .65);
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
     ${inv.length ? `<div class="toggles">${inv.map(([k, n]) => `<span class="chip ${selInv === k ? 'on' : ''}" onclick="RM.sel='inv:${k}';RM.hover=null;render()"><canvas class="fprev" data-k="${k}" width="${FURN[k].w * 16}" height="48"></canvas> ${FURN[k].name}${n > 1 ? ' ×' + n : ''}</span>`).join('')}</div>` : '<p class="muted">비어 있어요. 가구점에서 사 오세요.</p>'}
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
  if (FURN[k]) { const f = FURN[k]; drawSprite(g, k, Math.round((c.width - f.w * 16) / 2), Math.max(f.wall ? 4 : 9, c.height - f.h - (f.wall ? Math.round((c.height - f.h) / 2) : 1)), RM.t); return; }
  const tmp = document.createElement('canvas'); tmp.width = RW; tmp.height = RH; const tg = tmp.getContext('2d');
  if (WALLS[k]) { drawWall(tg, k, 0); g.drawImage(tmp, OX + 20, OY + 8, 32, 32, 0, 0, c.width, c.height); }
  if (FLOORS[k]) { drawFloor(tg, k); g.drawImage(tmp, OX + 20, FY + 20, 32, 32, 0, 0, c.width, c.height); }
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
const ROOM_TALK = { sofa: ['푹신한 벨벳 소파.'], fireplace: ['장작이 타닥타닥 탄다.'], armchair: ['앉으면 잠들 것 같다.'], wclock: ['째깍, 째깍.'], gallery: ['추억이 담긴 액자들.'],  cat: ['냐아.', '골골골…', '(꼬리를 살랑인다)'], gclock: ['똑딱, 똑딱.'], piano: ['♪ 도-미-솔'], teaset: ['향긋한 홍차 냄새.'], safe: ['단단히 잠겨 있다.'], chest: ['무엇이 들었을까?'], mirror: ['거울 속의 나와 눈이 마주쳤다.'], window: ['숲 위로 달이 떠 있다.'], plant: ['잎이 싱그럽다.'], bed: ['폭신해 보인다.'] };
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
      if (Math.abs(p.x - RM.drag.x0) + Math.abs(p.y - RM.drag.y0) > 6) RM.drag.moved = true;
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
  if (!fits(room, it.k, s.c, s.r, it.id)) { sfx('bad'); toast('거기엔 이미 무언가 있어요'); render(); return; }
  it.c = s.c; it.r = s.r; sfx('tap'); saveP(); render();
}
function placeInv(k, s) {
  const room = myRoom(), f = FURN[k];
  if (!s || !(room.inv[k] > 0)) return;
  if (!fits(room, k, s.c, s.r)) { sfx('bad'); toast('거기엔 이미 무언가 있어요'); return; }
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
      <canvas class="fprev" data-k="${k}" width="${f.w * 16}" height="58" style="width:${f.w * 16 * 1.25}px;height:72px"></canvas>
      <div style="flex:1;margin-left:10px"><b>${f.name}</b><span class="muted"> (${f.wall ? f.w + '칸' : f.w + '×' + (f.d || 1) + '칸'})</span>${owned(k) ? ` <span class="badge">보유 ${owned(k)}</span>` : ''}
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
