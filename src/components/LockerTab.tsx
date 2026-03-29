import { useState } from 'react';
import {
  Activity, Database, Archive, Search, Filter,
  ChevronDown, ChevronUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { LockerEntry, RiskLevel, DirectiveShard } from '../types';
import { getRiskColor } from '../utils/metrics';

interface LockerTabProps {
  lockerEntries: LockerEntry[];
  onLoadEntry: (shards: DirectiveShard[], report: string, riskLevel: RiskLevel | null) => void;
}

export function LockerTab({ lockerEntries, onLoadEntry }: LockerTabProps) {
  const [lockerSearch, setLockerSearch] = useState('');
  const [lockerFilter, setLockerFilter] = useState('All');
  const [expandedLockerId, setExpandedLockerId] = useState<string | null>(null);

  const filteredEntries = lockerEntries.filter(entry => {
    const matchesSearch = entry.id.toLowerCase().includes(lockerSearch.toLowerCase()) ||
                          (entry.report && entry.report.toLowerCase().includes(lockerSearch.toLowerCase()));
    const matchesFilter = lockerFilter === 'All' || entry.riskLevel === lockerFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="bg-[#111] border border-slate-800 rounded-xl p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <h2 className="text-lg font-medium flex items-center text-slate-200">
          <Archive className="w-5 h-5 mr-2 text-emerald-400" />
          Sharding Evidence Locker
        </h2>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by ID or report content..."
            value={lockerSearch}
            onChange={(e) => setLockerSearch(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>
        <div className="relative w-full sm:w-48">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <select
            value={lockerFilter}
            onChange={(e) => setLockerFilter(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-slate-800 rounded-lg pl-10 pr-8 py-2 text-sm text-slate-200 appearance-none focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
          >
            <option value="All">All Risk Levels</option>
            <option value="Green">Green (Low)</option>
            <option value="Amber">Amber (Elevated)</option>
            <option value="Red">Red (High)</option>
            <option value="Black">Black (Shutdown)</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {lockerEntries.length > 0 ? (
        <div className="space-y-4">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="bg-[#1a1a1a] p-5 rounded-xl border border-slate-800 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-200 flex items-center">
                    <Database className="w-4 h-4 mr-2 text-emerald-500" />
                    {entry.id}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
                {entry.riskLevel && (
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getRiskColor(entry.riskLevel).bg} ${getRiskColor(entry.riskLevel).text}`}>
                    {entry.riskLevel}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400 font-medium">Shards ({entry.shards.length}):</p>
                  <button
                    onClick={() => setExpandedLockerId(expandedLockerId === entry.id ? null : entry.id)}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center transition-colors"
                  >
                    {expandedLockerId === entry.id ? (
                      <><ChevronUp className="w-3 h-3 mr-1" /> Hide Details</>
                    ) : (
                      <><ChevronDown className="w-3 h-3 mr-1" /> View Details</>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {entry.shards.slice(0, expandedLockerId === entry.id ? undefined : 2).map((shard) => (
                    <div key={shard.id} className="p-2 bg-slate-900 border border-slate-800 rounded flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-400">{shard.id}</span>
                      <span className="text-[10px] font-mono text-emerald-500/70 truncate ml-2">{shard.hash}</span>
                    </div>
                  ))}
                </div>
                {expandedLockerId !== entry.id && entry.shards.length > 2 && (
                  <p className="text-[10px] text-slate-500 italic">+ {entry.shards.length - 2} more shards</p>
                )}
              </div>

              {/* Expanded Details */}
              {expandedLockerId === entry.id && (
                <div className="mt-4 pt-4 border-t border-slate-800 animate-in fade-in slide-in-from-top-2 duration-200">
                  <p className="text-xs text-slate-400 font-medium mb-2">Reconstructed Report Snippet:</p>
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 max-h-48 overflow-y-auto">
                    <div className="markdown-body text-xs text-slate-300">
                      <ReactMarkdown>{entry.report}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => onLoadEntry(entry.shards, entry.report, entry.riskLevel)}
                  className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-medium rounded-lg transition-colors flex items-center"
                >
                  <Activity className="w-3.5 h-3.5 mr-1.5" />
                  Load into Risk Analysis View
                </button>
              </div>
            </div>
          ))}

          {filteredEntries.length === 0 && (
            <div className="p-8 text-center text-slate-500 border border-slate-800 rounded-xl bg-[#1a1a1a]">
              <Search className="w-8 h-8 mx-auto mb-3 text-slate-600" />
              <p>No shards match your search criteria.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
          <Archive className="w-12 h-12 text-slate-600 mb-4" />
          <p>Locker is empty. Generate and shard directives to store them here.</p>
        </div>
      )}
    </div>
  );
}
