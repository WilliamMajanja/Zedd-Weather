import { useState, useEffect, useRef, useCallback } from 'react';
import type { TelemetryData, GeoLocation, HourlyWeatherPoint, HistoricalDataPoint } from '../types/telemetry';

const API_BASE = {
  weather: 'https://api.open-meteo.com/v1/forecast',
  airQuality: 'https://air-quality-api.open-meteo.com/v1/air-quality',
  marine: 'https://marine-api.open-meteo.com/v1/marine',
} as const;

const DEFAULT_LOCATION: GeoLocation = { lat: 37.7749, lng: -122.4194 };
const DEFAULT_AQI = 42;
const DEFAULT_TIDE = 1.2;
const TELEMETRY_REFRESH_INTERVAL_MS = 60_000;

export function useTelemetry() {
  const [telemetrySource, setTelemetrySource] = useState<'onboard' | 'external'>('onboard');

  const [externalTelemetry, setExternalTelemetry] = useState<TelemetryData>({
    temp: 0,
    humidity: 0,
    pressure: 0,
    precipitation: 0,
    tide: 0,
    uvIndex: 0,
    aqi: 0,
  });

  const [onboardTelemetry, setOnboardTelemetry] = useState<TelemetryData>({
    temp: 22.5,
    humidity: 45.2,
    pressure: 1012.5,
    precipitation: 15,
    tide: DEFAULT_TIDE,
    uvIndex: 3.5,
    aqi: DEFAULT_AQI,
  });

  const [hourlyWeatherData, setHourlyWeatherData] = useState<HourlyWeatherPoint[]>([]);
  const [historicalData, setHistoricalData] = useState<HistoricalDataPoint[]>([]);
  const [historicalRange, setHistoricalRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [piLocation, setPiLocation] = useState<GeoLocation>(DEFAULT_LOCATION);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const currentTelemetry: TelemetryData =
    telemetrySource === 'onboard' ? onboardTelemetry : externalTelemetry;

  // Stable ref so the interval callback never goes stale
  const piLocationRef = useRef(piLocation);
  piLocationRef.current = piLocation;

  const fetchRealTelemetry = useCallback(
    async (location: GeoLocation): Promise<TelemetryData | null> => {
      try {
        const { lat, lng: lon } = location;

        const [weatherRes, aqiRes, marineRes] = await Promise.all([
          fetch(
            `${API_BASE.weather}?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,surface_pressure,uv_index&hourly=temperature_2m,relative_humidity_2m,surface_pressure,precipitation_probability&timezone=auto&forecast_days=1`,
          ),
          fetch(`${API_BASE.airQuality}?latitude=${lat}&longitude=${lon}&current=us_aqi`),
          fetch(`${API_BASE.marine}?latitude=${lat}&longitude=${lon}&current=wave_height`),
        ]);

        const weather = await weatherRes.json();
        const aqi = await aqiRes.json();
        const marine = await marineRes.json();

        const currentHour = new Date().getHours();
        const precipProb = weather.hourly?.precipitation_probability?.[currentHour] ?? 0;

        const newTelemetry: TelemetryData = {
          temp: weather.current?.temperature_2m ?? 0,
          humidity: weather.current?.relative_humidity_2m ?? 0,
          pressure: weather.current?.surface_pressure ?? 0,
          precipitation: precipProb,
          uvIndex: weather.current?.uv_index ?? 0,
          aqi: aqi.current?.us_aqi ?? 42,
          tide: marine.current?.wave_height ?? 1.2,
        };

        setExternalTelemetry(newTelemetry);
        setOnboardTelemetry(newTelemetry);

        if (weather.hourly?.time) {
          const hourly: HourlyWeatherPoint[] = weather.hourly.time.map(
            (t: string, i: number) => ({
              time: new Date(t).toLocaleTimeString('en-US', { hour: '2-digit', hour12: false }),
              temp: weather.hourly.temperature_2m?.[i] ?? 0,
              humidity: weather.hourly.relative_humidity_2m?.[i] ?? 0,
              pressure: weather.hourly.surface_pressure?.[i] ?? 0,
            }),
          );
          setHourlyWeatherData(hourly);
        }

        setLastUpdated(Date.now());
        return newTelemetry;
      } catch (error) {
        console.error('Failed to fetch real telemetry:', error);
        return null;
      }
    },
    [],
  );

  const fetchHistoricalTelemetry = useCallback(
    async (days: number, location: GeoLocation) => {
      setIsFetchingHistory(true);
      try {
        const { lat, lng: lon } = location;

        const res = await fetch(
          `${API_BASE.weather}?latitude=${lat}&longitude=${lon}&past_days=${days}&hourly=temperature_2m,relative_humidity_2m,surface_pressure,precipitation_probability`,
        );
        const data = await res.json();

        if (data && data.hourly) {
          const formattedData: HistoricalDataPoint[] = data.hourly.time.map(
            (timeStr: string, index: number) => {
              const date = new Date(timeStr);
              return {
                time: date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                }),
                rawDate: date,
                temp: data.hourly.temperature_2m[index],
                humidity: data.hourly.relative_humidity_2m[index],
                pressure: data.hourly.surface_pressure[index],
                precipitation: data.hourly.precipitation_probability[index],
              };
            },
          );

          const step = days === 7 ? 6 : days === 14 ? 12 : 24;
          const sampledData = formattedData.filter((_: HistoricalDataPoint, i: number) => i % step === 0);

          setHistoricalData(sampledData);
        }
      } catch (error) {
        console.error('Failed to fetch historical telemetry:', error);
      } finally {
        setIsFetchingHistory(false);
      }
    },
    [],
  );

  const refreshTelemetry = useCallback(() => {
    return fetchRealTelemetry(piLocationRef.current);
  }, [fetchRealTelemetry]);

  // Init: geolocation + initial fetch + interval
  useEffect(() => {
    let isMounted = true;
    let interval: ReturnType<typeof setInterval> | undefined;

    const init = async () => {
      let location = DEFAULT_LOCATION;

      try {
        if ('geolocation' in navigator) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = { lat: position.coords.latitude, lng: position.coords.longitude };
        }
      } catch (geoError) {
        console.warn('Geolocation failed or denied, using default coordinates.', geoError);
      }

      if (isMounted) {
        setPiLocation(location);
        await fetchRealTelemetry(location);

        interval = setInterval(() => {
          fetchRealTelemetry(location);
        }, TELEMETRY_REFRESH_INTERVAL_MS);
      }
    };

    init();

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [fetchRealTelemetry]);

  // Historical data effect
  useEffect(() => {
    if (piLocation) {
      const days = historicalRange === '7d' ? 7 : historicalRange === '14d' ? 14 : 30;
      fetchHistoricalTelemetry(days, piLocation);
    }
  }, [historicalRange, piLocation, fetchHistoricalTelemetry]);

  return {
    currentTelemetry,
    externalTelemetry,
    onboardTelemetry,
    telemetrySource,
    setTelemetrySource,
    hourlyWeatherData,
    historicalData,
    historicalRange,
    setHistoricalRange,
    piLocation,
    setPiLocation,
    isFetchingHistory,
    lastUpdated,
    refreshTelemetry,
    fetchRealTelemetry,
  };
}
