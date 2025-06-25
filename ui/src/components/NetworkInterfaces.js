import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Info,
  AlertCircle,
  CheckCircle,
  Settings,
  Activity
} from 'lucide-react';
import axios from 'axios';
import './Components.css';

const NetworkInterfaces = () => {
  const [interfaces, setInterfaces] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInterface, setSelectedInterface] = useState(null);

  useEffect(() => {
    fetchInterfaces();
    const interval = setInterval(fetchInterfaces, 15000); // Update every 15 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchInterfaces = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/interfaces');
      setInterfaces(response.data);
      setError('');
    } catch (error) {
      setError('Failed to fetch network interfaces');
    } finally {
      setLoading(false);
    }
  };

  const getInterfaceIcon = (isUp) => {
    return isUp ? (
      <Wifi size={20} className="text-green-600" />
    ) : (
      <WifiOff size={20} className="text-red-600" />
    );
  };

  const formatMacAddress = (mac) => {
    if (!mac) return 'N/A';
    return mac.toUpperCase();
  };

  const getInterfaceType = (name) => {
    if (name.startsWith('eth')) return 'Ethernet';
    if (name.startsWith('wlan') || name.startsWith('wifi')) return 'WiFi';
    if (name.startsWith('lo')) return 'Loopback';
    if (name.startsWith('docker')) return 'Docker';
    if (name.startsWith('br')) return 'Bridge';
    return 'Unknown';
  };

  if (loading && Object.keys(interfaces).length === 0) {
    return (
      <div className="network-interfaces">
        <div className="loading-container">
          <RefreshCw size={32} className="animate-spin text-blue-600" />
          <p>Loading network interfaces...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="network-interfaces">
        <div className="error-container">
          <AlertCircle size={32} className="text-red-600" />
          <p className="error-message">{error}</p>
          <button onClick={fetchInterfaces} className="btn btn-primary">
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="network-interfaces">
      <div className="interfaces-header">
        <h2 className="section-title">Network Interfaces</h2>
        <button 
          onClick={fetchInterfaces} 
          className="btn btn-secondary"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="interfaces-layout">
        {/* Interface List */}
        <div className="interfaces-list">
          <div className="card">
            <h3 className="card-title">
              <Network size={20} />
              Available Interfaces ({Object.keys(interfaces).length})
            </h3>
            
            <div className="interface-grid">
              {Object.entries(interfaces).map(([name, iface]) => (
                <div 
                  key={name}
                  className={`interface-card ${selectedInterface === name ? 'selected' : ''}`}
                  onClick={() => setSelectedInterface(selectedInterface === name ? null : name)}
                >
                  <div className="interface-header">
                    <div className="interface-icon">
                      {getInterfaceIcon(iface.stats?.is_up)}
                    </div>
                    <div className="interface-info">
                      <h4 className="interface-name">{name}</h4>
                      <p className="interface-type">{getInterfaceType(name)}</p>
                    </div>
                    <div className="interface-status">
                      <span className={`status-badge ${iface.stats?.is_up ? 'status-online' : 'status-offline'}`}>
                        {iface.stats?.is_up ? 'UP' : 'DOWN'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="interface-summary">
                    <div className="summary-item">
                      <span className="summary-label">Speed:</span>
                      <span className="summary-value">
                        {iface.stats?.speed ? `${iface.stats.speed} Mbps` : 'Unknown'}
                      </span>
                    </div>
                    <div className="summary-item">
                      <span className="summary-label">MTU:</span>
                      <span className="summary-value">
                        {iface.stats?.mtu || 'Unknown'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Interface Details */}
        {selectedInterface && interfaces[selectedInterface] && (
          <div className="interface-details">
            <div className="card">
              <h3 className="card-title">
                <Info size={20} />
                Interface Details: {selectedInterface}
              </h3>
              
              <div className="details-content">
                <div className="detail-section">
                  <h4 className="detail-section-title">
                    <Settings size={16} />
                    Basic Information
                  </h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Interface Name:</span>
                      <span className="detail-value">{selectedInterface}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Type:</span>
                      <span className="detail-value">{getInterfaceType(selectedInterface)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Status:</span>
                      <span className={`detail-value ${interfaces[selectedInterface].stats?.is_up ? 'text-green-600' : 'text-red-600'}`}>
                        {interfaces[selectedInterface].stats?.is_up ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">MAC Address:</span>
                      <span className="detail-value code">
                        {formatMacAddress(interfaces[selectedInterface].addresses?.['17']?.[0]?.addr)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h4 className="detail-section-title">
                    <Activity size={16} />
                    Network Configuration
                  </h4>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Speed:</span>
                      <span className="detail-value">
                        {interfaces[selectedInterface].stats?.speed ? 
                          `${interfaces[selectedInterface].stats.speed} Mbps` : 
                          'Not available'
                        }
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">MTU:</span>
                      <span className="detail-value">
                        {interfaces[selectedInterface].stats?.mtu || 'Not available'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* IP Addresses */}
                {interfaces[selectedInterface].addresses && (
                  <div className="detail-section">
                    <h4 className="detail-section-title">
                      <Network size={16} />
                      IP Addresses
                    </h4>
                    <div className="address-list">
                      {Object.entries(interfaces[selectedInterface].addresses).map(([family, addrs]) => (
                        <div key={family} className="address-family">
                          <h5 className="address-family-title">
                            {family === '2' ? 'IPv4' : family === '10' ? 'IPv6' : family === '17' ? 'MAC' : `Family ${family}`}
                          </h5>
                          {Array.isArray(addrs) ? addrs.map((addr, index) => (
                            <div key={index} className="address-item">
                              <span className="address-value code">{addr.addr}</span>
                              {addr.netmask && (
                                <span className="address-netmask">/{addr.netmask}</span>
                              )}
                            </div>
                          )) : (
                            <div className="address-item">
                              <span className="address-value code">{addrs.addr}</span>
                              {addrs.netmask && (
                                <span className="address-netmask">/{addrs.netmask}</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkInterfaces; 