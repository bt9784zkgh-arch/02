/* =========================================================
   おおぞら こころの たび — game.js
   ---------------------------------------------------------
   【先生へ: 問題の 書きかえ方】
   - 下の LESSON の 文を 書きかえて 保存し、index.html を 開きなおすだけです。
   - ふりがなは {漢字|かんじ}、あやしい ことばの 黄色い 下線は [[ことば]] と 書きます。
   - answer は 正解の 番号（①なら 1、②なら 2）。絵は assets/ の ファイル名（.svg は いりません）。
   ========================================================= */
const LESSON = {
  title: ['{大空|おおぞら}', 'こころの たび'],
  sub: '{気持|きも}ちに {気|き}づいて、よい {行動|こうどう}を えらぼう',
  from: 'ワークブック「{大空|おおぞら}に {翔|か}け」から',

  steps: [
    /* ---------------- ステップ1 ---------------- */
    {
      kind: 'iceberg',
      name: 'ことばの おくの {気持|きも}ち',
      icon: 'ice-small',
      question: '{水|みず}の {下|した}に、どんな {気持|きも}ちが ありそう？',
      demo: {
        word: 'むかつく！',
        card: { text: 'くやしい', pic: 'fist' },
        talk1: 'ことばは {氷山|ひょうざん}の {上|うえ}。{気持|きも}ちは {水|みず}の {下|した}に かくれて いるよ',
        talk2: '「むかつく！」の おくに、「くやしい」が あったね',
      },
      questions: [
        { word: 'ウザい！',
          choices: [{ text: '{思|おも}いどおりに いかない', pic: 'face-komari' }, { text: 'たのしい', pic: 'face-niko' }],
          answer: 1,
          praise: 'よく できた！「ウザい！」の おくに、「{思|おも}いどおりに いかない」が あったね',
          hint: 'きつい ことばの おくには、つらい {気持|きも}ちが かくれて いるよ' },
        { word: 'だまれ！',
          choices: [{ text: 'うれしい', pic: 'face-niko' }, { text: 'はずかしい', pic: 'face-hide' }],
          answer: 2,
          praise: '{見|み}つけたね！「だまれ！」の おくに、「はずかしい」が かくれて いたね',
          hint: 'つらい {気持|きも}ちは どっちかな？ {顔|かお}を {見|み}て みよう' },
        { word: 'むかつく！',
          choices: [{ text: 'さびしい', pic: 'person-alone' }, { text: 'たのしい', pic: 'face-niko' }],
          answer: 1,
          praise: 'すごい！「むかつく！」の おくには、「さびしい」も あるんだね',
          hint: 'おてほんを おもいだそう。「むかつく！」の おくは つらい {気持|きも}ちだったね' },
        { word: 'ありがとう！', warm: true,   // warm: うれしい ことば（吹き出しが 緑）
          choices: [{ text: 'くやしい', pic: 'fist' }, { text: '{感謝|かんしゃ}（ありがとうの {気持|きも}ち）', pic: 'heart-give' }],
          answer: 2,
          praise: 'よく できた！ うれしい ことばの おくにも、{気持|きも}ちが あるね',
          hint: 'うれしい ことばの おくには、うれしい {気持|きも}ちが あるよ' },
      ],
      clear: 'ことばの おくの {気持|きも}ちに {気|き}づけたね。おくの {気持|きも}ちに {気|き}づくと、{相手|あいて}の ことが わかって きます',
      reflect: { text: 'ことばの おくの {気持|きも}ちに {気|き}づけたね', pic: 'ice-small' },
    },

    /* ---------------- ステップ2 ---------------- */
    {
      kind: 'sort',
      name: '{変|か}えられる？ {変|か}えられない？',
      icon: 'mark-hand',
      question: 'この カードは、どっちの はこ？',
      boxes: [
        { name: '{手|て}のはこ',   text: 'じぶんの {行動|こうどう}で {変|か}えられる', pic: 'mark-hand',  look: 'hand' },
        { name: 'くものはこ', text: 'じぶんでは {変|か}えられない',       pic: 'mark-cloud', look: 'cloud' },
      ],
      demo: {
        card: { text: '{台風|たいふう}', pic: 'pic-shiori-typhoon' },
        answer: 2,
        talk1: '{楽|たの}しみに していた {修学旅行|しゅうがくりょこう}。でも、{台風|たいふう}で {延期|えんき}に なりそう…',
        talk2: '{台風|たいふう}は、どんなに がんばっても じぶんでは {変|か}えられません',
      },
      questions: [
        { card: '{天気|てんき}', pic: 'pic-weather', answer: 2,
          praise: 'よく できた！ {天気|てんき}は じぶんでは {変|か}えられないね',
          hint: '{台風|たいふう}と おなじ なかまだよ' },
        { card: '{旅行|りょこう}の かわりに、{家|いえ}で {楽|たの}しめる ことを {考|かんが}える', pic: 'pic-home-play', answer: 1,
          praise: 'すごい！ いま できる ことを さがすのは、じぶんで できるね',
          hint: '「{考|かんが}える」のは、あなたが する ことだよ' },
        { card: '{地震|じしん}や {台風|たいふう}', pic: 'pic-quake-typhoon', answer: 2,
          praise: 'そのとおり！ {地震|じしん}や {台風|たいふう}は、どんなに がんばっても {変|か}えられないね',
          hint: 'おてほんを {見|み}よう。{台風|たいふう}は どっちの はこだった？' },
        { card: 'じぶんの {行動|こうどう}（すること）', pic: 'pic-action', answer: 1,
          praise: 'よく できた！ じぶんの {行動|こうどう}は、じぶんで {変|か}えられるね',
          hint: 'はこの ことばを {見|み}よう。「じぶんの {行動|こうどう}で {変|か}えられる」' },
        { type: 'choose',   // はこ ではなく、2まいの カードから えらぶ 問題
          question: 'かかわる？ スルー？ どっちに する？',
          card: '{駅|えき}で ならんでいたら、よこから {人|ひと}が わりこんで きた！', pic: 'pic-station',
          goal: '{目的|もくてき}: {時間|じかん}どおりに {着|つ}く',
          choices: [{ text: '{注意|ちゅうい}して、トラブルに なる' }, { text: 'スルーして、{電車|でんしゃ}に のる' }],
          answer: 2,
          praise: 'えらいね！ スルーも {大切|たいせつ}な えらび{方|かた}だね。{時間|じかん}どおりに {着|つ}けるね',
          hint: 'めあてカードを {見|み}よう。「{時間|じかん}どおりに {着|つ}く」には どっち？',
          // この 問題の 前に 出す せつめいの 紙
          intro: { title: 'かかわる？ スルー？',
                   text: 'こんどは、かかわる？ スルー？ を えらぶよ。スルーは、かかわらないで そのままに する ことだよ',
                   pic: 'pic-clock' } },
      ],
      clear: '{変|か}えられない ことは「しかたない」と {受|う}け{止|と}めて、いま できる ことを さがそう',
      reflect: { text: '{変|か}えられる こと・{変|か}えられない ことを {分|わ}けられたね', pic: 'mark-hand' },
    },

    /* ---------------- ステップ3 ---------------- */
    {
      kind: 'scene',
      name: 'こまった とき、どうする？',
      icon: 'mark-adult',
      question: 'あなたなら どうする？',
      demo: {
        scene: '{自分|じぶん}の {給食|きゅうしょく}を、となりの {子|こ}に {少|すこ}し {食|た}べられて しまいました',
        pic: 'pic-lunch',
        choices: [
          { text: '{大|おお}きな {声|こえ}で「なに してんの！」と どなる' },
          { text: 'となりの {子|こ}を たたく' },
          { text: '{先生|せんせい}に {相談|そうだん}する', marks: ['mark-teacher'] },
        ],
        answer: 3,
        talk1: 'こまった ときは、どうする かな？',
        talk2: 'こまった ときは、{先生|せんせい}に {相談|そうだん}しよう',
      },
      questions: [
        { scene: '{給食|きゅうしょく}を、となりの {子|こ}に {少|すこ}し {食|た}べられた。となりの {子|こ}は ゲラゲラ わらって いる。',
          pic: 'pic-lunch',
          choices: [
            { text: 'となりの {子|こ}を たたく' },
            { text: '{先生|せんせい}に {相談|そうだん}する', marks: ['mark-teacher'] },
            { text: '{大|おお}きな {声|こえ}で「なに してんの！」と どなる' },
          ],
          answer: 2,
          praise: 'よく できた！ がまんが できない ときは、{先生|せんせい}に {相談|そうだん}しよう',
          hint: 'おてほんと おなじ {場面|ばめん}だよ。{先生|せんせい}の マークを さがそう' },
        { scene: 'テスト{中|ちゅう}、となりの {人|ひと}が ペンを トントン。{音|おと}が {気|き}に なって、{集中|しゅうちゅう}できない。',
          pic: 'pic-test',
          choices: [
            { text: 'テスト{中|ちゅう}に {手|て}を あげて、{先生|せんせい}に {言|い}う', marks: ['mark-handup', 'mark-teacher'] },
            { text: 'テスト{中|ちゅう}に「その {音|おと} うるさいです」と {言|い}う' },
            { text: '{結果|けっか}が わるかったら、あの {音|おと}の せいに する' },
          ],
          answer: 1,
          praise: 'すごい！ その {場|ば}で {先生|せんせい}に つたえられたね',
          hint: '{先生|せんせい}の マークが ある カードは どれかな？' },
        { scene: '{明日|あした}は {班|はん}の {発表|はっぴょう}。でも {今|いま}、{高|たか}い {熱|ねつ}で ねこんで いる。',
          pic: 'pic-fever',
          choices: [
            { text: 'めいわくを かけるから、かならず {学校|がっこう}に {行|い}く' },
            { text: '{班|はん}の {人|ひと}に「{休|やす}む かもしれない」と {先|さき}に {連絡|れんらく}する', marks: ['mark-phone'] },
            { text: '{朝|あさ}に ならないと わからないので、なにも {考|かんが}えない' },
          ],
          answer: 2,
          praise: 'よく できた！ {自分|じぶん}の {体|からだ}が いちばん {大切|たいせつ}。むりを しなくて いいよ',
          hint: '{体|からだ}が いちばん {大切|たいせつ}だよ。むりを しない カードは どれ？' },
        { scene: 'スマホに メール。「【{重要|じゅうよう}】あなたの プライム{会員|かいいん}の [[{期限|きげん}が {切|き}れます]]。[[いますぐ]] {必要|ひつよう}な ことを {入力|にゅうりょく}してください」',
          pic: 'pic-mail',
          choices: [
            { text: 'すぐに {必要|ひつよう}な ことを {入力|にゅうりょく}する' },
            { text: 'メールを {開|ひら}いて、{返信|へんしん}する' },
            { text: 'おうちの{人|ひと}や {先生|せんせい}に {相談|そうだん}する' },
          ],
          answer: 3,
          praise: 'すごい！ あやしい ときは、{手|て}を とめて {大人|おとな}に {見|み}せよう',
          hint: '「いますぐ」と あせらせる メールは あやしいよ。{手|て}を とめよう' },
        { scene: '{友達|ともだち}に「あの {店|みせ}、{万引|まんび}きしても ばれないよ。{今|いま}から {行|い}こうぜ」と {言|い}われた。',
          pic: 'pic-shop', mark: 'mark-stop',
          choices: [
            { text: 'たしかに ばれないなと {思|おも}って いっしょに {行|い}く' },
            { text: 'ことわって、まわりの {大人|おとな}や {先生|せんせい}に {相談|そうだん}する', marks: ['mark-adult'] },
            { text: '「なにを ぬすむの？」と くわしく {聞|き}く' },
          ],
          answer: 2,
          praise: 'よく できた！ {万引|まんび}きは {犯罪|はんざい}。ことわって、{大人|おとな}に {相談|そうだん}できたね',
          hint: '{万引|まんび}きは してはいけない ことだよ。ことわる カードは どれ？' },
      ],
      clear: 'こまった ときは、{大人|おとな}に {相談|そうだん}すれば {大丈夫|だいじょうぶ}',
      reflect: { text: 'こまった とき、{大人|おとな}に {相談|そうだん}する ことを えらべたね', pic: 'mark-adult' },
    },
  ],

  words: {
    retry1: 'もういちど みてみよう',
    together: 'いっしょに おして みよう',
    gotIt: 'これで わかったね。',
    reflectTitle: '{今日|きょう} できた こと',
    reflectLast: 'まよったら、{大人|おとな}に {相談|そうだん}しよう。あなたは {大空|おおぞら}に とべるよ',
  },
};

/* =========================================================
   ここから下は ゲームの しくみ（ふだんは さわらなくて だいじょうぶ）
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 3D と 音（まだ ファイルが 無くても 動くように） ---------- */
  const noop = () => {};
  const M3D = window.Motion3D || { __stub: true, init: noop, setScene: noop, celebrate: noop, encourage: noop,
    stepClear: () => Promise.resolve(), setReducedMotion: noop };
  const SND = window.Sound || { __stub: true, start: noop, stop: noop, setMuted: noop, play: noop };
  // ほかの担当の 関数で エラーが 出ても、ゲームは 止めない
  function call(obj, name, ...args) {
    try { return typeof obj[name] === 'function' ? obj[name](...args) : undefined; }
    catch (e) { return undefined; }
  }

  /* ---------- 小さな 道具 ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const A = (name) => `assets/${name}.svg`;
  // {漢字|かんじ} → <ruby>、[[ことば]] → 黄色い下線
  const ruby = (s) => String(s)
    .replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>')
    .replace(/\[\[(.+?)\]\]/g, '<span class="warn-line">$1</span>');
  // 読み上げ用: ふりがなを 読ませる
  const plain = (s) => String(s)
    .replace(/\{([^|}]+)\|([^}]+)\}/g, '$2')
    .replace(/\[\[|\]\]/g, '')
    .replace(/<[^>]+>/g, '');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const stage = $('#stage');
  const screenEl = $('#screen');

  /* ---------- 画面の 大きさ（1920×1080 を 基準に 同じ わりあいで 縮める） ---------- */
  const fit = () => document.documentElement.style.setProperty(
    '--fit', Math.min(innerWidth / 1920, innerHeight / 1080));
  fit(); addEventListener('resize', fit);
  const fitScale = () => stage.getBoundingClientRect().width / 1920 || 1;
  // 画面の 座標 → ステージの中の 座標（1920×1080）
  function toStage(rect) {
    const s = stage.getBoundingClientRect(), k = fitScale();
    return { x: (rect.left - s.left) / k, y: (rect.top - s.top) / k, w: rect.width / k, h: rect.height / k };
  }

  /* ---------- せってい（localStorage。使えなくても 動く） ---------- */
  const KEY = 'ozora-game-settings';
  let prefersLess = false;
  try { prefersLess = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  const settings = { muted: false, less: prefersLess };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch (e) {} };
  const isLess = () => settings.less;

  function applySettings() {
    const bs = $('#btnSound'), bm = $('#btnMotion');
    bs.setAttribute('aria-pressed', String(settings.muted));
    $('img', bs).src = A(settings.muted ? 'icon-sound-off' : 'icon-sound-on');
    $('small', bs).textContent = settings.muted ? 'なし' : 'あり';
    bm.setAttribute('aria-pressed', String(settings.less));
    $('img', bm).src = A(settings.less ? 'icon-motion-less' : 'icon-motion');
    $('small', bm).textContent = settings.less ? 'すくなめ' : 'ふつう';
    if (settings.less) stage.dataset.motion = 'less'; else delete stage.dataset.motion;
    call(SND, 'setMuted', settings.muted);
    call(M3D, 'setReducedMotion', settings.less);
  }

  /* ---------- 読み上げ ---------- */
  const synth = window.speechSynthesis;
  let jaVoice = null;
  function pickVoice() {
    try { jaVoice = (synth.getVoices() || []).find((v) => /^ja/i.test(v.lang)) || null; } catch (e) {}
  }
  if (synth) { pickVoice(); try { synth.addEventListener('voiceschanged', pickVoice); } catch (e) {} }
  function stopSpeak() { try { synth && synth.cancel(); } catch (e) {} }
  function speak(text) {
    if (!synth || !window.SpeechSynthesisUtterance) return;
    try {
      if (synth.speaking) { synth.cancel(); return; }   // もういちど おすと とまる
      const u = new SpeechSynthesisUtterance(plain(text));
      u.lang = 'ja-JP'; u.rate = 0.9; u.pitch = 1;
      if (jaVoice) u.voice = jaVoice;
      synth.speak(u);
    } catch (e) {}
  }

  /* ---------- 画面の 切りかえ ---------- */
  let token = 0;          // 画面が かわったら、前の画面の タイマーを 止める
  let timers = [];
  let history = [];
  let current = null;
  let readText = '';      // よむボタンで 読む 文
  let keyChoices = null;  // 1〜4キーで えらぶ ボタン

  function later(fn, ms) {
    const t = token;
    const id = setTimeout(() => { if (t === token) fn(); }, ms);
    timers.push(id);
  }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function go(desc, push = true) {
    if (push && current) history.push(current);
    current = desc;
    token++; clearTimers(); stopSpeak();
    keyChoices = null;
    $$('.hand-cursor, .link-line', stage).forEach((n) => n.remove());
    const fn = RENDER[desc.name];
    fn(desc);
    $('#btnBack').setAttribute('aria-disabled', String(desc.name === 'title'));
  }
  function back() {
    if (!current || current.name === 'title') return;
    call(SND, 'play', 'tap');
    const prev = history.pop();
    if (!prev) { go({ name: 'title' }, false); return; }
    go(prev, false);
  }

  /* ---------- 上の帯: 進み具合 ---------- */
  function setProgress(s, label, total, doneCount, nowIndex) {
    const prog = $('#progress'), fp = $('#flightpath'), lb = $('#progressLabel');
    if (s == null) { prog.classList.add('is-empty'); lb.textContent = ''; fp.innerHTML = ''; return; }
    prog.classList.remove('is-empty');
    lb.innerHTML = `ステップ <b>${s + 1}</b> ／ ${label}`;
    let html = '';
    for (let i = 0; i < total; i++) {
      const cls = i < doneCount ? ' is-done' : (i === nowIndex ? ' is-now' : '');
      html += `<li class="flightpath-dot${cls}"></li>`;
    }
    fp.innerHTML = html + `<img class="flightpath-bird" src="${A('bird')}" alt="">`;
    moveBird(nowIndex == null ? Math.max(0, doneCount - 1) : nowIndex, true);
  }
  function moveBird(i, instant) {
    const fp = $('#flightpath'); const dots = $$('.flightpath-dot', fp); const bird = $('.flightpath-bird', fp);
    if (!bird || !dots.length) return;
    const d = dots[Math.max(0, Math.min(dots.length - 1, i))];
    if (instant) bird.style.transition = 'none';
    bird.style.left = (d.offsetLeft + d.offsetWidth / 2) + 'px';
    if (instant) { void bird.offsetWidth; bird.style.transition = ''; }
  }
  function questionLabel(s, q) {
    const n = LESSON.steps[s].questions.length;
    return `もんだい <b>${q + 1}</b> ／ ${n}`;
  }

  /* ---------- 部品 ---------- */
  const readBtn = () => `<button type="button" class="read-btn" data-act="read"><img src="${A('icon-read')}" alt="">よむ</button>`;
  const nextBtn = (label = 'つぎへ', hidden = true) =>
    `<button type="button" class="btn btn--primary next-btn" data-act="next"${hidden ? ' hidden' : ''}>${label}<img src="${A('icon-next')}" alt=""></button>`;
  const talk = (text, bird = 'bird') => `<div class="talk"><img src="${A(bird)}" alt=""><p>${ruby(text)}</p></div>`;
  const hintBox = (text) => `<div class="hint"><img src="${A('hint-bird')}" alt=""><p><span class="hint-title">ヒント</span>${ruby(text)}</p></div>`;
  const praiseBox = (text) => `<div class="praise"><img src="${A('bird-happy')}" alt=""><p>${ruby(text)}</p></div>`;
  const footer = (inner, btn = nextBtn()) =>
    `<footer class="footer"><div id="say" aria-live="polite" style="display:contents">${inner || '<div class="footer-spacer"></div>'}</div>${btn}</footer>`;
  function say(html) { const s = $('#say'); if (s) s.innerHTML = html; }
  function showNext(focus = true) {
    const b = $('.next-btn', screenEl); if (!b) return;
    b.hidden = false; if (focus) b.focus();
  }

  function choiceBtn(c, i, extraCls = '') {
    const pic = c.pic ? `<img class="choice-pic" src="${A(c.pic)}" alt="">` : '';
    const marks = (c.marks || []).length
      ? `<span class="choice-marks">${c.marks.map((m) => `<img class="choice-mark" src="${A(m)}" alt="${markAlt(m)}">`).join('')}</span>` : '';
    return `<button type="button" class="choice ${extraCls}" data-i="${i}"><span class="choice-key">${i + 1}</span>${marks}${pic}<span class="choice-text">${ruby(c.text)}</span></button>`;
  }
  function boxBtn(b, i) {
    return `<button type="button" class="choice sort-box sort-box--${b.look}" data-i="${i}"><span class="choice-key">${i + 1}</span>` +
      `<img class="choice-pic" src="${A(b.pic)}" alt=""><span class="sort-box-label"><b>${ruby(b.name)}</b><br>${ruby(b.text)}</span></button>`;
  }
  function markAlt(m) {
    return { 'mark-teacher': 'せんせいの マーク', 'mark-adult': 'おとなの マーク', 'mark-handup': 'てを あげる マーク',
      'mark-phone': 'れんらくの マーク', 'mark-stop': 'ストップの マーク' }[m] || '';
  }
  function setBadge(btn, text) {
    let b = $('.choice-badge', btn);
    if (!b) { b = document.createElement('span'); b.className = 'choice-badge'; btn.appendChild(b); }
    b.textContent = text;
  }

  // 問題・おてほんの「絵の場所」と「選択肢」の HTML
  function figureAndChoices(step, item, isDemo) {
    let fig = '', cho = '', before = '';
    if (step.kind === 'iceberg') {
      const warm = item.warm ? ' word-bubble--warm' : '';
      before = '<div class="iceberg" aria-hidden="true"></div>';
      fig = `<div class="figure figure--iceberg"><span class="water-label water-label--up">{水の 上}</span>` +
        `<p class="word-bubble${warm}">「${ruby(item.word)}」</p><span class="water-label water-label--down">{水の 下}</span></div>`;
      fig = fig.replace('{水の 上}', `${ruby('{水|みず}の {上|うえ}')}`).replace('{水の 下}', `${ruby('{水|みず}の {下|した}')}`);
      if (isDemo) {
        cho = `<div class="choices choices--1 choices--water" role="group" aria-label="きもちの カード">${choiceBtn(item.card, 0, 'is-locked demo-rise')}</div>`;
      } else {
        cho = `<div class="choices choices--2 choices--water" role="group" aria-label="きもちの カード">${item.choices.map((c, i) => choiceBtn(c, i)).join('')}</div>`;
      }
    } else if (step.kind === 'sort' && item.type !== 'choose') {
      const card = isDemo ? item.card : { text: item.card, pic: item.pic };
      fig = `<div class="figure"><div class="sort-card${isDemo ? '' : ' can-drag'}"><img src="${A(card.pic)}" alt=""><span>${ruby(card.text)}</span></div></div>`;
      cho = `<div class="choices choices--2" role="group" aria-label="はこ">${step.boxes.map((b, i) => boxBtn(b, i)).join('')}</div>`;
    } else if (step.kind === 'sort') {   // かかわる？ スルー？
      fig = `<div class="figure figure--goal"><div class="sort-card"><img src="${A(item.pic)}" alt=""><span>${ruby(item.card)}</span></div>` +
        `<div class="goal-card"><img src="${A('pic-clock')}" alt=""><span><b>${ruby(item.goal)}</b></span></div></div>`;
      cho = `<div class="choices choices--2" role="group" aria-label="こたえ">${item.choices.map((c, i) => choiceBtn(c, i)).join('')}</div>`;
    } else {   // scene
      const mark = item.mark ? `<img class="scene-mark" src="${A(item.mark)}" alt="${markAlt(item.mark)}">` : '';
      fig = `<div class="figure"><div class="scene"><img class="scene-pic" src="${A(item.pic)}" alt="">${mark}<p class="scene-text">${ruby(item.scene)}</p></div></div>`;
      cho = `<div class="choices choices--3" role="group" aria-label="こたえ">${item.choices.map((c, i) => choiceBtn(c, i, isDemo ? 'is-locked' : '')).join('')}</div>`;
    }
    if (isDemo && step.kind === 'sort') cho = cho.replace(/class="choice /g, 'class="choice is-locked ');
    return before + fig + cho;
  }
  function readOf(step, item, question) {
    let t = question + '。';
    if (step.kind === 'iceberg') t += `「${item.word}」。`;
    else if (step.kind === 'sort' && item.type !== 'choose') t += `カードは、${item.card.text || item.card}。` +
      step.boxes.map((b, i) => `${i + 1}、${b.name}、${b.text}。`).join('');
    else if (step.kind === 'sort') t += `${item.card}。${item.goal}。`;
    else t += `${item.scene}。`;
    const cs = item.choices || (item.card && item.card.text && step.kind === 'iceberg' ? [item.card] : null);
    if (cs && !(step.kind === 'sort' && item.type !== 'choose')) t += cs.map((c, i) => `${i + 1}、${c.text}。`).join('');
    return t;
  }

  function enterPlay(s) {
    stage.dataset.step = String(s + 1);
    call(M3D, 'setScene', 'play');
  }

  /* ---------- 画面: タイトル ---------- */
  const RENDER = {};
  RENDER.title = function () {
    stage.dataset.screen = 'title'; stage.dataset.step = '1';
    setProgress(null);
    call(M3D, 'setScene', 'title');
    const stops = LESSON.steps.map((st, i) =>
      `<li class="route-stop"><img src="${A(st.icon)}" alt=""><span class="route-stop-text">ステップ${i + 1}<br><span>${ruby(st.name)}</span></span></li>`).join('');
    screenEl.innerHTML =
      `<section class="title-screen">
        <div>
          <h1 class="title-main">${LESSON.title.map(ruby).join('<br>')}</h1>
          <p class="title-sub">${ruby(LESSON.sub)}</p>
          <p class="title-from">${ruby(LESSON.from)}</p>
        </div>
        <button type="button" class="btn btn--primary start-btn" data-act="start">はじめる<img src="${A('icon-next')}" alt=""></button>
        <ol class="route" aria-label="きょうの たび">
          <svg class="route-path" viewBox="0 0 964 936" preserveAspectRatio="none" aria-hidden="true"><path d="M30 930C60 860 80 780 96 696S220 520 306 456 450 300 496 206 640 70 760 60"/></svg>
          ${stops}
          <img class="title-bird" src="${A('bird')}" alt="">
        </ol>
      </section>`;
    readText = '';
    $('.start-btn', screenEl).focus();
  };

  /* ---------- 画面: おてほん ---------- */
  RENDER.demo = function ({ s }) {
    const step = LESSON.steps[s];
    stage.dataset.screen = 'demo';
    enterPlay(s);
    setProgress(s, 'おてほん', step.questions.length, 0, null);
    const d = step.demo;
    screenEl.innerHTML =
      `<div class="qband"><span class="tape">おてほん</span>${readBtn()}<h2 class="question">${ruby(step.question)}</h2></div>` +
      figureAndChoices(step, d, true) +
      footer(talk(d.talk1));
    readText = readOf(step, d, step.question) + d.talk1;
    const less = isLess();
    const finish = () => {
      say(talk(d.talk2, 'bird-happy'));
      readText = d.talk2;
      showNext();
    };

    if (step.kind === 'iceberg') {
      const card = $('.choice', screenEl);
      later(() => card.classList.add('is-up'), less ? 300 : 1400);
      later(() => { card.classList.add('is-correct'); drawLink(card); }, less ? 600 : 2300);
      later(finish, less ? 900 : 3000);
    } else if (step.kind === 'sort') {
      const target = $$('.choice', screenEl)[d.answer - 1];
      handPress(target, less ? 300 : 1200, () => {
        flyCard($('.sort-card', screenEl), target);
        target.classList.add('is-correct'); setBadge(target, 'せいかい');
      });
      later(finish, less ? 1200 : 3200);
    } else {
      const target = $$('.choice', screenEl)[d.answer - 1];
      handPress(target, less ? 300 : 1400, () => { target.classList.add('is-correct'); setBadge(target, 'せいかい'); });
      later(finish, less ? 1200 : 3200);
    }
  };

  // ゆびの カーソルが 動いて おす
  function handPress(target, delay, onPress) {
    const hand = document.createElement('img');
    hand.className = 'hand-cursor'; hand.src = A('hand-cursor'); hand.alt = '';
    const nb = toStage($('.footer', screenEl).getBoundingClientRect());
    hand.style.left = (nb.x + nb.w - 520) + 'px'; hand.style.top = (nb.y + 10) + 'px';
    stage.appendChild(hand);
    const r = toStage(target.getBoundingClientRect());
    later(() => { hand.style.left = (r.x + r.w / 2 - 43) + 'px'; hand.style.top = (r.y + r.h / 2 - 17) + 'px'; }, delay);
    if (!onPress) return hand;
    later(() => { hand.classList.add('is-press'); call(SND, 'play', 'tap'); }, delay + (isLess() ? 100 : 1000));
    later(() => { hand.classList.remove('is-press'); onPress(); }, delay + (isLess() ? 250 : 1250));
    return hand;
  }
  // ステップ1: ことばと カードを 点線で むすぶ
  function drawLink(card) {
    const bub = $('.word-bubble', screenEl); if (!bub) return;
    const b = toStage(bub.getBoundingClientRect()), c = toStage(card.getBoundingClientRect());
    const x1 = b.x + b.w / 2, y1 = b.y + b.h + 30, x2 = c.x + c.w / 2, y2 = c.y - 30;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'link-line'); svg.setAttribute('viewBox', '0 0 1920 1080');
    svg.setAttribute('width', '1920'); svg.setAttribute('height', '1080'); svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(ns, 'path');
    const my = (y1 + y2) / 2;
    p.setAttribute('d', `M${x1} ${y1} C${x1} ${my} ${x2} ${my} ${x2} ${y2}`);
    svg.appendChild(p); stage.appendChild(svg);
  }
  // ステップ2: カードが はこへ 入る
  function flyCard(card, box) {
    if (!card) return;
    const c = card.getBoundingClientRect(), b = box.getBoundingClientRect(), k = fitScale();
    const dx = ((b.left + b.width / 2) - (c.left + c.width / 2)) / k;
    const dy = ((b.top + b.height * .35) - (c.top + c.height / 2)) / k;
    card.classList.remove('is-dragging');
    card.classList.add('is-flying');
    card.style.transform = `translate(${dx}px, ${dy}px) scale(.35) rotate(0deg)`;
    card.style.opacity = '0';
  }

  /* ---------- 画面: せつめい（ステップ2 第5問の前） ---------- */
  RENDER.explain = function ({ s, q }) {
    const step = LESSON.steps[s], it = step.questions[q].intro;
    stage.dataset.screen = 'explain';
    enterPlay(s);
    setProgress(s, questionLabel(s, q), step.questions.length, q, q);
    screenEl.innerHTML =
      `<section class="sheet"><span class="tape">せつめい</span>
        <img class="sheet-pic" src="${A(it.pic)}" alt="">
        <div class="sheet-body">
          <div class="sheet-head">${readBtn()}<h2 class="sheet-title">${ruby(it.title)}</h2></div>
          <p class="sheet-text">${ruby(it.text)}</p>
          <div class="goal-card"><img src="${A('pic-clock')}" alt=""><span><b>${ruby(step.questions[q].goal)}</b></span></div>
        </div>
      </section>` + footer(talk('めあてカードを よく {見|み}てね'), nextBtn('つぎへ', false));
    readText = it.text + '。' + step.questions[q].goal;
    $('.next-btn', screenEl).focus();
  };

  /* ---------- 画面: もんだい ---------- */
  RENDER.q = function ({ s, q }) {
    const step = LESSON.steps[s], item = step.questions[q];
    stage.dataset.screen = 'question';
    enterPlay(s);
    setProgress(s, questionLabel(s, q), step.questions.length, q, q);
    const question = item.question || step.question;
    screenEl.innerHTML =
      `<div class="qband">${readBtn()}<h2 class="question">${ruby(question)}</h2></div>` +
      figureAndChoices(step, item, false) +
      footer('');
    readText = readOf(step, item, question);

    const st = { wrong: 0, done: false, guided: false, lastWrong: -1 };
    const btns = $$('.choice', screenEl);
    keyChoices = btns;
    btns.forEach((b) => b.addEventListener('click', () => answer(Number(b.dataset.i))));
    if (step.kind === 'sort' && item.type !== 'choose') enableDrag($('.sort-card', screenEl), btns, answer);
    $('.read-btn', screenEl).focus();

    function answer(i) {
      if (st.done) return;
      const btn = btns[i];
      if (!btn || btn.classList.contains('is-out') || btn.classList.contains('is-locked')) return;
      const correct = (i === item.answer - 1);
      if (correct) return onCorrect(btn);
      onWrong(btn, i);
    }

    function onCorrect(btn) {
      st.done = true;
      stopSpeak();
      $$('.is-retry, .is-hinted, .is-guide, .is-bigger', screenEl).forEach((n) => n.classList.remove('is-retry', 'is-hinted', 'is-guide', 'is-bigger'));
      $$('.choice-badge', screenEl).forEach((n) => n.remove());
      btns.forEach((b) => b.classList.add('is-locked'));
      btn.classList.add('is-correct');
      setBadge(btn, 'せいかい');
      $$('.hand-cursor', stage).forEach((n) => n.remove());
      if (step.kind === 'iceberg') drawLink(btn);
      if (step.kind === 'sort' && item.type !== 'choose') flyCard($('.sort-card', screenEl), btn);
      const r = btn.getBoundingClientRect();
      call(M3D, 'celebrate', r.left + r.width / 2, r.top + r.height / 2);
      call(SND, 'play', 'correct');
      // とぶ みち: ○に チェック、鳥が つぎの○へ
      const dots = $$('.flightpath-dot', $('#flightpath'));
      if (dots[q]) { dots[q].classList.remove('is-now'); dots[q].classList.add('is-done'); }
      if (dots[q + 1]) dots[q + 1].classList.add('is-now');
      moveBird(Math.min(q + 1, dots.length - 1));
      const text = (st.guided ? LESSON.words.gotIt : '') + item.praise;
      say(praiseBox(text));
      readText = text;
      showNext();
    }

    function onWrong(btn, i) {
      st.wrong++;
      call(M3D, 'encourage');
      call(SND, 'play', 'retry');
      const correctBtn = btns[item.answer - 1];
      const two = btns.length <= 2;
      $$('.is-hinted', screenEl).forEach((n) => n.classList.remove('is-hinted'));

      if (st.wrong === 1) {
        btn.classList.add('is-retry'); setBadge(btn, 'もういちど');
        lookTargets().forEach((n) => n.classList.add('is-hinted'));
        say(talk(LESSON.words.retry1, 'bird-tilt'));
        readText = LESSON.words.retry1;
      } else if (st.wrong === 2) {
        btn.classList.add('is-retry'); setBadge(btn, 'もういちど');
        if (two) {
          // 2つの ときは しぼらずに、ヒントの ことばと 絵の 強調
          if (step.kind === 'sort' && item.type !== 'choose') {
            correctBtn.classList.remove('is-wiggle'); void correctBtn.offsetWidth;
            correctBtn.classList.add('is-wiggle');
            later(() => correctBtn.classList.remove('is-wiggle'), 1000);
            lookTargets().forEach((n) => n.classList.add('is-hinted'));
          } else {
            correctBtn.classList.add('is-hinted');
            if (step.kind === 'iceberg') correctBtn.classList.add('is-bigger');
            lookTargets().forEach((n) => n.classList.add('is-hinted'));
          }
        } else {
          // 3つの ときは 2つに しぼる
          btn.classList.remove('is-retry'); outBtn(btn);
          lookTargets().forEach((n) => n.classList.add('is-hinted'));
          moveFocusFrom(btn);
        }
        say(hintBox(item.hint));
        readText = 'ヒント。' + item.hint;
      } else {
        st.guided = true;
        btns.forEach((b, k) => {
          if (k !== item.answer - 1) { b.classList.remove('is-retry'); outBtn(b); }
        });
        correctBtn.classList.remove('is-bigger', 'is-hinted');
        correctBtn.classList.add('is-guide');
        say(talk(LESSON.words.together, 'bird'));
        readText = LESSON.words.together;
        $$('.hand-cursor', stage).forEach((n) => n.remove());
        handPress(correctBtn, 50, null);
        correctBtn.focus();
      }
      st.lastWrong = i;
    }

    // 候補から 外す: うすくして 押せなくし、「もういちど」の札も とる
    function outBtn(b) {
      b.classList.add('is-out'); b.setAttribute('aria-disabled', 'true'); b.tabIndex = -1;
      const badge = $('.choice-badge', b); if (badge) badge.remove();
    }
    // 外したカードに フォーカスが のこらないように、のこっている 選択肢（なければ よむ）へ
    function moveFocusFrom(b) {
      if (document.activeElement !== b && document.activeElement !== document.body) return;
      const next = btns.find((x) => !x.classList.contains('is-out')) || $('.read-btn', screenEl);
      if (next) next.focus();
    }

    // 1回目に まちがえた ときに 目立たせる「絵の 大事な ところ」
    function lookTargets() {
      if (step.kind === 'iceberg') return $$('.choice-pic', screenEl);
      if (step.kind === 'sort' && item.type !== 'choose') return $$('.sort-card img', screenEl);
      if (step.kind === 'sort') return $$('.goal-card', screenEl);
      const t = $$('.choice-mark, .warn-line, .scene-mark', screenEl);
      return t.length ? t : $$('.scene-pic', screenEl);
    }
  };

  // ステップ2: カードを はこへ ドラッグ（クリックでも 同じ ことが できる）
  function enableDrag(card, boxes, answer) {
    if (!card) return;
    let start = null;
    card.addEventListener('pointerdown', (e) => {
      if (card.classList.contains('is-flying')) return;
      start = { x: e.clientX, y: e.clientY, moved: false };
      try { card.setPointerCapture(e.pointerId); } catch (err) {}
    });
    card.addEventListener('pointermove', (e) => {
      if (!start) return;
      const k = fitScale(), dx = (e.clientX - start.x) / k, dy = (e.clientY - start.y) / k;
      if (!start.moved && Math.hypot(dx, dy) < 10) return;
      start.moved = true;
      card.classList.add('is-dragging');
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(0deg)`;
    });
    const end = (e) => {
      if (!start) return;
      const moved = start.moved; start = null;
      card.classList.remove('is-dragging');
      if (!moved) return;
      const hit = boxes.findIndex((b) => {
        const r = b.getBoundingClientRect();
        return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      });
      card.style.transform = '';
      if (hit >= 0 && !boxes[hit].classList.contains('is-out')) answer(hit);
    };
    card.addEventListener('pointerup', end);
    card.addEventListener('pointercancel', end);
  }

  /* ---------- 画面: ステップクリア ---------- */
  RENDER.clear = function ({ s }) {
    const step = LESSON.steps[s];
    stage.dataset.screen = 'clear';
    enterPlay(s);
    const n = step.questions.length;
    setProgress(s, 'クリア', n, n, null);
    screenEl.innerHTML =
      `<section class="sheet">
        <div class="stamp" aria-hidden="true"></div>
        <div class="sheet-body">
          <div class="sheet-head">${readBtn()}<h2 class="sheet-title">ステップ${s + 1} クリア</h2></div>
          <p class="sheet-text">${ruby(step.clear)}</p>
        </div>
      </section>` +
      footer(talk('スタンプを もらったよ', 'bird-happy'), nextBtn(s + 1 < LESSON.steps.length ? 'つぎへ' : 'ふりかえり'));
    readText = `ステップ${s + 1} クリア。` + step.clear;
    const t = token;
    call(SND, 'play', 'clear');
    // スタンプの絵を 先に入れておく（3D があれば「ドン」の瞬間まで 3D がかくす）
    const stamp = $('.stamp', screenEl);
    stamp.innerHTML = `<img src="${A('stamp-' + (s + 1))}" alt="スタンプ">`;
    stamp.setAttribute('aria-hidden', 'false');
    let p;
    try { p = M3D.stepClear(s + 1); } catch (e) { p = null; }
    // 3D が無い・動かない（false が返る）ときは CSS の スタンプを「ポン」と出す
    if (M3D.__stub || !p) stamp.classList.add('is-pressed');
    Promise.race([Promise.resolve(p).catch(() => false), sleep(3000).then(() => 'timeout')]).then((r) => {
      if (t !== token) return;
      if (r === false && !stamp.classList.contains('is-pressed')) stamp.classList.add('is-pressed');
      showNext();
    });
  };

  /* ---------- 画面: ふり返り ---------- */
  RENDER.reflect = function () {
    stage.dataset.screen = 'reflect'; stage.dataset.step = '1';
    setProgress(null);
    const rows = LESSON.steps.slice(0, 3).map((st, i) =>
      `<li class="reflect-row"><img class="reflect-pic" src="${A(st.reflect.pic)}" alt="">` +
      `<span class="reflect-text">${ruby(st.reflect.text)}</span>` +
      `<span class="stamp-slot"><img src="${A('stamp-' + (i + 1))}" alt="スタンプ"></span></li>`).join('');
    screenEl.innerHTML =
      `<section class="reflect"><h2 class="reflect-title">${ruby(LESSON.words.reflectTitle)}</h2><ul class="reflect-list">${rows}</ul></section>` +
      `<footer class="footer"><div class="talk" aria-live="polite"><img src="${A('bird-happy')}" alt=""><p class="reflect-last">${ruby(LESSON.words.reflectLast)}</p></div>` +
      `<button type="button" class="btn btn--sub" data-act="again"><img src="${A('icon-again')}" alt="">もういちど</button>` +
      `<button type="button" class="btn btn--primary" data-act="end">おわる</button></footer>`;
    readText = plain(LESSON.words.reflectTitle) + '。' + LESSON.steps.map((st) => st.reflect.text).join('。') + '。' + LESSON.words.reflectLast;
    call(M3D, 'setScene', 'result');
    call(SND, 'play', 'clear');
    $('[data-act="again"]', screenEl).focus();
  };

  /* ---------- つぎへ の 行き先 ---------- */
  function nextOf(cur) {
    const steps = LESSON.steps;
    if (cur.name === 'title') return { name: 'demo', s: 0 };
    if (cur.name === 'demo') return qOrIntro(cur.s, 0);
    if (cur.name === 'explain') return { name: 'q', s: cur.s, q: cur.q };
    if (cur.name === 'q') {
      if (cur.q + 1 < steps[cur.s].questions.length) return qOrIntro(cur.s, cur.q + 1);
      return { name: 'clear', s: cur.s };
    }
    if (cur.name === 'clear') return cur.s + 1 < steps.length ? { name: 'demo', s: cur.s + 1 } : { name: 'reflect' };
    return { name: 'title' };
  }
  function qOrIntro(s, q) {
    return LESSON.steps[s].questions[q].intro ? { name: 'explain', s, q } : { name: 'q', s, q };
  }

  /* ---------- ボタンと キーボード ---------- */
  stage.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'start') {
      call(SND, 'start'); call(SND, 'setMuted', settings.muted);
      call(SND, 'play', 'tap');
      history = [];
      go({ name: 'demo', s: 0 });
    } else if (act === 'next') {
      call(SND, 'play', 'tap');
      go(nextOf(current));
    } else if (act === 'read') {
      speak(readText);
    } else if (act === 'again') {
      call(SND, 'play', 'tap');
      history = [];
      go({ name: 'demo', s: 0 }, false);
    } else if (act === 'end') {
      call(SND, 'play', 'tap');
      call(SND, 'stop');
      history = [];
      go({ name: 'title' }, false);
    }
  });
  $('#btnSound').addEventListener('click', () => {
    settings.muted = !settings.muted; save(); applySettings();
    if (!settings.muted) call(SND, 'play', 'tap');
  });
  $('#btnMotion').addEventListener('click', () => {
    call(SND, 'play', 'tap');
    settings.less = !settings.less; save(); applySettings();
  });
  $('#btnBack').addEventListener('click', back);

  document.addEventListener('keydown', (e) => {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 4 && keyChoices) {
      const b = keyChoices[n - 1];
      if (b && !b.classList.contains('is-out') && !b.classList.contains('is-locked')) {
        e.preventDefault(); b.focus(); b.click();
      }
    }
  });

  /* ---------- はじまり ---------- */
  const ok3d = call(M3D, 'init', document.getElementById('stage3d'), {
    theme: { paper: '#fffdf8', ink: '#2d3b4e', kokoro: '#3f6fb0', kotoba: '#d9782d', kurashi: '#3f8f5f',
      shu: '#b8462a', hint: '#e8c95b', rule: '#9fb0c4' },
  });
  if (ok3d === true || M3D.isAvailable === true) stage.classList.add('has-3d');
  applySettings();
  go({ name: 'title' }, false);
})();
