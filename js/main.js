document.addEventListener('DOMContentLoaded', () => {
  // NAVBAR SCROLL -- rAF-throttled for smooth performance
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          navbar.classList.toggle('scrolled', window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  // MOBILE MENU -- one state function; while open, main/footer are inert so focus stays in the menu
  const toggle = document.getElementById('mobileToggle');
  const menu = document.getElementById('navMenu');
  if (toggle && menu) {
    const setMenu = (open, returnFocus) => {
      menu.classList.toggle('active', open);
      toggle.classList.toggle('active', open);
      toggle.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
      document.querySelectorAll('main, footer, .skip-link').forEach(el => { el.inert = open; });
      if (open) menu.querySelector('a')?.focus();
      else if (returnFocus) toggle.focus();
    };
    toggle.addEventListener('click', () => setMenu(!menu.classList.contains('active')));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.classList.contains('active')) setMenu(false, true);
    });
    // Tab from the last control of the open menu goes back to the first one (and Shift+Tab the other way)
    toggle.closest('nav').addEventListener('keydown', (event) => {
      if (event.key !== 'Tab' || !menu.classList.contains('active')) return;
      const items = [...event.currentTarget.querySelectorAll('a[href], button')].filter(el => el.getClientRects().length);
      const edge = event.shiftKey ? items[0] : items[items.length - 1];
      if (document.activeElement === edge) {
        event.preventDefault();
        (event.shiftKey ? items[items.length - 1] : items[0]).focus();
      }
    });
    window.matchMedia('(min-width: 769px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }


  // FORM HANDLER — Formspree. The outcome goes to the permanent #formStatus live region (errors, with a mailto fallback);
  // on success the fields give way to a confirmation whose heading takes the focus.
  const form = document.getElementById('contactForm');
  if (form) {
    const status = document.getElementById('formStatus');
    const btn = form.querySelector('button[type="submit"]');
    const originalHTML = btn.innerHTML;
    const t = document.documentElement.lang === 'uk'
      ? { sending: 'Надсилаємо...', title: 'Запит прийнято!', text: 'Ми вже обробляємо ваш запит і зв\'яжемося з вами найближчим часом.', again: 'Надіслати ще один запит', error: 'Не вдалося надіслати запит. Спробуйте ще раз або напишіть нам: ' }
      : { sending: 'Sending...', title: 'Request submitted!', text: 'We are reviewing your request and will get back to you shortly.', again: 'Submit another request', error: 'Your request could not be sent. Please try again or email us: ' };
    const done = document.createElement('div');
    done.className = 'form-done';
    done.innerHTML = '<svg width="40" height="40" viewBox="0 0 48 48" fill="none" aria-hidden="true"><circle cx="24" cy="24" r="22" stroke="currentColor" stroke-width="2"/><path d="M14 24l7 7L34 17" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><h3 tabindex="-1"></h3><p></p><button type="button" class="btn btn-outline"></button>';
    done.querySelector('h3').textContent = t.title;
    done.querySelector('p').textContent = t.text;
    const again = done.querySelector('button');
    again.textContent = t.again;
    again.addEventListener('click', () => {
      form.reset();
      form.classList.remove('is-done');
      form.querySelector('#name')?.focus();
    });
    form.insertBefore(done, status);

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      status.textContent = '';
      status.classList.remove('is-error');
      btn.innerHTML = '<span class="btn-busy"><svg class="btn-spinner" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round"/></svg>' + t.sending + '</span>';
      btn.disabled = true;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      fetch('https://formspree.io/f/mreovopw', {
        method: 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      }).then(response => {
        if (!response.ok) throw new Error('Form submission failed');
        form.classList.add('is-done');
        done.querySelector('h3').focus();
      }).catch(() => {
        status.classList.add('is-error');
        status.textContent = t.error;
        const mail = document.createElement('a');
        mail.href = 'mailto:contact@fthadvisory.com';
        mail.textContent = 'contact@fthadvisory.com';
        status.append(mail);
      }).finally(() => {
        clearTimeout(timeout);
        btn.innerHTML = originalHTML;
        btn.disabled = false;
        if (document.activeElement === document.body) btn.focus(); // disabling the button dropped the focus
      });
    });
  }

  // NAV ACTIVE LINK TRACKING -- rAF-throttled
  const sections = document.querySelectorAll('section[id]');
  if (sections.length && navbar) {
    const navLinks = navbar.querySelectorAll('.nav-menu a');
    let navTrackTicking = false;
    window.addEventListener('scroll', () => {
      if (!navTrackTicking) {
        requestAnimationFrame(() => {
          const scrollY = window.scrollY + 200;
          sections.forEach(section => {
            const top = section.offsetTop;
            const height = section.offsetHeight;
            const id = section.getAttribute('id');
            if (scrollY >= top && scrollY < top + height) {
              navLinks.forEach(link => {
                link.style.color = '';
                if (link.getAttribute('href') === '#' + id) {
                  link.style.color = 'var(--green)';
                }
              });
            }
          });
          navTrackTicking = false;
        });
        navTrackTicking = true;
      }
    }, { passive: true });
  }

  // BLOG TOPIC FILTER -- chips built from the card tags (counts follow the articles), aria-pressed on the active one, count announced
  const filter = document.querySelector('.blog-filter');
  if (filter) {
    const cards = [...document.querySelectorAll('.blog-grid .blog-card')];
    const tagOf = card => card.querySelector('.blog-card-tag')?.textContent.trim() || '';
    const counts = new Map();
    cards.forEach(card => counts.set(tagOf(card), (counts.get(tagOf(card)) || 0) + 1));
    const uk = document.documentElement.lang === 'uk';
    const all = [uk ? 'Усі' : 'All', cards.length, null];
    // polite announcement of the result count ("7 статей" / "7 articles")
    const live = Object.assign(document.createElement('p'), { className: 'sr-only' });
    live.setAttribute('role', 'status');
    filter.after(live);
    const plural = new Intl.PluralRules(uk ? 'uk' : 'en');
    const words = uk ? { one: 'стаття', few: 'статті', many: 'статей', other: 'статті' } : { one: 'article', other: 'articles' };
    [all, ...[...counts].sort((a, b) => b[1] - a[1]).map(([tag, n]) => [tag, n, tag])].forEach(([label, n, tag]) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'blog-chip';
      chip.setAttribute('aria-pressed', String(tag === null));
      chip.append(label + ' ', Object.assign(document.createElement('span'), { textContent: n }));
      chip.addEventListener('click', () => {
        filter.querySelectorAll('.blog-chip').forEach(other => other.setAttribute('aria-pressed', String(other === chip)));
        cards.forEach(card => { card.hidden = tag !== null && tagOf(card) !== tag; });
        const n = cards.filter(card => !card.hidden).length;
        live.textContent = n + ' ' + (words[plural.select(n)] || words.other);
      });
      filter.append(chip);
    });
  }

  // SMOOTH SCROLL PROGRESS BAR
  const progressBar = document.getElementById('scrollProgress');
  if (progressBar) {
    let progressTicking = false;
    window.addEventListener('scroll', () => {
      if (!progressTicking) {
        requestAnimationFrame(() => {
          const scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
          progressBar.style.width = (scrolled * 100) + '%';
          progressTicking = false;
        });
        progressTicking = true;
      }
    }, { passive: true });
  }

});
