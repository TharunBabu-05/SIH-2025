import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Activity } from 'lucide-react';
import LineChart from './LineChart';
import '../styles/GraphsPage.css';

interface PhaseReading {
  voltage: number;
  current: number;
  power: number;
  timestamp: Date;
}

interface PhaseData {
  voltage: number;
  current: number;
  power: number;
  status: string;
  baseline: number;
  relayCut: boolean;
}

const GraphsPage = () => {
  const navigate = useNavigate();
  const [selectedPhase, setSelectedPhase] = useState<'R' | 'Y' | 'B'>('R');
  const [phaseDataR, setPhaseDataR] = useState<PhaseReading[]>([]);
  const [phaseDataY, setPhaseDataY] = useState<PhaseReading[]>([]);
  const [phaseDataB, setPhaseDataB] = useState<PhaseReading[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceIP, setDeviceIP] = useState('10.189.10.133');
  const wsRef = useRef<WebSocket | null>(null);
  const maxDataPoints = 50; // Keep last 50 readings

  useEffect(() => {
    // Get saved IP from localStorage
    const savedIP = localStorage.getItem('device_ip');
    if (savedIP) {
      setDeviceIP(savedIP);
    }
  }, []);

  useEffect(() => {
    // Connect to ESP32 WebSocket
    connectToESP32();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [deviceIP]);

  const connectToESP32 = () => {
    try {
      const ws = new WebSocket(`ws://${deviceIP}:81`);
      
      ws.onopen = () => {
        console.log('Connected to ESP32 for real-time graphs');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const timestamp = new Date();

          // Add R phase data
          if (data.voltage_R !== undefined) {
            setPhaseDataR(prev => {
              const newData = [...prev, {
                voltage: data.voltage_R,
                current: data.current_R,
                power: data.power_R,
                timestamp
              }];
              return newData.slice(-maxDataPoints);
            });
          }

          // Add Y phase data
          if (data.voltage_Y !== undefined) {
            setPhaseDataY(prev => {
              const newData = [...prev, {
                voltage: data.voltage_Y,
                current: data.current_Y,
                power: data.power_Y,
                timestamp
              }];
              return newData.slice(-maxDataPoints);
            });
          }

          // Add B phase data
          if (data.voltage_B !== undefined) {
            setPhaseDataB(prev => {
              const newData = [...prev, {
                voltage: data.voltage_B,
                current: data.current_B,
                power: data.power_B,
                timestamp
              }];
              return newData.slice(-maxDataPoints);
            });
          }
        } catch (error) {
          console.error('Error parsing ESP32 data:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('ESP32 WebSocket error:', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('Disconnected from ESP32');
        setIsConnected(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            connectToESP32();
          }
        }, 5000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect to ESP32:', error);
      setIsConnected(false);
    }
  };

  const getCurrentPhaseData = () => {
    switch (selectedPhase) {
      case 'R': return phaseDataR;
      case 'Y': return phaseDataY;
      case 'B': return phaseDataB;
      default: return phaseDataR;
    }
  };

  const getPhaseColor = () => {
    switch (selectedPhase) {
      case 'R': return '#ef4444';
      case 'Y': return '#f59e0b';
      case 'B': return '#3b82f6';
      default: return '#ef4444';
    }
  };

  const currentData = getCurrentPhaseData();
  const voltageData = currentData.map(d => d.voltage);
  const currentDataPoints = currentData.map(d => d.current);
  const powerData = currentData.map(d => d.power);
  const labels = currentData.map(d => 
    new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );

  return (
    <div className="graphs-page">
      <div className="graphs-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <h1>
          <TrendingUp size={28} />
          Real-Time Phase Analysis
        </h1>
        <div className="connection-status" style={{ marginLeft: 'auto' }}>
          <Activity size={20} />
          <span>{isConnected ? 'Live' : 'Offline'}</span>
        </div>
      </div>

      {/* Phase Selection */}
      <div className="phase-selector">
        <button 
          className={`phase-btn phase-r ${selectedPhase === 'R' ? 'active' : ''}`}
          onClick={() => setSelectedPhase('R')}
        >
          <span className="phase-indicator"></span>
          R Phase (Red)
        </button>
        <button 
          className={`phase-btn phase-y ${selectedPhase === 'Y' ? 'active' : ''}`}
          onClick={() => setSelectedPhase('Y')}
        >
          <span className="phase-indicator"></span>
          Y Phase (Yellow)
        </button>
        <button 
          className={`phase-btn phase-b ${selectedPhase === 'B' ? 'active' : ''}`}
          onClick={() => setSelectedPhase('B')}
        >
          <span className="phase-indicator"></span>
          B Phase (Blue)
        </button>
      </div>

      {!isConnected ? (
        <div className="no-data-container">
          <div className="no-data-icon">📡</div>
          <h3>ESP32 Not Connected</h3>
          <p>Waiting for ESP32 connection at {deviceIP}:81</p>
          <p style={{ marginTop: '10px', fontSize: '14px', opacity: 0.7 }}>
            Make sure your ESP32 is powered on and connected to the network.
          </p>
        </div>
      ) : currentData.length === 0 ? (
        <div className="no-data-container">
          <div className="no-data-icon">📊</div>
          <h3>Collecting Data...</h3>
          <p>Connected to ESP32. Waiting for first data packet.</p>
          <p style={{ marginTop: '10px', fontSize: '14px', opacity: 0.7 }}>
            Real-time graphs will appear as data arrives.
          </p>
        </div>
      ) : (
        <div className="graphs-grid">
          {/* Voltage Graph */}
          <div className="graph-card">
            <h2>Voltage Over Time</h2>
            <div className="graph-container">
              <LineChart
                data={voltageData}
                labels={labels}
                label={`${selectedPhase} Phase Voltage`}
                color={getPhaseColor()}
                unit="V"
              />
            </div>
            <div className="graph-stats">
              <div className="stat">
                <span>Current</span>
                <strong>{voltageData[voltageData.length - 1]?.toFixed(2) || '0.00'} V</strong>
              </div>
              <div className="stat">
                <span>Average</span>
                <strong>
                  {(voltageData.reduce((a, b) => a + b, 0) / voltageData.length || 0).toFixed(2)} V
                </strong>
              </div>
              <div className="stat">
                <span>Max</span>
                <strong>{Math.max(...voltageData).toFixed(2)} V</strong>
              </div>
              <div className="stat">
                <span>Min</span>
                <strong>{Math.min(...voltageData).toFixed(2)} V</strong>
              </div>
            </div>
          </div>

          {/* Current Graph */}
          <div className="graph-card">
            <h2>Current Over Time</h2>
            <div className="graph-container">
              <LineChart
                data={currentDataPoints}
                labels={labels}
                label={`${selectedPhase} Phase Current`}
                color={getPhaseColor()}
                unit="A"
              />
            </div>
            <div className="graph-stats">
              <div className="stat">
                <span>Current</span>
                <strong>{currentDataPoints[currentDataPoints.length - 1]?.toFixed(3) || '0.000'} A</strong>
              </div>
              <div className="stat">
                <span>Average</span>
                <strong>
                  {(currentDataPoints.reduce((a, b) => a + b, 0) / currentDataPoints.length || 0).toFixed(3)} A
                </strong>
              </div>
              <div className="stat">
                <span>Max</span>
                <strong>{Math.max(...currentDataPoints).toFixed(3)} A</strong>
              </div>
              <div className="stat">
                <span>Min</span>
                <strong>{Math.min(...currentDataPoints).toFixed(3)} A</strong>
              </div>
            </div>
          </div>

          {/* Power Graph */}
          <div className="graph-card">
            <h2>Power Over Time</h2>
            <div className="graph-container">
              <LineChart
                data={powerData}
                labels={labels}
                label={`${selectedPhase} Phase Power`}
                color={getPhaseColor()}
                unit="W"
              />
            </div>
            <div className="graph-stats">
              <div className="stat">
                <span>Current</span>
                <strong>{powerData[powerData.length - 1]?.toFixed(2) || '0.00'} W</strong>
              </div>
              <div className="stat">
                <span>Average</span>
                <strong>
                  {(powerData.reduce((a, b) => a + b, 0) / powerData.length || 0).toFixed(2)} W
                </strong>
              </div>
              <div className="stat">
                <span>Max</span>
                <strong>{Math.max(...powerData).toFixed(2)} W</strong>
              </div>
              <div className="stat">
                <span>Min</span>
                <strong>{Math.min(...powerData).toFixed(2)} W</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GraphsPage;
