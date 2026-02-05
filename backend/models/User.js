/**
 * User Model - Database operations for users
 */

const { query } = require('../config/database');
const bcrypt = require('bcryptjs');

const User = {
  // Create a new user
  async create(email, password, username) {
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (email, password_hash, username)
       VALUES ($1, $2, $3)
       RETURNING id, email, username, avatar_url, is_online, created_at`,
      [email, passwordHash, username]
    );
    return result.rows[0];
  },

  // Find user by email
  async findByEmail(email) {
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  },

  // Find user by ID
  async findById(id) {
    const result = await query(
      'SELECT id, email, username, avatar_url, is_online, last_seen, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  // Verify password
  async verifyPassword(password, passwordHash) {
    return await bcrypt.compare(password, passwordHash);
  },

  // Update online status
  async setOnlineStatus(id, isOnline) {
    const result = await query(
      `UPDATE users SET is_online = $1, last_seen = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [isOnline, id]
    );
    return result.rows[0];
  },

  // Update user profile
  async update(id, updates) {
    const { username, avatar_url } = updates;
    const result = await query(
      `UPDATE users SET username = COALESCE($1, username), avatar_url = COALESCE($2, avatar_url)
       WHERE id = $3
       RETURNING id, email, username, avatar_url, is_online, created_at`,
      [username, avatar_url, id]
    );
    return result.rows[0];
  },

  // Get all online users
  async getOnlineUsers() {
    const result = await query(
      'SELECT id, username, avatar_url FROM users WHERE is_online = true'
    );
    return result.rows;
  }
};

module.exports = User;
