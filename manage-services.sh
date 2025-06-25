#!/bin/bash

# Traffic Shaper Service Management Script

BACKEND_SERVICE="traffic-shaper-backend.service"
FRONTEND_SERVICE="traffic-shaper-frontend.service"

case "$1" in
    start)
        echo "🚀 Starting Traffic Shaper services..."
        sudo systemctl start $BACKEND_SERVICE
        sudo systemctl start $FRONTEND_SERVICE
        echo "✅ Services started"
        ;;
    stop)
        echo "🛑 Stopping Traffic Shaper services..."
        sudo systemctl stop $FRONTEND_SERVICE
        sudo systemctl stop $BACKEND_SERVICE
        echo "✅ Services stopped"
        ;;
    restart)
        echo "🔄 Restarting Traffic Shaper services..."
        sudo systemctl restart $BACKEND_SERVICE
        sudo systemctl restart $FRONTEND_SERVICE
        echo "✅ Services restarted"
        ;;
    status)
        echo "📊 Traffic Shaper Service Status:"
        echo "================================"
        echo "Backend Service:"
        sudo systemctl is-active $BACKEND_SERVICE
        echo "Frontend Service:"
        sudo systemctl is-active $FRONTEND_SERVICE
        echo ""
        echo "Detailed Status:"
        sudo systemctl status $BACKEND_SERVICE --no-pager -l
        echo ""
        sudo systemctl status $FRONTEND_SERVICE --no-pager -l
        ;;
    enable)
        echo "🔧 Enabling auto-start for Traffic Shaper services..."
        sudo systemctl enable $BACKEND_SERVICE
        sudo systemctl enable $FRONTEND_SERVICE
        echo "✅ Auto-start enabled"
        ;;
    disable)
        echo "🔧 Disabling auto-start for Traffic Shaper services..."
        sudo systemctl disable $BACKEND_SERVICE
        sudo systemctl disable $FRONTEND_SERVICE
        echo "✅ Auto-start disabled"
        ;;
    logs)
        echo "📝 Traffic Shaper Service Logs:"
        echo "==============================="
        echo "Backend logs (last 20 lines):"
        sudo journalctl -u $BACKEND_SERVICE --no-pager -n 20
        echo ""
        echo "Frontend logs (last 20 lines):"
        sudo journalctl -u $FRONTEND_SERVICE --no-pager -n 20
        ;;
    test)
        echo "🧪 Testing Traffic Shaper services..."
        echo "Testing backend API..."
        if curl -s http://localhost:8000/api > /dev/null; then
            echo "✅ Backend API is responding"
        else
            echo "❌ Backend API is not responding"
        fi
        
        echo "Testing frontend..."
        if curl -s http://localhost:3000 > /dev/null; then
            echo "✅ Frontend is responding"
        else
            echo "❌ Frontend is not responding"
        fi
        ;;
    *)
        echo "Traffic Shaper Service Manager"
        echo "Usage: $0 {start|stop|restart|status|enable|disable|logs|test}"
        echo ""
        echo "Commands:"
        echo "  start    - Start both services"
        echo "  stop     - Stop both services"
        echo "  restart  - Restart both services"
        echo "  status   - Show service status"
        echo "  enable   - Enable auto-start on boot"
        echo "  disable  - Disable auto-start on boot"
        echo "  logs     - Show recent service logs"
        echo "  test     - Test if services are responding"
        exit 1
        ;;
esac 