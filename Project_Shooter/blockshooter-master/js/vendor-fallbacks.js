"use strict";

if (typeof window.Howl === "undefined") {
  window.Howl = class {
    play() {}
    pos() {}
    orientation() {}
    pannerAttr() {}
  };
}

if (typeof window.Howler === "undefined") {
  window.Howler = {
    pos() {},
    orientation() {},
  };
}

if (typeof window.Peer === "undefined") {
  class OfflineConnection {
    constructor(peer) {
      this.peer = peer;
      setTimeout(() => this.handlers.error?.({ type: "offline" }), 0);
    }

    handlers = {};

    on(event, handler) {
      this.handlers[event] = handler;
    }

    send() {}
  }

  window.Peer = class {
    constructor(id) {
      this.id = id;
      this.handlers = {};
      setTimeout(() => this.handlers.open?.(id), 0);
    }

    on(event, handler) {
      this.handlers[event] = handler;
    }

    connect(id) {
      return new OfflineConnection(id);
    }

    destroy() {}
  };
}
