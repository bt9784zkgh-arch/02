/*
 * bgm.js  せんたくの めいきゅう  BGM・効果音（チーム02 sound-maker）
 *
 * 音楽ファイルは使わず、Web Audio API でその場で鳴らすオリジナル曲。
 *   曲名: 「よるの じゅうたん」
 *   ヘ長調（F major）／4分の4拍子／テンポ 80／16小節ループ（約48秒）
 *   音色: オルゴール（メロディ＋1オクターブ下のやわらかい重ね）
 *         ＋ 中音域のオルゴール分散和音（8分音符）
 *         ＋ 切れ目なく続くやわらかいパッド（小節どうしを重ねてつなぐ）
 *         ＋ ベース（低音＋1オクターブ上の倍音で、ノートPCのスピーカーでも聞こえる）
 *   ドラムなし。音は 200〜800Hz の中音域を中心に置き、無音の時間をつくらない。
 *
 * 使い方（決まった形）:
 *   Sound.start()            BGMを小さくフェードインして開始（最初のクリックの中で呼ぶ）
 *   Sound.stop()             BGMをフェードアウトして止める
 *   Sound.setMuted(bool)     おと あり／なし（効果音もまとめて消える）
 *   Sound.play(name)         'tap' | 'correct' | 'retry' | 'clear' | 'breath' | 'future'
 *                            知らない名前は何もしない
 *   おまけ: Sound.isMuted() / Sound.isAvailable()
 *
 * 音量: BGM 主音量 0.12、効果音 0.3 以下。効果音のあいだ BGM を少し下げる（ダッキング）。
 * AudioContext が使えないときは、すべて何もしない関数になる（ゲームは止まらない）。
 */
(function (global) {
  'use strict';

  var AC = global.AudioContext || global.webkitAudioContext;
  var noop = function () {};

  if (!AC) {
    global.Sound = {
      start: noop, stop: noop, setMuted: noop, play: noop,
      isMuted: function () { return false; },
      isAvailable: function () { return false; }
    };
    return;
  }

  /* ---------- 設定 ---------- */
  var BGM_VOLUME = 0.12;   // BGM 主音量（0.08〜0.12 の上限）
  var BGM_TRIM = 1.5;     // コンプレッサーに入る前の音量合わせ（主音量ではない）
  var SFX_VOLUME = 0.28;   // 効果音の上限（0.3 以下）
  var DUCK_LEVEL = 0.5;    // 効果音のあいだ BGM をこの割合まで下げる
  var TEMPO = 80;
  var BEAT = 60 / TEMPO;          // 0.75 秒
  var BAR = BEAT * 4;             // 3 秒
  var LOOKAHEAD = 0.25;           // 先読み（秒）
  var TICK_MS = 50;

  /* ---------- 楽譜（オリジナル） ---------- */
  // 和音: pad = パッドの音（MIDI・中音域 200〜450Hz）、bass = ベースの根音、arp = 分散和音
  var CH = {
    Fmaj7:  { pad: [57, 60, 64, 65], bass: 41, arp: [60, 64, 65, 69] },
    Am7:    { pad: [57, 60, 64, 67], bass: 45, arp: [57, 60, 64, 67] },
    Bbmaj7: { pad: [58, 62, 65, 69], bass: 46, arp: [58, 62, 65, 69] },
    C:      { pad: [55, 60, 64, 67], bass: 48, arp: [55, 60, 64, 67] },
    Dm7:    { pad: [57, 60, 62, 65], bass: 50, arp: [57, 60, 62, 65] },
    Gm7:    { pad: [55, 58, 62, 65], bass: 43, arp: [55, 58, 62, 65] },
    Csus:   { pad: [55, 60, 65, 67], bass: 48, arp: [55, 60, 65, 67] },
    FA:     { pad: [57, 60, 65, 69], bass: 45, arp: [57, 60, 65, 69] }
  };

  // 16小節。mel = [拍, MIDI, 長さ(拍)]
  var SONG = [
    { c: 'Fmaj7',  mel: [[0, 72, 1], [1, 69, 0.5], [1.5, 72, 0.5], [2, 77, 1.5]] },
    { c: 'Am7',    mel: [[0, 76, 1], [1, 72, 1], [2, 69, 2]] },
    { c: 'Bbmaj7', mel: [[0, 74, 0.5], [0.5, 77, 0.5], [1, 81, 1.5], [3, 79, 1]] },
    { c: 'C',      mel: [[0, 76, 1.5], [2, 79, 2]] },
    { c: 'Dm7',    mel: [[0, 77, 1], [1, 74, 1], [2, 72, 1], [3, 69, 1]] },
    { c: 'Am7',    mel: [[0, 72, 1.5], [1.5, 76, 0.5], [2, 74, 2]] },
    { c: 'Gm7',    mel: [[0, 70, 1], [1, 74, 1], [2, 79, 1], [3, 77, 1]] },
    { c: 'Csus',   mel: [[0, 76, 3]] },
    { c: 'Bbmaj7', mel: [[0, 74, 1], [1, 77, 0.5], [1.5, 81, 0.5], [2, 79, 2]] },
    { c: 'Am7',    mel: [[0, 81, 1], [1, 79, 0.5], [1.5, 76, 0.5], [2, 72, 2]] },
    { c: 'Dm7',    mel: [[0, 74, 1], [1, 77, 1], [2, 81, 1.5]] },
    { c: 'Gm7',    mel: [[0, 79, 1], [1, 77, 1], [2, 74, 1], [3, 70, 1]] },
    { c: 'FA',     mel: [[0, 72, 1.5], [1.5, 69, 0.5], [2, 72, 1], [3, 77, 1]] },
    { c: 'Bbmaj7', mel: [[0, 74, 1], [1, 72, 1], [2, 69, 2]] },
    { c: 'Gm7',    mel: [[0, 70, 1], [1, 74, 1], [2, 72, 2]] },
    { c: 'Csus',   mel: [[0, 72, 2], [2.5, 67, 0.5], [3, 72, 1]] }
  ];
  // 分散和音のリズム（拍, arp の何番目, 強さ）。8分音符で切れ目なく、上がって下がる
  var ARP_PATTERN = [[0, 0, 1], [0.5, 1, 0.7], [1, 2, 0.85], [1.5, 3, 0.7],
                     [2, 2, 0.9], [2.5, 1, 0.7], [3, 2, 0.85], [3.5, 3, 0.7]];

  /* ---------- 状態 ---------- */
  var ctx = null;
  var master, bgmBus, bgmVol, duckBus, sfxBus, reverb, reverbSend, noiseBuf;
  var muted = false;
  var playing = false;
  var timer = null;
  var nextBarTime = 0;
  var barIndex = 0;
  var duckUntil = 0;

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  /* ---------- 準備 ---------- */
  function ensureCtx() {
    if (ctx) return true;
    try {
      ctx = new AC();
    } catch (e) {
      ctx = null;
      return false;
    }
    try {
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;

      // 全体: ゆるいコンプレッサーで急な大きい音をおさえる（聴覚過敏への配慮）
      var comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 4;
      comp.attack.value = 0.005;
      comp.release.value = 0.25;
      master.connect(comp);
      comp.connect(ctx.destination);

      duckBus = ctx.createGain();
      duckBus.gain.value = 1;
      duckBus.connect(master);

      // BGM だけのコンプレッサー: 音量の山と谷をならして、小さい音も聞こえやすくする
      // （効果音はここを通らないので、BGM の上ではっきり聞こえる）
      // 楽器 → bgmBus → bgmComp → bgmVol（主音量・フェード）→ duckBus（ダッキング）
      bgmVol = ctx.createGain();
      bgmVol.gain.value = 0;
      bgmVol.connect(duckBus);

      var bgmComp = ctx.createDynamicsCompressor();
      bgmComp.threshold.value = -24;
      bgmComp.knee.value = 10;
      bgmComp.ratio.value = 3;
      bgmComp.attack.value = 0.01;
      bgmComp.release.value = 0.3;
      bgmComp.connect(bgmVol);

      bgmBus = ctx.createGain();
      bgmBus.gain.value = BGM_TRIM;
      bgmBus.connect(bgmComp);

      sfxBus = ctx.createGain();
      sfxBus.gain.value = 1;
      sfxBus.connect(master);

      // 小さな部屋の響き（じゅうたんの部屋なので短め・やわらかめ）
      reverb = ctx.createConvolver();
      reverb.buffer = makeImpulse(2.2);
      var wet = ctx.createGain();
      wet.gain.value = 0.35;
      reverb.connect(wet);
      wet.connect(master);
      reverbSend = reverb;

      noiseBuf = makeNoise(1.0);
    } catch (e2) {
      ctx = null;
      return false;
    }
    return true;
  }

  function resume() {
    if (ctx && ctx.state !== 'running' && ctx.state !== 'closed' && ctx.resume) {
      try {
        var p = ctx.resume();
        if (p && p.catch) p.catch(function () {});
      } catch (e) {}
    }
  }

  function makeImpulse(sec) {
    var rate = ctx.sampleRate;
    var len = Math.floor(rate * sec);
    var buf = ctx.createBuffer(2, len, rate);
    for (var ch = 0; ch < 2; ch++) {
      var d = buf.getChannelData(ch);
      var lp = 0;
      for (var i = 0; i < len; i++) {
        var n = Math.random() * 2 - 1;
        lp = lp + 0.25 * (n - lp); // 高い音を少しけずって温かく
        d[i] = lp * Math.pow(1 - i / len, 3);
      }
    }
    return buf;
  }

  function makeNoise(sec) {
    var len = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /* ---------- 楽器 ---------- */
  // オルゴール: 基音 + 高い倍音（すぐ消える）。はっきり鳴って、ゆっくり消える
  function musicBox(dest, t, midi, vol, len, sendAmt) {
    var f = mtof(midi);
    var out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    out.gain.exponentialRampToValueAtTime(0.0001, t + len);
    out.connect(dest);
    if (sendAmt) {
      var s = ctx.createGain();
      s.gain.value = sendAmt;
      out.connect(s);
      s.connect(reverbSend);
    }

    var o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = f;
    o1.connect(out);

    var g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.25, t);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    var o2 = ctx.createOscillator();
    o2.type = 'sine';
    o2.frequency.value = f * 3.0;
    o2.connect(g2);
    g2.connect(out);

    var g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.08, t);
    g3.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    var o3 = ctx.createOscillator();
    o3.type = 'sine';
    o3.frequency.value = f * 5.4;
    o3.connect(g3);
    g3.connect(out);

    var end = t + len + 0.05;
    [o1, o2, o3].forEach(function (o) { o.start(t); o.stop(end); });
  }

  // やわらかいパッド: 少しずらした三角波2つ → ローパス。ゆっくり立ち上がって、ゆっくり消える
  function pad(dest, t, notes, vol, len) {
    var filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 900;
    filt.Q.value = 0.3;
    var g = ctx.createGain();
    var atk = Math.min(1.2, len * 0.4);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + atk);
    g.gain.setValueAtTime(vol, t + len - 0.6);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.8);
    filt.connect(g);
    g.connect(dest);
    var s = ctx.createGain();
    s.gain.value = 0.5;
    g.connect(s);
    s.connect(reverbSend);

    var per = 1 / notes.length;
    notes.forEach(function (m) {
      [-5, 5].forEach(function (cents) {
        var o = ctx.createOscillator();
        o.type = 'triangle';
        o.frequency.value = mtof(m);
        o.detune.value = cents;
        var og = ctx.createGain();
        og.gain.value = per * 0.5;
        o.connect(og);
        og.connect(filt);
        o.start(t);
        o.stop(t + len + 0.9);
      });
    });
  }

  function bass(dest, t, midi, vol, len) {
    var o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = mtof(midi);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + len + 0.05);
  }

  // BGM 用のパッド: 小節の頭で 0.6 秒かけて入り、次の小節に 1 秒重なって消える。
  // となりの小節と重なるので、音が途切れない。三角波＋少しののこぎり波で中音域に厚みを出す
  function warmPad(dest, t, notes, vol, len) {
    var filt = ctx.createBiquadFilter();
    filt.type = 'lowpass';
    filt.frequency.value = 1600;
    filt.Q.value = 0.4;
    var g = ctx.createGain();
    var xf = 0.6, rel = 1.0;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + xf);
    g.gain.setValueAtTime(vol, t + len);
    g.gain.linearRampToValueAtTime(0.0001, t + len + rel);
    filt.connect(g);
    g.connect(dest);
    var s = ctx.createGain();
    s.gain.value = 0.35;
    g.connect(s);
    s.connect(reverbSend);

    var per = 1 / notes.length;
    var end = t + len + rel + 0.05;
    notes.forEach(function (m) {
      [['triangle', -6, 0.45], ['triangle', 6, 0.45], ['sawtooth', 0, 0.12]].forEach(function (v) {
        var o = ctx.createOscillator();
        o.type = v[0];
        o.frequency.value = mtof(m);
        o.detune.value = v[1];
        var og = ctx.createGain();
        og.gain.value = per * v[2];
        o.connect(og);
        og.connect(filt);
        o.start(t);
        o.stop(end);
      });
    });
  }

  // ベース: 低い基音（サイン）＋ 1オクターブ上（三角波）。ノートPCでも音の動きがわかる
  function softBass(dest, t, midi, vol, len) {
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.06);
    g.gain.setTargetAtTime(vol * 0.55, t + 0.1, 0.5);
    g.gain.setValueAtTime(vol * 0.5, t + len - 0.15);
    g.gain.linearRampToValueAtTime(0.0001, t + len + 0.25);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    lp.connect(g);
    g.connect(dest);
    var o1 = ctx.createOscillator();
    o1.type = 'sine';
    o1.frequency.value = mtof(midi);
    var g1 = ctx.createGain();
    g1.gain.value = 0.6;
    var o2 = ctx.createOscillator();
    o2.type = 'triangle';
    o2.frequency.value = mtof(midi + 12);
    var g2 = ctx.createGain();
    g2.gain.value = 0.55;
    o1.connect(g1); g1.connect(lp);
    o2.connect(g2); g2.connect(lp);
    var end = t + len + 0.3;
    o1.start(t); o1.stop(end);
    o2.start(t); o2.stop(end);
  }

  // メロディを支える、1オクターブ下のやわらかい音（中音域に旋律を置く）
  function softDouble(dest, t, midi, vol, len) {
    var o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = mtof(midi);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(vol * 0.4, t + 0.5);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + len + 0.05);
  }

  /* ---------- BGM の進行（先読みスケジューラ） ---------- */
  function scheduleBar(i, t) {
    var bar = SONG[i];
    var ch = CH[bar.c];

    // パッド（切れ目なく）
    warmPad(bgmBus, t, ch.pad, 0.26, BAR);

    // ベース: 1拍目と3拍目
    softBass(bgmBus, t, ch.bass, 0.28, BEAT * 2);
    softBass(bgmBus, t + BEAT * 2, ch.bass, 0.22, BEAT * 2);

    // 分散和音: 中音域のオルゴールで8分音符
    ARP_PATTERN.forEach(function (p) {
      musicBox(bgmBus, t + p[0] * BEAT, ch.arp[p[1]], 0.16 * p[2], 1.2, 0.35);
    });

    // メロディ: オルゴール ＋ 1オクターブ下の重ね
    bar.mel.forEach(function (n) {
      var nt = t + n[0] * BEAT;
      var len = Math.max(1.4, n[2] * BEAT + 0.9);
      musicBox(bgmBus, nt, n[1], 0.32, len, 0.5);
      softDouble(bgmBus, nt, n[1] - 12, 0.10, Math.max(0.9, n[2] * BEAT + 0.4));
    });
  }

  function tick() {
    if (!playing || !ctx) return;
    var now = ctx.currentTime;
    // タブが長く止まっていたときは、今から始め直す（音がまとめて鳴らないように）
    if (nextBarTime < now - 0.1) nextBarTime = now + 0.1;
    while (nextBarTime < now + LOOKAHEAD) {
      scheduleBar(barIndex, nextBarTime);
      nextBarTime += BAR;
      barIndex = (barIndex + 1) % SONG.length;
    }
  }

  /* ---------- ダッキング ---------- */
  function duck(sec) {
    if (!ctx) return;
    var now = ctx.currentTime;
    var g = duckBus.gain;
    var end = Math.max(duckUntil, now + sec);
    duckUntil = end;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(DUCK_LEVEL, now + 0.06);
    g.setValueAtTime(DUCK_LEVEL, end);
    g.linearRampToValueAtTime(1, end + 0.7);
  }

  /* ---------- 効果音 ---------- */
  function sfxOut(vol) {
    var g = ctx.createGain();
    g.gain.value = Math.min(vol, SFX_VOLUME);
    g.connect(sfxBus);
    return g;
  }

  var SFX = {
    // 「ぽん」: 木の玉をたたいたような、短く丸い音
    tap: function (t) {
      var out = sfxOut(0.22);
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(700, t);
      o.frequency.exponentialRampToValueAtTime(480, t + 0.09);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(1, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + 0.25);
      return 0.2;
    },

    // 「ピロリン」: オルゴールで上がっていく3音
    correct: function (t) {
      var out = sfxOut(0.26);
      [81, 84, 89].forEach(function (m, i) {
        musicBox(out, t + i * 0.11, m, i === 2 ? 0.9 : 0.7, i === 2 ? 1.4 : 0.8, 0.5);
      });
      return 0.9;
    },

    // 「ぽわん」: 低めでやわらかく、少し下がる音。ブザーにしない
    retry: function (t) {
      var out = sfxOut(0.2);
      var filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 1200;
      filt.connect(out);

      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(1, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
      g.connect(filt);

      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(392, t);              // G4 から
      o.frequency.exponentialRampToValueAtTime(330, t + 0.35); // E4 へふわっと下がる
      // ごく小さなゆれ（ぽわん感）
      var lfo = ctx.createOscillator();
      lfo.frequency.value = 6;
      var lg = ctx.createGain();
      lg.gain.value = 4;
      lfo.connect(lg);
      lg.connect(o.frequency);
      o.connect(g);

      var o2 = ctx.createOscillator(); // 下に柔らかい5度
      o2.type = 'sine';
      o2.frequency.setValueAtTime(262, t);
      o2.frequency.exponentialRampToValueAtTime(220, t + 0.35);
      var g2 = ctx.createGain();
      g2.gain.value = 0.35;
      o2.connect(g2);
      g2.connect(g);

      [o, o2, lfo].forEach(function (x) { x.start(t); x.stop(t + 0.9); });
      return 0.8;
    },

    // 短いファンファーレ: オルゴールの上がる音型 → やさしい和音で着地（約1.8秒）
    clear: function (t) {
      var out = sfxOut(0.26);
      var s = 0.13;
      [[0, 72], [1, 77], [2, 81], [3, 84]].forEach(function (n) {
        musicBox(out, t + n[0] * s, n[1], 0.7, 0.7, 0.5);
      });
      var tt = t + 4 * s + 0.08;
      [77, 81, 84, 89].forEach(function (m, i) {
        musicBox(out, tt + i * 0.02, m, i === 3 ? 0.75 : 0.5, 1.8, 0.6);
      });
      pad(out, tt, [65, 69, 72, 77], 0.35, 1.0);
      return 1.9;
    },

    // 呼吸に合わせた、ごく小さな音（数珠が1つうまるとき、すう／はくの切りかえ などで）
    breath: function (t) {
      var out = sfxOut(0.06);
      var o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = mtof(69); // A4
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(1, t + 0.25); // ふわっと立ち上がる（アタックを立てない）
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g);
      g.connect(out);
      var s = ctx.createGain();
      s.gain.value = 0.3;
      g.connect(s);
      s.connect(reverbSend);
      o.start(t);
      o.stop(t + 1.5);
      return 0; // ダッキングしない
    },

    // 未来カードがめくれる音: 布がすれるような小さな音 ＋ 小さなオルゴール1音
    future: function (t) {
      var out = sfxOut(0.16);
      var src = ctx.createBufferSource();
      src.buffer = noiseBuf;
      var bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(900, t);
      bp.frequency.linearRampToValueAtTime(2200, t + 0.18);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
      src.connect(bp);
      bp.connect(g);
      g.connect(out);
      src.start(t);
      src.stop(t + 0.3);
      musicBox(out, t + 0.14, 84, 0.45, 0.9, 0.5);
      return 0.4;
    }
  };

  /* ---------- 公開する関数 ---------- */
  function start() {
    if (!ensureCtx()) return;
    resume();
    if (playing) return;
    playing = true;
    var now = ctx.currentTime;
    barIndex = 0;
    nextBarTime = now + 0.15;
    var g = bgmVol.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(Math.max(g.value, 0.0001), now);
    g.linearRampToValueAtTime(BGM_VOLUME, now + 1.5); // 1.5 秒でフェードイン
    tick();
    timer = setInterval(tick, TICK_MS);
  }

  function stop() {
    if (!ctx || !playing) return;
    playing = false;
    if (timer) { clearInterval(timer); timer = null; }
    var now = ctx.currentTime;
    var g = bgmVol.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + 1.0);
  }

  function setMuted(flag) {
    muted = !!flag;
    if (!ctx) return;
    var now = ctx.currentTime;
    var g = master.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(muted ? 0 : 1, now + 0.3);
    if (!muted) resume();
  }

  function play(name) {
    if (muted) return;
    if (!Object.prototype.hasOwnProperty.call(SFX, name)) return; // 無いキーは無視
    if (!ensureCtx()) return;
    resume();
    try {
      var t = ctx.currentTime + 0.01;
      var dur = SFX[name](t);
      if (dur > 0 && playing) duck(dur);
    } catch (e) { /* 音が出なくてもゲームは止めない */ }
  }

  // タブを離れたら音を休ませ、もどったら再開（おと なし のときは休ませたまま。
  // おと あり にもどしたとき setMuted が再開する）
  if (global.document && document.addEventListener) {
    document.addEventListener('visibilitychange', function () {
      if (!ctx) return;
      try {
        if (document.hidden) {
          var p = ctx.suspend();
          if (p && p.catch) p.catch(function () {});
        } else if (!muted) {
          resume();
        }
      } catch (e) {}
    });
    // iframe の中などで最初の resume が通らなかったときの保険:
    // 次のクリック／キー操作でもう一度 running にする
    var unlock = function () {
      if (ctx && !muted && !document.hidden) resume();
    };
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('keydown', unlock, true);
  }

  function safe(fn) {
    return function () {
      try { return fn.apply(null, arguments); } catch (e) { /* 何もしない */ }
    };
  }

  global.Sound = {
    start: safe(start),
    stop: safe(stop),
    setMuted: safe(setMuted),
    play: safe(play),
    isMuted: function () { return muted; },
    isAvailable: function () { return true; }
  };
})(window);
