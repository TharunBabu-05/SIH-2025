# KSEBL Backend + Enhanced Dashboard Deployment Guide

## 📁 Project Structure

```
website/
├── backend/                      # Node.js Express Backend
│   ├── server.js                # Main server with HTTP + WebSocket
│   ├── package.json             # Dependencies
│   ├── .env                     # Environment configuration
│   ├── data/
│   │   ├── logs.xlsx           # Excel log file (auto-created)
│   │   └── backups/            # Backup directory
│   ├── services/
│   │   ├── excelLogger.js      # Excel file operations (atomic writes)
│   │   └── authService.js      # JWT authentication
│   ├── middleware/
│   │   ├── auth.js             # JWT verification middleware
│   │   └── validation.js       # Input validation (Joi)
│   └── routes/
│       ├── auth.js             # Login, token verification
│       └── data.js             # Data logging, stats, download
│
├── src/                          # React Frontend
│   ├── components/
│   │   └── Dashboard.tsx        # Existing dashboard
│   ├── services/
│   │   ├── backendWebSocket.ts  # WebSocket client for backend
│   │   └── apiService.ts        # HTTP API client
│   └── ...
└── ...
```

---

## 🚀 Quick Start (Local Development)

### 1. Backend Setup

```bash
# Navigate to backend directory
cd C:\Semester-5\SIH-2025\website\backend

# Install dependencies (already done)
npm install

# Configure environment
# Edit .env file with your settings:
# - JWT_SECRET (CHANGE THIS!)
# - PORT (default: 3001)
# - WS_PORT (default: 3002)

# Start backend server
npm start

# Or use nodemon for development
npm run dev
```

**Backend will start on:**
- HTTP API: `http://localhost:3001`
- WebSocket: `ws://localhost:3002`

### 2. Frontend Setup

```bash
# Navigate to project root
cd C:\Semester-5\SIH-2025\website

# Install dependencies (if not already done)
npm install

# Create .env file for frontend
# Add: VITE_API_URL=http://localhost:3001
# Add: VITE_WS_URL=ws://localhost:3002

# Start frontend
npm run dev
```

**Frontend will run on:** `http://localhost:5173`

### 3. Test the System

**Default Login Credentials:**

| Role | Username | Password |
|------|----------|----------|
| High-level Engineer | `engineer` | `engineer123` |
| Lower-level Worker | `worker` | `worker123` |

---

## 📡 API Endpoints

### Authentication

#### POST `/api/auth/login`
```json
Request:
{
  "username": "engineer",
  "password": "engineer123"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "engineer",
    "role": "engineer",
    "name": "Senior Engineer"
  }
}
```

#### POST `/api/auth/verify`
```json
Request:
{
  "token": "your_jwt_token"
}

Response:
{
  "valid": true,
  "user": { ... }
}
```

### Data Endpoints

#### POST `/api/data` (ESP32 endpoint - no auth)
```json
Request:
{
  "timestamp": "2025-12-04T14:30:00.000Z",
  "R_V": 229.4,
  "Y_V": 231.0,
  "B_V": 228.9,
  "R_I": 3.2,
  "Y_I": 2.9,
  "B_I": 3.5,
  "fault": false,
  "fault_type": null
}

Response:
{
  "success": true,
  "message": "Data logged successfully",
  "rowIndex": 145,
  "timestamp": "2025-12-04T14:30:00.000Z"
}
```

#### GET `/api/data/recent?count=12` (Authenticated)
Get last N sensor readings

#### GET `/api/data/stats` (Engineer only)
Get 24-hour statistics

#### GET `/api/data/faults?limit=50` (Engineer only)
Get fault event list

#### GET `/api/data/download` (Engineer only)
Download Excel log file

#### POST `/api/data/backup` (Engineer only)
Create backup of Excel file

---

## 🔌 WebSocket Protocol

### Client → Server
No messages needed from client (broadcast only)

### Server → Client

**Connection Message:**
```json
{
  "type": "connected",
  "message": "Connected to KSEBL monitoring server",
  "timestamp": "2025-12-04T14:30:00.000Z"
}
```

**Sensor Data Broadcast:**
```json
{
  "type": "sensor_data",
  "data": {
    "timestamp": "2025-12-04T14:30:00.000Z",
    "R_V": 229.4,
    "Y_V": 231.0,
    "B_V": 228.9,
    "R_I": 3.2,
    "Y_I": 2.9,
    "B_I": 3.5,
    "fault": false,
    "fault_type": null
  },
  "timestamp": "2025-12-04T14:30:00.000Z"
}
```

---

## 🔐 Security Checklist

### ✅ Implemented

- [x] JWT authentication with role-based access
- [x] Input validation (Joi schemas)
- [x] Rate limiting (100 requests per 15 minutes)
- [x] CORS configuration
- [x] Password hashing (bcrypt)
- [x] Token expiration (7 days default)
- [x] Atomic file writes (lock mechanism)
- [x] Error handling middleware

### ⚠️ TODO for Production

- [ ] Use WSS (secure WebSocket) instead of WS
- [ ] HTTPS for HTTP API
- [ ] Move users to database (currently hardcoded)
- [ ] Implement refresh tokens
- [ ] Add request logging
- [ ] Set up firewall rules
- [ ] Configure file permissions (Excel file)
- [ ] Add API key for ESP32 endpoint
- [ ] Implement CSRF protection
- [ ] Add helmet.js for HTTP headers
- [ ] Set up SSL certificates
- [ ] Configure reverse proxy (Nginx)

---

## 📊 Excel File Schema

**File:** `backend/data/logs.xlsx`  
**Sheet:** `Sensor Data`

| Column | Type | Description |
|--------|------|-------------|
| Date | Date | YYYY-MM-DD format |
| Time | Time | HH:MM:SS format |
| R_V | Number | R-Phase Voltage (V) |
| Y_V | Number | Y-Phase Voltage (V) |
| B_V | Number | B-Phase Voltage (V) |
| R_I | Number | R-Phase Current (A) |
| Y_I | Number | Y-Phase Current (A) |
| B_I | Number | B-Phase Current (A) |
| Fault | Text | YES / NO |
| Fault_Type | Text | Fault description or None |

**Atomic Write Mechanism:**
1. Acquire lock file (`.lock`)
2. Read workbook
3. Append row
4. Write workbook
5. Release lock

**Prevents:** Race conditions, corrupted writes

---

## 🧪 Testing Guide

### Manual Testing

**1. Backend Health Check:**
```bash
curl http://localhost:3001/health
```

**2. Login Test:**
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"engineer","password":"engineer123"}'
```

**3. ESP32 Data Submission:**
```bash
curl -X POST http://localhost:3001/api/data \
  -H "Content-Type: application/json" \
  -d '{
    "timestamp": "2025-12-04T15:00:00.000Z",
    "R_V": 230.5,
    "Y_V": 229.8,
    "B_V": 231.2,
    "R_I": 3.4,
    "Y_I": 3.1,
    "B_I": 3.6,
    "fault": false,
    "fault_type": null
  }'
```

**4. Get Recent Data (with auth):**
```bash
curl http://localhost:3001/api/data/recent?count=5 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**5. WebSocket Test (JavaScript console):**
```javascript
const ws = new WebSocket('ws://localhost:3002');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

### Automated Tests

**TODO:** Create test files

```bash
# Unit tests for services
npm test

# Integration tests
# Test Excel logger
# Test auth service
# Test WebSocket broadcast
# Test role-based access
```

---

## 🚀 Production Deployment

### Option 1: PM2 (Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start backend with PM2
cd C:\Semester-5\SIH-2025\website\backend
pm2 start server.js --name ksebl-backend

# View logs
pm2 logs ksebl-backend

# Monitor
pm2 monit

# Save PM2 configuration
pm2 save

# Auto-start on boot
pm2 startup
```

### Option 2: systemd (Linux)

Create `/etc/systemd/system/ksebl-backend.service`:

```ini
[Unit]
Description=KSEBL Backend Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/ksebl/backend
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable ksebl-backend
sudo systemctl start ksebl-backend
sudo systemctl status ksebl-backend
```

### Option 3: Docker

Create `backend/Dockerfile`:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3001 3002
CMD ["node", "server.js"]
```

```bash
docker build -t ksebl-backend .
docker run -d -p 3001:3001 -p 3002:3002 --name ksebl ksebl-backend
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # HTTP API
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    # Frontend
    location / {
        root /var/www/ksebl/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 🔄 Migration to Cloud (Firestore)

**Current:** Local Excel file  
**Future:** Firebase Firestore + Cloud Storage

### Migration Steps:

1. **Keep ExcelLogger for local backup**
2. **Add Firestore parallel writes:**

```javascript
// In excelLogger.js
async appendData(data) {
  // Write to Excel (existing code)
  const excelResult = await this.writeToExcel(data);
  
  // Also write to Firestore
  try {
    await firestore.collection('sensorReadings').add({
      ...data,
      timestamp: new Date(data.timestamp)
    });
  } catch (error) {
    console.error('Firestore write failed:', error);
    // Excel write still succeeded
  }
  
  return excelResult;
}
```

3. **Upload Excel backups to Cloud Storage:**

```javascript
import { Storage } from '@google-cloud/storage';

async uploadBackup(filePath) {
  const storage = new Storage();
  const bucket = storage.bucket('ksebl-backups');
  
  await bucket.upload(filePath, {
    destination: `backups/${path.basename(filePath)}`
  });
}
```

---

## 📦 Environment Variables

### Backend `.env`

```bash
# Server
PORT=3001
WS_PORT=3002
NODE_ENV=production

# Security (CHANGE THESE!)
JWT_SECRET=your_long_random_secret_key_here
JWT_EXPIRES_IN=7d

# Files
EXCEL_FILE_PATH=./data/logs.xlsx
BACKUP_DIR=./data/backups

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

### Frontend `.env`

```bash
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3002
```

---

## 🐛 Troubleshooting

### Backend won't start

```bash
# Check if ports are in use
netstat -ano | findstr :3001
netstat -ano | findstr :3002

# Kill process on port
taskkill /PID <PID> /F
```

### Excel file corruption

```bash
# Restore from backup
cd backend/data/backups
# Copy latest backup to logs.xlsx
```

### WebSocket connection failed

- Check if backend is running on correct port
- Verify firewall allows port 3002
- Check browser console for errors
- Try `ws://` not `wss://` for local dev

### Authentication errors

- Verify JWT_SECRET is set in .env
- Check token hasn't expired
- Clear localStorage and login again

---

## 📞 Support

**Check logs:**
```bash
# PM2
pm2 logs ksebl-backend

# systemd
sudo journalctl -u ksebl-backend -f

# Docker
docker logs ksebl
```

**Health check:**
```bash
curl http://localhost:3001/health
```

---

## 🎯 Next Steps

1. ✅ Backend server running
2. ✅ Excel logging functional
3. ✅ Authentication working
4. ⏳ Create frontend dashboard component
5. ⏳ Integrate WebSocket in React
6. ⏳ Add role-based UI
7. ⏳ Deploy to production server
8. ⏳ Set up HTTPS/WSS
9. ⏳ Configure automated backups
10. ⏳ Set up monitoring & alerts

---

**Built for KSEBL Smart India Hackathon 2025**
