# Traffic Shaper Control Panel
**Author: Mike Nessim mikenessim@devonics.com**

A professional network traffic shaping and monitoring solution with a modern web interface. Control bandwidth, add latency, and monitor traffic in real-time with an intuitive dashboard. Features automatic network configuration, DHCP server, and one-command installation.

![Traffic Shaper Dashboard](https://img.shields.io/badge/Status-Production%20Ready-green)
![Python](https://img.shields.io/badge/Python-3.8+-blue)
![React](https://img.shields.io/badge/React-18+-blue)
![SystemD](https://img.shields.io/badge/SystemD-Auto--Start-orange)
![License](https://img.shields.io/badge/License-MIT-green)

## 🚀 Features

### Traffic Shaping
- **Bandwidth Limiting**: Set download and upload speed limits (Mbps)
- **Latency Simulation**: Add network delay (milliseconds)
- **Bidirectional Control**: Shape both upload and download traffic
- **Real-time Application**: Changes take effect immediately
- **Interface Selection**: Choose specific network interfaces

### Monitoring & Analytics
- **Real-time Traffic Graphs**: Live visualization of network speeds
- **Interface Statistics**: Monitor individual network interface performance
- **Historical Data**: Track network usage over time
- **Speed Metrics**: Current and peak bandwidth utilization
- **Total Transfer Tracking**: Monitor cumulative data usage

### System Management
- **DHCP Server**: Built-in DHCP server with lease management
- **Connected Clients**: View and manage connected devices
- **Network Interfaces**: Monitor interface status and configuration
- **System Resources**: CPU and memory usage monitoring
- **Network Testing**: Built-in ping and connectivity tests

### Auto-Start & Service Management
- **SystemD Integration**: Professional service management
- **Auto-Start on Boot**: Automatically starts after system reboot/power loss
- **Auto-Restart**: Services automatically restart on failure
- **Service Dependencies**: Frontend waits for backend to be ready
- **Easy Management**: Simple commands to control all services
- **Logging Integration**: Full systemd journal logging

### User Interface
- **Modern Web Dashboard**: Responsive React-based interface
- **Real-time Updates**: Live data refresh without page reload
- **Status Indicators**: Visual feedback for system state
- **Mobile Friendly**: Works on desktop, tablet, and mobile devices
- **Professional Design**: Clean, intuitive user experience

## 🏗️ Architecture

### Traffic Flow
```
Client Device (172.22.22.x) → enp3s0 (shaped) → enp1s0 (shaped) → Internet
```

**Components:**
- **Linux TC (Traffic Control)**: HTB for bandwidth limiting, Netem for latency
- **Policy Routing**: Forces all client traffic through traffic shaper
- **DHCP Server**: Auto-assigns IPs and routes clients through shaper
- **NAT/Masquerading**: Provides internet access to shaped clients

## 🏗️ System Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │    │   FastAPI        │    │   Linux TC      │
│   (Frontend)    │◄──►│   (Backend)      │◄──►│   (Traffic      │
│   Port 3000     │    │   Port 8000      │    │   Control)      │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │                          │
                              ▼                          ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   SystemD        │    │   System Tools  │
                       │   Services       │    │   • tc (traffic)│
                       │   • Auto-start   │    │   • dnsmasq     │
                       │   • Auto-restart │    │   • iptables    │
                       │   • Logging      │    │   • /proc/net   │
                       └──────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

- **Ubuntu 18.04+** or **Debian 10+**
- **Root/Sudo Access** (required for installation)
- **2+ Network Interfaces** (recommended for traffic shaping)
- **2GB+ RAM** and **1GB+ free disk space**

*All dependencies are automatically installed by the installer*

## 🚀 Quick Installation

### One-Command Install
```bash
# Download and run the installer
curl -fsSL https://raw.githubusercontent.com/Mike-Nessim/traffic-shaper/main/install.sh | sudo bash
```

### Or Manual Installation
```bash
# Clone the repository
git clone https://github.com/Mike-Nessim/traffic-shaper.git
cd traffic-shaper

# Run the installer
sudo ./install.sh
```

### Installation Complete!
After installation, access your traffic shaper at: **http://172.22.22.1**

The installer automatically:
- ✅ Checks system compatibility
- ✅ Installs all dependencies 
- ✅ Configures network interfaces
- ✅ Sets up DHCP server
- ✅ Creates system services
- ✅ Starts the application

## 🗑️ Uninstall

```bash
sudo ./install.sh --uninstall
```

## 🎯 Getting Started

After installation, the Traffic Shaper is ready to use:

1. **Open your web browser** and go to: **http://172.22.22.1**
2. **Configure traffic limits** in the "Traffic Controls" tab
3. **Monitor real-time traffic** in the "Monitoring" tab  
4. **View connected devices** in the "Connected Clients" tab

### System Architecture
- **Input Interface**: First ethernet port (client connections)
- **Output Interface**: Second ethernet port (internet connection) 
- **DHCP Server**: Automatically serves IPs to connected devices
- **Traffic Shaping**: Controls bandwidth between input ↔ output

## ⚙️ Service Management

### SystemD Commands
```bash
# Check service status
sudo systemctl status traffic-shaper-backend
sudo systemctl status traffic-shaper-frontend

# Restart services
sudo systemctl restart traffic-shaper-backend
sudo systemctl restart traffic-shaper-frontend

# View logs
sudo journalctl -u traffic-shaper-backend -f
sudo journalctl -u traffic-shaper-frontend -f
```

### Auto-Start Features
- ✅ **Auto-start on boot**: Services automatically start after system reboot
- ✅ **Auto-restart on failure**: Services restart if they crash
- ✅ **Dependency management**: Frontend waits for backend to be ready
- ✅ **Professional logging**: Full systemd journal integration

## 📖 Usage Guide

### Traffic Shaping
1. **Navigate to "Traffic Controls" tab**
2. **Set bandwidth limits** (e.g., 10 Mbps for testing)
3. **Add latency** if needed (e.g., 100ms)
4. **Select network interfaces**:
   - Input Interface: Where clients connect
   - Output Interface: Internet-facing interface
5. **Enable traffic shaping**
6. **Test with connected devices**

### Real-time Monitoring
1. **Go to "Monitoring" tab**
2. **View live statistics**:
   - Current download/upload speeds
   - Total data transferred
   - Per-interface statistics
3. **Watch the real-time graph**
4. **Toggle auto-refresh** as needed

### DHCP Management
1. **Check "Connected Clients" tab**
2. **View active DHCP leases**
3. **Monitor client IP assignments**

## 🔧 Configuration

### Automatic Network Setup
The installer automatically configures:
- **Input Interface**: First ethernet interface (for client connections)
- **Output Interface**: Second ethernet interface (172.22.22.1/24)
- **DHCP Server**: Serves IPs 172.22.22.10-100 to connected devices
- **Traffic Shaping**: Controls bandwidth between input ↔ output interfaces

### Manual Configuration (if needed)
Access the web interface to customize:
- **Network Interface IPs**: "Network Interfaces" tab
- **Traffic Limits**: "Traffic Controls" tab
- **DHCP Settings**: Automatically follows output interface subnet

## 🔍 Web Interface

### Dashboard Tabs
- **Traffic Controls**: Set bandwidth limits and latency
- **System Status**: View system resources and interface status  
- **Network Interfaces**: Manage IP addresses and interface configuration
- **Connected Clients**: View DHCP clients and lease information
- **Monitoring**: Real-time traffic graphs and statistics

### API Endpoints
- Backend API available at: **http://172.22.22.1:8000**
- Interactive API docs: **http://172.22.22.1:8000/docs**

## 🛠️ Development

### Backend Development
```bash
cd backend
source venv/bin/activate
# Install development dependencies
pip install pytest black flake8
# Run tests
pytest
# Format code
black .
```

### Frontend Development
```bash
cd ui
# Install development dependencies
npm install --save-dev
# Run development server
npm start
# Build for production
npm run build
```

### Adding Features
1. **Backend**: Add endpoints in `main.py`
2. **Frontend**: Create components in `src/components/`
3. **Styling**: Update `Components.css`
4. **Navigation**: Modify `Dashboard.js`
5. **Services**: Update service files if needed

## 🐛 Troubleshooting

### Quick Diagnostics
```bash
# Check service status
sudo systemctl status traffic-shaper-backend traffic-shaper-frontend

# View recent logs
sudo journalctl -u traffic-shaper-backend --since "5 minutes ago"
sudo journalctl -u traffic-shaper-frontend --since "5 minutes ago"

# Test API connectivity
curl http://172.22.22.1:8000/api
curl http://172.22.22.1
```

### Common Issues

**Can't access web interface:**
- Verify services are running: `sudo systemctl status traffic-shaper-*`
- Check if port 80 is free: `sudo ss -tlnp | grep :80`
- Restart services: `sudo systemctl restart traffic-shaper-*`

**Traffic shaping not working:**
- Ensure network interfaces are properly detected
- Check interface names in "Network Interfaces" tab
- Verify tc (traffic control) is available: `tc --version`

**DHCP not working:**
- Check dnsmasq status: `sudo systemctl status dnsmasq`
- Verify output interface IP: `ip addr show`
- Check DHCP leases: `sudo cat /var/lib/dhcp/dnsmasq.leases`

**Installation issues:**
- Re-run installer: `sudo ./install.sh`
- Check installation log: `sudo cat /var/log/traffic-shaper-install.log`
- Ensure running on supported OS: Ubuntu 18.04+ or Debian 10+

## 🔒 Security Considerations

- **Run with minimal privileges** where possible
- **Change default passwords** immediately
- **Use HTTPS** in production (configure reverse proxy)
- **Restrict network access** to management interface
- **Regular security updates** for system packages
- **Monitor logs** for suspicious activity
- **Service isolation** with systemd security features

## 📊 Performance

### System Requirements
- **CPU**: 2+ cores recommended
- **RAM**: 2GB+ available
- **Storage**: 1GB+ free space
- **Network**: Gigabit interfaces recommended

### Scaling
- Supports up to 1000 Mbps traffic shaping
- Handles 100+ concurrent DHCP clients
- Real-time monitoring with minimal overhead
- Efficient traffic control with Linux TC
- Auto-restart ensures high availability

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`  
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Linux Traffic Control (tc)** - Core traffic shaping functionality
- **FastAPI** - Modern Python web framework
- **React** - Frontend user interface
- **SystemD** - Service management and auto-start
- **dnsmasq** - DHCP server implementation
- **Lucide React** - Beautiful icons

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/Mike-Nessim/traffic-shaper/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Mike-Nessim/traffic-shaper/discussions)

## 🗺️ Roadmap

- [ ] Advanced QoS with priority queues
- [ ] Time-based bandwidth scheduling  
- [ ] User authentication and management
- [ ] Docker containerization
- [ ] HTTPS/SSL support
- [ ] Configuration backup/restore
- [ ] Mobile app interface

---

**Made with ❤️ for network engineers and system administrators**

