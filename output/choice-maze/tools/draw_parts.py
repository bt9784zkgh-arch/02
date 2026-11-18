#!/usr/bin/env python3
"""choice-maze: きもちの顔・相手の顔・はんこ・地図・コツ のイラストをプログラムで描く。

design.md 8章の画風ルールに沿う:
  - パレットは 8-1 の色だけ
  - 墨の線は手描き風にゆらす（10px おきのノットに ±1.5px のノイズ、なめらかに補間）
  - 平らな塗り＋紙・布のざらつき（明るさのノイズ）
  - 3倍で描いてから縮小（線がなめらかになる）

使い方:  python3 tools/draw_parts.py        （output/choice-maze/ で実行しなくてもよい）
出力:    assets/img/face-*.png, partner-*.png, stamp-*.png, map-step*.png, tip-*.png
         tools/sheet-parts.png（確認用のコンタクトシート）
"""
import math
import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "assets", "img")
os.makedirs(OUT, exist_ok=True)

SS = 3  # 何倍で描いてから縮めるか

# ---- パレット（design.md 8-1） -------------------------------------------
SUMI = "#2A211C"
KINARI = "#F2E6CB"
KINARI2 = "#E6D3AA"
AI = "#1E2747"
AI_L = "#34406B"
AI_DEEP = "#121931"
AKANE = "#8C2B22"
AKANE_L = "#B5493A"
KIN = "#D2A03A"
KIN_INK = "#6B4A12"
HADA = "#EBCBA8"
HOHO = "#D98E7A"
HAIR_ME = "#3A2C25"
HAIR_B = "#5A4636"
HAIR_C = "#2A211C"
KOKE = "#5E7A5A"
HAIAO = "#6F7F99"
KARASHI = "#B8913A"
MOYA = "#8A8580"
IRA = "#C0392B"
NAMIDA = "#3E6FA8"


def rgba(c, a=255):
    if isinstance(c, tuple):
        return c if len(c) == 4 else c + (a,)
    c = c.lstrip("#")
    return (int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16), a)


# ---- 形の点列 ------------------------------------------------------------
def ell(cx, cy, rx, ry, a0=0, a1=360, n=None):
    """楕円（または弧）。角度は度、y は下向き（90°=下）。"""
    if n is None:
        n = max(16, int(abs(a1 - a0) / 4))
    t = np.radians(np.linspace(a0, a1, n))
    return [(cx + rx * math.cos(a), cy + ry * math.sin(a)) for a in t]


def bez(*c, n=24):
    """2次または3次ベジェ。"""
    pts = []
    for i in range(n + 1):
        t = i / n
        if len(c) == 3:
            x = (1 - t) ** 2 * c[0][0] + 2 * (1 - t) * t * c[1][0] + t ** 2 * c[2][0]
            y = (1 - t) ** 2 * c[0][1] + 2 * (1 - t) * t * c[1][1] + t ** 2 * c[2][1]
        else:
            x = ((1 - t) ** 3 * c[0][0] + 3 * (1 - t) ** 2 * t * c[1][0]
                 + 3 * (1 - t) * t ** 2 * c[2][0] + t ** 3 * c[3][0])
            y = ((1 - t) ** 3 * c[0][1] + 3 * (1 - t) ** 2 * t * c[1][1]
                 + 3 * (1 - t) * t ** 2 * c[2][1] + t ** 3 * c[3][1])
        pts.append((x, y))
    return pts


def star(cx, cy, r1, r2, k=5, rot=-90):
    pts = []
    for i in range(k * 2):
        r = r1 if i % 2 == 0 else r2
        a = math.radians(rot + i * 180 / k)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def heart(cx, cy, s):
    """ハート（幅 ≒ 2s）。"""
    pts = []
    for i in range(80):
        t = 2 * math.pi * i / 80
        x = 16 * math.sin(t) ** 3
        y = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
        pts.append((cx + x * s / 16, cy + y * s / 16))
    return pts


def wave(x0, x1, y, amp, periods, n=60):
    return [(x0 + (x1 - x0) * i / n, y + amp * math.sin(2 * math.pi * periods * i / n)) for i in range(n + 1)]


def rrect(x0, y0, x1, y1, r):
    return (ell(x1 - r, y0 + r, r, r, 270, 360, 10) + ell(x1 - r, y1 - r, r, r, 0, 90, 10)
            + ell(x0 + r, y1 - r, r, r, 90, 180, 10) + ell(x0 + r, y0 + r, r, r, 180, 270, 10))


# ---- 手描きのゆれ ----------------------------------------------------------
def wobble(P, closed, amp, rng, step=10.0):
    P = np.asarray(P, float)
    if len(P) < 2 or amp <= 0:
        return P
    pts = np.vstack([P, P[:1]]) if closed else P
    out = []
    for a, b in zip(pts[:-1], pts[1:]):
        L = float(np.hypot(*(b - a)))
        k = max(1, int(math.ceil(L / 3.0)))
        for i in range(k):
            out.append(a + (b - a) * i / k)
    if not closed:
        out.append(pts[-1])
    R = np.array(out)
    seg = np.hypot(*np.diff(np.vstack([R, R[:1]]) if closed else R, axis=0).T)
    s = np.concatenate([[0], np.cumsum(seg)])
    total = s[-1]
    s = s[: len(R)]
    if total < 1:
        return R
    nk = max(4, int(total / step))
    knots = rng.uniform(-amp, amp, nk + 1)
    if closed:
        knots[-1] = knots[0]
    else:
        knots[0] *= 0.3
        knots[-1] *= 0.3
    x = s / total * nk
    i = np.clip(np.floor(x).astype(int), 0, nk - 1)
    f = x - i
    f = (1 - np.cos(np.pi * f)) / 2
    noise = knots[i] * (1 - f) + knots[i + 1] * f
    if closed:
        prev, nxt = np.roll(R, 1, 0), np.roll(R, -1, 0)
    else:
        prev = np.vstack([R[:1], R[:-1]])
        nxt = np.vstack([R[1:], R[-1:]])
    tv = nxt - prev
    tn = np.hypot(*tv.T) + 1e-9
    N = np.stack([-tv[:, 1] / tn, tv[:, 0] / tn], 1)
    return R + N * noise[:, None]


# ---- ペン（3倍のキャンバスに描く） -----------------------------------------
class Pen:
    def __init__(self, W, H, seed=1, bg=None):
        self.W, self.H = W, H
        self.im = Image.new("RGBA", (W * SS, H * SS), rgba(bg) if bg else (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.im)
        self.T = [(0.0, 0.0, 1.0)]
        self.rng = np.random.default_rng(seed)

    # 座標の変換（ox, oy は今の座標系で、sc は倍率）
    def push(self, ox, oy, sc):
        x0, y0, s0 = self.T[-1]
        self.T.append((x0 + ox * s0, y0 + oy * s0, s0 * sc))

    def pop(self):
        self.T.pop()

    @property
    def sc(self):
        return self.T[-1][2]

    def tf(self, pts):
        x0, y0, s = self.T[-1]
        a = np.asarray(pts, float)
        return np.stack([x0 + a[:, 0] * s, y0 + a[:, 1] * s], 1)

    def layer(self):
        L = Pen(self.W, self.H)
        L.T = list(self.T)
        L.rng = self.rng
        return L

    def _surface(self, color):
        c = rgba(color)
        if c[3] < 255:
            tmp = Image.new("RGBA", self.im.size, (0, 0, 0, 0))
            return c, tmp, ImageDraw.Draw(tmp)
        return c, None, self.d

    def shape(self, pts, fill=None, line=SUMI, w=6, closed=True, amp=1.5, wob=True):
        P = self.tf(pts)
        if wob:
            P = wobble(P, closed, amp * min(1.0, max(0.45, self.sc)), self.rng)
        Q = [(float(x) * SS, float(y) * SS) for x, y in P]
        if fill is not None and len(Q) >= 3:
            c, tmp, d = self._surface(fill)
            d.polygon(Q, fill=c)
            if tmp is not None:
                self.im.alpha_composite(tmp)
        if line is not None and w > 0:
            lw = max(1.5, w * self.sc) * SS
            c, tmp, d = self._surface(line)
            q = Q + [Q[0]] if closed else Q
            d.line(q, fill=c, width=int(round(lw)), joint="curve")
            if not closed:
                r = lw / 2
                for (x, y) in (q[0], q[-1]):
                    d.ellipse([x - r, y - r, x + r, y + r], fill=c)
            if tmp is not None:
                self.im.alpha_composite(tmp)

    def stroke(self, pts, color=SUMI, w=6, amp=1.5, wob=True, closed=False):
        self.shape(pts, fill=None, line=color, w=w, closed=closed, amp=amp, wob=wob)

    def cord(self, pts, inner, w=6, edge=SUMI, edge_w=3.5, amp=1.2):
        """ふちどりした太い線（ひも・道・取っ手）。"""
        seed = self.rng.integers(1 << 30)
        self.rng = np.random.default_rng(seed)
        self.stroke(pts, edge, w + 2 * edge_w, amp=amp)
        self.rng = np.random.default_rng(seed)
        self.stroke(pts, inner, w, amp=amp)
        self.rng = np.random.default_rng(seed + 1)

    def dot(self, x, y, r, color=SUMI):
        (X, Y), = self.tf([(x, y)])
        R = max(1.2, r * self.sc) * SS
        c, tmp, d = self._surface(color)
        d.ellipse([X * SS - R, Y * SS - R, X * SS + R, Y * SS + R], fill=c)
        if tmp is not None:
            self.im.alpha_composite(tmp)

    def dashed_ring(self, cx, cy, r, color=KIN_INK, w=3, dash=10, gap=9):
        circ = 2 * math.pi * r
        n = int(circ / (dash + gap))
        for i in range(n):
            a0 = 360 * i / n
            a1 = a0 + 360 * dash / circ
            self.stroke(ell(cx, cy, r, r, a0, a1, 6), color, w, wob=False)

    def paste_layer(self, layer, mask_pts=None):
        """layer を（mask_pts の中だけ）重ねる。"""
        if mask_pts is None:
            self.im.alpha_composite(layer.im)
            return
        P = self.tf(mask_pts)
        m = Image.new("L", self.im.size, 0)
        ImageDraw.Draw(m).polygon([(x * SS, y * SS) for x, y in P], fill=255)
        a = np.minimum(np.asarray(layer.im.getchannel("A"), np.uint16), np.asarray(m, np.uint16))
        im = layer.im.copy()
        im.putalpha(Image.fromarray(a.astype(np.uint8)))
        self.im.alpha_composite(im)

    def paste_image(self, img, x, y, size):
        """出来上がった PNG（img）を、中心 x,y・一辺 size で貼る。"""
        (X, Y), = self.tf([(x, y)])
        S = int(size * self.sc * SS)
        im = img.resize((S, int(S * img.height / img.width)), Image.LANCZOS)
        self.im.alpha_composite(im, (int(X * SS - im.width / 2), int(Y * SS - im.height / 2)))

    def finish(self, seed=0, grain=True, edge=None):
        im = self.im.resize((self.W, self.H), Image.LANCZOS)
        if grain:
            im = add_grain(im, seed, edge)
        return im


def add_grain(im, seed, edge=None):
    """紙・布のざらつき（細かい粒＋大きなむら）。edge='paper' なら端を少し暗く。"""
    rng = np.random.default_rng(seed + 99)
    a = np.asarray(im).astype(np.float32)
    h, w = a.shape[:2]
    fine = rng.normal(0, 1, (h, w)).astype(np.float32)
    blot = rng.normal(0, 1, (h // 6 + 1, w // 6 + 1)).astype(np.float32)
    blot_im = Image.fromarray(((blot * 40) + 128).clip(0, 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    blot_im = blot_im.filter(ImageFilter.GaussianBlur(3))
    blot = (np.asarray(blot_im, np.float32) - 128) / 40
    fac = 1 + 0.035 * fine + 0.03 * blot
    a[..., :3] *= fac[..., None]
    if edge:
        yy, xx = np.mgrid[0:h, 0:w]
        dist = np.minimum.reduce([xx, yy, w - 1 - xx, h - 1 - yy]).astype(np.float32)
        k = np.clip(1 - dist / 24.0, 0, 1)[..., None] * 0.30
        if edge == "paper":
            a[..., :3] = a[..., :3] * (1 - k) + np.array(rgba(KINARI2)[:3], np.float32) * k
        else:  # 暗い地は少しだけ暗く
            a[..., :3] *= (1 - k * 0.6)
    return Image.fromarray(a.clip(0, 255).astype(np.uint8), "RGBA")


# ======================================================================
#  顔のパーツ（中心 cx,cy・半径 R の丸顔を基準にした相対座標）
# ======================================================================
def features(p, cx, cy, R, eyes="dot", brows="flat", mouth="smile", lw=6, look=0.0, cheeks=True):
    def E(x, y):
        return (cx + x * R, cy + y * R)

    er = max(3.2, 0.075 * R)  # 目の点の半径
    # ほお
    if cheeks:
        for s in (-1, 1):
            p.shape(ell(*E(s * 0.6, 0.36), 0.17 * R, 0.10 * R), fill=rgba(HOHO, 128), line=None, wob=False)
    # 目
    for s in (-1, 1):
        ex, ey = E(s * 0.40 + look, 0.12)
        if eyes == "dot":
            p.dot(ex, ey, er)
        elif eyes == "big":
            p.shape(ell(ex, ey, 0.18 * R, 0.19 * R), fill="#FBF5E6", line=SUMI, w=lw * 0.7, amp=0.6)
            p.dot(ex + 0.02 * R, ey + 0.02 * R, 0.10 * R)
            p.dot(ex + 0.06 * R, ey - 0.04 * R, 0.035 * R, KINARI)
        elif eyes == "happy":  # ^ の弧（にっこり）
            p.stroke(ell(ex, ey + 0.06 * R, 0.15 * R, 0.13 * R, 200, 340, 14), SUMI, lw, amp=0.6)
        elif eyes == "relief":  # ‿ の弧（とじた目）
            p.stroke(ell(ex, ey - 0.04 * R, 0.16 * R, 0.10 * R, 15, 165, 14), SUMI, lw, amp=0.6)
        elif eyes == "shut":  # ぎゅっ（横線）
            p.stroke([(ex - 0.14 * R, ey), (ex + 0.14 * R, ey)], SUMI, lw, amp=0.5)
    # まゆ（左右で inner / outer の高さを決める）
    table = {
        "flat": (-0.27, -0.27, 0.03),
        "up": (-0.36, -0.34, 0.05),
        "worried": (-0.38, -0.18, 0.0),   # 八の字（内側が上）
        "droop": (-0.27, -0.15, 0.0),     # 低く、外が下がる
        "angry": (-0.14, -0.36, 0.0),     # つり上がり（内側が下）
        "firm": (-0.30, -0.33, 0.0),
    }
    if brows:
        yi, yo, arch = table[brows]
        for s in (-1, 1):
            a = E(s * 0.20 + look * 0.5, yi)
            b = E(s * 0.60 + look * 0.5, yo)
            m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - arch * R)
            p.stroke(bez(a, m, b, n=12), SUMI, lw * 1.15, amp=0.6)
    # 口
    mx, my = E(look * 0.6, 0.5)
    if mouth == "smile":
        p.stroke(ell(mx, my - 0.1 * R, 0.24 * R, 0.15 * R, 20, 160, 20), SUMI, lw, amp=0.6)
    elif mouth == "soft":
        p.stroke(ell(mx, my - 0.08 * R, 0.15 * R, 0.08 * R, 25, 155, 16), SUMI, lw, amp=0.5)
    elif mouth == "open":
        pts = [(mx - 0.28 * R, my - 0.1 * R)] + ell(mx, my - 0.1 * R, 0.28 * R, 0.26 * R, 0, 180, 24)[::-1]
        pts = [(mx - 0.28 * R, my - 0.1 * R), (mx + 0.28 * R, my - 0.1 * R)] + ell(mx, my - 0.1 * R, 0.28 * R, 0.26 * R, 0, 180, 24)
        p.shape(pts, fill=AKANE, line=SUMI, w=lw, amp=0.6)
        p.shape(ell(mx, my + 0.08 * R, 0.13 * R, 0.06 * R, 180, 360, 12), fill=AKANE_L, line=None, wob=False)
    elif mouth == "grin":
        p.stroke(ell(mx, my - 0.12 * R, 0.30 * R, 0.14 * R, 15, 165, 20), SUMI, lw, amp=0.6)
        for s in (-1, 1):
            x = mx + s * 0.30 * R * math.cos(math.radians(15))
            p.stroke([(x, my - 0.12 * R + 0.02 * R), (x + s * 0.05 * R, my - 0.18 * R)], SUMI, lw * 0.8, amp=0.3)
    elif mouth == "line":
        p.stroke([(mx - 0.18 * R, my), (mx + 0.18 * R, my)], SUMI, lw, amp=0.6)
    elif mouth == "small":
        p.stroke([(mx - 0.08 * R, my), (mx + 0.08 * R, my)], SUMI, lw, amp=0.4)
    elif mouth == "wave":
        p.stroke(wave(mx - 0.22 * R, mx + 0.22 * R, my, 0.045 * R, 2), SUMI, lw, amp=0.3)
    elif mouth == "wave_s":
        p.stroke(wave(mx - 0.13 * R, mx + 0.13 * R, my, 0.04 * R, 1.5), SUMI, lw, amp=0.3)
    elif mouth == "frown":  # への字
        p.stroke(ell(mx, my + 0.10 * R, 0.20 * R, 0.13 * R, 200, 340, 18), SUMI, lw, amp=0.5)
    elif mouth == "o":
        p.shape(ell(mx, my, 0.09 * R, 0.11 * R), fill=AKANE, line=SUMI, w=lw * 0.8, amp=0.4)


def hair(p, cx, cy, R, style, color, lw=6, part="back"):
    def E(x, y):
        return (cx + x * R, cy + y * R)

    if part == "back":
        if style == "bob":  # 主人公: 肩までの短いボブ
            pts = ell(*E(0, -0.08), 1.25 * R, 1.17 * R, 180, 360) + [E(1.25, 0.62), E(1.16, 0.78), E(-1.16, 0.78), E(-1.25, 0.62)]
        elif style == "neat":
            pts = ell(*E(0, -0.06), 1.12 * R, 1.10 * R, 180, 360) + [E(1.12, 0.22), E(1.0, 0.3), E(-1.0, 0.3), E(-1.12, 0.22)]
        elif style == "curly":
            pts = []
            for i in range(120):
                t = 2 * math.pi * i / 120
                r = 1.16 * (1 + 0.055 * abs(math.sin(7 * t)))
                pts.append(E(r * math.cos(t), -0.14 + r * 0.98 * math.sin(t)))
        elif style == "spiky":
            pts = [E(-1.13, 0.3)]
            spikes = 9
            for i in range(spikes * 2 + 1):
                a = math.pi + math.pi * i / (spikes * 2)
                r = 1.13 if i % 2 == 0 else 1.32
                if i in (0, spikes * 2):
                    r = 1.13
                pts.append(E(r * math.cos(a), -0.08 + r * 1.0 * math.sin(a)))
            pts += [E(1.13, 0.3)]
        elif style == "short":
            pts = ell(*E(0, -0.08), 1.10 * R, 1.06 * R, 180, 360) + [E(1.1, 0.05), E(-1.1, 0.05)]
        p.shape(pts, fill=color, line=SUMI, w=lw)
        return
    # 前髪
    top = ell(*E(0, 0), 1.04 * R, 1.04 * R, 200, 340)
    if style == "bob":
        fr = [E(0.98, -0.40), E(0.72, -0.50), E(0.46, -0.40), E(0.16, -0.56), E(-0.14, -0.42), E(-0.44, -0.57), E(-0.74, -0.44), E(-0.98, -0.38)]
    elif style == "neat":  # 横に流した前髪
        fr = [E(0.98, -0.36), E(0.6, -0.48), E(0.1, -0.52), E(-0.45, -0.64), E(-0.85, -0.52), E(-0.98, -0.36)]
    elif style == "curly":
        fr = []
        for i in range(9):
            x = 0.98 - i * 1.96 / 8
            fr.append(E(x, -0.50 if i % 2 == 0 else -0.62))
    elif style == "spiky":
        fr = [E(0.98, -0.40), E(0.7, -0.46), E(0.55, -0.62), E(0.32, -0.42), E(0.1, -0.64), E(-0.12, -0.42), E(-0.36, -0.64), E(-0.55, -0.44), E(-0.75, -0.58), E(-0.98, -0.40)]
    elif style == "short":
        fr = [E(0.98, -0.40), E(0.5, -0.60), E(0.0, -0.66), E(-0.5, -0.60), E(-0.98, -0.40)]
    p.shape(top + fr, fill=color, line=SUMI, w=lw)


def head(p, cx, cy, R, style, color, lw=6, feat=None, after_bangs=None):
    hair(p, cx, cy, R, style, color, lw, "back")
    p.shape(ell(cx, cy, R, R * 0.98), fill=HADA, line=SUMI, w=lw)
    hair(p, cx, cy, R, style, color, lw, "front")
    if after_bangs:
        after_bangs()
    if feat is not None:
        features(p, cx, cy, R, lw=lw, **feat)


def shoulders(cx, cy, R, dy=0.0, width=1.0):
    def Q(x, y):
        return (cx + x * R * width, cy + y * R + dy)
    return ([Q(-2.4, 3.2), Q(-2.25, 2.0)]
            + bez(Q(-2.25, 2.0), Q(-2.0, 1.36), Q(-1.0, 1.2), Q(0, 1.18))[1:]
            + bez(Q(0, 1.18), Q(1.0, 1.2), Q(2.0, 1.36), Q(2.25, 2.0))[1:]
            + [Q(2.4, 3.2)])


def neck(p, cx, cy, R, lw):
    p.shape([(cx - 0.3 * R, cy + 0.75 * R), (cx + 0.3 * R, cy + 0.75 * R), (cx + 0.3 * R, cy + 1.35 * R), (cx - 0.3 * R, cy + 1.35 * R)],
            fill=HADA, line=SUMI, w=lw)


def body(p, cx, cy, R, kind, lw=6, dy=0.0):
    """上半身の服。kind: hoodie_me / hoodie / cardigan / apron / jersey"""
    def E(x, y):
        return (cx + x * R, cy + y * R + dy)

    col = {"hoodie_me": AI_L, "hoodie": HAIAO, "cardigan": KARASHI, "apron": KINARI2, "jersey": KOKE}[kind]
    if kind.startswith("hoodie"):
        # 背中に下ろしたフード（首のうしろに見えるふち）
        p.shape(ell(*E(0, 1.16), 0.82 * R, 0.36 * R), fill=col, line=SUMI, w=lw)
        p.shape(ell(*E(0, 1.10), 0.56 * R, 0.20 * R), fill=AI if kind == "hoodie_me" else AI_L, line=SUMI, w=lw * 0.7)
    neck(p, cx, cy, R, lw)
    p.shape(shoulders(cx, cy, R, dy), fill=col, line=SUMI, w=lw)
    if kind.startswith("hoodie"):
        for s in (-1, 1):
            p.cord([E(s * 0.2, 1.30), E(s * 0.24, 1.78)], KINARI, w=lw * 0.8, edge_w=lw * 0.45, amp=0.6)
            p.dot(*E(s * 0.24, 1.80), 0.07 * R, KINARI)
        p.stroke(bez(E(-1.55, 1.62), E(-1.45, 1.85), E(-1.5, 2.1), n=10), SUMI, lw * 0.6)
        p.stroke(bez(E(1.55, 1.62), E(1.45, 1.85), E(1.5, 2.1), n=10), SUMI, lw * 0.6)
    elif kind == "cardigan":
        p.shape([E(-0.5, 1.21), E(0, 2.2), E(0.5, 1.21)], fill=KINARI, line=SUMI, w=lw)
        for s in (-1, 1):  # シャツのえり
            p.shape([E(s * 0.28, 1.19), E(s * 0.02, 1.48), E(s * 0.42, 1.52)], fill=KINARI, line=SUMI, w=lw * 0.8)
        p.dot(*E(0.1, 2.35), 0.07 * R, SUMI)
        p.stroke([E(-1.6, 1.7), E(-1.55, 2.3)], SUMI, lw * 0.6)
        p.stroke([E(1.6, 1.7), E(1.55, 2.3)], SUMI, lw * 0.6)
    elif kind == "apron":
        bib = [E(-0.62, 1.62), E(0.62, 1.62), E(0.8, 3.0), E(-0.8, 3.0)]
        for s in (-1, 1):
            p.cord([E(s * 0.52, 1.66), E(s * 0.34, 1.22)], KOKE, w=lw * 1.4, edge_w=lw * 0.45, amp=0.5)
        p.shape(bib, fill=KOKE, line=SUMI, w=lw)
        p.shape([E(-0.32, 2.0), E(0.32, 2.0), E(0.32, 2.38), E(-0.32, 2.38)], fill=None, line=KINARI2, w=lw * 0.7)
        p.stroke([E(0, 2.0), E(0, 2.38)], KINARI2, lw * 0.6)
    elif kind == "jersey":
        for s in (-1, 1):  # 肩のライン（生成り）
            p.cord(bez(E(s * 0.55, 1.22), E(s * 1.4, 1.3), E(s * 2.2, 1.95), n=14), KINARI, w=lw * 0.9, edge_w=lw * 0.35, amp=0.6)
        # 立ちえり
        p.shape([E(-0.42, 1.0), E(0.42, 1.0), E(0.5, 1.3), E(0, 1.42), E(-0.5, 1.3)], fill=KOKE, line=SUMI, w=lw)
        p.stroke([E(0, 1.42), E(0, 3.0)], SUMI, lw * 0.8)
        p.shape([E(0.04, 1.5), E(0.17, 1.5), E(0.17, 1.78), E(0.04, 1.78)], fill=KIN, line=SUMI, w=lw * 0.6)


# ======================================================================
#  きもちの顔（主人公）
# ======================================================================
KID = dict(cx=256, cy=252, R=100)

MOODS = {
    "hotto": dict(eyes="relief", brows="up", mouth="soft"),
    "dokidoki": dict(eyes="big", brows="up", mouth="o"),
    "moyamoya": dict(eyes="dot", brows="droop", mouth="wave"),
    "iraira": dict(eyes="dot", brows="angry", mouth="frown"),
    "kanashii": dict(eyes="dot", brows="worried", mouth="frown"),
    "sukkiri": dict(eyes="happy", brows="up", mouth="open"),
    "jishin": dict(eyes="dot", brows="firm", mouth="grin"),
    "hazukashii": dict(eyes="dot", brows="worried", mouth="small", look=0.24, cheeks=False),
    "neutral": dict(eyes="dot", brows="flat", mouth="soft"),
    "strong": dict(eyes="dot", brows="angry", mouth="line"),
}


def cloud(p, cx, cy, rx, ry, fill, lw):
    pts = []
    for i in range(140):
        t = 2 * math.pi * i / 140
        r = 1 + 0.16 * abs(math.sin(3.5 * t + 0.0)) if False else 1 + 0.17 * abs(math.sin(3 * t))
        pts.append((cx + rx * r * math.cos(t), cy + ry * r * math.sin(t)))
    p.shape(pts, fill=fill, line=SUMI, w=lw)


def lamp(p, cx, cy, s, fill=KIN, line=SUMI, lw=7, lit=False, flame=AKANE_L):
    p.push(cx, cy, s)
    p.cord(ell(-62, 6, 30, 24, 90, 270, 20), fill, w=12, edge=line, edge_w=lw * 0.6, amp=0.8)
    p.shape([(50, -6), (78, -8), (100, -20), (114, -36), (122, -30), (106, -6), (82, 14), (52, 26)], fill=fill, line=line, w=lw, amp=1)
    p.shape([(-64, 0), (64, 0)] + ell(0, 0, 64, 44, 0, 180, 30), fill=fill, line=line, w=lw, amp=1)
    p.shape([(-36, 0)] + ell(0, 0, 36, 28, 180, 360, 20) + [(36, 0)], fill=fill, line=line, w=lw, amp=1)
    p.shape(ell(0, -34, 9, 9), fill=fill, line=line, w=lw * 0.8, amp=0.4)
    p.shape([(-26, 40), (26, 40), (34, 58), (-34, 58)], fill=fill, line=line, w=lw, amp=0.8)
    if lit:
        p.shape(ell(118, -50, 13, 13, -30, 210, 16) + [(118, -84)], fill=flame, line=line, w=lw * 0.8, amp=0.6)
    p.pop()


def draw_kid(p, mood, flame=False):
    cx, cy, R = KID["cx"], KID["cy"], KID["R"]
    lw = 6
    dy = {"hotto": 20, "jishin": -18, "kanashii": 10}.get(mood, 0)
    if mood == "jishin":  # うしろに金の光の輪
        p.shape(ell(cx, cy, 168, 168), fill=None, line=KIN, w=14, amp=1.2)
        p.shape(ell(cx, cy, 196, 196), fill=None, line=KIN, w=5, amp=1.2)
        for i in range(12):
            a = math.radians(i * 30 + 15)
            p.stroke([(cx + 206 * math.cos(a), cy + 206 * math.sin(a)), (cx + 226 * math.cos(a), cy + 226 * math.sin(a))], KIN, 7, amp=0.4)
    body(p, cx, cy, R, "hoodie_me", lw, dy)

    def extra():
        if mood == "hazukashii":  # ほおに茜の丸＋斜線
            for s in (-1, 1):
                x, y = cx + s * 60 + 10, cy + 40
                p.shape(ell(x, y, 25, 15), fill=AKANE_L, line=None, amp=0.6)
                for k in (-1, 0, 1):
                    p.stroke([(x + k * 12 - 5, y + 8), (x + k * 12 + 5, y - 8)], AKANE, 4, amp=0.2)
        # 主人公の髪のつや
        p.stroke(ell(cx - 10, cy - 20, 96, 96, 215, 250, 10), HAIR_B, 6, amp=0.4)

    head(p, cx, cy - (8 if mood == "jishin" else 0), R, "bob", HAIR_ME, lw, MOODS[mood], extra)

    # きもちの記号
    if mood == "moyamoya":
        cloud(p, cx, 86, 104, 40, MOYA, lw)
        p.stroke([(cx - 40 + 3 * t * math.cos(t) * 2.2, 86 + 3 * t * math.sin(t) * 1.2) for t in np.linspace(0, 4.4 * math.pi / 2, 40)], SUMI, 4.5, amp=0.2)
        p.stroke([(cx + 34 + 3 * t * math.cos(t + 2) * 2.2, 88 + 3 * t * math.sin(t + 2) * 1.2) for t in np.linspace(0, 4.4 * math.pi / 2, 40)], SUMI, 4, amp=0.2)
    elif mood == "iraira":
        pts = []
        for i in range(22):
            a = math.radians(-90 + i * 360 / 22)
            r = (58 if i % 2 == 0 else 34)
            pts.append((cx + 20 + r * math.cos(a) * 1.15, 82 + r * math.sin(a) * 0.9))
        p.shape(pts, fill=IRA, line=SUMI, w=lw, amp=0.8)
        p.stroke([(cx - 92, 116), (cx - 112, 92)], IRA, 8, amp=0.4)
        p.stroke([(cx - 70, 104), (cx - 80, 76)], IRA, 8, amp=0.4)
    elif mood == "kanashii":
        tx, ty = cx - 44, cy + 50
        p.shape(ell(tx, ty, 15, 16, -35, 215, 24) + [(tx, ty - 34)], fill=NAMIDA, line=SUMI, w=4.5, amp=0.4)
        p.dot(tx - 4, ty - 2, 3.5, "#9FBBDD")
    elif mood == "sukkiri":
        for (x, y, r, rot) in [(98, 138, 30, -90), (414, 126, 26, -80), (86, 302, 22, -100), (426, 300, 30, -86)]:
            p.shape(star(x, y, r, r * 0.45, 5, rot), fill=KIN, line=SUMI, w=4.5, amp=0.5)
    elif mood == "dokidoki":
        hx, hy = cx + 50, 440 + dy
        p.shape(heart(hx, hy, 30), fill=AKANE_L, line=SUMI, w=lw, amp=0.6)
        for k, x in enumerate((hx + 46, hx + 64)):
            pts = [(x + 5 * math.sin(i / 6 * math.pi * 2), hy - 30 + i * 10) for i in range(7)]
            p.cord(pts, AKANE_L, w=5, edge=KINARI, edge_w=2.5, amp=0.3)
        for k, x in enumerate((hx - 46, hx - 64)):
            pts = [(x + 5 * math.sin(i / 6 * math.pi * 2), hy - 30 + i * 10) for i in range(7)]
            p.cord(pts, AKANE_L, w=5, edge=KINARI, edge_w=2.5, amp=0.3)
    elif mood == "hotto":  # ふうっと はいた いき（生成りの線3本）
        pass
    if flame:
        fx, fy = cx, 452
        p.shape(ell(fx, fy, 30, 30, -30, 210, 24) + [(fx + 8, fy - 70), (fx, fy - 46), (fx - 10, fy - 76)], fill=AKANE_L, line=SUMI, w=lw, amp=0.8)
        p.shape(ell(fx, fy + 6, 15, 15, -30, 210, 16) + [(fx + 2, fy - 30)], fill=KIN, line=None, amp=0.5)


def pedestal(p, cx, cy, r, lw, stitch_r=None):
    p.shape(ell(cx + r * 0.025, cy + r * 0.03, r * 0.955, r * 0.955), fill=KINARI2, line=None, amp=1)
    p.shape(ell(cx - r * 0.02, cy - r * 0.02, r * 0.93, r * 0.93), fill=KINARI, line=None, amp=1.5)
    if stitch_r:
        p.dashed_ring(cx, cy, stitch_r, KIN_INK, max(2, lw * 0.5), dash=lw * 2, gap=lw * 1.6)


def render_face(mood, size=512, seed=0, flame=False):
    p = Pen(512, 512, seed=seed)
    p.shape(ell(256, 256, 240, 240), fill=KINARI, line=None, amp=1)
    pedestal(p, 256, 256, 240, 6, stitch_r=222)
    L = p.layer()
    draw_kid(L, mood, flame)
    p.paste_layer(L, ell(256, 256, 236, 236, n=180))
    p.shape(ell(256, 256, 240, 240), fill=None, line=SUMI, w=6, amp=1.5)
    im = p.finish(seed)
    return im if size == 512 else im.resize((size, size), Image.LANCZOS)


# ======================================================================
#  相手の顔（256×256）
# ======================================================================
PARTNER_MOOD = {
    "nikko": dict(eyes="happy", brows="up", mouth="smile"),
    "futsuu": dict(eyes="dot", brows="flat", mouth="line"),
    "shinpai": dict(eyes="dot", brows="worried", mouth="wave_s"),
}

WHO = {
    "sensei": dict(hair="neat", color=HAIR_B, body="cardigan", glasses=True),
    "otona": dict(hair="curly", color=HAIR_C, body="cardigan", glasses=False, tag=True),
    "ie": dict(hair="short", color=HAIR_C, body="apron", scarf=True),
    "tomodachi": dict(hair="spiky", color=HAIR_B, body="hoodie"),
    "nakama": dict(hair="short", color=HAIR_C, body="jersey", band=True),
}


def draw_partner(p, who, mood):
    cx, cy, R, lw = 128, 116, 54, 4.2
    if who == "group":
        draw_group(p, mood)
        return
    w = WHO[who]
    body(p, cx, cy, R, w["body"], lw)
    if w.get("tag"):  # 緑の名札（文字なし）
        p.shape([(cx + 0.55 * R, cy + 1.62 * R), (cx + 1.25 * R, cy + 1.62 * R), (cx + 1.25 * R, cy + 2.05 * R), (cx + 0.55 * R, cy + 2.05 * R)],
                fill=KOKE, line=SUMI, w=lw, amp=0.6)
        p.shape([(cx + 0.66 * R, cy + 1.74 * R), (cx + 1.14 * R, cy + 1.74 * R), (cx + 1.14 * R, cy + 1.93 * R), (cx + 0.66 * R, cy + 1.93 * R)],
                fill=KINARI, line=None, amp=0.3)
        p.stroke([(cx + 0.9 * R, cy + 1.62 * R), (cx + 0.9 * R, cy + 1.5 * R)], SUMI, lw * 0.8)

    def extra():
        if w.get("scarf"):  # 家の人: 三角きん（茜）
            top = ell(cx, cy - 0.06 * R, 1.16 * R, 1.12 * R, 180, 360)
            band = top + [(cx + 1.12 * R, cy - 0.3 * R), (cx + 0.5 * R, cy - 0.5 * R), (cx - 0.5 * R, cy - 0.5 * R), (cx - 1.12 * R, cy - 0.3 * R)]
            p.shape(band, fill=AKANE_L, line=SUMI, w=lw)
            for (x, y) in [(-0.6, -0.8), (0, -0.95), (0.6, -0.8), (-0.3, -0.62), (0.3, -0.62)]:
                p.dot(cx + x * R, cy + y * R, 0.07 * R, KINARI)
            p.shape([(cx + 1.0 * R, cy - 0.45 * R), (cx + 1.42 * R, cy - 0.72 * R), (cx + 1.36 * R, cy - 0.3 * R)], fill=AKANE_L, line=SUMI, w=lw, amp=0.5)
            p.shape([(cx + 1.0 * R, cy - 0.38 * R), (cx + 1.4 * R, cy - 0.1 * R), (cx + 1.12 * R, cy + 0.02 * R)], fill=AKANE_L, line=SUMI, w=lw, amp=0.5)
        if w.get("band"):  # なかま: 茜のヘアバンド
            band = ell(cx, cy, 1.03 * R, 1.03 * R, 197, 343) + ell(cx, cy + 0.18 * R, 0.98 * R, 0.98 * R, 335, 205, 30)
            p.shape(band, fill=AKANE, line=SUMI, w=lw, amp=0.6)
        if w.get("glasses"):  # 先生: まるいめがね
            ey = cy + 0.12 * R
            for s in (-1, 1):
                p.shape(ell(cx + s * 0.40 * R, ey, 0.25 * R, 0.25 * R), fill=None, line=SUMI, w=lw * 0.85, amp=0.4)
            p.stroke(ell(cx, ey + 0.02 * R, 0.16 * R, 0.1 * R, 200, 340, 8), SUMI, lw * 0.8, amp=0.2)

    head(p, cx, cy, R, w["hair"], w["color"], lw, PARTNER_MOOD[mood], extra)


def draw_group(p, mood):
    """スマホの画面の中に、小さい丸顔が3つ。"""
    lw = 4.2
    p.shape(rrect(70, 26, 186, 236, 20), fill=SUMI, line=SUMI, w=lw, amp=0.8)
    screen = rrect(80, 46, 176, 214, 8)
    p.shape(screen, fill=AI_L, line=None, amp=0.5)
    p.stroke([(114, 36), (142, 36)], KINARI2, 4, amp=0.2)
    p.dot(128, 225, 5, KINARI2)
    L = p.layer()
    faces = [(128, 92, "short", HAIR_B, HAIAO), (104, 164, "spiky", HAIR_C, KOKE), (154, 160, "curly", HAIR_B, KARASHI)]
    for (x, y, st, hc, cc) in faces:
        R = 19
        L.shape(ell(x, y + 2.1 * R, 1.5 * R, 1.0 * R), fill=cc, line=SUMI, w=3.2)
        head(L, x, y, R, st, hc, 3.2, dict(PARTNER_MOOD[mood], cheeks=False))
    p.paste_layer(L, screen)


def render_partner(who, mood, size=256, seed=0):
    p = Pen(256, 256, seed=seed)
    pedestal(p, 128, 128, 120, 4, stitch_r=111)
    L = p.layer()
    draw_partner(L, who, mood)
    p.paste_layer(L, ell(128, 128, 117, 117, n=120))
    p.shape(ell(128, 128, 120, 120), fill=None, line=SUMI, w=4, amp=1.0)
    im = p.finish(seed)
    return im if size == 256 else im.resize((size, size), Image.LANCZOS)


def render_partner_big(who, mood, scale=2, seed=0):
    """コツのカード用に大きく描く。"""
    S = 256 * scale
    p = Pen(S, S, seed=seed)
    p.push(0, 0, scale)
    pedestal(p, 128, 128, 120, 4, stitch_r=111)
    L = p.layer()
    draw_partner(L, who, mood)
    p.paste_layer(L, ell(128, 128, 117, 117, n=120))
    p.shape(ell(128, 128, 120, 120), fill=None, line=SUMI, w=4, amp=1.0)
    return p.finish(seed)


# ======================================================================
#  はんこ（512×512・透明）
# ======================================================================
def render_stamp(kind, seed=0):
    p = Pen(512, 512, seed=seed)
    # 生成りの紙の丸＋金の縁
    p.shape(ell(256, 256, 236, 236), fill=KIN, line=SUMI, w=5, amp=1.2)
    p.shape(ell(256, 256, 218, 218), fill=KINARI, line=SUMI, w=3, amp=1.0)
    p.dashed_ring(256, 256, 227, KIN_INK, 3, dash=10, gap=8)
    paper = p.finish(seed, grain=True)

    ink = Pen(512, 512, seed=seed + 7)
    ink.push(256, 256, 1)
    ink.shape(ell(0, 0, 196, 196), fill=None, line=AKANE, w=14, amp=1.8)
    ink.shape(ell(0, 0, 176, 176), fill=None, line=AKANE, w=6, amp=1.4)
    if kind == "step1":  # ランプ＋家の屋根
        ink.stroke([(-150, -12), (0, -134), (150, -12)], AKANE, 18, amp=1)
        ink.stroke([(-118, -34), (-118, 118)], AKANE, 10)
        ink.stroke([(118, -34), (118, 118)], AKANE, 10)
        ink.stroke([(-132, 118), (132, 118)], AKANE, 10)
        ink.shape([(50, -100), (76, -100), (76, -62), (50, -62)], fill=AKANE, line=AKANE, w=4)  # えんとつ
        lamp(ink, -14, 56, 0.82, KIN, AKANE, 10, lit=True, flame=AKANE)
    elif kind == "step2":  # ランプ＋2人の丸顔
        for x in (-58, 58):
            ink.shape(ell(x, -72, 46, 46), fill=None, line=AKANE, w=10, amp=1)
            ink.dot(x - 15, -76, 6.5, AKANE)
            ink.dot(x + 15, -76, 6.5, AKANE)
            ink.stroke(ell(x, -64, 18, 12, 20, 160, 12), AKANE, 7, amp=0.4)
        lamp(ink, -14, 70, 0.82, KIN, AKANE, 10, lit=True, flame=AKANE)
    elif kind == "step3":  # ランプ＋ハート
        ink.shape(heart(0, -70, 58), fill=AKANE, line=AKANE, w=6, amp=1)
        lamp(ink, -14, 74, 0.82, KIN, AKANE, 10, lit=True, flame=AKANE)
    elif kind == "goal":  # ランプ3つ＋X字の金の道
        L = ink.layer()
        for a in (58, -58):
            ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
            w2, l2 = 20, 240
            pts = [(-l2 * ca - w2 * sa, -l2 * sa + w2 * ca), (l2 * ca - w2 * sa, l2 * sa + w2 * ca),
                   (l2 * ca + w2 * sa, l2 * sa - w2 * ca), (-l2 * ca + w2 * sa, -l2 * sa - w2 * ca)]
            L.shape(pts, fill=KIN, line=AKANE, w=7, amp=1)
        ink.paste_layer(L, ell(0, 0, 172, 172, n=120))
        lamp(ink, -8, -112, 0.46, KIN, AKANE, 9, lit=True, flame=AKANE)
        lamp(ink, -122, 12, 0.5, KIN, AKANE, 9, lit=True, flame=AKANE)
        lamp(ink, 104, 12, 0.5, KIN, AKANE, 9, lit=True, flame=AKANE)
        ink.shape(star(0, 118, 24, 10), fill=AKANE, line=AKANE, w=3, amp=0.3)
    ink.pop()
    im = ink.im.rotate(-6, resample=Image.BICUBIC, center=(256 * SS, 256 * SS))
    im = im.resize((512, 512), Image.LANCZOS)
    # かすれ: 約 8% の点を抜く（大きなむら＋細かい点）
    rng = np.random.default_rng(seed + 3)
    a = np.asarray(im).copy()
    coarse = rng.random((64, 64)).astype(np.float32)
    coarse = np.asarray(Image.fromarray((coarse * 255).astype(np.uint8)).resize((512, 512), Image.BICUBIC), np.float32) / 255
    fine = rng.random((512, 512))
    drop = (coarse > 0.86) & (fine < 0.75) | (fine < 0.04)
    a[..., 3] = np.where(drop, (a[..., 3] * 0.15).astype(np.uint8), a[..., 3])
    im = Image.fromarray(a, "RGBA")
    out = paper.copy()
    out.alpha_composite(im)
    return out


# ======================================================================
#  じゅうたん（地図・コツの床）
# ======================================================================
def fringe(p, x, y0, y1, side, length=14, gap=9, lw=3):
    """房。side=-1 なら左向き、1 なら右向き。"""
    y = y0 + gap / 2
    while y < y1:
        p.stroke([(x, y), (x + side * length, y + p.rng.uniform(-1.5, 1.5))], SUMI, lw + 3, amp=0.3)
        p.stroke([(x, y), (x + side * length, y)], KINARI2, lw, amp=0.3, wob=False)
        y += gap


def rug_strip(p, x0, y0, x1, y1):
    """紺と赤のひし形をくりかえす横長のじゅうたん（コツのカードの床）。"""
    fringe(p, x0, y0 + 4, y1 - 4, -1)
    fringe(p, x1, y0 + 4, y1 - 4, 1)
    p.shape([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], fill=AI, line=SUMI, w=4, amp=1)
    L = p.layer()
    h = y1 - y0
    cy = (y0 + y1) / 2
    n = int((x1 - x0) / h)
    dw = (x1 - x0) / n
    for i in range(n):
        cx = x0 + dw * (i + 0.5)
        col = AKANE if i % 2 == 0 else AI_L
        L.shape([(cx, y0 + 6), (cx + dw / 2 - 4, cy), (cx, y1 - 6), (cx - dw / 2 + 4, cy)], fill=col, line=SUMI, w=2.5, amp=0.6)
        for k in range(4):  # 小さい花（4枚の花びら）
            a = math.radians(45 + 90 * k)
            L.dot(cx + 6 * math.cos(a), cy + 6 * math.sin(a), 4, KIN)
        L.dot(cx, cy, 2.5, KIN_INK)
    p.paste_layer(L, [(x0 + 3, y0 + 3), (x1 - 3, y0 + 3), (x1 - 3, y1 - 3), (x0 + 3, y1 - 3)])
    p.stroke([(x0 + 8, y0 + 7), (x1 - 8, y0 + 7)], KIN, 2.5, amp=0.5)
    p.stroke([(x0 + 8, y1 - 7), (x1 - 8, y1 - 7)], KIN, 2.5, amp=0.5)


# ======================================================================
#  迷宮の地図のノード（480×360）
# ======================================================================
def render_map(n, seed=0):
    p = Pen(480, 360, seed=seed, bg=AI_DEEP)
    # 金の道（となりのノードへつながる）
    p.shape([(-10, 292), (490, 292)], fill=None, line=SUMI, w=46, amp=2, closed=False)
    p.shape([(-10, 292), (490, 292)], fill=None, line=KIN, w=36, amp=2, closed=False)
    # じゅうたん（上から見た図）
    x0, y0, x1, y1 = 60, 22, 420, 270
    fringe(p, x0, y0 + 6, y1 - 6, -1)
    fringe(p, x1, y0 + 6, y1 - 6, 1)
    p.shape([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], fill=AKANE, line=SUMI, w=5, amp=1.2)
    p.shape([(x0 + 18, y0 + 18), (x1 - 18, y0 + 18), (x1 - 18, y1 - 18), (x0 + 18, y1 - 18)], fill=AI, line=SUMI, w=3, amp=1)
    # 縁の小さいひし形（金）
    for x in np.arange(x0 + 30, x1 - 20, 26):
        for y in (y0 + 9, y1 - 9):
            p.shape([(x, y - 5), (x + 5, y), (x, y + 5), (x - 5, y)], fill=KIN, line=None, wob=False)
    for y in np.arange(y0 + 34, y1 - 20, 26):
        for x in (x0 + 9, x1 - 9):
            p.shape([(x, y - 5), (x + 5, y), (x, y + 5), (x - 5, y)], fill=KIN, line=None, wob=False)
    # 迷宮の通路（金の墨の細い線）
    L = p.layer()
    for (a, b) in [((90, 60), (150, 60)), ((150, 60), (150, 110)), ((330, 60), (390, 60)), ((330, 60), (330, 110)),
                   ((90, 230), (150, 230)), ((150, 230), (150, 190)), ((330, 230), (390, 230)), ((330, 230), (330, 190)),
                   ((90, 100), (90, 190)), ((390, 100), (390, 190))]:
        L.stroke([a, b], KIN, 5, amp=0.6)
    p.paste_layer(L)
    # まんなかのメダイヨン（生成り）
    cx, cy = 240, 146
    p.shape(ell(cx, cy, 132, 106), fill=KINARI, line=SUMI, w=5, amp=1.4)
    p.dashed_ring_ell = None
    for i in range(36):
        a0 = i * 10
        p.stroke(ell(cx, cy, 122, 96, a0, a0 + 5.5, 5), KIN_INK, 3, wob=False)
    M = p.layer()
    if n == 1:  # 家の形と机
        hx, hy = 185, 150
        M.shape([(hx - 40, hy - 10), (hx + 40, hy - 10), (hx + 40, hy + 46), (hx - 40, hy + 46)], fill=KINARI2, line=SUMI, w=4.5)
        M.shape([(hx - 54, hy - 6), (hx, hy - 56), (hx + 54, hy - 6)], fill=AKANE_L, line=SUMI, w=4.5)
        M.shape([(hx - 12, hy + 12), (hx + 12, hy + 12), (hx + 12, hy + 46), (hx - 12, hy + 46)], fill=AI_L, line=SUMI, w=4)
        M.shape([(hx + 20, hy + 2), (hx + 34, hy + 2), (hx + 34, hy + 16), (hx + 20, hy + 16)], fill=KIN, line=SUMI, w=3.5)
        dx, dy = 296, 150
        M.shape([(dx - 52, dy - 4), (dx + 52, dy - 4), (dx + 52, dy + 10), (dx - 52, dy + 10)], fill=KARASHI, line=SUMI, w=4.5)
        M.stroke([(dx - 42, dy + 10), (dx - 42, dy + 52)], SUMI, 6)
        M.stroke([(dx + 42, dy + 10), (dx + 42, dy + 52)], SUMI, 6)
        M.shape([(dx - 40, dy + 22), (dx + 40, dy + 22), (dx + 40, dy + 32), (dx - 40, dy + 32)], fill=KINARI2, line=SUMI, w=3)
        M.shape([(dx - 26, dy - 24), (dx + 10, dy - 24), (dx + 10, dy - 4), (dx - 26, dy - 4)], fill=AI_L, line=SUMI, w=3.5)  # ノート
        M.shape([(dx + 14, dy - 30), (dx + 34, dy - 30), (dx + 34, dy - 4), (dx + 14, dy - 4)], fill=KOKE, line=SUMI, w=3.5)
    elif n == 2:  # ボールとスマホと2人の丸顔
        bx, by = 156, 160
        M.shape(ell(bx, by, 32, 32), fill=KINARI2, line=SUMI, w=4.5)
        M.stroke(ell(bx - 32, by, 28, 38, -60, 60, 14), SUMI, 3.5)
        M.stroke(ell(bx + 32, by, 28, 38, 120, 240, 14), SUMI, 3.5)
        M.stroke([(bx - 32, by), (bx + 32, by)], SUMI, 3.5)
        px = 318
        M.shape(rrect(px - 21, 110, px + 21, 190, 9), fill=SUMI, line=SUMI, w=4)
        M.shape(rrect(px - 15, 120, px + 15, 180, 4), fill=AI_L, line=None)
        M.shape(ell(px - 2, 140, 10, 7), fill=KINARI, line=None, amp=0.4)
        M.shape(ell(px + 2, 160, 10, 7), fill=KINARI2, line=None, amp=0.4)
        for (x, y, st, hc, cc) in [(214, 140, "spiky", HAIR_B, HAIAO), (262, 146, "short", HAIR_C, KOKE)]:
            M.shape(ell(x, y + 40, 28, 18, 180, 360) + [(x + 28, y + 56), (x - 28, y + 56)], fill=cc, line=SUMI, w=3.5)
            head(M, x, y, 21, st, hc, 3.5, dict(eyes="dot", brows=None, mouth="smile", cheeks=False))
    elif n == 3:  # 主人公の顔と、胸の前の小さい炎
        M.push(240 - 256 * 0.42, 150 - 300 * 0.42, 0.42)
        draw_kid(M, "strong", flame=True)
        M.pop()
    p.paste_layer(M, ell(cx, cy, 129, 103, n=120))
    # 現在地の目じるし（道の上に、主人公の小さい顔の札）
    mx, my = 240, 296
    p.shape(ell(mx, my, 30, 30), fill=KINARI, line=SUMI, w=4, amp=0.6)
    p.shape(ell(mx, my, 30, 30), fill=None, line=KIN, w=0, amp=0.6)
    head(p, mx, my + 2, 15, "bob", HAIR_ME, 3, dict(eyes="dot", brows=None, mouth="soft", cheeks=False))
    return p.finish(seed, edge="dark")


# ======================================================================
#  コツのカード（640×480）
# ======================================================================
def arrow(p, x, y, length, up, fill=KIN):
    s = -1 if up else 1
    h = length / 2
    pts = [(x, y + s * h), (x + 34, y + s * (h - 40)), (x + 13, y + s * (h - 40)), (x + 13, y - s * h),
           (x - 13, y - s * h), (x - 13, y + s * (h - 40)), (x - 34, y + s * (h - 40))]
    p.shape(pts, fill=fill, line=SUMI, w=5, amp=0.8)


def render_tip(n, faces, seed=0):
    p = Pen(640, 480, seed=seed, bg=KINARI)
    rug_strip(p, 70, 404, 570, 452)
    if n == 1:
        cx, cy = 320, 220
        p.shape(ell(cx, cy, 196, 186), fill=rgba(KIN, 56), line=KIN_INK, w=6, amp=1.8)
        for i in range(40):
            a0 = i * 9
            p.stroke(ell(cx, cy, 164, 154, a0, a0 + 5, 5), KIN_INK, 4, wob=False)
        p.paste_image(faces["hotto"], cx, cy, 270)
        arrow(p, 66, 210, 170, up=True)
        arrow(p, 574, 210, 170, up=False)
    elif n == 2:
        p.paste_image(faces["neutral"], 196, 220, 320)
        for (y, key) in ((112, "iraira"), (300, "dokidoki")):
            # 考えのつながり（点線）
            for t in np.linspace(0.05, 0.9, 6):
                x = 330 + (420 - 330) * t
                yy = 200 + (y - 200) * t
                p.dot(x, yy, 4, KIN_INK)
            p.paste_image(faces[key], 450, y, 160)
            # 名札の形の空白の札（文字なし）
            tx, ty = 560, y + 4
            p.stroke([(530, y - 30), (tx, ty - 32)], SUMI, 3)
            p.shape([(tx - 30, ty - 32), (tx + 34, ty - 32), (tx + 46, ty), (tx + 34, ty + 32), (tx - 30, ty + 32)], fill=KINARI2, line=SUMI, w=5, amp=0.8)
            p.shape(ell(tx + 28, ty, 6, 6), fill=KINARI, line=SUMI, w=3, amp=0.2)
            for k in range(8):
                p.stroke([(tx - 22 + k * 8, ty - 24), (tx - 18 + k * 8, ty - 24)], KIN_INK, 3, wob=False)
                p.stroke([(tx - 22 + k * 8, ty + 24), (tx - 18 + k * 8, ty + 24)], KIN_INK, 3, wob=False)
    elif n == 3:
        p.paste_image(faces["neutral"], 196, 250, 290)
        p.paste_image(faces["partner_tomo"], 470, 262, 240)
        # 生成りの吹き出しに、墨の「？」の形
        bx, by = 352, 84
        p.shape([(bx - 64, by + 26), (284, 150), (bx - 22, by + 54)], fill=KINARI, line=SUMI, w=6, amp=0.8)
        p.shape(ell(bx, by, 98, 62), fill=KINARI, line=SUMI, w=6, amp=1.2)
        q = ell(bx, by - 18, 24, 22, 180, 400, 26) + bez((bx + 20, by - 4), (bx, by + 4), (bx, by + 16), n=8)[1:]
        p.stroke(q, SUMI, 13, amp=0.5)
        p.dot(bx, by + 38, 8.5)
    return p.finish(seed, edge="paper")


# ======================================================================
#  コンタクトシート
# ======================================================================
def contact_sheet(items, path):
    W = 1800
    font = None
    for f in ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",):
        if os.path.exists(f):
            font = ImageFont.truetype(f, 15)
    font = font or ImageFont.load_default()
    rows = []
    for title, ims, cell in items:
        rows.append((title, ims, cell))
    H = 40
    layout = []
    for title, ims, cell in rows:
        cols = max(1, (W - 40) // (cell[0] + 16))
        r = math.ceil(len(ims) / cols)
        layout.append((title, ims, cell, cols, H))
        H += 34 + r * (cell[1] + 30)
    sheet = Image.new("RGBA", (W, H + 20), rgba(AI_DEEP))
    # 透明が分かるように市松
    ck = np.indices((H + 20, W)).sum(0) // 1
    yy, xx = np.indices((H + 20, W))
    chk = ((yy // 16 + xx // 16) % 2).astype(bool)
    base = np.zeros((H + 20, W, 4), np.uint8)
    base[...] = rgba("#3A4060")
    base[chk] = rgba("#454C70")
    sheet = Image.fromarray(base, "RGBA")
    d = ImageDraw.Draw(sheet)
    for title, ims, cell, cols, y in layout:
        d.text((20, y), title, fill=rgba(KINARI), font=font)
        y += 28
        for i, (name, im) in enumerate(ims):
            c, r = i % cols, i // cols
            x = 20 + c * (cell[0] + 16)
            yy0 = y + r * (cell[1] + 30)
            t = im.copy()
            t.thumbnail(cell, Image.LANCZOS)
            sheet.alpha_composite(t, (x, yy0))
            d.text((x, yy0 + cell[1] + 4), name, fill=rgba(KINARI2), font=font)
    sheet.convert("RGB").save(path)


# ======================================================================
def main():
    made = []
    faces = {}
    for i, key in enumerate(["hotto", "dokidoki", "moyamoya", "iraira", "kanashii", "sukkiri", "jishin", "hazukashii"]):
        im = render_face(key, seed=11 + i)
        im.save(os.path.join(OUT, f"face-{key}.png"))
        faces[key] = im
        made.append((f"face-{key}", im))
    faces["neutral"] = render_face("neutral", seed=31)

    partners = []
    k = 0
    for who in ["sensei", "ie", "tomodachi", "nakama", "otona", "group"]:
        for mood in ["nikko", "futsuu", "shinpai"]:
            im = render_partner(who, mood, seed=101 + k)
            k += 1
            im.save(os.path.join(OUT, f"partner-{who}-{mood}.png"))
            partners.append((f"{who}-{mood}", im))
    faces["partner_tomo"] = render_partner_big("tomodachi", "futsuu", 2, seed=140)

    stamps = []
    for i, kind in enumerate(["step1", "step2", "step3", "goal"]):
        im = render_stamp(kind, seed=201 + i)
        im.save(os.path.join(OUT, f"stamp-{kind}.png"))
        stamps.append((f"stamp-{kind}", im))

    maps = []
    for n in (1, 2, 3):
        im = render_map(n, seed=301 + n)
        im.convert("RGB").save(os.path.join(OUT, f"map-step{n}.png"))
        maps.append((f"map-step{n}", im))

    tips = []
    for n in (1, 2, 3):
        im = render_tip(n, faces, seed=401 + n)
        im.convert("RGB").save(os.path.join(OUT, f"tip-{n}.png"))
        tips.append((f"tip-{n}", im))

    contact_sheet([
        ("face-* (512, transparent)", made, (200, 200)),
        ("partner-<who>-<mood> (256, transparent)  rows: sensei / ie / tomodachi / nakama / otona / group", partners, (150, 150)),
        ("stamp-* (512, transparent)", stamps, (230, 230)),
        ("map-step* (480x360)", maps, (480, 360)),
        ("tip-* (640x480)", tips, (560, 420)),
    ], os.path.join(HERE, "sheet-parts.png"))
    print("faces", len(made), "partners", len(partners), "stamps", len(stamps), "maps", len(maps), "tips", len(tips))


if __name__ == "__main__":
    main()
