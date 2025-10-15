import { SNOW, SPAWN, OBSTACLE, PLAYER } from './Config.js';

export class DebugController {
  constructor({ onChange } = {}) {
    this.enabled = false;
    this.onChange = typeof onChange === 'function' ? onChange : () => {};
    // Save defaults to allow per-section reset
    this._defaults = {
      snow: JSON.parse(JSON.stringify(SNOW)),
      spawn: JSON.parse(JSON.stringify(SPAWN)),
      obstacle: JSON.parse(JSON.stringify(OBSTACLE)),
      player: JSON.parse(JSON.stringify(PLAYER)),
    };
    this._buildPanel();
  }

  toggle(show) {
    this.enabled = !!show;
    if (this.panel) this.panel.style.display = this.enabled ? 'block' : 'none';
    if (this.enabled) this._syncInputs();
  }

  _buildPanel() {
    const panel = document.createElement('div');
    panel.style.position = 'absolute';
    panel.style.top = '12px';
    panel.style.right = '12px';
    panel.style.width = '280px';
    panel.style.maxHeight = '80vh';
    panel.style.overflow = 'auto';
    panel.style.padding = '10px';
    panel.style.background = 'rgba(0,0,0,0.65)';
    panel.style.color = '#fff';
    panel.style.font = '12px Arial, sans-serif';
    panel.style.border = '1px solid rgba(255,255,255,0.2)';
    panel.style.borderRadius = '8px';
    panel.style.zIndex = '20';
    panel.style.display = 'none';

    panel.innerHTML = `
      <div style="font-weight:bold;margin-bottom:6px;">Debug Panel (F6 to toggle)</div>
      <div style="margin-bottom:6px;opacity:.85">Changes apply live</div>
      <div style="border-top:1px solid #777;margin:8px 0;"></div>
      <div>
        <div style="font-weight:bold;margin:6px 0 4px;">Snow</div>
        <label>spawn/min <input id="dbg-snow-spawn" type="number" step="1" min="0" style="width:80px"></label>
        <label style="margin-left:8px;">alpha <input id="dbg-snow-alpha" type="number" step="0.01" min="0" max="1" style="width:60px"></label>
        <div style="margin-top:4px;">
          <label>wind baseX <input id="dbg-snow-wind-x" type="number" step="0.01" style="width:70px"></label>
          <label style="margin-left:6px;">amp <input id="dbg-snow-wind-amp" type="number" step="0.01" style="width:60px"></label>
          <label style="margin-left:6px;">period(s) <input id="dbg-snow-wind-per" type="number" step="0.5" min="0.5" style="width:60px"></label>
        </div>
        <div style="margin-top:4px;">
          <label>size min <input id="dbg-snow-size-min" type="number" step="0.5" min="0" style="width:60px"></label>
          <label style="margin-left:6px;">max <input id="dbg-snow-size-max" type="number" step="0.5" min="0" style="width:60px"></label>
          <label style="margin-left:6px;">fall min <input id="dbg-snow-fall-min" type="number" step="0.1" min="0" style="width:60px"></label>
          <label style="margin-left:6px;">max <input id="dbg-snow-fall-max" type="number" step="0.1" min="0" style="width:60px"></label>
        </div>
        <div style="margin-top:6px;"><button id="dbg-snow-reset">Reset Snow</button></div>
      </div>
      <div style="border-top:1px solid #777;margin:8px 0;"></div>
      <div>
        <div style="font-weight:bold;margin:6px 0 4px;">Spawn</div>
        <label>baseInterval <input id="dbg-spawn-base" type="number" step="1" min="1" style="width:70px"></label>
        <label style="margin-left:6px;">accelSec <input id="dbg-spawn-every" type="number" step="1" min="1" style="width:70px"></label>
        <label style="margin-left:6px;">factor <input id="dbg-spawn-factor" type="number" step="0.05" min="1" style="width:60px"></label>
        <div style="margin-top:4px;">
          <label>minInterval <input id="dbg-spawn-min" type="number" step="1" min="1" style="width:80px"></label>
        </div>
        <div style="margin-top:4px;">
          <label>corrThreshold° <input id="dbg-spawn-threshold" type="number" step="0.1" min="0" style="width:90px"></label>
          <label style="margin-left:6px;">corrRetries <input id="dbg-spawn-retries" type="number" step="1" min="1" style="width:90px"></label>
        </div>
        <div style="margin-top:4px;">
          <label>multi weights (csv 1..N) <input id="dbg-spawn-weights" type="text" style="width:240px" placeholder="e.g. 0.5,0.3,0.2"></label>
        </div>
        <div style="margin-top:6px;"><button id="dbg-spawn-reset">Reset Spawn</button></div>
      </div>
      <div style="border-top:1px solid #777;margin:8px 0;"></div>
      <div>
        <div style="font-weight:bold;margin:6px 0 4px;">Obstacle</div>
        <label><input id="dbg-obs-const" type="checkbox"> constant speed</label>
        <div style="margin-top:4px;">
          <label>constSpeed <input id="dbg-obs-constspd" type="number" step="0.1" style="width:80px"></label>
          <label style="margin-left:6px;">baseSpeed <input id="dbg-obs-base" type="number" step="0.1" style="width:80px"></label>
        </div>
        <div style="margin-top:4px;">
          <label>minMul <input id="dbg-obs-minmul" type="number" step="0.05" style="width:70px"></label>
          <label style="margin-left:6px;">maxMul <input id="dbg-obs-maxmul" type="number" step="0.05" style="width:70px"></label>
        </div>
        <div style="margin-top:4px;">
          <label>gravityAcc <input id="dbg-obs-grav" type="number" step="0.01" style="width:90px"></label>
        </div>
        <div style="margin-top:6px;"><button id="dbg-obs-reset">Reset Obstacle</button></div>
      </div>
      <div style="border-top:1px solid #777;margin:8px 0;"></div>
      <div>
        <div style="font-weight:bold;margin:6px 0 4px;">Player</div>
        <label>radius <input id="dbg-player-radius" type="number" step="1" min="1" style="width:70px"></label>
        <label style="margin-left:6px;">angularSpeed <input id="dbg-player-speed" type="number" step="0.001" min="0" style="width:100px"></label>
        <div style="margin-top:6px;"><button id="dbg-player-reset">Reset Player</button></div>
      </div>
    `;

    document.body.appendChild(panel);
    this.panel = panel;
    this._attachHandlers();
  }

  _syncInputs() {
    const $ = (id) => this.panel.querySelector(id);
    $('#dbg-snow-spawn').value = SNOW?.spawnPerMin ?? 0;
    $('#dbg-snow-alpha').value = SNOW?.alpha ?? 0.28;
    $('#dbg-snow-wind-x').value = SNOW?.wind?.baseX ?? 0.1;
    $('#dbg-snow-wind-amp').value = SNOW?.wind?.oscAmp ?? 0.08;
    $('#dbg-snow-wind-per').value = SNOW?.wind?.oscPeriodSec ?? 6;

    $('#dbg-spawn-base').value = SPAWN?.baseInterval ?? 90;
    $('#dbg-spawn-every').value = SPAWN?.accelEverySeconds ?? 30;
    $('#dbg-spawn-factor').value = SPAWN?.accelFactor ?? 1.2;
    $('#dbg-spawn-min').value = SPAWN?.minInterval ?? 15;
    $('#dbg-spawn-threshold').value = SPAWN?.correctionThresholdDeg ?? 0;
    $('#dbg-spawn-retries').value = SPAWN?.correctionMaxRetries ?? 1;
    $('#dbg-spawn-weights').value = Array.isArray(SPAWN?.multiCountWeights) ? SPAWN.multiCountWeights.join(',') : '';

    $('#dbg-obs-const').checked = !!OBSTACLE?.constantSpeedEnabled;
    $('#dbg-obs-constspd').value = OBSTACLE?.constantSpeed ?? (OBSTACLE?.baseSpeed ?? 3);
    $('#dbg-obs-base').value = OBSTACLE?.baseSpeed ?? 3;
    $('#dbg-obs-minmul').value = OBSTACLE?.speedMinMul ?? 0.7;
    $('#dbg-obs-maxmul').value = OBSTACLE?.speedMaxMul ?? 1.3;
    $('#dbg-obs-grav').value = OBSTACLE?.gravityAcc ?? 0;

    // Snow extra
    $('#dbg-snow-size-min').value = SNOW?.size?.min ?? 1;
    $('#dbg-snow-size-max').value = SNOW?.size?.max ?? 3;
    $('#dbg-snow-fall-min').value = SNOW?.fallSpeed?.min ?? 0.8;
    $('#dbg-snow-fall-max').value = SNOW?.fallSpeed?.max ?? 2.2;

    // Player
    $('#dbg-player-radius').value = (typeof PLAYER?.radius === 'number') ? PLAYER.radius : 15;
    $('#dbg-player-speed').value = (typeof PLAYER?.angularSpeed === 'number') ? PLAYER.angularSpeed : 0.013;
  }

  _attachHandlers() {
    const onNum = (sel, cb) => {
      const el = this.panel.querySelector(sel);
      el.addEventListener('input', () => {
        const v = parseFloat(el.value);
        if (!Number.isNaN(v)) cb(v);
      });
    };
    const onBool = (sel, cb) => {
      const el = this.panel.querySelector(sel);
      el.addEventListener('change', () => cb(!!el.checked));
    };

    // Snow
    onNum('#dbg-snow-spawn', (v) => { SNOW.spawnPerMin = Math.max(0, v); this.onChange('snow'); });
    onNum('#dbg-snow-alpha', (v) => { SNOW.alpha = Math.max(0, Math.min(1, v)); this.onChange('snow'); });
    onNum('#dbg-snow-wind-x', (v) => { SNOW.wind.baseX = v; this.onChange('snow'); });
    onNum('#dbg-snow-wind-amp', (v) => { SNOW.wind.oscAmp = v; this.onChange('snow'); });
    onNum('#dbg-snow-wind-per', (v) => { SNOW.wind.oscPeriodSec = Math.max(0.1, v); this.onChange('snow'); });

    // Spawn
    onNum('#dbg-spawn-base', (v) => { SPAWN.baseInterval = Math.max(1, Math.round(v)); this.onChange('spawn'); });
    onNum('#dbg-spawn-every', (v) => { SPAWN.accelEverySeconds = Math.max(1, Math.round(v)); this.onChange('spawn'); });
    onNum('#dbg-spawn-factor', (v) => { SPAWN.accelFactor = Math.max(1, v); this.onChange('spawn'); });
    onNum('#dbg-spawn-min', (v) => { SPAWN.minInterval = Math.max(1, Math.round(v)); this.onChange('spawn'); });
    onNum('#dbg-spawn-threshold', (v) => { SPAWN.correctionThresholdDeg = Math.max(0, v); this.onChange('spawn'); });
    onNum('#dbg-spawn-retries', (v) => { SPAWN.correctionMaxRetries = Math.max(1, Math.round(v)); this.onChange('spawn'); });
    const wEl = this.panel.querySelector('#dbg-spawn-weights');
    wEl.addEventListener('input', () => {
      const parts = (wEl.value || '').split(',').map(s => parseFloat(s.trim())).filter(v => !Number.isNaN(v));
      if (parts.length > 0) {
        SPAWN.multiCountWeights = parts;
        this.onChange('spawn');
      }
    });

    // Obstacle
    onBool('#dbg-obs-const', (b) => { OBSTACLE.constantSpeedEnabled = !!b; this.onChange('obstacle'); });
    onNum('#dbg-obs-constspd', (v) => { OBSTACLE.constantSpeed = Math.max(0, v); this.onChange('obstacle'); });
    onNum('#dbg-obs-base', (v) => { OBSTACLE.baseSpeed = Math.max(0, v); this.onChange('obstacle'); });
    onNum('#dbg-obs-minmul', (v) => { OBSTACLE.speedMinMul = v; this.onChange('obstacle'); });
    onNum('#dbg-obs-maxmul', (v) => { OBSTACLE.speedMaxMul = v; this.onChange('obstacle'); });
    onNum('#dbg-obs-grav', (v) => { OBSTACLE.gravityAcc = v; this.onChange('obstacle'); });

    // Snow extras
    onNum('#dbg-snow-size-min', (v) => { SNOW.size.min = Math.max(0, v); this.onChange('snow'); });
    onNum('#dbg-snow-size-max', (v) => { SNOW.size.max = Math.max(0, v); this.onChange('snow'); });
    onNum('#dbg-snow-fall-min', (v) => { SNOW.fallSpeed.min = Math.max(0, v); this.onChange('snow'); });
    onNum('#dbg-snow-fall-max', (v) => { SNOW.fallSpeed.max = Math.max(0, v); this.onChange('snow'); });

    // Player
    onNum('#dbg-player-radius', (v) => { PLAYER.radius = Math.max(1, v); this.onChange('player'); });
    onNum('#dbg-player-speed', (v) => { PLAYER.angularSpeed = Math.max(0, v); this.onChange('player'); });

    // Reset buttons per sector
    const btn = (id, cb) => { const el = this.panel.querySelector(id); if (el) el.addEventListener('click', cb); };
    btn('#dbg-snow-reset', () => {
      Object.assign(SNOW, JSON.parse(JSON.stringify(this._defaults.snow)));
      this.onChange('snow');
      this._syncInputs();
    });
    btn('#dbg-spawn-reset', () => {
      Object.assign(SPAWN, JSON.parse(JSON.stringify(this._defaults.spawn)));
      this.onChange('spawn');
      this._syncInputs();
    });
    btn('#dbg-obs-reset', () => {
      Object.assign(OBSTACLE, JSON.parse(JSON.stringify(this._defaults.obstacle)));
      this.onChange('obstacle');
      this._syncInputs();
    });
    btn('#dbg-player-reset', () => {
      Object.assign(PLAYER, JSON.parse(JSON.stringify(this._defaults.player)));
      this.onChange('player');
      this._syncInputs();
    });
  }
}
