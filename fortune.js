/* ================= 🔮 오늘의 운세 — 칠죄종 타로 =================
   하루 한 장. 7장 × 정방향/역방향 = 14가지. 뽑은 날 하루 효과가 붙음.
   P.tarot = { v:2, date, card(0~6), rev, bonus }
   효과: coin(게임 보상 배율) · shop(상점·가구점 가격 배율) · grow(온실 성장 시간 배율) · hint(서재 선반 힌트 ±) · bonus(뽑자마자 은화)
=================================================================== */
const FORT_SINS = ['wrath', 'greed', 'sloth', 'gluttony', 'pride', 'envy', 'lust'];
const FORT_NUM = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const FORT_COL = { wrath: '#8a1f24', greed: '#8a6a14', sloth: '#2a3a6e', gluttony: '#6e3a1a', pride: '#4e1f70', envy: '#1f5e3c', lust: '#8a2a5c' };
const FORT = {
  wrath: [{ coin: 1.25, msg: '끓어오르는 힘을 쓸 곳이 있다. 오늘은 무엇이든 끝까지 밀어붙여라.', fx: '게임 보상 +25%' },
          { coin: .9, bonus: 6, msg: '참았던 말이 날이 되어 돌아온다. 숨을 고르고 한 박자 늦춰라.', fx: '게임 보상 -10% · 위로금 6' }],
  greed: [{ bonus: 20, msg: '손을 뻗으면 닿는 곳에 반짝이는 것이 있다. 오늘은 줍는 날.', fx: '바로 은화 +20' },
          { shop: 1.1, bonus: 6, msg: '움켜쥘수록 새어 나간다. 지갑 끈을 단단히 묶어라.', fx: '상점·가구점 +10% · 위로금 6' }],
  sloth: [{ grow: .7, msg: '서두르지 않아도 꽃은 핀다. 기다리는 동안 저절로 자라는 것이 있다.', fx: '온실 30% 빨리 자람' },
          { grow: 1.15, bonus: 6, msg: '미뤄 둔 일이 발목을 잡는다. 작은 것부터 하나씩.', fx: '온실 15% 느림 · 위로금 6' }],
  gluttony: [{ coin: 1.15, grow: .9, bonus: 5, msg: '식탁이 풍성하다. 나누면 더 넘친다.', fx: '게임 보상 +15% · 온실 10% 빨리 · 은화 5' },
             { coin: .9, bonus: 6, msg: '배는 부른데 허기가 가시지 않는다. 정말 원하는 것은 무엇인가.', fx: '게임 보상 -10% · 위로금 6' }],
  pride: [{ shop: .8, msg: '당당하게 고개를 들어라. 오늘은 상인들도 당신에게 고개를 숙인다.', fx: '상점·가구점 20% 할인' },
          { shop: 1.15, bonus: 8, msg: '높이 쌓은 탑일수록 바람을 탄다. 한 번쯤 아래를 내려다보라.', fx: '상점·가구점 +15% · 위로금 8' }],
  envy: [{ shop: .9, coin: 1.1, msg: '남의 정원을 보면 내 정원에 심을 씨앗이 보인다.', fx: '상점·가구점 10% 할인 · 게임 보상 +10%' },
         { coin: .95, shop: 1.05, bonus: 6, msg: '초록 눈이 마음을 갉아먹는다. 오늘은 남의 접시를 보지 말 것.', fx: '게임 보상 -5% · 상점 +5% · 위로금 6' }],
  lust: [{ hint: 1, bonus: 8, coin: 1.05, msg: '끌리는 쪽으로 가라. 오늘의 직감은 틀리지 않는다.', fx: '서재 선반 힌트 +1 · 게임 보상 +5% · 은화 8' },
         { hint: -1, bonus: 6, msg: '달콤한 향 뒤에 가시가 있다. 눈앞의 것에 홀리지 말 것.', fx: '서재 선반 힌트 -1 · 위로금 6' }]
};
function fortToday(p) { p = p || (typeof P !== 'undefined' ? P : null); const t = p && p.tarot; return t && t.v === 2 && t.date === kstDate() ? t : null; }
function fortFx(p) { const t = fortToday(p); return t ? FORT[FORT_SINS[t.card]][t.rev ? 1 : 0] : {}; }
const fortCoin = () => fortFx().coin || 1;
const fortShop = () => fortFx().shop || 1;
const fortGrow = () => fortFx().grow || 1;
const fortHint = () => fortFx().hint || 0;
const fortName = t => `${FORT_NUM[t.card]} ${sinName(FORT_SINS[t.card])}${t.rev ? ' · 역방향' : ''}`;

/* ---------- 카드 그림 (48×80 도트) ---------- */
function fortPaint(cv, card, rev, back) {
  const W = 48, H = 80, g = cv.getContext('2d'); cv.width = W * 2; cv.height = H * 2; g.imageSmoothingEnabled = false; g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, W, H);   // 2배 촘촘 (반 칸 = 도트 하나)
  const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); }, GOLD = '#d8b25a', GOLD2 = '#f4dc90', DK = '#140e1c';
  const circ = (cx, cy, rr, c, ry) => { ry = ry || rr; for (let y = -ry - .5; y <= ry + .5; y += .5) { const m = y + .25, w = Math.round(2 * (rr + .5) * Math.sqrt(Math.max(0, 1 - (m / (ry + .5)) ** 2))) / 2; if (w > 0) r(cx + .5 - w, cy + y, w * 2, .5, c); } };
  r(1, 0, W - 2, H, GOLD); r(.5, .5, W - 1, H - 1, GOLD); r(0, 1, W, H - 2, GOLD); r(1, 1, W - 2, .5, GOLD2); r(1, 1, .5, H - 2, GOLD2); r(W - 1.5, 1, .5, H - 2, '#a08040'); r(1, H - 1.5, W - 2, .5, '#a08040'); r(2, 2, W - 4, H - 4, DK); r(3, 3, W - 6, .5, '#5a4530'); r(3, H - 3.5, W - 6, .5, '#5a4530'); r(3, 3, .5, H - 6, '#5a4530'); r(W - 3.5, 3, .5, H - 6, '#5a4530');
  if (back) { for (let y = 4; y < H - 4; y += 2) for (let x = 4 + ((y >> 1) % 2); x < W - 4; x += 2) r(x, y, .5, .5, (x + y) % 4 ? '#2e2240' : '#4a3866');
    circ(24, 40, 10, '#2a1e3c'); circ(24, 40, 7, DK); r(23, 30, 2, 20, GOLD); r(14, 39, 20, 2, GOLD); circ(24, 40, 2, GOLD2); r(5, 5, W - 10, 1, '#5a4530'); r(5, H - 6, W - 10, 1, '#5a4530'); return; }
  if (rev) { g.save(); g.translate(W, H); g.rotate(Math.PI); }
  const s = FORT_SINS[card], base = FORT_COL[s];
  const mix = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)); const A = p(a), B2 = p(b); return '#' + A.map((v, i) => Math.round(v + (B2[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  for (let y = 4; y < 62; y += .5) r(4, y, W - 8, .5, mix(base, DK, Math.abs(y - 36) / 34));
  for (let i = 0; i < 14; i++) { const x = 6 + (i * 13) % 36, y = 6 + (i * 7) % 22; r(x, y, .5, .5, '#ffffffaa'); if (i % 3 === 0) { r(x - .5, y, 1.5, .5, '#ffffff44'); r(x, y - .5, .5, 1.5, '#ffffff44'); } }
  r(4, 62, W - 8, 1, GOLD); r(4, 62, W - 8, .5, GOLD2); r(4, 63, W - 8, 13, '#1e1628'); r(4, 63, W - 8, .5, '#0e0a14'); r(4, 76, W - 8, 1, GOLD); r(4, 76.5, W - 8, .5, '#a08040');
  [[5, 5], [W - 7, 5], [5, H - 7], [W - 7, H - 7]].forEach(([x, y]) => { r(x + .5, y, 1, 2, GOLD); r(x, y + .5, 2, 1, GOLD); r(x + .5, y + .5, 1, 1, GOLD2); r(x + .5, y + .5, .5, .5, '#fff'); });
  // 숫자 (I~VII) 도트
  const n = card + 1, roman = FORT_NUM[card]; let x0 = 24 - Math.round(roman.length * 2.5); [...roman].forEach(ch => { if (ch === 'I') { r(x0, 66, 1, 7, GOLD2); x0 += 3; } else { for (let i = 0; i < 7; i++) { r(x0 + Math.round(i * .4), 66 + i, 1, 1, GOLD2); r(x0 + 4 - Math.round(i * .4), 66 + i, 1, 1, GOLD2); } x0 += 7; } });
  const cx = 24, cy = 34;
  if (s === 'wrath') { [[16, '#a8202a'], [12, '#e04030'], [8, '#ff8a3a'], [4, '#ffe08a']].forEach(([w, c], k) => { for (let y = 0; y < 26 - k * 5; y++) { const ww = Math.round(w * Math.sin((y / (26 - k * 5)) * Math.PI * .9 + .2)); r(cx - ww + Math.round(Math.sin(y * .5 + k) * 1.5), cy + 12 - y - k, ww * 2, 1, c); } }); r(cx - 8, cy + 13, 16, 2, '#3a2418'); }
  if (s === 'greed') { [[cy + 10, 10], [cy + 6, 10], [cy + 2, 10], [cy - 2, 9], [cy - 6, 8]].forEach(([y, w], k) => { circ(cx + (k % 2 ? 2 : -1), y, w, '#8a6a14', 3); circ(cx + (k % 2 ? 2 : -1), y - 1, w, '#e8c050', 3); circ(cx + (k % 2 ? 2 : -1), y - 1, w - 3, '#f4dc90', 1); }); circ(cx + 10, cy - 12, 2, '#ffffff'); r(cx + 9, cy - 16, 1, 9, '#fff8'); r(cx + 6, cy - 12, 9, 1, '#fff8'); }
  if (s === 'sloth') { circ(cx, cy, 12, '#e8e0b0'); circ(cx + 6, cy - 4, 11, mix(base, DK, .05)); [[cx - 12, cy - 12], [cx + 12, cy + 10], [cx + 14, cy - 14], [cx - 14, cy + 12]].forEach(([x, y]) => { r(x, y, 1, 1, '#fff'); r(x - 1, y + 1, 3, 1, '#fff8'); r(x, y + 2, 1, 1, '#fff'); });
    [[cx - 2, cy + 14, 5], [cx + 6, cy + 8, 4], [cx + 12, cy + 3, 3]].forEach(([x, y, z]) => { r(x, y, z, 1, '#f4dc90'); for (let i = 1; i < z - 1; i++) r(x + z - 1 - i, y + i, 1, 1, '#f4dc90'); r(x, y + z - 1, z, 1, '#f4dc90'); }); }
  if (s === 'gluttony') { circ(cx, cy - 4, 11, '#c8a040', 7); circ(cx, cy - 6, 10, '#7a1020', 4); circ(cx - 3, cy - 7, 3, '#b02838', 1); r(cx - 1, cy + 3, 3, 9, '#c8a040'); circ(cx, cy + 13, 7, '#c8a040', 2); r(cx - 10, cy - 4, 2, 4, '#f4dc90');
    [[cx - 15, cy + 12, '#b02020'], [cx + 14, cy + 11, '#79b26e']].forEach(([x, y, c]) => { circ(x, y, 4, c); r(x, y - 6, 1, 3, '#5a3a24'); }); }
  if (s === 'pride') { r(cx - 13, cy + 4, 26, 7, '#c8a040'); r(cx - 13, cy + 4, 26, 1, '#f4dc90'); [[-13, 12], [-5, 16], [0, 20], [5, 16], [13, 12]].forEach(([dx, h]) => { for (let y = 0; y < h; y++) r(cx + dx - Math.round((h - y) / 5), cy + 4 - y, 1 + Math.round((h - y) / 2.5), 1, '#d8b25a'); circ(cx + dx, cy + 4 - h, 1, '#f4dc90'); });
    [[-8, '#c03040'], [0, '#3a70c0'], [8, '#30a060']].forEach(([dx, c]) => { circ(cx + dx, cy + 7, 2, c); }); r(cx - 15, cy + 12, 30, 2, '#6a4a8a'); }
  if (s === 'envy') { for (let x = -16; x <= 16; x++) { const h = Math.round(9 * Math.sqrt(1 - (x / 16) ** 2)); r(cx + x, cy - h, 1, h * 2 + 1, '#f4f0e0'); r(cx + x, cy - h - 1, 1, 1, '#0e0a14'); r(cx + x, cy + h + 1, 1, 1, '#0e0a14'); }
    circ(cx, cy, 7, '#2e8a50'); circ(cx, cy, 5, '#4ab070'); circ(cx, cy, 3, '#0e0a14'); r(cx - 3, cy - 4, 2, 2, '#fff'); [-12, -6, 0, 6, 12].forEach(dx => r(cx + dx, cy - 14 + Math.abs(dx) / 3, 1, 4, '#0e0a14'));
    for (let i = 0; i < 20; i++) r(cx - 18 + i * 2, cy + 18 + Math.round(Math.sin(i * .8) * 2), 2, 2, '#3a8a50'); }
  if (s === 'lust') { r(cx, cy + 4, 1, 16, '#3a7a40'); circ(cx - 4, cy + 12, 3, '#4f8a55', 1); circ(cx + 4, cy + 16, 3, '#4f8a55', 1);
    [[0, 0, 10, '#7a1030'], [0, -1, 8, '#b02040'], [-2, -2, 6, '#d83050'], [1, -3, 4, '#f05070'], [0, -3, 2, '#ffa0b0']].forEach(([dx, dy, rr, c]) => circ(cx + dx, cy - 4 + dy, rr, c, Math.round(rr * .8)));
    r(cx - 6, cy - 6, 3, 1, '#7a1030'); r(cx + 3, cy - 2, 3, 1, '#7a1030'); [[cx - 14, cy - 14], [cx + 13, cy - 10], [cx + 15, cy + 12]].forEach(([x, y]) => { r(x, y, 3, 2, '#f08ab0'); r(x + 1, y + 2, 1, 1, '#f08ab0'); }); }
  if (rev) g.restore();
}

/* ---------- 화면 ---------- */
let FORT_PICK = -1;
function fortCardHtml(t, w) { return `<canvas class="fortcv" data-c="${t ? t.card : -1}" data-r="${t && t.rev ? 1 : 0}" style="width:${w || 120}px;image-rendering:pixelated;border-radius:4px;box-shadow:0 4px 14px #0008"></canvas>`; }
function fortPaintAll() { document.querySelectorAll('canvas.fortcv').forEach(c => fortPaint(c, +c.dataset.c, c.dataset.r === '1', c.dataset.c === '-1')); }
VIEWS.tarot = () => {
  const t = fortToday();
  if (t) { const f = FORT[FORT_SINS[t.card]][t.rev ? 1 : 0];
    return `<div class="panel"><h2>🔮 오늘의 운세</h2><div style="text-align:center;padding:10px 0"><div class="fortflip done">${fortCardHtml(t, 150)}</div>
      <h2 style="margin:10px 0 2px">${esc(fortName(t))}</h2><p class="story" style="margin:6px 12px">${esc(f.msg)}</p>
      <p style="color:${t.rev ? 'var(--wine2)' : 'var(--gold2)'};margin:4px 0">${t.rev ? '⚠' : '✨'} 오늘의 효과: ${esc(f.fx)}</p>${t.bonus ? `<p class="muted">받은 은화 +${t.bonus}</p>` : ''}
      <p class="muted" style="font-size:.8rem">효과: 오늘 자정까지</p></div></div>`; }
  return `<style>.fortpick{display:flex;justify-content:center;gap:10px;margin:14px 0}.fortflip{perspective:600px;display:inline-block;cursor:pointer;transition:transform .2s}.fortflip:hover{transform:translateY(-6px)}
    .fortflip.go canvas{animation:fortspin .7s ease-in-out forwards}@keyframes fortspin{0%{transform:rotateY(0)}50%{transform:rotateY(90deg) scale(1.08)}100%{transform:rotateY(0) scale(1.08)}}</style>
   <div class="panel"><h2>🔮 오늘의 운세</h2><p class="muted">칠죄종 카드 7장 중 1장 선택<br>정방향이면 좋은 효과, 역방향이면 조심해야 하지만 위로금이 있음.</p>
   <div class="fortpick">${[0, 1, 2].map(i => `<div class="fortflip" id="fp${i}" onclick="tarotPick(${i})">${fortCardHtml(null, 90)}</div>`).join('')}</div></div>`;
};
function tarotPick(i) {
  if (fortToday() || FORT_PICK >= 0) return; FORT_PICK = i; const card = rint(7), rev = Math.random() < .3, f = FORT[FORT_SINS[card]][rev ? 1 : 0], bonus = f.bonus || 0;
  const el = document.getElementById('fp' + (i || 0)); if (el) { el.classList.add('go'); const cv = el.querySelector('canvas'); setTimeout(() => { cv.dataset.c = card; cv.dataset.r = rev ? 1 : 0; fortPaint(cv, card, rev); }, 350); }
  sfx('tap');
  setTimeout(() => { FORT_PICK = -1; P.tarot = { v: 2, date: kstDate(), card, rev, bonus }; if (bonus) { LOG_W = 'tarot'; earn(bonus); LOG_W = null; } else saveP(); render(); toast(`🔮 ${fortName(P.tarot)} — ${f.fx}`); }, 900);
}
/* 내 정보 · 방에 붙는 작은 표시 */
function fortBadge(p, own) {
  const t = fortToday(p); if (!t) return own ? `<span class="chip" onclick="${typeof featOpen === 'function' && featOpen('tarot') ? "goFeat('tarot')" : "toast('점술 방을 찾으면 운세를 뽑을 수 있음')"}" style="cursor:pointer">🔮 오늘의 운세 뽑기</span>` : '';
  const f = FORT[FORT_SINS[t.card]][t.rev ? 1 : 0];
  return `<span class="chip" title="${esc(f.msg)}" style="cursor:help;${t.rev ? 'border-color:var(--wine2)' : 'border-color:var(--gold)'}">🔮 ${esc(fortName(t))}${own ? ` · ${esc(f.fx)}` : ''}</span>`;
}
function fortPanel() {
  const t = fortToday(), f = t && FORT[FORT_SINS[t.card]][t.rev ? 1 : 0];
  return `<div class="panel" style="margin:0"><h2>🔮 오늘의 운세</h2>${t ? `<div style="display:flex;gap:10px;align-items:center">${fortCardHtml(t, 54)}<div><b>${esc(fortName(t))}</b><div class="muted" style="font-size:.82rem">${esc(f.msg)}</div><div style="font-size:.85rem;color:${t.rev ? 'var(--wine2)' : 'var(--gold2)'}">${esc(f.fx)}</div></div></div>`
    : (typeof featOpen === 'function' && featOpen('tarot') ? '<p>아직 오늘의 카드를 뽑지 않음.</p><button onclick="goFeat(\'tarot\')">카드 뽑으러 가기</button>' : '<p class="muted">🔒 아직 점술 방을 찾지 못함</p>')}</div>`;
}
(function () { const _ra = typeof roomAfter === 'function' ? roomAfter : null; if (!_ra) return; roomAfter = function () { _ra.apply(this, arguments); fortPaintAll(); }; })();
