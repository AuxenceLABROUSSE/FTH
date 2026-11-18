/* Haut de page FTH : la vidéo de fond (carte, Ukraine, réseau) se joue une fois et s'arrête sur sa dernière image.
   Puis un trait vert plus épais part de Kyiv et descend jusqu'au bas du premier écran.
   Ensuite, c'est le DÉFILEMENT DU VISITEUR qui le fait avancer (aucun minuteur, aucun défilement automatique) :
   il s'arrête quand le visiteur s'arrête, recule quand il remonte, et finit par entourer « Почати опитування ».
   Dès que le questionnaire démarre (le bouton disparaît), le trait s'efface : il ne passe jamais sur les réponses. */
(function () {
  var KYIV = [1640, 470], VW = 1920, VH = 1080;      // position finale de Kyiv dans la vidéo (fond.json)
  var MARGE_BAS = 40;                                // la pointe du trait reste à 40 px du bas de l'écran
  var video = document.querySelector('.hero-fond video');
  var calc = document.getElementById('heroCalc');
  if (!video || !calc) return;
  var reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  var svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'trait-kyiv'); svg.setAttribute('aria-hidden', 'true');
  var path = document.createElementNS(NS, 'path');
  svg.appendChild(path); document.body.appendChild(svg);

  var geo = null;          // repères du trait (coordonnées de la page)
  var intro = 0;           // 0 à 1 : descente initiale de Kyiv jusqu'au bas du premier écran (après la vidéo)
  var pret = false;

  function kyivPage() {    // Kyiv à l'écran, en tenant compte du recadrage object-fit / object-position
    var r = video.getBoundingClientRect(), cs = getComputedStyle(video);
    var cover = cs.objectFit !== 'contain';
    var s = cover ? Math.max(r.width / VW, r.height / VH) : Math.min(r.width / VW, r.height / VH);
    var pos = cs.objectPosition.split(' ').map(function (v) { return parseFloat(v) / 100; });
    var ox = (r.width - VW * s) * (isNaN(pos[0]) ? 0.5 : pos[0]);
    var oy = (r.height - VH * s) * (isNaN(pos[1]) ? 0.5 : pos[1]);
    return [r.left + scrollX + ox + KYIV[0] * s, r.top + scrollY + oy + KYIV[1] * s];
  }

  function construire() {  // trace le chemin complet et mesure ses repères ; false si le bouton n'existe pas
    var b = calc.querySelector('.hc-start');
    if (!b) { geo = null; svg.style.display = 'none'; return false; }
    svg.style.display = 'none';                      // ne jamais se mesurer soi-même (sinon la page ne rétrécit plus)
    var docW = document.documentElement.scrollWidth, docH = document.documentElement.scrollHeight;
    var k = kyivPage(), r = b.getBoundingClientRect(), c = calc.getBoundingClientRect();
    var m = 8, L = r.left + scrollX - m, R = r.right + scrollX + m, T = r.top + scrollY - m, B = r.bottom + scrollY + m;
    var rad = (B - T) / 2, cy = (T + B) / 2;
    var cTop = c.top + scrollY - 28;                                                      // au-dessus du questionnaire
    var xOut = Math.min(c.right + scrollX + 16, document.documentElement.clientWidth - 6); // longe son bord droit, dehors
    var xD = Math.max(k[0], xOut), H = xD - k[0];
    svg.setAttribute('width', docW); svg.setAttribute('height', docH);
    svg.style.display = '';
    path.setAttribute('d', [
      'M', k[0], k[1], 'V', cTop, 'H', xD, 'V', cy, 'H', R,
      'A', rad, rad, 0, 0, 1, R - rad, B, 'H', L + rad, 'A', rad, rad, 0, 0, 1, L + rad, T,
      'H', R - rad, 'A', rad, rad, 0, 0, 1, R, cy
    ].join(' '));
    var total = path.getTotalLength();
    var lCy = (cTop - k[1]) + H + (cy - cTop);              // longueur à l'arrivée à hauteur du bouton
    var maxScroll = docH - innerHeight;
    var sCy = cy + H - innerHeight + MARGE_BAS;             // défilement où la pointe atteint la hauteur du bouton
    var sFin = Math.min(maxScroll, cy - innerHeight * 0.55); // tour du bouton fini quand il est vers 55 % de l'écran
    if (sFin <= sCy) sFin = sCy + 1;
    geo = { k: k, cTop: cTop, H: H, cy: cy, total: total, lCy: lCy, sCy: sCy, sFin: sFin };
    path.style.strokeDasharray = total;
    return true;
  }

  function longueurPourDefilement(y) {   // longueur dessinée = où se trouve le bas de l'écran le long du trait
    var g = geo, bas = y + innerHeight - MARGE_BAS;
    var v = bas - g.k[1];                                    // le tronçon horizontal compte comme une distance à défiler
    if (v <= 0) return 0;
    if (v < g.lCy) return v;
    var q = Math.min(1, Math.max(0, (y - g.sCy) / (g.sFin - g.sCy)));   // puis le tour du bouton, au fil du défilement
    return g.lCy + (g.total - g.lCy) * q;
  }

  function peindre() {
    if (!geo) return;
    var vise = reduit ? geo.total : longueurPourDefilement(scrollY);
    var l = intro < 1 ? intro * vise : vise;                 // pendant la descente initiale, on rejoint la position du défilement
    path.style.strokeDashoffset = geo.total - l;
    svg.style.visibility = l > 0.5 ? 'visible' : 'hidden';
  }

  var demande = false;
  function auDefilement() { if (!demande) { demande = true; requestAnimationFrame(function () { demande = false; peindre(); }); } }

  var redim = false;
  function auRedimensionnement() {   // regroupé sur une image, comme le défilement
    if (!pret || redim) return; redim = true;
    requestAnimationFrame(function () { redim = false; if (construire()) peindre(); });
  }

  function demarrer() {    // après la vidéo : courte descente de Kyiv au bas de l'écran, puis le défilement prend la main
    if (pret) return; pret = true;
    var essais = 0;
    (function attendre() {
      if (!construire()) { if (++essais < 60) requestAnimationFrame(attendre); return; }   // jamais de boucle sans fin
      if (reduit) { intro = 1; peindre(); return; }
      var t0 = performance.now(), D = 900;
      (function pas(t) {
        var x = Math.min(1, (t - t0) / D);
        intro = x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;   // ease-in-out-cubic
        peindre();
        if (x < 1 && geo) requestAnimationFrame(pas);
      })(t0);
    })();
  }

  // le questionnaire démarre : le bouton disparaît, le trait s'efface (et revient seulement si le bouton revient)
  new MutationObserver(function () {
    if (!calc.querySelector('.hc-start')) { geo = null; svg.style.display = 'none'; }
    else if (pret && !geo && construire()) peindre();
  }).observe(calc, { childList: true, subtree: true });

  if (reduit) {            // mouvement réduit : image finale, aucune lecture ni téléchargement (preload="none" dans le HTML), trait posé
    video.poster = video.getAttribute('data-poster-fin') || video.poster;
    demarrer();
  } else {                 // lecture lancée ici (pas d'autoplay dans le HTML, sinon le navigateur télécharge même en mouvement réduit)
    video.muted = true;
    var lance = false, secours = null;
    var refusee = function () {                             // lecture impossible, bloquée ou jamais vue : carte finale, puis le trait
      clearTimeout(secours);
      video.poster = video.getAttribute('data-poster-fin') || video.poster; demarrer();
    };
    var armer = function (ms) { clearTimeout(secours); secours = setTimeout(refusee, ms); };
    var jouer = function () {
      var lecture = video.play();
      if (lecture && lecture.catch) lecture.catch(function (err) { if (!err || err.name !== 'AbortError') refusee(); });   // AbortError = notre propre pause
    };
    var lancer = function () {                              // une seule fois, quand la carte est à l'écran
      if (lance) return; lance = true;
      video.preload = 'auto';                               // rien n'est téléchargé tant que la carte n'est pas vue
      jouer();
      armer(15000);                                         // filet si la lecture ne démarre jamais ; réarmé tant que la vidéo charge
    };
    video.addEventListener('ended', demarrer);
    video.addEventListener('playing', function () { armer((video.duration || 5) * 1000 + 1500); });   // compte depuis la lecture réelle
    var sources = video.querySelectorAll('source');           // vidéo illisible (toutes les sources) : carte finale, le trait part quand même
    if (sources.length) sources[sources.length - 1].addEventListener('error', refusee); else video.addEventListener('error', refusee);
    video.addEventListener('waiting', function () { if (lance && !pret) armer(15000); });
    video.addEventListener('loadstart', function () { if (lance && !pret) armer(15000); });
    // sur téléphone la carte est sous le texte : la vidéo attend d'être vue au lieu de se jouer hors de l'écran,
    // se met en pause si la carte sort de l'écran, et n'est jamais jouée si le visiteur arrive déjà plus bas (rechargement, lien /#section)
    if ('IntersectionObserver' in window) {
      var vue = new IntersectionObserver(function (e) {
        var r = e[e.length - 1];
        if (pret) { vue.disconnect(); return; }
        // 40 % de la carte, ou 40 % de l'écran occupé (téléphone en paysage : la carte est plus haute que l'écran, 40 % d'elle n'y tient jamais)
        var vu = r.intersectionRatio >= 0.4 || r.intersectionRect.height >= 0.4 * window.innerHeight;
        if (!lance) {
          if (vu) lancer();
          else if (r.boundingClientRect.top < 0) { vue.disconnect(); refusee(); }   // déjà passé sous la carte
        } else if (!r.isIntersecting) {
          clearTimeout(secours); video.pause();
          if (r.boundingClientRect.top < 0) {                // sortie par le haut (le visiteur descend) : carte finale et trait jusqu'au bouton
            vue.disconnect(); if (video.duration) video.currentTime = video.duration; refusee();
          }                                                  // sortie par le bas (il remonte vers le texte) : simple pause
        }
        else if (video.paused && !video.ended) jouer();                            // retour à l'écran : reprise
      }, { threshold: [0, 0.1, 0.2, 0.3, 0.4] });
      vue.observe(video);
    } else lancer();
  }
  window.addEventListener('scroll', auDefilement, { passive: true });
  window.addEventListener('resize', auRedimensionnement);
  if (document.fonts) document.fonts.ready.then(auRedimensionnement);
})();
