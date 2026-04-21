"""
Server-side Gemini AI client.

Provides risk analysis, forecast analysis, and site-map generation.
All calls are made server-side so the GEMINI_API_KEY is never sent to the browser.

Uses the ``google-genai`` SDK (already a backend dependency).
"""
import json
import logging
import os
from typing import Any

from google import genai
from google.genai import types as genai_types

logger = logging.getLogger(__name__)

_GEMINI_MODEL = "gemini-2.0-flash"

# Mirror of the frontend SECTOR_CONFIG so we can keep this module self-contained.
SECTOR_CONFIG: dict[str, dict[str, str]] = {
    "construction": {
        "label": "Construction",
        "description": "an industrial construction site",
        "focusAreas": (
            "structural risks, worker safety, material integrity, "
            "and construction-specific hazards"
        ),
    },
    "agricultural": {
        "label": "Agricultural",
        "description": "an agricultural farm or plantation",
        "focusAreas": (
            "crop health, irrigation needs, pest/disease risk, "
            "soil conditions, and weather stress on agriculture"
        ),
    },
    "industrial": {
        "label": "Industrial",
        "description": "an industrial manufacturing facility or plant",
        "focusAreas": (
            "equipment safety, process risks, supply chain disruption, "
            "air quality, and worker exposure limits"
        ),
    },
}

_RISK_SCHEMA = genai_types.Schema(
    type=genai_types.Type.OBJECT,
    properties={
        "riskLevel": genai_types.Schema(
            type=genai_types.Type.STRING,
            enum=["Green", "Amber", "Red", "Black"],
            description=(
                "Overall risk level. Green = low, Black = full shutdown."
            ),
        ),
        "report": genai_types.Schema(
            type=genai_types.Type.STRING,
            description=(
                "Detailed Markdown report with analysis and mitigation directives."
            ),
        ),
    },
    required=["riskLevel", "report"],
)


def _client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY", "")
    return genai.Client(api_key=api_key)


async def analyze_risk(
    telemetry: dict[str, Any], sector: str
) -> dict[str, Any]:
    """
    Run AI-powered risk analysis on live telemetry for the given sector.

    Parameters
    ----------
    telemetry:
        Dict with keys: temp, humidity, pressure, precipitation, uvIndex, aqi, tide.
    sector:
        One of ``construction``, ``agricultural``, ``industrial``.

    Returns
    -------
    Dict with ``riskLevel`` (Green/Amber/Red/Black) and ``report`` (Markdown str).
    """
    cfg = SECTOR_CONFIG.get(sector, SECTOR_CONFIG["construction"])
    prompt = (
        f"You are a Principal Edge AI and IoT Systems Architect monitoring "
        f"{cfg['description']}.\n"
        f"Sector: {cfg['label']}.\n"
        f"Current LIVE micro-climate telemetry:\n"
        f"- Temperature: {telemetry.get('temp', 0):.1f}°C\n"
        f"- Humidity: {telemetry.get('humidity', 0):.1f}%\n"
        f"- Pressure: {telemetry.get('pressure', 0):.1f} hPa\n"
        f"- Precipitation: {telemetry.get('precipitation', 0):.0f}%\n"
        f"- UV Index: {telemetry.get('uvIndex', 0):.1f}\n"
        f"- AQI: {telemetry.get('aqi', 42):.0f}\n\n"
        f"Based purely on this real-time telemetry, identify any environmental "
        f"risks relevant to {cfg['description']}.\n"
        f"Focus on: {cfg['focusAreas']}.\n"
        f"Provide strict mitigation directives that will be cryptographically "
        f"signed to the ledger. Do not ask for images; base your analysis "
        f"solely on the data provided."
    )

    ai = _client()
    response = await ai.aio.models.generate_content(
        model=_GEMINI_MODEL,
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=_RISK_SCHEMA,
        ),
    )
    data = json.loads(response.text or "{}")
    return {
        "riskLevel": data.get("riskLevel", "Amber"),
        "report": data.get("report", ""),
    }


async def analyze_forecast(
    forecast_data: list[dict[str, Any]], sector: str
) -> dict[str, Any]:
    """
    Run AI-powered risk analysis on a 7-day forecast for the given sector.

    Parameters
    ----------
    forecast_data:
        List of ForecastDay dicts (date, tempMax, tempMin, precip, wind, uv).
    sector:
        One of ``construction``, ``agricultural``, ``industrial``.

    Returns
    -------
    Dict with ``riskLevel`` and ``report``.
    """
    cfg = SECTOR_CONFIG.get(sector, SECTOR_CONFIG["construction"])
    prompt = (
        f"You are a Principal Edge AI and IoT Systems Architect monitoring "
        f"{cfg['description']}.\n"
        f"Sector: {cfg['label']}.\n"
        f"Here is the 7-day weather forecast for the site:\n"
        f"{json.dumps(forecast_data, indent=2)}\n\n"
        f"Analyze this forecast for any upcoming risks relevant to "
        f"{cfg['description']}.\n"
        f"Focus on: {cfg['focusAreas']}.\n"
        f"Provide strict mitigation directives that will be cryptographically "
        f"signed to the ledger."
    )

    ai = _client()
    response = await ai.aio.models.generate_content(
        model=_GEMINI_MODEL,
        contents=prompt,
        config=genai_types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=_RISK_SCHEMA,
        ),
    )
    data = json.loads(response.text or "{}")
    return {
        "riskLevel": data.get("riskLevel", "Amber"),
        "report": data.get("report", ""),
    }


async def generate_site_map(lat: float, lng: float) -> dict[str, Any]:
    """
    Generate a site logistics report via Gemini with Google Maps grounding.

    Parameters
    ----------
    lat, lng:
        Coordinates of the site.

    Returns
    -------
    Dict with ``report`` (Markdown str) and ``links`` (list of {uri, title}).
    """
    ai = _client()
    response = await ai.aio.models.generate_content(
        model=_GEMINI_MODEL,
        contents=(
            f"Find nearby emergency services and hardware stores near the "
            f"coordinates {lat}, {lng}. Provide a brief logistics report."
        ),
        config=genai_types.GenerateContentConfig(
            tools=[{"googleMaps": {}}],  # type: ignore[arg-type]
            tool_config={
                "retrievalConfig": {"latLng": {"latitude": lat, "longitude": lng}}
            },
        ),
    )

    report: str = response.text or "Failed to fetch map data."
    links: list[dict[str, str]] = []

    candidates = getattr(response, "candidates", None) or []
    if candidates:
        grounding = getattr(candidates[0], "grounding_metadata", None)
        chunks = getattr(grounding, "grounding_chunks", None) or []
        seen: set[str] = set()
        for chunk in chunks:
            maps_chunk = getattr(chunk, "maps", None)
            if maps_chunk:
                uri = getattr(maps_chunk, "uri", "")
                if uri and uri not in seen:
                    seen.add(uri)
                    links.append(
                        {
                            "uri": uri,
                            "title": getattr(maps_chunk, "title", "") or "",
                        }
                    )

    return {"report": report, "links": links}
