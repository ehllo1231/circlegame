# AGENTS.md

• Entry Point

  - index.html:1 builds the only HTML page: three
    full-screen overlays (intro, stage select,
    game over) plus the canvas, then imports Game
    and bootstraps it after sizing the canvas from
    CANVAS config (Config.js).

  Game Controller

  - Game.js:1 is the central coordinator. It
    wires UIController, InputController, scoring,
    audio/effect managers, and the stage stack
    (StageOrchestrator). It also owns high-score
    storage, stage locking, and the animation loop
    via requestAnimationFrame.
  - Event hooks: UI buttons advance through intro
    → stage select → gameplay, while keyboard
    shortcuts (Space/F6/F7/etc.) mapped in
    InputController.js:1 trigger start/restart,
    reverse direction, debug toggle, and “fast-
    forward to stage end”.
  - Stage theming and audio: StageThemeManager,
    StageBackgroundFader, StageAudioManager,
    and SoundEffectManager get initialized once
    and refreshed whenever the stage changes so
    background color, music, and SFX match the
    active stage.

  Runtime Loop & Scene

  - StageRuntime.js:1 is the per-frame engine. Each
    step() call computes delta time, advances the
    active stage, manages background color/offset,
    orchestrates prolog sequences, updates the
    score, spawns snow/obstacles, runs collision
    detection, and renders through GameScene.
  - GameScene.js:1 encapsulates gameplay entities:
    the Player that orbits the center, the
    ObstacleManager for generation and lifecycle,
    rhythm scaling (RhythmEffect), and optional
    snow (SnowEffect). updateFrame() handles spawn
    cadence, collision detection (including prolog
    obstacles), and difficulty acceleration based
    on visible score; drawFrame() composites orbit,
    obstacles, particles, and player with rhythm
    transforms.

  Entities & Effects

  - ObstacleManager.js:1 spawns wedge-shaped
    spikes (Obstacle.js) around the orbit using
    configurable multi-spawn weights, speed
    ranges, and anti-clumping correction, then
    emits particle shards on impact. Spawn
    intervals shrink stepwise as score climbs
    (applySpawnAcceleration), so difficulty ramps
    naturally.
  - Player.js (not shown above) keeps orbital
    position/velocity and exposes reverseDirection
    plus collision checks against obstacle geometry.
  - Visual polish modules include RhythmEffect.js
    (periodic scaling of orbit/player),
    SnowEffect.js (particle wind/gravity
    snapshotting), and Stage2Prolog* assets for the
    Stage 2 cut-scene.

  Stage System

  - StageManager.js:1 defines timed StagePhases
    with onEnter/onExit hooks that tweak live
    Config values (spawn/snow toggles, fades, score
    hiding). It also drives background fade timing
    and stage-complete callbacks.
  - StageOrchestrator.js:1 holds the ordered stage
    queue (Stage1→Stage2→Stage3 by default), tracks
    elapsed time per stage, exposes status flags
    (canSpawn, isSnowEnabled, fade complete, etc.),
    and advances when the current stage finishes its
    fade-out.
  - Stage1.js, Stage2.js, Stage3.js subclass
    StageManager to script their own phase
    timelines, difficulty curves, and Stage2’s
    prolog cinematics.

  UI, Debug, Config

  - UIController.js:1 owns DOM references,
    applies optional styling overrides from UI
    config, listens to button clicks, handles
    overlay visibility, stage locking, and score
    presentation (center-floating text during
    gameplay).
  - DebugController.js (toggled with F6) surfaces
    live sliders tied to Config.js so designers can
    tune spawn, obstacle, and particle parameters
    mid-run; changes propagate back into the scene
    via callbacks in Game.
  - Config.js / ConfigDefaults.js centralize
    tweakable constants (canvas size, spawn timings,
    obstacle physics, particle counts, snow timing,
    control bindings, UI metrics). Everything reads
    from here so gameplay balancing and UI styling
    remain data-driven.

  Overall flow: loading index.html instantiates
  Game, which sets up controllers, reads config, and
  shows the intro overlay. Once the player starts,
  requestAnimationFrame drives StageRuntime.step,
  which updates score/stage state, directs GameScene
  to simulate and render, and updates UI/audio/
  background effects. Stage managers adjust
  difficulty and visuals over time, ensuring the
  player’s orbit-dodging challenge ramps smoothly
  while the UI handles restarts, stage selection,
  and records. Natural next step if you’re exploring
  the code is to open Stage1.js / Stage2.js to see
  the concrete phase scripts and how they tweak
  Config on each onEnter/onExit.

  - Source of truth: modify files in the main source tree only; never edit the mirrored `www/` build outputs (used for Android) directly.
  - Operational note: only perform actions explicitly requested by the user; avoid unsolicited changes or steps.

# Code Styles
# Design Principles
  - Follow SOLID strictly
  - S — Single Responsibility: Each class/module has exactly one reason to change.
  - O — Open/Closed: Extend behavior via composition/inheritance; do not modify stable code.
  - L — Liskov Substitution: Subtypes must preserve contracts (no surprising behavior changes).
  - I — Interface Segregation: Prefer small, focused interfaces over “fat” ones.
  - D — Dependency Inversion: Depend on abstractions; inject concrete implementations at the edge.
  - Prefer composition over inheritance; isolate implementation details behind interfaces.
  - Program to contracts (pre/postconditions, invariants) and document them succinctly.

# Modularization & Maintainability

  - Cohesive modules with clear public APIs; hide internals (internal/, private/, or non-exported symbols).
  - No cyclic dependencies. Enforce a layered structure (e.g., domain → application → infrastructure → interfaces).
  - Ports & Adapters (Hexagonal): Define domain-level ports; implement adapters for DB/HTTP/FS/etc.
  - Dependency Injection: Use DI to swap implementations in tests and different environments.
  - Small, readable units: Functions < ~40–60 LOC; classes < ~300–400 LOC unless justified.
  - Naming: Intent-revealing, consistent, and domain-driven (ubiquitous language).
  - Configuration, not code: Move env-specific values to config; avoid magic numbers.
  - Immutability by default where practical; avoid shared mutable state.
  - Error handling: Fail fast, return typed/structured errors, and log context (who/what/when). 
