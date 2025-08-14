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
  Activity,
  Edit3,
  Save,
  X,
  Globe
} from 'lucide-react';
import axios from 'axios';
import './Components.css';
import './NetworkInterfaces.css';

const NetworkInterfaces = () => {
  const [interfaces, setInterfaces] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedInterface, setSelectedInterface] = useState(null);
  const [networkInterfaces, setNetworkInterfaces] = useState({});
  const [editingInterface, setEditingInterface] = useState(null);
  const [ipForm, setIpForm] = useState({
    ip_address: '',
    netmask: '255.255.255.0',
    gateway: ''
  });
  const [configuring, setConfiguring] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  useEffect(() => {
    fetchInterfaces();
    fetchNetworkInterfaces();
    const interval = setInterval(() => {
      fetchInterfaces();
      fetchNetworkInterfaces();
    }, 15000);
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

  const fetchNetworkInterfaces = async () => {
    try {
      const response = await axios.get('/api/network/interfaces');
      setNetworkInterfaces(response.data.interfaces);
      // Store input/output interface info for UI logic
      window.ethernetInterfaces = {
        input: response.data.input_interface,
        output: response.data.output_interface
      };
    } catch (error) {
      console.warn('Could not fetch detailed network interface data');
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

  const handleEditIP = (interfaceName) => {
    const netInterface = networkInterfaces[interfaceName];
    setEditingInterface(interfaceName);
    setIpForm({
      ip_address: netInterface?.ip_address || '',
      netmask: '255.255.255.0',
      gateway: ''
    });
  };

  const handleSaveIP = async () => {
    if (!editingInterface) return;
    
    setConfiguring(true);
    try {
      const config = {
        interface: editingInterface,
        ip_address: ipForm.ip_address,
        netmask: ipForm.netmask,
        gateway: ipForm.gateway || undefined
      };
      
      const response = await axios.post('/api/network/static-ip', config);
      showMessage(response.data.message, 'success');
      setEditingInterface(null);
      
      // Refresh data
      setTimeout(() => {
        fetchInterfaces();
        fetchNetworkInterfaces();
      }, 2000);
      
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to configure IP address';
      showMessage(errorMsg, 'error');
    } finally {
      setConfiguring(false);
    }
  };

  const handleRemoveStaticIP = async (interfaceName) => {
    setConfiguring(true);
    try {
      const response = await axios.delete(`/api/network/static-ip/${interfaceName}`);
      showMessage(response.data.message, 'success');
      
      // Refresh data
      setTimeout(() => {
        fetchInterfaces();
        fetchNetworkInterfaces();
      }, 2000);
      
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Failed to remove static IP configuration';
      showMessage(errorMsg, 'error');
    } finally {
      setConfiguring(false);
    }
  };

  const cancelEdit = () => {
    setEditingInterface(null);
    setIpForm({ ip_address: '', netmask: '255.255.255.0', gateway: '' });
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
          onClick={() => {
            fetchInterfaces();
            fetchNetworkInterfaces();
          }} 
          className="btn btn-secondary"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {message && (
        <div className={`alert ${messageType === 'error' ? 'alert-error' : 'alert-success'} animate-slideIn`}>
          {messageType === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {message}
        </div>
      )}

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

                {/* IP Configuration Section */}
                <div className="detail-section">
                  <div className="detail-section-header">
                    <h4 className="detail-section-title">
                      <Globe size={16} />
                      IP Configuration
                    </h4>
                    {networkInterfaces[selectedInterface] && (
                      <div className="detail-section-actions">
                        {editingInterface === selectedInterface ? (
                          <div className="edit-actions">
                            <button
                              onClick={handleSaveIP}
                              disabled={configuring || !ipForm.ip_address}
                              className="btn btn-primary btn-sm"
                            >
                              <Save size={14} />
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={configuring}
                              className="btn btn-secondary btn-sm"
                            >
                              <X size={14} />
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEditIP(selectedInterface)}
                            disabled={configuring}
                            className="btn btn-secondary btn-sm"
                          >
                            <Edit3 size={14} />
                            Edit IP
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {editingInterface === selectedInterface ? (
                    <div className="ip-edit-form">
                      <div className="form-group">
                        <label className="form-label">IP Address</label>
                        <input
                          type="text"
                          value={ipForm.ip_address}
                          onChange={(e) => setIpForm({...ipForm, ip_address: e.target.value})}
                          className="form-input"
                          placeholder="192.168.1.100"
                          disabled={configuring}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Subnet Mask</label>
                        <input
                          type="text"
                          value={ipForm.netmask}
                          onChange={(e) => setIpForm({...ipForm, netmask: e.target.value})}
                          className="form-input"
                          placeholder="255.255.255.0"
                          disabled={configuring}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Gateway (Optional)</label>
                        <input
                          type="text"
                          value={ipForm.gateway}
                          onChange={(e) => setIpForm({...ipForm, gateway: e.target.value})}
                          className="form-input"
                          placeholder="192.168.1.1"
                          disabled={configuring}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="detail-grid">
                      {networkInterfaces[selectedInterface] ? (
                        <>
                          <div className="detail-item">
                            <span className="detail-label">IP Address:</span>
                            <span className="detail-value">
                              {networkInterfaces[selectedInterface].ip_address || 'Not configured'}
                            </span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label">Status:</span>
                            <span className={`detail-value ${networkInterfaces[selectedInterface].has_static_config ? 'text-blue-600' : 'text-gray-600'}`}>
                              {networkInterfaces[selectedInterface].has_static_config ? 'Static IP' : 'DHCP/Auto'}
                            </span>
                          </div>
                          {networkInterfaces[selectedInterface].has_static_config && 
                           window.ethernetInterfaces && 
                           selectedInterface === window.ethernetInterfaces.input && (
                            <div className="detail-item" style={{gridColumn: '1 / -1'}}>
                              <button
                                onClick={() => handleRemoveStaticIP(selectedInterface)}
                                disabled={configuring}
                                className="btn btn-warning btn-sm"
                              >
                                Switch to DHCP
                              </button>
                            </div>
                          )}
                          {window.ethernetInterfaces && 
                           selectedInterface === window.ethernetInterfaces.output && (
                            <div className="detail-item" style={{gridColumn: '1 / -1', fontSize: '0.9em', color: '#666'}}>
                              <Info size={16} style={{marginRight: '8px'}} />
                              Output interface is always configured with static IP for traffic shaping and DHCP server.
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="detail-item">
                          <span className="detail-label">Loading...</span>
                        </div>
                      )}
                    </div>
                  )}
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