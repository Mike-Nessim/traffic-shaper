import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  TrendingUp, 
  Download, 
  Upload, 
  RefreshCw,
  BarChart3,
  Gauge,
  Clock,
  Wifi,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import './Components.css';

const Monitoring = () => {
  const [trafficData, setTrafficData] = useState({
    interfaces: {},
    totalDownload: 0,
    totalUpload: 0,
    currentDownloadSpeed: 0,
    currentUploadSpeed: 0
  });
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchTrafficData();
    
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchTrafficData, 2000); // Update every 2 seconds
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh]);

  useEffect(() => {
    if (historicalData.length > 0) {
      drawGraph();
    }
  }, [historicalData]);

  const fetchTrafficData = async () => {
    try {
      const response = await axios.get('/traffic');
      const data = response.data;
      
      // Calculate total bytes transferred
      let totalRx = 0;
      let totalTx = 0;
      
      Object.entries(data.interfaces).forEach(([name, iface]) => {
        if (name !== 'lo') { // Exclude loopback interface
          totalRx += iface.rx_bytes_total || 0;
          totalTx += iface.tx_bytes_total || 0;
        }
      });

      const newData = {
        interfaces: data.interface_info,
        totalDownload: totalRx,
        totalUpload: totalTx,
        currentDownloadSpeed: data.total_download_speed || 0,
        currentUploadSpeed: data.total_upload_speed || 0,
        timestamp: new Date(),
        interfaceTraffic: data.interfaces
      };

      setTrafficData(newData);
      
      // Add to historical data (keep last 30 data points)
      setHistoricalData(prev => {
        const updated = [...prev, {
          timestamp: new Date(),
          download: data.total_download_speed || 0,
          upload: data.total_upload_speed || 0
        }];
        return updated.slice(-30); // Keep last 30 points
      });

      setError('');
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch traffic data');
      setLoading(false);
    }
  };

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas || historicalData.length === 0) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set up graph parameters
    const padding = 40;
    const graphWidth = width - 2 * padding;
    const graphHeight = height - 2 * padding;
    const maxSpeed = Math.max(
      Math.max(...historicalData.map(d => d.download)),
      Math.max(...historicalData.map(d => d.upload)),
      10 // Minimum scale
    );

    // Draw grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (i * graphHeight / 5);
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
      
      // Y-axis labels
      ctx.fillStyle = '#64748b';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${(maxSpeed * (5 - i) / 5).toFixed(1)} Mbps`, padding - 10, y + 4);
    }

    // Vertical grid lines
    const timeStep = Math.max(1, Math.floor(historicalData.length / 6));
    for (let i = 0; i < historicalData.length; i += timeStep) {
      const x = padding + (i * graphWidth / (historicalData.length - 1));
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - padding);
      ctx.stroke();
    }

    // Draw download line (green)
    if (historicalData.length > 1) {
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      historicalData.forEach((point, index) => {
        const x = padding + (index * graphWidth / (historicalData.length - 1));
        const y = padding + graphHeight - (point.download / maxSpeed * graphHeight);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // Draw upload line (blue)
    if (historicalData.length > 1) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      historicalData.forEach((point, index) => {
        const x = padding + (index * graphWidth / (historicalData.length - 1));
        const y = padding + graphHeight - (point.upload / maxSpeed * graphHeight);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // Draw axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (speed) => {
    return `${speed.toFixed(1)} Mbps`;
  };

  if (loading && historicalData.length === 0) {
    return (
      <div className="monitoring">
        <div className="loading-container">
          <RefreshCw size={32} className="animate-spin text-blue-600" />
          <p>Loading traffic monitoring...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="monitoring">
      <div className="monitoring-header">
        <h2 className="section-title">Traffic Monitoring</h2>
        <div className="header-actions">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn ${autoRefresh ? 'btn-success' : 'btn-secondary'}`}
          >
            <Activity size={16} />
            {autoRefresh ? 'Auto Refresh ON' : 'Auto Refresh OFF'}
          </button>
          <button onClick={fetchTrafficData} className="btn btn-primary">
            <RefreshCw size={16} />
            Refresh Now
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Current Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <Download size={24} className="text-green-600" />
          </div>
          <div className="stat-info">
            <h4 className="stat-value">{formatSpeed(trafficData.currentDownloadSpeed)}</h4>
            <p className="stat-label">Download Speed</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <Upload size={24} className="text-blue-600" />
          </div>
          <div className="stat-info">
            <h4 className="stat-value">{formatSpeed(trafficData.currentUploadSpeed)}</h4>
            <p className="stat-label">Upload Speed</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <TrendingUp size={24} className="text-purple-600" />
          </div>
          <div className="stat-info">
            <h4 className="stat-value">{formatBytes(trafficData.totalDownload)}</h4>
            <p className="stat-label">Total Downloaded</p>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon">
            <BarChart3 size={24} className="text-orange-600" />
          </div>
          <div className="stat-info">
            <h4 className="stat-value">{formatBytes(trafficData.totalUpload)}</h4>
            <p className="stat-label">Total Uploaded</p>
          </div>
        </div>
      </div>

      {/* Real-time Graph */}
      <div className="card graph-card">
        <h3 className="card-title">
          <Gauge size={20} />
          Real-time Speed Graph
        </h3>
        
        <div className="graph-container">
          <div className="graph-legend">
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#10b981'}}></div>
              <span>Download</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{backgroundColor: '#3b82f6'}}></div>
              <span>Upload</span>
            </div>
          </div>
          
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={400}
            className="traffic-graph"
          />
        </div>
      </div>

      {/* Interface Details */}
      <div className="card interfaces-card">
        <h3 className="card-title">
          <Wifi size={20} />
          Interface Statistics
        </h3>
        
        <div className="interfaces-table">
          <table>
            <thead>
              <tr>
                <th>Interface</th>
                <th>Status</th>
                <th>IP Address</th>
                <th>Download Speed</th>
                <th>Upload Speed</th>
                <th>Total RX</th>
                <th>Total TX</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(trafficData.interfaces).map(([name, iface]) => {
                const traffic = trafficData.interfaceTraffic?.[name];
                return (
                  <tr key={name}>
                    <td className="interface-name">{name}</td>
                    <td>
                      <span className={`status-badge ${iface.is_up ? 'status-online' : 'status-offline'}`}>
                        {iface.is_up ? 'UP' : 'DOWN'}
                      </span>
                    </td>
                    <td>{iface.ip_address || 'N/A'}</td>
                    <td>{traffic ? `${traffic.rx_mbps.toFixed(2)} Mbps` : '0.00 Mbps'}</td>
                    <td>{traffic ? `${traffic.tx_mbps.toFixed(2)} Mbps` : '0.00 Mbps'}</td>
                    <td>{traffic ? formatBytes(traffic.rx_bytes_total) : '0 B'}</td>
                    <td>{traffic ? formatBytes(traffic.tx_bytes_total) : '0 B'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="update-info">
        <Clock size={14} />
        Last updated: {trafficData.timestamp ? trafficData.timestamp.toLocaleTimeString() : 'Never'}
        {autoRefresh && <span> • Auto-refreshing every 2 seconds</span>}
      </div>
    </div>
  );
};

export default Monitoring; 