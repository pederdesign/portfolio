function reveal(el, delay) {
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      el.getBoundingClientRect();
      if (delay) {
        setTimeout(() => { el.classList.add('in'); }, delay);
      } else {
        el.classList.add('in');
      }
      obs.disconnect();
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
  obs.observe(el);
}

// Stagger elements already in the viewport on load, scroll-trigger the rest
window.addEventListener('load', () => {
  let i = 0;
  document.querySelectorAll('.case-image-wrap, .case-meta, .reveal').forEach(el => {
    const rect = el.getBoundingClientRect();
    const inViewport = rect.top < window.innerHeight && rect.bottom > 0;
    reveal(el, inViewport ? 100 + i++ * 150 : 0);
  });
});

// Autoplay video when its wrap enters the viewport, pause when it leaves
document.querySelectorAll('.case-video').forEach(video => {
  const videoObs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, { threshold: 0.1 });
  videoObs.observe(video);
});
