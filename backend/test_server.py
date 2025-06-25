#!/usr/bin/env python3
"""
Test script for the Traffic Shaper Server
"""

import requests
import json
import time
import sys
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

def test_endpoint(endpoint: str, method: str = "GET", data: Dict[str, Any] = None) -> Dict[str, Any]:
    """Test an API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    
    try:
        if method == "GET":
            response = requests.get(url, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=10)
        else:
            return {"success": False, "error": f"Unsupported method: {method}"}
        
        return {
            "success": response.status_code < 400,
            "status_code": response.status_code,
            "data": response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
        }
    
    except requests.exceptions.ConnectionError:
        return {"success": False, "error": "Connection refused - is the server running?"}
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Request timeout"}
    except Exception as e:
        return {"success": False, "error": str(e)}

def print_test_result(test_name: str, result: Dict[str, Any]):
    """Print test result"""
    status = "✓ PASS" if result["success"] else "✗ FAIL"
    print(f"{status} {test_name}")
    
    if not result["success"]:
        print(f"   Error: {result.get('error', 'Unknown error')}")
    elif "data" in result:
        if isinstance(result["data"], dict):
            print(f"   Response: {json.dumps(result['data'], indent=2)}")
        else:
            print(f"   Response: {result['data']}")
    print()

def main():
    """Run all tests"""
    print("Traffic Shaper Server Test Suite")
    print("=" * 40)
    print()
    
    # Test 1: Server health check
    result = test_endpoint("/")
    print_test_result("Server Health Check", result)
    
    if not result["success"]:
        print("Server is not responding. Please start the server first:")
        print("cd backend && sudo python main.py")
        sys.exit(1)
    
    # Test 2: Get system status
    result = test_endpoint("/status")
    print_test_result("Get System Status", result)
    
    # Test 3: Get available interfaces
    result = test_endpoint("/interfaces")
    print_test_result("Get Available Interfaces", result)
    
    # Test 4: Get current configuration
    result = test_endpoint("/config")
    print_test_result("Get Current Configuration", result)
    
    # Test 5: Test configuration update (without enabling)
    test_config = {
        "enabled": False,
        "delay_ms": 100,
        "bandwidth_mbps": 10.0,
        "interface_in": "eth0",
        "interface_out": "eth1"
    }
    result = test_endpoint("/config", "POST", test_config)
    print_test_result("Update Configuration (Disabled)", result)
    
    # Test 6: Reset configuration
    result = test_endpoint("/reset", "POST")
    print_test_result("Reset Configuration", result)
    
    # Test 7: Invalid configuration test
    invalid_config = {
        "enabled": True,
        "delay_ms": -100,  # Invalid negative delay
        "bandwidth_mbps": 10.0,
        "interface_in": "nonexistent",
        "interface_out": "eth1"
    }
    result = test_endpoint("/config", "POST", invalid_config)
    # This should fail, so we invert the success for this test
    result["success"] = not result["success"]
    print_test_result("Invalid Configuration Handling", result)
    
    print("Test suite completed!")
    print()
    print("Note: To test actual traffic shaping functionality:")
    print("1. Ensure you have two network interfaces")
    print("2. Run the server with root privileges")
    print("3. Configure valid interface names")
    print("4. Enable traffic shaping and test network performance")

if __name__ == "__main__":
    main() 