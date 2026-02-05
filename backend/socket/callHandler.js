/**
 * Call Socket Handler
 * Handles WebRTC signaling for video/audio calls
 */

const Room = require('../models/Room');

// Track active calls per room
const activeCallsPerRoom = new Map(); // roomId -> Set of userIds in call

module.exports = (io, socket) => {
  // User starts/joins a call in a room
  socket.on('join-call', async (data) => {
    try {
      const { roomId } = data;
      const userId = socket.userId;

      // Verify user is participant
      const isParticipant = await Room.isParticipant(roomId, userId);
      if (!isParticipant) {
        socket.emit('call-error', 'Not a participant of this room');
        return;
      }

      // Track user in call
      if (!activeCallsPerRoom.has(roomId)) {
        activeCallsPerRoom.set(roomId, new Set());
      }
      const callParticipants = activeCallsPerRoom.get(roomId);

      // Check if call is full (max 4 users)
      if (callParticipants.size >= 4 && !callParticipants.has(userId)) {
        socket.emit('call-error', 'Call is full (max 4 participants)');
        return;
      }

      callParticipants.add(userId);

      // Join call-specific room
      socket.join(`call:${roomId}`);

      // Get other participants in call
      const socketsInCall = await io.in(`call:${roomId}`).fetchSockets();
      const otherParticipants = socketsInCall
        .filter(s => s.userId !== userId)
        .map(s => ({
          id: s.userId,
          username: s.user.username,
          socketId: s.id
        }));

      // Notify user of existing participants
      socket.emit('call-joined', {
        roomId,
        participants: otherParticipants
      });

      // Notify others that user joined call
      socket.to(`call:${roomId}`).emit('user-joined-call', {
        userId: socket.userId,
        username: socket.user.username,
        socketId: socket.id
      });

      console.log(`[CALL] ${socket.user.username} joined call in room ${roomId}`);
    } catch (error) {
      console.error('[CALL] Join call error:', error);
      socket.emit('call-error', 'Failed to join call');
    }
  });

  // WebRTC offer (to specific user)
  socket.on('offer', (data) => {
    const { targetSocketId, offer, roomId } = data;
    console.log(`[CALL] Offer from ${socket.user.username} to ${targetSocketId}`);

    io.to(targetSocketId).emit('offer', {
      offer,
      fromUserId: socket.userId,
      fromUsername: socket.user.username,
      fromSocketId: socket.id,
      roomId
    });
  });

  // WebRTC answer (to specific user)
  socket.on('answer', (data) => {
    const { targetSocketId, answer, roomId } = data;
    console.log(`[CALL] Answer from ${socket.user.username} to ${targetSocketId}`);

    io.to(targetSocketId).emit('answer', {
      answer,
      fromUserId: socket.userId,
      fromSocketId: socket.id,
      roomId
    });
  });

  // ICE candidate (to specific user)
  socket.on('ice-candidate', (data) => {
    const { targetSocketId, candidate, roomId } = data;

    io.to(targetSocketId).emit('ice-candidate', {
      candidate,
      fromUserId: socket.userId,
      fromSocketId: socket.id,
      roomId
    });
  });

  // Leave call
  socket.on('leave-call', async (data) => {
    try {
      const { roomId } = data;
      const userId = socket.userId;

      // Remove from tracking
      const callParticipants = activeCallsPerRoom.get(roomId);
      if (callParticipants) {
        callParticipants.delete(userId);
        if (callParticipants.size === 0) {
          activeCallsPerRoom.delete(roomId);
        }
      }

      // Leave call room
      socket.leave(`call:${roomId}`);

      // Notify others
      socket.to(`call:${roomId}`).emit('user-left-call', {
        userId: socket.userId,
        username: socket.user.username,
        socketId: socket.id
      });

      socket.emit('call-left', { roomId });

      console.log(`[CALL] ${socket.user.username} left call in room ${roomId}`);
    } catch (error) {
      console.error('[CALL] Leave call error:', error);
    }
  });

  // Toggle audio/video
  socket.on('toggle-media', (data) => {
    const { roomId, mediaType, enabled } = data;

    socket.to(`call:${roomId}`).emit('user-toggled-media', {
      userId: socket.userId,
      mediaType, // 'audio' or 'video'
      enabled
    });
  });

  // Handle disconnect - clean up calls
  socket.on('disconnect', () => {
    // Remove user from all active calls
    activeCallsPerRoom.forEach((participants, roomId) => {
      if (participants.has(socket.userId)) {
        participants.delete(socket.userId);

        // Notify others in that call
        socket.to(`call:${roomId}`).emit('user-left-call', {
          userId: socket.userId,
          username: socket.user.username,
          socketId: socket.id
        });

        if (participants.size === 0) {
          activeCallsPerRoom.delete(roomId);
        }
      }
    });
  });
};
