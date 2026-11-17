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
/* ===== 토큰 그림 — 24×34 칸 설계를 2배(48×68)로 그림. 칸 하나 = 잔도트 2×2, 방에서 1픽셀 =====
   참고 그림 비율: 머리숱 공(줄 1~18) · 얼굴 줄 12~19 · 몸 20~29(허리 26) · 다리 30~31 · 신발 31~32 · 가운데 칸 11|12 */
const AV_TOP = 4;
const AV_HEADG = [6, 7, 8, 8, 8, 8, 8, 8, 8, 8, 7.5, 7, 6, 5, 4];   // 줄 4~18 (턱은 좁게)   // 얼굴(피부) 줄 4~19 반너비
const AV_BALLG = [0, 4.5, 6, 7, 7.5, 8, 8.5, 9, 9, 9, 9, 9, 9, 9, 8.5, 8.5, 8, 7.5, 7];   // 머리숱 줄 0~18 반너비
const AV_TWG = [3.5, 4, 4, 4, 4, 4, 4, 4, 4.5, 4.5];
const AV_ARMG = Array.from({ length: 14 }, (_, i) => [21 + i * .5, 6.5 - i * .035, 2]);   // 왼팔 줄 21~27.5: 아래로 갈수록 살짝 바깥   // 몸통 줄 20~29 반너비
function avP2(g, cfg, dir, step) {
  // 설계 좌표 → 그림: 줄 20 아래(몸)는 세로 0.72배·가로 0.85배로 작게, 전체를 3줄 아래로
  const fy = y => (y < 20 ? 20 - (20 - y) * .86 : 20 + (y - 20) * .72) + 3, fx = x => 12 + (x - 12) * .85;
  const raw = (x0, y0, x1, y1, col) => { const X = Math.round(x0 * 2), Y = Math.round(y0 * 2), X2 = Math.round(x1 * 2), Y2 = Math.round(y1 * 2); if (X2 > X && Y2 > Y) { g.fillStyle = col; g.fillRect(X, Y, X2 - X, Y2 - Y); } };
  const R = (x, y, w, h, col) => { if (w <= 0 || h <= 0 || !col) return; if (y >= 20) raw(fx(x), fy(y), fx(x + w), fy(y + h), col); else raw(x, fy(y), x + w, fy(y + h), col); };
  const RH = (x, y, w, h, col) => { if (w <= 0 || h <= 0 || !col) return; raw(x, fy(y), x + w, fy(y + h), col); };
  const H = (y, half, col, off) => R(12 - half + (off || 0), y, half * 2, 1, col);
  const M = (x, y, w, h, col) => { R(x, y, w, h, col); R(24 - x - w, y, w, h, col); };
  const view = dir === 2 ? 'back' : dir % 2 ? 'side' : 'front', side = view === 'side', lift = [0, -.5, 0, .5][step] || 0, of = side ? -1 : 0;
  const P = { R, H, M, RH, HH: (y, half, col, off) => RH(12 - half + (off || 0), y, half * 2, 1, col), MH: (x, y, w, h, col) => { RH(x, y, w, h, col); RH(24 - x - w, y, w, h, col); }, g, cfg, view, side, back: view === 'back', lift, of, sk: ramp(cfg.skin),
    legs: side ? [[9.5, 2.5, lift], [11, 2.5, -lift]] : [[8.5, 2.5, lift], [13, 2.5, -lift]] };
  P.tw = y => (AV_TWG[y - 20] || 5) - (side ? 1 : 0);
  P.torso = (col, y0, y1, ex) => { for (let y = y0; y <= y1; y++) H(y, P.tw(y) + (ex || 0), col, of); };
  // 소매(팔): 줄 21~25, 손은 26~27. n = 줄 수, wide = 바깥으로 더
  P.arm = (col, n, wide) => { if (P.noArms) return; const k = Math.min(n == null ? 5 : n, 7), w0 = wide || 0, sh = ramp(col).f;
    AV_ARMG.slice(0, k * 2).forEach(([y, x, w], i) => { if (side) { R(10.5 - w0, y, 2 + w0, .5, col); if (i > 3) R(12, y, .5, .5, sh); } else { M(x - w0, y, w + w0, .5, col); if (i > 3) M(x + w - .5, y, .5, .5, sh); } }); };
  return P;
}
function AV_BODY(P2) {
  const { R, H, M, sk, side, back, legs } = P2, shirt = '#ece6da', pants = '#4a4048';
  legs.forEach(([x, w, l]) => R(x, 29 + l, w, 3, sk.t));
  P2.torso(shirt, 20, 25); P2.torso(pants, 26, 29);
  AV_ARMG.forEach(([y, x, w], i) => { if (side) R(10.5, y, 2, .5, sk.t); else M(x, y, w, .5, sk.t); });
  if (side) R(10.5, 28, 2, .5, sk.t); else M(6.25, 28, 1.5, .5, sk.t);
  AV_HEADG.forEach((h, i) => H(AV_TOP + i, h, sk.t));
  H(19, 2, sk.f);
}
const avOutHex = hex => { const o = avOutCol(...deHex(hex)); return deToHex(o[0], o[1], o[2]); };
/* 눈: 1칸×2줄 일자 눈 (얼굴 양끝 가까이) */
function AV_EYE1(P2, eye, C, x) {
  const { R } = P2, y = 15;
  if (eye === 'round') { R(x, y, 1, 1, C.d); R(x, y + 1, 1, 1, C.t); }
  else if (eye === 'half') { R(x - .5, y + .5, 2, .5, C.o); }
  else if (eye === 'sharp') { R(x - .5, y, 1.5, .5, C.o); R(x, y + .5, 1, 1.5, C.t); }
  else { R(x - .5, y + 1, 2, .5, C.o); }
}
function AV_FACE(P2, eye, C) {
  const { R, side } = P2;
  if (side) { AV_EYE1(P2, eye, C, 5); R(4, 17.5, 1, .5, '#d89a88'); return; }
  AV_EYE1(P2, eye, C, 7.5); AV_EYE1(P2, eye, C, 15.5);
  R(11.5, 17.5, 1, .5, '#d89a88'); R(8, 16.5, 1, .5, '#f8c4bc'); R(15, 16.5, 1, .5, '#f8c4bc');
}
/* 머리숱 = 공. 앞머리 끝 줄(칸 6~17): 얼굴 창 */
const AV_BANGG = { def: [14, 12.5, 13, 11.5, 12, 13, 12, 11.5, 13, 12, 12.5, 14], short: [13, 11.5, 12, 10.5, 11, 12, 11, 10.5, 12, 11, 11.5, 13] };
function avStrand(R, x, y0, y1, w, col) { R(x, y0, w, y1 - y0 - .5, col); R(x + w / 2 - .5, y1 - .5, 1, .5, col); }
const AVH_HAIR = {
  back(P2, h, C) { const { side, back } = P2, R = P2.RH, H = P2.HH, sx = side ? 7 : 0;
    if (h === 'long' || h === 'wavy') { R(3 + sx, 10, 18 - sx, 17, C.t); R(3 + sx, 10, 1, 17, C.f); R(20, 10, 1, 17, C.f); for (let x = 3 + sx; x < 21; x += 3) avStrand(R, x, 26, 28.5, 3, C.t);
      if (h === 'wavy') for (let y = 13; y < 26; y += 3) { R(2 + sx, y, 1, 1.5, C.t); R(21, y + 1.5, 1, 1.5, C.t); } }
    if (h === 'braids') (side ? [17] : [1.5, 19.5]).forEach(x => { for (let y = 15; y < 25; y += 2) { R(x, y, 3, 2, C.t); R(x + .5, y + 1.5, 2, .5, C.f); R(x + .5, y, 1, .5, C.l); } R(x + .5, 25, 2, 1, '#c03050'); avStrand(R, x + .5, 26, 28, 2, C.t); });
    if (h === 'pony' && (back || side)) { const x = side ? 18 : 10; R(x, 5, 4, 14, C.t); R(x, 5, 1, 14, C.f); avStrand(R, x, 18, 21.5, 4, C.t); }
  },
  front(P2, h, C) { const { side, back } = P2, R = P2.RH, H = P2.HH, M = P2.MH;
    const bang = h === 'short' ? AV_BANGG.short : AV_BANGG.def, slick = h === 'slick';
    const lockTo = h === 'short' || slick ? 16 : h === 'bob' || h === 'long' || h === 'wavy' ? 19 : 18;
    for (let y = 1; y <= 18; y++) { const hw = AV_BALLG[y]; for (let x = 12 - hw; x < 12 + hw; x += .5) { const xi = Math.floor(x);
      let on = true;
      if (!back) {
        if (side) on = !(x < 10 && y >= (slick ? 9 : [12, 12.5, 11.5, 12, 12.5, 11.5, 12, 12, 12, 12][Math.max(0, xi - 1)] || 12)) && !(y > 12 && x < 10) && !(y >= lockTo && x < 14);
        else { const inWin = x >= 6 && x < 18, tip = slick ? 9 : bang[xi - 6], fh = AV_HEADG[Math.floor(y) - 4] || 0, dx = Math.abs(x + .25 - 12);
          on = !(inWin && y >= tip); if (y >= 12) on = on && dx >= fh - 1 && y < lockTo + ((xi * 3) % 2) * .5 - (dx < fh + 1 ? 0 : 0); }
      } else on = y <= 17;
      if (on) R(x, y, .5, 1, C.t); } }
    // 결: 진한 점들 + 윗부분 하이라이트
    // 결: 앞머리 가닥 사이 짧은 진한 선 + 정수리 쪽 불규칙한 그늘
    if (!back && !side && !slick) for (let x = 7; x < 18; x++) { const t0 = bang[x - 6], t1 = bang[x - 5]; if (t1 == null) continue; R(x, Math.min(t0, t1) - 2.5, .5, 2.5, C.f); }
    if (!back) [[5, 6], [7.5, 5], [15, 5.5], [17.5, 6.5], [10, 7.5], [13.5, 8], [4.5, 9.5], [19, 9]].forEach(([x, y], n) => { if (side && x < 9) return; if (Math.abs(x - 11.75) < AV_BALLG[Math.floor(y)] - 1 && !(slick && y > 8)) R(x, y, .5, n % 2 ? 1.5 : 1, C.f); });
    if (back) [[6, 9], [9.5, 11], [13.5, 10], [17, 9.5], [11.5, 6]].forEach(([x, y]) => R(x, y, .5, 4, C.f));
    if (!back) { M(4, 12, .5, Math.max(0, lockTo - 12), C.f); }
    if (side) { R(5, 3, 3, .5, C.L); R(8, 2.5, 3, .5, C.l); } else { R(6, 3, 2, .5, C.L); R(8, 2.5, 3, .5, C.L); R(13, 2.5, 2, .5, C.l); }
    if (h === 'bun') { H(0, 3, C.t); H(.5, 3.5, C.t); R(10, 0, 1.5, .5, C.L); }
    if (back) { if (h === 'pony') R(10.5, 5, 3, 1.5, '#c03050'); return; }
    if (slick) H(8.5, 6, C.f);
    if (h === 'short' || h === 'wavy' || h === 'bob') { const ax = side ? 9 : 12; R(ax, 0, 1, 1, C.t); R(ax + 1, 0, 1, .5, C.t); }
    if (h === 'pony' && !side) { R(20, 5, 2, 5, C.t); R(20, 5, 1, 1, '#c03050'); }
    if (h === 'pony' && side) R(18, 5, 2, 2, '#c03050');
  }
};
/* 옷 — 몸통 줄 20~29 (허리 26) · 소매 P2.arm · 다리 P2.legs (줄 29~31) */
const AV_DRAW = {
  shoes(P2, s, C) { const { R, legs } = P2; legs.forEach(([x, w, l], i) => { const o = i ? 0 : -.5;
    if (s === 'boots') { R(x, 28.5 + l, w, 2, C.t); R(x + o, 30.5 + l, w + .5, 1.5, C.d); R(x, 29 + l, .5, 1.5, C.l); }
    else if (s === 'geta') { R(x, 30.5 + l, w, .5, '#c03050'); R(x + o, 31 + l, w + .5, .5, C.t); R(x + o + .5, 31.5 + l, .5, .5, C.d); R(x + w - .5 + o, 31.5 + l, .5, .5, C.d); }
    else if (s === 'mary') { R(x, 29.5 + l, w, 1, '#f8f4ea'); R(x + o, 30.5 + l, w + .5, 1.5, C.t); }
    else { R(x + o, 30.5 + l, w + .5, 1.5, C.t); R(x + o, 30.5 + l, w + .5, .5, C.l); } }); },
  bottom(P2, b, C) { const { R, H, legs, side, of } = P2;
    if (b === 'pants' || b === 'shorts') { P2.torso(C.t, 26, 29); if (b === 'pants') legs.forEach(([x, w, l]) => R(x, 29 + l, w, 1.5, C.t)); if (!side) R(11.5, 27.5, 1, 2, C.f); P2.torso(C.d, 26, 26); }
    else if (b === 'skirt') { [4.5, 5, 5.5, 6].forEach((h, i) => H(26 + i, side ? h - 1 : h, i === 3 ? C.f : C.t, of)); if (!side) for (let x = 8; x < 16; x += 2.5) R(x, 27, .5, 2, C.f); }
    else { [4.5, 5, 5, 5.5, 5.5, 6].forEach((h, i) => H(26 + i, side ? h - 1 : h, C.t, of)); if (!side) for (let x = 8; x < 16; x += 2.5) R(x, 27, .5, 3.5, C.f); H(31, side ? 5 : 6, C.f, of);
      if (b === 'hakama') { P2.torso(C.d, 26, 26); if (!side) H(25, 3, '#f4e6c8'); } } },
  top(P2, t, C) { const { R, H, M, side, back } = P2, front = !back && !side;
    const body = col => P2.torso(col, 20, 25);
    if (['shirt', 'blouse', 'knit', 'gakuran'].includes(t)) { body(C.t); P2.arm(C.t, 5); }
    if (t === 'shirt' && front) { R(10, 20, 4, .5, C.L); R(11.5, 21, 1, 4.5, C.l); R(11.5, 22, .5, .5, C.f); R(11.5, 24, .5, .5, C.f); }
    if (t === 'blouse' && front) { R(10, 20, 4, 1, '#c03050'); R(11, 20, 2, 1, '#a02040'); R(10.5, 21, 1, 1, '#c03050'); R(12.5, 21, 1, 1, '#c03050'); }
    if (t === 'knit') { for (let y = 21.5; y < 26; y += 1.5) P2.torso(C.l, y, y - .5); if (!back) H(20, 2, C.d); }
    if (t === 'gakuran') { H(20, 2.5, C.d); if (front) { R(11.5, 20.5, 1, 5, C.d); [21.5, 23, 24.5].forEach(y => R(11.5, y, 1, .5, '#e0b050')); } }
    if (t === 'vest') { body('#f4f0e6'); P2.arm('#f4f0e6', 5); P2.torso(C.t, 21, 25); if (front) { R(10.5, 20, 3, 3, '#f4f0e6'); R(11.5, 20.5, 1, 3, '#5a2a3a'); } }
    if (t === 'yagasuri') { body(C.t); P2.arm(C.t, 6, 1); for (let y = 21; y < 26; y += 2) for (let x = 8 + (y % 4 ? 1.5 : 0); x < 16; x += 3) R(x, y, .5, 1, C.L); if (front) { R(10, 20, 1, 2.5, '#f4f0e6'); R(13, 20, 1, 2.5, '#f4f0e6'); } } },
  one(P2, o, C) { const { R, H, M, side, back, legs, of } = P2, front = !back && !side, na = P2.noArms;
    const body = col => P2.torso(col, 20, 25);
    const skirt = (col, rows) => rows.forEach((h, i) => H(26 + i, side ? h - 1 : h, col, of));
    if (o === 'maid') { skirt(C.t, [4.5, 5, 5.5, 6]); body(C.t); P2.arm(C.t, 5); if (!na) { if (side) R(9.5, 20.5, 3, 1.5, C.t); else M(5.5, 20.5, 3, 1.5, C.t); }
      if (!back) { for (let y = 21.5; y < 29.5; y += .5) H(y, side ? 1.5 : 2.5, '#f8f4ea', side ? -1.5 : 0); if (front) { H(20, 2, '#f8f4ea'); R(11, 20.5, 2, 1, '#c03050'); } }
      else { R(9, 24.5, 6, 1, '#f8f4ea'); } }
    if (o === 'kimono') { skirt(C.t, [4, 4, 4.5, 4.5, 5, 5]); body(C.t); P2.arm(C.t, 6, 1); if (!na) { if (side) R(9, 24, 3, 3, C.t); else M(5, 23.5, 3, 3.5, C.t); }
      P2.torso('#e0b050', 23.5, 24.5); [[9, 27.5], [13.5, 29], [10.5, 30]].forEach(([x, y]) => (!side || x > 8) && R(x, y, 1, 1, C.L));
      if (front) { R(10, 20, 1, 3, '#f4f0e6'); R(13, 20, 1, 3, '#f4f0e6'); R(11.5, 26, 1, 5.5, C.f); } if (back) R(9, 22.5, 6, 3, '#e0b050'); }
    if (o === 'dress') { skirt(C.t, [5, 5.5, 6, 6.5]); H(29, side ? 5.5 : 6.5, C.l, of); body(C.t); P2.arm(C.l, 2, .5); if (!back) H(20, 2.5, '#f8f4ea'); }
    if (o === 'coat') { body(C.t); P2.arm(C.t, 5); skirt(C.t, [4.5, 5, 5, 5.5]); for (let y = 20; y < 23.5; y += .5) H(y, side ? 5 : 6, C.l, of); H(23, side ? 5 : 6, C.f, of);
      if (front) { R(11.5, 23.5, 1, 6, C.d); R(13, 24.5, 1, .5, '#e0b050'); R(13, 26.5, 1, .5, '#e0b050'); } }
    if (o === 'butler') { legs.forEach(([x, w, l]) => R(x, 29 + l, w, 1.5, C.t)); body(C.t); P2.torso(C.t, 26, 29); P2.arm(C.t, 5);
      if (!side) { R(8, 26, 1.5, 4, C.t); R(14.5, 26, 1.5, 4, C.t); } if (back) R(9, 26, 6, 4, C.t);
      if (front) { R(10.5, 20, 3, 4, '#f8f4ea'); R(10.5, 20, 3, 1, '#24242e'); R(11.5, 21, 1, .5, '#24242e'); } } },
  hat(P2, h, C) { const { R, H, M, side, back } = P2;
    if (h === 'fedora') { H(5, 11, C.t); H(5.5, 10.5, C.d); for (let y = 0; y < 5; y += .5) H(y, y < 1 ? 6 : 7, C.t); H(4, 7, '#24161e'); R(7, 1, 3, .5, C.l); }
    if (h === 'cap') { for (let y = .5; y < 5; y += .5) H(y, y < 1.5 ? 8 : 9.5, C.t); H(.5, 8, C.l); H(4, 9.5, C.d); if (!back) { if (side) R(.5, 5, 6, 1, '#14141a'); else { H(5, 7, '#14141a'); H(5.5, 6, '#14141a'); } R(11, 1.5, 2, 2, '#e0b050'); } }
    if (h === 'ribbon') { const x = side ? 15 : 16; R(x - 3.5, 0, 3, 3.5, C.t); R(x + 1, 0, 3, 3.5, C.t); R(x - .5, 1, 1.5, 1.5, C.d); R(x - 3.5, .5, 1, 2.5, C.l); }
    if (h === 'bonnet') { H(2.5, 8.5, C.t); H(3, 9, C.t); H(3.5, 9, C.f); for (let x = 3.5; x < 20.5; x += 1.5) R(x, 1.5, 1, 1, C.t); R(10, 2.5, 4, 1, '#c03050'); } },
  acc(P2, a, C) { const { R, H, M, side, back } = P2; if (back && a !== 'muffler') return;
    const ring = x => { R(x - 1, 14, 3, .5, C.t); R(x - 1, 17, 3, .5, C.t); R(x - 1.5, 14.5, .5, 2.5, C.t); R(x + 2, 14.5, .5, 2.5, C.t); };
    if (a === 'glasses') { if (side) ring(5); else { ring(7); ring(16); R(9, 15, 6, .5, C.t); } }
    if (a === 'monocle') { const x = side ? 5 : 16; ring(x); R(x + 2, 17, .5, 5, C.d); }
    if (a === 'flower') { const x = side ? 15 : 4.5, y = 5; R(x - .5, y - 1, 1, 3, C.t); R(x - 1.5, y, 3, 1, C.t); R(x - .5, y, 1, 1, '#ffe27a'); }
    if (a === 'muffler') { const w = side ? 4.5 : 5; H(19, w, C.t); H(19.5, w, C.l); H(20, w, C.f); if (!back) { const x = side ? 6.5 : 13.5; R(x, 20.5, 2.5, 4, C.t); R(x, 24, 2.5, .5, C.f); } } }
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
    if (vw !== 1 && y >= 46 && y <= 60 && (x < 17 || x >= 31) && a[i * 4 + 3]) { armAll++; armGone += gone[i]; } }
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
    let n = -1; for (const [a, b] of [[0, -1], [1, 0], [-1, 0], [0, 1], [0, -2], [2, 0], [-2, 0], [0, 2], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const X = x + a, Y = y + b; if (X >= 0 && Y >= 0 && X < AVW && Y < AVH && src[(Y * AVW + X) * 4 + 3] > 100) { n = (Y * AVW + X) * 4; break; } }
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
        <div class="row" style="flex:0 0 auto;gap:4px"><button class="sm" onclick="avOvEdit('${k}')">✏ 고치기</button>${AVOV[k] ? `<button class="sm" onclick="avOvReset('${k}')">↺ 원래대로</button>` : ''}</div></div>`).join('')}</details>`).join('')}</div>`;
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
