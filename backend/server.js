import express from 'express';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import http from 'http';

// Import routes
import authRoutes from './routes/auth.js';
import dataRoutes from './routes/data.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const WS_PORT = process.env.WS_PORT || 3002;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/data', dataRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ port: WS_PORT });

const clients = new Set();

wss.on('connection', (ws, req) => {
  console.log(`🔌 WebSocket client connected (${clients.size + 1} total)`);
  clients.add(ws);

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`❌ WebSocket client disconnected (${clients.size} remaining)`);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to KSEBL monitoring server',
    timestamp: new Date().toISOString()
  }));
});

// Broadcast function (available to routes via app.locals)
app.locals.broadcastData = (data) => {
  const message = JSON.stringify({
    type: 'sensor_data',
    data,
    timestamp: new Date().toISOString()
  });

  let sentCount = 0;
  clients.forEach((client) => {
    if (client.readyState === 1) { // OPEN state
      client.send(message);
      sentCount++;
    }
  });

  if (sentCount > 0) {
    console.log(`📡 Broadcasted to ${sentCount} WebSocket client(s)`);
  }
};

// Start servers
server.listen(PORT, () => {
  console.log(`\n🚀 KSEBL Backend Server Started`);
  console.log(`==================================`);
  console.log(`📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`🔌 WebSocket Server: ws://localhost:${WS_PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
  console.log(`==================================\n`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed');
    wss.close(() => {
      console.log('WebSocket server closed');
      process.exit(0);
    });
  });
});

export default app;
