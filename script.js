// ============================================
// THE LINUX WAVE — interactions
// ============================================

const isTouch = window.matchMedia('(hover: none), (pointer: coarse)').matches;

/* -------- Custom cursor (desktop only) --------
 * Dual-layer magnetic cursor:
 *   - dot: fast-follow, near-instant
 *   - ring: trailing with spring physics + stretches toward motion
 * No mix-blend-mode (kills GPU on large pages). Uses translate3d + CSS vars.
 */
(() => {
  if (isTouch) {
    document.getElementById('cursor')?.remove();
    document.getElementById('cursor-dot')?.remove();
    document.body.classList.add('touch');
    return;
  }

  const ring = document.getElementById('cursor');
  const dot  = document.getElementById('cursor-dot');
  if (!ring || !dot) return;

  // Mouse target
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  // Dot (fast)
  let dxp = mx, dyp = my;
  // Ring (slow spring)
  let rx = mx, ry = my;
  // Ring velocity for stretch
  let vx = 0, vy = 0;

  // Tuned for smoothness
  const DOT_SPEED  = 0.42;   // dot lerp
  const RING_STIFF = 0.14;   // ring spring
  const STRETCH_K  = 0.08;   // how much it stretches
  const STRETCH_MAX = 0.45;  // cap

  window.addEventListener('pointermove', (e) => {
    mx = e.clientX; my = e.clientY;
  }, { passive: true });

  const hoverSel = 'a, button, .cco, .metric, .vs-card, .foreign-card, .verdict-box, .demand-card, .btn, .src';
  let isHover = false;
  document.addEventListener('pointerover', (e) => {
    if (e.target.closest(hoverSel)) { isHover = true; ring.classList.add('hover'); }
  });
  document.addEventListener('pointerout', (e) => {
    if (e.target.closest(hoverSel)) { isHover = false; ring.classList.remove('hover'); }
  });

  const tick = () => {
    // dot — near-instant follow
    dxp += (mx - dxp) * DOT_SPEED;
    dyp += (my - dyp) * DOT_SPEED;

    // ring — spring follow
    const nrx = rx + (mx - rx) * RING_STIFF;
    const nry = ry + (my - ry) * RING_STIFF;
    vx = nrx - rx;
    vy = nry - ry;
    rx = nrx; ry = nry;

    // stretch: scale along velocity direction
    const speed = Math.min(Math.hypot(vx, vy), 60);
    const stretch = Math.min(speed * STRETCH_K * 0.02, STRETCH_MAX);
    const angle = Math.atan2(vy, vx);
    const scaleX = 1 + stretch;
    const scaleY = 1 - stretch * 0.6;

    dot.style.transform  = `translate3d(${dxp}px, ${dyp}px, 0) translate(-50%,-50%)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%,-50%) rotate(${angle}rad) scale(${scaleX}, ${scaleY})`;

    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // hide briefly when leaving window
  document.addEventListener('pointerleave', () => ring.classList.add('gone'));
  document.addEventListener('pointerenter', () => ring.classList.remove('gone'));
})();

/* -------- Reveal on scroll -------- */
(() => {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
})();

/* -------- Metric counter animation -------- */
(() => {
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const animateNum = (el, target) => {
    const duration = 1600;
    const start = performance.now();
    const decimals = (target.toString().split('.')[1] || '').length;
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      el.textContent = (target * easeOut(p)).toFixed(decimals);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const num = entry.target.querySelector('.m-num');
      if (num) animateNum(num, parseFloat(entry.target.dataset.count));
      io.unobserve(entry.target);
    });
  }, { threshold: 0.3 });
  document.querySelectorAll('.metric[data-count]').forEach((el) => io.observe(el));
})();

/* -------- Horizontal drag-to-scroll (desktop only; mobile uses native touch) -------- */
(() => {
  if (isTouch) return;
  const row = document.querySelector('.hrow');
  if (!row) return;

  let isDown = false, startX = 0, startScroll = 0;
  row.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return;
    isDown = true;
    startX = e.clientX;
    startScroll = row.scrollLeft;
    row.setPointerCapture(e.pointerId);
    row.style.scrollSnapType = 'none';
    row.style.cursor = 'grabbing';
  });
  row.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    row.scrollLeft = startScroll - (e.clientX - startX);
  });
  const end = () => {
    isDown = false;
    row.style.scrollSnapType = '';
    row.style.cursor = '';
  };
  row.addEventListener('pointerup', end);
  row.addEventListener('pointercancel', end);
  row.addEventListener('pointerleave', end);
})();

/* -------- Parallax on hero grid (desktop only) -------- */
(() => {
  if (isTouch) return;
  const grid = document.querySelector('.hero-grid');
  if (!grid) return;
  let raf = null;
  window.addEventListener('scroll', () => {
    if (raf) return;
    raf = requestAnimationFrame(() => {
      const y = window.scrollY;
      if (y < window.innerHeight) {
        grid.style.transform = `translate3d(0, ${y * 0.3}px, 0)`;
      }
      raf = null;
    });
  }, { passive: true });
})();

/* -------- Smooth anchor with offset -------- */
(() => {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 60;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });
})();

/* -------- Nav shade on scroll -------- */
(() => {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  const update = () => {
    nav.classList.toggle('nav-scrolled', window.scrollY > 40);
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
})();

/* -------- Viewport height fix for iOS Safari -------- */
(() => {
  const setVH = () => {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  };
  setVH();
  window.addEventListener('resize', setVH);
  window.addEventListener('orientationchange', setVH);
})();
