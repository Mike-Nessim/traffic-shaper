# Changelog

All notable changes to the Traffic Shaper Control Panel project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2024-01-XX

### Added
- **Auto-Start Service Management**
  - SystemD service integration for production deployment
  - Auto-start on system boot and after power loss
  - Auto-restart on service failure with 10-second delay
  - Service dependency management (frontend waits for backend)
  - Professional service management with proper user permissions

- **Service Management Tools**
  - `manage-services.sh` script for easy service control
  - Comprehensive service status monitoring
  - Service log viewing and debugging tools
  - Service testing and health checks
  - Enable/disable auto-start functionality

- **SystemD Integration**
  - `traffic-shaper-backend.service` - Backend API service
  - `traffic-shaper-frontend.service` - Frontend React service
  - Proper security settings and capabilities
  - SystemD journal logging integration
  - Service isolation and protection

- **Startup Scripts**
  - `backend/start-backend.sh` - Robust backend startup
  - `ui/start-frontend.sh` - Frontend startup with environment
  - Virtual environment activation handling
  - Environment variable management
  - Error handling and logging

### Enhanced
- **Documentation Updates**
  - Comprehensive service management documentation
  - Auto-start setup instructions
  - Troubleshooting guide for services
  - SystemD command reference
  - Service debugging procedures

- **Reliability Improvements**
  - Services survive system reboots and power outages
  - Automatic recovery from crashes
  - Proper permission handling for root services
  - Enhanced error logging and monitoring

### Technical Improvements
- **Service Architecture**
  - Backend runs as root with network capabilities
  - Frontend runs as user with restricted permissions
  - Proper working directory and environment setup
  - Service dependency chain management

- **Security Enhancements**
  - Minimal privilege principle for services
  - Proper capability bounding for network operations
  - Service isolation with systemd security features
  - Protected system and home directories

## [1.0.0] - 2024-01-XX

### Added
- **Traffic Shaping Engine**
  - Bidirectional bandwidth limiting (upload/download)
  - Network latency simulation
  - Real-time traffic control with Linux TC
  - Support for multiple network interfaces
  - Automatic filter creation for traffic routing

- **Real-time Monitoring System**
  - Live traffic speed graphs with Canvas rendering
  - Per-interface statistics and monitoring
  - Historical data tracking (30-point rolling window)
  - Real-time bandwidth utilization metrics
  - Total data transfer tracking

- **Modern Web Dashboard**
  - React-based responsive user interface
  - Professional design with modern UI components
  - Real-time status indicators with colored circles
  - Mobile-friendly responsive layout
  - Intuitive tab-based navigation

- **Network Management**
  - DHCP server integration with dnsmasq
  - Connected clients monitoring and management
  - Network interface status and configuration
  - IP address assignment tracking
  - Network connectivity testing (ping)

- **System Monitoring**
  - CPU and memory usage tracking
  - System resource monitoring
  - Network interface statistics
  - Real-time system health indicators

- **Backend API**
  - FastAPI-based REST API
  - Real-time traffic statistics endpoint
  - Configuration management endpoints
  - Network interface information API
  - DHCP client management API

### Technical Features
- **Traffic Control Integration**
  - HTB (Hierarchical Token Bucket) qdisc implementation
  - Netem (Network Emulation) for latency simulation
  - U32 filters for traffic classification
  - Automatic cleanup of existing rules

- **Real-time Data Processing**
  - `/proc/net/dev` parsing for network statistics
  - Differential calculation for speed metrics
  - Efficient data aggregation and filtering
  - Memory-efficient historical data storage

- **Security & Performance**
  - Root privilege management for system operations
  - Error handling and graceful degradation
  - Efficient network monitoring with minimal overhead
  - Secure configuration management

### UI/UX Improvements
- **Status Visualization**
  - Large colored status circles (Green: Active, Red: Inactive)
  - Real-time status updates without page refresh
  - Professional card-based layout design
  - Consistent spacing and typography

- **Navigation & Layout**
  - Five main tabs: Controls, Status, Interfaces, Clients, Monitoring
  - Side margins for better content presentation
  - Responsive grid layouts
  - Intuitive button placement and spacing

- **Interactive Elements**
  - Auto-refresh toggle for monitoring
  - Manual refresh capabilities
  - Real-time form validation
  - Immediate visual feedback for actions

### Bug Fixes
- Fixed traffic shaping not applying to upload traffic
- Resolved filter creation issues with specific IP ranges
- Corrected interface selection and traffic routing
- Fixed API endpoint routing conflicts
- Resolved DHCP lease parsing errors

### Performance Optimizations
- Optimized Canvas rendering for real-time graphs
- Efficient data fetching with minimal API calls
- Reduced memory usage in historical data storage
- Improved traffic control rule application speed

### Documentation
- Comprehensive README with installation instructions
- API documentation with endpoint descriptions
- Troubleshooting guide with common issues
- Development setup and contribution guidelines

## [Unreleased]

### Planned Features
- Advanced QoS with priority queues
- Time-based bandwidth scheduling
- Multi-user access control
- JWT-based API authentication
- Database integration for persistent storage
- Docker containerization
- Grafana dashboard integration
- Mobile application
- Web UI production build optimization
- SSL/TLS support for HTTPS
- Configuration backup and restore system

### Known Issues
- Some ESLint warnings for unused imports (non-functional)
- Development server warnings (harmless)

---

## Version History

- **v1.1.0** - Auto-start services and production deployment features
- **v1.0.0** - Initial release with full traffic shaping and monitoring capabilities
- **v0.9.0** - Beta release with core functionality
- **v0.8.0** - Alpha release with basic traffic shaping
- **v0.7.0** - Development release with UI framework
- **v0.6.0** - Early development with backend API
- **v0.5.0** - Proof of concept with Linux TC integration 