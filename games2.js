/* =========================================================
   은화 벌이 미니게임: 은식기 닦기 · 서재 책 정리 · 자물쇠 따기
   (games.js의 FEATS · lockGame · reward · finishGame · gbox 사용)
   ========================================================= */
delete FEATS.riddle; { const i = FEAT_KEYS.indexOf('riddle'); if (i >= 0) FEAT_KEYS.splice(i, 1); }   // 수수께끼는 쪽지로 바뀜
Object.assign(FEATS, {
  silver:   { n: '은식기 닦기',   ic: '🍴', d: '리듬에 맞춰 얼룩 지우기' },
  books:    { n: '서재 책 정리',  ic: '📚', d: '같은 색 책 셋을 나란히' },
  lockpick: { n: '자물쇠 따기',   ic: '🔐', d: '핀이 맞는 순간 누르기' }
});
['silver', 'books'].forEach(k => { if (!FEAT_KEYS.includes(k)) FEAT_KEYS.push(k); });

/* 도트 캔버스: 논리 좌표(w×h)를 기기 픽셀에 맞게 정수배로 */
function pxCanvas(w, h, hud) {
  const b = gbox(); if (!b) return null;
  b.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:6px"><b id="ghud">${hud || ''}</b><button class="sm" onclick="stopGame();render()">그만두기</button></div>
   <canvas id="gcv" style="width:100%;max-width:${w * 3}px;aspect-ratio:${w}/${h};image-rendering:pixelated;touch-action:none;display:block;margin:auto;border-radius:6px;background:#1a1010"></canvas>`;
  const cv = $('#gcv'), cw = cv.clientWidth || w * 3, S = Math.max(2, Math.round(cw / w * (window.devicePixelRatio || 1)));
  cv.width = w * S; cv.height = h * S; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const px = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(Math.round(x * S), Math.round(y * S), Math.max(1, Math.round(ww * S)), Math.max(1, Math.round(hh * S))); };
  const txt = (s, x, y, col, size, align) => { g.fillStyle = col; g.font = `${Math.round((size || 7) * S)}px Galmuri11, monospace`; g.textAlign = align || 'center'; g.fillText(s, x * S, y * S); };
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * w, (e.clientY - r.top) / r.height * h]; };
  const hudSet = s => { const el = $('#ghud'); if (el) el.innerHTML = s; };
  return { cv, g, px, txt, pos, hudSet, w, h };
}
function pxEnd(id, title, line, coins, again) {
  const r = reward(id, Math.min(25, coins));
  finishGame(`<h2 style="color:var(--gold2);margin-top:0">${title}</h2><p>${line}</p><p class="muted">${r || '보상 없음'}</p><div class="row"><button class="primary" onclick="closeModal();${again}()">다시</button><button onclick="closeModal()">닫기</button></div>`);
}

/* ================= 은식기 닦기 (리듬) ================= */
VIEWS.silver = () => `<div class="panel"><h2>🍴 은식기 닦기</h2><p class="muted">얼룩이 금색 선에 닿을 때 그 줄을 눌러요. 40초 · ${capTxt('silver')}</p>
  <div id="gbox"><button class="primary" style="width:100%" onclick="silverStart()">시작</button></div></div>`;
function silverStart() {
  const C = pxCanvas(120, 180, '준비…'); if (!C) return; const { px, txt } = C;
  const LX = [20, 60, 100], HIT = 138, DUR = 40; let notes = [], fx = [], t0 = performance.now(), last = t0, spawnT = 0, score = 0, combo = 0, best = 0, hits = 0, miss = 0, shine = 0, raf = 0, item = 0, over = false;
  const ITEMS = ['포크', '나이프', '스푼', '찻주전자'];
  const drawItem = (k, s) => { const L = `rgb(${150 + s},${150 + s},${160 + s})`, D = `rgb(${90 + s / 2},${90 + s / 2},${100 + s / 2})`, H = '#ffffff';
    if (k === 0) { px(56, 150, 8, 26, L); px(54, 146, 12, 6, L); [54, 57, 60, 63].forEach(x => px(x, 140, 2, 7, L)); px(56, 150, 2, 26, H); }
    else if (k === 1) { px(57, 140, 6, 22, L); px(58, 162, 4, 14, D); px(57, 140, 2, 22, H); }
    else if (k === 2) { px(52, 140, 16, 12, L); px(54, 142, 12, 8, D); px(58, 152, 4, 24, L); px(53, 141, 4, 3, H); }
    else { px(46, 150, 28, 20, L); px(50, 146, 20, 4, L); px(58, 142, 4, 4, L); px(74, 154, 10, 3, L); px(36, 154, 10, 10, D); px(48, 152, 6, 10, H); } };
  const tap = lane => { if (over) return; let bi = -1, bd = 99; notes.forEach((n, i) => { if (n.l === lane && !n.done) { const d = Math.abs(n.y - HIT); if (d < bd) { bd = d; bi = i; } } });
    if (bi >= 0 && bd < 14) { const n = notes[bi]; n.done = true; const perfect = bd < 5; combo++; best = Math.max(best, combo); hits++; score += (perfect ? 3 : 1) * (1 + Math.min(combo, 30) / 10); shine = Math.min(100, shine + (perfect ? 4 : 2));
      fx.push({ x: LX[lane], y: HIT, t: 0, s: perfect ? '반짝!' : '좋아' }); sfx('tap'); }
    else { combo = 0; fx.push({ x: LX[lane], y: HIT, t: 0, s: '헛손질' }); sfx('bad'); } };
  C.cv.onpointerdown = e => { const [x] = C.pos(e); tap(x < 40 ? 0 : x < 80 ? 1 : 2); };
  const loop = now => { const dt = Math.min(.05, (now - last) / 1000); last = now; const el = (now - t0) / 1000, left = Math.max(0, DUR - el);
    const speed = 70 + el * 1.6, every = Math.max(.32, .62 - el * .008); spawnT -= dt;
    if (spawnT <= 0 && left > 1.5) { spawnT = every; const l = rint(3); notes.push({ l, y: -8, done: false }); if (el > 15 && Math.random() < .18) notes.push({ l: (l + 1 + rint(2)) % 3, y: -8, done: false }); }
    notes.forEach(n => { n.y += speed * dt; if (!n.done && n.y > HIT + 16) { n.done = true; n.miss = true; combo = 0; miss++; shine = Math.max(0, shine - 3); } });
    notes = notes.filter(n => n.y < 190 && !(n.done && !n.miss)); fx.forEach(f => f.t += dt); fx = fx.filter(f => f.t < .5);
    if (el > (item + 1) * 10) item = Math.min(3, item + 1);
    // 그리기: 식탁 · 세 줄 천 · 금색 선 · 얼룩 · 은식기
    px(0, 0, 120, 180, '#3a2418'); for (let y = 0; y < 180; y += 12) px(0, y, 120, 1, '#4a2e1e');
    LX.forEach(x => { px(x - 15, 0, 30, 180, 'rgba(240,232,214,.08)'); px(x - 15, 0, 1, 180, 'rgba(0,0,0,.25)'); });
    px(2, HIT - 1, 116, 3, '#c9a036'); px(2, HIT - 1, 116, 1, '#ffe08a');
    notes.forEach(n => { if (n.done) return; const x = LX[n.l]; px(x - 8, n.y - 5, 16, 10, '#4a4a40'); px(x - 6, n.y - 7, 12, 14, '#4a4a40'); px(x - 5, n.y - 4, 10, 6, '#6a6a58'); px(x - 3, n.y - 3, 3, 2, '#8a8a70'); });
    drawItem(item, Math.round(shine * .9)); if (shine > 40 && (now >> 7) % 3 === 0) { px(70 - (now >> 5) % 30, 144, 1, 5, '#fff'); px(68 - (now >> 5) % 30, 146, 5, 1, '#fff'); }
    fx.forEach(f => txt(f.s, f.x, f.y - 8 - f.t * 30, f.s === '헛손질' ? '#e88' : '#ffe08a', 7));
    px(4, 4, 112, 4, '#1a1010'); px(4, 4, 112 * shine / 100, 4, '#e8ecf4');
    C.hudSet(`⏱ ${Math.ceil(left)} · ${ITEMS[item]} · 콤보 ${combo} · 점수 ${Math.round(score)}`);
    if (left <= 0 && !over) { over = true; stopGame(); const coins = Math.round(score / 10); pxEnd('silver', '🍴 반짝반짝 닦았어요!', `닦은 얼룩 ${hits}개 · 놓친 얼룩 ${miss}개 · 최고 콤보 ${best}`, coins, 'silverStart'); return; }
    raf = requestAnimationFrame(loop); };
  lockGame(() => cancelAnimationFrame(raf)); raf = requestAnimationFrame(loop);
}

/* ================= 서재 책 정리 (3개 맞추기) ================= */
VIEWS.books = () => `<div class="panel"><h2>📚 서재 책 정리</h2><p class="muted">옆 책과 자리를 바꿔 같은 색 셋을 맞춰요. 25번 · ${capTxt('books')}</p>
  <div id="gbox"><button class="primary" style="width:100%" onclick="booksStart()">시작</button></div></div>`;
function booksStart() {
  const COLS = 6, ROWS = 7, CW = 18, CH = 21, OXB = 6, OYB = 8, W = COLS * CW + 12, H = ROWS * CH + 14;
  const C = pxCanvas(W, H); if (!C) return; const { px } = C;
  const PAL = [['#a8344a', '#d8607a', '#6a1424'], ['#3a5a8a', '#6a8ac0', '#24365a'], ['#4f8a55', '#79b26e', '#2e5a34'], ['#c9a036', '#ffe08a', '#7a5a18'], ['#6a4a8a', '#9a7ac0', '#3a2a5a']];
  let grid = [], sel = null, moves = 25, score = 0, busy = false, flash = [], combo = 0, best = 0, over = false;
  const at = (c, r) => grid[r * COLS + c];
  const findAll = () => { const m = new Set();
    for (let r = 0; r < ROWS; r++) { let run = 1; for (let c = 1; c <= COLS; c++) { if (c < COLS && at(c, r) === at(c - 1, r) && at(c, r) >= 0) run++; else { if (run >= 3) for (let k = c - run; k < c; k++) m.add(r * COLS + k); run = 1; } } }
    for (let c = 0; c < COLS; c++) { let run = 1; for (let r = 1; r <= ROWS; r++) { if (r < ROWS && at(c, r) === at(c, r - 1) && at(c, r) >= 0) run++; else { if (run >= 3) for (let k = r - run; k < r; k++) m.add(k * COLS + c); run = 1; } } }
    return m; };
  do { grid = Array.from({ length: COLS * ROWS }, () => rint(5)); } while (findAll().size);
  const draw = () => { px(0, 0, W, H, '#2a1810'); px(2, 2, W - 4, H - 4, '#5a3a24'); px(4, 4, W - 8, H - 8, '#24140a');
    for (let r = 0; r < ROWS; r++) { const y = OYB + r * CH; px(4, y + CH - 3, W - 8, 3, '#7a5034'); px(4, y + CH - 3, W - 8, 1, '#9a6a44');
      for (let c = 0; c < COLS; c++) { const v = at(c, r), x = OXB + c * CW; if (v < 0) continue; const [t, l, d] = PAL[v], hh = 16 - ((c * 7 + r * 3) % 3), fl = flash.includes(r * COLS + c);
        px(x + 2, y + CH - 3 - hh, CW - 4, hh, fl ? '#fff6c0' : t); px(x + 2, y + CH - 3 - hh, 2, hh, fl ? '#fff' : l); px(x + CW - 4, y + CH - 3 - hh, 2, hh, d);
        px(x + 3, y + CH - hh + 1, CW - 6, 1, '#e0b050'); px(x + 3, y + CH - 7, CW - 6, 1, '#e0b050');
        if (sel && sel[0] === c && sel[1] === r) { px(x + 1, y + CH - 4 - hh, CW - 2, 1, '#fff'); px(x + 1, y + CH - 4, CW - 2, 1, '#fff'); px(x + 1, y + CH - 4 - hh, 1, hh + 1, '#fff'); px(x + CW - 2, y + CH - 4 - hh, 1, hh + 1, '#fff'); } } }
    C.hudSet(`남은 움직임 ${moves} · 점수 ${score}${combo > 1 ? ` · ${combo}연쇄!` : ''}`); };
  const settle = () => { const m = findAll(); if (!m.size) { busy = false; combo = 0; flash = []; draw(); if (moves <= 0 && !over) { over = true; stopGame(); pxEnd('books', '📚 서가를 정리했어요!', `점수 ${score} · 최고 연쇄 ${best}`, Math.round(score / 40), 'booksStart'); } return; }
    combo++; best = Math.max(best, combo); score += m.size * 10 * combo; flash = [...m]; draw(); sfx(combo > 1 ? 'win' : 'tap');
    setTimeout(() => { if (over || !GAME) return; m.forEach(i => grid[i] = -1);
      for (let c = 0; c < COLS; c++) { const col = []; for (let r = ROWS - 1; r >= 0; r--) if (at(c, r) >= 0) col.push(at(c, r)); for (let r = ROWS - 1, k = 0; r >= 0; r--, k++) grid[r * COLS + c] = k < col.length ? col[k] : rint(5); }
      flash = []; draw(); setTimeout(settle, 220); }, 260); };
  C.cv.onpointerdown = e => { if (busy || over) return; const [x, y] = C.pos(e), c = Math.floor((x - OXB) / CW), r = Math.floor((y - OYB) / CH); if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
    if (!sel) { sel = [c, r]; sfx('tap'); draw(); return; }
    const [sc, sr] = sel; sel = null; if (Math.abs(sc - c) + Math.abs(sr - r) !== 1) { if (!(sc === c && sr === r)) { sel = [c, r]; } draw(); return; }
    const a = sr * COLS + sc, b = r * COLS + c; [grid[a], grid[b]] = [grid[b], grid[a]];
    if (!findAll().size) { draw(); busy = true; setTimeout(() => { [grid[a], grid[b]] = [grid[b], grid[a]]; busy = false; sfx('bad'); draw(); }, 220); return; }
    moves--; busy = true; settle(); };
  lockGame(() => {}); draw();
}

/* ================= 자물쇠 따기 (타이밍) ================= */
/* 남의 방 금고에서만 시작 · 금고 하나당 하루 1번 · 성공하면 주인 은화가 연 만큼의 절반 줄어듦 */
let LP_T = null;
const lpDay = () => { if (!P.lp || P.lp.date !== kstDate()) P.lp = { date: kstDate(), done: [] }; return P.lp; };
const lockLv = owner => { try { return Math.min(3, hoRoom(owner).items.filter(i => i.k === 'padlock').length); } catch (e) { return 0; } };
function safeTry(owner, it) {
  if (!ME || owner === ME.uid) return roomPoke(it);
  const key = `${kstDate()}_${it.id}_${ME.uid}`;
  if (lpDay().done.includes(key)) { sfx('bad'); return toast('🔐 오늘은 이미 손댄 금고예요. 내일 다시 와 보세요'); }
  modal(`<h2 style="color:var(--gold2);margin-top:0">🔐 ${esc(roomTitle(owner))} 금고</h2>
   <p>단단히 잠겨 있다… 몰래 따 볼까?</p>${lockLv(owner) ? `<p style="color:var(--gold2)">${'🔒'.repeat(lockLv(owner))} 자물쇠 ${lockLv(owner)}개로 더 단단해요 (핀이 늘고 빨라져요 · 은화도 더)</p>` : ''}
   <p class="muted">성공하면 은화를 얻고, 주인은 그 절반을 잃어요. 금고마다 하루 한 번.</p>
   <div class="row"><button class="primary" onclick="safeGo('${owner}','${it.id}')">따 보기</button><button onclick="closeModal()">그만두기</button></div>`);
}
function safeGo(owner, id) {
  closeModal(); const key = `${kstDate()}_${id}_${ME.uid}`, d = lpDay(); if (d.done.includes(key)) return;
  d.done.push(key); saveP(); LP_T = { owner, key, back: RV, lv: lockLv(owner) };
  go('lockpick'); lockStart();
}
function lockEnd(title, line, total) {
  const T = LP_T, before = P.coins, r = reward('lockpick', Math.min(25, total)), got = Math.max(0, P.coins - before), amt = Math.floor(got / 2);
  if (T && amt > 0) B.set(`thefts/${T.owner}/log/${T.key}`, { owner: T.owner, thief: ME.uid, amt, at: Date.now(), done: false }).catch(e => console.warn('theft', e));
  LP_T = null;
  finishGame(`<h2 style="color:var(--gold2);margin-top:0">${title}</h2><p>${line}</p><p class="muted">${r || '보상 없음'}${amt > 0 ? ` · 금고 주인의 은화 ${amt}닢이 사라졌어요` : ''}</p>
   <div class="row"><button class="primary" onclick="closeModal();RV=${T && T.back ? `'${T.back}'` : 'null'};go('visit')">방으로 돌아가기</button><button onclick="closeModal()">닫기</button></div>`);
}
/* 금고 주인: 털린 기록을 받아 은화 차감 */
let THEFT_UNSUB = null;
function theftWatch() {
  if (THEFT_UNSUB) { try { THEFT_UNSUB(); } catch (e) {} THEFT_UNSUB = null; }
  if (!ME) return;
  const uid = ME.uid;
  THEFT_UNSUB = B.onCol(`thefts/${uid}/log`, l => { const todo = l.filter(x => !x.done); if (!todo.length) return;
    const apply = () => { if (!P || !ME || ME.uid !== uid) return setTimeout(apply, 800);
      todo.forEach(x => { B.update(`thefts/${uid}/log/${x.id}`, { done: true }).catch(() => {});
        const n = Math.min(x.amt || 0, P.coins || 0); if (n > 0) { P.coins -= n; LOG_W = 'theft'; logAct(-n); LOG_W = null; }
        toast(`🔐 누군가 내 방 금고를 땄어요… 은화 ${n}닢이 사라졌다`); });
      saveP(); if (typeof softRender === 'function') softRender(); };
    apply(); });
}
VIEWS.lockpick = () => !LP_T ? `<div class="panel"><h2>🔐 자물쇠 따기</h2><p class="muted">다른 손님 방의 금고를 눌러 시작해요.</p><button class="primary" onclick="RV=null;go('visit')">👀 놀러 가기</button></div>` : `<div class="panel"><h2>🔐 ${esc(roomTitle(LP_T.owner))} 금고</h2><p class="muted">빛나는 틈이 금색 선에 맞을 때 눌러요. 빗나가면 꼬챙이가 부러져요(3개) · ${capTxt('lockpick')}</p>
  <div id="gbox"></div></div>`;
function lockStart() {
  const C = pxCanvas(120, 150); if (!C) return; const { px, txt } = C, LV = (typeof LP_T !== 'undefined' && LP_T && LP_T.lv) || 0;
  const LOCKS0 = [{ n: '구리 자물쇠', pins: 3, sp: 1.6, prize: 6, col: ['#b8693d', '#e8a070', '#6a3418'] }, { n: '은 자물쇠', pins: 4, sp: 2.2, prize: 8, col: ['#a8b0bc', '#e8ecf4', '#5a6270'] }, { n: '금 자물쇠', pins: 5, sp: 2.9, prize: 11, col: ['#c9a036', '#ffe08a', '#7a5a18'] }];
  const LOCKS = LOCKS0.map(L => Object.assign({}, L, { pins: Math.min(7, L.pins + LV), sp: L.sp * (1 + .18 * LV), prize: L.prize + 2 * LV })), TOL = Math.max(1.9, 3.2 - .45 * LV);
  let li = 0, cur = 0, set = [], picks = 3, total = 0, raf = 0, t0 = performance.now(), msg = '', msgT = 0, open = 0, over = false, ph = [];
  const SHEAR = 52, newLock = () => { cur = 0; set = []; ph = Array.from({ length: LOCKS[li].pins }, () => Math.random() * 6.28); open = 0; };
  newLock();
  const pinY = (i, now) => { const L = LOCKS[li]; return SHEAR + Math.sin(now / 1000 * L.sp * (1 + i * .13) + ph[i]) * 16; };
  C.cv.onpointerdown = () => { if (over || open) return; const now = performance.now(), y = pinY(cur, now), d = Math.abs(y - SHEAR);
    if (d < TOL) { set[cur] = true; cur++; sfx('tap'); msg = d < 1.2 ? '딸깍!' : '찰칵'; msgT = now;
      if (cur >= LOCKS[li].pins) { open = now; total += LOCKS[li].prize + picks; sfx('win'); setTimeout(() => { if (over || !GAME) return; if (li >= LOCKS.length - 1) { over = true; stopGame(); lockEnd('🔐 금고를 열었어요!', `자물쇠 셋을 모두 열었다 · 남은 꼬챙이 ${picks}개`, total); return; } li++; newLock(); }, 1100); } }
    else { picks--; sfx('bad'); msg = '뚝! 꼬챙이가 부러졌다'; msgT = now; if (picks <= 0) { over = true; stopGame(); lockEnd('🔐 꼬챙이가 다 부러졌어요', `자물쇠 ${li}개를 열었다`, total); } } };
  const loop = now => { const L = LOCKS[li], [t, l, d] = L.col, n = L.pins;
    px(0, 0, 120, 150, '#20141a'); px(10, 10, 100, 84, d); px(12, 12, 96, 80, t); px(12, 12, 96, 3, l); px(12, 12, 3, 80, l);
    const pw = n > 5 ? 9 : 12, gp = n > 5 ? 3 : 4, gx = 60 - (n * pw + (n - 1) * gp) / 2;
    for (let i = 0; i < n; i++) { const x = gx + i * (pw + gp), y = set[i] ? SHEAR : pinY(i, now), act = i === cur && !open;
      px(x, 20, pw, 64, '#1a1010'); px(x + 2, 20, pw - 4, 64, '#2a2020');
      px(x + 1, y - 22, pw - 2, 22, set[i] ? '#79b26e' : act ? '#ffe08a' : '#c8c0b0'); px(x + 1, y - 22, 2, 22, '#fff8');
      px(x + 1, y - 1, pw - 2, 2, act ? '#fff6c0' : '#1a1010'); px(x + 3, y + 1, pw - 6, 17, '#8a7a60'); px(x + 3, y, 2, 18, '#b0a080'); px(x + 4, y + 18, pw - 8, 4, '#6a5a48');
      if (act && (now >> 7) % 2) { px(x, y - 24, pw, 1, '#fff'); } }
    px(14, SHEAR - 1, 92, 2, '#e0b050'); px(14, SHEAR - 1, 92, 1, '#fff0b0'); px(8, SHEAR - 3, 4, 6, '#e0b050'); px(108, SHEAR - 3, 4, 6, '#e0b050');
    // 열쇠 구멍 · 꼬챙이
    px(54, 100, 12, 14, d); px(57, 102, 6, 6, '#1a1010'); px(59, 108, 2, 5, '#1a1010');
    for (let k = 0; k < 3; k++) { const ok = k < picks; px(16 + k * 10, 124, 2, 18, ok ? '#c8c8d0' : '#4a4048'); px(16 + k * 10, 124, 5, 2, ok ? '#c8c8d0' : '#4a4048'); }
    if (open) { const u = Math.min(1, (now - open) / 500); px(40, 96 - u * 10, 40, 6, l); txt('열렸다!', 60, 138, '#ffe08a', 9); }
    if (msg && now - msgT < 700) txt(msg, 60, 120, msg.startsWith('뚝') ? '#e88' : '#ffe08a', 7);
    C.hudSet(`${LV ? '🔒'.repeat(LV) + ' ' : ''}${L.n} (${li + 1}/3) · 핀 ${set.filter(Boolean).length}/${n} · 꼬챙이 ${picks} · 모은 은화 ${total}`);
    raf = requestAnimationFrame(loop); };
  lockGame(() => cancelAnimationFrame(raf)); raf = requestAnimationFrame(loop);
}
