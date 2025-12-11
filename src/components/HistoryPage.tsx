import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, History, Download, Calendar, Clock } from 'lucide-react';
import { firebaseService } from '../services/firebaseService';
import '../styles/HistoryPage.css';

interface HistoryRecord {
  id: string;
  phase: 'R' | 'Y' | 'B';
  voltage: number;
  current: number;
  power: number;
  status: string;
  timestamp: Date;
}

const HistoryPage = () => {
  const navigate = useNavigate();
  const [historyData, setHistoryData] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPhase, setFilterPhase] = useState<'ALL' | 'R' | 'Y' | 'B'>('ALL');
  const [lastRecordedTime, setLastRecordedTime] = useState<Date | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const readings = await firebaseService.getRecentReadings(200);
      
      const formattedData: HistoryRecord[] = readings.map((reading: any) => ({
        id: reading.id,
        phase: reading.phase,
        voltage: reading.voltage,
        current: reading.current,
        power: reading.power,
        status: reading.status,
        timestamp: reading.timestamp
      }));

      setHistoryData(formattedData);
      
      if (formattedData.length > 0) {
        setLastRecordedTime(formattedData[0].timestamp);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error loading history:', error);
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    const filteredData = filterPhase === 'ALL' 
      ? historyData 
      : historyData.filter(d => d.phase === filterPhase);

    // Create CSV content
    const headers = ['Date', 'Time', 'Phase', 'Voltage (V)', 'Current (A)', 'Power (W)', 'Status'];
    const csvRows = [headers.join(',')];

    filteredData.forEach(record => {
      const date = new Date(record.timestamp);
      const row = [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        record.phase,
        record.voltage.toFixed(2),
        record.current.toFixed(3),
        record.power.toFixed(2),
        record.status
      ];
      csvRows.push(row.join(','));
    });

    // Add metadata
    const now = new Date();
    const metadata = [
      '',
      '--- Download Information ---',
      `Downloaded on: ${now.toLocaleDateString()} at ${now.toLocaleTimeString()}`,
      `Last recorded: ${lastRecordedTime ? lastRecordedTime.toLocaleDateString() + ' at ' + lastRecordedTime.toLocaleTimeString() : 'N/A'}`,
      `Total records: ${filteredData.length}`,
      `Filter: ${filterPhase === 'ALL' ? 'All Phases' : filterPhase + ' Phase'}`
    ];

    const csvContent = csvRows.join('\n') + '\n' + metadata.join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `KSEBL_History_${filterPhase}_${now.toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const filteredHistory = filterPhase === 'ALL' 
    ? historyData 
    : historyData.filter(d => d.phase === filterPhase);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'normal': return '#10b981';
      default: return '#888';
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'R': return '#ef4444';
      case 'Y': return '#f59e0b';
      case 'B': return '#3b82f6';
      default: return '#888';
    }
  };

  return (
    <div className="history-page">
      <div className="history-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
          Back to Dashboard
        </button>
        <h1>
          <History size={28} />
          Historical Data
        </h1>
      </div>

      {/* Controls */}
      <div className="history-controls">
        <div className="filter-group">
          <label>Filter by Phase:</label>
          <div className="phase-filters">
            <button 
              className={`filter-btn ${filterPhase === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterPhase('ALL')}
            >
              All Phases
            </button>
            <button 
              className={`filter-btn phase-r ${filterPhase === 'R' ? 'active' : ''}`}
              onClick={() => setFilterPhase('R')}
            >
              R Phase
            </button>
            <button 
              className={`filter-btn phase-y ${filterPhase === 'Y' ? 'active' : ''}`}
              onClick={() => setFilterPhase('Y')}
            >
              Y Phase
            </button>
            <button 
              className={`filter-btn phase-b ${filterPhase === 'B' ? 'active' : ''}`}
              onClick={() => setFilterPhase('B')}
            >
              B Phase
            </button>
          </div>
        </div>

        <button className="download-btn" onClick={downloadCSV}>
          <Download size={20} />
          Download CSV
        </button>
      </div>

      {/* Last Recorded Info */}
      {lastRecordedTime && (
        <div className="last-recorded-info">
          <div className="info-item">
            <Calendar size={18} />
            <span>Last Recorded: {lastRecordedTime.toLocaleDateString()}</span>
          </div>
          <div className="info-item">
            <Clock size={18} />
            <span>{lastRecordedTime.toLocaleTimeString()}</span>
          </div>
          <div className="info-item">
            <History size={18} />
            <span>Total Records: {filteredHistory.length}</span>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading history...</p>
        </div>
      ) : (
        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>Phase</th>
                <th>Voltage (V)</th>
                <th>Current (A)</th>
                <th>Power (W)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="no-data">No historical data available</td>
                </tr>
              ) : (
                filteredHistory.map((record) => (
                  <tr key={record.id}>
                    <td>{new Date(record.timestamp).toLocaleDateString()}</td>
                    <td>{new Date(record.timestamp).toLocaleTimeString()}</td>
                    <td>
                      <span 
                        className="phase-badge" 
                        style={{ backgroundColor: getPhaseColor(record.phase) }}
                      >
                        {record.phase}
                      </span>
                    </td>
                    <td>{record.voltage.toFixed(2)}</td>
                    <td>{record.current.toFixed(3)}</td>
                    <td>{record.power.toFixed(2)}</td>
                    <td>
                      <span 
                        className="status-badge" 
                        style={{ 
                          backgroundColor: `${getStatusColor(record.status)}20`,
                          color: getStatusColor(record.status),
                          border: `1px solid ${getStatusColor(record.status)}`
                        }}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
