/* ============================================================
   Ⅶ・peccata — 도트 아이콘 (도트 스타일일 때 화면의 이모지를 12×12 도트 아이콘으로 바꿔요)
   ============================================================ */
const PXPAL = { k: '#1a1410', w: '#f4f0e8', s: '#a8a8b0', S: '#60606a', g: '#e0b050', G: '#a07028', y: '#ffe27a',
  r: '#d8485a', R: '#8a2433', b: '#5a8ad8', B: '#2a4a8a', c: '#8ad8e8', n: '#68b858', N: '#2e6a30',
  o: '#9a6234', O: '#5a3a20', p: '#9a68c8', P: '#5a3a8a', e: '#f0c8a0', m: '#f08ab0' };
const PXI = {
  house: `.....kk.....|....krrk....|...krrrrk...|..krrrrrrk..|.krrrrrrrrk.|kkkkkkkkkkkk|.kwwwwwwwwk.|.kwbbwwoowk.|.kwbbwwoowk.|.kwwwwwoowk.|.kwwwwwoowk.|.kkkkkkkkkk.`,
  map: `............|.kkkk.kkkk..|kwwwwkwwwwkk|kwnnwkwwwwwk|kwnnwkwbbwwk|kwwwwkwbbwwk|kwwrwkwwwwwk|kwrwrkwwnnwk|kwwrwkwwnnwk|kkkwwkkkwwwk|...kkk..kkkk|............`,
  cart: `............|kk..........|.kkkkkkkkkk.|.kgggggggggk|..kgggggggk.|..kgggggggk.|...kgggggk..|...kkkkkkk..|...k........|....kkkkkk..|....kk..kk..|....kk..kk..`,
  eyes: `............|............|.kkk...kkk..|kwwwk.kwwwk.|kwwkk.kwwkk.|kwwkk.kwwkk.|kwwwk.kwwwk.|.kkk...kkk..|............|............|............|............`,
  door: `..kkkkkkkk..|..koooooOk..|..koOoOoOk..|..koOoOoOk..|..koooooOk..|..koOoOoOk..|..koOogoOk..|..koOoOoOk..|..koooooOk..|..koOoOoOk..|..koooooOk..|.kkkkkkkkkk.`,
  pencil: `..........kk|.........krk|........kgk.|.......kgk..|......kgk...|.....kgk....|....kgk.....|...kgk......|..kek.......|.kek........|.kk.........|............`,
  box: `............|..kkkkkkkk..|.kOooooooOk.|kkkkkkkkkkkk|kooooggooook|kooooggooook|koooooooooOk|koooooooooOk|koooooooooOk|kOOOOOOOOOOk|kkkkkkkkkkkk|............`,
  chat: `............|..kkkkkkkk..|.kwwwwwwwwk.|kwwwwwwwwwwk|kwwkwwkwwkwk|kwwwwwwwwwwk|.kwwwwwwwwk.|..kkwkkkkk..|...kwk......|...kk.......|............|............`,
  heart: `............|..kk...kk...|.krrk.krrk..|krwrrkrrrrk.|krwrrrrrrrk.|krrrrrrrrrk.|.krrrrrrrk..|..krrrrrk...|...krrrk....|....krk.....|.....k......|............`,
  wheart: `............|..kk...kk...|.kwwk.kwwk..|kwwwwkwwwwk.|kwwwwwwwwsk.|kwwwwwwwwsk.|.kwwwwwwsk..|..kwwwwsk...|...kwwsk....|....ksk.....|.....k......|............`,
  book: `............|.kkkk..kkkk.|kwwwwkkwwwwk|kwsswkkwsswk|kwwwwkkwwwwk|kwsswkkwsswk|kwwwwkkwwwwk|kwsswkkwsswk|kwwwwkkwwwwk|kkkkkRRkkkkk|....kkkk....|............`,
  note: `............|..kkkkkkkk..|.kkgggggggk.|.kRgggggggk.|.kkgkkkkkgk.|.kRgggggggk.|.kkgkkkkkgk.|.kRgggggggk.|.kkgggggggk.|.kRgggggggk.|..kkkkkkkk..|............`,
  spk: `............|.....k......|....kk...k..|kkkksk.k..k.|kssssk..k.k.|kssssk..k.k.|kkkksk.k..k.|....kk...k..|.....k......|............|............|............`,
  mute: `............|.....k......|....kk......|kkkksk.r...r|kssssk..r.r.|kssssk...r..|kkkksk..r.r.|....kk.r...r|.....k......|............|............|............`,
  person: `............|....kkkk....|...kSSSSk...|...kSSSSk...|...kSSSSk...|....kkkk....|..kkSSSSkk..|.kSSSSSSSSk.|.kSSSSSSSSk.|.kSSSSSSSSk.|.kkkkkkkkkk.|............`,
  smile: `....kkkk....|..kkyyyykk..|.kyyyyyyyyk.|.kyykyykyyk.|kyyykyykyyyk|kyyyyyyyyyyk|kyykyyyykyyk|kyyykkkkyyyk|.kyyyyyyyyk.|.kyyyyyyyyk.|..kkyyyykk..|....kkkk....`,
  palette: `............|...kkkkkk...|..keeeeeekk.|.keerreebbek|keeerreebbek|keeeeeeeeek.|keeeekkeeek.|.keeekkeeeek|.kenneeemmek|..kenneemmek|...kkkkkkkk.|............`,
  phone: `...kkkkkk...|...kSSSSk...|...kbbbbk...|...kbcbbk...|...kbbbbk...|...kbbbbk...|...kbbbbk...|...kbbbbk...|...kSSSSk...|...kSwwSk...|...kSSSSk...|...kkkkkk...`,
  gear: `....kkkk....|.kk.ksSk.kk.|.kskssssksk.|..kssssssk..|kkssskkssskk|kssskkkksssk|kssskkkksssk|kkssskkssskk|..kssssssk..|.kskssssksk.|.kk.ksSk.kk.|....kkkk....`,
  dice: `............|.kkkkkkkkkk.|.kwwwwwwwwk.|.kwrrwwwwwk.|.kwrrwwwwwk.|.kwwwrrwwwk.|.kwwwrrwwwk.|.kwwwwwrrwk.|.kwwwwwrrwk.|.kwwwwwwwwk.|.kkkkkkkkkk.|............`,
  cal: `..k.....k...|.kkkkkkkkkk.|.krrrrrrrrk.|.krrrrrrrrk.|.kkkkkkkkkk.|.kwwwwwwwwk.|.kwkwkwkwwk.|.kwwwwwwwwk.|.kwkwkwkwwk.|.kwwwwwwwwk.|.kkkkkkkkkk.|............`,
  spark: `.....y......|.....y......|....yyy.....|..yyywyyy...|....yyy.....|.....y....y.|.....y...yyy|..........y.|..y.........|.yyy........|..y.........|............`,
  sprout: `............|.......nn...|..nn..nNNn..|.nNNn.nNn...|..nNNnNn....|....nNn.....|.....N......|.....N......|...oooooo...|...kOOOOk...|....kOOk....|....kkkk....`,
  tea: `............|....w..w....|.....w..w...|............|.kkkkkkkkk..|.kwwwwwwwkkk|.kwnnnnnwk.k|.kwwwwwwwkkk|..kwwwwwk...|...kkkkk....|.kkkkkkkkk..|............`,
  card: `..kkkkkkkk..|..kwwwwwwk..|..kwrwwwwk..|..kwwwwwwk..|..kwwrrwwk..|..kwrrrrwk..|..kwwrrwwk..|..kwwwwwwk..|..kwwwwrwk..|..kwwwwwwk..|..kkkkkkkk..|............`,
  ball: `............|....kkkk....|..kkpppwkk..|.kppppppwpk.|.kpppppppPk.|.kpppppppPk.|.kPpppppPPk.|..kkPPPPkk..|...kkkkkk...|..kggggggk..|.kkkkkkkkkk.|............`,
  mask: `............|..kkkkkkkk..|.kwwwwwwwwk.|.kwkkwwkkwk.|.kwkkwwkkwk.|.kwwwwwwwwk.|.kwkwwwwkwk.|.kwwkkkkwwk.|..kwwwwwwk..|...kwwwwk...|....kkkk....|............`,
  lock: `....kkkk....|...kk..kk...|...k....k...|...k....k...|..kkkkkkkk..|..kggggggk..|..kggkkggk..|..kggkkggk..|..kgggkggk..|..kggggggk..|..kkkkkkkk..|............`,
  unlock: `....kkkk....|...kk..kk...|...k....k...|...k........|..kkkkkkkk..|..kggggggk..|..kggkkggk..|..kggkkggk..|..kgggkggk..|..kggggggk..|..kkkkkkkk..|............`,
  bell: `.....kk.....|....kggk....|...kggygk...|...kggygk...|..kggggygk..|..kggggggk..|..kggggggk..|.kggggggggk.|.kkkkkkkkkk.|.....kk.....|............|............`,
  mega: `............|.........k..|.......kkk..|.....kkrrk..|.kkkkrrrrk..|.kwwkrrrrk..|.kwwkrrrrk..|.kkkkrrrrk..|..k..kkrrk..|..k....kkk..|..kk.....k..|............`,
  pin: `....kkkk....|...krrrrk...|..krrwrrrk..|..krwwrrrk..|..krrrrrrk..|...krrrrk...|....krrk....|....krrk....|.....kk.....|.....kk.....|.....k......|............`,
  candle: `.....y......|....yry.....|....yry.....|.....k......|....kwwk....|....kwwk....|....kwwk....|....kwwk....|....kwwk....|..kkkkkkkk..|..kgggggGk..|...kkkkkk...`,
  search: `............|..kkkk......|.kcwcck.....|kcwcccck....|kcccccck....|kcccccck....|.kcccck.....|..kkkkkk....|......kOk...|.......kOk..|........kOk.|.........kk.`,
  key: `............|............|.kkk........|kgggk.......|kgkgkkkkkkk.|kgggggggggk.|.kkkkkkgkgk.|......k.k.k.|............|............|............|............`,
  flask: `....kkkk....|.....kk.....|.....kk.....|....kwwk....|...kwwwwk...|..kwwwwwwk..|.knnnnnnnnk.|.knnwnnnnnk.|.knnnnnnwnk.|.knnnnnnnnk.|..kkkkkkkk..|............`,
  warn: `.....kk.....|....kyyk....|...kyyyyk...|...kykkyk...|..kyykkyyk..|..kyykkyyk..|.kyyykkyyyk.|.kyyyyyyyyk.|kyyyykkyyyyk|kyyyyyyyyyyk|kkkkkkkkkkkk|............`,
  frame: `gggggggggggg|gkkkkkkkkkkg|gkbbbbbbbbkg|gkbbbbbwbbkg|gkbbbbbbbbkg|gkbnnbbbbbkg|gknnnnbnnbkg|gknnnnnnnnkg|gkkkkkkkkkkg|gggggggggggg|............|............`,
  mail: `............|............|kkkkkkkkkkkk|kkwwwwwwwwkk|kwkwwwwwwkwk|kwwkwwwwkwwk|kwwwkkkkwwwk|kwwwwwwwwwwk|kwwwwwwwwwwk|kkkkkkkkkkkk|............|............`,
  trophy: `............|.kkkkkkkkkk.|kgkgyggggkgk|kgkgyggggkgk|.kkgyggggkk.|...kgggGk...|....kggk....|.....kk.....|....kggk....|...kGGGGk...|...kkkkkk...|............`,
  party: `..........y.|.r....b.....|.....r...y..|k...........|kk..y...b...|kgk.........|kggk..r.....|kgrgk.......|kggggk......|kgggbgk.....|kggggggk....|kkkkkkkk....`,
  eye: `............|............|...kkkkkk...|..kwwwwwwk..|.kwwwkkwwwk.|kwwwkbbkwwwk|kwwwkbbkwwwk|.kwwwkkwwwk.|..kwwwwwwk..|...kkkkkk...|............|............`,
  brick: `............|kkkkkkkkkkkk|krrrrkrrrrrk|kkkkkkkkkkkk|krrkrrrrrkrk|kkkkkkkkkkkk|krrrrrkrrrrk|kkkkkkkkkkkk|krrkrrrrkrrk|kkkkkkkkkkkk|............|............`,
  plank: `............|kkkkkkkkkkkk|koooooOooook|kOOOOOOOOOOk|kkkkkkkkkkkk|kooOoooooook|kOOOOOOOOOOk|kkkkkkkkkkkk|koooooooOook|kOOOOOOOOOOk|kkkkkkkkkkkk|............`,
  hammer: `............|.kkkkkk.....|kssssssk....|kssssssk....|.kkkokkk....|....kok.....|....kok.....|....kok.....|....kok.....|....kok.....|....kkk.....|............`,
  rose: `............|...kkkk.....|..krrRrk....|..kRrrRk....|..krRrrk....|...kkkk.....|.....N......|...nnN......|....nN......|.....N.nn...|.....Nn.....|.....N......`,
  clip: `....kkkk....|..kkkSSkkk..|..kwwwwwwk..|..kwkkkkwk..|..kwwwwwwk..|..kwkkkkwk..|..kwwwwwwk..|..kwkkkwwk..|..kwwwwwwk..|..kkkkkkkk..|............|............`,
  camera: `............|............|...kkk......|.kkkkkkkkkk.|kSSSSSSSSSSk|kSSSkkkkSySk|kSSkcwcckSSk|kSSkcccckSSk|kSSSkkkkSSSk|kSSSSSSSSSSk|.kkkkkkkkkk.|............`,
  moon: `............|....kkk.....|...kyyk.....|..kyyk......|..kyk.......|..kyk.......|..kyk.......|..kyyk......|...kyyk.....|....kkk.....|............|............`,
  invader: `............|..n......n..|...n....n...|..nnnnnnnn..|.nnknnnnknn.|nnnnnnnnnnnn|n.nnnnnnnn.n|n.n......n.n|...nn..nn...|............|............|............`,
  sun: `.....y......|..y..y..y...|...y.y.y....|....kkkk....|.yykyyyyky..|...kyywyyk..|y.kyyyyyyk.y|...kyyyyyk..|.yykyyyyky..|....kkkk....|...y.y.y....|..y..y..y...`,
  dusk: `............|............|.....yy.....|...yyyyyy...|..yyyyyyyy..|.yyyyyyyyyy.|rrrrrrrrrrrr|............|.rrrrrrrrrr.|............|...rrrrrr...|............`,
  coin: `...kkkkkk...|..kggyyggk..|.kgyyyyyyGk.|.kgyyGGyyGk.|kgyyGggGyyGk|kgyGgyygGyGk|kgyGgyygGyGk|kgyyGggGyyGk|.kgyyGGyyGk.|.kgyyyyyyGk.|..kGGGGGGk..|...kkkkkk...`,
};
const PX_EMOJI = {
  '🏠': 'house', '🗺': 'map', '🛒': 'cart', '🛍': 'cart', '👀': 'eyes', '🚪': 'door', '✏': 'pencil', '📦': 'box', '💬': 'chat',
  '❤': 'heart', '💜': 'heart', '💘': 'heart', '🤍': 'wheart', '📖': 'book', '📒': 'note', '📜': 'note', '🔊': 'spk', '🔇': 'mute', '👤': 'person',
  '🧑': 'person', '🙂': 'smile', '🎨': 'palette', '📱': 'phone', '📲': 'phone', '⚙': 'gear', '🎲': 'dice', '📅': 'cal', '✨': 'spark',
  '🌿': 'sprout', '🌱': 'sprout', '🍵': 'tea', '☕': 'tea', '🃏': 'card', '🂠': 'card', '🔮': 'ball', '🎭': 'mask', '🤥': 'mask',
  '🔒': 'lock', '🔓': 'unlock', '🔔': 'bell', '📣': 'mega', '📍': 'pin', '📌': 'pin', '🕯': 'candle', '🔍': 'search', '🗝': 'key',
  '🔑': 'key', '⚗': 'flask', '⚠': 'warn', '🖼': 'frame', '✉': 'mail', '🏆': 'trophy', '🎉': 'party', '👁': 'eye', '🧱': 'brick',
  '🪵': 'plank', '🔨': 'hammer', '🌹': 'rose', '🥀': 'rose', '📋': 'clip', '📷': 'camera', '🌙': 'moon', '🌛': 'moon', '💰': 'coin', '☀': 'sun', '🌅': 'dusk', '🌇': 'dusk', '👾': 'invader',
};
const PXI_URL = {};
for (const [k, src] of Object.entries(PXI)) {
  const rows = src.split('|').map(r => (r + '............').slice(0, 12));
  while (rows.length < 12) rows.push('............');
  let rects = '';
  rows.slice(0, 12).forEach((row, y) => { for (let x = 0; x < 12; x++) { const c = PXPAL[row[x]]; if (c) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${c}"/>`; } });
  PXI_URL[k] = 'url("data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" shape-rendering="crispEdges">${rects}</svg>`) + '")';
}
const PX_RE = new RegExp('(' + Object.keys(PX_EMOJI).map(e => e.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\uFE0F?', 'g');
const PX_SKIP = 'input,textarea,select,option,script,style,.tx,.note,.utext,.noico,[contenteditable]';
function pxIcon(name, emo) { const i = document.createElement('i'); i.className = 'pxi'; i.dataset.e = emo; i.style.backgroundImage = PXI_URL[name]; i.setAttribute('aria-label', emo); return i; }
function pxScan(root) {
  if (!document.documentElement.classList.contains('px') || !root) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => { PX_RE.lastIndex = 0; if (!PX_RE.test(n.nodeValue)) return NodeFilter.FILTER_REJECT; const p = n.parentElement; return p && !p.closest(PX_SKIP) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; } });
  const list = []; while (tw.nextNode()) list.push(tw.currentNode);
  list.forEach(n => {
    const frag = document.createDocumentFragment(), s = n.nodeValue; let last = 0; PX_RE.lastIndex = 0; let m;
    while ((m = PX_RE.exec(s))) { if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index))); frag.appendChild(pxIcon(PX_EMOJI[m[1]], m[0])); last = m.index + m[0].length; }
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    n.parentNode.replaceChild(frag, n);
  });
}
function pxUnscan() { document.querySelectorAll('i.pxi').forEach(i => i.replaceWith(document.createTextNode(i.dataset.e || ''))); }
/* ============================================================
   글자 고치기 (KP가 화면의 아무 글자나 눌러 바꾸면 모두에게 적용) — settings/texts.rules = [{a:원래, b:새 글자}]
   ============================================================ */
let TXRULES = [], TXRE = null, TXMAP = {}, TXEDIT = false;
const TXORIG = new WeakMap(), TXOUT = new WeakMap();
const TX_SKIP = 'input,textarea,script,style,.tx,.note,.utext,.notx,[contenteditable]';
function txBuild() {
  TXMAP = {}; TXRULES.forEach(r => { if (r && r.a) TXMAP[r.a] = r.b == null ? '' : String(r.b); });
  const keys = Object.keys(TXMAP).sort((x, y) => y.length - x.length);
  TXRE = keys.length ? new RegExp(keys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g') : null;
}
function txNode(n) {
  if (!TXRE) return; const v = n.nodeValue; if (!v || TXOUT.get(n) === v) return;
  const p = n.parentElement; if (!p || p.closest(TX_SKIP)) return;
  TXRE.lastIndex = 0; if (!TXRE.test(v)) return;
  const out = v.replace(TXRE, m => TXMAP[m]); TXORIG.set(n, v); TXOUT.set(n, out); n.nodeValue = out;
}
function txScan(root) {
  if (!TXRE || !root) return;
  if (root.nodeType === 3) return txNode(root);
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); const list = []; while (tw.nextNode()) list.push(tw.currentNode); list.forEach(txNode);
  const phs = root.querySelectorAll ? [...root.querySelectorAll('[placeholder]')] : []; if (root.hasAttribute && root.hasAttribute('placeholder')) phs.push(root);
  phs.forEach(el => { if (el.closest('.notx')) return; const o = el.dataset.txph != null ? el.dataset.txph : el.getAttribute('placeholder'); TXRE.lastIndex = 0; if (TXRE.test(o)) { el.dataset.txph = o; el.setAttribute('placeholder', o.replace(TXRE, m => TXMAP[m])); } });
}
function txOrigOf(n) { return TXORIG.has(n) && TXOUT.get(n) === n.nodeValue ? TXORIG.get(n) : n.nodeValue; }
function txSetRules(list) {
  TXRULES = Array.isArray(list) ? list : [];
  document.querySelectorAll('[data-txph]').forEach(el => { el.setAttribute('placeholder', el.dataset.txph); delete el.dataset.txph; });
  const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const list2 = []; while (tw.nextNode()) list2.push(tw.currentNode);
  list2.forEach(n => { if (TXORIG.has(n) && TXOUT.get(n) === n.nodeValue) { n.nodeValue = TXORIG.get(n); TXOUT.delete(n); } });
  txBuild();
  if (typeof render === 'function' && typeof ME !== 'undefined' && ME) render();
  if (typeof renderChatParts === 'function') { try { renderChatParts(); } catch (e) {} }
  txScan(document.body); pxRefresh();
}

const pxObs = new MutationObserver(recs => {
  const px = document.documentElement.classList.contains('px');
  for (const r of recs) {
    if (r.type === 'characterData') { txNode(r.target); const p = r.target.parentElement; if (px && p) pxScan(p); continue; }
    r.addedNodes.forEach(n => {
      if (n.nodeType === 1) { if (n.classList.contains('pxi')) return; txScan(n); if (px) pxScan(n); }
      else if (n.nodeType === 3 && n.parentElement) { txNode(n); if (px) { PX_RE.lastIndex = 0; if (PX_RE.test(n.nodeValue)) pxScan(n.parentElement); } }
    });
  }
});
pxObs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });

/* ---- KP 편집 모드 ---- */
function txToggle(on) {
  TXEDIT = on; document.body.classList.toggle('txedit', on);
  let bar = document.getElementById('txbar');
  if (on && !bar) { bar = document.createElement('div'); bar.id = 'txbar'; bar.className = 'notx noico';
    bar.innerHTML = '<span>✏ 글자 고치기 — 바꿀 글자를 눌러 주세요</span><span><button class="sm" onclick="txList()">고친 목록</button> <button class="sm primary" onclick="txToggle(false)">끝내기</button></span>';
    document.body.appendChild(bar); }
  if (!on && bar) bar.remove();
}
function txPick(ev) {
  let n = null;
  if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(ev.clientX, ev.clientY); n = r && r.startContainer; }
  else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(ev.clientX, ev.clientY); n = p && p.offsetNode; }
  const el = ev.target;
  if (!(n && n.nodeType === 3 && n.nodeValue.trim() && el.contains(n))) n = [...el.childNodes].find(c => c.nodeType === 3 && c.nodeValue.trim()) || null;
  if (n) return { text: txOrigOf(n).trim(), cur: n.nodeValue.trim() };
  if (el.getAttribute && el.getAttribute('placeholder') != null) { const o = el.dataset.txph != null ? el.dataset.txph : el.getAttribute('placeholder'); return { text: o.trim(), cur: el.getAttribute('placeholder') }; }
  return null;
}
document.addEventListener('click', ev => {
  if (!TXEDIT) return;
  const t = ev.target;
  if (t.closest('#txbar') || (t.closest('#modal') && document.querySelector('#mbox .txeditor'))) return;
  ev.preventDefault(); ev.stopPropagation();
  if (t.closest('.tx,.note,.utext')) return toast('플레이어가 쓴 글은 고칠 수 없어요');
  const pk = txPick(ev); if (!pk || !pk.text) return toast('여기엔 고칠 글자가 없어요');
  txEditor(pk.text, (TXRULES.find(r => r.a === pk.text) || {}).b);
}, true);
function txEditor(a, b) {
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  modal(`<div class="txeditor notx noico"><h2 style="color:var(--gold2);margin-top:0">✏ 글자 고치기</h2>
   <label class="f">바꿀 원래 글자 (일부만 남겨도 돼요)</label><input id="txA" value="${e(a)}">
   <label class="f">새 글자 (비우면 그 글자가 사라져요)</label><textarea id="txB" style="min-height:60px">${e(b != null ? b : a)}</textarea>
   <p class="muted">같은 글자가 들어간 곳은 앱 전체에서 함께 바뀌어요. 저장하면 모든 사람 화면에 바로 적용돼요.</p>
   <div class="row"><button onclick="closeModal()">취소</button>${TXRULES.some(r => r.a === a) ? `<button class="danger" onclick="txDel(document.getElementById('txA').value)">원래대로</button>` : ''}<button class="primary" onclick="txSave()">저장</button></div></div>`);
  setTimeout(() => { const t = document.getElementById('txB'); if (t) { t.focus(); t.select(); } }, 50);
}
async function txPut(list) { try { await B.set('settings/texts', { rules: list, at: Date.now() }); } catch (e) { toast('저장 실패: ' + (e.code || e.message)); return false; } txSetRules(list); return true; }
async function txSave() {
  const a = document.getElementById('txA').value.trim(), b = document.getElementById('txB').value.replace(/\n+$/, '');
  if (!a) return toast('원래 글자를 적어 주세요');
  const list = TXRULES.filter(r => r.a !== a); if (b !== a) list.push({ a, b });
  if (await txPut(list)) { closeModal(); toast('글자를 바꿨어요'); }
}
async function txDel(a) { a = String(a || '').trim(); if (await txPut(TXRULES.filter(r => r.a !== a))) { closeModal(); toast('원래 글자로 돌려놨어요'); if (document.getElementById('txlist')) txList(); } }
function txList() {
  const e = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  modal(`<div class="txeditor notx noico" id="txlist"><h2 style="color:var(--gold2);margin-top:0">✏ 고친 글자 목록 <span class="muted">${TXRULES.length}</span></h2>
   <div style="max-height:50vh;overflow:auto">${TXRULES.length ? TXRULES.map((r, i) => `<div class="item" style="margin:6px 0"><div style="min-width:0;word-break:break-all"><span class="muted">${e(r.a)}</span><br>→ <b>${e(r.b) || '<span class="muted">(지움)</span>'}</b></div>
     <div style="white-space:nowrap"><button class="sm" onclick="txEditor(TXRULES[${i}].a,TXRULES[${i}].b)">고치기</button> <button class="sm danger" onclick="txDel(TXRULES[${i}].a)">원래대로</button></div></div>`).join('') : '<p class="muted">아직 고친 글자가 없어요.</p>'}</div>
   <h3>직접 추가</h3><p class="muted" style="margin-top:0">잠깐 떴다 사라지는 안내문처럼 누르기 어려운 글자는 여기서 적어 주세요.</p>
   <div class="row"><button onclick="txEditor('', '')">새 글자 바꾸기</button><button onclick="closeModal()">닫기</button></div></div>`);
}
function pxRefresh() { if (document.documentElement.classList.contains('px')) pxScan(document.body); else pxUnscan(); }
