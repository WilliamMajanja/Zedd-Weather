# =============================================================================
# Stage 1: Builder
# Install Python dependencies in a virtual environment so only the venv is
# copied into the final image (keeps the image small and reproducible).
# =============================================================================
FROM python:3.12-slim AS builder

# Install build tools needed for some native Python extensions (e.g. RPi.GPIO)
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        g++ \
        libffi-dev \
        libssl-dev \
        python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy only the dependency manifest first to maximise Docker layer cache reuse
COPY Zweather/requirements.txt ./requirements.txt

# Create isolated venv and install packages
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt


# =============================================================================
# Stage 2: Runtime
# Minimal image containing only the application code and the pre-built venv.
# Targets linux/arm64 (Raspberry Pi 5 / pinet-rho).
# =============================================================================
FROM python:3.12-slim AS runtime

# Security: do not run as root
RUN groupadd --gid 1001 zedd && useradd --uid 1001 --gid 1001 --no-create-home zedd

# System libraries required at runtime by the Sense HAT and I2C subsystem
RUN apt-get update && apt-get install -y --no-install-recommends \
        i2c-tools \
        libgles2 \
    && rm -rf /var/lib/apt/lists/*

# Copy the pre-built virtual environment from the builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

# Copy application source
COPY Zweather/ ./Zweather/
COPY Zweather/app.py ./app.py

# Give ownership to the non-root user
RUN chown -R zedd:zedd /app

USER zedd

# Environment variable defaults (overridden at runtime by K8s ConfigMap/Secret)
ENV INFLUXDB_URL="http://influxdb:8086" \
    INFLUXDB_ORG="zedd-weather" \
    INFLUXDB_BUCKET="telemetry" \
    PUBLISH_INTERVAL="10.0" \
    SENSE_HAT_TEMP_OFFSET="2.0" \
    LOG_LEVEL="INFO"

# Expose no ports – this is a push-only telemetry publisher
ENTRYPOINT ["python", "app.py"]

# Metadata labels
LABEL org.opencontainers.image.source="https://github.com/WilliamMajanja/Zedd-Weather" \
      org.opencontainers.image.description="Zedd Weather edge telemetry publisher for Raspberry Pi / Sense HAT" \
      org.opencontainers.image.licenses="MIT"
