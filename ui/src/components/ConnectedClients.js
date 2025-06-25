import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Server,
  Clock,
  Monitor,
  AlertCircle,
  CheckCircle,
  Activity,
  Globe,
  Settings
} from 'lucide-react';
import axios from 'axios';
import './Components.css';

const ConnectedClients = () => {
  const [clients, setClients] = useState({});
  const [dhcpStatus, setDhcpStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [clientsResponse, statusResponse] = await Promise.all([
        axios.get('/dhcp/clients'),
        axios.get('/dhcp/status')
      ]);
      
      setClients(clientsResponse.data);
      setDhcpStatus(statusResponse.data);
      setLastUpdate(new Date());
      setError('');
    } catch (error) {
      setError('Failed to fetch DHCP data');
      console.error('Error fetching DHCP data:', error);
    } finally {
      setLoading(false);
    }
  };

  const restartDhcpServer = async () => {
    try {
      const response = await axios.post('/dhcp/restart');
      if (response.data.success) {
        alert('DHCP server restarted successfully');
        fetchData(); // Refresh data
      } else {
        alert(`Failed to restart DHCP server: ${response.data.message}`);
      }
    } catch (error) {
      alert('Error restarting DHCP server');
      console.error('Error restarting DHCP server:', error);
    }
  };

  const getStatusIcon = (client) => {
    if (client.online) {
      return <CheckCircle size={16} className="text-green-600" />;
    } else if (client.status === 'active') {
      return <Clock size={16} className="text-yellow-600" />;
    } else {
      return <AlertCircle size={16} className="text-red-600" />;
    }
  };

  const getStatusText = (client) => {
    if (client.online) {
      return 'Online';
    } else if (client.status === 'active') {
      return 'Lease Active';
    } else {
      return 'Offline';
    }
  };

  const getStatusClass = (client) => {
    if (client.online) {
      return 'status-online';
    } else if (client.status === 'active') {
      return 'status-warning';
    } else {
      return 'status-offline';
    }
  };

  if (loading && Object.keys(clients).length === 0) {
    return (
      <div className="connected-clients">
        <div className="loading-container">
          <RefreshCw size={32} className="animate-spin text-blue-600" />
          <p>Loading DHCP clients...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="connected-clients">
        <div className="error-container">
          <AlertCircle size={32} className="text-red-600" />
          <p className="error-message">{error}</p>
          <button onClick={fetchData} className="btn btn-primary">
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="connected-clients">
      <div className="clients-header">
        <h2 className="section-title">Connected Clients</h2>
        <div className="header-actions">
          <button 
            onClick={fetchData} 
            className="btn btn-secondary"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button 
            onClick={restartDhcpServer} 
            className="btn btn-warning"
            title="Restart DHCP Server"
          >
            <Server size={16} />
            Restart DHCP
          </button>
        </div>
      </div>

      {/* DHCP Server Status */}
      <div className="dhcp-status-section">
        <div className="card">
          <h3 className="card-title">
            <Server size={20} />
            DHCP Server Status
          </h3>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Status:</span>
              <span className={`status-badge ${dhcpStatus.running ? 'status-online' : 'status-offline'}`}>
                {dhcpStatus.running ? 'Running' : 'Stopped'}
              </span>
            </div>
            <div className="status-item">
              <span className="status-label">Interface:</span>
              <span className="status-value">{dhcpStatus.interface || 'N/A'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Subnet:</span>
              <span className="status-value">{dhcpStatus.subnet || 'N/A'}</span>
            </div>
            <div className="status-item">
              <span className="status-label">IP Range:</span>
              <span className="status-value">{dhcpStatus.range || 'N/A'}</span>
            </div>
            {dhcpStatus.uptime && (
              <div className="status-item">
                <span className="status-label">Uptime:</span>
                <span className="status-value">{dhcpStatus.uptime}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client Statistics */}
      <div className="client-stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={24} className="text-blue-600" />
            </div>
            <div className="stat-info">
              <h4 className="stat-value">{clients.total_clients || 0}</h4>
              <p className="stat-label">Total Clients</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Activity size={24} className="text-green-600" />
            </div>
            <div className="stat-info">
              <h4 className="stat-value">{clients.active_clients || 0}</h4>
              <p className="stat-label">Active Leases</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Wifi size={24} className="text-purple-600" />
            </div>
            <div className="stat-info">
              <h4 className="stat-value">{clients.online_clients || 0}</h4>
              <p className="stat-label">Online Now</p>
            </div>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="clients-table-section">
        <div className="card">
          <h3 className="card-title">
            <Monitor size={20} />
            Client Details
          </h3>
          
          {clients.clients && Object.keys(clients.clients).length > 0 ? (
            <div className="clients-table-container">
              <table className="clients-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Hostname</th>
                    <th>IP Address</th>
                    <th>MAC Address</th>
                    <th>Lease Time</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(clients.clients).map(([ip, client]) => (
                    <tr key={ip} className={`client-row ${getStatusClass(client)}`}>
                      <td className="status-cell">
                        <div className="status-indicator">
                          {getStatusIcon(client)}
                          <span className="status-text">{getStatusText(client)}</span>
                        </div>
                      </td>
                      <td className="hostname-cell">
                        <div className="hostname-info">
                          <span className="hostname">{client.hostname || 'Unknown'}</span>
                          {client.online && (
                            <span className="online-indicator">
                              <Wifi size={12} className="text-green-500" />
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="ip-cell">
                        <span className="ip-address">{client.ip}</span>
                      </td>
                      <td className="mac-cell">
                        <span className="mac-address">{client.mac || 'N/A'}</span>
                      </td>
                      <td className="lease-cell">
                        <div className="lease-info">
                          <span className="lease-time">{client.lease_remaining_human}</span>
                          {client.status === 'active' && (
                            <span className="lease-status">Active</span>
                          )}
                        </div>
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="btn btn-sm btn-secondary"
                          onClick={async () => {
                            try {
                              const response = await axios.post('/ping-test', { host: client.ip, count: 4 });
                              const data = response.data;
                              if (data.success) {
                                alert(`Ping succeeded!\nHost: ${data.host}\nPacket loss: ${data.packet_loss_percent || 0}%\nAvg time: ${data.avg_time_ms ?? '-'} ms`);
                              } else {
                                alert(`Ping failed!\nHost: ${data.host}\nError: ${data.error || 'No response'}`);
                              }
                            } catch (err) {
                              alert('Ping failed: Network or server error');
                            }
                          }}
                          title="Ping this client"
                        >
                          PING
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="no-clients">
              <Users size={48} className="text-gray-400" />
              <p>No DHCP clients found</p>
              <p className="text-sm text-gray-500">
                Connect a device to the network to see it appear here
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Last Update Info */}
      {lastUpdate && (
        <div className="update-info">
          <Clock size={16} />
          <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
};

export default ConnectedClients; 