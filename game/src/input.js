// MIDNIGHT VAULT — keyboard and mouse input.
// One clear job: turn raw DOM events into the small input object the simulation
// consumes each frame, plus one-shot action flags (throw coin, EMP, smoke, pause)
// that are consumed once and then cleared.

export function createInput() {
  return {
    up: false, down: false, left: false, right: false,
    sneak: false,
    interact: false,      // edge: pressed this frame
    interactHeld: false,  // held down (for safe cracking)
    throwCoin: false,
    useEmp: false,
    useSmoke: false,
    pause: false,
    restart: false,
    mute: false,
    anyKey: false,
    mouseX: 0, mouseY: 0,
    mouseClicked: false,
  };
}

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export function attachInput(input, element) {
  const down = (event) => {
    const move = KEYMAP[event.code];
    if (move) {
      input[move] = true;
      event.preventDefault();
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') input.sneak = true;
    if (event.code === 'KeyE') {
      if (!input.interactHeld) input.interact = true;
      input.interactHeld = true;
    }
    if (event.code === 'KeyQ' || event.code === 'Space') {
      if (!event.repeat) input.throwCoin = true;
      event.preventDefault();
    }
    if (event.code === 'Digit1' || event.code === 'KeyF') input.useEmp = true;
    if (event.code === 'Digit2' || event.code === 'KeyG') input.useSmoke = true;
    if (event.code === 'KeyP' || event.code === 'Escape') input.pause = true;
    if (event.code === 'KeyR') input.restart = true;
    if (event.code === 'KeyM') input.mute = true;
    if (event.code === 'Enter') input.anyKey = true;
    input.anyKey = true;
  };

  const up = (event) => {
    const move = KEYMAP[event.code];
    if (move) input[move] = false;
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') input.sneak = false;
    if (event.code === 'KeyE') input.interactHeld = false;
  };

  const onMouseMove = (event) => {
    const rect = element.getBoundingClientRect();
    input.mouseX = ((event.clientX - rect.left) / rect.width) * 1280;
    input.mouseY = ((event.clientY - rect.top) / rect.height) * 720;
  };

  const onMouseDown = (event) => {
    onMouseMove(event);
    input.mouseClicked = true;
    input.throwCoin = true; // clicking throws a coin toward the click
  };

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  element.addEventListener('mousemove', onMouseMove);
  element.addEventListener('mousedown', onMouseDown);

  return () => {
    window.removeEventListener('keydown', down);
    window.removeEventListener('keyup', up);
    element.removeEventListener('mousemove', onMouseMove);
    element.removeEventListener('mousedown', onMouseDown);
  };
}

// Clear the one-shot flags after the simulation consumed them.
export function endFrame(input) {
  input.interact = false;
  input.throwCoin = false;
  input.useEmp = false;
  input.useSmoke = false;
  input.pause = false;
  input.restart = false;
  input.mute = false;
  input.anyKey = false;
  input.mouseClicked = false;
}
