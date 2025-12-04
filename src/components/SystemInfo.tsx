import { Cpu, Wifi, HardDrive, Thermometer } from 'lucide-react';
import '../styles/SystemInfo.css';

interface SystemInfoProps {
  isConnected: boolean;
  uptime: number;
  dataPoints: number;
}

const SystemInfo = ({ isConnected, uptime, dataPoints }: SystemInfoProps) => {
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m ${seconds % 60}s`;
    }
  };

  return (
    <div className="system-info-panel">
      <h2 className="panel-title">System Information</h2>
      
      <div className="info-grid">
        <div className="info-item">
          <div className="info-icon" style={{ background: '#667eea' }}>
            <Wifi size={20} />
          </div>
          <div className="info-details">
            <span className="info-label">Connection</span>
            <span className="info-value" style={{ color: isConnected ? '#00dd00' : '#ff4444' }}>
              {isConnected ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon" style={{ background: '#764ba2' }}>
            <Cpu size={20} />
          </div>
          <div className="info-details">
            <span className="info-label">Device</span>
            <span className="info-value">ESP32</span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon" style={{ background: '#43e97b' }}>
            <HardDrive size={20} />
          </div>
          <div className="info-details">
            <span className="info-label">Data Buffer</span>
            <span className="info-value">{dataPoints} / 30</span>
          </div>
        </div>

        <div className="info-item">
          <div className="info-icon" style={{ background: '#fa709a' }}>
            <Thermometer size={20} />
          </div>
          <div className="info-details">
            <span className="info-label">Uptime</span>
            <span className="info-value">{formatUptime(uptime)}</span>
          </div>
        </div>
      </div>

      <div className="device-specs">
        <h3>Device Specifications</h3>
        <ul>
          <li><strong>Voltage Range:</strong> 0 - 15V DC</li>
          <li><strong>Current Range:</strong> 0 - 10A</li>
          <li><strong>Sampling Rate:</strong> 1 Hz</li>
          <li><strong>Communication:</strong> HTTP/REST API</li>
          <li><strong>ADC Resolution:</strong> 12-bit (4096 levels)</li>
        </ul>
      </div>
    </div>
  );
};

export default SystemInfo;
