"""
Utility functions for the Traffic Shaper Server
"""

import re
import subprocess
import logging
from typing import List, Dict, Optional, Tuple
import netifaces
import psutil

logger = logging.getLogger(__name__)

def validate_interface_name(interface: str) -> bool:
    """Validate network interface name"""
    if not interface:
        return False
    
    # Check if interface exists
    return interface in netifaces.interfaces()

def validate_delay(delay_ms: int) -> Tuple[bool, str]:
    """Validate packet delay value"""
    if delay_ms < 0:
        return False, "Delay cannot be negative"
    
    if delay_ms > 10000:  # 10 seconds max
        return False, "Delay cannot exceed 10 seconds (10000ms)"
    
    return True, "Valid"

def validate_bandwidth(bandwidth_mbps: float) -> Tuple[bool, str]:
    """Validate bandwidth value"""
    if bandwidth_mbps <= 0:
        return False, "Bandwidth must be positive"
    
    if bandwidth_mbps > 1000:  # 1 Gbps max
        return False, "Bandwidth cannot exceed 1000 Mbps"
    
    if bandwidth_mbps < 0.1:  # 100 Kbps min
        return False, "Bandwidth cannot be less than 0.1 Mbps"
    
    return True, "Valid"

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

def check_interface_connectivity(interface: str) -> Dict[str, any]:
    """Check if interface is up and has connectivity"""
    result = {
        'interface': interface,
        'exists': False,
        'is_up': False,
        'has_ip': False,
        'ip_address': None,
        'mac_address': None,
        'speed': 0,
        'mtu': 0
    }
    
    if not validate_interface_name(interface):
        return result
    
    result['exists'] = True
    result['ip_address'] = get_interface_ip(interface)
    result['mac_address'] = get_interface_mac(interface)
    result['has_ip'] = result['ip_address'] is not None
    
    try:
        stats = psutil.net_if_stats()[interface]
        result['is_up'] = stats.isup
        result['speed'] = stats.speed
        result['mtu'] = stats.mtu
    except KeyError:
        pass
    
    return result

def get_available_interfaces() -> List[str]:
    """Get list of available network interfaces (excluding loopback)"""
    interfaces = []
    for interface in netifaces.interfaces():
        if interface != 'lo' and not interface.startswith('docker'):
            interfaces.append(interface)
    return interfaces

def check_root_privileges() -> bool:
    """Check if running with root privileges"""
    import os
    return os.geteuid() == 0

def check_tc_availability() -> bool:
    """Check if tc (traffic control) command is available"""
    try:
        subprocess.run(['tc', '-V'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def format_bandwidth(bps: float) -> str:
    """Format bandwidth in human-readable format"""
    if bps >= 1_000_000_000:
        return f"{bps / 1_000_000_000:.1f} Gbps"
    elif bps >= 1_000_000:
        return f"{bps / 1_000_000:.1f} Mbps"
    elif bps >= 1_000:
        return f"{bps / 1_000:.1f} Kbps"
    else:
        return f"{bps:.0f} bps"

def format_delay(ms: int) -> str:
    """Format delay in human-readable format"""
    if ms >= 1000:
        return f"{ms / 1000:.1f}s"
    else:
        return f"{ms}ms"

def get_system_info() -> Dict[str, any]:
    """Get system information"""
    return {
        'python_version': subprocess.check_output(['python3', '--version']).decode().strip(),
        'kernel_version': subprocess.check_output(['uname', '-r']).decode().strip(),
        'has_root': check_root_privileges(),
        'has_tc': check_tc_availability(),
        'available_interfaces': get_available_interfaces(),
        'cpu_count': psutil.cpu_count(),
        'memory_total_gb': round(psutil.virtual_memory().total / (1024**3), 2)
    }

def ping_test(host: str = "8.8.8.8", count: int = 4) -> Dict[str, any]:
    """Perform a ping test to check connectivity"""
    try:
        result = subprocess.run(
            ['ping', '-c', str(count), host],
            capture_output=True,
            text=True,
            timeout=10
        )
        output = result.stdout
        packet_loss = 0
        avg_time = 0
        if 'packet loss' in output:
            loss_match = re.search(r'(\d+)% packet loss', output)
            packet_loss = int(loss_match.group(1)) if loss_match else 0
            # Try to parse avg time from rtt line (Linux)
            rtt_match = re.search(r'rtt min/avg/max/mdev = [^/]+/([^/]+)/', output)
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
        return {
            'success': False,
            'host': host,
            'error': result.stderr or 'Ping failed',
            'output': result.stdout,
            'packet_loss_percent': packet_loss,
            'avg_time_ms': avg_time
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