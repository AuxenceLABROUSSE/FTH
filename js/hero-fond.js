/* Haut de page FTH : la vidéo de fond (carte, Ukraine, réseau) se joue une fois et s'arrête sur sa dernière image.
   Puis un trait vert plus épais part de Kyiv et descend jusqu'au bas du premier écran.
   Ensuite, c'est le DÉFILEMENT DU VISITEUR qui le fait avancer (aucun minuteur, aucun défilement automatique) :
   il s'arrête quand le visiteur s'arrête, recule quand il remonte, et finit par entourer « Почати опитування ». */
(function () {
  var KYIV = [1640, 470], VW = 1920, VH = 1080;      // position finale de Kyiv dans la vidéo (fond.json)
  var MARGE_BAS = 40;                                // la pointe du trait reste à 40 px du bas de l'écran
  var video = document.querySelector('.hero-fond video');
  if (!video) return;
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'trait-kyiv'); svg.setAttribute('aria-hidden', 'true');
  var path = document.createElementNS(NS, 'path');
  svg.appendChild(path); document.body.appendChild(svg);

  var geo = null;          // géométrie du trait : longueur totale, longueur à l'arrivée au niveau du bouton, etc.
  var intro = 0;           // 0 à 1 : descente initiale de Kyiv jusqu'au bas du premier écran (après la vidéo)
  var pret = false;

  function kyivPage() {    // Kyiv à l'écran, en tenant compte du recadrage object-fit
    var r = video.getBoundingClientRect(), cs = getComputedStyle(video);
    var cover = cs.objectFit !== 'contain';
    var s = cover ? Math.max(r.width / VW, r.height / VH) : Math.min(r.width / VW, r.height / VH);
    var pos = cs.objectPosition.split(' ').map(function (v) { return parseFloat(v) / 100; });
    var ox = (r.width - VW * s) * (isNaN(pos[0]) ? 0.5 : pos[0]);
    var oy = (r.height - VH * s) * (isNaN(pos[1]) ? 0.5 : pos[1]);
    return [r.left + scrollX + ox + KYIV[0] * s, r.top + scrollY + oy + KYIV[1] * s];
  }

  function construire() {  // trace le chemin complet (coordonnées de la page) et mesure ses repères
    var b = document.querySelector('.hc-start');
    if (!b) return false;
    var k = kyivPage(), r = b.getBoundingClientRect();
    var carte = b.closest('.hero-calc') || b, c = carte.getBoundingClientRect();
    var m = 8, L = r.left + scrollX - m, R = r.right + scrollX + m, T = r.top + scrollY - m, B = r.bottom + scrollY + m;
    var rad = (B - T) / 2, cy = (T + B) / 2;
    var cTop = c.top + scrollY - 28;                                                      // au-dessus du questionnaire
    var xOut = Math.min(c.right + scrollX + 16, document.documentElement.clientWidth - 6); // longe son bord droit, dehors
    var xD = Math.max(k[0], xOut);
    svg.setAttribute('width', document.documentElement.scrollWidth);
    svg.setAttribute('height', document.documentElement.scrollHeight);
    path.setAttribute('d', [
      'M', k[0], k[1], 'V', cTop, 'H', xD, 'V', cy, 'H', R,
      'A', rad, rad, 0, 0, 1, R - rad, B, 'H', L + rad, 'A', rad, rad, 0, 0, 1, L + rad, T,
      'H', R - rad, 'A', rad, rad, 0, 0, 1, R, cy
    ].join(' '));
    var total = path.getTotalLength();
    var lCy = (cTop - k[1]) + (xD - k[0]) + (cy - cTop);   // longueur au moment où le trait arrive à hauteur du bouton
    var maxScroll = document.documentElement.scrollHeight - innerHeight;
    var sCy = cy - innerHeight + MARGE_BAS;                // défilement où la pointe atteint la hauteur du bouton
    var sFin = Math.min(maxScroll, cy - innerHeight * 0.55); // tour du bouton terminé quand il est vers 55 % de l'écran
    if (sFin <= sCy) sFin = sCy + 1;
    geo = { k: k, cTop: cTop, xD: xD, cy: cy, total: total, lCy: lCy, sCy: sCy, sFin: sFin };
    path.style.strokeDasharray = total;
    return true;
  }

  function longueurPourDefilement(y) {   // longueur dessinée = où se trouve le bas de l'écran le long du trait
    var g = geo, bas = y + innerHeight - MARGE_BAS;
    if (bas <= g.k[1]) return 0;
    if (bas < g.cTop) return bas - g.k[1];                          // descente sous Kyiv
    if (bas < g.cy) return (g.cTop - g.k[1]) + (g.xD - g.k[0]) + (bas - g.cTop);   // longe le questionnaire
    var q = Math.min(1, Math.max(0, (y - g.sCy) / (g.sFin - g.sCy)));   // puis le tour du bouton, au fil du défilement
    return g.lCy + (g.total - g.lCy) * q;
  }

  function peindre() {
    if (!geo) return;
    var vise = reduit ? geo.total : longueurPourDefilement(scrollY);
    var l = intro < 1 ? intro * vise : vise;              // pendant la descente initiale, on rejoint la position du défilement
    path.style.strokeDashoffset = geo.total - l;
    svg.style.visibility = l > 0.5 ? 'visible' : 'hidden';
  }

  var demande = false;
  function auDefilement() { if (!demande) { demande = true; requestAnimationFrame(function () { demande = false; peindre(); }); } }

  function demarrer() {    // après la vidéo : courte descente de Kyiv au bas de l'écran, puis le défilement prend la main
    if (pret) return; pret = true;
    (function attendre() {
      if (!construire()) return requestAnimationFrame(attendre);
      if (reduit) { intro = 1; peindre(); return; }
      var t0 = performance.now(), D = 900;
      (function pas(t) {
        var x = Math.min(1, (t - t0) / D);
        intro = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;   // ease-in-out-cubic
        peindre();
        if (x < 1) requestAnimationFrame(pas);
      })(t0);
    })();
  }

  if (reduit) { video.removeAttribute('autoplay'); video.pause(); demarrer(); }
  else {
    video.addEventListener('ended', demarrer);
    setTimeout(demarrer, 6500);                       // filet de sécurité si la vidéo ne se lit pas
  }
  window.addEventListener('scroll', auDefilement, { passive: true });
  window.addEventListener('resize', function () { if (pret && construire()) peindre(); });
  if (document.fonts) document.fonts.ready.then(function () { if (pret && construire()) peindre(); });
})();
