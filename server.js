const express = require("express");
const colors = require("colors");
const morgan = require("morgan");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db");
const { Server } = require("socket.io");
const path = require("path");

dotenv.config();

// Mongodb connection
connectDB();

const app = express();
const http = require("http").createServer(app); // Create HTTP server

// Socket.IO integration
const io = new Server(http);

// Middlewares
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());

// Routes
app.use("/api/v1/user", require("./routes/userRoutes"));
app.use("/api/v1/admin", require("./routes/adminRoutes"));
app.use("/api/v1/doctor", require("./routes/doctorRoutes"));
app.use("/api/v1/chat", require("./routes/chatRoutes"));

app.use(express.static(path.join(__dirname, "/client/build")));

app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build/index.html"));
});

// Listen on port
const port = process.env.PORT || 8080;

// Socket.IO events
io.on("connection", (socket) => {
  let roomID;
  // Join room
  socket.on("joinRoom", ({ username, roomID }) => {
    roomID = roomID;
    socket.join(roomID);
    socket.username = username;
  });

  // Handle incoming messages
  socket.on("sendMessage", (messageData) => {
    socket.to(messageData.roomID).emit("receiveMessage", messageData);
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    if (socket.username) {
      // Emit message to the room
      io.to(roomID).emit("message", {
        user: "System",
        text: `${socket.username} left the room.`,
        timestamp: new Date().toLocaleTimeString(),
      });

      // Emit updated user list to the room
      const room = io.sockets.adapter.rooms.get(roomID);
      const userList = room
        ? Array.from(room).map(
            (socketId) => io.sockets.sockets.get(socketId).username
          )
        : [];
      io.to(roomID).emit("userList", userList);
    }
  });
});

http.listen(port, () => {
  console.log(
    `Server running in ${process.env.NODE_MODE} mode on port ${port}`.bgCyan
      .white
  );
});
