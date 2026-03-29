export interface TelemetryData {
  temp: number;
  humidity: number;
  pressure: number;
  precipitation: number;
  tide: number;
  uvIndex: number;
  aqi: number;
}

export interface GeoLocation {
  lat: number;
  lng: number;
}

export type RiskLevel = 'Green' | 'Amber' | 'Red' | 'Black';

export type TabId = 'telemetry' | 'risk' | 'map' | 'forecast' | 'locker';

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
  riskLevel: RiskLevel | null;
}

export interface Attestation {
  id: string;
  time: string;
  type: string;
  verified: boolean;
}

export interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  precip: number;
  wind: number;
  uv: number;
}

export interface HistoricalDataPoint {
  time: string;
  rawDate: Date;
  temp: number;
  humidity: number;
  pressure: number;
}

export interface MapLink {
  uri: string;
  title?: string;
}

export interface MetricStatus {
  label: string;
  color: string;
  bg: string;
  border: string;
}

export interface RiskColorInfo {
  bg: string;
  text: string;
  border: string;
  label: string;
}

export interface ExportMetrics {
  temp: boolean;
  humidity: boolean;
  pressure: boolean;
}

export interface NodeInfo {
  id: string;
  role: string;
  status: string;
  ip: string;
  detail: string;
}
