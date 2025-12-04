import { useState, useEffect } from 'react';
import { apiService } from '../services/apiService';
import { TrendingUp, AlertTriangle, Clock, Activity } from 'lucide-react';
import '../styles/Analytics.css';

interface Stats {
  R_Phase: { voltage: { avg: string; min: string; max: string }; current: { avg: string; min: string; max: string } };
  Y_Phase: { voltage: { avg: string; min: string; max: string }; current: { avg: string; min: string; max: string } };
  B_Phase: { voltage: { avg: string; min: string; max: string }; current: { avg: string; min: string; max: string } };
  dataPoints: number;
  period: string;
}

interface FaultEvent {
  Date: string;
  Time: string;
  Fault_Type: string;
  R_V: number;
  Y_V: number;
  B_V: number;
  R_I: number;
  Y_I: number;
  B_I: number;
}

const Analytics = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [faults, setFaults] = useState<FaultEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [statsResponse, faultsResponse] = await Promise.all([
        apiService.get24HourStats(),
        apiService.getFaultEvents(20)
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.stats);
      }

      if (faultsResponse.success) {
        setFaults(faultsResponse.faults);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="spinner-large"></div>
        <p>Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      <div className="analytics-header">
        <h2><TrendingUp size={28} /> 24-Hour Analytics Dashboard</h2>
        <button onClick={fetchAnalytics} className="refresh-btn">
          <Activity size={18} />
          Refresh
        </button>
      </div>

      {/* Statistics Cards */}
      {stats ? (
        <div className="stats-grid">
          {/* R Phase Stats */}
          <div className="stat-card stat-card-r">
            <h3>R Phase Statistics</h3>
            <div className="stat-rows">
              <div className="stat-row">
                <span className="stat-label">Voltage</span>
                <div className="stat-values">
                  <span>Avg: {stats.R_Phase.voltage.avg}V</span>
                  <span>Min: {stats.R_Phase.voltage.min}V</span>
                  <span>Max: {stats.R_Phase.voltage.max}V</span>
                </div>
              </div>
              <div className="stat-row">
                <span className="stat-label">Current</span>
                <div className="stat-values">
                  <span>Avg: {stats.R_Phase.current.avg}A</span>
                  <span>Min: {stats.R_Phase.current.min}A</span>
                  <span>Max: {stats.R_Phase.current.max}A</span>
                </div>
              </div>
            </div>
          </div>

          {/* Y Phase Stats */}
          <div className="stat-card stat-card-y">
            <h3>Y Phase Statistics</h3>
            <div className="stat-rows">
              <div className="stat-row">
                <span className="stat-label">Voltage</span>
                <div className="stat-values">
                  <span>Avg: {stats.Y_Phase.voltage.avg}V</span>
                  <span>Min: {stats.Y_Phase.voltage.min}V</span>
                  <span>Max: {stats.Y_Phase.voltage.max}V</span>
                </div>
              </div>
              <div className="stat-row">
                <span className="stat-label">Current</span>
                <div className="stat-values">
                  <span>Avg: {stats.Y_Phase.current.avg}A</span>
                  <span>Min: {stats.Y_Phase.current.min}A</span>
                  <span>Max: {stats.Y_Phase.current.max}A</span>
                </div>
              </div>
            </div>
          </div>

          {/* B Phase Stats */}
          <div className="stat-card stat-card-b">
            <h3>B Phase Statistics</h3>
            <div className="stat-rows">
              <div className="stat-row">
                <span className="stat-label">Voltage</span>
                <div className="stat-values">
                  <span>Avg: {stats.B_Phase.voltage.avg}V</span>
                  <span>Min: {stats.B_Phase.voltage.min}V</span>
                  <span>Max: {stats.B_Phase.voltage.max}V</span>
                </div>
              </div>
              <div className="stat-row">
                <span className="stat-label">Current</span>
                <div className="stat-values">
                  <span>Avg: {stats.B_Phase.current.avg}A</span>
                  <span>Min: {stats.B_Phase.current.min}A</span>
                  <span>Max: {stats.B_Phase.current.max}A</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Card */}
          <div className="stat-card stat-card-summary">
            <h3><Clock size={24} /> Period Summary</h3>
            <div className="summary-items">
              <div className="summary-item">
                <span className="summary-label">Time Period</span>
                <span className="summary-value">{stats.period}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Data Points</span>
                <span className="summary-value">{stats.dataPoints}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Fault Events</span>
                <span className="summary-value fault-count">{faults.length}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-data-message">
          <p>No data available for the last 24 hours</p>
        </div>
      )}

      {/* Fault Events Table */}
      <div className="faults-section">
        <h3><AlertTriangle size={24} /> Recent Fault Events</h3>
        {faults.length > 0 ? (
          <div className="faults-table-container">
            <table className="faults-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Fault Type</th>
                  <th>R Phase</th>
                  <th>Y Phase</th>
                  <th>B Phase</th>
                </tr>
              </thead>
              <tbody>
                {faults.map((fault, idx) => (
                  <tr key={idx}>
                    <td>{fault.Date}</td>
                    <td>{fault.Time}</td>
                    <td className="fault-type">{fault.Fault_Type}</td>
                    <td>
                      <div className="phase-values">
                        <span>{fault.R_V}V</span>
                        <span>{fault.R_I}A</span>
                      </div>
                    </td>
                    <td>
                      <div className="phase-values">
                        <span>{fault.Y_V}V</span>
                        <span>{fault.Y_I}A</span>
                      </div>
                    </td>
                    <td>
                      <div className="phase-values">
                        <span>{fault.B_V}V</span>
                        <span>{fault.B_I}A</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-faults-message">
            <p>✅ No fault events recorded</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
