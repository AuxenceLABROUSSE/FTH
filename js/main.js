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
    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    });
    function animateGlow() {
      glowX += (mouseX - glowX) * 0.08;
      glowY += (mouseY - glowY) * 0.08;
      cursorGlow.style.left = glowX + 'px';
      cursorGlow.style.top = glowY + 'px';
      requestAnimationFrame(animateGlow);
    }
    animateGlow();
    const darkSections = document.querySelectorAll('.section-dark, .section-cta');
    const observerGlow = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        cursorGlow.style.opacity = entry.isIntersecting ? '0' : '1';
      });
    }, { threshold: 0.3 });
    darkSections.forEach(s => observerGlow.observe(s));
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
      menu.classList.toggle('active');
      toggle.classList.toggle('active');
    });
    menu.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        menu.classList.remove('active');
        toggle.classList.remove('active');
      });
    });
  }

  // LANGUAGE SWITCHING (for multi-page site)
  const langBtns = document.querySelectorAll('.lang-switch button.lang-btn');
  if (langBtns.length) {
    const savedLang = localStorage.getItem('fth-lang') || 'en';
    if (savedLang === 'ua') {
      document.body.classList.add('lang-ua');
    }
    langBtns.forEach(btn => {
      if ((savedLang === 'ua' && btn.dataset.lang === 'ua') || (savedLang !== 'ua' && btn.dataset.lang === 'en')) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
      btn.addEventListener('click', () => {
        const lang = btn.dataset.lang;
        if (lang === 'ua') {
          document.body.classList.add('lang-ua');
        } else {
          document.body.classList.remove('lang-ua');
        }
        localStorage.setItem('fth-lang', lang);
        langBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
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

  // PARALLAX
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && window.innerWidth > 768) {
    window.addEventListener('scroll', () => {
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.1;
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        const viewCenter = window.innerHeight / 2;
        const offset = (center - viewCenter) * speed;
        el.style.transform = `translateY(${offset}px)`;
      });
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

  // FORM HANDLER
  const form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const originalHTML = btn.innerHTML;
      const isUkrainian = document.documentElement.lang === 'uk';

      btn.innerHTML = isUkrainian
        ? '<span style="display:inline-flex;align-items:center;gap:.5rem"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="animation:spin 1s linear infinite"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round"/></svg>Надсилаємо...</span>'
        : '<span style="display:inline-flex;align-items:center;gap:.5rem"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" style="animation:spin 1s linear infinite"><circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round"/></svg>Sending...</span>';
      btn.disabled = true;
      btn.style.opacity = '.7';

      setTimeout(() => {
        btn.innerHTML = isUkrainian
          ? '<span style="display:inline-flex;align-items:center;gap:.5rem"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Надіслано!</span>'
          : '<span style="display:inline-flex;align-items:center;gap:.5rem"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Sent!</span>';
        btn.style.opacity = '1';
        setTimeout(() => {
          btn.innerHTML = originalHTML;
          btn.disabled = false;
          form.reset();
        }, 2800);
      }, 1400);
    });
  }

  // NAV ACTIVE LINK TRACKING
  const sections = document.querySelectorAll('section[id]');
  if (sections.length && navbar) {
    const navLinks = navbar.querySelectorAll('.nav-menu a');
    window.addEventListener('scroll', () => {
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
    }, { passive: true });
  }

  // SERVICES SCROLL HINT (mobile)
  const servicesTrack = document.querySelector('.services-track');
  if (servicesTrack && window.innerWidth <= 768) {
    setTimeout(() => {
      servicesTrack.scrollTo({ left: 60, behavior: 'smooth' });
      setTimeout(() => servicesTrack.scrollTo({ left: 0, behavior: 'smooth' }), 600);
    }, 2000);
  }

  // SPIN KEYFRAME
  const style = document.createElement('style');
  style.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
  document.head.appendChild(style);

  // MAGNETIC BUTTONS -- buttons subtly follow cursor on hover
  document.querySelectorAll('.btn-green, .nav-cta').forEach(btn => {
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

  // TILT ON SERVICE CARDS -- subtle 3D perspective on hover
  document.querySelectorAll('.service-card, .sys-card').forEach(card => {
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

  // TYPED EFFECT ON HERO -- subtle cursor blink after h1 loads
  const heroH1 = document.querySelector('.hero h1');
  if (heroH1) {
    setTimeout(() => {
      heroH1.style.borderRight = '2px solid var(--green)';
      heroH1.style.paddingRight = '4px';
      heroH1.style.animation = 'none';
      let blinkCount = 0;
      const blink = setInterval(() => {
        heroH1.style.borderRightColor = heroH1.style.borderRightColor === 'transparent' ? 'var(--green)' : 'transparent';
        blinkCount++;
        if (blinkCount > 6) {
          clearInterval(blink);
          heroH1.style.borderRight = 'none';
          heroH1.style.paddingRight = '';
        }
      }, 500);
    }, 1800);
  }

  // SMOOTH SCROLL PROGRESS BAR
  const progressBar = document.createElement('div');
  progressBar.style.cssText = 'position:fixed;top:0;left:0;height:2px;background:linear-gradient(90deg,var(--green),var(--green-accent));z-index:10001;transition:width .1s linear;width:0;pointer-events:none;';
  document.body.appendChild(progressBar);
  window.addEventListener('scroll', () => {
    const scrolled = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
    progressBar.style.width = (scrolled * 100) + '%';
  }, { passive: true });

  // PIPELINE TAGS ENTRANCE -- stagger each tag
  const pipelineTags = document.querySelectorAll('.hero-pipeline .hp-tags span');
  if (pipelineTags.length) {
    pipelineTags.forEach((tag, i) => {
      tag.style.opacity = '0';
      tag.style.transform = 'translateY(8px) scale(.9)';
      tag.style.transition = `all .4s cubic-bezier(.22,1,.36,1) ${1.2 + i * .08}s`;
    });
    setTimeout(() => {
      pipelineTags.forEach(tag => {
        tag.style.opacity = '1';
        tag.style.transform = 'translateY(0) scale(1)';
      });
    }, 100);
  }

});
