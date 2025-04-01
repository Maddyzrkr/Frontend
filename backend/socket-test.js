const http = require('http');
const socketIo = require('socket.io');
const express = require('express');
const cors = require('cors');

// Basic Express server for testing
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store connected clients
const connectedClients = {};

// Handle socket connections
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);
  connectedClients[socket.id] = { 
    id: socket.id, 
    connectedAt: new Date() 
  };
  
  // Send a welcome message to the client
  socket.emit('server_info', { 
    message: 'Connected to test socket server',
    socketId: socket.id,
    timestamp: Date.now()
  });
  
  // Handle ping requests
  socket.on('ping_server', (data) => {
    console.log(`Ping received from ${socket.id}:`, data);
    socket.emit('pong_server', {
      ...data,
      received: Date.now(),
      serverTime: new Date().toISOString()
    });
  });
  
  // Handle test channel join
  socket.on('join_ride_channel', (data) => {
    console.log(`Socket ${socket.id} joining channel:`, data);
    if (data && data.rideId) {
      socket.join(data.rideId);
      socket.emit('channel_joined', { 
        rideId: data.rideId,
        message: `You have joined channel ${data.rideId}`,
        socket: socket.id
      });
    }
  });
  
  // Handle test messages
  socket.on('test_message', (data) => {
    console.log(`Test message from ${socket.id}:`, data);
    
    // Echo back to the sender
    socket.emit('message_received', {
      ...data,
      echo: true,
      timestamp: Date.now()
    });
    
    // Broadcast to everyone in the channel if specified
    if (data && data.channel) {
      socket.to(data.channel).emit('channel_message', {
        from: socket.id,
        ...data,
        timestamp: Date.now()
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    delete connectedClients[socket.id];
  });
});

// Add a basic health route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    connections: Object.keys(connectedClients).length,
    uptime: process.uptime()
  });
});

// Log active connections on an interval
setInterval(() => {
  const connectionCount = Object.keys(connectedClients).length;
  console.log(`Active connections: ${connectionCount}`);
}, 10000);

// Start the server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Socket.IO test server running on port ${PORT}`);
}); 