# ESP32 WebSocket Setup Guide

## Required Arduino Libraries

Install these libraries via Arduino IDE Library Manager:

1. **Adafruit ADS1X15** (already installed)
2. **WebSockets by Markus Sattler** - Search for "WebSockets" by Markus Sattler
3. **ArduinoJson** - Search for "ArduinoJson" by Benoit Blanchon

## ESP32 Configuration Steps

### 1. Update WiFi Credentials

In `ESP32_Current_Monitor.ino`, find these lines and replace with your WiFi details:

```cpp
const char* ssid = "YOUR_WIFI_SSID";        // Replace with your WiFi name
const char* password = "YOUR_WIFI_PASSWORD"; // Replace with your WiFi password
```

### 2. Upload Code to ESP32

1. Connect ESP32 to your computer via USB
2. Select the correct board: **Tools → Board → ESP32 Dev Module**
3. Select the correct port: **Tools → Port → (your COM port)**
4. Click **Upload** button

### 3. Find ESP32 IP Address

After uploading, open Serial Monitor (115200 baud) and you'll see:

```
System Ready...
Connecting to WiFi....
WiFi Connected!
IP Address: 192.168.1.100
WebSocket Server Started on port 81
```

Copy the IP address shown.

### 4. Update Website Configuration

In `src/components/Dashboard.tsx`, find this line:

```typescript
const ESP32_IP = '192.168.1.100'; // Change this to your ESP32's IP
```

Replace `192.168.1.100` with your ESP32's actual IP address.

## Data Format

The ESP32 sends JSON data via WebSocket every 200ms with **3-phase data**:

```json
{
  "voltage_R": 230.0,
  "current_R": 1.234,
  "frequency_R": 50.0,
  
  "voltage_Y": 230.0,
  "current_Y": 0.856,
  "frequency_Y": 50.0,
  
  "voltage_B": 230.0,
  "current_B": 0.0,
  "frequency_B": 50.0,
  
  "timestamp": 12345
}
```

**Note:** Currently, only 2 CT sensors are connected:
- **R Phase (Red)** = Phase 1 (ADS1115 Channel A0)
- **Y Phase (Yellow)** = Phase 2 (ADS1115 Channel A1)  
- **B Phase (Blue)** = Not connected (shows 0.0A)

To add the 3rd phase, connect another CT sensor to ADS1115 Channel A2 and modify the code.

## Testing

### 1. Test ESP32 Connection

Open Serial Monitor to verify:
- WiFi connection successful
- WebSocket server started
- Data being sent (Phase 1 & 2 readings)

### 2. Test Website Connection

1. Start your website: `npm run dev`
2. Open browser console (F12)
3. Look for: `Connected to ESP32`
4. Gauges should show real-time values

### 3. Manual Test (Optional)

In browser console, you can send test data:

```javascript
sendTestData(12.5, 3.8); // voltage=12.5V, current=3.8A
```

## Troubleshooting

### ESP32 Won't Connect to WiFi
- Check SSID and password are correct
- Ensure WiFi is 2.4GHz (ESP32 doesn't support 5GHz)
- Check WiFi signal strength

### Website Shows "Disconnected"
- Verify ESP32 IP address in Dashboard.tsx
- Ensure ESP32 and computer are on same network
- Check firewall settings
- Try accessing `http://[ESP32_IP]:81` in browser

### No Data Received
- Open Serial Monitor - verify ESP32 is sending data
- Check browser console for errors
- Verify WebSocket port 81 is not blocked

### Relay Triggering
- Current spike detection triggers relays at 10% increase
- Relays will trip on Pin 25 (Phase 1) and Pin 26 (Phase 2)
- Monitor Serial output for spike warnings

## Connection Flow

```
ESP32 → WiFi → WebSocket Server (Port 81)
                      ↓
            Website (React) ← WebSocket Client
                      ↓
            Real-time Dashboard Updates
```

## Notes

- WebSocket runs on port 81 (HTTP is typically 80)
- Data updates every 200ms (5 times per second)
- Auto-reconnect if connection drops
- Voltage is fixed at 230V (modify if needed)
- Current is sum of both phases (Phase1 + Phase2)
