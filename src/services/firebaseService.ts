import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  Timestamp,
  getDocs,
  where
} from 'firebase/firestore';
import { ref, set, onValue, push } from 'firebase/database';
import { db, realtimeDb } from '../config/firebase';

export interface SensorReading {
  phase: 'R' | 'Y' | 'B';
  voltage: number;
  current: number;
  power: number;
  status: 'normal' | 'warning' | 'critical';
  timestamp: Date;
}

export interface AlertData {
  phase: 'R' | 'Y' | 'B';
  message: string;
  type: 'warning' | 'critical';
  timestamp: Date;
}

class FirebaseService {
  // Save sensor reading to Firestore
  async saveSensorReading(reading: SensorReading) {
    try {
      const docRef = await addDoc(collection(db, 'sensorReadings'), {
        ...reading,
        timestamp: Timestamp.fromDate(reading.timestamp)
      });
      console.log('Reading saved with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving reading:', error);
      throw error;
    }
  }

  // Save alert to Firestore
  async saveAlert(alert: AlertData) {
    try {
      const docRef = await addDoc(collection(db, 'alerts'), {
        ...alert,
        timestamp: Timestamp.fromDate(alert.timestamp)
      });
      console.log('Alert saved with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error saving alert:', error);
      throw error;
    }
  }

  // Get recent sensor readings
  async getRecentReadings(limitCount: number = 100) {
    try {
      const q = query(
        collection(db, 'sensorReadings'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const readings: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        readings.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate()
        });
      });
      
      return readings;
    } catch (error) {
      console.error('Error getting readings:', error);
      throw error;
    }
  }

  // Get recent alerts
  async getRecentAlerts(limitCount: number = 50) {
    try {
      const q = query(
        collection(db, 'alerts'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const alerts: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        alerts.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate()
        });
      });
      
      return alerts;
    } catch (error) {
      console.error('Error getting alerts:', error);
      throw error;
    }
  }

  // Real-time listener for sensor readings
  subscribeToReadings(callback: (readings: any[]) => void) {
    const q = query(
      collection(db, 'sensorReadings'),
      orderBy('timestamp', 'desc'),
      limit(30)
    );
    
    return onSnapshot(q, (snapshot) => {
      const readings: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        readings.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate()
        });
      });
      callback(readings);
    });
  }

  // Real-time listener for alerts
  subscribeToAlerts(callback: (alerts: any[]) => void) {
    const q = query(
      collection(db, 'alerts'),
      orderBy('timestamp', 'desc'),
      limit(15)
    );
    
    return onSnapshot(q, (snapshot) => {
      const alerts: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        alerts.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate()
        });
      });
      callback(alerts);
    });
  }

  // Save current phase data to Realtime Database (for live monitoring)
  async updateLiveData(phaseData: {
    R: { voltage: number; current: number; power: number };
    Y: { voltage: number; current: number; power: number };
    B: { voltage: number; current: number; power: number };
  }) {
    try {
      const liveDataRef = ref(realtimeDb, 'liveData');
      await set(liveDataRef, {
        ...phaseData,
        lastUpdate: Date.now()
      });
    } catch (error) {
      console.error('Error updating live data:', error);
      throw error;
    }
  }

  // Subscribe to live data updates
  subscribeToLiveData(callback: (data: any) => void) {
    const liveDataRef = ref(realtimeDb, 'liveData');
    return onValue(liveDataRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data);
      }
    });
  }

  // Get statistics for a specific phase
  async getPhaseStatistics(phase: 'R' | 'Y' | 'B', hours: number = 24) {
    try {
      const now = new Date();
      const timeAgo = new Date(now.getTime() - hours * 60 * 60 * 1000);
      
      const q = query(
        collection(db, 'sensorReadings'),
        where('phase', '==', phase),
        where('timestamp', '>=', Timestamp.fromDate(timeAgo)),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const readings: any[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        readings.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate()
        });
      });
      
      // Calculate statistics
      if (readings.length === 0) {
        return null;
      }
      
      const voltages = readings.map(r => r.voltage);
      const currents = readings.map(r => r.current);
      const powers = readings.map(r => r.power);
      
      return {
        avgVoltage: voltages.reduce((a, b) => a + b, 0) / voltages.length,
        maxVoltage: Math.max(...voltages),
        minVoltage: Math.min(...voltages),
        avgCurrent: currents.reduce((a, b) => a + b, 0) / currents.length,
        maxCurrent: Math.max(...currents),
        minCurrent: Math.min(...currents),
        avgPower: powers.reduce((a, b) => a + b, 0) / powers.length,
        maxPower: Math.max(...powers),
        totalReadings: readings.length
      };
    } catch (error) {
      console.error('Error getting phase statistics:', error);
      throw error;
    }
  }
}

export const firebaseService = new FirebaseService();
