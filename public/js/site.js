(() => {
  // Shared presentation, responsive navigation and accessibility enhancements.
  const hasPolishStylesheet = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
    .some(link => /(?:^|\/)polish\.css(?:\?|$)/.test(link.getAttribute('href') || ''));
  if (!document.querySelector('link[data-polish]') && !hasPolishStylesheet) {
    const polish = document.createElement('link');
    polish.rel = 'stylesheet';
    polish.href = (location.pathname.includes('/pages/') ? '../css/' : 'css/') + 'polish.css';
    polish.setAttribute('data-polish', '1');
    document.head.appendChild(polish);
  }
  // Shared orbital-glass theme for every application page.
  if (!document.querySelector('link[data-universe-styles]')) {
    const theme = document.createElement('link');
    theme.rel = 'stylesheet';
    theme.href = (location.pathname.includes('/pages/') ? '../css/' : 'css/') + 'universe.css';
    theme.dataset.universeStyles = '1';
    document.head.appendChild(theme);
  }
  if (!document.querySelector('link[data-release1-styles]')) {
    const styles = document.createElement('link');
    styles.rel = 'stylesheet';
    styles.href = (location.pathname.includes('/pages/') ? '../css/' : 'css/') + 'release1.css';
    styles.dataset.release1Styles = '1';
    document.head.appendChild(styles);
  }
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = '/manifest.webmanifest';
    document.head.appendChild(manifest);
  }
  if (!document.querySelector('meta[name="theme-color"]')) {
    const themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    themeColor.content = '#030814';
    document.head.appendChild(themeColor);
  }
  if (!document.querySelector('link[data-release1-styles]')) {
    const releaseStyles = document.createElement('link');
    releaseStyles.rel = 'stylesheet';
    releaseStyles.href = (location.pathname.includes('/pages/') ? '../css/' : 'css/') + 'release1.css';
    releaseStyles.dataset.release1Styles = '1';
    document.head.appendChild(releaseStyles);
  }
  if (!document.querySelector('link[rel="manifest"]')) {
    const manifest = document.createElement('link');
    manifest.rel = 'manifest';
    manifest.href = '/manifest.webmanifest';
    document.head.appendChild(manifest);
  }
  if (!document.querySelector('meta[name="theme-color"]')) {
    const themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    themeColor.content = '#030814';
    document.head.appendChild(themeColor);
  }
  // Preserve keyboard access and give every page a consistent main landmark.
  const main = document.querySelector('main');
  if (main) {
    if (!main.id) main.id = 'main-content';
    if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1');
    let skipLink = document.querySelector('a.skip-link');
    if (!skipLink) {
      skipLink = document.createElement('a');
      skipLink.className = 'skip-link';
      skipLink.href = '#main-content';
      skipLink.textContent = 'Skip to main content';
      document.body.insertBefore(skipLink, document.body.firstChild);
    } else {
      skipLink.href = '#main-content';
    }
  }

  const canvas = document.createElement('canvas');
  canvas.className = 'galaxy-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (context) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 0;
    let height = 0;
    let ratio = 1;
    let stars = [];
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    function resize() {
      ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.min(420, Math.max(130, Math.round((width * height) / 6500)));
      let seed = 4202025;
      const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
      stars = Array.from({ length: count }, () => ({
        x: random() * width,
        y: random() * height,
        radius: random() * 1.15 + 0.2,
        phase: random() * Math.PI * 2,
        drift: random() * 0.12 + 0.025,
        tint: random() > 0.82 ? '#84cfff' : random() > 0.86 ? '#c99dff' : '#edf5ff'
      }));
      draw(0);
    }

    function draw(time) {
      context.fillStyle = '#03030a';
      context.fillRect(0, 0, width, height);

      const movement = reducedMotion.matches ? 0 : time * 0.000018;
      const glows = [
        { x: width * (0.22 + Math.sin(movement) * 0.07) + pointerX * 10, y: height * (0.26 + Math.cos(movement * 0.8) * 0.05) + pointerY * 8, r: Math.max(width, height) * 0.54, c: '30,85,190' },
        { x: width * (0.78 + Math.cos(movement * 0.7) * 0.06) - pointerX * 8, y: height * (0.55 + Math.sin(movement * 0.9) * 0.07) - pointerY * 7, r: Math.max(width, height) * 0.50, c: '105,38,190' },
        { x: width * (0.52 + Math.sin(movement * 0.55) * 0.05), y: height * 0.98, r: Math.max(width, height) * 0.42, c: '0,126,152' }
      ];
      glows.forEach(glow => {
        const gradient = context.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, glow.r);
        gradient.addColorStop(0, `rgba(${glow.c},0.22)`);
        gradient.addColorStop(0.42, `rgba(${glow.c},0.085)`);
        gradient.addColorStop(1, `rgba(${glow.c},0)`);
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      });

      stars.forEach(star => {
        const twinkle = 0.4 + (Math.sin(time * 0.001 + star.phase) + 1) * 0.3;
        const driftY = reducedMotion.matches ? 0 : (time * star.drift) % (height + 8);
        const y = (star.y - driftY + height + 4) % (height + 4);
        context.globalAlpha = twinkle;
        context.fillStyle = star.tint;
        context.beginPath();
        context.arc(star.x, y, star.radius, 0, Math.PI * 2);
        context.fill();
        if (star.radius > 1.05) {
          context.globalAlpha = twinkle * 0.22;
          context.beginPath();
          context.arc(star.x, y, star.radius * 3.2, 0, Math.PI * 2);
          context.fill();
        }
      });
      context.globalAlpha = 1;

      const vignette = context.createRadialGradient(width / 2, height / 2, height * 0.12, width / 2, height / 2, Math.max(width, height) * 0.76);
      vignette.addColorStop(0, 'rgba(1,2,10,0)');
      vignette.addColorStop(1, 'rgba(1,1,7,0.48)');
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);

      if (!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(draw);
    }

    function start() {
      cancelAnimationFrame(frame);
      draw(performance.now());
    }

    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', event => {
      pointerX = event.clientX / Math.max(width, 1) - 0.5;
      pointerY = event.clientY / Math.max(height, 1) - 0.5;
    }, { passive: true });
    document.addEventListener('visibilitychange', start);
    reducedMotion.addEventListener?.('change', start);
    resize();
    start();
  }

  const nav = document.querySelector('nav');
  const list = nav?.querySelector('ul');
  const brand = nav?.querySelector('.container > a');
  if (!document.head.querySelector('link[rel~="icon"]')) {
    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/jpeg';
    icon.href = '/img/logo.jpg';
    document.head.append(icon);
  }
  if (!document.head.querySelector('link[rel="apple-touch-icon"]')) {
    const icon = document.createElement('link');
    icon.rel = 'apple-touch-icon';
    icon.href = '/img/logo.jpg';
    document.head.append(icon);
  }
  if (nav && list && brand) {
    if (!list.querySelector('a[href="/pages/token.html"]')) {
      const tokenItem = document.createElement('li');
      const tokenLink = document.createElement('a');
      tokenLink.href = '/pages/token.html';
      tokenLink.textContent = '$SL';
      if (window.location.pathname.endsWith('/pages/token.html')) {
        tokenLink.className = 'active';
        tokenLink.setAttribute('aria-current', 'page');
      }
      tokenItem.append(tokenLink);
      const tokenWallet = list.querySelector('.wallet-button, #navWalletBtn')?.closest('li');
      list.insertBefore(tokenItem, tokenWallet || null);
    }
    if (!list.querySelector('a[href="/pages/leaderboard.html"]')) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = '/pages/leaderboard.html';
      link.textContent = 'Leaderboard';
      if (window.location.pathname === '/pages/leaderboard.html') {
        link.className = 'active';
        link.setAttribute('aria-current', 'page');
      }
      item.append(link);
      const walletItem = list.querySelector('.wallet-button, #navWalletBtn')?.closest('li');
      list.insertBefore(item, walletItem || null);
    }
    // Use one consistent active-page state across all static pages.
    const normalisePath = value => value.replace(/\/index\.html$/, '/');
    const currentPath = normalisePath(window.location.pathname);
    list.querySelectorAll('a[href]').forEach(link => {
      try {
        const url = new URL(link.href, window.location.href);
        if (url.origin === window.location.origin && normalisePath(url.pathname) === currentPath) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        }
      } catch (_) { /* ignore malformed navigation links */ }
    });

    if (!list.id) list.id = 'primary-navigation';
    const toggle = document.createElement('button');
    toggle.className = 'nav-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Open navigation');
    toggle.title = 'Open navigation';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', list.id);
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    const setNavigationOpen = open => {
      list.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      toggle.title = open ? 'Close navigation' : 'Open navigation';
    };
    toggle.addEventListener('click', () => {
      setNavigationOpen(!list.classList.contains('nav-open'));
    });
    nav.querySelector('.container').insertBefore(toggle, list);
    nav.setAttribute('aria-label', 'Main navigation');
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && list.classList.contains('nav-open')) {
        setNavigationOpen(false);
        toggle.focus();
      }
    });
    list.addEventListener('click', event => {
      if (event.target.closest('a')) {
        setNavigationOpen(false);
      }
    });
  }

  // Pages with their own footer keep it; pages without one receive the shared compact footer.
  if (!document.querySelector('.site-footer')) {
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = '<div class="site-footer-inner"><span>Space Ledger · Solana Devnet beta</span><nav aria-label="Legal information"><a href="/pages/privacy.html">Privacy</a><a href="/pages/terms.html">Terms</a><a href="/pages/cookies.html">Cookies</a></nav></div>';
    document.body.append(footer);
  }

  if (!document.querySelector('script[data-mobile-support]')) {
    const support = document.createElement('script');
    support.src = (location.pathname.includes('/pages/') ? '../js/' : 'js/') + 'mobileSupport.js';
    support.defer = true;
    support.dataset.mobileSupport = '1';
    document.head.appendChild(support);
  }

  if (!document.querySelector('script[data-mobile-support]')) {
    const support = document.createElement('script');
    support.src = (location.pathname.includes('/pages/') ? '../js/' : 'js/') + 'mobileSupport.js';
    support.defer = true;
    support.dataset.mobileSupport = '1';
    document.head.appendChild(support);
  }

  if (!document.querySelector('script[data-wallet-reconnect]')) {
    const s = document.createElement('script');
    s.src = (location.pathname.includes('/pages/') ? '../js/' : 'js/') + 'walletReconnect.js';
    s.defer = true;
    s.setAttribute('data-wallet-reconnect', '1');
    document.head.appendChild(s);
  }
})();
