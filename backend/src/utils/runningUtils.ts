/**
 * Running/Walking Activity Utilities
 *
 * Utilities for validating and processing GPS-based running/walking activity data.
 */

export interface GPSCoordinate {
  lat: number;
  lng: number;
  timestamp: string;
  elevation?: number;
}

export interface PaceData {
  average: string;  // Format: "MM:SS" per km or mile
  current?: string;
  max?: string;
  min?: string;
}

export interface Split {
  distance: number;  // in meters
  time: string;      // Format: "MM:SS"
  pace: string;      // Format: "MM:SS" per km or mile
}

export interface ElevationData {
  gain: number;   // Total elevation gain in meters
  loss: number;   // Total elevation loss in meters
  max: number;    // Highest elevation in meters
  min: number;    // Lowest elevation in meters
}

export interface RunningActivityData {
  route?: GPSCoordinate[];
  pace?: PaceData;
  splits?: Split[];
  elevation?: ElevationData;
}

/**
 * Validates GPS coordinate data
 */
export function validateGPSCoordinate(coord: any): coord is GPSCoordinate {
  if (!coord || typeof coord !== 'object') return false;

  // Validate latitude (-90 to 90)
  if (typeof coord.lat !== 'number' || coord.lat < -90 || coord.lat > 90) {
    return false;
  }

  // Validate longitude (-180 to 180)
  if (typeof coord.lng !== 'number' || coord.lng < -180 || coord.lng > 180) {
    return false;
  }

  // Validate timestamp (ISO 8601 format)
  if (typeof coord.timestamp !== 'string' || isNaN(Date.parse(coord.timestamp))) {
    return false;
  }

  // Elevation is optional, but if present must be a number
  if (coord.elevation !== undefined && typeof coord.elevation !== 'number') {
    return false;
  }

  return true;
}

/**
 * Validates running activity data structure
 */
export function validateRunningActivityData(data: any): data is RunningActivityData {
  if (!data || typeof data !== 'object') return false;

  // Route is optional, but if present must be valid array of coordinates
  if (data.route !== undefined) {
    if (!Array.isArray(data.route)) return false;
    if (data.route.length > 0 && !data.route.every(validateGPSCoordinate)) {
      return false;
    }
  }

  // Pace is optional, but if present must have valid structure
  if (data.pace !== undefined) {
    if (typeof data.pace !== 'object') return false;
    if (data.pace.average && typeof data.pace.average !== 'string') return false;
    if (data.pace.current && typeof data.pace.current !== 'string') return false;
    if (data.pace.max && typeof data.pace.max !== 'string') return false;
    if (data.pace.min && typeof data.pace.min !== 'string') return false;
  }

  // Splits are optional, but if present must be valid array
  if (data.splits !== undefined) {
    if (!Array.isArray(data.splits)) return false;
    for (const split of data.splits) {
      if (typeof split.distance !== 'number' || split.distance <= 0) return false;
      if (typeof split.time !== 'string') return false;
      if (typeof split.pace !== 'string') return false;
    }
  }

  // Elevation is optional, but if present must have valid structure
  if (data.elevation !== undefined) {
    if (typeof data.elevation !== 'object') return false;
    if (typeof data.elevation.gain !== 'number' || data.elevation.gain < 0) return false;
    if (typeof data.elevation.loss !== 'number' || data.elevation.loss < 0) return false;
    if (typeof data.elevation.max !== 'number') return false;
    if (typeof data.elevation.min !== 'number') return false;
  }

  return true;
}

/**
 * Calculates distance between two GPS coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(coord1: GPSCoordinate, coord2: GPSCoordinate): number {
  const R = 6371000; // Earth's radius in meters
  const lat1 = coord1.lat * Math.PI / 180;
  const lat2 = coord2.lat * Math.PI / 180;
  const deltaLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const deltaLng = (coord2.lng - coord1.lng) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculates total distance from GPS route
 * Returns distance in meters
 */
export function calculateTotalDistance(route: GPSCoordinate[]): number {
  if (route.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < route.length; i++) {
    totalDistance += calculateDistance(route[i - 1], route[i]);
  }

  return totalDistance;
}

/**
 * Calculates pace from distance (meters) and time (seconds)
 * Returns pace as string in format "MM:SS" per kilometer
 */
export function calculatePace(distanceMeters: number, timeSeconds: number): string {
  if (distanceMeters <= 0 || timeSeconds <= 0) return '--:--';

  const paceSecondsPerKm = (timeSeconds / distanceMeters) * 1000;
  const minutes = Math.floor(paceSecondsPerKm / 60);
  const seconds = Math.floor(paceSecondsPerKm % 60);

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Generates splits from GPS route
 * Creates a split for each splitDistance (default 1000m = 1km)
 */
export function generateSplits(route: GPSCoordinate[], splitDistance: number = 1000): Split[] {
  if (route.length < 2) return [];

  const splits: Split[] = [];
  let currentDistance = 0;
  let splitStartTime = new Date(route[0].timestamp).getTime();

  for (let i = 1; i < route.length; i++) {
    const segmentDistance = calculateDistance(route[i - 1], route[i]);
    currentDistance += segmentDistance;

    // Check if we've completed a split
    if (currentDistance >= splitDistance) {
      const splitEndTime = new Date(route[i].timestamp).getTime();
      const splitDuration = (splitEndTime - splitStartTime) / 1000; // in seconds

      splits.push({
        distance: splitDistance,
        time: formatDuration(splitDuration),
        pace: calculatePace(splitDistance, splitDuration)
      });

      // Reset for next split
      currentDistance -= splitDistance;
      splitStartTime = splitEndTime;
    }
  }

  return splits;
}

/**
 * Formats duration in seconds to "MM:SS" or "HH:MM:SS" format
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculates elevation data from GPS route
 */
export function calculateElevation(route: GPSCoordinate[]): ElevationData | null {
  const elevations = route.map(coord => coord.elevation).filter((e): e is number => e !== undefined);

  if (elevations.length === 0) return null;

  let gain = 0;
  let loss = 0;

  for (let i = 1; i < elevations.length; i++) {
    const diff = elevations[i] - elevations[i - 1];
    if (diff > 0) {
      gain += diff;
    } else {
      loss += Math.abs(diff);
    }
  }

  return {
    gain: Math.round(gain),
    loss: Math.round(loss),
    max: Math.max(...elevations),
    min: Math.min(...elevations)
  };
}
