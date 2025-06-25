import React, { useState, useEffect } from 'react';
import { 
  Server, 
  Cpu, 
  HardDrive, 
  Activity, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Monitor,
  Thermometer
} from 'lucide-react';
import axios from 'axios';
import './Components.css';

const SystemStatus = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/status');
      setStatus(response.data);
      setError('');
      setLastUpdate(new Date());
    } catch (error) {
      setError('Failed to fetch system status');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (value, thresholds) => {
    if (value >= thresholds.danger) return 'text-red-600';
    if (value >= thresholds.warning) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading && !status) {
    return (
      <div className="system-status">
        <div className="loading-container">
          <RefreshCw size={32} className="animate-spin text-blue-600" />
          <p>Loading system status...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="system-status">
        <div className="error-container">
          <AlertCircle size={32} className="text-red-600" />
          <p className="error-message">{error}</p>
          <button onClick={fetchStatus} className="btn btn-primary">
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="system-status">
      <div className="status-header">
        <h2 className="section-title">System Status</h2>
        <div className="header-actions">
          <span className="last-update">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <button 
            onClick={fetchStatus} 
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="status-grid">
        {/* System Resources */}
        <div className="card">
          <h3 className="card-title">
            <Monitor size={20} />
            System Resources
          </h3>
          
          <div className="resource-metrics">
            <div className="metric-item">
              <div className="metric-header">
                <Cpu size={16} />
                <span>CPU Usage</span>
              </div>
              <div className="metric-value">
                <span className={`value ${getStatusColor(status?.system_resources?.cpu_percent || 0, { warning: 70, danger: 90 })}`}>
                  {status?.system_resources?.cpu_percent?.toFixed(1) || 0}%
                </span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${status?.system_resources?.cpu_percent || 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="metric-item">
              <div className="metric-header">
                <HardDrive size={16} />
                <span>Memory Usage</span>
              </div>
              <div className="metric-value">
                <span className={`value ${getStatusColor(status?.system_resources?.memory_percent || 0, { warning: 80, danger: 95 })}`}>
                  {status?.system_resources?.memory_percent?.toFixed(1) || 0}%
                </span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: `${status?.system_resources?.memory_percent || 0}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="metric-item">
              <div className="metric-header">
                <Server size={16} />
                <span>Available Memory</span>
              </div>
              <div className="metric-value">
                <span className="value">
                  {status?.system_resources?.memory_available_gb?.toFixed(2) || 0} GB
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Configuration */}
        <div className="card">
          <h3 className="card-title">
            <Activity size={20} />
            Traffic Shaping Status
          </h3>
          
          <div className="config-status">
            <div className="status-item">
              <span className="status-label">Status:</span>
              <span className={`status-badge ${status?.current_config?.enabled ? 'status-online' : 'status-offline'}`}>
                {status?.current_config?.enabled ? (
                  <>
                    <CheckCircle size={14} />
                    Active
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} />
                    Inactive
                  </>
                )}
              </span>
            </div>
            
            {status?.current_config?.enabled && (
              <>
                <div className="status-item">
                  <span className="status-label">Packet Delay:</span>
                  <span className="status-value">{status.current_config.delay_ms}ms</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Bandwidth Limit:</span>
                  <span className="status-value">{status.current_config.bandwidth_mbps} Mbps</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Input Interface:</span>
                  <span className="status-value">{status.current_config.interface_in || 'Not set'}</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Output Interface:</span>
                  <span className="status-value">{status.current_config.interface_out || 'Not set'}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Interface Summary */}
        <div className="card">
          <h3 className="card-title">
            <Activity size={20} />
            Network Interfaces
          </h3>
          
          <div className="interfaces-summary">
            {Object.entries(status?.interfaces || {}).map(([name, iface]) => (
              <div key={name} className="interface-item">
                <div className="interface-header">
                  <span className="interface-name">{name}</span>
                  <span className={`interface-status ${iface.stats?.is_up ? 'status-online' : 'status-offline'}`}>
                    {iface.stats?.is_up ? 'UP' : 'DOWN'}
                  </span>
                </div>
                <div className="interface-details">
                  {iface.stats?.speed && (
                    <span className="detail">Speed: {iface.stats.speed} Mbps</span>
                  )}
                  {iface.stats?.mtu && (
                    <span className="detail">MTU: {iface.stats.mtu}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus; 