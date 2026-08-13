/* =========================================================
   CODE STUDIO — Animation & interaction layer
   ========================================================= */
(() => {
  const $  = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch      = matchMedia('(hover: none)').matches;

  /* ── 1. Sticky nav state ────────────────────────── */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 8);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── 2. Year ────────────────────────────────────── */
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  /* ── 3. Theme toggle ────────────────────────────── */
  const root = document.documentElement;
  const themeBtn = $('.theme-toggle');
  const stored = localStorage.getItem('cs-theme');
  if (stored === 'light') root.setAttribute('data-theme', 'light');
  themeBtn?.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    if (next === 'dark') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', 'light');
    localStorage.setItem('cs-theme', next);
  });

  /* ── 3b. Mobile menu toggle ─────────────────────── */
  const menuBtn = $('.menu-btn');
  const mobileMenu = $('#mobile-menu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      const isOpen = mobileMenu.classList.toggle('open');
      menuBtn.classList.toggle('open', isOpen);
      menuBtn.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    const closeMenu = () => {
      mobileMenu.classList.remove('open');
      menuBtn.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };
    $$('a', mobileMenu).forEach(link => link.addEventListener('click', closeMenu));
    mobileMenu.addEventListener('click', e => {
      if (e.target === mobileMenu) closeMenu();
    });
  }

  /* ── 4. Smooth-scroll offset ────────────────────── */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  });

  /* ── 5. Scroll progress bar ─────────────────────── */
  const progress = document.createElement('div');
  progress.className = 'scroll-progress';
  document.body.appendChild(progress);
  const updateProgress = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const p = max > 0 ? (window.scrollY / max) * 100 : 0;
    progress.style.width = p + '%';
  };
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);

  /* ── 6. Cursor spotlight (desktop only) ─────────── */
  if (!isTouch && !reduceMotion) {
    const spot = document.createElement('div');
    spot.className = 'cursor-spotlight';
    document.body.appendChild(spot);
    let tx = 0, ty = 0, cx = 0, cy = 0;
    let raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.12;
      cy += (ty - cy) * 0.12;
      spot.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    document.addEventListener('mousemove', e => {
      tx = e.clientX; ty = e.clientY;
      if (!spot.classList.contains('on')) spot.classList.add('on');
      if (!raf) tick();
    });
    document.addEventListener('mouseleave', () => spot.classList.remove('on'));
  }

  /* ── 7. Hero title — split into chars for stagger ── */
  const splitTitle = el => {
    if (!el || el.dataset.split) return;
    el.dataset.split = '1';
    const items = [];
    const walk = node => {
      Array.from(node.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          const text = child.textContent;
          const frag = document.createDocumentFragment();
          [...text].forEach(ch => {
            if (ch === ' ') frag.appendChild(document.createTextNode(' '));
            else {
              const span = document.createElement('span');
              span.className = 'split-char';
              span.textContent = ch;
              frag.appendChild(span);
              items.push(span);
            }
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          if (child.tagName === 'BR') return;
          walk(child);
        }
      });
    };
    walk(el);
    items.forEach((c, i) => c.style.setProperty('--cd', (i * 22) + 'ms'));
    return items;
  };
  const titleEl = $('.hero-title');
  const titleChars = splitTitle(titleEl) || [];

  /* Trigger char reveal once visible */
  const triggerHeroChars = () => titleChars.forEach(c => c.classList.add('in'));
  if (titleEl) {
    if ('IntersectionObserver' in window) {
      const titleIO = new IntersectionObserver((entries, obs) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            requestAnimationFrame(() => triggerHeroChars());
            obs.disconnect();
          }
        });
      }, { threshold: 0.2 });
      titleIO.observe(titleEl);
    } else triggerHeroChars();
  }

  /* ── 8. Reveal-on-scroll with stagger groups ───── */
  const groups = [
    { sel: '.section-head',                stagger: 0   },
    { sel: '.exp-card, .exp-content',      stagger: 120 },
    { sel: '.service-grid > .service',     stagger: 90  },
    { sel: '.step-item',                    stagger: 110 },
    { sel: '.case-grid > .case',           stagger: 130 },
    { sel: '.kpi-card, .testimonial-intro',stagger: 140 },
    { sel: '.faq-cols > div',              stagger: 120 },
    { sel: '.faq details',                 stagger: 60  },
    { sel: '.cta-card',                    stagger: 0   },
    { sel: '.footer-grid > *',             stagger: 80  },
  ];
  const revealEls = new Set();
  groups.forEach(g => {
    $$(g.sel).forEach((el, i) => {
      el.classList.add('reveal');
      el.style.setProperty('--rd', (i * g.stagger) + 'ms');
      revealEls.add(el);
    });
  });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in'));
  }

  /* ── 9. Number count-up ─────────────────────────── */
  const animateCounter = (el) => {
    const raw = el.textContent.trim();
    const m = raw.match(/^([^\d-]*)([\d.,]+)(.*)$/);
    if (!m) return;
    const prefix = m[1];
    const numStr = m[2].replace(/,/g, '');
    const suffix = m[3];
    const target = parseFloat(numStr);
    if (isNaN(target)) return;
    const decimals = (numStr.split('.')[1] || '').length;
    const duration = 2500;
    const ease = t => 1 - Math.pow(1 - t, 3);
    el.textContent = prefix + '0' + suffix;
    setTimeout(() => {
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        const v = target * ease(t);
        const fmt = decimals
          ? v.toFixed(decimals)
          : Math.round(v).toLocaleString('en-US');
        el.textContent = prefix + fmt + suffix;
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = raw;
      };
      requestAnimationFrame(step);
    }, 800);
  };
  const counterTargets = $$('.hero-meta strong[data-count], .kpi-grid strong[data-count]');
  if (!reduceMotion && 'IntersectionObserver' in window) {
    const cio = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCounter(e.target);
          cio.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });
    counterTargets.forEach(el => cio.observe(el));
  }

  /* ── 9b. Marquee — start only when fully visible + delay ── */
  const marquee = $('.marquee');
  if (marquee && 'IntersectionObserver' in window) {
    const mio = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          setTimeout(() => marquee.classList.add('in-view'), 800);
          mio.disconnect();
        }
      });
    }, { threshold: 0.6 });
    mio.observe(marquee);
  }

  /* ── 10. Magnetic primary buttons ───────────────── */
  if (!isTouch && !reduceMotion) {
    $$('.btn-primary').forEach(btn => {
      btn.classList.add('magnetic');
      const strength = 14;
      btn.addEventListener('mousemove', e => {
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
        const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
        btn.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  /* ── 11. Service-card mouse glow follower ───────── */
  $$('.service').forEach(card => {
    const shine = document.createElement('span');
    shine.className = 'service-shine';
    card.prepend(shine);
    if (isTouch || reduceMotion) return;
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      shine.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
      shine.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  });

  /* ── 12. 3D tilt on cards ───────────────────────── */
  const tiltSelectors = ['.service', '.case', '.quote', '.step-item', '.exp-stat'];
  if (!isTouch && !reduceMotion) {
    tiltSelectors.forEach(sel => {
      $$(sel).forEach(el => {
        el.classList.add('tilt');
        const max = 6;
        let raf = 0;
        const onMove = e => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width;
          const py = (e.clientY - r.top) / r.height;
          const rx = (py - 0.5) * -max;
          const ry = (px - 0.5) *  max;
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
          });
        };
        const onLeave = () => {
          cancelAnimationFrame(raf);
          el.style.transform = '';
        };
        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
      });
    });
  }

  /* ── 13. Parallax orbs ──────────────────────────── */
  const orbs = $$('.orb');
  if (orbs.length && !reduceMotion && !isTouch) {
    let raf = 0;
    document.addEventListener('mousemove', e => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30;
      const y = (e.clientY / window.innerHeight - 0.5) * 30;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        orbs.forEach((o, i) => {
          const f = i === 0 ? 1 : -1.2;
          o.style.translate = `${x * f}px ${y * f}px`;
        });
      });
    }, { passive: true });
  }

  /* ── 14. FAQ — only one open at a time ──────────── */
  const faqs = $$('.faq details');
  faqs.forEach(d => {
    d.addEventListener('toggle', () => {
      if (d.open) faqs.forEach(o => { if (o !== d) o.open = false; });
    });
  });

  /* ── 15. Scroll-linked hero background parallax ─── */
  if (!reduceMotion) {
    const heroBg = $('.hero-bg');
    let ticking = false;
    const onParallax = () => {
      const sy = Math.max(0, Math.min(window.scrollY, window.innerHeight));
      if (heroBg) heroBg.style.transform = `translate3d(0, ${sy * 0.25}px, 0)`;
      ticking = false;
    };
    onParallax();
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(onParallax); ticking = true; }
    }, { passive: true });
  }

  /* ── 16. Horizontal scroll testimonials ──────────── */
  const testimonialsSection = $('.testimonials');
  const quoteGrid = $('.quote-grid');
  if (testimonialsSection && quoteGrid && !matchMedia('(max-width: 720px)').matches) {
    const setHeight = () => {
      const scrollDist = quoteGrid.scrollWidth;
      testimonialsSection.style.height = (window.innerHeight + scrollDist) + 'px';
    };
    setHeight();
    window.addEventListener('resize', setHeight);

    let hTick = false;
    window.addEventListener('scroll', () => {
      if (!hTick) {
        requestAnimationFrame(() => {
          const rect = testimonialsSection.getBoundingClientRect();
          const scrolled = -rect.top;
          const maxShift = quoteGrid.scrollWidth - window.innerWidth + 40;
          const scrollRange = quoteGrid.scrollWidth;
          const progress = Math.max(0, Math.min(scrolled / scrollRange, 1));
          const tx = progress * Math.max(0, maxShift);
          quoteGrid.style.transform = `translateX(-${tx}px)`;
          hTick = false;
        });
        hTick = true;
      }
    }, { passive: true });
  }
})();
