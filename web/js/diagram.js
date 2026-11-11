/* 지판 다이어그램 (SVG 문자열 생성) */
(function (global) {
  'use strict';
  var E = global.ChordEngine;

  var ROLE_VAR = {
    root: 'var(--c-root)', third: 'var(--c-third)', fifth: 'var(--c-fifth)', seventh: 'var(--c-seventh)',
    sixth: 'var(--c-seventh)', tension: 'var(--c-tension)', sus: 'var(--c-sus)', other: 'var(--c-other)'
  };

  function prettyLabel(l) {
    return l.replace(/^b/, '♭').replace(/^bb/, '𝄫').replace(/^#/, '♯').replace('♭b', '♭♭');
  }

  function roleFor(chord, label) {
    for (var i = 0; i < chord.notes.length; i++) if (chord.notes[i].label === label) return chord.notes[i].role;
    return 'other';
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

  /**
   * 코드 다이어그램 (세로형: 왼쪽이 6번줄)
   * mode: 'degree' → 점 안에 도수, 아래에 음이름 / 'note' → 반대로
   */
  function chordDiagram(chord, v, mode, mark) {
    // mode 'blank': 퀴즈용. 점에 글자 없이 회색, mark 번째 줄만 '?' 로 강조
    var blank = mode === 'blank';
    var W = 156, left = 32, sp = 20, top = 30, fs = 27, nFrets = 5;
    var H = top + fs * nFrets + 30;
    var base = v.baseFret;
    var out = [];
    out.push('<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="운지 ' + esc(v.frets.map(function (f) { return f < 0 ? 'x' : f; }).join(' ')) + '">');

    // 프렛 선
    for (var f = 0; f <= nFrets; f++) {
      var y = top + f * fs;
      var isNut = f === 0 && base === 1;
      out.push('<line x1="' + left + '" y1="' + y + '" x2="' + (left + sp * 5) + '" y2="' + y + '" stroke="' + (isNut ? 'var(--nut)' : 'var(--fret)') + '" stroke-width="' + (isNut ? 5 : 1.2) + '" stroke-linecap="round"/>');
    }
    // 줄
    for (var s = 0; s < 6; s++) {
      var x = left + s * sp;
      out.push('<line x1="' + x + '" y1="' + top + '" x2="' + x + '" y2="' + (top + fs * nFrets) + '" stroke="var(--string)" stroke-width="' + (1.6 - s * 0.15).toFixed(2) + '"/>');
    }
    // 시작 프렛 표시
    if (base > 1) {
      out.push('<text x="' + (left - 8) + '" y="' + (top + fs * 0.5 + 4) + '" text-anchor="end" font-size="12" font-weight="700" fill="var(--text)">' + base + 'fr</text>');
    }
    // 바레
    if (v.barre && v.barre.fret >= base) {
      var by = top + (v.barre.fret - base + 0.5) * fs;
      out.push('<line x1="' + (left + v.barre.from * sp) + '" y1="' + by + '" x2="' + (left + v.barre.to * sp) + '" y2="' + by + '" stroke="var(--text)" stroke-opacity=".28" stroke-width="18" stroke-linecap="round"/>');
    }
    // 음
    for (var st = 0; st < 6; st++) {
      var fr = v.frets[st];
      var cx = left + st * sp;
      var n = v.notes[st];
      if (fr < 0) {
        out.push('<text x="' + cx + '" y="' + (top - 9) + '" text-anchor="middle" font-size="13" fill="var(--muted)">✕</text>');
        continue;
      }
      var role = roleFor(chord, n.label);
      var col = ROLE_VAR[role];
      var inner = mode === 'note' ? n.name : prettyLabel(n.label);
      if (blank) {
        col = st === mark ? 'var(--accent)' : 'var(--text)';
        inner = st === mark ? '?' : '';
      }
      var fsz = inner.length >= 3 ? 8.5 : inner.length === 2 ? 10 : 11.5;
      if (fr === 0) {
        out.push('<circle cx="' + cx + '" cy="' + (top - 13) + '" r="8.5" fill="none" stroke="' + col + '" stroke-width="2"/>');
        out.push('<text x="' + cx + '" y="' + (top - 13 + 3.5) + '" text-anchor="middle" font-size="' + (fsz - 1) + '" font-weight="700" fill="' + col + '">' + esc(inner) + '</text>');
      } else {
        var cy = top + (fr - base + 0.5) * fs;
        out.push('<circle cx="' + cx + '" cy="' + cy + '" r="9.5" fill="' + col + '"/>');
        out.push('<text x="' + cx + '" y="' + (cy + 3.8) + '" text-anchor="middle" font-size="' + fsz + '" font-weight="700" fill="#fff">' + esc(inner) + '</text>');
      }
      // 아래 줄: 반대 정보
      var below = mode === 'note' ? prettyLabel(n.label) : n.name;
      if (blank) continue;
      out.push('<text x="' + cx + '" y="' + (top + fs * nFrets + 17) + '" text-anchor="middle" font-size="10.5" font-weight="600" fill="' + col + '">' + esc(below) + '</text>');
    }
    out.push('</svg>');
    return out.join('');
  }

  /**
   * 지판 전체에서 코드 구성음 위치 (가로형: 위쪽이 1번줄)
   */
  function neckDiagram(chord, mode, maxFret) {
    maxFret = maxFret || 15;
    var tuning = E.STANDARD_TUNING;
    var fw = 46, left = 34, top = 22, sp = 26;
    var W = left + fw * (maxFret + 0.6) + 10;
    var H = top + sp * 5 + 34;
    var pcInfo = {};
    chord.notes.forEach(function (n) { pcInfo[n.pc] = n; });
    var out = [];
    out.push('<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg">');
    var nutX = left + fw * 0.6;
    // 포지션 마크
    [3, 5, 7, 9, 15].forEach(function (f) {
      if (f > maxFret) return;
      out.push('<circle cx="' + (nutX + (f - 0.5) * fw) + '" cy="' + (top + sp * 2.5) + '" r="5" fill="var(--line)"/>');
    });
    if (maxFret >= 12) {
      out.push('<circle cx="' + (nutX + 11.5 * fw) + '" cy="' + (top + sp * 1.5) + '" r="5" fill="var(--line)"/>');
      out.push('<circle cx="' + (nutX + 11.5 * fw) + '" cy="' + (top + sp * 3.5) + '" r="5" fill="var(--line)"/>');
    }
    // 프렛
    for (var f = 0; f <= maxFret; f++) {
      var x = nutX + f * fw;
      out.push('<line x1="' + x + '" y1="' + top + '" x2="' + x + '" y2="' + (top + sp * 5) + '" stroke="' + (f === 0 ? 'var(--nut)' : 'var(--fret)') + '" stroke-width="' + (f === 0 ? 4 : 1.2) + '"/>');
      if (f > 0) out.push('<text x="' + (nutX + (f - 0.5) * fw) + '" y="' + (top + sp * 5 + 22) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + f + '</text>');
    }
    // 줄 (위 = 1번줄)
    for (var r = 0; r < 6; r++) {
      var s = 5 - r;
      var y = top + r * sp;
      out.push('<line x1="' + nutX + '" y1="' + y + '" x2="' + (nutX + maxFret * fw) + '" y2="' + y + '" stroke="var(--string)" stroke-width="' + (0.9 + s * 0.0 + (5 - r) * 0.0 + r * 0.18).toFixed(2) + '"/>');
      out.push('<text x="10" y="' + (y + 4) + '" font-size="11" fill="var(--muted)">' + E.STRING_NAMES[s] + '</text>');
      for (var fr = 0; fr <= maxFret; fr++) {
        var pc = E.mod(tuning[s] + fr, 12);
        var n = pcInfo[pc];
        if (!n) continue;
        var cx = fr === 0 ? left + fw * 0.6 - 14 : nutX + (fr - 0.5) * fw;
        var col = ROLE_VAR[n.role] || ROLE_VAR.other;
        var inner = mode === 'note' ? n.pretty.replace(/\(.*\)/, '') : prettyLabel(n.label);
        var fsz = inner.length >= 3 ? 8.5 : inner.length === 2 ? 10 : 11.5;
        out.push('<circle cx="' + cx + '" cy="' + y + '" r="10" fill="' + col + '"' + (n.optional ? ' fill-opacity=".55"' : '') + '/>');
        out.push('<text x="' + cx + '" y="' + (y + 3.8) + '" text-anchor="middle" font-size="' + fsz + '" font-weight="700" fill="#fff">' + esc(inner) + '</text>');
      }
    }
    out.push('</svg>');
    return out.join('');
  }

  global.Diagram = { chordDiagram: chordDiagram, neckDiagram: neckDiagram, prettyLabel: prettyLabel, ROLE_VAR: ROLE_VAR };
})(this);
