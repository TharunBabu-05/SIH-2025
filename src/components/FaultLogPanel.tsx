import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle, TrendingUp, Zap, Battery, DollarSign } from 'lucide-react';
import '../styles/FaultLogPanel.css';

interface FaultLog {
  id: number;
  timestamp: Date;
  phase: string;
  faultType: string;
  poleNumber: number;
  distance: number;
}

interface FaultStatus {
  id: number;
  phase: string;
  faultType: string;
  poleNumber: number;
  distance: number;
  timestamp: Date;
  resolved: boolean;
}

interface PowerData {
  totalPower: number;
  totalEnergy: number;
  isConnected: boolean;
  uptime: number;
}

interface FaultLogPanelProps {
  logs: FaultLog[];
  powerData: PowerData;
}

const FaultLogPanel = ({ logs, powerData }: FaultLogPanelProps) => {
  const [faultStatuses, setFaultStatuses] = useState<FaultStatus[]>([]);

  // Add new faults to status list when logs change
  useEffect(() => {
    logs.forEach(log => {
      if (!faultStatuses.find(f => f.id === log.id)) {
        setFaultStatuses(prev => [...prev, {
          id: log.id,
          phase: log.phase,
          faultType: log.faultType,
          poleNumber: log.poleNumber,
          distance: log.distance,
          timestamp: log.timestamp,
          resolved: false
        }]);
      }
    });
  }, [logs, faultStatuses]);

  const toggleResolved = (id: number) => {
    setFaultStatuses(prev => 
      prev.map(fault => 
        fault.id === id ? { ...fault, resolved: !fault.resolved } : fault
      )
    );
  };

  const getPhaseColor = (phase: string) => {
    switch (phase.toUpperCase()) {
      case 'R': return '#ff6b6b';
      case 'Y': return '#ffd93d';
      case 'B': return '#6bcbff';
      default: return '#ffffff';
    }
  };

  const getFaultTypeLabel = (type: string) => {
    switch (type) {
      case 'PHASE_CUT': return 'Phase Cut';
      case 'LOAD_DROP': return 'Load Drop';
      default: return type;
    }
  };

  const formatMessage = (log: FaultLog) => {
    return `${log.phase} Phase ${getFaultTypeLabel(log.faultType)} detected at Pole #${log.poleNumber} (${log.distance.toFixed(2)}m)`;
  };

  return (
    <div className="fault-log-panel">
      {/* Fault Log Messages Section */}
      <div className="fault-log-section">
        <div className="fault-log-header">
          <AlertTriangle size={24} />
          <h2>Fault Log Messages</h2>
          <span className="log-count">{logs.length}/10</span>
        </div>

        <div className="fault-log-container">
          {logs.length === 0 ? (
            <div className="no-logs">
              <AlertTriangle size={48} />
              <p>No fault messages</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="fault-log-item" style={{ '--phase-color': getPhaseColor(log.phase) } as React.CSSProperties}>
                <div className="log-phase-badge" style={{ backgroundColor: getPhaseColor(log.phase) }}>
                  {log.phase}
                </div>
                <div className="log-content">
                  <div className="log-message">{formatMessage(log)}</div>
                  <div className="log-timestamp">
                    <Clock size={14} />
                    {log.timestamp.toLocaleTimeString()}
                  </div>
                </div>
                <div className="log-details">
                  <span className="log-pole">Pole #{log.poleNumber}</span>
                  <span className="log-distance">{log.distance.toFixed(2)}m</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Fault Status Section */}
      <div className="fault-status-section">
        <div className="fault-status-header">
          <CheckCircle size={24} />
          <h2>Fault Status</h2>
          <span className="status-count">
            {faultStatuses.filter(f => f.resolved).length}/{faultStatuses.length} Resolved
          </span>
        </div>

        <div className="fault-status-container">
          {faultStatuses.length === 0 ? (
            <div className="no-status">
              <CheckCircle size={48} />
              <p>No faults identified</p>
            </div>
          ) : (
            faultStatuses.map((fault) => (
              <div 
                key={fault.id} 
                className={`fault-status-item ${fault.resolved ? 'resolved' : ''}`}
                style={{ '--phase-color': getPhaseColor(fault.phase) } as React.CSSProperties}
              >
                <input
                  type="checkbox"
                  className="fault-checkbox"
                  checked={fault.resolved}
                  onChange={() => toggleResolved(fault.id)}
                  id={`fault-${fault.id}`}
                />
                <label htmlFor={`fault-${fault.id}`} className="fault-checkbox-label">
                  <div className="status-phase-badge" style={{ backgroundColor: getPhaseColor(fault.phase) }}>
                    {fault.phase}
                  </div>
                  <div className="status-content">
                    <div className="status-message">
                      {fault.phase} Phase {getFaultTypeLabel(fault.faultType)} at Pole #{fault.poleNumber}
                    </div>
                    <div className="status-info">
                      <span className="status-distance">{fault.distance.toFixed(2)}m</span>
                      <span className="status-time">{fault.timestamp.toLocaleTimeString()}</span>
                    </div>
                  </div>
                  {fault.resolved && (
                    <div className="resolved-badge">
                      <CheckCircle size={20} />
                      <span>Resolved</span>
                    </div>
                  )}
                </label>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Power Analysis Section */}
      <div className="power-analysis-compact">
        <div className="power-header-compact">
          <TrendingUp size={20} />
          <h3>Power Analysis</h3>
        </div>
        
        <div className="power-metrics-compact">
          <div className="power-metric-compact">
            <Zap size={18} className="metric-icon-compact" />
            <div className="metric-details-compact">
              <span className="metric-label-compact">Real-time Power</span>
              <span className="metric-value-compact">{powerData.totalPower.toFixed(2)} W</span>
            </div>
          </div>
          
          <div className="power-metric-compact">
            <Battery size={18} className="metric-icon-compact" />
            <div className="metric-details-compact">
              <span className="metric-label-compact">Total Energy</span>
              <span className="metric-value-compact">{powerData.totalEnergy.toFixed(3)} Wh</span>
            </div>
          </div>
          
          <div className="power-metric-compact">
            <DollarSign size={18} className="metric-icon-compact" />
            <div className="metric-details-compact">
              <span className="metric-label-compact">Estimated Cost</span>
              <span className="metric-value-compact">₹{(powerData.totalEnergy * 7.5 / 1000).toFixed(2)}</span>
            </div>
          </div>
          
          <div className="power-metric-compact">
            <div className={`status-indicator ${powerData.isConnected ? 'connected' : 'disconnected'}`}></div>
            <div className="metric-details-compact">
              <span className="metric-label-compact">Status</span>
              <span className={`metric-value-compact ${powerData.isConnected ? 'online' : 'offline'}`}>
                {powerData.isConnected ? 'Live' : 'Offline'} • {Math.floor(powerData.uptime / 60)}m {powerData.uptime % 60}s
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FaultLogPanel;
