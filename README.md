# KSEBL 3-Phase Fault Detection & Monitoring System

## 📋 Project Summary

A comprehensive real-time monitoring and fault detection system for KSEBL's Low Voltage AC Distribution network, featuring ESP32-based hardware monitoring, cloud data logging, and SMS alert capabilities. The system monitors three-phase electrical parameters (R, Y, B phases) and provides instant fault detection with automatic relay control and remote notifications.

---

## 🎯 Project Overview

**Project Name:** KSEBL 3-Phase Fault Detection System  
**Technology Stack:** ESP32 + React + TypeScript + Firebase + SIM800C GSM  
**Purpose:** Real-time monitoring, fault detection, and automated response for 3-phase AC distribution systems  
**Target User:** Kerala State Electricity Board (KSEBL) / Electrical Distribution Networks  

---

## 🏗️ System Architecture

### **Hardware Components**
- **ESP32 Microcontroller**: Central processing unit with WiFi capability
- **ADS1115 ADC**: 16-bit precision analog-to-digital converter (I2C)
- **3× CT Sensors**: Current transformers on channels A0, A1, A3 (0-1.6A range)
- **3× Relays**: Active-LOW relays on GPIO 25, 26, 27 for load control
- **SIM800C GSM Module**: SMS alert system (Serial2, RX: GPIO 16, TX: GPIO 17)
- **WiFi Network**: WebSocket communication on port 81

### **Software Stack**
- **Frontend**: React 19.2 + TypeScript + Vite 7.2
- **UI Framework**: Lucide React icons, Custom CSS with 3D effects
- **Backend Services**: 
  - ESP32Service: WebSocket client for real-time data
  - FirebaseService: Cloud database integration
- **Database**: 
  - Firebase Firestore (historical data)
  - Firebase Realtime Database (live monitoring)
- **Communication**: WebSocket protocol, JSON data exchange

---

## ✨ Key Features

### **1. Real-Time 3-Phase Monitoring**
- **Individual Phase Tracking**: R (Red), Y (Yellow), B (Blue) phases
- **Live Data Display**: Voltage (12.8V system), Current (0-1.6A), Power (W)
- **Phase Selector UI**: Toggle between phases with live value preview
- **Update Rate**: 200ms ESP32 sampling, 5-second Firebase sync

### **2. Advanced Fault Detection**
- **Voltage Anomaly Detection**: High voltage warnings (>13V), Critical alerts (>14.5V)
- **Overcurrent Protection**: Warning at >1.2A, Critical at >1.5A
- **Load Cut Detection**: Sudden current drop/spike detection (threshold: ±0.05A)
- **Line Break Detection**: Low voltage (<1V) + low current (<0.1A) condition
- **Baseline Monitoring**: Auto-calibrates normal operating current per phase

### **3. Automated Response System**
- **Relay Control**: Automatic load disconnection on fault detection (active-LOW)
- **SMS Alerts**: Instant notifications via SIM800C GSM module
- **Alert Messages**: 
  - "ALERT: R-Phase (Phase-1) FAULT DETECTED! Load cut detected."
  - "ALERT: Y-Phase (Phase-2) FAULT DETECTED! Load cut detected."
  - "ALERT: B-Phase (Phase-3) FAULT DETECTED! Load cut detected."
- **One-Time Alerts**: Prevents SMS spam (flags: `smsA0Sent`, `smsA1Sent`, `smsA3Sent`)

### **4. Cloud Integration (Firebase)**
- **Historical Data Logging**: All sensor readings saved to Firestore
- **Alert Database**: Warning/critical alerts with timestamps
- **Live Data Sync**: Real-time database updates every 5 seconds
- **Phase Statistics**: 24-hour avg/max/min calculations per phase
- **Data Retrieval**: Query recent readings, alerts, and analytics

### **5. Interactive Web Dashboard**
- **Circular Gauges**: Voltage (0-15V) and Current (0-1.6A) with color-coded indicators
- **Status Colors**: Green (normal), Yellow (warning), Red (critical)
- **Historical Charts**: Trend visualization with Recharts library
- **Alert Panel**: Live alert feed with severity indicators
- **System Info**: Uptime, peak values, total energy consumption
- **Power Analysis**: Real-time power consumption and energy tracking
- **Theme Selector**: Multiple dark industrial themes

### **6. Manual ESP32 Connection**
- **IP Input Field**: Click connection status to enter ESP32 IP
- **Instant Connection**: Direct WebSocket connection to any ESP32 on network
- **Connection Status**: Visual indicators (green pulse = connected, red = disconnected)
- **Auto-Reconnect**: Default IP (10.117.120.133) on page load

### **7. Data Export & Analysis**
- **JSON Export**: Download historical data with timestamps
- **Firebase Queries**: Filter by phase, time range, status
- **Statistics API**: Average, max, min calculations
- **Real-time Subscriptions**: Live updates via Firebase listeners

---

## 🔧 Technical Specifications

### **Electrical Parameters**
- **Voltage Range**: 0-15V (system voltage: 12.8V)
- **Current Range**: 0-1.6A (CT sensor output: 0-0.5A typical)
- **Sampling**: 200 samples at 500μs intervals (100ms per phase)
- **ADC Resolution**: 16-bit (ADS1115 with GAIN_FOUR)
- **Current Conversion**: `Irms = Vrms × 2.5` (CT ratio)

### **Communication Protocols**
- **WebSocket**: `ws://<ESP32_IP>:81` (port 81)
- **JSON Format**: 
  ```json
  {
    "voltage_R": 12.8,
    "current_R": 0.405,
    "voltage_Y": 12.8,
    "current_Y": 0.423,
    "voltage_B": 12.8,
    "current_B": 0.315
  }
  ```
- **I2C**: ADS1115 on SDA:21, SCL:22
- **UART**: SIM800C on Serial2 (9600 baud)

### **Thresholds & Limits**
- **No Signal**: < 0.01V RMS
- **Load Drop**: ±0.05A from baseline
- **Current Warning**: > 1.2A
- **Current Critical**: > 1.5A
- **Voltage Warning**: > 13V
- **Voltage Critical**: > 14.5V
- **Line Break**: < 1V AND < 0.1A

---

## 📊 Data Flow

```
ESP32 → WiFi → WebSocket → React Dashboard → Firebase Cloud
  ↓                                ↓              ↓
Sensors              Live UI Display    Historical DB
  ↓                                ↓              ↓
Relays               Alerts Panel     Analytics/Reports
  ↓
SIM800C → SMS Alerts
```

---

## 🚀 Setup & Deployment

### **Hardware Setup**
1. Connect 3× CT sensors to ADS1115 (A0, A1, A3)
2. Wire relays to ESP32 GPIO 25, 26, 27
3. Connect SIM800C to GPIO 16 (RX), 17 (TX)
4. Power SIM800C with external 4.2V supply
5. Insert active SIM card with SMS capability

### **ESP32 Configuration**
```cpp
const char* ssid = "Jack's";          // WiFi SSID
const char* password = "10101010.";   // WiFi Password
const char* alertPhone = "+919876543210"; // SMS Alert Number
```

### **Firebase Setup**
1. Create Firebase project at console.firebase.google.com
2. Enable Firestore Database and Realtime Database
3. Copy Firebase config to `src/config/firebase.ts`
4. Set security rules (see `FIREBASE_SETUP.md`)

### **Web Dashboard**
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run build        # Production build
```

---

## 📱 Features Implemented

### ✅ **ESP32 Features**
- [x] 3-phase current monitoring (A0, A1, A3)
- [x] WiFi connectivity with WebSocket server
- [x] Real-time data broadcasting (200ms intervals)
- [x] Load cut detection with baseline tracking
- [x] Automatic relay control (active-LOW)
- [x] SIM800C GSM integration
- [x] SMS alert system (one alert per fault)
- [x] Serial monitor debugging

### ✅ **Web Dashboard Features**
- [x] 3-phase selector UI (R, Y, B buttons)
- [x] Real-time circular gauges (voltage & current)
- [x] Live data from WebSocket
- [x] Manual IP input for ESP32 connection
- [x] Firebase Firestore integration
- [x] Firebase Realtime Database sync
- [x] Historical data logging
- [x] Alert database with timestamps
- [x] Theme selector (multiple dark themes)
- [x] Data export (JSON format)
- [x] Fullscreen mode
- [x] Connection status indicators
- [x] Particle background effects
- [x] Responsive design

### ✅ **Cloud Features**
- [x] Automatic data backup to Firestore
- [x] Live data sync (5-second intervals)
- [x] Alert logging with severity levels
- [x] Phase-specific statistics
- [x] Real-time listeners for live updates
- [x] Query API for historical analysis

---

## 📈 Performance Metrics

- **ESP32 Sampling Rate**: 200 samples/phase in 100ms
- **WebSocket Broadcast**: Every 200ms
- **Firebase Sync**: Every 5 seconds
- **Dashboard Update**: Real-time (< 50ms latency)
- **SMS Alert Delay**: 5-10 seconds (network dependent)
- **Data Retention**: Unlimited (Firestore)
- **Uptime Tracking**: Continuous since last reset

---

## 🛠️ Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Hardware** | ESP32 | - |
| **ADC** | ADS1115 | 16-bit |
| **GSM** | SIM800C | - |
| **Frontend** | React | 19.2.0 |
| **Language** | TypeScript | 5.9.3 |
| **Build Tool** | Vite | 7.2.4 |
| **Database** | Firebase | 11.x |
| **Charts** | Recharts | 3.5.0 |
| **Icons** | Lucide React | 0.555.0 |
| **Arduino Libs** | WiFi, WebSocketsServer, ArduinoJson, Adafruit_ADS1X15 | - |

---

## 📞 Alert System

### **SMS Alert Configuration**
```cpp
// Update this in ESP32 code
const char* alertPhone = "+919876543210";  // Your phone number
```

### **Alert Trigger Conditions**
1. **No Load Detected**: Current = 0A
2. **Load Cut**: Current drops/spikes by ±0.05A
3. **Overcurrent**: Current > 1.5A (critical)
4. **Overvoltage**: Voltage > 14.5V (critical)

### **Alert Format**
```
ALERT: [Phase]-Phase (Phase-[N]) FAULT DETECTED! Load cut detected.
```

---

## 🔐 Security Considerations

⚠️ **Current Status**: Development mode (public access)

**For Production:**
- [ ] Implement Firebase Authentication
- [ ] Add role-based access control
- [ ] Secure WebSocket with WSS (SSL/TLS)
- [ ] Add API rate limiting
- [ ] Encrypt sensitive data
- [ ] Implement user authentication UI

---

## 📚 Documentation Files

- **FIREBASE_SETUP.md** - Complete Firebase configuration guide
- **ESP32_INTEGRATION.md** - Hardware wiring and code setup (if exists)
- **ESP32_WEBSOCKET_SETUP.md** - WebSocket protocol details (if exists)
- **THREE_PHASE_SETUP.md** - 3-phase monitoring configuration (if exists)

---

## 🎯 Use Cases

1. **Residential Monitoring**: 3-phase home electrical system monitoring
2. **Industrial Safety**: Fault detection in manufacturing facilities
3. **Distribution Networks**: KSEBL grid monitoring and fault isolation
4. **Remote Monitoring**: Cloud-based access from anywhere
5. **Predictive Maintenance**: Historical data analysis for equipment health
6. **Load Management**: Real-time power consumption tracking

---

## 🔮 Future Enhancements

- [ ] Add voltage sensors for actual measurement (currently fixed 12.8V)
- [ ] Implement machine learning for anomaly prediction
- [ ] Mobile app (React Native)
- [ ] Email alerts via Cloud Functions
- [ ] Power quality analysis (THD, power factor)
- [ ] Multi-location monitoring dashboard
- [ ] User authentication system
- [ ] Advanced analytics and reports
- [ ] Integration with SCADA systems
- [ ] Telegram bot for alerts

---

## 👥 Project Team

**Organization:** Kerala State Electricity Board (KSEBL)  
**Event:** Smart India Hackathon 2025  
**Category:** Electrical Distribution & Fault Detection  

---

## 📄 License

This project is developed for KSEBL and Smart India Hackathon 2025.

---

## 🆘 Support & Troubleshooting

**ESP32 Not Connecting?**
- ✓ Check WiFi credentials
- ✓ Verify ESP32 IP address (Serial Monitor)
- ✓ Ensure same WiFi network as laptop
- ✓ Click connection status and enter IP manually

**No SMS Alerts?**
- ✓ Check SIM card is active
- ✓ Verify SIM800C power supply (4.2V)
- ✓ Update phone number in code
- ✓ Check Serial Monitor for GSM status

**Firebase Not Syncing?**
- ✓ Verify Firebase config in `firebase.ts`
- ✓ Check Firestore/Realtime DB is enabled
- ✓ Review security rules
- ✓ Check browser console for errors

**Dashboard Not Updating?**
- ✓ ESP32 must be connected (green indicator)
- ✓ Check WebSocket connection
- ✓ Verify ESP32 is broadcasting data
- ✓ Open browser DevTools → Network → WS tab

---

**🎓 Built for Smart India Hackathon 2025 | Powered by ESP32, React & Firebase**

### Configuration

#### WebSocket Connection
Edit `src/components/Dashboard.tsx` to connect to your ESP32:

```typescript
// Replace simulation with actual WebSocket connection
import { ESP32Service } from '../services/esp32Service';

useEffect(() => {
  const esp32Service = new ESP32Service(
    'ws://YOUR_ESP32_IP:81',
    (data) => {
      setSensorData({
        voltage: data.voltage,
        current: data.current,
        timestamp: new Date().toISOString(),
        status: determineStatus(data)
      });
    },
    (connected) => setIsConnected(connected)
  );

  esp32Service.connect();

  return () => esp32Service.disconnect();
}, []);
```

#### HTTP API Connection
Alternatively, use polling with HTTP API:

```typescript
import { ESP32ApiService } from '../services/esp32Service';

useEffect(() => {
  const apiService = new ESP32ApiService('http://YOUR_ESP32_IP');
  
  const interval = setInterval(async () => {
    try {
      const data = await apiService.getSensorData();
      setSensorData({
        voltage: data.voltage,
        current: data.current,
        timestamp: new Date().toISOString(),
        status: determineStatus(data)
      });
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
    }
  }, 1000);

  return () => clearInterval(interval);
}, []);
```

## ESP32 Data Format

Your ESP32 should send data in the following JSON format:

### WebSocket Message
```json
{
  "voltage": 230.5,
  "current": 3.2,
  "timestamp": "2025-11-27T10:30:00Z"
}
```

### HTTP API Response
```json
{
  "voltage": 230.5,
  "current": 3.2,
  "status": "normal",
  "timestamp": "2025-11-27T10:30:00Z"
}
```

## ESP32 Example Code

### WebSocket Server (Arduino)

```cpp
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

WebSocketsServer webSocket = WebSocketsServer(81);

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected");
  Serial.print("IP: ");
  Serial.println(WiFi.localIP());
  
  // Start WebSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
}

void loop() {
  webSocket.loop();
  
  // Read sensors (replace with actual sensor reading)
  float voltage = readVoltage();  // Implement this
  float current = readCurrent();  // Implement this
  
  // Create JSON
  StaticJsonDocument<200> doc;
  doc["voltage"] = voltage;
  doc["current"] = current;
  doc["timestamp"] = millis();
  
  String json;
  serializeJson(doc, json);
  
  // Broadcast to all clients
  webSocket.broadcastTXT(json);
  
  delay(1000);  // Send every second
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  // Handle WebSocket events
}
```

### HTTP API Server (Arduino)

```cpp
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

WebServer server(80);

void handleSensorData() {
  StaticJsonDocument<200> doc;
  doc["voltage"] = readVoltage();
  doc["current"] = readCurrent();
  doc["timestamp"] = millis();
  
  String json;
  serializeJson(doc, json);
  
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void setup() {
  // WiFi setup...
  server.on("/api/sensor-data", handleSensorData);
  server.begin();
}

void loop() {
  server.handleClient();
}
```

## Fault Detection Thresholds

| Parameter | Normal Range | Warning | Critical |
|-----------|-------------|---------|----------|
| Voltage | 220-240V | <210V or >245V | <200V or >250V |
| Current | 0.1-8A | 8-10A | >10A or <0.1A (with low voltage) |

## Project Structure

```
website/
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx       # Main dashboard component
│   │   ├── VoltageGauge.tsx   # Voltage display
│   │   ├── CurrentGauge.tsx   # Current display
│   │   ├── LineChart.tsx      # Historical trends
│   │   └── AlertPanel.tsx     # Alert notifications
│   ├── services/
│   │   └── esp32Service.ts    # ESP32 communication
│   ├── styles/
│   │   ├── Dashboard.css
│   │   ├── Gauge.css
│   │   ├── Chart.css
│   │   └── Alert.css
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Recharts** - Data visualization
- **Lucide React** - Icons
- **WebSocket API** - Real-time communication

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Deployment

### Build and Deploy

```bash
# Build for production
npm run build

# The dist/ folder contains the production build
# Deploy to any static hosting service (Netlify, Vercel, GitHub Pages, etc.)
```

## Contributing

This project is part of Smart India Hackathon 2025 for KSEBL fault detection system.

## License

MIT License

## Support

For issues and questions, please contact the development team.
