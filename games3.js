/* =========================================================
   햄카타 — 손맛 장치 · 오늘의 미션 · 주간 랭킹 · 찻잔 떨어뜨리기 · 부엌 머지
   (games.js · games2.js · tycoon.js 뒤에 로드)
   ========================================================= */

/* ---------- 보상: 판은 무제한, 은화는 게임별 하루 상한 ---------- */
const COIN_CAP = () => 40 + (typeof roomCnt === 'function' && roomCnt('gclock') ? 15 : 0);
const STAR_MAX = { memory: 18, tycoon: 0, kitchen: 0, lockpick: 25 };          // 0 = 별 표시 없음 (자체 별 사용)
const STAR_SC = { sins: [800, 2000, 4000] };                                    // 점수 기준 별
let MS_SKIP = false;
function gameDay() { const t = kstDate(); if (!P.gd || P.gd.date !== t) P.gd = { date: t, p: {}, c: {} }; if (!P.gd.c) P.gd.c = {}; return P.gd; }
function playsLeft(id) { return Math.max(0, COIN_CAP() - (gameDay().c[id] || 0)); }
function capTxt(id) { const l = playsLeft(id); return l > 0 ? `오늘 은화 ${l}닢 더 받을 수 있어요` : '오늘 은화는 다 받았어요 (기록·미션은 계속 쌓여요)'; }
function starsOf(id, coins, score) {
  if (STAR_SC[id]) { const t = STAR_SC[id]; return score >= t[2] ? 3 : score >= t[1] ? 2 : score >= t[0] ? 1 : 0; }
  const mx = STAR_MAX[id] == null ? 25 : STAR_MAX[id]; if (!mx) return -1;
  return coins >= mx * .85 ? 3 : coins >= mx * .6 ? 2 : coins >= mx * .3 ? 1 : 0;
}
const starHtml = n => n < 0 ? '' : `<span style="display:block;font-size:1.7rem;letter-spacing:4px;color:var(--gold2);margin:4px 0">${'★'.repeat(n)}<span style="opacity:.22">${'★'.repeat(3 - n)}</span></span>`;
function reward(id, coins, score) {
  const g = gameDay(); g.p[id] = (g.p[id] || 0) + 1; coins = Math.max(0, Math.round(coins));
  const sc = score == null ? coins : score, st = starsOf(id, coins, sc);
  P.best = P.best || {}; const prev = P.best[id] || 0, nb = sc > prev && sc > 0; if (nb) P.best[id] = sc;
  P.stars = P.stars || {}; if (st > (P.stars[id] || 0)) P.stars[id] = st;
  msEv('play', id, 1); if (st > 0) msEv('star', id, st);
  const left = playsLeft(id), give = Math.min(coins, left);
  let txt = give > 0 ? `+${give} 은화${give < coins ? ' (오늘 상한까지)' : ''}` : coins > 0 ? '오늘 은화는 다 받았어요 · 연습 기록으로 남아요' : '';
  if (give > 0) { g.c[id] = (g.c[id] || 0) + give; earn(give); } else saveP();
  const bt = st < 0 ? '' : nb ? (prev ? ' · 🏆 <b style="color:var(--gold2)">새 최고 기록!</b>' : '') : prev && sc > 0 ? ` · 최고 기록까지 ${prev - sc}` : '';
  if (nb && prev || st === 3) JUICE.party = true;
  return `${starHtml(st)}${txt}${bt}`;
}

/* ---------- 손맛: 흔들림 · 진동 · 꽃가루 ---------- */
const JUICE = { party: false };
function buzz(ms) { try { navigator.vibrate && navigator.vibrate(ms || 12); } catch (e) {} }
function shakeEl(el, s) { if (!el || !el.animate) return; const k = s || 5; el.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${k}px,${-k / 2}px)` }, { transform: `translate(${-k}px,${k / 2}px)` }, { transform: `translate(${k / 2}px,${k}px)` }, { transform: 'translate(0,0)' }], { duration: 260 }); }
function confetti() {
  const box = $('#mbox'); if (!box) return; box.style.position = 'relative'; box.style.overflow = 'hidden';
  const cols = ['#e0b050', '#ffe08a', '#e88aa0', '#8ad0b0', '#a0b8f0', '#fff'];
  for (let i = 0; i < 36; i++) { const s = document.createElement('span'); const x = Math.random() * 100, d = 900 + Math.random() * 900, sz = 4 + Math.random() * 5;
    s.style.cssText = `position:absolute;left:${x}%;top:-10px;width:${sz}px;height:${sz * 1.6}px;background:${cols[i % cols.length]};pointer-events:none;z-index:5`;
    box.appendChild(s); s.animate([{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: `translateY(${260 + Math.random() * 200}px) rotate(${Math.random() * 720 - 360}deg)`, opacity: 0 }], { duration: d, delay: Math.random() * 300, easing: 'cubic-bezier(.2,.6,.4,1)' }).onfinish = () => s.remove(); }
}
function finishGame(html) { stopGame(); render(); modal(html); sfx('win'); buzz(30); if (JUICE.party) { JUICE.party = false; setTimeout(confetti, 60); } }

/* ---------- 오늘의 미션 ---------- */
const MS_GAMES = ['sins', 'silver', 'books', 'memory', 'tycoon'];
function seedRand(str) { let h = 2166136261; for (const ch of str) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; }; }
function msDay() {
  const t = kstDate(); P.ms = P.ms || {}; if (P.ms.date === t && P.ms.list) return P.ms;
  const R = seedRand(t + (ME ? ME.uid : '')), open = MS_GAMES.filter(k => FEATS[k] && featOpen(k)), pick = a => a[Math.floor(R() * a.length)], list = [];
  const pool = [];
  open.forEach(g => { pool.push({ k: 'play', g, n: 2 + Math.floor(R() * 2) }); if (g !== 'tycoon') pool.push({ k: 'star', g, n: 2 }); });
  if (open.includes('sins')) pool.push({ k: 'tier', g: 'sins', n: 6 + Math.floor(R() * 2) });
  if (open.includes('tycoon')) pool.push({ k: 'order', g: 'tycoon', n: 3 + Math.floor(R() * 3) });
  while (list.length < 2 && pool.length) { const i = Math.floor(R() * pool.length), m = pool.splice(i, 1)[0]; if (!list.some(x => x.k === m.k && x.g === m.g)) list.push(m); }
  list.push({ k: 'coin', n: 30 + Math.floor(R() * 3) * 10 });
  P.ms = { date: t, list: list.map((m, i) => Object.assign(m, { id: i, p: 0, ok: false })), all: false, streak: P.ms.streak || 0, lastAll: P.ms.lastAll || '' };
  return P.ms;
}
function msText(m) {
  const f = FEATS[m.g] || {}, nm = `${f.ic || ''} ${f.n || ''}`;
  if (m.k === 'play') return `${nm} ${m.n}판 하기`;
  if (m.k === 'star') return `${nm}에서 별 ${m.n}개 이상 받기`;
  if (m.k === 'tier') return `🍵 찻잔 떨어뜨리기에서 ${DROP_T[m.n][1]} ${DROP_T[m.n][2]} 만들기`;
  if (m.k === 'order') return `🧺 부엌 주문 ${m.n}개 채우기`;
  if (m.k === 'coin') return `🪙 은화 ${m.n}닢 벌기`;
  return '';
}
function msEv(k, g, v) {
  if (!P || !ME) return; const d = msDay(); let ch = false;
  d.list.forEach(m => { if (m.ok || m.k !== k || (m.g && m.g !== g)) return;
    if (k === 'star' || k === 'tier') { if (v >= m.n) { m.p = m.n; ch = true; } }
    else { m.p = Math.min(m.n, m.p + v); ch = true; }
    if (m.p >= m.n && !m.done) { m.done = true; toast(`📋 미션 완료! ${msText(m)}`); sfx('ok'); } });
  return ch;
}
function msClaim(i) {
  const d = msDay(), m = d.list[i]; if (!m || !m.done || m.ok) return; m.ok = true; MS_SKIP = true; LOG_W = 'mission'; earn(5); LOG_W = null; MS_SKIP = false; toast('📋 +5 은화'); buzz();
  if (d.list.every(x => x.ok) && !d.all) { d.all = true; const y = new Date(Date.now() + 9 * 36e5 - 864e5).toISOString().slice(0, 10);
    d.streak = d.lastAll === y ? (d.streak || 0) + 1 : 1; d.lastAll = d.date; MS_SKIP = true; LOG_W = 'mission'; earn(10); LOG_W = null; MS_SKIP = false;
    modal(`<h2 style="color:var(--gold2);margin-top:0">📋 오늘의 미션 완주!</h2><p>보너스 <b>+10 은화</b></p><p>연속 완주 <b>${d.streak}일</b>째</p>${titleUnlock()}<button class="primary" onclick="closeModal()">좋아요</button>`); setTimeout(confetti, 60); }
  saveP(); render();
}
function msPanel() {
  if (!P || !ME) return ''; const d = msDay(); if (!d.list.length) return '';
  const done = d.list.filter(m => m.ok).length;
  return `<div class="panel"><div class="row" style="justify-content:space-between;align-items:baseline"><h2 style="margin:0">📋 오늘의 미션</h2><span class="muted">${done}/${d.list.length}${d.streak ? ` · 연속 완주 ${d.streak}일` : ''}</span></div>
   <p class="muted" style="margin:4px 0 8px">하나당 +5, 모두 +10 · 연속 완주하면 비밀 칭호</p>
   ${d.list.map((m, i) => `<div class="item" style="margin:5px 0;gap:8px"><div style="flex:1"><div>${msText(m)}</div><div style="height:6px;background:#2a1c14;border-radius:3px;margin-top:4px;overflow:hidden"><div style="height:100%;width:${Math.round(m.p / m.n * 100)}%;background:${m.done ? 'var(--gold2)' : '#8a6a40'}"></div></div><div class="muted" style="font-size:.78rem">${m.p}/${m.n}</div></div>
     ${m.ok ? '<button disabled>받음</button>' : m.done ? `<button class="primary" onclick="msClaim(${i})">+5 받기</button>` : '<button disabled>진행 중</button>'}</div>`).join('')}</div>`;
}

/* ---------- 비밀 칭호 ---------- */
[{ id: 't_ms3', kind: 'title', name: '부지런한 손님', cost: -1 }, { id: 't_ms7', kind: 'title', name: '저택의 단골', cost: -1 }, { id: 't_week', kind: 'title', name: '지난주의 귀빈', cost: -1 }]
  .forEach(t => { if (!SHOP.some(x => x.id === t.id)) SHOP.push(t); });
function grantTitle(id) { if (P.owned.includes(id)) return ''; P.owned.push(id); const t = SHOP.find(x => x.id === id); saveP(); return `<p>🎖 비밀 칭호 <b style="color:var(--gold2)">「${esc(t.name)}」</b>를 얻었어요! 상점에서 착용할 수 있어요.</p>`; }
function titleUnlock() { const s = (P.ms && P.ms.streak) || 0; return (s >= 3 ? grantTitle('t_ms3') : '') + (s >= 7 ? grantTitle('t_ms7') : ''); }

/* ---------- 주간 랭킹 ---------- */
function weekId(off) { const d = new Date(Date.now() + 9 * 36e5 - (off || 0) * 7 * 864e5), wd = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - wd); return d.toISOString().slice(0, 10); }
function wkRoll() { const w = weekId(); if (!P.wk || P.wk.w !== w) { if (P.wk && P.wk.e) P.wkLast = P.wk; P.wk = { w, e: 0 }; } return P.wk; }
const _earn3 = earn;
earn = function (n) { if (P && n > 0) { wkRoll().e += n; if (!MS_SKIP) msEv('coin', null, n); } return _earn3(n); };
const wkOf = (p, w) => p.wk && p.wk.w === w ? p.wk.e || 0 : p.wkLast && p.wkLast.w === w ? p.wkLast.e || 0 : 0;
let RANK_TAB = 'week';
VIEWS.rank = () => {
  const w = weekId(), rows = players().map(u => { const p = PROGS.find(x => x.id === u.id) || {}, t = SHOP.find(x => x.id === p.title); return { u, wk: wkOf(p, w), earned: p.earned || 0, title: t ? t.name : '' }; })
    .sort((a, b) => RANK_TAB === 'week' ? b.wk - a.wk : b.earned - a.earned);
  const med = i => ['👑', '🥈', '🥉'][i] || i + 1, lw = weekId(1), champ = players().map(u => ({ u, e: wkOf(PROGS.find(x => x.id === u.id) || {}, lw) })).sort((a, b) => b.e - a.e)[0];
  return `<div class="panel"><h2>🏆 손님 랭킹</h2>
   <div class="toggles" style="margin-bottom:8px"><button class="${RANK_TAB === 'week' ? 'on' : ''}" onclick="RANK_TAB='week';render()">이번 주</button><button class="${RANK_TAB === 'all' ? 'on' : ''}" onclick="RANK_TAB='all';render()">누적</button></div>
   <p class="muted">${RANK_TAB === 'week' ? `이번 주 번 은화 순 · 1위는 칭호 「지난주의 귀빈」${champ && champ.e ? ` 지난주 1위: <b>${esc(uname(champ.u))}</b>` : ''}` : '누적 은화 순'}</p>
   <table><tr><th>#</th><th>손님</th><th>HO</th><th>${RANK_TAB === 'week' ? '이번 주' : '누적'}</th></tr>
   ${rows.map((r, i) => `<tr${r.u.id === ME.uid ? ' style="color:var(--gold2)"' : ''}><td>${med(i)}</td><td>${r.title ? `<span class="muted">「${esc(r.title)}」</span> ` : ''}${esc(uname(r.u))}</td><td>${esc(r.u.ho ? cname(r.u.ho) : '-')}</td><td>${RANK_TAB === 'week' ? r.wk : r.earned}</td></tr>`).join('')}</table></div>`;
};
setInterval(() => {      // 지난주 1위 칭호
  if (!P || !ME || !PROGS.length) return; const lw = weekId(1); if (P.wkWin === lw) return;
  const top = players().map(u => ({ id: u.id, e: wkOf(PROGS.find(x => x.id === u.id) || {}, lw) })).sort((a, b) => b.e - a.e)[0];
  if (!top || !top.e) return; P.wkWin = lw; if (top.id === ME.uid) { const h = grantTitle('t_week'); if (h) modal(`<h2 style="color:var(--gold2);margin-top:0">👑 지난주 1위!</h2>${h}<button class="primary" onclick="closeModal()">좋아요</button>`); } else saveP();
}, 20000);

/* ================= 찻잔 떨어뜨리기 (합치기 + 오늘의 죄 + 죄의 문) ================= */
const DROP_T = [[7, '🍬', '별사탕', '#f2a8c8', 1], [10, '🍡', '경단', '#efd2dc', 3], [13, '🍪', '쿠키', '#cf9a5c', 6], [16, '🍵', '찻잔', '#8fbf86', 10], [20, '🧁', '컵케이크', '#e898b2', 16], [24, '🥧', '파이', '#cf9048', 25], [28, '🍮', '푸딩', '#e8c058', 40], [33, '🍰', '조각 케이크', '#f4e4d2', 60], [38, '🎂', '홀케이크', '#f0cce0', 100]];
const SIN_RULE = {
  wrath: '상자가 가끔 들썩여요', greed: '황금 다과가 나와요 (2배 + 은화)', sloth: '다과가 천천히 떨어져요', gluttony: '가끔 작은 다과가 먹혀요',
  pride: '점수 ×1.3, 대신 금방 끝나요', envy: '「보관」으로 하나를 맡아 둬요', lust: '통통 튀고, 다음 셋이 보여요'
};
const todaySin = () => { const n = Math.floor((Date.now() + 9 * 36e5) / 864e5); return HOS[n % HOS.length].id; };
let DROP = null;
VIEWS.sins = () => {
  const s = todaySin(), mine = mySin() === s;
  return `<div class="panel"><h2>🍵 찻잔 떨어뜨리기</h2>
   <div class="item" style="margin:6px 0 10px;border-color:var(--gold)"><div><b>오늘의 죄 · ${SIN_EMB[s]} ${sinName(s)}</b><div class="muted" style="font-size:.85rem">${SIN_RULE[s]}${mine ? ' · <b style="color:var(--gold2)">내 죄의 날! 은화 ×1.5</b>' : ''}</div></div></div>
   <p class="muted">같은 다과끼리 합쳐요. 연달아 합치면 <b>콤보</b>, 6콤보는 <b>피버</b>(2배). 🎂 둘은 +500! 빨간 선을 넘으면 끝.</p>
   <div style="display:flex;flex-wrap:wrap;gap:2px;align-items:center;font-size:1.25rem;margin:6px 0">${DROP_T.map(t => t[1]).join('<span class="muted" style="font-size:.7rem">›</span>')}<span class="muted" style="font-size:.7rem">›</span>💥</div>
   <div class="row" style="flex-wrap:wrap;gap:10px;margin:6px 0"><span>최고 점수 <b style="color:var(--gold2)">${(P.best || {}).sins || 0}</b></span><span class="muted">${capTxt('sins')}</span></div>
   <div id="gbox"><button class="primary" style="width:100%;font-size:1.15rem;padding:14px" onclick="dropStart()">▶ 시작</button></div>
</div>`;
};
function dropStart() {
  const s = todaySin();
  DROP = { s, balls: [], fx: [], txt: [], score: 0, combo: 0, best: 0, lastM: 0, fever: 0, aim: 90, cd: 0, q: [], hold: null, holdUsed: false, t: 0, warn: 0, shake: 0, maxT: 0, pops: 0, gold: 0, evT: 0, over: false, paused: false, id: 1 };
  for (let i = 0; i < 3; i++) DROP.q.push(dropNext());
  dropMount();
}
function dropNext() { const r = Math.random(), t = r < .3 ? 0 : r < .58 ? 1 : r < .8 ? 2 : r < .94 ? 3 : 4; return { t, gold: DROP && DROP.s === 'greed' && Math.random() < .15 }; }
const DRW = 180, DRH = 272, DL = 8, DR = 172, DF = 262, DDANGER = 58, DY = 34;
function dropMount() {
  const b = gbox(), D = DROP; if (!b || !D) return;
  b.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:6px;gap:6px"><b id="dhud">점수 ${D.score}</b><span>${D.s === 'envy' ? '<button class="sm" onclick="dropHold()">보관</button> ' : ''}<button class="sm" onclick="dropQuit()">그만두기</button></span></div>
   <canvas id="dcv" style="width:100%;max-width:420px;aspect-ratio:${DRW}/${DRH};touch-action:none;display:block;margin:auto;border-radius:8px;background:#1c120c"></canvas>`;
  const cv = $('#dcv'), dpr = window.devicePixelRatio || 1, cw = cv.clientWidth || 360; cv.width = Math.round(cw * dpr); cv.height = Math.round(cw * dpr * DRH / DRW);
  const g = cv.getContext('2d'), S = cv.width / DRW; D.cv = cv; D.g = g; D.S = S;
  const px = e => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * DRW; };
  cv.onpointerdown = e => { D.aim = px(e); D.down = true; try { cv.setPointerCapture(e.pointerId); } catch (x) {} };
  cv.onpointermove = e => { D.aim = px(e); };
  cv.onpointerup = e => { D.aim = px(e); if (D.down) dropDrop(); D.down = false; };
  let raf = 0, last = performance.now(), G = null;
  const loop = now => { if (GAME !== G) return; const dt = Math.min(.034, (now - last) / 1000); last = now; if (!D.paused && !D.over) dropStep(dt); dropDraw(); raf = requestAnimationFrame(loop); };
  G = lockGame(() => cancelAnimationFrame(raf)); raf = requestAnimationFrame(loop);
}
function dropQuit() { if (!DROP) return; if (DROP.score > 0 && !confirm('그만둘까요? 지금 점수로 끝나요.')) return; dropEnd(true); }
function dropHold() { const D = DROP; if (!D || D.holdUsed) return toast('한 번 떨어뜨린 뒤 다시 보관할 수 있어요'); const c = D.q.shift(); if (D.hold) D.q.unshift(D.hold); else D.q.push(dropNext()); D.hold = c; D.holdUsed = true; sfx('tap'); }
function dropDrop() {
  const D = DROP; if (!D || D.paused || D.over || D.cd > 0) return; const c = D.q.shift(); D.q.push(dropNext()); const r = DROP_T[c.t][0];
  const x = Math.max(DL + r, Math.min(DR - r, D.aim));
  D.balls.push({ id: D.id++, x, y: DY, vx: 0, vy: 30, t: c.t, r, gold: c.gold, age: 0, ov: 0, pop: 0 }); D.cd = D.s === 'sloth' ? .38 : .5; D.holdUsed = false; sfx('tap');
}
function dropStep(dt) {
  const D = DROP; D.t += dt; D.cd = Math.max(0, D.cd - dt); D.shake = Math.max(0, D.shake - dt);
  const G = D.s === 'sloth' ? 210 : 420, E = D.s === 'lust' ? .42 : .12, SUB = 3, h = dt / SUB;
  // 오늘의 죄 이벤트
  D.evT += dt;
  if (D.s === 'wrath' && D.evT > 12) { D.evT = 0; D.balls.forEach(b => { b.vy -= 90 + Math.random() * 80; b.vx += (Math.random() - .5) * 140; }); D.shake = .35; D.txt.push({ x: 90, y: 120, s: '🔥 분노!', c: '#ff8a60', t: 1 }); buzz(40); sfx('bad'); }
  if (D.s === 'gluttony' && D.evT > 18) { D.evT = 0; const sm = D.balls.filter(b => b.t <= 2 && b.age > 1).sort((a, b) => a.t - b.t)[0]; if (sm) { sm.dead = true; D.txt.push({ x: sm.x, y: sm.y, s: '🍗 냠!', c: '#ffd080', t: 1 }); sfx('pop'); } }
  for (let s = 0; s < SUB; s++) {
    D.balls.forEach(b => { b.vy += G * h; b.x += b.vx * h; b.y += b.vy * h; b.vx *= .995;
      if (b.x - b.r < DL) { b.x = DL + b.r; b.vx = Math.abs(b.vx) * E; } if (b.x + b.r > DR) { b.x = DR - b.r; b.vx = -Math.abs(b.vx) * E; }
      if (b.y + b.r > DF) { b.y = DF - b.r; if (b.vy > 0) b.vy = -b.vy * E; b.vx *= .96; } });
    for (let it = 0; it < 3; it++) for (let i = 0; i < D.balls.length; i++) { const a = D.balls[i]; if (a.dead) continue;
      for (let j = i + 1; j < D.balls.length; j++) { const b = D.balls[j]; if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r, d2 = dx * dx + dy * dy; if (d2 >= rr * rr) continue;
        if (a.t === b.t) { dropMerge(a, b); break; }
        const d = Math.sqrt(d2) || .01, nx = dx / d, ny = dy / d, ov = rr - d, ma = a.r * a.r, mb = b.r * b.r, ta = mb / (ma + mb), tb = ma / (ma + mb);
        a.x -= nx * ov * ta; a.y -= ny * ov * ta; b.x += nx * ov * tb; b.y += ny * ov * tb;
        const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny; if (vn < 0) { const j2 = -(1 + E) * vn / (1 / ma + 1 / mb); a.vx -= j2 / ma * nx; a.vy -= j2 / ma * ny; b.vx += j2 / mb * nx; b.vy += j2 / mb * ny; } } }
    D.balls = D.balls.filter(b => !b.dead);
  }
  // 선 넘김
  const grace = D.s === 'pride' ? 1 : 2; let w = 0;
  D.balls.forEach(b => { b.age += dt; b.pop = Math.max(0, b.pop - dt * 4); if (b.age > 1.2 && b.y - b.r < DDANGER && Math.abs(b.vy) < 60) { b.ov += dt; w = Math.max(w, b.ov / grace); } else b.ov = 0; });
  D.warn = w; if (w >= 1) return dropEnd(false);
  if (D.combo && D.t - D.lastM > 1.6) D.combo = 0;
  D.fx.forEach(f => { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 160 * dt; f.t -= dt; }); D.fx = D.fx.filter(f => f.t > 0);
  D.txt.forEach(f => { f.y -= 18 * dt; f.t -= dt * .8; }); D.txt = D.txt.filter(f => f.t > 0);
}
function dropMerge(a, b) {
  const D = DROP; a.dead = b.dead = true; const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2, gold = a.gold || b.gold;
  D.combo = D.t - D.lastM < 1.6 ? D.combo + 1 : 1; D.lastM = D.t; D.best = Math.max(D.best, D.combo);
  if (D.combo >= 6 && D.fever < D.t) { D.fever = D.t + 7; D.txt.push({ x: 90, y: 100, s: '✨ FEVER ×2 ✨', c: '#ffe08a', t: 1.4, big: 1 }); sfx('win'); buzz(50); }
  const mult = (1 + (D.combo - 1) * .15) * (D.fever > D.t ? 2 : 1) * (D.s === 'pride' ? 1.3 : 1) * (gold ? 2 : 1);
  const col = a.t + 1 >= DROP_T.length ? '#ffe08a' : DROP_T[a.t + 1][3];
  for (let i = 0; i < 12 + a.t * 2; i++) { const an = Math.random() * 6.28, sp = 40 + Math.random() * 90; D.fx.push({ x, y, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp - 40, t: .6 + Math.random() * .3, c: i % 3 ? col : '#fff', s: 1.5 + Math.random() * 2 }); }
  if (gold) { D.gold++; }
  if (a.t + 1 >= DROP_T.length) {          // 홀케이크 + 홀케이크 → 죄의 유물
    const pts = Math.round(500 * mult); D.score += pts; D.txt.push({ x, y, s: `+${pts}`, c: '#ffe08a', t: 1.3, big: 1 }); D.shake = .5; buzz(80);
    D.pops++; D.txt.push({ x, y: y - 16, s: '💥 펑!', c: '#fff', t: 1.2, big: 1 }); sfx('win'); msEv('tier', 'sins', DROP_T.length); return;
  }
  const t = a.t + 1, r = DROP_T[t][0], pts = Math.round(DROP_T[t][4] * mult); D.score += pts; D.maxT = Math.max(D.maxT, t); msEv('tier', 'sins', t);
  D.balls.push({ id: D.id++, x, y, vx: (a.vx + b.vx) / 4, vy: Math.min(0, (a.vy + b.vy) / 4) - 30, t, r, gold, age: 1.3, ov: 0, pop: 1 });
  D.txt.push({ x, y: y - r, s: `+${pts}${D.combo > 1 ? ` ×${D.combo}` : ''}`, c: gold ? '#ffe08a' : '#fff', t: 1 });
  if (t >= 6) { D.shake = .25; buzz(25); }
  sfx(D.combo > 2 ? 'coin' : 'pop');
}
function dropDraw() {
  const D = DROP, g = D && D.g; if (!g || !document.body.contains(D.cv)) return; const S = D.S, now = D.t;
  g.setTransform(S, 0, 0, S, 0, 0); if (D.shake > 0) g.translate((Math.random() - .5) * 5 * D.shake * 2, (Math.random() - .5) * 5 * D.shake * 2);
  const fev = D.fever > now;
  g.fillStyle = '#1c120c'; g.fillRect(-6, -6, DRW + 12, DRH + 12);
  for (let x = 0; x < DRW; x += 12) { g.fillStyle = (x / 12) % 2 ? '#24170f' : '#211510'; g.fillRect(x, 0, 12, DRH); }
  // 상자
  g.fillStyle = fev ? '#3a2a14' : '#2e1f15'; g.fillRect(DL, DDANGER - 18, DR - DL, DF - DDANGER + 18);
  g.fillStyle = '#5a3a22'; g.fillRect(DL - 6, DDANGER - 18, 6, DF - DDANGER + 24); g.fillRect(DR, DDANGER - 18, 6, DF - DDANGER + 24); g.fillRect(DL - 6, DF, DR - DL + 12, 6);
  g.fillStyle = '#7a5232'; g.fillRect(DL - 6, DDANGER - 18, 2, DF - DDANGER + 24); g.fillRect(DR, DDANGER - 18, 2, DF - DDANGER + 24);
  // 선
  const wf = D.warn > 0 ? (Math.sin(now * 20) > 0 ? 1 : .4) : .55; g.globalAlpha = wf; g.fillStyle = '#e05050'; for (let x = DL; x < DR; x += 8) g.fillRect(x, DDANGER, 5, 1.5); g.globalAlpha = 1;
  // 조준
  const c = D.q[0]; if (c && !D.over && !D.paused) { const r = DROP_T[c.t][0], x = Math.max(DL + r, Math.min(DR - r, D.aim)); g.globalAlpha = .22; g.fillStyle = '#fff'; for (let y = DY + r; y < DF; y += 7) g.fillRect(x - .5, y, 1, 3.5); g.globalAlpha = D.cd > 0 ? .45 : 1; dropBall(g, x, DY, c.t, r, c.gold, 0); g.globalAlpha = 1; }
  D.balls.forEach(b => dropBall(g, b.x, b.y, b.t, b.r * (1 + b.pop * .18), b.gold, b.ov));
  D.fx.forEach(f => { g.globalAlpha = Math.min(1, f.t * 2); g.fillStyle = f.c; g.fillRect(f.x - f.s / 2, f.y - f.s / 2, f.s, f.s); }); g.globalAlpha = 1;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  D.txt.forEach(f => { g.globalAlpha = Math.min(1, f.t * 1.5); g.font = `700 ${f.big ? 14 : 9}px Galmuri11, monospace`; g.fillStyle = '#140c06'; g.fillText(f.s, f.x + .6, f.y + .6); g.fillStyle = f.c; g.fillText(f.s, f.x, f.y); }); g.globalAlpha = 1;
  // HUD
  g.fillStyle = '#140c06'; g.fillRect(0, 0, DRW, 16); g.font = '700 9px Galmuri11, monospace'; g.textAlign = 'left'; g.fillStyle = '#ffe08a'; g.fillText(`${D.score}`, 6, 8);
  g.textAlign = 'center'; if (D.combo > 1) { g.font = `700 ${9 + Math.min(4, D.combo / 2)}px Galmuri11, monospace`; g.fillStyle = fev ? '#ffe08a' : '#ffb070'; g.fillText(`${D.combo} COMBO${fev ? ' ✨' : ''}`, 90, 8.5); g.font = '700 9px Galmuri11, monospace'; } else { g.fillStyle = '#e8d8c0'; g.fillText(`${SIN_EMB[D.s]} ${sinName(D.s)}`, 90, 8); }
  g.textAlign = 'right'; g.fillStyle = '#a89880'; g.fillText('다음', DR - (D.s === 'lust' ? 44 : 14), 8);
  (D.s === 'lust' ? D.q.slice(1, 4) : D.q.slice(1, 2)).forEach((n, i) => dropBall(g, DR - 6 - i * 13, 8, n.t, 5.5, n.gold, 0, true));
  if (D.hold) { g.textAlign = 'left'; g.fillStyle = '#a89880'; g.fillText('보관', 6, 26); dropBall(g, 34, 26, D.hold.t, 5.5, D.hold.gold, 0, true); }
  if (fev) { g.fillStyle = '#ffe08a'; g.fillRect(DL, DF + 7, (DR - DL) * (D.fever - now) / 7, 2); }
  const hud = $('#dhud'); if (hud) hud.textContent = `점수 ${D.score} · 최고 ${Math.max((P.best || {}).sins || 0, D.score)}`;
  g.setTransform(1, 0, 0, 1, 0, 0);
}
function dropBall(g, x, y, t, r, gold, ov, mini) {
  const T = DROP_T[t], col = gold ? '#e8c048' : T[3];
  g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fillStyle = ov > 0 && Math.sin(DROP.t * 25) > 0 ? '#ff7a7a' : col; g.fill();
  g.lineWidth = mini ? .8 : 1.4; g.strokeStyle = gold ? '#8a6010' : 'rgba(40,20,10,.75)'; g.stroke();
  g.beginPath(); g.arc(x - r * .35, y - r * .38, r * .28, 0, 6.2832); g.fillStyle = 'rgba(255,255,255,.35)'; g.fill();
  g.font = `${Math.round(r * 1.25)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(T[1], x, y + r * .06);
  if (gold && !mini) { g.fillStyle = '#fff6c0'; const a = DROP.t * 3 + x; g.fillRect(x + Math.cos(a) * r * .8 - .8, y + Math.sin(a) * r * .8 - .8, 1.6, 1.6); }
}
function dropEnd(quit) {
  const D = DROP; if (!D || D.over) return; D.over = true; stopGame();
  P.drop = P.drop || {}; P.drop.games = (P.drop.games || 0) + 1;
  const mine = mySin() === D.s, base = Math.floor(D.score / 150) + Math.min(5, D.gold), coins = Math.min(25, Math.round(base * (mine ? 1.5 : 1)));
  const r = reward('sins', coins, D.score); DROP = null;
  finishGame(`<h2 style="color:var(--gold2);margin-top:0">🍵 ${quit ? '여기까지!' : '다과가 넘쳤어요!'}</h2>
   <p style="font-size:2rem;margin:4px 0;color:var(--gold2)"><b>${D.score}</b></p><p class="muted">${r}</p>
   <p class="muted">최고 단계 ${DROP_T[D.maxT][1]} ${DROP_T[D.maxT][2]} · 최대 콤보 ${D.best} · 홀케이크 펑 ${D.pops}번${D.gold ? ` · 황금 합치기 ${D.gold}` : ''}${mine ? ' · 내 죄 ×1.5' : ''}</p>
   <div class="row"><button class="primary" style="flex:1;padding:12px" onclick="closeModal();dropStart()">▶ 한 판 더</button><button onclick="closeModal()">닫기</button></div>`);
}

/* ---------- 이름 · 설명 ---------- */
FEATS.sins = { n: '찻잔 떨어뜨리기', ic: '🍵', d: '같은 다과를 합쳐 더 큰 다과로' };

/* ================= 부엌 머지 (티룸 타이쿤 안) ================= */
const KM_CH = {
  tea: [['🍃', '새순'], ['🌿', '찻잎'], ['🍵', '녹차'], ['🫖', '티포트'], ['🏺', '고급 차통']],
  bake: [['🌾', '밀'], ['🥣', '반죽'], ['🍪', '쿠키'], ['🥧', '파이'], ['🎂', '케이크']],
  fruit: [['🍒', '체리'], ['🍓', '딸기'], ['🍯', '딸기잼'], ['🍮', '푸딩'], ['🍨', '파르페']]
};
const KM_VAL = [1, 3, 8, 20, 50], KM_N = 36, KM_COLS = 6;
const kmItem = k => { if (!k) return null; const ch = k.replace(/\d/g, ''), t = +k.replace(/\D/g, ''); return { ch, t, e: KM_CH[ch][t][0], n: KM_CH[ch][t][1] }; };
let TY_TAB = 'shop', KM_SEL = -1, KM_DRAG = null;
function kmLv() {
  const d = { b: Array(KM_N).fill(null), o: [], lv: 1, xp: 0, dex: [], done: 0 };
  P.km = Object.assign(d, P.km || {}); if (P.km.b.length !== KM_N) P.km.b = Array(KM_N).fill(null).map((_, i) => P.km.b[i] || null);
  while (P.km.o.length < 3) P.km.o.push(kmOrder()); return P.km;
}
function kmOrder() {
  const K = P.km || { lv: 1 }, keys = Object.keys(KM_CH), maxT = Math.min(4, 1 + Math.floor(K.lv / 2)), n = K.lv >= 2 && Math.random() < .4 ? 2 : 1, need = [];
  for (let i = 0; i < n; i++) need.push(keys[rint(3)] + (1 + rint(maxT)));
  const us = (typeof USERS !== 'undefined' ? USERS : []).filter(u => u.ho), gu = us.length ? us[rint(us.length)] : null;
  const v = need.reduce((s, k) => s + KM_VAL[kmItem(k).t], 0), ts = need.reduce((s, k) => s + kmItem(k).t, 0);
  return { id: Math.random().toString(36).slice(2, 8), ho: gu ? gu.ho : '', need, cash: v * 2, silver: Math.max(1, Math.round(ts * 1.3)), xp: ts };
}
function kmHas(need) { const b = P.km.b.slice(); return need.every(k => { const i = b.indexOf(k); if (i < 0) return false; b[i] = 0; return true; }); }
function kmSpawn() {
  const K = kmLv(), empty = K.b.map((x, i) => x ? -1 : i).filter(i => i >= 0); if (!empty.length) { sfx('bad'); shakeEl($('#kmGrid'), 4); return toast('부엌이 꽉 찼어요! 합치거나 🗑에 버려요'); }
  const i = empty[rint(empty.length)], t = K.lv >= 3 && Math.random() < .15 ? 1 : 0, k = Object.keys(KM_CH)[rint(3)] + t; K.b[i] = k; kmDex(k); saveP(); sfx('tap'); kmRefresh(i);
}
function kmDex(k) { const K = P.km; if (K.dex.includes(k)) return; K.dex.push(k); const it = kmItem(k); if (it.t > 0) { tyLv().cash += 2; toast(`📖 도감 등록! ${it.e} ${it.n} (+£2)`); } }
function kmAct(a, b) {
  const K = P.km, A = K.b[a]; if (!A) return;
  if (b === 'trash') { K.b[a] = null; sfx('bad'); saveP(); return kmRefresh(); }
  if (a === b) return; const B = K.b[b];
  if (!B) { K.b[b] = A; K.b[a] = null; sfx('tap'); }
  else if (A === B) { const it = kmItem(A); if (it.t >= 4) { toast('최고 단계예요'); return kmRefresh(); } const nk = it.ch + (it.t + 1); K.b[b] = nk; K.b[a] = null; kmDex(nk); sfx(it.t >= 2 ? 'coin' : 'pop'); buzz(it.t >= 2 ? 25 : 10); saveP(); return kmRefresh(b); }
  else { K.b[b] = A; K.b[a] = B; sfx('tap'); }
  saveP(); kmRefresh();
}
function kmServe(i) {
  const K = kmLv(), o = K.o[i]; if (!o || !kmHas(o.need)) return;
  o.need.forEach(k => { const j = K.b.indexOf(k); K.b[j] = null; });
  const L = tyLv(); L.cash += o.cash; K.xp += o.xp; K.done++; let up = '';
  while (K.xp >= K.lv * 12) { K.xp -= K.lv * 12; K.lv++; up = ` · 🎉 부엌 Lv.${K.lv}!`; }
  K.o[i] = kmOrder(); msEv('order', 'tycoon', 1); const r = reward('kitchen', o.silver);
  toast(`🧺 £${o.cash} · ${r.replace(/<[^>]+>/g, '')}${up}`); sfx('win'); buzz(30); saveP(); kmRefresh();
}
function kmSkip(i) { const K = kmLv(); K.o[i] = kmOrder(); saveP(); sfx('tap'); kmRefresh(); }
function kmInner(pop) {
  const K = kmLv(), L = tyLv(), avatar = ho => { const im = ho && typeof charImgOf === 'function' ? charImgOf(ho) : ''; return im ? `<img src="${im}" style="width:28px;height:28px;border-radius:50%;object-fit:cover">` : '<span style="font-size:1.4rem">🧑‍🎩</span>'; };
  const orders = K.o.map((o, i) => { const ok = kmHas(o.need), b = K.b.slice();
    return `<div class="item" style="display:block;padding:6px;text-align:center;${ok ? 'border-color:var(--gold2)' : ''}"><div class="row" style="justify-content:center;gap:4px;align-items:center">${avatar(o.ho)}<span class="muted" style="font-size:.75rem">${esc(o.ho ? cname(o.ho) : '손님')}</span></div>
     <div style="font-size:1.5rem;margin:2px 0">${o.need.map(k => { const j = b.indexOf(k), has = j >= 0; if (has) b[j] = 0; return `<span style="${has ? '' : 'opacity:.4'}">${kmItem(k).e}</span>`; }).join('')}</div>
     <div class="muted" style="font-size:.72rem">£${o.cash} · 은화 ${o.silver}</div>
     <div class="row" style="justify-content:center;gap:4px;margin-top:4px"><button class="sm ${ok ? 'primary' : ''}" ${ok ? '' : 'disabled'} onclick="kmServe(${i})">내기</button><button class="sm" onclick="kmSkip(${i})" title="다른 주문">🔄</button></div></div>`; }).join('');
  const cells = K.b.map((k, i) => { const it = kmItem(k);
    return `<div data-i="${i}" class="kmc${KM_SEL === i ? ' sel' : ''}${pop === i ? ' pop' : ''}">${it ? `<span>${it.e}</span><i>${'•'.repeat(it.t + 1)}</i>` : ''}</div>`; }).join('');
  const dex = Object.keys(KM_CH).map(ch => `<div style="display:flex;gap:4px;align-items:center;margin:3px 0">${KM_CH[ch].map((x, t) => K.dex.includes(ch + t) ? `<span title="${x[1]}" style="font-size:1.3rem">${x[0]}</span>` : '<span style="font-size:1.3rem;opacity:.25">❔</span>').join('<span class="muted" style="font-size:.7rem">›</span>')}</div>`).join('');
  return `<div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px;margin-bottom:6px"><b>🧺 부엌 Lv.${K.lv}</b><span class="muted" style="font-size:.85rem">경험 ${K.xp}/${K.lv * 12} · 보유 £${L.cash} · ${capTxt('kitchen')}</span></div>
   <div class="grid g3" style="gap:6px;margin-bottom:8px">${orders}</div>
   <div id="kmGrid" class="kmgrid">${cells}</div>
   <div class="row" style="gap:6px;margin-top:8px"><button class="primary" style="flex:1;padding:12px;font-size:1.1rem" onclick="kmSpawn()">🧺 장바구니에서 꺼내기</button><div data-trash="1" class="kmc kmtrash">🗑</div></div>
   <p class="muted" style="font-size:.82rem;margin:6px 0">같은 재료를 겹쳐 합치고, 주문을 채워 £와 은화를 받아요.</p>
   <details><summary><b>📖 부엌 도감</b> <span class="muted">${K.dex.length}/15</span></summary>${dex}</details>`;
}
function kmRefresh(pop) { const el = $('#kmBox'); if (el) el.innerHTML = kmInner(pop); }
function kmDown(e) {
  const c = e.target.closest('[data-i]'); if (!c) return; const i = +c.dataset.i; if (!P.km.b[i]) { if (KM_SEL >= 0) { const s = KM_SEL; KM_SEL = -1; kmAct(s, i); } return; }
  e.preventDefault(); const it = kmItem(P.km.b[i]), gh = document.createElement('div');
  gh.textContent = it.e; gh.style.cssText = `position:fixed;left:${e.clientX - 22}px;top:${e.clientY - 22}px;width:44px;height:44px;font-size:32px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:60;opacity:0;filter:drop-shadow(0 4px 4px rgba(0,0,0,.5))`;
  document.body.appendChild(gh); KM_DRAG = { i, x: e.clientX, y: e.clientY, gh, mv: false };
  const mv = ev => { const D = KM_DRAG; if (!D) return; if (Math.hypot(ev.clientX - D.x, ev.clientY - D.y) > 8) { D.mv = true; gh.style.opacity = 1; } gh.style.left = ev.clientX - 22 + 'px'; gh.style.top = ev.clientY - 22 + 'px'; };
  const up = ev => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); const D = KM_DRAG; KM_DRAG = null; gh.remove(); if (!D) return;
    const el = document.elementFromPoint(ev.clientX, ev.clientY), tc = el && el.closest('[data-i],[data-trash]');
    if (!D.mv) { if (KM_SEL < 0) { KM_SEL = D.i; return kmRefresh(); } const s = KM_SEL; KM_SEL = -1; if (s === D.i) return kmRefresh(); return kmAct(s, D.i); }
    KM_SEL = -1; if (!tc) return kmRefresh(); kmAct(D.i, tc.dataset.trash ? 'trash' : +tc.dataset.i); };
  window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
}
(function () { const st = document.createElement('style'); st.textContent = `.kmgrid{display:grid;grid-template-columns:repeat(${KM_COLS},1fr);gap:4px;touch-action:none;user-select:none;-webkit-user-select:none}
.kmc{aspect-ratio:1;background:#2a1c14;border:2px solid #4a3020;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:clamp(20px,6.5vw,34px);cursor:pointer;position:relative;line-height:1}
.kmc i{font-style:normal;font-size:.5rem;color:var(--gold2);letter-spacing:1px;margin-top:2px}.kmc.sel{border-color:var(--gold2);box-shadow:0 0 0 2px var(--gold2) inset}
.kmc.pop span{animation:kmpop .35s ease-out}@keyframes kmpop{0%{transform:scale(.4)}60%{transform:scale(1.35)}100%{transform:scale(1)}}
.kmtrash{width:52px;flex:none;font-size:24px}`; document.head.appendChild(st); })();
const _tyView = VIEWS.tycoon;
VIEWS.tycoon = () => {
  const busy = typeof TY !== 'undefined' && TY, K = kmLv(), ready = K.o.filter(o => kmHas(o.need)).length;
  return `<div class="toggles" style="margin-bottom:8px"><button class="${TY_TAB === 'shop' ? 'on' : ''}" ${busy ? 'disabled' : ''} onclick="TY_TAB='shop';render()">🍵 티룸 영업</button><button class="${TY_TAB === 'kitchen' ? 'on' : ''}" ${busy ? 'disabled' : ''} onclick="TY_TAB='kitchen';KM_SEL=-1;render()">🧺 부엌${ready ? ` <span class="dot"></span>${ready}` : ''}</button></div>` +
    (TY_TAB === 'kitchen' ? `<div class="panel"><h2>🧺 부엌</h2><div id="kmBox" onpointerdown="kmDown(event)">${kmInner()}</div></div>` : _tyView());
};

/* ---------- 홈 · 놀거리에 미션 ---------- */
const _extra3 = extraPanel;
extraPanel = function () { return msPanel() + _extra3(); };
