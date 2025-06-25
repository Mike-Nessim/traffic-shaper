import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Settings, 
  Activity, 
  Wifi, 
  WifiOff, 
  LogOut, 
  RefreshCw,
  Clock,
  Gauge,
  Server,
  AlertCircle,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Users,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import TrafficControls from './TrafficControls';
import SystemStatus from './SystemStatus';
import NetworkInterfaces from './NetworkInterfaces';
import ConnectedClients from './ConnectedClients';
import Monitoring from './Monitoring';
import './Dashboard.css';

const Dashboard = () => {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('controls');
  const [serverStatus, setServerStatus] = useState('checking');
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Check server connectivity
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('/api');
        if (response.ok) {
          setServerStatus('online');
        } else {
          setServerStatus('error');
        }
      } catch (error) {
        setServerStatus('offline');
      }
    };

    checkServerStatus();
    const interval = setInterval(checkServerStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setLastUpdate(new Date());
    window.location.reload();
  };

  const getStatusIcon = () => {
    switch (serverStatus) {
      case 'online':
        return <CheckCircle size={16} className="text-green-600" />;
      case 'offline':
        return <AlertCircle size={16} className="text-red-600" />;
      case 'error':
        return <AlertCircle size={16} className="text-yellow-600" />;
      default:
        return <RefreshCw size={16} className="animate-spin text-blue-600" />;
    }
  };

  const getStatusText = () => {
    switch (serverStatus) {
      case 'online':
        return 'Server Online';
      case 'offline':
        return 'Server Offline';
      case 'error':
        return 'Server Error';
      default:
        return 'Checking...';
    }
  };

  const tabs = [
    { id: 'controls', label: 'Traffic Controls', icon: Settings },
    { id: 'status', label: 'System Status', icon: Activity },
    { id: 'interfaces', label: 'Network Interfaces', icon: Network },
    { id: 'clients', label: 'Connected Clients', icon: Users },
    { id: 'monitoring', label: 'Monitoring', icon: BarChart3 }
  ];

  return (
    <div className="dashboard-container animate-fadeIn">
      <div className="dashboard-wrapper">
        {/* Header */}
        <header className="dashboard-header">
          <div className="header-left">
            <div className="logo-section">
              <Network size={32} className="logo-icon" />
              <div>
                <h1 className="dashboard-title">Traffic Shaper</h1>
                <p className="dashboard-subtitle">Network Control Panel</p>
              </div>
            </div>
          </div>
          
          <div className="header-right">
            <div className="server-status">
              {getStatusIcon()}
              <span className="status-text">{getStatusText()}</span>
            </div>
            
            <button 
              onClick={handleRefresh}
              className="btn btn-secondary"
              title="Refresh Dashboard"
            >
              <RefreshCw size={16} />
            </button>
            
            <button 
              onClick={logout}
              className="btn btn-danger"
              title="Sign Out"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </header>

        {/* Navigation Tabs */}
        <nav className="dashboard-nav">
          <div className="nav-tabs">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <IconComponent size={18} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          
          <div className="last-update">
            <Clock size={14} />
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
        </nav>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="content-container">
            {activeTab === 'controls' && <TrafficControls />}
            {activeTab === 'status' && <SystemStatus />}
            {activeTab === 'interfaces' && <NetworkInterfaces />}
            {activeTab === 'clients' && <ConnectedClients />}
            {activeTab === 'monitoring' && <Monitoring />}
          </div>
        </main>

        {/* Footer */}
        <footer className="dashboard-footer">
          <div className="footer-content">
            <p>&copy; 2024 Traffic Shaper Control Panel. Professional network management solution.</p>
            <div className="footer-links">
              <span>Backend: {serverStatus === 'online' ? '✓' : '✗'}</span>
              <span>Version: 1.0.0</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Dashboard; 