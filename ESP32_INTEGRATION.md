# ESP32 Integration Guide

## Overview
This guide will help you integrate your ESP32 device with the fault detection dashboard.

## Hardware Requirements
- ESP32 Development Board
- Voltage Sensor (e.g., ZMPT101B)
- Current Sensor (e.g., ACS712 or SCT-013)
- WiFi Network
- Power Supply

## Software Requirements
- Arduino IDE or PlatformIO
- Required Libraries:
  - WiFi (built-in)
  - WebSocketsServer (by Markus Sattler)
  - ArduinoJson (by Benoit Blanchon)
  - WebServer (built-in)

## Installation Steps

### 1. Install Arduino Libraries

Open Arduino IDE > Tools > Manage Libraries, then search and install:
- `WebSockets` by Markus Sattler
- `ArduinoJson` by Benoit Blanchon

### 2. ESP32 WebSocket Server Code

Create a new Arduino sketch with the following code:

```cpp
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// WebSocket server on port 81
WebSocketsServer webSocket = WebSocketsServer(81);

// Sensor pins
#define VOLTAGE_PIN 34  // Analog pin for voltage sensor
#define CURRENT_PIN 35  // Analog pin for current sensor

// Calibration constants (adjust based on your sensors)
const float VOLTAGE_CALIBRATION = 0.3;  // Adjust this
const float CURRENT_CALIBRATION = 0.1;  // Adjust this

void setup() {
  Serial.begin(115200);
  
  // Connect to WiFi
  Serial.println("Connecting to WiFi...");
  WiFi.begin(ssid, password);
  
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\nWiFi Connected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
  
  // Start WebSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  
  Serial.println("WebSocket server started on port 81");
  Serial.println("Dashboard URL: http://localhost:5173");
  Serial.print("Connect to: ws://");
  Serial.print(WiFi.localIP());
  Serial.println(":81");
}

void loop() {
  webSocket.loop();
  
  // Read sensor values
  float voltage = readVoltage();
  float current = readCurrent();
  
  // Create JSON document
  StaticJsonDocument<200> doc;
  doc["voltage"] = voltage;
  doc["current"] = current;
  doc["timestamp"] = millis();
  
  // Serialize to string
  String jsonString;
  serializeJson(doc, jsonString);
  
  // Broadcast to all connected clients
  webSocket.broadcastTXT(jsonString);
  
  // Debug output
  Serial.print("V: ");
  Serial.print(voltage);
  Serial.print("V, I: ");
  Serial.print(current);
  Serial.println("A");
  
  delay(1000);  // Send data every second
}

float readVoltage() {
  // Read analog value (0-4095 for ESP32)
  int rawValue = analogRead(VOLTAGE_PIN);
  
  // Convert to voltage (0-3.3V reference)
  float measuredVoltage = (rawValue / 4095.0) * 3.3;
  
  // Apply calibration for actual AC voltage
  // Adjust this formula based on your voltage sensor
  float actualVoltage = measuredVoltage * VOLTAGE_CALIBRATION * 100;
  
  return actualVoltage;
}

float readCurrent() {
  // Read analog value
  int rawValue = analogRead(CURRENT_PIN);
  
  // Convert to voltage
  float measuredVoltage = (rawValue / 4095.0) * 3.3;
  
  // Apply calibration for actual current
  // Adjust this formula based on your current sensor
  float actualCurrent = (measuredVoltage - 1.65) * CURRENT_CALIBRATION * 30;
  
  return abs(actualCurrent);  // Return absolute value
}

void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("[%u] Disconnected!\n", num);
      break;
      
    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      Serial.printf("[%u] Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
      
      // Send initial message
      webSocket.sendTXT(num, "{\"status\":\"connected\"}");
      break;
    }
    
    case WStype_TEXT:
      Serial.printf("[%u] Received: %s\n", num, payload);
      break;
  }
}
```

### 3. Update Dashboard Configuration

Edit `src/components/Dashboard.tsx` and replace the simulation code with actual WebSocket connection:

```typescript
useEffect(() => {
  const esp32Service = new ESP32Service(
    'ws://10.117.120.253:81',  // Replace with your ESP32 IP
    (data) => {
      // Determine status based on readings
      let status: 'normal' | 'warning' | 'critical' = 'normal';
      const newAlerts: string[] = [];

      if (data.voltage < 200 || data.voltage > 250) {
        status = 'warning';
        newAlerts.push(`Voltage out of range: ${data.voltage.toFixed(2)}V`);
      }

      if (data.current > 10) {
        status = 'critical';
        newAlerts.push(`High current detected: ${data.current.toFixed(2)}A`);
      }

      if (data.current < 0.1 && data.voltage < 50) {
        status = 'critical';
        newAlerts.push(`Line break detected!`);
      }

      setSensorData({
        voltage: data.voltage,
        current: data.current,
        timestamp: new Date().toISOString(),
        status
      });

      setHistoricalData(prev => {
        const updated = [...prev, {
          voltage: data.voltage,
          current: data.current,
          timestamp: new Date().toISOString(),
          status
        }];
        return updated.slice(-20);
      });

      if (newAlerts.length > 0) {
        setAlerts(prev => [...newAlerts, ...prev].slice(0, 10));
      }
    },
    (connected) => setIsConnected(connected)
  );

  esp32Service.connect();

  return () => esp32Service.disconnect();
}, []);
```

## Sensor Calibration

### Voltage Sensor (ZMPT101B)
1. Connect to known AC voltage source (e.g., 230V)
2. Read the analog value
3. Calculate calibration: `VOLTAGE_CALIBRATION = ActualVoltage / MeasuredValue`

### Current Sensor (ACS712)
1. Pass known current through the sensor
2. Read the analog value
3. Calculate calibration: `CURRENT_CALIBRATION = ActualCurrent / (MeasuredValue - Offset)`

## Wiring Diagram

```
ESP32 Pin Connections:
┌──────────────────────────────┐
│         ESP32                │
│                              │
│  GPIO 34 ──── Voltage Sensor │
│  GPIO 35 ──── Current Sensor │
│  GND     ──── GND            │
│  3.3V    ──── VCC            │
└──────────────────────────────┘
```

## Testing

1. Upload code to ESP32
2. Open Serial Monitor (115200 baud)
3. Note the IP address displayed
4. Update dashboard configuration with ESP32 IP
5. Access dashboard at http://localhost:5173
6. Verify data is being received

## Troubleshooting

### WebSocket Connection Failed
- Check ESP32 IP address
- Ensure both devices are on same network
- Check firewall settings
- Verify port 81 is not blocked

### Incorrect Readings
- Calibrate sensors properly
- Check sensor wiring
- Verify voltage divider values
- Check ADC reference voltage

### No Data Displayed
- Check Serial Monitor for errors
- Verify JSON format
- Check WebSocket server is running
- Inspect browser console for errors

## Alternative: HTTP API Method

If WebSocket doesn't work, use HTTP polling instead:

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
  
  // Enable CORS
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", json);
}

void setup() {
  // WiFi setup...
  server.on("/api/sensor-data", handleSensorData);
  server.enableCORS(true);
  server.begin();
}

void loop() {
  server.handleClient();
}
```

Then update the dashboard to use polling:

```typescript
import { ESP32ApiService } from '../services/esp32Service';

useEffect(() => {
  const apiService = new ESP32ApiService('http://YOUR_ESP32_IP');
  
  const interval = setInterval(async () => {
    try {
      const data = await apiService.getSensorData();
      // Process data...
      setIsConnected(true);
    } catch (error) {
      setIsConnected(false);
    }
  }, 1000);

  return () => clearInterval(interval);
}, []);
```

## Production Deployment

### ESP32 Improvements
- Add HTTPS support
- Implement authentication
- Add error handling
- Store configuration in EEPROM
- Add OTA (Over-The-Air) updates

### Dashboard Improvements
- Build for production: `npm run build`
- Deploy to cloud hosting (Vercel, Netlify)
- Add user authentication
- Store historical data in database
- Implement email/SMS alerts

## Resources

- [ESP32 WebSocket Documentation](https://github.com/Links2004/arduinoWebSockets)
- [ArduinoJson Documentation](https://arduinojson.org/)
- [ZMPT101B Voltage Sensor Guide](https://www.electronicwings.com/sensors-modules/zmpt101b-voltage-sensor)
- [ACS712 Current Sensor Guide](https://www.electronicwings.com/sensors-modules/acs712-current-sensor)

## Support

For issues and questions:
1. Check Serial Monitor output
2. Verify network connectivity
3. Test with simple HTTP request first
4. Check browser console for errors
5. Validate JSON format
