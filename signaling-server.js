const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for all origins (for testing)
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  }
});

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["*"],
  credentials: true
}));
app.use(express.json());

// Store active rooms and users
const rooms = new Map();
const users = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a room (consultation room)
  socket.on('join-room', (roomId, userType) => {
    socket.join(roomId);
    
    // Store user info
    users.set(socket.id, { roomId, userType });
    
    // Initialize room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, { users: [] });
    }
    
    // Add user to room
    const room = rooms.get(roomId);
    room.users.push({ socketId: socket.id, userType });
    
    console.log(`${userType} joined room: ${roomId}`);
    
    // Notify others in the room
    socket.to(roomId).emit('user-joined', socket.id, userType);
    
    // If both doctor and patient are present, notify them
    const doctorPresent = room.users.some(u => u.userType === 'doctor');
    const patientPresent = room.users.some(u => u.userType === 'patient');
    
    if (doctorPresent && patientPresent) {
      io.to(roomId).emit('room-ready', { doctorPresent, patientPresent });
    }
  });

  // Handle WebRTC offer
  socket.on('offer', (roomId, offer) => {
    console.log('Offer received for room:', roomId);
    socket.to(roomId).emit('offer', offer);
  });

  // Handle WebRTC answer
  socket.on('answer', (roomId, answer) => {
    console.log('Answer received for room:', roomId);
    socket.to(roomId).emit('answer', answer);
  });

  // Handle ICE candidates
  socket.on('ice-candidate', (roomId, candidate) => {
    console.log('ICE candidate received for room:', roomId);
    socket.to(roomId).emit('ice-candidate', candidate);
  });

  // Handle call initiation from doctor
  socket.on('initiate-call', (data) => {
    const { roomId, patientId, doctorName } = data;
    console.log('Call initiated by doctor for room:', roomId);
    
    // Notify patient about incoming call
    socket.to(roomId).emit('incoming-call', {
      doctorName,
      roomId,
      callType: 'video'
    });
  });

  // Handle call acceptance from patient
  socket.on('accept-call', (roomId) => {
    console.log('Call accepted by patient for room:', roomId);
    socket.to(roomId).emit('call-accepted');
  });

  // Handle call rejection from patient
  socket.on('reject-call', (roomId) => {
    console.log('Call rejected by patient for room:', roomId);
    socket.to(roomId).emit('call-rejected');
  });

  // Handle call end
  socket.on('end-call', (roomId) => {
    console.log('Call ended for room:', roomId);
    socket.to(roomId).emit('call-ended');
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const user = users.get(socket.id);
    if (user) {
      const { roomId, userType } = user;
      
      // Remove user from room
      if (rooms.has(roomId)) {
        const room = rooms.get(roomId);
        room.users = room.users.filter(u => u.socketId !== socket.id);
        
        // Notify others in the room
        socket.to(roomId).emit('user-left', socket.id, userType);
        
        // Clean up empty rooms
        if (room.users.length === 0) {
          rooms.delete(roomId);
        }
      }
      
      users.delete(socket.id);
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    activeRooms: rooms.size,
    activeUsers: users.size,
    timestamp: new Date().toISOString()
  });
});

// Get room status
app.get('/room/:roomId', (req, res) => {
  const roomId = req.params.roomId;
  const room = rooms.get(roomId);
  
  if (room) {
    res.json({
      roomId,
      users: room.users.map(u => ({ userType: u.userType })),
      userCount: room.users.length
    });
  } else {
    res.status(404).json({ error: 'Room not found' });
  }
});

const PORT = 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Signaling server running on http://localhost:${PORT}`);
  console.log(`Network access: http://192.168.0.30:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Network access: http://192.168.0.30:${PORT}/health`);
  console.log(`Use this IP for other devices: 192.168.0.30`);


});

module.exports = { app, server, io };
