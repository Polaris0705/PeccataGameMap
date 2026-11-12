/* =========================================================
   숲속 저택 — 파티 게임 (아무나 방을 열고 함께 하기)
   눈치게임 · 은화 경매 · 라이어 게임
   ========================================================= */
FEATS.party = { n: '파티 게임', ic: '🎉', d: '여럿이 실시간으로 함께' };
if (!FEAT_KEYS.includes('party')) FEAT_KEYS.push('party');
(() => { const h = ROOM_HINTS.find(([re]) => re.test('응접실')); if (h && !h[1].includes('party')) h[1].push('party'); })();

const PARTY_TYPES = {
  nunchi:  { n: '눈치게임',   ic: '✋', min: 3, d: '1부터 차례로 외치기. 겹치거나 마지막까지 못 외치면 탈락' },
  auction: { n: '은화 경매',  ic: '🔨', min: 2, d: '방장이 내건 물건에 은화로 입찰' },
  liar:    { n: '라이어 게임', ic: '🤥', min: 3, d: '혼자 제시어를 모르는 라이어 찾기' }
};
const LIAR_WORDS = {
  '음식': ['김치찌개', '떡볶이', '초밥', '피자', '햄버거', '라면', '비빔밥', '스테이크', '마카롱', '팥빙수', '삼겹살', '짜장면'],
  '동물': ['고양이', '강아지', '펭귄', '기린', '코끼리', '부엉이', '햄스터', '돌고래', '여우', '판다', '거북이', '까마귀'],
  '장소': ['도서관', '병원', '놀이공원', '해변', '지하철역', '공항', '카페', '묘지', '교회', '학교', '영화관', '찜질방'],
  '직업': ['의사', '탐정', '요리사', '경찰', '소방관', '교사', '기자', '마술사', '집사', '간호사', '화가', '사서'],
  '물건': ['우산', '거울', '시계', '열쇠', '촛불', '안경', '가위', '망원경', '나침반', '책갈피', '향수', '반지'],
  '저택': ['샹들리에', '초상화', '괘종시계', '와인 저장고', '비밀 통로', '벽난로', '은촛대', '다락방', '온실', '피아노', '갑옷', '응접실'],
  '크툴루': ['촉수', '고서', '제단', '가면', '심해', '광기', '의식', '석상', '등대', '안개', '주문', '별자리']
};
let PROOM_AT = 0, PROOMS = [], PROOM = null, PSECRET = null, PSEC_UNSUB = null, PANSWER = null, PTIMER = null;
const myName = () => myHo() ? cname(myHo()) : (PROF && PROF.name) || '?';
const roomOf = id => PROOMS.find(r => r.id === id);
const paidRound = r => (P.partyPaid || []).includes(r);
function markPaid(r) { P.partyPaid = [...(P.partyPaid || []).slice(-60), r]; }
async function rtx(id, fn) { try { return await B.tx('rooms/' + id, cur => cur ? fn(JSON.parse(JSON.stringify(cur))) : undefined); } catch (e) { toast('잠시 후 다시 해 주세요 (' + (e.code || e.message || e) + ')'); return false; } }

/* ---------- 로비 ---------- */
VIEWS.party = () => {
  const r = PROOM && roomOf(PROOM);
  if (PROOM && !r) { if (Date.now() - PROOM_AT < 5000) return '<div class="panel"><p class="muted">방에 들어가는 중…</p></div>'; PROOM = null; }
  if (r) return roomView(r);
  const open = PROOMS.filter(x => x.status !== 'closed' && Date.now() - (x.at || 0) < 6 * 36e5);
  return `<div class="panel"><h2>🎉 파티 게임</h2><p class="muted">누구나 방을 열 수 있어요. 방을 연 사람이 방장이 되어 시작 버튼을 눌러요.</p>
    <div class="grid g3">${Object.entries(PARTY_TYPES).map(([k, t]) => `<button class="room sindoor" onclick="roomCreate('${k}')"><div class="semb">${t.ic}</div><div class="rn">${t.n} 방 열기</div><div class="muted" style="font-size:.8rem">${t.d} · ${t.min}명 이상</div></button>`).join('')}</div></div>
   <div class="panel"><h2>열려 있는 방</h2>${open.length ? open.map(x => { const t = PARTY_TYPES[x.type] || {}, n = Object.keys(x.players || {}).length, inRoom = !!(x.players || {})[ME.uid];
     return `<div class="card"><div class="h"><div><b>${t.ic || ''} ${esc(t.n || x.type)}</b> <span class="muted">· 방장 ${esc(x.hostName)} · ${n}명 · ${x.status === 'lobby' ? '모집 중' : x.status === 'play' ? '진행 중' : '끝남'}</span></div>
       <button class="sm ${inRoom ? '' : 'primary'}" onclick="roomJoin('${x.id}')">${inRoom ? '들어가기' : '참가'}</button></div>
       <div class="muted" style="font-size:.8rem">${Object.values(x.players || {}).map(p => esc(p.name)).join(', ')}</div></div>`; }).join('') : '<p class="muted">열린 방이 없어요. 위에서 하나 열어 보세요!</p>'}</div>`;
};
async function roomCreate(type) {
  try {
    const id = await B.add('rooms', { type, host: ME.uid, hostName: myName(), status: 'lobby', players: { [ME.uid]: { name: myName(), at: Date.now() } }, state: {}, at: Date.now() });
    PROOM = id; PROOM_AT = Date.now(); render();
  } catch (e) { toast('방을 만들지 못했어요: ' + (e.code || e.message)); }
}
async function roomJoin(id) {
  const r = roomOf(id); if (!r) return;
  if (!(r.players || {})[ME.uid]) {
    if (r.status === 'play' && r.type !== 'auction') return toast('이미 진행 중인 방이에요. 다음 판에 참가해 주세요');
    await rtx(id, x => { x.players = x.players || {}; if (x.players[ME.uid]) return undefined; x.players[ME.uid] = { name: myName(), at: Date.now() }; return x; });
  }
  PROOM = id; PROOM_AT = Date.now(); render();
}
async function roomLeave() {
  const id = PROOM, r = roomOf(id); PROOM = null; PSECRET = null; if (PSEC_UNSUB) { PSEC_UNSUB(); PSEC_UNSUB = null; }
  if (r) {
    if (r.host === ME.uid && Object.keys(r.players || {}).length <= 1) await B.del('rooms/' + id).catch(() => {});
    else await rtx(id, x => { if (!x.players || !x.players[ME.uid]) return undefined; delete x.players[ME.uid];
      if (x.host === ME.uid) { const nx = Object.entries(x.players)[0]; if (nx) { x.host = nx[0]; x.hostName = nx[1].name; } } return x; });
  }
  render();
}
function roomClose() { if (confirm('방을 닫을까요?')) { B.del('rooms/' + PROOM).catch(() => {}); PROOM = null; render(); } }
function roomView(r) {
  const t = PARTY_TYPES[r.type], host = r.host === ME.uid, ps = Object.entries(r.players || {}), inRoom = !!(r.players || {})[ME.uid];
  const body = !inRoom ? `<p class="muted">이 방에 참가하지 않았어요.</p><button class="primary" onclick="roomJoin('${r.id}')">참가</button>`
    : r.type === 'nunchi' ? nunchiView(r, host) : r.type === 'auction' ? auctionView(r, host) : liarView(r, host);
  return `<div class="panel"><div class="row" style="justify-content:space-between"><h2 style="margin:0">${t.ic} ${t.n}</h2>
    <div class="row" style="flex:0 0 auto">${host ? '<button class="sm danger" onclick="roomClose()">방 닫기</button>' : ''}<button class="sm" onclick="roomLeave()">나가기</button><button class="sm" onclick="PROOM=null;render()">목록</button></div></div>
    <div class="toggles" style="margin:8px 0">${ps.map(([u, p]) => `<span class="chip ptchip ${u === ME.uid ? 'on' : ''}">${pxAva(u)}${u === r.host ? '👑 ' : ''}${esc(p.name)}</span>`).join('')}</div>
    <div class="pxstage">${body}</div></div>`;
}
const needMore = (r, t) => Object.keys(r.players || {}).length < t.min ? `<p class="muted">${t.min}명 이상 모이면 시작할 수 있어요.</p>` : '';

/* ---------- 눈치게임 ---------- */
function nunchiView(r, host) {
  const S = r.state || {}, ps = Object.keys(r.players || {});
  if (r.status === 'lobby') return `<p class="muted">시작하면 3초 뒤부터 1, 2, 3… 차례로 숫자 버튼을 눌러요. 1초 안에 두 사람이 같은 숫자를 누르면 둘 다 탈락, 끝까지 못 누른 사람도 탈락! 살아남으면 +3 은화.</p>
    ${needMore(r, PARTY_TYPES.nunchi)}${host ? `<button class="primary" ${ps.length < 3 ? 'disabled' : ''} onclick="nunchiStart()">시작</button>` : '<p class="muted">방장이 시작하기를 기다려요…</p>'}`;
  const called = (S.calls || []).some(c => c.uid === ME.uid), wait = Date.now() < (S.startAt || 0);
  const log = (S.calls || []).map(c => `<span class="chip">${c.num} · ${esc(c.name)}</span>`).join('');
  if (r.status === 'play') return `<div class="tapzone ${called || wait ? '' : 'go'}" onpointerdown="nunchiCall(${S.n})"><div><div style="font-size:3.4rem;font-weight:800">${wait ? '준비…' : called ? '✓' : S.n + '!'}</div><div>${wait ? '곧 시작해요' : called ? '외쳤어요. 결과를 기다려요' : '눌러서 외치기'}</div></div></div><div style="margin-top:8px">${log}</div>
    ${host ? '<button class="sm" style="margin-top:8px" onclick="nunchiEnd()">끝내기</button>' : ''}`;
  const res = S.res || {}, lose = res.losers || [], me = lose.includes(ME.uid);
  return `<div class="card" style="text-align:center"><div style="font-size:2.4rem">${me ? '💥' : '🎉'}</div><h3>${res.type === 'clash' ? `${res.num}에서 겹쳤다!` : '마지막까지 못 외친 사람이 있어요'}</h3>
    <p>탈락: ${lose.map(u => esc((r.players[u] || {}).name || '?')).join(', ') || '없음'}</p><p class="muted">${me ? '아쉬워요…' : '살아남았어요! +3 은화'}</p></div>
    <div>${log}</div>${host ? '<button class="primary" style="margin-top:8px" onclick="nunchiStart()">한 판 더</button>' : ''}`;
}
function nunchiStart() { rtx(PROOM, r => { if (r.host !== ME.uid) return undefined; r.status = 'play'; r.state = { n: 1, calls: [], startAt: Date.now() + 3000, round: rid(), res: null }; return r; }); setTimeout(() => softRender(), 3100); }
function nunchiCall(k) {
  const r = roomOf(PROOM); if (!r || r.status !== 'play' || Date.now() < (r.state.startAt || 0)) return;
  rtx(PROOM, x => {
    const S = x.state; if (x.status !== 'play' || S.res || S.calls.some(c => c.uid === ME.uid)) return undefined;
    const now = Date.now(), last = S.calls[S.calls.length - 1];
    if (k === S.n) { S.calls.push({ uid: ME.uid, name: myName(), num: k, at: now }); S.n++; }
    else if (last && k === last.num && now - last.at < 1000) { S.calls.push({ uid: ME.uid, name: myName(), num: k, at: now }); S.res = { type: 'clash', num: k, losers: [last.uid, ME.uid] }; }
    else return undefined;
    const all = Object.keys(x.players);
    if (!S.res && S.calls.length >= all.length - 1) S.res = { type: 'last', losers: all.filter(u => !S.calls.some(c => c.uid === u)) };
    if (S.res) x.status = 'done';
    return x;
  });
}
function nunchiEnd() { rtx(PROOM, x => { if (x.status !== 'play') return undefined; const all = Object.keys(x.players); x.state.res = { type: 'last', losers: all.filter(u => !x.state.calls.some(c => c.uid === u)) }; x.status = 'done'; return x; }); }

/* ---------- 은화 경매 ---------- */
let AF = { title: '', desc: '', item: '', start: 5 };
function auctionView(r, host) {
  const S = r.state || {};
  if (r.status === 'lobby') {
    if (!host) return '<p class="muted">방장이 물건을 올리기를 기다려요…</p>';
    const mine = ITEMS.filter(i => i.owner === ME.uid);
    return `<p class="muted">물건을 하나 걸고 경매를 열어요. 마지막 입찰 후 10초 동안 아무도 더 부르지 않으면 낙찰! 낙찰 은화는 방장에게 가요${IS_ADMIN ? ' (KP가 연 경매는 은화가 사라져요)' : ''}.</p>
     <label class="f">내 소지품에서 고르기 (선택)</label><select onchange="AF.item=this.value;const it=ITEMS.find(i=>i.id===this.value);if(it){AF.title=it.name;AF.desc=it.desc||'';render()}"><option value="">직접 적기</option>${mine.map(i => `<option value="${i.id}" ${AF.item === i.id ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</select>
     <label class="f">물건 이름</label><input maxlength="40" value="${esc(AF.title)}" oninput="AF.title=this.value" placeholder="예: 집사의 비밀 레시피">
     <label class="f">설명 (선택)</label><input maxlength="80" value="${esc(AF.desc)}" oninput="AF.desc=this.value">
     <label class="f">시작가</label><input type="number" min="1" value="${AF.start}" oninput="AF.start=+this.value" style="width:120px">
     ${needMore(r, PARTY_TYPES.auction)}<button class="primary" style="margin-top:10px" onclick="auctionStart()">경매 시작</button>`;
  }
  const lot = S.lot || {}, bid = S.bid, left = Math.max(0, Math.ceil(((S.endAt || 0) - Date.now()) / 1000)), seller = S.seller === ME.uid;
  const cur = bid ? bid.amt : (S.min || 1) - 1;
  const head = `<div class="card" style="text-align:center">${lot.img ? `<img src="${lot.img}" style="max-height:140px;border-radius:8px">` : '<div style="font-size:2.6rem">🔨</div>'}<h3 style="margin:6px 0">${esc(lot.title)}</h3>${lot.desc ? `<p class="muted">${esc(lot.desc)}</p>` : ''}
    <div style="font-size:1.6rem;font-weight:800;color:var(--gold2)">${bid ? bid.amt + ' 은화' : '시작가 ' + S.min}</div><div class="muted">${bid ? '최고 입찰: ' + esc(bid.name) : '아직 입찰 없음'}</div></div>`;
  if (r.status === 'play') return head + `<p style="text-align:center"><b id="aucT">⏱ ${left}초</b></p>
    ${seller ? '<p class="muted" style="text-align:center">내가 올린 물건이에요. 지켜봐요!</p>' : `<div class="row" style="justify-content:center">${[1, 5, 10].map(d => `<button onclick="auctionBid(${cur + d})" ${P.coins < cur + d ? 'disabled' : ''}>${cur + d} (+${d})</button>`).join('')}</div>
    <div class="row" style="justify-content:center;margin-top:6px"><input id="aucIn" type="number" style="width:110px" placeholder="직접"><button onclick="auctionBid(+$('#aucIn').value)">입찰</button></div><p class="muted" style="text-align:center">내 은화 ${P.coins}</p>`}`;
  return head + `<p style="text-align:center">${bid ? `🎉 <b>${esc(bid.name)}</b>님이 ${bid.amt}은화에 낙찰!` : '아무도 입찰하지 않았어요.'}</p>${host ? '<button class="primary" onclick="auctionNext()">다음 물건 올리기</button>' : ''}`;
}
function auctionStart() {
  const t = (AF.title || '').trim(); if (!t) return toast('물건 이름을 적어 주세요');
  const it = AF.item && ITEMS.find(i => i.id === AF.item && i.owner === ME.uid);
  rtx(PROOM, x => { if (x.host !== ME.uid) return undefined; x.status = 'play';
    x.state = { lot: { title: t, desc: (AF.desc || '').trim(), img: it ? it.img || '' : '', itemId: it ? it.id : '' }, bid: null, min: Math.max(1, AF.start | 0), endAt: Date.now() + 30000, seller: ME.uid, sellerName: myName(), sellerAdmin: IS_ADMIN, round: rid() }; return x; });
  AF = { title: '', desc: '', item: '', start: 5 };
}
function auctionBid(amt) {
  amt = amt | 0; if (amt <= 0) return; if (P.coins < amt) return toast('은화가 부족해요');
  rtx(PROOM, x => { const S = x.state; if (x.status !== 'play' || Date.now() > S.endAt || S.seller === ME.uid) return undefined;
    const cur = S.bid ? S.bid.amt : S.min - 1; if (amt <= cur) return undefined;
    S.bid = { uid: ME.uid, name: myName(), amt }; S.endAt = Math.max(S.endAt, Date.now() + 10000); return x; })
    .then(ok => { if (ok === false) toast('더 높은 입찰이 먼저 들어왔어요'); });
}
function auctionNext() { rtx(PROOM, x => { if (x.host !== ME.uid) return undefined; x.status = 'lobby'; x.state = {}; return x; }); }
function auctionTick() {
  const r = PROOM && roomOf(PROOM); if (!r || r.type !== 'auction' || r.status !== 'play') return;
  const el = $('#aucT'), left = Math.max(0, Math.ceil(((r.state.endAt || 0) - Date.now()) / 1000));
  if (el) el.textContent = '⏱ ' + left + '초';
  if (Date.now() > r.state.endAt + 300) rtx(PROOM, x => { if (x.status !== 'play' || Date.now() <= x.state.endAt) return undefined; x.status = 'done'; return x; });
}
function auctionSettle(r) {
  const S = r.state || {}; if (r.type !== 'auction' || r.status !== 'done' || !S.round || paidRound(S.round)) return;
  const b = S.bid;
  if (b && b.uid === ME.uid) { P.coins = Math.max(0, P.coins - b.amt); markPaid(S.round); saveP(); toast(`🔨 「${S.lot.title}」 낙찰! -${b.amt} 은화`); }
  else if (S.seller === ME.uid) {
    markPaid(S.round);
    if (b) { if (!S.sellerAdmin) { P.coins += b.amt; P.earned += b.amt; }
      if (S.lot.itemId) { const w = userOf(b.uid); B.update('items/' + S.lot.itemId, { owner: b.uid, ownerName: w ? uname(w) : b.name, fromName: PROF.name, seen: false }).catch(() => {}); }
      toast(`🔨 ${b.name}님에게 팔렸어요${S.sellerAdmin ? '' : ' +' + b.amt + ' 은화'}`); }
    saveP();
  }
}

/* ---------- 라이어 게임 ---------- */
let LF = { cat: '저택' };
function liarView(r, host) {
  const S = r.state || {}, ps = r.players || {}, order = S.order || [];
  if (r.status === 'lobby') return `<p class="muted">라이어 한 명만 제시어를 몰라요. 차례대로 제시어를 한 줄로 설명하고, 투표로 라이어를 찾아요. 라이어가 지목돼도 제시어를 맞히면 라이어 승리!</p>
    ${host ? `<label class="f">주제</label><div class="toggles">${Object.keys(LIAR_WORDS).map(c => `<button class="sm ${LF.cat === c ? 'on' : ''}" onclick="LF.cat='${c}';render()">${c}</button>`).join('')}</div>${needMore(r, PARTY_TYPES.liar)}<button class="primary" style="margin-top:10px" ${Object.keys(ps).length < 3 ? 'disabled' : ''} onclick="liarStart()">시작</button>` : '<p class="muted">방장이 시작하기를 기다려요…</p>'}`;
  const sec = PSECRET && PSECRET.round === S.round ? PSECRET : null;
  const card = `<div class="card" style="text-align:center"><div class="muted">주제: ${esc(S.cat)}</div>${sec ? (sec.word ? `<div style="font-size:1.6rem;font-weight:800;color:var(--gold2)">${esc(sec.word)}</div>` : '<div style="font-size:1.4rem;font-weight:800;color:var(--wine2)">🤥 당신은 라이어!</div><div class="muted">들키지 않게 설명해요</div>') : '<div class="muted">제시어를 받는 중…</div>'}</div>`;
  const hints = (S.hints || []).map(h => `<div class="note"><div class="m"><span>${esc(h.name)}</span></div>${esc(h.text)}</div>`).join('');
  let act = '';
  if (r.status === 'play' && S.phase === 'hint') {
    const cur = order[S.turn];
    act = cur === ME.uid ? `<div class="row" style="flex-wrap:nowrap"><input id="lhint" maxlength="60" placeholder="제시어를 한 줄로 설명" onkeydown="if(event.key==='Enter')liarHint()"><button class="primary" onclick="liarHint()">말하기</button></div>` : `<p class="muted">${esc((ps[cur] || {}).name || '')}의 차례예요…</p>`;
  } else if (r.status === 'play' && S.phase === 'vote') {
    const my = (S.votes || {})[ME.uid];
    act = `<h3>라이어는 누구일까요? (${Object.keys(S.votes || {}).length}/${order.length})</h3><div class="toggles">${order.filter(u => u !== ME.uid).map(u => `<button class="${my === u ? 'on' : ''}" onclick="liarVote('${u}')">${esc((ps[u] || {}).name)}</button>`).join('')}</div>`;
  } else if (r.status === 'play' && S.phase === 'guess') {
    act = S.accused === ME.uid && sec && !sec.word ? `<p>들켰어요! 하지만 제시어를 맞히면 역전승이에요.</p><div class="row" style="flex-wrap:nowrap"><input id="lguess" maxlength="20" placeholder="제시어는?"><button class="primary" onclick="liarGuess()">정답!</button></div>`
      : `<p class="muted">${esc((ps[S.accused] || {}).name || '')}님이 지목됐어요. 제시어를 맞히는 중…</p>`;
  } else if (r.status === 'play') act = '<p class="muted">결과를 계산하는 중…</p>';
  else if (r.status === 'done' && S.result) {
    const R = S.result, liarName = esc((ps[R.liar] || {}).name || '?');
    act = `<div class="card" style="text-align:center"><div style="font-size:2.4rem">${R.liarWin ? '🤥' : '🎉'}</div><h3>${R.liarWin ? '라이어 승리!' : '시민 승리!'}</h3><p>라이어는 <b>${liarName}</b>, 제시어는 <b>${esc(R.word)}</b></p>
      <p class="muted">${R.caught ? (R.guess ? `라이어의 추측: "${esc(R.guess)}" ${R.guessed ? '→ 정답!' : '→ 땡!'}` : '') : '라이어를 찾지 못했어요'}</p></div>${host ? '<button class="primary" onclick="liarAgain()">한 판 더</button>' : ''}`;
  }
  return card + (hints ? `<h3>설명</h3>${hints}` : '') + act;
}
async function liarStart() {
  const r = roomOf(PROOM); if (!r) return; const ps = Object.keys(r.players); if (ps.length < 3) return;
  const words = LIAR_WORDS[LF.cat], word = words[rint(words.length)], liar = ps[rint(ps.length)], round = rid();
  try {
    await Promise.all(ps.map(u => B.set('roomSecrets/' + r.id + '_' + u, { uid: u, room: r.id, round, cat: LF.cat, word: u === liar ? null : word })));
    await B.set('roomSecrets/' + r.id + '_answer', { uid: ME.uid, room: r.id, round, liar, word });
  } catch (e) { return toast('시작 실패: ' + (e.code || e.message)); }
  PANSWER = { round, liar, word };
  rtx(r.id, x => { if (x.host !== ME.uid) return undefined; x.status = 'play'; x.state = { phase: 'hint', cat: LF.cat, order: shuffle(Object.keys(x.players)), turn: 0, hints: [], votes: {}, round, accused: null, guess: null, result: null }; return x; });
}
function liarHint() {
  const t = ($('#lhint') || {}).value; if (!t || !t.trim()) return;
  rtx(PROOM, x => { const S = x.state; if (S.phase !== 'hint' || S.order[S.turn] !== ME.uid) return undefined; S.hints.push({ uid: ME.uid, name: myName(), text: t.trim() }); S.turn++; if (S.turn >= S.order.length) S.phase = 'vote'; return x; });
}
function liarVote(u) { rtx(PROOM, x => { const S = x.state; if (S.phase !== 'vote') return undefined; S.votes[ME.uid] = u; if (Object.keys(S.votes).length >= S.order.length) S.phase = 'tally'; return x; }); }
function liarGuess() { const g = ($('#lguess') || {}).value; if (!g || !g.trim()) return; rtx(PROOM, x => { if (x.state.phase !== 'guess' || x.state.accused !== ME.uid) return undefined; x.state.guess = g.trim(); x.state.phase = 'judge'; return x; }); }
function liarAgain() { rtx(PROOM, x => { if (x.host !== ME.uid) return undefined; x.status = 'lobby'; x.state = {}; return x; }); }
async function liarHost(r) {
  if (r.host !== ME.uid || r.type !== 'liar' || r.status !== 'play') return;
  const S = r.state; if (S.phase !== 'tally' && S.phase !== 'judge') return;
  let A = PANSWER && PANSWER.round === S.round ? PANSWER : null;
  if (!A) { const d = await B.get('roomSecrets/' + r.id + '_answer').catch(() => null); if (d && d.round === S.round) A = PANSWER = d; }
  if (!A) return;
  if (S.phase === 'tally') {
    const cnt = {}; Object.values(S.votes).forEach(u => cnt[u] = (cnt[u] || 0) + 1);
    const max = Math.max(...Object.values(cnt)), top = Object.keys(cnt).filter(u => cnt[u] === max);
    const accused = top.length === 1 ? top[0] : null;
    rtx(r.id, x => { if (x.state.phase !== 'tally') return undefined;
      if (accused === A.liar) { x.state.phase = 'guess'; x.state.accused = accused; }
      else { x.status = 'done'; x.state.result = { liar: A.liar, word: A.word, caught: false, liarWin: true }; }
      return x; });
  } else {
    const norm = s => String(s || '').replace(/\s/g, '').toLowerCase(), ok = norm(S.guess) === norm(A.word);
    rtx(r.id, x => { if (x.state.phase !== 'judge') return undefined; x.status = 'done'; x.state.result = { liar: A.liar, word: A.word, caught: true, guess: x.state.guess, guessed: ok, liarWin: ok }; return x; });
  }
}
function liarSettle(r) {
  const S = r.state || {}, R = S.result; if (r.type !== 'liar' || r.status !== 'done' || !R || paidRound(S.round) || !(r.players || {})[ME.uid]) return;
  markPaid(S.round);
  if (R.liarWin && R.liar === ME.uid) { earn(8); toast('🤥 라이어 승리! +8 은화'); }
  else if (!R.liarWin && R.liar !== ME.uid) { earn(4); toast('🎉 시민 승리! +4 은화'); }
  else saveP();
}
function nunchiSettle(r) {
  const S = r.state || {}; if (r.type !== 'nunchi' || r.status !== 'done' || !S.res || paidRound(S.round) || !(r.players || {})[ME.uid]) return;
  markPaid(S.round); if (!(S.res.losers || []).includes(ME.uid)) earn(3); else saveP();
}

/* ---------- 구독 ---------- */
function watchSecret() {
  const r = PROOM && roomOf(PROOM);
  const want = r && r.type === 'liar' && r.status !== 'lobby' ? 'roomSecrets/' + r.id + '_' + ME.uid : null;
  if (watchSecret.cur === want) return;
  if (PSEC_UNSUB) { PSEC_UNSUB(); PSEC_UNSUB = null; } PSECRET = null; watchSecret.cur = want;
  if (want) PSEC_UNSUB = B.onDoc(want, d => { PSECRET = d; if (tab === 'party') softRender(); });
}
function partyOnAuth(u) {
  PROOMS = []; PROOM = null; PSECRET = null; PANSWER = null; watchSecret.cur = null;
  if (PSEC_UNSUB) { PSEC_UNSUB(); PSEC_UNSUB = null; }
  clearInterval(PTIMER); if (!u) return;
  unsubs.push(B.onCol('rooms', l => {
    PROOMS = l.sort((a, b) => (b.at || 0) - (a.at || 0));
    PROOMS.forEach(r => { if (!(r.players || {})[ME.uid]) return; auctionSettle(r); liarSettle(r); nunchiSettle(r); liarHost(r); });
    watchSecret();
    if (tab === 'party') softRender();
  }));
  unsubs.push(() => { if (PSEC_UNSUB) { PSEC_UNSUB(); PSEC_UNSUB = null; } });
  PTIMER = setInterval(() => { if (tab === 'party') auctionTick(); }, 500);
}
if (typeof ME !== 'undefined' && ME) partyOnAuth(ME);
