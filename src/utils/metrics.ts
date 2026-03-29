import type { MetricStatus, RiskLevel, RiskColorInfo } from '../types';

export const getMetricStatus = (type: string, value: number): MetricStatus => {
  switch(type) {
    case 'temp':
      if (value > 35 || value < 0) return { label: 'Critical', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
      if (value > 30 || value < 5) return { label: 'Warning', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
      return { label: 'Normal', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    case 'aqi':
      if (value > 150) return { label: 'Hazardous', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' };
      if (value > 100) return { label: 'Unhealthy', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
      if (value > 50) return { label: 'Moderate', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
      return { label: 'Good', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    case 'uv':
      if (value > 8) return { label: 'Extreme', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30' };
      if (value > 5) return { label: 'High', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
      return { label: 'Low', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    case 'precip':
      if (value > 10) return { label: 'Heavy', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
      if (value > 0) return { label: 'Light', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' };
      return { label: 'Clear', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-800' };
    case 'pressure':
      if (value < 990) return { label: 'Low (Storm)', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
      if (value > 1030) return { label: 'High (Clear)', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
      return { label: 'Stable', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    case 'humidity':
      if (value > 80) return { label: 'Humid', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' };
      if (value < 30) return { label: 'Dry', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' };
      return { label: 'Comfortable', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    case 'tide':
      if (value > 2.5) return { label: 'High Tide', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
      return { label: 'Normal', color: 'text-cyan-500', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' };
    case 'proofs':
      return { label: 'Secured', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
    default:
      return { label: 'Active', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' };
  }
};

export const getRiskColor = (level: RiskLevel | null): RiskColorInfo => {
  switch(level) {
    case 'Green': return { bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-500/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]', label: 'LOW RISK' };
    case 'Amber': return { bg: 'bg-amber-950/80', text: 'text-amber-400', border: 'border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]', label: 'ELEVATED RISK' };
    case 'Red': return { bg: 'bg-rose-950/80', text: 'text-rose-400', border: 'border-rose-500/60 shadow-[0_0_15px_rgba(244,63,94,0.15)]', label: 'HIGH RISK' };
    case 'Black': return { bg: 'bg-black', text: 'text-red-500', border: 'border-red-600 shadow-[0_0_20px_rgba(220,38,38,0.3)]', label: 'FULL SHUTDOWN' };
    default: return { bg: 'bg-slate-800/80', text: 'text-slate-400', border: 'border-slate-700', label: 'ANALYZING...' };
  }
};

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
export const ALLOWED_MEDIA_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];
export const MAX_FILE_SIZE_MB = 20;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const validateMediaFile = (file: File): string | null => {
  if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
    return `Unsupported file type: ${file.type}. Allowed: JPG, PNG, WebP, GIF, MP4, MOV, WebM.`;
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: ${MAX_FILE_SIZE_MB}MB.`;
  }
  return null;
};
