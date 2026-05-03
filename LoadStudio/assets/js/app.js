/*
 * Load Studio PWA application logic
 *
 * Binds click events on the menu button and dark-mode toggle, smooth-
 * scrolls internal anchors, and registers the service worker so Load
 * Studio runs as a real offline PWA. Every selector is null-safe so a
 * missing element never blocks the rest of the script.
 */

document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.querySelector('.menu-btn');
  const darkToggle = document.querySelector('[aria-label="Toggle dark mode"]');

  if (menuBtn) {
    menuBtn.addEventListener('click', () => {
      document.body.classList.toggle('menu-open');
    });
  }

  if (darkToggle) {
    darkToggle.addEventListener('click', () => {
      const isDark = document.body.dataset.theme === 'dark';
      document.body.dataset.theme = isDark ? 'light' : 'dark';
    });
  }

  // Smooth scrolling for internal anchors.
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href').substring(1);
      if (!targetId) return;
      const target = document.getElementById(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
});

// Service worker registration (relative path so it resolves against
// /LoadStudio/ wherever the site is deployed). Silently ignores
// failures so a missing SW never blocks the page from loading.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { scope: './' }).catch(() => {});
  });
}
