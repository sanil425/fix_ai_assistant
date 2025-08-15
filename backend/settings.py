"""
Application settings and configuration.
"""

import os
from typing import Literal

# App configuration
APP_NAME = os.getenv("APP_NAME", "fix-api")
DEFAULT_FIX_VERSION = os.getenv("DEFAULT_FIX_VERSION", "4.4")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# FIX version support
FixVersion = Literal["4.4"]  # Prepare for future versions
Delimiter = Literal["|"]     # Clients send | only; server converts to SOH internally
