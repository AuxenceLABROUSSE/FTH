# FTH - Financial Transformation Hub

## Project Overview
Static website for FTH Advisory: transformation of financial reporting from Ukrainian GAAP (П(С)БО) to IFRS (МСФЗ).
- Domain: www.fthadvisory.com (fth.jcsm.cloud serves the same folder)
- Server: Nginx on Debian VPS, vhost `/etc/nginx/sites-available/fthadvisory.com` (sites-enabled holds a symlink: edit sites-available, `sudo nginx -t`, reload)
- Security headers / CSP: `/etc/nginx/snippets/security-headers-fth.conf` (`font-src 'self'`, no third-party fonts)
- Files belong to `vadim`: write with `sudo -u vadim ...`; nginx serves the folder directly, so every write is live. Never leave `.bak` files here (they would be public).
- No build tools: plain HTML/CSS/JS

## File Structure
```
/var/www/fth/
  index.html          # Ukrainian homepage (lang="uk", main edition)
  en.html             # English homepage (/en)
  blog.html, blog-ua.html, blog/*.html   # blog index + 44 articles (22 EN/UA pairs, UA slug ends in -ua)
                      # tags = 5 themes, same label on cards, article badge and RSS <category>: Standards/Стандарти, Transformation/Трансформація, Insights/Аналітика, Audit/Аудит, Case Study/Кейс
  privacy(-ua).html, terms(-ua).html, 404.html
  ifrs-kyiv(-ua).html # Kyiv page (local SEO, remote work across Ukraine + in-person meetings in Kyiv by prior arrangement, client wording 16/11/2026), linked from the homepage contact block; facts copied from the homepages only
  css/style.min.css   # legacy base layer (= css/style.css minified), purged on 23/09 of every rule no page could match - do not edit for visual changes; merging it into advisory.css was measured on 23/09 (interleaved Lighthouse A/B) with no FCP/LCP gain: not worth a build step
  css/advisory.css    # the visible design: EDIT HERE (loaded last on every page)
  js/main.js          # navbar state, mobile menu (focus kept inside), Formspree form (#formStatus live region, inline field errors in the page language), blog topic filter (chips written in blog(-ua).html, one per theme; JS recomputes counts and announces the result), scrollspy (.is-current + aria-current="location"), progress bar
  fonts/              # self-hosted woff2 (Playfair Display latin+cyrillic, DM Sans latin)
  img/og/             # 1200x630 share images, one per page (<slug>.jpg)
  rss.xml, rss-ua.xml, sitemap.xml, robots.txt, llms.txt
  ifrs-tool(-ua).html, workspace(-ua).html, js/fth/, js/ifrs-tool.js, js/workspace.js, data/, tools/   # reporting platform (see below)
```

## Design System - "Advisory" (since 22/09/2026), V3 look on top since 14/11/2026

**Read first:** on 14/11/2026 the client asked for the earlier "V3" look back. A block at the END of `css/advisory.css` restores it over the Advisory layer: white background, brighter green, white rounded cards with a soft shadow, pill buttons (`border-radius: 100px`). Where that block and the rules below disagree (radii, flat shadow, paper background), the block wins and is what is live. Everything else below still holds (fonts, no black, no halos, no looping animation, contrast, cache busting).

Editorial consulting-firm look: paper background, forest green, serif headings, hairline grids. All of it lives in `css/advisory.css` (`body.advisory-home`, plus `.advisory-secondary` on blog/legal pages). The former "Premium Green v28" direction (gradients, glows, orbs, hover lifts, tilt, magnetic buttons) is retired: do not bring it back.

### Palette
- Paper background: `#faf9f5`; light sections: `#f0f1eb`, `#eeefe7`, `#edf0e7`
- Hairlines: `#dce0d5`, `#dedfd6`
- Green: `--green: #245438`, `--green-deep: #163b29`, `--green-accent: #34764c`
- Deep green panel (hero widget, model card): `#173d2b`, flat offset shadow `10px 12px 0 #e5e8de`
- Muted text: `#52634f`, `#555e55`
- The legacy zinc tokens `--g50`..`--g900` are re-mapped on `.advisory-home` to green-greys (body `#1f2a22`, footer `#f0f1eb`): use them, never raw zinc values
- Focus ring: 3px `#487941`, offset 4px

### NO BLACK BACKGROUNDS - EVER
- The only dark background allowed is the deep green (`#173d2b` family).
- **NEVER use `var(--black)`, `#09090b`, `#18181b` or any black / very dark grey as a background.**

### Typography
- **Serif (headings)**: `Playfair Display`, weight 400, one accent word in green italic (МСФЗ / IFRS). Self-hosted in `/fonts`, Georgia fallback.
- **Sans (body)**: `DM Sans` for English (self-hosted, latin only). DM Sans has no Cyrillic, so Ukrainian pages use the system stack (`html:lang(uk)` redefines `--font-sans`).
- Web-font swaps must not move text (CLS 0): homepages preload the h1 fonts (roman + italic), and DM Sans has a metric-matched Arial fallback (`'DM Sans Fallback'`, size-adjust computed with fontTools).
- **NO other fonts** - no Google Fonts link, no Fraunces, Inter, Roboto webfont, etc.
- Numbers that matter (hero ledger, process, model rows) use `font-variant-numeric: tabular-nums lining-nums`.

### Shapes and motion
- Radii: 6px buttons, 8px cards, 10px hero widget, 4px fields and tiles. Grids with 1px hairline gaps.
- Left-aligned hero and section headers (one left axis). Lists with hairlines rather than piles of cards.
- Forbidden: halos, decorative gradients, orbs, 3D tilt, magnetic buttons, page loader, looping animations.
- Motion is minimal, one-shot, and always off under `prefers-reduced-motion`.
- The "wow" comes from the trade itself (hero ledger with a double-ruled total, like a financial statement), not from effects.

### Contrast
- Body text on paper: `#52634f` minimum for muted text; headings `--g900`.
- Text on deep green: `#f4f5ee` / `#fff`, accents `#c7ddb3`.

### Cache busting
- CSS/JS are cached 1 year (`immutable`): every page references them with `?v=N`.
- After ANY change to `advisory.css` or `main.js`, bump the version in ALL HTML files (59 on 19/11/2026: `*.html blog/*.html`) (e.g. `sed -i 's/advisory\.css?v=18/advisory.css?v=19/'` on `*.html blog/*.html`).
- Current: `style.min.css?v=2`, `advisory.css?v=41`, `main.js?v=19`, `hero-calc.js?v=7`, `hero-fond.js?v=3` (homepages only); platform scripts `js/fth/core.js?v=3`, `js/fth/vault.js?v=1`, `js/ifrs-tool.js?v=8`, `js/workspace.js?v=2`, `data/*.js?v=1` (only the tool/workspace pages load them).
- No scroll-reveal classes any more (`reveal*`, `stagger-children`): content is visible at once. If a page uses a new class of the legacy layer, check it is still in `style.min.css` (it was purged against the pages of 23/09).
- Images/fonts are cached 30 days and not versioned: give a new file name when replacing one.

### Reporting tool tab (since 15/11/2026)
- Every page with the shared navbar (45 files on 15/11/2026; not `/workspace`) has `<li class="nav-tool">` as the FIRST menu item: "Інструмент МСФЗ" → `/ifrs-tool-ua` on UA pages, "IFRS Tool" → `/ifrs-tool` on EN pages (`aria-current="page"` on the tool pages). Styled as a green pill (`.nav-tool` at the end of `advisory.css`). The homepages also have a third hero button to the tool. Keep it when the nav is changed. The Ukrainian menu is the widest: after any change to the nav run `tools/test-menu.mjs` (logo 74 x 48 and both language buttons on screen from 320 to 1920 px; must print "all passed"). Between 769 and 1023 px four anchors (#system, #process, #deliverables, #why) are hidden from the bar by `advisory.css`. Menu order on EVERY page = section order of the homepage: services, system, process, deliverables, why, experts, blog, contact.
- Home page survey "Investor reporting readiness" (`#heroCalc`, `js/hero-calc.js`, content built by the script; markup only in `index.html` / `en.html`; since 18/11/2026 it sits in `section.questionnaire-sous-fond` just BELOW the hero, right-aligned): intro → 6 questions one at a time (purpose [unscored, tailors the wording], standards, subsidiaries, prior years, audit, trial balance) → score /100 (points add up to 100; levels <35 / <60 / <80 / 80+) with up to 4 tips → two ways forward: the tool (`/ifrs-tool-ua?a=group` or `?n=group` from the subsidiaries answer; `js/ifrs-tool.js` pre-fills only the listed readiness questions) or "Discuss a project" (`#contact`, summary typed into `#message` when empty). Nothing is sent or stored. Indicative only: never state IFRS compliance or a quote. Questions, points and tips are in the two language dictionaries at the top of the script (keep UA and EN in sync).
- File inputs (tool + workspace pages) are wrapped by `js/fth/fileui.js` so the "Choose file / No file chosen" text is Ukrainian or English instead of the browser's language (never remove the script from those pages).
- Language: the site and the tool are Ukrainian and English only. No Russian text (the Excel workbook still holds one Russian description, translated by `tools/build-ifrs-data.py`).

### Shared template (secondary pages)
The secondary pages (41 on 15/11/2026) reuse the homepage `<nav>` and `<footer>` of their language (links made absolute, UA/EN pointing to the hreflang twin), a skip link and `<main id="main" tabindex="-1">`. Articles mark the Blog menu link `aria-current="true"` (the blog index uses `"page"`). When the homepage nav or footer changes, apply the same change to all pages of that language.

## FTH Reporting Platform (since 14/11/2026) — details in `tools/PLATFORM.md`
- Client portal `/ifrs-tool` + `/ifrs-tool-ua` (footer link "IFRS Tool"): upload ОСВ → checks → mapping → preliminary SoFP/P&L → IFRS readiness map → encrypted package for FTH (.fthpkg); also opens results released by FTH (.fthres, passphrase, signature checked).
- Specialist workspace `/workspace` + `/workspace-ua`: noindex, NOT linked anywhere, not in the sitemap. Needs the FTH key file (.fthkey) + passphrase. Mapping review, adjustment journals, IFRS 16 / IFRS 9 / IAS 21 / IAS 12 (deferred + current) / IAS 38 / IFRS 15 calculators, indirect cash flow view (reconciled to cash, not released to clients), worksheet, review notes, status, signed release, encrypted working file (.fthwork), Excel working papers, audit trail.
- Engine `js/fth/core.js`, crypto `js/fth/vault.js` (WebCrypto only). No request after page load and no browser storage: keep it that way (tests check it).
- Model: `data/ifrs-data.js` (generated from the Excel workbook, do not edit) + `data/ifrs-model.js` (FTH model 2.0: lines, mapping corrections, findings; bump its `version` on change).
- Keys: public `data/fth-keys.js`; private key file + passphrase in `/home/vadim/fth-keys/` (never under /var/www, never in git: `.gitignore` blocks *.fthkey, *.fthpkg, *.fthwork, *.fthres).
- Never present output as IFRS-compliant: portal = "preliminary"; releases carry a disclaimer.
- IndexNow (Bing, Yandex): key file `/2cf45cfbe4760795547ed2185aebd04d.txt` at the root (keep it). After publishing or changing pages: `curl -s -H "Content-Type: application/json" -d '{"host":"www.fthadvisory.com","key":"2cf45cfbe4760795547ed2185aebd04d","urlList":["https://www.fthadvisory.com/<page>"]}' https://api.indexnow.org/indexnow`
- SEO probe: `python3 tools/check-seo.py` (must print "OK"): titles/descriptions length and uniqueness, one H1, lang, canonical, reciprocal hreflang + x-default (= the UA page), blog dates (JSON-LD = og tags = header date = every card pointing to the article), sitemap coverage both ways, common Russian calques on UA pages. Run it after every new article or page.
- Tests: `PLAYWRIGHT_CORE=/var/www/aixo/node_modules/playwright-core node tools/test-platform.mjs` (must print "all passed").

## Two Language Versions
- `index.html` = Ukrainian (lang="uk", deliberate: main audience), `en.html` = English (lang="en")
- Language switch in navbar (UA/EN links with hreflang)
- Both files must stay in sync structurally
- Any change to one version MUST be applied to the other

## Content Structure (both homepages)
1. Hero - headline, CTA buttons, over a full-screen background video (since 18/11/2026, client request): `video/fth-fond-v1.{webm,mp4}` (the mp4 is a web encode since 19/11/2026: H.264 High 4.0, one keyframe per second, 780 KB; browsers that read VP9 take the webm) (5 s, plays once, map of Europe with Ukraine on the right and lines from Kyiv to 15 capitals, no text; source project ~/dev/wt-fth-video, `film.html?fond`), posters `fth-fond-v1-debut.jpg` (first frame) and `fth-fond-v1.jpg` (last frame, used under reduced motion). `js/hero-fond.js` starts playback once the video is at least 40 % on screen (phones: the map sits under the text, so it waits for the scroll; playback refused = final-frame poster) (no `autoplay` in the HTML so reduced-motion visitors download nothing), then draws a thick green line from Kyiv (1640,470 in the video, mapped through object-fit: cover / object-position) that follows the visitor's SCROLL only (never auto-scrolls, stops when scrolling stops, goes back when scrolling up), runs outside the survey card and wraps the "Почати опитування" / "Start the survey" button; it disappears as soon as the survey starts. Tests: `python3 tools/serveur-range.py 8769 .` (serves Range requests like nginx; `python3 -m http.server` does not, so a video cannot be seeked there) then `tools/test-hero-fond.mjs` (must print "all passed").
1b. Survey `#heroCalc` (see above), just under the hero
2. Trust bar - 3 client-written statements
3. Services - 4 services
4. Approach (#system) - methodology + transformation model
5. Deliverables - 5 statements + audit working files
6. Why FTH - 5 points
7. Process - 4 numbered steps with their output
8. Experts - founder, IFRS expert, project team
9. Latest insights - 3 blog articles
10. Contact - introduction (former CTA band text), Formspree form, then location / hours / free consultation / e-mail (`.contact-details` sits AFTER the form in the markup so phones reach the form first; a grid area puts it back under the introduction from 769px) (visible labels, `#formStatus` live region for errors with a mailto fallback)
11. Footer

The text belongs to the client (content updates of 12/04 and 21/08/2026). Do not reintroduce "IT-фокус", "Big 4" positioning, the phone number or testimonials without the client's approval.

## Year
Current year is 2026. All copyright notices must say 2026.

## Business Info (as displayed on the homepage)
- Company: Financial Transformation Hub (FTH)
- Email: contact@fthadvisory.com
- Location: Kyiv, Ukraine (contact block "Місто" / "Location", since 15/11/2026)
- Hours: Mon-Sun, 9:00-18:00 (homepage value, pending client confirmation)
- Phone: not displayed (removed by the client on 12/04)
- Certifications shown: ACCA, DipIFR, CPA (CPA pending client confirmation)
- Founder: Vadym Sliusar (ACCA DipIFR); IFRS expert: Svitlana Zubilevych
- LinkedIn: https://www.linkedin.com/company/fth-advisory
