/* AI 질문 (OpenRouter). API 키는 이 기기의 localStorage 에만 저장되고, openrouter.ai 로만 전송됨. */
(function (global) {
  'use strict';

  var API = 'https://openrouter.ai/api/v1';
  var FALLBACK_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';

  var SYSTEM_PROMPT = [
    '너는 기타 화성학을 친절하게 가르치는 선생님이야. 사용자는 기타 코드 사전 앱을 쓰는 초보~중급 기타리스트야.',
    '규칙:',
    '- 항상 한국어로, 짧고 쉽게 설명해. 필요한 만큼만 길게.',
    '- 도수는 앱과 같은 표기를 써: R, b2, 2, b3, 3, 4, b5, 5, #5, 6, bb7, b7, 7, b9, 9, #9, 11, #11, b13, 13.',
    '- 운지는 6번줄(굵은 E)부터 1번줄 순서의 프렛 번호로 써. 예: C = x32010, F = 133211. x 는 치지 않는 줄.',
    '- 코드 이름은 C, Am7, G7, Cmaj7, F#m7b5 처럼 표준 표기로 써.',
    '- 음이름과 구성음을 말할 때는 정확하게 계산해. 확실하지 않으면 확실하지 않다고 말해.',
    '- 화성학 용어는 처음 나올 때 한 줄로 뜻을 풀어줘.',
    '- 기타·음악과 관계없는 질문이면 짧게 답하고 음악 이야기로 돌아와.'
  ].join('\n');

  function store(key, val) {
    try {
      if (val === undefined) return localStorage.getItem(key);
      if (val === null) localStorage.removeItem(key); else localStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  var state = {
    messages: [],     // {role, content}
    busy: false,
    models: null,     // 무료 모델 목록 캐시
    pending: null     // 코드 화면에서 넘어온 질문
  };

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  // 아주 간단한 마크다운 → HTML (굵게, 목록, 코드, 줄바꿈) + 코드 이름 링크
  function renderMd(text) {
    var lines = esc(text).split('\n');
    var out = [], inList = false;
    lines.forEach(function (ln) {
      var m = /^\s*(?:[-*•]|\d+\.)\s+(.*)$/.exec(ln);
      if (m) {
        if (!inList) { out.push('<ul>'); inList = true; }
        out.push('<li>' + inline(m[1]) + '</li>');
        return;
      }
      if (inList) { out.push('</ul>'); inList = false; }
      var h = /^#{1,4}\s+(.*)$/.exec(ln);
      if (h) { out.push('<p><b>' + inline(h[1]) + '</b></p>'); return; }
      if (ln.trim() === '') { out.push('<div class="sp"></div>'); return; }
      out.push('<p>' + inline(ln) + '</p>');
    });
    if (inList) out.push('</ul>');
    return out.join('');
  }
  function inline(s) {
    return s
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }

  function getKey() { return store('orKey') || ''; }
  function getModel() { return store('orModel') || ''; }

  function loadModels(cb) {
    if (state.models) { cb(state.models); return; }
    fetch(API + '/models').then(function (r) { return r.json(); }).then(function (j) {
      var list = (j.data || []).filter(function (m) {
        return /:free$/.test(m.id) || (m.pricing && +m.pricing.prompt === 0 && +m.pricing.completion === 0);
      }).map(function (m) { return { id: m.id, name: m.name || m.id }; });
      list.sort(function (a, b) { return a.name.localeCompare(b.name); });
      state.models = list;
      cb(list);
    }).catch(function () { cb(null); });
  }

  function render(view) {
    var key = getKey();
    var html = [];
    html.push('<div class="card ai-intro"><h2>AI에게 화성학 질문하기</h2>');
    html.push('<p class="small muted" style="margin:0">코드, 진행, 도수, 운지 등 궁금한 걸 물어보세요. 인터넷이 필요해요.</p></div>');

    html.push('<details class="card ai-settings"' + (key ? '' : ' open') + '><summary><b>⚙ 설정</b> <span class="small muted">' + (key ? '키 저장됨 · ' + esc(getModel() || '모델 자동') : 'API 키를 넣어주세요') + '</span></summary>');
    html.push('<label class="small" for="orKey">OpenRouter API 키</label>');
    html.push('<input id="orKey" class="field" type="password" autocomplete="off" placeholder="sk-or-..." value="' + esc(key) + '">');
    html.push('<p class="small muted">키는 <b>이 폰 안에만</b> 저장되고, 질문할 때 openrouter.ai 로만 보내져요. 키는 openrouter.ai → Keys 에서 만들 수 있어요.</p>');
    html.push('<label class="small" for="orModel">모델</label>');
    html.push('<select id="orModel" class="field"><option value="">무료 모델 불러오는 중…</option></select>');
    html.push('<input id="orModelCustom" class="field" type="text" autocomplete="off" placeholder="모델 ID 직접 입력 (선택)" value="">');
    html.push('<p class="small muted">이름 끝에 :free 가 붙은 모델은 무료예요(하루 사용 횟수 제한 있음). 유료 모델은 OpenRouter 크레딧이 차감돼요.</p>');
    html.push('<div class="row-btns"><button class="btn small" id="orSave">저장</button><button class="btn ghost small" id="orDel">키 지우기</button></div>');
    html.push('<p class="small" id="orMsg"></p></details>');

    html.push('<div id="chat" class="chat"></div>');
    html.push('<div class="ai-examples" id="aiEx"></div>');
    html.push('<form class="chatbox" id="chatForm" autocomplete="off"><textarea id="chatIn" rows="2" placeholder="예: Cmaj7 이랑 C7 은 뭐가 달라?"></textarea><button class="btn" type="submit" id="chatSend">보내기</button></form>');
    html.push('<div class="row-btns" style="margin-top:8px"><button class="btn ghost small" id="chatClear">대화 지우기</button></div>');
    view.innerHTML = html.join('');
    bind(view);
    drawChat();
    if (state.pending) {
      var q = state.pending; state.pending = null;
      document.getElementById('chatIn').value = q;
      if (getKey()) send();
    }
  }

  function bind(view) {
    var sel = view.querySelector('#orModel');
    var custom = view.querySelector('#orModelCustom');
    var saved = getModel();
    loadModels(function (list) {
      if (!document.body.contains(sel)) return;
      var opts = [];
      if (!list || !list.length) {
        opts.push('<option value="">(무료 모델 목록을 못 불러왔어요 · 아래에 직접 입력)</option>');
      } else {
        opts.push('<option value="">자동 (무료 모델 중 첫 번째)</option>');
        list.forEach(function (m) { opts.push('<option value="' + esc(m.id) + '">' + esc(m.name) + '</option>'); });
      }
      sel.innerHTML = opts.join('');
      if (saved && list && list.some(function (m) { return m.id === saved; })) sel.value = saved;
      else if (saved) custom.value = saved;
    });

    view.querySelector('#orSave').addEventListener('click', function () {
      var k = view.querySelector('#orKey').value.trim();
      store('orKey', k || null);
      var model = custom.value.trim() || sel.value;
      store('orModel', model || null);
      view.querySelector('#orMsg').textContent = k ? '저장했어요.' : '키가 비어 있어요.';
      if (k) setTimeout(function () { var d = view.querySelector('.ai-settings'); if (d) d.open = false; }, 600);
    });
    view.querySelector('#orDel').addEventListener('click', function () {
      store('orKey', null);
      view.querySelector('#orKey').value = '';
      view.querySelector('#orMsg').textContent = '키를 지웠어요.';
    });
    view.querySelector('#chatForm').addEventListener('submit', function (e) { e.preventDefault(); send(); });
    view.querySelector('#chatIn').addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
    });
    view.querySelector('#chatClear').addEventListener('click', function () { state.messages = []; drawChat(); });

    var ex = ['Cmaj7 이랑 C7 은 뭐가 달라?', 'ii-V-I 진행이 뭐야?', 'sus4 코드는 언제 써?', 'G 키에서 쓸 수 있는 코드 알려줘', '텐션 9도는 왜 9라고 불러?'];
    view.querySelector('#aiEx').innerHTML = ex.map(function (q) { return '<button class="chip" type="button">' + esc(q) + '</button>'; }).join('');
    view.querySelectorAll('#aiEx .chip').forEach(function (b) {
      b.addEventListener('click', function () { document.getElementById('chatIn').value = b.textContent; send(); });
    });
  }

  function drawChat() {
    var box = document.getElementById('chat');
    if (!box) return;
    var ex = document.getElementById('aiEx');
    if (ex) ex.style.display = state.messages.length ? 'none' : '';
    box.innerHTML = state.messages.map(function (m) {
      if (m.role === 'user') return '<div class="msg me">' + esc(m.content).replace(/\n/g, '<br>') + '</div>';
      if (m.role === 'error') return '<div class="msg err">' + esc(m.content) + '</div>';
      return '<div class="msg ai">' + (m.content ? renderMd(m.content) : '<span class="muted">생각 중…</span>') + '</div>';
    }).join('');
    var last = box.lastElementChild;
    if (last) last.scrollIntoView({ block: 'end' });
  }

  function pickModel(cb) {
    var m = getModel();
    if (m) { cb(m); return; }
    loadModels(function (list) { cb(list && list.length ? list[0].id : FALLBACK_MODEL); });
  }

  function send() {
    var input = document.getElementById('chatIn');
    var q = (input.value || '').trim();
    if (!q || state.busy) return;
    var key = getKey();
    if (!key) {
      state.messages.push({ role: 'error', content: '먼저 위 ⚙ 설정에서 OpenRouter API 키를 넣고 저장해 주세요.' });
      drawChat();
      var st = document.querySelector('.ai-settings'); if (st) st.open = true;
      return;
    }
    input.value = '';
    state.messages.push({ role: 'user', content: q });
    var answer = { role: 'assistant', content: '' };
    state.messages.push(answer);
    state.busy = true;
    setBusy(true);
    drawChat();

    var history = state.messages.filter(function (m) { return (m.role === 'user' || m.role === 'assistant') && m !== answer; }).slice(-12);
    pickModel(function (model) {
      fetch(API + '/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + key,
          'Content-Type': 'application/json',
          'X-Title': 'Guitar Chord Dictionary'
        },
        body: JSON.stringify({
          model: model,
          stream: true,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }].concat(history)
        })
      }).then(function (res) {
        if (!res.ok) {
          return res.text().then(function (t) { throw new Error(explainError(res.status, t)); });
        }
        if (!res.body || !res.body.getReader) {
          return res.text().then(function (t) { answer.content = parseSseText(t); drawChat(); });
        }
        var reader = res.body.getReader();
        var dec = new TextDecoder();
        var buf = '';
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) return;
            buf += dec.decode(r.value, { stream: true });
            var parts = buf.split('\n');
            buf = parts.pop();
            parts.forEach(function (line) {
              line = line.trim();
              if (line.indexOf('data:') !== 0) return;
              var data = line.slice(5).trim();
              if (data === '[DONE]') return;
              var j = null;
              try { j = JSON.parse(data); } catch (e) { return; }
              if (j.error) throw new Error(j.error.message || '오류가 났어요.');
              var d = j.choices && j.choices[0] && j.choices[0].delta;
              if (d && d.content) { answer.content += d.content; drawChat(); }
            });
            return pump();
          });
        }
        return pump();
      }).then(function () {
        if (!answer.content) answer.content = '(답이 비어 있어요. 다른 모델을 골라 다시 물어보세요.)';
      }).catch(function (e) {
        state.messages.splice(state.messages.indexOf(answer), 1);
        state.messages.push({ role: 'error', content: e.message || String(e) });
      }).then(function () {
        state.busy = false;
        setBusy(false);
        drawChat();
      });
    });
  }

  function parseSseText(t) {
    var s = '';
    t.split('\n').forEach(function (line) {
      if (line.indexOf('data:') !== 0) return;
      try { var j = JSON.parse(line.slice(5)); s += (j.choices[0].delta.content || ''); } catch (e) { /* skip */ }
    });
    return s;
  }

  function explainError(status, body) {
    var msg = '';
    try { msg = JSON.parse(body).error.message; } catch (e) { msg = body.slice(0, 200); }
    if (status === 401) return 'API 키가 맞지 않아요. ⚙ 설정에서 키를 다시 확인해 주세요. (' + msg + ')';
    if (status === 402) return '크레딧이 부족해요. 무료(:free) 모델을 골라 보세요. (' + msg + ')';
    if (status === 429) return '요청이 너무 많거나 무료 사용량을 다 썼어요. 잠시 후 다시 하거나 다른 모델을 골라 보세요. (' + msg + ')';
    if (status === 404) return '모델을 찾을 수 없어요. ⚙ 설정에서 다른 모델을 골라 주세요. (' + msg + ')';
    return '오류가 났어요 (' + status + '): ' + msg;
  }

  function setBusy(b) {
    var btn = document.getElementById('chatSend');
    if (btn) { btn.disabled = b; btn.textContent = b ? '…' : '보내기'; }
  }

  function ask(question) { state.pending = question; }

  global.AI = { render: render, ask: ask };
})(this);
