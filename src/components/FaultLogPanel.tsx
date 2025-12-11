import { AlertTriangle, Clock } from 'lucide-react';
import '../styles/FaultLogPanel.css';

interface FaultLog {
  id: number;
  timestamp: Date;
  phase: string;
  faultType: string;
  poleNumber: number;
  distance: number;
}

interface FaultLogPanelProps {
  logs: FaultLog[];
}

const FaultLogPanel = ({ logs }: FaultLogPanelProps) => {
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
  );
};

export default FaultLogPanel;
