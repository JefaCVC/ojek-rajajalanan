// OJEK! King of the Streets — time of day, sun and weather. One game day lasts
// DAY_LENGTH seconds. The sun, sky, fog and street lights all follow the
// hour; weather rolls on its own timer and changes fares, grip and fog.

import * as THREE from 'three';
import { DAY_LENGTH, WEATHER, shiftAt } from './config.js';
import { worldRandom as rng } from './random.js';

const SKY_DAY = new THREE.Color(0x87b5e0);
const SKY_DUSK = new THREE.Color(0xe8935a);
const SKY_NIGHT = new THREE.Color(0x0e1626);
const FOG_DAY = new THREE.Color(0xa8c4d8);
const FOG_NIGHT = new THREE.Color(0x0e1626);
const SUN_DAY = new THREE.Color(0xfff2d8);
const SUN_DUSK = new THREE.Color(0xff9a4a);

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function createDayCycle(scene) {
  const sun = new THREE.DirectionalLight(0xfff2d8, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -160;
  sun.shadow.camera.right = 160;
  sun.shadow.camera.top = 160;
  sun.shadow.camera.bottom = -160;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 500;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);
  const hemi = new THREE.HemisphereLight(0xbfd8ee, 0x8a7a5c, 0.9);
  scene.add(hemi);
  const amb = new THREE.AmbientLight(0xffffff, 0.25);
  scene.add(amb);

  let hour = 8.0;
  let weather = 'clear';
  let weatherTimer = rng.range(50, 90);
  let nightFactor = 0;
  let rainAmount = 0;

  function update(dt, focus) {
    hour = (hour + (dt * 24) / DAY_LENGTH) % 24;
    weatherTimer -= dt;
    if (weatherTimer <= 0) {
      const roll = rng.next();
      weather = roll < 0.5 ? 'clear' : roll < 0.78 ? 'cloudy' : 'rain';
      weatherTimer = rng.range(55, 110);
    }
    const targetRain = weather === 'rain' ? 1 : weather === 'cloudy' ? 0.15 : 0;
    rainAmount += (targetRain - rainAmount) * Math.min(1, dt * 0.5);

    // Sun angle: sunrise 6h, noon 12h, sunset 18h.
    const dayT = (hour - 6) / 12;
    const sunAngle = dayT * Math.PI;
    const sunHeight = Math.sin(sunAngle);
    const isDay = sunHeight > -0.08;
    nightFactor = smoothstep(0.12, -0.12, sunHeight);
    const duskFactor = (1 - Math.abs(sunHeight)) * (isDay ? 1 : 0.4);

    const sky = new THREE.Color().copy(SKY_DAY).lerp(SKY_DUSK, duskFactor * 0.8).lerp(SKY_NIGHT, nightFactor);
    scene.background = sky;
    const fogColor = new THREE.Color().copy(FOG_DAY).lerp(FOG_NIGHT, nightFactor);
    const fogNear = 90 - WEATHER[weather].fog * 45;
    const fogFar = 420 - WEATHER[weather].fog * 260;
    scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);

    const sunDist = 220;
    sun.position.set(
      focus.x + Math.cos(sunAngle) * sunDist,
      Math.max(20, sunHeight * sunDist + 30),
      focus.z + 60,
    );
    sun.target.position.set(focus.x, 0, focus.z);
    sun.color.copy(SUN_DAY).lerp(SUN_DUSK, duskFactor);
    sun.intensity = isDay ? 2.0 - duskFactor * 0.8 : 0.12;
    hemi.intensity = 0.9 - nightFactor * 0.55;
    amb.intensity = 0.25 - nightFactor * 0.1;
  }

  return {
    update,
    get hour() { return hour; },
    setHour(h) { hour = ((h % 24) + 24) % 24; },
    get weather() { return weather; },
    setWeather(w) { if (WEATHER[w]) { weather = w; weatherTimer = 120; } },
    get weatherInfo() { return WEATHER[weather]; },
    get rainAmount() { return rainAmount; },
    get nightFactor() { return nightFactor; },
    get isNight() { return nightFactor > 0.6; },
    get shift() { return shiftAt(hour); },
    get sun() { return sun; },
  };
}
