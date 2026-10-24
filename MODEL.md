# System Dynamics & Kinematics Modeling Specification
**A Unified Framework for Visually Simulating Computer Science Systems**

---

## 1. Core Philosophy & Foundations

Most tools for understanding system architecture rely either on abstract mathematical diagrams (UML, architecture boxes) or text-heavy log metrics (Grafana, Jaeger). 

This engine merges **Queueing Theory** (the discrete mathematical reality of computing) with **Continuous Kinematics** (the intuitive visual physics of particles, flow, resistance, and pressure).

### The Guiding Principles:
1. **Physical Intuition Over Mathematical Obfuscation**: Bottlenecks, traffic jams, and resource starvation should be physically visible before reading any metric table.
2. **Decoupled Geometry vs. Physical Reality**: Canvas layout coordinates (where a box is drawn) do **not** dictate network latency. Network link latency is governed by physical resistance and simulated time, not pixel distance.
3. **Universality Through Atomic Primitives**: Every system—from a simple CRUD API to the JavaScript Event Loop, Kafka streaming logs, or OS schedulers—is expressed by composing **8 universal atomic primitives**.

---

## 2. The Particle Entity Model

A **Particle** represents an individual unit of work: an HTTP request, a database query, an async callback, an OS process, or a streaming message.

```typescript
export interface Particle {
  // Identity & Tracing
  id: string;                      // Unique ID (e.g., "req-10492")
  traceId: string;                 // Correlation ID (persists across hops)
  parentId?: string;               // Set if spawned by a Fork node

  // Physical State (Visual)
  x: number;
  y: number;
  radius: number;                  // Visually scales slightly with payload size
  color: string;                   // Reflects current lifecycle state
  alpha: number;                   // Opacity (for fade out on drop/completion)

  // Workload Composition (The x% + y% = 100% Rule)
  workload: {
    cpuCostMs: number;             // y% CPU-bound work (requires a dedicated core)
    ioCostMs: number;              // x% Non-blocking I/O (runs concurrently in event loop)
  };
  payloadBytes: number;            // Payload weight (consumes link bandwidth & worker RAM)
  priority: number;                // 0 (standard) to 10 (high priority / VIP)

  // Lifecycle Timestamps (Simulated Milliseconds)
  spawnTimeMs: number;             // Recorded at Source
  enterQueueTimeMs?: number;
  startCpuTimeMs?: number;
  startIoTimeMs?: number;
  finishTimeMs?: number;           // Recorded at Sink or point of Drop

  // Trajectory State
  state: 
    | 'in_transit'                 // Traversing a conduit
    | 'queued'                     // Waiting in a buffer
    | 'executing_cpu'              // Occupying a CPU worker core
    | 'waiting_io'                 // In an async non-blocking wait pool
    | 'gated'                      // Waiting for a token/mutex at a Gate
    | 'completed'                  // Reached Sink successfully (HTTP 200)
    | 'dropped';                   // Rejected / spilled / timed out (HTTP 429/500/504)
}
```

### Key Semantics:
* **Mass $\to$ Payload Weight & Work Complexity**: No Newtonian continuous gravity is used. Instead, "mass" is modeled as **payload size in bytes** (occupying pipe bandwidth and server RAM) and **CPU cost** (occupying processor time).
* **TTL (Time-To-Live)**: Default is $\infty$ (particles do not evaporate mid-flight). Optionally, an end-to-end **Client Timeout** (e.g., $5000\text{ms}$) can be configured. If a particle has not reached a terminal sink before its timeout, it aborts and turns crimson.

---

## 3. The Universal Conduit (Network Link / Bus)

A **Conduit** is a directed connection between two node ports representing a network cable, memory bus, or IPC channel.

```
Node A [Output Port] ══════════════ Conduit ══════════════► Node B [Input Port]
                               (Latency: T_lat)
                               (Bandwidth: B_max)
```

### Physical Mechanics:
1. **Latency as Linear Resistance**:
   - Each conduit has an explicit configured latency: $T_{\text{latency}}$ (in simulated ms).
   - Canvas pixel distance ($L_{\text{px}}$) does **not** alter the simulated latency. The visual speed of particles is dynamically normalized:
     $$v_{\text{visual}} = \frac{L_{\text{px}}}{T_{\text{latency}} \times \text{timeScale}}$$
   - A $10\text{ms}$ localhost pipe drawn $400\text{px}$ long moves particles $40\times$ faster visually than a $400\text{ms}$ WAN pipe drawn $100\text{px}$ long.
2. **Bandwidth Capacity ($B_{\text{max}}$)**:
   - Maximum concurrent bytes or particles permitted in transit on that link simultaneously.
3. **Ingress Decision vs. Pipe Jamming (Network Reality)**:
   - In computer networking, cables do not physically hold traffic jams when a server is overloaded.
   - **Default Behavior**: When a particle reaches the end of the conduit and the downstream buffer is full, the downstream node **rejects the packet at the door** (drop-tail or immediate error response). The conduit remains fluid for other traffic.
   - **Backpressure Mode (Optional)**: For low-level streams (TCP windowing, reactive streams), arriving particles can halt at the entrance, forming a visible car-following traffic shockwave backwards.

---

## 4. The 8 Universal Atomic Node Primitives

Every architecture is composed of combinations of these 8 primitives:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                           THE 8 ATOMIC PRIMITIVES                            │
├────────────────────┬─────────────────────────────────────────────────────────┤
│ 1. Source          │ Traffic generator / Ingress (Requests, Events, Ticks)   │
│ 2. Sink            │ Egress / Collector (Records RTT, Ingestion Lag, Drops)  │
│ 3. Buffer          │ Storage / Queue (FIFO, LIFO Stack, Priority, Kafka Log) │
│ 4. Worker          │ Execution Node (CPU Cores, Async I/O Pool, RAM Limit)   │
│ 5. Router          │ 1-to-N Branching (Round-Robin, Least-Conn, Hash, Random)│
│ 6. Filter          │ Conditional Gate (Cache Hit/Miss, Path Predicate)       │
│ 7. Stateful Gate   │ Concurrency Control (Token Bucket, Mutex, Circuit Breaker)│
│ 8. Fork-Join       │ Splitter / Aggregator (Scatter-Gather, Fan-out, Batching)│
└────────────────────┴─────────────────────────────────────────────────────────┘
```

---

### Detailed Specification of Each Primitive

### 1. `Source` (Emitter / Ingress)
* **Role**: Spawns particles into the graph.
* **Parameters**:
  - `ratePerSec`: Base generation frequency ($\lambda$).
  - `pattern`: `constant`, `poisson` (randomized arrivals), or `burst` (spikes).
  - `workloadProfile`: Default CPU $y\%$ vs I/O $x\%$ distribution for spawned requests.
  - `payloadBytes`: Average size in bytes.

### 2. `Sink` (Consumer / Egress)
* **Role**: Absorbs completed or failed particles, aggregates telemetry.
* **Parameters**:
  - `metricType`: 
    - `ClientRTT` (when paired with a client Source)
    - `IngestionLag` (for streaming/ETL pipelines)
    - `DeadLetter` (for unrecoverable dropped packets)
* **Telemetry Calculated**:
  - Throughput (RPS)
  - Latency: Average, p50, p95, p99
  - Error / Drop rate percentage

### 3. `Buffer` (Hopper / Queue / Log)
* **Role**: Holds particles over time when generation outpaces downstream processing.
* **Disciplines**:
  - `FIFO`: First-in, first-out (Standard queue).
  - `LIFO`: Last-in, first-out (Call stack, memory stack frames).
  - `Priority`: Pulls highest-priority particles first (OS scheduling, VIP lanes).
  - `LogTape (Kafka style)`: Non-destructive append-only log. Particles stay in place; multiple consumer cursors read independently without deleting.
* **Overflow / Dropping Policies**:
  - `drop_tail`: Reject new arrival immediately (Default HTTP 503 behavior).
  - `drop_head`: Evict oldest item to accommodate newest.
  - `block_upstream`: Physical backpressure stopping the upstream link.

### 4. `Worker` (Processor / Server Node)
* **Role**: Performs work by consuming particle workloads. Fully decoupled from queues.
* **Internal Anatomy**:
  - **CPU Cores ($N_{\text{cores}}$)**: Hard concurrency limit. A core docks a particle and executes its $y\%$ CPU work.
  - **Async Event Loop Pool**: Handles the non-blocking $x\%$ I/O work. Uncapped or high-capacity parallel docking without locking CPU cores.
  - **RAM Limit ($M_{\text{max}}$)**: Each in-flight particle on this worker consumes memory.
    $$\text{Current RAM} = \sum_{p \in \text{active}} p.\text{payloadBytes}$$
* **Failure Dynamics**:
  - **OOM Crash**: If $\text{Current RAM} > M_{\text{max}}$, the node crashes, drops in-flight particles, and enters a reboot delay.
  - **MTBF (Mean Time Between Failures)**: Random failure probability per sim-hour.
  - **MTTR (Mean Time To Recover)**: Respawn duration before accepting new traffic.

### 5. `Router` (Switch / Load Balancer)
* **Role**: Directs incoming particles from 1 input port to one of $N$ output ports.
* **Balancing Algorithms**:
  - `round_robin`: Cycles sequentially through healthy outputs.
  - `least_connections`: Routes to the downstream node with the fewest active particles.
  - `ip_hash`: Hashes client ID / key for session stickiness.
  - `random`: Uniform random selection.
* **Health Checking**: Automatically skips downstream nodes that are offline or in a crashed state.

### 6. `Filter` (Branch / Cache Gate)
* **Role**: Evaluates a condition and diverts the particle to Port A (Hit) or Port B (Miss).
* **Modes**:
  - `probabilistic`: Hit rate percentage $P_{\text{hit}}$ (e.g., Cache 92% hit).
  - `predicate`: Evaluates particle attributes (e.g., `payloadBytes > 10KB` or `priority == VIP`).
* **Cache Semantics**:
  - Hit: Short, instant return path back to caller.
  - Miss: Forward path to slow backend storage.
  - Eviction policies: `LRU`, `LFU`, `TTL`.

### 7. `Stateful Gate` (Concurrency & Circuit Breakers)
* **Role**: Controls flow using internal state, token inventories, or finite state machines.
* **Implementations**:
  1. **Token Bucket / Semaphore**: Holds $K$ tokens (e.g. Database Connection Pool = 10 connections). A particle must acquire a token to pass. The token returns when downstream processing finishes.
  2. **Circuit Breaker**:
     - `CLOSED`: Normal operation, all traffic passes.
     - `OPEN`: Downstream failure rate $> \text{threshold}$. Gate trips open! Arriving particles fail-fast instantly without burdening the dead downstream node.
     - `HALF-OPEN`: After a cooldown timer, lets 1 trial particle through to test if the service has recovered.

### 8. `Fork-Join / Batcher`
* **Role**: Splits or merges streams of particles.
* **Implementations**:
  1. **Fork (1-to-N Splitter)**:
     - 1 parent request duplicates into $N$ child particles with matching `traceId`.
     - *Use cases*: Scatter-Gather queries, Pub/Sub topic fan-out.
  2. **Join / Barrier (N-to-1 Aggregator)**:
     - Waits until all $N$ sibling particles of a given `traceId` arrive at the barrier.
     - Merges results into 1 composite response and emits it downstream.
     - *Visualizes*: The **p99 tail latency problem** (client is blocked until the slowest parallel service returns).
  3. **Batcher / Compactor**:
     - Collects particles until count reaches $M$ (e.g. 50 items) or timer $T_{\text{flush}}$ expires.
     - Compresses into 1 bulk particle (e.g. Bulk DB Insert).

---

## 5. Architectural Archetypes (How Systems Assemble)

### Archetype A: The Classic Web Application (Client Loop)
```
┌────────────────────────────────────────────────────────────────────────┐
│ CLIENT                                                                 │
│   [Source] ──────► (Request Path)                                      │
│                                                                        │
│   [Sink]   ◄────── (Response Path: RTT Latency calculated here)        │
└──────┬───────────────────────────────────▲─────────────────────────────┘
       │                                   │
       ▼                                   │
  [Load Balancer (Router: Least-Conn)]     │
       │                                   │
       ├─────────────────┬─────────────────┤
       ▼                 ▼                 ▼
  [App Server 1]   [App Server 2]   [App Server 3]
  (Queue + Worker) (Queue + Worker) (Queue + Worker)
       │
       ▼
  [Redis Cache (Filter: 90% Hit)] ───(Hit: Bypass DB)───┐
       │                                                │
    (Miss)                                              │
       ▼                                                │
  [DB Connection Pool (Gate: 10 Tokens)]                │
       │                                                │
       ▼                                                ▼
  [Postgres Database (Worker: Disk Latency)] ───────────┘
```

---

### Archetype B: Streaming Ingestion & ETL Pipeline (Unidirectional)
```
[Sensor Source] ──► [Kafka Topic (Buffer: LogTape)] 
                         │
                         ├──────────────────────┬──────────────────────┐
                         ▼                      ▼                      ▼
               [Consumer Group A]     [Consumer Group B]     [Consumer Group C]
               (Realtime Alerting)    (ETL Batch Aggregator) (Long-term Archiver)
                         │                      │                      │
                         ▼                      ▼                      ▼
                 [Alerting Sink]          [Fork-Join]            [S3 Sink]
                                                │
                                                ▼
                                         [Snowflake Sink]
```

---

### Archetype C: Runtime Concurrency (Node.js vs. Thread-per-Request)
```
[Inbound Request] ──► [Queue Buffer] ──► [Single Worker Core (y% CPU Work)]
                                                  │
                                                  ▼
                                       [Async I/O Pool (x% I/O Work)]
                                       (1000s concurrent db/http waits)
                                                  │
                                                  ▼
                                       [Microtask / Macrotask Queue] ──► [Core]
```
* **Visual Intuition**: When a particle with $y=100\%$ CPU hits the core, the core turns bright red. The async I/O pool stalls and the inbound queue explodes, physically illustrating why blocking the main thread freezes Node.js.

---

## 6. Declarative JSON Schema (Sandbox-Ready Format)

Every topology is stored as a declarative, serializable JSON graph:

```json
{
  "version": "1.0.0",
  "name": "Microservices with Circuit Breaker",
  "timeScale": 1.0,
  "nodes": [
    {
      "id": "client_source",
      "type": "source",
      "position": { "x": 100, "y": 200 },
      "config": { "ratePerSec": 8.0, "pattern": "poisson" }
    },
    {
      "id": "circuit_breaker",
      "type": "stateful_gate",
      "position": { "x": 280, "y": 200 },
      "config": { "mode": "circuit_breaker", "failureThreshold": 0.5, "cooldownMs": 3000 }
    },
    {
      "id": "app_queue",
      "type": "buffer",
      "position": { "x": 480, "y": 200 },
      "config": { "discipline": "fifo", "capacity": 12, "overflowPolicy": "drop_tail" }
    },
    {
      "id": "app_worker",
      "type": "worker",
      "position": { "x": 680, "y": 200 },
      "config": { "cores": 4, "maxRamMb": 512, "workloadSplit": { "cpuPercent": 30, "ioPercent": 70 } }
    },
    {
      "id": "client_sink",
      "type": "sink",
      "position": { "x": 100, "y": 320 },
      "config": { "metricType": "client_rtt" }
    }
  ],
  "conduits": [
    { "from": "client_source", "to": "circuit_breaker", "latencyMs": 20 },
    { "from": "circuit_breaker", "to": "app_queue", "latencyMs": 5 },
    { "from": "app_queue", "to": "app_worker", "latencyMs": 2 },
    { "from": "app_worker", "to": "client_sink", "latencyMs": 20 }
  ]
}
```

---

## 7. Status & Next Milestones

- [x] **Core Physics & Kinematics Prototype**: Validated with "Rectangle & Pipe" baseline.
- [x] **Decoupled Primitives Formalized**: 8 atomic components defined with exact mechanics.
- [x] **Stateful Gate & Fork-Join**: Added to handle connection pools, circuit breakers, and fan-out.
- [ ] **Implementation Phase 1**: Refactor prototype into decoupled `BufferNode`, `WorkerNode`, `Source`, and `Sink`.
- [ ] **Implementation Phase 2**: Introduce bidirectional request-response conduit loop with client-side RTT telemetry.
- [ ] **Implementation Phase 3**: Implement `StatefulGate` and `ForkJoin` primitives.
