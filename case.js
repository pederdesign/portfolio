// Scroll reveal — same as homepage
function reveal(el) {
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      el.getBoundingClientRect();
      el.classList.add('in');
      obs.disconnect();
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });
  obs.observe(el);
}

document.querySelectorAll('.reveal').forEach(reveal);

// Autoplay videos when in view, pause when out
document.querySelectorAll('.case-video').forEach(video => {
  const obs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, { threshold: 0.1 });
  obs.observe(video);
});

// Hide header on scroll down, show on scroll up; add bg when scrolled
let lastY = 0;
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  const scrollingDown = y > lastY;
  header.classList.toggle('hidden', scrollingDown && y > 80);
  header.classList.toggle('has-bg', !scrollingDown && y > 80);
  lastY = y;
}, { passive: true });
