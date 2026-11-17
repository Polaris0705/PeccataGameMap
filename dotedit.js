/* ================= 도트 편집기 =================
   dotEdit({ W, H, src, n, ms, orig, key, foot, title, onSave(dataURL|null, {n, ms}), onCancel })
     W×H = 한 장면 도트 수 (가구 칸 하나 = 가로 64도트) · src = 장면 n장을 세로로 이어 붙인 그림
     orig = 원래 가구 그림 (있으면 「원래 도트로」 버튼, 원래와 똑같이 저장하면 null)
     key  = 임시저장 이름 · foot = 바닥에 닿는 부분 높이(안내선)
   레이어(최대 8장, 장면끼리 공유) · 장면(최대 4장) · 밑그림 · 자동 임시저장
   도구: 펜 · 지우개 · 채우기 · 스포이드 · 선 · 사각형 · 원 · 디더 붓 · 그라데이션 · 색 바꾸기 · 선택 · 이동 · 밑그림 옮기기
================================================== */
let DE = null, DECLIP = null;
const DE_MAXF = 4, DE_MAXL = 8;
const DE_TOOLS = [['pen', '✏', '펜'], ['erase', '🧽', '지우개'], ['fill', '🪣', '채우기'], ['pick', '💧', '스포이드'], ['line', '╱', '선'], ['rect', '▭', '사각형'], ['oval', '◯', '원'],
  ['dith', '▦', '디더 붓'], ['grad', '🌈', '그라데이션'], ['swap', '🔄', '색 바꾸기'], ['sel', '⬚', '선택'], ['hand', '✋', '이동'], ['ref', '🖼', '밑그림 옮기기']];
const DE_PAL = ['#24160e', '#5a3a24', '#8a5530', '#c4864e', '#e8c8a0', '#f8f4ea', '#ffffff', '#7a7a84', '#3a3a44', '#a8344a', '#d8485a', '#f08ab0', '#e8a060', '#e0b050', '#ffe27a', '#79b26e', '#4f8a55', '#2e6a5a', '#9ad0e4', '#5a9ad8', '#3a5a8a', '#6a4a8a', '#c8a8e0', '#2a2a32'];
const DE_BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const deHex = h => { h = String(h || '#000000').replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
const deToHex = (r, g, b) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

function dotEdit(o) {
  const W = Math.max(8, Math.min(512, o.W | 0)), H = Math.max(8, Math.min(512, o.H | 0));
  DE = { W, H, o, layers: [], li: 0, fi: 0, px: null, ms: o.ms || 220, onion: true, play: null, showFi: -1,
    tool: 'pen', col: '#24160e', col2: null, size: 1, fillShape: false, mirror: false, grid: true, dith: 0, scopeF: false, scopeL: false,
    z: 4, ox: 0, oy: 0, undo: [], redo: [], ref: null, sel: null, float: null, drag: null, ptr: new Map(), recent: [], sheet: '', dirty: false, pal: -1, origPx: null };
  DE.layers = [deNewLayer('레이어 1', 1)]; DE.px = DE.layers[0].frames[0];
  const root = document.createElement('div'); root.id = 'dotEd';
  root.innerHTML = `<style>
    #dotEd{position:fixed;inset:0;z-index:38;background:#15100c;display:flex;flex-direction:column;color:var(--text);touch-action:none;user-select:none;-webkit-user-select:none}
    #dotEd .dtop{display:flex;align-items:center;gap:6px;padding:calc(6px + env(safe-area-inset-top)) 8px 6px;border-bottom:1px solid var(--line)}
    #dotEd .dtop b{flex:1;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #dotEd .dwrap{flex:1;position:relative;min-height:0}
    #dotEd canvas#deCv{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;cursor:crosshair}
    #dotEd .dbar{display:flex;gap:4px;overflow-x:auto;padding:4px 6px;border-top:1px solid var(--line);align-items:center;-webkit-overflow-scrolling:touch}
    #dotEd .dbar::-webkit-scrollbar{height:4px}
    #dotEd .dbar span,#dotEd .dbar label{white-space:nowrap;flex:0 0 auto}
    #dotEd .dbar button,#dotEd .dsheet button{flex:0 0 auto;padding:6px 9px;font-size:.9rem;white-space:nowrap}
    #dotEd button.on{background:var(--gold);color:var(--ontext)}
    #dotEd .sw{flex:0 0 26px;width:26px;height:26px;border:2px solid #0008;border-radius:4px;cursor:pointer;display:inline-block}
    #dotEd .sw.on{outline:2px solid var(--gold2);outline-offset:1px}
    #dotEd .sw.none{background:repeating-conic-gradient(#888 0 25%,#ddd 0 50%) 0 0/10px 10px}
    #dotEd .dsheet{position:absolute;left:8px;right:8px;bottom:8px;background:var(--panel);border:1px solid var(--gold);border-radius:8px;padding:10px;max-height:72%;overflow:auto;z-index:2;box-shadow:0 6px 20px #000a}
    #dotEd .dinfo{position:absolute;left:8px;top:6px;font-size:.75rem;background:#000a;padding:2px 6px;border-radius:4px;pointer-events:none}
    #dotEd input[type=range]{flex:0 0 110px;width:110px}
    #dotEd input[type=checkbox]{width:auto;margin:0 4px 0 0;vertical-align:middle}
    #dotEd .lrow{display:flex;align-items:center;gap:4px;padding:4px;border:1px solid var(--line);border-radius:6px;margin:3px 0}
    #dotEd .lrow.on{border-color:var(--gold2);background:#ffffff0d}
    #dotEd .lrow canvas{width:40px;height:40px;background:#2a2420;image-rendering:pixelated;flex:0 0 40px;object-fit:contain}
  </style>
  <div class="dtop"><button class="sm" onclick="deClose(false)">✕ 취소</button><b>🎨 ${esc(o.title || '도트 그리기')} <span class="muted" style="font-size:.8rem">${W}×${H}</span></b>
    <button class="sm" onclick="deUndo()">↶</button><button class="sm" onclick="deRedo()">↷</button><button class="sm primary" onclick="deClose(true)">✔ 저장</button></div>
  <div class="dwrap"><canvas id="deCv"></canvas><div class="dinfo" id="deInfo"></div><div class="dsheet" id="deSheet" style="display:none"></div></div>
  <div class="dbar" id="deFrames"></div><div class="dbar" id="deTools"></div><div class="dbar" id="deOpts"></div><div class="dbar" id="deCols"></div>`;
  document.body.appendChild(root); document.body.style.overflow = 'hidden';
  if (o.orig) deDecode(o.orig, 1).then(fr => { if (DE && fr) { DE.origPx = fr[0]; deUI(); } });
  const dr = deDraftGet();
  if (dr && confirm(`그리다 만 그림이 임시저장돼 있음 (${new Date(dr.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}). 이어서 그릴까?`)) deDraftLoad(dr);
  else { if (dr) deDraftDel(); if (o.src) deLoadSrc(o.src); }
  deUI(); deFit(); deBind(); deDraw();
  DE.saveT = setInterval(deDraftSave, 4000);
}
function deClose(save) {
  if (!DE) return; const o = DE.o;
  if (!save && DE.dirty && !confirm('그린 것을 저장하지 않고 닫을까?')) return;
  let url = null, meta = null;
  if (save) { if (DE.float) deCommitFloat(); deStop(); meta = { n: deN(), ms: DE.ms };
    if (deIsEmpty()) url = null; else if (DE.origPx && deN() === 1 && deSame(deComp(0), DE.origPx)) { url = null; toast('원래 그림과 같아서 원래대로 돌려 둠'); } else url = dePng(); }
  clearInterval(DE.saveT); clearInterval(DE.roomT); deDraftDel(); deStop(); window.removeEventListener('keydown', deKey);
  const r = document.getElementById('dotEd'); if (r) r.remove(); document.body.style.overflow = ''; DE = null;
  if (save) o.onSave && o.onSave(url, meta); else o.onCancel && o.onCancel();
}

/* ---------- 레이어 · 장면 기본 ---------- */
const deNF = () => new Uint8ClampedArray(DE.W * DE.H * 4);
function deNewLayer(name, n) { const fr = []; for (let i = 0; i < (n || deN()); i++) fr.push(new Uint8ClampedArray(DE.W * DE.H * 4)); return { name, vis: true, lock: false, op: 1, frames: fr }; }
const deN = () => DE.layers[0].frames.length;
const deL = () => DE.layers[DE.li];
function deSetPx(a) { DE.px = a; deL().frames[DE.fi] = a; }
function deSync() { DE.px = deL().frames[DE.fi]; }
/* 레이어 합친 그림 (sub = 지금 레이어 대신 그릴 도트) */
function deComp(fi, sub) {
  const out = deNF();
  DE.layers.forEach((L, li) => {
    if (!L.vis) return; const s = sub && li === DE.li ? sub : L.frames[fi], op = L.op == null ? 1 : L.op; if (!s || op <= 0) return;
    for (let i = 0; i < s.length; i += 4) { const a = s[i + 3]; if (!a) continue;
      if (a === 255 && op >= 1) { out[i] = s[i]; out[i + 1] = s[i + 1]; out[i + 2] = s[i + 2]; out[i + 3] = 255; continue; }
      const sa = a / 255 * op, da = out[i + 3] / 255, oa = sa + da * (1 - sa); if (oa <= 0) continue;
      for (let k = 0; k < 3; k++) out[i + k] = Math.round((s[i + k] * sa + out[i + k] * da * (1 - sa)) / oa); out[i + 3] = Math.round(oa * 255); }
  });
  return out;
}
const deSame = (a, b) => { if (!a || !b || a.length !== b.length) return false; for (let i = 0; i < a.length; i += 4) { if ((a[i + 3] > 127) !== (b[i + 3] > 127)) return false; if (a[i + 3] > 127 && (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2])) return false; } return true; };
function deIsEmpty() { for (let f = 0; f < deN(); f++) { const c = deComp(f); for (let i = 3; i < c.length; i += 4) if (c[i]) return false; } return true; }
function dePng() { const n = deN(), c = document.createElement('canvas'); c.width = DE.W; c.height = DE.H * n; const g = c.getContext('2d'); for (let f = 0; f < n; f++) g.putImageData(new ImageData(deComp(f), DE.W, DE.H), 0, f * DE.H); return c.toDataURL('image/png'); }
function deLayerPng(L) { const n = L.frames.length, c = document.createElement('canvas'); c.width = DE.W; c.height = DE.H * n; const g = c.getContext('2d'); L.frames.forEach((f, i) => g.putImageData(new ImageData(f.slice(), DE.W, DE.H), 0, i * DE.H)); return c.toDataURL('image/png'); }
/* 그림(장면 n장 세로 이어 붙임) → 장면 배열. 크기가 다르면 아래·가운데 맞춤 */
function deDecode(src, n) { return new Promise(res => { const im = new Image(); im.onload = () => { if (!DE) return res(null); n = Math.max(1, Math.min(DE_MAXF, n | 0 || 1)); const fh = im.height % n === 0 ? im.height / n : im.height, cnt = fh === im.height ? 1 : n, fr = [];
  for (let i = 0; i < cnt; i++) { const c = document.createElement('canvas'); c.width = DE.W; c.height = DE.H; const g = c.getContext('2d'); g.drawImage(im, 0, i * fh, im.width, fh, Math.round((DE.W - im.width) / 2), DE.H - fh, im.width, fh); fr.push(new Uint8ClampedArray(g.getImageData(0, 0, DE.W, DE.H).data)); }
  res(fr); }; im.onerror = () => res(null); im.src = src; }); }
function deLoadSrc(src) { deDecode(src, DE.o.n).then(fr => { if (!DE || !fr) return; DE.layers = [{ name: '레이어 1', vis: true, lock: false, op: 1, frames: fr }]; DE.li = 0; DE.fi = 0; deSync(); deUI(); deDraw(); }); }
function deToOrig() {
  if (!DE.origPx) return toast('원래 그림을 불러오는 중'); if (!confirm('원래 가구 도트로 되돌릴까? 레이어와 장면이 하나로 정리됨.')) return;
  deStop(); DE.float = null; DE.sel = null; DE.layers = [{ name: '원래 그림', vis: true, lock: false, op: 1, frames: [DE.origPx.slice()] }]; DE.li = 0; DE.fi = 0; deSync(); deStruct(); deUI(); deDraw(); deCols();
  toast('원래 도트로 되돌림. 이대로 저장하면 「바꿈」 표시가 사라짐');
}

/* ---------- 자동 임시저장 ---------- */
const deDraftKey = () => 'peccata_dot_' + (DE.o.key || (DE.o.title || 'x')) + '_' + DE.W + 'x' + DE.H;
function deDraftGet() { try { const d = JSON.parse(localStorage.getItem(deDraftKey()) || 'null'); return d && d.W === DE.W && d.H === DE.H ? d : null; } catch (e) { return null; } }
function deDraftDel() { try { localStorage.removeItem(deDraftKey()); } catch (e) {} }
function deDraftSave() {
  if (!DE || !DE.dirty || DE.drag) return; if (DE.savedAt && DE.savedAt >= (DE.editAt || 0)) return;
  try { localStorage.setItem(deDraftKey(), JSON.stringify({ W: DE.W, H: DE.H, n: deN(), ms: DE.ms, li: DE.li, at: Date.now(), layers: DE.layers.map(L => ({ name: L.name, vis: L.vis, lock: L.lock, op: L.op, png: deLayerPng(L) })) })); DE.savedAt = Date.now(); } catch (e) {}
}
async function deDraftLoad(d) {
  const ls = []; for (const L of d.layers) { const fr = await deDecode(L.png, d.n); if (!DE) return; ls.push({ name: L.name, vis: L.vis !== false, lock: !!L.lock, op: L.op == null ? 1 : L.op, frames: fr || [deNF()] }); }
  const n = Math.max(1, ...ls.map(L => L.frames.length)); ls.forEach(L => { while (L.frames.length < n) L.frames.push(deNF()); });
  DE.layers = ls.length ? ls : [deNewLayer('레이어 1', 1)]; DE.li = Math.min(d.li || 0, DE.layers.length - 1); DE.fi = 0; DE.ms = d.ms || DE.ms; DE.dirty = true; deSync(); deUI(); deDraw(); deCols(); toast('임시저장한 그림을 불러옴');
}

/* ---------- 장면 (모든 레이어가 같이) ---------- */
function deStruct() { DE.undo = []; DE.redo = []; DE.dirty = true; DE.editAt = Date.now(); }
function deFrameGo(i) { if (DE.float) deCommitFloat(); deStop(); DE.fi = i; deSync(); deUI(); deDraw(); if (DE.sheet === 'lay') deSheetBody(); }
function deFrameAdd(copy) { if (deN() >= DE_MAXF) return toast(`장면은 ${DE_MAXF}장까지`); deStop(); DE.layers.forEach(L => L.frames.splice(DE.fi + 1, 0, copy ? L.frames[DE.fi].slice() : deNF())); deStruct(); deFrameGo(DE.fi + 1); }
function deFrameDel() { if (deN() <= 1) return; if (!confirm(`${DE.fi + 1}번 장면을 지울까?`)) return; deStop(); DE.layers.forEach(L => L.frames.splice(DE.fi, 1)); deStruct(); DE.fi = Math.min(DE.fi, deN() - 1); deSync(); deUI(); deDraw(); }
function deFrameMove(d) { const j = DE.fi + d; if (j < 0 || j >= deN()) return; deStop(); DE.layers.forEach(L => { [L.frames[DE.fi], L.frames[j]] = [L.frames[j], L.frames[DE.fi]]; }); deStruct(); DE.fi = j; deSync(); deUI(); deDraw(); }
function dePlay() { if (DE.play) return deStop(); if (deN() < 2) return toast('장면이 2장 이상이어야 움직임'); DE.showFi = DE.fi;
  DE.play = setInterval(() => { if (!DE) return; DE.showFi = (DE.showFi + 1) % deN(); deDraw(); }, DE.ms); deUI(); }
function deStop() { if (DE && DE.play) { clearInterval(DE.play); DE.play = null; DE.showFi = -1; deUI(); deDraw(); } }

/* ---------- 레이어 ---------- */
function deLayerGo(i) { if (DE.float) deCommitFloat(); DE.li = i; deSync(); deUI(); deDraw(); if (DE.sheet === 'lay') deSheetBody(); }
function deLayerAdd(copy) { if (DE.layers.length >= DE_MAXL) return toast(`레이어는 ${DE_MAXL}장까지`); const L = copy ? { name: deL().name + ' 복사', vis: true, lock: false, op: deL().op, frames: deL().frames.map(f => f.slice()) } : deNewLayer('레이어 ' + (DE.layers.length + 1));
  DE.layers.splice(DE.li + 1, 0, L); deStruct(); deLayerGo(DE.li + 1); }
function deLayerDel() { if (DE.layers.length <= 1) return toast('레이어는 하나 이상 있어야 함'); if (!confirm(`「${deL().name}」 레이어를 지울까?`)) return; DE.layers.splice(DE.li, 1); deStruct(); deLayerGo(Math.max(0, DE.li - 1)); }
function deLayerMove(d) { const j = DE.li + d; if (j < 0 || j >= DE.layers.length) return; [DE.layers[DE.li], DE.layers[j]] = [DE.layers[j], DE.layers[DE.li]]; deStruct(); deLayerGo(j); }
function deLayerMerge() {
  if (DE.li === 0) return toast('맨 아래 레이어'); const up = deL(), dn = DE.layers[DE.li - 1]; if (!confirm(`「${up.name}」을(를) 「${dn.name}」에 합칠까?`)) return;
  const keep = DE.layers, li0 = DE.li; DE.layers = [Object.assign({}, dn, { vis: true }), Object.assign({}, up, { vis: true })]; DE.li = 1;
  const merged = dn.frames.map((_, f) => deComp(f)); DE.layers = keep; DE.li = li0; dn.frames = merged; dn.op = 1; DE.layers.splice(li0, 1); deStruct(); deLayerGo(li0 - 1);
}
function deLayerRename() { const n = prompt('레이어 이름', deL().name); if (n) { deL().name = n.trim().slice(0, 16) || deL().name; deUI(); deSheetBody(); } }

/* ---------- 화면 ---------- */
function deUI() {
  if (!DE) return; const t = DE.tool, L = deL(), n = deN();
  $('#deFrames').innerHTML = `<button class="${DE.sheet === 'lay' ? 'on' : ''}" onclick="deSheet('lay')">🗂 ${esc(L.name)}${L.lock ? ' 🔒' : ''}${L.vis ? '' : ' 🙈'}${DE.layers.length > 1 ? ` (${DE.layers.length})` : ''}</button><span class="muted">장면</span>${DE.layers[0].frames.map((_, i) => `<button class="${i === DE.fi ? 'on' : ''}" onclick="deFrameGo(${i})">${i + 1}</button>`).join('')}
    <button onclick="deFrameAdd(true)" ${n >= DE_MAXF ? 'disabled' : ''}>⧉ 복제</button><button onclick="deFrameAdd(false)" ${n >= DE_MAXF ? 'disabled' : ''}>＋ 빈 장면</button>
    ${n > 1 ? `<button onclick="deFrameMove(-1)">◀</button><button onclick="deFrameMove(1)">▶</button><button onclick="deFrameDel()">🗑</button>
    <button class="${DE.onion ? 'on' : ''}" onclick="DE.onion=!DE.onion;deUI();deDraw()">🧅 앞 장면 비치기</button><button class="${DE.play ? 'on' : ''}" onclick="dePlay()">${DE.play ? '⏸ 멈춤' : '▶ 미리보기'}</button>
    <select onchange="DE.ms=+this.value;DE.editAt=Date.now();if(DE.play){deStop();dePlay()}">${[[120, '빠름'], [220, '보통'], [400, '느림'], [700, '아주 느림']].map(([v, tt]) => `<option value="${v}" ${DE.ms === v ? 'selected' : ''}>${tt}</option>`).join('')}</select>` : '<span class="muted" style="font-size:.78rem">장면 추가 = 움직임</span>'}`;
  $('#deTools').innerHTML = DE_TOOLS.map(([k, ic, nm]) => `<button class="${t === k ? 'on' : ''}" onclick="deTool('${k}')" title="${nm}">${ic} ${nm}</button>`).join('');
  const sz = ['pen', 'erase', 'dith'].includes(t) ? `<span class="muted">굵기</span>${[1, 2, 3, 5].map(v => `<button class="${DE.size === v ? 'on' : ''}" onclick="DE.size=${v};deUI()">${v}</button>`).join('')}` : '';
  const dith = t === 'dith' ? `<span class="muted">무늬</span>${[['체크', 0], ['성글게', 1], ['가로줄', 2]].map(([nm, v]) => `<button class="${DE.dith === v ? 'on' : ''}" onclick="DE.dith=${v};deUI()">${nm}</button>`).join('')}<span class="muted" style="font-size:.78rem">주색+보조색 (보조색 없으면 주색만 띄엄띄엄)</span>` : '';
  const grad = t === 'grad' ? `<span class="muted" style="font-size:.78rem">끌어서 주색→보조색${DE.col2 ? '' : '(없으면 점점 투명)'}. 선택 영역이 있으면 그 안, 없으면 같은 색으로 이어진 곳</span>` : '';
  const scope = t === 'swap' ? `<span class="muted" style="font-size:.78rem">누른 도트의 색 → 주색</span>${deScopeHtml()}` : '';
  const shp = ['rect', 'oval'].includes(t) ? `<button class="${DE.fillShape ? 'on' : ''}" onclick="DE.fillShape=!DE.fillShape;deUI()">${DE.fillShape ? '■ 채움' : '□ 테두리'}</button>` : '';
  const sel = t === 'sel' || DE.float ? (DE.float ? `<button class="on" onclick="deCommitFloat()">✔ 여기에 붙이기</button><button onclick="deFloatX('h')">⇋ 좌우</button><button onclick="deFloatX('v')">⇵ 상하</button><button onclick="deFloatX('r')">⟳ 90°</button><button onclick="deFloatX('2')">×2</button><button onclick="deFloatX('h2')">×½</button><button onclick="DE.float=null;deUI();deDraw()">✕ 취소</button>`
    : `<button onclick="deLift()" ${DE.sel ? '' : 'disabled'}>🖐 들어 옮기기</button><button onclick="deCopy(false)" ${DE.sel ? '' : 'disabled'}>📄 복사</button><button onclick="deCopy(true)" ${DE.sel ? '' : 'disabled'}>✂ 잘라내기</button><button onclick="deClearSel()" ${DE.sel ? '' : 'disabled'}>🧹 지우기</button><button onclick="dePaste()" ${DECLIP ? '' : 'disabled'}>📋 붙여넣기</button>${DE.sel ? '<button onclick="DE.sel=null;deUI();deDraw()">선택 풀기</button>' : ''}`) : '';
  const ref = DE.ref ? `<button class="${DE.ref.on ? 'on' : ''}" onclick="DE.ref.on=!DE.ref.on;deUI();deDraw()">👁 밑그림</button><span class="muted">투명</span><input type="range" min="5" max="100" value="${Math.round(DE.ref.a * 100)}" oninput="DE.ref.a=this.value/100;deDraw()">
    <span class="muted">크기</span><input type="range" min="5" max="400" value="${Math.round(DE.ref.s * 100)}" oninput="deRefScale(this.value/100)"><button onclick="deRefFit()">맞추기</button><button onclick="deSheet('conv')">🧩 도트로 바꾸기</button><button onclick="DE.ref=null;deUI();deDraw()">🗑</button>` : '';
  $('#deOpts').innerHTML = `${DE.o.orig ? '<button onclick="deToOrig()">↺ 원래 도트로</button>' : ''}${sz}${dith}${grad}${scope}${shp}${sel}<button class="${DE.mirror ? 'on' : ''}" onclick="DE.mirror=!DE.mirror;deUI();deDraw()">⇿ 좌우 대칭</button><button class="${DE.grid ? 'on' : ''}" onclick="DE.grid=!DE.grid;deUI();deDraw()"># 격자</button><button onclick="deFit()">⤢ 화면 맞춤</button>
    <button class="${DE.sheet === 'room' ? 'on' : ''}" onclick="deSheet('room')">🏠 방에서 보기</button><button class="${DE.sheet === 'fx' ? 'on' : ''}" onclick="deSheet('fx')">✨ 외곽선·그림자</button><button onclick="deRefPick()">📷 밑그림 올리기</button>${ref}<button onclick="deSheet('imp')">🪑 가구 불러오기</button><button onclick="deFlipAll()">⇋ 전체 뒤집기</button><button onclick="deClearAll()">🗑 이 레이어 지우기</button>`;
  deCols();
}
function deScopeHtml() { return `<label class="muted"><input type="checkbox" ${DE.scopeL ? 'checked' : ''} onchange="DE.scopeL=this.checked">모든 레이어</label>${deN() > 1 ? `<label class="muted"><input type="checkbox" ${DE.scopeF ? 'checked' : ''} onchange="DE.scopeF=this.checked">모든 장면</label>` : ''}`; }
function deCols() {
  if (!DE) return; const pals = dePals(), pal = pals[DE.pal];
  const all = pal ? pal.cols.slice() : [...new Set([...DE.recent, ...deUsed(), ...DE_PAL])].slice(0, 48);
  $('#deCols').innerHTML = `<label class="sw" style="background:${DE.col};position:relative;flex-basis:34px;width:34px;height:30px" title="주색"><input type="color" value="${DE.col}" style="opacity:0;position:absolute;inset:0;width:100%;height:100%" oninput="deSetCol(this.value)"></label>
    <label class="sw ${DE.col2 ? '' : 'none'}" style="${DE.col2 ? 'background:' + DE.col2 + ';' : ''}position:relative;flex-basis:22px;width:22px;height:22px" title="보조색"><input type="color" value="${DE.col2 || '#ffffff'}" style="opacity:0;position:absolute;inset:0;width:100%;height:100%" oninput="DE.col2=this.value.toLowerCase();deCols()"></label>
    <button onclick="[DE.col,DE.col2]=[DE.col2||DE.col,DE.col];deCols()" title="주색↔보조색">⇄</button><button onclick="DE.col2=null;deCols()" title="보조색 없애기">⌀</button>
    <button class="${DE.sheet === 'pal' ? 'on' : ''}" onclick="deSheet('pal')">🎨 ${pal ? esc(pal.name) : '팔레트'}</button>
    ${all.map(c => `<span class="sw ${c === DE.col ? 'on' : ''}" style="background:${c}" onclick="deSetCol('${c}')" oncontextmenu="event.preventDefault();DE.col2='${c}';deCols()"></span>`).join('')}`;
}
function deUsed() { const s = new Map(); DE.layers.forEach(L => L.frames.forEach(p => { for (let i = 0; i < p.length; i += 4) if (p[i + 3]) { const h = deToHex(p[i], p[i + 1], p[i + 2]); s.set(h, (s.get(h) || 0) + 1); } })); return [...s.entries()].sort((a, b) => b[1] - a[1]).slice(0, 32).map(x => x[0]); }
function deSetCol(c) { DE.col = c.toLowerCase(); DE.recent = [DE.col, ...DE.recent.filter(x => x !== DE.col)].slice(0, 8); if (DE.tool === 'erase' || DE.tool === 'pick') DE.tool = 'pen'; deUI(); }
function deTool(k) { if (DE.float && k !== 'sel' && k !== 'hand') deCommitFloat(); DE.tool = k; if (!['sel', 'grad', 'hand'].includes(k)) DE.sel = null; deUI(); deDraw(); }
function deFit() { const cv = $('#deCv'); if (!cv) return; const r = cv.getBoundingClientRect(); DE.z = Math.max(1, Math.min(40, Math.floor(Math.min((r.width - 16) / DE.W, (r.height - 16) / DE.H) * 10) / 10)); DE.ox = (r.width - DE.W * DE.z) / 2; DE.oy = (r.height - DE.H * DE.z) / 2; deDraw(); }

/* ---------- 아래 시트 (레이어 · 팔레트 · 효과 · 방 미리보기 · 변환 · 불러오기) ---------- */
function deSheet(k) { const sh = $('#deSheet'); clearInterval(DE.roomT); if (!k || DE.sheet === k) { DE.sheet = ''; sh.style.display = 'none'; deUI(); return; } DE.sheet = k; sh.style.display = 'block'; deSheetBody(); deUI(); }
function deSheetBody() {
  const sh = $('#deSheet'), k = DE.sheet; if (!sh || !k) return; clearInterval(DE.roomT);
  const close = `<button onclick="deSheet('')">닫기</button>`;
  if (k === 'lay') {
    sh.innerHTML = `<div class="row" style="justify-content:space-between;align-items:center"><b>🗂 레이어</b><span class="muted" style="font-size:.78rem">위가 앞쪽 · 모든 장면이 같이 씀</span></div>
      ${DE.layers.map((L, i) => ({ L, i })).reverse().map(({ L, i }) => `<div class="lrow ${i === DE.li ? 'on' : ''}" onclick="deLayerGo(${i})"><canvas width="${DE.W}" height="${DE.H}" data-li="${i}"></canvas>
        <div style="flex:1;min-width:0"><b style="font-size:.9rem">${esc(L.name)}</b>${i === DE.li ? `<div class="row" style="gap:4px;align-items:center" onclick="event.stopPropagation()"><span class="muted" style="font-size:.75rem">투명도</span><input type="range" min="0" max="100" value="${Math.round((L.op == null ? 1 : L.op) * 100)}" oninput="deL().op=this.value/100;DE.dirty=true;DE.editAt=Date.now();deDraw()" style="flex:1;width:auto"></div>` : `<div class="muted" style="font-size:.72rem">${Math.round((L.op == null ? 1 : L.op) * 100)}%</div>`}</div>
        <button class="sm ${L.vis ? '' : 'on'}" onclick="event.stopPropagation();DE.layers[${i}].vis=!DE.layers[${i}].vis;DE.editAt=Date.now();deSheetBody();deUI();deDraw()">${L.vis ? '👁' : '🙈'}</button>
        <button class="sm ${L.lock ? 'on' : ''}" onclick="event.stopPropagation();DE.layers[${i}].lock=!DE.layers[${i}].lock;deSheetBody();deUI()">${L.lock ? '🔒' : '🔓'}</button></div>`).join('')}
      <div class="row" style="gap:4px;flex-wrap:wrap;margin-top:6px"><button onclick="deLayerAdd(false)">＋ 새 레이어</button><button onclick="deLayerAdd(true)">⧉ 복제</button><button onclick="deLayerMove(1)">▲ 위로</button><button onclick="deLayerMove(-1)">▼ 아래로</button>
        <button onclick="deLayerMerge()">⤓ 아래로 합치기</button><button onclick="deLayerRename()">✏ 이름</button><button class="danger" onclick="deLayerDel()">🗑</button>${close}</div>`;
    sh.querySelectorAll('canvas[data-li]').forEach(c => { const L = DE.layers[+c.dataset.li]; c.getContext('2d').putImageData(new ImageData(L.frames[DE.fi].slice(), DE.W, DE.H), 0, 0); });
  }
  if (k === 'pal') {
    const pals = dePals();
    sh.innerHTML = `<b>🎨 내 팔레트</b><p class="muted" style="margin:4px 0;font-size:.8rem">길게 누르기 → 보조색 · 다른 가구에서도 사용</p>
      <div class="lrow ${DE.pal < 0 ? 'on' : ''}" onclick="DE.pal=-1;deSheetBody();deCols()"><b style="flex:1">기본 (최근·그림에 쓴 색)</b></div>
      ${pals.map((p, i) => `<div class="lrow ${DE.pal === i ? 'on' : ''}" onclick="DE.pal=${i};deSheetBody();deCols()"><div style="flex:1;min-width:0"><b>${esc(p.name)}</b><div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:2px">${p.cols.slice(0, 32).map(c => `<span style="width:12px;height:12px;display:inline-block;background:${c};border:1px solid #0006"></span>`).join('')}</div></div>
        <button class="sm" onclick="event.stopPropagation();dePalAdd(${i})">＋ 주색</button><button class="sm danger" onclick="event.stopPropagation();dePalDel(${i})">🗑</button></div>`).join('')}
      <div class="row" style="gap:4px;margin-top:6px"><button class="primary" onclick="dePalNew()">＋ 지금 그림 색으로 새 팔레트</button>${close}</div>`;
  }
  if (k === 'fx') sh.innerHTML = `<b>✨ 외곽선 · 그림자</b>
    <p class="muted" style="margin:6px 0 2px;font-size:.82rem"><b>외곽선</b> — 지금 레이어 그림 바깥에 주색으로 1도트 테두리를 두름.</p>
    <div class="row" style="gap:4px;flex-wrap:wrap;align-items:center"><button onclick="deOutline(false)">✒ 바깥 테두리</button><button onclick="deOutline(true)">✒ 대각선까지</button>${deN() > 1 ? `<label class="muted"><input type="checkbox" ${DE.scopeF ? 'checked' : ''} onchange="DE.scopeF=this.checked">모든 장면</label>` : ''}</div>
    <p class="muted" style="margin:10px 0 2px;font-size:.82rem"><b>그림자</b> — 맨 아래에 반투명 그림자 레이어를 새로 만듦 (투명도는 레이어에서 조절).</p>
    <div class="row" style="gap:4px;flex-wrap:wrap"><button onclick="deShadow('floor')">🌑 바닥 타원 그림자</button><button onclick="deShadow('drop')">🌘 오른쪽 아래 그림자</button>${close}</div>`;
  if (k === 'room') { sh.innerHTML = `<div class="row" style="justify-content:space-between;align-items:center"><b>🏠 방에 놓인 모습</b>${close}</div><div style="display:flex;gap:10px;align-items:flex-end;overflow-x:auto;margin-top:6px"><div style="text-align:center"><canvas id="deRm1" style="image-rendering:pixelated"></canvas><div class="muted" style="font-size:.75rem">실제 크기</div></div><div style="text-align:center"><canvas id="deRm2" style="image-rendering:pixelated"></canvas><div class="muted" style="font-size:.75rem">2배</div></div></div>`;
    deRoomPrev(); DE.roomT = setInterval(deRoomPrev, Math.max(120, DE.ms)); }
  if (k === 'conv') sh.innerHTML = `<b>🧩 밑그림을 도트로 바꾸기</b><p class="muted" style="margin:4px 0">밑그림 → 도트 변환 · 현재 레이어 덮어씀</p>
    <div class="row" style="align-items:center;gap:6px;flex-wrap:wrap"><span>색 수</span><select id="deCn">${[4, 8, 12, 16, 24, 32].map(n => `<option ${n === 16 ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <label><input type="checkbox" id="deBg" checked> 배경 지우기</label><label><input type="checkbox" id="deOl"> 테두리 진하게</label></div>
    <div class="row" style="margin-top:8px">${close}<button class="primary" onclick="deConvert()">바꾸기</button></div>`;
  if (k === 'imp') { const ks = Object.keys(FURN).filter(x => FURN[x].hi || FURN[x].custom);
    sh.innerHTML = `<b>🪑 가구 불러오기</b><p class="muted" style="margin:4px 0">위치 조정 후 「여기에 붙이기」</p>
      <select id="deImpK" style="width:100%">${ks.map(x => `<option value="${x}">${esc(FURN[x].name)}${FURN[x].custom ? ' ✏' : ''}</option>`).join('')}</select>
      <div class="row" style="margin-top:6px;gap:6px"><select id="deImpD"><option value="0">앞</option><option value="1">왼쪽</option><option value="2">뒤</option><option value="3">오른쪽</option></select>${close}<button class="primary" onclick="deImport()">불러오기</button></div>`; }
}

/* ---------- 그리기 ---------- */
function deDraw() {
  if (!DE) return; const cv = $('#deCv'); if (!cv) return; const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
  const { W, H, z, ox, oy } = DE;
  g.fillStyle = '#2a2420'; g.fillRect(ox, oy, W * z, H * z); g.fillStyle = '#332c27'; const ck = Math.max(z * 4, 8);
  for (let y = 0; y < H * z; y += ck) for (let x = (Math.floor(y / ck) % 2) * ck; x < W * z; x += ck * 2) g.fillRect(ox + x, oy + y, Math.min(ck, W * z - x), Math.min(ck, H * z - y));
  if (DE.ref && DE.ref.on && DE.ref.img) { g.save(); g.globalAlpha = DE.ref.a; g.imageSmoothingEnabled = !DE.ref.crisp; g.drawImage(DE.ref.img, ox + DE.ref.x * z, oy + DE.ref.y * z, DE.ref.img.width * DE.ref.s * z, DE.ref.img.height * DE.ref.s * z); g.restore(); }
  const tmp = deTmp();
  if (DE.onion && !DE.play && deN() > 1) { tmp.getContext('2d').putImageData(new ImageData(deComp((DE.fi + deN() - 1) % deN()), W, H), 0, 0); g.save(); g.globalAlpha = .3; g.imageSmoothingEnabled = false; g.drawImage(tmp, ox, oy, W * z, H * z); g.restore(); }
  const px = DE.play ? deComp(DE.showFi) : deComp(DE.fi, DE.preview || DE.px);
  tmp.getContext('2d').putImageData(new ImageData(px, W, H), 0, 0); g.imageSmoothingEnabled = false; g.drawImage(tmp, ox, oy, W * z, H * z);
  if (DE.float) { const f = DE.float, ft = document.createElement('canvas'); ft.width = f.w; ft.height = f.h; ft.getContext('2d').putImageData(new ImageData(f.d.slice(), f.w, f.h), 0, 0); g.drawImage(ft, ox + f.x * z, oy + f.y * z, f.w * z, f.h * z);
    g.strokeStyle = '#ffe08a'; g.setLineDash([4, 3]); g.strokeRect(ox + f.x * z + .5, oy + f.y * z + .5, f.w * z - 1, f.h * z - 1); g.setLineDash([]); }
  if (DE.grid && z >= 6) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= W; x++) { g.moveTo(ox + x * z + .5, oy); g.lineTo(ox + x * z + .5, oy + H * z); } for (let y = 0; y <= H; y++) { g.moveTo(ox, oy + y * z + .5); g.lineTo(ox + W * z, oy + y * z + .5); } g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.beginPath(); for (let x = 0; x <= W; x += 32) { g.moveTo(ox + x * z + .5, oy); g.lineTo(ox + x * z + .5, oy + H * z); } g.stroke(); }
  if (DE.o.foot) { const fy = oy + (H - DE.o.foot) * z; g.strokeStyle = 'rgba(120,220,140,.55)'; g.setLineDash([6, 4]); g.strokeRect(ox + .5, fy + .5, W * z - 1, DE.o.foot * z - 1); g.setLineDash([]); }
  if (DE.mirror) { g.strokeStyle = 'rgba(255,120,160,.6)'; g.beginPath(); g.moveTo(ox + W * z / 2, oy - 6); g.lineTo(ox + W * z / 2, oy + H * z + 6); g.stroke(); }
  if (DE.sel) { const s = DE.sel; g.strokeStyle = '#fff'; g.setLineDash([4, 3]); g.strokeRect(ox + s.x * z + .5, oy + s.y * z + .5, s.w * z - 1, s.h * z - 1); g.strokeStyle = '#000'; g.lineDashOffset = 3; g.strokeRect(ox + s.x * z + .5, oy + s.y * z + .5, s.w * z - 1, s.h * z - 1); g.setLineDash([]); g.lineDashOffset = 0; }
  if (DE.drag && DE.drag.grad && DE.drag.b) { const a = DE.drag.a, b = DE.drag.b; g.strokeStyle = '#fff'; g.lineWidth = 2; g.beginPath(); g.moveTo(ox + (a.x + .5) * z, oy + (a.y + .5) * z); g.lineTo(ox + (b.x + .5) * z, oy + (b.y + .5) * z); g.stroke(); g.lineWidth = 1; }
  g.strokeStyle = '#8a7050'; g.strokeRect(ox - .5, oy - .5, W * z + 1, H * z + 1);
  const inf = $('#deInfo'); if (inf) inf.textContent = (DE.hov ? `${DE.hov.x},${DE.hov.y} · ` : '') + `${Math.round(z * 100) / 100}배` + (deN() > 1 ? ` · 장면 ${(DE.play ? DE.showFi : DE.fi) + 1}/${deN()}` : '') + (DE.layers.length > 1 ? ` · ${deL().name}` : '');
}
let DE_TMP = null; function deTmp() { if (!DE_TMP || DE_TMP.width !== DE.W || DE_TMP.height !== DE.H) { DE_TMP = document.createElement('canvas'); DE_TMP.width = DE.W; DE_TMP.height = DE.H; } return DE_TMP; }
function deRoomPrev() {
  const c1 = document.getElementById('deRm1'), c2 = document.getElementById('deRm2'); if (!c1 || !DE) { if (DE) clearInterval(DE.roomT); return; }
  const fi = deN() > 1 ? Math.floor(Date.now() / DE.ms) % deN() : DE.fi, im = document.createElement('canvas'); im.width = DE.W; im.height = DE.H; im.getContext('2d').putImageData(new ImageData(fi === DE.fi ? deComp(fi, DE.px) : deComp(fi), DE.W, DE.H), 0, 0);
  const w = DE.W / 2, h = DE.H / 2, foot = (DE.o.foot || 0) / 2, cw = Math.max(w + 64, 128), wallH = 64, floorH = Math.max(64, foot + 40), ch = Math.max(wallH + floorH, h + 40);
  [[c1, 1], [c2, 2]].forEach(([c, s]) => { c.width = cw * s; c.height = ch * s; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.setTransform(s, 0, 0, s, 0, 0);
    const wy = ch - floorH; g.fillStyle = '#4a3a2e'; g.fillRect(0, 0, cw, wy); g.fillStyle = '#433428'; for (let x = 0; x < cw; x += 16) g.fillRect(x, 0, 1, wy);
    g.fillStyle = '#6a4a30'; g.fillRect(0, wy - 5, cw, 5); g.fillStyle = '#c48a55'; g.fillRect(0, wy, cw, floorH);
    g.fillStyle = '#b07a48'; for (let y = wy; y < ch; y += 16) { g.fillRect(0, y, cw, 1); for (let x = (((y - wy) / 16) % 2) * 24; x < cw; x += 48) g.fillRect(x, y, 1, 16); }
    const x = Math.round((cw - w) / 2), y = DE.o.foot ? Math.round(wy + 16 + foot - h) : Math.round(Math.max(2, wy - 12 - h));
    g.drawImage(im, x, y, w, h); });
}

/* ---------- 도트 쓰기 ---------- */
function deEditable() { const L = deL(); if (L.lock) { toast('🔒 잠긴 레이어'); return false; } if (!L.vis) { toast('🙈 숨긴 레이어에는 그릴 수 없음'); return false; } return true; }
function dePatt(X, Y) { const d = DE.dith; return d === 1 ? (X % 2 === 0 && Y % 2 === 0) : d === 2 ? Y % 2 === 0 : (X + Y) % 2 === 0; }
function deSet(px, x, y, rgb, mir) {
  const { W, H } = DE, s = DE.size || 1, o = Math.floor((s - 1) / 2);
  const put = (X, Y, c) => { const k = (Y * W + X) * 4; if (c) { px[k] = c[0]; px[k + 1] = c[1]; px[k + 2] = c[2]; px[k + 3] = 255; } else px[k + 3] = px[k] = px[k + 1] = px[k + 2] = 0; };
  const one = (x, y) => { for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const X = x - o + i, Y = y - o + j; if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
    if (typeof rgb === 'function') { const c = rgb(X, Y); if (c !== undefined) put(X, Y, c); } else put(X, Y, rgb); } };
  one(x, y); if (mir !== false && DE.mirror) one(W - 1 - x, y);
}
const deDithFn = () => { const a = deHex(DE.col), b = DE.col2 ? deHex(DE.col2) : undefined; return (X, Y) => dePatt(X, Y) ? a : b; };
function deLine(px, x0, y0, x1, y1, rgb) { const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (let n = 0; n < 2000; n++) { deSet(px, x0, y0, rgb); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
function deRect(px, a, b, rgb, fill) { const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (fill || y === y0 || y === y1 || x === x0 || x === x1) deSet(px, x, y, rgb); }
function deOval(px, a, b, rgb, fill) { const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2 + .5, ry = (y1 - y0) / 2 + .5;
  const inside = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(x, y) && (fill || !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1))) deSet(px, x, y, rgb); }
/* 같은 색으로 이어진 곳 (지금 레이어) */
function deRegion(x, y) {
  const { W, H, px } = DE, k0 = (y * W + x) * 4, t = [px[k0], px[k0 + 1], px[k0 + 2], px[k0 + 3]], m = new Uint8Array(W * H);
  const same = k => t[3] === 0 ? px[k + 3] === 0 : px[k + 3] && px[k] === t[0] && px[k + 1] === t[1] && px[k + 2] === t[2];
  const st = [[x, y]]; while (st.length) { const [cx, cy] = st.pop(); if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue; const i = cy * W + cx; if (m[i] || !same(i * 4)) continue; m[i] = 1; st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]); }
  return m;
}
function deFlood(x, y, rgb) { const m = deRegion(x, y), ss = DE.size; DE.size = 1; for (let i = 0; i < m.length; i++) if (m[i]) deSet(DE.px, i % DE.W, Math.floor(i / DE.W), rgb, false); DE.size = ss; }
function deGradient(a, b) {
  const { W } = DE; let m;
  if (DE.sel) { m = new Uint8Array(DE.W * DE.H); const s = DE.sel; for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) m[y * W + x] = 1; } else m = deRegion(a.x, a.y);
  const c1 = deHex(DE.col), c2 = DE.col2 ? deHex(DE.col2) : null, dx = b.x - a.x, dy = b.y - a.y, len = dx * dx + dy * dy || 1;
  dePush(); for (let i = 0; i < m.length; i++) { if (!m[i]) continue; const x = i % W, y = Math.floor(i / W), t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / len)), th = (DE_BAYER[y % 4][x % 4] + .5) / 16, k = i * 4, c = t > th ? c2 : c1;
    if (c) { DE.px[k] = c[0]; DE.px[k + 1] = c[1]; DE.px[k + 2] = c[2]; DE.px[k + 3] = 255; } else DE.px[k] = DE.px[k + 1] = DE.px[k + 2] = DE.px[k + 3] = 0; }
  deDraw(); deCols();
}
/* 범위: 지금 레이어·장면, 또는 모든 레이어/장면 (잠긴 레이어 빼고) */
function deTargets(allL, allF) { const out = []; DE.layers.forEach((L, li) => { if (!allL && li !== DE.li) return; if (L.lock) return; L.frames.forEach((_, fi) => { if (!allF && fi !== DE.fi) return; out.push({ li, fi }); }); }); return out; }
function deSwap(x, y) {
  const k = (y * DE.W + x) * 4, p = DE.scopeL ? deComp(DE.fi) : DE.px; if (!p[k + 3]) return toast('빈 칸'); const from = [p[k], p[k + 1], p[k + 2]], to = deHex(DE.col);
  const tg = deTargets(DE.scopeL, DE.scopeF); if (!tg.length) return toast('🔒 잠긴 레이어'); dePush(tg); let n = 0;
  tg.forEach(({ li, fi }) => { const a = DE.layers[li].frames[fi]; for (let i = 0; i < a.length; i += 4) if (a[i + 3] && a[i] === from[0] && a[i + 1] === from[1] && a[i + 2] === from[2]) { a[i] = to[0]; a[i + 1] = to[1]; a[i + 2] = to[2]; n++; } });
  deDraw(); deCols(); toast(n ? `${n}도트 변경 완료` : '바꿀 도트가 없음');
}
function deOutline(diag) {
  if (!deEditable()) return; const tg = deTargets(false, DE.scopeF), c = deHex(DE.col), { W, H } = DE; dePush(tg);
  const nb = diag ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]] : [[1, 0], [-1, 0], [0, 1], [0, -1]];
  tg.forEach(({ li, fi }) => { const a = DE.layers[li].frames[fi], src = a.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (y * W + x) * 4; if (src[k + 3]) continue;
    if (nb.some(([dx, dy]) => { const X = x + dx, Y = y + dy; return X >= 0 && Y >= 0 && X < W && Y < H && src[(Y * W + X) * 4 + 3]; })) { a[k] = c[0]; a[k + 1] = c[1]; a[k + 2] = c[2]; a[k + 3] = 255; } } });
  deSync(); deSheet(''); deDraw(); deCols(); toast('외곽선을 그림');
}
function deShadow(kind) {
  if (DE.layers.length >= DE_MAXL) return toast(`레이어는 ${DE_MAXL}장까지`); const { W, H } = DE, n = deN(), L = deNewLayer(kind === 'floor' ? '바닥 그림자' : '그림자', n); L.op = kind === 'floor' ? .35 : .3;
  for (let f = 0; f < n; f++) { const comp = deComp(f), a = L.frames[f];
    if (kind === 'floor') { let x0 = W, x1 = -1, y1 = -1; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (comp[(y * W + x) * 4 + 3]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } if (x1 < 0) continue;
      const cx = (x0 + x1) / 2, rx = (x1 - x0) / 2 + 3, ry = Math.max(3, Math.round((DE.o.foot || 24) / 5)), cy = Math.min(H - 1 - ry, y1 - Math.round(ry / 2));
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) a[(y * W + x) * 4 + 3] = 255; }
    else { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const X = x - 2, Y = y - 2; if (X >= 0 && Y >= 0 && comp[(Y * W + X) * 4 + 3]) a[(y * W + x) * 4 + 3] = 255; } }
    for (let i = 0; i < a.length; i += 4) if (a[i + 3]) { a[i] = 20; a[i + 1] = 12; a[i + 2] = 8; } }
  DE.layers.unshift(L); DE.li++; deStruct(); deSync(); deSheet(''); deUI(); deDraw(); toast('맨 아래에 그림자 레이어를 만듦');
}

/* ---------- 되돌리기 (여러 레이어·장면 한꺼번에) ---------- */
function dePush(tg) { tg = tg || [{ li: DE.li, fi: DE.fi }]; DE.undo.push(tg.map(t => ({ li: t.li, fi: t.fi, px: DE.layers[t.li].frames[t.fi].slice() }))); if (DE.undo.length > 50) DE.undo.shift(); DE.redo = []; DE.dirty = true; DE.editAt = Date.now(); }
function deUndoStep(from, to) { if (!DE || !from.length) return; deStop(); const e = from.pop(); to.push(e.map(t => ({ li: t.li, fi: t.fi, px: DE.layers[t.li] ? DE.layers[t.li].frames[t.fi].slice() : null })));
  e.forEach(t => { if (DE.layers[t.li] && t.px) DE.layers[t.li].frames[t.fi] = t.px; }); const f = e[0]; if (DE.layers[f.li]) { DE.li = f.li; DE.fi = f.fi; } deSync(); DE.editAt = Date.now(); deUI(); deDraw(); if (DE.sheet === 'lay') deSheetBody(); }
function deUndo() { DE && deUndoStep(DE.undo, DE.redo); }
function deRedo() { DE && deUndoStep(DE.redo, DE.undo); }
function dePickAt(x, y) {
  const k = (y * DE.W + x) * 4, p = deComp(DE.fi);
  if (p[k + 3]) return deToHex(p[k], p[k + 1], p[k + 2]);
  const R = DE.ref; if (R && R.on && R.data) { const rx = Math.floor((x + .5 - R.x) / R.s), ry = Math.floor((y + .5 - R.y) / R.s); if (rx >= 0 && ry >= 0 && rx < R.img.width && ry < R.img.height) { const j = (ry * R.img.width + rx) * 4, d = R.data; if (d[j + 3] > 20) return deToHex(d[j], d[j + 1], d[j + 2]); } }
  return null;
}

/* ---------- 선택 · 붙여넣기 · 변형 ---------- */
function deCut(s) { const { W, px } = DE, d = new Uint8ClampedArray(s.w * s.h * 4); for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const a = ((s.y + y) * W + s.x + x) * 4, b = (y * s.w + x) * 4; for (let k = 0; k < 4; k++) d[b + k] = px[a + k]; } return { w: s.w, h: s.h, d }; }
function deCopy(cut) { if (!DE.sel) return; if (cut && !deEditable()) return; DECLIP = deCut(DE.sel); if (cut) { dePush(); deClearRect(DE.sel); } toast(cut ? '잘라냄' : '복사 완료'); deUI(); deDraw(); }
function deLift() { if (!DE.sel || !deEditable()) return; const c = deCut(DE.sel); dePush(); deClearRect(DE.sel); DE.float = { w: c.w, h: c.h, d: c.d, x: DE.sel.x, y: DE.sel.y }; DE.sel = null; deUI(); deDraw(); }
function deClearRect(s) { for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) { const k = (y * DE.W + x) * 4; DE.px[k] = DE.px[k + 1] = DE.px[k + 2] = DE.px[k + 3] = 0; } }
function deClearSel() { if (!DE.sel || !deEditable()) return; dePush(); deClearRect(DE.sel); deDraw(); }
function dePaste() { if (!DECLIP) return; const s = DE.sel; DE.float = { w: DECLIP.w, h: DECLIP.h, d: DECLIP.d.slice(), x: s ? s.x : Math.max(0, Math.round((DE.W - DECLIP.w) / 2)), y: s ? s.y : Math.max(0, DE.H - DECLIP.h) }; DE.tool = 'sel'; DE.sel = null; deUI(); deDraw(); }
function deFloatX(m) {
  const f = DE.float; if (!f) return; let w = f.w, h = f.h, d;
  const get = (x, y) => (y * f.w + x) * 4;
  if (m === 'h' || m === 'v') { d = new Uint8ClampedArray(f.d.length); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = get(x, y), b = m === 'h' ? get(w - 1 - x, y) : get(x, h - 1 - y); for (let k = 0; k < 4; k++) d[b + k] = f.d[a + k]; } }
  else if (m === 'r') { w = f.h; h = f.w; d = new Uint8ClampedArray(f.d.length); for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const a = get(x, y), b = (x * w + (f.h - 1 - y)) * 4; for (let k = 0; k < 4; k++) d[b + k] = f.d[a + k]; } }
  else if (m === '2') { if (f.w * 2 > 512 || f.h * 2 > 512) return toast('너무 큼'); w = f.w * 2; h = f.h * 2; d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = get(x >> 1, y >> 1), b = (y * w + x) * 4; for (let k = 0; k < 4; k++) d[b + k] = f.d[a + k]; } }
  else if (m === 'h2') { if (f.w < 2 || f.h < 2) return; w = f.w >> 1; h = f.h >> 1; d = new Uint8ClampedArray(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = get(x * 2, y * 2), b = (y * w + x) * 4; for (let k = 0; k < 4; k++) d[b + k] = f.d[a + k]; } }
  const cx = f.x + f.w / 2, cy = f.y + f.h / 2; Object.assign(f, { w, h, d, x: Math.round(cx - w / 2), y: Math.round(cy - h / 2) }); deDraw();
}
function deCommitFloat() { const f = DE.float; if (!f) return; if (deL().lock) { toast('🔒 잠긴 레이어라 붙일 수 없음'); return; } dePush(); for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const X = f.x + x, Y = f.y + y; if (X < 0 || Y < 0 || X >= DE.W || Y >= DE.H) continue; const a = (y * f.w + x) * 4; if (!f.d[a + 3]) continue; const b = (Y * DE.W + X) * 4; for (let k = 0; k < 3; k++) DE.px[b + k] = f.d[a + k]; DE.px[b + 3] = 255; }
  DE.float = null; deUI(); deDraw(); deCols(); }
function deFlipAll() { const tg = deTargets(true, false); if (!tg.length) return; dePush(tg); const { W, H } = DE; tg.forEach(({ li, fi }) => { const a = DE.layers[li].frames[fi], d = a.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const s = (y * W + x) * 4, t = (y * W + W - 1 - x) * 4; for (let k = 0; k < 4; k++) a[t + k] = d[s + k]; } }); deDraw(); }
function deClearAll() { if (!deEditable()) return; if (!confirm(`「${deL().name}」 레이어의 이 장면을 전부 지울까? (되돌리기 가능)`)) return; dePush(); DE.px.fill(0); deDraw(); deCols(); }
function deImport() {
  const k = $('#deImpK').value, dir = +$('#deImpD').value, f = FURN[k]; if (!f) return; const dm = dimsOf(k, dir), w = dm.w * 64, h = Math.round(dm.h * 2);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; snapCtx(g, 2);
  const go = () => { g.clearRect(0, 0, w, h); drawSprite(g, k, 0, 0, 0, null, null, dir); const d = g.getImageData(0, 0, w, h).data;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] < 128) d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; else d[i + 3] = 255;
    DE.float = { w, h, d, x: Math.round((DE.W - w) / 2), y: DE.H - h }; DE.tool = 'sel'; deSheet(''); deUI(); deDraw(); };
  go(); if (f.custom) setTimeout(go, 400);
}

/* ---------- 내 팔레트 (내 기록에 저장 · 다른 기기·다른 가구에서도) ---------- */
function dePals() { try { if (typeof P !== 'undefined' && P && P.pals) return P.pals; return JSON.parse(localStorage.getItem('peccata_pals') || '[]'); } catch (e) { return []; } }
function dePalsSave(l) { l = l.slice(0, 12); if (typeof P !== 'undefined' && P && typeof saveP === 'function') { P.pals = l; saveP(); } else try { localStorage.setItem('peccata_pals', JSON.stringify(l)); } catch (e) {} }
function dePalNew() { const cols = deUsed().slice(0, 32); if (!cols.length) return toast('아직 쓴 색이 없음'); const l = dePals().slice(); if (l.length >= 12) return toast('팔레트는 12개까지'); const nm = prompt('팔레트 이름', '팔레트 ' + (l.length + 1)); if (!nm) return; l.push({ name: nm.trim().slice(0, 16), cols }); dePalsSave(l); DE.pal = l.length - 1; deSheetBody(); deCols(); }
function dePalAdd(i) { const l = dePals().slice(), p = l[i]; if (!p) return; if (p.cols.includes(DE.col)) return toast('이미 있는 색'); if (p.cols.length >= 32) return toast('32색까지'); l[i] = { name: p.name, cols: [...p.cols, DE.col] }; dePalsSave(l); deSheetBody(); deCols(); }
function dePalDel(i) { const l = dePals().slice(); if (!confirm(`「${l[i].name}」 팔레트를 지울까?`)) return; l.splice(i, 1); dePalsSave(l); DE.pal = -1; deSheetBody(); deCols(); }

/* ---------- 밑그림 ---------- */
function deRefPick() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); let data = null; try { data = g.getImageData(0, 0, im.width, im.height).data; } catch (e) {}
    DE.ref = { img: im, data, a: .45, on: true, x: 0, y: 0, s: 1 }; deRefFit(); DE.tool = 'ref'; deUI(); toast('밑그림을 깖. 「밑그림 옮기기」로 위치를 맞춤'); }; im.src = rd.result; }; rd.readAsDataURL(f); };
  inp.click();
}
function deRefFit() { const R = DE.ref; if (!R) return; R.s = Math.min(DE.W / R.img.width, DE.H / R.img.height); R.x = (DE.W - R.img.width * R.s) / 2; R.y = DE.H - R.img.height * R.s; deUI(); deDraw(); }
function deRefScale(s) { const R = DE.ref; if (!R) return; const cx = R.x + R.img.width * R.s / 2, by = R.y + R.img.height * R.s; R.s = Math.max(.02, s); R.x = cx - R.img.width * R.s / 2; R.y = by - R.img.height * R.s; deDraw(); }
function deConvert() {
  const R = DE.ref; if (!R || !deEditable()) return; const n = +$('#deCn').value, bg = $('#deBg').checked, ol = $('#deOl').checked, { W, H } = DE;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(R.img, R.x, R.y, R.img.width * R.s, R.img.height * R.s); const d = g.getImageData(0, 0, W, H).data;
  if (bg) { const k0 = [d[0], d[1], d[2]], near = i => Math.abs(d[i] - k0[0]) + Math.abs(d[i + 1] - k0[1]) + Math.abs(d[i + 2] - k0[2]) < 60, seen = new Uint8Array(W * H), st = [];
    for (let x = 0; x < W; x++) st.push([x, 0], [x, H - 1]); for (let y = 0; y < H; y++) st.push([0, y], [W - 1, y]);
    while (st.length) { const [x, y] = st.pop(); if (x < 0 || y < 0 || x >= W || y >= H) continue; const i = y * W + x; if (seen[i]) continue; seen[i] = 1; const j = i * 4; if (d[j + 3] < 128 || near(j)) { d[j + 3] = 0; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); } } }
  const pts = []; for (let i = 0; i < d.length; i += 4) if (d[i + 3] >= 128) pts.push(i);
  if (!pts.length) return toast('바꿀 그림이 없음 (밑그림이 칸 밖에 있음)');
  let cen = []; const step = Math.max(1, Math.floor(pts.length / n)); for (let k = 0; k < n; k++) { const i = pts[Math.min(pts.length - 1, k * step + (step >> 1))]; cen.push([d[i], d[i + 1], d[i + 2]]); }
  const lab = new Int16Array(pts.length);
  for (let it = 0; it < 8; it++) { const sum = cen.map(() => [0, 0, 0, 0]);
    pts.forEach((i, pi) => { let b = 0, bd = 1e9; for (let k = 0; k < cen.length; k++) { const e = (d[i] - cen[k][0]) ** 2 + (d[i + 1] - cen[k][1]) ** 2 + (d[i + 2] - cen[k][2]) ** 2; if (e < bd) { bd = e; b = k; } } lab[pi] = b; const s = sum[b]; s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; s[3]++; });
    cen = cen.map((c, k) => sum[k][3] ? [sum[k][0] / sum[k][3], sum[k][1] / sum[k][3], sum[k][2] / sum[k][3]] : c); }
  dePush(); DE.px.fill(0); pts.forEach((i, pi) => { const c = cen[lab[pi]]; DE.px[i] = c[0]; DE.px[i + 1] = c[1]; DE.px[i + 2] = c[2]; DE.px[i + 3] = 255; });
  if (ol) { const src = DE.px.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (y * W + x) * 4; if (!src[k + 3]) continue; const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X = x + a, Y = y + b; return X < 0 || Y < 0 || X >= W || Y >= H || !src[(Y * W + X) * 4 + 3]; });
    if (edge) { DE.px[k] = Math.round(src[k] * .35); DE.px[k + 1] = Math.round(src[k + 1] * .3); DE.px[k + 2] = Math.round(src[k + 2] * .3); } } }
  R.on = false; deSheet(''); deUI(); deDraw(); toast('도트로 변경 완료! 마음에 안 들면 ↶');
}

/* ---------- 입력 ---------- */
function deAt(e) { const r = $('#deCv').getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top; return { sx, sy, x: Math.floor((sx - DE.ox) / DE.z), y: Math.floor((sy - DE.oy) / DE.z), fx: (sx - DE.ox) / DE.z, fy: (sy - DE.oy) / DE.z }; }
function deIn(p) { return p.x >= 0 && p.y >= 0 && p.x < DE.W && p.y < DE.H; }
const deClamp = p => ({ x: Math.max(0, Math.min(DE.W - 1, p.x)), y: Math.max(0, Math.min(DE.H - 1, p.y)) });
function deZoom(f, sx, sy) { const z = Math.max(.5, Math.min(48, DE.z * f)); DE.ox = sx - (sx - DE.ox) * z / DE.z; DE.oy = sy - (sy - DE.oy) * z / DE.z; DE.z = z; deDraw(); }
function deKey(e) {
  if (!DE || /INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || '')) return; const c = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (c && k === 'z') { e.preventDefault(); e.shiftKey ? deRedo() : deUndo(); return; } if (c && k === 'y') { e.preventDefault(); deRedo(); return; }
  if (c && k === 'c') { deCopy(false); return; } if (c && k === 'x') { deCopy(true); return; } if (c && k === 'v') { dePaste(); return; }
  if (k === 'x' && !c) { [DE.col, DE.col2] = [DE.col2 || DE.col, DE.col]; deCols(); return; }
  const m = { b: 'pen', p: 'pen', e: 'erase', g: 'fill', i: 'pick', l: 'line', r: 'rect', o: 'oval', d: 'dith', m: 'sel', h: 'hand' }[k]; if (m && !c) deTool(m);
  if (e.key === 'Enter' && DE.float) deCommitFloat(); if (e.key === 'Escape') { DE.float = null; DE.sel = null; deUI(); deDraw(); }
}
function deBind() {
  const cv = $('#deCv'); window.addEventListener('keydown', deKey);
  new ResizeObserver(() => DE && deDraw()).observe(cv);
  cv.addEventListener('wheel', e => { e.preventDefault(); const p = deAt(e); deZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.sx, p.sy); }, { passive: false });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    if (DE.play) deStop(); cv.setPointerCapture(e.pointerId); DE.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (DE.ptr.size === 2) { if (DE.drag && DE.drag.snap) { deSetPx(DE.drag.snap); DE.undo.pop(); } DE.preview = null; const [a, b] = [...DE.ptr.values()];
      DE.drag = { pinch: true, d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; deDraw(); return; }
    if (DE.ptr.size > 2) return;
    const p = deAt(e), t = (e.button === 1 || e.button === 2) ? 'hand' : DE.tool;
    if (t === 'hand') { DE.drag = { pan: true, sx: e.clientX, sy: e.clientY, ox: DE.ox, oy: DE.oy }; return; }
    if (t === 'ref') { if (!DE.ref) return toast('먼저 밑그림을 올리기'); DE.drag = { ref: true, fx: p.fx, fy: p.fy, rx: DE.ref.x, ry: DE.ref.y }; return; }
    if (t === 'pick') { if (!deIn(p)) return; const c = dePickAt(p.x, p.y); if (c) { DE.col = c; DE.recent = [c, ...DE.recent.filter(x => x !== c)].slice(0, 8); DE.tool = 'pen'; deUI(); toast('색 선택 완료'); } return; }
    if (t === 'sel') { const f = DE.float; if (f && p.fx >= f.x && p.fy >= f.y && p.fx < f.x + f.w && p.fy < f.y + f.h) { DE.drag = { flt: true, fx: p.fx, fy: p.fy, x: f.x, y: f.y }; return; }
      if (f) deCommitFloat(); DE.drag = { sel: true, a: deClamp(p) }; DE.sel = null; return; }
    if (!deIn(p) && ['fill', 'swap', 'grad'].includes(t)) return;
    if (t === 'swap') { deSwap(p.x, p.y); return; }
    if (!deEditable()) return;
    if (t === 'fill') { dePush(); deFlood(p.x, p.y, deHex(DE.col)); if (DE.mirror) deFlood(DE.W - 1 - p.x, p.y, deHex(DE.col)); deDraw(); deCols(); return; }
    if (t === 'grad') { DE.drag = { grad: true, a: p, b: null }; return; }
    if (t === 'pen' || t === 'erase' || t === 'dith') { dePush(); const rgb = t === 'erase' ? null : t === 'dith' ? deDithFn() : deHex(DE.col); DE.drag = { snap: DE.undo[DE.undo.length - 1][0].px, last: p, rgb }; deSet(DE.px, p.x, p.y, rgb); deDraw(); return; }
    if (['line', 'rect', 'oval'].includes(t)) { DE.drag = { shape: t, a: p }; DE.preview = DE.px.slice(); deShape(p); }
  });
  cv.addEventListener('pointermove', e => {
    if (DE.ptr.has(e.pointerId)) DE.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); const p = deAt(e); DE.hov = deIn(p) ? p : null; const d = DE.drag;
    if (!d) { deDraw(); return; }
    if (d.pinch && DE.ptr.size >= 2) { const [a, b] = [...DE.ptr.values()], nd = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, r = $('#deCv').getBoundingClientRect();
      DE.ox += cx - d.cx; DE.oy += cy - d.cy; deZoom(nd / (d.d || nd), cx - r.left, cy - r.top); d.d = nd; d.cx = cx; d.cy = cy; return; }
    if (d.pan) { DE.ox = d.ox + e.clientX - d.sx; DE.oy = d.oy + e.clientY - d.sy; deDraw(); return; }
    if (d.ref) { DE.ref.x = d.rx + p.fx - d.fx; DE.ref.y = d.ry + p.fy - d.fy; deDraw(); return; }
    if (d.flt) { DE.float.x = Math.round(d.x + p.fx - d.fx); DE.float.y = Math.round(d.y + p.fy - d.fy); deDraw(); return; }
    if (d.sel) { const b = deClamp(p); DE.sel = { x: Math.min(d.a.x, b.x), y: Math.min(d.a.y, b.y), w: Math.abs(b.x - d.a.x) + 1, h: Math.abs(b.y - d.a.y) + 1 }; deDraw(); return; }
    if (d.grad) { d.b = p; deDraw(); return; }
    if (d.last) { deLine(DE.px, d.last.x, d.last.y, p.x, p.y, d.rgb); d.last = p; deDraw(); return; }
    if (d.shape) deShape(p);
  });
  const up = e => {
    DE && DE.ptr.delete(e.pointerId); if (!DE) return; const d = DE.drag;
    if (d && d.pinch) { if (DE.ptr.size === 0) DE.drag = null; return; }
    if (d && d.shape && DE.preview) { dePush(); deSetPx(DE.preview); DE.preview = null; deCols(); }
    if (d && d.grad) { DE.drag = null; deGradient(d.a, d.b || d.a); return; }
    if (d && d.last) deCols();
    if (d && d.sel) deUI();
    DE.drag = null; deDraw();
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
}
function deShape(p) { const d = DE.drag, px = DE.px.slice(), rgb = deHex(DE.col), ss = DE.size;
  if (d.shape === 'line') deLine(px, d.a.x, d.a.y, p.x, p.y, rgb); else { DE.size = 1; (d.shape === 'rect' ? deRect : deOval)(px, d.a, p, rgb, DE.fillShape); DE.size = ss; }
  DE.preview = px; deDraw(); }
