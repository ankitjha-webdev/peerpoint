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

// Track active users and their rooms
const activeUsers = new Map(); // socketId -> { roomId, userId }

console.log("🚀 Socket.IO server starting on port", PORT);
console.log("🌐 CORS enabled for", CLIENT_URL);

io.on("connection", (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);

  // Join a room
  socket.on("join-room", (roomId) => {
    // Get number of users in room
    const room = io.sockets.adapter.rooms.get(roomId);
    const numUsers = room ? room.size : 0;

    if (numUsers >= 2) {
      // Room is full, do not join
      socket.emit("room-full", { message: "Room is full. Only 2 users allowed." });
      return;
    }

    // Leave previous room if any
    const previousRoom = activeUsers.get(socket.id)?.roomId;
    if (previousRoom && previousRoom !== roomId) {
      socket.leave(previousRoom);
      socket.to(previousRoom).emit("user-left", { userId: socket.id });
      console.log(`👋 User ${socket.id} left room ${previousRoom}`);
    }

    // Join new room
    socket.join(roomId);
    activeUsers.set(socket.id, { roomId, userId: socket.id });
    
    console.log(`👥 User ${socket.id} joined room ${roomId}`);
    
    // Notify other users in the room
    socket.to(roomId).emit("user-joined", { userId: socket.id });
    
    // Get number of users in room
    const updatedRoom = io.sockets.adapter.rooms.get(roomId);
    const updatedNumUsers = updatedRoom ? updatedRoom.size : 0;
    socket.emit("room-info", { numUsers: updatedNumUsers });
    
    console.log(`📊 Room ${roomId} now has ${updatedNumUsers} users`);
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

  // Handle manual leave room
  socket.on("leave-room", (roomId) => {
    console.log(`🚪 User ${socket.id} manually leaving room ${roomId}`);
    socket.leave(roomId);
    activeUsers.delete(socket.id);
    socket.to(roomId).emit("user-left", { userId: socket.id });
    
    // Update room info for remaining users
    const room = io.sockets.adapter.rooms.get(roomId);
    const numUsers = room ? room.size : 0;
    io.to(roomId).emit("room-info", { numUsers });
    
    console.log(`📊 Room ${roomId} now has ${numUsers} users`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    
    // Get user's room before removing from tracking
    const userInfo = activeUsers.get(socket.id);
    if (userInfo) {
      const { roomId } = userInfo;
      
      // Remove from tracking
      activeUsers.delete(socket.id);
      
      // Notify other users in the room
      socket.to(roomId).emit("user-left", { userId: socket.id });
      console.log(`👋 User ${socket.id} left room ${roomId}`);
      
      // Update room info for remaining users
      const room = io.sockets.adapter.rooms.get(roomId);
      const numUsers = room ? room.size : 0;
      io.to(roomId).emit("room-info", { numUsers });
      
      console.log(`📊 Room ${roomId} now has ${numUsers} users`);
    }
  });
});

console.log("✅ Socket.IO server is ready!");
console.log("📡 Waiting for connections..."); 