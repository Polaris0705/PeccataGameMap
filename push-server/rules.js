// Firestore 변경 → 누구에게 어떤 알림을 보낼지 결정 (순수 함수, test.js로 검사)
const SYMS = '①②③④⑤⑥⑦⑧⑨⑩';
const slotTxt = b => (b.slots || []).map(s => SYMS[s - 1] || s).join('');

function decide(col, type, id, cur, prev, ctx) {
  // ctx: { start, admins: [uid...] }
  const out = [];
  const to = (uids, title, body, tag) => [].concat(uids).filter(Boolean).forEach(uid => out.push({ uid, title, body, tag }));
  if (type === 'removed' || !cur) return out;

  if (col === 'calls') {
    if (cur.ack || !cur.at || cur.at < ctx.start) return out;
    if (prev && prev.at === cur.at) return out;
    to(id, cur.pre ? '⏳ 곧 차례예요' : '🔔 KP 호출', cur.msg || '차례예요!', cur.pre ? 'call-pre' : 'call');
  }

  if (col === 'bookings') {
    if (!prev) {
      if (cur.status === 'pending' && (cur.at || 0) >= ctx.start)
        to(ctx.admins, '🗝 새 조사 예약', `${cur.name || ''}: ${cur.place || ''} ${slotTxt(cur)}${cur.note ? ' · ' + cur.note : ''}`, 'booking');
      if (cur.status === 'pending' && (cur.at || 0) >= ctx.start && ctx.hos) (cur.parts || []).forEach(c => (ctx.hos[c] || []).filter(u => u !== cur.uid).forEach(u => to(u, '🙋 같이 가자는 신청', `${cur.name || ''}: ${cur.place || ''} ${slotTxt(cur)}`, 'booking-inv-' + id)));
    } else if (prev.status !== cur.status) {
      if (cur.status === 'approved') to(cur.uid, '✅ 조사 예약 승인', `${cur.place || ''} ${slotTxt(cur)}`, 'booking-' + id);
      if (cur.status === 'rejected') to(cur.uid, '조사 예약 거절', `${cur.place || ''}${cur.kpNote ? ' · ' + cur.kpNote : ''}`, 'booking-' + id);
      if (cur.status === 'cancelled' && prev.status === 'approved') to(cur.uid, '조사 예약 취소', `${cur.place || ''} ${slotTxt(cur)}${cur.kpNote ? ' · ' + cur.kpNote : ''}`, 'booking-' + id);
    } else {
      if (cur.status === 'approved' && cur.changedAt && cur.changedAt !== prev.changedAt) to(cur.uid, '📝 조사 예약 변경', `${cur.place || ''} ${slotTxt(cur)}${cur.kpNote ? ' · ' + cur.kpNote : ''}`, 'booking-' + id);
      if (cur.status === 'approved' && !prev.cancelReq && cur.cancelReq) to(ctx.admins, '🗝 예약 취소 요청', `${cur.name || ''}: ${cur.place || ''} ${slotTxt(cur)}${cur.cancelNote ? ' · ' + cur.cancelNote : ''}`, 'booking-req');
      if (cur.status === 'approved' && cur.reqNo && cur.reqNo !== prev.reqNo) to(cur.uid, '취소 요청 거절', `${cur.place || ''}${cur.kpNote ? ' · ' + cur.kpNote : ''}`, 'booking-' + id);
      if (cur.status === 'pending' && cur.editedAt && cur.editedAt !== prev.editedAt) to(ctx.admins, '✏ 예약 수정', `${cur.name || ''}: ${cur.place || ''} ${slotTxt(cur)}`, 'booking');
    }
  }

  if (col === 'items') {
    if (!prev) {
      if ((cur.at || 0) >= ctx.start && !cur.via) to(cur.owner, '🎒 새 물건', `「${cur.name || ''}」을(를) 받았어요`, 'item');
    } else {
      if (prev.owner !== cur.owner) to(cur.owner, '🎒 물건을 받았어요', `${cur.fromName || '누군가'}에게서 「${cur.name || ''}」`, 'item');
      if (!prev.inspectReq && cur.inspectReq) to(ctx.admins, '🔍 살펴보기 요청', `${cur.ownerName || ''}: 「${cur.name || ''}」`, 'inspect');
      if (!prev.revealed && cur.revealed) to(cur.owner, '✦ 무언가를 발견했어요', `「${cur.name || ''}」을(를) 자세히 살펴보세요`, 'item-' + id);
    }
  }
  return out;
}
module.exports = { decide };
