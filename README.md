# 🚀 ESP-NOW + WebSocket Real-Time Monitoring System

## 📋 System Architecture

```
ESP32 #1 (SENDER)                         ESP32 #2 (RECEIVER + AP)              Website
┌──────────────────────────┐             ┌──────────────────────┐          ┌──────────────┐
│  ADS1115 + Sensors       │             │                      │          │              │
│  3-Phase Detection       │  ESP-NOW    │  Receives all data   │ WebSocket│  React App   │
│  Fault Analysis          │──(2-10ms)──>│  WiFi AP Hotspot     │─────────>│  Dashboard   │
│  RC Distance             │             │  192.168.4.1:81      │ (200ms)  │  + Logs      │
│  Pole/Branch ID          │             │  Forwards to web     │          │              │
└──────────────────────────┘             └──────────────────────┘          └──────────────┘
   100ms ESP-NOW sends                    WIFI_AP_STA mode                  Real-time display
   + Debug messages                       Relays everything                 + Debug console
```

## ⚡ What's Different

**ESP32 #1** - Your friend's complete fault detection code + ESP-NOW
- ✅ ALL core logic preserved (voltage, current, RC, poles, branches)
- ✅ Sends sensor data every 100ms via ESP-NOW
- ✅ Forwards ALL debug/print messages to ESP32 #2
- ✅ Sends fault alerts when detected

**ESP32 #2** - Receives + forwards to website
- ✅ Receives ESP-NOW data (2-10ms latency)
- ✅ Runs Access Point (ESP32-HUB)
- ✅ WebSocket server on port 81
- ✅ Forwards sensor data + debug messages to website

## 📦 What Data is Sent

**Continuous (every 100ms via ESP-NOW):**
- Voltage R, Y, B (12-20V or 0V)
- Current R, Y, B (0-2A)
- Baseline values (for fault detection)
- Relay status (ON/OFF for each phase)
- Cut detection flags (P1, P2)

**When Fault Detected:**
- RC time measurement
- Pole number (1-5)
- Distance to fault (meters)
- Fault type (MAIN_CUT, BRANCH_CUT, LOAD_DROP, etc.)
- Branch identification (B1, B2, etc.)

**Debug Messages:**
- All Serial.println from ESP32 #1
- Fault analysis messages
- RC measurement logs
- Status updates

## 📦 Required Libraries

Install in Arduino IDE:
1. **ESP-NOW** (built-in)
2. **WebSocketsServer** by Markus Sattler
3. **ArduinoJson** by Benoit Blanchon
4. **Adafruit_ADS1X15** (for ADS1115)
5. **LoRa** by Sandeep Mistry

## 🔧 Setup Steps

### **Step 1: Upload to ESP32 #2 (Receiver) FIRST**

1. Open `ESP32_Receiver_AP.ino`
2. Select: Tools → Board → ESP32 Dev Module
3. Click Upload
4. Open Serial Monitor (115200 baud)
5. **COPY THE MAC ADDRESS** shown like: `24:6F:28:XX:XX:XX`

### **Step 2: Configure ESP32 #1 (Sender)**

1. Open `ESP32_Sender.ino`
2. Find line 28: `uint8_t receiverMac[] = {0x24, 0x6F, 0x28, 0xXX, 0xXX, 0xXX};`
3. **Replace with MAC from Step 1**
   - Example: If MAC is `24:6F:28:B2:C4:D6`
   - Change to: `uint8_t receiverMac[] = {0x24, 0x6F, 0x28, 0xB2, 0xC4, 0xD6};`
4. Click Upload

### **Step 3: Connect Hardware**

**ESP32 #1 (Sender):**
- ADS1115 SDA → GPIO 21
- ADS1115 SCL → GPIO 22
- ADS1115 VDD → 3.3V
- ADS1115 GND → GND
- Connect current sensors to ADS1115 channels:
  - A0 → Phase R
  - A1 → Phase Y
  - A2 → Phase B

**ESP32 #2 (Receiver):**
- Just USB power (no sensors needed)

### **Step 3: Test Communication**

1. **Power both ESP32s**
2. **Check ESP32 #1 Serial Monitor:**
   ```
   === ESP32 #1 - SENSOR NODE (ESP-NOW) ===
   ✅ ESP-NOW initialized
   ✅ Peer added - Ready to send data
   
   LIVE →  P1=0.523A 12.45V |  P2=0.612A 12.38V |  P3=0.445A 12.51V
   [P1] HIGH-IMPEDANCE FAULT → CURRENT DROPPED
   [P1] ---- DISTANCE ANALYSIS ----
   [P1] RC Time: 2.15 ms
   [P1] HIGH-IMPEDANCE FAULT → MAIN CUT at POLE-3 (1.60 m)
   ```

3. **Check ESP32 #2 Serial Monitor:**
   ```
   ✅ ESP-NOW initialized
   ✅ WebSocket server started on port 81
   
   📥 R=12.45V/0.523A Y=12.38V/0.612A B=12.51V/0.445A | Faults: P1=CUT P2=OK
   [P1] HIGH-IMPEDANCE FAULT → CURRENT DROPPED
   [P1] ---- DISTANCE ANALYSIS ----
   ⚠️  FAULT: R Phase - MAIN_CUT_POLE3 at Pole #3 (1.60m)
   [0] ✅ Website connected from 192.168.4.2
   ```

4. **If no data received:**
   - Check MAC address in ESP32_Sender.ino
   - Restart both ESP32s
   - Check ESP32s are within 50m of each other

### **Step 4: Connect Website**

1. **Disconnect from your WiFi**
2. **Connect to:** ESP32-HUB (password: 12345678)
3. **Open website:** http://localhost:5173 or your dev server
4. **Website will auto-connect to:** ws://192.168.4.1:81
5. **You'll see:**
   - Real-time voltage/current for all 3 phases
   - Fault log messages with pole/distance
   - Debug console showing all ESP32 #1 messages
   - 3D pole visualization with fault indicators

## ✅ Success Indicators

**ESP32 #1:**
```
✅ ESP-NOW initialized
✅ Peer added - Ready to send data

LIVE →  P1=0.523A 12.45V |  P2=0.612A 12.38V |  P3=0.445A 12.51V
```

**ESP32 #2:**
```
✅ Access Point Started
   IP Address: 192.168.4.1
✅ ESP-NOW initialized
✅ WebSocket server started on port 81
[0] ✅ Website connected from 192.168.4.2
📥 R=12.45V/0.523A Y=12.38V/0.612A B=12.51V/0.445A
```

**Website Console (F12):**
```
🔌 Connecting to ESP32: ws://192.168.4.1:81
✅ Connected to ESP32
ESP32 Data: {voltage_R: 12.45, current_R: 0.523, pole_R: 3, distance_R: 1.60, faultType_R: "MAIN_CUT_POLE3", ...}
Debug: [P1] HIGH-IMPEDANCE FAULT → MAIN CUT at POLE-3 (1.60 m)
```

## 🐛 Troubleshooting

### "❌ Failed to add peer"
**Solution:** MAC address mismatch
1. Re-upload ESP32_Receiver_AP.ino
2. Copy exact MAC from Serial Monitor
3. Update ESP32_Sender.ino line 28
4. Re-upload sender

### "No data from ESP32 #1 for 5 seconds"
**Solutions:**
- Check both ESP32s are powered
- Verify MAC address is correct
- Place ESP32s within 50m of each other
- Check for WiFi interference

### Website shows "Offline"
**Solutions:**
- Verify laptop connected to ESP32-HUB WiFi
- Check ESP32 #2 Serial Monitor shows "Website connected"
- Try different browser (Chrome/Edge recommended)
- Clear browser cache (Ctrl+Shift+R)

### Data not updating
**Solutions:**
- Check ESP32 #1 shows "✅ Sent"
- Check ESP32 #2 shows "📥 Received"
- Verify WebSocket connection in browser console
- Restart both ESP32s

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| ESP-NOW latency | 2-10 ms |
| Data send rate | 100 ms (10 Hz) |
| WebSocket update | 200 ms (5 Hz) |
| Website refresh | Real-time |
| Range | Up to 200m (line of sight) |
| Power consumption | ~80mA per ESP32 |

## 🔐 Security (Optional)

To encrypt ESP-NOW communication:

**In both ESP32 files, change:**
```cpp
peerInfo.encrypt = false;  // Change to true
```

**Add encryption key:**
```cpp
uint8_t key[16] = {0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0, 
                   0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0};
esp_now_set_pmk(key);
peerInfo.lmk = key;
```

## 🎯 Files Created

- **ESP32_Sender.ino** - Reads sensors, sends via ESP-NOW (100ms)
- **ESP32_Receiver_AP.ino** - Receives ESP-NOW, WiFi AP, WebSocket server
- **README.md** - This setup guide

## 🚀 Quick Start

1. Upload **ESP32_Receiver_AP.ino** first → Get MAC address
2. Update **ESP32_Sender.ino** with MAC → Upload
3. Power both ESP32s
4. Connect laptop to ESP32-HUB
5. Open website → See real-time data

**No router needed. No internet needed. Ultra-fast updates.**
