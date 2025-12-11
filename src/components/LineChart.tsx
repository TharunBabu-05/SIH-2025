import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/Chart.css';

interface LineChartProps {
  data: number[];
  labels: string[];
  label: string;
  color: string;
  unit: string;
}

const LineChart = ({ data, labels, label, color, unit }: LineChartProps) => {
  // Transform data for recharts
  const chartData = data.map((value, index) => ({
    name: labels[index] || index.toString(),
    value: value
  }));

  // Determine Y-axis domain based on unit
  let yDomain: [number, number] | undefined;
  if (unit === 'V') {
    yDomain = [12.0, 13.0]; // Voltage scale: 12.0-13.0V (wider range than gauge for better visibility)
  } else if (unit === 'A') {
    yDomain = [0, 1.8]; // Current scale: 0-1.8A
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsLine data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        <XAxis 
          dataKey="name" 
          tick={{ fill: '#fff', fontSize: 11 }}
          stroke="rgba(255, 255, 255, 0.3)"
        />
        <YAxis 
          domain={yDomain}
          tick={{ fill: '#fff', fontSize: 11 }}
          stroke="rgba(255, 255, 255, 0.3)"
          label={{ 
            value: unit, 
            angle: -90, 
            position: 'insideLeft',
            style: { fill: '#fff', fontSize: 12 }
          }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.8)', 
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            color: '#fff'
          }}
          formatter={(value: number) => [`${value.toFixed(3)} ${unit}`, label]}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          strokeWidth={2}
          dot={{ fill: color, r: 3 }}
          activeDot={{ r: 5 }}
          name={label}
        />
      </RechartsLine>
    </ResponsiveContainer>
  );
};

export default LineChart;
