export class StageOrchestrator {
  constructor({ stageMap = {}, stageOrder = [], defaultStageId = null } = {}) {
    this.stageMap = stageMap;
    this.stageOrder = Array.isArray(stageOrder) ? stageOrder.slice() : [];
    this.defaultStageId = defaultStageId && stageMap[defaultStageId]
      ? defaultStageId
      : (this.stageOrder[0] ?? null);
    this.startingStageId = this.defaultStageId;

    this.stageQueue = [];
    this.activeIndex = -1;
    this.stageStartSeconds = 0;
    this.totalDuration = 0;

    this.reset();
  }

  setStartingStage(stageId) {
    if (stageId && this.stageMap[stageId]) {
      this.startingStageId = stageId;
    } else {
      this.startingStageId = this.defaultStageId;
    }
    this.reset();
  }

  reset() {
    const order = this._resolveOrderFrom(this.startingStageId);
    this.stageQueue = order
      .map((id) => ({ id, stage: this._instantiateStage(id) }))
      .filter((entry) => entry.stage);

    if (this.stageQueue.length > 0) {
      this.activeIndex = 0;
      this.stageStartSeconds = 0;
    } else {
      this.activeIndex = -1;
      this.stageStartSeconds = 0;
    }

    this.totalDuration = this.stageQueue.reduce((sum, entry) => {
      const duration = typeof entry.stage?.getTotalDuration === 'function'
        ? entry.stage.getTotalDuration()
        : 0;
      return sum + (Number.isFinite(duration) ? duration : 0);
    }, 0);
  }

  resetProgress(startSeconds = 0) {
    if (this.stageQueue.length > 0) {
      this.activeIndex = 0;
    } else {
      this.activeIndex = -1;
    }
    this.stageStartSeconds = startSeconds;
  }

  getActiveStage() {
    return this.stageQueue[this.activeIndex]?.stage ?? null;
  }

  getActiveStageId() {
    return this.stageQueue[this.activeIndex]?.id ?? null;
  }

  getStageElapsed(totalSeconds) {
    const stage = this.getActiveStage();
    if (!stage) return 0;
    return Math.max(0, totalSeconds - this.stageStartSeconds);
  }

  update(totalSeconds, { debugMode = false } = {}) {
    const stage = this.getActiveStage();
    if (!stage) {
      return { stage: null, stageElapsed: 0, changed: false };
    }

    const stageElapsed = this.getStageElapsed(totalSeconds);
    if (!debugMode) {
      stage.update(stageElapsed);
      return { stage, stageElapsed, changed: !!stage.changed };
    }

    // In debug mode we avoid advancing stage logic but ensure `changed` does not linger.
    stage.changed = false;
    return { stage, stageElapsed, changed: false };
  }

  isStageFinished() {
    const stage = this.getActiveStage();
    return stage ? stage.isFinished() : false;
  }

  hasNextStage() {
    return this.activeIndex >= 0 && this.activeIndex < this.stageQueue.length - 1;
  }

  isFadeComplete() {
    const stage = this.getActiveStage();
    return stage ? stage.hasFadeCompleted() : true;
  }

  canSpawn() {
    const stage = this.getActiveStage();
    return stage ? stage.canSpawn() : true;
  }

  isSnowEnabled() {
    const stage = this.getActiveStage();
    return stage ? stage.isSnowEnabled() : true;
  }

  shouldHideScore() {
    const stage = this.getActiveStage();
    return stage ? stage.shouldHideScore() : false;
  }

  getBackgroundColor(defaultColor = '#000000') {
    const stage = this.getActiveStage();
    if (!stage || typeof stage.getBackgroundColor !== 'function') return defaultColor;
    return stage.getBackgroundColor() ?? defaultColor;
  }

  advance(currentSeconds) {
    if (!this.hasNextStage()) return false;
    this.activeIndex += 1;
    this.stageStartSeconds = Number.isFinite(currentSeconds) ? currentSeconds : this.stageStartSeconds;

    const stage = this.getActiveStage();
    if (stage) {
      // Ensure brand new stage starts from a clean slate.
      stage.totalElapsed = 0;
      stage.changed = false;
      if (typeof stage.update === 'function') {
        stage.update(0);
      }
    }
    return true;
  }

  fastForwardActiveStage() {
    const stage = this.getActiveStage();
    if (!stage || typeof stage.getTotalDuration !== 'function') return null;
    const duration = stage.getTotalDuration();
    if (!Number.isFinite(duration)) return null;

    if (typeof stage.update === 'function') {
      stage.update(duration);
      stage.totalElapsed = duration;
      stage.changed = true;
    }
    return this.stageStartSeconds + duration;
  }

  getTotalDuration() {
    return this.totalDuration;
  }

  getStartingStageId() {
    return this.startingStageId;
  }

  _resolveOrderFrom(startId) {
    const order = this.stageOrder.slice();
    if (!order.length) return [];
    const startIndex = startId ? order.indexOf(startId) : -1;
    if (startIndex === -1) return order;
    return order.slice(startIndex);
  }

  _instantiateStage(stageId) {
    const Ctor = this.stageMap?.[stageId];
    if (typeof Ctor !== 'function') return null;
    try {
      return new Ctor();
    } catch (_) {
      return null;
    }
  }
}
