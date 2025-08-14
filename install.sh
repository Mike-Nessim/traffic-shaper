#!/bin/bash

#=============================================================================
# Traffic Shaper Installation Script
# 
# This script installs and configures the Traffic Shaper application
# on Ubuntu/Debian systems with automatic network configuration.
#
# Usage: sudo ./install.sh [--uninstall]
#=============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="traffic-shaper"
INSTALL_DIR="/opt/traffic-shaper"
LOG_FILE="/var/log/traffic-shaper-install.log"
SERVICE_USER="root"
DEFAULT_OUTPUT_IP="172.22.22.1"

# Create log file
exec > >(tee -a "$LOG_FILE")
exec 2>&1

#=============================================================================
# Utility Functions
#=============================================================================

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root. Use: sudo ./install.sh"
    fi
}

#=============================================================================
# System Checks
#=============================================================================

check_os() {
    log "Checking operating system compatibility..."
    
    if [[ ! -f /etc/os-release ]]; then
        error "Cannot detect OS. /etc/os-release not found."
    fi
    
    source /etc/os-release
    
    case "$ID" in
        ubuntu)
            if [[ $(echo "$VERSION_ID >= 18.04" | bc -l 2>/dev/null || echo "0") -eq 0 ]]; then
                error "Ubuntu 18.04 or later is required. Found: $VERSION_ID"
            fi
            ;;
        debian)
            if [[ $(echo "$VERSION_ID >= 10" | bc -l 2>/dev/null || echo "0") -eq 0 ]]; then
                error "Debian 10 or later is required. Found: $VERSION_ID"
            fi
            ;;
        *)
            error "Unsupported OS: $ID. This script supports Ubuntu 18.04+ and Debian 10+"
            ;;
    esac
    
    info "OS Check passed: $PRETTY_NAME"
}

check_architecture() {
    log "Checking system architecture..."
    
    ARCH=$(uname -m)
    if [[ "$ARCH" != "x86_64" ]]; then
        error "Unsupported architecture: $ARCH. Only x86_64 is supported."
    fi
    
    info "Architecture check passed: $ARCH"
}

check_system_resources() {
    log "Checking system resources..."
    
    # Check RAM (minimum 2GB)
    TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
    if [[ $TOTAL_RAM -lt 1900 ]]; then
        warn "Low memory detected: ${TOTAL_RAM}MB. Minimum 2GB recommended."
    fi
    
    # Check disk space (minimum 1GB free)
    AVAILABLE_SPACE=$(df / | awk 'NR==2 {print $4}')
    if [[ $AVAILABLE_SPACE -lt 1000000 ]]; then  # 1GB in KB
        warn "Low disk space detected. Minimum 1GB free space recommended."
    fi
    
    info "System resources check completed"
}

check_network_interfaces() {
    log "Checking network interfaces..."
    
    # Get ethernet interfaces
    ETHERNET_INTERFACES=($(ip link show | grep -E "enp|eth" | awk -F: '{print $2}' | tr -d ' '))
    
    if [[ ${#ETHERNET_INTERFACES[@]} -lt 1 ]]; then
        error "No ethernet interfaces found. Traffic shaping requires at least 1 ethernet interface."
    fi
    
    if [[ ${#ETHERNET_INTERFACES[@]} -lt 2 ]]; then
        warn "Only 1 ethernet interface found. Traffic shaping works best with 2 interfaces (input/output)."
        warn "Will use ${ETHERNET_INTERFACES[0]} for both input and output."
        INPUT_INTERFACE="${ETHERNET_INTERFACES[0]}"
        OUTPUT_INTERFACE="${ETHERNET_INTERFACES[0]}"
    else
        INPUT_INTERFACE="${ETHERNET_INTERFACES[0]}"
        OUTPUT_INTERFACE="${ETHERNET_INTERFACES[1]}"
        info "Found ethernet interfaces: ${ETHERNET_INTERFACES[*]}"
        info "Input interface: $INPUT_INTERFACE"
        info "Output interface: $OUTPUT_INTERFACE"
    fi
}

check_ports() {
    log "Checking port availability..."
    
    REQUIRED_PORTS=(80 8000)
    for port in "${REQUIRED_PORTS[@]}"; do
        if ss -tuln | grep -q ":$port "; then
            error "Port $port is already in use. Please free the port and try again."
        fi
    done
    
    info "Port availability check passed"
}

#=============================================================================
# Installation Functions
#=============================================================================

update_system() {
    log "Updating system packages..."
    apt-get update -y
    info "System packages updated"
}

install_system_dependencies() {
    log "Installing system dependencies..."
    
    PACKAGES=(
        "iproute2"
        "dnsmasq"
        "netplan.io"
        "python3"
        "python3-pip"
        "python3-venv"
        "nodejs"
        "npm"
        "curl"
        "bc"
        "git"
    )
    
    for package in "${PACKAGES[@]}"; do
        info "Installing $package..."
        apt-get install -y "$package"
    done
    
    info "System dependencies installed"
}

install_python_dependencies() {
    log "Installing Python dependencies..."
    
    # Create virtual environment
    python3 -m venv "$INSTALL_DIR/venv"
    source "$INSTALL_DIR/venv/bin/activate"
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install Python packages
    pip install \
        fastapi==0.104.1 \
        uvicorn==0.24.0 \
        netifaces==0.11.0 \
        psutil==5.9.6 \
        pydantic==2.5.0
    
    info "Python dependencies installed"
}

install_nodejs_dependencies() {
    log "Installing Node.js dependencies..."
    
    # Ensure we're in the UI directory
    cd "$INSTALL_DIR/ui"
    
    # Install dependencies
    npm install
    
    # Build production version
    npm run build
    
    info "Node.js dependencies installed and application built"
}

setup_application_files() {
    log "Setting up application files..."
    
    # Create installation directory
    mkdir -p "$INSTALL_DIR"
    
    # Copy application files
    if [[ -d "backend" ]]; then
        cp -r backend "$INSTALL_DIR/"
        info "Backend files copied"
    else
        error "Backend directory not found. Please run this script from the traffic-shaper directory."
    fi
    
    if [[ -d "ui" ]]; then
        cp -r ui "$INSTALL_DIR/"
        info "Frontend files copied"
    else
        error "UI directory not found. Please run this script from the traffic-shaper directory."
    fi
    
    # Set proper permissions
    chown -R $SERVICE_USER:$SERVICE_USER "$INSTALL_DIR"
    chmod +x "$INSTALL_DIR/backend/main.py"
    
    info "Application files setup completed"
}

configure_network() {
    log "Configuring network interfaces..."
    
    # Configure output interface with static IP
    info "Configuring output interface $OUTPUT_INTERFACE with IP $DEFAULT_OUTPUT_IP"
    
    # Create netplan configuration
    cat > "/etc/netplan/99-traffic-shaper-$OUTPUT_INTERFACE.yaml" << EOF
network:
  version: 2
  ethernets:
    $OUTPUT_INTERFACE:
      dhcp4: false
      addresses:
        - $DEFAULT_OUTPUT_IP/24
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
EOF
    
    # Apply netplan configuration
    netplan apply
    
    # Configure dnsmasq for DHCP server on OUTPUT interface
    info "Configuring DHCP server on OUTPUT interface $OUTPUT_INTERFACE (second ethernet)"
    
    # Stop conflicting services
    systemctl stop isc-dhcp-server 2>/dev/null || true
    systemctl disable isc-dhcp-server 2>/dev/null || true
    
    # Configure dnsmasq
    cat > "/etc/dnsmasq.conf" << EOF
# dnsmasq configuration for traffic shaper
# DNS disabled, DHCP only
port=0

# Listen on $OUTPUT_INTERFACE interface only (OUTPUT interface)
interface=$OUTPUT_INTERFACE
bind-interfaces

# DHCP configuration for 172.22.22.0/24 network
dhcp-range=172.22.22.10,172.22.22.100,255.255.255.0,24h

# Network options
dhcp-option=3,172.22.22.1    # Default gateway
dhcp-option=6,8.8.8.8,8.8.4.4 # DNS servers

# DHCP settings
dhcp-authoritative
dhcp-leasefile=/var/lib/dhcp/dnsmasq.leases
log-dhcp

# Enable DHCP logging
log-facility=/var/log/dnsmasq.log
EOF
    
    # Create DHCP lease file
    mkdir -p /var/lib/dhcp
    touch /var/lib/dhcp/dnsmasq.leases
    
    # Enable and start dnsmasq
    systemctl enable dnsmasq
    systemctl restart dnsmasq
    
    info "Network configuration completed"
}

setup_systemd_services() {
    log "Setting up systemd services..."
    
    # Backend service
    cat > "/etc/systemd/system/traffic-shaper-backend.service" << EOF
[Unit]
Description=Traffic Shaper Backend
After=network.target

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=$INSTALL_DIR/backend
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=PYTHONPATH=$INSTALL_DIR/backend
ExecStart=$INSTALL_DIR/venv/bin/python main.py
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=false
PrivateTmp=false
ProtectSystem=false
ProtectHome=false

[Install]
WantedBy=multi-user.target
EOF

    # Frontend service
    cat > "/etc/systemd/system/traffic-shaper-frontend.service" << EOF
[Unit]
Description=Traffic Shaper Frontend
After=network.target traffic-shaper-backend.service

[Service]
Type=simple
User=root
Group=root
WorkingDirectory=$INSTALL_DIR/ui
Environment=PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=PORT=80
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

# Security settings
NoNewPrivileges=false
PrivateTmp=false
ProtectSystem=false
ProtectHome=false

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd and enable services
    systemctl daemon-reload
    systemctl enable traffic-shaper-backend
    systemctl enable traffic-shaper-frontend
    
    info "Systemd services configured"
}

start_services() {
    log "Starting services..."
    
    # Start backend
    systemctl start traffic-shaper-backend
    sleep 3
    
    # Start frontend
    systemctl start traffic-shaper-frontend
    sleep 3
    
    info "Services started"
}

#=============================================================================
# Verification Functions
#=============================================================================

verify_installation() {
    log "Verifying installation..."
    
    # Check services
    if ! systemctl is-active --quiet traffic-shaper-backend; then
        error "Backend service is not running"
    fi
    
    if ! systemctl is-active --quiet traffic-shaper-frontend; then
        error "Frontend service is not running"
    fi
    
    if ! systemctl is-active --quiet dnsmasq; then
        error "DHCP server (dnsmasq) is not running"
    fi
    
    # Check API endpoints
    info "Testing API endpoints..."
    sleep 5  # Give services time to fully start
    
    if ! curl -s http://localhost:8000/api > /dev/null; then
        error "Backend API is not responding"
    fi
    
    if ! curl -s http://localhost > /dev/null; then
        warn "Frontend is not responding immediately. It may take a few more moments to start."
    fi
    
    info "Installation verification completed"
}

show_completion_info() {
    echo ""
    echo -e "${GREEN}================================${NC}"
    echo -e "${GREEN}  Traffic Shaper Installation   ${NC}"
    echo -e "${GREEN}       COMPLETED! ✅             ${NC}"
    echo -e "${GREEN}================================${NC}"
    echo ""
    echo -e "${BLUE}🌐 Web Interface:${NC} http://$DEFAULT_OUTPUT_IP"
    echo -e "${BLUE}🔧 Backend API:${NC} http://$DEFAULT_OUTPUT_IP:8000"
    echo -e "${BLUE}📡 Input Interface:${NC} $INPUT_INTERFACE (DHCP/configurable)"
    echo -e "${BLUE}📤 Output Interface:${NC} $OUTPUT_INTERFACE ($DEFAULT_OUTPUT_IP/24 - Static)"
    echo -e "${BLUE}🌍 DHCP Server:${NC} Active on OUTPUT interface (172.22.22.10-100)"
    echo ""
    echo -e "${YELLOW}📋 Services Status:${NC}"
    echo -e "  ✅ traffic-shaper-backend: $(systemctl is-active traffic-shaper-backend)"
    echo -e "  ✅ traffic-shaper-frontend: $(systemctl is-active traffic-shaper-frontend)"
    echo -e "  ✅ dnsmasq: $(systemctl is-active dnsmasq)"
    echo ""
    echo -e "${GREEN}🔗 Access your traffic shaper at: http://$DEFAULT_OUTPUT_IP${NC}"
    echo ""
    echo -e "${YELLOW}📝 Installation log saved to: $LOG_FILE${NC}"
    echo ""
}

#=============================================================================
# Uninstall Functions
#=============================================================================

uninstall() {
    log "Starting uninstallation..."
    
    # Stop and disable services
    systemctl stop traffic-shaper-backend 2>/dev/null || true
    systemctl stop traffic-shaper-frontend 2>/dev/null || true
    systemctl disable traffic-shaper-backend 2>/dev/null || true
    systemctl disable traffic-shaper-frontend 2>/dev/null || true
    
    # Remove service files
    rm -f /etc/systemd/system/traffic-shaper-backend.service
    rm -f /etc/systemd/system/traffic-shaper-frontend.service
    systemctl daemon-reload
    
    # Remove application files
    rm -rf "$INSTALL_DIR"
    
    # Remove netplan configuration
    rm -f "/etc/netplan/99-traffic-shaper-$OUTPUT_INTERFACE.yaml" 2>/dev/null || true
    
    # Reset dnsmasq (but don't remove it)
    systemctl stop dnsmasq 2>/dev/null || true
    rm -f /etc/dnsmasq.conf
    
    # Apply netplan to reset network
    netplan apply 2>/dev/null || true
    
    log "Uninstallation completed"
    echo -e "${GREEN}Traffic Shaper has been uninstalled successfully.${NC}"
}

#=============================================================================
# Main Installation Flow
#=============================================================================

main() {
    echo -e "${BLUE}"
    echo "================================"
    echo "  Traffic Shaper Installer"
    echo "================================"
    echo -e "${NC}"
    
    log "Starting Traffic Shaper installation..."
    
    # Pre-installation checks
    check_root
    check_os
    check_architecture
    check_system_resources
    check_network_interfaces
    check_ports
    
    # Installation
    update_system
    install_system_dependencies
    setup_application_files
    install_python_dependencies
    install_nodejs_dependencies
    configure_network
    setup_systemd_services
    start_services
    
    # Verification and completion
    verify_installation
    show_completion_info
    
    log "Installation completed successfully!"
}

#=============================================================================
# Script Entry Point
#=============================================================================

# Handle command line arguments
case "${1:-}" in
    --uninstall|-u)
        check_root
        check_network_interfaces  # To get interface names
        uninstall
        exit 0
        ;;
    --help|-h)
        echo "Usage: sudo ./install.sh [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --uninstall, -u    Uninstall Traffic Shaper"
        echo "  --help, -h         Show this help message"
        echo ""
        echo "Default action: Install Traffic Shaper"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        error "Unknown option: $1. Use --help for usage information."
        ;;
esac
