#!/usr/bin/env python3
"""Builds the static site in site/ (Arabic at /, English at /en/). Run: python3 scripts/build-site.py

The privacy text is read from docs/store/privacy-policy.md so there is a single source for it
(the Play Console form and the website must say the same thing).
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
CONTACT_EMAIL = "zwnt45602@gmail.com"  # also written in docs/store/privacy-policy.md
SITE_URL = "https://lughati-sigma.vercel.app"  # change when a custom domain is connected, then rebuild
PATH_AR_HOME, PATH_EN_HOME = "/", "/en"  # no trailing slash except the root (vercel.json: trailingSlash=false)

ICONS = {
    "globe": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
    "book": '<path d="M4 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-5a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h5z"/>',
    "repeat": '<path d="M4 9a8 8 0 0 1 14-3l2 2M20 4v4h-4M20 15a8 8 0 0 1-14 3l-2-2M4 20v-4h4"/>',
    "flame": '<path d="M13.5 2s.9 3.1-1.3 5.6C10.4 9.7 8 11 8 14.5A4 4 0 0 0 12 18.5a4 4 0 0 0 4-4c0-1.6-.8-2.7-.8-2.7s2.8 1 2.8 4.7A6 6 0 0 1 12 22.5a6.5 6.5 0 0 1-6.5-6.5c0-5.6 4.9-7.4 6.4-10.5.6-1.3 1.6-3.5 1.6-3.5z"/>',
    "rtl": '<path d="M4 6h16M4 12h10M4 18h16M20 10l-3 2 3 2"/>',
    "moon": '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
    "wifi": '<path d="M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0"/><path d="M3 3l18 18"/>',
    "shield": '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    "check": '<path d="M5 12l5 5 9-10"/>',
}


def icon(name, size=24):
    return f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">{ICONS[name]}</g></svg>'


T = {
    "ar": {
        "lang": "ar", "dir": "rtl", "base": "", "other": "/en", "other_label": "English", "other_code": "en",
        "title": "لغتي: تعلّم اللغات بلغتك",
        "desc": "لغتي تطبيق لتعلّم الألمانية والإنجليزية والإسبانية والفرنسية والتركية للناطقين بالعربية: دروس قصيرة ومراجعة ذكية، يعمل دون إنترنت وبلا إعلانات.",
        "nav": [("#features", "المزايا"), ("#how", "كيف يعمل"), ("/privacy", "الخصوصية")],
        "eyebrow": "لتعلّم اللغات بالعربية",
        "h1": "تعلّم لغة جديدة بلغتك أنت",
        "lead": "اختر لغتك واللغة التي تريد تعلّمها. دروس قصيرة، تمارين بعد كل درس، ومراجعة للكلمات في وقتها حتى لا تنساها.",
        "soon": "قريباً على Google Play", "soon_note": "التطبيق قيد التجهيز للنشر. لم يُطرح في المتجر بعد.",
        "more": "تعرّف على المزايا",
        "illu": "الصور أعلاه رسوم توضيحية لشاشات التطبيق، وليست لقطات شاشة من المتجر.",
        "f_h": "ما الذي ستجده في التطبيق", "f_sub": "كل ما يلي موجود في النسخة الحالية.",
        "features": [
            ("globe", "ست لغات", "العربية والألمانية والإنجليزية والإسبانية والفرنسية والتركية. اختر لغتك الأم ولغة التعلّم بحرية.", False),
            ("book", "عشرة دروس لكل لغة", "دروس المستوى A1 بكلمات وعبارات يومية، وبعد كل درس تمارين قصيرة. تنجح عند 70% من الإجابات الصحيحة.", False),
            ("repeat", "مراجعة ذكية", "الكلمات التي تعلّمتها تعود إليك بعد يوم ثم ثلاثة أيام ثم أسبوع وهكذا، حسب مدى تذكّرك لها.", True),
            ("flame", "سلسلة أيام", "تابع أيام تعلّمك المتتالية وهدفك اليومي بالدقائق، لتبقى على العادة.", False),
            ("rtl", "عربي بالكامل", "واجهة عربية من اليمين إلى اليسار بخط واضح، مع نسخة إنجليزية.", False),
            ("moon", "فاتح وداكن", "مظهر فاتح وداكن بتباين مفحوص ليبقى النص مقروءاً.", False),
            ("wifi", "دون إنترنت", "كل الدروس والتمارين على جهازك، فتتعلّم في أي مكان.", False),
            ("shield", "خصوصية وبلا إعلانات", "لا إعلانات ولا تتبّع، ولا تغادر بياناتك جهازك.", False),
        ],
        "h_how": "كيف يعمل", "how_sub": "ثلاث خطوات.",
        "steps": [("اختر لغاتك", "لغتك الأم ثم اللغة التي تريد تعلّمها."), ("ابدأ درساً", "كلمات وعبارات مع معانيها بلغتك، ثم تمارين قصيرة."), ("راجع كلماتك", "تعود إليك الكلمات في الوقت المناسب، وتتابع تقدّمك وسلسلة أيامك.")],
        "status_h": "حالة المشروع",
        "status": "هذه نسخة مبكرة: مستوى A1 فقط حالياً، وتسجيل الدخول تجريبي والبيانات محفوظة على جهازك فقط. مستويات أخرى وميزات إضافية في الخطة، دون وعد بموعد محدد.",
        "footer_priv": "سياسة الخصوصية", "contact": "التواصل",
        "rights": "© 2026 لغتي",
        "skip": "تخطَّ إلى المحتوى",
        # mockups
        "m": {"hi": "مرحباً، سارة", "tag": "يوم جميل لكلمات جديدة", "streak": "3 أيام", "lang": "الألمانية", "change": "تغيير", "cont": "تابع التعلّم",
              "lesson": "الأرقام", "meta": "A1 · 8 دقائق", "rec": "مقترح لك", "rectxt": "لديك 6 كلمات للمراجعة.", "goal": "5 من 15 دقيقة",
              "learn": "تعلّم", "learntitle": "دروس الألمانية", "l1": ("التحيات واللباقة", "قل مرحباً واشكر واعتذر بأدب."), "l2": ("التعريف بالنفس", "قدّم نفسك واسأل عن حال الآخرين."), "l3": ("الأرقام", "عدّ من 1 إلى 5 وقل 10."),
              "review": "المراجعة", "due": "6 كلمات مستحقة", "word": "الكلمة", "meaning": "المعنى", "apfel": "التفاحة",
              "o": [("أعِد", "الآن"), ("صعبة", "بعد يوم"), ("جيدة", "بعد يوم"), ("سهلة", "بعد 3 أيام")],
              "tabs": ["الرئيسية", "تعلّم", "المراجعة", "التقدم", "حسابي"]},
        "priv_title": "سياسة الخصوصية", "priv_desc": "ما يحفظه تطبيق لغتي، وأين، وما لا يفعله: يعمل دون إنترنت وتبقى بياناتك على جهازك، بلا إعلانات ولا تتبّع.", "priv_back": "العودة إلى الصفحة الرئيسية", "priv_marker": "## العربية",
    },
    "en": {
        "lang": "en", "dir": "ltr", "base": "/en", "other": "/", "other_label": "العربية", "other_code": "ar",
        "title": "Lughati: learn languages in your own language",
        "desc": "Lughati helps Arabic speakers learn German, English, Spanish, French and Turkish with short lessons and smart review. Works offline, no ads.",
        "nav": [("#features", "Features"), ("#how", "How it works"), ("/en/privacy", "Privacy")],
        "eyebrow": "Language learning, in Arabic first",
        "h1": "Learn a new language, in your own language",
        "lead": "Pick your language and the one you want to learn. Short lessons, exercises after each lesson, and word review at the right moment so you keep what you learn.",
        "soon": "Coming soon to Google Play", "soon_note": "The app is being prepared for release. It is not in the store yet.",
        "more": "See the features",
        "illu": "The images above are illustrations of the app screens, not store screenshots.",
        "f_h": "What is in the app", "f_sub": "Everything below is in the current version.",
        "features": [
            ("globe", "Six languages", "Arabic, German, English, Spanish, French and Turkish. Choose your own language and the one you learn.", False),
            ("book", "Ten lessons per language", "A1 lessons with everyday words and phrases, and short exercises after each. You pass at 70% correct answers.", False),
            ("repeat", "Smart review", "Words you learned come back after a day, then three days, then a week and so on, depending on how well you remember them.", True),
            ("flame", "Daily streak", "Follow your streak of study days and your daily goal in minutes to keep the habit.", False),
            ("rtl", "Fully Arabic", "A right-to-left Arabic interface in a clear typeface, with an English version.", False),
            ("moon", "Light and dark", "Light and dark themes with checked contrast so text stays readable.", False),
            ("wifi", "Works offline", "All lessons and exercises are on your device, so you can learn anywhere.", False),
            ("shield", "Private, no ads", "No ads and no tracking, and your data never leaves your device.", False),
        ],
        "h_how": "How it works", "how_sub": "Three steps.",
        "steps": [("Choose your languages", "Your own language, then the one you want to learn."), ("Start a lesson", "Words and phrases with meanings in your language, then short exercises."), ("Review your words", "Words return at the right time, and you follow your progress and streak.")],
        "status_h": "Project status",
        "status": "This is an early version: A1 only for now, sign-in is a demo and your data is stored only on your device. More levels and features are planned, without a promised date.",
        "footer_priv": "Privacy policy", "contact": "Contact",
        "rights": "© 2026 Lughati",
        "skip": "Skip to content",
        "m": {"hi": "Hello, Sara", "tag": "A good day for new words", "streak": "3 days", "lang": "German", "change": "Change", "cont": "Continue learning",
              "lesson": "Numbers", "meta": "A1 · 8 min", "rec": "Recommended for you", "rectxt": "You have 6 words to review.", "goal": "5 of 15 minutes",
              "learn": "Learn", "learntitle": "German lessons", "l1": ("Greetings and politeness", "Say hello, thank people and apologise politely."), "l2": ("Introducing yourself", "Introduce yourself and ask how others are."), "l3": ("Numbers", "Count from 1 to 5 and say 10."),
              "review": "Review", "due": "6 words due", "word": "Word", "meaning": "Meaning", "apfel": "the apple",
              "o": [("Again", "Now"), ("Difficult", "in 1 day"), ("Good", "in 1 day"), ("Easy", "in 3 days")],
              "tabs": ["Home", "Learn", "Review", "Progress", "Profile"]},
        "priv_title": "Privacy policy", "priv_desc": "What the Lughati app stores, where, and what it never does: it works offline, your data stays on your device, with no ads and no tracking.", "priv_back": "Back to home", "priv_marker": "## English",
    },
}


def phones(c):
    m = c["m"]
    tabs = lambda on: '<div class="tabs">' + "".join(f'<span{" class=on" if i == on else ""}>{n}</span>' for i, n in enumerate(m["tabs"])) + "</div>"
    home = f'''<figure class="ph" aria-hidden="true"><div class="sc"><div class="hd"><div class="row"><div><b>{m["hi"]}</b><small>{m["tag"]}</small></div><span class="chip">{m["streak"]}</span></div>
<div class="pill"><span>🇩🇪</span><b>{m["lang"]}</b><em>{m["change"]}</em></div><div class="bar2"><i style="width:33%"></i></div><small>{m["goal"]}</small></div>
<div class="main"><div class="card"><span class="eb">{m["cont"]}</span><h4>{m["lesson"]}</h4><p>{m["meta"]}</p><div class="go">{m["cont"]}</div></div>
<div class="card"><span class="eb">{m["rec"]}</span><p>{m["rectxt"]}</p></div></div>{tabs(0)}</div></figure>'''
    l1, l2, l3 = m["l1"], m["l2"], m["l3"]
    learn = f'''<figure class="ph low" aria-hidden="true"><div class="sc"><div class="hd"><div class="row"><div><small>{m["learn"]}</small><b>{m["learntitle"]}</b></div><span class="chip">1 / 10</span></div><div class="bar2"><i style="width:10%"></i></div></div>
<div class="main flat"><div class="les"><span class="dot ok">✓</span><div><b>{l1[0]}</b><span>{l1[1]}</span></div></div>
<div class="les cur"><span class="dot cu">▶</span><div><b>{l2[0]}</b><span>{l2[1]}</span></div></div>
<div class="les"><span class="dot">3</span><div><b>{l3[0]}</b><span>{l3[1]}</span></div></div></div>{tabs(1)}</div></figure>'''
    o = m["o"]
    cols = ["#B42318", "#B45309", "#0F766E", "#0A4E49"]
    outs = "".join(f'<i style="background:{cols[i]}">{o[i][0]}<small>{o[i][1]}</small></i>' for i in range(4))
    review = f'''<figure class="ph third" aria-hidden="true"><div class="sc"><div class="hd"><div class="row"><div><small>{m["review"]}</small><b>{m["due"]}</b></div><span class="chip">2 / 6</span></div><div class="bar2"><i style="width:33%"></i></div></div>
<div class="main flat"><div class="card word"><span class="eb">{m["word"]}</span><h4 dir="ltr">der Apfel</h4><span class="eb">{m["meaning"]}</span><h4 style="color:#0F766E">{m["apfel"]}</h4></div><div class="outs">{outs}</div></div>{tabs(2)}</div></figure>'''
    return home + learn + review


def page_head(c, title, desc, path_ar, path_en, self_path):
    return f'''<!doctype html>
<html lang="{c["lang"]}" dir="{c["dir"]}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<meta name="theme-color" content="#0A4E49">
<link rel="canonical" href="{SITE_URL}{self_path}">
<link rel="alternate" hreflang="ar" href="{SITE_URL}{path_ar}">
<link rel="alternate" hreflang="en" href="{SITE_URL}{path_en}">
<link rel="alternate" hreflang="x-default" href="{SITE_URL}{path_ar}">
<meta property="og:type" content="website">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{SITE_URL}{self_path}">
<meta property="og:locale" content="{"ar_AR" if c["lang"] == "ar" else "en_US"}">
<meta property="og:site_name" content="{"لغتي · Lughati"}">
<meta property="og:image" content="{SITE_URL}/assets/og-image.png">
<meta name="twitter:image" content="{SITE_URL}/assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<link rel="preload" href="/assets/fonts/Cairo_700Bold.ttf" as="font" type="font/ttf" crossorigin>
<link rel="stylesheet" href="/assets/style.css">
</head>'''


def header(c, home_path):
    nav = "".join(f'<a href="{(home_path + h) if h.startswith("#") else h}">{t}</a>' for h, t in c["nav"])
    return f'''<header class="top"><div class="wrap"><div class="bar">
<a class="brand" href="{home_path}"><img src="/assets/icon.png" width="40" height="40" alt=""><span>{"لغتي" if c["lang"] == "ar" else "Lughati"}</span></a>
<nav class="nav" aria-label="{"التنقل" if c["lang"] == "ar" else "Main"}">{nav}<a class="lang" href="{c["other"]}" hreflang="{c["other_code"]}" lang="{c["other_code"]}">{c["other_label"]}</a></nav></div>'''


def footer(c, home_path, priv):
    return f'''<footer><div class="wrap"><div class="cols"><div>{c["rights"]}</div>
<ul><li><a href="{priv}">{c["footer_priv"]}</a></li><li><span>{c["contact"]}: <a href="mailto:{CONTACT_EMAIL}">{CONTACT_EMAIL}</a></span></li><li><a href="{c["other"]}" hreflang="{c["other_code"]}" lang="{c["other_code"]}">{c["other_label"]}</a></li></ul></div></div></footer></body></html>
'''


def landing(k):
    c = T[k]
    home = c["base"] or "/"
    priv = (c["base"] or "") + "/privacy"
    ar_path, en_path = PATH_AR_HOME, PATH_EN_HOME
    feats = "".join(f'<div class="feat{" g" if g else ""}"><span class="ic">{icon(i)}</span><h3>{t}</h3><p>{d}</p></div>' for i, t, d, g in c["features"])
    steps = "".join(f"<li><h3>{t}</h3><p>{d}</p></li>" for t, d in c["steps"])
    ld = '{"@context":"https://schema.org","@type":"MobileApplication","name":"%s","operatingSystem":"Android","applicationCategory":"EducationalApplication","description":"%s","inLanguage":["ar","en"]}' % ("لغتي (Lughati)", c["desc"].replace('"', "'"))
    return page_head(c, c["title"], c["desc"], ar_path, en_path, home) + f'''
<body>
<a class="skip" href="#main">{c["skip"]}</a>
{header(c, home)}
<div class="hero"><div><span class="eyebrow">{c["eyebrow"]}</span><h1>{c["h1"]}</h1><div class="swoosh" aria-hidden="true"></div><p class="lead">{c["lead"]}</p>
<div class="cta-row"><span class="btn soon" role="note">{c["soon"]}</span><a class="btn ghost" href="#features">{c["more"]}</a></div><p class="soon-note">{c["soon_note"]}</p></div>
<div><div class="phones">{phones(c)}</div><p class="illu">{c["illu"]}</p></div></div></div></header>
<main id="main">
<section id="features"><div class="wrap"><h2>{c["f_h"]}</h2><p class="sub">{c["f_sub"]}</p><div class="grid">{feats}</div></div></section>
<section id="how" style="padding-top:0"><div class="wrap"><h2>{c["h_how"]}</h2><p class="sub">{c["how_sub"]}</p><ol class="steps">{steps}</ol></div></section>
<section style="padding-top:0"><div class="wrap"><div class="status"><h2>{c["status_h"]}</h2><p>{c["status"]}</p></div></div></section>
</main>
<script type="application/ld+json">{ld}</script>
''' + footer(c, home, priv)


def inline(text):
    text = html.escape(text)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    return text


def privacy(k):
    c = T[k]
    md = (ROOT / "docs/store/privacy-policy.md").read_text(encoding="utf-8")
    other_marker = T["en" if k == "ar" else "ar"]["priv_marker"]
    body = md.split(c["priv_marker"], 1)[1].split(other_marker, 1)[0] if k == "ar" else md.split(c["priv_marker"], 1)[1]
    updated = re.search(r"آخر تحديث: ([\d-]+)", md).group(1)
    out, in_list = [], False
    for line in body.strip().splitlines():
        line = line.rstrip()
        if line.startswith("- "):
            if not in_list:
                out.append("<ul>")
                in_list = True
            out.append(f"<li>{inline(line[2:])}</li>")
            continue
        if in_list:
            out.append("</ul>")
            in_list = False
        if not line:
            continue
        piece = inline(line).replace(CONTACT_EMAIL, f'<a href="mailto:{CONTACT_EMAIL}" dir="ltr">{CONTACT_EMAIL}</a>')
        m = re.match(r"<strong>(.+?)</strong>:?\s*(.*)", piece)
        if m and m.group(1).rstrip(":").strip() and not piece.startswith("<strong>") is False and len(m.group(1)) < 40:
            rest = m.group(2)
            if rest[:1].isalpha() and rest[:1].isascii():
                rest = rest[:1].upper() + rest[1:]  # "Label: only on…" becomes a sentence of its own
            out.append(f"<h2>{m.group(1).rstrip(':')}</h2><p>{rest}</p>" if rest else f"<h2>{m.group(1).rstrip(':')}</h2>")
        else:
            out.append(f"<p>{piece}</p>")
    if in_list:
        out.append("</ul>")
    home = c["base"] or "/"
    priv = (c["base"] or "") + "/privacy"
    last = "آخر تحديث" if k == "ar" else "Last updated"
    return page_head(c, c["priv_title"] + (" · لغتي" if k == "ar" else " · Lughati"), c["priv_desc"], "/privacy", "/en/privacy", priv) + f'''
<body>
<a class="skip" href="#main">{c["skip"]}</a>
{header(c, home)}</div></header>
<main id="main"><article class="prose"><h1>{c["priv_title"]}</h1><p class="meta">{last}: {updated}</p>
{"".join(out)}
<p><a href="{home}">{c["priv_back"]}</a></p></article></main>
''' + footer(c, home, priv)


def not_found():
    c = T["ar"]
    return page_head(c, "الصفحة غير موجودة · Page not found", "الصفحة غير موجودة", "/", "/en", "/404") + '''
<body>
<main id="main" class="prose" style="text-align:center;padding-block:96px">
<h1>الصفحة غير موجودة</h1><p>تأكد من الرابط أو عد إلى <a href="/">الصفحة الرئيسية</a>.</p>
<h1 lang="en" dir="ltr" style="font-size:28px;margin-top:40px">Page not found</h1><p lang="en" dir="ltr">Check the link or go back to the <a href="/en">home page</a>.</p>
</main></body></html>
'''


def sitemap():
    pages = [("/", "/en"), ("/en", "/"), ("/privacy", "/en/privacy"), ("/en/privacy", "/privacy")]
    alt = {"/": ("/", "/en"), "/en": ("/", "/en"), "/privacy": ("/privacy", "/en/privacy"), "/en/privacy": ("/privacy", "/en/privacy")}
    rows = []
    for path, _ in pages:
        ar, en = alt[path]
        rows.append(f"<url><loc>{SITE_URL}{path}</loc><xhtml:link rel=\"alternate\" hreflang=\"ar\" href=\"{SITE_URL}{ar}\"/><xhtml:link rel=\"alternate\" hreflang=\"en\" href=\"{SITE_URL}{en}\"/></url>")
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' + "\n".join(rows) + "\n</urlset>\n"


def check(pages):
    """Fails the build on the defects found in review: broken sentences and relative SEO URLs."""
    for name, text in pages.items():
        bad = re.findall(r"</h2><p>([a-z])", text)
        assert not bad, f"{name}: a paragraph after a heading starts with a lowercase letter"
        if name.endswith(".html") and name != "404.html":
            assert f'rel="canonical" href="{SITE_URL}' in text, f"{name}: canonical must be absolute"
            assert f'og:image" content="{SITE_URL}' in text, f"{name}: og:image must be absolute"


def main():
    (SITE / "en").mkdir(parents=True, exist_ok=True)
    pages = {
        "index.html": landing("ar"),
        "en/index.html": landing("en"),
        "privacy.html": privacy("ar"),
        "en/privacy.html": privacy("en"),
        "404.html": not_found(),
    }
    check(pages)
    for name, text in pages.items():
        (SITE / name).write_text(text, encoding="utf-8")
    (SITE / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")
    (SITE / "sitemap.xml").write_text(sitemap(), encoding="utf-8")
    print("built", sorted(p.relative_to(SITE).as_posix() for p in SITE.rglob("*.html")))


if __name__ == "__main__":
    main()
