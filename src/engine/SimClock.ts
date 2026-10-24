/**
 * SimClock manages the simulation's virtual time.
 * Decouples rendering frame delta (dt_real) from simulation delta (dt_sim = dt_real * timeScale).
 */
export class SimClock {
  public timeScale: number = 1.0;
  public isPaused: boolean = false;
  
  // Total virtual simulation time elapsed (in milliseconds)
  public simTimeMs: number = 0;
  
  // Real wall-clock time tracking
  private lastRealTime: number = performance.now();
  private stepRequested: boolean = false;

  // Maximum allowed real frame delta to prevent huge jumps when tab is inactive (e.g. max 100ms)
  private readonly maxFrameDeltaMs: number = 100;

  constructor(initialScale: number = 1.0) {
    this.timeScale = initialScale;
  }

  /**
   * Called on every animation frame.
   * Returns the elapsed simulation time in seconds for this tick.
   */
  public update(): { dtSimSec: number; dtSimMs: number } {
    const now = performance.now();
    let dtRealMs = now - this.lastRealTime;
    this.lastRealTime = now;

    // Clamp huge deltas when switching tabs
    if (dtRealMs > this.maxFrameDeltaMs) {
      dtRealMs = this.maxFrameDeltaMs;
    }

    if (this.isPaused) {
      if (this.stepRequested) {
        this.stepRequested = false;
        // Step forward by 16ms of virtual simulation time
        const stepMs = 16.667 * this.timeScale;
        this.simTimeMs += stepMs;
        return { dtSimSec: stepMs / 1000, dtSimMs: stepMs };
      }
      return { dtSimSec: 0, dtSimMs: 0 };
    }

    const dtSimMs = dtRealMs * this.timeScale;
    this.simTimeMs += dtSimMs;
    const dtSimSec = dtSimMs / 1000;

    return { dtSimSec, dtSimMs };
  }

  public setSpeed(scale: number) {
    this.timeScale = Math.max(0.05, Math.min(scale, 50.0));
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  public step() {
    this.stepRequested = true;
  }
}
