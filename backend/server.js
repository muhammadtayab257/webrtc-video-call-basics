/**
 * Simple WebRTC Signaling Server + Static File Server
 * - Uses Socket.IO for real-time communication
 * - Serves Angular frontend from /public folder
 * - Handles only 2 users at a time
 * - Hard-coded join code: CALL123
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ============================================
// SERVE ANGULAR STATIC FILES
// ============================================
// Serve static files from 'public' folder (Angular build output)
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// CONFIGURATION
// ============================================
const JOIN_CODE = 'CALL123';  // Hard-coded join code
const MAX_USERS = 2;          // Maximum users allowed

// ============================================
// STATE MANAGEMENT
// ============================================
let connectedUsers = [];

// ============================================
// HELPER FUNCTIONS
// ============================================
function getOtherUser(currentSocketId) {
  return connectedUsers.find(id => id !== currentSocketId);
}

function removeUser(socketId) {
  connectedUsers = connectedUsers.filter(id => id !== socketId);
}

// ============================================
// SOCKET.IO EVENT HANDLERS
// ============================================
io.on('connection', (socket) => {
  console.log(`[CONNECT] User connected: ${socket.id}`);

  // EVENT: join-call
  socket.on('join-call', (code) => {
    console.log(`[JOIN] User ${socket.id} trying to join with code: ${code}`);

    if (code !== JOIN_CODE) {
      socket.emit('join-error', 'Invalid join code');
      console.log(`[ERROR] Invalid code from ${socket.id}`);
      return;
    }

    if (connectedUsers.length >= MAX_USERS) {
      socket.emit('join-error', 'Call already in progress. Please try later.');
      console.log(`[ERROR] Call full, rejecting ${socket.id}`);
      return;
    }

    if (connectedUsers.includes(socket.id)) {
      socket.emit('join-error', 'You are already in the call');
      return;
    }

    connectedUsers.push(socket.id);
    console.log(`[JOIN] User ${socket.id} joined. Total users: ${connectedUsers.length}`);

    socket.emit('join-success', {
      message: 'Joined successfully',
      userCount: connectedUsers.length
    });

    if (connectedUsers.length === 2) {
      console.log('[READY] Two users connected, call can start');
      io.emit('ready-to-call', { userCount: 2 });
    } else {
      socket.emit('waiting', 'Waiting for another user to join...');
    }
  });

  // EVENT: offer
  socket.on('offer', (offer) => {
    console.log(`[OFFER] Received from ${socket.id}`);
    const otherUser = getOtherUser(socket.id);
    if (otherUser) {
      io.to(otherUser).emit('offer', offer);
      console.log(`[OFFER] Forwarded to ${otherUser}`);
    }
  });

  // EVENT: answer
  socket.on('answer', (answer) => {
    console.log(`[ANSWER] Received from ${socket.id}`);
    const otherUser = getOtherUser(socket.id);
    if (otherUser) {
      io.to(otherUser).emit('answer', answer);
      console.log(`[ANSWER] Forwarded to ${otherUser}`);
    }
  });

  // EVENT: ice-candidate
  socket.on('ice-candidate', (candidate) => {
    console.log(`[ICE] Candidate from ${socket.id}`);
    const otherUser = getOtherUser(socket.id);
    if (otherUser) {
      io.to(otherUser).emit('ice-candidate', candidate);
    }
  });

  // EVENT: leave-call
  socket.on('leave-call', () => {
    console.log(`[LEAVE] User ${socket.id} left the call`);
    handleUserLeave(socket);
  });

  // EVENT: disconnect
  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] User disconnected: ${socket.id}`);
    handleUserLeave(socket);
  });

  function handleUserLeave(socket) {
    if (connectedUsers.includes(socket.id)) {
      removeUser(socket.id);
      console.log(`[LEAVE] Removed user. Remaining users: ${connectedUsers.length}`);

      const remainingUser = connectedUsers[0];
      if (remainingUser) {
        io.to(remainingUser).emit('user-left', 'The other user has left the call');
      }
    }
  }
});

// ============================================
// API ENDPOINTS
// ============================================
app.get('/api/status', (req, res) => {
  res.json({
    connectedUsers: connectedUsers.length,
    maxUsers: MAX_USERS,
    isCallFull: connectedUsers.length >= MAX_USERS
  });
});

// ============================================
// SERVE ANGULAR APP FOR ALL OTHER ROUTES
// This enables Angular routing to work
// ============================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log('========================================');
  console.log('  Video Call App - Combined Server');
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  Join Code: ${JOIN_CODE}`);
  console.log('========================================');
});
