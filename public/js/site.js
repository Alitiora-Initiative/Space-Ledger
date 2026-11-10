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

  // The legacy animated galaxy canvas was removed. The shared CSS theme now
  // paints the final background on first render, avoiding a second graphic layer.

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

  if (!document.querySelector('script[data-wallet-reconnect]')) {
    const s = document.createElement('script');
    s.src = (location.pathname.includes('/pages/') ? '../js/' : 'js/') + 'walletReconnect.js';
    s.defer = true;
    s.setAttribute('data-wallet-reconnect', '1');
    document.head.appendChild(s);
  }
})();
