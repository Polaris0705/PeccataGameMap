/* 숲속 저택 푸시 알림 서버
   Firestore의 calls / bookings / items 변화를 지켜보다가 Web Push를 보냅니다.
   환경변수: FIREBASE_SERVICE_ACCOUNT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, ADMIN_EMAILS */
const http = require('http');
const admin = require('firebase-admin');
const webpush = require('web-push');
const { decide } = require('./rules');

function need(k) { const v = process.env[k]; if (!v) { console.error(`환경변수 ${k}가 없음`); process.exit(1); } return v; }
let sa;
try { sa = JSON.parse(need('FIREBASE_SERVICE_ACCOUNT')); } catch (e) { console.error('FIREBASE_SERVICE_ACCOUNT가 올바른 JSON이 아님'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:kp@example.com', need('VAPID_PUBLIC_KEY'), need('VAPID_PRIVATE_KEY'));
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

const START = Date.now();
let admins = [], hos = {}, everyone = [];
let sent = 0, lastError = '';

db.collection('users').onSnapshot(s => {
  admins = s.docs.filter(d => ADMIN_EMAILS.includes(String(d.data().email || '').toLowerCase())).map(d => d.id);
  everyone = s.docs.map(d => d.id);
  hos = {}; s.docs.forEach(d => { const h = d.data().ho; if (h) (hos[h] = hos[h] || []).push(d.id); });
}, e => { lastError = 'users: ' + e.message; console.error(lastError); });

async function sendTo(uid, payload) {
  const ref = db.doc('pushSubs/' + uid);
  const snap = await ref.get();
  const subs = (snap.exists && snap.data().subs) || [];
  if (!subs.length) return;
  const dead = [];
  await Promise.all(subs.map(sub => webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 3600, urgency: payload.tag === 'call' ? 'high' : 'normal' })
    .then(() => { sent++; })
    .catch(err => {
      if (err.statusCode === 404 || err.statusCode === 410) dead.push(sub.endpoint);
      else { lastError = `push ${uid}: ${err.statusCode || ''} ${err.body || err.message}`; console.error(lastError); }
    })));
  if (dead.length) await ref.set({ subs: subs.filter(s => !dead.includes(s.endpoint)) });
}

function watch(col) {
  const prev = new Map();
  let first = true;
  db.collection(col).onSnapshot(s => {
    s.docChanges().forEach(ch => {
      const id = ch.doc.id, cur = ch.type === 'removed' ? null : ch.doc.data();
      const before = prev.get(id);
      if (!first) {
        decide(col, ch.type, id, cur, before, { start: START, admins, hos }).forEach(n =>
          sendTo(n.uid, { title: n.title, body: n.body, tag: n.tag, url: './' }).catch(e => { lastError = e.message; console.error(e); }));
      }
      if (cur) prev.set(id, cur); else prev.delete(id);
    });
    first = false;
  }, e => { lastError = col + ': ' + e.message; console.error(lastError); });
}
['calls', 'bookings', 'items'].forEach(watch);

// 채팅 언급·귓속말: 앱이 pings 문서를 남기면 보내고 지움
db.collection('pings').onSnapshot(s => {
  s.docChanges().forEach(ch => {
    if (ch.type !== 'added') return;
    const d = ch.doc.data();
    const done = () => ch.doc.ref.delete().catch(() => {});
    if (!d.at || d.at < Date.now() - 10 * 60 * 1000) return done();
    const to = [...new Set(d.to || [])].filter(u => u && u !== d.from).slice(0, 20);
    Promise.all(to.map(uid => sendTo(uid, { title: d.title || '💬 새 메시지', body: String(d.body || '').slice(0, 140), tag: d.tag || 'chat', url: './' })))
      .catch(e => { lastError = 'pings: ' + e.message; console.error(lastError); })
      .finally(done);
  });
}, e => { lastError = 'pings: ' + e.message; console.error(lastError); });

// 세션 일정 알림: 1시간 전 · 시작 시간 (sessions 문서의 sent 로 한 번만)
function fmt(ms) { const d = new Date(ms + 9 * 3600e3); const W = ['일', '월', '화', '수', '목', '금', '토']; return `${d.getUTCMonth() + 1}/${d.getUTCDate()} (${W[d.getUTCDay()]}) ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; }
async function sessionTick() {
  try {
    const now = Date.now(), snap = await db.collection('sessions').where('at', '>', now - 30 * 60e3).get();
    for (const doc of snap.docs) {
      const s = doc.data(), sent = s.sent || {}, upd = {};
      if (!sent.h1 && s.at - now <= 60 * 60e3 && s.at - now > 5 * 60e3) upd.h1 = ['⏰ 1시간 뒤 세션', `${s.title || '세션'} · ${fmt(s.at)}`];
      if (!sent.st && now >= s.at && now - s.at < 20 * 60e3) upd.st = ['🎲 세션 시작 시간', `${s.title || '세션'} · ${fmt(s.at)}`];
      if (!sent.st && now - s.at >= 20 * 60e3) await doc.ref.update({ 'sent.st': true, 'sent.h1': true });
      for (const [k, [title, body]] of Object.entries(upd)) {
        await doc.ref.update({ ['sent.' + k]: true });
        const skip = new Set(Object.entries(s.rsvp || {}).filter(([, v]) => v === 'n').map(([u]) => u));
        await Promise.all(everyone.filter(u => !skip.has(u)).map(uid => sendTo(uid, { title, body, tag: 'sess', url: './' }).catch(() => {})));
      }
    }
  } catch (e) { lastError = 'sessions: ' + e.message; console.error(lastError); }
}
setInterval(sessionTick, 60e3); setTimeout(sessionTick, 5e3);

http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ ok: true, since: new Date(START).toISOString(), admins: admins.length, sent, lastError }));
}).listen(process.env.PORT || 3000, () => console.log('숲속 저택 푸시 서버 시작'));
