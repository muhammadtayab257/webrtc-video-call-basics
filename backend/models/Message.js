/**
 * Message Model - Database operations for chat messages
 */

const { query } = require('../config/database');

const Message = {
  // Create a new message
  async create(roomId, userId, content, messageType = 'text') {
    const result = await query(
      `INSERT INTO messages (room_id, user_id, content, message_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [roomId, userId, content, messageType]
    );
    return result.rows[0];
  },

  // Get messages for a room (with pagination)
  async getByRoom(roomId, limit = 50, offset = 0) {
    const result = await query(
      `SELECT m.*, u.username, u.avatar_url
       FROM messages m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.room_id = $1
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [roomId, limit, offset]
    );
    // Reverse to get chronological order
    return result.rows.reverse();
  },

  // Get message by ID
  async findById(id) {
    const result = await query(
      `SELECT m.*, u.username, u.avatar_url
       FROM messages m
       LEFT JOIN users u ON m.user_id = u.id
       WHERE m.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  // Get message count for a room
  async getCount(roomId) {
    const result = await query(
      'SELECT COUNT(*) FROM messages WHERE room_id = $1',
      [roomId]
    );
    return parseInt(result.rows[0].count);
  },

  // Delete message (by message owner)
  async delete(id, userId) {
    const result = await query(
      'DELETE FROM messages WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  },

  // Create system message (for join/leave notifications)
  async createSystemMessage(roomId, content) {
    const result = await query(
      `INSERT INTO messages (room_id, content, message_type)
       VALUES ($1, $2, 'system')
       RETURNING *`,
      [roomId, content]
    );
    return result.rows[0];
  }
};

module.exports = Message;
