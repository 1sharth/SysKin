import { Graphics, Container } from 'pixi.js';
import { Particle } from '../engine/Particle';

export interface Point2D {
  x: number;
  y: number;
}

export class Pipe {
  public startPoint: Point2D;
  public endPoint: Point2D;
  public length: number;
  public pipeWidth: number = 24;
  public particles: Particle[] = [];
  
  public container: Container;
  private pipeGraphics: Graphics;

  constructor(start: Point2D, end: Point2D, width: number = 24) {
    this.startPoint = start;
    this.endPoint = end;
    this.pipeWidth = width;
    
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    this.length = Math.sqrt(dx * dx + dy * dy);

    this.container = new Container();
    this.pipeGraphics = new Graphics();
    this.container.addChild(this.pipeGraphics);
    
    this.renderPipeBackground();
  }

  public updateEndpoints(start: Point2D, end: Point2D) {
    this.startPoint = start;
    this.endPoint = end;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    this.length = Math.sqrt(dx * dx + dy * dy);
    this.renderPipeBackground();
  }

  private renderPipeBackground() {
    this.pipeGraphics.clear();
    
    // Draw pipe outer casing (dark background with subtle borders)
    const angle = Math.atan2(this.endPoint.y - this.startPoint.y, this.endPoint.x - this.startPoint.x);
    const halfWidth = this.pipeWidth / 2;
    
    const nx = -Math.sin(angle) * halfWidth;
    const ny = Math.cos(angle) * halfWidth;

    // Fill pipe conduit
    this.pipeGraphics.poly([
      this.startPoint.x + nx, this.startPoint.y + ny,
      this.endPoint.x + nx, this.endPoint.y + ny,
      this.endPoint.x - nx, this.endPoint.y - ny,
      this.startPoint.x - nx, this.startPoint.y - ny,
    ]);
    this.pipeGraphics.fill({ color: 0x0f172a, alpha: 0.8 });
    this.pipeGraphics.stroke({ color: 0x1e293b, width: 1.5 });

    // Draw subtle dashed center flow line
    this.pipeGraphics.moveTo(this.startPoint.x, this.startPoint.y);
    this.pipeGraphics.lineTo(this.endPoint.x, this.endPoint.y);
    this.pipeGraphics.stroke({ color: 0x334155, width: 1, alpha: 0.4 });
  }

  /**
   * Evaluates position along the pipe track for progress s in [0, 1]
   */
  public getPointAt(progress: number): Point2D {
    const clamped = Math.max(0, Math.min(1, progress));
    return {
      x: this.startPoint.x + (this.endPoint.x - this.startPoint.x) * clamped,
      y: this.startPoint.y + (this.endPoint.y - this.startPoint.y) * clamped
    };
  }

  /**
   * Adds a particle to the pipe
   */
  public addParticle(p: Particle) {
    p.progress = 0;
    this.particles.push(p);
  }

  /**
   * Updates kinematics of all particles on this pipe.
   * Enforces car-following rules:
   * - Cannot overtake.
   * - Must maintain minimum safe distance from ahead particle.
   * - If blockedAtEnd is true, front particle stops at s = 1.0.
   */
  public updateKinematics(
    dtSimSec: number, 
    speedPxPerSec: number, 
    blockedAtEnd: boolean = false
  ): Particle[] {
    const arrivedAtEnd: Particle[] = [];
    const minSpacingPx = 18; // safe distance between particle centers
    const minSpacingProgress = minSpacingPx / Math.max(1, this.length);

    // Sort particles by progress descending (front particle first)
    this.particles.sort((a, b) => b.progress - a.progress);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      
      // Determine maximum progress this particle can reach without colliding
      let maxAllowedProgress = 1.0;
      
      if (i === 0) {
        // Frontmost particle: can reach end if not blocked
        maxAllowedProgress = blockedAtEnd ? (1.0 - minSpacingProgress * 0.5) : 1.05;
      } else {
        // Must stay behind the particle directly in front
        const ahead = this.particles[i - 1];
        maxAllowedProgress = ahead.progress - minSpacingProgress;
      }

      // Desired step forward
      const deltaProgress = (speedPxPerSec * dtSimSec) / this.length;
      
      if (p.progress < maxAllowedProgress) {
        p.progress = Math.min(maxAllowedProgress, p.progress + deltaProgress);
      }

      // Update 2D coordinate
      const pt = this.getPointAt(p.progress);
      p.x = pt.x;
      p.y = pt.y;

      // Check if reached end (progress >= 1.0)
      if (p.progress >= 1.0) {
        arrivedAtEnd.push(p);
      }
    }

    // Remove arrived particles from this pipe's active list
    if (arrivedAtEnd.length > 0) {
      this.particles = this.particles.filter(p => !arrivedAtEnd.includes(p));
    }

    return arrivedAtEnd;
  }
}
