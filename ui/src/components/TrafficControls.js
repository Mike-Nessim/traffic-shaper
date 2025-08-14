import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Gauge, 
  Clock, 
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  Loader
} from 'lucide-react';
import axios from 'axios';
import './Components.css'; // Updated with better margins v2

const TrafficControls = () => {
  const [config, setConfig] = useState({
    enabled: false,
    delay_ms: 0,
    bandwidth_mbps: 100,
    interface_in: '',
    interface_out: ''
  });
  const [interfaces, setInterfaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [firstEthernet, setFirstEthernet] = useState('');

  useEffect(() => {
    fetchCurrentConfig();
    fetchInterfaces();
  }, []);

  const fetchCurrentConfig = async () => {
    try {
      const response = await axios.get('/config');
      setConfig(response.data);
      // After loading config, check if we need to set default interface
      await fetchNetworkInfo();
    } catch (error) {
      showMessage('Failed to fetch current configuration', 'error');
    }
  };

  const fetchInterfaces = async () => {
    try {
      const response = await axios.get('/interfaces');
      setInterfaces(Object.values(response.data));
    } catch (error) {
      showMessage('Failed to fetch network interfaces', 'error');
    }
  };

  const fetchNetworkInfo = async () => {
    try {
      const response = await axios.get('/api/network/interfaces');
      const firstEth = response.data.first_ethernet;
      setFirstEthernet(firstEth);
      
      // Set first ethernet as default input interface if no interface is currently selected
      setConfig(prev => {
        if (firstEth && !prev.interface_in) {
          return {
            ...prev,
            interface_in: firstEth
          };
        }
        return prev;
      });
    } catch (error) {
      console.warn('Could not fetch network info for default interface selection');
    }
  };

  const showMessage = (text, type) => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => {
      setMessage('');
      setMessageType('');
    }, 5000);
  };

  const handleConfigChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post('/config', config);
      showMessage(response.data.message, 'success');
      await fetchCurrentConfig(); // Refresh current config
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to update configuration';
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/reset');
      showMessage(response.data.message, 'success');
      await fetchCurrentConfig();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to reset configuration';
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleTrafficShaping = async () => {
    const newConfig = {
      ...config,
      enabled: !config.enabled
    };
    
    setLoading(true);
    try {
      const response = await axios.post('/config', newConfig);
      setConfig(newConfig);
      showMessage(response.data.message, 'success');
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Failed to toggle traffic shaping';
      showMessage(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="traffic-controls">
      <div className="controls-header">
        <h2 className="section-title">Traffic Shaping Controls</h2>
      </div>

      {message && (
        <div className={`alert ${messageType === 'error' ? 'alert-error' : 'alert-success'} animate-slideIn`}>
          {messageType === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          {message}
        </div>
      )}

      <div className="controls-grid">
        {/* Quick Actions */}
        <div className="card quick-actions-card">
          <h3 className="card-title">
            <Settings size={20} />
            Quick Actions
          </h3>
          
          <div className="quick-actions">
            <button
              onClick={toggleTrafficShaping}
              className={`btn ${config.enabled ? 'btn-warning' : 'btn-success'} w-full`}
              disabled={loading}
            >
              {loading ? (
                <Loader size={16} className="animate-spin" />
              ) : config.enabled ? (
                <Pause size={16} />
              ) : (
                <Play size={16} />
              )}
              {config.enabled ? 'Disable Traffic Shaping' : 'Enable Traffic Shaping'}
            </button>
            
            <button
              onClick={handleReset}
              className="btn btn-secondary w-full"
              disabled={loading}
            >
              {loading ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <RotateCcw size={16} />
              )}
              Reset to Default
            </button>
          </div>
        </div>

        {/* Status Display */}
        <div className="card status-display-card">
          <h3 className="card-title">
            <Gauge size={20} />
            Status
          </h3>
          
          <div className="status-circle-container">
            <div className={`status-circle ${config.enabled ? 'status-circle-active' : 'status-circle-inactive'}`}>
              {config.enabled ? 'ACTIVE' : 'NOT ACTIVE'}
            </div>
          </div>
        </div>

        {/* Configuration Form */}
        <div className="card config-form">
          <h3 className="card-title">
            <Gauge size={20} />
            Configuration
          </h3>
          
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <Clock size={16} />
                  Packet Delay (ms)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000"
                  value={config.delay_ms}
                  onChange={(e) => handleConfigChange('delay_ms', parseInt(e.target.value) || 0)}
                  className="form-input"
                  placeholder="0"
                />
                <small className="form-help">Add delay to packets (0-10000ms)</small>
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Gauge size={16} />
                  Bandwidth Limit (Mbps)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  value={config.bandwidth_mbps}
                  onChange={(e) => handleConfigChange('bandwidth_mbps', parseFloat(e.target.value) || 100)}
                  className="form-input"
                  placeholder="100"
                />
                <small className="form-help">Limit bandwidth (0.1-1000 Mbps)</small>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <Wifi size={16} />
                  Input Interface
                </label>
                <select
                  value={config.interface_in}
                  onChange={(e) => handleConfigChange('interface_in', e.target.value)}
                  className="form-input"
                >
                  <option value="">Select input interface</option>
                  {interfaces.map((iface) => (
                    <option key={iface.name} value={iface.name}>
                      {iface.name} {iface.stats?.is_up ? '(UP)' : '(DOWN)'}
                      {iface.name === firstEthernet ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
                {config.interface_in === firstEthernet && (
                  <small className="form-help" style={{color: '#10b981'}}>
                    ✓ Using recommended default interface ({firstEthernet})
                  </small>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">
                  <Wifi size={16} />
                  Output Interface
                </label>
                <select
                  value={config.interface_out}
                  onChange={(e) => handleConfigChange('interface_out', e.target.value)}
                  className="form-input"
                >
                  <option value="">Select output interface</option>
                  {interfaces.map((iface) => (
                    <option key={iface.name} value={iface.name}>
                      {iface.name} {iface.stats?.is_up ? '(UP)' : '(DOWN)'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading || !config.interface_in || !config.interface_out}
            >
              {loading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Applying Configuration...
                </>
              ) : (
                <>
                  <Settings size={16} />
                  Apply Configuration
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Current Status */}
      <div className="card status-summary">
        <h3 className="card-title">Current Configuration</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Status:</span>
            <span className={`status-value ${config.enabled ? 'text-green-600' : 'text-red-600'}`}>
              {config.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Delay:</span>
            <span className="status-value">{config.delay_ms}ms</span>
          </div>
          <div className="status-item">
            <span className="status-label">Bandwidth:</span>
            <span className="status-value">{config.bandwidth_mbps} Mbps</span>
          </div>
          <div className="status-item">
            <span className="status-label">Input Interface:</span>
            <span className="status-value">{config.interface_in || 'Not set'}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Output Interface:</span>
            <span className="status-value">{config.interface_out || 'Not set'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficControls; 