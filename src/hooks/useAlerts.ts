import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import type { TelemetryData, Alert } from '../types/telemetry';

export function useAlerts(currentTelemetry: TelemetryData) {
  const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const alertedIdsRef = useRef<Set<string>>(new Set());
  // Use a ref so the effect never re-fires when isMuted changes
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  const playAlertSound = useCallback((severity: 'critical' | 'warning') => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = severity === 'critical' ? 'sawtooth' : 'sine';
      oscillator.frequency.setValueAtTime(severity === 'critical' ? 440 : 880, audioCtx.currentTime);

      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio alert failed', e);
    }
  }, []);

  useEffect(() => {
    const newAlerts: Alert[] = [];

    // Temperature Thresholds
    if (currentTelemetry.temp > 35 || currentTelemetry.temp < 0) {
      newAlerts.push({
        id: 'temp-crit',
        type: 'Temperature',
        message: `Critical Temperature: ${currentTelemetry.temp.toFixed(1)}°C`,
        severity: 'critical',
        timestamp: Date.now(),
      });
    } else if (currentTelemetry.temp > 30 || currentTelemetry.temp < 5) {
      newAlerts.push({
        id: 'temp-warn',
        type: 'Temperature',
        message: `High Temperature: ${currentTelemetry.temp.toFixed(1)}°C`,
        severity: 'warning',
        timestamp: Date.now(),
      });
    }

    // AQI Thresholds
    if (currentTelemetry.aqi > 150) {
      newAlerts.push({
        id: 'aqi-crit',
        type: 'AQI',
        message: `Hazardous Air Quality: ${Math.round(currentTelemetry.aqi)}`,
        severity: 'critical',
        timestamp: Date.now(),
      });
    } else if (currentTelemetry.aqi > 100) {
      newAlerts.push({
        id: 'aqi-warn',
        type: 'AQI',
        message: `Unhealthy Air Quality: ${Math.round(currentTelemetry.aqi)}`,
        severity: 'warning',
        timestamp: Date.now(),
      });
    }

    // Precipitation Thresholds
    if (currentTelemetry.precipitation > 80) {
      newAlerts.push({
        id: 'precip-crit',
        type: 'Precipitation',
        message: `Critical Precipitation Risk: ${currentTelemetry.precipitation}%`,
        severity: 'critical',
        timestamp: Date.now(),
      });
    } else if (currentTelemetry.precipitation > 50) {
      newAlerts.push({
        id: 'precip-warn',
        type: 'Precipitation',
        message: `High Precipitation Risk: ${currentTelemetry.precipitation}%`,
        severity: 'warning',
        timestamp: Date.now(),
      });
    }

    // Toast notifications for new alerts
    const currentIds = new Set(newAlerts.map((a) => a.id));

    newAlerts.forEach((alert) => {
      if (!alertedIdsRef.current.has(alert.id)) {
        if (alert.severity === 'critical') {
          toast.error(alert.message, {
            description: `Severity: ${alert.type} Critical`,
            duration: 10000,
          });
        } else {
          toast.warning(alert.message, {
            description: `Severity: ${alert.type} Warning`,
            duration: 5000,
          });
        }
      }
    });

    const hasNewCritical = newAlerts.some(
      (a) => a.severity === 'critical' && !alertedIdsRef.current.has(a.id),
    );
    const hasNewWarning = newAlerts.some(
      (a) => a.severity === 'warning' && !alertedIdsRef.current.has(a.id),
    );

    // FIX: read muted state from ref so isMuted is NOT in the dependency array
    if (!isMutedRef.current && (hasNewCritical || hasNewWarning)) {
      playAlertSound(hasNewCritical ? 'critical' : 'warning');
    }

    alertedIdsRef.current = currentIds;
    setActiveAlerts(newAlerts);
  }, [currentTelemetry, playAlertSound]);

  return {
    activeAlerts,
    isMuted,
    setIsMuted,
    showAlerts,
    setShowAlerts,
  };
}
