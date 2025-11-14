import './style.css';
import { Chapter71Simulator } from './chapter71';
import { Chapter72Simulator } from './chapter72';

class PhysicsSimulatorApp {
  private currentChapter: '7.1' | '7.2' = '7.1';
  private chapter71: Chapter71Simulator | null = null;
  private chapter72: Chapter72Simulator | null = null;

  constructor() {
    this.render();
    this.initializeChapter('7.1');
  }

  private render() {
    const app = document.querySelector<HTMLDivElement>('#app')!;
    const currentDate = new Date().toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
    
    app.innerHTML = `
      <div class="app-header">
        <div class="header-logo">
          <img src="https://www.np.edu.sg/images/default-source/default-album/img-logo.png?sfvrsn=764583a6_19" alt="Ngee Ann Polytechnic" class="np-logo">
        </div>
        <div class="header-content">
          <h1>Newton's Second Law of Motion</h1>
          <div class="header-meta">
            <span class="badge">Updated as at ${currentDate}</span>
          </div>
        </div>
      </div>
      
      <div class="chapter-selector">
        <button class="chapter-btn active" data-chapter="7.1">
          Chapter 7, Part 1: Single Body
        </button>
        <button class="chapter-btn" data-chapter="7.2">
          Chapter 7, Part 2: Connected Bodies
        </button>
      </div>
      
      <div id="simulator-container"></div>
    `;

    // Attach event listeners
    document.querySelectorAll('.chapter-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const chapter = target.dataset.chapter as '7.1' | '7.2';
        this.switchChapter(chapter);
      });
    });
  }

  private switchChapter(chapter: '7.1' | '7.2') {
    if (this.currentChapter === chapter) return;

    // Update button states
    document.querySelectorAll('.chapter-btn').forEach(btn => {
      btn.classList.remove('active');
      if (btn.getAttribute('data-chapter') === chapter) {
        btn.classList.add('active');
      }
    });

    // Cleanup old simulator
    if (this.chapter71) this.chapter71.destroy();
    if (this.chapter72) this.chapter72.destroy();

    this.currentChapter = chapter;
    this.initializeChapter(chapter);
  }

  private initializeChapter(chapter: '7.1' | '7.2') {
    const container = document.querySelector<HTMLDivElement>('#simulator-container')!;
    
    if (chapter === '7.1') {
      this.chapter71 = new Chapter71Simulator(container);
    } else {
      this.chapter72 = new Chapter72Simulator(container);
    }
  }
}

// Initialize app
new PhysicsSimulatorApp();

