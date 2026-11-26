/* ================= 새 그림체 가구 (1칸 128px · 가는 선 · 디더 음영) =================
   FURN[k].drawQ(p, t, C, dir) → 그 방향을 그렸으면 true. 못 그린 방향은 room.js 필터 그림으로.
   좌표: 1칸 = 128, 높이는 기본 px × 4.
=================================================================================== */
const QR_CACHE = {};
function qr(hex) {   // 차분한 6단 색 (부분별 색 바꾸기 그대로 따라감)
  hex = (hex || '#888888').toLowerCase(); if (QR_CACHE[hex]) return QR_CACHE[hex];
  const n = parseInt(hex.slice(1), 16), [h, s0, l] = st2Rgb2Hsl(n >> 16 & 255, n >> 8 & 255, n & 255), s = s0 * .82, cl = v => Math.max(0, Math.min(1, v));
  const f = (dl, toh, k, ds) => { const [r, g, b] = st2Hsl2Rgb(toh == null ? h : st2HueTo(h, toh, k), cl(s + (ds || 0)), cl(l + dl)); return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join(''); };
  const [or, og, ob] = st2Hsl2Rgb(st2HueTo(h, .97, .7), .2, Math.min(.34, .19 + l * .14)), ol = '#' + [or, og, ob].map(v => v.toString(16).padStart(2, '0')).join('');
  return QR_CACHE[hex] = { hl: f(.16, .11, .3, -.1), l: f(.075, .1, .15, -.04), m: f(0), s: f(-.075, .95, .25, .02), d: f(-.15, .95, .4, .03), ol };
}
/* 디더 · 얼룩 · 상자 */
function qD(p, x, y, w, h, col, ph) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (((xx + yy + (ph || 0)) & 1) === 0) p.c(xx, yy, 1, 1, col); }
function qD4(p, x, y, w, h, col) { for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (!(xx & 1) && !(yy & 1) && (((xx >> 1) + (yy >> 1)) & 1)) p.c(xx, yy, 1, 1, col); }
function qMott(p, x, y, w, h, col, seed, n) { for (let i = 0; i < n; i++) { const pw = 6 + hsh(i, seed) % 12, ph = 2 + hsh(seed, i) % 4, px = x + hsh(i * 3, seed + 1) % Math.max(1, w - pw), py = y + hsh(seed + 2, i * 5) % Math.max(1, h - ph); qD(p, px, py, pw, ph, col, i); } }
function qRR(p, x, y, w, h, col, r) { for (let i = 0; i < h; i++) { const e = Math.min(i, h - 1 - i), ins = e < r ? r - Math.round(Math.sqrt(r * r - (r - e - .5) * (r - e - .5))) : 0; p.c(x + ins, y + i, w - ins * 2, 1, col); } }
function qBox(p, x, y, w, h, R, fill) { p.c(x, y, w, h, R.ol); p.c(x + 1, y + 1, w - 2, h - 2, fill || R.m); }
/* 나무 면: 바탕 + 얼룩 + 위 빛 + 아래 그늘 (경계는 디더) */
function qWood(p, x, y, w, h, R, seed, o) { o = o || {}; qBox(p, x, y, w, h, R);
  const X = x + 1, Y = y + 1, W = w - 2, H = h - 2;
  if (!o.flat) qMott(p, X + 2, Y + 2, W - 4, H - 4, R.s, seed || 1, Math.max(1, Math.round(W * H / 700)));
  if (o.top !== false) { p.c(X, Y, W, 1, R.l); if (H > 6) qD(p, X, Y + 1, W, 1, R.l); }
  if (o.bot !== false && H > 5) { p.c(X, Y + H - 2, W, 2, R.s); qD(p, X, Y + H - 3, W, 1, R.s); }
  if (o.left) { p.c(X, Y + 1, 1, H - 2, R.l); }
  if (o.right) { p.c(X + W - 2, Y + 1, 2, H - 2, R.s); qD(p, X + W - 3, Y + 1, 1, H - 2, R.s); } }
/* 서랍: 들어간 테두리 + 앞판 + 손잡이 */
function qDrawer(p, x, y, w, h, R, knob) { p.c(x, y, w, h, R.d); p.c(x + 1, y + 1, w - 2, h - 2, R.m); p.c(x + 1, y + 1, w - 2, 2, R.s); qD(p, x + 1, y + 3, w - 2, 1, R.s); p.c(x + 1, y + h - 2, w - 2, 1, R.l);
  if (knob !== false) qKnob(p, x + (w >> 1), y + (h >> 1) + 1); }
function qKnob(p, cx, cy) { const K = qr('#e6c8a0'); p.el(cx, cy, 3, 3, K.ol); p.el(cx, cy, 2, 2, K.m); p.c(cx - 1, cy - 1, 1, 1, K.hl); p.c(cx + 1, cy + 1, 1, 1, K.s); }
/* 크림빛 번짐: rows = [[y, xL, xR], …] 의 바깥쪽에 성긴 점 */
function qHalo(p, rows, cx, cy, r) {
  for (let k = 3; k >= 1; k--) p.el(cx, cy, Math.round(r * k / 3), Math.round(r * k / 3 * .8), 'rgba(255,236,190,.035)');
  const col = d => `rgba(250,238,206,${[0, .55, .42, .3, .18][d]})`;
  rows.forEach(([y, a, b]) => { for (let d = 1; d <= 4; d++) { if (d >= 3 && ((y + d) & 1)) continue; p.c(a - d - 1, y, 1, 1, col(d)); p.c(b + d, y, 1, 1, col(d)); } });
  const top = rows[0], bot = rows[rows.length - 1];
  for (let d = 1; d <= 4; d++) for (let x = top[1]; x <= top[2]; x++) if (d < 3 || !((x + d) & 1)) p.c(x, top[0] - d, 1, 1, col(d));
  for (let d = 1; d <= 3; d++) for (let x = bot[1]; x <= bot[2]; x++) if (d < 2 || !((x + d) & 1)) p.c(x, bot[0] + d, 1, 1, col(d + 1));
}
/* 갓 (사다리꼴, 오른쪽 빛 · 왼쪽 그늘 · 위아래 테) */
function qShade(p, cx, y0, h, wt, wb, A, glow) {
  const rows = []; for (let i = 0; i <= h; i++) { const hw = Math.round(wt + (wb - wt) * i / h); rows.push([y0 + i, cx - hw, cx + hw - 1]); }
  if (glow) qHalo(p, rows, cx, y0 + h * .55, wb * 1.6);
  rows.forEach(([y, a, b], i) => { const w = b - a + 1;
    p.c(a, y, w, 1, A.ol); if (i === 0 || i === h) return;
    p.c(a + 1, y, w - 2, 1, i < 4 ? A.l : i > h - 4 ? A.s : A.m);
    if (i >= 4 && i <= h - 4) { const sl = Math.round(w * .2), hr = Math.round(w * .3);
      p.c(a + 1, y, Math.max(1, sl - 3), 1, A.s); qD(p, a + sl - 2, y, 4, 1, A.s);
      for (let x = b - hr; x < b - 2; x++) if (((x + y) & 1) === 0 || x > b - hr * .55) p.c(x, y, 1, 1, A.hl);
      if (i % 9 === 4) qD(p, a + sl + 4, y, w - sl - hr - 8, 1, A.l, 1); }
    if (i === 3) p.c(a + 1, y, w - 2, 1, A.s); if (i === h - 4) p.c(a + 1, y, w - 2, 1, A.s); });
  return rows;
}

/* ---------- 협탁 + 탁상 스탠드 (128 × 176) ---------- */
function NSTANDQ(p, t, C) { const { c, el } = p, B = qr(C.b.t), A = qr(C.a.t), M = qr('#c6c2c0');
  // 스탠드
  qShade(p, 64, 6, 46, 21, 44, A, true);
  c(60, 53, 9, 18, M.ol); c(61, 53, 7, 18, M.m); c(61, 53, 2, 18, M.hl); c(66, 53, 1, 18, M.s);
  el(64, 73, 19, 4, M.ol); el(64, 72, 17, 3, M.m); c(54, 71, 12, 1, M.hl); qD(p, 70, 73, 10, 1, M.s);
  // 상판
  qWood(p, 2, 76, 124, 13, B, 3, { right: true }); c(3, 77, 122, 1, B.hl); qD(p, 3, 78, 122, 1, B.hl, 1);
  // 몸통
  c(8, 89, 112, 69, B.ol); c(9, 89, 110, 68, B.m); qMott(p, 11, 92, 106, 62, B.s, 7, 9); c(9, 89, 110, 2, B.d); qD(p, 9, 91, 110, 1, B.d);
  c(116, 91, 3, 66, B.s); qD(p, 115, 91, 1, 66, B.s);
  qDrawer(p, 16, 96, 96, 26, B);
  // 아래 칸 (어두운 서랍)
  c(16, 127, 96, 25, B.ol); c(17, 128, 94, 23, B.s); c(17, 128, 94, 3, B.d); qD(p, 17, 131, 94, 2, B.d); qMott(p, 20, 134, 88, 14, B.d, 9, 3); c(17, 150, 94, 1, B.m);
  c(9, 154, 110, 4, B.s);
  // 다리
  [10, 106].forEach((x, i) => { c(x, 157, 12, 19, B.ol); c(x + 1, 157, 10, 18, B.m); c(x + 1, 157, 2, 18, B.l); c(x + 8, 157, 3, 18, B.s); qD(p, x + 7, 157, 1, 18, B.s); });
  return true;
}
/* ---------- 스탠드 (128 × 320) ---------- */
function LAMPQ(p, t, C) { const { c, el } = p, A = qr(C.a.t), M = qr(C.c.t);
  el(64, 312, 34, 5, 'rgba(60,40,44,.18)');
  qShade(p, 64, 8, 82, 22, 50, A, true);
  c(60, 91, 9, 210, M.ol); c(61, 91, 7, 210, M.m); c(61, 91, 2, 210, M.hl); qD(p, 63, 91, 1, 210, M.l); c(66, 91, 2, 210, M.s);
  c(56, 92, 17, 5, M.ol); c(57, 93, 15, 3, M.l); c(57, 95, 15, 1, M.s);
  c(57, 186, 15, 8, M.ol); c(58, 187, 13, 6, M.m); c(58, 187, 13, 1, M.hl); c(58, 192, 13, 1, M.s);
  el(64, 304, 32, 8, M.ol); el(64, 303, 30, 7, M.m); el(64, 301, 26, 4, M.l); c(44, 299, 20, 1, M.hl); qD(p, 70, 306, 22, 2, M.s);
  return true;
}
/* ---------- 나무 의자 앞 (128 × 184) ---------- */
function CHAIRQ(p, t, C) { const { c, el } = p, B = qr(C.b.t), A = qr(C.a.t);
  // 기둥 (뒷다리가 등받이까지)
  [16, 100].forEach(x => { c(x, 8, 13, 176, B.ol); c(x + 1, 8, 11, 175, B.m); c(x + 1, 8, 2, 175, B.l); c(x + 9, 8, 3, 175, B.s); qD(p, x + 8, 8, 1, 175, B.s); });
  // 위 가로대
  qWood(p, 10, 2, 108, 16, B, 5); c(11, 3, 106, 1, B.hl); qKnob(p, 64, 10);
  // 등받이 천
  c(29, 18, 71, 74, A.ol); c(30, 18, 69, 73, A.m); c(30, 18, 69, 3, A.s); qD(p, 30, 21, 69, 1, A.s); c(30, 21, 2, 68, A.l); qD(p, 32, 21, 1, 68, A.l);
  c(94, 21, 5, 70, A.s); qD(p, 93, 21, 1, 70, A.s); qMott(p, 34, 26, 58, 60, A.s, 11, 5);
  [[48, 44], [80, 44], [64, 62], [48, 78], [80, 78]].forEach(([x, y]) => { c(x - 1, y - 1, 3, 3, A.d); c(x - 1, y - 2, 3, 1, A.l); c(x, y, 1, 1, A.s); });
  // 앉는 자리 (윗면 + 앞 쿠션)
  c(10, 90, 108, 34, A.ol); c(11, 91, 106, 12, A.l); qD(p, 11, 101, 106, 2, A.m); c(11, 103, 106, 19, A.m); c(11, 91, 106, 1, A.hl); qD(p, 11, 92, 106, 1, A.hl);
  c(11, 103, 106, 1, A.s); c(11, 118, 106, 4, A.s); qD(p, 11, 116, 106, 2, A.s); c(11, 104, 2, 14, A.l); c(113, 104, 4, 14, A.s);
  // 앉는 자리 밑 나무 테
  qWood(p, 12, 123, 104, 12, B, 13);
  // 앞다리
  [18, 98].forEach(x => { c(x, 134, 13, 50, B.ol); c(x + 1, 134, 11, 49, B.m); c(x + 1, 134, 2, 49, B.l); c(x + 9, 134, 3, 49, B.s); qD(p, x + 8, 134, 1, 49, B.s); c(x + 1, 134, 11, 2, B.d); });
  c(31, 160, 67, 6, B.ol); c(32, 161, 65, 4, B.m); c(32, 161, 65, 1, B.l); c(32, 164, 65, 1, B.s);
  return true;
}
/* ---------- 책상 앞 (256 × 144) ---------- */
function DESKQ(p, t, C) { const { c, el } = p, B = qr(C.b.t), M = qr(C.c.t), P = qr(C.a.t);
  // 책상 위: 책 두 권 · 종이 · 잉크병
  c(22, 10, 38, 8, P.ol); c(23, 11, 36, 6, P.m); c(23, 11, 36, 1, P.l); c(55, 11, 3, 6, '#efe8dc');
  const P2 = qr('#8c6c76'); c(26, 17, 34, 8, P2.ol); c(27, 18, 32, 6, P2.m); c(27, 18, 32, 1, P2.l); c(55, 18, 3, 6, '#efe8dc');
  c(98, 14, 40, 10, '#6e6266'); c(99, 15, 38, 9, '#f1ece4'); for (let y = 17; y < 23; y += 2) c(102, y, 30 - (y % 4) * 2, 1, '#bfb6b4');
  el(160, 19, 7, 5, '#4a3a3d'); el(160, 18, 6, 4, '#5e5a74'); c(158, 15, 2, 2, '#9a96ac'); for (let i = 0; i < 16; i++) c(163 + i, 16 - i, 1, 1, i < 3 ? '#4a3a3d' : '#efe8dc');
  // 상판
  qWood(p, 0, 24, 256, 34, B, 3); c(1, 25, 254, 1, B.hl); qD(p, 1, 26, 254, 1, B.hl, 1); c(1, 48, 254, 9, B.s); c(1, 48, 254, 1, B.ol); qD(p, 1, 47, 254, 1, B.s);
  // 몸통 앞면
  c(4, 58, 248, 10, B.ol); c(5, 58, 246, 9, B.s); qD(p, 5, 58, 246, 2, B.d);
  // 왼쪽 서랍장
  c(8, 66, 88, 72, B.ol); c(9, 66, 86, 71, B.m); qMott(p, 11, 68, 82, 66, B.s, 9, 4); c(92, 67, 3, 70, B.s);
  qDrawer(p, 14, 71, 76, 28, B); qDrawer(p, 14, 103, 76, 28, B);
  // 가운데 서랍
  qDrawer(p, 104, 66, 80, 20, B);
  // 오른쪽 다리 + 왼쪽 받침
  c(220, 66, 26, 78, B.ol); c(221, 66, 24, 77, B.m); c(221, 66, 3, 77, B.l); c(240, 66, 5, 77, B.s); qD(p, 239, 66, 1, 77, B.s); qMott(p, 225, 70, 14, 68, B.s, 21, 2);
  c(8, 136, 88, 8, B.ol); c(9, 136, 86, 7, B.s); c(9, 136, 86, 1, B.d);
  return true;
}
/* ---------- 책장 앞 (256 × 352) ---------- */
function SHELFQ(p, t, C) { const { c } = p, B = qr(C.b.t);
  const bookCols = ['#8c6c76', '#6e7a92', '#c8b490', '#7a8a72', '#7a6a8a', '#a88070', '#e4dccc', '#6a8486', '#9a6a6a', '#c8b878'];
  // 위 장식 (처마)
  qWood(p, 0, 0, 256, 22, B, 2); c(1, 1, 254, 1, B.hl); qD(p, 1, 2, 254, 1, B.hl, 1); for (let x = 10; x < 246; x += 12) { c(x, 10, 6, 5, B.s); c(x, 10, 6, 1, B.d); }
  // 몸통 + 안쪽
  c(6, 22, 244, 288, B.ol); c(7, 22, 242, 287, B.m); qMott(p, 9, 24, 238, 280, B.s, 5, 10);
  c(18, 28, 220, 196, B.ol); c(19, 29, 218, 194, B.d); c(19, 29, 218, 4, qr(B.d).d); qD(p, 19, 33, 218, 2, qr(B.d).d);
  c(7, 22, 3, 287, B.l); c(244, 22, 5, 287, B.s); qD(p, 243, 22, 1, 287, B.s);
  // 칸마다 책
  for (let r = 0; r < 4; r++) { const y1 = 29 + (r + 1) * 49 - 6, y0 = y1 - 40; let x = 21, i = r * 7 + 1;
    while (x < 232) { const kind = hsh(i, r + 3) % 17, R = qr(bookCols[hsh(i, r) % bookCols.length]);
      if (kind === 0 && x + 30 < 234) { for (let k = 0; k < 3; k++) { const Rk = qr(bookCols[hsh(i, k + 9) % bookCols.length]), bw = 28 - k * 4, by = y1 - 7 - k * 7; c(x + k * 2, by, bw, 7, Rk.ol); c(x + k * 2 + 1, by + 1, bw - 2, 5, Rk.m); c(x + k * 2 + 1, by + 1, bw - 2, 1, Rk.l); c(x + k * 2 + bw - 5, by + 1, 3, 5, '#efe8dc'); } x += 32; i++; continue; }
      if (kind === 1 && (i + r) % 3 === 0 && x + 16 < 234) { const G = qr('#7a8a72'), Pt = qr('#a88070'); c(x + 2, y1 - 12, 12, 12, Pt.ol); c(x + 3, y1 - 11, 10, 11, Pt.m); c(x + 3, y1 - 11, 2, 11, Pt.l); p.el(x + 8, y1 - 17, 7, 6, G.ol); p.el(x + 8, y1 - 17, 6, 5, G.m); c(x + 5, y1 - 21, 3, 2, G.l); x += 18; i++; continue; }
      const bw = 6 + hsh(i, 5) % 5, bh = 26 + hsh(i, 6) % 13; if (x + bw > 234) break;
      const lean = kind === 2 && x + bw + 6 < 234;
      c(x, y1 - bh, bw, bh, R.ol); c(x + 1, y1 - bh + 1, bw - 2, bh - 1, R.m); c(x + 1, y1 - bh + 1, 1, bh - 1, R.l); c(x + bw - 2, y1 - bh + 1, 1, bh - 1, R.s);
      c(x + 1, y1 - bh + 5, bw - 2, 1, R.s); c(x + 1, y1 - 7, bw - 2, 1, '#d6c29a');
      x += bw + (hsh(i, 8) % 4 === 0 ? 1 : 0); if (lean) x += 4; i++; }
    // 선반 판
    c(18, y1, 220, 7, B.ol); c(19, y1 + 1, 218, 5, B.m); c(19, y1 + 1, 218, 1, B.hl); c(19, y1 + 5, 218, 1, B.s);
    if (r < 3) { c(19, y1 + 7, 218, 3, 'rgba(40,24,28,.35)'); qD(p, 19, y1 + 10, 218, 1, 'rgba(40,24,28,.35)'); } }
  // 아래 문 두 짝
  c(7, 224, 242, 4, B.s);
  [[18, 228], [130, 228]].forEach(([x, y], i) => { c(x, y, 108, 72, B.d); c(x + 1, y + 1, 106, 70, B.m); c(x + 1, y + 1, 106, 2, B.s); qD(p, x + 1, y + 3, 106, 1, B.s);
    c(x + 10, y + 10, 88, 52, B.d); c(x + 11, y + 11, 86, 50, B.m); c(x + 11, y + 11, 86, 1, B.s); c(x + 11, y + 60, 86, 1, B.l); qMott(p, x + 14, y + 14, 80, 44, B.s, 30 + i, 3);
    qKnob(p, i ? x + 6 : x + 101, y + 36); });
  // 받침
  qWood(p, 0, 308, 256, 18, B, 4); c(1, 309, 254, 1, B.hl);
  [6, 226].forEach(x => { c(x, 326, 24, 26, B.ol); c(x + 1, 326, 22, 25, B.m); c(x + 1, 326, 3, 25, B.l); c(x + 18, 326, 5, 25, B.s); });
  return true;
}
/* ---------- 침대 앞 (384 × 440) ---------- */
function BEDQ(p, t, C) { const { c, el } = p, A = qr(C.a.t), B = qr(C.b.t), S = qr(C.c.t), W = 384;
  // 머리판
  [0, 360].forEach(x => { c(x, 14, 24, 110, B.ol); c(x + 1, 14, 22, 109, B.m); c(x + 1, 14, 4, 109, B.l); c(x + 17, 14, 6, 109, B.s); qD(p, x + 16, 14, 1, 109, B.s);
    el(x + 12, 12, 13, 11, B.ol); el(x + 12, 12, 12, 10, B.m); el(x + 9, 8, 6, 4, B.l); c(x + 6, 6, 3, 2, B.hl); });
  c(24, 10, 336, 104, B.ol); c(25, 11, 334, 102, B.m); c(25, 11, 334, 2, B.hl); qD(p, 25, 13, 334, 2, B.l); qMott(p, 28, 16, 328, 92, B.s, 3, 14);
  c(48, 28, 288, 70, B.d); c(49, 29, 286, 68, B.m); c(49, 29, 286, 3, B.s); qD(p, 49, 32, 286, 2, B.s); c(49, 96, 286, 1, B.l); qMott(p, 54, 36, 276, 56, B.s, 9, 9);
  // 가운데 장식
  el(192, 60, 24, 12, B.d); el(192, 60, 23, 11, B.m); el(192, 59, 20, 9, B.l); const K = qr('#e6c8a0'); el(192, 60, 12, 6, K.ol); el(192, 60, 11, 5, K.m); c(186, 57, 6, 2, K.hl); c(194, 63, 6, 1, K.s);
  // 옆 프레임
  c(8, 100, 368, 300, B.ol); c(9, 100, 366, 298, B.s); c(9, 100, 6, 298, B.m); c(369, 100, 6, 298, B.m);
  // 매트리스
  c(20, 104, 344, 270, S.ol); c(21, 105, 342, 268, S.m); c(21, 105, 342, 2, S.hl);
  // 베개 두 개 (둥글게)
  [[26, 110], [198, 110]].forEach(([x, y], i) => { qRR(p, x, y, 160, 74, S.ol, 14); qRR(p, x + 1, y + 1, 158, 72, S.m, 13);
    qRR(p, x + 8, y + 3, 144, 6, S.hl, 3); qD(p, x + 8, y + 9, 144, 3, S.hl); c(x + 3, y + 14, 3, 46, S.l);
    qRR(p, x + 8, y + 58, 144, 12, S.s, 5); qD(p, x + 8, y + 55, 144, 3, S.s, 1); c(x + 150, y + 16, 5, 42, S.s); qD(p, x + 147, y + 16, 3, 42, S.s);
    qD(p, x + 112, y + 16, 30, 30, S.hl, 1); c(x + 60, y + 30, 1, 20, S.s); c(x + 61, y + 50, 6, 1, S.s); c(x + 96, y + 22, 1, 10, S.s); });
  // 이불 (접힌 윗단 + 몸판 + 늘어진 끝)
  c(4, 186, 376, 220, A.ol); c(5, 187, 374, 218, A.m); qMott(p, 10, 214, 356, 170, A.s, 17, 16);
  c(5, 187, 374, 18, S.m); c(5, 187, 374, 2, S.hl); qD(p, 5, 189, 374, 2, S.hl); c(5, 201, 374, 4, S.s); qD(p, 5, 199, 374, 2, S.s); c(5, 205, 374, 1, A.ol);
  c(5, 206, 374, 3, A.l); qD(p, 5, 209, 374, 3, A.l);
  for (let y = 222; y < 384; y += 20) for (let x = 20 + (((y - 222) / 20) & 1) * 20; x < 366; x += 40) { c(x, y, 1, 1, A.d); c(x - 1, y - 1, 1, 1, A.l); qD(p, x - 6, y + 2, 13, 1, A.s); }
  [96, 192, 288].forEach((fx, i) => { for (let y = 214; y < 396; y++) { const xx = fx + Math.round(Math.sin(y / 23 + i) * 3); c(xx, y, 1, 1, A.s); if (!(y & 1)) c(xx + 1, y, 1, 1, A.l); } });
  c(5, 206, 6, 196, A.l); qD(p, 11, 206, 2, 196, A.l); c(371, 206, 8, 196, A.s); qD(p, 369, 206, 2, 196, A.s);
  c(5, 390, 374, 14, A.s); qD(p, 5, 385, 374, 5, A.s); c(5, 402, 374, 3, A.d);
  for (let x = 5; x < 379; x++) { const wv = Math.round(Math.sin(x / 9) * 1.5); if (wv > 0) c(x, 405, 1, wv, A.d); }
  // 발판
  qWood(p, 0, 398, 384, 30, B, 7); c(1, 399, 382, 1, B.hl); c(180, 408, 24, 8, K.ol); c(181, 409, 22, 6, K.m); c(181, 409, 22, 1, K.hl);
  [6, 356].forEach(x => { c(x, 428, 22, 12, B.ol); c(x + 1, 428, 20, 11, B.s); });
  return true;
}
(function () {
  const set = (k, fn, dirs) => { if (FURN[k]) FURN[k].drawQ = (p, t, C, dir) => (dirs.includes(dir || 0) ? fn(p, t, C, dir) : false); };
  set('nstand', NSTANDQ, [0, 1, 2, 3]); set('lamp', LAMPQ, [0, 1, 2, 3]); set('chair', CHAIRQ, [0]); set('desk', DESKQ, [0]); set('shelf', SHELFQ, [0]); set('bed', BEDQ, [0]);
})();
