/**
 * Room Routes
 */

const express = require('express');
const router = express.Router();
const {
  createRoom,
  getUserRooms,
  getRoomByCode,
  joinRoom,
  leaveRoom,
  deleteRoom,
  getParticipants
} = require('../controllers/roomController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Room operations
router.post('/', createRoom);           // Create room
router.get('/', getUserRooms);          // Get user's rooms
router.get('/:code', getRoomByCode);    // Get room by code
router.post('/join', joinRoom);         // Join room by code
router.post('/:id/leave', leaveRoom);   // Leave room
router.delete('/:id', deleteRoom);      // Delete room
router.get('/:id/participants', getParticipants); // Get participants

module.exports = router;
