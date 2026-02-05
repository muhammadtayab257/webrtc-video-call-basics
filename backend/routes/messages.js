/**
 * Message Routes
 */

const express = require('express');
const router = express.Router();
const { getMessages, sendMessage, deleteMessage } = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Message operations
router.get('/:roomId', getMessages);        // Get messages for room
router.post('/:roomId', sendMessage);       // Send message (REST alternative)
router.delete('/:messageId', deleteMessage); // Delete message

module.exports = router;
