# Zedd Weather Dashboard

Zedd Weather is a decentralized edge cloud operating system and telemetry dashboard designed for industrial construction sites. It leverages real-time micro-climate data, Gemini 3.1 Pro AI for automated risk analysis, and the Minima network for cryptographic attestation of environmental conditions.

This application is built to be deployed on a **PiNet** – a 3-node K3s Kubernetes cluster of Raspberry Pi 5s (16 GB RAM each) – as an edge IoT and agricultural early-warning system.

## Features

- **Live Telemetry Monitoring**: Real-time tracking of Temperature, Humidity, Pressure, Precipitation, Tide Level, UV Index, and AQI.
- **Automated AI Risk Analysis**: Uses Gemini AI to continuously analyze telemetry and generate color-coded risk levels (Green, Amber, Red, Black) and mitigation directives.
- **InfluxDB Time-Series Storage**: All sensor readings are persisted in InfluxDB v2 running on pinet-alpha (NVMe storage).
- **Grafana Dashboards**: Pre-configured dashboards for historical trend analysis.
- **Local AI Inference**: Optional Ollama integration on pinet-sigma (Hailo-10H NPU) for on-device AI inference without cloud dependency.
- **Visual Context Integration**: Upload images or videos to cross-reference visual data with live telemetry.
- **ZeddProof Ledger**: Cryptographically signs and logs all telemetry and mitigation directives for immutable auditing.

---

## PiNet Cluster Architecture

| Node | Role | Label | Responsibilities |
|------|------|-------|-----------------|
| **pinet-alpha** | Control Plane | `storage=nvme` | InfluxDB, Grafana, Open WebUI |
| **pinet-sigma** | AI Worker | `accelerator=hailo-10h` | Ollama LLM inference (port 11434) |
| **pinet-rho** | Sensor Worker | `sensor=sense-hat` | Edge telemetry publisher (Sense HAT) |

---

## Repository Structure

```
.
├── Dockerfile                        # Multi-stage arm64 Dockerfile (edge publisher)
├── docker-compose.yml                # Local development stack
├── .env.example                      # Environment variable template
├── .env.production.example           # Production environment template
├── k8s/                              # Kubernetes manifests
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── influxdb.yaml                 # InfluxDB Deployment + Service + PVC
│   ├── grafana.yaml                  # Grafana Deployment + Service + PVC
│   ├── open-webui.yaml               # Open WebUI Deployment + Service + PVC
│   └── zedd-weather-edge-deployment.yaml
├── Zweather/
│   ├── app.py                        # Edge InfluxDB telemetry publisher
│   ├── requirements.txt
│   ├── node1_telemetry/              # MQTT-based telemetry stack (sensors)
│   └── node2_orchestration/          # AI inference + attestation
├── src/                              # React 19 TypeScript frontend
└── .github/workflows/build.yml       # CI/CD: lint → build arm64 image → deploy
```

---

## Hardware Requirements

### Core Computing (per node)
- **Raspberry Pi 5 (16 GB RAM)**
- **NVMe SSD** on pinet-alpha (via PCIe HAT)
- **Hailo-10H AI HAT+** on pinet-sigma
- **Sense HAT v2** on pinet-rho

### Sensors & HATs
- **Sense HAT (v2)**: Temperature, Humidity, Barometric Pressure
- **Pimoroni Enviro+**: Air quality (AQI), gas, particulate matter (optional)
- **Waveshare RS485 CAN HAT**: Industrial anemometers / rain gauges via Modbus (optional)
- **Adafruit VEML6075 UV Sensor**: UV Index (optional)

---

## Quick Start – Local Development

### Prerequisites
- Docker Desktop (with Compose v2)
- Node.js 20+

### 1. Clone and configure

```bash
git clone https://github.com/WilliamMajanja/Zedd-Weather.git
cd Zedd-Weather
cp .env.example .env
# Edit .env with your InfluxDB token and Gemini API key
```

### 2. Start the stack

```bash
# Start InfluxDB, Grafana, and Open WebUI
docker compose up -d

# (Raspberry Pi only) also start the edge publisher
docker compose --profile edge up -d
```

Services:
- **InfluxDB** → http://localhost:8086
- **Grafana** → http://localhost:3000 (admin/changeme-password)
- **Open WebUI** → http://localhost:8080

### 3. Frontend development

```bash
npm install
npm run dev        # Vite dev server on http://localhost:3000
npm run build      # Production build
npm run lint       # TypeScript type-check
```

---

## Kubernetes Deployment (PiNet K3s)

### Prerequisites
- K3s cluster running with node labels set (see below)
- `kubectl` configured with cluster access
- GitHub Container Registry token for pulling images

### 1. Label cluster nodes

```bash
kubectl label node pinet-alpha storage=nvme
kubectl label node pinet-sigma accelerator=hailo-10h
kubectl label node pinet-rho   sensor=sense-hat
```

### 2. Create the namespace and populate secrets

```bash
kubectl apply -f k8s/namespace.yaml

# Edit secrets.yaml with your base64-encoded values, then apply:
# echo -n "your-token" | base64
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmap.yaml
```

### 3. Deploy all services

```bash
kubectl apply -f k8s/influxdb.yaml
kubectl apply -f k8s/grafana.yaml
kubectl apply -f k8s/open-webui.yaml
kubectl apply -f k8s/zedd-weather-edge-deployment.yaml
```

### 4. Verify

```bash
kubectl get pods -n zedd-weather
kubectl get svc  -n zedd-weather
```

### 5. Access services

Use `kubectl port-forward` for quick access, or configure an Ingress/MetalLB:

```bash
# InfluxDB
kubectl port-forward svc/influxdb 8086:8086 -n zedd-weather

# Grafana
kubectl port-forward svc/grafana 3000:3000 -n zedd-weather
```

---

## CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/build.yml`) runs on every push to `main`:

1. **Lint Python** – flake8 + mypy on `Zweather/`
2. **Lint TypeScript** – `tsc --noEmit` on the React frontend
3. **Build & Push** – multi-arch Docker image (`linux/arm64` + `linux/amd64`) pushed to GHCR
4. **Deploy** – applies K8s manifests to the PiNet cluster (requires `KUBECONFIG` secret)

---

## Environment Variables

See `.env.example` and `.env.production.example` for a full reference.

| Variable | Default | Description |
|----------|---------|-------------|
| `INFLUXDB_URL` | `http://influxdb:8086` | InfluxDB service URL |
| `INFLUXDB_TOKEN` | – | InfluxDB authentication token (**required**) |
| `INFLUXDB_ORG` | `zedd-weather` | InfluxDB organisation |
| `INFLUXDB_BUCKET` | `telemetry` | InfluxDB bucket for sensor data |
| `PUBLISH_INTERVAL` | `10.0` | Seconds between sensor reads |
| `SENSE_HAT_TEMP_OFFSET` | `2.0` | CPU heat compensation (°C) |
| `GEMINI_API_KEY` | – | Google Gemini API key |
| `OLLAMA_BASE_URL` | `http://10.0.0.20:11434` | Ollama base URL (pinet-sigma) |

---

## Policies & Security

- **Data Immutability**: All critical telemetry and AI directives are hashed (SHA-256) and submitted to the Minima network, providing a verifiable audit trail.
- **Edge Processing**: Initial risk assessments run locally on-device, falling back to cloud APIs (Gemini) when a connection is available.
- **Fail-Safe Operation**: If AI analysis fails or the network drops, the system displays raw telemetry and triggers local visual/auditory alarms via GPIO if thresholds are breached.
- **Non-Root Containers**: All K8s pods run as non-root users where hardware access does not require it. The edge publisher runs privileged only because I2C device access requires it.

## License
MIT License
