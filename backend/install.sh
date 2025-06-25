#!/bin/bash

# Traffic Shaper Server Installation Script

set -e

echo "Traffic Shaper Server Installation"
echo "=================================="

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "This script requires root privileges for system package installation."
    echo "Please run with sudo: sudo ./install.sh"
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$NAME
    VERSION=$VERSION_ID
else
    echo "Cannot detect OS. Please install dependencies manually."
    exit 1
fi

echo "Detected OS: $OS $VERSION"

# Install system dependencies
echo "Installing system dependencies..."

if [[ "$OS" == *"Ubuntu"* ]] || [[ "$OS" == *"Debian"* ]]; then
    apt-get update
    apt-get install -y python3 python3-pip python3-venv iproute2 net-tools
elif [[ "$OS" == *"CentOS"* ]] || [[ "$OS" == *"Red Hat"* ]] || [[ "$OS" == *"Fedora"* ]]; then
    if command -v dnf &> /dev/null; then
        dnf install -y python3 python3-pip iproute net-tools
    else
        yum install -y python3 python3-pip iproute net-tools
    fi
else
    echo "Unsupported OS. Please install the following packages manually:"
    echo "- python3"
    echo "- python3-pip"
    echo "- iproute2 (or iproute)"
    echo "- net-tools"
    exit 1
fi

# Create virtual environment
echo "Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Create configuration file
if [ ! -f .env ]; then
    echo "Creating configuration file..."
    cp .env.example .env
    echo "Configuration file created at .env - please review and modify as needed"
fi

# Create systemd service file
echo "Creating systemd service..."
cat > /etc/systemd/system/traffic-shaper.service << EOF
[Unit]
Description=Traffic Shaper Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$(pwd)
Environment=PATH=$(pwd)/venv/bin
ExecStart=$(pwd)/venv/bin/python main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
systemctl daemon-reload
systemctl enable traffic-shaper.service

echo ""
echo "Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Review configuration in .env file"
echo "2. Start the service: sudo systemctl start traffic-shaper"
echo "3. Check status: sudo systemctl status traffic-shaper"
echo "4. View logs: sudo journalctl -u traffic-shaper -f"
echo ""
echo "The server will be available at http://localhost:8000"
echo "API documentation: http://localhost:8000/docs" 