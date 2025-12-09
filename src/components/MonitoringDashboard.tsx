import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Download, TrendingUp, AlertTriangle, Activity, Database, Settings } from 'lucide-react';
import BackendWebSocketService from '../services/backendWebSocket';
import { apiService } from '../services/apiService';
import MeterBox from './MeterBox';
import Analytics from './Analytics';
import '../styles/MonitoringDashboard.css';

interface PhaseData {
  voltage: number;
  current: number;
  power: number;
  status: 'normal' | 'warning' | 'critical';
}

interface SensorData {
  timestamp: string;
  R_V: number;
  Y_V: number;
  B_V: number;
  R_I: number;
  Y_I: number;
  B_I: number;
  fault: boolean;
  fault_type: string | null;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';

const MonitoringDashboard = () => {
  const { user, logout, isEngineer } = useAuth();
  
  const [phaseR, setPhaseR] = useState<PhaseData>({ voltage: 0, current: 0, power: 0, status: 'normal' });
  const [phaseY, setPhaseY] = useState<PhaseData>({ voltage: 0, current: 0, power: 0, status: 'normal' });
  const [phaseB, setPhaseB] = useState<PhaseData>({ voltage: 0, current: 0, power: 0, status: 'normal' });
  
  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastDataReceived, setLastDataReceived] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [faultType, setFaultType] = useState<string>('');
  const [totalEnergy, setTotalEnergy] = useState<number>(0);
  const [uptime, setUptime] = useState<number>(0);
  
  // IP Configuration
  const [deviceIP, setDeviceIP] = useState(() => {
    return localStorage.getItem('device_ip') || 'localhost:3002';
  });
  const [tempIP, setTempIP] = useState(deviceIP);
  
  // Fault Alerts
  const [alerts, setAlerts] = useState<Array<{phase: string, type: string, message: string}>>([]);
  const [phaseCutAlerts, setPhaseCutAlerts] = useState<{R: boolean, Y: boolean, B: boolean}>({R: false, Y: false, B: false});

  // WebSocket connection
  useEffect(() => {
    const wsUrl = `ws://${deviceIP}`;
    const ws = new BackendWebSocketService(
      wsUrl,
      (data: SensorData) => {
        handleIncomingData(data);
      },
      (connected: boolean) => {
        setIsConnected(connected);
      }
    );

    ws.connect();

    // Fetch initial historical data
    fetchRecentData();

    // Uptime counter
    const startTime = Date.now();
    const uptimeInterval = setInterval(() => {
      setUptime(Math.floor((Date.now() - startTime) / 1000)); // seconds
    }, 1000);

    // Check for data timeout (5 seconds without data = disconnected ESP32)
    const dataTimeoutChecker = setInterval(() => {
      if (lastDataReceived === 0) {
        // No data ever received - show as offline
        setIsConnected(false);
      } else {
        const timeSinceLastData = Date.now() - lastDataReceived;
        if (timeSinceLastData > 5000) {
          setIsConnected(false);
        } else {
          setIsConnected(true);
        }
      }
    }, 1000);

    return () => {
      ws.disconnect();
      clearInterval(uptimeInterval);
      clearInterval(dataTimeoutChecker);
    };
  }, [deviceIP]);

  const handleIncomingData = (data: SensorData) => {
    // Update last data received timestamp
    setLastDataReceived(Date.now());
    
    const newAlerts: Array<{phase: string, type: string, message: string}> = [];
    
    // Determine status for each phase and detect faults
    const getStatus = (voltage: number, current: number, phase: string): 'normal' | 'warning' | 'critical' => {
      // FAULT 1: Phase Cut (Near zero voltage/current)
      if (voltage < 5 && current < 0.05) {
        newAlerts.push({phase, type: 'PHASE_CUT', message: `${phase} Phase Cut Detected!`});
        return 'critical';
      }
      
      // FAULT 2: Overload (High current)
      if (current > 1.2) {
        newAlerts.push({phase, type: 'OVERLOAD', message: `${phase} Phase Overload! Current: ${current.toFixed(2)}A`});
        return 'critical';
      }
      
      // FAULT 3: Short Circuit (Very high current spike)
      if (current > 2.0) {
        newAlerts.push({phase, type: 'SHORT_CIRCUIT', message: `${phase} Phase Short Circuit! Immediate Action Required!`});
        return 'critical';
      }
      
      // Warning conditions
      if (current > 1.0) return 'warning';
      if (voltage < 11.5 || voltage > 13.0) return 'warning';
      
      return 'normal';
    };

    setPhaseR({
      voltage: data.R_V,
      current: data.R_I,
      power: data.R_V * data.R_I,
      status: getStatus(data.R_V, data.R_I, 'R')
    });

    setPhaseY({
      voltage: data.Y_V,
      current: data.Y_I,
      power: data.Y_V * data.Y_I,
      status: getStatus(data.Y_V, data.Y_I, 'Y')
    });

    setPhaseB({
      voltage: data.B_V,
      current: data.B_I,
      power: data.B_V * data.B_I,
      status: getStatus(data.B_V, data.B_I, 'B')
    });
    
    // Update alerts
    setAlerts(newAlerts);
    
    // Update phase cut alerts
    setPhaseCutAlerts({
      R: data.R_V < 5 && data.R_I < 0.05,
      Y: data.Y_V < 5 && data.Y_I < 0.05,
      B: data.B_V < 5 && data.B_I < 0.05
    });

    setHistoricalData(prev => [...prev, data].slice(-12)); // Keep last 12 samples
    setLastUpdate(new Date());
    
    // Calculate energy (power * time in hours)
    const totalPower = (data.R_V * data.R_I + data.Y_V * data.Y_I + data.B_V * data.B_I); // in W
    setTotalEnergy(prev => prev + (totalPower / 3600)); // Convert to Wh (assuming 1 second interval)
    
    if (data.fault && data.fault_type) {
      setFaultType(data.fault_type);
    }
  };

  const fetchRecentData = async () => {
    try {
      const response = await apiService.getRecentData(12);
      if (response.success && response.data.length > 0) {
        const formattedData = response.data.map((row: any) => ({
          timestamp: `${row.Date} ${row.Time}`,
          R_V: parseFloat(row.R_V),
          Y_V: parseFloat(row.Y_V),
          B_V: parseFloat(row.B_V),
          R_I: parseFloat(row.R_I),
          Y_I: parseFloat(row.Y_I),
          B_I: parseFloat(row.B_I),
          fault: row.Fault === 'YES',
          fault_type: row.Fault_Type !== 'None' ? row.Fault_Type : null
        }));
        setHistoricalData(formattedData);
      }
    } catch (error) {
      console.error('Failed to fetch recent data:', error);
    }
  };

  const handleDownload = async () => {
    try {
      await apiService.downloadLogs();
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download logs. Please try again.');
    }
  };

  const handleSaveIP = () => {
    localStorage.setItem('device_ip', tempIP);
    setDeviceIP(tempIP);
    setShowSettings(false);
    window.location.reload(); // Reload to reconnect with new IP
  };

  const handleCancelSettings = () => {
    setTempIP(deviceIP);
    setShowSettings(false);
  };

  const systemFault = phaseR.status === 'critical' || phaseY.status === 'critical' || phaseB.status === 'critical';

  return (
    <div className="monitoring-dashboard">
      {/* Header */}
      <header className="dashboard-header-compact">
        <div className="header-left">
          <Activity size={24} className="header-icon" />
          <h1>KSEBL Monitoring - 3-Phase Fault Detection</h1>
        </div>
        
        <div className="header-right">
          <div className={`connection-badge ${isConnected ? 'connected' : 'disconnected'}`}>
            <Database size={18} />
            <span>{isConnected ? 'Live' : 'Offline'}</span>
          </div>
          
          <div className="user-info">
            <div className={`role-indicator ${user?.role}`}>
              {user?.role === 'engineer' ? '👨‍💼' : '👷'}
            </div>
            <div className="user-details">
              <span className="user-name">{user?.name}</span>
              <span className="user-role">{user?.role}</span>
            </div>
          </div>

          <button 
            className="icon-btn" 
            onClick={() => setShowSettings(true)}
            title="Device Settings"
          >
            <Settings size={20} />
          </button>

          {isEngineer && (
            <>
              <button 
                className="icon-btn" 
                onClick={() => setShowAnalytics(!showAnalytics)}
                title="Analytics"
              >
                <TrendingUp size={20} />
              </button>
              <button 
                className="icon-btn" 
                onClick={handleDownload}
                title="Download Logs"
              >
                <Download size={20} />
              </button>
            </>
          )}
          
          <button className="icon-btn logout-btn" onClick={logout} title="Logout">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Phase Cut Notifications */}
      {(phaseCutAlerts.R || phaseCutAlerts.Y || phaseCutAlerts.B) && (
        <div className="phase-cut-notifications">
          {phaseCutAlerts.R && (
            <div className="phase-cut-alert phase-cut-r">
              <AlertTriangle size={24} />
              <div className="alert-content">
                <strong>RED PHASE CUT DETECTED!</strong>
                <span>Phase R has been disconnected. Immediate attention required.</span>
              </div>
            </div>
          )}
          {phaseCutAlerts.Y && (
            <div className="phase-cut-alert phase-cut-y">
              <AlertTriangle size={24} />
              <div className="alert-content">
                <strong>YELLOW PHASE CUT DETECTED!</strong>
                <span>Phase Y has been disconnected. Immediate attention required.</span>
              </div>
            </div>
          )}
          {phaseCutAlerts.B && (
            <div className="phase-cut-alert phase-cut-b">
              <AlertTriangle size={24} />
              <div className="alert-content">
                <strong>BLUE PHASE CUT DETECTED!</strong>
                <span>Phase B has been disconnected. Immediate attention required.</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fault Alerts Banner */}
      {alerts.length > 0 && (
        <div className="alerts-container">
          {alerts.map((alert, index) => (
            <div key={index} className={`alert-banner ${alert.type.toLowerCase()}`}>
              <AlertTriangle size={20} />
              <span><strong>{alert.phase} Phase:</strong> {alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* System Status Banner */}
      {systemFault && (
        <div className="alert-banner critical">
          <AlertTriangle size={24} />
          <span>SYSTEM FAULT DETECTED - Immediate attention required!</span>
        </div>
      )}

      {/* Main Content */}
      <div className="dashboard-main">
        <div className="dashboard-grid">
          {/* Left - Meter Box (Compact) */}
          <div className="meter-section">
            <MeterBox
              phaseR={phaseR}
              phaseY={phaseY}
              phaseB={phaseB}
              historicalData={historicalData}
              lastUpdate={lastUpdate}
              isWorker={!isEngineer}
            />
          </div>

          {/* Right - Info Panels */}
          <div className="info-panels">
            {/* System Status */}
            <div className="info-card">
              <h3><Activity size={18} /> System Status</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Connection</span>
                  <span className={`info-value ${isConnected ? 'online' : 'offline'}`}>
                    {isConnected ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Data Points</span>
                  <span className="info-value">{historicalData.length}/12</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Last Update</span>
                  <span className="info-value">
                    {lastUpdate ? lastUpdate.toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Fault Status</span>
                  <span className={`info-value ${systemFault ? 'fault' : 'ok'}`}>
                    {systemFault ? 'FAULT' : 'Normal'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            {isEngineer && (
              <div className="info-card">
                <h3><TrendingUp size={18} /> Quick Stats</h3>
                <div className="stats-list">
                  <div className="stat-item">
                    <span>Total Power</span>
                    <strong>{(phaseR.power + phaseY.power + phaseB.power).toFixed(2)} W</strong>
                  </div>
                  <div className="stat-item">
                    <span>Avg Voltage</span>
                    <strong>{((phaseR.voltage + phaseY.voltage + phaseB.voltage) / 3).toFixed(2)} V</strong>
                  </div>
                  <div className="stat-item">
                    <span>Avg Current</span>
                    <strong>{((phaseR.current + phaseY.current + phaseB.current) / 3).toFixed(2)} A</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Power Analysis */}
            <div className="info-card">
              <h3><TrendingUp size={18} /> Power Analysis</h3>
              <div className="power-mini-grid">
                <div className="power-mini-card">
                  <div className="power-mini-icon">⚡</div>
                  <div className="power-mini-label">Real-time Power</div>
                  <div className="power-mini-value">{(phaseR.power + phaseY.power + phaseB.power).toFixed(2)} W</div>
                </div>
                <div className="power-mini-card">
                  <div className="power-mini-icon">🔋</div>
                  <div className="power-mini-label">Total Energy</div>
                  <div className="power-mini-value">{totalEnergy.toFixed(3)} Wh</div>
                </div>
                <div className="power-mini-card">
                  <div className="power-mini-icon">₹</div>
                  <div className="power-mini-label">Estimated Cost</div>
                  <div className="power-mini-value">₹{(totalEnergy * 7.5 / 1000).toFixed(2)}</div>
                </div>
                <div className="power-mini-card">
                  <div className="power-mini-icon">📊</div>
                  <div className="power-mini-label">Load Factor</div>
                  <div className="power-mini-value">{((phaseR.power + phaseY.power + phaseB.power) / 15000 * 100).toFixed(1)}%</div>
                </div>
              </div>
              
              {/* Detailed Metrics */}
              <div className="detailed-metrics-mini">
                <h4>Detailed Metrics</h4>
                <div className="metrics-mini-grid">
                  <div className="metric-mini-item">
                    <span className="metric-mini-label">Power Factor</span>
                    <span className="metric-mini-value">1.000</span>
                  </div>
                  <div className="metric-mini-item">
                    <span className="metric-mini-label">Apparent Power</span>
                    <span className="metric-mini-value">{(phaseR.power + phaseY.power + phaseB.power).toFixed(2)} VA</span>
                  </div>
                  <div className="metric-mini-item">
                    <span className="metric-mini-label">Active Power</span>
                    <span className="metric-mini-value">{(phaseR.power + phaseY.power + phaseB.power).toFixed(2)} W</span>
                  </div>
                  <div className="metric-mini-item">
                    <span className="metric-mini-label">Energy Rate</span>
                    <span className="metric-mini-value">₹7.50/kWh</span>
                  </div>
                </div>
              </div>

              {/* Live System Monitor - Compact */}
              <div className="live-monitor-compact">
                <h4>⚡ System Status</h4>
                <div className="monitor-compact-grid">
                  <div className="compact-item">
                    <span className="compact-icon">📡</span>
                    <span className={`compact-value ${isConnected ? 'online' : 'offline'}`}>
                      {isConnected ? 'Live' : 'Offline'}
                    </span>
                  </div>
                  <div className="compact-item">
                    <span className="compact-icon">⏱️</span>
                    <span className="compact-value">{Math.floor(uptime / 60)}m {uptime % 60}s</span>
                  </div>
                  <div className="compact-item">
                    <span className="compact-icon">💾</span>
                    <span className="compact-value">{historicalData.length}/12</span>
                  </div>
                  <div className="compact-item">
                    <span className="compact-icon">🔋</span>
                    <span className="compact-value">{(phaseR.power + phaseY.power + phaseB.power).toFixed(1)}W</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics (Full Width Below) */}
        {showAnalytics && isEngineer && (
          <div className="analytics-section">
            <Analytics />
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="modal-overlay" onClick={handleCancelSettings}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Device Connection Settings</h2>
              <button className="modal-close" onClick={handleCancelSettings}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="settings-group">
                <label className="settings-label">
                  <Settings size={20} />
                  Device IP Address
                </label>
                <p className="settings-description">
                  Enter the IP address and port of your ESP32 or Raspberry Pi device
                </p>
                <input
                  type="text"
                  className="settings-input"
                  value={tempIP}
                  onChange={(e) => setTempIP(e.target.value)}
                  placeholder="e.g., 192.168.1.100:3002"
                />
                <div className="settings-examples">
                  <p className="example-title">Examples:</p>
                  <div className="example-buttons">
                    <button 
                      className="example-btn"
                      onClick={() => setTempIP('localhost:3002')}
                    >
                      Localhost
                    </button>
                    <button 
                      className="example-btn"
                      onClick={() => setTempIP('192.168.1.100:3002')}
                    >
                      ESP32 (WiFi)
                    </button>
                    <button 
                      className="example-btn"
                      onClick={() => setTempIP('raspberrypi.local:3002')}
                    >
                      Raspberry Pi
                    </button>
                  </div>
                </div>
              </div>

              <div className="current-connection">
                <div className="connection-status">
                  <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
                  <span>Current Status: {isConnected ? 'Connected' : 'Disconnected'}</span>
                </div>
                <div className="current-ip">
                  Active IP: <strong>{deviceIP}</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={handleCancelSettings}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSaveIP}>
                Save & Reconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonitoringDashboard;
