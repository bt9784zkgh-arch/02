# -*- coding: utf-8 -*-
import re, sys, html
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from content import PAGES, CATS
from icons import icon, svg, ICONS

def merge(s):
    pat = re.compile(r"\{([^|{}]+)\|([^{}]+)\}\{([^|{}]+)\|([^{}]+)\}")
    while pat.search(s):
        s = pat.sub(r"{\1\3|\2\4}", s)
    return s

def R(s):
    """{漢字|かんじ} -> <ruby>。改行は<br>"""
    s = merge(s)
    s = html.escape(s, quote=False)
    s = re.sub(r"\{([^|{}]+)\|([^{}]+)\}", r"<ruby>\1<rt>\2</rt></ruby>", s)
    return '<span class="t">' + s.replace("\n", "<br>") + '</span>'

KIND_LABEL = {"よむ": "よむ", "えらぶ": "えらぶ", "かく": "かく", "はなす": "はなす"}
MARU = "①②③④⑤⑥⑦⑧⑨⑩"

def block(b, st, cat):
    t = b["t"]
    if t == "step":
        st["n"] += 1
        return (f'<div class="step"><span class="num">{st["n"]}</span>'
                f'<span class="kind">{icon(b["kind"])}{b["kind"]}</span>'
                f'<span class="stxt">{R(b["text"])}</span></div>')
    if t == "form":
        rows = "".join(f'<tr><th>{R(r)}</th><td></td></tr>' for r in b["rows"])
        return f'<table class="form">{rows}</table>'
    if t == "pick":
        rows = ""
        for lab, opts in b["rows"]:
            o = "".join(f'<span class="opt">{R(x)}</span>' for x in opts)
            rows += f'<tr><th>{R(lab)}</th><td>{o}</td></tr>'
        return f'<table class="pick">{rows}</table>'
    if t == "model":
        return f'<div class="model"><span class="tag">{R("{話|はな}し{方|かた}の れい")}</span>{R(b["text"])}</div>'
    if t == "hint":
        title = R(b.get("title", "ヒント"))
        return f'<div class="hint">{icon("bird", cls="hb")}<div><b>{title}</b><br>{R(b["text"])}</div></div>'
    if t == "note":
        return f'<div class="note">{R(b["text"])}</div>'
    if t == "talk":
        return f'<div class="talk">{icon("はなす")}<span>{R(b["text"])}</span></div>'
    if t == "cards":
        cls = b.get("style", "")
        cs = ""
        for i, x in enumerate(b["items"]):
            ic = icon("letter") if cls == "letter" else ""
            cs += f'<div class="card {cls}"><span class="cn">{MARU[i]}</span>{ic}<span>{R(x)}</span></div>'
        return f'<div class="cards {cls}">{cs}</div>'
    if t == "sort":
        bx = "".join(f'<div class="box">{icon(ic)}<div class="bl">{R(lab)}</div><div class="bw"></div></div>'
                     for lab, ic in b["boxes"])
        return f'<div class="sort">{bx}</div>'
    if t == "rate":
        head = ('<tr><th></th><th>{}<br>ちょっと</th><th>{}<br>まあまあ</th><th>{}<br>すごく</th></tr>'
                .format(icon("a1"), icon("a2"), icon("a3")))
        rows = "".join(f'<tr><td class="it"><span class="cn">{MARU[i]}</span>{R(x)}</td>'
                       f'<td><span class="ring"></span></td><td><span class="ring"></span></td><td><span class="ring"></span></td></tr>'
                       for i, x in enumerate(b["items"]))
        return f'<table class="rate">{head}{rows}</table>'
    if t == "checks":
        it = "".join(f'<div class="chk"><span class="sq"></span>{R(x)}</div>' for x in b["items"])
        return f'<div class="checks c{b.get("cols",2)}">{it}</div>'
    if t == "scene":
        extra = ""
        if b.get("msg"):
            extra = f'<div class="mail"><div class="mh">{icon("phone")}メール</div>{R(b["msg"])}</div>'
        return (f'<div class="scene"><div class="sart">{icon(b["svg"])}</div>'
                f'<div class="stx">{R(b["text"])}{extra}</div></div>')
    if t == "bubbles":
        it = "".join(f'<div class="bub"><span class="ring sm"></span><span>{R(x)}</span></div>' for x in b["items"])
        return f'<div class="bubbles">{it}</div>'
    if t == "faces3":
        fs = ["f1", "f2", "f3"]
        it = "".join(f'<div class="fc">{icon(fs[i])}<span>{R(x)}</span></div>' for i, x in enumerate(b["labels"]))
        return f'<div class="faces3">{it}</div>'
    if t == "choices":
        it = "".join(f'<div class="ch"><span class="ring sm"></span><span class="cn">{"アイウエオカキ"[i]}</span>{R(x)}</div>'
                     for i, x in enumerate(b["items"]))
        return f'<div class="choices c{b.get("cols",1)}">{it}</div>'
    if t == "signs":
        it = "".join(f'<li><span class="sq"></span>{R(x)}</li>' for x in b["items"])
        return (f'<div class="signs"><ul>{it}</ul><div class="stop"><span class="oct">STOP</span>{R(b["stop"])}</div></div>')
    if t == "iceberg":
        words = "".join(f'<span class="w">{R(x)}</span>' for x in b["top"])
        return (f'<div class="iceberg"><div class="above">{words}<div class="lab">{R("{見|み}える ＝ ことば")}</div></div>'
                f'<div class="below"><div class="lab">{R("かくれている ＝ {本当|ほんとう}の {気持|きも}ち")}</div>'
                f'<span class="q">？</span><span class="q">？</span><span class="q">？</span></div></div>')
    if t == "wordbank":
        it = "".join(f'<span class="wb">{R(x)}</span>' for x in b["items"])
        return f'<div class="wordbank">{it}</div>'
    if t == "pairs":
        rows = "".join(f'<tr><td class="pl">{R(x)}</td><td class="ar">→</td><td class="pr"></td></tr>' for x in b["rows"])
        return (f'<table class="pairs"><tr><th>{R(b["left"])}</th><th></th><th>{R(b["right"])}</th></tr>{rows}</table>')
    if t == "convert":
        rows = "".join(f'<div class="cv"><span class="bad">{R(a)}</span><span class="arr">→</span><span class="good">{R(g)}</span></div>'
                       for a, g in b["pairs"])
        return f'<div class="convert">{rows}</div>'
    if t == "lines":
        ls = "".join('<div class="ln"></div>' for _ in range(b["n"] - 1))
        return f'<div class="lines"><div class="ln first">{R(b["starter"])}</div>{ls}</div>'
    if t == "order":
        it = "".join(f'<div class="od"><span class="paren">（　　）</span>{R(x)}</div>' for x in b["items"])
        return f'<div class="order">{it}</div>'
    if t == "answer":
        return f'<div class="answer">{R(b["text"])}</div>'
    if t == "reflect":
        fs = [("f1", "わかった"), ("f2", "すこし わかった"), ("f3", "むずかしかった")]
        f = "".join(f'<span class="rf">{icon(a)}<small>{R(l)}</small></span>' for a, l in fs)
        return (f'<div class="reflect"><div class="rh">ふりかえり</div>'
                f'<div class="rrow"><div class="rfaces"><div class="rq">{R("きょうの {気持|きも}ちに ○")}</div>{f}</div>'
                f'<div class="rwrite"><div class="rq">{R("{感|かん}じた こと")}</div>'
                f'<div class="ln first">{R("わたしは、")}</div><div class="ln"></div></div>'
                f'<div class="rsign"><div class="rq">{R("{先生|せんせい}から")}</div><div class="stamp"></div></div></div></div>')
    raise ValueError(t)

def page(p, no):
    if p.get("cover"):
        return f'''<section class="page cover">
<div class="sky">{svg('<path d="M10 70c20-10 40-10 60 0s40 10 60 0" stroke="#bcd3ee" stroke-width="2"/><path d="M0 40c25-8 50-8 75 0s50 8 75 0" stroke="#d7e5f5" stroke-width="2"/>', vb="0 0 150 100", cls="waves")}</div>
<div class="ctitle">{R("{大空|おおぞら}に{翔|かけ}け")}</div>
<div class="csub">{R("こころと くらしの ワークブック")}<span class="mihon">{R("{見本|みほん}")}</span></div>
<div class="cbird">{icon("bird")}</div>
<div class="cname"><span>なまえ</span><div class="nl"></div></div>
<div class="howto"><div class="hh">{R("このワークの つかいかた")}</div>
<div class="hrow">
<div class="hw">{icon("よむ")}<b>よむ</b><small>{R("ゆっくり {読|よ}もう")}</small></div>
<div class="hw">{icon("えらぶ")}<b>えらぶ</b><small>{R("○や ✓を つけよう")}</small></div>
<div class="hw">{icon("かく")}<b>かく</b><small>{R("みじかくて いいよ")}</small></div>
<div class="hw">{icon("はなす")}<b>はなす</b><small>{R("{友達|ともだち}と {話|はな}そう")}</small></div>
</div>
<div class="promise">{R("このワークに まちがいは ありません。あなたの {考|かんが}えを {大切|たいせつ}に しよう。\nわからない ときは、{手|て}を あげて {先生|せんせい}に {聞|き}こう。")}</div>
</div>
</section>'''
    cname, col, soft = CATS[p["cat"]]
    st = {"n": 0}
    body = "".join(block(b, st, p["cat"]) for b in p["blocks"])
    stars = "".join(icon("star") for _ in range(3))
    return f'''<section class="page" style="--c:{col};--s:{soft}">
<header><div class="badge">{icon(p["icon"])}<span>{cname}</span></div>
<div class="ht"><h1>{R(p["title"])}</h1><div class="goal"><span class="lbl">めあて</span>{R(p["goal"])}</div></div></header>
<main>{body}</main>
<footer><span class="done">{R("できたら ☆に {色|いろ}を ぬろう")} {stars}</span><span class="pg">大空に翔け　{no}</span></footer>
</section>'''

def build(out):
    css = open(__file__.rsplit("/", 1)[0] + "/style.css", encoding="utf-8").read()
    pages = "\n".join(page(p, i + 1) for i, p in enumerate(PAGES))
    doc = f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>大空に翔け ワークシート見本</title>
<style>{css}</style></head><body>{pages}</body></html>'''
    open(out, "w", encoding="utf-8").write(doc)

if __name__ == "__main__":
    build(sys.argv[1])
