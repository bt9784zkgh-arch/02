/* =========================================================================
   motion3d.js  ―  おおぞら こころの たび の 3D演出（チーム02 motion-3d）
   テーマ「たびの てちょう」: 紙の鳥・切り絵の雲・紙ふぶき・朱のスタンプ
   ・three.js 0.158.0（lib/three.min.js）を <script> で先に読みこむ
   ・ES module は使わない（index.html をダブルクリックで開いても動く）
   ・WebGL が使えないときは、すべて「何もしない関数」になる（ゲームは止まらない）

   使い方（決まった形）
     Motion3D.init(containerElement, { theme })
     Motion3D.setScene('title' | 'play' | 'result')
     Motion3D.celebrate(x, y)       // 画面の px（getBoundingClientRect の値）
     Motion3D.encourage()
     Motion3D.stepClear(stepNo)     // Promise。開始から 0.8秒で「ドン」、約1.8秒で resolve
     Motion3D.setReducedMotion(bool)
   おまけ（読むだけ）
     Motion3D.isAvailable          // 3D が動いているとき true
   ========================================================================= */
(function (global) {
  'use strict';

  /* ---------------------------------------------------------------------
     0. 何もしない版（WebGL がないとき・こわれたとき）
     --------------------------------------------------------------------- */
  var noop = {
    init: function () { return false; },
    setScene: function () {},
    celebrate: function () {},
    encourage: function () {},
    stepClear: function () { return Promise.resolve(false); },
    setReducedMotion: function () {}
  };

  var impl = noop;          // いま使っている中身
  var pendingScene = null;  // init 前に setScene されたとき
  var manualReduced = false;

  function safe(name, fallbackValue) {
    return function () {
      try {
        return impl[name].apply(impl, arguments);
      } catch (err) {
        try { if (global.console) console.warn('[Motion3D] ' + name + ' を止めました:', err); } catch (e) {}
        disableAll();
        return typeof fallbackValue === 'function' ? fallbackValue() : fallbackValue;
      }
    };
  }

  var API = {
    isAvailable: false,
    init: safe('init', false),
    setScene: function (name) {
      pendingScene = name;
      return safe('setScene')(name);
    },
    celebrate: safe('celebrate'),
    encourage: safe('encourage'),
    stepClear: safe('stepClear', function () { return Promise.resolve(false); }),
    setReducedMotion: function (on) {
      manualReduced = !!on;
      return safe('setReducedMotion')(on);
    }
  };

  var disposeCurrent = null;
  function disableAll() {
    var d = disposeCurrent;
    disposeCurrent = null;
    impl = noop;
    API.isAvailable = false;
    if (d) { try { d(); } catch (e) {} }
  }

  global.Motion3D = API;

  /* ---------------------------------------------------------------------
     1. 本物の中身（init が成功したときだけ作る）
     --------------------------------------------------------------------- */
  noop.init = function (container, options) {
    if (!container || !container.appendChild) return false;
    var THREE = global.THREE;
    if (!THREE || !THREE.WebGLRenderer) return false;

    // WebGL があるか先に調べる（three.js に console.error を出させない）
    var canvas = document.createElement('canvas');
    var ctxAttr = { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'default' };
    var gl = null;
    try {
      gl = canvas.getContext('webgl2', ctxAttr) || canvas.getContext('webgl', ctxAttr) || canvas.getContext('experimental-webgl', ctxAttr);
    } catch (e) { gl = null; }
    if (!gl) return false;

    var real = createReal(THREE, container, canvas, gl, options || {});
    if (!real) return false;
    impl = real;
    API.isAvailable = true;
    if (pendingScene) real.setScene(pendingScene);
    return true;
  };

  /* ---------------------------------------------------------------------
     2. 小さな道具
     --------------------------------------------------------------------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  var Ease = {
    outCubic: function (t) { return 1 - Math.pow(1 - t, 3); },
    inCubic: function (t) { return t * t * t; },
    inOutSine: function (t) { return -(Math.cos(Math.PI * t) - 1) / 2; },
    outBack: function (t) { var c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
    // ばね: 0→1 に行って少し行きすぎて もどる
    spring: function (t) { if (t >= 1) return 1; return 1 - Math.exp(-6.5 * t) * Math.cos(10.5 * t); },
    // バウンド（着地）
    outBounce: function (t) {
      var n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
      if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
      t -= 2.625 / d1; return n1 * t * t + 0.984375;
    }
  };

  // くり返しても同じになる乱数（見た目を毎回そろえる）
  function makeRandom(seed) {
    var s = seed >>> 0 || 1;
    return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; };
  }

  // SVG の path（M m L l C c S s Q q H h V v Z）を THREE.Shape にする
  function svgPathToShape(THREE, d) {
    var tok = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e[-+]?\d+)?/g) || [];
    var shape = new THREE.Shape();
    var i = 0, cmd = '', x = 0, y = 0, sx = 0, sy = 0, lcx = 0, lcy = 0;
    function num() { return parseFloat(tok[i++]); }
    while (i < tok.length) {
      if (/[a-zA-Z]/.test(tok[i])) cmd = tok[i++];
      var rel = cmd === cmd.toLowerCase();
      var C = cmd.toUpperCase();
      var ox = rel ? x : 0, oy = rel ? y : 0;
      if (C === 'M') { x = ox + num(); y = oy + num(); shape.moveTo(x, y); sx = x; sy = y; lcx = x; lcy = y; cmd = rel ? 'l' : 'L'; }
      else if (C === 'L') { x = ox + num(); y = oy + num(); shape.lineTo(x, y); lcx = x; lcy = y; }
      else if (C === 'H') { x = (rel ? x : 0) + num(); shape.lineTo(x, y); lcx = x; lcy = y; }
      else if (C === 'V') { y = (rel ? y : 0) + num(); shape.lineTo(x, y); lcx = x; lcy = y; }
      else if (C === 'C') {
        var x1 = ox + num(), y1 = oy + num(), x2 = ox + num(), y2 = oy + num(), ex = ox + num(), ey = oy + num();
        shape.bezierCurveTo(x1, y1, x2, y2, ex, ey); lcx = x2; lcy = y2; x = ex; y = ey;
      } else if (C === 'S') {
        var rx = 2 * x - lcx, ry = 2 * y - lcy;
        var sx2 = ox + num(), sy2 = oy + num(), sex = ox + num(), sey = oy + num();
        shape.bezierCurveTo(rx, ry, sx2, sy2, sex, sey); lcx = sx2; lcy = sy2; x = sex; y = sey;
      } else if (C === 'Q') {
        var qx = ox + num(), qy = oy + num(), qex = ox + num(), qey = oy + num();
        shape.quadraticCurveTo(qx, qy, qex, qey); lcx = qx; lcy = qy; x = qex; y = qey;
      } else if (C === 'Z') { shape.lineTo(sx, sy); x = sx; y = sy; }
      else { i++; }
    }
    return shape;
  }

  /* ---------------------------------------------------------------------
     3. 本体
     --------------------------------------------------------------------- */
  function createReal(THREE, container, canvas, gl, options) {
    /* ---- 色（design.md 10章。CSS 変数があればそれを使う） ---- */
    var css = null;
    try { css = global.getComputedStyle(container); } catch (e) { css = null; }
    function cssColor(name, fallback) {
      var v = '';
      try { v = css ? String(css.getPropertyValue(name)).trim() : ''; } catch (e) { v = ''; }
      return /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : fallback;
    }
    var C = {
      ink: cssColor('--ink', '#2d3b4e'),
      rule: cssColor('--rule', '#9fb0c4'),
      paper: cssColor('--paper', '#fffdf8'),
      paperEdge: cssColor('--paper-edge', '#f3ecdd'),
      kokoro: cssColor('--kokoro', '#3f6fb0'),
      kotoba: cssColor('--kotoba', '#d9782d'),
      kurashi: cssColor('--kurashi', '#3f8f5f'),
      shu: cssColor('--shu', '#b8462a'),
      yellow: '#e8c95b',
      bird: '#dbe8f7',
      cloudA: '#ffffff',
      cloudB: '#eef3f8',
      wood: '#e9dcc4',
      woodDark: '#d6c3a2'
    };
    var theme = options.theme;
    if (theme && typeof theme === 'object') {
      var src = theme.colors && typeof theme.colors === 'object' ? theme.colors : theme;
      for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k) && C[k] && typeof src[k] === 'string') C[k] = src[k];
    }
    var CONFETTI_COLORS = [C.kokoro, C.kotoba, C.kurashi, C.yellow, C.paper];

    /* ---- うごきをへらす ---- */
    var osReduced = false, mq = null;
    try {
      mq = global.matchMedia ? global.matchMedia('(prefers-reduced-motion: reduce)') : null;
      osReduced = !!(mq && mq.matches);
    } catch (e) { mq = null; }
    function onMQ(e) { osReduced = !!e.matches; }
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', onMQ); else if (mq.addListener) mq.addListener(onMQ); }
    function reduced() { return manualReduced || osReduced; }

    /* ---- レンダラー ---- */
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, context: gl, alpha: true, antialias: true });
    } catch (e) { return null; }
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap; // 紙をずらして重ねたような 固い影
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;

    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'motion3d-canvas';
    var cs = canvas.style;
    cs.position = 'absolute'; cs.left = '0'; cs.top = '0'; cs.width = '100%'; cs.height = '100%';
    cs.pointerEvents = 'none'; cs.display = 'block'; cs.background = 'transparent';
    try {
      var pos = global.getComputedStyle(container).position;
      if (!pos || pos === 'static') container.style.position = 'relative';
    } catch (e) {}
    container.style.pointerEvents = 'none';
    container.appendChild(canvas);

    var scene = new THREE.Scene();

    // カメラ: 奥行き z=0 の面で 1単位 = 100px（基準 1920×1080）
    var FOV = 30;
    var W = 1920, H = 1080;           // 「ステージ」の大きさ（CSS の px。拡大前）
    var HALF_H0 = H / 200;            // 5.4
    var CAM_D = HALF_H0 / Math.tan(FOV * Math.PI / 360);
    var camera = new THREE.PerspectiveCamera(FOV, W / H, 0.5, 120);
    camera.position.set(0, 0, CAM_D);

    // 光: 空 #ffffff／地面 #f3ecdd ＋ 影を出すライト 1つだけ
    var hemi = new THREE.HemisphereLight(0xffffff, new THREE.Color(C.paperEdge), 1.3);
    scene.add(hemi);
    var sun = new THREE.DirectionalLight(0xffffff, 1.85);
    sun.position.set(-2, 3, 24);   // ほぼ正面の左上から。影は右下に少しだけ ずれる
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
    sun.shadow.camera.top = 7.5; sun.shadow.camera.bottom = -7.5;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 60;
    sun.shadow.bias = -0.002;
    scene.add(sun);
    scene.add(sun.target);

    // 影を受ける 見えない紙（影の色だけ見える。うすい青灰色）
    var shadowMat = new THREE.ShadowMaterial({ color: new THREE.Color(C.rule), opacity: 0.32, depthWrite: false });
    var shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(40, 24), shadowMat);
    shadowPlane.position.z = -0.6;
    shadowPlane.receiveShadow = true;
    scene.add(shadowPlane);

    /* ---- トゥーンの段（3段） ---- */
    var gradData = new Uint8Array([150, 150, 150, 255, 205, 205, 205, 255, 255, 255, 255, 255]);
    var gradientMap = new THREE.DataTexture(gradData, 3, 1, THREE.RGBAFormat);
    gradientMap.minFilter = THREE.NearestFilter;
    gradientMap.magFilter = THREE.NearestFilter;
    gradientMap.generateMipmaps = false;
    gradientMap.needsUpdate = true;

    var disposables = [gradientMap];
    function toon(color, extra, solid) {
      // solid: 閉じた立体（はんこ・メダル）は表だけ描く（うすくしたときに中が すけない）
      var m = new THREE.MeshToonMaterial({ color: new THREE.Color(color), gradientMap: gradientMap, side: solid ? THREE.FrontSide : THREE.DoubleSide, transparent: true });
      if (extra) for (var k in extra) m[k] = extra[k];
      m.userData.baseOpacity = m.opacity;
      disposables.push(m);
      return m;
    }
    function lineMat(color) {
      var m = new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: true });
      m.userData.baseOpacity = 1;
      disposables.push(m);
      return m;
    }
    function basicMat(opts) {
      var m = new THREE.MeshBasicMaterial(opts);
      m.transparent = true;
      m.userData.baseOpacity = m.opacity;
      disposables.push(m);
      return m;
    }
    function geo(g) { disposables.push(g); return g; }

    /* ---- かたち（一度だけ作って使い回す） ---- */
    // 紙の鳥（bird.svg の線をそのまま使う）。基準: 幅 64(svg) = 1単位
    var BIRD_BODY = 'M14 54c6-10 20-12 30-6 4 2 6 6 8 4 2-6 6-9 12-9 4 0 7 3 8 6l6 2.4-6 2.8c-1 8-6 15-14 19l2 11.6-8-.8-1-9.2c-12 3-26-2-33-12-3-4-6-6-4-8.8z';
    var BIRD_WING = 'M46 49c-2-14 8-30 26-35-5 9-6 18-3 27.4z';
    var CLOUD = 'M30 70c-16 0-18-24 0-25 2-18 26-22 34-8 6-12 28-9 28 8 2 0 4 0 6 1 14 3 12 24-4 24z';

    function svgGeo(d, cx, cy, scale, depth, curveSegs) {
      var sh = svgPathToShape(THREE, d);
      var g = new THREE.ExtrudeGeometry(sh, { depth: depth, bevelEnabled: false, curveSegments: curveSegs || 6 });
      g.translate(-cx, -cy, -depth / 2);
      g.scale(scale, -scale, scale);  // SVG は y が下向き
      g.computeVertexNormals();
      return geo(g);
    }
    var BS = 1 / 64;
    var birdBodyGeo = svgGeo(BIRD_BODY, 46, 52, BS, 3, 5);
    // 翼は 付け根（46,49）→（69,41.4）を ちょうつがいにする
    var wingGeo = svgGeo(BIRD_WING, 46, 49, BS, 2, 5);
    var birdBodyEdges = geo(new THREE.EdgesGeometry(birdBodyGeo, 40));
    var wingEdges = geo(new THREE.EdgesGeometry(wingGeo, 40));
    var eyeGeo = geo(new THREE.CircleGeometry(2.4 * BS, 14));
    var hingeAxis = new THREE.Vector3((69 - 46), -(41.4 - 49), 0).normalize();

    var cloudGeo = svgGeo(CLOUD, 62, 48, 1 / 100, 5, 8);   // 幅 100(svg) = 1単位
    var cloudEdges = geo(new THREE.EdgesGeometry(cloudGeo, 40));

    // 紙ふぶきのかたち
    var confSquare = geo(new THREE.PlaneGeometry(1, 0.72));
    var triShape = new THREE.Shape();
    triShape.moveTo(0, 0.6); triShape.lineTo(-0.55, -0.4); triShape.lineTo(0.55, -0.4); triShape.lineTo(0, 0.6);
    var confTri = geo(new THREE.ShapeGeometry(triShape));
    var starShape = new THREE.Shape();
    for (var si = 0; si < 10; si++) {
      var ang = Math.PI / 2 + si * Math.PI / 5, rr = si % 2 ? 0.24 : 0.56;
      if (si === 0) starShape.moveTo(Math.cos(ang) * rr, Math.sin(ang) * rr); else starShape.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    starShape.closePath();
    var confStar = geo(new THREE.ExtrudeGeometry(starShape, { depth: 0.22, bevelEnabled: false }));
    confStar.translate(0, 0, -0.11);
    confStar.computeVertexNormals();

    /* ---- スタンプの図柄（stamp-n.svg と同じ線を Canvas に描く） ---- */
    var STAMP_PATHS = {
      ring: ['M50 6c24 0 44 19 44 44S75 94 50 94 6 75 6 50 26 6.5 50 6z', 4],
      ring2: ['M50 14c20 0 36 16 36 36S70 86 50 86 14 70 14 50 30 14.5 50 14z', 1.8],
      1: [['M22 50h56', 2.6], ['M40 50l6-14 5 4 6-10 7 20', 3], ['M34 50l-4 10 10 10 18-1 9-10-4-9', 3]],
      2: [['M30 64c-4-4-6-9-6-14v-6c0-2 4-2 4 0v4-14c0-3 4-3 4 0v12-15c0-3 4-3 4 0v15-13c0-3 4-3 4 0v14-9c0-3 4-3 4 0v15c0 7-3 11-7 15z', 2.6],
          ['M56 52c-5 0-6-8 0-8 1-6 9-8 12-3 2-4 10-3 10 3 6 0 6 8 0 8z', 2.6]],
      3: [['CIRCLE', 2.8], ['M32 72c0-12 8-20 18-20s18 8 18 20', 2.8], ['M45 40h.1M55 40h.1', 3.6], ['M46 45c2 2 6 2 8 0', 2.2]]
    };
    var stampTexCache = {};
    // kind: 'print'（紙に押した印）／'face'（はんこの面。左右反転）／'medal'（ふり返りの紙）
    function stampTexture(n, kind) {
      var key = n + kind;
      if (stampTexCache[key]) return stampTexCache[key];
      var S = 256, cv = document.createElement('canvas');
      cv.width = S; cv.height = S;
      var x = cv.getContext('2d');
      var ink = kind === 'face' ? '#f6dccf' : C.shu;
      if (kind === 'face') {
        x.fillStyle = C.shu; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.fill();
        x.translate(S, 0); x.scale(-1, 1);
      } else if (kind === 'medal') {
        x.fillStyle = C.paper; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.fill();
      }
      x.save();
      x.translate(S * 0.04, S * 0.04);
      x.scale(S * 0.92 / 100, S * 0.92 / 100);
      x.strokeStyle = ink; x.lineCap = 'round'; x.lineJoin = 'round';
      var list = [STAMP_PATHS.ring, STAMP_PATHS.ring2].concat(STAMP_PATHS[n] || STAMP_PATHS[1]);
      for (var i = 0; i < list.length; i++) {
        var d = list[i][0];
        x.lineWidth = list[i][1] * 1.25;
        if (d === 'CIRCLE') { x.beginPath(); x.arc(50, 40, 10, 0, Math.PI * 2); x.stroke(); continue; }
        if (typeof global.Path2D === 'function') {
          try { x.stroke(new global.Path2D(d)); continue; } catch (e) {}
        }
        if (i < 2) { x.beginPath(); x.arc(50, 50, i === 0 ? 44 : 36, 0, Math.PI * 2); x.stroke(); }
      }
      x.restore();
      // 印のかすれ（はんこらしさ）
      if (kind !== 'face') {
        var rnd = makeRandom(97 + n * 31);
        x.globalCompositeOperation = 'destination-out';
        for (var j = 0; j < 140; j++) {
          x.globalAlpha = 0.25 + rnd() * 0.5;
          x.beginPath(); x.arc(rnd() * S, rnd() * S, 0.6 + rnd() * 1.8, 0, Math.PI * 2); x.fill();
        }
        x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
        if (kind === 'medal') { // かすれで抜けた紙を もどす
          x.globalCompositeOperation = 'destination-over';
          x.fillStyle = C.paper; x.beginPath(); x.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2); x.fill();
          x.globalCompositeOperation = 'source-over';
        }
      }
      var tex = new THREE.CanvasTexture(cv);
      if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 2;
      disposables.push(tex);
      stampTexCache[key] = tex;
      return tex;
    }

    /* ---- 座標（ステージの px → 3D） ---- */
    function halfAt(z) { return (CAM_D - z) * Math.tan(FOV * Math.PI / 360); }
    function stageToWorld(px, py, z, out) {
      z = z || 0;
      var hh = halfAt(z), hw = hh * (W / H);
      out = out || new THREE.Vector3();
      return out.set((px / W - 0.5) * 2 * hw, -(py / H - 0.5) * 2 * hh, z);
    }
    function pxToWorld(px, z) { return px * (2 * halfAt(z || 0)) / H; } // 長さ
    // 画面の px（getBoundingClientRect）→ ステージの px
    function screenToStage(x, y) {
      var r = container.getBoundingClientRect();
      var sw = r.width || W, sh = r.height || H;
      return { x: (x - r.left) * (W / sw), y: (y - r.top) * (H / sh) };
    }
    function elementStageRect(el) {
      var r = el.getBoundingClientRect();
      if (!r || (r.width === 0 && r.height === 0)) return null;
      var a = screenToStage(r.left, r.top), b = screenToStage(r.right, r.bottom);
      // 回転した要素（.stamp は -10度）でも 本当の大きさを使う
      var w = el.offsetWidth || (b.x - a.x), h = el.offsetHeight || (b.y - a.y);
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: w, h: h };
    }
    function root() {
      return (container.closest && container.closest('.stage')) || container.parentNode || document;
    }

    /* ---- 大きさ合わせ ---- */
    var lastKey = '';
    function resize() {
      var cw = container.clientWidth || W, ch = container.clientHeight || H;
      var r = container.getBoundingClientRect();
      var shown = r.width ? r.width / cw : 1;               // .stage の scale
      var pr = clamp((global.devicePixelRatio || 1) * shown, 0.5, 1.75);
      var key = cw + 'x' + ch + '@' + pr.toFixed(3);
      if (key === lastKey) return;
      lastKey = key;
      W = cw; H = ch;
      HALF_H0 = H / 200;
      CAM_D = HALF_H0 / Math.tan(FOV * Math.PI / 360);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(pr);
      renderer.setSize(cw, ch, false);
      layoutDirty = true;
    }
    var layoutDirty = true;
    function onResize() { lastKey = ''; resize(); }
    global.addEventListener('resize', onResize);

    /* ---- 時間・トゥイーン ---- */
    var now = 0, lastT = 0;
    var tweens = [];
    function tween(dur, delay, fn, done) {
      var tw = { start: now + (delay || 0), dur: Math.max(dur, 0.0001), fn: fn, done: done, dead: false };
      tweens.push(tw);
      return tw;
    }
    function runTweens() {
      for (var i = tweens.length - 1; i >= 0; i--) {
        var tw = tweens[i];
        if (tw.dead) { tweens.splice(i, 1); continue; }
        var p = (now - tw.start) / tw.dur;
        if (p < 0) continue;
        if (p >= 1) {
          tweens.splice(i, 1);
          tw.fn(1);
          if (tw.done) tw.done();
        } else tw.fn(p);
      }
    }

    /* ---- うすくする（グループ全体の透明度） ---- */
    function setOpacity(obj, a) {
      obj.traverse(function (o) {
        var m = o.material;
        if (!m) return;
        var arr = Array.isArray(m) ? m : [m];
        for (var i = 0; i < arr.length; i++) {
          var base = arr[i].userData.baseOpacity != null ? arr[i].userData.baseOpacity : 1;
          arr[i].opacity = base * a;
        }
      });
      obj.visible = a > 0.003;
    }

    /* ---- 部品: 紙の鳥 ---- */
    function makeBird() {
      var g = new THREE.Group();
      var body = new THREE.Mesh(birdBodyGeo, toon(C.bird));
      body.castShadow = true;
      g.add(body);
      g.add(new THREE.LineSegments(birdBodyEdges, lineMat(C.ink)));
      var eyeM = basicMat({ color: new THREE.Color(C.ink), side: THREE.DoubleSide });
      var eye = new THREE.Mesh(eyeGeo, eyeM);
      eye.position.set((66 - 46) * BS, -(50 - 52) * BS, 1.5 * BS + 0.003);
      g.add(eye);
      var eye2 = eye.clone(); eye2.position.z = -1.5 * BS - 0.003; g.add(eye2);
      // 翼（ちょうつがいで はばたく）
      var pivot = new THREE.Group();
      pivot.position.set(0, (52 - 49) * BS, 1.5 * BS + 1 * BS + 0.002);
      var wing = new THREE.Mesh(wingGeo, toon(C.bird));
      wing.castShadow = true;
      pivot.add(wing);
      pivot.add(new THREE.LineSegments(wingEdges, lineMat(C.ink)));
      g.add(pivot);
      var tilt = new THREE.Group();   // 首をかしげる・ジャンプ用
      tilt.add(g);
      var outer = new THREE.Group();
      outer.add(tilt);
      return {
        obj: outer, tilt: tilt, body: g, pivot: pivot, phase: 0,
        flap: function (a) { pivot.quaternion.setFromAxisAngle(hingeAxis, a); }
      };
    }
    /* ---- 部品: 切り絵の雲 ---- */
    function makeCloud(tint) {
      var g = new THREE.Group();
      var m = new THREE.Mesh(cloudGeo, [toon(tint ? C.cloudB : C.cloudA), toon(C.cloudB)]);
      m.castShadow = true;
      g.add(m);
      g.add(new THREE.LineSegments(cloudEdges, lineMat(C.rule)));
      return g;
    }

    /* ---- 場面ごとのグループ ---- */
    var current = null;     // { name, group, update(dt,t), leave() }
    var cam = { theta: 0, targetX: 0 };

    function fadeOutAndRemove(group, dur, after) {
      tween(dur, 0, function (p) { setOpacity(group, 1 - p); }, function () {
        scene.remove(group);
        if (after) after();
      });
    }

    function setScene(name) {
      if (name !== 'title' && name !== 'play' && name !== 'result') return;
      if (current && current.name === name) return;
      var prev = current;
      if (prev) {
        if (prev.leave) prev.leave();
        fadeOutAndRemove(prev.group, reduced() ? 0.2 : 0.35);
      }
      clearStepStamp();
      var builders = { title: buildTitle, play: buildPlay, result: buildResult };
      current = builders[name]();
      current.name = name;
      shadowPlane.position.z = name === 'title' ? -1.5 : -0.6;
      scene.add(current.group);
      layoutDirty = true;
    }

    /* =====================================================================
       タイトル: 紙の鳥3羽と雲が 奥から飛び出し、右半分で ゆっくり回りながら うかぶ
       ===================================================================== */
    function buildTitle() {
      var group = new THREE.Group();
      // ステージ px（右半分 x > 960）・奥行き z・大きさ px
      var spec = [
        { type: 'bird', x: 1780, y: 500, z: 0.7, size: 170, rot: -0.15, delay: 0.25 },   // ステップ3の文の下・右はし。右上のボタンや文字に かからない
        { type: 'bird', x: 1870, y: 820, z: -0.6, size: 110, rot: 0.1, delay: 0.55 },
        { type: 'bird', x: 1250, y: 120, z: -1.0, size: 110, rot: 0.2, delay: 0.75 },
        { type: 'cloud', x: 1130, y: 300, z: -1.6, size: 200, tint: false, delay: 0.0 },
        { type: 'cloud', x: 1360, y: 64, z: -2.4, size: 150, tint: true, delay: 0.1 },
        { type: 'cloud', x: 1560, y: 760, z: -0.8, size: 210, tint: false, delay: 0.35 },
        { type: 'cloud', x: 1620, y: 980, z: -1.8, size: 190, tint: true, delay: 0.45 },
        { type: 'cloud', x: 1020, y: 930, z: -2.6, size: 150, tint: false, delay: 0.6 }
      ];
      var items = [];
      var R = reduced();
      spec.forEach(function (s, i) {
        var it = { s: s, phase: i * 1.7 };
        if (s.type === 'bird') { it.bird = makeBird(); it.obj = it.bird.obj; }
        else it.obj = makeCloud(s.tint);
        it.home = new THREE.Vector3();
        it.enter = 0;
        group.add(it.obj);
        items.push(it);
        setOpacity(it.obj, 0);
        // 飛び出し（奥から）／すくなめのときは その場で ふわっと
        tween(R ? 0.6 : 1.5, s.delay + (R ? 0 : 0.1), function (p) { it.enter = p; });
      });
      if (!R) {
        cam.theta = -0.10;
        tween(2.4, 0, function (p) { cam.theta = lerp(-0.10, 0, Ease.outCubic(p)); });
      }
      function layout() {
        items.forEach(function (it) {
          stageToWorld(it.s.x, it.s.y, it.s.z, it.home);
          var sc = pxToWorld(it.s.size, it.s.z);
          it.scale = sc;
        });
      }
      layout();
      return {
        group: group,
        layout: layout,
        camOrbit: true,
        update: function (dt, t) {
          var R = reduced();
          items.forEach(function (it) {
            var e = it.enter;
            var o = it.obj;
            if (R) {
              o.position.copy(it.home);
              o.rotation.set(0, 0, it.s.type === 'bird' ? it.s.rot : 0);
              o.scale.setScalar(it.scale);
              setOpacity(o, Ease.inOutSine(e));
              if (it.bird) it.bird.flap(0.25);
              return;
            }
            var sp = Ease.spring(e);
            var bob = Math.sin(t * 0.9 + it.phase) * 0.09;
            o.position.set(it.home.x, it.home.y + bob * e, lerp(-22, it.home.z, Ease.outCubic(e)));
            o.position.x = lerp(it.home.x - 1.5, it.home.x, Ease.outCubic(e));
            o.scale.setScalar(it.scale * Math.max(0.05, sp));
            setOpacity(o, clamp(e * 3, 0, 1));
            if (it.bird) {
              // くるっと回りながら来て、そのあと ゆっくり 左右に向きを変える
              o.rotation.set(Math.sin(t * 0.5 + it.phase) * 0.08,
                (1 - Ease.outCubic(e)) * Math.PI * 2 + Math.sin(t * 0.45 + it.phase) * 0.38,
                it.s.rot + Math.sin(t * 0.7 + it.phase) * 0.05);
              it.bird.flap(0.35 + Math.sin(t * 3.4 + it.phase) * 0.55);
            } else {
              o.rotation.set(0, (1 - Ease.outCubic(e)) * 1.6 + Math.sin(t * 0.3 + it.phase) * 0.22, 0);
              o.position.x += Math.sin(t * 0.2 + it.phase) * 0.12;
            }
          });
        },
        bird: items[0].bird, items: items
      };
    }

    /* =====================================================================
       問題中: 上の帯の右はし（x 1320〜1440）に 鳥1羽、左右 48px のよはくに 小さな雲
       （ごく ゆっくり。問題・絵・選択肢の上では動かさない）
       ===================================================================== */
    function buildPlay() {
      var group = new THREE.Group();
      var bird = makeBird();
      group.add(bird.obj);
      var birdSpec = { x: 1380, y: 80, z: 0.4, size: 104 };
      var clouds = [
        { x: 24, y: 330, z: 0, w: 46, v: 6, tint: false },
        { x: 24, y: 800, z: 0, w: 42, v: 5, tint: true },
        { x: 1896, y: 520, z: 0, w: 46, v: 5.5, tint: true },
        { x: 1896, y: 960, z: 0, w: 42, v: 6.5, tint: false }
      ].map(function (s) { var o = makeCloud(s.tint); group.add(o); return { s: s, obj: o, y: s.y }; });
      var home = new THREE.Vector3(), birdScale = 1;
      var state = { enter: 0, jump: 0, jumping: false, tiltA: 0 };
      group.children.forEach(function (c) { setOpacity(c, 0); });
      tween(reduced() ? 0.4 : 0.9, 0.15, function (p) { state.enter = p; });
      function layout() {
        stageToWorld(birdSpec.x, birdSpec.y, birdSpec.z, home);
        birdScale = pxToWorld(birdSpec.size, birdSpec.z);
      }
      layout();
      var Y_TOP = 190, Y_BOT = 1050;
      return {
        group: group, layout: layout, bird: bird, state: state,
        update: function (dt, t) {
          var R = reduced();
          var e = state.enter;
          setOpacity(bird.obj, Ease.inOutSine(e));
          bird.obj.position.copy(home);
          bird.obj.scale.setScalar(birdScale * (R ? 1 : lerp(0.6, 1, Ease.spring(e))));
          if (R) {
            bird.obj.rotation.set(0, 0, 0);
            bird.flap(0.25);
            bird.tilt.position.set(0, 0, 0);
          } else {
            // ごく小さく ゆっくり（集中のじゃまをしない）
            bird.obj.position.y += Math.sin(t * 0.8) * 0.03;
            bird.obj.rotation.set(0, Math.sin(t * 0.35) * 0.12, 0);
            bird.flap(state.jumping ? 0.3 + Math.sin(t * 16) * 0.7 : 0.3 + Math.sin(t * 1.6) * 0.18);
          }
          clouds.forEach(function (c) {
            if (!R) {
              c.y -= c.s.v * dt;              // 1秒に 5〜6px
              if (c.y < Y_TOP) c.y += (Y_BOT - Y_TOP);
            }
            stageToWorld(c.s.x, c.y, c.s.z, c.obj.position);
            c.obj.scale.setScalar(pxToWorld(c.s.w, 0));
            var edge = Math.min(c.y - Y_TOP, Y_BOT - c.y);
            setOpacity(c.obj, Ease.inOutSine(e) * clamp(edge / 80, 0, 1) * 0.95);
          });
        }
      };
    }

    /* =====================================================================
       ふり返り: .stamp-slot に スタンプ3つを1つずつ並べ、1つずつ ふわっと明るく
       ===================================================================== */
    function buildResult() {
      var group = new THREE.Group();
      var medalGeo = geo(new THREE.CylinderGeometry(1, 1, 0.12, 48));
      var medalEdge = geo(new THREE.EdgesGeometry(medalGeo, 30));
      var haloGeo = geo(new THREE.RingGeometry(1.04, 1.24, 48));
      var medals = [1, 2, 3].map(function (n, i) {
        var g = new THREE.Group();
        var top = toon('#ffffff', { map: stampTexture(n, 'medal') }, true);
        var m = new THREE.Mesh(medalGeo, [toon(C.paperEdge, null, true), top, toon(C.paper, null, true)]);
        m.rotation.x = Math.PI / 2;      // 図柄の面を カメラへ
        m.rotation.y = Math.PI / 2;      // 図柄の上下を そろえる
        m.castShadow = true;
        var inner = new THREE.Group();
        inner.add(m);
        var e = new THREE.LineSegments(medalEdge, lineMat(C.rule));
        e.rotation.copy(m.rotation);
        inner.add(e);
        var halo = new THREE.Mesh(haloGeo, basicMat({ color: new THREE.Color(C.yellow), opacity: 0.7, side: THREE.DoubleSide, depthWrite: false }));
        halo.position.z = -0.08;
        g.add(halo);
        g.add(inner);
        group.add(g);
        return { n: n, i: i, obj: g, inner: inner, halo: halo, home: new THREE.Vector3(), r: 0.6, enter: 0, glow: 0, found: false };
      });
      var hidden = [];
      var R0 = reduced();
      medals.forEach(function (md) {
        setOpacity(md.obj, 0);
        // 並ぶ（1つずつ 0.45秒おき）
        tween(R0 ? 0.5 : 0.9, 0.3 + md.i * (R0 ? 0.35 : 0.45), function (p) { md.enter = p; });
        // 1つずつ 光る（1回ずつ。点滅しない）
        tween(1.0, (R0 ? 1.6 : 2.0) + md.i * 0.75, function (p) { md.glow = p; });
      });
      var tries = 0;
      function layout() {
        var slots = [];
        try { slots = root().querySelectorAll('.stamp-slot'); } catch (e) { slots = []; }
        medals.forEach(function (md, i) {
          var el = slots[i], r = el ? elementStageRect(el) : null;
          if (!r) {
            r = { x: 1600, y: 300 + i * 200, w: 136, h: 136 };   // 見つからないときの場所
          } else if (!md.found) {
            md.found = true;
            // 3D がないとき用の <img> は 3D のあいだ かくす
            var imgs = el.querySelectorAll('img');
            for (var k = 0; k < imgs.length; k++) { hidden.push([imgs[k], imgs[k].style.visibility]); imgs[k].style.visibility = 'hidden'; }
          }
          stageToWorld(r.x, r.y, 0.15, md.home);
          md.r = pxToWorld(Math.min(r.w, r.h) * 0.46, 0.15);
        });
        return slots.length;
      }
      layout();
      return {
        group: group,
        layout: function () { layout(); },
        update: function (dt, t) {
          // スライドの DOM があとから出ることがあるので、2秒は さがし直す
          if (tries < 40 && medals.some(function (m) { return !m.found; })) { tries++; if (tries % 3 === 0) layout(); }
          var R = reduced();
          medals.forEach(function (md) {
            var e = md.enter, o = md.obj;
            o.position.copy(md.home);
            if (R) {
              o.scale.setScalar(md.r);
              md.inner.rotation.set(0, 0, 0);
              md.inner.scale.setScalar(1);
              setOpacity(o, Ease.inOutSine(e));
            } else {
              o.position.z = md.home.z + (1 - Ease.outCubic(e)) * 4;
              o.position.y = md.home.y + (1 - Ease.outBounce(e)) * 0.6;
              o.scale.setScalar(md.r * Math.max(0.05, Ease.spring(e)));
              md.inner.rotation.set(0, (1 - Ease.outCubic(e)) * -Math.PI * 2 + Math.sin(t * 0.6 + md.i) * 0.08, -0.14);
              setOpacity(o, clamp(e * 2.5, 0, 1));
            }
            // 光る: うすい黄色の輪が ふわっと出て消える＋スタンプが少し前へ
            var gl = md.glow, bump = Math.sin(Math.PI * gl);
            md.halo.material.opacity = 0.7 * bump * (e > 0.9 ? 1 : 0);
            md.halo.visible = bump > 0.01 && e > 0.9;
            md.halo.scale.setScalar(R ? 1 : 0.92 + gl * 0.25);
            if (!R) {
              md.inner.scale.setScalar(1 + bump * 0.12);
              md.inner.position.z = bump * 0.25;
            }
          });
        },
        leave: function () {
          hidden.forEach(function (h) { h[0].style.visibility = h[1]; });
          hidden = [];
        }
      };
    }

    /* =====================================================================
       紙ふぶき（せいかい／スタンプの「ドン」）
       同時に出せるのは 180まいまで（物体 300個の上限を守る）
       ===================================================================== */
    var MAX_PIECES = 180;
    var pieces = [];
    var confettiGroup = new THREE.Group();
    scene.add(confettiGroup);
    var pieceGeos = [confSquare, confSquare, confTri, confTri, confStar];

    function spawnPiece(opt) {
      if (pieces.length >= MAX_PIECES) {           // いちばん古いものを使い回す
        var old = pieces.shift();
        confettiGroup.remove(old.mesh);
        old.mesh.material.dispose();
      }
      var m = new THREE.MeshToonMaterial({ color: new THREE.Color(opt.color), gradientMap: gradientMap, side: THREE.DoubleSide, transparent: true });
      var mesh = new THREE.Mesh(opt.geo, m);
      mesh.position.copy(opt.pos);
      mesh.scale.setScalar(opt.size);
      mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
      confettiGroup.add(mesh);
      var p = {
        mesh: mesh, vel: opt.vel, spin: opt.spin, life: opt.life, age: -(opt.delay || 0),
        gravity: opt.gravity, drag: opt.drag, size: opt.size, fadeIn: opt.fadeIn || 0, still: !!opt.still
      };
      if (p.age < 0 || p.fadeIn) { m.opacity = 0; }
      pieces.push(p);
      return p;
    }
    function updatePieces(dt) {
      for (var i = pieces.length - 1; i >= 0; i--) {
        var p = pieces[i];
        p.age += dt;
        if (p.age < 0) continue;
        if (p.age >= p.life) {
          confettiGroup.remove(p.mesh);
          p.mesh.material.dispose();
          pieces.splice(i, 1);
          continue;
        }
        var m = p.mesh;
        if (!p.still) {
          p.vel.y -= p.gravity * dt;
          var k = Math.exp(-p.drag * dt);
          p.vel.multiplyScalar(k);
          // ひらひら（紙が空気でゆれる）
          m.position.x += (p.vel.x + Math.sin(p.age * 9 + p.spin.x) * 0.25) * dt;
          m.position.y += p.vel.y * dt;
          m.position.z += p.vel.z * dt;
          m.rotation.x += p.spin.x * dt; m.rotation.y += p.spin.y * dt; m.rotation.z += p.spin.z * dt;
        }
        var left = p.life - p.age;
        var a = clamp(left / 0.35, 0, 1);
        if (p.fadeIn) a *= clamp(p.age / p.fadeIn, 0, 1);
        m.material.opacity = a;
        m.scale.setScalar(p.size * (p.still ? 1 : (0.55 + 0.45 * a)));
      }
    }

    function burst(sx, sy, opt) {
      opt = opt || {};
      var R = reduced();
      var center = stageToWorld(sx, sy, opt.z != null ? opt.z : 0.6);
      var count = opt.count || 60;
      var colors = opt.colors || CONFETTI_COLORS;
      var rnd = Math.random;
      if (R) {
        // すくなめ: まわりに 12まい ふわっと出て、そのまま消える（動かない）
        var n = Math.min(12, count);
        for (var j = 0; j < n; j++) {
          var a = j / n * Math.PI * 2;
          var rr = pxToWorld(opt.ringPx || 120, center.z);
          spawnPiece({
            geo: j % 4 === 3 ? confStar : (j % 2 ? confTri : confSquare),
            color: colors[j % colors.length],
            pos: new THREE.Vector3(center.x + Math.cos(a) * rr, center.y + Math.sin(a) * rr * 0.8, center.z),
            vel: new THREE.Vector3(), spin: new THREE.Vector3(), life: 1.2, gravity: 0, drag: 0,
            size: pxToWorld(20, center.z), fadeIn: 0.25, still: true
          });
        }
        return;
      }
      var speed = opt.speed || 1;
      for (var i = 0; i < count; i++) {
        var ang = rnd() * Math.PI * 2;
        var ring = pxToWorld(opt.ringPx != null ? opt.ringPx : 50, center.z) * (0.4 + rnd() * 0.6);
        var dir = new THREE.Vector3(Math.cos(ang), Math.sin(ang) * 0.85 + (opt.up != null ? opt.up : 0.55), 0);
        var sp = (3.2 + rnd() * 4.2) * speed;
        var g = pieceGeos[i % pieceGeos.length];
        spawnPiece({
          geo: g,
          color: g === confStar ? (i % 2 ? C.yellow : colors[(i >> 1) % colors.length]) : colors[i % colors.length],
          pos: new THREE.Vector3(center.x + Math.cos(ang) * ring, center.y + Math.sin(ang) * ring, center.z + rnd() * 0.3),
          vel: new THREE.Vector3(dir.x * sp, dir.y * sp, (rnd() - 0.3) * 2.2 * speed),
          spin: new THREE.Vector3((rnd() - 0.5) * 14, (rnd() - 0.5) * 14, (rnd() - 0.5) * 10),
          life: (opt.life || 1.15) + rnd() * 0.3,
          gravity: opt.gravity != null ? opt.gravity : 7.5,
          drag: opt.drag != null ? opt.drag : 1.6,
          size: pxToWorld((g === confStar ? 26 : 18) * (0.75 + rnd() * 0.5), center.z),
          delay: rnd() * 0.06
        });
      }
    }

    /* ---- 鳥の ジャンプ／首かしげ（いまの場面に鳥がいれば） ---- */
    function sceneBird() { return current && current.bird ? current.bird : null; }
    var birdTw = null;
    function birdJump() {
      var b = sceneBird();
      if (!b || reduced()) return;
      if (birdTw) birdTw.dead = true;
      var st = current.state;
      if (st) st.jumping = true;
      birdTw = tween(0.9, 0, function (p) {
        // ふわっと上がって、ぽよんと着地
        var up = p < 0.42 ? Ease.outCubic(p / 0.42) : 1 - Ease.outBounce((p - 0.42) / 0.58);
        b.tilt.position.y = up * 0.5;
        b.tilt.rotation.set(0, 0, Math.sin(p * Math.PI) * 0.25);
        var squash = p > 0.85 ? Math.sin((p - 0.85) / 0.15 * Math.PI) * 0.12 : 0;
        b.tilt.scale.set(1 + squash, 1 - squash, 1);
      }, function () {
        b.tilt.position.set(0, 0, 0); b.tilt.rotation.set(0, 0, 0); b.tilt.scale.set(1, 1, 1);
        if (st) st.jumping = false;
        birdTw = null;
      });
    }
    function birdTilt() {
      var b = sceneBird();
      if (!b) return;
      if (birdTw) birdTw.dead = true;
      var R = reduced();
      var A = R ? 0 : 0.36;
      birdTw = tween(1.6, 0, function (p) {
        // 0〜0.35秒で かしげる → 少し止まる → ゆっくり もどす（ゆれない）
        var a;
        if (p < 0.22) a = Ease.outBack(p / 0.22);
        else if (p < 0.6) a = 1;
        else a = 1 - Ease.inOutSine((p - 0.6) / 0.4);
        b.tilt.rotation.set(0, a * -0.25 * (A ? 1 : 0), a * A);
        b.tilt.position.y = a * (A ? 0.06 : 0);
      }, function () {
        b.tilt.rotation.set(0, 0, 0); b.tilt.position.set(0, 0, 0);
        birdTw = null;
      });
    }

    /* =====================================================================
       ステップクリア: はんこが くるっと回って 0.8秒で「ドン」
       ===================================================================== */
    var stampJob = null;   // いま押しているもの
    var printMark = null;  // DOM の .stamp がないときに 3D で残す印
    var hankoGeo = {
      head: geo(new THREE.CylinderGeometry(1, 1, 0.42, 48)),
      neck: geo(new THREE.CylinderGeometry(0.42, 0.58, 0.85, 32)),
      knob: geo(new THREE.SphereGeometry(0.52, 24, 14)),
      print: geo(new THREE.PlaneGeometry(2, 2))
    };
    var hankoEdges = geo(new THREE.EdgesGeometry(hankoGeo.head, 30));
    var HIT = 0.8, TOTAL = 1.8;

    function makeHanko(n) {
      var g = new THREE.Group();
      var head = new THREE.Mesh(hankoGeo.head, [toon(C.shu, null, true), toon(C.woodDark, null, true), toon('#ffffff', { map: stampTexture(n, 'face') }, true)]);
      head.castShadow = true;
      g.add(head);
      g.add(new THREE.LineSegments(hankoEdges, lineMat(C.ink)));
      var neck = new THREE.Mesh(hankoGeo.neck, toon(C.wood, null, true));
      neck.position.y = 0.63; neck.castShadow = true;
      g.add(neck);
      var knob = new THREE.Mesh(hankoGeo.knob, toon(C.wood, null, true));
      knob.position.y = 1.25; knob.scale.set(1, 0.78, 1); knob.castShadow = true;
      g.add(knob);
      // 印面（下の面）の上下を 図柄に合わせる
      head.rotation.y = Math.PI / 2;
      var spin = new THREE.Group(); spin.add(g);
      var outer = new THREE.Group(); outer.add(spin);
      return { obj: outer, spin: spin };
    }

    function clearStepStamp() {
      if (stampJob) stampJob.finish(true);
      if (printMark) {
        var pm = printMark; printMark = null;
        fadeOutAndRemove(pm, 0.25);
      }
    }

    function stepClear(stepNo) {
      var n = Math.round(Number(stepNo)) || 1;
      n = ((n - 1) % 3 + 3) % 3 + 1;
      clearStepStamp();
      var R = reduced();

      // 押す場所: .stamp（CSS 版のスタンプ）。なければ .sheet の左
      var stampEl = null, target = null;
      try { stampEl = root().querySelector('.stamp'); } catch (e) { stampEl = null; }
      if (stampEl) target = elementStageRect(stampEl);
      if (!target) {
        var sheet = null;
        try { sheet = root().querySelector('.sheet'); } catch (e) { sheet = null; }
        var sr = sheet ? elementStageRect(sheet) : null;
        target = sr ? { x: sr.x - sr.w / 2 + 72 + 170, y: sr.y, w: 320, h: 320 } : { x: 452, y: 540, w: 320, h: 320 };
      }
      // CSS 版の印は「ドン」までかくし、ドンの瞬間に出す
      var hiddenImgs = [];
      if (stampEl) {
        var imgs = stampEl.querySelectorAll('img');
        for (var i = 0; i < imgs.length; i++) { hiddenImgs.push([imgs[i], imgs[i].style.visibility]); imgs[i].style.visibility = 'hidden'; }
      }
      var radiusPx = Math.min(target.w, target.h) * 0.46;
      var hk = makeHanko(n);
      scene.add(hk.obj);
      setOpacity(hk.obj, 0);

      var timers = [];
      var resolveFn;
      var promise = new Promise(function (res) { resolveFn = res; });
      var job = { done: false };
      var tw;
      function revealPrint() {
        // 印を出すのは 1回だけ（2回目で 3D の印を作らない）
        if (job.done || job.revealed) return;
        job.revealed = true;
        if (hiddenImgs.length) {
          hiddenImgs.forEach(function (h) { h[0].style.visibility = h[1] === 'hidden' ? '' : h[1]; });
          hiddenImgs = [];
        } else if (!printMark) {
          var pm = new THREE.Mesh(hankoGeo.print, basicMat({ map: stampTexture(n, 'print'), depthWrite: false }));
          stageToWorld(target.x, target.y, 0.02, pm.position);
          pm.scale.setScalar(pxToWorld(target.w / 2, 0.02));
          pm.rotation.z = -10 * Math.PI / 180;
          var holder = new THREE.Group(); holder.add(pm);
          scene.add(holder);
          printMark = holder;
          setOpacity(holder, 0);
          tween(0.18, 0, function (p) { setOpacity(holder, p); holder.scale.setScalar(R ? 1 : lerp(1.12, 1, Ease.outCubic(p))); });
        }
        if (!R) {
          // 「ドン」: 紙のかけらが まわりに 少し はねる（光らせない・画面をゆらさない）
          burst(target.x, target.y, { count: 14, ringPx: radiusPx * 0.95, speed: 0.55, up: 0, gravity: 1.5, drag: 3.5, life: 0.55, colors: [C.paper, C.paperEdge, C.wood, C.shu], z: 0.15 });
        }
      }
      job.finish = function (silent) {
        if (job.done) return;
        revealPrint();
        job.done = true;
        // resolve のあとに 3D の印は残さない（play → play では setScene で消えないため）
        if (printMark) {
          var pm = printMark; printMark = null;
          if (silent) scene.remove(pm); else fadeOutAndRemove(pm, 0.3);
        }
        timers.forEach(function (t) { clearTimeout(t); });
        if (tw) tw.dead = true;
        scene.remove(hk.obj);
        if (stampJob === job) stampJob = null;
        resolveFn(true);
      };
      stampJob = job;

      var pTarget = new THREE.Vector3(), pStart = new THREE.Vector3(), pAbove = new THREE.Vector3();
      function place() {
        stageToWorld(target.x, target.y, 0.21, pTarget);
        stageToWorld(Math.min(W - 200, target.x + 900), 120, 7, pStart);
        stageToWorld(target.x, target.y, 2.6, pAbove);
      }
      place();
      var baseScale = pxToWorld(radiusPx, 0.21);
      var FACE_UP = -Math.PI / 2, FACE_DOWN = Math.PI / 2 - 0.42;   // 印面がカメラ向き → 紙向き（少しななめ）
      var hitDone = false;

      tw = tween(TOTAL, 0, function (p) {
        var t = p * TOTAL;
        var o = hk.obj, s = hk.spin;
        if (R) {
          // すくなめ: その場で ふわっと出て、ふわっと消える
          o.position.copy(pTarget); o.position.z += 0.25;
          s.rotation.set(FACE_DOWN, 0, 0);
          o.scale.setScalar(baseScale);
          var a = t < 0.35 ? t / 0.35 : (t < 1.0 ? 1 : 1 - clamp((t - 1.0) / 0.4, 0, 1));
          setOpacity(o, Ease.inOutSine(a));
        } else if (t < 0.55) {
          // 右上から 弧をえがいて 飛んでくる＋くるっと回る（印面を見せてから裏返す）
          var q = Ease.outCubic(t / 0.55);
          o.position.lerpVectors(pStart, pAbove, q);
          o.position.y += Math.sin(q * Math.PI) * 0.9;
          s.rotation.set(lerp(FACE_UP, FACE_DOWN, Ease.inOutSine(clamp((t - 0.12) / 0.43, 0, 1))), 0, lerp(-0.9, 0, q));
          o.scale.setScalar(baseScale * lerp(0.7, 1.08, q));
          setOpacity(o, clamp(t / 0.12, 0, 1));
        } else if (t < HIT) {
          // 少し もち上げて（ため）→ ストンと 下ろす
          var u = (t - 0.55) / (HIT - 0.55);
          var lift = u < 0.35 ? Ease.outCubic(u / 0.35) * 0.5 : (1 - Ease.inCubic((u - 0.35) / 0.65)) * 0.5;
          var down = u < 0.35 ? 0 : Ease.inCubic((u - 0.35) / 0.65);
          o.position.set(pTarget.x, pTarget.y, lerp(pAbove.z + lift, pTarget.z, down));
          s.rotation.set(FACE_DOWN, 0, 0);
          o.scale.setScalar(baseScale * lerp(1.08, 1, down));
          setOpacity(o, 1);
        } else if (t < 1.0) {
          // ドン（つぶれて もどる）
          if (!hitDone) { hitDone = true; revealPrint(); }
          var v = (t - HIT) / 0.2;
          var sq = Math.sin(v * Math.PI) * 0.14;
          o.position.copy(pTarget);
          s.rotation.set(FACE_DOWN, 0, 0);
          o.scale.set(baseScale * (1 + sq * 0.5), baseScale * (1 + sq * 0.5), baseScale * (1 - sq));
          setOpacity(o, 1);
        } else {
          // はなして 上へ もどり、うすく 消える
          var w = clamp((t - 1.0) / 0.65, 0, 1);
          o.position.set(pTarget.x, pTarget.y, lerp(pTarget.z, 3.2, Ease.outBack(w)));
          s.rotation.set(FACE_DOWN + Ease.outCubic(w) * 0.25, 0, 0);
          var f = Ease.inCubic(clamp((t - 1.2) / 0.5, 0, 1));
          o.scale.setScalar(baseScale * (1 - f * 0.35));
          setOpacity(o, 1 - f);
        }
        if (R && !hitDone && t >= HIT) { hitDone = true; revealPrint(); }
      }, function () { job.finish(); });

      // rAF が止まっても（別のタブなど）かならず ドン と resolve する
      timers.push(setTimeout(function () { if (!hitDone) { hitDone = true; revealPrint(); } }, HIT * 1000 + 120));
      timers.push(setTimeout(function () { job.finish(); }, TOTAL * 1000 + 300));
      return promise;
    }

    /* ---- まわす ---- */
    var raf = 0, frame = 0, alive = true;
    function loop(ms) {
      if (!alive) return;
      raf = global.requestAnimationFrame(loop);
      var t = ms / 1000;
      var dt = lastT ? clamp(t - lastT, 0, 0.05) : 0.016;
      lastT = t;
      now = t;
      frame++;
      resize();
      if (layoutDirty && current && current.layout) { current.layout(); layoutDirty = false; }
      runTweens();
      // カメラ（タイトルだけ 少し回りこむ。急な ゆれは なし）
      var orbit = current && current.camOrbit && !reduced();
      var th = orbit ? cam.theta + Math.sin(t * 0.12) * 0.035 : 0;
      cam.cur = lerp(cam.cur || 0, th, 0.05);
      var px = stageToWorld(W * 0.75, H / 2, 0).x;  // 右半分の まん中を中心に
      var rx = -px, rz = CAM_D;
      camera.position.set(px + rx * Math.cos(cam.cur) + rz * Math.sin(cam.cur), 0, -rx * Math.sin(cam.cur) + rz * Math.cos(cam.cur));
      camera.rotation.set(0, cam.cur, 0);
      if (current && current.update) current.update(dt, t);
      updatePieces(dt);
      // 問題中で 何も はじけていないときは 30fps にして 古いパソコンを らくにする
      var busy = tweens.length > 0 || pieces.length > 0 || stampJob || !current || current.name !== 'play';
      if (!busy && frame % 2) return;
      renderer.render(scene, camera);
    }

    function onLost(e) { try { e.preventDefault(); } catch (er) {} disableAll(); }
    canvas.addEventListener('webglcontextlost', onLost, false);

    disposeCurrent = function () {
      alive = false;
      if (raf) global.cancelAnimationFrame(raf);
      global.removeEventListener('resize', onResize);
      if (mq) { if (mq.removeEventListener) mq.removeEventListener('change', onMQ); else if (mq.removeListener) mq.removeListener(onMQ); }
      if (stampJob) { try { stampJob.finish(true); } catch (e) {} }
      if (current && current.leave) { try { current.leave(); } catch (e) {} }
      try { renderer.dispose(); } catch (e) {}
      disposables.forEach(function (d) { try { d.dispose(); } catch (e) {} });
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
    };

    resize();
    raf = global.requestAnimationFrame(loop);

    /* ---- 外から呼ぶ形 ---- */
    return {
      init: function () { return true; },   // 2回目は何もしない
      setScene: setScene,
      celebrate: function (x, y) {
        var p;
        if (typeof x === 'number' && typeof y === 'number' && isFinite(x) && isFinite(y)) p = screenToStage(x, y);
        else p = { x: W / 2, y: H / 2 };
        burst(p.x, p.y, { count: 64 });
        birdJump();
      },
      encourage: function () { birdTilt(); },
      stepClear: stepClear,
      setReducedMotion: function () { /* manualReduced は外で持っている */ }
    };
  }
})(typeof window !== 'undefined' ? window : this);
