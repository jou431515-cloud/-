/* 화면 구성 / 라우팅 */
(function (global) {
  'use strict';
  var E = global.ChordEngine, D = global.Diagram, T = global.Theory;
  var view = document.getElementById('view');
  var titleEl = document.getElementById('pageTitle');

  var ROOTS = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  var ROOTS_GRID = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

  function store(key, val) {
    try {
      if (val === undefined) return JSON.parse(localStorage.getItem(key));
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) { return null; }
  }

  var state = {
    mode: store('labelMode') || 'degree',
    pickRoot: store('pickRoot') || 'C',
    listRoot: store('listRoot') || 'C'
  };

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function pretty(s) { return E.prettyName(s).replace(/#/g, '♯'); }
  function prettySym(sym) { return sym.replace(/#/g, '♯').replace(/b(?=\d)/g, '♭').replace(/^([A-G])b/, '$1♭'); }

  function go(hash) { location.hash = hash; }
  function chordHash(sym) { return '#/chord/' + encodeURIComponent(sym); }

  function setTab(tab, title) {
    titleEl.textContent = title;
    document.querySelectorAll('.tabbar a').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-tab') === tab);
    });
  }

  // ───────────────────────── 검색 화면 ─────────────────────────
  function renderSearch(query) {
    setTab('search', '기타 코드 사전');
    var html = [];
    html.push('<form class="searchbox" id="sform" autocomplete="off">');
    html.push('<input id="q" type="search" inputmode="text" autocapitalize="characters" spellcheck="false" placeholder="코드 이름 (예: Cmaj7, F#m7b5, G/B)" value="' + esc(query || '') + '">');
    html.push('<button class="btn" type="submit">검색</button></form>');
    html.push('<div class="suggest" id="suggest"></div>');
    html.push('<div id="result"></div>');
    view.innerHTML = html.join('');

    var input = document.getElementById('q');
    document.getElementById('sform').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (v) go(chordHash(v));
    });
    input.addEventListener('input', function () { renderSuggest(input.value); });
    renderSuggest(query || '');

    var result = document.getElementById('result');
    if (query) {
      renderChord(result, query);
    } else {
      renderPicker(result);
    }
  }

  function renderSuggest(text) {
    var box = document.getElementById('suggest');
    if (!box) return;
    var t = text.trim().replace(/♯/g, '#').replace(/♭/g, 'b');
    var m = /^([A-Ga-g](?:#|b)?)(.*)$/.exec(t);
    if (!m) { box.innerHTML = ''; return; }
    var root = m[1].charAt(0).toUpperCase() + m[1].slice(1);
    var suf = m[2];
    var hits = E.CHORD_TYPES.filter(function (ty) {
      return suf === '' || ty.sym.toLowerCase().indexOf(suf.toLowerCase()) === 0;
    }).slice(0, 12);
    box.innerHTML = hits.map(function (ty) {
      var sym = root + ty.sym;
      return '<a class="chip" href="' + chordHash(sym) + '">' + esc(prettySym(sym)) + '</a>';
    }).join('');
  }

  function renderPicker(container) {
    var html = [];
    html.push('<div class="card picker"><h2>코드 이름을 모르겠다면 골라보세요</h2>');
    html.push('<div class="label">1. 근음 (코드의 기준음)</div><div class="roots">');
    ROOTS_GRID.forEach(function (r) {
      html.push('<button class="chip' + (r === state.pickRoot ? ' on' : '') + '" data-root="' + r + '">' + pretty(r) + '</button>');
    });
    html.push('</div><div class="label">2. 코드 종류</div><div class="suggest">');
    E.CHORD_TYPES.forEach(function (ty) {
      var sym = state.pickRoot + ty.sym;
      html.push('<a class="chip" href="' + chordHash(sym) + '">' + esc(prettySym(sym)) + '</a>');
    });
    html.push('</div></div>');

    var recent = store('recent') || [];
    if (recent.length) {
      html.push('<div class="card recent"><h2>최근 본 코드</h2><div class="suggest">');
      recent.forEach(function (r) { html.push('<a class="chip" href="' + chordHash(r) + '">' + esc(prettySym(r)) + '</a>'); });
      html.push('</div></div>');
    }
    html.push('<div class="card"><h2>이렇게 검색할 수 있어요</h2><p class="small muted">C, Am, G7, Cmaj7, Dm7, Bm7b5(또는 Bø), F#dim7, Eaug, Asus4, Cadd9, C6/9, E7#9, G13, Fmaj7#11, C7alt, A7(b9,#11), G/B 처럼 쓰면 돼요. ♯ 대신 #, ♭ 대신 b 를 써도 됩니다.</p></div>');
    container.innerHTML = html.join('');
    container.querySelectorAll('[data-root]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.pickRoot = b.getAttribute('data-root');
        store('pickRoot', state.pickRoot);
        renderPicker(container);
      });
    });
  }

  function addRecent(sym) {
    var recent = (store('recent') || []).filter(function (r) { return r !== sym; });
    recent.unshift(sym);
    store('recent', recent.slice(0, 12));
  }

  function renderChord(container, query) {
    var res = E.parseChord(query);
    if (!res.ok) {
      container.innerHTML = '<div class="error">🤔 ' + esc(res.error) + '<br><span class="small muted">예: Cmaj7, Am7, F#m7b5, G7sus4, Bb13, D/F#</span></div>';
      return;
    }
    var chord = res.chord;
    addRecent(chord.symbol);
    var exp = E.explainStack(chord);
    var voicings = E.generateVoicings(chord);
    var bestIdx = 0;
    voicings.forEach(function (v, i) { if (v.rec > voicings[bestIdx].rec) bestIdx = i; });
    if (bestIdx > 0) { voicings.unshift(voicings.splice(bestIdx, 1)[0]); bestIdx = 0; }

    var html = [];
    // 머리
    html.push('<div class="card">');
    html.push('<div class="chord-head"><div class="chord-name">' + esc(chord.pretty) + '</div>');
    html.push('<div class="chord-ko">' + esc(chord.type ? chord.type.ko : '확장/변형 코드') + (chord.bass ? ' · 슬래시 코드' : '') + '</div></div>');
    if (chord.type) html.push('<p class="chord-desc">' + esc(chord.type.desc) + '</p>');
    html.push('<div class="tones">');
    chord.notes.forEach(function (n) {
      html.push('<div class="tone role-' + n.role + (n.optional ? ' opt' : '') + '"><span class="deg">' + esc(D.prettyLabel(n.label)) + '</span><span class="nm">' + esc(n.pretty) + '</span><span class="ko">' + esc(n.ko.replace(' (완전1도)', '')) + (n.optional ? ' · 생략 가능' : '') + '</span></div>');
    });
    if (chord.bass && !chord.bass.inChord) {
      html.push('<div class="tone role-other"><span class="deg">' + esc(D.prettyLabel(chord.bass.label)) + '</span><span class="nm">' + esc(pretty(chord.bass.name)) + '</span><span class="ko">베이스</span></div>');
    }
    html.push('</div>');
    html.push('<div class="legend"><span class="role-root">근음</span><span class="role-third">3도</span><span class="role-fifth">5도</span><span class="role-seventh">7도/6도</span><span class="role-tension">텐션</span><span class="role-sus">sus음</span></div>');
    html.push('<p class="small muted" style="margin:10px 0 0">공식: <b class="mono">' + chord.notes.map(function (n) { return D.prettyLabel(n.label); }).join(' – ') + '</b></p>');
    html.push('<button class="btn ghost small" id="askAi" style="margin-top:10px">💬 이 코드에 대해 AI에게 묻기</button>');
    html.push('</div>');

    // 운지
    html.push('<div class="card"><div class="toolbar"><h2 style="margin:0">운지 ' + voicings.length + '가지</h2>');
    html.push('<div class="seg" id="modeSeg"><button data-mode="degree" class="' + (state.mode === 'degree' ? 'on' : '') + '">도수</button><button data-mode="note" class="' + (state.mode === 'note' ? 'on' : '') + '">음이름</button></div></div>');
    html.push('<p class="small muted" style="margin:6px 0 0">왼쪽이 6번줄(굵은 E), 오른쪽이 1번줄. ✕는 치지 않는 줄, 위의 동그라미는 개방현이에요. 점 안 = ' + (state.mode === 'degree' ? '도수, 아래 = 음이름' : '음이름, 아래 = 도수') + '.</p>');
    if (!voicings.length) {
      html.push('<p>이 코드는 음이 많아서 한 손으로 모두 잡는 운지를 찾지 못했어요. 아래 지판 전체 보기에서 구성음 위치를 확인해 보세요.</p>');
    }
    html.push('<div class="voicings">');
    voicings.forEach(function (v, i) {
      html.push('<div class="voicing' + (i === bestIdx ? ' best' : '') + '">');
      html.push('<span class="badge">' + (i === bestIdx ? '★ 추천' : v.std ? '기본형' : '&nbsp;') + '</span>');
      html.push(D.chordDiagram(chord, v, state.mode));
      var hasOpen = v.frets.indexOf(0) >= 0;
      html.push('<div class="pos">' + (v.baseFret === 1 ? (hasOpen ? '개방현 자리' : '1프렛 자리') : v.baseFret + '프렛 자리') + '</div>');
      html.push('<div class="frets">' + v.frets.map(function (f) { return f < 0 ? 'x' : f; }).join(' ') + '</div>');
      html.push('<button class="btn ghost small play" data-v="' + i + '">▶ 소리</button>');
      html.push('</div>');
    });
    html.push('</div></div>');

    // 쌓임
    html.push('<div class="card"><h2>이 코드는 어떻게 쌓였나</h2>');
    html.push('<p class="small muted" style="margin:0">아래에서 위로, 근음부터 음을 쌓아 올린 모양이에요. 사이의 글자는 바로 아래 음과의 간격이에요.</p>');
    html.push('<div class="stack">');
    exp.stack.forEach(function (n, k) {
      if (k > 0) {
        var st = exp.steps[k - 1];
        html.push('<div class="gap">↑ +' + st.semis + '반음<b>' + esc(st.name) + '</b></div>');
      }
      html.push('<div class="row"><div class="note role-' + n.role + '">' + esc(n.pretty) + '<small>' + esc(D.prettyLabel(n.label)) + '</small></div><span class="small muted">' + (n.label === 'R' ? '근음 (출발점)' : '근음에서 ') + (n.label === 'R' ? '' : esc(n.ko)) + '</span></div>');
    });
    html.push('</div>');
    html.push('<ul class="parts">');
    exp.parts.forEach(function (p) { html.push('<li><b>' + esc(p.title) + '</b>' + esc(p.text) + '</li>'); });
    html.push('</ul></div>');

    // 지판 전체
    html.push('<div class="card"><h2>지판 전체에서 구성음 위치</h2>');
    html.push('<p class="small muted" style="margin:0">위가 1번줄(가는 E). 옆으로 밀어서 15프렛까지 볼 수 있어요. 흐린 점은 생략해도 되는 음.</p>');
    html.push('<div class="neck-wrap">' + D.neckDiagram(chord, state.mode, 15) + '</div></div>');

    container.innerHTML = html.join('');

    var askBtn = container.querySelector('#askAi');
    if (askBtn) askBtn.addEventListener('click', function () {
      global.AI.ask(chord.symbol + ' 코드에 대해 설명해줘. 구성음은 ' + chord.notes.map(function (n) { return n.name + '(' + n.label + ')'; }).join(', ') + ' 이야. 어떤 느낌이고 언제 자주 쓰는지, 비슷한 코드와 차이도 알려줘.');
      go('#/ai');
    });
    container.querySelectorAll('#modeSeg button').forEach(function (b) {
      b.addEventListener('click', function () {
        state.mode = b.getAttribute('data-mode');
        store('labelMode', state.mode);
        renderChord(container, query);
      });
    });
    container.querySelectorAll('.play').forEach(function (b) {
      b.addEventListener('click', function () {
        var v = voicings[+b.getAttribute('data-v')];
        var midis = v.notes.filter(Boolean).map(function (n) { return n.midi; });
        global.GuitarAudio.strum(midis, false);
      });
    });
  }

  // ───────────────────────── 코드 목록 ─────────────────────────
  function renderList() {
    setTab('list', '코드 종류 목록');
    var html = [];
    html.push('<p class="small muted" style="margin:0 0 8px">근음을 고르고 코드 종류를 누르면 운지와 설명을 볼 수 있어요.</p>');
    html.push('<div class="roots">');
    ROOTS_GRID.forEach(function (r) {
      html.push('<button class="chip' + (r === state.listRoot ? ' on' : '') + '" data-root="' + r + '">' + pretty(r) + '</button>');
    });
    html.push('</div>');
    var groups = {};
    var order = [];
    E.CHORD_TYPES.forEach(function (t) {
      if (!groups[t.group]) { groups[t.group] = []; order.push(t.group); }
      groups[t.group].push(t);
    });
    order.forEach(function (g) {
      html.push('<div class="group-title">' + esc(g) + '</div><div class="type-list">');
      groups[g].forEach(function (t) {
        var sym = state.listRoot + t.sym;
        var r = E.parseChord(sym);
        var formula = r.ok ? r.chord.notes.map(function (n) { return D.prettyLabel(n.label); }).join(' ') : '';
        html.push('<a class="type-item" href="' + chordHash(sym) + '" style="text-decoration:none;color:inherit"><div class="sym">' + esc(prettySym(sym)) + '</div><div class="ko">' + esc(t.ko) + '</div><div class="ko mono">' + esc(formula) + '</div></a>');
      });
      html.push('</div>');
    });
    view.innerHTML = html.join('');
    view.querySelectorAll('[data-root]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.listRoot = b.getAttribute('data-root');
        store('listRoot', state.listRoot);
        renderList();
      });
    });
  }

  // ───────────────────────── 화성학 ─────────────────────────
  function renderTheory(openId) {
    setTab('theory', '기초 화성학');
    view.innerHTML = T.render(openId);
    T.bind(view);
    if (openId) {
      var el = document.getElementById('lesson-' + openId);
      if (el) setTimeout(function () { el.scrollIntoView(); window.scrollBy(0, -60); }, 0);
    }
  }

  // ───────────────────────── 라우터 ─────────────────────────
  function route() {
    var h = location.hash || '#/search';
    var parts = h.replace(/^#\//, '').split('/');
    var page = parts[0];
    var arg = parts.slice(1).join('/');
    if (page === 'chord') renderSearch(decodeURIComponent(arg));
    else if (page === 'list') renderList();
    else if (page === 'theory') renderTheory(arg ? decodeURIComponent(arg) : null);
    else if (page === 'ai') { setTab('ai', 'AI 질문'); global.AI.render(view); }
    else renderSearch('');
    if (page !== 'theory' || !arg) window.scrollTo(0, 0);
  }

  global.addEventListener('hashchange', route);
  route();

  global.App = { go: go, chordHash: chordHash };
})(this);
