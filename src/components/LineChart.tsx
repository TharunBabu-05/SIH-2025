import { LineChart as RechartsLine, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import '../styles/Chart.css';

interface SensorData {
  voltage: number;
  current: number;
  timestamp: string;
  status: 'normal' | 'warning' | 'critical';
}

interface LineChartProps {
  data: SensorData[];
  title: string;
}

const LineChart = ({ data, title }: LineChartProps) => {
  const chartData = data.map((item, index) => ({
    name: index.toString(),
    time: new Date(item.timestamp).toLocaleTimeString(),
    voltage: parseFloat(item.voltage.toFixed(2)),
    current: parseFloat(item.current.toFixed(2))
  }));

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h2>{title}</h2>
      </div>
      
      <ResponsiveContainer width="100%" height={400}>
        <RechartsLine data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="name" 
            label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="left"
            label={{ value: 'Voltage (V)', angle: -90, position: 'insideLeft' }}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right"
            label={{ value: 'Current (A)', angle: 90, position: 'insideRight' }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#fff', 
              border: '1px solid #ccc',
              borderRadius: '8px'
            }}
          />
          <Legend />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="voltage" 
            stroke="#667eea" 
            strokeWidth={2}
            dot={{ fill: '#667eea', r: 3 }}
            name="Voltage (V)"
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="current" 
            stroke="#764ba2" 
            strokeWidth={2}
            dot={{ fill: '#764ba2', r: 3 }}
            name="Current (A)"
          />
        </RechartsLine>
      </ResponsiveContainer>
    </div>
  );
};

export default LineChart;
