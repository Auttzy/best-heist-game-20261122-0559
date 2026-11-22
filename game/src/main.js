// MIDNIGHT VAULT — the game loop and the phase machine.
// One clear job: boot the canvas, run requestAnimationFrame, step the world,
// hand sound events to the audio layer, and own the transitions between
// title, how-to, playing, paused, caught, level-complete and victory.

import { VIEW } from './config.js';
import { createGame, startLevel, stepGame } from './world.js';
import { createInput, attachInput, endFrame } from './input.js';
import { render, spawnBurst, spawnFootstep } from './render.js';
import { createAudio, playEvent, setMuted, resumeAudio } from './audio.js';
import { shotFromQuery, buildShotGame } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');

function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.w, window.innerHeight / VIEW.h);
  canvas.width = VIEW.w;
  canvas.height = VIEW.h;
  canvas.style.width = Math.floor(VIEW.w * scale) + 'px';
  canvas.style.height = Math.floor(VIEW.h * scale) + 'px';
}

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot') || params.get('scene');
const game = shotName ? buildShotGame(shotFromQuery(window.location.search)) : createGame();
const input = createInput();
const audio = createAudio();
let lastNow = performance.now();
let titleClock = 0;

attachInput(input, canvas);
fitCanvas();
window.addEventListener('resize', fitCanvas);

function announce(text) {
  if (status) status.textContent = text;
}

function handlePhaseKeys() {
  if (input.mute) {
    game.muted = !game.muted;
    setMuted(audio, game.muted);
  }
  if (game.phase === 'title') {
    if (input.anyKey) {
      startLevel(game, 0);
      announce('Heist 1, Museum Gallery. Grab the Star Sapphire, then reach the exit.');
    }
    if (input.pause) game.phase = 'howto';
    return;
  }
  if (game.phase === 'howto') {
    if (input.anyKey || input.pause) game.phase = 'title';
    return;
  }
  if (game.phase === 'playing') {
    if (input.pause) {
      game.phase = 'paused';
      announce('Paused.');
    }
    return;
  }
  if (game.phase === 'paused') {
    if (input.pause) game.phase = 'playing';
    if (input.restart) startLevel(game, game.levelIndex);
    return;
  }
  if (game.phase === 'caught') {
    if (input.restart) startLevel(game, game.levelIndex);
    if (input.anyKey) {
      game.phase = 'title';
      game.level = null;
    }
    return;
  }
  if (game.phase === 'levelDone') {
    if (input.anyKey) startLevel(game, game.levelIndex + 1);
    return;
  }
  if (game.phase === 'victory') {
    if (input.anyKey) {
      const fresh = createGame();
      fresh.muted = game.muted;
      Object.assign(game, fresh);
      game.phase = 'title';
    }
    return;
  }
}

function frame(now) {
  const dt = Math.min(0.05, (now - lastNow) / 1000 || 0.016);
  lastNow = now;
  titleClock += dt;

  if (!shotName) {
    handlePhaseKeys();
    if (input.restart && game.phase !== 'playing' && game.phase !== 'paused') {
      // R also restarts mid-heist from anywhere
    }
    if (game.phase === 'playing') {
      const events = stepGame(game, input, dt);
      const level = game.level;
      for (const e of events) {
        playEvent(audio, e);
        if (e === 'loot' && level) spawnBurst(level.player.x, level.player.y, '#f5c542', 14, 120);
        if (e === 'caught' && level) spawnBurst(level.player.x, level.player.y, '#ff4444', 20, 160);
        if (e === 'emp' && level) spawnBurst(level.player.x, level.player.y, '#6fd3ff', 18, 180);
        if (e === 'smoke' && level) spawnBurst(level.player.x, level.player.y, '#9aa3b8', 16, 90);
      }
      if (level && level.player.moving && Math.random() < dt * 2) {
        spawnFootstep(level.player.x, level.player.y + 8);
      }
      resumeAudio(audio);
    }
    if (input.restart && game.phase === 'playing') {
      startLevel(game, game.levelIndex);
    }
  }

  render(ctx, game, shotName ? 1.2 : titleClock);
  endFrame(input);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
