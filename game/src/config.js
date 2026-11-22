// MIDNIGHT VAULT — tuning constants and the night palette.
// One clear job: every number the rest of the game balances against lives here,
// so difficulty and look can be tuned without touching the simulation or the renderer.

export const VIEW = { w: 1280, h: 720 };

export const PALETTE = {
  bg: '#0a0d14',
  floor: '#141824',
  floorAlt: '#171c2b',
  wall: '#2b3350',
  wallTop: '#3a4568',
  cover: '#232a40',
  coverTop: '#2e3757',
  shadow: '#0d1020',
  gold: '#f5c542',
  goldDim: '#a8872e',
  loot: '#ffd75e',
  player: '#e8ecf4',
  playerSneak: '#9fb4d8',
  guard: '#ff5d5d',
  guardCone: '255, 214, 90',   // warm yellow guard cones (RGB triplet, alpha added at draw time)
  cameraCone: '255, 77, 77',   // red camera cones — a different danger colour at a glance
  alarm: '#ff4444',
  ok: '#58d68d',
  text: '#e8ecf4',
  muted: '#8a93ad',
  exit: '#58d68d',
  smoke: '#9aa3b8',
};

export const PLAYER = {
  radius: 13,
  walkSpeed: 165,     // px per second
  sneakSpeed: 88,
  grabRadius: 34,
  coinThrowRange: 260,
};

export const GUARD = {
  radius: 13,
  patrolSpeed: 62,
  chaseSpeed: 138,
  searchSpeed: 95,
  coneRange: 235,
  coneHalfAngle: 0.61,   // ~35 degrees each side
  detectFill: 1.15,      // detection meter fills per second at point blank, standing, lit
  detectDecay: 0.55,
  sneakFactor: 0.32,     // sneaking slows the fill this much
  shadowFactor: 0.30,    // standing in a shadow zone slows it this much
  catchRadius: 26,
  memorySeconds: 6,      // how long a guard keeps chasing a lost player
  investigateSeconds: 5,
};

export const CAMERA = {
  range: 250,
  halfAngle: 0.42,       // ~24 degrees each side
  sweepSpeed: 0.55,      // radians per second
  sweepArc: 0.85,        // radians each side of base angle
  spotFill: 1.6,         // cameras spot you faster than guards
  beepEvery: 0.45,
};

export const ALARM = {
  risePerSecond: 26,     // while any guard is alerted or a camera is spotting
  fallPerSecond: 4.5,    // while unseen
  lockdownAt: 100,
  lockdownSeconds: 12,
  chaseBonus: 14,        // extra alarm per second while a guard is actively chasing
};

export const TOOLS = {
  startCoins: 3,
  startEmp: 1,
  startSmoke: 1,
  startLockpicks: 1,
  empSeconds: 6,
  smokeSeconds: 5,
  smokeRadius: 110,
  coinNoiseRadius: 300,  // guards inside this hear the coin land
  safeCrackSeconds: 2.6,
  vaultCrackSeconds: 3.4,
};

export const SCORE = {
  ghostBonus: 500,
  timeBonusPerSecond: 6,  // bonus per second under par time
  parSeconds: [150, 210, 270],
};

export const LEVELS = [
  { name: 'HEIST 1 — MUSEUM GALLERY', subtitle: 'Lift the Star Sapphire', seed: 1101 },
  { name: 'HEIST 2 — BANK VAULT', subtitle: 'Crack the vault, dodge the sweep', seed: 2202 },
  { name: 'HEIST 3 — PENTHOUSE', subtitle: 'The Black Diamond, top floor', seed: 3303 },
];
