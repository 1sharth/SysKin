import { Container, Graphics } from 'pixi.js';
import { Particle } from './Particle';
import { Pipe } from '../components/Pipe';
import { ProcessingNode } from '../components/ProcessingNode';
import { Emitter } from '../components/Emitter';
import { Sink } from '../components/Sink';

export class KinematicsEngine {
  public emitter: Emitter;
  public inboundPipe: Pipe;
  public processingNode: ProcessingNode;
  public outboundPipe: Pipe;
  public sink: Sink;

  public activeParticles: Particle[] = [];
  public particleGraphics: Graphics;
  public container: Container;

  constructor(
    emitter: Emitter,
    inboundPipe: Pipe,
    processingNode: ProcessingNode,
    outboundPipe: Pipe,
    sink: Sink
  ) {
    this.emitter = emitter;
    this.inboundPipe = inboundPipe;
    this.processingNode = processingNode;
    this.outboundPipe = outboundPipe;
    this.sink = sink;

    this.container = new Container();
    this.particleGraphics = new Graphics();
    this.container.addChild(this.particleGraphics);

    // Wire up events
    this.processingNode.onParticleDropped = (p) => {
      this.sink.recordDropped();
    };

    this.processingNode.onParticleFinished = (p) => {
      this.outboundPipe.addParticle(p);
    };
  }

  public update(dtSimSec: number, dtSimMs: number, simTimeMs: number) {
    // 1. Emitter tick
    this.emitter.update(dtSimSec, simTimeMs, (newParticle) => {
      this.activeParticles.push(newParticle);
      this.inboundPipe.addParticle(newParticle);
    });

    // 2. Inbound pipe kinematics
    // If the processing node queue is completely full, the front particle is blocked at the entrance
    const isQueueFull = this.processingNode.isQueueFull();
    const arrivedAtNode = this.inboundPipe.updateKinematics(dtSimSec, 220, isQueueFull);

    for (const p of arrivedAtNode) {
      this.processingNode.receiveParticle(p, simTimeMs);
    }

    // 3. Processing Node tick (queue and worker chambers)
    this.processingNode.update(dtSimSec, dtSimMs, simTimeMs);

    // 4. Outbound pipe kinematics
    const arrivedAtSink = this.outboundPipe.updateKinematics(dtSimSec, 240, false);
    for (const p of arrivedAtSink) {
      this.sink.receiveParticle(p, simTimeMs);
    }

    // 5. Sink tick
    this.sink.update(dtSimSec);

    // 6. Update dying / dropped particles & prune dead particles
    for (const p of this.activeParticles) {
      if (p.state === 'dropped') {
        p.dropVelocityY += 400 * dtSimSec; // gravity
        p.y += p.dropVelocityY * dtSimSec;
        p.alpha -= 0.8 * dtSimSec;
      } else if (p.state === 'completed') {
        p.alpha -= 3.0 * dtSimSec;
      }
    }

    this.activeParticles = this.activeParticles.filter(p => p.alpha > 0.05);

    // 7. Render all active particles
    this.renderParticles();
  }

  private renderParticles() {
    this.particleGraphics.clear();

    for (const p of this.activeParticles) {
      // Glow/halo for active workers
      if (p.state === 'processing') {
        this.particleGraphics.circle(p.x, p.y, p.radius + 3);
        this.particleGraphics.stroke({ color: 0x22d3ee, width: 1.5, alpha: 0.5 * p.alpha });
      }

      // Main particle body
      this.particleGraphics.circle(p.x, p.y, p.radius);
      this.particleGraphics.fill({ color: p.color, alpha: p.alpha });

      // Crisp inner highlight for clean physical depth
      this.particleGraphics.circle(p.x - 1.5, p.y - 1.5, p.radius * 0.35);
      this.particleGraphics.fill({ color: 0xffffff, alpha: 0.6 * p.alpha });
    }
  }

  public resetAll() {
    this.activeParticles = [];
    this.inboundPipe.particles = [];
    this.outboundPipe.particles = [];
    this.processingNode.queue = [];
    for (const w of this.processingNode.workers) {
      w.particle = null;
    }
    this.sink.resetMetrics();
  }
}
