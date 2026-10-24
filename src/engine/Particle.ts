export type ParticleState = 
  | 'in_inbound_pipe' 
  | 'queued' 
  | 'processing' 
  | 'in_outbound_pipe' 
  | 'completed' 
  | 'dropped';

export class Particle {
  public static nextId: number = 1;
  public id: number;

  // Spatial & Kinematics
  public x: number = 0;
  public y: number = 0;
  public radius: number = 6;
  public progress: number = 0; // 0..1 along pipe
  public targetProgress: number = 0;
  public speed: number = 200; // pixels per sim-second
  
  // State
  public state: ParticleState = 'in_inbound_pipe';
  public alpha: number = 1.0;
  public color: number = 0x38bdf8; // ice blue by default

  // Queue & Worker association
  public queueIndex: number = -1;
  public workerSlotIndex: number = -1;
  public processElapsedMs: number = 0;
  public processDurationMs: number = 450;

  // Telemetry timestamps (all in simTimeMs)
  public spawnTime: number = 0;
  public enterQueueTime: number = 0;
  public startProcessTime: number = 0;
  public finishProcessTime: number = 0;
  public finishTime: number = 0;

  // Drop animation properties
  public dropVelocityY: number = 0;

  constructor(spawnTime: number) {
    this.id = Particle.nextId++;
    this.spawnTime = spawnTime;
  }

  public reset(spawnTime: number) {
    this.id = Particle.nextId++;
    this.spawnTime = spawnTime;
    this.x = 0;
    this.y = 0;
    this.progress = 0;
    this.targetProgress = 0;
    this.state = 'in_inbound_pipe';
    this.alpha = 1.0;
    this.color = 0x38bdf8;
    this.queueIndex = -1;
    this.workerSlotIndex = -1;
    this.processElapsedMs = 0;
    this.enterQueueTime = 0;
    this.startProcessTime = 0;
    this.finishProcessTime = 0;
    this.finishTime = 0;
    this.dropVelocityY = 0;
  }
}
