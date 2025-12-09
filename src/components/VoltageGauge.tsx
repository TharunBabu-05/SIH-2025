import { Activity } from 'lucide-react';
import { useState, useEffect } from 'react';
import '../styles/Gauge.css';
import '../styles/3DEffects.css';

interface VoltageGaugeProps {
  value: number;
  status: 'normal' | 'warning' | 'critical';
}

const VoltageGauge = ({ value, status }: VoltageGaugeProps) => {
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [animatedValue, setAnimatedValue] = useState(0);
  
  // Animate value changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  // Calculate percentage (0-15V range)
  const percentage = Math.min((animatedValue / 15) * 100, 100);
  const angle = (percentage / 100) * 270 - 135; // -135 to 135 degrees
  
  const getColor = () => {
    if (value > 14.5) return '#ff4444';
    if (value > 13) return '#ffaa00';
    if (value < 0.5) return '#ff4444';
    return '#00dd00';
  };

  const getGradient = () => {
    const color = getColor();
    return `conic-gradient(from -135deg, ${color} 0deg, ${color} ${percentage * 2.7}deg, #e0e0e0 ${percentage * 2.7}deg, #e0e0e0 135deg)`;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    
    const rotateX = (y - centerY) / 20;
    const rotateY = (centerX - x) / 20;
    
    setRotation({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
  };

  return (
    <div 
      className="gauge-card card-3d perspective-container"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: `perspective(1000px) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
      }}
    >
      <div className="gauge-header depth-layer-1">
        <Activity size={24} color="var(--primary-color, #667eea)" className="float-animation" />
        <h2>Voltage</h2>
      </div>
      
      <div className="circular-gauge-container">
        {/* Circular Gauge */}
        <div className="circular-gauge" style={{ background: getGradient() }}>
          <div className="gauge-inner">
            <div className="gauge-value-display">
              <span 
                className={`gauge-number ${(value > 13 || value < 0.5) ? 'gauge-glow' : ''}`}
                style={{ color: getColor() }}
              >
                {animatedValue.toFixed(2).replace('.', ',')}
              </span>
              <span className="gauge-unit">V</span>
            </div>
          </div>
        </div>

        {/* Needle/Pointer */}
        <div 
          className="gauge-needle"
          style={{
            transform: `rotate(${angle}deg)`,
            borderBottomColor: getColor(),
          }}
        >
          <div className="needle-center" style={{ background: getColor() }} />
        </div>
        
        {/* Scale Markers */}
        <div className="gauge-scale">
          <span className="scale-mark start">0</span>
          <span className="scale-mark mid">7.5</span>
          <span className="scale-mark end">15</span>
        </div>
      </div>
      
      <div className="gauge-info">
        <div className="gauge-range-display">
          <div className="range-item">
            <span className="range-label">Safe Range</span>
            <span className="range-value">0-13V</span>
          </div>
          <div className="gauge-status-badge" style={{ 
            background: getColor(),
            boxShadow: `0 0 20px ${getColor()}`
          }}>
            NORMAL
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoltageGauge;
