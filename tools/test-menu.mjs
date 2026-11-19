// Barre de menu : à toute largeur, le logo garde sa taille (74 x 48), les deux boutons de langue restent à l'écran et rien ne se chevauche.
// Défaut du 19/11/2026 : le menu ukrainien, plus large depuis l'onglet « Інструмент МСФЗ », écrasait le logo (0 px à 800 px) et poussait « EN » hors de l'écran.
// Lancer : python3 tools/serveur-range.py 8769 . puis
//          PLAYWRIGHT_CORE=/home/auxence/dev/wt-fth-video/node_modules/playwright-core node tools/test-menu.mjs
// Doit afficher « all passed ». BASE=https://… pour viser un autre serveur (alors sans .html : PAGES=/,/en,/blog-ua).
const { chromium } = await import(process.env.PLAYWRIGHT_CORE ? process.env.PLAYWRIGHT_CORE + '/index.mjs' : 'playwright-core');
const BASE = process.env.BASE || 'http://127.0.0.1:8769';
const PAGES = (process.env.PAGES || '/index.html,/en.html,/blog-ua.html,/blog.html,/ifrs-tool-ua.html,/blog/ifrs-16-leases-it-ua.html').split(',');
const b = await chromium.launch({ executablePath: '/usr/bin/chromium' });
let ok = true, n = 0; const fail = m => { ok = false; console.log('FAIL', m); };
const pg = await b.newPage();
for (const p of PAGES) {
  await pg.setViewportSize({ width: 1280, height: 700 });
  await pg.goto(BASE + p, { waitUntil: 'load' });
  const largeurs = [320, 360, 375, 414, 480, 600, 700, 768];
  for (let w = 769; w <= 1200; w++) largeurs.push(w);                      // au pixel près là où le menu est plein
  for (let w = 1240; w <= 1920; w += 40) largeurs.push(w);
  for (const w of largeurs) {
    await pg.setViewportSize({ width: w, height: 700 });
    const r = await pg.evaluate(() => {
      const de = document.documentElement, box = e => e.getBoundingClientRect(), vu = e => !!e && e.getClientRects().length > 0;
      const logo = box(document.querySelector('.nav-logo-img'));
      const langues = [...document.querySelectorAll('.navbar .lang-btn')].map(box);
      const liens = [...document.querySelectorAll('#navMenu > li')].filter(vu).map(box);
      const droite = box(document.querySelector('.nav-right'));
      const cont = document.querySelector('.navbar .container'), cb = box(cont), pr = parseFloat(getComputedStyle(cont).paddingRight);
      return { horsCadre: Math.round((droite.right - (cb.right - pr)) * 10) / 10, debord: de.scrollWidth - de.clientWidth, logo: [Math.round(logo.width), Math.round(logo.height)], larg: de.clientWidth,
        languesDehors: [...document.querySelectorAll('.navbar .lang-btn')].filter(e => { const l = box(e), m = document.elementFromPoint(l.left + l.width / 2, l.top + l.height / 2); return l.width === 0 || l.left < 0 || l.right > de.clientWidth + 0.5 || !m || !e.contains(m); }).length, nbLangues: langues.length,
        ancres: [...document.querySelectorAll('#navMenu > li')].filter(vu).filter(li => /#(system|process|deliverables|why)$/.test(li.querySelector('a').getAttribute('href'))).length,
        burger: vu(document.getElementById('mobileToggle')), nbLiens: liens.length, lignes: new Set(liens.map(l => Math.round(l.top))).size,
        menuSurLogo: liens.length ? Math.round(logo.right - liens[0].left) : -1, menuSurDroite: liens.length ? Math.round(liens[liens.length - 1].right - droite.left) : -1 };
    });
    n++; const ou = `${p} à ${w} px`;
    if (r.debord > 0) fail(`${ou}: la page déborde de ${r.debord} px`);
    if (r.logo[0] < 73 || r.logo[1] !== 48) fail(`${ou}: logo ${r.logo.join(' x ')} au lieu de 74 x 48`);
    if (r.horsCadre > 0.5) fail(`${ou}: la barre dépasse son cadre de ${r.horsCadre} px à droite`);
    if (r.nbLangues !== 2 || r.languesDehors) fail(`${ou}: bouton de langue hors de l'écran`);
    if (w <= 768) { if (!r.burger) fail(`${ou}: pas de bouton de menu`); }
    else {
      if (r.burger) fail(`${ou}: bouton de menu affiché sur grand écran`);
      if (r.nbLiens < 5) fail(`${ou}: menu vide (${r.nbLiens} liens)`);
      if (r.lignes !== 1) fail(`${ou}: menu sur ${r.lignes} lignes`);
      if (r.menuSurLogo > 0 || r.menuSurDroite > 0) fail(`${ou}: le menu chevauche le logo (${r.menuSurLogo}) ou les langues (${r.menuSurDroite})`);
      if (w >= 1024 && r.nbLiens < 9) fail(`${ou}: menu incomplet (${r.nbLiens} liens)`);
      if (r.ancres !== (w >= 1024 ? 4 : 0)) fail(`${ou}: ${r.ancres} ancres secondaires visibles (4 attendues à partir de 1024 px, 0 en dessous)`);
    }
  }
  // menu replié du téléphone : il s'ouvre et garde ses écarts (une règle de la barre large ne doit pas le resserrer)
  await pg.setViewportSize({ width: 375, height: 800 }); await pg.click('#mobileToggle');
  const ecart = await pg.evaluate(() => { const li = [...document.querySelectorAll('#navMenu > li')].filter(e => e.getClientRects().length); return li.length < 9 ? -1 : Math.round(li[2].getBoundingClientRect().top - li[1].getBoundingClientRect().bottom); });
  n++; if (ecart < 16) fail(`${p} à 375 px, menu ouvert: écart entre les liens de ${ecart} px (16 au moins)`);
}
await b.close();
console.log(ok ? `all passed (${n} mesures)` : 'FAILED');
process.exit(ok ? 0 : 1);
