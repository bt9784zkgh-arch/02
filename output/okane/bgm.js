/* =====================================================================
   okane / bgm.js  — チーム02 BGM・効果音担当
   曲名「ゆうやけ だがしや」（オリジナル）
   - Web Audio API でその場で鳴らす。音楽ファイルは使わない
   - テンポ 88 / ヘ長調（F）/ 4分の4拍子 / 16小節ループ（約43.6秒）
   - 旋律は「ヨナ抜き長音階」（F G A C D）だけで作った、昭和の商店街風
   - 音色: オルゴール（旋律）・木琴（ベースと和音の「ぽん・ぽん」）・やわらかいパッド
   - ドラムなし
   使い方（決まった形）:
     Sound.start()          BGMを小さくフェードインして開始（「はじめる」のクリックで呼ぶ）
     Sound.stop()           BGMをフェードアウトして止める
     Sound.setMuted(bool)   true で全部の音を消す（BGMも効果音も）
     Sound.play(name)       'tap' | 'correct' | 'retry' | 'clear'
   おまけ（使わなくてもよい）:
     Sound.play('place')    硬貨をトレーにのせる「ちりん」
     Sound.play('back')     硬貨を山にもどす「ころん」
     Sound.play('hint')     ヒントを出すときの「ぽろん」
     Sound.isMuted() / Sound.isPlaying()
   ===================================================================== */
(function (global) {
  'use strict';

  var NOOP = function () {};
  var AC = global.AudioContext || global.webkitAudioContext;

  if (!AC) {
    // AudioContext が使えない環境では、何もしない関数にしてゲームを止めない
    var mutedFlag = false;
    global.Sound = {
      start: NOOP, stop: NOOP, play: NOOP,
      setMuted: function (m) { mutedFlag = !!m; },
      isMuted: function () { return mutedFlag; },
      isPlaying: function () { return false; }
    };
    return;
  }

  /* ---------- 音量（ルールどおり） ---------- */
  var BGM_LEVEL = 0.1;   // BGM 主音量 0.08〜0.12
  var SFX_LEVEL = 0.28;  // 効果音 0.3以下
  var DUCK_LEVEL = 0.55; // 効果音のあいだ BGM をこの倍率まで下げる

  /* ---------- 曲データ ---------- */
  var BPM = 88;
  var EIGHTH = 60 / BPM / 2;   // 8分音符の長さ（秒）
  var STEPS_PER_BAR = 8;
  var BARS = 16;

  // コード: bass = ベース音、tones = 和音（MIDI番号）
  var CH = {
    F:  { bass: 53, tones: [57, 60, 65] },
    Dm: { bass: 50, tones: [57, 62, 65] },
    Bb: { bass: 46, tones: [58, 62, 65] },
    C:  { bass: 48, tones: [55, 60, 64] },
    Am: { bass: 45, tones: [57, 60, 64] },
    Gm: { bass: 43, tones: [55, 58, 62] }
  };
  var PROG = ['F', 'Dm', 'Bb', 'C', 'F', 'Am', 'Gm', 'C',
              'Bb', 'F', 'Dm', 'Am', 'Bb', 'C', 'F', 'F'];

  // 旋律: 小節ごとに [はじまり(8分), MIDI, 長さ(8分)]
  var MEL = [
    [[0, 69, 2], [2, 72, 2], [4, 74, 1], [5, 72, 1], [6, 69, 2]],
    [[0, 74, 3], [3, 72, 1], [4, 69, 4]],
    [[0, 67, 2], [2, 69, 1], [3, 67, 1], [4, 65, 2], [6, 62, 2]],
    [[0, 67, 6]],
    [[0, 69, 2], [2, 72, 2], [4, 77, 2], [6, 74, 2]],
    [[0, 72, 3], [3, 69, 1], [4, 67, 4]],
    [[0, 67, 2], [2, 69, 2], [4, 74, 2], [6, 72, 2]],
    [[0, 72, 6]],
    [[0, 74, 2], [2, 77, 2], [4, 74, 1], [5, 72, 1], [6, 74, 2]],
    [[0, 72, 3], [3, 69, 1], [4, 65, 4]],
    [[0, 69, 2], [2, 74, 2], [4, 72, 2], [6, 69, 2]],
    [[0, 72, 6], [6, 69, 2]],
    [[0, 67, 2], [2, 69, 2], [4, 72, 2], [6, 74, 2]],
    [[0, 72, 2], [2, 69, 1], [3, 67, 1], [4, 67, 4]],
    [[0, 69, 2], [2, 67, 2], [4, 65, 4]],
    []
  ];

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* ---------- 状態 ---------- */
  var ctx = null;
  var master, bgmBus, duckBus, sfxBus, echoIn;
  var muted = false;
  var playing = false;
  var timer = null;
  var step = 0;
  var nextTime = 0;
  var duckUntil = 0;

  function init() {
    if (ctx) return true;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);

      // BGM: bgmBus(フェード) → duckBus(ダッキング) → master
      duckBus = ctx.createGain(); duckBus.gain.value = 1; duckBus.connect(master);
      bgmBus = ctx.createGain(); bgmBus.gain.value = 0;

      // 角をとる やわらかいフィルター
      var soft = ctx.createBiquadFilter();
      soft.type = 'lowpass'; soft.frequency.value = 4200; soft.Q.value = 0.3;
      bgmBus.connect(soft); soft.connect(duckBus);

      // オルゴール用の小さなこだま（なつかしい感じ）
      echoIn = ctx.createGain(); echoIn.gain.value = 0.22;
      var dl = ctx.createDelay(2.0); dl.delayTime.value = EIGHTH * 3;
      var fb = ctx.createGain(); fb.gain.value = 0.28;
      var dlf = ctx.createBiquadFilter(); dlf.type = 'lowpass'; dlf.frequency.value = 2400;
      echoIn.connect(dl); dl.connect(dlf); dlf.connect(fb); fb.connect(dl);
      dlf.connect(bgmBus);

      sfxBus = ctx.createGain(); sfxBus.gain.value = SFX_LEVEL; sfxBus.connect(master);
      return true;
    } catch (e) {
      ctx = null;
      return false;
    }
  }

  function resume() {
    try { if (ctx && ctx.state === 'suspended') ctx.resume(); } catch (e) {}
  }

  /* ---------- 音色 ---------- */
  // 1音ぶんのエンベロープつきオシレーター
  function tone(dest, type, freq, t, attack, decay, peak, endFreq) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + attack + decay * 0.5);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + attack + decay + 0.05);
    return o;
  }

  // オルゴール: 基音 + 高い倍音（すぐ消える）
  function musicBox(dest, midi, t, vel, withEcho) {
    var f = mtof(midi);
    tone(dest, 'sine', f, t, 0.004, 1.4, 0.5 * vel);
    tone(dest, 'sine', f * 4, t, 0.002, 0.25, 0.09 * vel);
    tone(dest, 'sine', f * 2, t, 0.003, 0.6, 0.12 * vel);
    if (withEcho && echoIn) tone(echoIn, 'sine', f, t, 0.004, 0.9, 0.4 * vel);
  }

  // 木琴: 丸い基音 + 4倍音のコツッ
  function marimba(dest, midi, t, vel, len) {
    var f = mtof(midi);
    tone(dest, 'sine', f, t, 0.005, len || 0.5, 0.55 * vel);
    tone(dest, 'sine', f * 4, t, 0.002, 0.06, 0.12 * vel);
  }

  // パッド: 三角波をゆっくりふくらませる
  function pad(dest, midis, t, dur) {
    midis.forEach(function (m, i) {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      var lp = ctx.createBiquadFilter();
      o.type = 'triangle';
      o.frequency.value = mtof(m);
      o.detune.value = (i - 1) * 4;
      lp.type = 'lowpass'; lp.frequency.value = 900;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.07, t + dur * 0.35);
      g.gain.linearRampToValueAtTime(0.05, t + dur * 0.8);
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.25);
      o.connect(lp); lp.connect(g); g.connect(dest);
      o.start(t); o.stop(t + dur + 0.3);
    });
  }

  /* ---------- BGM スケジューラー ---------- */
  function scheduleStep(s, t) {
    var bar = Math.floor(s / STEPS_PER_BAR);
    var pos = s % STEPS_PER_BAR;
    var ch = CH[PROG[bar]];

    if (pos === 0) {
      pad(bgmBus, ch.tones, t, EIGHTH * STEPS_PER_BAR);
      marimba(bgmBus, ch.bass, t, 0.9, 0.7);
    }
    if (pos === 4) marimba(bgmBus, ch.bass + 7, t, 0.6, 0.5); // 5度上
    if (pos === 2 || pos === 6) {                               // 「ぽん・ぽん」
      marimba(bgmBus, ch.tones[1], t, 0.32, 0.3);
      marimba(bgmBus, ch.tones[2], t, 0.28, 0.3);
    }
    var notes = MEL[bar];
    for (var i = 0; i < notes.length; i++) {
      if (notes[i][0] === pos) musicBox(bgmBus, notes[i][1], t, 0.75, true);
    }
    // 最後の小節: もどる前に そっと 2音
    if (bar === BARS - 1 && pos === 5) musicBox(bgmBus, 72, t, 0.4, true);
    if (bar === BARS - 1 && pos === 6) musicBox(bgmBus, 67, t, 0.45, true);
  }

  function tick() {
    if (!ctx || !playing) return;
    var now = ctx.currentTime;
    if (nextTime < now) nextTime = now + 0.05; // タブ復帰などで遅れたら追いつかずに仕切り直す
    while (nextTime < now + 0.25) {
      scheduleStep(step, nextTime);
      nextTime += EIGHTH;
      step = (step + 1) % (STEPS_PER_BAR * BARS);
    }
  }

  /* ---------- ダッキング ---------- */
  function duck(holdSec) {
    if (!ctx) return;
    var t = ctx.currentTime;
    var g = duckBus.gain;
    var end = Math.max(duckUntil, t + holdSec);
    duckUntil = end;
    g.cancelScheduledValues(t);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(DUCK_LEVEL, t + 0.06);
    g.setValueAtTime(DUCK_LEVEL, end);
    g.linearRampToValueAtTime(1, end + 0.5);
  }

  /* ---------- 効果音 ---------- */
  var SFX = {
    // ぽん: 木のボタンを押した音
    tap: function (t) {
      tone(sfxBus, 'sine', 700, t, 0.004, 0.14, 0.7, 420);
      tone(sfxBus, 'triangle', 1400, t, 0.002, 0.04, 0.15);
      return 0.2;
    },
    // ちりん: 硬貨をトレーにのせる
    place: function (t) {
      tone(sfxBus, 'sine', 2093, t, 0.002, 0.22, 0.32);
      tone(sfxBus, 'sine', 3136, t + 0.005, 0.002, 0.15, 0.16);
      tone(sfxBus, 'sine', 520, t, 0.003, 0.08, 0.35, 380);
      return 0.25;
    },
    // ころん: 硬貨を山にもどす
    back: function (t) {
      tone(sfxBus, 'sine', 1568, t, 0.002, 0.12, 0.25);
      tone(sfxBus, 'sine', 1175, t + 0.08, 0.002, 0.16, 0.22);
      return 0.3;
    },
    // ピロリン: 上がっていく オルゴール
    correct: function (t) {
      var seq = [77, 81, 84, 89];
      seq.forEach(function (m, i) { musicBox(sfxBus, m, t + i * 0.085, i === 3 ? 0.85 : 0.65, false); });
      tone(sfxBus, 'sine', mtof(84), t + 0.34, 0.08, 0.9, 0.12);
      return 1.0;
    },
    // ぽわん: やさしい低めの音（ブザーではない）
    retry: function (t) {
      var o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      var lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(440, t);
      o.frequency.exponentialRampToValueAtTime(349, t + 0.35);
      lfo.frequency.value = 5; lg.gain.value = 4;
      lfo.connect(lg); lg.connect(o.frequency);
      lp.type = 'lowpass'; lp.frequency.value = 1200;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.5, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(lp); lp.connect(g); g.connect(sfxBus);
      o.start(t); lfo.start(t); o.stop(t + 0.65); lfo.stop(t + 0.65);
      tone(sfxBus, 'sine', 220, t, 0.05, 0.5, 0.2, 175);
      return 0.7;
    },
    // ぽろん: ヒント（「みてみよう」）
    hint: function (t) {
      musicBox(sfxBus, 74, t, 0.5, false);
      musicBox(sfxBus, 81, t + 0.16, 0.5, false);
      return 0.6;
    },
    // 短いファンファーレ（約1.6秒）
    clear: function (t) {
      var e = 0.13;
      [[72, 0], [77, 1], [81, 2], [84, 3.2]].forEach(function (n) {
        musicBox(sfxBus, n[0], t + n[1] * e, n[0] === 84 ? 0.9 : 0.7, false);
        marimba(sfxBus, n[0] - 12, t + n[1] * e, 0.35, 0.25);
      });
      var tc = t + 3.2 * e;
      [65, 69, 72].forEach(function (m) { marimba(sfxBus, m, tc, 0.4, 0.9); });
      marimba(sfxBus, 53, tc, 0.6, 1.0);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = mtof(77);
      g.gain.setValueAtTime(0.0001, tc);
      g.gain.linearRampToValueAtTime(0.12, tc + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, tc + 1.2);
      o.connect(g); g.connect(sfxBus); o.start(tc); o.stop(tc + 1.3);
      return 1.7;
    }
  };

  /* ---------- 公開API ---------- */
  function start() {
    try {
      if (!init()) return;
      resume();
      if (playing) return;
      playing = true;
      var t = ctx.currentTime;
      bgmBus.gain.cancelScheduledValues(t);
      bgmBus.gain.setValueAtTime(bgmBus.gain.value, t);
      bgmBus.gain.linearRampToValueAtTime(BGM_LEVEL, t + 2.5); // ゆっくりフェードイン
      step = 0;
      nextTime = t + 0.1;
      tick();
      timer = setInterval(tick, 60);
    } catch (e) {}
  }

  function stop() {
    try {
      if (!ctx || !playing) return;
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      var t = ctx.currentTime;
      bgmBus.gain.cancelScheduledValues(t);
      bgmBus.gain.setValueAtTime(bgmBus.gain.value, t);
      bgmBus.gain.linearRampToValueAtTime(0, t + 0.8);
    } catch (e) {}
  }

  function setMuted(m) {
    muted = !!m;
    try {
      if (!ctx) return;
      var t = ctx.currentTime;
      master.gain.cancelScheduledValues(t);
      master.gain.setValueAtTime(master.gain.value, t);
      master.gain.linearRampToValueAtTime(muted ? 0 : 1, t + 0.25);
    } catch (e) {}
  }

  function play(name) {
    try {
      if (muted) return;
      var fn = SFX[name];
      if (!fn) return;
      if (!init()) return;
      resume();
      var len = fn(ctx.currentTime + 0.01);
      if (playing) duck(len);
    } catch (e) {}
  }

  // タブがかくれたら止めておき、もどったら再開
  try {
    document.addEventListener('visibilitychange', function () {
      if (!ctx) return;
      try {
        if (document.hidden) ctx.suspend();
        else if (playing) ctx.resume();
      } catch (e) {}
    });
  } catch (e) {}

  global.Sound = {
    start: start,
    stop: stop,
    setMuted: setMuted,
    play: play,
    isMuted: function () { return muted; },
    isPlaying: function () { return playing; }
  };
})(typeof window !== 'undefined' ? window : this);
