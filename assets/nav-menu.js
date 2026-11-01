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

  // 넓은 화면이라도 메뉴 줄이 로고와 겹치거나 화면 밖으로 나가면(언어마다 글자 길이가 다르다)
  // <html> 에 nav-collapsed 를 붙여 휴대폰과 같은 ☰ 메뉴로 접는다(2026-11-02, 7개 언어).
  var root = document.documentElement;
  var brand = document.querySelector('.brand-mark');
  function fit() {
    if (window.innerWidth <= 720) {
      root.classList.remove('nav-collapsed');
      return;
    }
    root.classList.add('nav-measuring');
    var was = root.classList.contains('nav-collapsed');
    root.classList.remove('nav-collapsed');
    var r = nav.getBoundingClientRect();
    var left = brand ? brand.getBoundingClientRect().right + 2 : 2;
    var tooWide = r.left < left || r.right > window.innerWidth - 2;
    root.classList.toggle('nav-collapsed', tooWide);
    if (!tooWide && nav.classList.contains('open')) setOpen(false);
    void nav.offsetWidth; // 접힌 상태를 먼저 그리고 나서 애니메이션을 되살린다
    root.classList.remove('nav-measuring');
    if (was !== tooWide && nav.classList.contains('open')) setOpen(false);
  }
  var pending = 0;
  function fitSoon() {
    if (pending) return;
    pending = requestAnimationFrame(function () { pending = 0; fit(); });
  }
  fit();
  window.addEventListener('resize', fitSoon);
  window.addEventListener('load', fitSoon);
  document.addEventListener('lcic:langchange', fitSoon);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitSoon);
  // 아이콘(iconify)·로고 그림이 늦게 그려져 폭이 바뀌는 경우. 접고 펴도 결과가 같으면 다시 안 불린다.
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(fitSoon);
    ro.observe(nav);
    if (brand) ro.observe(brand);
  } else {
    setTimeout(fitSoon, 1200);
  }

  // Reset state when growing back to desktop width.
  window.addEventListener('resize', function () {
    if (window.innerWidth > 720 && !root.classList.contains('nav-collapsed') && nav.classList.contains('open')) setOpen(false);
  });
})();
