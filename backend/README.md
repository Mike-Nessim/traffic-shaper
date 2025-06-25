# Traffic Shaper Server

A Python-based traffic shaping server that acts as an inline network device to simulate packet delay and bandwidth throttling between network interfaces.

## Features

- **Inline Traffic Shaping**: Place the server between devices and router
- **Packet Delay Simulation**: Add configurable delay to packets (in milliseconds)
- **Bandwidth Throttling**: Limit network speed to simulate slow connections
- **RESTful API**: Control via HTTP API for easy integration with web frontend
- **Real-time Monitoring**: Monitor network interfaces and system resources
- **Dynamic Configuration**: Enable/disable and modify settings without restart

## Requirements

- Linux operating system with `tc` (traffic control) utility
- Python 3.8+
- Root privileges (required for network traffic control)
- Two network interfaces (for inline operation)

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Ensure `tc` (traffic control) is available:
```bash
# On Ubuntu/Debian
sudo apt-get install iproute2

# On CentOS/RHEL
sudo yum install iproute
```

## Usage

### Running the Server

**Important**: The server must be run with root privileges to control network traffic:

```bash
sudo python main.py
```

The server will start on `http://0.0.0.0:8000`

### Network Setup

To use this as an inline traffic shaper:

1. **Physical Setup**: Connect your server with two ethernet interfaces:
   ```
   [Device] <-> [eth0 - Traffic Shaper - eth1] <-> [Router]
   ```

2. **Configure Interfaces**: Set up both interfaces with appropriate IP addresses
3. **Enable Forwarding**: The server automatically enables IP forwarding when traffic shaping is active

### API Endpoints

#### Get System Status
```bash
GET /status
```
Returns current configuration, available interfaces, and system resources.

#### Get Available Interfaces
```bash
GET /interfaces
```
Returns list of available network interfaces.

#### Update Configuration
```bash
POST /config
Content-Type: application/json

{
  "enabled": true,
  "delay_ms": 100,
  "bandwidth_mbps": 10.0,
  "interface_in": "eth0",
  "interface_out": "eth1"
}
```

#### Get Current Configuration
```bash
GET /config
```

#### Reset Configuration
```bash
POST /reset
```
Disables traffic shaping and clears all rules.

### Configuration Parameters

- **enabled**: `boolean` - Enable/disable traffic shaping
- **delay_ms**: `integer` - Packet delay in milliseconds (0 = no delay)
- **bandwidth_mbps**: `float` - Bandwidth limit in Mbps (1000 = no limit)
- **interface_in**: `string` - Input network interface name
- **interface_out**: `string` - Output network interface name

## Example Usage

1. **Enable traffic shaping with 50ms delay and 5 Mbps limit**:
```bash
curl -X POST http://localhost:8000/config \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "delay_ms": 50,
    "bandwidth_mbps": 5.0,
    "interface_in": "eth0",
    "interface_out": "eth1"
  }'
```

2. **Check current status**:
```bash
curl http://localhost:8000/status
```

3. **Disable traffic shaping**:
```bash
curl -X POST http://localhost:8000/config \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

## Traffic Control Implementation

The server uses Linux `tc` (traffic control) utility with:
- **HTB (Hierarchical Token Bucket)**: For bandwidth limiting
- **NetEm (Network Emulation)**: For packet delay simulation
- **IP Forwarding**: To route packets between interfaces

## Security Notes

- Run only in trusted network environments
- The server requires root privileges
- Configure CORS properly for production use
- Consider firewall rules to restrict API access

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure running as root
2. **Interface Not Found**: Check interface names with `ip link show`
3. **TC Command Failed**: Verify `iproute2` package is installed
4. **No Internet After Enabling**: Check IP forwarding and routing tables

### Debugging

Check traffic control rules:
```bash
# View current qdisc rules
tc qdisc show

# View detailed statistics
tc -s qdisc show dev eth1
```

### Logs

The server logs important events and errors. Check console output for debugging information.

## Development

### API Documentation

Once running, visit `http://localhost:8000/docs` for interactive API documentation (Swagger UI).

### Testing

Test the API endpoints using the provided curl examples or tools like Postman. 