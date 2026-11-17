/* ================= 🧍 아바타 + 옷 꾸미기 (지금은 KP 시험 단계) =================
   settings/avatar { open:false }   open 이 꺼져 있으면 KP 화면에서만 보이고 시험할 수 있어요
   progress.avatar  { skin, eye, eyeCol, hair, hairCol, top, topCol, bottom, botCol, shoes, shoeCol, one, oneCol, hat, hatCol, acc, accCol }
   progress.wardrobe [ 'top:vest', 'w:<직접 만든 옷 id>', … ]   기본 무료 옷은 따로 안 적어도 가진 것
   wear/{id}  { name, slot, kind:'kp'|'pl', by, cost, sell, pics:{0,1,2}, at }   직접 만든 옷 (48×72 도트)
   avpos/{uid} { room, x, y, tx, ty, t0, dir, seen }   방 안에서 걷는 위치 (실시간)
   그림: 48×72 도트(가구와 같은 해상도), 방에서는 24×36 크기. 방향 0 앞 · 1 왼쪽 · 2 뒤 · 3 오른쪽(왼쪽 뒤집기)
============================================================================= */
let AVCFG = { open: false }, WEAR = [], AVPOS = [];
const AVW = 48, AVH = 72;
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
let AVOV = {};   // avOv/{층 키} { pics:{0,1,2} }  층 키: body · eye:round · hairB:bob · hairF:bob · top:shirt …
const AVC = {};
const avView = dir => dir === 2 ? 2 : dir % 2 ? 1 : 0;
function avP2(g, cfg, dir, step) {
  const R = (x, y, w, h, col) => { if (w <= 0 || h <= 0) return; g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  const E = (cx, cy, rx, ry, col) => { for (let y = -ry; y <= ry; y++) { const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y / (ry + .5)) ** 2))); R(cx - w, cy + y, w * 2 + 1, 1, col); } };
  const view = dir === 2 ? 'back' : dir % 2 ? 'side' : 'front', side = view === 'side', lift = [0, -1, 0, 1][step] || 0;
  return { R, E, g, cfg, view, side, back: view === 'back', cx: side ? 23 : 24, lift, sk: ramp(cfg.skin),
    legs: side ? [[20, 5, lift], [24, 5, -lift]] : [[18, 5, lift], [25, 5, -lift]], torso: side ? { x: 17, w: 14 } : { x: 15, w: 18 } };
}
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
function avSprite(cfg, dir, step) {
  const key = JSON.stringify(cfg) + '|' + dir + '|' + step; if (AVC[key]) return AVC[key];
  const c = document.createElement('canvas'); c.width = AVW; c.height = AVH; const g = c.getContext('2d'), P2 = avP2(g, cfg, dir, step), vw = avView(dir);
  let pending = false;
  const layer = lk => { const ov = AVOV[lk], src = ov && ov.pics && ov.pics[vw];
    if (src) { const [f, t] = avLayerCol(lk, cfg), im = avRecolor(src, f, t); if (!im) { pending = true; return; } const bob = lk === 'body' || lk.startsWith('shoes') || lk.startsWith('bottom') ? 0 : 0; g.drawImage(im, 0, bob, AVW, AVH); return; }
    avDrawLayer(P2, lk); };
  const custom = slot => { const id = cfg[slot]; if (!id || !id.startsWith('w:')) return false; const w = WEAR.find(x => 'w:' + x.id === id); if (!w) { pending = true; return true; } const pics = w.pics || {}, src = vw === 2 && pics[2] ? pics[2] : vw === 1 && pics[1] ? pics[1] : pics[0], im = cfImg(src);
    if (!im) pending = true; else g.drawImage(im, 0, 0, AVW, AVH); return true; };
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
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X = x + a, Y = y + b; return X >= 0 && Y >= 0 && X < AVW && Y < AVH && src[(Y * AVW + X) * 4 + 3] > 100; })) { p[k] = 42; p[k + 1] = 24; p[k + 2] = 20; p[k + 3] = 255; } }
  g.putImageData(d, 0, 0);
  let out = c; if (dir === 3) { const m = document.createElement('canvas'); m.width = AVW; m.height = AVH; const mg = m.getContext('2d'); mg.translate(AVW, 0); mg.scale(-1, 1); mg.drawImage(c, 0, 0); out = m; }
  if (!pending) AVC[key] = out; return out;
}
/* 몸: 다리 · 속옷 · 손 · 목 · 머리(얼굴형) — 큰 머리 2등신 */
function AV_BODY(P2) {
  const { R, E, sk, side, back, cx, legs, torso } = P2;
  legs.forEach(([x, w, l]) => { R(x, 52 + l, w, 11, sk.t); R(x + w - 1, 52 + l, 1, 11, sk.f); R(x, 61 + l, w, 2, sk.f); });
  R(torso.x + 1, 38, torso.w - 2, 13, '#ece6da'); E(torso.x + 3, 39, 3, 2, '#ece6da'); E(torso.x + torso.w - 4, 39, 3, 2, '#ece6da'); R(torso.x + 1, 47, torso.w - 2, 5, '#4a4048');
  if (side) { R(19, 39, 4, 9, sk.t); E(20, 49, 2, 2, sk.t); R(19, 39, 1, 9, sk.f); }
  else { R(12, 39, 3, 9, sk.t); R(33, 39, 3, 9, sk.t); E(13, 49, 2, 2, sk.t); E(34, 49, 2, 2, sk.t); E(13, 50, 1, 0, sk.f); E(34, 50, 1, 0, sk.f); }
  R(cx - 3, 33, 6, 6, sk.f); R(cx - 2, 33, 4, 4, sk.t);
  // 머리: 이마가 넓고 볼이 통통한 둥근 얼굴
  E(cx, 20, 15, 15, sk.t);
  if (!back) { E(cx - (side ? 4 : 0), 26, 13, 9, sk.t); if (side) { E(cx - 13, 25, 2, 3, sk.t); E(cx + 4, 24, 3, 4, sk.f); E(cx + 4, 24, 2, 3, sk.t); } else { R(cx - 13, 30, 3, 2, sk.f); R(cx + 10, 30, 3, 2, sk.f); } }
}
/* 얼굴: 크고 반짝이는 눈 (머리의 1/4 높이) · 낮은 위치 */
function AV_FACE(P2, eye, C) {
  const { R, E, side, cx } = P2, ey = 23, pos = side ? [[cx - 9, -1]] : [[cx - 7, -1], [cx + 7, 1]];
  pos.forEach(([x, o]) => {
    if (eye === 'round') {
      R(x - 3, ey, 6, 1, C.o); R(x - 2, ey - 1, 4, 1, C.o); if (!side || o) R(x + (o > 0 ? 3 : -4), ey - 1, 1, 1, C.o);
      R(x - 3, ey + 1, 6, 6, C.d); R(x - 2, ey + 2, 4, 3, C.t); R(x - 2, ey + 4, 4, 2, C.l); R(x - 1, ey + 6, 2, 1, C.L);
      R(x - 3, ey + 1, 1, 6, C.o); R(x + 2, ey + 1, 1, 6, C.o); R(x - 2, ey + 7, 4, 1, C.f);
      R(x - 2, ey + 1, 2, 2, '#ffffff'); R(x + 1, ey + 5, 1, 1, '#ffffff');
    } else if (eye === 'half') {
      R(x - 2, ey + 3, 4, 1, C.o); R(x - 3, ey + 4, 1, 1, C.o); R(x + 2, ey + 4, 1, 1, C.o); R(x - 4, ey + 5, 1, 1, C.o); R(x + 3, ey + 5, 1, 1, C.o);
    } else if (eye === 'sharp') {
      R(x - 3, ey + 1, 7, 1, C.o); R(x + (o > 0 ? 3 : -4), ey, 1, 1, C.o); R(x - 3, ey + 2, 6, 4, C.d); R(x - 2, ey + 3, 4, 2, C.t); R(x - 2, ey + 4, 4, 1, C.l);
      R(x - 3, ey + 2, 1, 4, C.o); R(x + 2, ey + 2, 1, 4, C.o); R(x - 2, ey + 6, 4, 1, C.f); R(x - 2, ey + 2, 1, 1, '#ffffff'); R(x + 1, ey + 2, 1, 1, '#ffffff');
    } else {   // 졸린 눈: 눈꺼풀이 반쯤
      R(x - 3, ey + 3, 6, 1, C.o); R(x - 3, ey + 4, 6, 3, C.d); R(x - 2, ey + 5, 4, 1, C.t); R(x - 2, ey + 6, 4, 1, C.l); R(x - 3, ey + 4, 1, 3, C.o); R(x + 2, ey + 4, 1, 3, C.o); R(x - 2, ey + 7, 4, 1, C.f); R(x - 2, ey + 4, 1, 1, '#ffffff');
    }
  });
  if (side) { R(cx - 13, 32, 2, 1, '#b05a5a'); E(cx - 6, 30, 2, 0, '#f6a8a8'); }
  else { R(cx - 1, 32, 3, 1, '#b05a5a'); R(cx, 33, 1, 1, '#d88080'); E(cx - 9, 30, 2, 0, '#f6a8a8'); E(cx + 9, 30, 2, 0, '#f6a8a8'); }
}
/* 머리카락 */
const AVH_HAIR = {
  back(P2, h, C) { const { R, E, side, back, cx } = P2;
    if (h === 'long' || h === 'wavy') { R(cx - 14 + (side ? 6 : 0), 18, side ? 18 : 28, 30, C.t); R(cx - 14 + (side ? 6 : 0), 18, 2, 30, C.f); if (h === 'wavy') for (let y = 22; y < 48; y += 4) { R(cx - 15 + (side ? 6 : 0), y, 1, 2, C.t); R(cx + 14, y + 2, 1, 2, C.t); } }
    if (h === 'braids' && !side) { [cx - 14, cx + 11].forEach(x => { for (let y = 26; y < 46; y += 4) E(x + 1, y, 2, 2, C.t); R(x, 46, 3, 2, '#c03050'); }); }
    if (h === 'braids' && side) { for (let y = 26; y < 46; y += 4) E(cx + 10, y, 2, 2, C.t); }
    if (h === 'pony') { if (back || side) { R(cx + (side ? 9 : -3), 14, 6, 22, C.t); R(cx + (side ? 9 : -3), 14, 2, 22, C.f); } }
    if (h === 'bob') { R(cx - 15 + (side ? 6 : 0), 16, side ? 19 : 30, 14, C.t); }
  },
  front(P2, h, C) { const { R, E, side, back, cx } = P2;
    const cap = lim => { for (let y = -11; y <= 11; y++) { if (14 + y > lim) break; const w = Math.round(16 * Math.sqrt(Math.max(0, 1 - (y / 11.5) ** 2))); R(cx - w, 14 + y, w * 2 + 1, 1, C.t); } };
    cap(back ? 30 : 17); E(cx - 4, 7, 7, 2, C.l); R(cx + 5, 6, 3, 1, C.l);
    if (back) { E(cx, 19, 16, 14, C.t); E(cx - 4, 12, 6, 3, C.l); if (h === 'bun') { E(cx, 6, 6, 5, C.t); E(cx - 2, 5, 3, 2, C.l); } if (h === 'pony') { E(cx, 14, 3, 3, '#c03050'); } return; }
    if (side) {   // 왼쪽을 봄
      R(cx - 4, 10, 18, 12, C.t); R(cx + 6, 13, 8, 18, C.t); R(cx - 14, 13, 10, 5, C.t);
      if (h === 'bob' || h === 'long' || h === 'wavy') R(cx + 2, 16, 12, 14, C.t);
      if (h === 'bun') { E(cx + 6, 6, 6, 5, C.t); E(cx + 4, 5, 3, 2, C.l); } if (h === 'pony') E(cx + 9, 14, 2, 2, '#c03050');
      return; }
    // 앞 모습
    if (h === 'slick') { R(cx - 13, 12, 26, 4, C.t); R(cx - 14, 14, 3, 8, C.t); R(cx + 11, 14, 3, 8, C.t); R(cx - 6, 10, 10, 1, C.l); return; }
    if (h === 'short') { for (let i = 0; i < 6; i++) R(cx - 12 + i * 4, 15, 4, 3 + (i % 2), C.t); R(cx - 14, 14, 3, 9, C.t); R(cx + 11, 14, 3, 9, C.t); return; }
    for (let i = 0; i < 7; i++) R(cx - 13 + i * 4, 15, 4, 3 + ((i * 3) % 3), C.t);
    R(cx - 15, 14, 4, h === 'bob' ? 16 : h === 'bun' || h === 'pony' ? 10 : 18, C.t); R(cx + 11, 14, 4, h === 'bob' ? 16 : h === 'bun' || h === 'pony' ? 10 : 18, C.t);
    if (h === 'bun') { E(cx, 4, 6, 4, C.t); E(cx - 2, 3, 3, 2, C.l); }
    if (h === 'braids') { R(cx - 16, 24, 3, 6, C.t); R(cx + 13, 24, 3, 6, C.t); }
  }
};
/* 옷 */
const AV_DRAW = {
  shoes(P2, s, C) { const { R, legs } = P2; legs.forEach(([x, w, l]) => {
    if (s === 'boots') { R(x - 1, 56 + l, w + 2, 9, C.t); R(x - 1, 56 + l, 1, 9, C.l); R(x - 1, 64 + l, w + 3, 2, C.d); }
    else if (s === 'geta') { R(x - 1, 63 + l, w + 2, 2, C.t); R(x, 65 + l, 1, 2, C.d); R(x + w - 1, 65 + l, 1, 2, C.d); R(x + 1, 61 + l, w - 2, 2, '#c03050'); }
    else if (s === 'mary') { R(x - 1, 62 + l, w + 2, 4, C.t); R(x, 61 + l, w, 1, C.t); R(x - 1, 62 + l, 1, 1, C.l); R(x, 58 + l, w, 3, '#f8f4ea'); }
    else { R(x - 1, 62 + l, w + 2, 4, C.t); R(x - 1, 62 + l, w + 2, 1, C.l); } }); },
  bottom(P2, b, C) { const { R, legs, torso, side } = P2, x0 = torso.x, w0 = torso.w;
    if (b === 'pants') { R(x0 + 1, 46, w0 - 2, 6, C.t); legs.forEach(([x, w, l]) => { R(x - 1, 50 + l, w + 2, 12, C.t); R(x - 1, 50 + l, 1, 12, C.f); }); }
    else if (b === 'shorts') { R(x0 + 1, 46, w0 - 2, 6, C.t); legs.forEach(([x, w, l]) => R(x - 1, 50 + l, w + 2, 4, C.t)); }
    else if (b === 'skirt') { for (let y = 46; y < 58; y++) { const e = Math.round((y - 46) / 3); R(x0 - e, y, w0 + e * 2, 1, (y - 46) % 4 < 1 ? C.f : C.t); } }
    else if (b === 'long' || b === 'hakama') { for (let y = 46; y < 62; y++) { const e = Math.round((y - 46) / 3.2); R(x0 - e, y, w0 + e * 2, 1, C.t); if (!side) R(x0 + w0 / 2 - 1 + ((y >> 2) % 2), y, 1, 1, C.f); }
      if (b === 'hakama') { R(x0, 46, w0, 2, C.d); if (!side) R(x0 + 3, 44, w0 - 6, 2, '#f4e6c8'); } } },
  top(P2, t, C) { const { R, E, torso, side, back, cx } = P2, x0 = torso.x, w0 = torso.w;
    const body = (col, h) => { R(x0, 36, w0, h || 12, col); E(x0 + (side ? 6 : 2), 37, 3, 2, col); if (!side) E(x0 + w0 - 3, 37, 3, 2, col); };
    const sleeves = (col, wide) => { if (side) { R(16, 37, 6 + (wide ? 2 : 0), wide ? 12 : 11, col); R(16, 37, 1, 11, P2.cfg && col); return; } R(10 - (wide ? 1 : 0), 37, 4 + (wide ? 1 : 0), wide ? 12 : 11, col); R(34, 37, 4 + (wide ? 1 : 0), wide ? 12 : 11, col); };
    if (t === 'shirt' || t === 'blouse') { body(C.t); sleeves(C.t); R(x0, 36, 1, 12, C.f); if (!back && !side) { R(cx - 1, 37, 2, 10, C.f); if (t === 'blouse') { E(cx - 3, 37, 2, 1, '#c03050'); E(cx + 3, 37, 2, 1, '#c03050'); R(cx - 1, 37, 2, 3, '#a02040'); } else { R(cx - 2, 36, 1, 2, C.d); R(cx + 1, 36, 1, 2, C.d); } } }
    if (t === 'vest') { body('#f4f0e6'); sleeves('#f4f0e6'); body(C.t, 11); if (!back && !side) { R(cx - 2, 36, 4, 6, '#f4f0e6'); R(cx - 1, 37, 2, 6, '#5a2a3a'); for (let y = 40; y < 47; y += 3) R(cx + 3, y, 1, 1, '#e0b050'); } }
    if (t === 'gakuran') { body(C.t); sleeves(C.t); if (!back && !side) { R(cx - 1, 36, 2, 12, C.d); for (let y = 38; y < 48; y += 3) R(cx - 1, y, 2, 1, '#e0b050'); R(cx - 3, 35, 6, 2, C.d); } R(x0, 36, 1, 12, C.f); }
    if (t === 'knit') { body(C.t); sleeves(C.t); for (let y = 38; y < 48; y += 2) R(x0 + 1, y, w0 - 2, 1, C.l); if (!back) R(cx - 3, 35, 6, 2, C.d); }
    if (t === 'yagasuri') { body(C.t); sleeves(C.t, true); for (let y = 38; y < 48; y += 4) for (let x = x0 + 1; x < x0 + w0 - 1; x += 4) { R(x, y, 1, 2, C.L); R(x + 1, y + 1, 1, 2, C.L); }
      if (!back && !side) { R(cx - 4, 36, 2, 8, '#f4f0e6'); R(cx + 2, 36, 2, 8, '#f4f0e6'); R(cx - 2, 36, 4, 2, '#f4f0e6'); } } },
  one(P2, o, C) { const { R, E, torso, side, back, cx, legs } = P2, x0 = torso.x, w0 = torso.w;
    const body = (col, h) => { R(x0, 36, w0, h || 12, col); E(x0 + (side ? 6 : 2), 37, 3, 2, col); if (!side) E(x0 + w0 - 3, 37, 3, 2, col); };
    const sleeves = (col, wide) => { if (side) { R(16, 37, 6 + (wide ? 3 : 0), wide ? 13 : 11, col); return; } R(10 - (wide ? 2 : 0), 37, 4 + (wide ? 2 : 0), wide ? 13 : 11, col); R(34, 37, 4 + (wide ? 2 : 0), wide ? 13 : 11, col); };
    const skirt = (col, len, flare) => { for (let y = 46; y < 46 + len; y++) { const e = Math.round((y - 46) / flare); R(x0 - e, y, w0 + e * 2, 1, col); } };
    if (o === 'maid') { skirt(C.t, 14, 3); body(C.t); sleeves(C.t); if (side) E(18, 37, 2, 2, C.t); else { E(10, 37, 2, 2, C.t); E(37, 37, 2, 2, C.t); } if (!back) { R(x0 + 3, 42, w0 - 6, 16, '#f8f4ea'); for (let y = 56; y < 60; y++) R(x0 + 2 - (y - 56), y, w0 - 4 + (y - 56) * 2, 1, '#f8f4ea'); R(cx - 3, 36, 6, 6, '#f8f4ea'); E(cx, 37, 2, 1, '#c03050'); } else { R(cx - 4, 44, 8, 3, '#f8f4ea'); E(cx - 4, 45, 3, 2, '#f8f4ea'); E(cx + 4, 45, 3, 2, '#f8f4ea'); } }
    if (o === 'kimono') { skirt(C.t, 18, 9); body(C.t); sleeves(C.t, true); R(x0, 44, w0, 4, '#e0b050'); for (let i = 0; i < 6; i++) E(x0 + 3 + (i * 7) % (w0 - 4), 50 + (i * 5) % 12, 1, 1, C.L);
      if (!back && !side) { R(cx - 4, 36, 2, 8, '#f4f0e6'); R(cx + 2, 36, 2, 8, '#f4f0e6'); } if (back) { E(cx, 45, 5, 3, '#e0b050'); } }
    if (o === 'dress') { skirt(C.t, 16, 2.5); body(C.t); sleeves(C.l); for (let y = 50; y < 62; y += 4) R(x0 - 2, y, w0 + 4, 1, C.f); if (!back) { R(cx - 4, 36, 8, 2, '#f8f4ea'); E(cx, 44, 3, 1, '#f8f4ea'); } }
    if (o === 'coat') { body(C.t); sleeves(C.t); for (let y = 36; y < 58; y++) { const e = Math.round((y - 36) / 6); R(x0 - 3 - e, y, w0 + 6 + e * 2, 1, y < 44 ? C.l : C.t); } if (!back && !side) { R(cx - 1, 44, 2, 14, C.d); for (let y = 46; y < 56; y += 4) R(cx + 2, y, 1, 1, '#e0b050'); } }
    if (o === 'butler') { legs.forEach(([x, w, l]) => R(x - 1, 50 + l, w + 2, 12, C.t)); body(C.t); sleeves(C.t); if (!side) { R(x0 + 2, 46, 3, 12, C.t); R(x0 + w0 - 5, 46, 3, 12, C.t); } if (back) R(cx - 4, 46, 8, 10, C.t);
      if (!back && !side) { R(cx - 3, 36, 6, 9, '#f8f4ea'); R(cx - 2, 36, 4, 2, '#24242e'); E(cx - 2, 37, 1, 1, '#24242e'); E(cx + 2, 37, 1, 1, '#24242e'); } } },
  hat(P2, h, C) { const { R, E, side, back, cx } = P2;
    if (h === 'fedora') { E(cx, 9, 18, 2, C.t); R(cx - 10, 0, 20, 9, C.t); R(cx - 10, 6, 20, 2, '#24161e'); R(cx - 8, 0, 6, 1, C.l); }
    if (h === 'cap') { R(cx - 13, 3, 26, 9, C.t); R(cx - 13, 3, 26, 1, C.l); if (!back) { R(cx - (side ? 18 : 10), 11, side ? 10 : 20, 3, '#14141a'); R(cx - 2, 6, 4, 3, '#e0b050'); } }
    if (h === 'ribbon') { const x = side ? cx + 4 : cx + 8; E(x - 5, 6, 5, 4, C.t); E(x + 5, 6, 5, 4, C.t); E(x, 6, 2, 2, C.d); E(x - 6, 5, 2, 1, C.l); }
    if (h === 'bonnet') { R(cx - 11, 5, 22, 4, C.t); for (let x = cx - 11; x < cx + 11; x += 3) E(x + 1, 5, 1, 1, C.t); R(cx - 11, 8, 22, 1, C.f); } },
  acc(P2, a, C) { const { R, E, side, back, cx } = P2; if (back && a !== 'muffler') return;
    if (a === 'glasses') { const xs = side ? [cx - 9] : [cx - 7, cx + 6]; xs.forEach(x => { R(x - 3, 20, 6, 1, C.t); R(x - 3, 25, 6, 1, C.t); R(x - 3, 20, 1, 6, C.t); R(x + 2, 20, 1, 6, C.t); }); if (!side) R(cx - 4, 22, 8, 1, C.t); }
    if (a === 'monocle') { const x = side ? cx - 9 : cx + 6; R(x - 3, 19, 7, 1, C.t); R(x - 3, 26, 7, 1, C.t); R(x - 3, 19, 1, 8, C.t); R(x + 3, 19, 1, 8, C.t); R(x + 3, 27, 1, 8, C.d); }
    if (a === 'flower') { const x = side ? cx + 2 : cx - 10, y = 12; [[-2, 0], [2, 0], [0, -2], [0, 2]].forEach(([a2, b]) => E(x + a2, y + b, 1, 1, C.t)); R(x, y, 1, 1, '#ffe27a'); }
    if (a === 'muffler') { R(cx - (side ? 8 : 10), 33, side ? 16 : 20, 5, C.t); R(cx - (side ? 8 : 10), 33, side ? 16 : 20, 1, C.l); if (!back) R(cx + (side ? 4 : 4), 37, 4, 9, C.t); for (let y = 39; y < 46; y += 2) R(cx + 4, y, 4, 1, C.f); } }
};

/* ---------- 방 안 걷기 ---------- */
const AVSPD = 46;   // 방 픽셀/초
const AVLOCAL = {};   // uid → { x, y, tx, ty, t0, dir }
const AVFAKE = [];    // KP 시험용 손님
function avPosNow(s) { if (!s) return null; const dx = s.tx - s.x, dy = s.ty - s.y, d = Math.hypot(dx, dy); if (d < .5) return { x: s.tx, y: s.ty, moving: false, dir: s.dir || 0 }; const k = Math.min(1, (Date.now() - s.t0) / 1000 * AVSPD / d);
  return { x: s.x + dx * k, y: s.y + dy * k, moving: k < 1, dir: Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : 3) : (dy < 0 ? 2 : 0) }; }
const avHome = () => ({ x: OX + COLS * T / 2, y: FY + ROWS * T * .62 });
/* 이 방에 그릴 아바타들 */
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
    if (!a.cfg) return; const sp = avSprite(a.cfg, a.dir, a.step), S = g._S || 1, w = AVW * .6, h = AVH * .6, x = a.x - w / 2, y = a.y - h + 2 + (a.step % 2 ? -1 : 0);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.fillStyle = 'rgba(20,10,5,.28)'; g.fillRect(Math.round((a.x - 8) * S), Math.round((a.y - 1) * S), Math.round(16 * S), Math.round(3 * S));
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

/* ---------- 아바타 만들기 · 옷장 ---------- */
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
  modal(`<h2 style="color:var(--gold2);margin-top:0">🧍 아바타 꾸미기</h2>
   <div style="display:flex;gap:10px;align-items:flex-end;justify-content:center;background:#2a2018;border-radius:8px;padding:10px 0">${[0, 1, 2, 3].map(d => `<canvas class="avprev" data-d="${d}" width="${AVW}" height="${AVH}" style="width:${d === AVE.dir ? 96 : 56}px;image-rendering:pixelated;cursor:pointer" onclick="AVE.dir=${d};avEditDraw()"></canvas>`).join('')}</div>
   <div class="toggles" style="margin-top:8px">${AV_SLOTS.map(([k, n]) => `<span class="chip ${slot === k ? 'on' : ''}" onclick="AVE.slot='${k}';avEditDraw()">${n}</span>`).join('')}<span class="chip ${slot === 'skin' ? 'on' : ''}" onclick="AVE.slot='skin';avEditDraw()">피부</span></div>
   ${slot === 'skin' ? `<div class="toggles">${SKINS.map(s => `<span class="chip ${c.skin === s ? 'on' : ''}" onclick="AVE.cfg.skin='${s}';avEditDraw()"><span style="display:inline-block;width:16px;height:16px;background:${s};border:1px solid #0006;vertical-align:middle"></span></span>`).join('')}</div>`
    : `<div class="grid g3" style="gap:6px;max-height:240px;overflow:auto">${list.map(it => { const own = avOwns(P, slot, it.id), on = (c[slot] || '') === it.id;
       return `<button class="${on ? 'primary' : ''}" style="padding:4px;text-align:center" onclick="avPick('${slot}','${it.id}')"><canvas class="avitem" data-s="${slot}" data-i="${it.id}" width="${AVW}" height="${AVH}" style="width:40px;image-rendering:pixelated"></canvas><div style="font-size:.78rem">${esc(it.name)}</div><div style="font-size:.72rem" class="muted">${own ? (it.custom ? '✏ 직접 만든 옷' : '가짐') : `🪙 ${it.cost}`}</div></button>`; }).join('')}</div>
     ${colKey && c[slot] !== '' && !(c[slot] || '').startsWith('w:') ? `<div class="row" style="gap:6px;align-items:center;margin-top:6px"><span>색</span><input type="color" value="${c[colKey] || '#888888'}" style="width:60px" onchange="avColor('${slot}',this.value)"><span class="muted" style="font-size:.78rem">${slot === 'hair' || slot === 'eye' ? '무료' : `옷 색 바꾸기는 염료 1 (보유 ${room.dye || 0})`}</span></div>` : ''}`}
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
  const ck = AVCOLKEY[slot]; if (slot !== 'hair' && slot !== 'eye') { const room = myRoom(); if ((room.dye || 0) < 1) { toast('염료가 없어요 (가구점·게임에서 얻어요)'); avEditDraw(); return; } room.dye--; saveP(); }
  AVE.cfg[ck] = v; avEditDraw();
}
function avSave() { const home = P.avatar && P.avatar.home; P.avatar = Object.assign({}, AVE.cfg, home ? { home } : {}); saveP(); closeModal(); toast('아바타를 저장했어요'); render(); }

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
   <p class="muted" style="font-size:.8rem">마네킹이 밑그림으로 깔려요. 옷 부분만 그리면 몸 위에 겹쳐 입혀져요. 옆모습·뒷모습은 없어도 돼요.</p>
   ${[[0, '앞모습'], [1, '옆모습 (왼쪽 보기)'], [2, '뒷모습']].map(([k, n]) => `<div class="item" style="margin:4px 0"><div style="display:flex;align-items:center;gap:8px">${d.pics[k] ? `<img src="${d.pics[k]}" style="height:54px;image-rendering:pixelated;background:#2a2420">` : '<span class="muted" style="width:36px;text-align:center">없음</span>'}<b>${n}</b></div><button class="sm primary" onclick="wfDraw(${k})">🎨 그리기</button></div>`).join('')}
   <div class="row" style="margin-top:10px"><button onclick="WFD=null;closeModal()">취소</button><button class="primary" onclick="wfSave()">저장</button></div>`);
}
function wfRead() { const n = $('#wfN'); if (!n) return; WFD.name = n.value.trim(); WFD.slot = $('#wfS').value; if (WFD.kind === 'kp') { WFD.cost = Math.max(0, +$('#wfC').value || 0); WFD.sell = $('#wfSell').checked; } }
function wfDraw(k) {
  wfRead(); const base = Object.assign({}, AV_DEF, { hair: '', top: '', bottom: '', shoes: '', one: '', hat: '', acc: '' }), dir = k === 1 ? 1 : k === 2 ? 2 : 0;
  const m = document.createElement('canvas'); m.width = AVW; m.height = AVH; m.getContext('2d').drawImage(avSprite(Object.assign(base, { hair: 'short' }), dir, 0), 0, 0);
  dotEdit({ W: AVW, H: AVH, src: WFD.pics[k] || null, key: 'wear_' + (WFD.id || 'new') + '_' + k, title: (WFD.name || '새 옷') + ' · ' + ['앞', '옆', '뒤'][k],
    onSave: url => { if (url) WFD.pics[k] = url; else delete WFD.pics[k]; wfForm(); }, onCancel: () => wfForm() });
  const im = new Image(); im.onload = () => { if (DE) { DE.ref = { img: im, data: null, a: .5, on: true, x: 0, y: 0, s: 1, crisp: true }; deUI(); deDraw(); } }; im.src = m.toDataURL();
}
async function wfSave() {
  wfRead(); const d = WFD; if (!d.name) return toast('이름을 넣어 주세요'); if (!d.pics[0]) return toast('앞모습은 꼭 그려 주세요');
  const doc = { name: d.name.slice(0, 20), slot: d.slot, kind: d.kind, by: d.by || ME.uid, byName: d.byName || PROF.name || '', pics: d.pics, at: d.at || Date.now() };
  if (d.kind === 'kp') Object.assign(doc, { cost: d.cost, sell: d.sell !== false });
  try { const id = d.id || ('w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)); await B.set('wear/' + id, clean(doc)); WFD = null; closeModal(); toast('옷을 저장했어요'); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function wfDel(id) { if (!confirm('이 옷을 지울까요? 입고 있던 사람에게서도 사라져요.')) return; try { await B.del('wear/' + id); } catch (e) { toast('실패: ' + (e.code || e.message)); } }

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
function avPwTry() { const v = ($('#avPw') || {}).value || ''; if (v.trim() === '1117') { try { sessionStorage.setItem('peccata_avpw', '1'); } catch (e) {} render(); } else { sfx('bad'); toast('비밀번호가 달라요'); } }
const AV_OV_GROUPS = () => [['몸', [['body', '기본 몸 · 얼굴형']]], ['눈', Object.entries(AV_ITEMS.eye).map(([k, v]) => ['eye:' + k, v[0]])],
  ['머리 (앞)', Object.entries(AV_ITEMS.hair).map(([k, v]) => ['hairF:' + k, v[0] + ' 앞머리'])], ['머리 (뒤)', Object.entries(AV_ITEMS.hair).map(([k, v]) => ['hairB:' + k, v[0] + ' 뒷머리'])],
  ...['top', 'bottom', 'one', 'shoes', 'hat', 'acc'].map(sl => [AV_SLOTS.find(x => x[0] === sl)[1], Object.entries(AV_ITEMS[sl]).map(([k, v]) => [sl + ':' + k, v[0]])])];
let AVOV_OPEN = '';
function avOvSection() {
  return `<div class="panel"><h2>🎨 기본 그림 고치기</h2><p class="muted" style="margin:0 0 6px;font-size:.82rem">기본 몸·눈·머리·옷 그림을 도트 편집기로 고쳐요. 저장하면 모든 아바타에 적용돼요. 원래 색(명암 그대로)으로 칠한 부분은 피부·머리·옷 색 바꾸기가 계속 돼요.</p>
    ${AV_OV_GROUPS().map(([gn, list]) => `<details ${AVOV_OPEN === gn ? 'open' : ''} ontoggle="if(this.open)AVOV_OPEN='${gn}'"><summary><b>${gn}</b> <span class="muted">${list.filter(([k]) => AVOV[k]).length ? '· 고친 것 ' + list.filter(([k]) => AVOV[k]).length : ''}</span></summary>
      ${list.map(([k, n]) => `<div class="item" style="margin:3px 0"><div style="display:flex;align-items:center;gap:8px"><canvas class="avovp" data-k="${k}" width="${AVW}" height="${AVH}" style="width:32px;image-rendering:pixelated;background:#2a2420"></canvas><span>${esc(n)}${AVOV[k] ? ' <span class="badge live">바꿈</span>' : ''}</span></div>
        <div class="row" style="flex:0 0 auto;gap:4px"><button class="sm" onclick="avOvEdit('${k}')">✏ 고치기</button>${AVOV[k] ? `<button class="sm" onclick="avOvReset('${k}')">↺ 원래대로</button>` : ''}</div></div>`).join('')}</details>`).join('')}</div>`;
}
function avOvCfg(key) { const [k, id] = key.split(':'), c = Object.assign({}, AV_DEF); if (k === 'eye') c.eye = id; if (k === 'hairB' || k === 'hairF') { c.hair = id; c.hairCol = AV_ITEMS.hair[id][2]; }
  if (AV_ITEMS[k] && k !== 'eye' && k !== 'hair') { if (k === 'one') { c.one = id; } else c[k] = id; const ck = { top: 'topCol', bottom: 'botCol', one: 'oneCol', shoes: 'shoeCol', hat: 'hatCol', acc: 'accCol' }[k]; c[ck] = AV_ITEMS[k][id][2]; } return c; }
function avLayerPng(key, view, raw) { const c = document.createElement('canvas'); c.width = AVW; c.height = AVH; const g = c.getContext('2d'), P2 = avP2(g, avOvCfg(key), view, 0); avDrawLayer(P2, key); return raw ? c : c.toDataURL('image/png'); }
let AVOD = null;
function avOvEdit(key) {
  if (!AVOD || AVOD.key !== key) AVOD = { key, pics: Object.assign({}, (AVOV[key] || {}).pics || {}) };
  const nm = (AV_OV_GROUPS().flatMap(g => g[1]).find(x => x[0] === key) || [, key])[1];
  modal(`<h2 style="color:var(--gold2);margin-top:0">🎨 ${esc(nm)} 고치기</h2><p class="muted" style="font-size:.82rem;margin:0 0 6px">오른쪽 방향은 옆모습을 뒤집어 써요. 안 고친 방향은 원래 그림이에요.</p>
    ${[[0, '앞모습'], [1, '옆모습 (왼쪽 보기)'], [2, '뒷모습']].map(([d, n]) => `<div class="item" style="margin:4px 0"><div style="display:flex;align-items:center;gap:8px"><img src="${AVOD.pics[d] || avLayerPng(key, d === 1 ? 1 : d)}" style="height:60px;image-rendering:pixelated;background:#2a2420"><div><b>${n}</b> ${AVOD.pics[d] ? '<span class="badge live">바꿈</span>' : '<span class="muted">원래 그림</span>'}</div></div>
      <div class="row" style="flex:0 0 auto;gap:4px"><button class="sm primary" onclick="avOvDraw('${key}',${d})">🎨 그리기</button>${AVOD.pics[d] ? `<button class="sm" onclick="delete AVOD.pics[${d}];avOvEdit('${key}')">↺</button>` : ''}</div></div>`).join('')}
    <div class="row" style="margin-top:10px"><button onclick="AVOD=null;closeModal()">취소</button><button class="primary" onclick="avOvSave('${key}')">저장</button></div>`);
}
function avOvDraw(key, d) {
  const orig = avLayerPng(key, d), cfg = avOvCfg(key), m = document.createElement('canvas'); m.width = AVW; m.height = AVH; const saved = AVOV[key]; delete AVOV[key]; Object.keys(AVC).forEach(k => delete AVC[k]);
  m.getContext('2d').drawImage(avSprite(cfg, d, 0), 0, 0); if (saved) AVOV[key] = saved; Object.keys(AVC).forEach(k => delete AVC[k]);
  dotEdit({ W: AVW, H: AVH, src: AVOD.pics[d] || orig, orig, key: 'avov_' + key + '_' + d, title: key + ' · ' + ['앞', '옆', '뒤'][d],
    onSave: url => { if (url) AVOD.pics[d] = url; else delete AVOD.pics[d]; avOvEdit(key); }, onCancel: () => avOvEdit(key) });
  const im = new Image(); im.onload = () => { if (DE) { DE.ref = { img: im, data: null, a: .3, on: true, x: 0, y: 0, s: 1, crisp: true }; deUI(); deDraw(); } }; im.src = m.toDataURL();
}
const avOvId = key => key.replace(':', '__');
async function avOvSave(key) {
  const pics = AVOD.pics; try { if (!Object.keys(pics).length) await B.del('avOv/' + avOvId(key)); else await B.set('avOv/' + avOvId(key), { key, pics, at: Date.now() }); AVOD = null; closeModal(); toast(Object.keys(pics).length ? '저장했어요! 모든 아바타에 적용돼요' : '원래 그림으로 돌렸어요'); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function avOvReset(key) { if (!confirm('이 그림을 원래대로 되돌릴까요?')) return; try { await B.del('avOv/' + avOvId(key)); toast('원래대로 되돌렸어요'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
VIEWS.kavatar = () => {
  if (!IS_ADMIN) return '<div class="panel">KP만 볼 수 있어요.</div>';
  let ok = false; try { ok = sessionStorage.getItem('peccata_avpw') === '1'; } catch (e) {}
  if (!ok) return `<div class="panel" style="max-width:360px;margin:30px auto;text-align:center"><h2>🔒 아바타 시험실</h2><p class="muted">비밀번호를 넣어 주세요.</p><input id="avPw" type="password" inputmode="numeric" maxlength="12" style="text-align:center;font-size:1.2rem" onkeydown="if(event.key==='Enter')avPwTry()"><button class="primary" style="width:100%;margin-top:8px" onclick="avPwTry()">들어가기</button></div>`;
  const mine = avCfgOf(P), kpW = WEAR.filter(w => w.kind === 'kp'), plW = WEAR.filter(w => w.kind === 'pl');
  return `<div class="panel"><h2>🧍 아바타 시험실</h2><p class="muted" style="margin:0 0 6px">지금은 <b>${AVCFG.open ? '모두에게 공개 중' : 'KP 화면에서만'}</b> 보여요. 다 둘러보고 괜찮으면 공개하세요.</p>
    <div class="row" style="gap:6px;flex-wrap:wrap"><button class="primary" onclick="avEdit()">${mine ? '✏ 내 아바타 꾸미기' : '＋ 내 아바타 만들기'}</button><button onclick="avFake(${AVFAKE.length ? 0 : 2})">${AVFAKE.length ? '손님 없애기' : '👥 시험용 손님 2명'}</button><button onclick="avFake(2)">🎲 손님 다시 뽑기</button>
    <button class="${AVCFG.open ? 'danger' : ''}" onclick="avOpenToggle()">${AVCFG.open ? '🔒 다시 KP만 보기' : '🌐 모두에게 공개'}</button></div>
    <p class="muted" style="font-size:.8rem;margin:8px 0 4px">아래 방 바닥을 누르면 내 아바타가 걸어가요. 지도에서는 위치 말이 아바타로 바뀌어요.</p>
    <canvas id="avTestCv" class="roomcv" width="${RW * 2}" height="${RH * 2}"></canvas></div>
   <div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">🧥 KP가 만든 옷</h2><button class="primary" style="flex:0 0 auto" onclick="wfNew('one','kp')">＋ 새 옷</button></div>
    ${kpW.map(w => `<div class="item" style="margin:4px 0"><div style="display:flex;align-items:center;gap:8px"><img src="${(w.pics || {})[0] || ''}" style="height:48px;image-rendering:pixelated;background:#2a2420"><div><b>${esc(w.name)}</b><div class="muted" style="font-size:.78rem">${esc((AV_SLOTS.find(s => s[0] === w.slot) || [, ''])[1])} · ${w.cost || 0} 은화${w.sell === false ? ' · 판매 안 함' : ''}</div></div></div><div class="row" style="flex:0 0 auto;gap:4px"><button class="sm" onclick="wfEdit('${w.id}')">고치기</button><button class="sm danger" onclick="wfDel('${w.id}')">지우기</button></div></div>`).join('') || '<p class="muted">아직 없어요. 칭호 보상으로 줄 옷도 여기서 만들어요.</p>'}</div>
   ${avOvSection()}
   ${plW.length ? `<div class="panel"><h2>🎨 PL이 만든 옷 (${plW.length})</h2>${plW.map(w => `<div class="item" style="margin:4px 0"><div style="display:flex;align-items:center;gap:8px"><img src="${(w.pics || {})[0] || ''}" style="height:40px;image-rendering:pixelated;background:#2a2420"><b>${esc(w.name)}</b> <span class="muted">${esc(w.byName || '')}</span></div><button class="sm danger" onclick="wfDel('${w.id}')">지우기</button></div>`).join('')}</div>` : ''}`;
};
async function avOpenToggle() { const v = !AVCFG.open; if (v && !confirm('모든 PL에게 아바타를 공개할까요? 처음 방에 들어오면 아바타 만들기 창이 떠요.')) return; try { await B.set('settings/avatar', { open: v }, true); toast(v ? '모두에게 공개했어요' : 'KP만 보이게 했어요'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
const AVTEST = { items: [], invc: [], wall: 'plain', floor: 'plank', cols: { frame: null }, arc: {}, ow: [], dye: 0 };
function avTestPaint() {
  const cv = document.getElementById('avTestCv'); if (!cv) return; const room = PROF.ho ? myRoom() : hoRoom('__avtest');
  AV_PAINT_OWNER = AVTEST_ROOM; paintRoom(cv, room, {}); AV_PAINT_OWNER = null;
  cv.onclick = ev => { if (!avCfgOf(P)) return toast('먼저 아바타를 만들어 주세요'); const p = cvPos(cv, ev); avWalkTo(AVTEST_ROOM, p.x, p.y); };
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
  modal(`<h2 style="color:var(--gold2);margin-top:0">🧍 아바타가 생겼어요!</h2><p>방 안을 걸어 다니고, 옷을 갈아입을 수 있어요.</p><div class="row"><button onclick="closeModal()">나중에</button><button class="primary" onclick="avEdit()">만들러 가기</button></div>`); } catch (e) {} }, 3000);
