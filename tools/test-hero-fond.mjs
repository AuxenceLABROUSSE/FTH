// Tests du haut de page à vidéo de fond (js/hero-fond.js), sur les deux accueils.
// Lancer : un serveur qui gère les requêtes partielles (Range, comme nginx ; python3 -m http.server ne le fait pas et une vidéo n'y est pas positionnable),
//          python3 tools/serveur-range.py 8769 . (depuis la racine du site), puis
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
  // 3b. téléphone : la carte est sous le texte, la vidéo attend d'être à l'écran pour se jouer
  {
    const pg = await b.newPage({ viewport: { width: 390, height: 660 }, isMobile: true, hasTouch: true });
    await pg.goto(`${BASE}/${page}`, { waitUntil: 'load' }); await pg.waitForTimeout(3000);
    const avant = await pg.evaluate(() => document.querySelector('.hero-fond video').currentTime);
    if (avant > 0) fail(`${page}: téléphone, la vidéo s'est jouée hors de l'écran (${avant} s)`);
    await pg.evaluate(() => { const v = document.querySelector('.hero-fond'); scrollTo(0, v.getBoundingClientRect().top + scrollY - 80); });
    await pg.waitForTimeout(7000);
    const apres = await pg.evaluate(() => { const v = document.querySelector('.hero-fond video'); return { t: v.currentTime, ended: v.ended }; });
    if (!apres.ended) fail(`${page}: téléphone, la vidéo ne s'est pas jouée une fois visible ${JSON.stringify(apres)}`);
    await pg.close();
  }
  // 3b bis. téléphone en paysage : la carte est plus haute que l'écran, la vidéo doit quand même se jouer
  {
    const pg = await b.newPage({ viewport: { width: 880, height: 340 }, isMobile: true, hasTouch: true });
    await pg.goto(`${BASE}/${page}`, { waitUntil: 'load' }); await pg.waitForTimeout(1500);
    await pg.evaluate(() => { const v = document.querySelector('.hero-fond'); scrollTo(0, v.getBoundingClientRect().top + scrollY); });
    await pg.waitForTimeout(7000);
    const apres = await pg.evaluate(() => { const v = document.querySelector('.hero-fond video'); return { t: v.currentTime, ended: v.ended }; });
    if (!apres.ended) fail(`${page}: téléphone en paysage, la vidéo ne s'est pas jouée ${JSON.stringify(apres)}`);
    await pg.close();
  }
  // 3b ter. arrivée déjà sous la carte (lien /#section, rechargement plus bas) : pas de lecture hors champ, carte finale, trait posé
  for (const [nom, vp, aller] of [
    ['ancre telephone', { width: 390, height: 844 }, pg => pg.goto(`${BASE}/${page}#services`, { waitUntil: 'load' })],
    ['rechargement bureau y=700', { width: 1440, height: 900 }, async pg => { await pg.goto(`${BASE}/${page}`, { waitUntil: 'load' }); await pg.evaluate(() => scrollTo(0, 700)); await pg.reload({ waitUntil: 'load' }); }],
  ]) {
    const pg = await b.newPage({ viewport: vp, isMobile: vp.width < 500, hasTouch: vp.width < 500 });
    await aller(pg); await pg.waitForTimeout(3000);
    const v = await pg.evaluate(() => { const v = document.querySelector('.hero-fond video'); return { t: v.currentTime, paused: v.paused, poster: v.poster, y: scrollY }; });
    const t = await trait(pg);
    if (v.y < 300) fail(`${page} ${nom}: la page n'est pas arrivée plus bas (y=${v.y})`);
    if (!v.paused || v.ended || (v.t > 0 && v.t < 4.8)) fail(`${page} ${nom}: vidéo jouée hors champ ou arrêtée en cours de route ${JSON.stringify(v)}`);   // à l'arrêt, jamais lue ou sur sa dernière image
    if (!/fth-fond-v1\.jpg$/.test(v.poster)) fail(`${page} ${nom}: affiche ${v.poster}`);
    if (!(t.dessine > 0)) fail(`${page} ${nom}: pas de trait ${JSON.stringify(t)}`);
    await pg.close();
  }
  // 3b quater. le visiteur descend sous la carte pendant la lecture : la vidéo s'arrête, le trait est là
  {
    const pg = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await pg.goto(`${BASE}/${page}`, { waitUntil: 'load' }); await pg.waitForTimeout(1500);
    const avant = await pg.evaluate(() => { const v = document.querySelector('.hero-fond video'); return { paused: v.paused, t: v.currentTime }; });
    if (avant.paused || !(avant.t > 0)) fail(`${page}: la vidéo ne jouait pas avant de descendre ${JSON.stringify(avant)}`);
    await pg.evaluate(() => scrollTo(0, document.querySelector('.questionnaire-sous-fond').getBoundingClientRect().top + scrollY));
    await pg.waitForTimeout(1500);
    const v = await pg.evaluate(() => { const v = document.querySelector('.hero-fond video'); return { paused: v.paused, ended: v.ended, t: v.currentTime, d: v.duration, top: Math.round(v.getBoundingClientRect().top) }; });
    const t = await trait(pg);
    if (!(v.top < 0) || !v.paused) fail(`${page}: vidéo qui continue hors champ ${JSON.stringify(v)}`);
    if (!(v.t >= v.d - 0.2) || v.ended) fail(`${page}: après être passé sous la carte, la vidéo n'est pas sur sa dernière image ${JSON.stringify(v)}`);
    if (!(t.dessine > 0)) fail(`${page}: pas de trait après être passé sous la carte ${JSON.stringify(t)}`);
    await pg.close();
  }
  // 3b septies. carte vue, remontée vers le texte (pause), puis saut d'un coup sous la carte : image finale et trait
  {
    const pg = await b.newPage({ viewport: { width: 390, height: 560 }, isMobile: true, hasTouch: true });
    await pg.goto(`${BASE}/${page}`, { waitUntil: 'load' }); await pg.waitForTimeout(800);
    await pg.evaluate(() => scrollTo(0, document.querySelector('.hero-fond').getBoundingClientRect().top + scrollY - 40)); await pg.waitForTimeout(1500);
    await pg.evaluate(() => scrollTo({ top: 0, behavior: 'instant' })); await pg.waitForTimeout(600);
    const pause = await pg.evaluate(() => { const v = document.querySelector('.hero-fond video'); return { paused: v.paused, t: v.currentTime }; });
    if (!pause.paused || !(pause.t > 0)) fail(`${page}: remontée vers le texte, pas de pause en cours de lecture ${JSON.stringify(pause)}`);
    await pg.evaluate(() => scrollTo({ top: 2500, behavior: 'instant' })); await pg.waitForTimeout(1500);
    const v = await pg.evaluate(() => { const v = document.querySelector('.hero-fond video'); return { t: v.currentTime, d: v.duration, ended: v.ended }; });
    const t = await trait(pg);
    if (!(v.t >= v.d - 0.2) || v.ended) fail(`${page}: saut après une pause, pas sur la dernière image ${JSON.stringify(v)}`);
    if (!(t.dessine > 0)) fail(`${page}: saut après une pause, pas de trait ${JSON.stringify(t)}`);
    await pg.close();
  }
  // 3b sexies. saut d'un coup par-dessus la carte, depuis un écran où elle n'est pas encore visible : carte finale et trait
  {
    const pg = await b.newPage({ viewport: { width: 390, height: 560 }, isMobile: true, hasTouch: true });
    await pg.goto(`${BASE}/${page}`, { waitUntil: 'load' }); await pg.waitForTimeout(1500);
    await pg.evaluate(() => scrollTo({ top: 2500, behavior: 'instant' })); await pg.waitForTimeout(2000);
    const v = await pg.evaluate(() => { const v = document.querySelector('.hero-fond video'); return { t: v.currentTime, poster: v.poster }; });
    const t = await trait(pg);
    if (v.t > 0 || !/fth-fond-v1\.jpg$/.test(v.poster)) fail(`${page}: saut par-dessus la carte ${JSON.stringify(v)}`);
    if (!(t.dessine > 0)) fail(`${page}: saut par-dessus la carte, pas de trait ${JSON.stringify(t)}`);
    await pg.close();
  }
  // 3b quinquies. vidéo qui ne se charge jamais : au bout du filet, carte finale et trait, jamais la première image
  {
    const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await pg.route(/\.(mp4|webm)$/, () => {});               // la requête ne répond jamais
    await pg.goto(`${BASE}/${page}`, { waitUntil: 'load' }); await pg.waitForTimeout(16500);
    const poster = await pg.evaluate(() => document.querySelector('.hero-fond video').poster);
    const t = await trait(pg);
    if (!/fth-fond-v1\.jpg$/.test(poster)) fail(`${page}: chargement bloqué, affiche ${poster}`);
    if (!(t.dessine > 0)) fail(`${page}: chargement bloqué, pas de trait ${JSON.stringify(t)}`);
    await pg.close();
  }
  // 3b octies. vidéo lente : passage sous la carte pendant le chargement (4 s), puis filet de 15 s avant une arrivée tardive (18 s)
  //           l'affiche finale reste seule, la vidéo n'affiche jamais sa première image et ne repart jamais
  for (const [nom, retard, sauter, attente] of [['saut pendant le chargement', 4000, true, 7000], ['arrivée après le filet', 18000, false, 22000]]) {
    const pg = await b.newPage({ viewport: { width: 390, height: 560 }, isMobile: true, hasTouch: true });
    await pg.route(/\.(mp4|webm)$/, async r => { await new Promise(f => setTimeout(f, retard)); try { await r.continue(); } catch {} });
    await pg.goto(`${BASE}/${page}`, { waitUntil: 'load' }); await pg.waitForTimeout(600);
    await pg.evaluate(() => scrollTo(0, document.querySelector('.hero-fond').getBoundingClientRect().top + scrollY - 40)); await pg.waitForTimeout(600);
    if (sauter) await pg.evaluate(() => scrollTo({ top: 2500, behavior: 'instant' }));
    let joue = false;
    for (let i = 0; i < attente / 500; i++) { await pg.waitForTimeout(500); joue = joue || await pg.evaluate(() => { const v = document.querySelector('.hero-fond video'); return v.poster.endsWith('fth-fond-v1.jpg') && (!v.paused || v.readyState > 0); }); }
    const v = await pg.evaluate(() => { const v = document.querySelector('.hero-fond video'); return { poster: v.poster, paused: v.paused, readyState: v.readyState }; });
    const t = await trait(pg);
    if (!/fth-fond-v1\.jpg$/.test(v.poster) || joue) fail(`${page} ${nom}: la vidéo arrivée en retard passe devant l'affiche finale ${JSON.stringify(v)}`);
    if (!(t.total > 0)) fail(`${page} ${nom}: pas de trait ${JSON.stringify(t)}`);
    await pg.close();
  }
  // 3c. lecture refusée (économie d'énergie) : image finale de la carte et trait posé, jamais la première image presque vide
  {
    const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await pg.addInitScript(() => { HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException('refus', 'NotAllowedError')); }; });
    await pg.goto(`${BASE}/${page}`, { waitUntil: 'load' }); await pg.waitForTimeout(2500);
    const v = await pg.evaluate(() => document.querySelector('.hero-fond video').poster);
    const t = await trait(pg);
    if (!/fth-fond-v1\.jpg$/.test(v)) fail(`${page}: lecture refusée, affiche ${v}`);
    if (!(t.dessine > 0)) fail(`${page}: lecture refusée, pas de trait ${JSON.stringify(t)}`);
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
