/* =========================================================
   햄카타 — 게임 모음 (index.html 전역 사용)
   ========================================================= */
const FEATS = {
  garden:   { n: '온실',          ic: '🌿', d: '씨앗 심고 수확하기' },
  shop:     { n: '상점',          ic: '🛍', d: '칭호와 이름표 테두리' },
  rank:     { n: '랭킹',          ic: '🏆', d: '오늘의 손님 순위' },
  tycoon:   { n: '티룸 타이쿤',    ic: '🍵', d: '손님 주문 맞춰 내기' },
  sins:     { n: '찻잔 떨어뜨리기', ic: '🍵', d: '같은 다과 합치기' },
  memory:   { n: '카드 짝맞추기',  ic: '🃏', d: '같은 그림 찾기' },
  tarot:    { n: '타로 운세',      ic: '🔮', d: '하루 한 장' },
  blackjack:{ n: '살롱 블랙잭',    ic: '♠️', d: '여럿이 은화 걸기' }
};
const FEAT_KEYS = Object.keys(FEATS);
let GAME = null; window.GAME_LOCK = false;
let BJ = null;

function stopGame() { if (GAME) { try { GAME.stop && GAME.stop(); } catch (e) {} GAME = null; } window.GAME_LOCK = false; }
function lockGame(stop) { stopGame(); GAME = { stop, alive: true }; window.GAME_LOCK = true; return GAME; }
const rint = n => Math.floor(Math.random() * n);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const gbox = () => $('#gbox');

/* 오늘의 죄 표시용 */
const SIN_EMB = { wrath: '🔥', greed: '💰', sloth: '💤', gluttony: '🍗', pride: '👑', envy: '👁', lust: '🌹' };

/* ================= 카드 짝맞추기 ================= */
VIEWS.memory = () => `<div class="panel"><h2>🃏 카드 짝맞추기</h2><p class="muted">같은 그림 짝 찾기. 적게 뒤집을수록 은화 ↑ · ${capTxt('memory')}</p>
  <div id="gbox"><button class="primary" style="width:100%" onclick="memStart()">시작</button></div></div>`;
function memStart() {
  const icons = ['🗝️', '🕯️', '🌹', '🍷', '📜', '🦉', '🔮', '⌛'];
  const cards = shuffle([...icons, ...icons]).map(v => ({ v, open: false, done: false }));
  let first = -1, lock = false, moves = 0, pairs = 0, tos = [];
  const draw = () => { const b = gbox(); if (!b) return; b.innerHTML = `<div class="row" style="justify-content:space-between"><b>뒤집기 ${moves}</b><b>짝 ${pairs}/8</b></div><div class="mgrid g4x">${cards.map((c, i) => `<button class="mcell cardf ${c.done ? 'done' : ''}" onclick="memTap(${i})">${c.open || c.done ? c.v : '✦'}</button>`).join('')}</div>`; };
  window.memTap = i => {
    const c = cards[i]; if (lock || c.open || c.done) return; c.open = true;
    if (first < 0) { first = i; draw(); return; }
    moves++; const a = cards[first];
    if (a.v === c.v) { a.done = c.done = true; a.open = c.open = false; first = -1; pairs++; draw();
      if (pairs === 8) { const coins = Math.max(3, 18 - (moves - 8)), r = reward('memory', coins); finishGame(`<h2 style="color:var(--gold2);margin-top:0">🃏 다 찾음!</h2><p>${moves}번 뒤집어 완성</p><p class="muted">${r}</p><div class="row"><button class="primary" onclick="closeModal();memStart()">다시</button><button onclick="closeModal()">닫기</button></div>`); }
    } else { lock = true; draw(); tos.push(setTimeout(() => { a.open = c.open = false; first = -1; lock = false; draw(); }, 750)); }
  };
  lockGame(() => tos.forEach(clearTimeout)); draw();
}

/* ================= 살롱 블랙잭 (여럿이) ================= */
const SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
function bjVal(h) { let v = 0, a = 0; (h || []).forEach(c => { const r = c.slice(0, -1); if (r === 'A') { a++; v += 11; } else v += ['J', 'Q', 'K'].includes(r) ? 10 : +r; }); while (v > 21 && a) { v -= 10; a--; } return v; }
const cardHtml = (c, hide) => hide ? '<span class="pc back">🂠</span>' : `<span class="pc ${/[♥♦]/.test(c) ? 'red' : ''}">${c}</span>`;
function bjFresh() { return { round: rid(), phase: 'bet', seats: {}, order: [], turn: 0, dealer: [], deck: [], turnAt: Date.now() }; }
function bjAdvance(s) {
  s.turn++; while (s.turn < s.order.length && s.seats[s.order[s.turn]] && s.seats[s.order[s.turn]].st !== 'play') s.turn++;
  s.turnAt = Date.now();
  if (s.turn >= s.order.length) bjDealer(s);
}
function bjDealer(s) {
  while (bjVal(s.dealer) < 17) s.dealer.push(s.deck.pop());
  const dv = bjVal(s.dealer), dbj = dv === 21 && s.dealer.length === 2;
  Object.values(s.seats).forEach(p => { const v = bjVal(p.hand);
    p.res = p.st === 'bust' ? 'lose' : p.st === 'bj' ? (dbj ? 'push' : 'bj') : dv > 21 ? 'win' : v > dv ? 'win' : v === dv ? 'push' : 'lose'; });
  s.phase = 'done';
}
async function bjTx(fn) {
  try { return await B.tx('games/bj', cur => fn(cur ? JSON.parse(JSON.stringify(cur)) : bjFresh())); }
  catch (e) { toast('잠시 후 다시 하기 (' + (e.code || e.message || e) + ')'); return false; }
}
const refund = n => { P.coins += n; saveP(); };
async function bjJoin(bet) {
  if (!spend(bet)) return;
  const ok = await bjTx(s => { if (s.phase !== 'bet' || s.seats[ME.uid]) return undefined; s.seats[ME.uid] = { name: myHo() ? cname(myHo()) : PROF.name, bet, hand: [], st: 'wait', res: '' }; return s; });
  if (!ok) { refund(bet); toast('지금은 앉을 수 없음 (판이 진행 중)'); }
}
async function bjLeave() {
  const mine = BJ && BJ.seats && BJ.seats[ME.uid]; if (!mine || BJ.phase !== 'bet') return;
  const ok = await bjTx(s => { if (s.phase !== 'bet' || !s.seats[ME.uid]) return undefined; delete s.seats[ME.uid]; return s; });
  if (ok) refund(mine.bet);
}
function bjDeal() { bjTx(s => {
  if (s.phase !== 'bet' || !Object.keys(s.seats).length) return undefined;
  s.deck = shuffle([].concat(...[0, 1].map(() => SUITS.flatMap(su => RANKS.map(r => r + su)))));
  s.dealer = [s.deck.pop(), s.deck.pop()];
  s.order = Object.keys(s.seats);
  s.order.forEach(u => { const p = s.seats[u]; p.hand = [s.deck.pop(), s.deck.pop()]; p.st = bjVal(p.hand) === 21 ? 'bj' : 'play'; p.res = ''; });
  s.phase = 'play'; s.turn = -1; bjAdvance(s); return s; }); }
async function bjAct(act) {
  let extra = 0;
  if (act === 'double') { const me = BJ && BJ.seats && BJ.seats[ME.uid]; if (!me || !spend(me.bet)) return; extra = me.bet; }
  const ok = await bjTx(s => {
  if (s.phase !== 'play' || s.order[s.turn] !== ME.uid) return undefined;
  const p = s.seats[ME.uid];
  if (act === 'hit') { p.hand.push(s.deck.pop()); const v = bjVal(p.hand); if (v > 21) { p.st = 'bust'; bjAdvance(s); } else if (v === 21) { p.st = 'stand'; bjAdvance(s); } else s.turnAt = Date.now(); }
  else if (act === 'double') { if (p.hand.length !== 2 || p.bet !== extra) return undefined; p.bet *= 2; p.hand.push(s.deck.pop()); p.st = bjVal(p.hand) > 21 ? 'bust' : 'stand'; bjAdvance(s); }
  else { p.st = 'stand'; bjAdvance(s); }
  return s; });
  if (!ok && extra) refund(extra);
}
function bjSkip() { bjTx(s => { if (s.phase !== 'play' || Date.now() - (s.turnAt || 0) < 45000) return undefined; const p = s.seats[s.order[s.turn]]; if (p) p.st = 'stand'; bjAdvance(s); return s; }); }
function bjNew() { bjTx(s => (s.phase === 'done' || !Object.keys(s.seats).length) ? bjFresh() : undefined); }
function bjPayout() {
  if (!BJ || BJ.phase !== 'done' || !P) return; const me = BJ.seats && BJ.seats[ME.uid]; if (!me || !me.res) return;
  P.bjPaid = P.bjPaid || []; if (P.bjPaid.includes(BJ.round)) return;
  P.bjPaid = [...P.bjPaid.slice(-30), BJ.round];
  const back = me.res === 'bj' ? Math.round(me.bet * 2.5) : me.res === 'win' ? me.bet * 2 : me.res === 'push' ? me.bet : 0;
  if (back) { P.coins += back; P.earned += Math.max(0, back - me.bet); } saveP();
  toast(me.res === 'lose' ? `♠ 짐… -${me.bet}` : me.res === 'push' ? '♠ 무승부 (돌려받음)' : `♠ 승리! +${back - me.bet}`);
}
const BJ_RES = { win: '승리', bj: '블랙잭!', push: '무승부', lose: '패배' };
VIEWS.blackjack = () => {
  const s = BJ || bjFresh(), me = s.seats[ME.uid], seats = Object.entries(s.seats), playing = s.phase === 'play', turnU = playing ? s.order[s.turn] : null;
  const dealerHtml = (s.dealer || []).map((c, i) => cardHtml(c, playing && i === 1)).join('') || '<span class="muted">-</span>';
  return `<div class="panel"><h2>♠️ 살롱 블랙잭</h2><p class="muted">딜러보다 21에 가까우면 승리(2배), 블랙잭은 2.5배.</p>
   <div class="card"><b>딜러</b> ${playing ? '' : s.dealer.length ? `<span class="muted">(${bjVal(s.dealer)})</span>` : ''}<div style="margin-top:4px">${dealerHtml}</div></div>
   ${seats.map(([u, p]) => `<div class="card" style="${u === turnU ? 'border-color:var(--gold)' : ''}"><div class="h"><b>${esc(p.name)}${u === ME.uid ? ' (나)' : ''}</b><span class="muted">걸음 ${p.bet}${p.hand.length ? ' · ' + bjVal(p.hand) : ''}${p.st === 'bust' ? ' · 버스트' : p.st === 'bj' ? ' · 블랙잭' : ''}${s.phase === 'done' && p.res ? ' · <b>' + BJ_RES[p.res] + '</b>' : u === turnU ? ' · 차례' : ''}</span></div><div>${p.hand.map(c => cardHtml(c)).join('')}</div></div>`).join('') || '<p class="muted">아직 아무도 앉지 않음.</p>'}
   <div style="margin-top:10px">
   ${s.phase === 'bet' ? (me ? `<div class="row"><button class="primary" onclick="bjDeal()">카드 나누기</button><button onclick="bjLeave()">일어나기 (돌려받기)</button></div><p class="muted">다른 사람이 앉기를 기다렸다가 아무나 "카드 나누기"를 누르면 시작.</p>`
     : `<div class="row">${[5, 10, 20, 50].map(b => `<button onclick="bjJoin(${b})" ${P.coins < b ? 'disabled' : ''}>${b} 은화 걸고 앉기</button>`).join('')}</div>`) : ''}
   ${playing && turnU === ME.uid ? `<div class="row"><button class="primary" onclick="bjAct('hit')">히트 (한 장 더)</button><button onclick="bjAct('stand')">스탠드 (멈춤)</button>${me.hand.length === 2 ? `<button onclick="bjAct('double')" ${P.coins < me.bet ? 'disabled' : ''}>더블 (+${me.bet})</button>` : ''}</div>` : ''}
   ${playing && turnU !== ME.uid ? `<p class="muted">${esc((s.seats[turnU] || {}).name || '')}의 차례.</p>${Date.now() - (s.turnAt || 0) > 45000 ? '<button class="sm" onclick="bjSkip()">⏭ 오래 기다림 · 차례 넘기기</button>' : ''}` : ''}
   ${s.phase === 'done' ? `<button class="primary" onclick="bjNew()">새 판 시작</button>` : ''}
   </div></div>`;
};

/* ================= 구독 ================= */
function gamesOnAuth(u) {
  BJ = null; stopGame(); if (!u) return;
  unsubs.push(B.onDoc('games/bj', d => { BJ = d; bjPayout(); if (tab === 'blackjack') softRender(); }));
}
if (typeof ME !== 'undefined' && ME) gamesOnAuth(ME);
