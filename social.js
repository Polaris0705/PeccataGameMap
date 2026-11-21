/* ================= 세션 밖 보조 기능 =================
   📅 세션 일정·참석 응답·알림      sessions/{id}      { title, at, memo, by, rsvp:{uid:'y'|'n'|'?'}, sent:{h1,st} }
   🗓 일정 조율(체크 = 안 되는 날)   availMonths/{YYYY-MM} { y, m, notice, prenote }
                                    availRows/{YYYY-MM_코드} { ym, code, x:[날], q:[날] }   x = 안 됨, q = 애매
   🧭 KP 대시보드
   🎁 선물하기                      giftbox/{받는uid}/in/{id} { from, fromName, kind, amt, furn, itemName, msg, at, got }
   📰 저택 소식지                    newsReq/{id} (기고, KP만 읽음) → news/{id} { title, body, img, byName, at, reacts, cmts, reads }
   📔 캐릭터 일기                    diaries/{id} { uid, title, segs:[{t}|{h,n}], at }  ·  diarySec/{id} { owner, who:[uid], parts:[] }
====================================================== */
let SESS = [], AVM = [], AVR = [], NEWS = [], NEWSREQ = [], DIARIES = [], GIFTS_IN = [];
const WD = ['일', '월', '화', '수', '목', '금', '토'];
const pad2 = n => String(n).padStart(2, '0');
const dfmt = ms => { const d = new Date(ms); return `${d.getMonth() + 1}/${d.getDate()} (${WD[d.getDay()]}) ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const leftTxt = ms => { const s = Math.round((ms - Date.now()) / 1000); if (s <= 0) return '시작'; const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60); return d ? `${d}일 ${h}시간 뒤` : h ? `${h}시간 ${m}분 뒤` : `${Math.max(1, m)}분 뒤`; };
function sPing(to, title, body, tag) { to = [...new Set(to || [])].filter(u => u && u !== ME.uid); if (!to.length) return; B.add('pings', { from: ME.uid, to, title, body: String(body || '').slice(0, 140), tag: tag || 'info', at: Date.now() }).catch(() => {}); }
const allUids = () => USERS.map(u => u.id);
const hoName = c => c === 'KP' ? 'KP' : cname(c);

function socialOnAuth(sub) {
  sub(B.onCol('sessions', l => { SESS = l.sort((a, b) => a.at - b.at); sessTick(); softRender(); }));
  sub(B.onCol('availMonths', l => { AVM = l.sort((a, b) => a.id.localeCompare(b.id)); softRender(); }));
  sub(B.onCol('availRows', l => { AVR = l; softRender(); }));
  sub(B.onCol('news', l => { NEWS = l.sort((a, b) => (b.at || 0) - (a.at || 0)); softRender(); }));
  if (IS_ADMIN) sub(B.onCol('newsReq', l => { NEWSREQ = l.sort((a, b) => (a.at || 0) - (b.at || 0)); softRender(); }));
  sub(B.onCol('diaries', l => { DIARIES = l.sort((a, b) => (b.at || 0) - (a.at || 0)); if (document.getElementById('diaryBox')) diaryListRefresh(); }));
  sub(B.onCol('giftbox/' + ME.uid + '/in', l => { GIFTS_IN = l; giftSync(); }));
}

/* ================= 📅 세션 일정 ================= */
const nextSess = () => SESS.find(s => s.at > Date.now() - 3 * 3600e3);
function sessCard(s, big) {
  const r = s.rsvp || {}, my = r[ME.uid], cnt = k => Object.values(r).filter(v => v === k).length, who = k => Object.entries(r).filter(([, v]) => v === k).map(([u]) => esc(uname(userOf(u)))).join(', ');
  const past = s.at < Date.now() - 3 * 3600e3;
  return `<div class="card" style="${big ? 'border-color:var(--gold)' : ''}"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b style="font-size:${big ? '1.05rem' : '.95rem'}">📅 ${esc(s.title || '세션')}</b>
    <div style="color:var(--gold2)">${dfmt(s.at)} <span class="muted">· ${past ? '지난 세션' : leftTxt(s.at)}</span></div>${s.memo ? `<div class="muted" style="font-size:.85rem;white-space:pre-wrap">${esc(s.memo)}</div>` : ''}</div>
    ${IS_ADMIN ? `<div class="row" style="flex:0 0 auto;gap:4px"><button class="sm" onclick="sessEdit('${s.id}')">✏</button><button class="sm danger" onclick="sessDel('${s.id}')">🗑</button></div>` : ''}</div>
    ${past ? '' : `<div class="row" style="gap:4px;margin-top:6px">${[['y', '👍 가능'], ['q', '🤔 미정'], ['n', '🙅 불가']].map(([k, t]) => `<button class="sm ${my === k ? 'primary' : ''}" onclick="sessRsvp('${s.id}','${k}')">${t}</button>`).join('')}</div>`}
    <div class="muted" style="font-size:.8rem;margin-top:4px">👍 ${cnt('y')}${cnt('y') ? ` (${who('y')})` : ''} · 🤔 ${cnt('q')}${cnt('q') ? ` (${who('q')})` : ''} · 🙅 ${cnt('n')}${cnt('n') ? ` (${who('n')})` : ''}</div></div>`;
}
async function sessRsvp(id, k) { const s = SESS.find(x => x.id === id); if (!s) return; const r = Object.assign({}, s.rsvp || {}); r[ME.uid] = r[ME.uid] === k ? null : k; if (!r[ME.uid]) delete r[ME.uid];
  try { await B.update('sessions/' + id, { rsvp: r }); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
function sessEdit(id) {
  const s = SESS.find(x => x.id === id) || {}, d = new Date(s.at || Date.now() + 864e5); if (!s.at) { d.setHours(20, 0, 0, 0); }
  const dv = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`, tv = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  modal(`<h2 style="color:var(--gold2);margin-top:0">📅 ${id ? '세션 고치기' : '세션 일정 추가'}</h2>
    <label class="f">제목</label><input id="ssT" value="${esc(s.title || '')}" placeholder="예: 2부 세션">
    <div class="row" style="gap:6px"><div style="flex:1"><label class="f">날짜</label><input id="ssD" type="date" value="${dv}"></div><div style="flex:1"><label class="f">시간</label><input id="ssH" type="time" value="${tv}"></div></div>
    <label class="f">메모 (선택)</label><textarea id="ssM" rows="3" placeholder="장소·준비물 등">${esc(s.memo || '')}</textarea>
    <p class="muted" style="font-size:.8rem">1시간 전과 시작 시간에 모두에게 알림이 감.</p>
    <div class="row" style="margin-top:10px"><button onclick="closeModal()">취소</button><button class="primary" onclick="sessSave('${id || ''}')">저장</button></div>`);
}
async function sessSave(id) {
  const t = $('#ssT').value.trim() || '세션', dv = $('#ssD').value, tv = $('#ssH').value; if (!dv || !tv) return toast('날짜와 시간을 넣기');
  const at = new Date(dv + 'T' + tv).getTime(); if (!at) return toast('날짜를 확인하기');
  const old = SESS.find(x => x.id === id), doc = { title: t, at, memo: $('#ssM').value.trim(), by: PROF.name || 'KP' };
  if (!old || old.at !== at) doc.sent = { h1: false, st: false };
  try { if (id) await B.update('sessions/' + id, doc); else { await B.add('sessions', Object.assign(doc, { rsvp: {} })); sPing(allUids(), '📅 세션 일정이 잡힘', `${t} · ${dfmt(at)}`, 'sess'); }
    closeModal(); toast('저장 완료'); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function sessDel(id) { if (!confirm('이 세션 일정을 지울까요?')) return; try { await B.del('sessions/' + id); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
/* 앱을 켜 두면 앱 안에서도 알려 줌 (푸시는 서버가 보냄) */
function sessTick() {
  const now = Date.now(); SESS.forEach(s => { [['h1', s.at - 3600e3, '⏰ 1시간 뒤 세션'], ['st', s.at, '🎲 세션 시작 시간']].forEach(([k, t, msg]) => {
    const key = 'peccata_sess_' + s.id + '_' + k + '_' + s.at; if (now < t || now - t > 15 * 60e3) return; try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (e) { return; }
    sfx('ok'); modal(`<h2 style="color:var(--gold2);margin-top:0">${msg}</h2><p><b>${esc(s.title || '세션')}</b><br>${dfmt(s.at)}</p>${s.memo ? `<p class="muted" style="white-space:pre-wrap">${esc(s.memo)}</p>` : ''}<button class="primary" style="width:100%" onclick="closeModal()">확인</button>`); }); });
}
setInterval(() => { try { if (ME) sessTick(); } catch (e) {} }, 30000);

/* ================= 🗓 일정 조율 ================= */
let AV_YM = '';
const avRowsOf = ym => ['KP', ...HO_CODES.filter(c => USERS.some(u => u.ho === c))];
const avRow = (ym, code) => AVR.find(r => r.id === ym + '_' + code) || { x: [], q: [] };
const canEditRow = code => IS_ADMIN || myHo() === code;
function avGrid(ym) {
  const mo = AVM.find(m => m.id === ym); if (!mo) return ''; const [y, m] = ym.split('-').map(Number), days = new Date(y, m, 0).getDate(), rows = avRowsOf(ym);
  const today = new Date(), isThis = today.getFullYear() === y && today.getMonth() + 1 === m;
  const sessDays = new Set(SESS.filter(s => { const d = new Date(s.at); return d.getFullYear() === y && d.getMonth() + 1 === m; }).map(s => new Date(s.at).getDate()));
  const cell = (code, d) => { const r = avRow(ym, code), x = (r.x || []).includes(d), q = (r.q || []).includes(d), mine = canEditRow(code);
    return `<td class="avc ${x ? 'x' : q ? 'q' : ''} ${mine ? 'me' : ''}" ${mine ? `onclick="calAvTap('${ym}','${code}',${d})"` : ''}>${x ? '✕' : q ? '△' : ''}</td>`; };
  const sum = d => { const nx = rows.filter(c => (avRow(ym, c).x || []).includes(d)).length, nq = rows.filter(c => (avRow(ym, c).q || []).includes(d)).length; return nx ? `<td class="avs" title="안 되는 사람 ${nx}">${nx}</td>` : `<td class="avs ok" title="${nq ? '애매 ' + nq : '모두 가능'}">${nq ? '○' : '●'}</td>`; };
  return `<div class="avwrap"><table class="avt"><tr><th class="avn"></th>${Array.from({ length: days }, (_, i) => `<th class="${isThis && today.getDate() === i + 1 ? 'today' : ''}">${i + 1}${sessDays.has(i + 1) ? '<br>📅' : ''}</th>`).join('')}</tr>
    <tr><th class="avn"></th>${Array.from({ length: days }, (_, i) => { const w = new Date(y, m - 1, i + 1).getDay(); return `<th class="wd${w === 0 ? ' sun' : w === 6 ? ' sat' : ''}">${WD[w]}</th>`; }).join('')}</tr>
    ${rows.map(c => `<tr class="${canEditRow(c) && (c !== 'KP' || !PROF.ho) ? 'mine' : ''}"><th class="avn">${esc(hoName(c))}</th>${Array.from({ length: days }, (_, i) => cell(c, i + 1)).join('')}</tr>`).join('')}
    <tr><th class="avn">모두</th>${Array.from({ length: days }, (_, i) => sum(i + 1)).join('')}</tr></table></div>`;
}
const AV_CSS = `<style>.avwrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:6px -4px 0}.avt{border-collapse:collapse;font-size:.78rem}.avt th,.avt td{border:1px solid var(--line);min-width:24px;height:26px;text-align:center;padding:0}
  .avt th.avn{position:sticky;left:0;background:var(--panel);z-index:1;min-width:70px;max-width:90px;padding:0 4px;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.avt th.today{color:var(--gold2);text-decoration:underline}
  .avt .wd{font-weight:normal;color:var(--muted)}.avt .sun{color:#e07070}.avt .sat{color:#70a0e0}.avt td.me{cursor:pointer;background:#ffffff08}.avt td.x{background:#55505a;color:#ddd}.avt td.q{background:#6a5a2a;color:#ffe08a}
  .avt tr.mine th.avn{color:var(--gold2)}.avt td.avs{font-weight:bold;color:#e07070}.avt td.avs.ok{color:#7ad08a}</style>`;
async function calAvTap(ym, code, d) {
  if (!canEditRow(code)) return; const r = avRow(ym, code), x = new Set(r.x || []), q = new Set(r.q || []);
  if (!x.has(d) && !q.has(d)) x.add(d); else if (x.has(d)) { x.delete(d); q.add(d); } else q.delete(d);
  const doc = { ym, code, x: [...x].sort((a, b) => a - b), q: [...q].sort((a, b) => a - b), at: Date.now() };
  const i = AVR.findIndex(a => a.id === ym + '_' + code); if (i >= 0) AVR[i] = Object.assign({}, AVR[i], doc); else AVR.push(Object.assign({ id: ym + '_' + code }, doc)); softRender();
  try { await B.set('availRows/' + ym + '_' + code, doc); } catch (e) { toast('저장 실패: ' + (e.code || e.message)); }
}
function avOpenAsk() {
  const d = new Date(); const opts = Array.from({ length: 6 }, (_, i) => { const t = new Date(d.getFullYear(), d.getMonth() + i, 1); return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}`; }).filter(ym => !AVM.some(m => m.id === ym));
  modal(`<h2 style="color:var(--gold2);margin-top:0">🗓 조율할 달 열기</h2><select id="avYm" style="width:100%">${opts.map(o => `<option>${o}</option>`).join('')}</select>
    <label class="f">KP 공지 (선택)</label><input id="avNo" placeholder="예: 1부 엔딩 이달에 보고 싶음">
    <div class="row" style="margin-top:10px"><button onclick="closeModal()">취소</button><button class="primary" onclick="avOpen()">열기</button></div>`);
}
async function avOpen() { const ym = $('#avYm').value; if (!ym) return; const [y, m] = ym.split('-').map(Number);
  try { await B.set('availMonths/' + ym, { y, m, notice: $('#avNo').value.trim(), prenote: '', at: Date.now() }); AV_YM = ym; closeModal(); sPing(allUids(), '🗓 일정 조율이 열림', `${m}월 — 안 되는 날을 체크하기`, 'avail'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
function avNoteEdit(ym, k) { const mo = AVM.find(m => m.id === ym); const v = prompt(k === 'notice' ? 'KP 공지' : 'KP 일정 특이사항 (프리노트)', mo[k] || ''); if (v === null) return; B.update('availMonths/' + ym, { [k]: v.trim() }).catch(e => toast('실패: ' + (e.code || e.message))); }
async function avClose(ym) { if (!confirm(`${ym} 조율표를 지울까요? 체크한 내용도 사라짐.`)) return; try { await B.del('availMonths/' + ym); await Promise.all(AVR.filter(r => r.ym === ym).map(r => B.del('availRows/' + r.id))); AV_YM = ''; } catch (e) { toast('실패: ' + (e.code || e.message)); } }

VIEWS.cal = () => {
  const up = SESS.filter(s => s.at > Date.now() - 3 * 3600e3), past = SESS.filter(s => s.at <= Date.now() - 3 * 3600e3).reverse();
  if (!AV_YM || !AVM.some(m => m.id === AV_YM)) { const cur = new Date(), ym = `${cur.getFullYear()}-${pad2(cur.getMonth() + 1)}`; AV_YM = (AVM.find(m => m.id >= ym) || AVM[AVM.length - 1] || {}).id || ''; }
  const mo = AVM.find(m => m.id === AV_YM);
  return `${AV_CSS}<div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">📅 세션 일정</h2>${IS_ADMIN ? '<button class="primary" style="flex:0 0 auto" onclick="sessEdit()">＋ 일정</button>' : ''}</div>
    ${up.length ? up.map((s, i) => sessCard(s, i === 0)).join('') : '<p class="muted">잡힌 세션이 없음.</p>'}
    ${past.length ? `<details><summary class="muted">지난 세션 (${past.length})</summary>${past.map(s => sessCard(s)).join('')}</details>` : ''}</div>
   <div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">🗓 일정 조율</h2>${IS_ADMIN ? '<button style="flex:0 0 auto" onclick="avOpenAsk()">＋ 달 열기</button>' : ''}</div>
    <p class="muted" style="margin:4px 0;font-size:.82rem">내 줄의 칸을 누를 때마다 <b>✕ 안 됨 → △ 애매 → 비움</b>. 맨 아래 ● 는 모두 되는 날, ○ 는 애매한 사람이 있는 날.</p>
    ${AVM.length ? `<div class="toggles">${AVM.map(m => `<span class="chip ${m.id === AV_YM ? 'on' : ''}" onclick="AV_YM='${m.id}';render()">${m.m}월${m.notice ? ' <b style="color:var(--wine2)">!</b>' : ''}</span>`).join('')}</div>` : '<p class="muted">열린 달 없음' + '</p>'}
    ${mo ? `${mo.notice || IS_ADMIN ? `<div class="card" style="margin-top:6px;${mo.notice ? 'border-color:var(--wine2)' : ''}"><b>${mo.notice ? '❗ ' : ''}KP 공지</b> ${IS_ADMIN ? `<button class="sm" onclick="avNoteEdit('${mo.id}','notice')">✏</button>` : ''}<div style="white-space:pre-wrap">${esc(mo.notice || '') || '<span class="muted">없음</span>'}</div></div>` : ''}
      ${avGrid(mo.id)}
      <div class="card" style="margin-top:6px"><b>📝 KP 일정 특이사항</b> ${IS_ADMIN ? `<button class="sm" onclick="avNoteEdit('${mo.id}','prenote')">✏</button>` : ''}<div style="white-space:pre-wrap">${esc(mo.prenote || '') || '<span class="muted">없음</span>'}</div></div>
      ${IS_ADMIN ? `<button class="sm danger" style="margin-top:6px" onclick="avClose('${mo.id}')">이 달 조율표 지우기</button>` : ''}` : ''}</div>`;
};

/* ================= 🧭 KP 대시보드 ================= */
VIEWS.kdash = () => {
  if (!IS_ADMIN) return '<div class="panel">KP만 볼 수 있음.</div>';
  const on = USERS.filter(u => isOnline(u)), off = USERS.filter(u => !isOnline(u)).sort((a, b) => (b.seen || 0) - (a.seen || 0));
  const unack = CALLS.filter(c => c.msg && !c.ack), pend = BOOKINGS.filter(b => b.status === 'pending'), creq = BOOKINGS.filter(b => b.status === 'approved' && b.cancelReq), ns = nextSess();
  const ago = t => { if (!t) return '기록 없음'; const m = Math.round((Date.now() - t) / 60000); return m < 60 ? `${m}분 전` : m < 1440 ? `${Math.round(m / 60)}시간 전` : `${Math.round(m / 1440)}일 전`; };
  return `<div class="grid g2">
   <div class="panel" style="margin:0"><h2>🟢 접속 (${on.length})</h2>${on.map(u => `<div>🟢 ${esc(uname(u))} <span class="muted">${u.ho ? esc(cname(u.ho)) : ''}</span></div>`).join('') || '<p class="muted">지금 접속한 사람이 없음.</p>'}
     ${off.length ? `<details style="margin-top:6px"><summary class="muted">접속 안 함 (${off.length})</summary>${off.map(u => `<div class="muted">⚪ ${esc(uname(u))} · ${ago(u.seen)}${u.push === false ? ' 🔕' : ''}</div>`).join('')}</details>` : ''}</div>
   <div class="panel" style="margin:0"><h2>📞 미응답 호출 (${unack.length})</h2>${unack.map(c => { const u = userOf(c.id); return `<div style="margin:4px 0">${esc(uname(u))} — ${callState(c.id)}</div>`; }).join('') || '<p class="muted">없음.</p>'}${unack.length ? '<button class="sm" onclick="go(\'kqueue\')">호출·대기열로</button>' : ''}</div>
   <div class="panel" style="margin:0"><h2>🗝 승인 대기 예약 (${pend.length})</h2>${creq.length ? `<p style="color:var(--gold2);margin:0 0 4px">취소 요청 ${creq.length}건</p>` : ''}${pend.slice(0, 5).map(b => `<div>• ${esc(dayName(b.day))} · ${esc(b.place)} <span class="muted">${esc((b.parts || []).map(cname).join(', '))}</span></div>`).join('') || '<p class="muted">없음.</p>'}<button class="sm" style="margin-top:4px" onclick="go('kbook')">예약 관리로</button>
     ${NEWSREQ.length ? `<p style="margin:8px 0 0">📰 소식지 기고 대기 <b>${NEWSREQ.length}</b> <button class="sm" onclick="go('news')">보기</button></p>` : ''}</div>
   <div class="panel" style="margin:0"><h2>📅 다음 일정</h2>${ns ? sessCard(ns, true) : '<p class="muted">잡힌 세션이 없음.</p>'}<button class="sm" onclick="go('cal')">일정으로</button></div></div>`;
};

/* ================= 🎁 선물하기 ================= */
let GF = null;
function giftOpen(to) { GF = { to, kind: 'coin', amt: 10, inv: '', item: '', msg: '' }; giftForm(); }
function giftForm() {
  const u = userOf(GF.to), room = myRoom(), myItems = ITEMS.filter(i => i.owner === ME.uid), tab = (k, t) => `<span class="chip ${GF.kind === k ? 'on' : ''}" onclick="giftRead();GF.kind='${k}';giftForm()">${t}</span>`;
  const wears = typeof avOwns === 'function' ? avGiftables() : [];
  const body = GF.kind === 'wear' ? (wears.length ? `<label class="f">옷</label><div class="toggles">${wears.map(w => `<span class="chip ${GF.wear === w.id ? 'on' : ''}" onclick="giftRead();GF.wear='${w.id}';giftForm()">${esc(w.name)}</span>`).join('')}</div><p class="muted" style="font-size:.78rem">보내면 옷장에서 제외 (직접 만든 옷은 복제품)</p>` : '<p class="muted">보낼 옷 없음 (기본 옷 불가)</p>') : GF.kind === 'coin' ? `<label class="f">은화 (가진 은화 ${P.coins})</label><input id="gfAmt" type="number" min="1" max="${P.coins}" value="${GF.amt}">`
    : GF.kind === 'furn' ? (room.invc.length ? `<label class="f">보관함 가구</label><div class="toggles" style="max-height:200px;overflow:auto">${room.invc.filter(x => FURN[x.k]).map(x => `<span class="chip ${GF.inv === x.id ? 'on' : ''}" onclick="giftRead();GF.inv='${x.id}';giftForm()">${fprev(x.k, x.col, 0, x.dir)} ${esc(FURN[x.k].name)}</span>`).join('')}</div><p class="muted" style="font-size:.78rem">배치된 가구는 보관함에 넣은 뒤 가능</p>` : '<p class="muted">보관함이 비어 있음.</p>')
    : GF.kind === 'item' ? (myItems.length ? `<label class="f">소지품</label><div class="toggles">${myItems.map(i => `<span class="chip ${GF.item === i.id ? 'on' : ''}" onclick="giftRead();GF.item='${i.id}';giftForm()">${esc(i.name)}</span>`).join('')}</div>` : '<p class="muted">가진 물건이 없음.</p>') : '';
  modal(`<h2 style="color:var(--gold2);margin-top:0">🎁 ${esc(uname(u))}에게 선물</h2><div class="toggles">${tab('coin', '🪙 은화')}${tab('furn', '🪑 가구')}${tab('item', '🎒 소지품')}${typeof avOn === 'function' && avOn() ? tab('wear', '🧥 옷') : ''}${tab('card', '💌 카드만')}</div>${body}
    <label class="f">메시지 카드 (선택)</label><textarea id="gfMsg" rows="3" maxlength="200" placeholder="한마디 적어 보기">${esc(GF.msg)}</textarea>
    <div class="row" style="margin-top:10px"><button onclick="closeModal()">취소</button><button class="primary" onclick="giftSend()">보내기</button></div>`);
  document.querySelectorAll('#mbox canvas.fprev').forEach(c => { c.style.imageRendering = 'pixelated'; paintPreview(c); });
}
function giftRead() { const a = $('#gfAmt'), m = $('#gfMsg'); if (a) GF.amt = Math.max(1, parseInt(a.value) || 1); if (m) GF.msg = m.value; }
async function giftSend() {
  giftRead(); const g = { from: ME.uid, fromName: PROF.name || '', kind: GF.kind, msg: GF.msg.trim().slice(0, 200), at: Date.now(), got: false }, path = 'giftbox/' + GF.to + '/in', room = myRoom();
  try {
    if (GF.kind === 'coin') { if (P.coins < GF.amt) return toast('은화가 부족'); g.amt = GF.amt; await B.add(path, g); LOG_W = 'gift'; P.coins -= GF.amt; logAct(-GF.amt); LOG_W = null; saveP(); }
    else if (GF.kind === 'furn') { const x = room.invc.find(v => v.id === GF.inv); if (!x) return toast('보낼 가구를 고르기'); g.furn = { k: x.k, col: x.col || null, rc: x.rc || 0, dir: x.dir || 0 }; g.name = FURN[x.k].name; await B.add(path, clean(g)); room.invc = room.invc.filter(v => v !== x); saveP(); }
    else if (GF.kind === 'item') { const it = ITEMS.find(i => i.id === GF.item); if (!it) return toast('보낼 물건을 고르기'); const u = userOf(GF.to); await B.update('items/' + it.id, { owner: GF.to, ownerName: uname(u), fromName: PROF.name, seen: false }); g.name = it.name; await B.add(path, g); }
    else if (GF.kind === 'wear') { const w = avGiftables().find(x => x.id === GF.wear); if (!w) return toast('보낼 옷을 고르기'); g.wear = w.id; g.name = w.name; await B.add(path, g); if (!w.id.startsWith('w:') || w.bought) { P.wardrobe = (P.wardrobe || []).filter(x => x !== w.key); saveP(); } }
    else { if (!g.msg) return toast('카드에 한마디 적기'); await B.add(path, g); }
    sfx('ok'); closeModal(); toast('선물을 보냄!'); sPing([GF.to], `🎁 ${PROF.name}의 선물`, g.msg || (g.kind === 'coin' ? `은화 ${g.amt}` : g.name || '메시지 카드'), 'gift');
  } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
let GIFT_BUSY = false;
async function giftSync() {
  if (!P || GIFT_BUSY) return; const nw = GIFTS_IN.filter(g => !g.got); if (!nw.length) return; GIFT_BUSY = true;
  try { P.giftDone = P.giftDone || []; const room = myRoom(); let ch = false, shown = [];
    for (const g of nw) { if (!P.giftDone.includes(g.id)) { P.giftDone.push(g.id); ch = true;
        if (g.kind === 'coin') { LOG_W = 'gift'; P.coins += g.amt || 0; logAct(g.amt || 0); LOG_W = null; }
        if (g.kind === 'wear' && g.wear) P.wardrobe = [...new Set([...(P.wardrobe || []), g.wear.startsWith('w:') ? g.wear : g.wear])];
        if (g.kind === 'furn' && g.furn && g.furn.k) room.invc.push({ id: rmId(), k: g.furn.k, col: g.furn.col || null, rc: g.furn.rc || 0, dir: g.furn.dir || 0 });
        shown.push(g); }
      B.update('giftbox/' + ME.uid + '/in/' + g.id, { got: true }).catch(() => {}); }
    if (P.giftDone.length > 200) P.giftDone = P.giftDone.slice(-200); if (ch) saveP();
    if (shown.length) { sfx('ok'); modal(`<h2 style="color:var(--gold2);margin-top:0">🎁 선물이 옴</h2>${shown.map(g => `<div class="card"><b>${esc(g.fromName || '누군가')}</b>에게서 — ${g.kind === 'coin' ? `🪙 은화 ${g.amt}` : g.kind === 'furn' ? `🪑 ${esc(g.name || '')} (보관함에 넣음)` : g.kind === 'item' ? `🎒 ${esc(g.name || '')} (소지품에 있음)` : g.kind === 'wear' ? `🧥 ${esc(g.name || '')} (옷장에 넣음)` : '💌 카드'}
        ${g.msg ? `<div style="margin-top:6px;padding:8px;background:#f8f0dc;color:#3a2a1a;border-radius:6px;white-space:pre-wrap;font-size:.95rem">${esc(g.msg)}</div>` : ''}</div>`).join('')}<button class="primary" style="width:100%" onclick="closeModal();render()">고마워</button>`); }
  } finally { GIFT_BUSY = false; }
}

/* ================= 📰 저택 소식지 ================= */
const NEWS_EMO = ['❤️', '👏', '😮', '😢', '🕯', '😂'];
let NEWS_OPEN = {};
VIEWS.news = () => {
  NEWS.forEach(n => { if (!(n.reads || []).includes(ME.uid)) { n.reads = [...(n.reads || []), ME.uid]; B.update('news/' + n.id, { reads: n.reads }).catch(() => {}); } });
  return `<div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">📰 저택 소식지</h2><button class="primary" style="flex:0 0 auto" onclick="newsWrite()">✍ ${IS_ADMIN ? '글쓰기' : '기고하기'}</button></div>
    <p class="muted" style="margin:4px 0;font-size:.82rem">${IS_ADMIN ? 'KP 글은 바로 실림. 기고는 승인하면 실림.' : '누구나 기고할 수 있음. KP가 승인하면 실림.'}</p></div>
   ${IS_ADMIN && NEWSREQ.length ? `<div class="panel" style="border-color:var(--gold)"><h2>✉ 기고 대기 (${NEWSREQ.length})</h2>${NEWSREQ.map(r => `<div class="card"><b>${esc(r.title)}</b> <span class="muted">— ${esc(r.byName || '')}</span>${r.img ? `<img src="${r.img}" style="max-width:100%;margin-top:6px;border-radius:4px">` : ''}<div style="white-space:pre-wrap;margin-top:4px">${esc(r.body)}</div>
      <div class="row" style="gap:4px;margin-top:6px"><button class="sm primary" onclick="newsApprove('${r.id}')">실기</button><button class="sm" onclick="newsWrite('${r.id}')">고쳐서 실기</button><button class="sm danger" onclick="newsReject('${r.id}')">돌려보내기</button></div></div>`).join('')}</div>` : ''}
   ${NEWS.map(n => newsCard(n)).join('') || '<div class="panel"><p class="muted">아직 실린 글이 없음.</p></div>'}`;
};
function newsCard(n) {
  const long = (n.body || '').length > 220 && !NEWS_OPEN[n.id], body = long ? n.body.slice(0, 200) + '…' : n.body || '';
  return `<div class="panel" style="background:linear-gradient(#f4ead2,#e8dcc0);color:#2a1e14;border-color:#8a7050"><div style="border-bottom:2px double #6a5030;padding-bottom:4px;margin-bottom:6px;display:flex;justify-content:space-between;gap:6px;align-items:baseline">
      <b style="font-size:1.1rem">${esc(n.title)}</b><span style="font-size:.75rem;color:#6a5030;white-space:nowrap">${esc(n.byName || '')} · ${dfmt(n.at)}</span></div>
    ${n.img ? `<img src="${n.img}" style="max-width:100%;border:1px solid #8a7050;margin-bottom:6px">` : ''}<div style="white-space:pre-wrap;line-height:1.6">${esc(body)}</div>${long ? `<button class="sm" style="margin-top:4px" onclick="NEWS_OPEN['${n.id}']=1;render()">더 보기</button>` : ''}
    <div class="row" style="gap:4px;flex-wrap:wrap;margin-top:8px">${NEWS_EMO.map(e => { const l = (n.reacts || {})[e] || []; return `<button class="sm ${l.includes(ME.uid) ? 'primary' : ''}" onclick="newsReact('${n.id}','${e}')">${e}${l.length ? ' ' + l.length : ''}</button>`; }).join('')}<span style="font-size:.75rem;color:#6a5030;margin-left:auto">👁 ${(n.reads || []).length}명 읽음</span></div>
    ${(n.cmts || []).map((c, i) => `<div style="font-size:.85rem;margin-top:4px;border-top:1px dotted #8a7050;padding-top:3px"><b>${esc(c.name)}</b> ${esc(c.t)} <span style="font-size:.7rem;color:#6a5030">${dfmt(c.at)}</span>${c.uid === ME.uid || IS_ADMIN ? ` <a href="#" style="color:#8a3040" onclick="event.preventDefault();newsCmtDel('${n.id}',${i})">✕</a>` : ''}</div>`).join('')}
    <div class="row" style="gap:4px;margin-top:6px"><input id="nc_${n.id}" maxlength="80" placeholder="댓글 (80자)" style="flex:1"><button class="sm" onclick="newsCmt('${n.id}')">달기</button>${IS_ADMIN ? `<button class="sm danger" onclick="newsDel('${n.id}')">🗑</button>` : ''}</div></div>`;
}
let NW = null;
function newsWrite(reqId) {
  const r = reqId ? NEWSREQ.find(x => x.id === reqId) : null; NW = { reqId: reqId || '', img: r ? r.img || '' : '' };
  modal(`<h2 style="color:var(--gold2);margin-top:0">✍ ${r ? '기고 고쳐서 싣기' : IS_ADMIN ? '소식지 글쓰기' : '소식지 기고'}</h2>
    <label class="f">제목</label><input id="nwT" maxlength="40" value="${esc(r ? r.title : '')}">
    <label class="f">내용</label><textarea id="nwB" rows="8" maxlength="3000">${esc(r ? r.body : '')}</textarea>
    <label class="f">그림 (선택)</label><div class="row" style="gap:6px;align-items:center"><button class="sm" onclick="newsImg()">📷 고르기</button><span id="nwI" class="muted">${NW.img ? '있음' : '없음'}</span>${NW.img ? '<button class="sm" onclick="NW.img=\'\';$(\'#nwI\').textContent=\'없음\'">✕</button>' : ''}</div>
    <div class="row" style="margin-top:10px"><button onclick="closeModal()">취소</button><button class="primary" onclick="newsSubmit()">${IS_ADMIN ? '싣기' : '보내기'}</button></div>`);
}
function newsImg() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = () => { const f = inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => {
  const s = Math.min(1, 720 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  NW.img = c.toDataURL('image/jpeg', .8); const e = $('#nwI'); if (e) e.textContent = '있음 ✓'; }; im.src = rd.result; }; rd.readAsDataURL(f); }; inp.click(); }
async function newsSubmit() {
  const title = $('#nwT').value.trim(), body = $('#nwB').value.trim(); if (!title || !body) return toast('제목과 내용을 넣기');
  try {
    if (IS_ADMIN) { const r = NW.reqId ? NEWSREQ.find(x => x.id === NW.reqId) : null;
      await B.add('news', { title, body, img: NW.img || '', by: r ? r.by : ME.uid, byName: r ? r.byName : (PROF.name || 'KP'), at: Date.now(), reacts: {}, cmts: [], reads: [] });
      if (r) await B.del('newsReq/' + r.id); sPing(allUids(), '📰 소식지 새 글', title, 'news'); toast('게재 완료'); }
    else { await B.add('newsReq', { title, body, img: NW.img || '', by: ME.uid, byName: PROF.name || '', at: Date.now() }); sPing(USERS.filter(u => isAdminEmail(u.email)).map(u => u.id), '✉ 소식지 기고가 옴', title, 'news'); toast('보냄! KP가 승인하면 실림'); }
    NW = null; closeModal();
  } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function newsApprove(id) { const r = NEWSREQ.find(x => x.id === id); if (!r) return; try { await B.add('news', { title: r.title, body: r.body, img: r.img || '', by: r.by, byName: r.byName, at: Date.now(), reacts: {}, cmts: [], reads: [] }); await B.del('newsReq/' + id);
  sPing(allUids(), '📰 소식지 새 글', r.title, 'news'); toast('게재 완료'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
async function newsReject(id) { const r = NEWSREQ.find(x => x.id === id); if (!r || !confirm('이 기고를 돌려보낼까요? (지워짐)')) return; try { await B.del('newsReq/' + id); sPing([r.by], '✉ 소식지 기고가 반려됨', r.title, 'news'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
async function newsDel(id) { if (!confirm('이 글을 내릴까요?')) return; try { await B.del('news/' + id); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
async function newsReact(id, e) { const n = NEWS.find(x => x.id === id); if (!n) return; const r = JSON.parse(JSON.stringify(n.reacts || {})), l = new Set(r[e] || []); l.has(ME.uid) ? l.delete(ME.uid) : l.add(ME.uid); r[e] = [...l]; n.reacts = r; render();
  try { await B.update('news/' + id, { reacts: r }); } catch (er) { toast('실패: ' + (er.code || er.message)); } }
async function newsCmt(id) { const n = NEWS.find(x => x.id === id), inp = $('#nc_' + id); if (!n || !inp || !inp.value.trim()) return; const c = [...(n.cmts || []), { uid: ME.uid, name: PROF.name || '', t: inp.value.trim().slice(0, 80), at: Date.now() }].slice(-60);
  try { await B.update('news/' + id, { cmts: c }); if (n.by && n.by !== ME.uid) sPing([n.by], '💬 소식지 댓글', `${PROF.name}: ${inp.value.trim()}`, 'news'); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
async function newsCmtDel(id, i) { const n = NEWS.find(x => x.id === id); if (!n) return; const c = (n.cmts || []).slice(); c.splice(i, 1); try { await B.update('news/' + id, { cmts: c }); } catch (e) { toast('실패: ' + (e.code || e.message)); } }

/* ================= 📔 캐릭터 일기 ================= */
let DYS = { uid: null, open: null, sec: {} };
function diaryOpen(uid) { DYS = { uid, open: null, sec: {} }; diaryList(); }
function diaryList() {
  const u = userOf(DYS.uid), mine = DYS.uid === ME.uid, list = DIARIES.filter(d => d.uid === DYS.uid);
  modal(`<div id="diaryBox"><h2 style="color:var(--gold2);margin-top:0">📔 ${esc(u && u.ho ? cname(u.ho) : uname(u))}의 일기장</h2>${mine ? '' : '<p class="muted" style="margin:0 0 6px;font-size:.82rem">몰래 열람 중… 가린 부분은 허락된 사람만</p>'}
    ${mine ? '<button class="primary" style="width:100%;margin-bottom:8px" onclick="diaryEdit()">✍ 새 일기 쓰기</button>' : ''}
    ${list.map(d => `<div class="item" style="margin:4px 0;cursor:pointer" onclick="diaryRead('${d.id}')"><div><b>${esc(d.title || '무제')}</b><div class="muted" style="font-size:.78rem">${dfmt(d.at)}${(d.segs || []).some(s => s.h != null) ? ' · 🔒 가린 부분 있음' : ''}</div></div><span>›</span></div>`).join('') || '<p class="muted">아직 쓴 일기가 없음.</p>'}
    <button style="width:100%;margin-top:8px" onclick="closeModal()">닫기</button></div>`);
}
function diaryListRefresh() { if (DYS.open) return; diaryList(); }
async function diaryRead(id) {
  const d = DIARIES.find(x => x.id === id); if (!d) return; DYS.open = id; let sec = null;
  if ((d.segs || []).some(s => s.h != null)) { try { sec = await B.get('diarySec/' + id); } catch (e) { sec = null; } }
  const can = sec && (d.uid === ME.uid || IS_ADMIN || (sec.who || []).includes(ME.uid)), mine = d.uid === ME.uid;
  const html = (d.segs || []).map(s => s.h != null ? (can ? `<span style="background:#e8d8a0;color:#4a2a1a;border-bottom:1px dashed #a07030" title="가린 부분">${esc((sec.parts || [])[s.h] || '')}</span>` : `<span style="background:#1a1210;color:#1a1210;border-radius:2px;letter-spacing:-1px" title="가려져 있음">${'█'.repeat(Math.max(2, Math.min(40, s.n || 6)))}</span>`) : esc(s.t)).join('');
  modal(`<div id="diaryBox"><button class="sm" onclick="DYS.open=null;diaryList()">← 목록</button>
    <div style="margin-top:8px;background:#f4ead2;color:#2a1e14;padding:12px;border-radius:6px;box-shadow:inset 0 0 0 1px #c8b088"><div style="display:flex;justify-content:space-between;border-bottom:1px solid #c8b088;margin-bottom:8px;padding-bottom:4px"><b>${esc(d.title || '무제')}</b><span style="font-size:.75rem;color:#6a5030">${dfmt(d.at)}</span></div>
    <div style="white-space:pre-wrap;line-height:1.8;font-size:.95rem">${html}</div></div>
    ${mine ? `<p class="muted" style="font-size:.78rem;margin:6px 0">🔒 가린 부분을 볼 수 있는 사람: ${sec && (sec.who || []).length ? sec.who.map(w => esc(uname(userOf(w)))).join(', ') : '나만'}</p><div class="row" style="gap:6px"><button onclick="diaryEdit('${id}')">✏ 고치기</button><button class="danger" onclick="diaryDel('${id}')">🗑 지우기</button></div>`
      : can && (d.segs || []).some(s => s.h != null) ? '<p class="muted" style="font-size:.78rem;margin:6px 0">🔓 가린 부분을 볼 수 있도록 허락받음.</p>' : ''}</div>`);
}
async function diaryEdit(id) {
  const d = id ? DIARIES.find(x => x.id === id) : null; let text = '', who = [];
  if (d) { let sec = null; try { sec = await B.get('diarySec/' + id); } catch (e) {} who = (sec && sec.who) || []; text = (d.segs || []).map(s => s.h != null ? '⟦' + ((sec && sec.parts || [])[s.h] || '') + '⟧' : s.t).join(''); }
  DYS.open = 'edit'; const ppl = USERS.filter(u => u.id !== ME.uid);
  modal(`<div id="diaryBox"><h2 style="color:var(--gold2);margin-top:0">✍ ${d ? '일기 고치기' : '새 일기'}</h2>
    <label class="f">제목</label><input id="dyT" maxlength="40" value="${esc(d ? d.title : '')}" placeholder="예: 비 오는 밤">
    <label class="f">내용</label><textarea id="dyB" rows="9" maxlength="4000" placeholder="캐릭터의 하루를 적어 보기">${esc(text)}</textarea>
    <div class="row" style="gap:6px;margin-top:4px;flex-wrap:wrap"><button class="sm" onclick="diaryWrap()">🔒 고른 부분 가리기</button><button class="sm" onclick="diaryUnwrap()">🔓 가림 풀기</button><button class="sm" onclick="diaryWrapAll()">📕 전부 가리기</button></div>
    <p class="muted" style="font-size:.78rem;margin:4px 0">글자 선택 → 「가리기」 · 남에게는 ███</p>
    <label class="f">가린 부분을 볼 수 있는 사람 <span class="muted">(아무도 안 고르면 나만)</span></label>
    <div class="toggles">${ppl.map(u => `<label class="chip"><input type="checkbox" class="dyW" value="${u.id}" ${who.includes(u.id) ? 'checked' : ''} style="width:auto;margin:0 4px 0 0;vertical-align:middle">${esc(u.ho ? cname(u.ho) : uname(u))}</label>`).join('')}</div>
    <div class="row" style="margin-top:10px"><button onclick="DYS.open=null;diaryList()">취소</button><button class="primary" onclick="diarySave('${id || ''}')">저장</button></div></div>`);
}
function diaryWrap() { const t = $('#dyB'); const a = t.selectionStart, b = t.selectionEnd; if (a === b) return toast('가릴 글자를 먼저 고르기'); t.value = t.value.slice(0, a) + '⟦' + t.value.slice(a, b) + '⟧' + t.value.slice(b); t.focus(); }
function diaryUnwrap() { const t = $('#dyB'); const a = t.selectionStart, b = t.selectionEnd; if (a === b) { t.value = t.value.replace(/[⟦⟧]/g, ''); toast('가림을 모두 풂'); return; } t.value = t.value.slice(0, a) + t.value.slice(a, b).replace(/[⟦⟧]/g, '') + t.value.slice(b); }
function diaryWrapAll() { const t = $('#dyB'); t.value = '⟦' + t.value.replace(/[⟦⟧]/g, '') + '⟧'; }
async function diarySave(id) {
  const title = $('#dyT').value.trim() || '무제', raw = $('#dyB').value; if (!raw.trim()) return toast('내용을 적기');
  const who = [...document.querySelectorAll('.dyW')].filter(c => c.checked).map(c => c.value), segs = [], parts = [];
  raw.split(/(⟦[\s\S]*?⟧)/).forEach(p => { if (!p) return; if (p.startsWith('⟦') && p.endsWith('⟧')) { const s = p.slice(1, -1); if (!s) return; segs.push({ h: parts.length, n: Math.min(40, [...s].length) }); parts.push(s); } else segs.push({ t: p.replace(/[⟦⟧]/g, '') }); });
  const did = id || ('d' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)), old = id && DIARIES.find(x => x.id === id);
  try { await B.set('diarySec/' + did, { owner: ME.uid, who, parts }); await B.set('diaries/' + did, { uid: ME.uid, ho: PROF.ho || '', title: title.slice(0, 40), segs, at: old ? old.at : Date.now(), upd: Date.now() });
    if (!id) sPing(who, '📔 일기를 볼 수 있게 됨', `${PROF.ho ? cname(PROF.ho) : PROF.name}의 일기 「${title}」`, 'diary');
    DYS.open = null; toast('일기 저장 완료'); diaryList(); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function diaryDel(id) { if (!confirm('이 일기를 지울까요?')) return; try { await B.del('diaries/' + id); await B.del('diarySec/' + id); DYS.open = null; diaryList(); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
