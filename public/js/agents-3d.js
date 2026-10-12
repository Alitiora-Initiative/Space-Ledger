/**
 * GILGA PRIME 3D Agent Visualization
 *
 * Renders 3D rainbow-colored agent spheres with small hands (Among Us style)
 * that move around the webpage in real-time.
 */

class Agent3D {
  constructor(agentId, name, color, startPosition) {
    this.agentId = agentId;
    this.name = name;
    this.color = color;
    this.position = startPosition;
    this.velocity = {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2
    };
    this.targetPosition = null;
    this.state = 'idle'; // idle, working, moving
    this.rotation = 0;
    this.bobOffset = Math.random() * Math.PI * 2;
  }

  update(deltaTime, bounds) {
    // Bobbing animation
    this.bobOffset += deltaTime * 3;

    // Movement towards target or random wandering
    if (this.targetPosition) {
      const dx = this.targetPosition.x - this.position.x;
      const dy = this.targetPosition.y - this.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 5) {
        this.position.x += (dx / dist) * 60 * deltaTime;
        this.position.y += (dy / dist) * 60 * deltaTime;
        this.rotation = Math.atan2(dy, dx);
      } else {
        this.targetPosition = null;
        this.state = 'idle';
      }
    } else {
      // Random wandering
      this.position.x += this.velocity.x * 30 * deltaTime;
      this.position.y += this.velocity.y * 30 * deltaTime;

      // Bounce off bounds
      if (this.position.x < bounds.minX || this.position.x > bounds.maxX) {
        this.velocity.x *= -1;
        this.position.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.position.x));
      }
      if (this.position.y < bounds.minY || this.position.y > bounds.maxY) {
        this.velocity.y *= -1;
        this.position.y = Math.max(bounds.minY, Math.min(bounds.maxY, this.position.y));
      }

      // Slowly change direction
      this.velocity.x += (Math.random() - 0.5) * 0.5;
      this.velocity.y += (Math.random() - 0.5) * 0.5;

      // Clamp velocity
      const maxSpeed = 1.5;
      const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
      if (speed > maxSpeed) {
        this.velocity.x = (this.velocity.x / speed) * maxSpeed;
        this.velocity.y = (this.velocity.y / speed) * maxSpeed;
      }

      this.rotation = Math.atan2(this.velocity.y, this.velocity.x);
    }
  }

  setTarget(x, y) {
    this.targetPosition = { x, y };
    this.state = 'moving';
  }

  setState(newState) {
    this.state = newState;
  }
}

class AgentSystem3D {
  constructor() {
    this.agents = [];
    this.container = null;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.agentMeshes = new Map();
    this.lastTime = 0;
    this.bounds = { minX: 0, maxX: window.innerWidth, minY: 0, maxY: window.innerHeight };

    // Rainbow colors for 7 agents
    this.rainbowColors = [
      0xff0000, // Red
      0xff7f00, // Orange
      0xffff00, // Yellow
      0x00ff00, // Green
      0x0000ff, // Blue
      0x4b0082, // Indigo
      0x9400d3  // Violet
    ];

    this.init();
  }

  init() {
    // Create container
    this.container = document.createElement('div');
    this.container.id = 'agent-3d-container';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 1000;
      overflow: hidden;
    `;
    document.body.appendChild(this.container);

    // Initialize Three.js if available
    if (typeof THREE !== 'undefined') {
      this.initThreeJS();
    } else {
      // Load Three.js dynamically
      this.loadThreeJS();
    }

    // Start update loop
    this.startUpdateLoop();

    // Connect to agent API
    this.connectToAgentAPI();

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
  }

  loadThreeJS() {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.onload = () => this.initThreeJS();
    document.head.appendChild(script);
  }

  initThreeJS() {
    if (typeof THREE === 'undefined') return;

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 100;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.container.appendChild(this.renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x00d4ff, 0.5, 200);
    pointLight.position.set(0, 0, 50);
    this.scene.add(pointLight);

    // Create initial agents
    this.createAgents();

    // Start render loop
    this.animate();
  }

  createAgents() {
    const agentData = [
      { id: '001', name: 'Gilga Prime', colorIndex: 0 },
      { id: '002', name: 'Survivor', colorIndex: 1 },
      { id: '003', name: 'Contradictor', colorIndex: 2 },
      { id: '004', name: 'Judge', colorIndex: 3 },
      { id: '005', name: 'Architect', colorIndex: 4 },
      { id: '006', name: 'Security', colorIndex: 5 },
      { id: '007', name: 'QA Engineer', colorIndex: 6 }
    ];

    agentData.forEach((data, index) => {
      const color = this.rainbowColors[data.colorIndex];
      const position = {
        x: 100 + (index % 3) * 200,
        y: 100 + Math.floor(index / 3) * 200
      };

      const agent = new Agent3D(data.id, data.name, color, position);
      this.agents.push(agent);

      // Create 3D mesh
      this.createAgentMesh(agent);
    });
  }

  createAgentMesh(agent) {
    if (!this.scene) return;

    const group = new THREE.Group();

    // Main sphere body (Among Us style)
    const bodyGeometry = new THREE.SphereGeometry(8, 32, 32);
    const bodyMaterial = new THREE.MeshPhongMaterial({
      color: agent.color,
      shininess: 100,
      specular: 0x444444
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    group.add(body);

    // Visor (faceplate)
    const visorGeometry = new THREE.CapsuleGeometry(3, 4, 4, 8);
    const visorMaterial = new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      shininess: 150,
      specular: 0xffffff,
      transparent: true,
      opacity: 0.8
    });
    const visor = new THREE.Mesh(visorGeometry, visorMaterial);
    visor.position.set(3, 2, 0);
    visor.rotation.z = -Math.PI / 6;
    group.add(visor);

    // Small left hand
    const handGeometry = new THREE.SphereGeometry(2, 16, 16);
    const handMaterial = new THREE.MeshPhongMaterial({
      color: agent.color,
      shininess: 100
    });
    const leftHand = new THREE.Mesh(handGeometry, handMaterial);
    leftHand.position.set(-6, -4, 2);
    group.add(leftHand);

    // Small right hand
    const rightHand = new THREE.Mesh(handGeometry, handMaterial);
    rightHand.position.set(6, -4, 2);
    group.add(rightHand);

    // Backpack
    const backpackGeometry = new THREE.BoxGeometry(3, 5, 2);
    const backpackMaterial = new THREE.MeshPhongMaterial({
      color: agent.color,
      shininess: 80
    });
    const backpack = new THREE.Mesh(backpackGeometry, backpackMaterial);
    backpack.position.set(-7, 0, 0);
    group.add(backpack);

    // Glow effect
    const glowGeometry = new THREE.SphereGeometry(10, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: agent.color,
      transparent: true,
      opacity: 0.15
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    group.add(glow);

    // Position group
    group.position.set(agent.position.x, agent.position.y, 0);

    this.scene.add(group);
    this.agentMeshes.set(agent.agentId, {
      group,
      body,
      visor,
      leftHand,
      rightHand,
      backpack,
      glow
    });
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Update agents
    this.agents.forEach(agent => {
      agent.update(deltaTime, this.bounds);

      // Update 3D mesh
      const mesh = this.agentMeshes.get(agent.agentId);
      if (mesh) {
        // Position with bobbing
        mesh.group.position.x = agent.position.x;
        mesh.group.position.y = agent.position.y + Math.sin(agent.bobOffset) * 2;

        // Rotation based on movement direction
        mesh.group.rotation.z = agent.rotation;

        // Animate hands (wave animation)
        const handWave = Math.sin(currentTime * 0.005 + agent.bobOffset) * 0.3;
        mesh.leftHand.rotation.z = handWave;
        mesh.rightHand.rotation.z = -handWave;

        // Animate visor (blink occasionally)
        if (Math.random() < 0.01) {
          mesh.visor.scale.y = 0.1;
          setTimeout(() => {
            if (mesh.visor) mesh.visor.scale.y = 1;
          }, 100);
        }

        // State-based animations
        if (agent.state === 'working') {
          mesh.body.scale.set(1.1, 0.9, 1.1);
          mesh.glow.material.opacity = 0.3;
        } else if (agent.state === 'moving') {
          mesh.body.scale.set(1, 1, 1);
          mesh.glow.material.opacity = 0.2;
        } else {
          mesh.body.scale.set(1, 1, 1);
          mesh.glow.material.opacity = 0.15;
        }
      }
    });

    // Render
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  startUpdateLoop() {
    // Update agent states from API
    setInterval(() => this.updateAgentStates(), 2000);
  }

  async connectToAgentAPI() {
    try {
      const response = await fetch('/api/agents/registry');
      const data = await response.json();

      if (data.status === 'success' && data.registry) {
        this.syncAgentsWithRegistry(data.registry);
      }
    } catch (error) {
      console.error('Failed to connect to agent API:', error);
    }
  }

  syncAgentsWithRegistry(registry) {
    Object.values(registry).forEach(agentData => {
      const existingAgent = this.agents.find(a => a.agentId === agentData.id);
      if (existingAgent) {
        existingAgent.name = agentData.name;
        existingAgent.state = agentData.status === 'active' ? 'working' : 'idle';
      }
    });
  }

  async updateAgentStates() {
    try {
      const response = await fetch('/api/agents/registry');
      const data = await response.json();

      if (data.status === 'success' && data.registry) {
        this.syncAgentsWithRegistry(data.registry);
      }
    } catch (error) {
      // Silently fail on network errors
    }
  }

  handleResize() {
    this.bounds = {
      minX: 0,
      maxX: window.innerWidth,
      minY: 80, // Account for nav
      maxY: window.innerHeight
    };

    if (this.camera && this.renderer) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  // Public API for controlling agents
  moveAgentTo(agentId, x, y) {
    const agent = this.agents.find(a => a.agentId === agentId);
    if (agent) {
      agent.setTarget(x, y);
    }
  }

  setAgentState(agentId, state) {
    const agent = this.agents.find(a => a.agentId === agentId);
    if (agent) {
      agent.setState(state);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.agentSystem3D = new AgentSystem3D();
  });
} else {
  window.agentSystem3D = new AgentSystem3D();
}
