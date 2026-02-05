/**
 * Video Call App - Main Server
 * Full-featured WebRTC application with:
 * - User authentication (JWT)
 * - Room management
 * - Real-time chat
 * - Multi-user video calls (up to 4)
 */

require('dotenv').config();

const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const roomRoutes = require('./routes/rooms');
const messageRoutes = require('./routes/messages');

// Import socket initialization
const { initializeSocket } = require('./socket');

// Initialize Express app
const app = express();
const server = http.createServer(app);

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from 'public' folder (Angular build)
app.use(express.static(path.join(__dirname, 'public')));

// ============================================
// API ROUTES
// ============================================
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// ============================================
// SOCKET.IO INITIALIZATION
// ============================================
const io = initializeSocket(server);

// ============================================
// SERVE ANGULAR APP (SPA fallback)
// ============================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================
// ERROR HANDLING
// ============================================
app.use((err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============================================
// START SERVER
// ============================================
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log('========================================');
  console.log('  Video Call App - Full Featured');
  console.log(`  Server: http://localhost:${PORT}`);
  console.log(`  API: http://localhost:${PORT}/api`);
  console.log('========================================');
  console.log('  Endpoints:');
  console.log('  - POST /api/auth/signup');
  console.log('  - POST /api/auth/login');
  console.log('  - GET  /api/auth/me');
  console.log('  - GET  /api/rooms');
  console.log('  - POST /api/rooms');
  console.log('  - POST /api/rooms/join');
  console.log('========================================');
});
