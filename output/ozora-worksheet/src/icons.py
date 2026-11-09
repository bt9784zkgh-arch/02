# -*- coding: utf-8 -*-
# 手描き風アイコン（線は少しゆらす）。viewBox 0 0 100 100
INK = "#2d3b4e"

def svg(body, size=None, vb="0 0 100 100", cls="ico"):
    s = f' width="{size}" height="{size}"' if size else ""
    return (f'<svg class="{cls}" viewBox="{vb}"{s} xmlns="http://www.w3.org/2000/svg" '
            f'fill="none" stroke="{INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">{body}</svg>')

ICONS = {
    "bird": '<path d="M14 52c6-10 20-12 30-6 4 2 6 6 8 4 2-6 6-9 12-9 4 0 7 3 8 6l6 2-6 3c-1 8-6 15-14 19l2 12-8-1-1-9c-12 3-26-2-33-12-3-4-6-6-4-9z" fill="#dbe8f7"/>'
            '<path d="M46 47c-2-14 8-30 26-34-5 9-6 18-3 27" fill="#dbe8f7"/><circle cx="66" cy="48" r="1.8" fill="#2d3b4e" stroke="none"/>',
    "hello": '<circle cx="50" cy="52" r="30" fill="#fde9c9"/><path d="M38 47v.5M62 47v.5" stroke-width="5"/><path d="M38 61c6 7 18 7 24 0"/><path d="M78 20c4 3 6 7 6 12M84 14c6 5 9 11 9 18"/>',
    "letter": '<path d="M16 30l68-2 1 44-69 2z" fill="#fff6e2"/><path d="M17 31l33 25 34-27"/><path d="M17 73l24-21M84 71L60 51"/>',
    "thermo": '<path d="M43 18c0-6 14-6 14 0v44a15 15 0 1 1-14 0z" fill="#fff"/><path d="M50 36v34" stroke="#d9563b" stroke-width="7"/><circle cx="50" cy="73" r="8" fill="#d9563b" stroke="none"/><path d="M62 28h8M62 38h6M62 48h8"/>',
    "game": '<path d="M20 42c4-8 12-9 18-6h24c6-3 14-2 18 6l5 20c2 8-7 13-13 7l-8-8H36l-8 8c-6 6-15 1-13-7z" fill="#e3ecf8"/><path d="M33 46v12M27 52h12"/><circle cx="66" cy="48" r="2.5" fill="#2d3b4e"/><circle cx="73" cy="55" r="2.5" fill="#2d3b4e"/>',
    "phone": '<rect x="30" y="12" width="40" height="76" rx="7" fill="#eef3f8"/><path d="M44 19h12"/><circle cx="50" cy="80" r="3"/><path d="M37 32h26v18H37z" fill="#fff"/><path d="M37 32l13 10 13-10"/>',
    "ice": '<path d="M8 50h84" stroke="#3f6fb0"/><path d="M34 50l10-22 8 6 10-14 10 30z" fill="#fff"/><path d="M26 50l-6 18 18 16 28-2 14-18-6-14z" fill="#cfe1f5"/>',
    "me": '<circle cx="50" cy="30" r="13" fill="#fde9c9"/><path d="M28 86c0-20 10-32 22-32s22 12 22 32" fill="#fcefe2"/><path d="M50 62v10M44 68l6 5 6-5"/>',
    "cloud": '<path d="M26 62c-10 0-12-16 0-17 1-12 18-16 24-6 4-8 20-6 20 6 12 0 12 17 0 17z" fill="#eef3f8"/><path d="M34 72l-4 9M50 72l-4 9M66 72l-4 9" stroke="#3f6fb0"/>',
    "heart": '<path d="M50 82C24 64 14 50 18 36c4-12 20-14 32-2 12-12 28-10 32 2 4 14-6 28-32 46z" fill="#fbe1dc"/><path d="M24 52h14l5-10 7 20 6-14 4 4h16" stroke="#d9563b"/>',
    "home": '<path d="M16 50L50 20l34 30" /><path d="M24 44v38h52V44" fill="#fff6e2"/><path d="M43 82V62h14v20"/>',
    "eye": '<path d="M10 50c18-26 62-26 80 0-18 26-62 26-80 0z" fill="#fff"/><circle cx="50" cy="50" r="12" fill="#cfe1f5"/><circle cx="50" cy="50" r="4" fill="#2d3b4e"/>',
    "hand": '<path d="M34 84c-8-8-12-18-12-28l1-14c1-5 8-5 8 0v10V24c0-6 8-6 8 0v24-30c0-6 8-6 8 0v30-26c0-6 8-6 8 0v28-18c0-6 8-6 8 0v30c0 14-6 22-14 30z" fill="#fde9c9"/>',
    # ステップのしゅるい
    "よむ": '<path d="M50 28c-10-6-24-8-36-6v52c12-2 26 0 36 6 10-6 24-8 36-6V22c-12-2-26 0-36 6z" fill="#fff"/><path d="M50 28v52"/>',
    "えらぶ": '<circle cx="50" cy="50" r="30" stroke-width="8" stroke="#d9563b"/>',
    "かく": '<path d="M22 78l6-18 42-42 12 12-42 42z" fill="#fff6e2"/><path d="M64 24l12 12M22 78l14-6"/>',
    "はなす": '<path d="M16 26h68v40H46L30 80V66H16z" fill="#fff"/><path d="M30 42h40M30 52h26"/>',
    # かお
    "f1": '<circle cx="50" cy="50" r="40" fill="#fff8d6"/><path d="M36 44v.5M64 44v.5" stroke-width="6"/><path d="M34 60c8 10 24 10 32 0"/>',
    "f2": '<circle cx="50" cy="50" r="40" fill="#f2f2ee"/><path d="M36 44v.5M64 44v.5" stroke-width="6"/><path d="M36 63h28"/>',
    "f3": '<circle cx="50" cy="50" r="40" fill="#e3ecf8"/><path d="M36 46v.5M64 46v.5" stroke-width="6"/><path d="M34 68c8-10 24-10 32 0"/>',
    "a1": '<circle cx="50" cy="50" r="40" fill="#fff8d6"/><path d="M34 44v.5M66 44v.5" stroke-width="6"/><path d="M38 64h24"/>',
    "a2": '<circle cx="50" cy="50" r="40" fill="#fde2c4"/><path d="M30 36l12 6M70 36l-12 6"/><path d="M34 48v.5M66 48v.5" stroke-width="6"/><path d="M38 68c6-5 18-5 24 0"/>',
    "a3": '<circle cx="50" cy="50" r="40" fill="#f9c7bb"/><path d="M28 32l16 10M72 32l-16 10"/><path d="M34 50v.5M66 50v.5" stroke-width="6"/><path d="M36 70c8-8 20-8 28 0"/><path d="M80 18l4-8M88 26l8-4"/>',
    "star": '<path d="M50 12l11 24 26 3-19 18 5 26-23-13-23 13 5-26-19-18 26-3z" fill="#fff"/>',
    "typhoon": '<path d="M50 50m-8 0a8 8 0 1 0 16 0a8 8 0 1 0-16 0" fill="#cfe1f5"/><path d="M58 50c0-20-20-30-36-22M42 50c0 20 20 30 36 22M50 42c20 0 30-20 22-36M50 58c-20 0-30 20-22 36" stroke="#3f6fb0"/>',
    "help": '<path d="M14 80h72" /><path d="M26 76c4-8 14-10 24-8l22 4c6 2 6 8 0 8H28" fill="#fde9c9"/><circle cx="22" cy="70" r="7" fill="#fde9c9"/><path d="M70 22v16M62 30h16" stroke="#d9563b" stroke-width="6"/>',
}

def icon(name, size=None, cls="ico"):
    return svg(ICONS[name], size, cls=cls)

ICONS.update({
    "think": '<path d="M50 14c-16 0-26 11-26 24 0 9 5 15 10 20v10h32V58c5-5 10-11 10-20 0-13-10-24-26-24z" fill="#fff6c8"/><path d="M38 76h24M41 84h18"/><path d="M50 40v12M44 46h12" stroke="#d9a400"/>',
    "people": '<circle cx="36" cy="34" r="11" fill="#fde9c9"/><circle cx="66" cy="38" r="10" fill="#fde9c9"/><path d="M16 84c0-18 9-30 20-30s20 12 20 30" fill="#e3ecf8"/><path d="M48 84c2-16 9-26 18-26s18 10 18 26" fill="#fcefe2"/>',
    "globe": '<circle cx="50" cy="50" r="34" fill="#e3ecf8"/><path d="M16 50h68M50 16c-14 18-14 50 0 68M50 16c14 18 14 50 0 68M24 30h52M24 70h52"/>',
    "pencil": ICONS["かく"],
    "money": '<circle cx="44" cy="54" r="26" fill="#fff1bf"/><circle cx="60" cy="42" r="24" fill="#ffe28a"/><path d="M53 33l7 9 7-9M60 42v14M54 46h12M54 51h12"/>',
    "calendar": '<rect x="18" y="24" width="64" height="58" rx="5" fill="#fff"/><path d="M18 40h64M34 16v14M66 16v14"/><path d="M30 52h8M46 52h8M62 52h8M30 66h8M46 66h8" stroke-width="4"/>',
    "speech": ICONS["はなす"],
    "clock": '<circle cx="50" cy="52" r="32" fill="#fff"/><path d="M50 32v20l14 8"/><path d="M50 22v4M50 78v4M20 52h4M76 52h4"/>',
    "rule": '<path d="M26 16h42l8 8v62H26z" fill="#fff"/><path d="M36 38h30M36 50h30M36 62h20"/><path d="M34 26l3 3 6-6" stroke="#3f8f5f"/>',
    "icecream": '<path d="M36 52l14 36 14-36" fill="#f3d9a6"/><path d="M30 50c-6-18 8-30 20-30s26 12 20 30z" fill="#fbd3df"/><path d="M42 30c3-3 8-3 10 0"/>',
    "seat": '<path d="M30 20v40h40" /><path d="M30 60v22M70 60v22" /><path d="M26 56h50" fill="#e3ecf8"/><rect x="34" y="34" width="34" height="22" rx="4" fill="#e3ecf8"/>',
    "food": '<path d="M16 54h68c0 18-14 28-34 28S16 72 16 54z" fill="#fff6e2"/><path d="M34 44c-2-6 2-10 0-16M50 44c-2-6 2-10 0-16M66 44c-2-6 2-10 0-16" stroke="#9fb0c4"/>',
    "toilet": '<circle cx="34" cy="24" r="8" fill="#f9c7bb"/><path d="M24 38h20l6 26H18z" fill="#f9c7bb"/><circle cx="68" cy="24" r="8" fill="#cfe1f5"/><path d="M58 38h20v28H58z" fill="#cfe1f5"/><path d="M28 64v18M40 64v18M62 66v16M74 66v16"/>',
    "school": '<path d="M14 84V46l36-22 36 22v38z" fill="#fff6e2"/><path d="M40 84V64h20v20"/><circle cx="50" cy="44" r="7" fill="#fff"/><path d="M50 40v4l3 2"/>',
    "stop": '<path d="M34 14h32l20 20v32L66 86H34L14 66V34z" fill="#fbe1dc" stroke="#d9563b"/><path d="M34 50h32" stroke="#d9563b" stroke-width="8"/>',
    "box": '<path d="M18 36l32-14 32 14v36L50 86 18 72z" fill="#f3d9a6"/><path d="M18 36l32 14 32-14M50 50v36"/>',
    "dog": '<path d="M28 44c0-14 10-22 22-22s22 8 22 22v18c0 12-10 20-22 20S28 74 28 62z" fill="#f3d9a6"/><path d="M28 40c-10 0-14 14-8 24M72 40c10 0 14 14 8 24" fill="#c99a62"/><circle cx="42" cy="50" r="2.5" fill="#2d3b4e"/><circle cx="58" cy="50" r="2.5" fill="#2d3b4e"/><path d="M46 62h8l-4 4z" fill="#2d3b4e"/>',
    "ai": '<rect x="22" y="28" width="56" height="46" rx="10" fill="#e3ecf8"/><circle cx="40" cy="50" r="5" fill="#2d3b4e"/><circle cx="60" cy="50" r="5" fill="#2d3b4e"/><path d="M42 64h16M50 28V16M14 46v12M86 46v12"/><circle cx="50" cy="14" r="4" fill="#d9a400"/>',
    "ear": '<path d="M62 70c-4 10-20 14-24 2-2-6 2-10 2-16-8-6-12-14-10-24 3-12 14-18 26-16 14 2 20 16 16 28-2 8-8 12-8 18" fill="#fde9c9"/><path d="M44 40c2-6 12-6 14 2"/>',
    "ruler": '<path d="M12 62l50-50 26 26-50 50z" fill="#fff6c8"/><path d="M28 46l6 6M38 36l8 8M48 26l6 6M58 16l8 8"/>',
    "compass": '<circle cx="50" cy="50" r="34" fill="#fff"/><path d="M50 26l9 24-9 24-9-24z" fill="#f9c7bb"/><path d="M50 50l9 0" /><circle cx="50" cy="50" r="3" fill="#2d3b4e"/>',
    "tv": '<rect x="14" y="28" width="72" height="50" rx="6" fill="#e3ecf8"/><path d="M38 14l12 14 12-14M30 86h40"/><path d="M42 44l16 9-16 9z" fill="#fff"/>',
    "fire": '<path d="M50 86c-18 0-28-12-28-26 0-14 10-20 12-34 8 6 10 14 10 20 4-8 10-16 8-30 14 10 24 26 24 44 0 14-10 26-26 26z" fill="#fbd0b8" stroke="#d9563b"/>',
    "train": '<rect x="24" y="16" width="52" height="58" rx="10" fill="#e3ecf8"/><path d="M24 44h52"/><rect x="32" y="24" width="36" height="14" rx="3" fill="#fff"/><circle cx="36" cy="58" r="4"/><circle cx="64" cy="58" r="4"/><path d="M34 74l-8 12M66 74l8 12"/>',
})
ICONS["fire2"] = ICONS["fire"]
