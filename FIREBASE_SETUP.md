# Firebase Integration Setup Guide

## 🔥 Firebase Setup Steps

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `ksebl-fault-detection` (or your choice)
4. Disable Google Analytics (optional)
5. Click **"Create project"**

### 2. Enable Firebase Services

#### **Firestore Database** (for historical data)
1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll adjust rules later)
4. Select your region (preferably closest to you)
5. Click **"Enable"**

#### **Realtime Database** (for live monitoring)
1. Go to **Build** → **Realtime Database**
2. Click **"Create Database"**
3. Choose your region
4. Start in **"locked mode"** (we'll adjust rules later)
5. Click **"Enable"**

### 3. Get Firebase Configuration

1. In Firebase Console, click the **⚙️ Settings** icon → **Project settings**
2. Scroll down to **"Your apps"** section
3. Click **"Web"** icon (</>) to add a web app
4. Give it a nickname: `KSEBL Dashboard`
5. Click **"Register app"**
6. Copy the `firebaseConfig` object

### 4. Update Your Code

Open `src/config/firebase.ts` and replace the configuration:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  databaseURL: "https://your-project-id-default-rtdb.firebaseio.com"
};
```

### 5. Configure Security Rules

#### **Firestore Rules** (Build → Firestore Database → Rules)
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for sensor readings
    match /sensorReadings/{document=**} {
      allow read, write: if true;
    }
    
    // Allow read/write for alerts
    match /alerts/{document=**} {
      allow read, write: if true;
    }
  }
}
```

#### **Realtime Database Rules** (Build → Realtime Database → Rules)
```json
{
  "rules": {
    "liveData": {
      ".read": true,
      ".write": true
    }
  }
}
```

⚠️ **Note:** These rules allow public access. For production, implement proper authentication.

---

## 📊 Data Structure

### **Firestore Collections**

#### `sensorReadings` - Historical sensor data
```javascript
{
  phase: "R" | "Y" | "B",
  voltage: 12.8,
  current: 0.405,
  power: 5.184,
  status: "normal" | "warning" | "critical",
  timestamp: Timestamp
}
```

#### `alerts` - Fault alerts
```javascript
{
  phase: "R" | "Y" | "B",
  message: "High voltage detected: 13.5V",
  type: "warning" | "critical",
  timestamp: Timestamp
}
```

### **Realtime Database**

#### `/liveData` - Current live values
```javascript
{
  R: { voltage: 12.8, current: 0.405, power: 5.184 },
  Y: { voltage: 12.8, current: 0.423, power: 5.414 },
  B: { voltage: 12.8, current: 0.315, power: 4.032 },
  lastUpdate: 1733318400000
}
```

---

## 🚀 Features Implemented

### ✅ **Automatic Data Logging**
- Every sensor reading saved to Firestore
- Includes voltage, current, power, status, and timestamp
- Separate entries for each phase (R, Y, B)

### ✅ **Alert System**
- Critical and warning alerts saved to database
- Includes phase information and detailed messages
- Timestamped for historical analysis

### ✅ **Live Data Sync**
- Real-time data updated every 5 seconds
- All 3 phases synchronized to Realtime Database
- Accessible from anywhere with Firebase SDK

### ✅ **Status Indicators**
- **Green Firebase icon**: Successfully syncing data
- **Yellow Firebase icon**: Connection standby
- Shows "Firebase Synced" when active

---

## 📱 Usage

### **Monitor Real-time Data**
```typescript
import { firebaseService } from './services/firebaseService';

// Subscribe to live data updates
const unsubscribe = firebaseService.subscribeToLiveData((data) => {
  console.log('R Phase:', data.R);
  console.log('Y Phase:', data.Y);
  console.log('B Phase:', data.B);
});
```

### **Get Historical Data**
```typescript
// Get last 100 readings
const readings = await firebaseService.getRecentReadings(100);

// Get last 50 alerts
const alerts = await firebaseService.getRecentAlerts(50);
```

### **Get Phase Statistics**
```typescript
// Get 24-hour statistics for R Phase
const stats = await firebaseService.getPhaseStatistics('R', 24);
console.log('Average Voltage:', stats.avgVoltage);
console.log('Max Current:', stats.maxCurrent);
```

---

## 🔍 Testing

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open browser console** and check for:
   - ✅ "Firebase Synced" status in header
   - ✅ Console logs showing successful saves
   - ✅ No Firebase errors

3. **Verify in Firebase Console:**
   - Go to **Firestore Database** → Check `sensorReadings` collection
   - Go to **Realtime Database** → Check `/liveData` node
   - Data should appear as ESP32 sends readings

---

## 🛠️ Troubleshooting

### Firebase Not Connecting?
- ✓ Check if `firebaseConfig` is correctly set
- ✓ Verify Firebase services are enabled
- ✓ Check browser console for errors
- ✓ Ensure security rules allow read/write

### No Data in Database?
- ✓ ESP32 must be connected and sending data
- ✓ Check if `firebaseConnected` status is green
- ✓ Look for console errors during save operations
- ✓ Verify internet connection

### Data Not Updating?
- ✓ Check if live data interval is running (5 seconds)
- ✓ Ensure phases are receiving ESP32 data
- ✓ Verify Realtime Database rules are set correctly

---

## 📦 Installed Packages

```json
{
  "firebase": "^11.x.x"  // Added for Firebase integration
}
```

---

## 🎯 Next Steps (Optional)

1. **Add Authentication**
   - Implement Firebase Auth for secure access
   - Role-based access control

2. **Add Cloud Functions**
   - Automatic SMS alerts via Twilio
   - Email notifications for critical faults
   - Data aggregation and analytics

3. **Add Storage**
   - Store historical charts as images
   - Export reports to PDF

4. **Mobile App**
   - Build React Native app using same Firebase backend
   - Real-time mobile notifications

---

## 📞 Support

For Firebase documentation: [Firebase Docs](https://firebase.google.com/docs)
For issues: Check browser console and Firebase Console logs
