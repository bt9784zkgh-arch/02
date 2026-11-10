# fonts/ について

ネットがない学校のパソコンでも同じ見た目になるように、ゲームで使うフォントをここに入れています。
`style.css` の `@font-face` が、まずパソコンに入っているフォント（`local()`）をさがし、なければこのフォルダのファイルを使います。

| ファイル | フォント | 使う場所 |
|---|---|---|
| BIZUDGothic-Regular.woff2 / BIZUDGothic-Bold.woff2 | BIZ UDGothic（モリサワ） | 問題文・選択肢・ふりがな |
| ZenMaruGothic-Medium.woff2 / ZenMaruGothic-Bold.woff2 | Zen Maru Gothic（Yoshimichi Ohira） | ボタン・ラベル・ふだんの文 |
| KleeOne-SemiBold.woff2 | Klee One（Fontworks） | タイトル・ほめことば・見出し（手書き風） |

- もとのファイルは Google Fonts で配布されている TTF です。文字はけずらず（サブセットにせず）、WOFF2 形式に変えただけです。先生が問題の文を書きかえても、文字が欠けません。
- ライセンス: どれも **SIL Open Font License 1.1（OFL）** です。ライセンス文は Google Fonts で配布されているもの（各フォントの `OFL.txt`）と同じです。
  - https://openfontlicense.org/open-font-license-official-text/
  - BIZ UDGothic: Copyright 2022 The BIZ UDGothic Project Authors
  - Zen Maru Gothic: Copyright 2021 The Zen Maru Gothic Project Authors
  - Klee One: Copyright 2020 The Klee Project Authors
- OFL では、フォントをゲームといっしょに配ってかまいません。フォントだけを売ることはできません。
