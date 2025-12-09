import { Line } from 'react-chartjs-2';
import { Clock } from 'lucide-react';
import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import '../styles/MeterBox.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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

interface Props {
  phaseR: PhaseData;
  phaseY: PhaseData;
  phaseB: PhaseData;
  historicalData: SensorData[];
  lastUpdate: Date | null;
  isWorker: boolean;
}

const MeterBox = ({ phaseR, phaseY, phaseB, historicalData, lastUpdate, isWorker }: Props) => {
  const [selectedPhase, setSelectedPhase] = useState<'R' | 'Y' | 'B'>('R');
  
  const getCurrentPhaseData = () => {
    switch (selectedPhase) {
      case 'R': return { data: phaseR, color: '#ff4444', name: 'R Phase' };
      case 'Y': return { data: phaseY, color: '#ffbb33', name: 'Y Phase' };
      case 'B': return { data: phaseB, color: '#4444ff', name: 'B Phase' };
    }
  };

  const currentPhase = getCurrentPhaseData();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'critical': return 'FAULT';
      case 'warning': return 'WARNING';
      default: return 'NORMAL';
    }
  };

  // Chart data for micro-graphs
  const createChartData = (phaseKey: 'R' | 'Y' | 'B', dataKey: 'V' | 'I') => {
    let labels, data;
    
    if (historicalData.length > 0) {
      labels = historicalData.map((_, idx) => `${idx + 1}`);
      data = historicalData.map(d => d[`${phaseKey}_${dataKey}` as keyof SensorData] as number);
    } else {
      // Use current real-time values
      const currentValue = dataKey === 'V' ? currentPhase.data.voltage : currentPhase.data.current;
      labels = ['Now'];
      data = [currentValue];
    }
    
    const color = phaseKey === 'R' ? '#ef4444' : phaseKey === 'Y' ? '#eab308' : '#3b82f6';
    
    return {
      labels,
      datasets: [{
        data,
        borderColor: color,
        backgroundColor: `${color}20`,
        borderWidth: 2,
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
      }
    },
    scales: {
      x: { display: false },
      y: { 
        display: true,
        grid: { color: 'rgba(100, 150, 255, 0.1)' },
        ticks: { color: '#888', font: { size: 10 } }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  // Combined Voltage & Current Chart
  const createCombinedChart = (phaseKey: 'R' | 'Y' | 'B') => {
    let labels, voltageData, currentData;
    
    if (historicalData.length > 0) {
      labels = historicalData.map((d, idx) => {
        const time = new Date(d.timestamp);
        return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      });
      voltageData = historicalData.map(d => d[`${phaseKey}_V` as keyof SensorData] as number);
      currentData = historicalData.map(d => d[`${phaseKey}_I` as keyof SensorData] as number);
    } else {
      // Use current real-time values
      labels = ['Now'];
      voltageData = [currentPhase.data.voltage];
      currentData = [currentPhase.data.current];
    }
    
    const color = phaseKey === 'R' ? '#ef4444' : phaseKey === 'Y' ? '#eab308' : '#3b82f6';
    
    return {
      labels,
      datasets: [
        {
          label: 'Voltage (V)',
          data: voltageData,
          borderColor: color,
          backgroundColor: `${color}30`,
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          yAxisID: 'y',
          pointRadius: 3,
          pointHoverRadius: 6,
        },
        {
          label: 'Current (A)',
          data: currentData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderWidth: 2.5,
          tension: 0.4,
          fill: true,
          yAxisID: 'y1',
          pointRadius: 3,
          pointHoverRadius: 6,
        }
      ]
    };
  };

  const combinedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        position: 'top' as const,
        labels: {
          color: '#fff',
          font: { size: 11, weight: 'bold' as const },
          padding: 10,
          usePointStyle: true,
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#444',
        borderWidth: 1,
      }
    },
    scales: {
      x: { 
        display: true,
        grid: { color: 'rgba(100, 150, 255, 0.1)' },
        ticks: { 
          color: '#888', 
          font: { size: 9 },
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Voltage (V)',
          color: '#888',
          font: { size: 11, weight: 'bold' as const }
        },
        grid: { color: 'rgba(100, 150, 255, 0.1)' },
        ticks: { color: '#888', font: { size: 10 } }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Current (A)',
          color: '#10b981',
          font: { size: 11, weight: 'bold' as const }
        },
        grid: { drawOnChartArea: false },
        ticks: { color: '#10b981', font: { size: 10 } }
      }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  return (
    <div className="meter-box">
      {/* Phase Selector Tabs */}
      <div className="phase-tabs">
        <button 
          className={`phase-tab phase-tab-r ${selectedPhase === 'R' ? 'active' : ''}`}
          onClick={() => setSelectedPhase('R')}
        >
          R Phase
        </button>
        <button 
          className={`phase-tab phase-tab-y ${selectedPhase === 'Y' ? 'active' : ''}`}
          onClick={() => setSelectedPhase('Y')}
        >
          Y Phase
        </button>
        <button 
          className={`phase-tab phase-tab-b ${selectedPhase === 'B' ? 'active' : ''}`}
          onClick={() => setSelectedPhase('B')}
        >
          B Phase
        </button>
      </div>

      {/* Selected Phase Display */}
      <div className="phase-content">
        <div className="phase-header-compact">
          <h3 className="phase-name" style={{ color: currentPhase.color }}>
            {currentPhase.name}
          </h3>
          <span className={`status-badge ${currentPhase.data.status}`}>
            {currentPhase.data.status.toUpperCase()}
          </span>
          {lastUpdate && (
            <div className="last-update-compact">
              <Clock size={14} />
              {lastUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Voltage & Current Gauges */}
        <div className="readings-compact">
          {/* Voltage Gauge */}
          <div className="gauge-container">
            <div className="gauge-header-mini">
              <span className="gauge-icon">⚡</span>
              <span>Voltage</span>
            </div>
            <div className="circular-gauge-wrapper">
              <svg key={`voltage-${selectedPhase}`} className="gauge-svg" viewBox="0 0 200 200">
                {/* Background Circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#2a3f5f"
                  strokeWidth="20"
                />
                {/* Progress Circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke={currentPhase.color}
                  strokeWidth="20"
                  strokeDasharray={`${(currentPhase.data.voltage / 15) * 502.65} 502.65`}
                  strokeLinecap="round"
                  transform="rotate(-90 100 100)"
                  style={{ transition: 'stroke-dasharray 0.3s ease, stroke 0.3s ease' }}
                />
                {/* Center Circle */}
                <circle cx="100" cy="100" r="60" fill="#1a2332" />
                
                {/* Value Text */}
                <text
                  x="100"
                  y="95"
                  textAnchor="middle"
                  fontSize="32"
                  fontWeight="bold"
                  fill={currentPhase.color}
                >
                  {currentPhase.data.voltage.toFixed(2).replace('.', ',')}
                </text>
                <text
                  x="100"
                  y="115"
                  textAnchor="middle"
                  fontSize="16"
                  fill="#888"
                >
                  V
                </text>
              </svg>
              
              {/* Scale Markers */}
              <div className="gauge-markers">
                <span className="marker marker-left">0</span>
                <span className="marker marker-top">7.5</span>
                <span className="marker marker-right">15</span>
              </div>
            </div>
            
            {/* Safe Range */}
            <div className="gauge-info">
              <span className="info-label">SAFE RANGE</span>
              <span className="info-value">0-13V</span>
              <span className={`status-pill ${currentPhase.data.status}`}>
                {getStatusText(currentPhase.data.status)}
              </span>
            </div>
          </div>

          {/* Current Gauge */}
          <div className="gauge-container">
            <div className="gauge-header-mini">
              <span className="gauge-icon">⚡</span>
              <span>Current</span>
            </div>
            <div className="circular-gauge-wrapper">
              <svg key={`current-${selectedPhase}`} className="gauge-svg" viewBox="0 0 200 200">
                {/* Background Circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke="#2a3f5f"
                  strokeWidth="20"
                />
                {/* Progress Circle */}
                <circle
                  cx="100"
                  cy="100"
                  r="80"
                  fill="none"
                  stroke={currentPhase.color}
                  strokeWidth="20"
                  strokeDasharray={`${(currentPhase.data.current / 1.6) * 502.65} 502.65`}
                  strokeLinecap="round"
                  transform="rotate(-90 100 100)"
                  style={{ transition: 'stroke-dasharray 0.3s ease, stroke 0.3s ease' }}
                />
                {/* Center Circle */}
                <circle cx="100" cy="100" r="60" fill="#1a2332" />
                
                {/* Value Text */}
                <text
                  x="100"
                  y="95"
                  textAnchor="middle"
                  fontSize="32"
                  fontWeight="bold"
                  fill={currentPhase.color}
                >
                  {currentPhase.data.current.toFixed(3).replace('.', ',')}
                </text>
                <text
                  x="100"
                  y="115"
                  textAnchor="middle"
                  fontSize="16"
                  fill="#888"
                >
                  A
                </text>
              </svg>
              
              {/* Scale Markers */}
              <div className="gauge-markers">
                <span className="marker marker-left">0</span>
                <span className="marker marker-top">0.8</span>
                <span className="marker marker-right">1.6</span>
              </div>
            </div>
            
            {/* Safe Range */}
            <div className="gauge-info">
              <span className="info-label">SAFE RANGE</span>
              <span className="info-value">0.01-1.2A</span>
              <span className={`status-pill ${currentPhase.data.status}`}>
                {getStatusText(currentPhase.data.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="charts-section-compact">
            {/* Combined Voltage & Current Chart */}
            <div className="chart-box chart-box-full">
              <div className="chart-title">⚡ Voltage vs Current - Time Series Comparison</div>
              <div className="chart-container-full">
                <Line data={createCombinedChart(selectedPhase)} options={combinedChartOptions} />
              </div>
            </div>
          </div>

        {/* Total Power Summary */}
        {!isWorker && (
          <div className="power-summary">
            <div className="summary-item">
              <span className="summary-label">Total System Power</span>
              <span className="summary-value">
                {(phaseR.power + phaseY.power + phaseB.power).toFixed(2)} W
              </span>
            </div>
            <div className="phase-powers">
              <div className="mini-power" style={{ borderColor: '#ff4444' }}>
                R: {phaseR.power.toFixed(1)}W
              </div>
              <div className="mini-power" style={{ borderColor: '#ffbb33' }}>
                Y: {phaseY.power.toFixed(1)}W
              </div>
              <div className="mini-power" style={{ borderColor: '#4444ff' }}>
                B: {phaseB.power.toFixed(1)}W
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MeterBox;
