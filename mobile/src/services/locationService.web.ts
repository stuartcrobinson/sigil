/**
 * Location tracking service — web implementation.
 * Uses browser Geolocation API (navigator.geolocation) for real GPS on web.
 * Falls back to mock provider for testing.
 */

export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number;
  elevation?: number;
  speed?: number;
  accuracy?: number;
}

export interface LocationServiceOptions {
  intervalMs?: number;
  distanceIntervalM?: number;
}

type LocationCallback = (point: GpsPoint) => void;

let mockPoints: GpsPoint[] = [];
let mockIndex = 0;
let mockInterval: ReturnType<typeof setInterval> | null = null;
let useMock = false;

export function setMockLocationProvider(points: GpsPoint[]): void {
  mockPoints = points;
  mockIndex = 0;
  useMock = true;
}

export function clearMockLocationProvider(): void {
  mockPoints = [];
  mockIndex = 0;
  useMock = false;
  if (mockInterval) {
    clearInterval(mockInterval);
    mockInterval = null;
  }
}

export function isMockMode(): boolean {
  return useMock;
}

let isTracking = false;
let routePoints: GpsPoint[] = [];
let onPointCallback: LocationCallback | null = null;
let watchId: number | null = null;

export function startTracking(
  onPoint: LocationCallback,
  options: LocationServiceOptions = {}
): void {
  const { intervalMs = 5000 } = options;

  isTracking = true;
  routePoints = [];
  onPointCallback = onPoint;

  if (useMock) {
    mockIndex = 0;
    mockInterval = setInterval(() => {
      if (mockIndex < mockPoints.length && isTracking) {
        const point = mockPoints[mockIndex];
        routePoints.push(point);
        onPoint(point);
        mockIndex++;
      } else if (mockIndex >= mockPoints.length) {
        if (mockInterval) clearInterval(mockInterval);
      }
    }, intervalMs);
  } else if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    // Real GPS tracking via browser Geolocation API
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!isTracking) return;
        const point: GpsPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: position.timestamp,
          elevation: position.coords.altitude ?? undefined,
          speed: position.coords.speed ?? undefined,
          accuracy: position.coords.accuracy ?? undefined,
        };
        routePoints.push(point);
        onPoint(point);
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );
  } else {
    console.warn('Geolocation API not available in this browser');
  }
}

export function stopTracking(): GpsPoint[] {
  isTracking = false;
  onPointCallback = null;

  if (mockInterval) {
    clearInterval(mockInterval);
    mockInterval = null;
  }

  if (watchId !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  const result = [...routePoints];
  routePoints = [];
  return result;
}

export function getRoutePoints(): GpsPoint[] {
  return [...routePoints];
}

export function isCurrentlyTracking(): boolean {
  return isTracking;
}

export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

export function totalRouteDistance(points?: GpsPoint[]): number {
  const pts = points || routePoints;
  if (pts.length < 2) return 0;
  let distance = 0;
  for (let i = 1; i < pts.length; i++) {
    distance += haversineDistance(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
  }
  return distance;
}

export function currentPace(points?: GpsPoint[], windowSize: number = 5): number {
  const pts = points || routePoints;
  if (pts.length < 2) return 0;

  const recent = pts.slice(-windowSize);
  if (recent.length < 2) return 0;

  const dist = totalRouteDistance(recent);
  if (dist === 0) return 0;

  const durationMs = recent[recent.length - 1].timestamp - recent[0].timestamp;
  const durationSec = durationMs / 1000;
  return (durationSec / dist) * 1000;
}

export function averagePace(elapsedSeconds: number, distanceMeters: number): number {
  if (distanceMeters <= 0 || elapsedSeconds <= 0) return 0;
  const distanceKm = distanceMeters / 1000;
  return elapsedSeconds / distanceKm;
}

/**
 * Format pace as "M:SS/km".
 * Clamps to a displayable range: sub-0:30/km is GPS noise, over 30:00/km is standing still.
 */
export function formatPace(secondsPerKm: number): string {
  if (secondsPerKm <= 0 || !isFinite(secondsPerKm)) return '--:--';
  if (secondsPerKm < 30 || secondsPerKm > 1800) return '--:--';
  const totalSeconds = Math.round(secondsPerKm);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
