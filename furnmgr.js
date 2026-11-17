/* ================= 가구 관리 · 직접 만든 가구 · 경매 =================
   settings/furn : { cats:[[key,label]...], move:{가구:분류}, hidden:[가구], plMax:5 }
   furn/{id}     : { name, kind:'kp'|'pl', by, byName, wall, w, d, H(도트 높이), wy, cost, cat, sell, pics:{0,1,2}, at, del }
                   → FURN['cf_'+id] 로 등록 (그림은 PNG, 칸 하나 = 가로 64도트)
   auctions/{id} : { fk, name, seller, sname, start, buy, endAt, at, bid:{uid,name,amt,at}|null, n, got, paid }
   progress.holds: { 경매id: 걸어 둔 은화 }  · progress.aucDone: [정산한 경매id]
=================================================================== */
const FCATS_BASE = FCATS.map(x => x.slice());
Object.entries(FURN).forEach(([k, f]) => { f._cat = f.cat; });
let FCFG = { cats: null, move: {}, hidden: [], plMax: 5 }, CFURN = [], AUCS = [], AUC_READY = false;

function furnCfgApply(d) {
  FCFG = Object.assign({ cats: null, move: {}, hidden: [], plMax: 5 }, d || {});
  const cats = (FCFG.cats && FCFG.cats.length ? FCFG.cats : FCATS_BASE).map(x => [x[0], x[1]]);
  FCATS.length = 0; cats.forEach(x => FCATS.push(x));
  Object.entries(FURN).forEach(([k, f]) => { if (f.custom && f.custom.kind === 'pl') return; const base = f.custom ? f.custom.cat : f._cat; f.cat = FCFG.move[k] || base; f.hidden = (FCFG.hidden || []).includes(k) || (f.custom && f.custom.sell === false); });
  if (typeof SHOPTAB !== 'undefined' && !FCATS.some(x => x[0] === SHOPTAB) && !['wp', 'fl', 'dye', 'mine', 'auc'].includes(SHOPTAB)) SHOPTAB = (FCATS[0] || ['bed'])[0];
}

/* ---------- 직접 만든 가구 등록 ---------- */
const CFIMG = {};
function cfImg(url) {
  if (!url) return null; const e = CFIMG[url]; if (e) return e.ok ? e.im : null;
  const im = new Image(); CFIMG[url] = { im }; im.onload = () => { CFIMG[url].ok = true; cfRepaint(); }; im.src = url; return null;
}
let CF_RP = 0; function cfRepaint() { clearTimeout(CF_RP); CF_RP = setTimeout(() => { try { document.querySelectorAll('canvas.fprev').forEach(paintPreview); if (typeof roomAfter === 'function') roomAfter(); } catch (e) {} }, 60); }
function cfRegister(list) {
  Object.keys(FURN).forEach(k => { if (k.startsWith('cf_') && !list.some(d => 'cf_' + d.id === k)) delete FURN[k]; });
  list.forEach(d => {
    const H = Math.max(8, d.H || 96), pics = d.pics || {}, k = 'cf_' + d.id, side = !!pics[1], back = !!pics[2];
    const f = { name: d.name || '이름 없는 가구', cat: d.kind === 'pl' ? '_pl' : (d.cat || (FCATS[0] || ['bed'])[0]), cost: d.cost || 0, hi: true, custom: d, parts: {}, drawHi() {} };
    if (d.wall) Object.assign(f, { wall: true, w: d.w || 1, h: Math.round(H / 2), wy: d.wy != null ? d.wy : Math.max(0, Math.round((WALL_H - 12 - H / 2) / 2)) });
    else { const w = d.w || 1, dd = d.d || 1; f.dims = dir => dir % 2 && side ? { w: dd, d: w, h: Math.round(H / 2) } : { w, d: dd, h: Math.round(H / 2) };
      const dirs = [0]; if (side) dirs.push(1); if (back) dirs.push(2); if (side) dirs.push(3); if (dirs.length > 1) f.dirs = dirs; }
    f._cat = f.cat; FURN[k] = f;
  });
  furnCfgApply(FCFG);
}
/* 장면 그림(세로로 이어 붙인 PNG)에서 지금 장면 하나를 칸 크기에 맞춰 그림 */
const picKey = (pics, dir) => { dir = dir || 0; return dir === 2 && pics[2] ? 2 : dir % 2 && pics[1] ? 1 : 0; };
function stripDraw(g, im, n, ms, x, y, w, h, mirror) {
  n = Math.max(1, n || 1); const fh = im.height / n, fi = n > 1 ? Math.floor(Date.now() / (ms || 220)) % n : 0, S = g._S || 1;
  const X = Math.round(x * S), Y = Math.round(y * S), Wd = Math.round(w * S), Hd = Math.round(h * S);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  if (mirror) { g.translate(X + Wd, Y); g.scale(-1, 1); g.drawImage(im, 0, fi * fh, im.width, fh, 0, 0, Wd, Hd); } else g.drawImage(im, 0, fi * fh, im.width, fh, X, Y, Wd, Hd);
  g.restore();
}
/* drawSprite가 직접 만든 가구를 만나면 여기서 그림 */
function cfDraw(g, f, x, y, dir) {
  const d = f.custom, pics = d.pics || {}; dir = dir || 0; const pk = picKey(pics, dir), im = cfImg(pics[pk]); if (!im) return;
  const dm = dimsOf('cf_' + d.id, dir); stripDraw(g, im, (d.picN || {})[pk], (d.picMs || {})[pk], x, y, dm.w * T, dm.h, dir === 3);
}
/* 방에 움직이는 장면 그림이 있으면 매번 다시 그림 */
function roomHasFrames(room) { return (room.items || []).some(i => { const f = FURN[i.k]; if (!f) return false; const o = f.custom || FOV[i.k]; return o && Object.values(o.picN || {}).some(n => n > 1); }); }
let ORIG_DS = null;
(function () { const _ds = drawSprite; ORIG_DS = _ds; drawSprite = function (g, k, x, y, t, alpha, col, dir, img) {
  const f = FURN[k]; if (!f) return; const ov = !f.custom && ovPic(k, dir);
  if (!f.custom && !ov) return _ds(g, k, x, y, t, alpha, col, dir, img);
  g.save(); if (alpha != null) g.globalAlpha = alpha; if (!g._fr || g._S == null) snapCtx(g, g.getTransform().a || 1);
  if (f.custom) cfDraw(g, f, x, y, dir); else ovDraw(g, k, ov, x, y, col, dir, t); g.restore(); }; })();

/* ================= 기본 가구 그림 덮어쓰기 (KP) =================
   furnOv/{가구} : { pics:{0:앞,1:옆(왼쪽),2:뒤}, at }   안 그린 방향은 원래 그림
   PL이 바꾼 색은 유지: 원래 기본색의 명암 6단계와 똑같은 도트를 고른 색의 명암으로 바꿈 */
let FOV = {};
function ovPic(k, dir) { const o = FOV[k]; if (!o || !o.pics) return null; dir = dir || 0; const pk = dir === 2 ? 2 : dir % 2 ? 1 : 0; return o.pics[pk] ? pk + 1 : null; }   // 1~3 (0이면 없음)
const OVC = {};
function ovRecolored(k, url, col) {
  const im = cfImg(url); if (!im) return null; const defs = defCol(k), cur = Object.assign({}, defs, col || {}), map = {};
  Object.keys(defs).forEach(s => { if (!cur[s] || cur[s].toLowerCase() === defs[s].toLowerCase()) return; const A = ramp(defs[s]), Bm = ramp(cur[s]); ['L', 'l', 't', 'f', 'd', 'o'].forEach(q => { const a = A[q].toLowerCase(); if (!(a in map)) map[a] = Bm[q]; }); });
  if (!Object.keys(map).length) return im;
  const key = url.length + ':' + url.slice(-40) + JSON.stringify(map); if (OVC[key]) return OVC[key];
  const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  const hx = (r, gg, b) => '#' + [r, gg, b].map(v => v.toString(16).padStart(2, '0')).join('');
  for (let i = 0; i < p.length; i += 4) { if (!p[i + 3]) continue; const m = map[hx(p[i], p[i + 1], p[i + 2])]; if (m) { const v = deHex(m); p[i] = v[0]; p[i + 1] = v[1]; p[i + 2] = v[2]; } }
  g.putImageData(d, 0, 0); return OVC[key] = c;
}
function ovDraw(g, k, pk1, x, y, col, dir, t) {
  const o = FOV[k], pk = pk1 - 1, im = ovRecolored(k, o.pics[pk], col); if (!im) return; const dm = dimsOf(k, dir);
  stripDraw(g, im, (o.picN || {})[pk], (o.picMs || {})[pk], x, y, dm.w * T, dm.h, dir === 3);
  if (o.anim !== false) ovMotion(g, k, x, y, col, dir, t);
}
/* 원래 가구에서 움직이는 부분(불꽃·김 등)만 찾아서 겹쳐 그림 */
const OVMASK = {};
function ovMaskOf(k, dir) {
  const key = k + '|' + (dir || 0); if (key in OVMASK) return OVMASK[key];
  const dm = dimsOf(k, dir), w = dm.w * 64, h = Math.max(2, Math.round(dm.h * 2)), c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; snapCtx(g, 2); let base = null; const diff = new Uint8Array(w * h); let any = false;
  for (let t = 0; t < 48; t++) { g.clearRect(0, 0, w, h); try { ORIG_DS(g, k, 0, 0, t, null, null, dir); } catch (e) { break; } const d = g.getImageData(0, 0, w, h).data;
    if (!base) { base = d; continue; } for (let i = 0, j = 0; i < d.length; i += 4, j++) if (!diff[j] && (d[i] !== base[i] || d[i + 1] !== base[i + 1] || d[i + 2] !== base[i + 2] || d[i + 3] !== base[i + 3])) { diff[j] = 1; any = true; } }
  if (!any) return OVMASK[key] = null;
  const m = document.createElement('canvas'); m.width = w; m.height = h; const mg = m.getContext('2d'), md = mg.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { let on = false; for (let dy = -1; dy <= 1 && !on; dy++) for (let dx = -1; dx <= 1 && !on; dx++) { const X = x + dx, Y = y + dy; if (X >= 0 && Y >= 0 && X < w && Y < h && diff[Y * w + X]) on = true; } if (on) md.data[(y * w + x) * 4 + 3] = 255; }
  mg.putImageData(md, 0, 0); return OVMASK[key] = m;
}
const ovHasAnim = k => ovDirs(k).some(([d]) => !!ovMaskOf(k, d)) || (FURN[k] && FURN[k].dirs && !!ovMaskOf(k, 3));
let OVOFF = null;
function ovMotion(g, k, x, y, col, dir, t) {
  const m = ovMaskOf(k, dir); if (!m) return; if (!OVOFF) OVOFF = document.createElement('canvas'); const c = OVOFF; if (c.width !== m.width || c.height !== m.height) { c.width = m.width; c.height = m.height; }
  const og = c.getContext('2d'); og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = 'source-over'; og.clearRect(0, 0, c.width, c.height); og.imageSmoothingEnabled = false;
  snapCtx(og, 2); ORIG_DS(og, k, 0, 0, t || 0, null, col, dir); og.setTransform(1, 0, 0, 1, 0, 0); og.globalCompositeOperation = 'destination-in'; og.drawImage(m, 0, 0); og.globalCompositeOperation = 'source-over';
  const dm = dimsOf(k, dir), S = g._S || 1; g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false; g.drawImage(c, Math.round(x * S), Math.round(y * S), Math.round(dm.w * T * S), Math.round(dm.h * S)); g.restore();
}
/* 장면 그림 미리보기 (첫 장면만) */
function stripThumb(url, n, hgt) { n = Math.max(1, n || 1); return `<span style="display:inline-block;height:${hgt}px;width:${hgt}px;background:#2a2420 url('${url}') no-repeat center top/contain;image-rendering:pixelated;${n > 1 ? `background-size:auto ${hgt * n}px;` : ''}"></span>${n > 1 ? `<span class="badge" style="margin-left:-14px">${n}</span>` : ''}`; }
/* 원래 그림을 도트 그림(PNG)으로 */
function ovOrigPng(k, dir) {
  const dm = dimsOf(k, dir), w = dm.w * 64, h = Math.max(2, Math.round(dm.h * 2)), c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; snapCtx(g, 2); ORIG_DS(g, k, 0, 0, 0, null, null, dir);
  const d = g.getImageData(0, 0, w, h); for (let i = 0; i < d.data.length; i += 4) if (d.data[i + 3] < 128) d.data[i + 3] = 0; else d.data[i + 3] = 255;
  g.putImageData(d, 0, 0); return c.toDataURL('image/png');
}
let OVD = null;
const ovDirs = k => { const f = FURN[k]; return f.wall || !f.dirs ? [[0, '그림']] : [[0, '앞모습'], [1, '옆모습 (왼쪽 보기)'], [2, '뒷모습']]; };
function ovEdit(k) {
  const f = FURN[k]; if (!f || f.custom) return; if (!OVD || OVD.k !== k) { const o = FOV[k] || {}; OVD = { k, pics: Object.assign({}, o.pics || {}), picN: Object.assign({}, o.picN || {}), picMs: Object.assign({}, o.picMs || {}), anim: o.anim !== false }; }
  const hasAnim = ovHasAnim(k);
  modal(`<h2 style="color:var(--gold2);margin-top:0">🎨 ${esc(f.name)} 그림 바꾸기</h2>
   <p class="muted" style="font-size:.85rem;margin:0 0 6px">원래 그림을 불러와서 고침. 저장하면 이미 놓인 것까지 모든 방에서 바뀜. 안 그린 방향은 원래 그림.${Object.keys(f.parts || {}).length ? '<br>PL이 바꾼 색도 유지됨. 원래 색(명암 그대로)으로 칠한 부분이 바뀜.' : ''}${f.pic ? '<br>⚠ 이 가구는 PL이 넣은 그림 대신 이 그림이 보임.' : ''}</p>
   ${ovDirs(k).map(([d, n]) => { const s = dimsOf(k, d); return `<div class="item" style="margin:4px 0"><div style="display:flex;align-items:center;gap:8px">${OVD.pics[d] ? stripThumb(OVD.pics[d], OVD.picN[d], 56) : `<span style="width:56px;text-align:center">${fprev(k, null, 56, d === 1 ? 1 : d)}</span>`}<div><b>${n}</b> ${OVD.pics[d] ? '<span class="badge live">바꿈</span>' : '<span class="muted">원래 그림</span>'}<div class="muted" style="font-size:.75rem">${s.w * 64}×${Math.round(s.h * 2)}${(OVD.picN[d] || 1) > 1 ? ` · 장면 ${OVD.picN[d]}장` : ''}</div></div></div>
     <div class="row" style="flex:0 0 auto;gap:4px"><button class="sm primary" onclick="ovDraw1('${k}',${d})">🎨 그리기</button>${OVD.pics[d] ? `<button class="sm" onclick="delete OVD.pics[${d}];delete OVD.picN[${d}];delete OVD.picMs[${d}];ovEdit('${k}')">↺</button>` : ''}</div></div>`; }).join('')}
   ${hasAnim ? `<label style="display:block;margin-top:8px"><input type="checkbox" style="width:auto;margin:0 6px 0 0;vertical-align:middle" ${OVD.anim ? 'checked' : ''} onchange="OVD.anim=this.checked"> ✨ 원래 움직임(불꽃·김 등) 겹치기</label><p class="muted" style="font-size:.75rem;margin:2px 0 0">원래 움직임 겹치기 · 모양이 많이 다르면 끄기</p>` : ''}
   <div class="row" style="margin-top:10px"><button onclick="OVD=null;closeModal()">취소</button>${FOV[k] ? `<button class="danger" onclick="ovReset('${k}')">전부 원래대로</button>` : ''}<button class="primary" onclick="ovSave('${k}')">저장</button></div>`);
  document.querySelectorAll('#mbox canvas.fprev').forEach(c => { c.style.imageRendering = 'pixelated'; paintPreview(c); });
}
function ovDraw1(k, d) {
  const s = dimsOf(k, d), f = FURN[k];
  const orig = ovOrigPng(k, d);
  dotEdit({ W: s.w * 64, H: Math.round(s.h * 2), src: OVD.pics[d] || orig, orig, key: 'ov_' + k + '_' + d, n: OVD.pics[d] ? OVD.picN[d] || 1 : 1, ms: OVD.picMs[d], foot: f.wall ? 0 : s.d * 32 + 8, title: f.name + ' · ' + ovDirs(k).find(x => x[0] === d)[1],
    onSave: (url, m) => { if (url) { OVD.pics[d] = url; OVD.picN[d] = m.n; OVD.picMs[d] = m.ms; } else { delete OVD.pics[d]; delete OVD.picN[d]; delete OVD.picMs[d]; } ovEdit(k); }, onCancel: () => ovEdit(k) });
}
async function ovSave(k) {
  const pics = OVD.pics; if (!Object.keys(pics).length) return ovReset(k, true);
  if (JSON.stringify(pics).length > 900000) return toast('그림이 너무 큼');
  const picN = {}, picMs = {}; Object.keys(pics).forEach(d => { picN[d] = OVD.picN[d] || 1; picMs[d] = OVD.picMs[d] || 220; });
  try { await B.set('furnOv/' + k, { pics, picN, picMs, anim: OVD.anim !== false, at: Date.now() }); OVD = null; closeModal(); toast('그림 변경 완료! 모든 방에 적용됨'); } catch (e) { toast('저장 실패: ' + (e.code || e.message)); }
}
async function ovReset(k, quiet) {
  if (!quiet && !confirm('이 가구를 원래 그림으로 되돌릴까?')) return;
  try { await B.del('furnOv/' + k); OVD = null; closeModal(); toast('원래 그림으로 되돌림'); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}

/* ---------- 구독 ---------- */
function furnOnAuth(sub) {
  AUC_READY = false; AUCS = [];
  sub(B.onDoc('settings/furn', d => { furnCfgApply(d); softRender(); }));
  sub(B.onCol('furn', l => { CFURN = l; cfRegister(l); softRender(); }));
  sub(B.onCol('furnOv', l => { FOV = {}; l.forEach(d => FOV[d.id] = d); cfRepaint(); softRender(); }));
  sub(B.onCol('auctions', l => { AUCS = l.sort((a, b) => (a.endAt || 0) - (b.endAt || 0)); AUC_READY = true; aucSync(); aucRefresh(); }));
}
setInterval(() => { if (AUC_READY) { aucSync(); if (document.getElementById('aucList')) aucRefresh(); } }, 10000);

/* ================= 가구 만들기 (KP · PL 공통) ================= */
let CFD = null;   // 만들고 있는 가구
const myCf = () => CFURN.filter(d => d.by === ME.uid && d.kind === 'pl' && !d.del);
function cfNew(kind) {
  if (kind === 'pl' && myCf().length >= (FCFG.plMax || 5)) return toast(`가구는 ${FCFG.plMax || 5}개까지 만들 수 있음`);
  CFD = { kind, name: '', wall: false, w: 1, d: 1, H: 96, wy: null, cost: 50, cat: (FCATS[0] || ['bed'])[0], sell: true, pics: {} }; cfForm();
}
function cfEdit(id) { const d = CFURN.find(x => x.id === id); if (!d) return; CFD = JSON.parse(JSON.stringify(d)); CFD.pics = CFD.pics || {}; cfForm(); }
function cfFormRead() {
  const v = id => { const e = document.getElementById(id); return e ? e.value : null; };
  if (!document.getElementById('cfName')) return; CFD.name = v('cfName').trim(); CFD.wall = v('cfWall') === '1'; CFD.w = +v('cfW') || 1; CFD.d = +(v('cfD') || 1) || 1; CFD.H = +v('cfH') || 96;
  if (CFD.kind === 'kp') { CFD.cost = Math.max(0, +v('cfCost') || 0); CFD.cat = v('cfCat'); CFD.sell = document.getElementById('cfSell').checked; }
}
function cfDirs() { return CFD.wall ? [[0, '그림']] : [[0, '앞모습'], [1, '옆모습 (왼쪽 보기)'], [2, '뒷모습']]; }
function cfSize(dir) { return { W: (dir === 1 ? CFD.d : CFD.w) * 64, H: CFD.H }; }
function cfForm() {
  const d = CFD, maxH = d.wall ? (WALL_H - 12) * 2 : 300, kp = d.kind === 'kp';
  modal(`<h2 style="color:var(--gold2);margin-top:0">✏ ${d.id ? '가구 고치기' : '가구 만들기'}</h2>
   <label class="f">이름</label><input id="cfName" value="${esc(d.name)}" maxlength="24" placeholder="예: 할머니의 재봉 상자">
   <div class="row" style="gap:6px;margin-top:6px"><div style="flex:1"><label class="f">놓일 자리</label><select id="cfWall" onchange="cfFormRead();cfForm()"><option value="0" ${d.wall ? '' : 'selected'}>바닥</option><option value="1" ${d.wall ? 'selected' : ''}>벽</option></select></div>
    <div style="flex:1"><label class="f">가로 칸</label><select id="cfW" onchange="cfFormRead();cfForm()">${[1, 2, 3, 4].map(n => `<option ${d.w === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    ${d.wall ? '' : `<div style="flex:1"><label class="f">깊이 칸</label><select id="cfD" onchange="cfFormRead();cfForm()">${[1, 2, 3].map(n => `<option ${d.d === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`}</div>
   <label class="f">높이 (도트) <span class="muted" id="cfHv">${d.H}</span></label><input id="cfH" type="range" min="16" max="${maxH}" step="2" value="${Math.min(maxH, d.H)}" oninput="$('#cfHv').textContent=this.value" onchange="cfFormRead();cfForm()">
   <p class="muted" style="font-size:.78rem;margin:2px 0 6px">칸 하나는 가로 64도트. ${d.wall ? '벽 높이는 최대 ' + maxH + '도트.' : '초록 점선 안이 바닥에 닿는 부분.'}</p>
   ${kp ? `<div class="row" style="gap:6px"><div style="flex:1"><label class="f">가격</label><input id="cfCost" type="number" min="0" value="${d.cost || 0}"></div><div style="flex:1"><label class="f">분류</label><select id="cfCat">${FCATS.map(([k, v]) => `<option value="${k}" ${d.cat === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div></div>
    <label style="display:block;margin-top:6px"><input type="checkbox" style="width:auto;margin:0 6px 0 0;vertical-align:middle" id="cfSell" ${d.sell !== false ? 'checked' : ''}> 가구점에서 팔기</label>` : ''}
   <div style="margin-top:8px">${cfDirs().map(([k, n]) => { const s = cfSize(k); return `<div class="item" style="margin:4px 0"><div style="display:flex;align-items:center;gap:8px">${d.pics[k] ? stripThumb(d.pics[k], (d.picN || {})[k], 48) : '<span class="muted" style="width:48px;text-align:center">없음</span>'}<div><b>${n}</b>${k === 0 ? '' : ' <span class="muted">(없어도 됨)</span>'}<div class="muted" style="font-size:.75rem">${s.W}×${s.H}${((d.picN || {})[k] || 1) > 1 ? ` · 장면 ${d.picN[k]}장` : ''}</div></div></div>
     <div class="row" style="flex:0 0 auto;gap:4px"><button class="sm primary" onclick="cfDraw1(${k})">🎨 그리기</button>${d.pics[k] && k ? `<button class="sm" onclick="delete CFD.pics[${k}];cfForm()">✕</button>` : ''}</div></div>`; }).join('')}</div>
   <p class="muted" style="font-size:.78rem">옆모습 = 4방향 회전 · 장면 추가 = 움직이는 가구 (최대 4장)</p>
   <div class="row" style="margin-top:10px"><button onclick="CFD=null;closeModal();${kp ? "go('kfurn')" : 'openFurnShop()'}">취소</button><button class="primary" onclick="cfSave()">저장</button></div>`);
}
function cfDraw1(k) {
  cfFormRead(); const s = cfSize(k);
  CFD.picN = CFD.picN || {}; CFD.picMs = CFD.picMs || {};
  dotEdit({ W: s.W, H: s.H, src: CFD.pics[k] || null, key: 'cf_' + (CFD.id || 'new') + '_' + k, n: CFD.picN[k] || 1, ms: CFD.picMs[k], foot: CFD.wall ? 0 : (k === 1 ? CFD.w : CFD.d) * 64 / 2 + 8, title: (CFD.name || '새 가구') + ' · ' + cfDirs().find(x => x[0] === k)[1],
    onSave: (url, m) => { if (url) { CFD.pics[k] = url; CFD.picN[k] = m.n; CFD.picMs[k] = m.ms; } else { delete CFD.pics[k]; delete CFD.picN[k]; delete CFD.picMs[k]; } cfForm(); }, onCancel: () => cfForm() });
}
async function cfSave() {
  cfFormRead(); const d = CFD; if (!d.name) return toast('이름을 넣기'); if (!d.pics[0]) return toast(d.wall ? '그림을 그리기' : '앞모습은 꼭 그리기');
  // 크기가 바뀌었으면 맞지 않는 그림은 다시 그려야 함
  const bad = []; await Promise.all(Object.keys(d.pics).map(k => new Promise(r => { const im = new Image(); im.onload = () => { const s = cfSize(+k), n = ((d.picN || {})[k] || 1); if (im.width !== s.W || im.height !== s.H * n) bad.push(+k); r(); }; im.onerror = r; im.src = d.pics[k]; })));
  if (bad.length) { if (!confirm('크기를 바꿔서 그림 크기가 맞지 않음. 그림을 새 크기에 맞춰 늘리지 않고 아래에 맞춰 둘까?')) return; for (const k of bad) d.pics[k] = await cfRefit(d.pics[k], cfSize(k), (d.picN || {})[k] || 1); }
  const doc = { name: d.name.slice(0, 24), kind: d.kind, by: d.by || ME.uid, byName: d.byName || PROF.name || '', wall: !!d.wall, w: d.w, d: d.wall ? 0 : d.d, H: d.H, wy: d.wy == null ? null : d.wy, pics: d.pics, picN: d.picN || {}, picMs: d.picMs || {}, at: d.at || Date.now(), upd: Date.now() };
  if (d.kind === 'kp') Object.assign(doc, { cost: d.cost, cat: d.cat, sell: d.sell !== false });
  const size = JSON.stringify(doc).length; if (size > 900000) return toast('그림이 너무 큼. 크기를 줄이기');
  try { const id = d.id || ('f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)); await B.set('furn/' + id, clean(doc));
    if (!d.id && d.kind === 'pl') { const room = myRoom(); room.invc.push({ id: rmId(), k: 'cf_' + id, col: null, rc: 0 }); saveP(); }
    CFD = null; closeModal(); toast(d.id ? '수정 완료' : (d.kind === 'pl' ? '가구를 만듦! 보관함에 넣어 둠' : '가구를 만듦')); if (d.kind === 'kp') go('kfurn'); else openFurnShop();
  } catch (e) { toast('저장 실패: ' + (e.code || e.message)); }
}
function cfRefit(url, s, n) { n = n || 1; return new Promise(r => { const im = new Image(); im.onload = () => { const fh = im.height / n, c = document.createElement('canvas'); c.width = s.W; c.height = s.H * n; const g = c.getContext('2d');
  for (let i = 0; i < n; i++) g.drawImage(im, 0, i * fh, im.width, fh, Math.round((s.W - im.width) / 2), i * s.H + s.H - fh, im.width, fh); r(c.toDataURL('image/png')); }; im.src = url; }); }
async function cfDelete(id) {
  const d = CFURN.find(x => x.id === id); if (!d) return;
  if (IS_ADMIN && d.kind === 'kp') { if (!confirm('이 가구를 지울까? 이미 가진 사람의 방에서도 사라짐.')) return; try { await B.del('furn/' + id); toast('삭제 완료'); } catch (e) { toast('실패: ' + (e.code || e.message)); } return; }
  if (!confirm('목록에서 지울까? (경매로 산 사람의 가구는 그대로 남음)')) return;
  try { await B.set('furn/' + id, { del: true }, true); toast('삭제 완료'); openFurnShop(); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
function cfTake(id) { const room = myRoom(); room.invc.push({ id: rmId(), k: 'cf_' + id, col: null, rc: 0 }); saveP(); sfx('ok'); toast('보관함에 하나 더 넣음'); openFurnShop(); }

/* ---------- 가구점 안 「내가 만든 가구」 · 「경매장」 ---------- */
function mineHtml() {
  const l = myCf(), max = FCFG.plMax || 5;
  return `<p class="muted" style="margin:4px 0 8px">직접 그린 가구는 무료로 내 방에 놓을 수 있고, 경매에 복제품을 올릴 수 있음. (${l.length}/${max})</p>
   <button class="primary" style="width:100%" onclick="cfNew('pl')" ${l.length >= max ? 'disabled' : ''}>✏ 새 가구 그리기</button>
   ${l.map(d => `<div class="item" style="margin:6px 0"><div style="width:84px;text-align:center;flex:0 0 84px">${fprev('cf_' + d.id, null, 84)}</div>
     <div style="flex:1;margin-left:8px"><b>${esc(d.name)}</b><span class="muted"> (${d.wall ? d.w + '칸 벽' : d.w + '×' + d.d + '칸'})</span></div>
     <div style="display:flex;flex-direction:column;gap:4px"><button class="sm" onclick="cfTake('${d.id}')">📦 꺼내기</button><button class="sm" onclick="closeModal();cfEdit('${d.id}')">✏ 고치기</button><button class="sm" onclick="aucNew('${d.id}')">🔨 경매</button><button class="sm danger" onclick="cfDelete('${d.id}')">지우기</button></div></div>`).join('')}`;
}
(function () { const _open = openFurnShop; openFurnShop = function () {
  _open(); const tg = document.querySelector('#mbox .toggles'); if (!tg) return;
  tg.insertAdjacentHTML('beforeend', `<span class="chip ${SHOPTAB === 'mine' ? 'on' : ''}" onclick="SHOPTAB='mine';openFurnShop()">✏ 내가 만든 가구</span><span class="chip ${SHOPTAB === 'auc' ? 'on' : ''}" onclick="SHOPTAB='auc';openFurnShop()">🔨 경매장${aucLiveN() ? ' ' + aucLiveN() : ''}</span>`);
  if (SHOPTAB === 'mine' || SHOPTAB === 'auc') { const box = tg.nextElementSibling; if (box) box.innerHTML = SHOPTAB === 'mine' ? mineHtml() : `<div id="aucList">${aucHtml()}</div>`; document.querySelectorAll('#mbox canvas.fprev').forEach(c => { c.style.imageRendering = 'pixelated'; paintPreview(c); }); }
}; })();

/* ================= 경매 ================= */
const aucEnded = a => Date.now() >= (a.endAt || 0);
const aucLiveN = () => AUCS.filter(a => !aucEnded(a)).length;
const aucLeft = a => { const s = Math.max(0, Math.round(((a.endAt || 0) - Date.now()) / 1000)); return s >= 86400 ? `${Math.floor(s / 86400)}일 ${Math.floor(s % 86400 / 3600)}시간` : s >= 3600 ? `${Math.floor(s / 3600)}시간 ${Math.floor(s % 3600 / 60)}분` : s >= 60 ? `${Math.floor(s / 60)}분` : `${s}초`; };
function aucNew(fid) {
  const d = CFURN.find(x => x.id === fid); if (!d) return;
  modal(`<h2 style="color:var(--gold2);margin-top:0">🔨 경매에 올리기</h2><div style="text-align:center">${fprev('cf_' + fid, null, 120)}</div><p style="text-align:center;margin:4px 0"><b>${esc(d.name)}</b></p>
   <p class="muted" style="font-size:.85rem">복제품 판매 · 원본 유지 · 최고가 낙찰</p>
   <label class="f">시작가</label><input id="auS" type="number" min="1" value="20">
   <label class="f">즉시 구매가 (0 = 없음)</label><input id="auB" type="number" min="0" value="0">
   <label class="f">기간</label><select id="auT"><option value="3600000">1시간</option><option value="21600000">6시간</option><option value="86400000" selected>1일</option><option value="259200000">3일</option></select>
   <div class="row" style="margin-top:12px"><button onclick="openFurnShop()">취소</button><button class="primary" onclick="aucCreate('${fid}')">올리기</button></div>`);
  document.querySelectorAll('#mbox canvas.fprev').forEach(c => { c.style.imageRendering = 'pixelated'; paintPreview(c); });
}
async function aucCreate(fid) {
  const d = CFURN.find(x => x.id === fid), start = Math.max(1, parseInt($('#auS').value) || 1), buy = Math.max(0, parseInt($('#auB').value) || 0), dur = +$('#auT').value;
  if (buy && buy <= start) return toast('즉시 구매가는 시작가보다 높아야 함');
  try { await B.add('auctions', { fk: fid, name: d.name, seller: ME.uid, sname: PROF.name || '', start, buy, endAt: Date.now() + dur, at: Date.now(), bid: null, n: 0, got: false, paid: false });
    sfx('ok'); toast('경매에 올림!'); SHOPTAB = 'auc'; openFurnShop(); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
function aucHtml() {
  const now = Date.now(), live = AUCS.filter(a => !aucEnded(a)), done = AUCS.filter(a => aucEnded(a) && now - a.endAt < 3 * 864e5).reverse();
  const row = a => { const mine = a.seller === ME.uid, top = a.bid && a.bid.uid === ME.uid, ended = aucEnded(a), cur = a.bid ? a.bid.amt : 0, min = a.bid ? cur + 1 : a.start;
    return `<div class="item" style="margin:6px 0;align-items:flex-start"><div style="width:76px;text-align:center;flex:0 0 76px">${FURN['cf_' + a.fk] ? fprev('cf_' + a.fk, null, 76) : '❔'}</div>
     <div style="flex:1;margin-left:8px"><b>${esc(a.name)}</b> <span class="muted" style="font-size:.78rem">by ${esc(a.sname || '?')}</span>
      <div style="font-size:.85rem">${a.bid ? `현재 <b style="color:var(--gold2)">${cur}</b> 은화 · ${esc(a.bid.name || '')}${top ? ' (나)' : ''}` : `시작가 <b>${a.start}</b> 은화`}${a.buy ? ` · 즉시 ${a.buy}` : ''}</div>
      <div class="muted" style="font-size:.78rem">${ended ? (a.bid ? `낙찰 · ${esc(a.bid.name || '')} ${cur}은화` : '유찰') : `⏳ ${aucLeft(a)} 남음 · 입찰 ${a.n || 0}번`}</div>
      ${!ended && !mine ? `<div class="row" style="gap:4px;margin-top:4px"><input id="ab_${a.id}" type="number" min="${min}" value="${min}" style="width:80px"><button class="sm primary" onclick="aucBid('${a.id}')">입찰</button>${a.buy && cur < a.buy ? `<button class="sm" onclick="aucBid('${a.id}',true)">즉시 ${a.buy}</button>` : ''}</div>` : ''}
      ${mine && !a.bid ? `<button class="sm" style="margin-top:4px" onclick="aucCancel('${a.id}')">${ended ? '목록에서 치우기' : '경매 취소'}</button>` : ''}</div></div>`; };
  const held = Object.values(P.holds || {}).reduce((s, v) => s + v, 0);
  return `<p class="muted" style="margin:4px 0">입찰하면 그 은화가 묶임. 더 높은 입찰이 나오면 바로 돌려받음.${held ? ` <b>묶인 은화 ${held}</b>` : ''}</p>
   ${live.length ? live.map(row).join('') : '<p class="muted">지금 열린 경매가 없음.</p>'}${done.length ? `<details style="margin-top:8px"><summary class="muted">끝난 경매 (${done.length})</summary>${done.map(row).join('')}</details>` : ''}`;
}
function aucRefresh() {
  const el = document.getElementById('aucList'); if (el) { const y = el.parentElement ? el.parentElement.scrollTop : 0; const foc = document.activeElement && document.activeElement.id && document.activeElement.id.startsWith('ab_'); if (foc) return; el.innerHTML = aucHtml(); if (el.parentElement) el.parentElement.scrollTop = y; document.querySelectorAll('#aucList canvas.fprev').forEach(c => { c.style.imageRendering = 'pixelated'; paintPreview(c); }); }
  if (tab === 'kfurn') softRender();
}
async function aucBid(id, now) {
  const a = AUCS.find(x => x.id === id); if (!a) return; if (aucEnded(a)) return toast('이미 끝난 경매');
  let amt = now ? a.buy : parseInt(($('#ab_' + id) || {}).value) || 0; const cur = a.bid ? a.bid.amt : 0, min = a.bid ? cur + 1 : a.start;
  if (amt < min) return toast(`${min} 은화 이상 불러야 함`); if (a.buy && amt > a.buy) amt = a.buy;
  const hold = (P.holds || {})[id] || 0, need = amt - hold;
  if (P.coins < need) return toast('은화가 부족');
  const ok = await B.tx('auctions/' + id, x => { if (!x || Date.now() >= x.endAt) return undefined; const c = x.bid ? x.bid.amt : 0; if (x.bid ? amt <= c : amt < x.start) return undefined;
    x.bid = { uid: ME.uid, name: PROF.name || '', amt, at: Date.now() }; x.n = (x.n || 0) + 1; if (x.buy && amt >= x.buy) x.endAt = Date.now(); return x; }).catch(e => { toast('실패: ' + (e.code || e.message)); return null; });
  if (ok === null) return; if (!ok) return toast('그 사이에 더 높은 입찰이 있었음');
  P.holds = P.holds || {}; LOG_W = 'auction'; P.coins -= need; logAct(-need); LOG_W = null; P.holds[id] = amt; P.holdT = P.holdT || {}; P.holdT[id] = Date.now(); saveP(); sfx('coin');
  toast(now || (a.buy && amt >= a.buy) ? '즉시 구매! 곧 보관함에 들어옴' : `${amt} 은화로 입찰 완료`); if (SHOPTAB === 'auc') openFurnShop();
}
async function aucCancel(id) { if (!confirm('이 경매를 치울까?')) return; try { await B.del('auctions/' + id); toast('치움'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
/* 내 몫 정산: 밀린 입찰 환불 · 낙찰품 받기 · 판매 대금 받기 */
let AUC_BUSY = false;
async function aucSync() {
  if (!P || !ME || !AUC_READY || AUC_BUSY) return; AUC_BUSY = true;
  try {
    let ch = false; P.holds = P.holds || {}; P.aucDone = P.aucDone || [];
    for (const [id, amt] of Object.entries(P.holds)) {
      const a = AUCS.find(x => x.id === id);
      if (!a || !a.bid || a.bid.uid !== ME.uid) { if (Date.now() - ((P.holdT || {})[id] || 0) < 20000) continue; delete P.holds[id]; if (P.holdT) delete P.holdT[id]; LOG_W = 'auction'; P.coins += amt; logAct(amt); LOG_W = null; ch = true; toast(`🔨 「${a ? a.name : '경매'}」에서 더 높은 입찰이 나와 ${amt} 은화를 돌려받음`); continue; }
      if (aucEnded(a) && !P.aucDone.includes(id)) { const room = myRoom(); room.invc.push({ id: rmId(), k: 'cf_' + a.fk, col: null, rc: 0 }); delete P.holds[id]; P.aucDone.push(id); ch = true; sfx('ok');
        modal(`<h2 style="color:var(--gold2);margin-top:0">🔨 낙찰!</h2><div style="text-align:center">${fprev('cf_' + a.fk, null, 120)}</div><p style="text-align:center"><b>${esc(a.name)}</b>을(를) ${a.bid.amt} 은화에 구입 완료.<br>보관함에 넣어 둠.</p><button class="primary" style="width:100%" onclick="closeModal();render()">확인</button>`);
        document.querySelectorAll('#mbox canvas.fprev').forEach(c => { c.style.imageRendering = 'pixelated'; paintPreview(c); });
        B.update('auctions/' + id, { got: true }).catch(() => {}); }
    }
    for (const a of AUCS) if (a.seller === ME.uid && aucEnded(a) && a.bid && !P.aucDone.includes('s_' + a.id)) {
      P.aucDone.push('s_' + a.id); LOG_W = 'auction'; P.coins += a.bid.amt; P.earned = (P.earned || 0) + a.bid.amt; logAct(a.bid.amt); LOG_W = null; ch = true; sfx('coin');
      toast(`🔨 「${a.name}」이(가) ${a.bid.amt} 은화에 판매 완료!`); B.update('auctions/' + a.id, { paid: true }).catch(() => {}); }
    if (P.aucDone.length > 200) P.aucDone = P.aucDone.slice(-200);
    if (ch) saveP();
  } finally { AUC_BUSY = false; }
}

/* ================= KP: 가구 관리 ================= */
let KF_OPEN = '';
VIEWS.kfurn = () => {
  if (!IS_ADMIN) return '<div class="panel">KP만 볼 수 있음.</div>';
  const kp = CFURN.filter(d => d.kind === 'kp'), pl = CFURN.filter(d => d.kind === 'pl' && !d.del), all = Object.entries(FURN).filter(([k, f]) => !(f.custom && f.custom.kind === 'pl'));
  const live = AUCS.filter(a => !aucEnded(a)), old = AUCS.filter(a => aucEnded(a) && (!a.bid || (a.got && a.paid)));
  return `<div class="panel"><h2>🗂 가구점 분류</h2><p class="muted" style="margin:0 0 6px">▲▼ 순서 변경 · 삭제 분류 가구 → 첫 분류</p>
    <div id="kfCats">${FCATS.map(([k, v], i) => `<div class="row" style="gap:4px;margin:3px 0"><input data-k="${k}" value="${esc(v)}" style="flex:1"><button class="sm" onclick="kfCatMove(${i},-1)">▲</button><button class="sm" onclick="kfCatMove(${i},1)">▼</button><button class="sm danger" onclick="kfCatDel(${i})">🗑</button></div>`).join('')}</div>
    <div class="row" style="gap:6px;margin-top:6px"><button onclick="kfCatAdd()">+ 분류 추가</button><button class="primary" onclick="kfCatSave()">분류 저장</button><button onclick="if(confirm('처음 분류로 되돌릴까?'))B.set('settings/furn',{cats:null},true)">기본으로</button></div></div>
   <div class="panel"><h2>🪑 가구 옮기기 · 숨기기</h2><p class="muted" style="margin:0 0 6px">숨김 = 가구점 미표시 (보유분 유지) · 🎨 기본 그림 수정</p>
    ${FCATS.map(([ck, cv]) => { const items = all.filter(([k, f]) => f.cat === ck); return `<details ${KF_OPEN === ck ? 'open' : ''} ontoggle="if(this.open)KF_OPEN='${ck}'"><summary><b>${esc(cv)}</b> <span class="muted">${items.length}</span></summary>
      ${items.map(([k, f]) => `<div class="item" style="margin:3px 0"><div style="display:flex;align-items:center;gap:6px"><span style="width:44px;text-align:center">${fprev(k, null, 40)}</span><span>${esc(f.name)}${f.custom ? ' ✏' : ''}${FOV[k] ? ' <span class="badge live">그림 바꿈</span>' : ''}</span></div>
        <div class="row" style="flex:0 0 auto;gap:4px"><select onchange="kfMove('${k}',this.value)">${FCATS.map(([a, b]) => `<option value="${a}" ${a === ck ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>${f.custom ? '' : `<button class="sm" onclick="ovEdit('${k}')">🎨 그림</button>${FOV[k] ? `<button class="sm" onclick="ovReset('${k}')">↺ 원래대로</button>` : ''}`}<button class="sm ${f.hidden ? 'danger' : ''}" onclick="kfHide('${k}')">${f.hidden ? '🙈 숨김' : '👁 보임'}</button></div></div>`).join('') || '<p class="muted">비어 있음.</p>'}</details>`; }).join('')}</div>
   <div class="panel"><div class="row" style="justify-content:space-between"><h2 style="margin:0">✏ KP가 만든 가구</h2><button class="primary" style="flex:0 0 auto" onclick="cfNew('kp')">+ 새 가구</button></div>
    ${kp.map(d => `<div class="item" style="margin:6px 0"><div style="display:flex;align-items:center;gap:6px"><span style="width:64px;text-align:center">${fprev('cf_' + d.id, null, 60)}</span><div><b>${esc(d.name)}</b><div class="muted" style="font-size:.78rem">${d.cost} 은화 · ${esc((FCATS.find(x => x[0] === d.cat) || [, '?'])[1])}${d.sell === false ? ' · 판매 안 함' : ''}</div></div></div>
      <div class="row" style="flex:0 0 auto;gap:4px"><button class="sm" onclick="kfGiveAsk('${d.id}')">🎁 주기</button><button class="sm" onclick="cfEdit('${d.id}')">고치기</button><button class="sm danger" onclick="cfDelete('${d.id}')">지우기</button></div></div>`).join('') || '<p class="muted">아직 없음.</p>'}</div>
   <div class="panel"><h2>🎨 PL이 만든 가구</h2>
    <div class="row" style="align-items:center;gap:6px"><span>한 사람당 최대</span><input id="kfMax" type="number" min="0" value="${FCFG.plMax || 5}" style="width:70px"><button class="sm primary" onclick="B.set('settings/furn',{plMax:Math.max(0,+$('#kfMax').value||0)},true).then(()=>toast('저장 완료'))">저장</button></div>
    ${pl.map(d => `<div class="item" style="margin:6px 0"><div style="display:flex;align-items:center;gap:6px"><span style="width:64px;text-align:center">${fprev('cf_' + d.id, null, 60)}</span><div><b>${esc(d.name)}</b><div class="muted" style="font-size:.78rem">${esc(d.byName || '')}</div></div></div><button class="sm danger" onclick="kfPlDel('${d.id}')">지우기</button></div>`).join('') || '<p class="muted" style="margin-top:6px">아직 없음.</p>'}</div>
   <div class="panel"><h2>🔨 경매</h2>${live.map(a => `<div class="item" style="margin:4px 0"><div><b>${esc(a.name)}</b> <span class="muted">${esc(a.sname || '')} · ${a.bid ? a.bid.amt + '은화 ' + esc(a.bid.name || '') : '입찰 없음'} · ${aucLeft(a)}</span></div><button class="sm danger" onclick="kfAucDel('${a.id}')">취소</button></div>`).join('') || '<p class="muted">열린 경매가 없음.</p>'}
    ${old.length ? `<button class="sm" style="margin-top:6px" onclick="kfAucClean()">끝난 경매 ${old.length}개 정리</button>` : ''}</div>`;
};
function kfCatRead() { return [...document.querySelectorAll('#kfCats input')].map(i => [i.dataset.k, i.value.trim() || i.dataset.k]); }
function kfCatMove(i, d) { const l = kfCatRead(), j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; FCATS.length = 0; l.forEach(x => FCATS.push(x)); render(); }
function kfCatDel(i) { const l = kfCatRead(); if (l.length <= 1) return toast('분류는 하나 이상 있어야 함'); if (!confirm(`「${l[i][1]}」 분류를 지울까? (저장해야 반영됨)`)) return; l.splice(i, 1); FCATS.length = 0; l.forEach(x => FCATS.push(x)); render(); }
function kfCatAdd() { const n = prompt('새 분류 이름'); if (!n) return; const l = kfCatRead(); l.push(['c' + Date.now().toString(36), n.trim()]); FCATS.length = 0; l.forEach(x => FCATS.push(x)); render(); }
async function kfCatSave() {
  const cats = kfCatRead(), keys = cats.map(x => x[0]), move = Object.assign({}, FCFG.move || {});
  Object.entries(FURN).forEach(([k, f]) => { if (f.custom && f.custom.kind === 'pl') return; if (!keys.includes(f.cat)) move[k] = keys[0]; });
  try { await B.set('settings/furn', { cats, move }, true); toast('분류 저장 완료'); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function kfMove(k, cat) { const move = Object.assign({}, FCFG.move || {}); const base = FURN[k].custom ? FURN[k].custom.cat : FURN[k]._cat; if (cat === base) delete move[k]; else move[k] = cat; KF_OPEN = cat;
  try { await B.set('settings/furn', { move }, true); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
async function kfHide(k) { const h = new Set(FCFG.hidden || []); h.has(k) ? h.delete(k) : h.add(k); try { await B.set('settings/furn', { hidden: [...h] }, true); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
async function kfPlDel(id) { if (!confirm('이 가구를 지울까? 만든 사람·산 사람 방에서도 사라짐.')) return; try { await B.del('furn/' + id); toast('삭제 완료'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
async function kfAucDel(id) { if (!confirm('이 경매를 취소할까? 입찰한 사람은 은화를 돌려받음.')) return; try { await B.del('auctions/' + id); toast('취소 완료'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
async function kfAucClean() { const old = AUCS.filter(a => aucEnded(a) && (!a.bid || (a.got && a.paid))); try { await Promise.all(old.map(a => B.del('auctions/' + a.id))); toast('정리 완료'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
function kfGiveAsk(id) {
  const d = CFURN.find(x => x.id === id); if (!d) return;
  modal(`<h2 style="color:var(--gold2);margin-top:0">🎁 ${esc(d.name)} 주기</h2><select id="kfTo" style="width:100%">${players().map(u => `<option value="${u.id}">${esc(u.ho ? cname(u.ho) + ' · ' : '')}${esc(uname(u))}</option>`).join('')}</select>
   <div class="row" style="margin-top:10px"><button onclick="closeModal()">취소</button><button class="primary" onclick="kfGive('${id}')">주기</button></div>`);
}
async function kfGive(id) {
  const uid = $('#kfTo').value; if (!uid) return;
  try { const cur = (await B.get('progress/' + uid)) || {}; const room = cur.room || (uid === ME.uid ? myRoom() : null); if (!room) return toast('그 사람이 아직 방을 열지 않음');
    room.invc = room.invc || []; room.invc.push({ id: rmId(), k: 'cf_' + id, col: null, rc: 0 }); await B.set('progress/' + uid, { room }, true); closeModal(); toast('보관함에 넣어 줌'); }
  catch (e) { toast('실패: ' + (e.code || e.message)); }
}
