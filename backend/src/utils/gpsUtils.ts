/**
 * GPS utility functions for route tracking, distance, pace, and splits.
 */

export interface GpsPoint {
  lat: number;
  lng: number;
  timestamp: number; // Unix ms
  elevation?: number; // meters
  speed?: number; // m/s
  accuracy?: number; // meters
}

export interface Split {
  distance_meters: number;
  duration_seconds: number;
  pace_seconds_per_km: number;
  start_index: number;
  end_index: number;
}

/**
 * Calculate distance between two GPS points using the Haversine formula.
 * Returns distance in meters.
 */
export function haversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000; // Earth radius in meters
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

/**
 * Calculate total distance of a GPS route in meters.
 */
export function totalDistance(points: GpsPoint[]): number {
  if (points.length < 2) return 0;
  let distance = 0;
  for (let i = 1; i < points.length; i++) {
    distance += haversineDistance(
      points[i - 1].lat, points[i - 1].lng,
      points[i].lat, points[i].lng
    );
  }
  return distance;
}

/**
 * Calculate cumulative distances at each point. Returns array of distances in meters.
 */
export function cumulativeDistances(points: GpsPoint[]): number[] {
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    const segDist = haversineDistance(
      points[i - 1].lat, points[i - 1].lng,
      points[i].lat, points[i].lng
    );
    distances.push(distances[i - 1] + segDist);
  }
  return distances;
}

/**
 * Calculate average pace in seconds per kilometer.
 */
export function averagePace(points: GpsPoint[]): number {
  if (points.length < 2) return 0;
  const dist = totalDistance(points);
  if (dist === 0) return 0;
  const durationMs = points[points.length - 1].timestamp - points[0].timestamp;
  const durationSec = durationMs / 1000;
  return (durationSec / dist) * 1000; // seconds per km
}

/**
 * Calculate per-kilometer splits from GPS points.
 */
export function calculateSplits(points: GpsPoint[], splitDistanceMeters: number = 1000): Split[] {
  if (points.length < 2) return [];

  const cumDist = cumulativeDistances(points);
  const splits: Split[] = [];
  let splitStart = 0;
  let nextSplitDist = splitDistanceMeters;

  for (let i = 1; i < points.length; i++) {
    if (cumDist[i] >= nextSplitDist) {
      const splitDist = cumDist[i] - cumDist[splitStart];
      const durationMs = points[i].timestamp - points[splitStart].timestamp;
      const durationSec = durationMs / 1000;
      const paceSecPerKm = splitDist > 0 ? (durationSec / splitDist) * 1000 : 0;

      splits.push({
        distance_meters: splitDist,
        duration_seconds: durationSec,
        pace_seconds_per_km: paceSecPerKm,
        start_index: splitStart,
        end_index: i,
      });

      splitStart = i;
      nextSplitDist += splitDistanceMeters;
    }
  }

  // Final partial split
  if (splitStart < points.length - 1) {
    const splitDist = cumDist[points.length - 1] - cumDist[splitStart];
    const durationMs = points[points.length - 1].timestamp - points[splitStart].timestamp;
    const durationSec = durationMs / 1000;
    const paceSecPerKm = splitDist > 0 ? (durationSec / splitDist) * 1000 : 0;

    splits.push({
      distance_meters: splitDist,
      duration_seconds: durationSec,
      pace_seconds_per_km: paceSecPerKm,
      start_index: splitStart,
      end_index: points.length - 1,
    });
  }

  return splits;
}

/**
 * Format pace (seconds per km) as "M:SS" string.
 */
export function formatPace(secondsPerKm: number): string {
  if (secondsPerKm <= 0 || !isFinite(secondsPerKm)) return '--:--';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Validate a route_points array structure.
 * Returns null if valid, error message if invalid.
 */
export function validateRoutePoints(points: unknown): string | null {
  if (!Array.isArray(points)) return 'route_points must be an array';
  if (points.length === 0) return null; // empty is ok

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (typeof p !== 'object' || p === null) return `route_points[${i}] must be an object`;
    const pt = p as Record<string, unknown>;
    if (typeof pt.lat !== 'number' || pt.lat < -90 || pt.lat > 90) {
      return `route_points[${i}].lat must be a number between -90 and 90`;
    }
    if (typeof pt.lng !== 'number' || pt.lng < -180 || pt.lng > 180) {
      return `route_points[${i}].lng must be a number between -180 and 180`;
    }
    if (typeof pt.timestamp !== 'number' || pt.timestamp < 0) {
      return `route_points[${i}].timestamp must be a positive number`;
    }
  }

  return null;
}
