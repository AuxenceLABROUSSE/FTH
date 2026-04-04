# FTH - Financial Transformation Hub

## Project Overview
Static website for FTH Advisory - IFRS reporting and financial transformation services for Ukrainian IT companies.
- Domain: fth.jcsm.cloud
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
  about.html       # About page (multi-page)
  services.html    # Services page (multi-page)
  locations.html   # Locations page (multi-page)
  contact.html     # Contact page (multi-page)
  robots.txt       # SEO
  sitemap.xml      # SEO
```

## Design Rules - STRICT

### Color Palette
- **Primary**: `--green: #166534` (dark green)
- **Deep**: `--green-deep: #14532d`
- **Accent**: `--green-accent: #22c55e` (bright green)
- **Backgrounds**: White (`#fff`) and light grey (`--g50: #fafafa`)
- **Text on white**: `--g900` for headings, `--g500` for body text
- **Text on green**: White (`#fff`) or `rgba(255,255,255,.85)` minimum

### NO BLACK BACKGROUNDS - EVER
- Hero: green background (`var(--green)`)
- Footer: green background (`var(--green)`)
- Section-dark: green background (`var(--green)`)
- Page headers: green background (`var(--green)`)
- CTA sections: light grey (`var(--g50)`) or green
- Page loader: green
- **NEVER use `var(--black)`, `#09090b`, `#18181b` or any dark/black color as background**

### Contrast Requirements
- White text on green (#166534): minimum rgba(255,255,255,.75)
- Grey text on white: minimum `--g500` (#71717a), never lighter
- All text must be clearly readable - no low-contrast combinations
- Pipeline tags on hero: rgba(255,255,255,.75) minimum
- Hero description: rgba(255,255,255,.85)

### Typography
- Sans-serif: `DM Sans` (body, UI elements)
- Serif: `Playfair Display` (headings, section titles, hero h1 em)
- No other fonts allowed without explicit approval

### Sections Removed
- **Team section**: Removed entirely from both UA and EN versions
- No team members, no team grid, no team links in nav or footer

## Two Language Versions
- `index.html` = Ukrainian (lang="uk")
- `en.html` = English (lang="en")
- Language switch in navbar (UA/EN buttons)
- Both files must stay in sync structurally
- Any change to one version MUST be applied to the other

## Content Structure (both versions)
1. Hero (green bg) - headline, description, CTA buttons, pipeline
2. Services - 4 service cards
3. System/Methodology (section-light) - stats cards
4. Deliverables - 5 financial statements
5. Process - 4 steps
6. CTA (light bg) - call to action
7. Contact - form + details
8. Footer (green bg)

## Year
Current year is 2026. All copyright notices must say 2026.

## Business Info
- Company: Financial Transformation Hub (FTH)
- Email: info@fth-advisory.com
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
