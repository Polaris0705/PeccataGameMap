/* =========================================================
   햄카타 — 움직이는 GIF 넣기
   GIF를 풀어서(디코드) 크기·프레임을 줄인 뒤 다시 GIF로 묶어요(인코드).
   저장 한도(문서 하나 약 1MB)에 맞게 자동으로 줄여요.
   ========================================================= */
function gifDecode(buf) {
  const b = new Uint8Array(buf); let p = 0;
  const u8 = () => b[p++], u16 = () => { const v = b[p] | (b[p + 1] << 8); p += 2; return v; };
  if (b[0] !== 0x47 || b[1] !== 0x49 || b[2] !== 0x46) throw new Error('GIF가 아니에요');
  p = 6; const W = u16(), H = u16(), pf = u8(); p += 2;
  let gct = null; if (pf & 0x80) { const n = 2 << (pf & 7); gct = b.subarray(p, p + n * 3); p += n * 3; }
  const cvs = new Uint8ClampedArray(W * H * 4), frames = []; let gce = { delay: 100, trans: -1, disp: 0 };
  while (p < b.length) {
    const blk = u8();
    if (blk === 0x3B) break;
    if (blk === 0x21) {
      const lab = u8();
      if (lab === 0xF9) { const sz = u8(), f = u8(), d = u16(), ti = u8(); p += Math.max(0, sz - 4); gce = { disp: (f >> 2) & 7, trans: f & 1 ? ti : -1, delay: Math.max(20, (d || 10) * 10) }; }
      let s; while ((s = u8())) p += s;
      continue;
    }
    if (blk !== 0x2C) break;
    const fx = u16(), fy = u16(), fw = u16(), fh = u16(), f = u8();
    let ct = gct; if (f & 0x80) { const n = 2 << (f & 7); ct = b.subarray(p, p + n * 3); p += n * 3; }
    const min = u8(), parts = []; let s, len = 0; while ((s = u8())) { parts.push(b.subarray(p, p + s)); len += s; p += s; }
    const data = new Uint8Array(len); let o = 0; parts.forEach(x => { data.set(x, o); o += x.length; });
    let idx = gifLzwDec(min, data, fw * fh);
    if (f & 0x40) { const di = new Uint8Array(fw * fh); let r = 0; [[0, 8], [4, 8], [2, 4], [1, 2]].forEach(([st, sp]) => { for (let y = st; y < fh; y += sp) { di.set(idx.subarray(r * fw, r * fw + fw), y * fw); r++; } }); idx = di; }
    const prev = gce.disp === 3 ? cvs.slice() : null;
    if (ct) for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++) {
      const ci = idx[y * fw + x]; if (ci === gce.trans) continue; const X = fx + x, Y = fy + y; if (X >= W || Y >= H) continue;
      const q = (Y * W + X) * 4; cvs[q] = ct[ci * 3]; cvs[q + 1] = ct[ci * 3 + 1]; cvs[q + 2] = ct[ci * 3 + 2]; cvs[q + 3] = 255;
    }
    frames.push({ rgba: cvs.slice(), delay: gce.delay });
    if (gce.disp === 2) for (let y = fy; y < Math.min(H, fy + fh); y++) cvs.fill(0, (y * W + fx) * 4, (y * W + Math.min(W, fx + fw)) * 4);
    else if (prev) cvs.set(prev);
    gce = { delay: 100, trans: -1, disp: 0 };
  }
  return { w: W, h: H, frames };
}
function gifLzwDec(min, data, npix) {
  const out = new Uint8Array(npix), clear = 1 << min, eoi = clear + 1, prefix = new Int16Array(4096), suffix = new Uint8Array(4096), st = new Uint8Array(4097);
  for (let i = 0; i < clear; i++) { prefix[i] = -1; suffix[i] = i; }
  let size = min + 1, mask = (1 << size) - 1, next = eoi + 1, bits = 0, acc = 0, dp = 0, op = 0, old = -1, first = 0;
  while (op < npix) {
    while (bits < size) { if (dp >= data.length) return out; acc |= data[dp++] << bits; bits += 8; }
    let code = acc & mask; acc >>>= size; bits -= size;
    if (code === clear) { size = min + 1; mask = (1 << size) - 1; next = eoi + 1; old = -1; continue; }
    if (code === eoi) break;
    if (old === -1) { if (code >= clear) break; out[op++] = suffix[code]; old = first = code; continue; }
    const inCode = code; let sp = 0;
    if (code >= next) { st[sp++] = first; code = old; }
    while (code > eoi) { st[sp++] = suffix[code]; code = prefix[code]; }
    first = suffix[code]; st[sp++] = first;
    while (sp > 0 && op < npix) out[op++] = st[--sp];
    if (next < 4096) { prefix[next] = old; suffix[next] = first; next++; if (next > mask && size < 12) { size++; mask = (1 << size) - 1; } }
    old = inCode;
  }
  return out;
}
function gifLzwEnc(min, idx) {
  const clear = 1 << min, eoi = clear + 1, out = []; let size = min + 1, next = eoi + 1, acc = 0, bits = 0, dict = new Map();
  const emit = c => { acc |= c << bits; bits += size; while (bits >= 8) { out.push(acc & 255); acc >>>= 8; bits -= 8; } };
  emit(clear); let cur = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i], key = (cur << 8) | k, hit = dict.get(key);
    if (hit !== undefined) { cur = hit; continue; }
    emit(cur);
    if (next === 4096) { emit(clear); next = eoi + 1; size = min + 1; dict = new Map(); }
    else { if (next >= (1 << size)) size++; dict.set(key, next++); }
    cur = k;
  }
  emit(cur); emit(eoi); if (bits > 0) out.push(acc & 255);
  return out;
}
/* 모든 프레임에서 고른 색으로 팔레트 하나 (median cut) */
function gifPalette(frames, maxC) {
  const sm = []; const tot = frames.reduce((s, f) => s + f.rgba.length / 4, 0), step = Math.max(1, Math.floor(tot / 30000));
  let c = 0; frames.forEach(f => { const a = f.rgba; for (let i = 0; i < a.length; i += 4) { if (c++ % step) continue; if (a[i + 3] < 128) continue; sm.push([a[i], a[i + 1], a[i + 2]]); } });
  if (!sm.length) sm.push([0, 0, 0]);
  let boxes = [sm];
  while (boxes.length < maxC) {
    let bi = -1, bc = 0, br = -1;
    boxes.forEach((bx, i) => { if (bx.length < 2) return; for (let ch = 0; ch < 3; ch++) { let lo = 255, hi = 0; bx.forEach(v => { if (v[ch] < lo) lo = v[ch]; if (v[ch] > hi) hi = v[ch]; }); const r = (hi - lo) * Math.sqrt(bx.length); if (r > br) { br = r; bi = i; bc = ch; } } });
    if (bi < 0 || br <= 0) break;
    const bx = boxes[bi].sort((a, b) => a[bc] - b[bc]), m = bx.length >> 1; boxes.splice(bi, 1, bx.slice(0, m), bx.slice(m));
  }
  return boxes.map(bx => { const s = [0, 0, 0]; bx.forEach(v => { s[0] += v[0]; s[1] += v[1]; s[2] += v[2]; }); return s.map(x => Math.round(x / bx.length)); });
}
function gifEncode(W, H, frames) {
  const trans = frames.some(f => { const a = f.rgba; for (let i = 3; i < a.length; i += 4) if (a[i] < 128) return true; return false; });
  const pal = gifPalette(frames, trans ? 255 : 256), TI = trans ? pal.length : -1; if (trans) pal.push([0, 0, 0]);
  let bitsN = 1; while ((1 << bitsN) < pal.length) bitsN++; const n = 1 << bitsN;
  const cache = new Map(), near = (r, g, b) => { const k = (r >> 2) << 12 | (g >> 2) << 6 | (b >> 2); let v = cache.get(k); if (v !== undefined) return v;
    let bd = 1e9; v = 0; for (let i = 0; i < pal.length; i++) { if (i === TI) continue; const p = pal[i], d = (p[0] - r) ** 2 * 2 + (p[1] - g) ** 2 * 4 + (p[2] - b) ** 2 * 3; if (d < bd) { bd = d; v = i; } } cache.set(k, v); return v; };
  const o = []; const w16 = v => o.push(v & 255, (v >> 8) & 255);
  o.push(71, 73, 70, 56, 57, 97); w16(W); w16(H); o.push(0x80 | (bitsN - 1), 0, 0);
  for (let i = 0; i < n; i++) { const p = pal[i] || [0, 0, 0]; o.push(p[0], p[1], p[2]); }
  o.push(0x21, 0xFF, 11, 78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, 3, 1, 0, 0, 0);   // 무한 반복
  const min = Math.max(2, bitsN);
  frames.forEach(f => {
    const a = f.rgba, idx = new Uint8Array(W * H);
    for (let i = 0, j = 0; i < a.length; i += 4, j++) idx[j] = a[i + 3] < 128 && TI >= 0 ? TI : near(a[i], a[i + 1], a[i + 2]);
    o.push(0x21, 0xF9, 4, (trans ? 1 : 0) | (2 << 2)); w16(Math.max(2, Math.round(f.delay / 10))); o.push(TI >= 0 ? TI : 0, 0);
    o.push(0x2C); w16(0); w16(0); w16(W); w16(H); o.push(0);
    o.push(min); const lz = gifLzwEnc(min, idx);
    for (let i = 0; i < lz.length; i += 255) { const ch = lz.slice(i, i + 255); o.push(ch.length, ...ch); } o.push(0);
  });
  o.push(0x3B); return new Uint8Array(o);
}
/* 프레임들을 원하는 크기로 */
function gifScale(g, W, H, step) {
  const src = document.createElement('canvas'); src.width = g.w; src.height = g.h; const sg = src.getContext('2d');
  const dst = document.createElement('canvas'); dst.width = W; dst.height = H; const dg = dst.getContext('2d'); dg.imageSmoothingQuality = 'high';
  const out = [];
  for (let i = 0; i < g.frames.length; i += step) {
    let delay = 0; for (let k = i; k < Math.min(g.frames.length, i + step); k++) delay += g.frames[k].delay;
    sg.putImageData(new ImageData(g.frames[i].rgba, g.w, g.h), 0, 0); dg.clearRect(0, 0, W, H); dg.drawImage(src, 0, 0, W, H);
    out.push({ rgba: dg.getImageData(0, 0, W, H).data, delay });
  }
  return out;
}
const gifB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return 'data:image/gif;base64,' + btoa(s); };
/* 움직이는 GIF면 크기에 맞게 줄인 dataURL, 아니면 null (평소 방식으로 처리) */
async function gifMaybe(file, maxSide, maxBytes) {
  if (!file || !/gif$/i.test(file.type || file.name || '')) return null;
  let g; try { g = gifDecode(await file.arrayBuffer()); } catch (e) { return null; }
  if (!g.frames.length || g.frames.length < 2) return null;
  if (file.size <= maxBytes && Math.max(g.w, g.h) <= maxSide) return await new Promise(r => { const fr = new FileReader(); fr.onload = e => r(e.target.result); fr.readAsDataURL(file); });
  if (typeof toast === 'function') toast('움직이는 그림을 줄이는 중…');
  await new Promise(r => setTimeout(r, 30));
  let sc = Math.min(1, maxSide / Math.max(g.w, g.h)), step = Math.max(1, Math.ceil(g.frames.length / 60)), last = null;
  for (let t = 0; t < 9; t++) {
    const W = Math.max(8, Math.round(g.w * sc)), H = Math.max(8, Math.round(g.h * sc)), bytes = gifEncode(W, H, gifScale(g, W, H, step));
    last = bytes; if (bytes.length <= maxBytes) return gifB64(bytes);
    if (t % 2) step++; else sc *= .78;
    await new Promise(r => setTimeout(r, 0));
  }
  if (typeof toast === 'function') toast('움직이는 그림이 너무 커서 멈춘 그림으로 넣었어요');
  return null;
}
/* 방 액자용: 프레임을 140ms 간격으로 골라 도트로 바꾼 뒤 세로로 이어 붙인 PNG (최대 24장) */
async function gifStrip(file, sz, pixelizeFn) {
  if (!file || !/gif$/i.test(file.type || file.name || '')) return null;
  let g; try { g = gifDecode(await file.arrayBuffer()); } catch (e) { return null; }
  if (g.frames.length < 2) return null;
  const total = g.frames.reduce((s, f) => s + f.delay, 0); let ms = 140; while (total / ms > 24) ms += 70;
  const picks = []; let acc = 0, fi = 0;
  for (let t = 0; t < total && picks.length < 24; t += ms) { while (fi < g.frames.length - 1 && acc + g.frames[fi].delay <= t) { acc += g.frames[fi].delay; fi++; } picks.push(fi); }
  const src = document.createElement('canvas'); src.width = g.w; src.height = g.h; const sg = src.getContext('2d');
  const strip = document.createElement('canvas'); strip.width = sz.w; strip.height = sz.h * picks.length; const tg = strip.getContext('2d');
  for (let k = 0; k < picks.length; k++) {
    sg.clearRect(0, 0, g.w, g.h); sg.putImageData(new ImageData(g.frames[picks[k]].rgba, g.w, g.h), 0, 0);
    const im = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = pixelizeFn(src, sz); });
    tg.drawImage(im, 0, sz.h * k);
  }
  return { url: strip.toDataURL('image/png'), n: picks.length, ms };
}
