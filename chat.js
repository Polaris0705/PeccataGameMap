/* =========================================================
   숲속 저택 — 채팅 (RP · OOC · 비밀 채널 · 귓속말)
   index.html의 전역(B, ME, PROF, USERS, IS_ADMIN ...)을 사용해요.
   ========================================================= */
const CHAT_LIMIT = 150;
const CH = {};
let PORTRAITS = { portraits: {}, tokens: {} };
function chatReset() {
  Object.assign(CH, { cur: 'rp', msgs: {}, meta: {}, subs: {}, metaSubs: {}, draft: {}, kind: 'ic', speaker: 'narr',
    edit: null, sel: null, stick: true, atBottom: true, scroll: 0, idx: [], idxHo: null, idxUnsub: null,
    pendingImg: '', diceOpen: false, lastLock: null, defaultsDone: false, sheetOpen: false });
  try { CH.dockOpen = localStorage.getItem('peccata_dock') !== '0'; } catch (e) { CH.dockOpen = true; }
}
chatReset();

const dmId = (a, b) => 'dm_' + [a, b].sort().join('_');
const dmOther = id => id.split('_').slice(1).find(x => x !== ME.uid);
const rnd = () => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] / 4294967296; };
const hhmm = t => { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
const fullTime = t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${hhmm(t)}`; };
function readMap() { try { return JSON.parse(localStorage.getItem('peccata_read_' + (ME && ME.uid)) || '{}'); } catch (e) { return {}; } }
function setRead(ch, t) { const m = readMap(); if ((m[ch] || 0) >= t) return; m[ch] = t; try { localStorage.setItem('peccata_read_' + ME.uid, JSON.stringify(m)); } catch (e) {} }

/* ---------- 구독 ---------- */
function chatOnAuth(u) {
  chatReset();
  unmountChatDock();
  if (!u) return;
  mountChatDock();
  unsubs.push(B.onDoc('assets/portraits', d => { PORTRAITS = d || { portraits: {}, tokens: {} }; chatData(); }));
  ['rp', 'ooc'].forEach(id => { metaSub(id); chanSub(id); });
  if (IS_ADMIN) {
    unsubs.push(B.onCol('channels', l => {
      Object.keys(CH.meta).forEach(k => { if (!l.find(c => c.id === k)) delete CH.meta[k]; });
      l.forEach(c => { CH.meta[c.id] = c; if (c.type === 'secret') chanSub(c.id); });
      if (!CH.defaultsDone) {
        CH.defaultsDone = true;
        if (!l.find(c => c.id === 'rp')) B.set('channels/rp', { name: 'RP', type: 'public', locked: false, at: Date.now() });
        if (!l.find(c => c.id === 'ooc')) B.set('channels/ooc', { name: '잡담 (OOC)', type: 'ooc', locked: false, at: Date.now() });
      }
      chatData();
    }));
  }
  chatOnUsers(); chatOnProf();
}
function chatOnUsers() { if (!ME) return; USERS.filter(u => u.id !== ME.uid).forEach(u => chanSub(dmId(ME.uid, u.id))); renderChatParts(); }
function chatInputSoft() { const a = document.activeElement; if (a && a.closest && a.closest('#chatIn')) return; refreshInput(); }
function chatOnProf() {
  if (ME && PROF) chatInputSoft();
  if (!ME || IS_ADMIN || !PROF) return;
  const ho = PROF.ho || '';
  if (ho === CH.idxHo) return;
  CH.idxHo = ho;
  if (CH.idxUnsub) { CH.idxUnsub(); CH.idxUnsub = null; }
  CH.idx = [];
  if (!ho) return;
  CH.idxUnsub = B.onDoc('chatIndex/' + ho, d => { CH.idx = (d && d.ids) || []; CH.idx.forEach(id => { metaSub(id); chanSub(id); }); chatData(); });
  unsubs.push(() => { if (CH.idxUnsub) CH.idxUnsub(); });
}
function metaSub(id) {
  if (CH.metaSubs[id]) return; CH.metaSubs[id] = 1;
  unsubs.push(B.onDoc('channels/' + id, d => { if (d) CH.meta[id] = { id, ...d }; else if (!IS_ADMIN) delete CH.meta[id]; chatData(); }));
}
function chanSub(id) {
  if (CH.subs[id]) return; CH.subs[id] = 1;
  unsubs.push(B.onQuery('channels/' + id + '/msgs', { orderBy: 'at', limit: CHAT_LIMIT }, l => {
    const prev = CH.msgs[id]; CH.msgs[id] = l; newMsgCheck(id, prev, l); chatData();
  }));
}
function newMsgCheck(id, prev, l) {
  if (!prev) return;
  const viewing = chatVisible() && CH.cur === id;
  l.filter(m => m.uid !== ME.uid && !m.deleted && !prev.find(p => p.id === m.id)).forEach(m => {
    if (viewing) return;
    const me = (m.mentions || []).includes(ME.uid), dm = id.startsWith('dm_');
    if (me || dm) toast(`💬 ${dm ? '귓속말' : chanTitle(id)} · ${speakerOf(m).name}: ${(m.text || (m.dice ? '🎲' : '🖼')).slice(0, 40)}`);
  });
}
function chatData() { renderChatParts(); }

/* ---------- 채널 목록 ---------- */
function chanList() {
  const L = [{ id: 'rp', sec: '채널' }, { id: 'ooc', sec: '채널' }];
  const secrets = IS_ADMIN ? Object.values(CH.meta).filter(c => c.type === 'secret').sort((a, b) => (a.at || 0) - (b.at || 0)).map(c => c.id) : CH.idx.filter(id => CH.meta[id]);
  secrets.forEach(id => L.push({ id, sec: '비밀' }));
  USERS.filter(u => u.id !== ME.uid).sort((a, b) => isAdminEmail(b.email) - isAdminEmail(a.email)).forEach(u => L.push({ id: dmId(ME.uid, u.id), sec: '귓속말', user: u }));
  return L;
}
function chanTitle(id) {
  if (id.startsWith('dm_')) { const u = userOf(dmOther(id)); return u ? (isAdminEmail(u.email) ? 'KP · ' : '') + uname(u) + (u.ho ? ` (${cname(u.ho)})` : '') : '귓속말'; }
  const m = CH.meta[id]; if (m && m.name) return m.name;
  return id === 'rp' ? 'RP' : id === 'ooc' ? '잡담 (OOC)' : '…';
}
const isLocked = (id = CH.cur) => !!(CH.meta[id] && CH.meta[id].locked);
function unread(id) {
  const l = CH.msgs[id] || []; let last = null;
  for (let i = l.length - 1; i >= 0; i--) if (l[i].uid !== ME.uid && !l[i].deleted) { last = l[i]; break; }
  return !!last && last.at > (readMap()[id] || 0);
}
function anyUnread() { return !!ME && chanList().some(c => (c.id !== CH.cur || !chatVisible()) && unread(c.id)); }
function chatBadge() { return anyUnread() ? ' <span class="dot"></span>' : ''; }
function chanListHtml(L) {
  let h = '', sec = '';
  L.forEach(c => {
    if (c.sec !== sec) { sec = c.sec; }
    const icon = c.sec === '비밀' ? '🕯 ' : c.sec === '귓속말' ? '✉ ' : '# ';
    h += `<button class="chan ${c.id === CH.cur ? 'on' : ''}" onclick="openChan('${c.id}')">${icon}${esc(chanTitle(c.id))}${isLocked(c.id) ? ' 🔒' : ''}${c.id !== CH.cur && unread(c.id) ? '<span class="dot"></span>' : ''}</button>`;
  });
  if (IS_ADMIN) h += `<button class="chan add" onclick="chanEdit()">＋ 비밀</button>`;
  return h;
}
function chatHeadHtml() {
  const id = CH.cur, m = CH.meta[id];
  let info = '';
  if (id.startsWith('dm_')) info = '둘만 보는 귓속말이에요';
  else if (m && m.type === 'secret') info = '참여: ' + (m.members || []).map(cname).join(', ') + ' · KP';
  else if (id === 'ooc') info = '캐릭터 밖 잡담 채널';
  else info = '모두가 함께하는 RP 채널';
  return `<div><b>${esc(chanTitle(id))}</b>${isLocked() ? ' <span class="badge rejected">🔒 잠김</span>' : ''}<div class="muted" style="font-size:.78rem">${esc(info)}</div></div>
   <div class="row" style="flex:0 0 auto;gap:5px">${IS_ADMIN && !id.startsWith('dm_') ? `<button class="sm" onclick="toggleLock('${id}')">${isLocked() ? '🔓 잠금 해제' : '🔒 잠그기'}</button>` : ''}
   ${IS_ADMIN && m && m.type === 'secret' ? `<button class="sm" onclick="chanEdit('${id}')">⚙</button>` : ''}<button class="sm" onclick="exportLog()">로그</button></div>`;
}

/* ---------- 도킹 패널 (PC: 오른쪽 상시 / 폰: 💬 버튼) ---------- */
const DESK_MIN = 1000;
const isDesk = () => window.innerWidth >= DESK_MIN;
const chatReady = () => !!(ME && PROF && (IS_ADMIN || PROF.ho));
function chatVisible() {
  if (!chatReady() || document.hidden) return false;
  return isDesk() ? CH.dockOpen : CH.sheetOpen;
}
function layoutDock() {
  const b = document.body, ready = chatReady(), desk = isDesk();
  b.classList.toggle('chat-on', ready);
  b.classList.toggle('dock-desk', desk);
  b.classList.toggle('dock-mob', !desk);
  b.classList.toggle('dock-open', ready && desk && CH.dockOpen);
  b.classList.toggle('sheet-open', ready && !desk && CH.sheetOpen);
  const dot = ready && anyUnread() ? '<span class="dot"></span>' : '';
  const f = $('#chatFab'); if (f) f.innerHTML = '💬' + dot;
  const t = $('#dockTab'); if (t) t.innerHTML = '💬<br>채<br>팅' + dot;
}
window.addEventListener('resize', () => { if (ME) { layoutDock(); if (chatVisible()) renderChatLog(); } });
function mountChatDock() {
  if ($('#chatDock')) return;
  const d = document.createElement('div'); d.id = 'chatDock';
  d.innerHTML = `<div class="dockhead"><b>💬 채팅</b><button class="sm" onclick="closeDock()" title="접기">✕</button></div>
    <div class="chanrow" id="chanList"></div><div class="chathead" id="chatHead"></div><div id="chatLog"></div><div class="chatin" id="chatIn"></div>`;
  document.body.appendChild(d);
  const f = document.createElement('button'); f.id = 'chatFab'; f.onclick = openDock; document.body.appendChild(f);
  const t = document.createElement('button'); t.id = 'dockTab'; t.onclick = openDock; document.body.appendChild(t);
  renderChatParts(); refreshInput();
}
function unmountChatDock() {
  ['chatDock', 'chatFab', 'dockTab'].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
  document.body.classList.remove('chat-on', 'dock-open', 'sheet-open');
}
function openDock() {
  if (isDesk()) { CH.dockOpen = true; try { localStorage.setItem('peccata_dock', '1'); } catch (e) {} }
  else CH.sheetOpen = true;
  CH.stick = true; layoutDock(); renderChatParts();
}
function closeDock() {
  if (isDesk()) { CH.dockOpen = false; try { localStorage.setItem('peccata_dock', '0'); } catch (e) {} }
  else CH.sheetOpen = false;
  layoutDock();
}
function renderChatParts() {
  if (!$('#chatDock')) return;
  const cl = $('#chanList'); if (cl) cl.innerHTML = chanListHtml(chanList());
  const hd = $('#chatHead'); if (hd) hd.innerHTML = chatHeadHtml();
  renderChatLog();
  const lk = isLocked(); if (CH.lastLock !== lk) { CH.lastLock = lk; refreshInput(); }
  layoutDock();
}
function openChan(id) {
  const ta = $('#chatText'); if (ta) CH.draft[CH.cur] = ta.value;
  CH.cur = id; CH.sel = null; CH.edit = null; CH.stick = true; CH.atBottom = true; CH.diceOpen = false; CH.pendingImg = '';
  if (!IS_ADMIN) CH.kind = id === 'ooc' ? 'ooc' : 'ic';
  const el = $('#chatLog'); if (el) delete el.dataset.init;
  renderChatParts(); refreshInput();
}

/* ---------- 메시지 표시 ---------- */
function mentionNames() {
  const s = new Set(['모두']);
  USERS.forEach(u => { if (u.name) s.add(u.name); if (u.ho) s.add(cname(u.ho)); });
  ALLC.forEach(c => s.add(cname(c)));
  return [...s].filter(Boolean).sort((a, b) => b.length - a.length);
}
function fmtText(t) {
  let h = esc(t);
  h = h.replace(/(\([^()\n]*\)|（[^（）\n]*）|\*[^*\n]+\*)/g, '<span class="paren">$1</span>');
  mentionNames().forEach(n => { const e = '@' + esc(n); if (h.includes(e)) h = h.split(e).join(`<span class="mention">${e}</span>`); });
  return h.replace(/\n/g, '<br>');
}
function speakerOf(m) {
  if (m.kind === 'narr') return { name: 'KP', sub: '나레이션' };
  if (m.kind === 'ooc') return { name: m.pname || '?', sub: 'OOC' };
  return { name: cname(m.code), sub: m.pname || '' };
}
function charImgOf(code) {
  if (!code) return '';
  const u = USERS.find(x => x.ho === code && x.charImg);
  return (u && u.charImg) || (PORTRAITS.tokens || {})[code] || (PORTRAITS.portraits || {})[code] || '';
}
function avatarHtml(code, name, uid) {
  const src = code ? charImgOf(code) : (uid && (userOf(uid) || {}).avatar) || '';
  return src ? `<img src="${src}" alt="">` : esc((name || '?').slice(0, 1));
}
function diceHtml(d) {
  const det = (d.terms || []).map(x => x.rolls ? `${esc(x.t)}[${x.rolls.join(',')}]` : esc(x.t)).join(' ');
  return `<div class="dice ${d.cls || ''}"><div class="muted" style="font-size:.78rem">🎲 ${esc(d.expr)}${d.skill != null ? ` · 기능치 ${d.skill}` : ''}</div>
    <div><b class="dtot">${d.total}</b> <span class="muted" style="font-size:.8rem">${det}</span>${d.res ? ` <span class="dres">${esc(d.res)}</span>` : ''}</div></div>`;
}
function msgHtml(m, prev) {
  if (m.deleted) return `<div class="msg sys"><span class="muted" style="font-size:.8rem">삭제된 메시지 · ${hhmm(m.at)}</span></div>`;
  const sp = speakerOf(m), mine = m.uid === ME.uid, sel = CH.sel === m.id;
  const body = `${m.text ? `<div class="tx">${fmtText(m.text)}</div>` : ''}${m.img ? `<img class="mimg" src="${m.img}" alt="" onclick="event.stopPropagation();viewImg('${m.id}')">` : ''}${m.dice ? diceHtml(m.dice) : ''}`;
  const acts = sel && (mine || IS_ADMIN) ? `<div class="macts">${mine && m.text && !m.dice ? `<button class="sm" onclick="event.stopPropagation();editMsg('${m.id}')">수정</button>` : ''}<button class="sm danger" onclick="event.stopPropagation();delMsg('${m.id}')">삭제</button></div>` : '';
  const time = `<span class="mt">${hhmm(m.at)}${m.edited ? ' · 수정됨' : ''}</span>`;
  const tome = (m.mentions || []).includes(ME.uid) ? ' tome' : '';
  if (m.kind === 'narr') return `<div class="msg narr${tome}" onclick="selMsg('${m.id}')"><div class="nb">${body}<div>${time}</div>${acts}</div></div>`;
  const grouped = prev && !prev.deleted && prev.kind !== 'narr' && prev.uid === m.uid && prev.code === m.code && prev.kind === m.kind && m.at - prev.at < 180000;
  const mname = m.kind === 'ic' ? cname(m.code) : (m.pname || '');
  return `<div class="msg ${m.kind}${mine ? ' mine' : ''}${grouped ? ' grp' : ''}${tome}" onclick="selMsg('${m.id}')">
    <div class="av">${grouped ? '' : avatarHtml(m.kind === 'ic' ? m.code : '', sp.name, m.kind === 'ooc' ? m.uid : '')}</div>
    <div class="mb">${grouped ? '' : `<div class="nm"><span onclick="event.stopPropagation();mentionInsert(${JSON.stringify(mname).replace(/"/g, '&quot;')})">${esc(sp.name)}</span> <small>${esc(sp.sub)}</small> ${time}</div>`}${body}${grouped && (m.edited || sel) ? time : ''}${acts}</div></div>`;
}
function renderChatLog() {
  const el = $('#chatLog'); if (!el) return;
  const l = CH.msgs[CH.cur] || [];
  const fresh = !el.dataset.init; el.dataset.init = '1';
  const wasBottom = fresh ? CH.atBottom !== false : (el.scrollHeight - el.scrollTop - el.clientHeight < 80);
  el.innerHTML = l.length ? l.map((m, i) => msgHtml(m, l[i - 1])).join('') : '<p class="muted" style="text-align:center;margin-top:30px">아직 대화가 없어요.</p>';
  const toBottom = () => { el.scrollTop = el.scrollHeight; };
  if (wasBottom || CH.stick) { toBottom(); el.querySelectorAll('img').forEach(i => i.addEventListener('load', () => { if (CH.atBottom) toBottom(); }, { once: true })); }
  else if (fresh) el.scrollTop = CH.scroll || 0;
  CH.stick = false;
  CH.atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  el.onscroll = () => { CH.scroll = el.scrollTop; CH.atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80; };
  const last = l[l.length - 1]; if (last && chatVisible()) setRead(CH.cur, last.at);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && ME) renderChatParts(); });
function selMsg(id) { CH.sel = CH.sel === id ? null : id; renderChatLog(); }
function viewImg(id) { const m = (CH.msgs[CH.cur] || []).find(x => x.id === id); if (m && m.img) modal(`<img src="${m.img}" style="width:100%;border-radius:8px"><button style="margin-top:10px;width:100%" onclick="closeModal()">닫기</button>`); }

/* ---------- 입력 ---------- */
function chatInputHtml() {
  if (isLocked() && !IS_ADMIN) return `<p class="muted" style="text-align:center;margin:8px 0">🔒 KP가 이 채널을 잠갔어요</p>`;
  const npcOpts = NPC_CODES.map(c => `<option value="${c}" ${CH.speaker === c ? 'selected' : ''}>${esc(cname(c))}</option>`).join('');
  const speaker = IS_ADMIN
    ? `<select class="spk" onchange="CH.speaker=this.value"><option value="narr" ${CH.speaker === 'narr' ? 'selected' : ''}>KP 나레이션</option><option value="ooc" ${CH.speaker === 'ooc' ? 'selected' : ''}>KP (OOC)</option>${myHo() ? `<option value="${myHo()}" ${CH.speaker === myHo() ? 'selected' : ''}>${esc(cname(myHo()))} (내 HO)</option>` : ''}${npcOpts}</select>`
    : `<div class="toggles"><button class="sm ${CH.kind === 'ic' ? 'on' : ''}" onclick="setKind('ic')">${esc(cname(myHo()))}</button><button class="sm ${CH.kind === 'ooc' ? 'on' : ''}" onclick="setKind('ooc')">OOC</button></div>`;
  const dice = CH.diceOpen ? `<div class="dicebar">${['1d100', '1d6', '1d3', '1d4', '1d8', '1d10', '1d20', '2d6', '3d6'].map(e => `<button class="sm" onclick="quickRoll('${e}')">${e}</button>`).join('')}
     <span class="row" style="flex:1 1 180px;gap:4px;flex-wrap:nowrap"><input id="skillIn" inputmode="numeric" placeholder="기능치" style="width:80px;padding:5px 8px" onkeydown="if(event.key==='Enter'){event.preventDefault();skillRoll()}"><button class="sm primary" onclick="skillRoll()">판정</button></span></div>` : '';
  return `${CH.edit ? `<div class="editbar">✏ 메시지 수정 중 <button class="sm" onclick="cancelEdit()">취소</button></div>` : ''}
   ${CH.pendingImg ? `<div class="editbar"><img src="${CH.pendingImg}" style="height:46px;border-radius:4px"> 첨부할 이미지 <button class="sm" onclick="CH.pendingImg='';refreshInput()">✕</button></div>` : ''}
   ${dice}
   <div class="inrow">
    <div class="spkw">${speaker}</div>
    <textarea id="chatText" rows="1" placeholder="${IS_ADMIN && CH.speaker === 'narr' ? '묘사를 적어 주세요' : '메시지 · (괄호)·*별표*는 회색 · /r 2d6 · /cc 65'}" oninput="CH.draft[CH.cur]=this.value;autoGrow(this)" onkeydown="chatKey(event)">${esc(CH.draft[CH.cur] || '')}</textarea>
    <label class="iconbtn" title="이미지">📷<input type="file" accept="image/*" style="display:none" onchange="chatImg(this)"></label>
    <button class="iconbtn" title="주사위" onclick="CH.diceOpen=!CH.diceOpen;refreshInput()">🎲</button>
    <button class="primary" style="flex:0 0 auto" onclick="chatSend()">${CH.edit ? '수정' : '전송'}</button>
   </div>`;
}
function refreshInput() { const ta = $('#chatText'); if (ta) CH.draft[CH.cur] = ta.value; const el = $('#chatIn'); if (el) el.innerHTML = chatInputHtml(); const t = $('#chatText'); if (t) autoGrow(t); }
function autoGrow(t) { t.style.height = 'auto'; t.style.height = Math.min(140, t.scrollHeight) + 'px'; }
function setKind(k) { CH.kind = k; refreshInput(); }
function chatKey(e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); chatSend(); } }
function mentionInsert(name) { const t = $('#chatText'); if (!t) return; t.value = (t.value ? t.value.replace(/\s*$/, ' ') : '') + '@' + name + ' '; CH.draft[CH.cur] = t.value; t.focus(); }
async function chatImg(inp) {
  const f = inp.files[0]; if (!f) return;
  const d = await compressImage(await readFile(f), 1000, .72);
  if (!d) return toast('이미지를 읽지 못했어요');
  if (d.length > 900000) return toast('이미지가 너무 커요');
  CH.pendingImg = d; refreshInput();
}
function cancelEdit() { CH.edit = null; const ta = $('#chatText'); if (ta) ta.value = ''; CH.draft[CH.cur] = ''; refreshInput(); }
function editMsg(id) { const m = (CH.msgs[CH.cur] || []).find(x => x.id === id); if (!m) return; CH.edit = id; CH.sel = null; const ta = $('#chatText'); if (ta) ta.value = m.text || ''; CH.draft[CH.cur] = m.text || ''; refreshInput(); renderChatLog(); const t = $('#chatText'); if (t) t.focus(); }
async function delMsg(id) {
  const m = (CH.msgs[CH.cur] || []).find(x => x.id === id); if (!m) return;
  if (!confirm('이 메시지를 삭제할까요?')) return;
  const p = `channels/${CH.cur}/msgs/${id}`;
  try { if (m.uid === ME.uid) await B.update(p, { deleted: true, text: '', img: '' }); else await B.del(p); } catch (e) { toast('삭제 실패: ' + (e.code || e.message)); }
  CH.sel = null;
}

/* ---------- 주사위 ---------- */
function judge(r, skill) {
  if (CONFIG.cocEdition === 7) {
    if (r === 1) return ['대성공', 'crit'];
    if (skill < 50 ? r >= 96 : r === 100) return ['대실패', 'fumble'];
    if (r <= Math.floor(skill / 5)) return ['극단적 성공', 'ext'];
    if (r <= Math.floor(skill / 2)) return ['어려운 성공', 'hard'];
    return r <= skill ? ['보통 성공', 'ok'] : ['실패', 'fail'];
  }
  if (r <= 5) return ['크리티컬', 'crit'];
  if (r >= 96) return ['펌블', 'fumble'];
  return r <= skill ? ['성공', 'ok'] : ['실패', 'fail'];
}
function rollDice(expr) {
  const e = String(expr).replace(/\s/g, '').toLowerCase().replace(/＜/g, '<').replace(/＝/g, '=').replace(/ｄ/g, 'd');
  const mm = e.match(/^([0-9d+\-]+?)(?:(<=|<)(\d+))?$/); if (!mm) return null;
  const body = mm[1], re = /([+-]?)(\d*d\d+|\d+)/g; let pos = 0, t, total = 0; const terms = [];
  while ((t = re.exec(body))) {
    if (t.index !== pos) return null; pos = re.lastIndex;
    const sign = t[1] === '-' ? -1 : 1, lbl = (t[1] || (terms.length ? '+' : '')) + t[2];
    if (t[2].includes('d')) {
      let [n, s] = t[2].split('d'); n = +(n || 1); s = +s;
      if (n < 1 || n > 100 || s < 1 || s > 1000) return null;
      const rolls = Array.from({ length: n }, () => 1 + Math.floor(rnd() * s));
      terms.push({ t: lbl, rolls }); total += sign * rolls.reduce((a, b) => a + b, 0);
    } else { terms.push({ t: lbl }); total += sign * +t[2]; }
  }
  if (pos !== body.length || !terms.length || !terms.some(x => x.rolls)) return null;
  const d = { expr: e, terms, total };
  if (mm[3]) { const sk = +mm[3]; d.skill = mm[2] === '<' ? sk - 1 : sk; const [res, cls] = judge(total, d.skill); d.res = res; d.cls = cls; }
  return d;
}
function quickRoll(expr) { sendMsg({ dice: rollDice(expr), text: '' }); }
function skillRoll() { const v = +(($('#skillIn') || {}).value || 0); if (!v || v < 1 || v > 200) return toast('기능치를 입력해 주세요'); const t = $('#chatText'); const note = t ? t.value.trim() : ''; if (t) t.value = ''; CH.draft[CH.cur] = ''; sendMsg({ dice: rollDice('1d100<=' + v), text: note }); }

/* ---------- 보내기 ---------- */
function baseMsg() {
  const kind = IS_ADMIN ? (CH.speaker === 'narr' ? 'narr' : CH.speaker === 'ooc' ? 'ooc' : 'ic') : (CH.kind === 'ooc' ? 'ooc' : 'ic');
  const code = IS_ADMIN ? (kind === 'ic' ? CH.speaker : '') : (kind === 'ic' ? myHo() : '');
  return { uid: ME.uid, pname: PROF.name, code, kind, text: '', at: Date.now() };
}
function chanMemberUids(id) {
  if (id.startsWith('dm_')) return [dmOther(id)];
  const m = CH.meta[id];
  if (m && m.type === 'secret') return USERS.filter(u => isAdminEmail(u.email) || (m.members || []).includes(u.ho)).map(u => u.id);
  return USERS.map(u => u.id);
}
function computeMentions(text, id) {
  if (!text || !text.includes('@')) return [];
  const out = new Set(), members = chanMemberUids(id);
  if (text.includes('@모두')) members.forEach(u => out.add(u));
  USERS.forEach(u => { const ns = [u.name, u.ho && cname(u.ho)].filter(Boolean); if (ns.some(n => text.includes('@' + n)) && members.includes(u.id)) out.add(u.id); });
  out.delete(ME.uid);
  return [...out];
}
async function sendMsg(extra) {
  const ch = CH.cur;
  if (isLocked(ch) && !IS_ADMIN) return toast('잠긴 채널이에요');
  const msg = Object.assign(baseMsg(), extra);
  if (CH.pendingImg) { msg.img = CH.pendingImg; CH.pendingImg = ''; }
  if (!msg.text && !msg.img && !msg.dice) return;
  msg.mentions = computeMentions(msg.text, ch);
  CH.stick = true;
  try { await B.add(`channels/${ch}/msgs`, clean(msg)); }
  catch (e) { toast('전송 실패: ' + (e.code || e.message)); return; }
  refreshInput();
  if (CONFIG.vapidPublicKey) {
    const to = new Set(msg.mentions); if (ch.startsWith('dm_')) to.add(dmOther(ch)); to.delete(ME.uid);
    if (to.size) {
      const sp = speakerOf(msg).name;
      const body = (msg.text || (msg.dice ? `🎲 ${msg.dice.expr} → ${msg.dice.total}${msg.dice.res ? ' ' + msg.dice.res : ''}` : '🖼 이미지')).slice(0, 120);
      B.add('pings', { from: ME.uid, to: [...to], title: ch.startsWith('dm_') ? `✉ ${PROF.name}의 귓속말` : `💬 ${chanTitle(ch)} · ${sp}`, body, tag: 'chat-' + ch, at: Date.now() }).catch(() => {});
    }
  }
}
async function chatSend() {
  const ta = $('#chatText'); const t = ta ? ta.value.trim() : '';
  const ch = CH.cur;
  if (CH.edit) {
    if (!t) return toast('내용을 입력해 주세요');
    try { await B.update(`channels/${ch}/msgs/${CH.edit}`, { text: t, edited: true }); } catch (e) { return toast('수정 실패: ' + (e.code || e.message)); }
    CH.edit = null; CH.draft[ch] = ''; if (ta) ta.value = ''; refreshInput(); return;
  }
  if (!t && !CH.pendingImg) return;
  let m, extra = { text: t };
  if ((m = t.match(/^\/(?:r|roll|굴림)\s+(\S+)\s*([\s\S]*)$/i))) { const d = rollDice(m[1]); if (!d) return toast('주사위 식을 확인해 주세요 (예: 2d6+1, 1d100<=65)'); extra = { dice: d, text: m[2].trim() }; }
  else if ((m = t.match(/^\/(?:cc|판정)\s+(\d+)\s*([\s\S]*)$/i))) extra = { dice: rollDice('1d100<=' + m[1]), text: m[2].trim() };
  else if ((m = t.match(/^\/ooc\s+([\s\S]+)$/i))) extra = { text: m[1].trim(), kind: 'ooc', code: '' };
  CH.draft[ch] = ''; if (ta) { ta.value = ''; autoGrow(ta); }
  await sendMsg(extra);
  const t2 = $('#chatText'); if (t2) t2.focus();
}

/* ---------- 로그 ---------- */
async function exportLog() {
  const id = CH.cur;
  let l = CH.msgs[id] || [];
  try { const all = await B.getCol(`channels/${id}/msgs`); if (all && all.length) l = all.sort((a, b) => a.at - b.at); } catch (e) {}
  const lines = l.filter(m => !m.deleted).map(m => {
    const sp = speakerOf(m);
    const d = m.dice ? ` 🎲 ${m.dice.expr} → ${m.dice.total}${m.dice.res ? ' (' + m.dice.res + ')' : ''}` : '';
    const pre = m.kind === 'narr' ? '[KP] ' : m.kind === 'ooc' ? `[OOC] ${sp.name}: ` : `${sp.name}: `;
    return `[${fullTime(m.at)}] ${pre}${m.text || ''}${m.img ? ' [이미지]' : ''}${d}`;
  });
  window._logTxt = `# ${chanTitle(id)} 로그 (${new Date().toLocaleString()})\n\n` + lines.join('\n');
  window._logName = chanTitle(id).replace(/[\\/:*?"<>|\s]+/g, '_') + '_log.txt';
  modal(`<h2 style="color:var(--gold2);margin-top:0">로그 내보내기</h2><p class="muted">${lines.length}개 메시지</p>
   <textarea readonly style="min-height:260px;font-size:.8rem">${esc(window._logTxt)}</textarea>
   <div class="row" style="margin-top:8px"><button onclick="copyLog()">복사</button><button onclick="saveLog()">파일로 저장</button><button onclick="closeModal()">닫기</button></div>`);
}
function copyLog() { try { navigator.clipboard.writeText(window._logTxt).then(() => toast('복사했어요'), () => toast('복사가 막혀 있어요. 위 글을 길게 눌러 복사해 주세요')); } catch (e) { toast('복사가 막혀 있어요'); } }
function saveLog() { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([window._logTxt], { type: 'text/plain;charset=utf-8' })); a.download = window._logName; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

/* ---------- KP: 채널 관리 ---------- */
let CE = null;
function chanEdit(id) { const c = id ? CH.meta[id] : null; CE = { id: id || null, name: c ? c.name : '', members: c ? [...(c.members || [])] : [], locked: c ? !!c.locked : false }; chanEditRender(); }
function chanEditRender() {
  modal(`<h2 style="color:var(--gold2);margin-top:0">${CE.id ? '비밀 채널 설정' : '비밀 채널 만들기'}</h2>
   <label class="f">채널 이름</label><input id="ceName" value="${esc(CE.name)}" oninput="CE.name=this.value" placeholder="예: 지하실 밀담, 늑대의 밤">
   <label class="f">참여할 HO (KP는 항상 참여)</label><div class="toggles">${HO_CODES.map(c => `<button class="${CE.members.includes(c) ? 'on' : ''}" onclick="CE.members=CE.members.includes('${c}')?CE.members.filter(x=>x!=='${c}'):[...CE.members,'${c}'];chanEditRender()">${esc(cname(c))}</button>`).join('')}</div>
   <label class="muted" style="display:block;margin:10px 0"><input type="checkbox" style="width:auto" ${CE.locked ? 'checked' : ''} onchange="CE.locked=this.checked"> 잠금 (KP만 발언)</label>
   <div class="row" style="margin-top:12px">${CE.id ? `<button class="danger" onclick="chanDelete()">채널 삭제</button>` : ''}<button onclick="closeModal()">취소</button><button class="primary" onclick="chanSave()">저장</button></div>`);
}
async function syncChatIndex() {
  const l = (await B.getCol('channels')).filter(c => c.type === 'secret');
  await Promise.all(HO_CODES.map(ho => B.set('chatIndex/' + ho, { ids: l.filter(c => (c.members || []).includes(ho)).map(c => c.id) })));
}
async function chanSave() {
  const name = (CE.name || '').trim(); if (!name) return toast('채널 이름을 적어 주세요');
  if (!CE.members.length) return toast('참여할 HO를 골라 주세요');
  let id = CE.id;
  try {
    if (id) await B.set('channels/' + id, { name, members: CE.members, locked: CE.locked }, true);
    else id = await B.add('channels', { name, type: 'secret', members: CE.members, locked: CE.locked, at: Date.now() });
    await syncChatIndex();
  } catch (e) { return toast('저장 실패: ' + (e.code || e.message)); }
  closeModal(); toast('저장했어요');
  if (!CE.id) { CH.meta[id] = CH.meta[id] || { id, name, type: 'secret', members: CE.members, locked: CE.locked, at: Date.now() }; chanSub(id); openChan(id); }
}
async function chanDelete() {
  if (!confirm('이 비밀 채널을 삭제할까요? 참여자 목록에서 사라져요.')) return;
  await B.del('channels/' + CE.id); await syncChatIndex();
  closeModal(); if (CH.cur === CE.id) openChan('rp');
}
function toggleLock(id) { B.set('channels/' + id, { locked: !isLocked(id) }, true).catch(e => toast('실패: ' + (e.code || e.message))); }

if (typeof ME !== 'undefined' && ME) chatOnAuth(ME);
