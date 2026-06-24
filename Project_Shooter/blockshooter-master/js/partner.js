"use strict";

const remotePlayers = {};
const remotePositions = {};

document.addEventListener("DOMContentLoaded", () => {
  const buildRemotePlayer = (id, x, y, z, yaw, move) => {
    const makeBox = (className) => {
      const box = document.createElement("div");
      box.classList.add(className);
      box.classList.add("box");
      for (let i = 0; i < 6; i++) {
        const face = document.createElement("div");
        box.appendChild(face);
      }
      return box;
    };

    const scene = document.querySelector("#scene");

    const player = document.createElement("div");
    player.id = id;
    player.classList.add("player");
    player.appendChild(makeBox("head"));
    player.appendChild(makeBox("torso"));

    const rightArm = document.createElement("div");
    rightArm.classList.add("right-arm");
    rightArm.appendChild(makeBox("right-arm-upper"));
    rightArm.appendChild(makeBox("right-arm-lower"));
    player.appendChild(rightArm);

    const leftArm = document.createElement("div");
    leftArm.classList.add("left-arm");
    leftArm.appendChild(makeBox("left-arm-upper"));
    leftArm.appendChild(makeBox("left-arm-lower"));
    player.appendChild(leftArm);

    const legs = document.createElement("div");
    legs.classList.add("legs");

    const rightLeg = document.createElement("div");
    rightLeg.classList.add("right-leg");
    rightLeg.appendChild(makeBox("right-leg-upper"));
    rightLeg.appendChild(makeBox("right-leg-lower"));
    legs.appendChild(rightLeg);

    const leftLeg = document.createElement("div");
    leftLeg.classList.add("left-leg");
    leftLeg.appendChild(makeBox("left-leg-upper"));
    leftLeg.appendChild(makeBox("left-leg-lower"));
    legs.appendChild(leftLeg);

    player.appendChild(legs);

    const gun = document.createElement("div");
    gun.classList.add("gun");
    gun.appendChild(makeBox("gun-body"));
    gun.appendChild(makeBox("gun-mag"));
    gun.appendChild(makeBox("gun-handle"));
    gun.appendChild(makeBox("gun-aim"));
    gun.appendChild(makeBox("gun-aim2"));
    player.appendChild(gun);

    player.style.transform = `translate3d(${x + 50}px, ${
      y + 50
    }px, ${z}px) rotateZ(${yaw - 90}deg)`;

    const dx = Math.abs(move?.x || 0);
    const dy = Math.abs(move?.y || 0);
    const moveAngle = Math.atan2(dx, dy);

    legs.style.transform = `rotateZ(${moveAngle}rad)`;

    scene.appendChild(player);
    return player;
  };

  onPeerData((peer, data) => {
    const { x, y, z, yaw, move } = data;

    const player = remotePlayers[peer];
    if (!player) {
      remotePlayers[peer] = buildRemotePlayer(peer, x, y, z, yaw);
    }

    remotePlayers[peer].style.transform = `translate3d(${x + 50}px, ${
      y + 50
    }px, ${z}px) rotateZ(${yaw - 90}deg)`;

    const dx = -(move?.x || 0);
    const dy = Math.abs(move?.y || 0);
    const moveAngle = Math.atan2(dx, dy);

    remotePlayers[peer].querySelector(
      ".legs"
    ).style.transform = `rotateZ(${moveAngle}rad)`;

    remotePositions[peer] = { x, y, z, yaw };
  });

  onPeerDisconnect((peer) => {
    remotePlayers[peer]?.remove();
    delete remotePlayers[peer];
    delete remotePositions[peer];
  });
});