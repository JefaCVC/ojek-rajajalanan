// Keyboard and mouse input, written to survive lost key-up events. A key can get
// stuck "down" when the window loses focus or a modifier is held, so the rules
// are: pressing a direction key clears its opposite; any modifier press or
// release, blur, or refocus clears the whole set; and key-repeat is never used
// to infer a release (the system only repeats the last key pressed, which would
// kill keys held earlier). Mouse buttons resync from the event's buttons field.

export function createInput(canvas) {
  const held = new Set();
  const pressedQueue = [];
  const mouse = { x: 0, y: 0, down: false, clicked: false };
  let anyKeyPressed = false;

  const OPPOSITES = {
    KeyW: 'KeyS', KeyS: 'KeyW', KeyA: 'KeyD', KeyD: 'KeyA',
    ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp', ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft',
  };
  const MODIFIERS = new Set(['ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight']);

  function clearHeld() {
    held.clear();
  }

  function onKeyDown(event) {
    if (MODIFIERS.has(event.code)) { clearHeld(); return; }
    if (event.repeat) return;
    const opposite = OPPOSITES[event.code];
    if (opposite) held.delete(opposite);
    held.add(event.code);
    pressedQueue.push(event.code);
    anyKeyPressed = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  }

  function onKeyUp(event) {
    if (MODIFIERS.has(event.code)) { clearHeld(); return; }
    held.delete(event.code);
  }

  function onBlur() { clearHeld(); }
  function onFocus() { clearHeld(); }

  function updateMouse(event) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
    mouse.down = (event.buttons & 1) === 1;
  }

  function onMouseMove(event) { updateMouse(event); }
  function onMouseDown(event) {
    updateMouse(event);
    mouse.clicked = true;
  }
  function onMouseUp(event) { updateMouse(event); }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    /** True while the key is held. */
    isDown(code) { return held.has(code); },
    /** True if the key was pressed since the last frame; consumed by reading. */
    wasPressed(code) {
      const index = pressedQueue.indexOf(code);
      if (index === -1) return false;
      pressedQueue.splice(index, 1);
      return true;
    },
    /** Movement vector from WASD/arrows, normalized. */
    moveVector() {
      let x = 0;
      let y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) { x *= 0.7071; y *= 0.7071; }
      return { x, y };
    },
    get mouse() { return mouse; },
    get anyKeyPressed() { return anyKeyPressed; },
    get heldCodes() { return [...held]; },
    /** Injects a key press from the debug harness (same path as a real key). */
    simulatePress(code) {
      if (OPPOSITES[code]) held.delete(OPPOSITES[code]);
      held.add(code);
      pressedQueue.push(code);
    },
    simulateRelease(code) { held.delete(code); },
    /** Clears the per-frame queues. Called once per frame after the game reads them. */
    endFrame() {
      pressedQueue.length = 0;
      mouse.clicked = false;
    },
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    },
  };
}
