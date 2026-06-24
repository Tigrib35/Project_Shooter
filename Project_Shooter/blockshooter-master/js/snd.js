"use strict";

const audioPanner = {
  panningModel: "HRTF",
  refDistance: BLOCK_SIZE,
  maxDistance: BLOCK_SIZE * 15,
  rolloffFactor: 1,
  distanceModel: "inverse",
};

const soundEffects = {
  shot: () =>
    new Howl({
      src: ["./assets/shot.mp3"],
      preload: true,
    }),

  shell: () =>
    new Howl({
      src: ["./assets/shell.mp3"],
      preload: true,
    }),

  empty: () =>
    new Howl({
      src: ["./assets/empty.mp3"],
      preload: true,
      sprite: {
        empty: [0, 200],
      },
    }),

  step: () =>
    new Howl({
      src: ["./assets/step.mp3"],
      preload: true,
      sprite: {
        a: [0, 200],
        b: [600, 200],
      },
    }),

  hurt: () =>
    new Howl({
      src: ["./assets/damage.mp3"],
      preload: true,
    }),

  ammo: () =>
    new Howl({
      src: ["./assets/ammo.mp3"],
      preload: true,
    }),

  bricks: () =>
    new Howl({
      src: ["./assets/bricks.mp3"],
      preload: true,
    }),

  jetpack: () =>
    new Howl({
      src: ["./assets/jetpack.mp3"],
      preload: true,
    }),

  health: () =>
    new Howl({
      src: ["./assets/health.mp3"],
      preload: true,
    }),

  bricks_use: () =>
    new Howl({
      src: ["./assets/bricks_use.mp3"],
      preload: true,
    }),

  jetpack_use: () =>
    new Howl({
      src: ["./assets/jetpack_use.mp3"],
      preload: true,
    }),

  wall_hit: () =>
    new Howl({
      src: ["./assets/wall_hit.mp3"],
      preload: true,
    }),
};

const playSound = (sound, id) => {
  soundEffects[sound]().play(id);
  sendToAll(JSON.stringify({ sound, id, coords: myPos }));
};

const playSoundAt = (sound, id, coords) => {
  const s = soundEffects[sound]();
  s.pos(coords.x, coords.y, coords.z);
  s.orientation(1, 1, 1);
  s.pannerAttr(audioPanner);
  s.play(id);
  sendToAll(JSON.stringify({ sound, id, coords }));
};

onPeerData((peer, data) => {
  const { sound, id, coords } = data;
  if (!sound) return;
  const s = soundEffects[sound]();
  s.pos(coords.x, coords.y, coords.z);
  s.orientation(1, 1, 1);
  s.pannerAttr(audioPanner);
  s.play(id);
});