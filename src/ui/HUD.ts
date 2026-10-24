import { SimClock } from '../engine/SimClock';
import { KinematicsEngine } from '../engine/KinematicsEngine';

export class HUD {
  private clock: SimClock;
  private engine: KinematicsEngine;

  // DOM elements - Speed Header
  private speedBadgeText: HTMLElement;
  private pulseDot: HTMLElement;
  private playIcon: HTMLElement;
  private btnPause: HTMLButtonElement;
  private btnStep: HTMLButtonElement;
  private speedSlider: HTMLInputElement;
  private presetButtons: NodeListOf<HTMLButtonElement>;
  private btnResetStats: HTMLButtonElement;

  // DOM elements - Telemetry
  private statInflow: HTMLElement;
  private statQueue: HTMLElement;
  private statWorkers: HTMLElement;
  private statOutflow: HTMLElement;
  private statLatency: HTMLElement;
  private statDropped: HTMLElement;

  // DOM elements - Knobs
  private inputEmitterRate: HTMLInputElement;
  private valEmitterRate: HTMLElement;
  private btnBurst: HTMLButtonElement;

  private inputWorkerCount: HTMLInputElement;
  private valWorkerCount: HTMLElement;

  private inputProcessTime: HTMLInputElement;
  private valProcessTime: HTMLElement;

  private inputQueueCap: HTMLInputElement;
  private valQueueCap: HTMLElement;

  private lastTelemetryUpdate: number = 0;

  constructor(clock: SimClock, engine: KinematicsEngine) {
    this.clock = clock;
    this.engine = engine;

    // Query elements
    this.speedBadgeText = document.getElementById('speed-value-text')!;
    this.pulseDot = document.querySelector('.pulse-dot')!;
    this.playIcon = document.getElementById('play-icon')!;
    this.btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
    this.btnStep = document.getElementById('btn-step') as HTMLButtonElement;
    this.speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
    this.presetButtons = document.querySelectorAll('.speed-preset-group .btn-pill');
    this.btnResetStats = document.getElementById('btn-reset-stats') as HTMLButtonElement;

    this.statInflow = document.getElementById('stat-inflow')!;
    this.statQueue = document.getElementById('stat-queue')!;
    this.statWorkers = document.getElementById('stat-workers')!;
    this.statOutflow = document.getElementById('stat-outflow')!;
    this.statLatency = document.getElementById('stat-latency')!;
    this.statDropped = document.getElementById('stat-dropped')!;

    this.inputEmitterRate = document.getElementById('input-emitter-rate') as HTMLInputElement;
    this.valEmitterRate = document.getElementById('val-emitter-rate')!;
    this.btnBurst = document.getElementById('btn-burst') as HTMLButtonElement;

    this.inputWorkerCount = document.getElementById('input-worker-count') as HTMLInputElement;
    this.valWorkerCount = document.getElementById('val-worker-count')!;

    this.inputProcessTime = document.getElementById('input-process-time') as HTMLInputElement;
    this.valProcessTime = document.getElementById('val-process-time')!;

    this.inputQueueCap = document.getElementById('input-queue-cap') as HTMLInputElement;
    this.valQueueCap = document.getElementById('val-queue-cap')!;

    this.bindEvents();
    this.updateSpeedUI();
  }

  private bindEvents() {
    // Play / Pause toggle
    this.btnPause.addEventListener('click', () => {
      const isPaused = this.clock.togglePause();
      this.playIcon.textContent = isPaused ? '▶' : '⏸';
      this.pulseDot.classList.toggle('paused', isPaused);
      this.btnPause.title = isPaused ? 'Resume Simulation' : 'Pause Simulation';
    });

    // Step forward
    this.btnStep.addEventListener('click', () => {
      this.clock.step();
    });

    // Speed Slider
    this.speedSlider.addEventListener('input', () => {
      const val = parseFloat(this.speedSlider.value);
      this.clock.setSpeed(val);
      this.updateSpeedUI();
    });

    // Preset Speed Buttons
    this.presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed || '1.0');
        this.clock.setSpeed(speed);
        this.speedSlider.value = speed.toString();
        this.updateSpeedUI();
      });
    });

    // Emitter Rate
    this.inputEmitterRate.addEventListener('input', () => {
      const rate = parseFloat(this.inputEmitterRate.value);
      this.engine.emitter.setRate(rate);
      this.valEmitterRate.textContent = `${rate.toFixed(1)} req/s`;
    });

    // Burst Button
    this.btnBurst.addEventListener('click', () => {
      this.engine.emitter.triggerBurst(5);
    });

    // Worker Count
    this.inputWorkerCount.addEventListener('input', () => {
      const count = parseInt(this.inputWorkerCount.value, 10);
      this.engine.processingNode.setWorkerCount(count);
      this.valWorkerCount.textContent = `${count} worker${count > 1 ? 's' : ''}`;
    });

    // Processing Time
    this.inputProcessTime.addEventListener('input', () => {
      const timeMs = parseInt(this.inputProcessTime.value, 10);
      this.engine.processingNode.processDurationMs = timeMs;
      this.valProcessTime.textContent = `${timeMs} ms`;
    });

    // Queue Capacity
    this.inputQueueCap.addEventListener('input', () => {
      const cap = parseInt(this.inputQueueCap.value, 10);
      this.engine.processingNode.setQueueCapacity(cap);
      this.valQueueCap.textContent = `${cap} slots`;
    });

    // Reset Stats
    this.btnResetStats.addEventListener('click', () => {
      this.engine.sink.resetMetrics();
    });
  }

  private updateSpeedUI() {
    const scale = this.clock.timeScale;
    this.speedBadgeText.textContent = `Scaled to ${scale.toFixed(1)}x`;

    // Highlight active preset button if match
    this.presetButtons.forEach((btn) => {
      const speed = parseFloat(btn.dataset.speed || '0');
      btn.classList.toggle('active', Math.abs(speed - scale) < 0.05);
    });
  }

  public updateTelemetry(simTimeMs: number) {
    const now = performance.now();
    // Throttle DOM updates to ~10 times per second for smooth browser performance
    if (now - this.lastTelemetryUpdate < 100) return;
    this.lastTelemetryUpdate = now;

    // Inflow
    this.statInflow.innerHTML = `${this.engine.emitter.ratePerSec.toFixed(1)} <small>req/s</small>`;

    // Queue
    const qLen = this.engine.processingNode.queue.length;
    const qCap = this.engine.processingNode.maxQueueCapacity;
    this.statQueue.textContent = `${qLen} / ${qCap}`;
    if (qLen >= qCap) {
      this.statQueue.className = 'metric-value text-red';
    } else if (qLen > 0) {
      this.statQueue.className = 'metric-value text-amber';
    } else {
      this.statQueue.className = 'metric-value text-muted';
    }

    // Workers
    const activeWorkers = this.engine.processingNode.workers.filter(w => w.particle !== null).length;
    const totalWorkers = this.engine.processingNode.workerCount;
    this.statWorkers.textContent = `${activeWorkers} / ${totalWorkers}`;

    // Outflow
    const outflowRps = this.engine.sink.getThroughputRps(simTimeMs);
    this.statOutflow.innerHTML = `${outflowRps} <small>req/s</small>`;

    // Avg Latency
    const avgLatency = this.engine.sink.getAverageLatencyMs();
    this.statLatency.innerHTML = `${avgLatency} <small>ms</small>`;

    // Dropped
    this.statDropped.textContent = this.engine.sink.totalDropped.toString();
  }
}
