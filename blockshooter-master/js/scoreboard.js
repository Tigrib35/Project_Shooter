"use strict";

let playerStats = {};

const displayDeathMsg = (killerId, victimId) => {
  const killerName = playerStats[killerId]?.name || "Unknown";
  const victimName = playerStats[victimId]?.name || "Unknown";

  const killerSpan = document.createElement("span");
  killerSpan.textContent = killerName;
  if (killerId === myPeer.id) killerSpan.classList.add("self");

  const msgSpan = document.createElement("span");
  msgSpan.textContent = " killed ";

  const victimSpan = document.createElement("span");
  victimSpan.textContent = victimName;
  if (victimId === myPeer.id) victimSpan.classList.add("self");

  const msgElem = document.createElement("div");
  msgElem.classList.add("message");
  msgElem.appendChild(killerSpan);
  msgElem.appendChild(msgSpan);
  msgElem.appendChild(victimSpan);

  msgElem.addEventListener("animationend", () => {
    msgElem.remove();
  });

  const container = document.querySelector("#deathmessages");
  container.appendChild(msgElem);
  if (4 < container.children.length) {
    container.removeChild(container.children[0]);
  }
};

const updateScoreboard = () => {
  const tbody = document.querySelector("#scoreboard tbody");
  tbody.innerHTML = "";

  document.querySelector("#scoreboard h1 div").textContent = `players: ${
    Object.keys(playerStats).length
  } / ${MAX_PLAYERS}`;

  Object.entries(playerStats)
    .sort(([, a], [, b]) => (b.score || 0) - (a.score || 0))
    .forEach(([id, data]) => {
      const tr = document.createElement("tr");
      if (id === myPeer.id) tr.classList.add("self");

      const nameTd = document.createElement("td");
      const scoreTd = document.createElement("td");
      const killsTd = document.createElement("td");
      const deathsTd = document.createElement("td");

      nameTd.textContent = data.name || data.peer;
      scoreTd.textContent = data.score || 0;
      killsTd.textContent = data.kills || 0;
      deathsTd.textContent = data.deaths || 0;

      tr.appendChild(nameTd);
      tr.appendChild(scoreTd);
      tr.appendChild(killsTd);
      tr.appendChild(deathsTd);

      tbody.appendChild(tr);
    });
};

const setMyName = (name) => {
  playerStats[myPeer.id] = {
    ...playerStats[myPeer.id],
    name,
  };
  updateScoreboard();
};

const handleDeath = (killerId) => {
  const deaths = (playerStats[myPeer.id]?.deaths || 0) + 1;
  playerStats[myPeer.id] = {
    ...playerStats[myPeer.id],
    deaths,
  };
  playerStats[killerId] = {
    ...playerStats[killerId],
    kills: (playerStats[killerId]?.kills || 0) + 1,
  };
  sendToAll(JSON.stringify({ killedBy: killerId, deaths }));
  displayDeathMsg(killerId, myPeer.id);
};

const addScore = (amount) => {
  const score = (playerStats[myPeer.id]?.score || 0) + amount;
  playerStats[myPeer.id] = {
    ...playerStats[myPeer.id],
    score,
  };

  const scoreMsg = document.createElement("div");
  scoreMsg.classList.add("score-msg");
  scoreMsg.textContent = `+${amount}`;
  scoreMsg.style.setProperty("--angle", `${Math.random() * 120}deg`);
  scoreMsg.addEventListener("animationend", () => {
    scoreMsg.remove();
  });
  document.body.appendChild(scoreMsg);
  updateScoreboard();
  sendToAll(JSON.stringify({ score }));
};

document.addEventListener("DOMContentLoaded", () => {
  const scoreboard = document.querySelector("#scoreboard");

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab" || chatActive) return;
    e.preventDefault();
    scoreboard.classList.add("active");
  });

  document.addEventListener("keyup", (e) => {
    if (e.key !== "Tab") return;
    e.preventDefault();
    scoreboard.classList.remove("active");
  });

  onPeerData((peer, data) => {
    const { playerName, score, deaths, killedBy, playerStats: incomingStats } = data;

    if (playerName !== undefined) {
      playerStats[peer] = {
        ...playerStats[peer],
        name: playerName,
      };
    }
    if (score !== undefined) {
      playerStats[peer] = {
        ...playerStats[peer],
        score,
      };
    }
    if (deaths !== undefined) {
      playerStats[peer] = {
        ...playerStats[peer],
        deaths,
      };
    }
    if (killedBy !== undefined) {
      playerStats[killedBy] = {
        ...playerStats[killedBy],
        kills: (playerStats[killedBy]?.kills || 0) + 1,
      };
      displayDeathMsg(killedBy, peer);
    }
    if (incomingStats) {
      playerStats = {
        ...playerStats,
        ...incomingStats,
      };
    }
    updateScoreboard();
  });

  onPeerDisconnect(() => {
    delete playerStats[myPeer.id];
    updateScoreboard();
  });
});