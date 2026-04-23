"""
Sensor drivers for the Zedd Weather edge node.
Each driver provides a consistent ``read()`` → ``dict`` interface.
When the underlying hardware is not present a driver logs a warning
and returns an empty dict — no simulated or mock data is ever emitted.
"""

from Zweather.node1_telemetry.sensors.sensor_manager import SensorManager

__all__ = ["SensorManager"]
