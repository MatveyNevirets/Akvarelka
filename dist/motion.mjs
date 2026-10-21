export function initMotion() {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let observer;
  const targets = [...document.querySelectorAll('.hero-copy > *, .hero-visual, .section-heading, .english-grid > *, .signup-grid > *, .faq-grid > *, .atmosphere-grid > *, .review-grid > *, .activity-list > a, .contacts-grid > *')];
  function reveal() {
    observer?.disconnect();
    targets.forEach(element => { element.classList.remove('reveal','is-visible'); });
    if (reduced.matches || !('IntersectionObserver' in window)) return;
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, {threshold:0.06, rootMargin:'0px 0px 24px 0px'});
    targets.forEach(element => {
      // Cap staggering at 120ms; above-the-fold copy stays immediately available.
      const index = [...element.parentElement.children].indexOf(element);
      element.style.setProperty('--reveal-delay', Math.min(index * 45,120) + 'ms');
      element.classList.add('reveal');
      observer.observe(element);
    });
  }
  reveal();
  const activeFAQs = new Set();
  document.querySelectorAll('.faq-list details').forEach(details => {
    const summary = details.querySelector('summary');
    let animation;
    let desiredOpen = details.open;
    const finish = () => {
      details.open = desiredOpen;
      details.style.removeProperty('height');
      details.style.removeProperty('overflow');
      activeFAQs.delete(stop);
      animation = null;
    };
    const stop = () => { animation?.cancel(); finish(); };
    summary.addEventListener('click', event => {
      if (reduced.matches || !details.animate) return; // Keep native details fallback.
      event.preventDefault();
      const start = details.getBoundingClientRect().height;
      desiredOpen = animation ? !desiredOpen : !details.open;
      animation?.cancel();
      details.open = true;
      details.style.removeProperty('height');
      const end = desiredOpen ? details.getBoundingClientRect().height : summary.getBoundingClientRect().height;
      details.style.overflow = 'hidden';
      animation = details.animate([{height:start+'px'},{height:end+'px'}], {duration:230,easing:'cubic-bezier(.2,.7,.3,1)'});
      activeFAQs.add(stop);
      animation.onfinish = finish;
    });
  });
  const finePointer = window.matchMedia('(min-width: 1100px) and (hover: hover) and (pointer: fine)');
  const hero = document.querySelector('.hero-visual');
  let frame = 0;
  function updateParallax() {
    frame = 0;
    const enabled = finePointer.matches && !reduced.matches;
    const offset = enabled ? Math.min(6,Math.max(0,window.scrollY)*.025) : 0;
    hero.style.setProperty('--parallax-y', offset+'px');
  }
  function scheduleParallax() { if(!frame) frame = requestAnimationFrame(updateParallax); }
  window.addEventListener('scroll',scheduleParallax,{passive:true});
  finePointer.addEventListener('change',scheduleParallax);
  reduced.addEventListener('change',()=>{ activeFAQs.forEach(stop=>stop()); reveal(); scheduleParallax(); });
}
