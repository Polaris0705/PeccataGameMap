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
  const cv = $('#gcv'), cw = cv.clientWidth || w * 3, S = Math.max(2, 2 * Math.round(cw / w * (window.devicePixelRatio || 1) / 2));   // 짝수배 → 반 칸 도트
  cv.width = w * S; cv.height = h * S; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const hs = S / 2, q = v => Math.round(v * 2) * hs;
  const px = (x, y, ww, hh, col) => { g.fillStyle = col; const X = q(x), Y = q(y); g.fillRect(X, Y, Math.max(hs, q(x + ww) - X), Math.max(hs, q(y + hh) - Y)); };
  const txt = (s, x, y, col, size, align) => { g.fillStyle = col; g.font = `${Math.round((size || 7) * S)}px Galmuri11, monospace`; g.textAlign = align || 'center'; g.fillText(s, x * S, y * S); };
  const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * w, (e.clientY - r.top) / r.height * h]; };
  const hudSet = s => { const el = $('#ghud'); if (el) el.innerHTML = s; };
  return { cv, g, px, txt, pos, hudSet, w, h };
}
/* ================= 자물쇠 따기 (타이밍) ================= */
/* 남의 방 금고에서만 시작 · 금고 하나당 하루 1번 · 성공하면 주인 은화가 연 만큼의 절반 줄어듦 */
let LP_T = null;
const lpDay = () => { if (!P.lp || P.lp.date !== kstDate()) P.lp = { date: kstDate(), done: [] }; return P.lp; };
const lockLv = owner => { try { return Math.min(3, hoRoom(owner).items.filter(i => i.k === 'padlock').length); } catch (e) { return 0; } };
function safeTry(owner, it) {
  if (!ME || owner === ME.uid) return roomPoke(it);
  const key = `${kstDate()}_${it.id}_${ME.uid}`;
  if (lpDay().done.includes(key)) { sfx('bad'); return toast('🔐 오늘은 이미 손댄 금고. 내일 다시 와 보기'); }
  modal(`<h2 style="color:var(--gold2);margin-top:0">🔐 ${esc(roomTitle(owner))} 금고</h2>
   <p>단단히 잠겨 있다… 몰래 따 볼까?</p>${lockLv(owner) ? `<p style="color:var(--gold2)">${'🔒'.repeat(lockLv(owner))} 자물쇠 ${lockLv(owner)}개로 더 단단함 (핀이 늘고 빨라짐 · 은화도 더)</p>` : ''}
   <p class="muted">성공하면 은화를 얻고, 주인은 그 절반을 잃음. 금고마다 하루 한 번.</p>
   <div class="row"><button class="primary" onclick="safeGo('${owner}','${it.id}')">따 보기</button><button onclick="closeModal()">그만두기</button></div>`);
}
function safeGo(owner, id) {
  closeModal(); const key = `${kstDate()}_${id}_${ME.uid}`, d = lpDay(); if (d.done.includes(key)) return;
  d.done.push(key); saveP(); LP_T = { owner, key, back: RV, lv: lockLv(owner) };
  go('lockpick'); lockStart();
}
function lockEnd(title, line, total) {
  const T = LP_T, before = P.coins, r = reward('lockpick', Math.min(25, total)), got = Math.max(0, P.coins - before), amt = Math.floor(got / 2);
  if (T && amt > 0) { P.stole = (P.stole || 0) + 1; saveP(); }
  if (T && amt > 0) B.set(`thefts/${T.owner}/log/${T.key}`, { owner: T.owner, thief: ME.uid, amt, at: Date.now(), done: false }).catch(e => console.warn('theft', e));
  LP_T = null;
  finishGame(`<h2 style="color:var(--gold2);margin-top:0">${title}</h2><p>${line}</p><p class="muted">${r || '보상 없음'}${amt > 0 ? ` · 금고 주인의 은화 ${amt}닢이 사라짐` : ''}</p>
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
        toast(`🔐 누군가 내 방 금고를 땀… 은화 ${n}닢이 사라졌다`); });
      saveP(); if (typeof softRender === 'function') softRender(); };
    apply(); });
}
VIEWS.lockpick = () => !LP_T ? `<div class="panel"><h2>🔐 자물쇠 따기</h2><p class="muted">다른 손님 방의 금고를 눌러 시작.</p><button class="primary" onclick="RV=null;go('visit')">👀 놀러 가기</button></div>` : `<div class="panel"><h2>🔐 ${esc(roomTitle(LP_T.owner))} 금고</h2><p class="muted">빛나는 틈이 금색 선에 맞을 때 누름. 빗나가면 꼬챙이가 부러짐(3개) · ${capTxt('lockpick')}</p>
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
      if (cur >= LOCKS[li].pins) { open = now; total += LOCKS[li].prize + picks; sfx('win'); setTimeout(() => { if (over || !GAME) return; if (li >= LOCKS.length - 1) { over = true; stopGame(); lockEnd('🔐 금고를 엶!', `자물쇠 셋을 모두 열었다 · 남은 꼬챙이 ${picks}개`, total); return; } li++; newLock(); }, 1100); } }
    else { picks--; sfx('bad'); msg = '뚝! 꼬챙이가 부러졌다'; msgT = now; if (picks <= 0) { over = true; stopGame(); lockEnd('🔐 꼬챙이가 다 부러짐', `자물쇠 ${li}개를 열었다`, total); } } };
  const loop = now => { const L = LOCKS[li], [t, l, d] = L.col, n = L.pins;
    px(0, 0, 120, 150, '#d6d9e1'); for (let y = 0; y < 150; y += 5) px(0, y, 120, .5, '#c8ccd6');
    // 자물쇠 몸통 (반 칸: 테두리 · 빗각 · 리벳)
    px(10, 10, 100, 84, '#140c10'); px(10.5, 10.5, 99, 83, d); px(12, 12, 96, 80, t); px(12, 12, 96, 1.5, l); px(12, 13.5, 96, .5, t); px(12, 12, 1.5, 80, l); px(106.5, 12, 1.5, 80, d); px(12, 90.5, 96, 1.5, d);
    [[15, 15], [103, 15], [15, 87], [103, 87]].forEach(([x, y]) => { px(x - 1, y - 1, 2, 2, d); px(x - 1, y - 1, 1, 1, l); px(x - .5, y - .5, .5, .5, '#ffffff'); });
    const pw = n > 5 ? 9 : 12, gp = n > 5 ? 3 : 4, gx = 60 - (n * pw + (n - 1) * gp) / 2;
    for (let i = 0; i < n; i++) { const x = gx + i * (pw + gp), y = set[i] ? SHEAR : pinY(i, now), act = i === cur && !open;
      px(x, 20, pw, 64, '#1a1010'); px(x + 1, 20, pw - 2, 64, '#2a2020'); px(x + 1, 20, .5, 64, '#3a2e2e'); px(x + pw - 1.5, 20, .5, 64, '#140a0a');
      const top = set[i] ? '#79b26e' : act ? '#ffe08a' : '#c8c0b0', topD = set[i] ? '#4f8a55' : act ? '#c9a036' : '#8a8478';
      px(x + 1, y - 22, pw - 2, 22, topD); px(x + 1.5, y - 21.5, pw - 3, 21, top); px(x + 1.5, y - 21.5, 1, 21, '#ffffff88'); px(x + 2.5, y - 21.5, .5, 21, '#ffffff44'); px(x + 1.5, y - 21.5, pw - 3, .5, '#ffffff');
      px(x + 1.5, y - 15, pw - 3, .5, topD); px(x + 1.5, y - 8, pw - 3, .5, topD);
      px(x + 1, y - 1, pw - 2, 2, act ? '#fff6c0' : '#1a1010'); px(x + 1, y - .5, pw - 2, .5, act ? '#ffffff' : '#0a0606');
      px(x + 2.5, y + 1, pw - 5, 17.5, '#5a4a38'); px(x + 3, y + 1, pw - 6, 17, '#8a7a60'); px(x + 3, y + 1, 1, 17, '#b0a080'); px(x + 3, y + 1, pw - 6, .5, '#c8b898');
      px(x + 3.5, y + 18, pw - 7, 2.5, '#6a5a48'); px(x + 4, y + 20.5, pw - 8, 1.5, '#5a4a38'); px(x + 4.5, y + 22, pw - 9, .5, '#4a3a2a');
      if (act && (now >> 7) % 2) { px(x, y - 24, pw, .5, '#fff'); px(x + pw / 2 - .5, y - 25, 1, .5, '#fff'); } }
    px(14, SHEAR - 1, 92, 2, '#e0b050'); px(14, SHEAR - 1, 92, .5, '#fff0b0'); px(14, SHEAR + .5, 92, .5, '#a07028');
    px(8, SHEAR - 3, 4, 6, '#a07028'); px(8.5, SHEAR - 2.5, 3, 5, '#e0b050'); px(8.5, SHEAR - 2.5, 3, .5, '#fff0b0'); px(108, SHEAR - 3, 4, 6, '#a07028'); px(108.5, SHEAR - 2.5, 3, 5, '#e0b050'); px(108.5, SHEAR - 2.5, 3, .5, '#fff0b0');
    // 열쇠 구멍 (둥근 판) · 꼬챙이
    px(53, 99.5, 14, 15, '#140c10'); px(53.5, 100, 13, 14, d); px(54, 100.5, 12, .5, l); px(54, 100.5, .5, 13, l);
    px(58, 102.5, 4, .5, '#1a1010'); px(57.5, 103, 5, .5, '#1a1010'); px(57, 103.5, 6, 3.5, '#1a1010'); px(57.5, 107, 5, .5, '#1a1010'); px(58.5, 107.5, 3, 5.5, '#1a1010'); px(58, 112.5, 4, .5, '#1a1010'); px(58, 104, 1, 1, '#3a2a2a');
    for (let k = 0; k < 3; k++) { const ok = k < picks, cA = ok ? '#5a5e6c' : '#b4b8c4', cB = ok ? '#2e3038' : '#9a9eaa', x = 16 + k * 10;
      px(x, 124, 2, 18, cB); px(x, 124, 1, 18, cA); px(x + .5, 124, .5, 17.5, ok ? '#9aa0b0' : '#c8ccd6'); px(x, 124, 5, 2, cB); px(x, 124, 5, 1, cA); px(x + 4.5, 126, .5, 1, cB); px(x - .5, 141.5, 3, .5, cB); }
    if (open) { const u = Math.min(1, (now - open) / 500); px(40, 96 - u * 10, 40, 6, l); txt('열렸다!', 60, 138, '#ffe08a', 9); }
    if (msg && now - msgT < 700) txt(msg, 60, 120, msg.startsWith('뚝') ? '#e88' : '#ffe08a', 7);
    C.hudSet(`${LV ? '🔒'.repeat(LV) + ' ' : ''}${L.n} (${li + 1}/3) · 핀 ${set.filter(Boolean).length}/${n} · 꼬챙이 ${picks} · 모은 은화 ${total}`);
    raf = requestAnimationFrame(loop); };
  lockGame(() => cancelAnimationFrame(raf)); raf = requestAnimationFrame(loop);
}
