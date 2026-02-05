/**
 * Room Model - Database operations for rooms
 */

const { query } = require('../config/database');

const Room = {
  // Create a new room
  async create(name, code, createdBy, isPrivate = false, maxParticipants = 4) {
    const result = await query(
      `INSERT INTO rooms (name, code, created_by, is_private, max_participants)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, code, createdBy, isPrivate, maxParticipants]
    );
    return result.rows[0];
  },

  // Find room by code
  async findByCode(code) {
    const result = await query(
      `SELECT r.*, u.username as creator_name
       FROM rooms r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.code = $1`,
      [code]
    );
    return result.rows[0];
  },

  // Find room by ID
  async findById(id) {
    const result = await query(
      `SELECT r.*, u.username as creator_name
       FROM rooms r
       LEFT JOIN users u ON r.created_by = u.id
       WHERE r.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  // Get rooms for a user (rooms they've joined)
  async getUserRooms(userId) {
    const result = await query(
      `SELECT r.*, u.username as creator_name,
        (SELECT COUNT(*) FROM room_participants WHERE room_id = r.id AND is_active = true) as participant_count
       FROM rooms r
       LEFT JOIN users u ON r.created_by = u.id
       INNER JOIN room_participants rp ON r.id = rp.room_id
       WHERE rp.user_id = $1
       ORDER BY rp.joined_at DESC`,
      [userId]
    );
    return result.rows;
  },

  // Add participant to room
  async addParticipant(roomId, userId) {
    const result = await query(
      `INSERT INTO room_participants (room_id, user_id, is_active)
       VALUES ($1, $2, true)
       ON CONFLICT (room_id, user_id) DO UPDATE SET is_active = true, joined_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [roomId, userId]
    );
    return result.rows[0];
  },

  // Remove participant from room
  async removeParticipant(roomId, userId) {
    const result = await query(
      `UPDATE room_participants SET is_active = false WHERE room_id = $1 AND user_id = $2 RETURNING *`,
      [roomId, userId]
    );
    return result.rows[0];
  },

  // Get active participants in a room
  async getParticipants(roomId) {
    const result = await query(
      `SELECT u.id, u.username, u.avatar_url, u.is_online, rp.joined_at
       FROM users u
       INNER JOIN room_participants rp ON u.id = rp.user_id
       WHERE rp.room_id = $1 AND rp.is_active = true
       ORDER BY rp.joined_at`,
      [roomId]
    );
    return result.rows;
  },

  // Get participant count
  async getParticipantCount(roomId) {
    const result = await query(
      'SELECT COUNT(*) FROM room_participants WHERE room_id = $1 AND is_active = true',
      [roomId]
    );
    return parseInt(result.rows[0].count);
  },

  // Check if user is participant
  async isParticipant(roomId, userId) {
    const result = await query(
      'SELECT * FROM room_participants WHERE room_id = $1 AND user_id = $2 AND is_active = true',
      [roomId, userId]
    );
    return result.rows.length > 0;
  },

  // Delete room (only by creator)
  async delete(id, userId) {
    const result = await query(
      'DELETE FROM rooms WHERE id = $1 AND created_by = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  },

  // Check if code exists
  async codeExists(code) {
    const result = await query('SELECT id FROM rooms WHERE code = $1', [code]);
    return result.rows.length > 0;
  }
};

module.exports = Room;
