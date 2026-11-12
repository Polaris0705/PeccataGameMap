/* ============================================================
   Ⅶ・peccata — 내 방 (도트 그래픽 방 꾸미기 · 놀러 가기 · 좋아요 · 방명록)
   데이터: progress/{uid}.room = {wall, floor, ow:[소유 벽지·바닥], inv:{가구:개수}, items:[{id,k,c,r}]}
           r = -1 이면 벽 장식(벽 칸 c), 0~2 면 바닥 줄
   ============================================================ */
const RW = 256, RH = 192, WALL_H = 88, FLOOR_Y = 96, CELL = 32, COLS = 8, ROWS = 3;

/* ---------- 도트 스프라이트 (칸 하나 = 32×32 도트) ---------- */
// draw(c, t, o): c(x,y,w,h,색) 사각형, o(x,y,w,h,채움,테두리) 테두리 있는 사각형, t = 애니메이션 프레임
const K = '#140c06', GOLD = '#e0b050', GOLD2 = '#ffe27a';
const W1 = '#6a4428', W2 = '#8a5a34', W3 = '#a87444', W0 = '#4a2e1a';
function leaf(o, c, x, y, w, h) { o(x, y, w, h, '#4f8a45', K); c(x + 1, y + 1, w - 2, 1, '#7fc070'); c(x + 1, y + h - 2, w - 2, 1, '#3f6b3a'); }
function todSky(c, t, x, y, w, h) {
  const tod = (typeof curTod === 'function' && curTod()) || 'night';
  const S = { morning: ['#f6c49a', '#ffe6bc', '#fff3d6'], day: ['#5aa4e6', '#86c2f0', '#b4dcf8'], evening: ['#5a3a7a', '#c25a5a', '#f09a5a'], night: ['#0a0f30', '#141c48', '#1e2a62'] }[tod];
  const b = Math.ceil(h / 3); c(x, y, w, b, S[0]); c(x, y + b, w, b, S[1]); c(x, y + 2 * b, w, h - 2 * b, S[2]);
  if (tod === 'night') { [[3, 4], [10, 9], [20, 3], [24, 14], [6, 20], [16, 24], [22, 30]].forEach(([a, d], i) => { if (d < h && a < w && (t + i) % 6) c(x + a, y + d, 1, 1, '#f4ecd0'); }); c(x + w - 9, y + 4, 5, 5, '#f4ecd0'); c(x + w - 8, y + 4, 3, 3, S[0]); }
  if (tod === 'day') { c(x + w - 10, y + 4, 6, 6, '#fff2a0'); c(x + w - 9, y + 3, 4, 8, '#fff2a0'); c(x + 3, y + 10, 9, 3, '#ffffff'); c(x + 5, y + 8, 5, 2, '#ffffff'); c(x + 14, y + 16, 7, 2, '#eef6ff'); }
  if (tod === 'morning') { c(x + 4, y + h - 13, 8, 6, '#fff0a0'); c(x + 5, y + h - 14, 6, 8, '#fff0a0'); c(x + 14, y + 8, 8, 2, '#ffffff'); }
  if (tod === 'evening') { c(x + w - 13, y + h - 12, 9, 5, '#ffd27a'); c(x + w - 12, y + h - 13, 7, 7, '#ffd27a'); c(x + 3, y + 7, 10, 2, '#e8a0a0'); }
  const tree = { morning: '#3a5a3a', day: '#2e5a2e', evening: '#2a2030', night: '#060a18' }[tod];
  c(x, y + h - 6, w, 6, tree); c(x + 2, y + h - 10, 5, 4, tree); c(x + 9, y + h - 12, 6, 6, tree); c(x + w - 8, y + h - 9, 6, 3, tree);
}
const FURN = {
  bed: { name: '침대', cost: 60, w: 2, h: 32, draw(c, t, o) {
    o(0, 0, 8, 32, '#5a3a24', K); c(2, 2, 4, 1, '#7a5234'); c(3, 0, 2, 1, GOLD);
    o(6, 20, 54, 8, W1, K); c(7, 21, 52, 1, W2);
    o(7, 10, 52, 12, '#f1ead8', K); c(8, 11, 50, 1, '#ffffff');
    o(24, 9, 36, 14, '#8a2433', K); c(25, 10, 34, 2, '#a83a4a'); c(25, 15, 34, 1, '#6e1b28'); c(25, 18, 34, 1, '#6e1b28'); c(24, 9, 3, 14, '#a83a4a'); c(24, 9, 1, 14, K);
    for (let x = 29; x < 58; x += 6) c(x, 13, 2, 2, GOLD);
    o(9, 5, 14, 10, '#fffaf0', K); c(10, 6, 12, 2, '#ffffff'); c(10, 13, 12, 1, '#d8d0c0'); c(15, 8, 2, 4, '#e8e0d0');
    o(56, 10, 8, 22, '#5a3a24', K); c(58, 12, 4, 1, '#7a5234'); c(7, 28, 3, 4, K); c(52, 28, 3, 4, K); } },
  desk: { name: '책상', cost: 30, w: 1, h: 32, draw(c, t, o) {
    o(0, 10, 32, 5, W2, K); c(1, 11, 30, 1, W3);
    o(2, 14, 4, 18, W1, K); o(26, 14, 4, 18, W1, K); c(6, 15, 20, 1, W0);
    o(15, 14, 12, 9, '#7a4e2c', K); c(16, 15, 10, 1, W2); c(20, 18, 2, 2, GOLD);
    o(3, 4, 11, 7, '#3a5a8a', K); c(4, 5, 9, 1, '#5a7aaa'); c(4, 9, 9, 1, '#f1ead8'); c(13, 5, 1, 5, '#2a4a7a');
    o(17, 6, 5, 5, '#2a2a30', K); c(18, 7, 1, 1, '#5a5a70'); c(21, 0, 1, 7, '#f1ead8'); c(22, 0, 2, 3, '#f1ead8'); c(23, 2, 1, 2, '#d8d0c0');
    o(25, 7, 4, 4, '#f4f0e8', K); } },
  chair: { name: '의자', cost: 15, w: 1, h: 32, draw(c, t, o) {
    o(7, 0, 4, 22, W1, K); o(21, 0, 4, 22, W1, K); o(7, 0, 18, 4, '#7a4e2c', K); c(8, 1, 16, 1, W3);
    o(11, 4, 10, 12, '#8a2433', K); c(12, 5, 8, 1, '#a83a4a'); c(15, 8, 2, 2, GOLD);
    o(5, 18, 22, 6, '#8a2433', K); c(6, 19, 20, 1, '#b84a5a'); c(6, 22, 20, 1, '#6e1b28');
    o(6, 23, 3, 9, '#5a3a24', K); o(23, 23, 3, 9, '#5a3a24', K); } },
  shelf: { name: '책장', cost: 120, w: 1, h: 64, eff: '수수께끼 힌트 20% 할인', draw(c, t, o) {
    o(0, 0, 32, 64, '#5a3a24', K); c(1, 1, 30, 3, W0); c(1, 1, 30, 1, '#7a5234'); c(3, 4, 26, 58, '#24160c');
    c(2, 22, 28, 2, W1); c(2, 42, 28, 2, W1); c(2, 61, 28, 2, W1);
    const cols = ['#8a2433', '#3a5a8a', '#c9a96a', '#3f6b3a', '#6a4a8a', '#a0522d', '#e8dcc0', '#2a6a6a'];
    [[5, 22], [25, 42], [45, 61]].forEach(([top, bot], row) => {
      let x = 4, i = row * 3;
      while (x < 27) { const w = [3, 2, 4, 3, 2][i % 5], h = 11 + ((i * 7 + row) % 6); if (x + w > 28) break;
        const col = cols[(i * 5 + row) % cols.length];
        if (i % 7 === 4 && x + 6 < 28) { c(x, bot - 4, 6, 4, col); c(x, bot - 4, 6, 1, '#ffffff33'); x += 7; i++; continue; }
        c(x, bot - h, w, h, col); c(x, bot - h, 1, h, '#ffffff22'); c(x, bot - h + 3, w, 1, '#00000055'); c(x, bot - 4, w, 1, GOLD);
        x += w; if (i % 4 === 3) x++; i++; }
    });
    c(24, 28, 3, 3, '#e8e0c0'); } },
  plant: { name: '화분', cost: 80, w: 1, h: 48, eff: '온실 성장 5% 빨라짐 (최대 3개)', max: 3, draw(c, t, o) {
    const s = (t >> 2) % 2;
    o(8, 32, 16, 16, '#a0522d', K); o(6, 30, 20, 5, '#b8693d', K); c(7, 31, 18, 1, '#d08a5a'); c(9, 36, 2, 10, '#c87a4a'); c(10, 40, 12, 1, '#8a4224');
    c(15, 8, 2, 23, '#2e6a30'); c(11, 18, 5, 1, '#2e6a30'); c(17, 14, 5, 1, '#2e6a30');
    leaf(o, c, 3 - s, 14, 10, 6); leaf(o, c, 19 + s, 9, 10, 6); leaf(o, c, 2, 23, 12, 5); leaf(o, c, 18, 20, 11, 5); leaf(o, c, 10 + s, 2, 10, 7); leaf(o, c, 9, 26, 6, 4);
    c(12, 4 + s, 2, 2, '#f08ab0'); } },
  lamp: { name: '스탠드', cost: 25, w: 1, h: 64, draw(c, t, o) {
    c(4, 21, 24, 3, 'rgba(255,236,170,.22)'); c(2, 24, 28, 3, 'rgba(255,236,170,.12)');
    o(9, 58, 14, 6, '#3a3030', K); c(10, 59, 12, 1, '#5a5050');
    c(14, 20, 4, 38, K); c(15, 20, 2, 38, '#9a8a6a'); c(15, 30, 2, 2, GOLD); c(15, 44, 2, 2, GOLD);
    for (let i = 0; i < 17; i++) { const w = 12 + i, x = 16 - Math.ceil(w / 2); c(x - 1, 3 + i, w + 2, 1, K); c(x, 3 + i, w, 1, i < 3 ? '#f4dc90' : i % 4 === 0 ? '#d8b76a' : '#e8c77a'); }
    c(6, 20, 20, 1, K); c(10, 1, 12, 2, K); c(12, 0, 8, 1, GOLD); } },
  wardrobe: { name: '옷장', cost: 70, w: 1, h: 64, draw(c, t, o) {
    o(0, 2, 32, 62, W1, K); c(0, 0, 32, 4, W0); c(4, 0, 24, 1, GOLD); c(1, 4, 30, 1, W3);
    o(2, 6, 14, 52, '#7a5030', K); o(16, 6, 14, 52, '#7a5030', K);
    [[4, 9], [18, 9]].forEach(([x]) => { o(x, 9, 10, 19, '#8a5a38', '#5a3a20'); o(x, 32, 10, 22, '#8a5a38', '#5a3a20'); c(x + 1, 10, 8, 1, '#a07048'); c(x + 1, 33, 8, 1, '#a07048'); });
    c(13, 29, 2, 6, GOLD); c(17, 29, 2, 6, GOLD); c(13, 29, 2, 1, GOLD2);
    c(2, 60, 5, 4, K); c(25, 60, 5, 4, K); } },
  rug: { name: '양탄자', cost: 40, w: 2, h: 32, flat: true, draw(c) {
    o0(c, 2, 6, 60, 22, '#6e1b28', K); c(5, 9, 54, 16, '#a83a4a'); c(8, 11, 48, 12, '#6e1b28'); c(11, 13, 42, 8, '#c9a96a'); c(13, 14, 38, 6, '#8a2433');
    c(28, 13, 8, 8, '#6e1b28'); c(30, 15, 4, 4, GOLD); c(31, 12, 2, 10, GOLD); c(27, 16, 10, 2, GOLD);
    for (let x = 16; x < 26; x += 4) { c(x, 16, 2, 2, GOLD); c(x + 22, 16, 2, 2, GOLD); }
    for (let i = 0; i < 11; i++) { c(0, 7 + i * 2, 2, 1, '#e8dcc0'); c(62, 7 + i * 2, 2, 1, '#e8dcc0'); } } },
  teaset: { name: '찻상', cost: 150, w: 1, h: 32, eff: '티룸 팁 +1', draw(c, t, o) {
    o(2, 16, 28, 4, '#e8e0d0', K); c(3, 17, 26, 1, '#ffffff'); c(3, 20, 26, 3, '#d8d0c0'); for (let x = 4; x < 28; x += 3) c(x, 22, 1, 2, '#d8d0c0');
    o(14, 22, 4, 8, '#5a3a24', K); o(8, 29, 16, 3, '#5a3a24', K);
    o(7, 6, 13, 10, '#f4f0e8', K); c(8, 7, 11, 2, '#ffffff'); c(9, 11, 9, 1, '#3a5a8a'); c(12, 10, 3, 3, '#3a5a8a');
    o(11, 3, 5, 4, '#f4f0e8', K); c(13, 1, 1, 2, GOLD);
    c(20, 8, 3, 1, K); c(20, 9, 4, 2, '#f4f0e8'); c(23, 7, 2, 2, '#f4f0e8'); c(4, 8, 3, 1, K); c(4, 8, 1, 6, K); c(4, 13, 3, 1, K);
    o(23, 11, 6, 5, '#f4f0e8', K); c(24, 12, 4, 1, '#a8603a'); c(22, 15, 8, 1, '#c8c0b0');
    const st = (t >> 1) % 3; c(25 + (st === 1 ? 1 : 0), 6 - st, 1, 3, 'rgba(255,255,255,.45)'); c(26, 2 + st, 1, 2, 'rgba(255,255,255,.25)'); } },
  safe: { name: '금고', cost: 200, w: 1, h: 32, eff: '출석 보상 +3 (최대 2개)', max: 2, draw(c, t, o) {
    o(2, 4, 28, 26, '#3a3f48', K); c(3, 5, 26, 2, '#7a808a'); o(5, 8, 22, 19, '#5a606a', '#2a2f38'); c(6, 9, 20, 1, '#7a808a');
    o(11, 11, 9, 9, GOLD, K); c(12, 12, 7, 1, GOLD2); c(14, 14, 3, 3, '#3a3f48'); c(15, 11, 1, 2, K);
    c(22, 14, 4, 3, GOLD); c(22, 14, 4, 1, GOLD2); c(4, 10, 1, 3, K); c(4, 21, 1, 3, K);
    c(4, 30, 5, 2, K); c(23, 30, 5, 2, K); } },
  piano: { name: '피아노', cost: 250, w: 2, h: 48, draw(c, t, o) {
    o(0, 4, 64, 32, '#1e1a1a', K); c(1, 5, 62, 2, '#4a4444'); c(1, 7, 62, 1, '#2e2828');
    o(20, 9, 24, 12, '#2a2424', K); c(22, 10, 20, 10, '#f1ead8'); c(23, 12, 18, 1, '#a09a90'); c(23, 15, 18, 1, '#a09a90'); c(23, 18, 18, 1, '#a09a90');
    [[25, 11], [29, 14], [34, 13], [38, 17]].forEach(([x, y]) => c(x, y, 2, 2, '#222'));
    c(1, 23, 62, 3, '#2a2424'); c(2, 26, 60, 8, '#f4f0e8'); c(2, 33, 60, 1, '#c8c0b8');
    for (let x = 2; x < 62; x += 4) c(x, 26, 1, 8, '#a8a0a0');
    for (let x = 4, i = 0; x < 60; x += 4, i++) if (i % 7 !== 2 && i % 7 !== 6) c(x + 1, 26, 2, 5, '#111');
    o(3, 36, 5, 12, '#1e1a1a', K); o(56, 36, 5, 12, '#1e1a1a', K); c(28, 44, 8, 2, GOLD);
    o(5, -4, 3, 8, '#f4f0e8', K); c(6, -7, 1, 3, t % 2 ? '#ffb347' : '#ffd27a'); } },
  gclock: { name: '괘종시계', cost: 300, w: 1, h: 64, eff: '혼자 하는 게임 하루 보상 +1회', draw(c, t, o) {
    o(7, 8, 18, 52, '#5a3a24', K); c(8, 22, 16, 1, '#7a5234');
    o(4, 0, 24, 23, W0, K); c(5, 1, 22, 1, '#6a4428'); c(12, 0, 8, 2, GOLD);
    o(8, 4, 16, 16, '#f1ead8', K); c(9, 5, 14, 1, GOLD); c(9, 18, 14, 1, GOLD);
    c(15, 6, 2, 1, K); c(15, 17, 2, 1, K); c(9, 11, 1, 2, K); c(22, 11, 1, 2, K);
    const m = t % 8, mh = [[16, 7, 1, 5], [16, 9, 4, 1], [16, 11, 1, 5], [12, 11, 4, 1]][m >> 1];
    c(15, 9, 2, 3, K); c(mh[0], mh[1], mh[2], mh[3], '#8a2433');
    o(11, 26, 10, 28, '#24160c', K); c(12, 27, 1, 26, 'rgba(255,255,255,.08)');
    const sw = [0, 1, 2, 1, 0, -1, -2, -1][t % 8];
    c(15 + Math.round(sw / 2), 27, 2, 17, GOLD); o(13 + sw, 43, 6, 6, GOLD2, K); c(14 + sw, 44, 2, 1, '#ffffff');
    o(5, 58, 22, 6, W0, K); } },
  cat: { name: '검은 고양이', cost: 180, w: 1, h: 32, eff: '이스터에그 반짝임 범위 넓어짐', draw(c, t, o) {
    const k = '#1a1a1e', k2 = '#2e2e36', tail = (t >> 1) % 4;
    c(24, 26, 5, 3, k); c(27, 20 - tail, 3, 8 + tail, k); c(26, 19 - tail, 2, 2, k);
    o(8, 14, 16, 16, k, '#000'); c(10, 16, 2, 11, k2); c(12, 20, 8, 6, k2);
    o(9, 5, 14, 11, k, '#000'); c(9, 1, 3, 5, k); c(20, 1, 3, 5, k); c(10, 3, 1, 2, '#c06080'); c(21, 3, 1, 2, '#c06080');
    if (t % 17) { c(12, 9, 3, 3, '#e8c77a'); c(18, 9, 3, 3, '#e8c77a'); c(13, 9, 1, 3, '#000'); c(19, 9, 1, 3, '#000'); }
    else { c(12, 10, 3, 1, '#e8c77a'); c(18, 10, 3, 1, '#e8c77a'); }
    c(16, 12, 1, 1, '#c06080'); c(5, 12, 4, 1, '#55555f'); c(5, 14, 4, 1, '#55555f'); c(23, 12, 4, 1, '#55555f'); c(23, 14, 4, 1, '#55555f');
    c(11, 28, 4, 2, k2); c(17, 28, 4, 2, k2); c(14, 16, 4, 2, '#8a2433'); c(15, 17, 2, 2, GOLD); } },
  candle: { name: '촛대', cost: 35, w: 1, h: 32, draw(c, t, o) {
    c(2, 0, 28, 10, 'rgba(255,200,120,.08)');
    o(11, 28, 10, 4, GOLD, K); c(15, 14, 2, 14, GOLD); c(14, 20, 4, 2, GOLD2); c(5, 14, 22, 2, GOLD); c(5, 14, 22, 1, GOLD2);
    c(4, 12, 4, 3, GOLD); c(14, 10, 4, 3, GOLD); c(24, 12, 4, 3, GOLD);
    o(5, 4, 3, 8, '#f4f0e8', K); o(15, 1, 3, 9, '#f4f0e8', K); o(25, 4, 3, 8, '#f4f0e8', K);
    const f = t % 2 ? '#ffb347' : '#ffd27a', f2 = t % 2 ? '#ffd27a' : '#ffb347';
    c(5, 0, 3, 3, f); c(6, 1, 1, 1, '#fff2c0'); c(15, -3, 3, 3, f2); c(16, -2, 1, 1, '#fff2c0'); c(25, 0, 3, 3, f); c(26, 1, 1, 1, '#fff2c0'); } },
  chest: { name: '보물상자', cost: 45, w: 1, h: 32, draw(c, t, o) {
    o(2, 14, 28, 16, '#7a4e2c', K); o(2, 6, 28, 10, W2, K); c(3, 7, 26, 1, W3); c(4, 5, 24, 1, K);
    c(3, 21, 26, 1, '#6a4026'); c(3, 26, 26, 1, '#6a4026');
    c(8, 6, 3, 24, GOLD); c(21, 6, 3, 24, GOLD); c(8, 6, 3, 1, GOLD2); c(21, 6, 3, 1, GOLD2);
    o(14, 13, 5, 7, GOLD2, K); c(16, 15, 1, 3, K); } },
  /* --- 벽 장식 --- */
  painting: { name: '풍경화', cost: 40, wall: true, w: 1, h: 32, draw(c, t, o) {
    o(0, 0, 32, 28, GOLD, K); c(1, 1, 30, 1, GOLD2); c(3, 3, 26, 22, '#8a6a3a'); c(4, 4, 24, 20, '#2a3a5a'); c(4, 4, 24, 6, '#3a4a7a');
    c(21, 6, 4, 4, '#f1ead8'); c(4, 16, 24, 8, '#2e4a2e'); c(7, 13, 7, 3, '#3e5a3e'); c(16, 14, 9, 2, '#3e5a3e'); c(10, 18, 4, 3, '#a83a4a'); c(11, 19, 1, 1, GOLD2);
    c(15, 28, 2, 2, K); } },
  portrait: { name: '초상화', cost: 60, wall: true, w: 1, h: 40, draw(c, t, o) {
    o(2, 0, 28, 40, GOLD, K); c(3, 1, 26, 1, GOLD2); c(5, 3, 22, 34, '#3a2a20'); c(5, 3, 22, 10, '#4a3626');
    o(12, 8, 8, 10, '#e8c8a8', K); c(11, 6, 10, 4, '#2a1a10'); c(11, 6, 2, 10, '#2a1a10'); c(19, 6, 2, 10, '#2a1a10');
    c(14, 12, 1, 1, K); c(17, 12, 1, 1, K); c(15, 15, 2, 1, '#a05050');
    o(8, 20, 16, 17, '#6e1b28', K); c(14, 20, 4, 5, '#f1ead8'); c(15, 24, 2, 2, GOLD); } },
  window: { name: '창문', cost: 30, wall: true, w: 1, h: 48, draw(c, t, o) {
    c(0, 0, 32, 48, '#5a3a24'); c(0, 0, 32, 1, K); c(0, 47, 32, 1, K); c(0, 0, 1, 48, K); c(31, 0, 1, 48, K);
    todSky(c, t, 3, 3, 26, 42);
    c(15, 3, 2, 42, '#5a3a24'); c(3, 22, 26, 3, '#5a3a24'); c(3, 3, 26, 1, 'rgba(0,0,0,.3)');
    c(4, 4, 1, 6, 'rgba(255,255,255,.25)'); c(18, 26, 1, 6, 'rgba(255,255,255,.2)');
    c(-4, -1, 6, 50, '#8a2433'); c(-3, -1, 1, 50, '#a83a4a'); c(0, -1, 1, 50, '#6e1b28');
    c(30, -1, 6, 50, '#8a2433'); c(31, -1, 1, 50, '#6e1b28'); c(34, -1, 1, 50, '#a83a4a');
    c(-4, -3, 40, 3, GOLD); c(-3, 46, 38, 3, W1); c(-3, 46, 38, 1, W3); } },
  mirror: { name: '거울', cost: 50, wall: true, w: 1, h: 48, draw(c) {
    for (let y = 0; y < 48; y++) { const e = 1 - Math.pow((y - 23.5) / 24, 2), hw = Math.round(14 * Math.sqrt(Math.max(0, e)));
      if (hw > 0) { c(16 - hw - 1, y, 2 * hw + 2, 1, K); c(16 - hw, y, 2 * hw, 1, GOLD); }
      const iw = Math.round(11 * Math.sqrt(Math.max(0, 1 - Math.pow((y - 23.5) / 20, 2)))); if (y > 3 && y < 44 && iw > 0) c(16 - iw, y, 2 * iw, 1, y < 24 ? '#a8c4d0' : '#90acb8'); }
    c(9, 12, 2, 12, '#e8f4f8'); c(12, 9, 2, 4, '#e8f4f8'); c(15, -2, 2, 3, GOLD2); } },
  garland: { name: '별 가랜드', cost: 25, wall: true, w: 1, h: 16, wy: 6, draw(c, t) {
    for (let x = -2; x < 34; x++) c(x, 2 + Math.round(4 * Math.sin(Math.PI * (x + 2) / 36)), 1, 1, '#8a7a5a');
    [[4, 5], [15, 7], [26, 5]].forEach(([x, y], i) => { const col = (t + i) % 2 ? GOLD2 : (i === 1 ? '#f4f0e8' : GOLD);
      c(x, y + 1, 1, 2, '#8a7a5a'); c(x - 2, y + 4, 5, 1, col); c(x - 1, y + 3, 3, 3, col); c(x, y + 2, 1, 5, col); c(x - 1, y + 6, 1, 1, col); c(x + 1, y + 6, 1, 1, col); }); } },
  sconce: { name: '벽촛대', cost: 30, wall: true, w: 1, h: 32, draw(c, t, o) {
    c(4, 0, 24, 24, 'rgba(255,200,120,.07)'); c(8, 4, 16, 16, 'rgba(255,200,120,.07)');
    o(12, 14, 8, 12, GOLD, K); c(13, 15, 6, 1, GOLD2); c(15, 10, 2, 6, GOLD); c(11, 9, 10, 2, GOLD);
    o(14, 2, 4, 8, '#f4f0e8', K); c(15, -2, 2, 4, t % 2 ? '#ffb347' : '#ffd27a'); c(15, -1, 1, 1, '#fff2c0'); } },
};
function o0(c, x, y, w, h, f, l) { c(x, y, w, h, l); c(x + 1, y + 1, w - 2, h - 2, f); }
const WALLS = {
  plain:  { name: '기본 벽', cost: 0 },  stripe: { name: '와인 줄무늬', cost: 40 }, damask: { name: '녹색 다마스크', cost: 70 },
  panel:  { name: '나무 패널', cost: 60 }, brick:  { name: '붉은 벽돌', cost: 50 },  night:  { name: '별밤', cost: 90 },
};
const FLOORS = {
  plank: { name: '나무 마루', cost: 0 }, checker: { name: '체크 타일', cost: 50 }, carpet: { name: '붉은 카펫', cost: 60 },
  stone: { name: '돌바닥', cost: 40 },   herring: { name: '헤링본', cost: 80 },
};
const hash = (a, b) => ((a * 73856093) ^ (b * 19349663)) >>> 0;
function drawWall(g, k, t) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const H = WALL_H;
  if (k === 'stripe') { R(0, 0, RW, H, '#4a2228'); for (let x = 0; x < RW; x += 16) { R(x, 0, 8, H, '#5a2a30'); R(x + 11, 0, 1, H, '#6a3a38'); } }
  else if (k === 'damask') { R(0, 0, RW, H, '#2e3a2e'); for (let y = 2; y < H; y += 16) for (let x = ((y >> 4) % 2) * 8; x < RW; x += 16) {
    const C = '#3e4e3e', D = '#4a5c48'; R(x + 3, y, 2, 1, C); R(x + 2, y + 1, 4, 1, C); R(x + 1, y + 2, 6, 2, C); R(x + 3, y + 2, 2, 2, D); R(x + 2, y + 4, 4, 1, C); R(x + 3, y + 5, 2, 2, C); R(x, y + 3, 1, 1, C); R(x + 7, y + 3, 1, 1, C); } }
  else if (k === 'panel') { R(0, 0, RW, H, '#6a5444'); for (let y = 4; y < 46; y += 8) for (let x = (y % 16 ? 4 : 0); x < RW; x += 8) R(x, y, 1, 1, '#7a6454');
    R(0, 46, RW, H - 46, '#4a3020'); R(0, 46, RW, 3, '#5a3a24'); R(0, 46, RW, 1, '#7a5234');
    for (let x = 3; x < RW; x += 32) { R(x, 53, 26, 31, '#3a2416'); R(x + 1, 54, 24, 29, '#553826'); R(x + 1, 54, 24, 1, '#6a4a32'); } }
  else if (k === 'brick') { R(0, 0, RW, H, '#5a2a1e'); for (let y = 0, r = 0; y < H; y += 8, r++) for (let x = (r % 2) * -8; x < RW; x += 16) {
    const cs = ['#7a3a2a', '#84402e', '#6e3424', '#7a3e2c'][hash(x, r) % 4]; R(x + 1, y + 1, 15, 7, cs); R(x + 1, y + 1, 15, 1, '#9a5040'); } }
  else if (k === 'night') { R(0, 0, RW, H, '#1a1e3a'); R(0, 0, RW, 20, '#141832');
    for (let i = 0; i < 46; i++) { const x = hash(i, 7) % RW, y = hash(i, 13) % (H - 4); R(x, y, 1, 1, (t + i) % 9 ? '#c8c0a0' : '#ffffff'); if (i % 9 === 0) { R(x - 1, y, 3, 1, '#e8e0c0'); R(x, y - 1, 1, 3, '#e8e0c0'); } }
    R(200, 10, 12, 12, '#f1ead8'); R(198, 12, 16, 8, '#f1ead8'); R(204, 9, 12, 12, '#1a1e3a'); R(202, 12, 10, 8, '#1a1e3a'); }
  else { R(0, 0, RW, H, '#4a3a30'); for (let x = 0; x < RW; x += 16) R(x, 0, 2, 60, '#453529'); R(0, 60, RW, H - 60, '#40302a'); R(0, 60, RW, 3, '#3a2a20'); R(0, 60, RW, 1, '#5a4a3e'); }
  R(0, 0, RW, 4, 'rgba(0,0,0,.25)');
  R(0, H, RW, 8, '#2a1a0e'); R(0, H, RW, 2, '#4a2e1a'); R(0, H + 7, RW, 1, '#140c06');
}
function drawFloor(g, k) {
  const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  const Y = FLOOR_Y, H = RH - FLOOR_Y;
  if (k === 'checker') { for (let y = 0; y < H; y += 16) for (let x = 0; x < RW; x += 16) { const d = ((x + y) >> 4) % 2; R(x, Y + y, 16, 16, d ? '#2a2a2e' : '#d8d0c0'); R(x, Y + y, 16, 1, d ? '#3a3a40' : '#ece4d4'); } }
  else if (k === 'carpet') { R(0, Y, RW, H, '#6a1e2a'); for (let y = 6; y < H; y += 16) for (let x = (y % 32 > 16 ? 8 : 0); x < RW; x += 16) { R(x + 3, Y + y, 2, 1, '#8a2a3a'); R(x + 2, Y + y + 1, 4, 1, '#8a2a3a'); R(x + 3, Y + y + 2, 2, 1, '#8a2a3a'); }
    R(0, Y + 2, RW, 3, '#c9a96a'); R(0, Y + 3, RW, 1, '#8a6a3a'); }
  else if (k === 'stone') { R(0, Y, RW, H, '#3e3e42'); for (let y = 0, r = 0; y < H; y += 16, r++) for (let x = (r % 2) * -16; x < RW; x += 32) {
    const cs = ['#5a5a5e', '#626266', '#545458'][hash(x, r) % 3]; R(x + 1, Y + y + 1, 31, 15, cs); R(x + 1, Y + y + 1, 31, 1, '#727276'); if (hash(x, r) % 5 === 0) R(x + 8, Y + y + 6, 3, 1, '#48484c'); } }
  else if (k === 'herring') { R(0, Y, RW, H, '#5a3a24'); for (let y = 0; y < H; y += 8) for (let x = 0; x < RW; x += 16) { const s = ((y >> 3) % 2) * 8; R(x + s, Y + y, 8, 8, '#8a5a34'); R(x + s + 1, Y + y, 7, 1, '#a07044'); R(x + (8 - s), Y + y, 8, 8, '#7a4a28'); R(x + (8 - s), Y + y + 7, 8, 1, '#5a3a24'); } }
  else { R(0, Y, RW, H, '#7a5030'); for (let y = 0, r = 0; y < H; y += 8, r++) { R(0, Y + y, RW, 1, '#5a3a24'); R(0, Y + y + 1, RW, 1, '#8a5e3a');
    for (let x = (r * 37) % 48; x < RW; x += 48) R(x, Y + y, 1, 8, '#5a3a24'); for (let i = 0; i < 6; i++) { const x = hash(i, r) % RW; R(x, Y + y + 3 + (i % 3), 4, 1, '#6e4628'); } } }
  g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, Y, RW, 5); g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(0, Y + 5, RW, 4);
}

/* ---------- 방 데이터 ---------- */
let RM = { edit: false, sel: null, drag: null, hover: null, t: 0 };
let RV = null;                 // 놀러 간 방 주인 uid
let ROOMLIKES = [], GUESTBOOK = [], roomUnsubs = [];
const rmId = () => Math.random().toString(36).slice(2, 9);
function defaultRoom() {
  return { wall: 'plain', floor: 'plank', ow: ['plain', 'plank'], inv: {},
    items: [{ id: rmId(), k: 'bed', c: 0, r: 0 }, { id: rmId(), k: 'desk', c: 6, r: 0 }, { id: rmId(), k: 'chair', c: 6, r: 1 }, { id: rmId(), k: 'window', c: 3, r: -1 }] };
}
function myRoom() { if (!P.room) P.room = defaultRoom(); const r = P.room; r.inv = r.inv || {}; r.items = r.items || []; r.ow = r.ow || ['plain', 'plank']; return r; }
function hoRoom(uid) { if (ME && uid === ME.uid) return myRoom(); const p = PROGS.find(x => x.id === uid); return (p && p.room) || defaultRoom(); }
function roomCnt(k) { if (!P || !P.room) return 0; return (P.room.items || []).filter(i => i.k === k).length; }

function occupied(room, c, r, w, flat, skipId) {
  if (c < 0 || c + w > COLS) return true;
  if (r === -1) return room.items.some(i => i.id !== skipId && i.r === -1 && i.c === c);
  if (r < 0 || r >= ROWS) return true;
  return room.items.some(i => { if (i.id === skipId || i.r !== r) return false; const f = FURN[i.k]; if (!f || f.wall || !!f.flat !== !!flat) return false; return c < i.c + f.w && i.c < c + w; });
}
function spotAt(k, x, y) {
  const f = FURN[k]; if (!f) return null;
  const c = Math.max(0, Math.min(COLS - f.w, Math.floor(x / CELL - (f.w - 1) / 2)));
  if (f.wall) return { c: Math.max(0, Math.min(COLS - 1, Math.floor(x / CELL))), r: -1 };
  const r = Math.max(0, Math.min(ROWS - 1, Math.floor((y - FLOOR_Y) / CELL)));
  return { c, r };
}
function itemBox(i) {
  const f = FURN[i.k]; if (!f) return null;
  if (i.r === -1) { const y = f.wy != null ? f.wy : Math.round(16 + (48 - f.h) / 2); return { x: i.c * CELL, y, w: f.w * CELL, h: f.h }; }
  const by = FLOOR_Y + (i.r + 1) * CELL; return { x: i.c * CELL, y: by - f.h, w: f.w * CELL, h: f.h };
}
function itemAt(room, x, y) {
  const order = drawOrder(room).reverse();
  return order.find(i => { const b = itemBox(i); return b && x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.h; }) || null;
}
function drawOrder(room) {
  const L = i => { const f = FURN[i.k] || {}; return f.wall ? 0 : f.flat ? 1 : 2; };
  return room.items.filter(i => FURN[i.k]).slice().sort((a, b) => L(a) - L(b) || a.r - b.r || a.c - b.c);
}
function drawSprite(g, k, x, y, t, alpha) {
  const f = FURN[k]; if (!f) return;
  g.save(); if (alpha != null) g.globalAlpha = alpha;
  const c = (dx, dy, w, h, col) => { g.fillStyle = col; g.fillRect(x + dx, y + dy, w, h); };
  const o = (dx, dy, w, h, f2, l) => { c(dx, dy, w, h, l); c(dx + 1, dy + 1, w - 2, h - 2, f2); };
  f.draw(c, t || 0, o);
  g.restore();
}
function paintRoom(cv, room, opts) {
  if (!cv) return; const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
  const t = RM.t;
  drawWall(g, WALLS[room.wall] ? room.wall : 'plain', t); drawFloor(g, FLOORS[room.floor] ? room.floor : 'plank');
  const edit = opts && opts.edit;
  if (edit) { g.fillStyle = 'rgba(255,255,255,.07)'; for (let c = 0; c <= COLS; c++) g.fillRect(c * CELL, FLOOR_Y, 1, ROWS * CELL); for (let r = 0; r <= ROWS; r++) g.fillRect(0, FLOOR_Y + r * CELL, RW, 1);
    for (let c = 0; c <= COLS; c++) g.fillRect(c * CELL, 12, 1, 56); }
  const dragId = RM.drag && RM.drag.moved ? RM.drag.id : null;
  drawOrder(room).forEach(i => {
    const b = itemBox(i); if (!b) return;
    // 바닥 그림자
    if (i.r >= 0 && !FURN[i.k].flat) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(b.x + 2, b.y + b.h - 2, b.w - 4, 3); }
    drawSprite(g, i.k, b.x, b.y, t, i.id === dragId ? .35 : null);
    if (edit && RM.sel === 'id:' + i.id) { g.strokeStyle = '#ffe08a'; g.lineWidth = 1; g.strokeRect(b.x + .5, b.y + .5, b.w - 1, b.h - 1); }
  });
  // 고스트
  if (edit && RM.hover) {
    const k = RM.hover.k, f = FURN[k], s = RM.hover;
    const ok = !occupied(room, s.c, s.r, f.w, f.flat, RM.hover.skip);
    const b = itemBox({ k, c: s.c, r: s.r });
    drawSprite(g, k, b.x, b.y, t, .6);
    g.fillStyle = ok ? 'rgba(120,220,120,.25)' : 'rgba(230,80,80,.3)';
    if (s.r === -1) g.fillRect(b.x, b.y, b.w, b.h); else g.fillRect(b.x, FLOOR_Y + s.r * CELL, b.w, CELL);
  }
}

/* ---------- 화면 ---------- */
function roomTitle(uid) { const u = USERS.find(x => x.id === uid); if (!u) return '빈 방'; return (u.ho ? cname(u.ho) : uname(u)) + '의 방'; }
function likesOf(uid) { return ROOMLIKES.filter(l => l.owner === uid); }
function gbHtml(owner) {
  const list = GUESTBOOK.filter(g => g.owner === owner).sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 40);
  const mine = ME && owner === ME.uid;
  return `<div class="panel"><h3 style="margin-top:0">📖 방명록 <span class="muted">${list.length}</span></h3>
   ${mine ? '' : `<div class="row"><input id="gbText" maxlength="300" placeholder="한마디 남기기…" onkeydown="if(event.key==='Enter'&&!event.isComposing)gbPost('${owner}')" style="flex:1"><button class="primary" onclick="gbPost('${owner}')">남기기</button></div>`}
   ${list.length ? list.map(g => `<div class="item" style="margin:6px 0"><div><b>${esc(g.code ? cname(g.code) : g.name)}</b> <span class="muted">${esc(g.name || '')} · ${ago(g.at)}</span><div class="utext" style="white-space:pre-wrap">${esc(g.text)}</div></div>
     ${(g.uid === ME.uid || mine || IS_ADMIN) ? `<button class="sm" onclick="gbDel('${g.id}')">삭제</button>` : ''}</div>`).join('') : '<p class="muted">아직 아무도 다녀가지 않았어요.</p>'}</div>`;
}
function effectsHtml(room) {
  const effs = Object.entries(FURN).filter(([k, f]) => f.eff).map(([k, f]) => { const n = room.items.filter(i => i.k === k).length; return n ? `<span class="chip on" style="cursor:default">${f.name}${n > 1 ? ' ×' + n : ''} · ${f.eff}</span>` : ''; }).join('');
  return effs ? `<div class="toggles">${effs}</div>` : '<p class="muted" style="margin:4px 0">✨ 가구점의 일부 가구는 놓아두기만 해도 작은 효과가 있어요.</p>';
}
VIEWS.room = () => {
  const room = myRoom(), likes = likesOf(ME.uid).length, inv = Object.entries(room.inv).filter(([k, n]) => n > 0 && FURN[k]);
  const selItem = RM.sel && RM.sel.startsWith('id:') ? room.items.find(i => 'id:' + i.id === RM.sel) : null;
  const selInv = RM.sel && RM.sel.startsWith('inv:') ? RM.sel.slice(4) : null;
  return `<div class="panel roompanel">
   <div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
     <h2 style="margin:0">🏠 ${esc(roomTitle(ME.uid))}</h2>
     <span class="muted">❤ ${likes} · 📖 ${GUESTBOOK.filter(g => g.owner === ME.uid).length}</span></div>
   <canvas id="roomCv" class="roomcv${RM.edit ? ' editing' : ''}" width="${RW}" height="${RH}"></canvas>
   <div class="row" style="flex-wrap:wrap;gap:6px;margin-top:8px">
     <button class="${RM.edit ? 'primary' : ''}" onclick="roomEdit(${!RM.edit})">${RM.edit ? '✔ 꾸미기 끝' : '✏ 꾸미기'}</button>
     <button onclick="openFurnShop()">🛒 가구점</button>
     <button onclick="RV=null;go('visit')">👀 놀러 가기</button>
     <button onclick="go('map')">🚪 저택으로 나가기</button></div>
   ${RM.edit ? `<div class="roomedit">
     ${selItem ? `<p style="margin:6px 0"><b>${FURN[selItem.k].name}</b> 선택됨 — 옮길 칸을 누르거나 끌어서 옮겨요.</p>
        <button class="sm" onclick="roomStore()">📦 보관함으로</button> <button class="sm" onclick="RM.sel=null;render()">선택 해제</button>`
      : selInv ? `<p style="margin:6px 0"><b>${FURN[selInv].name}</b> — 놓을 칸을 눌러요. ${FURN[selInv].wall ? '(벽 장식은 위쪽 벽에)' : ''}</p><button class="sm" onclick="RM.sel=null;RM.hover=null;render()">취소</button>`
      : '<p class="muted" style="margin:6px 0">가구를 눌러 고르고, 원하는 칸을 누르거나 끌어서 옮겨요.</p>'}
     <h4 style="margin:10px 0 4px">📦 보관함</h4>
     ${inv.length ? `<div class="toggles">${inv.map(([k, n]) => `<span class="chip ${selInv === k ? 'on' : ''}" onclick="RM.sel='inv:${k}';RM.hover=null;render()"><canvas class="fprev" data-k="${k}" width="${FURN[k].w * 32}" height="64"></canvas> ${FURN[k].name}${n > 1 ? ' ×' + n : ''}</span>`).join('')}</div>` : '<p class="muted">비어 있어요. 가구점에서 사 오세요.</p>'}
     <h4 style="margin:10px 0 4px">🧱 벽지</h4><div class="toggles">${room.ow.filter(k => WALLS[k]).map(k => `<span class="chip ${room.wall === k ? 'on' : ''}" onclick="roomSet('wall','${k}')">${WALLS[k].name}</span>`).join('')}</div>
     <h4 style="margin:10px 0 4px">🪵 바닥</h4><div class="toggles">${room.ow.filter(k => FLOORS[k]).map(k => `<span class="chip ${room.floor === k ? 'on' : ''}" onclick="roomSet('floor','${k}')">${FLOORS[k].name}</span>`).join('')}</div>
   </div>` : effectsHtml(room)}
  </div>${RM.edit ? '' : gbHtml(ME.uid)}`;
};
VIEWS.visit = () => {
  if (RV) {
    const room = hoRoom(RV), likes = likesOf(RV), liked = likes.some(l => l.uid === ME.uid);
    return `<div style="margin:-4px 0 10px"><button class="sm" onclick="RV=null;render()">← 방 목록</button> <button class="sm" onclick="go('room')">🏠 내 방으로</button></div>
     <div class="panel roompanel"><div class="row" style="justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">
      <h2 style="margin:0">🚪 ${esc(roomTitle(RV))}</h2>
      ${RV === ME.uid ? `<span class="muted">❤ ${likes.length}</span>` : `<button class="${liked ? 'primary' : ''}" onclick="roomLike('${RV}')">${liked ? '❤' : '🤍'} 좋아요 ${likes.length}</button>`}</div>
      <canvas id="roomCv" class="roomcv" width="${RW}" height="${RH}"></canvas>${effectsHtml(room)}
      ${likes.length ? `<p class="muted" style="margin:6px 0 0">❤ ${likes.map(l => esc(l.name || '')).join(', ')}</p>` : ''}</div>${gbHtml(RV)}`;
  }
  const us = USERS.filter(u => u.ho).sort((a, b) => String(a.ho).localeCompare(String(b.ho)));
  return `<div style="margin:-4px 0 10px"><button class="sm" onclick="go('room')">← 내 방으로</button></div>
   <div class="panel"><h2 style="margin-top:0">👀 놀러 가기</h2><p class="muted">다른 손님의 방을 구경하고 좋아요와 방명록을 남겨 보세요.</p>
   <div class="grid g2">${us.map(u => `<div class="item rcard" onclick="RV='${u.id}';render();window.scrollTo(0,0)" style="cursor:pointer;display:block">
     <canvas class="rthumb roomcv" data-uid="${u.id}" width="${RW}" height="${RH}"></canvas>
     <div class="row" style="justify-content:space-between;margin-top:4px"><b>${esc(roomTitle(u.id))}</b><span class="muted">❤ ${likesOf(u.id).length} · 📖 ${GUESTBOOK.filter(g => g.owner === u.id).length}</span></div>
     <div class="muted">${esc(uname(u))}${u.id === ME.uid ? ' (나)' : ''}</div></div>`).join('') || '<p class="muted">아직 HO를 고른 손님이 없어요.</p>'}</div></div>`;
};

/* ---------- 렌더 후처리 · 애니메이션 ---------- */
function roomAfter() {
  if (tab !== 'room' && tab !== 'visit') return;
  const cv = document.getElementById('roomCv');
  if (cv) { const uid = tab === 'room' ? ME.uid : RV; paintRoom(cv, hoRoom(uid), { edit: tab === 'room' && RM.edit }); if (tab === 'room') bindRoomCv(cv); else bindViewCv(cv, uid); }
  document.querySelectorAll('canvas.rthumb').forEach(c => paintRoom(c, hoRoom(c.dataset.uid)));
  document.querySelectorAll('canvas.fprev').forEach(paintPreview);
}
function paintPreview(c) {
  const k = c.dataset.k, g = c.getContext('2d'); g.imageSmoothingEnabled = false; g.clearRect(0, 0, c.width, c.height);
  if (FURN[k]) { const f = FURN[k]; drawSprite(g, k, Math.round((c.width - f.w * 32) / 2), Math.max(2, c.height - f.h - (f.wall ? Math.round((64 - f.h) / 2) : 0)), RM.t); return; }
  const tmp = document.createElement('canvas'); tmp.width = RW; tmp.height = RH; const tg = tmp.getContext('2d');
  if (WALLS[k]) { drawWall(tg, k, 0); g.drawImage(tmp, 0, 8, 64, 64, 0, 0, c.width, c.height); }
  if (FLOORS[k]) { drawFloor(tg, k); g.drawImage(tmp, 0, FLOOR_Y + 16, 64, 64, 0, 0, c.width, c.height); }
}
setInterval(() => {
  RM.t++;
  if (!ME || !P || (tab !== 'room' && tab !== 'visit') || document.hidden) return;
  const cv = document.getElementById('roomCv');
  if (cv) paintRoom(cv, hoRoom(tab === 'room' ? ME.uid : RV), { edit: tab === 'room' && RM.edit });
  if (RM.t % 3 === 0) document.querySelectorAll('canvas.rthumb').forEach(c => paintRoom(c, hoRoom(c.dataset.uid)));
}, 280);

/* ---------- 조작 ---------- */
function cvPos(cv, ev) { const r = cv.getBoundingClientRect(); return { x: (ev.clientX - r.left) / r.width * RW, y: (ev.clientY - r.top) / r.height * RH }; }
const ROOM_TALK = { cat: ['냐아.', '골골골…', '(꼬리를 살랑인다)'], gclock: ['똑딱, 똑딱.'], piano: ['♪ 도-미-솔'], teaset: ['향긋한 홍차 냄새.'], safe: ['단단히 잠겨 있다.'], chest: ['무엇이 들었을까?'], mirror: ['거울 속의 나와 눈이 마주쳤다.'], window: ['숲 위로 달이 떠 있다.'], plant: ['잎이 싱그럽다.'], bed: ['폭신해 보인다.'] };
function roomPoke(i) { const f = FURN[i.k]; const l = ROOM_TALK[i.k]; sfx(i.k === 'cat' ? 'pop' : 'tap'); toast(`${f.name} — ${l ? l[Math.floor(Math.random() * l.length)] : ''}${f.eff ? ' (' + f.eff + ')' : ''}`); }
function bindViewCv(cv, uid) { cv.onclick = ev => { const p = cvPos(cv, ev), i = itemAt(hoRoom(uid), p.x, p.y); if (i) roomPoke(i); }; }
function bindRoomCv(cv) {
  cv.onpointerdown = ev => {
    const p = cvPos(cv, ev), room = myRoom();
    if (!RM.edit) { const i = itemAt(room, p.x, p.y); if (i) roomPoke(i); return; }
    const hit = itemAt(room, p.x, p.y);
    if (hit && !(RM.sel && RM.sel.startsWith('inv:'))) {
      RM.drag = { id: hit.id, x0: p.x, y0: p.y, moved: false }; window.GAME_LOCK = true;
      try { cv.setPointerCapture(ev.pointerId); } catch (e) {}
    } else RM.drag = { id: null, x0: p.x, y0: p.y, moved: false };
    ev.preventDefault();
  };
  cv.onpointermove = ev => {
    if (!RM.edit) return; const p = cvPos(cv, ev), room = myRoom();
    if (RM.drag && RM.drag.id) {
      if (Math.abs(p.x - RM.drag.x0) + Math.abs(p.y - RM.drag.y0) > 6) RM.drag.moved = true;
      if (RM.drag.moved) { const it = room.items.find(i => i.id === RM.drag.id); const s = spotAt(it.k, p.x, p.y); RM.hover = { k: it.k, c: s.c, r: s.r, skip: it.id }; paintRoom(cv, room, { edit: true }); }
    } else if (RM.sel && RM.sel.startsWith('inv:') && ev.pointerType === 'mouse') {
      const k = RM.sel.slice(4), s = spotAt(k, p.x, p.y); RM.hover = { k, c: s.c, r: s.r }; paintRoom(cv, room, { edit: true });
    }
  };
  cv.onpointerleave = () => { if (RM.edit && !(RM.drag && RM.drag.id) && RM.hover) { RM.hover = null; paintRoom(cv, myRoom(), { edit: true }); } };
  cv.onpointerup = ev => {
    if (!RM.edit) return; const p = cvPos(cv, ev), room = myRoom(), d = RM.drag; RM.drag = null;
    const unlock = () => { window.GAME_LOCK = false; };
    if (d && d.id && d.moved) { const it = room.items.find(i => i.id === d.id); const s = spotAt(it.k, p.x, p.y); RM.hover = null; RM.sel = 'id:' + it.id; unlock(); moveItem(it, s); return; }
    unlock();
    const hit = itemAt(room, p.x, p.y);
    if (RM.sel && RM.sel.startsWith('inv:')) { const k = RM.sel.slice(4); placeInv(k, spotAt(k, p.x, p.y)); return; }
    if (hit) { RM.sel = RM.sel === 'id:' + hit.id ? null : 'id:' + hit.id; sfx('tap'); render(); return; }
    if (RM.sel && RM.sel.startsWith('id:')) { const it = room.items.find(i => 'id:' + i.id === RM.sel); if (it) moveItem(it, spotAt(it.k, p.x, p.y)); return; }
    render();
  };
  cv.onpointercancel = () => { RM.drag = null; RM.hover = null; window.GAME_LOCK = false; render(); };
}
function moveItem(it, s) {
  const room = myRoom(), f = FURN[it.k];
  if (occupied(room, s.c, s.r, f.w, f.flat, it.id)) { sfx('bad'); toast('거기엔 이미 무언가 있어요'); render(); return; }
  it.c = s.c; it.r = s.r; sfx('tap'); saveP(); render();
}
function placeInv(k, s) {
  const room = myRoom(), f = FURN[k];
  if (!s || !(room.inv[k] > 0)) return;
  if (occupied(room, s.c, s.r, f.w, f.flat)) { sfx('bad'); toast('거기엔 이미 무언가 있어요'); return; }
  room.inv[k]--; if (!room.inv[k]) delete room.inv[k];
  const it = { id: rmId(), k, c: s.c, r: s.r }; room.items.push(it);
  RM.sel = room.inv[k] ? 'inv:' + k : null; RM.hover = null; sfx('pop'); saveP(); render();
  if (f.eff && f.max && roomCnt(k) > f.max) toast(`효과는 ${f.max}개까지만 적용돼요`);
}
function roomStore() {
  const room = myRoom(), it = room.items.find(i => 'id:' + i.id === RM.sel); if (!it) return;
  room.items = room.items.filter(i => i !== it); room.inv[it.k] = (room.inv[it.k] || 0) + 1; RM.sel = null; sfx('tap'); saveP(); render();
}
function roomEdit(on) { RM.edit = on; RM.sel = null; RM.hover = null; render(); }
function roomSet(slot, k) { const room = myRoom(); room[slot] = k; sfx('tap'); saveP(); render(); }

/* ---------- 가구점 ---------- */
let SHOPTAB = 'furn';
function openFurnShop() {
  const room = myRoom(), price = c => Math.round(c * (typeof shopMul === 'function' ? shopMul() : 1));
  const tabs = [['furn', '가구'], ['wall', '벽 장식'], ['wp', '벽지'], ['fl', '바닥']];
  const owned = k => (room.inv[k] || 0) + room.items.filter(i => i.k === k).length;
  let list = '';
  if (SHOPTAB === 'furn' || SHOPTAB === 'wall') {
    list = Object.entries(FURN).filter(([k, f]) => !!f.wall === (SHOPTAB === 'wall')).map(([k, f]) => `<div class="item" style="margin:6px 0">
      <canvas class="fprev" data-k="${k}" width="${f.w * 32}" height="64" style="width:${f.w * 28}px;height:56px"></canvas>
      <div style="flex:1;margin-left:10px"><b>${f.name}</b>${f.w > 1 ? ' <span class="muted">(2칸)</span>' : ''}${owned(k) ? ` <span class="badge">보유 ${owned(k)}</span>` : ''}
      ${f.eff ? `<div style="color:var(--gold2);font-size:.85rem">✨ ${f.eff}</div>` : ''}</div>
      <button onclick="buyFurn('${k}')" ${P.coins < price(f.cost) ? 'disabled' : ''}>${price(f.cost)} 은화</button></div>`).join('');
  } else {
    const T = SHOPTAB === 'wp' ? WALLS : FLOORS, slot = SHOPTAB === 'wp' ? 'wall' : 'floor';
    list = Object.entries(T).map(([k, w]) => { const has = room.ow.includes(k); return `<div class="item" style="margin:6px 0">
      <canvas class="fprev" data-k="${k}" width="64" height="64" style="width:48px;height:48px"></canvas>
      <div style="flex:1;margin-left:10px"><b>${w.name}</b>${room[slot] === k ? ' <span class="badge live">사용 중</span>' : ''}</div>
      ${has ? (room[slot] === k ? '' : `<button onclick="roomSet('${slot}','${k}');openFurnShop()">적용</button>`) : `<button onclick="buyDeco('${slot}','${k}')" ${P.coins < price(w.cost) ? 'disabled' : ''}>${price(w.cost)} 은화</button>`}</div>`; }).join('');
  }
  modal(`<h2 style="color:var(--gold2);margin-top:0">🛒 저택 가구점</h2><p class="muted" style="margin:0 0 6px">보유 은화 <b>${P.coins}</b>${mySin() === 'envy' ? ' · 질투의 눈썰미로 10% 할인 중' : ''}</p>
   <div class="toggles">${tabs.map(([k, v]) => `<span class="chip ${SHOPTAB === k ? 'on' : ''}" onclick="SHOPTAB='${k}';openFurnShop()">${v}</span>`).join('')}</div>
   <div style="max-height:60vh;overflow:auto">${list}</div><button style="width:100%;margin-top:8px" onclick="closeModal();render()">닫기</button>`);
  document.querySelectorAll('#mbox canvas.fprev').forEach(c => { c.style.imageRendering = 'pixelated'; paintPreview(c); });
}
function buyFurn(k) {
  const f = FURN[k], c = Math.round(f.cost * (typeof shopMul === 'function' ? shopMul() : 1));
  if (!spend(c)) return; const room = myRoom(); room.inv[k] = (room.inv[k] || 0) + 1; saveP(); sfx('ok');
  toast(`${f.name}을(를) 샀어요! 꾸미기에서 놓아 보세요`); openFurnShop();
}
function buyDeco(slot, k) {
  const T = slot === 'wall' ? WALLS : FLOORS, c = Math.round(T[k].cost * (typeof shopMul === 'function' ? shopMul() : 1));
  if (!spend(c)) return; const room = myRoom(); if (!room.ow.includes(k)) room.ow.push(k); room[slot] = k; saveP(); sfx('ok'); openFurnShop();
}

/* ---------- 좋아요 · 방명록 ---------- */
async function roomLike(owner) {
  if (!ME || owner === ME.uid) return; const id = owner + '_' + ME.uid;
  try { if (ROOMLIKES.some(l => l.id === id)) await B.del('roomLikes/' + id); else { await B.set('roomLikes/' + id, { owner, uid: ME.uid, name: PROF.name || '', at: Date.now() }); sfx('spark'); } }
  catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function gbPost(owner) {
  const el = document.getElementById('gbText'), text = (el && el.value || '').trim(); if (!text) return;
  try { await B.add('guestbook', { owner, uid: ME.uid, name: PROF.name || '', code: PROF.ho || '', text: text.slice(0, 300), at: Date.now() }); el.value = ''; el.blur(); sfx('ok'); render(); }
  catch (e) { toast('실패: ' + (e.code || e.message)); }
}
async function gbDel(id) { if (!confirm('이 글을 지울까요?')) return; try { await B.del('guestbook/' + id); } catch (e) { toast('실패: ' + (e.code || e.message)); } }

function roomOnAuth(u) {
  roomUnsubs.forEach(f => { try { f(); } catch (e) {} }); roomUnsubs = []; ROOMLIKES = []; GUESTBOOK = []; RM = { edit: false, sel: null, drag: null, hover: null, t: RM.t }; RV = null;
  if (!u) return;
  roomUnsubs.push(B.onCol('roomLikes', l => { ROOMLIKES = l; if (tab === 'room' || tab === 'visit') softRender(); }));
  roomUnsubs.push(B.onCol('guestbook', l => { GUESTBOOK = l; if (tab === 'room' || tab === 'visit') softRender(); }));
}
