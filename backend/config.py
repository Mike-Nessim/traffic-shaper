"""
Configuration settings for the Traffic Shaper Server
"""

import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Config:
    """Application configuration"""
    
    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # Default traffic shaping limits
    MAX_DELAY_MS: int = int(os.getenv("MAX_DELAY_MS", "10000"))  # 10 seconds max
    MAX_BANDWIDTH_MBPS: float = float(os.getenv("MAX_BANDWIDTH_MBPS", "1000.0"))  # 1 Gbps max
    MIN_BANDWIDTH_MBPS: float = float(os.getenv("MIN_BANDWIDTH_MBPS", "0.1"))  # 100 Kbps min
    
    # Default interface names (can be overridden)
    DEFAULT_INTERFACE_IN: Optional[str] = os.getenv("DEFAULT_INTERFACE_IN")
    DEFAULT_INTERFACE_OUT: Optional[str] = os.getenv("DEFAULT_INTERFACE_OUT")
    
    # Security settings
    ALLOWED_ORIGINS: list = os.getenv("ALLOWED_ORIGINS", "*").split(",")
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    
    # System checks
    REQUIRE_ROOT: bool = os.getenv("REQUIRE_ROOT", "true").lower() == "true"

# Global config instance
config = Config() 