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

document.querySelectorAll('.case-image-wrap, .case-meta, .reveal').forEach(reveal);

// Autoplay video when its wrap enters the viewport, pause when it leaves
document.querySelectorAll('.case-video').forEach(video => {
  const videoObs = new IntersectionObserver(entries => {
    entries[0].isIntersecting ? video.play() : video.pause();
  }, { threshold: 0.2 });
  videoObs.observe(video);
});
