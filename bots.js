/* =========================================================
   햄카타 — 파티 게임 봇 (눈치게임 · 은화 경매 · 라이어 · 인랑)
   방장이 대기실에서 추가. 봇 행동은 방장 기기가 대신 처리.
   봇 id: bot_1 … · players[id] = { name, bot: true }
   ========================================================= */
const BOT_TYPES = ['nunchi', 'auction', 'liar', 'werewolf'];
const BOT_NAMES = ['봇 하나', '봇 둘', '봇 셋', '봇 넷', '봇 다섯', '봇 여섯', '봇 일곱', '봇 여덟'];
let BOT_NAMES_KP = [];   // KP가 저택 설정에서 바꾼 이름 (settings/game.botNames)
/* 정해 둔 이름 중 이 방에서 아직 안 쓴 것을 무작위로. 다 쓰면 기본 이름 */
function botNamePick(x, i) {
  const used = new Set(Object.values(x.players || {}).filter(p => p && p.bot).map(p => String(p.name || '').replace(/^🤖 /, '')));
  const pool = [...new Set(BOT_NAMES_KP.map(n => String(n || '').trim()).filter(Boolean))].filter(n => !used.has(n));
  if (pool.length) return pool[Math.floor(Math.random() * pool.length)];
  return BOT_NAMES.find(n => !used.has(n)) || BOT_NAMES[i - 1];
}
const isBot = id => typeof id === 'string' && id.startsWith('bot_');
const botsOf = r => Object.keys((r && r.players) || {}).filter(isBot);
function botAdd() {
  rtx(PROOM, x => { if (x.host !== ME.uid || x.status !== 'lobby') return undefined; x.players = x.players || {};
    let i = 1; while (x.players['bot_' + i]) i++; if (i > BOT_NAMES.length) return undefined;
    x.players['bot_' + i] = { name: '🤖 ' + botNamePick(x, i), bot: true, at: Date.now() }; return x; });
}
function botDel() {
  rtx(PROOM, x => { if (x.host !== ME.uid || x.status !== 'lobby') return undefined; const b = botsOf(x).pop(); if (!b) return undefined; delete x.players[b]; return x; });
}
function botBar(r) {
  if (!r || r.host !== ME.uid || r.status !== 'lobby' || !BOT_TYPES.includes(r.type)) return '';
  const n = botsOf(r).length;
  return `<div class="row" style="gap:6px;margin:6px 0"><button class="sm" onclick="botAdd()" ${n >= BOT_NAMES.length ? 'disabled' : ''}>🤖 봇 추가</button>${n ? `<button class="sm" onclick="botDel()">봇 빼기</button>` : ''}<span class="muted" style="font-size:.8rem">봇 ${n}명 · 방장 화면이 대신 움직임</span></div>`;
}
const BOT = { t: {}, said: {} };   // 봇별 다음 행동 시각
const botWait = (key, a, b) => { const now = Date.now(); if (!BOT.t[key]) BOT.t[key] = now + a + Math.random() * (b - a); return now >= BOT.t[key]; };
const botPick = a => a[Math.floor(Math.random() * a.length)];

/* ---------- 눈치게임 ---------- */
function botNunchi(r) {
  const S = r.state || {}; if (r.status !== 'play' || Date.now() < (S.startAt || 0) || S.res) return;
  botsOf(r).forEach(b => { if ((S.calls || []).some(c => c.uid === b)) return;
    if (!botWait(`n_${S.round}_${S.n}_${b}`, 600, 5200)) return;
    rtx(PROOM, x => { const s = x.state; if (x.status !== 'play' || s.res || s.calls.some(c => c.uid === b)) return undefined;
      const now = Date.now(), last = s.calls[s.calls.length - 1], k = s.n, name = (x.players[b] || {}).name || '봇';
      if (last && now - last.at < 1000 && Math.random() < .5) { s.calls.push({ uid: b, name, num: last.num, at: now }); s.res = { type: 'clash', num: last.num, losers: [last.uid, b] }; }
      else { s.calls.push({ uid: b, name, num: k, at: now }); s.n++; }
      const all = Object.keys(x.players); if (!s.res && s.calls.length >= all.length - 1) s.res = { type: 'last', losers: all.filter(u => !s.calls.some(c => c.uid === u)) };
      if (s.res) x.status = 'done'; return x; });
  });
}

/* ---------- 은화 경매 (봇 낙찰은 거래 없음) ---------- */
function botAuction(r) {
  const S = r.state || {}; if (r.status !== 'play' || Date.now() > (S.endAt || 0)) return;
  botsOf(r).forEach(b => { const cap = BOT.said['cap_' + S.round + b] || (BOT.said['cap_' + S.round + b] = (S.min || 1) + 5 + Math.floor(Math.random() * 40));
    const cur = S.bid ? S.bid.amt : (S.min || 1) - 1; if ((S.bid && S.bid.uid === b) || cur + 1 > cap) return;
    if (!botWait(`a_${S.round}_${cur}_${b}`, 2500, 9000)) return;
    const amt = Math.min(cap, cur + 1 + Math.floor(Math.random() * 5));
    rtx(PROOM, x => { const s = x.state; if (x.status !== 'play' || Date.now() > s.endAt) return undefined; const c = s.bid ? s.bid.amt : s.min - 1; if (amt <= c) return undefined;
      s.bid = { uid: b, name: (x.players[b] || {}).name || '봇', amt, bot: true }; s.endAt = Math.max(s.endAt, Date.now() + 10000); return x; });
  });
}

/* ---------- 라이어 ---------- */
const BOT_HINT = ['자주 보는 거', '생각보다 흔함', '분위기 있음', '좋아하는 사람 많음', '옛날부터 있었음', '손이 많이 감', '보면 바로 앎', '여럿이 같이 쓰기도 함', '크기는 그때그때 다름', '이름은 다들 앎', '은근히 무서울 때도 있음', '저택에도 있을 법함'];
function botLiar(r) {
  const S = r.state || {}; if (r.status !== 'play') return; const bots = botsOf(r), A = PANSWER && PANSWER.round === S.round ? PANSWER : null;
  if (S.phase === 'hint') { const cur = (S.order || [])[S.turn]; if (!isBot(cur) || !botWait(`l_${S.round}_${S.turn}`, 1800, 4200)) return;
    const used = (S.hints || []).map(h => h.text), text = botPick(BOT_HINT.filter(t => !used.includes(t)).concat(BOT_HINT).slice(0, 12));
    rtx(PROOM, x => { const s = x.state; if (s.phase !== 'hint' || s.order[s.turn] !== cur) return undefined; s.hints.push({ uid: cur, name: (x.players[cur] || {}).name || '봇', text }); s.turn++; if (s.turn >= s.order.length) s.phase = 'vote'; return x; });
  } else if (S.phase === 'vote') { bots.forEach(b => { if ((S.votes || {})[b] || !botWait(`lv_${S.round}_${b}`, 1500, 6000)) return;
      const pool = (S.order || []).filter(u => u !== b && (!A || u !== A.liar || Math.random() < .45)), t = botPick(pool.length ? pool : (S.order || []).filter(u => u !== b));
      rtx(PROOM, x => { const s = x.state; if (s.phase !== 'vote' || s.votes[b]) return undefined; s.votes[b] = t; if (Object.keys(s.votes).length >= s.order.length) s.phase = 'tally'; return x; }); });
  } else if (S.phase === 'guess' && isBot(S.accused)) { if (!botWait(`lg_${S.round}`, 2500, 5000)) return; const g = botPick(LIAR_WORDS[S.cat] || ['모름']);
    rtx(PROOM, x => { if (x.state.phase !== 'guess' || x.state.accused !== S.accused) return undefined; x.state.guess = g; x.state.phase = 'judge'; return x; });
  }
}

/* ---------- 인랑 ---------- */
const BOT_WW_ACT = {};   // `${round}_${n}_${bot}` → 대상 (방장 기기에만)
const BOT_WW_SAY = ['음… 아직 모르겠음', '어젯밤 조용했던 사람이 수상함', '나는 마을 사람임', '말이 적은 사람부터 보자', '투표는 신중하게', '그 말 좀 이상한데?', '일단 믿어 봄'];
function botWerewolf(r) {
  const S = r.state || {}; if (r.status !== 'play' || !WWA || WWA.round !== S.round) return; const R = WWA.roles, alive = S.alive || [];
  botsOf(r).filter(b => alive.includes(b)).forEach(b => {
    if (S.phase === 'night' && !(S.done || {})[b]) { if (!botWait(`wn_${S.round}_${S.n}_${b}`, 2500, 9000)) return; const role = R[b];
      const pool = alive.filter(u => u !== b && !(role === 'wolf' && R[u] === 'wolf'));
      if ((role === 'wolf' && S.n > 1) || role === 'seer' || role === 'knight') BOT_WW_ACT[`${S.round}_${S.n}_${b}`] = botPick(pool);
      rtx(PROOM, x => { const s = x.state; if (s.phase !== 'night' || s.n !== S.n) return undefined; s.done = s.done || {}; s.done[b] = true; return x; });
    } else if (S.phase === 'day') {
      if (!BOT.said[`wd_${S.round}_${S.n}_${b}`] && botWait(`ws_${S.round}_${S.n}_${b}`, 4000, 25000)) { BOT.said[`wd_${S.round}_${S.n}_${b}`] = 1;
        rtx(PROOM, x => { const s = x.state; if (x.status !== 'play' || !s.alive.includes(b)) return undefined; s.msgs = (s.msgs || []).concat({ uid: b, name: (x.players[b] || {}).name || '봇', text: botPick(BOT_WW_SAY), n: s.n, at: Date.now() }).slice(-80); return x; }); }
      if (!(S.ready || {})[b] && botWait(`wr_${S.round}_${S.n}_${b}`, 15000, 45000)) rtx(PROOM, x => { const s = x.state; if (s.phase !== 'day') return undefined; s.ready = s.ready || {}; s.ready[b] = true; return x; });
    } else if (S.phase === 'vote' && !(S.votes || {})[b]) { if (!botWait(`wv_${S.round}_${S.n}_${b}`, 3000, 15000)) return;
      const pool = alive.filter(u => u !== b && !(R[b] === 'wolf' && R[u] === 'wolf')), t = botPick(pool);
      rtx(PROOM, x => { const s = x.state; if (s.phase !== 'vote' || !s.alive.includes(b)) return undefined; s.votes = s.votes || {}; s.votes[b] = t; return x; });
    }
  });
}
const botWWActs = (round, n, alive) => { const o = {}; alive.filter(isBot).forEach(b => { const t = BOT_WW_ACT[`${round}_${n}_${b}`]; if (t) o[b] = t; }); return o; };

/* ---------- 방장 기기에서 돌기 ---------- */
setInterval(() => {
  const r = PROOM && roomOf(PROOM); if (!r || r.host !== ME.uid || !botsOf(r).length || document.hidden) return;
  try { if (r.type === 'nunchi') botNunchi(r); else if (r.type === 'auction') botAuction(r); else if (r.type === 'liar') botLiar(r); else if (r.type === 'werewolf') botWerewolf(r); } catch (e) { console.warn('bot', e); }
}, 700);
