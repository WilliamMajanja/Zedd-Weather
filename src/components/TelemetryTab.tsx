import { useState, useEffect } from 'react';
import {
  Thermometer, Droplets, Wind, Activity, Server, ShieldCheck,
  Database, Cpu, Terminal, CloudRain, Waves, Sun, Loader2, Download, X
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, LineChart, Line
} from 'recharts';
import { MetricCard } from './MetricCard';
import type { TelemetryData, GeoLocation, Attestation, HistoricalDataPoint, NodeInfo, ExportMetrics } from '../types';

const mockWeatherData = Array.from({ length: 24 }, (_, i) => ({
  time: `${i}:00`,
  temp: 20 + Math.sin(i / 4) * 10 + Math.random() * 2,
  humidity: 50 + Math.cos(i / 4) * 20 + Math.random() * 5,
  pressure: 1010 + Math.sin(i / 8) * 5 + Math.random(),
}));

const NODES: NodeInfo[] = [
  { id: 'Node Alpha', role: 'Primary - Sense HAT', status: 'Active', ip: '10.0.0.15', detail: 'Capturing telemetry' },
  { id: 'Node Beta', role: 'Vault - Minima Node', status: 'Active', ip: '10.0.0.16', detail: 'Sharding & Attestation' },
];

interface TelemetryTabProps {
  currentTelemetry: TelemetryData;
  piLocation: GeoLocation | null;
  attestations: Attestation[];
  isGeneratingProof: boolean;
  onGenerateProof: () => void;
  onOpenLedger: () => void;
}

export function TelemetryTab({
  currentTelemetry,
  piLocation,
  attestations,
  isGeneratingProof,
  onGenerateProof,
  onOpenLedger,
}: TelemetryTabProps) {
  const [historicalRange, setHistoricalRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportMetrics, setExportMetrics] = useState<ExportMetrics>({
    temp: true,
    humidity: true,
    pressure: true
  });

  const exportHistoricalToCSV = () => {
    if (historicalData.length === 0) return;

    const headers = ['Time'];
    if (exportMetrics.temp) headers.push('Temperature (°C)');
    if (exportMetrics.humidity) headers.push('Humidity (%)');
    if (exportMetrics.pressure) headers.push('Pressure (hPa)');

    const rows = historicalData.map(data => {
      const row: (string | number)[] = [data.time];
      if (exportMetrics.temp) row.push(data.temp);
      if (exportMetrics.humidity) row.push(data.humidity);
      if (exportMetrics.pressure) row.push(data.pressure);
      return row.join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `telemetry_export_${historicalRange}_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportModalOpen(false);
  };

  const fetchHistoricalTelemetry = async (days: number, location: GeoLocation) => {
    setIsFetchingHistory(true);
    try {
      const { lat, lng: lon } = location;
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&past_days=${days}&hourly=temperature_2m,relative_humidity_2m,surface_pressure`);
      if (!res.ok) {
        console.error("Historical telemetry API returned:", res.status, res.statusText);
        return;
      }
      const data = await res.json();

      if (data?.hourly) {
        const formattedData = data.hourly.time.map((timeStr: string, index: number) => {
          const date = new Date(timeStr);
          return {
            time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
            rawDate: date,
            temp: data.hourly.temperature_2m[index],
            humidity: data.hourly.relative_humidity_2m[index],
            pressure: data.hourly.surface_pressure[index],
          };
        });

        const step = days === 7 ? 6 : (days === 14 ? 12 : 24);
        const sampledData = formattedData.filter((_: HistoricalDataPoint, i: number) => i % step === 0);
        setHistoricalData(sampledData);
      }
    } catch (error) {
      console.error("Failed to fetch historical telemetry:", error);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  useEffect(() => {
    if (piLocation) {
      const days = historicalRange === '7d' ? 7 : (historicalRange === '14d' ? 14 : 30);
      fetchHistoricalTelemetry(days, piLocation);
    }
  }, [historicalRange, piLocation]);

  return (
    <>
      {/* Dashboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <MetricCard title="Temperature" value={currentTelemetry.temp.toFixed(1)} unit="°C" icon={Thermometer} type="temp" />
        <MetricCard title="Humidity" value={currentTelemetry.humidity.toFixed(1)} unit="%" icon={Droplets} type="humidity" />
        <MetricCard title="Pressure" value={currentTelemetry.pressure.toFixed(1)} unit="hPa" icon={Wind} type="pressure" />
        <MetricCard title="Precipitation" value={currentTelemetry.precipitation.toFixed(2)} unit="mm" icon={CloudRain} type="precip" />
        <MetricCard title="Tide Level" value={currentTelemetry.tide.toFixed(2)} unit="m" icon={Waves} type="tide" />
        <MetricCard title="UV Index" value={currentTelemetry.uvIndex.toFixed(1)} unit="" icon={Sun} type="uv" />
        <MetricCard title="AQI" value={Math.round(currentTelemetry.aqi)} unit="" icon={Activity} type="aqi" />
        <MetricCard title="ZeddProofs" value="1,402" unit="" icon={ShieldCheck} type="proofs" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-[#111] border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium flex items-center text-slate-200">
                <Activity className="w-5 h-5 mr-2 text-rose-400" />
                Historical Telemetry Trends
              </h2>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsExportModalOpen(true)}
                  disabled={isFetchingHistory || historicalData.length === 0}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Export CSV
                </button>
                <div className="flex space-x-2">
                  {(['7d', '14d', '30d'] as const).map((range) => (
                    <button
                      key={range}
                      onClick={() => setHistoricalRange(range)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${
                        historicalRange === range
                          ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
                      }`}
                    >
                      {range.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {isFetchingHistory ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historicalData}>
                    <defs>
                      <linearGradient id="colorTempHist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorHumidHist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                    <XAxis dataKey="time" stroke="#666" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                    <YAxis yAxisId="left" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="#666" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff' }}
                      itemStyle={{ fontSize: '12px' }}
                      labelStyle={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}
                    />
                    <Area yAxisId="left" type="monotone" dataKey="temp" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorTempHist)" name="Temp (°C)" />
                    <Area yAxisId="right" type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorHumidHist)" name="Humidity (%)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="bg-[#111] border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium flex items-center text-slate-200">
                <Activity className="w-5 h-5 mr-2 text-rose-400" />
                Environmental Telemetry (24h)
              </h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockWeatherData}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff' }}
                    itemStyle={{ color: '#f43f5e' }}
                  />
                  <Area type="monotone" dataKey="temp" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorTemp)" name="Temp (°C)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[#111] border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium flex items-center text-slate-200">
                <Droplets className="w-5 h-5 mr-2 text-blue-400" />
                Humidity & Pressure Trends
              </h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockWeatherData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                  <XAxis dataKey="time" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="left" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis yAxisId="right" orientation="right" stroke="#666" fontSize={12} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#000', borderColor: '#333', color: '#fff' }}
                  />
                  <Line yAxisId="left" type="monotone" dataKey="humidity" stroke="#3b82f6" strokeWidth={2} dot={false} name="Humidity (%)" />
                  <Line yAxisId="right" type="monotone" dataKey="pressure" stroke="#64748b" strokeWidth={2} dot={false} name="Pressure (hPa)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column - Nodes & Workloads */}
        <div className="space-y-8">
          <div className="bg-[#111] border border-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-medium flex items-center mb-6 text-slate-200">
              <Server className="w-5 h-5 mr-2 text-indigo-400" />
              System Architecture
            </h2>
            <div className="space-y-4">
              {NODES.map(node => (
                <div key={node.id} className="p-4 rounded-lg bg-[#1a1a1a] border border-slate-800">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-slate-200">{node.id}</p>
                      <p className="text-xs text-slate-400">{node.role}</p>
                    </div>
                    <span className="px-2 py-1 text-[10px] uppercase tracking-wider font-semibold bg-emerald-500/10 text-emerald-400 rounded-full">
                      {node.status}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800/50 flex items-center text-xs text-slate-400">
                    <Cpu className="w-3 h-3 mr-1.5" />
                    {node.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#111] border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium flex items-center text-slate-200">
                <Database className="w-5 h-5 mr-2 text-emerald-400" />
                Recent ZeddProofs
              </h2>
              <button
                onClick={onGenerateProof}
                disabled={isGeneratingProof}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg border border-emerald-500/30 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingProof ? (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
                )}
                {isGeneratingProof ? 'Attesting...' : 'Attest Now'}
              </button>
            </div>
            <div className="space-y-3">
              {attestations.map((att, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#1a1a1a] border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                     <div className="p-2 bg-slate-900 rounded-md border border-slate-800">
                       <Terminal className="w-4 h-4 text-emerald-500" />
                     </div>
                     <div>
                       <p className="text-sm font-mono text-slate-300">{att.id}</p>
                       <p className="text-xs text-slate-500">{att.type} &bull; {att.time}</p>
                     </div>
                  </div>
                  {att.verified && (
                    <span aria-label="Minima Verified">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    </span>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={onOpenLedger}
              className="w-full mt-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg hover:bg-slate-800/50 transition-colors"
            >
              View Full Ledger
            </button>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-slate-800 rounded-xl w-full max-w-md flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center">
                <Download className="w-5 h-5 mr-2 text-emerald-400" />
                Export Historical Data
              </h2>
              <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">Select Metrics to Export</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportMetrics.temp}
                      onChange={(e) => setExportMetrics(prev => ({ ...prev, temp: e.target.checked }))}
                      className="form-checkbox h-4 w-4 text-emerald-500 rounded border-slate-700 bg-slate-900 focus:ring-emerald-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-sm text-slate-400 flex items-center"><Thermometer className="w-4 h-4 mr-2 text-rose-400" /> Temperature</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportMetrics.humidity}
                      onChange={(e) => setExportMetrics(prev => ({ ...prev, humidity: e.target.checked }))}
                      className="form-checkbox h-4 w-4 text-emerald-500 rounded border-slate-700 bg-slate-900 focus:ring-emerald-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-sm text-slate-400 flex items-center"><Droplets className="w-4 h-4 mr-2 text-blue-400" /> Humidity</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exportMetrics.pressure}
                      onChange={(e) => setExportMetrics(prev => ({ ...prev, pressure: e.target.checked }))}
                      className="form-checkbox h-4 w-4 text-emerald-500 rounded border-slate-700 bg-slate-900 focus:ring-emerald-500 focus:ring-offset-slate-900"
                    />
                    <span className="text-sm text-slate-400 flex items-center"><Wind className="w-4 h-4 mr-2 text-slate-400" /> Pressure</span>
                  </label>
                </div>
              </div>

              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-400">
                  Exporting data for the selected range: <strong className="text-emerald-400">{historicalRange.toUpperCase()}</strong>.
                  The CSV will include {historicalData.length} data points.
                </p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end space-x-3">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={exportHistoricalToCSV}
                disabled={!exportMetrics.temp && !exportMetrics.humidity && !exportMetrics.pressure}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
