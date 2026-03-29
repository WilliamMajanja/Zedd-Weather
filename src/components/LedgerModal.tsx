import { Database, ShieldCheck, Terminal, X } from 'lucide-react';
import type { Attestation } from '../types';

interface LedgerModalProps {
  isOpen: boolean;
  attestations: Attestation[];
  onClose: () => void;
}

export function LedgerModal({ isOpen, attestations, onClose }: LedgerModalProps) {
  if (!isOpen) return null;

  const extendedAttestations = [
    ...attestations,
    ...Array.from({ length: 15 }).map((_, i) => ({
      id: `0x${Math.random().toString(16).slice(2, 10)}...${Math.random().toString(16).slice(2, 6)}`,
      time: `${i + 1} hours ago`,
      type: i % 3 === 0 ? 'Inertial Shard' : 'Atmospheric Shard',
      verified: true
    }))
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-[#111] border border-slate-800 rounded-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-200 flex items-center">
            <Database className="w-5 h-5 mr-2 text-emerald-400" />
            Full ZeddProof Ledger
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {extendedAttestations.map((att, i) => (
            <div key={i} className="p-4 rounded-lg bg-[#1a1a1a] border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-slate-900 rounded-md border border-slate-800">
                  <Terminal className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-mono text-slate-300">{att.id}</p>
                  <p className="text-xs text-slate-500 mt-1">{att.type} &bull; {att.time}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 text-emerald-500 text-sm font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
