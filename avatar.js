/* ================= 🎎 토큰 + 옷 꾸미기 (지금은 KP 시험 단계) =================
   settings/avatar { open:false }   open 이 꺼져 있으면 KP 화면에서만 보이고 시험할 수 있음
   progress.avatar  { skin, eye, eyeCol, hair, hairCol, top, topCol, bottom, botCol, shoes, shoeCol, one, oneCol, hat, hatCol, acc, accCol }
   progress.wardrobe [ 'top:vest', 'w:<직접 만든 옷 id>', … ]   기본 무료 옷은 따로 안 적어도 가진 것
   wear/{id}  { name, slot, kind:'kp'|'pl', by, cost, sell, pics:{0,1,2}, at }   직접 만든 옷 (48×68 도트)
   avpos/{uid} { room, x, y, tx, ty, t0, dir, seen }   방 안에서 걷는 위치 (실시간)
   그림: 48×68 도트(큰 머리 SD), 방에서는 절반 크기(24×34)로 촘촘하게. 방향 0 앞 · 1 왼쪽 · 2 뒤 · 3 오른쪽(왼쪽 뒤집기)
============================================================================= */
let AVCFG = { open: false }, WEAR = [], AVPOS = [];
const AVW = 48, AVH = 68;
const avOn = () => !!(AVCFG.open || IS_ADMIN);
const SKINS = ['#fbe3cf', '#f6d2b4', '#ecc29e', '#d9a47c', '#b07a52', '#7a4e32'];
const AV_SLOTS = [['hair', '머리'], ['eye', '눈'], ['top', '상의'], ['bottom', '하의'], ['one', '한 벌'], ['shoes', '신발'], ['hat', '모자'], ['acc', '액세서리']];
const AV_ITEMS = {
  hair: { bob: ['단발', 0, '#3a2418'], long: ['긴 생머리', 0, '#24160e'], braids: ['양갈래 땋기', 0, '#5a3a24'], short: ['짧은 머리', 0, '#2a1e18'], slick: ['넘긴 머리', 0, '#1e1612'], pony: ['포니테일', 0, '#8a5530'], bun: ['올림머리', 0, '#3a2418'], wavy: ['웨이브', 0, '#c89a5a'] },
  eye: { round: ['동그란 눈', 0, '#3a2a20'], half: ['반눈', 0, '#3a2a20'], sharp: ['날카로운 눈', 0, '#5a2a2a'], sleepy: ['졸린 눈', 0, '#3a2a20'] },
  top: { shirt: ['셔츠', 0, '#f4f0e6'], blouse: ['리본 블라우스', 0, '#f8f4ea'], vest: ['셔츠와 조끼', 40, '#5a3a2a'], yagasuri: ['화살깃 기모노', 60, '#8a3a6a'], gakuran: ['학생복 상의', 50, '#24242e'], knit: ['니트', 40, '#8a6a4a'] },
  bottom: { pants: ['바지', 0, '#3a3a44'], skirt: ['스커트', 0, '#3a4a6a'], hakama: ['하카마', 60, '#6a2a3a'], shorts: ['반바지', 30, '#6a5a4a'], long: ['롱스커트', 50, '#2e2a3a'] },
  one: { maid: ['메이드복', 90, '#2a2a34'], kimono: ['기모노', 120, '#a83a4a'], dress: ['드레스', 110, '#5a2a6a'], coat: ['인버네스 코트', 100, '#5a4a3a'], butler: ['연미복', 100, '#1e1e28'] },
  shoes: { shoes: ['구두', 0, '#3a2418'], boots: ['부츠', 40, '#5a3a24'], geta: ['게타', 30, '#a87a4a'], mary: ['메리제인', 40, '#24161e'] },
  hat: { fedora: ['중절모', 60, '#3a3030'], cap: ['학생모', 40, '#1e1e28'], ribbon: ['큰 리본', 30, '#c03050'], bonnet: ['헤드드레스', 40, '#f8f4ea'] },
  acc: { glasses: ['동그란 안경', 30, '#c8a040'], muffler: ['목도리', 40, '#a83a3a'], flower: ['꽃핀', 20, '#f08ab0'], monocle: ['외눈 안경', 40, '#c8a040'] }
};
const AV_DEF = { skin: SKINS[0], eye: 'round', eyeCol: '#3a2a20', hair: 'bob', hairCol: '#3a2418', top: 'shirt', topCol: '#f4f0e6', bottom: 'pants', botCol: '#3a3a44', shoes: 'shoes', shoeCol: '#3a2418', one: '', oneCol: '', hat: '', hatCol: '', acc: '', accCol: '' };
const avCfgOf = p => p && p.avatar ? Object.assign({}, AV_DEF, p.avatar) : null;
const avOwns = (p, slot, id) => { if (!id) return true; if (id.startsWith('w:')) return (p.wardrobe || []).includes(id) || avTitleWear(p).includes(id) || (WEAR.find(w => 'w:' + w.id === id) || {}).by === (p === P ? ME.uid : p.id); const it = (AV_ITEMS[slot] || {})[id]; return !!it && (it[1] === 0 || (p.wardrobe || []).includes(slot + ':' + id)); };
function avTitleWear(p) { try { return (typeof KT !== 'undefined' ? KT : []).filter(d => d.wear && ktHas(p, d.id)).map(d => 'w:' + d.wear); } catch (e) { return []; } }

/* ---------- 그리기 (부위별 층 · KP가 덮어쓴 그림이 있으면 그걸로) ---------- */
let AV_SKIP = null;   // 밑그림 만들 때 뺄 층
let AVOV = {};   // avOv/{층 키} { pics:{0,1,2} }  층 키: body · eye:round · hairB:bob · hairF:bob · top:shirt …
const AVC = {};
const avView = dir => dir === 2 ? 2 : dir % 2 ? 1 : 0;
/* ===== 토큰 그림 (48×68 잔도트) — HB가 고친 뒷모습 몸 기준 =====
   머리 15~43 (가운데 x 23.5) · 목 44~45 · 몸통 46~57 · 팔 47~55 · 다리 58~63 · 신발 61~63 · 머리숱 10~42 */
const AV_TOP = 15;
const AV_HEADF = [6, 9, 10, 12, 12, 14, 14, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 15, 14, 14, 12, 12, 10, 10, 8];   // 줄 15~43 반너비
const AV_ARMF = [[47, 17, 1], [48, 17, 1], [49, 16, 2], [50, 15, 3], [51, 15, 3], [52, 14, 4], [53, 14, 4], [54, 14, 4]];   // 왼팔 [y, x, 폭]
const AV_BALLF = { 10: 6, 11: 9, 12: 11, 13: 13, 14: 14, 15: 14, 16: 15, 17: 16, 18: 17, 19: 17, 20: 17, 21: 17, 22: 18, 23: 18, 24: 18, 25: 18, 26: 18, 27: 18, 28: 18, 29: 18, 30: 18, 31: 19, 32: 19, 33: 19 };
function avP2(g, cfg, dir, step) {
  const R = (x, y, w, h, col) => { if (w <= 0 || h <= 0 || !col) return; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const H = (y, half, col, off) => R(24 - half + (off || 0), y, half * 2, 1, col);
  const M = (x, y, w, h, col) => { R(x, y, w, h, col); R(48 - x - w, y, w, h, col); };
  const view = dir === 2 ? 'back' : dir % 2 ? 'side' : 'front', side = view === 'side', lift = [0, -1, 0, 1][step] || 0;
  const P = { R, H, M, RH: R, HH: H, MH: M, g, cfg, view, side, back: view === 'back', lift, of: 0, sk: ramp(cfg.skin),
    legs: side ? [[20, 4, lift], [23, 4, -lift]] : [[19, 4, lift], [25, 4, -lift]] };
  // 몸통 한 줄 (앞·뒤 x 18~29, 옆 x 20~27)
  P.trow = (y, col, ex) => { ex = ex || 0; if (side) R(20 - ex, y, 8 + ex * 2, 1, col); else H(y, 6 + ex, col); };
  P.torso = (col, y0, y1, ex) => { for (let y = y0; y <= y1; y++) P.trow(y, col, ex); };
  P.tw = () => side ? 4 : 6;
  // 소매: n = 어깨부터 줄 수(최대 8), wide = 바깥으로 더
  P.arm = (col, n, wide) => { if (P.noArms) return; const k = Math.min(n == null ? 8 : n, 8), w0 = wide || 0, sh = ramp(col).f;
    AV_ARMF.slice(0, k).forEach(([y, x, w]) => { if (side) { R(21 - w0, y, 4 + w0, 1, col); R(24, y, 1, 1, sh); } else { M(x - w0, y, w + w0, 1, col); M(x + w - 1, y, 1, 1, sh); } }); };
  return P;
}
function AV_BODY(P2) {
  const { R, H, M, sk, side, legs } = P2, shirt = '#ece6da', shirtS = '#cfc6b6', pants = '#4a4048', line = avOutHex(sk.t);
  AV_HEADF.forEach((h, i) => H(AV_TOP + i, h, sk.t));
  H(44, 4, sk.f); H(45, 4, sk.f); if (side) { R(19, 44, 3, 2, null); }
  legs.forEach(([x, w, l]) => { R(x, 57 + l, w, 7, sk.t); R(x + w - 1, 58 + l, 1, 6, sk.f); });
  if (!side) R(23, 57, 2, 5, line);
  P2.torso(shirt, 46, 53); P2.torso(pants, 54, 57);
  if (side) { R(21, 47, 4, 9, sk.t); R(24, 47, 1, 9, sk.f); }
  else { AV_ARMF.forEach(([y, x, w]) => M(x, y, w, 1, sk.t)); M(14, 55, 3, 1, sk.t); M(17, 55, 1, 1, line); R(18, 46, 1, 8, shirtS); R(29, 46, 1, 8, shirtS); }
}
const avOutHex = hex => { const o = avOutCol(...deHex(hex)); return deToHex(o[0], o[1], o[2]); };
/* 눈: 폭 3 · 위 2줄 속눈썹 + 아래 6줄 눈동자 (HB 그림 기준) */
const AV_LASH = '#3a3a44';
function AV_EYE1(P2, eye, C, x) {
  const { R } = P2, y = 30;
  if (eye === 'round') { R(x, y, 3, 2, AV_LASH); R(x, y + 2, 3, 6, C.t); }
  else if (eye === 'half') { R(x, y + 4, 3, 1, AV_LASH); R(x - 1, y + 5, 1, 1, AV_LASH); R(x + 3, y + 5, 1, 1, AV_LASH); }
  else if (eye === 'sharp') { R(x, y + 1, 3, 1, AV_LASH); R(x + 1, y, 3, 1, AV_LASH); R(x, y + 2, 3, 5, C.t); }
  else { R(x - 1, y + 5, 5, 1, AV_LASH); }
}
function AV_FACE(P2, eye, C) {
  const { R, side } = P2, mouth = '#5a4448';
  if (side) { AV_EYE1(P2, eye, C, 14); R(12, 38, 2, 1, mouth); return; }
  if (eye === 'sharp') { AV_EYE1(P2, eye, C, 15); const { R: r } = P2; r(30, 31, 3, 1, AV_LASH); r(29, 30, 3, 1, AV_LASH); r(30, 32, 3, 5, C.t); }
  else { AV_EYE1(P2, eye, C, 15); AV_EYE1(P2, eye, C, 30); }
  R(22, 39, 4, 1, mouth);
}
/* 머리카락 (HB의 단발 그림 기준, 단색) */
function avStrand(R, x, y0, y1, w, col) { R(x, y0, w, y1 - y0, col); }
const AV_BANGF = [29, 30, 31, 29, 29, 28, 30, 29, 31, 29, 28, 29, 29, 28, 29, 31, 29, 30, 28, 29, 29, 31, 30, 29];   // x 12~35 앞머리 끝(포함 안 함)
const AV_LOCK = { bob: 42, long: 46, wavy: 46, short: 36, slick: 36, braids: 38, pony: 38, bun: 38 };
function avLockRows(to) {   // 옆머리 줄별 [바깥 x, 안쪽 x] (왼쪽)
  const r = []; for (let y = 31; y <= to; y++) { const t = to - y; r.push([y, y <= 33 ? 5 : t < 1 ? 10 : t < 2 ? 9 : t < 3 ? 8 : 7, t < 1 ? 11 : 12]); } return r; }
const AVH_HAIR = {
  back(P2, h, C) { const { R, H, side, back } = P2;
    if (h === 'long' || h === 'wavy') { const x0 = side ? 18 : 5; R(x0, 26, 43 - x0, 24, C.t); for (let x = x0; x < 43; x += 4) R(x + 1, 50, 2, 2, C.t);
      if (h === 'wavy') for (let y = 30; y < 50; y += 5) { R(x0 - 1, y, 1, 3, C.t); R(43, y + 2, 1, 3, C.t); } }
    if (h === 'braids') (side ? [37] : [3, 39]).forEach(x => { for (let y = 36; y < 54; y += 3) { R(x + 1, y, 4, 3, C.t); R(x, y + 1, 6, 1, C.t); R(x + 1, y + 2, 4, 1, C.f); } R(x + 1, 54, 4, 2, '#c03050'); R(x + 2, 56, 2, 2, C.t); });
    if (h === 'pony' && (back || side)) { const x = side ? 38 : 20; R(x, 14, 8, 26, C.t); R(x + 1, 40, 6, 3, C.t); R(x + 2, 43, 4, 2, C.t); R(x, 14, 1, 26, C.f); }
  },
  front(P2, h, C) { const { R, H, M, side, back } = P2, slick = h === 'slick', to = AV_LOCK[h] || 42;
    for (let y = 10; y <= 33; y++) { const hw = AV_BALLF[y]; for (let x = 24 - hw; x < 24 + hw; x++) {
      let on = true;
      if (back) on = true;
      else if (side) on = !(x < 22 && y >= (slick ? 22 : 29 + ((x * 3) % 3 === 0 ? 1 : 0)));
      else { const inWin = x >= 12 && x < 36; on = !(inWin && y >= (slick ? 22 : AV_BANGF[x - 12])); }
      if (on) R(x, y, 1, 1, C.t); } }
    if (back) { const bt = Math.max(to, 40); for (let y = 34; y <= Math.min(bt, 44); y++) { const hw = Math.max(8, 19 - Math.max(0, y - 37) * 1.6); H(y, Math.round(hw), C.t); } return; }
    if (side) { const end = Math.max(to, 41); for (let y = 34; y <= end; y++) { const hr = y <= 43 ? 24 + AV_HEADF[y - AV_TOP] + 1 : 0, lr = y <= to ? 41 - Math.max(0, y - to + 3) * 2 : 0; R(22, y, Math.max(hr, lr) - 22, 1, C.t); } }
    else avLockRows(to).forEach(([y, a, b]) => M(a, y, b - a, 1, C.t));
    if (slick && !side) { R(16, 18, 1, 4, C.f); R(17, 17, 6, 1, C.f); }
    if (h === 'bun') { for (let y = 4; y < 11; y++) H(y, [3, 5, 6, 6, 6, 6, 5][y - 4], C.t); R(22, 6, 2, 1, C.l); }
    if (h === 'pony' && !side) { R(40, 14, 4, 12, C.t); R(40, 14, 2, 2, '#c03050'); }
    if (h === 'pony' && side) R(39, 15, 3, 3, '#c03050');
  }
};
/* 옷 — 몸통 46~57 (허리 54) · 소매 P2.arm(줄 47~54) · 다리 P2.legs(58~63) */
const AV_DRAW = {
  shoes(P2, s, C) { const { R, legs } = P2; legs.forEach(([x, w, l], i) => { const o = i ? 0 : -1;
    if (s === 'boots') { R(x, 58 + l, w, 3, C.t); R(x + w - 1, 58 + l, 1, 3, C.f); R(x + o, 61 + l, w + 1, 3, C.d); R(x, 58 + l, 1, 2, C.l); }
    else if (s === 'geta') { R(x, 61 + l, w, 1, '#c03050'); R(x + o, 62 + l, w + 1, 1, C.t); R(x + o, 63 + l, 1, 1, C.d); R(x + o + w, 63 + l, 1, 1, C.d); }
    else if (s === 'mary') { R(x, 59 + l, w, 2, '#f8f4ea'); R(x + o, 61 + l, w + 1, 3, C.t); R(x + o, 61 + l, w + 1, 1, C.l); }
    else { R(x + o, 61 + l, w + 1, 3, C.t); R(x + o, 61 + l, w + 1, 1, C.l); } }); },
  bottom(P2, b, C) { const { R, H, legs, side } = P2, sk = r => side ? r - 2 : r;
    if (b === 'pants' || b === 'shorts') { P2.torso(C.t, 54, 57); P2.trow(54, C.d); const n = b === 'pants' ? 5 : 2; legs.forEach(([x, w, l]) => { R(x, 57, w, n + (b === 'pants' ? 0 : l), C.t); R(x + w - 1, 57, 1, n, C.f); }); }
    else if (b === 'skirt') { [6, 7, 7, 8, 8, 9, 9].forEach((h, i) => H(53 + i, sk(h), C.t, side ? -1 : 0)); H(60, sk(9), C.f, side ? -1 : 0); if (!side) for (let x = 17; x < 32; x += 3) R(x, 55, 1, 5, C.f); }
    else { [6, 7, 7, 7, 8, 8, 8, 9, 9].forEach((h, i) => H(53 + i, sk(h), C.t, side ? -1 : 0)); H(62, sk(9), C.f, side ? -1 : 0); if (!side) for (let x = 17; x < 32; x += 3) R(x, 55, 1, 7, C.f);
      if (b === 'hakama') { P2.trow(53, C.d); P2.trow(54, C.d); if (!side) H(52, 4, '#f4e6c8'); } } },
  top(P2, t, C) { const { R, H, M, side, back } = P2, front = !back && !side;
    const body = col => P2.torso(col, 46, 53);
    if (['shirt', 'blouse', 'knit', 'gakuran'].includes(t)) { body(C.t); P2.arm(C.t); if (!side) { R(18, 46, 1, 8, C.f); R(29, 46, 1, 8, C.f); } }
    if (t === 'shirt' && front) { R(20, 46, 3, 1, C.L); R(25, 46, 3, 1, C.L); R(23, 47, 2, 7, C.l); R(23, 48, 1, 1, C.f); R(23, 51, 1, 1, C.f); }
    if (t === 'blouse' && front) { R(20, 46, 8, 2, '#c03050'); R(22, 46, 4, 2, '#a02040'); R(21, 48, 2, 2, '#c03050'); R(25, 48, 2, 2, '#c03050'); }
    if (t === 'knit') { for (let y = 48; y < 54; y += 2) P2.trow(y, C.l); if (!back) H(46, 4, C.d); }
    if (t === 'gakuran') { H(46, 5, C.d); if (front) { R(23, 47, 2, 7, C.d); [48, 50, 52].forEach(y => R(23, y, 2, 1, '#e0b050')); } }
    if (t === 'vest') { body('#f4f0e6'); P2.arm('#f4f0e6'); P2.torso(C.t, 48, 53); if (front) { R(21, 46, 6, 4, '#f4f0e6'); R(23, 47, 2, 5, '#5a2a3a'); } }
    if (t === 'yagasuri') { body(C.t); P2.arm(C.t, 8, 1); for (let y = 48; y < 54; y += 3) for (let x = side ? 21 : 19 + (y % 2 ? 2 : 0); x < (side ? 27 : 29); x += 4) { R(x, y, 1, 2, C.L); R(x + 1, y + 1, 1, 1, C.L); } if (front) { R(21, 46, 1, 4, '#f4f0e6'); R(26, 46, 1, 4, '#f4f0e6'); } } },
  one(P2, o, C) { const { R, H, M, side, back, legs } = P2, front = !back && !side, na = P2.noArms;
    const body = col => P2.torso(col, 46, 53), sk = r => side ? r - 2 : r;
    const skirt = (col, rows) => rows.forEach((h, i) => H(53 + i, sk(h), col, side ? -1 : 0));
    if (o === 'maid') { skirt(C.t, [6, 7, 7, 8, 8, 9, 9]); H(60, sk(9), C.f, side ? -1 : 0); body(C.t); P2.arm(C.t); if (!na) { if (side) R(20, 46, 6, 3, C.t); else M(14, 46, 5, 3, C.t); }
      if (!back) { for (let y = 48; y < 60; y++) H(y, side ? 2 : 4, '#f8f4ea', side ? -3 : 0); H(59, side ? 3 : 5, '#e8e0d0', side ? -3 : 0); if (front) { H(46, 3, '#f8f4ea'); R(22, 47, 4, 2, '#c03050'); } }
      else { R(19, 52, 10, 2, '#f8f4ea'); R(17, 50, 4, 3, '#f8f4ea'); R(27, 50, 4, 3, '#f8f4ea'); } }
    if (o === 'kimono') { skirt(C.t, [6, 6, 6, 6, 7, 7, 7, 7, 7, 7]); body(C.t); P2.arm(C.t, 8, 1); if (!na) { if (side) R(19, 51, 5, 6, C.t); else M(12, 51, 5, 6, C.t); }
      P2.trow(50, '#e0b050'); P2.trow(51, '#c89030'); P2.trow(52, '#e0b050'); [[19, 56], [28, 59], [22, 61]].forEach(([x, y]) => (!side || (x > 20 && x < 27)) && R(x, y, 2, 2, C.L));
      if (front) { R(21, 46, 1, 4, '#f4f0e6'); R(26, 46, 1, 4, '#f4f0e6'); R(23, 53, 2, 10, C.f); } if (back) R(19, 49, 10, 5, '#e0b050'); }
    if (o === 'dress') { skirt(C.t, [6, 7, 8, 9, 9, 10, 10]); H(60, sk(10), C.l, side ? -1 : 0); body(C.t); P2.arm(C.l, 3, 1); if (!side) for (let x = 16; x < 33; x += 4) R(x, 56, 1, 4, C.f); if (!back) H(46, 4, '#f8f4ea'); }
    if (o === 'coat') { body(C.t); P2.arm(C.t); skirt(C.t, [6, 7, 7, 7, 8, 8, 8]); H(60, sk(8), C.f, side ? -1 : 0); for (let y = 46; y < 51; y++) H(y, side ? 7 : 9, C.l, side ? -1 : 0); H(50, side ? 7 : 9, C.f, side ? -1 : 0);
      if (front) { R(23, 51, 2, 9, C.d); R(26, 52, 2, 1, '#e0b050'); R(26, 55, 2, 1, '#e0b050'); } }
    if (o === 'butler') { legs.forEach(([x, w, l]) => { R(x, 57, w, 5, C.t); R(x + w - 1, 57, 1, 5, C.d); }); body(C.t); P2.torso(C.t, 54, 57); P2.arm(C.t);
      if (!side) { R(17, 54, 3, 6, C.t); R(28, 54, 3, 6, C.t); } if (back) R(19, 54, 10, 6, C.t);
      if (front) { R(21, 46, 6, 6, '#f8f4ea'); R(21, 46, 6, 2, '#24242e'); R(23, 48, 2, 1, '#24242e'); R(20, 46, 1, 7, C.l); R(27, 46, 1, 7, C.l); } } },
  hat(P2, h, C) { const { R, H, M, side, back } = P2;
    if (h === 'fedora') { H(11, 22, C.t); H(12, 20, C.d); for (let y = 1; y < 11; y++) H(y, y < 3 ? 11 : 13, C.t); H(8, 13, '#24161e'); H(9, 13, '#24161e'); R(15, 3, 6, 1, C.l); }
    if (h === 'cap') { for (let y = 3; y < 12; y++) H(y, y < 5 ? 15 : 19, C.t); H(3, 15, C.l); H(10, 19, C.d); if (!back) { if (side) R(1, 12, 12, 2, '#14141a'); else { H(12, 15, '#14141a'); H(13, 12, '#14141a'); } R(22, 5, 4, 4, '#e0b050'); } }
    if (h === 'ribbon') { const x = side ? 30 : 33; R(x - 6, 5, 6, 7, C.t); R(x + 1, 5, 6, 7, C.t); R(x - 1, 7, 3, 3, C.d); R(x - 6, 6, 2, 5, C.l); R(x - 3, 12, 2, 3, C.t); R(x + 2, 12, 2, 3, C.t); }
    if (h === 'bonnet') { H(10, 17, C.t); H(11, 18, C.t); H(12, 18, C.f); for (let x = 7; x < 41; x += 3) R(x, 9, 2, 1, C.t); R(20, 10, 8, 2, '#c03050'); } },
  acc(P2, a, C) { const { R, H, M, side, back } = P2; if (back && a !== 'muffler') return;
    const ring = x => { R(x - 1, 29, 7, 1, C.t); R(x - 1, 38, 7, 1, C.t); R(x - 2, 30, 1, 8, C.t); R(x + 5, 30, 1, 8, C.t); R(x, 30, 2, 1, C.L); };
    if (a === 'glasses') { if (side) ring(13); else { ring(14); ring(29); R(20, 33, 8, 1, C.t); } }
    if (a === 'monocle') { const x = side ? 13 : 29; ring(x); R(x + 5, 38, 1, 9, C.d); }
    if (a === 'flower') { const x = side ? 32 : 10, y = 18; R(x - 1, y - 3, 3, 7, C.t); R(x - 3, y - 1, 7, 3, C.t); R(x, y, 1, 1, '#ffe27a'); R(x - 1, y - 2, 1, 1, C.L); }
    if (a === 'muffler') { const w = side ? 7 : 9; H(43, w, C.t); H(44, w, C.l); H(45, w, C.t); H(46, w, C.f); if (!back) { const x = side ? 15 : 27; R(x, 47, 4, 8, C.t); R(x, 53, 4, 1, C.f); R(x, 55, 1, 1, C.t); R(x + 2, 55, 1, 1, C.t); } } }
};
/* 층 하나 그리기 (원래 그림) */
function avDrawLayer(P2, key) {
  const [k, id] = key.split(':'), c = P2.cfg;
  if (k === 'body') return AV_BODY(P2);
  if (k === 'eye') return AV_FACE(P2, id, ramp(c.eyeCol || '#3a2a20'));
  if (k === 'hairB') return AVH_HAIR.back(P2, id, ramp(c.hairCol));
  if (k === 'hairF') return AVH_HAIR.front(P2, id, ramp(c.hairCol));
  const colKey = { top: 'topCol', bottom: 'botCol', one: 'oneCol', shoes: 'shoeCol', hat: 'hatCol', acc: 'accCol' }[k];
  return AV_DRAW[k] && AV_DRAW[k](P2, id, ramp(c[colKey] || (AV_ITEMS[k][id] || [])[2] || '#888888'));
}
/* 층의 기본 색 (덮어쓴 그림의 색 바꾸기 기준) */
function avLayerCol(key, cfg) {
  const [k, id] = key.split(':');
  if (k === 'body') return [SKINS[0], cfg.skin];
  if (k === 'eye') return [AV_ITEMS.eye[id] ? AV_ITEMS.eye[id][2] : '#3a2a20', cfg.eyeCol];
  if (k === 'hairB' || k === 'hairF') return [AV_ITEMS.hair[id] ? AV_ITEMS.hair[id][2] : '#3a2418', cfg.hairCol];
  const colKey = { top: 'topCol', bottom: 'botCol', one: 'oneCol', shoes: 'shoeCol', hat: 'hatCol', acc: 'accCol' }[k];
  return [(AV_ITEMS[k] && AV_ITEMS[k][id] || [])[2], cfg[colKey]];
}
const AVRC = {};
function avRecolor(url, from, to) {
  const im = cfImg(url); if (!im) return null; if (!from || !to || from.toLowerCase() === to.toLowerCase()) return im;
  const key = url.length + url.slice(-30) + from + to; if (AVRC[key]) return AVRC[key];
  const A = ramp(from), Bm = ramp(to), map = {}; ['L', 'l', 't', 'f', 'd', 'o'].forEach(q => { map[A[q].toLowerCase()] = deHex(Bm[q]); });
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const m = map[deToHex(p[i], p[i + 1], p[i + 2])]; if (m) { p[i] = m[0]; p[i + 1] = m[1]; p[i + 2] = m[2]; } }
  g.putImageData(d, 0, 0); return AVRC[key] = c;
}
/* 고친 몸에서 사라진 부분(원래 몸에는 있고 새 몸에는 없는 곳)과 그 둘레 3칸 → 옷도 지울 자리 */
const AVCUT = {};
function avBodyCut(vw, url) {
  const k = vw + '|' + url.length + url.slice(-40); if (AVCUT[k]) return AVCUT[k];
  const im = cfImg(url); if (!im) return null;
  const a = avLayerPng('body', vw, true).getContext('2d').getImageData(0, 0, AVW, AVH).data;
  const c = document.createElement('canvas'); c.width = AVW; c.height = AVH; const cg = c.getContext('2d'); cg.drawImage(im, 0, 0, AVW, AVH); const b = cg.getImageData(0, 0, AVW, AVH).data;
  const N = AVW * AVH, gone = new Uint8Array(N), cut = new Uint8Array(N); let armAll = 0, armGone = 0;
  for (let i = 0; i < N; i++) { gone[i] = a[i * 4 + 3] > 0 && !b[i * 4 + 3] ? 1 : 0; const x = i % AVW, y = (i / AVW) | 0;
    if (vw !== 1 && y >= 47 && y <= 55 && (x < 18 || x >= 30) && a[i * 4 + 3]) { armAll++; armGone += gone[i]; } }
  for (let y = 0; y <= 60; y++) for (let x = 0; x < AVW; x++) { const i = y * AVW + x; if (b[i * 4 + 3]) continue;
    let hit = 0; for (let dy = -2; dy <= 2 && !hit; dy++) for (let dx = -2; dx <= 2; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < AVW && Y < AVH && gone[Y * AVW + X]) { hit = 1; break; } }
    cut[i] = hit; }
  return AVCUT[k] = { cut, noArms: armAll > 0 && armGone / armAll > .6 };
}
/* 외곽선: 붙은 부분 색을 진하게 (피부 → 진한 적갈색, 머리 → 진한 머리색) */
const AVOUT = {};
function avOutCol(r, g, b) { const k = (r << 16) | (g << 8) | b; if (AVOUT[k]) return AVOUT[k];
  const [h, s, l] = hexHsl(deToHex(r, g, b)), hx = hslHex(s < .25 ? h : (h + .95) % 1, Math.min(1, s < .25 ? s * .8 : Math.max(s, .45) + .1), Math.max(.07, Math.min(.16, l * .22)));
  return AVOUT[k] = deHex(hx); }
function avSprite(cfg, dir, step) {
  const key = JSON.stringify(cfg) + '|' + dir + '|' + step; if (AVC[key]) return AVC[key];
  const c = document.createElement('canvas'); c.width = AVW; c.height = AVH; const g = c.getContext('2d'), P2 = avP2(g, cfg, dir, step), vw = avView(dir);
  let pending = false, G = g, PP = P2;
  // 몸을 고쳐서 팔 등이 없어진 자리에는 옷(상의·한 벌·하의)도 안 그림
  const bp = AVOV.body && AVOV.body.pics || {}, bsrc = bp[vw], bc = bsrc ? avBodyCut(vw, bsrc) : null; if (bsrc && !bc) pending = true;
  // 옆모습은 팔이 몸통 위에 겹쳐서 알 수 없음 → 앞모습 기준
  const fc = vw === 1 && bsrc && bp[0] ? avBodyCut(0, bp[0]) : null; if (vw === 1 && bsrc && bp[0] && !fc) pending = true;
  P2.noArms = !!(vw === 1 ? fc && fc.noArms : bc && bc.noArms);
  const cutAll = bc ? bc.cut : null;
  const masked = (lk, fn, img) => { const cut = img || !P2.noArms ? cutAll : null; if (!cut || !/^(top|one)\b/.test(lk)) return fn();
    const t = document.createElement('canvas'); t.width = AVW; t.height = AVH; const tg = t.getContext('2d'); G = tg; PP = avP2(tg, cfg, dir, step); PP.noArms = P2.noArms; fn(); G = g; PP = P2;
    const d = tg.getImageData(0, 0, AVW, AVH); for (let i = 0; i < cut.length; i++) if (cut[i]) d.data[i * 4 + 3] = 0; tg.putImageData(d, 0, 0); g.drawImage(t, 0, 0); };
  const layer = lk => { if (AV_SKIP && lk === AV_SKIP) return; masked(lk, () => { const ov = AVOV[lk], src = ov && ov.pics && ov.pics[vw];
    if (src) { const [f, t] = avLayerCol(lk, cfg), im = avRecolor(src, f, t); if (!im) { pending = true; return; } G.drawImage(im, 0, 0, AVW, AVH); return; }
    avDrawLayer(PP, lk); }, !!(AVOV[lk] && AVOV[lk].pics && AVOV[lk].pics[vw])); };
  const custom = slot => { const id = cfg[slot]; if (!id || !id.startsWith('w:')) return false; const w = WEAR.find(x => 'w:' + x.id === id); if (!w) { pending = true; return true; } const pics = w.pics || {}, src = vw === 2 && pics[2] ? pics[2] : vw === 1 && pics[1] ? pics[1] : pics[0], im = cfImg(src);
    if (!im) pending = true; else masked(slot, () => G.drawImage(im, 0, 0, AVW, AVH), true); return true; };
  const item = slot => { if (!cfg[slot]) return; if (!custom(slot)) layer(slot + ':' + cfg[slot]); };
  if (cfg.hair) layer('hairB:' + cfg.hair);
  layer('body');
  item('shoes');
  if (cfg.one) item('one'); else { item('bottom'); item('top'); }
  if (vw !== 2) layer('eye:' + (cfg.eye || 'round'));
  if (cfg.hair) layer('hairF:' + cfg.hair);
  item('acc'); item('hat');
  // 외곽선 자동
  const d = g.getImageData(0, 0, AVW, AVH), p = d.data, src = p.slice();
  for (let y = 0; y < AVH; y++) for (let x = 0; x < AVW; x++) { const k = (y * AVW + x) * 4; if (src[k + 3]) continue;
    let n = -1; for (const [a, b] of [[0, -1], [1, 0], [-1, 0], [0, 1]]) { const X = x + a, Y = y + b; if (X >= 0 && Y >= 0 && X < AVW && Y < AVH && src[(Y * AVW + X) * 4 + 3] > 100) { n = (Y * AVW + X) * 4; break; } }
    if (n >= 0) { const o = avOutCol(src[n], src[n + 1], src[n + 2]); p[k] = o[0]; p[k + 1] = o[1]; p[k + 2] = o[2]; p[k + 3] = 255; } }
  g.putImageData(d, 0, 0);
  let out = c; if (dir === 3) { const m = document.createElement('canvas'); m.width = AVW; m.height = AVH; const mg = m.getContext('2d'); mg.translate(AVW, 0); mg.scale(-1, 1); mg.drawImage(c, 0, 0); out = m; }
  if (!pending) AVC[key] = out; return out;
}
/* ---------- 방 안 걷기 ---------- */
const AVSPD = 46;   // 방 픽셀/초
const AVLOCAL = {};   // uid → { x, y, tx, ty, t0, dir }
const AVFAKE = [];    // KP 시험용 손님
function avPosNow(s) { if (!s) return null; const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy); if (d < .5) return { x: s.tx, y: s.ty, moving: false, dir: s.dir || 0 }; const k = Math.min(1, (Date.now() - s.t0) / 1000 * AVSPD / d);
  return { x: s.x + dx * k, y: s.y + dy * k, moving: k < 1, dir: Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 3) : (dy < 0 ? 2 : 0) }; }
const avHome = () => ({ x: OX + COLS * T / 2, y: FY + ROWS * T * .62 });
/* 이 방에 그릴 토큰들 */
function avRoomList(room, owner) {
  if (!avOn() || !owner) return []; const out = [], now = Date.now();
  const add = (uid, cfg, st, fake) => { if (!cfg) return; const p = avPosNow(st) || Object.assign({ moving: false, dir: 0 }, avHome()); out.push({ uid, cfg, x: p.x, y: p.y, dir: p.dir, step: p.moving ? (Math.floor(now / 160) % 4) : 0, fake }); };
  const here = AVPOS.filter(a => a.room === owner && now - (a.seen || 0) < 70000);
  const ownerProg = owner === ME.uid ? P : PROGS.find(p => p.id === owner);
  const ownerSt = AVLOCAL[owner] && (owner === ME.uid) ? AVLOCAL[owner] : here.find(a => a.id === owner);
  add(owner, avCfgOf(ownerProg), ownerSt || (ownerProg && ownerProg.avatar && ownerProg.avatar.home ? Object.assign({ t0: 0, dir: 0 }, ownerProg.avatar.home, { tx: ownerProg.avatar.home.x, ty: ownerProg.avatar.home.y }) : null));
  here.filter(a => a.id !== owner).forEach(a => { const pr = a.id === ME.uid ? P : PROGS.find(p => p.id === a.id); add(a.id, avCfgOf(pr), a.id === ME.uid && AVLOCAL[ME.uid] ? AVLOCAL[ME.uid] : a); });
  if (owner === AVTEST_ROOM) { add(ME.uid, avCfgOf(P), AVLOCAL[ME.uid]); AVFAKE.forEach(f => add(f.id, f.cfg, f, true)); }
  return out;
}
function avDrawList(g, list, maxDepth) {
  list.forEach(a => { if (a.done) return; const depth = (a.y - FY) / T; if (depth >= maxDepth) return; a.done = true;
    if (!a.cfg) return; const sp = avSprite(a.cfg, a.dir, a.step), S = g._S || 1, w = AVW / 2, h = AVH / 2, x = a.x - w / 2, y = a.y - h + 2 + (a.step % 2 ? -1 : 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = S < 2; g.fillStyle = 'rgba(20,10,5,.28)'; g.fillRect(Math.round((a.x - 7) * S), Math.round((a.y - 1) * S), Math.round(14 * S), Math.round(2 * S));
    g.drawImage(sp, Math.round(x * S), Math.round(y * S), Math.round(w * S), Math.round(h * S));
    if (a.uid === ME.uid) { g.fillStyle = '#ffe27a'; g.fillRect(Math.round((a.x - 1) * S), Math.round((y - 4) * S), Math.round(3 * S), Math.round(2 * S)); }
    g.restore(); });
}
function avWalkTo(owner, x, y) {
  x = Math.max(OX + 8, Math.min(OX + COLS * T - 8, x)); y = Math.max(FY + 6, Math.min(FY + ROWS * T - 2, y));
  const cur = avPosNow(AVLOCAL[ME.uid]) || (AVLOCAL[ME.uid] = null, avStartPos(owner)); const dir = Math.abs(x - cur.x) > Math.abs(y - cur.y) ? (x < cur.x ? 1 : 3) : (y < cur.y ? 2 : 0);
  AVLOCAL[ME.uid] = { x: cur.x, y: cur.y, tx: x, ty: y, t0: Date.now(), dir, room: owner };
  if (owner === ME.uid && P.avatar) { P.avatar.home = { x: Math.round(x), y: Math.round(y) }; clearTimeout(avWalkTo.sv); avWalkTo.sv = setTimeout(saveP, 3000); }
  if (owner !== AVTEST_ROOM) avPush(owner);
}
function avStartPos(owner) { const a = AVPOS.find(p => p.id === ME.uid && p.room === owner); const st = a ? avPosNow(a) : null; if (st) return st; const h = owner === ME.uid && P.avatar && P.avatar.home; return Object.assign({ moving: false, dir: 0 }, h || avHome()); }
function avPush(owner) { const s = AVLOCAL[ME.uid]; if (!s || !avCfgOf(P)) return; B.set('avpos/' + ME.uid, { room: owner, x: Math.round(s.x), y: Math.round(s.y), tx: Math.round(s.tx), ty: Math.round(s.ty), t0: s.t0, dir: s.dir, seen: Date.now() }).catch(() => {}); }
let AV_HERE = null;
setInterval(() => {
  if (!ME || !avOn() || !P || !avCfgOf(P)) return; const where = tab === 'room' ? ME.uid : tab === 'visit' && RV ? RV : null;
  if (where && where !== AV_HERE) { AV_HERE = where; const st = avStartPos(where); AVLOCAL[ME.uid] = { x: st.x, y: st.y, tx: st.x, ty: st.y, t0: Date.now(), dir: 0, room: where }; avPush(where); }
  else if (!where && AV_HERE) { AV_HERE = null; B.set('avpos/' + ME.uid, { room: null, seen: Date.now() }).catch(() => {}); }
  else if (where && Date.now() - ((AVPOS.find(a => a.id === ME.uid) || {}).seen || 0) > 25000) avPush(where);
  AVFAKE.forEach(f => { const p = avPosNow(f); if (!p.moving && Math.random() < .25) { const cur = p; f.x = cur.x; f.y = cur.y; f.tx = OX + 20 + Math.random() * (COLS * T - 40); f.ty = FY + 10 + Math.random() * (ROWS * T - 16); f.t0 = Date.now(); } });
}, 1000);
const avMoving = list => list.some(a => a.step);
/* 방 탭 → 빈 바닥이면 걸어가기 */
function avTap(owner, p) { if (!avOn() || !avCfgOf(P)) return false; if (p.y < FY + 2) return false; avWalkTo(owner, p.x, p.y); return true; }

/* ---------- 저택 지도 말 ---------- */
(function () { if (typeof drawTok !== 'function') return; const _dt = drawTok; drawTok = function (ctx, u, cx, cy, sz) {
  const pr = u.id === ME.uid ? P : PROGS.find(p => p.id === u.id), cfg = avOn() && avCfgOf(pr); if (!cfg) return _dt(ctx, u, cx, cy, sz);
  const on = isOnline(u) || u.id === ME.uid, me = u.id === ME.uid, bob = me ? Math.round(Math.sin(Date.now() / 300)) : 0, h = sz * 1.9, w = h * AVW / AVH;
  ctx.save(); if (!on) ctx.globalAlpha = .55; ctx.imageSmoothingEnabled = false; ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.fillRect(Math.round(cx - w * .3), Math.round(cy + sz / 2 + 1), Math.round(w * .6), 3);
  ctx.drawImage(avSprite(cfg, 0, 0), Math.round(cx - w / 2), Math.round(cy + sz / 2 - h + 3 + bob), Math.round(w), Math.round(h));
  const nm = (u.ho ? cname(u.ho) : uname(u)).slice(0, 6); ctx.font = "11px 'Galmuri11',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; const tw = ctx.measureText(nm).width, y = cy + sz / 2 + 4;
  ctx.fillStyle = '#140c06'; ctx.fillRect(Math.round(cx - tw / 2 - 4), y, Math.round(tw + 8), 14); ctx.fillStyle = me ? '#ffe27a' : '#ffffff'; ctx.fillText(nm, cx, y + 11); ctx.textAlign = 'left';
  if (on) { ctx.fillStyle = '#4cd964'; ctx.fillRect(Math.round(cx + w / 2 - 6), Math.round(cy + sz / 2 - h + 4 + bob), 5, 5); } ctx.restore(); }; })();

/* ---------- 토큰 만들기 · 옷장 ---------- */
let AVE = null;
function avEdit() { AVE = { cfg: Object.assign({}, avCfgOf(P) || AV_DEF), slot: 'hair', dir: 0 }; avEditDraw(); }
function avItemsOf(slot) {
  if (slot === 'eye') return Object.entries(AV_ITEMS.eye).map(([k, v]) => ({ id: k, name: v[0], cost: 0, col: v[2] }));
  const base = Object.entries(AV_ITEMS[slot] || {}).map(([k, v]) => ({ id: k, name: v[0], cost: v[1], col: v[2] }));
  const cw = WEAR.filter(w => w.slot === slot && (w.kind === 'kp' ? w.sell !== false || avOwns(P, slot, 'w:' + w.id) : (w.by === ME.uid || avOwns(P, slot, 'w:' + w.id))) && !w.del).map(w => ({ id: 'w:' + w.id, name: w.name, cost: w.kind === 'kp' ? w.cost || 0 : 0, custom: w }));
  const none = ['hat', 'acc', 'one', 'top', 'bottom', 'shoes'].includes(slot) ? [{ id: '', name: '없음', cost: 0 }] : [];
  return [...none, ...base, ...cw];
}
const AVCOLKEY = { hair: 'hairCol', eye: 'eyeCol', top: 'topCol', bottom: 'botCol', one: 'oneCol', shoes: 'shoeCol', hat: 'hatCol', acc: 'accCol' };
function avEditDraw() {
  const c = AVE.cfg, slot = AVE.slot, list = avItemsOf(slot), colKey = AVCOLKEY[slot], room = typeof myRoom === 'function' && P.room ? myRoom() : { dye: 0 };
  modal(`<h2 style="color:var(--gold2);margin-top:0">🎎 토큰 꾸미기</h2>
   <div style="display:flex;gap:10px;align-items:flex-end;justify-content:center;background:#2a2018;border-radius:8px;padding:10px 0">${[0, 1, 2, 3].map(d => `<canvas class="avprev" data-d="${d}" width="${AVW}" height="${AVH}" style="width:${d === AVE.dir ? 96 : 56}px;image-rendering:pixelated;cursor:pointer" onclick="AVE.dir=${d};avEditDraw()"></canvas>`).join('')}</div>
   <div class="toggles" style="margin-top:8px">${AV_SLOTS.map(([k, n]) => `<span class="chip ${slot === k ? 'on' : ''}" onclick="AVE.slot='${k}';avEditDraw()">${n}</span>`).join('')}<span class="chip ${slot === 'skin' ? 'on' : ''}" onclick="AVE.slot='skin';avEditDraw()">피부</span></div>
   ${slot === 'skin' ? `<div class="toggles">${SKINS.map(s => `<span class="chip ${c.skin === s ? 'on' : ''}" onclick="AVE.cfg.skin='${s}';avEditDraw()"><span style="display:inline-block;width:16px;height:16px;background:${s};border:1px solid #0006;vertical-align:middle"></span></span>`).join('')}</div>`
    : `<div class="grid g3" style="gap:6px;max-height:240px;overflow:auto">${list.map(it => { const own = avOwns(P, slot, it.id), on = (c[slot] || '') === it.id;
       return `<button class="${on ? 'primary' : ''}" style="padding:4px;text-align:center" onclick="avPick('${slot}','${it.id}')"><canvas class="avitem" data-s="${slot}" data-i="${it.id}" width="${AVW}" height="${AVH}" style="width:40px;image-rendering:pixelated"></canvas><div style="font-size:.78rem">${esc(it.name)}</div><div style="font-size:.72rem" class="muted">${own ? (it.custom ? '✏ 직접 만든 옷' : '가짐') : `🪙 ${it.cost}`}</div></button>`; }).join('')}</div>
     ${colKey && c[slot] !== '' && !(c[slot] || '').startsWith('w:') ? `<div class="row" style="gap:6px;align-items:center;margin-top:6px"><span>색</span><input type="color" value="${c[colKey] || '#888888'}" style="width:60px" onchange="avColor('${slot}',this.value)"><span class="muted" style="font-size:.78rem">${slot === 'hair' || slot === 'eye' ? '무료' : `색 변경: 염료 1 (보유 ${room.dye || 0})`}</span></div>` : ''}`}
   <div class="row" style="margin-top:10px;gap:6px"><button onclick="closeModal()">닫기</button>${slot !== 'skin' && slot !== 'eye' && slot !== 'hair' ? `<button onclick="closeModal();wfNew('${slot}')">✏ 이 부위 옷 그리기</button>` : ''}<button class="primary" onclick="avSave()">저장</button></div>`);
  document.querySelectorAll('canvas.avprev').forEach(cv => { const g = cv.getContext('2d'); g.clearRect(0, 0, AVW, AVH); g.drawImage(avSprite(c, +cv.dataset.d, 0), 0, 0); });
  document.querySelectorAll('canvas.avitem').forEach(cv => { const s = cv.dataset.s, i = cv.dataset.i, tc = Object.assign({}, c, { [s]: i }); if (s === 'one' && i) Object.assign(tc, { oneCol: tc.oneCol || (AV_ITEMS.one[i] || [])[2] }); const g = cv.getContext('2d'); g.drawImage(avSprite(tc, 0, 0), 0, 0); });
}
function avPick(slot, id) {
  const it = avItemsOf(slot).find(x => x.id === id); if (!it) return;
  if (!avOwns(P, slot, id)) { if (!confirm(`${it.name}을(를) ${it.cost} 은화에 살까요?`)) return; if (!spend(it.cost)) return; P.wardrobe = [...new Set([...(P.wardrobe || []), id.startsWith('w:') ? id : slot + ':' + id])]; saveP(); sfx('ok'); }
  AVE.cfg[slot] = id; const ck = AVCOLKEY[slot]; if (ck && id && !id.startsWith('w:') && (!AVE.cfg[ck] || slot !== 'hair' && slot !== 'eye')) AVE.cfg[ck] = (AV_ITEMS[slot][id] || [])[2] || AVE.cfg[ck];
  if (slot === 'one' && id) {} if ((slot === 'top' || slot === 'bottom') && id) AVE.cfg.one = '';
  avEditDraw();
}
function avColor(slot, v) {
  const ck = AVCOLKEY[slot]; if (slot !== 'hair' && slot !== 'eye') { const room = myRoom(); if ((room.dye || 0) < 1) { toast('염료 부족'); avEditDraw(); return; } room.dye--; saveP(); }
  AVE.cfg[ck] = v; avEditDraw();
}
function avSave() { const home = P.avatar && P.avatar.home; P.avatar = Object.assign({}, AVE.cfg, home ? { home } : {}); saveP(); closeModal(); toast('토큰 저장 완료'); render(); }

/* ---------- 직접 만든 옷 (도트 편집기) ---------- */
let WFD = null;
function wfNew(slot, kind) { kind = kind || (IS_ADMIN ? 'kp' : 'pl'); WFD = { slot, kind, name: '', cost: 50, sell: true, pics: {} }; wfForm(); }
function wfEdit(id) { const w = WEAR.find(x => x.id === id); if (!w) return; WFD = JSON.parse(JSON.stringify(w)); WFD.pics = WFD.pics || {}; wfForm(); }
function wfForm() {
  const d = WFD, kp = d.kind === 'kp';
  modal(`<h2 style="color:var(--gold2);margin-top:0">✏ 옷 ${d.id ? '고치기' : '만들기'}</h2>
   <label class="f">이름</label><input id="wfN" value="${esc(d.name)}" maxlength="20" placeholder="예: 별무늬 망토">
   <label class="f">부위</label><select id="wfS">${AV_SLOTS.filter(([k]) => !['hair', 'eye'].includes(k)).map(([k, n]) => `<option value="${k}" ${d.slot === k ? 'selected' : ''}>${n}</option>`).join('')}</select>
   ${kp ? `<div class="row" style="gap:6px"><div style="flex:1"><label class="f">가격</label><input id="wfC" type="number" min="0" value="${d.cost || 0}"></div><label style="flex:1;margin-top:22px"><input type="checkbox" id="wfSell" ${d.sell !== false ? 'checked' : ''} style="width:auto;margin-right:6px">옷가게에서 팔기</label></div>` : ''}
   <p class="muted" style="font-size:.8rem">옷 부분만 그리기 · 옆/뒤 생략 가능</p>
   ${[[0, '앞모습'], [1, '옆모습 (왼쪽 보기)'], [2, '뒷모습']].map(([k, n]) => `<div class="item" style="margin:4px 0"><div style="display:flex;align-items:center;gap:8px">${d.pics[k] ? `<img src="${d.pics[k]}" style="height:54px;image-rendering:pixelated;background:#2a2420">` : '<span class="muted" style="width:36px;text-align:center">없음</span>'}<b>${n}</b></div><button class="sm primary" onclick="wfDraw(${k})">🎨 그리기</button></div>`).join('')}
   <div class="row" style="margin-top:10px"><button onclick="WFD=null;closeModal()">취소</button><button class="primary" onclick="wfSave()">저장</button></div>`);
}
function wfRead() { const n = $('#wfN'); if (!n) return; WFD.name = n.value.trim(); WFD.slot = $('#wfS').value; if (WFD.kind === 'kp') { WFD.cost = Math.max(0, +$('#wfC').value || 0); WFD.sell = $('#wfSell').checked; } }
async function wfDraw(k) {
  wfRead(); const base = Object.assign({}, AV_DEF, { hair: 'short', top: '', bottom: '', shoes: '', one: '', hat: '', acc: '' }), dir = k === 1 ? 1 : k === 2 ? 2 : 0;
  toast('밑그림 준비 중');
  const ref = await avRefUrl(base, dir), guide = k && WFD.pics[0] ? await avRefUrl(base, 0, { extra: [WFD.pics[0]] }) : null;
  dotEdit({ W: AVW, H: AVH, src: WFD.pics[k] || null, key: 'wear_' + (WFD.id || 'new') + '_' + k, title: (WFD.name || '새 옷') + ' · ' + ['앞', '옆', '뒤'][k], guide, guideName: '앞모습',
    onSave: url => { if (url) WFD.pics[k] = url; else delete WFD.pics[k]; wfForm(); }, onCancel: () => wfForm() });
  avSetRef(ref, .5);
}
async function wfSave() {
  wfRead(); const d = WFD; if (!d.name) return toast('이름 입력 필요'); if (!d.pics[0]) return toast('앞모습 필수');
  const doc = { name: d.name.slice(0, 20), slot: d.slot, kind: d.kind, by: d.by || ME.uid, byName: d.byName || PROF.name || '', pics: d.pics, at: d.at || Date.now() };
  if (d.kind === 'kp') Object.assign(doc, { cost: d.cost, sell: d.sell !== false });
  try { const id = d.id || ('w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)); await B.set('wear/' + id, clean(doc)); WFD = null; closeModal(); toast('옷 저장 완료'); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function wfDel(id) { if (!confirm('이 옷을 삭제할까요? (착용자에게서도 삭제)')) return; try { await B.del('wear/' + id); } catch (e) { toast('실패: ' + (e.code || e.message)); } }

/* 선물로 보낼 수 있는 옷: 산 기본 옷 + 직접 만든 옷(복제) + 산 직접 만든 옷 */
function avGiftables() {
  const out = []; (P.wardrobe || []).forEach(k => { if (k.startsWith('w:')) { const w = WEAR.find(x => 'w:' + x.id === k); if (w) out.push({ id: k, key: k, name: w.name, bought: true }); return; } const [s, i] = k.split(':'); const it = (AV_ITEMS[s] || {})[i]; if (it) out.push({ id: k, key: k, name: it[0] }); });
  WEAR.filter(w => w.by === ME.uid && w.kind === 'pl').forEach(w => { if (!out.some(o => o.id === 'w:' + w.id)) out.push({ id: 'w:' + w.id, key: 'w:' + w.id, name: w.name + ' (복제)' }); });
  return out;
}
/* ---------- KP 시험실 ---------- */
const AVTEST_ROOM = '__avtest';
function avRandCfg() { const pick = o => { const k = Object.keys(o); return k[Math.floor(Math.random() * k.length)]; }, rc = () => '#' + [0, 0, 0].map(() => (60 + Math.floor(Math.random() * 160)).toString(16).padStart(2, '0')).join('');
  const one = Math.random() < .4 ? pick(AV_ITEMS.one) : ''; return Object.assign({}, AV_DEF, { skin: SKINS[Math.floor(Math.random() * 5)], eye: pick(AV_ITEMS.eye), hair: pick(AV_ITEMS.hair), hairCol: rc(), top: pick(AV_ITEMS.top), topCol: rc(), bottom: pick(AV_ITEMS.bottom), botCol: rc(), shoes: pick(AV_ITEMS.shoes), one, oneCol: one ? rc() : '', hat: Math.random() < .4 ? pick(AV_ITEMS.hat) : '', hatCol: rc(), acc: Math.random() < .4 ? pick(AV_ITEMS.acc) : '', accCol: '#c8a040' }); }
function avFake(n) { AVFAKE.length = 0; for (let i = 0; i < n; i++) { const x = OX + 60 + i * 120, y = FY + 120 + i * 40; AVFAKE.push({ id: 'fake' + i, cfg: avRandCfg(), x, y, tx: x, ty: y, t0: Date.now(), dir: 0 }); } render(); }
function avPwTry() { const v = ($('#avPw') || {}).value || ''; if (v.trim() === '1117') { try { sessionStorage.setItem('peccata_avpw', '1'); } catch (e) {} render(); } else { sfx('bad'); toast('비밀번호 오류'); } }
const AV_OV_GROUPS = () => [['몸', [['body', '기본 몸 · 얼굴형']]], ['눈', Object.entries(AV_ITEMS.eye).map(([k, v]) => ['eye:' + k, v[0]])],
  ['머리 (앞)', Object.entries(AV_ITEMS.hair).map(([k, v]) => ['hairF:' + k, v[0] + ' 앞머리'])], ['머리 (뒤)', Object.entries(AV_ITEMS.hair).map(([k, v]) => ['hairB:' + k, v[0] + ' 뒷머리'])],
  ...['top', 'bottom', 'one', 'shoes', 'hat', 'acc'].map(sl => [AV_SLOTS.find(x => x[0] === sl)[1], Object.entries(AV_ITEMS[sl]).map(([k, v]) => [sl + ':' + k, v[0]])])];
let AVOV_OPEN = '';
function avOvSection() {
  return `<div class="panel"><h2>🎨 기본 그림 고치기</h2><p class="muted" style="margin:0 0 6px;font-size:.82rem">기본 그림 수정 · 전체 토큰 적용 · 원래 색 부분은 색 바꾸기 유지</p>
    ${AV_OV_GROUPS().map(([gn, list]) => `<details ${AVOV_OPEN === gn ? 'open' : ''} ontoggle="if(this.open)AVOV_OPEN='${gn}'"><summary><b>${gn}</b> <span class="muted">${list.filter(([k]) => AVOV[k]).length ? '· 고친 것 ' + list.filter(([k]) => AVOV[k]).length : ''}</span></summary>
      ${list.map(([k, n]) => `<div class="item" style="margin:3px 0"><div style="display:flex;align-items:center;gap:8px"><canvas class="avovp" data-k="${k}" width="${AVW}" height="${AVH}" style="width:32px;image-rendering:pixelated;background:#2a2420"></canvas><span>${esc(n)}${AVOV[k] ? ' <span class="badge live">바꿈</span>' : ''}</span></div>
        <div class="row" style="flex:0 0 auto;gap:4px"><button class="sm" onclick="avOvEdit('${k}')">✏ 고치기</button>${AVOV[k] ? `<button class="sm" onclick="avOvExport(['${k}'])">📤</button><button class="sm" onclick="avOvReset('${k}')">↺ 원래대로</button>` : ''}</div></div>`).join('')}</details>`).join('')}
    ${Object.keys(AVOV).length ? `<div class="row" style="margin-top:6px"><button class="sm" onclick="avOvExport(Object.keys(AVOV))">📤 고친 그림 전체 내보내기</button></div>` : ''}</div>`;
}
/* 내보내기: 층별 앞·옆·뒤 원본(48×68) + 맨 아래 줄에 지금 토큰 전체 모습. 왼쪽에 이름표 */
async function avOvExport(keys) {
  toast('그림 준비 중');
  await avLoadUrls(Object.values(AVOV).flatMap(v => Object.values(v.pics || {})));
  const LW = 90, G = 4, rows = keys.length + 1, c = document.createElement('canvas');
  c.width = LW + (AVW + G) * 3; c.height = rows * (AVH + G) + 14; const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.font = '9px sans-serif'; g.textBaseline = 'top';
  ['앞', '옆', '뒤'].forEach((t, i) => g.fillText(t, LW + i * (AVW + G) + 2, 1));
  keys.forEach((k, r) => { const y = 14 + r * (AVH + G), ov = AVOV[k] || {}, pics = ov.pics || {};
    g.fillText(k, 2, y + 2); g.fillText(pics[0] || pics[1] || pics[2] ? '(고침)' : '(원래)', 2, y + 14);
    [0, 1, 2].forEach(v => { const x = LW + v * (AVW + G), im = pics[v] && cfImg(pics[v]);
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(x, y, AVW, AVH); g.fillStyle = '#ffffff';
      if (im) g.drawImage(im, x, y, AVW, AVH); else { g.globalAlpha = .35; g.drawImage(avLayerPng(k, v, true), x, y); g.globalAlpha = 1; } }); });
  const y = 14 + keys.length * (AVH + G), cfg = keys.length === 1 ? avOvCfg(keys[0]) : Object.assign({}, AV_DEF, P.avatar || {}); g.fillText('전체 모습', 2, y + 2); avClr();
  [0, 1, 2].forEach(v => g.drawImage(avSprite(cfg, v, 0), LW + v * (AVW + G), y));
  // 어두운 배경 위에 투명 그림이 잘 보이게 바탕을 깔고 PNG로
  const out = document.createElement('canvas'); out.width = c.width; out.height = c.height; const og = out.getContext('2d'); og.fillStyle = '#3a3036'; og.fillRect(0, 0, out.width, out.height); og.drawImage(c, 0, 0);
  const name = 'token_' + (keys.length === 1 ? keys[0].replace(/[:]/g, '_') : 'all') + '.png';
  out.toBlob(async blob => { const f = new File([blob], name, { type: 'image/png' });
    try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); toast('내보내기 완료'); }, 'image/png');
}
function avOvCfg(key) { const [k, id] = key.split(':'), c = Object.assign({}, AV_DEF); if (k === 'eye') c.eye = id; if (k === 'hairB' || k === 'hairF') { c.hair = id; c.hairCol = AV_ITEMS.hair[id][2]; }
  if (AV_ITEMS[k] && k !== 'eye' && k !== 'hair') { if (k === 'one') { c.one = id; } else c[k] = id; const ck = { top: 'topCol', bottom: 'botCol', one: 'oneCol', shoes: 'shoeCol', hat: 'hatCol', acc: 'accCol' }[k]; c[ck] = AV_ITEMS[k][id][2]; } return c; }
function avNoArms(vw) { const bp = AVOV.body && AVOV.body.pics || {}; if (!bp[vw]) return false; const r = avBodyCut(vw === 1 ? 0 : vw, vw === 1 ? bp[0] || '' : bp[vw]); return !!(r && r.noArms); }
function avLayerPng(key, view, raw) { const c = document.createElement('canvas'); c.width = AVW; c.height = AVH; const g = c.getContext('2d'), P2 = avP2(g, avOvCfg(key), view, 0); if (key !== 'body') P2.noArms = avNoArms(view); avDrawLayer(P2, key); return raw ? c : c.toDataURL('image/png'); }
let AVOD = null;
function avOvEdit(key) {
  if (!AVOD || AVOD.key !== key) AVOD = { key, pics: Object.assign({}, (AVOV[key] || {}).pics || {}) };
  const nm = (AV_OV_GROUPS().flatMap(g => g[1]).find(x => x[0] === key) || [, key])[1];
  modal(`<h2 style="color:var(--gold2);margin-top:0">🎨 ${esc(nm)} 고치기</h2><p class="muted" style="font-size:.82rem;margin:0 0 6px">오른쪽 = 옆모습 반전</p>
    ${[[0, '앞모습'], [1, '옆모습 (왼쪽 보기)'], [2, '뒷모습']].map(([d, n]) => `<div class="item" style="margin:4px 0"><div style="display:flex;align-items:center;gap:8px"><img src="${AVOD.pics[d] || avLayerPng(key, d === 1 ? 1 : d)}" style="height:60px;image-rendering:pixelated;background:#2a2420"><div><b>${n}</b> ${AVOD.pics[d] ? '<span class="badge live">바꿈</span>' : '<span class="muted">원래 그림</span>'}</div></div>
      <div class="row" style="flex:0 0 auto;gap:4px"><button class="sm primary" onclick="avOvDraw('${key}',${d})">🎨 그리기</button>${AVOD.pics[d] ? `<button class="sm" onclick="delete AVOD.pics[${d}];avOvEdit('${key}')">↺</button>` : ''}</div></div>`).join('')}
    <div class="row" style="margin-top:10px"><button onclick="AVOD=null;closeModal()">취소</button><button class="primary" onclick="avOvSave('${key}')">저장</button></div>`);
}
/* 밑그림: 고친 그림(저장 전 포함)을 다 불러온 뒤 그림. skip = 지금 그리는 층은 빼기 */
const avClr = () => Object.keys(AVC).forEach(k => delete AVC[k]);
async function avLoadUrls(urls) { const t0 = Date.now(); urls = urls.filter(Boolean); urls.forEach(u => cfImg(u)); while (urls.some(u => !cfImg(u)) && Date.now() - t0 < 4000) await new Promise(r => setTimeout(r, 40)); }
async function avRefUrl(cfg, d, o) {
  o = o || {}; const pend = o.pend ? Object.values(o.pend) : [];
  await avLoadUrls(Object.values(AVOV).flatMap(v => Object.values(v.pics || {})).concat(pend, o.extra || []));
  const had = o.key && Object.prototype.hasOwnProperty.call(AVOV, o.key), keep = had ? AVOV[o.key] : null;
  if (o.key && o.pend) { if (pend.length) AVOV[o.key] = { key: o.key, pics: o.pend }; else delete AVOV[o.key]; }
  AV_SKIP = o.skip || null; avClr();
  const c = document.createElement('canvas'); c.width = AVW; c.height = AVH; const g = c.getContext('2d'); g.drawImage(avSprite(cfg, d, 0), 0, 0);
  (o.extra || []).forEach(u => { const im = cfImg(u); if (im) g.drawImage(im, 0, 0, AVW, AVH); });
  if (o.key && o.pend) { if (had) AVOV[o.key] = keep; else delete AVOV[o.key]; }
  AV_SKIP = null; avClr(); return c.toDataURL();
}
function avSetRef(url, a) { const im = new Image(); im.onload = () => { if (DE) { DE.ref = { img: im, data: null, a, on: true, x: 0, y: 0, s: 1, crisp: true }; deUI(); deDraw(); } }; im.src = url; }
async function avOvDraw(key, d) {
  toast('밑그림 준비 중');
  const orig = avLayerPng(key, d), cfg = avOvCfg(key);
  const base = await avRefUrl(cfg, d, { key, pend: AVOD.pics, skip: key });
  const guide = d ? await avRefUrl(cfg, 0, { key, pend: AVOD.pics }) : null;
  dotEdit({ W: AVW, H: AVH, src: AVOD.pics[d] || orig, orig, key: 'avov_' + key + '_' + d, title: key + ' · ' + ['앞', '옆', '뒤'][d], guide, guideName: '앞모습',
    onSave: url => { if (url) AVOD.pics[d] = url; else delete AVOD.pics[d]; avOvEdit(key); }, onCancel: () => avOvEdit(key) });
  avSetRef(base, .45);
}
const avOvId = key => key.replace(':', '__');
async function avOvSave(key) {
  const pics = AVOD.pics; try { if (!Object.keys(pics).length) await B.del('avOv/' + avOvId(key)); else await B.set('avOv/' + avOvId(key), { key, pics, at: Date.now() }); AVOD = null; closeModal(); toast(Object.keys(pics).length ? '저장 완료! 모든 토큰에 적용됨' : '원래 그림으로 돌림'); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function avOvReset(key) { if (!confirm('원래 그림으로 되돌릴까요?')) return; try { await B.del('avOv/' + avOvId(key)); toast('복구 완료'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
VIEWS.kavatar = () => {
  if (!IS_ADMIN) return '<div class="panel">KP만 볼 수 있음.</div>';
  let ok = false; try { ok = sessionStorage.getItem('peccata_avpw') === '1'; } catch (e) {}
  if (!ok) return `<div class="panel" style="max-width:360px;margin:30px auto;text-align:center"><h2>🔒 토큰 시험실</h2><p class="muted">비밀번호 입력</p><input id="avPw" type="password" inputmode="numeric" maxlength="12" style="text-align:center;font-size:1.2rem" onkeydown="if(event.key==='Enter')avPwTry()"><button class="primary" style="width:100%;margin-top:8px" onclick="avPwTry()">들어가기</button></div>`;
  const mine = avCfgOf(P), kpW = WEAR.filter(w => w.kind === 'kp'), plW = WEAR.filter(w => w.kind === 'pl');
  return `<div class="panel"><h2>🎎 토큰 시험실</h2><p class="muted" style="margin:0 0 6px">상태: <b>${AVCFG.open ? '전체 공개' : 'KP 전용'}</b></p>
    <div class="row" style="gap:6px;flex-wrap:wrap"><button class="primary" onclick="avEdit()">${mine ? '✏ 내 토큰 꾸미기' : '＋ 내 토큰 만들기'}</button><button onclick="avFake(${AVFAKE.length ? 0 : 2})">${AVFAKE.length ? '손님 없애기' : '👥 시험용 손님 2명'}</button><button onclick="avFake(2)">🎲 손님 다시 뽑기</button>
    <button class="${AVCFG.open ? 'danger' : ''}" onclick="avOpenToggle()">${AVCFG.open ? '🔒 다시 KP만 보기' : '🌐 모두에게 공개'}</button></div>
    <p class="muted" style="font-size:.8rem;margin:8px 0 4px">바닥 터치 → 이동</p>
    <canvas id="avTestCv" class="roomcv" width="${RW * 2}" height="${RH * 2}"></canvas></div>
   <div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">🧥 KP가 만든 옷</h2><button class="primary" style="flex:0 0 auto" onclick="wfNew('one','kp')">＋ 새 옷</button></div>
    ${kpW.map(w => `<div class="item" style="margin:4px 0"><div style="display:flex;align-items:center;gap:8px"><img src="${(w.pics || {})[0] || ''}" style="height:48px;image-rendering:pixelated;background:#2a2420"><div><b>${esc(w.name)}</b><div class="muted" style="font-size:.78rem">${esc((AV_SLOTS.find(s => s[0] === w.slot) || [, ''])[1])} · ${w.cost || 0} 은화${w.sell === false ? ' · 판매 안 함' : ''}</div></div></div><div class="row" style="flex:0 0 auto;gap:4px"><button class="sm" onclick="wfEdit('${w.id}')">고치기</button><button class="sm danger" onclick="wfDel('${w.id}')">지우기</button></div></div>`).join('') || '<p class="muted">없음</p>'}</div>
   ${avOvSection()}
   ${plW.length ? `<div class="panel"><h2>🎨 PL이 만든 옷 (${plW.length})</h2>${plW.map(w => `<div class="item" style="margin:4px 0"><div style="display:flex;align-items:center;gap:8px"><img src="${(w.pics || {})[0] || ''}" style="height:40px;image-rendering:pixelated;background:#2a2420"><b>${esc(w.name)}</b> <span class="muted">${esc(w.byName || '')}</span></div><button class="sm danger" onclick="wfDel('${w.id}')">지우기</button></div>`).join('')}</div>` : ''}`;
};
async function avOpenToggle() { const v = !AVCFG.open; if (v && !confirm('전체 PL에게 공개할까요?')) return; try { await B.set('settings/avatar', { open: v }, true); toast(v ? '모두에게 공개 완료' : 'KP만 보이게 함'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
const AVTEST = { items: [], invc: [], wall: 'plain', floor: 'plank', cols: { frame: null }, arc: {}, ow: [], dye: 0 };
function avTestPaint() {
  const cv = document.getElementById('avTestCv'); if (!cv) return; const room = PROF.ho ? myRoom() : hoRoom('__avtest');
  AV_PAINT_OWNER = AVTEST_ROOM; paintRoom(cv, room, {}); AV_PAINT_OWNER = null;
  cv.onclick = ev => { if (!avCfgOf(P)) return toast('토큰 먼저 만들기'); const p = cvPos(cv, ev); avWalkTo(AVTEST_ROOM, p.x, p.y); };
}
let AV_PAINT_OWNER = null;
setInterval(() => { if (tab === 'kavatar' && !document.hidden) { avTestPaint(); document.querySelectorAll('canvas.avovp:not([data-done])').forEach(c => { c.dataset.done = 1; const k = c.dataset.k, cfg = avOvCfg(k), g = c.getContext('2d'); g.clearRect(0, 0, AVW, AVH); g.drawImage(avSprite(cfg, 0, 0), 0, 0); }); } }, 140);
function avOnAuth(sub) {
  sub(B.onDoc('settings/avatar', d => { AVCFG = Object.assign({ open: false }, d || {}); softRender(); }));
  sub(B.onCol('wear', l => { WEAR = l; Object.keys(AVC).forEach(k => delete AVC[k]); softRender(); }));
  sub(B.onCol('avpos', l => { AVPOS = l; }));
  sub(B.onCol('avOv', l => { AVOV = {}; l.forEach(d => { if (d.key) AVOV[d.key] = d; }); Object.keys(AVC).forEach(k => delete AVC[k]); Object.keys(AVRC).forEach(k => delete AVRC[k]); softRender(); }));
}
/* 처음 공개됐을 때 PL에게 만들기 권하기 */
setInterval(() => { try { if (!ME || !AVCFG.open || IS_ADMIN || !PROF || !PROF.ho || !P || avCfgOf(P) || tab !== 'room' || document.querySelector('#modal[style*="flex"]')) return; if (sessionStorage.getItem('peccata_avask')) return; sessionStorage.setItem('peccata_avask', '1');
  modal(`<h2 style="color:var(--gold2);margin-top:0">🎎 토큰이 생김!</h2><p>방 안을 걸어 다니고, 옷을 갈아입을 수 있음.</p><div class="row"><button onclick="closeModal()">나중에</button><button class="primary" onclick="avEdit()">만들러 가기</button></div>`); } catch (e) {} }, 3000);
