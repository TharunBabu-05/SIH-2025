import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, User, Lock, AlertCircle, ChevronDown, Users } from 'lucide-react';
import '../styles/Login.css';

const Login = () => {
  const { login } = useAuth();
  const [userType, setUserType] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const userTypes = [
    { value: 'assistant_engineer', label: 'Assistant Engineer' },
    { value: 'junior_engineer', label: 'Junior Engineer' },
    { value: 'section_officer', label: 'Section Officer' },
    { value: 'lineman', label: 'Line Man' }
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background"></div>
      
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <LogIn size={48} />
          </div>
          <h1>KSEBL Monitoring System</h1>
          <p>3-Phase Fault Detection Dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="userType">
              <Users size={20} />
              <span>User Type</span>
            </label>
            <div className="select-wrapper">
              <select
                id="userType"
                value={userType}
                onChange={(e) => setUserType(e.target.value)}
                required
                className="form-select"
              >
                <option value="">Select your user type</option>
                {userTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={20} className="select-icon" />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="username">
              <User size={20} />
              <span>Username</span>
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Lock size={20} />
              <span>Password</span>
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <div className="spinner"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn size={20} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
