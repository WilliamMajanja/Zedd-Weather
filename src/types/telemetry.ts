export interface GeoLocation {
  lat: number;
  lng: number;
}

export interface TelemetryData {
  temp: number;
  humidity: number;
  pressure: number;
  precipitation: number;
  tide: number;
  uvIndex: number;
  aqi: number;
}

export interface HourlyWeatherPoint {
  time: string;
  temp: number;
  humidity: number;
  pressure: number;
}

export interface HistoricalDataPoint {
  time: string;
  rawDate: Date;
  temp: number;
  humidity: number;
  pressure: number;
  precipitation: number;
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  severity: 'critical' | 'warning';
  timestamp: number;
}

export interface NodeInfo {
  id: string;
  role: string;
  status: string;
  ip: string;
  detail: string;
}

export interface Attestation {
  id: string;
  time: string;
  type: string;
  verified: boolean;
}

export interface ExportMetrics {
  temp: boolean;
  humidity: boolean;
  pressure: boolean;
  precipitation: boolean;
}
