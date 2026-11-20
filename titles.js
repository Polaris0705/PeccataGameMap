/* ================= KP 칭호 + HO 죄 이름 바꾸기 =================
   settings/titles : { list:[{id,name,limit,cond:{t,n}|null,at}] }
     name 자리표시자 → {죄} 나태 · {HO} HO3 · {이름} 캐릭터 이름
     limit 0 = 제한 없음, N = 먼저 받은 N명까지
   progress/{uid}.kt : { [id]:{at, by:'auto'|'kp', off?:true} }   off = KP가 회수
   settings/hos : { names:{ wrath:'분노', gluttony:'식탐', ... } }
================================================================ */
let KT = [];
const KT_COND = {
  riddles: { l: '수수께끼 전부 해결', noN: true },
  notes: { l: '쪽지 모으기', u: '장' },
  egg: { l: '이스터에그 은화 찾기 (누적)', u: '개' },
  stole: { l: '금고 털기 성공', u: '회' },
  earned: { l: '누적 은화', u: '은화' },
  streak: { l: '미션 연속 완주', u: '일' },
  drop: { l: '찻잔 떨어뜨리기 최고 점수', u: '점' },
  shelf: { l: '서재 선반 정리 클리어', u: '단계' }
};
const ktCondTxt = c => { if (!c || !KT_COND[c.t]) return '직접 수여만'; const k = KT_COND[c.t]; return k.noN ? k.l : `${k.l} ${c.n}${k.u} 이상`; };
function ktVal(p, t) {
  p = p || {};
  switch (t) {
    case 'riddles': return typeof RIDDLES !== 'undefined' && RIDDLES.length && RIDDLES.every(r => ((p.riddles || {})[r.id] || {}).solved) ? 1 : 0;
    case 'notes': return (p.notes || []).length;
    case 'egg': return p.eggTot || 0;
    case 'stole': return p.stole || 0;
    case 'earned': return p.earned || 0;
    case 'streak': return Math.max((p.ms && p.ms.streak) || 0, p.msBest || 0);
    case 'drop': return (p.best || {}).sins || 0;
    case 'shelf': return (p.shelf && p.shelf.best) || 0;
  }
  return 0;
}
const ktMet = (p, c) => c && KT_COND[c.t] && ktVal(p, c.t) >= (KT_COND[c.t].noN ? 1 : Math.max(1, +c.n || 1));
const ktHas = (p, id) => { const k = p && p.kt && p.kt[id]; return !!(k && !k.off); };
const ktDef = id => KT.find(x => x.id === id);
function ktHolders(id) { return PROGS.filter(p => ktHas(p, id)).sort((a, b) => a.kt[id].at - b.kt[id].at); }
const ktFull = (d, exceptUid) => d.limit > 0 && ktHolders(d.id).filter(p => p.id !== exceptUid).length >= d.limit;

/* 이름 틀 채우기 */
function ktName(tpl, u) {
  u = u || {}; const ho = u.ho || '', s = ho && typeof sinOf === 'function' ? sinOf(ho) : '';
  return String(tpl || '')
    .replace(/\{\s*죄\s*\}/g, s ? sinName(s) : '손님')
    .replace(/\{\s*HO\s*\}/gi, ho || '손님')
    .replace(/\{\s*이름\s*\}/g, ho ? cname(ho) : (typeof uname === 'function' ? uname(u) : u.name || ''));
}
/* 착용한 칭호 이름 (상점 칭호 + KP 칭호 공통) */
function titleTxt(p, u) {
  p = p || {}; const id = p.title || ''; if (!id) return '';
  if (id.startsWith('k_')) { const d = ktDef(id.slice(2)); return d && ktHas(p, d.id) ? ktName(d.name, u) : ''; }
  const t = SHOP.find(x => x.id === id); return t ? t.name : '';
}
const meU = () => (typeof USERS !== 'undefined' && USERS.find(x => x.id === ME.uid)) || { id: ME.uid, ho: PROF && PROF.ho, name: PROF && PROF.name };

/* ---------- 자동 지급 + 알림 ---------- */
function ktCheck() {
  if (!P || !ME || !PROF || !KT.length) return; if (IS_ADMIN && !PROF.ho) return;
  P.kt = P.kt || {}; P.ktSeen = P.ktSeen || []; let dirty = false; const got = [];
  KT.forEach(d => {
    if (P.kt[d.id] || !d.cond) return;
    if (!ktMet(P, d.cond) || ktFull(d, ME.uid)) return;
    P.kt[d.id] = { at: Date.now(), by: 'auto' }; dirty = true;
  });
  KT.forEach(d => { if (ktHas(P, d.id) && !P.ktSeen.includes(d.id)) { P.ktSeen.push(d.id); got.push(d); dirty = true; } });
  if (dirty) saveP();
  if (got.length && !document.querySelector('#modal[style*="flex"]')) {
    const me = meU();
    modal(`<h2 style="color:var(--gold2);margin-top:0">🎖 특별 칭호!</h2>${got.map(d => `<p><b style="color:var(--gold2)">「${esc(ktName(d.name, me))}」</b><br><span class="muted" style="font-size:.85rem">${d.cond && P.kt[d.id].by === 'auto' ? esc(ktCondTxt(d.cond)) : 'KP가 준 칭호'}${d.limit > 0 ? ` · 한정 ${d.limit}명` : ''}</span></p>`).join('')}
      <div class="row"><button class="primary" onclick="ktEquip('${got[0].id}');closeModal()">바로 착용</button><button onclick="closeModal()">나중에</button></div>`);
  } else if (got.length) { P.ktSeen = P.ktSeen.filter(x => !got.some(d => d.id === x)); }   // 다른 창이 떠 있으면 다음에 다시 알려 줌
}
setInterval(() => { try { ktCheck(); } catch (e) { console.warn('kt', e); } }, 8000);
setInterval(() => { if (P && P.ms && (P.ms.streak || 0) > (P.msBest || 0)) { P.msBest = P.ms.streak; } }, 15000);
function ktEquip(id) { if (!ktHas(P, id)) return; P.title = 'k_' + id; saveP(); render(); }

/* 상점 안 '특별 칭호' 칸 */
function ktShopHtml() {
  const mine = KT.filter(d => ktHas(P, d.id)), me = meU();
  if (!mine.length && !KT.length) return '';
  return `<div class="panel"><h2>🎖 특별 칭호</h2>${mine.length ? `<div class="grid" style="gap:6px">${mine.map(d => `<div class="item"><div><b>「${esc(ktName(d.name, me))}」</b><div class="muted" style="font-size:.78rem">${esc(ktCondTxt(d.cond))}${d.limit > 0 ? ` · 한정 ${d.limit}명` : ''}</div></div>${P.title === 'k_' + d.id ? '<button disabled>착용 중</button>' : `<button onclick="ktEquip('${d.id}')">착용</button>`}</div>`).join('')}</div>` : '<p class="muted" style="margin:0">아직 없음. 특별한 일을 해내면 얻을 수 있음.</p>'}
   ${P.title ? `<button class="sm" style="margin-top:8px" onclick="P.title='';saveP();render()">칭호 벗기</button>` : ''}</div>`;
}

/* ---------- HO 이름 ---------- */
HOS.forEach(h => { h.base = h.base || h.name; });
function hoNamesApply(m) {
  m = m || {}; let ch = false;
  HOS.forEach(h => {
    const nv = String(m[h.id] || '').trim() || h.base, old = h.name; if (nv === old) return; h.name = nv; ch = true;
    if (typeof FURN !== 'undefined' && FURN[h.id]) { const f = FURN[h.id]; f._base = f._base || f.name; f.name = f._base.split(h.base).join(nv); }
  });
  if (ch) { try { TKRE = null; tkRefresh(); } catch (e) { } }
}

/* ---------- KP 화면 ---------- */
VIEWS.ktitle = () => {
  if (!IS_ADMIN) return '<div class="panel">KP만 볼 수 있음.</div>';
  const code = id => Object.keys(CONFIG.hoSins || {}).find(c => CONFIG.hoSins[c] === id) || '';
  return `<div class="panel"><h2>🏷 HO 죄 이름</h2><p class="muted" style="margin:0 0 8px">빈칸 = 기본 이름 · 화면·가구·칭호 전체 반영</p>
    ${HOS.map(h => `<div class="row" style="margin:4px 0;align-items:center"><span style="flex:0 0 5.5em" class="muted">${code(h.id)} · ${esc(h.base)}</span><input id="hon_${h.id}" placeholder="${esc(h.base)}" value="${h.name !== h.base ? esc(h.name) : ''}"></div>`).join('')}
    <button class="primary" style="margin-top:8px" onclick="hoNamesSave()">저장</button></div>`;
};
/* 특별 칭호 목록 (데이터 관리 화면에서 씀) */
function ktListHtml() {
  return `<div class="panel"><div class="row" style="justify-content:space-between"><h2 style="margin:0">🎖 특별 칭호</h2><button class="primary" style="flex:0 0 auto" onclick="ktEdit()">+ 새 칭호</button></div>
    <p class="muted" style="margin:6px 0">{죄} {HO} {이름} = 받는 사람 기준 자동 변환</p>
    ${KT.map(d => { const hs = ktHolders(d.id); return `<div class="card" style="margin:8px 0"><div class="row" style="justify-content:space-between;align-items:flex-start"><div><b>「${esc(d.name)}」</b><div class="muted" style="font-size:.8rem">${esc(ktCondTxt(d.cond))} · ${d.limit > 0 ? `한정 ${d.limit}명 (${hs.length}/${d.limit})` : `제한 없음 (${hs.length}명)`}</div></div>
      <div class="row" style="flex:0 0 auto;gap:4px"><button class="sm" onclick="ktEdit('${d.id}')">편집</button><button class="sm danger" onclick="ktDel('${d.id}')">삭제</button></div></div>
      ${hs.length ? `<div style="margin-top:6px">${hs.map(p => { const u = userOf(p.id) || { id: p.id }; return `<div class="item" style="margin:3px 0"><div>「${esc(ktName(d.name, u))}」 <span class="muted">${esc(uname(u))} · ${p.kt[d.id].by === 'kp' ? '직접 수여' : '자동'}</span></div><button class="sm" onclick="ktRevoke('${d.id}','${p.id}')">회수</button></div>`; }).join('')}</div>` : ''}
      ${ktFull(d) ? '' : `<div class="row" style="margin-top:6px"><select id="ktTo_${d.id}"><option value="">받을 사람</option>${players().filter(u => !ktHas(PROGS.find(p => p.id === u.id), d.id)).map(u => `<option value="${u.id}">${esc(u.ho ? cname(u.ho) + ' · ' : '')}${esc(uname(u))}</option>`).join('')}</select><button class="sm primary" style="flex:0 0 auto" onclick="ktGive('${d.id}')">수여</button></div>`}
    </div>`; }).join('') || '<p class="muted">아직 칭호가 없음.</p>'}</div>`;
}
async function hoNamesSave() {
  const names = {}; HOS.forEach(h => { const v = ($('#hon_' + h.id).value || '').trim(); if (v && v !== h.base) names[h.id] = v; });
  try { await B.set('settings/hos', { names }); toast('저장 완료'); } catch (e) { toast('저장 실패: ' + (e.code || e.message)); }
}
function ktEdit(id) {
  const d = ktDef(id) || { name: '', limit: 1, cond: null };
  modal(`<h2 style="color:var(--gold2);margin-top:0">${id ? '칭호 편집' : '새 칭호'}</h2>
    <label class="f">이름</label><input id="ktN" value="${esc(d.name)}" placeholder="수수께끼를 처음 푼 {죄}" oninput="ktPrev()">
    <p class="muted" style="margin:4px 0 0;font-size:.8rem">{죄} → 나태 · {HO} → HO3 · {이름} → 캐릭터 이름</p>
    <p id="ktP" style="margin:6px 0;color:var(--gold2)"></p>
    <label class="f">받을 수 있는 인원 (0 = 제한 없음)</label><input id="ktL" type="number" min="0" value="${d.limit || 0}">
    <label class="f">자동 지급 조건</label><select id="ktC" onchange="ktPrev()"><option value="">없음 (직접 수여만)</option>${Object.keys(KT_COND).map(k => `<option value="${k}" ${d.cond && d.cond.t === k ? 'selected' : ''}>${KT_COND[k].l}</option>`).join('')}</select>
    <div id="ktNw"><label class="f">기준 (이상)</label><input id="ktV" type="number" min="1" value="${(d.cond && d.cond.n) || 1}"></div>
    ${typeof WEAR !== 'undefined' && WEAR.some(w => w.kind === 'kp') ? `<label class="f">보상 옷 (선택 · 칭호를 가진 동안 입을 수 있음)</label><select id="ktWear"><option value="">없음</option>${WEAR.filter(w => w.kind === 'kp').map(w => `<option value="${w.id}" ${d.wear === w.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}</select>` : ''}
    <p class="muted" style="font-size:.8rem;margin:6px 0 0">조건 달성 시 자동 지급</p>
    <div class="row" style="margin-top:12px"><button onclick="closeModal()">취소</button><button class="primary" onclick="ktSave('${id || ''}')">저장</button></div>`);
  ktPrev();
}
function ktPrev() {
  const n = $('#ktN'), p = $('#ktP'), c = $('#ktC'); if (!n || !p) return;
  const u = players().find(x => x.ho) || { ho: 'HO3', name: '손님' };
  p.textContent = n.value.trim() ? '예시: 「' + ktName(n.value, u) + '」' : '';
  const w = $('#ktNw'); if (w) w.style.display = c.value && !KT_COND[c.value].noN ? '' : 'none';
}
async function ktSave(id) {
  const name = $('#ktN').value.trim(); if (!name) return toast('이름을 넣기');
  const t = $('#ktC').value, d = { id: id || Date.now().toString(36), name, limit: Math.max(0, parseInt($('#ktL').value) || 0), cond: t ? { t, n: Math.max(1, parseInt($('#ktV').value) || 1) } : null, wear: ($('#ktWear') || {}).value || null, at: (ktDef(id) || {}).at || Date.now() };
  const list = KT.filter(x => x.id !== d.id).concat(d).sort((a, b) => a.at - b.at);
  try { await B.set('settings/titles', { list: clean(list) }); closeModal(); toast('저장 완료'); } catch (e) { toast('저장 실패: ' + (e.code || e.message)); }
}
async function ktDel(id) {
  if (!confirm('이 칭호를 지울까요? 받은 사람에게서도 사라짐.')) return;
  try { await B.set('settings/titles', { list: clean(KT.filter(x => x.id !== id)) }); toast('삭제 완료'); } catch (e) { toast('삭제 실패: ' + (e.code || e.message)); }
}
async function ktPatch(uid, id, v) {
  const cur = (await B.get('progress/' + uid)) || {}; const kt = Object.assign({}, cur.kt || {}); kt[id] = v;
  await B.set('progress/' + uid, { kt }, true);
}
async function ktGive(id) {
  const d = ktDef(id), uid = ($('#ktTo_' + id) || {}).value; if (!d || !uid) return toast('받을 사람을 고르기');
  if (ktFull(d, uid)) return toast('한정 인원이 다 참');
  try { await ktPatch(uid, id, { at: Date.now(), by: 'kp' }); toast('수여 완료'); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function ktRevoke(id, uid) {
  if (!confirm('이 사람에게서 칭호를 회수할까요? (조건을 다시 채워도 자동으로 다시 받지 않음)')) return;
  try { await ktPatch(uid, id, { at: Date.now(), by: 'kp', off: true }); toast('회수 완료'); } catch (e) { toast('실패: ' + (e.code || e.message)); }
}

/* ================= 상점 칭호 · 테두리 관리 (KP 데이터 관리) =================
   settings/shop : { over:{ [id]:{name?, cost?, hide?, color?} }, add:[{id,kind:'title'|'frame',name,cost,hide?,color?,at}] }
     cost -1 = 비밀 (상점에서 팔지 않음, KP 수여·조건으로만)   hide = 가진 사람 말고는 상점에 안 보임
     color = 테두리 색 (기본 테두리도 바꿀 수 있음)
   progress/{uid}.owned  : 가진 상점 칭호·테두리 id
   progress/{uid}.shopOff : KP가 회수한 id (비밀 칭호 조건을 다시 채워도 자동으로 다시 받지 않음)
================================================================ */
let SHOP_BASE = null, SHOPCFG = { over: {}, add: [] }, KD_TT = 'title';
const KD_OPEN = new Set();      // 펼쳐 둔 항목 (다시 그려도 유지)
function shopApply(d) {
  if (!SHOP_BASE) SHOP_BASE = SHOP.map(x => Object.assign({}, x));
  SHOPCFG = { over: (d && d.over) || {}, add: (d && d.add) || [] };
  const list = SHOP_BASE.map(x => Object.assign({}, x, { base: true }, SHOPCFG.over[x.id] || {}))
    .concat(SHOPCFG.add.map(x => Object.assign({ cost: -1 }, x)));
  const css = [];
  list.forEach(x => { if (x.kind === 'frame' && x.color && /^#[0-9a-f]{6}$/i.test(x.color)) { x.cls = 'frame-c_' + x.id; css.push(`.${x.cls}{border-color:${x.color}!important;box-shadow:0 0 14px ${x.color}73}`); } });
  SHOP.length = 0; list.forEach(x => SHOP.push(x));
  let st = document.getElementById('shopFrameCss'); if (!st) { st = document.createElement('style'); st.id = 'shopFrameCss'; document.head.appendChild(st); }
  st.textContent = css.join('\n');
}
const shopShow = it => !it.hide || (P && (P.owned || []).includes(it.id));        // 상점 화면에 보일지
const shopCostTxt = it => it.cost < 0 ? '비밀' : it.cost === 0 ? '무료' : it.cost + ' 은화';

/* 회수한 비밀 칭호는 조건을 다시 채워도 자동으로 안 받음 */
if (typeof grantTitle === 'function') { const _gt = grantTitle; grantTitle = function (id) { if (P && (P.shopOff || []).includes(id)) return ''; return _gt(id); }; }

const shopHolders = id => PROGS.filter(p => (p.owned || []).includes(id));
function shopItemHtml(it) {
  const hs = shopHolders(it.id), isT = it.kind === 'title';
  const nm = isT ? `「${esc(it.name)}」` : `<span class="namecard ${it.cls || ''}" style="display:inline-block;padding:1px 8px;border-radius:6px">${esc(it.name)}</span>`;
  const tags = [shopCostTxt(it), it.hide ? '숨김' : '', it.base ? '' : '새로 만든 것', `${hs.length}명`].filter(Boolean).join(' · ');
  const opts = players().filter(u => !shopHolders(it.id).some(p => p.id === u.id)).map(u => `<option value="${u.id}">${esc(u.ho ? cname(u.ho) + ' · ' : '')}${esc(uname(u))}</option>`).join('');
  return `<details class="card" style="margin:6px 0" ${KD_OPEN.has(it.id) ? 'open' : ''} ontoggle="KD_OPEN[this.open ? 'add' : 'delete']('${it.id}')"><summary style="cursor:pointer"><b>${nm}</b> <span class="muted" style="font-size:.8rem">${tags}</span></summary>
    <div class="row" style="gap:4px;margin:6px 0"><button class="sm" onclick="shopEdit('${it.id}')">편집</button>${it.base ? (SHOPCFG.over[it.id] ? `<button class="sm" onclick="shopResetItem('${it.id}')">기본값으로</button>` : '') : `<button class="sm danger" onclick="shopDelItem('${it.id}')">삭제</button>`}</div>
    ${hs.map(p => { const u = userOf(p.id) || { id: p.id }, on = (isT ? p.title : p.frame) === it.id; return `<div class="item" style="margin:3px 0"><div>${esc(uname(u))} <span class="muted">${esc(u.ho ? cname(u.ho) : '')}${on ? ' · 착용 중' : ''}</span></div><button class="sm" onclick="shopRevoke('${it.id}','${p.id}')">회수</button></div>`; }).join('')}
    ${opts ? `<div class="row" style="margin-top:6px"><select id="shTo_${it.id}"><option value="">받을 사람</option>${opts}</select><button class="sm primary" style="flex:0 0 auto" onclick="shopGive('${it.id}')">수여</button></div>` : ''}
  </details>`;
}
function kdTitlesHtml() {
  const tabs = [['title', '칭호'], ['kt', '특별 칭호'], ['frame', '테두리']];
  const head = `<div class="panel"><div class="row" style="justify-content:space-between;align-items:center"><h2 style="margin:0">🎖 칭호 · 테두리</h2>${KD_TT !== 'kt' ? `<button class="primary" style="flex:0 0 auto" onclick="shopEdit('','${KD_TT}')">+ 새 ${KD_TT === 'title' ? '칭호' : '테두리'}</button>` : ''}</div>
    <div class="toggles" style="margin:8px 0">${tabs.map(([k, l]) => `<button class="${KD_TT === k ? 'on' : ''}" onclick="KD_TT='${k}';render()">${l}</button>`).join('')}</div>`;
  if (KD_TT === 'kt') return head + '</div>' + ktListHtml();
  return head + `<p class="muted" style="margin:0 0 6px">눌러서 펼치기 · 가진 사람 보기 · 수여 · 회수</p>${SHOP.filter(x => x.kind === KD_TT).map(shopItemHtml).join('') || '<p class="muted">없음</p>'}</div>`;
}
if (VIEWS.kdata) {
  const _kd = VIEWS.kdata;
  VIEWS.kdata = () => { const h = _kd(), mark = '<div class="panel"><h2>💾 백업'; return h.includes(mark) ? h.replace(mark, kdTitlesHtml() + mark) : h + kdTitlesHtml(); };
}

function shopEdit(id, kind) {
  const it = SHOP.find(x => x.id === id) || { kind: kind || 'title', name: '', cost: 100 }, isT = it.kind === 'title';
  const secret = it.cost < 0, base = id && it.base ? SHOP_BASE.find(x => x.id === id) : null;
  modal(`<h2 style="color:var(--gold2);margin-top:0">${id ? (isT ? '칭호 편집' : '테두리 편집') : (isT ? '새 칭호' : '새 테두리')}</h2>
    ${base ? `<p class="muted" style="font-size:.8rem;margin:0">기본: ${esc(base.name)} · ${shopCostTxt(base)}</p>` : ''}
    <label class="f">이름</label><input id="shN" value="${esc(it.name)}">
    <label class="row" style="margin:8px 0"><input type="checkbox" id="shSec" ${secret ? 'checked' : ''} style="width:auto" onchange="$('#shCw').style.display=this.checked?'none':''"> 비밀 (상점에서 팔지 않음 · 수여로만)</label>
    <div id="shCw" style="${secret ? 'display:none' : ''}"><label class="f">가격 (은화, 0 = 무료)</label><input id="shC" type="number" min="0" value="${secret ? 100 : it.cost}"></div>
    ${isT ? '' : `<label class="f">테두리 색 ${it.base ? '(비워 두면 원래 모양)' : ''}</label><div class="row"><input id="shCol" type="color" value="${it.color || '#e2bd5c'}" style="flex:0 0 60px">${it.base ? `<label class="row" style="flex:1"><input type="checkbox" id="shColOn" ${it.color ? 'checked' : ''} style="width:auto"> 색 바꾸기</label>` : ''}</div>`}
    <label class="row" style="margin:8px 0"><input type="checkbox" id="shH" ${it.hide ? 'checked' : ''} style="width:auto"> 상점에서 숨기기 (가진 사람만 보임)</label>
    <div class="row" style="margin-top:12px"><button onclick="closeModal()">취소</button><button class="primary" onclick="shopSave('${id || ''}','${it.kind}')">저장</button></div>`);
}
async function shopSaveCfg(cfg, msg) {
  try { await B.set('settings/shop', clean(cfg)); toast(msg || '저장 완료'); return true; } catch (e) { toast('저장 실패: ' + (e.code || e.message)); return false; }
}
async function shopSave(id, kind) {
  const name = $('#shN').value.trim(); if (!name) return toast('이름을 넣기');
  const cost = $('#shSec').checked ? -1 : Math.max(0, Math.round(+$('#shC').value || 0)), hide = $('#shH').checked;
  const colOn = $('#shCol') && (!$('#shColOn') || $('#shColOn').checked), color = colOn ? $('#shCol').value : '';
  const cfg = { over: Object.assign({}, SHOPCFG.over), add: SHOPCFG.add.slice() };
  const base = id && SHOP_BASE.find(x => x.id === id);
  if (base) {
    const o = {}; if (name !== base.name) o.name = name; if (cost !== base.cost) o.cost = cost; if (hide) o.hide = true; if (color) o.color = color;
    if (Object.keys(o).length) cfg.over[id] = o; else delete cfg.over[id];
  } else {
    const prev = cfg.add.find(x => x.id === id), d = { id: id || 'c' + Date.now().toString(36), kind, name, cost, hide, color: color || null, at: (prev && prev.at) || Date.now() };
    cfg.add = cfg.add.filter(x => x.id !== d.id).concat(d).sort((a, b) => a.at - b.at);
  }
  if (await shopSaveCfg(cfg)) closeModal();
}
async function shopResetItem(id) {
  if (!confirm('기본 이름·가격·모양으로 되돌릴까요?')) return;
  const over = Object.assign({}, SHOPCFG.over); delete over[id]; shopSaveCfg({ over, add: SHOPCFG.add }, '되돌리기 완료');
}
async function shopDelItem(id) {
  if (!confirm('이 항목을 지울까요? 가진 사람에게서도 사라짐.')) return;
  shopSaveCfg({ over: SHOPCFG.over, add: SHOPCFG.add.filter(x => x.id !== id) }, '삭제 완료');
}
async function shopGive(id) {
  const uid = ($('#shTo_' + id) || {}).value; if (!uid) return toast('받을 사람을 고르기');
  try {
    const cur = (await B.get('progress/' + uid)) || {}, owned = (cur.owned || ['t0']).filter(x => x !== id).concat(id);
    await B.set('progress/' + uid, { owned, shopOff: (cur.shopOff || []).filter(x => x !== id) }, true); toast('수여 완료');
  } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function shopRevoke(id, uid) {
  if (!confirm('이 사람에게서 회수할까요? (착용 중이면 벗겨지고, 비밀 칭호 조건을 다시 채워도 자동으로 받지 않음)')) return;
  try {
    const cur = (await B.get('progress/' + uid)) || {}, d = { owned: (cur.owned || []).filter(x => x !== id), shopOff: (cur.shopOff || []).filter(x => x !== id).concat(id) };
    if (cur.title === id) d.title = ''; if (cur.frame === id) d.frame = '';
    await B.set('progress/' + uid, d, true); toast('회수 완료');
  } catch (e) { toast('실패: ' + (e.code || e.message)); }
}
