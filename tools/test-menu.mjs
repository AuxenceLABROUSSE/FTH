// Barre de menu : à toute largeur, le logo garde sa taille (74 x 48), les deux boutons de langue restent à l'écran et rien ne se chevauche.
// Depuis le 19/11/2026 le menu est replié jusqu'à 1023 px (le menu ukrainien ne tient pas dans la barre en dessous).
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
  for (let w = 769; w <= 1200; w++) largeurs.push(w);                      // au pixel près autour des deux seuils (menu replié jusqu'à 1023 px, bouton d'appel à 1151)
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
        burger: vu(document.getElementById('mobileToggle')), nbLiens: liens.length, lignes: new Set(liens.map(l => Math.round(l.top))).size,
        menuSurLogo: liens.length ? Math.round(logo.right - liens[0].left) : -1, menuSurDroite: liens.length ? Math.round(liens[liens.length - 1].right - droite.left) : -1 };
    });
    n++; const ou = `${p} à ${w} px`;
    if (r.debord > 0) fail(`${ou}: la page déborde de ${r.debord} px`);
    if (r.logo[0] < 73 || r.logo[1] !== 48) fail(`${ou}: logo ${r.logo.join(' x ')} au lieu de 74 x 48`);
    if (r.horsCadre > 0.5) fail(`${ou}: la barre dépasse son cadre de ${r.horsCadre} px à droite`);
    if (r.nbLangues !== 2 || r.languesDehors) fail(`${ou}: bouton de langue hors de l'écran`);
    if (w <= 1023) { if (!r.burger) fail(`${ou}: pas de bouton de menu`); if (r.nbLiens) fail(`${ou}: liens du menu visibles alors qu'il est replié`); }
    else {
      if (r.burger) fail(`${ou}: bouton de menu affiché sur grand écran`);
      if (r.lignes !== 1) fail(`${ou}: menu sur ${r.lignes} lignes`);
      if (r.menuSurLogo > 0 || r.menuSurDroite > 0) fail(`${ou}: le menu chevauche le logo (${r.menuSurLogo}) ou les langues (${r.menuSurDroite})`);
      if (r.nbLiens !== 9) fail(`${ou}: menu incomplet (${r.nbLiens} liens visibles, 9 attendus)`);
    }
  }
  // menu replié (téléphone, tablette, écran bas) : il s'ouvre, montre les 9 liens et le bouton d'appel, garde ses écarts,
  // chaque lien reste atteignable, Échap le referme, et il se referme seul quand la fenêtre repasse à 1024 px
  for (const [w, h] of [[375, 800], [800, 1000], [1023, 700], [800, 420], [667, 375]]) {
    await pg.setViewportSize({ width: w, height: h });
    if (!await pg.click('#mobileToggle', { timeout: 3000 }).then(() => true, () => false)) { n++; fail(`${p} à ${w} x ${h}: pas de bouton de menu à cliquer`); continue; }
    const m = await pg.evaluate(async () => {
      const menu = document.getElementById('navMenu'), li = [...menu.querySelectorAll(':scope > li')].filter(e => e.getClientRects().length);
      const atteints = [];
      for (const e of li) { e.scrollIntoView({ block: 'center' }); await new Promise(r => requestAnimationFrame(r)); const r = e.querySelector('a').getBoundingClientRect(), x = document.elementFromPoint(r.left + 5, r.top + r.height / 2); atteints.push(r.top >= 0 && r.bottom <= innerHeight && !!x && e.contains(x)); }
      menu.scrollTop = 0;
      return { ouvert: menu.classList.contains('active') && document.getElementById('mobileToggle').getAttribute('aria-expanded') === 'true', liens: li.length, appel: !!menu.querySelector('.nav-menu-cta a')?.getClientRects().length,
        haut: Math.round(li[0].getBoundingClientRect().top), bas: Math.round(innerHeight - li[li.length - 1].getBoundingClientRect().bottom), gauche: Math.round(li[1].getBoundingClientRect().left - document.querySelector('.nav-logo-img').getBoundingClientRect().left), graisse: getComputedStyle(menu.querySelector('.nav-tool a')).fontWeight, defile: menu.scrollHeight > menu.clientHeight + 1,
        ecart: li.length > 2 ? Math.round(li[2].getBoundingClientRect().top - li[1].getBoundingClientRect().bottom) : -1, inatteignables: atteints.filter(a => !a).length };
    });
    n++; const ou = `${p} à ${w} x ${h}, menu ouvert`;
    if (!m.ouvert) fail(`${ou}: le menu ne s'ouvre pas`);
    if (m.liens !== 10 || !m.appel) fail(`${ou}: ${m.liens} entrées (9 liens + le bouton d'appel attendus), bouton d'appel ${m.appel}`);
    if (m.ecart < 16) fail(`${ou}: écart entre les liens de ${m.ecart} px (16 au moins)`);
    if (m.inatteignables) fail(`${ou}: ${m.inatteignables} lien(s) inatteignable(s)`);
    if (!m.defile && Math.abs(m.haut - m.bas) > 2) fail(`${ou}: menu pas centré dans l'écran (${m.haut} px au-dessus, ${m.bas} px au-dessous)`);
    if (m.defile && m.haut < 81) fail(`${ou}: au repos, le premier lien est sous la barre (${m.haut} px)`);
    if (Math.abs(m.gauche) > 1) fail(`${ou}: liens pas alignés sur le logo (${m.gauche} px)`);
    if (m.graisse !== '700') fail(`${ou}: pastille de l'outil en graisse ${m.graisse} (700 attendu)`);
    await pg.keyboard.press('Escape');
    if (await pg.evaluate(() => document.getElementById('navMenu').classList.contains('active'))) fail(`${ou}: Échap ne referme pas le menu`);
  }
  await pg.setViewportSize({ width: 900, height: 800 }); await pg.click('#mobileToggle', { timeout: 3000 }).catch(() => fail(`${p} à 900 px: pas de bouton de menu à cliquer`)); await pg.setViewportSize({ width: 1024, height: 800 }); await pg.waitForTimeout(100);
  n++; if (await pg.evaluate(() => document.getElementById('navMenu').classList.contains('active') || document.body.style.overflow === 'hidden')) fail(`${p}: le menu reste ouvert en repassant à 1024 px`);
}
await b.close();
console.log(ok ? `all passed (${n} mesures)` : 'FAILED');
process.exit(ok ? 0 : 1);
