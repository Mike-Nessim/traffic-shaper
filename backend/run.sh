#!/bin/bash

# Traffic Shaper Server Startup Script

echo "Starting Traffic Shaper Server..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run as root (use sudo)"
    echo "Traffic control requires root privileges"
    exit 1
fi

# Check if required packages are installed
if ! command -v tc &> /dev/null; then
    echo "Error: 'tc' command not found. Please install iproute2:"
    echo "  Ubuntu/Debian: sudo apt-get install iproute2"
    echo "  CentOS/RHEL: sudo yum install iproute"
    exit 1
fi

# Check if Python dependencies are installed
if ! python3 -c "import fastapi, uvicorn, psutil, netifaces" 2>/dev/null; then
    echo "Error: Required Python packages not found."
    echo "Please install dependencies: pip install -r requirements.txt"
    exit 1
fi

# Create log directory
mkdir -p logs

# Start the server
echo "Starting server on http://0.0.0.0:8000"
echo "Press Ctrl+C to stop the server"
echo "API documentation available at: http://localhost:8000/docs"
echo ""

python3 main.py 2>&1 | tee logs/traffic-shaper.log 