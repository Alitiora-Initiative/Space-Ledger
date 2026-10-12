(() => {
  const palette = ['#40d9ea', '#65d495', '#f3bd62', '#ff7c70', '#9ca8ff', '#73b9ff', '#d69bfa'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const stage = document.createElement('div');
  const canvas = document.createElement('canvas');
  const list = document.createElement('ul');
  const context = canvas.getContext('2d');
  let agents = [];
  let width = 0;
  let height = 0;
  let ratio = 1;
  let previousTime = 0;
  let frame = 0;

  if (!context) return;

  stage.id = 'agent-visualization';
  stage.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'display:block;width:100%;height:100%;';
  list.className = 'sr-only';
  list.setAttribute('aria-label', 'Configured agent roles');
  stage.append(canvas, list);
  document.body.prepend(stage);

  function resize() {
    ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    agents.forEach(agent => {
      agent.x = Math.min(width - agent.radius, Math.max(agent.radius, agent.x));
      agent.y = Math.min(height - agent.radius, Math.max(agent.radius, agent.y));
    });
    draw(0);
  }

  function updateScales() {
    const count = agents.length;
    const supportingScale = Math.max(0.12, Math.pow(0.82, Math.max(0, count - 4)));
    agents.forEach(agent => {
      agent.scale = agent.id === '001' ? 1.65 : supportingScale;
      agent.radius = (agent.id === '001' ? 20 : 18) * agent.scale;
    });
  }

  function syncRegistry(registry) {
    if (!registry || typeof registry !== 'object') return;
    const entries = Object.values(registry);
    const nextIds = new Set(entries.map(agent => String(agent.id)));
    agents = agents.filter(agent => nextIds.has(agent.id));

    entries.forEach(data => {
      const id = String(data.id);
      let agent = agents.find(item => item.id === id);
      if (!agent) {
        const angle = Math.random() * Math.PI * 2;
        agent = {
          id,
          name: String(data.name || `Agent ${id}`),
          type: String(data.type || 'Configured role'),
          status: String(data.status || 'available'),
          color: palette[agents.length % palette.length],
          x: width * (0.2 + Math.random() * 0.6),
          y: height * (0.2 + Math.random() * 0.6),
          vx: Math.cos(angle),
          vy: Math.sin(angle),
          scale: 1,
          radius: 18
        };
        agents.push(agent);
      } else {
        agent.name = String(data.name || agent.name);
        agent.type = String(data.type || agent.type);
        agent.status = String(data.status || 'available');
      }
    });

    updateScales();
    list.replaceChildren(...agents.map(agent => {
      const item = document.createElement('li');
      item.textContent = `${agent.name}, agent ${agent.id}, ${agent.type}, status ${agent.status}`;
      return item;
    }));
    draw(0);
  }

  function rgb(hex) {
    const value = Number.parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  function draw(time) {
    context.clearRect(0, 0, width, height);
    const delta = Math.min((time - previousTime) / 1000 || 0, 0.05);
    previousTime = time;

    agents.forEach(agent => {
      const active = agent.status === 'active' || agent.status === 'working';
      const speed = reducedMotion.matches ? 0 : (active ? 54 : 5);
      agent.x += agent.vx * speed * delta;
      agent.y += agent.vy * speed * delta;
      if (agent.x < agent.radius || agent.x > width - agent.radius) agent.vx *= -1;
      if (agent.y < agent.radius || agent.y > height - agent.radius) agent.vy *= -1;
      agent.x = Math.min(width - agent.radius, Math.max(agent.radius, agent.x));
      agent.y = Math.min(height - agent.radius, Math.max(agent.radius, agent.y));

      const [red, green, blue] = rgb(agent.color);
      const radius = agent.radius;
      const glow = context.createRadialGradient(agent.x, agent.y, radius * 0.2, agent.x, agent.y, radius * 2.6);
      glow.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${active ? 0.2 : 0.07})`);
      glow.addColorStop(1, `rgba(${red}, ${green}, ${blue}, 0)`);
      context.fillStyle = glow;
      context.beginPath();
      context.arc(agent.x, agent.y, radius * 2.6, 0, Math.PI * 2);
      context.fill();

      const sphere = context.createRadialGradient(
        agent.x - radius * 0.36, agent.y - radius * 0.42, radius * 0.05,
        agent.x, agent.y, radius
      );
      sphere.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      sphere.addColorStop(0.18, `rgba(${red}, ${green}, ${blue}, 0.96)`);
      sphere.addColorStop(0.72, `rgba(${red}, ${green}, ${blue}, ${agent.scale < 0.25 ? 0.42 : 0.8})`);
      sphere.addColorStop(1, 'rgba(4, 12, 24, 0.78)');
      context.fillStyle = sphere;
      context.beginPath();
      context.arc(agent.x, agent.y, radius, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = `rgba(225, 249, 255, ${agent.id === '001' ? 0.65 : 0.25})`;
      context.lineWidth = agent.id === '001' ? 1.5 : 0.8;
      context.stroke();
    });

    if (!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(draw);
  }

  async function loadRegistry() {
    try {
      const response = await fetch('/api/agents/registry', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      if (data.status === 'success') syncRegistry(data.registry);
    } catch {
      // Keep the background quiet when the registry is unavailable.
    }
  }

  function resume() {
    cancelAnimationFrame(frame);
    previousTime = 0;
    draw(performance.now());
  }

  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(frame);
    else resume();
  });
  reducedMotion.addEventListener?.('change', resume);
  resize();
  loadRegistry();
})();
