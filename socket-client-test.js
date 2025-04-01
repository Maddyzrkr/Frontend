import { io } from 'socket.io-client';

// Adjust the URL to match your server
const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:5001";

console.log(`Attempting to connect to socket server at ${SOCKET_URL}`);

// Create a socket connection
const socket = io(SOCKET_URL, {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true
});

// Connection events
socket.on('connect', () => {
  console.log(`Socket connected with ID: ${socket.id}`);
  
  // Send a ping immediately
  socket.emit('ping_server', { 
    timestamp: Date.now(),
    clientId: socket.id
  });
  
  // Join a test channel
  socket.emit('join_ride_channel', {
    rideId: 'test_channel_123',
    context: {
      device: 'test-client',
      platform: 'node'
    }
  });
  
  // Set up interval to send regular pings
  setInterval(() => {
    console.log('Sending ping to server...');
    socket.emit('ping_server', { 
      timestamp: Date.now(),
      clientId: socket.id,
      random: Math.random()
    });
  }, 5000);
});

socket.on('server_info', (data) => {
  console.log('Server info received:', data);
});

socket.on('pong_server', (data) => {
  const roundTripTime = Date.now() - data.timestamp;
  console.log(`Pong received - Round-trip time: ${roundTripTime}ms`);
  console.log('Server data:', data);
});

socket.on('channel_joined', (data) => {
  console.log('Channel joined:', data);
  
  // Send a test message to the channel
  socket.emit('test_message', {
    channel: data.rideId,
    text: 'Hello from the test client!',
    sent: Date.now()
  });
});

socket.on('message_received', (data) => {
  console.log('Message echo received:', data);
});

socket.on('channel_message', (data) => {
  console.log('Channel message received:', data);
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});

socket.on('disconnect', (reason) => {
  console.log(`Socket disconnected. Reason: ${reason}`);
});

// Connection timeout
setTimeout(() => {
  if (!socket.connected) {
    console.error('Failed to connect to server within timeout period');
  }
}, 10000);

console.log('Socket client initialized and waiting for connection...'); 