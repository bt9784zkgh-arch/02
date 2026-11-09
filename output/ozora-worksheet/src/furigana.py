# -*- coding: utf-8 -*-
# 記法のない漢字に、自動でふりがな {漢字|かんじ} をつける（総ルビ）
import re
import pykakasi

_k = pykakasi.kakasi()
KANJI = r"[㐀-鿿々〆]"
MARK = re.compile(r"(\{[^{}]+\|[^{}]+\})")

# 自動の読みがまちがえやすい語は、ここで決める（語: 読み）
OVERRIDE = {
    "今日": "きょう", "明日": "あした", "昨日": "きのう", "一人": "ひとり", "二人": "ふたり", "1人": "=1{人|ひとり}", "2人": "=2{人|ふたり}", "２人": "=２{人|ふたり}",
    "大人": "おとな", "友達": "ともだち", "今年": "ことし", "上手": "じょうず", "下手": "へた",
    "一日": "いちにち", "一番": "いちばん", "他己紹介": "たこしょうかい", "テスト中": "=テスト{中|ちゅう}", "1日中": "=1{日中|にちじゅう}", "1日": "=1{日|にち}",
    "時計": "とけい", "部屋": "へや", "眼差し": "まなざし", "お年玉": "おとしだま", "給食": "きゅうしょく",
    "身体": "からだ", "一緒": "いっしょ", "一生": "いっしょう", "優先座席": "ゆうせんざせき",
    "風呂": "ふろ", "寝不足": "ねぶそく", "寝坊": "ねぼう", "人目": "ひとめ",
    "手伝い": "てつだい", "宿題": "しゅくだい", "一つ": "ひとつ", "二つ": "ふたつ", "三つ": "みっつ",
    "日曜日": "にちようび", "月曜日": "げつようび", "火曜日": "かようび", "水曜日": "すいようび",
    "木曜日": "もくようび", "金曜日": "きんようび", "土曜日": "どようび", "土日": "どにち",
    "金額": "きんがく", "家賃": "やちん", "通信費": "つうしんひ", "光熱費": "こうねつひ",
    "水道代": "すいどうだい", "食費": "しょくひ", "娯楽費": "ごらくひ", "住居費": "じゅうきょひ",
    "内訳": "うちわけ", "日本人": "にほんじん", "一人暮らし": "ひとりぐらし",
}
# 1語ずつ分けた あとで 読みを 直す（語の 形: 読み）
POST = {"細く": "ほそく", "食に": "しょくに", "主": "ぬし", "用を": "ようを", "筋": "きん", "間に": "あいだに",
        "入っ": "はいっ", "入ら": "はいら", "入る": "はいる", "通り": "とおり", "通る": "とおる", "引き": "びき",
        "大す": "だいす", "小さい": "ちいさい", "小さ": "ちいさ", "日": "ひ", "何": "なん", "月": "げつ", "土": "ど",
        "金": "かね", "列": "れつ", "家": "いえ", "火": "か", "水": "すい", "木": "もく", "表": "ひょう", "列の": "れつの", "列に": "れつに",
        **{"人" + x: "ひと" + x for x in ["", "は", "に", "が", "を", "の", "と", "で", "も", "や", "、", "たち"]}}
_over_re = re.compile("|".join(sorted((re.escape(w) for w in OVERRIDE if OVERRIDE[w]), key=len, reverse=True)))

def _kata2hira(s):
    return "".join(chr(ord(c) - 0x60) if "ァ" <= c <= "ヶ" else c for c in s)

def _align(orig, hira):
    """送りがなを分けて、漢字の部分だけに読みをつける"""
    parts = re.findall(KANJI + "+|[^㐀-鿿々〆]+", orig)
    pat = "".join("(.+?)" if re.match(KANJI, p) else "(" + re.escape(_kata2hira(p)) + ")" for p in parts)
    m = re.fullmatch(pat, hira)
    if not m:
        return "{" + orig + "|" + hira + "}" if re.search(KANJI, orig) else orig
    out = ""
    for p, g in zip(parts, m.groups()):
        out += "{" + p + "|" + g + "}" if re.match(KANJI, p) else p
    return out

def _plain(seg):
    if not re.search(KANJI, seg):
        return seg
    # 先に、決めておいた語をしるしに変える
    seg = _over_re.sub(lambda m: "\x00" + m.group(0) + "\x01", seg)
    out = ""
    for chunk in re.split(r"(\x00[^\x01]+\x01)", seg):
        if chunk.startswith("\x00"):
            w = chunk[1:-1]
            v = OVERRIDE[w]
            out += v[1:] if v.startswith("=") else "{" + w + "|" + v + "}"
        elif re.search(KANJI, chunk):
            for t in _k.convert(chunk):
                o, h = t["orig"], POST.get(t["orig"], t["hira"])
                out += _align(o, h) if re.search(KANJI, o) else o
        else:
            out += chunk
    return out

LOG = set()

def auto(s):
    res = "".join(p if MARK.fullmatch(p) else _plain(p) for p in MARK.split(s))
    for b, r in re.findall(r"\{([^|{}]+)\|([^{}]+)\}", res):
        LOG.add((b, r))
    return res
