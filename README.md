# ESP32 FAULT DETECTION DASHBOARD

A real-time monitoring dashboard for KSEBL's Low Voltage AC Distribution fault detection system using React, Vite, and TypeScript.

## Features

✨ **Real-time Monitoring**
- Live voltage and current readings
- Interactive gauges with status indicators
- Historical trend charts
- Real-time alerts and notifications

🔌 **ESP32 Integration**
- WebSocket support for real-time data streaming
- HTTP API fallback for polling
- Auto-reconnection handling
- Connection status indicator

⚡ **Fault Detection**
- Voltage anomaly detection (out of range: 220-240V)
- Current spike detection (overcurrent protection)
- Line break detection (low voltage + low current)
- Automatic alert generation

📊 **Dashboard Components**
- **Voltage Gauge**: Real-time voltage monitoring with visual indicators
- **Current Gauge**: Real-time current monitoring with range display
- **Trend Chart**: Historical data visualization
- **Alert Panel**: Recent alerts and fault notifications
- **Status Banner**: System-wide status indicator

## Getting Started

### Prerequisites
- Node.js 16+ and npm
- ESP32 device with sensors

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

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
