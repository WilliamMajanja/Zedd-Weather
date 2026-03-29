import type { LucideIcon } from 'lucide-react';
import { getMetricStatus } from '../utils/metrics';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  type: string;
}

export function MetricCard({ title, value, unit, icon: Icon, type }: MetricCardProps) {
  const statusInfo = getMetricStatus(type, typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : Number(value));
  return (
    <div className={`bg-[#111] border ${statusInfo.border} rounded-xl p-5 flex flex-col relative overflow-hidden transition-all duration-300 hover:bg-[#161616] shadow-sm`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-2.5 rounded-lg ${statusInfo.bg} ${statusInfo.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className={`text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>
      <div>
        <p className="text-sm text-slate-400 font-medium mb-1">{title}</p>
        <div className="flex items-baseline space-x-1">
          <p className="text-3xl font-bold text-slate-100 tracking-tight">{value}</p>
          <span className="text-sm text-slate-500 font-medium">{unit}</span>
        </div>
      </div>
    </div>
  );
}
