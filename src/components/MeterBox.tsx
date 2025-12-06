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
    const labels = historicalData.map((_, idx) => `${idx + 1}`);
    const data = historicalData.map(d => d[`${phaseKey}_${dataKey}` as keyof SensorData] as number);
    
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
        pointRadius: 0,
        pointHoverRadius: 4,
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: !isWorker,
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

        {/* Voltage & Current Cards */}
        <div className="readings-compact">
          <div className="reading-card">
            <div className="reading-label">Voltage</div>
            <div className="reading-value-large" style={{ color: currentPhase.color }}>
              {currentPhase.data.voltage.toFixed(2)}
            </div>
            <div className="reading-unit">V</div>
          </div>

          <div className="reading-card">
            <div className="reading-label">Current</div>
            <div className="reading-value-large" style={{ color: currentPhase.color }}>
              {currentPhase.data.current.toFixed(2)}
            </div>
            <div className="reading-unit">A</div>
          </div>

          {!isWorker && (
            <div className="reading-card">
              <div className="reading-label">Power</div>
              <div className="reading-value-large" style={{ color: currentPhase.color }}>
                {currentPhase.data.power.toFixed(2)}
              </div>
              <div className="reading-unit">W</div>
            </div>
          )}
        </div>

        {/* Charts Section */}
        {!isWorker && historicalData.length > 0 && (
          <div className="charts-section-compact">
            <div className="chart-box">
              <div className="chart-title">Voltage Trend</div>
              <div className="chart-container-compact">
                <Line data={createChartData(selectedPhase, 'V')} options={chartOptions} />
              </div>
            </div>
            <div className="chart-box">
              <div className="chart-title">Current Trend</div>
              <div className="chart-container-compact">
                <Line data={createChartData(selectedPhase, 'I')} options={chartOptions} />
              </div>
            </div>
          </div>
        )}

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
