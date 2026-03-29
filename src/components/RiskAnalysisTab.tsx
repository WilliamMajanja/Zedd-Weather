import { useRef } from 'react';
import {
  Activity, ShieldCheck, Camera, Terminal, Database,
  Loader2, Video, Download, Upload
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { TelemetryData, RiskLevel, DirectiveShard } from '../types';
import { getRiskColor, validateMediaFile } from '../utils/metrics';

interface RiskAnalysisTabProps {
  currentTelemetry: TelemetryData;
  isAnalyzing: boolean;
  riskReport: string | null;
  riskLevel: RiskLevel | null;
  directiveShards: DirectiveShard[];
  mediaFile: File | null;
  mediaPreview: string | null;
  onAutoAnalyze: (telemetry: TelemetryData) => void;
  onMediaFileChange: (file: File | null, preview: string | null) => void;
  onAnalyzeRisk: () => void;
  onShardDirectives: () => void;
  onExportShards: () => void;
  onImportShards: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isSharding: boolean;
}

const getRiskIcon = (level: RiskLevel | null) => {
  switch(level) {
    case 'Green': return <ShieldCheck className="w-5 h-5 mr-2" />;
    case 'Amber': return <Activity className="w-5 h-5 mr-2" />;
    case 'Red': return <Activity className="w-5 h-5 mr-2" />;
    case 'Black': return <Terminal className="w-5 h-5 mr-2" />;
    default: return <ShieldCheck className="w-5 h-5 mr-2" />;
  }
};

export function RiskAnalysisTab({
  currentTelemetry,
  isAnalyzing,
  riskReport,
  riskLevel,
  directiveShards,
  mediaFile,
  mediaPreview,
  onAutoAnalyze,
  onMediaFileChange,
  onAnalyzeRisk,
  onShardDirectives,
  onExportShards,
  onImportShards,
  isSharding,
}: RiskAnalysisTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const error = validateMediaFile(file);
      if (error) {
        alert(error);
        return;
      }
      onMediaFileChange(file, URL.createObjectURL(file));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="space-y-8">
        <div className="bg-[#111] border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium flex items-center text-slate-200">
              <Activity className="w-5 h-5 mr-2 text-rose-400" />
              Automated Telemetry Analysis
            </h2>
            <button
              onClick={() => onAutoAnalyze(currentTelemetry)}
              disabled={isAnalyzing}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center disabled:opacity-50"
            >
              {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Activity className="w-3.5 h-3.5 mr-1.5" />}
              Refresh Analysis
            </button>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            The system continuously monitors live telemetry and uses Gemini AI
            to generate mitigation directives without human interaction.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-[#1a1a1a] p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-500">Live Temp</p>
              <p className="text-lg font-semibold text-slate-200">{currentTelemetry.temp.toFixed(1)}°C</p>
            </div>
            <div className="bg-[#1a1a1a] p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-500">Humidity</p>
              <p className="text-lg font-semibold text-slate-200">{currentTelemetry.humidity.toFixed(1)}%</p>
            </div>
            <div className="bg-[#1a1a1a] p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-500">Pressure</p>
              <p className="text-lg font-semibold text-slate-200">{currentTelemetry.pressure.toFixed(1)} hPa</p>
            </div>
            <div className="bg-[#1a1a1a] p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-500">Precipitation</p>
              <p className="text-lg font-semibold text-slate-200">{currentTelemetry.precipitation.toFixed(2)} mm</p>
            </div>
            <div className="bg-[#1a1a1a] p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-500">Tide Level</p>
              <p className="text-lg font-semibold text-slate-200">{currentTelemetry.tide.toFixed(2)} m</p>
            </div>
            <div className="bg-[#1a1a1a] p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-500">UV Index</p>
              <p className="text-lg font-semibold text-slate-200">{currentTelemetry.uvIndex.toFixed(1)}</p>
            </div>
            <div className="bg-[#1a1a1a] p-3 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-500">Live AQI</p>
              <p className="text-lg font-semibold text-slate-200">{Math.round(currentTelemetry.aqi)}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#111] border border-slate-800 rounded-xl p-6">
          <h2 className="text-lg font-medium flex items-center mb-6 text-slate-200">
            <Camera className="w-5 h-5 mr-2 text-indigo-400" />
            Add Visual Context (Optional)
          </h2>
          <p className="text-sm text-slate-400 mb-6">
            Upload images or video of the construction site to cross-reference visual data with the live telemetry.
          </p>

          <div
            className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:bg-slate-800/30 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {mediaPreview ? (
              mediaFile?.type.startsWith('video/') ? (
                <video src={mediaPreview} controls className="max-h-64 mx-auto rounded-lg" />
              ) : (
                <img src={mediaPreview} alt="Preview" className="max-h-64 mx-auto rounded-lg object-contain" />
              )
            ) : (
              <div className="flex flex-col items-center">
                <Video className="w-12 h-12 text-slate-500 mb-4" />
                <p className="text-slate-300 font-medium">Click to upload image or video</p>
                <p className="text-slate-500 text-sm mt-2">Supports JPG, PNG, MP4, MOV (max 20MB)</p>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*,video/*"
              className="hidden"
            />
          </div>

          <button
            onClick={onAnalyzeRisk}
            disabled={!mediaFile || isAnalyzing}
            className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Analyzing Risk & Generating Directives...
              </>
            ) : (
              <>
                <Activity className="w-5 h-5 mr-2" />
                Run Combined Analysis
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-[#111] border border-slate-800 rounded-xl p-6 h-full flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium flex items-center text-slate-200">
            <ShieldCheck className="w-5 h-5 mr-2 text-emerald-400" />
            Mitigation Directives
          </h2>
          {riskLevel && !isAnalyzing && (
            <div className={`flex items-center px-3 py-1.5 rounded-lg border ${getRiskColor(riskLevel).bg} ${getRiskColor(riskLevel).border} ${getRiskColor(riskLevel).text}`}>
              {getRiskIcon(riskLevel)}
              <span className="text-sm font-bold tracking-wider">{getRiskColor(riskLevel).label}</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {isAnalyzing ? (
            <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-slate-500 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
              <p>Analyzing telemetry and generating directives...</p>
            </div>
          ) : riskReport ? (
            <div className="prose prose-invert prose-emerald max-w-none">
              <div className="markdown-body text-sm text-slate-300">
                <ReactMarkdown>{riskReport}</ReactMarkdown>
              </div>
              <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-emerald-400 font-mono flex items-center">
                    <Terminal className="w-3 h-3 mr-2" />
                    Directive ready for Minima attestation (SHA-256)
                  </p>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={onExportShards}
                      disabled={directiveShards.length === 0}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors flex items-center"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Export
                    </button>
                    <button
                      onClick={() => importFileRef.current?.click()}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5" /> Import
                    </button>
                    <input type="file" ref={importFileRef} onChange={onImportShards} accept=".json" className="hidden" />
                    <button
                      onClick={onShardDirectives}
                      disabled={isSharding || directiveShards.length > 0}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center"
                    >
                      {isSharding ? (
                        <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Sharding...</>
                      ) : directiveShards.length > 0 ? (
                        <><ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Sharded</>
                      ) : (
                        <><Database className="w-3.5 h-3.5 mr-1.5" /> Shard Directives</>
                      )}
                    </button>
                  </div>
                </div>

                {directiveShards.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-emerald-500/20 pt-4">
                    <p className="text-xs text-slate-400 mb-2">Shards generated and ready for decentralized storage:</p>
                    {directiveShards.map(shard => (
                      <div key={shard.id} className="p-2 bg-[#111] border border-slate-800 rounded flex items-center justify-between">
                        <div className="flex items-center">
                          <Database className="w-3 h-3 text-emerald-500 mr-2" />
                          <span className="text-xs font-mono text-slate-300">{shard.id}</span>
                        </div>
                        <span className="text-xs font-mono text-emerald-400/70">{shard.hash}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] flex items-center justify-center text-slate-500">
              <p>Waiting for initial telemetry analysis...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
