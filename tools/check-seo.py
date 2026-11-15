#!/usr/bin/env python3
"""Sonde SEO des pages publiques FTH. Lancer depuis la racine du site : python3 tools/check-seo.py
Sort en 1 si une règle casse. À relancer après chaque nouvel article."""
import glob, html, json, re, sys
from collections import Counter

BASE = 'https://www.fthadvisory.com/'
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
        hl=dict(re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"', s)),
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
    if p['hl'] and 'x-default' not in p['hl']: errs.append(f'{f}: pas de x-default')
    if want == 'uk' and re.search(r"(?<![\w'’ʼ])(даного|даної|даний|являється|являються)(?!\w)", re.sub(r'<[^>]+>', ' ', s)):
        errs.append(f'{f}: calque du russe (даний / являється)')

bycan = {p['can']: f for f, p in pages.items()}
for f, p in pages.items():
    for lang, href in p['hl'].items():
        if lang == 'x-default': continue
        t = pages.get(bycan.get(href))
        if not t: errs.append(f'{f}: hreflang {lang} vers page absente {href}')
        elif t['hl'].get(p['lang']) != p['can']: errs.append(f'{f}: hreflang {lang} sans retour')
for k in ('title', 'desc'):
    for v, n in Counter(p[k] for p in pages.values()).items():
        if n > 1: errs.append(f'{k} en double ({n}) : {v}')
sm = set(re.findall(r'<loc>([^<]+)</loc>', open('sitemap.xml').read()))
for f, p in pages.items():
    if f != '404.html' and p['can'] not in sm: errs.append(f'{f}: absent du sitemap')

print('\n'.join(errs) or f'OK : {len(pages)} pages publiques')
sys.exit(1 if errs else 0)
