/**
 * Generate unique room codes
 */

const Room = require('../models/Room');

// Generate a random alphanumeric code
const generateRandomCode = (length = 6) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars (0, O, 1, I)
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Generate unique room code (checks database)
const generateUniqueCode = async (maxAttempts = 10) => {
  for (let i = 0; i < maxAttempts; i++) {
    const code = generateRandomCode();
    const exists = await Room.codeExists(code);
    if (!exists) {
      return code;
    }
  }
  throw new Error('Failed to generate unique room code');
};

module.exports = {
  generateRandomCode,
  generateUniqueCode
};
