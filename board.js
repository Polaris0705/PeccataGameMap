/* ================= 🧵 추리 보드 =================
   boards/{주인 uid} { owner, who:[같이 쓰는 uid], cards:{id:카드|null}, links:{id:{a,b,label}|null}, at }
   카드: { t:'memo'|'photo'|'person'|'item', x, y, z, text, col, img, cap, ho, name, sub, itemId, iname, by, at }
   주인 + 같이 쓰는 사람 = 고치기 · KP = 모두 보기 (고치기는 자기 보드만)
================================================ */
const BW = 1200, BH = 900, BD_MAXPH = 15, BD_MAX = 900000;
const BD_W = { memo: 150, photo: 150, person: 140, item: 132 };
const BD_COLS = [['#fff4b8', '노랑'], ['#fbf8f0', '흰'], ['#ffd9de', '분홍'], ['#d8ecff', '파랑'], ['#dff2d4', '초록']];
let BOARDS = {}, BD_SHARED = [];
const BD = { cur: null, z: +(localStorage.getItem('peccata_bdz') || 0) || (innerWidth < 640 ? .6 : .8), link: false, la: null, full: false, sx: null, sy: null, drag: null, ed: null };

(function bdCss() {
  const s = document.createElement('style'); s.textContent = `
#bdBox.bdfull{position:fixed;inset:0;z-index:28;margin:0!important;background:var(--bg);display:flex;flex-direction:column;padding:calc(env(safe-area-inset-top) + 6px) 6px calc(env(safe-area-inset-bottom) + 6px);border-radius:0}
#bdBox.bdfull .bdwrap{flex:1;height:auto}
.bdbar{display:flex;flex-wrap:wrap;gap:4px;align-items:center;margin-bottom:6px}
.bdwrap{position:relative;height:62vh;overflow:auto;border:10px solid #6b4426;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,.3);background-color:#c29466;background-image:radial-gradient(rgba(90,55,25,.38) 1px,transparent 1.6px),radial-gradient(rgba(255,236,205,.28) 1px,transparent 1.6px),radial-gradient(rgba(70,40,15,.2) 1.5px,transparent 2px);background-size:7px 7px,11px 11px,23px 19px;background-position:0 0,3px 5px,9px 2px;background-attachment:local;-webkit-overflow-scrolling:touch}
.bdsz{position:relative}
.bds{position:absolute;left:0;top:0;width:${BW}px;height:${BH}px;transform-origin:0 0}
.bdc{position:absolute;color:#2a2018;font-size:14px;line-height:1.35;padding:16px 9px 9px;box-shadow:1px 3px 5px rgba(40,20,5,.45);transform:rotate(var(--r,0deg));transform-origin:50% 8px;user-select:none;-webkit-user-select:none;touch-action:none;cursor:grab;word-break:keep-all;overflow-wrap:anywhere}
.bdc.bdsel{outline:3px solid #b0202a;outline-offset:2px}
.bdc.bddrag{cursor:grabbing;box-shadow:3px 8px 14px rgba(40,20,5,.5)}
.bdc .bdt{white-space:pre-wrap}
.bd-memo{background-image:repeating-linear-gradient(transparent 0 18px,rgba(60,90,150,.18) 18px 19px);background-position:0 15px}
.bd-photo{background:#fbfaf6;padding:12px 8px 8px}
.bd-photo img{display:block;width:100%;max-height:160px;object-fit:cover;background:#333;pointer-events:none}
.bd-photo .bdcap{margin-top:5px;text-align:center;font-size:12px}
.bd-person{background:#e9d6a8;border-top:14px solid #d8c08a;padding-top:8px}
.bd-person .bdst{font-size:10px;letter-spacing:.15em;color:#8a2a2a;border:1px solid #8a2a2a;display:inline-block;padding:0 4px;transform:rotate(-4deg);margin-bottom:4px}
.bd-person .bdnm{font-weight:bold;font-size:15px}
.bd-person .bdsil{float:right;width:30px;height:36px;margin:0 0 4px 6px;background:radial-gradient(circle at 50% 30%,#6a5a48 0 8px,transparent 8.5px),radial-gradient(ellipse at 50% 105%,#6a5a48 0 15px,transparent 15.5px),#cbb98e;border:1px solid #9a8660}
.bd-item{background:#f6f1e4;border-radius:3px 14px 14px 3px;padding-left:20px}
.bd-item::before{content:'';position:absolute;left:6px;top:50%;width:7px;height:7px;margin-top:-4px;border-radius:50%;background:#c29466;box-shadow:inset 0 0 0 1px #7a5a3a}
.bd-item img{width:44px;height:44px;object-fit:contain;float:left;margin:0 6px 2px 0;image-rendering:pixelated;pointer-events:none}
.bd-item .bdnm{font-weight:bold}
.bdby{font-size:10px;color:#6a5a48;margin-top:4px;text-align:right}
.bdsv{position:absolute;left:0;top:0;pointer-events:none;overflow:visible}
.bdsv .bdhit{pointer-events:stroke;cursor:pointer}
.bdsv text{font-size:13px;paint-order:stroke;stroke:#f6efdc;stroke-width:4px;fill:#7a1418;font-weight:bold}
.bdhint{font-size:.85rem;color:var(--gold2)}
.bdchips{display:flex;flex-wrap:wrap;gap:4px;max-height:40vh;overflow:auto}`; document.head.appendChild(s);
})();

/* ---------- 구독 ---------- */
function boardOnAuth(sub) {
  BOARDS = {}; BD.cur = null;
  if (IS_ADMIN) sub(B.onCol('boards', l => { BOARDS = {}; l.forEach(d => BOARDS[d.id] = d); bdSoft(); }));
  else {
    sub(B.onDoc('boards/' + ME.uid, d => { if (d) BOARDS[ME.uid] = Object.assign({ id: ME.uid }, d); else delete BOARDS[ME.uid]; bdSoft(); }));
    sub(B.onHas('boards', 'who', ME.uid, l => { Object.keys(BOARDS).forEach(k => { if (k !== ME.uid) delete BOARDS[k]; }); l.forEach(d => { if (d.id !== ME.uid) BOARDS[d.id] = d; }); bdSoft(); }));
  }
}
function bdSoft() { if (tab === 'board') softRender(); }

/* ---------- 도우미 ---------- */
const bdOwnName = uid => { if (uid === ME.uid) return '내 보드'; const u = userOf(uid); return u ? (u.ho ? hoName(u.ho) + ' · ' : '') + uname(u) : '?'; };
const bdDoc = uid => BOARDS[uid] || (uid === ME.uid ? { id: ME.uid, owner: ME.uid, who: [], cards: {}, links: {} } : null);
const bdCards = d => Object.entries((d && d.cards) || {}).filter(([, c]) => c).map(([id, c]) => Object.assign({ id }, c));
const bdLinks = d => Object.entries((d && d.links) || {}).filter(([, l]) => l).map(([id, l]) => Object.assign({ id }, l));
const bdCanEdit = uid => { if (uid === ME.uid) return true; const d = BOARDS[uid]; return !IS_ADMIN && !!(d && (d.who || []).includes(ME.uid)); };
const bdRot = id => { let h = 0; for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) | 0; return ((Math.abs(h) % 7) - 3) * .8; };
const bdRid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function bdList() {
  const ids = Object.keys(BOARDS).filter(k => k !== ME.uid && (!IS_ADMIN || bdCards(BOARDS[k]).length > 0));
  const mine = !IS_ADMIN || (PROF && PROF.ho) || BOARDS[ME.uid];
  return (mine ? [ME.uid] : []).concat(ids.sort((a, b) => { const ua = userOf(a), ub = userOf(b); return String(ua && ua.ho || 'z').localeCompare(String(ub && ub.ho || 'z')); }));
}
function bdCurId() { const l = bdList(); if (!BD.cur || !l.includes(BD.cur)) BD.cur = l[0] || null; return BD.cur; }
function bdPin(c) { return { x: c.x + (BD_W[c.t] || 140) / 2, y: c.y + 7 }; }

/* ---------- 화면 ---------- */
VIEWS.board = () => {
  const uid = bdCurId();
  if (!uid) return `<div class="panel"><h2>🧵 추리 보드</h2><p class="muted">아직 만든 추리 보드 없음.<br>PL이 단서를 붙이기 시작하면 여기서 볼 수 있음.</p></div>`;
  const d = bdDoc(uid), ed = bdCanEdit(uid), own = uid === ME.uid, l = bdList(), cards = bdCards(d).sort((a, b) => (a.z || 0) - (b.z || 0));
  const who = (d.who || []).filter(u => userOf(u));
  const z = BD.z;
  return `<div class="panel${BD.full ? ' bdfull' : ''}" id="bdBox">
  ${BD.full ? '' : `<h2 style="margin-bottom:4px">🧵 추리 보드</h2><p class="muted" style="margin:0 0 8px;word-break:keep-all">세션에서 얻은 단서를 붙이고 붉은 실로 잇는 조사판.<br>카드를 끌어 옮기고, 눌러서 고침.</p>`}
  ${l.length > 1 ? `<div class="bdbar">${l.map(k => `<button class="sm ${k === uid ? 'primary' : ''}" onclick="BD.cur='${k}';BD.la=null;BD.sx=BD.sy=0;render()">${k === ME.uid ? '📌 ' : '👥 '}${esc(bdOwnName(k))}</button>`).join('')}</div>` : ''}
  <div class="bdbar">
    ${ed ? `<button class="sm" onclick="bdNew('memo')">＋ 메모</button><button class="sm" onclick="bdNew('photo')">📷 사진</button><button class="sm" onclick="bdNew('person')">👤 인물</button><button class="sm" onclick="bdNew('item')">🎒 소지품</button>
    <button class="sm ${BD.link ? 'primary' : ''}" onclick="bdLinkMode()">🧵 실 잇기</button>` : `<span class="muted" style="font-size:.85rem">👀 보기만</span>`}
    <span style="flex:1"></span>
    <button class="sm" onclick="bdZoom(-1)">－</button><span class="muted" style="font-size:.8rem;min-width:2.6em;text-align:center">${Math.round(z * 100)}%</span><button class="sm" onclick="bdZoom(1)">＋</button>
    <button class="sm" onclick="bdFull()">${BD.full ? '✕ 닫기' : '⤢ 크게'}</button>
    ${own && !IS_ADMIN ? `<button class="sm" onclick="bdShare()">👥 같이 쓰기${who.length ? ' ' + who.length : ''}</button>` : ''}
  </div>
  ${BD.link ? `<div class="bdhint">${BD.la ? '🧵 이을 다음 카드를 누르기 (같은 카드 = 취소)' : '🧵 실을 이을 첫 카드를 누르기'}</div>` : ''}
  ${own && who.length ? `<div class="muted" style="font-size:.8rem;margin-bottom:4px">같이 쓰는 사람: ${who.map(u => esc(bdOwnName(u))).join(', ')}</div>` : ''}
  ${!own && d.who ? `<div class="muted" style="font-size:.8rem;margin-bottom:4px">${esc(bdOwnName(uid))}의 보드${ed ? ' · 같이 쓰는 중' : ''}</div>` : ''}
  <div class="bdwrap" id="bdWrap" onscroll="BD.sx=this.scrollLeft;BD.sy=this.scrollTop" onclick="bdBgTap(event)">
    <div class="bdsz" style="width:${Math.round(BW * z)}px;height:${Math.round(BH * z)}px"><div class="bds" id="bdS" style="transform:scale(${z})">
      ${cards.map((c, i) => bdCardHtml(c, i + 1, uid)).join('')}
      <svg class="bdsv" id="bdSvL" width="${BW}" height="${BH}" style="z-index:0">${bdSvg(d, null, 'l')}</svg>
      <svg class="bdsv" id="bdSv" width="${BW}" height="${BH}" style="z-index:${cards.length + 5}">${bdSvg(d, null, 'p')}</svg>
    </div></div>
  </div>
  ${cards.length ? '' : `<p class="muted" style="font-size:.85rem;margin:6px 0 0">${ed ? '위 버튼으로 첫 단서를 붙여 보기.' : '아직 붙은 단서 없음.'}</p>`}
  </div>`;
};
function bdCardHtml(c, zi, uid) {
  const w = BD_W[c.t] || 140, sel = BD.link && BD.la === c.id ? ' bdsel' : '', bg = c.t === 'memo' ? `background-color:${c.col || BD_COLS[0][0]};` : '', ta = bdCanEdit(uid) ? '' : 'touch-action:pan-x pan-y;';
  return `<div class="bdc bd-${c.t}${sel}" id="bdc_${c.id}" style="left:${c.x}px;top:${c.y}px;width:${w}px;z-index:${zi};--r:${bdRot(c.id)}deg;${bg}${ta}" onpointerdown="bdDown(event,'${c.id}')">${bdInner(c, uid)}</div>`;
}
function bdInner(c, uid) {
  const by = c.by && c.by !== uid ? `<div class="bdby">✍ ${esc(bdOwnName(c.by) === '내 보드' ? '나' : bdOwnName(c.by))}</div>` : '';
  let inner = '';
  if (c.t === 'memo') inner = `<div class="bdt">${esc(c.text || '')}</div>`;
  else if (c.t === 'photo') inner = `${c.img ? `<img src="${c.img}" alt="">` : '<div style="height:90px;background:#555"></div>'}${c.cap ? `<div class="bdcap">${esc(c.cap)}</div>` : ''}`;
  else if (c.t === 'person') inner = `<div class="bdst">인물</div><div class="bdsil"></div><div class="bdnm">${esc(c.ho ? cname(c.ho) : c.name || '?')}</div>${c.sub ? `<div class="bdt" style="font-size:12px;margin-top:3px">${esc(c.sub)}</div>` : ''}`;
  else if (c.t === 'item') { const it = c.itemId && ITEMS.find(x => x.id === c.itemId); inner = `${it && it.img ? `<img src="${it.img}" alt="">` : '<div style="float:left;font-size:30px;margin-right:6px">📦</div>'}<div class="bdnm">${esc(c.iname || (it && it.name) || '물건')}</div>${c.sub ? `<div class="bdt" style="font-size:12px;margin-top:3px;clear:both">${esc(c.sub)}</div>` : ''}`; }
  return inner + by;
}
function bdSvg(d, mv, part) {
  const cards = {}; bdCards(d).forEach(c => cards[c.id] = mv && mv.id === c.id ? Object.assign({}, c, { x: mv.x, y: mv.y }) : c);
  const ed = bdCanEdit(BD.cur);
  const ls = bdLinks(d).filter(l => cards[l.a] && cards[l.b]).map(l => {
    const a = bdPin(cards[l.a]), b = bdPin(cards[l.b]), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 + Math.min(40, Math.hypot(b.x - a.x, b.y - a.y) * .08), p = `M${a.x},${a.y} Q${mx},${my + 10} ${b.x},${b.y}`;
    return `<path d="${p}" stroke="rgba(40,10,5,.35)" stroke-width="3" fill="none" transform="translate(1.5,2.5)"/><path d="${p}" stroke="#b0202a" stroke-width="2.6" fill="none"/>${ed ? `<path class="bdhit" d="${p}" stroke="transparent" stroke-width="18" fill="none" onclick="event.stopPropagation();bdLinkEdit('${l.id}')"/>` : ''}${l.label ? `<text x="${mx}" y="${my + 4}" text-anchor="middle">${esc(l.label)}</text>` : ''}`;
  }).join('');
  const pins = Object.values(cards).map(c => { const p = bdPin(c); return `<circle cx="${p.x + 1}" cy="${p.y + 2}" r="6" fill="rgba(0,0,0,.3)"/><circle cx="${p.x}" cy="${p.y}" r="6" fill="${c.t === 'person' ? '#2a4a7a' : c.t === 'photo' ? '#d8a830' : '#c0282e'}"/><circle cx="${p.x - 2}" cy="${p.y - 2}" r="2" fill="rgba(255,255,255,.7)"/>`; }).join('');
  return part === 'l' ? ls : pins;
}
function bdAfter() {
  if (tab !== 'board') { if (BD.full) { BD.full = false; document.body.style.overflow = ''; } return; }
  const w = document.getElementById('bdWrap'), b = document.getElementById('bdBox'); if (b) b.className = 'panel' + (BD.full ? ' bdfull' : '');
  if (w) { if (BD.sx == null) { w.scrollLeft = 0; w.scrollTop = 0; } else { w.scrollLeft = BD.sx; w.scrollTop = BD.sy; } }
}
if (typeof roomAfter === 'function') { const _ra = roomAfter; roomAfter = function () { _ra(); bdAfter(); }; }

function bdZoom(k) { const w = $('#bdWrap'), z0 = BD.z, z = Math.max(.3, Math.min(1.6, Math.round((z0 + k * .1) * 10) / 10)); if (z === z0) return;
  if (w) { const cx = (w.scrollLeft + w.clientWidth / 2) / z0, cy = (w.scrollTop + w.clientHeight / 2) / z0; BD.sx = Math.max(0, cx * z - w.clientWidth / 2); BD.sy = Math.max(0, cy * z - w.clientHeight / 2); }
  BD.z = z; try { localStorage.setItem('peccata_bdz', z); } catch (e) {} render(); }
function bdFull() { BD.full = !BD.full; document.body.style.overflow = BD.full ? 'hidden' : ''; render(); }
function bdLinkMode() { BD.link = !BD.link; BD.la = null; render(); }
function bdBgTap(ev) { if (BD.link && BD.la && ev.target.id === 'bdS') { BD.la = null; render(); } }

/* ---------- 끌기 · 누르기 ---------- */
function bdDown(ev, id) {
  if (ev.button > 0) return; const uid = BD.cur, d = bdDoc(uid), c = bdCards(d).find(x => x.id === id); if (!c) return;
  const ed = bdCanEdit(uid); ev.stopPropagation();
  BD.drag = { id, x0: ev.clientX, y0: ev.clientY, cx: c.x, cy: c.y, moved: false, ed, el: ev.currentTarget, pid: ev.pointerId };
  if (ed) { window.GAME_LOCK = true; try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (e) {} ev.preventDefault(); }
  addEventListener('pointermove', bdMove); addEventListener('pointerup', bdUp); addEventListener('pointercancel', bdUp);
}
function bdMove(ev) {
  const g = BD.drag; if (!g || ev.pointerId !== g.pid) return; const dx = (ev.clientX - g.x0) / BD.z, dy = (ev.clientY - g.y0) / BD.z;
  if (!g.moved && Math.abs(ev.clientX - g.x0) + Math.abs(ev.clientY - g.y0) < 7) return;
  if (!g.ed || BD.link) return; g.moved = true;
  const w = BD_W[(bdCards(bdDoc(BD.cur)).find(x => x.id === g.id) || {}).t] || 140;
  g.nx = Math.round(Math.max(0, Math.min(BW - w, g.cx + dx))); g.ny = Math.round(Math.max(0, Math.min(BH - 60, g.cy + dy)));
  g.el.style.left = g.nx + 'px'; g.el.style.top = g.ny + 'px'; g.el.classList.add('bddrag'); g.el.style.zIndex = ((+($('#bdSv') || { style: {} }).style.zIndex) || 999) - 1;
  const mv = { id: g.id, x: g.nx, y: g.ny }, sv = $('#bdSv'), sl = $('#bdSvL'); if (sv) sv.innerHTML = bdSvg(bdDoc(BD.cur), mv, 'p'); if (sl) sl.innerHTML = bdSvg(bdDoc(BD.cur), mv, 'l');
  const wr = $('#bdWrap'); if (wr) { const r = wr.getBoundingClientRect(), e = 30; if (ev.clientX > r.right - e) wr.scrollLeft += 12; else if (ev.clientX < r.left + e) wr.scrollLeft -= 12; if (ev.clientY > r.bottom - e) wr.scrollTop += 12; else if (ev.clientY < r.top + e) wr.scrollTop -= 12; }
}
async function bdUp(ev) {
  const g = BD.drag; if (!g || (ev.pointerId !== g.pid)) return; BD.drag = null;
  removeEventListener('pointermove', bdMove); removeEventListener('pointerup', bdUp); removeEventListener('pointercancel', bdUp);
  window.GAME_LOCK = false;
  if (g.moved) {
    const uid = BD.cur; try { await bdEnsure(uid); await B.update('boards/' + uid, { [`cards.${g.id}.x`]: g.nx, [`cards.${g.id}.y`]: g.ny, [`cards.${g.id}.z`]: Date.now(), at: Date.now() }); } catch (e) { toast('실패: ' + (e.code || e.message)); }
    softRender(); return;
  }
  if (typeof pendingRender !== 'undefined' && pendingRender) softRender();
  if (ev.type === 'pointercancel') return;
  if (BD.link && g.ed) return bdLinkTap(g.id);
  bdEdit(g.id);
}

/* ---------- 저장 ---------- */
async function bdEnsure(uid) { if (uid !== ME.uid || BOARDS[uid]) return; await B.set('boards/' + uid, { owner: uid, who: [], cards: {}, links: {}, at: Date.now() }); BOARDS[uid] = { id: uid, owner: uid, who: [], cards: {}, links: {} }; }
function bdTooBig(d, add) { return JSON.stringify(d || {}).length + (add || 0) > BD_MAX; }
async function bdPut(uid, upd) { await bdEnsure(uid); upd.at = Date.now(); await B.update('boards/' + uid, upd); }
function bdCenter(w) { const wr = $('#bdWrap'), z = BD.z, cx = wr ? (wr.scrollLeft + wr.clientWidth / 2) / z : 300, cy = wr ? (wr.scrollTop + wr.clientHeight / 2) / z : 200;
  const cs = bdCards(bdDoc(BD.cur)), cl = (x, y) => ({ x: Math.round(Math.max(0, Math.min(BW - w, x))), y: Math.round(Math.max(0, Math.min(BH - 120, y))) });
  const free = p => cs.every(c => p.x + w < c.x - 6 || p.x > c.x + (BD_W[c.t] || 140) + 6 || p.y + 100 < c.y - 6 || p.y > c.y + 110);
  for (let r = 0; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const p = cl(cx - w / 2 + dx * (w + 16), cy - 60 + dy * 126); if (free(p)) return p; }
  return cl(cx - w / 2 + (Math.random() - .5) * 60, cy - 60 + (Math.random() - .5) * 60); }

/* ---------- 카드 고치기 ---------- */
function bdNew(t) { BD.ed = { id: null, t, col: BD_COLS[0][0], img: '', ho: '', itemId: '' }; bdModal(); }
function bdEdit(id) { const c = bdCards(bdDoc(BD.cur)).find(x => x.id === id); if (!c) return; BD.ed = Object.assign({}, c); bdModal(); }
function bdModal() {
  const e = BD.ed, ed = bdCanEdit(BD.cur), T = { memo: '📝 메모', photo: '📷 사진', person: '👤 인물', item: '🎒 소지품' }[e.t];
  if (!ed) return modal(`<h2 style="color:var(--gold2);margin-top:0">${T}</h2><div style="background:#c29466;padding:16px;border-radius:6px;display:flex;justify-content:center"><div class="bdc bd-${e.t}" style="position:relative;width:${Math.round((BD_W[e.t] || 140) * 1.6)}px;font-size:15px;--r:0deg;${e.t === 'memo' ? `background-color:${e.col || BD_COLS[0][0]}` : ''};cursor:default">${bdInner(e, BD.cur)}</div></div><div class="row" style="margin-top:10px"><button class="primary" onclick="closeModal()">닫기</button></div>`);
  let f = '';
  if (e.t === 'memo') f = `<label class="f">내용</label><textarea id="bdTx" rows="5" maxlength="300" placeholder="예: 서재 시계가 3시에 멈춰 있었다">${esc(e.text || '')}</textarea>
    <label class="f">종이 색</label><div class="toggles" id="bdCol">${BD_COLS.map(([c, n]) => `<span class="chip ${e.col === c ? 'on' : ''}" style="background:${c};color:#2a2018" onclick="BD.ed.col='${c}';document.querySelectorAll('#bdCol .chip').forEach(x=>x.classList.remove('on'));this.classList.add('on')">${n}</span>`).join('')}</div>`;
  else if (e.t === 'photo') f = `<label class="f">사진</label><div class="row" style="gap:6px;align-items:center"><button class="sm" onclick="bdImg()">📷 고르기</button><span id="bdImI" class="muted">${e.img ? '있음' : '없음'}</span></div>
    <div id="bdImP">${e.img ? `<img src="${e.img}" style="max-width:100%;max-height:30vh;margin-top:6px;border-radius:4px">` : ''}</div>
    <label class="f">한 줄 설명 (선택)</label><input id="bdCap" maxlength="60" value="${esc(e.cap || '')}" placeholder="예: 2층 복도의 초상화">`;
  else if (e.t === 'person') f = `<label class="f">누구</label><div class="toggles" id="bdHo">${HO_CODES.map(c => `<span class="chip ${e.ho === c ? 'on' : ''}" onclick="bdHoPick('${c}',this)">${esc(cname(c))}</span>`).join('')}<span class="chip ${!e.ho ? 'on' : ''}" onclick="bdHoPick('',this)">✍ 직접 쓰기</span></div>
    <div id="bdNmB" style="${e.ho ? 'display:none' : ''}"><label class="f">이름</label><input id="bdNm" maxlength="20" value="${esc(e.name || '')}" placeholder="예: 집사, 수상한 손님"></div>
    <label class="f">메모 (선택)</label><textarea id="bdSub" rows="2" maxlength="80" placeholder="예: 그날 밤 서재에 있었다고 함">${esc(e.sub || '')}</textarea>`;
  else if (e.t === 'item') { const mine = ITEMS.filter(i => i.owner === ME.uid || i.id === e.itemId);
    f = `<label class="f">물건 <span class="muted">(내 소지품에서)</span></label>${mine.length ? `<div class="bdchips" id="bdIt">${mine.map(i => `<span class="chip ${e.itemId === i.id ? 'on' : ''}" onclick="BD.ed.itemId='${i.id}';BD.ed.iname=${esc(JSON.stringify(i.name || ''))};document.querySelectorAll('#bdIt .chip').forEach(x=>x.classList.remove('on'));this.classList.add('on')">${i.img ? `<img src="${i.img}" style="width:20px;height:20px;object-fit:contain;vertical-align:middle;image-rendering:pixelated"> ` : '📦 '}${esc(i.name)}</span>`).join('')}</div>` : '<p class="muted">가진 소지품 없음</p>'}
    <label class="f">메모 (선택)</label><textarea id="bdSub" rows="2" maxlength="60" placeholder="예: 열쇠 구멍 모양이 이상함">${esc(e.sub || '')}</textarea>`; }
  modal(`<h2 style="color:var(--gold2);margin-top:0">${T} ${e.id ? '카드' : '붙이기'}</h2>${f}
    <div class="row" style="margin-top:12px">${e.id ? `<button class="danger" onclick="bdDel('${e.id}')">🗑 떼기</button>` : ''}<button onclick="closeModal()">취소</button><button class="primary" onclick="bdSave()">${e.id ? '저장' : '붙이기'}</button></div>`);
}
function bdHoPick(c, el) { BD.ed.ho = c; document.querySelectorAll('#bdHo .chip').forEach(x => x.classList.remove('on')); el.classList.add('on'); const b = $('#bdNmB'); if (b) b.style.display = c ? 'none' : ''; }
function bdImg() { const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.onchange = () => { const f = inp.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { const im = new Image(); im.onload = () => {
  const s = Math.min(1, 420 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  BD.ed.img = c.toDataURL('image/jpeg', .72); const i = $('#bdImI'), p = $('#bdImP'); if (i) i.textContent = '있음 ✓'; if (p) p.innerHTML = `<img src="${BD.ed.img}" style="max-width:100%;max-height:30vh;margin-top:6px;border-radius:4px">`; }; im.src = rd.result; }; rd.readAsDataURL(f); }; inp.click(); }
async function bdSave() {
  const e = BD.ed, uid = BD.cur, d = bdDoc(uid), v = s => ($(s) || {}).value;
  const c = { t: e.t };
  if (e.t === 'memo') { c.text = (v('#bdTx') || '').trim(); c.col = e.col || BD_COLS[0][0]; if (!c.text) return toast('내용을 적기'); }
  else if (e.t === 'photo') { c.img = e.img || ''; c.cap = (v('#bdCap') || '').trim(); if (!c.img) return toast('사진을 고르기');
    if (!e.id && bdCards(d).filter(x => x.t === 'photo').length >= BD_MAXPH) return toast(`사진은 ${BD_MAXPH}장까지`); }
  else if (e.t === 'person') { c.ho = e.ho || ''; c.name = c.ho ? '' : (v('#bdNm') || '').trim(); c.sub = (v('#bdSub') || '').trim(); if (!c.ho && !c.name) return toast('누구인지 고르거나 적기'); }
  else if (e.t === 'item') { c.itemId = e.itemId || ''; c.iname = e.iname || ''; c.sub = (v('#bdSub') || '').trim(); if (!c.itemId) return toast('물건을 고르기'); }
  if (bdTooBig(d, JSON.stringify(c).length - (e.id ? JSON.stringify((d.cards || {})[e.id] || {}).length : 0))) return toast('보드가 가득 참 · 사진 몇 장을 떼기');
  try {
    if (e.id) { const old = (d.cards || {})[e.id] || {}; await bdPut(uid, { [`cards.${e.id}`]: Object.assign({}, old, c) }); }
    else { const p = bdCenter(BD_W[e.t] || 140); Object.assign(c, p, { z: Date.now(), by: ME.uid, at: Date.now() }); await bdPut(uid, { [`cards.${bdRid()}`]: c }); }
    closeModal(); toast(e.id ? '저장 완료' : '붙이기 완료'); render();
  } catch (er) { toast('실패: ' + (er.code || er.message)); }
}
async function bdDel(id) {
  if (!confirm('이 카드를 뗄까요? 이어진 실도 같이 끊어져요.')) return; const uid = BD.cur, d = bdDoc(uid), upd = { [`cards.${id}`]: null };
  bdLinks(d).filter(l => l.a === id || l.b === id).forEach(l => upd[`links.${l.id}`] = null);
  try { await bdPut(uid, upd); closeModal(); toast('떼기 완료'); render(); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}

/* ---------- 실 ---------- */
async function bdLinkTap(id) {
  if (!BD.la) { BD.la = id; return render(); }
  if (BD.la === id) { BD.la = null; return render(); }
  const a = BD.la, uid = BD.cur, d = bdDoc(uid); BD.la = null;
  if (bdLinks(d).some(l => (l.a === a && l.b === id) || (l.a === id && l.b === a))) { toast('이미 이어져 있음'); return render(); }
  try { await bdPut(uid, { [`links.${bdRid()}`]: { a, b: id, label: '', by: ME.uid } }); if (typeof sfx === 'function') sfx('tap'); } catch (e) { toast('실패: ' + (e.code || e.message)); }
  render();
}
function bdLinkEdit(lid) {
  const l = bdLinks(bdDoc(BD.cur)).find(x => x.id === lid); if (!l) return;
  modal(`<h2 style="color:var(--gold2);margin-top:0">🧵 실</h2><label class="f">실에 붙일 말 (선택)</label><input id="bdLl" maxlength="16" value="${esc(l.label || '')}" placeholder="예: 같은 날 · 거짓말?">
    <div class="row" style="margin-top:12px"><button class="danger" onclick="bdLinkDel('${lid}')">✂ 끊기</button><button onclick="closeModal()">취소</button><button class="primary" onclick="bdLinkSave('${lid}')">저장</button></div>`);
}
async function bdLinkSave(lid) { try { await bdPut(BD.cur, { [`links.${lid}.label`]: ($('#bdLl').value || '').trim() }); closeModal(); render(); } catch (e) { toast('실패: ' + (e.code || e.message)); } }
async function bdLinkDel(lid) { if (!confirm('이 실을 끊을까요?')) return; try { await bdPut(BD.cur, { [`links.${lid}`]: null }); closeModal(); toast('끊기 완료'); render(); } catch (e) { toast('실패: ' + (e.code || e.message)); } }

/* ---------- 같이 쓰기 ---------- */
function bdShare() {
  const d = bdDoc(ME.uid); window._bdWho = (d.who || []).slice();
  const us = USERS.filter(u => u.id !== ME.uid && !isAdminUser(u)).sort((a, b) => String(a.ho || 'z').localeCompare(String(b.ho || 'z')));
  modal(`<h2 style="color:var(--gold2);margin-top:0">👥 같이 쓰기</h2><p class="muted" style="font-size:.85rem">고른 사람은 이 보드를 보고 카드·실을 붙이거나 고칠 수 있음. KP는 늘 볼 수 있음.</p>
    ${us.length ? `<div class="toggles" id="bdWho">${us.map(u => `<span class="chip ${window._bdWho.includes(u.id) ? 'on' : ''}" onclick="bdWhoTog('${u.id}',this)">${esc((u.ho ? hoName(u.ho) + ' · ' : '') + uname(u))}</span>`).join('')}</div>` : '<p class="muted">아직 다른 PL 없음</p>'}
    <div class="row" style="margin-top:12px"><button onclick="closeModal()">취소</button><button class="primary" onclick="bdShareSave()">저장</button></div>`);
}
function bdWhoTog(u, el) { const w = new Set(window._bdWho || []); w.has(u) ? w.delete(u) : w.add(u); window._bdWho = [...w]; el.classList.toggle('on', w.has(u)); }
async function bdShareSave() {
  const d = bdDoc(ME.uid), old = d.who || [], nw = (window._bdWho || []).filter(u => userOf(u));
  try { await bdEnsure(ME.uid); await B.update('boards/' + ME.uid, { who: nw, at: Date.now() }); closeModal(); toast('저장 완료'); render();
    const add = nw.filter(u => !old.includes(u)); if (add.length && typeof sPing === 'function') sPing(add, '🧵 추리 보드 초대', `${PROF && PROF.ho ? hoName(PROF.ho) : uname(userOf(ME.uid))}의 추리 보드를 같이 쓸 수 있게 됨`, 'board');
  } catch (e) { toast('실패: ' + (e.code || e.message)); }
}

/* ---------- 방의 코르크판에서 열기 ---------- */
function bdFromRoom() {
  const owner = tab === 'visit' && typeof RV !== 'undefined' && RV ? RV : ME.uid;
  if (owner !== ME.uid && !IS_ADMIN && !BOARDS[owner]) return false;   // 남의 보드 (공유 안 받음) → 그냥 말풍선
  BD.cur = owner; BD.la = null; BD.sx = BD.sy = null; go('board'); return true;
}
