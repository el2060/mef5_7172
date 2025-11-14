export class Chapter71Simulator {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  
  // Physics state
  private mass: number = 5; // kg
  private appliedForce: number = 20; // N
  private forceAngle: number = 0; // degrees
  private friction: number = 0.2;
  private surfaceType: 'smooth' | 'rough' = 'rough';
  
  // Calculated values
  private acceleration: number = 0;
  private netForce: number = 0;
  private normalForce: number = 0;
  private frictionForce: number = 0;
  
  // UI state
  private predictedDirection: 'left' | 'right' | 'none' | null = null;
  
  
  // Animation state
  private blockX: number = 150;
  private blockVelocity: number = 0;
  private blockWiggle: number = 0;

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.render();
    
    // Get canvas and context
    const canvasEl = document.querySelector<HTMLCanvasElement>('#physics-canvas');
    if (!canvasEl) throw new Error('Canvas not found');
    
    this.canvas = canvasEl;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Could not get 2D context');
    
    this.ctx = context;
    
    // Set canvas size
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    // Attach event listeners
    this.attachEventListeners();
    
    // Calculate initial values
    this.calculate();
    
    // Start animation loop
    this.animate();
  }

  private resizeCanvas() {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    
    this.canvas.width = parent.clientWidth;
    this.canvas.height = parent.clientHeight;
  }

  private render() {
    this.container.innerHTML = `
      <div class="simulator-card">
        <h2 class="chapter-title">Chapter 7, Part 1: Newton's Second Law of Motion</h2>
        <p class="chapter-subtitle">(Single Body)</p>
        
        <div class="simulator-layout">
          <div class="canvas-area">
            <canvas id="physics-canvas" class="canvas-container"></canvas>
          </div>
          
          <div class="controls-panel">
            <div class="control-section">
              <h3>Surface Type</h3>
              <div class="surface-toggle">
                <button class="toggle-btn" data-surface="smooth">Smooth</button>
                <button class="toggle-btn active" data-surface="rough">Rough</button>
              </div>
            </div>
            
            <div class="control-section">
              <h3>Adjust Forces</h3>
              
              <div class="slider-control">
                <div class="slider-label">
                  <span>Applied Force (F)</span>
                  <span class="slider-value" id="force-value">20 N</span>
                </div>
                <input type="range" id="force-slider" min="0" max="50" value="20" step="1">
                <div class="slider-info">Horizontal pushing force</div>
              </div>
              
              <div class="slider-control">
                <div class="slider-label">
                  <span>Force Angle (θ)</span>
                  <span class="slider-value" id="angle-value">0°</span>
                </div>
                <input type="range" id="angle-slider" min="0" max="60" value="0" step="5">
                <div class="slider-info">0° = horizontal, 60° = upward</div>
              </div>
              
              <div class="slider-control" id="friction-control">
                <div class="slider-label">
                  <span>Friction (μ)</span>
                  <span class="slider-value" id="friction-value">0.20</span>
                </div>
                <input type="range" id="friction-slider" min="0" max="1" value="0.2" step="0.05">
                <div class="slider-info">Coefficient of kinetic friction</div>
              </div>
              
              <div class="slider-control">
                <div class="slider-label">
                  <span>Mass (m)</span>
                  <span class="slider-value" id="mass-value">5 kg</span>
                </div>
                <input type="range" id="mass-slider" min="1" max="20" value="5" step="1">
                <div class="slider-info">Mass of the block</div>
              </div>
            </div>
            
            <div class="control-section">
              <h3>Predict Direction</h3>
              <p style="font-size: 0.875rem; opacity: 0.7; margin-bottom: 8px;">
                Which way will the block accelerate?
              </p>
              <div class="direction-buttons">
                <button class="direction-btn" data-direction="left">← Left</button>
                <button class="direction-btn" data-direction="none">No Motion</button>
                <button class="direction-btn" data-direction="right">Right →</button>
              </div>
              <div id="feedback-container"></div>
            </div>
            
            <div class="control-section">
              <h3>Results</h3>
              <div class="stats-display">
                <div class="stat-item">
                  <span class="stat-label">Acceleration</span>
                  <span class="stat-value" id="acceleration-display">0.00 m/s²</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Net Force</span>
                  <span class="stat-value" id="netforce-display">0.00 N</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private attachEventListeners() {
    // Surface toggle
    document.querySelectorAll('.toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const surface = target.dataset.surface as 'smooth' | 'rough';
        
        document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        
        this.surfaceType = surface;
        
        // Show/hide friction control
        const frictionControl = document.getElementById('friction-control');
        if (frictionControl) {
          frictionControl.style.display = surface === 'smooth' ? 'none' : 'block';
        }
        
        this.calculate();
        this.clearPrediction();
      });
    });

    // Sliders
    const forceSlider = document.getElementById('force-slider') as HTMLInputElement;
    forceSlider?.addEventListener('input', (e) => {
      this.appliedForce = parseFloat((e.target as HTMLInputElement).value);
      this.updateSliderDisplay('force-value', `${this.appliedForce} N`);
      this.calculate();
      this.clearPrediction();
    });

    const angleSlider = document.getElementById('angle-slider') as HTMLInputElement;
    angleSlider?.addEventListener('input', (e) => {
      this.forceAngle = parseFloat((e.target as HTMLInputElement).value);
      this.updateSliderDisplay('angle-value', `${this.forceAngle}°`);
      this.calculate();
      this.clearPrediction();
    });

    const frictionSlider = document.getElementById('friction-slider') as HTMLInputElement;
    frictionSlider?.addEventListener('input', (e) => {
      this.friction = parseFloat((e.target as HTMLInputElement).value);
      this.updateSliderDisplay('friction-value', this.friction.toFixed(2));
      this.calculate();
      this.clearPrediction();
    });

    const massSlider = document.getElementById('mass-slider') as HTMLInputElement;
    massSlider?.addEventListener('input', (e) => {
      this.mass = parseFloat((e.target as HTMLInputElement).value);
      this.updateSliderDisplay('mass-value', `${this.mass} kg`);
      this.calculate();
      this.clearPrediction();
    });

    // Direction prediction buttons
    document.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const direction = target.dataset.direction as 'left' | 'right' | 'none';
        
        document.querySelectorAll('.direction-btn').forEach(b => {
          b.classList.remove('selected', 'correct', 'incorrect');
        });
        target.classList.add('selected');
        
        this.predictedDirection = direction;
        this.checkPrediction();
      });
    });
  }

  private updateSliderDisplay(id: string, value: string) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  private calculate() {
    const g = 9.8; // m/s²
    const angleRad = (this.forceAngle * Math.PI) / 180;
    
    // Vertical forces
    const Fy = this.appliedForce * Math.sin(angleRad);
  this.normalForce = Math.max(0, this.mass * g - Fy);
    
  // Check vertical equilibrium: ΣFy = N + Fy - mg
  const verticalNet = this.normalForce + Fy - this.mass * g;
  this.blockWiggle = Math.abs(verticalNet) > 0.1 ? 1 : 0;
    
    // Horizontal forces
    const Fx = this.appliedForce * Math.cos(angleRad);
    this.frictionForce = this.surfaceType === 'rough' ? this.friction * this.normalForce : 0;
    
    this.netForce = Fx - this.frictionForce;
    this.acceleration = this.netForce / this.mass;
    
    // Update displays
    const accelEl = document.getElementById('acceleration-display');
    const forceEl = document.getElementById('netforce-display');
    
    if (accelEl) {
      accelEl.textContent = `${this.acceleration.toFixed(2)} m/s²`;
      accelEl.className = 'stat-value';
      if (Math.abs(this.acceleration) < 0.01) {
        accelEl.classList.add('zero');
      } else if (this.acceleration > 0) {
        accelEl.classList.add('positive');
      } else {
        accelEl.classList.add('negative');
      }
    }
    
    if (forceEl) {
      forceEl.textContent = `${this.netForce.toFixed(2)} N`;
      forceEl.className = 'stat-value';
      if (Math.abs(this.netForce) < 0.01) {
        forceEl.classList.add('zero');
      } else if (this.netForce > 0) {
        forceEl.classList.add('positive');
      } else {
        forceEl.classList.add('negative');
      }
    }
    
    // Update block velocity for animation
    this.blockVelocity = this.acceleration * 0.5; // Scaled for visual effect
  }

  private clearPrediction() {
    this.predictedDirection = null;
    document.querySelectorAll('.direction-btn').forEach(b => {
      b.classList.remove('selected', 'correct', 'incorrect');
    });
    const feedbackContainer = document.getElementById('feedback-container');
    if (feedbackContainer) feedbackContainer.innerHTML = '';
  }

  private checkPrediction() {
    if (this.predictedDirection === null) return;
    
    let actualDirection: 'left' | 'right' | 'none';
    if (Math.abs(this.acceleration) < 0.01) {
      actualDirection = 'none';
    } else if (this.acceleration > 0) {
      actualDirection = 'right';
    } else {
      actualDirection = 'left';
    }
    
    const isCorrect = this.predictedDirection === actualDirection;
    
    // Update button states
    document.querySelectorAll('.direction-btn').forEach(btn => {
      const direction = btn.getAttribute('data-direction');
      if (direction === this.predictedDirection) {
        btn.classList.add(isCorrect ? 'correct' : 'incorrect');
      }
    });
    
    // Show feedback
    const feedbackContainer = document.getElementById('feedback-container');
    if (!feedbackContainer) return;
    
    if (isCorrect) {
      feedbackContainer.innerHTML = `
        <div class="feedback-box success">
          ✓ Correct! The net force is ${this.netForce.toFixed(2)} N ${actualDirection === 'right' ? 'to the right' : actualDirection === 'left' ? 'to the left' : 'is zero'}.
          Acceleration = ΣF / m = ${this.acceleration.toFixed(2)} m/s²
        </div>
      `;
    } else {
      let hint = '';
      if (this.surfaceType === 'rough') {
        hint = `Check ΣFx. Applied force (horizontal) = ${(this.appliedForce * Math.cos(this.forceAngle * Math.PI / 180)).toFixed(2)} N, Friction = ${this.frictionForce.toFixed(2)} N`;
      } else {
        hint = `With no friction, only the applied force matters. Horizontal component = ${(this.appliedForce * Math.cos(this.forceAngle * Math.PI / 180)).toFixed(2)} N`;
      }
      
      feedbackContainer.innerHTML = `
        <div class="feedback-box error">
          ✗ Not quite. ${hint}
        </div>
      `;
    }
  }

  private animate = () => {
    this.draw();
    this.animationId = requestAnimationFrame(this.animate);
  };

  private draw() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw ground
    const groundY = height * 0.65;
    ctx.fillStyle = this.surfaceType === 'rough' ? '#D3D3D3' : '#E5E5E5';
    ctx.fillRect(0, groundY, width, 4);
    
    // Draw rough surface pattern
    if (this.surfaceType === 'rough') {
      ctx.strokeStyle = '#A0A0A0';
      ctx.lineWidth = 2;
      for (let x = 0; x < width; x += 15) {
        ctx.beginPath();
        ctx.moveTo(x, groundY);
        ctx.lineTo(x + 8, groundY + 8);
        ctx.stroke();
      }
    }
    
    // Update block position (simple animation)
    this.blockX += this.blockVelocity * 0.1;
    
    // Keep block in bounds
    const blockSize = 140;
    if (this.blockX < 100) this.blockX = 100;
    if (this.blockX > width - blockSize - 100) this.blockX = width - blockSize - 100;
    
    // Draw block
    const blockY = groundY - blockSize - (Math.sin(Date.now() * 0.01) * this.blockWiggle * 3);
    
    // Block shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(this.blockX + 5, groundY + 5, blockSize, 8);
    
    // Block body
    ctx.fillStyle = '#007AFF';
    ctx.strokeStyle = '#005FA3';
    ctx.lineWidth = 4;
    ctx.fillRect(this.blockX, blockY, blockSize, blockSize);
    ctx.strokeRect(this.blockX, blockY, blockSize, blockSize);
    
    // Draw block label
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 20px "IBM Plex Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.mass} kg`, this.blockX + blockSize / 2, blockY + blockSize / 2 + 7);
    
    // Draw force arrows
    this.drawForceArrows(this.blockX + blockSize / 2, blockY + blockSize / 2);
    
    // Draw info text
    ctx.fillStyle = '#383838';
    ctx.font = '600 14px "IBM Plex Mono"';
    ctx.textAlign = 'left';
    ctx.fillText(`Surface: ${this.surfaceType.toUpperCase()}`, 20, 30);
    if (this.blockWiggle > 0) {
      ctx.fillStyle = '#FF6E6C';
      ctx.font = '700 14px "IBM Plex Mono"';
      ctx.fillText('⚠ Net vertical force ≠ 0', 20, 55);
    }
  }

  private drawForceArrows(centerX: number, centerY: number) {
    const ctx = this.ctx;
    const angleRad = (this.forceAngle * Math.PI) / 180;
    
    // Applied force
    if (this.appliedForce > 0) {
      const scale = 3;
      const endX = centerX + this.appliedForce * scale * Math.cos(angleRad);
      const endY = centerY - this.appliedForce * scale * Math.sin(angleRad);
      
  this.drawArrow(ctx, centerX, centerY, endX, endY, '#21AD93', this.appliedForce + ' N @ ' + this.forceAngle + '°');
    }
    
    // Friction force (if rough surface)
    if (this.surfaceType === 'rough' && this.frictionForce > 0) {
      const scale = 3;
      const direction = this.appliedForce * Math.cos(angleRad) > 0 ? -1 : 1;
      const endX = centerX + direction * this.frictionForce * scale;
      
  this.drawArrow(ctx, centerX, centerY, endX, centerY, '#FF6E6C', 'Ff = ' + this.frictionForce.toFixed(1) + ' N');
    }
    
    // Normal force
    const normalScale = 2.2;
    const normalEndY = centerY - this.normalForce * normalScale;
  this.drawArrow(ctx, centerX, centerY, centerX, normalEndY, '#007AFF', 'N = ' + this.normalForce.toFixed(1) + ' N');
    
    // Weight
    const weightScale = 2.2;
    const weight = this.mass * 9.8;
    const weightEndY = centerY + weight * weightScale;
  this.drawArrow(ctx, centerX, centerY, centerX, weightEndY, '#FFE100', 'W = ' + weight.toFixed(1) + ' N');
  }

  private drawArrow(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, value: string) {
    const headlen = 15;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    
    // Draw white outline for visibility
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    
    // Draw arrowhead
    ctx.fillStyle = color;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // Calculate label position (offset from arrow)
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const perpAngle = angle + Math.PI / 2;
    const offset = 35;
    const labelX = midX + Math.cos(perpAngle) * offset;
    const labelY = midY + Math.sin(perpAngle) * offset;
    
    // Draw label background
    ctx.font = '700 14px "IBM Plex Mono"';
    ctx.textAlign = 'center';
    const metrics = ctx.measureText(value);
    const padding = 8;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    const rectX = labelX - metrics.width / 2 - padding;
    const rectY = labelY - 18;
    const rectW = metrics.width + padding * 2;
    const rectH = 28;
    ctx.fillRect(rectX, rectY, rectW, rectH);
    ctx.strokeRect(rectX, rectY, rectW, rectH);
    
    // Draw label text
    ctx.fillStyle = color;
    ctx.font = '700 13px "IBM Plex Mono"';
    ctx.fillText(value, labelX, labelY - 2);
  }

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.container.innerHTML = '';
  }
}
