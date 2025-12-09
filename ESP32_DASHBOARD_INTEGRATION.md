# ESP32 Dashboard Integration Guide

## Overview
Your dashboard now supports **direct WebSocket connection** to ESP32 on port 81, receiving real-time voltage and current data with automatic fault detection.

## ESP32 Configuration
- **WebSocket Port**: 81
- **Data Format**: JSON with fields `I1`, `V1`, `I2`, `V2`, `I3`, `V3`
- **Transmission Rate**: Every 500ms (2x per second)

## Connection Setup

### 1. ESP32 IP Address
The ESP32 broadcasts data on:
```
ws://<ESP32_IP_ADDRESS>:81
```

### 2. Dashboard Configuration
1. Click the **⚙️ Settings** icon in the dashboard header
2. Enter ESP32 IP address (example: `192.168.1.100:81`)
3. Click **Save & Reload**

### 3. Data Mapping
ESP32 sends → Dashboard receives:
```javascript
{
  "I1": 0.50,  // R Phase Current → R_I
  "V1": 12.40, // R Phase Voltage → R_V
  "I2": 0.48,  // Y Phase Current → Y_I
  "V2": 12.35, // Y Phase Voltage → Y_V
  "I3": 0.52,  // B Phase Current → B_I
  "V3": 12.42  // B Phase Voltage → B_V
}
```

## Fault Detection System

### 1. **Phase Cut Detection** 🔴
- **Condition**: Voltage < 5V AND Current < 0.05A
- **Alert**: "X Phase Disconnected!"
- **Status**: CRITICAL
- **Example**: Cable break, relay trip, blown fuse

### 2. **Overload Detection** 🟠
- **Condition**: Current > 1.2A
- **Alert**: "X Phase Overload! Current: X.XXA"
- **Status**: CRITICAL
- **Example**: Too many devices connected, motor startup

### 3. **Short Circuit Detection** 🔴
- **Condition**: Current > 2.0A
- **Alert**: "X Phase Short Circuit!"
- **Status**: CRITICAL
- **Example**: Live and neutral touching, insulation failure

### 4. **Warning Conditions** 🟡
- Current > 1.0A (approaching overload)
- Voltage < 11.5V or > 13.0V (abnormal voltage)
- **Status**: WARNING

## Visual Indicators

### Alert Banners
Located below the header, color-coded alerts appear automatically:

- **Red Blinking**: Phase Cut / Short Circuit
- **Orange**: Overload
- **Auto-dismiss**: Clears when fault resolved

### Phase Status Badges
Each phase card shows:
- **🟢 NORMAL**: All parameters within range
- **🟡 WARNING**: Approaching limits
- **🔴 CRITICAL**: Fault detected

### Live Connection Indicator
- **🟢 Live**: ESP32 connected and sending data
- **🔴 Offline**: No data received for 5+ seconds

## Voltage & Current Display

### Display Format
- **Voltage**: `0,00 V` (comma as decimal separator)
- **Current**: `0,000 A` (3 decimal places)

### Expected Ranges (Your ESP32 Code)
- **Voltage**: 12.00V - 12.80V (normalized DC)
- **Current**: 0.00A - 2.00A (with CT sensor)

### Graph Features
- **Combined Graph**: Voltage (red) vs Current (green) on dual Y-axes
- **Real-time Updates**: Plots last 12 data points
- **Time Series**: X-axis shows timestamps

## Testing Without ESP32

### Option 1: Sample Data Mode
The dashboard shows graphs even with zero values for testing purposes.

### Option 2: Backend Server
Use the Node.js backend server that simulates ESP32 data:
```bash
cd backend
node server.js
```
Connect to: `localhost:5000`

## Troubleshooting

### "Offline" Status
✅ **Check**:
1. ESP32 WiFi connected (see Serial Monitor)
2. Correct IP address in Settings
3. Port 81 not blocked by firewall
4. ESP32 WebSocket server running

### No Graphs Showing
✅ **Check**:
1. Connection status shows "Live"
2. Console shows: "📤 Sent to Dashboard: ..."
3. Data values > 0

### Wrong Values
✅ **Check**:
1. ESP32 sends correct JSON format
2. Voltage factors (`Vfactor_P1/P2/P3`) calibrated
3. CT sensor current scaling (`Irms = Vrms * 2.5`)

## ESP32 Serial Monitor Output
```
======================================
  3-Phase ESP32 Monitor Starting...
======================================

📱 Initializing GSM Module...
✅ GSM Ready

📡 Connecting to WiFi: Jack's
✅ WiFi Connected!
📍 IP Address: 192.168.1.100
🌐 WebSocket Server: ws://192.168.1.100:81

┌─────────────────────────────────────────┐
│      3-PHASE READINGS                   │
├─────────────────────────────────────────┤
│ Phase-1 (R) │ 0.50 A │ 12.40 V        │
│ Phase-2 (Y) │ 0.48 A │ 12.35 V        │
│ Phase-3 (B) │ 0.52 A │ 12.42 V        │
└─────────────────────────────────────────┘
Relays: R=OK | Y=OK | B=OK

📤 Sent to Dashboard: {"I1":0.50,"V1":12.40,"I2":0.48,"V2":12.35,"I3":0.52,"V3":12.42}
```

## Quick Start Checklist
- [ ] ESP32 powered and running
- [ ] WiFi connected (check Serial Monitor for IP)
- [ ] Dashboard Settings configured with ESP32 IP:81
- [ ] Connection badge shows "Live" (green)
- [ ] Graphs displaying real-time data
- [ ] Test fault detection by disconnecting a phase

## Support
If issues persist:
1. Check ESP32 Serial Monitor for errors
2. Verify network connectivity (ping ESP32 IP)
3. Test WebSocket using browser console:
```javascript
ws = new WebSocket('ws://192.168.1.100:81');
ws.onmessage = (e) => console.log(e.data);
```

---
**Dashboard Features**: Real-time monitoring | Fault detection | Phase comparison | Power analysis | Historical graphs
