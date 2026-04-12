# FTH - Financial Transformation Hub

## Project Overview
Static website for FTH Advisory - IFRS reporting and financial transformation services for Ukrainian IT companies.
- Domain: www.fthadvisory.com
- Server: Nginx on Debian VPS (94.23.107.124)
- SSL: Let's Encrypt via Certbot, Cloudflare DNS proxy

## File Structure
```
/var/www/fth/
  index.html      # Ukrainian version (main)
  en.html          # English version
  css/style.css    # Single stylesheet for all pages
  js/main.js       # Animations, scroll reveals, counters, form handling
  img/             # Logo and assets
  favicon.ico      # Multi-size favicon
  site.webmanifest # PWA manifest
  robots.txt       # SEO
  sitemap.xml      # SEO
```

## Design System — Premium Green (v28)

The site uses a refined SaaS-premium aesthetic: white background, dark green theme, Playfair display serif paired with DM Sans body, gradient buttons, soft rounded shadows, polished hover lifts. The editorial/Fraunces broadsheet experiment (v21-v27) was reverted — the user prefers the cleaner classic look.

`css/style.css` is layered: base styles → **v20 PREMIUM OVERHAUL** at the bottom defines the actual visible polish (gradients, glows, shine sweeps, lift hovers). Edit there for visual changes; the v21+ editorial layers were truncated.

### Color Palette
- **Primary**: `--green: #166534` (dark green)
- **Deep**: `--green-deep: #14532d`
- **Accent**: `--green-accent: #22c55e` (bright green)
- **Backgrounds**: White (`#fff`) and light grey (`--g50: #fafafa`)
- **Text on white**: `--g900` for headings, `--g500` for body text
- **Text on green**: White (`#fff`) or `rgba(255,255,255,.85)` minimum
- **Gradient**: `--grad-green: linear-gradient(135deg, #166534, #15803d, #22c55e)` — used on buttons, hero h1 em, big numerals, expert initials.

### NO BLACK BACKGROUNDS - EVER
- Hero, footer, section-dark, page headers, page loader: green background.
- CTA sections: light grey or green.
- **NEVER use `var(--black)`, `#09090b`, `#18181b` or any dark/black color as background**.

### Typography
- **Sans-serif**: `DM Sans` (body, UI elements). Loaded via Google Fonts.
- **Serif**: `Playfair Display` (headings, section titles, hero h1 em, big numerals). Loaded via Google Fonts.
- **NO other fonts** — do not introduce Fraunces, Instrument Serif, JetBrains Mono, Inter, Roboto, etc.
- Headings use moderate negative letter-spacing (-.022em).

### Visual signature (v20 premium layer)
- Soft rounded corners on cards (16px radius).
- Soft layered shadows that intensify on hover (`var(--glow-green)`, `var(--glow-green-strong)`).
- Gradient text-clipping on numerals, hero `<em>`, expert initials.
- Buttons: gradient fill + shine sweep on hover.
- Navbar: glass blur backdrop.
- Animated mesh orbs in hero background (3 floating gradient blobs).
- Subtle hover lift on cards (-6 to -8px translate).

### Contrast
- White text on green: minimum `rgba(255,255,255,.85)` for body, white solid for headings.
- Grey text on white: minimum `--g500 (#71717a)` for body, `--g900` for headings.
- Hero description: `rgba(255,255,255,.85)`.
- Hero h1 em uses gradient text-clip — visible against forest green.

### Cache busting
- Bump `style.css?v=NN` in BOTH index.html and en.html when changing styles.
- Current: `v=48`.

### Experts Section
- Founder: Vadym Sliusar (ACCA DipIFR)
- Advisory experts: Svitlana Zubilevych, Volodymyr Kraievskyi
- LinkedIn: https://www.linkedin.com/company/financial-transformation-hub

## Two Language Versions
- `index.html` = Ukrainian (lang="uk")
- `en.html` = English (lang="en")
- Language switch in navbar (UA/EN buttons)
- Both files must stay in sync structurally
- Any change to one version MUST be applied to the other

## Content Structure (both versions)
1. Hero (white bg) - headline, CTA buttons, IFRS package widget
2. Trust Bar - 4 key metrics
3. Services - 4 service cards with detailed descriptions
4. System/Approach (section-light) - methodology + 4 stats cards
5. Deliverables - 6 items (5 statements + audit working files)
6. Why FTH (section-light) - 5 bullet points advantages
7. Process - 4 steps with "Result" sub-line
8. Experts (section-light) - founder + advisory experts
9. Testimonials - 3 client testimonial cards
10. CTA (light bg) - call to action
11. Contact - form + details (phone, hours, free consultation)
12. Footer (light bg) - with LinkedIn

## Year
Current year is 2026. All copyright notices must say 2026.

## Business Info
- Company: Financial Transformation Hub (FTH)
- Email: contact@fthadvisory.com
- Phone: +380 44 591 0800
- Hours: Mon-Fri, 9:00-18:00
- Certifications: ACCA, DipIFR, CPA

## Technical Notes
- Nginx config: /etc/nginx/sites-available/fth
- Scroll reveal animations via IntersectionObserver in main.js
- Counter animation for sys-num elements with data-count attribute
- Glass-morphism pipeline bar in hero
- Responsive breakpoints: 1024px, 768px, 480px
- No build tools - plain HTML/CSS/JS
