/*
 * bgm.js — 02 BGM・効果音担当（sound-maker）
 * 案件: kotoba-jiten「ことばの じてんを つくろう」 テーマ「図書室の手製本」
 *
 * 音楽ファイルは使わず、Web Audio API でその場で鳴らすオリジナル曲と効果音。
 * 外部音源なし・file:// で動く。AudioContext が使えないときは何もしない関数になる。
 *
 * 決まった使い方（game-builder とのつなぎ方）:
 *   Sound.start()            // BGMを小さくフェードインして開始（「はじめる」のクリックで呼ぶ）
 *   Sound.stop()             // BGMをフェードアウトして止める
 *   Sound.setMuted(bool)     // おと あり／なし（いつでも。start 前でもよい）
 *   Sound.play('tap' | 'correct' | 'retry' | 'clear')
 *
 * おまけ（使わなくてもよい）:
 *   Sound.play('page')       // ページをめくる音（じてんを開く／とじる など）
 *   Sound.play('stamp')      // はんこの「ぽん」だけ
 *   Sound.play('review')     // ふり返り・ページ完成のあたたかい和音
 *   Sound.duck(bool)         // 読み上げ中など、BGMを長めに下げる（true）／もどす（false）
 *   Sound.isMuted() / Sound.isPlaying()
 *   知らない名前を play() に渡しても、何もしないだけ（エラーにしない）。
 *
 * 曲: 「しずかな 書架」 F長調・4/4・テンポ84・16小節ループ（約46秒）
 *   オルゴール（主旋律）・木琴（ときどき合いの手）・やわらかいピアノ（低音）・やわらかいパッド（和音）
 *   ドラムなし。
 */
(function (global) {
  'use strict';

  /* ---------- 音量（ルール: BGM 0.08〜0.12 / 効果音 0.3 以下） ---------- */
  var BGM_VOL = 0.1;        // BGM の主音量
  var SFX_MAX = 0.28;       // 効果音1音の最大
  var SFX_BUS = 0.33;       // 効果音全体（和音が重なっても出口でピーク0.3以下）
  var DUCK_LEVEL = 0.55;    // 効果音中、BGM をこの割合まで少し下げる
  var SPEAK_DUCK = 0.45;    // 読み上げ中の下げ方
  var FADE_IN = 3.0;        // 秒
  var FADE_OUT = 1.2;

  var BPM = 84;
  var BEAT = 60 / BPM;
  var BAR = BEAT * 4;

  var AC = global.AudioContext || global.webkitAudioContext;

  function noop() {}

  if (!AC) {
    global.Sound = {
      start: noop, stop: noop, setMuted: noop, play: noop, duck: noop,
      isMuted: function () { return true; }, isPlaying: function () { return false; },
      available: false
    };
    return;
  }

  var ctx = null;
  var master, comp, sfxBus, duckNode, reverb, reverbIn, noiseBuf;
  var music = null;        // { gain, nextBar, barIndex, loop }
  var timer = null;
  var muted = false;
  var playing = false;
  var speakDuck = false;
  var duckUntil = 0;
  var suspendTimer = null;

  /* ---------- 準備 ---------- */
  function ensure() {
    if (ctx) return true;
    try {
      ctx = new AC();
      comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 3;
      comp.attack.value = 0.01;
      comp.release.value = 0.25;
      comp.connect(ctx.destination);

      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(comp);

      // やわらかい残響（図書室の静かな響き）
      reverb = ctx.createConvolver();
      reverb.buffer = makeImpulse(1.8);
      var wet = ctx.createGain();
      wet.gain.value = 0.22;
      reverb.connect(wet);
      wet.connect(master);
      reverbIn = ctx.createGain();
      reverbIn.gain.value = 1;
      reverbIn.connect(reverb);

      duckNode = ctx.createGain();
      duckNode.gain.value = 1;
      duckNode.connect(master);
      duckNode.connect(reverbIn);

      sfxBus = ctx.createGain();
      sfxBus.gain.value = SFX_BUS;
      sfxBus.connect(master);
      var sfxWet = ctx.createGain();
      sfxWet.gain.value = 0.35;
      sfxBus.connect(sfxWet);
      sfxWet.connect(reverbIn);

      noiseBuf = makeNoise(1.0);

      document.addEventListener('visibilitychange', onVisibility);
      return true;
    } catch (e) {
      ctx = null;
      return false;
    }
  }

  function makeImpulse(sec) {
    var len = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      for (var i = 0; i < len; i++) {
        var t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3) * 0.6;
      }
    }
    return buf;
  }

  function makeNoise(sec) {
    var len = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    var last = 0;
    for (var i = 0; i < len; i++) {
      // 少しだけ低めにした白色雑音（紙のこすれ）
      var w = Math.random() * 2 - 1;
      last = last * 0.35 + w * 0.65;
      d[i] = last;
    }
    return buf;
  }

  function resume() {
    if (ctx && ctx.state === 'suspended' && !muted && !document.hidden) {
      try { ctx.resume(); } catch (e) {}
    }
  }

  function onVisibility() {
    if (!ctx) return;
    try {
      if (document.hidden) ctx.suspend();
      else resume();
    } catch (e) {}
  }

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* ---------- 音色 ---------- */
  // 包絡: 立ち上がり a 秒でピーク peak、その後 decay 秒で消える
  function env(g, t, peak, a, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + decay);
  }

  function osc(type, freq, t, stop, dest, peak, a, decay, detune) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (detune) o.detune.setValueAtTime(detune, t);
    env(g, t, peak, a, decay);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(stop);
    return o;
  }

  // オルゴール: 正弦波＋高い倍音を少し（澄んだ金属のくし）
  function musicBox(t, midi, vel, dest) {
    var f = mtof(midi);
    var d = 1.6;
    osc('sine', f, t, t + d + 0.1, dest, 0.5 * vel, 0.004, d);
    osc('sine', f * 2, t, t + 0.8, dest, 0.12 * vel, 0.003, 0.6);
    osc('sine', f * 5.04, t, t + 0.3, dest, 0.05 * vel, 0.002, 0.18);
  }

  // 木琴（マリンバ風）: 正弦波＋4倍音が速く消える
  function marimba(t, midi, vel, dest) {
    var f = mtof(midi);
    osc('sine', f, t, t + 0.9, dest, 0.45 * vel, 0.003, 0.7);
    osc('sine', f * 3.98, t, t + 0.15, dest, 0.08 * vel, 0.002, 0.08);
  }

  // やわらかいピアノ（低音）: 三角波を低域フィルターで丸く
  function softPiano(t, midi, vel, dur, dest) {
    var f = mtof(midi);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1400, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + dur);
    lp.Q.value = 0.3;
    lp.connect(dest);
    osc('triangle', f, t, t + dur + 0.2, lp, 0.5 * vel, 0.008, dur);
    osc('sine', f * 2, t, t + dur * 0.6, lp, 0.12 * vel, 0.008, dur * 0.5);
  }

  // やわらかいパッド: ゆっくり立ち上がる和音
  function pad(t, midis, dur, dest) {
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.Q.value = 0.2;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.12, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    lp.connect(g);
    g.connect(dest);
    for (var i = 0; i < midis.length; i++) {
      var f = mtof(midis[i]);
      [-6, 6].forEach(function (dt) {
        var o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = f;
        o.detune.value = dt;
        var og = ctx.createGain();
        og.gain.value = 0.25 / midis.length;
        o.connect(og);
        og.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.7);
      });
    }
  }

  // 紙の音（雑音を帯域フィルターに通す）
  function paper(t, dur, f1, f2, peak, dest) {
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(f1, t);
    bp.frequency.exponentialRampToValueAtTime(f2, t + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // はんこの「ぽん」: 低い正弦波が少し下がる＋やわらかい当たり
  function stampPon(t, dest, vel) {
    vel = vel || 1;
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(330, t);
    o.frequency.exponentialRampToValueAtTime(170, t + 0.12);
    env(g, t, SFX_MAX * 0.85 * vel, 0.004, 0.22);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + 0.3);
    // 朱肉の紙に当たる小さな音
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1200;
    var ng = ctx.createGain();
    env(ng, t, 0.06 * vel, 0.002, 0.05);
    src.connect(lp);
    lp.connect(ng);
    ng.connect(dest);
    src.start(t);
    src.stop(t + 0.1);
  }

  /* ---------- 曲「しずかな 書架」（オリジナル） ---------- */
  // F長調。MIDI: F4=65 G4=67 A4=69 Bb4=70 C5=72 D5=74 E5=76 F5=77
  // 各小節: [和音(パッド), 低音[1拍目,3拍目], 旋律 [[拍, 音, 長さ], ...]]
  var SONG = [
    [[65, 69, 72], [41, 48], [[0, 72, 1], [1, 69, .5], [1.5, 70, .5], [2, 72, 1.5]]],
    [[62, 65, 69], [38, 45], [[0, 74, 1], [1, 72, 1], [2, 69, 2]]],
    [[62, 65, 70], [46, 41], [[0, 70, .5], [.5, 69, .5], [1, 67, 1], [2, 70, 1], [3, 74, 1]]],
    [[64, 67, 72], [48, 43], [[0, 72, 3], [3, 67, 1]]],
    [[65, 69, 72], [41, 48], [[0, 69, 1], [1, 72, 1], [2, 77, 1.5], [3.5, 76, .5]]],
    [[64, 69, 72], [45, 40], [[0, 76, 1], [1, 72, 1], [2, 69, 2]]],
    [[62, 65, 70], [46, 41], [[0, 74, 1], [1, 72, .5], [1.5, 70, .5], [2, 69, 1], [3, 67, 1]]],
    [[64, 67, 72], [48, 43], [[0, 67, 2], [2, 72, 2]]],
    [[62, 65, 69], [38, 45], [[0, 74, 1.5], [1.5, 72, .5], [2, 74, 1], [3, 77, 1]]],
    [[62, 65, 70], [46, 41], [[0, 74, 2], [2, 70, 1], [3, 72, 1]]],
    [[65, 69, 72], [41, 48], [[0, 72, 1], [1, 69, 1], [2, 65, 1], [3, 69, 1]]],
    [[64, 67, 72], [48, 43], [[0, 67, 3], [3, 72, 1]]],
    [[62, 65, 70], [46, 41], [[0, 74, 1], [1, 77, 1], [2, 74, 1], [3, 72, 1]]],
    [[62, 67, 70], [43, 38], [[0, 70, 1.5], [1.5, 69, .5], [2, 67, 2]]],
    [[65, 67, 72], [48, 43], [[0, 69, 1], [1, 70, 1], [2, 72, 1], [3, 76, 1]]],
    [[65, 69, 72], [41, 41], [[0, 77, 3]]]
  ];

  function scheduleBar(m, t) {
    var bar = SONG[m.barIndex];
    var dest = m.gain;
    // パッド（和音）
    pad(t, bar[0], BAR * 0.95, dest);
    // 低音（やわらかいピアノ）
    softPiano(t, bar[1][0], 0.55, BEAT * 1.8, dest);
    softPiano(t + BEAT * 2, bar[1][1], 0.42, BEAT * 1.8, dest);
    // 主旋律（オルゴール、1オクターブ上）
    var mel = bar[2];
    for (var i = 0; i < mel.length; i++) {
      var n = mel[i];
      var vel = (n[0] === 0 ? 0.62 : 0.5) + (Math.random() * 0.06 - 0.03);
      musicBox(t + n[0] * BEAT + Math.random() * 0.008, n[1] + 12, vel, dest);
    }
    // 木琴の合いの手: 2回目のくりかえしの、偶数小節の4拍目だけ（さりげなく）
    if (m.loop % 2 === 1 && m.barIndex % 2 === 1) {
      var c = bar[0];
      marimba(t + BEAT * 3, c[2], 0.35, dest);
      marimba(t + BEAT * 3.5, c[1], 0.3, dest);
    }
    m.barIndex++;
    if (m.barIndex >= SONG.length) { m.barIndex = 0; m.loop++; }
  }

  function tick() {
    if (!ctx || !music) return;
    var now = ctx.currentTime;
    // 長く止まっていた場合は、まとめて鳴らさずに今からはじめる
    if (music.nextBar < now - 0.1) music.nextBar = now + 0.1;
    while (music.nextBar < now + 0.6) {
      scheduleBar(music, music.nextBar);
      music.nextBar += BAR;
    }
  }

  /* ---------- ダッキング ---------- */
  function applyDuck(holdSec) {
    if (!ctx) return;
    var now = ctx.currentTime;
    var p = duckNode.gain;
    var low = speakDuck ? Math.min(SPEAK_DUCK, DUCK_LEVEL) : DUCK_LEVEL;
    try {
      p.cancelScheduledValues(now);
      p.setValueAtTime(p.value, now);
      p.linearRampToValueAtTime(low, now + 0.06);
      duckUntil = Math.max(duckUntil, now + holdSec);
      if (!speakDuck) {
        p.setValueAtTime(low, duckUntil);
        p.linearRampToValueAtTime(1, duckUntil + 0.6);
      }
    } catch (e) {}
  }

  /* ---------- 効果音 ---------- */
  var SFX = {
    // 本・ボタン・マスを押す: 紙をめくる軽い音＋小さな「ぽん」
    tap: function (t, d) {
      paper(t, 0.09, 2600, 5200, 0.42, d);
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(720, t);
      o.frequency.exponentialRampToValueAtTime(520, t + 0.06);
      env(g, t, 0.5, 0.003, 0.09);
      o.connect(g); g.connect(d);
      o.start(t); o.stop(t + 0.15);
      return 0.15;
    },
    // 正解: はんこの「ぽん」→ 上がる「ピロリン」
    correct: function (t, d) {
      stampPon(t, d, 1);
      var notes = [81, 84, 89];          // A5 C6 F6
      for (var i = 0; i < notes.length; i++) {
        musicBox(t + 0.12 + i * 0.085, notes[i], 0.42, d);
      }
      return 0.9;
    },
    // まちがい: やさしい低めの「ぽわん」（ブザーにしない）
    retry: function (t, d) {
      var lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      lp.connect(d);
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(mtof(67), t);           // G4
      o.frequency.linearRampToValueAtTime(mtof(64), t + 0.35); // → E4 へゆっくり
      var lfo = ctx.createOscillator();
      var lg = ctx.createGain();
      lfo.frequency.value = 5;
      lg.gain.value = 4;
      lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.36, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g); g.connect(lp);
      o.start(t); o.stop(t + 0.65);
      lfo.start(t); lfo.stop(t + 0.65);
      // ふわっとした下の音
      osc('sine', mtof(52), t + 0.02, t + 0.6, lp, 0.12, 0.06, 0.45);
      return 0.6;
    },
    // ステップクリア: 短いファンファーレ（オルゴールと木琴）
    clear: function (t, d) {
      var arp = [77, 81, 84];             // F5 A5 C6
      for (var i = 0; i < arp.length; i++) {
        marimba(t + i * 0.13, arp[i], 0.5, d);
      }
      var t2 = t + 0.42;
      [77, 81, 84, 89].forEach(function (m, k) {
        musicBox(t2 + k * 0.012, m, 0.3, d);
      });
      marimba(t2, 65, 0.4, d);
      osc('sine', mtof(53), t2, t2 + 1.4, d, 0.1, 0.02, 1.2);
      return 1.6;
    },
    // ページをめくる: すこし長い紙の音＋おさえる音
    page: function (t, d) {
      paper(t, 0.32, 900, 4200, 0.5, d);
      paper(t + 0.2, 0.12, 3000, 1500, 0.26, d);
      return 0.4;
    },
    // はんこの「ぽん」だけ
    stamp: function (t, d) {
      stampPon(t, d, 1);
      return 0.3;
    },
    // ふり返り・ページ完成: あたたかい上りの和音
    review: function (t, d) {
      var up = [65, 69, 72, 77, 81, 84];
      for (var i = 0; i < up.length; i++) {
        musicBox(t + i * 0.11, up[i] + 12, 0.32, d);
      }
      pad(t + 0.3, [65, 69, 72, 77], 1.6, d);
      softPiano(t + 0.3, 41, 0.5, 1.6, d);
      return 2.2;
    }
  };
  // 呼び名のゆれ（念のため）
  SFX.select = SFX.tap;
  SFX.pon = SFX.tap;
  SFX.wrong = SFX.retry;
  SFX.flip = SFX.page;
  SFX.open = SFX.page;
  SFX.close = SFX.page;
  SFX.complete = SFX.review;
  SFX.reflect = SFX.review;

  /* ---------- 公開する関数 ---------- */
  function start() {
    try {
      if (!ensure()) return;
      resume();
      if (playing && music) return;
      playing = true;
      var g = ctx.createGain();
      var now = ctx.currentTime;
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(BGM_VOL, now + FADE_IN);
      g.connect(duckNode);
      music = { gain: g, nextBar: now + 0.15, barIndex: 0, loop: 0 };
      tick();
      if (!timer) timer = setInterval(tick, 120);
    } catch (e) {}
  }

  function stop() {
    try {
      playing = false;
      if (timer) { clearInterval(timer); timer = null; }
      if (!ctx || !music) { music = null; return; }
      var g = music.gain;
      var now = ctx.currentTime;
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(g.gain.value, now);
      g.gain.linearRampToValueAtTime(0.0001, now + FADE_OUT);
      setTimeout(function () { try { g.disconnect(); } catch (e) {} }, (FADE_OUT + 3) * 1000);
      music = null;
    } catch (e) {}
  }

  function setMuted(flag) {
    muted = !!flag;
    if (!ctx) return;
    try {
      var now = ctx.currentTime;
      if (suspendTimer) { clearTimeout(suspendTimer); suspendTimer = null; }
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      if (muted) {
        master.gain.linearRampToValueAtTime(0, now + 0.15);
        // 消したあとは止めておく（CPUを使わない）
        suspendTimer = setTimeout(function () {
          if (muted && ctx) { try { ctx.suspend(); } catch (e) {} }
        }, 250);
      } else {
        resume();
        master.gain.linearRampToValueAtTime(1, now + 0.4);
      }
    } catch (e) {}
  }

  function play(name) {
    try {
      var fn = SFX[name];
      if (!fn || muted) return;
      if (!ensure()) return;
      resume();
      var t = ctx.currentTime + 0.01;
      var len = fn(t, sfxBus);
      applyDuck(len || 0.4);
    } catch (e) {}
  }

  function duck(on) {
    try {
      speakDuck = !!on;
      if (!ctx) return;
      if (speakDuck) {
        applyDuck(0.1);
      } else {
        var now = ctx.currentTime;
        var p = duckNode.gain;
        p.cancelScheduledValues(now);
        p.setValueAtTime(p.value, now);
        p.linearRampToValueAtTime(1, Math.max(now, duckUntil) + 0.6);
      }
    } catch (e) {}
  }

  global.Sound = {
    start: start,
    stop: stop,
    setMuted: setMuted,
    play: play,
    duck: duck,
    isMuted: function () { return muted; },
    isPlaying: function () { return playing; },
    available: true
  };
})(window);
