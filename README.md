# Zedd Weather Dashboard

Zedd Weather is an edge telemetry and risk-analysis platform for industrial and agricultural monitoring.  
This repository contains a React frontend, Python telemetry services, and Docker-based local deployment assets.

## Features

- Live telemetry ingestion and visualization
- AI-assisted mitigation guidance
- InfluxDB time-series storage
- Grafana dashboards
- Open WebUI integration
- Local-first multi-node simulation support

## Three-Node Local Cluster Roles

| Node | Role | Main workloads |
|---|---|---|
| Node A | Control plane + storage worker | InfluxDB, Grafana, Open WebUI |
| Node B | AI worker | Node2 orchestration + AI inference flow |
| Node C | Sensory worker | Node1 telemetry publisher |

## Repository Structure

```text
.
├── docker-compose.yml             # Core local stack (control plane + storage workloads)
├── docker-compose.cluster.yml     # Local three-node role simulation (AI + sensory workers + MQTT)
├── Zweather/                      # Python telemetry + orchestration services
├── src/                           # React frontend
└── .github/workflows/             # CI workflows (lint, test, build)
```

## Quick Start (Local)

### 1) Prerequisites

- Docker with Compose v2
- Node.js 20+

### 2) Configure

```bash
cp .env.example .env
```

Set at minimum:
- `INFLUXDB_TOKEN`
- `GEMINI_API_KEY` (optional for non-AI smoke testing)

### 3) Start control plane + storage node workloads

```bash
docker compose up -d
```

Services:
- InfluxDB: http://localhost:8086
- Grafana: http://localhost:3000
- Open WebUI: http://localhost:8080

### 4) Start AI worker + sensory worker simulation

```bash
docker compose -f docker-compose.yml -f docker-compose.cluster.yml up -d
```

This starts:
- `mqtt-broker`
- `zedd-ai-worker`
- `zedd-sensory-worker`

Use `--build` only after local code or Dockerfile changes:

```bash
docker compose -f docker-compose.yml -f docker-compose.cluster.yml up -d --build
```

### 5) Optional frontend development

```bash
npm install
npm run dev
```

## Local Three-Node Test Notes

- For single-host simulation, run all services on one machine with both compose files.
- For real three-host testing, run:
  - Node A: services from `docker-compose.yml`
  - Node B/C: worker services from `docker-compose.cluster.yml` with updated broker host
- Set sensor toggles in `.env` (`SENSE_HAT_ENABLED`, `ENVIRO_PLUS_ENABLED`, etc.) based on hardware availability.

## CI

The GitHub workflows run:
- Python lint (flake8, mypy)
- Python tests (pytest)
- TypeScript lint (`tsc --noEmit`)
- Multi-arch Docker build

## License

MIT
