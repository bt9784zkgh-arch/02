// ワークシート組み立て: data.json（worksheet-plan.md から機械的に取り出した中身）→ worksheet.html
const fs = require('fs');
const OUT = '/home/user/02/output/kotoba-jiten/worksheet/';
const ROOT = '/home/user/02/output/kotoba-jiten/';
const D = require('./data.json');
const sprite = fs.readFileSync(__dirname + '/sprite.svg', 'utf8');
const css = fs.readFileSync(__dirname + '/worksheet.css', 'utf8');
const teacher = fs.readFileSync(__dirname + '/teacher.html', 'utf8');

// {漢字|よみ} → ruby、**太字** → なぞる字。
// 分かち書きのスペースでだけ折り返すよう、ことばのまとまりを .w（折り返さない）で包む
const ruby = t => t.replace(/\{([^|}]+)\|([^}]+)\}/g, '<ruby>$1<rt>$2</rt></ruby>');
const rb = s => {
  let soft = false;
  return s.split(' ').map(tok => {
    let h = soft ? '<span class="soft">' : '';
    tok.split('**').forEach((part, i) => {
      if (i > 0) { h += soft ? '</span>' : '<span class="soft">'; soft = !soft; }
      h += ruby(part);
    });
    if (soft) h += '</span>';
    // 句読点・中点のあとは、ことばの切れ目として折り返してよい
    h = h.replace(/([、。・])(?!$)/g, '$1</span><wbr><span class="w">');
    return `<span class="w">${h}</span>`;
  }).join(' ');
};
const plainLen = t => t.replace(/\{([^|}]+)\|[^}]+\}/g, '$1').replace(/\*\*| /g, '').length;
const txt = (t, extra = '') => `<span class="txt${plainLen(t) >= 17 ? ' is-long' : ''}${extra}">${rb(t)}</span>`;
const longWord = t => Math.max(...t.replace(/\{([^|}]+)\|[^}]+\}/g, '$1').replace(/\*\*/g, '').split(' ').map(w => w.length)) >= 10;
const stack = t => longWord(t) ? ' is-stack' : '';
const used = new Set();
const mo = (id, cls = '') => { used.add(id); return `<svg class="mo ${cls}" aria-hidden="true"><use href="#${id}"/></svg>`; };
const art = (a, cls = '') => `<span class="art ${cls}">${mo(a[0], 'mo--main')}${a[1] ? mo(a[1], 'mo--sub') : ''}</span>`;
const cloud = (t, cls = '') => `<span class="cloud ${cls}">${rb(t)}</span>`;

// 手描き風のゆれた横線（区切り）。seed ごとに少しずつちがう
function wobble(seed, w = 1000, h = 8) {
  let r = seed * 9301 + 49297; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  let d = `M2 ${h / 2 + (rnd() - .5) * 2}`;
  for (let x = 60; x <= w - 2; x += 60) d += ` Q${x - 30} ${h / 2 + (rnd() - .5) * 4.2} ${Math.min(x, w - 2)} ${h / 2 + (rnd() - .5) * 2}`;
  d += ` Q${w - 20} ${h / 2 + (rnd() - .5) * 3} ${w - 2} ${h / 2 + (rnd() - .5) * 2}`;
  return `<svg class="rule" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d}"/></svg>`;
}
const head = (num, text, extra = '') =>
  `<div class="sec-head">${num ? `<span class="num"><small>もんだい</small><b>${num}</b></span>` : ''}<h3 class="inst">${rb(text)}</h3>${extra}</div>`;

const ROAD = ['はじめに', '1', '2', '3', '4', 'おわりに'];

function sheet(s) {
  const k = s.n;
  const bk = `--book:${s.color}`;
  const imi = s.imi.replace(/（太字の所.*?）/, '');
  // --- 見出し
  const header = `
  <header class="ws-head">
    <div class="spine" style="${bk}"><div class="slip"><span class="slip-word">${rb(s.trace)}</span></div></div>
    <div class="head-body">
      <div class="head-row">
        <p class="ws-title">ことばの じてん ワークシート<span class="stage-no">ステージ ${k}</span></p>
        <p class="name"><ruby>名前<rt>なまえ</rt></ruby><span class="name-line"></span></p>
      </div>
      <div class="head-row">
        <ol class="road" aria-label="見通し">
          ${ROAD.map((r, i) => `<li><span class="road-l">${r}</span><span class="ring"></span></li>`).join('<li class="arrow" aria-hidden="true">→</li>')}
        </ol>
        <p class="road-note">おわったら 〇</p>
      </div>
    </div>
  </header>`;
  // --- はじめに
  const sample = s.sample ? `
      <div class="sample">
        <div class="card card--mini">${art(s.sample.art)}<span class="txt">${rb(s.sample.text)}</span>${cloud(s.sample.cloud, 'cloud--sample')}</div>
        <p class="sample-note">${rb(s.sample.note)}</p>
      </div>` : '';
  const intro = `
  <section class="sec RULE intro">
    <div class="intro-main">
      <div class="trace-row">
        <div class="sec-head sec-head--stack"><span class="tab">はじめに</span><h3 class="inst">ことばを なぞろう</h3></div>
        <p class="trace${s.traceSmall ? ' trace--long' : ''}">${rb(s.trace)}</p>
      </div>
      <div class="imi-wrap${s.sample ? ' has-sample' : ''}">
        <p class="inst inst--sub">いみを <ruby>読<rt>よ</rt></ruby>もう。うすい <ruby>字<rt>じ</rt></ruby>も なぞろう</p>
        <p class="imi">${rb(imi)}</p>${sample}
      </div>
    </div>
    <div class="nakama">
      <p class="nakama-title">3つの なかま</p>
      <ul>${s.nakama.map((n, i) => `<li class="nk-${i + 1}">${mo('m-nk-' + (i + 1), 'nk-mark')}${art(n.art, 'art--nk')}<span>${rb(n.label)}</span></li>`).join('')}</ul>
    </div>
  </section>`;
  // --- もんだい1
  const m1 = `
  <section class="sec RULE m1">
    ${head(1, '{合|あ}う カードに 〇を つけよう', '<p class="aside">〇は ぜんぶで 4こ。1こは れいです</p>')}
    <ul class="grid6">${s.m1.map(c => `
      <li class="card${c.rei ? ' is-rei' : ''}"><span class="key">${c.pos}</span>${art(c.art)}${txt(c.text)}${c.rei ? '<svg class="rei-ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="1" y="2" width="98" height="96" rx="16" ry="42"/></svg><span class="rei-tag">れい</span>' : ''}</li>`).join('')}
    </ul>
  </section>
  <div class="fold"><p class="hint">${mo('m-bulb', 'hint-ic')}ヒント: 「はじめに」の いみを もういちど <ruby>見<rt>み</rt></ruby>よう</p><i aria-hidden="true"></i><span aria-hidden="true">おりせん</span></div>`;
  // --- もんだい2（左＝ばめん、右＝行動、点を向かい合わせ）
  const R = ['ア', 'イ', 'ウ'];
  const rei = s.m2.find(r => r.rei);
  const y1 = s.m2.indexOf(rei), y2 = R.indexOf(rei.ans);
  const m2 = `
  <section class="sec RULE m2" style="${bk}">
    ${head(2, 'こんな ときは どうする？ {線|せん}で むすぼう', '<p class="aside">1は れいです。<ruby>点線<rt>てんせん</rt></ruby>を なぞろう</p>')}
    <div class="match">
      <ul class="m2-left">${s.m2.map(r => `<li class="scene"><span class="key">${r.lk}</span>${art(r.lart, 'art--s')}${txt(r.ltext)}<i class="dot"></i></li>`).join('')}</ul>
      <div class="m2-mid"><svg class="m2-lines" viewBox="0 0 100 300" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="${y1 * 100 + 50}" x2="100" y2="${y2 * 100 + 50}"/></svg></div>
      <ul class="m2-right">${s.m2.map(r => `<li class="card card--act"><i class="dot"></i><span class="key">${r.rk}</span>${art(r.rart, 'art--s')}${txt(r.rtext)}</li>`).join('')}</ul>
    </div>
  </section>`;
  // --- もんだい3
  const m3 = `
  <section class="sec RULE m3" style="${bk}">
    ${head(3, '{自分|じぶん}なら どうする？ 1つに 〇', `<p class="hint hint--head">${mo('m-bulb', 'hint-ic')}ヒント: ${rb(s.m3.hint)}</p>`)}
    <div class="m3-body">
      <div class="scene scene--m3">${art(s.m3.art, 'art--s')}<span class="txt">${rb(s.m3.scene)}</span>${s.m3.cloud ? cloud(s.m3.cloud, 'cloud--scene') : ''}</div>
      <ul class="row3">${s.m3.opts.map(c => `<li class="card${stack(c.text)}"><span class="key">${c.pos}</span>${art(c.art)}${txt(c.text)}</li>`).join('')}</ul>
    </div>
  </section>`;
  // --- もんだい4
  const m4 = `
  <section class="sec RULE m4">
    ${head(4, '{自分|じぶん}の ことを 1つ {書|か}こう', `${mo('m-pen', 'inst-ic')}<p class="aside aside--rei">れい: ${rb(s.m4.rei)}（した）</p>`)}
    <div class="write"><span class="write-line"></span><span class="write-side">${s.m4.extra ? `<span class="extra">${rb(s.m4.extra)}</span>` : ''}<span class="write-end">（ した ・ して みたい ）</span></span></div>
    <p class="m4-note"><ruby>書<rt>か</rt></ruby>けない ときは、<ruby>下<rt>した</rt></ruby>の カードから <ruby>選<rt>えら</rt></ruby>ぼう。<ruby>写<rt>うつ</rt></ruby>しても、〇を つけるだけでも いい</p>
    <ul class="row3 row3--m4">${s.m4.cards.map((c, i) => `<li class="card card--m4">${art(c.art)}<span class="txt">${rb(c.text)}</span></li>`).join('')}</ul>
  </section>`;
  // --- おわりに
  const faces = [['m-p-smile'], ['m-p-student'], ['m-p-student', 'm-question']];
  const faceL = ['よく わかった', 'だいたい わかった', 'もっと {知|し}りたい'].map(rb);
  const end = `
  <section class="sec RULE end">
    <h3 class="inst inst--end"><span class="tab">おわりに</span> きょうの <ruby>自分<rt>じぶん</rt></ruby>は どれ？ 1つに 〇</h3>
    <ul class="faces">${faces.map((f, i) => `<li><span class="face">${art(f, 'art--face')}</span><span class="face-l">${faceL[i]}</span></li>`).join('')}</ul>
    <div class="teacher-box"><span><ruby>先生<rt>せんせい</rt></ruby>から</span></div>
    <p class="ws-foot">${GUIDE_SVG}<span>${rb('まちがえても だいじょうぶ。こまったら 「{教|おし}えて」と {言|い}おう')}</span></p>
  </section>`;

  let ri = 0;
  const html = `
<article class="sheet sheet--student" id="stage-${k}" style="${bk}" aria-label="ステージ${k} ワークシート">
  ${header}${intro}${m1}${m2}${m3}${m4}${end}
</article>`;
  return html.replace(/<section class="sec RULE ([^"]*)"([^>]*)>/g, (m, c, a) => `<section class="sec ${c}"${a}>${wobble(k * 7 + (++ri))}`);
}

// 字の入った SVG は <img> にすると同梱フォントが使えないので、インラインで入れて書体名を差しかえる
const inlineSvg = (f, cls, label) => fs.readFileSync(ROOT + 'assets/' + f, 'utf8')
  .replace(/<title>[^<]*<\/title>/, '')
  .replace(/role="img"/, label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"')
  .replace(/ width="\d+" height="\d+"/, ` class="${cls}"`)
  .replace(/'Klee One','Zen Maru Gothic',serif/g, "'Klee WS','Klee One',serif")
  .replace(/'Zen Maru Gothic',sans-serif/g, "'Zen Maru WS','Zen Maru Gothic',sans-serif");
const GUIDE_SVG = inlineSvg('guide-point.svg', 'guide');
const CLOUD = 'data:image/svg+xml;base64,' + fs.readFileSync(ROOT + 'assets/thought-cloud.svg').toString('base64');
const STAMP_SVG = inlineSvg('stamp-dekita.svg', 't-stamp', 'できた の はんこ');

const sheets = D.map(sheet).join('\n');
const teacherHtml = teacher.replace('<img class="t-stamp" src="{{STAMP}}" alt="できた の はんこ">', STAMP_SVG);
// 使った絵だけをスプライトから取り出す（file:// でも外部ファイルなしで描ける）
const symbols = [...used].map(id => {
  const m = sprite.match(new RegExp(`<symbol id="${id}"[\\s\\S]*?</symbol>`));
  if (!m) throw new Error('no symbol ' + id); return m[0];
}).join('');

const html = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ことばの じてん ワークシート</title>
<style>
${css.replace('{{CLOUD}}', CLOUD)}
</style>
</head>
<body>
<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">${symbols}</svg>
<p class="screen-note">このファイルは そのまま <b>印刷</b>（A4たて・倍率100%・「背景のグラフィック」をオン）できます。1〜8まいめが 生徒用、9まいめが 先生用の こたえ・つかいかたメモです。</p>
${sheets}
${teacherHtml}
</body>
</html>`;
fs.writeFileSync(OUT + 'worksheet.html', html);
console.log('ok', html.length, 'symbols', used.size);
