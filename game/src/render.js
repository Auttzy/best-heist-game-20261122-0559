// MIDNIGHT VAULT — everything drawn on the canvas.
// One clear job: take the game state and paint it — the room, the raycast-clipped
// vision cones (warm yellow for guards, red for cameras), the thief, loot glow,
// the alarm HUD and every screen (title, how-to, pause, caught, victory).

import { VIEW, PALETTE } from './config.js';
import { LEVELS } from './config.js';
import { lineBlocked } from './world.js';

// ---------------------------------------------------------------------------
// Particles (footsteps, loot sparkles, alarm flashes) — render-local state.
// ---------------------------------------------------------------------------

const particles = [];

export function spawnBurst(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const v = speed * (0.4 + Math.random() * 0.6);
    particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.7, max: 0.7, color, size: 2 + Math.random() * 2 });
  }
}

export function spawnFootstep(x, y) {
  particles.push({ x, y, vx: 0, vy: 0, life: 0.5, max: 0.5, color: '#5a6a94', size: 3 });
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles(ctx) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max) * 0.8;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------------------
// Vision cones — raycast against walls so cones stop at cover, the way sight does.
// ---------------------------------------------------------------------------

function rayDistance(x, y, angle, maxRange, solids) {
  const step = 10;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  for (let d = step; d <= maxRange; d += step) {
    const nx = x + dx * d;
    const ny = y + dy * d;
    for (const s of solids) {
      if (nx >= s.x && nx <= s.x + s.w && ny >= s.y && ny <= s.y + s.h) return d - step / 2;
    }
  }
  return maxRange;
}

export function drawCone(ctx, x, y, angle, halfAngle, range, solids, rgb, alpha) {
  const rays = 26;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= rays; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / rays;
    const d = rayDistance(x, y, a, range, solids);
    ctx.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d);
  }
  ctx.closePath();
  const grad = ctx.createRadialGradient(x, y, 8, x, y, range);
  grad.addColorStop(0, `rgba(${rgb},${alpha})`);
  grad.addColorStop(0.75, `rgba(${rgb},${alpha * 0.55})`);
  grad.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = `rgba(${rgb},${alpha * 0.5})`;
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ---------------------------------------------------------------------------
// Room
// ---------------------------------------------------------------------------

function drawFloor(ctx, level) {
  const def = level.def;
  ctx.fillStyle = PALETTE.floor;
  ctx.fillRect(24, 76, 1232, 620);
  // checkerboard floor tiles for a museum / bank feel
  ctx.fillStyle = PALETTE.floorAlt;
  const tile = 62;
  for (let ty = 76; ty < 696; ty += tile) {
    for (let tx = 24; tx < 1256; tx += tile) {
      if (((tx - 24) / tile + (ty - 76) / tile) % 2 === 0) ctx.fillRect(tx, ty, tile, tile);
    }
  }
  // shadow zones — dark, safe
  for (const s of def.shadows) {
    ctx.fillStyle = 'rgba(4, 6, 14, 0.55)';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = 'rgba(120, 140, 200, 0.18)';
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(s.x + 1, s.y + 1, s.w - 2, s.h - 2);
    ctx.setLineDash([]);
  }
  // exit door
  const ex = def.exit;
  ctx.fillStyle = PALETTE.exit;
  ctx.fillRect(ex.x, ex.y, ex.w, ex.h);
  ctx.fillStyle = '#0a0d14';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(level.mainLoot.taken ? 'EXIT — GO!' : 'EXIT', ex.x + ex.w / 2, ex.y + ex.h / 2);
  // walls
  for (const w of def.walls) {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = PALETTE.wallTop;
    if (w.h <= 16) ctx.fillRect(w.x, w.y, w.w, 4);
    else ctx.fillRect(w.x, w.y, 4, w.h);
  }
  // cover objects
  for (const c of def.covers) {
    ctx.fillStyle = PALETTE.cover;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = PALETTE.coverTop;
    ctx.fillRect(c.x, c.y, c.w, 6);
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.strokeRect(c.x + 0.5, c.y + 0.5, c.w - 1, c.h - 1);
  }
}

function drawLoot(ctx, level, now) {
  const bob = Math.sin(now * 2.2) * 3;
  for (const l of level.loot) {
    if (l.taken) continue;
    const y = l.y + bob;
    ctx.save();
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 18;
    ctx.fillStyle = PALETTE.loot;
    ctx.beginPath();
    ctx.arc(l.x, y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#0a0d14';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', l.x, y + 0.5);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(l.label + ' $' + l.value, l.x, y + 20);
  }
  const m = level.mainLoot;
  if (!m.taken) {
    const pulse = 14 + Math.sin(now * 3) * 4;
    ctx.save();
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 30;
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(m.x, m.y + bob, pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#0a0d14';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('◆', m.x, m.y + bob + 1);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText(m.label + ' — $' + m.value, m.x, m.y + bob + 30);
    if (m.safe) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('SAFE — needs a lockpick, hold E to crack', m.x, m.y + bob + 46);
    }
  }
  for (const pk of level.pickups) {
    if (pk.taken) continue;
    ctx.fillStyle = pk.kind === 'coin' ? '#e8c15a' : pk.kind === 'emp' ? '#6fd3ff' : pk.kind === 'smoke' ? '#b9c0d4' : '#ff9d6f';
    ctx.beginPath();
    ctx.arc(pk.x, pk.y + bob, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0d14';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pk.kind === 'coin' ? 'C' : pk.kind === 'emp' ? 'E' : pk.kind === 'smoke' ? 'S' : 'L', pk.x, pk.y + bob + 0.5);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '10px system-ui, sans-serif';
    ctx.fillText(pk.label, pk.x, pk.y + bob + 19);
  }
}

function drawPlayer(ctx, level) {
  const p = level.player;
  if (p.hidden) {
    ctx.strokeStyle = 'rgba(88, 214, 141, 0.9)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.fillStyle = p.sneaking ? PALETTE.playerSneak : PALETTE.player;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fill();
  // facing wedge — the thief's direction
  ctx.fillStyle = '#0a0d14';
  ctx.beginPath();
  ctx.moveTo(p.radius + 2, 0);
  ctx.lineTo(2, -6);
  ctx.lineTo(2, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // sneak / hidden tag
  ctx.fillStyle = p.hidden ? PALETTE.exit : PALETTE.muted;
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(p.hidden ? 'HIDDEN' : p.sneaking ? 'SNEAKING' : '', p.x, p.y - p.radius - 8);
}

function drawGuards(ctx, level, now, extra) {
  const all = extra ? level.guards.concat(extra) : level.guards;
  for (const g of all) {
    const alerted = g.mode === 'alerted';
    const suspicious = g.mode === 'suspicious' || g.mode === 'searching';
    const rgb = PALETTE.guardCone;
    const alpha = alerted ? 0.5 : suspicious ? 0.38 : 0.28;
    drawCone(ctx, g.x, g.y, g.angle, 0.61, 235, level.solids, rgb, alpha);
  }
  for (const g of all) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.rotate(g.angle);
    ctx.fillStyle = g.mode === 'alerted' ? '#ff2e2e' : '#ff7a5c';
    ctx.beginPath();
    ctx.arc(0, 0, g.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a0d0d';
    ctx.beginPath();
    ctx.moveTo(g.radius + 2, 0);
    ctx.lineTo(2, -6);
    ctx.lineTo(2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // detection meter ring
    if (g.detect > 0.02) {
      ctx.strokeStyle = g.detect >= 1 ? '#ff2e2e' : '#ffd65a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.radius + 6, -Math.PI / 2, -Math.PI / 2 + g.detect * Math.PI * 2);
      ctx.stroke();
    }
    // ? / ! indicator
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.textAlign = 'center';
    if (g.mode === 'alerted') {
      ctx.fillStyle = '#ff2e2e';
      ctx.fillText('!', g.x, g.y - g.radius - 10);
    } else if (g.mode === 'suspicious' || g.mode === 'searching') {
      ctx.fillStyle = '#ffd65a';
      ctx.fillText('?', g.x, g.y - g.radius - 10);
    }
  }
}

function drawCameras(ctx, level, now) {
  for (const cam of level.cameras) {
    const disabled = now < cam.disabledUntil;
    if (!disabled) {
      const alpha = cam.spot > 0.5 ? 0.55 : 0.34;
      drawCone(ctx, cam.x, cam.y, cam.angle, 0.42, 250, level.solids, PALETTE.cameraCone, alpha);
    }
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.rotate(cam.angle);
    ctx.fillStyle = disabled ? '#5a6a94' : cam.spot > 0.5 ? '#ff2e2e' : '#ff6b6b';
    ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = disabled ? '#2a3350' : '#fff';
    ctx.beginPath();
    ctx.arc(8, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (cam.spot > 0.02) {
      ctx.strokeStyle = '#ff2e2e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, 14, -Math.PI / 2, -Math.PI / 2 + cam.spot * Math.PI * 2);
      ctx.stroke();
    }
    if (disabled) {
      ctx.fillStyle = '#8a93ad';
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EMP ' + Math.ceil(cam.disabledUntil - now) + 's', cam.x, cam.y - 16);
    }
  }
}

function drawEffects(ctx, level, now) {
  for (const s of level.smokes) {
    ctx.fillStyle = 'rgba(154, 163, 184, 0.35)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(154, 163, 184, 0.2)';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const c of level.coins) {
    ctx.fillStyle = '#e8c15a';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232, 193, 90, 0.5)';
    ctx.beginPath();
    ctx.arc(c.x, c.y, 14, 0, Math.PI * 2);
    ctx.stroke();
  }
  const c = level.cracking;
  if (c) {
    const pct = c.progress / c.needed;
    ctx.fillStyle = 'rgba(10, 13, 20, 0.85)';
    ctx.fillRect(c.target.x - 70, c.target.y - 52, 140, 20);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(c.target.x - 68, c.target.y - 50, 136 * pct, 16);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CRACKING… hold E', c.target.x, c.target.y - 58);
  }
}

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

function drawHud(ctx, game) {
  const level = game.level;
  ctx.fillStyle = '#0d1019';
  ctx.fillRect(0, 0, VIEW.w, 64);
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.moveTo(0, 64.5);
  ctx.lineTo(VIEW.w, 64.5);
  ctx.stroke();

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(LEVELS[game.levelIndex].name, 24, 24);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText(LEVELS[game.levelIndex].subtitle, 24, 46);

  // loot value
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText('LOOT $' + (game.totalLoot + (level ? level.levelLoot : 0)), 470, 26);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(level && level.mainLoot.taken ? 'main loot secured — reach the EXIT' : 'grab the main loot, then reach the EXIT', 470, 46);

  // alarm meter
  const ax = 760;
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('ALARM', ax, 20);
  ctx.fillStyle = '#1c2233';
  ctx.fillRect(ax, 30, 200, 16);
  const alarmPct = game.alarm / 100;
  ctx.fillStyle = game.alarm >= 100 ? '#ff2e2e' : game.alarm > 55 ? '#ff9d2e' : '#ffd65a';
  ctx.fillRect(ax, 30, 200 * alarmPct, 16);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.strokeRect(ax + 0.5, 30.5, 200, 16);
  ctx.fillStyle = game.alarm >= 100 ? '#ff2e2e' : PALETTE.muted;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText(game.alarm >= 100 ? 'LOCKDOWN!' : Math.round(game.alarm) + '%', ax + 208, 38);

  // tools
  const tools = level ? level.tools : { coins: 0, emp: 0, smoke: 0, lockpicks: 0 };
  ctx.fillStyle = PALETTE.text;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('🪙×' + tools.coins + '  EMP×' + tools.emp + '  💨×' + tools.smoke + '  🔓×' + tools.lockpicks, 1000, 24);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '12px system-ui, sans-serif';
  const t = level ? level.levelTime : 0;
  const mm = String(Math.floor(t / 60)).padStart(2, '0');
  const ss = String(Math.floor(t % 60)).padStart(2, '0');
  ctx.fillText('TIME ' + mm + ':' + ss + (game.ghost ? '  ·  GHOST 👻' : ''), 1000, 46);

  // message line
  if (game.message && game.messageUntil > 0) {
    ctx.fillStyle = 'rgba(10, 13, 20, 0.85)';
    const w = ctx.measureText(game.message).width + 28;
    ctx.fillRect((VIEW.w - w) / 2, 70, w, 26);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.message, VIEW.w / 2, 83);
    ctx.textAlign = 'left';
  }
}

function dim(ctx, alpha) {
  ctx.fillStyle = `rgba(5, 7, 12, ${alpha})`;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
}

function panel(ctx, title, lines, accent) {
  const w = 640;
  const h = 130 + lines.length * 30;
  const x = (VIEW.w - w) / 2;
  const y = (VIEW.h - h) / 2;
  ctx.fillStyle = 'rgba(13, 16, 25, 0.96)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.w / 2, y + 58);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '16px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW.w / 2, y + 102 + i * 30));
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

function drawTitle(ctx, game, now) {
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  // skyline silhouette
  ctx.fillStyle = '#101527';
  for (let i = 0; i < 26; i++) {
    const bw = 30 + ((i * 37) % 50);
    const bh = 90 + ((i * 53) % 180);
    ctx.fillRect(i * 50, 720 - bh, bw, bh);
  }
  ctx.fillStyle = 'rgba(245, 197, 66, 0.85)';
  for (let i = 0; i < 40; i++) {
    const wx = (i * 173) % 1280;
    const wy = 480 + ((i * 97) % 200);
    ctx.fillRect(wx, wy, 5, 7);
  }
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 84px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('MIDNIGHT VAULT', VIEW.w / 2, 250);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('Three heists. One night. Don’t get seen.', VIEW.w / 2, 300);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Museum Gallery  ·  Bank Vault  ·  Penthouse', VIEW.w / 2, 340);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = 'bold 18px system-ui, sans-serif';
  const blink = 0.6 + Math.sin(now * 3) * 0.4;
  ctx.globalAlpha = blink;
  ctx.fillText('Press ENTER to start  ·  H for how to play', VIEW.w / 2, 420);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText('WASD move · SHIFT sneak · E grab / crack · Q or click throw a coin · 1 EMP · 2 smoke · P pause · M mute', VIEW.w / 2, 470);
  ctx.fillText('Yellow cones are guards. Red cones are cameras. Shadows hide you. Grab the loot, reach the EXIT.', VIEW.w / 2, 496);
  ctx.textAlign = 'left';
}

function drawHowTo(ctx) {
  dim(ctx, 0.75);
  panel(ctx, 'HOW TO PLAY', [
    'WASD / arrows — move. SHIFT — sneak (slow, quiet, harder to spot).',
    'E — grab loot, hold E to crack a safe (needs a lockpick).',
    'Q, SPACE or click — throw a coin; guards investigate the noise.',
    '1 — EMP: cameras go dark for 6s.   2 — smoke bomb: breaks line of sight.',
    'Yellow cones are guards, red cones are cameras. Walls block sight.',
    'Shadows hide you — watch for the HIDDEN tag. Alarm at 100% = LOCKDOWN.',
    'Grab the main loot, then reach the green EXIT. Ghost bonus: never be seen.',
    'P pause · R restart · M mute · ENTER start',
  ], PALETTE.gold);
}

function drawPaused(ctx) {
  dim(ctx, 0.6);
  panel(ctx, 'PAUSED', ['P or ESC to resume · R to restart the heist · M to mute'], PALETTE.muted);
}

function drawCaught(ctx, game) {
  dim(ctx, 0.7);
  panel(ctx, 'CAUGHT!', [
    game.level ? game.level.catchReason : '',
    'Loot this heist: $' + (game.level ? game.level.levelLoot : 0) + '   ·   Total score: ' + game.totalScore,
    'Press R to retry the heist · ENTER for the title screen',
  ], '#ff4444');
}

function drawLevelDone(ctx, game) {
  const r = game.level.lastResult;
  dim(ctx, 0.6);
  panel(ctx, 'HEIST COMPLETE!', [
    'Loot: $' + r.loot + '   ·   Time bonus: $' + r.timeBonus + (r.ghostBonus ? '   ·   Ghost bonus: $' + r.ghostBonus : ''),
    'Heist score: $' + r.total + '   ·   Total score: $' + game.totalScore,
    'Press ENTER for the next heist',
  ], PALETTE.exit);
}

function drawVictory(ctx, game) {
  const r = game.level.lastResult;
  dim(ctx, 0.55);
  panel(ctx, 'THE GETAWAY!', [
    'All three heists done. The Black Diamond is yours.',
    'Final loot: $' + game.totalLoot + '   ·   Final score: $' + game.totalScore,
    game.ghost ? 'GHOST RUN — never seen once. A perfect night.' : 'Seen along the way, but the crew still got out clean.',
    'Press ENTER to play again',
  ], PALETTE.gold);
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function render(ctx, game, now) {
  ctx.clearRect(0, 0, VIEW.w, VIEW.h);
  ctx.fillStyle = PALETTE.bg;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  if (game.phase === 'title') {
    drawTitle(ctx, game, now);
    return;
  }
  if (game.phase === 'howto') {
    drawTitle(ctx, game, now);
    drawHowTo(ctx);
    return;
  }

  const level = game.level;
  if (!level) return;
  updateParticles(1 / 60);
  drawFloor(ctx, level);
  drawLoot(ctx, level, now);
  drawGuards(ctx, level, now, game.lockdownGuard ? [game.lockdownGuard] : null);
  drawCameras(ctx, level, now);
  drawEffects(ctx, level, now);
  drawPlayer(ctx, level);
  drawParticles(ctx);

  // alarm vignette — the screen edges burn red as the alarm climbs
  if (game.alarm > 30) {
    const a = (game.alarm - 30) / 70;
    const grad = ctx.createRadialGradient(640, 360, 260, 640, 360, 640);
    grad.addColorStop(0, 'rgba(255, 40, 40, 0)');
    grad.addColorStop(1, `rgba(255, 40, 40, ${0.28 * a})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }
  if (game.lockdownUntil > level.levelTime) {
    ctx.fillStyle = '#ff2e2e';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚠ LOCKDOWN — ' + Math.ceil(game.lockdownUntil - level.levelTime) + 's ⚠', VIEW.w / 2, 110);
    ctx.textAlign = 'left';
  }

  drawHud(ctx, game);

  if (game.phase === 'paused') drawPaused(ctx);
  if (game.phase === 'caught') drawCaught(ctx, game);
  if (game.phase === 'levelDone') drawLevelDone(ctx, game);
  if (game.phase === 'victory') drawVictory(ctx, game);
}
