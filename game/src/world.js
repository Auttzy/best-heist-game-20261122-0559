// MIDNIGHT VAULT — world rules and the three hand-designed heists.
// One clear job: the level layouts (deterministic, hand-placed) and the whole
// simulation — movement and collision, guard patrols and vision, cameras,
// the alarm meter, tools, loot and the win / caught conditions. No drawing here.

import { PLAYER, GUARD, CAMERA, ALARM, TOOLS, SCORE, LEVELS } from './config.js';
import { makeRng, jitterPoint } from './random.js';

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function pointInRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function segmentHitsRect(x1, y1, x2, y2, r) {
  // Slab test: does the segment cross this axis-aligned rectangle?
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) { const t = t1; t1 = t2; t2 = t; }
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function lineBlocked(x1, y1, x2, y2, solids) {
  for (const s of solids) {
    if (segmentHitsRect(x1, y1, x2, y2, s)) return true;
  }
  return false;
}

export function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Move a circle against solid rectangles, sliding along walls.
export function moveCircle(body, dx, dy, solids) {
  const r = body.radius;
  const nx = body.x + dx;
  if (!circleHitsSolids(nx, body.y, r, solids)) body.x = nx;
  const ny = body.y + dy;
  if (!circleHitsSolids(body.x, ny, r, solids)) body.y = ny;
}

function circleHitsSolids(x, y, r, solids) {
  for (const s of solids) {
    const cx = Math.max(s.x, Math.min(x, s.x + s.w));
    const cy = Math.max(s.y, Math.min(y, s.y + s.h));
    const ddx = x - cx;
    const ddy = y - cy;
    if (ddx * ddx + ddy * ddy < r * r) return true;
  }
  return false;
}

function inShadow(x, y, shadows) {
  for (const s of shadows) if (pointInRect(x, y, s)) return true;
  return false;
}

function inSmoke(x, y, smokes, now) {
  for (const s of smokes) {
    if (now < s.until) {
      const dx = x - s.x;
      const dy = y - s.y;
      if (dx * dx + dy * dy < s.radius * s.radius) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// The three heists — hand-designed floor plans.
// The play area is 1280x720; the top 64 px are the HUD, so rooms start at y=76.
// ---------------------------------------------------------------------------

const ROOM = { x: 24, y: 76, w: 1232, h: 620 };

function wall(x, y, w, h) { return { x, y, w, h }; }

export const LEVEL_DEFS = [
  {
    // HEIST 1 — MUSEUM GALLERY. One guard, one slow camera, a wide main hall
    // with display cases for cover and a dark side corridor on the left.
    walls: [
      wall(24, 76, 1232, 14), wall(24, 682, 1232, 14),
      wall(24, 76, 14, 620), wall(1242, 76, 14, 620),
      wall(430, 76, 16, 180), wall(830, 76, 16, 180),
      wall(430, 470, 16, 226), wall(830, 470, 16, 226),
      wall(560, 330, 160, 16),
    ],
    covers: [
      { x: 560, y: 150, w: 150, h: 60, label: 'display case' },
      { x: 560, y: 520, w: 150, h: 60, label: 'display case' },
      { x: 950, y: 300, w: 90, h: 90, label: 'statue plinth' },
      { x: 240, y: 300, w: 90, h: 90, label: 'statue plinth' },
    ],
    shadows: [
      { x: 38, y: 300, w: 120, h: 396 },
      { x: 1098, y: 76, w: 144, h: 150 },
    ],
    guards: [
      { waypoints: [[640, 150], [640, 620], [1150, 620], [1150, 150]], speed: 1.0 },
    ],
    cameras: [
      { x: 640, y: 96, baseAngle: Math.PI / 2, sweep: 0.6, speed: 0.5 },
    ],
    loot: [
      { x: 300, y: 150, kind: 'jewel', value: 150, label: 'Ruby' },
      { x: 980, y: 620, kind: 'cash', value: 120, label: 'Cash stack' },
      { x: 1150, y: 480, kind: 'art', value: 200, label: 'Small canvas' },
    ],
    pickups: [
      { x: 120, y: 620, kind: 'coin', label: '+2 coins' },
      { x: 1150, y: 120, kind: 'emp', label: 'EMP charge' },
    ],
    mainLoot: { x: 640, y: 380, kind: 'sapphire', value: 800, label: 'Star Sapphire', safe: false },
    exit: { x: 38, y: 90, w: 70, h: 46 },
    playerStart: { x: 90, y: 640 },
  },
  {
    // HEIST 2 — BANK VAULT. Two guards, two sweeping cameras, a vault that
    // needs a lockpick and time to crack, plus a vent-like shadow corridor.
    walls: [
      wall(24, 76, 1232, 14), wall(24, 682, 1232, 14),
      wall(24, 76, 14, 620), wall(1242, 76, 14, 620),
      wall(24, 360, 420, 14), wall(24, 374, 14, 160),
      wall(830, 360, 426, 14), wall(1242, 374, 14, 160),
      wall(560, 76, 16, 150), wall(704, 76, 16, 150),
      wall(560, 540, 16, 156), wall(704, 540, 16, 156),
      wall(900, 470, 200, 16),
    ],
    covers: [
      { x: 300, y: 150, w: 120, h: 50, label: 'teller desk' },
      { x: 950, y: 150, w: 120, h: 50, label: 'teller desk' },
      { x: 640, y: 300, w: 130, h: 46, label: 'marble counter' },
      { x: 300, y: 560, w: 120, h: 50, label: 'safe deposit' },
      { x: 950, y: 560, w: 120, h: 50, label: 'safe deposit' },
    ],
    shadows: [
      { x: 38, y: 390, w: 200, h: 292 },
      { x: 1042, y: 390, w: 200, h: 292 },
      { x: 590, y: 240, w: 100, h: 290 },
    ],
    guards: [
      { waypoints: [[300, 250], [960, 250], [960, 620], [300, 620]], speed: 1.1 },
      { waypoints: [[1150, 150], [640, 150], [640, 480], [1150, 480]], speed: 1.0 },
    ],
    cameras: [
      { x: 640, y: 96, baseAngle: Math.PI / 2, sweep: 0.7, speed: 0.7 },
      { x: 1242, y: 360, baseAngle: Math.PI, sweep: 0.5, speed: 0.6 },
    ],
    loot: [
      { x: 140, y: 150, kind: 'cash', value: 180, label: 'Cash stack' },
      { x: 1140, y: 150, kind: 'cash', value: 180, label: 'Cash stack' },
      { x: 140, y: 620, kind: 'jewel', value: 220, label: 'Emerald' },
      { x: 1140, y: 620, kind: 'gold', value: 260, label: 'Gold bars' },
    ],
    pickups: [
      { x: 640, y: 640, kind: 'lockpick', label: 'Lockpick' },
      { x: 90, y: 300, kind: 'smoke', label: 'Smoke bomb' },
      { x: 1180, y: 300, kind: 'coin', label: '+2 coins' },
    ],
    mainLoot: { x: 640, y: 620, kind: 'vault', value: 1500, label: 'Bank Vault', safe: true },
    exit: { x: 38, y: 90, w: 70, h: 46 },
    playerStart: { x: 90, y: 640 },
  },
  {
    // HEIST 3 — PENTHOUSE. Three guards, three cameras, the fastest patrols,
    // a vault behind the guards' loop and a long shadow gallery on the right.
    walls: [
      wall(24, 76, 1232, 14), wall(24, 682, 1232, 14),
      wall(24, 76, 14, 620), wall(1242, 76, 14, 620),
      wall(24, 300, 300, 14), wall(24, 470, 300, 14),
      wall(956, 300, 300, 14), wall(956, 470, 300, 14),
      wall(480, 76, 16, 140), wall(784, 76, 16, 140),
      wall(480, 556, 16, 140), wall(784, 556, 16, 140),
      wall(560, 330, 160, 16), wall(560, 380, 16, 90),
    ],
    covers: [
      { x: 420, y: 200, w: 110, h: 46, label: 'sofa' },
      { x: 760, y: 200, w: 110, h: 46, label: 'sofa' },
      { x: 420, y: 520, w: 110, h: 46, label: 'grand piano' },
      { x: 760, y: 520, w: 110, h: 46, label: 'grand piano' },
      { x: 600, y: 300, w: 80, h: 60, label: 'bar counter' },
    ],
    shadows: [
      { x: 38, y: 314, w: 130, h: 142 },
      { x: 1112, y: 314, w: 130, h: 142 },
      { x: 1042, y: 76, w: 200, h: 200 },
      { x: 38, y: 500, w: 200, h: 182 },
    ],
    guards: [
      { waypoints: [[640, 150], [1150, 150], [1150, 620], [640, 620]], speed: 1.25 },
      { waypoints: [[150, 150], [150, 620], [500, 620], [500, 150]], speed: 1.15 },
      { waypoints: [[640, 260], [640, 520], [1150, 520], [1150, 260]], speed: 1.2 },
    ],
    cameras: [
      { x: 640, y: 96, baseAngle: Math.PI / 2, sweep: 0.8, speed: 0.9 },
      { x: 38, y: 380, baseAngle: 0, sweep: 0.6, speed: 0.7 },
      { x: 1242, y: 380, baseAngle: Math.PI, sweep: 0.6, speed: 0.7 },
    ],
    loot: [
      { x: 140, y: 150, kind: 'art', value: 300, label: 'Portrait' },
      { x: 1140, y: 150, kind: 'jewel', value: 320, label: 'Topaz' },
      { x: 140, y: 620, kind: 'gold', value: 350, label: 'Gold bars' },
      { x: 1140, y: 620, kind: 'cash', value: 280, label: 'Cash stack' },
      { x: 640, y: 480, kind: 'jewel', value: 300, label: 'Opal' },
    ],
    pickups: [
      { x: 90, y: 380, kind: 'emp', label: 'EMP charge' },
      { x: 1180, y: 380, kind: 'smoke', label: 'Smoke bomb' },
      { x: 640, y: 120, kind: 'coin', label: '+2 coins' },
    ],
    mainLoot: { x: 640, y: 380, kind: 'diamond', value: 2500, label: 'Black Diamond', safe: true },
    exit: { x: 38, y: 90, w: 70, h: 46 },
    playerStart: { x: 90, y: 640 },
  },
];

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export function createGame() {
  return {
    levelIndex: 0,
    phase: 'title', // title | howto | playing | paused | caught | levelDone | victory
    time: 0,
    totalScore: 0,
    totalLoot: 0,
    ghost: true,    // still unseen this whole run
    level: null,
    alarm: 0,
    lockdownUntil: 0,
    lockdownGuard: null,
    message: '',
    messageUntil: 0,
    muted: false,
    stats: { spotted: 0, coinsThrown: 0, empsUsed: 0, smokesUsed: 0 },
  };
}

export function startLevel(game, index) {
  const def = LEVEL_DEFS[index];
  const rng = makeRng(LEVELS[index].seed);
  const solids = def.walls.concat(def.covers);
  const level = {
    def,
    solids,
    player: {
      x: def.playerStart.x, y: def.playerStart.y, radius: PLAYER.radius,
      angle: -Math.PI / 2, sneaking: false, hidden: false, moving: false,
    },
    guards: def.guards.map((g) => {
      const wps = g.waypoints.map(([x, y]) => jitterPoint(rng, x, y, 6));
      return {
        waypoints: wps, wp: 1, x: wps[0].x, y: wps[0].y, radius: GUARD.radius,
        angle: angleTo(wps[0].x, wps[0].y, wps[1].x, wps[1].y),
        speedMul: g.speed, mode: 'patrol', detect: 0, lastSeen: null,
        memory: 0, investigateUntil: 0, searchUntil: 0, stuck: 0,
      };
    }),
    cameras: def.cameras.map((c) => ({
      x: c.x, y: c.y, baseAngle: c.baseAngle, sweep: c.sweep,
      speed: c.speed, angle: c.baseAngle, dir: 1, spot: 0, disabledUntil: 0, beepAt: 0,
    })),
    loot: def.loot.map((l) => ({ ...l, taken: false, bob: rng() * 6 })),
    pickups: def.pickups.map((p) => ({ ...p, taken: false })),
    mainLoot: { ...def.mainLoot, taken: false },
    coins: [],        // thrown coins in flight / landed
    noises: [],       // {x, y, until}
    smokes: [],       // {x, y, radius, until}
    tools: {
      coins: TOOLS.startCoins, emp: TOOLS.startEmp,
      smoke: TOOLS.startSmoke, lockpicks: TOOLS.startLockpicks,
    },
    cracking: null,   // {target, progress, needed}
    levelTime: 0,
    levelLoot: 0,
    levelSeen: false,
    won: false,
    caught: false,
    catchReason: '',
  };
  game.levelIndex = index;
  game.level = level;
  game.alarm = 0;
  game.lockdownUntil = 0;
  game.lockdownGuard = null;
  game.phase = 'playing';
  game.message = LEVELS[index].name + ' — ' + LEVELS[index].subtitle;
  game.messageUntil = 3.5;
  return level;
}

function setMessage(game, text, seconds) {
  game.message = text;
  game.messageUntil = seconds;
}

// Can this watcher see the player right now? Walls and cover block sight;
// smoke blocks it too. Returns a visibility factor 0..1.
function visibility(level, wx, wy, range, halfAngle, wAngle, px, py, player) {
  const dx = px - wx;
  const dy = py - wy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), wAngle)) > halfAngle) return 0;
  if (lineBlocked(wx, wy, px, py, level.solids)) return 0;
  if (inSmoke(px, py, level.smokes, level.levelTime)) return 0;
  let vis = 1 - (dist / range) * 0.55; // closer reads faster
  if (player.sneaking) vis *= GUARD.sneakFactor;
  if (player.hidden) vis *= GUARD.shadowFactor;
  return vis;
}

function moveToward(body, tx, ty, speed, dt, solids) {
  const dx = tx - body.x;
  const dy = ty - body.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  moveCircle(body, (dx / dist) * step, (dy / dist) * step, solids);
  body.angle = Math.atan2(dy, dx);
  return dist - step < 2;
}

// ---------------------------------------------------------------------------
// The simulation step. `input` carries the frame's keys and mouse clicks;
// `events` collects sound / feedback triggers for the audio layer.
// ---------------------------------------------------------------------------

export function stepGame(game, input, dt) {
  const level = game.level;
  if (!level || game.phase !== 'playing') return [];
  const events = [];
  const now = level.levelTime;
  level.levelTime += dt;
  game.time += dt;
  const p = level.player;

  // --- player movement -----------------------------------------------------
  let mx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  let my = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const mag = Math.hypot(mx, my);
  p.sneaking = !!input.sneak;
  p.moving = mag > 0;
  if (mag > 0) {
    const speed = p.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    const step = (speed * dt) / mag;
    moveCircle(p, mx * step, my * step, level.solids);
    p.angle = Math.atan2(my, mx);
    if (level.levelTime % 0.42 < dt && !p.sneaking) events.push('step');
    else if (level.levelTime % 0.6 < dt && p.sneaking) events.push('stepSoft');
  }
  p.hidden = inShadow(p.x, p.y, level.def.shadows) && !p.moving;

  // --- tools ---------------------------------------------------------------
  if (input.throwCoin && level.tools.coins > 0 && level.coins.length === 0) {
    level.tools.coins--;
    game.stats.coinsThrown++;
    const tx = p.x + Math.cos(p.angle) * Math.min(PLAYER.coinThrowRange, 160);
    const ty = p.y + Math.sin(p.angle) * Math.min(PLAYER.coinThrowRange, 160);
    level.coins.push({ x: tx, y: ty, until: now + 1.2 });
    level.noises.push({ x: tx, y: ty, until: now + 4, radius: TOOLS.coinNoiseRadius });
    events.push('coin');
  }
  if (input.useEmp && level.tools.emp > 0) {
    level.tools.emp--;
    game.stats.empsUsed++;
    for (const cam of level.cameras) cam.disabledUntil = now + TOOLS.empSeconds;
    events.push('emp');
    setMessage(game, 'EMP burst — cameras dark for ' + TOOLS.empSeconds + 's', 2.5);
  }
  if (input.useSmoke && level.tools.smoke > 0) {
    level.tools.smoke--;
    game.stats.smokesUsed++;
    level.smokes.push({ x: p.x, y: p.y, radius: TOOLS.smokeRadius, until: now + TOOLS.smokeSeconds });
    events.push('smoke');
  }

  // --- pickups -------------------------------------------------------------
  for (const pk of level.pickups) {
    if (pk.taken) continue;
    if (Math.hypot(p.x - pk.x, p.y - pk.y) < 30) {
      pk.taken = true;
      if (pk.kind === 'coin') level.tools.coins += 2;
      if (pk.kind === 'emp') level.tools.emp += 1;
      if (pk.kind === 'smoke') level.tools.smoke += 1;
      if (pk.kind === 'lockpick') level.tools.lockpicks += 1;
      events.push('pickup');
      setMessage(game, 'Picked up: ' + pk.label, 2);
    }
  }

  // --- interact: loot, safes, exit -----------------------------------------
  const main = level.mainLoot;
  const nearMain = !main.taken && Math.hypot(p.x - main.x, p.y - main.y) < PLAYER.grabRadius + 14;
  if (input.interact && nearMain && !level.cracking) {
    if (main.safe && level.tools.lockpicks <= 0) {
      setMessage(game, 'Locked — you need a lockpick', 2);
      events.push('locked');
    } else {
      level.cracking = {
        target: main,
        progress: 0,
        needed: main.kind === 'vault' ? TOOLS.vaultCrackSeconds : TOOLS.safeCrackSeconds,
        usedLockpick: main.safe,
      };
      events.push('crackStart');
    }
  }
  if (level.cracking) {
    const c = level.cracking;
    if (!input.interactHeld || Math.hypot(p.x - c.target.x, p.y - c.target.y) > PLAYER.grabRadius + 26) {
      level.cracking = null;
      events.push('crackStop');
    } else {
      c.progress += dt;
      if (Math.floor(c.progress * 4) !== Math.floor((c.progress - dt) * 4)) events.push('crackTick');
      if (c.progress >= c.needed) {
        if (c.usedLockpick) level.tools.lockpicks--;
        c.target.taken = true;
        level.levelLoot += c.target.value;
        game.totalLoot += c.target.value;
        level.cracking = null;
        events.push('loot');
        setMessage(game, c.target.label + ' secured — $' + c.target.value + '! Get to the exit.', 3);
      }
    }
  }
  for (const l of level.loot) {
    if (!l.taken && Math.hypot(p.x - l.x, p.y - l.y) < PLAYER.grabRadius) {
      l.taken = true;
      level.levelLoot += l.value;
      game.totalLoot += l.value;
      events.push('loot');
      setMessage(game, l.label + ' pocketed — $' + l.value, 2);
    }
  }

  // Exit: only opens once the main loot is taken.
  const ex = level.def.exit;
  const atExit = pointInRect(p.x, p.y, ex);
  if (main.taken && atExit) {
    level.won = true;
    const par = SCORE.parSeconds[game.levelIndex];
    const timeBonus = Math.max(0, Math.round((par - level.levelTime) * SCORE.timeBonusPerSecond));
    const ghostBonus = game.ghost ? SCORE.ghostBonus : 0;
    const total = level.levelLoot + timeBonus + ghostBonus;
    game.totalScore += total;
    game.phase = game.levelIndex >= 2 ? 'victory' : 'levelDone';
    events.push('win');
    level.lastResult = { loot: level.levelLoot, timeBonus, ghostBonus, total, time: level.levelTime };
    return events;
  }

  // --- guards ---------------------------------------------------------------
  let anyAlerted = false;
  let anyChasing = false;
  for (const g of level.guards) {
    const dist = Math.hypot(p.x - g.x, p.y - g.y);
    const vis = visibility(level, g.x, g.y, GUARD.coneRange, GUARD.coneHalfAngle, g.angle, p.x, p.y, p);
    if (vis > 0) {
      g.detect = Math.min(1, g.detect + vis * GUARD.detectFill * dt);
      g.lastSeen = { x: p.x, y: p.y };
      g.memory = GUARD.memorySeconds;
      if (g.detect >= 0.55 && g.mode === 'patrol') {
        g.mode = 'suspicious';
        events.push('suspicious');
      }
      if (g.detect >= 1 && g.mode !== 'alerted') {
        g.mode = 'alerted';
        events.push('alert');
        game.stats.spotted++;
        level.levelSeen = true;
        game.ghost = false;
        setMessage(game, 'SPOTTED! Guard is chasing you!', 2.5);
      }
    } else {
      g.detect = Math.max(0, g.detect - GUARD.detectDecay * dt);
      if (g.mode === 'suspicious' && g.detect <= 0.05) {
        g.mode = 'searching';
        g.searchUntil = now + GUARD.investigateSeconds;
      }
      g.memory = Math.max(0, g.memory - dt);
    }

    // Noise draws suspicious guards to investigate.
    if (g.mode === 'patrol' || g.mode === 'searching') {
      for (const n of level.noises) {
        if (now < n.until && Math.hypot(g.x - n.x, g.y - n.y) < n.radius) {
          g.mode = 'suspicious';
          g.lastSeen = { x: n.x, y: n.y };
          g.investigateUntil = now + GUARD.investigateSeconds;
          events.push('noiseHeard');
          break;
        }
      }
    }

    if (g.mode === 'patrol') {
      const wp = g.waypoints[g.wp];
      if (moveToward(g, wp.x, wp.y, GUARD.patrolSpeed * g.speedMul, dt, level.solids)) {
        g.wp = (g.wp + 1) % g.waypoints.length;
      }
    } else if (g.mode === 'suspicious' && g.lastSeen) {
      if (moveToward(g, g.lastSeen.x, g.lastSeen.y, GUARD.searchSpeed * g.speedMul, dt, level.solids)) {
        g.mode = 'searching';
        g.searchUntil = now + GUARD.investigateSeconds;
      }
    } else if (g.mode === 'searching') {
      if (now > g.searchUntil || g.memory <= 0) {
        g.mode = 'patrol';
        g.detect = 0;
      } else {
        // sweep: look around the last seen spot
        g.angle += dt * 1.4;
      }
    } else if (g.mode === 'alerted') {
      anyAlerted = true;
      anyChasing = true;
      if (g.lastSeen && g.memory > 0) {
        moveToward(g, g.lastSeen.x, g.lastSeen.y, GUARD.chaseSpeed * g.speedMul, dt, level.solids);
      } else {
        g.mode = 'searching';
        g.searchUntil = now + GUARD.investigateSeconds;
      }
    }

    // Caught: a guard touches the thief.
    if (dist < GUARD.catchRadius && (g.mode === 'alerted' || g.mode === 'suspicious' || g.detect > 0.4)) {
      level.caught = true;
      level.catchReason = 'Caught by a guard';
      game.phase = 'caught';
      events.push('caught');
      return events;
    }
  }

  // Lockdown guard: converges on the exit while the alarm is maxed.
  if (game.lockdownUntil > now && !game.lockdownGuard) {
    game.lockdownGuard = {
      waypoints: [[640, 380]], wp: 0, x: 1180, y: 640, radius: GUARD.radius,
      angle: -Math.PI / 2, speedMul: 1.3, mode: 'alerted', detect: 1,
      lastSeen: { x: p.x, y: p.y }, memory: 99, investigateUntil: 0, searchUntil: 0, stuck: 0,
    };
  }
  if (game.lockdownGuard) {
    const lg = game.lockdownGuard;
    lg.lastSeen = { x: p.x, y: p.y };
    lg.memory = 99;
    moveToward(lg, p.x, p.y, GUARD.chaseSpeed * 1.25, dt, level.solids);
    if (Math.hypot(p.x - lg.x, p.y - lg.y) < GUARD.catchRadius) {
      level.caught = true;
      level.catchReason = 'Caught by lockdown security';
      game.phase = 'caught';
      events.push('caught');
      return events;
    }
    if (game.lockdownUntil <= now) game.lockdownGuard = null;
  }

  // --- cameras --------------------------------------------------------------
  let cameraSpotting = false;
  for (const cam of level.cameras) {
    if (now < cam.disabledUntil) { cam.spot = Math.max(0, cam.spot - dt); continue; }
    cam.angle += cam.dir * cam.speed * CAMERA.sweepSpeed * dt;
    if (cam.angle > cam.baseAngle + cam.sweep) { cam.angle = cam.baseAngle + cam.sweep; cam.dir = -1; }
    if (cam.angle < cam.baseAngle - cam.sweep) { cam.angle = cam.baseAngle - cam.sweep; cam.dir = 1; }
    const vis = visibility(level, cam.x, cam.y, CAMERA.range, CAMERA.halfAngle, cam.angle, p.x, p.y, p);
    if (vis > 0) {
      cam.spot = Math.min(1, cam.spot + vis * CAMERA.spotFill * dt);
      cameraSpotting = true;
      if (now >= cam.beepAt) {
        cam.beepAt = now + CAMERA.beepEvery;
        events.push('camBeep');
      }
      if (cam.spot >= 1) {
        game.ghost = false;
        level.levelSeen = true;
        events.push('camSpot');
      }
    } else {
      cam.spot = Math.max(0, cam.spot - dt * 0.8);
    }
  }

  // --- alarm ----------------------------------------------------------------
  if (anyAlerted || cameraSpotting) {
    game.alarm = Math.min(ALARM.lockdownAt, game.alarm + (ALARM.risePerSecond + (anyChasing ? ALARM.chaseBonus : 0)) * dt);
  } else {
    game.alarm = Math.max(0, game.alarm - ALARM.fallPerSecond * dt);
  }
  if (game.alarm >= ALARM.lockdownAt && game.lockdownUntil <= now) {
    game.lockdownUntil = now + ALARM.lockdownSeconds;
    events.push('lockdown');
    setMessage(game, 'LOCKDOWN! Extra security converging on you!', 3);
  }

  // Expire transient effects.
  level.coins = level.coins.filter((c) => now < c.until);
  level.noises = level.noises.filter((n) => now < n.until);
  level.smokes = level.smokes.filter((s) => now < s.until);
  if (game.messageUntil > 0) game.messageUntil -= dt;

  return events;
}

export function levelScore(game) {
  return game.totalScore;
}
