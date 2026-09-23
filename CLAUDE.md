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
  blog.html, blog-ua.html, blog/*.html   # blog index + 32 articles (16 EN/UA pairs, UA slug ends in -ua)
                      # tags = 5 themes, same label on cards, article badge and RSS <category>: Standards/Стандарти, Transformation/Трансформація, Insights/Аналітика, Audit/Аудит, Case Study/Кейс
  privacy(-ua).html, terms(-ua).html, 404.html
  css/style.min.css   # legacy base layer (= css/style.css minified), purged on 23/09 of every rule no page could match - do not edit for visual changes
  css/advisory.css    # the visible design: EDIT HERE (loaded last on every page)
  js/main.js          # navbar state, mobile menu (focus kept inside), Formspree form (#formStatus live region), blog topic filter, active nav link, progress bar
  fonts/              # self-hosted woff2 (Playfair Display latin+cyrillic, DM Sans latin)
  img/og/             # 1200x630 share images, one per page (<slug>.jpg)
  rss.xml, rss-ua.xml, sitemap.xml, robots.txt, llms.txt
```

## Design System - "Advisory" (since 22/09/2026)

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
- After ANY change to `advisory.css` or `main.js`, bump the version in ALL 41 HTML files (e.g. `sed -i 's/advisory\.css?v=18/advisory.css?v=19/'` on `*.html blog/*.html`).
- Current: `style.min.css?v=2`, `advisory.css?v=23`, `main.js?v=16`.
- No scroll-reveal classes any more (`reveal*`, `stagger-children`): content is visible at once. If a page uses a new class of the legacy layer, check it is still in `style.min.css` (it was purged against the pages of 23/09).
- Images/fonts are cached 30 days and not versioned: give a new file name when replacing one.

### Shared template (secondary pages)
The 39 secondary pages reuse the homepage `<nav>` and `<footer>` of their language (links made absolute, UA/EN pointing to the hreflang twin), a skip link and `<main id="main" tabindex="-1">`. Articles mark the Blog menu link `aria-current="true"` (the blog index uses `"page"`). When the homepage nav or footer changes, apply the same change to all pages of that language.

## Two Language Versions
- `index.html` = Ukrainian (lang="uk", deliberate: main audience), `en.html` = English (lang="en")
- Language switch in navbar (UA/EN links with hreflang)
- Both files must stay in sync structurally
- Any change to one version MUST be applied to the other

## Content Structure (both homepages)
1. Hero - headline, CTA buttons, IFRS package widget (ledger of the 5 statements)
2. Trust bar - 3 client-written statements
3. Services - 4 services
4. Approach (#system) - methodology + transformation model
5. Deliverables - 5 statements + audit working files
6. Why FTH - 5 points
7. Process - 4 numbered steps with their output
8. Experts - founder, IFRS expert, project team
9. Latest insights - 3 blog articles
10. Contact - introduction (former CTA band text), hours, free consultation, e-mail, Formspree form (visible labels, `#formStatus` live region for errors with a mailto fallback)
11. Footer

The text belongs to the client (content updates of 12/04 and 21/08/2026). Do not reintroduce "IT-фокус", "Big 4" positioning, the phone number or testimonials without the client's approval.

## Year
Current year is 2026. All copyright notices must say 2026.

## Business Info (as displayed on the homepage)
- Company: Financial Transformation Hub (FTH)
- Email: contact@fthadvisory.com
- Hours: Mon-Sun, 9:00-18:00 (homepage value, pending client confirmation)
- Phone: not displayed (removed by the client on 12/04)
- Certifications shown: ACCA, DipIFR, CPA (CPA pending client confirmation)
- Founder: Vadym Sliusar (ACCA DipIFR); IFRS expert: Svitlana Zubilevych
- LinkedIn: https://www.linkedin.com/company/financial-transformation-hub
