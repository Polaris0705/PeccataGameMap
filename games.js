/* =========================================================
   숲속 저택 — 게임 모음 (index.html 전역 사용)
   ========================================================= */
const FEATS = {
  garden:   { n: '온실',          ic: '🌿', d: '씨앗 심고 수확하기' },
  riddle:   { n: '저택의 수수께끼', ic: '🕯', d: '방마다 숨은 수수께끼' },
  shop:     { n: '상점',          ic: '🛍', d: '칭호와 이름표 테두리' },
  rank:     { n: '랭킹',          ic: '🏆', d: '오늘의 손님 순위' },
  tycoon:   { n: '티룸 타이쿤',    ic: '🍵', d: '손님 주문 맞춰 내기' },
  sins:     { n: '칠죄종의 방',    ic: '🎲', d: '1분 미니게임 7종' },
  memory:   { n: '카드 짝맞추기',  ic: '🃏', d: '같은 그림 찾기' },
  tarot:    { n: '타로 운세',      ic: '🔮', d: '하루 한 장' },
  blackjack:{ n: '살롱 블랙잭',    ic: '♠️', d: '여럿이 은화 걸기' },
  truth:    { n: '진실과 거짓',    ic: '🎭', d: '거짓 하나 맞히기' }
};
const FEAT_KEYS = Object.keys(FEATS);
const DAILY_REWARD = 2;
const dailyCap = () => DAILY_REWARD + (typeof roomCnt === 'function' && roomCnt('gclock') ? 1 : 0);           // 게임별 하루 보상 횟수
let GAME = null; window.GAME_LOCK = false;
let BJ = null, TRUTHS = [];

function stopGame() { if (GAME) { try { GAME.stop && GAME.stop(); } catch (e) {} GAME = null; } window.GAME_LOCK = false; }
function lockGame(stop) { stopGame(); GAME = { stop, alive: true }; window.GAME_LOCK = true; return GAME; }
function gameDay() { const t = kstDate(); if (!P.gd || P.gd.date !== t) P.gd = { date: t, p: {} }; return P.gd; }
function playsLeft(id) { return Math.max(0, dailyCap() - (gameDay().p[id] || 0)); }
function reward(id, coins) {
  const g = gameDay(); g.p[id] = (g.p[id] || 0) + 1; coins = Math.max(0, Math.round(coins));
  if (g.p[id] <= dailyCap() && coins > 0) { earn(coins); return `+${coins} 은화`; }
  saveP(); return coins > 0 ? '오늘 보상 횟수를 다 써서 연습으로 기록됐어요' : '';
}
function finishGame(html) { stopGame(); render(); modal(html); sfx('win'); }
const rint = n => Math.floor(Math.random() * n);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const gbox = () => $('#gbox');

/* ================= 티룸 타이쿤 ================= */
const TEA_D = [['홍차', '🍵', 0], ['커피', '☕', 0], ['허브티', '🌿', 1], ['코코아', '🍫', 2]];
const TEA_S = [['쿠키', '🍪', 0], ['컵케이크', '🧁', 0], ['케이크', '🍰', 1], ['파이', '🥧', 2]];
const GUESTS = ['🧑‍🎩', '👩‍🦰', '🧔', '👵', '🧑‍🎨', '👨‍🍳', '🧕', '🧛', '🧙'];
function teaLv() { P.tea = Object.assign({ cup: 0, menu: 0, decor: 0, best: 0 }, P.tea || {}); return P.tea; }
VIEWS.tycoon = () => {
  const L = teaLv();
  const up = [['cup', '고급 찻잔', '팁 +1', 50 * (L.cup + 1), 5], ['menu', '메뉴 늘리기', '새 음료·디저트', [100, 200][L.menu], 2], ['decor', '실내 장식', '인내심 +2초', 80 * (L.decor + 1), 5]];
  return `<div class="panel"><h2>🍵 티룸 타이쿤</h2><p class="muted">60초 동안 손님 주문(음료+디저트)을 맞춰 내세요. 빨리 낼수록 팁이 커요. 매출의 40%가 내 몫이에요. 오늘 보상 ${playsLeft('tycoon')}회 남음 · 최고 ${L.best}은화</p>
   <div id="gbox"><button class="primary" style="width:100%" onclick="teaStart()">영업 시작</button></div>
   <h3>업그레이드</h3>${up.map(([k, n, d, c, max]) => `<div class="item" style="margin:6px 0"><div><b>${n}</b> <span class="muted">Lv.${L[k]} · ${d}</span></div>${c && L[k] < max ? `<button onclick="teaUp('${k}',${c})" ${P.coins < c ? 'disabled' : ''}>${c} 은화</button>` : '<button disabled>최대</button>'}</div>`).join('')}</div>`;
};
function teaUp(k, c) { if (!spend(c)) return; teaLv()[k]++; saveP(); render(); }
function teaStart() {
  const L = teaLv(), D = TEA_D.filter(x => x[2] <= L.menu), S = TEA_S.filter(x => x[2] <= L.menu);
  const st = { t: 60, earned: 0, served: 0, tray: {}, g: null };
  const newG = () => { const m = 12 + L.decor * 2; st.g = { face: GUESTS[rint(GUESTS.length)], d: D[rint(D.length)], s: S[rint(S.length)], pat: m, max: m }; st.tray = {}; };
  const draw = () => {
    const b = gbox(); if (!b) return; const g = st.g;
    b.innerHTML = `<div class="row" style="justify-content:space-between"><b>⏱ ${st.t}초</b><b>◈ ${st.earned}</b><span class="muted">손님 ${st.served}명</span></div>
     <div class="card" style="text-align:center"><div style="font-size:2.4rem">${g.face}</div><div>"${g.d[0]} ${g.d[1]}이랑 ${g.s[0]} ${g.s[1]} 주세요"</div><div class="prog"><i style="width:${g.pat / g.max * 100}%"></i></div></div>
     <div class="muted">쟁반: ${st.tray.d ? st.tray.d[1] : '·'} ${st.tray.s ? st.tray.s[1] : '·'}</div>
     <div class="toggles" style="margin:6px 0">${D.map((x, i) => `<button class="${st.tray.d === x ? 'on' : ''}" onclick="teaPick('d',${i})">${x[1]} ${x[0]}</button>`).join('')}</div>
     <div class="toggles">${S.map((x, i) => `<button class="${st.tray.s === x ? 'on' : ''}" onclick="teaPick('s',${i})">${x[1]} ${x[0]}</button>`).join('')}</div>
     <button class="primary" style="width:100%;margin-top:8px" onclick="teaServe()">내놓기</button>`;
  };
  window.teaPick = (k, i) => { st.tray[k] = (k === 'd' ? D : S)[i]; draw(); };
  window.teaServe = () => {
    const g = st.g;
    if (st.tray.d === g.d && st.tray.s === g.s) { sfx('ok'); const tip = Math.round(3 + L.cup + g.pat / g.max * 3) + (typeof roomCnt === 'function' && roomCnt('teaset') ? 1 : 0); st.earned += tip; st.served++; toast(`감사합니다! +${tip}`); newG(); }
    else { g.pat = Math.max(0, g.pat - 3); toast('주문과 달라요…'); sfx('bad'); }
    draw();
  };
  const iv = setInterval(() => {
    st.t--; st.g.pat--;
    if (st.g.pat <= 0) { toast('손님이 기다리다 떠났어요…'); newG(); }
    if (st.t <= 0) { clearInterval(iv); L.best = Math.max(L.best, st.earned); const r = reward('tycoon', Math.round(st.earned * 0.4));
      finishGame(`<h2 style="color:var(--gold2);margin-top:0">🍵 영업 종료</h2><p>손님 ${st.served}명 · 매출 ${st.earned} (내 몫 40%)</p><p class="muted">${r}</p><div class="row"><button class="primary" onclick="closeModal();teaStart()">한 번 더</button><button onclick="closeModal()">닫기</button></div>`); return; }
    draw();
  }, 1000);
  lockGame(() => clearInterval(iv)); newG(); draw();
}

/* ================= 칠죄종의 방 ================= */
const SIN_GAMES = {
  wrath:    { n: '접시 깨기',     d: '20초 동안 나타나는 접시를 깨뜨려요' },
  greed:    { n: '보물 상자',     d: '저주받은 상자를 피해 은화를 모아요' },
  sloth:    { n: '알람 끄기',     d: '알람이 울리는 순간 눌러요 (일찍 깨면 실패)' },
  gluttony: { n: '먹방',         d: '10초 동안 최대한 많이 먹어요' },
  pride:    { n: '완벽한 정지',   d: '움직이는 바늘을 한가운데에 멈춰요' },
  envy:     { n: '보석 기억',     d: '빛나는 보석의 순서를 따라 해요' },
  lust:     { n: '가면무도회',    d: '하나만 다른 가면을 찾아요' }
};
VIEWS.sins = () => `<div class="panel"><h2>🎲 칠죄종의 방</h2><p class="muted">일곱 개의 문 뒤에 짧은 게임이 하나씩 있어요. 자기 HO의 죄에 해당하는 게임은 보상이 1.5배예요. 게임마다 하루 보상 ${dailyCap()}회.</p>
  <div id="gbox"><div class="grid g3">${HOS.map(h => { const g = SIN_GAMES[h.id]; const mine = mySin() === h.id;
    return `<button class="room ${mine ? 'solved' : ''}" onclick="sinStart('${h.id}')"><div class="no">${h.name}${mine ? ' · 내 죄 ×1.5' : ''}</div><div class="rn">${g.n}</div><div class="muted" style="font-size:.8rem">${g.d}</div><div class="muted" style="font-size:.75rem">오늘 보상 ${playsLeft('sin_' + h.id)}회</div></button>`; }).join('')}</div></div></div>`;
function sinEnd(id, coins, txt) {
  const mult = mySin() === id ? 1.5 : 1, c = Math.min(20, Math.max(0, coins)) * mult, r = reward('sin_' + id, c);
  finishGame(`<h2 style="color:var(--gold2);margin-top:0">${(HOS.find(h => h.id === id) || {}).name} · ${SIN_GAMES[id].n}</h2><p>${txt}</p><p class="muted">${r || '보상 없음'}</p><div class="row"><button class="primary" onclick="closeModal();sinStart('${id}')">다시</button><button onclick="closeModal()">닫기</button></div>`);
}
function sinStart(id) {
  const b = gbox(); if (!b) return;
  b.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:8px"><b>${SIN_GAMES[id].n}</b><button class="sm" onclick="stopGame();render()">그만두기</button></div><div id="sinArea"></div>`;
  ({ wrath: sinWrath, greed: sinGreed, sloth: sinSloth, gluttony: sinGlut, pride: sinPride, envy: sinEnvy, lust: sinLust })[id]();
}
const area = () => $('#sinArea');
function sinWrath() {
  let t = 20, hits = 0, cur = -1;
  const draw = () => { const a = area(); if (!a) return; a.innerHTML = `<div class="row" style="justify-content:space-between"><b>⏱ ${t}</b><b>💥 ${hits}</b></div><div class="mgrid g3x">${Array.from({ length: 9 }, (_, i) => `<button class="mcell" onpointerdown="wrathHit(${i})">${i === cur ? '🍽️' : ''}</button>`).join('')}</div>`; };
  window.wrathHit = i => { if (i === cur) { hits++; cur = -1; sfx('tap'); draw(); } };
  const sp = setInterval(() => { let n; do { n = rint(9); } while (n === cur); cur = n; draw(); }, 720);
  const tm = setInterval(() => { t--; if (t <= 0) { stopGame(); sinEnd('wrath', hits, `접시 ${hits}장을 깨뜨렸다!`); } else draw(); }, 1000);
  lockGame(() => { clearInterval(sp); clearInterval(tm); }); draw();
}
function sinGreed() {
  const steps = [5, 10, 15, 25, 35, 50]; let lv = 0, pot = 0;
  const draw = msg => { const a = area(); if (!a) return; a.innerHTML = `<p>${msg || '상자 셋 중 하나에는 저주가 들어 있다.'}</p><p>챙긴 은화 <b>${pot}</b> · 다음 상자 +${steps[lv]}</p>
    <div class="toggles" style="justify-content:center">${[0, 1, 2].map(i => `<button style="font-size:2.2rem;padding:10px 20px" onclick="greedPick(${i})">🧰</button>`).join('')}</div>
    ${pot ? '<button style="width:100%;margin-top:10px" onclick="greedStop()">그만하고 챙기기</button>' : ''}`; };
  window.greedPick = i => { if (i === rint(3)) { stopGame(); sinEnd('greed', 0, '저주받은 상자였다… 챙긴 은화를 모두 잃었다.'); return; }
    pot += steps[lv]; lv++; if (lv >= steps.length) { stopGame(); sinEnd('greed', pot, `모든 상자를 열었다! ${pot}은화`); return; } draw(`💰 +${steps[lv - 1]}! 더 열어 볼까?`); };
  window.greedStop = () => { stopGame(); sinEnd('greed', pot, `${pot}은화를 챙겨 물러났다.`); };
  lockGame(() => {}); draw();
}
function sinSloth() {
  const N = 5; let r = 0, st = 'idle', t0 = 0, to = null; const times = []; const G = lockGame(() => clearTimeout(to));
  const draw = (big, msg) => { const a = area(); if (!a) return; a.innerHTML = `<div class="tapzone ${st}" onpointerdown="slothTap()"><div><div style="font-size:2.8rem">${big}</div><div>${msg}</div><div class="muted">${Math.min(r + 1, N)}/${N}</div></div></div>`; };
  const arm = () => { if (GAME !== G) return; st = 'wait'; draw('😴', '쿨쿨… 알람이 울리면 누르세요'); to = setTimeout(() => { st = 'go'; t0 = performance.now(); draw('⏰', '지금!'); }, 1500 + Math.random() * 3500); };
  const next = () => { r++; st = 'idle'; if (r >= N) { const avg = Math.round(times.reduce((a, b) => a + b, 0) / N); stopGame(); sinEnd('sloth', Math.round(30 - (avg - 250) / 25), `평균 반응 ${avg}ms`); return; } draw('💤', '…'); setTimeout(arm, 700); };
  window.slothTap = () => { if (st === 'wait') { clearTimeout(to); times.push(1500); toast('너무 일찍 일어났다!'); next(); } else if (st === 'go') { times.push(performance.now() - t0); next(); } };
  arm();
}
function sinGlut() {
  const foods = ['🍰', '🍗', '🍣', '🍜', '🍩', '🍔', '🥟', '🍕']; let t = 10, n = 0, started = false, iv = null;
  const draw = () => { const a = area(); if (!a) return; a.innerHTML = `<div class="row" style="justify-content:space-between"><b>⏱ ${t}</b><b>😋 ${n}</b></div><div class="tapzone" onpointerdown="glutTap()"><div style="font-size:4rem">${foods[n % foods.length]}</div></div><p class="muted" style="text-align:center">${started ? '계속 눌러요!' : '누르면 시작해요'}</p>`; };
  window.glutTap = () => { if (!started) { started = true; iv = setInterval(() => { t--; if (t <= 0) { stopGame(); sinEnd('gluttony', Math.round(n / 3), `${n}입 먹었다!`); } else draw(); }, 1000); } n++; draw(); };
  lockGame(() => clearInterval(iv)); draw();
}
function sinPride() {
  let tries = 0, total = 0, raf = 0, t0 = performance.now(), speed = 2.2, x = 0;
  const loop = now => { x = (Math.sin((now - t0) / 1000 * speed) + 1) / 2; const n = $('#ndl'); if (n) n.style.left = `calc(${x * 100}% - 2px)`; raf = requestAnimationFrame(loop); };
  const draw = msg => { const a = area(); if (!a) return; a.innerHTML = `<p>${msg || '가운데 금색 칸에 바늘을 멈춰요.'} (${tries + 1}/3)</p><div class="bar"><div class="mid"></div><div class="ndl" id="ndl"></div></div><button class="primary" style="width:100%;margin-top:12px" onpointerdown="prideTap()">멈춰!</button><p class="muted">점수 ${total}</p>`; };
  window.prideTap = () => { const d = Math.abs(x - .5), pts = Math.max(0, Math.round(10 - d * 40)); total += pts; tries++; speed += 0.9;
    if (tries >= 3) { stopGame(); sinEnd('pride', total, `총 ${total}점 (30점 만점)`); return; } draw(pts >= 9 ? `완벽해! +${pts}` : `+${pts}`); };
  lockGame(() => cancelAnimationFrame(raf)); draw(); raf = requestAnimationFrame(loop);
}
function sinEnvy() {
  const cols = [['#e05a6b', '루비'], ['#4fa36b', '에메랄드'], ['#4f7fd1', '사파이어'], ['#e2bd5c', '호박']];
  let seq = [], inp = [], showing = false, tos = [];
  const G = lockGame(() => tos.forEach(clearTimeout));
  const draw = (lit, msg) => { const a = area(); if (!a) return; a.innerHTML = `<p>${msg}</p><div class="mgrid" style="grid-template-columns:1fr 1fr">${cols.map((c, i) => `<button class="gem ${lit === i ? 'lit' : ''}" style="background:${c[0]};color:${c[0]}" onpointerdown="envyTap(${i})"></button>`).join('')}</div><p class="muted">단계 ${seq.length}</p>`; };
  const play = () => { if (GAME !== G) return; seq.push(rint(4)); inp = []; showing = true; draw(-1, '잘 봐요…');
    seq.forEach((g, i) => { tos.push(setTimeout(() => draw(g, '잘 봐요…'), 700 + i * 650)); tos.push(setTimeout(() => draw(-1, '잘 봐요…'), 700 + i * 650 + 420)); });
    tos.push(setTimeout(() => { showing = false; draw(-1, '같은 순서로 눌러요'); }, 700 + seq.length * 650)); };
  window.envyTap = i => { if (showing) return; inp.push(i); draw(i, '같은 순서로 눌러요'); setTimeout(() => { if (!showing && GAME === G) draw(-1, '같은 순서로 눌러요'); }, 180);
    if (seq[inp.length - 1] !== i) { stopGame(); sinEnd('envy', (seq.length - 1) * 4, `${seq.length - 1}단계까지 기억했다`); return; }
    if (inp.length === seq.length) setTimeout(play, 500); };
  play();
}
function sinLust() {
  const pairs = [['🌹', '🥀'], ['🎭', '👺'], ['💍', '💎'], ['🦋', '🐛'], ['🍷', '🍸'], ['🗝️', '🔑'], ['🌙', '🌛'], ['🕯️', '🔥'], ['👁️', '👀']];
  let t = 20, sc = 0, odd = 0, pr = pairs[0];
  const newRound = () => { pr = pairs[rint(pairs.length)]; odd = rint(16); };
  const draw = () => { const a = area(); if (!a) return; a.innerHTML = `<div class="row" style="justify-content:space-between"><b>⏱ ${t}</b><b>💘 ${sc}</b></div><div class="mgrid g4x">${Array.from({ length: 16 }, (_, i) => `<button class="mcell" style="font-size:1.6rem" onpointerdown="lustTap(${i})">${i === odd ? pr[1] : pr[0]}</button>`).join('')}</div>`; };
  window.lustTap = i => { if (i === odd) { sc++; newRound(); } else { t = Math.max(0, t - 2); toast('그 가면이 아니에요 (-2초)'); } draw(); };
  const iv = setInterval(() => { t--; if (t <= 0) { stopGame(); sinEnd('lust', sc * 2, `${sc}번 찾아냈다`); } else draw(); }, 1000);
  lockGame(() => clearInterval(iv)); newRound(); draw();
}

/* ================= 카드 짝맞추기 ================= */
VIEWS.memory = () => `<div class="panel"><h2>🃏 카드 짝맞추기</h2><p class="muted">같은 그림 두 장을 찾아요. 적게 뒤집을수록 은화가 많아요. 오늘 보상 ${playsLeft('memory')}회 남음</p>
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
      if (pairs === 8) { const coins = Math.max(3, 18 - (moves - 8)), r = reward('memory', coins); finishGame(`<h2 style="color:var(--gold2);margin-top:0">🃏 다 찾았어요!</h2><p>${moves}번 뒤집어 완성</p><p class="muted">${r}</p><div class="row"><button class="primary" onclick="closeModal();memStart()">다시</button><button onclick="closeModal()">닫기</button></div>`); }
    } else { lock = true; draw(); tos.push(setTimeout(() => { a.open = c.open = false; first = -1; lock = false; draw(); }, 750)); }
  };
  lockGame(() => tos.forEach(clearTimeout)); draw();
}

/* ================= 타로 운세 ================= */
const TAROT = [
  ['0 바보', '두려움 없이 새로운 길로 들어설 때'], ['I 마법사', '가진 재주를 쓸 때가 왔다'], ['II 여사제', '말보다 직감을 믿어라'], ['III 여황제', '풍요와 돌봄이 곁에 있다'],
  ['IV 황제', '규칙과 질서가 힘이 된다'], ['V 교황', '오래된 지혜에 귀 기울여라'], ['VI 연인', '마음이 끌리는 선택'], ['VII 전차', '밀어붙이면 나아간다'],
  ['VIII 힘', '부드러움이 거친 것을 이긴다'], ['IX 은둔자', '혼자 생각할 시간이 필요하다'], ['X 운명의 수레바퀴', '흐름이 바뀌는 날'], ['XI 정의', '저울은 공정하게 기운다'],
  ['XII 매달린 사람', '다른 각도에서 보면 답이 있다'], ['XIII 죽음', '끝은 곧 시작이다'], ['XIV 절제', '서두르지 말고 섞어라'], ['XV 악마', '유혹을 경계하라'],
  ['XVI 탑', '갑작스러운 깨달음'], ['XVII 별', '희망이 조용히 빛난다'], ['XVIII 달', '보이는 것이 전부가 아니다'], ['XIX 태양', '밝고 따뜻한 하루'],
  ['XX 심판', '지난 일을 돌아볼 때'], ['XXI 세계', '하나의 이야기가 완성된다']
];
VIEWS.tarot = () => {
  const today = kstDate(), t = P.tarot && P.tarot.date === today ? P.tarot : null;
  if (t) { const c = TAROT[t.card]; return `<div class="panel"><h2>🔮 타로 운세</h2><div class="card" style="text-align:center;padding:20px"><div style="font-size:3rem">${t.rev ? '🙃' : '🃏'}</div><h2 style="margin:6px 0">${c[0]}${t.rev ? ' (역방향)' : ''}</h2><p class="story">${t.rev ? '조심스럽게… ' : ''}${c[1]}</p><p class="muted">오늘 받은 은화 +${t.coins}</p></div><p class="muted">내일 한국 시간 자정에 다시 뽑을 수 있어요.</p></div>`; }
  return `<div class="panel"><h2>🔮 타로 운세</h2><p class="muted">하루 한 장. 마음이 가는 카드를 고르세요.</p><div class="mgrid" style="grid-template-columns:repeat(3,1fr)">${[0, 1, 2].map(i => `<button class="mcell cardf" style="font-size:2.4rem" onclick="tarotPick()">🂠</button>`).join('')}</div></div>`;
};
function tarotPick() { const today = kstDate(); if (P.tarot && P.tarot.date === today) return; const card = rint(TAROT.length), rev = Math.random() < .3, coins = 2 + rint(7);
  P.tarot = { date: today, card, rev, coins }; earn(coins); render(); toast(`🔮 ${TAROT[card][0]} · +${coins} 은화`); }

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
  catch (e) { toast('잠시 후 다시 해 주세요 (' + (e.code || e.message || e) + ')'); return false; }
}
const refund = n => { P.coins += n; saveP(); };
async function bjJoin(bet) {
  if (!spend(bet)) return;
  const ok = await bjTx(s => { if (s.phase !== 'bet' || s.seats[ME.uid]) return undefined; s.seats[ME.uid] = { name: myHo() ? cname(myHo()) : PROF.name, bet, hand: [], st: 'wait', res: '' }; return s; });
  if (!ok) { refund(bet); toast('지금은 앉을 수 없어요 (판이 진행 중이에요)'); }
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
  toast(me.res === 'lose' ? `♠ 졌어요… -${me.bet}` : me.res === 'push' ? '♠ 비겼어요 (돌려받음)' : `♠ 이겼어요! +${back - me.bet}`);
}
const BJ_RES = { win: '승리', bj: '블랙잭!', push: '무승부', lose: '패배' };
VIEWS.blackjack = () => {
  const s = BJ || bjFresh(), me = s.seats[ME.uid], seats = Object.entries(s.seats), playing = s.phase === 'play', turnU = playing ? s.order[s.turn] : null;
  const dealerHtml = (s.dealer || []).map((c, i) => cardHtml(c, playing && i === 1)).join('') || '<span class="muted">-</span>';
  return `<div class="panel"><h2>♠️ 살롱 블랙잭</h2><p class="muted">같은 판에 여럿이 함께 앉아요. 딜러보다 21에 가까우면 이겨요. 블랙잭은 2.5배, 승리는 2배로 돌려받아요.</p>
   <div class="card"><b>딜러</b> ${playing ? '' : s.dealer.length ? `<span class="muted">(${bjVal(s.dealer)})</span>` : ''}<div style="margin-top:4px">${dealerHtml}</div></div>
   ${seats.map(([u, p]) => `<div class="card" style="${u === turnU ? 'border-color:var(--gold)' : ''}"><div class="h"><b>${esc(p.name)}${u === ME.uid ? ' (나)' : ''}</b><span class="muted">걸음 ${p.bet}${p.hand.length ? ' · ' + bjVal(p.hand) : ''}${p.st === 'bust' ? ' · 버스트' : p.st === 'bj' ? ' · 블랙잭' : ''}${s.phase === 'done' && p.res ? ' · <b>' + BJ_RES[p.res] + '</b>' : u === turnU ? ' · 차례' : ''}</span></div><div>${p.hand.map(c => cardHtml(c)).join('')}</div></div>`).join('') || '<p class="muted">아직 아무도 앉지 않았어요.</p>'}
   <div style="margin-top:10px">
   ${s.phase === 'bet' ? (me ? `<div class="row"><button class="primary" onclick="bjDeal()">카드 나누기</button><button onclick="bjLeave()">일어나기 (돌려받기)</button></div><p class="muted">다른 사람이 앉기를 기다렸다가 아무나 "카드 나누기"를 누르면 시작해요.</p>`
     : `<div class="row">${[5, 10, 20, 50].map(b => `<button onclick="bjJoin(${b})" ${P.coins < b ? 'disabled' : ''}>${b} 은화 걸고 앉기</button>`).join('')}</div>`) : ''}
   ${playing && turnU === ME.uid ? `<div class="row"><button class="primary" onclick="bjAct('hit')">히트 (한 장 더)</button><button onclick="bjAct('stand')">스탠드 (멈춤)</button>${me.hand.length === 2 ? `<button onclick="bjAct('double')" ${P.coins < me.bet ? 'disabled' : ''}>더블 (+${me.bet})</button>` : ''}</div>` : ''}
   ${playing && turnU !== ME.uid ? `<p class="muted">${esc((s.seats[turnU] || {}).name || '')}의 차례예요.</p>${Date.now() - (s.turnAt || 0) > 45000 ? '<button class="sm" onclick="bjSkip()">⏭ 오래 기다렸어요 · 차례 넘기기</button>' : ''}` : ''}
   ${s.phase === 'done' ? `<button class="primary" onclick="bjNew()">새 판 시작</button>` : ''}
   </div></div>`;
};

/* ================= 진실과 거짓 (여럿이) ================= */
let TF2 = { s: ['', '', ''], lie: 0 };
VIEWS.truth = () => {
  const list = TRUTHS.slice(0, 15);
  return `<div class="panel"><h2>🎭 진실과 거짓</h2><p class="muted">진술 셋 중 하나는 거짓말. 맞히면 +5 은화, 출제자는 속은 사람 한 명당 +2 은화(최대 10).</p>
   <h3>내 진술 올리기</h3>${[0, 1, 2].map(i => `<div class="row" style="margin:4px 0;flex-wrap:nowrap"><label style="flex:0 0 auto"><input type="radio" name="tlie" style="width:auto" ${TF2.lie === i ? 'checked' : ''} onchange="TF2.lie=${i}"> 거짓</label><input maxlength="80" value="${esc(TF2.s[i])}" oninput="TF2.s[${i}]=this.value" placeholder="진술 ${i + 1}"></div>`).join('')}
   <button class="primary" onclick="truthPost()">올리기</button></div>
   ${list.map(t => { const mine = t.uid === ME.uid, my = (t.votes || {})[ME.uid], nv = Object.keys(t.votes || {}).length, rev = t.status === 'revealed';
     return `<div class="panel"><div class="h" style="display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap"><b>${esc(t.name)}의 진술</b><span class="muted">투표 ${nv}명${rev ? ' · 공개됨' : ''}</span></div>
      ${t.s.map((x, i) => `<button class="choice ${my === i ? 'on' : ''}" ${mine || rev ? 'disabled' : ''} onclick="truthVote('${t.id}',${i})" style="${rev && i === t.lie ? 'border-color:var(--wine2);color:var(--wine2)' : ''}">${rev && i === t.lie ? '🤥 ' : ''}${esc(x)}${rev ? ` <span class="muted">(${Object.values(t.votes || {}).filter(v => v === i).length}표)</span>` : ''}</button>`).join('')}
      ${mine && !rev ? `<div class="row"><button class="sm primary" ${nv ? '' : 'disabled'} onclick="truthReveal('${t.id}')">정답 공개</button><button class="sm danger" onclick="truthDel('${t.id}')">삭제</button></div>` : ''}
      ${rev && my != null ? `<p>${my === t.lie ? '🎯 맞혔어요!' : '😵 속았어요…'}</p>` : ''}</div>`; }).join('')}`;
};
async function truthPost() {
  const s = TF2.s.map(x => x.trim()); if (s.some(x => !x)) return toast('진술 세 개를 모두 적어 주세요');
  try { const id = await B.add('truths', { uid: ME.uid, name: myHo() ? cname(myHo()) : PROF.name, s, status: 'open', votes: {}, lie: -1, at: Date.now() });
    await B.set('truthKeys/' + id, { uid: ME.uid, lie: TF2.lie }); } catch (e) { return toast('실패: ' + (e.code || e.message)); }
  TF2 = { s: ['', '', ''], lie: 0 }; render(); toast('올렸어요');
}
function truthVote(id, i) { B.update('truths/' + id, { ['votes.' + ME.uid]: i }).catch(e => toast('실패: ' + (e.code || e.message))); }
async function truthReveal(id) { const k = await B.get('truthKeys/' + id); if (!k) return toast('정답 정보를 찾지 못했어요'); await B.update('truths/' + id, { status: 'revealed', lie: k.lie }); }
function truthDel(id) { if (confirm('삭제할까요?')) B.del('truths/' + id); }
function truthPayout() {
  if (!P || !ME) return; P.truthPaid = P.truthPaid || []; let ch = false;
  TRUTHS.filter(t => t.status === 'revealed' && !P.truthPaid.includes(t.id)).forEach(t => {
    const v = t.votes || {};
    if (t.uid === ME.uid) { const fooled = Object.values(v).filter(x => x !== t.lie).length; if (fooled) { earn(Math.min(10, fooled * 2)); toast(`🎭 ${fooled}명을 속였어요! +${Math.min(10, fooled * 2)}`); } P.truthPaid.push(t.id); ch = true; }
    else if (v[ME.uid] != null) { if (v[ME.uid] === t.lie) { earn(5); toast('🎭 거짓을 맞혔어요! +5'); } P.truthPaid.push(t.id); ch = true; }
  });
  if (ch) { P.truthPaid = P.truthPaid.slice(-60); saveP(); }
}

/* ================= 구독 ================= */
function gamesOnAuth(u) {
  BJ = null; TRUTHS = []; stopGame(); if (!u) return;
  unsubs.push(B.onDoc('games/bj', d => { BJ = d; bjPayout(); if (tab === 'blackjack') softRender(); }));
  unsubs.push(B.onCol('truths', l => { TRUTHS = l.sort((a, b) => (b.at || 0) - (a.at || 0)); truthPayout(); if (tab === 'truth') softRender(); }));
}
if (typeof ME !== 'undefined' && ME) gamesOnAuth(ME);
