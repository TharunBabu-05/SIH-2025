import { Battery, TrendingUp, DollarSign, Zap } from 'lucide-react';
import '../styles/PowerAnalysis.css';

interface PowerAnalysisProps {
  power: number;
  totalEnergy: number;
  voltage: number;
  current: number;
}

const PowerAnalysis = ({ power, totalEnergy, voltage, current }: PowerAnalysisProps) => {
  // Calculate additional metrics
  const energyKWh = totalEnergy / 1000; // Convert Wh to kWh
  const estimatedCost = energyKWh * 7.5; // Assuming ₹7.5 per kWh (KSEBL rate)
  const efficiency = voltage > 0 ? (power / (voltage * 10)) * 100 : 0; // Efficiency percentage
  const powerFactor = current > 0 ? power / (voltage * current) : 1;

  return (
    <div className="power-analysis-panel">
      <h2 className="panel-title">Power Analysis</h2>
      
      <div className="power-grid">
        <div className="power-card primary">
          <div className="card-header">
            <Zap size={24} />
            <span>Real-time Power</span>
          </div>
          <div className="card-value">{power.toFixed(2)} W</div>
          <div className="card-footer">
            <span className="trend-indicator" style={{ color: power > 50 ? '#ff4444' : '#00dd00' }}>
              {power > 50 ? 'High' : 'Normal'}
            </span>
          </div>
        </div>

        <div className="power-card secondary">
          <div className="card-header">
            <Battery size={24} />
            <span>Total Energy</span>
          </div>
          <div className="card-value">{totalEnergy.toFixed(3)} Wh</div>
          <div className="card-subtitle">{energyKWh.toFixed(6)} kWh</div>
        </div>

        <div className="power-card accent">
          <div className="card-header">
            <DollarSign size={24} />
            <span>Estimated Cost</span>
          </div>
          <div className="card-value">₹{estimatedCost.toFixed(2)}</div>
          <div className="card-subtitle">Since start</div>
        </div>

        <div className="power-card info">
          <div className="card-header">
            <TrendingUp size={24} />
            <span>Load Factor</span>
          </div>
          <div className="card-value">{efficiency.toFixed(1)}%</div>
          <div className="card-subtitle">Current load usage</div>
        </div>
      </div>

      <div className="power-metrics">
        <h3>Detailed Metrics</h3>
        <div className="metrics-grid">
          <div className="metric-item">
            <span className="metric-label">Power Factor</span>
            <span className="metric-value">{powerFactor.toFixed(3)}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Apparent Power (VA)</span>
            <span className="metric-value">{(voltage * current).toFixed(2)}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Active Power (W)</span>
            <span className="metric-value">{power.toFixed(2)}</span>
          </div>
          <div className="metric-item">
            <span className="metric-label">Energy Rate</span>
            <span className="metric-value">₹7.50/kWh</span>
          </div>
        </div>
      </div>

      <div className="consumption-tips">
        <h4>💡 Energy Tips</h4>
        <ul>
          <li>Monitor peak hours to optimize consumption</li>
          <li>Power factor below 0.8 indicates reactive power losses</li>
          <li>Regular monitoring helps detect anomalies early</li>
          <li>Current above 8A may indicate overloading</li>
        </ul>
      </div>
    </div>
  );
};

export default PowerAnalysis;
