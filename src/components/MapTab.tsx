import { Map as MapIcon, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { GeoLocation, MapLink } from '../types';

interface MapTabProps {
  piLocation: GeoLocation | null;
  isFetchingMap: boolean;
  mapReport: string | null;
  mapLinks: MapLink[];
  onFetchMapData: () => void;
}

export function MapTab({
  piLocation,
  isFetchingMap,
  mapReport,
  mapLinks,
  onFetchMapData,
}: MapTabProps) {
  return (
    <div className="bg-[#111] border border-slate-800 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-lg font-medium flex items-center text-slate-200">
            <MapIcon className="w-5 h-5 mr-2 text-blue-400" />
            Site Map & Logistics Grounding
          </h2>
          {piLocation && (
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <MapIcon className="w-3 h-3 mr-1" />
              Using Pi Location: {piLocation.lat.toFixed(4)}, {piLocation.lng.toFixed(4)}
            </p>
          )}
        </div>
        <button
          onClick={onFetchMapData}
          disabled={isFetchingMap}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center w-full sm:w-auto"
        >
          {isFetchingMap ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MapIcon className="w-4 h-4 mr-2" />}
          {isFetchingMap ? 'Querying Maps...' : 'Fetch Local Logistics'}
        </button>
      </div>

      {isFetchingMap ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p>Querying Google Maps for local logistics...</p>
        </div>
      ) : mapReport ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-[400px] w-full bg-[#1a1a1a] rounded-xl border border-slate-800 overflow-hidden">
              <iframe
                width="100%"
                height="100%"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://maps.google.com/maps?q=${piLocation?.lat || 37.7749},${piLocation?.lng || -122.4194}&z=14&output=embed`}
              ></iframe>
            </div>
            <div className="prose prose-invert prose-blue max-w-none bg-[#1a1a1a] p-6 rounded-xl border border-slate-800">
              <div className="markdown-body text-sm text-slate-300">
                <ReactMarkdown>{mapReport}</ReactMarkdown>
              </div>
            </div>
          </div>
          <div className="bg-[#1a1a1a] p-6 rounded-xl border border-slate-800">
            <h3 className="text-sm font-medium text-slate-400 mb-4 uppercase tracking-wider flex items-center">
              <MapIcon className="w-4 h-4 mr-2" />
              Map Links
            </h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {mapLinks.length > 0 ? mapLinks.map((mapData, idx) => (
                <a
                  key={idx}
                  href={mapData.uri}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-4 bg-slate-900 border border-slate-800 rounded-lg text-sm hover:border-blue-500/50 hover:bg-slate-800 transition-all group"
                >
                  <p className="text-blue-400 font-medium mb-1 group-hover:text-blue-300 transition-colors line-clamp-2">
                    {mapData.title || 'View on Google Maps'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {mapData.uri}
                  </p>
                </a>
              )) : (
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-lg text-center">
                  <p className="text-sm text-slate-500">No specific map links found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
          <MapIcon className="w-12 h-12 text-slate-600 mb-4" />
          <p>Click &quot;Fetch Local Logistics&quot; to query Google Maps.</p>
        </div>
      )}
    </div>
  );
}
