import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Particle } from '../engine/Particle';
import { Point2D } from './Pipe';

export interface WorkerSlot {
  index: number;
  particle: Particle | null;
  position: Point2D;
}

export class ProcessingNode {
  public x: number;
  public y: number;
  public width: number = 320;
  public height: number = 180;

  // Queue properties
  public maxQueueCapacity: number = 8;
  public queue: Particle[] = [];
  
  // Worker properties
  public workerCount: number = 2;
  public processDurationMs: number = 450;
  public workers: WorkerSlot[] = [];

  // Port attachment points (for pipes)
  public inputPort: Point2D;
  public outputPort: Point2D;

  // Pixi rendering
  public container: Container;
  private bgGraphics: Graphics;
  private dynamicGraphics: Graphics;
  private headerText: Text;
  private queueLabel: Text;
  private workerLabel: Text;

  // Telemetry callback
  public onParticleDropped?: (p: Particle) => void;
  public onParticleFinished?: (p: Particle) => void;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.inputPort = { x: this.x, y: this.y + this.height / 2 };
    this.outputPort = { x: this.x + this.width, y: this.y + this.height / 2 };

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    this.bgGraphics = new Graphics();
    this.dynamicGraphics = new Graphics();
    this.container.addChild(this.bgGraphics);
    this.container.addChild(this.dynamicGraphics);

    const titleStyle = new TextStyle({
      fontFamily: 'Inter, sans-serif',
      fontSize: 12,
      fontWeight: '600',
      fill: 0x94a3b8,
      letterSpacing: 0.5
    });

    const subStyle = new TextStyle({
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 10,
      fill: 0x64748b
    });

    this.headerText = new Text({ text: 'PROCESSING COMPONENT', style: titleStyle });
    this.headerText.x = 16;
    this.headerText.y = 12;

    this.queueLabel = new Text({ text: 'QUEUE: 0/8', style: subStyle });
    this.queueLabel.x = 16;
    this.queueLabel.y = 38;

    this.workerLabel = new Text({ text: 'WORKERS: 0/2', style: subStyle });
    this.workerLabel.x = 165;
    this.workerLabel.y = 38;

    this.container.addChild(this.headerText);
    this.container.addChild(this.queueLabel);
    this.container.addChild(this.workerLabel);

    this.rebuildWorkers();
    this.renderStaticBackground();
  }

  public setWorkerCount(count: number) {
    this.workerCount = Math.max(1, Math.min(count, 6));
    this.rebuildWorkers();
    this.renderStaticBackground();
  }

  public setQueueCapacity(capacity: number) {
    this.maxQueueCapacity = Math.max(2, Math.min(capacity, 16));
    this.renderStaticBackground();
  }

  private rebuildWorkers() {
    // Preserve existing particles if possible
    const currentParticles: Particle[] = [];
    for (const w of this.workers) {
      if (w.particle) currentParticles.push(w.particle);
    }

    this.workers = [];
    const chamberLeft = 165;
    const chamberWidth = this.width - chamberLeft - 16;
    const startY = 60;
    const availableHeight = this.height - startY - 16;

    for (let i = 0; i < this.workerCount; i++) {
      // Arrange workers in vertical slots or 2x3 grid
      let wx: number;
      let wy: number;

      if (this.workerCount <= 3) {
        wx = chamberLeft + chamberWidth / 2;
        wy = startY + (availableHeight / (this.workerCount + 1)) * (i + 1);
      } else {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const totalRows = Math.ceil(this.workerCount / 2);
        wx = chamberLeft + 25 + col * 55;
        wy = startY + (availableHeight / (totalRows + 1)) * (row + 1);
      }

      this.workers.push({
        index: i,
        particle: null,
        position: { x: wx, y: wy }
      });
    }

    // Reassign existing particles to new slots
    for (let i = 0; i < currentParticles.length && i < this.workers.length; i++) {
      this.workers[i].particle = currentParticles[i];
      currentParticles[i].workerSlotIndex = i;
    }
  }

  private renderStaticBackground() {
    this.bgGraphics.clear();

    // Main Outer Container Frame
    this.bgGraphics.roundRect(0, 0, this.width, this.height, 10);
    this.bgGraphics.fill({ color: 0x0f172a, alpha: 0.95 });
    this.bgGraphics.stroke({ color: 0x1e293b, width: 2 });

    // Inner dividing line between Queue Buffer and Worker Chamber
    const dividerX = 150;
    this.bgGraphics.moveTo(dividerX, 35);
    this.bgGraphics.lineTo(dividerX, this.height - 12);
    this.bgGraphics.stroke({ color: 0x1e293b, width: 1.5, alpha: 0.6 });

    // Queue hopper container box
    this.bgGraphics.roundRect(14, 55, 122, this.height - 70, 6);
    this.bgGraphics.fill({ color: 0x090d16, alpha: 0.6 });
    this.bgGraphics.stroke({ color: 0x1e293b, width: 1 });

    // Worker chamber container box
    this.bgGraphics.roundRect(160, 55, this.width - 174, this.height - 70, 6);
    this.bgGraphics.fill({ color: 0x090d16, alpha: 0.6 });
    this.bgGraphics.stroke({ color: 0x1e293b, width: 1 });

    // Input Port Nub
    this.bgGraphics.rect(-6, this.height / 2 - 12, 6, 24);
    this.bgGraphics.fill({ color: 0x1e293b });

    // Output Port Nub
    this.bgGraphics.rect(this.width, this.height / 2 - 12, 6, 24);
    this.bgGraphics.fill({ color: 0x1e293b });
  }

  /**
   * Get world coordinate for a queue slot index
   */
  public getQueueSlotPosition(index: number): Point2D {
    const startX = 26;
    const startY = 70;
    const cols = 4;
    const colSpacing = 28;
    const rowSpacing = 26;

    const col = index % cols;
    const row = Math.floor(index / cols);

    return {
      x: this.x + startX + col * colSpacing,
      y: this.y + startY + row * rowSpacing
    };
  }

  /**
   * Attempt to receive a particle into this node.
   * If queue is full, drops particle.
   */
  public receiveParticle(p: Particle, simTimeMs: number) {
    if (this.queue.length >= this.maxQueueCapacity) {
      // OVERFLOW DROP!
      p.state = 'dropped';
      p.color = 0xf43f5e; // Crimson
      p.dropVelocityY = -150; // Pop upwards then fall
      if (this.onParticleDropped) {
        this.onParticleDropped(p);
      }
      return;
    }

    // Successfully entered queue
    p.state = 'queued';
    p.color = 0xfbbf24; // Amber
    p.enterQueueTime = simTimeMs;
    p.queueIndex = this.queue.length;
    this.queue.push(p);

    const slotPos = this.getQueueSlotPosition(p.queueIndex);
    p.x = slotPos.x;
    p.y = slotPos.y;
  }

  /**
   * Updates state, worker processing ticks, and slot animations
   */
  public update(dtSimSec: number, dtSimMs: number, simTimeMs: number) {
    // 1. Process active workers
    for (const worker of this.workers) {
      if (worker.particle) {
        const p = worker.particle;
        p.processElapsedMs += dtSimMs;

        // Keep particle firmly positioned in worker slot
        p.x = this.x + worker.position.x;
        p.y = this.y + worker.position.y;

        // Check if processing completed
        if (p.processElapsedMs >= this.processDurationMs) {
          p.finishProcessTime = simTimeMs;
          p.state = 'in_outbound_pipe';
          p.color = 0x34d399; // Emerald for output
          p.workerSlotIndex = -1;
          worker.particle = null;

          if (this.onParticleFinished) {
            this.onParticleFinished(p);
          }
        }
      }
    }

    // 2. Dispatch waiting queue particles to idle workers
    for (const worker of this.workers) {
      if (!worker.particle && this.queue.length > 0) {
        const nextParticle = this.queue.shift()!;
        nextParticle.state = 'processing';
        nextParticle.color = 0x22d3ee; // Cyan
        nextParticle.startProcessTime = simTimeMs;
        nextParticle.processElapsedMs = 0;
        nextParticle.processDurationMs = this.processDurationMs;
        nextParticle.workerSlotIndex = worker.index;
        worker.particle = nextParticle;
      }
    }

    // 3. Re-compact queue slot positions
    for (let i = 0; i < this.queue.length; i++) {
      const p = this.queue[i];
      p.queueIndex = i;
      const targetPos = this.getQueueSlotPosition(i);
      
      // Smooth lerp into position
      p.x += (targetPos.x - p.x) * Math.min(1.0, dtSimSec * 15);
      p.y += (targetPos.y - p.y) * Math.min(1.0, dtSimSec * 15);
    }

    // 4. Update UI labels
    this.queueLabel.text = `QUEUE: ${this.queue.length}/${this.maxQueueCapacity}`;
    const activeWorkersCount = this.workers.filter(w => w.particle !== null).length;
    this.workerLabel.text = `WORKERS: ${activeWorkersCount}/${this.workerCount}`;

    // 5. Draw dynamic worker progress dials and queue slots
    this.renderDynamicElements();
  }

  private renderDynamicElements() {
    this.dynamicGraphics.clear();

    // Render empty queue slot rings
    for (let i = 0; i < this.maxQueueCapacity; i++) {
      const pos = this.getQueueSlotPosition(i);
      const localX = pos.x - this.x;
      const localY = pos.y - this.y;

      this.dynamicGraphics.circle(localX, localY, 7);
      this.dynamicGraphics.stroke({ color: 0x1e293b, width: 1 });
    }

    // Render worker stations
    for (const worker of this.workers) {
      const wx = worker.position.x;
      const wy = worker.position.y;

      // Outer worker ring
      this.dynamicGraphics.circle(wx, wy, 16);
      this.dynamicGraphics.fill({ color: 0x090d16 });
      this.dynamicGraphics.stroke({ color: worker.particle ? 0x22d3ee : 0x1e293b, width: 1.5 });

      // If active, draw circular progress gauge
      if (worker.particle) {
        const progressRatio = Math.min(1.0, worker.particle.processElapsedMs / this.processDurationMs);
        if (progressRatio > 0.01) {
          const startAngle = -Math.PI / 2;
          const endAngle = startAngle + progressRatio * (Math.PI * 2);
          const startX = wx + 16 * Math.cos(startAngle);
          const startY = wy + 16 * Math.sin(startAngle);

          this.dynamicGraphics.beginPath();
          this.dynamicGraphics.moveTo(startX, startY);
          this.dynamicGraphics.arc(wx, wy, 16, startAngle, endAngle);
          this.dynamicGraphics.stroke({ color: 0x38bdf8, width: 2.5 });
        }
      }
    }
  }

  /**
   * Check if the queue is completely full
   */
  public isQueueFull(): boolean {
    return this.queue.length >= this.maxQueueCapacity;
  }
}
