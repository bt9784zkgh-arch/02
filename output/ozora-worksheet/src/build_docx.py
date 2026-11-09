# -*- coding: utf-8 -*-
# 同じ内容データから、先生が直せる Word 版を作る（ふりがなは Word のルビ機能）
import re, sys
sys.path.insert(0, __file__.rsplit("/", 1)[0])
from content import PAGES, CATS
from build_html import merge
from docx import Document
from docx.shared import Pt, Mm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement, parse_xml
from xml.sax.saxutils import escape

FONT = "BIZ UDゴシック"
INK = RGBColor(0x2d, 0x3b, 0x4e)
MARU = "①②③④⑤⑥⑦⑧⑨⑩"
NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"'

def rpr(sz, bold=False, color=None):
    c = f'<w:color w:val="{color}"/>' if color else ""
    b = "<w:b/>" if bold else ""
    return (f'<w:rPr><w:rFonts w:ascii="{FONT}" w:hAnsi="{FONT}" w:eastAsia="{FONT}"/>{b}{c}'
            f'<w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/></w:rPr>')

def add(p, text, size=12.5, bold=False, color=None):
    """{漢字|かんじ} 記法を Word ルビ付きで段落に追加"""
    sz = int(size * 2)
    rsz = max(10, int(sz * 0.5))
    col = color.lstrip("#") if color else None
    text = merge(text)
    for part in re.split(r"(\{[^{}]+\|[^{}]+\})", text):
        if not part:
            continue
        m = re.fullmatch(r"\{([^|{}]+)\|([^{}]+)\}", part)
        if m:
            base, rt = m.groups()
            xml = (f'<w:r {NS}><w:ruby><w:rubyPr><w:rubyAlign w:val="center"/><w:hps w:val="{rsz}"/>'
                   f'<w:hpsRaise w:val="{sz}"/><w:hpsBaseText w:val="{sz}"/><w:lid w:val="ja-JP"/></w:rubyPr>'
                   f'<w:rt><w:r>{rpr(rsz, False, col)}<w:t>{escape(rt)}</w:t></w:r></w:rt>'
                   f'<w:rubyBase><w:r>{rpr(sz, bold, col)}<w:t>{escape(base)}</w:t></w:r></w:rubyBase></w:ruby></w:r>')
            p._p.append(parse_xml(xml))
        else:
            lines = part.split("\n")
            for i, ln in enumerate(lines):
                r = p.add_run(ln)
                r.font.size = Pt(size); r.bold = bold
                r.font.name = FONT
                r._r.get_or_add_rPr().get_or_add_rFonts().set(qn("w:eastAsia"), FONT)
                if col: r.font.color.rgb = RGBColor.from_string(col.upper())
                if i < len(lines) - 1: r.add_break()
    return p

def para(doc_or_cell, text="", size=12.5, bold=False, color=None, align=None, before=2, after=2):
    p = doc_or_cell.add_paragraph()
    pf = p.paragraph_format
    pf.space_before = Pt(before); pf.space_after = Pt(after); pf.line_spacing = 1.35
    if align: p.alignment = align
    if text: add(p, text, size, bold, color)
    return p

def shade(cell, hexcol):
    tcPr = cell._tc.get_or_add_tcPr()
    sh = OxmlElement("w:shd"); sh.set(qn("w:val"), "clear"); sh.set(qn("w:color"), "auto"); sh.set(qn("w:fill"), hexcol.lstrip("#"))
    tcPr.append(sh)

def cell_text(cell, text, size=12.5, bold=False, color=None, align=None):
    cell.paragraphs[0].text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.line_spacing = 1.35
    p.paragraph_format.space_before = Pt(2); p.paragraph_format.space_after = Pt(2)
    if align: p.alignment = align
    add(p, text, size, bold, color)

def table(doc, rows, cols, widths=None, style="Table Grid"):
    t = doc.add_table(rows=rows, cols=cols)
    t.style = style
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    if widths:
        t.autofit = False
        tblPr = t._tbl.tblPr
        lay = OxmlElement("w:tblLayout"); lay.set(qn("w:type"), "fixed"); tblPr.append(lay)
        for i, w in enumerate(widths):
            t.columns[i].width = Mm(w)
        for gc, w in zip(t._tbl.tblGrid.findall(qn("w:gridCol")), widths):
            gc.set(qn("w:w"), str(int(w * 56.7)))
        for row in t.rows:
            for i, w in enumerate(widths):
                row.cells[i].width = Mm(w)
    return t

def boxed(doc, text, fill, title=None, color=None):
    t = table(doc, 1, 1, [180])
    c = t.cell(0, 0); shade(c, fill)
    c.paragraphs[0].text = ""
    if title:
        add(c.paragraphs[0], title, 11.5, True, color)
        para(c, text, 12, before=0)
    else:
        add(c.paragraphs[0], text, 12.5)
    para(doc, "", before=0, after=0)

def page(doc, p, no, first):
    if not first:
        doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
    if p.get("cover"):
        para(doc, "", after=30)
        para(doc, "{大空|おおぞら}に{翔|かけ}け", 40, True, align=WD_ALIGN_PARAGRAPH.CENTER)
        para(doc, "こころと くらしの ワークブック（{見本|みほん}）", 15, True, "#3f6fb0", WD_ALIGN_PARAGRAPH.CENTER, after=60)
        para(doc, "なまえ　＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿＿", 18, True, align=WD_ALIGN_PARAGRAPH.CENTER, after=50)
        para(doc, "このワークの つかいかた", 14, True, "#3f6fb0", WD_ALIGN_PARAGRAPH.CENTER)
        t = table(doc, 2, 4, [45, 45, 45, 45])
        for i, (k, d) in enumerate([("よむ", "ゆっくり {読|よ}もう"), ("えらぶ", "○や ✓を つけよう"),
                                     ("かく", "みじかくて いいよ"), ("はなす", "{友達|ともだち}と {話|はな}そう")]):
            cell_text(t.cell(0, i), k, 14, True, align=WD_ALIGN_PARAGRAPH.CENTER); shade(t.cell(0, i), "#f4f8fd")
            cell_text(t.cell(1, i), d, 11, align=WD_ALIGN_PARAGRAPH.CENTER)
        para(doc, "")
        boxed(doc, "このワークに まちがいは ありません。あなたの {考|かんが}えを {大切|たいせつ}に しよう。\nわからない ときは、{手|て}を あげて {先生|せんせい}に {聞|き}こう。", "#fffbea")
        return
    cname, col, soft = CATS[p["cat"]]
    h = table(doc, 1, 2, [24, 156])
    shade(h.cell(0, 0), soft)
    cell_text(h.cell(0, 0), cname, 12, True, col, WD_ALIGN_PARAGRAPH.CENTER)
    cell_text(h.cell(0, 1), p["title"], 20, True)
    para(h.cell(0, 1), "【めあて】" + p["goal"], 12, color=None, before=0)
    para(doc, "", before=0, after=0)
    n = 0
    for b in p["blocks"]:
        t = b["t"]
        if t == "step":
            n += 1
            if n > 1:
                sep = para(doc, "", before=10, after=0)
                pPr = sep._p.get_or_add_pPr()
                bdr = parse_xml(f'<w:pBdr {NS}><w:top w:val="dashed" w:sz="8" w:space="1" w:color="D3DBE5"/></w:pBdr>')
                pPr.append(bdr)
            para(doc, f"{'❶❷❸❹❺'[n-1]} ［{b['kind']}］ {b['text']}", 13, True, col, before=4 if n > 1 else 8, after=6)
        elif t == "form":
            tb = table(doc, len(b["rows"]), 2, [46, 134])
            for i, r in enumerate(b["rows"]):
                cell_text(tb.cell(i, 0), r, 12, True); shade(tb.cell(i, 0), soft)
                tb.rows[i].height = Mm(12)
        elif t == "pick":
            tb = table(doc, len(b["rows"]), 2, [46, 134])
            for i, (lab, opts) in enumerate(b["rows"]):
                cell_text(tb.cell(i, 0), lab, 12, True); shade(tb.cell(i, 0), soft)
                cell_text(tb.cell(i, 1), "　・　".join(opts), 13)
        elif t == "model":
            boxed(doc, b["text"], "#ffffff", "{話|はな}し{方|かた}の れい", col)
        elif t == "hint":
            boxed(doc, b["text"], "#fffbea", b.get("title", "ヒント"), "#a77a00")
        elif t == "note":
            para(doc, b["text"], 12.5, True, col, WD_ALIGN_PARAGRAPH.CENTER)
        elif t == "talk":
            para(doc, "💬 " + b["text"], 12.5, True, col)
        elif t == "cards":
            k = 5
            items = b["items"]
            tb = table(doc, (len(items) + k - 1) // k, k, [36] * k)
            for i, x in enumerate(items):
                c = tb.cell(i // k, i % k)
                cell_text(c, MARU[i], 13, True, col)
                para(c, x, 11.5, align=WD_ALIGN_PARAGRAPH.CENTER, before=0)
        elif t == "sort":
            tb = table(doc, 2, 2, [90, 90])
            for i, (lab, _) in enumerate(b["boxes"]):
                cell_text(tb.cell(0, i), lab, 12.5, True, col, WD_ALIGN_PARAGRAPH.CENTER); shade(tb.cell(0, i), soft)
            tb.rows[1].height = Mm(32)
        elif t == "rate":
            tb = table(doc, len(b["items"]) + 1, 4, [108, 24, 24, 24])
            for j, lab in enumerate(["", "ちょっと", "まあまあ", "すごく"]):
                cell_text(tb.cell(0, j), lab, 11, True, align=WD_ALIGN_PARAGRAPH.CENTER); shade(tb.cell(0, j), soft)
            for i, x in enumerate(b["items"]):
                cell_text(tb.cell(i + 1, 0), MARU[i] + " " + x, 12.5)
                for j in range(1, 4):
                    cell_text(tb.cell(i + 1, j), "◯", 16, color="#9fb0c4", align=WD_ALIGN_PARAGRAPH.CENTER)
        elif t in ("checks",):
            k = b.get("cols", 2)
            items = b["items"]
            tb = table(doc, (len(items) + k - 1) // k, k, [180 / k] * k)
            for i, x in enumerate(items):
                cell_text(tb.cell(i // k, i % k), "□ " + x, 12)
        elif t == "scene":
            txt = b["text"] + (("\n\n📩 メール：" + b["msg"]) if b.get("msg") else "")
            boxed(doc, txt, soft)
        elif t == "bubbles":
            tb = table(doc, (len(b["items"]) + 1) // 2, 2, [90, 90])
            for i, x in enumerate(b["items"]):
                cell_text(tb.cell(i // 2, i % 2), "◯ 「" + x + "」", 12.5)
        elif t == "faces3":
            tb = table(doc, 1, 3, [60, 60, 60])
            for i, (x, f) in enumerate(zip(b["labels"], ["😊", "😐", "😟"])):
                cell_text(tb.cell(0, i), f + "\n" + x, 12, align=WD_ALIGN_PARAGRAPH.CENTER)
        elif t == "choices":
            tb = table(doc, len(b["items"]), 1, [180])
            for i, x in enumerate(b["items"]):
                cell_text(tb.cell(i, 0), "◯ " + "アイウエオカキ"[i] + "　" + x, 12.5)
        elif t == "signs":
            tb = table(doc, 1, 2, [110, 70])
            cell_text(tb.cell(0, 0), "\n".join("□ " + x for x in b["items"]), 12)
            cell_text(tb.cell(0, 1), "STOP！\n" + b["stop"], 12.5, True, "#d9563b", WD_ALIGN_PARAGRAPH.CENTER)
            shade(tb.cell(0, 1), "#fbe6e1")
        elif t == "iceberg":
            tb = table(doc, 2, 1, [180])
            cell_text(tb.cell(0, 0), "{見|み}える ＝ ことば：　" + "　".join(b["top"]), 15, True, "#b4472f", WD_ALIGN_PARAGRAPH.CENTER)
            cell_text(tb.cell(1, 0), "かくれている ＝ {本当|ほんとう}の {気持|きも}ち：　［　？　］　［　？　］　［　？　］", 12.5, align=WD_ALIGN_PARAGRAPH.CENTER)
            shade(tb.cell(1, 0), "#cfe1f5")
        elif t == "wordbank":
            para(doc, "　".join("（" + x + "）" for x in b["items"]), 13)
        elif t == "pairs":
            tb = table(doc, len(b["rows"]) + 1, 3, [60, 12, 108])
            cell_text(tb.cell(0, 0), b["left"], 10.5); cell_text(tb.cell(0, 2), b["right"], 10.5)
            for i, x in enumerate(b["rows"]):
                cell_text(tb.cell(i + 1, 0), x, 13, True, align=WD_ALIGN_PARAGRAPH.CENTER)
                cell_text(tb.cell(i + 1, 1), "→", 14, True, col, WD_ALIGN_PARAGRAPH.CENTER)
                tb.rows[i + 1].height = Mm(11)
        elif t == "convert":
            tb = table(doc, len(b["pairs"]), 3, [70, 10, 100])
            for i, (a, g) in enumerate(b["pairs"]):
                cell_text(tb.cell(i, 0), a, 12, color="#66707c"); shade(tb.cell(i, 0), "#f1f1ee")
                cell_text(tb.cell(i, 1), "→", 14, True, col, WD_ALIGN_PARAGRAPH.CENTER)
                cell_text(tb.cell(i, 2), g, 12.5, True); shade(tb.cell(i, 2), soft)
        elif t == "lines":
            para(doc, b["starter"] + "＿" * 30, 12.5, before=8)
            for _ in range(b["n"] - 1):
                para(doc, "＿" * 36, 12.5, before=8)
        elif t == "order":
            tb = table(doc, len(b["items"]), 1, [180])
            for i, x in enumerate(b["items"]):
                cell_text(tb.cell(i, 0), "（　　）　" + x, 13)
        elif t == "answer":
            para(doc, "〔{先生|せんせい}用〕" + b["text"], 9.5, color="#7a8592", before=6)
        elif t == "reflect":
            para(doc, "", before=10, after=0)
            tb = table(doc, 2, 3, [62, 88, 30])
            cell_text(tb.cell(0, 0), "ふりかえり　きょうの {気持|きも}ちに ○", 10.5, True)
            cell_text(tb.cell(0, 1), "{感|かん}じた こと", 10.5, True)
            cell_text(tb.cell(0, 2), "{先生|せんせい}から", 10.5, True)
            cell_text(tb.cell(1, 0), "😊 わかった\n🙂 すこし わかった\n😟 むずかしかった", 11)
            cell_text(tb.cell(1, 1), "わたしは、", 12, color="#6a7686")
            tb.rows[1].height = Mm(22)
            for c in tb.rows[0].cells: shade(c, "#f4f6f8")
    para(doc, f"できたら ☆に {{色|いろ}}を ぬろう　☆　☆　☆　　　　　　　　　大空に翔け　{no}", 9.5, color="#6a7686", before=6)

def build(out):
    doc = Document()
    sec = doc.sections[0]
    sec.page_width, sec.page_height = Mm(210), Mm(297)
    sec.left_margin = sec.right_margin = Mm(14)
    sec.top_margin = sec.bottom_margin = Mm(12)
    st = doc.styles["Normal"]; st.font.name = FONT; st.font.size = Pt(12.5); st.font.color.rgb = INK
    st.element.rPr.rFonts.set(qn("w:eastAsia"), FONT)
    for i, p in enumerate(PAGES):
        page(doc, p, i + 1, i == 0)
    doc.save(out)

if __name__ == "__main__":
    build(sys.argv[1])
