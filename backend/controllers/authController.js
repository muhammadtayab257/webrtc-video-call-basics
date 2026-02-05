/**
 * Authentication Controller
 * Handles user signup, login, and profile operations
 */

const User = require('../models/User');
const { generateToken } = require('../middleware/auth');

// Signup - Create new user
const signup = async (req, res) => {
  try {
    const { email, password, username } = req.body;

    // Validation
    if (!email || !password || !username) {
      return res.status(400).json({ error: 'Email, password, and username are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user
    const user = await User.create(email, password, username);

    // Generate token
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('[AUTH] Signup error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// Login - Authenticate user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValid = await User.verifyPassword(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user.id);

    // Update online status
    await User.setOnlineStatus(user.id, true);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get current user profile
const getMe = async (req, res) => {
  try {
    const user = req.user;
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url,
        is_online: user.is_online,
        created_at: user.created_at
      }
    });
  } catch (error) {
    console.error('[AUTH] GetMe error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
};

// Logout - Update online status
const logout = async (req, res) => {
  try {
    await User.setOnlineStatus(req.userId, false);
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('[AUTH] Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Update profile
const updateProfile = async (req, res) => {
  try {
    const { username, avatar_url } = req.body;
    const user = await User.update(req.userId, { username, avatar_url });
    res.json({
      message: 'Profile updated',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: user.avatar_url
      }
    });
  } catch (error) {
    console.error('[AUTH] Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

module.exports = {
  signup,
  login,
  getMe,
  logout,
  updateProfile
};
