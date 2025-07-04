# Traffic Shaper Control Panel
# Author: Mike Nessim mikenessim@devonics.com

A professional network traffic shaping and monitoring solution with a modern web interface. This system allows you to control network bandwidth, add latency, and monitor real-time traffic statistics on Linux systems.

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

- **Linux System** (Ubuntu 20.04+ recommended)
- **Root/Sudo Access** (required for traffic control and service management)
- **Python 3.8+**
- **Node.js 16+** and npm
- **Network Interfaces** (minimum 2 for router mode)
- **SystemD** (for auto-start services)

### Required System Packages
```bash
sudo apt update
sudo apt install -y python3 python3-pip python3-venv nodejs npm
sudo apt install -y iproute2 dnsmasq iptables-persistent
```

## 🛠️ Installation

### 1. Clone the Repository
```bash
git clone https://github.com/Mike-Nessim/traffic-shaper.git
cd traffic-shaper
```

### 2. Backend Setup
```bash
cd backend
chmod +x install.sh
./install.sh
```

Or manually:
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Frontend Setup
```bash
cd ../ui
npm install
```

### 4. Configuration
```bash
cd ../backend
cp env.example .env
# Edit .env with your network configuration
```

### 5. Set Up Auto-Start Services (Recommended)
```bash
# Make service management script executable
chmod +x manage-services.sh

# Install and enable auto-start services
./manage-services.sh enable

# Start services
./manage-services.sh start
```

## 🚀 Quick Start

### Option A: Using Auto-Start Services (Recommended)

```bash
# Start both services
./manage-services.sh start

# Check status
./manage-services.sh status

# Test services
./manage-services.sh test
```

Services will be available at:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000

### Option B: Manual Start

#### 1. Start the Backend (requires root)
```bash
cd backend
source venv/bin/activate
sudo python main.py
```

#### 2. Start the Frontend
```bash
cd ui
npm start
```

### 3. Access the Dashboard
1. Open `http://localhost:3000` in your browser
2. Login with default credentials (admin/admin)
3. Configure your network interfaces
4. Start shaping traffic!

## ⚙️ Service Management

### Quick Service Commands
```bash
./manage-services.sh start     # Start both services
./manage-services.sh stop      # Stop both services  
./manage-services.sh restart   # Restart both services
./manage-services.sh status    # Show service status
./manage-services.sh test      # Test if services respond
./manage-services.sh logs      # View service logs
./manage-services.sh enable    # Enable auto-start on boot
./manage-services.sh disable   # Disable auto-start
```

### Manual SystemD Commands
```bash
# Backend service
sudo systemctl start traffic-shaper-backend.service
sudo systemctl stop traffic-shaper-backend.service
sudo systemctl status traffic-shaper-backend.service
sudo systemctl enable traffic-shaper-backend.service

# Frontend service
sudo systemctl start traffic-shaper-frontend.service
sudo systemctl stop traffic-shaper-frontend.service
sudo systemctl status traffic-shaper-frontend.service
sudo systemctl enable traffic-shaper-frontend.service

# View logs
sudo journalctl -u traffic-shaper-backend.service -f
sudo journalctl -u traffic-shaper-frontend.service -f
```

### Auto-Start Features
- ✅ **Boot Integration**: Services start automatically after system boot
- ✅ **Crash Recovery**: Services restart automatically if they fail
- ✅ **Dependency Management**: Frontend waits for backend to be ready
- ✅ **Logging**: Full systemd journal integration
- ✅ **Security**: Proper user permissions and capabilities

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

### Network Interfaces
The system requires two network interfaces:
- **Input Interface**: Connected to test devices (e.g., `enp1s0`)
- **Output Interface**: Connected to internet/router (e.g., `enp3s0`)

### Environment Variables
Create `.env` file in backend directory:
```bash
# Network Configuration
INPUT_INTERFACE=enp1s0
OUTPUT_INTERFACE=enp3s0
DHCP_RANGE_START=192.168.100.10
DHCP_RANGE_END=192.168.100.100
GATEWAY_IP=192.168.100.1

# Security
SECRET_KEY=your-secret-key-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your-secure-password
```

### Traffic Control Parameters
- **Bandwidth**: 0.1 - 1000 Mbps
- **Latency**: 0 - 10000 ms
- **Interfaces**: Any valid Linux network interface

### Service Configuration
The system includes pre-configured systemd service files:
- `backend/traffic-shaper-backend.service` - Backend API service
- `ui/traffic-shaper-frontend.service` - Frontend React service
- `backend/start-backend.sh` - Backend startup script
- `ui/start-frontend.sh` - Frontend startup script

## 🔍 API Documentation

### Backend Endpoints
- `GET /status` - System status and interfaces
- `GET /config` - Current traffic shaping configuration
- `POST /config` - Update traffic shaping settings
- `GET /interfaces` - Network interface information
- `GET /traffic` - Real-time traffic statistics
- `GET /dhcp/clients` - Connected DHCP clients
- `POST /ping` - Network connectivity test
- `GET /api` - API root endpoint

### Frontend Routes
- `/` - Main dashboard
- `/login` - Authentication page
- Tabs: Controls, Status, Interfaces, Clients, Monitoring

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

### Common Issues

**Services not starting:**
- Check service status: `./manage-services.sh status`
- View logs: `./manage-services.sh logs`
- Verify permissions: `sudo chmod -R 755 /home/devonics/traffic-shapper/`
- Restart services: `./manage-services.sh restart`

**Traffic shaping not working:**
- Ensure running as root/sudo
- Check network interface names
- Verify tc (traffic control) is installed
- Check iptables rules and IP forwarding

**DHCP not assigning IPs:**
- Verify dnsmasq configuration
- Check interface IP configuration
- Ensure no conflicts with existing DHCP servers

**Frontend can't connect to backend:**
- Verify backend is running: `curl http://localhost:8000/api`
- Check firewall settings
- Ensure correct proxy configuration

**Permission errors:**
- Run backend with sudo or use systemd service
- Check file permissions
- Verify user is in appropriate groups

### Debug Commands
```bash
# Check traffic control rules
sudo tc qdisc show
sudo tc class show dev enp3s0
sudo tc filter show dev enp3s0

# Check network interfaces
ip addr show
ip route show

# Check DHCP leases
sudo cat /var/lib/dhcp/dhcpd.leases

# Check system logs
journalctl -f

# Service-specific logs
sudo journalctl -u traffic-shaper-backend.service -f
sudo journalctl -u traffic-shaper-frontend.service -f
```

### Service Management
```bash
# Check if services are enabled for auto-start
sudo systemctl is-enabled traffic-shaper-backend.service
sudo systemctl is-enabled traffic-shaper-frontend.service

# View service dependencies
sudo systemctl list-dependencies traffic-shaper-frontend.service

# Reset failed services
sudo systemctl reset-failed
```

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

1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open Pull Request**

### Development Guidelines
- Follow PEP 8 for Python code
- Use ESLint for JavaScript code
- Add tests for new features
- Update documentation
- Ensure backward compatibility
- Test service integration

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


