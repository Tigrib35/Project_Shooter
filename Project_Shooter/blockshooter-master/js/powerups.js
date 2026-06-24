"use strict";

const POWERUP_SPAWN_INTERVAL = 1_000;
const POWERUP_LIFETIME = 10_000;
const POWERUP_EFFECT_TIME = 10_000;
const POWERUP_SIZE = 10;
let lastPowerupSpawnTime = undefined;

const powerupData = {};
let collectPowerup;

const activePowerupEffects = {};

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector(":root");
  root.style.setProperty("--powerup-life", `${POWERUP_LIFETIME}ms`);
  root.style.setProperty("--powerup-size", `${POWERUP_SIZE}px`);
  root.style.setProperty("--powerup-effect-time", `${POWERUP_EFFECT_TIME}ms`);

  const effectTimers = {};

  const emojis = {
    ammo: "🔫",
    health: "❤️",
    jetpack: "🚀",
    bricks: "🧱",
  };

  const renderPowerup = (id, type) => {
    const { x, y, z } = parseBlockKey(id);

    const makeBox = () => {
      const box = document.createElement("div");
      box.classList.add("box");
      for (let i = 0; i < 6; i++) {
        const face = document.createElement("div");
        box.appendChild(face);
      }
      return box;
    };

    const scene = document.querySelector("#scene");

    const powerupEl = document.createElement("div");
    powerupEl.id = "k" + id;
    powerupEl.classList.add("powerup");
    powerupEl.classList.add(type);
    powerupEl.appendChild(makeBox());

    powerupEl.style.transform = `translate3d(${
      (+x + 0.5) * BLOCK_SIZE - POWERUP_SIZE / 2
    }px, ${(+y + 0.5) * BLOCK_SIZE - POWERUP_SIZE / 2}px, ${
      +z * BLOCK_SIZE + 10
    }px)`;
    scene.appendChild(powerupEl);
  };

  const spawnPowerup = (powerup) => {
    powerupData[powerup.id] = powerup.type;
    setTimeout(() => {
      despawnPowerup(powerup.id);
    }, POWERUP_LIFETIME);
    renderPowerup(powerup.id, powerup.type);
  };

  const despawnPowerup = (powerupId) => {
    if (!powerupData[powerupId]) return;
    delete powerupData[powerupId];
    document.querySelector("#k" + powerupId)?.remove();
  };

  collectPowerup = (powerupId, type) => {
    despawnPowerup(powerupId);
    sendToAll(
      JSON.stringify({
        powerupCollected: powerupId,
      })
    );
    addScore(10);

    clearTimeout(effectTimers[type]);
    effectTimers[type] = setTimeout(() => {
      activePowerupEffects[type] = false;
    }, POWERUP_EFFECT_TIME);

    activePowerupEffects[type] = true;

    if (type === "ammo") {
      currentAmmo = MAX_AMMO;
    }
    if (type === "health") {
      currentHealth = 100;
    }
    if (type === "jetpack") {
      currentFuel = MAX_FUEL;
    }
    if (type === "bricks") {
      currentBlocks = Math.min(MAX_BLOCKS, currentBlocks + 10);
    }

    const scanline = document.createElement("div");
    scanline.classList.add("powerup-scanline");
    scanline.classList.add(type);
    const text = document.createElement("div");
    text.classList.add("text");
    text.textContent = (() => {
      switch (type) {
        case "ammo":
          return `Restocked Ammo + Infinite Ammo for ${
            POWERUP_EFFECT_TIME / 1000
          }s`;
        case "health":
          return `Restored Health + Invulnerability for ${
            POWERUP_EFFECT_TIME / 1000
          }s`;
        case "jetpack":
          return "Jetpack refueled";
        case "bricks":
          return "Bricks picked up";
      }
    })();
    scanline.appendChild(text);
    document.body.appendChild(scanline);
    scanline.addEventListener("animationend", () => {
      scanline.remove();
    });

    document.querySelector(`#powerup-badges .badge.${type}`)?.remove?.();
    const badge = document.createElement("div");
    badge.classList.add("badge");
    badge.classList.add(type);
    if (type === "ammo" || type === "health") {
      badge.classList.add("timed");
    }
    badge.innerHTML = `<svg viewBox="0 0 800 800"><circle cx="400" cy="400" r="290" /></svg>${emojis[type]}`;
    badge.addEventListener("animationend", () => {
      badge.remove();
    });
    document.querySelector("#powerup-badges").appendChild(badge);

    playSound(type);
  };

  setInterval(() => {
    const now = Date.now();
    if (now < (lastPowerupSpawnTime || 0) + POWERUP_SPAWN_INTERVAL) return;
    lastPowerupSpawnTime = now;

    const blockKeys = Object.keys(blockMap);
    const available = blockKeys.filter((key) => powerupData[key] === undefined);
    const position = parseBlockKey(
      available[Math.floor(Math.random() * available.length)]
    );

    const powerup = {
      type: ["jetpack", "ammo", "health", "bricks"][
        Math.floor(Math.random() * 4)
      ],
      id: makeBlockKey(position.x, position.y, position.z, undefined),
    };

    spawnPowerup(powerup);
    sendToAll(
      JSON.stringify({
        newPowerup: powerup,
      })
    );
  }, 1000);

  onPeerData((peerId, data) => {
    const { newPowerup, powerupCollected } = data;

    if (newPowerup) {
      const now = Date.now();
      if ((lastPowerupSpawnTime || 0) + POWERUP_SPAWN_INTERVAL < now) return;
      lastPowerupSpawnTime = now;
      spawnPowerup(newPowerup);
    }

    if (powerupCollected) {
      despawnPowerup(powerupCollected);
    }
  });
});
