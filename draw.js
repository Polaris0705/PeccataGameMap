/* =========================================================
   숲속 저택 — 그림 게임: 그림 맞히기 · 텔레스트레이션
   (party.js의 방 시스템 위에서 동작)
   ========================================================= */
PARTY_TYPES.draw = { n: '그림 맞히기', ic: '🎨', min: 2, d: '한 명이 그리고 나머지가 맞히기' };
PARTY_TYPES.tele = { n: '텔레스트레이션', ic: '📒', min: 3, d: '글 → 그림 → 글… 전달하다 보면?' };
const DRAW_WORDS = ['사과', '고양이', '우산', '자전거', '등대', '해바라기', '피아노', '유령', '성', '열쇠', '촛불', '거미', '달', '왕관', '해골', '문어',
  '시계', '안경', '기차', '눈사람', '무지개', '케이크', '편지', '거울', '나무', '박쥐', '뱀', '장미', '망원경', '열기구', '배', '비행기', '해적선', '마녀',
  '호박', '부엉이', '샹들리에', '관', '토끼', '선풍기', '물고기', '로봇', '천사', '용', '버섯', '아이스크림', '기타', '모자', '나비', '화산', '고래', '탐정', '집사', '촉수'];
const DCOLS = ['#1b1b1b', '#ffffff', '#c0392b', '#e67e22', '#f1c40f', '#27ae60', '#2e86de', '#8e44ad', '#795548', '#ff8fb1'];
const DW = 1000, DH = 750;

/* ---------- 공용 그림판 ---------- */
function paintStrokes(cv, strokes, cur) {
  const ctx = cv.getContext('2d'), sx = cv.width / DW, sy = cv.height / DH;
  ctx.fillStyle = '#fffdf7'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  [...(strokes || []), ...(cur ? [cur] : [])].forEach(s => {
    const p = s.p || []; if (p.length < 2) return;
    ctx.strokeStyle = s.c; ctx.lineWidth = s.w * sx; ctx.beginPath(); ctx.moveTo(p[0] * sx, p[1] * sy);
    if (p.length === 2) ctx.lineTo(p[0] * sx + .01, p[1] * sy);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i] * sx, p[i + 1] * sy);
    ctx.stroke();
  });
}
function fitCanvas(cv) { const w = cv.parentElement.clientWidth; cv.width = w; cv.height = Math.round(w * DH / DW); }
const PAD = { strokes: [], cur: null, col: DCOLS[0], w: 8, onChange: null, cv: null };
function padHtml(id) {
  return `<div class="dpad"><canvas id="${id}" class="dcanvas"></canvas></div>
   <div class="dtools">${DCOLS.map(c => `<button class="dcol ${PAD.col === c ? 'on' : ''}" data-c="${c}" style="background:${c}" onclick="padCol('${c}')"></button>`).join('')}
    ${[4, 8, 16, 32].map(w => `<button class="sm ${PAD.w === w ? 'on' : ''}" onclick="padW(${w})"><span class="dsz" style="width:${Math.max(4, w / 2)}px;height:${Math.max(4, w / 2)}px"></span></button>`).join('')}
    <button class="sm" onclick="padUndo()">↶</button><button class="sm danger" onclick="padClear()">🗑</button></div>`;
}
function padMount(id, onChange) {
  const cv = document.getElementById(id); if (!cv) return; PAD.cv = cv; PAD.onChange = onChange; fitCanvas(cv); paintStrokes(cv, PAD.strokes);
  const pos = e => { const r = cv.getBoundingClientRect(); return [Math.round((e.clientX - r.left) / r.width * DW), Math.round((e.clientY - r.top) / r.height * DH)]; };
  cv.onpointerdown = e => { e.preventDefault(); cv.setPointerCapture(e.pointerId); PAD.cur = { c: PAD.col, w: PAD.w, p: pos(e) }; paintStrokes(cv, PAD.strokes, PAD.cur); };
  cv.onpointermove = e => { if (!PAD.cur) return; const [x, y] = pos(e), p = PAD.cur.p; if (Math.abs(x - p[p.length - 2]) + Math.abs(y - p[p.length - 1]) < 4) return; p.push(x, y); paintStrokes(cv, PAD.strokes, PAD.cur); PAD.onChange && PAD.onChange(false); };
  const up = () => { if (!PAD.cur) return; PAD.strokes.push(PAD.cur); PAD.cur = null; paintStrokes(cv, PAD.strokes); PAD.onChange && PAD.onChange(true); };
  cv.onpointerup = up; cv.onpointercancel = up;
}
function padCol(c) { PAD.col = c; document.querySelectorAll('.dcol').forEach(b => b.classList.toggle('on', b.dataset.c === c)); }
function padW(w) { PAD.w = w; document.querySelectorAll('.dtools .sm').forEach(b => { const m = (b.getAttribute('onclick') || '').match(/padW\((\d+)\)/); if (m) b.classList.toggle('on', +m[1] === w); }); }
function padUndo() { PAD.strokes.pop(); if (PAD.cv) paintStrokes(PAD.cv, PAD.strokes); PAD.onChange && PAD.onChange(true); }
function padClear() { PAD.strokes = []; if (PAD.cv) paintStrokes(PAD.cv, PAD.strokes); PAD.onChange && PAD.onChange(true); }
function padReset() { PAD.strokes = []; PAD.cur = null; }
function padImage() { const c = document.createElement('canvas'); c.width = 480; c.height = 360; paintStrokes(c, PAD.strokes); let d = c.toDataURL('image/webp', .7); if (!d.startsWith('data:image/webp')) d = c.toDataURL('image/jpeg', .75); return d; }

/* ---------- 그림 맞히기 ---------- */
let DRAWDOC = null, DRAW_UNSUB = null, DRAW_SEC = null, DRAW_SEC_UNSUB = null, drawSendT = 0, drawPend = false, drawRound = null;
const drawKey = (r, S) => 'roomSecrets/' + r.id + '_w_' + S.round + '_' + S.idx;
function drawWatch() {
  const r = PROOM && roomOf(PROOM), want = r && r.type === 'draw' ? r.id : null;
  if (drawWatch.cur !== want) {
    if (DRAW_UNSUB) { DRAW_UNSUB(); DRAW_UNSUB = null; } DRAWDOC = null; drawWatch.cur = want;
    if (want) DRAW_UNSUB = B.onDoc('draws/' + want, d => { DRAWDOC = d; const r2 = roomOf(PROOM); if (r2 && r2.state && r2.state.drawer !== ME.uid) { const cv = $('#dview'); if (cv) paintStrokes(cv, (d && d.strokes) || [], d && d.cur); } });
  }
  const S = r && r.state, sk = r && r.type === 'draw' && S && S.drawer === ME.uid && S.phase !== 'pick' ? drawKey(r, S) : null;
  if (drawWatch.sk !== sk) { if (DRAW_SEC_UNSUB) { DRAW_SEC_UNSUB(); DRAW_SEC_UNSUB = null; } DRAW_SEC = null; drawWatch.sk = sk; if (sk) DRAW_SEC_UNSUB = B.onDoc(sk, d => { DRAW_SEC = d; }); }
}
function drawPush(force) {
  const r = roomOf(PROOM); if (!r) return;
  const send = () => { drawSendT = Date.now(); drawPend = false; B.set('draws/' + r.id, { round: r.state.round + '_' + r.state.idx, strokes: PAD.strokes, cur: PAD.cur || null, at: Date.now() }).catch(() => {}); };
  if (force || Date.now() - drawSendT > 350) send(); else if (!drawPend) { drawPend = true; setTimeout(send, 360); }
}
function drawView(r, host) {
  const S = r.state || {}, ps = r.players || {};
  if (r.status === 'lobby') return `<p class="muted">차례대로 한 명씩 그림을 그리고, 나머지는 아래 칸에 정답을 적어요. 빨리 맞힐수록 점수가 높아요. 모두 한 번씩 그리면 끝!</p>
    ${needMore(r, PARTY_TYPES.draw)}${host ? `<button class="primary" ${Object.keys(ps).length < 2 ? 'disabled' : ''} onclick="drawStart()">시작</button>` : '<p class="muted">방장이 시작하기를 기다려요…</p>'}`;
  const scores = Object.entries(S.scores || {}).sort((a, b) => b[1] - a[1]);
  const board = `<div class="toggles" style="margin-bottom:6px">${(S.order || []).map(u => `<span class="chip ${u === S.drawer ? 'on' : ''}">${u === S.drawer ? '🎨 ' : ''}${esc((ps[u] || {}).name || '?')} ${(S.scores || {})[u] || 0}</span>`).join('')}</div>`;
  if (r.status === 'done') return board + `<div class="card" style="text-align:center"><div style="font-size:2.2rem">🏆</div><h3>${scores.length ? esc((ps[scores[0][0]] || {}).name) + ' 우승!' : '끝!'}</h3>${scores.map(([u, s], i) => `<div>${i + 1}. ${esc((ps[u] || {}).name)} — ${s}점</div>`).join('')}</div>${host ? '<button class="primary" onclick="drawStart()">한 판 더</button>' : ''}`;
  const me = S.drawer === ME.uid, left = Math.max(0, Math.ceil(((S.endAt || 0) - Date.now()) / 1000));
  if (S.phase === 'pick') return board + (me ? `<h3>그릴 단어를 골라요</h3><div class="toggles">${(S.choices || []).map(w => `<button class="primary" onclick="drawPick('${w}')">${esc(w)}</button>`).join('')}</div>` : `<p class="muted">${esc((ps[S.drawer] || {}).name)}님이 단어를 고르는 중…</p>`);
  const guesses = (S.guesses || []).slice(-12).map(g => `<div class="${g.ok ? 'ok' : ''}" style="font-size:.88rem">${esc(g.name)}: ${g.ok ? '<b style="color:var(--green2)">정답! 🎉</b>' : esc(g.text)}</div>`).join('');
  const mine = (S.guesses || []).some(g => g.uid === ME.uid && g.ok);
  const top = `<div class="row" style="justify-content:space-between"><b id="drawT">⏱ ${left}초</b><b>${S.phase === 'reveal' ? '정답: ' + esc(S.word) : me ? '그릴 단어: ' + esc(DRAW_SEC ? DRAW_SEC.word : '…') : '힌트: ' + esc(S.hint || '')}</b></div>`;
  if (me && S.phase === 'draw') return board + top + padHtml('dpad') + `<div class="glog">${guesses}</div>`;
  return board + top + `<div class="dpad"><canvas id="dview" class="dcanvas"></canvas></div>
    ${S.phase === 'draw' && !mine ? `<div class="row" style="flex-wrap:nowrap;margin-top:6px"><input id="dguess" maxlength="20" placeholder="정답은?" onkeydown="if(event.key==='Enter')drawGuess()"><button class="primary" onclick="drawGuess()">맞히기</button></div>` : mine ? '<p style="color:var(--green2)">정답을 맞혔어요! 다른 사람을 기다려요.</p>' : ''}
    <div class="glog">${guesses}</div>${host && S.phase === 'draw' && Date.now() > (S.endAt || 0) + 8000 ? '<button class="sm" onclick="drawNext(true)">⏭ 다음 사람으로</button>' : ''}`;
}
function drawAfter() {
  const r = PROOM && roomOf(PROOM); if (!r || r.type !== 'draw' || r.status !== 'play') return;
  const S = r.state;
  if (S.drawer === ME.uid && S.phase === 'draw') {
    if (drawRound !== S.round + '_' + S.idx) { drawRound = S.round + '_' + S.idx; padReset(); }
    padMount('dpad', fin => drawPush(fin));
  } else { const cv = $('#dview'); if (cv) { fitCanvas(cv); paintStrokes(cv, (DRAWDOC && DRAWDOC.strokes) || [], DRAWDOC && DRAWDOC.cur); } }
}
function drawStart() {
  rtx(PROOM, x => { if (x.host !== ME.uid) return undefined; const order = shuffle(Object.keys(x.players));
    x.status = 'play'; x.state = { round: rid(), order, idx: 0, drawer: order[0], phase: 'pick', choices: shuffle(DRAW_WORDS).slice(0, 3), guesses: [], scores: {}, hint: '', word: '', endAt: 0 }; return x; });
}
async function drawPick(w) {
  const r = roomOf(PROOM); if (!r) return; const S = r.state;
  try { await B.set(drawKey(r, S), { uid: ME.uid, room: r.id, word: w }); } catch (e) { return toast('실패: ' + (e.code || e.message)); }
  padReset(); drawRound = S.round + '_' + S.idx; B.set('draws/' + r.id, { round: drawRound, strokes: [], cur: null, at: Date.now() }).catch(() => {});
  rtx(r.id, x => { if (x.state.drawer !== ME.uid || x.state.phase !== 'pick') return undefined; x.state.phase = 'draw'; x.state.hint = w.replace(/\S/g, '○'); x.state.endAt = Date.now() + 80000; x.state.guesses = []; return x; });
}
function drawGuess() {
  const t = ($('#dguess') || {}).value; if (!t || !t.trim()) return; $('#dguess').value = '';
  rtx(PROOM, x => { const S = x.state; if (S.phase !== 'draw' || S.drawer === ME.uid || S.guesses.some(g => g.uid === ME.uid && g.ok)) return undefined; S.guesses.push({ uid: ME.uid, name: myName(), text: t.trim(), ok: null, at: Date.now() }); return x; });
}
const dnorm = s => String(s || '').replace(/\s/g, '').toLowerCase();
function drawJudge(r) {
  const S = r.state; if (S.drawer !== ME.uid || r.status !== 'play' || !DRAW_SEC) return;
  if (S.phase === 'draw') {
    const pend = S.guesses.some(g => g.ok === null), allOk = S.order.filter(u => u !== S.drawer).every(u => S.guesses.some(g => g.uid === u && g.ok));
    if (pend) rtx(r.id, x => { const T = x.state; let ch = false;
      T.guesses.forEach(g => { if (g.ok !== null) return; ch = true; g.ok = dnorm(g.text) === dnorm(DRAW_SEC.word);
        if (g.ok) { sfx('ok'); const pts = Math.max(3, Math.round(10 * Math.max(0, T.endAt - g.at) / 80000)); T.scores[g.uid] = (T.scores[g.uid] || 0) + pts; T.scores[T.drawer] = (T.scores[T.drawer] || 0) + 2; } });
      return ch ? x : undefined; });
    else if (allOk || Date.now() > S.endAt) rtx(r.id, x => { if (x.state.phase !== 'draw') return undefined; x.state.phase = 'reveal'; x.state.word = DRAW_SEC.word; x.state.endAt = Date.now() + 4000; return x; });
  } else if (S.phase === 'reveal' && Date.now() > S.endAt) drawNext();
}
function drawNext(force) {
  rtx(PROOM, x => { const S = x.state; if (x.status !== 'play') return undefined; if (!force && S.phase !== 'reveal') return undefined;
    if (force && S.phase === 'draw' && x.host !== ME.uid) return undefined;
    S.idx++; if (S.idx >= S.order.length) { x.status = 'done'; return x; }
    S.drawer = S.order[S.idx]; S.phase = 'pick'; S.choices = shuffle(DRAW_WORDS).slice(0, 3); S.guesses = []; S.hint = ''; S.word = ''; S.endAt = 0; return x; });
}
function drawSettle(r) {
  const S = r.state || {}; if (r.type !== 'draw' || r.status !== 'done' || !S.round || paidRound(S.round) || !(r.players || {})[ME.uid]) return;
  markPaid(S.round); const sc = Object.entries(S.scores || {}).sort((a, b) => b[1] - a[1]);
  const mine = (S.scores || {})[ME.uid] || 0;
  if (sc.length && sc[0][0] === ME.uid && mine > 0) { earn(4); toast('🎨 우승! +4 은화'); } else if (mine > 0) { earn(2); toast('🎨 수고했어요! +2 은화'); } else saveP();
}

/* ---------- 텔레스트레이션 ---------- */
let TELE = { books: {}, unsubs: [], key: null, step: -1, revealIdx: 0, timer: null };
const teleN = S => (S.order || []).length;
const teleChain = (S, uid, step) => { const n = teleN(S), i = S.order.indexOf(uid); return S.order[((i - step) % n + n) % n]; };
const teleKind = step => step === 0 ? 'word' : step % 2 ? 'draw' : 'guess';
function teleWatch() {
  const r = PROOM && roomOf(PROOM), want = r && r.type === 'tele' && r.status !== 'lobby' ? r.id + '|' + r.state.round : null;
  if (TELE.key === want) return;
  TELE.unsubs.forEach(f => f()); TELE.unsubs = []; TELE.books = {}; TELE.key = want; TELE.step = -1;
  if (want) r.state.order.forEach(c => TELE.unsubs.push(B.onDoc('teleBooks/' + r.id + '_' + r.state.round + '_' + c, d => { TELE.books[c] = d; if (tab === 'party') softRender(); })));
}
function teleView(r, host) {
  const S = r.state || {}, ps = r.players || {}, n = Object.keys(ps).length;
  if (r.status === 'lobby') return `<p class="muted">각자 단어를 하나 적으면 책이 옆 사람에게 넘어가요. 받은 단어를 그림으로, 받은 그림을 글로… 마지막에 책을 펼쳐 보며 웃어요! 참가하면 +3 은화.</p>
    ${needMore(r, PARTY_TYPES.tele)}${host ? `<button class="primary" ${n < 3 ? 'disabled' : ''} onclick="teleStart()">시작</button>` : '<p class="muted">방장이 시작하기를 기다려요…</p>'}`;
  if (S.phase === 'reveal' || r.status === 'done') {
    const c = S.order[Math.min(TELE.revealIdx, S.order.length - 1)], bk = TELE.books[c];
    const ents = (bk && bk.entries) || [];
    return `<h3>📖 ${esc((ps[c] || {}).name || '?')}의 책 (${Math.min(TELE.revealIdx, S.order.length - 1) + 1}/${S.order.length})</h3>
      ${ents.map(e => `<div class="card"><div class="muted" style="font-size:.78rem">${esc(e.name)} · ${e.type === 'word' ? '처음 단어' : e.type === 'draw' ? '그림' : '추측'}</div>${e.img ? `<img src="${e.img}" style="width:100%;border-radius:8px;background:#fffdf7">` : `<div style="font-size:1.3rem;font-weight:700">${esc(e.text || '…')}</div>`}</div>`).join('') || '<p class="muted">불러오는 중…</p>'}
      <div class="row"><button onclick="TELE.revealIdx=Math.max(0,TELE.revealIdx-1);render()">← 이전 책</button><button class="primary" onclick="TELE.revealIdx=Math.min(${S.order.length - 1},TELE.revealIdx+1);render()">다음 책 →</button>${host ? '<button onclick="teleAgain()">한 판 더</button>' : ''}</div>`;
  }
  const step = S.step, kind = teleKind(step), done = (S.sub || {})[ME.uid], total = teleN(S), cnt = Object.keys(S.sub || {}).length;
  const head = `<div class="row" style="justify-content:space-between"><b>${step + 1}/${total}단계 · ${kind === 'word' ? '단어 정하기' : kind === 'draw' ? '그리기' : '맞히기'}</b><b id="teleT"></b><span class="muted">제출 ${cnt}/${total}</span></div>`;
  if (done) return head + '<p class="muted" style="text-align:center;margin:30px 0">✓ 제출했어요. 다른 사람을 기다려요…</p>';
  const chain = teleChain(S, ME.uid, step), prev = step > 0 ? ((TELE.books[chain] || {}).entries || [])[step - 1] : null;
  if (kind === 'word') return head + `<p>책에 적을 첫 단어(또는 짧은 문장)를 정해요.</p><div class="row" style="flex-wrap:nowrap"><input id="tword" maxlength="30" placeholder="예: 비 오는 날의 집사"><button onclick="$('#tword').value=DRAW_WORDS[rint(DRAW_WORDS.length)]">🎲</button></div><button class="primary" style="width:100%;margin-top:8px" onclick="teleSubmit()">제출</button>`;
  if (!prev) return head + '<p class="muted">앞 사람의 책을 받는 중…</p>';
  if (kind === 'draw') return head + `<p>이걸 그려요: <b style="font-size:1.2rem;color:var(--gold2)">${esc(prev.text)}</b></p>${padHtml('tpad')}<button class="primary" style="width:100%;margin-top:8px" onclick="teleSubmit()">제출</button>`;
  return head + `<p>이 그림은 무엇일까요?</p><img src="${prev.img}" style="width:100%;border-radius:8px;background:#fffdf7"><div class="row" style="flex-wrap:nowrap;margin-top:8px"><input id="tguess" maxlength="30" placeholder="그림이 뜻하는 것"><button class="primary" onclick="teleSubmit()">제출</button></div>`;
}
function teleAfter() {
  const r = PROOM && roomOf(PROOM); if (!r || r.type !== 'tele' || r.status !== 'play' || r.state.phase !== 'play') return;
  const S = r.state;
  if (TELE.step !== S.step) { TELE.step = S.step; padReset(); TELE.deadline = Date.now() + (teleKind(S.step) === 'draw' ? 90000 : 45000); }
  if (teleKind(S.step) === 'draw' && !(S.sub || {})[ME.uid]) padMount('tpad', null);
}
function teleStart() {
  rtx(PROOM, x => { if (x.host !== ME.uid) return undefined; x.status = 'play'; x.state = { round: rid(), order: shuffle(Object.keys(x.players)), step: 0, sub: {}, phase: 'play' }; return x; });
  TELE.revealIdx = 0;
}
async function teleSubmit(auto) {
  const r = roomOf(PROOM); if (!r) return; const S = r.state; if ((S.sub || {})[ME.uid]) return;
  const step = S.step, kind = teleKind(step), chain = teleChain(S, ME.uid, step);
  let e = { type: kind, uid: ME.uid, name: myName() };
  if (kind === 'draw') e.img = padImage();
  else { const v = ((kind === 'word' ? $('#tword') : $('#tguess')) || {}).value; const t = (v || '').trim(); if (!t && !auto) return toast('내용을 적어 주세요'); e.text = t || (kind === 'word' ? DRAW_WORDS[rint(DRAW_WORDS.length)] : '…모르겠다'); }
  const bk = 'teleBooks/' + r.id + '_' + S.round + '_' + chain;
  try { await B.tx(bk, cur => { const d = cur || { room: r.id, owner: chain, entries: [] }; if ((d.entries || []).length !== step) return undefined; d.entries = [...(d.entries || []), e]; return d; }); }
  catch (er) { return toast('제출 실패: ' + (er.code || er.message)); }
  rtx(r.id, x => { const T = x.state; if (T.step !== step) return undefined; T.sub = T.sub || {}; T.sub[ME.uid] = true;
    if (Object.keys(T.sub).length >= T.order.length) { T.step++; T.sub = {}; if (T.step >= T.order.length) { T.phase = 'reveal'; x.status = 'done'; } } return x; });
}
function teleTick() {
  const r = PROOM && roomOf(PROOM); if (!r || r.type !== 'tele' || r.status !== 'play' || r.state.phase !== 'play' || (r.state.sub || {})[ME.uid] || !TELE.deadline) return;
  const left = Math.max(0, Math.ceil((TELE.deadline - Date.now()) / 1000)), el = $('#teleT'); if (el) el.textContent = '⏱ ' + left + '초';
  if (left <= 0) { TELE.deadline = 0; teleSubmit(true); }
}
function teleAgain() { rtx(PROOM, x => { if (x.host !== ME.uid) return undefined; x.status = 'lobby'; x.state = {}; return x; }); }
function teleSettle(r) {
  const S = r.state || {}; if (r.type !== 'tele' || r.status !== 'done' || !S.round || paidRound(S.round) || !(r.players || {})[ME.uid]) return;
  markPaid(S.round); earn(3); toast('📒 텔레스트레이션 참가 +3 은화');
}

/* ---------- 연결 ---------- */
(() => {
  const baseView = roomView;
  roomView = function (r) {
    if (r.type !== 'draw' && r.type !== 'tele') return baseView(r);
    const t = PARTY_TYPES[r.type], host = r.host === ME.uid, ps = Object.entries(r.players || {}), inRoom = !!(r.players || {})[ME.uid];
    const body = !inRoom ? `<p class="muted">이 방에 참가하지 않았어요.</p><button class="primary" onclick="roomJoin('${r.id}')">참가</button>` : r.type === 'draw' ? drawView(r, host) : teleView(r, host);
    setTimeout(() => { if (r.type === 'draw') drawAfter(); else teleAfter(); }, 0);
    return `<div class="panel"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${t.ic} ${t.n}</h2>
      <div class="row" style="flex:0 0 auto">${host ? '<button class="sm danger" onclick="roomClose()">방 닫기</button>' : ''}<button class="sm" onclick="roomLeave()">나가기</button><button class="sm" onclick="PROOM=null;render()">목록</button></div></div>
      <div class="toggles" style="margin:8px 0">${ps.map(([u, p]) => `<span class="chip ptchip ${u === ME.uid ? 'on' : ''}">${pxAva(u)}${u === r.host ? '👑 ' : ''}${esc(p.name)}</span>`).join('')}</div><div class="pxstage">${body}</div></div>`;
  };
  const baseOnAuth = partyOnAuth;
  partyOnAuth = function (u) {
    baseOnAuth(u);
    if (!u) { if (DRAW_UNSUB) DRAW_UNSUB(); if (DRAW_SEC_UNSUB) DRAW_SEC_UNSUB(); TELE.unsubs.forEach(f => f()); TELE.unsubs = []; clearInterval(TELE.timer); return; }
    unsubs.push(B.onCol('rooms', l => {
      l.forEach(r => { if (!(r.players || {})[ME.uid]) return; if (r.type === 'draw') { drawSettle(r); if (r.id === PROOM) drawJudge(r); } if (r.type === 'tele') teleSettle(r); });
      drawWatch(); teleWatch();
    }));
    clearInterval(TELE.timer);
    TELE.timer = setInterval(() => {
      if (tab !== 'party' || !PROOM) return; const r = roomOf(PROOM); if (!r) return;
      if (r.type === 'draw' && r.status === 'play') { const el = $('#drawT'); if (el) el.textContent = '⏱ ' + Math.max(0, Math.ceil(((r.state.endAt || 0) - Date.now()) / 1000)) + '초'; drawJudge(r); }
      if (r.type === 'tele') teleTick();
    }, 1000);
  };
  // 그리는 중에는 화면 전체를 다시 그리지 않기
  const baseSoft = softRender;
  softRender = function () {
    const r = PROOM && tab === 'party' && roomOf(PROOM);
    if (r && PAD.cur) { pendingRender = true; return; }
    if (r && (r.type === 'draw' || r.type === 'tele')) {
      const S = r.state || {}, key = [r.status, S.phase, S.idx, S.step, S.drawer, S.round].join('|');
      if (key !== softRender._k) { softRender._k = key; render(); return; }
      const ae = document.activeElement;
      if (r.type === 'draw' && ae && ae.id === 'dguess') { const lg = document.querySelector('.glog'); if (lg) lg.innerHTML = (S.guesses || []).slice(-12).map(g => `<div style="font-size:.88rem">${esc(g.name)}: ${g.ok ? '<b style="color:var(--green2)">정답! 🎉</b>' : esc(g.text)}</div>`).join(''); return; }
    }
    if (r && r.type === 'draw' && r.status === 'play' && r.state.drawer === ME.uid && r.state.phase === 'draw' && $('#dpad')) { const lg = document.querySelector('.glog'); if (lg) lg.innerHTML = (r.state.guesses || []).slice(-12).map(g => `<div style="font-size:.88rem">${esc(g.name)}: ${g.ok ? '<b style="color:var(--green2)">정답! 🎉</b>' : esc(g.text)}</div>`).join(''); return; }
    if (r && r.type === 'tele' && r.status === 'play' && r.state.phase === 'play' && teleKind(r.state.step) === 'draw' && !(r.state.sub || {})[ME.uid] && $('#tpad') && TELE.step === r.state.step) return;
    return baseSoft();
  };
})();
if (typeof ME !== 'undefined' && ME) partyOnAuth(ME);
