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
      document.querySelectorAll('main, footer').forEach(el => { el.inert = open; });
      if (open) menu.querySelector('a')?.focus();
      else if (returnFocus) toggle.focus();
    };
    toggle.addEventListener('click', () => setMenu(!menu.classList.contains('active')));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.classList.contains('active')) setMenu(false, true);
    });
    window.matchMedia('(min-width: 769px)').addEventListener('change', (e) => { if (e.matches) setMenu(false); });
  }

  // SCROLL REVEAL -- trigger when 12% visible, offset from bottom for natural feel
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  if (revealEls.length) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => revealObserver.observe(el));
  }

  // FORM HANDLER — Formspree
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalHTML = btn.innerHTML;
      const isUkrainian = document.documentElement.lang === 'uk';

      const formData = new FormData(form);
      const savedFormHTML = form.innerHTML;

      btn.innerHTML = isUkrainian
        ? '<span style="display:inline-flex;align-items:center;gap:.5rem"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="animation:spin 1s linear infinite"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round"/></svg>Надсилаємо...</span>'
        : '<span style="display:inline-flex;align-items:center;gap:.5rem"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="animation:spin 1s linear infinite"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round"/></svg>Sending...</span>';
      btn.disabled = true;
      btn.style.opacity = '.7';

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      fetch('https://formspree.io/f/mreovopw', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
        signal: controller.signal
      }).then(response => {
        clearTimeout(timeout);
        if (response.ok) {
          // Replace form with success message + link to new form
          const newFormLabel = isUkrainian ? 'Надіслати ще один запит' : 'Submit another request';
          form.innerHTML = isUkrainian
            ? '<div role="status" aria-live="polite" style="text-align:center;padding:3rem 1rem"><svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin-bottom:1.5rem"><circle cx="24" cy="24" r="22" stroke="var(--green)" stroke-width="2"/><path d="M14 24l7 7L34 17" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><h3 style="color:var(--g900);margin-bottom:.75rem;font-size:1.5rem">Запит прийнято!</h3><p style="color:var(--g500);font-size:1.1rem;line-height:1.6;max-width:400px;margin:0 auto 1.5rem">Ми вже обробляємо ваш запит і зв\'яжемося з вами найближчим часом.</p><button type="button" class="btn btn-outline" id="resetFormBtn">' + newFormLabel + '</button></div>'
            : '<div role="status" aria-live="polite" style="text-align:center;padding:3rem 1rem"><svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin-bottom:1.5rem"><circle cx="24" cy="24" r="22" stroke="var(--green)" stroke-width="2"/><path d="M14 24l7 7L34 17" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><h3 style="color:var(--g900);margin-bottom:.75rem;font-size:1.5rem">Request submitted!</h3><p style="color:var(--g500);font-size:1.1rem;line-height:1.6;max-width:400px;margin:0 auto 1.5rem">We are reviewing your request and will get back to you shortly.</p><button type="button" class="btn btn-outline" id="resetFormBtn">' + newFormLabel + '</button></div>';
          document.getElementById('resetFormBtn').addEventListener('click', () => {
            form.innerHTML = savedFormHTML;
            const newBtn = form.querySelector('button[type="submit"]');
            if (newBtn) {
              newBtn.disabled = false;
              newBtn.style.opacity = '';
            }
          });
        } else {
          throw new Error('Form submission failed');
        }
      }).catch(() => {
        clearTimeout(timeout);
        btn.innerHTML = isUkrainian
          ? '<span style="display:inline-flex;align-items:center;gap:.5rem">Помилка. Спробуйте ще раз.</span>'
          : '<span style="display:inline-flex;align-items:center;gap:.5rem">Error. Please try again.</span>';
        btn.style.opacity = '1';
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
        }, 3000);
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
