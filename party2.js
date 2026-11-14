/* =========================================================
   햄카타 — 파티 게임: 인랑 (앱이 자동 진행)
   밤(행동) → 아침(습격 결과) → 낮(토론) → 투표 → 처형 → 밤 …
   역할 비밀: roomSecrets/{room}_{uid}  ·  정답: roomSecrets/{room}_ww (방장만)
   밤 행동: wwActs/{room}_{round}_{n}_{uid} (본인 · 방장만 읽기)
   ========================================================= */
PARTY_TYPES.werewolf = { n: '인랑', ic: '🐺', min: 4, d: '밤엔 인랑이 습격, 낮엔 토론과 투표로 인랑 찾기' };
const WW_ROLES = {
  wolf: { n: '인랑', ic: '🐺', team: 'wolf', d: '밤마다 동료와 함께 한 명을 습격해요. 살아 있는 사람 수를 인랑 수 이하로 줄이면 승리.' },
  vill: { n: '마을 사람', ic: '🧑', team: 'vill', d: '능력은 없지만 토론과 투표로 인랑을 찾아 처형하면 승리.' },
  seer: { n: '점쟁이', ic: '🔮', team: 'vill', d: '밤마다 한 명을 골라 인랑인지 아닌지 알아봐요.' },
  knight: { n: '기사', ic: '🛡', team: 'vill', d: '밤마다 자기 말고 한 명을 골라 습격에서 지켜요.' },
  medium: { n: '영매', ic: '👻', team: 'vill', d: '낮에 처형된 사람이 인랑이었는지 알 수 있어요.' },
  mad: { n: '광인', ic: '🤡', team: 'wolf', d: '인랑 편 사람이에요. 누가 인랑인지는 몰라요. 점을 쳐도 사람으로 나와요. 인랑이 이기면 함께 승리.' }
};
const WW_ORDER = ['wolf', 'seer', 'knight', 'medium', 'mad', 'vill'];
const WW_NIGHT = 45, WW_VOTE = 60, WW_PAUSE = 7;
function wwAuto(n) {
  const c = { wolf: n >= 11 ? 3 : n >= 7 ? 2 : 1, seer: 1, knight: n >= 5 ? 1 : 0, medium: n >= 7 ? 1 : 0, mad: n === 6 || n >= 8 ? 1 : 0, vill: 0 };
  c.vill = Math.max(0, n - WW_ORDER.slice(0, 5).reduce((s, k) => s + c[k], 0)); return c;
}
let WF = { mode: 'auto', c: null, day: 180 }, WWA = null, WW_ACT = {}, WW_BUSY = false;
const wwSum = c => WW_ORDER.reduce((s, k) => s + (c[k] || 0), 0);
const wwName = (r, u) => esc(((r.players || {})[u] || {}).name || '?');
const wwSec = r => PSECRET && PSECRET.round === (r.state || {}).round && PSECRET.ww ? PSECRET : null;
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/* ---------- 화면 ---------- */
function wwView(r, host) {
  const S = r.state || {}, ps = Object.keys(r.players || {});
  if (r.status === 'lobby') {
    const n = ps.length, c = WF.mode === 'auto' || !WF.c ? wwAuto(n) : WF.c, ok = wwSum(c) === n && c.wolf >= 1 && c.wolf * 2 < n;
    if (!host) return `<p class="muted">${PARTY_TYPES.werewolf.d}. 방장이 역할과 토론 시간을 정하고 시작해요. 이긴 편 +10 은화, 진 편 +2.</p><p class="muted">방장이 시작하기를 기다려요…</p>`;
    const row = k => `<div class="item" style="margin:4px 0"><div>${WW_ROLES[k].ic} <b>${WW_ROLES[k].n}</b> <span class="muted" style="font-size:.8rem">${WW_ROLES[k].team === 'wolf' ? '인랑 편' : '마을 편'}</span></div>
      ${WF.mode === 'auto' ? `<b>${c[k]}</b>` : `<div class="row" style="flex:0 0 auto;gap:4px"><button class="sm" onclick="wwCnt('${k}',-1)">−</button><b style="min-width:1.4em;text-align:center">${c[k]}</b><button class="sm" onclick="wwCnt('${k}',1)">+</button></div>`}</div>`;
    return `<p class="muted">밤에는 인랑이 한 명을 습격하고, 낮에는 다 함께 토론한 뒤 투표로 한 명을 처형해요. 인랑을 모두 처형하면 마을 승리, 살아 있는 사람이 인랑 수 이하가 되면 인랑 승리. 진행은 앱이 자동으로 해요. 첫날 밤에는 습격이 없어요.</p>
     <h3>역할 (${n}명)</h3><div class="toggles"><button class="sm ${WF.mode === 'auto' ? 'on' : ''}" onclick="WF.mode='auto';render()">인원수에 맞춰 자동</button><button class="sm ${WF.mode === 'manual' ? 'on' : ''}" onclick="WF.mode='manual';WF.c=Object.assign({},wwAuto(${n}));render()">직접 고르기</button></div>
     ${WW_ORDER.map(row).join('')}
     ${WF.mode === 'manual' && wwSum(c) !== n ? `<p style="color:#e88">역할 합계 ${wwSum(c)}명 · 참가자 ${n}명과 같아야 해요</p>` : ''}${c.wolf * 2 >= n && n ? '<p style="color:#e88">인랑이 너무 많아요 (절반 미만)</p>' : ''}
     <h3>낮 토론 시간</h3><div class="toggles">${[60, 120, 180, 300].map(s => `<button class="sm ${WF.day === s ? 'on' : ''}" onclick="WF.day=${s};render()">${s / 60}분</button>`).join('')}</div>
     ${needMore(r, PARTY_TYPES.werewolf)}<button class="primary" style="margin-top:10px;width:100%" ${n < 4 || !ok ? 'disabled' : ''} onclick="wwStart()">🐺 시작</button>
     <p class="muted" style="font-size:.8rem">진행 계산은 방장 기기에서 돼요. 게임 중에 방장이 나가면 그 판은 끝나요.</p>`;
  }
  const sec = wwSec(r), alive = S.alive || [], me = alive.includes(ME.uid), left = Math.max(0, Math.ceil(((S.endAt || 0) - Date.now()) / 1000));
  const ph = { night: `🌙 ${S.n}일째 밤`, dawn: `🌅 ${S.n}일째 아침`, day: `☀ ${S.n}일째 낮 · 토론`, vote: `🗳 ${S.n}일째 투표`, exec: `⚖ ${S.n}일째 처형`, end: '🏁 게임 끝' }[S.phase] || '';
  const banner = `<div class="card" style="text-align:center;${S.phase === 'night' ? 'background:#101428' : ''}"><b style="font-size:1.15rem">${ph}</b>${S.phase !== 'end' && r.status === 'play' ? ` <span id="wwT" class="muted">${mmss(left)}</span>` : ''}</div>`;
  const role = sec ? WW_ROLES[sec.role] : null;
  const card = r.status === 'done' ? '' : role ? `<details class="card" ${S.phase === 'night' ? 'open' : ''}><summary><b>내 역할: ${role.ic} ${role.n}</b> <span class="muted" style="font-size:.8rem">(눌러서 숨기기/보기)</span></summary><p class="muted" style="margin:4px 0">${role.d}</p>
     ${sec.role === 'wolf' && (sec.mates || []).length ? `<p>🐺 동료: ${sec.mates.map(u => `<b>${wwName(r, u)}</b>`).join(', ')}</p>` : ''}
     ${(sec.res || []).length ? `<div>${sec.res.map(x => `<div>${x.k === 'seer' ? '🔮' : '👻'} ${x.n}일째 · <b>${wwName(r, x.t)}</b> → ${x.wolf ? '<b style="color:#e88">인랑</b>' : '사람'}</div>`).join('')}</div>` : ''}
     ${!me ? '<p style="color:#e88">☠ 당신은 죽었어요. 말할 수도, 투표할 수도 없지만 지켜볼 수 있어요.</p>' : ''}</details>` : '<p class="muted">역할을 받는 중…</p>';
  const plist = `<div class="toggles" style="margin:6px 0">${ps.map(u => { const d = !alive.includes(u), v = S.phase === 'vote' ? Object.values(S.votes || {}).filter(x => x === u).length : 0, rr = S.result && S.result.roles[u];
     return `<span class="chip" style="${d ? 'opacity:.45;text-decoration:line-through' : ''}">${d ? '☠ ' : ''}${rr ? WW_ROLES[rr].ic + ' ' : ''}${wwName(r, u)}${v ? ` <b style="color:var(--gold2)">${v}</b>` : ''}${S.phase === 'vote' && (S.votes || {})[u] ? ' ✓' : ''}${(S.phase === 'night' && (S.done || {})[u]) || (S.phase === 'day' && (S.ready || {})[u]) ? ' ✓' : ''}</span>`; }).join('')}</div>`;
  let act = '';
  if (r.status === 'play' && S.phase === 'night' && me) {
    const mine = WW_ACT[S.round + '_' + S.n], done = (S.done || {})[ME.uid], can = sec && (sec.role === 'seer' || sec.role === 'knight' || (sec.role === 'wolf' && S.n > 1));
    const cands = !sec ? [] : alive.filter(u => u !== ME.uid && !(sec.role === 'wolf' && (sec.mates || []).includes(u)));
    const verb = { wolf: '습격할 사람', seer: '점칠 사람', knight: '지킬 사람' };
    act = done ? `<p class="muted" style="text-align:center">${mine ? `${wwName(r, mine)}을(를) 골랐어요. ` : ''}다른 사람을 기다려요… (${Object.keys(S.done || {}).length}/${alive.length})</p>`
      : can ? `<h3>${verb[sec.role]}을 골라요</h3><div class="toggles">${cands.map(u => `<button onclick="wwAct('${u}')">${wwName(r, u)}</button>`).join('')}</div>`
      : `<p class="muted" style="text-align:center">${sec && sec.role === 'wolf' ? '첫날 밤은 동료와 얼굴만 확인해요.' : '밤이 깊었어요. 조용히 잠들어요.'}</p><button class="primary" style="width:100%" onclick="wwAct('')">💤 잠들기</button>`;
  } else if (r.status === 'play' && S.phase === 'day') {
    act = me ? `<button class="${(S.ready || {})[ME.uid] ? 'on' : ''}" style="width:100%" onclick="wwReady()">${(S.ready || {})[ME.uid] ? '✓ 투표 준비 (취소)' : '🗳 이제 투표하자'}</button><p class="muted" style="font-size:.8rem;text-align:center">살아 있는 모두가 누르면 바로 투표로 넘어가요</p>` : '';
    if (host) act += `<button class="sm" style="margin-top:4px" onclick="wwSkipDay()">방장: 토론 끝내기</button>`;
  } else if (r.status === 'play' && S.phase === 'vote' && me) {
    const my = (S.votes || {})[ME.uid];
    act = `<h3>처형할 사람에게 투표 (${Object.keys(S.votes || {}).length}/${alive.length})</h3><div class="toggles">${alive.filter(u => u !== ME.uid).map(u => `<button class="${my === u ? 'on' : ''}" onclick="wwVote('${u}')">${wwName(r, u)}</button>`).join('')}</div>`;
  } else if (r.status === 'done' && S.result) {
    const R = S.result, myRole = R.roles[ME.uid], win = myRole && WW_ROLES[myRole].team === R.win;
    act = `<div class="card" style="text-align:center"><div style="font-size:2.6rem">${R.win === 'wolf' ? '🐺' : '🎉'}</div><h3>${R.win === 'wolf' ? '인랑 편 승리!' : '마을 편 승리!'}</h3>${myRole ? `<p class="muted">${win ? '이겼어요! +10 은화' : '아쉬워요… +2 은화'}</p>` : ''}
      <table style="margin:auto">${ps.map(u => `<tr><td>${WW_ROLES[R.roles[u]].ic} ${WW_ROLES[R.roles[u]].n}</td><td><b>${wwName(r, u)}</b></td><td class="muted">${alive.includes(u) ? '생존' : '☠'}</td></tr>`).join('')}</table></div>${host ? '<button class="primary" style="width:100%" onclick="wwAgain()">한 판 더</button>' : ''}`;
  }
  const log = (S.log || []).slice().reverse().map(l => `<div class="muted" style="font-size:.85rem">${l}</div>`).join('');
  const msgs = (S.msgs || []).slice(-40).map(m => `<div class="note"><div class="m"><span>${esc(m.name)}</span><span class="muted">${m.n}일째</span></div>${esc(m.text)}</div>`).join('');
  const chatIn = r.status === 'play' && me && (S.phase === 'day' || S.phase === 'vote' || S.phase === 'dawn' || S.phase === 'exec')
    ? `<div class="row" style="flex-wrap:nowrap;margin-top:6px"><input id="wwIn" maxlength="120" placeholder="토론하기" onkeydown="if(event.key==='Enter')wwSay()"><button class="primary" onclick="wwSay()">말하기</button></div>` : '';
  return banner + card + plist + act + (log ? `<h3>기록</h3>${log}` : '') + `<h3>토론</h3><div id="wwMsgs" style="max-height:260px;overflow:auto">${msgs || '<p class="muted">아직 아무 말도 없어요.</p>'}</div>${chatIn}`;
}
function wwCnt(k, d) { const r = roomOf(PROOM); const n = Object.keys((r || {}).players || {}).length; WF.c = WF.c || wwAuto(n); WF.c[k] = Math.max(k === 'wolf' ? 1 : 0, (WF.c[k] || 0) + d); render(); }

/* ---------- 행동 ---------- */
async function wwStart() {
  const r = roomOf(PROOM); if (!r || r.host !== ME.uid) return; const ps = shuffle(Object.keys(r.players)), n = ps.length;
  const c = WF.mode === 'auto' || !WF.c ? wwAuto(n) : WF.c; if (wwSum(c) !== n) return toast('역할 수를 확인해 주세요');
  const bag = shuffle(WW_ORDER.flatMap(k => Array(c[k] || 0).fill(k))), roles = {}; ps.forEach((u, i) => roles[u] = bag[i]);
  const wolves = ps.filter(u => roles[u] === 'wolf'), round = rid();
  try {
    await Promise.all(ps.map(u => B.set('roomSecrets/' + r.id + '_' + u, { uid: u, room: r.id, round, ww: true, role: roles[u], mates: roles[u] === 'wolf' ? wolves.filter(x => x !== u) : [], res: [] })));
    await B.set('roomSecrets/' + r.id + '_ww', { uid: ME.uid, room: r.id, round, roles, res: {} });
  } catch (e) { return toast('시작 실패: ' + (e.code || e.message)); }
  WWA = { round, roles, res: {} };
  const cnt = WW_ORDER.filter(k => c[k]).map(k => `${WW_ROLES[k].ic}${WW_ROLES[k].n} ${c[k]}`).join(' · ');
  rtx(r.id, x => { if (x.host !== ME.uid) return undefined; x.status = 'play';
    x.state = { round, n: 1, phase: 'night', endAt: Date.now() + WW_NIGHT * 1000, alive: ps, done: {}, ready: {}, votes: {}, msgs: [], log: [`🎭 역할: ${cnt}`], dayLen: WF.day, result: null }; return x; });
}
async function wwAct(t) {
  const r = roomOf(PROOM); if (!r) return; const S = r.state, sec = wwSec(r); if (S.phase !== 'night' || !(S.alive || []).includes(ME.uid)) return;
  if (t) { try { await B.set(`wwActs/${r.id}_${S.round}_${S.n}_${ME.uid}`, { uid: ME.uid, room: r.id, round: S.round, n: S.n, role: sec ? sec.role : '', target: t }); } catch (e) { return toast('실패: ' + (e.code || e.message)); } }
  WW_ACT[S.round + '_' + S.n] = t; sfx('tap');
  rtx(r.id, x => { const s = x.state; if (s.phase !== 'night' || s.n !== S.n) return undefined; s.done = s.done || {}; s.done[ME.uid] = true; return x; });
}
function wwReady() { rtx(PROOM, x => { const s = x.state; if (s.phase !== 'day' || !s.alive.includes(ME.uid)) return undefined; s.ready = s.ready || {}; if (s.ready[ME.uid]) delete s.ready[ME.uid]; else s.ready[ME.uid] = true; return x; }); }
function wwSkipDay() { rtx(PROOM, x => { if (x.host !== ME.uid || x.state.phase !== 'day') return undefined; x.state.endAt = Date.now(); return x; }); }
function wwVote(u) { rtx(PROOM, x => { const s = x.state; if (s.phase !== 'vote' || !s.alive.includes(ME.uid) || !s.alive.includes(u)) return undefined; s.votes = s.votes || {}; s.votes[ME.uid] = u; return x; }); sfx('tap'); }
function wwSay() {
  const el = $('#wwIn'), t = el && el.value.trim(); if (!t) return; el.value = '';
  rtx(PROOM, x => { const s = x.state; if (x.status !== 'play' || !s.alive.includes(ME.uid)) return undefined; s.msgs = (s.msgs || []).concat({ uid: ME.uid, name: myName(), text: t.slice(0, 120), n: s.n, at: Date.now() }).slice(-80); return x; })
    .then(() => { const m = $('#wwMsgs'); if (m) m.scrollTop = m.scrollHeight; });
}
function wwAgain() { rtx(PROOM, x => { if (x.host !== ME.uid) return undefined; x.status = 'lobby'; x.state = {}; return x; }); WWA = null; }

/* ---------- 방장 기기: 자동 진행 ---------- */
function wwWin(alive, roles) { const w = alive.filter(u => roles[u] === 'wolf').length; return !w ? 'vill' : w >= alive.length - w ? 'wolf' : null; }
async function wwHost() {
  const r = PROOM && roomOf(PROOM); if (!r || r.type !== 'werewolf' || r.status !== 'play' || r.host !== ME.uid || WW_BUSY) return;
  const S = r.state, now = Date.now(), alive = S.alive || [];
  if (!WWA || WWA.round !== S.round) { const d = await B.get('roomSecrets/' + r.id + '_ww').catch(() => null); if (!d || d.round !== S.round) return; WWA = { round: d.round, roles: d.roles, res: d.res || {} }; }
  const R = WWA.roles, timeUp = now >= (S.endAt || 0);
  const fin = (x, win) => { x.status = 'done'; x.state.phase = 'end'; x.state.result = { win, roles: R }; x.state.log.push(win === 'wolf' ? '🐺 인랑 편이 마을을 차지했다' : '🎉 마을에서 인랑이 사라졌다'); };
  const give = async (u, item) => { WWA.res[u] = (WWA.res[u] || []).concat(item); await B.update('roomSecrets/' + r.id + '_' + u, { res: WWA.res[u] }).catch(() => {}); B.update('roomSecrets/' + r.id + '_ww', { res: WWA.res }).catch(() => {}); };
  WW_BUSY = true;
  try {
    if (S.phase === 'night' && (timeUp || alive.every(u => (S.done || {})[u]))) {
      const acts = {}; await Promise.all(alive.map(async u => { if (!['wolf', 'seer', 'knight'].includes(R[u])) return; const d = await B.get(`wwActs/${r.id}_${S.round}_${S.n}_${u}`).catch(() => null); if (d && d.target) acts[u] = d.target; }));
      let victim = null;
      if (S.n > 1) {
        const picks = alive.filter(u => R[u] === 'wolf').map(u => acts[u]).filter(t => t && alive.includes(t) && R[t] !== 'wolf');
        const cnt = {}; picks.forEach(t => cnt[t] = (cnt[t] || 0) + 1); const mx = Math.max(0, ...Object.values(cnt)), top = Object.keys(cnt).filter(t => cnt[t] === mx);
        let tgt = top.length ? top[rint(top.length)] : null; if (!tgt) { const pool = alive.filter(u => R[u] !== 'wolf'); tgt = pool[rint(pool.length)]; }
        const kn = alive.find(u => R[u] === 'knight'), guard = kn && acts[kn]; victim = tgt && tgt !== guard ? tgt : null;
      }
      const sr = alive.find(u => R[u] === 'seer'); if (sr && acts[sr]) await give(sr, { k: 'seer', n: S.n, t: acts[sr], wolf: R[acts[sr]] === 'wolf' });
      await rtx(r.id, x => { const s = x.state; if (s.phase !== 'night' || s.n !== S.n) return undefined;
        if (victim) { s.alive = s.alive.filter(u => u !== victim); s.log.push(`🌅 ${s.n}일째 아침 · <b>${esc(x.players[victim] ? x.players[victim].name : '?')}</b>이(가) 처참한 모습으로 발견됐다`); }
        else s.log.push(`🌅 ${s.n}일째 아침 · ${s.n === 1 ? '조용한 첫날 밤이 지났다' : '아무도 습격당하지 않았다'}`);
        const w = wwWin(s.alive, R); if (w) { fin(x, w); return x; }
        s.phase = 'dawn'; s.endAt = Date.now() + WW_PAUSE * 1000; return x; });
    } else if (S.phase === 'dawn' && timeUp) {
      await rtx(r.id, x => { const s = x.state; if (s.phase !== 'dawn') return undefined; s.phase = 'day'; s.ready = {}; s.endAt = Date.now() + (s.dayLen || 180) * 1000; return x; });
    } else if (S.phase === 'day' && (timeUp || alive.every(u => (S.ready || {})[u]))) {
      await rtx(r.id, x => { const s = x.state; if (s.phase !== 'day') return undefined; s.phase = 'vote'; s.votes = {}; s.endAt = Date.now() + WW_VOTE * 1000; return x; });
    } else if (S.phase === 'vote' && (timeUp || alive.every(u => (S.votes || {})[u]))) {
      const cnt = {}; Object.entries(S.votes || {}).forEach(([v, t]) => { if (alive.includes(v) && alive.includes(t)) cnt[t] = (cnt[t] || 0) + 1; });
      const mx = Math.max(0, ...Object.values(cnt)), top = Object.keys(cnt).filter(t => cnt[t] === mx), ex = top.length ? top[rint(top.length)] : null;
      const md = alive.find(u => R[u] === 'medium' && u !== ex); if (ex && md) await give(md, { k: 'medium', n: S.n, t: ex, wolf: R[ex] === 'wolf' });
      await rtx(r.id, x => { const s = x.state; if (s.phase !== 'vote' || s.n !== S.n) return undefined;
        if (ex) { s.alive = s.alive.filter(u => u !== ex); s.log.push(`⚖ ${s.n}일째 · 투표로 <b>${esc(x.players[ex] ? x.players[ex].name : '?')}</b>이(가) 처형됐다${top.length > 1 ? ' (동표라 제비뽑기)' : ''}`); }
        else s.log.push(`⚖ ${s.n}일째 · 아무도 투표하지 않아 처형이 없었다`);
        const w = wwWin(s.alive, R); if (w) { fin(x, w); return x; }
        s.phase = 'exec'; s.endAt = Date.now() + WW_PAUSE * 1000; return x; });
    } else if (S.phase === 'exec' && timeUp) {
      await rtx(r.id, x => { const s = x.state; if (s.phase !== 'exec') return undefined; s.n++; s.phase = 'night'; s.done = {}; s.endAt = Date.now() + WW_NIGHT * 1000; return x; });
    }
  } finally { WW_BUSY = false; }
}
function wwSettle(r) {
  const S = r.state || {}, R = S.result; if (r.type !== 'werewolf' || r.status !== 'done' || !R || paidRound(S.round) || !(r.players || {})[ME.uid] || !R.roles[ME.uid]) return;
  markPaid(S.round); if (WW_ROLES[R.roles[ME.uid]].team === R.win) { earn(10); toast('🐺 승리! +10 은화'); } else { earn(2); toast('수고했어요 +2 은화'); }
}
setInterval(() => {
  const r = PROOM && roomOf(PROOM); if (!r || r.type !== 'werewolf' || r.status !== 'play') return;
  wwHost(); const el = $('#wwT'); if (el) el.textContent = mmss(Math.max(0, Math.ceil(((r.state.endAt || 0) - Date.now()) / 1000)));
}, 1000);
