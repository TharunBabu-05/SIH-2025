import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './components/Login';
import MonitoringDashboard from './components/MonitoringDashboard';
import GraphsPage from './components/GraphsPage';
import HistoryPage from './components/HistoryPage';
import './App.css';

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  function ProtectedRoute({ children }: { children: React.ReactNode }) {
    if (loading) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1f2e 50%, #0f1419 100%)',
          color: '#fff'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid rgba(100, 149, 237, 0.2)',
              borderTop: '4px solid #6495ed',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 15px'
            }}></div>
            <p>Loading...</p>
          </div>
        </div>
      );
    }

    return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
  }

  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <MonitoringDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/graphs" 
          element={
            <ProtectedRoute>
              <GraphsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/history" 
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
