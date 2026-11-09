/*
 * 기타 코드 엔진
 * - 코드 이름 해석 (예: "Cmaj7", "F#m7b5", "Bb13#11", "G/B")
 * - 구성음 / 도수 계산 (올바른 음이름 철자 포함)
 * - 지판 위 운지(보이싱) 자동 생성
 * 브라우저에서는 window.ChordEngine, Node 에서는 module.exports 로 사용.
 */
(function (global) {
  'use strict';

  var LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  var LETTER_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  var SIMPLE_NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

  // 도수 정의: semi = 근음에서의 반음 수, num = 도수 번호(음이름 철자 계산용)
  var DEGREES = {
    'R':   { semi: 0,  num: 1,  ko: '근음 (완전1도)', role: 'root' },
    'b2':  { semi: 1,  num: 2,  ko: '단2도', role: 'tension' },
    '2':   { semi: 2,  num: 2,  ko: '장2도', role: 'sus' },
    'b3':  { semi: 3,  num: 3,  ko: '단3도', role: 'third' },
    '3':   { semi: 4,  num: 3,  ko: '장3도', role: 'third' },
    '4':   { semi: 5,  num: 4,  ko: '완전4도', role: 'sus' },
    '#4':  { semi: 6,  num: 4,  ko: '증4도', role: 'tension' },
    'b5':  { semi: 6,  num: 5,  ko: '감5도', role: 'fifth' },
    '5':   { semi: 7,  num: 5,  ko: '완전5도', role: 'fifth' },
    '#5':  { semi: 8,  num: 5,  ko: '증5도', role: 'fifth' },
    'b6':  { semi: 8,  num: 6,  ko: '단6도', role: 'tension' },
    '6':   { semi: 9,  num: 6,  ko: '장6도', role: 'sixth' },
    'bb7': { semi: 9,  num: 7,  ko: '감7도', role: 'seventh' },
    'b7':  { semi: 10, num: 7,  ko: '단7도', role: 'seventh' },
    '7':   { semi: 11, num: 7,  ko: '장7도', role: 'seventh' },
    'b9':  { semi: 13, num: 9,  ko: '단9도', role: 'tension' },
    '9':   { semi: 14, num: 9,  ko: '장9도', role: 'tension' },
    '#9':  { semi: 15, num: 9,  ko: '증9도', role: 'tension' },
    '11':  { semi: 17, num: 11, ko: '완전11도', role: 'tension' },
    '#11': { semi: 18, num: 11, ko: '증11도', role: 'tension' },
    'b13': { semi: 20, num: 13, ko: '단13도', role: 'tension' },
    '13':  { semi: 21, num: 13, ko: '장13도', role: 'tension' }
  };

  // 두 음 사이 간격(반음 수) → 음정 이름 (쌓임 설명용)
  var GAP_NAMES = {
    1: '단2도', 2: '장2도', 3: '단3도', 4: '장3도', 5: '완전4도', 6: '증4도/감5도',
    7: '완전5도', 8: '단6도', 9: '장6도', 10: '단7도', 11: '장7도', 12: '옥타브'
  };

  // 반음 수 → 기본 도수 라벨 (슬래시 코드 베이스음 등에 사용)
  var SEMI_TO_LABEL = ['R', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];

  // 표준 튜닝 (6번줄 E2 → 1번줄 E4), MIDI 번호
  var STANDARD_TUNING = [40, 45, 50, 55, 59, 64];
  var STRING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];

  // 대표 코드 종류 (목록 화면과 한국어 이름 표시에 사용)
  var CHORD_TYPES = [
    { sym: '',       ko: '메이저',               group: '3화음', desc: '장3도 + 단3도. 밝고 안정적인 기본 코드.' },
    { sym: 'm',      ko: '마이너',               group: '3화음', desc: '단3도 + 장3도. 어둡고 차분한 기본 코드.' },
    { sym: 'dim',    ko: '디미니시 (감3화음)',     group: '3화음', desc: '단3도 + 단3도. 긴장감 있고 불안한 소리.' },
    { sym: 'aug',    ko: '오그먼트 (증3화음)',     group: '3화음', desc: '장3도 + 장3도. 붕 뜬 듯한 신비로운 소리.' },
    { sym: '5',      ko: '파워 코드',             group: '3화음', desc: '근음 + 5도만. 3도가 없어 장/단 구분이 없음.' },
    { sym: 'sus2',   ko: '서스2',                group: '서스/애드', desc: '3도 대신 2도. 열린 느낌.' },
    { sym: 'sus4',   ko: '서스4',                group: '서스/애드', desc: '3도 대신 4도. 해결(3도로)되고 싶은 느낌.' },
    { sym: 'add9',   ko: '애드나인',              group: '서스/애드', desc: '메이저 3화음 + 9도. 7도 없이 9도만 더함.' },
    { sym: 'madd9',  ko: '마이너 애드나인',        group: '서스/애드', desc: '마이너 3화음 + 9도.' },
    { sym: 'add11',  ko: '애드일레븐',            group: '서스/애드', desc: '메이저 3화음 + 11도.' },
    { sym: '6',      ko: '식스',                 group: '6화음', desc: '메이저 3화음 + 장6도.' },
    { sym: 'm6',     ko: '마이너 식스',           group: '6화음', desc: '마이너 3화음 + 장6도.' },
    { sym: '69',     ko: '식스나인',              group: '6화음', desc: '메이저 3화음 + 6도 + 9도.' },
    { sym: 'm69',    ko: '마이너 식스나인',        group: '6화음', desc: '마이너 3화음 + 6도 + 9도.' },
    { sym: '7',      ko: '도미넌트 세븐스',        group: '7화음', desc: '메이저 3화음 + 단7도. 다음 코드로 가고 싶은 긴장감.' },
    { sym: 'maj7',   ko: '메이저 세븐스',          group: '7화음', desc: '메이저 3화음 + 장7도. 부드럽고 세련된 소리.' },
    { sym: 'm7',     ko: '마이너 세븐스',          group: '7화음', desc: '마이너 3화음 + 단7도.' },
    { sym: 'mMaj7',  ko: '마이너 메이저 세븐스',    group: '7화음', desc: '마이너 3화음 + 장7도. 영화 음악 같은 긴장감.' },
    { sym: 'm7b5',   ko: '하프 디미니시 (m7♭5)',  group: '7화음', desc: '감3화음 + 단7도. ø 로도 씀.' },
    { sym: 'dim7',   ko: '디미니시 세븐스',        group: '7화음', desc: '감3화음 + 감7도. 단3도만 계속 쌓은 코드.' },
    { sym: 'aug7',   ko: '오그먼트 세븐스 (7♯5)', group: '7화음', desc: '증3화음 + 단7도.' },
    { sym: 'maj7#5', ko: '오그먼트 메이저 세븐스', group: '7화음', desc: '증3화음 + 장7도.' },
    { sym: '7sus4',  ko: '세븐 서스4',            group: '7화음', desc: '서스4 + 단7도.' },
    { sym: '7b5',    ko: '세븐 플랫파이브',        group: '7화음', desc: '도미넌트 7에서 5도를 반음 내림.' },
    { sym: '9',      ko: '도미넌트 나인스',        group: '텐션', desc: '도미넌트 7 + 장9도.' },
    { sym: 'maj9',   ko: '메이저 나인스',          group: '텐션', desc: '메이저 7 + 장9도.' },
    { sym: 'm9',     ko: '마이너 나인스',          group: '텐션', desc: '마이너 7 + 장9도.' },
    { sym: '9sus4',  ko: '나인 서스4',            group: '텐션', desc: '7sus4 + 9도.' },
    { sym: '7b9',    ko: '세븐 플랫나인',          group: '텐션', desc: '도미넌트 7 + 단9도.' },
    { sym: '7#9',    ko: '세븐 샵나인',           group: '텐션', desc: '도미넌트 7 + 증9도. 일명 "지미 헨드릭스 코드".' },
    { sym: '11',     ko: '일레븐스',              group: '텐션', desc: '도미넌트 9 + 11도 (보통 3도 생략).' },
    { sym: 'm11',    ko: '마이너 일레븐스',        group: '텐션', desc: '마이너 9 + 11도.' },
    { sym: '7#11',   ko: '세븐 샵일레븐',          group: '텐션', desc: '도미넌트 7 + 증11도.' },
    { sym: 'maj7#11', ko: '메이저7 샵일레븐',      group: '텐션', desc: '메이저 7 + 증11도. 리디안 느낌.' },
    { sym: '13',     ko: '도미넌트 서틴스',        group: '텐션', desc: '도미넌트 9 + 13도 (11도는 보통 생략).' },
    { sym: 'maj13',  ko: '메이저 서틴스',          group: '텐션', desc: '메이저 9 + 13도.' },
    { sym: 'm13',    ko: '마이너 서틴스',          group: '텐션', desc: '마이너 11 + 13도.' },
    { sym: '7b13',   ko: '세븐 플랫서틴',          group: '텐션', desc: '도미넌트 7 + 단13도.' },
    { sym: '13b9',   ko: '서틴 플랫나인',          group: '텐션', desc: '도미넌트 13 + 단9도.' },
    { sym: '7#5#9',  ko: '세븐 샵파이브 샵나인',    group: '텐션', desc: '증5도와 증9도가 함께 있는 도미넌트.' },
    { sym: '7alt',   ko: '얼터드',                group: '텐션', desc: '도미넌트 7 + 변화 텐션(♭9 ♯9 ♯11 ♭13).' }
  ];

  function normalizeAccidentals(s) {
    return s.replace(/♯/g, '#').replace(/♭/g, 'b').replace(/[−–—]/g, '-')
      .replace(/Δ/g, 'maj').replace(/°/g, 'dim').replace(/ø7?/g, 'm7b5')
      .replace(/\s+/g, '');
  }

  function parseNote(str) {
    var m = /^([A-Ga-g])(##|bb|#|b)?/.exec(str);
    if (!m) return null;
    var letter = m[1].toUpperCase();
    var acc = m[2] || '';
    var alter = acc === '#' ? 1 : acc === '##' ? 2 : acc === 'b' ? -1 : acc === 'bb' ? -2 : 0;
    return { letter: letter, alter: alter, pc: mod(LETTER_PC[letter] + alter, 12), text: letter + acc, length: m[0].length };
  }

  function mod(n, m) { return ((n % m) + m) % m; }

  function accidentalText(alter, pretty) {
    if (alter === 0) return '';
    if (pretty) {
      return alter > 0 ? '♯'.repeat(alter) : '♭'.repeat(-alter);
    }
    return alter > 0 ? '#'.repeat(alter) : 'b'.repeat(-alter);
  }

  function prettyName(text) {
    return text.replace(/#/g, '♯').replace(/(^|[A-G])b/g, '$1♭');
  }

  // 근음과 도수로 정확한 음이름(철자) 계산. 예: Eb + 3 → G, Gb + bb7 → Fbb
  function spellNote(root, degreeLabel) {
    var d = DEGREES[degreeLabel];
    var letterIdx = (LETTERS.indexOf(root.letter) + (d.num - 1)) % 7;
    var letter = LETTERS[letterIdx];
    var targetPc = mod(root.pc + d.semi, 12);
    var alter = mod(targetPc - LETTER_PC[letter] + 6, 12) - 6;
    var pretty = letter + accidentalText(alter, true);
    if (Math.abs(alter) >= 2) pretty += '(=' + SIMPLE_NAMES[targetPc] + ')';
    return { letter: letter, alter: alter, pc: targetPc, name: letter + accidentalText(alter, false), pretty: pretty };
  }

  // 정렬 순서 (3도 쌓기 순서)
  function degreeOrder(label) {
    var d = DEGREES[label];
    return d.semi + (label === '2' || label === '4' ? 0.1 : 0);
  }

  function ChordParseError(msg) { this.message = msg; }

  /**
   * 코드 이름 해석.
   * @returns {{ok:true, chord:object} | {ok:false, error:string}}
   */
  function parseChord(input) {
    if (!input || !input.trim()) return { ok: false, error: '코드 이름을 입력하세요.' };
    var raw = normalizeAccidentals(input.trim());
    var root = parseNote(raw);
    if (!root) return { ok: false, error: '근음은 A~G 로 시작해야 해요. (예: C, F#, Bb)' };
    var rest = raw.slice(root.length);

    var bass = null;
    var slash = /\/([A-Ga-g](?:#|b)?)$/.exec(rest);
    if (slash) {
      bass = parseNote(slash[1]);
      rest = rest.slice(0, slash.index);
    }

    try {
      var built = buildFromSuffix(rest);
    } catch (e) {
      if (e instanceof ChordParseError) return { ok: false, error: e.message };
      throw e;
    }
    return { ok: true, chord: makeChord(root, built, bass, rest) };
  }

  function buildFromSuffix(suffixRaw) {
    var s = suffixRaw.replace(/[(),]/g, '');
    var quality = 'maj';
    var majFlag = false;   // maj7 계열
    var number = null;     // 5,6,69,7,9,11,13
    var mods = [];
    var i = 0;

    function eat(re) {
      var m = re.exec(s.slice(i));
      if (m) { i += m[0].length; return m; }
      return null;
    }

    // 1) 화음 성격
    if (eat(/^(mmaj|mMaj|mMA|mM|minmaj|minMaj|-maj|-M|m\/maj|m\/M)/)) { quality = 'min'; majFlag = true; }
    else if (eat(/^(maj|Maj|MAJ|MA|Ma|M)(?!aj)/)) { majFlag = true; }
    else if (eat(/^(min|mi|m|-)(?!aj)/)) { quality = 'min'; }
    else if (eat(/^(dim|o)/)) { quality = 'dim'; }
    else if (eat(/^(aug|\+)/)) { quality = 'aug'; }

    // 2) 숫자 (6, 69, 7, 9, 11, 13, 5)
    var n = eat(/^(6\/9|69|6add9|13|11|9|7|6|5|4|2)/);
    if (n) {
      var t = n[1];
      if (t === '6/9' || t === '6add9') t = '69';
      if (t === '5' && quality === 'maj' && !majFlag) number = '5';
      else if (t === '5') throw new ChordParseError('"5" 위치를 이해하지 못했어요.');
      else if (t === '4') mods.push('sus4');
      else if (t === '2') mods.push('sus2');
      else number = t;
    }
    if (majFlag && quality === 'min' && !number) number = '7';

    // 3) 변형 (sus, add, ♭5, ♯9 ...)
    var modRe = /^(sus4|sus2|sus|add9|add2|add11|add4|add13|add6|no3|no5|omit3|omit5|alt|maj7|maj9|maj11|maj13|M7|M9|M13|b5|-5|#5|\+5|b9|-9|#9|\+9|#11|\+11|b13|-13|b6|9|11|13|aug|\+)/;
    while (i < s.length) {
      var m = eat(modRe);
      if (!m) throw new ChordParseError('"' + s.slice(i) + '" 부분을 이해하지 못했어요.');
      var tok = m[1];
      if (/^(maj|M)(7|9|11|13)$/.test(tok)) { majFlag = true; number = tok.replace(/^(maj|M)/, ''); continue; }
      if (tok === 'aug' || tok === '+') { mods.push('#5'); continue; }
      mods.push(tok);
    }

    // 4) 구성음 만들기
    var tones;
    if (number === '5') {
      tones = ['R', '5'];
    } else {
      tones = quality === 'min' ? ['R', 'b3', '5'] : quality === 'dim' ? ['R', 'b3', 'b5'] : quality === 'aug' ? ['R', '3', '#5'] : ['R', '3', '5'];
    }
    var seventh = majFlag ? '7' : quality === 'dim' ? 'bb7' : 'b7';
    var optional = {};

    function add(l) { if (tones.indexOf(l) < 0) tones.push(l); }
    function remove(l) { var k = tones.indexOf(l); if (k >= 0) tones.splice(k, 1); }

    if (number === '6') add('6');
    else if (number === '69') { add('6'); add('9'); }
    else if (number === '7') add(seventh);
    else if (number === '9') { add(seventh); add('9'); }
    else if (number === '11') { add(seventh); add('9'); add('11'); }
    else if (number === '13') { add(seventh); add('9'); if (quality === 'min') add('11'); add('13'); }

    var hasMod = function (x) { return mods.indexOf(x) >= 0; };
    mods.forEach(function (tok) {
      switch (tok) {
        case 'sus4': case 'sus': remove('3'); remove('b3'); add('4'); break;
        case 'sus2': remove('3'); remove('b3'); add('2'); break;
        case 'add9': add('9'); break;
        case 'add2': add('2'); break;
        case 'add11': add('11'); break;
        case 'add4': add('4'); break;
        case 'add13': add('13'); break;
        case 'add6': add('6'); break;
        case 'no3': case 'omit3': remove('3'); remove('b3'); break;
        case 'no5': case 'omit5': remove('5'); break;
        case 'b5': case '-5': remove('5'); remove('#5'); add('b5'); break;
        case '#5': case '+5': remove('5'); remove('b5'); add('#5'); break;
        case 'b9': case '-9': remove('9'); add('b9'); break;
        case '#9': case '+9': remove('9'); add('#9'); break;
        case '#11': case '+11': remove('11'); add('#11'); break;
        case 'b13': case '-13': case 'b6': remove('13'); add('b13'); break;
        case '9': if (!hasMod('b9') && !hasMod('#9')) add('9'); break;
        case '11': add('11'); break;
        case '13': add('13'); break;
        case 'alt':
          if (tones.indexOf('b7') < 0 && tones.indexOf('7') < 0) add('b7');
          ['5', '9', '11', '13'].forEach(remove);
          ['b9', '#9', '#11', 'b13'].forEach(add);
          optional['b9'] = true; optional['#11'] = true;
          break;
      }
    });

    // 변화된 9/11/13이 있으면 같은 번호의 자연 텐션은 제거
    if ((tones.indexOf('b9') >= 0 || tones.indexOf('#9') >= 0) && mods.indexOf('9') < 0) remove('9');
    if (tones.indexOf('#11') >= 0) remove('11');
    if (tones.indexOf('b13') >= 0) remove('13');

    // 생략해도 되는 음 (운지 생성 시 꼭 필요하지 않은 음)
    if (tones.length > 3 && tones.indexOf('5') >= 0) optional['5'] = true;
    if (number === '13') { optional['9'] = true; optional['11'] = true; }
    if (number === '11') {
      optional['9'] = true;
      if (tones.indexOf('3') >= 0 && tones.indexOf('11') >= 0) optional['3'] = true;
    }
    if (tones.length >= 6) {
      // 음이 너무 많으면 9도도 생략 가능
      if (tones.indexOf('9') >= 0) optional['9'] = true;
    }

    tones.sort(function (a, b) { return degreeOrder(a) - degreeOrder(b); });
    return { tones: tones, optional: optional, quality: quality };
  }

  function makeChord(root, built, bass, suffix) {
    var notes = built.tones.map(function (label) {
      var sp = spellNote(root, label);
      return {
        label: label,
        semi: DEGREES[label].semi,
        ko: DEGREES[label].ko,
        role: roleOf(label, built.tones),
        name: sp.name,
        pretty: sp.pretty,
        pc: sp.pc,
        optional: !!built.optional[label]
      };
    });

    var bassInfo = null;
    if (bass) {
      var existing = notes.filter(function (n) { return n.pc === bass.pc; })[0];
      if (existing) {
        bassInfo = { pc: bass.pc, name: bass.text, label: existing.label, inChord: true };
      } else {
        var lbl = SEMI_TO_LABEL[mod(bass.pc - root.pc, 12)];
        bassInfo = { pc: bass.pc, name: bass.text, label: lbl, inChord: false, ko: DEGREES[lbl].ko };
      }
    }

    var symbol = root.text + suffix + (bass ? '/' + bass.text : '');
    var sig = built.tones.join(',');
    var type = TYPE_BY_SIG[sig] || null;

    return {
      symbol: symbol,
      pretty: prettyName(root.text) + prettySuffix(suffix) + (bass ? '/' + prettyName(bass.text) : ''),
      root: { name: root.text, pc: root.pc, letter: root.letter, alter: root.alter },
      suffix: suffix,
      notes: notes,
      bass: bassInfo,
      type: type,
      quality: built.quality
    };
  }

  function prettySuffix(s) {
    return s.replace(/#/g, '♯').replace(/b(?=\d)/g, '♭');
  }

  function roleOf(label, tones) {
    var r = DEGREES[label].role;
    if (label === '6' && tones.indexOf('b7') < 0 && tones.indexOf('7') < 0) return 'seventh'; // 6화음에서 6도는 7도 역할
    if (label === '6') return 'tension';
    return r;
  }

  // 대표 코드 종류의 구성음 서명 → 이름 (예: "R,3,5,7" → 메이저 세븐스)
  var TYPE_BY_SIG = {};
  CHORD_TYPES.forEach(function (t) {
    var b = buildFromSuffix(t.sym);
    var sig = b.tones.join(',');
    if (!TYPE_BY_SIG[sig]) TYPE_BY_SIG[sig] = t;
  });

  /**
   * 코드 구성음이 어떻게 쌓였는지 설명
   */
  function explainStack(chord) {
    var notes = chord.notes.slice().sort(function (a, b) { return degreeOrder(a.label) - degreeOrder(b.label); });
    var steps = [];
    for (var k = 1; k < notes.length; k++) {
      var gap = notes[k].semi - notes[k - 1].semi;
      steps.push({ from: notes[k - 1], to: notes[k], semis: gap, name: GAP_NAMES[gap] || (gap + '반음') });
    }

    var labels = chord.notes.map(function (n) { return n.label; });
    var has = function (l) { return labels.indexOf(l) >= 0; };
    var parts = [];

    // 기본 3화음
    var third = has('3') ? '3' : has('b3') ? 'b3' : null;
    var fifth = has('5') ? '5' : has('b5') ? 'b5' : has('#5') ? '#5' : null;
    var triadName = null;
    if (third === '3' && fifth === '5') triadName = '메이저(장3화음): 근음 위에 장3도 + 단3도';
    else if (third === 'b3' && fifth === '5') triadName = '마이너(단3화음): 근음 위에 단3도 + 장3도';
    else if (third === 'b3' && fifth === 'b5') triadName = '디미니시(감3화음): 근음 위에 단3도 + 단3도';
    else if (third === '3' && fifth === '#5') triadName = '오그먼트(증3화음): 근음 위에 장3도 + 장3도';
    else if (third === '3' && fifth === 'b5') triadName = '메이저 3도 + 감5도 (♭5)';
    else if (!third && has('4')) triadName = '서스4: 3도 대신 완전4도 (3도가 없어 장/단이 정해지지 않음)';
    else if (!third && has('2')) triadName = '서스2: 3도 대신 장2도 (3도가 없어 장/단이 정해지지 않음)';
    else if (!third && fifth === '5' && labels.length === 2) triadName = '파워 코드: 근음 + 완전5도만 (3도 없음)';
    else if (third && !fifth) triadName = (third === '3' ? '장3도' : '단3도') + ' (5도 생략)';
    if (triadName) parts.push({ title: '기본 화음', text: triadName });

    if (has('4') && third) parts.push({ title: '추가음', text: '완전4도(sus4 성격)를 더함' });

    var sev = has('7') ? '7' : has('b7') ? 'b7' : has('bb7') ? 'bb7' : null;
    if (sev) {
      var sevText = {
        '7': '장7도 (근음보다 반음 아래 음) → "maj7" 성격',
        'b7': '단7도 (근음보다 온음 아래 음) → 도미넌트/마이너7 성격',
        'bb7': '감7도 (장6도와 같은 소리) → 디미니시7 성격'
      }[sev];
      parts.push({ title: '7음', text: sevText });
    } else if (has('6')) {
      parts.push({ title: '6음', text: '7도 대신 장6도를 더함' });
    }

    var tens = chord.notes.filter(function (n) { return n.semi > 12 || n.label === '2' && third; });
    if (tens.length) {
      parts.push({
        title: sev ? '텐션 (확장음)' : '추가음 (add)',
        text: tens.map(function (n) {
          return n.label + ' = ' + n.ko + ' (' + n.pretty + ')' + (n.semi > 12 ? ' = 한 옥타브 위의 ' + simpleName(n.semi - 12) : '');
        }).join(' · ')
      });
    }

    if (chord.bass) {
      parts.push({
        title: '베이스음',
        text: chord.bass.inChord
          ? '가장 낮은 음을 ' + prettyName(chord.bass.name) + '(' + chord.bass.label + ')로 연주 → 자리바꿈(전위) 코드'
          : '코드에 없는 ' + prettyName(chord.bass.name) + '(' + chord.bass.ko + ')를 베이스로 추가'
      });
    }

    return { stack: notes, steps: steps, parts: parts };
  }

  function simpleName(semi) {
    var names = { 1: '단2도', 2: '장2도', 3: '증2도', 5: '완전4도', 6: '증4도', 8: '단6도', 9: '장6도' };
    return names[semi] || '';
  }

  /**
   * 운지(보이싱) 생성
   * @param chord parseChord 결과의 chord
   * @param opts { maxFret, span, limit, tuning }
   */
  function generateVoicings(chord, opts) {
    opts = opts || {};
    var tuning = opts.tuning || STANDARD_TUNING;
    var maxFret = opts.maxFret || 15;
    var span = opts.span || 3;
    var limit = opts.limit || 14;

    var pcLabel = {};
    chord.notes.forEach(function (n) { pcLabel[n.pc] = n.label; });
    var bassPc = chord.bass ? chord.bass.pc : chord.root.pc;
    var bassLabel = chord.bass ? chord.bass.label : 'R';
    if (chord.bass && !chord.bass.inChord) pcLabel[chord.bass.pc] = chord.bass.label;

    var required = chord.notes.filter(function (n) { return !n.optional; }).map(function (n) { return n.pc; });
    var optionalPcs = chord.notes.filter(function (n) { return n.optional; }).map(function (n) { return n.pc; });
    var minStrings = Math.max(chord.notes.length <= 2 ? 2 : 3, Math.min(required.length, 6));

    var found = {};
    var nStr = tuning.length;

    // 1) 기타리스트들이 실제로 많이 쓰는 표준 모양을 먼저 등록 (추천 우선)
    if (tuning === STANDARD_TUNING) {
      standardShapes(chord).forEach(function (fr) { evaluate(fr, true); });
    }

    for (var lo = 1; lo <= maxFret - span; lo++) {
      var hi = lo + span;
      var cands = [];
      for (var s = 0; s < nStr; s++) {
        var opt = [-1];
        if (pcLabel.hasOwnProperty(mod(tuning[s], 12)) && lo <= 5) opt.push(0);
        for (var f = lo; f <= hi; f++) {
          if (pcLabel.hasOwnProperty(mod(tuning[s] + f, 12))) opt.push(f);
        }
        cands.push(opt);
      }
      dfs(0, []);
    }

    function dfs(s, frets) {
      if (s === nStr) { evaluate(frets.slice()); return; }
      var opt = cands[s];
      for (var k = 0; k < opt.length; k++) {
        frets.push(opt[k]);
        dfs(s + 1, frets);
        frets.pop();
      }
    }

    function evaluate(frets, std) {
      var key = frets.join(',');
      if (found[key]) return;
      var sounding = [];
      for (var s = 0; s < nStr; s++) if (frets[s] >= 0) sounding.push(s);
      if (sounding.length < minStrings) return;
      var first = sounding[0], last = sounding[sounding.length - 1];
      if (first > 2) return; // 베이스는 6·5·4번줄
      if (mod(tuning[first] + frets[first], 12) !== bassPc) return;

      var interiorMutes = 0;
      for (var s2 = first; s2 <= last; s2++) if (frets[s2] < 0) interiorMutes++;
      if (interiorMutes > 1) return;

      var pcs = {};
      sounding.forEach(function (st) { pcs[mod(tuning[st] + frets[st], 12)] = (pcs[mod(tuning[st] + frets[st], 12)] || 0) + 1; });
      for (var r = 0; r < required.length; r++) if (!pcs[required[r]]) return;

      var fretted = sounding.filter(function (st) { return frets[st] > 0; });
      var minF = 99, maxF = 0;
      fretted.forEach(function (st) { minF = Math.min(minF, frets[st]); maxF = Math.max(maxF, frets[st]); });
      if (fretted.length && maxF - minF > span) return;
      var hasOpen = sounding.some(function (st) { return frets[st] === 0; });
      if (hasOpen && maxF > 5) return; // 개방현은 낮은 자리에서만

      // 손가락 수 / 바레 확인
      var barre = null;
      var fingers = fretted.length;
      if (fretted.length > 4) {
        var atMin = fretted.filter(function (st) { return frets[st] === minF; });
        if (atMin.length < 2) return;
        var bStart = atMin[0];
        for (var s3 = bStart; s3 <= last; s3++) {
          if (frets[s3] === 0) return; // 바레 아래에 개방현은 불가능
        }
        fingers = 1 + fretted.filter(function (st) { return frets[st] !== minF; }).length;
        if (fingers > 4) return;
        barre = { fret: minF, from: bStart, to: last };
      } else if (fretted.length >= 2) {
        // 4손가락 이하라도 같은 프렛 여러 줄이 이어지면 바레 표시 (보기 좋게)
        var atMin2 = fretted.filter(function (st) { return frets[st] === minF; });
        if (atMin2.length >= 3 && minF > 0) {
          var ok = true;
          for (var s4 = atMin2[0]; s4 <= atMin2[atMin2.length - 1]; s4++) if (frets[s4] === 0) ok = false;
          if (ok) barre = { fret: minF, from: atMin2[0], to: atMin2[atMin2.length - 1] };
        }
      }

      // 점수
      var score = sounding.length * 2.2;
      score -= interiorMutes * 3.5;
      optionalPcs.forEach(function (pc) { if (pcs[pc]) score += 1; });
      var opens = sounding.filter(function (st) { return frets[st] === 0; }).length;
      score += opens * 0.6;
      score -= (fretted.length ? minF : 0) * 0.12;
      score -= Math.max(0, maxF - minF - 2) * 0.8;
      // 3도/7도가 너무 겹치면 감점, 근음이 맨 위인 것은 약간 감점
      Object.keys(pcs).forEach(function (pc) { if (+pc !== chord.root.pc && pcs[pc] > 2) score -= (pcs[pc] - 2) * 0.6; });
      // 높은 줄 몇 개를 막고 위쪽 개방현이 섞인 높은 포지션은 감점 (손이 멀어짐)
      if (opens && fretted.length && minF > 4) score -= 3;
      if (fingers === 4 && !barre) score -= 0.8;

      // 추천 점수: "잡기 쉬운가" 위주 (개방현·낮은 자리·적은 손가락·작은 벌림)
      var rec = Math.min(sounding.length, 6) * 0.9;
      rec += opens * 0.5;
      if (barre) rec -= (barre.to - barre.from >= 4 ? 2.2 : 1.6);
      rec -= fingers * 0.55;
      if (fretted.length) rec -= Math.max(0, maxF - minF - 1) * 1.3;
      rec -= (fretted.length ? minF : 0) * 0.4;
      rec -= interiorMutes * 2.5;
      if (opens && fretted.length && minF > 3) rec -= 2;
      // 손가락 4개 + 바레 (바레 위로 3손가락) 은 어려움
      if (barre && fingers >= 4 && maxF - minF >= 2) rec -= 0.6;

      var notesOut = frets.map(function (f, st) {
        if (f < 0) return null;
        var pc = mod(tuning[st] + f, 12);
        return { string: st, fret: f, label: pcLabel[pc], pc: pc, name: noteNameForPc(chord, pc), midi: tuning[st] + f };
      });

      found[key] = {
        frets: frets,
        notes: notesOut,
        barre: barre,
        score: score,
        rec: rec,
        minFret: fretted.length ? minF : 0,
        maxFret: maxF,
        baseFret: (maxF <= 4) ? 1 : minF,
        key: key,
        std: !!std
      };
      if (std) {
        // 표준 모양: 개방 코드 > 낮은 자리 바레 코드 순으로 추천
        found[key].rec = 20 - (fretted.length ? minF : 0) * 0.5 - (barre ? 1.5 : 0) + (opens ? 1 : 0);
        found[key].score += 4;
      }
    }

    var all = Object.keys(found).map(function (k) { return found[k]; });
    all.sort(function (a, b) { return b.score - a.score; });

    // 자리(포지션)별로 고르게 고르기
    var picked = all.filter(function (v) { return v.std; }).slice(0, 6);
    var perPos = {};
    picked.forEach(function (v) { var b = v.minFret <= 0 ? 0 : v.minFret; perPos[b] = (perPos[b] || 0) + 1; });
    for (var a = 0; a < all.length && picked.length < limit; a++) {
      var v = all[a];
      if (v.std) continue;
      var bucket = v.minFret <= 0 ? 0 : v.minFret;
      var cnt = perPos[bucket] || 0;
      if (cnt >= 2) continue;
      // 이미 고른 것과 거의 같은 모양(한 줄만 다른 것)은 건너뜀
      var similar = picked.some(function (p) { return diffCount(p.frets, v.frets) <= 1 && Math.abs(p.minFret - v.minFret) <= 2; });
      if (similar) continue;
      perPos[bucket] = cnt + 1;
      picked.push(v);
    }
    picked.sort(function (a, b) { return (a.minFret - b.minFret) || (b.score - a.score); });
    return picked;
  }

  // ── 표준 운지 모양 ──
  // 개방 코드 (근음 + 코드 종류 → 운지). x = 치지 않음
  var OPEN_SHAPES = {
    'C': ['x32010'], 'A': ['x02220'], 'G': ['320003', '320033'], 'E': ['022100'], 'D': ['xx0232'],
    'Am': ['x02210'], 'Em': ['022000'], 'Dm': ['xx0231'],
    'C7': ['x32310'], 'A7': ['x02020'], 'G7': ['320001'], 'E7': ['020100'], 'D7': ['xx0212'], 'B7': ['x21202'],
    'Am7': ['x02010'], 'Em7': ['022030', '020000'], 'Dm7': ['xx0211'],
    'Cmaj7': ['x32000'], 'Fmaj7': ['xx3210'], 'Amaj7': ['x02120'], 'Dmaj7': ['xx0222'], 'Emaj7': ['021100'], 'Gmaj7': ['320002'],
    'Asus4': ['x02230'], 'Dsus4': ['xx0233'], 'Esus4': ['022200'], 'Asus2': ['x02200'], 'Dsus2': ['xx0230'],
    'Cadd9': ['x32030'], 'Gadd9': ['300203'], 'E5': ['022xxx'], 'A5': ['x022xx'], 'D5': ['xx023x'],
    'A6': ['x02222'], 'C6': ['x32210'], 'D6': ['xx0202'], 'E6': ['022120'], 'G6': ['320000'],
    'Am6': ['x02212'], 'Em6': ['022020'], 'Dm6': ['xx0201'],
    'Bm7b5': ['x2323x'], 'E9': ['020102'], 'A7sus4': ['x02030'], 'D7sus4': ['xx0213'], 'E7sus4': ['020200'],
    'Asus2sus4': []
  };
  // 옮겨 쓰는 모양: E폼(6번줄 근음), A폼(5번줄 근음). 숫자는 근음 프렛 기준 상대값, null = 치지 않음
  var MOVABLE_SHAPES = {
    '':      [[0, 2, 2, 1, 0, 0], [null, 0, 2, 2, 2, 0]],
    'm':     [[0, 2, 2, 0, 0, 0], [null, 0, 2, 2, 1, 0]],
    '7':     [[0, 2, 0, 1, 0, 0], [null, 0, 2, 0, 2, 0]],
    'm7':    [[0, 2, 0, 0, 0, 0], [null, 0, 2, 0, 1, 0]],
    'maj7':  [[0, null, 1, 1, 0, null], [null, 0, 2, 1, 2, 0]],
    'mMaj7': [[0, null, 1, 0, 0, null], [null, 0, 2, 1, 1, 0]],
    'm7b5':  [[0, null, 0, 0, -1, null], [null, 0, 1, 0, 1, null]],
    'dim7':  [[0, null, -1, 0, -1, null], [null, 0, 1, -1, 1, null]],
    'dim':   [[null, 0, 1, 2, 1, null]],
    'aug':   [[0, null, 2, 1, 1, null], [null, 0, -1, -2, -2, null]],
    'sus4':  [[0, 2, 2, 2, 0, 0], [null, 0, 2, 2, 3, 0]],
    'sus2':  [[null, 0, 2, 2, 0, 0]],
    '7sus4': [[0, 2, 0, 2, 0, 0], [null, 0, 2, 0, 3, 0]],
    '5':     [[0, 2, 2, null, null, null], [null, 0, 2, 2, null, null]],
    '6':     [[0, null, -1, -1, 0, null], [null, 0, 2, 2, 2, 2]],
    'm6':    [[0, null, -1, 0, 0, null], [null, 0, 2, -1, 1, null]],
    '9':     [[null, 0, -1, 0, 0, null]],
    'm9':    [[null, 0, -2, 0, 0, null]],
    'maj9':  [[null, 0, -1, 1, 0, null]],
    '7b9':   [[null, 0, -1, 0, -1, null]],
    '7#9':   [[null, 0, -1, 0, 1, null]],
    '13':    [[0, null, 0, 1, 2, null], [null, 0, null, 0, 2, 2]],
    'add9':  [[null, 0, -1, -3, 0, null]]
  };

  function shapeFrets(arr, rootFret) {
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      if (arr[i] === null) { out.push(-1); continue; }
      var f = arr[i] + rootFret;
      if (f < 0) return null;
      out.push(f);
    }
    return out;
  }

  function standardShapes(chord) {
    if (chord.bass && chord.bass.pc !== chord.root.pc) return [];
    var sig = chord.notes.map(function (n) { return n.label; }).join(',');
    var t = TYPE_BY_SIG[sig];
    if (!t) return [];
    var res = [];
    // 개방 코드: 같은 높이의 음이름이면 철자 상관없이 (예: A# = Bb)
    Object.keys(OPEN_SHAPES).forEach(function (name) {
      var r = parseChord(name);
      if (!r.ok || r.chord.root.pc !== chord.root.pc) return;
      if (r.chord.notes.map(function (n) { return n.label; }).join(',') !== sig) return;
      OPEN_SHAPES[name].forEach(function (str) {
        res.push(str.split('').map(function (c) { return c === 'x' ? -1 : +c; }));
      });
    });
    var mv = MOVABLE_SHAPES[t.sym];
    if (mv) {
      mv.forEach(function (shape) {
        var rootString = shape[0] !== null ? 0 : 1;
        var base = mod(chord.root.pc - mod(STANDARD_TUNING[rootString], 12), 12);
        [base, base + 12].forEach(function (rf) {
          if (rf < 1 || rf > 12) return; // 0프렛은 개방 코드 목록에서 처리
          var fr = shapeFrets(shape, rf);
          if (fr) res.push(fr);
        });
      });
    }
    return res;
  }

  function diffCount(a, b) {
    var d = 0;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
    return d;
  }

  function noteNameForPc(chord, pc) {
    for (var i = 0; i < chord.notes.length; i++) if (chord.notes[i].pc === pc) return chord.notes[i].pretty;
    if (chord.bass && chord.bass.pc === pc) return prettyName(chord.bass.name);
    return '';
  }

  /** 다이아토닉 코드 (메이저 키) */
  function diatonicChords(keyName, minor) {
    var key = parseNote(normalizeAccidentals(keyName));
    if (!key) return [];
    var majorSteps = [0, 2, 4, 5, 7, 9, 11];
    var minorSteps = [0, 2, 3, 5, 7, 8, 10];
    var steps = minor ? minorSteps : majorSteps;
    var labels = minor ? ['R', '2', 'b3', '4', '5', 'b6', 'b7'] : ['R', '2', '3', '4', '5', '6', '7'];
    var scale = labels.map(function (l) { return spellNote(key, l); });
    var romanBase = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
    var out = [];
    for (var d = 0; d < 7; d++) {
      var r = scale[d], t = scale[(d + 2) % 7], f = scale[(d + 4) % 7], s7 = scale[(d + 6) % 7];
      var third = mod(t.pc - r.pc, 12), fifth = mod(f.pc - r.pc, 12), sev = mod(s7.pc - r.pc, 12);
      var triad = third === 4 && fifth === 7 ? '' : third === 3 && fifth === 7 ? 'm' : third === 3 && fifth === 6 ? 'dim' : 'aug';
      var seventh;
      if (triad === '') seventh = sev === 11 ? 'maj7' : '7';
      else if (triad === 'm') seventh = sev === 10 ? 'm7' : 'mMaj7';
      else if (triad === 'dim') seventh = sev === 10 ? 'm7b5' : 'dim7';
      else seventh = 'maj7#5';
      var roman = romanBase[d];
      if (triad === 'm' || triad === 'dim') roman = roman.toLowerCase();
      if (triad === 'dim') roman += '°';
      if (minor && [2, 5, 6].indexOf(d) >= 0) roman = '♭' + roman;
      out.push({ degree: d + 1, roman: roman, root: r.name, triad: r.name + triad, seventh: r.name + seventh });
    }
    return out;
  }

  var api = {
    DEGREES: DEGREES,
    CHORD_TYPES: CHORD_TYPES,
    STANDARD_TUNING: STANDARD_TUNING,
    STRING_NAMES: STRING_NAMES,
    GAP_NAMES: GAP_NAMES,
    parseChord: parseChord,
    parseNote: parseNote,
    spellNote: spellNote,
    explainStack: explainStack,
    generateVoicings: generateVoicings,
    diatonicChords: diatonicChords,
    prettyName: prettyName,
    mod: mod
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.ChordEngine = api;
})(this);
