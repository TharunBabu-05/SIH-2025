import { AlertTriangle, Bell } from 'lucide-react';
import '../styles/Alert.css';

interface AlertPanelProps {
  alerts: string[];
}

const AlertPanel = ({ alerts }: AlertPanelProps) => {
  return (
    <div className="alert-card">
      <div className="alert-header">
        <Bell size={24} color="#667eea" />
        <h2>Recent Alerts</h2>
      </div>
      
      <div className="alert-list">
        {alerts.length === 0 ? (
          <div className="no-alerts">
            <p>No alerts - System operating normally</p>
          </div>
        ) : (
          alerts.map((alert, index) => (
            <div key={index} className="alert-item">
              <AlertTriangle size={18} color="#ff4444" />
              <div className="alert-content">
                <p>{alert}</p>
                <span className="alert-time">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertPanel;
