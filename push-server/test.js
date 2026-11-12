const assert = require('assert');
const { decide } = require('./rules');
const ctx = { start: 1000, admins: ['kpA', 'kpB'] };
// 호출
assert.deepStrictEqual(decide('calls', 'added', 'u1', { msg: '차례!', at: 2000, ack: false }, undefined, ctx).map(n => n.uid), ['u1']);
assert.strictEqual(decide('calls', 'modified', 'u1', { msg: '차례!', at: 2000, ack: true }, { at: 2000, ack: false }, ctx).length, 0, '확인 시 알림 없음');
assert.strictEqual(decide('calls', 'modified', 'u1', { at: 500 }, undefined, ctx).length, 0, '서버 시작 전 호출 무시');
// 예약
assert.deepStrictEqual(decide('bookings', 'added', 'b1', { status: 'pending', at: 3000, name: 'PL', place: '서재', slots: [1] }, undefined, ctx).map(n => n.uid), ['kpA', 'kpB']);
assert.deepStrictEqual(decide('bookings', 'modified', 'b1', { status: 'approved', uid: 'u1', place: '서재', slots: [1, 2] }, { status: 'pending' }, ctx)[0].body, '서재 ①②');
assert.strictEqual(decide('bookings', 'modified', 'b1', { status: 'cancelled', uid: 'u1' }, { status: 'pending' }, ctx).length, 0);
// 아이템
assert.deepStrictEqual(decide('items', 'added', 'i1', { owner: 'u1', name: '열쇠', at: 4000 }, undefined, ctx).map(n => n.uid), ['u1']);
assert.strictEqual(decide('items', 'added', 'i2', { owner: 'u1', name: '열린 상자', at: 4000, via: 'a__b' }, undefined, ctx).length, 0, '직접 조합한 건 알림 없음');
assert.deepStrictEqual(decide('items', 'modified', 'i1', { owner: 'u2', name: '열쇠', fromName: 'PL' }, { owner: 'u1' }, ctx).map(n => n.uid), ['u2']);
assert.deepStrictEqual(decide('items', 'modified', 'i1', { owner: 'u1', inspectReq: true, name: '열쇠' }, { owner: 'u1' }, ctx).map(n => n.uid), ['kpA', 'kpB']);
assert.deepStrictEqual(decide('items', 'modified', 'i1', { owner: 'u1', revealed: true, name: '열쇠' }, { owner: 'u1', inspectReq: true }, ctx).map(n => n.uid), ['u1']);
console.log('모든 테스트 통과');
