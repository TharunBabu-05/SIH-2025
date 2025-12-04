import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ExcelLogger {
  constructor(filePath = './data/logs.xlsx') {
    this.filePath = path.resolve(__dirname, '..', filePath);
    this.lockFile = `${this.filePath}.lock`;
    this.ensureFileExists();
  }

  /**
   * Ensure Excel file exists with proper headers
   */
  ensureFileExists() {
    const dir = path.dirname(this.filePath);
    
    // Create directory if not exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Create file if not exists
    if (!fs.existsSync(this.filePath)) {
      const wb = XLSX.utils.book_new();
      const headers = [
        'Date',
        'Time',
        'R_V',
        'Y_V',
        'B_V',
        'R_I',
        'Y_I',
        'B_I',
        'Fault',
        'Fault_Type'
      ];
      
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 12 }, // Date
        { wch: 10 }, // Time
        { wch: 8 },  // R_V
        { wch: 8 },  // Y_V
        { wch: 8 },  // B_V
        { wch: 8 },  // R_I
        { wch: 8 },  // Y_I
        { wch: 8 },  // B_I
        { wch: 8 },  // Fault
        { wch: 15 }  // Fault_Type
      ];
      
      XLSX.utils.book_append_sheet(wb, ws, 'Sensor Data');
      XLSX.writeFile(wb, this.filePath);
      console.log(`✅ Created new Excel log file: ${this.filePath}`);
    }
  }

  /**
   * Acquire lock for atomic writes
   */
  async acquireLock(timeout = 5000) {
    const startTime = Date.now();
    
    while (fs.existsSync(this.lockFile)) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Lock acquisition timeout');
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    fs.writeFileSync(this.lockFile, process.pid.toString());
  }

  /**
   * Release lock
   */
  releaseLock() {
    if (fs.existsSync(this.lockFile)) {
      fs.unlinkSync(this.lockFile);
    }
  }

  /**
   * Append data to Excel file (atomic operation)
   * @param {Object} data - ESP32 data packet
   */
  async appendData(data) {
    try {
      await this.acquireLock();

      // Parse timestamp
      const timestamp = new Date(data.timestamp || Date.now());
      const date = timestamp.toISOString().split('T')[0];
      const time = timestamp.toTimeString().split(' ')[0];

      // Prepare row data
      const rowData = [
        date,
        time,
        parseFloat(data.R_V || 0).toFixed(2),
        parseFloat(data.Y_V || 0).toFixed(2),
        parseFloat(data.B_V || 0).toFixed(2),
        parseFloat(data.R_I || 0).toFixed(3),
        parseFloat(data.Y_I || 0).toFixed(3),
        parseFloat(data.B_I || 0).toFixed(3),
        data.fault ? 'YES' : 'NO',
        data.fault_type || 'None'
      ];

      // Read existing workbook
      const wb = XLSX.readFile(this.filePath);
      const ws = wb.Sheets['Sensor Data'];

      // Get current data range
      const range = XLSX.utils.decode_range(ws['!ref']);
      const newRowIndex = range.e.r + 1;

      // Append new row
      XLSX.utils.sheet_add_aoa(ws, [rowData], { origin: newRowIndex });

      // Update range
      range.e.r = newRowIndex;
      ws['!ref'] = XLSX.utils.encode_range(range);

      // Write back to file
      XLSX.writeFile(wb, this.filePath);

      this.releaseLock();

      console.log(`📝 Appended row ${newRowIndex}: ${date} ${time} | Fault: ${data.fault}`);
      
      return {
        success: true,
        rowIndex: newRowIndex,
        timestamp: data.timestamp
      };

    } catch (error) {
      this.releaseLock();
      console.error('❌ Excel append error:', error);
      throw error;
    }
  }

  /**
   * Get recent data (last N rows)
   * @param {number} count - Number of rows to retrieve
   */
  getRecentData(count = 100) {
    try {
      const wb = XLSX.readFile(this.filePath);
      const ws = wb.Sheets['Sensor Data'];
      const data = XLSX.utils.sheet_to_json(ws);
      
      // Return last N rows
      return data.slice(-count);
    } catch (error) {
      console.error('Error reading Excel data:', error);
      return [];
    }
  }

  /**
   * Get data for specific date range
   */
  getDataByDateRange(startDate, endDate) {
    try {
      const wb = XLSX.readFile(this.filePath);
      const ws = wb.Sheets['Sensor Data'];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      return data.filter(row => {
        const rowDate = new Date(row.Date);
        return rowDate >= start && rowDate <= end;
      });
    } catch (error) {
      console.error('Error filtering data:', error);
      return [];
    }
  }

  /**
   * Get fault events
   */
  getFaultEvents(limit = 50) {
    try {
      const wb = XLSX.readFile(this.filePath);
      const ws = wb.Sheets['Sensor Data'];
      const data = XLSX.utils.sheet_to_json(ws);
      
      return data
        .filter(row => row.Fault === 'YES')
        .slice(-limit)
        .reverse();
    } catch (error) {
      console.error('Error reading fault events:', error);
      return [];
    }
  }

  /**
   * Calculate 24-hour statistics per phase
   */
  get24HourStats() {
    try {
      const wb = XLSX.readFile(this.filePath);
      const ws = wb.Sheets['Sensor Data'];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const last24h = data.filter(row => {
        const rowDate = new Date(`${row.Date} ${row.Time}`);
        return rowDate >= yesterday;
      });

      if (last24h.length === 0) {
        return null;
      }

      const calculateStats = (values) => {
        const nums = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        return {
          avg: (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2),
          min: Math.min(...nums).toFixed(2),
          max: Math.max(...nums).toFixed(2)
        };
      };

      return {
        R_Phase: {
          voltage: calculateStats(last24h.map(r => r.R_V)),
          current: calculateStats(last24h.map(r => r.R_I))
        },
        Y_Phase: {
          voltage: calculateStats(last24h.map(r => r.Y_V)),
          current: calculateStats(last24h.map(r => r.Y_I))
        },
        B_Phase: {
          voltage: calculateStats(last24h.map(r => r.B_V)),
          current: calculateStats(last24h.map(r => r.B_I))
        },
        dataPoints: last24h.length,
        period: '24 hours'
      };
    } catch (error) {
      console.error('Error calculating stats:', error);
      return null;
    }
  }

  /**
   * Create backup of Excel file
   */
  createBackup() {
    try {
      const backupDir = path.resolve(__dirname, '..', 'data', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `logs_backup_${timestamp}.xlsx`);
      
      fs.copyFileSync(this.filePath, backupPath);
      console.log(`📦 Backup created: ${backupPath}`);
      
      return backupPath;
    } catch (error) {
      console.error('Backup error:', error);
      throw error;
    }
  }
}

export default ExcelLogger;
