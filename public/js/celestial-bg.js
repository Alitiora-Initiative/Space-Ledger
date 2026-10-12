/**
 * Celestial Background Generator
 *
 * Creates a dynamic rainbow-colored celestial background with stars and nebulas
 * using the 7 colors of the rainbow for a cosmic theme.
 */

class CelestialBackground {
  constructor() {
    this.container = null;
    this.stars = [];
    this.nebulas = [];
    this.rainbowColors = [
      'rgba(255, 0, 0, 0.3)',    // Red
      'rgba(255, 127, 0, 0.3)',  // Orange
      'rgba(255, 255, 0, 0.3)',  // Yellow
      'rgba(0, 255, 0, 0.3)',    // Green
      'rgba(0, 0, 255, 0.3)',    // Blue
      'rgba(75, 0, 130, 0.3)',   // Indigo
      'rgba(148, 0, 211, 0.3)'   // Violet
    ];

    this.init();
  }

  init() {
    // Create container
    this.container = document.createElement('div');
    this.container.className = 'celestial-bg';
    document.body.appendChild(this.container);

    // Generate stars
    this.generateStars(200);

    // Generate nebulas
    this.generateNebulas(7);

    // Handle resize
    window.addEventListener('resize', () => this.handleResize());
  }

  generateStars(count) {
    for (let i = 0; i < count; i++) {
      const star = document.createElement('div');
      star.className = 'celestial-star';

      const size = Math.random() * 3 + 1;
      const color = this.rainbowColors[Math.floor(Math.random() * this.rainbowColors.length)];
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const delay = Math.random() * 4;
      const duration = Math.random() * 3 + 2;

      star.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        left: ${x}%;
        top: ${y}%;
        animation-delay: ${delay}s;
        animation-duration: ${duration}s;
        box-shadow: 0 0 ${size * 2}px ${color};
      `;

      this.container.appendChild(star);
      this.stars.push(star);
    }
  }

  generateNebulas(count) {
    for (let i = 0; i < count; i++) {
      const nebula = document.createElement('div');
      nebula.className = 'celestial-nebula';

      const size = Math.random() * 400 + 200;
      const color = this.rainbowColors[i % this.rainbowColors.length];
      const x = Math.random() * 100 - 50;
      const y = Math.random() * 100 - 50;
      const duration = Math.random() * 60 + 60;

      nebula.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle, ${color} 0%, transparent 70%);
        left: ${x}%;
        top: ${y}%;
        animation-duration: ${duration}s;
      `;

      this.container.appendChild(nebula);
      this.nebulas.push(nebula);
    }
  }

  handleResize() {
    // Regenerate on resize to maintain coverage
    this.container.innerHTML = '';
    this.stars = [];
    this.nebulas = [];
    this.generateStars(200);
    this.generateNebulas(7);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new CelestialBackground();
  });
} else {
  new CelestialBackground();
}
