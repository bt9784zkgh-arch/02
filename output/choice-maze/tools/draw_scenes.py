#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
せんたくの めいきゅう: 場面（scene-*.png）と選択肢（choice-*.png）のイラストを描く。

  python3 tools/draw_scenes.py            # 全部（場面7＋選択肢28）
  python3 tools/draw_scenes.py s1-1       # 名前に s1-1 を含むものだけ
  python3 tools/draw_scenes.py --sheet    # コンタクトシートだけ作り直す

画像素材・絵文字・フォントは使わず、Pillow と numpy で一から描く。
・線: 点を打ちなおして垂直方向にゆらし、なめらかにつなぐ（手描き線）
・塗り: ふちを少しぼかし、低い周波数のむらを足し、輪郭から少しずらす（版ずれ・にじみ）
・紙: 細かい粒と大きなむら、ふち24pxを生成りの影で少し暗く
2倍の大きさで描いてから縮める（なめらかな線のため）。
"""
import math
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, '..', 'assets', 'img'))

# ---------------------------------------------------------------- palette (design.md 8-1)
def hx(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

C = {
    'sumi': hx('#2A211C'), 'kinari': hx('#F2E6CB'), 'kinari2': hx('#E6D3AA'),
    'ai': hx('#1E2747'), 'ai2': hx('#34406B'), 'akane': hx('#8C2B22'), 'akane2': hx('#B5493A'),
    'kin': hx('#D2A03A'), 'kinink': hx('#6B4A12'), 'skin': hx('#EBCBA8'), 'cheek': hx('#D98E7A'),
    'hair': hx('#3A2C25'), 'hair2': hx('#5A4636'), 'hair3': hx('#2A211C'),
    'koke': hx('#5E7A5A'), 'haiao': hx('#6F7F99'), 'karashi': hx('#B8913A'),
    'gray': hx('#8A8580'), 'red': hx('#C0392B'), 'blue': hx('#3E6FA8'),
}


def col(c):
    return C[c] if isinstance(c, str) else c


def mix(a, b, t):
    a, b = col(a), col(b)
    return tuple(int(round(a[i] * (1 - t) + b[i] * t)) for i in range(3))


# ---------------------------------------------------------------- geometry helpers
def ell(cx, cy, rx, ry=None, a0=0, a1=360, rot=0, n=None):
    ry = rx if ry is None else ry
    if n is None:
        n = max(10, int(abs(a1 - a0) / 360 * (rx + ry) * 0.9))
    out = []
    cr, sr = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    for i in range(n + 1 if (a1 - a0) % 360 else n):
        a = math.radians(a0 + (a1 - a0) * i / n)
        x, y = rx * math.cos(a), ry * math.sin(a)
        out.append((cx + x * cr - y * sr, cy + x * sr + y * cr))
    return out


def rrect(x0, y0, x1, y1, r):
    r = min(r, (x1 - x0) / 2, (y1 - y0) / 2)
    p = []
    p += ell(x1 - r, y0 + r, r, r, -90, 0, n=6)
    p += ell(x1 - r, y1 - r, r, r, 0, 90, n=6)
    p += ell(x0 + r, y1 - r, r, r, 90, 180, n=6)
    p += ell(x0 + r, y0 + r, r, r, 180, 270, n=6)
    return p


def bez(p0, p1, p2, p3=None, n=16):
    out = []
    for i in range(n + 1):
        t = i / n
        if p3 is None:
            x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0]
            y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]
        else:
            x = ((1 - t) ** 3 * p0[0] + 3 * (1 - t) ** 2 * t * p1[0]
                 + 3 * (1 - t) * t * t * p2[0] + t ** 3 * p3[0])
            y = ((1 - t) ** 3 * p0[1] + 3 * (1 - t) ** 2 * t * p1[1]
                 + 3 * (1 - t) * t * t * p2[1] + t ** 3 * p3[1])
        out.append((x, y))
    return out


def rot_pts(pts, cx, cy, deg):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return [(cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c) for x, y in pts]


def tr(pts, dx, dy, sx=1, sy=None, ox=0, oy=0):
    sy = sx if sy is None else sy
    return [(ox + (x - ox) * sx + dx, oy + (y - oy) * sy + dy) for x, y in pts]


def star_pts(cx, cy, r_out, r_in, n=5, rot=-90, jitter=0, rng=None):
    pts = []
    for i in range(n * 2):
        r = r_out if i % 2 == 0 else r_in
        if jitter and rng is not None:
            r *= 1 + rng.uniform(-jitter, jitter)
        a = math.radians(rot + i * 180 / n)
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


# ---------------------------------------------------------------- canvas
class Canvas:
    def __init__(self, w, h, seed, S=2, bg='kinari'):
        self.w, self.h, self.S = w, h, S
        self.W, self.H = w * S, h * S
        self.img = Image.new('RGB', (self.W, self.H), col(bg))
        self.rng = np.random.default_rng(seed)
        self.lw = 6 if w >= 1000 else 4
        # low-frequency "pigment" field in [-1, 1]
        sm = self.rng.standard_normal((h // 18 + 3, w // 18 + 3))
        t = Image.fromarray(((sm * 0.16 + 0.5).clip(0, 1) * 255).astype(np.uint8))
        t = t.resize((self.W, self.H), Image.BICUBIC)
        self.tex = np.asarray(t, dtype=np.float32) / 127.5 - 1.0
        # mid-frequency fiber field
        sm2 = self.rng.standard_normal((h // 4 + 3, w // 4 + 3))
        t2 = Image.fromarray(((sm2 * 0.16 + 0.5).clip(0, 1) * 255).astype(np.uint8))
        t2 = t2.resize((self.W, self.H), Image.BICUBIC)
        self.tex2 = np.asarray(t2, dtype=np.float32) / 127.5 - 1.0

    # ---- hand-drawn wobble
    def wob(self, pts, closed=True, amp=1.3, step=9):
        P = np.asarray(pts, dtype=float)
        if len(P) < 2:
            return [tuple(p) for p in P]
        if closed:
            P = np.vstack([P, P[:1]])
        d = np.hypot(*np.diff(P, axis=0).T)
        L = np.concatenate([[0], np.cumsum(d)])
        tot = L[-1]
        if tot < 1e-6:
            return [tuple(p) for p in P]
        n = max(int(tot / step), 8 if closed else 3)
        t = np.linspace(0, tot, n, endpoint=not closed)
        x, y = np.interp(t, L, P[:, 0]), np.interp(t, L, P[:, 1])
        if amp > 0:
            if closed:
                dx = np.roll(x, -1) - np.roll(x, 1)
                dy = np.roll(y, -1) - np.roll(y, 1)
            else:
                dx, dy = np.gradient(x), np.gradient(y)
            nr = np.hypot(dx, dy) + 1e-9
            r = self.rng.standard_normal(len(x))
            k = np.array([1, 2, 3, 2, 1], float); k /= k.sum()
            if closed:
                r = np.convolve(np.concatenate([r[-2:], r, r[:2]]), k, 'valid')
            else:
                r = np.convolve(np.pad(r, 2, mode='edge'), k, 'valid')
            r = r / (r.std() + 1e-9) * amp * 0.75
            if not closed:
                r[0] *= 0.3; r[-1] *= 0.3
            x = x - dy / nr * r
            y = y + dx / nr * r
        Q = list(zip(x, y))
        # one round of Chaikin smoothing
        out = []
        m = len(Q)
        rng_ = range(m) if closed else range(m - 1)
        if not closed:
            out.append(Q[0])
        for i in rng_:
            a, b = Q[i], Q[(i + 1) % m]
            out.append((0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]))
            out.append((0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]))
        if not closed:
            out.append(Q[-1])
        return out

    # ---- low-level paste through a mask, cropped to bbox
    def _box(self, pts, pad):
        S = self.S
        xs = [p[0] * S for p in pts]; ys = [p[1] * S for p in pts]
        x0 = max(int(min(xs) - pad), 0); y0 = max(int(min(ys) - pad), 0)
        x1 = min(int(max(xs) + pad) + 1, self.W); y1 = min(int(max(ys) + pad) + 1, self.H)
        return x0, y0, x1, y1

    def _paste(self, color, mask, x0, y0, tex=0.0, alpha=1.0):
        x1, y1 = x0 + mask.size[0], y0 + mask.size[1]
        c = np.array(col(color), dtype=np.float32)
        if tex:
            f = 1 + tex * self.tex[y0:y1, x0:x1] + tex * 0.5 * self.tex2[y0:y1, x0:x1]
            layer = (c[None, None, :] * f[..., None]).clip(0, 255).astype(np.uint8)
            layer = Image.fromarray(layer, 'RGB')
        else:
            layer = Image.new('RGB', mask.size, tuple(int(v) for v in c))
        if alpha < 1:
            mask = mask.point(lambda v: int(v * alpha))
        self.img.paste(layer, (x0, y0), mask)

    def fill(self, pts, color, alpha=1.0, tex=0.06, blur=0.8, edge=True):
        if len(pts) < 3:
            return
        S = self.S
        x0, y0, x1, y1 = self._box(pts, 8 * S)
        if x1 <= x0 or y1 <= y0:
            return
        m = Image.new('L', (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(m).polygon([(p[0] * S - x0, p[1] * S - y0) for p in pts], fill=255)
        if blur:
            m = m.filter(ImageFilter.GaussianBlur(blur * S))
        self._paste(color, m, x0, y0, tex=tex, alpha=alpha)
        if edge:  # pigment pooling at the edge (watercolor-ish)
            e = Image.new('L', m.size, 0)
            ImageDraw.Draw(e).line([(p[0] * S - x0, p[1] * S - y0) for p in pts + pts[:1]],
                                   fill=255, width=int(2.2 * S), joint='curve')
            e = e.filter(ImageFilter.GaussianBlur(1.6 * S))
            from PIL import ImageChops
            e = ImageChops.multiply(e, m)
            self._paste(mix(color, 'sumi', 0.28), e, x0, y0, alpha=0.45)

    def line(self, pts, width=None, color='sumi', closed=False, amp=1.2, alpha=1.0, tex=0.0, raw=False):
        if width is None:
            width = self.lw
        if not raw:
            pts = self.wob(pts, closed=closed, amp=amp)
        elif closed:
            pts = list(pts) + [pts[0]]
        S = self.S
        x0, y0, x1, y1 = self._box(pts, width * S + 6 * S)
        if x1 <= x0 or y1 <= y0:
            return
        m = Image.new('L', (x1 - x0, y1 - y0), 0)
        d = ImageDraw.Draw(m)
        q = [(p[0] * S - x0, p[1] * S - y0) for p in pts]
        if closed and q[0] != q[-1]:
            q = q + [q[0]]
        w = max(1, int(round(width * S)))
        d.line(q, fill=255, width=w, joint='curve')
        r = w / 2
        caps = [q[0], q[-1]] if not closed else []
        if w >= 10:
            caps = q[::2] + caps
        for p in caps:
            d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=255)
        m = m.filter(ImageFilter.GaussianBlur(0.45 * S))
        self._paste(color, m, x0, y0, tex=tex, alpha=alpha)

    def shape(self, pts, fill=None, lw=None, amp=1.3, line=True, shift=True, tex=0.06,
              lcolor='sumi', falpha=1.0):
        w = self.wob(pts, closed=True, amp=amp)
        if fill is not None:
            f = w
            if shift:
                dx, dy = self.rng.uniform(-1.6, 1.6, 2)
                f = [(x + dx, y + dy) for x, y in w]
            self.fill(f, fill, tex=tex, alpha=falpha)
        if line:
            self.line(w, width=lw, color=lcolor, closed=True, raw=True)
        return w

    def tube(self, pts, width, color, lw=None, amp=0.8):
        """thick stroke with ink outline (limbs, straps)"""
        lw = self.lw if lw is None else lw
        c = self.wob(pts, closed=False, amp=amp, step=12)
        self.line(c, width=width + 2 * lw, color='sumi', raw=True)
        self.line(c, width=width, color=color, raw=True, tex=0.06)

    def dot(self, x, y, r, color='sumi', alpha=1.0):
        self.fill(ell(x, y, r, r, n=24), color, alpha=alpha, tex=0, blur=0.35, edge=False)

    def shadow(self, cx, cy, rx, ry, alpha=0.2):
        S = self.S
        pts = ell(cx, cy, rx, ry, n=40)
        x0, y0, x1, y1 = self._box(pts, 30 * S)
        m = Image.new('L', (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(m).polygon([(p[0] * S - x0, p[1] * S - y0) for p in pts], fill=255)
        m = m.filter(ImageFilter.GaussianBlur(8 * S))
        self._paste('sumi', m, x0, y0, alpha=alpha)

    def glow(self, cx, cy, r, color='kin', alpha=0.25):
        S = self.S
        pts = ell(cx, cy, r, r, n=48)
        x0, y0, x1, y1 = self._box(pts, r * S * 0.6)
        m = Image.new('L', (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(m).polygon([(p[0] * S - x0, p[1] * S - y0) for p in pts], fill=255)
        m = m.filter(ImageFilter.GaussianBlur(r * S * 0.35))
        self._paste(color, m, x0, y0, alpha=alpha)

    def hatch(self, poly, color='kinink', gap=14, angle=35, width=2, alpha=0.35):
        """light crayon hatching clipped to polygon (soft shading)"""
        S = self.S
        x0, y0, x1, y1 = self._box(poly, 4 * S)
        m = Image.new('L', (x1 - x0, y1 - y0), 0)
        ImageDraw.Draw(m).polygon([(p[0] * S - x0, p[1] * S - y0) for p in poly], fill=255)
        h = Image.new('L', m.size, 0)
        d = ImageDraw.Draw(h)
        W, H = m.size
        a = math.radians(angle)
        L = W + H
        for k in range(-L, L, int(gap * S)):
            j = self.rng.uniform(-2, 2) * S
            d.line([(k + j, 0), (k + j + H / math.tan(a), H)], fill=255, width=int(width * S))
        from PIL import ImageChops
        m = ImageChops.multiply(m, h).filter(ImageFilter.GaussianBlur(0.6 * S))
        self._paste(color, m, x0, y0, alpha=alpha)

    # ---- finish: paper grain + darker edge, downsample, save
    def save(self, path):
        a = np.asarray(self.img, dtype=np.float32)
        grain = self.rng.standard_normal(a.shape[:2]).astype(np.float32)
        f = 1 + 0.035 * grain + 0.022 * self.tex + 0.018 * self.tex2
        a = a * f[..., None]
        # edge: 24px darkened toward kinari2 at 30%
        H, W = a.shape[:2]
        e = 24 * self.S
        yy = np.minimum(np.arange(H), np.arange(H)[::-1])[:, None]
        xx = np.minimum(np.arange(W), np.arange(W)[::-1])[None, :]
        dist = np.minimum(yy, xx).astype(np.float32)
        k = (1 - np.clip(dist / e, 0, 1)) ** 1.5 * 0.30
        tgt = np.array(mix(C['kinari2'], 'sumi', 0.25), np.float32)
        a = a * (1 - k[..., None]) + tgt[None, None, :] * k[..., None] * (a / 255 * 0.5 + 0.5)
        img = Image.fromarray(a.clip(0, 255).astype(np.uint8), 'RGB')
        img = img.resize((self.w, self.h), Image.LANCZOS)
        img.save(path, optimize=True)
        return img


# ================================================================ people
OUTFITS = {
    'kid':       dict(top='ai2', top2='ai', pants='kinari2', hair='hair', style='bob', hood=True, ht=3.0),
    'sensei':    dict(top='karashi', top2='kinari', pants='ai', hair='hair2', style='neat', glasses=True,
                      cardigan=True, ht=4.0),
    'otona':     dict(top='karashi', top2='kinari', pants='ai', hair='hair2', style='neat', glasses=True,
                      cardigan=True, nametag=True, ht=4.0),
    'ie':        dict(top='kinari2', top2='kinari', pants='haiao', hair='hair3', style='wave', apron=True, ht=3.9),
    'tomodachi': dict(top='haiao', top2=mix('haiao', 'sumi', 0.3), pants='ai', hair='hair2', style='tuft',
                      hood=True, ht=3.0),
    'nakama':    dict(top='koke', top2='kinari', pants='ai', hair='hair3', style='crop', jersey=True, ht=3.05),
    'team':      dict(top='akane2', top2='kinari', pants='akane', hair='hair3', style='crop', jersey=True, ht=3.05),
    'team2':     dict(top='akane2', top2='kinari', pants='akane', hair='hair2', style='round', jersey=True, ht=3.05),
    'nakama2':   dict(top='koke', top2='kinari', pants='ai', hair='hair2', style='round', jersey=True, ht=3.1),
}


class Person:
    """
    cx, gy: x center and ground y. H: head diameter (px).
    facing: 'front' | 'r' | 'l' (three-quarter toward viewer's right/left) | 'back'
    lean: degrees the upper body tips toward the facing side (bow)
    arms: {'L': dict(hand=(dx,dy), bend=+-1, behind=False, hand='round'|'none'), 'R': ...}
          hand offset is relative to that shoulder, in head units. L/R = viewer's left/right.
    legs: {'L': (dx,dy), 'R': (dx,dy)} foot relative to hip in head units, optional 'knee'
    face: eyes, brows, mouth, look=(dx,dy) in head units, blush, red
    """

    def __init__(self, cv, kind, cx, gy, H, facing='front', lean=0.0, arms=None, legs=None,
                 eyes='dot', brows=None, mouth='line', look=(0, 0), blush=True, red=False,
                 head_drop=0.0, sit=False, seed_shift=0):
        self.cv, self.kind = cv, kind
        self.o = OUTFITS[kind]
        self.cx, self.gy, self.H = cx, gy, H
        self.facing, self.lean = facing, lean
        self.arms = arms or {}
        self.legs = legs or {}
        self.eyes, self.brows, self.mouth = eyes, brows, mouth
        self.look, self.blush, self.red = look, blush, red
        self.head_drop = head_drop
        self.sit = sit
        ht = self.o['ht']
        self.torso_len = 0.95 if ht <= 3.1 else 1.4
        self.leg_len = (ht - 1.0 - self.torso_len) * H
        self.dir = 1 if facing == 'r' else (-1 if facing == 'l' else 0)
        self.wscale = 0.86 if facing in ('r', 'l') else 1.0
        self.hip = (cx, gy - self.leg_len)
        a = math.radians(lean) * (self.dir if self.dir else 1)
        self.u = (math.sin(a), -math.cos(a))
        self.v = (-self.u[1], self.u[0])

    def loc(self, a, b):
        H = self.H
        return (self.hip[0] + self.v[0] * a * H * self.wscale + self.u[0] * b * H,
                self.hip[1] + self.v[1] * a * H * self.wscale + self.u[1] * b * H)

    # ---------------------------------------------------------------- parts
    def neck(self):
        return self.loc(0, self.torso_len)

    def head_center(self):
        n = self.neck()
        H = self.H
        hc = (n[0] + self.u[0] * 0.44 * H, n[1] + self.u[1] * 0.44 * H)
        if self.head_drop:
            d = self.dir if self.dir else 0
            hc = (hc[0] + d * self.head_drop * H * 0.6, hc[1] + self.head_drop * H)
        return hc

    def shoulder(self, side):
        s = -1 if side == 'L' else 1
        return self.loc(0.34 * s, self.torso_len - 0.14)

    def draw(self, extras=(), props_behind=None, props_front=None):
        cv, H = self.cv, self.H
        if not self.sit:
            cv.shadow(self.cx + self.dir * 0.1 * H, self.gy + 0.02 * H, 0.62 * H, 0.1 * H, alpha=0.22)
        for side in ('L', 'R'):
            a = self.arms.get(side)
            if a and a.get('behind'):
                self.draw_arm(side, a)
        if self.facing in ('r', 'l'):  # far arm behind body
            far = 'L' if self.facing == 'r' else 'R'
            a = self.arms.get(far, {})
            if not a.get('behind') and a.get('far', True) and not a.get('front'):
                self.draw_arm(far, a)
        if props_behind:
            props_behind(self)
        self.draw_legs()
        self.draw_torso()
        self.draw_head()
        for side in ('L', 'R'):
            a = self.arms.get(side, {})
            if a.get('behind'):
                continue
            if self.facing in ('r', 'l'):
                far = 'L' if self.facing == 'r' else 'R'
                if side == far and a.get('far', True) and not a.get('front'):
                    continue
            self.draw_arm(side, a)
        if props_front:
            props_front(self)
        for e in extras:
            self.extra(e)

    def draw_legs(self):
        cv, H, o = self.cv, self.H, self.o
        lw = cv.lw
        hipL, hipR = self.loc(-0.17, 0.05), self.loc(0.17, 0.05)
        ll = self.leg_len / H
        dflt = {'L': (-0.2, ll), 'R': (0.2, ll)}
        order = ['L', 'R'] if self.dir >= 0 else ['R', 'L']
        for side in order:
            spec = self.legs.get(side, dflt[side])
            if isinstance(spec, dict):
                foot = spec['foot']; knee = spec.get('knee')
                shoe_dir = spec.get('shoe', None)
            else:
                foot = spec; knee = None; shoe_dir = None
            hp = hipL if side == 'L' else hipR
            fp = (self.hip[0] + foot[0] * H, self.hip[1] + foot[1] * H)
            pts = [hp]
            if knee:
                pts.append((self.hip[0] + knee[0] * H, self.hip[1] + knee[1] * H))
            pts.append(fp)
            cv.tube(pts, 0.27 * H, o['pants'])
            # shoe
            d = shoe_dir if shoe_dir is not None else (self.dir if self.dir else (-0.4 if side == 'L' else 0.4))
            if self.facing == 'back':
                d = 0
            sx = fp[0] + d * 0.07 * H
            cv.shape(ell(sx, fp[1] + 0.03 * H, 0.18 * H + abs(d) * 0.03 * H, 0.1 * H, n=30), fill='sumi',
                     lw=lw * 0.8, tex=0.1)
            cv.line(ell(sx - d * 0.03 * H, fp[1] - 0.02 * H, 0.1 * H, 0.03 * H, 200, 340, n=10),
                    width=lw * 0.5, color=mix('sumi', 'kinari', 0.35), amp=0.4)

    def torso_poly(self):
        tl = self.torso_len
        if self.o.get('cardigan') or self.o.get('apron'):
            hem = 0.42
        else:
            hem = 0.47
        pts = []
        pts += [self.loc(-hem, -0.1)]
        pts += bez(self.loc(-hem, -0.1), self.loc(-0.44, tl * 0.5), self.loc(-0.44, tl - 0.1), n=8)[1:]
        pts += ell(*self.loc(-0.3, tl - 0.13), 0.13 * self.H * self.wscale, 0.13 * self.H, 180, 270, n=6)
        pts += [self.loc(-0.12, tl + 0.02), self.loc(0.12, tl + 0.02)]
        pts += ell(*self.loc(0.3, tl - 0.13), 0.13 * self.H * self.wscale, 0.13 * self.H, 270, 360, n=6)
        pts += bez(self.loc(0.44, tl - 0.1), self.loc(0.44, tl * 0.5), self.loc(hem, -0.1), n=8)
        pts += bez(self.loc(hem, -0.1), self.loc(0, -0.14), self.loc(-hem, -0.1), n=8)[1:]
        return pts

    def draw_torso(self):
        cv, H, o = self.cv, self.H, self.o
        tl = self.torso_len
        lw = cv.lw
        back = self.facing == 'back'
        poly = self.torso_poly()
        if o.get('cardigan') and not back:
            cv.shape(poly, fill=o['top'])
            # inner shirt (V)
            inner = [self.loc(-0.13, tl + 0.0), self.loc(0.13, tl + 0.0), self.loc(0.0, tl - 0.55)]
            cv.shape(inner, fill='kinari', lw=lw * 0.7)
            cv.line([self.loc(0.0, tl - 0.55), self.loc(0.0, -0.1)], width=lw * 0.7)
            for b in (tl - 0.7, tl - 0.95, tl - 1.2):
                if b > -0.05:
                    cv.dot(*self.loc(0.07, b), 0.025 * H, color='kinink')
            # pocket
            cv.line([self.loc(-0.33, 0.25), self.loc(-0.12, 0.25)], width=lw * 0.7)
            if o.get('nametag'):
                tag = [self.loc(0.12, tl - 0.3), self.loc(0.34, tl - 0.3), self.loc(0.34, tl - 0.45),
                       self.loc(0.12, tl - 0.45)]
                cv.shape(tag, fill='koke', lw=lw * 0.7)
            return
        if o.get('apron') and not back:
            cv.shape(poly, fill=o['top'])
            ap = [self.loc(-0.26, tl - 0.25), self.loc(0.26, tl - 0.25), self.loc(0.36, -0.15), self.loc(-0.36, -0.15)]
            cv.shape(ap, fill='koke')
            cv.line([self.loc(-0.26, tl - 0.25), self.loc(-0.2, tl + 0.02)], width=lw * 0.8)
            cv.line([self.loc(0.26, tl - 0.25), self.loc(0.2, tl + 0.02)], width=lw * 0.8)
            pk = [self.loc(-0.16, 0.55), self.loc(0.16, 0.55), self.loc(0.16, 0.3), self.loc(-0.16, 0.3)]
            cv.shape(pk, fill=mix('koke', 'sumi', 0.15), lw=lw * 0.7)
            return
        cv.shape(poly, fill=o['top'])
        # soft fold shading
        cv.hatch(poly, color='sumi', gap=11, angle=60 if self.dir >= 0 else 120, width=1.3, alpha=0.08)
        if o.get('jersey'):
            for s in (-1, 1):
                if back or self.dir == 0 or s == self.dir:
                    cv.line([self.loc(0.38 * s, tl - 0.15), self.loc(0.43 * s, -0.05)], width=lw * 1.2,
                            color='kinari')
            if not back:
                v = [self.loc(-0.14, tl + 0.01), self.loc(0.0, tl - 0.22), self.loc(0.14, tl + 0.01)]
                cv.line(v, width=lw * 0.9)
            return
        if back:
            if o.get('hood'):
                hood = ell(*self.loc(0, tl - 0.3), 0.36 * H * self.wscale, 0.34 * H, n=40)
                cv.shape(hood, fill=o['top'])
                cv.shape(ell(*self.loc(0, tl - 0.24), 0.22 * H, 0.2 * H, n=30), fill=o['top2'], lw=lw * 0.8)
            return
        # front: zipper, pockets, hem band
        zx = 0.0 + 0.1 * self.dir
        cv.line([self.loc(zx, tl - 0.1), self.loc(zx, -0.1)], width=lw * 0.7)
        cv.line([self.loc(-0.45, 0.02), self.loc(0.45, 0.02)], width=lw * 0.6, color=mix(o['top'], 'sumi', 0.5))
        for s in (-1, 1):
            if self.dir and s == -self.dir:
                continue
            px = 0.25 * s + 0.08 * self.dir
            cv.line(bez(self.loc(px - 0.09, 0.32), self.loc(px, 0.36), self.loc(px + 0.09, 0.32), n=6),
                    width=lw * 0.6, color=mix(o['top'], 'sumi', 0.55))
        if o.get('hood'):
            # hood lying on the shoulders (collar)
            nk = self.loc(0, tl - 0.02)
            rt = self.lean * (self.dir if self.dir else 1)
            cv.shape(ell(nk[0] - self.dir * 0.08 * H, nk[1], 0.38 * H, 0.14 * H, rot=rt, n=36), fill=o['top'])
            cv.shape(ell(nk[0] - self.dir * 0.08 * H, nk[1] + 0.01 * H, 0.24 * H, 0.07 * H, rot=rt, n=30),
                     fill=o['top2'], lw=lw * 0.6)
            # drawstrings
            for s in (-0.08, 0.1):
                p0 = self.loc(s + 0.05 * self.dir, tl - 0.08)
                cv.line([p0, (p0[0], p0[1] + 0.22 * H)], width=lw * 0.55, color='kinari2')

    def draw_head(self):
        cv, H, o = self.cv, self.H, self.o
        lw = cv.lw
        hc = self.head_center()
        f = self.facing
        fx = {'front': 0, 'r': 0.14, 'l': -0.14, 'back': 0}[f] * H
        style = o['style']
        hair = o['hair']
        x, y = hc
        # neck
        cv.shape(rrect(x - 0.1 * H, y + 0.3 * H, x + 0.1 * H, y + 0.55 * H, 0.05 * H), fill='skin', lw=lw * 0.8)
        if f == 'back':
            self.hair_back(x, y, H, style, hair, full=True)
            return
        # hair behind face
        self.hair_back(x - fx * 0.35, y, H, style, hair)
        # face
        face_col = mix('skin', 'akane2', 0.32) if self.red else 'skin'
        face = ell(x + fx * 0.25, y + 0.04 * H, 0.46 * H, 0.45 * H, n=60)
        cv.shape(face, fill=face_col)
        # ear (three-quarter, on the far side from facing)
        if f in ('r', 'l'):
            ex = x + fx * 0.25 - (0.44 * H) * (1 if f == 'r' else -1)
            cv.shape(ell(ex, y + 0.1 * H, 0.08 * H, 0.1 * H, n=20), fill=face_col, lw=lw * 0.8)
        fx2 = x + fx * 0.25 + fx * 0.75 + self.look[0] * H
        fy = y + self.look[1] * H
        if self.blush:
            for s in (-1, 1):
                if f in ('r', 'l') and s == -self.dir:
                    bx = fx2 + s * 0.2 * H
                else:
                    bx = fx2 + s * 0.27 * H
                cv.fill(ell(bx, fy + 0.22 * H, 0.08 * H, 0.05 * H, n=20), 'cheek', alpha=0.5, tex=0, edge=False)
        self.hair_front(x + fx * 0.35, y, H, style, hair)
        self.features(fx2, fy, H)
        if o.get('glasses'):
            gy = fy + 0.07 * H
            sp = 0.17 * H if f == 'front' else 0.14 * H
            for s in (-1, 1):
                cv.line(ell(fx2 + s * sp, gy, 0.11 * H, 0.1 * H, n=30), width=lw * 0.6, closed=True, amp=0.4)
            cv.line([(fx2 - sp + 0.11 * H, gy), (fx2 + sp - 0.11 * H, gy)], width=lw * 0.6, amp=0.2)

    def hair_back(self, x, y, H, style, hair, full=False):
        cv = self.cv
        if style == 'bob':
            p = ell(x, y - 0.02 * H, 0.54 * H, 0.54 * H, 180, 360, n=40)
            p += [(x + 0.56 * H, y + 0.15 * H), (x + 0.5 * H, y + 0.4 * H)]
            p += bez((x + 0.5 * H, y + 0.4 * H), (x, y + (0.62 if full else 0.48) * H), (x - 0.5 * H, y + 0.4 * H), n=10)
            p += [(x - 0.56 * H, y + 0.15 * H)]
        elif style == 'wave':
            p = ell(x, y - 0.03 * H, 0.55 * H, 0.55 * H, 160, 380, n=40)
            if full:
                p += bez((x + 0.5 * H, y + 0.2 * H), (x, y + 0.5 * H), (x - 0.5 * H, y + 0.2 * H), n=10)
        else:
            p = ell(x, y - 0.03 * H, 0.5 * H, 0.5 * H, 165, 375, n=40)
            if full:
                p += bez((x + 0.47 * H, y + 0.12 * H), (x, y + 0.42 * H), (x - 0.47 * H, y + 0.12 * H), n=10)
        cv.shape(p, fill=hair, tex=0.1)
        if full:
            # a few strands
            for k in (-0.2, 0.0, 0.2):
                cv.line(bez((x + k * H, y - 0.3 * H), (x + k * 1.2 * H, y), (x + k * 1.1 * H, y + 0.3 * H), n=8),
                        width=cv.lw * 0.5, color=mix(hair, 'kinari', 0.25))
            if style == 'tuft':
                cv.shape([(x - 0.05 * H, y - 0.48 * H), (x + 0.05 * H, y - 0.7 * H), (x + 0.12 * H, y - 0.46 * H)],
                         fill=hair)

    def hair_front(self, x, y, H, style, hair):
        cv = self.cv
        if style == 'bob':
            p = ell(x, y - 0.02 * H, 0.53 * H, 0.52 * H, 185, 355, n=36)
            # scalloped fringe
            xr, xl = x + 0.5 * H, x - 0.5 * H
            yb = y - 0.17 * H
            fr = []
            n = 4
            for i in range(n + 1):
                t = i / n
                fr.append((xr + (xl - xr) * t, yb + (0.06 * H if i % 2 else 0) + (0.05 * H if 0 < i < n else -0.05 * H)))
            p += [(xr, y + 0.05 * H)] + fr[1:-1] + [(xl, y + 0.05 * H)]
        elif style == 'neat':
            p = ell(x, y - 0.04 * H, 0.5 * H, 0.48 * H, 190, 350, n=30)
            p += [(x + 0.45 * H, y - 0.08 * H), (x + 0.05 * H, y - 0.2 * H), (x - 0.12 * H, y - 0.1 * H),
                  (x - 0.47 * H, y - 0.02 * H)]
        elif style == 'wave':
            p = ell(x, y - 0.04 * H, 0.52 * H, 0.5 * H, 185, 355, n=30)
            p += bez((x + 0.5 * H, y - 0.05 * H), (x + 0.2 * H, y - 0.3 * H), (x, y - 0.15 * H), n=6)
            p += bez((x, y - 0.15 * H), (x - 0.2 * H, y - 0.3 * H), (x - 0.5 * H, y - 0.02 * H), n=6)
        elif style == 'tuft':
            p = ell(x, y - 0.04 * H, 0.5 * H, 0.48 * H, 190, 350, n=30)
            p += [(x + 0.47 * H, y - 0.1 * H), (x + 0.25 * H, y - 0.2 * H), (x + 0.15 * H, y - 0.12 * H),
                  (x - 0.05 * H, y - 0.24 * H), (x - 0.2 * H, y - 0.13 * H), (x - 0.48 * H, y - 0.08 * H)]
            cv.shape([(x - 0.06 * H, y - 0.48 * H), (x + 0.06 * H, y - 0.72 * H), (x + 0.14 * H, y - 0.47 * H)],
                     fill=hair)
        elif style == 'crop':
            p = ell(x, y - 0.06 * H, 0.49 * H, 0.45 * H, 190, 350, n=30)
            p += [(x + 0.46 * H, y - 0.16 * H)]
            for i in range(7):
                t = i / 6
                p.append((x + 0.42 * H - 0.84 * H * t, y - (0.2 if i % 2 else 0.27) * H))
            p += [(x - 0.46 * H, y - 0.16 * H)]
        else:  # round
            p = ell(x, y - 0.03 * H, 0.52 * H, 0.5 * H, 185, 355, n=30)
            p += bez((x + 0.5 * H, y - 0.02 * H), (x, y - 0.32 * H), (x - 0.5 * H, y - 0.02 * H), n=10)
        cv.shape(p, fill=hair, tex=0.1)
        # highlight stroke
        cv.line(ell(x - 0.05 * H, y - 0.15 * H, 0.32 * H, 0.26 * H, 215, 260, n=8), width=cv.lw * 0.6,
                color=mix(hair, 'kinari', 0.3), amp=0.3)

    def features(self, x, y, H):
        cv = self.cv
        lw = cv.lw
        sp = 0.17 * H if self.facing == 'front' else 0.14 * H
        ey = y + 0.07 * H
        er = 0.036 * H
        e = self.eyes
        for s in (-1, 1):
            ex = x + s * sp
            if e == 'dot':
                cv.dot(ex, ey, er)
            elif e == 'wide':
                cv.dot(ex, ey, er * 1.6)
                cv.dot(ex - er * 0.5, ey - er * 0.5, er * 0.5, color='kinari')
            elif e == 'closed':      # relaxed / calm (∪)
                cv.line(ell(ex, ey - 0.02 * H, 0.06 * H, 0.04 * H, 20, 160, n=8), width=lw * 0.7, amp=0.2)
            elif e == 'happy':       # ∩
                cv.line(ell(ex, ey + 0.03 * H, 0.06 * H, 0.05 * H, 200, 340, n=8), width=lw * 0.7, amp=0.2)
            elif e == 'down':        # looking down
                cv.line(ell(ex, ey + 0.0 * H, 0.055 * H, 0.03 * H, 20, 160, n=8), width=lw * 0.65, amp=0.2)
            elif e == 'squeeze':
                cv.line([(ex - s * 0.05 * H, ey - 0.04 * H), (ex + s * 0.04 * H, ey), (ex - s * 0.05 * H, ey + 0.04 * H)],
                        width=lw * 0.7, amp=0.2)
            elif e == 'shut':        # tightly shut, flat line
                cv.line([(ex - 0.05 * H, ey), (ex + 0.05 * H, ey)], width=lw * 0.7, amp=0.2)
        b = self.brows
        if b:
            by = ey - 0.12 * H
            for s in (-1, 1):
                ex = x + s * sp
                if b == 'worry':   # inner ends up
                    p = [(ex - s * 0.07 * H, by - 0.035 * H), (ex + s * 0.06 * H, by + 0.02 * H)]
                elif b == 'angry':  # inner ends down
                    p = [(ex - s * 0.07 * H, by + 0.03 * H), (ex + s * 0.06 * H, by - 0.04 * H)]
                else:  # up / raised
                    p = ell(ex, by - 0.0 * H, 0.06 * H, 0.03 * H, 200, 340, n=6)
                cv.line(p, width=lw * 0.6, amp=0.2)
        m = self.mouth
        my = y + 0.25 * H
        mx = x
        if m == 'line':
            cv.line([(mx - 0.06 * H, my), (mx + 0.06 * H, my)], width=lw * 0.6, amp=0.3)
        elif m == 'smile':
            cv.line(ell(mx, my - 0.04 * H, 0.09 * H, 0.06 * H, 20, 160, n=10), width=lw * 0.6, amp=0.2)
        elif m == 'frown':
            cv.line(ell(mx, my + 0.04 * H, 0.07 * H, 0.045 * H, 200, 340, n=10), width=lw * 0.6, amp=0.2)
        elif m == 'big':   # big open smile
            p = [(mx - 0.11 * H, my - 0.03 * H)] + ell(mx, my - 0.03 * H, 0.11 * H, 0.1 * H, 0, 180, n=14)[::-1][::-1]
            p = ell(mx, my - 0.03 * H, 0.11 * H, 0.1 * H, 0, 180, n=14)
            cv.shape(p, fill='akane', lw=lw * 0.6, amp=0.3, shift=False)
        elif m == 'talk':  # open, speaking
            cv.shape(ell(mx, my, 0.06 * H, 0.045 * H, n=16), fill='akane', lw=lw * 0.55, amp=0.2, shift=False)
        elif m == 'o':
            cv.shape(ell(mx, my, 0.035 * H, 0.04 * H, n=14), fill='akane', lw=lw * 0.5, amp=0.1, shift=False)
        elif m == 'shout':
            cv.shape(ell(mx, my + 0.01 * H, 0.1 * H, 0.08 * H, n=20), fill='akane', lw=lw * 0.6, amp=0.2, shift=False)
            cv.fill(ell(mx, my + 0.05 * H, 0.05 * H, 0.025 * H, n=12), 'cheek', tex=0, edge=False)
        elif m == 'wave':
            pts = [(mx - 0.09 * H + i * 0.03 * H, my + (0.015 * H if i % 2 else -0.015 * H)) for i in range(7)]
            cv.line(pts, width=lw * 0.55, amp=0.1)
        elif m == 'tight':
            cv.line([(mx - 0.07 * H, my + 0.01 * H), (mx, my - 0.01 * H), (mx + 0.07 * H, my + 0.01 * H)],
                    width=lw * 0.6, amp=0.1)
        elif m == 'blow':  # pursed, breathing out
            cv.shape(ell(mx + 0.02 * H * (self.dir or 1), my, 0.03 * H, 0.025 * H, n=12), fill='akane',
                     lw=lw * 0.5, amp=0.1, shift=False)

    def draw_arm(self, side, a):
        cv, H, o = self.cv, self.H, self.o
        sh = self.shoulder(side)
        s = -1 if side == 'L' else 1
        hand = a.get('hand', (0.12 * s, 0.82))
        hp = (sh[0] + hand[0] * H, sh[1] + hand[1] * H)
        bend = a.get('bend', 0.6)
        mx, my = (sh[0] + hp[0]) / 2, (sh[1] + hp[1]) / 2
        dx, dy = hp[0] - sh[0], hp[1] - sh[1]
        L = math.hypot(dx, dy) + 1e-9
        nx, ny = -dy / L, dx / L
        if nx * s < 0:
            nx, ny = -nx, -ny
        el = (mx + nx * bend * 0.14 * H, my + ny * bend * 0.14 * H)
        if 'elbow' in a:
            el = (sh[0] + a['elbow'][0] * H, sh[1] + a['elbow'][1] * H)
        sleeve = o['top'] if not o.get('apron') else o['top']
        cv.tube([sh, el, hp], 0.21 * H, sleeve)
        if o.get('jersey'):
            pass
        hs = a.get('handshape', 'round')
        if hs == 'none':
            return
        if hs == 'fist':
            cv.shape(ell(hp[0], hp[1], 0.11 * H, 0.1 * H, n=20), fill='skin', lw=cv.lw * 0.85)
            cv.line([(hp[0] - 0.05 * H, hp[1] - 0.01 * H), (hp[0] + 0.04 * H, hp[1] - 0.02 * H)], width=cv.lw * 0.5)
        elif hs == 'point':
            ang = math.atan2(*a.get('pdir', (0, 1))[::-1])
            px, py = math.cos(ang), math.sin(ang)
            tip = (hp[0] + px * 0.2 * H, hp[1] + py * 0.2 * H)
            cv.tube([hp, tip], 0.06 * H, 'skin', lw=cv.lw * 0.7)
            cv.shape(ell(hp[0], hp[1], 0.1 * H, 0.09 * H, n=20), fill='skin', lw=cv.lw * 0.85)
        else:
            cv.shape(ell(hp[0], hp[1], 0.1 * H, 0.1 * H, n=20), fill='skin', lw=cv.lw * 0.85)
        self.hand_pos = getattr(self, 'hand_pos', {})
        self.hand_pos[side] = hp

    def hand(self, side):
        sh = self.shoulder(side)
        s = -1 if side == 'L' else 1
        h = self.arms.get(side, {}).get('hand', (0.12 * s, 0.82))
        return (sh[0] + h[0] * self.H, sh[1] + h[1] * self.H)

    def extra(self, e):
        cv, H = self.cv, self.H
        hc = self.head_center()
        x, y = hc
        lw = cv.lw
        d = self.dir if self.dir else 1
        if e == 'sweat':
            sx, sy = x - d * 0.6 * H, y - 0.15 * H
            p = [(sx, sy - 0.14 * H)] + ell(sx, sy, 0.07 * H, 0.08 * H, -30, 210, n=14)
            cv.shape(p, fill='kinari', lw=lw * 0.7)
        elif e == 'sweat2':
            for k, (ox, oy, sc) in enumerate(((0.62, -0.25, 1), (0.72, 0.0, 0.7))):
                sx, sy = x + d * ox * H, y + oy * H
                p = [(sx, sy - 0.14 * H * sc)] + ell(sx, sy, 0.07 * H * sc, 0.08 * H * sc, -30, 210, n=14)
                cv.shape(p, fill='kinari', lw=lw * 0.7)
        elif e == 'anger':   # red zigzag above head
            for k, ox in enumerate((-0.32, 0.0, 0.32)):
                bx, by = x + ox * H, y - 0.68 * H - (0.06 * H if k == 1 else 0)
                zz = [(bx - 0.06 * H, by + 0.12 * H), (bx + 0.03 * H, by + 0.03 * H), (bx - 0.04 * H, by),
                      (bx + 0.06 * H, by - 0.12 * H)]
                cv.line(zz, width=lw * 1.4, color='red', amp=0.3)
        elif e == 'panic':   # short motion strokes around head
            for a in (-150, -120, -60, -30):
                r0, r1 = 0.62 * H, 0.78 * H
                ang = math.radians(a)
                cv.line([(x + r0 * math.cos(ang), y + r0 * math.sin(ang)),
                         (x + r1 * math.cos(ang), y + r1 * math.sin(ang))], width=lw * 0.7)
        elif e == 'speech':
            mx, my = x + d * 0.5 * H, y + 0.22 * H
            for a in (-25, 0, 25):
                ang = math.radians(a)
                cv.line([(mx + d * 0.05 * H * math.cos(ang), my + 0.05 * H * math.sin(ang)),
                         (mx + d * 0.22 * H * math.cos(ang), my + 0.22 * H * math.sin(ang))], width=lw * 0.8)
        elif e == 'breath':
            mx, my = x + d * 0.48 * H, y + 0.25 * H
            for k, oy in enumerate((-0.12, 0.0, 0.12)):
                pts = [(mx + d * (0.05 + i * 0.07) * H, my + oy * H * (1 + i * 0.25) + math.sin(i * 1.7) * 0.025 * H)
                       for i in range(5)]
                cv.line(pts, width=0.06 * H + 2 * lw * 0.6, color='sumi', amp=0.3)
                cv.line(pts, width=0.06 * H, color='kinari', amp=0, raw=True)
        elif e == 'moya':
            cx, cy = x + 0.1 * H, y - 0.85 * H
            blob = []
            for i in range(9):
                a = math.radians(i * 40)
                blob += ell(cx + 0.22 * H * math.cos(a), cy + 0.12 * H * math.sin(a), 0.11 * H, 0.1 * H,
                            i * 40 - 70, i * 40 + 70, n=6)
            cv.shape(blob, fill='gray', lw=lw * 0.8)
        elif e == 'drop':   # sadness tear
            sx, sy = x + (0.17 + 0.14 * d) * H * (1 if self.facing != 'front' else 0.0) - (0.17 * H if self.facing == 'front' else 0), y + 0.2 * H
            p = [(sx, sy - 0.1 * H)] + ell(sx, sy, 0.05 * H, 0.06 * H, -30, 210, n=14)
            cv.shape(p, fill='blue', lw=lw * 0.6)


# ================================================================ backgrounds & props
def rug(cv, y0, y1, mode='diamond', x0=None, x1=None, fringe=True, dw=None):
    """carpet floor: navy/red diamonds with tiny gold-ink flowers; fringe at the far edge."""
    x0 = -10 if x0 is None else x0
    x1 = cv.w + 10 if x1 is None else x1
    lw = cv.lw
    # floor strip behind rug
    cv.fill([(x0, y0 - 4), (x1, y0 - 4), (x1, y1 + 10), (x0, y1 + 10)], mix('kinari2', 'kinink', 0.12), edge=False)
    ry0 = y0 + (y1 - y0) * 0.12
    if mode == 'split':
        mid = (x0 + x1) / 2
        cv.shape([(x0, ry0), (x1, ry0), (x1, y1 + 20), (x0, y1 + 20)], fill='akane', line=False, tex=0.08, shift=False)
        cv.shape([(x0, ry0), (mid, ry0), (mid, y1 + 20), (x0, y1 + 20)], fill='ai', line=False, tex=0.08, shift=False)
    else:
        cv.shape([(x0, ry0), (x1, ry0), (x1, y1 + 20), (x0, y1 + 20)], fill='ai', line=False, tex=0.08)
    # border band
    bh = (y1 - ry0) * 0.14
    cv.shape([(x0, ry0), (x1, ry0), (x1, ry0 + bh), (x0, ry0 + bh)], fill='akane', line=False, tex=0.08)
    # stitched gold dashes on the band
    xx = x0 + 6
    while xx < x1:
        cv.line([(xx, ry0 + bh * 0.5), (xx + 9, ry0 + bh * 0.5)], width=max(2, lw * 0.45), color='kin', amp=0.2)
        xx += 18
    # diamonds
    top = ry0 + bh + 6
    rows_h = y1 - top
    dh = dw or max(46, rows_h / 2.2)
    dwid = dh * 1.25
    yy = top + dh / 2
    row = 0
    while yy - dh / 2 < y1 + 10:
        off = (dwid / 2) if row % 2 else 0
        xx = x0 + off
        i = 0
        while xx < x1 + dwid:
            if mode == 'split':
                base = 'ai2' if xx < (x0 + x1) / 2 else 'akane2'
            else:
                base = 'akane2' if (i + row) % 2 else 'ai2'
            p = [(xx, yy - dh / 2 + 3), (xx + dwid / 2 - 3, yy), (xx, yy + dh / 2 - 3), (xx - dwid / 2 + 3, yy)]
            cv.shape(p, fill=base, line=False, amp=1.0, tex=0.1, falpha=0.55)
            # 4-petal flower
            r = dh * 0.11
            for a in (0, 90, 180, 270):
                ang = math.radians(a)
                cv.fill(ell(xx + math.cos(ang) * r, yy + math.sin(ang) * r, r * 0.75, r * 0.75, n=10), 'kinink',
                        tex=0, edge=False, alpha=0.7)
            cv.dot(xx, yy, r * 0.45, color='kin')
            xx += dwid
            i += 1
        yy += dh * 0.85
        row += 1
    if fringe:
        xx = x0 + 4
        while xx < x1:
            L = 14 + cv.rng.uniform(-2, 2)
            cv.line([(xx, ry0 + 1), (xx + cv.rng.uniform(-2, 2), ry0 - L)], width=max(2.4, lw * 0.5),
                    color='sumi', amp=0.3)
            cv.line([(xx, ry0 + 1), (xx + cv.rng.uniform(-1, 1), ry0 - L + 2)], width=max(1.2, lw * 0.25),
                    color='kinari2', amp=0.1)
            xx += 9
        cv.line([(x0, ry0), (x1, ry0)], width=lw * 0.8, amp=1.0)


def wall(cv, y_floor, color='kinari', panel=True):
    cv.fill([(-10, -10), (cv.w + 10, -10), (cv.w + 10, y_floor), (-10, y_floor)], color, tex=0.05, edge=False)
    if panel:
        # wainscot band
        cv.fill([(-10, y_floor - 70 * cv.lw / 6), (cv.w + 10, y_floor - 70 * cv.lw / 6), (cv.w + 10, y_floor),
                 (-10, y_floor)], mix(color, 'kinari2', 0.8), tex=0.06, edge=False)
        cv.line([(-10, y_floor - 70 * cv.lw / 6), (cv.w + 10, y_floor - 70 * cv.lw / 6)], width=cv.lw * 0.6,
                color=mix(color, 'kinink', 0.5))
    cv.line([(-10, y_floor), (cv.w + 10, y_floor)], width=cv.lw * 0.8)


def window(cv, x0, y0, x1, y1, night=False):
    cv.shape(rrect(x0, y0, x1, y1, 6), fill='kinink')
    g = 10 * cv.lw / 6
    pane = 'ai' if night else mix('kinari', 'haiao', 0.35)
    cv.shape([(x0 + g, y0 + g), (x1 - g, y0 + g), (x1 - g, y1 - g), (x0 + g, y1 - g)], fill=pane)
    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
    cv.line([(mx, y0 + g), (mx, y1 - g)], width=g * 0.9, color='kinink')
    cv.line([(x0 + g, my), (x1 - g, my)], width=g * 0.9, color='kinink')
    if night:
        cv.dot(x0 + (x1 - x0) * 0.72, y0 + (y1 - y0) * 0.28, (x1 - x0) * 0.06, color='kin')
    else:
        # light streaks
        cv.line([(x0 + g * 2.5, y0 + g * 4), (x0 + g * 4.5, y0 + g * 2)], width=g * 0.6, color='kinari', amp=0.3)


def door(cv, x0, y0, x1, y1, open_frac=0.0, dark=False, knob_side='r', color='kinink'):
    """door frame + panel; open_frac>0 shows a dark gap"""
    lw = cv.lw
    cv.shape([(x0 - 12, y0 - 12), (x1 + 12, y0 - 12), (x1 + 12, y1), (x0 - 12, y1)], fill=mix('kinink', 'kinari', 0.2))
    cv.shape([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], fill='ai' if dark or open_frac else mix('karashi', 'kinink', 0.35))
    if open_frac < 1:
        w = (x1 - x0) * (1 - open_frac)
        if knob_side == 'r':
            pts = [(x0, y0), (x0 + w, y0 + (y1 - y0) * 0.02 * open_frac), (x0 + w, y1 - (y1 - y0) * 0.02 * open_frac), (x0, y1)]
        else:
            pts = [(x1 - w, y0), (x1, y0), (x1, y1), (x1 - w, y1)]
        cv.shape(pts, fill=mix('karashi', 'kinink', 0.35))
        # panels
        px0, px1 = pts[0][0] + w * 0.15, pts[0][0] + w * 0.85
        if knob_side != 'r':
            px0, px1 = x1 - w * 0.85, x1 - w * 0.15
        cv.line(rrect(px0, y0 + (y1 - y0) * 0.08, px1, y0 + (y1 - y0) * 0.42, 4), width=lw * 0.6, closed=True,
                color=mix('kinink', 'sumi', 0.3))
        cv.line(rrect(px0, y0 + (y1 - y0) * 0.52, px1, y0 + (y1 - y0) * 0.92, 4), width=lw * 0.6, closed=True,
                color=mix('kinink', 'sumi', 0.3))
        kx = pts[1][0] - w * 0.12 if knob_side == 'r' else pts[0][0] + w * 0.12
        cv.shape(ell(kx, (y0 + y1) / 2 + 10, 9 * lw / 6, 9 * lw / 6, n=16), fill='kin', lw=lw * 0.6)


def shards(cv, cx, cy, sc=1.0, marks=True):
    """broken cup: a bottom piece + 3 shards, light fill so they read on the dark rug."""
    cv.shadow(cx, cy + 14 * sc, 70 * sc, 10 * sc, alpha=0.18)
    glass = mix('kinari', 'haiao', 0.35)
    # bottom of the cup (still round)
    base = [(cx - 22 * sc, cy - 6 * sc), (cx - 10 * sc, cy - 22 * sc), (cx + 2 * sc, cy - 12 * sc), (cx + 12 * sc, cy - 24 * sc),
            (cx + 22 * sc, cy - 6 * sc), (cx + 18 * sc, cy + 12 * sc), (cx - 18 * sc, cy + 12 * sc)]
    cv.shape(base, fill=glass, lcolor='kinink', lw=cv.lw * 0.8, amp=0.3)
    cv.line([(cx - 16 * sc, cy + 4 * sc), (cx + 16 * sc, cy + 4 * sc)], width=cv.lw * 0.5, color='kinink', amp=0.2)
    pcs = [((-52, 8), [(0, 0), (20, -12), (16, 10)]), ((44, 2), [(0, 0), (22, -4), (8, 16)]),
           ((-30, -30), [(0, 0), (14, -10), (18, 4)]), ((34, -30), [(0, 0), (10, -8), (14, 6)])]
    for (ox, oy), pts in pcs:
        pp = [(cx + (ox + x) * sc, cy + (oy + y) * sc) for x, y in pts]
        cv.shape(pp, fill=glass, lcolor='kinink', lw=cv.lw * 0.7, amp=0.2)
        cv.line([pp[0], pp[1]], width=cv.lw * 0.35, color='kinari', amp=0.1)
    if marks:
        for a in (200, 235, 305, 340):
            ang = math.radians(a)
            cv.line([(cx + 80 * sc * math.cos(ang), cy + 46 * sc * math.sin(ang)),
                     (cx + 100 * sc * math.cos(ang), cy + 58 * sc * math.sin(ang))], width=cv.lw * 0.7, color='kinari')


def desk(cv, x0, x1, ytop, yfloor, depth=40):
    lw = cv.lw
    wood = mix('karashi', 'kinink', 0.25)
    top = [(x0, ytop), (x1, ytop), (x1 + 0, ytop + depth * 0.4), (x0, ytop + depth * 0.4)]
    for lx in (x0 + 18, x1 - 18):
        cv.tube([(lx, ytop + depth * 0.4), (lx, yfloor)], 12 * lw / 6, 'kinink')
    cv.shape([(x0 - 6, ytop - depth * 0.5), (x1 + 6, ytop - depth * 0.5), (x1 + 6, ytop), (x0 - 6, ytop)], fill=mix(wood, 'kinari', 0.25))
    cv.shape([(x0 - 6, ytop), (x1 + 6, ytop), (x1 + 6, ytop + depth * 0.4), (x0 - 6, ytop + depth * 0.4)], fill=wood)
    cv.hatch([(x0 - 6, ytop), (x1 + 6, ytop), (x1 + 6, ytop + depth * 0.4), (x0 - 6, ytop + depth * 0.4)],
             color='kinink', gap=7, angle=170, width=1, alpha=0.3)


def calendar(cv, x0, y0, w, h, mark=(3, 1), today=(2, 1)):
    lw = cv.lw
    cv.shadow(x0 + w / 2 + 6, y0 + h / 2 + 8, w * 0.5, h * 0.5, alpha=0.12)
    cv.shape([(x0, y0), (x0 + w, y0), (x0 + w, y0 + h), (x0, y0 + h)], fill='kinari', lw=lw * 0.8)
    cv.shape([(x0, y0), (x0 + w, y0), (x0 + w, y0 + h * 0.2), (x0, y0 + h * 0.2)], fill='akane', lw=lw * 0.8)
    # ring holes
    for k in (0.3, 0.7):
        cv.dot(x0 + w * k, y0 + h * 0.1, h * 0.03, color='kinari')
    cols, rows = 5, 3
    gx0, gy0 = x0 + w * 0.06, y0 + h * 0.28
    cw, ch = w * 0.88 / cols, h * 0.66 / rows
    for i in range(cols + 1):
        cv.line([(gx0 + i * cw, gy0), (gx0 + i * cw, gy0 + rows * ch)], width=lw * 0.35, color='kinink', amp=0.4)
    for j in range(rows + 1):
        cv.line([(gx0, gy0 + j * ch), (gx0 + cols * cw, gy0 + j * ch)], width=lw * 0.35, color='kinink', amp=0.4)
    tx, ty = today
    cv.fill([(gx0 + tx * cw + 3, gy0 + ty * ch + 3), (gx0 + (tx + 1) * cw - 3, gy0 + ty * ch + 3),
             (gx0 + (tx + 1) * cw - 3, gy0 + (ty + 1) * ch - 3), (gx0 + tx * cw + 3, gy0 + (ty + 1) * ch - 3)],
            'kinari2', edge=False)
    mx, my = mark
    cx, cy = gx0 + (mx + 0.5) * cw, gy0 + (my + 0.5) * ch
    cv.line(ell(cx, cy, cw * 0.55, ch * 0.58, n=40), width=lw * 0.95, color='kin', closed=True, amp=1.0)
    cv.dot(cx, cy, min(cw, ch) * 0.16, color='kin')
    return (cx, cy)


def phone(cv, cx, cy, w, h, rot=0, screen='ai2', face_down=False):
    lw = cv.lw
    body = rot_pts(rrect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, w * 0.18), cx, cy, rot)
    cv.shape(body, fill='sumi' if not face_down else 'ai', lw=lw * 0.8)
    if not face_down:
        scr = rot_pts(rrect(cx - w * 0.38, cy - h * 0.4, cx + w * 0.38, cy + h * 0.4, w * 0.06), cx, cy, rot)
        cv.shape(scr, fill=screen, line=False)
    else:
        cv.dot(*rot_pts([(cx - w * 0.22, cy - h * 0.34)], cx, cy, rot)[0], w * 0.08, color='gray')


def bubble(cv, cx, cy, rx, ry, kind='round', tail=(0, 1), content='dots', fill='kinari', lwm=1.0, color_dots='sumi'):
    """speech bubble without text. kind: round | spiky. content: dots | heart | none | circle | dash"""
    lw = cv.lw * lwm
    tx, ty = tail
    if kind == 'pointy':
        pts = [(cx - rx, cy - ry * 0.2), (cx - rx * 0.55, cy - ry), (cx + rx * 0.6, cy - ry * 0.9), (cx + rx, cy - ry * 0.05),
               (cx + rx * 0.55, cy + ry), (cx - rx * 0.5, cy + ry * 0.9), (cx - rx * 0.78, cy + ry * 0.45),
               (cx - rx * 1.45, cy + ry * 0.55)]
        cv.shape(pts, fill=fill, lw=lw, amp=0.6)
    elif kind == 'spiky':
        pts = []
        n = 16
        for i in range(n * 2):
            a = math.radians(i * 180 / n)
            r = 1.0 if i % 2 == 0 else 0.74
            r *= 1 + cv.rng.uniform(-0.06, 0.06)
            pts.append((cx + rx * r * math.cos(a), cy + ry * r * math.sin(a)))
        cv.shape(pts, fill=fill, lw=lw, amp=0.6)
    else:
        ang = math.degrees(math.atan2(ty, tx))
        b = ell(cx, cy, rx, ry, ang + 12, ang + 360 - 12, n=60)
        tip = (cx + tx * (rx + ry * 0.5), cy + ty * (ry + ry * 0.5))
        b = b + [tip]
        cv.shape(b, fill=fill, lw=lw, amp=0.8)
    if content == 'dots':
        for k in (-1, 0, 1):
            cv.dot(cx + k * rx * 0.32, cy, min(rx, ry) * 0.1, color=color_dots)
    elif content == 'dash':
        for k, ww in enumerate((0.55, 0.4)):
            yy = cy + (k - 0.5) * ry * 0.5
            xx = cx - rx * 0.55
            while xx < cx - rx * 0.55 + rx * 2 * ww:
                cv.line([(xx, yy), (xx + rx * 0.12, yy)], width=lw * 0.8, color=color_dots, amp=0.2)
                xx += rx * 0.2
    elif content == 'heart':
        heart(cv, cx, cy, min(rx, ry) * 0.45, 'akane2')
    elif content == 'q':
        pass


def heart(cv, cx, cy, s, color='akane2', lw=None):
    p = bez((cx, cy + s * 0.9), (cx - s * 1.6, cy - s * 0.1), (cx - s * 0.7, cy - s * 1.1), (cx, cy - s * 0.4), n=12)
    p += bez((cx, cy - s * 0.4), (cx + s * 0.7, cy - s * 1.1), (cx + s * 1.6, cy - s * 0.1), (cx, cy + s * 0.9), n=12)[1:]
    cv.shape(p, fill=color, lw=lw if lw else cv.lw * 0.6, amp=0.4)


def ball(cv, cx, cy, r, kind='basket'):
    lw = cv.lw
    if kind == 'basket':
        cv.shape(ell(cx, cy, r, r, n=40), fill=mix('karashi', 'akane2', 0.45), lw=lw * 0.8)
        cv.line([(cx - r, cy), (cx + r, cy)], width=lw * 0.5, amp=0.4)
        cv.line([(cx, cy - r), (cx, cy + r)], width=lw * 0.5, amp=0.4)
        cv.line(ell(cx - r * 1.25, cy, r * 0.85, r * 0.95, -50, 50, n=10), width=lw * 0.5, amp=0.3)
        cv.line(ell(cx + r * 1.25, cy, r * 0.85, r * 0.95, 130, 230, n=10), width=lw * 0.5, amp=0.3)
    else:  # soccer-ish: kinari with dark patches
        cv.shape(ell(cx, cy, r, r, n=40), fill='kinari', lw=lw * 0.8)
        cv.shape(star_pts(cx, cy, r * 0.32, r * 0.3, n=5), fill='sumi', lw=lw * 0.3)
        for a in (-90, -18, 54, 126, 198):
            ang = math.radians(a)
            cv.line([(cx + math.cos(ang) * r * 0.32, cy + math.sin(ang) * r * 0.32),
                     (cx + math.cos(ang) * r * 0.75, cy + math.sin(ang) * r * 0.75)], width=lw * 0.45)


def manga(cv, cx, cy, w, h, rot=0, stain=True, open_=False):
    lw = cv.lw
    if open_:
        L = rot_pts([(cx - w, cy - h / 2), (cx, cy - h / 2 + 6), (cx, cy + h / 2), (cx - w, cy + h / 2 - 6)], cx, cy, rot)
        R = rot_pts([(cx, cy - h / 2 + 6), (cx + w, cy - h / 2), (cx + w, cy + h / 2 - 6), (cx, cy + h / 2)], cx, cy, rot)
        cv.shape(L, fill='kinari'); cv.shape(R, fill='kinari')
        return
    # pages edge
    pg = rot_pts(rrect(cx - w / 2 + 4, cy - h / 2 + 6, cx + w / 2 + 6, cy + h / 2 + 6, 3), cx, cy, rot)
    cv.shape(pg, fill='kinari', lw=lw * 0.7)
    cov = rot_pts(rrect(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2, 4), cx, cy, rot)
    cv.shape(cov, fill='akane2', lw=lw * 0.8)
    # simple cover art: a star and a band (no text)
    band = rot_pts([(cx - w / 2, cy + h * 0.22), (cx + w / 2, cy + h * 0.22), (cx + w / 2, cy + h * 0.36),
                    (cx - w / 2, cy + h * 0.36)], cx, cy, rot)
    cv.shape(band, fill='kinari', line=False)
    sp = rot_pts([(cx, cy - h * 0.12)], cx, cy, rot)[0]
    cv.shape(star_pts(sp[0], sp[1], w * 0.24, w * 0.11), fill='kin', lw=lw * 0.6)
    cv.line(rot_pts([(cx - w / 2 + 8, cy - h / 2 + 4), (cx - w / 2 + 8, cy + h / 2 - 4)], cx, cy, rot), width=lw * 0.5,
            color=mix('akane2', 'sumi', 0.4))
    if stain:
        st = rot_pts([(cx + w * 0.12, cy + h * 0.02)], cx, cy, rot)[0]
        blob = []
        for i in range(14):
            a = math.radians(i * 360 / 14)
            r = w * 0.2 * (1 + 0.25 * math.sin(i * 2.3) + cv.rng.uniform(-0.1, 0.1))
            blob.append((st[0] + r * math.cos(a), st[1] + r * 0.85 * math.sin(a)))
        cv.shape(blob, fill=mix('kinink', 'karashi', 0.3), line=False, falpha=0.85, amp=1.5)
        cv.line(blob, closed=True, width=lw * 0.4, color='kinink', amp=0.6, alpha=0.8)
        cv.dot(st[0] + w * 0.28, st[1] - h * 0.1, w * 0.04, color=mix('kinink', 'karashi', 0.3))


def juice(cv, x, y, s=1.0, fallen=True):
    """juice carton; if fallen, lies on its side with a puddle."""
    lw = cv.lw
    if fallen:
        cv.shape([(x - 6 * s, y + 4 * s), (x + 160 * s, y + 8 * s), (x + 190 * s, y + 18 * s), (x + 130 * s, y + 26 * s),
                  (x + 40 * s, y + 24 * s), (x - 10 * s, y + 16 * s)],
                 fill=mix('karashi', 'akane2', 0.3), lw=lw * 0.6, falpha=0.85, amp=2)
        body = [(x, y - 40 * s), (x + 80 * s, y - 40 * s), (x + 80 * s, y), (x, y)]
        cv.shape(body, fill='kinari', lw=lw * 0.8)
        cv.shape([(x, y - 40 * s), (x - 24 * s, y - 32 * s), (x - 24 * s, y - 8 * s), (x, y)], fill='kinari2', lw=lw * 0.8)
        cv.shape([(x + 22 * s, y - 33 * s), (x + 58 * s, y - 33 * s), (x + 58 * s, y - 7 * s), (x + 22 * s, y - 7 * s)],
                 fill='karashi', lw=lw * 0.5)
        cv.dot(x + 40 * s, y - 20 * s, 7 * s, color='akane2')
        # straw
        cv.tube([(x - 16 * s, y - 22 * s), (x - 48 * s, y - 30 * s)], 5 * s, 'akane2', lw=lw * 0.5)
    else:
        body = [(x - 25 * s, y - 70 * s), (x + 25 * s, y - 70 * s), (x + 25 * s, y), (x - 25 * s, y)]
        cv.shape(body, fill='kinari')


# ================================================================ helpers for compositions
def kid(cv, cx, gy, H, **kw):
    extras = kw.pop('extras', ())
    pb = kw.pop('pb', None)
    pf = kw.pop('pf', None)
    p = Person(cv, 'kid', cx, gy, H, **kw)
    p.draw(extras, props_behind=pb, props_front=pf)
    return p


def person(cv, kind, cx, gy, H, **kw):
    extras = kw.pop('extras', ())
    pb = kw.pop('pb', None)
    pf = kw.pop('pf', None)
    p = Person(cv, kind, cx, gy, H, **kw)
    p.draw(extras, props_behind=pb, props_front=pf)
    return p


def silhouette(cv, kind, cx, gy, H, color, **kw):
    """flat single-color figure (opponent team / shadow): draw a person and recolor by stamping."""
    # draw person into a temporary canvas, then paste as a solid color through its alpha
    tmp = Canvas(cv.w, cv.h, seed=int(cv.rng.integers(1e6)), S=cv.S, bg=(255, 255, 255))
    p = Person(tmp, kind, cx, gy, H, **kw)
    p.blush = False
    p.draw(())
    a = np.asarray(tmp.img, dtype=np.float32)
    m = (255 - a.min(axis=2)).clip(0, 255)
    m = (m > 18).astype(np.float32) * 255
    shadow_m = Image.fromarray(m.astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.6 * cv.S))
    x0, y0 = 0, 0
    cv._paste(color, shadow_m, 0, 0, tex=0.08)
    return p


# ================================================================ SCENES (1280 x 720)
SW, SH = 1280, 720
FLOOR = 470   # wall/floor line for scenes


def scene_s1_1(path):
    cv = Canvas(SW, SH, 101)
    wall(cv, FLOOR)
    # blackboard (navy) on the back wall, right
    cv.shape(rrect(560, 70, 1220, 330, 6), fill='kinink')
    cv.shape(rrect(576, 86, 1204, 314, 4), fill='ai', tex=0.1)
    cv.line([(600, 300), (1180, 300)], width=4, color=mix('ai', 'kinari', 0.25), amp=0.8)
    cv.line(bez((640, 150), (700, 120), (760, 170)), width=4, color=mix('ai', 'kinari', 0.3), amp=0.6)
    window(cv, 90, 80, 330, 300)
    rug(cv, FLOOR, SH, mode='split')
    # teacher behind right, with a stack of papers
    def papers(p):
        h = p.hand('L')
        for k in range(4):
            cv.shape(rot_pts(rrect(h[0] - 70 + k * 2, h[1] - 18 - k * 7, h[0] + 30 + k * 2, h[1] + 12 - k * 7, 3),
                             h[0], h[1], -4), fill='kinari', lw=4)
    person(cv, 'sensei', 1010, 650, 118, facing='l', eyes='dot', mouth='line', brows=None,
           arms={'L': dict(hand=(-0.55, 0.55), bend=-0.6), 'R': dict(hand=(-0.35, 0.65), bend=0.4)},
           pf=papers)
    # desk + kid
    p = kid(cv, 440, 690, 150, facing='r', eyes='wide', brows='worry', mouth='wave', look=(0.03, 0.05),
            arms={'L': dict(hand=(0.75, 0.45), bend=-0.5), 'R': dict(hand=(0.95, 0.35), bend=0.3)},
            extras=('sweat2',))
    desk(cv, 520, 820, 520, 700, depth=50)
    bag_open(cv, 680, 515, 1.0)
    cv.save(path)


def bag_open(cv, bx, by, s):
    """school bag seen a little from above, flap thrown back, inside empty (only lining)."""
    lw = cv.lw
    cv.shadow(bx, by + 6 * s, 120 * s, 14 * s, alpha=0.2)
    # flap thrown back (behind)
    cv.shape([(bx - 92 * s, by - 112 * s), (bx + 92 * s, by - 112 * s), (bx + 112 * s, by - 210 * s),
              (bx - 112 * s, by - 210 * s)], fill='akane2')
    cv.shape(rrect(bx - 20 * s, by - 200 * s, bx + 20 * s, by - 176 * s, 5 * s), fill='kin', lw=lw * 0.6)
    # opening (inside: lining, bottom seam, nothing in it)
    opening = [(bx - 112 * s, by - 112 * s), (bx + 112 * s, by - 112 * s), (bx + 100 * s, by - 60 * s),
               (bx - 100 * s, by - 60 * s)]
    cv.shape(opening, fill=mix('akane', 'sumi', 0.5))
    cv.shape([(bx - 92 * s, by - 104 * s), (bx + 92 * s, by - 104 * s), (bx + 84 * s, by - 72 * s),
              (bx - 84 * s, by - 72 * s)], fill=mix('kinari2', 'akane', 0.25), lw=lw * 0.5)
    cv.line([(bx - 84 * s, by - 72 * s), (bx + 84 * s, by - 72 * s)], width=lw * 0.5, color='kinink')
    # front body
    cv.shape([(bx - 100 * s, by - 60 * s), (bx + 100 * s, by - 60 * s), (bx + 108 * s, by), (bx - 108 * s, by)],
             fill='akane')
    cv.line([(bx - 90 * s, by - 48 * s), (bx + 90 * s, by - 48 * s)], width=lw * 0.6, color='kin', amp=0.4)
    for xx in (-60, 60):
        cv.tube([(bx + xx * s, by - 60 * s), (bx + xx * s * 1.05, by - 6 * s)], 10 * s, 'akane2', lw=lw * 0.5)


def scene_s1_2(path):
    cv = Canvas(SW, SH, 102)
    wall(cv, FLOOR, panel=False)
    # kitchen counter & shelf (left)
    cv.shape([(40, 300), (470, 300), (470, FLOOR), (40, FLOOR)], fill=mix('kinari2', 'kinink', 0.15))
    for xx in (40, 183, 326):
        cv.line(rrect(xx + 14, 330, xx + 130, FLOOR - 16, 4), closed=True, width=4, color='kinink')
        cv.dot(xx + 115, 390, 6, color='kinink')
    cv.shape([(28, 286), (482, 286), (482, 306), (28, 306)], fill='kinink')
    # cups on shelf
    cv.shape([(60, 150), (470, 150), (470, 164), (60, 164)], fill='kinink')
    for k, xx in enumerate((110, 190, 270)):
        cv.shape([(xx - 26, 92), (xx + 26, 92), (xx + 20, 150), (xx - 20, 150)],
                 fill=mix('haiao', 'kinari', 0.45), lw=5)
        cv.line([(xx - 18, 108), (xx - 14, 140)], width=3, color='kinari', amp=0.2)
    cv.shape(ell(390, 120, 44, 30, n=30), fill='akane2')  # pot
    cv.line([(346, 116), (330, 106)], width=6)
    # door to next room (right), opened, dark gap, family face peeking as shadow
    door(cv, 960, 120, 1180, FLOOR, open_frac=0.55, knob_side='r')
    # peeking family shadow (silhouette face + shoulder)
    sx, sy = 1135, 255
    cv.shape(ell(sx, sy, 48, 50, n=40), fill=mix('ai', 'sumi', 0.35), lw=4)
    cv.shape([(sx - 52, sy + 60), (sx + 30, sy + 60), (sx + 45, sy + 160), (sx - 52, sy + 160)],
             fill=mix('ai', 'sumi', 0.35), lw=4)
    cv.dot(sx - 18, sy + 2, 5, color='kinari')
    cv.dot(sx + 8, sy + 2, 5, color='kinari')
    rug(cv, FLOOR, SH, mode='diamond')
    # shards on floor
    shards(cv, 735, 625, 2.2)
    kid(cv, 450, 690, 150, facing='r', eyes='wide', brows='worry', mouth='o',
        arms={'L': dict(hand=(-0.15, 0.6), bend=0.5), 'R': dict(hand=(0.15, 0.6), bend=-0.5)},
        look=(0.03, 0.06), extras=('panic',))
    cv.save(path)


def scene_s2_1(path):
    cv = Canvas(SW, SH, 103)
    wall(cv, FLOOR)
    window(cv, 860, 70, 1140, 300)
    # bookshelf left
    cv.shape([(60, 110), (300, 110), (300, FLOOR), (60, FLOOR)], fill='kinink')
    for yy in (180, 260, 340, 420):
        cv.line([(70, yy), (290, yy)], width=6, color=mix('kinink', 'sumi', 0.4))
    for k in range(18):
        r = k % 6
        yy = 180 + 80 * (k // 6)
        xx = 78 + r * 34
        c = ['akane2', 'ai2', 'karashi', 'koke', 'haiao', 'kinari2'][(k * 5) % 6]
        cv.shape([(xx, yy - 62 + (k % 3) * 6), (xx + 26, yy - 62 + (k % 3) * 6), (xx + 26, yy - 3), (xx, yy - 3)],
                 fill=c, lw=3)
    rug(cv, FLOOR, SH, mode='diamond')
    # kid behind desk (center-left), arms up in panic
    kid(cv, 470, 700, 150, facing='r', eyes='wide', brows='worry', mouth='shout',
        arms={'L': dict(hand=(-0.45, -0.75), bend=-0.6), 'R': dict(hand=(0.45, -0.75), bend=0.6)},
        extras=('panic', 'sweat2'))
    desk(cv, 420, 1050, 540, 712, depth=56)
    # manga with stain + fallen juice + puddle
    manga(cv, 800, 498, 120, 160, rot=-78)
    juice(cv, 560, 512, s=1.25)
    cv.save(path)


def scene_s2_2(path):
    cv = Canvas(SW, SH, 104)
    wall(cv, FLOOR, color=mix('kinari', 'kinari2', 0.4))
    # high windows
    for xx in (330, 560, 790):
        window(cv, xx, 50, xx + 170, 150)
    # hoop on the wall (right)
    cv.shape(rrect(1050, 70, 1230, 190, 4), fill='kinari', lw=6)
    cv.line(rrect(1110, 120, 1170, 175, 2), closed=True, width=4, color='akane')
    cv.line([(1105, 195), (1175, 195)], width=7, color='akane2')
    for k in range(6):
        x0 = 1108 + k * 12
        cv.line([(x0, 196), (x0 + 4 + (k - 3) * 2, 250)], width=3, color='kinari2')
    # entrance door (left) — kid stands in front
    door(cv, 40, 140, 300, FLOOR, open_frac=1.0)
    rug(cv, FLOOR, SH, mode='diamond')
    # messy ball cage + net, center
    cx = 640
    cv.shadow(cx, 650, 150, 20, alpha=0.2)
    for k, (bx, by, kind) in enumerate([(560, 640, 'basket'), (700, 650, 'soccer'), (520, 580, 'soccer')]):
        pass
    cage = [(cx - 110, 470), (cx + 110, 470), (cx + 100, 640), (cx - 100, 640)]
    # balls inside cage
    for bx, by in ((cx - 50, 500), (cx + 40, 495), (cx - 5, 460)):
        ball(cv, bx, by, 40)
    cv.shape(cage, fill=None, lw=6)
    for k in range(1, 6):
        xx = cx - 110 + k * 37
        cv.line([(xx, 470), (xx - (k - 3) * 3, 640)], width=4, amp=0.6)
    for yy in (530, 590):
        cv.line([(cx - 107, yy), (cx + 107, yy)], width=4, amp=0.6)
    for wx in (cx - 90, cx + 90):
        cv.shape(ell(wx, 650, 14, 14, n=16), fill='sumi', lw=3)
    # scattered balls
    ball(cv, 820, 660, 34, 'soccer')
    ball(cv, 470, 680, 30, 'basket')
    # tangled net heap
    heap = [(760, 640), (780, 590), (830, 570), (880, 585), (905, 640)]
    cv.shape(heap, fill=mix('kinari', 'kinari2', 0.5), lw=5, amp=2.0)
    for k in range(6):
        cv.line([(770 + k * 24, 640), (800 + k * 18, 575)], width=2.5, color='kinink', amp=0.8)
        cv.line([(765 + k * 22, 585 + k * 2), (900 - k * 4, 640 - k * 10)], width=2.5, color='kinink', amp=0.8)
    cv.line(bez((900, 630), (940, 660), (980, 640)), width=4, color='kinink', amp=1)
    # two teammates, arms crossed, worried, on the right
    cross = {'L': dict(hand=(0.55, 0.42), bend=0.2, front=True), 'R': dict(hand=(-0.55, 0.42), bend=0.2, front=True)}
    person(cv, 'nakama', 1000, 690, 130, facing='l', brows='worry', mouth='frown', arms=cross)
    person(cv, 'nakama2', 1150, 700, 130, facing='l', brows='worry', mouth='frown', arms=cross, look=(0, 0.02))
    # kid at the entrance (left)
    kid(cv, 200, 690, 140, facing='r', eyes='wide', brows='worry', mouth='o',
        arms={'L': dict(hand=(-0.1, 0.8)), 'R': dict(hand=(0.2, 0.0), bend=0.8)}, extras=('sweat',))
    cv.save(path)


def scene_s2_3(path):
    cv = Canvas(SW, SH, 105)
    wall(cv, FLOOR, color=mix('kinari', 'haiao', 0.12))
    window(cv, 120, 80, 340, 280, night=True)
    rug(cv, FLOOR, SH, mode='split')
    # bed (right-center): headboard, mattress, blanket
    cv.shape(rrect(560, 250, 600, 620, 10), fill='kinink')
    cv.shape([(590, 470), (1240, 470), (1240, 600), (590, 600)], fill='kinari2')
    cv.shape([(600, 560), (1240, 560), (1240, 640), (600, 640)], fill=mix('karashi', 'kinink', 0.3))
    cv.shape(rrect(610, 410, 760, 480, 24), fill='kinari')  # pillow
    blanket = [(800, 470), (1240, 470), (1240, 590), (780, 590)]
    cv.shape(blanket, fill='ai2')
    for xx in range(830, 1230, 60):
        cv.line([(xx, 480), (xx - 10, 580)], width=3, color=mix('ai2', 'kinari', 0.3), amp=0.6)
    # kid sitting on the bed edge, holding phone, looking at it
    def ph(p):
        h = p.hand('R')
        phone(cv, h[0] + 6, h[1] - 30, 60, 100, rot=8)
    kid(cv, 760, 640, 140, facing='r', eyes='wide', brows='worry', mouth='o', look=(0.02, 0.05), sit=True,
        legs={'L': dict(foot=(0.35, 1.0), knee=(0.55, 0.15)), 'R': dict(foot=(0.6, 1.0), knee=(0.75, 0.12))},
        arms={'L': dict(hand=(0.5, 0.45), bend=-0.4), 'R': dict(hand=(0.62, 0.36), bend=0.6)}, pf=ph)
    # two bubbles above phone: round (dots) and spiky-ish pointed (dots)
    bubble(cv, 1000, 150, 140, 70, kind='round', tail=(-0.6, 0.8), content='dash')
    # second: pointed tail, round body
    bubble(cv, 1080, 320, 110, 60, kind='pointy', tail=(-0.95, 0.3), content='dots', fill='kinari2')
    # a "?" shaped gold tick on the 2nd? (no text) -> a small dotted line connector from phone
    for k in range(5):
        cv.dot(930 + k * 0, 420 - k * 28, 4, color='kinink')
    cv.save(path)


def scene_s3_1(path):
    cv = Canvas(SW, SH, 106)
    # sky (kinari) + sun + fence (outdoor)
    cv.fill([(-10, -10), (SW + 10, -10), (SW + 10, FLOOR), (-10, FLOOR)], mix('kinari', 'haiao', 0.18), edge=False)
    cv.shape(ell(170, 110, 60, 60, n=40), fill='kin', lw=5)
    for x0, yy in ((330, 90), (1060, 80)):
        cl = ell(x0, yy, 70, 26, n=30) + ell(x0 + 50, yy - 12, 50, 26, n=20)
        cv.shape(ell(x0, yy, 80, 28, n=36), fill='kinari', lw=4)
    # fence line
    for xx in range(-10, SW + 20, 46):
        cv.line([(xx, 300), (xx, FLOOR)], width=4, color='kinink', amp=0.4)
    cv.line([(-10, 330), (SW + 10, 330)], width=5, color='kinink')
    cv.line([(-10, 420), (SW + 10, 420)], width=5, color='kinink')
    # scoreboard (center-right): two columns of circles, right has many
    cv.shape(rrect(560, 70, 900, 270, 8), fill='kinink')
    cv.shape(rrect(574, 84, 886, 256, 6), fill='ai')
    cv.line([(730, 96), (730, 246)], width=4, color=mix('ai', 'kinari', 0.4), amp=0.4)
    cv.shape(ell(650, 170, 22, 22, n=20), fill='kin', lw=4)
    for k, (dx, dy) in enumerate(((-40, -40), (40, -40), (-40, 40), (40, 40))):
        cv.shape(ell(808 + dx * 0.9, 170 + dy * 0.9, 22, 22, n=20), fill='kin', lw=4)
    cv.tube([(730, 270), (730, 300)], 14, 'kinink')
    rug(cv, FLOOR, SH, mode='diamond')
    # cheering opponents (right) as silhouettes in akane
    for k, (xx, gy, H) in enumerate(((880, 650, 100), (1030, 668, 104), (1180, 650, 100))):
        p = person(cv, 'team' if k != 1 else 'team2', xx, gy, H, facing='l' if k else 'front', eyes='happy',
                   mouth='big',
                   arms={'L': dict(hand=(-0.45, -1.05), bend=-0.5), 'R': dict(hand=(0.45, -1.05), bend=0.5)},
                   legs={'L': (-0.25, (p_ll := 1.05) - (0.12 if k == 1 else 0)), 'R': (0.25, 1.05)})
        hc = p.head_center()
        for a in (-150, -120, -60, -30):
            ang = math.radians(a)
            cv.line([(hc[0] + 0.75 * H * math.cos(ang), hc[1] + 0.75 * H * math.sin(ang)),
                     (hc[0] + 0.95 * H * math.cos(ang), hc[1] + 0.95 * H * math.sin(ang))], width=4, color='akane')
    # kid (left) head down, fists clenched
    p = kid(cv, 360, 690, 150, facing='front', eyes='shut', brows='worry', mouth='tight', head_drop=0.08,
            look=(0, 0.08),
            arms={'L': dict(hand=(-0.12, 0.74), handshape='fist'), 'R': dict(hand=(0.12, 0.74), handshape='fist')})
    # tremble marks beside fists
    for side, sgn in (('L', -1), ('R', 1)):
        h = p.hand(side)
        for k in range(2):
            x = h[0] + sgn * (26 + k * 12)
            cv.line([(x, h[1] - 14), (x + sgn * 3, h[1] + 12)], width=3.5)
    cv.save(path)


def scene_s3_2(path):
    cv = Canvas(SW, SH, 107)
    wall(cv, FLOOR, color=mix('ai2', 'ai', 0.4), panel=False)
    cv.line([(-10, FLOOR - 60), (SW + 10, FLOOR - 60)], width=4, color=mix('ai2', 'kinari', 0.2))
    # warm lamp so it is not too dark
    cv.fill([(1072, 262), (1168, 262), (1250, FLOOR - 4), (990, FLOOR - 4)], mix('ai2', 'kin', 0.28), tex=0.04)
    cv.tube([(1120, 260), (1120, FLOOR - 10)], 10, 'kinink')
    cv.shape([(1060, 260), (1180, 260), (1150, 180), (1090, 180)], fill='kin')
    window(cv, 120, 80, 330, 270, night=True)
    rug(cv, FLOOR, SH, mode='split')
    # big phone in the kid's hand with a spiky bubble on screen
    def ph(p):
        h = p.hand('R')
        cv.shape(rot_pts(rrect(h[0] - 14, h[1] - 200, h[0] + 136, h[1] + 30, 22), h[0], h[1], 6), fill='sumi', lw=6)
        scr = rot_pts(rrect(h[0] - 2, h[1] - 182, h[0] + 124, h[1] + 10, 10), h[0], h[1], 6)
        cv.shape(scr, fill='kinari', line=False)
        c = rot_pts([(h[0] + 62, h[1] - 112)], h[0], h[1], 6)[0]
        bubble(cv, c[0], c[1], 56, 46, kind='spiky', content='none', fill='akane2', lwm=0.8)
        for k in range(3):
            cv.line([(c[0] - 24 + k * 22, c[1] - 9), (c[0] - 14 + k * 22, c[1] + 9)], width=5, color='kinari')
        c2 = rot_pts([(h[0] + 48, h[1] - 32)], h[0], h[1], 6)[0]
        bubble(cv, c2[0], c2[1], 40, 18, kind='round', tail=(-1, 0.4), content='dots', fill='kinari2', lwm=0.7)
    kid(cv, 470, 690, 160, facing='r', eyes='squeeze', brows='angry', mouth='tight', red=True,
        arms={'L': dict(hand=(0.1, 0.7), handshape='fist'), 'R': dict(hand=(0.62, 0.3), bend=0.8)},
        extras=('anger',), pf=ph)
    cv.save(path)


# ================================================================ CHOICES (640 x 480)
CW, CH = 640, 480
CF = 368   # floor line in choice images


def cbase(seed, wallc='kinari', mode='diamond', floor=CF):
    cv = Canvas(CW, CH, seed)
    cv.fill([(-10, -10), (CW + 10, -10), (CW + 10, floor), (-10, floor)], wallc, tex=0.05, edge=False)
    cv.line([(-10, floor), (CW + 10, floor)], width=3)
    rug(cv, floor, CH + 5, mode=mode, dw=46)
    return cv


KH = 112   # kid head size in choices
KG = 454   # kid ground y in choices
AH = 100   # adult / partner head size
AG = 458


def bow_kid(cv, cx, H=KH, gy=KG, arms=None, **kw):
    """deep bow seen from the side: straight legs, torso tipped ~50 deg, head low, eyes shut."""
    return kid(cv, cx, gy, H, facing='r', lean=52, head_drop=0.12, eyes='down', mouth='line', look=(0.08, 0.06),
               brows=None, arms=arms or {'L': dict(hand=(0.08, 0.72)), 'R': dict(hand=(0.14, 0.72))}, **kw)


def partner(cv, kind, x, mood='futsuu', facing='l', H=AH, gy=AG, arms=None, **kw):
    m = {'futsuu': ('dot', None, 'line'), 'nikko': ('happy', None, 'smile'), 'shinpai': ('dot', 'worry', 'wave')}[mood]
    return person(cv, kind, x, gy, H, facing=facing, eyes=m[0], brows=m[1], mouth=m[2], arms=arms or {}, **kw)


def wave_marks(cv, x, y, r=30):
    for k in range(2):
        cv.line(ell(x, y, r + k * 12, r + k * 12, 200, 245, n=6), width=3)
        cv.line(ell(x, y, r + k * 12, r + k * 12, 295, 340, n=6), width=3)


# ---- s1-1 宿題をわすれた
def ch_s1_1_a(path):   # うそ: 目をそらし、手を後ろにかくす
    cv = cbase(201)
    def notebook(p):   # a corner of the homework notebook peeking out behind the back
        cv.shape(rot_pts(rrect(330, 286, 396, 336, 4), 363, 311, -16), fill='kinari', lw=3.5)
        cv.line([(340, 306), (386, 294)], width=2.5, color='kinink')
    kid(cv, 290, KG, KH, facing='l', eyes='dot', look=(-0.1, -0.02), brows='worry', mouth='wave',
        arms={'L': dict(hand=(0.3, 0.55), behind=True, handshape='none'),
              'R': dict(hand=(-0.3, 0.55), behind=True, handshape='none')},
        extras=('sweat2', 'speech'), pb=notebook)
    cv.save(path)


def ch_s1_1_b(path):   # 正直: 先生に向かって話す
    cv = cbase(202)
    partner(cv, 'sensei', 500, arms={'L': dict(hand=(-0.2, 0.7)), 'R': dict(hand=(0.1, 0.8))})
    kid(cv, 220, KG, KH, facing='r', eyes='dot', mouth='talk',
        arms={'L': dict(hand=(-0.1, 0.8)), 'R': dict(hand=(0.1, 0.8))}, extras=('speech',))
    cv.save(path)


def ch_s1_1_c(path):   # にげる: ドアからそっと出ていく後ろ姿
    cv = cbase(203)
    door(cv, 330, 70, 530, CF, open_frac=0.6, knob_side='r')
    kid(cv, 420, KG - 8, KH * 0.95, facing='back',
        arms={'L': dict(hand=(-0.15, 0.75)), 'R': dict(hand=(0.25, 0.65))},
        legs={'L': (-0.3, 1.0), 'R': (0.25, 0.96)})
    for xx, yy in ((200, 452), (270, 440)):
        cv.shape(ell(xx, yy, 16, 7, n=12), fill='kinari2', lw=2.5)
    for yy in (220, 270, 320):
        cv.line([(300, yy), (250, yy)], width=3.5)
    cv.save(path)


def ch_s1_1_d(path):   # あやまって、いつ出せるか伝える
    cv = cbase(204)
    calendar(cv, 420, 150, 180, 150, mark=(3, 1), today=(2, 1))
    bow_kid(cv, 200, arms={'L': dict(hand=(0.08, 0.72)),
                           'R': dict(hand=(0.95, 0.0), bend=-0.2, handshape='point', pdir=(1, -0.55))})
    cv.save(path)


# ---- s1-2 コップをわった
def ch_s1_2_a(path):   # ごまかす: 手をふって知らないふり
    cv = cbase(211)
    shards(cv, 520, 440, 0.7, marks=False)
    kid(cv, 280, KG, KH, facing='front', eyes='dot', look=(-0.12, -0.02), brows='worry', mouth='smile',
        arms={'L': dict(hand=(-0.32, -0.02), bend=-0.8), 'R': dict(hand=(0.32, -0.02), bend=0.8)},
        extras=('sweat2',))
    wave_marks(cv, 190, 175)
    wave_marks(cv, 370, 175)
    cv.save(path)


def ch_s1_2_b(path):   # 正直: 家の人に向かって話す
    cv = cbase(212)
    partner(cv, 'ie', 500, arms={'L': dict(hand=(-0.15, 0.75)), 'R': dict(hand=(0.1, 0.8))})
    kid(cv, 220, KG, KH, facing='r', eyes='dot', brows='worry', mouth='talk',
        arms={'L': dict(hand=(-0.1, 0.8)), 'R': dict(hand=(0.1, 0.8))}, extras=('speech',))
    shards(cv, 360, 446, 0.55, marks=False)
    cv.save(path)


def ch_s1_2_c(path):   # 自分のへやにもどる: ドアをしめる
    cv = cbase(213)
    x0, x1 = 290, 470
    cv.shape([(x0 - 14, 50), (x1 + 14, 50), (x1 + 14, CF), (x0 - 14, CF)], fill=mix('kinink', 'kinari', 0.2))
    cv.shape([(x0, 64), (x1, 64), (x1, CF), (x0, CF)], fill='ai')
    kid(cv, 340, KG - 60, KH * 0.92, facing='l', eyes='dot', brows='worry', mouth='frown', look=(0, 0.04),
        arms={'L': dict(hand=(-0.55, 0.15), bend=-0.3), 'R': dict(hand=(0.1, 0.8))})
    cv.shape([(x0 + 64, 60), (x1 + 4, 64), (x1 + 4, CF), (x0 + 64, CF + 6)], fill=mix('karashi', 'kinink', 0.35))
    cv.line(rrect(x0 + 84, 90, x1 - 16, 200, 4), closed=True, width=3, color=mix('kinink', 'sumi', 0.3))
    cv.shape(ell(x0 + 86, 240, 10, 10, n=16), fill='kin', lw=3)
    for yy in (130, 210, 290):
        cv.line([(x1 + 34, yy), (x1 + 80, yy)], width=3.5)
    cv.save(path)


def ch_s1_2_d(path):   # あやまって、いっしょにかたづける
    cv = cbase(214)

    def broom(p):
        h = p.hand('L')
        cv.tube([(h[0] + 34, h[1] - 100), (h[0] - 30, h[1] + 96)], 10, 'kinink', lw=3)
        cv.shape([(h[0] - 62, h[1] + 90), (h[0] - 2, h[1] + 98), (h[0] - 16, h[1] + 150), (h[0] - 88, h[1] + 136)],
                 fill='karashi', lw=4)
        for k in range(5):
            cv.line([(h[0] - 64 + k * 12, h[1] + 104), (h[0] - 76 + k * 13, h[1] + 142)], width=2.5, color='kinink')
    person(cv, 'ie', 500, AG, AH, facing='l', mouth='smile', eyes='dot',
           arms={'L': dict(hand=(-0.4, 0.35), bend=-0.4), 'R': dict(hand=(-0.65, 0.3), bend=0.3, front=True)},
           pf=broom)

    def pan(p):
        h = p.hand('R')
        cv.shape([(h[0] + 10, h[1] + 44), (h[0] + 100, h[1] + 32), (h[0] + 106, h[1] + 76), (h[0] + 10, h[1] + 86)],
                 fill='akane2', lw=4)
        cv.tube([h, (h[0] + 14, h[1] + 48)], 9, 'akane', lw=3)
    kid(cv, 190, KG, KH, facing='r', lean=18, eyes='dot', look=(0.04, 0.06), mouth='line',
        arms={'L': dict(hand=(0.2, 0.6)), 'R': dict(hand=(0.55, 0.5), bend=0.3)}, pf=pan)
    shards(cv, 352, 444, 0.4, marks=False)
    cv.save(path)


# ---- s2-1 かりたまんがをよごした
def ch_s2_1_a(path):   # ごまかす: まんがを渡しながら目をそらす
    cv = cbase(221)
    partner(cv, 'tomodachi', 560, H=AH * 0.95, arms={'L': dict(hand=(-0.55, 0.4), bend=-0.3), 'R': dict(hand=(0.1, 0.8))})

    def bk(p):
        h = p.hand('R')
        manga(cv, h[0] + 36, h[1] - 10, 70, 96, rot=-12)
    kid(cv, 230, KG, KH, facing='r', look=(-0.26, -0.03), eyes='dot', brows='worry', mouth='wave',
        arms={'L': dict(hand=(-0.1, 0.8)), 'R': dict(hand=(0.85, 0.3), bend=0.4)}, pf=bk, extras=('sweat',))
    cv.save(path)


def ch_s2_1_b(path):   # 正直: まんがを両手で持って話す
    cv = cbase(222)
    partner(cv, 'tomodachi', 540, H=AH * 0.95)

    def bk(p):
        h1, h2 = p.hand('L'), p.hand('R')
        manga(cv, (h1[0] + h2[0]) / 2, (h1[1] + h2[1]) / 2 - 22, 76, 104, rot=-4)
        cv.shape(ell(h1[0], h1[1], 10, 10, n=14), fill='skin', lw=3)
        cv.shape(ell(h2[0], h2[1], 10, 10, n=14), fill='skin', lw=3)
    kid(cv, 240, KG, KH, facing='r', eyes='dot', brows='worry', mouth='talk',
        arms={'L': dict(hand=(0.55, 0.42), bend=-0.3, front=True), 'R': dict(hand=(0.75, 0.42), bend=0.3)},
        pf=bk, extras=('speech',))
    cv.save(path)


def ch_s2_1_c(path):   # かえさずにさける: 廊下のかどにかくれる
    cv = cbase(223)
    # far friend on the right (small, in the hallway)
    person(cv, 'tomodachi', 520, 412, 48, facing='l', mouth='line', blush=False)
    # kid behind the corner (left), only half of the face shows
    wx = 250
    kid(cv, wx - 22, KG, KH, facing='r', eyes='dot', look=(0.08, 0), brows='worry', mouth='line',
        arms={'L': dict(hand=(-0.1, 0.8)), 'R': dict(hand=(0.3, 0.25), bend=0.5)})
    cv.shape([(-20, -10), (wx, -10), (wx, CH + 10), (-20, CH + 10)], fill='kinari2', tex=0.08)
    cv.hatch([(wx - 50, -10), (wx, -10), (wx, CH + 10), (wx - 50, CH + 10)], color='kinink', gap=8, angle=80, alpha=0.3)
    cv.line([(wx - 200, 380), (wx, 380)], width=4, color=mix('kinari2', 'kinink', 0.5))
    # fingers gripping the corner
    for k in range(3):
        cv.shape(ell(wx + 6, 268 + k * 16, 10, 8, n=14), fill='skin', lw=3)
    cv.save(path)


def ch_s2_1_d(path):   # あやまって、いっしょにきめる
    cv = cbase(224)
    partner(cv, 'tomodachi', 500, 'nikko', H=AH * 0.95, head_drop=0.06)
    cv.line(ell(500, 128, 70, 26, 200, 340, n=10), width=3.5)
    cv.line([(560, 100), (566, 118)], width=3.5)
    cv.line([(440, 100), (434, 118)], width=3.5)
    bow_kid(cv, 220)
    cv.save(path)


# ---- s2-2 部活の当番をわすれた
def ch_s2_2_a(path):   # 言いわけ: 頭をかく
    cv = cbase(231)
    kid(cv, 300, KG, KH, facing='r', eyes='happy', brows='worry', mouth='smile', look=(-0.05, 0),
        arms={'L': dict(hand=(-0.1, 0.8)), 'R': dict(hand=(0.12, -1.0), bend=0.9)}, extras=('sweat2', 'speech'))
    for k in range(3):
        cv.line([(352 + k * 11, 60 + k * 4), (366 + k * 11, 48 + k * 4)], width=3)
    cv.save(path)


def ch_s2_2_b(path):   # 正直: なかまの前で話す
    cv = cbase(232)
    partner(cv, 'nakama', 450, H=AH * 0.9)
    partner(cv, 'nakama2', 570, H=AH * 0.9, gy=AG + 6)
    kid(cv, 190, KG, KH, facing='r', eyes='dot', brows='worry', mouth='talk',
        arms={'L': dict(hand=(-0.1, 0.8)), 'R': dict(hand=(0.1, 0.8))}, extras=('speech',))
    cv.save(path)


def ch_s2_2_c(path):   # 部活を休む: 体育館（左）と反対の右へ歩く
    cv = cbase(233)
    door(cv, -20, 100, 130, CF, open_frac=1.0)
    ball(cv, 56, 330, 28)
    kid(cv, 430, KG, KH, facing='r', eyes='dot', look=(0.05, 0.03), mouth='line', brows='worry',
        arms={'L': dict(hand=(-0.4, 0.62)), 'R': dict(hand=(0.4, 0.62))},
        legs={'L': dict(foot=(-0.42, 1.0), knee=(-0.12, 0.55)), 'R': dict(foot=(0.42, 0.96), knee=(0.25, 0.5))})
    for k, xx in enumerate((210, 280)):
        cv.shape(ell(xx, 450 - k * 4, 16, 7, n=12), fill='kinari2', lw=2.5)
    for yy in (220, 270, 320):
        cv.line([(310, yy), (255, yy)], width=3.5)
    cv.save(path)


def ch_s2_2_d(path):   # あやまって、かたづけを引きうける（2コマ）
    cv = cbase(234)
    H = 84
    bow_kid(cv, 78, H=76, gy=448)
    partner(cv, 'nakama', 262, 'nikko', H=66, gy=452)
    for yy in range(16, CH - 10, 24):
        cv.line([(318, yy), (318, yy + 13)], width=4, color='kinink', amp=0.2)
    bx = 540
    cage = [(bx - 72, 300), (bx + 72, 300), (bx + 66, 418), (bx - 66, 418)]
    for b in ((bx - 32, 320), (bx + 28, 316), (bx, 290)):
        ball(cv, b[0], b[1], 28)
    cv.shape(cage, fill=None, lw=4)
    for k in range(1, 5):
        cv.line([(bx - 72 + k * 29, 300), (bx - 66 + k * 26.5, 418)], width=3)
    cv.line([(bx - 70, 360), (bx + 70, 360)], width=3)
    for wx in (bx - 56, bx + 56):
        cv.shape(ell(wx, 430, 11, 11, n=14), fill='sumi', lw=2)
    kid(cv, 410, 450, H, facing='r', lean=22, eyes='dot', brows='up', mouth='smile',
        arms={'L': dict(hand=(0.6, 0.12), bend=-0.2), 'R': dict(hand=(0.66, 0.24), bend=0.2)},
        legs={'L': dict(foot=(-0.5, 1.0)), 'R': dict(foot=(0.2, 1.0))})
    for yy in (320, 362):
        cv.line([(350, yy), (330, yy)], width=3)
    cv.save(path)


# ---- s2-3 メッセージのへんじをわすれた
def phone_in(cv, side='R', dx=6, dy=-46, screen='ai2'):
    def f(p):
        h = p.hand(side)
        phone(cv, h[0] + dx, h[1] + dy, 56, 94, rot=6, screen=screen)
    return f


TYPE_ARMS = {'L': dict(hand=(0.74, 0.3), bend=-0.2, handshape='point', pdir=(0.6, -0.8), front=True),
             'R': dict(hand=(0.8, 0.44), bend=0.3)}


def ch_s2_3_a(path):   # ごまかす: スマホを指さして言いわけ
    cv = cbase(241)
    kid(cv, 250, KG, KH, facing='r', eyes='dot', look=(-0.1, -0.02), brows='worry', mouth='talk',
        arms={'L': dict(hand=(0.8, 0.0), bend=-0.3, handshape='point', pdir=(1, 0.2), front=True),
              'R': dict(hand=(0.95, 0.35), bend=0.3)}, pf=phone_in(cv, screen='gray'), extras=('sweat2', 'speech'))
    cv.save(path)


def ch_s2_3_b(path):   # 正直に書く: 打つ＋吹き出し1つ
    cv = cbase(242)
    kid(cv, 210, KG, KH, facing='r', eyes='dot', look=(0.04, 0.06), mouth='line', arms=TYPE_ARMS, pf=phone_in(cv))
    bubble(cv, 470, 120, 112, 62, kind='round', tail=(-0.8, 0.6), content='dash')
    cv.save(path)


def ch_s2_3_c(path):   # そのまま: スマホを伏せて背を向ける
    cv = cbase(243)
    desk(cv, 60, 250, 320, CF + 70, depth=34)
    phone(cv, 155, 296, 84, 30, face_down=True)
    kid(cv, 440, KG, KH, facing='back', arms={'L': dict(hand=(-0.15, 0.75)), 'R': dict(hand=(0.15, 0.75))})
    cv.save(path)


def ch_s2_3_d(path):   # あやまって、あそべる日をつたえる: 吹き出し2つ（ハート・丸）
    cv = cbase(244)
    kid(cv, 200, KG, KH, facing='r', eyes='dot', look=(0.04, 0.06), mouth='smile', arms=TYPE_ARMS, pf=phone_in(cv))
    bubble(cv, 470, 92, 96, 54, kind='round', tail=(-0.8, 0.6), content='heart')
    bubble(cv, 500, 236, 110, 58, kind='round', tail=(-0.9, 0.4), content='dash')
    cv.save(path)


# ---- s3-1 しあいでまけた
def ch_s3_1_a(path):   # どうぐをなげて、どなる（人はたたかない）
    cv = cbase(251)
    ball(cv, 500, 430, 36, 'soccer')
    for k in range(3):
        cv.line(ell(450 - k * 52, 410, 30, 32 - k * 7, 190, 350, n=8), width=3)
    kid(cv, 230, KG, KH, facing='r', eyes='squeeze', brows='angry', mouth='shout', red=True,
        arms={'L': dict(hand=(-0.3, 0.6), handshape='fist'), 'R': dict(hand=(0.75, 0.1), bend=0.3)},
        extras=('anger',))
    for a in (-30, -10, 10, 30):
        ang = math.radians(a)
        cv.line([(310 + 40 * math.cos(ang), 150 + 40 * math.sin(ang)),
                 (310 + 84 * math.cos(ang), 150 + 84 * math.sin(ang))], width=4, color='red')
    cv.save(path)


def ch_s3_1_b(path):   # 「くやしい」とことばでいう: 胸に手を当てて話す
    cv = cbase(252)
    partner(cv, 'nakama', 510, H=AH * 0.9)
    kid(cv, 240, KG, KH, facing='r', eyes='dot', brows='worry', mouth='talk',
        arms={'L': dict(hand=(0.46, 0.4), bend=-0.4, front=True), 'R': dict(hand=(0.1, 0.8))},
        extras=('speech',))
    cv.save(path)


def ch_s3_1_c(path):   # だまってひとりでかえる: グラウンドに背を向けて歩く
    cv = cbase(253)
    for xx in range(-10, CW + 20, 40):
        cv.line([(xx, 210), (xx, CF)], width=3, color='kinink', amp=0.3)
    cv.line([(-10, 236), (CW + 10, 236)], width=4, color='kinink')
    cv.line([(30, 120), (30, CF)], width=7)
    cv.line([(30, 120), (200, 120), (200, CF)], width=7)
    for k in range(1, 4):
        cv.line([(30 + k * 42, 124), (30 + k * 42, CF)], width=2, color='gray')
    kid(cv, 440, KG, KH, facing='back',
        arms={'L': dict(hand=(-0.15, 0.75)), 'R': dict(hand=(0.15, 0.75))},
        legs={'L': (-0.25, 1.0), 'R': (0.2, 0.96)})
    cv.save(path)


def ch_s3_1_d(path):   # 3びょうまって、気持ちをしずめる: 目をとじて息をはく＋肩をたたくなかま
    cv = cbase(254)
    kid(cv, 290, KG, KH, facing='r', eyes='closed', mouth='blow',
        arms={'L': dict(hand=(-0.1, 0.8)), 'R': dict(hand=(0.1, 0.8))}, extras=('breath',))
    person(cv, 'nakama', 120, AG, AH * 0.9, facing='r', eyes='happy', mouth='smile',
           arms={'R': dict(hand=(1.12, -0.05), bend=0.4, front=True), 'L': dict(hand=(-0.1, 0.8))})
    cv.save(path)


# ---- s3-2 からかわれた
def ch_s3_2_a(path):   # 強い指で打つ＋とげとげ吹き出し
    cv = cbase(261)
    kid(cv, 210, KG, KH, facing='r', eyes='squeeze', brows='angry', mouth='tight', red=True,
        arms={'L': dict(hand=(0.76, 0.22), bend=-0.2, handshape='point', pdir=(0.7, 0.7), front=True),
              'R': dict(hand=(0.8, 0.44), bend=0.3)}, pf=phone_in(cv), extras=('anger',))
    for a in (-60, -20, 20):
        ang = math.radians(a)
        cv.line([(350 + 30 * math.cos(ang), 300 + 30 * math.sin(ang)),
                 (350 + 54 * math.cos(ang), 300 + 54 * math.sin(ang))], width=3.5, color='red')
    bubble(cv, 490, 120, 112, 84, kind='spiky', content='none', fill='akane2', lwm=0.9)
    for k in range(3):
        cv.line([(456 + k * 30, 108), (468 + k * 30, 132)], width=5, color='kinari')
    cv.save(path)


def ch_s3_2_b(path):   # まるい吹き出しをおくる
    cv = cbase(262)
    kid(cv, 210, KG, KH, facing='r', eyes='dot', mouth='line', look=(0.04, 0.06), arms=TYPE_ARMS, pf=phone_in(cv))
    bubble(cv, 480, 126, 104, 66, kind='round', tail=(-0.8, 0.6), content='dots')
    for k in range(4):
        cv.dot(372 + k * 16, 250 - k * 20, 4, color='kinink')
    cv.save(path)


def ch_s3_2_c(path):   # ひざをかかえてすわる
    cv = cbase(263)
    gx, gy, H = 300, 450, KH

    def knees(p):
        # shins + knees in front of the body, arms wrapped around
        o = p.o
        cv.shape(ell(gx, gy - 0.16 * H, 0.52 * H, 0.2 * H, n=40), fill=o['pants'])
        for s in (-1, 1):
            kx = gx + s * 0.2 * H
            cv.tube([(kx, gy - 1.05 * H), (kx + s * 0.1 * H, gy - 0.08 * H)], 0.28 * H, o['pants'])
            cv.shape(ell(kx + s * 0.14 * H, gy - 0.02 * H, 0.2 * H, 0.1 * H, n=24), fill='sumi', lw=cv.lw * 0.8)
        cv.tube([(gx - 0.42 * H, gy - 1.35 * H), (gx - 0.36 * H, gy - 0.8 * H), (gx, gy - 0.72 * H)], 0.2 * H, o['top'])
        cv.tube([(gx + 0.42 * H, gy - 1.35 * H), (gx + 0.36 * H, gy - 0.8 * H), (gx, gy - 0.72 * H)], 0.2 * H, o['top'])
        cv.shape(ell(gx - 0.05 * H, gy - 0.72 * H, 0.1 * H, 0.1 * H, n=16), fill='skin', lw=cv.lw * 0.8)
        cv.shape(ell(gx + 0.07 * H, gy - 0.74 * H, 0.1 * H, 0.1 * H, n=16), fill='skin', lw=cv.lw * 0.8)
    cv.shadow(gx, gy + 4, 110, 14, alpha=0.22)
    kid(cv, gx, gy + 0.55 * H, H, facing='front', eyes='down', brows='worry', mouth='frown', sit=True,
        look=(0, 0.06), head_drop=0.08,
        legs={'L': (-0.2, 0.05), 'R': (0.2, 0.05)},
        arms={'L': dict(hand=(0.05, 0.4), handshape='none', behind=True),
              'R': dict(hand=(-0.05, 0.4), handshape='none', behind=True)}, pf=knees)
    phone(cv, 480, 440, 42, 70, rot=80)
    cv.save(path)


def ch_s3_2_d(path):   # スマホを伏せて、大人に話す
    cv = cbase(264)
    desk(cv, 30, 200, 330, CF + 70, depth=34)
    phone(cv, 115, 306, 84, 30, face_down=True)
    partner(cv, 'otona', 540, 'nikko')
    kid(cv, 330, KG, KH * 0.95, facing='r', eyes='dot', brows='worry', mouth='talk',
        arms={'L': dict(hand=(-0.1, 0.8)), 'R': dict(hand=(0.4, 0.35), bend=0.4)}, extras=('speech',))
    cv.save(path)


JOBS = {
    'scene-s1-1': scene_s1_1, 'scene-s1-2': scene_s1_2, 'scene-s2-1': scene_s2_1, 'scene-s2-2': scene_s2_2,
    'scene-s2-3': scene_s2_3, 'scene-s3-1': scene_s3_1, 'scene-s3-2': scene_s3_2,
    'choice-s1-1-a': ch_s1_1_a, 'choice-s1-1-b': ch_s1_1_b, 'choice-s1-1-c': ch_s1_1_c, 'choice-s1-1-d': ch_s1_1_d,
    'choice-s1-2-a': ch_s1_2_a, 'choice-s1-2-b': ch_s1_2_b, 'choice-s1-2-c': ch_s1_2_c, 'choice-s1-2-d': ch_s1_2_d,
    'choice-s2-1-a': ch_s2_1_a, 'choice-s2-1-b': ch_s2_1_b, 'choice-s2-1-c': ch_s2_1_c, 'choice-s2-1-d': ch_s2_1_d,
    'choice-s2-2-a': ch_s2_2_a, 'choice-s2-2-b': ch_s2_2_b, 'choice-s2-2-c': ch_s2_2_c, 'choice-s2-2-d': ch_s2_2_d,
    'choice-s2-3-a': ch_s2_3_a, 'choice-s2-3-b': ch_s2_3_b, 'choice-s2-3-c': ch_s2_3_c, 'choice-s2-3-d': ch_s2_3_d,
    'choice-s3-1-a': ch_s3_1_a, 'choice-s3-1-b': ch_s3_1_b, 'choice-s3-1-c': ch_s3_1_c, 'choice-s3-1-d': ch_s3_1_d,
    'choice-s3-2-a': ch_s3_2_a, 'choice-s3-2-b': ch_s3_2_b, 'choice-s3-2-c': ch_s3_2_c, 'choice-s3-2-d': ch_s3_2_d,
}


def contact_sheet():
    pad = 16
    scenes = [k for k in JOBS if k.startswith('scene')]
    choices = [k for k in JOBS if k.startswith('choice')]
    tw_s, th_s = 384, 216
    tw_c, th_c = 192, 144
    W = pad + 4 * (tw_c + pad) * 2
    rows_s = math.ceil(len(scenes) / 4)
    rows_c = math.ceil(len(choices) / 8)
    W = max(pad + 4 * (tw_s + pad), pad + 8 * (tw_c + pad))
    Hh = pad + rows_s * (th_s + pad) + pad + rows_c * (th_c + pad)
    sheet = Image.new('RGB', (W, Hh), C['ai'])
    for i, k in enumerate(scenes):
        im = Image.open(os.path.join(OUT, k + '.png')).resize((tw_s, th_s), Image.LANCZOS)
        sheet.paste(im, (pad + (i % 4) * (tw_s + pad), pad + (i // 4) * (th_s + pad)))
    y0 = pad + rows_s * (th_s + pad) + pad
    for i, k in enumerate(choices):
        im = Image.open(os.path.join(OUT, k + '.png')).resize((tw_c, th_c), Image.LANCZOS)
        sheet.paste(im, (pad + (i % 8) * (tw_c + pad), y0 + (i // 8) * (th_c + pad)))
    p = os.path.join(HERE, 'sheet-scenes.png')
    sheet.save(p, optimize=True)
    return p


def main(argv):
    os.makedirs(OUT, exist_ok=True)
    if '--sheet' in argv:
        print(contact_sheet()); return
    flt = [a for a in argv if not a.startswith('-')]
    n = 0
    for name, fn in JOBS.items():
        if flt and not any(f in name for f in flt):
            continue
        fn(os.path.join(OUT, name + '.png'))
        n += 1
        print('drew', name)
    if not flt:
        print(contact_sheet())
    print(n, 'files')


if __name__ == '__main__':
    main(sys.argv[1:])
