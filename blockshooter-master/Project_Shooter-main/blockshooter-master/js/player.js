"use strict";

let myName = "player";

let spawnPoints = [
  { x: 100, y: 100, z: 300 },
  { x: 1200, y: 1000, z: 300 },
  { x: 2300, y: 300, z: 300 },
];

let myPos = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
let myView = { pitch: 0, yaw: 270, roll: 0 };
let myVelocity = { x: 0, y: 0, z: 0 };
let inputVelocity = { x: 0, y: 0, z: 0 };

const VIEW_DIST = 1000;
const MOVE_SPEED = 5;
const FIRE_RATE = 100;
const FOOTSTEP_INTERVAL = 400;
const JETPACK_SOUND_INTERVAL = 500;
const MAX_AMMO = 40;
const MAX_FUEL = 100;
const MAX_BLOCKS = 50;

let isCrouching = false;
let isJumping = false;
let spread = 1;
let isAiming = false;

let currentAmmo = MAX_AMMO;
let lastShotRand = 0;
let footstepCounter = 0;

let currentHealth = 100;
let currentArmor = 100;

let currentFuel = 0;
let currentBlocks = 0;

// ----- ДОПОЛНИТЕЛЬНЫЕ ПЕРЕМЕННЫЕ ДЛЯ ОПТИМИЗАЦИИ -----
let lastBgPct = -1;                 // для фона
let lastHUD = {};                   // кэш значений HUD
const hudEls = {                    // кэш DOM-элементов
  ammo: document.querySelector("#ammo"),
  health: document.querySelector("#health"),
  armor: document.querySelector("#armor"),
  crosshair: document.querySelector(".crosshair"),
  viewmodelAnim: document.querySelector("#viewmodel-animation"),
  viewmodel: document.querySelector("#viewmodel-animation .viewmodel"),
  aimBackdrop: document.querySelector(".aim-backdrop"),
  root: document.querySelector(":root"),
  powerupJetpack: document.querySelector("#powerup-badges .badge.jetpack"),
  powerupBricks: document.querySelector("#powerup-badges .badge.bricks"),
};
// ----------------------------------------------------

const getBlockPos = () => ({
  x: Math.round(myPos.x / BLOCK_SIZE),
  y: Math.round(myPos.y / BLOCK_SIZE),
  z: Math.round(myPos.z / BLOCK_SIZE),
});

const getStateData = () =>
  JSON.stringify({
    x: Math.round(myPos.x),
    y: Math.round(myPos.y),
    z: Math.round(myPos.z),
    yaw: Math.round(myView.yaw),
    move: {
      x: Math.round(inputVelocity.x),
      y: Math.round(inputVelocity.y),
      z: Math.round(inputVelocity.z),
    },
  });

const toRadians = (deg) => deg * (Math.PI / 180);

const getAudioVectors = () => {
  let pitch = toRadians(90 - myView.pitch);
  let yaw = toRadians(180 - myView.yaw);
  let roll = toRadians(myView.roll);

  let forward = {
    x: Math.cos(pitch) * Math.sin(yaw),
    y: Math.sin(pitch),
    z: Math.cos(pitch) * Math.cos(yaw),
  };

  let up = {
    x:
      -Math.cos(roll) * Math.sin(yaw) -
      Math.sin(roll) * Math.sin(pitch) * Math.cos(yaw),
    y: Math.sin(roll) * Math.cos(pitch),
    z:
      Math.cos(roll) * Math.cos(yaw) -
      Math.sin(roll) * Math.sin(pitch) * Math.sin(yaw),
  };

  return { forward, up };
};

const respawn = () => {
  const { p: point, y: yaw } =
    spawnPoints[Math.floor(Math.random() * spawnPoints.length)];

  currentHealth = 100;
  currentArmor = 100;
  myPos = point;
  myView = { pitch: 0, yaw: yaw, roll: 0 };

  sendToAll(getStateData());
};

document.addEventListener("DOMContentLoaded", () => {
  const dialog = document.querySelector("dialog");
  dialog.showModal();
  document.querySelector("dialog input").value =
    localStorage.getItem("@css3d/playerName") || "";

  document.querySelector("dialog form").addEventListener("submit", () => {
    myName = document.querySelector("dialog input").value;
    setMyName(myName);
    sendToAll(JSON.stringify({ playerName: myName }));
    localStorage.setItem("@css3d/playerName", myName);

    respawn();

    dialog.close();
    dialog.remove();
    scene.requestPointerLock();
  });

  document
    .querySelector(":root")
    .style.setProperty("--perspective", `${VIEW_DIST}px`);

  const viewport = document.querySelector("#viewport");
  const scene = document.querySelector("#scene");
  const viewmodelPos = document.querySelector("#viewmodel-position");

  // Функция обновления вида – теперь с кэшированием
  const updateView = () => {
    // Обновляем трансформации (всегда)
    viewport.style.transform = `translate3d(0, 0, ${VIEW_DIST}px) rotateX(${
      90 - myView.pitch
    }deg) rotateY(${myView.roll}deg) rotateZ(${180 - myView.yaw}deg)`;

    scene.style.transform = `translate3d(${-myPos.x - 0.5 * BLOCK_SIZE}px, ${
      -myPos.y - 0.5 * BLOCK_SIZE
    }px, ${-myPos.z - (isCrouching ? 0.3 : 0.5) * BLOCK_SIZE}px)`;

    // ----- ФОН – обновляем только при значительном изменении -----
    const bgPct = Math.min(100, Math.max(0, (100 * (90 + myView.pitch)) / 180));
    if (Math.abs(bgPct - lastBgPct) > 0.5) {
      document.body.style.background = `linear-gradient(0, lightgreen, lightblue ${bgPct}%)`;
      lastBgPct = bgPct;
    }
    // -------------------------------------------------------------

    viewmodelPos.style.transform = `translate3d(${
      myVelocity.x * Math.cos(toRadians(myView.yaw)) +
      myVelocity.y * Math.sin(toRadians(myView.yaw))
    }px, ${Math.max(
      -10,
      myVelocity.x * Math.sin(toRadians(myView.yaw)) +
        myVelocity.y * Math.cos(toRadians(myView.yaw)) +
        myVelocity.z -
        myView.pitch / (isAiming ? 24 : 2)
    )}px, ${isCrouching ? 40 : 0}px)`;

    // ----- СТРЕЛЬБА И ПРИЦЕЛ (обновляем всегда) -----
    spread =
      (1 /
        Math.max(
          Math.min(
            Math.sqrt(myVelocity.x ** 2 + myVelocity.y ** 2 + myVelocity.z ** 2),
            20
          ),
          1
        )) *
      (shooting && currentAmmo ? 0.5 + 0.5 * lastShotRand : 1);

    const crosshairScale = Math.min(1 / spread, 2);
    if (hudEls.crosshair) {
      hudEls.crosshair.style.transform = `scale(${crosshairScale})`;
    }

    // ----- HUD – обновляем только при изменении значений -----
    const newHUD = {
      ammo: currentAmmo,
      health: currentHealth,
      armor: currentArmor,
    };
    if (newHUD.ammo !== lastHUD.ammo) {
      if (hudEls.ammo) hudEls.ammo.textContent = newHUD.ammo;
      lastHUD.ammo = newHUD.ammo;
    }
    if (newHUD.health !== lastHUD.health) {
      if (hudEls.health) hudEls.health.textContent = newHUD.health;
      lastHUD.health = newHUD.health;
    }
    if (newHUD.armor !== lastHUD.armor) {
      if (hudEls.armor) hudEls.armor.textContent = newHUD.armor;
      lastHUD.armor = newHUD.armor;
    }

    // ----- ПАУЭР-АПЫ (обновляем только если есть) -----
    const jetpackBadge = hudEls.powerupJetpack;
    if (jetpackBadge) {
      const progress = currentFuel / MAX_FUEL;
      jetpackBadge.style.setProperty("--powerup-progress", progress);
      if (currentFuel < 0.1) jetpackBadge.remove();
    }
    const bricksBadge = hudEls.powerupBricks;
    if (bricksBadge) {
      const progress = currentBlocks / MAX_BLOCKS;
      bricksBadge.style.setProperty("--powerup-progress", progress);
      if (currentBlocks < 1) bricksBadge.remove();
    }
  };

  document.addEventListener("click", () => {
    if (dialog.open || document.pointerLockElement || chatActive) return;
    scene.requestPointerLock();
  });

  document.addEventListener("mousemove", (event) => {
    if (!document.pointerLockElement || chatActive) return;

    myView.pitch += event.movementY / (isAiming ? 14 : 2);
    myView.yaw += event.movementX / (isAiming ? 14 : 2);
    myView.yaw %= 360;
    if (myView.pitch > 90) myView.pitch = 90;
    if (myView.pitch < -90) myView.pitch = -90;

    updateView();
    const { forward, up } = getAudioVectors();
    Howler.pos(myPos.x, myPos.y, myPos.z + BLOCK_SIZE / 2);
    Howler.orientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);

    if (event.movementX) {
      sendToAll(getStateData());
    }
  });

  // ---- УПРАВЛЕНИЕ: проверяем, что не в чате и pointer lock активен ----
  let keys = {};
  document.addEventListener("keydown", (event) => {
    if (!document.pointerLockElement || chatActive) return;
    event.preventDefault();
    keys[event.key.toLowerCase()] = true;
  });

  document.addEventListener("keyup", (event) => {
    if (!document.pointerLockElement) return;
    if (chatActive) {
      keys = {};
      return;
    }
    event.preventDefault();
    keys[event.key.toLowerCase()] = false;
  });
  // ----------------------------------------------------------------

  let shooting = false;
  document.addEventListener("mousedown", (event) => {
    if (!document.pointerLockElement || chatActive) return;

    if (event.button === 0) {
      const highlight = document.querySelector(".highlight");
      if (keys["e"] && !shooting && highlight) {
        const faceId = highlight.id.slice(1);
        blockMap[faceId] = "red";
        highlight.classList.remove("highlight");
        highlight.style.backgroundColor = "red";
        currentBlocks--;
        playSound("bricks_use");
        sendToAll(
          JSON.stringify({
            addBlock: faceId,
          })
        );
        return;
      }

      shooting = true;
      if (currentAmmo) {
        if (hudEls.viewmodelAnim) hudEls.viewmodelAnim.classList.add("active");
      }
      return;
    }

    if (event.button === 2) {
      isAiming = true;
      if (hudEls.viewmodel) hudEls.viewmodel.classList.add("aim-down-sights");
      if (hudEls.aimBackdrop) hudEls.aimBackdrop.classList.add("active");
      if (hudEls.root)
        hudEls.root.style.setProperty("--perspective", `${VIEW_DIST}px`);
    }
  });

  document.addEventListener("mouseup", (event) => {
    if (!document.pointerLockElement) return;

    if (event.button === 0) {
      shooting = false;
      if (hudEls.viewmodelAnim) hudEls.viewmodelAnim.classList.remove("active");
      if (currentAmmo !== 0) {
        playSound("shell");
      }
    }

    if (event.button === 2) {
      isAiming = false;
      if (hudEls.viewmodel) hudEls.viewmodel.classList.remove("aim-down-sights");
      if (hudEls.aimBackdrop) hudEls.aimBackdrop.classList.remove("active");
      if (hudEls.root)
        hudEls.root.style.setProperty("--perspective", `${VIEW_DIST}px`);
    }
  });

  let lastFrame = Date.now();
  let lastFireFrame = Date.now();
  let lastStepFrame = Date.now();
  let lastJetpackFrame = Date.now();
  const gameLoop = () => {
    const now = Date.now();
    const delta = now - lastFrame;
    const fps = 1000 / delta;
    lastFrame = now;
    document.querySelector("#fps").textContent = Math.round(fps);

    const stateBefore = getStateData();

    const angle = (myView.yaw * Math.PI) / 180;
    const worldPos = getBlockPos();

    const powerupId = makeBlockKey(worldPos.x, worldPos.y, worldPos.z, undefined);
    const powerType = powerupData[powerupId];
    if (powerType) {
      collectPowerup(powerupId, powerType);
    }

    const v = {
      x: (keys["a"] ?? false) - (keys["d"] ?? false),
      y: (keys["s"] ?? false) - (keys["w"] ?? false),
      z: keys[" "] ?? false,
    };

    isCrouching = keys["shift"];

    if (v.x && v.y) {
      v.x *= 0.7071067811865475;
      v.y *= 0.7071067811865475;
    }

    const getSpeed = () => {
      if (isJumping) return MOVE_SPEED;
      if (isCrouching && isAiming) return MOVE_SPEED * 0.1;
      if (isCrouching) return MOVE_SPEED * 0.2;
      if (isAiming) return MOVE_SPEED * 0.5;
      return MOVE_SPEED;
    };

    v.x *= getSpeed();
    v.y *= getSpeed();
    v.z *= MOVE_SPEED * 2;

    inputVelocity = { ...v };

    myVelocity.x += v.x * Math.cos(angle) + v.y * Math.sin(angle);
    myVelocity.y += v.x * Math.sin(angle) - v.y * Math.cos(angle);
    if (v.z && !isJumping) {
      isJumping = true;
      myVelocity.z += v.z;
    }

    // ceiling collision
    if (
      0 < myVelocity.z &&
      blockMap[makeBlockKey(worldPos.x, worldPos.y, worldPos.z + 1, "z")]
    ) {
      myVelocity.z = 0;
    }

    // side collisions
    if (
      0 < myVelocity.x &&
      blockMap[makeBlockKey(worldPos.x + 1, worldPos.y, worldPos.z, "x")]
    ) {
      myVelocity.x = 0;
    }
    if (
      myVelocity.x < 0 &&
      blockMap[makeBlockKey(worldPos.x, worldPos.y, worldPos.z, "x")]
    ) {
      myVelocity.x = 0;
    }
    if (
      0 < myVelocity.y &&
      blockMap[makeBlockKey(worldPos.x, worldPos.y + 1, worldPos.z, "y")]
    ) {
      myVelocity.y = 0;
    }
    if (
      myVelocity.y < 0 &&
      blockMap[makeBlockKey(worldPos.x, worldPos.y, worldPos.z, "y")]
    ) {
      myVelocity.y = 0;
    }

    myPos.x += myVelocity.x;
    myPos.y += myVelocity.y;
    myPos.z += myVelocity.z;

    myVelocity.x *= 0.7;
    myVelocity.y *= 0.7;

    // gravity
    if (!blockMap[makeBlockKey(worldPos.x, worldPos.y, worldPos.z, "z")]) {
      if (keys[" "] && currentFuel) {
        currentFuel -= 0.5;
        currentFuel = Math.max(0, currentFuel);
        if (JETPACK_SOUND_INTERVAL <= Date.now() - lastJetpackFrame) {
          lastJetpackFrame = Date.now();
          playSound("jetpack_use");
        }
      } else {
        myVelocity.z -= 1;
      }
    } else {
      if (myVelocity.z < 0) {
        myPos.z = worldPos.z * BLOCK_SIZE;
        playSound("step", footstepCounter++ % 2 === 0 ? "a" : "b");
      }
      myVelocity.z = 0;
      isJumping = false;
    }

    myPos.x = Math.max(0, Math.min((WORLD_SIZE - 1) * BLOCK_SIZE, myPos.x));
    myPos.y = Math.max(0, Math.min((WORLD_SIZE - 1) * BLOCK_SIZE, myPos.y));
    myPos.z = Math.max(-5, Math.min((WORLD_SIZE - 1) * BLOCK_SIZE, myPos.z));

    Howler.pos(myPos.x, myPos.y, myPos.z);

    myView.roll *= 0.9;

    if (FIRE_RATE <= Date.now() - lastFireFrame) {
      lastFireFrame = Date.now();

      if (shooting && currentAmmo) {
        lastShotRand = Math.random();

        myView.yaw += (Math.random() - 0.5) * (isAiming || isCrouching ? 1 : 3);
        myView.pitch += (Math.random() - 0.5) * (isAiming || isCrouching ? 1 : 3);
        myView.roll += (Math.random() - 0.5) * (isAiming || isCrouching ? 1 : 3);

        const target = document
          .elementsFromPoint(
            window.innerWidth / 2 + (Math.random() * 6 - 3),
            window.innerHeight / 2 + (Math.random() * 6 - 3)
          )
          .filter(
            (el) =>
              el.classList.contains("face") ||
              el.parentElement?.parentElement?.classList?.contains("player") ||
              el.parentElement?.parentElement?.parentElement?.classList?.contains(
                "player"
              )
          )
          .map((el) => {
            const playerId =
              el.parentElement?.parentElement?.id ||
              el.parentElement?.parentElement?.parentElement?.id;
            const ppos = remotePositions[playerId];
            if (ppos) {
              const dx = ppos.x - myPos.x;
              const dy = ppos.y - myPos.y;
              const dz = ppos.z - myPos.z;
              const dist2 = dx * dx + dy * dy + dz * dz;
              const dist = Math.sqrt(dist2);
              const v = { x: dx / dist, y: dy / dist, z: dz / dist };
              let damage = 10;
              const part = el.parentElement.classList.item(0);
              switch (part) {
                case "head":
                  damage = 60;
                  break;
                case "torso":
                  damage = 60;
                  break;
                case "right-arm-upper":
                case "left-arm-upper":
                  damage = 40;
                  break;
                case "right-arm-lower":
                case "left-arm-lower":
                  damage = 20;
                  break;
                case "right-leg-upper":
                case "left-leg-upper":
                  damage = 30;
                  break;
                case "right-leg-lower":
                case "left-leg-lower":
                  damage = 20;
                  break;
              }
              return { playerId, dist2, damage, v };
            }

            const face = parseBlockKey(el.id.slice(1));
            if (face) {
              const dx = worldPos.x - face.x;
              const dy = worldPos.y - face.y;
              const dz = worldPos.z - face.z;
              const dist2 = dx * dx + dy * dy + dz * dz;
              return { el, dist2 };
            }
            return undefined;
          })
          .sort((a, b) => a?.dist2 - b?.dist2)[0];

        if (target?.el) {
          const damage = (+target.el.getAttribute("damage") || 0) + 1;
          target.el.setAttribute("damage", damage);
          target.el.style.setProperty("--grid-size", 100 / (damage * 2) + "%");
          const coords = parseBlockKey(target.el.id.slice(1));
          playSoundAt(
            "wall_hit",
            undefined,
            {
              x: Number.parseInt(coords.x) * BLOCK_SIZE,
              y: Number.parseInt(coords.y) * BLOCK_SIZE,
              z: Number.parseInt(coords.z) * BLOCK_SIZE,
            }
          );
          if (10 < damage) {
            blockMap[target.el.id.slice(1)] = undefined;
            target.el.parentElement.remove();
            sendToAll(
              JSON.stringify({
                removeBlock: target.el.id.slice(1),
              })
            );
          } else {
            sendToAll(
              JSON.stringify({
                damageBlockId: target.el.id.slice(1),
                damageBlock: damage,
              })
            );
          }
        }

        if (target?.playerId) {
          sendTo(
            target.playerId,
            JSON.stringify({
              damage: target.damage,
              v: target.v,
            })
          );
          addScore(target.damage);
        }

        if (!activePowerupEffects["ammo"]) {
          currentAmmo--;
        }

        playSound("shot");

        if (currentAmmo === 0) {
          playSound("shell");
          if (hudEls.viewmodelAnim)
            hudEls.viewmodelAnim.classList.remove("active");
        }
      } else if (shooting) {
        playSound("empty", "empty");
      }

      if (!shooting && currentAmmo < MAX_AMMO && Math.random() < 0.2) {
        currentAmmo++;
      }
    }

    if (FOOTSTEP_INTERVAL <= Date.now() - lastStepFrame) {
      lastStepFrame = Date.now();
      if ((Math.round(myVelocity.x) || Math.round(myVelocity.y)) && !myVelocity.z) {
        playSound("step", footstepCounter++ % 2 === 0 ? "a" : "b");
      }
    }

    document.querySelector(".highlight")?.parentElement?.remove();
    if (keys["e"] && 0 < currentBlocks) {
      const target = document
        .elementsFromPoint(
          window.innerWidth / 2 + (Math.random() * 6 - 3),
          window.innerHeight / 2 + (Math.random() * 6 - 3)
        )
        .filter((el) => el.classList.contains("face"))
        .map((el) => {
          const face = parseBlockKey(el.id.slice(1));
          if (face) {
            const dx = worldPos.x - face.x;
            const dy = worldPos.y - face.y;
            const dz = worldPos.z - face.z;
            const dist2 = dx * dx + dy * dy + dz * dz;
            if (9 < dist2) return undefined;
            return { el, dist2 };
          }
          return undefined;
        })
        .sort((a, b) => a?.dist2 - b?.dist2)[0];

      if (target?.el) {
        const face = parseBlockKey(target.el.id.slice(1));
        const axis =
          face.face !== "z" ? "z" : Math.round(myView.yaw / 30) % 2 ? "x" : "y";

        let newFaceKey = makeBlockKey(face.x, face.y, face.z, axis);
        if (!blockMap[newFaceKey]) {
          drawBlock(newFaceKey);
          document.querySelector(`#k${newFaceKey}`)?.classList?.add("highlight");
        } else {
          const possibleKeys = [];
          const axisList = ["x", "y", "z"];
          axisList.splice(axisList.indexOf(axis), 1);
          axisList.unshift(axis);
          for (const ax of axisList) {
            const axisList2 = ["x", "y", "z"];
            axisList2.splice(axisList2.indexOf(ax), 1);
            axisList2.unshift(ax);
            for (const a2 of axisList2) {
              for (let i = -1; i <= 1; i += 2) {
                const delta = {
                  ...face,
                  axis: ax,
                  [a2]: Number.parseInt(face[a2]) + i,
                };
                if (delta[a2] < 0 || WORLD_SIZE <= delta[a2]) continue;
                const candidate = makeBlockKey(delta.x, delta.y, delta.z, delta.axis);
                possibleKeys.push(candidate);
              }
            }
          }
          for (const candidate of possibleKeys) {
            if (!blockMap[candidate]) {
              drawBlock(candidate);
              document.querySelector(`#k${candidate}`)?.classList?.add("highlight");
              break;
            }
          }
        }
      }
    }

    updateView();

    const stateNow = getStateData();
    if (stateBefore !== stateNow) {
      sendToAll(stateNow);
    }

    window.requestAnimationFrame(gameLoop);
  };

  window.requestAnimationFrame(gameLoop);

  onPeerData((peer, data) => {
    const { damage, v } = data;
    if (activePowerupEffects["health"]) return;
    if (damage) {
      currentHealth -= damage * (currentArmor ? 0.5 : 1);
      currentArmor -= damage * 0.5;
      playSound("hurt");
      if (currentHealth <= 0) {
        respawn();
        handleDeath(peer);
      }
      if (currentArmor < 0) {
        currentHealth += currentArmor;
        currentArmor = 0;
      }
      myVelocity.x += v.x * 10;
      myVelocity.y += v.y * 10;
      myVelocity.z += v.z * 10;
    }
  });
});