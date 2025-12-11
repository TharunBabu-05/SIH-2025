import { MapPin, Zap, Clock, Activity } from 'lucide-react';
import '../styles/FaultLocationPanel.css';

interface FaultLocationPanelProps {
  phaseR: {
    relayCut?: boolean;
    faultPole?: number;
    faultDistance?: number;
    rcTime?: number;
    baseline?: number;
    current: number;
    status: string;
  };
  phaseY: {
    relayCut?: boolean;
    faultPole?: number;
    faultDistance?: number;
    rcTime?: number;
    baseline?: number;
    current: number;
    status: string;
  };
  phaseB: {
    relayCut?: boolean;
    faultPole?: number;
    faultDistance?: number;
    rcTime?: number;
    baseline?: number;
    current: number;
    status: string;
  };
}

const FaultLocationPanel = ({ phaseR, phaseY, phaseB }: FaultLocationPanelProps) => {
  const renderPhaseInfo = (
    phase: string,
    data: {
      relayCut?: boolean;
      faultPole?: number;
      faultDistance?: number;
      rcTime?: number;
      baseline?: number;
      current: number;
      status: string;
    },
    color: string
  ) => {
    const isNormal = data.status === 'normal' || data.status === 'NORMAL';
    const isCut = data.relayCut || false;

    return (
      <div className={`fault-phase-card phase-${phase.toLowerCase()} ${isCut ? 'fault-active' : ''}`}>
        <div className="fault-phase-header">
          <h3 style={{ color }}>{phase} Phase</h3>
          <span className={`fault-status-badge ${isCut ? 'status-fault' : isNormal ? 'status-normal' : 'status-warning'}`}>
            {isCut ? 'FAULT' : isNormal ? 'NORMAL' : 'WARNING'}
          </span>
        </div>

        <div className="fault-info-grid">
          {/* Relay Status */}
          <div className="fault-info-item">
            <Zap size={18} className={isCut ? 'icon-danger' : 'icon-success'} />
            <div>
              <span className="fault-label">Relay Status</span>
              <strong className={isCut ? 'value-danger' : 'value-success'}>
                {isCut ? 'CUT (Protected)' : 'Active'}
              </strong>
            </div>
          </div>

          {/* Current Status */}
          <div className="fault-info-item">
            <Activity size={18} />
            <div>
              <span className="fault-label">Current Reading</span>
              <strong>{data.current.toFixed(3)} A</strong>
            </div>
          </div>

          {/* Baseline Current */}
          {data.baseline !== undefined && data.baseline > 0 && (
            <div className="fault-info-item">
              <Activity size={18} />
              <div>
                <span className="fault-label">Baseline Current</span>
                <strong>{data.baseline.toFixed(3)} A</strong>
              </div>
            </div>
          )}

          {/* Fault Location - Only show if fault detected */}
          {isCut && data.faultPole !== undefined && (
            <>
              <div className="fault-info-item highlight">
                <MapPin size={18} className="icon-danger" />
                <div>
                  <span className="fault-label">Fault Pole Number</span>
                  <strong className="value-danger">Pole #{data.faultPole}</strong>
                </div>
              </div>

              <div className="fault-info-item highlight">
                <MapPin size={18} className="icon-danger" />
                <div>
                  <span className="fault-label">Distance from Origin</span>
                  <strong className="value-danger">
                    {data.faultDistance !== undefined 
                      ? `${data.faultDistance.toFixed(3)} m (${(data.faultDistance / 1000).toFixed(3)} km)`
                      : 'N/A'}
                  </strong>
                </div>
              </div>

              <div className="fault-info-item">
                <Clock size={18} />
                <div>
                  <span className="fault-label">RC Timing</span>
                  <strong>
                    {data.rcTime !== undefined 
                      ? `${data.rcTime} µs (${(data.rcTime / 1000).toFixed(3)} ms)`
                      : 'N/A'}
                  </strong>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Fault Alert Message */}
        {isCut && (
          <div className="fault-alert-message">
            <AlertCircle size={20} />
            <div>
              <strong>⚠️ FAULT DETECTED</strong>
              <p>
                Fault located at <strong>Pole #{data.faultPole}</strong>, approximately{' '}
                <strong>{data.faultDistance?.toFixed(2)} meters</strong> from the monitoring point.
                Power supply has been automatically cut to protect the system.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fault-location-panel">
      <div className="panel-header">
        <MapPin size={24} />
        <h2>Fault Detection & Location System</h2>
      </div>
      
      <div className="fault-phases-container">
        {renderPhaseInfo('R', phaseR, '#ef4444')}
        {renderPhaseInfo('Y', phaseY, '#f59e0b')}
        {renderPhaseInfo('B', phaseB, '#3b82f6')}
      </div>

      <div className="system-info-footer">
        <div className="info-item">
          <span>🔍 RC Distance Measurement Active</span>
        </div>
        <div className="info-item">
          <span>🛡️ Automatic Protection Enabled</span>
        </div>
        <div className="info-item">
          <span>📡 Real-time Monitoring</span>
        </div>
      </div>
    </div>
  );
};

function AlertCircle({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

export default FaultLocationPanel;
