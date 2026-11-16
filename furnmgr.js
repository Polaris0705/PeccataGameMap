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
/* drawSprite가 직접 만든 가구를 만나면 여기서 그려요 */
function cfDraw(g, f, x, y, dir) {
  const d = f.custom, pics = d.pics || {}; dir = dir || 0;
  const src = dir === 2 && pics[2] ? pics[2] : dir % 2 && pics[1] ? pics[1] : pics[0], im = cfImg(src); if (!im) return;
  const S = g._S || 1, dm = dimsOf('cf_' + d.id, dir), w = dm.w * T, h = dm.h;
  const X = Math.round(x * S), Y = Math.round(y * S), Wd = Math.round(w * S), Hd = Math.round(h * S);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  if (dir === 3) { g.translate(X + Wd, Y); g.scale(-1, 1); g.drawImage(im, 0, 0, Wd, Hd); } else g.drawImage(im, X, Y, Wd, Hd);
  g.restore();
}
let ORIG_DS = null;
(function () { const _ds = drawSprite; ORIG_DS = _ds; drawSprite = function (g, k, x, y, t, alpha, col, dir, img) {
  const f = FURN[k]; if (!f) return; const ov = !f.custom && ovPic(k, dir);
  if (!f.custom && !ov) return _ds(g, k, x, y, t, alpha, col, dir, img);
  g.save(); if (alpha != null) g.globalAlpha = alpha; if (!g._fr || g._S == null) snapCtx(g, g.getTransform().a || 1);
  if (f.custom) cfDraw(g, f, x, y, dir); else ovDraw(g, k, ov, x, y, col, dir); g.restore(); }; })();

/* ================= 기본 가구 그림 덮어쓰기 (KP) =================
   furnOv/{가구} : { pics:{0:앞,1:옆(왼쪽),2:뒤}, at }   안 그린 방향은 원래 그림
   PL이 바꾼 색은 유지: 원래 기본색의 명암 6단계와 똑같은 도트를 고른 색의 명암으로 바꿔요 */
let FOV = {};
function ovPic(k, dir) { const o = FOV[k]; if (!o || !o.pics) return null; dir = dir || 0; const f = FURN[k];
  if (dir === 2) return o.pics[2] || null; if (dir % 2) return o.pics[1] || null; return o.pics[0] || null; }
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
function ovDraw(g, k, url, x, y, col, dir) {
  const im = ovRecolored(k, url, col); if (!im) return; const dm = dimsOf(k, dir), S = g._S || 1;
  const X = Math.round(x * S), Y = Math.round(y * S), Wd = Math.round(dm.w * T * S), Hd = Math.round(dm.h * S);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
  if (dir === 3) { g.translate(X + Wd, Y); g.scale(-1, 1); g.drawImage(im, 0, 0, Wd, Hd); } else g.drawImage(im, X, Y, Wd, Hd);
  g.restore();
}
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
  const f = FURN[k]; if (!f || f.custom) return; if (!OVD || OVD.k !== k) OVD = { k, pics: Object.assign({}, (FOV[k] || {}).pics || {}) };
  modal(`<h2 style="color:var(--gold2);margin-top:0">🎨 ${esc(f.name)} 그림 바꾸기</h2>
   <p class="muted" style="font-size:.85rem;margin:0 0 6px">원래 그림을 불러와서 고쳐요. 저장하면 이미 놓인 것까지 모든 방에서 바뀌어요. 안 그린 방향은 원래 그림이에요.${Object.keys(f.parts || {}).length ? '<br>PL이 바꾼 색도 유지돼요. 원래 색(명암 그대로)으로 칠한 부분이 바뀌어요.' : ''}${f.pic ? '<br>⚠ 이 가구는 PL이 넣은 그림 대신 이 그림이 보여요.' : ''}</p>
   ${ovDirs(k).map(([d, n]) => { const s = dimsOf(k, d); return `<div class="item" style="margin:4px 0"><div style="display:flex;align-items:center;gap:8px">${OVD.pics[d] ? `<img src="${OVD.pics[d]}" style="height:56px;max-width:110px;image-rendering:pixelated;background:#2a2420">` : `<span style="width:56px;text-align:center">${fprev(k, null, 56, d === 1 ? 1 : d)}</span>`}<div><b>${n}</b> ${OVD.pics[d] ? '<span class="badge live">바꿈</span>' : '<span class="muted">원래 그림</span>'}<div class="muted" style="font-size:.75rem">${s.w * 64}×${Math.round(s.h * 2)}</div></div></div>
     <div class="row" style="flex:0 0 auto;gap:4px"><button class="sm primary" onclick="ovDraw1('${k}',${d})">🎨 그리기</button>${OVD.pics[d] ? `<button class="sm" onclick="delete OVD.pics[${d}];ovEdit('${k}')">↺</button>` : ''}</div></div>`; }).join('')}
   <div class="row" style="margin-top:10px"><button onclick="OVD=null;closeModal()">취소</button>${FOV[k] ? `<button class="danger" onclick="ovReset('${k}')">전부 원래대로</button>` : ''}<button class="primary" onclick="ovSave('${k}')">저장</button></div>`);
  document.querySelectorAll('#mbox canvas.fprev').forEach(c => { c.style.imageRendering = 'pixelated'; paintPreview(c); });
}
function ovDraw1(k, d) {
  const s = dimsOf(k, d), f = FURN[k];
  dotEdit({ W: s.w * 64, H: Math.round(s.h * 2), src: OVD.pics[d] || ovOrigPng(k, d), foot: f.wall ? 0 : s.d * 32 + 8, title: f.name + ' · ' + ovDirs(k).find(x => x[0] === d)[1],
    onSave: url => { if (url) OVD.pics[d] = url; else delete OVD.pics[d]; ovEdit(k); }, onCancel: () => ovEdit(k) });
}
async function ovSave(k) {
  const pics = OVD.pics; if (!Object.keys(pics).length) return ovReset(k, true);
  if (JSON.stringify(pics).length > 900000) return toast('그림이 너무 커요');
  try { await B.set('furnOv/' + k, { pics, at: Date.now() }); OVD = null; closeModal(); toast('그림을 바꿨어요! 모든 방에 적용돼요'); } catch (e) { toast('저장 실패: ' + (e.code || e.message)); }
}
async function ovReset(k, quiet) {
  if (!quiet && !confirm('이 가구를 원래 그림으로 되돌릴까요?')) return;
  try { await B.del('furnOv/' + k); OVD = null; closeModal(); toast('원래 그림으로 되돌렸어요'); } catch (e) { toast('실패: ' + (e.code || e.message)); }
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
  if (kind === 'pl' && myCf().length >= (FCFG.plMax || 5)) return toast(`가구는 ${FCFG.plMax || 5}개까지 만들 수 있어요`);
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
   <p class="muted" style="font-size:.78rem;margin:2px 0 6px">칸 하나는 가로 64도트예요. ${d.wall ? '벽 높이는 최대 ' + maxH + '도트.' : '초록 점선 안이 바닥에 닿는 부분이에요.'}</p>
   ${kp ? `<div class="row" style="gap:6px"><div style="flex:1"><label class="f">가격</label><input id="cfCost" type="number" min="0" value="${d.cost || 0}"></div><div style="flex:1"><label class="f">분류</label><select id="cfCat">${FCATS.map(([k, v]) => `<option value="${k}" ${d.cat === k ? 'selected' : ''}>${esc(v)}</option>`).join('')}</select></div></div>
    <label style="display:block;margin-top:6px"><input type="checkbox" id="cfSell" ${d.sell !== false ? 'checked' : ''}> 가구점에서 팔기</label>` : ''}
   <div style="margin-top:8px">${cfDirs().map(([k, n]) => { const s = cfSize(k); return `<div class="item" style="margin:4px 0"><div style="display:flex;align-items:center;gap:8px">${d.pics[k] ? `<img src="${d.pics[k]}" style="height:48px;max-width:96px;image-rendering:pixelated;background:#2a2420">` : '<span class="muted" style="width:48px;text-align:center">없음</span>'}<div><b>${n}</b>${k === 0 ? '' : ' <span class="muted">(없어도 돼요)</span>'}<div class="muted" style="font-size:.75rem">${s.W}×${s.H}</div></div></div>
     <div class="row" style="flex:0 0 auto;gap:4px"><button class="sm primary" onclick="cfDraw1(${k})">🎨 그리기</button>${d.pics[k] && k ? `<button class="sm" onclick="delete CFD.pics[${k}];cfForm()">✕</button>` : ''}</div></div>`; }).join('')}</div>
   <p class="muted" style="font-size:.78rem">옆모습이 있으면 4방향으로 돌릴 수 있어요 (오른쪽은 좌우 뒤집기).</p>
   <div class="row" style="margin-top:10px"><button onclick="CFD=null;closeModal();${kp ? "go('kfurn')" : 'openFurnShop()'}">취소</button><button class="primary" onclick="cfSave()">저장</button></div>`);
}
function cfDraw1(k) {
  cfFormRead(); const s = cfSize(k);
  dotEdit({ W: s.W, H: s.H, src: CFD.pics[k] || (k && CFD.pics[0] && cfSize(0).W === s.W ? null : null), foot: CFD.wall ? 0 : (k === 1 ? CFD.w : CFD.d) * 64 / 2 + 8, title: (CFD.name || '새 가구') + ' · ' + cfDirs().find(x => x[0] === k)[1],
    onSave: url => { if (url) CFD.pics[k] = url; else delete CFD.pics[k]; cfForm(); }, onCancel: () => cfForm() });
}
async function cfSave() {
  cfFormRead(); const d = CFD; if (!d.name) return toast('이름을 넣어 주세요'); if (!d.pics[0]) return toast(d.wall ? '그림을 그려 주세요' : '앞모습은 꼭 그려 주세요');
  // 크기가 바뀌었으면 맞지 않는 그림은 다시 그려야 해요
  const bad = []; await Promise.all(Object.keys(d.pics).map(k => new Promise(r => { const im = new Image(); im.onload = () => { const s = cfSize(+k); if (im.width !== s.W || im.height !== s.H) bad.push(+k); r(); }; im.onerror = r; im.src = d.pics[k]; })));
  if (bad.length) { if (!confirm('크기를 바꿔서 그림 크기가 맞지 않아요. 그림을 새 크기에 맞춰 늘리지 않고 아래에 맞춰 둘까요?')) return; for (const k of bad) d.pics[k] = await cfRefit(d.pics[k], cfSize(k)); }
  const doc = { name: d.name.slice(0, 24), kind: d.kind, by: d.by || ME.uid, byName: d.byName || PROF.name || '', wall: !!d.wall, w: d.w, d: d.wall ? 0 : d.d, H: d.H, wy: d.wy == null ? null : d.wy, pics: d.pics, at: d.at || Date.now(), upd: Date.now() };
  if (d.kind === 'kp') Object.assign(doc, { cost: d.cost, cat: d.cat, sell: d.sell !== false });
  const size = JSON.stringify(doc).length; if (size > 900000) return toast('그림이 너무 커요. 크기를 줄여 주세요');
  try { const id = d.id || ('f' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)); await B.set('furn/' + id, clean(doc));
    if (!d.id && d.kind === 'pl') { const room = myRoom(); room.invc.push({ id: rmId(), k: 'cf_' + id, col: null, rc: 0 }); saveP(); }
    CFD = null; closeModal(); toast(d.id ? '고쳤어요' : (d.kind === 'pl' ? '가구를 만들었어요! 보관함에 넣어 뒀어요' : '가구를 만들었어요')); if (d.kind === 'kp') go('kfurn'); else openFurnShop();
  } catch (e) { toast('저장 실패: ' + (e.code || e.message)); }
}
function cfRefit(url, s) { return new Promise(r => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = s.W; c.height = s.H; c.getContext('2d').drawImage(im, Math.round((s.W - im.width) / 2), s.H - im.height); r(c.toDataURL('image/png')); }; im.src = url; }); }
async function cfDelete(id) {
  const d = CFURN.find(x => x.id === id); if (!d) return;
  if (IS_ADMIN && d.kind === 'kp') { if (!confirm('이 가구를 지울까요? 이미 가진 사람의 방에서도 사라져요.')) return; try { await B.del('furn/' + id); toast('지웠어요'); } catch (e) { toast('실패: ' + (e.code || e.message)); } return; }
  if (!confirm('목록에서 지울까요? (경매로 산 사람의 가구는 그대로 남아요)')) return;
  try { await B.set('furn/' + id, { del: true }, true); toast('지웠어요'); openFurnShop(); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
function cfTake(id) { const room = myRoom(); room.invc.push({ id: rmId(), k: 'cf_' + id, col: null, rc: 0 }); saveP(); sfx('ok'); toast('보관함에 하나 더 넣었어요'); openFurnShop(); }

/* ---------- 가구점 안 「내가 만든 가구」 · 「경매장」 ---------- */
function mineHtml() {
  const l = myCf(), max = FCFG.plMax || 5;
  return `<p class="muted" style="margin:4px 0 8px">직접 그린 가구는 무료로 내 방에 놓을 수 있고, 경매에 복제품을 올릴 수 있어요. (${l.length}/${max})</p>
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
   <p class="muted" style="font-size:.85rem">복제품을 팔아요. 원본은 계속 내 것이에요. 끝날 때 가장 높이 부른 사람이 가져가요.</p>
   <label class="f">시작가</label><input id="auS" type="number" min="1" value="20">
   <label class="f">즉시 구매가 (0 = 없음)</label><input id="auB" type="number" min="0" value="0">
   <label class="f">기간</label><select id="auT"><option value="3600000">1시간</option><option value="21600000">6시간</option><option value="86400000" selected>1일</option><option value="259200000">3일</option></select>
   <div class="row" style="margin-top:12px"><button onclick="openFurnShop()">취소</button><button class="primary" onclick="aucCreate('${fid}')">올리기</button></div>`);
  document.querySelectorAll('#mbox canvas.fprev').forEach(c => { c.style.imageRendering = 'pixelated'; paintPreview(c); });
}
async function aucCreate(fid) {
  const d = CFURN.find(x => x.id === fid), start = Math.max(1, parseInt($('#auS').value) || 1), buy = Math.max(0, parseInt($('#auB').value) || 0), dur = +$('#auT').value;
  if (buy && buy <= start) return toast('즉시 구매가는 시작가보다 높아야 해요');
  try { await B.add('auctions', { fk: fid, name: d.name, seller: ME.uid, sname: PROF.name || '', start, buy, endAt: Date.now() + dur, at: Date.now(), bid: null, n: 0, got: false, paid: false });
    sfx('ok'); toast('경매에 올렸어요!'); SHOPTAB = 'auc'; openFurnShop(); } catch (e) { toast('실패: ' + (e.code || e.message)); }
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
  return `<p class="muted" style="margin:4px 0">입찰하면 그 은화가 묶여요. 더 높은 입찰이 나오면 바로 돌려받아요.${held ? ` <b>묶인 은화 ${held}</b>` : ''}</p>
   ${live.length ? live.map(row).join('') : '<p class="muted">지금 열린 경매가 없어요.</p>'}${done.length ? `<details style="margin-top:8px"><summary class="muted">끝난 경매 (${done.length})</summary>${done.map(row).join('')}</details>` : ''}`;
}
function aucRefresh() {
  const el = document.getElementById('aucList'); if (el) { const y = el.parentElement ? el.parentElement.scrollTop : 0; const foc = document.activeElement && document.activeElement.id && document.activeElement.id.startsWith('ab_'); if (foc) return; el.innerHTML = aucHtml(); if (el.parentElement) el.parentElement.scrollTop = y; document.querySelectorAll('#aucList canvas.fprev').forEach(c => { c.style.imageRendering = 'pixelated'; paintPreview(c); }); }
  if (tab === 'kfurn') softRender();
}
async function aucBid(id, now) {
  const a = AUCS.find(x => x.id === id); if (!a) return; if (aucEnded(a)) return toast('이미 끝난 경매예요');
  let amt = now ? a.buy : parseInt(($('#ab_' + id) || {}).value) || 0; const cur = a.bid ? a.bid.amt : 0, min = a.bid ? cur + 1 : a.start;
  if (amt < min) return toast(`${min} 은화 이상 불러야 해요`); if (a.buy && amt > a.buy) amt = a.buy;
  const hold = (P.holds || {})[id] || 0, need = amt - hold;
  if (P.coins < need) return toast('은화가 부족해요');
  const ok = await B.tx('auctions/' + id, x => { if (!x || Date.now() >= x.endAt) return undefined; const c = x.bid ? x.bid.amt : 0; if (x.bid ? amt <= c : amt < x.start) return undefined;
    x.bid = { uid: ME.uid, name: PROF.name || '', amt, at: Date.now() }; x.n = (x.n || 0) + 1; if (x.buy && amt >= x.buy) x.endAt = Date.now(); return x; }).catch(e => { toast('실패: ' + (e.code || e.message)); return null; });
  if (ok === null) return; if (!ok) return toast('그 사이에 더 높은 입찰이 있었어요');
  P.holds = P.holds || {}; LOG_W = 'auction'; P.coins -= need; logAct(-need); LOG_W = null; P.holds[id] = amt; P.holdT = P.holdT || {}; P.holdT[id] = Date.now(); saveP(); sfx('coin');
  toast(now || (a.buy && amt >= a.buy) ? '즉시 구매! 곧 보관함에 들어와요' : `${amt} 은화로 입찰했어요`); if (SHOPTAB === 'auc') openFurnShop();
}
async function aucCancel(id) { if (!confirm('이 경매를 치울까요?')) return; try { await B.del('auctions/' + id); toast('치웠어요'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
/* 내 몫 정산: 밀린 입찰 환불 · 낙찰품 받기 · 판매 대금 받기 */
let AUC_BUSY = false;
async function aucSync() {
  if (!P || !ME || !AUC_READY || AUC_BUSY) return; AUC_BUSY = true;
  try {
    let ch = false; P.holds = P.holds || {}; P.aucDone = P.aucDone || [];
    for (const [id, amt] of Object.entries(P.holds)) {
      const a = AUCS.find(x => x.id === id);
      if (!a || !a.bid || a.bid.uid !== ME.uid) { if (Date.now() - ((P.holdT || {})[id] || 0) < 20000) continue; delete P.holds[id]; if (P.holdT) delete P.holdT[id]; LOG_W = 'auction'; P.coins += amt; logAct(amt); LOG_W = null; ch = true; toast(`🔨 「${a ? a.name : '경매'}」에서 더 높은 입찰이 나와 ${amt} 은화를 돌려받았어요`); continue; }
      if (aucEnded(a) && !P.aucDone.includes(id)) { const room = myRoom(); room.invc.push({ id: rmId(), k: 'cf_' + a.fk, col: null, rc: 0 }); delete P.holds[id]; P.aucDone.push(id); ch = true; sfx('ok');
        modal(`<h2 style="color:var(--gold2);margin-top:0">🔨 낙찰!</h2><div style="text-align:center">${fprev('cf_' + a.fk, null, 120)}</div><p style="text-align:center"><b>${esc(a.name)}</b>을(를) ${a.bid.amt} 은화에 샀어요.<br>보관함에 넣어 뒀어요.</p><button class="primary" style="width:100%" onclick="closeModal();render()">좋아요</button>`);
        document.querySelectorAll('#mbox canvas.fprev').forEach(c => { c.style.imageRendering = 'pixelated'; paintPreview(c); });
        B.update('auctions/' + id, { got: true }).catch(() => {}); }
    }
    for (const a of AUCS) if (a.seller === ME.uid && aucEnded(a) && a.bid && !P.aucDone.includes('s_' + a.id)) {
      P.aucDone.push('s_' + a.id); LOG_W = 'auction'; P.coins += a.bid.amt; P.earned = (P.earned || 0) + a.bid.amt; logAct(a.bid.amt); LOG_W = null; ch = true; sfx('coin');
      toast(`🔨 「${a.name}」이(가) ${a.bid.amt} 은화에 팔렸어요!`); B.update('auctions/' + a.id, { paid: true }).catch(() => {}); }
    if (P.aucDone.length > 200) P.aucDone = P.aucDone.slice(-200);
    if (ch) saveP();
  } finally { AUC_BUSY = false; }
}

/* ================= KP: 가구 관리 ================= */
let KF_OPEN = '';
VIEWS.kfurn = () => {
  if (!IS_ADMIN) return '<div class="panel">KP만 볼 수 있어요.</div>';
  const kp = CFURN.filter(d => d.kind === 'kp'), pl = CFURN.filter(d => d.kind === 'pl' && !d.del), all = Object.entries(FURN).filter(([k, f]) => !(f.custom && f.custom.kind === 'pl'));
  const live = AUCS.filter(a => !aucEnded(a)), old = AUCS.filter(a => aucEnded(a) && (!a.bid || (a.got && a.paid)));
  return `<div class="panel"><h2>🗂 가구점 분류</h2><p class="muted" style="margin:0 0 6px">이름을 고치고 ▲▼로 순서를 바꿔요. 지운 분류의 가구는 첫 분류로 옮겨져요.</p>
    <div id="kfCats">${FCATS.map(([k, v], i) => `<div class="row" style="gap:4px;margin:3px 0"><input data-k="${k}" value="${esc(v)}" style="flex:1"><button class="sm" onclick="kfCatMove(${i},-1)">▲</button><button class="sm" onclick="kfCatMove(${i},1)">▼</button><button class="sm danger" onclick="kfCatDel(${i})">🗑</button></div>`).join('')}</div>
    <div class="row" style="gap:6px;margin-top:6px"><button onclick="kfCatAdd()">+ 분류 추가</button><button class="primary" onclick="kfCatSave()">분류 저장</button><button onclick="if(confirm('처음 분류로 되돌릴까요?'))B.set('settings/furn',{cats:null},true)">기본으로</button></div></div>
   <div class="panel"><h2>🪑 가구 옮기기 · 숨기기</h2><p class="muted" style="margin:0 0 6px">숨긴 가구는 가구점에서 안 보여요. 이미 가진 건 그대로예요. 🎨 그림으로 기본 가구 그림을 고칠 수 있어요.</p>
    ${FCATS.map(([ck, cv]) => { const items = all.filter(([k, f]) => f.cat === ck); return `<details ${KF_OPEN === ck ? 'open' : ''} ontoggle="if(this.open)KF_OPEN='${ck}'"><summary><b>${esc(cv)}</b> <span class="muted">${items.length}</span></summary>
      ${items.map(([k, f]) => `<div class="item" style="margin:3px 0"><div style="display:flex;align-items:center;gap:6px"><span style="width:44px;text-align:center">${fprev(k, null, 40)}</span><span>${esc(f.name)}${f.custom ? ' ✏' : ''}${FOV[k] ? ' <span class="badge live">그림 바꿈</span>' : ''}</span></div>
        <div class="row" style="flex:0 0 auto;gap:4px"><select onchange="kfMove('${k}',this.value)">${FCATS.map(([a, b]) => `<option value="${a}" ${a === ck ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>${f.custom ? '' : `<button class="sm" onclick="ovEdit('${k}')">🎨 그림</button>`}<button class="sm ${f.hidden ? 'danger' : ''}" onclick="kfHide('${k}')">${f.hidden ? '🙈 숨김' : '👁 보임'}</button></div></div>`).join('') || '<p class="muted">비어 있어요.</p>'}</details>`; }).join('')}</div>
   <div class="panel"><div class="row" style="justify-content:space-between"><h2 style="margin:0">✏ KP가 만든 가구</h2><button class="primary" style="flex:0 0 auto" onclick="cfNew('kp')">+ 새 가구</button></div>
    ${kp.map(d => `<div class="item" style="margin:6px 0"><div style="display:flex;align-items:center;gap:6px"><span style="width:64px;text-align:center">${fprev('cf_' + d.id, null, 60)}</span><div><b>${esc(d.name)}</b><div class="muted" style="font-size:.78rem">${d.cost} 은화 · ${esc((FCATS.find(x => x[0] === d.cat) || [, '?'])[1])}${d.sell === false ? ' · 판매 안 함' : ''}</div></div></div>
      <div class="row" style="flex:0 0 auto;gap:4px"><button class="sm" onclick="kfGiveAsk('${d.id}')">🎁 주기</button><button class="sm" onclick="cfEdit('${d.id}')">고치기</button><button class="sm danger" onclick="cfDelete('${d.id}')">지우기</button></div></div>`).join('') || '<p class="muted">아직 없어요.</p>'}</div>
   <div class="panel"><h2>🎨 PL이 만든 가구</h2>
    <div class="row" style="align-items:center;gap:6px"><span>한 사람당 최대</span><input id="kfMax" type="number" min="0" value="${FCFG.plMax || 5}" style="width:70px"><button class="sm primary" onclick="B.set('settings/furn',{plMax:Math.max(0,+$('#kfMax').value||0)},true).then(()=>toast('저장했어요'))">저장</button></div>
    ${pl.map(d => `<div class="item" style="margin:6px 0"><div style="display:flex;align-items:center;gap:6px"><span style="width:64px;text-align:center">${fprev('cf_' + d.id, null, 60)}</span><div><b>${esc(d.name)}</b><div class="muted" style="font-size:.78rem">${esc(d.byName || '')}</div></div></div><button class="sm danger" onclick="kfPlDel('${d.id}')">지우기</button></div>`).join('') || '<p class="muted" style="margin-top:6px">아직 없어요.</p>'}</div>
   <div class="panel"><h2>🔨 경매</h2>${live.map(a => `<div class="item" style="margin:4px 0"><div><b>${esc(a.name)}</b> <span class="muted">${esc(a.sname || '')} · ${a.bid ? a.bid.amt + '은화 ' + esc(a.bid.name || '') : '입찰 없음'} · ${aucLeft(a)}</span></div><button class="sm danger" onclick="kfAucDel('${a.id}')">취소</button></div>`).join('') || '<p class="muted">열린 경매가 없어요.</p>'}
    ${old.length ? `<button class="sm" style="margin-top:6px" onclick="kfAucClean()">끝난 경매 ${old.length}개 정리</button>` : ''}</div>`;
};
function kfCatRead() { return [...document.querySelectorAll('#kfCats input')].map(i => [i.dataset.k, i.value.trim() || i.dataset.k]); }
function kfCatMove(i, d) { const l = kfCatRead(), j = i + d; if (j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; FCATS.length = 0; l.forEach(x => FCATS.push(x)); render(); }
function kfCatDel(i) { const l = kfCatRead(); if (l.length <= 1) return toast('분류는 하나 이상 있어야 해요'); if (!confirm(`「${l[i][1]}」 분류를 지울까요? (저장해야 반영돼요)`)) return; l.splice(i, 1); FCATS.length = 0; l.forEach(x => FCATS.push(x)); render(); }
function kfCatAdd() { const n = prompt('새 분류 이름'); if (!n) return; const l = kfCatRead(); l.push(['c' + Date.now().toString(36), n.trim()]); FCATS.length = 0; l.forEach(x => FCATS.push(x)); render(); }
async function kfCatSave() {
  const cats = kfCatRead(), keys = cats.map(x => x[0]), move = Object.assign({}, FCFG.move || {});
  Object.entries(FURN).forEach(([k, f]) => { if (f.custom && f.custom.kind === 'pl') return; if (!keys.includes(f.cat)) move[k] = keys[0]; });
  try { await B.set('settings/furn', { cats, move }, true); toast('분류를 저장했어요'); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function kfMove(k, cat) { const move = Object.assign({}, FCFG.move || {}); const base = FURN[k].custom ? FURN[k].custom.cat : FURN[k]._cat; if (cat === base) delete move[k]; else move[k] = cat; KF_OPEN = cat;
  try { await B.set('settings/furn', { move }, true); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
async function kfHide(k) { const h = new Set(FCFG.hidden || []); h.has(k) ? h.delete(k) : h.add(k); try { await B.set('settings/furn', { hidden: [...h] }, true); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
async function kfPlDel(id) { if (!confirm('이 가구를 지울까요? 만든 사람·산 사람 방에서도 사라져요.')) return; try { await B.del('furn/' + id); toast('지웠어요'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
async function kfAucDel(id) { if (!confirm('이 경매를 취소할까요? 입찰한 사람은 은화를 돌려받아요.')) return; try { await B.del('auctions/' + id); toast('취소했어요'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
async function kfAucClean() { const old = AUCS.filter(a => aucEnded(a) && (!a.bid || (a.got && a.paid))); try { await Promise.all(old.map(a => B.del('auctions/' + a.id))); toast('정리했어요'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
function kfGiveAsk(id) {
  const d = CFURN.find(x => x.id === id); if (!d) return;
  modal(`<h2 style="color:var(--gold2);margin-top:0">🎁 ${esc(d.name)} 주기</h2><select id="kfTo" style="width:100%">${players().map(u => `<option value="${u.id}">${esc(u.ho ? cname(u.ho) + ' · ' : '')}${esc(uname(u))}</option>`).join('')}</select>
   <div class="row" style="margin-top:10px"><button onclick="closeModal()">취소</button><button class="primary" onclick="kfGive('${id}')">주기</button></div>`);
}
async function kfGive(id) {
  const uid = $('#kfTo').value; if (!uid) return;
  try { const cur = (await B.get('progress/' + uid)) || {}; const room = cur.room || (uid === ME.uid ? myRoom() : null); if (!room) return toast('그 사람이 아직 방을 열지 않았어요');
    room.invc = room.invc || []; room.invc.push({ id: rmId(), k: 'cf_' + id, col: null, rc: 0 }); await B.set('progress/' + uid, { room }, true); closeModal(); toast('보관함에 넣어 줬어요'); }
  catch (e) { toast('실패: ' + (e.code || e.message)); }
}
