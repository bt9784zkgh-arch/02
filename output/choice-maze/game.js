/* =========================================================
   せんたくの めいきゅう  game.js
   ---------------------------------------------------------
   【先生へ】書きかえるのは、すぐ下の LESSON だけで大丈夫です。
   - 漢字は「漢字（かんじ）」と書くと、自動で ふりがな（ruby）に なります。
   - 未来の文は「顔｜きもち｜あいての はんのう｜つぎの もんだい」を ｜ で区切ります。
     顔: hotto dokidoki moyamoya iraira kanashii sukkiri jishin hazukashii
   - 場面を外したいときは use: false、とばすボタンを出すときは skippable: true。
   - order はカードの並び順（画面の左から）。おすすめは いつも d です。
   ========================================================= */
const LESSON = {
  title: 'せんたくの めいきゅう',
  subtitle: '3（さん）びょうごの みらいを かえる',

  // 4つの道の形（色ではなく形と文字で見分ける）
  marks: { a: 'まる', b: 'さんかく', c: 'しかく', d: 'ひしがた' },
  best: 'd',                                     // おすすめの道
  times: ['3びょうご', '1にちご', '1しゅうかんご'],
  faces: {
    hotto: 'ほっと', dokidoki: 'どきどき', moyamoya: 'もやもや', iraira: 'いらいら',
    kanashii: 'かなしい', sukkiri: 'すっきり', jishin: 'じしん', hazukashii: 'はずかしい'
  },
  // あいての顔の表情（道ごとに 3びょうご・1にちご・1しゅうかんご）
  partnerMood: {
    a: ['futsuu', 'shinpai', 'shinpai'],
    b: ['futsuu', 'futsuu', 'nikko'],
    c: ['futsuu', 'shinpai', 'shinpai'],
    d: ['nikko', 'nikko', 'nikko']
  },

  words: {
    sceneLead: 'どんな ばめんかな？',
    breathAsk: '3（さん）びょう まって かんがえよう',
    breathIn: 'すって…', breathOut: 'はいて…',
    afterBreath: 'まって かんがえられたね。',
    choose: 'どの みちを えらぶ？',
    chooseGuide: 'どの みちを えらんでも だいじょうぶ。',
    futureEach: 'みらいが ひとつ みえたね。',
    futureEndOther: 'その みちだと こう なるんだね。',
    futureEndBest: 'あかるい みらいが みえたね。',
    otherAsk: 'ほかの みちも みてみる？',
    otherAll: '4つの みちを ぜんぶ みたね。',
    sumAsk: 'いちばん みらいが あかるく なりそうなのは どれ？',
    hint1Head: 'その みちだと こう なるね。',
    hint1: 'もういちど みてみよう。',
    hint2Head: '1しゅうかんごの ランプを くらべて みよう',
    hint2: '2つに しぼったよ。ランプの かずを くらべて みよう。',
    together: 'いっしょに たしかめよう。',
    togetherEnd: 'Dの みちは、自分（じぶん）で かいけつに うごく みち だね。',
    togetherPress: 'ひかりさんと いっしょに えらぼう。',
    skip: 'この ばめんを とばす'
  },

  steps: [
    {
      name: 'じぶん・いえ',
      demo: [
        'みちを えらぶと、みらいが みえるよ。いっしょに みて みよう。',
        'すって… はいて…。いっしょに 3（さん）びょう まとう。',
        'この みちを えらんで みるね。',
        'どの みちを えらんでも だいじょうぶ。',
        'ほかの みちも みてみよう。',
        'こんどは この みちを みるね。',
        'ランプの かずを くらべよう。',
        'こんどは じぶんで えらんで みよう！'
      ],
      scenes: [
        {
          id: 's1-1', use: true, skippable: false,
          title: '宿題（しゅくだい）を わすれた',
          lines: ['きょう だす 宿題（しゅくだい）を わすれた。', '先生（せんせい）が あつめに きたよ。'],
          who: '先生（せんせい）', partner: 'sensei',
          order: ['b', 'd', 'a', 'c'],
          praise: 'よく えらんだね！ あやまって、だす 日（ひ）を つたえたね。',
          hint: '先生（せんせい）の かおが にこっと するのは どれかな？',
          paths: {
            a: { text: 'うそを ついて ごまかす（「やったけど 家（いえ）に ある」）', lamps: 1, future: [
              'dokidoki｜ほっと した。でも どきどき。｜先生（せんせい）「あした もってきてね」｜あしたまでに やらないと。',
              'moyamoya｜うそが ばれないか しんぱい。｜先生（せんせい）「きのうの 宿題（しゅくだい）は？」｜また うそを つくか まよう。',
              'moyamoya｜もやもやが つづく。｜先生（せんせい）が すこし しんじにくそう。｜宿題（しゅくだい）が たまって こまる かも。'] },
            b: { text: '正直（しょうじき）に「わすれました」と いう', lamps: 2, future: [
              'dokidoki｜どきっと した。でも いえた。｜先生（せんせい）「つぎは きを つけてね」｜いつ だすか きまって いない。',
              'hotto｜すこし ほっと した。｜先生（せんせい）「いつ だせる？」と きく。｜だす 日（ひ）を 自分（じぶん）で きめる。',
              'hotto｜こころは おちついて いる。｜先生（せんせい）は ふつうに はなして くれる。｜わすれない くふうを したい。'] },
            c: { text: 'なにも いわずに にげる', lamps: 1, future: [
              'hotto｜その ばは ほっと した。｜先生（せんせい）「あれ？ どこに いったかな」｜宿題（しゅくだい）は まだ でて いない。',
              'moyamoya｜おなかが もやもや する。｜先生（せんせい）「きのう どう したの？」｜宿題（しゅくだい）も きのうの ことも のこる。',
              'kanashii｜先生（せんせい）と 目（め）を あわせにくい。｜先生（せんせい）が しんぱい して いる。｜もんだいが のこった まま。'] },
            d: { text: 'あやまって、いつ だせるか つたえる', lamps: 3, future: [
              'dokidoki｜どきどき。でも いえた！｜先生（せんせい）「おしえて くれて ありがとう」｜あした だす こと。',
              'sukkiri｜宿題（しゅくだい）を だせて すっきり。｜先生（せんせい）「ちゃんと もってきたね」｜ほとんど ない。',
              'jishin｜じしんが ついた。｜先生（せんせい）が しんじて くれる。｜メモを する くふうを はじめた。'] }
          }
        },
        {
          id: 's1-2', use: true, skippable: false,
          title: 'コップを わった',
          lines: ['家（いえ）で コップを わって しまった。', '家（いえ）の 人（ひと）の だいじな コップだ。'],
          who: '家（いえ）の 人（ひと）', partner: 'ie',
          order: ['a', 'c', 'd', 'b'],
          praise: 'よく えらんだね！ あやまって、いっしょに かたづけたね。',
          hint: 'かけらが ちゃんと かたづくのは どれかな？',
          paths: {
            a: { text: '「さいしょから われてた」と ごまかす', lamps: 1, future: [
              'dokidoki｜ほっと した。でも どきどき。｜家（いえ）の 人（ひと）「ほんとう？」と ふしぎそう。｜かけらが ゆかに のこって いる。',
              'moyamoya｜ばれないか しんぱい。｜家（いえ）の 人（ひと）が なんだか げんきが ない。｜家（いえ）で おちつかない。',
              'moyamoya｜もやもやが つづく。｜家（いえ）の 人（ひと）が すこし しんじにくそう。｜ほんとうの ことが いいにくく なる。'] },
            b: { text: '正直（しょうじき）に「わっちゃった」と いう', lamps: 2, future: [
              'dokidoki｜どきっと した。｜家（いえ）の 人（ひと）「えっ！ けがは ない？」｜かけらが ゆかに のこって いる。',
              'hotto｜すこし ほっと した。｜家（いえ）の 人（ひと）「いって くれて よかった」｜コップが 1こ へった まま。',
              'hotto｜こころは おちついて いる。｜家（いえ）の 人（ひと）は いつもどおり。｜つぎは きを つけたい。'] },
            c: { text: 'だまって 自分（じぶん）の へやに もどる', lamps: 1, future: [
              'hotto｜みつからずに ほっと した。｜家（いえ）の 人（ひと）「なんの おと？」と さがす。｜かけらで だれかが けがを するかも。',
              'hazukashii｜かおを あわせにくい。｜家（いえ）の 人（ひと）「だれが わったの？」｜いうか どうか まよう。',
              'kanashii｜こころに もやもやが のこる。｜家（いえ）の 人（ひと）が かなしそう。｜ほんとうの ことを いえて いない。'] },
            d: { text: 'あやまって、いっしょに かたづける', lamps: 3, future: [
              'dokidoki｜どきどき。でも いえた！｜家（いえ）の 人（ひと）「けがは ない？ いっしょに やろう」｜かたづければ おわり。',
              'sukkiri｜すっきり した。｜家（いえ）の 人（ひと）「すぐ いって くれて たすかった」｜ほとんど ない。',
              'jishin｜じしんが ついた。｜家（いえ）の 人（ひと）が しんじて くれる。｜つぎは もちかたに きを つける。'] }
          }
        }
      ]
    },
    {
      name: 'ともだち・部活（ぶかつ）',
      demo: [
        'ステップ2は、ともだちや 部活（ぶかつ）の ばめんだよ。',
        '4つの みちを よく みてね。',
        'あいての かおにも ちゅうもく しよう。',
        'こんどは じぶんで えらんで みよう！'
      ],
      scenes: [
        {
          id: 's2-1', use: true, skippable: false,
          title: 'かりた まんがを よごした',
          lines: ['ともだちに まんがを かりた。', 'ジュースを こぼして よごして しまった。'],
          who: 'ともだち', partner: 'tomodachi',
          order: ['d', 'a', 'c', 'b'],
          praise: 'すてき！ あやまって、いっしょに きめたね。',
          hint: 'ともだちが また かして くれるのは どれかな？',
          paths: {
            a: { text: '「さいしょから よごれてた」と ごまかす', lamps: 1, future: [
              'dokidoki｜いわずに すんだ。でも どきどき。｜ともだち「え？ まえは きれい だったよ」｜まんがは よごれた まま。',
              'moyamoya｜うそが きに なる。｜ともだちが もやもや した かお。｜ふたりの あいだが ぎくしゃく する。',
              'kanashii｜ともだちと はなしにくい。｜ともだちが ほかの 子（こ）と あそぶ。｜なかなおりの きっかけが ない。'] },
            b: { text: '正直（しょうじき）に「よごしちゃった」と いう', lamps: 2, future: [
              'dokidoki｜どきどき した。｜ともだち「えー、ざんねん」と がっかり。｜まんがは よごれた まま。',
              'hotto｜すこし ほっと した。｜ともだち「もう いいよ」。でも さびしそう。｜どう するか きまって いない。',
              'hotto｜こころは おちついて いる。｜ともだちとは ふつう。｜かりた ものに きを つけたい。'] },
            c: { text: 'かえさずに ともだちを さける', lamps: 1, future: [
              'hotto｜その ばは すんだ。｜ともだち「まんが まだ？」と さがす。｜へんじを して いない。',
              'dokidoki｜ともだちを みると どきっ。｜ともだち「どう したの？」と しんぱい。｜どんどん いいにくく なる。',
              'kanashii｜さけるのが つらい。｜ともだちが はなれて いく。｜なかよしが へるかも。'] },
            d: { text: 'あやまって、どう するか いっしょに きめる', lamps: 3, future: [
              'hotto｜いえて ほっと した。｜ともだち「おしえて くれて ありがとう」｜どう するか きめる。',
              'sukkiri｜いっしょに きめられて すっきり。｜ともだち「それで いいよ」と にっこり。｜きめた ことを する。',
              'jishin｜じしんが ついた。｜ともだちが また かして くれる。｜ほとんど ない。'] }
          }
        },
        {
          id: 's2-2', use: true, skippable: false,
          title: '当番（とうばん）を わすれた',
          lines: ['部活（ぶかつ）の じゅんびの 当番（とうばん）を わすれた。', 'なかまが こまって いる。'],
          who: '部活（ぶかつ）の なかま', partner: 'nakama',
          order: ['c', 'b', 'a', 'd'],
          praise: 'すてき！ かたづけを ひきうけて、なかまが たすかったね。',
          hint: 'なかまが「ありがとう」と いうのは どれかな？',
          paths: {
            a: { text: '「先生（せんせい）に よばれてた」と ごまかす', lamps: 1, future: [
              'dokidoki｜ほっと した。でも どきどき。｜なかま「そう なんだ」と しかたなさそう。｜じゅんびは なかまが やった まま。',
              'moyamoya｜うそが きに なる。｜なかま「先生（せんせい）に きいたけど…」｜うそが ばれそう。',
              'kanashii｜部活（ぶかつ）に いきにくい。｜なかまと すこし きょりが ある。｜しんじて もらいにくく なる。'] },
            b: { text: '正直（しょうじき）に「わすれてた」と いう', lamps: 2, future: [
              'dokidoki｜どきっと した。｜なかま「もう、こまったよ」｜なかまの もやもやが のこる。',
              'hotto｜すこし ほっと した。｜なかま「つぎは たのむね」｜つぎの 当番（とうばん）の 日（ひ）が あいまい。',
              'hotto｜ふつうに 部活（ぶかつ）が できる。｜なかまとは ふつう。｜わすれない くふうを したい。'] },
            c: { text: 'その 日（ひ）は 部活（ぶかつ）を 休（やす）む', lamps: 1, future: [
              'hotto｜その ばは あわずに すむ。｜なかま「どう したのかな」｜じゅんびは なかまが やる。',
              'moyamoya｜部活（ぶかつ）に いきにくい。｜なかま「きのう どう したの？」｜いいわけを かんがえて しまう。',
              'kanashii｜部活（ぶかつ）が つらく なって きた。｜なかまが さそいにくそう。｜すきな 部活（ぶかつ）が つらく なる。'] },
            d: { text: 'あやまって、かたづけを ひきうける', lamps: 3, future: [
              'hotto｜いえて ほっと した。｜なかま「ありがとう。たすかる」｜かたづけを する。',
              'sukkiri｜かたづけて すっきり。｜なかま「きのう ありがとう」｜当番（とうばん）の 日（ひ）を メモ した。',
              'jishin｜部活（ぶかつ）が たのしい。｜なかまが たよりに して くれる。｜ほとんど ない。'] }
          }
        },
        {
          id: 's2-3', use: true, skippable: false,
          title: 'メッセージの へんじを わすれた',
          lines: ['ともだちの さそいに へんじを わすれた。', '「むし した？」と メッセージが きた。'],
          who: 'ともだち', partner: 'tomodachi',
          order: ['b', 'a', 'd', 'c'],
          praise: 'すてき！ あやまって、さそいにも こたえたね。',
          hint: 'いっしょに あそべるのは どれかな？',
          paths: {
            a: { text: '「スマホが こわれてた」と ごまかす', lamps: 1, future: [
              'dokidoki｜ほっと した。でも どきどき。｜ともだち「そう なんだ」｜うそが のこる。',
              'moyamoya｜うそが きに なる。｜ともだち「ほかの 子（こ）には へんじ してたよね？」｜うそが ばれそう。',
              'kanashii｜メッセージを ひらくのが こわい。｜ともだちが すこし しんじにくそう。｜やりとりが へって いく。'] },
            b: { text: '正直（しょうじき）に「みおとしてた」と かく', lamps: 2, future: [
              'dokidoki｜すこし どきっと した。｜ともだち「そっか、わかった」｜さそいの へんじが まだ。',
              'hotto｜すこし すっきり した。｜ともだちは ふつう。｜さそいに こたえて いない。',
              'hotto｜こころは おちついて いる。｜ともだちは いつもどおり。｜また みおとす かも。'] },
            c: { text: 'へんじを しないで そのままに する', lamps: 1, future: [
              'hotto｜いまは かんがえずに すむ。｜ともだち「むし されてる？」と かなしい。｜メッセージが たまって いく。',
              'moyamoya｜スマホを みるのが いや。｜ともだちが 学校（がっこう）で 目（め）を そらす。｜ごかいが 大（おお）きく なる。',
              'kanashii｜きまずい まま。｜ともだちが ほかの 子（こ）と あそぶ。｜なかなおりが むずかしい。'] },
            d: { text: 'あやまって、さそいに こたえる', lamps: 3, future: [
              'hotto｜おくれて ほっと した。｜ともだち「よかった！」｜あしたの やくそくを する。',
              'sukkiri｜いっしょに あそべた。｜ともだちが にこにこ して いる。｜ほとんど ない。',
              'jishin｜メッセージが たのしい。｜ともだちと なかよし。｜へんじを わすれない くふう。'] }
          }
        }
      ]
    },
    {
      name: 'きもちが つよい とき',
      demo: [
        'かっと したら、まず 3（さん）びょう。',
        'いっしょに しんこきゅう しよう。すって… はいて…。',
        'いまの きもちに 名前（なまえ）を つけよう。',
        'それから みちを えらぼう！'
      ],
      demoFeeling: { face: 'iraira', word: '「いま、くやしい」' },
      scenes: [
        {
          id: 's3-1', use: true, skippable: false,
          title: 'しあいで まけた',
          lines: ['部活（ぶかつ）の しあいで まけた。', 'あいてが よろこんで いる。くやしい。'],
          who: '部活（ぶかつ）の なかま', partner: 'nakama', feeling: 'くやしい',
          order: ['a', 'd', 'b', 'c'],
          praise: 'すごい！ 3（さん）びょう まって、「つぎ がんばろう」と いえたね。',
          hint: 'くやしさが「がんばろう」に かわるのは どれかな？',
          paths: {
            a: { text: 'どうぐを なげて、大（おお）きな こえで どなる', lamps: 1, future: [
              'iraira｜すっと した きが する。でも むねが あつい。｜まわりが びっくり して しずかに なる。｜先生（せんせい）に よばれる かも。',
              'hazukashii｜きのうの ことが はずかしい。｜なかまが すこし こわがって いる。｜あやまる きっかけを さがす。',
              'moyamoya｜もやもやが のこる。｜なかま「また おこるかな」と しんぱい。｜いっしょに れんしゅう しにくい。'] },
            b: { text: '「くやしい」と ことばで いう', lamps: 2, future: [
              'iraira｜きもちを ことばに できた。｜なかま「わかる、くやしいよね」｜むねは まだ どきどき。',
              'hotto｜すこし おちついた。｜なかまは ふつうに はなす。｜つぎ どう するか まだ きめて いない。',
              'hotto｜こころは おちついて いる。｜なかまが れんしゅうに さそう。｜れんしゅう したい きもち。'] },
            c: { text: 'だまって ひとりで かえる', lamps: 1, future: [
              'kanashii｜はなれたけど くやしい まま。｜なかま「どこ いくの？」｜くやしさが こころに のこる。',
              'moyamoya｜また くやしさを おもいだす。｜なかまが はなしかけて いいか まよう。｜つぎも にげたく なる かも。',
              'kanashii｜部活（ぶかつ）が いやに なって きた。｜なかまが あまり さそわない。｜たのしい ことが へる。'] },
            d: { text: '3（さん）びょう しんこきゅう して「つぎ がんばろう」と いう', lamps: 3, future: [
              'hotto｜いきを はいたら すこし らく。｜なかま「つぎ いっしょに がんばろう」｜くやしさは すこし のこる。',
              'hotto｜おちついて いる。｜なかま「いっしょに れんしゅう する？」｜れんしゅうの やくそくを した。',
              'jishin｜れんしゅう して じしんが ついた。｜なかまと もっと なかよく なった。｜ほとんど ない。'] }
          }
        },
        {
          // つらい生徒がいるかもしれない場面。「この ばめんを とばす」ボタンが出る。外すときは use: false
          id: 's3-2', use: true, skippable: true,
          title: 'メッセージで からかわれた',
          lines: ['グループの メッセージで からかわれた。', 'かっと なった。'],
          who: 'からかった 人（ひと）・グループ', partner: { a: 'group', b: 'group', c: 'group', d: 'otona' }, feeling: 'いかり',
          order: ['c', 'd', 'a', 'b'],
          praise: 'すごい！ スマホを おいて、おとなに そうだん できたね。',
          hint: 'ひとりで かかえこまないのは どれかな？',
          paths: {
            a: { text: 'すぐに つよい ことばで いいかえす', lamps: 1, future: [
              'iraira｜すっと した きが する。でも むねが あつい。｜あいてから もっと つよい ことばが くる。｜いいあいが ひろがる。',
              'iraira｜まだ いらいら する。｜グループの みんなが だまって しまう。｜自分（じぶん）の ことばも のこって いる。',
              'kanashii｜グループを みるのが つらい。｜あいてと さけあう。｜もんだいが 大（おお）きく なる かも。'] },
            b: { text: '「その いいかた、いやだ」と かく', lamps: 2, future: [
              'dokidoki｜いえた。でも どきどき。｜あいて「じょうだん だよ」｜きもちは まだ もやもや。',
              'hotto｜すこし おちついた。｜あいてが「ごめん」と かいた。｜まわりの 目（め）が きに なる。',
              'hotto｜こころは おちついて いる。｜あいては ふつう。｜また ある かも。'] },
            c: { text: 'だまって ひとりで がまん する', lamps: 1, future: [
              'kanashii｜けんかに ならない。でも つらい。｜あいては きづかずに つづける。｜いやな ことばが のこって いる。',
              'iraira｜おもいだして いらいら する。｜あいてが また かく。｜いやな ことが つづく。',
              'kanashii｜スマホを みるのが こわい。｜あいては かわらない。｜ひとりで かかえこんで しまう。'] },
            d: { text: 'スマホを おいて 3（さん）びょう。おとなに そうだん する', lamps: 3, future: [
              'hotto｜いきを はいたら すこし おちついた。｜おとな「おしえて くれて ありがとう」｜どう するか いっしょに かんがえる。',
              'hotto｜ひとりじゃ ないと ほっと した。｜おとなが いっしょに うごいて くれる。｜すこしずつ よく なって いる。',
              'jishin｜あんしん して すごせる。｜おとなが みまもって くれて いる。｜こまったら また そうだん できる。'] }
          }
        }
      ]
    }
  ],

  review: {
    head: 'めいきゅうを ぬけたね！',
    picked: 'きみが えらんだ みち',
    done: [
      '3（さん）びょう まって かんがえられたね。',
      '気持（きも）ちと あいての ようすを みられたね。',
      'あかるい みらいの みちを みつけたね。'
    ],
    tips: [
      { img: 'tip-1.png', text: 'ゆっくり いきを すって、はく' },
      { img: 'tip-2.png', text: 'いまの きもちに 名前（なまえ）を つける' },
      { img: 'tip-3.png', text: 'あいての きもちを そうぞう する' }
    ],
    closing: [
      'こまったら、ほんとうの ことを いおう。',
      'こまったら、おとなに そうだん しよう。',
      'また めいきゅうに きてね。'
    ]
  }
};

/* =========================================================
   ここから下は プログラム（ふつうは さわらなくて大丈夫）
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 3D と 音: ファイルが無くても動くように ---------- */
  const noop = function () {};
  window.Motion3D = window.Motion3D || {
    init: noop, setScene: noop, celebrate: noop, encourage: noop,
    stepClear: function () { return Promise.resolve(); }, setReducedMotion: noop
  };
  window.Sound = window.Sound || { start: noop, stop: noop, setMuted: noop, play: noop };
  function call(name, fn) {
    const args = Array.prototype.slice.call(arguments, 2);
    try {
      const o = window[name];
      if (o && typeof o[fn] === 'function') return o[fn].apply(o, args);
    } catch (e) { console.warn(name + '.' + fn, e); }
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- 画面の大きさ（design.md 4章） ---------- */
  function fitStage() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    document.documentElement.style.setProperty('--stage-scale', s);
    state.scale = s;
  }

  /* ---------- 文字: ふりがな と 読み上げ用 ---------- */
  const RUBY = /([0-9０-９一-龠々〆ヶ]+)（([ぁ-んゃゅょっー]+)）/g;
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function rb(s) { return esc(s).replace(RUBY, '<ruby>$1<rt>$2</rt></ruby>'); }
  function kana(s) { return String(s).replace(RUBY, '$2'); }

  /* ---------- 設定（localStorage は失敗しても動く） ---------- */
  const KEY = 'choice-maze-settings';
  function loadSettings() {
    let low = false;
    try { low = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    const s = { muted: false, low: low };
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) Object.assign(s, JSON.parse(raw));
    } catch (e) {}
    return s;
  }
  function saveSettings() {
    try { localStorage.setItem(KEY, JSON.stringify(state.settings)); } catch (e) {}
  }

  /* ---------- 状態 ---------- */
  const state = {
    scale: 1,
    settings: loadSettings(),
    stepIdx: 0, sceneIdx: 0,
    demoDone: [false, false, false],
    record: {},          // id -> { first, seen: [] }
    skipped: {},
    sc: null,            // いまの場面の作業用
    read: '',
    timers: [],
    keyPick: null,       // 1〜4キー
    where: 'title'
  };

  const $ = (id) => document.getElementById(id);
  const el = {
    stage: $('stage'), screen: $('screen'), progress: $('progress'), label: $('progLabel'),
    dots: $('dots').children, bottombar: $('bottombar'), read: $('btnRead'),
    guide: $('guide'), guideText: $('guideText'), sub: $('btnSub'), next: $('btnNext'),
    pointer: $('pointer'), ctrlSound: $('ctrlSound'), ctrlMotion: $('ctrlMotion'),
    ctrlBack: $('ctrlBack'), ctrlBackState: $('ctrlBackState')
  };

  function steps() { return LESSON.steps; }
  function scenesOf(i) { return steps()[i].scenes.filter((s) => s.use !== false); }
  // 絵がまだ無いときは、とうめいな絵に入れかえて 生成りの布のままにする
  const MISSING = "this.onerror=null;this.src=\'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7\';this.classList.add(\'is-missing\')";
  function img(name, alt, cls) {
    return '<img src="assets/img/' + name + '" alt="' + esc(alt || '') + '"' + (cls ? ' class="' + cls + '"' : '') + ' onerror="' + MISSING + '">';
  }
  function parseFuture(str) {
    const p = String(str).split('｜');
    return { face: p[0], feel: p[1] || '', partner: p[2] || '', next: p[3] || '' };
  }
  function partnerOf(scene, k) {
    return typeof scene.partner === 'string' ? scene.partner : (scene.partner && scene.partner[k]) || 'tomodachi';
  }
  function letter(k) { return k.toUpperCase(); }
  function markHTML(k) {
    return '<span class="cm-choice__mark cm-mark--' + k + '" aria-hidden="true">' + letter(k) + '</span>';
  }
  function lampsHTML(n, opt) {
    opt = opt || {};
    let h = '<div class="cm-lamps' + (opt.lg ? ' cm-lamps--lg' : '') + (opt.cls ? ' ' + opt.cls : '') + '" role="img" aria-label="' +
      (opt.unknown ? 'まだ みて いない' : 'ランプ ' + n + 'こ') + '">';
    for (let i = 0; i < 3; i++) {
      const c = opt.unknown ? ' is-unknown' : (!opt.dark && i < n ? ' is-on' : '');
      h += '<span class="cm-lamp' + c + '"></span>';
    }
    return h + '</div>';
  }
  function pathSpeak(k) { return LESSON.marks[k] + ' ' + letter(k); }

  /* ---------- 画面を切りかえる（ここが土台） ---------- */
  function clearTimers() { state.timers.forEach(clearTimeout); state.timers.forEach(clearInterval); state.timers = []; }
  function later(fn, ms) { const t = setTimeout(fn, ms); state.timers.push(t); return t; }

  /**
   * o: { html, label, dot (0-2 / 'all' / null), read, guide, next:{label,fn}, sub:{label,fn},
   *      cls, demo, title, point, focus }
   */
  function setScreen(o) {
    clearTimers();
    try { speechSynthesis.cancel(); } catch (e) {}
    state.keyPick = null;
    hidePointer();

    document.documentElement.classList.toggle('is-title', !!o.title);
    el.screen.className = 'cm-screen is-active' + (o.title ? ' cm-title-screen' : '') + (o.demo ? ' is-demo' : '') + (o.cls ? ' ' + o.cls : '');
    el.screen.innerHTML = o.title ? o.html : '<div class="cm-main" id="main" tabindex="-1">' + o.html + '</div>';

    el.label.innerHTML = rb(o.label || '');
    for (let i = 0; i < 3; i++) {
      const d = el.dots[i];
      d.classList.remove('is-now', 'is-done');
      d.removeAttribute('aria-current');
      if (o.dot === 'all' || (typeof o.dot === 'number' && i < o.dot)) d.classList.add('is-done');
      else if (o.dot === i) { d.classList.add('is-now'); d.setAttribute('aria-current', 'step'); }
    }
    el.progress.querySelector('.cm-dots').style.visibility = o.dot == null ? 'hidden' : 'visible';

    state.read = o.read || '';
    setGuide(o.guide);
    setBtn(el.next, o.next);
    setBtn(el.sub, o.sub);
    el.bottombar.classList.toggle('has-wide-right', !!o.sub);

    el.ctrlBack.disabled = state.where === 'title';
    el.ctrlBackState.textContent = state.where === 'play' ? 'ちず' : 'はじめ';

    if (o.point) later(() => pointTo(o.point), 60);
    const f = o.focus ? el.screen.querySelector(o.focus) : $('main');
    if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
  }
  function setBtn(b, cfg) {
    if (!cfg) { b.hidden = true; b.onclick = null; return; }
    b.hidden = false;
    b.innerHTML = rb(cfg.label);
    b.onclick = () => { call('Sound', 'play', 'tap'); cfg.fn(); };
  }
  function setGuide(text) {
    if (!text) { el.guide.hidden = true; return; }
    el.guide.hidden = false;
    el.guideText.innerHTML = rb(text);
  }
  function addPaper(kind, text, iconSrc) {
    const p = document.createElement('div');
    p.className = 'cm-' + kind + ' cm-paper';
    p.setAttribute('role', 'status');
    p.innerHTML = '<img class="cm-' + kind + '__icon" src="' + iconSrc + '" alt="">' +
      '<p class="cm-' + kind + '__text">' + rb(text) + '</p>';
    el.screen.appendChild(p);
    el.guide.hidden = true;
    state.read = kana(text);
  }

  /* ---------- 指さしの輪（おてほん） ---------- */
  function pointTo(sel) {
    const t = typeof sel === 'string' ? el.screen.querySelector(sel) : sel;
    if (!t) return;
    const r = t.getBoundingClientRect(), s = el.stage.getBoundingClientRect(), k = state.scale || 1;
    const x = (r.left + r.width / 2 - s.left) / k, y = (r.top + r.height / 2 - s.top) / k;
    el.pointer.hidden = false;
    el.pointer.style.left = (x - 70) + 'px';
    el.pointer.style.top = (y - 70) + 'px';
  }
  function hidePointer() { el.pointer.hidden = true; }
  function centerOf(node) {
    const r = node.getBoundingClientRect();
    return [r.left + r.width / 2, r.top + r.height / 2];
  }
  function celebrateAt(node) {
    if (!node) return;
    const c = centerOf(node);
    call('Motion3D', 'celebrate', c[0], c[1]);
  }

  /* ---------- 見通し ---------- */
  function stepLabel(extra) { return 'ステップ' + (state.stepIdx + 1) + '　' + extra; }
  function sceneLabel() {
    const list = scenesOf(state.stepIdx);
    return stepLabel('ばめん ' + (state.sceneIdx + 1) + '/' + list.length);
  }

  /* =========================================================
     ビュー（HTMLを作るだけ）
     ========================================================= */
  function viewScene(scene) {
    const lines = scene.lines.map((l) => '<p class="cm-scene__line">' + rb(l) + '</p>').join('');
    return {
      html: '<div class="cm-scene">' +
        '<div class="cm-scene__art">' + img('scene-' + scene.id + '.png', kana(scene.title)) + '</div>' +
        '<div class="cm-scene__text cm-paper">' + lines +
          '<span class="cm-scene__who">あいて: ' + rb(scene.who) + '</span>' +
          (scene.feeling ? '<span class="cm-scene__feel">きもち: ' + rb(scene.feeling) + '</span>' : '') +
        '</div></div>',
      read: scene.lines.map(kana).join(' ') + ' あいては ' + kana(scene.who) + '。'
    };
  }

  function viewBreath(askText) {
    const ask = askText || LESSON.words.breathAsk;
    return {
      html: '<div class="cm-breath">' +
        '<p class="cm-breath__ask cm-paper">' + rb(ask) + '</p>' +
        '<div class="cm-breath__col">' +
          '<div class="cm-breath__ringwrap"><div class="cm-breath__ring"></div><div class="cm-breath__word" id="breathWord">' + rb(LESSON.words.breathIn) + '</div></div>' +
          '<ol class="cm-breath__beads" aria-label="3びょう"><li class="cm-breath__bead">1</li><li class="cm-breath__bead">2</li><li class="cm-breath__bead">3</li></ol>' +
        '</div><div></div></div>',
      read: kana(ask) + '。 ' + kana(LESSON.words.breathIn) + ' ' + kana(LESSON.words.breathOut),
      mount: function () {
        // 4秒すう・4秒はく。数珠は1秒に1つ。3つ うまっても何も起きない（時間切れではない）
        const word = $('breathWord');
        let inhale = true;
        const t1 = setInterval(() => { inhale = !inhale; if (word) word.innerHTML = rb(inhale ? LESSON.words.breathIn : LESSON.words.breathOut); }, 4000);
        state.timers.push(t1);
        const beads = el.screen.querySelectorAll('.cm-breath__bead');
        beads.forEach((b, i) => later(() => b.classList.add('is-done'), 1000 * (i + 1)));
      }
    };
  }

  // まとめの問いでも使う。opt: { sum, seen:Set, known:Set, dim:[], guided, picked, hinted }
  function viewChoices(scene, opt) {
    opt = opt || {};
    const prompt = opt.sum ? LESSON.words.sumAsk : LESSON.words.choose;
    let html = '<p class="cm-prompt">' + rb(prompt) + '</p><ul class="cm-choices">';
    const reads = [kana(prompt)];
    scene.order.forEach((k, i) => {
      const p = scene.paths[k];
      const seen = opt.seen && opt.seen.has(k);
      const known = seen || (opt.known && opt.known.has(k));
      const dim = opt.dim && opt.dim.indexOf(k) >= 0;
      const cls = 'cm-choice cm-fringe' + (opt.picked === k ? ' is-picked' : '') + (dim ? ' is-dimmed' : '') + (opt.guided === k ? ' is-guided' : '');
      html += '<li><button type="button" class="' + cls + '" data-k="' + k + '"' + (dim ? ' disabled' : '') +
        ' aria-label="' + (i + 1) + 'ばん ' + pathSpeak(k) + ' ' + esc(kana(p.text)) + (seen ? ' みた' : '') + '">' +
        markHTML(k) + '<span class="cm-choice__key" aria-hidden="true">' + (i + 1) + '</span>' +
        (seen ? '<span class="cm-seen-stamp" aria-hidden="true">みた</span>' : '') +
        '<span class="cm-choice__art">' + img('choice-' + scene.id + '-' + k + '.png', '') + '</span>' +
        '<span class="cm-choice__text">' + rb(p.text) + '</span>' +
        (opt.sum ? '<span class="cm-choice__lamps' + (opt.hinted && known ? ' is-hinted' : '') + '">' + lampsHTML(p.lamps, { unknown: !known }) + '</span>' : '') +
        '</button></li>';
      reads.push((i + 1) + 'ばん、' + kana(p.text));
    });
    html += '</ul>';
    return { html: html, read: reads.join('。 ') };
  }

  function viewFutureCard(scene, k, t, mini, lampsDark) {
    const f = parseFuture(scene.paths[k].future[t]);
    const faceName = LESSON.faces[f.face] || '';
    const who = partnerOf(scene, k), mood = (LESSON.partnerMood[k] || [])[t] || 'futsuu';
    const showLamps = t === 2;
    const label = mini ? LESSON.times[t] : scene.paths[k].text;
    const html = '<article class="cm-future cm-paper cm-fringe cm-fringe--side' + (mini ? ' cm-future--mini' : ' cm-flip') + '" data-k="' + k + '" data-lamps="' + scene.paths[k].lamps + '">' +
      '<div class="cm-future__path">' + markHTML(k) + '<span>' + rb(label) + '</span></div>' +
      (showLamps ? '<div class="cm-future__lamps">' + lampsHTML(scene.paths[k].lamps, { lg: !mini, dark: lampsDark }) + '</div>' : '') +
      '<div class="cm-future__face">' + img('face-' + f.face + '.png', '') + '<span class="cm-future__feel">' + esc(faceName) + '</span></div>' +
      '<div class="cm-future__body">' +
        '<div class="cm-future__row cm-future__row--noicon"><div><span class="cm-future__tag">きもち</span><p class="cm-future__text">' + rb(f.feel) + '</p></div></div>' +
        '<div class="cm-future__row cm-future__partner"><img src="assets/img/partner-' + who + '-' + mood + '.png" alt="" onerror="' + MISSING + '"><div><span class="cm-future__tag">あいての はんのう</span><p class="cm-future__text">' + rb(f.partner) + '</p></div></div>' +
        '<div class="cm-future__row"><img src="assets/svg/signpost.svg" alt=""><div><span class="cm-future__tag">つぎの もんだい</span><p class="cm-future__text">' + rb(f.next) + '</p></div></div>' +
      '</div></article>';
    const read = LESSON.times[t] + '。 きもちは ' + faceName + '。 ' + kana(f.feel) + ' あいての はんのう。 ' + kana(f.partner) + ' つぎの もんだい。 ' + kana(f.next);
    return { html: html, read: read };
  }

  function viewFuture(scene, k, t) {
    let tl = '<ol class="cm-timeline">';
    LESSON.times.forEach((name, i) => {
      tl += '<li class="cm-timeline__knot' + (i < t ? ' is-done' : '') + (i === t ? ' is-now' : '') + '"' + (i === t ? ' aria-current="step"' : '') +
        '><span class="cm-timeline__label">' + esc(name) + '</span></li>';
    });
    tl += '</ol>';
    const card = viewFutureCard(scene, k, t, false, true);
    return { html: tl + card.html, read: card.read };
  }

  /* =========================================================
     タイトル
     ========================================================= */
  function showTitle() {
    state.where = 'title';
    call('Motion3D', 'setScene', 'title');
    setScreen({
      title: true,
      html: '<div class="cm-title-banner cm-paper cm-fringe">' +
        '<h1 class="cm-title__main">せんたくの<br>めいきゅう</h1>' +
        '<p class="cm-title__sub">' + rb(LESSON.subtitle) + '</p></div>' +
        '<button type="button" class="cm-btn cm-btn--primary cm-start-btn" id="btnStart">はじめる</button>',
      read: kana(LESSON.title) + '。 ' + kana(LESSON.subtitle) + '。 はじめる ボタンを おしてね。',
      focus: '#btnStart'
    });
    $('btnStart').onclick = () => {
      call('Sound', 'setMuted', state.settings.muted);
      call('Sound', 'start');
      call('Sound', 'play', 'tap');
      resetRun();
      showMap();
    };
  }
  function resetRun() {
    state.stepIdx = 0; state.sceneIdx = 0;
    state.demoDone = steps().map(() => false);
    state.record = {}; state.skipped = {};
  }

  /* =========================================================
     迷宮の地図
     ========================================================= */
  function showMap() {
    state.where = 'map';
    call('Motion3D', 'setScene', 'play');
    let html = '<div class="cm-map"><div class="cm-map__path" aria-hidden="true"></div><ol class="cm-map__nodes">';
    steps().forEach((st, i) => {
      const list = scenesOf(i);
      const done = list.filter((s) => state.record[s.id] || state.skipped[s.id]).length;
      const now = i === state.stepIdx;
      html += '<li><button type="button" class="cm-map__node' + (now ? ' is-now' : '') + '" data-i="' + i + '"' + (now ? '' : ' disabled') + '>' +
        '<span class="cm-paper cm-fringe">' + img('map-step' + (i + 1) + '.png', '') +
        '<span class="cm-map__name">ステップ' + (i + 1) + '</span>' +
        '<span class="cm-map__sub">' + rb(st.name) + '</span></span>' +
        '<span class="cm-map__lampwrap">' + lampsLine(list.length, done) + '</span>' +
        '</button></li>';
    });
    html += '</ol></div>';
    const st = steps()[state.stepIdx];
    setScreen({
      html: html, label: 'めいきゅうの ちず', dot: null,
      read: 'めいきゅうの ちず。 つぎは ステップ' + (state.stepIdx + 1) + '、' + kana(st.name) + '。',
      guide: 'つぎは ステップ' + (state.stepIdx + 1) + '。「' + st.name + '」の ばめんだよ。',
      next: { label: 'つぎへ', fn: enterStep }
    });
    const node = el.screen.querySelector('.cm-map__node.is-now');
    if (node) node.onclick = () => { call('Sound', 'play', 'tap'); enterStep(); };
  }
  function lampsLine(total, lit) {
    let h = '<span class="cm-lamps" role="img" aria-label="' + total + 'この うち ' + lit + 'こ できた">';
    for (let i = 0; i < total; i++) h += '<span class="cm-lamp' + (i < lit ? ' is-on' : '') + '"></span>';
    return h + '</span>';
  }
  function enterStep() {
    state.where = 'play';
    call('Motion3D', 'setScene', 'play');
    if (!state.demoDone[state.stepIdx]) runDemo(state.stepIdx);
    else playScene();
  }

  /* =========================================================
     おてほん（ひかりさんが やって見せる。「つぎへ」で自分のペースで進む）
     ========================================================= */
  function runDemo(i) {
    const st = steps()[i];
    const g = st.demo || [];
    const label = stepLabel('おてほん');
    const finish = () => { state.demoDone[i] = true; state.sceneIdx = 0; playScene(); };
    let beats = [];

    if (i === 0) {
      const sc = findScene('s1-1') || scenesOf(0)[0];
      if (!sc) return finish();
      const best = LESSON.best, other = sc.order.filter((k) => k !== best)[0];
      const seen = new Set([best]);
      beats = [
        () => Object.assign(viewScene(sc), { dot: 0, guide: g[0] }),
        () => Object.assign(viewBreath(), { dot: 0, guide: g[1] }),
        () => Object.assign(viewChoices(sc), { dot: 0, guide: g[2], point: '[data-k="' + best + '"] .cm-choice__art' }),
        () => Object.assign(viewChoices(sc, { picked: best }), { dot: 0, guide: g[3] }),
        () => Object.assign(viewFuture(sc, best, 0), { dot: 1, guide: LESSON.words.futureEach }),
        () => Object.assign(viewFuture(sc, best, 1), { dot: 1, guide: LESSON.words.futureEach }),
        () => Object.assign(viewFuture(sc, best, 2), { dot: 1, guide: LESSON.words.futureEndBest, lightK: best }),
        () => Object.assign(viewOther(sc, best, seen, true), { dot: 1, guide: g[4], point: '#btnMore' }),
        () => Object.assign(viewChoices(sc, { seen: seen }), { dot: 0, guide: g[5], point: '[data-k="' + other + '"] .cm-choice__art' }),
        () => Object.assign(viewFuture(sc, other, 2), { dot: 1, guide: LESSON.words.futureEndOther, lightK: other }),
        () => Object.assign(viewCompare(sc, [best, other], LESSON.words.hint2Head), { dot: 2, guide: g[6], point: '.cm-compare .cm-future__lamps' }),
        () => ({ html: demoEnd(), dot: null, guide: g[7] })
      ];
    } else if (i === 1) {
      const sc = findScene('s2-1') || scenesOf(1)[0];
      if (!sc) return finish();
      beats = [
        () => Object.assign(viewScene(sc), { dot: 0, guide: g[0] }),
        () => Object.assign(viewChoices(sc), { dot: 0, guide: g[1] }),
        () => Object.assign(viewFuture(sc, LESSON.best, 0), { dot: 1, guide: g[2], point: '.cm-future__partner img' }),
        () => ({ html: demoEnd(), dot: null, guide: g[3] })
      ];
    } else {
      const fe = st.demoFeeling || { face: 'iraira', word: 'くやしい' };
      beats = [
        () => Object.assign(viewBreath(g[0]), { dot: 0, guide: g[1] }),
        () => ({ dot: 0, guide: g[2], read: kana(g[2]) + ' ' + kana(fe.word),
          html: '<div class="cm-name">' + img('face-' + fe.face + '.png', '') +
            '<div class="cm-paper"><p class="cm-name__ask">いまの きもちに なまえを つけよう</p><p class="cm-name__word">' + rb(fe.word) + '</p></div></div>' }),
        () => ({ html: demoEnd(), dot: null, guide: g[3] })
      ];
    }

    let n = 0;
    const show = () => {
      const v = beats[n]();
      const last = n === beats.length - 1;
      setScreen({
        html: v.html, label: label, dot: v.dot, demo: true,
        read: (v.guide ? kana(v.guide) + ' ' : '') + (v.read || ''),
        guide: v.guide, point: v.point,
        next: { label: last ? 'やって みる' : 'つぎへ', fn: () => { n++; if (n < beats.length) show(); else finish(); } }
      });
      if (v.mount) v.mount();
      if (v.lightK) lightLamps(null);
    };
    show();
  }
  function demoEnd() {
    return '<div class="cm-clear"><img class="cm-clear__stamp" src="assets/svg/hikari.svg" alt="" style="width:280px;height:280px">' +
      '<div class="cm-paper"><p class="cm-clear__sub">おてほんは ここまで。</p></div></div>';
  }
  function findScene(id) {
    for (const st of steps()) for (const s of st.scenes) if (s.id === id && s.use !== false) return s;
    return null;
  }

  /* =========================================================
     1つの場面
     ========================================================= */
  function currentScene() { return scenesOf(state.stepIdx)[state.sceneIdx]; }

  function playScene() {
    const scene = currentScene();
    if (!scene) return showClear();
    state.sc = { scene: scene, seen: new Set(), known: new Set(), first: null, tries: 0, dim: null, guided: null, hinted: false };
    showScene();
  }
  function skipBtn() {
    const s = state.sc && state.sc.scene;
    return s && s.skippable ? { label: LESSON.words.skip, fn: skipScene } : null;
  }
  function skipScene() {
    state.skipped[state.sc.scene.id] = true;
    nextScene();
  }

  function showScene() {
    const v = viewScene(state.sc.scene);
    setScreen({
      html: v.html, label: sceneLabel(), dot: 0,
      read: v.read, guide: state.sceneIdx === 0 && !state.sc.scene.skippable ? LESSON.words.sceneLead : null,
      next: { label: 'つぎへ', fn: showBreath }, sub: skipBtn()
    });
  }

  function showBreath() {
    const v = viewBreath();
    setScreen({
      html: v.html, label: sceneLabel(), dot: 0, read: v.read,
      next: { label: 'つぎへ', fn: () => showChoose(LESSON.words.afterBreath) }, sub: skipBtn()
    });
    v.mount();
  }

  function showChoose(guide) {
    const sc = state.sc;
    const v = viewChoices(sc.scene, { seen: sc.seen });
    setScreen({
      html: v.html, label: sceneLabel(), dot: 0, read: v.read,
      guide: guide || LESSON.words.chooseGuide, sub: skipBtn()
    });
    bindChoices((k, btn) => {
      call('Sound', 'play', 'tap');
      btn.classList.add('is-picked');
      lockChoices();
      if (!sc.first) sc.first = k;
      later(() => showFuture(k, 0), state.settings.low ? 150 : 450);
    });
  }

  function bindChoices(onPick) {
    const btns = Array.from(el.screen.querySelectorAll('.cm-choice'));
    btns.forEach((b) => { b.onclick = () => { if (!b.disabled && !b.dataset.locked) onPick(b.dataset.k, b); }; });
    state.keyPick = (n) => { const b = btns[n - 1]; if (b && !b.disabled) { b.focus(); b.click(); } };
  }
  function lockChoices() {
    el.screen.querySelectorAll('.cm-choice').forEach((b) => { b.dataset.locked = '1'; });
    state.keyPick = null;
  }

  function showFuture(k, t) {
    const sc = state.sc;
    const v = viewFuture(sc.scene, k, t);
    const last = t === 2;
    setScreen({
      html: v.html, label: sceneLabel(), dot: 1, read: v.read,
      guide: t === 0 ? null : LESSON.words.futureEach,
      next: { label: last ? 'つぎへ' : 'つぎ', fn: last ? () => { sc.seen.add(k); showOther(k); } : () => showFuture(k, t + 1) }
    });
    if (last) {
      lightLamps(() => {
        if (k === LESSON.best) {
          call('Sound', 'play', 'correct');
          celebrateAt(el.screen.querySelector('.cm-future__lamps'));
          setGuide(LESSON.words.futureEndBest);
        } else {
          setGuide(LESSON.words.futureEndOther);
        }
      });
    }
  }
  // 1しゅうかんごのランプを 1つずつ点ける（0.3秒ずつ）
  function lightLamps(done) {
    const card = el.screen.querySelector('.cm-future:not(.cm-future--mini)');
    const lamps = card ? Array.from(card.querySelectorAll('.cm-future__lamps .cm-lamp')) : [];
    const count = Math.min(card ? Number(card.dataset.lamps) || 0 : 0, lamps.length);
    const low = state.settings.low;
    for (let i = 0; i < count; i++) {
      later(() => {
        lamps[i].classList.add('is-on');
        if (!low) { lamps[i].classList.add('is-pop'); later(() => lamps[i].classList.remove('is-pop'), 300); }
      }, low ? 0 : 500 + i * 300);
    }
    if (done) later(done, low ? 50 : 500 + count * 300 + 100);
  }

  function viewOther(scene, k, seen, demo) {
    const card = viewFutureCard(scene, k, 2, true);
    const all = scene.order.every((x) => seen.has(x));
    let list = '<ul class="cm-other__seen">';
    ['a', 'b', 'c', 'd'].forEach((x) => { list += '<li>' + markHTML(x) + (seen.has(x) ? 'みた' : 'まだ') + '</li>'; });
    list += '</ul>';
    return {
      html: '<div class="cm-other">' + card.html + '<div>' +
        '<p class="cm-other__ask">' + rb(all ? LESSON.words.otherAll : LESSON.words.otherAsk) + '</p>' +
        '<div class="cm-other__btns">' +
          (all ? '' : '<button type="button" class="cm-btn" id="btnMore">みる</button>') +
          '<button type="button" class="cm-btn cm-btn--primary" id="btnOn">つぎへ</button>' +
        '</div>' + list + '</div></div>',
      read: (all ? kana(LESSON.words.otherAll) : kana(LESSON.words.otherAsk) + ' みる か、つぎへ を おしてね。')
    };
  }

  function showOther(k) {
    const sc = state.sc;
    const v = viewOther(sc.scene, k, sc.seen);
    setScreen({ html: v.html, label: sceneLabel(), dot: 1, read: v.read, focus: '#btnOn' });
    const more = $('btnMore');
    if (more) more.onclick = () => { call('Sound', 'play', 'tap'); showChoose(); };
    $('btnOn').onclick = () => { call('Sound', 'play', 'tap'); showSum(); };
  }

  /* ---------- まとめの問い ---------- */
  function showSum(extra) {
    const sc = state.sc;
    const v = viewChoices(sc.scene, { sum: true, seen: sc.seen, known: sc.known, dim: sc.dim, guided: sc.guided, hinted: sc.hinted });
    setScreen(Object.assign({
      html: v.html, label: sceneLabel(), dot: 2, read: v.read, cls: 'is-sum'
    }, extra || {}));
    bindChoices(sumPick);
  }

  function sumPick(k, btn) {
    const sc = state.sc;
    if (k === LESSON.best) {
      call('Sound', 'play', 'correct');
      btn.classList.add('is-picked');
      lockChoices();
      hidePointer();
      celebrateAt(btn);
      for (let i = 0; i < 3; i++) { el.dots[i].classList.remove('is-now'); el.dots[i].classList.add('is-done'); }
      addPaper('praise', sc.scene.praise, 'assets/svg/hikari.svg');
      setBtn(el.next, { label: 'つぎへ', fn: finishScene });
      later(() => el.next.focus(), 100);
      return;
    }
    sc.tries++;
    call('Sound', 'play', 'retry');
    call('Motion3D', 'encourage');
    lockChoices();
    if (sc.tries === 1) {
      // 1回目: その道の 1しゅうかんごを見せて、ヒント
      sc.known.add(k);
      sc.hinted = true;
      const v = viewCompare(sc.scene, [k], LESSON.words.hint1Head);
      setScreen({ html: v.html, label: sceneLabel(), dot: 2, read: '', next: { label: 'えらびなおす', fn: () => showSum() } });
      addPaper('hint', LESSON.words.hint1 + ' ' + sc.scene.hint, 'assets/svg/signpost.svg');
      state.read = kana(LESSON.words.hint1Head) + ' ' + v.read + ' ' + kana(LESSON.words.hint1 + ' ' + sc.scene.hint);
    } else if (sc.tries === 2) {
      // 2回目: D と B の2つにしぼる
      const keep = [LESSON.best, 'b'];
      sc.dim = sc.scene.order.filter((x) => keep.indexOf(x) < 0);
      keep.forEach((x) => sc.known.add(x));
      const v = viewCompare(sc.scene, keep, LESSON.words.hint2Head);
      setScreen({ html: v.html, label: sceneLabel(), dot: 2, read: '', next: { label: 'えらびなおす', fn: () => showSum() } });
      addPaper('hint', LESSON.words.hint2, 'assets/svg/signpost.svg');
      state.read = kana(LESSON.words.hint2Head) + ' ' + v.read + ' ' + kana(LESSON.words.hint2);
    } else {
      // 3回目: ひかりさんと いっしょに Dの未来を たしかめて、いっしょに押す
      showTogether(0);
    }
  }

  function showTogether(t) {
    const sc = state.sc, k = LESSON.best;
    const v = viewFuture(sc.scene, k, t);
    const last = t === 2;
    setScreen({
      html: v.html, label: sceneLabel(), dot: 2, read: kana(LESSON.words.together) + ' ' + v.read,
      guide: t === 0 ? LESSON.words.together : LESSON.words.futureEach,
      next: { label: last ? 'いっしょに えらぶ' : 'つぎ', fn: last ? () => {
        sc.known.add(k);
        sc.dim = sc.scene.order.filter((x) => x !== k);
        sc.guided = k;
        showSum({ guide: LESSON.words.togetherPress, point: '.cm-choice.is-guided .cm-choice__art', focus: '.cm-choice.is-guided' });
      } : () => showTogether(t + 1) }
    });
    if (last) lightLamps(() => { setGuide(LESSON.words.togetherEnd); state.read += ' ' + kana(LESSON.words.togetherEnd); });
  }

  function viewCompare(scene, keys, head) {
    const cards = keys.map((k) => viewFutureCard(scene, k, 2, true));
    return {
      html: '<div class="cm-sheet"><p class="cm-sheet__head">' + rb(head) + '</p><div class="cm-compare">' +
        cards.map((c) => c.html).join('') + '</div></div>',
      read: cards.map((c, i) => pathSpeak(keys[i]) + '。 ' + c.read + ' ランプは ' + scene.paths[keys[i]].lamps + 'こ。').join(' ')
    };
  }

  function finishScene() {
    const sc = state.sc;
    state.record[sc.scene.id] = { first: sc.first, seen: Array.from(sc.seen) };
    nextScene();
  }
  function nextScene() {
    state.sceneIdx++;
    if (state.sceneIdx < scenesOf(state.stepIdx).length) playScene();
    else showClear();
  }

  /* =========================================================
     ステップクリア
     ========================================================= */
  async function showClear() {
    const i = state.stepIdx;
    const list = scenesOf(i);
    const played = list.filter((s) => state.record[s.id]).length;
    const text = 'ステップ' + (i + 1) + ' できた！';
    const sub = played > 0 ? played + 'つの ばめんで みちを えらんだね' : 'よく がんばったね';
    state.where = 'play';
    setScreen({
      html: '<div class="cm-clear">' + img('stamp-step' + (i + 1) + '.png', '', 'cm-clear__stamp is-wait') +
        '<div class="cm-paper cm-fringe is-wait"><p class="cm-clear__text">' + esc(text) + '</p><p class="cm-clear__sub">' + rb(sub) + '</p></div></div>',
      label: stepLabel('できた'), dot: 'all', read: text + ' ' + sub
    });
    el.bottombar.style.visibility = 'hidden';
    call('Sound', 'play', 'clear');
    try {
      await Promise.race([Promise.resolve(call('Motion3D', 'stepClear', i + 1)), wait(3200)]);
    } catch (e) {}
    el.bottombar.style.visibility = '';
    el.screen.querySelectorAll('.is-wait').forEach((n) => n.classList.remove('is-wait'));
    const last = i >= steps().length - 1;
    setBtn(el.next, { label: 'つぎへ', fn: () => {
      if (last) showReview(1);
      else { state.stepIdx++; state.sceneIdx = 0; showMap(); }
    } });
    el.next.focus();
  }

  /* =========================================================
     ふり返り（2ページ）
     ========================================================= */
  function showReview(page) {
    state.where = 'review';
    call('Motion3D', 'setScene', 'result');
    const R = LESSON.review;
    if (page === 1) {
      let rows = '';
      const reads = [kana(R.head), kana(R.picked)];
      steps().forEach((st, i) => scenesOf(i).forEach((s) => {
        const rec = state.record[s.id];
        if (!rec || !rec.first) return;
        const n = rec.seen.length;
        rows += '<li class="cm-review__row cm-paper">' + markHTML(rec.first) +
          img('choice-' + s.id + '-' + rec.first + '.png', '') +
          '<div><span class="cm-review__name">' + rb(s.title) + '</span>' +
          '<span class="cm-review__count">' + n + 'つ みたよ</span></div></li>';
        reads.push(kana(s.title) + '。 ' + LESSON.marks[rec.first] + ' ' + letter(rec.first) + ' を えらんだね。 ' + n + 'つの みちを みたよ');
      }));
      setScreen({
        html: '<h2 class="cm-review__head">' + rb(R.head) + '</h2><p class="cm-review__sub">' + rb(R.picked) + '</p>' +
          '<ol class="cm-review__rows">' + rows + '</ol>',
        label: 'ふりかえり 1/2', dot: null, read: reads.join('。 '),
        next: { label: 'つぎへ', fn: () => showReview(2) }
      });
    } else {
      const done = R.done.slice(0, 3).map((d) => '<li class="cm-done-item"><span>' + rb(d) + '</span></li>').join('');
      const tips = R.tips.map((t, i) => '<li class="cm-tip cm-paper"><span class="cm-tip__no">' + (i + 1) + '</span>' +
        img(t.img, '') + '<span>' + rb(t.text) + '</span></li>').join('');
      const closing = R.closing.map((c) => '<p>' + rb(c) + '</p>').join('');
      setScreen({
        html: '<h2 class="cm-review__head">' + rb(R.head) + '</h2><div class="cm-review__cols">' +
          '<div><ul class="cm-done-list cm-paper">' + done + '</ul><div class="cm-closing">' + closing + '</div></div>' +
          '<div><p class="cm-review__sub">3（さん）びょう まって かんがえる コツ</p><ol class="cm-tips">' + tips + '</ol></div></div>',
        label: 'ふりかえり 2/2', dot: null,
        read: [R.head].concat(R.done, ['3びょう まって かんがえる コツ'], R.tips.map((t, i) => (i + 1) + '、' + t.text), R.closing).map(kana).join(' '),
        sub: { label: 'もういちど', fn: () => { resetRun(); showMap(); } },
        next: { label: 'おわる', fn: showTitle }
      });
    }
  }

  /* =========================================================
     右上の3つ・読み上げ・キーボード
     ========================================================= */
  function applySettings() {
    const s = state.settings;
    document.documentElement.dataset.motion = s.low ? 'low' : 'normal';
    call('Motion3D', 'setReducedMotion', !!s.low);
    call('Sound', 'setMuted', !!s.muted);
    el.ctrlSound.classList.toggle('is-off', !!s.muted);
    el.ctrlSound.setAttribute('aria-pressed', String(!s.muted));
    el.ctrlSound.querySelector('.cm-ctrl__state').textContent = s.muted ? 'なし' : 'あり';
    el.ctrlMotion.classList.toggle('is-low', !!s.low);
    el.ctrlMotion.setAttribute('aria-pressed', String(!!s.low));
    el.ctrlMotion.querySelector('.cm-ctrl__state').textContent = s.low ? 'すくなめ' : 'ふつう';
  }
  el.ctrlSound.onclick = () => {
    state.settings.muted = !state.settings.muted;
    applySettings(); saveSettings();
    if (!state.settings.muted) call('Sound', 'play', 'tap');
  };
  el.ctrlMotion.onclick = () => {
    call('Sound', 'play', 'tap');
    state.settings.low = !state.settings.low;
    applySettings(); saveSettings();
  };
  el.ctrlBack.onclick = () => {
    call('Sound', 'play', 'tap');
    el.bottombar.style.visibility = '';
    if (state.where === 'play') showMap();
    else showTitle();
  };

  const canSpeak = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function';
  if (!canSpeak) { el.read.disabled = true; el.read.title = 'この パソコンでは よみあげが つかえません'; }
  el.read.onclick = () => {
    if (!canSpeak || !state.read) return;
    try {
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(state.read);
      u.lang = 'ja-JP'; u.rate = 0.9;
      const v = speechSynthesis.getVoices().filter((x) => /^ja/i.test(x.lang))[0];
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  };

  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (/^[1-4]$/.test(e.key) && state.keyPick) { e.preventDefault(); state.keyPick(Number(e.key)); return; }
    if (e.key === 'Enter' || e.key === ' ') {
      const a = document.activeElement;
      const onButton = a && (a.tagName === 'BUTTON' || a.tagName === 'A');
      if (!onButton) {
        // どこにもフォーカスが無いときは「つぎへ」を押したことにする
        const start = $('btnStart');
        const target = start || (!el.next.hidden && el.bottombar.style.visibility !== 'hidden' ? el.next : null);
        if (target) { e.preventDefault(); target.click(); }
      }
    }
  });

  /* ---------- はじまり ---------- */
  addEventListener('resize', fitStage);
  fitStage();
  try {
    call('Motion3D', 'init', $('stage3d'), {
      theme: { colors: { navy: '#1E2747', red: '#8C2B22', gold: '#D2A03A', paper: '#F2E6CB', ink: '#2A211C' }, motif: 'carpet-lamp' }
    });
  } catch (e) {}
  applySettings();
  showTitle();
})();
