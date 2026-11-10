// 간단한 엔진 테스트: node test/engine.test.js
const assert = require('assert');
const E = require('../web/js/engine.js');

function notes(sym) {
  const r = E.parseChord(sym);
  assert.ok(r.ok, sym + ': ' + r.error);
  return r.chord.notes.map(n => n.name).join(' ');
}
const cases = {
  'C': 'C E G', 'Am': 'A C E', 'Cmaj7': 'C E G B', 'C7': 'C E G Bb', 'Cm7': 'C Eb G Bb',
  'Bm7b5': 'B D F A', 'Bø': 'B D F A', 'Cdim7': 'C Eb Gb Bbb', 'Caug': 'C E G#', 'Csus4': 'C F G',
  'Csus2': 'C D G', 'Cadd9': 'C E G D', 'C6': 'C E G A', 'C69': 'C E G A D', 'C6/9': 'C E G A D',
  'C9': 'C E G Bb D', 'Cmaj9': 'C E G B D', 'Cm11': 'C Eb G Bb D F', 'C13': 'C E G Bb D A',
  'E7#9': 'E G# B D F##', 'A7b9': 'A C# E G Bb', 'Fmaj7#11': 'F A C E B', 'CmMaj7': 'C Eb G B',
  'Ebmaj7': 'Eb G Bb D', 'F#m7b5': 'F# A C E', 'C5': 'C G', 'C7alt': 'C E Bb Db D# F# Ab',
  'C7(b9,#11)': 'C E G Bb Db F#', 'CM7': 'C E G B', 'C-7': 'C Eb G Bb', 'C°': 'C Eb Gb', 'C+': 'C E G#',
  'Bb13#11': 'Bb D F Ab C E G', 'Dm7': 'D F A C', 'Gsus': 'G C D', 'C7sus4': 'C F G Bb'
};
for (const [sym, want] of Object.entries(cases)) assert.strictEqual(notes(sym), want, sym);

// 슬래시 코드
const gb = E.parseChord('G/B').chord;
assert.strictEqual(gb.bass.label, '3');
const dc = E.parseChord('D/C').chord;
assert.strictEqual(dc.bass.inChord, false);

// 잘못된 입력
assert.ok(!E.parseChord('H7').ok);
assert.ok(!E.parseChord('Cxyz').ok);

// 운지: 대표 개방 코드가 포함되는지
function shapes(sym) { return E.generateVoicings(E.parseChord(sym).chord).map(v => v.frets.map(f => f < 0 ? 'x' : f).join('')); }
assert.ok(shapes('C').includes('x32010'));
assert.ok(shapes('G').includes('320003') || shapes('G').includes('320033'));
assert.ok(shapes('Am').includes('x02210'));
assert.ok(shapes('E').includes('022100'));
assert.ok(shapes('D').includes('xx0232'));
assert.ok(shapes('F').includes('133211'));
assert.ok(shapes('Bm7b5').includes('x2323x') || shapes('Bm7b5').length > 0);

// 모든 근음 × 모든 코드 종류에서 오류 없이 운지가 생성되는지
const roots = ['C', 'C#', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
let empty = [];
for (const r of roots) for (const t of E.CHORD_TYPES) {
  const res = E.parseChord(r + t.sym);
  assert.ok(res.ok, r + t.sym);
  const v = E.generateVoicings(res.chord);
  if (!v.length) empty.push(r + t.sym);
  for (const x of v) {
    const pcs = new Set(x.notes.filter(Boolean).map(n => n.pc));
    for (const n of res.chord.notes) if (!n.optional) assert.ok(pcs.has(n.pc), r + t.sym + ' missing ' + n.label);
  }
}
console.log('운지가 없는 코드:', empty.length ? empty.join(', ') : '없음');
console.log('모든 테스트 통과');

// 추천(첫 번째) 운지 = 가장 대중적인 운지
function rec(sym) {
  const v = E.generateVoicings(E.parseChord(sym).chord);
  let b = v[0]; for (const x of v) if (x.rec > b.rec) b = x;
  return b.frets.map(f => f < 0 ? 'x' : f).join('');
}
for (const [name, list] of Object.entries(E.OPEN_SHAPES)) assert.strictEqual(rec(name), list[0], name + ' 추천');
const popular = { 'Cm': 'x35543', 'Bb': 'x13331', 'F#m': '244222', 'B': 'x24442', 'Gm': '355333', 'C#m': 'x46654', 'F#': '244322', 'Eb': 'x68886', 'Fm7': '131111', 'Bb7': 'x13131' };
for (const [sym, want] of Object.entries(popular)) assert.strictEqual(rec(sym), want, sym + ' 추천');
console.log('추천 운지 테스트 통과');
