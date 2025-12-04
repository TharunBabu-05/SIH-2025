import { Line } from 'react-chartjs-2';
import { Clock } from 'lucide-react';
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
      y: { display: false }
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  const renderPhasePanel = (
    phaseName: string,
    phaseData: PhaseData,
    phaseKey: 'R' | 'Y' | 'B',
    color: string
  ) => (
    <div className={`phase-panel phase-${phaseKey.toLowerCase()}`}>
      <div className="phase-header">
        <h3 className="phase-title">{phaseName}</h3>
        <span className={`status-badge ${phaseData.status}`}>
          {phaseData.status.toUpperCase()}
        </span>
      </div>

      <div className="readings">
        {/* Voltage */}
        <div className="reading-item">
          <span className="reading-label">Voltage</span>
          <div className="reading-value">
            {phaseData.voltage.toFixed(2)}
          </div>
          <span className="reading-unit">V</span>
        </div>

        {/* Current */}
        <div className="reading-item">
          <span className="reading-label">Current</span>
          <div className="reading-value">
            {phaseData.current.toFixed(2)}
          </div>
          <span className="reading-unit">A</span>
        </div>
      </div>

      {/* Power Display */}
      {!isWorker && (
        <div className="power-display">
          <span className="power-label">Power</span>
          <span className="power-value">{phaseData.power.toFixed(2)} W</span>
        </div>
      )}

      {/* Micro Chart */}
      {!isWorker && historicalData.length > 0 && (
        <div className="micro-chart">
          <div className="chart-container">
            <Line data={createChartData(phaseKey, 'V')} options={chartOptions} />
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="meter-box">
      <div className="meter-box-header">
        <h2>Meter Box - 3 Phase Monitoring</h2>
        {lastUpdate && (
          <div className="last-update">
            <Clock size={16} />
            Last Update: {lastUpdate.toLocaleTimeString()}
          </div>
        )}
      </div>

      <div className="phase-grid">
        {renderPhasePanel('R Phase', phaseR, 'R', '#ff4444')}
        {renderPhasePanel('Y Phase', phaseY, 'Y', '#ffbb33')}
        {renderPhasePanel('B Phase', phaseB, 'B', '#4444ff')}
      </div>

      {!isWorker && (
        <div className="total-power">
          <span className="total-power-label">Total System Power</span>
          <span className="total-power-value">
            {(phaseR.power + phaseY.power + phaseB.power).toFixed(2)} W
          </span>
        </div>
      )}
    </div>
  );
};

export default MeterBox;
