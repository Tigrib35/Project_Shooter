"use strict";

const GAME_PREFIX = "va-";
const MAX_PLAYERS = 10;

let myPeer;
const peerConnections = {};

const sendToAll = (data) => {
  for (const conn of Object.values(peerConnections)) {
    conn.send(data);
  }
};

const sendTo = (id, data) => {
  const conn = peerConnections[id];
  if (conn) {
    conn.send(data);
  }
};

const dataHandlers = [];
const onPeerData = (fn) => dataHandlers.push(fn);
const disconnectHandlers = [];
const onPeerDisconnect = (fn) => disconnectHandlers.push(fn);

document.addEventListener("beforeunload", () => {
  if (myPeer) {
    console.log("destroying peer");
    myPeer.destroy();
  }
});

const initPeer = (suffix) =>
  new Promise((resolve, reject) => {
    const peer = new Peer(`${GAME_PREFIX}${suffix}`);
    peer.on("open", () => resolve(peer));
    peer.on("error", reject);
  });

const connectToPeer = (peer, id) =>
  new Promise((resolve, reject) => {
    const conn = peer.connect(id);
    const timeout = setTimeout(() => reject(new Error("timeout")), 1000);
    conn.on("open", () => {
      clearTimeout(timeout);
      resolve(conn);
    });
    conn.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

document.addEventListener("DOMContentLoaded", async () => {
  let i = 0;
  for (; i < MAX_PLAYERS; i++) {
    try {
      myPeer = await initPeer(i);
      break;
    } catch (error) {
      if (error.type !== "unavailable-id") {
        console.error(error);
        return;
      }
      continue;
    }
  }
  if (!myPeer) {
    console.error("Could not create peer");
    return;
  }
  console.log("got id", myPeer.id);

  myPeer.on("connection", (conn) => {
    console.log("incoming connection from", conn.peer);
    peerConnections[conn.peer] = conn;

    conn.on("open", () => {
      console.log("connection open to", conn.peer);
      conn.send(JSON.stringify({ blockData: blockMap }));
      conn.send(getStateData());
      conn.send(JSON.stringify({ playerStats }));
      conn.send(
        JSON.stringify({
          damageFaces: Array.from(document.querySelectorAll("[damage]")).map(
            (el) => ({
              id: el.id.slice(1),
              damage: el.getAttribute("damage"),
            })
          ),
        })
      );
    });

    conn.on("data", (data) => {
      let parsed;
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        console.warn("invalid data", data);
        return;
      }
      dataHandlers.forEach((fn) => fn(conn.peer, parsed));
    });
    conn.on("close", () => {
      console.log("closing connection to", conn.peer);
      delete peerConnections[conn.peer];
      disconnectHandlers.forEach((fn) => fn(conn.peer));
    });
  });

  for (let j = 0; j < MAX_PLAYERS; j++) {
    if (j === i || peerConnections[`${GAME_PREFIX}${j}`]) continue;
    try {
      console.log("connecting to", `${GAME_PREFIX}${j}`);
      const conn = await connectToPeer(myPeer, `${GAME_PREFIX}${j}`);
      peerConnections[conn.peer] = conn;
      console.log("connecting to", `${GAME_PREFIX}${j}`, "done");
      conn.send(getStateData());
      conn.send(JSON.stringify({ playerName: myName }));

      conn.on("data", (data) => {
        dataHandlers.forEach((fn) => fn(conn.peer, JSON.parse(data)));
      });
      conn.on("close", () => {
        console.log("closing connection to", conn.peer);
        delete peerConnections[conn.peer];
        disconnectHandlers.forEach((fn) => fn(conn.peer));
      });
    } catch (e) {}
  }
});