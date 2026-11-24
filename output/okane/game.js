/* =====================================================================
   おみせで おかいもの  game.js（ゲーム組立担当）
   ---------------------------------------------------------------------
   ■ 先生へ: 問題を かえるときは、すぐ下の LESSON だけを書きかえます。
     - 漢字に ふりがなを つけるときは {漢字|かんじ} と書きます（例: 30{円|えん}）。
     - ステップ1 は choices（えらぶ おかね: 1/5/10/50/100）と answer（こたえ）を、
       ステップ2・3 は price（ねだん）と item・img（だがしの なまえと絵）を かえます。
       ステップ2 は 10の倍数（10〜90）、ステップ3 は 10のくらい・1のくらい とも 7まで にしてください。
   ===================================================================== */
const LESSON = {
  greeting: 'いらっしゃい！ おかいものを しよう',
  steps: [
    {
      kind: 'choose',
      name: 'おかねを しろう',
      shelf: ['ame', 'gumi'],                // ひだりの たなの かざり
      otehon: {
        question: '10えんだまは どこかな？',
        choices: [10, 1], answer: 10,
        say: ['ちゃいろで 10と かいてあるね', 'こんどは きみの ばんだよ'],
      },
      // hint: 2回まちがえたときの ことば ／ mark: 'frame'（わく）'num'（数字の ふだ）'hole'（あなを かこむ）
      // dim: 2回目に うすくする おかね（こたえの 候補を 2つに しぼる）
      questions: [
        { question: '10えんだまを ください', choices: [10, 1], answer: 10,
          praise: 'よくできた！ ちゃいろの 10えんだま だね', hint: 'ちゃいろの おかねだよ', mark: 'frame', dim: [] },
        { question: '1えんだまを ください', choices: [10, 1, 5], answer: 1,
          praise: 'すごい！ 1と かいてある 1えんだま だね', hint: '1と かいてあるよ', mark: 'num', dim: [5] },
        { question: '5えんだまを ください', choices: [50, 10, 5], answer: 5,
          praise: 'やったね！ きんいろで あなが ある 5えんだま だね', hint: 'きんいろだよ', mark: 'frame', dim: [10] },
        { question: '50えんだまを ください', choices: [100, 50, 5], answer: 50,
          praise: 'よく みたね！ あなが ある ぎんいろは 50えん だね', hint: 'あなが あるよ', mark: 'hole', dim: [5] },
        { question: '100えんだまを ください', choices: [50, 100, 10], answer: 100,
          praise: 'かんぺき！ 100と かいてある 100えんだま だね', hint: '100と かいてあるよ。あなは ないよ', mark: 'num', dim: [10] },
      ],
    },
    {
      kind: 'pay',
      name: '10えんで かおう',
      coins: [10],                            // つかう おかね
      otehon: { item: 'あめ', img: 'ame', price: 20 },
      // guide: ねふだの下の うすい まる ／ big: ねふだの 数字を 大きく ／ countAloud: ヒントのあと のせるたびに 声で かぞえる ／ mark50: 「ここまで 50」
      questions: [
        { item: 'らむね', img: 'ramune', price: 30, guide: true,
          praise: 'できた！ 10、20、30。30えん ぴったり だね', hint: 'まるの ところに のせよう' },
        { item: 'せんべい', img: 'senbei', price: 50, guide: true, countAloud: true,
          praise: 'すごい！ 10えんだまが 5まいで 50えん だね', hint: 'まるの ところに のせよう。いっしょに かぞえるよ' },
        { item: 'ちょこ', img: 'choco', price: 40, big: true,
          praise: 'よく かぞえたね！ 40えんは 10えんだま 4まい だね', hint: 'まるの ところに のせよう' },
        { item: 'わたがし', img: 'watagashi', price: 70, big: true, mark50: true,
          praise: 'やったね！ 70えん ぴったり。たくさん かぞえられたね', hint: 'まるの ところに のせよう。5まいで 50えん だよ' },
      ],
    },
    {
      kind: 'pay',
      name: '10えんと 1えんで かおう',
      coins: [10, 1],
      otehon: { item: 'ぐみ', img: 'gumi', price: 12 },
      questions: [
        { item: 'だんご', img: 'dango', price: 23,
          praise: 'よくできた！ 10えんが 2まい、1えんが 3まい。23えん だね', hint: 'まるの ところに のせよう' },
        { item: 'きゃらめる', img: 'kyarameru', price: 31,
          praise: 'すごい！ 10えん 3まいと 1えん 1まいで 31えん だね', hint: 'まるの ところに のせよう' },
        { item: 'ぜりー', img: 'zeri', price: 14,
          praise: 'よく みたね！ 1えんだまを 4まい。14えん ぴったり', hint: 'まるの ところに のせよう' },
        { item: 'くっきー', img: 'kukki', price: 42,
          praise: 'かんぺき！ 10えんと 1えんを じょうずに つかえたね', hint: 'まるの ところに のせよう' },
      ],
    },
  ],
  words: {
    retry: 'もういちど みてみよう',
    less: 'あと すこし。ねふだと くらべてみよう',
    more: 'ちょっと おおいね。1まい もどしてみよう',
    roomTen: '10えんの おへやを みてみよう',
    roomOne: '1えんの おへやを みてみよう',
    answerChoose: 'ひかっている おかねを いっしょに おそう',
    answerPay: 'おしい！ いっしょに かぞえよう',
    answerPayEnd: 'いっしょに かぞえたね。「これで おねがいします」を おそう',
    full: 'もう のせられないよ。おかねを おすと もどるよ',
    thanks: 'ありがとう！',
    backConfirm: 'もういちど「もどる」を おすと、はじめの がめんに もどるよ',
  },
  result: {
    heading: 'きょうの おかいもの、おしまい！\nよく がんばったね',   // \n で 行を かえる
    items: [
      { text: '1えん・5えん・10えん・50えん・100えんの おかねが わかったね', coins: [1, 5, 10, 50, 100] },
      { text: '10えんだまを かぞえて かえたね', coins: [10, 10, 10] },
      { text: '10えんと 1えんで ぴったり かえたね', coins: [10, 10, 1, 1] },
    ],
    bye: 'また おかいもの しようね',
  },
};

/* ===================================================================== ここから下は プログラム */
(function () {
  'use strict';

  const COIN_ALT = {
    1: '1えんだま（しろっぽい ぎんいろ）',
    5: '5えんだま（きんいろ・あなが ある）',
    10: '10えんだま（ちゃいろ）',
    50: '50えんだま（ぎんいろ・あなが ある）',
    100: '100えんだま（ぎんいろ・あなが ない）',
  };
  const coinSrc = (v) => 'assets/coin-' + v + '.svg';
  const dagashiSrc = (n) => 'assets/dagashi-' + n + '.svg';

  /* ---------- Motion3D / Sound が 無くても・失敗しても 止まらない ---------- */
  function safeCall(objName, fn, args) {
    try {
      const o = window[objName];
      if (o && typeof o[fn] === 'function') return o[fn].apply(o, args || []);
    } catch (e) { /* 演出・音の失敗では ゲームを止めない */ }
    return undefined;
  }
  const M3D = {
    init: (el, opt) => safeCall('Motion3D', 'init', [el, opt]),
    setScene: (s) => safeCall('Motion3D', 'setScene', [s]),
    celebrate: (x, y) => safeCall('Motion3D', 'celebrate', [x, y]),
    encourage: () => safeCall('Motion3D', 'encourage'),
    setReducedMotion: (b) => safeCall('Motion3D', 'setReducedMotion', [b]),
    stepClear: (n) => {
      let p;
      try { p = safeCall('Motion3D', 'stepClear', [n]); } catch (e) { p = null; }
      const limit = wait(3000);
      return Promise.race([Promise.resolve(p).catch(() => {}), limit]);
    },
  };
  const SND = {
    start: () => safeCall('Sound', 'start'),
    stop: () => safeCall('Sound', 'stop'),
    setMuted: (b) => safeCall('Sound', 'setMuted', [b]),
    play: (name, fallback) => {
      try {
        const S = window.Sound;
        if (!S || typeof S.play !== 'function') return;
        S.play(name);
      } catch (e) {
        if (fallback) safeCall('Sound', 'play', [fallback]);
      }
    },
  };

  /* ---------- 小さな道具 ---------- */
  const $ = (id) => document.getElementById(id);
  function wait(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  // {漢字|かんじ} → <ruby>
  function rubyHTML(s) {
    return esc(s).replace(/\{([^|{}]+)\|([^{}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>').replace(/\n/g, '<br>');
  }
  // よみあげ用（ふりがなの よみに おきかえる）
  function reading(s) { return String(s).replace(/\{([^|{}]+)\|([^{}]+)\}/g, '$2'); }
  function plain(s) { return reading(s).replace(/[「」]/g, '').replace(/\n/g, ' '); }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function centerOf(node) {
    const r = node.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* ---------- 大きさ合わせ（1920×1080 の舞台） ---------- */
  let stageScale = 1;
  function fitStage() {
    stageScale = Math.min(innerWidth / 1920, innerHeight / 1080);
    document.documentElement.style.setProperty('--stage-scale', stageScale);
  }
  addEventListener('resize', fitStage);
  fitStage();

  /* ---------- せってい（localStorage に保存。失敗しても動く） ---------- */
  const KEY = 'okane-settings-v1';
  const settings = { sound: true, motionLow: false };
  try {
    settings.motionLow = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  } catch (e) { /* なにもしない */ }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && typeof saved === 'object') {
      if (typeof saved.sound === 'boolean') settings.sound = saved.sound;
      if (typeof saved.motionLow === 'boolean') settings.motionLow = saved.motionLow;
    }
  } catch (e) { /* 保存できない ブラウザでも動く */ }
  function saveSettings() {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) { /* なにもしない */ }
  }
  function applySettings() {
    const bs = $('btn-sound');
    bs.setAttribute('aria-pressed', String(settings.sound));
    $('icon-sound').src = settings.sound ? 'assets/icon-oto-on.svg' : 'assets/icon-oto-off.svg';
    $('state-sound').textContent = settings.sound ? 'あり' : 'なし';
    const bm = $('btn-motion');
    bm.setAttribute('aria-pressed', String(!settings.motionLow));
    $('state-motion').textContent = settings.motionLow ? 'すくなめ' : 'ふつう';
    if (settings.motionLow) document.body.setAttribute('data-motion', 'low');
    else document.body.removeAttribute('data-motion');
    SND.setMuted(!settings.sound);
    M3D.setReducedMotion(settings.motionLow);
  }

  /* ---------- よみあげ（speechSynthesis・ja-JP・rate 0.9） ---------- */
  let jaVoice = null;
  function pickVoice() {
    try {
      const vs = speechSynthesis.getVoices();
      jaVoice = vs.find((v) => /^ja/i.test(v.lang)) || null;
    } catch (e) { jaVoice = null; }
  }
  try {
    if ('speechSynthesis' in window) {
      pickVoice();
      speechSynthesis.addEventListener && speechSynthesis.addEventListener('voiceschanged', pickVoice);
    }
  } catch (e) { /* なにもしない */ }
  function stopSpeak() { try { speechSynthesis.cancel(); } catch (e) { /* なにもしない */ } }
  // force=true は「よむ」ボタン（おと なしでも よむ）。自動の よみあげは おと ありの時だけ
  function speak(text, force) {
    const t = plain(text);
    const readMs = 900 + t.length * 170;
    if (!force && !settings.sound) return wait(Math.min(readMs, 4000));
    return new Promise((resolve) => {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      try {
        if (!('speechSynthesis' in window)) { setTimeout(finish, Math.min(readMs, 4000)); return; }
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(t);
        u.lang = 'ja-JP';
        u.rate = 0.9;
        if (jaVoice) u.voice = jaVoice;
        u.onend = finish;
        u.onerror = finish;
        speechSynthesis.speak(u);
        setTimeout(finish, 2500 + t.length * 260);   // 声が出ない パソコンでも 先に進む
      } catch (e) { setTimeout(finish, Math.min(readMs, 4000)); }
    });
  }
  function yomuButton(getText, small) {
    const b = el('button', 'btn-yomu' + (small ? ' btn-yomu--small' : ''), '<img src="assets/icon-yomu.svg" alt="">よむ');
    b.type = 'button';
    b.addEventListener('click', () => { SND.play('tap'); speak(getText(), true); });
    return b;
  }

  /* ---------- じょうたい ---------- */
  const state = {
    screen: 'title',
    step: 0,
    q: -1,              // -1 = おてほん
    phase: 'title',     // otehon / question / answered / stepclear
    misses: 0,
    tray: { 10: 0, 1: 0 },
    hintLevel: 0,
    busy: false,
    bag: [],
    run: 0,             // 画面が かわったら ふえる（おてほんの 中断用）
    backArmed: 0,
  };
  const CANCEL = { cancel: true };
  function guard(id) { if (id !== state.run) throw CANCEL; }

  /* ---------- 画面の きりかえ ---------- */
  function showScreen(name) {
    state.screen = name;
    $('screen-title').hidden = name !== 'title';
    $('screen-play').hidden = name !== 'play';
    $('screen-result').hidden = name !== 'result';
    $('btn-back').setAttribute('aria-disabled', String(name === 'title'));
    hideHand();
  }

  /* ---------- HUD ---------- */
  function renderHUD() {
    const st = LESSON.steps[state.step];
    $('kanban-step').textContent = String(state.step + 1);
    const nm = $('kanban-name');
    nm.textContent = st.name;
    nm.className = 'kanban__name' + (st.name.replace(/\s/g, '').length > 8 ? ' kanban__name--long' : '');
    const dots = $('progress-dots');
    dots.innerHTML = '';
    st.questions.forEach((_, i) => {
      const li = el('li', 'dot');
      if (state.q >= 0) {
        if (i < state.q || (i === state.q && (state.phase === 'answered' || state.phase === 'stepclear'))) li.classList.add('is-done');
        else if (i === state.q) li.classList.add('is-now');
      }
      dots.appendChild(li);
    });
    const total = st.questions.length;
    $('progress-text').innerHTML = state.q < 0
      ? 'ステップ' + (state.step + 1) + ' ／ <strong>おてほん</strong> ／ ぜんぶで ' + total + 'もん'
      : 'ステップ' + (state.step + 1) + ' ／ <strong>' + (state.q + 1) + '</strong>もんめ ／ ぜんぶで ' + total + 'もん';
  }

  /* ---------- おみせの ひと ---------- */
  function face(kind) {
    $('shopkeeper').src = kind === 'smile' ? 'assets/shopkeeper-smile.svg'
      : kind === 'think' ? 'assets/shopkeeper-think.svg' : 'assets/shopkeeper.svg';
  }

  /* ---------- ことば欄 ---------- */
  let msgText = '';
  function setMessage(kind, text, opts) {
    const box = $('message');
    msgText = text || '';
    box.className = 'message';
    box.innerHTML = '';
    if (!text) { box.classList.add('is-empty'); return; }
    if (kind) box.classList.add('message--' + kind);
    if (kind === 'good') box.appendChild(Object.assign(el('img', 'message__mark'), { src: 'assets/hanamaru.svg', alt: '' }));
    if (kind === 'retry' || kind === 'hint') box.appendChild(Object.assign(el('img', 'message__mark'), { src: 'assets/look.svg', alt: '' }));
    let html = rubyHTML(text);
    if (kind === 'good') {
      // さいしょの ほめことば（「よくできた！」など）に 下線。「ありがとう！」は そのまま
      let head = '';
      let rest = text;
      if (text.indexOf(LESSON.words.thanks) === 0) { head = esc(LESSON.words.thanks) + ' '; rest = text.slice(LESSON.words.thanks.length).trim(); }
      html = head + rubyHTML(rest).replace(/^([^！]*！)/, '<em>$1</em>');
    }
    box.appendChild(el('p', 'message__text', html));
    box.appendChild(yomuButton(() => msgText, true));
    $('live').textContent = plain(text);
    if (!(opts && opts.silent)) return speak(text);
    return Promise.resolve();
  }

  /* ---------- 大きいボタン ---------- */
  let mainAction = null;
  function setMain(label, action, opts) {
    const b = $('btn-main');
    if (!label) { b.hidden = true; mainAction = null; b.classList.remove('is-answer'); return; }
    b.innerHTML = label;
    b.hidden = false;
    b.inert = !!(opts && opts.inert);
    b.classList.remove('is-answer');
    mainAction = action;
    if (opts && opts.focus) setTimeout(() => { try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); } }, 30);
  }
  $('btn-main').addEventListener('click', () => {
    if (state.busy || !mainAction || $('btn-main').inert) return;
    SND.play('tap');
    const fn = mainAction;
    fn();
  });

  /* ---------- おてほんの 手 ---------- */
  function handTo(node) {
    const h = $('hand');
    const stageR = $('stage').getBoundingClientRect();
    const r = node.getBoundingClientRect();
    const x = (r.left + r.width / 2 - stageR.left) / stageScale;
    const y = (r.top + r.height * 0.58 - stageR.top) / stageScale;
    if (h.hidden) {
      h.style.transition = 'none';
      h.style.left = (settings.motionLow ? x : 260) + 'px';
      h.style.top = (settings.motionLow ? y : 980) + 'px';
      h.hidden = false;
      void h.offsetWidth;
      h.style.transition = '';
    }
    h.style.left = x + 'px';
    h.style.top = y + 'px';
    return wait(settings.motionLow ? 250 : 1000);
  }
  async function handPress() {
    const h = $('hand');
    h.classList.add('is-press');
    await wait(260);
    h.classList.remove('is-press');
    await wait(200);
  }
  function hideHand() { const h = $('hand'); h.hidden = true; h.classList.remove('is-press'); }

  /* ---------- ねふだ・たな ---------- */
  function nefudaHTML(qd, stepCfg, opts) {
    const p = String(qd.price);
    let priceHTML;
    if (stepCfg.coins.length > 1 && p.length === 2) {
      priceHTML = '<span class="nefuda__ju">' + p[0] + '</span><span class="nefuda__ichi">' + p[1] + '</span>';
    } else if (qd.big && p.length === 2) {
      priceHTML = '<span class="nefuda__big">' + p[0] + '</span>' + p[1];
    } else {
      priceHTML = esc(p);
    }
    let guide = '';
    if (qd.guide && !(opts && opts.otehon)) {
      guide = '<span class="nefuda__guide" aria-hidden="true">' + '<span></span>'.repeat(Math.floor(qd.price / 10)) + '</span>';
    }
    return '<div class="nefuda" id="nefuda" aria-label="' + esc(qd.item + ' ' + qd.price + 'えん') + '">' +
      '<span class="nefuda__name">' + esc(qd.item) + '</span>' +
      '<span class="nefuda__price" aria-hidden="true">' + priceHTML + '<span class="nefuda__yen">えん</span></span>' +
      guide + '</div>';
  }
  function renderShelf(stepCfg, qd, opts) {
    const shelf = $('shelf');
    if (stepCfg.kind === 'choose') {
      shelf.className = 'shelf shelf--quiet';
      shelf.innerHTML = (stepCfg.shelf || []).map((n) =>
        '<div class="shelf__item"><img src="' + dagashiSrc(n) + '" alt=""></div>').join('');
    } else {
      shelf.className = 'shelf';
      shelf.innerHTML = '<div class="shelf__item"><img src="' + dagashiSrc(qd.img) + '" alt="' + esc(qd.item) + '"></div>' +
        nefudaHTML(qd, stepCfg, opts);
    }
  }

  /* ---------- はり紙 ---------- */
  let questionText = '';
  function renderHarigami(text, opts) {
    const h = $('harigami');
    questionText = text;
    h.innerHTML = '';
    if (opts && opts.otehon) h.appendChild(el('span', 'tag-otehon', 'おてほん'));
    if (opts && opts.coinHint) {
      const img = el('img', 'question__coinhint');
      img.id = 'coinhint';
      img.src = coinSrc(opts.coinHint);
      img.alt = 'ヒント: ' + COIN_ALT[opts.coinHint];
      h.appendChild(img);
    }
    const p = el('p', 'question' + (opts && opts.cls ? ' ' + opts.cls : ''), rubyHTML(text));
    p.id = 'question';
    h.appendChild(p);
    const stamp = el('img', 'stamp-hanamaru fade-in');
    stamp.id = 'stamp';
    stamp.src = 'assets/hanamaru.svg';
    stamp.alt = 'はなまる';
    stamp.hidden = true;
    h.appendChild(stamp);
    h.appendChild(yomuButton(() => questionText));
  }

  /* =====================================================================
     ステップ1: おかねを えらぶ
     ===================================================================== */
  function renderChoices(choices) {
    const pa = $('playarea');
    pa.innerHTML = '';
    const wrap = el('div', 'choices');
    choices.forEach((v, i) => {
      const b = el('button', 'coin-choice fade-in',
        '<span class="coin-choice__coin"><img src="' + coinSrc(v) + '" alt="' + esc(COIN_ALT[v]) + '"></span>' +
        '<span class="coin-choice__label">' + v + 'えん</span>');
      b.type = 'button';
      b.dataset.coin = String(v);
      b.dataset.index = String(i);
      b.addEventListener('click', () => onChoose(b));
      // ふわっと出たあとは fade-in を外す（.is-dim の うすさを じゃましない）
      b.addEventListener('animationend', () => b.classList.remove('fade-in'), { once: true });
      setTimeout(() => b.classList.remove('fade-in'), 400);
      wrap.appendChild(b);
    });
    pa.appendChild(wrap);
    return wrap;
  }
  const choiceBtn = (v) => $('playarea').querySelector('.coin-choice[data-coin="' + v + '"]');

  function onChoose(btn) {
    if (state.busy || state.phase !== 'question') return;
    const qd = LESSON.steps[state.step].questions[state.q];
    const v = Number(btn.dataset.coin);
    SND.play('tap');
    if (v === qd.answer) chooseCorrect(btn, qd);
    else chooseWrong(qd);
  }

  function chooseCorrect(btn, qd) {
    state.phase = 'answered';
    hideHand();
    $('playarea').querySelectorAll('.coin-choice').forEach((b) => {
      b.classList.remove('is-answer', 'hint-frame', 'hint-frame--10', 'hint-frame--1', 'is-dim');
      b.querySelectorAll('.hint-num, .hint-hole').forEach((n) => n.remove());
      if (b !== btn) b.inert = true;
    });
    const ch = $('coinhint'); if (ch) ch.classList.remove('is-look');
    btn.classList.add('is-correct');
    btn.inert = true;
    $('stamp').hidden = false;
    face('smile');
    SND.play('correct');
    const c = centerOf(btn);
    M3D.celebrate(c.x, c.y);
    renderHUD();
    setMessage('good', qd.praise);
    setMain('つぎへ', nextQuestion, { focus: true });
  }

  function chooseWrong(qd) {
    state.misses += 1;
    face('think');
    M3D.encourage();
    const ans = choiceBtn(qd.answer);
    if (state.misses === 1) {
      SND.play('retry');
      const ch = $('coinhint'); if (ch) ch.classList.add('is-look');
      setMessage('retry', LESSON.words.retry);
    } else if (state.misses === 2) {
      SND.play('hint', 'retry');
      const ch = $('coinhint'); if (ch) ch.classList.remove('is-look');
      ans.classList.add('hint-frame');
      if (qd.answer === 10) ans.classList.add('hint-frame--10');
      if (qd.answer === 1) ans.classList.add('hint-frame--1');
      const box = ans.querySelector('.coin-choice__coin');
      if (qd.mark === 'num') box.appendChild(el('span', 'hint-num fade-in', String(qd.answer)));
      if (qd.mark === 'hole' && (qd.answer === 50 || qd.answer === 5)) box.appendChild(el('span', 'hint-hole hint-hole--' + qd.answer + ' fade-in'));
      (qd.dim || []).forEach((v) => { const b = choiceBtn(v); if (b) b.classList.add('is-dim'); });
      setMessage('hint', qd.hint);
    } else {
      SND.play('retry');
      ans.classList.add('is-answer');
      $('playarea').querySelectorAll('.coin-choice').forEach((b) => { if (b !== ans) b.classList.add('is-dim'); });
      face('normal');
      handTo(ans);
      setMessage(null, LESSON.words.answerChoose);
      try { ans.focus({ preventScroll: true }); } catch (e) { /* なにもしない */ }
    }
  }

  /* =====================================================================
     ステップ2・3: 山から トレーに のせて はらう
     ===================================================================== */
  function answerOf(stepCfg, qd) {
    if (stepCfg.coins.length > 1) return { 10: Math.floor(qd.price / 10), 1: qd.price % 10 };
    return { 10: Math.round(qd.price / 10), 1: 0 };
  }
  function capOf(stepCfg, v) {
    const qd = currentPayData();
    const ans = answerOf(stepCfg, qd);
    if (stepCfg.coins.length > 1) return Math.max(7, ans[v] + 1);
    return v === 10 ? Math.max(9, ans[10] + 1) : 0;
  }
  function currentPayData() {
    const st = LESSON.steps[state.step];
    return state.q < 0 ? st.otehon : st.questions[state.q];
  }
  const trayTotal = () => state.tray[10] * 10 + state.tray[1];

  function renderPay(stepCfg) {
    const pa = $('playarea');
    pa.innerHTML = '';
    const two = stepCfg.coins.length > 1;
    const piles = el('div', 'piles');
    [10, 1].forEach((v, i) => {
      const b = el('button', 'coin-pile',
        '<span class="coin-pile__stack">' + ('<img src="' + coinSrc(v) + '" alt="">').repeat(3) + '</span>' +
        '<span class="coin-pile__label">' + v + 'えんだま<small>おして のせる</small></span>');
      b.type = 'button';
      b.id = 'pile-' + v;
      b.dataset.coin = String(v);
      b.dataset.index = String(i);
      b.setAttribute('aria-label', v + 'えんだまの 山。おすと トレーに のせる');
      if (!two && v === 1) { b.hidden = true; b.tabIndex = -1; }
      b.addEventListener('click', () => onPile(v));
      piles.appendChild(b);
    });
    pa.appendChild(piles);
    const tray = el('div', 'tray' + (two ? ' tray--two' : ''));
    tray.id = 'tray';
    tray.innerHTML = '<div class="tray__total">いま <span class="tray__total-num" id="tray-num">0</span> えん</div>' +
      '<div class="tray__rooms">' +
      '<div class="tray__room" id="room-10">' + (two ? '<span class="tray__room-name">10えんの おへや</span>' : '') + '</div>' +
      (two ? '<div class="tray__room" id="room-1"><span class="tray__room-name">1えんの おへや</span></div>' : '') +
      '</div>';
    pa.appendChild(tray);
  }

  function renderTray(newCoin) {
    const stepCfg = LESSON.steps[state.step];
    const qd = currentPayData();
    const ans = answerOf(stepCfg, qd);
    const showSlots = state.q >= 0 && state.hintLevel >= 2;
    stepCfg.coins.forEach((v) => {
      const room = $('room-' + v);
      if (!room) return;
      room.querySelectorAll('.tray-coin, .coin-slot, .tray-mark').forEach((n) => n.remove());
      const n = state.tray[v];
      const slots = showSlots ? Math.max(ans[v], n) : n;
      let count = 0;
      for (let i = 0; i < slots; i++) {
        if (i < n) {
          const b = el('button', 'tray-coin' + (newCoin === v && i === n - 1 ? ' fade-in' : ''),
            '<img src="' + coinSrc(v) + '" alt="' + v + 'えんだま。おすと もどる">');
          b.type = 'button';
          b.dataset.coin = String(v);
          b.addEventListener('click', () => onTrayCoin(v));
          b.inert = state.phase !== 'question';
          room.appendChild(b);
        } else {
          room.appendChild(el('span', 'coin-slot coin-slot--' + v));
        }
        count++;
        if (showSlots && qd.mark50 && v === 10 && i === 4 && slots > 5) room.appendChild(el('span', 'tray-mark', 'ここまで 50'));
      }
      room.classList.toggle('is-crowded', count >= 6);
    });
    $('tray-num').textContent = String(trayTotal());
  }

  function addCoin(v) {
    state.tray[v] += 1;
    SND.play('place', 'tap');
    renderTray(v);
  }
  function onPile(v) {
    if (state.busy || state.phase !== 'question') return;
    const stepCfg = LESSON.steps[state.step];
    if (stepCfg.coins.indexOf(v) < 0) return;
    if (state.tray[v] >= capOf(stepCfg, v)) { SND.play('tap'); setMessage(null, LESSON.words.full); return; }
    addCoin(v);
    const qd = currentPayData();
    if (qd.countAloud && state.hintLevel >= 2) speak(trayTotal() + 'えん');
  }
  function onTrayCoin(v) {
    if (state.busy || state.phase !== 'question') return;
    if (state.tray[v] <= 0) return;
    const hadFocus = document.activeElement && document.activeElement.classList.contains('tray-coin');
    state.tray[v] -= 1;
    SND.play('back', 'tap');
    renderTray();
    if (hadFocus) {
      const left = $('room-' + v).querySelectorAll('.tray-coin');
      (left.length ? left[left.length - 1] : $('pile-' + v)).focus();
    }
  }

  async function pay() {
    if (state.busy || state.phase !== 'question') return;
    const stepCfg = LESSON.steps[state.step];
    const qd = currentPayData();
    const ans = answerOf(stepCfg, qd);
    const ok = state.tray[10] === ans[10] && state.tray[1] === ans[1];
    if (ok) return payCorrect(qd);
    state.misses += 1;
    face('think');
    M3D.encourage();
    $('btn-main').classList.remove('is-answer');
    let word;
    if (stepCfg.coins.length > 1) word = state.tray[10] !== ans[10] ? LESSON.words.roomTen : LESSON.words.roomOne;
    else word = trayTotal() < qd.price ? LESSON.words.less : LESSON.words.more;

    if (state.misses === 1) {
      SND.play('retry');
      const nf = $('nefuda'); if (nf) nf.classList.add('is-look');
      setMessage('retry', word);
    } else if (state.misses === 2) {
      SND.play('hint', 'retry');
      const nf = $('nefuda'); if (nf) nf.classList.remove('is-look');
      state.hintLevel = 2;
      renderTray();
      setMessage('hint', word + '。' + qd.hint);
    } else {
      await payTogether(stepCfg, qd, ans);
    }
  }

  // 3回目: 手が いっしょに 1まいずつ のせて、声で かぞえる
  async function payTogether(stepCfg, qd, ans) {
    const id = state.run;
    state.busy = true;
    SND.play('retry');
    face('normal');
    state.hintLevel = 2;
    try {
      await setMessage(null, LESSON.words.answerPay);
      guard(id);
      state.tray = { 10: 0, 1: 0 };
      renderTray();
      let total = 0;
      for (const v of [10, 1]) {
        for (let i = 0; i < ans[v]; i++) {
          await handTo($('pile-' + v)); guard(id);
          await handPress(); guard(id);
          addCoin(v);
          total += v;
          await speak(String(total)); guard(id);
        }
      }
      await handTo($('btn-main')); guard(id);
      $('btn-main').classList.add('is-answer');
      state.busy = false;
      setMessage(null, LESSON.words.answerPayEnd);
      try { $('btn-main').focus({ preventScroll: true }); } catch (e) { /* なにもしない */ }
    } catch (e) {
      if (e !== CANCEL) { state.busy = false; throw e; }
    }
  }

  function payCorrect(qd) {
    state.phase = 'answered';
    hideHand();
    $('btn-main').classList.remove('is-answer');
    const nf = $('nefuda'); if (nf) nf.classList.remove('is-look');
    $('playarea').querySelectorAll('.coin-pile, .tray-coin').forEach((b) => { b.inert = true; });
    $('stamp').hidden = false;
    face('smile');
    SND.play('correct');
    const c = centerOf($('tray'));
    M3D.celebrate(c.x, c.y);
    state.bag.push(qd);
    renderHUD();
    setMessage('good', LESSON.words.thanks + ' ' + qd.praise);
    setMain('つぎへ', nextQuestion, { focus: true });
  }

  /* =====================================================================
     ながれ: おてほん → もんだい → ステップクリア → ふり返り
     ===================================================================== */
  function newRun() { state.run += 1; state.busy = false; stopSpeak(); hideHand(); return state.run; }

  async function startStep(i) {
    const id = newRun();
    state.step = i;
    state.q = -1;
    state.phase = 'otehon';
    state.misses = 0;
    state.hintLevel = 0;
    state.tray = { 10: 0, 1: 0 };
    state.backArmed = 0;
    showScreen('play');
    M3D.setScene('play');
    const st = LESSON.steps[i];
    renderHUD();
    face('normal');
    setMessage(null, '', { silent: true });
    setMain(null);
    const pa = $('playarea');
    pa.inert = true;
    state.busy = true;
    try {
      if (st.kind === 'choose') await otehonChoose(st, id);
      else await otehonPay(st, id);
      guard(id);
      state.busy = false;
      pa.inert = false;
      setMain('やってみる', () => startQuestion(0), { focus: true });
    } catch (e) {
      if (e !== CANCEL) { state.busy = false; pa.inert = false; throw e; }
    }
  }

  async function otehonChoose(st, id) {
    const o = st.otehon;
    renderShelf(st);
    renderHarigami(o.question, { otehon: true });
    renderChoices(o.choices);
    await wait(500); guard(id);
    await speak(o.question); guard(id);
    const ans = choiceBtn(o.answer);
    await handTo(ans); guard(id);
    await handPress(); guard(id);
    SND.play('tap');
    ans.classList.add('is-answer');
    face('smile');
    for (const s of o.say) { await setMessage(null, s); guard(id); await wait(400); guard(id); }
    hideHand();
  }

  async function otehonPay(st, id) {
    const o = st.otehon;
    renderShelf(st, o, { otehon: true });
    renderHarigami(o.price + '{円|えん}の だがしを かおう', { otehon: true });
    renderPay(st);
    renderTray();
    setMain('これで<br>おねがいします', null, { inert: true });
    await wait(500); guard(id);
    await speak(questionText); guard(id);
    const ans = answerOf(st, o);
    if (st.coins.length > 1) {
      await setMessage(null, '10えんが ' + ans[10] + 'まい、1えんが ' + ans[1] + 'まい'); guard(id);
    }
    let total = 0;
    for (const v of [10, 1]) {
      for (let i = 0; i < ans[v]; i++) {
        await handTo($('pile-' + v)); guard(id);
        await handPress(); guard(id);
        addCoin(v);
        total += v;
        await setMessage(null, total + 'えん'); guard(id);
      }
    }
    await setMessage(null, 'ねふだと おなじに なったね。これで おねがいします'); guard(id);
    await handTo($('btn-main')); guard(id);
    await handPress(); guard(id);
    SND.play('tap');
    hideHand();
    face('smile');
    const c = centerOf($('tray'));
    M3D.celebrate(c.x, c.y);
    await setMessage('good', LESSON.words.thanks + ' ' + 'こんどは きみの ばんだよ'); guard(id);
  }

  function startQuestion(qi) {
    newRun();
    const st = LESSON.steps[state.step];
    const qd = st.questions[qi];
    state.q = qi;
    state.phase = 'question';
    state.misses = 0;
    state.hintLevel = 0;
    state.tray = { 10: 0, 1: 0 };
    face('normal');
    renderHUD();
    $('playarea').inert = false;
    setMessage(null, '', { silent: true });
    if (st.kind === 'choose') {
      renderShelf(st);
      renderHarigami(qd.question, { coinHint: qd.answer });
      renderChoices(qd.choices);
      setMain(null);
    } else {
      renderShelf(st, qd);
      renderHarigami(qd.question || (qd.price + '{円|えん}の だがしを かおう'));
      renderPay(st);
      renderTray();
      setMain('これで<br>おねがいします', pay);
    }
    speak(questionText);
    const first = $('harigami').querySelector('.btn-yomu');
    if (document.activeElement && document.activeElement !== document.body) {
      try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
    }
  }

  function nextQuestion() {
    const st = LESSON.steps[state.step];
    if (state.q + 1 < st.questions.length) startQuestion(state.q + 1);
    else stepClear();
  }

  async function stepClear() {
    const id = newRun();
    const n = state.step + 1;
    state.phase = 'stepclear';
    state.busy = true;
    renderHUD();
    $('playarea').inert = true;
    setMain(null);
    renderHarigami('ステップ' + n + ' できた！', { cls: 'stepclear-text' });
    face('smile');
    setMessage(null, '', { silent: true });
    SND.play('clear');
    await M3D.stepClear(n);
    if (id !== state.run) return;
    state.busy = false;
    const last = state.step + 1 >= LESSON.steps.length;
    setMessage('good', 'ステップ' + n + ' できた！ よく がんばったね');
    setMain(last ? 'ふりかえりへ' : 'つぎの<br>ステップへ', () => (last ? showResult() : startStep(state.step + 1)), { focus: true });
  }

  /* ---------- ふり返り ---------- */
  function showResult() {
    newRun();
    state.phase = 'result';
    showScreen('result');
    M3D.setScene('result');
    SND.play('clear');
    const items = $('result-items');
    items.innerHTML = state.bag.map((d) => '<img src="' + dagashiSrc(d.img) + '" alt="' + esc(d.item) + '">').join('');
    $('result-count').innerHTML = 'かったもの <strong>' + state.bag.length + '</strong>こ';
    const h = $('result-harigami');
    h.innerHTML = '';
    h.appendChild(el('p', 'question question--long', rubyHTML(LESSON.result.heading)));
    h.appendChild(yomuButton(() => LESSON.result.heading));
    $('result-list').innerHTML = LESSON.result.items.slice(0, 3).map((it) =>
      '<li class="result-item fade-in"><img class="result-item__stamp" src="assets/hanamaru.svg" alt="はなまる">' +
      '<span>' + rubyHTML(it.text) + '</span>' +
      '<span class="result-item__coins">' + it.coins.map((v) => '<img src="' + coinSrc(v) + '" alt="' + v + 'えん">').join('') + '</span></li>'
    ).join('');
    const m = $('result-message');
    m.className = 'message message--good';
    m.innerHTML = '';
    m.appendChild(Object.assign(el('img', 'message__mark'), { src: 'assets/hanamaru.svg', alt: '' }));
    m.appendChild(el('p', 'message__text', rubyHTML(LESSON.result.bye)));
    const allText = LESSON.result.heading + '。' + LESSON.result.items.map((i) => i.text).join('。') + '。' + LESSON.result.bye;
    m.appendChild(yomuButton(() => LESSON.result.bye, true));
    speak(allText);
    setTimeout(() => { try { $('btn-again').focus({ preventScroll: true }); } catch (e) { /* なにもしない */ } }, 30);
  }

  /* ---------- タイトル ---------- */
  function showTitle(bye) {
    newRun();
    state.phase = 'title';
    showScreen('title');
    M3D.setScene('title');
    $('title-bubble').innerHTML = bye ? 'また きてね！<br>まってるよ' : 'いらっしゃい！<br>おかいものを しよう';
  }
  $('title-yomu').addEventListener('click', () => {
    SND.play('tap');
    speak(plain($('title-bubble').innerText.replace(/\n/g, ' ')) + '。「はじめる」を おしてね', true);
  });
  $('btn-start').addEventListener('click', async () => {
    if (state.busy) return;
    SND.start();
    SND.setMuted(!settings.sound);
    SND.play('tap');
    state.bag = [];
    state.busy = true;
    const id = ++state.run;
    await speak(LESSON.greeting);
    if (id !== state.run) return;
    state.busy = false;
    startStep(0);
  });
  $('btn-again').addEventListener('click', () => { SND.play('tap'); state.bag = []; startStep(0); });
  $('btn-end').addEventListener('click', () => {
    SND.play('tap');
    showTitle(true);
    speak('また きてね！ まってるよ');
    setTimeout(() => SND.stop(), 1200);
  });

  /* ---------- せってい ボタン ---------- */
  $('btn-sound').addEventListener('click', () => {
    settings.sound = !settings.sound;
    saveSettings();
    applySettings();
    if (!settings.sound) stopSpeak();
    else SND.play('tap');
  });
  $('btn-motion').addEventListener('click', () => {
    SND.play('tap');
    settings.motionLow = !settings.motionLow;
    saveSettings();
    applySettings();
  });
  $('btn-back').addEventListener('click', () => {
    if (state.screen === 'title') return;
    SND.play('tap');
    if (state.screen === 'result') { showTitle(false); return; }
    const now = Date.now();
    if (state.backArmed && now - state.backArmed < 6000) { state.backArmed = 0; showTitle(false); return; }
    state.backArmed = now;
    setMessage('retry', LESSON.words.backConfirm);
  });

  /* ---------- キーボード: 1〜4 で えらぶ ---------- */
  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    if (!/^[1-4]$/.test(k)) return;
    if (state.screen !== 'play' || state.phase !== 'question' || state.busy) return;
    const idx = Number(k) - 1;
    const st = LESSON.steps[state.step];
    if (st.kind === 'choose') {
      const btns = $('playarea').querySelectorAll('.coin-choice');
      if (btns[idx]) { e.preventDefault(); btns[idx].focus(); btns[idx].click(); }
    } else {
      const v = [10, 1][idx];
      if (v && st.coins.indexOf(v) >= 0) { e.preventDefault(); const p = $('pile-' + v); p.focus(); onPile(v); }
    }
  });

  /* ---------- はじまり ---------- */
  applySettings();
  M3D.init($('stage3d'), {
    theme: {
      name: 'dagashiya',
      kabe: '#E6D5B3', kami: '#FBF5E6', sumi: '#2E2219', ki: '#8B5A33', kiDark: '#5E3A1E',
      enji: '#A3352B', ai: '#2C4A6E', yamabuki: '#E3B23C',
      coins: { 1: '#E9ECEA', 5: '#D6A83E', 10: '#9A5530', 50: '#C4C9CC', 100: '#B4BAC0' },
    },
  });
  M3D.setReducedMotion(settings.motionLow);
  showTitle(false);
})();
