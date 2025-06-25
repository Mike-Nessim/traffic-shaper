#!/bin/bash

# Traffic Shaper Backend Startup Script
cd /home/devonics/traffic-shapper/backend

# Activate virtual environment
source venv/bin/activate

# Start the FastAPI server
exec python main.py 