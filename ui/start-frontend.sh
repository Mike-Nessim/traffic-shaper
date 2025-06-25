#!/bin/bash

# Traffic Shaper Frontend Startup Script
cd /home/devonics/traffic-shapper/ui

# Set environment variables
export NODE_ENV=development
export BROWSER=none

# Start the React development server
exec npm start 