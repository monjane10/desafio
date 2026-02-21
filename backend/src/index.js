const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN =
  process.env.CLIENT_ORIGIN ||
  "https://mapapp-git-main-monjane10s-projects.vercel.app";

const allowedOrigins = CLIENT_ORIGIN.split(",").map((o) => o.trim());

const app = express();
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, origin);
      }
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
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
