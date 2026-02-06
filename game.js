import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { PointerLockControls } from "https://unpkg.com/three@0.160.0/examples/jsm/controls/PointerLockControls.js";

const boot = document.getElementById("boot");
const startButton = document.getElementById("start");
const ammoCount = document.getElementById("ammo-count");
const scoreEl = document.getElementById("score");
const healthBar = document.getElementById("health-bar");
const staminaBar = document.getElementById("stamina-bar");
const focusBar = document.getElementById("focus-bar");
const statusEl = document.getElementById("status");
const timeEl = document.getElementById("time");
const hitMarker = document.getElementById("hit-marker");
const minimap = document.getElementById("minimap");
const visorOverlay = document.getElementById("visor-overlay");

const minimapCtx = minimap.getContext("2d");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x030509);
scene.fog = new THREE.Fog(0x030509, 15, 120);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
const controls = new PointerLockControls(camera, document.body);

const player = controls.getObject();
player.position.set(0, 2, 8);
scene.add(player);

const clock = new THREE.Clock();

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  sprint: false,
  crouch: false,
};

const playerState = {
  velocity: new THREE.Vector3(),
  direction: new THREE.Vector3(),
  canJump: false,
  health: 100,
  stamina: 100,
  focus: 100,
  ammo: 30,
  reserve: 90,
  score: 0,
  visor: true,
  focusActive: false,
  lastShot: 0,
};

const audio = {
  context: null,
  master: null,
  enabled: false,
};

const texture = new THREE.CanvasTexture(createGridTexture());
texture.wrapS = THREE.RepeatWrapping;
texture.wrapT = THREE.RepeatWrapping;
texture.repeat.set(8, 8);

const floorMaterial = new THREE.MeshStandardMaterial({
  map: texture,
  roughness: 0.6,
  metalness: 0.2,
});

const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const ambient = new THREE.HemisphereLight(0x8bc4ff, 0x05060a, 0.5);
scene.add(ambient);

const keyLight = new THREE.DirectionalLight(0x8bd0ff, 1.1);
keyLight.position.set(12, 25, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -40;
keyLight.shadow.camera.right = 40;
keyLight.shadow.camera.top = 40;
keyLight.shadow.camera.bottom = -40;
scene.add(keyLight);

const rimLight = new THREE.PointLight(0x3aa5ff, 2.5, 60, 2);
rimLight.position.set(-18, 8, -12);
scene.add(rimLight);

const structures = createStructures();
structures.forEach((mesh) => scene.add(mesh));

const targets = createTargets();
const drones = createDrones();

const weapon = createWeapon();
player.add(weapon);

const raycaster = new THREE.Raycaster();

let startedAt = null;

function createGridTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#0b1420";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#11243b";
  ctx.lineWidth = 4;

  for (let i = 0; i < 8; i += 1) {
    for (let j = 0; j < 8; j += 1) {
      if ((i + j) % 2 === 0) {
        ctx.fillStyle = "#0f1b2d";
      } else {
        ctx.fillStyle = "#0b1420";
      }
      ctx.fillRect(i * 32, j * 32, 32, 32);
    }
  }

  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

function createStructures() {
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0x1a2838, metalness: 0.3, roughness: 0.7 }),
    new THREE.MeshStandardMaterial({ color: 0x10141f, metalness: 0.2, roughness: 0.8 }),
  ];

  const meshes = [];
  const boxGeo = new THREE.BoxGeometry(6, 4, 6);
  const tallGeo = new THREE.BoxGeometry(4, 8, 4);

  for (let i = 0; i < 10; i += 1) {
    const mesh = new THREE.Mesh(boxGeo, materials[i % materials.length]);
    mesh.position.set((Math.random() - 0.5) * 80, 2, (Math.random() - 0.5) * 80);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    meshes.push(mesh);
  }

  for (let i = 0; i < 6; i += 1) {
    const mesh = new THREE.Mesh(tallGeo, materials[(i + 1) % materials.length]);
    mesh.position.set((Math.random() - 0.5) * 70, 4, (Math.random() - 0.5) * 70);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    meshes.push(mesh);
  }

  const arenaWalls = new THREE.Mesh(
    new THREE.BoxGeometry(130, 12, 130),
    new THREE.MeshStandardMaterial({ color: 0x0a0f18, roughness: 0.9, metalness: 0.1, transparent: true, opacity: 0.2 })
  );
  arenaWalls.position.set(0, 6, 0);
  arenaWalls.receiveShadow = true;
  meshes.push(arenaWalls);

  return meshes;
}

function createTargets() {
  const group = [];
  const targetGeo = new THREE.CylinderGeometry(1.2, 1.6, 2.4, 20);
  const ringGeo = new THREE.TorusGeometry(1.1, 0.18, 16, 32);

  for (let i = 0; i < 12; i += 1) {
    const base = new THREE.Mesh(
      targetGeo,
      new THREE.MeshStandardMaterial({ color: 0x1f2b3d, emissive: 0x111722, roughness: 0.6 })
    );
    base.castShadow = true;
    base.receiveShadow = true;
    base.position.set((Math.random() - 0.5) * 80, 1.2, (Math.random() - 0.5) * 80);

    const ring = new THREE.Mesh(
      ringGeo,
      new THREE.MeshStandardMaterial({ color: 0x4de3ff, emissive: 0x0b4d6e, roughness: 0.2 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 1.5;
    base.add(ring);

    base.userData = { type: "target", alive: true, cooldown: 0 };
    scene.add(base);
    group.push(base);
  }

  return group;
}

function createDrones() {
  const group = [];
  const droneGeo = new THREE.SphereGeometry(1.1, 22, 22);
  const glowMat = new THREE.MeshStandardMaterial({ color: 0x2b6cff, emissive: 0x1c3b8f, roughness: 0.35 });

  for (let i = 0; i < 4; i += 1) {
    const drone = new THREE.Mesh(droneGeo, glowMat);
    drone.position.set(10 + i * 6, 6, -18 + i * 8);
    drone.castShadow = true;
    drone.userData = { angle: Math.random() * Math.PI * 2, radius: 10 + i * 3 };
    scene.add(drone);
    group.push(drone);
  }

  return group;
}

function createWeapon() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.2, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x1a2433, roughness: 0.5, metalness: 0.4 })
  );
  body.position.set(0.4, -0.35, -0.8);

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.6, 12),
    new THREE.MeshStandardMaterial({ color: 0x3b4b63, roughness: 0.4, metalness: 0.5 })
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.4, -0.3, -1.2);

  const sight = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.08, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x556b84, roughness: 0.4, metalness: 0.4 })
  );
  sight.position.set(0.35, -0.15, -0.7);

  group.add(body, barrel, sight);
  group.position.set(0.25, -0.15, -0.2);
  return group;
}

function playShotSound() {
  if (!audio.enabled) {
    return;
  }

  const osc = audio.context.createOscillator();
  const gain = audio.context.createGain();
  osc.type = "triangle";
  osc.frequency.value = 180 + Math.random() * 80;
  gain.gain.value = 0.15;
  osc.connect(gain).connect(audio.master);
  osc.start();
  osc.stop(audio.context.currentTime + 0.08);
}

function initAudio() {
  if (audio.context) {
    return;
  }
  audio.context = new AudioContext();
  audio.master = audio.context.createGain();
  audio.master.gain.value = 0.6;
  audio.master.connect(audio.context.destination);
  audio.enabled = true;
}

function fireWeapon() {
  const now = performance.now();
  if (now - playerState.lastShot < 110) {
    return;
  }
  if (playerState.ammo <= 0) {
    statusEl.textContent = "Reload required";
    return;
  }

  playerState.lastShot = now;
  playerState.ammo -= 1;
  updateAmmo();
  statusEl.textContent = "Engaged";

  camera.rotation.x -= 0.02;
  camera.rotation.y += (Math.random() - 0.5) * 0.01;

  playShotSound();

  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const intersects = raycaster.intersectObjects(targets, false);
  if (intersects.length > 0) {
    const target = intersects[0].object;
    if (target.userData.alive) {
      target.userData.alive = false;
      target.userData.cooldown = 2.5;
      target.visible = false;
      playerState.score += 120;
      scoreEl.textContent = playerState.score.toString().padStart(5, "0");
      triggerHitMarker();
    }
  }
}

function triggerHitMarker() {
  hitMarker.style.opacity = "1";
  setTimeout(() => {
    hitMarker.style.opacity = "0";
  }, 120);
}

function updateAmmo() {
  ammoCount.textContent = playerState.ammo.toString();
}

function reloadWeapon() {
  const needed = 30 - playerState.ammo;
  if (needed === 0 || playerState.reserve === 0) {
    return;
  }
  const load = Math.min(needed, playerState.reserve);
  playerState.ammo += load;
  playerState.reserve -= load;
  updateAmmo();
  statusEl.textContent = "Reloaded";
}

function updateUI(delta) {
  healthBar.style.width = `${playerState.health}%`;
  staminaBar.style.width = `${playerState.stamina}%`;
  focusBar.style.width = `${playerState.focus}%`;

  if (startedAt) {
    const elapsed = Math.floor((performance.now() - startedAt) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, "0");
    const seconds = (elapsed % 60).toString().padStart(2, "0");
    timeEl.textContent = `${minutes}:${seconds}`;
  }

  if (playerState.health <= 0) {
    statusEl.textContent = "Respawning";
    playerState.health = 100;
    playerState.stamina = 100;
    player.position.set(0, 2, 8);
  }

  if (playerState.focusActive) {
    playerState.focus = Math.max(0, playerState.focus - delta * 18);
    if (playerState.focus === 0) {
      playerState.focusActive = false;
    }
  } else {
    playerState.focus = Math.min(100, playerState.focus + delta * 12);
  }
}

function updateMovement(delta) {
  playerState.direction.set(0, 0, 0);

  if (keys.forward) {
    playerState.direction.z -= 1;
  }
  if (keys.backward) {
    playerState.direction.z += 1;
  }
  if (keys.left) {
    playerState.direction.x -= 1;
  }
  if (keys.right) {
    playerState.direction.x += 1;
  }

  playerState.direction.normalize();

  const sprinting = keys.sprint && playerState.stamina > 5 && !keys.crouch;
  const crouching = keys.crouch;
  const baseSpeed = crouching ? 6 : sprinting ? 14 : 9;

  if (sprinting) {
    playerState.stamina = Math.max(0, playerState.stamina - delta * 20);
  } else {
    playerState.stamina = Math.min(100, playerState.stamina + delta * 12);
  }

  if (keys.forward || keys.backward || keys.left || keys.right) {
    playerState.velocity.x -= playerState.direction.x * baseSpeed * delta;
    playerState.velocity.z -= playerState.direction.z * baseSpeed * delta;
  }

  playerState.velocity.y -= 30 * delta;

  const moveX = playerState.velocity.x * delta;
  const moveZ = playerState.velocity.z * delta;

  controls.moveRight(-moveX);
  controls.moveForward(-moveZ);

  player.position.y += playerState.velocity.y * delta;

  if (player.position.y < (crouching ? 1.2 : 2)) {
    playerState.velocity.y = 0;
    player.position.y = crouching ? 1.2 : 2;
    playerState.canJump = true;
  }

  playerState.velocity.x -= playerState.velocity.x * 10.0 * delta;
  playerState.velocity.z -= playerState.velocity.z * 10.0 * delta;

  const maxDistance = 60;
  player.position.x = THREE.MathUtils.clamp(player.position.x, -maxDistance, maxDistance);
  player.position.z = THREE.MathUtils.clamp(player.position.z, -maxDistance, maxDistance);
}

function updateTargets(delta) {
  targets.forEach((target) => {
    if (!target.userData.alive) {
      target.userData.cooldown -= delta;
      if (target.userData.cooldown <= 0) {
        target.userData.alive = true;
        target.visible = true;
      }
    }
  });
}

function updateDrones(delta) {
  drones.forEach((drone, index) => {
    drone.userData.angle += delta * (0.4 + index * 0.1);
    const radius = drone.userData.radius;
    drone.position.x = Math.cos(drone.userData.angle) * radius;
    drone.position.z = Math.sin(drone.userData.angle) * radius;
    drone.position.y = 5 + Math.sin(drone.userData.angle * 2) * 1.5;

    const distance = drone.position.distanceTo(player.position);
    if (distance < 6) {
      playerState.health = Math.max(0, playerState.health - delta * 15);
    }
  });
}

function updateWeaponSway(delta) {
  const swayAmount = keys.sprint ? 0.05 : 0.02;
  const time = performance.now() * 0.002;
  weapon.position.x = 0.25 + Math.sin(time) * swayAmount;
  weapon.position.y = -0.15 + Math.cos(time * 1.3) * swayAmount;

  if (playerState.focusActive) {
    weapon.position.z = -0.45;
  } else {
    weapon.position.z = -0.2;
  }

  const desiredFov = playerState.focusActive ? 62 : 75;
  camera.fov = THREE.MathUtils.lerp(camera.fov, desiredFov, delta * 8);
  camera.updateProjectionMatrix();
}

function updateMinimap() {
  const size = minimap.width;
  minimapCtx.clearRect(0, 0, size, size);

  minimapCtx.fillStyle = "rgba(6, 14, 25, 0.85)";
  minimapCtx.fillRect(0, 0, size, size);

  minimapCtx.strokeStyle = "rgba(118, 203, 255, 0.25)";
  minimapCtx.strokeRect(8, 8, size - 16, size - 16);

  const scale = 1.2;
  const center = size / 2;

  const drawPoint = (x, z, color, radius = 4) => {
    minimapCtx.fillStyle = color;
    minimapCtx.beginPath();
    minimapCtx.arc(center + x * scale, center + z * scale, radius, 0, Math.PI * 2);
    minimapCtx.fill();
  };

  targets.forEach((target) => {
    if (target.userData.alive) {
      drawPoint(target.position.x, target.position.z, "rgba(77, 227, 255, 0.85)", 3);
    }
  });

  drones.forEach((drone) => {
    drawPoint(drone.position.x, drone.position.z, "rgba(255, 100, 140, 0.9)", 3);
  });

  drawPoint(player.position.x, player.position.z, "#ffffff", 4);
}

function animate() {
  const delta = clock.getDelta();
  updateMovement(delta);
  updateTargets(delta);
  updateDrones(delta);
  updateWeaponSway(delta);
  updateUI(delta);
  updateMinimap();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function handleKey(event, isDown) {
  switch (event.code) {
    case "KeyW":
      keys.forward = isDown;
      break;
    case "KeyS":
      keys.backward = isDown;
      break;
    case "KeyA":
      keys.left = isDown;
      break;
    case "KeyD":
      keys.right = isDown;
      break;
    case "ShiftLeft":
      keys.sprint = isDown;
      break;
    case "KeyC":
      keys.crouch = isDown;
      break;
    case "Space":
      if (isDown && playerState.canJump) {
        playerState.velocity.y += 12;
        playerState.canJump = false;
      }
      break;
    case "KeyR":
      if (isDown) {
        reloadWeapon();
      }
      break;
    case "KeyV":
      if (isDown) {
        playerState.visor = !playerState.visor;
        visorOverlay.classList.toggle("visor-off", !playerState.visor);
      }
      break;
    case "KeyF":
      if (isDown && playerState.focus > 20) {
        playerState.focusActive = true;
      }
      if (!isDown) {
        playerState.focusActive = false;
      }
      break;
    default:
      break;
  }
}

function registerEvents() {
  document.addEventListener("keydown", (event) => handleKey(event, true));
  document.addEventListener("keyup", (event) => handleKey(event, false));

  document.addEventListener("mousedown", () => {
    if (!controls.isLocked) {
      return;
    }
    fireWeapon();
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

startButton.addEventListener("click", () => {
  boot.classList.add("hidden");
  initAudio();
  controls.lock();
  startedAt = performance.now();
});

controls.addEventListener("lock", () => {
  statusEl.textContent = "Simulation live";
});

controls.addEventListener("unlock", () => {
  statusEl.textContent = "Paused";
  boot.classList.remove("hidden");
});

registerEvents();
updateAmmo();
animate();
