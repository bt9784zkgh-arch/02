#!/usr/bin/env python3
"""choice-maze を 1つの HTML ファイル（choice-maze.html）にまとめる。

使い方:  python3 tools/build_single.py
  - CSS / JS / three.min.js / 画像 / フォントを全部 HTML の中に入れる（ネット不要・ダブルクリックで遊べる）
  - 画像は WebP に変換して軽くする（元の PNG はそのまま）
  - フォントはゲームで使う文字だけに小さくする（fonttools と brotli が必要: pip install fonttools brotli）
LESSON（game.js）を書きかえたら、もう一度このスクリプトを実行する。
"""
import base64, io, json, os, re, sys

from PIL import Image
from fontTools.ttLib import TTFont
from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'choice-maze.html')


def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


def b64(data):
    return base64.b64encode(data).decode('ascii')


# ---------- 画像 → data URI（WebP） ----------
def image_uri(rel):
    path = os.path.join(ROOT, rel)
    if rel.endswith('.svg'):
        with open(path, 'rb') as f:
            return 'data:image/svg+xml;base64,' + b64(f.read())
    im = Image.open(path)
    buf = io.BytesIO()
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        im.save(buf, 'WEBP', quality=84, method=6)
    else:
        im = im.convert('RGB')
        im.save(buf, 'WEBP', quality=82, method=6)
    return 'data:image/webp;base64,' + b64(buf.getvalue())


assets = {}
for d in ('assets/img', 'assets/svg'):
    for name in sorted(os.listdir(os.path.join(ROOT, d))):
        if name.lower().endswith(('.png', '.jpg', '.jpeg', '.svg')):
            rel = d + '/' + name
            assets[rel] = image_uri(rel)

# ---------- テキスト ----------
html = read('index.html')
css = read('style.css')
js_files = ['motion3d.js', 'bgm.js', 'game.js']
js = {f: read(f) for f in js_files}
three = read('lib/three.min.js')

# CSS の url("assets/...") は先に置きかえる
def css_url(m):
    rel = m.group(2)
    return 'url("' + assets.get(rel, rel) + '")'
css = re.sub(r'url\((["\']?)(assets/[^"\')]+)\1\)', css_url, css)
css = css.replace('@import url("fonts/fonts.css");', '')

# ---------- フォント（使う文字だけ） ----------
used = set(html + css + ''.join(js.values()))
used |= set(chr(c) for c in range(0x20, 0x7f))
used |= set('０１２３４５６７８９！？。、・「」『』（）ー〜')
used = {c for c in used if ord(c) >= 0x20}

fonts_css = read('fonts/fonts.css')
faces = []
for block in re.findall(r'@font-face\s*{[^}]*}', fonts_css):
    fam = re.search(r"font-family:\s*'([^']+)'", block).group(1)
    weight = re.search(r'font-weight:\s*(\d+)', block).group(1)
    src = re.search(r'url\(([^)]+)\)', block).group(1)
    fpath = os.path.join(ROOT, 'fonts', src)
    if not os.path.exists(fpath):
        continue
    font = TTFont(fpath)
    cmap = font.getBestCmap() or {}
    need = sorted(ord(c) for c in used if ord(c) in cmap)
    if not need:
        continue
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=need)
    sub.subset(font)
    buf = io.BytesIO()
    font.flavor = 'woff2'
    font.save(buf)
    faces.append(
        "@font-face{font-family:'%s';font-style:normal;font-display:swap;font-weight:%s;"
        "src:url(data:font/woff2;base64,%s) format('woff2');}" % (fam, weight, b64(buf.getvalue())))

# ---------- 画像パスを data URI に読みかえる小さな仕組み ----------
# game.js は innerHTML / img.src で "assets/..." を使うので、入れる前に読みかえる
shim = r"""
(function () {
  var A = window.__CM_ASSETS || {};
  var RE = /assets\/(?:img|svg)\/[A-Za-z0-9_.\-]+/g;
  function fix(s) { return typeof s === 'string' ? s.replace(RE, function (m) { return A[m] || m; }) : s; }
  window.__cmAsset = fix;
  var d = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  if (d && d.set) Object.defineProperty(Element.prototype, 'innerHTML', {
    configurable: true, enumerable: d.enumerable,
    get: d.get, set: function (v) { d.set.call(this, fix(v)); }
  });
  var ia = Element.prototype.insertAdjacentHTML;
  Element.prototype.insertAdjacentHTML = function (p, v) { return ia.call(this, p, fix(v)); };
  var s = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
  if (s && s.set) Object.defineProperty(HTMLImageElement.prototype, 'src', {
    configurable: true, enumerable: s.enumerable,
    get: s.get, set: function (v) { s.set.call(this, fix(v)); }
  });
  var sa = Element.prototype.setAttribute;
  Element.prototype.setAttribute = function (n, v) { return sa.call(this, n, (n === 'src' || n === 'style') ? fix(v) : v); };
})();
"""


def script(code):
    return '<script>\n' + code.replace('</script', '<\\/script') + '\n</script>'


html = fix_html = re.sub(r'assets/(?:img|svg)/[A-Za-z0-9_.\-]+', lambda m: assets.get(m.group(0), m.group(0)), html)
html = html.replace('<link rel="stylesheet" href="style.css">',
                    '<style>\n' + '\n'.join(faces) + '\n</style>\n<style>\n' + css + '\n</style>')
asset_js = 'window.__CM_ASSETS = ' + json.dumps(assets) + ';'
html = html.replace('<script src="lib/three.min.js"></script>',
                    script(asset_js) + '\n' + script(shim) + '\n' + script(three))
for f in js_files:
    html = html.replace('<script src="%s"></script>' % f, script(js[f]))

leftover = re.findall(r'<(?:script|link)[^>]+(?:src|href)="(?!data:|https?:)[^"]+"', html)
if leftover:
    print('まだ外のファイルを読んでいる所があります:', leftover, file=sys.stderr)
    sys.exit(1)

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(html)
print('書き出し: %s  (%.1f MB, 画像 %d 枚, フォント %d 個)' % (OUT, os.path.getsize(OUT) / 1e6, len(assets), len(faces)))
