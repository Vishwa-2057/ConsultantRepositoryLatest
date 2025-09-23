const express = require('express');
const https = require('https');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const selfsigned = require('selfsigned');

const app = express();

// Generate self-signed certificate
const pems = selfsigned.generate([{ name: 'commonName', value: 'localhost' }], { days: 365 });

// Create both HTTP and HTTPS servers
const httpServer = http.createServer(app);
const httpsServer = https.createServer({
  key: pems.private,
  cert: pems.cert
}, app);

// Enable CORS for all origins (for testing)
const ioHttp = socketIo(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["*"],
    credentials: true
  }
});

const ioHttps = socketIo(httpsServer, {
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

// Shared socket handling function
function handleSocket(socket, serverType) {
  console.log(`User connected to ${serverType}:`, socket.id);

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
    const existingUser = room.users.find(u => u.socketId === socket.id);
    if (!existingUser) {
      room.users.push({ socketId: socket.id, userType });
    }
    
    console.log(`${userType} joined room: ${roomId}`);
    
    // Notify other users in the room
    socket.to(roomId).emit('user-joined', socket.id, userType);
    
    // Check if both doctor and patient are present
    const doctorPresent = room.users.some(u => u.userType === 'doctor');
    const patientPresent = room.users.some(u => u.userType === 'patient');
    
    // Emit room-ready event to the joining user
    socket.emit('room-ready', {
      roomId,
      doctorPresent,
      patientPresent,
      userCount: room.users.length
    });
  });

  // Handle WebRTC signaling
  socket.on('offer', (roomId, offer) => {
    console.log('Offer received for room:', roomId);
    socket.to(roomId).emit('offer', offer);
  });

  socket.on('answer', (roomId, answer) => {
    console.log('Answer received for room:', roomId);
    socket.to(roomId).emit('answer', answer);
  });

  socket.on('ice-candidate', (roomId, candidate) => {
    console.log('ICE candidate received for room:', roomId);
    socket.to(roomId).emit('ice-candidate', candidate);
  });

  // Handle call management
  socket.on('initiate-call', (roomId, callerInfo) => {
    console.log('Call initiated for room:', roomId);
    socket.to(roomId).emit('incoming-call', callerInfo);
  });

  socket.on('accept-call', (roomId) => {
    console.log('Call accepted by patient for room:', roomId);
    socket.to(roomId).emit('call-accepted');
  });

  socket.on('reject-call', (roomId) => {
    console.log('Call rejected by patient for room:', roomId);
    socket.to(roomId).emit('call-rejected');
  });

  socket.on('end-call', (roomId) => {
    console.log('Call ended for room:', roomId);
    socket.to(roomId).emit('call-ended');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const user = users.get(socket.id);
    if (user) {
      const room = rooms.get(user.roomId);
      if (room) {
        room.users = room.users.filter(u => u.socketId !== socket.id);
        
        // Notify other users in the room
        socket.to(user.roomId).emit('user-left', socket.id, user.userType);
        
        // Clean up empty rooms
        if (room.users.length === 0) {
          rooms.delete(user.roomId);
        }
      }
      users.delete(socket.id);
    }
  });
}

// Apply socket handling to both servers
ioHttp.on('connection', (socket) => handleSocket(socket, 'HTTP'));
ioHttps.on('connection', (socket) => handleSocket(socket, 'HTTPS'));

// Health check endpoint
app.get('/health', (req, res) => {
  const activeRooms = rooms.size;
  const activeUsers = users.size;
  
  res.json({
    status: 'OK',
    activeRooms,
    activeUsers,
    timestamp: new Date().toISOString()
  });
});

// Room info endpoint
app.get('/room/:roomId', (req, res) => {
  const { roomId } = req.params;
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

// Start both servers
const HTTP_PORT = 3001;
const HTTPS_PORT = 3002;

httpServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`HTTP Signaling server running on http://localhost:${HTTP_PORT}`);
  console.log(`Network access: http://192.168.0.30:${HTTP_PORT}`);
});

httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
  console.log(`HTTPS Signaling server running on https://localhost:${HTTPS_PORT}`);
  console.log(`Network access: https://192.168.0.30:${HTTPS_PORT}`);
  console.log(`Health check: https://192.168.0.30:${HTTPS_PORT}/health`);
});

module.exports = { app, httpServer, httpsServer, ioHttp, ioHttps };
