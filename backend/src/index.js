const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;

const app = express();
app.use(cors());

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN ? CLIENT_ORIGIN.split(",") : "*",
    methods: ["GET", "POST"],
  },
});

const clients = new Map();

const broadcastLocations = () => {
  const payload = Array.from(clients.entries()).map(([socketId, data]) => ({
    id: socketId,
    ...data,
  }));

  io.emit("locations", payload);
};

io.on("connection", (socket) => {
  socket.on("location:update", (coords) => {
    const latitude = Number(coords?.latitude);
    const longitude = Number(coords?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return;
    }

    clients.set(socket.id, {
      latitude,
      longitude,
      updatedAt: Date.now(),
    });

    broadcastLocations();
  });

  socket.on("disconnect", () => {
    clients.delete(socket.id);
    broadcastLocations();
  });

  broadcastLocations();
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
