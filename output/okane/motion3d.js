/*
 * motion3d.js — 「おみせで おかいもの」の 3D演出（チーム02 / 3Dモーション担当）
 *
 * つかいかた（ふつうの <script>。ES module ではない）
 *   <script src="lib/three.min.js"></script>
 *   <script src="motion3d.js"></script>
 *
 *   Motion3D.init(document.getElementById('stage3d'), { theme })
 *   Motion3D.setScene('title' | 'play' | 'result')
 *   Motion3D.celebrate(x, y)      // x, y は画面上の座標(px)。event.clientX/Y や getBoundingClientRect() の値
 *   Motion3D.encourage()
 *   Motion3D.stepClear(stepNo)    // Promise（2秒以内に resolve）
 *   Motion3D.setReducedMotion(bool)
 *
 * 見た目: 切り絵ふう（MeshToonMaterial・墨のふち・紙の色）。影は 1つのライトだけ。
 * 点滅なし・画面全体のフラッシュなし・カメラのゆれなし。
 * WebGL が使えないときは、すべて何もしない関数になる（ゲームは止まらない）。
 */
(function () {
  'use strict';

  /* ------------------------------------------------------------ 何もしない版 */
  function makeNoop(reason) {
    return {
      enabled: false,
      reason: reason || '',
      init: function () { return false; },
      setScene: function () {},
      celebrate: function () {},
      encourage: function () {},
      stepClear: function () { return Promise.resolve(); },
      setReducedMotion: function () {}
    };
  }

  var api = makeNoop('not initialized');
  window.Motion3D = api;

  /* ------------------------------------------------------------ 色（design.md 2章） */
  var DEFAULT_THEME = {
    kabe: '#E6D5B3', kabeDark: '#D6C095', kami: '#FBF5E6', sumi: '#2E2219',
    ki: '#8B5A33', kiDark: '#5E3A1E', enji: '#A3352B', ai: '#2C4A6E', yamabuki: '#E3B23C'
  };
  var CSS_VARS = {
    kabe: '--kabe', kabeDark: '--kabe-dark', kami: '--kami', sumi: '--sumi',
    ki: '--ki', kiDark: '--ki-dark', enji: '--enji', ai: '--ai', yamabuki: '--yamabuki'
  };
  // 硬貨（design.md 3章。半径は 200 の箱の中の値）
  var COINS = {
    1:   { face: '#E9ECEA', rad: 70, hole: false, num: '#2E2219' },
    50:  { face: '#C4C9CC', rad: 78, hole: true,  num: '#2E2219', holeY: 0.344 },
    5:   { face: '#D6A83E', rad: 84, hole: true,  num: '#2E2219', holeY: 0.332 },
    100: { face: '#B4BAC0', rad: 90, hole: false, num: '#2E2219' },
    10:  { face: '#9A5530', rad: 96, hole: false, num: '#FBF5E6' }
  };

  /* ------------------------------------------------------------ イージング */
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function easeOutCubic(t) { t = clamp01(t); return 1 - Math.pow(1 - t, 3); }
  function easeInOutSine(t) { t = clamp01(t); return -(Math.cos(Math.PI * t) - 1) / 2; }
  function easeOutBack(t) { t = clamp01(t); var c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
  // ばね（0→1。少し行きすぎて もどる）
  function spring(t, damp, freq) {
    if (t <= 0) return 0;
    damp = damp || 6; freq = freq || 10;
    return 1 - Math.exp(-damp * t) * Math.cos(freq * t);
  }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ------------------------------------------------------------ 本体 */
  function create(container, options) {
    var THREE = window.THREE;
    if (!THREE || !THREE.WebGLRenderer) throw new Error('three.js が読み込まれていない');

    options = options || {};
    var theme = readTheme(options.theme);

    // WebGL が使えるか先に確かめる
    var probe = document.createElement('canvas');
    var gl = null;
    try { gl = probe.getContext('webgl2') || probe.getContext('webgl') || probe.getContext('experimental-webgl'); } catch (e) { gl = null; }
    if (!gl) throw new Error('WebGL が使えない');
    try { var lose = gl.getExtension('WEBGL_lose_context'); if (lose) lose.loseContext(); } catch (e) {}

    var renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    var canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;display:block;';
    var cs = window.getComputedStyle(container);
    if (cs.position === 'static') container.style.position = 'relative';
    container.style.pointerEvents = 'none';
    container.appendChild(canvas);

    /* ---------- 座標: 舞台の px → 3D（舞台の高さ = 10.8） */
    var W = 1920, H = 1080, K = 10.8 / H;
    var FOV = 30;
    var CAM_D = 5.4 / Math.tan((FOV / 2) * Math.PI / 180); // z=0 の面で 1px = K
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(FOV, W / H, 0.5, 120);
    camera.position.set(0, 0, CAM_D);
    var camYaw = 0, camPitch = 0, camTargetYaw = 0, camTargetPitch = 0;

    function stageToWorld(sx, sy, z) {
      return new THREE.Vector3((sx - W / 2) * K, (H / 2 - sy) * K, z || 0);
    }
    // 画面(client)座標 → 舞台座標。舞台は CSS の scale で縮むので、その分をもどす
    function clientToStage(x, y) {
      var r = container.getBoundingClientRect();
      if (!r.width || !r.height) return { x: x, y: y };
      return { x: (x - r.left) * (W / r.width), y: (y - r.top) * (H / r.height) };
    }
    function elementCenterStage(el, dx, dy) {
      if (!el || !el.getBoundingClientRect) return null;
      var r = el.getBoundingClientRect();
      if (!r.width && !r.height) return null;
      var p = clientToStage(r.left + r.width / 2, r.top + r.height / 2);
      var c = container.getBoundingClientRect();
      var s = c.width ? W / c.width : 1;
      return { x: p.x + (dx || 0), y: p.y + (dy || 0), w: r.width * s, h: r.height * s };
    }

    function resize() {
      var w = container.clientWidth || 1920;
      var h = container.clientHeight || 1080;
      W = w; H = h; K = 10.8 / H;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      var r = container.getBoundingClientRect();
      var shown = r.width ? r.width / W : 1;              // 舞台の縮み
      var dpr = (window.devicePixelRatio || 1) * shown;
      renderer.setPixelRatio(Math.max(0.5, Math.min(dpr, 1.5))); // 古いパソコン向けに上限
      renderer.setSize(W, H, false);
      needRender = true;
    }

    /* ---------- 光と影（影は 1つのライトだけ） */
    scene.add(new THREE.HemisphereLight(0xfff8ec, 0xd9c7a3, 1.35));
    var sun = new THREE.DirectionalLight(0xfff3df, 1.9);
    sun.position.set(-3, 5, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -13; sun.shadow.camera.right = 13;
    sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
    sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
    sun.shadow.bias = -0.0015;
    scene.add(sun);
    // かべ（見えない。やわらかい影だけを受ける）
    var wall = new THREE.Mesh(new THREE.PlaneGeometry(60, 34), new THREE.ShadowMaterial({ color: new THREE.Color(theme.kiDark), opacity: 0.16 }));
    wall.position.z = -0.6;
    wall.receiveShadow = true;
    scene.add(wall);

    /* ---------- 切り絵ふうの材料 */
    var toonRamp = (function () {
      var data = new Uint8Array([150, 205, 255]); // 3だんの陰（やわらかく）
      var tex = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
      tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter;
      tex.generateMipmaps = false; tex.needsUpdate = true;
      return tex;
    })();
    var matCache = {};
    function toon(color, extra) {
      var key = color + (extra ? JSON.stringify(extra) : '');
      if (!extra && matCache[key]) return matCache[key];
      var p = { color: new THREE.Color(color), gradientMap: toonRamp };
      if (extra) for (var k in extra) p[k] = extra[k];
      var m = new THREE.MeshToonMaterial(p);
      if (!extra) matCache[key] = m;
      return m;
    }
    var inkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.sumi), side: THREE.BackSide });
    // 墨のふち（うら面を少し大きく出す）
    function inked(geo, mat, ink) {
      var g = new THREE.Group();
      var m = new THREE.Mesh(geo, mat);
      m.castShadow = true;
      g.add(m);
      if (ink !== 0) {
        var o = new THREE.Mesh(geo, inkMat);
        o.scale.setScalar(ink || 1.07);
        g.add(o);
      }
      g.userData.body = m;
      return g;
    }
    function canvasTex(size, draw) {
      var c = document.createElement('canvas');
      c.width = c.height = size;
      var ctx = c.getContext('2d');
      draw(ctx, size);
      var t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 2;
      t.userData = { canvas: c, draw: draw };
      return t;
    }
    var redrawOnFont = [];
    function fontFamily() { return "'Yusei Magic','Zen Maru Gothic','BIZ UDPGothic','Hiragino Maru Gothic ProN',Meiryo,sans-serif"; }

    // 手描きっぽい少しゆれる線
    function wobble(seed) { var s = seed || 1; return function () { s = (s * 16807) % 2147483647; return (s / 2147483647) - 0.5; }; }

    /* ---------- はなまる（えんじ）の絵 */
    function drawHanamaru(ctx, S, withPaper) {
      ctx.clearRect(0, 0, S, S);
      var c = S / 2;
      if (withPaper) {
        ctx.fillStyle = theme.kami;
        ctx.beginPath(); ctx.arc(c, c, S * 0.47, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = S * 0.025; ctx.strokeStyle = theme.sumi; ctx.stroke();
      }
      var rnd = wobble(7);
      ctx.strokeStyle = theme.enji;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      // うず
      ctx.lineWidth = S * 0.045;
      ctx.beginPath();
      var turns = 2.3, steps = 140;
      for (var i = 0; i <= steps; i++) {
        var t = i / steps, a = -Math.PI / 2 + t * turns * Math.PI * 2;
        var r = S * (0.03 + 0.22 * t) + rnd() * S * 0.004;
        var x = c + Math.cos(a) * r, y = c + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // 花びら（7つ）
      ctx.lineWidth = S * 0.04;
      ctx.beginPath();
      for (var j = 0; j <= 280; j++) {
        var th = j / 280 * Math.PI * 2;
        var rr = S * 0.33 + S * 0.075 * Math.abs(Math.sin(3.5 * th)) + rnd() * S * 0.003;
        var px = c + Math.cos(th - Math.PI / 2) * rr, py = c + Math.sin(th - Math.PI / 2) * rr;
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    var hanamaruTex = canvasTex(256, function (ctx, S) { drawHanamaru(ctx, S, true); });

    /* ---------- 硬貨 */
    function coinFaceTex(value) {
      var info = COINS[value];
      var t = canvasTex(256, function (ctx, S) {
        ctx.clearRect(0, 0, S, S);
        var c = S / 2;
        ctx.fillStyle = info.face;
        ctx.beginPath(); ctx.arc(c, c, S * 0.5, 0, Math.PI * 2); ctx.fill();
        // 内側の線
        ctx.strokeStyle = 'rgba(46,34,25,0.55)';
        ctx.lineWidth = S * 0.02;
        ctx.beginPath(); ctx.arc(c, c, S * 0.42, 0, Math.PI * 2); ctx.stroke();
        var numY = c;
        if (info.hole) {
          var hy = S * 0.5 - S * 0.16;   // 穴は少し上
          ctx.save();
          ctx.lineWidth = S * 0.035; ctx.strokeStyle = theme.sumi;
          ctx.beginPath(); ctx.arc(c, c, S * 0.125, 0, Math.PI * 2); ctx.stroke();
          ctx.restore();
          numY = c + S * 0.27;
          hy = hy; // 位置は形で抜いてある（下の holeShape と同じ中心）
        }
        ctx.fillStyle = info.num;
        var str = String(value);
        var fs = info.hole ? S * 0.22 : (str.length >= 3 ? S * 0.33 : S * 0.42);
        ctx.font = fs + 'px ' + fontFamily();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(str, c, numY + fs * 0.04);
      });
      redrawOnFont.push(t);
      return t;
    }
    var coinTexCache = {};
    function makeCoin(value, scale) {
      var info = COINS[value];
      var r = 0.62 * (info.rad / 96) * (scale || 1);
      var thick = r * 0.2;
      var group = new THREE.Group();
      var bodyMat = toon(shade(info.face, -0.12));
      var geo, faceGeo;
      if (info.hole) {
        var shape = new THREE.Shape(); shape.absarc(0, 0, r, 0, Math.PI * 2, false);
        var hole = new THREE.Path(); hole.absarc(0, 0, r * 0.25, 0, Math.PI * 2, true);
        shape.holes.push(hole);
        geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 32 });
        geo.translate(0, 0, -thick / 2);
        faceGeo = new THREE.RingGeometry(r * 0.25, r, 40, 1);
      } else {
        geo = new THREE.CylinderGeometry(r, r, thick, 40);
        geo.rotateX(Math.PI / 2);
        faceGeo = new THREE.CircleGeometry(r, 40);
      }
      var body = inked(geo, bodyMat, 1.06);
      group.add(body);
      var tex = coinTexCache[value] || (coinTexCache[value] = coinFaceTex(value));
      var fm = toon('#ffffff', { map: tex, transparent: true, alphaTest: 0.5 });
      var f1 = new THREE.Mesh(faceGeo, fm); f1.position.z = thick / 2 + 0.004;
      var f2 = new THREE.Mesh(faceGeo, fm); f2.position.z = -thick / 2 - 0.004; f2.rotation.y = Math.PI;
      group.add(f1, f2);
      return group;
    }

    /* ---------- だがし（切り絵の かたち） */
    function makeAme() {
      var g = new THREE.Group();
      var ball = new THREE.SphereGeometry(0.3, 20, 14); ball.scale(1.25, 1, 0.75);
      g.add(inked(ball, toon(theme.enji)));
      [-1, 1].forEach(function (s) {
        var cone = new THREE.ConeGeometry(0.2, 0.32, 12); cone.rotateZ(s * Math.PI / 2);
        var w = inked(cone, toon(theme.kami)); w.position.x = s * 0.5;
        g.add(w);
      });
      return g;
    }
    function makeDango() {
      var g = new THREE.Group();
      var stick = new THREE.CylinderGeometry(0.035, 0.035, 1.4, 8);
      var st = inked(stick, toon(theme.ki)); st.position.y = -0.1; g.add(st);
      [theme.kami, theme.yamabuki, '#B98457'].forEach(function (col, i) {
        var s = inked(new THREE.SphereGeometry(0.2, 18, 12), toon(col));
        s.position.y = 0.32 - i * 0.36; g.add(s);
      });
      g.rotation.z = -0.35;
      return g;
    }
    function makeRamune() {
      var pts = [[0, -0.55], [0.22, -0.55], [0.24, -0.45], [0.24, -0.05], [0.13, 0.12], [0.11, 0.2], [0.15, 0.27], [0.1, 0.35], [0.1, 0.5], [0, 0.5]]
        .map(function (p) { return new THREE.Vector2(p[0], p[1]); });
      var geo = new THREE.LatheGeometry(pts, 20);
      var g = new THREE.Group();
      g.add(inked(geo, toon('#5C7FA6'), 1.06));
      var cap = inked(new THREE.CylinderGeometry(0.11, 0.11, 0.1, 14), toon(theme.kami)); cap.position.y = 0.53; g.add(cap);
      var marble = inked(new THREE.SphereGeometry(0.075, 12, 8), toon(theme.kami)); marble.position.y = 0.2; marble.position.z = 0.0; g.add(marble);
      return g;
    }
    function makeSenbei() {
      var g = new THREE.Group();
      var d = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 28); d.rotateX(Math.PI / 2);
      g.add(inked(d, toon('#C98E4F')));
      var nori = new THREE.BoxGeometry(0.34, 0.8, 0.12);
      var n = new THREE.Mesh(nori, toon('#3B3A2A')); n.position.set(0.1, 0, 0); n.castShadow = true;
      g.add(n);
      return g;
    }
    function makeChoco() {
      var g = new THREE.Group();
      g.add(inked(new THREE.BoxGeometry(0.62, 0.36, 0.1), toon(theme.kiDark), 1.05));
      var wrap = inked(new THREE.BoxGeometry(0.32, 0.38, 0.12), toon(theme.ai), 1.04); wrap.position.x = 0.17; g.add(wrap);
      g.rotation.z = 0.2;
      return g;
    }

    /* ---------- はなまるの メダル（スタンプ） */
    function makeMedal(sizePx) {
      var r = (sizePx || 160) * K / 2;
      var g = new THREE.Group();
      var rim = new THREE.CylinderGeometry(r, r, r * 0.22, 40); rim.rotateX(Math.PI / 2);
      var body = inked(rim, toon(theme.enji), 1.05);
      g.add(body);
      var faceGeo = new THREE.CircleGeometry(r * 0.94, 40);
      var fm = toon('#ffffff', { map: hanamaruTex, transparent: true, alphaTest: 0.4, emissive: new THREE.Color(theme.yamabuki), emissiveIntensity: 0 });
      var f1 = new THREE.Mesh(faceGeo, fm); f1.position.z = r * 0.11 + 0.004;
      var f2 = new THREE.Mesh(faceGeo, fm); f2.position.z = -r * 0.11 - 0.004; f2.rotation.y = Math.PI;
      g.add(f1, f2);
      g.userData.faces = [f1, f2];
      g.userData.r = r;
      return g;
    }

    /* ---------- がまぐちくん（キャラクター） */
    function faceTex(kind) {
      return canvasTex(256, function (ctx, S) {
        ctx.clearRect(0, 0, S, S);
        ctx.strokeStyle = theme.sumi; ctx.fillStyle = theme.sumi;
        ctx.lineCap = 'round'; ctx.lineWidth = S * 0.045;
        var ey = S * 0.44;
        if (kind === 'happy') {
          [0.33, 0.67].forEach(function (x) {
            ctx.beginPath(); ctx.arc(S * x, ey + S * 0.03, S * 0.07, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
          });
          ctx.beginPath(); ctx.arc(S * 0.5, S * 0.6, S * 0.1, 0.1 * Math.PI, 0.9 * Math.PI); ctx.closePath();
          ctx.fillStyle = theme.sumi; ctx.fill();
        } else if (kind === 'think') {
          [0.35, 0.69].forEach(function (x) {
            ctx.beginPath(); ctx.arc(S * x, ey - S * 0.01, S * 0.04, 0, Math.PI * 2); ctx.fill();
          });
          ctx.beginPath(); ctx.arc(S * 0.53, S * 0.64, S * 0.035, 0, Math.PI * 2); ctx.stroke();
        } else {
          [0.33, 0.67].forEach(function (x) {
            ctx.beginPath(); ctx.arc(S * x, ey, S * 0.045, 0, Math.PI * 2); ctx.fill();
          });
          ctx.beginPath(); ctx.arc(S * 0.5, S * 0.57, S * 0.08, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        }
        ctx.fillStyle = 'rgba(227,178,60,0.55)';
        [0.2, 0.8].forEach(function (x) { ctx.beginPath(); ctx.ellipse(S * x, S * 0.58, S * 0.07, S * 0.045, 0, 0, Math.PI * 2); ctx.fill(); });
      });
    }
    var faces = { normal: faceTex('normal'), happy: faceTex('happy'), think: faceTex('think') };
    function makeMascot() {
      var root = new THREE.Group();     // 位置
      var tilt = new THREE.Group();     // かしげる（足もとを中心に）
      var hop = new THREE.Group();      // ジャンプ・つぶれ
      root.add(tilt); tilt.add(hop);
      var bodyGeo = new THREE.SphereGeometry(1, 28, 18); bodyGeo.scale(0.55, 0.45, 0.32);
      var body = inked(bodyGeo, toon(theme.enji), 1.06); body.position.y = 0.5; hop.add(body);
      // 口金（山吹の玉ふたつ）
      [-1, 1].forEach(function (s) {
        var b = inked(new THREE.SphereGeometry(0.08, 14, 10), toon(theme.yamabuki), 1.1);
        b.position.set(s * 0.075, 0.97, 0); hop.add(b);
      });
      // 口金の わく（からだの ふちに そって 上半分）
      var band = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.035, 8, 30, Math.PI * 0.7), toon(theme.yamabuki));
      band.rotation.z = Math.PI * 0.15; band.position.set(0, 0.5, 0); band.scale.set(1.17, 0.96, 1); band.castShadow = true;
      hop.add(band);
      // 顔
      var faceMat = new THREE.MeshBasicMaterial({ map: faces.normal, transparent: true, depthWrite: false });
      var face = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), faceMat);
      face.position.set(0, 0.44, 0.33); hop.add(face);
      // あし
      [-1, 1].forEach(function (s) {
        var f = inked(new THREE.SphereGeometry(0.1, 12, 8), toon(theme.kiDark), 1.08);
        f.scale.set(1.2, 0.6, 1); f.position.set(s * 0.2, 0.05, 0.05); hop.add(f);
      });
      root.userData = { tilt: tilt, hop: hop, faceMat: faceMat };
      return root;
    }

    /* ---------- 紙ふぶき・星（InstancedMesh。同時に 150＋40 こまで） */
    var MAX_CONF = 150, MAX_STAR = 40;
    var confGeo = new THREE.PlaneGeometry(0.16, 0.1);
    var confMat = toon('#ffffff', { side: THREE.DoubleSide });
    var confMesh = new THREE.InstancedMesh(confGeo, confMat, MAX_CONF);
    confMesh.castShadow = true; confMesh.frustumCulled = false;
    var starShape = (function () {
      var s = new THREE.Shape();
      for (var i = 0; i < 10; i++) {
        var a = Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.075 : 0.18;
        var x = Math.cos(a) * r, y = Math.sin(a) * r;
        if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
      }
      s.closePath();
      return s;
    })();
    var starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.05, bevelEnabled: false });
    starGeo.translate(0, 0, -0.025);
    starGeo.userData.shared = true; confGeo.userData.shared = true;
    var starMesh = new THREE.InstancedMesh(starGeo, toon('#ffffff'), MAX_STAR);
    starMesh.castShadow = true; starMesh.frustumCulled = false;
    var confColors = [theme.enji, theme.ai, theme.yamabuki, theme.ki, theme.kami].map(function (c) { return new THREE.Color(c); });
    var starColors = [theme.yamabuki, theme.yamabuki, theme.kami].map(function (c) { return new THREE.Color(c); });
    var confP = [], starP = [];
    var tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpV = new THREE.Vector3();
    var ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
    for (var i = 0; i < MAX_CONF; i++) { confP.push({ on: false }); confMesh.setMatrixAt(i, ZERO); confMesh.setColorAt(i, confColors[i % confColors.length]); }
    for (var j = 0; j < MAX_STAR; j++) { starP.push({ on: false }); starMesh.setMatrixAt(j, ZERO); starMesh.setColorAt(j, starColors[j % starColors.length]); }
    scene.add(confMesh, starMesh);
    function freeSlot(arr) {
      var oldest = 0, oldT = -1;
      for (var k = 0; k < arr.length; k++) { if (!arr[k].on) return k; if (arr[k].t > oldT) { oldT = arr[k].t; oldest = k; } }
      return oldest;
    }
    function burst(center, nConf, nStar, power) {
      power = power || 1;
      for (var a = 0; a < nConf; a++) {
        var k = freeSlot(confP), p = confP[k];
        var ang = Math.random() * Math.PI * 2, sp = (2.2 + Math.random() * 3) * power;
        p.on = true; p.t = 0; p.life = 1.15 + Math.random() * 0.35;
        p.pos = center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, 0.3));
        p.vel = new THREE.Vector3(Math.cos(ang) * sp, Math.sin(ang) * sp * 0.8 + 2.2 * power, 0.5 + Math.random() * 2.2);
        p.rot = new THREE.Vector3(Math.random() * 6, Math.random() * 6, Math.random() * 6);
        p.rv = new THREE.Vector3((Math.random() - 0.5) * 9, (Math.random() - 0.5) * 9, (Math.random() - 0.5) * 6); // 1秒に1回転くらいまで
        p.s = 0.8 + Math.random() * 0.6;
        confMesh.setColorAt(k, confColors[(Math.random() * confColors.length) | 0]);
      }
      for (var b = 0; b < nStar; b++) {
        var q = starP[freeSlot(starP)];
        var ang2 = (b / nStar) * Math.PI * 2 + Math.random() * 0.4;
        q.on = true; q.t = 0; q.life = 0.9 + Math.random() * 0.4;
        q.pos = center.clone(); q.pos.z += 0.4;
        q.dir = new THREE.Vector3(Math.cos(ang2), Math.sin(ang2), 0.25);
        q.dist = (0.9 + Math.random() * 0.6) * power;
        q.spin = (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2);
        q.s = 0.8 + Math.random() * 0.7;
        q.base = q.pos.clone();
      }
      if (confMesh.instanceColor) confMesh.instanceColor.needsUpdate = true;
    }
    function updateParticles(dt) {
      var any = false;
      for (var k = 0; k < MAX_CONF; k++) {
        var p = confP[k];
        if (!p.on) continue;
        any = true;
        p.t += dt;
        if (p.t >= p.life) { p.on = false; confMesh.setMatrixAt(k, ZERO); continue; }
        p.vel.y -= 7.5 * dt;
        p.vel.multiplyScalar(Math.exp(-1.6 * dt));
        p.pos.addScaledVector(p.vel, dt);
        p.rot.addScaledVector(p.rv, dt);
        var fade = 1 - clamp01((p.t - (p.life - 0.3)) / 0.3);
        var grow = easeOutCubic(p.t / 0.12);
        tmpE.set(p.rot.x, p.rot.y, p.rot.z); tmpQ.setFromEuler(tmpE);
        tmpS.setScalar(p.s * fade * grow);
        tmpM.compose(p.pos, tmpQ, tmpS);
        confMesh.setMatrixAt(k, tmpM);
      }
      for (var m = 0; m < MAX_STAR; m++) {
        var q = starP[m];
        if (!q.on) continue;
        any = true;
        q.t += dt;
        if (q.t >= q.life) { q.on = false; starMesh.setMatrixAt(m, ZERO); continue; }
        var u = q.t / q.life;
        tmpV.copy(q.base).addScaledVector(q.dir, q.dist * easeOutCubic(u * 1.3));
        var sc = q.s * easeOutBack(u * 3) * (1 - clamp01((u - 0.7) / 0.3));
        tmpE.set(0, q.t * 1.5, q.t * q.spin); tmpQ.setFromEuler(tmpE);
        tmpS.setScalar(Math.max(0, sc));
        tmpM.compose(tmpV, tmpQ, tmpS);
        starMesh.setMatrixAt(m, tmpM);
      }
      confMesh.instanceMatrix.needsUpdate = true;
      starMesh.instanceMatrix.needsUpdate = true;
      return any;
    }

    /* ---------- うごきを へらす */
    var userReduced = false;
    var mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    function bodyLow() { return !!(document.body && document.body.getAttribute('data-motion') === 'low'); }
    function reduced() { return userReduced || !!(mq && mq.matches) || bodyLow(); }
    var lastReduced = null;
    function checkReduced() {
      var r = reduced();
      if (r !== lastReduced) { lastReduced = r; onReducedChange(r); }
    }
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', checkReduced); else if (mq.addListener) mq.addListener(checkReduced); }
    if (window.MutationObserver && document.body) {
      new MutationObserver(checkReduced).observe(document.body, { attributes: true, attributeFilter: ['data-motion'] });
    }

    /* ---------- tween（時間で動かす仕事） */
    var tasks = [];
    var now = 0;
    function addTask(dur, update, done, delay) {
      var t = { start: now + (delay || 0), dur: dur, update: update, done: done, dead: false };
      tasks.push(t);
      return t;
    }
    function runTasks() {
      for (var i = tasks.length - 1; i >= 0; i--) {
        var t = tasks[i];
        if (t.dead) { tasks.splice(i, 1); continue; }
        if (now < t.start) continue;
        var u = t.dur > 0 ? (now - t.start) / t.dur : 1;
        t.update(clamp01(u), now - t.start);
        if (u >= 1) { tasks.splice(i, 1); if (t.done) t.done(); }
      }
    }
    function fadeGroup(group, from, to) {
      // グループ内の材料を、この演出だけの複製に して opacity を変える
      group.traverse(function (o) {
        if (o.material && !o.userData.fadeMat) {
          o.userData.baseOp = o.material.opacity;
          o.material = o.material.clone();
          o.material.transparent = true;
          o.userData.fadeMat = true;
        }
      });
      setGroupOpacity(group, from);
      return function (u) { setGroupOpacity(group, lerp(from, to, u)); };
    }
    function setGroupOpacity(group, a) {
      group.traverse(function (o) {
        if (o.material && o.userData.fadeMat) {
          o.material.opacity = a * (o.userData.baseOp == null ? 1 : o.userData.baseOp);
          o.material.depthWrite = a > 0.95 && !o.userData.noDepth;
          o.visible = a > 0.01;
        }
      });
    }
    function disposeGroup(g) {
      if (g.parent) g.parent.remove(g);
      g.traverse(function (o) {
        if (o.material && o.userData.fadeMat) o.material.dispose();
        if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
      });
    }

    /* ---------- 場面 */
    var current = null;
    var titleItems = [];   // { obj, target, phase, kind }
    var titleGroup = new THREE.Group(); scene.add(titleGroup);
    var resultGroup = new THREE.Group(); scene.add(resultGroup);
    var mascot = makeMascot(); scene.add(mascot);
    var mascotState = { base: new THREE.Vector3(), jumpT: -1, tiltT: -1, faceUntil: 0, size: 1 };
    var MASCOT_POS = {
      title:  { x: 620,  y: 890, size: 1.25 },
      // 問題中・ふり返りは HUD の「右上のすきま」（進みぐあいの ことばと 設定ボタンの あいだ）に 小さく
      play:   { x: 480,  y: 525, size: 0.8 },   // おみせの ひとの右・たなの上の 空き
      result: { x: 1350, y: 142, size: 0.8 }
    };
    if (options.mascot === false) mascot.visible = false;
    else if (options.mascot && typeof options.mascot === 'object') {
      ['title', 'play', 'result'].forEach(function (k) { if (options.mascot[k]) MASCOT_POS[k] = Object.assign({}, MASCOT_POS[k], options.mascot[k]); });
    }
    var mascotEnabled = options.mascot !== false;

    // タイトルの空（看板と おばあちゃんの間・上の空）
    var TITLE_SPOTS = [
      // 上の空（看板の ひもの あいだ）
      { kind: 'coin', v: 10,  x: 520,  y: 92 },
      { kind: 'ame',          x: 800,  y: 78 },
      { kind: 'coin', v: 5,   x: 1090, y: 96 },
      // 看板の右・おばあちゃんの上
      { kind: 'coin', v: 100, x: 1640, y: 230 },
      { kind: 'dango',        x: 1800, y: 345 },
      // 看板と おばあちゃんの あいだ（ふきだしの下）
      { kind: 'coin', v: 50,  x: 860,  y: 790 },
      { kind: 'ramune',       x: 1150, y: 795 },
      // 左下（石だたみの上の空）
      { kind: 'senbei',       x: 200,  y: 610 },
      { kind: 'coin', v: 1,   x: 430,  y: 690 },
      { kind: 'choco',        x: 250,  y: 790 }
    ];
    if (options.titleSpots && options.titleSpots.length) TITLE_SPOTS = options.titleSpots;

    function buildTitle() {
      titleItems.forEach(function (it) { disposeGroup(it.obj); });
      titleItems = [];
      TITLE_SPOTS.forEach(function (sp, i) {
        var obj;
        switch (sp.kind) {
          case 'coin': obj = makeCoin(sp.v || 10, 1.05); break;
          case 'ame': obj = makeAme(); break;
          case 'dango': obj = makeDango(); break;
          case 'ramune': obj = makeRamune(); break;
          case 'senbei': obj = makeSenbei(); break;
          default: obj = makeChoco();
        }
        var holder = new THREE.Group(); holder.add(obj);
        titleGroup.add(holder);
        titleItems.push({ obj: holder, inner: obj, target: stageToWorld(sp.x, sp.y, 0.4), phase: i * 1.7, delay: 0.15 + i * 0.11, born: now });
      });
    }

    function enterTitle() {
      buildTitle();
      var red = reduced();
      titleItems.forEach(function (it) {
        it.born = now + it.delay;
        if (red) {
          it.obj.position.copy(it.target);
          var f = fadeGroup(it.obj, 0, 1);
          addTask(0.6, function (u) { f(easeOutCubic(u)); }, null, it.delay * 0.5);
        } else {
          // 奥から 飛び出す
          var from = it.target.clone(); from.z = -28; from.x *= 0.4; from.y = from.y * 0.4 - 1;
          it.obj.position.copy(from);
          it.obj.scale.setScalar(0.3);
          it.obj.visible = false;
          addTask(1.4, function (u) {
            it.obj.visible = true;
            var e = spring(u * 1.4, 5.5, 9);
            it.obj.position.lerpVectors(from, it.target, Math.min(e, 1.08));
            it.obj.scale.setScalar(lerp(0.3, 1, Math.min(e, 1.15)));
            it.inner.rotation.y = (1 - easeOutCubic(u)) * Math.PI * 2.2;
          }, null, it.delay);
        }
      });
      // カメラが 少し 回り込む
      if (!red) { camYaw = 0.16; camPitch = -0.05; }
      showMascot('title', red, 1.1);
    }
    function leaveTitle(red) {
      titleItems.forEach(function (it, i) {
        var obj = it.obj;
        var f = fadeGroup(obj, 1, 0);
        var p0 = obj.position.clone();
        addTask(red ? 0.3 : 0.55, function (u) {
          f(u);
          if (!red) { obj.position.set(p0.x, p0.y + easeOutCubic(u) * 0.8, p0.z); obj.scale.setScalar(1 - 0.4 * u); }
        }, function () { disposeGroup(obj); }, red ? 0 : i * 0.03);
      });
      titleItems = [];
    }

    function showMascot(sceneName, red, delay) {
      if (!mascotEnabled) { mascot.visible = false; return; }
      var p = MASCOT_POS[sceneName] || MASCOT_POS.play;
      var size = (p.size || 1);
      var target = stageToWorld(p.x, p.y, 0.6);
      mascotState.size = size;
      var wasVisible = mascot.visible && mascot.userData.shown;
      mascot.userData.shown = true;
      mascot.scale.setScalar(size);
      if (red || !wasVisible) {
        mascotState.base.copy(target);
        mascot.position.copy(target);
        mascot.visible = true;
        if (!mascot.userData.fadeReady) { mascot.userData.fadeReady = true; }
        mascot.userData.hop.scale.set(1, red ? 1 : 0.01, 1);
        if (red) { mascot.userData.hop.scale.set(1, 1, 1); setMascotOpacity(0); addTask(0.5, function (u) { setMascotOpacity(u); }, null, delay ? 0.2 : 0); }
        else {
          setMascotOpacity(1);
          mascotState.appearUntil = now + (delay || 0) + 0.8;
          addTask(0.8, function (u) {
            var e = spring(u * 0.8 * 1.6, 5, 11);
            mascot.userData.hop.scale.set(lerp(0.6, 1, Math.min(e, 1.2)), Math.max(0.01, e), 1);
          }, null, delay || 0);
        }
      } else {
        var from = mascot.position.clone();
        addTask(0.7, function (u) {
          var e = easeInOutSine(u);
          mascotState.base.lerpVectors(from, target, e);
        });
      }
    }
    function setMascotOpacity(a) {
      mascot.traverse(function (o) {
        if (o.material) {
          if (!o.userData.ownMat) { o.material = o.material.clone(); o.userData.ownMat = true; }
          o.material.transparent = a < 1 || !!o.material.map;
          o.material.opacity = a;
        }
      });
      // 顔の material を作りなおしたので さしなおす
      mascot.traverse(function (o) { if (o.material && o.material.map && faces && (o.material.map === faces.normal || o.material.map === faces.happy || o.material.map === faces.think)) mascot.userData.faceMat = o.material; });
      mascot.visible = a > 0.01;
    }
    function setFace(kind, until) {
      var fm = mascot.userData.faceMat;
      if (!fm) return;
      fm.map = faces[kind] || faces.normal;
      fm.needsUpdate = true;
      mascotState.faceUntil = until || 0;
    }

    var resultStamps = [];
    function enterResult() {
      resultStamps.forEach(disposeGroup); resultStamps = [];
      var red = reduced();
      showMascot('result', red, 0.2);
      // DOM の .result-item__stamp が出そろうのを 少し まつ（最大 1秒）
      var tries = 0;
      (function waitDom() {
        var els = Array.prototype.slice.call(document.querySelectorAll('.result-item__stamp'));
        var spots = els.map(function (el) { return elementCenterStage(el); }).filter(Boolean);
        if (spots.length < 3 && tries++ < 10 && current === 'result') { setTimeout(waitDom, 100); return; }
        if (current !== 'result') return;
        if (spots.length === 0) spots = [{ x: 720, y: 540, w: 110 }, { x: 720, y: 690, w: 110 }, { x: 720, y: 840, w: 110 }];
        spots = spots.slice(0, 3);
        spots.forEach(function (sp, i) { placeResultStamp(sp, i, red); });
        needRender = true;
      })();
    }
    function placeResultStamp(sp, i, red) {
      var medal = makeMedal(Math.max(80, sp.w || 110) * 1.02);
      var halo = new THREE.Mesh(new THREE.CircleGeometry(medal.userData.r * 1.45, 40),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.yamabuki), transparent: true, opacity: 0, depthWrite: false }));
      halo.position.z = -0.15; halo.userData.noDepth = true;
      var holder = new THREE.Group(); holder.add(halo); holder.add(medal);
      var target = stageToWorld(sp.x, sp.y, 0.3);
      holder.position.copy(target);
      resultGroup.add(holder);
      resultStamps.push(holder);
      var appear = 0.25 + i * 0.35;
      if (red) {
        var f = fadeGroup(medal, 0, 1);
        addTask(0.5, function (u) { f(u); }, null, appear);
      } else {
        var from = target.clone(); from.z = -18; from.y -= 1.5;
        holder.position.copy(from); holder.visible = false;
        addTask(1.1, function (u) {
          holder.visible = true;
          var e = spring(u * 1.1, 6, 10);
          holder.position.lerpVectors(from, target, Math.min(e, 1.06));
          medal.rotation.y = (1 - easeOutCubic(u)) * Math.PI * 2;
        }, null, appear);
      }
      // 1つずつ ふわっと 光る（1回だけ。くりかえさない）
      var lightAt = (red ? 0.9 : 1.5) + i * 0.9;
      addTask(0.9, function (u) {
        var e = easeInOutSine(u);
        halo.material.opacity = 0.5 * e;
        halo.scale.setScalar(red ? 1 : lerp(0.7, 1, easeOutBack(u)));
        medal.userData.faces.forEach(function (f) { f.material.emissiveIntensity = 0.14 * e; });
        if (!red) medal.scale.setScalar(1 + 0.12 * Math.sin(Math.PI * u));
      }, null, lightAt);
      holder.userData.medal = medal;
    }
    function leaveResult(red) {
      resultStamps.forEach(function (h) {
        var f = fadeGroup(h, 1, 0);
        addTask(red ? 0.25 : 0.4, f, function () { disposeGroup(h); });
      });
      resultStamps = [];
    }

    function setScene(name) {
      if (name !== 'title' && name !== 'play' && name !== 'result') return;
      var red = reduced();
      var prev = current;
      if (prev === name && name !== 'title') return;
      if (prev === 'title' || (prev === name && name === 'title')) leaveTitle(red);
      if (prev === 'result') leaveResult(red);
      current = name;
      camTargetYaw = 0; camTargetPitch = 0;
      if (name === 'title') enterTitle();
      else if (name === 'play') showMascot('play', red, 0.1);
      else enterResult();
      needRender = true;
    }

    /* ---------- 正解 */
    function celebrate(x, y) {
      var sp;
      if (typeof x === 'number' && typeof y === 'number' && isFinite(x) && isFinite(y)) sp = clientToStage(x, y);
      else sp = { x: W * 0.62, y: H * 0.55 };
      var c = stageToWorld(sp.x, sp.y, 0.3);
      var red = reduced();
      if (red) softStars(c);
      else {
        burst(c, 36, 9, 1);
        mascotJump();
      }
      setFace('happy', now + 1.6);
      needRender = true;
    }
    // うごきを へらす ときの正解: その場で ふわっと 出て ふわっと 消える星
    function softStars(c) {
      var g = new THREE.Group();
      var mat = toon(theme.yamabuki, { transparent: true, opacity: 0 });
      var mat2 = toon(theme.enji, { transparent: true, opacity: 0 });
      for (var i = 0; i < 8; i++) {
        var a = i / 8 * Math.PI * 2 + 0.3;
        var m = new THREE.Mesh(starGeo, i % 2 ? mat2 : mat);
        var rr = 1.05 + (i % 2) * 0.25;
        m.position.set(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr * 0.8, c.z + 0.2);
        m.rotation.z = a;
        m.scale.setScalar(i % 2 ? 0.8 : 1.1);
        g.add(m);
      }
      scene.add(g);
      addTask(1.4, function (u) {
        var o = u < 0.25 ? u / 0.25 : u > 0.7 ? 1 - (u - 0.7) / 0.3 : 1;
        mat.opacity = mat2.opacity = easeInOutSine(o);
      }, function () { scene.remove(g); mat.dispose(); mat2.dispose(); });
    }
    function mascotJump() {
      if (!mascotEnabled || !mascot.visible) return;
      mascotState.jumpT = 0;
      mascotState.tiltT = -1;
    }

    /* ---------- まちがい（責めない。首をかしげるだけ） */
    function encourage() {
      setFace('think', now + 2.0);
      if (!reduced() && mascotEnabled && mascot.visible) { mascotState.tiltT = 0; mascotState.jumpT = -1; }
      needRender = true;
    }

    /* ---------- ステップクリア（はなまるの スタンプが ドン） */
    var stepCleared = {};
    function stepClear(stepNo) {
      stepCleared[stepNo] = true;
      return new Promise(function (resolve) {
        var finished = false;
        function finish() { if (finished) return; finished = true; resolve(); }
        // rAF が止まっても（タブが うらにある 等）かならず おわる
        var guard = setTimeout(finish, 1950);
        try {
          var red = reduced();
          var hari = document.querySelector('.harigami');
          var spot = elementCenterStage(hari);
          var sx, sy;
          if (spot) { sx = spot.x + spot.w / 2 - 320; sy = spot.y; }   // .stamp-hanamaru と同じ所（右はしから 220px＋半分）
          else { sx = 1700; sy = 275; }
          var target = stageToWorld(sx, sy, 0.35);
          var medal = makeMedal(190);
          scene.add(medal);
          needRender = true;
          var total = red ? 1.5 : 1.85;
          if (red) {
            medal.position.copy(target);
            var f = fadeGroup(medal, 0, 1);
            addTask(total, function (u) {
              var o = u < 0.25 ? u / 0.25 : u > 0.78 ? 1 - (u - 0.78) / 0.22 : 1;
              f(easeInOutSine(o));
            }, function () { disposeGroup(medal); clearTimeout(guard); finish(); });
          } else {
            var from = target.clone(); from.z = 7; from.y += 1.2; from.x -= 0.6;
            medal.position.copy(from);
            medal.scale.setScalar(0.6);
            var pressed = false;
            var f2 = null;
            addTask(total, function (u, el) {
              if (el < 0.65) {
                // くるっと回りながら 手前から 近づく
                var a = easeOutCubic(el / 0.65);
                medal.position.set(lerp(from.x, target.x, a), lerp(from.y, target.y + 0.15, a), lerp(from.z, target.z + 1.2, a));
                medal.rotation.y = (1 - a) * Math.PI * 2;
                medal.rotation.z = (1 - a) * -0.4;
                medal.scale.setScalar(lerp(0.6, 1.25, a));
              } else if (el < 0.8) {
                // ドン（かべに おされる）
                var b = (el - 0.65) / 0.15;
                var e = b * b;
                medal.rotation.y = 0; medal.rotation.z = 0;
                medal.position.set(target.x, lerp(target.y + 0.15, target.y, e), lerp(target.z + 1.2, target.z, e));
                medal.scale.setScalar(lerp(1.25, 1, e));
              } else {
                if (!pressed) {
                  pressed = true;
                  burst(new THREE.Vector3(target.x, target.y, target.z + 0.2), 18, 6, 0.65);
                  mascotJump();
                  setFace('happy', now + 1.4);
                }
                // ばねで おちつく（ぺたん）
                var s = (el - 0.8);
                var sq = Math.exp(-7 * s) * Math.sin(16 * s) * 0.14;
                medal.scale.set(1 + sq, 1 + sq, Math.max(0.4, 1 - sq * 3));
                medal.position.set(target.x, target.y, target.z);
                // さいごの 0.3秒で ふわっと 消える
                if (el > total - 0.3) {
                  if (!f2) f2 = fadeGroup(medal, 1, 0);
                  f2((el - (total - 0.3)) / 0.3);
                }
              }
            }, function () { disposeGroup(medal); clearTimeout(guard); finish(); });
          }
        } catch (e) {
          clearTimeout(guard); finish();
        }
      });
    }

    function onReducedChange(red) {
      if (red) {
        // 動いているものを その場で 止める
        camYaw = camTargetYaw = 0; camPitch = camTargetPitch = 0;
        mascotState.jumpT = -1; mascotState.tiltT = -1;
        mascot.userData.hop.scale.set(1, 1, 1); mascot.userData.hop.position.y = 0; mascot.userData.tilt.rotation.z = 0;
        titleItems.forEach(function (it) { it.inner.rotation.set(0, 0, 0); it.obj.position.copy(it.target); it.obj.scale.setScalar(1); it.obj.visible = true; });
        tasks.forEach(function (t) { if (t.start > now) t.start = now; });
        for (var k = 0; k < MAX_CONF; k++) { confP[k].on = false; confMesh.setMatrixAt(k, ZERO); }
        for (var m = 0; m < MAX_STAR; m++) { starP[m].on = false; starMesh.setMatrixAt(m, ZERO); }
        confMesh.instanceMatrix.needsUpdate = true; starMesh.instanceMatrix.needsUpdate = true;
      }
      needRender = true;
    }

    /* ---------- まいフレーム */
    var needRender = true;
    var lastT = performance.now();
    var lastDraw = 0;
    var alive = true;
    var rafId = 0;
    function frame(ts) {
      if (!alive) return;
      rafId = requestAnimationFrame(frame);
      var dt = Math.min(0.1, Math.max(0, (ts - lastT) / 1000));
      lastT = ts;
      now += dt;
      try {
        var red = reduced();
        if (red !== lastReduced) { lastReduced = red; onReducedChange(red); }
        runTasks();
        var busy = tasks.length > 0;
        if (updateParticles(dt)) busy = true;

        // タイトル: ゆっくり 回りながら 浮かぶ
        if (current === 'title' && !red) {
          titleItems.forEach(function (it) {
            var age = now - it.born;
            if (age < 1.4) return;
            var k = Math.min(1, (age - 1.4) / 1.5);
            var t = now + it.phase;
            it.obj.position.set(it.target.x + Math.sin(t * 0.37) * 0.06 * k, it.target.y + Math.sin(t * 0.62) * 0.14 * k, it.target.z);
            it.inner.rotation.y = Math.sin(t * 0.45) * 0.65 * k;
            it.inner.rotation.x = Math.sin(t * 0.31) * 0.12 * k;
          });
          camTargetYaw = Math.sin(now * 0.14) * 0.05;
          camTargetPitch = Math.sin(now * 0.09) * 0.015;
          busy = true;
        }

        // カメラ（なめらかに。ゆれない）
        if (!red) {
          var ky = 1 - Math.exp(-dt * 0.9);
          camYaw += (camTargetYaw - camYaw) * ky;
          camPitch += (camTargetPitch - camPitch) * ky;
          if (Math.abs(camTargetYaw - camYaw) > 0.0005) busy = true;
        }
        camera.position.set(Math.sin(camYaw) * Math.cos(camPitch) * CAM_D, Math.sin(camPitch) * CAM_D, Math.cos(camYaw) * Math.cos(camPitch) * CAM_D);
        camera.lookAt(0, 0, 0);

        // キャラクター
        if (mascot.visible && mascotEnabled) {
          var hop = mascot.userData.hop, tilt = mascot.userData.tilt;
          mascot.position.copy(mascotState.base);
          if (mascotState.faceUntil && now > mascotState.faceUntil) { setFace('normal', 0); }
          if (!red) {
            if (mascotState.jumpT >= 0) {
              mascotState.jumpT += dt;
              var jt = mascotState.jumpT;
              if (jt < 0.12) { var a = jt / 0.12; hop.scale.set(1 + 0.12 * a, 1 - 0.16 * a, 1); hop.position.y = 0; }
              else if (jt < 0.62) {
                var b = (jt - 0.12) / 0.5;
                hop.position.y = 4 * b * (1 - b) * 0.55;
                var st = 1 - Math.abs(b - 0.5) * 2;
                hop.scale.set(1 - 0.06 * st, 1 + 0.1 * st, 1);
                hop.rotation.y = Math.sin(b * Math.PI) * 0.3;
              } else if (jt < 1.3) {
                var c2 = jt - 0.62;
                var sq = Math.exp(-8 * c2) * Math.cos(14 * c2) * 0.15;
                hop.position.y = 0; hop.rotation.y = 0;
                hop.scale.set(1 + sq, 1 - sq, 1);
              } else { mascotState.jumpT = -1; hop.scale.set(1, 1, 1); hop.position.y = 0; }
              busy = true;
            } else if (mascotState.tiltT >= 0) {
              mascotState.tiltT += dt;
              var tt = mascotState.tiltT;
              var amt = tt < 1.1 ? spring(tt, 4.5, 7) : Math.max(0, 1 - easeInOutSine((tt - 1.1) / 0.7));
              tilt.rotation.z = 0.26 * amt;
              if (tt > 1.8) { mascotState.tiltT = -1; tilt.rotation.z = 0; }
              busy = true;
            } else if (mascotState.appearUntil && now < mascotState.appearUntil) {
              busy = true; // 出てくる とちゅう（task が うごかす）
            } else {
              // しずかに いきをする（小さく・ゆっくり）
              var br = Math.sin(now * (Math.PI * 2 / 4)) * (current === 'play' ? 0.012 : 0.022);
              hop.scale.set(1 - br * 0.5, 1 + br, 1);
              hop.position.y = 0;
            }
          }
        }

        // 問題中に なにも 起きていないときは 30fps で十分
        var interval = busy || needRender ? 0 : (red ? 0.25 : 1 / 30);
        if (needRender || now - lastDraw >= interval) {
          renderer.render(scene, camera);
          lastDraw = now;
          needRender = false;
        }
      } catch (err) {
        fail(err);
      }
    }

    function fail(err) {
      alive = false;
      try { cancelAnimationFrame(rafId); } catch (e) {}
      try { if (canvas.parentNode) canvas.parentNode.removeChild(canvas); } catch (e) {}
      if (window.console && console.warn) console.warn('[Motion3D] 3D演出を とめました:', err && err.message ? err.message : err);
      var noop = makeNoop('stopped');
      for (var k in noop) api[k] = noop[k];
    }
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); fail(new Error('WebGL context lost')); }, false);

    // フォントが そろったら 数字を かきなおす
    if (document.fonts && document.fonts.ready) {
      var fontWait = document.fonts.load ? Promise.all([
        document.fonts.load("40px 'Yusei Magic'", '0123456789'),
        document.fonts.ready
      ]) : document.fonts.ready;
      fontWait.then(function () {
        redrawOnFont.forEach(function (t) {
          var c = t.userData.canvas;
          t.userData.draw(c.getContext('2d'), c.width);
          t.needsUpdate = true;
        });
        needRender = true;
      }).catch(function () {});
    }

    resize();
    window.addEventListener('resize', resize);
    if (window.ResizeObserver) { try { new ResizeObserver(resize).observe(container); } catch (e) {} }
    // --stage-scale が変わっても 大きさの見え方を合わせる
    setTimeout(resize, 300);
    mascot.visible = false;
    lastReduced = reduced();
    rafId = requestAnimationFrame(frame);

    return {
      setScene: setScene,
      celebrate: celebrate,
      encourage: encourage,
      stepClear: stepClear,
      setReducedMotion: function (v) { userReduced = !!v; checkReduced(); },
      fail: fail
    };

    function readTheme(t) {
      var out = {};
      var root = document.documentElement ? window.getComputedStyle(document.documentElement) : null;
      for (var k in DEFAULT_THEME) {
        var v = '';
        if (root) v = (root.getPropertyValue(CSS_VARS[k]) || '').trim();
        out[k] = /^#[0-9a-f]{3,8}$/i.test(v) ? v : DEFAULT_THEME[k];
      }
      if (t && typeof t === 'object') {
        for (var key in t) {
          var nk = key.replace(/-([a-z])/g, function (_, c) { return c.toUpperCase(); });
          if (nk in out && typeof t[key] === 'string') out[nk] = t[key];
        }
      }
      return out;
    }
  }

  function shade(hex, amt) {
    var c = parseInt(hex.slice(1), 16);
    var r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    function f(v) { return Math.max(0, Math.min(255, Math.round(v + v * amt))); }
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  /* ------------------------------------------------------------ 公開 API */
  var impl = null;
  var pendingReduced = null;
  api.init = function (container, opts) {
    if (impl) return true;
    try {
      if (!container) throw new Error('container がない');
      impl = create(container, opts);
      api.enabled = true;
      api.reason = '';
      if (pendingReduced !== null) impl.setReducedMotion(pendingReduced);
      return true;
    } catch (err) {
      impl = null;
      if (window.console && console.warn) console.warn('[Motion3D] 3D演出なしで つづけます:', err && err.message ? err.message : err);
      var noop = makeNoop(String(err && err.message || err));
      for (var k in noop) api[k] = noop[k];
      return false;
    }
  };
  function safe(fn) {
    return function () {
      if (!impl) return fn === 'stepClear' ? Promise.resolve() : undefined;
      try { return impl[fn].apply(null, arguments); }
      catch (err) { try { impl.fail(err); } catch (e) {} return fn === 'stepClear' ? Promise.resolve() : undefined; }
    };
  }
  api.setScene = safe('setScene');
  api.celebrate = safe('celebrate');
  api.encourage = safe('encourage');
  api.stepClear = safe('stepClear');
  api.setReducedMotion = function (v) {
    pendingReduced = !!v;
    if (impl) { try { impl.setReducedMotion(!!v); } catch (e) {} }
  };
})();
