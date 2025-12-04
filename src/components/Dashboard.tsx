import { useState, useEffect } from 'react';
import { Activity, Zap, AlertTriangle, CheckCircle, Radio, Maximize, Minimize, BarChart3, Clock, TrendingUp, Power, Download, Database } from 'lucide-react';
import VoltageGauge from './VoltageGauge';
import CurrentGauge from './CurrentGauge';
import LineChart from './LineChart';
import AlertPanel from './AlertPanel';
import SystemInfo from './SystemInfo';
import PowerAnalysis from './PowerAnalysis';
import ThemeSelector from './ThemeSelector';
import ParticleBackground from './ParticleBackground';
import { ESP32Service } from '../services/esp32Service';
import { firebaseService } from '../services/firebaseService';
import '../styles/Dashboard.css';
import '../styles/3DEffects.css';

interface SensorData {
  voltage: number;
  current: number;
  timestamp: string;
  status: 'normal' | 'warning' | 'critical';
}

interface PhaseData {
  voltage: number;
  current: number;
}

type Phase = 'R' | 'Y' | 'B';

const Dashboard = () => {
  // Phase selection state
  const [selectedPhase, setSelectedPhase] = useState<Phase>('R');
  
  // Data for all three phases
  const [phaseDataR, setPhaseDataR] = useState<PhaseData>({ voltage: 0, current: 0 });
  const [phaseDataY, setPhaseDataY] = useState<PhaseData>({ voltage: 0, current: 0 });
  const [phaseDataB, setPhaseDataB] = useState<PhaseData>({ voltage: 0, current: 0 });
  
  // ESP32 IP Configuration
  const [esp32IP, setEsp32IP] = useState<string>('10.117.120.133');
  const [inputIP, setInputIP] = useState<string>('10.117.120.133');
  const [esp32Service, setEsp32Service] = useState<ESP32Service | null>(null);
  const [showIPInput, setShowIPInput] = useState<boolean>(false);

  const [sensorData, setSensorData] = useState<SensorData>({
    voltage: 0,
    current: 0,
    timestamp: new Date().toISOString(),
    status: 'normal'
  });

  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [powerConsumption, setPowerConsumption] = useState(0);
  const [totalEnergy, setTotalEnergy] = useState(0);
  const [peakVoltage, setPeakVoltage] = useState(0);
  const [peakCurrent, setPeakCurrent] = useState(0);
  const [uptime, setUptime] = useState(0);
  const [firebaseConnected, setFirebaseConnected] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  // Get current phase data based on selection
  const getCurrentPhaseData = (): PhaseData => {
    switch (selectedPhase) {
      case 'R': return phaseDataR;
      case 'Y': return phaseDataY;
      case 'B': return phaseDataB;
      default: return phaseDataR;
    }
  };

  // Function to connect to ESP32 with given IP
  const connectToESP32 = (ip: string) => {
    // Disconnect existing service if any
    if (esp32Service) {
      esp32Service.disconnect();
    }

    const service = new ESP32Service(
      `ws://${ip}:81`,
      (data) => {
        // Handle incoming data from ESP32 - now with 3 phases
        setPhaseDataR({ voltage: data.voltage_R || 0, current: data.current_R || 0 });
        setPhaseDataY({ voltage: data.voltage_Y || 0, current: data.current_Y || 0 });
        setPhaseDataB({ voltage: data.voltage_B || 0, current: data.current_B || 0 });
        
        // Update current phase display
        const currentPhase = getCurrentPhaseData();
        handleSensorData({ 
          voltage: currentPhase.voltage, 
          current: currentPhase.current 
        });
        setIsConnected(true);
      },
      (connected) => {
        setIsConnected(connected);
        if (!connected) {
          console.log('WebSocket disconnected from ESP32');
        }
      }
    );

    // Connect to ESP32
    service.connect();
    setEsp32Service(service);
    setEsp32IP(ip);

    // Expose handleSensorData for testing (can be removed in production)
    (window as any).sendTestData = (voltage: number, current: number) => {
      handleSensorData({ voltage, current });
    };
  };

  // ESP32 WebSocket connection
  useEffect(() => {
    // Auto-connect on mount with default IP
    connectToESP32(esp32IP);

    return () => {
      if (esp32Service) {
        esp32Service.disconnect();
      }
    };
  }, []);

  // Uptime counter
  useEffect(() => {
    const uptimeInterval = setInterval(() => {
      setUptime(prev => prev + 1);
    }, 1000);

    return () => clearInterval(uptimeInterval);
  }, []);

  // Update Firebase Realtime Database with live data every 5 seconds
  useEffect(() => {
    const updateInterval = setInterval(async () => {
      if (isConnected) {
        try {
          await firebaseService.updateLiveData({
            R: {
              voltage: phaseDataR.voltage,
              current: phaseDataR.current,
              power: phaseDataR.voltage * phaseDataR.current
            },
            Y: {
              voltage: phaseDataY.voltage,
              current: phaseDataY.current,
              power: phaseDataY.voltage * phaseDataY.current
            },
            B: {
              voltage: phaseDataB.voltage,
              current: phaseDataB.current,
              power: phaseDataB.voltage * phaseDataB.current
            }
          });
          setFirebaseConnected(true);
        } catch (error) {
          console.error('Firebase live data update error:', error);
          setFirebaseConnected(false);
        }
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(updateInterval);
  }, [isConnected, phaseDataR, phaseDataY, phaseDataB]);

  // Function to handle incoming sensor data from ESP32
  const handleSensorData = (data: { voltage: number; current: number }) => {
    // Detect faults
    let status: 'normal' | 'warning' | 'critical' = 'normal';
    const newAlerts: string[] = [];

    // Voltage range: 0-15V
    if (data.voltage > 13) {
      status = 'warning';
      newAlerts.push(`High voltage detected: ${data.voltage.toFixed(2)}V`);
    }

    if (data.voltage > 14.5) {
      status = 'critical';
      newAlerts.push(`Critical voltage: ${data.voltage.toFixed(2)}V - Exceeding safe limits!`);
    }

    // Current range: 0-10A
    if (data.current > 8) {
      status = 'warning';
      newAlerts.push(`High current detected: ${data.current.toFixed(2)}A`);
    }

    if (data.current > 9.5) {
      status = 'critical';
      newAlerts.push(`Critical current: ${data.current.toFixed(2)}A - Possible short circuit!`);
    }

    // Line break detection (very low voltage and current)
    if (data.current < 0.1 && data.voltage < 1) {
      status = 'critical';
      newAlerts.push(`Line break detected! Voltage: ${data.voltage.toFixed(2)}V, Current: ${data.current.toFixed(2)}A`);
    }

    const newData: SensorData = {
      voltage: data.voltage,
      current: data.current,
      timestamp: new Date().toISOString(),
      status
    };

    setSensorData(newData);
    setIsConnected(true);
    
    setHistoricalData(prev => {
      const updated = [...prev, newData];
      return updated.slice(-30); // Keep last 30 readings
    });

    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 15));
    }

    // Calculate power (P = V * I)
    const power = data.voltage * data.current;
    setPowerConsumption(power);

    // Update peak values
    setPeakVoltage(prev => Math.max(prev, data.voltage));
    setPeakCurrent(prev => Math.max(prev, data.current));

    // Calculate energy consumption (simplified)
    setTotalEnergy(prev => prev + (power / 3600)); // Wh

    // Save to Firebase (every reading)
    saveToFirebase(selectedPhase, data.voltage, data.current, power, status);

    // Save alerts to Firebase
    if (newAlerts.length > 0) {
      newAlerts.forEach(alertMsg => {
        saveAlertToFirebase(selectedPhase, alertMsg, status);
      });
    }
  };

  // Save sensor reading to Firebase
  const saveToFirebase = async (phase: Phase, voltage: number, current: number, power: number, status: 'normal' | 'warning' | 'critical') => {
    try {
      await firebaseService.saveSensorReading({
        phase,
        voltage,
        current,
        power,
        status,
        timestamp: new Date()
      });
      setFirebaseConnected(true);
      setLastSaveTime(new Date());
    } catch (error) {
      console.error('Firebase save error:', error);
      setFirebaseConnected(false);
    }
  };

  // Save alert to Firebase
  const saveAlertToFirebase = async (phase: Phase, message: string, type: 'warning' | 'critical') => {
    try {
      await firebaseService.saveAlert({
        phase,
        message,
        type,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Firebase alert save error:', error);
    }
  };

  const getStatusColor = () => {
    switch (sensorData.status) {
      case 'critical': return '#ff4444';
      case 'warning': return '#ffaa00';
      default: return '#00dd00';
    }
  };

  const getStatusText = () => {
    switch (sensorData.status) {
      case 'critical': return 'CRITICAL - IMMEDIATE ACTION REQUIRED';
      case 'warning': return 'WARNING - Abnormal readings detected';
      default: return 'System Operating Normally';
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const exportData = () => {
    const dataStr = JSON.stringify(historicalData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sensor-data-${new Date().toISOString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleIPSubmit = () => {
    if (inputIP.trim()) {
      connectToESP32(inputIP.trim());
      setShowIPInput(false);
    }
  };

  const handleIPKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleIPSubmit();
    }
  };

  return (
    <div className="dashboard">
      <ParticleBackground />
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <Zap size={40} color="var(--primary-color)" />
            <div>
              <h1>KSEBL Fault Detection System</h1>
              <p>Low Voltage AC Distribution Monitoring</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="connection-status" onClick={() => setShowIPInput(!showIPInput)} style={{ cursor: 'pointer' }}>
              <Radio 
                size={20} 
                color={isConnected ? '#00ff00' : '#ff0000'} 
                className={isConnected ? 'pulse' : ''}
              />
              <span>{isConnected ? `ESP32 Connected (${esp32IP})` : 'Disconnected - Click to configure'}</span>
            </div>
            <div className="connection-status" title="Firebase Database">
              <Database 
                size={20} 
                color={firebaseConnected ? '#00ff00' : '#ffaa00'} 
                className={firebaseConnected ? 'pulse' : ''}
              />
              <span>{firebaseConnected ? 'Firebase Synced' : 'Firebase Standby'}</span>
            </div>
            {showIPInput && (
              <div className="ip-input-container">
                <input
                  type="text"
                  className="ip-input"
                  placeholder="Enter ESP32 IP (e.g., 192.168.1.100)"
                  value={inputIP}
                  onChange={(e) => setInputIP(e.target.value)}
                  onKeyPress={handleIPKeyPress}
                />
                <button className="ip-connect-btn" onClick={handleIPSubmit}>
                  Connect
                </button>
              </div>
            )}
            <ThemeSelector />
            <button className="header-btn" onClick={exportData} title="Export Data">
              <Download size={20} />
            </button>
            <button className="header-btn" onClick={toggleFullScreen} title="Toggle Fullscreen">
              {isFullScreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* Status Banner */}
      <div className="status-banner" style={{ backgroundColor: getStatusColor() }}>
        <div className="status-content">
          {sensorData.status === 'critical' && <AlertTriangle size={24} />}
          {sensorData.status === 'warning' && <Activity size={24} />}
          {sensorData.status === 'normal' && <CheckCircle size={24} />}
          <span className="status-text">{getStatusText()}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="dashboard-content">
        {/* Phase Selector */}
        <div className="phase-selector">
          <h3 className="phase-selector-title">Select Phase</h3>
          <div className="phase-buttons">
            <button 
              className={`phase-btn phase-R ${selectedPhase === 'R' ? 'active' : ''}`}
              onClick={() => setSelectedPhase('R')}
            >
              <span className="phase-icon">R</span>
              <span className="phase-label">R Phase</span>
              <span className="phase-values">{phaseDataR.voltage.toFixed(2)}V / {phaseDataR.current.toFixed(2)}A</span>
            </button>
            <button 
              className={`phase-btn phase-Y ${selectedPhase === 'Y' ? 'active' : ''}`}
              onClick={() => setSelectedPhase('Y')}
            >
              <span className="phase-icon">Y</span>
              <span className="phase-label">Y Phase</span>
              <span className="phase-values">{phaseDataY.voltage.toFixed(2)}V / {phaseDataY.current.toFixed(2)}A</span>
            </button>
            <button 
              className={`phase-btn phase-B ${selectedPhase === 'B' ? 'active' : ''}`}
              onClick={() => setSelectedPhase('B')}
            >
              <span className="phase-icon">B</span>
              <span className="phase-label">B Phase</span>
              <span className="phase-values">{phaseDataB.voltage.toFixed(2)}V / {phaseDataB.current.toFixed(2)}A</span>
            </button>
          </div>
        </div>

        {/* Real-time Gauges */}
        <div className="gauges-section">
          <VoltageGauge 
            value={getCurrentPhaseData().voltage} 
            status={sensorData.status}
          />
          <CurrentGauge 
            value={getCurrentPhaseData().current} 
            status={sensorData.status}
          />
        </div>

        {/* Historical Charts - Full Width */}
        <div className="charts-section">
          <LineChart 
            data={historicalData}
            title="Voltage & Current Trends"
          />
        </div>

        {/* Two Column Layout for Power Analysis and System Info */}
        <div className="two-column-layout">
          <PowerAnalysis 
            power={powerConsumption}
            totalEnergy={totalEnergy}
            voltage={sensorData.voltage}
            current={sensorData.current}
          />
          
          <SystemInfo 
            isConnected={isConnected}
            uptime={uptime}
            dataPoints={historicalData.length}
          />
        </div>

        {/* Alerts Panel - Full Width */}
        <div className="alerts-section">
          <AlertPanel alerts={alerts} />
        </div>

        {/* System Statistics Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <Power size={24} />
            </div>
            <div className="stat-content">
              <h3>Power</h3>
              <p className="stat-value">{powerConsumption.toFixed(2)} W</p>
              <span className="stat-label">Real-time consumption</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <h3>Energy</h3>
              <p className="stat-value">{totalEnergy.toFixed(3)} Wh</p>
              <span className="stat-label">Total consumed</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <BarChart3 size={24} />
            </div>
            <div className="stat-content">
              <h3>Peak Voltage</h3>
              <p className="stat-value">{peakVoltage.toFixed(2)} V</p>
              <span className="stat-label">Maximum recorded</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
              <Activity size={24} />
            </div>
            <div className="stat-content">
              <h3>Peak Current</h3>
              <p className="stat-value">{peakCurrent.toFixed(2)} A</p>
              <span className="stat-label">Maximum recorded</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
              <Clock size={24} />
            </div>
            <div className="stat-content">
              <h3>Uptime</h3>
              <p className="stat-value">{formatUptime(uptime)}</p>
              <span className="stat-label">System running</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}>
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <h3>Total Alerts</h3>
              <p className="stat-value">{alerts.length}</p>
              <span className="stat-label">Since start</span>
            </div>
          </div>
        </div>

        {/* Additional Info Cards */}
        <div className="info-section">
          <div className="info-card">
            <h3>Last Update</h3>
            <p>{new Date(sensorData.timestamp).toLocaleTimeString()}</p>
          </div>
          <div className="info-card">
            <h3>Data Points</h3>
            <p>{historicalData.length} readings</p>
          </div>
          <div className="info-card">
            <h3>Status</h3>
            <p style={{ color: getStatusColor() }}>{sensorData.status.toUpperCase()}</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="dashboard-footer">
          <div className="footer-content">
            <div className="footer-section">
              <h4>KSEBL Fault Detection System</h4>
              <p>Real-time monitoring and fault detection for low voltage AC distribution networks</p>
            </div>
            <div className="footer-section">
              <h4>Technical Specifications</h4>
              <p>ESP32 Microcontroller | 12-bit ADC | HTTP/REST API | 1Hz Sampling</p>
            </div>
            <div className="footer-section">
              <h4>System Status</h4>
              <p>Version 1.0 | {new Date().getFullYear()} | All Rights Reserved</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard;
