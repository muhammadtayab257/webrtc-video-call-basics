/**
 * Authentication Routes
 */

const express = require('express');
const router = express.Router();
const { signup, login, getMe, logout, updateProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.put('/profile', authenticate, updateProfile);

module.exports = router;
