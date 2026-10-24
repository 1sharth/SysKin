import { Container, Graphics, Text, TextStyle } from 'pixi.js';
import { Particle } from '../engine/Particle';
import { Point2D } from './Pipe';

export class Sink {
  public x: number;
  public y: number;
  public port: Point2D;

  public container: Container;
  private graphics: Graphics;
  private labelText: Text;
  private pulseRadius: number = 0;

  // Metrics Accumulator
  public totalCompleted: number = 0;
  public totalDropped: number = 0;
  public latencySamples: number[] = [];
  private recentCompletions: number[] = []; // sim timestamps for rolling RPS

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.port = { x: this.x - 30, y: this.y };

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

    this.labelText = new Text({ text: 'RESPONSE SINK', style });
    this.labelText.anchor.set(0.5, 0);
    this.labelText.x = 0;
    this.labelText.y = 35;
    this.container.addChild(this.labelText);

    this.render();
  }

  public receiveParticle(p: Particle, simTimeMs: number) {
    p.finishTime = simTimeMs;
    p.state = 'completed';
    this.totalCompleted++;

    const latency = p.finishTime - p.spawnTime;
    this.latencySamples.push(latency);
    if (this.latencySamples.length > 50) {
      this.latencySamples.shift();
    }

    this.recentCompletions.push(simTimeMs);
    this.pulseRadius = 24;
  }

  public recordDropped() {
    this.totalDropped++;
  }

  public getAverageLatencyMs(): number {
    if (this.latencySamples.length === 0) return 0;
    const sum = this.latencySamples.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.latencySamples.length);
  }

  public getThroughputRps(currentSimTimeMs: number): number {
    // Prune completions older than 1 sim-second (1000ms)
    const windowStart = currentSimTimeMs - 1000;
    this.recentCompletions = this.recentCompletions.filter(t => t >= windowStart);
    return this.recentCompletions.length;
  }

  public resetMetrics() {
    this.totalCompleted = 0;
    this.totalDropped = 0;
    this.latencySamples = [];
    this.recentCompletions = [];
  }

  public update(dtSimSec: number) {
    if (this.pulseRadius > 0) {
      this.pulseRadius = Math.max(0, this.pulseRadius - dtSimSec * 40);
      this.render();
    }
  }

  private render() {
    this.graphics.clear();

    // Pulse wave when receiving
    if (this.pulseRadius > 0) {
      this.graphics.circle(0, 0, this.pulseRadius);
      this.graphics.stroke({ color: 0x34d399, width: 1.5, alpha: this.pulseRadius / 24 });
    }

    // Sink Base Body
    this.graphics.circle(0, 0, 22);
    this.graphics.fill({ color: 0x0f172a });
    this.graphics.stroke({ color: 0x34d399, width: 2 });

    // Inner target
    this.graphics.circle(0, 0, 10);
    this.graphics.fill({ color: 0x1e293b });

    // Intake Port Nub pointing to the left
    this.graphics.roundRect(-30, -6, 16, 12, 3);
    this.graphics.fill({ color: 0x1e293b });
    this.graphics.stroke({ color: 0x34d399, width: 1 });
  }
}
