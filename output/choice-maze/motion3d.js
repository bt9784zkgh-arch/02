/* =========================================================
   motion3d.js  -  せんたくの めいきゅう（choice-maze）の3D演出
   担当: motion-3d（チーム02）
   使うもの: lib/three.min.js（Three.js 0.158.0、<script> で先に読みこむ）

   決まった使い方（game.js から呼ぶ）
     Motion3D.init(containerElement, { theme })
     Motion3D.setScene('title' | 'play' | 'result')
     Motion3D.celebrate(x, y)     // x, y は画面上の座標(px)。getBoundingClientRect() の値をそのまま渡す
     Motion3D.encourage()         // まちがえたときのやさしい演出（光の玉がふわっと首をかしげる）
     Motion3D.stepClear(stepNo)   // Promise。はんこを押しおわったら resolve（2秒以内）
     Motion3D.setReducedMotion(bool)

   - WebGL が使えないときは、すべて「何もしない関数」になる（stepClear はすぐ resolve）
   - 座標の基準は .cm-stage の 1920x1080。--stage-scale で縮んでいても、
     コンテナの getBoundingClientRect() から換算する
   - 点滅なし・画面全体のフラッシュなし・カメラの揺れなし
   - 物体は同時に300個まで。影はつけない（足もとの影は丸い影の絵で表す）
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 何もしない版（WebGLが使えないとき） ---------- */
  var NOOP = {
    init: function () { return false; },
    setScene: function () {},
    celebrate: function () {},
    encourage: function () {},
    stepClear: function () { return Promise.resolve(); },
    setReducedMotion: function () {},
    isActive: function () { return false; }
  };

  if (typeof window === 'undefined') return;
  if (typeof window.THREE === 'undefined') {
    console.warn('[Motion3D] three.min.js が読みこまれていないので、3D演出はおやすみします');
    window.Motion3D = NOOP;
    return;
  }
  var THREE = window.THREE;

  /* ---------- 定数 ---------- */
  var STAGE_W = 1920, STAGE_H = 1080;
  var UNIT = 100;                        // 1ワールド単位 = 舞台の100px（z=0 の面で）
  var FOV = 30;
  var CAM_D = (STAGE_H / UNIT / 2) / Math.tan(THREE.MathUtils.degToRad(FOV / 2)); // ≒ 20.15
  var MAX_OBJECTS = 300;

  /* ---------- 状態 ---------- */
  var S = {
    ok: false,
    container: null,
    renderer: null, scene: null, camera: null,
    colors: null,
    gradient: null,
    tex: {},
    clock: null,
    sceneName: null,
    groups: { bg: null, title: null, result: null },
    fx: [],                 // 演出中のもの { update(t, dt) -> true で終了 }
    floaters: [],           // ゆっくり浮かぶもの（タイトル）
    bgPoints: null,
    reducedUser: false, reducedOS: false, reducedAttr: false,
    objCount: 0,
    rafId: 0, running: false,
    camOrbit: 0,
    dirty: true,
    pxRatio: 1
  };

  function reduced() { return S.reducedUser || S.reducedOS || S.reducedAttr; }

  /* ---------- イージング ---------- */
  var E = {
    outCubic: function (k) { return 1 - Math.pow(1 - k, 3); },
    inCubic: function (k) { return k * k * k; },
    inOut: function (k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; },
    outBack: function (k) { var c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); },
    // ばね: 少し行きすぎて、やわらかく止まる
    spring: function (k) { return 1 - Math.exp(-6 * k) * Math.cos(k * 9); },
    outBounce: function (k) {
      var n1 = 7.5625, d1 = 2.75;
      if (k < 1 / d1) return n1 * k * k;
      if (k < 2 / d1) return n1 * (k -= 1.5 / d1) * k + 0.75;
      if (k < 2.5 / d1) return n1 * (k -= 2.25 / d1) * k + 0.9375;
      return n1 * (k -= 2.625 / d1) * k + 0.984375;
    }
  };
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------- 座標 ---------- */
  // 舞台(px) → ワールド。z が奥（マイナス）ほど広く見えるので、その分ひろげる
  function stageToWorld(px, py, z) {
    var f = (CAM_D - (z || 0)) / CAM_D;
    return new THREE.Vector3((px - STAGE_W / 2) / UNIT * f, (STAGE_H / 2 - py) / UNIT * f, z || 0);
  }
  // 画面(client px) → 舞台(px)
  function clientToStage(x, y) {
    if (!S.container) return { x: STAGE_W / 2, y: STAGE_H / 2 };
    var r = S.container.getBoundingClientRect();
    if (!r.width || !r.height) return { x: STAGE_W / 2, y: STAGE_H / 2 };
    return { x: (x - r.left) / r.width * STAGE_W, y: (y - r.top) / r.height * STAGE_H };
  }
  // DOM要素の中心（舞台px）。見えていなければ null
  function elementCenterStage(sel) {
    try {
      var els = document.querySelectorAll(sel);
      for (var i = 0; i < els.length; i++) {
        var r = els[i].getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return clientToStage(r.left + r.width / 2, r.top + r.height / 2);
      }
    } catch (e) {}
    return null;
  }

  /* ---------- 物体の数を数える ---------- */
  function canAdd(n) { return S.objCount + n <= MAX_OBJECTS; }
  function countTree(o) { var n = 0; o.traverse(function (c) { if (c.isMesh || c.isPoints || c.isSprite) n++; }); return n; }
  function addObj(parent, o) { S.objCount += countTree(o); parent.add(o); S.dirty = true; return o; }
  function removeObj(o) {
    if (!o) return;
    S.objCount -= countTree(o);
    if (S.objCount < 0) S.objCount = 0;
    if (o.parent) o.parent.remove(o);
    o.traverse(function (c) {
      if (c.geometry && !c.geometry.userData.shared) c.geometry.dispose();
      if (c.material) {
        var ms = Array.isArray(c.material) ? c.material : [c.material];
        ms.forEach(function (m) { if (!m.userData.shared) m.dispose(); });
      }
    });
    S.dirty = true;
  }

  /* ---------- 透明度をまとめて変える ---------- */
  function prepFade(o) {
    o.traverse(function (c) {
      if (!c.material) return;
      var ms = Array.isArray(c.material) ? c.material : [c.material];
      ms.forEach(function (m) {
        m.transparent = true;
        if (m.userData.baseOpacity === undefined) m.userData.baseOpacity = m.opacity;
      });
    });
  }
  function captureOpacity(o) {
    o.traverse(function (c) {
      if (!c.material) return;
      var ms = Array.isArray(c.material) ? c.material : [c.material];
      ms.forEach(function (m) { m.transparent = true; m.userData.baseOpacity = m.visible ? m.opacity : 0; });
    });
  }
  function setOpacity(o, a) {
    o.traverse(function (c) {
      if (!c.material) return;
      var ms = Array.isArray(c.material) ? c.material : [c.material];
      ms.forEach(function (m) {
        var b = m.userData.baseOpacity === undefined ? 1 : m.userData.baseOpacity;
        m.opacity = b * a;
        m.visible = m.opacity > 0.003;
      });
    });
  }

  /* ---------- 色・材質 ---------- */
  function col(name) { return new THREE.Color(S.colors[name]); }
  function makeGradient() {
    // 3段のトゥーン（紙・布っぽいやわらかい段）
    var data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
    var t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
    t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter;
    t.generateMipmaps = false; t.needsUpdate = true;
    return t;
  }
  function toon(color, extra) {
    var p = { color: color, gradientMap: S.gradient };
    if (extra) for (var k in extra) p[k] = extra[k];
    return new THREE.MeshToonMaterial(p);
  }

  /* ---------- 手描きのテクスチャ（canvas） ---------- */
  function canvasTex(w, h, draw) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var g = c.getContext('2d'); draw(g, w, h);
    var t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 2;
    return t;
  }
  // 少しかすれさせる（紙・はんこ感）
  function speckle(g, w, h, n, color, alpha) {
    g.save(); g.globalAlpha = alpha; g.fillStyle = color;
    for (var i = 0; i < n; i++) { var r = Math.random() * 1.6 + 0.4; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2); g.fill(); }
    g.restore();
  }
  function wobblyCircle(g, cx, cy, r, lw, color) {
    g.save(); g.strokeStyle = color; g.lineWidth = lw; g.lineCap = 'round';
    g.beginPath();
    for (var i = 0; i <= 72; i++) {
      var a = i / 72 * Math.PI * 2, rr = r + Math.sin(a * 3 + 1.3) * r * 0.008 + Math.sin(a * 7) * r * 0.005;
      var x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.stroke(); g.restore();
  }
  function drawLamp2D(g, cx, cy, s, gold, ink, flame) {
    // アラジンのランプ（横向き）
    g.save(); g.translate(cx, cy); g.scale(s, s);
    g.lineJoin = 'round'; g.lineCap = 'round';
    g.fillStyle = gold; g.strokeStyle = ink; g.lineWidth = 5;
    g.beginPath();
    g.moveTo(-60, 0); g.quadraticCurveTo(-55, 30, 0, 32); g.quadraticCurveTo(45, 30, 55, 5);
    g.quadraticCurveTo(80, -2, 100, -22); g.quadraticCurveTo(80, -10, 55, -8);
    g.quadraticCurveTo(30, -18, 0, -18); g.quadraticCurveTo(-45, -18, -60, 0); g.closePath();
    g.fill(); g.stroke();
    g.beginPath(); g.ellipse(0, -22, 22, 7, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.arc(0, -34, 8, 0, Math.PI * 2); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(-60, 0); g.bezierCurveTo(-100, -10, -100, 30, -55, 22); g.stroke();
    g.beginPath(); g.ellipse(-5, 42, 34, 8, 0, 0, Math.PI * 2); g.fill(); g.stroke();
    if (flame) {
      g.fillStyle = flame; g.beginPath();
      g.moveTo(100, -22); g.quadraticCurveTo(92, -40, 104, -62); g.quadraticCurveTo(118, -40, 108, -24); g.closePath();
      g.fill(); g.stroke();
    }
    g.restore();
  }
  function buildTextures() {
    var C = S.colors;
    // 光の粒（やわらかい丸）
    S.tex.dot = canvasTex(64, 64, function (g, w) {
      var gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.35, 'rgba(236,196,110,0.85)');
      gr.addColorStop(1, 'rgba(210,160,58,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    // 丸い影（足もと）
    S.tex.shadow = canvasTex(128, 128, function (g, w) {
      var gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(20,14,10,0.55)'); gr.addColorStop(1, 'rgba(20,14,10,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    // 光の輪（後光）
    S.tex.halo = canvasTex(128, 128, function (g, w) {
      var gr = g.createRadialGradient(w / 2, w / 2, w * 0.18, w / 2, w / 2, w / 2);
      gr.addColorStop(0, 'rgba(242,214,140,0.55)'); gr.addColorStop(1, 'rgba(210,160,58,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
    });
    // じゅうたん片（ひし形模様＋上下に房）
    S.tex.rug = [C.red, C.navy].map(function (base, idx) {
      return canvasTex(256, 200, function (g, w, h) {
        var fr = 22; // 房の長さ
        // 房
        g.strokeStyle = C.paper; g.lineWidth = 3; g.lineCap = 'round';
        for (var x = 14; x < w - 8; x += 11) {
          g.beginPath(); g.moveTo(x, fr + 2); g.lineTo(x + rand(-2, 2), 3); g.stroke();
          g.beginPath(); g.moveTo(x, h - fr - 2); g.lineTo(x + rand(-2, 2), h - 3); g.stroke();
        }
        // 地
        var y0 = fr, y1 = h - fr;
        g.fillStyle = base; g.fillRect(4, y0, w - 8, y1 - y0);
        // 縁どり
        g.strokeStyle = C.gold; g.lineWidth = 6; g.strokeRect(14, y0 + 10, w - 28, y1 - y0 - 20);
        g.setLineDash([6, 6]); g.lineWidth = 2; g.strokeStyle = C.paper;
        g.strokeRect(24, y0 + 20, w - 48, y1 - y0 - 40); g.setLineDash([]);
        // まんなかのひし形
        var cx = w / 2, cy = h / 2;
        g.fillStyle = idx === 0 ? C.navy : C.red;
        g.beginPath(); g.moveTo(cx, cy - 46); g.lineTo(cx + 74, cy); g.lineTo(cx, cy + 46); g.lineTo(cx - 74, cy); g.closePath(); g.fill();
        g.strokeStyle = C.gold; g.lineWidth = 4; g.stroke();
        g.fillStyle = C.gold;
        g.beginPath(); g.moveTo(cx, cy - 20); g.lineTo(cx + 30, cy); g.lineTo(cx, cy + 20); g.lineTo(cx - 30, cy); g.closePath(); g.fill();
        // すみの小ひし形
        g.fillStyle = C.paper;
        [[50, cy], [w - 50, cy]].forEach(function (p) {
          g.beginPath(); g.moveTo(p[0], p[1] - 14); g.lineTo(p[0] + 12, p[1]); g.lineTo(p[0], p[1] + 14); g.lineTo(p[0] - 12, p[1]); g.closePath(); g.fill();
        });
        speckle(g, w, h, 260, C.ink, 0.12);
      });
    });
    // はんこの面（ステップ1・2・3・ゴール）
    S.tex.stamp = {};
    ['1', '2', '3', 'goal'].forEach(function (key) {
      S.tex.stamp[key] = canvasTex(512, 512, function (g, w) {
        var c = w / 2;
        g.fillStyle = C.paper; g.fillRect(0, 0, w, w);
        wobblyCircle(g, c, c, 228, 22, C.red);
        wobblyCircle(g, c, c, 194, 8, C.red);
        var ink = C.red;
        if (key === 'goal') {
          // X字の金の道
          g.strokeStyle = C.gold; g.lineWidth = 34; g.lineCap = 'round';
          g.beginPath(); g.moveTo(c - 120, c + 130); g.lineTo(c + 120, c - 40); g.stroke();
          g.beginPath(); g.moveTo(c + 120, c + 130); g.lineTo(c - 120, c - 40); g.stroke();
          drawLamp2D(g, c - 95, c - 85, 0.62, C.gold, ink, C.paper);
          drawLamp2D(g, c + 20, c - 110, 0.62, C.gold, ink, C.paper);
          drawLamp2D(g, c - 30, c + 150, 0.62, C.gold, ink, C.paper);
        } else {
          drawLamp2D(g, c - 10, c + 60, 1.25, C.gold, ink, C.paper);
          g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 12; g.lineJoin = 'round'; g.lineCap = 'round';
          if (key === '1') {        // 家の屋根
            g.beginPath(); g.moveTo(c - 110, c - 40); g.lineTo(c, c - 135); g.lineTo(c + 110, c - 40); g.stroke();
            g.fillRect(c + 52, c - 120, 22, 44);
          } else if (key === '2') { // 2人の丸顔
            [-62, 62].forEach(function (dx) {
              g.beginPath(); g.arc(c + dx, c - 92, 42, 0, Math.PI * 2); g.lineWidth = 10; g.stroke();
              g.beginPath(); g.arc(c + dx - 14, c - 98, 5, 0, Math.PI * 2); g.fill();
              g.beginPath(); g.arc(c + dx + 14, c - 98, 5, 0, Math.PI * 2); g.fill();
              g.beginPath(); g.arc(c + dx, c - 86, 16, 0.2 * Math.PI, 0.8 * Math.PI); g.lineWidth = 6; g.stroke();
            });
          } else {                  // ハート
            g.beginPath();
            g.moveTo(c, c - 38);
            g.bezierCurveTo(c - 10, c - 70, c - 70, c - 86, c - 70, c - 120);
            g.bezierCurveTo(c - 70, c - 150, c - 22, c - 160, c, c - 128);
            g.bezierCurveTo(c + 22, c - 160, c + 70, c - 150, c + 70, c - 120);
            g.bezierCurveTo(c + 70, c - 86, c + 10, c - 70, c, c - 38);
            g.fill();
          }
        }
        // かすれ（8%ほど点を抜く）
        g.save(); g.globalCompositeOperation = 'source-atop';
        speckle(g, w, w, 1500, C.paper, 0.9);
        g.restore();
      });
    });
    // ひかりさん（光の玉・顔つき）
    S.tex.hikari = canvasTex(256, 256, function (g, w) {
      var c = w / 2;
      var gr = g.createRadialGradient(c, c, 40, c, c, c);
      gr.addColorStop(0, 'rgba(242,214,140,0.6)'); gr.addColorStop(1, 'rgba(210,160,58,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, w);
      g.fillStyle = C.gold; g.beginPath(); g.arc(c, c, 70, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,240,205,0.55)'; g.beginPath(); g.arc(c - 22, c - 26, 26, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#6B4A12'; g.lineWidth = 6; g.lineCap = 'round';
      g.beginPath(); g.arc(c, c, 70, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#4A3410';
      g.beginPath(); g.arc(c - 24, c - 4, 7, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(c + 24, c - 4, 7, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(c, c + 14, 18, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();   // ほほえみ
      g.fillStyle = 'rgba(140,43,34,0.35)';
      g.beginPath(); g.arc(c - 44, c + 14, 10, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(c + 44, c + 14, 10, 0, Math.PI * 2); g.fill();
    });
  }

  /* ---------- かたち ---------- */
  var GEO = {};
  function shared(g) { g.userData.shared = true; return g; }
  function buildGeometries() {
    // ランプの胴（ろくろ）
    var pts = [];
    var prof = [[0, -0.32], [0.30, -0.30], [0.34, -0.24], [0.16, -0.16], [0.40, -0.05], [0.46, 0.06], [0.36, 0.18], [0.16, 0.24], [0.14, 0.30], [0.05, 0.40], [0, 0.42]];
    prof.forEach(function (p) { pts.push(new THREE.Vector2(p[0], p[1])); });
    GEO.lampBody = shared(new THREE.LatheGeometry(pts, 16));
    var spoutCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.30, 0.04, 0), new THREE.Vector3(0.58, 0.10, 0), new THREE.Vector3(0.78, 0.24, 0)
    ]);
    GEO.lampSpout = shared(new THREE.TubeGeometry(spoutCurve, 10, 0.07, 8, false));
    GEO.lampHandle = shared(new THREE.TorusGeometry(0.2, 0.045, 6, 14, Math.PI * 1.3));
    GEO.flame = shared(new THREE.ConeGeometry(0.07, 0.22, 8));
    GEO.rug = shared(new THREE.PlaneGeometry(1.28, 1.0));
    GEO.confetti = shared(new THREE.PlaneGeometry(0.16, 0.1));
    GEO.diamond = shared(new THREE.OctahedronGeometry(0.09, 0));
    GEO.stamp = shared(new THREE.CylinderGeometry(1, 1, 0.22, 48));
    GEO.post = shared(new THREE.CylinderGeometry(0.07, 0.09, 2.6, 10));
    GEO.bar = shared(new THREE.BoxGeometry(2.2, 0.3, 0.22));
    GEO.knot = shared(new THREE.SphereGeometry(0.17, 14, 10));
    GEO.plane = shared(new THREE.PlaneGeometry(1, 1));
  }
  var MAT = {};
  function sharedMat(m) { m.userData.shared = true; return m; }
  function buildMaterials() {
    MAT.gold = sharedMat(toon(col('gold')));
    MAT.paper = sharedMat(toon(col('paper')));
    MAT.red = sharedMat(toon(col('red')));
    MAT.navy = sharedMat(toon(col('navy')));
    MAT.flame = sharedMat(new THREE.MeshBasicMaterial({ color: new THREE.Color('#F6D98C') }));
  }

  function makeLamp(lit) {
    var g = new THREE.Group();
    var m = toon(col('gold'));
    g.add(new THREE.Mesh(GEO.lampBody, m));
    var sp = new THREE.Mesh(GEO.lampSpout, m); g.add(sp);
    var h = new THREE.Mesh(GEO.lampHandle, m); h.position.set(-0.42, 0.04, 0); h.rotation.z = Math.PI * 0.35; g.add(h);
    if (lit) {
      var f = new THREE.Mesh(GEO.flame, new THREE.MeshBasicMaterial({ color: new THREE.Color('#F6D98C') }));
      f.position.set(0.8, 0.38, 0); g.add(f); g.userData.flame = f;
    }
    return g;
  }
  function makeRug(i) {
    var m = toon(0xffffff, { map: S.tex.rug[i % 2], side: THREE.DoubleSide, alphaTest: 0.0 });
    m.transparent = true;
    return new THREE.Mesh(GEO.rug, m);
  }
  function makeSignpost() {
    var g = new THREE.Group();
    var m = toon(col('gold'));
    var post = new THREE.Mesh(GEO.post, toon(col('paper'))); post.position.y = -1.0; g.add(post);
    var b1 = new THREE.Mesh(GEO.bar, m); b1.rotation.z = Math.PI / 4; b1.position.y = 0.45; g.add(b1);
    var b2 = new THREE.Mesh(GEO.bar, m); b2.rotation.z = -Math.PI / 4; b2.position.y = 0.45; b2.position.z = 0.02; g.add(b2);
    var k = new THREE.Mesh(GEO.knot, toon(col('red'))); k.position.set(0, 0.45, 0.1); g.add(k);
    return g;
  }
  function makeStamp(key) {
    var faceMat = toon(0xffffff, { map: S.tex.stamp[key] || S.tex.stamp['1'] });
    var sideMat = toon(col('red'));
    // CylinderGeometry のグループ: 0=側面, 1=上, 2=下
    var mesh = new THREE.Mesh(GEO.stamp, [sideMat, faceMat, sideMat]);
    mesh.rotation.set(Math.PI / 2, -Math.PI / 2, 0);   // 上の面をカメラに向け、絵の上下をそろえる
    var g = new THREE.Group(); g.add(mesh); g.userData.face = faceMat; g.userData.side = sideMat;
    return g;
  }
  function makeSprite(tex, size, opacity) {
    var m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: opacity === undefined ? 1 : opacity });
    var s = new THREE.Sprite(m); s.scale.set(size, size, 1);
    return s;
  }

  /* ---------- 背景の光の粒 ---------- */
  function makeDust(count, spread) {
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(count * 3), seed = new Float32Array(count);
    for (var i = 0; i < count; i++) {
      pos[i * 3] = rand(-spread.x, spread.x);
      pos[i * 3 + 1] = rand(-spread.y, spread.y);
      pos[i * 3 + 2] = rand(spread.z0, spread.z1);
      seed[i] = Math.random() * 100;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({ size: 0.42, map: S.tex.dot, transparent: true, depthWrite: false, opacity: 0.0, sizeAttenuation: true });
    var p = new THREE.Points(geo, mat);
    p.userData = { seed: seed, spread: spread, speed: 0.12, targetOpacity: 0.7, base: pos.slice(0) };
    p.frustumCulled = false;
    return p;
  }
  function updateDust(p, t, dt) {
    var u = p.userData, pos = p.geometry.attributes.position.array, n = u.seed.length;
    var m = p.material;
    m.opacity += (u.targetOpacity - m.opacity) * Math.min(1, dt * 1.5);
    if (reduced() || u.speed <= 0) return;
    for (var i = 0; i < n; i++) {
      var s = u.seed[i];
      pos[i * 3 + 1] += u.speed * dt * (0.5 + (s % 1));
      pos[i * 3] = u.base[i * 3] + Math.sin(t * 0.25 + s) * 0.25;
      if (pos[i * 3 + 1] > u.spread.y) pos[i * 3 + 1] = -u.spread.y;
    }
    p.geometry.attributes.position.needsUpdate = true;
  }

  /* ---------- 場面 ---------- */
  function clearGroup(name, fadeSec) {
    var g = S.groups[name];
    if (!g) return;
    S.groups[name] = null;
    if (name === 'title') S.floaters = [];
    if (!fadeSec || reduced()) { removeObj(g); return; }
    captureOpacity(g);
    var t0 = -1;
    S.fx.push({ update: function (t) {
      if (t0 < 0) t0 = t;
      var k = clamp01((t - t0) / fadeSec);
      setOpacity(g, 1 - k);
      if (k >= 1) { removeObj(g); return true; }
    } });
  }

  function setBgDust(count, speed, opacity) {
    if (S.bgPoints) {
      var old = S.bgPoints; S.bgPoints = null;
      old.userData.targetOpacity = 0;
      var t0 = -1;
      S.fx.push({ update: function (t, dt) {
        if (t0 < 0) t0 = t;
        updateDust(old, t, dt);
        if (t - t0 > 1.2) { removeObj(old); return true; }
      } });
    }
    if (!count || !canAdd(1)) return;
    var p = makeDust(count, { x: 13, y: 7, z0: -14, z1: 1 });
    p.userData.speed = speed; p.userData.targetOpacity = opacity;
    S.bgPoints = addObj(S.scene, p);
  }

  function buildTitle() {
    var g = new THREE.Group();
    S.groups.title = g; addObj(S.scene, g);
    // 置き場所（舞台px）: 人物（x920-1010, y335-590）・左上の布・下の中央のボタンをよける
    var items = [
      { kind: 'sign', px: 1560, py: 520, z: -3, s: 1.25, delay: 0.1 },
      { kind: 'lamp', px: 1290, py: 330, z: -2, s: 1.4, delay: 0.35 },
      { kind: 'lamp', px: 560, py: 780, z: -1, s: 1.2, delay: 0.6 },
      { kind: 'rug', px: 1760, py: 250, z: -4, s: 1.0, delay: 0.45 },
      { kind: 'rug', px: 250, py: 860, z: -2, s: 1.0, delay: 0.7 },
      { kind: 'rug', px: 1700, py: 860, z: -1.5, s: 0.9, delay: 0.85 },
      { kind: 'rug', px: 820, py: 220, z: -6, s: 0.9, delay: 1.0 },
      { kind: 'rug', px: 1380, py: 700, z: -5, s: 0.75, delay: 1.15 }
    ];
    var rugIdx = 0;
    items.forEach(function (it) {
      var o;
      if (it.kind === 'sign') o = makeSignpost();
      else if (it.kind === 'lamp') o = makeLamp(true);
      else o = makeRug(rugIdx++);
      if (!canAdd(countTree(o))) return;
      var holder = new THREE.Group(); holder.add(o);
      var target = stageToWorld(it.px, it.py, it.z);
      var seed = Math.random() * 10;
      prepFade(holder);
      addObj(g, holder);
      var f = {
        obj: o, holder: holder, target: target, seed: seed, kind: it.kind, s: it.s,
        start: null, delay: it.delay, baseRotY: it.kind === 'rug' ? rand(-0.5, 0.5) : (it.kind === 'lamp' ? rand(-0.6, 0.6) : 0),
        tilt: rand(-0.35, 0.35)
      };
      if (it.kind === 'rug') { o.rotation.x = -0.35; o.rotation.z = f.tilt; }
      S.floaters.push(f);
    });
    // 金の光の粒
    if (canAdd(1)) {
      var p = makeDust(110, { x: 13, y: 7, z0: -16, z1: 2 });
      p.userData.speed = 0.22; p.userData.targetOpacity = 0.8;
      addObj(g, p); g.userData.dust = p;
    }
  }
  function updateTitle(t, dt) {
    var g = S.groups.title; if (!g) return;
    if (g.userData.dust) updateDust(g.userData.dust, t, dt);
    var red = reduced();
    S.floaters.forEach(function (f) {
      if (f.start === null) f.start = t + f.delay;
      var k = clamp01((t - f.start) / (red ? 0.9 : 1.8));
      if (red) {
        // ふわっと出すだけ
        f.holder.position.copy(f.target);
        f.holder.scale.setScalar(f.s);
        f.obj.rotation.y = f.baseRotY;
        setOpacity(f.holder, E.outCubic(k));
        return;
      }
      // 奥から飛び出す → 着いたらゆっくり浮かんで回る
      var e = E.outBack(k);
      var from = new THREE.Vector3(f.target.x * 0.4, f.target.y * 0.4, -38);
      f.holder.position.set(lerp(from.x, f.target.x, e), lerp(from.y, f.target.y, e), lerp(from.z, f.target.z, E.outCubic(k)));
      f.holder.scale.setScalar(f.s * lerp(0.3, 1, E.spring(k)));
      setOpacity(f.holder, clamp01(k * 3));
      var life = Math.max(0, t - f.start);
      f.holder.position.y += Math.sin(life * 0.9 + f.seed) * 0.12 * k;
      if (f.kind === 'sign') f.obj.rotation.y = Math.sin(life * 0.35 + f.seed) * 1.1; // ゆっくり左右に回る道しるべ（X字が見えやすいように）
      else if (f.kind === 'lamp') { f.obj.rotation.y = f.baseRotY + Math.sin(life * 0.4 + f.seed) * 0.5; f.obj.rotation.z = Math.sin(life * 0.7 + f.seed) * 0.06; }
      else { f.obj.rotation.y = f.baseRotY + life * 0.18; f.obj.rotation.z = f.tilt + Math.sin(life * 0.6 + f.seed) * 0.12; }
      // 炎は形をゆらすだけ（明るさは変えない＝点滅しない）
      var fl = f.obj.userData && f.obj.userData.flame;
      if (fl) fl.scale.set(1, 1 + Math.sin(life * 3 + f.seed) * 0.12, 1);
    });
  }

  // ふり返り: 3つのはんこが並び、1つずつ灯る
  function buildResult(keys) {
    var g = new THREE.Group();
    S.groups.result = g; addObj(S.scene, g);
    keys = keys || ['1', '2', '3'];
    var red = reduced();
    var xs = [1430, 1600, 1770], py = 250;
    keys.forEach(function (key, i) {
      var st = makeStamp(key);
      var halo = makeSprite(S.tex.halo, 2.4, 0);
      var holder = new THREE.Group(); holder.add(halo); holder.add(st);
      if (!canAdd(countTree(holder))) return;
      var tp = stageToWorld(xs[i], py, 0);
      holder.position.copy(tp);
      holder.scale.setScalar(0.6);
      prepFade(holder); setOpacity(holder, 0);
      addObj(g, holder);
      var start = -1, appear = 0.25 + i * 0.25, glowAt = 1.3 + i * 0.8, seed = Math.random() * 10;
      var faceMat = st.userData.face, sideMat = st.userData.side;
      S.fx.push({ update: function (t) {
        if (!S.groups.result || S.groups.result !== g) return true;
        if (start < 0) start = t;
        var lt = t - start;
        var ka = clamp01((lt - appear) / (red ? 0.8 : 0.9));
        setOpacity(st, E.outCubic(ka));
        if (red) {
          st.rotation.set(0, 0, 0);
        } else {
          st.position.y = lerp(1.2, 0, E.outBounce(ka));
          st.rotation.y = lerp(Math.PI * 1.5, 0, E.outCubic(ka));
          if (ka >= 1) st.position.y = Math.sin((lt - appear) * 0.9 + seed) * 0.05;
        }
        // 灯る（0.6秒かけてやわらかく明るくなり、そのまま灯りつづける。点滅しない）
        var kg = clamp01((lt - glowAt) / 0.6);
        var eg = E.inOut(kg);
        halo.material.visible = eg > 0; halo.material.opacity = 0.9 * eg;
        halo.scale.setScalar(2.4 + (red ? 0 : E.spring(kg) * 0.25));
        faceMat.emissive.set(S.colors.gold); faceMat.emissiveIntensity = 0.28 * eg;
        sideMat.emissive.set(S.colors.gold); sideMat.emissiveIntensity = 0.18 * eg;
        if (!red && kg > 0 && kg < 1) st.scale.setScalar(1 + Math.sin(kg * Math.PI) * 0.08);
        // 灯った瞬間に小さな粒を少しだけ
        if (!red && kg > 0 && !holder.userData.sparked) { holder.userData.sparked = true; sparkle(holder.position.clone(), 10, 0.9, g); }
        return false;   // ふり返りのあいだ、ずっと続く（場面が変わったら上で終了）
      } });
    });
    var dust = canAdd(1) ? makeDust(40, { x: 13, y: 7, z0: -14, z1: 0 }) : null;
    if (dust) { dust.userData.speed = 0.12; dust.userData.targetOpacity = 0.6; addObj(g, dust); g.userData.dust = dust; }
  }

  function setScene(name) {
    if (!S.ok) return;
    if (name === S.sceneName) return;
    S.sceneName = name;
    clearGroup('title', 0.6);
    clearGroup('result', 0.5);
    if (name === 'title') {
      setBgDust(0);
      buildTitle();
    } else if (name === 'play') {
      // 問題を解いているあいだは、少なく・ゆっくり・うすく
      setBgDust(26, 0.05, 0.35);
    } else if (name === 'result') {
      setBgDust(0);
      buildResult(['1', '2', '3']);
    } else {
      setBgDust(0);
    }
    wake();
  }

  /* ---------- 小さな粒（はんこのドン、灯ったとき） ---------- */
  function sparkle(center, n, radius, parent) {
    if (!canAdd(1)) return;
    var geo = new THREE.BufferGeometry();
    var pos = new Float32Array(n * 3), vel = [];
    for (var i = 0; i < n; i++) {
      var a = i / n * Math.PI * 2 + rand(-0.2, 0.2);
      pos[i * 3] = center.x; pos[i * 3 + 1] = center.y; pos[i * 3 + 2] = center.z + 0.3;
      vel.push(new THREE.Vector3(Math.cos(a), Math.sin(a), rand(-0.2, 0.4)).multiplyScalar(radius * rand(0.8, 1.2)));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({ size: 0.7, map: S.tex.dot, transparent: true, depthWrite: false, opacity: 0.95 });
    var p = new THREE.Points(geo, mat); p.frustumCulled = false;
    addObj(parent || S.scene, p);
    var t0 = -1, dur = 0.9;
    S.fx.push({ update: function (t) {
      if (t0 < 0) t0 = t;
      var k = clamp01((t - t0) / dur), e = E.outCubic(k);
      for (var i = 0; i < n; i++) {
        pos[i * 3] = center.x + vel[i].x * e;
        pos[i * 3 + 1] = center.y + vel[i].y * e;
        pos[i * 3 + 2] = center.z + 0.3 + vel[i].z * e;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 0.95 * (1 - E.inCubic(k));
      if (k >= 1) { removeObj(p); return true; }
    } });
  }

  /* ---------- 正解: 金の紙ふぶき・小さなランプがはじける（約1.2秒） ---------- */
  function celebrate(x, y) {
    if (!S.ok) return;
    var sp = (typeof x === 'number' && typeof y === 'number') ? clientToStage(x, y) : { x: STAGE_W / 2, y: STAGE_H / 2 };
    var center = stageToWorld(sp.x, sp.y, 0.5);
    var red = reduced();
    var g = new THREE.Group(); g.position.copy(center);
    var parts = [];
    var palette = [MAT.gold, MAT.gold, MAT.paper, MAT.red];
    var nConf = red ? 12 : 34, nLamp = 3;
    if (!canAdd(nConf + nLamp * 4 + 2)) { nConf = Math.max(0, Math.min(nConf, MAX_OBJECTS - S.objCount - 2)); nLamp = 0; }
    if (nConf <= 0 && nLamp === 0) return;
    // まわりの光の輪
    var halo = makeSprite(S.tex.halo, 1.0, 0); g.add(halo);
    for (var i = 0; i < nConf; i++) {
      var useDiamond = i % 3 === 0;
      var m = palette[i % palette.length].clone(); m.userData = {}; m.side = THREE.DoubleSide;
      var mesh = new THREE.Mesh(useDiamond ? GEO.diamond : GEO.confetti, m);
      var a = rand(0, Math.PI * 2), sp3 = rand(1.6, 3.0);
      parts.push({
        o: mesh, v: new THREE.Vector3(Math.cos(a) * sp3, Math.sin(a) * sp3 + 1.2, rand(-0.5, 1.5)),
        r: new THREE.Vector3(rand(-8, 8), rand(-8, 8), rand(-8, 8)), home: new THREE.Vector3(Math.cos(a) * rand(0.4, 1.2), Math.sin(a) * rand(0.4, 1.0), 0)
      });
      g.add(mesh);
    }
    for (var j = 0; j < nLamp; j++) {
      var lamp = makeLamp(true); lamp.scale.setScalar(0.42);
      var la = Math.PI * (0.25 + j * 0.25);
      parts.push({ o: lamp, lamp: true, v: new THREE.Vector3(Math.cos(la) * 2.2, Math.sin(la) * 2.4 + 0.6, 0.6),
        r: new THREE.Vector3(0, rand(-3, 3), rand(-1, 1)), home: new THREE.Vector3(Math.cos(la) * 0.9, Math.sin(la) * 0.9, 0) });
      g.add(lamp);
    }
    prepFade(g);
    addObj(S.scene, g);
    var t0 = -1, dur = red ? 1.2 : 1.3;
    S.fx.push({ update: function (t, dt) {
      if (t0 < 0) t0 = t;
      var lt = t - t0, k = clamp01(lt / dur);
      halo.material.opacity = 0.8 * Math.sin(Math.min(1, k * 1.4) * Math.PI);  // 1回だけ、ふくらんで消える
      halo.scale.setScalar(1.0 + E.outCubic(k) * 1.6);
      parts.forEach(function (p) {
        if (red) {
          // その場でふわっと出て消える（飛ばない・回らない）
          p.o.position.copy(p.home);
          p.o.rotation.set(0, 0, p.lamp ? 0 : p.home.x);
        } else {
          p.o.position.x += p.v.x * dt; p.o.position.y += p.v.y * dt; p.o.position.z += p.v.z * dt;
          p.v.multiplyScalar(Math.pow(0.12, dt));   // 空気でゆっくりになる
          p.v.y -= 2.2 * dt;                         // ひらひら落ちる
          p.o.rotation.x += p.r.x * dt; p.o.rotation.y += p.r.y * dt; p.o.rotation.z += p.r.z * dt;
          if (p.lamp) p.o.scale.setScalar(0.42 * (0.6 + 0.4 * E.spring(clamp01(lt / 0.5))));
        }
      });
      var fade = red ? Math.sin(k * Math.PI) : (k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35);
      parts.forEach(function (p) { setOpacity(p.o, clamp01(fade)); });
      if (k >= 1) { removeObj(g); return true; }
    } });
    wake();
  }

  /* ---------- まちがい: 光の玉（ひかりさん）がふわっと首をかしげる（約1.8秒） ---------- */
  function encourage() {
    if (!S.ok) return;
    if (!canAdd(2)) return;
    // ヒントの布の左上あたり。見つからなければ下の左よりに
    var sp = null;
    try {
      var hint = document.querySelector('.cm-hint');
      if (hint) {
        var r = hint.getBoundingClientRect();
        if (r.width > 0) { var a = clientToStage(r.left, r.top); sp = { x: a.x + 40, y: a.y - 30 }; }
      }
    } catch (e) {}
    if (!sp) sp = { x: 420, y: 740 };
    sp.x = Math.max(120, Math.min(STAGE_W - 120, sp.x));
    sp.y = Math.max(220, Math.min(860, sp.y));
    var pos = stageToWorld(sp.x, sp.y, 1);
    var red = reduced();
    var g = new THREE.Group(); g.position.copy(pos);
    var orb = makeSprite(S.tex.hikari, 1.5, 0);
    g.add(orb);
    addObj(S.scene, g);
    var t0 = -1, dur = 1.8;
    S.fx.push({ update: function (t) {
      if (t0 < 0) t0 = t;
      var lt = t - t0, k = clamp01(lt / dur);
      var fade = lt < 0.35 ? lt / 0.35 : (k > 0.8 ? (1 - k) / 0.2 : 1);
      orb.material.opacity = clamp01(fade);
      if (!red) {
        // 首をかしげる: ゆっくり右へ傾いて、もどる
        var tilt = Math.sin(clamp01((lt - 0.2) / 1.2) * Math.PI) * 0.3;
        orb.material.rotation = -tilt;
        g.position.x = pos.x + tilt * 0.25;
        g.position.y = pos.y + Math.sin(lt * 2.2) * 0.06;
      }
      if (k >= 1) { removeObj(g); return true; }
    } });
    wake();
  }

  /* ---------- ステップクリア: はんこがくるっと回ってドンと押される（1.8秒で resolve） ---------- */
  var stepBusy = null;
  function stepClear(stepNo) {
    if (!S.ok) return Promise.resolve();
    var key = (stepNo === 'goal' || stepNo >= 4) ? 'goal' : String(Math.max(1, Math.min(3, stepNo | 0 || 1)));
    var red = reduced();
    var total = red ? 1.2 : 1.8;
    return new Promise(function (resolve) {
      var done = false;
      function finish() { if (done) return; done = true; resolve(); }
      // .cm-clear__stamp（400px）が出る位置。まだ無ければ中央より上
      var spc = elementCenterStage('.cm-clear__stamp') || { x: 960, y: 390 };
      var target = stageToWorld(spc.x, spc.y, 0);
      var g = new THREE.Group(); g.position.copy(target);
      var st = makeStamp(key);
      var shadow = new THREE.Mesh(GEO.plane, new THREE.MeshBasicMaterial({ map: S.tex.shadow, transparent: true, depthWrite: false, opacity: 0 }));
      shadow.scale.set(4.6, 4.6, 1); shadow.position.z = -0.3;
      g.add(shadow); g.add(st);
      if (!canAdd(countTree(g))) { finish(); return; }
      prepFade(st); setOpacity(st, 0);
      addObj(S.scene, g);
      var R = 2.0;          // 半径2 = 直径400px
      var t0 = -1, sparked = false;
      S.fx.push({ update: function (t) {
        if (t0 < 0) t0 = t;
        var lt = t - t0;
        if (red) {
          var ka = clamp01(lt / 0.4), kf = clamp01((lt - 0.85) / 0.35);
          st.scale.set(R, R, R); st.position.set(0, 0, 0); st.rotation.set(0, 0, 0);
          setOpacity(st, E.outCubic(ka) * (1 - kf));
          shadow.material.opacity = 0.5 * E.outCubic(ka) * (1 - kf);
        } else {
          // 0〜0.75秒: 上の手前からくるっと回りながら近づく
          var k1 = clamp01(lt / 0.75), e1 = E.inOut(k1);
          // 0.75〜0.95秒: ドン（押しこんで、ばねで戻る）
          var k2 = clamp01((lt - 0.75) / 0.45);
          // 1.45〜1.8秒: ふわっと消える（下の絵に入れかわる）
          var kf2 = clamp01((lt - 1.45) / 0.35);
          st.position.set(lerp(1.5, 0, e1), lerp(2.4, 0, e1), lerp(6, 0.8, e1) - (k1 >= 1 ? 0.8 * E.outCubic(clamp01(k2 * 4)) : 0));
          st.rotation.set(lerp(-1.2, 0, e1), lerp(Math.PI * 2, 0, e1), lerp(0.5, 0, e1));
          var squash = k1 >= 1 ? (1 - E.spring(k2)) : 0;     // 押した瞬間につぶれて戻る
          st.scale.set(R * (1 + squash * 0.08), R * (1 + squash * 0.08), R * (1 - squash * 0.25));
          setOpacity(st, clamp01(lt / 0.25) * (1 - kf2));
          shadow.material.opacity = lerp(0.05, 0.55, e1) * (1 - kf2);
          shadow.scale.setScalar(lerp(6.5, 4.6, e1));
          if (k1 >= 1 && !sparked) { sparked = true; sparkle(target.clone(), 16, 2.6); }
        }
        if (lt >= total) { removeObj(g); finish(); return true; }
      } });
      // タブが隠れていても必ず2秒以内に終わる
      setTimeout(function () { finish(); }, total * 1000 + 100);
      wake();
    });
  }

  function setReducedMotion(v) { S.reducedUser = !!v; S.dirty = true; wake(); }

  /* ---------- 描画ループ ---------- */
  function resize() {
    if (!S.ok) return;
    var r = S.container.getBoundingClientRect();
    var w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    // 古いパソコン向け: 描く画素は 1920x1080 ×1.25 まで
    var ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    if (w * ratio > STAGE_W * 1.25) ratio = STAGE_W * 1.25 / w;
    S.renderer.setPixelRatio(ratio);
    S.renderer.setSize(w, h, false);
    S.camera.aspect = w / h;
    S.camera.updateProjectionMatrix();
    S.dirty = true; wake();
  }

  function isIdle() {
    if (S.fx.length) return false;
    if (S.groups.title && !reduced()) return false;
    if (S.groups.title && reduced()) {
      // ふわっと出しおわるまでは動かす
      var t = S.clock.getElapsedTime();
      for (var i = 0; i < S.floaters.length; i++) { var f = S.floaters[i]; if (f.start === null || t - f.start < 1.0) return false; }
    }
    if (S.bgPoints && !reduced() && S.bgPoints.userData.speed > 0) return false;
    if (S.bgPoints && Math.abs(S.bgPoints.material.opacity - S.bgPoints.userData.targetOpacity) > 0.01) return false;
    if (S.groups.result && S.groups.result.userData.dust && !reduced()) return false;
    return true;
  }

  function frame() {
    S.rafId = 0;
    if (!S.ok) return;
    var dt = Math.min(S.clock.getDelta(), 1 / 20);   // 止まっていても大きく飛ばない
    var t = S.clock.elapsedTime;

    // カメラ: タイトルでは少し回りこむ。ほかの場面では正面に戻る（座標がずれないように）
    var wantOrbit = (S.sceneName === 'title' && !reduced()) ? 1 : 0;
    S.camOrbit += (wantOrbit - S.camOrbit) * Math.min(1, dt * 1.2);
    var ang = Math.sin(t * 0.12) * 0.07 * S.camOrbit;
    S.camera.position.set(Math.sin(ang) * CAM_D, Math.sin(t * 0.09) * 0.4 * S.camOrbit, Math.cos(ang) * CAM_D);
    S.camera.lookAt(0, 0, 0);

    updateTitle(t, dt);
    if (S.bgPoints) updateDust(S.bgPoints, t, dt);
    if (S.groups.result && S.groups.result.userData.dust) updateDust(S.groups.result.userData.dust, t, dt);
    for (var i = S.fx.length - 1; i >= 0; i--) {
      var done = false;
      try { done = S.fx[i].update(t, dt); } catch (e) { done = true; }
      if (done) S.fx.splice(i, 1);
    }
    S.renderer.render(S.scene, S.camera);
    S.dirty = false;

    if (!isIdle() || Math.abs(S.camOrbit - wantOrbit) > 0.001) S.rafId = requestAnimationFrame(frame);
    else S.running = false;
  }
  function wake() {
    if (!S.ok || S.rafId) return;
    if (document.hidden) return;
    S.running = true;
    S.clock.getDelta();          // 止まっていた時間を飛ばす
    S.rafId = requestAnimationFrame(frame);
  }

  /* ---------- 初期化 ---------- */
  function webglAvailable() {
    try {
      var c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  function init(container, opts) {
    if (S.ok) return true;
    if (!container) { console.warn('[Motion3D] container がありません'); return false; }
    if (!webglAvailable()) { console.warn('[Motion3D] WebGL が使えないので、3D演出はおやすみします'); switchToNoop(); return false; }
    try {
      var theme = (opts && opts.theme) || {};
      var c = theme.colors || {};
      S.colors = {
        navy: c.navy || '#1E2747', red: c.red || '#8C2B22', gold: c.gold || '#D2A03A',
        paper: c.paper || '#F2E6CB', ink: c.ink || '#2A211C'
      };
      S.container = container;
      var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power', premultipliedAlpha: true });
      renderer.setClearColor(0x000000, 0);
      renderer.shadowMap.enabled = false;    // 影は丸い影の絵で表す
      var cv = renderer.domElement;
      cv.setAttribute('aria-hidden', 'true');
      cv.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none;display:block;';
      cv.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); S.ok = false; cv.style.display = 'none'; });
      var cs = window.getComputedStyle(container);
      if (cs.position === 'static') container.style.position = 'relative';
      container.style.pointerEvents = 'none';
      container.appendChild(cv);

      S.renderer = renderer;
      S.scene = new THREE.Scene();
      S.camera = new THREE.PerspectiveCamera(FOV, STAGE_W / STAGE_H, 0.5, 120);
      S.camera.position.set(0, 0, CAM_D);
      S.clock = new THREE.Clock();
      S.gradient = makeGradient();

      // 光: やわらかい環境光＋左上からの光1つ（影なし）
      S.scene.add(new THREE.HemisphereLight(0xfff4dc, 0x3a3046, 1.6));
      var key = new THREE.DirectionalLight(0xfff1d6, 2.2);
      key.position.set(-6, 8, 10);
      S.scene.add(key);

      buildTextures();
      buildGeometries();
      buildMaterials();

      // OS の「視差効果を減らす」
      try {
        var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        S.reducedOS = mq.matches;
        var onMq = function () { S.reducedOS = mq.matches; S.dirty = true; wake(); };
        if (mq.addEventListener) mq.addEventListener('change', onMq); else if (mq.addListener) mq.addListener(onMq);
      } catch (e) {}
      // <html data-motion="low"> も見る（game.js と同じ設定）
      var readAttr = function () { S.reducedAttr = document.documentElement.getAttribute('data-motion') === 'low'; wake(); };
      readAttr();
      try { new MutationObserver(readAttr).observe(document.documentElement, { attributes: true, attributeFilter: ['data-motion'] }); } catch (e) {}

      S.ok = true;
      window.addEventListener('resize', resize);
      try { new ResizeObserver(resize).observe(container); } catch (e) {}
      // --stage-scale の変化（transform）は ResizeObserver で拾えないので resize でも見直す
      document.addEventListener('visibilitychange', function () { if (!document.hidden) wake(); });
      resize();
      return true;
    } catch (err) {
      console.warn('[Motion3D] 3Dの準備に失敗したので、3D演出はおやすみします', err);
      try { if (S.renderer) { S.renderer.dispose(); if (S.renderer.domElement.parentNode) S.renderer.domElement.parentNode.removeChild(S.renderer.domElement); } } catch (e) {}
      switchToNoop();
      return false;
    }
  }

  function switchToNoop() {
    S.ok = false;
    var keep = window.Motion3D;
    for (var k in NOOP) keep[k] = NOOP[k];
  }

  // どの関数も、中で失敗してもゲームを止めない
  function safe(fn, fallback) {
    return function () {
      try { return fn.apply(null, arguments); }
      catch (e) { console.warn('[Motion3D]', e); return typeof fallback === 'function' ? fallback() : fallback; }
    };
  }

  window.Motion3D = {
    init: safe(init, false),
    setScene: safe(setScene),
    celebrate: safe(celebrate),
    encourage: safe(encourage),
    stepClear: safe(stepClear, function () { return Promise.resolve(); }),
    setReducedMotion: safe(setReducedMotion),
    isActive: function () { return S.ok; }
  };
})();
