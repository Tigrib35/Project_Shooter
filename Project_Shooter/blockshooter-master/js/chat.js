"use strict";

let chatActive = false;

document.addEventListener("DOMContentLoaded", () => {
  const chatInputWrap = document.querySelector("#chat-input");
  const chatInputField = document.querySelector("#chat-input input");

  const appendChatMessage = (senderId, text) => {
    const senderName = playerStats[senderId]?.name || "Unknown";
    const chatContainer = document.querySelector("#chat");

    const msgElem = document.createElement("div");
    msgElem.classList.add("message");

    const nameSpan = document.createElement("span");
    nameSpan.classList.add("name");
    nameSpan.textContent = senderName + ": ";

    const textSpan = document.createElement("span");
    textSpan.classList.add("msg");
    textSpan.textContent = text;

    msgElem.appendChild(nameSpan);
    msgElem.appendChild(textSpan);
    chatContainer.appendChild(msgElem);

    if (7 < chatContainer.children.length) {
      chatContainer.removeChild(chatContainer.children[0]);
    }
  };

  document.addEventListener("keydown", (event) => {
    if (event.key === "c" && !chatActive) {
      chatActive = true;
      event.preventDefault();
      chatInputWrap.classList.add("active");
      chatInputField.focus();
      return;
    }

    if (event.key === "Enter" && chatActive) {
      chatActive = false;
      const message = chatInputField.value?.trim();
      if (message) {
        appendChatMessage(myPeer.id, message);
        sendToAll(JSON.stringify({ chatMsg: message }));
      }
      chatInputWrap.classList.remove("active");
      chatInputField.value = "";
      chatInputField.blur();
      return;
    }
  });

  onPeerData((peerId, data) => {
    const { chatMsg } = data;
    if (chatMsg) {
      appendChatMessage(peerId, chatMsg);
    }
  });
});