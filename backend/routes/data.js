import express from 'express';
import ExcelLogger from '../services/excelLogger.js';
import { authenticateToken, requireEngineer } from '../middleware/auth.js';
import { validateSensorData } from '../middleware/validation.js';
import fs from 'fs';

const router = express.Router();
const logger = new ExcelLogger();

/**
 * POST /api/data
 * Receive data from ESP32 (no auth required for ESP32 endpoint)
 */
router.post('/', validateSensorData, async (req, res) => {
  try {
    const result = await logger.appendData(req.body);
    
    // Broadcast to WebSocket clients (handled in server.js)
    req.app.locals.broadcastData(req.body);
    
    res.json({
      success: true,
      message: 'Data logged successfully',
      ...result
    });
  } catch (error) {
    console.error('Data logging error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log data'
    });
  }
});

/**
 * GET /api/data/recent
 * Get recent sensor readings (authenticated)
 */
router.get('/recent', authenticateToken, (req, res) => {
  try {
    const count = parseInt(req.query.count) || 12; // Default: last 12 samples (3 hours)
    const data = logger.getRecentData(count);
    
    res.json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve data'
    });
  }
});

/**
 * GET /api/data/stats
 * Get 24-hour statistics (engineer only)
 */
router.get('/stats', authenticateToken, requireEngineer, (req, res) => {
  try {
    const stats = logger.get24HourStats();
    
    if (!stats) {
      return res.json({
        success: true,
        message: 'No data available for the last 24 hours',
        stats: null
      });
    }
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to calculate statistics'
    });
  }
});

/**
 * GET /api/data/faults
 * Get fault events (engineer only)
 */
router.get('/faults', authenticateToken, requireEngineer, (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const faults = logger.getFaultEvents(limit);
    
    res.json({
      success: true,
      faults,
      count: faults.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve fault events'
    });
  }
});

/**
 * GET /api/data/download
 * Download Excel file (engineer only)
 */
router.get('/download', authenticateToken, requireEngineer, (req, res) => {
  try {
    const filePath = logger.filePath;
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Log file not found'
      });
    }
    
    res.download(filePath, 'ksebl_sensor_logs.xlsx', (err) => {
      if (err) {
        console.error('Download error:', err);
        res.status(500).json({
          success: false,
          error: 'Failed to download file'
        });
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to process download'
    });
  }
});

/**
 * POST /api/data/backup
 * Create backup of Excel file (engineer only)
 */
router.post('/backup', authenticateToken, requireEngineer, (req, res) => {
  try {
    const backupPath = logger.createBackup();
    
    res.json({
      success: true,
      message: 'Backup created successfully',
      backupPath
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create backup'
    });
  }
});

export default router;
