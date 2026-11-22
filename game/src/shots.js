// MIDNIGHT VAULT — deterministic screenshot scenes.
// One clear job: build real game states for the four screenshots — the title,
// a mid-play heist, the lockdown alarm moment and the getaway victory — from
// the game's own code, so every screenshot is a render of the actual game.
// ?shot=start | play | alarm | end (with an optional &seed= number).

import { createGame, startLevel } from './world.js';

export const SHOT_NAMES = ['start', 'play', 'alarm', 'end'];

export function shotFromQuery(query) {
  const params = new URLSearchParams(query || '');
  const shot = params.get('shot') || params.get('scene') || 'play';
  return SHOT_NAMES.includes(shot) ? shot : 'play';
}

// Place the player and guards at hand-picked, photogenic spots for a shot.
function stagePlay(game) {
  startLevel(game, 0);
  const level = game.level;
  // The thief mid-room, sneaking past the patrol toward the Star Sapphire.
  level.player.x = 470;
  level.player.y = 470;
  level.player.angle = Math.PI / 4;
  level.player.sneaking = true;
  level.levelTime = 47;
  level.levelLoot = 270;
  game.totalLoot = 270;
  game.alarm = 38;
  // Two bonus loot already pocketed, one pickup taken, so the frame tells a story.
  level.loot[0].taken = true;
  level.loot[1].taken = true;
  level.pickups[0].taken = true;
  // Guard halfway along the patrol, cone sweeping toward the thief; one camera
  // already half-suspicious of him.
  const g = level.guards[0];
  g.x = 640;
  g.y = 300;
  g.angle = Math.PI * 0.78;
  g.detect = 0.45;
  g.mode = 'suspicious';
  g.lastSeen = { x: 470, y: 470 };
  const cam = level.cameras[0];
  cam.angle = Math.PI / 2 + 0.35;
  cam.spot = 0.55;
  game.message = 'Sneak past the guard — the Star Sapphire is dead ahead';
  game.messageUntil = 99;
  return game;
}

function stageAlarm(game) {
  startLevel(game, 1);
  const level = game.level;
  level.player.x = 700;
  level.player.y = 420;
  level.player.angle = -Math.PI / 2;
  level.levelTime = 132;
  level.levelLoot = 1680;
  game.totalLoot = 1680;
  game.alarm = 100;
  game.lockdownUntil = 140; // 8 seconds of lockdown left
  game.ghost = false;
  level.levelSeen = true;
  level.mainLoot.taken = true;
  // Both guards alerted and converging; the camera has the thief dead to rights.
  for (const g of level.guards) {
    g.mode = 'alerted';
    g.detect = 1;
    g.lastSeen = { x: 700, y: 420 };
    g.memory = 6;
  }
  level.guards[0].x = 560;
  level.guards[0].y = 300;
  level.guards[0].angle = Math.PI * 0.4;
  level.guards[1].x = 900;
  level.guards[1].y = 300;
  level.guards[1].angle = Math.PI * 0.65;
  const cam = level.cameras[0];
  cam.angle = Math.PI / 2 + 0.2;
  cam.spot = 1;
  // The lockdown guard closing in from the right.
  game.lockdownGuard = {
    waypoints: [[640, 380]], wp: 0, x: 980, y: 500, radius: 13,
    angle: Math.PI * 0.8, speedMul: 1.3, mode: 'alerted', detect: 1,
    lastSeen: { x: 700, y: 420 }, memory: 99, investigateUntil: 0, searchUntil: 0, stuck: 0,
  };
  game.message = 'LOCKDOWN! Extra security converging on you!';
  game.messageUntil = 99;
  return game;
}

function stageEnd(game) {
  startLevel(game, 2);
  const level = game.level;
  // The thief at the exit with the Black Diamond secured, third heist done.
  level.player.x = 73;
  level.player.y = 113;
  level.player.angle = Math.PI;
  level.levelTime = 214;
  level.levelLoot = 3420;
  game.totalLoot = 3420;
  game.totalScore = 4120;
  game.alarm = 12;
  game.ghost = true;
  level.mainLoot.taken = true;
  level.loot.forEach((l) => { l.taken = true; });
  level.lastResult = { loot: 3420, timeBonus: 336, ghostBonus: 500, total: 4256, time: 214 };
  game.phase = 'victory';
  return game;
}

export function buildShotGame(name) {
  const game = createGame();
  if (name === 'start') {
    game.phase = 'title';
    return game;
  }
  if (name === 'play') return stagePlay(game);
  if (name === 'alarm') return stageAlarm(game);
  if (name === 'end') return stageEnd(game);
  return stagePlay(game);
}
