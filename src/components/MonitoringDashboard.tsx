import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, Download, TrendingUp, AlertTriangle, Activity, Database, Settings, Menu, X, History, BarChart2, Clock, Zap, AlertOctagon, Home, LineChart } from 'lucide-react';
import BackendWebSocketService from '../services/backendWebSocket';
import { apiService } from '../services/apiService';
import { firebaseService } from '../services/firebaseService';
import MeterBox from './MeterBox';
import Analytics from './Analytics';
import FaultLogPanel from './FaultLogPanel';
import '../styles/MonitoringDashboard.css';
import '../styles/Sidebar.css';

interface PhaseData {
  voltage: number;
  current: number;
  power: number;
  status: 'normal' | 'warning' | 'critical';
  baseline?: number;
  relayCut?: boolean;
  faultPole?: number;
  faultDistance?: number;
  rcTime?: number;
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

interface FaultLog {
  id: number;
  timestamp: Date;
  phase: string;
  faultType: string;
  poleNumber: number;
  distance: number;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3002';

const MonitoringDashboard = () => {
  const { user, logout, isEngineer } = useAuth();
  const navigate = useNavigate();
  
  const [phaseR, setPhaseR] = useState<PhaseData>({ voltage: 0, current: 0, power: 0, status: 'normal' });
  const [phaseY, setPhaseY] = useState<PhaseData>({ voltage: 0, current: 0, power: 0, status: 'normal' });
  const [phaseB, setPhaseB] = useState<PhaseData>({ voltage: 0, current: 0, power: 0, status: 'normal' });
  
  const [historicalData, setHistoricalData] = useState<SensorData[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastDataReceived, setLastDataReceived] = useState<number>(0);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [faultType, setFaultType] = useState<string>('');
  const [totalEnergy, setTotalEnergy] = useState<number>(0);
  const [uptime, setUptime] = useState<number>(0);
  const [faultHistory, setFaultHistory] = useState<Array<{timestamp: Date, phase: string, type: string}>>([]);
  
  // IP Configuration
  const [deviceIP, setDeviceIP] = useState(() => {
    return localStorage.getItem('device_ip') || '10.189.10.133';
  });
  const [tempIP, setTempIP] = useState(deviceIP);
  const wsRef = useRef<WebSocket | null>(null);
  
  // Fault Alerts
  const [alerts, setAlerts] = useState<Array<{phase: string, type: string, message: string}>>([]);
  const [phaseCutAlerts, setPhaseCutAlerts] = useState<{R: boolean, Y: boolean, B: boolean}>({R: false, Y: false, B: false});
  const [alertTimestamps, setAlertTimestamps] = useState<{R: number | null, Y: number | null, B: number | null}>({R: null, Y: null, B: null});
  
  // Fault Logs (max 10 messages)
  const [faultLogs, setFaultLogs] = useState<FaultLog[]>([]);
  const [logIdCounter, setLogIdCounter] = useState(0);

  // Auto-dismiss alerts after 10 seconds
  useEffect(() => {
    const checkAlertExpiry = setInterval(() => {
      const now = Date.now();
      const updatedAlerts = { ...phaseCutAlerts };
      const updatedTimestamps = { ...alertTimestamps };
      let changed = false;

      (['R', 'Y', 'B'] as const).forEach((phase) => {
        if (alertTimestamps[phase] && now - alertTimestamps[phase]! > 10000) {
          updatedAlerts[phase] = false;
          updatedTimestamps[phase] = null;
          changed = true;
        }
      });

      if (changed) {
        setPhaseCutAlerts(updatedAlerts);
        setAlertTimestamps(updatedTimestamps);
      }
    }, 1000);

    return () => clearInterval(checkAlertExpiry);
  }, [alertTimestamps, phaseCutAlerts]);

  // WebSocket connection to ESP32
  useEffect(() => {
    const connectToESP32 = () => {
      // Close existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      const wsUrl = `ws://${deviceIP}:81`; // ESP32 WebSocket port
      console.log('Connecting to ESP32:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to ESP32');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('ESP32 Data:', data);
          
          // Check if this is a fault log message
          if (data.type === 'fault_log') {
            const newLog: FaultLog = {
              id: logIdCounter,
              timestamp: new Date(),
              phase: data.phase,
              faultType: data.fault_type,
              poleNumber: data.pole_number,
              distance: data.distance
            };
            
            setFaultLogs(prevLogs => {
              const updatedLogs = [newLog, ...prevLogs].slice(0, 10); // Keep max 10 logs
              return updatedLogs;
            });
            
            setLogIdCounter(prev => prev + 1);
            return;
          }
          
          // Transform ESP32 data to our format
          const transformedData: SensorData = {
            timestamp: new Date().toISOString(),
            R_V: data.voltage_R || 0,
            Y_V: data.voltage_Y || 0,
            B_V: data.voltage_B || 0,
            R_I: data.current_R || 0,
            Y_I: data.current_Y || 0,
            B_I: data.current_B || 0,
            fault: data.fault || false,
            fault_type: data.fault_type || null
          };
          
          // Update phase data with enhanced information
          setPhaseR(prev => ({
            ...prev,
            baseline: data.baseline_R,
            relayCut: data.relay_R,
            faultPole: data.pole_R,
            faultDistance: data.distance_R,
            rcTime: data.rcTime_R
          }));
          
          setPhaseY(prev => ({
            ...prev,
            baseline: data.baseline_Y,
            relayCut: data.relay_Y,
            faultPole: data.pole_Y,
            faultDistance: data.distance_Y,
            rcTime: data.rcTime_Y
          }));
          
          setPhaseB(prev => ({
            ...prev,
            baseline: data.baseline_B,
            relayCut: data.relay_B,
            faultPole: data.pole_B,
            faultDistance: data.distance_B,
            rcTime: data.rcTime_B
          }));

          handleIncomingData(transformedData);
          
          // Save to Firebase Realtime Database
          saveToFirebase(transformedData);
        } catch (error) {
          console.error('Error parsing ESP32 data:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.error('Failed to connect to:', wsUrl);
        console.error('Make sure ESP32 is powered on and WiFi is connected');
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('Disconnected from ESP32');
        console.log('Connection closed. Click Settings to reconnect.');
        setIsConnected(false);
        
        // Don't auto-reconnect if manually disconnected or if there's a persistent error
        // User can reconnect via Settings
      };
    };

    connectToESP32();

    // Fetch initial historical data
    fetchRecentData();

    // Uptime counter
    const startTime = Date.now();
    const uptimeInterval = setInterval(() => {
      setUptime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    // Check for data timeout - only mark offline if no data for extended period
    const dataTimeoutChecker = setInterval(() => {
      const currentTime = Date.now();
      const lastReceived = lastDataReceived;
      
      if (lastReceived > 0) {
        const timeSinceLastData = currentTime - lastReceived;
        if (timeSinceLastData > 10000) { // 10 seconds timeout instead of 5
          console.log('Data timeout - no data received for', timeSinceLastData, 'ms');
          setIsConnected(false);
        }
      }
      // Don't set offline if lastDataReceived is 0 during initial connection
    }, 2000); // Check every 2 seconds instead of 1

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearInterval(uptimeInterval);
      clearInterval(dataTimeoutChecker);
    };
  }, [deviceIP]);

  const handleIncomingData = (data: SensorData) => {
    // Update last data received timestamp and connection status
    setLastDataReceived(Date.now());
    setIsConnected(true); // Explicitly set connected when receiving data
    
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
    
    // Add to fault history
    newAlerts.forEach(alert => {
      setFaultHistory(prev => [{
        timestamp: new Date(),
        phase: alert.phase,
        type: alert.type
      }, ...prev].slice(0, 50)); // Keep last 50 faults
    });
    
    // Update phase cut alerts with timestamps
    const phaseCutStatus = {
      R: data.R_V < 5 && data.R_I < 0.05,
      Y: data.Y_V < 5 && data.Y_I < 0.05,
      B: data.B_V < 5 && data.B_I < 0.05
    };
    
    const now = Date.now();
    const newTimestamps = { ...alertTimestamps };
    
    // Set timestamp for new alerts only
    if (phaseCutStatus.R && !phaseCutAlerts.R) newTimestamps.R = now;
    if (phaseCutStatus.Y && !phaseCutAlerts.Y) newTimestamps.Y = now;
    if (phaseCutStatus.B && !phaseCutAlerts.B) newTimestamps.B = now;
    
    setPhaseCutAlerts(phaseCutStatus);
    setAlertTimestamps(newTimestamps);

    setHistoricalData(prev => [...prev, data].slice(-12)); // Keep last 12 samples
    setLastUpdate(new Date());
    
    // Calculate energy (power * time in hours)
    const totalPower = (data.R_V * data.R_I + data.Y_V * data.Y_I + data.B_V * data.B_I);
    setTotalEnergy(prev => prev + (totalPower / 3600));
    
    if (data.fault && data.fault_type) {
      setFaultType(data.fault_type);
    }
  };

  // Save data to Firebase
  const saveToFirebase = async (data: SensorData) => {
    try {
      // Update live data in Firebase Realtime Database
      await firebaseService.updateLiveData({
        R: { voltage: data.R_V, current: data.R_I, power: data.R_V * data.R_I },
        Y: { voltage: data.Y_V, current: data.Y_I, power: data.Y_V * data.Y_I },
        B: { voltage: data.B_V, current: data.B_I, power: data.B_V * data.B_I }
      });

      // Save individual phase readings to Firestore for history
      await Promise.all([
        firebaseService.saveSensorReading({
          phase: 'R',
          voltage: data.R_V,
          current: data.R_I,
          power: data.R_V * data.R_I,
          status: data.R_V < 5 && data.R_I < 0.05 ? 'critical' : 'normal',
          timestamp: new Date()
        }),
        firebaseService.saveSensorReading({
          phase: 'Y',
          voltage: data.Y_V,
          current: data.Y_I,
          power: data.Y_V * data.Y_I,
          status: data.Y_V < 5 && data.Y_I < 0.05 ? 'critical' : 'normal',
          timestamp: new Date()
        }),
        firebaseService.saveSensorReading({
          phase: 'B',
          voltage: data.B_V,
          current: data.B_I,
          power: data.B_V * data.B_I,
          status: data.B_V < 5 && data.B_I < 0.05 ? 'critical' : 'normal',
          timestamp: new Date()
        })
      ]);

      console.log('Data saved to Firebase');
    } catch (error) {
      console.error('Error saving to Firebase:', error);
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
      {/* Sidebar Menu */}
      <div className={`sidebar-menu ${showSidebar ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Navigation</h2>
          <button className="sidebar-close" onClick={() => setShowSidebar(false)}>
            <X size={24} />
          </button>
        </div>
        
        <div className="sidebar-content">
          {/* Navigation Links */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <Menu size={20} />
              <h3>Pages</h3>
            </div>
            <div className="nav-links">
              <button 
                className="nav-link"
                onClick={() => {
                  navigate('/');
                  setShowSidebar(false);
                }}
              >
                <Home size={20} />
                <span>Dashboard</span>
              </button>
              <button 
                className="nav-link"
                onClick={() => {
                  navigate('/graphs');
                  setShowSidebar(false);
                }}
              >
                <LineChart size={20} />
                <span>Phase Graphs</span>
              </button>
              <button 
                className="nav-link"
                onClick={() => {
                  navigate('/history');
                  setShowSidebar(false);
                }}
              >
                <History size={20} />
                <span>History & Download</span>
              </button>
              <button 
                className="nav-link"
                onClick={() => {
                  navigate('/3d-view');
                  setShowSidebar(false);
                }}
              >
                <BarChart2 size={20} />
                <span>Real-Time View 3D</span>
              </button>
            </div>
          </div>

          {/* Fault History */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <AlertOctagon size={20} />
              <h3>Recent Faults</h3>
            </div>
            <div className="fault-history-list">
              {faultHistory.length === 0 ? (
                <p className="no-faults">No faults recorded</p>
              ) : (
                faultHistory.slice(0, 10).map((fault, index) => (
                  <div key={index} className="fault-history-item">
                    <div className="fault-badge">{fault.phase}</div>
                    <div className="fault-info">
                      <span className="fault-type">{fault.type.replace('_', ' ')}</span>
                      <span className="fault-time">
                        {fault.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Fault Statistics */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <BarChart2 size={20} />
              <h3>Fault Statistics</h3>
            </div>
            <div className="stat-cards">
              <div className="stat-card">
                <div className="stat-value">{faultHistory.length}</div>
                <div className="stat-label">Total Faults</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {faultHistory.filter(f => f.type === 'PHASE_CUT').length}
                </div>
                <div className="stat-label">Phase Cuts</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {faultHistory.filter(f => f.type === 'OVERLOAD').length}
                </div>
                <div className="stat-label">Overloads</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">
                  {faultHistory.filter(f => f.type === 'SHORT_CIRCUIT').length}
                </div>
                <div className="stat-label">Short Circuits</div>
              </div>
            </div>
          </div>

          {/* Phase-wise Fault Count */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <Zap size={20} />
              <h3>Phase-wise Faults</h3>
            </div>
            <div className="phase-fault-bars">
              <div className="phase-bar">
                <div className="phase-bar-label">
                  <span className="phase-r">R Phase</span>
                  <span className="phase-count">
                    {faultHistory.filter(f => f.phase === 'R').length}
                  </span>
                </div>
                <div className="phase-bar-bg">
                  <div 
                    className="phase-bar-fill phase-r-fill" 
                    style={{width: `${Math.min((faultHistory.filter(f => f.phase === 'R').length / Math.max(faultHistory.length, 1)) * 100, 100)}%`}}
                  ></div>
                </div>
              </div>
              <div className="phase-bar">
                <div className="phase-bar-label">
                  <span className="phase-y">Y Phase</span>
                  <span className="phase-count">
                    {faultHistory.filter(f => f.phase === 'Y').length}
                  </span>
                </div>
                <div className="phase-bar-bg">
                  <div 
                    className="phase-bar-fill phase-y-fill" 
                    style={{width: `${Math.min((faultHistory.filter(f => f.phase === 'Y').length / Math.max(faultHistory.length, 1)) * 100, 100)}%`}}
                  ></div>
                </div>
              </div>
              <div className="phase-bar">
                <div className="phase-bar-label">
                  <span className="phase-b">B Phase</span>
                  <span className="phase-count">
                    {faultHistory.filter(f => f.phase === 'B').length}
                  </span>
                </div>
                <div className="phase-bar-bg">
                  <div 
                    className="phase-bar-fill phase-b-fill" 
                    style={{width: `${Math.min((faultHistory.filter(f => f.phase === 'B').length / Math.max(faultHistory.length, 1)) * 100, 100)}%`}}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Data Summary */}
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <History size={20} />
              <h3>Data Summary</h3>
            </div>
            <div className="data-summary">
              <div className="summary-item">
                <Clock size={16} />
                <span>Uptime: {Math.floor(uptime / 3600)}h {Math.floor((uptime % 3600) / 60)}m</span>
              </div>
              <div className="summary-item">
                <Database size={16} />
                <span>Data Points: {historicalData.length}</span>
              </div>
              <div className="summary-item">
                <Zap size={16} />
                <span>Energy: {totalEnergy.toFixed(2)} Wh</span>
              </div>
              <div className="summary-item">
                <Activity size={16} />
                <span>Status: {isConnected ? 'Online' : 'Offline'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar Overlay */}
      {showSidebar && (
        <div className="sidebar-overlay" onClick={() => setShowSidebar(false)}></div>
      )}

      {/* Header */}
      <header className="dashboard-header-compact">
        <div className="header-left">
          <button className="menu-btn" onClick={() => setShowSidebar(true)}>
            <Menu size={24} />
          </button>
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

        {/* Fault Log Panel (Full Width) */}
        <FaultLogPanel logs={faultLogs} />

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
                  placeholder="e.g., 192.168.1.100"
                />
                <div className="settings-examples">
                  <p className="example-title">Examples:</p>
                  <div className="example-buttons">
                    <button 
                      className="example-btn"
                      onClick={() => setTempIP('192.168.1.100')}
                    >
                      ESP32 Local (WiFi)
                    </button>
                    <button 
                      className="example-btn"
                      onClick={() => setTempIP('10.117.120.133')}
                    >
                      ESP32 Network
                    </button>
                    <button 
                      className="example-btn"
                      onClick={() => setTempIP('192.168.4.1')}
                    >
                      ESP32 AP Mode
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
