#!/usr/bin/env python3
"""Sonde SEO des pages publiques FTH. Lancer depuis la racine du site : python3 tools/check-seo.py
Sort en 1 si une règle casse. À relancer après chaque nouvel article."""
import glob, html, json, re, sys
from collections import Counter

BASE = 'https://www.fthadvisory.com/'
UA_MONTHS = 'січня лютого березня квітня травня червня липня серпня вересня жовтня листопада грудня'.split()
EN_MONTHS = 'January February March April May June July August September October November December'.split()

def visible_date(t):
    """'5 квітня 2026' ou '5 April 2026' / 'April 5, 2026' -> '2026-04-05'."""
    w = t.replace(',', '').split()
    if len(w) == 3 and w[0].isdigit(): d, m, y = w
    elif len(w) == 3: m, d, y = w
    else: return t
    months = UA_MONTHS if m in UA_MONTHS else EN_MONTHS
    return f'{y}-{months.index(m) + 1:02d}-{int(d):02d}' if m in months else t
errs = []
pages = {}
for f in sorted(glob.glob('*.html') + glob.glob('blog/*.html')):
    s = open(f, encoding='utf-8').read()
    if re.search(r'<meta name="robots" content="noindex', s):
        continue
    g = lambda p: (m := re.search(p, s, re.S)) and html.unescape(m.group(1))
    pages[f] = p = dict(
        lang=g(r'<html[^>]*lang="([^"]+)"'), title=g(r'<title>(.*?)</title>'),
        desc=g(r'<meta name="description" content="([^"]*)"'),
        can=g(r'<link rel="canonical" href="([^"]+)"'),
        hl=dict(re.findall(r'<link (?=[^>]*rel="alternate")(?=[^>]*hreflang="([^"]+)")(?=[^>]*href="([^"]+)")[^>]*>', s)),
        nxd=len(re.findall(r'<link [^>]*hreflang="x-default"', s)),
        h1=len(re.findall(r'<h1[\s>]', s)))
    for j in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
        try: json.loads(j)
        except ValueError: errs.append(f'{f}: JSON-LD illisible')
    if not p['title'] or not 20 <= len(p['title']) <= 65: errs.append(f'{f}: titre {len(p["title"] or "")} car.')
    if not p['desc'] or not 70 <= len(p['desc']) <= 160: errs.append(f'{f}: description {len(p["desc"] or "")} car.')
    if p['h1'] != 1: errs.append(f'{f}: {p["h1"]} H1')
    want = 'uk' if f == 'index.html' or f.endswith('-ua.html') else 'en'
    if p['lang'] != want: errs.append(f'{f}: lang={p["lang"]}, attendu {want}')
    if not p['can']: errs.append(f'{f}: pas de canonical')
    if p['hl'] and p['hl'].get(p['lang']) != p['can']: errs.append(f'{f}: hreflang {p["lang"]} != canonical')
    if p['hl'] and (p['nxd'] != 1 or p['hl'].get('x-default') != p['hl'].get('uk')):
        errs.append(f'{f}: x-default absent, doublé ou différent de la page uk')
    if want == 'uk' and re.search(r"(?<![\w'’ʼ])(даного|даної|даний|являється|являються)(?!\w)", re.sub(r'<[^>]+>', ' ', s), re.I):
        errs.append(f'{f}: calque du russe (даний / являється)')
    if f.startswith('blog/'):  # dates : JSON-LD = balises og = date affichée, modif >= publication
        pub, mod = g(r'"datePublished":\s*"([^"]+)"'), g(r'"dateModified":\s*"([^"]+)"')
        p['pub'] = pub
        if not pub: errs.append(f'{f}: pas de datePublished'); continue
        if g(r'article:published_time" content="([^"]+)"') != pub: errs.append(f'{f}: article:published_time != datePublished')
        if g(r'article:modified_time" content="([^"]+)"') != mod: errs.append(f'{f}: article:modified_time != dateModified')
        if not mod or mod < pub: errs.append(f'{f}: dateModified avant datePublished')
        shown = g(r'class="article-meta">(?:(?!</div>).)*?blog-card-date">([^<]+)<')
        if not shown: errs.append(f'{f}: pas de date affichée')
        elif visible_date(shown) != pub: errs.append(f'{f}: date affichée {shown} != {pub}')

bycan = {p['can']: f for f, p in pages.items()}
for f, p in pages.items():
    for lang, href in p['hl'].items():
        if lang == 'x-default': continue
        t = pages.get(bycan.get(href))
        if not t: errs.append(f'{f}: hreflang {lang} vers page absente {href}')
        elif t['hl'].get(p['lang']) != p['can']: errs.append(f'{f}: hreflang {lang} sans retour')
        elif 'pub' in p and t.get('pub') != p['pub']: errs.append(f'{f}: date de publication différente de la version {lang}')
for k in ('title', 'desc'):
    for v, n in Counter(p[k] for p in pages.values()).items():
        if n > 1: errs.append(f'{k} en double ({n}) : {v}')
pubs = {f[5:-5]: p['pub'] for f, p in pages.items() if 'pub' in p}
for f in pages:  # cartes d'articles (listes du blog, « articles liés ») : date = publication de l'article visé
    for m in re.finditer(r'blog-card-date">([^<]+)</span>(.{0,700}?)href="/blog/([a-z0-9-]+)"', open(f, encoding='utf-8').read(), re.S):
        if 'blog-card-meta' in m.group(2): continue  # la date appartient à une autre carte
        if visible_date(m.group(1)) != pubs.get(m.group(3)): errs.append(f'{f}: carte {m.group(3)} datée {m.group(1)} != {pubs.get(m.group(3))}')
if re.search(r"el\('h[3-6]'", open('js/hero-calc.js', encoding='utf-8').read()):  # le questionnaire suit le h1 : ses titres sont des h2
    errs.append('js/hero-calc.js: titre h3+ dans le questionnaire (saut de niveau après le h1)')
vers = Counter(v for h in glob.glob('*.html') + glob.glob('blog/*.html') for v in re.findall(r'advisory\.css\?v=(\d+)', open(h, encoding='utf-8').read()))
if len(vers) > 1: errs.append(f'advisory.css chargé en plusieurs versions {dict(vers)} : le cache d un an masque les changements')
sm = set(re.findall(r'<loc>([^<]+)</loc>', open('sitemap.xml').read()))
for f, p in pages.items():
    if p['can'] not in sm: errs.append(f'{f}: absent du sitemap')
for u in sorted(sm - {p['can'] for p in pages.values()}):  # sitemap -> page publique (ni noindex ni absente)
    errs.append(f'sitemap : {u} ne correspond à aucune page publique')

print('\n'.join(errs) or f'OK : {len(pages)} pages publiques')
sys.exit(1 if errs else 0)
