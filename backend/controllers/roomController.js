/**
 * Room Controller
 * Handles room creation, joining, and management
 */

const Room = require('../models/Room');
const { generateUniqueCode } = require('../utils/generateCode');

// Create a new room
const createRoom = async (req, res) => {
  try {
    const { name, isPrivate, maxParticipants } = req.body;
    const userId = req.userId;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Room name is required' });
    }

    // Generate unique code
    const code = await generateUniqueCode();

    // Create room
    const room = await Room.create(
      name.trim(),
      code,
      userId,
      isPrivate || false,
      maxParticipants || 4
    );

    // Add creator as participant
    await Room.addParticipant(room.id, userId);

    res.status(201).json({
      message: 'Room created successfully',
      room: {
        ...room,
        participant_count: 1
      }
    });
  } catch (error) {
    console.error('[ROOM] Create error:', error);
    res.status(500).json({ error: 'Failed to create room' });
  }
};

// Get user's rooms
const getUserRooms = async (req, res) => {
  try {
    const rooms = await Room.getUserRooms(req.userId);
    res.json({ rooms });
  } catch (error) {
    console.error('[ROOM] Get rooms error:', error);
    res.status(500).json({ error: 'Failed to get rooms' });
  }
};

// Get room by code
const getRoomByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const room = await Room.findByCode(code.toUpperCase());

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get participants
    const participants = await Room.getParticipants(room.id);

    res.json({
      room: {
        ...room,
        participants
      }
    });
  } catch (error) {
    console.error('[ROOM] Get room error:', error);
    res.status(500).json({ error: 'Failed to get room' });
  }
};

// Join room by code
const joinRoom = async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.userId;

    if (!code) {
      return res.status(400).json({ error: 'Room code is required' });
    }

    // Find room
    const room = await Room.findByCode(code.toUpperCase());
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Check participant count
    const participantCount = await Room.getParticipantCount(room.id);
    if (participantCount >= room.max_participants) {
      return res.status(400).json({ error: 'Room is full' });
    }

    // Check if already participant
    const isParticipant = await Room.isParticipant(room.id, userId);
    if (isParticipant) {
      return res.json({
        message: 'Already a participant',
        room
      });
    }

    // Add as participant
    await Room.addParticipant(room.id, userId);

    // Get updated participants
    const participants = await Room.getParticipants(room.id);

    res.json({
      message: 'Joined room successfully',
      room: {
        ...room,
        participants
      }
    });
  } catch (error) {
    console.error('[ROOM] Join error:', error);
    res.status(500).json({ error: 'Failed to join room' });
  }
};

// Leave room
const leaveRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    await Room.removeParticipant(parseInt(id), userId);

    res.json({ message: 'Left room successfully' });
  } catch (error) {
    console.error('[ROOM] Leave error:', error);
    res.status(500).json({ error: 'Failed to leave room' });
  }
};

// Delete room (owner only)
const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const room = await Room.delete(parseInt(id), userId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found or not authorized' });
    }

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('[ROOM] Delete error:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
};

// Get room participants
const getParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const participants = await Room.getParticipants(parseInt(id));
    res.json({ participants });
  } catch (error) {
    console.error('[ROOM] Get participants error:', error);
    res.status(500).json({ error: 'Failed to get participants' });
  }
};

module.exports = {
  createRoom,
  getUserRooms,
  getRoomByCode,
  joinRoom,
  leaveRoom,
  deleteRoom,
  getParticipants
};
