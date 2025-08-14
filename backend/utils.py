#!/usr/bin/env python3
"""
Traffic Shaper Utility Functions

This module contains utility functions for network interface validation,
traffic control operations, and system checks.
"""

import subprocess
import time
import logging
import netifaces
import ipaddress
import re
import socket
from typing import Tuple, List, Optional, Dict
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Network interfaces that should be excluded from traffic control
EXCLUDED_INTERFACES = {'lo', 'docker0', 'veth'}

def validate_interface_name(interface: str) -> bool:
    """Validate if network interface exists"""
    try:
        interfaces = netifaces.interfaces()
        return interface in interfaces
    except Exception as e:
        logger.error(f"Error validating interface {interface}: {str(e)}")
        return False

def get_interface_ip(interface: str) -> Optional[str]:
    """Get IP address of a network interface"""
    try:
        addrs = netifaces.ifaddresses(interface)
        if netifaces.AF_INET in addrs:
            return addrs[netifaces.AF_INET][0]['addr']
    except (KeyError, IndexError):
        pass
    return None

def get_interface_mac(interface: str) -> Optional[str]:
    """Get MAC address of a network interface"""
    try:
        addrs = netifaces.ifaddresses(interface)
        if netifaces.AF_LINK in addrs:
            return addrs[netifaces.AF_LINK][0]['addr']
    except (KeyError, IndexError):
        pass
    return None

def validate_delay(delay: str) -> bool:
    """Validate delay parameter format (e.g., '100ms', '1s')"""
    if not delay:
        return False
    
    # Remove 'ms' or 's' suffix and check if remaining is a number
    delay_clean = delay.replace('ms', '').replace('s', '')
    try:
        float(delay_clean)
        return True
    except ValueError:
        return False

def validate_bandwidth(bandwidth: str) -> bool:
    """Validate bandwidth parameter format (e.g., '1mbit', '100kbit')"""
    if not bandwidth:
        return False
    
    # Common bandwidth units
    valid_units = ['bit', 'kbit', 'mbit', 'gbit', 'bps', 'kbps', 'mbps', 'gbps']
    
    # Check if bandwidth ends with any valid unit
    for unit in valid_units:
        if bandwidth.lower().endswith(unit):
            # Extract numeric part and validate
            numeric_part = bandwidth[:-len(unit)]
            try:
                float(numeric_part)
                return True
            except ValueError:
                continue
    
    return False

def check_interface_connectivity(interface: str) -> Dict[str, any]:
    """Check if network interface is up and has connectivity"""
    try:
        # Check if interface exists
        if not validate_interface_name(interface):
            return {
                'interface': interface,
                'exists': False,
                'is_up': False,
                'has_ip': False,
                'connectivity': False,
                'error': f"Interface {interface} does not exist"
            }
        
        # Get interface information
        addrs = netifaces.ifaddresses(interface)
        
        # Check if interface is up
        is_up = True  # netifaces doesn't directly provide this, assume up if it has addresses
        
        # Check if interface has IP address
        has_ip = netifaces.AF_INET in addrs
        ip_address = None
        if has_ip:
            ip_address = addrs[netifaces.AF_INET][0]['addr']
        
        # Simple connectivity test (ping gateway or DNS)
        connectivity = False
        if has_ip:
            # Try to ping 8.8.8.8 using this interface
            try:
                result = subprocess.run(
                    ['ping', '-c', '1', '-W', '2', '-I', interface, '8.8.8.8'],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                connectivity = result.returncode == 0
            except (subprocess.TimeoutExpired, Exception):
                connectivity = False
        
        return {
            'interface': interface,
            'exists': True,
            'is_up': is_up,
            'has_ip': has_ip,
            'ip_address': ip_address,
            'connectivity': connectivity
        }
        
    except Exception as e:
        return {
            'interface': interface,
            'exists': False,
            'is_up': False,
            'has_ip': False,
            'connectivity': False,
            'error': str(e)
        }

def get_available_interfaces() -> List[str]:
    """Get list of available network interfaces (excluding loopback and virtual)"""
    try:
        all_interfaces = netifaces.interfaces()
        
        # Filter out excluded interfaces
        filtered_interfaces = []
        for iface in all_interfaces:
            # Skip if interface name starts with excluded patterns
            if any(iface.startswith(excluded) for excluded in EXCLUDED_INTERFACES):
                continue
            
            # Skip if interface name contains common virtual interface patterns
            virtual_patterns = ['veth', 'br-', 'docker', 'virbr']
            if any(pattern in iface for pattern in virtual_patterns):
                continue
                
            filtered_interfaces.append(iface)
        
        return sorted(filtered_interfaces)
        
    except Exception as e:
        logger.error(f"Error getting available interfaces: {str(e)}")
        return []

def check_root_privileges() -> bool:
    """Check if running with root privileges"""
    return os.geteuid() == 0

def check_tc_availability() -> bool:
    """Check if tc (traffic control) command is available"""
    try:
        result = subprocess.run(['which', 'tc'], capture_output=True, text=True)
        return result.returncode == 0
    except Exception:
        return False

def get_system_info() -> Dict[str, any]:
    """Get system information relevant to traffic shaping"""
    import platform
    import psutil
    
    try:
        # Get basic system info
        info = {
            'platform': platform.system(),
            'platform_version': platform.release(),
            'architecture': platform.machine(),
            'hostname': platform.node(),
            'python_version': platform.python_version()
        }
        
        # Get system resources
        info.update({
            'cpu_cores': psutil.cpu_count(),
            'memory_total_gb': round(psutil.virtual_memory().total / (1024**3), 2),
            'memory_available_gb': round(psutil.virtual_memory().available / (1024**3), 2)
        })
        
        # Check important tools
        info.update({
            'has_root': check_root_privileges(),
            'has_tc': check_tc_availability(),
            'interfaces_count': len(get_available_interfaces())
        })
        
        return info
        
    except Exception as e:
        logger.error(f"Error getting system info: {str(e)}")
        return {'error': str(e)}

def ping_test(host: str = "8.8.8.8", count: int = 4, interface: str = None) -> Dict[str, any]:
    """Perform ping test to check network connectivity"""
    try:
        cmd = ['ping', '-c', str(count), '-W', '3']
        
        # Add interface specification if provided
        if interface:
            cmd.extend(['-I', interface])
        
        cmd.append(host)
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        output = result.stdout + result.stderr
        
        # Parse ping results
        packet_loss = 0
        avg_time = 0
        
        # Look for packet loss percentage
        loss_match = re.search(r'(\d+)% packet loss', output)
        if loss_match:
            packet_loss = int(loss_match.group(1))
        
        # Look for average time
        if 'rtt min/avg/max/mdev' in output:
            # Standard format: rtt min/avg/max/mdev = 1.234/5.678/9.012/1.234 ms
            rtt_match = re.search(r'rtt min/avg/max/mdev = [\d.]+/([\d.]+)/[\d.]+/[\d.]+ ms', output)
            if rtt_match:
                try:
                    avg_time = float(rtt_match.group(1))
                except Exception:
                    avg_time = 0
            else:
                # Fallback: parse from 'time Xms' (may only work for single ping)
                time_match = re.search(r'time (\d+)ms', output)
                avg_time = int(time_match.group(1)) if time_match else 0
        if result.returncode == 0:
            return {
                'success': True,
                'host': host,
                'packet_loss_percent': packet_loss,
                'avg_time_ms': avg_time,
                'output': output
            }
        else:
            return {
                'success': False,
                'host': host,
                'error': output,
                'packet_loss_percent': 100,
                'avg_time_ms': 0
            }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'host': host,
            'error': 'Ping timeout',
            'packet_loss_percent': 100,
            'avg_time_ms': 0
        }
    except Exception as e:
        return {
            'success': False,
            'host': host,
            'error': str(e),
            'packet_loss_percent': 100,
            'avg_time_ms': 0
        }

def format_bandwidth(bandwidth_bits: int) -> str:
    """Format bandwidth in human readable format"""
    if bandwidth_bits >= 1_000_000_000:
        return f"{bandwidth_bits / 1_000_000_000:.1f} Gbps"
    elif bandwidth_bits >= 1_000_000:
        return f"{bandwidth_bits / 1_000_000:.1f} Mbps"
    elif bandwidth_bits >= 1_000:
        return f"{bandwidth_bits / 1_000:.1f} Kbps"
    else:
        return f"{bandwidth_bits} bps"

def format_delay(delay_ms: float) -> str:
    """Format delay in human readable format"""
    if delay_ms >= 1000:
        return f"{delay_ms / 1000:.1f}s"
    else:
        return f"{delay_ms:.1f}ms"

def validate_ip_address(ip: str) -> Tuple[bool, str]:
    """Validate IPv4 address format"""
    try:
        ipaddress.IPv4Address(ip)
        return True, "Valid IP address"
    except ipaddress.AddressValueError as e:
        return False, str(e)

def validate_subnet_mask(mask: str) -> Tuple[bool, str]:
    """Validate subnet mask or CIDR notation"""
    try:
        # Check if it's a CIDR prefix (e.g., /24)
        if mask.startswith('/'):
            prefix = int(mask[1:])
            if 0 <= prefix <= 32:
                return True, "Valid CIDR prefix"
            else:
                return False, "CIDR prefix must be between 0 and 32"
        
        # Check if it's a dotted decimal subnet mask
        parts = mask.split('.')
        if len(parts) != 4:
            return False, "Subnet mask must have 4 octets"
        
        for part in parts:
            octet = int(part)
            if not 0 <= octet <= 255:
                return False, "Each octet must be between 0 and 255"
        
        # Convert to binary and check if it's a valid subnet mask
        # (consecutive 1s followed by consecutive 0s)
        binary = ''.join(format(int(part), '08b') for part in parts)
        if '01' in binary:  # Invalid: 0 followed by 1
            return False, "Invalid subnet mask pattern"
        
        return True, "Valid subnet mask"
        
    except ValueError:
        return False, "Invalid subnet mask format"

def get_first_ethernet_interface() -> Optional[str]:
    """Get the first ethernet interface (e.g., eth0, enp1s0)"""
    try:
        interfaces = netifaces.interfaces()
        
        # Look for common ethernet interface patterns
        ethernet_patterns = ['eth', 'enp', 'ens', 'em', 'p2p']
        
        for pattern in ethernet_patterns:
            for interface in sorted(interfaces):
                if interface.startswith(pattern):
                    return interface
        
        # If no ethernet interfaces found, return first non-loopback interface
        for interface in sorted(interfaces):
            if interface != 'lo' and not interface.startswith('docker'):
                return interface
        
        return None
        
    except Exception as e:
        logger.error(f"Error getting first ethernet interface: {str(e)}")
        return None

def get_second_ethernet_interface() -> Optional[str]:
    """Get the second ethernet interface (e.g., eth1, enp3s0) for output"""
    try:
        interfaces = netifaces.interfaces()
        
        # Look for common ethernet interface patterns
        ethernet_patterns = ['eth', 'enp', 'ens', 'em', 'p2p']
        ethernet_interfaces = []
        
        for pattern in ethernet_patterns:
            for interface in sorted(interfaces):
                if interface.startswith(pattern):
                    ethernet_interfaces.append(interface)
        
        # If no ethernet interfaces found, use any non-loopback interface
        if not ethernet_interfaces:
            for interface in sorted(interfaces):
                if interface != 'lo' and not interface.startswith('docker'):
                    ethernet_interfaces.append(interface)
        
        # Return second interface if available, otherwise first
        if len(ethernet_interfaces) >= 2:
            return ethernet_interfaces[1]
        elif len(ethernet_interfaces) >= 1:
            return ethernet_interfaces[0]  # fallback to first if only one exists
        
        return None
        
    except Exception as e:
        logger.error(f"Error getting second ethernet interface: {str(e)}")
        return None

def get_ethernet_interfaces() -> dict:
    """Get input and output ethernet interfaces"""
    try:
        interfaces = netifaces.interfaces()
        
        # Look for common ethernet interface patterns
        ethernet_patterns = ['eth', 'enp', 'ens', 'em', 'p2p']
        ethernet_interfaces = []
        
        for pattern in ethernet_patterns:
            for interface in sorted(interfaces):
                if interface.startswith(pattern):
                    ethernet_interfaces.append(interface)
        
        # If no ethernet interfaces found, use any non-loopback interface
        if not ethernet_interfaces:
            for interface in sorted(interfaces):
                if interface != 'lo' and not interface.startswith('docker'):
                    ethernet_interfaces.append(interface)
        
        result = {
            'input': ethernet_interfaces[0] if len(ethernet_interfaces) >= 1 else None,
            'output': ethernet_interfaces[1] if len(ethernet_interfaces) >= 2 else ethernet_interfaces[0] if len(ethernet_interfaces) >= 1 else None
        }
        
        return result
        
    except Exception as e:
        logger.error(f"Error getting ethernet interfaces: {str(e)}")
        return {'input': None, 'output': None}

def create_netplan_config(interface: str, ip: str, netmask: str = "255.255.255.0", gateway: str = None) -> str:
    """Create netplan YAML configuration for static IP"""
    
    # Convert netmask to CIDR notation if needed
    if '.' in netmask:
        # Convert dotted decimal to CIDR
        cidr = sum(bin(int(x)).count('1') for x in netmask.split('.'))
    else:
        cidr = int(netmask.replace('/', ''))
    
    config = f"""network:
  version: 2
  ethernets:
    {interface}:
      addresses:
        - {ip}/{cidr}"""
    
    if gateway:
        config += f"""
      routes:
        - to: default
          via: {gateway}"""
    
    config += """
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
"""
    
    return config

def apply_static_ip(interface: str, ip: str, netmask: str = "255.255.255.0", gateway: str = None) -> Tuple[bool, str]:
    """Apply static IP configuration to interface"""
    try:
        # Validate inputs
        if not validate_interface_name(interface):
            return False, f"Interface {interface} does not exist"
        
        valid_ip, ip_msg = validate_ip_address(ip)
        if not valid_ip:
            return False, f"Invalid IP address: {ip_msg}"
        
        valid_mask, mask_msg = validate_subnet_mask(netmask)
        if not valid_mask:
            return False, f"Invalid subnet mask: {mask_msg}"
        
        if gateway:
            valid_gw, gw_msg = validate_ip_address(gateway)
            if not valid_gw:
                return False, f"Invalid gateway: {gw_msg}"
        
        # Create netplan configuration
        config_content = create_netplan_config(interface, ip, netmask, gateway)
        
        # Write configuration file
        config_file = f"/etc/netplan/99-traffic-shaper-{interface}.yaml"
        
        # Create temporary file first
        temp_file = f"/tmp/netplan-{interface}.yaml"
        with open(temp_file, 'w') as f:
            f.write(config_content)
        
        # Copy to netplan directory
        result = subprocess.run(['cp', temp_file, config_file], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            return False, f"Failed to write netplan config: {result.stderr}"
        
        # Apply netplan configuration
        result = subprocess.run(['netplan', 'apply'], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            return False, f"Failed to apply netplan config: {result.stderr}"
        
        # Clean up temp file
        subprocess.run(['rm', '-f', temp_file], capture_output=True)
        
        # Update DHCP server configuration if this is the primary interface
        first_interface = get_first_ethernet_interface()
        if interface == first_interface:
            dhcp_success, dhcp_message = update_dhcp_config_for_ip(interface, ip, netmask)
            if not dhcp_success:
                logger.warning(f"Failed to update DHCP config: {dhcp_message}")
        
        logger.info(f"Applied static IP {ip} to interface {interface}")
        return True, f"Static IP {ip} applied to {interface}"
        
    except Exception as e:
        logger.error(f"Error applying static IP: {str(e)}")
        return False, f"Error applying static IP: {str(e)}"

def remove_static_ip(interface: str) -> Tuple[bool, str]:
    """Remove static IP configuration for interface"""
    try:
        config_file = f"/etc/netplan/99-traffic-shaper-{interface}.yaml"
        
        # Remove the configuration file
        result = subprocess.run(['rm', '-f', config_file], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            return False, f"Failed to remove netplan config: {result.stderr}"
        
        # Apply netplan configuration
        result = subprocess.run(['netplan', 'apply'], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            return False, f"Failed to apply netplan changes: {result.stderr}"
        
        logger.info(f"Removed static IP configuration for interface {interface}")
        return True, f"Static IP configuration removed from {interface}"
        
    except Exception as e:
        logger.error(f"Error removing static IP: {str(e)}")
        return False, f"Error removing static IP: {str(e)}"

def get_interface_config(interface: str) -> Dict[str, any]:
    """Get current interface configuration"""
    connectivity = check_interface_connectivity(interface)
    
    # Check if we have a static config file for this interface
    config_file = f"/etc/netplan/99-traffic-shaper-{interface}.yaml"
    has_static_config = False
    
    try:
        import os
        has_static_config = os.path.exists(config_file)
    except:
        pass
    
    # Get current IP configuration
    ip_address = connectivity.get('ip_address')
    
    # Get additional interface details
    try:
        addrs = netifaces.ifaddresses(interface)
        
        # Get netmask if available
        netmask = None
        if netifaces.AF_INET in addrs and len(addrs[netifaces.AF_INET]) > 0:
            netmask = addrs[netifaces.AF_INET][0].get('netmask')
        
        # Get MAC address
        mac_address = None
        if netifaces.AF_LINK in addrs and len(addrs[netifaces.AF_LINK]) > 0:
            mac_address = addrs[netifaces.AF_LINK][0].get('addr')
            
    except Exception:
        netmask = None
        mac_address = None
    
    return {
        'interface': interface,
        'ip_address': ip_address,
        'netmask': netmask,
        'mac_address': mac_address,
        'has_static_config': has_static_config,
        'is_up': connectivity.get('is_up', False),
        'has_connectivity': connectivity.get('connectivity', False)
    }

def update_dhcp_config_for_ip(output_interface: str, ip: str, netmask: str = "255.255.255.0") -> Tuple[bool, str]:
    """Update DHCP server configuration when OUTPUT interface IP changes"""
    try:
        import ipaddress
        
        # Calculate network and DHCP range based on new IP
        network = ipaddress.IPv4Network(f"{ip}/{netmask}", strict=False)
        network_addr = str(network.network_address)
        
        # Create DHCP range (e.g., if IP is 172.22.22.22, range is 172.22.22.10-100)
        network_base = str(network.network_address).rsplit('.', 1)[0]
        dhcp_start = f"{network_base}.10"
        dhcp_end = f"{network_base}.100"
        gateway = f"{network_base}.1"
        
        # Create new dnsmasq configuration
        config_content = f"""# dnsmasq configuration for traffic shaper
# DNS disabled, DHCP only
port=0

# Listen on {output_interface} interface only (OUTPUT interface)
interface={output_interface}
bind-interfaces

# DHCP configuration for {network} network
dhcp-range={dhcp_start},{dhcp_end},{netmask},24h

# Network options
dhcp-option=3,{gateway}    # Default gateway
dhcp-option=6,8.8.8.8,8.8.4.4 # DNS servers

# DHCP settings
dhcp-authoritative
dhcp-leasefile=/var/lib/dhcp/dnsmasq.leases
log-dhcp

# Enable DHCP logging
log-facility=/var/log/dnsmasq.log"""

        # Write new configuration
        with open('/etc/dnsmasq.conf', 'w') as f:
            f.write(config_content)
        
        # Restart dnsmasq to apply new configuration
        result = subprocess.run(['systemctl', 'restart', 'dnsmasq'], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            return False, f"Failed to restart DHCP server: {result.stderr}"
        
        logger.info(f"Updated DHCP configuration for OUTPUT interface {interface} with network {network}")
        return True, f"DHCP server updated for network {network}"
        
    except Exception as e:
        logger.error(f"Error updating DHCP config: {str(e)}")
        return False, f"Error updating DHCP config: {str(e)}"