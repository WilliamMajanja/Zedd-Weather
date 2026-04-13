import { useState, useEffect, useRef, useCallback } from 'react';
import type { DirectiveShard, LockerEntry, RiskLevel } from '../types/risk';

function isValidShard(shard: unknown): shard is DirectiveShard {
  if (typeof shard !== 'object' || shard === null) return false;
  const obj = shard as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.hash === 'string' &&
    typeof obj.content === 'string'
  );
}

export function useLocker() {
  const [lockerEntries, setLockerEntries] = useState<LockerEntry[]>([]);
  const [lockerSearch, setLockerSearch] = useState('');
  const [lockerFilter, setLockerFilter] = useState('All');
  const [expandedLockerId, setExpandedLockerId] = useState<string | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('zedd_sharding_locker');
    if (saved) {
      try {
        setLockerEntries(JSON.parse(saved));
      } catch {
        /* corrupted localStorage entry */
      }
    }
  }, []);

  const saveToLocker = useCallback(
    (shards: DirectiveShard[], report: string, level: RiskLevel | string | null) => {
      const newEntry: LockerEntry = {
        id: 'LKR-' + Date.now(),
        timestamp: Date.now(),
        shards,
        report,
        riskLevel: level,
      };
      setLockerEntries((prev) => {
        const updated = [newEntry, ...prev];
        localStorage.setItem('zedd_sharding_locker', JSON.stringify(updated));
        return updated;
      });
    },
    [],
  );

  const exportShards = useCallback(
    (directiveShards: DirectiveShard[]) => {
      if (directiveShards.length === 0) return;
      const dataStr =
        'data:text/json;charset=utf-8,' +
        encodeURIComponent(JSON.stringify(directiveShards));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute('href', dataStr);
      downloadAnchorNode.setAttribute('download', 'zedd-shards-' + Date.now() + '.json');
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    },
    [],
  );

  const importShards = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>,
      callbacks: {
        setDirectiveShards: (shards: DirectiveShard[]) => void;
        setRiskReport: (report: string) => void;
        setRiskLevel: (level: RiskLevel) => void;
        setActiveTab: (tab: string) => void;
      },
    ) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          // FIX: Schema validation for imported shards
          if (!Array.isArray(parsed)) {
            console.error('Imported data is not an array');
            return;
          }
          const validShards = parsed.filter(isValidShard);
          if (validShards.length === 0) {
            console.error('No valid shards found in imported data');
            return;
          }
          callbacks.setDirectiveShards(validShards);
          const reconstructedReport = validShards.map((s) => s.content).join('\n\n');
          callbacks.setRiskReport(reconstructedReport);
          callbacks.setRiskLevel('Amber');
          callbacks.setActiveTab('risk');
        } catch (err) {
          console.error('Failed to parse shards', err);
        }
      };
      reader.readAsText(file);
      if (importFileRef.current) importFileRef.current.value = '';
    },
    [],
  );

  return {
    lockerEntries,
    lockerSearch,
    setLockerSearch,
    lockerFilter,
    setLockerFilter,
    expandedLockerId,
    setExpandedLockerId,
    importFileRef,
    saveToLocker,
    exportShards,
    importShards,
  };
}
