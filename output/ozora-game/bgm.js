/*
 * bgm.js — おおぞら こころの たび（チーム02 / BGM・効果音担当）
 *
 * 音楽ファイルは使わず、Web Audio API でその場で鳴らすオリジナル曲と効果音。
 *
 * 使い方（決まった形）:
 *   Sound.start()            // BGMを小さくフェードインして開始（「はじめる」のクリックで呼ぶ）
 *   Sound.stop()             // BGMをフェードアウトして止める
 *   Sound.setMuted(bool)     // おと あり／なし（右上のボタン）
 *   Sound.play('tap' | 'correct' | 'retry' | 'clear')
 *
 * 曲「かみの とりの そら」
 *   テンポ 88 / ヘ長調(F major) / 4分の4拍子 / 16小節ループ（約43.6秒）
 *   音色: オルゴール（メロディ）、木琴（やさしい分散和音）、やわらかいパッド、まるいベース。ドラムなし。
 *
 * 音量: BGM主音量 0.10（ダッキング中は 0.055）、効果音 0.28。
 * AudioContext が使えないときは、何もしない関数になる（ゲームは止まらない）。
 */
(function (global) {
  'use strict';

  var BGM_VOLUME = 0.10;      // BGMの主音量（0.12以下を守る）
  var DUCK_RATIO = 0.55;      // 効果音のあいだ BGM をここまで下げる
  var SFX_VOLUME = 0.28;      // 効果音（0.3以下）
  var FADE_IN = 3.0;          // 秒
  var FADE_OUT = 1.2;         // 秒
  var TEMPO = 88;
  var BEAT = 60 / TEMPO;      // 4分音符 = 約0.682秒
  var BAR = BEAT * 4;         // 1小節 = 約2.727秒
  var BARS = 16;
  var LOOKAHEAD = 1.6;        // 何秒先まで予約するか（裏のタブで setInterval が遅くなっても切れない長さ）
  var TICK_MS = 100;

  var noop = function () {};
  var AC = global.AudioContext || global.webkitAudioContext;

  if (!AC) {
    global.Sound = {
      start: noop, stop: noop, setMuted: noop, play: noop,
      isMuted: function () { return false; },
      info: { available: false, bgmVolume: BGM_VOLUME, sfxVolume: SFX_VOLUME }
    };
    return;
  }

  // ---------------------------------------------------------------
  // 楽譜（すべてオリジナル）。拍は 0〜3.99、音は MIDI 番号。
  // ---------------------------------------------------------------
  // 和音（パッド用）とベースの根音
  var CHORDS = [
    { root: 41, notes: [53, 57, 60, 64] }, //  1 Fmaj7
    { root: 45, notes: [52, 57, 60, 64] }, //  2 Am7
    { root: 46, notes: [53, 57, 58, 62] }, //  3 Bbmaj7
    { root: 48, notes: [52, 55, 60, 65] }, //  4 Csus4風(C/F の上)
    { root: 41, notes: [53, 57, 60, 64] }, //  5 Fmaj7
    { root: 38, notes: [53, 57, 60, 62] }, //  6 Dm7
    { root: 43, notes: [53, 55, 58, 62] }, //  7 Gm7
    { root: 48, notes: [52, 55, 58, 60] }, //  8 C7
    { root: 46, notes: [53, 57, 58, 62] }, //  9 Bbmaj7
    { root: 48, notes: [52, 55, 60, 64] }, // 10 C
    { root: 45, notes: [52, 57, 60, 64] }, // 11 Am7
    { root: 38, notes: [53, 57, 60, 62] }, // 12 Dm7
    { root: 43, notes: [53, 55, 58, 62] }, // 13 Gm7
    { root: 48, notes: [53, 55, 58, 60] }, // 14 C7sus4
    { root: 41, notes: [53, 57, 60, 64] }, // 15 Fmaj7
    { root: 41, notes: [53, 55, 57, 60] }  // 16 Fadd9（つぎのループへ やわらかく）
  ];

  // メロディ（オルゴール）: [拍, 音, 長さ(拍)]。すきまを多く、ゆったり。
  var MELODY = [
    [[0, 72, 1.5], [1.5, 69, 0.5], [2, 67, 2]],              //  1 C A G
    [[0, 69, 1], [1, 72, 1], [2, 76, 2]],                    //  2 A C E
    [[0, 74, 1.5], [1.5, 72, 0.5], [2, 70, 1], [3, 69, 1]],  //  3 D C Bb A
    [[0, 67, 3]],                                            //  4 G
    [[0, 72, 1.5], [1.5, 74, 0.5], [2, 72, 1], [3, 69, 1]],  //  5 C D C A
    [[0, 74, 2], [2, 77, 2]],                                //  6 D F
    [[0, 76, 1], [1, 74, 1], [2, 70, 2]],                    //  7 E D Bb
    [[0, 72, 3]],                                            //  8 C
    [[0, 74, 1], [1, 77, 1], [2, 81, 2]],                    //  9 D F A（空へ のぼる）
    [[0, 79, 1.5], [1.5, 76, 0.5], [2, 72, 2]],              // 10 G E C
    [[0, 76, 1], [1, 79, 1], [2, 76, 1], [3, 72, 1]],        // 11 E G E C
    [[0, 74, 3]],                                            // 12 D
    [[0, 70, 1], [1, 74, 1], [2, 77, 1.5], [3.5, 76, 0.5]],  // 13 Bb D F E
    [[0, 74, 2], [2, 72, 2]],                                // 14 D C
    [[0, 69, 1.5], [1.5, 67, 0.5], [2, 65, 2]],              // 15 A G F（おりて くる）
    []                                                       // 16 休み（ひと呼吸）
  ];

  // 木琴の分散和音: 2拍ごとに3音をゆっくり（8分音符）
  var ARP_PATTERN = [0, 1, 2, 1]; // 和音の何番目か（各小節の 0, 0.5, 1, 1.5 ... で使う）

  // ---------------------------------------------------------------
  // 状態
  // ---------------------------------------------------------------
  var ctx = null;
  var master = null;      // 消音用
  var bgmBus = null;      // BGM主音量（ダッキングもここ）
  var sfxBus = null;
  var limiter = null;
  var playing = false;
  var muted = false;
  var timer = null;
  var nextBarTime = 0;
  var barIndex = 0;
  var duckUntil = 0;

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function ensureCtx() {
    if (ctx) return ctx;
    try {
      ctx = new AC();
      limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.knee.value = 8;
      limiter.ratio.value = 6;
      limiter.attack.value = 0.005;
      limiter.release.value = 0.25;

      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;

      sfxBus = ctx.createGain();
      sfxBus.gain.value = SFX_VOLUME;

      sfxBus.connect(master);
      master.connect(limiter);
      limiter.connect(ctx.destination);
    } catch (e) {
      ctx = null;
    }
    return ctx;
  }

  function resume() {
    try {
      if (ctx && ctx.state !== 'running' && ctx.resume) {
        var p = ctx.resume();
        if (p && p.catch) p.catch(noop);
      }
    } catch (e) { /* なにもしない */ }
  }

  // ---------------------------------------------------------------
  // 音色
  // ---------------------------------------------------------------
  // エンベロープつきの1音（サイン系）。dest に出す。
  function tone(dest, type, freq, t, attack, decay, peak, endFreq) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + attack + decay * 0.6);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + attack + decay + 0.05);
    return o;
  }

  // オルゴール: 基音＋倍音（高い倍音ははやく消える）
  function musicBox(dest, midi, t, vel, ring) {
    var f = mtof(midi);
    ring = ring || 1.4;
    tone(dest, 'sine', f, t, 0.004, ring, 0.55 * vel);
    tone(dest, 'sine', f * 2, t, 0.003, ring * 0.45, 0.16 * vel);
    tone(dest, 'sine', f * 4.02, t, 0.002, 0.12, 0.05 * vel);
  }

  // 木琴（やわらかいマリンバ寄り）
  function mallet(dest, midi, t, vel) {
    var f = mtof(midi);
    tone(dest, 'sine', f, t, 0.006, 0.55, 0.42 * vel);
    tone(dest, 'sine', f * 3.98, t, 0.002, 0.06, 0.06 * vel);
  }

  // やわらかいパッド: 少しずらした三角波2本＋ローパス、ゆっくり立ち上がる
  function pad(dest, midi, t, len, vel) {
    var f = mtof(midi);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.3;
    var g = ctx.createGain();
    var a = Math.min(0.9, len * 0.3);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.09 * vel, t + a);
    g.gain.setValueAtTime(0.09 * vel, t + len - 0.2);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.9);
    lp.connect(g);
    g.connect(dest);
    [-5, 5].forEach(function (cents) {
      var o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      o.detune.value = cents;
      o.connect(lp);
      o.start(t);
      o.stop(t + len + 1.0);
    });
  }

  // まるいベース
  function bass(dest, midi, t, len) {
    var f = mtof(midi);
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.30, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.12, t + len * 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + len);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + len + 0.05);
  }

  // ---------------------------------------------------------------
  // BGM の予約（スケジューラ）
  // ---------------------------------------------------------------
  function scheduleBar(bus, i, t) {
    var ch = CHORDS[i];
    // パッド（小節いっぱい）
    for (var k = 0; k < ch.notes.length; k++) pad(bus, ch.notes[k], t, BAR, 1);
    // ベース（1拍目と3拍目、小さく）
    bass(bus, ch.root, t, BEAT * 2);
    bass(bus, ch.root + (i % 4 === 3 ? 7 : 0), t + BEAT * 2, BEAT * 2);
    // 木琴の分散和音（8分音符・和音の上の3音を1オクターブ上で）
    var up = [ch.notes[1] + 12, ch.notes[2] + 12, ch.notes[3] + 12];
    for (var s = 0; s < 8; s++) {
      if (i === 15 && s >= 6) break; // 最後の小節はすこし早めに しずかに
      var n = up[ARP_PATTERN[s % 4]];
      var vel = (s % 2 === 0) ? 0.55 : 0.38;
      mallet(bus, n, t + s * BEAT * 0.5, vel);
    }
    // メロディ（オルゴール）
    var mel = MELODY[i];
    for (var m = 0; m < mel.length; m++) {
      var ev = mel[m];
      musicBox(bus, ev[1], t + ev[0] * BEAT, 0.9, Math.max(0.9, ev[2] * BEAT * 1.3));
    }
  }

  function scheduler() {
    if (!playing || !ctx) return;
    var now = ctx.currentTime;
    // 裏のタブなどで大きく遅れたら、まとめ鳴りしないよう今にあわせる
    if (nextBarTime < now - 0.05) {
      nextBarTime = now + 0.1;
    }
    while (nextBarTime < now + LOOKAHEAD) {
      scheduleBar(bgmBus, barIndex, nextBarTime);
      nextBarTime += BAR;
      barIndex = (barIndex + 1) % BARS;
    }
  }

  // ---------------------------------------------------------------
  // ダッキング: 効果音のあいだ BGM を少し下げる
  // ---------------------------------------------------------------
  function duck(length) {
    if (!bgmBus || !playing) return;
    var now = ctx.currentTime;
    var g = bgmBus.gain;
    var low = BGM_VOLUME * DUCK_RATIO;
    var end = Math.max(duckUntil, now + length);
    duckUntil = end;
    try {
      g.cancelScheduledValues(now);
      g.setValueAtTime(g.value, now);
      g.linearRampToValueAtTime(low, now + 0.06);
      g.setValueAtTime(low, end);
      g.linearRampToValueAtTime(BGM_VOLUME, end + 0.5);
    } catch (e) { /* なにもしない */ }
  }

  // ---------------------------------------------------------------
  // 効果音
  // ---------------------------------------------------------------
  var SFX = {
    // 「ぽん」: 木の実をはじくような まるい音（約0.15秒）
    tap: function (t) {
      tone(sfxBus, 'sine', 740, t, 0.004, 0.14, 0.55, 520);
      tone(sfxBus, 'sine', 1480, t, 0.002, 0.05, 0.08);
      return 0.2;
    },
    // 「ピロリン」: 上がる3音（A5 C6 F6）、鳥が1つ進む 600ms に合わせる
    correct: function (t) {
      var notes = [81, 84, 89];
      var at = [0, 0.13, 0.26];
      for (var i = 0; i < 3; i++) {
        var ring = i === 2 ? 0.75 : 0.45;
        musicBox(sfxBus, notes[i], t + at[i], 0.7 + i * 0.1, ring);
      }
      return 0.65;
    },
    // 「ぽわん」: やさしく ゆれて 下がる低めの音（ブザーではない）
    retry: function (t) {
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1200;
      lp.connect(sfxBus);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.55, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      g.connect(lp);
      [0, 7].forEach(function (cents, idx) {
        var o = ctx.createOscillator();
        o.type = idx === 0 ? 'sine' : 'triangle';
        o.frequency.setValueAtTime(mtof(67), t);           // G4
        o.frequency.exponentialRampToValueAtTime(mtof(62), t + 0.4); // D4 へ ふわっと
        o.detune.value = cents;
        var og = ctx.createGain();
        og.gain.value = idx === 0 ? 0.8 : 0.25;
        o.connect(og);
        og.connect(g);
        // ほんの少しの ゆれ
        var lfo = ctx.createOscillator();
        var lg = ctx.createGain();
        lfo.frequency.value = 5;
        lg.gain.value = 6;
        lfo.connect(lg);
        lg.connect(o.detune);
        o.start(t); lfo.start(t);
        o.stop(t + 0.65); lfo.stop(t + 0.65);
      });
      return 0.6;
    },
    // 短いファンファーレ: 0.0〜0.6秒で のぼって、0.8秒（スタンプの「ドン」）に いちばん強い和音
    clear: function (t) {
      var lead = [[0.0, 72], [0.2, 74], [0.4, 76], [0.6, 79]]; // C D E G（のぼる）
      for (var i = 0; i < lead.length; i++) {
        musicBox(sfxBus, lead[i][1], t + lead[i][0], 0.35 + i * 0.07, 0.5);
      }
      var hit = t + 0.8;
      // いちばん強い音: F の和音（F5 A5 C6 F6）＋ まるい低音 F3
      [77, 81, 84, 89].forEach(function (m, k) {
        musicBox(sfxBus, m, hit, k === 3 ? 0.55 : 0.6, 1.6);
      });
      tone(sfxBus, 'sine', mtof(53), hit, 0.01, 1.2, 0.45);
      tone(sfxBus, 'sine', mtof(41), hit, 0.015, 1.0, 0.25);
      // 余韻のきらきら（小さく）
      musicBox(sfxBus, 93, hit + 0.35, 0.18, 0.8);
      return 2.0;
    }
  };

  // ---------------------------------------------------------------
  // 公開する関数
  // ---------------------------------------------------------------
  function start() {
    try {
      if (!ensureCtx()) return;
      resume();
      if (playing) return;
      playing = true;
      // 前の bgmBus（停止中のフェードアウト分）とは別に、新しい bus を作る
      bgmBus = ctx.createGain();
      bgmBus.connect(master);
      var now = ctx.currentTime;
      bgmBus.gain.setValueAtTime(0.0001, now);
      bgmBus.gain.linearRampToValueAtTime(BGM_VOLUME, now + FADE_IN);
      duckUntil = 0;
      barIndex = 0;
      nextBarTime = now + 0.15;
      scheduler();
      timer = setInterval(scheduler, TICK_MS);
    } catch (e) { /* ゲームを止めない */ }
  }

  function stop() {
    try {
      if (!ctx || !playing) return;
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      var bus = bgmBus;
      bgmBus = null;
      var now = ctx.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setValueAtTime(bus.gain.value, now);
      bus.gain.linearRampToValueAtTime(0.0001, now + FADE_OUT);
      setTimeout(function () {
        try { bus.disconnect(); } catch (e) { /* なにもしない */ }
      }, (FADE_OUT + LOOKAHEAD + 1.5) * 1000);
    } catch (e) { /* ゲームを止めない */ }
  }

  function setMuted(flag) {
    muted = !!flag;
    try {
      if (!ctx || !master) return;
      if (!muted) resume();
      var now = ctx.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(muted ? 0 : 1, now + 0.25);
    } catch (e) { /* ゲームを止めない */ }
  }

  function play(name) {
    try {
      if (muted) return;
      var fn = SFX[name];
      if (!fn) return;
      if (!ensureCtx()) return;
      resume();
      var t = ctx.currentTime + 0.02;
      var len = fn(t);
      duck(len + 0.1);
    } catch (e) { /* ゲームを止めない */ }
  }

  global.Sound = {
    start: start,
    stop: stop,
    setMuted: setMuted,
    play: play,
    isMuted: function () { return muted; },
    // テスト・確認用（読むだけ）
    info: {
      available: true,
      tempo: TEMPO,
      key: 'F major',
      bars: BARS,
      loopSeconds: BAR * BARS,
      bgmVolume: BGM_VOLUME,
      sfxVolume: SFX_VOLUME,
      get state() { return ctx ? ctx.state : 'none'; },
      get bgmGain() { return bgmBus ? bgmBus.gain.value : 0; }
    }
  };
})(window);
