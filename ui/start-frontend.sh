#!/bin/bash

# Traffic Shaper Frontend Startup Script
cd /home/devonics/traffic-shapper/ui

# Set environment variables
export NODE_ENV=development
export BROWSER=none
export PORT=80
export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

# Start the React development server
exec /usr/bin/npm start 