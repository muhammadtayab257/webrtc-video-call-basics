/**
 * Socket.IO Main Setup
 * Initializes socket handlers
 */

const { Server } = require('socket.io');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');
const roomHandler = require('./roomHandler');
const chatHandler = require('./chatHandler');
const callHandler = require('./callHandler');

// Store socket connections by user ID
const userSockets = new Map(); // userId -> Set of socketIds
const socketUsers = new Map(); // socketId -> userId

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return next(new Error('Invalid token'));
      }

      const user = await User.findById(decoded.userId);
      if (!user) {
        return next(new Error('User not found'));
      }

      // Attach user to socket
      socket.userId = user.id;
      socket.user = user;

      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    console.log(`[SOCKET] User connected: ${socket.user.username} (${socket.id})`);

    // Track user's socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);
    socketUsers.set(socket.id, userId);

    // Update user online status
    await User.setOnlineStatus(userId, true);

    // Send authentication success
    socket.emit('authenticated', {
      user: {
        id: socket.user.id,
        username: socket.user.username,
        avatar_url: socket.user.avatar_url
      }
    });

    // Initialize handlers
    roomHandler(io, socket, userSockets);
    chatHandler(io, socket);
    callHandler(io, socket);

    // Handle disconnect
    socket.on('disconnect', async () => {
      console.log(`[SOCKET] User disconnected: ${socket.user.username} (${socket.id})`);

      // Remove socket from tracking
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          userSockets.delete(userId);
          // Update user offline status only if no more connections
          await User.setOnlineStatus(userId, false);
        }
      }
      socketUsers.delete(socket.id);

      // Notify rooms user was in
      const rooms = Array.from(socket.rooms).filter(r => r !== socket.id);
      rooms.forEach(room => {
        socket.to(room).emit('user-left', {
          userId: socket.user.id,
          username: socket.user.username
        });
      });
    });
  });

  return io;
};

module.exports = {
  initializeSocket,
  userSockets,
  socketUsers
};
