document.addEventListener('DOMContentLoaded', () => {

  // PAGE LOADER
  const loader = document.querySelector('.page-loader');
  if (loader) {
    window.addEventListener('load', () => {
      setTimeout(() => loader.classList.add('loaded'), 300);
    });
    setTimeout(() => loader.classList.add('loaded'), 2000);
  }

  // CURSOR GLOW
  const cursorGlow = document.querySelector('.cursor-glow');
  if (cursorGlow && window.innerWidth > 768) {
    let mouseX = 0, mouseY = 0;
    let glowX = 0, glowY = 0;
    let mouseActive = false;
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!mouseActive) {
        mouseActive = true;
        cursorGlow.style.opacity = '1';
      }
    });
    function animateGlow() {
      glowX += (mouseX - glowX) * 0.08;
      glowY += (mouseY - glowY) * 0.08;
      cursorGlow.style.left = glowX + 'px';
      cursorGlow.style.top = glowY + 'px';
      requestAnimationFrame(animateGlow);
    }
    animateGlow();
  }

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

  // MOBILE MENU
  const toggle = document.getElementById('mobileToggle');
  const menu = document.getElementById('navMenu');
  if (toggle && menu) {
    toggle.addEventListener('click', () => {
      const isOpen = menu.classList.toggle('active');
      toggle.classList.toggle('active');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        menu.classList.remove('active');
        toggle.classList.remove('active');
        document.body.style.overflow = '';
      });
    });
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

  // HERO PIPELINE -- add visible class for tag entrance animation
  const pipeline = document.querySelector('.hero-pipeline');
  if (pipeline) {
    const pipelineObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          pipelineObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    pipelineObserver.observe(pipeline);
  }

  // COUNTER ANIMATION
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const easeOutQuart = t => 1 - Math.pow(1 - t, 4);
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseFloat(el.dataset.count);
          const suffix = el.dataset.suffix || '';
          const prefix = el.dataset.prefix || '';
          const isDecimal = String(target).includes('.');
          const duration = 2200;
          const start = performance.now();
          const animate = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = easeOutQuart(progress);
            const current = eased * target;
            el.textContent = prefix + (isDecimal ? current.toFixed(1) : Math.floor(current)) + suffix;
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
          counterObserver.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    counters.forEach(el => counterObserver.observe(el));
  }

  // SMOOTH ANCHOR SCROLL
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const offset = navbar ? navbar.offsetHeight + 24 : 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // PARALLAX -- rAF-throttled
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && window.innerWidth > 768) {
    let parallaxTicking = false;
    window.addEventListener('scroll', () => {
      if (!parallaxTicking) {
        requestAnimationFrame(() => {
          parallaxEls.forEach(el => {
            const speed = parseFloat(el.dataset.parallax) || 0.1;
            const rect = el.getBoundingClientRect();
            const center = rect.top + rect.height / 2;
            const viewCenter = window.innerHeight / 2;
            const offset = (center - viewCenter) * speed;
            el.style.transform = `translateY(${offset}px)`;
          });
          parallaxTicking = false;
        });
        parallaxTicking = true;
      }
    }, { passive: true });
  }

  // FAQ TOGGLE (for contact page)
  window.toggleFaq = function(btn) {
    const item = btn.closest('.faq-item');
    const icon = btn.querySelector('.faq-icon');
    const answer = item.querySelector('.faq-answer');
    const isOpen = item.classList.contains('active');

    // Close all others
    document.querySelectorAll('.faq-item.active').forEach(other => {
      if (other !== item) {
        other.classList.remove('active');
        const otherIcon = other.querySelector('.faq-icon');
        if (otherIcon) otherIcon.textContent = '+';
      }
    });

    item.classList.toggle('active');
    if (icon) icon.textContent = isOpen ? '+' : '-';
  };

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

      fetch('https://formspree.io/f/mreovopw', {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' }
      }).then(response => {
        if (response.ok) {
          // Replace form with success message + link to new form
          const newFormLabel = isUkrainian ? 'Надіслати ще один запит' : 'Submit another request';
          form.innerHTML = isUkrainian
            ? '<div style="text-align:center;padding:3rem 1rem"><svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin-bottom:1.5rem"><circle cx="24" cy="24" r="22" stroke="var(--green)" stroke-width="2"/><path d="M14 24l7 7L34 17" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><h3 style="color:var(--g900);margin-bottom:.75rem;font-size:1.5rem">Запит прийнято!</h3><p style="color:var(--g500);font-size:1.1rem;line-height:1.6;max-width:400px;margin:0 auto 1.5rem">Ми вже обробляємо ваш запит і зв\'яжемося з вами найближчим часом.</p><button type="button" class="btn btn-outline" id="resetFormBtn">' + newFormLabel + '</button></div>'
            : '<div style="text-align:center;padding:3rem 1rem"><svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin-bottom:1.5rem"><circle cx="24" cy="24" r="22" stroke="var(--green)" stroke-width="2"/><path d="M14 24l7 7L34 17" stroke="var(--green)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><h3 style="color:var(--g900);margin-bottom:.75rem;font-size:1.5rem">Request submitted!</h3><p style="color:var(--g500);font-size:1.1rem;line-height:1.6;max-width:400px;margin:0 auto 1.5rem">We are reviewing your request and will get back to you shortly.</p><button type="button" class="btn btn-outline" id="resetFormBtn">' + newFormLabel + '</button></div>';
          document.getElementById('resetFormBtn').addEventListener('click', () => {
            form.innerHTML = savedFormHTML;
          });
        } else {
          throw new Error('Form submission failed');
        }
      }).catch(() => {
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

  // SERVICES SCROLL HINT (mobile) -- gentle nudge after load
  const servicesTrack = document.querySelector('.services-track');
  if (servicesTrack && window.innerWidth <= 768) {
    const hintObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          servicesTrack.scrollTo({ left: 40, behavior: 'smooth' });
          setTimeout(() => servicesTrack.scrollTo({ left: 0, behavior: 'smooth' }), 500);
          hintObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.3 });
    hintObserver.observe(servicesTrack);
  }

  // SPIN KEYFRAME -- defined in style.css

  // MAGNETIC BUTTONS -- only on devices with fine pointer (no touch)
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  if (hasFinePointer) document.querySelectorAll('.btn-green, .nav-cta').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate(${x * .15}px, ${y * .2}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = '';
      btn.style.transition = 'transform .4s cubic-bezier(.22,1,.36,1)';
      setTimeout(() => btn.style.transition = '', 400);
    });
  });

  // TILT ON SERVICE CARDS -- only on devices with fine pointer (no touch)
  if (hasFinePointer) document.querySelectorAll('.service-card, .sys-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - .5;
      const y = (e.clientY - rect.top) / rect.height - .5;
      card.style.transform = `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });


  // SMOOTH SCROLL PROGRESS BAR
  const progressBar = document.getElementById('scrollProgress');
  if (progressBar) {
    window.addEventListener('scroll', () => {
      const scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
      progressBar.style.width = (scrolled * 100) + '%';
    }, { passive: true });
  }

  // PIPELINE TAGS ENTRANCE -- handled by CSS animations in style.css

});
