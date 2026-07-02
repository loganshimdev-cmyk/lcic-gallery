/* Mobile navigation toggle for the floating nav pill.
   On narrow screens the desktop nav pill is far wider than the viewport, so we
   collapse it into a hamburger menu. Injected site-wide from a single file so
   every page with .nav-pill gets the same behaviour without markup changes. */
(function () {
  var nav = document.querySelector('.nav-pill');
  if (!nav || document.querySelector('.nav-toggle')) return;

  var HAMBURGER = '☰'; // ☰
  var CLOSE = '✕';     // ✕

  var btn = document.createElement('button');
  btn.className = 'nav-toggle';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Menu');
  btn.setAttribute('aria-controls', 'primary-nav');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span aria-hidden="true">' + HAMBURGER + '</span>';
  if (!nav.id) nav.id = 'primary-nav';
  document.body.appendChild(btn);

  function setOpen(open) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.innerHTML = '<span aria-hidden="true">' + (open ? CLOSE : HAMBURGER) + '</span>';
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!nav.classList.contains('open'));
  });

  // Close after tapping a real link (but keep open when using the language toggle).
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) setOpen(false);
  });

  // Close when tapping outside the menu.
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('open') && !nav.contains(e.target) && !btn.contains(e.target)) {
      setOpen(false);
    }
  });

  // Close on Escape.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });

  // Reset state when growing back to desktop width.
  window.addEventListener('resize', function () {
    if (window.innerWidth > 720 && nav.classList.contains('open')) setOpen(false);
  });
})();
