const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*', // Allow all origins in development
    methods: ['GET', 'POST']
  }
});

// Active ride channels for real-time communication
const activeRideChannels = new Map();
// Track connected clients
const connectedClients = new Map();

// Socket authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication token required'));
  }
  
  try {
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    socket.userName = decoded.name || 'Unknown User';
    
    // Log connection info
    console.log(`Socket connection authenticated for user: ${socket.userId}`);
    
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    return next(new Error('Authentication failed'));
  }
});

// Socket connection handler
io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id} for user: ${socket.userId}`);
  
  // Store client connection
  connectedClients.set(socket.userId, {
    socketId: socket.id,
    userId: socket.userId,
    userName: socket.userName,
    connectedAt: new Date()
  });
  
  // Handle device debug ping
  socket.on('ping_server', (data) => {
    console.log(`Ping received from ${socket.id}:`, data);
    socket.emit('pong_server', {
      timestamp: data.timestamp,
      received: Date.now(),
      userId: socket.userId,
      connections: connectedClients.size
    });
  });
  
  // Join a specific ride channel
  socket.on('join_ride_channel', (data) => {
    if (!data || !data.rideId) {
      socket.emit('error', { message: 'Ride ID is required to join a channel' });
      return;
    }
    
    const { rideId } = data;
    
    console.log(`User ${socket.userId} joining ride channel: ${rideId}`);
    
    // Join the socket to the room named after the ride ID
    socket.join(rideId);
    
    // Track the channel membership
    if (!activeRideChannels.has(rideId)) {
      activeRideChannels.set(rideId, new Set());
    }
    
    activeRideChannels.get(rideId).add(socket.userId);
    
    // Notify the user they've joined the channel
    socket.emit('channel_joined', { 
      rideId, 
      message: 'You have joined the ride channel',
      members: Array.from(activeRideChannels.get(rideId)).length
    });
    
    // Log the state of the channel
    console.log(`Ride channel ${rideId} now has ${activeRideChannels.get(rideId).size} members`);
  });
  
  // Handle ride join requests
  socket.on('join_request', (data) => {
    if (!data || !data.rideId) {
      socket.emit('error', { message: 'Ride ID is required' });
      return;
    }
    
    const { rideId } = data;
    
    console.log(`User ${socket.userId} requesting to join ride: ${rideId}`);
    
    // Emit the join request to all users in the ride channel
    socket.to(rideId).emit('join_request', {
      user: {
        id: socket.userId,
        name: socket.userName
      },
      timestamp: new Date()
    });
  });
  
  // Handle request responses (accept/reject)
  socket.on('request_response', (data) => {
    if (!data || !data.rideId || !data.userId || !data.status) {
      socket.emit('error', { message: 'Missing required fields' });
      return;
    }
    
    const { rideId, userId, status } = data;
    
    console.log(`Request response for ride ${rideId}: User ${userId} is ${status}`);
    
    // Broadcast the status update to all users in the ride channel
    io.to(rideId).emit('request_update', {
      userId,
      status,
      updatedAt: new Date()
    });
    
    // Also emit a direct notification to the specific user
    const targetUserSocketId = Array.from(connectedClients.values())
      .find(client => client.userId === userId)?.socketId;
    
    if (targetUserSocketId) {
      io.to(targetUserSocketId).emit('request_status_changed', {
        rideId,
        status,
        message: `Your request to join ride ${rideId} was ${status}`
      });
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Socket disconnected: ${socket.id}, reason: ${reason}`);
    
    // Clean up connected clients tracking
    connectedClients.delete(socket.userId);
    
    // Remove user from all active ride channels
    activeRideChannels.forEach((members, rideId) => {
      if (members.has(socket.userId)) {
        members.delete(socket.userId);
        console.log(`User ${socket.userId} removed from ride channel ${rideId}`);
        
        // If the channel is empty, clean it up
        if (members.size === 0) {
          activeRideChannels.delete(rideId);
          console.log(`Ride channel ${rideId} has been removed (no members)`);
        } else {
          // Notify remaining members
          io.to(rideId).emit('member_left', {
            userId: socket.userId,
            timestamp: new Date(),
            members: members.size
          });
        }
      }
    });
  });
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/matchmyride', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    message: 'Server is running',
    socketConnections: connectedClients.size,
    activeRideChannels: activeRideChannels.size
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rides', rideRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.IO server is ready for connections`);
});

module.exports = { app, server, io }; 