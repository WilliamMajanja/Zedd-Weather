"""
Zedd Weather – Edge Telemetry Publisher (InfluxDB)
===================================================
Reads temperature, humidity, and barometric pressure from the Sense HAT
every PUBLISH_INTERVAL seconds and writes the data-points to an InfluxDB v2
instance running on the PiNet cluster (pinet-alpha).

All connection parameters are provided via environment variables so that
Kubernetes ConfigMaps and Secrets can inject them without rebuilding the
image.

Environment variables
---------------------
INFLUXDB_URL          URL of the InfluxDB service (default: http://influxdb:8086)
INFLUXDB_TOKEN        Authentication token for InfluxDB
INFLUXDB_ORG          Organisation name in InfluxDB (default: zedd-weather)
INFLUXDB_BUCKET       Target bucket (default: telemetry)
PUBLISH_INTERVAL      Seconds between readings (default: 10)
SENSE_HAT_TEMP_OFFSET Degrees Celsius to subtract from the raw HAT reading to
                      compensate for CPU heat (default: 2.0)
LOG_LEVEL             Python log level string (default: INFO)
"""

import os
import time
import logging
import sys

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger("zedd-weather-edge")

# ---------------------------------------------------------------------------
# Configuration from environment
# ---------------------------------------------------------------------------
INFLUXDB_URL = os.getenv("INFLUXDB_URL", "http://influxdb:8086")
INFLUXDB_TOKEN = os.getenv("INFLUXDB_TOKEN", "")
INFLUXDB_ORG = os.getenv("INFLUXDB_ORG", "zedd-weather")
INFLUXDB_BUCKET = os.getenv("INFLUXDB_BUCKET", "telemetry")
PUBLISH_INTERVAL = float(os.getenv("PUBLISH_INTERVAL", "10.0"))
SENSE_HAT_TEMP_OFFSET = float(os.getenv("SENSE_HAT_TEMP_OFFSET", "2.0"))
NODE_NAME = os.getenv("NODE_NAME", "pinet-rho")

# ---------------------------------------------------------------------------
# InfluxDB client
# ---------------------------------------------------------------------------
try:
    from influxdb_client import InfluxDBClient, Point, WritePrecision
    from influxdb_client.client.write_api import SYNCHRONOUS
    from influxdb_client.client.exceptions import InfluxDBError
except ImportError as exc:
    logger.critical("influxdb-client package not installed: %s", exc)
    sys.exit(1)

# ---------------------------------------------------------------------------
# Sense HAT
# ---------------------------------------------------------------------------
try:
    from sense_hat import SenseHat
    _sense = SenseHat()
    logger.info("Sense HAT initialised successfully.")
except Exception as exc:  # noqa: BLE001
    logger.critical("Failed to initialise Sense HAT: %s", exc)
    sys.exit(1)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _read_sensors() -> dict:
    """Return a dict with temperature_c, humidity_pct, pressure_hpa."""
    raw_temp = _sense.get_temperature()
    # Apply CPU heat compensation
    temperature_c = round(raw_temp - SENSE_HAT_TEMP_OFFSET, 2)
    humidity_pct = round(_sense.get_humidity(), 2)
    pressure_hpa = round(_sense.get_pressure(), 2)
    return {
        "temperature_c": temperature_c,
        "humidity_pct": humidity_pct,
        "pressure_hpa": pressure_hpa,
    }


def _build_point(reading: dict) -> Point:
    """Convert a sensor reading dict into an InfluxDB Point."""
    return (
        Point("environment")
        .tag("sensor", "sense-hat")
        .tag("node", NODE_NAME)
        .field("temperature_c", reading["temperature_c"])
        .field("humidity_pct", reading["humidity_pct"])
        .field("pressure_hpa", reading["pressure_hpa"])
    )


def _create_client() -> InfluxDBClient:
    """Construct and return an InfluxDBClient, retrying until successful."""
    while True:
        try:
            client = InfluxDBClient(
                url=INFLUXDB_URL,
                token=INFLUXDB_TOKEN,
                org=INFLUXDB_ORG,
            )
            # Verify connectivity
            health = client.health()
            logger.info("Connected to InfluxDB at %s (status: %s)", INFLUXDB_URL, health.status)
            return client
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "InfluxDB not reachable (%s). Retrying in 10 s…", exc
            )
            time.sleep(10)


# ---------------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------------

def main() -> None:
    if not INFLUXDB_TOKEN:
        logger.critical(
            "INFLUXDB_TOKEN is not set. Set the environment variable and restart."
        )
        sys.exit(1)

    logger.info(
        "Starting Zedd Weather edge publisher – interval=%.1f s, bucket=%s",
        PUBLISH_INTERVAL,
        INFLUXDB_BUCKET,
    )

    influx_client = _create_client()
    write_api = influx_client.write_api(write_options=SYNCHRONOUS)

    try:
        while True:
            try:
                reading = _read_sensors()
                point = _build_point(reading)
                write_api.write(bucket=INFLUXDB_BUCKET, org=INFLUXDB_ORG, record=point)
                logger.info("Written: %s", reading)
                # Touch sentinel file so the liveness probe can verify recency
                open("/tmp/zedd-alive", "w").close()
            except InfluxDBError as exc:
                logger.error("InfluxDB write error: %s – will retry next cycle.", exc)
            except Exception as exc:  # noqa: BLE001
                logger.error("Unexpected error reading/writing sensor data: %s", exc)

            time.sleep(PUBLISH_INTERVAL)

    except KeyboardInterrupt:
        logger.info("Shutdown requested – stopping.")
    finally:
        write_api.close()
        influx_client.close()
        logger.info("Connections closed. Goodbye.")


if __name__ == "__main__":
    main()
