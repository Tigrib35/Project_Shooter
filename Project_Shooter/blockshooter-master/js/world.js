"use strict";

const BLOCK_SIZE = 100;
const WORLD_SIZE = 25;
document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector(":root");
  root.style.setProperty("--face-size", `${BLOCK_SIZE}px`);
  root.style.setProperty("--map-size", `${WORLD_SIZE}`);
});

let blockMap = {};
const makeBlockKey = (x, y, z, face) => `${x}_${y}_${z}_${face}`;
const parseBlockKey = (key) => {
  const [x, y, z, face] = key?.split("_") || [];
  return { x, y, z, face };
};

const setBlock = (x, y, z, face, color) => {
  blockMap[makeBlockKey(x, y, z, face)] = color;
};

const drawBlock = (key, fallbackColor) => {
  const { x, y, z, face } = parseBlockKey(key);
  const color = blockMap[key] || fallbackColor;

  const existing = document.querySelector(`#k${key}`);
  if (existing) {
    existing.style.background = color;
    return;
  }

  const scene = document.querySelector("#scene");

  const faceEl = document.createElement("div");
  faceEl.classList.add("face");
  faceEl.classList.add(face);
  faceEl.style.background = color;
  faceEl.id = `k${key}`;

  const wrapper = document.createElement("div");
  wrapper.classList.add("face-wrapper");
  wrapper.appendChild(faceEl);
  wrapper.style.transform = `translate3d(${x * BLOCK_SIZE}px, ${
    y * BLOCK_SIZE
  }px, ${z * BLOCK_SIZE}px)`;

  scene.appendChild(wrapper);
};

const addCube = (x, y, z, color) => {
  setBlock(x, y, z, "x", color);
  setBlock(x, y, z, "y", color);
  setBlock(x, y, z, "z", color);
  setBlock(x + 1, y, z, "x", color);
  setBlock(x, y + 1, z, "y", color);
  setBlock(x, y, z + 1, "z", color);
};

const addPlane = (z) => {
  for (let x = 0; x < WORLD_SIZE; x++) {
    for (let y = 0; y < WORLD_SIZE; y++) {
      setBlock(x, y, z, "z", "#fff");
    }
  }
};

document.addEventListener("DOMContentLoaded", async () => {
  const { faces: mapFaces, spawnpoints } = await fetch("./js/map.json").then(
    (response) => {
      if (!response.ok) {
        throw new Error(`Could not load map: ${response.status}`);
      }
      return response.json();
    }
  );

  blockMap = mapFaces;
  spawnPoints = spawnpoints.map((point) => {
    const { p, y } = point;
    const coords = parseBlockKey(p);
    return {
      p: {
        x: parseInt(coords.x) * BLOCK_SIZE,
        y: parseInt(coords.y) * BLOCK_SIZE,
        z: parseInt(coords.z) * BLOCK_SIZE,
      },
      y,
    };
  });

  Object.keys(blockMap).forEach((key) => {
    drawBlock(key);
  });

  onPeerData((peer, data) => {
    const {
      blockData: incomingBlocks,
      removeBlock,
      addBlock,
      damageBlock,
      damageBlockId,
      damageFaces,
    } = data;

    if (incomingBlocks) {
      for (const key in incomingBlocks) {
        if (key in blockMap && blockMap[key] === incomingBlocks[key]) continue;
        drawBlock(key, incomingBlocks[key]);
      }
      blockMap = incomingBlocks;
      document.querySelectorAll("#scene .face-wrapper").forEach((el) => {
        const key = el.firstChild.id.slice(1);
        if (!blockMap[key]) {
          el.remove();
          return;
        }
        el.firstChild.style.background = blockMap[key];
      });
    }

    if (removeBlock) {
      blockMap[removeBlock] = undefined;
      document.querySelector(`#k${removeBlock}`).parentElement.remove();
    }

    if (addBlock) {
      blockMap[addBlock] = "red";
      drawBlock(addBlock);
    }

    if (damageBlock && damageBlockId) {
      document
        .querySelector(`#k${damageBlockId}`)
        .style.setProperty("--grid-size", 100 / (damageBlock * 2) + "%");
      document
        .querySelector(`#k${damageBlockId}`)
        .setAttribute("damage", damageBlock);
    }

    if (damageFaces) {
      damageFaces.forEach(({ id, damage }) => {
        document
          .querySelector(`#k${id}`)
          ?.style?.setProperty("--grid-size", 100 / (damage * 2) + "%");
        document.querySelector(`#k${id}`)?.setAttribute("damage", damage);
      });
    }
  });
});
