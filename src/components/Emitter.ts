import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Particle } from '../engine/Particle';
import { Point2D } from './Pipe';

export class Emitter {
  public x: number;
  public y: number;
  public ratePerSec: number = 4.0;
  public port: Point2D;

  private accumulatorSec: number = 0;
  private burstQueue: number = 0;
  
  public container: Container;
  private graphics: Graphics;
  private labelText: Text;
  private pulseRadius: number = 0;

  public onSpawnParticle?: (p: Particle) => void;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.port = { x: this.x + 30, y: this.y };

    this.container = new Container();
    this.container.x = x;
    this.container.y = y;

    this.graphics = new Graphics();
    this.container.addChild(this.graphics);

    const style = new TextStyle({
      fontFamily: 'Inter, sans-serif',
      fontSize: 11,
      fontWeight: '600',
      fill: 0x94a3b8
    });

    this.labelText = new Text({ text: 'CLIENT EMITTER', style });
    this.labelText.anchor.set(0.5, 0);
    this.labelText.x = 0;
    this.labelText.y = 35;
    this.container.addChild(this.labelText);

    this.render();
  }

  public setRate(rate: number) {
    this.ratePerSec = Math.max(0.1, rate);
  }

  public triggerBurst(count: number = 5) {
    this.burstQueue += count;
  }

  public update(dtSimSec: number, simTimeMs: number, spawnCallback: (p: Particle) => void) {
    // 1. Handle steady-state rate
    this.accumulatorSec += dtSimSec;
    const interval = 1.0 / this.ratePerSec;

    while (this.accumulatorSec >= interval) {
      this.accumulatorSec -= interval;
      this.spawnOne(simTimeMs, spawnCallback);
    }

    // 2. Handle burst queue
    if (this.burstQueue > 0) {
      const burstsToFire = Math.min(this.burstQueue, 3); // stagger burst slightly
      for (let i = 0; i < burstsToFire; i++) {
        this.spawnOne(simTimeMs, spawnCallback);
      }
      this.burstQueue -= burstsToFire;
    }

    // 3. Update pulse animation
    if (this.pulseRadius > 0) {
      this.pulseRadius = Math.max(0, this.pulseRadius - dtSimSec * 40);
      this.render();
    }
  }

  private spawnOne(simTimeMs: number, spawnCallback: (p: Particle) => void) {
    const p = new Particle(simTimeMs);
    p.x = this.port.x;
    p.y = this.port.y;
    p.speed = 220; // px/sec
    p.state = 'in_inbound_pipe';
    p.color = 0x38bdf8; // Ice blue
    
    this.pulseRadius = 24;
    spawnCallback(p);
  }

  private render() {
    this.graphics.clear();

    // Pulse wave when firing
    if (this.pulseRadius > 0) {
      this.graphics.circle(0, 0, this.pulseRadius);
      this.graphics.stroke({ color: 0x38bdf8, width: 1.5, alpha: this.pulseRadius / 24 });
    }

    // Emitter Base Body
    this.graphics.circle(0, 0, 22);
    this.graphics.fill({ color: 0x0f172a });
    this.graphics.stroke({ color: 0x38bdf8, width: 2 });

    // Inner core
    this.graphics.circle(0, 0, 10);
    this.graphics.fill({ color: 0x1e293b });

    // Nozzle port pointing to the right
    this.graphics.roundRect(14, -6, 16, 12, 3);
    this.graphics.fill({ color: 0x1e293b });
    this.graphics.stroke({ color: 0x38bdf8, width: 1 });
  }
}
