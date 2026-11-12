/* =========================================================
   숲속 저택 설정 파일
   ※ 이 파일만 HB님 값으로 채워 두세요.
     앞으로 index.html, chat.js 등을 새 버전으로 바꿔도 이 파일은 그대로 두면 돼요.
   ========================================================= */
window.APP_CONFIG = {
  title: "숲속 저택",
  butler: "집사",

  // Firebase 콘솔 > ⚙ 프로젝트 설정 > 일반 > 내 앱 에 나오는 값
  // apiKey를 비워 두면 '데모 모드'로 실행돼요.
  firebase: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  },

  // KP(관리자) 이메일 — firestore.rules 안의 목록과 똑같이 (소문자)
  adminEmails: ["kp1@example.com", "kp2@example.com"],

  // 푸시 알림용 VAPID 공개키 (README 6단계). 비워 두면 푸시 버튼이 숨겨져요.
  vapidPublicKey: "",

  // 채팅 CoC 판정 규칙: 6 = 6판, 7 = 7판
  cocEdition: 6,

  // 스케줄러 HO 코드 ↔ 칠죄종 (미니게임 특전)
  hoSins: { HO1: 'wrath', HO2: 'greed', HO3: 'sloth', HO4: 'gluttony', HO5: 'pride', HO6: 'envy', HO7: 'lust' },

  startCoins: 30
};
