"""
Node 1: Telemetry — Raspberry Pi edge sensor node for Zedd Weather.
Acquires micro-climate telemetry via the BCRobotics Weather HAT PRO
(primary), optional Sense HAT v2, and additional GPIO / I2C / Modbus
peripherals, then publishes aggregated data over MQTT to the
orchestration layer.
"""
