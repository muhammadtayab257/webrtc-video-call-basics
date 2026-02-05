/**
 * Chat Socket Handler
 * Handles real-time messaging
 */

const Message = require('../models/Message');
const Room = require('../models/Room');

module.exports = (io, socket) => {
  // Send message to room
  socket.on('send-message', async (data) => {
    try {
      const { roomId, content } = data;
      const userId = socket.userId;

      if (!content || content.trim().length === 0) {
        socket.emit('message-error', 'Message cannot be empty');
        return;
      }

      // Verify user is participant
      const isParticipant = await Room.isParticipant(roomId, userId);
      if (!isParticipant) {
        socket.emit('message-error', 'Not a participant of this room');
        return;
      }

      // Save message to database
      const message = await Message.create(roomId, userId, content.trim());

      // Get full message with user info
      const fullMessage = await Message.findById(message.id);

      // Broadcast to all in room (including sender)
      io.to(`room:${roomId}`).emit('new-message', fullMessage);

      console.log(`[CHAT] ${socket.user.username} sent message in room ${roomId}`);
    } catch (error) {
      console.error('[CHAT] Send message error:', error);
      socket.emit('message-error', 'Failed to send message');
    }
  });

  // Typing indicator
  socket.on('typing-start', (data) => {
    const { roomId } = data;
    socket.to(`room:${roomId}`).emit('user-typing', {
      userId: socket.userId,
      username: socket.user.username
    });
  });

  socket.on('typing-stop', (data) => {
    const { roomId } = data;
    socket.to(`room:${roomId}`).emit('user-stopped-typing', {
      userId: socket.userId
    });
  });
};
