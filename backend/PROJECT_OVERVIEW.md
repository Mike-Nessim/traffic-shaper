# Traffic Shaper Server - Project Overview

## Project Structure

```
backend/
├── main.py              # Main FastAPI application
├── config.py            # Configuration management
├── utils.py             # Utility functions for network operations
├── requirements.txt     # Python dependencies
├── env.example          # Example environment configuration
├── README.md            # Comprehensive documentation
├── run.sh              # Startup script
├── install.sh          # Installation script
├── test_server.py      # Test suite
└── PROJECT_OVERVIEW.md # This file
```

## Core Components

### 1. Main Application (`main.py`)
- FastAPI-based REST API server
- Traffic shaping control using Linux `tc` commands
- Real-time system monitoring
- CORS enabled for frontend integration

### 2. Configuration (`config.py`)
- Environment-based configuration
- Default values and validation limits
- Security settings

### 3. Utilities (`utils.py`)
- Network interface validation
- System checks and diagnostics
- Traffic control validation
- Network connectivity testing

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/status` | System status and current configuration |
| GET | `/interfaces` | Available network interfaces |
| GET | `/config` | Current traffic shaping configuration |
| POST | `/config` | Update traffic shaping configuration |
| POST | `/reset` | Reset to default configuration |
| GET | `/system-info` | Detailed system information |
| POST | `/ping-test` | Network connectivity test |

## Traffic Shaping Features

### Packet Delay Simulation
- Configurable delay in milliseconds (0-10000ms)
- Uses Linux NetEm (Network Emulation)
- Applied to outgoing interface

### Bandwidth Throttling
- Configurable bandwidth limit (0.1-1000 Mbps)
- Uses Linux HTB (Hierarchical Token Bucket)
- Precise rate limiting

### Inline Operation
- Designed for placement between devices and router
- Automatic IP forwarding when enabled
- Support for two ethernet interfaces

## Configuration Parameters

```json
{
  "enabled": false,           // Enable/disable traffic shaping
  "delay_ms": 0,             // Packet delay in milliseconds
  "bandwidth_mbps": 1000.0,  // Bandwidth limit in Mbps
  "interface_in": "eth0",    // Input interface name
  "interface_out": "eth1"    // Output interface name
}
```

## System Requirements

- **Operating System**: Linux with kernel 2.6+
- **Privileges**: Root access required for traffic control
- **Dependencies**: 
  - Python 3.8+
  - `tc` command (iproute2 package)
  - Network interfaces for inline operation

## Installation Options

### Quick Start
```bash
cd backend
pip install -r requirements.txt
sudo python main.py
```

### Full Installation
```bash
cd backend
sudo ./install.sh
sudo systemctl start traffic-shaper
```

### Development Mode
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

## Testing

Run the test suite to verify functionality:
```bash
cd backend
python test_server.py
```

## Security Considerations

1. **Root Privileges**: Required for traffic control operations
2. **Network Access**: Server controls network traffic flow
3. **CORS Configuration**: Configure allowed origins in production
4. **Firewall**: Consider restricting API access
5. **Logging**: Monitor for unauthorized configuration changes

## Network Setup Example

```
[Client Device] <---> [eth0 | Traffic Shaper | eth1] <---> [Router/Internet]
                           192.168.1.100      192.168.1.1
```

1. Configure eth0 with client-side network settings
2. Configure eth1 with router-side network settings
3. Enable IP forwarding (automatic when traffic shaping is active)
4. Set appropriate routing rules

## Monitoring and Debugging

### View Active Traffic Control Rules
```bash
tc qdisc show
tc -s qdisc show dev eth1
```

### Check Network Interfaces
```bash
ip link show
ip addr show
```

### Monitor System Resources
```bash
# Via API
curl http://localhost:8000/status

# System monitoring
htop
iftop -i eth1
```

## Integration with Frontend

The backend provides a complete REST API for frontend integration:

1. **Status Monitoring**: Real-time system and network status
2. **Configuration Management**: Dynamic traffic shaping control
3. **Interface Discovery**: Automatic detection of available interfaces
4. **Validation**: Input validation and error handling
5. **Testing**: Built-in connectivity testing

## Future Enhancements

Potential areas for expansion:
- Packet loss simulation
- Jitter simulation
- Multiple traffic classes
- Bandwidth scheduling
- Historical statistics
- Web-based configuration UI
- SNMP monitoring support
- Docker containerization 