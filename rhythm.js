/* =========================================================
   햄카타 — 은식기 닦기 (리듬)  ·  유튜브 노래 · 난이도 · 큰 버튼 · 판정 표시
   노래 목록은 KP가 🗂 데이터 관리에서 만들어요 (settings/game.songs)
   박자: BPM 자동 생성, 또는 KP가 들으면서 두드려 녹화한 채보
   채보 저장 형식: 숫자 배열 v = round(초×100)×4 + 줄(0~2)   (Firestore는 2중 배열을 못 담아서)
   ========================================================= */
let SONGS = [];
const RDIFF = {
  easy:   { n: '쉬움',   fall: 2.4,  per: .12, good: .21, step: 2 },
  normal: { n: '보통',   fall: 1.75, per: .09, good: .16, step: 1 },
  hard:   { n: '어려움', fall: 1.3,  per: .07, good: .12, step: 1, half: .3 }
};
let RSEL = { song: '', diff: 'easy' };
try { const o = JSON.parse(localStorage.getItem('peccata_rsel') || '{}'); Object.assign(RSEL, o); } catch (e) {}
const rSave = () => { try { localStorage.setItem('peccata_rsel', JSON.stringify(RSEL)); } catch (e) {} };
const rLat = () => (+RSEL.lat || 0) / 1000;
const ytId = u => { u = String(u || '').trim(); const m = u.match(/(?:youtu\.be\/|[?&]v=|shorts\/|embed\/|live\/)([\w-]{11})/); return m ? m[1] : /^[\w-]{11}$/.test(u) ? u : ''; };
const encNotes = a => a.map(n => Math.round(n.t * 100) * 4 + n.l), decNotes = a => (a || []).map(v => ({ t: Math.floor(v / 4) / 100, l: v % 4 }));

/* ---------- 유튜브 ---------- */
let YT_READY = null;
function ytLoad() {
  if (window.YT && YT.Player) return Promise.resolve(true);
  if (YT_READY) return YT_READY;
  YT_READY = new Promise(res => {
    const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { try { prev && prev(); } catch (e) {} res(true); };
    const s = document.createElement('script'); s.src = 'https://www.youtube.com/iframe_api'; s.onerror = () => { YT_READY = null; res(false); }; document.head.appendChild(s);
    setTimeout(() => res(!!(window.YT && YT.Player)), 9000);
  });
  return YT_READY;
}
function ytMake(elId, id, start, ev) {
  return new YT.Player(elId, { videoId: id, width: '100%', height: '100%',
    playerVars: { start: Math.floor(start || 0), controls: 0, disablekb: 1, playsinline: 1, rel: 0, modestbranding: 1, fs: 0, iv_load_policy: 3 },
    events: { onReady: e => ev.ready && ev.ready(e.target), onStateChange: e => ev.state && ev.state(e.data), onError: e => ev.err && ev.err(e.data) } });
}
/* 영상 시각을 부드럽게: getCurrentTime은 듬성듬성 바뀌어서 사이를 시계로 채워요 */
function ytClock(pl) {
  let base = 0, at = performance.now(), run = false;
  return {
    sync() { try { const st = pl.getPlayerState(), t = pl.getCurrentTime(), now = performance.now(); run = st === 1; const est = base + (run ? (now - at) / 1000 : 0); if (!run || Math.abs(est - t) > .07) { base = t; at = now; } } catch (e) {} },
    now() { return base + (run ? (performance.now() - at) / 1000 : 0); },
    playing: () => run
  };
}
const ytErrTxt = c => c === 101 || c === 150 ? '이 영상은 다른 사이트에서 재생할 수 없게 막혀 있어요' : c === 100 ? '영상을 찾을 수 없어요' : '영상을 재생하지 못했어요';

/* ---------- 박자 (채보) ---------- */
function rChart(song, diff, t0, t1) {
  const D = RDIFF[diff], out = [];
  if (song && song.notes && song.notes.length) {
    const gap = diff === 'easy' ? .42 : diff === 'normal' ? .22 : 0; let last = -9;
    decNotes(song.notes).filter(n => n.t >= t0 + .8 && n.t <= t1).sort((a, b) => a.t - b.t).forEach(n => { if (n.t - last >= gap) { out.push(n); last = n.t; } else if (n.t - last < .03 && diff !== 'easy') out.push(n); });
    return out;
  }
  const bpm = song ? +song.bpm || 110 : 104, beat = 60 / bpm, off = song ? +song.offset || 0 : 0, R = seedRand((song ? song.id : 'free') + diff);
  let k = Math.ceil((t0 + 1.6 - off) / beat), prev = -1, rep = 0;
  for (; off + k * beat <= t1 - .4; k += D.step) {
    const t = off + k * beat; let l = Math.floor(R() * 3); if (l === prev && ++rep >= 2) { l = (l + 1 + Math.floor(R() * 2)) % 3; rep = 0; } else if (l !== prev) rep = 0; prev = l;
    out.push({ t, l });
    if (D.half && R() < D.half && t + beat / 2 <= t1 - .4) out.push({ t: t + beat / 2, l: (l + 1 + Math.floor(R() * 2)) % 3 });
    if (diff === 'hard' && R() < .08) out.push({ t, l: (l + 1) % 3 });
  }
  return out.sort((a, b) => a.t - b.t);
}

/* ---------- 고르는 화면 ---------- */
VIEWS.silver = () => {
  const songs = SONGS.filter(s => s.yt), cur = songs.find(s => s.id === RSEL.song);
  const sbtn = (id, ic, t, sub) => `<button class="item" style="width:100%;margin:4px 0;text-align:left;${RSEL.song === id ? 'border-color:var(--gold2);background:var(--panel2)' : ''}" onclick="RSEL.song='${id}';rSave();render()"><div><b>${ic} ${esc(t)}</b><div class="muted" style="font-size:.78rem">${sub}</div></div>${RSEL.song === id ? '<b style="color:var(--gold2)">✓</b>' : ''}</button>`;
  return `<div class="panel"><h2>🍴 은식기 닦기</h2><div id="rsel"><p class="muted">얼룩이 금색 선에 닿을 때 아래 버튼(또는 그 줄)을 눌러요 · ${capTxt('silver')}</p>
   <h3>🎵 노래</h3>${sbtn('', '🔔', '노래 없이', '기본 박자 · 40초')}
   ${songs.map(s => sbtn(s.id, s.notes && s.notes.length ? '🎙' : '🎵', s.title || '제목 없음', `${s.notes && s.notes.length ? '녹화한 박자' : 'BPM ' + s.bpm} · ${s.len || 60}초`)).join('')}
   ${!songs.length ? '<p class="muted" style="font-size:.8rem">KP가 노래를 넣으면 여기에 나와요.</p>' : ''}
   <h3>난이도</h3><div class="toggles">${Object.entries(RDIFF).map(([k, d]) => `<button class="${RSEL.diff === k ? 'on' : ''}" onclick="RSEL.diff='${k}';rSave();render()">${d.n}</button>`).join('')}</div>
   <details style="margin:8px 0"><summary class="muted">박자가 밀려 보이면 (보정)</summary><div class="toggles" style="margin-top:6px">${[-150, -100, -50, 0, 50, 100, 150].map(v => `<button class="sm ${(+RSEL.lat || 0) === v ? 'on' : ''}" onclick="RSEL.lat=${v};rSave();render()">${v > 0 ? '+' : ''}${v}ms</button>`).join('')}</div><p class="muted" style="font-size:.78rem">얼룩이 소리보다 늦게 오는 것 같으면 −, 빨리 오면 +.</p></details></div>
   <div id="gbox"><button class="primary" style="width:100%;padding:14px;font-size:1.1rem" onclick="silverStart()">▶ ${cur ? esc(cur.title) : '노래 없이'} · ${RDIFF[RSEL.diff].n}</button></div></div>`;
};

/* ---------- 게임 ---------- */
let RG = null;
async function silverStart() {
  const song = SONGS.find(s => s.id === RSEL.song && s.yt) || null, diff = RDIFF[RSEL.diff] ? RSEL.diff : 'easy', D = RDIFF[diff];
  const b = gbox(); if (!b) return; const sel = $('#rsel'); if (sel) sel.style.display = 'none';
  const W = 120, H = 170, LX = [20, 60, 100], HIT = 140, TOP = -6;
  b.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:6px"><b id="ghud">준비…</b><button class="sm" onclick="silverQuit()">그만두기</button></div>
   ${song ? `<div style="width:168px;aspect-ratio:16/9;margin:0 auto 6px;border-radius:6px;overflow:hidden;background:#000;position:relative"><div id="ytEl"></div></div>` : ''}
   <div style="position:relative;max-width:360px;margin:auto"><canvas id="gcv" style="width:100%;aspect-ratio:${W}/${H};image-rendering:pixelated;touch-action:none;display:block;border-radius:6px 6px 0 0;background:#1a1010"></canvas>
   <div id="rgOver" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.55);border-radius:6px 6px 0 0"><button class="primary" id="rgGo" style="padding:14px 22px;font-size:1.15rem" disabled>${song ? '영상 불러오는 중…' : '▶ 시작'}</button></div></div>
   <div class="row" style="max-width:360px;margin:0 auto;gap:4px;flex-wrap:nowrap;touch-action:none">${['🍴', '🔪', '🥄'].map((e, i) => `<button class="rgbtn" data-l="${i}" style="flex:1;height:74px;font-size:1.8rem;border-radius:0 0 ${i === 0 ? '0 10px' : i === 2 ? '10px 0' : '0 0'};touch-action:none">${e}</button>`).join('')}</div>
   <p class="muted" style="text-align:center;font-size:.75rem;margin:4px 0">PC: A S D 또는 ← ↓ → 키</p>`;
  const cv = $('#gcv'), cw = cv.clientWidth || 300, S = Math.max(2, Math.round(cw / W * (window.devicePixelRatio || 1)));
  cv.width = W * S; cv.height = H * S; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const px = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x * S), Math.round(y * S), Math.max(1, Math.round(w * S)), Math.max(1, Math.round(h * S))); };
  const txt = (s, x, y, c, sz) => { g.font = `700 ${Math.round(sz * S)}px Galmuri11, monospace`; g.textAlign = 'center'; g.fillStyle = '#140c06'; g.fillText(s, (x + .6) * S, (y + .6) * S); g.fillStyle = c; g.fillText(s, x * S, y * S); };
  const t0 = song ? +song.start || 0 : 0, t1 = song ? t0 + (+song.len || 60) : 40;
  const R = RG = { song, diff, notes: rChart(song, diff, t0, t1), score: 0, combo: 0, best: 0, per: 0, good: 0, miss: 0, fx: [], flash: [0, 0, 0], judge: null, over: false, started: false, pl: null, clk: null, tick: -1 };
  const total = R.notes.length;
  // 시계: 영상이 있으면 영상 시각, 없으면 내 시계 + 똑딱 소리
  let freeAt = 0; const T = () => (R.clk ? R.clk.now() : (performance.now() - freeAt) / 1000) + rLat();
  R.T = T;
  const go = $('#rgGo');
  const begin = () => { if (R.started) return; R.started = true; const o = $('#rgOver'); if (o) o.style.display = 'none'; if (!song) freeAt = performance.now(); sfx('tap'); };
  if (song) {
    const ok = await ytLoad();
    if (!ok || !window.YT) { toast('유튜브를 불러오지 못해서 노래 없이 해요'); RSEL.song = ''; return silverStart(); }
    R.pl = ytMake('ytEl', song.yt, t0, {
      ready: p => { R.clk = ytClock(p); try { p.seekTo(t0, true); p.pauseVideo(); } catch (e) {} if (go && document.body.contains(go)) { go.disabled = false; go.textContent = '▶ 시작'; } },
      state: s => { if (s === 1 && !R.started) begin(); },
      err: c => { toast(ytErrTxt(c)); if (go) { go.disabled = false; go.textContent = '노래 없이 시작'; go.onclick = () => { try { R.pl.destroy(); } catch (e) {} R.pl = null; R.clk = null; begin(); }; } }
    });
    go.onclick = () => { if (!R.pl || !R.clk) return; go.disabled = true; go.textContent = '재생 중…'; try { R.pl.seekTo(t0, true); R.pl.playVideo(); } catch (e) {} };
  } else { go.disabled = false; go.onclick = begin; }
  // 누르기
  const tap = l => { if (!R.started || R.over) return; R.flash[l] = .14; const now = T(); let bi = -1, bd = 9;
    R.notes.forEach((n, i) => { if (n.l === l && !n.done) { const d = Math.abs(n.t - now); if (d < bd) { bd = d; bi = i; } } });
    if (bi >= 0 && bd <= D.good) { const n = R.notes[bi]; n.done = true; const pf = bd <= D.per; R.combo++; R.best = Math.max(R.best, R.combo); pf ? R.per++ : R.good++;
      R.score += (pf ? 3 : 1) * (1 + Math.min(R.combo, 30) / 10); R.judge = { s: pf ? 'PERFECT' : 'GOOD', c: pf ? '#ffe08a' : '#e8ecf4', t: 0 };
      for (let k = 0; k < (pf ? 10 : 5); k++) { const a = Math.random() * 6.28, sp = 20 + Math.random() * 40; R.fx.push({ x: LX[l], y: HIT, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 20, t: .45 }); }
      sfx('tap'); if (typeof buzz === 'function') buzz(pf ? 14 : 8); }
    else if (bi >= 0 && bd < D.good * 2.2) { R.combo = 0; R.judge = { s: '조금 빨라요', c: '#e8a080', t: 0 }; }
  };
  b.querySelectorAll('.rgbtn').forEach(el => { el.onpointerdown = e => { e.preventDefault(); tap(+el.dataset.l); el.classList.add('on'); setTimeout(() => el.classList.remove('on'), 110); }; });
  cv.onpointerdown = e => { const r = cv.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W; tap(x < 40 ? 0 : x < 80 ? 1 : 2); };
  const KEYS = { a: 0, s: 1, d: 2, arrowleft: 0, arrowdown: 1, arrowright: 2, j: 0, k: 1, l: 2 };
  const kd = e => { const l = KEYS[(e.key || '').toLowerCase()]; if (l == null || e.repeat) return; e.preventDefault(); tap(l); };
  document.addEventListener('keydown', kd);
  // 그리기
  const bpm = song && !(song.notes && song.notes.length) ? +song.bpm || 110 : song ? 0 : 104, beat = bpm ? 60 / bpm : 0, off = song ? +song.offset || 0 : 0;
  let raf = 0, last = performance.now(), syncT = 0;
  const loop = nowMs => { const dt = Math.min(.05, (nowMs - last) / 1000); last = nowMs;
    if (R.clk && (syncT -= dt) <= 0) { R.clk.sync(); syncT = .25; }
    const now = R.started ? T() : t0;
    if (R.started) R.notes.forEach(n => { if (!n.done && now - n.t > D.good) { n.done = true; n.miss = true; R.miss++; R.combo = 0; R.judge = { s: 'MISS', c: '#ff7a7a', t: 0 }; } });
    // 똑딱 (노래 없을 때)
    if (R.started && !song && beat) { const bi = Math.floor((now - off) / beat); if (bi !== R.tick && bi >= 0) { R.tick = bi; rTick(bi % 4 === 0); } }
    px(0, 0, W, H, '#3a2418'); for (let y = 0; y < H; y += 12) px(0, y, W, 1, '#4a2e1e');
    LX.forEach((x, i) => { px(x - 18, 0, 36, H, i % 2 ? 'rgba(240,232,214,.07)' : 'rgba(240,232,214,.11)'); px(x - 18, 0, 1, H, 'rgba(0,0,0,.28)');
      if (R.flash[i] > 0) { px(x - 18, 0, 36, H, `rgba(255,230,150,${R.flash[i] * 1.6})`); R.flash[i] -= dt; } });
    const pulse = beat && R.started ? Math.max(0, 1 - (((now - off) / beat) % 1) * 4) : 0;
    px(0, HIT - 7, W, 14, `rgba(201,160,54,${.12 + pulse * .18})`); px(2, HIT - 1.5, W - 4, 3, '#c9a036'); px(2, HIT - 1.5, W - 4, 1, '#ffe08a');
    LX.forEach(x => { px(x - 11, HIT - 6, 22, 12, 'rgba(255,224,138,.16)'); px(x - 11, HIT - 6, 22, 1, '#ffe08a'); px(x - 11, HIT + 5, 22, 1, '#ffe08a'); });
    R.notes.forEach(n => { if (n.done) return; const y = HIT - (n.t - now) / D.fall * (HIT - TOP); if (y < TOP - 10 || y > H + 10) return; const x = LX[n.l], near = Math.abs(n.t - now) <= D.good;
      if (near) px(x - 10, y - 8, 20, 16, 'rgba(255,240,180,.5)');
      px(x - 8, y - 5, 16, 10, '#4a4a40'); px(x - 6, y - 7, 12, 14, '#4a4a40'); px(x - 5, y - 4, 10, 6, near ? '#9a9a70' : '#6a6a58'); px(x - 3, y - 3, 3, 2, '#b0b090'); });
    R.fx.forEach(f => { f.x += f.vx * dt; f.y += f.vy * dt; f.vy += 80 * dt; f.t -= dt; px(f.x, f.y, 1.4, 1.4, '#fff6c0'); }); R.fx = R.fx.filter(f => f.t > 0);
    if (R.judge) { R.judge.t += dt; const a = R.judge.t; if (a < .55) txt(R.judge.s, 60, HIT - 22 - a * 14, R.judge.c, R.judge.s.length > 6 ? 9 : 10); else R.judge = null; }
    if (R.combo > 2) txt(`${R.combo} 콤보`, 60, 18, R.combo >= 20 ? '#ffe08a' : '#ffb070', 8);
    const prog = Math.max(0, Math.min(1, (now - t0) / (t1 - t0))); px(4, 4, 112, 3, '#1a1010'); px(4, 4, 112 * prog, 3, '#e8ecf4');
    const hud = $('#ghud'); if (hud) hud.textContent = `${R.started ? `⏱ ${Math.max(0, Math.ceil(t1 - now))}` : '준비'} · 점수 ${Math.round(R.score)} · ${RDIFF[diff].n}`;
    if (R.started && !R.over && now >= t1 + .3) return rEnd(total);
    raf = requestAnimationFrame(loop); };
  const G = lockGame(() => { cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); if (R.pl) { try { R.pl.destroy(); } catch (e) {} } });
  raf = requestAnimationFrame(loop); setTimeout(() => { const p = b.closest('.panel'); if (p) p.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 50);
}
function silverQuit() { stopGame(); RG = null; render(); }
function rEnd(total) {
  const R = RG; if (!R || R.over) return; R.over = true; if (R.pl) { try { R.pl.pauseVideo(); } catch (e) {} }
  stopGame(); RG = null;
  const acc = total ? Math.round((R.per + R.good * .6) / total * 100) : 0, coins = Math.round(R.score / 9);
  const r = reward('silver', Math.min(25, coins), Math.round(R.score));
  const rank = acc >= 95 ? 'S' : acc >= 85 ? 'A' : acc >= 70 ? 'B' : acc >= 50 ? 'C' : 'D';
  finishGame(`<h2 style="color:var(--gold2);margin-top:0">🍴 반짝반짝 닦았어요!</h2>
   <p style="font-size:2.2rem;margin:2px 0;color:var(--gold2)"><b>${rank}</b> <span style="font-size:1rem" class="muted">${acc}%</span></p><p class="muted">${r}</p>
   <p class="muted">${R.song ? esc(R.song.title) + ' · ' : ''}${RDIFF[R.diff].n} · PERFECT ${R.per} · GOOD ${R.good} · MISS ${R.miss} · 최고 콤보 ${R.best}</p>
   <div class="row"><button class="primary" style="flex:1" onclick="closeModal();silverStart()">▶ 다시</button><button onclick="closeModal()">닫기</button></div>`);
}
let R_AC = null;
function rTick(strong) { try { R_AC = R_AC || new (window.AudioContext || window.webkitAudioContext)(); const t = R_AC.currentTime, o = R_AC.createOscillator(), gn = R_AC.createGain();
  o.frequency.value = strong ? 1320 : 880; o.type = 'square'; gn.gain.setValueAtTime(.05, t); gn.gain.exponentialRampToValueAtTime(.0001, t + .06); o.connect(gn); gn.connect(R_AC.destination); o.start(t); o.stop(t + .07); } catch (e) {} }
(function () { const st = document.createElement('style'); st.textContent = '.rgbtn{background:linear-gradient(#5a4030,#3a2418);border:2px solid #7a5a38;color:#fff;user-select:none;-webkit-user-select:none}.rgbtn.on{background:linear-gradient(#ffe08a,#c9a036);border-color:#ffe08a}'; document.head.appendChild(st); })();

/* ================= KP: 노래 목록 · 박자 맞추기 · 두드려 녹화 ================= */
async function songsSave() { try { await B.set('settings/game', { songs: SONGS }, true); toast('노래 목록을 저장했어요'); } catch (e) { toast('저장 실패: ' + (e.code || e.message)); } }
function songsPanel() {
  return `<div class="panel"><h2>🎵 은식기 닦기 노래</h2><p class="muted">유튜브 주소와 BPM을 넣으면 박자에 맞춰 얼룩이 나와요. 🎧로 BPM을 두드려 맞추거나, 직접 두드려 박자를 녹화할 수 있어요.</p>
   ${SONGS.length ? SONGS.map((s, i) => `<div class="item" style="margin:5px 0"><div style="min-width:0"><b>${esc(s.title || '제목 없음')}</b><div class="muted" style="font-size:.78rem">${s.notes && s.notes.length ? `🎙 녹화 ${s.notes.length}개` : `BPM ${s.bpm} · 첫 박 ${s.offset || 0}초`} · ${s.start || 0}초부터 ${s.len || 60}초</div></div>
     <div class="row" style="flex:0 0 auto;gap:4px"><button class="sm" onclick="songTool(${i})">🎧</button><button class="sm" onclick="songEdit(${i})">✏</button><button class="sm danger" onclick="if(confirm('지울까요?')){SONGS.splice(${i},1);songsSave()}">×</button></div></div>`).join('') : '<p class="muted">아직 노래가 없어요.</p>'}
   <button onclick="songEdit(-1)">+ 노래 추가</button></div>`;
}
function songEdit(i) {
  const s = i >= 0 ? SONGS[i] : { title: '', yt: '', bpm: 120, offset: 0, start: 0, len: 60 };
  modal(`<h2 style="color:var(--gold2);margin-top:0">🎵 ${i >= 0 ? '노래 고치기' : '노래 추가'}</h2>
   <label class="f">유튜브 주소</label><input id="sgYt" value="${esc(s.yt ? 'https://youtu.be/' + s.yt : '')}" placeholder="https://youtu.be/...">
   <label class="f">제목</label><input id="sgTi" maxlength="40" value="${esc(s.title)}">
   <div class="row" style="gap:6px"><div style="flex:1"><label class="f">BPM</label><input id="sgBpm" type="number" step="0.5" value="${s.bpm}"></div><div style="flex:1"><label class="f">첫 박 위치(초)</label><input id="sgOff" type="number" step="0.01" value="${s.offset || 0}"></div></div>
   <div class="row" style="gap:6px"><div style="flex:1"><label class="f">시작(초)</label><input id="sgSt" type="number" value="${s.start || 0}"></div><div style="flex:1"><label class="f">길이(초)</label><input id="sgLen" type="number" value="${s.len || 60}"></div></div>
   <p class="muted" style="font-size:.8rem">BPM·첫 박을 모르면 저장한 뒤 🎧에서 두드려 맞출 수 있어요.</p>
   <div class="row"><button onclick="closeModal()">취소</button><button class="primary" onclick="songEditSave(${i})">저장</button></div>`);
}
function songEditSave(i) {
  const yt = ytId($('#sgYt').value); if (!yt) return toast('유튜브 주소를 확인해 주세요');
  const s = i >= 0 ? SONGS[i] : { id: Math.random().toString(36).slice(2, 9) };
  Object.assign(s, { yt, title: $('#sgTi').value.trim() || '제목 없음', bpm: Math.max(40, Math.min(260, +$('#sgBpm').value || 120)), offset: +(+$('#sgOff').value || 0).toFixed(2), start: Math.max(0, +$('#sgSt').value || 0), len: Math.max(15, Math.min(240, +$('#sgLen').value || 60)) });
  if (i < 0) SONGS.push(s); closeModal(); songsSave();
}
/* 🎧: 영상을 틀어 놓고 ① 박자마다 TAP → BPM·첫 박 계산  ② 줄 버튼을 두드려 박자 녹화 */
let ST = null;
async function songTool(i) {
  const s = SONGS[i]; if (!s) return; if (!(await ytLoad()) || !window.YT) return toast('유튜브를 불러오지 못했어요');
  ST = { i, mode: 'bpm', taps: [], rec: [], recOn: false, pl: null, clk: null };
  modal(`<div id="stBox"><h2 style="color:var(--gold2);margin-top:0">🎧 ${esc(s.title)}</h2>
   <div style="aspect-ratio:16/9;border-radius:8px;overflow:hidden;background:#000"><div id="stYt"></div></div>
   <div class="toggles" style="margin:8px 0"><button id="stM1" class="on" onclick="stMode('bpm')">BPM 맞추기</button><button id="stM2" onclick="stMode('rec')">두드려 녹화</button></div>
   <div id="stBody"></div>
   <div class="row" style="margin-top:8px"><button onclick="stClose()">닫기</button></div></div>`);
  stMode('bpm');
  ST.pl = ytMake('stYt', s.yt, s.start || 0, { ready: p => { ST.clk = ytClock(p); stMode('bpm'); }, err: c => toast(ytErrTxt(c)) });
  ST.iv = setInterval(() => { if (!document.getElementById('stBox')) return stClose(true); if (ST.clk) ST.clk.sync(); const el = $('#stT'); if (el && ST.clk) el.textContent = ST.clk.now().toFixed(2) + '초';
    const s2 = SONGS[ST.i]; if (ST.recOn && ST.clk && ST.clk.now() >= (s2.start || 0) + (s2.len || 60)) stRecStop(); }, 120);
  ST.kd = e => { if (!ST) return; const k = (e.key || '').toLowerCase(); if (ST.mode === 'bpm' && (k === ' ' || k === 'enter')) { e.preventDefault(); stTap(); } else if (ST.mode === 'rec') { const l = { a: 0, s: 1, d: 2, arrowleft: 0, arrowdown: 1, arrowright: 2 }[k]; if (l != null && !e.repeat) { e.preventDefault(); stRecTap(l); } } };
  document.addEventListener('keydown', ST.kd);
}
function stClose(silent) { if (!ST) return; clearInterval(ST.iv); document.removeEventListener('keydown', ST.kd); try { ST.pl && ST.pl.destroy(); } catch (e) {} ST = null; if (!silent) closeModal(); }
function stMode(m) {
  if (!ST) return; ST.mode = m; const s = SONGS[ST.i], b = $('#stBody'); if (!b) return;
  $('#stM1').classList.toggle('on', m === 'bpm'); $('#stM2').classList.toggle('on', m === 'rec');
  if (m === 'bpm') b.innerHTML = `<p class="muted">▶ 재생한 뒤 박자에 맞춰 TAP을 8번 이상 눌러요 (PC는 스페이스). <span id="stT"></span></p>
    <div class="row" style="gap:6px"><button onclick="stPlay()">▶ 재생</button><button onclick="try{ST.pl.pauseVideo()}catch(e){}">⏸</button><button onclick="ST.taps=[];stShow()">다시 세기</button></div>
    <button class="primary" style="width:100%;height:90px;font-size:1.5rem;margin-top:8px;touch-action:none" onpointerdown="event.preventDefault();stTap()">TAP</button><div id="stRes" class="muted" style="margin-top:6px">지금 BPM ${s.bpm} · 첫 박 ${s.offset || 0}초</div>`;
  else b.innerHTML = `<p class="muted">녹화를 누르면 ${s.start || 0}초부터 ${s.len || 60}초 동안 재생돼요. 얼룩이 나올 자리마다 줄 버튼을 두드려요 (PC는 A S D). <span id="stT"></span></p>
    <div class="row" style="gap:6px"><button class="primary" id="stRecB" onclick="stRecStart()">● 녹화</button><button onclick="stRecStop()">■ 멈춤</button><span class="muted" id="stRecN">${s.notes && s.notes.length ? `저장된 녹화 ${s.notes.length}개` : '녹화 없음 (BPM으로 자동)'}</span></div>
    <div class="row" style="gap:4px;margin-top:8px;flex-wrap:nowrap;touch-action:none">${['🍴', '🔪', '🥄'].map((e, l) => `<button class="rgbtn" style="flex:1;height:80px;font-size:1.7rem;touch-action:none" onpointerdown="event.preventDefault();stRecTap(${l});this.classList.add('on');setTimeout(()=>this.classList.remove('on'),110)">${e}</button>`).join('')}</div>
    <div class="row" style="gap:6px;margin-top:8px"><button class="primary" onclick="stRecSave()">녹화 저장</button><button class="danger" onclick="stRecClear()">녹화 지우기 (BPM으로)</button></div>`;
}
function stPlay() { try { ST.pl.playVideo(); } catch (e) {} }
function stTap() { if (!ST || !ST.clk || !ST.clk.playing()) return toast('먼저 ▶ 재생을 눌러요'); ST.taps.push(ST.clk.now()); sfx('tap'); stShow(); }
function stCalc() {
  const t = ST.taps; if (t.length < 4) return null; const n = t.length, xs = t.map((_, i) => i), mx = (n - 1) / 2, my = t.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (t[i] - my); sxx += (x - mx) ** 2; }); const beat = sxy / sxx, b0 = my - beat * mx;
  if (!(beat > .2 && beat < 1.6)) return null; const bpm = Math.round(60 / beat * 2) / 2, bt = 60 / bpm, off = ((b0 % bt) + bt) % bt;
  return { bpm, off: +off.toFixed(2) };
}
function stShow() { const el = $('#stRes'); if (!el) return; const c = stCalc(); el.innerHTML = c ? `${ST.taps.length}번 · <b style="color:var(--gold2)">BPM ${c.bpm}</b> · 첫 박 ${c.off}초 <button class="sm primary" onclick="stApply()">적용</button>` : `${ST.taps.length}번 눌렀어요… (4번 이상)`; }
function stApply() { const c = stCalc(); if (!c) return; const s = SONGS[ST.i]; s.bpm = c.bpm; s.offset = c.off; songsSave(); stShow(); }
function stRecStart() { if (!ST || !ST.pl) return; const s = SONGS[ST.i]; ST.rec = []; try { ST.pl.seekTo(s.start || 0, true); ST.pl.playVideo(); } catch (e) {} ST.recOn = true; const b = $('#stRecB'); if (b) b.textContent = '● 녹화 중…'; const n = $('#stRecN'); if (n) n.textContent = '0개'; }
function stRecTap(l) { if (!ST || !ST.recOn || !ST.clk || !ST.clk.playing()) return; ST.rec.push({ t: +ST.clk.now().toFixed(2), l }); sfx('tap'); const n = $('#stRecN'); if (n) n.textContent = ST.rec.length + '개'; }
function stRecStop() { if (!ST) return; ST.recOn = false; try { ST.pl.pauseVideo(); } catch (e) {} const b = $('#stRecB'); if (b) b.textContent = '● 녹화'; const n = $('#stRecN'); if (n) n.textContent = `녹화 ${ST.rec.length}개 (저장하려면 녹화 저장)`; }
function stRecSave() { if (!ST || !ST.rec.length) return toast('녹화한 박자가 없어요'); const s = SONGS[ST.i]; s.notes = encNotes(ST.rec.sort((a, b) => a.t - b.t)); songsSave(); const n = $('#stRecN'); if (n) n.textContent = `저장된 녹화 ${s.notes.length}개`; }
function stRecClear() { const s = SONGS[ST.i]; delete s.notes; songsSave(); const n = $('#stRecN'); if (n) n.textContent = '녹화 없음 (BPM으로 자동)'; }

/* 데이터 관리 화면에 노래 칸 붙이기 */
if (typeof VIEWS.kdata === 'function') { const _kd = VIEWS.kdata; VIEWS.kdata = () => _kd() + songsPanel(); }
