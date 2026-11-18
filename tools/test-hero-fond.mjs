// Tests du haut de page à vidéo de fond (js/hero-fond.js), sur les deux accueils.
// Lancer : python3 -m http.server 8769 --bind 127.0.0.1 (depuis la racine du site) puis
//          PLAYWRIGHT_CORE=/home/auxence/dev/wt-fth-video/node_modules/playwright-core node tools/test-hero-fond.mjs
// Doit afficher « all passed ».
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ? process.env.PLAYWRIGHT_CORE + '/index.mjs' : 'playwright-core');
const BASE = process.env.BASE || 'http://127.0.0.1:8769';
const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
let ok = true; const fail = m => { ok = false; console.log('FAIL', m); };
const trait = pg => pg.evaluate(() => {
  const s = document.querySelector('.trait-kyiv'), p = s && s.querySelector('path');
  const tot = p && p.style.strokeDasharray ? parseFloat(p.style.strokeDasharray) : 0;
  const off = p && p.style.strokeDashoffset ? parseFloat(p.style.strokeDashoffset) : tot;
  const vis = !!s && getComputedStyle(s).display !== 'none' && getComputedStyle(s).visibility !== 'hidden';
  return { y: Math.round(scrollY), dessine: Math.round(tot - off), total: Math.round(tot), visible: vis };
});

for (const page of ['index.html', 'en.html']) {
  // 1. défilement : avance, s'arrête, recule, jamais de défilement automatique
  for (const [nom, vp] of [['bureau', { width: 1440, height: 900 }], ['telephone', { width: 390, height: 844 }]]) {
    const pg = await b.newPage({ viewport: vp });
    const errs = []; pg.on('pageerror', e => errs.push(String(e)));
    await pg.goto(`${BASE}/${page}`, { waitUntil: 'load' }); await pg.waitForTimeout(7500);
    const e0 = await trait(pg);
    if (e0.y !== 0) fail(`${page} ${nom}: la page a défilé seule`);
    if (!(e0.dessine > 0)) fail(`${page} ${nom}: pas de trait initial ${JSON.stringify(e0)}`);
    await pg.waitForTimeout(1200); const e1 = await trait(pg);
    if (e1.y !== 0 || Math.abs(e1.dessine - e0.dessine) > 1) fail(`${page} ${nom}: bouge sans défilement`);
    let prec = e1.dessine, fin;
    for (let i = 0; i < 45; i++) { await pg.mouse.wheel(0, 35); await pg.waitForTimeout(50); fin = await trait(pg); if (fin.dessine + 1 < prec) fail(`${page} ${nom}: recule en descendant`); prec = fin.dessine; }
    if (fin.dessine < fin.total - 2) fail(`${page} ${nom}: le bouton n'est pas entouré ${JSON.stringify(fin)}`);
    for (let i = 0; i < 60; i++) { await pg.mouse.wheel(0, -40); await pg.waitForTimeout(40); const r = await trait(pg); if (r.dessine > prec + 1) fail(`${page} ${nom}: avance en remontant`); prec = r.dessine; }
    const r = await trait(pg);
    if (r.y !== 0 || Math.abs(r.dessine - e1.dessine) > 1) fail(`${page} ${nom}: ne revient pas au départ ${JSON.stringify(r)}`);
    if (errs.length) fail(`${page} ${nom}: erreurs JS ${errs}`);
    await pg.close();
  }
  // 2. clic sur le bouton : le trait disparaît, ne recoupe aucune question ni réponse
  {
    const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await pg.goto(`${BASE}/${page}`, { waitUntil: 'load' }); await pg.waitForTimeout(7500);
    for (let i = 0; i < 20; i++) { await pg.mouse.wheel(0, 40); await pg.waitForTimeout(40); }
    await pg.click('.hc-start'); await pg.waitForTimeout(300);
    for (let i = 0; i < 5; i++) { await pg.mouse.wheel(0, 30); await pg.waitForTimeout(40); }
    await pg.setViewportSize({ width: 1300, height: 900 }); await pg.waitForTimeout(200);
    const t = await trait(pg);
    const chevauche = await pg.evaluate(() => {
      const s = document.querySelector('.trait-kyiv'); if (!s || getComputedStyle(s).display === 'none' || getComputedStyle(s).visibility === 'hidden') return false;
      const bb = s.querySelector('path').getBoundingClientRect();
      return [...document.querySelectorAll('.hc-opt, .hc-q, .hc-step')].some(e => { const r = e.getBoundingClientRect(); return !(r.right < bb.left || r.left > bb.right || r.bottom < bb.top || r.top > bb.bottom); });
    });
    if (t.visible || chevauche) fail(`${page}: le trait reste après le clic ${JSON.stringify(t)} chevauche=${chevauche}`);
    await pg.close();
  }
  // 3. redimensionnement : la page retrouve sa hauteur (le trait ne se mesure pas lui-même)
  {
    const pg = await b.newPage({ viewport: { width: 1440, height: 800 } });
    await pg.goto(`${BASE}/${page}`, { waitUntil: 'load' }); await pg.waitForTimeout(7500);
    const h0 = await pg.evaluate(() => document.documentElement.scrollHeight);
    await pg.setViewportSize({ width: 390, height: 800 }); await pg.waitForTimeout(400);
    await pg.setViewportSize({ width: 1440, height: 800 }); await pg.waitForTimeout(400);
    const h1 = await pg.evaluate(() => document.documentElement.scrollHeight);
    if (h1 !== h0) fail(`${page}: hauteur de page ${h0} puis ${h1} après redimensionnement`);
    await pg.close();
  }
  // 4. mouvement réduit : image finale, pas de lecture ni de téléchargement, trait posé
  {
    const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const pg = await ctx.newPage(); const videos = [];
    pg.on('request', r => { if (/\.(mp4|webm)$/.test(r.url())) videos.push(r.url()); });
    await pg.goto(`${BASE}/${page}`, { waitUntil: 'load' }); await pg.waitForTimeout(1500);
    const v = await pg.evaluate(() => { const v = document.querySelector('.hero-fond video'); return { paused: v.paused, poster: v.getAttribute('poster') }; });
    for (let i = 0; i < 20; i++) { await pg.mouse.wheel(0, 40); await pg.waitForTimeout(30); }
    const t = await trait(pg);
    if (!v.paused || !/fth-fond-v1\.jpg$/.test(v.poster)) fail(`${page}: mouvement réduit, vidéo ${JSON.stringify(v)}`);
    if (videos.length) fail(`${page}: mouvement réduit, vidéo téléchargée ${videos}`);
    if (t.dessine < t.total - 2) fail(`${page}: mouvement réduit, trait pas posé ${JSON.stringify(t)}`);
    await ctx.close();
  }
}
await b.close();
console.log(ok ? 'all passed' : 'FAILED');
process.exit(ok ? 0 : 1);
