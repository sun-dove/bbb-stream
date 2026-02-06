const statusEl = document.getElementById("status");
const onlineStatus = document.getElementById("online-status");
const messagesEl = document.getElementById("messages");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const usernameInput = document.getElementById("username");
const saveNameBtn = document.getElementById("save-name");
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("file-input");
const uploadBtn = document.getElementById("upload-btn");
const transferList = document.getElementById("transfer-list");

let username = localStorage.getItem("lanChatName") || "";
usernameInput.value = username;

const socket = new WebSocket(`ws://${window.location.host}`);

socket.addEventListener("open", () => {
  statusEl.textContent = "已连接";
  onlineStatus.textContent = "在线";
  statusEl.style.color = "#44d18f";
});

socket.addEventListener("close", () => {
  statusEl.textContent = "连接断开";
  onlineStatus.textContent = "离线";
  statusEl.style.color = "#ff6b6b";
});

socket.addEventListener("message", (event) => {
  const payload = JSON.parse(event.data);
  if (payload.type === "chat" || payload.type === "system") {
    appendMessage(payload);
  }
  if (payload.type === "file") {
    appendFile(payload);
  }
});

saveNameBtn.addEventListener("click", () => {
  username = usernameInput.value.trim();
  if (!username) {
    username = "匿名";
  }
  localStorage.setItem("lanChatName", username);
  appendMessage({
    type: "system",
    message: `昵称已更新为 ${username}`,
    timestamp: Date.now()
  });
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text) {
    return;
  }
  socket.send(
    JSON.stringify({
      type: "chat",
      sender: username || "匿名",
      message: text
    })
  );
  messageInput.value = "";
});

uploadBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (file) {
    uploadFile(file);
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");
  });
});

dropZone.addEventListener("drop", (event) => {
  const file = event.dataTransfer.files[0];
  if (file) {
    uploadFile(file);
  }
});

function appendMessage(payload) {
  const wrapper = document.createElement("div");
  wrapper.className = "message";
  if (payload.type === "system") {
    wrapper.classList.add("highlight");
  }
  const meta = document.createElement("div");
  meta.className = "meta";
  const time = new Date(payload.timestamp).toLocaleTimeString();
  const sender = payload.sender ? `${payload.sender} · ` : "";
  meta.textContent = `${sender}${time}`;
  const content = document.createElement("div");
  content.textContent = payload.message;
  wrapper.appendChild(meta);
  wrapper.appendChild(content);
  messagesEl.appendChild(wrapper);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendFile(payload) {
  const card = document.createElement("div");
  card.className = "transfer-item";

  const name = document.createElement("strong");
  name.textContent = payload.name;

  const meta = document.createElement("span");
  const sizeMb = (payload.size / 1024 / 1024).toFixed(2);
  const time = new Date(payload.timestamp).toLocaleTimeString();
  meta.textContent = `${payload.sender} · ${sizeMb} MB · ${time}`;

  const link = document.createElement("a");
  link.href = payload.url;
  link.textContent = "下载文件";
  link.setAttribute("download", payload.name);

  card.appendChild(name);
  card.appendChild(meta);
  card.appendChild(link);
  transferList.prepend(card);
}

async function uploadFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("sender", username || "匿名");

  statusEl.textContent = "上传中...";
  statusEl.style.color = "#ffd166";

  try {
    const response = await fetch("/upload", {
      method: "POST",
      body: formData
    });
    if (!response.ok) {
      throw new Error("Upload failed");
    }
    statusEl.textContent = "上传完成";
    statusEl.style.color = "#44d18f";
  } catch (error) {
    statusEl.textContent = "上传失败";
    statusEl.style.color = "#ff6b6b";
  }
}
