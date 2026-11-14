#!/usr/bin/env node
/* Tests of the FTH reporting platform (not part of the site; run from the repo root):

     PLAYWRIGHT_CORE=/path/to/playwright-core node tools/test-platform.mjs [screenshot dir]

   1. Core (Node): both samples balance; P&L ↔ retained earnings gap found on the closed TB;
      journals: balance, scopes, flow of P&L adjustments to retained earnings; extraction
      corrections clear the gap; lease / ECL / FX / deferred-tax calculators balance;
      parsing of a header-based ОСВ with amounts as text; upload guard (type, size).
   2. Vault (Node): seal/open, wrong key, tampering, wrong passphrase, release signature,
      release signed by another key rejected.
   3. Browser, production CSP, no request after load:
      portal EN + UA: samples, real .xlsx upload, mapping change, readiness answers, Excel
      export, encrypted package;
      workspace: unlock with a key file, open that package, lease calculator -> journal ->
      approve, review note, status, release (.fthres), save (.fthwork) and reopen it;
      portal: open the release with its passphrase, signature verified, figures = workspace.
   Chromium: CHROMIUM=path (default /usr/bin/chromium). */
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { webcrypto } from 'node:crypto';
globalThis.crypto ??= webcrypto;

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SHOTS = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'fth-shots-'));
const require = createRequire(import.meta.url);
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? 'ok   ' : 'FAIL ') + msg); if (!cond) failures++; };
const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

// ---------- 1. core ----------
globalThis.window = globalThis;
for (const f of ['data/ifrs-data.js', 'data/ifrs-model.js', 'data/ifrs-demo-it.js', 'js/fth/core.js', 'js/fth/vault.js']) require(path.join(ROOT, f));
const C = globalThis.FTHCore, V = globalThis.FTHVault;
const M = C.buildModel(globalThis.FTH_IFRS_DATA, globalThis.FTH_IFRS_MODEL);
const IT = globalThis.FTH_IFRS_DEMO_IT;

const r1 = C.compute(M, M.demo, {});
ok(r1.balanced && near(r1.assets[1], 1770000) && near(r1.profit, 250000) && near(r1.revenue, 1200000), 'sample Добро: balances, revenue 1 200 000, profit 250 000');
const r2 = C.compute(M, IT, {});
ok(r2.balanced && r2.unknownCount === 0, 'sample IT: balances, all classified');
ok(r2.natural && r2.recon && near(r2.recon.gap, 200000), 'sample IT: closed through 79, P&L vs retained earnings gap = VAT 200 000');
ok(near(r2.equity[1] - r2.equity[0], 1869600), 'sample IT: equity movement = true profit 1 869 600');

const adj = [{ id: 'a', no: 1, type: 'adjust', scope: 'current', standard: 'IFRS 9', status: 'approved', lines: [{ category: 'Impairment loss', dr: 50000, cr: 0 }, { category: 'Trade receivables', dr: 0, cr: 50000 }] }];
const r3 = C.compute(M, IT, { journals: adj });
ok(r3.balanced && near(r3.assets[1], r2.assets[1] - 50000) && near(r3.profit, r2.profit - 50000), 'current journal: assets and profit -50 000, still balanced');
const re = (r) => r.balance.find((l) => l.id === 'retained_earnings');
ok(near(re(r3).ifrs[1], re(r2).ifrs[1] - 50000) && near(re(r3).ifrs[0], re(r2).ifrs[0]), 'current journal: P&L flows to closing retained earnings only');
const open = [{ id: 'b', no: 2, type: 'adjust', scope: 'opening', standard: 'IAS 19', status: 'approved', lines: [{ category: 'Retained earnings', dr: 30000, cr: 0 }, { category: 'Employee benefit liabilities (current)', dr: 0, cr: 30000 }] }];
const r4 = C.compute(M, IT, { journals: open });
ok(r4.balanced && near(re(r4).ifrs[0], re(r2).ifrs[0] - 30000) && near(re(r4).ifrs[1], re(r2).ifrs[1] - 30000) && near(r4.profit, r2.profit), 'opening journal: opening and closing balances, no P&L');
const unbal = [{ id: 'c', no: 3, type: 'adjust', scope: 'current', status: 'draft', lines: [{ category: 'Revenue', dr: 10, cr: 0 }] }];
ok(C.compute(M, IT, { journals: unbal }).checks.some((c) => c.id === 'journals' && c.level === 'error'), 'unbalanced journal reported');
const ext = [{ id: 'd', no: 4, type: 'reclass', scope: 'extraction', status: 'approved', lines: [{ category: 'Revenue', dr: 200000, cr: 0 }] }];
const r5 = C.compute(M, IT, { journals: ext });
ok(near(r5.recon.gap, 0) && r5.balanced && near(r5.revenue, 13000000), 'extraction correction (VAT in revenue) clears the gap, balance sheet unchanged');

const lease = C.leaseCalc({ start: '2024-07-01', termMonths: 36, payment: 50000, timing: 'advance', rate: 18, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
ok(!lease.error && lease.opening && near(C.journalBalance(lease.opening), 0) && near(C.journalBalance(lease.current), 0), 'IFRS 16: opening and current journals balance');
ok(near(lease.payments, 600000) && lease.liabClose < lease.liabOpen && lease.rouClose < lease.rouOpen, 'IFRS 16: 12 payments, liability and ROU decrease');
const r6 = C.compute(M, IT, { journals: [Object.assign({ id: 'l1', no: 5, status: 'approved' }, lease.opening), Object.assign({ id: 'l2', no: 6, status: 'approved' }, lease.current)] });
ok(r6.balanced, 'IFRS 16 journals keep the balance sheet balanced');
const fresh = C.leaseCalc({ start: '2025-03-01', termMonths: 24, payment: 10000, timing: 'arrears', rate: 12, periodStart: '2025-01-01', periodEnd: '2025-12-31' });
ok(!fresh.opening && near(C.journalBalance(fresh.current), 0) && near(fresh.payments, 100000), 'IFRS 16: lease starting in the period (10 payments in arrears)');
ok(C.leaseCalc({ start: '2026-03-01', termMonths: 24, payment: 1, rate: 1, periodStart: '2025-01-01', periodEnd: '2025-12-31' }).error === 'notStarted', 'IFRS 16: future lease refused');
const ecl = C.eclCalc({ buckets: [{ amount: 1000000, rate: 1 }, { amount: 100000, rate: 50 }], existing: 5000 });
ok(near(ecl.delta, 55000) && near(C.journalBalance(ecl.journal), 0), 'IFRS 9: allowance 60 000 - 5 000 = 55 000');
const fx = C.fxCalc({ category: 'Trade receivables', fcAmount: 10000, rate: 42, carrying: 410000 });
ok(near(fx.diff, 10000) && fx.journal.lines[1].category === 'FX gain/loss' && fx.journal.lines[1].cr === 10000, 'IAS 21: 10 000 FX gain');
const dt = C.deferredTaxCalc(M, adj.concat(open), 18);
ok(near(dt.taxPl, 9000) && near(dt.taxOpen, 5400) && near(C.journalBalance(dt.journal), 0), 'IAS 12: deferred tax 18% on 50 000 (P&L) and 30 000 (opening)');

const grid = [['ТОВ «Тест»'], ['Оборотно-сальдова відомість за 2025 р.'], [], ['Рахунок', 'Назва', 'Дебет', 'Кредит', 'Дебет', 'Кредит', 'Дебет', 'Кредит'],
  ['311', 'Банк', '1 000,00', '', '500,50', '200', '1 300,50', ''], ['40', 'Капітал', '', '1000', '', '', '', '1000'], ['70', 'Дохід', '', '', '', '500,50', '', '500,50'],
  ['92', 'Адмін', '', '', '200', '', '200', ''], ['12345678', 'аналітика', '9', '', '', '', '', '']];
const p = C.parseSheet(grid);
ok(p.layout === 'header' && p.rows.length === 4 && p.company === 'ТОВ «Тест»' && p.period === '2025 р.', 'parser: header layout, analytic code ignored, company and period read');
const rp = C.compute(M, p, {});
ok(rp.balanced && near(rp.profit, 300.5) && near(rp.revenue, 500.5), 'parser: amounts as text ("1 000,00", "500,50") computed');
ok(C.readWorkbook(new TextEncoder().encode('<html>not excel</html>').buffer, null).error === 'badType', 'upload guard: non-Excel content refused by magic bytes');
ok(C.readWorkbook(new ArrayBuffer(16 * 1024 * 1024), null).error === 'tooLarge', 'upload guard: over 15 MB refused');

// ---------- 2. vault ----------
const ks = await V.generateKeySet('correct horse battery staple');
const keys = await V.unlockKeyFile(ks.keyFile, 'correct horse battery staple');
ok(keys.keyId === ks.publicKeys.keyId, 'key file unlocks with its passphrase');
let err = null; try { await V.unlockKeyFile(ks.keyFile, 'wrong passphrase!!'); } catch (e) { err = e.message; }
ok(err === 'badPassphrase', 'key file: wrong passphrase refused');
const sealed = await V.sealForFTH({ hello: 'світ' }, ks.publicKeys, 'client-package', {});
ok(!JSON.stringify(sealed).includes('світ') && (await V.openForFTH(sealed, keys, 'client-package')).hello === 'світ', 'sealed package: unreadable without the key, opens with it');
const other = await V.unlockKeyFile((await V.generateKeySet('another passphrase 123')).keyFile, 'another passphrase 123');
err = null; try { await V.openForFTH(sealed, other, 'client-package'); } catch (e) { err = e.message; }
ok(err === 'otherKey', 'sealed package: other FTH key refused');
const forged = Object.assign({}, sealed, { keyId: other.keyId });
err = null; try { await V.openForFTH(forged, other, 'client-package'); } catch (e) { err = e.message; }
ok(err === 'tampered', 'sealed package: header rewritten to another key id cannot be decrypted');
const ct = Buffer.from(sealed.ct, 'base64'); ct[5] ^= 1;
err = null; try { await V.openForFTH(Object.assign({}, sealed, { ct: ct.toString('base64') }), keys, 'client-package'); } catch (e) { err = e.message; }
ok(err === 'tampered', 'sealed package: one flipped bit detected');
err = null; try { await V.openForFTH(Object.assign({}, sealed, { kind: 'working-file' }), keys); } catch (e) { err = e.message; }
ok(err === 'tampered', 'sealed package: kind is authenticated');
const rel = await V.sealRelease({ a: 1 }, keys, 'release-pass-123');
const opened = await V.openRelease(rel, 'release-pass-123', ks.publicKeys);
ok(opened.verified && opened.payload.a === 1, 'release: opens with its passphrase, signature verified');
const relOther = await V.sealRelease({ a: 2 }, other, 'release-pass-123');
ok(!(await V.openRelease(relOther, 'release-pass-123', ks.publicKeys)).verified, 'release signed by another key: not verified');
err = null; try { await V.openRelease(rel, 'nope-nope-nope', ks.publicKeys); } catch (e) { err = e.message; }
ok(err === 'badPassphrase', 'release: wrong passphrase refused');
ok(/^[a-z2-9]{4}(-[a-z2-9]{4}){5}$/.test(V.passphrase()), 'release passphrase: 6 groups of 4');

// Static: no network API in the platform scripts
const NET = /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|\.submit\s*\(|importScripts|new\s+Worker|RTCPeerConnection|localStorage|sessionStorage|indexedDB/;
for (const f of ['js/ifrs-tool.js', 'js/workspace.js', 'js/fth/core.js', 'js/fth/vault.js', 'data/ifrs-data.js', 'data/ifrs-model.js', 'data/ifrs-demo-it.js', 'data/fth-keys.js']) {
  ok(!NET.test(fs.readFileSync(path.join(ROOT, f), 'utf8')), `no network or storage API in ${f}`);
}
ok(/noindex/.test(fs.readFileSync(path.join(ROOT, 'workspace.html'), 'utf8')) && !fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8').includes('workspace'), 'workspace: noindex, not in the sitemap');

// ---------- 3. browser ----------
if (!process.env.PLAYWRIGHT_CORE) { console.log('skip browser tests (PLAYWRIGHT_CORE not set)'); finish(); }
const { chromium } = require(process.env.PLAYWRIGHT_CORE);
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self' https://formspree.io; frame-ancestors 'self';";
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml' };
// The test serves its own copy of data/fth-keys.js (the test key set), the rest from the repo.
const testKeysJs = 'window.FTH_KEYS = ' + JSON.stringify(ks.publicKeys) + ';';
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/data/fth-keys.js') { res.writeHead(200, { 'Content-Type': TYPES['.js'] }); return res.end(testKeysJs); }
  if (p === '/') p = '/index.html';
  let file = path.join(ROOT, p);
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': CSP });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const BASE = 'http://127.0.0.1:' + server.address().port;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/usr/bin/chromium', args: ['--no-sandbox'] });
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'fth-test-'));
const keyPath = path.join(TMP, 'test.fthkey'); fs.writeFileSync(keyPath, JSON.stringify(ks.keyFile));

// An .xlsx of the IT sample, with a 1C-like header, written by SheetJS in Node.
const XLSX = require(path.join(ROOT, 'js/vendor/xlsx-0.20.3.full.min.js'));
const aoa = [[IT.company], ['Оборотно-сальдова відомість за 2025 р.'], [], ['Рахунок', 'Сальдо на початок', '', 'Обороти за період', '', 'Сальдо на кінець', ''], ['', 'Дебет', 'Кредит', 'Дебет', 'Кредит', 'Дебет', 'Кредит']]
  .concat(IT.rows.map((r) => [r[0]].concat(r.slice(1).map((v) => v || ''))));
const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'ОСВ');
const xlsxPath = path.join(TMP, 'osv-it-2025.xlsx'); fs.writeFileSync(xlsxPath, XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));

async function newPage(url, width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [], requests = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  // Privacy check: after load, only static same-origin fonts/images may be fetched (a web font is
  // loaded when Cyrillic text first appears); anything else would be a data path.
  page.on('request', (r) => { if (!/^http:\/\/127\.0\.0\.1:\d+\/(fonts|img)\/[\w.-]+$/.test(r.url()) || !requests.loadedOnce) requests.push(r.url()); });
  await page.goto(BASE + url); await page.waitForLoadState('networkidle');
  requests.loadedOnce = true;
  return { page, ctx, errors, requests, loaded: requests.length };
}
const total = (page, key) => page.$eval(`#fthpStatements [data-total="${key}"]`, (e) => Number(e.textContent.replace(/[\s  ]/g, '').replace(/,(\d\d)$/, '.$1').replace(/,/g, '')));
async function saveDownload(page, click) {
  const [dl] = await Promise.all([page.waitForEvent('download'), click()]);
  const to = path.join(TMP, dl.suggestedFilename()); await dl.saveAs(to); return to;
}

let pkgPath = null;
for (const [url, lang] of [['/ifrs-tool', 'en'], ['/ifrs-tool-ua', 'uk']]) {
  const t = await newPage(url);
  const { page } = t;
  ok(await page.$eval('#fthpChecks', (e) => e.hidden), `${lang}: steps 2-6 hidden before data`);
  await page.click('#fthpDemo1');
  ok(near(await total(page, 'assets-close'), 1770000) && near(await total(page, 'profit'), 250000), `${lang}: sample Добро totals`);
  await page.click('#fthpDemo2');
  ok(near(await total(page, 'profit'), 2069600) && near(await total(page, 'revenue'), 13200000), `${lang}: sample IT totals`);
  ok(await page.$eval('#fthpPnlNote', (e) => !e.hidden && /200/.test(e.textContent)), `${lang}: reconciliation gap shown`);
  await page.setInputFiles('#fthpFile', xlsxPath);
  await page.waitForFunction(() => /osv-it-2025/.test(document.getElementById('fthpFileName').textContent));
  ok(near(await total(page, 'assets-close'), 5025000) && near(await total(page, 'equity-close'), 3844600), `${lang}: uploaded .xlsx (header layout) = sample figures`);
  ok((await page.$eval('#fthpSha', (e) => e.title)).length === 64, `${lang}: file fingerprint shown`);
  await page.setInputFiles('#fthpFile', { name: 'fake.xlsx', mimeType: 'application/vnd.ms-excel', buffer: Buffer.from('<html>') });
  await page.waitForFunction(() => document.getElementById('fthpStatus').classList.contains('is-error'));
  ok(await page.$eval('#fthpChecks', (e) => e.hidden), `${lang}: fake .xlsx refused, previous figures cleared`);
  await page.setInputFiles('#fthpFile', xlsxPath);
  await page.waitForFunction(() => !document.getElementById('fthpChecks').hidden);
  // mapping change: 361 to "not classified" breaks the balance, then back
  await page.selectOption('select[data-code="361"]', '');
  ok(await page.$eval('#fthpBalanceCheck', (e) => e.classList.contains('is-ko')), `${lang}: unclassifying 361 fails the balance check`);
  await page.click('[data-filter="attention"]');
  ok((await page.$$('#fthpAccounts tbody tr')).length === 1, `${lang}: "needs attention" filter shows 1 account`);
  await page.selectOption('select[data-code="361"]', 'Trade receivables');
  ok(await page.$eval('#fthpBalanceCheck', (e) => e.classList.contains('is-ok')), `${lang}: reclassified, balanced again`);
  await page.click('[data-filter="all"]');
  await page.check('input[name="q_leases"][value="yes"]'); await page.check('input[name="q_esop"][value="yes"]');
  ok(await page.$$eval('#fthpIndicators .fthp-std', (els) => els.some((e) => e.textContent === 'IFRS 2') && els.some((e) => e.textContent === 'IFRS 16')), `${lang}: answers add IFRS 2 and IFRS 16`);
  const xl = await saveDownload(page, () => page.click('#fthpXlsx'));
  ok(XLSX.read(fs.readFileSync(xl)).SheetNames.length === 4, `${lang}: Excel export with 4 sheets`);
  await page.click('#fthpSeal');
  ok(await page.$eval('#fthpSendStatus', (e) => e.classList.contains('is-error')), `${lang}: package refused without names and consent`);
  await page.fill('#fthpSendCompany', 'ТОВ «Північ Софт»'); await page.fill('#fthpSendContact', 'Test Contact'); await page.check('#fthpConsent');
  const pkg = await saveDownload(page, () => page.click('#fthpSeal'));
  const env = JSON.parse(fs.readFileSync(pkg, 'utf8'));
  ok(env.format === 'fth-sealed' && env.kind === 'client-package' && !fs.readFileSync(pkg, 'utf8').includes('Північ'), `${lang}: package sealed, no clear text inside`);
  const payload = await V.openForFTH(env, keys, 'client-package');
  ok(payload.tb.rows.length === IT.rows.length && payload.answers.leases === 'yes' && payload.overrides['361'] === 'Trade receivables', `${lang}: package holds TB, answers, mapping choices`);
  if (lang === 'en') pkgPath = pkg;
  ok(t.requests.length === t.loaded, `${lang}: no request after page load (${t.requests.length - t.loaded})`);
  ok(!t.errors.length, `${lang}: no console error ${t.errors.join(' | ')}`);
  await page.screenshot({ path: path.join(SHOTS, `portal-${lang}-1440.png`), fullPage: true });
  await t.ctx.close();
}
{ // mobile
  const t = await newPage('/ifrs-tool-ua', 390);
  await t.page.click('#fthpDemo2');
  const over = await t.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 0, 'portal 390 px: no horizontal scroll (' + over + ')');
  await t.page.screenshot({ path: path.join(SHOTS, 'portal-uk-390.png'), fullPage: true });
  await t.ctx.close();
}

// Workspace
let releasePath = null, passphrase = null, wsProfit = null, workPath = null;
{
  const t = await newPage('/workspace');
  const { page } = t;
  await page.setInputFiles('#fthwKeyFile', keyPath); await page.fill('#fthwPass', 'wrong passphrase'); await page.click('#fthwUnlock');
  await page.waitForFunction(() => document.getElementById('fthwLockStatus').classList.contains('is-error'));
  ok(true, 'workspace: wrong passphrase refused');
  await page.fill('#fthwPass', 'correct horse battery staple'); await page.click('#fthwUnlock');
  await page.waitForSelector('#fthwStart:not([hidden])');
  await page.setInputFiles('#fthwOpenPkg', pkgPath);
  ok(await page.$eval('#fthwStartStatus', (e) => e.classList.contains('is-error')), 'workspace: name required before opening');
  await page.fill('#fthwUser', 'Reviewer One');
  await page.setInputFiles('#fthwOpenPkg', pkgPath);
  await page.waitForSelector('#fthwApp:not([hidden])');
  ok(/Північ/.test(await page.textContent('#fthwHead')), 'workspace: client package opened');
  // calculators: lease -> journal -> approve
  await page.click('#fthwNav button:nth-child(5)');
  const card = page.locator('.fthw-card').first();
  await card.locator('input[type=date]').fill('2025-01-01');
  await card.locator('input[type=number]').nth(0).fill('36');
  await card.locator('input[type=number]').nth(1).fill('40000');
  await card.getByRole('button').first().click();
  await card.locator('.fthw-res').waitFor();
  await card.locator('.btn-green').click();
  await page.waitForSelector('.fthw-editor');
  ok(/Balanced/.test(await page.textContent('.fthw-bal')), 'workspace: lease journal pre-filled and balanced');
  await page.locator('.fthw-editor .btn-green').click();
  await page.waitForSelector('.fthw-pill.is-approved');
  ok(true, 'workspace: journal approved');
  // extraction correction for the VAT in revenue
  await page.click('.fthw-top .btn-green');
  const ed = page.locator('.fthw-editor');
  await ed.locator('select').nth(1).selectOption('extraction');
  await ed.locator('input[type=text]').first().fill('VAT debited to account 70');
  await ed.locator('table select').first().selectOption('Revenue');
  await ed.locator('table input[type=number]').first().fill('200000');
  await ed.locator('table button').nth(1).click();
  await ed.locator('.btn-green').click();
  await page.waitForFunction(() => document.querySelectorAll('.fthw-pill.is-approved').length === 2);
  // statements: IFRS profit = local - lease effect
  await page.click('#fthwNav button:nth-child(6)');
  ok(await page.$eval('.fthw-main .ifrs-check', (e) => e.classList.contains('is-ok')), 'workspace: statements balanced with adjustments');
  // review: note, status, release
  await page.click('#fthwNav button:nth-child(7)');
  ok(await page.$eval('#fthwRelease', (e) => e.disabled), 'workspace: release blocked before review');
  await page.fill('#fthwNoteText', 'Check lease term with the contract');
  await page.click('#fthwAddNote');
  ok(await page.$eval('#fthwRelease', (e) => e.disabled), 'workspace: release still blocked with an open note');
  await page.click('.fthw-notes .fthw-link');
  await page.click('[data-status=in_review]');
  await page.click('[data-status=reviewed]');
  passphrase = await page.inputValue('#fthwRelPass');
  releasePath = await saveDownload(page, () => page.click('#fthwRelease'));
  ok(/\.fthres$/.test(releasePath) && /Released|Випущено/.test(await page.textContent('#fthwStatusPill')), 'workspace: signed release created, status released');
  workPath = await saveDownload(page, () => page.click('#fthwSave'));
  ok(JSON.parse(fs.readFileSync(workPath, 'utf8')).kind === 'working-file', 'workspace: working file saved (sealed)');
  const work = await V.openForFTH(JSON.parse(fs.readFileSync(workPath, 'utf8')), keys, 'working-file');
  ok(work.journals.length === 2 && work.audit.some((a) => a.action === 'release') && work.review.notes[0].resolved, 'working file: journals, resolved note and audit trail');
  wsProfit = C.compute(M, work.tb, { overrides: work.overrides, journals: work.journals }).totals.ifrs.profit;
  // reopen the working file
  await page.click('#fthwClose');
  await page.waitForSelector('#fthwStart:not([hidden])');
  await page.setInputFiles('#fthwOpenWork', workPath);
  await page.waitForSelector('#fthwApp:not([hidden])');
  ok(/Released|Випущено/.test(await page.textContent('#fthwStatusPill')), 'workspace: working file reopened');
  await page.screenshot({ path: path.join(SHOTS, 'workspace-1440.png'), fullPage: true });
  await page.click('#fthwNav button:nth-child(6)');
  await page.screenshot({ path: path.join(SHOTS, 'workspace-statements-1440.png'), fullPage: true });
  ok(t.requests.length === t.loaded, `workspace: no request after page load (${t.requests.slice(t.loaded).join(', ')})`);
  ok(!t.errors.length, 'workspace: no console error ' + t.errors.join(' | '));
  await t.ctx.close();
}
{ // client opens the release
  const t = await newPage('/ifrs-tool');
  const { page } = t;
  await page.setInputFiles('#fthpResFile', releasePath); await page.fill('#fthpResPass', 'bad-pass-word'); await page.click('#fthpResOpen');
  await page.waitForFunction(() => document.getElementById('fthpResStatus').classList.contains('is-error'));
  ok(await page.$eval('#fthpResView', (e) => e.hidden), 'portal: release refused with a wrong passphrase');
  await page.fill('#fthpResPass', passphrase); await page.click('#fthpResOpen');
  await page.waitForSelector('#fthpResView:not([hidden])');
  ok(/verified/.test(await page.textContent('#fthpResStatus')), 'portal: FTH signature verified');
  const shown = await page.$eval('#fthpResPnl [data-total="profit"]', (e) => Number(e.textContent.replace(/[\s  ,]/g, '')));
  ok(near(shown, wsProfit), `portal: released profit ${shown} = workspace IFRS profit ${C.round2(wsProfit)}`);
  ok((await page.$$('#fthpResBalance thead th')).length === 5, 'portal: released with Local GAAP / adjustments / IFRS columns');
  ok(t.requests.length === t.loaded && !t.errors.length, 'portal (results): no request, no error');
  await page.locator('#fthpResults').screenshot({ path: path.join(SHOTS, 'portal-results-1440.png') });
  await t.ctx.close();
}
await browser.close(); server.close();
fs.rmSync(TMP, { recursive: true, force: true });
finish();

function finish() {
  console.log(failures ? `\n${failures} FAILED` : '\nall passed', '· screenshots in', SHOTS);
  process.exit(failures ? 1 : 0);
}
