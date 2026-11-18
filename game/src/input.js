// OJEK! King of the Streets — keyboard and mouse input.
//
// Built to survive the usual browser traps: a keyup lost while the window is
// unfocused, a stuck key after Alt-Tab, and both halves of a movement pair
// held at once. The window blur and any modifier key clear everything; when
// a movement key goes down, its opposite is dropped from the pressed set.

const OPPOSITES = {
  KeyW: 'KeyS', KeyS: 'KeyW',
  KeyA: 'KeyD', KeyD: 'KeyA',
  ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp',
  ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft',
};

export function createInput(canvas) {
  const down = new Set();
  const fresh = new Set();
  let orbitDX = 0;
  let orbitDY = 0;
  let wheelDelta = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function onKeyDown(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) { down.clear(); return; }
    if (e.repeat) return;
    const opposite = OPPOSITES[e.code];
    if (opposite) down.delete(opposite);
    down.add(e.code);
    fresh.add(e.code);
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  }

  function onKeyUp(e) { down.delete(e.code); }

  function onBlur() { down.clear(); dragging = false; }

  function onPointerDown(e) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e) {
    if (!dragging) return;
    orbitDX += e.clientX - lastX;
    orbitDY += e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
  }

  function onPointerUp() { dragging = false; }

  function onWheel(e) {
    wheelDelta += e.deltaY;
    e.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  return {
    isDown(code) { return down.has(code); },
    // True only on the first frame the key is down; consume each frame.
    pressed(code) { return fresh.has(code); },
    endFrame() { fresh.clear(); orbitDX = 0; orbitDY = 0; wheelDelta = 0; },
    takeOrbit() { const d = { x: orbitDX, y: orbitDY }; orbitDX = 0; orbitDY = 0; return d; },
    takeWheel() { const w = wheelDelta; wheelDelta = 0; return w; },
    // Forward/back and left/right as -1..1, from WASD or arrows.
    moveAxes() {
      const f = (down.has('KeyW') || down.has('ArrowUp') ? 1 : 0)
        - (down.has('KeyS') || down.has('ArrowDown') ? 1 : 0);
      const s = (down.has('KeyD') || down.has('ArrowRight') ? 1 : 0)
        - (down.has('KeyA') || down.has('ArrowLeft') ? 1 : 0);
      return { forward: f, strafe: s };
    },
  };
}
