# Three-Phase Monitoring System

## Overview

The dashboard now supports **3-phase monitoring** (R, Y, B phases) with a phase selector interface.

## Features Added

### 1. Phase Selector UI
- **3 Phase Buttons**: R (Red), Y (Yellow), B (Blue)
- **Real-time Values**: Each button shows current voltage and current for that phase
- **Active State**: Selected phase is highlighted with colored border and glow
- **Responsive Design**: Stacks vertically on mobile devices

### 2. Phase Color Coding
- **R Phase (Red)**: Red gradient button (#ef4444)
- **Y Phase (Yellow)**: Yellow gradient button (#eab308)
- **B Phase (Blue)**: Blue gradient button (#3b82f6)

### 3. Data Flow

```
ESP32 → WebSocket → Dashboard
  ↓
3 Phases:
├─ R Phase (ADS1115 A0)
├─ Y Phase (ADS1115 A1)
└─ B Phase (Not connected - shows 0)
```

## Current Configuration

### Hardware Setup
| Phase | Color  | CT Sensor | ADS1115 Channel | Status |
|-------|--------|-----------|-----------------|--------|
| R     | Red    | CT1       | A0              | ✅ Active |
| Y     | Yellow | CT2       | A1              | ✅ Active |
| B     | Blue   | -         | A2              | ⚠️ Not connected |

### Data Structure (WebSocket JSON)

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

## How to Use

### 1. Upload Updated Code
- Upload the modified `ESP32_Current_Monitor.ino` to your ESP32
- The code now sends 3-phase data via WebSocket

### 2. View Dashboard
- Start the website: `npm run dev`
- Open in browser
- You'll see 3 phase buttons at the top

### 3. Switch Between Phases
- Click any phase button (R, Y, or B)
- The gauges will update to show that phase's data
- Active phase is highlighted

### 4. Monitor All Phases
- Each button displays live values
- Quick overview without switching
- Example: `12.5V / 3.8A`

## Adding the 3rd Phase (B Phase)

To enable full 3-phase monitoring:

### Hardware Steps
1. Connect 3rd CT sensor to **ADS1115 Channel A2**
2. Same wiring as Phase 1 and 2

### Software Steps

Update `ESP32_Current_Monitor.ino`:

```cpp
// In loop(), add measurement for A2
float rmsA2, freqA2, p2pA2;
measurePhase(2, rmsA2, freqA2, p2pA2);

// Add calibration
float CALIB_P3 = 1.00;  // Adjust after testing
float burdenVrmsA2 = rmsA2 * CALIB_P3;
float i_secondary_A2 = burdenVrmsA2 / BURDEN_OHMS;
float i_line_A2 = i_secondary_A2 * CT_RATIO;

// Update WebSocket data
doc["current_B"] = i_line_A2;
doc["frequency_B"] = freqA2;
```

## UI Features

### Phase Button States

**Normal State:**
- Semi-transparent background
- Subtle border
- Phase icon with gradient

**Hover State:**
- Lifts up slightly
- Increased glow effect
- Brighter colors

**Active State:**
- Thicker border (3px)
- Stronger glow
- Increased lift
- Color-matched to phase

### Responsive Design

**Desktop (> 768px):**
- 3 buttons side by side
- Large phase icons (60px)
- Full labels and values

**Mobile (< 768px):**
- Buttons stack vertically
- Smaller icons (50px)
- Compact padding

## Testing

### Test with Current Setup (2 phases)
```javascript
// Browser console
sendTestData(12.5, 3.8);  // Tests R phase
```

### Verify Phase Switching
1. Click R Phase button → Should show Phase 1 data
2. Click Y Phase button → Should show Phase 2 data
3. Click B Phase button → Should show 0A (not connected)

### Monitor Serial Output
```
PHASE-1: (R Phase)
  Vrms Burden: 0.0308
  I_line:      1.234
  Freq:        50.0

PHASE-2: (Y Phase)
  Vrms Burden: 0.0264
  I_line:      0.856
  Freq:        50.0
```

## Troubleshooting

### Phase buttons not working
- Check browser console for errors
- Verify WebSocket connection
- Ensure data format matches expected structure

### B Phase shows 0
- **Expected behavior** - 3rd CT sensor not connected yet
- Add CT sensor to A2 channel to enable

### Values not updating when switching
- Clear browser cache
- Refresh page
- Check WebSocket is sending data

### Phase colors wrong
- CSS might not be loaded
- Hard refresh: Ctrl + Shift + R
- Check browser dev tools for CSS errors

## Future Enhancements

### Possible Additions
1. **Phase Comparison View**: Show all 3 phases side-by-side
2. **Phase Imbalance Detection**: Alert if phases are unbalanced
3. **Load Distribution**: Visualize load across phases
4. **Historical Trends**: Track each phase over time
5. **Power Factor**: Add power factor monitoring per phase
6. **Neutral Current**: Calculate and display neutral current

### Hardware Expansion
- Add voltage sensors for actual voltage measurement
- Add power factor sensors
- Add temperature monitoring per phase
- Add harmonic analysis

## Notes

- **Voltage is currently fixed at 230V** - modify if different
- **Frequency assumed 50Hz** - adjust for 60Hz systems
- **Current calibration** may need adjustment per CT sensor
- **Relay protection** works on Phase 1 (R) and Phase 2 (Y)
- **B Phase relay** can be added to Pin 27 (when hardware added)

## Color Reference

| Phase | Color Name | Hex Code | RGB |
|-------|-----------|----------|-----|
| R     | Red       | #ef4444  | 239, 68, 68 |
| Y     | Yellow    | #eab308  | 234, 179, 8 |
| B     | Blue      | #3b82f6  | 59, 130, 246 |
