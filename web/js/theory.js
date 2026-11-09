/* 기초 화성학 섹션 */
(function (global) {
  'use strict';
  var E = global.ChordEngine;

  function link(sym) {
    var pretty = sym.replace(/#/g, '♯').replace(/b(?=\d)/g, '♭').replace(/^([A-G])b/, '$1♭');
    return '<a class="chordlink" href="#/chord/' + encodeURIComponent(sym) + '">' + pretty + '</a>';
  }

  var KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db'];
  var INTERVAL_ROWS = [
    ['R', 0, '완전1도 (같은 음)', '0프렛'],
    ['b2', 1, '단2도', '1프렛'],
    ['2', 2, '장2도', '2프렛'],
    ['b3', 3, '단3도', '3프렛'],
    ['3', 4, '장3도', '4프렛'],
    ['4', 5, '완전4도', '5프렛'],
    ['b5', 6, '감5도 (= 증4도)', '6프렛'],
    ['5', 7, '완전5도', '7프렛'],
    ['#5', 8, '증5도 (= 단6도)', '8프렛'],
    ['6', 9, '장6도', '9프렛'],
    ['b7', 10, '단7도', '10프렛'],
    ['7', 11, '장7도', '11프렛'],
    ['9', 14, '장9도 (= 장2도 + 옥타브)', '14프렛'],
    ['11', 17, '완전11도 (= 4도 + 옥타브)', '17프렛'],
    ['13', 21, '장13도 (= 6도 + 옥타브)', '21프렛']
  ];

  function intervalTable(rootName) {
    var root = E.parseNote(rootName);
    var rows = INTERVAL_ROWS.map(function (r) {
      var n = E.spellNote(root, r[0]);
      return '<tr><td><b>' + r[0].replace(/^b/, '♭').replace(/^#/, '♯') + '</b></td><td>' + r[2] + '</td><td>' + r[1] + '</td><td><b>' + n.pretty + '</b></td><td class="muted">' + r[3] + '</td></tr>';
    }).join('');
    return '<table><tr><th>표기</th><th>이름</th><th>반음</th><th>' + E.prettyName(rootName) + ' 기준</th><th>같은 줄에서</th></tr>' + rows + '</table>';
  }

  function diatonicTable(key, minor) {
    var list = E.diatonicChords(key, minor);
    var head = '<tr><th>도수</th><th>3화음</th><th>7화음</th></tr>';
    var rows = list.map(function (c) {
      return '<tr><td><b>' + c.roman + '</b></td><td>' + link(c.triad) + '</td><td>' + link(c.seventh) + '</td></tr>';
    }).join('');
    return '<table>' + head + rows + '</table>';
  }

  function keyOptions(selected) {
    return KEYS.map(function (k) { return '<option value="' + k + '"' + (k === selected ? ' selected' : '') + '>' + E.prettyName(k).replace('#', '♯') + '</option>'; }).join('');
  }

  var LESSONS = [
    {
      id: 'notes', title: '음 12개와 반음 · 온음',
      body: function () {
        return '<p>음악에서 쓰는 음은 <b>12개</b>뿐이에요. 이 12개가 높이만 바뀌며 계속 반복돼요.</p>' +
          '<p class="mono" style="font-size:15px">C · C♯/D♭ · D · D♯/E♭ · E · F · F♯/G♭ · G · G♯/A♭ · A · A♯/B♭ · B → 다시 C</p>' +
          '<ul><li><b>반음</b>: 바로 옆 음. 기타에서는 <b>프렛 1칸</b>.</li>' +
          '<li><b>온음</b>: 반음 2개. 기타에서는 <b>프렛 2칸</b>.</li>' +
          '<li><b>♯(샵)</b>은 반음 올림, <b>♭(플랫)</b>은 반음 내림. C♯ 과 D♭ 은 같은 소리예요(이명동음).</li>' +
          '<li>E–F, B–C 사이에는 검은 건반이 없어서 <b>반음</b>이에요. 나머지 이웃한 알파벳끼리는 온음.</li></ul>' +
          '<div class="tip">💡 기타 6번줄 개방현은 E. 1프렛 F, 3프렛 G, 5프렛 A, 7프렛 B, 8프렛 C… 12프렛에서 다시 E(한 옥타브 위)가 돼요.</div>';
      }
    },
    {
      id: 'intervals', title: '음정(도수)이란? — 두 음 사이의 거리',
      body: function () {
        return '<p>코드 다이어그램에 적힌 <b>R, 3, 5, ♭7, 9</b> 같은 숫자는 <b>근음(R)에서 몇 도 떨어진 음인가</b>를 뜻해요. 이 거리를 <b>음정</b> 또는 <b>도수</b>라고 불러요.</p>' +
          '<p>같은 "3도"라도 반음 3개면 <b>단3도(♭3)</b>, 4개면 <b>장3도(3)</b>예요. 이 차이가 마이너와 메이저를 가릅니다.</p>' +
          '<div class="keyrow">근음 고르기 <select data-interval-root>' + keyOptions('C') + '</select></div>' +
          '<div class="scroll-x" data-interval-table>' + intervalTable('C') + '</div>' +
          '<div class="tip">💡 "장(Major)/단(minor)"은 2·3·6·7도에, "완전(Perfect)"은 1·4·5·8도에 붙어요. 완전음정을 반음 내리면 <b>감</b>, 올리면 <b>증</b>이에요.</div>';
      }
    },
    {
      id: 'scale', title: '장음계(메이저 스케일)와 도수 번호',
      body: function () {
        return '<p>도수 번호는 <b>메이저 스케일(도레미파솔라시)</b>을 기준으로 붙여요. C 메이저 스케일은 이렇게 생겼어요.</p>' +
          '<table><tr><th>도수</th><td>1</td><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td></tr>' +
          '<tr><th>C 키</th><td>C</td><td>D</td><td>E</td><td>F</td><td>G</td><td>A</td><td>B</td><td>C</td></tr>' +
          '<tr><th>간격</th><td>온</td><td>온</td><td>반</td><td>온</td><td>온</td><td>온</td><td>반</td><td></td></tr></table>' +
          '<p><b>온–온–반–온–온–온–반</b> 이 패턴을 어느 음에서 시작해도 그 음의 메이저 스케일이 돼요.</p>' +
          '<p>그래서 코드 공식에서 <b>숫자만 있으면 메이저 스케일 그대로</b>, <b>♭이 붙으면 반음 낮게</b>, <b>♯이 붙으면 반음 높게</b>라는 뜻이에요. 예를 들어 ♭3 은 "메이저 스케일의 3번째 음을 반음 내린 음"이에요.</p>';
      }
    },
    {
      id: 'triads', title: '3화음 — 3도씩 쌓아 만드는 기본 코드',
      body: function () {
        return '<p>코드는 기본적으로 <b>3도 간격으로 음을 쌓아서</b> 만들어요. 근음 위에 3도, 그 위에 다시 3도를 쌓으면 <b>3화음(트라이어드)</b>이 됩니다.</p>' +
          '<table><tr><th>이름</th><th>쌓는 법</th><th>공식</th><th>예</th></tr>' +
          '<tr><td>메이저</td><td>장3도 + 단3도</td><td>R 3 5</td><td>' + link('C') + '</td></tr>' +
          '<tr><td>마이너</td><td>단3도 + 장3도</td><td>R ♭3 5</td><td>' + link('Cm') + '</td></tr>' +
          '<tr><td>디미니시</td><td>단3도 + 단3도</td><td>R ♭3 ♭5</td><td>' + link('Cdim') + '</td></tr>' +
          '<tr><td>오그먼트</td><td>장3도 + 장3도</td><td>R 3 ♯5</td><td>' + link('Caug') + '</td></tr></table>' +
          '<p><b>3도</b>는 코드의 성격(밝음/어두움)을, <b>5도</b>는 안정감을 담당해요. 그래서 기타에서는 소리가 꽉 찰 때 5도를 빼기도 하지만, 3도는 웬만하면 빼지 않아요.</p>' +
          '<div class="tip">💡 3도를 빼고 근음+5도만 치면 ' + link('C5') + ' (파워 코드). 장/단이 없어서 록에서 많이 써요. 3도 대신 4도를 쓰면 ' + link('Csus4') + ', 2도를 쓰면 ' + link('Csus2') + '.</div>';
      }
    },
    {
      id: 'sevenths', title: '7화음 — 3화음 위에 3도를 하나 더',
      body: function () {
        return '<p>3화음 위에 3도를 한 번 더 쌓으면 7도가 생겨서 <b>7화음</b>이 돼요. 재즈·팝에서 아주 자주 써요.</p>' +
          '<table><tr><th>이름</th><th>= 3화음 + 7도</th><th>공식</th><th>예</th></tr>' +
          '<tr><td>메이저 세븐스</td><td>메이저 + 장7도</td><td>R 3 5 7</td><td>' + link('Cmaj7') + '</td></tr>' +
          '<tr><td>도미넌트 세븐스</td><td>메이저 + 단7도</td><td>R 3 5 ♭7</td><td>' + link('C7') + '</td></tr>' +
          '<tr><td>마이너 세븐스</td><td>마이너 + 단7도</td><td>R ♭3 5 ♭7</td><td>' + link('Cm7') + '</td></tr>' +
          '<tr><td>하프 디미니시</td><td>디미니시 + 단7도</td><td>R ♭3 ♭5 ♭7</td><td>' + link('Cm7b5') + '</td></tr>' +
          '<tr><td>디미니시 세븐스</td><td>디미니시 + 감7도</td><td>R ♭3 ♭5 𝄫7</td><td>' + link('Cdim7') + '</td></tr>' +
          '<tr><td>마이너 메이저 세븐스</td><td>마이너 + 장7도</td><td>R ♭3 5 7</td><td>' + link('CmMaj7') + '</td></tr></table>' +
          '<div class="tip">⚠️ 그냥 "7"은 <b>단7도(♭7)</b>예요. 장7도를 원하면 꼭 "maj7"(또는 M7, △7)라고 써요. C7 과 Cmaj7 은 완전히 다른 코드!</div>' +
          '<p>장7도는 근음보다 <b>반음 아래</b>, 단7도는 근음보다 <b>온음 아래</b> 음이에요. 기타에서 근음 옥타브 자리를 찾고 1칸/2칸 내려오면 쉽게 찾을 수 있어요.</p>';
      }
    },
    {
      id: 'sixadd', title: '6코드 · add 코드 · sus 코드',
      body: function () {
        return '<ul>' +
          '<li><b>6</b>: 3화음 + 장6도. ' + link('C6') + ' = C E G A, ' + link('Am6') + ' = A C E F♯</li>' +
          '<li><b>add9</b>: 7도 없이 9도만 더함. ' + link('Cadd9') + ' = C E G D. (Cadd9 ≠ C9 — C9 은 ♭7 도 들어 있어요)</li>' +
          '<li><b>6/9</b>: 6도와 9도를 함께. ' + link('C69') + '</li>' +
          '<li><b>sus4 / sus2</b>: 3도를 <b>빼고</b> 4도나 2도로 바꿈. ' + link('Dsus4') + ', ' + link('Dsus2') + '. sus4 는 보통 원래 코드(D)로 돌아가며 긴장을 풀어요.</li>' +
          '<li><b>7sus4</b>: sus4 + ♭7. ' + link('G7sus4') + '</li></ul>' +
          '<div class="tip">💡 "add"가 붙으면 <b>더하기만</b>, "sus"가 붙으면 <b>3도를 바꾸기</b>예요.</div>';
      }
    },
    {
      id: 'tensions', title: '텐션 (9 · 11 · 13) 과 변화음',
      body: function () {
        return '<p>7화음 위로 3도를 계속 쌓으면 <b>9도 → 11도 → 13도</b>가 나와요. 이것들을 <b>텐션(확장음)</b>이라고 불러요.</p>' +
          '<table><tr><th>텐션</th><th>사실은</th><th>C 기준</th></tr>' +
          '<tr><td>9</td><td>2도 + 옥타브</td><td>D</td></tr>' +
          '<tr><td>11</td><td>4도 + 옥타브</td><td>F</td></tr>' +
          '<tr><td>13</td><td>6도 + 옥타브</td><td>A</td></tr></table>' +
          '<p>코드 이름의 가장 큰 숫자가 9·11·13 이면 그 아래 7도도 들어 있다는 뜻이에요. 예: ' + link('C9') + ' = C E G B♭ D, ' + link('Cmaj9') + ' = C E G B D.</p>' +
          '<p><b>변화 텐션</b>: ♭9, ♯9, ♯11, ♭13 처럼 반음 올리거나 내린 텐션. 주로 도미넌트 7 코드에 붙어요. 예: ' + link('E7#9') + ', ' + link('G7b9') + ', ' + link('Fmaj7#11') + ', ' + link('C7alt') + '</p>' +
          '<div class="tip">💡 기타 줄은 6개뿐이라 13코드처럼 음이 많은 코드는 일부를 빼요. 빼는 순서: <b>5도 → 11도(메이저/도미넌트에서) → 9도</b>. 3도와 7도, 그리고 이름에 적힌 텐션은 남기는 게 원칙이에요. 이 앱에서는 빼도 되는 음을 "생략 가능"으로 표시해요.</div>';
      }
    },
    {
      id: 'reading', title: '코드 이름 읽는 법 — 순서대로 분해하기',
      body: function () {
        return '<p>코드 이름은 보통 이 순서로 읽어요.</p>' +
          '<table><tr><th>순서</th><th>부분</th><th>뜻</th></tr>' +
          '<tr><td>①</td><td>근음</td><td>C, F♯, B♭ …</td></tr>' +
          '<tr><td>②</td><td>성격</td><td>(없음)=메이저, m=마이너, dim/°=디미니시, aug/+=오그먼트, ø=하프디미니시</td></tr>' +
          '<tr><td>③</td><td>숫자</td><td>6, 7, 9, 11, 13 (maj 가 붙으면 장7도)</td></tr>' +
          '<tr><td>④</td><td>변형</td><td>sus4, add9, ♭5, ♯9, ♯11, ♭13 …</td></tr>' +
          '<tr><td>⑤</td><td>/베이스</td><td>슬래시 뒤 = 가장 낮게 칠 음</td></tr></table>' +
          '<p><b>예시 1)</b> ' + link('F#m7b5') + ' → F♯ 근음 · 마이너(♭3) · 7(♭7) · ♭5 → <b>F♯ A C E</b></p>' +
          '<p><b>예시 2)</b> ' + link('Bb13#11') + ' → B♭ 근음 · 13(♭7, 9, 13 포함) · ♯11 → <b>B♭ D F A♭ C E G</b> (5도·9도는 생략 가능)</p>' +
          '<p><b>예시 3)</b> ' + link('Am7/G') + ' → Am7 을 치되 가장 낮은 음은 G</p>' +
          '<div class="tip">💡 같은 코드를 여러 방식으로 써요: Cmaj7 = CM7 = C△7, Cm7 = C-7 = Cmi7, Cm7♭5 = Cø, Cdim = C°, Caug = C+. 이 앱은 모두 알아들어요.</div>';
      }
    },
    {
      id: 'inversion', title: '자리바꿈(전위)과 슬래시 코드',
      body: function () {
        return '<p>코드 구성음은 같아도 <b>가장 낮은 음(베이스)</b>이 무엇이냐에 따라 느낌이 달라져요.</p>' +
          '<ul><li><b>기본형</b>: 베이스가 근음. ' + link('C') + '</li>' +
          '<li><b>1전위</b>: 베이스가 3도. ' + link('C/E') + '</li>' +
          '<li><b>2전위</b>: 베이스가 5도. ' + link('C/G') + '</li>' +
          '<li><b>3전위</b>: 베이스가 7도. ' + link('C7/Bb') + '</li></ul>' +
          '<p>코드에 없는 음을 베이스로 쓰기도 해요. 예: ' + link('D/C') + ' (D 코드 + 베이스 C). 베이스 라인을 매끄럽게 이을 때 자주 써요: ' + link('C') + ' → ' + link('G/B') + ' → ' + link('Am') + '.</p>';
      }
    },
    {
      id: 'diatonic', title: '다이아토닉 코드 — 한 키 안에서 쓰는 코드들',
      body: function () {
        return '<p>메이저 스케일의 각 음을 근음으로, 스케일 음만 써서 3도씩 쌓으면 그 키의 기본 코드 7개가 나와요. 대부분의 노래는 이 코드들로 만들어져요.</p>' +
          '<div class="keyrow">키 <select data-dia-key>' + keyOptions('C') + '</select>' +
          '<select data-dia-mode><option value="major">메이저 키</option><option value="minor">마이너 키 (자연단음계)</option></select></div>' +
          '<div data-dia-table>' + diatonicTable('C', false) + '</div>' +
          '<p>메이저 키는 항상 <b>I · ii · iii · IV · V · vi · vii°</b> (대문자=메이저, 소문자=마이너, °=디미니시) 순서예요.</p>' +
          '<div class="tip">자주 쓰는 진행 (C 키 예)<br>' +
          '• I–V–vi–IV: ' + link('C') + ' ' + link('G') + ' ' + link('Am') + ' ' + link('F') + '<br>' +
          '• ii–V–I (재즈): ' + link('Dm7') + ' ' + link('G7') + ' ' + link('Cmaj7') + '<br>' +
          '• vi–IV–I–V: ' + link('Am') + ' ' + link('F') + ' ' + link('C') + ' ' + link('G') + '</div>';
      }
    },
    {
      id: 'fretboard', title: '기타 지판에서 도수 찾는 요령',
      body: function () {
        return '<p>근음 위치만 알면 나머지 도수는 <b>모양</b>으로 찾을 수 있어요. (6·5·4번줄에 근음이 있을 때 기준)</p>' +
          '<table><tr><th>찾을 음</th><th>근음에서 이동</th></tr>' +
          '<tr><td>옥타브(R)</td><td>2줄 위(가는 쪽) + 2프렛 오른쪽</td></tr>' +
          '<tr><td>5도</td><td>1줄 위 + 2프렛 오른쪽 (파워코드 모양)</td></tr>' +
          '<tr><td>4도</td><td>1줄 위, 같은 프렛</td></tr>' +
          '<tr><td>장3도</td><td>1줄 위 + 1프렛 왼쪽</td></tr>' +
          '<tr><td>단3도</td><td>1줄 위 + 2프렛 왼쪽 / 또는 같은 줄 3프렛 오른쪽</td></tr>' +
          '<tr><td>♭7</td><td>2줄 위, 같은 프렛</td></tr>' +
          '<tr><td>7</td><td>2줄 위 + 1프렛 오른쪽</td></tr></table>' +
          '<div class="tip">⚠️ <b>2번줄(B)</b>을 넘어갈 때는 모양이 오른쪽으로 1프렛 밀려요. 3번줄(G)과 2번줄(B) 사이만 장3도 간격이고, 나머지 줄 사이는 완전4도이기 때문이에요.</div>' +
          '<p>코드 화면 아래의 <b>지판 전체 보기</b>에서 이 모양들이 반복되는 걸 직접 확인해 보세요.</p>';
      }
    }
  ];

  function render(openId) {
    var html = ['<p class="small muted" style="margin:0 0 4px">코드 사전을 이해하기 위한 기초예요. 위에서부터 순서대로 읽으면 좋아요. 주황색 코드 이름을 누르면 바로 운지를 볼 수 있어요.</p>'];
    LESSONS.forEach(function (l, i) {
      html.push('<details class="lesson" id="lesson-' + l.id + '"' + (openId === l.id ? ' open' : '') + '><summary><span class="n">' + (i + 1) + '</span>' + l.title + '</summary><div class="body">' + l.body() + '</div></details>');
    });
    return html.join('');
  }

  function bind(root) {
    var ir = root.querySelector('[data-interval-root]');
    if (ir) ir.addEventListener('change', function () {
      root.querySelector('[data-interval-table]').innerHTML = intervalTable(ir.value);
    });
    var dk = root.querySelector('[data-dia-key]'), dm = root.querySelector('[data-dia-mode]');
    function upd() {
      var minor = dm.value === 'minor';
      root.querySelector('[data-dia-table]').innerHTML = diatonicTable(dk.value, minor);
    }
    if (dk) { dk.addEventListener('change', upd); dm.addEventListener('change', upd); }
  }

  global.Theory = { render: render, bind: bind, LESSONS: LESSONS };
})(this);
