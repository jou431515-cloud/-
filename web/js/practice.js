/* 연습: 코드 퀴즈 + 청음 연습 */
(function (global) {
  'use strict';
  var E = global.ChordEngine, D = global.Diagram;

  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function prettySym(sym) { return sym.replace(/#/g, '♯').replace(/b(?=\d)/g, '♭').replace(/^([A-G])b/, '$1♭'); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function typeKo(sym) {
    for (var i = 0; i < E.CHORD_TYPES.length; i++) if (E.CHORD_TYPES[i].sym === sym) return E.CHORD_TYPES[i].ko;
    return sym;
  }

  // ───────── 난이도별 문제 범위 ─────────
  var EASY_ROOTS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  var ALL_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  var LEVELS = [
    { id: 1, name: '기초', desc: '메이저 · 마이너', types: ['', 'm'], roots: EASY_ROOTS },
    { id: 2, name: '중급', desc: '+ 7 · maj7 · m7 · sus4', types: ['', 'm', '7', 'maj7', 'm7', 'sus4'], roots: EASY_ROOTS },
    { id: 3, name: '고급', desc: '+ dim · aug · sus2 · 6 · add9 · m7♭5 · dim7 · 9', types: ['', 'm', '7', 'maj7', 'm7', 'sus4', 'sus2', 'dim', 'aug', '6', 'm6', 'add9', 'm7b5', 'dim7', '9', '7sus4', 'mMaj7'], roots: ALL_ROOTS }
  ];

  // 청음: 코드 종류 (짧은 이름)
  var EAR_TYPE_NAMES = {
    '': '메이저', 'm': '마이너', '7': '7 (도미넌트)', 'maj7': 'maj7', 'm7': 'm7', 'sus4': 'sus4', 'sus2': 'sus2',
    'dim': 'dim', 'aug': 'aug', '6': '6', 'm6': 'm6', 'add9': 'add9', 'm7b5': 'm7♭5', 'dim7': 'dim7', '9': '9', '7sus4': '7sus4', 'mMaj7': 'mMaj7'
  };
  var EAR_LEVELS = [
    { id: 1, name: '기초', desc: '메이저 · 마이너', types: ['', 'm'] },
    { id: 2, name: '중급', desc: '+ 7 · maj7 · m7', types: ['', 'm', '7', 'maj7', 'm7'] },
    { id: 3, name: '고급', desc: '+ dim · aug · sus4 · sus2', types: ['', 'm', '7', 'maj7', 'm7', 'dim', 'aug', 'sus4', 'sus2'] }
  ];

  // 청음: 음정
  var INTERVALS = [
    { semi: 1, name: '단2도', hint: '반음 1개. 죠스 테마처럼 긴장된 소리.' },
    { semi: 2, name: '장2도', hint: '반음 2개 = 온음. "도-레".' },
    { semi: 3, name: '단3도', hint: '반음 3개. 마이너 코드의 어두운 색.' },
    { semi: 4, name: '장3도', hint: '반음 4개. 메이저 코드의 밝은 색.' },
    { semi: 5, name: '완전4도', hint: '반음 5개. "도-파".' },
    { semi: 6, name: '증4도', hint: '반음 6개. 가장 불안한 소리 (트라이톤).' },
    { semi: 7, name: '완전5도', hint: '반음 7개. 파워 코드 소리. 꽉 차고 안정적.' },
    { semi: 8, name: '단6도', hint: '반음 8개.' },
    { semi: 9, name: '장6도', hint: '반음 9개. "도-라".' },
    { semi: 10, name: '단7도', hint: '반음 10개. 7 코드의 7도.' },
    { semi: 11, name: '장7도', hint: '반음 11개. maj7 코드의 7도. 옥타브 직전.' },
    { semi: 12, name: '옥타브', hint: '반음 12개. 같은 음이 한 단계 위에.' }
  ];
  var INT_LEVELS = [
    { id: 1, name: '기초', desc: '단3 · 장3 · 완전5 · 옥타브', semis: [3, 4, 7, 12] },
    { id: 2, name: '중급', desc: '+ 장2 · 완전4 · 장6 · 단7', semis: [2, 3, 4, 5, 7, 9, 10, 12] },
    { id: 3, name: '고급', desc: '반음 1~12개 전부', semis: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }
  ];
  function intervalBySemi(s) { for (var i = 0; i < INTERVALS.length; i++) if (INTERVALS[i].semi === s) return INTERVALS[i]; }

  // ───────── 상태 ─────────
  var st = {
    quizLevel: store('quizLevel') || 1,
    earKind: store('earKind') || 'chord',
    earLevel: store('earLevel') || 1,
    intLevel: store('intLevel') || 1,
    score: { quiz: [0, 0, 0], ear: [0, 0, 0] }, // 맞힘, 전체, 연속
    q: null
  };
  function best(kind, v) {
    var k = 'best_' + kind;
    if (v === undefined) return store(k) || 0;
    if (v > (store(k) || 0)) store(k, v);
  }

  // ───────── 공통 ─────────
  function bestVoicing(chord) {
    var vs = E.generateVoicings(chord);
    if (!vs.length) return null;
    var b = vs[0];
    vs.forEach(function (v) { if (v.rec > b.rec) b = v; });
    return b;
  }
  function pcSet(notes) {
    var s = {};
    notes.forEach(function (n) { s[n.pc] = true; });
    return s;
  }
  function soundedPcs(v) {
    var s = {};
    v.notes.forEach(function (n) { if (n) s[E.mod(n.midi, 12)] = true; });
    return s;
  }
  function keys(o) { return Object.keys(o).map(Number).sort(function (a, b) { return a - b; }); }
  function sameSet(a, b) { return keys(a).join() === keys(b).join(); }
  // 이 운지 소리로 그 코드라고 볼 수도 있는지 (정답이 둘이 되는 보기 막기)
  function couldBe(chord, sounded) {
    var all = pcSet(chord.notes);
    var req = pcSet(chord.notes.filter(function (n) { return !n.optional; }));
    var ok = true;
    keys(req).forEach(function (p) { if (!sounded[p]) ok = false; });
    keys(sounded).forEach(function (p) { if (!all[p]) ok = false; });
    return ok;
  }
  function playVoicing(v, arp) {
    global.GuitarAudio.strum(v.notes.filter(Boolean).map(function (n) { return n.midi; }), !!arp);
  }
  function levelSeg(levels, cur, attr) {
    return '<div class="lv-seg">' + levels.map(function (l) {
      return '<button class="lv' + (l.id === cur ? ' on' : '') + '" data-' + attr + '="' + l.id + '"><b>' + l.name + '</b><small>' + esc(l.desc) + '</small></button>';
    }).join('') + '</div>';
  }
  function scoreBar(kind) {
    var s = st.score[kind];
    return '<div class="scorebar"><span>맞힘 <b>' + s[0] + '</b> / ' + s[1] + '</span><span>연속 <b>' + s[2] + '</b></span><span>최고 연속 <b>' + best(kind) + '</b></span></div>';
  }
  function record(kind, ok) {
    var s = st.score[kind];
    s[1]++;
    if (ok) { s[0]++; s[2]++; best(kind, s[2]); } else s[2] = 0;
  }

  // ───────── 코드 퀴즈 ─────────
  function makeQuiz() {
    var lv = LEVELS[st.quizLevel - 1];
    for (var tries = 0; tries < 30; tries++) {
      var root = pick(lv.roots), ty = pick(lv.types);
      var res = E.parseChord(root + ty);
      if (!res.ok) continue;
      var chord = res.chord;
      var v = bestVoicing(chord);
      if (!v) continue;
      var kind = pick(['name', 'name', 'degree', 'notes']);
      if (kind === 'name') {
        var sounded = soundedPcs(v);
        var cands = [];
        lv.types.forEach(function (t) {
          [root, pick(lv.roots)].forEach(function (r) {
            var sym = r + t;
            if (sym === chord.symbol || cands.indexOf(sym) >= 0) return;
            var c = E.parseChord(sym);
            if (c.ok && !couldBe(c.chord, sounded)) cands.push(sym);
          });
        });
        // 근음이 같은 보기를 먼저 섞어서 넣으면 더 헷갈리고 공부가 됨
        var same = shuffle(cands.filter(function (s) { return E.parseChord(s).chord.root === chord.root; }));
        var other = shuffle(cands.filter(function (s) { return same.indexOf(s) < 0; }));
        var wrong = same.slice(0, 2).concat(other).slice(0, 3);
        if (wrong.length < 3) wrong = same.concat(other).slice(0, 3);
        if (wrong.length < 1) continue;
        return { kind: 'name', chord: chord, v: v, answer: chord.symbol, choices: shuffle([chord.symbol].concat(wrong)) };
      }
      if (kind === 'degree') {
        var strs = [];
        v.notes.forEach(function (n, i) { if (n) strs.push(i); });
        var mark = pick(strs);
        var label = v.notes[mark].label;
        var labels = [];
        chord.notes.forEach(function (n) { if (labels.indexOf(n.label) < 0) labels.push(n.label); });
        ['R', 'b3', '3', '5', 'b7', '7', '4', '6'].forEach(function (l) { if (labels.length < 4 && labels.indexOf(l) < 0) labels.push(l); });
        var others = shuffle(labels.filter(function (l) { return l !== label; })).slice(0, 3);
        return { kind: 'degree', chord: chord, v: v, mark: mark, answer: label, choices: shuffle([label].concat(others)) };
      }
      // 구성음
      var fmt = function (c) { return c.notes.map(function (n) { return n.pretty; }).join(' – '); };
      var ans = fmt(chord);
      var wrongs = [];
      shuffle(lv.types.concat(['', 'm', '7', 'm7', 'maj7', 'sus4', 'dim', 'aug'])).forEach(function (t) {
        var c = E.parseChord(root + t);
        if (!c.ok) return;
        var f = fmt(c.chord);
        if (f !== ans && wrongs.indexOf(f) < 0 && wrongs.length < 3 && !sameSet(pcSet(c.chord.notes), pcSet(chord.notes))) wrongs.push(f);
      });
      if (wrongs.length < 3) continue;
      return { kind: 'notes', chord: chord, v: v, answer: ans, choices: shuffle([ans].concat(wrongs)) };
    }
    return null;
  }

  function renderQuiz(el) {
    if (!st.q || st.q.mode !== 'quiz') { st.q = makeQuiz(); if (st.q) st.q.mode = 'quiz'; }
    var q = st.q;
    var html = [];
    html.push(levelSeg(LEVELS, st.quizLevel, 'qlv'));
    html.push(scoreBar('quiz'));
    html.push('<div class="card quiz">');
    if (!q) {
      html.push('<p>문제를 만들지 못했어요. 다시 시도해 주세요.</p>');
    } else {
      var title, choiceLabel;
      if (q.kind === 'name') {
        title = '이 운지는 무슨 코드일까요?';
        choiceLabel = function (c) { return prettySym(c); };
      } else if (q.kind === 'degree') {
        title = '<b>' + esc(q.chord.pretty) + '</b> 코드에서 <span class="qmark">?</span> 표시된 음은 몇 도일까요?';
        choiceLabel = function (c) { return D.prettyLabel(c) + ' <small>' + esc(E.DEGREES[c].ko.replace(' (완전1도)', '')) + '</small>'; };
      } else {
        title = '<b>' + esc(q.chord.pretty) + '</b> 코드를 이루는 음은?';
        choiceLabel = function (c) { return esc(c); };
      }
      html.push('<h2 class="qtitle">' + title + '</h2>');
      if (q.kind !== 'notes' || q.done) {
        var showMode = q.done ? 'degree' : 'blank';
        html.push('<div class="qdiagram">' + D.chordDiagram(q.chord, q.v, showMode, q.mark) + '</div>');
        html.push('<div class="frets center">' + q.v.frets.map(function (f) { return f < 0 ? 'x' : f; }).join(' ') + '</div>');
      }
      html.push('<div class="choices' + (q.kind === 'notes' ? ' wide' : '') + '">');
      q.choices.forEach(function (c, i) {
        var cls = '';
        if (q.done) { if (c === q.answer) cls = ' right'; else if (c === q.picked) cls = ' wrong'; }
        html.push('<button class="choice' + cls + '" data-i="' + i + '"' + (q.done ? ' disabled' : '') + '>' + choiceLabel(c) + '</button>');
      });
      html.push('</div>');
      html.push('<div class="qtools"><button class="btn ghost small" id="qPlay">▶ 소리 듣기</button></div>');
      if (q.done) html.push(quizFeedback(q));
    }
    html.push('</div>');
    el.innerHTML = html.join('');

    el.querySelectorAll('[data-qlv]').forEach(function (b) {
      b.addEventListener('click', function () {
        st.quizLevel = +b.getAttribute('data-qlv'); store('quizLevel', st.quizLevel);
        st.q = null; renderQuiz(el);
      });
    });
    if (!q) return;
    el.querySelector('#qPlay').addEventListener('click', function () { playVoicing(q.v); });
    el.querySelectorAll('.choice').forEach(function (b) {
      b.addEventListener('click', function () {
        if (q.done) return;
        q.picked = q.choices[+b.getAttribute('data-i')];
        q.done = true;
        record('quiz', q.picked === q.answer);
        renderQuiz(el);
      });
    });
    var next = el.querySelector('#qNext');
    if (next) next.addEventListener('click', function () { st.q = null; renderQuiz(el); window.scrollTo(0, 0); });
  }

  function quizFeedback(q) {
    var ok = q.picked === q.answer;
    var c = q.chord;
    var h = ['<div class="feedback ' + (ok ? 'ok' : 'no') + '">'];
    h.push('<div class="fb-title">' + (ok ? '⭕ 정답!' : '❌ 아쉬워요') + '</div>');
    h.push('<p><b>' + esc(c.pretty) + '</b> (' + esc(c.type ? c.type.ko : '') + ')</p>');
    h.push('<div class="tones">');
    c.notes.forEach(function (n) {
      h.push('<div class="tone role-' + n.role + '"><span class="deg">' + esc(D.prettyLabel(n.label)) + '</span><span class="nm">' + esc(n.pretty) + '</span><span class="ko">' + esc(n.ko.replace(' (완전1도)', '')) + '</span></div>');
    });
    h.push('</div>');
    if (q.kind === 'degree') {
      var n = q.v.notes[q.mark];
      h.push('<p class="small">물음표 줄의 음은 <b>' + esc(n.name) + '</b>, 근음 ' + esc(c.notes[0].pretty) + '에서 <b>' + esc(E.DEGREES[n.label].ko.replace(' (완전1도)', '')) + '</b>(반음 ' + (E.DEGREES[n.label].semi % 12) + '개)예요.</p>');
    }
    if (c.type) h.push('<p class="small muted">' + esc(c.type.desc) + '</p>');
    h.push('<div class="qtools"><a class="btn ghost small" href="' + global.App.chordHash(c.symbol) + '">이 코드 자세히</a><button class="btn" id="qNext">다음 문제 →</button></div>');
    h.push('</div>');
    return h.join('');
  }

  // ───────── 청음 연습 ─────────
  function makeEar() {
    if (st.earKind === 'interval') {
      var lv = INT_LEVELS[st.intLevel - 1];
      var semi = pick(lv.semis);
      var low = 48 + Math.floor(Math.random() * 12); // C3 ~ B3
      return { mode: 'ear', kind: 'interval', semi: semi, low: low, answer: semi, choices: lv.semis.slice() };
    }
    var el = EAR_LEVELS[st.earLevel - 1];
    for (var t = 0; t < 20; t++) {
      var ty = pick(el.types);
      var res = E.parseChord(pick(ALL_ROOTS) + ty);
      if (!res.ok) continue;
      var v = bestVoicing(res.chord);
      if (!v) continue;
      return { mode: 'ear', kind: 'chord', chord: res.chord, v: v, answer: ty, choices: el.types.slice() };
    }
    return null;
  }

  function earPlay(q, how) {
    if (q.kind === 'chord') { playVoicing(q.v, how === 'arp'); return; }
    var pair = [q.low, q.low + q.semi];
    global.GuitarAudio.strum(pair, how !== 'together');
  }

  function renderEar(el, autoplay) {
    if (!st.q || st.q.mode !== 'ear' || st.q.kind !== st.earKind) { st.q = makeEar(); autoplay = autoplay !== false; }
    var q = st.q;
    var html = [];
    html.push('<div class="seg ear-kind"><button data-ek="chord" class="' + (st.earKind === 'chord' ? 'on' : '') + '">코드 종류</button><button data-ek="interval" class="' + (st.earKind === 'interval' ? 'on' : '') + '">음정 (두 음 사이)</button></div>');
    if (st.earKind === 'chord') html.push(levelSeg(EAR_LEVELS, st.earLevel, 'elv'));
    else html.push(levelSeg(INT_LEVELS, st.intLevel, 'ilv'));
    html.push(scoreBar('ear'));
    html.push('<div class="card quiz">');
    if (!q) {
      html.push('<p>문제를 만들지 못했어요. 다시 시도해 주세요.</p>');
    } else {
      html.push('<h2 class="qtitle">' + (q.kind === 'chord' ? '소리를 듣고 코드 종류를 맞혀 보세요' : '두 음 사이의 음정을 맞혀 보세요') + '</h2>');
      html.push('<div class="ear-play">');
      if (q.kind === 'chord') {
        html.push('<button class="btn big" data-play="strum">▶ 소리 듣기</button><button class="btn ghost" data-play="arp">한 음씩 듣기</button>');
      } else {
        html.push('<button class="btn big" data-play="arp">▶ 차례로 듣기</button><button class="btn ghost" data-play="together">동시에 듣기</button>');
      }
      html.push('</div>');
      html.push('<p class="small muted center">' + (q.kind === 'chord' ? '근음은 매번 달라져요. 높이 말고 밝은지 어두운지, 긴장되는지 같은 "색깔"을 들어 보세요.' : '낮은 음이 먼저, 높은 음이 나중에 나와요.') + '</p>');
      html.push('<div class="choices">');
      q.choices.forEach(function (c) {
        var label = q.kind === 'chord' ? EAR_TYPE_NAMES[c] : intervalBySemi(c).name;
        var cls = '';
        if (q.done) { if (c === q.answer) cls = ' right'; else if (c === q.picked) cls = ' wrong'; }
        html.push('<button class="choice' + cls + '" data-c="' + esc(String(c)) + '"' + (q.done ? ' disabled' : '') + '>' + esc(label) + '</button>');
      });
      html.push('</div>');
      if (q.done) html.push(earFeedback(q));
    }
    html.push('</div>');
    el.innerHTML = html.join('');

    el.querySelectorAll('[data-ek]').forEach(function (b) {
      b.addEventListener('click', function () { st.earKind = b.getAttribute('data-ek'); store('earKind', st.earKind); st.q = null; renderEar(el, false); });
    });
    el.querySelectorAll('[data-elv]').forEach(function (b) {
      b.addEventListener('click', function () { st.earLevel = +b.getAttribute('data-elv'); store('earLevel', st.earLevel); st.q = null; renderEar(el, false); });
    });
    el.querySelectorAll('[data-ilv]').forEach(function (b) {
      b.addEventListener('click', function () { st.intLevel = +b.getAttribute('data-ilv'); store('intLevel', st.intLevel); st.q = null; renderEar(el, false); });
    });
    if (!q) return;
    el.querySelectorAll('[data-play]').forEach(function (b) {
      b.addEventListener('click', function () { earPlay(q, b.getAttribute('data-play')); });
    });
    el.querySelectorAll('.choice').forEach(function (b) {
      b.addEventListener('click', function () {
        if (q.done) return;
        var raw = b.getAttribute('data-c');
        q.picked = q.kind === 'chord' ? raw : +raw;
        q.done = true;
        record('ear', q.picked === q.answer);
        renderEar(el, false);
      });
    });
    var next = el.querySelector('#eNext');
    if (next) next.addEventListener('click', function () { st.q = null; renderEar(el, true); });
    // 첫 화면 진입 때는 자동 재생 안 함 (브라우저가 막을 수 있음). '다음 문제'를 누르면 바로 들려줌.
    if (autoplay === true && q) earPlay(q, q.kind === 'chord' ? 'strum' : 'arp');
  }

  function earFeedback(q) {
    var ok = q.picked === q.answer;
    var h = ['<div class="feedback ' + (ok ? 'ok' : 'no') + '">'];
    h.push('<div class="fb-title">' + (ok ? '⭕ 정답!' : '❌ 아쉬워요') + '</div>');
    if (q.kind === 'chord') {
      var c = q.chord;
      h.push('<p>방금 들은 코드는 <b>' + esc(c.pretty) + '</b>, ' + esc(typeKo(q.answer)) + '예요.</p>');
      if (c.type) h.push('<p class="small muted">' + esc(c.type.desc) + '</p>');
      h.push('<p class="small">공식: <b class="mono">' + c.notes.map(function (n) { return D.prettyLabel(n.label); }).join(' – ') + '</b></p>');
      if (!ok && q.picked !== undefined) {
        h.push('<div class="qtools"><button class="btn ghost small" id="cmpMine">내가 고른 ' + esc(EAR_TYPE_NAMES[q.picked]) + ' 들어보기</button><button class="btn ghost small" id="cmpAns">정답 다시 듣기</button></div>');
      }
      h.push('<div class="qtools"><a class="btn ghost small" href="' + global.App.chordHash(c.symbol) + '">이 코드 자세히</a><button class="btn" id="eNext">다음 문제 →</button></div>');
    } else {
      var iv = intervalBySemi(q.answer);
      h.push('<p>정답은 <b>' + esc(iv.name) + '</b>예요. ' + esc(iv.hint) + '</p>');
      h.push('<p class="small muted">기타에서는 같은 줄로 ' + q.answer + '프렛 위로 올라간 거리예요.</p>');
      if (!ok && q.picked !== undefined) {
        h.push('<div class="qtools"><button class="btn ghost small" id="cmpMine">내가 고른 ' + esc(intervalBySemi(q.picked).name) + ' 들어보기</button><button class="btn ghost small" id="cmpAns">정답 다시 듣기</button></div>');
      }
      h.push('<div class="qtools"><button class="btn" id="eNext">다음 문제 →</button></div>');
    }
    h.push('</div>');
    // 비교 듣기 버튼은 렌더 후 연결
    setTimeout(function () {
      var mine = document.getElementById('cmpMine'), ans = document.getElementById('cmpAns');
      if (mine) mine.addEventListener('click', function () {
        if (q.kind === 'chord') {
          var r = E.parseChord(q.chord.root + q.picked);
          var v = r.ok && bestVoicing(r.chord);
          if (v) playVoicing(v);
        } else {
          global.GuitarAudio.strum([q.low, q.low + q.picked], true);
        }
      });
      if (ans) ans.addEventListener('click', function () { earPlay(q, q.kind === 'chord' ? 'strum' : 'arp'); });
    }, 0);
    return h.join('');
  }

  // ───────── 연습 탭 ─────────
  function render(view, sub) {
    sub = sub === 'ear' ? 'ear' : 'quiz';
    var html = [];
    html.push('<div class="seg practice-tabs"><a href="#/practice/quiz" class="' + (sub === 'quiz' ? 'on' : '') + '">🎯 코드 퀴즈</a><a href="#/practice/ear" class="' + (sub === 'ear' ? 'on' : '') + '">👂 청음 연습</a></div>');
    html.push('<div id="practiceBody"></div>');
    view.innerHTML = html.join('');
    var body = document.getElementById('practiceBody');
    if (sub === 'quiz') renderQuiz(body); else renderEar(body, false);
  }

  global.Practice = { render: render, _makeQuiz: makeQuiz, _st: st, _LEVELS: LEVELS };
})(this);
