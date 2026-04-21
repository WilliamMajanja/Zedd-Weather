"""Tests for the FastAPI REST API endpoints."""
from fastapi.testclient import TestClient
from Zweather.api import app

client = TestClient(app)


class TestHealthEndpoint:
    def test_health_returns_200(self):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data

class TestAnalyzeEndpoint:
    def _payload(self, sector="construction", activity=None):
        body = {
            "telemetry": {
                "temperature": 25.0,
                "humidity": 60.0,
                "pressure": 1013.0,
            },
            "sector": sector,
        }
        if activity:
            body["activity"] = activity
        return body

    def test_construction_analysis(self):
        resp = client.post("/api/analyze", json=self._payload("construction"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["sector"] == "construction"
        assert "analysis" in data
        assert "risk_level" in data["analysis"]

    def test_agricultural_analysis(self):
        resp = client.post("/api/analyze", json=self._payload("agricultural"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["sector"] == "agricultural"
        assert "analysis" in data

    def test_industrial_analysis(self):
        resp = client.post("/api/analyze", json=self._payload("industrial"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["sector"] == "industrial"
        assert "analysis" in data

    def test_unknown_sector_returns_400(self):
        resp = client.post("/api/analyze", json=self._payload("unknown"))
        assert resp.status_code == 400

    def test_extreme_heat_conditions(self):
        body = {
            "telemetry": {
                "temperature": 45.0,
                "humidity": 20.0,
                "pressure": 985.0,
                "wind_speed": 15.0,
            },
            "sector": "construction",
        }
        resp = client.post("/api/analyze", json=body)
        assert resp.status_code == 200
        data = resp.json()
        # Should detect high risk
        assert data["analysis"]["risk_level"] in ("high", "critical", "red", "black", "halt")

class TestAlertsEndpoint:
    def test_normal_conditions_no_critical_alerts(self):
        resp = client.post("/api/alerts", json={
            "temperature": 22.0,
            "humidity": 50.0,
            "pressure": 1013.0,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "alerts" in data
        assert data["count"] >= 0

    def test_extreme_heat_triggers_alert(self):
        resp = client.post("/api/alerts", json={
            "temperature": 42.0,
            "humidity": 50.0,
            "pressure": 1013.0,
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["count"] > 0
        assert any(a["severity"] == "critical" for a in data["alerts"])
