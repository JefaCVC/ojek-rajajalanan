// OJEK! King of the Streets — third-person chase camera. It trails behind the
// player, pulls back and widens its view with speed, lets the mouse orbit it,
// and slides in when a building would block the shot. Trauma-based shake
// sells crashes and punches without ever fighting the player.

import * as THREE from 'three';

export function createCamera(camera, city) {
  let yawOffset = 0;
  let pitchOffset = 0;
  let distance = 7;
  let trauma = 0;
  let fov = 62;
  const desired = new THREE.Vector3();
  const lookAt = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  function pointInCollider(x, z) {
    for (const c of city.colliders) {
      if (x > c.minX - 0.4 && x < c.maxX + 0.4 && z > c.minZ - 0.4 && z < c.maxZ + 0.4) return true;
    }
    return false;
  }

  return {
    addTrauma(amount) { trauma = Math.min(1, trauma + amount); },
    setDistance(d) { distance = d; },
    update(dt, target, heading, speedKmh, orbit, wheel) {
      yawOffset += orbit.x * 0.004;
      pitchOffset = THREE.MathUtils.clamp(pitchOffset + orbit.y * 0.002, -0.25, 0.45);
      // The orbit eases back to straight behind the player when untouched.
      if (Math.abs(orbit.x) < 0.01) yawOffset *= Math.max(0, 1 - dt * 1.2);
      if (Math.abs(orbit.y) < 0.01) pitchOffset *= Math.max(0, 1 - dt * 1.2);
      if (wheel !== 0) distance = THREE.MathUtils.clamp(distance + wheel * 0.003, 6, 14);

      const speedFactor = Math.min(1, speedKmh / 160);
      const dist = distance + speedFactor * 4;
      const height = 2.7 + speedFactor * 1.1 - pitchOffset * 4;
      const yaw = heading + Math.PI + yawOffset;
      desired.set(
        target.x + Math.sin(yaw) * dist,
        target.y + height,
        target.z + Math.cos(yaw) * dist,
      );
      // Slide in along the line if a building stands between camera and player.
      for (let t = 1; t > 0.25; t -= 0.08) {
        tmp.lerpVectors(target, desired, t);
        if (!pointInCollider(tmp.x, tmp.z) || tmp.y > 8) {
          desired.copy(tmp);
          break;
        }
      }
      if (desired.y < 1.6) desired.y = 1.6;

      trauma = Math.max(0, trauma - dt * 1.6);
      const shake = trauma * trauma;
      const shakeX = (Math.random() * 2 - 1) * shake * 0.5;
      const shakeY = (Math.random() * 2 - 1) * shake * 0.4;

      // Far behind (teleport, respawn, slow frames): snap instead of chasing.
      if (camera.position.distanceTo(desired) > 14) camera.position.copy(desired);
      camera.position.lerp(desired, Math.min(1, dt * 6));
      camera.position.x += shakeX;
      camera.position.y += shakeY;
      lookAt.set(
        target.x + Math.sin(heading) * 3,
        target.y + 1.4,
        target.z + Math.cos(heading) * 3,
      );
      camera.lookAt(lookAt);
      const targetFov = 62 + speedFactor * 14;
      fov += (targetFov - fov) * Math.min(1, dt * 3);
      if (Math.abs(camera.fov - fov) > 0.1) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
    },
  };
}
