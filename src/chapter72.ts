export class Chapter72Simulator {
  private container: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  
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
            <div class="control-section">
              <h3>System Type</h3>
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
            
            <div class="control-section">
              <h3>Adjust Parameters</h3>
              
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
              
              <div class="slider-control" id="angle-control" style="display: none;">
                <div class="slider-label">
                  <span>Incline Angle (θ)</span>
                  <span class="slider-value" id="incline-value">30°</span>
                </div>
                <input type="range" id="incline-slider" min="0" max="60" value="30" step="5">
              </div>
              
              <div class="slider-control">
                <div class="slider-label">
                  <span>Friction (μ)</span>
                  <span class="slider-value" id="friction72-value">0.20</span>
                </div>
                <input type="range" id="friction72-slider" min="0" max="1" value="0.2" step="0.05">
              </div>
            </div>
            
            <div class="control-section">
              <h3>Predict Motion Direction</h3>
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
            
            <div class="control-section">
              <h3>System Results</h3>
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
          </div>
        </div>
      </div>
    `;
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
    const groundY = height * 0.6;
    
    // Draw ground
    ctx.fillStyle = '#D3D3D3';
    ctx.fillRect(0, groundY, width, height - groundY);
    
    // Draw pulley
    const pulleyX = width * 0.65;
    const pulleyY = groundY - 80;
    const pulleyRadius = 20;
    
    ctx.fillStyle = '#383838';
    ctx.beginPath();
    ctx.arc(pulleyX, pulleyY, pulleyRadius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pulleyX, pulleyY, pulleyRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Draw Block A (on table)
    const blockASize = 50;
    const blockAX = pulleyX - 150;
    const blockAY = groundY - blockASize;
    
    ctx.fillStyle = '#007AFF';
    ctx.strokeStyle = '#005FA3';
    ctx.lineWidth = 3;
    ctx.fillRect(blockAX, blockAY, blockASize, blockASize);
    ctx.strokeRect(blockAX, blockAY, blockASize, blockASize);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 12px "IBM Plex Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(`A`, blockAX + blockASize / 2, blockAY + blockASize / 2 - 5);
    ctx.fillText(`${this.massA}kg`, blockAX + blockASize / 2, blockAY + blockASize / 2 + 10);
    
    // Draw Block B (hanging)
    const blockBSize = 50;
    const blockBX = pulleyX - blockBSize / 2;
    const blockBY = pulleyY + pulleyRadius + 40;
    
    ctx.fillStyle = '#21AD93';
    ctx.strokeStyle = '#1A8A75';
    ctx.lineWidth = 3;
    ctx.fillRect(blockBX, blockBY, blockBSize, blockBSize);
    ctx.strokeRect(blockBX, blockBY, blockBSize, blockBSize);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`B`, blockBX + blockBSize / 2, blockBY + blockBSize / 2 - 5);
    ctx.fillText(`${this.massB}kg`, blockBX + blockBSize / 2, blockBY + blockBSize / 2 + 10);
    
    // Draw rope
    ctx.strokeStyle = this.acceleration !== 0 ? '#FF6E6C' : '#383838';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.lineDashOffset = -this.ropeOffset;
    
    ctx.beginPath();
    // From A to pulley
    ctx.moveTo(blockAX + blockASize, blockAY + blockASize / 2);
    ctx.lineTo(pulleyX - pulleyRadius, pulleyY);
    // Around pulley
    ctx.arc(pulleyX, pulleyY, pulleyRadius, Math.PI, Math.PI / 2, true);
    // Down to B
    ctx.lineTo(pulleyX, blockBY);
    ctx.stroke();
    
    ctx.setLineDash([]);
    
    // Draw labels
    ctx.fillStyle = '#383838';
    ctx.font = '600 11px "IBM Plex Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(`T = ${this.tension.toFixed(1)} N`, pulleyX - 70, pulleyY - 30);
  }

  private drawInclineSystem(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const groundY = height * 0.7;
    
    // Draw ground
    ctx.fillStyle = '#D3D3D3';
    ctx.fillRect(0, groundY, width, height - groundY);
    
    // Draw incline
    const angleRad = (this.inclineAngle * Math.PI) / 180;
    const inclineLength = 200;
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
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(inclineX, inclineY);
    ctx.lineTo(inclineEndX, inclineEndY);
    ctx.stroke();
    
    // Draw Block A on incline
    const blockASize = 40;
    const blockADist = inclineLength * 0.4;
    const blockAX = inclineX + blockADist * Math.cos(angleRad) - blockASize / 2;
    const blockAY = inclineY - blockADist * Math.sin(angleRad) - blockASize / 2;
    
    ctx.save();
    ctx.translate(blockAX + blockASize / 2, blockAY + blockASize / 2);
    ctx.rotate(-angleRad);
    
    ctx.fillStyle = '#007AFF';
    ctx.strokeStyle = '#005FA3';
    ctx.lineWidth = 3;
    ctx.fillRect(-blockASize / 2, -blockASize / 2, blockASize, blockASize);
    ctx.strokeRect(-blockASize / 2, -blockASize / 2, blockASize, blockASize);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 11px "IBM Plex Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(`A ${this.massA}kg`, 0, 3);
    
    ctx.restore();
    
    // Draw pulley at top
    const pulleyX = inclineEndX + 40;
    const pulleyY = inclineEndY;
    const pulleyRadius = 15;
    
    ctx.fillStyle = '#383838';
    ctx.beginPath();
    ctx.arc(pulleyX, pulleyY, pulleyRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw Block B hanging
    const blockBSize = 40;
    const blockBX = pulleyX - blockBSize / 2;
    const blockBY = pulleyY + pulleyRadius + 30;
    
    ctx.fillStyle = '#21AD93';
    ctx.strokeStyle = '#1A8A75';
    ctx.lineWidth = 3;
    ctx.fillRect(blockBX, blockBY, blockBSize, blockBSize);
    ctx.strokeRect(blockBX, blockBY, blockBSize, blockBSize);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`B ${this.massB}kg`, blockBX + blockBSize / 2, blockBY + blockBSize / 2 + 3);
    
    // Draw rope
    ctx.strokeStyle = this.acceleration !== 0 ? '#FF6E6C' : '#383838';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    
    ctx.beginPath();
    ctx.moveTo(blockAX + blockASize / 2, blockAY);
    ctx.lineTo(pulleyX, pulleyY - pulleyRadius);
    ctx.arc(pulleyX, pulleyY, pulleyRadius, -Math.PI / 2, 0);
    ctx.lineTo(pulleyX + pulleyRadius, blockBY);
    ctx.stroke();
    
    ctx.setLineDash([]);
  }

  private drawTableSystem(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const groundY = height * 0.6;
    
    // Draw ground
    ctx.fillStyle = '#D3D3D3';
    ctx.fillRect(0, groundY, width, height - groundY);
    
    // Draw both blocks on table
    const blockSize = 50;
    const blockAX = width * 0.3;
    const blockBX = width * 0.6;
    const blockY = groundY - blockSize;
    
    // Block A
    ctx.fillStyle = '#007AFF';
    ctx.strokeStyle = '#005FA3';
    ctx.lineWidth = 3;
    ctx.fillRect(blockAX, blockY, blockSize, blockSize);
    ctx.strokeRect(blockAX, blockY, blockSize, blockSize);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 12px "IBM Plex Mono"';
    ctx.textAlign = 'center';
    ctx.fillText(`A ${this.massA}kg`, blockAX + blockSize / 2, blockY + blockSize / 2 + 3);
    
    // Block B
    ctx.fillStyle = '#21AD93';
    ctx.strokeStyle = '#1A8A75';
    ctx.fillRect(blockBX, blockY, blockSize, blockSize);
    ctx.strokeRect(blockBX, blockY, blockSize, blockSize);
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`B ${this.massB}kg`, blockBX + blockSize / 2, blockY + blockSize / 2 + 3);
    
    // Draw connection rope
    ctx.strokeStyle = '#383838';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(blockAX + blockSize, blockY + blockSize / 2);
    ctx.lineTo(blockBX, blockY + blockSize / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  public destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.container.innerHTML = '';
  }
}
