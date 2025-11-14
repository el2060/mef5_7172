export class Chapter72Simulator {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private labelRects: Array<{x:number;y:number;w:number;h:number}> = [];
  
  // System type
  private systemType: 'pulley' | 'incline' | 'table' = 'pulley';
  
  // Physics state
  private massA: number = 5; // kg
  private massB: number = 3; // kg
  private inclineAngle: number = 30; // degrees
  private friction: number = 0.2;
  
  // Calculated values
  private acceleration: number = 0;
  private tension: number = 0;
  
  // UI state
  private predictedDirection: 'A-right-B-down' | 'A-left-B-up' | 'none' | null = null;
  
  // Animation state
  private ropeOffset: number = 0;
  private systemVelocity: number = 0;

  constructor(container: HTMLDivElement) {
    this.container = container;
    this.render();
    
    // Get canvas and context
    const canvasEl = document.querySelector<HTMLCanvasElement>('#physics-canvas-72');
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
  // Angle dial for incline
  this.initAngleDial72();
    
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
        <h2 class="chapter-title">Chapter 7, Part 2: Newton's Second Law of Motion</h2>
        <p class="chapter-subtitle">(Connected Bodies)</p>
        
        <div class="simulator-layout">
          <div class="canvas-area">
            <canvas id="physics-canvas-72" class="canvas-container"></canvas>
          </div>
          
          <div class="controls-panel">
            <details class="control-collapse" open>
              <summary>System Type <span class="chev">▾</span></summary>
              <div class="content">
                <div class="system-selector">
                  <div class="system-option selected" data-system="pulley">
                    <h4>Block A + Hanging Block B</h4>
                    <p>Pulley system with cable</p>
                  </div>
                  <div class="system-option" data-system="incline">
                    <h4>Inclined Plane + Hanging Mass</h4>
                    <p>Block on slope connected to hanging mass</p>
                  </div>
                  <div class="system-option" data-system="table">
                    <h4>Two Blocks on Table</h4>
                    <p>Connected blocks on rough surface</p>
                  </div>
                </div>
              </div>
            </details>

            <details class="control-collapse" open>
              <summary>Adjust Parameters <span class="chev">▾</span></summary>
              <div class="content">
                <div class="slider-control">
                  <div class="slider-label">
                    <span>Mass A (m₁)</span>
                    <span class="slider-value" id="massA-value">5 kg</span>
                  </div>
                  <input type="range" id="massA-slider" min="1" max="20" value="5" step="1">
                </div>

                <div class="slider-control">
                  <div class="slider-label">
                    <span>Mass B (m₂)</span>
                    <span class="slider-value" id="massB-value">3 kg</span>
                  </div>
                  <input type="range" id="massB-slider" min="1" max="20" value="3" step="1">
                </div>

                <div id="angle-control" style="display: none;">
                  <div class="angle-dial">
                    <canvas id="incline-dial-72" width="120" height="120"></canvas>
                    <div>
                      <div class="angle-readout"><span id="incline-value">30°</span></div>
                      <div class="slider-info">Drag the dial to set incline angle (0°–60°)</div>
                    </div>
                  </div>
                </div>

                <div class="slider-control">
                  <div class="slider-label">
                    <span>Friction (μ)</span>
                    <span class="slider-value" id="friction72-value">0.20</span>
                  </div>
                  <input type="range" id="friction72-slider" min="0" max="1" value="0.2" step="0.05">
                </div>
              </div>
            </details>

            <details class="control-collapse" open>
              <summary>Predict Motion Direction <span class="chev">▾</span></summary>
              <div class="content">
                <p style="font-size: 0.875rem; opacity: 0.7; margin-bottom: 8px;">
                  Which way will the system accelerate?
                </p>
                <div class="direction-buttons">
                  <button class="direction-btn" data-direction="A-right-B-down">A → / B ↓</button>
                  <button class="direction-btn" data-direction="none">No Motion</button>
                  <button class="direction-btn" data-direction="A-left-B-up">A ← / B ↑</button>
                </div>
                <div id="feedback-container-72"></div>
              </div>
            </details>

            <details class="control-collapse" open>
              <summary>System Results <span class="chev">▾</span></summary>
              <div class="content">
                <div class="stats-display">
                  <div class="stat-item">
                    <span class="stat-label">Acceleration (a)</span>
                    <span class="stat-value" id="accel72-display">0.00 m/s²</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">Tension (T)</span>
                    <span class="stat-value" id="tension-display">0.00 N</span>
                  </div>
                </div>
                <div class="feedback-box success" style="margin-top: 16px;">
                  <strong>Key Concept:</strong> Because the cable is light and inextensible, both blocks share the same acceleration magnitude.
                </div>
              </div>
            </details>
          </div>
        </div>
      </div>
    `;
  }

  private initAngleDial72() {
    const canvas = document.getElementById('incline-dial-72') as HTMLCanvasElement | null;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const drawDial = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 10;
      // Base circle
      ctx.strokeStyle = '#E5E5E5';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      // Limit arc (0..60°)
      ctx.strokeStyle = '#AEDCF8';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, (60 * Math.PI) / 180, false);
      ctx.stroke();
      // Current angle arc
      ctx.strokeStyle = '#007AFF';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, (this.inclineAngle * Math.PI) / 180, false);
      ctx.stroke();
      // Handle
      const a = (this.inclineAngle * Math.PI) / 180;
      const hx = cx + r * Math.cos(a);
      const hy = cy + r * Math.sin(a);
      ctx.fillStyle = '#007AFF';
      ctx.beginPath();
      ctx.arc(hx, hy, 7, 0, Math.PI * 2);
      ctx.fill();
    };

    const setAngleFromEvent = (ev: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = (ev as TouchEvent).touches ? (ev as TouchEvent).touches[0].clientX : (ev as MouseEvent).clientX;
      const clientY = (ev as TouchEvent).touches ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
      const x = clientX - rect.left - canvas.width / 2;
      const y = clientY - rect.top - canvas.height / 2;
      let ang = Math.atan2(y, x); // radians
      if (ang < 0) ang += Math.PI * 2;
      let deg = (ang * 180) / Math.PI;
      // Clamp to 0..60
      if (deg > 60 && deg < 300) deg = 60;
      if (deg >= 300) deg = 0;
      this.inclineAngle = Math.round(deg);
      const angleVal = document.getElementById('incline-value');
      if (angleVal) angleVal.textContent = `${this.inclineAngle}°`;
      this.calculate();
      this.clearPrediction();
      drawDial();
    };

    let dragging = false;
    canvas.addEventListener('mousedown', () => (dragging = true));
    canvas.addEventListener('touchstart', () => (dragging = true));
    window.addEventListener('mouseup', () => (dragging = false));
    window.addEventListener('touchend', () => (dragging = false));
    canvas.addEventListener('mousemove', (e) => dragging && setAngleFromEvent(e));
    canvas.addEventListener('touchmove', (e) => { if (dragging) { e.preventDefault(); setAngleFromEvent(e); } }, { passive: false });

    drawDial();
  }

  private attachEventListeners() {
    // System type selector
    document.querySelectorAll('.system-option').forEach(option => {
      option.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLDivElement;
        const system = target.dataset.system as 'pulley' | 'incline' | 'table';
        
        document.querySelectorAll('.system-option').forEach(opt => opt.classList.remove('selected'));
        target.classList.add('selected');
        
        this.systemType = system;
        
        // Show/hide angle control
        const angleControl = document.getElementById('angle-control');
        if (angleControl) {
          angleControl.style.display = system === 'incline' ? 'block' : 'none';
        }
        
        this.calculate();
        this.clearPrediction();
      });
    });

    // Sliders
    const massASlider = document.getElementById('massA-slider') as HTMLInputElement;
    massASlider?.addEventListener('input', (e) => {
      this.massA = parseFloat((e.target as HTMLInputElement).value);
      this.updateSliderDisplay('massA-value', `${this.massA} kg`);
      this.calculate();
      this.clearPrediction();
    });

    const massBSlider = document.getElementById('massB-slider') as HTMLInputElement;
    massBSlider?.addEventListener('input', (e) => {
      this.massB = parseFloat((e.target as HTMLInputElement).value);
      this.updateSliderDisplay('massB-value', `${this.massB} kg`);
      this.calculate();
      this.clearPrediction();
    });

    const inclineSlider = document.getElementById('incline-slider') as HTMLInputElement;
    inclineSlider?.addEventListener('input', (e) => {
      this.inclineAngle = parseFloat((e.target as HTMLInputElement).value);
      this.updateSliderDisplay('incline-value', `${this.inclineAngle}°`);
      this.calculate();
      this.clearPrediction();
    });

    const frictionSlider = document.getElementById('friction72-slider') as HTMLInputElement;
    frictionSlider?.addEventListener('input', (e) => {
      this.friction = parseFloat((e.target as HTMLInputElement).value);
      this.updateSliderDisplay('friction72-value', this.friction.toFixed(2));
      this.calculate();
      this.clearPrediction();
    });

    // Direction prediction buttons
    document.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const direction = target.dataset.direction as 'A-right-B-down' | 'A-left-B-up' | 'none';
        
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
    
    if (this.systemType === 'pulley') {
      // Block A on table, Block B hanging
      // For A: T - f = m₁a
      // For B: m₂g - T = m₂a
      // Solving: a = (m₂g - μm₁g) / (m₁ + m₂)
      
      const frictionForce = this.friction * this.massA * g;
      const weightB = this.massB * g;
      
      this.acceleration = (weightB - frictionForce) / (this.massA + this.massB);
      this.tension = this.massB * (g - this.acceleration);
      
    } else if (this.systemType === 'incline') {
      // Block A on incline, Block B hanging
      const angleRad = (this.inclineAngle * Math.PI) / 180;
      const normalForce = this.massA * g * Math.cos(angleRad);
      const frictionForce = this.friction * normalForce;
      const componentDownSlope = this.massA * g * Math.sin(angleRad);
      
      // For A (up slope positive): T - f - m₁g sin θ = m₁a
      // For B (down positive): m₂g - T = m₂a
      // Solving: a = (m₂g - m₁g sin θ - f) / (m₁ + m₂)
      
      this.acceleration = (this.massB * g - componentDownSlope - frictionForce) / (this.massA + this.massB);
      this.tension = this.massB * (g - this.acceleration);
      
    } else { // table
      // Both blocks on table
      // Assuming B is being pulled by external force or we treat it as if A pulls B
      // Simplified: Similar to pulley but both on table
      const frictionA = this.friction * this.massA * g;
      const frictionB = this.friction * this.massB * g;
      const totalFriction = frictionA + frictionB;
      
      // If there's an external force, we'd need that. For now, assume they're connected
      // and one is pulled. Let's assume net force consideration.
      this.acceleration = -totalFriction / (this.massA + this.massB); // Deceleration due to friction
      this.tension = this.massB * Math.abs(this.acceleration);
    }
    
    // Update displays
    this.updateSliderDisplay('accel72-display', `${this.acceleration.toFixed(2)} m/s²`);
    this.updateSliderDisplay('tension-display', `${this.tension.toFixed(2)} N`);
    
    // Update animation velocity
    this.systemVelocity = this.acceleration * 0.5;
  }

  private clearPrediction() {
    this.predictedDirection = null;
    document.querySelectorAll('.direction-btn').forEach(b => {
      b.classList.remove('selected', 'correct', 'incorrect');
    });
    const feedbackContainer = document.getElementById('feedback-container-72');
    if (feedbackContainer) feedbackContainer.innerHTML = '';
  }

  private checkPrediction() {
    if (this.predictedDirection === null) return;
    
    let actualDirection: 'A-right-B-down' | 'A-left-B-up' | 'none';
    if (Math.abs(this.acceleration) < 0.01) {
      actualDirection = 'none';
    } else if (this.acceleration > 0) {
      actualDirection = 'A-right-B-down';
    } else {
      actualDirection = 'A-left-B-up';
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
    const feedbackContainer = document.getElementById('feedback-container-72');
    if (!feedbackContainer) return;
    
    if (isCorrect) {
      feedbackContainer.innerHTML = `
        <div class="feedback-box success">
          ✓ Correct! The system accelerates at ${Math.abs(this.acceleration).toFixed(2)} m/s².
          Tension in the cable: ${this.tension.toFixed(2)} N
        </div>
      `;
    } else {
      let hint = '';
      const g = 9.8;
      
      if (this.systemType === 'pulley') {
        hint = `Compare the pulling forces: Weight of B = ${(this.massB * g).toFixed(1)} N vs Friction on A = ${(this.friction * this.massA * g).toFixed(1)} N`;
      } else if (this.systemType === 'incline') {
        const angleRad = (this.inclineAngle * Math.PI) / 180;
        const component = this.massA * g * Math.sin(angleRad);
        hint = `Compare: Weight of B = ${(this.massB * g).toFixed(1)} N vs (Component of A down slope + Friction) = ${(component + this.friction * this.massA * g * Math.cos(angleRad)).toFixed(1)} N`;
      } else {
        hint = `Re-evaluate the pulling forces considering both masses and friction`;
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
    // Reset per-frame label rectangles for collision avoidance
    this.labelRects = [];
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Update rope offset
    this.ropeOffset += this.systemVelocity * 0.1;
    this.ropeOffset = this.ropeOffset % 20; // Loop for dashed effect
    
    if (this.systemType === 'pulley') {
      this.drawPulleySystem(ctx, width, height);
    } else if (this.systemType === 'incline') {
      this.drawInclineSystem(ctx, width, height);
    } else {
      this.drawTableSystem(ctx, width, height);
    }
  }

  private drawPulleySystem(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const groundY = height * 0.62;

    // Ground line
    ctx.fillStyle = '#E5E5E5';
    ctx.fillRect(0, groundY, width, 4);

    // Pulley
    const pulleyX = width * 0.65;
    const pulleyY = groundY - 120;
    const pulleyRadius = 28;

    ctx.fillStyle = '#383838';
    ctx.beginPath();
    ctx.arc(pulleyX, pulleyY, pulleyRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(pulleyX, pulleyY, pulleyRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Block A (on table)
    const blockASize = 90;
    const blockAX = pulleyX - 210;
    const blockAY = groundY - blockASize;

    ctx.fillStyle = '#007AFF';
    ctx.strokeStyle = '#005FA3';
    ctx.lineWidth = 4;
    ctx.fillRect(blockAX, blockAY, blockASize, blockASize);
    ctx.strokeRect(blockAX, blockAY, blockASize, blockASize);
    // Label A
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 18px "IBM Plex Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(`A`, blockAX + blockASize / 2, blockAY + blockASize / 2 - 8);
    ctx.fillText(`${this.massA} kg`, blockAX + blockASize / 2, blockAY + blockASize / 2 + 14);

    // Block B (hanging)
    const blockBSize = 90;
    const blockBX = pulleyX - blockBSize / 2;
    const blockBY = pulleyY + pulleyRadius + 60;

    ctx.fillStyle = '#21AD93';
    ctx.strokeStyle = '#1A8A75';
    ctx.lineWidth = 4;
    ctx.fillRect(blockBX, blockBY, blockBSize, blockBSize);
    ctx.strokeRect(blockBX, blockBY, blockBSize, blockBSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 18px "IBM Plex Mono"';
    ctx.fillText(`B`, blockBX + blockBSize / 2, blockBY + blockBSize / 2 - 8);
    ctx.fillText(`${this.massB} kg`, blockBX + blockBSize / 2, blockBY + blockBSize / 2 + 14);

    // Rope
    ctx.strokeStyle = this.acceleration !== 0 ? '#FF6E6C' : '#383838';
    ctx.lineWidth = 4;
    ctx.setLineDash([12, 6]);
    ctx.lineDashOffset = -this.ropeOffset;
    ctx.beginPath();
    ctx.moveTo(blockAX + blockASize, blockAY + blockASize / 2);
    ctx.lineTo(pulleyX - pulleyRadius, pulleyY);
    ctx.arc(pulleyX, pulleyY, pulleyRadius, Math.PI, Math.PI / 2, true);
    ctx.lineTo(pulleyX, blockBY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Centers for force vectors
    const centerAX = blockAX + blockASize / 2;
    const centerAY = blockAY + blockASize / 2;
    const centerBX = blockBX + blockBSize / 2;
    const centerBY = blockBY + blockBSize / 2;

    // Helper for arrow length
    const len = (val: number) => Math.max(80, Math.min(180, val * 2));
    const g = 9.8;

    // A: tension right, friction left
    this.drawArrow(centerAX, centerAY, centerAX + len(this.tension), centerAY, '#20BBAA', `T = ${this.tension.toFixed(1)} N`, 'right');
    const frictionA = this.friction * this.massA * g;
    this.drawArrow(centerAX, centerAY, centerAX - len(frictionA), centerAY, '#FF6E6C', `Ff₁ = ${frictionA.toFixed(1)} N`, 'left');

    // B: weight down, tension up
    const weightB = this.massB * g;
    this.drawArrow(centerBX, centerBY, centerBX, centerBY + len(weightB), '#FFE100', `W₂ = ${weightB.toFixed(1)} N`, 'below');
    this.drawArrow(centerBX, centerBY, centerBX, centerBY - len(this.tension), '#20BBAA', `T`, 'above');
  }

  private drawInclineSystem(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const groundY = height * 0.72;

    // Ground line
    ctx.fillStyle = '#E5E5E5';
    ctx.fillRect(0, groundY, width, 4);

    // Incline
    const angleRad = (this.inclineAngle * Math.PI) / 180;
    const inclineLength = 280;
    const inclineX = 100;
    const inclineY = groundY;
    const inclineEndX = inclineX + inclineLength * Math.cos(angleRad);
    const inclineEndY = inclineY - inclineLength * Math.sin(angleRad);

    ctx.fillStyle = '#A0A0A0';
    ctx.beginPath();
    ctx.moveTo(inclineX, inclineY);
    ctx.lineTo(inclineEndX, inclineEndY);
    ctx.lineTo(inclineEndX, groundY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#383838';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(inclineX, inclineY);
    ctx.lineTo(inclineEndX, inclineEndY);
    ctx.stroke();

    // Block A on incline
    const blockASize = 70;
    const blockADist = inclineLength * 0.45;
    const blockAX = inclineX + blockADist * Math.cos(angleRad) - blockASize / 2;
    const blockAY = inclineY - blockADist * Math.sin(angleRad) - blockASize / 2;

    ctx.save();
    ctx.translate(blockAX + blockASize / 2, blockAY + blockASize / 2);
    ctx.rotate(-angleRad);
    ctx.fillStyle = '#007AFF';
    ctx.strokeStyle = '#005FA3';
    ctx.lineWidth = 4;
    ctx.fillRect(-blockASize / 2, -blockASize / 2, blockASize, blockASize);
    ctx.strokeRect(-blockASize / 2, -blockASize / 2, blockASize, blockASize);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 16px "IBM Plex Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(`A`, 0, -4);
    ctx.fillText(`${this.massA} kg`, 0, 18);
    ctx.restore();

    // Pulley at top
    const pulleyX = inclineEndX + 50;
    const pulleyY = inclineEndY;
    const pulleyRadius = 22;
    ctx.fillStyle = '#383838';
    ctx.beginPath();
    ctx.arc(pulleyX, pulleyY, pulleyRadius, 0, Math.PI * 2);
    ctx.fill();

    // Block B hanging
    const blockBSize = 70;
    const blockBX = pulleyX - blockBSize / 2;
    const blockBY = pulleyY + pulleyRadius + 50;
    ctx.fillStyle = '#21AD93';
    ctx.strokeStyle = '#1A8A75';
    ctx.lineWidth = 4;
    ctx.fillRect(blockBX, blockBY, blockBSize, blockBSize);
    ctx.strokeRect(blockBX, blockBY, blockBSize, blockBSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 16px "IBM Plex Mono"';
    ctx.fillText(`B`, blockBX + blockBSize / 2, blockBY + blockBSize / 2 - 6);
    ctx.fillText(`${this.massB} kg`, blockBX + blockBSize / 2, blockBY + blockBSize / 2 + 16);

    // Rope
    ctx.strokeStyle = this.acceleration !== 0 ? '#FF6E6C' : '#383838';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(blockAX + blockASize / 2, blockAY);
    ctx.lineTo(pulleyX, pulleyY - pulleyRadius);
    ctx.arc(pulleyX, pulleyY, pulleyRadius, -Math.PI / 2, 0);
    ctx.lineTo(pulleyX + pulleyRadius, blockBY);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Force vectors on A and B
    const centerAX = blockAX + blockASize / 2;
    const centerAY = blockAY + blockASize / 2;
    const centerBX = blockBX + blockBSize / 2;
    const centerBY = blockBY + blockBSize / 2;

    const len = (val: number) => Math.max(80, Math.min(180, val * 2));
    const g = 9.8;

    // Unit vector along slope (upslope)
    const ux = Math.cos(angleRad);
    const uy = -Math.sin(angleRad);

    // Tension along rope on A (upslope)
    this.drawArrow(centerAX, centerAY, centerAX + ux * len(this.tension), centerAY + uy * len(this.tension), '#20BBAA', 'T', 'right');

    // Friction on A opposes motion (downslope if accel >= 0)
    const normalA = this.massA * g * Math.cos(angleRad);
    const frictionA = this.friction * normalA;
    const dir = this.acceleration >= 0 ? -1 : 1; // -1 downslope when accel >= 0
    this.drawArrow(centerAX, centerAY, centerAX + dir * ux * len(frictionA), centerAY + dir * uy * len(frictionA), '#FF6E6C', 'Ff₁', dir === -1 ? 'left' : 'right');

    // B: weight down, tension up
    const weightB = this.massB * g;
    this.drawArrow(centerBX, centerBY, centerBX, centerBY + len(weightB), '#FFE100', `W₂ = ${weightB.toFixed(1)} N`, 'below');
    this.drawArrow(centerBX, centerBY, centerBX, centerBY - len(this.tension), '#20BBAA', 'T', 'above');
  }

  private drawTableSystem(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const groundY = height * 0.62;

    // Ground line
    ctx.fillStyle = '#E5E5E5';
    ctx.fillRect(0, groundY, width, 4);

    // Blocks on table
    const blockSize = 90;
    const blockAX = width * 0.28;
    const blockBX = width * 0.62;
    const blockY = groundY - blockSize;

    // A
    ctx.fillStyle = '#007AFF';
    ctx.strokeStyle = '#005FA3';
    ctx.lineWidth = 4;
    ctx.fillRect(blockAX, blockY, blockSize, blockSize);
    ctx.strokeRect(blockAX, blockY, blockSize, blockSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 18px "IBM Plex Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(`A`, blockAX + blockSize / 2, blockY + blockSize / 2 - 8);
    ctx.fillText(`${this.massA} kg`, blockAX + blockSize / 2, blockY + blockSize / 2 + 14);

    // B
    ctx.fillStyle = '#21AD93';
    ctx.strokeStyle = '#1A8A75';
    ctx.fillRect(blockBX, blockY, blockSize, blockSize);
    ctx.strokeRect(blockBX, blockY, blockSize, blockSize);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`B`, blockBX + blockSize / 2, blockY + blockSize / 2 - 8);
    ctx.fillText(`${this.massB} kg`, blockBX + blockSize / 2, blockY + blockSize / 2 + 14);

    // Rope
    ctx.strokeStyle = '#383838';
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(blockAX + blockSize, blockY + blockSize / 2);
    ctx.lineTo(blockBX, blockY + blockSize / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Centers and vectors on table
    const centerAX = blockAX + blockSize / 2;
    const centerAY = blockY + blockSize / 2;
    const centerBX = blockBX + blockSize / 2;
    const centerBY = blockY + blockSize / 2;

    const g = 9.8;
    const len = (val: number) => Math.max(80, Math.min(160, val * 2));
    const frictionA = this.friction * this.massA * g;
    const frictionB = this.friction * this.massB * g;
    this.drawArrow(centerAX, centerAY, centerAX - len(frictionA), centerAY, '#FF6E6C', 'Ff₁', 'left');
    this.drawArrow(centerBX, centerBY, centerBX - len(frictionB), centerBY, '#FF6E6C', 'Ff₂', 'left');
    this.drawArrow(centerAX, centerAY, centerAX + len(Math.abs(this.tension)), centerAY, '#20BBAA', 'T', 'right');
  }

  

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.container.innerHTML = '';
  }

  // ---------- Arrow + label helpers (parity with Ch7.1) ----------
  private enforceMinLength(x1:number,y1:number,x2:number,y2:number,minLen:number): [number, number] {
    const dx = x2 - x1, dy = y2 - y1; const L = Math.hypot(dx, dy);
    if (L >= minLen || L === 0) return [x2, y2];
    const s = minLen / L; return [x1 + dx * s, y1 + dy * s];
  }

  private drawArrow(x1: number, y1: number, x2: number, y2: number, color: string, value: string, labelPos: 'above'|'below'|'left'|'right') {
    const ctx = this.ctx;
    [x2, y2] = this.enforceMinLength(x1, y1, x2, y2, 80);
    const headlen = 15;
    const angle = Math.atan2(y2 - y1, x2 - x1);

    // Outline
    ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

    // Line
    ctx.strokeStyle = color; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();

    // Head
    ctx.fillStyle = color; ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - headlen * Math.cos(angle - Math.PI / 6), y2 - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(x2 - headlen * Math.cos(angle + Math.PI / 6), y2 - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath(); ctx.fill(); ctx.stroke();

    // Label placement
    const offset = 20; let labelX = x2, labelY = y2;
    if (labelPos === 'above') labelY -= offset;
    if (labelPos === 'below') labelY += offset;
    if (labelPos === 'left') labelX -= offset;
    if (labelPos === 'right') labelX += offset;

    ctx.font = '700 14px "IBM Plex Mono"'; ctx.textAlign = 'center';
    const metrics = ctx.measureText(value); const padding = 8; const rectH = 28; const rectW = metrics.width + padding * 2;
    let rectX = labelX - rectW / 2; let rectY = labelY - rectH / 2;
    for (let i = 0; i < 5; i++) {
      if (!this.intersectsAny(rectX, rectY, rectW, rectH)) break;
      if (labelPos === 'above') rectY -= 24; if (labelPos === 'below') rectY += 24;
      if (labelPos === 'left') rectX -= 24; if (labelPos === 'right') rectX += 24;
    }
    this.labelRects.push({x: rectX, y: rectY, w: rectW, h: rectH});

    ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.fillRect(rectX, rectY, rectW, rectH); ctx.strokeRect(rectX, rectY, rectW, rectH);
    ctx.fillStyle = color; ctx.font = '700 13px "IBM Plex Mono"';
    ctx.fillText(value, rectX + rectW / 2, rectY + rectH / 2 + 4);
  }

  private intersectsAny(x: number, y: number, w: number, h: number): boolean {
    return this.labelRects.some(r => !(x + w < r.x || r.x + r.w < x || y + h < r.y || r.y + r.h < y));
  }
}
