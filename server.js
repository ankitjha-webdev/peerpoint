const { Server } = require("socket.io");

const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

const io = new Server(PORT, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true
  }
});

console.log("🚀 Socket.IO server starting on port", PORT);
console.log("🌐 CORS enabled for", CLIENT_URL);

io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Join a room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log(`👥 User ${socket.id} joined room ${roomId}`);
    
    // Notify other users in the room
    socket.to(roomId).emit("user-joined", { userId: socket.id });
    
    // Get number of users in room
    const room = io.sockets.adapter.rooms.get(roomId);
    const numUsers = room ? room.size : 0;
    socket.emit("room-info", { numUsers });
    
    console.log(`📊 Room ${roomId} now has ${numUsers} users`);
  });

  // Handle WebRTC signaling
  socket.on("offer", (data) => {
    console.log(`📤 Offer from ${socket.id} to room ${data.roomId}`);
    socket.to(data.roomId).emit("offer", {
      offer: data.offer,
      from: socket.id,
    });
  });

  socket.on("answer", (data) => {
    console.log(`📤 Answer from ${socket.id} to room ${data.roomId}`);
    socket.to(data.roomId).emit("answer", {
      answer: data.answer,
      from: socket.id,
    });
  });

  socket.on("ice-candidate", (data) => {
    console.log(`🧊 ICE candidate from ${socket.id} to room ${data.roomId}`);
    socket.to(data.roomId).emit("ice-candidate", {
      candidate: data.candidate,
      from: socket.id,
    });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    // Notify all rooms this user was in
    socket.rooms.forEach((roomId) => {
      if (roomId !== socket.id) {
        socket.to(roomId).emit("user-left", { userId: socket.id });
        console.log(`👋 User ${socket.id} left room ${roomId}`);
      }
    });
  });
});

console.log("✅ Socket.IO server is ready!");
console.log("📡 Waiting for connections..."); 