import { Application, Graphics, Container } from 'pixi.js';
import { SimClock } from './engine/SimClock';
import { Emitter } from './components/Emitter';
import { Pipe } from './components/Pipe';
import { ProcessingNode } from './components/ProcessingNode';
import { Sink } from './components/Sink';
import { KinematicsEngine } from './engine/KinematicsEngine';
import { HUD } from './ui/HUD';

async function bootstrap() {
  const containerEl = document.getElementById('canvas-container')!;
  
  // 1. Initialize PixiJS Application
  const app = new Application();
  await app.init({
    background: '#090d16',
    resizeTo: containerEl,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true
  });

  containerEl.appendChild(app.canvas);

  // 2. Draw Blueprint Grid Background
  const gridGraphics = new Graphics();
  app.stage.addChild(gridGraphics);

  function drawGrid(width: number, height: number) {
    gridGraphics.clear();
    const gridSize = 32;

    // Draw subtle grid dots
    for (let x = 0; x <= width; x += gridSize) {
      for (let y = 0; y <= height; y += gridSize) {
        gridGraphics.circle(x, y, 0.75);
        gridGraphics.fill({ color: 0x1e293b, alpha: 0.5 });
      }
    }
  }

  // 3. Layout Dimensions & Node Positioning
  const width = app.screen.width;
  const height = app.screen.height;
  drawGrid(width, height);

  const centerY = height / 2;
  const nodeWidth = 320;
  const nodeHeight = 180;

  // Horizontal distribution
  const nodeX = Math.max(260, width / 2 - nodeWidth / 2);
  const nodeY = centerY - nodeHeight / 2;

  const emitterX = Math.max(90, nodeX - 250);
  const sinkX = Math.min(width - 90, nodeX + nodeWidth + 250);

  // 4. Instantiate Components
  const emitter = new Emitter(emitterX, centerY);
  const processingNode = new ProcessingNode(nodeX, nodeY);
  const sink = new Sink(sinkX, centerY);

  // Inbound & Outbound Pipes
  const inboundPipe = new Pipe(emitter.port, processingNode.inputPort, 22);
  const outboundPipe = new Pipe(processingNode.outputPort, sink.port, 22);

  // 5. Build Layered Scene Graph
  const worldLayer = new Container();
  app.stage.addChild(worldLayer);

  // Add pipes below nodes
  worldLayer.addChild(inboundPipe.container);
  worldLayer.addChild(outboundPipe.container);

  // Add nodes
  worldLayer.addChild(emitter.container);
  worldLayer.addChild(processingNode.container);
  worldLayer.addChild(sink.container);

  // 6. Kinematics Engine (Particles Layer on top)
  const engine = new KinematicsEngine(
    emitter,
    inboundPipe,
    processingNode,
    outboundPipe,
    sink
  );
  worldLayer.addChild(engine.container);

  // 7. Sim Clock & HUD
  const clock = new SimClock(1.0);
  const hud = new HUD(clock, engine);

  // 8. Responsive Window Resize Handler
  window.addEventListener('resize', () => {
    const newWidth = app.screen.width;
    const newHeight = app.screen.height;
    drawGrid(newWidth, newHeight);

    const newCenterY = newHeight / 2;
    const newNodeX = Math.max(260, newWidth / 2 - nodeWidth / 2);
    const newNodeY = newCenterY - nodeHeight / 2;

    const newEmitterX = Math.max(90, newNodeX - 250);
    const newSinkX = Math.min(newWidth - 90, newNodeX + nodeWidth + 250);

    emitter.x = newEmitterX;
    emitter.y = newCenterY;
    emitter.port = { x: newEmitterX + 30, y: newCenterY };
    emitter.container.x = newEmitterX;
    emitter.container.y = newCenterY;

    processingNode.x = newNodeX;
    processingNode.y = newNodeY;
    processingNode.inputPort = { x: newNodeX, y: newNodeY + nodeHeight / 2 };
    processingNode.outputPort = { x: newNodeX + nodeWidth, y: newNodeY + nodeHeight / 2 };
    processingNode.container.x = newNodeX;
    processingNode.container.y = newNodeY;

    sink.x = newSinkX;
    sink.y = newCenterY;
    sink.port = { x: newSinkX - 30, y: newCenterY };
    sink.container.x = newSinkX;
    sink.container.y = newCenterY;

    inboundPipe.updateEndpoints(emitter.port, processingNode.inputPort);
    outboundPipe.updateEndpoints(processingNode.outputPort, sink.port);
  });

  // 9. Simulation Animation Loop
  app.ticker.add(() => {
    const { dtSimSec, dtSimMs } = clock.update();

    if (dtSimSec > 0) {
      engine.update(dtSimSec, dtSimMs, clock.simTimeMs);
    }

    hud.updateTelemetry(clock.simTimeMs);
  });
}

bootstrap().catch(console.error);
