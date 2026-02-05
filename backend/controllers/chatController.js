/**
 * Chat Controller
 * Handles message operations
 */

const Message = require('../models/Message');
const Room = require('../models/Room');

// Get messages for a room
const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    const userId = req.userId;

    // Check if user is participant
    const isParticipant = await Room.isParticipant(parseInt(roomId), userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not a participant of this room' });
    }

    const messages = await Message.getByRoom(
      parseInt(roomId),
      parseInt(limit),
      parseInt(offset)
    );

    const totalCount = await Message.getCount(parseInt(roomId));

    res.json({
      messages,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('[CHAT] Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
};

// Send message (used by REST API - alternative to socket)
const sendMessage = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content } = req.body;
    const userId = req.userId;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Check if user is participant
    const isParticipant = await Room.isParticipant(parseInt(roomId), userId);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Not a participant of this room' });
    }

    const message = await Message.create(
      parseInt(roomId),
      userId,
      content.trim()
    );

    // Get full message with user info
    const fullMessage = await Message.findById(message.id);

    res.status(201).json({
      message: fullMessage
    });
  } catch (error) {
    console.error('[CHAT] Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

// Delete message
const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.userId;

    const deleted = await Message.delete(parseInt(messageId), userId);
    if (!deleted) {
      return res.status(404).json({ error: 'Message not found or not authorized' });
    }

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('[CHAT] Delete message error:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
};

module.exports = {
  getMessages,
  sendMessage,
  deleteMessage
};
