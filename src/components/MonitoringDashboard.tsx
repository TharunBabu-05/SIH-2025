import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Download, TrendingUp, AlertTriangle, Activity, Database } from 'lucide-react';
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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [faultType, setFaultType] = useState<string>('');

  // WebSocket connection
  useEffect(() => {
    const ws = new BackendWebSocketService(
      WS_URL,
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

    return () => {
      ws.disconnect();
    };
  }, []);

  const handleIncomingData = (data: SensorData) => {
    // Determine status for each phase (230V 3-phase system)
    const getStatus = (voltage: number, current: number): 'normal' | 'warning' | 'critical' => {
      // Critical: Voltage out of range (±15%) or overcurrent (>20A) or near zero
      if (voltage > 264 || voltage < 196 || current > 20) return 'critical';
      // Warning: Voltage deviation (±10%) or high current (>18A)
      if (voltage > 253 || voltage < 207 || current > 18) return 'warning';
      // Critical: System offline
      if (voltage < 10 && current < 0.1) return 'critical';
      return 'normal';
    };

    setPhaseR({
      voltage: data.R_V,
      current: data.R_I,
      power: data.R_V * data.R_I,
      status: getStatus(data.R_V, data.R_I)
    });

    setPhaseY({
      voltage: data.Y_V,
      current: data.Y_I,
      power: data.Y_V * data.Y_I,
      status: getStatus(data.Y_V, data.Y_I)
    });

    setPhaseB({
      voltage: data.B_V,
      current: data.B_I,
      power: data.B_V * data.B_I,
      status: getStatus(data.B_V, data.B_I)
    });

    setHistoricalData(prev => [...prev, data].slice(-12)); // Keep last 12 samples
    setLastUpdate(new Date());
    
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

            {/* Phase Summary */}
            <div className="info-card">
              <h3><Database size={18} /> Phase Overview</h3>
              <div className="phase-overview">
                <div className="phase-row phase-r-row">
                  <div className="phase-badge">R</div>
                  <div className="phase-values">
                    <span>{phaseR.voltage.toFixed(1)}V</span>
                    <span>{phaseR.current.toFixed(1)}A</span>
                  </div>
                  <div className={`phase-status-mini ${phaseR.status}`}>
                    {phaseR.status}
                  </div>
                </div>
                <div className="phase-row phase-y-row">
                  <div className="phase-badge">Y</div>
                  <div className="phase-values">
                    <span>{phaseY.voltage.toFixed(1)}V</span>
                    <span>{phaseY.current.toFixed(1)}A</span>
                  </div>
                  <div className={`phase-status-mini ${phaseY.status}`}>
                    {phaseY.status}
                  </div>
                </div>
                <div className="phase-row phase-b-row">
                  <div className="phase-badge">B</div>
                  <div className="phase-values">
                    <span>{phaseB.voltage.toFixed(1)}V</span>
                    <span>{phaseB.current.toFixed(1)}A</span>
                  </div>
                  <div className={`phase-status-mini ${phaseB.status}`}>
                    {phaseB.status}
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
    </div>
  );
};

export default MonitoringDashboard;
