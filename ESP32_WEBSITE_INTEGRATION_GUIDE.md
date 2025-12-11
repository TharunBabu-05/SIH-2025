# ESP32 and Website Integration - Complete Update Summary

## Overview
Updated the ESP32 code and website to display comprehensive fault detection data including relay status, fault location (pole number & distance), RC timing measurements, and baseline current readings.

## ESP32 Code Updates (`ESP32_Current_Monitor_Updated.ino`)

### New Features Added:
1. **WiFi & WebSocket Integration**
   - Added WiFi connection capability
   - WebSocket server on port 81 for real-time data transmission
   - JSON-based data transmission using ArduinoJson library

2. **Enhanced Data Transmission**
   The ESP32 now sends the following data for each phase (R, Y, B):
   - `voltage_R/Y/B`: Real-time voltage readings
   - `current_R/Y/B`: Real-time current readings
   - `power_R/Y/B`: Calculated power (V × I)
   - `status_R/Y/B`: Phase status ("NORMAL", "WARNING", "CUT")
   - `relay_R/Y/B`: Relay cut status (true/false)
   - `baseline_R/Y/B`: Baseline current for fault detection
   - `pole_R/Y/B`: Fault pole number (when fault detected)
   - `distance_R/Y/B`: Fault distance in meters (when fault detected)
   - `rcTime_R/Y/B`: RC timing measurement in microseconds

3. **System Information**
   - `timestamp`: Milliseconds since ESP32 boot
   - `wifi_rssi`: WiFi signal strength

### Required Libraries:
```cpp
#include <WiFi.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
```

### Configuration Required:
```cpp
// Update these with your WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
```

### Pin Configuration (Same as original):
- **Phase R (Phase 1)**: RELAY1=25, P1_OUT=32, P1_ADC=34, ADS=CH0
- **Phase Y (Phase 2)**: RELAY2=26, P2_OUT=33, P2_ADC=35, ADS=CH1  
- **Phase B (Phase 3)**: RELAY3=27, P3_OUT=14, P3_ADC=39, ADS=CH2

## Website Code Updates

### 1. New Component: `FaultLocationPanel.tsx`

**Purpose**: Displays comprehensive fault detection and location information

**Features**:
- Real-time relay status (Active / Cut)
- Current readings vs baseline current comparison
- Fault location display (Pole number & distance in meters/km)
- RC timing measurements
- Fault alert messages with location details
- Color-coded status indicators (Normal/Warning/Fault)
- Phase-specific cards (R=Red, Y=Yellow, B=Blue)

**Data Displayed Per Phase**:
1. **Relay Status**: Shows if phase is active or cut for protection
2. **Current Reading**: Real-time current in Amperes
3. **Baseline Current**: Reference current for fault detection
4. **Fault Pole Number**: Which pole the fault occurred at (when fault detected)
5. **Distance from Origin**: Fault distance in meters and kilometers
6. **RC Timing**: Resistance-Capacitance measurement in microseconds and milliseconds

### 2. Updated: `MonitoringDashboard.tsx`

**Changes**:
- Updated `PhaseData` interface to include:
  - `baseline?: number` - Baseline current
  - `relayCut?: boolean` - Relay cut status
  - `faultPole?: number` - Pole number where fault occurred
  - `faultDistance?: number` - Distance to fault in meters
  - `rcTime?: number` - RC timing measurement

- Enhanced WebSocket data handling to extract all new ESP32 fields
- Integrated `FaultLocationPanel` component into dashboard layout

### 3. New File: `FaultLocationPanel.css`

**Styling Features**:
- Gradient backgrounds with glassmorphism effect
- Animated fault indicators (pulsing borders and badges)
- Color-coded status badges (Green=Normal, Yellow=Warning, Red=Fault)
- Responsive grid layout
- Highlight animations for fault information
- Fade-in animations for fault alerts

## Data Flow

```
ESP32 Hardware
    ↓
[Measure 3-Phase Data]
    ↓
[Detect Faults & Measure RC Distance]
    ↓
[Send via WebSocket on port 81]
    ↓
Website (MonitoringDashboard)
    ↓
[Parse JSON Data]
    ↓
[Update Phase State]
    ↓
[Display in FaultLocationPanel]
    ↓
[Save to Firebase]
```

## What Users Can See

### 1. Normal Operation:
- All three phases showing "NORMAL" status
- Relay status: "Active" (green)
- Real-time voltage, current, and power readings
- Baseline current established for each phase

### 2. During Fault:
- Phase turns to "FAULT" status (red)
- Relay status: "CUT (Protected)" (red)
- **Fault Pole Number** displayed (e.g., "Pole #3")
- **Fault Distance** shown (e.g., "1.600 m (0.002 km)")
- **RC Timing** measurement (e.g., "2500 µs (2.500 ms)")
- Prominent alert message with fault location details

### 3. Warning State:
- Phase shows "WARNING" status (yellow)
- Indicates current deviation but not yet a full fault
- System still monitoring before triggering cut

## Usage Instructions

### ESP32 Setup:
1. Install required libraries in Arduino IDE:
   - WiFi (built-in)
   - WebSocketsServer by Links2004
   - ArduinoJson by Benoit Blanchon

2. Update WiFi credentials in the code:
   ```cpp
   const char* ssid = "YourWiFiName";
   const char* password = "YourPassword";
   ```

3. Upload code to ESP32
4. Open Serial Monitor to view IP address (e.g., 192.168.1.100)

### Website Setup:
1. Files are already updated in your project
2. Open dashboard settings (⚙️ icon)
3. Enter ESP32 IP address (from Serial Monitor)
4. Click "Save & Connect"
5. Dashboard will automatically connect and display data

### Viewing Fault Information:
1. Connect ESP32 to power
2. ESP32 establishes baseline currents
3. When fault occurs:
   - Relay automatically cuts power to protect system
   - RC measurement determines fault location
   - Website displays:
     - Which phase faulted (R, Y, or B)
     - Exact pole number
     - Distance in meters
     - RC timing measurement
     - Alert message with details

## Technical Details

### Fault Detection Logic:
1. **Phase Cut (0A)**: Voltage < 5V AND Current < 0.05A
2. **Load Drop**: Current deviation from baseline > threshold (0.07A for R/Y, 0.15A for B)
3. **Debounced**: Requires 3 consecutive readings before triggering cut

### RC Distance Measurement:
- Measures time for RC circuit to charge to threshold voltage
- Different RC times map to different section/pole locations:
  - Section 1: < 800µs → Pole #2
  - Section 2: 800-2100µs → Pole #3
  - Section 3: 2100-3150µs → Pole #4
  - Section 4: >= 3150µs → Pole #5
- Distance = Section × 0.5333 meters

### Data Update Rate:
- ESP32 sends data every 250ms
- Website updates in real-time
- Historical data saved to Firebase

## Benefits

1. **Precise Fault Location**: Know exactly which pole has the fault
2. **Quick Response**: Automatic relay protection + immediate notification
3. **Maintenance Efficiency**: Repair crew knows exact location before dispatching
4. **Independent Phase Monitoring**: Each phase monitored separately
5. **Real-time Diagnostics**: RC timing helps diagnose cable/connection issues
6. **Historical Tracking**: All data saved to Firebase for analysis

## Files Modified/Created

### New Files:
- `/ESP32_Current_Monitor_Updated.ino` - Updated ESP32 code with WebSocket
- `/src/components/FaultLocationPanel.tsx` - Fault display component
- `/src/styles/FaultLocationPanel.css` - Styling for fault panel

### Modified Files:
- `/src/components/MonitoringDashboard.tsx` - Added fault data handling
- No other changes required - all other components work as-is

## Next Steps

1. **Upload ESP32 Code**: Flash the updated .ino file to your ESP32
2. **Note IP Address**: Check Serial Monitor for ESP32's IP
3. **Configure Dashboard**: Enter IP in settings
4. **Test System**: Simulate fault (disconnect phase) to verify display
5. **Calibrate RC Values**: Adjust thresholds if needed for your setup

## Support Notes

- Ensure ESP32 and computer are on same WiFi network
- Port 81 must be accessible (not blocked by firewall)
- For debugging, monitor ESP32 Serial output
- Check browser console for WebSocket connection status
- Firebase saves all data automatically for history/graphs

---

**Your system now provides complete fault detection with precise location tracking!** 🎉
