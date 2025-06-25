import React, { useState } from 'react';
import { Lock, User, Eye, EyeOff, Network } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './LoginForm.css';

const LoginForm = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
    } catch (err) {
      setError(err.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container animate-fadeIn">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <Network size={48} className="logo-icon" />
          </div>
          <h1 className="login-title">Traffic Shaper</h1>
          <p className="login-subtitle">Control Panel</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message animate-slideIn">
              <Lock size={16} />
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username" className="form-label">
              <User size={16} />
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`form-input ${error ? 'error' : ''}`}
              placeholder="Enter your username"
              required
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              <Lock size={16} />
              Password
            </label>
            <div className="password-input-container">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`form-input ${error ? 'error' : ''}`}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading || !username || !password}
          >
            {loading ? (
              <>
                <div className="loading-spinner" />
                Signing in...
              </>
            ) : (
              <>
                <Lock size={16} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <div className="demo-credentials">
            <p className="demo-title">Demo Credentials:</p>
            <p className="demo-info">Username: <strong>devonics</strong></p>
            <p className="demo-info">Password: <strong>LetsAutomate</strong></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm; 