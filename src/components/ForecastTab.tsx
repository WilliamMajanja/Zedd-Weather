import {
  Thermometer, Wind, Activity, CalendarDays,
  Map as MapIcon, Loader2, CloudRain, Sun
} from 'lucide-react';
import type { GeoLocation, ForecastDay } from '../types';

interface ForecastTabProps {
  piLocation: GeoLocation | null;
  forecastData: ForecastDay[];
  isFetchingForecast: boolean;
  isAnalyzing: boolean;
  onAnalyzeForecast: () => void;
}

export function ForecastTab({
  piLocation,
  forecastData,
  isFetchingForecast,
  isAnalyzing,
  onAnalyzeForecast,
}: ForecastTabProps) {
  return (
    <div className="bg-[#111] border border-slate-800 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-medium flex items-center text-slate-200">
            <CalendarDays className="w-5 h-5 mr-2 text-indigo-400" />
            7-Day Forecast Grounding
          </h2>
          {piLocation && (
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <MapIcon className="w-3 h-3 mr-1" />
              Using Pi Location: {piLocation.lat.toFixed(4)}, {piLocation.lng.toFixed(4)}
            </p>
          )}
        </div>
        <button
          onClick={onAnalyzeForecast}
          disabled={isAnalyzing || forecastData.length === 0}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center w-full sm:w-auto"
        >
          {isAnalyzing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
          {isAnalyzing ? 'Analyzing Forecast...' : 'Analyze Forecast Risk'}
        </button>
      </div>

      {isFetchingForecast ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p>Fetching 7-day forecast data...</p>
        </div>
      ) : forecastData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {forecastData.map((day, idx) => (
            <div key={idx} className="bg-[#1a1a1a] p-4 rounded-xl border border-slate-800 flex flex-col">
              <p className="text-sm font-semibold text-slate-300 mb-3">{day.date}</p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 flex items-center"><Thermometer className="w-3 h-3 mr-1" /> Max Temp</span>
                  <span className="text-sm text-slate-200">{day.tempMax.toFixed(1)}°C</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 flex items-center"><Thermometer className="w-3 h-3 mr-1" /> Min Temp</span>
                  <span className="text-sm text-slate-200">{day.tempMin.toFixed(1)}°C</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 flex items-center"><CloudRain className="w-3 h-3 mr-1" /> Precip</span>
                  <span className="text-sm text-slate-200">{day.precip.toFixed(1)} mm</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 flex items-center"><Wind className="w-3 h-3 mr-1" /> Wind</span>
                  <span className="text-sm text-slate-200">{day.wind.toFixed(1)} km/h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 flex items-center"><Sun className="w-3 h-3 mr-1" /> UV Index</span>
                  <span className="text-sm text-slate-200">{day.uv.toFixed(1)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
          <CalendarDays className="w-12 h-12 text-slate-600 mb-4" />
          <p>No forecast data available.</p>
        </div>
      )}
    </div>
  );
}
