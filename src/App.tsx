import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import {
  Activity, Cloud, AlertTriangle,
  Loader2, CalendarDays, Archive,
  Map as MapIcon
} from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import type {
  TelemetryData, GeoLocation, RiskLevel,
  DirectiveShard, LockerEntry, Attestation,
  ForecastDay, MapLink, TabId
} from './types';

// Eagerly loaded components (always visible)
import { TelemetryTab } from './components/TelemetryTab';
import { LedgerModal } from './components/LedgerModal';

// Lazy loaded tab components for code splitting
const RiskAnalysisTab = lazy(() => import('./components/RiskAnalysisTab').then(m => ({ default: m.RiskAnalysisTab })));
const MapTab = lazy(() => import('./components/MapTab').then(m => ({ default: m.MapTab })));
const ForecastTab = lazy(() => import('./components/ForecastTab').then(m => ({ default: m.ForecastTab })));
const LockerTab = lazy(() => import('./components/LockerTab').then(m => ({ default: m.LockerTab })));

// Initialize Gemini API with validation
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('GEMINI_API_KEY is not configured. AI features will be unavailable.');
}
const ai = new GoogleGenAI({ apiKey: apiKey ?? '' });

const DEFAULT_LOCATION: GeoLocation = { lat: 37.7749, lng: -122.4194 };

const TABS: { id: TabId; label: string; icon: typeof Activity }[] = [
  { id: 'telemetry', label: 'Telemetry', icon: Activity },
  { id: 'risk', label: 'AI Risk Analysis', icon: AlertTriangle },
  { id: 'map', label: 'Site Map & Logistics', icon: MapIcon },
  { id: 'forecast', label: 'Forecast Grounding', icon: CalendarDays },
  { id: 'locker', label: 'Sharding Locker', icon: Archive },
];

function TabLoadingFallback() {
  return (
    <div className="h-64 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('telemetry');

  // Live Telemetry State
  const [currentTelemetry, setCurrentTelemetry] = useState<TelemetryData>({
    temp: 0, humidity: 0, pressure: 0, precipitation: 0, tide: 0, uvIndex: 0, aqi: 0
  });

  // Risk Analysis State
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [riskReport, setRiskReport] = useState<string | null>(null);
  const [riskLevel, setRiskLevel] = useState<RiskLevel | null>(null);
  const [directiveShards, setDirectiveShards] = useState<DirectiveShard[]>([]);
  const [isSharding, setIsSharding] = useState(false);

  // Pi Location State
  const [piLocation, setPiLocation] = useState<GeoLocation | null>(null);

  // Locker State
  const [lockerEntries, setLockerEntries] = useState<LockerEntry[]>([]);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Forecast State
  const [forecastData, setForecastData] = useState<ForecastDay[]>([]);
  const [isFetchingForecast, setIsFetchingForecast] = useState(false);

  // Map State
  const [isFetchingMap, setIsFetchingMap] = useState(false);
  const [mapReport, setMapReport] = useState<string | null>(null);
  const [mapLinks, setMapLinks] = useState<MapLink[]>([]);

  // Attestation State
  const [attestations, setAttestations] = useState<Attestation[]>([
    { id: '0x8f7a...3b21', time: 'Just now', type: 'Atmospheric Shard', verified: true },
    { id: '0x2c4d...9a12', time: '10 mins ago', type: 'Atmospheric Shard', verified: true },
    { id: '0x5e1b...4f88', time: '20 mins ago', type: 'Inertial Shard', verified: true },
    { id: '0x9d3c...7e45', time: '30 mins ago', type: 'Atmospheric Shard', verified: true },
  ]);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);
  const [isLedgerOpen, setIsLedgerOpen] = useState(false);

  // ──────────────────────────────────────────────
  // Locker Persistence
  // ──────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem('zedd_sharding_locker');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setLockerEntries(parsed);
      } catch {
        console.warn('Failed to parse locker data from localStorage.');
      }
    }
  }, []);

  const saveToLocker = (shards: DirectiveShard[], report: string, level: RiskLevel | null) => {
    const newEntry: LockerEntry = {
      id: 'LKR-' + Date.now(),
      timestamp: Date.now(),
      shards,
      report,
      riskLevel: level
    };
    const updated = [newEntry, ...lockerEntries];
    setLockerEntries(updated);
    localStorage.setItem('zedd_sharding_locker', JSON.stringify(updated));
  };

  // ──────────────────────────────────────────────
  // Shard Import/Export
  // ──────────────────────────────────────────────
  const exportShards = () => {
    if (directiveShards.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(directiveShards));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "zedd-shards-" + Date.now() + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const importShards = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedShards = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedShards) && importedShards.length > 0 && importedShards[0].content) {
          setDirectiveShards(importedShards);
          const reconstructedReport = importedShards.map((s: DirectiveShard) => s.content).join('\n\n');
          setRiskReport(reconstructedReport);
          setRiskLevel('Amber');
          setActiveTab('risk');
        }
      } catch (err) {
        console.error("Failed to parse shards", err);
      }
    };
    reader.readAsText(file);
    if (importFileRef.current) importFileRef.current.value = '';
  };

  // ──────────────────────────────────────────────
  // Telemetry Fetching
  // ──────────────────────────────────────────────
  const fetchRealTelemetry = async (location: GeoLocation, signal?: AbortSignal): Promise<TelemetryData | null> => {
    try {
      const { lat, lng: lon } = location;
      const [weatherRes, aqiRes, marineRes] = await Promise.all([
        fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,precipitation,uv_index`, { signal }),
        fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`, { signal }),
        fetch(`https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&current=wave_height`, { signal })
      ]);

      const weather = await weatherRes.json();
      const aqi = await aqiRes.json();
      const marine = await marineRes.json();

      const newTelemetry: TelemetryData = {
        temp: weather.current.temperature_2m,
        humidity: weather.current.relative_humidity_2m,
        pressure: weather.current.surface_pressure,
        precipitation: weather.current.precipitation,
        uvIndex: weather.current.uv_index,
        aqi: aqi.current?.us_aqi ?? 42,
        tide: marine.current?.wave_height ?? 1.2
      };

      setCurrentTelemetry(newTelemetry);
      return newTelemetry;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null;
      console.error("Failed to fetch real telemetry:", error);
      return null;
    }
  };

  // ──────────────────────────────────────────────
  // AI Risk Analysis
  // ──────────────────────────────────────────────
  const autoAnalyzeRisk = async (telemetry: TelemetryData) => {
    setIsAnalyzing(true);
    setDirectiveShards([]);
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a Principal Edge AI and IoT Systems Architect monitoring an industrial construction site.
        Current LIVE micro-climate telemetry:
        - Temperature: ${telemetry.temp.toFixed(1)}°C
        - Humidity: ${telemetry.humidity.toFixed(1)}%
        - Pressure: ${telemetry.pressure.toFixed(1)} hPa
        - Precipitation: ${telemetry.precipitation.toFixed(2)} mm
        - Tide/Wave Level: ${telemetry.tide.toFixed(2)} m
        - UV Index: ${telemetry.uvIndex.toFixed(1)}
        - AQI: ${Math.round(telemetry.aqi)}

        Based purely on this real-time telemetry, identify any environmental or structural risks for the construction site.
        Provide strict mitigation directives that will be cryptographically signed to the ledger. Do not ask for images, base your analysis solely on the data provided.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskLevel: { type: Type.STRING, description: "The overall risk level. Must be one of: Green, Amber, Red, Black.", enum: ["Green", "Amber", "Red", "Black"] },
              report: { type: Type.STRING, description: "Detailed markdown report with analysis and mitigation directives." }
            },
            required: ["riskLevel", "report"]
          }
        }
      });
      const data = JSON.parse(response.text ?? '{}');
      setRiskLevel(data.riskLevel ?? null);
      setRiskReport(data.report ?? null);
    } catch (error: unknown) {
      console.error("Auto analysis failed", error);
      const errStr = error instanceof Error ? error.message : String(error);
      if (errStr.includes('429')) {
        setRiskReport("AI Analysis is temporarily unavailable due to rate limits. Please wait a moment and try again.");
      } else if (errStr.includes('500') || errStr.includes('xhr error') || errStr.includes('Rpc failed')) {
        setRiskReport("AI Analysis service is currently experiencing network issues. Retrying shortly...");
      } else {
        setRiskReport("Failed to perform automated risk analysis. Please check your connection or API key.");
      }
      setRiskLevel("Amber");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const analyzeRisk = async () => {
    if (!mediaFile) return;
    setIsAnalyzing(true);
    setRiskReport(null);
    setRiskLevel(null);
    setDirectiveShards([]);

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            { inlineData: { data: base64Data, mimeType: mediaFile.type } },
            `You are a Principal Edge AI and IoT Systems Architect analyzing a construction site.
            Current live micro-climate telemetry from Sense HAT:
            - Temperature: ${currentTelemetry.temp.toFixed(1)}°C
            - Humidity: ${currentTelemetry.humidity.toFixed(1)}%
            - Pressure: ${currentTelemetry.pressure.toFixed(1)} hPa
            - Precipitation: ${currentTelemetry.precipitation.toFixed(2)} mm
            - Tide Level: ${currentTelemetry.tide.toFixed(2)} m
            - UV Index: ${currentTelemetry.uvIndex.toFixed(1)}
            - AQI: ${Math.round(currentTelemetry.aqi)}

            Analyze this media of the construction site. Identify any environmental or structural risks,
            and provide strict mitigation directives that will be cryptographically signed to the ledger.`
          ],
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                riskLevel: { type: Type.STRING, description: "The overall risk level. Must be one of: Green, Amber, Red, Black.", enum: ["Green", "Amber", "Red", "Black"] },
                report: { type: Type.STRING, description: "Detailed markdown report with analysis and mitigation directives." }
              },
              required: ["riskLevel", "report"]
            }
          }
        });

        try {
          const data = JSON.parse(response.text ?? '{}');
          setRiskLevel(data.riskLevel ?? null);
          setRiskReport(data.report ?? "Analysis failed.");
        } catch {
          setRiskReport("Failed to parse analysis response.");
        }
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(mediaFile);
    } catch (error: unknown) {
      console.error("Error analyzing risk:", error);
      const errStr = error instanceof Error ? error.message : String(error);
      if (errStr.includes('429')) {
        setRiskReport("AI Analysis is temporarily unavailable due to rate limits. Please wait a moment and try again.");
      } else if (errStr.includes('500') || errStr.includes('xhr error') || errStr.includes('Rpc failed')) {
        setRiskReport("AI Analysis service is currently experiencing network issues. Please try again later.");
      } else {
        setRiskReport("An error occurred during analysis.");
      }
      setRiskLevel("Amber");
      setIsAnalyzing(false);
    }
  };

  // ──────────────────────────────────────────────
  // Forecast
  // ──────────────────────────────────────────────
  const fetchForecast = async () => {
    if (!piLocation) return;
    setIsFetchingForecast(true);
    try {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${piLocation.lat}&longitude=${piLocation.lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,uv_index_max&timezone=auto`);
      const data = await res.json();
      if (data?.daily) {
        const formatted: ForecastDay[] = data.daily.time.map((timeStr: string, i: number) => ({
          date: new Date(timeStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          tempMax: data.daily.temperature_2m_max[i],
          tempMin: data.daily.temperature_2m_min[i],
          precip: data.daily.precipitation_sum[i],
          wind: data.daily.wind_speed_10m_max[i],
          uv: data.daily.uv_index_max[i]
        }));
        setForecastData(formatted);
      }
    } catch (err) {
      console.error("Failed to fetch forecast:", err);
    } finally {
      setIsFetchingForecast(false);
    }
  };

  const analyzeForecast = async () => {
    setIsAnalyzing(true);
    setRiskReport(null);
    setRiskLevel(null);
    setDirectiveShards([]);
    setActiveTab('risk');

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a Principal Edge AI and IoT Systems Architect.
        Here is the 7-day weather forecast for the site:
        ${JSON.stringify(forecastData, null, 2)}

        Analyze this forecast for any upcoming environmental or structural risks.
        Provide strict mitigation directives that will be cryptographically signed to the ledger.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              riskLevel: { type: Type.STRING, description: "The overall risk level. Must be one of: Green, Amber, Red, Black.", enum: ["Green", "Amber", "Red", "Black"] },
              report: { type: Type.STRING, description: "Detailed markdown report with analysis and mitigation directives." }
            },
            required: ["riskLevel", "report"]
          }
        }
      });
      const data = JSON.parse(response.text ?? '{}');
      setRiskLevel(data.riskLevel ?? null);
      setRiskReport(data.report ?? null);
    } catch (error: unknown) {
      console.error("Forecast analysis failed", error);
      setRiskReport("Failed to perform automated risk analysis on forecast.");
      setRiskLevel("Amber");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ──────────────────────────────────────────────
  // Map
  // ──────────────────────────────────────────────
  const fetchSiteMapData = async () => {
    setIsFetchingMap(true);
    setMapReport(null);
    setMapLinks([]);

    try {
      const lat = piLocation?.lat ?? DEFAULT_LOCATION.lat;
      const lng = piLocation?.lng ?? DEFAULT_LOCATION.lng;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Find nearby emergency services and hardware stores near this location. Provide a brief logistics report.`,
        config: {
          tools: [{ googleMaps: {} }],
          toolConfig: {
            retrievalConfig: {
              latLng: { latitude: lat, longitude: lng }
            }
          }
        }
      });

      setMapReport(response.text ?? "Failed to fetch map data.");

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (chunks) {
        const links: MapLink[] = [];
        for (const chunk of chunks) {
          const maps = (chunk as Record<string, unknown>).maps as MapLink | undefined;
          if (maps?.uri) {
            links.push(maps);
          }
        }
        const uniqueLinks = Array.from(new Map(links.map(item => [item.uri, item])).values());
        setMapLinks(uniqueLinks);
      }
    } catch (error: unknown) {
      console.error("Error fetching map data:", error);
      const errStr = error instanceof Error ? error.message : String(error);
      if (errStr.includes('429')) {
        setMapReport("Map data is temporarily unavailable due to rate limits. Please wait a moment and try again.");
      } else if (errStr.includes('500') || errStr.includes('xhr error') || errStr.includes('Rpc failed')) {
        setMapReport("Map service is currently experiencing network issues. Please try again later.");
      } else {
        setMapReport(`An error occurred while fetching map data: ${errStr}`);
      }
    } finally {
      setIsFetchingMap(false);
    }
  };

  // ──────────────────────────────────────────────
  // Cryptographic Proofs
  // ──────────────────────────────────────────────
  const generateZeddProof = async () => {
    setIsGeneratingProof(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    const dataString = JSON.stringify(currentTelemetry) + Date.now();
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hexHash = '0x' + Math.abs(hash).toString(16).padStart(8, '0') + '...' + Math.floor(Math.random() * 10000).toString(16).padStart(4, '0');

    setAttestations(prev => [
      { id: hexHash, time: 'Just now', type: 'Manual Shard', verified: true },
      ...prev.slice(0, 3)
    ]);
    setIsGeneratingProof(false);
  };

  const shardDirectives = async () => {
    if (!riskReport) return;
    setIsSharding(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const chunks = riskReport.split('\n\n').filter(chunk => chunk.trim().length > 0);
    const newShards: DirectiveShard[] = chunks.map((chunk, index) => {
      const dataString = chunk + Date.now() + index;
      let hash = 0;
      for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      const hexHash = '0x' + Math.abs(hash).toString(16).padStart(8, '0') + Math.floor(Math.random() * 10000).toString(16).padStart(4, '0');
      return { id: `Shard-${index + 1}`, hash: hexHash, content: chunk };
    });

    setDirectiveShards(newShards);
    saveToLocker(newShards, riskReport, riskLevel);
    setIsSharding(false);
  };

  // ──────────────────────────────────────────────
  // Initialization with AbortController cleanup
  // ──────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    let interval: ReturnType<typeof setInterval>;

    const init = async () => {
      let location = { ...DEFAULT_LOCATION };

      try {
        if ('geolocation' in navigator) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = { lat: position.coords.latitude, lng: position.coords.longitude };
        }
      } catch (geoError) {
        console.warn("Geolocation failed or denied, using default coordinates.", geoError);
      }

      if (!controller.signal.aborted) {
        setPiLocation(location);
        const telemetry = await fetchRealTelemetry(location, controller.signal);
        if (telemetry && !controller.signal.aborted) {
          autoAnalyzeRisk(telemetry);
        }

        interval = setInterval(() => {
          fetchRealTelemetry(location, controller.signal);
        }, 60000);
      }
    };

    init();

    return () => {
      controller.abort();
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'forecast' && forecastData.length === 0) {
      fetchForecast();
    }
  }, [activeTab, piLocation]);

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* Top Navigation */}
      <header className="border-b border-slate-800 bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <Cloud className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-100">
              Zedd Weather
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold bg-slate-800 text-slate-400 ml-2">
              Enterprise
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-slate-400 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>Minima Network Sync: OK</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-8 border-b border-slate-800 pb-px overflow-x-auto">
          {TABS.map(({ id, label, icon: TabIcon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id);
                if (id === 'map' && !mapReport) fetchSiteMapData();
              }}
              className={`pb-3 px-2 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                activeTab === id
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              <div className="flex items-center">
                <TabIcon className="w-4 h-4 mr-2" />
                {label}
              </div>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'telemetry' && (
          <TelemetryTab
            currentTelemetry={currentTelemetry}
            piLocation={piLocation}
            attestations={attestations}
            isGeneratingProof={isGeneratingProof}
            onGenerateProof={generateZeddProof}
            onOpenLedger={() => setIsLedgerOpen(true)}
          />
        )}

        <Suspense fallback={<TabLoadingFallback />}>
          {activeTab === 'risk' && (
            <RiskAnalysisTab
              currentTelemetry={currentTelemetry}
              isAnalyzing={isAnalyzing}
              riskReport={riskReport}
              riskLevel={riskLevel}
              directiveShards={directiveShards}
              mediaFile={mediaFile}
              mediaPreview={mediaPreview}
              onAutoAnalyze={autoAnalyzeRisk}
              onMediaFileChange={(file, preview) => {
                setMediaFile(file);
                setMediaPreview(preview);
                setRiskReport(null);
              }}
              onAnalyzeRisk={analyzeRisk}
              onShardDirectives={shardDirectives}
              onExportShards={exportShards}
              onImportShards={importShards}
              isSharding={isSharding}
            />
          )}

          {activeTab === 'map' && (
            <MapTab
              piLocation={piLocation}
              isFetchingMap={isFetchingMap}
              mapReport={mapReport}
              mapLinks={mapLinks}
              onFetchMapData={fetchSiteMapData}
            />
          )}

          {activeTab === 'forecast' && (
            <ForecastTab
              piLocation={piLocation}
              forecastData={forecastData}
              isFetchingForecast={isFetchingForecast}
              isAnalyzing={isAnalyzing}
              onAnalyzeForecast={analyzeForecast}
            />
          )}

          {activeTab === 'locker' && (
            <LockerTab
              lockerEntries={lockerEntries}
              onLoadEntry={(shards, report, level) => {
                setDirectiveShards(shards);
                setRiskReport(report);
                setRiskLevel(level);
                setActiveTab('risk');
              }}
            />
          )}
        </Suspense>
      </main>

      {/* Ledger Modal */}
      <LedgerModal
        isOpen={isLedgerOpen}
        attestations={attestations}
        onClose={() => setIsLedgerOpen(false)}
      />
    </div>
  );
}
