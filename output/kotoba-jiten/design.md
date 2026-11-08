# デザイン設計書 — ことばの じてんを つくろう

02 デザイン担当（art-director）。元: `lesson-plan.md`。実装: `style.css`・`assets/`・`fonts/`。

---

## 1. テーマ: 「図書室の手製本」

生徒は図書室の机で、自分だけの **布張りの辞書** を作っていく。例の行動は **図書カード**（上に色帯のある紙のカード）で、正解すると朱の **二重まる** が押され、辞書の **ページのマス** に入る。8つの言葉は本だなに並んだ **8さつの布の本**。読み終えた本には **布のしおりひも** と「できた」の **はんこ**。案内役は **図書委員の先輩「しおりさん」**。

- 中学生向けに、子どもっぽいシール・キャラクター・原色は使わない。布・紙・木・朱肉という、図書室にある本物の素材の色と手ざわりだけで作る。
- 目立たせるのは1か所だけ: **「せいかいの二重まる」と「ページのマスがうまる」こと**。ほかは静かにする。
- 使わないもの: 紫〜青のグラデーション、ネオン、すりガラス、絵文字（「🔈」も使わず、自作のスピーカーの絵を使う）、どこも同じ角丸と影のカードの並び。
- 角の丸みは役わりで変える: 紙の帯 2px／図書カード 6px／押すボタン 16px／本 4px・14px（背が四角、小口が丸い）。

---

## 2. 色

### 基本（4色＋背景）
| トークン | 色 | 使う所 |
|---|---|---|
| `--desk` | `#D8DBCD` | 背景（机の上の麻布。細かい目をCSSで描く） |
| `--paper` | `#FBF8F1` | 紙: カード・帯・ページ・ボタン |
| `--ink` | `#263040` | 藍墨: 文字・線・押すボタンの影 |
| `--accent` | `#A23B2E` | 朱: せいかいの二重まる・はんこ・しおりひも **だけ** |
| `--press` | `#2F4668` | 紺の布: いちばん押してほしいボタン（はじめる・つぎへ） |

補助: `--paper-2 #F1EDE1`（古い紙・空きマス）、`--ink-soft #4B5563`（ふりがな・補助の文字）、`--rule #E2DACA`（カードの罫線）、`--focus #1D4E89`（キーボードの枠）、`--hint #EBCB6B`（ヒントのやわらかい光）、`--tape`（マスキングテープ）、`--wood #7B5737`／`--wood-dark #5A3E26`／`--wood-back #43301F`（本だな）、`--jiten-cloth #3E4E5E`（「ことばの じてん」の表紙）。

### なかま（全ステージ共通の3色）— 色と **形** の両方で分ける
| なかま | 形 | 面 `--nkN` | 線 `--nkN-line` | 文字 `--nkN-ink` | うすい面 `--nkN-tint` | 絵のID |
|---|---|---|---|---|---|---|
| だいだい | まる ● | `#D08A3E` | `#B4691F` | `#8A4B12` | `#F7E6D2` | `m-nk-1` |
| みどり | さんかく ▲ | `#6E9A55` | `#5B8A45` | `#3E6630` | `#E3EDD9` | `m-nk-2` |
| みずいろ | しかく ◆ | `#5C97BA` | `#3F7FA6` | `#2D5F7F` | `#DCEBF3` | `m-nk-3` |

クラス `.nk-1` `.nk-2` `.nk-3` をつけると `--nk` `--nk-line` `--nk-ink` `--nk-tint` が入る。ステージごとの「なかま名」は lesson-plan の表のとおり（例: ステージ1 = 人・生き物／物／自分）。

### 8さつの本（布の色）
本の文字は、かならず紙の **題簽（だいせん。白いラベル）** の上に書く。布の色は見分けのための飾り。
| ステージ | 言葉 | クラス | 色 | 色の名前 |
|---|---|---|---|---|
| 1 | 大切にする | `.bk-1` | `#9C3F35` | 茜 |
| 2 | やさしくする | `.bk-2` | `#B8873A` | 山吹茶 |
| 3 | 思いやり | `.bk-3` | `#6F6A92` | 藤鼠 |
| 4 | 「ありがとう」を伝える | `.bk-4` | `#4E8060` | 若竹 |
| 5 | 申し訳ない | `.bk-5` | `#59636F` | 鈍色 |
| 6 | 協力する | `.bk-6` | `#8E5B3A` | 柿渋 |
| 7 | 責任を持つ | `.bk-7` | `#2F4668` | 紺 |
| 8 | 信頼する | `.bk-8` | `#3E7C7A` | 青磁 |

`.bk-N` は `--book` を入れるだけ。布の見た目は `.cloth` と組み合わせる（`class="cloth bk-3"`）。

### コントラスト（WCAG AA を確認ずみ）
| 文字／線 | 背景 | 比 | 基準 |
|---|---|---|---|
| ink | paper | 12.5 | 4.5 |
| ink | desk | 9.5 | 4.5 |
| ink-soft（ふりがな） | paper／paper-2 | 7.1／6.5 | 4.5 |
| ink-soft（ふりがな） | なかまのうすい面 | 6.2 | 4.5 |
| nk-ink（なかま名） | なかまのうすい面 | 5.5〜5.6 | 4.5 |
| ink（マスの文） | なかまのうすい面 | 10.9〜11.0 | 4.5 |
| accent（はんこの字） | paper | 6.2 | 4.5 |
| paper（ボタンの字） | press | 9.0 | 4.5 |
| nk-line（マスのわく） | paper／tint | 3.8〜4.1／3.5 | 3.0（線） |
| focus（フォーカス枠） | paper／desk | 7.9／6.0 | 3.0（線） |
| 想像のふきだしの線 `#5E5A80` | 白 | 6.5 | 3.0（線） |

---

## 3. 文字

| 役わり | 書体 | 太さ | 大きさ（基準1920×1080） |
|---|---|---|---|
| 本文・問題・カード・ボタン | **Zen Maru Gothic**（丸ゴシック） | 500／700 | 本文30・カード32・問題44・ボタン28〜40 |
| 見出し・本の題・想像のふきだし・はんこ | **Klee One**（手書きの教科書体） | 600 | 見出し56・表紙88・本の題32 |

- `fonts/` に同梱（OFL。ライセンス文も同梱）。JIS第1水準の漢字＋かな＋lesson-plan に出る全部の字にしぼった woff2。先生が第2水準の漢字を足しても、その字だけ端末のフォントで出る。
  - `fonts/ZenMaruGothic-Medium.subset.woff2`／`ZenMaruGothic-Bold.subset.woff2`／`KleeOne-SemiBold.subset.woff2`
- 代わりの書体: Hiragino Maru Gothic ProN → BIZ UDPGothic → Meiryo（`--font-body`・`--font-head` に指定ずみ）。
- サイズトークン: `--fs-display 88`・`--fs-h1 56`・`--fs-question 44`・`--fs-card 32`・`--fs-feedback 34`・`--fs-body 30`・`--fs-ui 28`（最小）。行間は `--lh 1.75`（ふりがなが入っても1.6以上）。
- 大文字ラベルや「— 」でつなぐ見出しなど、テンプレートっぽい組み方はしない。見出しは左寄せ。

### ふりがな（ruby）
- `{漢字|かんじ}` → `<ruby>漢字<rt>かんじ</rt></ruby>` に変換する（ゲーム組立担当）。分かち書きの半角スペースはそのまま残す（読みやすさのため）。
- 見え方: `rt` は親の **0.5倍**、色 `--ink-soft`、太さ500、上に置く（`ruby-position: over`）。紺のボタンの上では `#DCE3EC`。
- 本だなの題簽・ステージ表紙も同じ。行間は `--lh` 以上なので、ふりがなが上の行にぶつからない。

### カードの文の2行の決まり（20字前後のカード）
lesson-plan の注意点「カードの中で2行に分けるとよい」への答え。
1. 文字数は「ふりがなを除いた、表示される字」（スペースは数えない）で数える。
2. **図書カード（選択肢）: 12字まで1行。13字以上は2行**。**じてんのマス: 10字まで1行。11字以上は2行**。
3. 2行にするときは、**分かち書きのスペースのうち、字数がいちばん半分に近い所** に `<br>` を入れ、要素に `.is-2line` をつける。ことばの途中（ruby の中・スペースのない所）では切らない。
   - 例: SH15「知らない 人からの 連絡は ／ 家の 人に 相談する」、OM01「家族が 寝ているので ／ 音を 小さくする」
4. 3行にはしない。2行にしても1行が15字（マスは12字）をこえるときだけ `.is-long`（カード30px）。lesson-plan のカードではおきない。
5. CSS の保険: `.wakachi`／`.card__text`／`.masu__text` は `word-break: keep-all`（スペースでだけ折り返す）＋ `text-wrap: balance`。

---

## 4. 画面の大きさ（16:9）

- すべての画面は **1920×1080 の固定の舞台 `.stage`** に置き、画面に合わせて **まるごと拡大縮小** する（配置はくずれない）。1280×720 では 0.667倍。学校のPC（1366×768／1920×1080）は全画面（F11）がおすすめ。
- 組立担当は、次の数行を `game.js` に入れる:
```js
function fitStage(){ const k = Math.min(innerWidth/1920, innerHeight/1080);
  document.getElementById('stage').style.setProperty('--stage-scale', k); }
addEventListener('resize', fitStage); fitStage();
```
- まわりの余白は `--desk-deep`。

---

## 5. 画面の骨組み（全画面共通）

```
<body>
  <script src="assets/motifs.js"></script>         ← 絵のスプライトを <body> に差しこむ（file:// でも動く）
  <div id="stage" class="stage" data-screen="menu" data-motion="normal">
    <ul class="settings"> …おと・うごき・もどる… </ul>   ← 右上に固定（全画面で同じ位置）
    <section class="screen screen--title"> … </section>
    <section class="screen screen--menu"> … </section>
    <section class="screen screen--cover"> … </section>
    <section class="screen screen--play"> … </section>
    <section class="screen screen--jiten"> … </section>
    <section class="screen screen--review"> … </section>
    <div class="sheet-overlay"> … </div>                ← ステップのおわり（まとめ）
    <div id="stage3d" class="layer-3d" aria-hidden="true"></div>   ← 3D（いちばん上・クリックは通す）
  </div>
</body>
```
- 表示中の画面に `.is-active`。`<script src="assets/motifs.js">` は `game.js` より前、`<body>` の中ならどこでもよい。
- 重なり順: `--z-ui 10`（画面）＜ `--z-3d 40`（3D）＜ `--z-overlay 60`（まとめ）＜ `--z-settings 80`（設定ボタン）。

### 右上の設定（全画面・同じ場所）
`top 24 / right 40`、150×150 のボタンを 24 あけて3つ。絵＋2行のことば（28px）。
```
┌──────┐ ┌──────┐ ┌──────┐
│ 絵    │ │ ≋ 絵  │ │ 本の絵│
│ おと  │ │うごき │ │もどる │
│ あり  │ │ふつう │ │本だな │
└──────┘ └──────┘ └──────┘
```
```html
<ul class="settings">
  <li><button class="btn btn-setting" aria-pressed="true" aria-label="おと あり">
        <svg class="motif"><use href="#m-i-sound-on"/></svg>
        <span class="btn-setting__name">おと</span><span class="btn-setting__state">あり</span></button></li>
  <li><button class="btn btn-setting" aria-pressed="true" aria-label="うごき ふつう">
        <svg class="motif"><use href="#m-i-motion"/></svg>
        <span class="btn-setting__name">うごき</span><span class="btn-setting__state">ふつう</span></button></li>
  <li><button class="btn btn-setting" aria-label="本だなへ もどる">
        <svg class="motif"><use href="#m-i-back"/></svg>
        <span class="btn-setting__name">もどる</span><span class="btn-setting__state">本だな</span></button></li>
</ul>
```
- 切りかえると、絵（`m-i-sound-on`↔`m-i-sound-off`、`m-i-motion`↔`m-i-motion-less`）・ことば（あり↔なし、ふつう↔すくなめ）・`aria-pressed` を全部かえる。オフのときは紙の色が少しくすむ（色だけでなく絵とことばでも分かる）。
- 「うごき すくなめ」= `#stage` に `data-motion="less"` ＋ `Motion3D.setReducedMotion(true)`。OSの「視差効果を減らす」も同じ見た目になる（CSSで対応ずみ）。
- メニュー画面では「もどる」は「タイトル」へ。

### 読み上げ「よむ」
問題の帯の左はし（132×132）。スピーカーの絵＋「よむ」。読んでいるあいだ `.is-speaking`（押しこまれた見た目）。押すと **問題文 → 選択肢1・2・3** の順に読む（カードを押す前に聞けるように）。カードを押したときは、そのカードを読む（思いやり は「想像のふきだし → カードの文」の順）。

---

## 6. 各画面のレイアウト

座標は基準 1920×1080（px）。

### 6-1. タイトル（はじめる）
```
┌──────────────────────────────────────────────────────────────┐
│                                        [おと][うごき][もどる]│
│   ┌────────────┐                                             │
│   │ ことばの     │   ことばの じてんを つくろう   (h1 56)      │
│   │ じてん       │                                             │
│   │（布の表紙・   │   8つの ことばの 例を あつめて、            │
│   │  題簽）      │   自分だけの じてんを つくります。 (本文30) │
│   │  ┃しおりひも │                                             │
│   └────────────┘   [ はじめる ]（紺・360×140）  しおりさん   │
│  ←3Dの場所: 表紙のまわり→                                      │
└──────────────────────────────────────────────────────────────┘
```
- `.title-book.cloth`（600×800、x150 y140）＋ `.title-book__slip.paper` ＋ `.title-book__ribbon`。右に `.title-side`（x880 y300）: `h1.t-h1`、`p.title-side__lead`、`button.btn.btn--primary.btn--big`。
- 「はじめる」で `Sound.start()`、本だなへ。

### 6-2. メニュー（本だな 2段×4さつ）
```
┌──────────────────────────────────────────────────────────────┐
│ どの 本を ひらく？ (h1)                    [おと][うごき][もどる]│
│ ┌─────────┐  ┌──────────────本だな（木）──────────────┐       │
│ │ことばの  │  │  ┃       ┃      [つぎに おすすめ]       │       │
│ │じてん    │  │ ┌──┐(で)┌──┐(で) ┌──┐     ┌──┐        │       │
│ │ [1][2][3][4]│ │①│   │②│     │③│     │④│        │       │
│ │ [5][6][7][8]│ │題簽│  │題簽│   │題簽│    │題簽│        │       │
│ │          │  │ └──┘   └──┘     └──┘     └──┘        │       │
│ │ 2 ／8さつ │  │═══════════════棚板═══════════════│       │
│ └─────────┘  │ ┌──┐   ┌──┐     ┌──┐     ┌──┐        │       │
│              │ │⑤│   │⑥│     │⑦│     │⑧│        │       │
│              │ └──┘   └──┘     └──┘     └──┘        │       │
│              └═══════════════棚板═══════════════┘       │
└──────────────────────────────────────────────────────────────┘
```
- 本は **表紙を見せて立てる（面だし）**。1さつ 230×300、ボタン。上の段 1〜4、下の段 5〜8（lesson-plan の順）。
- 本の題は2行まで（`<br>` の位置をこちらで決めた）:
  1 `{大切|たいせつ}に<br>する`／2 `やさしく<br>する`／3 `{思|おも}いやり`／4 `「ありがとう」<br>を {伝|つた}える`（`.book__word.is-long` 28px）／5 `{申|もう}し{訳|わけ}<br>ない`／6 `{協力|きょうりょく}<br>する`／7 `{責任|せきにん}を<br>{持|も}つ`／8 `{信頼|しんらい}<br>する`
- **おすすめ** = 紙のしおり（タブ）が本の上からのぞく: `<span class="bookmark bookmark--recommend">おすすめ</span>`（2と4のあとは「つぎに おすすめ」）。
- **できた** = `.book.is-done`: 朱の **布のしおりひも** が上から出る＋右上に「できた」の丸いはんこ（`.book__done`）。子どもっぽいシールは使わない。
- 左の `.jiten-cover`（「ことばの じてん」の表紙）: 8つのマス `.cover-slot`。終わった本の番号のマスに、その本の布（`.cover-slot.is-done.cloth.bk-N`）がはまる。8つそろうと `.jiten-cover.is-complete`（題簽のまわりに金の光）。下に「2 ／ 8さつ」。
- キーボード: 1〜8 キーで本をえらぶ。Tab の順は 本1→8 →表紙→設定。
- 本にマウスをのせると、少し持ち上がる（うごき すくなめ では動かない）。

```html
<section class="screen screen--menu">
  <h1 class="t-h1 menu-title">どの <ruby>本<rt>ほん</rt></ruby>を ひらく？</h1>
  <div class="jiten-cover cloth">
    <div class="jiten-cover__slip paper">ことばの<br>じてん</div>
    <ul class="jiten-cover__slots"><li class="cover-slot is-done cloth bk-1">1</li> … <li class="cover-slot">8</li></ul>
    <p class="jiten-cover__count"><b>2</b> ／ 8さつ</p>
  </div>
  <div class="shelf">
    <ul class="shelf__row">
      <li><button class="book cloth bk-1 is-done" data-stage="1">
            <span class="book__num paper">1</span>
            <span class="book__slip paper"><span class="book__word">…題…</span></span>
            <span class="book__done">できた</span></button></li>
      <li><button class="book cloth bk-3" data-stage="3">
            <span class="bookmark bookmark--recommend">つぎに おすすめ</span> …</button></li>
      …
    </ul>
    <ul class="shelf__row"> …5〜8… </ul>
  </div>
</section>
```

### 6-3. ステージの表紙（ステージのタイトル）
```
┌──────────────────────────────────────────────────────────────┐
│ ステージ 5                                 [おと][うごき][もどる]│
│ ┌──────────────┐  自分の した ことで 相手が 困った ときの 気持ち。│
│ │      (5)      │ ┌─────────────────────────────┐ │
│ │ ┌──────────┐ │ │(1) 例を 見て、集める           │ │
│ │ │  申し訳   │ │ ├─────────────────────────────┤ │
│ │ │   ない    │ │ │(2) どっち？ 見分ける            │ │
│ │ └──────────┘ │ ├─────────────────────────────┤ │
│ │  布の本 620×820│ │(3) 自分なら どうする？          │ │
│ └──────────────┘ └─────────────────────────────┘ │
│  ←3D: 本から例カードが     [ はじめる ]          しおりさん │
│      ふわっと出る場所                                        │
└──────────────────────────────────────────────────────────────┘
```
- `.cover-book.cloth.bk-N`（x120 y210）＋ `.cover-book__ribbon` ＋ `.cover-book__num.paper` ＋ `.cover-book__slip.paper`（88px）。
- 右 `.cover-side.bk-N`: `p.cover-side__lead`（ページの下の一文）、`ol.cover-steps` に `li.cover-step.paper`（左に本の色の帯。終わったステップは `.is-done` で番号が黒丸）、`.btn.btn--primary.btn--big`「はじめる」、`img.cover-guide`（guide.svg）。
- 上の帯は `header.topbar` に `h1.t-h1`「ステージ 5」だけ。

### 6-4. 問題の画面（おてほん・問題・せいかい・ヒント・まちがい は **全部同じ配置**）
```
y=0   ┌──────────────────────────────────────────────────────────────┐
      │┌本の背──────┐┌進み具合（紙の帯）────────────┐[おと][うごき][もどる]│
      ││ 思いやり    ││(1)(2)(③) いま 1問目／ぜんぶで 4問  ◉○○○ ││        │
y=190 │└────────────┘└──────────────────────────────┘          │
y=206 │ テープ┌─────────────────────────────────────────────┐テープ│
      │      │[よむ] [ばめんの絵] 問題文（44px・2行まで）           │      │
y=416 │      └─────────────────────────────────────────────┘      │
y=448 │   ┌カード1───────┐   ┌カード2───────┐   ┌カード3───────┐    │
      │   │(1)      ○    │   │(2)           │   │(3)           │    │
      │   │   絵 200     │   │   絵         │   │   絵         │    │
      │   │──────────────│   │──────────────│   │──────────────│    │
      │   │カードの文 32px│   │              │   │              │    │
y=872 │   └──────────────┘   └──────────────┘   └──────────────┘    │
y=892 │しおり ┌ガイドのことば（34px）──────────────┐ [つぎへ] [じてん] │
      │さん  <│ いいね。気持ちが 届く                │        [9／16 ]│
y=1056│       └──────────────────────────────────┘                  │
      └──────────────────────────────────────────────────────────────┘
```
- **場所は固定**: 進み具合（上）・問題の帯（y206〜416）・カード（y448〜872）・ガイド（下左）・つぎへ／じてん（下右）。どのステップでも動かさない。
- カードは 500×424。3まい=間60、2まい=間160 で中央にそろえる（`.choices[data-count]`）。ステップ1の2まい・3まいも同じ。
- **問題の帯の「ばめんの絵」の場所（180×174）は、いつもある**:
  - ステップ3: ばめんの絵（下の「絵の決め方」でえらぶ）
  - 思いやり ステップ2: 相手の絵＋想像のふきだし（`.q-scene .thought`）
  - それ以外: そのステージの本の絵（`m-book`、色は `--book`）
- おてほんのときは帯の上に「おてほん」の札（`.q-tag`。マスキングテープの紙）。ガイドは `guide-point.svg`、ゆびのカーソル `.guide-pointer`（`m-hand-point`）がカードへ動く。
- 進み具合: ステップは丸3つ（済＝黒丸・いま＝太いわくで大きい・まだ＝点線）。問題は小さな丸（済＝ぬり・いま＝大きい太わく・まだ＝細わく）。色にたよらず、ぬり・太さ・大きさで分かる。「いま ◯{問目|もんめ} ／ ぜんぶで ◯{問|もん}」の数字は40px。マスのうまり方は下右の「じてん」ボタンに「9／16」と小さなマス目で出す。
- 進み具合の帯は **右はし 1342px まで**（`.topbar` の gap 24px、`.progress` に `max-width:870px; min-width:0`、`.progress__label` は縮めない）。設定ボタン（x1382〜）の下にもぐらない。いちばん長いのは おてほん＋5問（「いま **おてほん** ／ ぜんぶで 5{問|もん}」と丸5つ）。これが入るよう、ステップの丸 60px（いま 72px）、問題の丸 24px（いま 30px）・間 6px、帯の中のすきま 18px にしている。

```html
<section class="screen screen--play">
  <header class="topbar">
    <div class="stage-tab cloth bk-3"><div class="stage-tab__slip paper"><ruby>思<rt>おも</rt></ruby>いやり</div></div>
    <div class="progress paper">
      <ol class="progress__steps"><li class="step-chip is-done">1</li><li class="step-chip is-now" aria-current="step">2</li><li class="step-chip">3</li></ol>
      <p class="progress__label">いま <b>1</b><ruby>問目<rt>もんめ</rt></ruby> ／ ぜんぶで 5<ruby>問<rt>もん</rt></ruby></p>
      <ol class="dots"><li class="dot is-now"></li><li class="dot"></li>…</ol>
    </div>
  </header>
  <div class="q-strip paper tape">
    <span class="q-tag">おてほん</span>                         ← おてほんの時だけ
    <button class="btn btn-read"><svg class="motif"><use href="#m-i-speaker"/></svg>よむ</button>
    <div class="q-scene bk-3"><svg class="motif"><use href="#m-p-worry"/></svg></div>
    <p class="q-text"><span class="q-text__scene">ばめんの一文（ステップ3）</span>自分なら どうする？</p>
  </div>
  <ul class="choices" data-count="3">
    <li><button class="card card--neutral card--thought" data-key="1">
      <span class="card__key">1</span>
      <span class="card__art">
        <svg class="motif motif--main"><use href="#m-p-pair"/></svg>
        <svg class="motif motif--sub"><use href="#m-silent"/></svg>
        <span class="thought card__thought">「言われたくない」</span>       ← 思いやり だけ
      </span>
      <span class="card__text">その 話は しない</span>
      <span class="card__mark"><img src="assets/stamp-maru.svg" alt=""></span>
      <span class="card__note">もういちど 見てみよう</span>
    </button></li>
    …
  </ul>
  <footer class="guidebar">
    <img class="guide" src="assets/guide.svg" alt="しおりさん">
    <p class="guide-bubble paper" aria-live="polite">…</p>
    <div class="footer-actions">
      <button class="btn btn-next is-hidden">つぎへ</button>
      <button class="btn btn-jiten"><span class="mini-grid"><i class="is-on"></i>…</span>
        <span class="btn-jiten__label">じてん<span class="btn-jiten__count">9／16</span></span></button>
    </div>
  </footer>
</section>
```

#### カードの色のルール（答えが色でばれないように）
| 場面 | クラス | 見た目 |
|---|---|---|
| ステップ1（全部〇） | `.card.nk-1〜3` | 上の色帯＝なかま色、右上に なかまの形 `.card__nk`（`<svg class="nk-mark card__nk"><use href="#m-nk-1"/></svg>`）。絵の差し色もなかま色 |
| ステップ2・3（〇と×） | `.card.card--neutral` | 色帯は紙色、形マークなし、絵の差し色はステージの本の色 |
| ステップ2・3で正解した後 | `card--neutral` を外し `.nk-N .is-correct` | ここで初めてなかま色が出て、じてんへ飛ぶ |

#### 状態（せいかい／まちがい／ヒント）
| 状態 | クラス | 見た目（色だけにしない） | ことば（ガイドのふきだし） |
|---|---|---|---|
| せいかい | `.card.is-correct` ＋ ふきだし `.is-praise` | 朱の **手描き二重まる** がポンと押される（0.3秒、ばね）。わくが太いなかま色。ふきだしは朱のわく＋左に二重まるの絵 | 「いいね。〇〇」などlesson-planのほめことば |
| まちがい1回目 | `.card.is-retry` ＋ ふきだし `.is-retry` | わくが **点線** になり、カードの下に札「もういちど 見てみよう」。**×・赤・ゆれは使わない** | 「もういちど {見|み}てみよう」 |
| まちがい2回目（ヒント） | 正解に `.is-hint`、ステップ3はほかの×1まいに `.is-out` | 正解カードが1.2秒かけて 5% ふくらみ、黄色のやわらかい光のわく（点滅しない）。外したカードはうすく、押せない | lesson-plan の「ヒント」の文。ガイドは `guide-think.svg` |
| まちがい3回目 | 正解に `.is-hint`、ゆび `.guide-pointer` が正解へ | ガイドが一緒に押す → `.is-correct` | 「{一緒|いっしょ}に たしかめよう」 |
| ステップ1のヒント | まだのカードに `.is-float` | 2.4秒で1往復、12pxだけ上下（すくなめ では光のわくに変わる） | — |
| 集めた（ステップ1） | `.card.is-collected` | 二重まるが残り、うすく点線。もう押せない | — |
| じてんへ飛ぶ | `.card.is-flying` ＋ `--fly-x` `--fly-y` | 0.7秒で「じてん」ボタンへ小さくなって飛ぶ。すくなめ では消えるだけ | — |
| おてほんで押すカード | `.card.is-guide-target` | うすい影のわく | — |

### 6-5. じてんのページ
```
┌──────────────────────────────────────────────────────────────┐
│┃┌───────────────────────────────── ページ（紙）──────────────┐│
│┃│ 「大切にする」とは？ (50)          [とじる]  [おと][うごき][もどる]│
│┃│ ● 人・生き物  ▲ 物  ◆ 自分  (なかま名・28)                     ││
│┃│ ┌マス─┐┌マス─┐┌マス─┐┌マス─┐┌マス─┐   20こ: 5列×4段    ││
│┃│ │絵  ●││    ││ ？ ││    ││    │   16こ: 4列×4段    ││
│┃│ │文2行 ││    ││    ││    ││    │   なかま順に並べる ││
│┃│ └────┘└────┘└────┘└────┘└────┘                    ││
│┃│  …（4段）…                                                 ││
│┃│ ─────────────────────────────────────────────               ││
│┃│ 大切にする とは、人や 物、自分を だいじに する こと (36)       ││
│┃└────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
 左はしの濃い色 = 本の背（とじしろ）
```
- `.jiten-page.paper`（x40 y24、1840×1032）。全画面をおおう1まいのページ。上の帯（進み具合）はかくし、右上の設定だけ出す。「とじる」は設定の左（`.btn-close`、220×150）。
- マスは **なかまの順（だいだい→みどり→みずいろ）、その中はカードID順** に並べる。だから3色がかたまって見える（ページが3色に分かれる）。
- マス `.masu.nk-N`（ボタン）: 左上に絵（`.masu__art`、54px）、右上に なかまの形、下に文（28px・2行まで）。押すと読み上げ。
- まだのマス: `.masu.is-empty`（点線・古い紙色・うすい「？」56px）。ボタンにしない。
- 入ったばかり: `.is-new`（黄色の光のわく）。まとめで色ごとに順に光らせる: `.is-glow`（0.6秒ずつ、なかま1→2→3。点滅させず、つけたら次へ）。
- 下の一文 `.jiten-page__meaning`（36px）は **ページが全部うまったとき** に出す（それまでは `visibility:hidden`）。

```html
<section class="screen screen--jiten">
  <article class="jiten-page paper">
    <div class="jiten-page__head">
      <h2 class="jiten-page__title">「<ruby>大切<rt>たいせつ</rt></ruby>にする」とは？</h2>
      <ul class="jiten-legend">
        <li class="legend-item nk-1"><svg class="nk-mark"><use href="#m-nk-1"/></svg>人・生き物</li>
        <li class="legend-item nk-2"><svg class="nk-mark"><use href="#m-nk-2"/></svg>物</li>
        <li class="legend-item nk-3"><svg class="nk-mark"><use href="#m-nk-3"/></svg>自分</li>
      </ul>
    </div>
    <button class="btn btn-close">とじる</button>
    <ul class="masu-grid" data-count="20">
      <li><button class="masu nk-1"><span class="masu__head">
            <span class="masu__art"><svg class="motif"><use href="#m-phone"/></svg></span>
            <svg class="nk-mark"><use href="#m-nk-1"/></svg></span>
          <span class="masu__text">気にして 電話を かける</span></button></li>
      <li><div class="masu nk-1 is-empty"><span class="masu__q" aria-label="まだ">？</span></div></li>
      …
    </ul>
    <p class="jiten-page__meaning">大切にする とは、人や 物、自分を だいじに する こと</p>
  </article>
</section>
```

### 6-6. ステップのおわり（まとめ）
問題画面の上に紙を1まい重ねる（`.sheet-overlay.is-active`）。設定ボタンは上に出たまま。
```
┌──────────────────────────────────────────────┐
│ (はんこ)  できた！ 例が 12まい 集まった  (h1)    │
│  230px   大切にする 相手は、人・物・自分  (36)   │
│          [● 人・生き物][▲ 物][◆ 自分] ←ステップ1のまとめ │
│          [ つぎへ ]                             │
└──────────────────────────────────────────────┘
```
- `.sheet.paper` に `img.sheet__stamp`（stamp-dekita.svg）、`h2.sheet__title`、`p.sheet__text`、`ul.sheet__swatches`（なかまの `legend-item` を並べる。lesson-plan の「3色のマスを順にゆっくり光らせる」は、ここで1つずつ `.is-glow`）、`.btn.btn--primary.btn--big`「つぎへ」。
- 3Dのはんこが `.sheet__stamp` の位置に「ドン」と押される。3Dが動くあいだは `.sheet__stamp.is-3d`（2Dの絵をかくす）→ 終わったら外す。

### 6-7. ふり返り
```
┌──────────────────────────────────────────────────────────────┐
│[本の背 大切にする][ふり返り                ][おと][うごき][もどる]│
│┌────────────────────────────── 紙 ──────────────────────────┐│
││ ページ 完成！(h1)                       (はんこ)(はんこ)(はんこ)││
││ ┃大切にする とは、人や 物、…（34・本の色の帯）  ←3Dスタンプの場所 ││
││ 今日 できた こと                                              ││
││ ✓ 例を 20こ 集めた                    気に なった カードを     ││
││ ✓ 「大切にする」に 合う 行動を 選べた    1まい 選ぼう           ││
││ ✓ 自分なら どうするか 選べた            ┌選んだカード┐/[カードを えらぶ]││
││ 人・物・自分、どれも 大切に できる(手書き)│            │          ││
││ [↺ もういちど] [本だなへ]               └──────────┘          ││
│└────────────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────┘
```
- `.review-page.paper.bk-N`（x60 y206、1800×850）。左: `h2.review__title`、`p.review__meaning`、`ul.checklist > li.check-item`（朱のチェック `m-i-check`＋文）、`p.review__last`（ステージの「最後の一言」）、`.review__actions`（`.btn`「もういちど」`m-i-again`／`.btn.btn--primary`「本だなへ」= おわる）。
- 右: `.review__stamps`（3D用。3まいの `img` は3Dが無いときの代わり。3Dのとき `.is-3d`）、`p.review__pick-label`、`.review__pick`（はじめは「カードを えらぶ」ボタン → じてんのページを「えらぶモード」で開き、押したマスに `.is-picked` → ここに `.card.nk-N` を問題のカードと同じ **500×424** で出して読み上げ。2行の文も切れない。正解なし）。
- 8ステージ全部のあとは、タイトルを「ことばの じてん 完成！」にし、本だなの表紙 `.jiten-cover.is-complete` を見せる。

---

## 7. ガイド「しおりさん」（図書委員の先輩）

| ファイル | ポーズ | 使う場面 |
|---|---|---|
| `assets/guide.svg` | じてんを胸にかかえる（ふつう） | 問題中・ほめるとき・ふり返り・表紙 |
| `assets/guide-point.svg` | 右をゆびさす | おてほん・ステップのはじめ |
| `assets/guide-think.svg` | 首をかしげ、あごに手 | まちがい2回目・3回目（一緒に考える） |

- 紺のカーディガンに「としょ」（ひらがな）の腕章、ボブの髪。表情はおだやか（にっこりしすぎない）。下の帯の左に 200×231 で立つ。問題中は動かさない（ポーズの切りかえだけ）。
- ことばはふきだし `.guide-bubble`（34px・2行まで・`aria-live="polite"`）。

---

## 8. 絵（例カード・ばめん）の作り方 — **再利用できるSVGスプライト**

132まいを1まいずつ描かず、**手描き風の線でそろえたモチーフ（絵89種＋なかまの形3＋UIの絵11＝103）** を組み合わせる。

- ファイル: `assets/motifs.js`（読みこむと `<body>` の先頭にスプライトを差しこむ）／`assets/motifs.svg`（同じ中身。見る用）。`window.MOTIF_IDS` に使える名前の一覧。
- 使い方: `<svg class="motif motif--main"><use href="#m-phone"/></svg>`。外部ファイルへの `<use href="assets/motifs.svg#…">` は file:// で読めないので使わない。
- 線は藍墨 `--ink`、太さ約4（120×120 の中）、少しゆれた線。**差し色は `currentColor`** なので、親の `color` で色が変わる（カードでは なかま色／本の色が自動で入る）。肌・髪・制服などは `--m-*` の決まった色。
- カード1まい = **主のモチーフ（200px）＋ 小さなモチーフ（100px、右下）** の2つまで。
- 人物は中学生（制服の上着・ジャージ色）。顔は点の目と小さな口だけで、こわい表情は作らない。
- ×のカードも同じ方法。こわい絵・いたい絵にはしない（「投げる」は物がふわっと浮くだけ、表情は `p-worry` まで）。

### モチーフ一覧（`#m-` のあとの名前）
- 人: `p-student` `p-worry`(こまった顔) `p-smile` `p-back`(背中) `p-bow`(おじぎ) `p-pair`(ふたり) `p-group`(3人) `p-adult`(先生・家の人) `p-bed`(ベッドで休む)
- 手: `hand` `hands-give`(両手でわたす) `hand-thumb` `hand-point` `print-hand`(プリントの手わたし)
- 気持ち・ことば: `bubble` `bubble-soft`(とがった→丸い) `thought`(想像の雲・小) `heart` `chiku`(ちくっ) `bulb` `question` `rumor`(うわさの山) `silent`(口に指)
- スマホ・紙: `phone` `phone-msg` `phone-quiet` `phone-busy`(通知だらけ) `letter` `print` `memo` `memo-bulb` `checklist` `tag`(係の札) `calendar` `board` `eraser-board`
- 学用品: `book` `book-open` `notebook` `pen` `eraser` `scissors` `bag` `desk` `brush`
- くらし: `house` `school` `door` `bed` `moon` `sun` `cloud-sun` `cloud-heavy` `rain-umbrella` `shirt` `shirt-mess` `shoes` `toothbrush` `faucet` `flower` `flower-droop` `watering` `dog` `bowl` `bento` `dishes` `gift` `cake` `trashbag` `sponge` `shopbag` `keychain`
- そうじ・係: `broom` `dustpan` `rag` `bucket` `box` `apron` `chair-seat` `bench` `map` `wheelchair` `clock`
- 部活: `ball` `pass` `racket` `cone` `baton` `note`(合唱)
- なかまの形: `nk-1`(まる) `nk-2`(さんかく) `nk-3`(しかく)
- UI: `i-speaker` `i-sound-on` `i-sound-off` `i-motion` `i-motion-less` `i-back` `i-jiten` `i-next` `i-check` `i-again` `i-close`

### カードIDごとの絵（主＋小）
`LESSON` のカードに `art: ['主','小']` として入れる（小は無くてもよい）。
| ステージ | 割り当て |
|---|---|
| 1 大切にする | T01 phone+heart／T02 p-bed+flower／T03 p-bow+bubble／T04 p-pair+bubble／T05 p-worry+bubble／T06 hands-give+notebook／T07 phone-msg+heart／T08 dog+bowl／T09 flower+watering／T10 racket+rag／T11 shoes／T12 book-open+hand／T13 scissors+desk／T14 hands-give+eraser／T15 shirt／T16 toothbrush／T17 faucet／T18 bed+moon／T19 phone-quiet+moon／T20 bench+p-smile |
| 2 やさしくする | Y01 hand+p-worry／Y02 box+p-pair／Y03 p-group+bubble／Y04 hands-give+pen／Y05 map+hand-point／Y06 chair-seat+p-student／Y07 p-pair+ball／Y08 book-open+p-pair／Y09 door+hand／Y10 bench+p-student／Y11 hand-thumb+brush／Y12 book+hand／Y13 bubble+print／Y14 wheelchair+p-student／Y15 rain-umbrella+p-pair／Y16 p-pair+door |
| 3 思いやり（全部 `.card--thought`＋想像のふきだし） | OM01 p-bed+phone-quiet／OM02 clock+phone／OM03 p-student+calendar／OM04 p-bow+ball／OM05 p-worry+silent／OM06 p-pair+bubble／OM07 bubble-soft／OM08 p-adult+clock／OM09 p-back+p-student／OM10 phone+bubble／OM11 p-adult+bubble／OM12 print+p-worry／OM13 bubble-soft+bubble／OM14 phone-quiet+clock／OM15 p-bed+silent／OM16 keychain+bubble |
| 4 ありがとう | A01 print-hand+bubble／A02 door+p-bow／A03 bento+p-bow／A04 bowl+p-adult／A05 p-pair+bubble／A06 p-bow／A07 letter+pen／A08 box+bubble／A09 eraser+bubble／A10 notebook+hand-point／A11 p-group+ball／A12 phone-msg+cake／A13 shirt+house／A14 bubble+heart／A15 p-pair+box／A16 gift+p-smile |
| 5 申し訳ない | MO01 p-bow+bubble／MO02 door+clock／MO03 p-bow／MO04 bubble-soft+bubble／MO05 bag+p-bow／MO06 p-worry+chiku／MO07 p-student+hand-point／MO08 p-pair+chiku／MO09 rag+bucket／MO10 rain-umbrella+p-adult／MO11 book+p-pair／MO12 desk+broom／MO13 checklist+p-group／MO14 memo-bulb／MO15 cloud-sun+p-smile／MO16 desk+p-pair |
| 6 協力する | K01 desk+p-group／K02 desk+p-pair／K03 broom+rag／K04 apron／K05 pass／K06 brush+p-group／K07 broom+dustpan／K08 ball+cone／K09 shopbag+p-pair／K10 note+p-group／K11 dishes+p-adult／K12 shirt+p-pair／K13 house+rag／K14 bubble+ball／K15 pen+hand／K16 cone+p-group |
| 7 責任を持つ | SE01 checklist+tag／SE02 eraser-board+tag／SE03 book+checklist／SE04 bucket／SE05 notebook+print／SE06 clock+p-pair／SE07 phone-msg+clock／SE08 ball+checklist／SE09 trashbag+house／SE10 memo+shopbag／SE11 sponge／SE12 p-adult+print／SE13 print-hand+house／SE14 clock+p-group／SE15 phone-msg+p-group／SE16 bag+shirt |
| 8 信頼する | SH01 tag+hands-give／SH02 pass／SH03 p-student+p-back／SH04 cone+p-pair／SH05 p-adult+p-student／SH06 bowl+p-adult／SH07 bench+p-pair／SH08 notebook+bubble／SH09 p-pair+bubble／SH10 clock+phone-msg／SH11 p-group+hand-thumb／SH12 phone+p-back／SH13 rumor+p-pair／SH14 hand+ball／SH15 phone+p-adult／SH16 board+p-group |

### ×のカード・ばめん・おてほんの見本カードの絵の決め方
先に「ことば→モチーフ」の表で主のモチーフを決め、行動の向きを小のモチーフで出す。
| 文にふくまれることば | 主 | | 行動 | 小 |
|---|---|---|---|---|
| スマホ・LINE・メッセージ・SNS・動画 | phone | | 背を向ける・通りすぎる・知らんぷり・にげる・帰る | p-back |
| スタンプ・何度も送る・通知 | phone-busy | | 笑う・からかう・ネタ・はしゃぐ・大さわぎ | p-group |
| 本・教科書・図書室 | book | | 言い訳・「だって」・悪口・うわさ | rumor |
| 服・シャツ・洗濯物 | shirt（×は shirt-mess） | | 見ている だけ・ためいき・責め続ける | p-worry |
| 花 | flower（×は flower-droop） | | 大声・大きな音 | bubble-soft |
| 机・班・看板 | desk | | あやまる・すみません | p-bow |
| 掃除・ごみ | broom | | 一緒に・みんなで | p-group |
| 時計・遅れる・時間 | clock | | | |
| 部活・試合・パス・練習 | ball | | | |
| 先生・家の人 | p-adult | | | |
| 保健室・ベッド・かぜ | p-bed | | | |
| 雨・傘 | rain-umbrella | | | |
| 雲・気持ちを切りかえる | cloud-sun（×の「責め続ける」は cloud-heavy。こわくしない） | | | |
| どれにもない | p-student | | | |

### 想像のふきだし（ステージ3「思いやり」）
- カードの絵の **右上** に、相手の気持ちを入れた **点線の雲**（`assets/thought-cloud.svg` を背景にのばす）＋ 相手へ向かう小さな丸2つ。中の文字は Klee One 28px（ほかの文とちがう書体で「心の中のことば」と分かる）。
- 実線の **ふきだし（`m-bubble`）＝声に出したことば**、点線の **雲＝心の中**、と全ステージで使い分ける。
- カードは `.card--thought` にすると、人物が少し小さく下がり、雲の場所があく。
- ステップ2の「相手と想像のふきだし」は、問題の帯の `.q-scene` に相手の絵、その右に `.thought`。雲があるときだけ場面の箱を **180→440px** に広げ（`.q-strip:has(.q-scene .thought)` の列を 132/440/1fr）、雲は **箱の中**（left 128px・最大幅 306px、9字まで1行、長いと ことばの切れ目で2行）に入れる。帯の文・ふりがなには かぶらない（文は x732 から）。ステップ3（場面の文があるとき）は帯に雲を出さない（game.js 側）。
- 読み上げ: 雲 → カードの文 の順。

### ちくっ（ステージ5「申し訳ない」）
- `m-chiku`: やわらかい折れ線（朱）を、うすい丸でかこんだ小さな印。人物の胸のあたりに 64px で重ねる（`<svg class="chiku" style="left:…;top:…"><use href="#m-chiku"/></svg>`、または小のモチーフとして）。
- こわくしないため、とがった稲妻・赤い背景は使わない。

---

## 9. 3D（motion-3d 担当へ）

### テーマ（`Motion3D.init(stage3d, { theme: THEME })`）
```js
const THEME = {
  name: 'library-bookbinding',
  paper: '#FBF8F1', paper2: '#F1EDE1', ink: '#263040', accent: '#A23B2E', press: '#2F4668',
  desk: '#D8DBCD', wood: '#7B5737', hint: '#EBCB6B', jitenCloth: '#3E4E5E',
  nakama: ['#D08A3E', '#6E9A55', '#5C97BA'],
  books: ['#9C3F35', '#B8873A', '#6F6A92', '#4E8060', '#59636F', '#8E5B3A', '#2F4668', '#3E7C7A'],
  material: 'toon',   // MeshToonMaterial・紙と布。金属・発光はなし
};
```
`getComputedStyle(document.documentElement).getPropertyValue('--book-3')` でも同じ値が取れる。

### 3Dに出すもの（題材の形）
- うすい **紙のカード**（なかま3色の色帯つき）、**布の本**（8色）、**朱のはんこ**（丸い印面＋木の柄）、**紙ふぶき**（紙色・なかま3色・朱を少し。星やネオンはなし）、**しおりひも**。
- 光は1つ＋弱い環境光。影は1つのライトだけ。

### 置いてよい場所（基準1920×1080 の px）
| 場面 | `setScene` | 置く場所 | さわらない場所 |
|---|---|---|---|
| タイトル | `'title'` | 表紙のまわり x 60〜840・y 100〜1060、上の帯 x 0〜1340・y 0〜190 | 文字とボタン x 860〜1880・y 280〜1000、設定 x 1380〜1880・y 20〜180 |
| ステージの表紙 | `'title'` | 本のまわり x 40〜820・y 190〜1060（本から例カードが3〜5まい ふわっと出て浮かぶ） | 右の文字とボタン x 840〜1860 |
| 問題中 | `'play'` | **ふだんは何も出さない**。`celebrate(x,y)` のときだけ、カードのまわり（半径300px）に1〜1.5秒 | 問題の帯 y 206〜416、カード y 448〜872 は、反応のとき以外おおわない |
| まとめ | `stepClear(n)` | はんこを `.sheet__stamp` の中心（だいたい x 515・y 445）へ「ドン」 | シートの文字 x 640〜1540 |
| ふり返り | `'result'` | `.review__stamps` の場所 x 1150〜1800・y 250〜470 にステップ1〜3のはんこを並べ、1つずつ光る（朱の光をゆっくり。点滅しない） | 左の文字 x 130〜1090 |

- 座標は画面の拡大縮小があるので、組立担当が `element.getBoundingClientRect()` の中心を渡す（`celebrate(x, y)` は画面のpx）。
- まちがい `encourage()`: しおりさんの近く（x 40〜260・y 860〜1080）で、小さな紙が1まい ふわっと落ちる程度。赤・×・ゆれはなし。
- うごき すくなめ: 3Dは出さないか、その場にふわっと表示するだけ。CSS側も `data-motion="less"` で動きを止める（設定ずみ）。

---

## 10. 音と演出を出す所（sound-maker・game-builder へ）

| できごと | 音 `Sound.play()` | 3D | CSS（見た目） |
|---|---|---|---|
| はじめる | `Sound.start()` | `setScene('title')`→本だなへ | — |
| 本・ボタン・マスを押す | `'tap'`（紙をめくる軽い音のイメージ） | — | ボタンが6px 押しこまれる |
| じてんを開く／とじる | `'tap'` | — | 画面の切りかえ（フェード 0.32秒） |
| カードを押して正解 | `'correct'`（はんこの「ぽん」） | `celebrate(カード中心)` | `.is-correct`（二重まるが押される）→ 0.6秒後 `.is-flying` → マスに `.is-new` |
| まちがい | `'retry'`（小さく、責めない音） | `encourage()` | `.is-retry`、2回目 `.is-hint` |
| ステップクリア | `'clear'` | `await stepClear(n)` | `.sheet-overlay.is-active` |
| ページ完成 | `'clear'` | `setScene('result')` | ふり返り。下の一文を表示して読み上げ |
| 3色を順に光らせる（まとめ） | なし | — | `.is-glow` を なかま1→2→3（各0.6秒） |

- 点滅: 光るのは「ついて、しばらくして消える」だけ。1秒に3回をこえない。画面全体を光らせない。
- 問題中に動くのは、押したカード・ヒントのカード・ステップ1のゆれだけ。背景・ガイド・帯は動かさない。

---

## 11. キーボード
- Tab の順: （問題画面）よむ → カード1→2→3 → つぎへ → じてん → 設定（おと・うごき・もどる）。
- Enter／スペース: 決定。**1〜3キー**: カードをえらぶ（`.card__key` の数字と同じ）。**1〜8キー**: 本だなで本をえらぶ。Esc: じてんを閉じる。
- フォーカス枠: 6px の濃い藍 `--focus`、外側6px（全部の押せるものに出る。`:focus-visible`）。

---

## 12. クラス名の一覧（style.css）

| 分類 | クラス |
|---|---|
| 土台 | `.stage`（`--stage-scale`・`data-motion="less"`）／`.layer-3d`／`.screen`・`.is-active`／`.paper`／`.cloth`／`.tape`／`.vh`／`.wakachi` |
| 文字 | `.t-head`／`.t-h1`／`.t-body`／`ruby`・`rt` |
| 色 | `.bk-1`〜`.bk-8`（`--book`）／`.nk-1`〜`.nk-3`（`--nk` ほか）／`.nk-mark` |
| ボタン | `.btn`／`.btn--primary`／`.btn--big`／`.btn--stack`／`.btn-setting`（`__name` `__state`、`aria-pressed`）／`.settings`／`.btn-read`（`.is-speaking`）／`.btn-next`（`.is-hidden`）／`.btn-jiten`（`__label` `__count`）／`.mini-grid`（`i.is-on`）／`.btn-close` |
| 上の帯 | `.topbar`／`.stage-tab`・`__slip`／`.progress`・`__steps`・`__label`／`.step-chip`（`.is-now` `.is-done`）／`.dots`・`.dot`（`.is-now` `.is-done`） |
| タイトル | `.title-book`・`__slip`・`__ribbon`／`.title-side`・`__lead` |
| メニュー | `.menu-title`／`.jiten-cover`・`__slip`・`__slots`・`__count`（`.is-complete`）／`.cover-slot`（`.is-done`）／`.shelf`・`__row`／`.book`（`.is-done`）・`__num`・`__slip`・`__word`（`.is-long`）・`__done`／`.bookmark`・`--recommend` |
| ステージ表紙 | `.cover-book`・`__num`・`__slip`・`__ribbon`／`.cover-side`・`__lead`／`.cover-steps`／`.cover-step`（`.is-done`）・`__no`・`__text`／`.cover-guide` |
| 問題 | `.q-strip`／`.q-tag`／`.q-scene`／`.q-text`・`__scene`／`.choices`（`data-count`）／`.card`（`--neutral` `--thought`）・`__key`・`__nk`・`__art`・`__text`（`.is-2line` `.is-long`）・`__mark`・`__note`・`__thought`／状態 `.is-correct` `.is-retry` `.is-hint` `.is-float` `.is-out` `.is-collected` `.is-flying` `.is-guide-target`／`.motif`・`--main` `--sub` `--left`／`.thought`／`.chiku`／`.guide-pointer` |
| 下の帯 | `.guidebar`／`.guide`／`.guide-bubble`（`.is-praise` `.is-retry`）／`.footer-actions` |
| じてん | `.jiten-page`・`__head`・`__title`・`__meaning`／`.jiten-legend`／`.legend-item`／`.masu-grid`（`data-count="20|16"`）／`.masu`（`.is-empty` `.is-new` `.is-glow` `.is-picked`）・`__head`・`__art`・`__text`・`__q` |
| まとめ | `.sheet-overlay`（`.is-active`）／`.sheet`・`__stamp`（`.is-3d`）・`__title`・`__text`・`__swatches` |
| ふり返り | `.review-page`／`.review__title` `__meaning` `__last` `__right` `__stamps`（`.is-3d`） `__pick-label` `__pick` `__actions`／`.checklist`／`.check-item` |

## 13. ファイル
- `style.css` — トークン・全クラス（上の一覧）
- `assets/motifs.js`・`assets/motifs.svg` — 手描き風モチーフ 103種（絵89・なかまの形3・UI11）
- `assets/guide.svg`・`guide-point.svg`・`guide-think.svg` — しおりさん
- `assets/stamp-maru.svg` — せいかいの二重まる（朱）
- `assets/stamp-dekita.svg` — ステップクリア・ふり返りの「できた」はんこ
- `assets/thought-cloud.svg` — 想像のふきだし（のびちぢみする背景）
- `fonts/*.subset.woff2`・`fonts/OFL-*.txt` — Zen Maru Gothic（500/700）・Klee One（600）
