/* =========================================================
   햄카타 — 서재 선반 정리 (같은 물건 3개를 한 칸에 모으기)
   칸마다 앞줄 3자리 + 뒤에 쌓인 줄. 앞줄이 비면 뒷줄이 앞으로 나옴.
   시간 제한 없음 · 단계가 오를수록 칸·줄·물건 종류가 늚
   도움: ↩ 되돌리기 3번 · 🔀 섞기 1번 · 💡 힌트 2번
   ========================================================= */
FEATS.books = { n: '서재 선반 정리', ic: '📚', d: '같은 물건 셋을 한 칸에' };
const SH_ITEMS = ['빨간 책', '파란 책', '초록 책', '보라 책', '두루마리', '잉크와 깃펜', '촛대', '모래시계', '지구본', '편지', '열쇠', '회중시계'];
const shLv = () => Math.max(1, (P.shelf && P.shelf.lv) || 1);
function shCfg(lv) {
  const boxes = Math.min(15, 6 + Math.floor((lv - 1) * 1.5)), layers = Math.min(5, 2 + Math.floor((lv - 1) / 2)), types = Math.min(12, 4 + lv);
  const cap = boxes * 3 * layers, empt = Math.max(4, Math.round(boxes * .9)), triples = Math.floor((cap - empt) / 3 * (lv <= 2 ? .7 : .85));
  return { boxes, layers, types, triples };
}

VIEWS.books = () => {
  const lv = shLv(), C = shCfg(lv), S = P.shelf || {};
  return `<div class="panel"><h2>📚 서재 선반 정리</h2><div id="shsel"><p class="muted">물건을 끌어다 빈자리에 놓음. 한 칸에 같은 물건 셋이 모이면 정리! 앞줄이 비면 뒤에 있던 물건이 나옴 · ${capTxt('books')}</p>
   <div class="row" style="gap:12px;flex-wrap:wrap;margin:6px 0"><span>지금 <b style="color:var(--gold2)">${lv}단계</b></span><span class="muted">칸 ${C.boxes} · 줄 ${C.layers} · 물건 ${C.triples * 3}개</span><span class="muted">최고 ${S.best || 0}단계</span></div>
   <div style="display:flex;gap:6px;flex-wrap:wrap;font-size:.8rem" class="muted">↩ 되돌리기 3 · 🔀 섞기 1 · 💡 힌트 2</div></div>
   <div id="gbox"><button class="primary" style="width:100%;padding:14px;font-size:1.1rem;margin-top:8px" onclick="booksStart()">▶ ${lv}단계 시작</button></div>
   ${lv > 1 ? `<button class="sm" style="margin-top:6px" onclick="if(confirm('1단계부터 다시 할까요?')){P.shelf.lv=1;saveP();render()}">1단계부터 다시</button>` : ''}</div>`;
};

let SH = null;
function shBuild(lv) {
  const C = shCfg(lv), items = []; for (let i = 0; i < C.triples; i++) { const t = i % C.types; items.push(t, t, t); }
  for (let tries = 0; tries < 30; tries++) {
    const bag = shuffle(items.slice()), boxes = Array.from({ length: C.boxes }, () => Array.from({ length: C.layers }, () => [null, null, null]));
    // 앞줄: 빈자리를 남기고, 나머지는 뒷줄부터 채움
    const frontCap = C.boxes * 3, emptyFront = Math.max(3, Math.min(frontCap - 3, Math.round(C.boxes * .9)));
    const frontSlots = shuffle(Array.from({ length: frontCap }, (_, i) => i)).slice(0, frontCap - emptyFront);
    frontSlots.forEach(i => { if (bag.length) boxes[Math.floor(i / 3)][0][i % 3] = bag.pop(); });
    const back = []; for (let l = 1; l < C.layers; l++) for (let b = 0; b < C.boxes; b++) for (let s = 0; s < 3; s++) back.push([b, l, s]);
    shuffle(back).forEach(([b, l, s]) => { if (bag.length) boxes[b][l][s] = bag.pop(); });
    while (bag.length) { const b = rint(C.boxes), s = boxes[b][0].indexOf(null); if (s >= 0) boxes[b][0][s] = bag.pop(); }
    // 뒷줄의 빈 줄은 정리 (앞으로 당겨 오기)
    boxes.forEach(bx => { for (let l = bx.length - 1; l >= 1; l--) if (bx[l].every(v => v == null)) bx.splice(l, 1); while (bx.length > 1 && bx[0].every(v => v == null)) bx.shift(); });
    const bad = boxes.some(bx => bx[0][0] != null && bx[0][0] === bx[0][1] && bx[0][1] === bx[0][2]);
    if (!bad) return { boxes, C };
  }
  return null;
}
function booksStart() {
  const lv = shLv(), B = shBuild(lv); if (!B) return toast('판을 만들지 못함. 다시 누르기');
  const sel = $('#shsel'); if (sel) sel.style.display = 'none';
  const cols = 3, rows = Math.ceil(B.C.boxes / cols), BW = 58, BH = 40, W = cols * BW + 8, H = rows * BH + 10;
  const b = gbox(); if (!b) return;
  b.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:6px;gap:6px;flex-wrap:wrap"><b id="ghud"></b><button class="sm" onclick="shQuit()">그만두기</button></div>
   <canvas id="gcv" style="width:100%;max-width:420px;aspect-ratio:${W}/${H};touch-action:none;display:block;margin:auto;border-radius:8px;background:#2a1a10"></canvas>
   <div class="row" style="gap:6px;margin-top:8px;max-width:420px;margin-left:auto;margin-right:auto"><button style="flex:1" id="shU" onclick="shUndo()"></button><button style="flex:1" id="shS" onclick="shShuffle()"></button><button style="flex:1" id="shH" onclick="shHint()"></button></div>`;
  const cv = $('#gcv'), cw = cv.clientWidth || 360, S = Math.max(2, 2 * Math.round(cw / W * (window.devicePixelRatio || 1) / 2) || 2);   // 짝수배 → 반 칸 도트
  cv.width = W * S; cv.height = H * S; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  SH = { lv, boxes: B.boxes, C: B.C, cols, BW, BH, W, H, S, g, cv, undo: 3, shuf: 1, hint: Math.max(0, 2 + (typeof fortHint === 'function' ? fortHint() : 0)), hist: [], score: 0, moves: 0, combo: 0, lastClr: -9, fx: [], pops: [], drag: null, sel: null, hl: null, over: false, t0: performance.now() };
  shBind(); shHud();
  let raf = 0; const loop = () => { shDraw(); raf = requestAnimationFrame(loop); };
  lockGame(() => cancelAnimationFrame(raf)); raf = requestAnimationFrame(loop);
  setTimeout(() => { const p = b.closest('.panel'); if (p) p.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 50);
}
function shQuit() { stopGame(); SH = null; render(); }
function shHud() {
  const s = SH; if (!s) return; const left = s.boxes.reduce((n, bx) => n + bx.reduce((m, l) => m + l.filter(v => v != null).length, 0), 0);
  const h = $('#ghud'); if (h) h.textContent = `${s.lv}단계 · 남은 물건 ${left} · 점수 ${s.score}${s.combo > 1 ? ` · ${s.combo}콤보` : ''}`;
  const u = $('#shU'), f = $('#shS'), k = $('#shH');
  if (u) { u.textContent = `↩ 되돌리기 ${s.undo}`; u.disabled = !s.undo || !s.hist.length; }
  if (f) { f.textContent = `🔀 섞기 ${s.shuf}`; f.disabled = !s.shuf; }
  if (k) { k.textContent = `💡 힌트 ${s.hint}`; k.disabled = !s.hint; }
}
/* 칸·자리 좌표 */
const shBox = i => { const s = SH, c = i % s.cols, r = Math.floor(i / s.cols); return { x: 4 + c * s.BW, y: 5 + r * s.BH }; };
const shSlot = (i, k) => { const b = shBox(i); return { x: b.x + 5 + k * 16, y: b.y + 8 }; };
function shHit(px, py) {
  const s = SH; for (let i = 0; i < s.boxes.length; i++) for (let k = 0; k < 3; k++) { const p = shSlot(i, k); if (px >= p.x - 1 && px < p.x + 16 && py >= p.y - 4 && py < p.y + 28) return { i, k }; }
  return null;
}
function shBind() {
  const s = SH, cv = s.cv, pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * s.W, (e.clientY - r.top) / r.height * s.H]; };
  cv.onpointerdown = e => { if (s.over) return; const [x, y] = pos(e), h = shHit(x, y); if (!h) return; e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (_) {}
    const v = s.boxes[h.i][0][h.k];
    if (v == null) { if (s.sel) { shMove(s.sel, h); s.sel = null; } return; }
    s.drag = { from: h, t: v, x, y, x0: x, y0: y, moved: false }; };
  cv.onpointermove = e => { const d = s.drag; if (!d) return; const [x, y] = pos(e); d.x = x; d.y = y; if (Math.hypot(x - d.x0, y - d.y0) > 3) d.moved = true; };
  cv.onpointerup = e => { const d = s.drag; s.drag = null; if (!d) return; const [x, y] = pos(e), h = shHit(x, y);
    if (!d.moved) { if (s.sel && s.sel.i === d.from.i && s.sel.k === d.from.k) s.sel = null; else s.sel = d.from; sfx('tap'); return; }
    s.sel = null; if (h) shMove(d.from, h); };
  cv.onpointercancel = () => { s.drag = null; };
}
const shSnap = () => JSON.stringify(SH.boxes);
function shMove(a, b) {
  const s = SH; if (!s || s.over) return; if (a.i === b.i && a.k === b.k) return;
  const v = s.boxes[a.i][0][a.k]; if (v == null || s.boxes[b.i][0][b.k] != null) { sfx('bad'); return; }
  s.hist.push(shSnap()); if (s.hist.length > 30) s.hist.shift();
  s.boxes[a.i][0][a.k] = null; s.boxes[b.i][0][b.k] = v; s.moves++; s.hl = null; sfx('tap');
  shResolve([b.i, a.i]); shHud();
}
function shResolve(touched) {
  const s = SH; let cleared = false;
  touched.forEach(i => { const f = s.boxes[i][0];
    if (f[0] != null && f[0] === f[1] && f[1] === f[2]) { cleared = true; const now = performance.now() / 1000;
      s.combo = now - s.lastClr < 3 ? s.combo + 1 : 1; s.lastClr = now; const pts = 30 * s.combo; s.score += pts;
      for (let k = 0; k < 3; k++) { const p = shSlot(i, k); s.pops.push({ x: p.x + 8, y: p.y + 10, t: f[k], a: 1 }); for (let q = 0; q < 6; q++) { const an = Math.random() * 6.28, sp = 15 + Math.random() * 25; s.fx.push({ x: p.x + 8, y: p.y + 10, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 10, t: .5 }); } }
      const b = shBox(i); s.fx.push({ txt: `+${pts}${s.combo > 1 ? ` ×${s.combo}` : ''}`, x: b.x + 29, y: b.y + 6, vx: 0, vy: -14, t: 1 });
      s.boxes[i][0] = [null, null, null]; sfx(s.combo > 1 ? 'coin' : 'ok'); if (typeof buzz === 'function') buzz(18); } });
  // 앞줄이 다 비면 뒷줄을 앞으로
  s.boxes.forEach(bx => { while (bx.length > 1 && bx[0].every(v => v == null)) bx.shift(); });
  const left = s.boxes.reduce((n, bx) => n + bx.reduce((m, l) => m + l.filter(v => v != null).length, 0), 0);
  if (!left) return setTimeout(() => shEnd(true), 500);
  if (cleared) shResolve(s.boxes.map((_, i) => i));   // 뒤에서 나온 물건이 바로 셋이 될 수도
  if (!s.boxes.some(bx => bx[0].includes(null))) { if (s.shuf) toast('빈자리가 없음! 🔀 섞기를 써 보기'); else setTimeout(() => shEnd(false), 400); }
}
function shUndo() { const s = SH; if (!s || !s.undo || !s.hist.length) return; s.boxes = JSON.parse(s.hist.pop()); s.undo--; s.sel = null; s.hl = null; sfx('tap'); shHud(); }
function shShuffle() {
  const s = SH; if (!s || !s.shuf) return; s.shuf--; s.hist = [];
  const all = []; s.boxes.forEach(bx => bx[0].forEach(v => { if (v != null) all.push(v); }));
  shuffle(all); const slots = []; s.boxes.forEach((bx, i) => bx[0].forEach((v, k) => { if (v != null) slots.push([i, k]); }));
  slots.forEach(([i, k], j) => s.boxes[i][0][k] = all[j]);
  s.boxes.forEach((bx, i) => { const f = bx[0]; if (f[0] != null && f[0] === f[1] && f[1] === f[2]) { const j = (i + 1) % s.boxes.length; const o = s.boxes[j][0].findIndex(v => v != null && v !== f[0]); if (o >= 0) { const t = f[2]; f[2] = s.boxes[j][0][o]; s.boxes[j][0][o] = t; } } });
  sfx('ok'); shHud();
  if (!s.boxes.some(bx => bx[0].includes(null))) { const i = rint(s.boxes.length); s.boxes[i].unshift([null, null, null]); }   // 그래도 꽉 막히면 칸 하나를 비워 줌
}
function shHint() {
  const s = SH; if (!s || !s.hint) return; const fr = s.boxes.map(bx => bx[0]);
  let best = null;
  fr.forEach((f, i) => { const e = f.indexOf(null); if (e < 0) return; const cnt = {}; f.forEach(v => { if (v != null) cnt[v] = (cnt[v] || 0) + 1; });
    Object.keys(cnt).forEach(t => { if (cnt[t] !== 2 && !(cnt[t] === 1 && !best)) return; t = +t;
      fr.forEach((g2, j) => { if (j === i) return; const k = g2.indexOf(t); if (k >= 0 && (!best || cnt[t] === 2 && best.n < 2)) best = { from: { i: j, k }, to: { i, k: e }, n: cnt[t] }; }); }); });
  if (!best) return toast('지금은 마땅한 수가 없음. 빈 칸을 만들어 보기');
  s.hint--; s.hl = { ...best, until: performance.now() + 2500 }; sfx('ok'); shHud();
}
function shEnd(win) {
  const s = SH; if (!s || s.over) return; s.over = true; stopGame(); SH = null;
  P.shelf = P.shelf || {}; const lv = s.lv;
  if (win) { P.shelf.lv = lv + 1; P.shelf.best = Math.max(P.shelf.best || 0, lv); s.score += 50 + lv * 20 + (s.undo + s.shuf + s.hint) * 15; }
  const coins = Math.round(s.score / 25) + (win ? 2 + lv : 0);
  const r = reward('books', Math.min(25, coins), s.score);
  finishGame(`<h2 style="color:var(--gold2);margin-top:0">📚 ${win ? `${lv}단계 정리 완료!` : '더 놓을 곳이 없음'}</h2>
   <p style="font-size:1.8rem;margin:2px 0;color:var(--gold2)"><b>${s.score}</b></p><p class="muted">${r}</p>
   <p class="muted">옮긴 횟수 ${s.moves}${win ? ` · 남긴 도움 ${s.undo + s.shuf + s.hint}개 보너스` : ''}</p>
   <div class="row"><button class="primary" style="flex:1" onclick="closeModal();booksStart()">▶ ${win ? `${lv + 1}단계` : '다시'}</button><button onclick="closeModal()">닫기</button></div>`);
}

/* ---------- 그리기 ---------- */
function shDraw() {
  const s = SH; if (!s || !document.body.contains(s.cv)) return; const g = s.g, S = s.S, now = performance.now();
  const hs = S / 2, q = v => Math.round(v * 2) * hs;
  const px = (x, y, w, h, c) => { g.fillStyle = c; const X = q(x), Y = q(y); g.fillRect(X, Y, Math.max(hs, q(x + w) - X), Math.max(hs, q(y + h) - Y)); };
  px(0, 0, s.W, s.H, '#2a1a10'); for (let y = 0; y < s.H; y += 6) { px(0, y, s.W, .5, '#24160c'); px(0, y + .5, s.W, .5, '#321f13'); }
  s.boxes.forEach((bx, i) => { const b = shBox(i);
    // 칸 (나무 상자)
    px(b.x, b.y, s.BW - 2, s.BH - 2, '#5a3a22'); px(b.x, b.y, s.BW - 2, .5, '#7a5232'); px(b.x, b.y, .5, s.BH - 2, '#6a4628'); px(b.x + s.BW - 2.5, b.y, .5, s.BH - 2, '#3a2414');
    px(b.x + 2, b.y + 2, s.BW - 6, s.BH - 8, '#3a2414'); px(b.x + 2, b.y + 2, s.BW - 6, 1.5, '#24150a'); px(b.x + 2, b.y + 3.5, s.BW - 6, .5, '#2e1c10'); px(b.x + 2, b.y + 2, .5, s.BH - 8, '#2a180c'); px(b.x + s.BW - 4.5, b.y + 2, .5, s.BH - 8, '#46301c');
    px(b.x, b.y + s.BH - 7, s.BW - 2, 5, '#8a5a32'); px(b.x, b.y + s.BH - 7, s.BW - 2, .5, '#d09a60'); px(b.x, b.y + s.BH - 6.5, s.BW - 2, .5, '#b07a48'); px(b.x, b.y + s.BH - 3.5, s.BW - 2, .5, '#6a4426'); px(b.x, b.y + s.BH - 3, s.BW - 2, 1, '#3a2414');
    for (let gx = b.x + 5; gx < b.x + s.BW - 6; gx += 9) px(gx, b.y + s.BH - 5, 3, .5, '#7a4e2a');
    // 뒷줄 (한 줄만, 어둡게 · 살짝 위로)
    if (bx[1]) bx[1].forEach((v, k) => { if (v == null) return; const p = shSlot(i, k); shItem(px, v, p.x + 1, p.y - 5, true); });
    if (bx.length > 2) for (let d = 0; d < Math.min(4, bx.length - 1); d++) px(b.x + s.BW - 7, b.y + 4 + d * 3, 3, 2, '#c9a036');
    // 앞줄
    bx[0].forEach((v, k) => { const p = shSlot(i, k), dr = s.drag && s.drag.moved && s.drag.from.i === i && s.drag.from.k === k, sel = s.sel && s.sel.i === i && s.sel.k === k;
      const hl = s.hl && now < s.hl.until && ((s.hl.from.i === i && s.hl.from.k === k) || (s.hl.to.i === i && s.hl.to.k === k));
      if (hl && (now >> 7) % 2) px(p.x - 1, p.y - 2, 17, 26, 'rgba(255,224,138,.55)');
      if (sel) px(p.x - 1, p.y - 2, 17, 26, 'rgba(255,240,180,.45)');
      if (v != null && !dr) shItem(px, v, p.x, p.y + (sel ? -2 : 0), false);
      if (v == null && (s.drag || s.sel)) px(p.x + 4, p.y + 18, 8, 1, 'rgba(255,224,138,.35)'); });
  });
  s.pops.forEach(p => { p.a -= .05; if (p.a > 0) { g.globalAlpha = p.a; shItem(px, p.t, p.x - 8, p.y - 10 - (1 - p.a) * 8, false); g.globalAlpha = 1; } }); s.pops = s.pops.filter(p => p.a > 0);
  s.fx.forEach(f => { f.x += f.vx / 60; f.y += f.vy / 60; f.t -= 1 / 60; if (f.txt) { g.font = `700 ${Math.round(7 * S)}px Galmuri11, monospace`; g.textAlign = 'center'; g.fillStyle = '#140c06'; g.fillText(f.txt, (f.x + .5) * S, (f.y + .5) * S); g.fillStyle = '#ffe08a'; g.fillText(f.txt, f.x * S, f.y * S); } else { f.vy += 1.5; px(f.x, f.y, 1.2, 1.2, '#fff6c0'); } }); s.fx = s.fx.filter(f => f.t > 0);
  const d = s.drag; if (d && d.moved) { g.globalAlpha = .92; shItem(px, d.t, d.x - 8, d.y - 14, false); g.globalAlpha = 1; }
}
/* 물건 16 × 22 (도트) */
function shItem(px, t, x, y, dim) {
  const D = c => dim ? shDark(c) : c, r = (a, b, w, h, c) => px(x + a, y + b, w, h, D(c));
  const book = (c1, c2, c3) => {   // 반 칸 도트: 얇은 테두리 · 둥근 등 · 금박 띠 · 표제 딱지
    r(3.5, 2, 9, 20, '#1a1010'); r(3, 2.5, 10, 19.5, '#1a1010');
    r(3.5, 2.5, 9, 19, c1); r(3.5, 2.5, 1.5, 19, c2); r(5, 2.5, .5, 19, c1); r(4, 3, .5, 18, 'rgba(255,255,255,.2)'); r(11.5, 2.5, 1, 19, c3); r(11, 2.5, .5, 19, shMix(c1, c3));
    r(3.5, 5.5, 9, 1, '#e0b050'); r(3.5, 5.5, 9, .5, '#fff0b0'); r(3.5, 7, 9, .5, '#a07028');
    r(3.5, 17, 9, 1, '#e0b050'); r(3.5, 17, 9, .5, '#fff0b0'); r(3.5, 18.5, 9, .5, '#a07028');
    r(5.5, 9, 5, 6, '#1a1010'); r(6, 9.5, 4, 5, '#f0e2c0'); r(6, 9.5, 4, .5, '#fffaf0'); r(6.5, 10.5, 3, .5, '#6a4a30'); r(6.5, 11.5, 2.5, .5, '#6a4a30'); r(6.5, 12.5, 3, .5, '#6a4a30'); r(7, 13.5, 2, .5, '#a08060');
    r(3.5, 20.5, 9, 1, c3); r(4, 21, 8, .5, '#1a1010'); };
  switch (t) {
    case 0: book('#b8344a', '#e06070', '#6a1424'); break;
    case 1: book('#3a5aa8', '#6a8ad8', '#1a2a5a'); break;
    case 2: book('#3a8a55', '#6ab07a', '#1a4a2a'); break;
    case 3: book('#6a3a98', '#9a6ac8', '#3a1a5a'); break;
    case 4: r(2, 8, 12, 12, '#3a2a1a'); r(3, 9, 10, 10, '#f0e2c0'); r(3, 9, 10, 2, '#fff6e0'); r(3, 17, 10, 2, '#d0b888'); r(1, 7, 3, 14, '#c8a870'); r(12, 7, 3, 14, '#c8a870'); r(1, 7, 1, 14, '#f0dca8'); r(6, 9, 3, 10, '#a8344a'); r(7, 9, 1, 10, '#e06070'); break;
    case 5: r(3, 12, 9, 10, '#1a1010'); r(4, 13, 7, 8, '#2a3a5a'); r(5, 14, 2, 5, '#5a7ab0'); r(5, 10, 5, 3, '#1a1010'); r(6, 10, 3, 2, '#8a6a40'); r(9, 1, 2, 12, '#1a1010'); r(10, 1, 4, 8, '#f4f0e8'); r(12, 2, 2, 6, '#c8c0b0'); r(10, 0, 3, 2, '#f4f0e8'); break;
    case 6: r(4, 19, 8, 3, '#e0b050'); r(5, 19, 6, 1, '#fff0b0'); r(7, 12, 2, 7, '#c9a036'); r(5, 7, 6, 6, '#f4ecd8'); r(5, 7, 2, 6, '#fffaf0'); r(7, 4, 2, 3, '#3a2a1a'); r(6, 0, 4, 4, '#ffb040'); r(7, 1, 2, 2, '#fff6c0'); break;
    case 7: r(3, 2, 10, 2, '#6a4428'); r(3, 20, 10, 2, '#6a4428'); r(4, 4, 1, 16, '#8a5a32'); r(11, 4, 1, 16, '#8a5a32'); r(5, 4, 6, 2, '#dce8f0'); r(6, 6, 4, 3, '#dce8f0'); r(7, 9, 2, 3, '#dce8f0'); r(6, 12, 4, 3, '#dce8f0'); r(5, 15, 6, 5, '#dce8f0'); r(6, 6, 4, 2, '#e8c070'); r(7, 10, 2, 5, '#e8c070'); r(5, 17, 6, 3, '#e8c070'); break;
    case 8: r(5, 20, 6, 2, '#6a4428'); r(7, 15, 2, 5, '#8a5a32'); r(2, 2, 12, 13, '#1a2a3a'); r(3, 3, 10, 11, '#3a7ab0'); r(4, 5, 4, 3, '#5aa05a'); r(8, 9, 3, 4, '#5aa05a'); r(4, 4, 2, 1, '#bfe0f8'); r(1, 7, 1, 4, '#c9a036'); r(14, 7, 1, 4, '#c9a036'); break;
    case 9: r(1, 7, 14, 11, '#3a2a1a'); r(2, 8, 12, 9, '#f0e6d0'); r(2, 8, 6, 5, '#e0d4b8'); r(8, 8, 6, 5, '#e0d4b8'); r(6, 11, 4, 4, '#a8344a'); r(7, 12, 2, 2, '#e06070'); break;
    case 10: r(6, 2, 6, 6, '#8a6010'); r(7, 3, 4, 4, '#e0b050'); r(8, 4, 2, 2, '#2a1a10'); r(8, 8, 2, 13, '#e0b050'); r(8, 8, 1, 13, '#fff0b0'); r(10, 16, 3, 2, '#e0b050'); r(10, 19, 2, 2, '#e0b050'); break;
    case 11: r(7, 1, 2, 3, '#c9a036'); r(6, 0, 4, 1, '#c9a036'); r(2, 4, 12, 13, '#8a6010'); r(3, 5, 10, 11, '#e0b050'); r(4, 6, 8, 9, '#f8f0dc'); r(7, 7, 2, 4, '#2a1a10'); r(8, 10, 3, 1, '#2a1a10'); r(4, 6, 2, 1, '#fff'); r(5, 17, 6, 4, 'rgba(0,0,0,0)'); break;
  }
  if (SH_FINE[t]) SH_FINE[t](r);
}
const SH_FINE = {   // 반 칸 도트 덧그림 (물건별)
  4: r => { r(1, 7, 3, .5, '#8a6a40'); r(1, 20.5, 3, .5, '#8a6a40'); r(12, 7, 3, .5, '#8a6a40'); r(12, 20.5, 3, .5, '#8a6a40'); r(3.5, 7, .5, 14, '#a08050'); r(14.5, 7, .5, 14, '#a08050');
    r(4, 12, 1.5, .5, '#8a7050'); r(4, 13.5, 1.5, .5, '#8a7050'); r(9.5, 12, 2.5, .5, '#8a7050'); r(9.5, 13.5, 2, .5, '#8a7050'); r(9.5, 15, 2.5, .5, '#8a7050'); r(6, 9, .5, 10, '#6a1424'); },
  5: r => { r(4.5, 13.5, .5, 6, '#8aa8d8'); r(4, 20.5, 7, .5, '#141c30'); r(10.5, 2, .5, 6, '#ffffff'); r(11.5, 3, .5, 5, '#a8a090'); r(12.5, 4, .5, 3.5, '#a8a090'); r(9.5, 9, .5, 3, '#4a3a2a'); },
  6: r => { r(7.5, 1.5, 1, 1.5, '#ffffff'); r(6.5, .5, .5, 1, '#ff8020'); r(9, .5, .5, 1, '#ff8020'); r(5, 8, .5, 2.5, '#e8dcc0'); r(10.5, 9, .5, 3, '#d8ccb0'); r(4, 21.5, 8, .5, '#8a6010'); },
  7: r => { r(3, 2, 10, .5, '#8a5a32'); r(3, 21.5, 10, .5, '#3a2414'); r(7.5, 9, 1, 3, '#e8c070'); r(7.5, 12, .5, 4, '#e8c070'); r(5.5, 4.5, .5, 1.5, '#ffffff'); r(5.5, 15.5, .5, 2, '#ffffff'); r(5, 16.5, 6, .5, '#c89a40'); },
  8: r => { r(7.5, 3, .5, 11, '#2a5a88'); r(3, 8, 10, .5, '#2a5a88'); r(5, 4, .5, 9, '#2f669a'); r(10, 4, .5, 9, '#2f669a'); r(4, 4, 1, .5, '#ffffff'); r(4, 4.5, .5, 1, '#ffffff'); r(4.5, 6, 2, .5, '#7ac07a'); r(5, 20.5, 6, .5, '#3a2414'); },
  9: r => { r(2, 8, 6, .5, '#c8b898'); r(8, 8, 6, .5, '#c8b898'); r(2.5, 8.5, .5, 4, '#c8b898'); r(13, 8.5, .5, 4, '#c8b898'); r(4, 12.5, 2.5, .5, '#c8b898'); r(9.5, 12.5, 2.5, .5, '#c8b898'); r(6.5, 11.5, 1, .5, '#ffa0b0'); r(6, 14.5, 4, .5, '#6a1424'); },
  10: r => { r(7, 3.5, 1, .5, '#fff0b0'); r(6.5, 4, .5, 2, '#fff0b0'); r(9.5, 6.5, 1, .5, '#8a6010'); r(9.5, 8, .5, 13, '#a07028'); r(12, 16.5, 1, .5, '#fff0b0'); r(11.5, 19.5, .5, 1.5, '#8a6010'); },
  11: r => { r(7.5, 6.5, 1, .5, '#8a6010'); r(7.5, 14, 1, .5, '#8a6010'); r(4.5, 10, .5, 1, '#8a6010'); r(11, 10, .5, 1, '#8a6010'); r(3, 5, 10, .5, '#ffe08a'); r(2.5, 5, .5, 11, '#c89030'); r(8, 10.5, .5, .5, '#c8303a'); r(4, 16.5, 8, .5, '#6a4808'); }
};
function shMix(a, b) { const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16), m = (s) => Math.round((((A >> s) & 255) + ((B >> s) & 255)) / 2); return '#' + [16, 8, 0].map(k => m(k).toString(16).padStart(2, '0')).join(''); }
function shDark(c) { if (!c || c[0] !== '#') return c; const n = parseInt(c.slice(1), 16), L = ((n >> 16) & 255) * .3 + ((n >> 8) & 255) * .59 + (n & 255) * .11; return `rgb(${Math.round(L * .3 + 26)},${Math.round(L * .22 + 16)},${Math.round(L * .14 + 10)})`; }   // 뒷줄: 갈색 그림자
