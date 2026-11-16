/* ================= 도트 편집기 =================
   dotEdit({ W, H, src, foot, title, onSave(dataURL|null), onCancel })
     W×H = 도트 수 (가구 칸 하나 = 가로 64도트), foot = 바닥에 닿는 부분 높이(도트, 안내선)
   도구: 펜 · 지우개 · 채우기 · 스포이드 · 선 · 사각형 · 원 · 선택(복사/잘라내기/붙여넣기) · 손(이동)
   밑그림: 올리기 · 투명도 · 위치/크기 · 색 뽑기 · 도트로 자동 변환
================================================== */
let DE = null, DECLIP = null;
const DE_TOOLS = [['pen', '✏', '펜'], ['erase', '🧽', '지우개'], ['fill', '🪣', '채우기'], ['pick', '💧', '스포이드'], ['line', '╱', '선'], ['rect', '▭', '사각형'], ['oval', '◯', '원'], ['sel', '⬚', '선택'], ['hand', '✋', '이동'], ['ref', '🖼', '밑그림 옮기기']];
const DE_PAL = ['#24160e', '#5a3a24', '#8a5530', '#c4864e', '#e8c8a0', '#f8f4ea', '#ffffff', '#7a7a84', '#3a3a44', '#a8344a', '#d8485a', '#f08ab0', '#e8a060', '#e0b050', '#ffe27a', '#79b26e', '#4f8a55', '#2e6a5a', '#9ad0e4', '#5a9ad8', '#3a5a8a', '#6a4a8a', '#c8a8e0', '#2a2a32'];

function dotEdit(o) {
  const W = Math.max(8, Math.min(512, o.W | 0)), H = Math.max(8, Math.min(512, o.H | 0));
  DE = { W, H, px: new Uint8ClampedArray(W * H * 4), o, tool: 'pen', col: '#24160e', size: 1, fillShape: false, mirror: false, grid: true,
    z: 4, ox: 0, oy: 0, undo: [], redo: [], ref: null, sel: null, float: null, drag: null, ptr: new Map(), recent: [], sheet: '', dirty: false };
  const root = document.createElement('div'); root.id = 'dotEd';
  root.innerHTML = `<style>
    #dotEd{position:fixed;inset:0;z-index:38;background:#15100c;display:flex;flex-direction:column;color:var(--text);touch-action:none;user-select:none;-webkit-user-select:none}
    #dotEd .dtop{display:flex;align-items:center;gap:6px;padding:calc(6px + env(safe-area-inset-top)) 8px 6px;border-bottom:1px solid var(--line)}
    #dotEd .dtop b{flex:1;font-size:.95rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #dotEd .dwrap{flex:1;position:relative;min-height:0}
    #dotEd canvas#deCv{position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;cursor:crosshair}
    #dotEd .dbar{display:flex;gap:4px;overflow-x:auto;padding:4px 6px;border-top:1px solid var(--line);align-items:center;-webkit-overflow-scrolling:touch}
    #dotEd .dbar::-webkit-scrollbar{height:4px}
    #dotEd .dbar span{white-space:nowrap;flex:0 0 auto}
    #dotEd .dbar button{flex:0 0 auto;padding:6px 9px;font-size:.9rem;white-space:nowrap}
    #dotEd .dbar button.on{background:var(--gold);color:var(--ontext)}
    #dotEd .sw{flex:0 0 26px;width:26px;height:26px;border:2px solid #0008;border-radius:4px;cursor:pointer}
    #dotEd .sw.on{outline:2px solid var(--gold2);outline-offset:1px}
    #dotEd .dsheet{position:absolute;left:8px;right:8px;bottom:8px;background:var(--panel);border:1px solid var(--gold);border-radius:8px;padding:10px;max-height:70%;overflow:auto;z-index:2;box-shadow:0 6px 20px #000a}
    #dotEd .dinfo{position:absolute;left:8px;top:6px;font-size:.75rem;background:#000a;padding:2px 6px;border-radius:4px;pointer-events:none}
    #dotEd input[type=range]{flex:0 0 110px}
  </style>
  <div class="dtop"><button class="sm" onclick="deClose(false)">✕ 취소</button><b>🎨 ${esc(o.title || '도트 그리기')} <span class="muted" style="font-size:.8rem">${W}×${H}</span></b><button class="sm" onclick="deUndo()">↶</button><button class="sm" onclick="deRedo()">↷</button><button class="sm primary" onclick="deClose(true)">✔ 저장</button></div>
  <div class="dwrap"><canvas id="deCv"></canvas><div class="dinfo" id="deInfo"></div><div class="dsheet" id="deSheet" style="display:none"></div></div>
  <div class="dbar" id="deTools"></div><div class="dbar" id="deOpts"></div><div class="dbar" id="deCols"></div>`;
  document.body.appendChild(root); document.body.style.overflow = 'hidden';
  if (o.src) deLoadSrc(o.src, true);
  deUI(); deFit(); deBind(); deDraw();
}
function deClose(save) {
  if (!DE) return; const o = DE.o;
  if (!save && DE.dirty && !confirm('그린 것을 저장하지 않고 닫을까요?')) return;
  let url = null; if (save) { if (DE.float) deCommitFloat(); url = deIsEmpty() ? null : dePng(); }
  window.removeEventListener('keydown', deKey); const r = document.getElementById('dotEd'); if (r) r.remove(); document.body.style.overflow = ''; DE = null;
  if (save) o.onSave && o.onSave(url); else o.onCancel && o.onCancel();
}
function deIsEmpty() { for (let i = 3; i < DE.px.length; i += 4) if (DE.px[i]) return false; return true; }
function dePng() { const c = document.createElement('canvas'); c.width = DE.W; c.height = DE.H; c.getContext('2d').putImageData(new ImageData(DE.px.slice(), DE.W, DE.H), 0, 0); return c.toDataURL('image/png'); }
/* 기존 그림 읽기: 아래·가운데 기준으로 맞춤 */
function deLoadSrc(src, initial) {
  const im = new Image(); im.onload = () => { if (!DE) return; const c = document.createElement('canvas'); c.width = DE.W; c.height = DE.H; const g = c.getContext('2d');
    g.drawImage(im, Math.round((DE.W - im.width) / 2), DE.H - im.height); const d = g.getImageData(0, 0, DE.W, DE.H).data;
    if (!initial) dePush(); DE.px.set(d); deDraw(); }; im.src = src;
}

/* ---------- 화면 ---------- */
function deUI() {
  const t = DE.tool;
  $('#deTools').innerHTML = DE_TOOLS.map(([k, ic, n]) => `<button class="${t === k ? 'on' : ''}" onclick="deTool('${k}')" title="${n}">${ic} ${n}</button>`).join('');
  const sz = ['pen', 'erase'].includes(t) ? `<span class="muted">굵기</span>${[1, 2, 3].map(n => `<button class="${DE.size === n ? 'on' : ''}" onclick="DE.size=${n};deUI()">${n}</button>`).join('')}` : '';
  const shp = ['rect', 'oval'].includes(t) ? `<button class="${DE.fillShape ? 'on' : ''}" onclick="DE.fillShape=!DE.fillShape;deUI()">${DE.fillShape ? '■ 채움' : '□ 테두리'}</button>` : '';
  const sel = t === 'sel' || DE.float ? (DE.float ? `<button class="on" onclick="deCommitFloat()">✔ 여기에 붙이기</button><button onclick="deFlipFloat()">⇋ 뒤집기</button><button onclick="DE.float=null;deUI();deDraw()">✕ 취소</button>`
    : `<button onclick="deCopy(false)" ${DE.sel ? '' : 'disabled'}>📄 복사</button><button onclick="deCopy(true)" ${DE.sel ? '' : 'disabled'}>✂ 잘라내기</button><button onclick="deClearSel()" ${DE.sel ? '' : 'disabled'}>🧹 지우기</button><button onclick="dePaste()" ${DECLIP ? '' : 'disabled'}>📋 붙여넣기</button>`) : '';
  const ref = DE.ref ? `<button class="${DE.ref.on ? 'on' : ''}" onclick="DE.ref.on=!DE.ref.on;deUI();deDraw()">👁 밑그림</button><span class="muted">투명</span><input type="range" min="5" max="100" value="${Math.round(DE.ref.a * 100)}" oninput="DE.ref.a=this.value/100;deDraw()">
    <span class="muted">크기</span><input type="range" min="5" max="400" value="${Math.round(DE.ref.s * 100)}" oninput="deRefScale(this.value/100)"><button onclick="deRefFit()">맞추기</button><button onclick="deSheet('conv')">🧩 도트로 바꾸기</button><button onclick="DE.ref=null;deUI();deDraw()">🗑</button>` : '';
  $('#deOpts').innerHTML = `${sz}${shp}${sel}<button class="${DE.mirror ? 'on' : ''}" onclick="DE.mirror=!DE.mirror;deUI();deDraw()">⇿ 좌우 대칭</button><button class="${DE.grid ? 'on' : ''}" onclick="DE.grid=!DE.grid;deUI();deDraw()"># 격자</button><button onclick="deFit()">⤢ 화면 맞춤</button>
    <button onclick="deRefPick()">📷 밑그림 올리기</button>${ref}<button onclick="deSheet('imp')">🪑 가구 불러오기</button><button onclick="deFlipAll()">⇋ 전체 뒤집기</button><button onclick="deClearAll()">🗑 전체 지우기</button>`;
  deCols();
}
function deCols() {
  const used = deUsed(); const all = [...new Set([...DE.recent, ...used, ...DE_PAL])].slice(0, 48);
  $('#deCols').innerHTML = `<label class="sw" style="background:${DE.col};position:relative;flex-basis:34px;width:34px;height:30px" title="색 고르기"><input type="color" value="${DE.col}" style="opacity:0;position:absolute;inset:0;width:100%;height:100%" oninput="deSetCol(this.value)"></label>
    ${all.map(c => `<span class="sw ${c === DE.col ? 'on' : ''}" style="background:${c}" onclick="deSetCol('${c}')"></span>`).join('')}`;
}
function deUsed() { const s = new Map(), p = DE.px; for (let i = 0; i < p.length; i += 4) if (p[i + 3]) { const h = '#' + [p[i], p[i + 1], p[i + 2]].map(v => v.toString(16).padStart(2, '0')).join(''); s.set(h, (s.get(h) || 0) + 1); } return [...s.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24).map(x => x[0]); }
function deSetCol(c) { DE.col = c.toLowerCase(); DE.recent = [DE.col, ...DE.recent.filter(x => x !== DE.col)].slice(0, 8); if (DE.tool === 'erase' || DE.tool === 'pick') DE.tool = 'pen'; deUI(); }
function deTool(k) { if (DE.float && k !== 'sel' && k !== 'hand') deCommitFloat(); DE.tool = k; if (k !== 'sel') DE.sel = null; deUI(); deDraw(); }
function deFit() { const cv = $('#deCv'); if (!cv) return; const r = cv.getBoundingClientRect(); DE.z = Math.max(1, Math.min(40, Math.floor(Math.min((r.width - 16) / DE.W, (r.height - 16) / DE.H) * 10) / 10)); DE.ox = (r.width - DE.W * DE.z) / 2; DE.oy = (r.height - DE.H * DE.z) / 2; deDraw(); }
function deSheet(k) {
  const sh = $('#deSheet'); if (!k || DE.sheet === k) { DE.sheet = ''; sh.style.display = 'none'; return; } DE.sheet = k; sh.style.display = 'block';
  if (k === 'conv') sh.innerHTML = `<b>🧩 밑그림을 도트로 바꾸기</b><p class="muted" style="margin:4px 0">밑그림 위치·크기 그대로 칸에 맞춰 도트로 바꿔요. 지금 그림은 덮어써요(되돌리기 가능).</p>
    <div class="row" style="align-items:center;gap:6px;flex-wrap:wrap"><span>색 수</span><select id="deCn">${[4, 8, 12, 16, 24, 32].map(n => `<option ${n === 16 ? 'selected' : ''}>${n}</option>`).join('')}</select>
    <label><input type="checkbox" id="deBg" checked> 배경 지우기</label><label><input type="checkbox" id="deOl"> 테두리 진하게</label></div>
    <div class="row" style="margin-top:8px"><button onclick="deSheet('')">닫기</button><button class="primary" onclick="deConvert()">바꾸기</button></div>`;
  if (k === 'imp') {
    const ks = Object.keys(FURN).filter(x => FURN[x].hi || FURN[x].custom);
    sh.innerHTML = `<b>🪑 가구 불러오기</b><p class="muted" style="margin:4px 0">불러온 그림은 옮긴 뒤 「여기에 붙이기」로 확정해요. 다른 방향 그림을 복사해 올 때도 써요.</p>
      <select id="deImpK" style="width:100%">${ks.map(x => `<option value="${x}">${esc(FURN[x].name)}${FURN[x].custom ? ' ✏' : ''}</option>`).join('')}</select>
      <div class="row" style="margin-top:6px;gap:6px"><select id="deImpD"><option value="0">앞</option><option value="1">왼쪽</option><option value="2">뒤</option><option value="3">오른쪽</option></select>
      <button onclick="deSheet('')">닫기</button><button class="primary" onclick="deImport()">불러오기</button></div>`;
  }
}

/* ---------- 그리기 ---------- */
function deDraw() {
  if (!DE) return; const cv = $('#deCv'); if (!cv) return; const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(r.width * dpr) || cv.height !== Math.round(r.height * dpr)) { cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr); }
  const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height);
  const { W, H, z, ox, oy } = DE;
  // 체크무늬 바탕
  g.fillStyle = '#2a2420'; g.fillRect(ox, oy, W * z, H * z); g.fillStyle = '#332c27'; const ck = Math.max(z * 4, 8);
  for (let y = 0; y < H * z; y += ck) for (let x = (Math.floor(y / ck) % 2) * ck; x < W * z; x += ck * 2) g.fillRect(ox + x, oy + y, Math.min(ck, W * z - x), Math.min(ck, H * z - y));
  if (DE.ref && DE.ref.on && DE.ref.img) { g.save(); g.globalAlpha = DE.ref.a; g.imageSmoothingEnabled = true; g.drawImage(DE.ref.img, ox + DE.ref.x * z, oy + DE.ref.y * z, DE.ref.img.width * DE.ref.s * z, DE.ref.img.height * DE.ref.s * z); g.restore(); }
  const px = DE.preview || DE.px, tmp = deTmp(); tmp.getContext('2d').putImageData(new ImageData(px, W, H), 0, 0);
  g.imageSmoothingEnabled = false; g.drawImage(tmp, ox, oy, W * z, H * z);
  if (DE.float) { const f = DE.float, ft = document.createElement('canvas'); ft.width = f.w; ft.height = f.h; ft.getContext('2d').putImageData(new ImageData(f.d.slice(), f.w, f.h), 0, 0); g.drawImage(ft, ox + f.x * z, oy + f.y * z, f.w * z, f.h * z);
    g.strokeStyle = '#ffe08a'; g.setLineDash([4, 3]); g.strokeRect(ox + f.x * z + .5, oy + f.y * z + .5, f.w * z - 1, f.h * z - 1); g.setLineDash([]); }
  if (DE.grid && z >= 6) { g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1; g.beginPath(); for (let x = 0; x <= W; x++) { g.moveTo(ox + x * z + .5, oy); g.lineTo(ox + x * z + .5, oy + H * z); } for (let y = 0; y <= H; y++) { g.moveTo(ox, oy + y * z + .5); g.lineTo(ox + W * z, oy + y * z + .5); } g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.18)'; g.beginPath(); for (let x = 0; x <= W; x += 32) { g.moveTo(ox + x * z + .5, oy); g.lineTo(ox + x * z + .5, oy + H * z); } g.stroke(); }
  if (DE.o.foot) { const fy = oy + (H - DE.o.foot) * z; g.strokeStyle = 'rgba(120,220,140,.55)'; g.setLineDash([6, 4]); g.strokeRect(ox + .5, fy + .5, W * z - 1, DE.o.foot * z - 1); g.setLineDash([]); }
  if (DE.mirror) { g.strokeStyle = 'rgba(255,120,160,.6)'; g.beginPath(); g.moveTo(ox + W * z / 2, oy - 6); g.lineTo(ox + W * z / 2, oy + H * z + 6); g.stroke(); }
  if (DE.sel) { const s = DE.sel; g.strokeStyle = '#fff'; g.setLineDash([4, 3]); g.strokeRect(ox + s.x * z + .5, oy + s.y * z + .5, s.w * z - 1, s.h * z - 1); g.strokeStyle = '#000'; g.lineDashOffset = 3; g.strokeRect(ox + s.x * z + .5, oy + s.y * z + .5, s.w * z - 1, s.h * z - 1); g.setLineDash([]); g.lineDashOffset = 0; }
  g.strokeStyle = '#8a7050'; g.strokeRect(ox - .5, oy - .5, W * z + 1, H * z + 1);
  const inf = $('#deInfo'); if (inf) inf.textContent = (DE.hov ? `${DE.hov.x},${DE.hov.y} · ` : '') + `${Math.round(z * 100) / 100}배`;
}
let DE_TMP = null; function deTmp() { if (!DE_TMP || DE_TMP.width !== DE.W || DE_TMP.height !== DE.H) { DE_TMP = document.createElement('canvas'); DE_TMP.width = DE.W; DE_TMP.height = DE.H; } return DE_TMP; }

/* ---------- 픽셀 ---------- */
const deHex = h => { h = h.replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; };
function deSet(px, x, y, rgb, mir) {
  const { W, H } = DE, s = DE.size || 1, o = Math.floor((s - 1) / 2);
  const one = (x, y) => { for (let j = 0; j < s; j++) for (let i = 0; i < s; i++) { const X = x - o + i, Y = y - o + j; if (X < 0 || Y < 0 || X >= W || Y >= H) continue; const k = (Y * W + X) * 4; if (rgb) { px[k] = rgb[0]; px[k + 1] = rgb[1]; px[k + 2] = rgb[2]; px[k + 3] = 255; } else px[k + 3] = px[k] = px[k + 1] = px[k + 2] = 0; } };
  one(x, y); if (mir !== false && DE.mirror) one(W - 1 - x, y);
}
function deLine(px, x0, y0, x1, y1, rgb) { const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  for (let n = 0; n < 2000; n++) { deSet(px, x0, y0, rgb); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
function deRect(px, a, b, rgb, fill) { const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (fill || y === y0 || y === y1 || x === x0 || x === x1) deSet(px, x, y, rgb); }
function deOval(px, a, b, rgb, fill) { const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = (x1 - x0) / 2 + .5, ry = (y1 - y0) / 2 + .5;
  const inside = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inside(x, y) && (fill || !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1))) deSet(px, x, y, rgb); }
function deFlood(x, y, rgb) {
  const { W, H, px } = DE, k0 = (y * W + x) * 4, t = [px[k0], px[k0 + 1], px[k0 + 2], px[k0 + 3]];
  const same = k => t[3] === 0 ? px[k + 3] === 0 : px[k + 3] && px[k] === t[0] && px[k + 1] === t[1] && px[k + 2] === t[2];
  if (rgb && t[3] && t[0] === rgb[0] && t[1] === rgb[1] && t[2] === rgb[2]) return; if (!rgb && !t[3]) return;
  const seen = new Uint8Array(W * H), st = [[x, y]]; const ss = DE.size; DE.size = 1;
  while (st.length) { const [cx, cy] = st.pop(); if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue; const i = cy * W + cx; if (seen[i] || !same(i * 4)) continue; seen[i] = 1; deSet(px, cx, cy, rgb, false); st.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]); }
  DE.size = ss;
}
function dePush() { DE.undo.push(DE.px.slice()); if (DE.undo.length > 50) DE.undo.shift(); DE.redo = []; DE.dirty = true; }
function deUndo() { if (!DE || !DE.undo.length) return; DE.redo.push(DE.px.slice()); DE.px = DE.undo.pop(); deDraw(); deCols(); }
function deRedo() { if (!DE || !DE.redo.length) return; DE.undo.push(DE.px.slice()); DE.px = DE.redo.pop(); deDraw(); deCols(); }
function dePickAt(x, y) {
  const k = (y * DE.W + x) * 4, p = DE.px;
  if (p[k + 3]) return '#' + [p[k], p[k + 1], p[k + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
  const R = DE.ref; if (R && R.on && R.data) { const rx = Math.floor((x + .5 - R.x) / R.s), ry = Math.floor((y + .5 - R.y) / R.s); if (rx >= 0 && ry >= 0 && rx < R.img.width && ry < R.img.height) { const j = (ry * R.img.width + rx) * 4, d = R.data; if (d[j + 3] > 20) return '#' + [d[j], d[j + 1], d[j + 2]].map(v => v.toString(16).padStart(2, '0')).join(''); } }
  return null;
}

/* ---------- 선택 · 붙여넣기 ---------- */
function deCut(s) { const { W, px } = DE, d = new Uint8ClampedArray(s.w * s.h * 4); for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const a = ((s.y + y) * W + s.x + x) * 4, b = (y * s.w + x) * 4; for (let k = 0; k < 4; k++) d[b + k] = px[a + k]; } return { w: s.w, h: s.h, d }; }
function deCopy(cut) { if (!DE.sel) return; DECLIP = deCut(DE.sel); if (cut) { dePush(); deClearRect(DE.sel); } toast(cut ? '잘라냈어요' : '복사했어요'); deUI(); deDraw(); }
function deClearRect(s) { for (let y = s.y; y < s.y + s.h; y++) for (let x = s.x; x < s.x + s.w; x++) { const k = (y * DE.W + x) * 4; DE.px[k] = DE.px[k + 1] = DE.px[k + 2] = DE.px[k + 3] = 0; } }
function deClearSel() { if (!DE.sel) return; dePush(); deClearRect(DE.sel); deDraw(); }
function dePaste() { if (!DECLIP) return; const s = DE.sel; DE.float = { w: DECLIP.w, h: DECLIP.h, d: DECLIP.d.slice(), x: s ? s.x : Math.max(0, Math.round((DE.W - DECLIP.w) / 2)), y: s ? s.y : Math.max(0, DE.H - DECLIP.h) }; DE.tool = 'sel'; DE.sel = null; deUI(); deDraw(); }
function deFlipFloat() { const f = DE.float; if (!f) return; const d = new Uint8ClampedArray(f.d.length); for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const a = (y * f.w + x) * 4, b = (y * f.w + f.w - 1 - x) * 4; for (let k = 0; k < 4; k++) d[b + k] = f.d[a + k]; } f.d = d; deDraw(); }
function deCommitFloat() { const f = DE.float; if (!f) return; dePush(); for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) { const X = f.x + x, Y = f.y + y; if (X < 0 || Y < 0 || X >= DE.W || Y >= DE.H) continue; const a = (y * f.w + x) * 4; if (!f.d[a + 3]) continue; const b = (Y * DE.W + X) * 4; for (let k = 0; k < 3; k++) DE.px[b + k] = f.d[a + k]; DE.px[b + 3] = 255; }
  DE.float = null; deUI(); deDraw(); deCols(); }
function deFlipAll() { dePush(); const { W, H } = DE, d = DE.px.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const a = (y * W + x) * 4, b = (y * W + W - 1 - x) * 4; for (let k = 0; k < 4; k++) DE.px[b + k] = d[a + k]; } deDraw(); }
function deClearAll() { if (!confirm('전부 지울까요? (되돌리기 가능)')) return; dePush(); DE.px.fill(0); deDraw(); deCols(); }
function deImport() {
  const k = $('#deImpK').value, dir = +$('#deImpD').value, f = FURN[k]; if (!f) return; const dm = dimsOf(k, dir), w = dm.w * 64, h = Math.round(dm.h * 2);
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; snapCtx(g, 2);
  const go = () => { g.clearRect(0, 0, w, h); drawSprite(g, k, 0, 0, 0, null, null, dir); const d = g.getImageData(0, 0, w, h).data;
    for (let i = 0; i < d.length; i += 4) if (d[i + 3] < 128) d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 0; else d[i + 3] = 255;
    DE.float = { w, h, d, x: Math.round((DE.W - w) / 2), y: DE.H - h }; DE.tool = 'sel'; deSheet(''); deUI(); deDraw(); };
  go(); if (f.custom) setTimeout(go, 400);   // 직접 만든 가구는 그림을 불러올 시간이 필요해요
}

/* ---------- 밑그림 ---------- */
function deRefPick() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
  inp.onchange = () => { const f = inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => {
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); let data = null; try { data = g.getImageData(0, 0, im.width, im.height).data; } catch (e) {}
    DE.ref = { img: im, data, a: .45, on: true, x: 0, y: 0, s: 1 }; deRefFit(); DE.tool = 'ref'; deUI(); toast('밑그림을 깔았어요. 「밑그림 옮기기」로 위치를 맞춰요'); }; im.src = rd.result; }; rd.readAsDataURL(f); };
  inp.click();
}
function deRefFit() { const R = DE.ref; if (!R) return; R.s = Math.min(DE.W / R.img.width, DE.H / R.img.height); R.x = (DE.W - R.img.width * R.s) / 2; R.y = DE.H - R.img.height * R.s; deUI(); deDraw(); }
function deRefScale(s) { const R = DE.ref; if (!R) return; const cx = R.x + R.img.width * R.s / 2, by = R.y + R.img.height * R.s; R.s = Math.max(.02, s); R.x = cx - R.img.width * R.s / 2; R.y = by - R.img.height * R.s; deDraw(); }
function deConvert() {
  const R = DE.ref; if (!R) return; const n = +$('#deCn').value, bg = $('#deBg').checked, ol = $('#deOl').checked, { W, H } = DE;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(R.img, R.x, R.y, R.img.width * R.s, R.img.height * R.s); const d = g.getImageData(0, 0, W, H).data;
  // 배경 지우기: 가장자리와 비슷한 색을 바깥에서부터 지워요
  if (bg) { const k0 = [d[0], d[1], d[2]], near = i => Math.abs(d[i] - k0[0]) + Math.abs(d[i + 1] - k0[1]) + Math.abs(d[i + 2] - k0[2]) < 60, seen = new Uint8Array(W * H), st = [];
    for (let x = 0; x < W; x++) st.push([x, 0], [x, H - 1]); for (let y = 0; y < H; y++) st.push([0, y], [W - 1, y]);
    while (st.length) { const [x, y] = st.pop(); if (x < 0 || y < 0 || x >= W || y >= H) continue; const i = y * W + x; if (seen[i]) continue; seen[i] = 1; const j = i * 4; if (d[j + 3] < 128 || near(j)) { d[j + 3] = 0; st.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]); } } }
  // 색 줄이기 (k-평균)
  const pts = []; for (let i = 0; i < d.length; i += 4) if (d[i + 3] >= 128) pts.push(i);
  if (!pts.length) return toast('바꿀 그림이 없어요 (밑그림이 칸 밖에 있어요)');
  let cen = []; const step = Math.max(1, Math.floor(pts.length / n)); for (let k = 0; k < n; k++) { const i = pts[Math.min(pts.length - 1, k * step + (step >> 1))]; cen.push([d[i], d[i + 1], d[i + 2]]); }
  const lab = new Int16Array(pts.length);
  for (let it = 0; it < 8; it++) { const sum = cen.map(() => [0, 0, 0, 0]);
    pts.forEach((i, pi) => { let b = 0, bd = 1e9; for (let k = 0; k < cen.length; k++) { const e = (d[i] - cen[k][0]) ** 2 + (d[i + 1] - cen[k][1]) ** 2 + (d[i + 2] - cen[k][2]) ** 2; if (e < bd) { bd = e; b = k; } } lab[pi] = b; const s = sum[b]; s[0] += d[i]; s[1] += d[i + 1]; s[2] += d[i + 2]; s[3]++; });
    cen = cen.map((c, k) => sum[k][3] ? [sum[k][0] / sum[k][3], sum[k][1] / sum[k][3], sum[k][2] / sum[k][3]] : c); }
  dePush(); DE.px.fill(0); pts.forEach((i, pi) => { const c = cen[lab[pi]]; DE.px[i] = c[0]; DE.px[i + 1] = c[1]; DE.px[i + 2] = c[2]; DE.px[i + 3] = 255; });
  if (ol) { const src = DE.px.slice(); for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const k = (y * W + x) * 4; if (!src[k + 3]) continue; const edge = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X = x + a, Y = y + b; return X < 0 || Y < 0 || X >= W || Y >= H || !src[(Y * W + X) * 4 + 3]; });
    if (edge) { DE.px[k] = Math.round(src[k] * .35); DE.px[k + 1] = Math.round(src[k + 1] * .3); DE.px[k + 2] = Math.round(src[k + 2] * .3); } } }
  R.on = false; deSheet(''); deUI(); deDraw(); toast('도트로 바꿨어요! 마음에 안 들면 ↶');
}

/* ---------- 입력 ---------- */
function deAt(e) { const r = $('#deCv').getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top; return { sx, sy, x: Math.floor((sx - DE.ox) / DE.z), y: Math.floor((sy - DE.oy) / DE.z), fx: (sx - DE.ox) / DE.z, fy: (sy - DE.oy) / DE.z }; }
function deIn(p) { return p.x >= 0 && p.y >= 0 && p.x < DE.W && p.y < DE.H; }
function deZoom(f, sx, sy) { const z = Math.max(.5, Math.min(48, DE.z * f)); DE.ox = sx - (sx - DE.ox) * z / DE.z; DE.oy = sy - (sy - DE.oy) * z / DE.z; DE.z = z; deDraw(); }
function deKey(e) {
  if (!DE || /INPUT|SELECT|TEXTAREA/.test((e.target || {}).tagName || '')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? deRedo() : deUndo(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); deRedo(); return; }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') { deCopy(false); return; } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') { deCopy(true); return; } if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') { dePaste(); return; }
  const m = { b: 'pen', p: 'pen', e: 'erase', g: 'fill', i: 'pick', l: 'line', r: 'rect', o: 'oval', m: 'sel', h: 'hand' }[e.key.toLowerCase()]; if (m && !e.ctrlKey && !e.metaKey) deTool(m);
  if (e.key === 'Enter' && DE.float) deCommitFloat(); if (e.key === 'Escape') { DE.float = null; DE.sel = null; deUI(); deDraw(); }
}
function deBind() {
  const cv = $('#deCv'); window.addEventListener('keydown', deKey);
  new ResizeObserver(() => DE && deDraw()).observe(cv);
  cv.addEventListener('wheel', e => { e.preventDefault(); const p = deAt(e); deZoom(e.deltaY < 0 ? 1.15 : 1 / 1.15, p.sx, p.sy); }, { passive: false });
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', e => {
    cv.setPointerCapture(e.pointerId); DE.ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (DE.ptr.size === 2) { // 두 손가락: 그리던 것 취소하고 확대/이동
      if (DE.drag && DE.drag.snap) { DE.px = DE.drag.snap; DE.undo.pop(); } DE.preview = null; const [a, b] = [...DE.ptr.values()];
      DE.drag = { pinch: true, d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; deDraw(); return; }
    if (DE.ptr.size > 2) return;
    const p = deAt(e), t = (e.button === 1 || e.button === 2) ? 'hand' : DE.tool;
    if (t === 'hand') { DE.drag = { pan: true, sx: e.clientX, sy: e.clientY, ox: DE.ox, oy: DE.oy }; return; }
    if (t === 'ref') { if (!DE.ref) return toast('먼저 밑그림을 올려 주세요'); DE.drag = { ref: true, fx: p.fx, fy: p.fy, rx: DE.ref.x, ry: DE.ref.y }; return; }
    if (t === 'pick') { if (!deIn(p)) return; const c = dePickAt(p.x, p.y); if (c) { DE.col = c; DE.recent = [c, ...DE.recent.filter(x => x !== c)].slice(0, 8); DE.tool = 'pen'; deUI(); toast('색을 골랐어요'); } return; }
    if (t === 'fill') { if (!deIn(p)) return; dePush(); deFlood(p.x, p.y, deHex(DE.col)); if (DE.mirror) deFlood(DE.W - 1 - p.x, p.y, deHex(DE.col)); deDraw(); deCols(); return; }
    if (t === 'sel') { const f = DE.float; if (f && p.fx >= f.x && p.fy >= f.y && p.fx < f.x + f.w && p.fy < f.y + f.h) { DE.drag = { flt: true, fx: p.fx, fy: p.fy, x: f.x, y: f.y }; return; }
      if (f) deCommitFloat(); DE.drag = { sel: true, a: { x: Math.max(0, Math.min(DE.W - 1, p.x)), y: Math.max(0, Math.min(DE.H - 1, p.y)) } }; DE.sel = null; return; }
    if (t === 'pen' || t === 'erase') { dePush(); DE.drag = { snap: DE.undo[DE.undo.length - 1], last: p, rgb: t === 'erase' ? null : deHex(DE.col) }; deSet(DE.px, p.x, p.y, DE.drag.rgb); deDraw(); return; }
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
    if (d.sel) { const b = { x: Math.max(0, Math.min(DE.W - 1, p.x)), y: Math.max(0, Math.min(DE.H - 1, p.y)) }; DE.sel = { x: Math.min(d.a.x, b.x), y: Math.min(d.a.y, b.y), w: Math.abs(b.x - d.a.x) + 1, h: Math.abs(b.y - d.a.y) + 1 }; deDraw(); return; }
    if (d.last) { deLine(DE.px, d.last.x, d.last.y, p.x, p.y, d.rgb); d.last = p; deDraw(); return; }
    if (d.shape) deShape(p);
  });
  const up = e => {
    DE && DE.ptr.delete(e.pointerId); if (!DE) return; const d = DE.drag;
    if (d && d.pinch) { if (DE.ptr.size === 0) DE.drag = null; return; }
    if (d && d.shape && DE.preview) { dePush(); DE.px = DE.preview; DE.preview = null; deCols(); }
    if (d && d.last) deCols();
    if (d && d.sel) deUI();
    DE.drag = null; deDraw();
  };
  cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
}
function deShape(p) { const d = DE.drag, px = DE.px.slice(), rgb = deHex(DE.col), ss = DE.size;
  if (d.shape === 'line') deLine(px, d.a.x, d.a.y, p.x, p.y, rgb); else { DE.size = 1; (d.shape === 'rect' ? deRect : deOval)(px, d.a, p, rgb, DE.fillShape); DE.size = ss; }
  DE.preview = px; deDraw(); }
