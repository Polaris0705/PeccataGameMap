/* =========================================================
   수수께끼 쪽지 · KP 데이터 관리 (index.html 전역 사용)
   - 쪽지: 활동(은화를 버는 일)을 끝낼 때 KP가 정한 확률로 팝업 → 소지품의 '쪽지'에 들어감, 풀면 사라짐
   - KP '데이터' 탭: 쪽지 설정 · 플레이어 은화/진행 수정 · 기록 · 백업/복원 · 초기화
   ========================================================= */
let NOTECFG = { on: true, pct: 10, perDay: 3, hold: 3 };
let NOTE_SKIP = false, NOTE_PENDING = null, NOTE_SEEN = null;

/* ---------- 쪽지 ---------- */
function noteDay() { const d = kstDate(); if (!P.nday || P.nday.d !== d) P.nday = { d, n: 0 }; return P.nday; }
function notePool(p) { p = p || P; const held = (p.notes || []).map(n => n.id); return RIDDLES.filter(r => !((p.riddles || {})[r.id] || {}).solved && !held.includes(r.id)); }
// earn()에서 부름: 저장은 earn이 해요
function noteTry() {
  if (NOTE_SKIP || !P || !ME || !PROF || !PROF.ho) return;
  const cf = NOTECFG; if (!cf.on) return; P.notes = P.notes || [];
  const d = noteDay(); if (d.n >= cf.perDay || P.notes.length >= cf.hold || NOTE_PENDING) return;
  if (Math.random() * 100 >= cf.pct) return;
  const pool = notePool(); if (!pool.length) return;
  const r = pool[Math.floor(Math.random() * pool.length)];
  P.notes.push({ id: r.id, at: Date.now() }); d.n++; NOTE_PENDING = r.id; if (NOTE_SEEN) NOTE_SEEN.add(r.id);
}
function noteRemove(id) { if (P && P.notes) P.notes = P.notes.filter(n => n.id !== id); }
function showNotePop(id) {
  const r = RIDDLES.find(x => x.id === id); if (!r) return; sfx('ok');
  modal(`<div style="text-align:center;font-size:2.6rem">📜</div><h2 style="color:var(--gold2);margin:6px 0;text-align:center">접힌 쪽지를 주웠다</h2>
   <p class="story" style="text-align:center">어디선가 팔랑, 낡은 쪽지 한 장이 떨어졌다.<br><span class="muted">「${esc(r.room)}」에서 흘러온 것 같다.</span></p>
   <div class="row" style="justify-content:center;margin-top:10px"><button class="primary" onclick="openRiddle('${id}')">펼쳐 보기</button><button onclick="closeModal();toast('📜 소지품에 넣어 뒀어요')">소지품에 넣어 두기</button></div>`);
}
// 게임 중이거나 다른 창이 떠 있으면 기다렸다가 띄워요. KP가 준 쪽지도 여기서 알려요.
setInterval(() => {
  if (!P || !ME) return;
  const ids = (P.notes || []).map(n => n.id);
  if (!NOTE_SEEN) { NOTE_SEEN = new Set(ids); return; }
  ids.forEach(id => { if (!NOTE_SEEN.has(id)) { NOTE_SEEN.add(id); if (!NOTE_PENDING) NOTE_PENDING = id; } });
  if (!NOTE_PENDING || window.GAME_LOCK || modalOpen()) return;
  const id = NOTE_PENDING; NOTE_PENDING = null; if (ids.includes(id)) showNotePop(id);
}, 800);
function notesPanel() {
  const notes = (P.notes || []).filter(n => RIDDLES.some(r => r.id === n.id)), all = RIDDLES.every(r => rs(r.id).solved);
  const solved = RIDDLES.filter(r => rs(r.id).solved).length;
  return `<div class="panel"><h2>📜 쪽지</h2><p class="muted">활동을 하다 보면 가끔 수수께끼 쪽지를 줍게 돼요. 풀면 쪽지는 사라져요. (해결 ${solved} / ${RIDDLES.length})</p>
   ${notes.length ? `<div class="inv">${notes.map(n => { const r = RIDDLES.find(x => x.id === n.id); return `<div class="slotx" onclick="openRiddle('${n.id}')"><div class="noimg">📜</div><div style="font-size:.88rem">${esc(r.room)}의 쪽지</div></div>`; }).join('')}</div>` : '<p class="muted">지금 가진 쪽지가 없어요.</p>'}
   ${all ? `<button class="primary" style="margin-top:8px" onclick="openSecret()">🗝 ${P.secret ? '숨겨진 방' : '모든 쪽지를 풀자 어딘가의 문이 열렸다…'}</button>` : ''}</div>`;
}

/* ---------- 활동 기록 ---------- */
const LOG_NAME = k => (typeof FEATS !== 'undefined' && FEATS[k] && FEATS[k].n) || ({ room: '내 방', visit: '방 구경', items: '소지품', lobby: '내 정보', map: '저택 지도', book: '조사 예약', party: '파티 게임', draw: '그림 게임', kp: 'KP 지급', riddle: '수수께끼', theft: '금고 털림' })[k] || k || '기타';
let LOG_W = null;
function logAct(n) { if (!P || !n) return; P.log = P.log || []; P.log.push({ t: Date.now(), n, w: LOG_W || (NOTE_SKIP ? 'riddle' : tab) }); if (P.log.length > 80) P.log = P.log.slice(-80); }
const fmtT = t => { const d = new Date(t + 9 * 36e5); return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
const isToday = t => new Date(t + 9 * 36e5).toISOString().slice(0, 10) === kstDate();

/* ---------- KP: 데이터 관리 ---------- */
const progOf = uid => PROGS.find(p => p.id === uid) || {};
function dataPlayers() { return USERS.filter(u => u.ho || PROGS.some(p => p.id === u.id)).map(u => ({ u, p: progOf(u.id) })); }
VIEWS.kdata = () => {
  const cf = NOTECFG, rows = dataPlayers();
  const today = rows.map(({ u, p }) => ({ u, n: (p.log || []).filter(l => isToday(l.t) && l.n > 0).reduce((s, l) => s + l.n, 0), last: Math.max(0, ...(p.log || []).map(l => l.t)) }));
  const recent = rows.flatMap(({ u, p }) => (p.log || []).map(l => ({ ...l, u }))).sort((a, b) => b.t - a.t).slice(0, 30);
  return `<div class="panel"><h2>📜 쪽지 설정</h2><p class="muted">PL이 은화를 버는 활동(미니게임 · 타이쿤 · 온실 등)을 끝낼 때마다 확률로 수수께끼 쪽지가 떠요.</p>
   <div class="grid g2" style="gap:8px">
    <label class="row"><input type="checkbox" id="ncOn" ${cf.on ? 'checked' : ''} style="width:auto"> 쪽지 켜기</label>
    <label>나올 확률 (%) <input id="ncPct" type="number" min="0" max="100" value="${cf.pct}"></label>
    <label>한 사람 하루 최대 <input id="ncDay" type="number" min="0" max="20" value="${cf.perDay}"></label>
    <label>동시에 가질 수 있는 쪽지 <input id="ncHold" type="number" min="1" max="12" value="${cf.hold}"></label></div>
   <button class="primary" style="margin-top:8px" onclick="saveNoteCfg()">설정 저장</button></div>

  <div class="panel"><h2>👥 플레이어 데이터</h2><p class="muted">은화를 주거나 빼고, 쪽지를 주거나 거둬들이고, 진행을 초기화할 수 있어요. 바꾸면 PL 화면에 바로 반영돼요.</p>
   <div style="overflow-x:auto"><table><tr><th>이름</th><th>보유</th><th>누적</th><th>오늘</th><th>쪽지</th><th>해결</th><th>마지막 활동</th><th></th></tr>
   ${rows.map(({ u, p }, i) => { const td = today[i]; return `<tr><td>${esc(uname(u))}<div class="muted" style="font-size:.75rem">${esc(u.ho ? cname(u.ho) : 'HO 없음')}</div></td>
    <td>${p.coins || 0}</td><td>${p.earned || 0}</td><td>${td.n ? '+' + td.n : '-'}</td><td>${(p.notes || []).length}</td><td>${Object.values(p.riddles || {}).filter(r => r.solved).length}/${RIDDLES.length}</td>
    <td class="muted" style="font-size:.8rem">${td.last ? fmtT(td.last) : '-'}</td>
    <td><div class="row" style="gap:4px;flex-wrap:wrap"><button class="sm" onclick="kdCoins('${u.id}')">± 은화</button><button class="sm" onclick="kdGiveNote('${u.id}')">📜 주기</button><button class="sm" onclick="kdTakeNotes('${u.id}')">거두기</button><button class="sm" onclick="kdLog('${u.id}')">기록</button><button class="sm" onclick="kdReset('${u.id}')">초기화</button></div></td></tr>`; }).join('')}
   </table></div></div>

  <div class="panel"><h2>📈 사용량 · 기록</h2><p class="muted">오늘 번 은화 합계 <b>${today.reduce((s, x) => s + x.n, 0)}</b> · 오늘 가장 많이 번 사람 ${(() => { const b = today.slice().sort((a, b) => b.n - a.n)[0]; return b && b.n ? `<b>${esc(uname(b.u))}</b> (+${b.n})` : '-'; })()}</p>
   ${recent.length ? `<div style="max-height:260px;overflow:auto"><table>${recent.map(l => `<tr><td class="muted" style="font-size:.8rem">${fmtT(l.t)}</td><td>${esc(uname(l.u))}</td><td>${esc(LOG_NAME(l.w))}</td><td style="color:${l.n > 0 ? 'var(--gold2)' : '#e88'}">${l.n > 0 ? '+' : ''}${l.n}</td></tr>`).join('')}</table></div>` : '<p class="muted">아직 기록이 없어요. (이번 업데이트부터 쌓여요)</p>'}</div>

  <div class="panel"><h2>💾 백업 · 복원</h2><p class="muted">플레이어 · 진행 · 아이템 · 예약 · 대기열 · 메모 · 스케줄 · 설정 · 채팅방 목록 · 방명록을 JSON 하나로 내려받아요. 복원하면 파일 속 내용으로 덮어써요.</p>
   <label class="row" style="margin:6px 0"><input type="checkbox" id="bkMap" style="width:auto"> 지도 이미지도 포함 (파일이 커져요)</label>
   <div class="row"><button class="primary" onclick="kdBackup()">⬇ 백업 내려받기</button><button onclick="kdRestorePick()">⬆ 백업에서 복원</button></div></div>

  <div class="panel"><h2>⚠ 전체 초기화</h2><p class="muted">모든 플레이어의 은화 · 방 · 쪽지 · 수수께끼 · 게임 기록을 처음 상태로 되돌려요. 계정 · HO · 아이템 · 스케줄은 그대로예요. 되돌릴 수 없으니 먼저 백업하세요.</p>
   <button onclick="kdResetAll()" style="border-color:#a44;color:#f99">전체 진행 초기화</button></div>`;
};
async function saveNoteCfg() {
  const v = id => +($('#' + id).value || 0), n = { on: $('#ncOn').checked, pct: Math.max(0, Math.min(100, v('ncPct'))), perDay: Math.max(0, Math.min(20, Math.round(v('ncDay')))), hold: Math.max(1, Math.min(12, Math.round(v('ncHold')))) };
  try { await B.set('settings/game', { notes: n }, true); NOTECFG = n; toast('쪽지 설정을 저장했어요'); render(); } catch (e) { toast('저장하지 못했어요'); }
}
async function kdCoins(uid) {
  const p = progOf(uid), s = prompt(`더하거나 뺄 은화를 적어 주세요 (예: 50, -20)\n지금 ${p.coins || 0} 은화`, ''); if (s == null) return;
  const v = Math.round(+s); if (!v) return toast('숫자를 적어 주세요');
  const coins = Math.max(0, (p.coins || 0) + v), log = (p.log || []).concat({ t: Date.now(), n: v, w: 'kp' }).slice(-80);
  try { await B.update('progress/' + uid, v > 0 ? { coins, earned: (p.earned || 0) + v, log } : { coins, log }); toast(`${v > 0 ? '+' : ''}${v} 은화`); } catch (e) { toast('바꾸지 못했어요'); }
}
async function kdGiveNote(uid) {
  const p = progOf(uid), pool = notePool(p); if (!pool.length) return toast('줄 수 있는 쪽지가 없어요 (모두 풀었거나 이미 가지고 있어요)');
  const r = pool[Math.floor(Math.random() * pool.length)];
  try { await B.update('progress/' + uid, { notes: (p.notes || []).concat({ id: r.id, at: Date.now() }) }); toast(`「${r.room}」 쪽지를 줬어요`); } catch (e) { toast('주지 못했어요'); }
}
async function kdTakeNotes(uid) { const p = progOf(uid); if (!(p.notes || []).length) return toast('가진 쪽지가 없어요'); if (!confirm('이 플레이어의 쪽지를 모두 거둬들일까요?')) return;
  try { await B.update('progress/' + uid, { notes: [] }); toast('쪽지를 거둬들였어요'); } catch (e) { toast('실패했어요'); } }
function kdLog(uid) {
  const u = USERS.find(x => x.id === uid), l = (progOf(uid).log || []).slice().reverse();
  modal(`<h2 style="color:var(--gold2);margin-top:0">${esc(uname(u))}의 기록</h2>${l.length ? `<div style="max-height:360px;overflow:auto"><table>${l.map(x => `<tr><td class="muted" style="font-size:.8rem">${fmtT(x.t)}</td><td>${esc(LOG_NAME(x.w))}</td><td style="color:${x.n > 0 ? 'var(--gold2)' : '#e88'}">${x.n > 0 ? '+' : ''}${x.n}</td></tr>`).join('')}</table></div>` : '<p class="muted">기록이 없어요.</p>'}<button style="margin-top:8px" onclick="closeModal()">닫기</button>`);
}
async function kdReset(uid) {
  const u = USERS.find(x => x.id === uid); if (!confirm(`${uname(u)}의 은화 · 방 · 쪽지 · 수수께끼 · 게임 기록을 처음으로 되돌릴까요?`)) return;
  try { await B.set('progress/' + uid, { reset: Date.now() }); toast('초기화했어요'); } catch (e) { toast('초기화하지 못했어요'); }
}
async function kdResetAll() {
  if (prompt('모든 플레이어 진행을 초기화해요. 계속하려면 "초기화"라고 적어 주세요.') !== '초기화') return toast('취소했어요');
  let ok = 0; for (const { u } of dataPlayers()) { try { await B.set('progress/' + u.id, { reset: Date.now() }); ok++; } catch (e) {} }
  toast(`${ok}명의 진행을 초기화했어요`);
}
const BK_COLS = ['users', 'progress', 'items', 'itemDefs', 'recipes', 'bookings', 'queue', 'notes', 'sched', 'public', 'settings', 'channels', 'truths', 'roomLikes', 'guestbook'];
async function kdBackup() {
  const cols = BK_COLS.concat($('#bkMap') && $('#bkMap').checked ? ['maps', 'mapchunks', 'assets'] : []), out = { app: 'peccata', ver: 1, at: Date.now(), cols: {} };
  toast('백업을 모으는 중…');
  for (const c of cols) { try { out.cols[c] = (await B.getCol(c)).map(d => { const { id, ...rest } = d; return { id, d: rest }; }); } catch (e) { out.cols[c] = []; } }
  const blob = new Blob([JSON.stringify(out)], { type: 'application/json' }), a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = `peccata-backup-${kstDate()}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast(`백업을 내려받았어요 (${Object.values(out.cols).reduce((s, l) => s + l.length, 0)}개)`);
}
function kdRestorePick() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'application/json,.json';
  inp.onchange = async () => { const f = inp.files && inp.files[0]; if (!f) return; let data; try { data = JSON.parse(await f.text()); } catch (e) { return toast('백업 파일을 읽지 못했어요'); }
    if (!data || data.app !== 'peccata' || !data.cols) return toast('저택 백업 파일이 아니에요');
    const n = Object.values(data.cols).reduce((s, l) => s + l.length, 0);
    if (prompt(`${fmtT(data.at)}에 만든 백업(${n}개)으로 덮어써요. 계속하려면 "복원"이라고 적어 주세요.`) !== '복원') return toast('취소했어요');
    let ok = 0, bad = 0; toast('복원하는 중…');
    for (const [c, list] of Object.entries(data.cols)) for (const { id, d } of list) { try { await B.set(c + '/' + id, d); ok++; } catch (e) { bad++; } }
    toast(`복원 완료: ${ok}개${bad ? ` (권한 없어 건너뜀 ${bad}개)` : ''}`); };
  inp.click();
}
