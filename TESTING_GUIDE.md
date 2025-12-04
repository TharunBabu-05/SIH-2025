# KSEBL Electrical Monitoring System - Testing Guide

## 🚀 Quick Start

### 1. Start Backend Server
```powershell
cd backend
npm start
```
Expected output:
```
✅ Created new Excel log file
🚀 KSEBL Backend Server Started
📡 HTTP Server: http://localhost:3001
🔌 WebSocket Server: ws://localhost:3002
```

### 2. Start Frontend Development Server
```powershell
# In a new terminal
npm run dev
```
Expected output:
```
  VITE v7.2.4  ready in xxx ms
  
  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

### 3. Open Application
Navigate to: http://localhost:5173/

## 🔐 Demo Credentials

### Engineer Account (Full Access)
- **Username**: engineer
- **Password**: engineer123
- **Permissions**: View data, download logs, view analytics

### Worker Account (View Only)
- **Username**: worker
- **Password**: worker123
- **Permissions**: View current readings only

## 📊 Features to Test

### For Engineers:
1. ✅ **Login** - Use engineer credentials
2. ✅ **Real-time Monitoring** - See 3-phase voltage/current updates via WebSocket
3. ✅ **Micro-graphs** - View historical trends (last 12 samples) for each phase
4. ✅ **Analytics Dashboard** - Click "View Analytics" button
   - 24-hour statistics (avg/min/max per phase)
   - Fault event history table
5. ✅ **Download Logs** - Click "Download Logs" button
   - Downloads Excel file with all sensor data
6. ✅ **Fault Alerts** - System banner appears when fault is detected
7. ✅ **Status Indicators** - Normal/Warning/Critical badges based on voltage/current thresholds

### For Workers:
1. ✅ **Login** - Use worker credentials
2. ✅ **View Readings** - See current voltage/current/power values
3. ✅ **Limited Access** - No charts, no analytics, no download button
4. ✅ **Fault Alerts** - Still see system fault banner

## 🧪 Testing ESP32 Data Submission

### Method 1: Using Postman/Thunder Client
```
POST http://localhost:3001/api/data
Content-Type: application/json

{
  "timestamp": "2025-12-04T18:45:00.000Z",
  "R_V": 230.5,
  "Y_V": 228.3,
  "B_V": 232.1,
  "R_I": 15.2,
  "Y_I": 14.8,
  "B_I": 16.1,
  "fault": false,
  "fault_type": null
}
```

### Method 2: Using PowerShell
```powershell
$body = @{
    timestamp = (Get-Date -Format "o")
    R_V = 230.5
    Y_V = 228.3
    B_V = 232.1
    R_I = 15.2
    Y_I = 14.8
    B_I = 16.1
    fault = $false
    fault_type = $null
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3001/api/data" -Method Post -Body $body -ContentType "application/json"
```

### Method 3: Fault Simulation
```json
{
  "timestamp": "2025-12-04T18:50:00.000Z",
  "R_V": 190.0,
  "Y_V": 228.3,
  "B_V": 232.1,
  "R_I": 25.5,
  "Y_I": 14.8,
  "B_I": 16.1,
  "fault": true,
  "fault_type": "OVERVOLTAGE"
}
```

## 🎨 UI Components

### MonitoringDashboard
- Header with user info and role badge
- WebSocket connection status indicator
- Logout, Analytics, and Download buttons (role-based)
- System fault banner (appears when fault detected)
- MeterBox component rendering

### MeterBox
- 3-phase panels (R=Red, Y=Yellow, B=Blue)
- Large voltage/current displays
- Power calculation per phase
- Chart.js micro-graphs (last 12 samples)
- Status badges (normal/warning/critical)
- Total power summary footer

### Analytics (Engineer Only)
- 24-hour statistics cards per phase
- Period summary (data points, fault count)
- Fault events table with timestamps
- Refresh button to reload data

### Login
- Username/password form
- Demo credentials display
- Error handling for invalid logins
- Loading spinner during authentication

## 📁 Excel Log File Structure

Location: `backend/data/logs.xlsx`

Columns:
- Date (DD/MM/YYYY)
- Time (HH:MM:SS)
- R_V (Red Phase Voltage)
- Y_V (Yellow Phase Voltage)
- B_V (Blue Phase Voltage)
- R_I (Red Phase Current)
- Y_I (Yellow Phase Current)
- B_I (Blue Phase Current)
- Fault (true/false)
- Fault_Type (string or null)

## 🔧 Environment Configuration

### Backend (.env)
```
PORT=3001
WS_PORT=3002
JWT_SECRET=your_super_secret_jwt_key_change_in_production_ksebl_2025
JWT_EXPIRATION=7d
CORS_ORIGIN=http://localhost:5173
LOG_FILE_PATH=./data/logs.xlsx
NODE_ENV=development
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3002
VITE_APP_ENV=development
```

## 🛠 Troubleshooting

### WebSocket not connecting
1. Ensure backend server is running on port 3002
2. Check browser console for connection errors
3. Verify CORS settings in backend .env

### TypeScript errors in VS Code
1. Reload VS Code window: `Ctrl+Shift+P` → "Reload Window"
2. Restart TypeScript server: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

### Excel file not creating
1. Check `backend/data/` directory exists
2. Verify write permissions
3. Check backend console for errors

### Login not working
1. Verify backend is running and accessible
2. Check Network tab in browser DevTools
3. Ensure credentials match hardcoded users in `backend/services/authService.js`

## 📦 Dependencies Installed

### Backend
- express (4.18.2)
- ws (8.16.0)
- xlsx (0.18.5)
- jsonwebtoken (9.0.2)
- bcryptjs (2.4.3)
- joi (17.11.0)
- cors
- dotenv
- express-rate-limit (7.1.5)

### Frontend
- react (19.2.0)
- chart.js (4.5.1)
- react-chartjs-2 (5.3.1)
- lucide-react (0.555.0)
- firebase (12.6.0)

## 🎯 Next Steps

1. **Test End-to-End Flow**
   - Start both servers
   - Login with engineer/worker
   - Submit test data via API
   - Verify real-time updates
   - Check Excel file logging
   - Download logs
   - View analytics

2. **ESP32 Integration**
   - Update ESP32 code with backend URL (http://localhost:3001/api/data)
   - Test actual sensor data submission
   - Verify 15-minute interval updates

3. **Production Deployment**
   - Follow DEPLOYMENT.md for detailed steps
   - Update environment variables for production
   - Configure HTTPS and WSS
   - Set strong JWT_SECRET

## ✅ Completed Implementation

- [x] Backend server (Express + WebSocket)
- [x] Excel logging service with atomic writes
- [x] JWT authentication system
- [x] API endpoints (auth, data, stats, faults, download)
- [x] Frontend authentication context
- [x] Login component
- [x] Monitoring dashboard with WebSocket
- [x] MeterBox component with Chart.js graphs
- [x] Analytics component for engineers
- [x] Role-based UI (engineer vs worker)
- [x] CSS styling (dark industrial theme)
- [x] Environment configuration
- [x] Chart.js dependencies installed
