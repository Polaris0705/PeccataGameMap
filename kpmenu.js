/* =========================================================
   KP 메뉴 정리: 화면 몇 개를 하나로 합침
   - 🧭 대시보드  ← 호출·대기열
   - 🗂 데이터 관리 ← 플레이어(HO 배정 · KP 계정) · 🏷 HO 이름 · 🔧 KP 권한 진단
   - 🪑 가구 · 토큰 ← 가구 관리 + 토큰 시험실 (위쪽 탭으로 전환, 시험실은 비밀번호 그대로)
   ========================================================= */
(() => {
  const dash = VIEWS.kdash, queue = VIEWS.kqueue;
  if (dash && queue) VIEWS.kdash = () => {
    if (!IS_ADMIN) return dash();
    return dash().replace(/onclick="go\('kqueue'\)"/g, `onclick="document.getElementById('kqBox')?.scrollIntoView({behavior:'smooth'})"`)
      + `<div id="kqBox" style="margin-top:12px">${queue()}</div>`;
  };

  const data = VIEWS.kdata, players = VIEWS.players, names = VIEWS.ktitle;
  if (data) VIEWS.kdata = () => {
    if (!IS_ADMIN) return data();
    const pl = players ? players() : '';
    const nm = names ? names() : '';
    const diag = DEMO ? '' : `<div class="panel"><h2>🔧 문제 해결</h2><p class="muted" style="margin:0 0 6px">저장이 안 되거나 KP 기능이 막힐 때</p><button class="sm" onclick="adminDiag()">KP 권한 진단</button></div>`;
    return pl + nm + data() + diag;
  };

  const furn = VIEWS.kfurn, lab = VIEWS.kavatar;
  const head = on => `<div class="toggles" style="margin-bottom:10px"><button class="${on === 'kfurn' ? 'on' : ''}" onclick="go('kfurn')">🪑 가구 관리</button><button class="${on === 'kavatar' ? 'on' : ''}" onclick="go('kavatar')">🎎 토큰 시험실</button></div>`;
  if (furn) VIEWS.kfurn = () => IS_ADMIN ? head('kfurn') + furn() : furn();
  if (lab) VIEWS.kavatar = () => IS_ADMIN ? head('kavatar') + lab() : lab();
})();
