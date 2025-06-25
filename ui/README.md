# Traffic Shaper Control Panel - Frontend

A professional React-based web interface for controlling and monitoring the Traffic Shaper Server. This modern, responsive UI provides intuitive controls for network traffic shaping, real-time system monitoring, and comprehensive network interface management.

## Features

### 🔐 **Authentication**
- Secure login with hardcoded credentials
- Session persistence with localStorage
- Professional login form with password visibility toggle
- Demo credentials displayed for easy access

### 🎛️ **Traffic Control Dashboard**
- **Real-time Controls**: Enable/disable traffic shaping with one click
- **Packet Delay**: Configure packet delays from 0-10000ms
- **Bandwidth Limiting**: Set bandwidth limits from 0.1-1000 Mbps
- **Interface Selection**: Choose input and output network interfaces
- **Quick Actions**: Instant enable/disable and reset functionality
- **Live Status**: Real-time configuration display

### 📊 **System Monitoring**
- **Resource Metrics**: CPU and memory usage with progress bars
- **Traffic Status**: Current traffic shaping configuration
- **Interface Overview**: Network interface status summary
- **Auto-refresh**: Automatic updates every 10 seconds

### 🌐 **Network Interface Management**
- **Interface Discovery**: Automatic detection of available interfaces
- **Detailed Information**: MAC addresses, IP addresses, speeds, MTU
- **Interactive Selection**: Click to view detailed interface information
- **Real-time Status**: Live interface status (UP/DOWN)

### 🎨 **Professional Design**
- **Modern UI**: Clean, gradient-based design with glassmorphism effects
- **Responsive Layout**: Optimized for desktop, tablet, and mobile
- **Smooth Animations**: Fade-in, slide-in, and hover effects
- **Consistent Styling**: Professional color scheme and typography
- **Accessible**: Proper ARIA labels and keyboard navigation

## Technology Stack

- **React 18**: Modern React with hooks and functional components
- **Axios**: HTTP client for API communication
- **Lucide React**: Beautiful, consistent icons
- **CSS3**: Custom styling with modern features
- **Responsive Design**: Mobile-first approach

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Traffic Shaper Server running on port 8000

### Quick Start

1. **Install Dependencies**
```bash
cd ui
npm install
```

2. **Start Development Server**
```bash
npm start
```

3. **Access the Application**
Open [http://localhost:3000](http://localhost:3000) in your browser

### Production Build

```bash
npm run build
```

## Authentication

### Default Credentials
- **Username**: `devonics`
- **Password**: `LetsAutomate`

The credentials are hardcoded in the authentication context and displayed on the login form for convenience.

## API Integration

The frontend communicates with the backend via REST API:

### Endpoints Used
- `GET /` - Health check
- `GET /status` - System status and configuration
- `GET /interfaces` - Network interfaces
- `GET /config` - Current traffic shaping configuration
- `POST /config` - Update traffic shaping configuration
- `POST /reset` - Reset to default configuration

### Proxy Configuration
The React app is configured to proxy API requests to `http://localhost:8000` during development.

## Component Architecture

```
src/
├── components/
│   ├── LoginForm.js          # Authentication form
│   ├── Dashboard.js          # Main dashboard layout
│   ├── TrafficControls.js    # Traffic shaping controls
│   ├── SystemStatus.js       # System monitoring
│   ├── NetworkInterfaces.js  # Interface management
│   ├── LoginForm.css         # Login form styles
│   ├── Dashboard.css         # Dashboard layout styles
│   └── Components.css        # Shared component styles
├── contexts/
│   └── AuthContext.js        # Authentication state management
├── App.js                    # Main application component
├── App.css                   # Global application styles
├── index.js                  # React application entry point
└── index.css                 # Global CSS and animations
```

## Key Features Explained

### 🔄 **Real-time Updates**
- System status updates every 10 seconds
- Network interfaces refresh every 15 seconds
- Server connectivity monitoring every 30 seconds
- Manual refresh buttons on all tabs

### 🎯 **Smart Validation**
- Input validation for delay (0-10000ms) and bandwidth (0.1-1000 Mbps)
- Interface availability checking
- Form validation with helpful error messages
- Prevents invalid configurations

### 📱 **Responsive Design**
- **Desktop**: Full-featured layout with side-by-side panels
- **Tablet**: Stacked layout with optimized spacing
- **Mobile**: Single-column layout with touch-friendly controls

### 🔧 **Configuration Management**
- **Quick Toggle**: Enable/disable with one click
- **Form Controls**: Detailed configuration options
- **Reset Function**: Return to default settings
- **Live Preview**: See current configuration at all time

## Styling & Design

### Color Scheme
- **Primary**: Purple gradient (#667eea to #764ba2)
- **Success**: Green (#10b981)
- **Warning**: Orange (#f59e0b)
- **Danger**: Red (#ef4444)
- **Neutral**: Gray scale for text and backgrounds

### Typography
- **Font Family**: Inter (modern, clean typeface)
- **Weights**: 300, 400, 500, 600, 700
- **Responsive**: Scales appropriately on different screen sizes

### Effects
- **Glassmorphism**: Backdrop blur effects on cards
- **Gradients**: Subtle gradients for visual depth
- **Shadows**: Layered shadows for card elevation
- **Animations**: Smooth transitions and micro-interactions

## Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Create production build
- `npm test` - Run test suite
- `npm eject` - Eject from Create React App

### Code Style
- Functional components with hooks
- Consistent naming conventions
- Comprehensive error handling
- Responsive design patterns
- Accessible markup

## Browser Support

- **Chrome**: Latest 2 versions
- **Firefox**: Latest 2 versions
- **Safari**: Latest 2 versions
- **Edge**: Latest 2 versions

## Security Considerations

1. **Authentication**: Currently uses hardcoded credentials
2. **CORS**: Backend configured to allow frontend origin
3. **Input Validation**: Client-side validation with server-side backup
4. **Session Management**: Basic localStorage-based sessions

## Future Enhancements

### Planned Features
- User management system
- Historical data visualization
- Advanced traffic shaping rules
- Export/import configurations
- Real-time charts and graphs
- Dark/light theme toggle
- Multi-language support

### Technical Improvements
- TypeScript migration
- Unit test coverage
- E2E testing with Cypress
- Performance optimization
- PWA capabilities
- Docker containerization

## Troubleshooting

### Common Issues

1. **Cannot connect to backend**
   - Ensure backend server is running on port 8000
   - Check proxy configuration in package.json

2. **Login not working**
   - Verify credentials: devonics / LetsAutomate
   - Check browser console for errors

3. **Interface data not loading**
   - Ensure backend has proper permissions
   - Check network connectivity

4. **Styling issues**
   - Clear browser cache
   - Ensure all CSS files are loading

### Debug Mode
Enable debug logging by setting `REACT_APP_DEBUG=true` in environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the Traffic Shaper system. See the main project LICENSE file for details. 