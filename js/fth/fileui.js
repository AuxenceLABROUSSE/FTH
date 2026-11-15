/* File inputs with site-language labels.
   The native "Choose file / No file chosen" text comes from the browser's own UI language and cannot be
   translated from the page, so each input[type=file] keeps working (hidden visually, still focusable and
   labelled) and gets a Ukrainian or English button and file name beside it. No network, no storage. */
(function () {
  'use strict';
  var uk = /^uk/i.test(document.documentElement.lang || '');
  var T = uk ? { btn: 'Обрати файл', none: 'Файл не обрано', many: ' файлів' } : { btn: 'Choose file', none: 'No file chosen', many: ' files' };

  function enhance(inp) {
    if (inp.getAttribute('data-fui')) return;
    inp.setAttribute('data-fui', '1');
    inp.classList.add('fth-file-input');
    var ui = document.createElement('span'), btn = document.createElement('span'), name = document.createElement('span');
    ui.className = 'fth-file-ui';
    btn.className = 'fth-file-btn'; btn.textContent = T.btn; btn.setAttribute('aria-hidden', 'true');
    name.className = 'fth-file-name'; name.textContent = T.none;
    ui.appendChild(btn); ui.appendChild(name);
    inp.insertAdjacentElement('afterend', ui);
    // Inputs inside a <label> open the dialog through the label; a bare input needs a click handler.
    if (!inp.closest('label')) ui.addEventListener('click', function () { inp.click(); });
    inp.addEventListener('change', function () {
      var f = inp.files;
      name.textContent = f && f.length ? (f.length > 1 ? f.length + T.many : f[0].name) : T.none;
    });
  }

  function run() { Array.prototype.forEach.call(document.querySelectorAll('input[type=file]'), enhance); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
})();
