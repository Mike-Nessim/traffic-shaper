#!/usr/bin/env python3
"""
Traffic Shaper Server
A server application to control network traffic shaping between two ethernet interfaces.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import subprocess
import logging
import netifaces
import psutil
import json
import os
from config import config
from utils import (
    validate_interface_name, validate_delay, validate_bandwidth,
    check_interface_connectivity, get_available_interfaces,
    check_root_privileges, check_tc_availability, get_system_info,
    ping_test, format_bandwidth, format_delay,
    validate_ip_address, validate_subnet_mask, get_first_ethernet_interface,
    get_second_ethernet_interface, get_ethernet_interfaces,
    apply_static_ip, remove_static_ip, get_interface_config, get_interface_ip,
    update_dhcp_config_for_ip
)
import datetime
import re
import time
from fastapi.staticfiles import StaticFiles
import yaml

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Traffic Shaper Server",
    description="Control network traffic shaping for inline packet delay and bandwidth throttling",
    version="1.0.0"
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response
class TrafficShapingConfig(BaseModel):
    enabled: bool
    delay_ms: Optional[int] = 0  # Delay in milliseconds
    bandwidth_mbps: Optional[float] = 1000.0  # Bandwidth limit in Mbps
    interface_in: Optional[str] = None  # Input interface
    interface_out: Optional[str] = None  # Output interface

class PingRequest(BaseModel):
    host: str = "8.8.8.8"
    count: int = 4

class StaticIPConfig(BaseModel):
    interface: str
    ip_address: str
    netmask: str = "255.255.255.0"
    gateway: Optional[str] = None

class SystemStatus(BaseModel):
    interfaces: Dict[str, Any]
    current_config: TrafficShapingConfig
    system_resources: Dict[str, Any]

# Global configuration state
current_config = TrafficShapingConfig(enabled=False)

# Global variable to store previous traffic data for speed calculation
previous_traffic_data = {}
previous_timestamp = 0

def get_network_interfaces():
    """Get available network interfaces"""
    interfaces = {}
    for interface in netifaces.interfaces():
        if interface != 'lo':  # Skip loopback
            addrs = netifaces.ifaddresses(interface)
            interfaces[interface] = {
                'name': interface,
                'addresses': addrs,
                'stats': get_interface_stats(interface)
            }
    return interfaces

def get_interface_stats(interface: str):
    """Get network interface statistics"""
    try:
        stats = psutil.net_if_stats()[interface]
        return {
            'is_up': stats.isup,
            'speed': stats.speed,
            'mtu': stats.mtu
        }
    except KeyError:
        return {'is_up': False, 'speed': 0, 'mtu': 0}

def execute_command(command: str) -> tuple[bool, str]:
    """Execute shell command and return success status and output"""
    try:
        result = subprocess.run(
            command.split(),
            capture_output=True,
            text=True,
            check=True
        )
        return True, result.stdout
    except subprocess.CalledProcessError as e:
        logger.error(f"Command failed: {command}, Error: {e.stderr}")
        return False, e.stderr
    except Exception as e:
        logger.error(f"Unexpected error executing command: {command}, Error: {str(e)}")
        return False, str(e)

def clear_traffic_shaping(interface: str):
    """Clear existing traffic shaping rules on an interface"""
    commands = [
        f"tc qdisc del dev {interface} root",
        f"tc qdisc del dev {interface} ingress"
    ]
    
    for cmd in commands:
        # It's okay if these fail (no existing rules)
        execute_command(cmd)

def apply_traffic_shaping(config: TrafficShapingConfig):
    """Apply traffic shaping configuration"""
    if not config.enabled:
        return True, "Traffic shaping disabled"
    
    if not config.interface_in or not config.interface_out:
        return False, "Both input and output interfaces must be specified"
    
    # Get the output interface subnet for traffic filtering
    try:
        result = subprocess.run(['ip', 'addr', 'show', config.interface_out], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            # Extract subnet from output (e.g., "172.22.22.1/24" -> "172.22.22.0/24")
            import re
            match = re.search(r'inet (\d+\.\d+\.\d+\.\d+)/(\d+)', result.stdout)
            if match:
                ip = match.group(1)
                prefix = match.group(2)
                # Calculate network address
                import ipaddress
                network = ipaddress.IPv4Network(f"{ip}/{prefix}", strict=False)
                dhcp_subnet = str(network)
                logger.info(f"Detected DHCP subnet: {dhcp_subnet}")
            else:
                dhcp_subnet = "172.22.22.0/24"  # fallback
                logger.warning(f"Could not detect subnet, using fallback: {dhcp_subnet}")
        else:
            dhcp_subnet = "172.22.22.0/24"  # fallback
            logger.warning(f"Could not get interface info, using fallback: {dhcp_subnet}")
    except Exception as e:
        dhcp_subnet = "172.22.22.0/24"  # fallback
        logger.error(f"Error detecting subnet: {e}, using fallback: {dhcp_subnet}")
    
    # Clear existing rules
    clear_traffic_shaping(config.interface_in)
    clear_traffic_shaping(config.interface_out)
    
    success_messages = []
    
    # Apply bandwidth limiting and delay to both interfaces
    if config.bandwidth_mbps and config.bandwidth_mbps < 1000:
        bandwidth_kbps = int(config.bandwidth_mbps * 1000)
        
        # Shape download traffic on interface going to client (interface_in)
        cmd = f"tc qdisc add dev {config.interface_in} root handle 1: htb default 30"
        success, msg = execute_command(cmd)
        if not success:
            return False, f"Failed to create HTB qdisc on {config.interface_in}: {msg}"
        
        cmd = f"tc class add dev {config.interface_in} parent 1: classid 1:1 htb rate {bandwidth_kbps}kbit"
        success, msg = execute_command(cmd)
        if not success:
            return False, f"Failed to create HTB class on {config.interface_in}: {msg}"
        
        # Filter for traffic FROM client network to anywhere (use detected subnet)
        cmd = f"tc filter add dev {config.interface_in} protocol ip parent 1: prio 1 u32 match ip src {dhcp_subnet} flowid 1:1"
        success, msg = execute_command(cmd)
        if not success:
            return False, f"Failed to create download filter on {config.interface_in}: {msg}"
        
        # Shape upload traffic on interface going to internet (interface_out)
        cmd = f"tc qdisc add dev {config.interface_out} root handle 2: htb default 30"
        success, msg = execute_command(cmd)
        if not success:
            return False, f"Failed to create HTB qdisc on {config.interface_out}: {msg}"
        
        cmd = f"tc class add dev {config.interface_out} parent 2: classid 2:1 htb rate {bandwidth_kbps}kbit"
        success, msg = execute_command(cmd)
        if not success:
            return False, f"Failed to create HTB class on {config.interface_out}: {msg}"
        
        # Add filter to route upload traffic to shaped class (match all traffic)
        cmd = f"tc filter add dev {config.interface_out} protocol ip parent 2: prio 1 u32 match u32 0 0 flowid 2:1"
        success, msg = execute_command(cmd)
        if not success:
            return False, f"Failed to create upload filter: {msg}"
        
        success_messages.append(f"Bandwidth limited to {config.bandwidth_mbps} Mbps (both directions)")
    
    # Apply packet delay to both interfaces
    if config.delay_ms and config.delay_ms > 0:
        if config.bandwidth_mbps and config.bandwidth_mbps < 1000:
            # Add netem to existing HTB classes
            cmd = f"tc qdisc add dev {config.interface_in} parent 1:1 handle 10: netem delay {config.delay_ms}ms"
            success, msg = execute_command(cmd)
            if not success:
                return False, f"Failed to apply delay on {config.interface_in}: {msg}"
            
            cmd = f"tc qdisc add dev {config.interface_out} parent 2:1 handle 20: netem delay {config.delay_ms}ms"
            success, msg = execute_command(cmd)
            if not success:
                return False, f"Failed to apply delay on {config.interface_out}: {msg}"
        else:
            # Create netem directly on both interfaces
            cmd = f"tc qdisc add dev {config.interface_in} root netem delay {config.delay_ms}ms"
            success, msg = execute_command(cmd)
            if not success:
                return False, f"Failed to apply delay on {config.interface_in}: {msg}"
            
            cmd = f"tc qdisc add dev {config.interface_out} root netem delay {config.delay_ms}ms"
            success, msg = execute_command(cmd)
            if not success:
                return False, f"Failed to apply delay on {config.interface_out}: {msg}"
        
        success_messages.append(f"Packet delay set to {config.delay_ms}ms (both directions)")
    
    # Enable IP forwarding
    try:
        with open('/proc/sys/net/ipv4/ip_forward', 'w') as f:
            f.write('1')
        logger.info("IP forwarding enabled")
    except Exception as e:
        logger.warning(f"Failed to enable IP forwarding: {e}")
    
    return True, "; ".join(success_messages) if success_messages else "Traffic shaping applied"

@app.get("/")
async def root():
    """Root endpoint"""
    return {"message": "Traffic Shaper Server is running"}

@app.get("/status", response_model=SystemStatus)
async def get_status():
    """Get current system status and configuration"""
    interfaces = get_network_interfaces()
    
    # Get system resources
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    
    system_resources = {
        'cpu_percent': cpu_percent,
        'memory_percent': memory.percent,
        'memory_available_gb': round(memory.available / (1024**3), 2)
    }
    
    return SystemStatus(
        interfaces=interfaces,
        current_config=current_config,
        system_resources=system_resources
    )

@app.get("/interfaces")
async def get_interfaces():
    """Get available network interfaces"""
    return get_network_interfaces()

@app.post("/config")
async def update_config(new_config: TrafficShapingConfig):
    """Update traffic shaping configuration"""
    global current_config
    
    try:
        # Validate configuration
        if new_config.enabled:
            # Validate delay (numeric input)
            if new_config.delay_ms is not None:
                if new_config.delay_ms < 0:
                    raise HTTPException(status_code=400, detail="Delay must be non-negative")
            
            # Validate bandwidth (numeric input)
            if new_config.bandwidth_mbps is not None:
                if new_config.bandwidth_mbps <= 0:
                    raise HTTPException(status_code=400, detail="Bandwidth must be positive")
            
            # Validate interfaces
            if new_config.interface_in and not validate_interface_name(new_config.interface_in):
                raise HTTPException(status_code=400, detail=f"Invalid input interface: {new_config.interface_in}")
            
            if new_config.interface_out and not validate_interface_name(new_config.interface_out):
                raise HTTPException(status_code=400, detail=f"Invalid output interface: {new_config.interface_out}")
            
            success, message = apply_traffic_shaping(new_config)
            if not success:
                raise HTTPException(status_code=400, detail=f"Failed to apply configuration: {message}")
        else:
            # Disable traffic shaping
            interfaces = get_network_interfaces()
            for interface_name in interfaces.keys():
                clear_traffic_shaping(interface_name)
            message = "Traffic shaping disabled"
        
        current_config = new_config
        logger.info(f"Configuration updated: {new_config}")
        
        return {
            "success": True,
            "message": message,
            "config": current_config
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating configuration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/config")
async def get_config():
    """Get current traffic shaping configuration"""
    return current_config

@app.post("/reset")
async def reset_config():
    """Reset traffic shaping to default (disabled) state"""
    global current_config
    
    try:
        # Clear all traffic shaping rules
        interfaces = get_network_interfaces()
        for interface_name in interfaces.keys():
            clear_traffic_shaping(interface_name)
        
        current_config = TrafficShapingConfig(enabled=False)
        logger.info("Configuration reset to default")
        
        return {
            "success": True,
            "message": "Traffic shaping reset to default state",
            "config": current_config
        }
    
    except Exception as e:
        logger.error(f"Error resetting configuration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/system-info")
async def get_system_info_endpoint():
    """Get detailed system information"""
    return get_system_info()

@app.post("/ping-test")
async def ping_test_endpoint(request: PingRequest):
    """Perform a ping test to check connectivity"""
    return ping_test(request.host, request.count)

def parse_dhcp_leases():
    """Parse DHCP lease file to get client information"""
    clients = {}
    
    # Check which DHCP server is running
    isc_running = False
    dnsmasq_running = False
    
    try:
        result = subprocess.run(['systemctl', 'is-active', 'isc-dhcp-server'], 
                              capture_output=True, text=True)
        isc_running = result.returncode == 0 and result.stdout.strip() == 'active'
    except:
        pass
    
    try:
        result = subprocess.run(['systemctl', 'is-active', 'dnsmasq'], 
                              capture_output=True, text=True)
        dnsmasq_running = result.returncode == 0 and result.stdout.strip() == 'active'
    except:
        pass
    
    # Parse ISC DHCP leases
    if isc_running:
        lease_file = "/var/lib/dhcp/dhcpd.leases"
        try:
            with open(lease_file, 'r') as f:
                content = f.read()
            
            # Parse lease entries
            lease_pattern = r'lease\s+(\d+\.\d+\.\d+\.\d+)\s*\{([^}]+)\}'
            leases = re.findall(lease_pattern, content, re.DOTALL)
            
            for ip, lease_content in leases:
                # Extract lease information
                client_info = {'ip': ip, 'status': 'unknown'}
                
                # Extract MAC address
                mac_match = re.search(r'hardware ethernet\s+([a-fA-F0-9:]+);', lease_content)
                if mac_match:
                    client_info['mac'] = mac_match.group(1).upper()
                
                # Extract hostname
                hostname_match = re.search(r'client-hostname\s+"([^"]+)";', lease_content)
                if hostname_match:
                    client_info['hostname'] = hostname_match.group(1)
                else:
                    client_info['hostname'] = f"Client-{ip.split('.')[-1]}"
                
                # Extract lease start and end times
                starts_match = re.search(r'starts\s+\d+\s+([^;]+);', lease_content)
                ends_match = re.search(r'ends\s+\d+\s+([^;]+);', lease_content)
                
                if starts_match and ends_match:
                    try:
                        start_time = datetime.datetime.strptime(starts_match.group(1), '%Y/%m/%d %H:%M:%S')
                        end_time = datetime.datetime.strptime(ends_match.group(1), '%Y/%m/%d %H:%M:%S')
                        now = datetime.datetime.now()
                        
                        client_info['lease_start'] = start_time.isoformat()
                        client_info['lease_end'] = end_time.isoformat()
                        client_info['lease_remaining'] = max(0, int((end_time - now).total_seconds()))
                        
                        # Determine if lease is active
                        if now < end_time:
                            client_info['status'] = 'active'
                        else:
                            client_info['status'] = 'expired'
                    except ValueError:
                        pass
                
                # Extract binding state
                binding_match = re.search(r'binding state\s+(\w+);', lease_content)
                if binding_match:
                    binding_state = binding_match.group(1)
                    if binding_state == 'active':
                        client_info['status'] = 'active'
                    elif binding_state == 'expired':
                        client_info['status'] = 'expired'
                
                clients[ip] = client_info
        
        except FileNotFoundError:
            logger.warning("ISC DHCP lease file not found")
        except Exception as e:
            logger.error(f"Error parsing ISC DHCP leases: {e}")
    
    # Parse dnsmasq leases
    if dnsmasq_running:
        lease_file = "/var/lib/dhcp/dnsmasq.leases"
        try:
            with open(lease_file, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    # dnsmasq format: timestamp mac_address ip_address hostname client_id
                    parts = line.split()
                    if len(parts) >= 4:
                        timestamp = int(parts[0])
                        mac = parts[1].upper()
                        ip = parts[2]
                        hostname = parts[3]
                        
                        # Calculate lease time remaining (dnsmasq default is 30 minutes)
                        lease_duration = 30 * 60  # 30 minutes in seconds
                        lease_end = timestamp + lease_duration
                        now = int(datetime.datetime.now().timestamp())
                        remaining = max(0, lease_end - now)
                        
                        client_info = {
                            'ip': ip,
                            'mac': mac,
                            'hostname': hostname,
                            'lease_start': datetime.datetime.fromtimestamp(timestamp).isoformat(),
                            'lease_end': datetime.datetime.fromtimestamp(lease_end).isoformat(),
                            'lease_remaining': remaining,
                            'status': 'active' if remaining > 0 else 'expired'
                        }
                        
                        clients[ip] = client_info
        
        except FileNotFoundError:
            logger.warning("dnsmasq lease file not found")
        except Exception as e:
            logger.error(f"Error parsing dnsmasq leases: {e}")
    
    return clients

def check_client_connectivity(ip: str) -> bool:
    """Check if a client is currently online via ping"""
    try:
        result = subprocess.run(['ping', '-c', '1', '-W', '1', ip], 
                              capture_output=True, text=True, timeout=3)
        return result.returncode == 0
    except:
        return False

@app.get("/dhcp/clients")
async def get_dhcp_clients():
    """Get list of DHCP clients"""
    clients = parse_dhcp_leases()
    
    # Check connectivity for each client
    for ip, client_info in clients.items():
        client_info['online'] = check_client_connectivity(ip)
        
        # Calculate lease time remaining in human readable format
        if 'lease_remaining' in client_info:
            remaining = client_info['lease_remaining']
            if remaining > 3600:
                client_info['lease_remaining_human'] = f"{remaining // 3600}h {(remaining % 3600) // 60}m"
            elif remaining > 60:
                client_info['lease_remaining_human'] = f"{remaining // 60}m {remaining % 60}s"
            else:
                client_info['lease_remaining_human'] = f"{remaining}s"
        else:
            client_info['lease_remaining_human'] = "Unknown"
    
    return {
        "clients": clients,
        "total_clients": len(clients),
        "active_clients": len([c for c in clients.values() if c.get('status') == 'active']),
        "online_clients": len([c for c in clients.values() if c.get('online', False)])
    }

@app.get("/dhcp/status")
async def get_dhcp_status():
    """Get DHCP server status"""
    try:
        # Check which DHCP server is running
        isc_running = False
        dnsmasq_running = False
        
        result = subprocess.run(['systemctl', 'is-active', 'isc-dhcp-server'], 
                              capture_output=True, text=True)
        isc_running = result.returncode == 0 and result.stdout.strip() == 'active'
        
        result = subprocess.run(['systemctl', 'is-active', 'dnsmasq'], 
                              capture_output=True, text=True)
        dnsmasq_running = result.returncode == 0 and result.stdout.strip() == 'active'
        
        # Determine which server is active and get appropriate stats
        if isc_running:
            stats = {
                'running': True,
                'server_type': 'isc-dhcp-server',
                'config_file': '/etc/dhcp/dhcpd.conf',
                'lease_file': '/var/lib/dhcp/dhcpd.leases',
                'interface': 'enp1s0',
                'subnet': '172.22.22.0/24',
                'range': '172.22.22.10 - 172.22.22.100'
            }
            
            # Get additional stats from systemctl
            result = subprocess.run(['systemctl', 'status', 'isc-dhcp-server', '--no-pager'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                # Extract uptime from status
                for line in result.stdout.split('\n'):
                    if 'Active:' in line and 'since' in line:
                        stats['uptime'] = line.split('since')[1].strip()
                        break
        
        elif dnsmasq_running:
            # Read actual dnsmasq configuration
            interface = 'enp1s0'  # default
            dhcp_range = 'Not configured'
            subnet = 'Unknown'
            
            try:
                with open('/etc/dnsmasq.conf', 'r') as f:
                    config_content = f.read()
                
                # Parse interface
                interface_match = re.search(r'^interface=(.+)$', config_content, re.MULTILINE)
                if interface_match:
                    interface = interface_match.group(1)
                
                # Parse DHCP range
                range_match = re.search(r'^dhcp-range=([^,]+),([^,]+),([^,]+),', config_content, re.MULTILINE)
                if range_match:
                    start_ip, end_ip, netmask = range_match.groups()
                    dhcp_range = f"{start_ip} - {end_ip}"
                    
                    # Calculate subnet from start IP and netmask
                    import ipaddress
                    network = ipaddress.IPv4Network(f"{start_ip}/{netmask}", strict=False)
                    subnet = str(network)
            except Exception as e:
                logger.error(f"Error reading dnsmasq config: {e}")
            
            stats = {
                'running': True,
                'server_type': 'dnsmasq',
                'config_file': '/etc/dnsmasq.conf',
                'lease_file': '/var/lib/dhcp/dnsmasq.leases',
                'interface': interface,
                'subnet': subnet,
                'range': dhcp_range
            }
            
            # Get additional stats from systemctl
            result = subprocess.run(['systemctl', 'status', 'dnsmasq', '--no-pager'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                # Extract uptime from status
                for line in result.stdout.split('\n'):
                    if 'Active:' in line and 'since' in line:
                        stats['uptime'] = line.split('since')[1].strip()
                        break
        
        else:
            stats = {
                'running': False,
                'server_type': 'none',
                'error': 'No DHCP server detected'
            }
        
        return stats
    
    except Exception as e:
        logger.error(f"Error getting DHCP status: {e}")
        return {"running": False, "error": str(e)}

@app.post("/dhcp/restart")
async def restart_dhcp_server():
    """Restart DHCP server"""
    try:
        # Check which DHCP server is running
        isc_running = False
        dnsmasq_running = False
        
        result = subprocess.run(['systemctl', 'is-active', 'isc-dhcp-server'], 
                              capture_output=True, text=True)
        isc_running = result.returncode == 0 and result.stdout.strip() == 'active'
        
        result = subprocess.run(['systemctl', 'is-active', 'dnsmasq'], 
                              capture_output=True, text=True)
        dnsmasq_running = result.returncode == 0 and result.stdout.strip() == 'active'
        
        if isc_running:
            result = subprocess.run(['systemctl', 'restart', 'isc-dhcp-server'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                return {"success": True, "message": "ISC DHCP server restarted successfully"}
            else:
                return {"success": False, "message": f"Failed to restart ISC DHCP server: {result.stderr}"}
        
        elif dnsmasq_running:
            result = subprocess.run(['systemctl', 'restart', 'dnsmasq'], 
                                  capture_output=True, text=True)
            if result.returncode == 0:
                return {"success": True, "message": "dnsmasq DHCP server restarted successfully"}
            else:
                return {"success": False, "message": f"Failed to restart dnsmasq: {result.stderr}"}
        
        else:
            return {"success": False, "message": "No DHCP server detected"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api")
async def api_root():
    return {"message": "API root"}

@app.get("/api/network/interfaces")
async def get_network_interfaces_detailed():
    """Get detailed information about all network interfaces"""
    interfaces = {}
    for interface in get_available_interfaces():
        interfaces[interface] = get_interface_config(interface)
    
    ethernet_interfaces = get_ethernet_interfaces()
    return {
        'interfaces': interfaces,
        'first_ethernet': get_first_ethernet_interface(),
        'input_interface': ethernet_interfaces.get('input'),
        'output_interface': ethernet_interfaces.get('output')
    }

@app.get("/api/network/interface/{interface}")
async def get_interface_detail(interface: str):
    """Get detailed information about a specific interface"""
    if not validate_interface_name(interface):
        raise HTTPException(status_code=404, detail=f"Interface {interface} not found")
    
    return get_interface_config(interface)

@app.post("/api/network/static-ip")
async def set_static_ip(config: StaticIPConfig):
    """Set static IP configuration for an interface"""
    try:
        success, message = apply_static_ip(
            config.interface, 
            config.ip_address, 
            config.netmask, 
            config.gateway
        )
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        # If this is the output interface, update DHCP configuration
        ethernet_interfaces = get_ethernet_interfaces()
        output_interface = ethernet_interfaces.get('output')
        
        if config.interface == output_interface:
            dhcp_success, dhcp_message = update_dhcp_config_for_ip(
                output_interface, 
                config.ip_address, 
                config.netmask
            )
            if not dhcp_success:
                logger.warning(f"Failed to update DHCP configuration: {dhcp_message}")
        
        return {
            "success": True,
            "message": message,
            "interface": config.interface,
            "ip_address": config.ip_address,
            "netmask": config.netmask,
            "gateway": config.gateway
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error setting static IP: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/network/static-ip/{interface}")
async def remove_static_ip_config(interface: str):
    """Remove static IP configuration for an interface"""
    try:
        if not validate_interface_name(interface):
            raise HTTPException(status_code=404, detail=f"Interface {interface} not found")
        
        success, message = remove_static_ip(interface)
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        return {
            "success": True,
            "message": message,
            "interface": interface
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error removing static IP: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/network/auto-configure")
async def auto_configure_first_interface():
    """Automatically configure the first ethernet interface with static IP 172.22.22.22"""
    try:
        first_interface = get_first_ethernet_interface()
        if not first_interface:
            raise HTTPException(status_code=404, detail="No ethernet interfaces found")
        
        success, message = apply_static_ip(
            first_interface, 
            "172.22.22.22", 
            "255.255.255.0"
        )
        
        if not success:
            raise HTTPException(status_code=400, detail=message)
        
        return {
            "success": True,
            "message": f"Auto-configured {first_interface} with IP 172.22.22.22",
            "interface": first_interface,
            "ip_address": "172.22.22.22",
            "netmask": "255.255.255.0"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error auto-configuring interface: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/traffic")
async def get_traffic_stats():
    """Get real-time traffic statistics"""
    global previous_traffic_data, previous_timestamp
    
    try:
        current_time = time.time()
        current_data = {}
        
        # Read /proc/net/dev for network statistics
        with open('/proc/net/dev', 'r') as f:
            lines = f.readlines()
        
        # Parse network interface statistics
        for line in lines[2:]:  # Skip header lines
            parts = line.strip().split()
            if len(parts) >= 17:
                interface = parts[0].rstrip(':')
                rx_bytes = int(parts[1])
                tx_bytes = int(parts[9])
                
                current_data[interface] = {
                    'rx_bytes': rx_bytes,
                    'tx_bytes': tx_bytes,
                    'timestamp': current_time
                }
        
        # Calculate speeds if we have previous data
        speeds = {}
        total_rx_speed = 0
        total_tx_speed = 0
        
        if previous_traffic_data and previous_timestamp > 0:
            time_diff = current_time - previous_timestamp
            
            if time_diff > 0:
                for interface, data in current_data.items():
                    if interface in previous_traffic_data:
                        prev_data = previous_traffic_data[interface]
                        
                        # Calculate bytes per second
                        rx_speed = (data['rx_bytes'] - prev_data['rx_bytes']) / time_diff
                        tx_speed = (data['tx_bytes'] - prev_data['tx_bytes']) / time_diff
                        
                        # Convert to Mbps
                        rx_mbps = (rx_speed * 8) / (1024 * 1024)
                        tx_mbps = (tx_speed * 8) / (1024 * 1024)
                        
                        speeds[interface] = {
                            'rx_mbps': max(0, rx_mbps),
                            'tx_mbps': max(0, tx_mbps),
                            'rx_bytes_total': data['rx_bytes'],
                            'tx_bytes_total': data['tx_bytes']
                        }
                        
                        # Add to totals (excluding loopback)
                        if interface != 'lo':
                            total_rx_speed += speeds[interface]['rx_mbps']
                            total_tx_speed += speeds[interface]['tx_mbps']
        
        # Store current data for next calculation
        previous_traffic_data = current_data.copy()
        previous_timestamp = current_time
        
        # Get interface information
        interfaces_info = {}
        for interface in netifaces.interfaces():
            try:
                addrs = netifaces.ifaddresses(interface)
                is_up = False
                ip_address = None
                
                # Check if interface is up
                if netifaces.AF_INET in addrs:
                    is_up = True
                    ip_address = addrs[netifaces.AF_INET][0]['addr']
                
                interfaces_info[interface] = {
                    'is_up': is_up,
                    'ip_address': ip_address,
                    'has_traffic': interface in speeds
                }
            except:
                interfaces_info[interface] = {
                    'is_up': False,
                    'ip_address': None,
                    'has_traffic': False
                }
        
        return {
            'interfaces': speeds,
            'total_download_speed': total_rx_speed,
            'total_upload_speed': total_tx_speed,
            'interface_info': interfaces_info,
            'timestamp': current_time
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get traffic stats: {str(e)}")

def setup_default_static_ip():
    """Setup default static IP on OUTPUT ethernet interface at startup"""
    try:
        ethernet_interfaces = get_ethernet_interfaces()
        output_interface = ethernet_interfaces.get('output')
        
        if not output_interface:
            logger.warning("No output ethernet interface found for auto-configuration")
            return
        
        # Check if interface already has our target IP
        current_ip = get_interface_ip(output_interface)
        if current_ip == "172.22.22.1":
            logger.info(f"OUTPUT interface {output_interface} already has target IP 172.22.22.1")
            return
        
        # Check if interface already has static config (user has manually configured)
        interface_config = get_interface_config(output_interface)
        if interface_config.get('has_static_config'):
            logger.info(f"OUTPUT interface {output_interface} already has static configuration - skipping auto-config")
            return
        
        # Apply default static IP configuration to OUTPUT interface
        logger.info(f"Setting up default static IP 172.22.22.1 on OUTPUT interface {output_interface}")
        success, message = apply_static_ip(output_interface, "172.22.22.1", "255.255.255.0")
        
        if success:
            logger.info(f"Successfully configured OUTPUT interface {output_interface} with static IP 172.22.22.1")
            
            # Update DHCP configuration tied to output interface
            dhcp_success, dhcp_message = update_dhcp_config_for_ip(output_interface, "172.22.22.1", "255.255.255.0")
            if dhcp_success:
                logger.info(f"Updated DHCP configuration: {dhcp_message}")
            else:
                logger.warning(f"Failed to update DHCP configuration: {dhcp_message}")
        else:
            logger.error(f"Failed to configure static IP: {message}")
            
    except Exception as e:
        logger.error(f"Error during default static IP setup: {e}")

if __name__ == "__main__":
    import uvicorn
    
    # Check if running as root (required for traffic control)
    if config.REQUIRE_ROOT and not check_root_privileges():
        logger.warning("Warning: This application should be run as root for traffic control functionality")
    
    # Check if tc is available
    if not check_tc_availability():
        logger.error("Error: 'tc' command not found. Please install iproute2 package.")
        logger.error("Ubuntu/Debian: sudo apt-get install iproute2")
        logger.error("CentOS/RHEL: sudo yum install iproute")
    
    # Setup default static IP configuration
    setup_default_static_ip()
    
    uvicorn.run(app, host=config.HOST, port=config.PORT) 