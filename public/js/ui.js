/* ===== COUNTDOWN TIMER ===== */
/**
 * Initializes the results day countdown timer.
 */
export function initCountdown() {
  // Results Day: May 4, 2026, 8:00 AM IST (UTC+5:30 → UTC 2:30 AM)
  const resultsDay = new Date('2026-05-04T02:30:00Z');

  function update() {
    const now = new Date();
    const diff = resultsDay - now;

    if (diff <= 0) {
      document.getElementById('countdownCard').innerHTML = `
        <div class="countdown-label">🎉 Results Are Out!</div>
        <div style="font-size:1.5rem;font-weight:800;color:var(--saffron);margin:0.5rem 0;">
          Check results at results.eci.gov.in
        </div>
        <a href="https://results.eci.gov.in/" target="_blank" rel="noopener" class="btn btn-primary" style="display:inline-block;margin-top:0.5rem;">
          View Live Results →
        </a>`;
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n) => String(n).padStart(2, '0');

    setVal('cdDays', pad(days));
    setVal('cdHours', pad(hours));
    setVal('cdMins', pad(minutes));
    setVal('cdSecs', pad(seconds));
  }

  /**
   * Helper to set value and trigger flip animation.
   * @param {string} id - Element ID.
   * @param {string} val - Value to set.
   */
  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el && el.textContent !== val) {
      el.textContent = val;
      el.classList.add('flip');
      el.addEventListener('animationend', () => el.classList.remove('flip'), { once: true });
    }
  }

  update();
  setInterval(update, 1000);
}

/* ===== LIVE BADGE STATUS ===== */
/**
 * Checks if polls are currently open and updates the live badge.
 */
export function checkElectionStatus() {
  // West Bengal Phase II: April 29, 2026, 7 AM to 6 PM IST
  const pollStart = new Date('2026-04-29T01:30:00Z'); // 7 AM IST
  const pollEnd = new Date('2026-04-29T12:30:00Z'); // 6 PM IST
  const now = new Date();

  const badge = document.getElementById('liveBadge');
  if (!badge) return;

  if (now >= pollStart && now <= pollEnd) {
    // Voting is live right now
    badge.style.display = 'inline-flex';
  } else if (now > pollEnd) {
    // Voting has ended today
    badge.innerHTML = `
      <span class="live-dot" style="background: var(--saffron);"></span>
      <span class="live-text" style="color: var(--saffron);">VOTING CONCLUDED — Awaiting Results on May 4</span>`;
    badge.style.background = 'rgba(255, 153, 51, 0.1)';
    badge.style.borderColor = 'rgba(255, 153, 51, 0.6)';
  } else {
    // Before polls open
    badge.innerHTML = `
      <span style="font-size:0.9rem;">🗳️</span>
      <span class="live-text">West Bengal Phase II — Polling Today</span>`;
  }
}

/* ===== NAVBAR ===== */
/**
 * Initializes the navigation bar with mobile toggle and scroll effects.
 */
export function initNavbar() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  const navbar = document.getElementById('navbar');

  // Toggle mobile menu
  hamburger?.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    hamburger.classList.toggle('active');
  });

  // Close menu on link click
  navLinks?.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('active');
    });
  });

  // Navbar background on scroll
  window.addEventListener(
    'scroll',
    () => {
      if (window.scrollY > 60) {
        navbar.style.background = 'rgba(5,6,15,0.98)';
      } else {
        navbar.style.background = 'rgba(5,6,15,0.85)';
      }

      // Highlight active nav section
      highlightActiveSection();
    },
    { passive: true },
  );
}

/**
 * Highlights the active section in the navigation bar based on scroll position.
 */
function highlightActiveSection() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link');
  let currentId = '';

  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 100;
    if (window.scrollY >= sectionTop) {
      currentId = section.getAttribute('id');
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove('active');
    if (link.getAttribute('href') === `#${currentId}`) {
      link.classList.add('active');
    }
  });
}

/* ===== FAQ ACCORDION ===== */
/**
 * Initializes the FAQ accordion functionality.
 */
export function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach((item) => {
    const btn = item.querySelector('.faq-question');
    btn?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      // Close all
      faqItems.forEach((i) => {
        i.classList.remove('open');
        i.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
      });

      // Open clicked (unless it was already open)
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ===== SCROLL ANIMATIONS ===== */
/**
 * Initializes IntersectionObserver for scroll-triggered animations.
 */
export function initScrollAnimations() {
  const observerOptions = {
    threshold: 0.12,
    rootMargin: '0px 0px -40px 0px',
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  const targets = document.querySelectorAll(
    '.service-card, .etype-card, .info-card, .contact-card, .timeline-item, .faq-item, .stats-bar, .countdown-card',
  );

  targets.forEach((el, i) => {
    el.classList.add('animate-in');
    el.style.transitionDelay = `${(i % 4) * 60}ms`;
    observer.observe(el);
  });
}
