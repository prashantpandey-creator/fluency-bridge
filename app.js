/* ============================================================
   FLUENCY BRIDGE — Interactions & Animations
   ============================================================ */

// ----- Mobile Navigation -----
const nav = document.getElementById('nav');
const mobileToggle = document.getElementById('mobileToggle');

mobileToggle?.addEventListener('click', () => {
  const isOpen = nav.classList.toggle('nav--open');
  mobileToggle.classList.toggle('nav__mobile-toggle--open');
  mobileToggle.setAttribute('aria-expanded', isOpen);
});

// Close mobile nav on link click
document.querySelectorAll('.nav__links a').forEach(link => {
  link.addEventListener('click', () => {
    nav.classList.remove('nav--open');
    mobileToggle.classList.remove('nav__mobile-toggle--open');
    mobileToggle.setAttribute('aria-expanded', 'false');
  });
});

// ----- Scroll: nav background -----
let scrollTicking = false;
function updateNavOnScroll() {
  if (!scrollTicking) {
    requestAnimationFrame(() => {
      const scrolled = window.scrollY > 20;
      nav.classList.toggle('nav--scrolled', scrolled);
      scrollTicking = false;
    });
    scrollTicking = true;
  }
}
window.addEventListener('scroll', updateNavOnScroll, { passive: true });

// ----- Intersection Observer: animate-in -----
const observerOptions = {
  threshold: 0.15,
  rootMargin: '0px 0px -50px 0px',
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-in--visible');
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Observe pain list items (staggered)
document.querySelectorAll('.pain-list__item').forEach((el, i) => {
  el.classList.add('animate-in');
  el.style.transitionDelay = `${i * 80}ms`;
  observer.observe(el);
});

// Observe category headers
document.querySelectorAll('.category__header').forEach(el => {
  el.classList.add('animate-in');
  observer.observe(el);
});

// Observe illustration cards
document.querySelectorAll('.illust-card').forEach((el, i) => {
  el.classList.add('animate-in');
  el.style.transitionDelay = `${i * 100}ms`;
  observer.observe(el);
});

// Observe visual elements
document.querySelectorAll('.young-scene, .adult-diagram, .plateau-visual, .intro__venn').forEach(el => {
  el.classList.add('animate-in');
  observer.observe(el);
});

// Observe comparison table
document.querySelector('.comparison__table-wrap')?.classList.add('animate-in');
document.querySelector('.comparison__table-wrap') && observer.observe(document.querySelector('.comparison__table-wrap'));

// Observe waitlist card
document.querySelector('.waitlist__card')?.classList.add('animate-in');
document.querySelector('.waitlist__card') && observer.observe(document.querySelector('.waitlist__card'));

// ----- Waitlist Form -----
function handleWaitlist(event) {
  event.preventDefault();
  const email = document.getElementById('waitlistEmail').value;
  const profile = document.getElementById('waitlistProfile').value;
  const form = document.getElementById('waitlistForm');
  const success = document.getElementById('waitlistSuccess');

  // Basic email validation
  if (!email || !email.includes('@')) return;

  // Animate out form, animate in success
  form.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
  form.style.opacity = '0';
  form.style.transform = 'translateY(-10px)';

  setTimeout(() => {
    form.style.display = 'none';
    success.style.display = 'block';
    success.style.animation = 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both';
  }, 300);

  // POST to backend API
  fetch('/api/waitlist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, profile })
  })
    .then(res => res.json())
    .then(data => console.log('Waitlist:', data.message))
    .catch(err => console.error('Waitlist error:', err));
}

// Expose to global scope (called from inline onclick)
window.handleWaitlist = handleWaitlist;

// ----- Smooth scroll helper -----
function scrollToWaitlist() {
  document.getElementById('waitlist').scrollIntoView({ behavior: 'smooth' });
}
window.scrollToWaitlist = scrollToWaitlist;

// ----- Active nav link highlighting -----
const navLinks = document.querySelectorAll('.nav__links a');
const sections = [];
navLinks.forEach(link => {
  const href = link.getAttribute('href');
  if (href && href.startsWith('#')) {
    const section = document.getElementById(href.slice(1));
    if (section) sections.push({ link, section });
  }
});

let navHighlightTicking = false;
function highlightNavOnScroll() {
  if (!navHighlightTicking) {
    requestAnimationFrame(() => {
      const scrollPos = window.scrollY + 100;

      let current = null;
      sections.forEach(({ link, section }) => {
        if (section.offsetTop <= scrollPos) {
          current = link;
        }
      });

      navLinks.forEach(link => link.style.color = '');
      if (current) {
        current.style.color = 'var(--color-primary)';
      }

      navHighlightTicking = false;
    });
    navHighlightTicking = true;
  }
}
window.addEventListener('scroll', highlightNavOnScroll, { passive: true });

// ----- Parallax orb movement on mouse move (hero) -----
const hero = document.querySelector('.hero');
const orbs = document.querySelectorAll('.hero__orb');

if (hero && orbs.length) {
  hero.addEventListener('mousemove', (e) => {
    const { left, top, width, height } = hero.getBoundingClientRect();
    const x = (e.clientX - left) / width - 0.5;
    const y = (e.clientY - top) / height - 0.5;

    requestAnimationFrame(() => {
      orbs[0].style.transform = `translate(${x * 40}px, ${y * 40}px)`;
      orbs[1].style.transform = `translate(${x * -30}px, ${y * -30}px)`;
      if (orbs[2]) {
        orbs[2].style.transform = `translate(calc(-50% + ${x * 20}px), calc(-50% + ${y * 20}px))`;
      }
    });
  });
}

// ----- Count-up animation for hero stats -----
const heroStats = document.querySelector('.hero__stats');
let statsAnimated = false;

const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting && !statsAnimated) {
      statsAnimated = true;
      animateStats();
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

if (heroStats) statsObserver.observe(heroStats);

function animateStats() {
  document.querySelectorAll('.hero__stat-number').forEach(stat => {
    const target = parseInt(stat.textContent);
    if (isNaN(target)) return;
    const duration = 1500;
    const start = performance.now();

    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      stat.textContent = current;
      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        stat.textContent = target;
      }
    }

    requestAnimationFrame(update);
  });
}

// ----- Log build info -----
console.log('%c🌉 Fluency Bridge %cloaded',
  'font-weight:800;font-size:1.2em;', '');
console.log('%cBuilt with learner research × AI analysis', 'color:#5c5854;');
console.log('%c4 learner profiles • 17 pain points • 1 unified method',
  'color:#2563eb;font-weight:500;');
