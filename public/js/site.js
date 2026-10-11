(() => {
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
  if (nav && list && brand) {
    const toggle = document.createElement('button');
    toggle.className = 'nav-toggle';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Open navigation');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    toggle.addEventListener('click', () => {
      const open = list.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    nav.querySelector('.container').insertBefore(toggle, list);
    list.addEventListener('click', event => {
      if (event.target.closest('a')) {
        list.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
})();
