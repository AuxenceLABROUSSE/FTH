#!/usr/bin/env node
/* Headless check of /ifrs-tool and /ifrs-tool-ua (not part of the site; run from the repo root):

     node tools/test-ifrs-tool.mjs <Звіти.xlsx> <ОСВ demo .xls> [screenshot dir]

   - reference totals from tools/reference-ifrs.py (Python, straight from the raw files;
     PYTHON=... must have openpyxl + xlrd);
   - serves the repo on 127.0.0.1 with clean URLs and the production CSP header;
   - EN and UA: clicks the sample, then uploads the real .xls through the file input, and
     compares the totals shown with the reference (0.01 max);
   - privacy: no request at all once the page is loaded (sample, upload, re-classification),
     and no network API in the tool scripts;
   - closed-year and parent/sub-account cases on the compute function;
   - screenshots 1440 px and 390 px.
   Driver: playwright-core (PLAYWRIGHT_CORE=path, required) + chromium (CHROMIUM=path, default /usr/bin/chromium). */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const [xlsx, xls, shots = '/tmp'] = process.argv.slice(2);
if (!xlsx || !xls) { console.error('usage: node tools/test-ifrs-tool.mjs <Звіти.xlsx> <ОСВ.xls> [screenshot dir]'); process.exit(2); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);
if (!process.env.PLAYWRIGHT_CORE) { console.error('PLAYWRIGHT_CORE=<path to a playwright-core package> is required'); process.exit(2); }
const { chromium } = require(process.env.PLAYWRIGHT_CORE);
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://formspree.io; frame-ancestors 'self';";

let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) failures++; };

// 1. Reference
const ref = JSON.parse(execFileSync(process.env.PYTHON || 'python3', ['-I', path.join(ROOT, 'tools/reference-ifrs.py'), xlsx, xls], { encoding: 'utf8' }));
console.log('reference', JSON.stringify(ref));
const expected = {
  'assets-open': ref.opening.total_assets, 'assets-close': ref.closing.total_assets,
  'equity-open': ref.opening.total_equity, 'equity-close': ref.closing.total_equity,
  'liabilities-open': ref.opening.total_liabilities, 'liabilities-close': ref.closing.total_liabilities,
  revenue: ref.revenue, profit: ref.profit_for_the_year,
};

// 2. Static: no network API in the scripts the tool page adds
const NET = /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|\.submit\s*\(|importScripts|new\s+Worker|RTCPeerConnection|navigator\.connection/;
for (const f of ['js/ifrs-tool.js', 'data/ifrs-data.js', 'js/vendor/xlsx-0.20.3.full.min.js']) {
  ok(!NET.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), `no network API in ${f}`);
}
for (const f of ['ifrs-tool.html', 'ifrs-tool-ua.html']) {
  const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  ok(!/<form\b/i.test(main), `${f}: no <form> around the file input`);
}

// 3. Local server: clean URLs (/ifrs-tool -> ifrs-tool.html) and the production CSP
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.xml': 'application/xml', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file += '.html';
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': CSP });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const parse = (text, lang) => {
  let s = text.replace(/[\s  ]/g, '').replace(/−/g, '-');
  s = lang === 'uk' ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  return parseFloat(s);
};
async function totals(page, lang) {
  const out = {};
  for (const k of Object.keys(expected)) out[k] = parse(await page.locator(`[data-total="${k}"]`).first().textContent(), lang);
  return out;
}
function compare(got, label) {
  for (const [k, v] of Object.entries(expected)) ok(Math.abs(got[k] - v) <= 0.01, `${label} ${k}: shown ${got[k]} / reference ${v}`);
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium' });
try {
  for (const [url, lang] of [['/ifrs-tool', 'en'], ['/ifrs-tool-ua', 'uk']]) {
    for (const width of [1440, 390]) {
      const ctx = await browser.newContext({ viewport: { width, height: width > 500 ? 900 : 844 } });
      const page = await ctx.newPage();
      const requests = [], errors = [];
      let loaded = false;
      page.on('request', (r) => requests.push({ loaded, method: r.method(), url: r.url() }));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      page.on('pageerror', (e) => errors.push(String(e)));
      const resp = await page.goto(BASE + url, { waitUntil: 'networkidle' });
      ok(resp.status() === 200, `${url} @${width}: HTTP 200`);
      loaded = true;
      const tag = `${lang} @${width}`;

      await page.click('#ifrsDemo');
      await page.locator('[data-total="assets-close"]').waitFor();
      compare(await totals(page, lang), `${tag} sample`);
      ok(await page.locator('#ifrsCheck.is-ok').count() === 1, `${tag} sample: balance check shown OK`);
      ok((await page.locator('#ifrsPeriod').textContent()).includes('2015'), `${tag} sample: period read (2015)`);
      ok(await page.locator('.ifrs-banner').isVisible(), `${tag}: preliminary banner visible`);
      ok(await page.locator(`.ifrs-cta a.btn[href="${lang === 'uk' ? '/#contact' : '/en#contact'}"]`).count() === 1, `${tag}: CTA to the contact section`);
      if (width === 390) ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${tag}: no horizontal page scroll`);
      if (width === 390) ok(await page.evaluate(() => [...document.querySelectorAll('.ifrs-statements .ifrs-scroll')].every((e) => e.scrollWidth <= e.clientWidth)), `${tag}: statements fit the phone width (no clipped column)`);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: path.join(shots, `ifrs-tool-${lang === "uk" ? "ua" : "en"}-${width}.png`), fullPage: true });
      await page.locator('#ifrsStep4').screenshot({ path: path.join(shots, `ifrs-tool-${lang === "uk" ? "ua" : "en"}-${width}-result.png`), style: '.navbar { visibility: hidden; }' });

      if (width === 1440) {
        // Real file through the file input: same figures, read by SheetJS in the page.
        await page.evaluate(() => { document.getElementById('ifrsStatus').textContent = ''; });
        await page.setInputFiles('#ifrsFile', xls);
        await page.waitForFunction(() => /(File read|Файл прочитано)/.test(document.getElementById('ifrsStatus').textContent), null, { timeout: 15000 });
        compare(await totals(page, lang), `${tag} uploaded .xls`);
        ok((await page.locator('#ifrsCompany').textContent()).trim() === 'Добро', `${tag} upload: company read`);
        // Re-classification: move 361 to "Other receivables" -> totals unchanged, then to none -> check fails visibly.
        const sel = page.locator('.ifrs-accounts tbody tr', { hasText: '361' }).locator('select');
        await sel.selectOption('Other receivables');
        compare(await totals(page, lang), `${tag} after re-classifying 361`);
        await sel.selectOption('');
        ok(await page.locator('#ifrsCheck.is-ko').count() === 1, `${tag} unclassified 361: check shows the gap`);

        // Compute cases: closed year (closing entries through 79) and a parent account next to its sub-account.
        const cases = await page.evaluate(() => {
          const R = [['10', 400000, 0, 0, 0, 400000, 0], ['131', 0, 100000, 0, 50000, 0, 150000], ['281', 300000, 0, 600000, 600000, 300000, 0],
            ['311', 500000, 0, 900000, 680000, 720000, 0], ['361', 200000, 0, 1200000, 900000, 500000, 0], ['401', 0, 500000, 0, 0, 0, 500000],
            ['441', 0, 650000, 0, 250000, 0, 900000], ['631', 0, 150000, 500000, 600000, 0, 250000], ['641', 0, 0, 0, 100000, 0, 100000],
            ['661', 0, 0, 180000, 200000, 0, 20000], ['703', 0, 0, 1200000, 1200000, 0, 0], ['901', 0, 0, 600000, 600000, 0, 0],
            ['92', 0, 0, 250000, 250000, 0, 0], ['93', 0, 0, 100000, 100000, 0, 0], ['791', 0, 0, 1200000, 1200000, 0, 0]];
          const closed = window.FTHIFRS.compute({ rows: R });
          const demo = window.FTH_IFRS_DATA.demo.rows;
          const parent = window.FTHIFRS.compute({ rows: demo.concat([['36', 200000, 0, 1200000, 900000, 500000, 0]]) });
          const one = window.FTHIFRS.compute({ rows: [['311', 100, 0, 0, 0, 100, 0], ['6', 0, 100, 0, 0, 0, 100]] });
          return {
            closed: { assets: closed.assets[1], equity: closed.equity[1], liabilities: closed.liabilities[1], revenue: closed.revenue, profit: closed.profit, added: closed.resultAdded[1], closed79: closed.closed79, diff: closed.diff[1] },
            parent: { assets: parent.assets, equity: parent.equity, warnings: parent.warnings.length },
            one: { liabilities: one.liabilities[1], diff: one.diff[1] },
          };
        });
        const c = cases.closed;
        ok(c.closed79 && Math.abs(c.added) < 0.01, `${tag} closed year: nothing added to retained earnings (${c.added})`);
        ok(c.assets === 1770000 && c.equity === 1400000 && c.liabilities === 370000 && Math.abs(c.diff) < 0.01, `${tag} closed year: balance sheet 1 770 000 = 1 400 000 + 370 000`);
        ok(c.revenue === 1200000 && c.profit === 250000, `${tag} closed year: P&L from turnovers, revenue ${c.revenue}, profit ${c.profit}`);
        ok(cases.one.liabilities === 100 && cases.one.diff === 0, `${tag} one-digit account 6 found by exact match`);
        ok(cases.parent.assets[1] === ref.closing.total_assets && cases.parent.assets[0] === ref.opening.total_assets && cases.parent.warnings === 0, `${tag} parent 36 next to 361: counted once`);
      }

      const after = requests.filter((r) => r.loaded);
      ok(after.length === 0, `${tag}: no request after the page loaded (${after.map((r) => r.method + ' ' + r.url).join(', ') || 'none'})`);
      const offsite = requests.filter((r) => !r.url.startsWith(BASE) || r.method !== 'GET');
      ok(offsite.length === 0, `${tag}: only same-origin GETs of static files (${offsite.map((r) => r.method + ' ' + r.url).join(', ') || 'none'})`);
      ok(errors.length === 0, `${tag}: no console error (${errors.join(' | ') || 'none'})`);
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
console.log(failures ? `\n${failures} FAILED` : '\nALL GREEN');
process.exit(failures ? 1 : 0);
