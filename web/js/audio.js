/* 간단한 기타 소리 (Karplus-Strong 합성) */
(function (global) {
  'use strict';
  var ctx = null;
  var cache = {};

  function getCtx() {
    if (!ctx) {
      var AC = global.AudioContext || global.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function pluckBuffer(ac, midi) {
    if (cache[midi]) return cache[midi];
    var freq = 440 * Math.pow(2, (midi - 69) / 12);
    var sr = ac.sampleRate;
    var dur = 2.6;
    var len = Math.floor(sr * dur);
    var buf = ac.createBuffer(1, len, sr);
    var data = buf.getChannelData(0);
    var period = Math.round(sr / freq);
    var ring = new Float32Array(period);
    for (var i = 0; i < period; i++) ring[i] = Math.random() * 2 - 1;
    // 약간 부드럽게
    for (var j = 1; j < period; j++) ring[j] = (ring[j] + ring[j - 1]) * 0.5;
    var decay = 0.996 - Math.max(0, (midi - 52)) * 0.0004;
    var idx = 0;
    for (var k = 0; k < len; k++) {
      var next = (idx + 1) % period;
      var v = ring[idx];
      ring[idx] = (ring[idx] + ring[next]) * 0.5 * decay;
      data[k] = v * 0.35;
      idx = next;
    }
    cache[midi] = buf;
    return buf;
  }

  /** midis: 낮은 줄부터의 MIDI 번호 배열, arpeggio: true 면 한 음씩 */
  function strum(midis, arpeggio) {
    var ac = getCtx();
    if (!ac) return;
    var t0 = ac.currentTime + 0.03;
    var gap = arpeggio ? 0.28 : 0.035;
    var master = ac.createGain();
    master.gain.value = 0.9;
    master.connect(ac.destination);
    midis.forEach(function (m, i) {
      var src = ac.createBufferSource();
      src.buffer = pluckBuffer(ac, m);
      var g = ac.createGain();
      g.gain.setValueAtTime(1, t0 + i * gap);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + i * gap + 2.5);
      src.connect(g); g.connect(master);
      src.start(t0 + i * gap);
      src.stop(t0 + i * gap + 2.6);
    });
  }

  global.GuitarAudio = { strum: strum };
})(this);
