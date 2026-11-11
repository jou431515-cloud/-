# 기타 코드 사전

코드 이름을 검색하면 여러 자리의 운지, 각 음의 도수(R, 3, 5, ♭7, 9 …), 코드가 어떻게 쌓였는지를 보여주는 안드로이드 앱. 기초 화성학 레슨 포함. 인터넷 없이 동작.

## 구조
- `web/` — 앱 화면과 코드 엔진 (HTML/CSS/JS). 브라우저에서 `web/index.html` 을 열어도 그대로 동작.
  - `js/engine.js` — 코드 이름 해석, 구성음/도수, 운지 자동 생성
  - `js/diagram.js` — 지판 SVG, `js/audio.js` — 소리, `js/theory.js` — 화성학 레슨, `js/practice.js` — 코드 퀴즈·청음 연습, `js/app.js` — 화면
- `app/` — 안드로이드 WebView 껍데기 (web 폴더를 assets 로 포함)
- `.github/workflows/build-apk.yml` — main 에 push 하면 APK 를 빌드해 Releases 에 올림

## APK 받기
저장소의 **Releases** 에서 최신 `guitar-chords-N.apk` 를 받아 설치 (출처를 알 수 없는 앱 설치 허용 필요).

## 로컬 테스트
`node test/engine.test.js`
