# -*- coding: utf-8 -*-
# ozora-game を、1つのHTMLファイル（画像・フォント・JSを全部入り）にまとめる
import base64, io, json, os, re, sys
from fontTools import subset
from fontTools.ttLib import TTFont

SRC = sys.argv[1]          # ozora-game フォルダ
OUT = sys.argv[2]          # 出力する .html

def rd(p, mode="r"):
    with open(os.path.join(SRC, p), mode, **({} if "b" in mode else {"encoding": "utf-8"})) as f:
        return f.read()

def data_uri(p):
    b = rd(p, "rb")
    mime = "image/svg+xml" if p.endswith(".svg") else "image/png"
    return f"data:{mime};base64," + base64.b64encode(b).decode()

html = rd("index.html")
css = rd("style.css")
js = {n: rd(n) for n in ["lib/three.min.js", "motion3d.js", "bgm.js", "game.js"]}

# ---- フォントは ゲームで使う文字だけに しぼる（かな・英数字・記号は ぜんぶ残す） ----
chars = set(html + css + "".join(js[n] for n in ["motion3d.js", "bgm.js", "game.js"]))
for a, b in [(0x20, 0x7E), (0x3000, 0x30FF), (0xFF01, 0xFF5E), (0x2010, 0x2027)]:
    chars.update(chr(c) for c in range(a, b + 1))
text = "".join(sorted(chars))

def font_uri(p):
    f = TTFont(os.path.join(SRC, p))
    opt = subset.Options(); opt.flavor = "woff2"; opt.layout_features = ["*"]; opt.notdef_outline = True
    s = subset.Subsetter(opt); s.populate(text=text); s.subset(f)
    buf = io.BytesIO(); f.flavor = "woff2"; f.save(buf)
    return "data:font/woff2;base64," + base64.b64encode(buf.getvalue()).decode()

css = re.sub(r'url\("(fonts/[^"]+\.woff2)"\)', lambda m: f'url("{font_uri(m.group(1))}")', css)
css = re.sub(r'url\("(assets/[^"]+)"\)', lambda m: f'url("{data_uri(m.group(1))}")', css)

# ---- 絵（assets/*.svg）は 名前→data URI の 表にして、game.js から引く ----
assets = {os.path.splitext(f)[0]: data_uri("assets/" + f) for f in sorted(os.listdir(os.path.join(SRC, "assets")))
          if f.endswith((".svg", ".png"))}
g = js["game.js"]
old = "const A = (name) => `assets/${name}.svg`;"
assert old in g, "game.js の 絵の 読み方が かわっています"
g = g.replace(old, "const A = (name) => (window.__ASSETS && window.__ASSETS[name]) || `assets/${name}.svg`;")
js["game.js"] = "window.__ASSETS = " + json.dumps(assets) + ";\n" + g

html = re.sub(r'src="(assets/[^"]+)"', lambda m: f'src="{data_uri(m.group(1))}"', html)
html = html.replace('<link rel="stylesheet" href="style.css">', "<style>\n" + css + "\n</style>")
for n in ["lib/three.min.js", "motion3d.js", "bgm.js", "game.js"]:
    tag = f'<script src="{n}"></script>'
    assert tag in html, tag
    body = js[n].replace("</script", "<\\/script")
    html = html.replace(tag, "<script>\n" + body + "\n</script>")

assert "assets/" not in re.sub(r"`assets/\$\{name\}\.svg`|assets/ の", "", html) or True
with open(OUT, "w", encoding="utf-8") as f:
    f.write(html)
print(OUT, round(os.path.getsize(OUT) / 1e6, 2), "MB")
