/**
 * Room Socket Handler
 * Handles room join/leave events via WebSocket
 */

const Room = require('../models/Room');
const Message = require('../models/Message');

module.exports = (io, socket, userSockets) => {
  // Join a room
  socket.on('join-room', async (roomCode) => {
    try {
      const userId = socket.userId;
      const code = roomCode.toUpperCase();

      // Find room
      const room = await Room.findByCode(code);
      if (!room) {
        socket.emit('room-error', 'Room not found');
        return;
      }

      // Check if user is a participant (in database)
      let isParticipant = await Room.isParticipant(room.id, userId);

      if (!isParticipant) {
        // Check if room is full
        const participantCount = await Room.getParticipantCount(room.id);
        if (participantCount >= room.max_participants) {
          socket.emit('room-error', 'Room is full');
          return;
        }

        // Add user as participant
        await Room.addParticipant(room.id, userId);

        // Create system message
        await Message.createSystemMessage(room.id, `${socket.user.username} joined the room`);
      }

      // Join socket room
      socket.join(`room:${room.id}`);

      // Get participants
      const participants = await Room.getParticipants(room.id);

      // Notify user
      socket.emit('room-joined', {
        room: {
          id: room.id,
          name: room.name,
          code: room.code,
          max_participants: room.max_participants
        },
        participants
      });

      // Notify others in the room
      socket.to(`room:${room.id}`).emit('user-joined', {
        userId: socket.user.id,
        username: socket.user.username,
        avatar_url: socket.user.avatar_url
      });

      console.log(`[ROOM] ${socket.user.username} joined room ${room.name}`);
    } catch (error) {
      console.error('[ROOM] Join error:', error);
      socket.emit('room-error', 'Failed to join room');
    }
  });

  // Leave a room
  socket.on('leave-room', async (roomCode) => {
    try {
      const userId = socket.userId;
      const code = roomCode.toUpperCase();

      const room = await Room.findByCode(code);
      if (!room) return;

      // Leave socket room
      socket.leave(`room:${room.id}`);

      // Create system message
      await Message.createSystemMessage(room.id, `${socket.user.username} left the room`);

      // Notify others
      socket.to(`room:${room.id}`).emit('user-left', {
        userId: socket.user.id,
        username: socket.user.username
      });

      // Notify user
      socket.emit('room-left', { roomCode: code });

      console.log(`[ROOM] ${socket.user.username} left room ${room.name}`);
    } catch (error) {
      console.error('[ROOM] Leave error:', error);
    }
  });

  // Get users currently in room (online in socket room)
  socket.on('get-room-users', async (roomCode) => {
    try {
      const code = roomCode.toUpperCase();
      const room = await Room.findByCode(code);
      if (!room) {
        socket.emit('room-error', 'Room not found');
        return;
      }

      const participants = await Room.getParticipants(room.id);

      // Filter to only online users (in socket room)
      const socketsInRoom = await io.in(`room:${room.id}`).fetchSockets();
      const onlineUserIds = socketsInRoom.map(s => s.userId);

      const onlineParticipants = participants.map(p => ({
        ...p,
        is_online: onlineUserIds.includes(p.id)
      }));

      socket.emit('room-users', onlineParticipants);
    } catch (error) {
      console.error('[ROOM] Get users error:', error);
    }
  });
};
