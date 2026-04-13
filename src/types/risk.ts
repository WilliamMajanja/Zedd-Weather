export type RiskLevel = 'Green' | 'Amber' | 'Red' | 'Black';
export type SectorId = 'construction' | 'agricultural' | 'industrial';

export interface SectorConfig {
  label: string;
  description: string;
  focusAreas: string;
  icon: string;
}

export interface DirectiveShard {
  id: string;
  hash: string;
  content: string;
}

export interface LockerEntry {
  id: string;
  timestamp: number;
  shards: DirectiveShard[];
  report: string;
  riskLevel: string | null;
}

export interface RiskColorConfig {
  bg: string;
  text: string;
  border: string;
  label: string;
}

export const SECTOR_CONFIG: Record<SectorId, SectorConfig> = {
  construction: {
    label: 'Construction',
    description: 'an industrial construction site',
    focusAreas: 'structural risks, worker safety, material integrity, and construction-specific hazards',
    icon: '🏗️',
  },
  agricultural: {
    label: 'Agricultural',
    description: 'an agricultural farm or plantation',
    focusAreas: 'crop health, irrigation needs, pest/disease risk, soil conditions, and weather stress on agriculture',
    icon: '🌾',
  },
  industrial: {
    label: 'Industrial',
    description: 'an industrial manufacturing facility or plant',
    focusAreas: 'equipment safety, process risks, supply chain disruption, air quality, and worker exposure limits',
    icon: '🏭',
  },
};
