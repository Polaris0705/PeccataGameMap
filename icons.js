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
  coin: `...kkkkkk...|..kggyyggk..|.kgyyyyyyGk.|.kgyyGGyyGk.|kgyyGggGyyGk|kgyGgyygGyGk|kgyGgyygGyGk|kgyyGggGyyGk|.kgyyGGyyGk.|.kgyyyyyyGk.|..kGGGGGGk..|...kkkkkk...`,
};
const PX_EMOJI = {
  '🏠': 'house', '🗺': 'map', '🛒': 'cart', '🛍': 'cart', '👀': 'eyes', '🚪': 'door', '✏': 'pencil', '📦': 'box', '💬': 'chat',
  '❤': 'heart', '💜': 'heart', '💘': 'heart', '🤍': 'wheart', '📖': 'book', '📒': 'note', '📜': 'note', '🔊': 'spk', '🔇': 'mute', '👤': 'person',
  '🧑': 'person', '🙂': 'smile', '🎨': 'palette', '📱': 'phone', '📲': 'phone', '⚙': 'gear', '🎲': 'dice', '📅': 'cal', '✨': 'spark',
  '🌿': 'sprout', '🌱': 'sprout', '🍵': 'tea', '☕': 'tea', '🃏': 'card', '🂠': 'card', '🔮': 'ball', '🎭': 'mask', '🤥': 'mask',
  '🔒': 'lock', '🔓': 'unlock', '🔔': 'bell', '📣': 'mega', '📍': 'pin', '📌': 'pin', '🕯': 'candle', '🔍': 'search', '🗝': 'key',
  '🔑': 'key', '⚗': 'flask', '⚠': 'warn', '🖼': 'frame', '✉': 'mail', '🏆': 'trophy', '🎉': 'party', '👁': 'eye', '🧱': 'brick',
  '🪵': 'plank', '🔨': 'hammer', '🌹': 'rose', '🥀': 'rose', '📋': 'clip', '📷': 'camera', '🌙': 'moon', '🌛': 'moon', '💰': 'coin', '👾': 'invader',
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
const pxObs = new MutationObserver(recs => {
  if (!document.documentElement.classList.contains('px')) return;
  for (const r of recs) {
    if (r.type === 'characterData') { const p = r.target.parentElement; if (p) pxScan(p); continue; }
    r.addedNodes.forEach(n => { if (n.nodeType === 1) { if (!n.classList.contains('pxi')) pxScan(n); } else if (n.nodeType === 3 && n.parentElement) { PX_RE.lastIndex = 0; if (PX_RE.test(n.nodeValue)) pxScan(n.parentElement); } });
  }
});
pxObs.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
function pxRefresh() { if (document.documentElement.classList.contains('px')) pxScan(document.body); else pxUnscan(); }
