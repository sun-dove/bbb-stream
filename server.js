const path = require("path");
const fs = require("fs");
const http = require("http");
const express = require("express");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const uploadRoot = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadRoot,
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage });

app.use(express.static(path.join(__dirname, "public")));
app.use("/downloads", express.static(uploadRoot));

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  const originalName = req.file.originalname;
  const size = req.file.size;
  const fileUrl = `/downloads/${req.file.filename}`;
  const payload = {
    type: "file",
    id: uuidv4(),
    name: originalName,
    size,
    url: fileUrl,
    sender: req.body.sender || "Anonymous",
    timestamp: Date.now()
  };
  broadcast(JSON.stringify(payload));
  res.json(payload);
});

function broadcast(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on("connection", (ws) => {
  ws.send(
    JSON.stringify({
      type: "system",
      id: uuidv4(),
      message: "Connected to LAN chat",
      timestamp: Date.now()
    })
  );

  ws.on("message", (data) => {
    let payload;
    try {
      payload = JSON.parse(data.toString());
    } catch (error) {
      return;
    }
    if (payload.type === "chat") {
      payload.id = uuidv4();
      payload.timestamp = Date.now();
      broadcast(JSON.stringify(payload));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`LAN chat server running at http://0.0.0.0:${PORT}`);
});
