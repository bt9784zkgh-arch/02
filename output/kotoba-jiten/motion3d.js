/* =====================================================================
   motion3d.js — 02 3Dモーション担当（motion-3d）
   案件: kotoba-jiten 「ことばの じてんを つくろう」
   テーマ: 図書室の手製本（布の本・図書カード・朱のはんこ・紙ふぶき）

   読み込み: <script src="lib/three.min.js"></script> → <script src="motion3d.js"></script>
   （ES module / fetch は使わない。file:// をダブルクリックで開いても動く）

   公開API（window.Motion3D）
     Motion3D.init(containerElement, { theme })   3Dキャンバスを container 全面に重ねる（pointer-events:none）
     Motion3D.setScene('title' | 'play' | 'result')
     Motion3D.celebrate(x, y)      画面のpx（getBoundingClientRect の中心）のあたりで正解の演出
     Motion3D.encourage()          まちがえたときのやさしい演出（紙が1まい ふわっと落ちる）
     Motion3D.stepClear(stepNo)    はんこが .sheet__stamp に「ドン」。Promise（2秒以内に resolve）
     Motion3D.setReducedMotion(bool)
   おまけ（呼ばなくてよい）
     Motion3D.isEnabled()          WebGLで動いているか
   WebGL が使えないときは、すべて何もしない（stepClear はすぐ resolve）。
   ===================================================================== */
(function (global) {
  'use strict';

  var W = 1920, H = 1080;               // design.md の基準の舞台
  var FOV = 30;
  var CAM_Z = (H / 2) / Math.tan((FOV / 2) * Math.PI / 180); // z=0 の面で 1単位 = 1px
  var MAX_MESHES = 300;                 // 同時に出す物体の上限

  var DEFAULT_THEME = {
    name: 'library-bookbinding',
    paper: '#FBF8F1', paper2: '#F1EDE1', ink: '#263040', accent: '#A23B2E', press: '#2F4668',
    desk: '#D8DBCD', wood: '#7B5737', hint: '#EBCB6B', jitenCloth: '#3E4E5E',
    nakama: ['#D08A3E', '#6E9A55', '#5C97BA'],
    books: ['#9C3F35', '#B8873A', '#6F6A92', '#4E8060', '#59636F', '#8E5B3A', '#2F4668', '#3E7C7A'],
    material: 'toon'
  };
  var WOOD_DARK = '#5A3E26';
  var RULE = '#E2DACA';

  /* ---------------- 状態 ---------------- */
  var S = {
    ok: false, inited: false, failed: false,
    container: null, stageEl: null, canvas: null,
    theme: DEFAULT_THEME,
    THREE: null, renderer: null, scene: null, camera: null, sun: null,
    tex: {}, mats: {}, geo: {},
    effects: [], meshCount: 0,
    running: false, lastTime: 0, frame: 0, lastRectW: -1,
    sceneName: null, mode: null, modeEffect: null,
    userReduced: false, osReduced: false, dataLess: false,
    menuBaseline: null, menuComplete: null,
    pendingResolves: []
  };

  /* ---------------- 小さな道具 ---------------- */
  function clamp01(t) { return t < 0 ? 0 : (t > 1 ? 1 : t); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }
  function easeInOutCubic(t) { t = clamp01(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeInQuad(t) { t = clamp01(t); return t * t; }
  function easeOutBack(t, s) { t = clamp01(t); s = s == null ? 1.4 : s; var u = t - 1; return 1 + (s + 1) * u * u * u + s * u * u; }
  // やわらかいばね（0→1、少し行きすぎて戻る）
  function spring(t, k) { t = clamp01(t); k = k || 1; return 1 - Math.exp(-6 * t) * Math.cos(9 * k * t); }
  function smooth(t) { t = clamp01(t); return t * t * (3 - 2 * t); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }
  function noop() {}

  function isReduced() { return !!(S.userReduced || S.osReduced || S.dataLess); }

  // 画面のpx → 舞台(1920×1080)のpx
  function toStage(x, y) {
    if (!S.container) return { x: x, y: y };
    var r = S.container.getBoundingClientRect();
    if (!r.width || !r.height) return { x: x, y: y };
    return { x: (x - r.left) * W / r.width, y: (y - r.top) * H / r.height };
  }
  // 要素の中心（舞台px）と大きさ。見えていなければ null
  function elemBox(el) {
    if (!el || !el.getBoundingClientRect || !S.container) return null;
    var r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    var c = S.container.getBoundingClientRect();
    if (!c.width) return null;
    var k = W / c.width;
    return { x: (r.left + r.width / 2 - c.left) * k, y: (r.top + r.height / 2 - c.top) * k, w: r.width * k, h: r.height * k };
  }
  // 舞台px → 3D座標（z=0 の面）
  function wx(sx) { return sx - W / 2; }
  function wy(sy) { return H / 2 - sy; }
  function q(sel, root) { try { return (root || document).querySelector(sel); } catch (e) { return null; } }
  function qa(sel, root) { try { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); } catch (e) { return []; } }

  /* ---------------- テクスチャ（canvas で描く。file:// でも安全） ---------------- */
  function makeCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  function canvasTex(c, repeat) {
    var T = S.THREE, t = new T.CanvasTexture(c);
    if ('colorSpace' in t) t.colorSpace = T.SRGBColorSpace;
    if (repeat) { t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat, repeat); }
    t.anisotropy = 1;
    return t;
  }

  // 布の目（白地に細かい織り目。色はマテリアルの color でかける）
  function weaveTexture() {
    var c = makeCanvas(64, 64), g = c.getContext('2d'), i;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
    for (i = 0; i < 64; i += 2) {
      g.fillStyle = 'rgba(0,0,0,' + (0.045 + Math.random() * 0.03) + ')'; g.fillRect(0, i, 64, 1);
      g.fillStyle = 'rgba(0,0,0,' + (0.03 + Math.random() * 0.025) + ')'; g.fillRect(i, 0, 1, 64);
    }
    for (i = 0; i < 90; i++) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(Math.random() * 64, Math.random() * 64, 1, 1); }
    return canvasTex(c, 3);
  }
  // 紙のすじ
  function paperTexture() {
    var c = makeCanvas(64, 64), g = c.getContext('2d'), i;
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
    for (i = 0; i < 160; i++) {
      g.fillStyle = 'rgba(80,60,30,' + (Math.random() * 0.05) + ')';
      g.fillRect(Math.random() * 64, Math.random() * 64, 1 + Math.random() * 3, 1);
    }
    return canvasTex(c, 1);
  }
  // やわらかい光（中心が濃く、外へ消える）
  function glowTexture() {
    var c = makeCanvas(128, 128), g = c.getContext('2d');
    var gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return canvasTex(c, 0);
  }

  var HEAD_FONT = "'Klee 02','Klee One','Zen Maru 02','Hiragino Maru Gothic ProN','BIZ UDPGothic',serif";
  // 手描きのゆらぎがある丸
  function wobblyCircle(g, cx, cy, r, amp, seed) {
    g.beginPath();
    for (var i = 0; i <= 64; i++) {
      var a = i / 64 * Math.PI * 2;
      var rr = r + amp * Math.sin(a * 3 + seed) + amp * 0.6 * Math.sin(a * 5 + seed * 2.1);
      var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
  }
  // 「できた」のはんこの印影（stamp-dekita.svg と同じ組み方）。kind='print' 紙に押した形 / 'face' はんこの印面
  function drawStamp(c, kind) {
    var g = c.getContext('2d'), s = c.width, k = s / 220, th = S.theme;
    g.clearRect(0, 0, s, s);
    if (kind === 'face') {
      g.fillStyle = th.accent; g.beginPath(); g.arc(s / 2, s / 2, s / 2 - 2, 0, Math.PI * 2); g.fill();
    }
    var col = kind === 'face' ? th.paper : th.accent;
    g.globalAlpha = kind === 'face' ? 1 : 0.92;
    g.strokeStyle = col; g.fillStyle = col; g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = 8 * k; wobblyCircle(g, s / 2, s / 2, 99 * k, 1.6 * k, 1.3); g.stroke();
    g.lineWidth = 3 * k; wobblyCircle(g, s / 2, s / 2, 86 * k, 1.4 * k, 2.7); g.stroke();
    g.font = '600 ' + Math.round(46 * k) + 'px ' + HEAD_FONT;
    g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.fillText('できた', s / 2, 124 * k);
    g.lineWidth = 4 * k;
    g.beginPath(); g.moveTo(50 * k, 150 * k); g.lineTo(170 * k, 150 * k); g.stroke();
    g.beginPath(); g.moveTo(62 * k, 168 * k); g.lineTo(158 * k, 168 * k); g.stroke();
    g.globalAlpha = 1;
  }
  function stampTexture(kind) {
    var key = 'stamp-' + kind;
    if (S.tex[key]) return S.tex[key];
    var c = makeCanvas(256, 256);
    drawStamp(c, kind);
    var t = canvasTex(c, 0);
    S.tex[key] = t;
    // 手書きの書体が読みこまれたら描き直す
    try {
      if (document.fonts && document.fonts.load) {
        document.fonts.load('600 46px ' + HEAD_FONT, 'できた').then(function () {
          drawStamp(c, kind); t.needsUpdate = true; requestRender();
        }, noop);
      }
    } catch (e) { /* なにもしない */ }
    return t;
  }

  /* ---------------- マテリアル（MeshToonMaterial・紙と布。金属・発光なし） ---------------- */
  function toon(color, opt) {
    var T = S.THREE; opt = opt || {};
    var m = new T.MeshToonMaterial({
      color: new T.Color(color),
      gradientMap: S.tex.gradient,
      map: opt.map || null,
      transparent: !!opt.fade,
      opacity: 1
    });
    if (opt.shared) m.userData.shared = true;
    return m;
  }
  function sharedToon(key, color, map) {
    if (!S.mats[key]) S.mats[key] = toon(color, { map: map, shared: true });
    return S.mats[key];
  }

  function box(mat, sx, sy, sz, cast) {
    var m = new S.THREE.Mesh(S.geo.box, mat);
    m.scale.set(sx, sy, sz);
    m.castShadow = !!cast; m.userData.cast = !!cast;
    return m;
  }

  /* ---------------- 題材の形 ---------------- */
  // 布の本（表紙を見せて立てる。題簽つき）
  function makeBook(color, w, h, d, opt) {
    var T = S.THREE, th = S.theme; opt = opt || {};
    var g = new T.Group();
    var cloth = toon(color, { map: S.tex.weave, fade: true });
    var pages = toon(th.paper2, { map: S.tex.paper, fade: true });
    // 面の順: +x(小口) -x(背) +y(天) -y(地) +z(表) -z(裏)
    var body = new T.Mesh(S.geo.box, [pages, cloth, pages, pages, cloth, cloth]);
    body.scale.set(w, h, d); body.castShadow = true; body.userData.cast = true;
    g.add(body);
    // 背のふくらみ（布を少し濃く見せる帯）
    var spine = box(toon(color, { map: S.tex.weave, fade: true }), w * 0.12, h * 1.002, d * 1.04, false);
    spine.position.x = -w / 2 + w * 0.06; g.add(spine);
    // 題簽（白いラベル）と 字の線
    var slip = box(toon(th.paper, { map: S.tex.paper, fade: true }), w * 0.5, h * 0.44, 1.6, false);
    slip.position.set(w * 0.04, h * 0.1, d / 2 + 0.9); g.add(slip);
    var inkM = toon(th.ink, { fade: true });
    var l1 = box(inkM, w * 0.3, Math.max(2, h * 0.025), 0.8, false); l1.position.set(w * 0.04, h * 0.17, d / 2 + 2); g.add(l1);
    var l2 = box(inkM, w * 0.22, Math.max(2, h * 0.025), 0.8, false); l2.position.set(w * 0.04, h * 0.05, d / 2 + 2); g.add(l2);
    if (opt.ribbon) { // しおりひも（朱）
      var rb = box(toon(th.accent, { fade: true }), Math.max(3, w * 0.05), h * 0.22, 1.2, false);
      rb.position.set(w * 0.28, -h / 2 - h * 0.09, 0); g.add(rb);
    }
    g.userData.meshes = 6 + (opt.ribbon ? 1 : 0);
    return g;
  }
  // 図書カード（上に色帯のある紙のカード）
  function makeCard(bandColor, w, h) {
    var T = S.THREE, th = S.theme, g = new T.Group();
    var body = box(toon(th.paper, { map: S.tex.paper, fade: true }), w, h, 2.4, true); g.add(body);
    var band = box(toon(bandColor, { fade: true }), w, h * 0.17, 1.2, false);
    band.position.set(0, h / 2 - h * 0.085, 1.9); g.add(band);
    var ruleM = toon(RULE, { fade: true });
    for (var i = 0; i < 2; i++) {
      var r = box(ruleM, w * 0.78, Math.max(1.5, h * 0.02), 0.6, false);
      r.position.set(0, -h * 0.05 - i * h * 0.22, 1.6); g.add(r);
    }
    g.userData.meshes = 4;
    return g;
  }
  // 朱のはんこ（丸い印面＋木の柄）。ローカル +y が柄の向き、-y が印面
  function makeHanko(r) {
    var T = S.THREE, th = S.theme, g = new T.Group();
    var base = new T.Mesh(S.geo.cyl, toon(th.accent, { fade: true }));
    base.scale.set(r, r * 0.16, r); base.position.y = r * 0.08; base.castShadow = true; base.userData.cast = true; g.add(base);
    var collar = new T.Mesh(S.geo.cyl, toon(th.wood, { map: S.tex.paper, fade: true }));
    collar.scale.set(r * 0.92, r * 0.2, r * 0.92); collar.position.y = r * 0.26; collar.castShadow = true; collar.userData.cast = true; g.add(collar);
    var handle = new T.Mesh(S.geo.cyl, toon(th.wood, { map: S.tex.paper, fade: true }));
    handle.scale.set(r * 0.5, r * 0.85, r * 0.5); handle.position.y = r * 0.78; handle.castShadow = true; handle.userData.cast = true; g.add(handle);
    var knob = new T.Mesh(S.geo.sphere, toon(WOOD_DARK, { fade: true }));
    knob.scale.set(r * 0.5, r * 0.42, r * 0.5); knob.position.y = r * 1.24; knob.castShadow = true; knob.userData.cast = true; g.add(knob);
    var faceMat = new T.MeshBasicMaterial({ map: stampTexture('face'), transparent: true });
    var face = new T.Mesh(S.geo.circle, faceMat);
    face.scale.set(r * 0.98, r * 0.98, 1); face.rotation.x = Math.PI / 2; face.position.y = -0.6; g.add(face);
    g.userData.meshes = 5;
    return g;
  }
  // 紙のメダル（ふり返りのスタンプ。紙の円板に朱の「できた」）
  function makeToken(r) {
    var T = S.THREE, th = S.theme, g = new T.Group();
    var disc = new T.Mesh(S.geo.cyl, toon(th.paper, { map: S.tex.paper, fade: true }));
    disc.scale.set(r, 7, r); disc.rotation.x = Math.PI / 2; disc.castShadow = true; disc.userData.cast = true; g.add(disc);
    var print = new T.Mesh(S.geo.circle, new T.MeshBasicMaterial({ map: stampTexture('print'), transparent: true, depthWrite: false }));
    print.scale.set(r * 0.96, r * 0.96, 1); print.position.z = 3.8; g.add(print);
    g.userData.meshes = 2;
    return g;
  }
  function makeGlow(color, size) {
    var T = S.THREE;
    var m = new T.SpriteMaterial({ map: S.tex.glow, color: new T.Color(color), transparent: true, opacity: 0, depthWrite: false });
    var sp = new T.Sprite(m); sp.scale.set(size, size, 1);
    sp.userData.meshes = 1;
    return sp;
  }

  /* ---------------- 物体の出し入れ ---------------- */
  function countOf(obj) { return (obj.userData && obj.userData.meshes) || 1; }
  function addObj(obj) { S.scene.add(obj); S.meshCount += countOf(obj); return obj; }
  function removeObj(obj) {
    if (!obj || !obj.parent) return;
    obj.parent.remove(obj);
    S.meshCount = Math.max(0, S.meshCount - countOf(obj));
    obj.traverse(function (o) {
      var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (var i = 0; i < ms.length; i++) if (ms[i] && !ms[i].userData.shared && ms[i].dispose) ms[i].dispose();
    });
  }
  function setOpacity(obj, a) {
    obj.traverse(function (o) {
      var ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (var i = 0; i < ms.length; i++) if (!ms[i].userData.shared) ms[i].opacity = a;
      if (o.isMesh) o.castShadow = !!o.userData.cast && a > 0.6;
    });
    obj.visible = a > 0.01;
  }

  // effect = { t, update(dt, t) -> true（つづく）/false（おわり）, dispose(), ambient }
  function addEffect(e) {
    e.t = 0; e.start = performance.now();
    S.effects.push(e);
    startLoop();
    return e;
  }
  function killEffect(e) {
    var i = S.effects.indexOf(e);
    if (i >= 0) S.effects.splice(i, 1);
    try { if (e.dispose) e.dispose(); } catch (err) { /* なにもしない */ }
  }

  /* ---------------- 描画のループ（動くものが無いときは止める） ---------------- */
  var needOneRender = false;
  function requestRender() { needOneRender = true; startLoop(); }
  function startLoop() {
    if (!S.ok || S.running) return;
    S.running = true;
    S.lastTime = performance.now();
    requestAnimationFrame(tick);
  }
  function tick(now) {
    if (!S.ok) { S.running = false; return; }
    try {
      var dt = Math.min(0.05, Math.max(0, (now - S.lastTime) / 1000));
      S.lastTime = now;
      if ((S.frame++ % 30) === 0) syncSize();
      var list = S.effects.slice();
      for (var i = 0; i < list.length; i++) {
        var e = list[i];
        e.t = Math.max(0, (now - e.start) / 1000); // 時間は実時間（古いPCでも長さが変わらない）
        var alive = false;
        try { alive = e.update(dt, e.t); } catch (err) { alive = false; }
        if (!alive) killEffect(e);
      }
      S.renderer.render(S.scene, S.camera);
      needOneRender = false;
    } catch (err) {
      fail(err);
      return;
    }
    var busy = false;
    for (var j = 0; j < S.effects.length; j++) if (!S.effects[j].sleeping) { busy = true; break; }
    if (busy || needOneRender) requestAnimationFrame(tick);
    else { S.running = false; }
  }

  function syncSize() {
    if (!S.renderer || !S.container) return;
    var r = S.container.getBoundingClientRect();
    var w = r.width || W;
    if (Math.abs(w - S.lastRectW) < 0.5) return;
    S.lastRectW = w;
    var dpr = Math.min(global.devicePixelRatio || 1, 1.5);
    var pr = Math.max(0.35, Math.min(1.5, dpr * w / W)); // 画面に出ている大きさだけ描く（古いPC向け）
    S.renderer.setPixelRatio(pr);
    S.renderer.setSize(W, H, false);
  }

  /* ---------------- 失敗したら静かに止める ---------------- */
  function fail(err) {
    S.ok = false; S.failed = true; S.running = false;
    try { if (S.canvas) S.canvas.style.display = 'none'; } catch (e) { /* なにもしない */ }
    restoreDom();
    var rs = S.pendingResolves.splice(0);
    for (var i = 0; i < rs.length; i++) { try { rs[i](); } catch (e) { /* なにもしない */ } }
    if (global.console && err) console.warn('[Motion3D] 3Dを止めました（ゲームはそのまま遊べます）:', err && err.message ? err.message : err);
  }
  var domRestorers = [];
  function restoreDom() {
    var r = domRestorers.splice(0);
    for (var i = 0; i < r.length; i++) { try { r[i](); } catch (e) { /* なにもしない */ } }
  }

  /* =====================================================================
     場面ごとの演出
     ===================================================================== */

  function computeMode() {
    var ds = S.stageEl ? S.stageEl.getAttribute('data-screen') : null;
    var sc = S.sceneName;
    if (ds === 'title' || ds === 'cover' || ds === 'menu') return ds;
    if (ds === 'review') return 'result';
    if (ds === 'play' || ds === 'jiten') return sc === 'result' ? 'result' : 'play';
    if (sc === 'title' || sc === 'result' || sc === 'play') return sc;
    return 'play';
  }

  function applyMode(force) {
    if (!S.ok) return;
    var m = computeMode();
    if (!force && m === S.mode) return;
    var prev = S.mode;
    S.mode = m;
    if (S.modeEffect) { fadeOutEffect(S.modeEffect); S.modeEffect = null; }
    resetCamera();
    if (m === 'title') S.modeEffect = addEffect(titleEffect());
    else if (m === 'cover') S.modeEffect = addEffect(coverEffect());
    else if (m === 'result') S.modeEffect = addEffect(resultEffect());
    else if (m === 'menu') { if (prev !== 'menu' || force) setTimeout(checkMenuSlots, 80); }
    requestRender();
  }

  // 場面を出るときは 0.3秒でふわっと消す
  function fadeOutEffect(e) {
    if (!e || !e.objects) { if (e) killEffect(e); return; }
    var objs = e.objects; e.objects = [];
    var i = S.effects.indexOf(e); if (i >= 0) S.effects.splice(i, 1);
    if (e.onLeave) try { e.onLeave(); } catch (err) { /* なにもしない */ }
    var mats = [];
    for (var o = 0; o < objs.length; o++) objs[o].traverse(function (n) {
      var ms = n.material ? (Array.isArray(n.material) ? n.material : [n.material]) : [];
      for (var k = 0; k < ms.length; k++) if (!ms[k].userData.shared) { ms[k].transparent = true; mats.push({ m: ms[k], o: ms[k].opacity }); }
      if (n.isMesh) n.castShadow = false;
    });
    var dur = isReduced() ? 0.2 : 0.3;
    addEffect({
      update: function (dt, t) {
        var a = 1 - smooth(t / dur);
        for (var j = 0; j < mats.length; j++) mats[j].m.opacity = mats[j].o * a;
        return t < dur;
      },
      dispose: function () { for (var j = 0; j < objs.length; j++) removeObj(objs[j]); }
    });
  }

  function resetCamera() {
    if (!S.camera) return;
    S.camera.position.set(0, 0, CAM_Z);
    S.camera.lookAt(0, 0, 0);
  }

  /* ---- タイトル: 奥から布の本（8さつ）が飛び出して、表紙のまわりに浮かぶ ---- */
  function titleEffect() {
    var th = S.theme, reduced = isReduced();
    // 置いてよい場所: 上の帯 x0〜1340・y0〜190 / 表紙のまわり x60〜840・y100〜1060
    var spots = [
      { x: 150, y: 96, s: 1.0 }, { x: 370, y: 88, s: 0.9 }, { x: 590, y: 100, s: 1.05 },
      { x: 810, y: 90, s: 0.9 }, { x: 1030, y: 98, s: 1.0 }, { x: 1250, y: 92, s: 0.92 },
      { x: 104, y: 990, s: 0.95 }, { x: 800, y: 1000, s: 0.9 }
    ];
    var src = elemBox(q('.screen--title .title-book')) || { x: 450, y: 540 };
    var items = [], objs = [];
    for (var i = 0; i < 8; i++) {
      var sp = spots[i];
      var b = makeBook(th.books[i], 78 * sp.s, 108 * sp.s, 20 * sp.s, { ribbon: i % 3 === 1 });
      addObj(b); setOpacity(b, 0);
      items.push({
        g: b, tx: wx(sp.x), ty: wy(sp.y), tz: 20 + (i % 3) * 18,
        sx: wx(src.x) + rand(-60, 60), sy: wy(src.y) + rand(-80, 80),
        delay: 0.15 + i * 0.16, spin: (i % 2 ? 1 : -1) * rand(2.2, 3.2),
        baseRy: (i % 2 ? 1 : -1) * rand(0.12, 0.3), baseRz: rand(-0.08, 0.08), ph: rand(0, 6.28)
      });
      objs.push(b);
    }
    var e = {
      objects: objs,
      update: function (dt, t) {
        for (var i = 0; i < items.length; i++) {
          var it = items[i], g = it.g;
          if (reduced) { // その場にふわっと出るだけ
            g.position.set(it.tx, it.ty, it.tz);
            g.rotation.set(0, it.baseRy, it.baseRz);
            setOpacity(g, smooth((t - i * 0.08) / 0.6));
            continue;
          }
          var lt = (t - it.delay) / 1.5;
          var p = easeOutCubic(lt);
          var idle = Math.max(0, t - it.delay - 1.5);
          g.position.set(
            lerp(it.sx, it.tx, p),
            lerp(it.sy, it.ty, p) + Math.sin(idle * 1.15 + it.ph) * 6 * smooth(idle),
            lerp(-1800, it.tz, easeOutBack(lt, 0.9))
          );
          g.rotation.set(
            Math.sin(idle * 0.8 + it.ph) * 0.06,
            it.baseRy + it.spin * (1 - p) + Math.sin(idle * 0.5 + it.ph) * 0.22,
            it.baseRz * p
          );
          setOpacity(g, smooth(lt * 3));
        }
        if (!reduced) { // カメラが少し回りこんで、ゆっくり戻る
          var a = 0.09 * (1 - easeInOutCubic(t / 2.6)) + 0.018 * Math.sin(t * 0.22) * smooth((t - 2.6) / 3);
          S.camera.position.set(Math.sin(a) * CAM_Z, Math.sin(a * 0.4) * 60, Math.cos(a) * CAM_Z);
          S.camera.lookAt(0, 0, 0);
        }
        return true; // 場面のあいだは続ける
      },
      onLeave: resetCamera,
      dispose: function () { for (var j = 0; j < objs.length; j++) removeObj(objs[j]); resetCamera(); }
    };
    if (reduced) e.update = wrapStatic(e, e.update, 1.4);
    return e;
  }

  // すくなめ: 出し終わったらループを止める（描画を止めて、そのまま残す）
  function wrapStatic(e, fn, until) {
    return function (dt, t) {
      if (!e.sleeping) { fn(dt, t); if (t > until) { e.sleeping = true; requestRender(); } }
      return true;
    };
  }

  /* ---- ステージの表紙: 本から例カードが5まい ふわっと出て浮かぶ ---- */
  function coverEffect() {
    var th = S.theme, reduced = isReduced();
    var src = elemBox(q('.screen--cover .cover-book')) || { x: 430, y: 620 };
    // 置いてよい場所 x40〜820・y190〜1060（本の題簽の上はさける）
    var spots = [{ x: 96, y: 300 }, { x: 772, y: 262 }, { x: 88, y: 790 }, { x: 778, y: 900 }, { x: 430, y: 1018 }];
    var items = [], objs = [];
    for (var i = 0; i < spots.length; i++) {
      var c = makeCard(th.nakama[i % 3], 150, 100);
      addObj(c); setOpacity(c, 0);
      items.push({ g: c, tx: wx(spots[i].x), ty: wy(spots[i].y), sx: wx(src.x), sy: wy(src.y), delay: 0.3 + i * 0.22,
        rz: rand(-0.16, 0.16), ry: rand(-0.3, 0.3), ph: rand(0, 6.28) });
      objs.push(c);
    }
    var e = {
      objects: objs,
      update: function (dt, t) {
        for (var i = 0; i < items.length; i++) {
          var it = items[i], g = it.g;
          if (reduced) {
            g.position.set(it.tx, it.ty, 30); g.rotation.set(0, 0, it.rz);
            setOpacity(g, smooth((t - i * 0.08) / 0.6)); continue;
          }
          var lt = (t - it.delay) / 1.3, p = easeOutCubic(lt), idle = Math.max(0, t - it.delay - 1.3);
          g.position.set(lerp(it.sx, it.tx, p), lerp(it.sy, it.ty, p) + Math.sin(lt * Math.PI) * 40 + Math.sin(idle * 1.0 + it.ph) * 7 * smooth(idle),
            lerp(-60, 30, p) + Math.sin(lt * Math.PI) * 120);
          g.rotation.set(Math.sin(idle * 0.7 + it.ph) * 0.08, it.ry * (1 - p) * 3 + Math.sin(idle * 0.45 + it.ph) * 0.18, it.rz * p);
          var sc = lerp(0.3, 1, easeOutBack(lt, 1.2)); g.scale.set(sc, sc, sc);
          setOpacity(g, smooth(lt * 2.5));
        }
        return true;
      },
      dispose: function () { for (var j = 0; j < objs.length; j++) removeObj(objs[j]); }
    };
    if (reduced) e.update = wrapStatic(e, e.update, 1.2);
    return e;
  }

  /* ---- ふり返り: ステップ1〜3のはんこが並んで、1つずつ朱の光がゆっくり灯る ---- */
  function resultEffect() {
    var reduced = isReduced(), built = false, items = [], objs = [], startT = 0, holder = null;
    var e = {
      objects: objs,
      update: function (dt, t) {
        if (!built) {
          holder = q('.screen--review.is-active .review__stamps') || q('.review__stamps');
          var hb = elemBox(holder);
          if (!hb && t < 1.5) return true;           // 画面が出るのを待つ
          build(hb); built = true; startT = t;
        }
        var lt = t - startT;
        for (var i = 0; i < items.length; i++) {
          var it = items[i], g = it.g, d = 0.2 + i * 0.32;
          if (reduced) {
            g.position.set(it.x, it.y, 24); g.rotation.set(0, 0, 0); g.scale.set(1, 1, 1);
            setOpacity(g, smooth((lt - i * 0.25) / 0.6));
          } else {
            var p = (lt - d) / 0.75;
            g.position.set(it.x, it.y + 200 * (1 - easeOutBack(p, 1.1)), lerp(320, 24, easeOutCubic(p)));
            var idle = Math.max(0, lt - 3.6);
            g.rotation.set(Math.sin(idle * 0.6 + i) * 0.05 * smooth(idle), Math.PI * (1 - easeOutBack(p, 1.0)) + Math.sin(idle * 0.5 + i * 1.7) * 0.07 * smooth(idle), 0);
            setOpacity(g, smooth(p * 3));
          }
          // 光: 1つずつ、ついたら少し弱めて残す（点滅しない）
          var gs = (lt - (reduced ? 1.0 : 1.55) - i * 0.85) / 0.7;
          var ga = gs <= 0 ? 0 : (gs < 1 ? smooth(gs) * 0.6 : lerp(0.6, 0.28, smooth((gs - 1) / 1.2)));
          it.glow.material.opacity = ga;
          if (!reduced && gs > 0 && gs < 1.4) { var pop = 1 + 0.07 * Math.sin(clamp01(gs / 1.4) * Math.PI); g.scale.set(pop, pop, pop); }
        }
        if (lt > (reduced ? 4.6 : 6.4) && !e.sleeping) { // 光がそろったら描画を止める（古いPC向け）
          if (!reduced) { for (var z = 0; z < items.length; z++) items[z].g.rotation.set(0, 0, 0); }
          e.sleeping = true; requestRender();
        }
        return true;
      },
      onLeave: function () { if (holder) holder.classList.remove('is-3d'); },
      dispose: function () { for (var j = 0; j < objs.length; j++) removeObj(objs[j]); if (holder) holder.classList.remove('is-3d'); }
    };
    function build(hb) {
      var imgs = holder ? qa('img', holder) : [];
      var spots = [];
      for (var i = 0; i < 3; i++) {
        var b = elemBox(imgs[i]);
        if (b) spots.push(b);
      }
      if (spots.length < 3) {
        var cx = hb ? hb.x : 1475, cy = hb ? hb.y : 360;
        spots = [{ x: cx - 180, y: cy, w: 160 }, { x: cx, y: cy, w: 160 }, { x: cx + 180, y: cy, w: 160 }];
      }
      for (var k = 0; k < 3; k++) {
        var r = Math.min(90, (spots[k].w || 160) / 2);
        var glow = makeGlow(S.theme.accent, r * 3.4); addObj(glow);
        glow.position.set(wx(spots[k].x), wy(spots[k].y), -6);
        var tok = makeToken(r); addObj(tok); setOpacity(tok, 0);
        items.push({ g: tok, glow: glow, x: wx(spots[k].x), y: wy(spots[k].y) });
        objs.push(glow, tok);
      }
      if (holder) holder.classList.add('is-3d'); // 2Dの絵をかくす（場所は残る）
    }
    return e;
  }

  /* ---- 本だな: 終わった本の布が「ことばの じてん」の表紙のマスにはまる ---- */
  function checkMenuSlots() {
    if (!S.ok || S.mode !== 'menu') return;
    var slots = qa('.jiten-cover .cover-slot');
    if (!slots.length) return;
    var done = [];
    for (var i = 0; i < slots.length; i++) if (slots[i].classList.contains('is-done')) done.push(i);
    var coverEl = q('.jiten-cover');
    var complete = !!(coverEl && coverEl.classList.contains('is-complete'));
    if (S.menuBaseline === null) { S.menuBaseline = done; S.menuComplete = complete; return; } // はじめて見たときは基準にするだけ
    var fresh = [];
    for (var j = 0; j < done.length; j++) if (S.menuBaseline.indexOf(done[j]) < 0) fresh.push(done[j]);
    var newlyComplete = complete && !S.menuComplete;
    S.menuBaseline = done; S.menuComplete = complete;
    var lastEnd = 0;
    if (!isReduced()) {
      for (var f = 0; f < fresh.length; f++) { lastEnd = 0.4 + f * 0.35 + 1.2; flyClothToSlot(fresh[f], slots[fresh[f]], 0.4 + f * 0.35); }
    }
    if (newlyComplete && coverEl) completeGlow(coverEl, lastEnd);
  }
  function flyClothToSlot(index, slotEl, delay) {
    var to = elemBox(slotEl); if (!to) return;
    if (S.meshCount + 8 > MAX_MESHES) return;
    var from = elemBox(q('.shelf .book[data-stage="' + (index + 1) + '"]')) || { x: to.x + 700, y: to.y };
    var T = S.THREE;
    var tile = box(toon(S.theme.books[index] || S.theme.jitenCloth, { map: S.tex.weave, fade: true }), to.w, to.h, 10, true);
    var g = new T.Group(); g.add(tile); g.userData.meshes = 1;
    addObj(g); setOpacity(g, 0);
    var prevVis = slotEl.style.visibility;
    var restore = function () { slotEl.style.visibility = prevVis; };
    slotEl.style.visibility = 'hidden'; domRestorers.push(restore);
    var landed = false;
    addEffect({
      update: function (dt, t) {
        var lt = (t - delay) / 1.1, p = easeInOutCubic(lt);
        var sc = lerp(1.9, 1, p);
        g.position.set(lerp(wx(from.x), wx(to.x), p), lerp(wy(from.y), wy(to.y), p) + Math.sin(clamp01(lt) * Math.PI) * 160, lerp(140, 6, p) + Math.sin(clamp01(lt) * Math.PI) * 120);
        g.rotation.set(0, Math.PI * 2 * (1 - p), 0.25 * (1 - p));
        if (lt >= 1) {
          if (!landed) { landed = true; restore(); var k = domRestorers.indexOf(restore); if (k >= 0) domRestorers.splice(k, 1); }
          var s2 = (t - delay - 1.1) / 0.35; var sq = 1 - 0.12 * Math.sin(clamp01(s2) * Math.PI); // ぽすっ
          g.scale.set(1 / sq, 1 / sq, sq);
          setOpacity(g, 1 - smooth((t - delay - 1.25) / 0.25));
          return t < delay + 1.5;
        }
        g.scale.set(sc, sc, sc);
        setOpacity(g, smooth(lt * 4));
        return true;
      },
      dispose: function () { removeObj(g); if (!landed) restore(); }
    });
  }
  function completeGlow(coverEl, delay) {
    var slip = elemBox(q('.jiten-cover__slip', coverEl)) || elemBox(coverEl);
    if (!slip) return;
    var glow = makeGlow(S.theme.hint, Math.max(slip.w, slip.h) * 1.9); addObj(glow);
    glow.position.set(wx(slip.x), wy(slip.y), 8);
    addEffect({
      update: function (dt, t) {
        var lt = t - delay;
        glow.material.opacity = lt < 0 ? 0 : (lt < 1 ? smooth(lt) * 0.7 : lerp(0.7, 0, smooth((lt - 1.6) / 1.2)));
        return lt < 2.9;
      },
      dispose: function () { removeObj(glow); }
    });
    if (!isReduced()) setTimeout(function () { if (S.ok) burst(slip.x, slip.y, 24, 260); }, (delay + 0.4) * 1000);
  }

  /* ---------------- 紙ふぶき（紙色・なかま3色・朱を少し。星・ネオンなし） ---------------- */
  function confettiMats() {
    var th = S.theme;
    if (!S.mats.cf) {
      S.mats.cf = [
        sharedToon('cf-p', th.paper, S.tex.paper), sharedToon('cf-p2', th.paper2, S.tex.paper),
        sharedToon('cf-n1', th.nakama[0]), sharedToon('cf-n2', th.nakama[1]), sharedToon('cf-n3', th.nakama[2]),
        sharedToon('cf-a', th.accent)
      ];
    }
    return S.mats.cf;
  }
  // (sx, sy) 舞台px のまわりに n まい。radius = 広がる大きさのめやす
  function burst(sx, sy, n, radius) {
    var room = MAX_MESHES - S.meshCount;
    n = Math.min(n, room);
    if (n <= 0) return;
    var mats = confettiMats(), weights = [0, 2, 1, 3, 0, 4, 1, 5, 0, 2, 3, 1]; // 紙色を多め、朱は少し
    var T = S.THREE, parts = [], grp = new T.Group();
    grp.userData.meshes = n;
    for (var i = 0; i < n; i++) {
      var m = new T.Mesh(S.geo.box, mats[weights[i % weights.length]]);
      var a = rand(0, Math.PI * 2), r0 = rand(radius * 0.8, radius * 1.25), sp = rand(radius * 1.2, radius * 2.0); // まんなか（二重まる）はおおわない
      m.scale.set(rand(12, 18), rand(8, 11), 0.8);
      m.position.set(wx(sx) + Math.cos(a) * r0, wy(sy) + Math.sin(a) * r0, rand(10, 60));
      parts.push({ m: m, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp + rand(80, 220), vz: rand(0, 260),
        rx: rand(-9, 9), ry: rand(-9, 9), life: rand(1.05, 1.4), sx: m.scale.x, sy: m.scale.y, ph: rand(0, 6.28) });
      grp.add(m);
    }
    addObj(grp);
    addEffect({
      update: function (dt, t) {
        var drag = Math.exp(-3.2 * dt), any = false;
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i], m = p.m;
          if (t > p.life) { m.visible = false; continue; }
          any = true;
          p.vx *= drag; p.vy = p.vy * drag - 520 * dt; p.vz *= drag;
          m.position.x += (p.vx + Math.sin(t * 7 + p.ph) * 30) * dt; // ひらひら
          m.position.y += p.vy * dt; m.position.z += p.vz * dt;
          m.rotation.x += p.rx * dt; m.rotation.y += p.ry * dt;
          var k = 1 - smooth((t - (p.life - 0.3)) / 0.3);
          m.scale.set(p.sx * k, p.sy * k, 0.8);
        }
        return any;
      },
      dispose: function () { removeObj(grp); }
    });
  }

  // 図書カードが ふわっと舞いあがる（正解のとき 2まい）
  function floatCards(sx, sy) {
    if (S.meshCount + 8 > MAX_MESHES) return;
    var th = S.theme, cards = [];
    for (var i = 0; i < 2; i++) {
      var c = makeCard(th.nakama[(Math.random() * 3) | 0], 88, 60);
      var side = i ? 1 : -1;
      addObj(c); setOpacity(c, 0);
      cards.push({ g: c, x0: wx(sx) + side * rand(150, 190), y0: wy(sy) - rand(40, 90), side: side, ph: rand(0, 6) });
    }
    addEffect({
      update: function (dt, t) {
        var lt = t / 1.35;
        for (var i = 0; i < cards.length; i++) {
          var c = cards[i], g = c.g;
          g.position.set(c.x0 + c.side * 50 * easeOutCubic(lt) + Math.sin(t * 4 + c.ph) * 10, c.y0 + 170 * easeOutCubic(lt), 80 + 60 * lt);
          g.rotation.set(Math.sin(t * 3 + c.ph) * 0.35, c.side * 0.6 * lt, c.side * (0.25 + Math.sin(t * 3.5 + c.ph) * 0.2));
          var sc = easeOutBack(lt * 3, 1.6); g.scale.set(sc, sc, sc);
          setOpacity(g, lt < 0.7 ? 1 : 1 - smooth((lt - 0.7) / 0.3));
        }
        return lt < 1;
      },
      dispose: function () { for (var i = 0; i < cards.length; i++) removeObj(cards[i].g); }
    });
  }

  // すくなめ のときの正解: その場で紙ふぶきが ふわっと出て消えるだけ（動かない）
  function stillConfetti(sx, sy) {
    var n = Math.min(12, MAX_MESHES - S.meshCount); if (n <= 0) return;
    var mats = confettiMats(), T = S.THREE, grp = new T.Group(), parts = [];
    grp.userData.meshes = n;
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 + rand(-0.2, 0.2), r = rand(170, 260);
      var m = new T.Mesh(S.geo.box, mats[[0, 2, 3, 4, 5, 1][i % 6]]);
      m.position.set(wx(sx) + Math.cos(a) * r, wy(sy) + Math.sin(a) * r * 0.8, 30);
      m.rotation.set(rand(-0.6, 0.6), rand(-0.6, 0.6), rand(0, 3));
      m.scale.set(0.001, 0.001, 0.8); parts.push({ m: m, sx: rand(12, 18), sy: rand(8, 11) });
      grp.add(m);
    }
    addObj(grp);
    addEffect({
      update: function (dt, t) {
        var k = t < 0.35 ? smooth(t / 0.35) : 1 - smooth((t - 0.8) / 0.4);
        for (var i = 0; i < parts.length; i++) parts[i].m.scale.set(parts[i].sx * k + 0.001, parts[i].sy * k + 0.001, 0.8);
        return t < 1.2;
      },
      dispose: function () { removeObj(grp); }
    });
  }

  /* =====================================================================
     公開API
     ===================================================================== */
  function init(containerElement, opts) {
    if (S.inited) return; // 2回目は何もしない
    S.inited = true;
    try {
      var T = global.THREE;
      if (!T || !T.WebGLRenderer) throw new Error('THREE が読みこまれていません');
      if (!containerElement) throw new Error('containerElement がありません');
      S.THREE = T;
      S.container = containerElement;
      S.stageEl = (containerElement.closest && containerElement.closest('.stage')) || document.getElementById('stage');
      var th = {}, k, src = (opts && opts.theme) || {};
      for (k in DEFAULT_THEME) th[k] = DEFAULT_THEME[k];
      for (k in src) if (src[k] != null) th[k] = src[k];
      if (!th.nakama || th.nakama.length < 3) th.nakama = DEFAULT_THEME.nakama;
      if (!th.books || th.books.length < 8) th.books = DEFAULT_THEME.books;
      S.theme = th;

      // 先に WebGL が使えるか静かに確かめる（使えなければ何もしない関数に切りかえ）
      var probe = document.createElement('canvas');
      var gl = null;
      try { gl = probe.getContext('webgl2') || probe.getContext('webgl') || probe.getContext('experimental-webgl'); } catch (e) { gl = null; }
      if (!gl) throw new Error('WebGL が使えません');
      try { var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); } catch (e) { /* なにもしない */ }
      var renderer = new T.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power', premultipliedAlpha: true });
      if (!renderer.getContext()) throw new Error('WebGL が使えません');
      renderer.setClearColor(0x000000, 0);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = T.PCFShadowMap;
      S.renderer = renderer;
      var cv = renderer.domElement;
      S.canvas = cv;
      cv.setAttribute('aria-hidden', 'true');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none;';
      try {
        var cs = global.getComputedStyle(containerElement);
        if (cs && cs.position === 'static') containerElement.style.position = 'absolute';
      } catch (e) { /* なにもしない */ }
      containerElement.appendChild(cv);
      cv.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); fail(new Error('WebGL context lost')); }, false);

      S.scene = new T.Scene();
      S.camera = new T.PerspectiveCamera(FOV, W / H, 10, 6000);
      resetCamera();

      // 光は1つ（影もこれだけ）＋弱い環境光。r155以降の明るさの単位に合わせて π をかける
      S.scene.add(new T.AmbientLight(0xffffff, 0.5 * Math.PI));
      var sun = new T.DirectionalLight(0xfff4e6, 0.58 * Math.PI);
      sun.position.set(-600, 900, 1500);
      sun.target.position.set(0, 0, 0);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.radius = 5;
      sun.shadow.bias = -0.0006;
      var sc = sun.shadow.camera;
      sc.left = -1150; sc.right = 1150; sc.top = 760; sc.bottom = -760; sc.near = 200; sc.far = 4200;
      sc.updateProjectionMatrix();
      S.scene.add(sun); S.scene.add(sun.target);
      S.sun = sun;

      // テクスチャ・形
      var grad = new T.DataTexture(new Uint8Array([150, 212, 255]), 3, 1, T.RedFormat);
      grad.minFilter = grad.magFilter = T.NearestFilter; grad.generateMipmaps = false; grad.needsUpdate = true;
      S.tex.gradient = grad;
      S.tex.weave = weaveTexture();
      S.tex.paper = paperTexture();
      S.tex.glow = glowTexture();
      S.geo.box = new T.BoxGeometry(1, 1, 1);
      S.geo.cyl = new T.CylinderGeometry(1, 1, 1, 40, 1);
      S.geo.sphere = new T.SphereGeometry(1, 20, 12);
      S.geo.circle = new T.CircleGeometry(1, 48);

      // やわらかい影を受ける透明な面（ページの少しうしろ）
      var catcher = new T.Mesh(new T.PlaneGeometry(W * 1.5, H * 1.5), new T.ShadowMaterial({ color: new T.Color(th.ink), opacity: 0.14 }));
      catcher.position.z = -40; catcher.receiveShadow = true;
      S.scene.add(catcher);

      S.ok = true;
      syncSize();
      addEventListener('resize', function () { S.lastRectW = -1; syncSize(); requestRender(); });

      // うごきをへらす: OSの設定・舞台の data-motion="less"
      try {
        var mq = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)');
        if (mq) {
          S.osReduced = !!mq.matches;
          var onMq = function () { var was = isReduced(); S.osReduced = !!mq.matches; if (was !== isReduced()) applyMode(true); };
          if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
        }
      } catch (e) { /* なにもしない */ }
      if (S.stageEl) {
        S.dataLess = S.stageEl.getAttribute('data-motion') === 'less';
        try {
          new MutationObserver(function (recs) {
            var was = isReduced();
            S.dataLess = S.stageEl.getAttribute('data-motion') === 'less';
            var reducedChanged = was !== isReduced();
            var screenChanged = false;
            for (var i = 0; i < recs.length; i++) if (recs[i].attributeName === 'data-screen') screenChanged = true;
            if (reducedChanged) applyMode(true); else if (screenChanged) applyMode(false);
          }).observe(S.stageEl, { attributes: true, attributeFilter: ['data-screen', 'data-motion'] });
        } catch (e) { /* なにもしない */ }
      }
      applyMode(true);
    } catch (err) {
      fail(err);
    }
  }

  function setScene(name) {
    if (name !== 'title' && name !== 'play' && name !== 'result') return;
    S.sceneName = name;
    if (!S.ok) return;
    try { applyMode(false); } catch (err) { fail(err); }
  }

  function celebrate(x, y) {
    if (!S.ok) return;
    try {
      var p = (typeof x === 'number' && typeof y === 'number') ? toStage(x, y) : { x: W / 2, y: 660 };
      if (isReduced()) { stillConfetti(p.x, p.y); return; }
      burst(p.x, p.y, 34, 150);  // 1〜1.4秒・半径300pxくらいまで
      floatCards(p.x, p.y);
    } catch (err) { fail(err); }
  }

  var encourageEffect = null;
  function encourage() {
    if (!S.ok) return;
    try {
      if (encourageEffect) killEffect(encourageEffect);
      if (S.meshCount + 6 > MAX_MESHES) return;
      var th = S.theme, reduced = isReduced();
      // しおりさんの近く（x40〜260・y860〜1080）で、小さな紙（しおり）が1まい ふわっと落ちる
      var gb = elemBox(q('.screen.is-active .guide')) ;
      var bx = gb ? Math.max(70, Math.min(230, gb.x + 40)) : 170, by = gb ? Math.max(880, gb.y - 90) : 900;
      var T = S.THREE, g = new T.Group();
      var slip = box(toon(th.paper2, { map: S.tex.paper, fade: true }), 46, 104, 1.6, true); g.add(slip);
      var tip = box(toon(th.hint, { fade: true }), 46, 16, 1, false); tip.position.set(0, 44, 1.4); g.add(tip);
      g.userData.meshes = 2;
      addObj(g); setOpacity(g, 0);
      var x0 = wx(bx), y0 = wy(by - 40);
      encourageEffect = addEffect({
        update: function (dt, t) {
          var lt = t / 1.9;
          if (reduced) { g.position.set(x0, wy(by + 40), 40); g.rotation.set(0, 0, 0.3); }
          else {
            g.position.set(x0 + Math.sin(t * 3.1) * 34, y0 - 150 * easeInOutCubic(lt), 50);
            g.rotation.set(Math.sin(t * 3.1 + 1) * 0.3, 0, 0.35 * Math.cos(t * 3.1));
          }
          setOpacity(g, lt < 0.2 ? smooth(lt / 0.2) : 1 - smooth((lt - 0.7) / 0.3));
          return lt < 1;
        },
        dispose: function () { removeObj(g); if (encourageEffect && encourageEffect.g === g) encourageEffect = null; },
        g: g
      });
    } catch (err) { fail(err); }
  }

  function stepClear(stepNo) {
    return new Promise(function (resolve) {
      var finished = false;
      var holderEl = null, prevZ = null;
      function finish() {
        if (finished) return; finished = true;
        clearTimeout(safety);
        var i = S.pendingResolves.indexOf(finish); if (i >= 0) S.pendingResolves.splice(i, 1);
        undo();
        resolve();
      }
      function undo() {
        if (holderEl) holderEl.classList.remove('is-3d');
        if (prevZ !== null && S.container) S.container.style.zIndex = prevZ;
        prevZ = null;
      }
      var safety = setTimeout(finish, 2300); // 画面が裏にあっても、かならず終わる
      if (!S.ok) { finish(); return; }
      S.pendingResolves.push(finish);
      try {
        var reduced = isReduced();
        holderEl = q('.sheet-overlay.is-active .sheet__stamp') || q('.sheet__stamp');
        // まとめの紙（z 60）より上で押せるように、演出のあいだだけ 3Dの層を上げる（設定ボタン z 80 より下）
        prevZ = S.container.style.zIndex || '';
        S.container.style.zIndex = '70';
        if (holderEl) holderEl.classList.add('is-3d');
        var R = 100;
        var hk = makeHanko(R); addObj(hk); setOpacity(hk, 0);
        var imprint = null; // 2Dのはんこが無いときだけ 3Dの印影を残す
        var target = function () { return elemBox(holderEl) || { x: 515, y: 445, w: 230 }; };
        var tg = target();
        var pressed = false;
        addEffect({
          update: function (dt, t) {
            if (t < 0.9) tg = target(); // まとめの紙が動いていても追いかける
            var X = wx(tg.x), Y = wy(tg.y);
            if (reduced) { // その場で ふわっと出て、印影を残す
              hk.position.set(X, Y, 60); hk.rotation.set(Math.PI / 2, 0, 0);
              setOpacity(hk, t < 0.5 ? smooth(t / 0.5) : 1 - smooth((t - 0.8) / 0.4));
              if (!pressed && t > 0.7) { pressed = true; onPress(X, Y); }
              return t < 1.25;
            }
            if (t < 0.45) {                 // A: 印面を見せて ぽんと出る
              var a = t / 0.45, s = lerp(0.6, 1, easeOutBack(a, 1.6));
              hk.scale.set(s, s, s);
              hk.position.set(X + 90, Y + 150, 420);
              hk.rotation.set(-Math.PI / 2 + 0.25, a * 0.6, 0.15 * (1 - a));
              setOpacity(hk, smooth(a * 2));
            } else if (t < 0.95) {          // B: くるっと返して 真上へ
              var b = easeInOutCubic((t - 0.45) / 0.5);
              hk.scale.set(1, 1, 1);
              hk.position.set(lerp(X + 90, X, b), lerp(Y + 150, Y, b), lerp(420, 260, b));
              hk.rotation.set(lerp(-Math.PI / 2 + 0.25, Math.PI / 2, b), 0.6 + b * Math.PI * 1.4, 0);
              setOpacity(hk, 1);
            } else if (t < 1.13) {          // C: 「ドン」と押す
              var c = easeInQuad((t - 0.95) / 0.18);
              hk.position.set(X, Y, lerp(260, R * 0.02, c));
              hk.rotation.set(Math.PI / 2, 0.6 + Math.PI * 1.4, 0);
            } else if (t < 1.38) {          // D: ぎゅっ（ばね）
              if (!pressed) { pressed = true; onPress(X, Y); }
              var d = (t - 1.13) / 0.25, sq = 1 - 0.16 * Math.exp(-5 * d) * Math.cos(d * 9);
              hk.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
              hk.position.set(X, Y, R * 0.02);
            } else {                        // E: 持ちあげて消える
              var e2 = easeOutCubic((t - 1.38) / 0.42);
              hk.scale.set(1, 1, 1);
              hk.position.set(X - 40 * e2, Y + 60 * e2, lerp(R * 0.02, 360, e2));
              hk.rotation.set(Math.PI / 2 - 0.3 * e2, 0.6 + Math.PI * 1.4, 0);
              setOpacity(hk, 1 - smooth((t - 1.45) / 0.35));
            }
            if (imprint) imprint.material.opacity = Math.min(0.95, imprint.material.opacity + dt * 6);
            return t < 1.8;
          },
          dispose: function () {
            removeObj(hk);
            if (imprint) { var im = imprint; setTimeout(function () { removeObj(im); requestRender(); }, 60); }
            finish();
          }
        });
        function onPress(X, Y) {
          if (holderEl) holderEl.classList.remove('is-3d'); // 紙に印影（2Dのはんこ）があらわれる
          else {
            var T = S.THREE;
            imprint = new T.Mesh(S.geo.circle, new T.MeshBasicMaterial({ map: stampTexture('print'), transparent: true, opacity: 0, depthWrite: false }));
            imprint.scale.set(R * 1.1, R * 1.1, 1); imprint.position.set(X, Y, 1); addObj(imprint);
          }
          if (!reduced) burst(tg.x, tg.y, 14, 120); // 小さな紙がふわっと
        }
      } catch (err) { finish(); fail(err); }
    });
  }

  function setReducedMotion(flag) {
    var was = isReduced();
    S.userReduced = !!flag;
    if (S.ok && was !== isReduced()) { try { applyMode(true); } catch (err) { fail(err); } }
  }

  global.Motion3D = {
    init: init,
    setScene: setScene,
    celebrate: celebrate,
    encourage: encourage,
    stepClear: stepClear,
    setReducedMotion: setReducedMotion,
    isEnabled: function () { return !!S.ok; }
  };
})(window);
