import React, { useRef, useMemo, useCallback } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Text } from './Text';
import type { GpsPoint } from '../services/locationService';

// Conditional import: react-native-maps may not be available in test/web
let MapView: any = null;
let Polyline: any = null;
let Marker: any = null;

try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Polyline = Maps.Polyline;
  Marker = Maps.Marker;
} catch {
  // react-native-maps not available (web, tests, etc.)
}

interface LiveRouteMapProps {
  routePoints: GpsPoint[];
  isTracking: boolean;
  testID?: string;
}

/**
 * Simplified Douglas-Peucker route simplification (on-device).
 * Reduces point count for smooth map rendering while preserving route shape.
 */
function simplifyRoute(
  points: { latitude: number; longitude: number }[],
  tolerance: number = 0.00003
): { latitude: number; longitude: number }[] {
  if (points.length <= 2) return points;

  // Find point with max distance from line between first and last
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyRoute(points.slice(0, maxIdx + 1), tolerance);
    const right = simplifyRoute(points.slice(maxIdx), tolerance);
    return [...left.slice(0, -1), ...right];
  }

  return [first, last];
}

function perpendicularDistance(
  point: { latitude: number; longitude: number },
  lineStart: { latitude: number; longitude: number },
  lineEnd: { latitude: number; longitude: number }
): number {
  const dx = lineEnd.longitude - lineStart.longitude;
  const dy = lineEnd.latitude - lineStart.latitude;

  if (dx === 0 && dy === 0) {
    return Math.sqrt(
      (point.longitude - lineStart.longitude) ** 2 +
      (point.latitude - lineStart.latitude) ** 2
    );
  }

  const t = Math.max(0, Math.min(1,
    ((point.longitude - lineStart.longitude) * dx + (point.latitude - lineStart.latitude) * dy) /
    (dx * dx + dy * dy)
  ));

  const projLng = lineStart.longitude + t * dx;
  const projLat = lineStart.latitude + t * dy;

  return Math.sqrt((point.longitude - projLng) ** 2 + (point.latitude - projLat) ** 2);
}

export const LiveRouteMap: React.FC<LiveRouteMapProps> = ({
  routePoints,
  isTracking,
  testID = 'live-route-map',
}) => {
  const mapRef = useRef<any>(null);

  // Convert GpsPoint[] to map coordinates
  const coordinates = useMemo(() => {
    return routePoints.map(p => ({
      latitude: p.latitude ?? p.lat,
      longitude: p.longitude ?? p.lng,
    }));
  }, [routePoints]);

  // Simplify for rendering (keeps it smooth with 1000+ points)
  const displayCoords = useMemo(() => {
    if (coordinates.length <= 200) return coordinates;
    return simplifyRoute(coordinates, 0.00003);
  }, [coordinates]);

  // Current position (last point)
  const currentPosition = coordinates.length > 0 ? coordinates[coordinates.length - 1] : null;
  const startPosition = coordinates.length > 0 ? coordinates[0] : null;

  // Auto-center map on current position
  const handleNewPoint = useCallback(() => {
    if (currentPosition && mapRef.current?.animateToRegion && isTracking) {
      mapRef.current.animateToRegion({
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }, 500);
    }
  }, [currentPosition, isTracking]);

  // Center when new points arrive
  React.useEffect(() => {
    handleNewPoint();
  }, [routePoints.length, handleNewPoint]);

  // Fallback for web/tests where react-native-maps is not available
  if (!MapView || Platform.OS === 'web') {
    return (
      <View style={styles.fallback} testID={testID}>
        <Text style={styles.fallbackText}>
          Route Map{'\n'}({routePoints.length} GPS points recorded)
        </Text>
      </View>
    );
  }

  const initialRegion = currentPosition
    ? {
        latitude: currentPosition.latitude,
        longitude: currentPosition.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }
    : {
        latitude: 40.7128,
        longitude: -74.006,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

  return (
    <View style={styles.container} testID={testID}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={false}
        rotateEnabled={false}
        pitchEnabled={false}
      >
        {displayCoords.length >= 2 && (
          <Polyline
            coordinates={displayCoords}
            strokeColor="#FF4500"
            strokeWidth={4}
            lineJoin="round"
            lineCap="round"
          />
        )}

        {/* Start marker */}
        {startPosition && (
          <Marker
            coordinate={startPosition}
            title="Start"
            pinColor="green"
          />
        )}

        {/* Current position marker */}
        {currentPosition && isTracking && (
          <Marker
            coordinate={currentPosition}
            title="You"
            pinColor="blue"
          />
        )}
      </MapView>

      {/* Point count overlay */}
      <View style={styles.pointCountOverlay}>
        <Text style={styles.pointCountText}>
          {routePoints.length} pts
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    margin: 16,
    minHeight: 200,
  },
  map: {
    flex: 1,
  },
  pointCountOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pointCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  fallback: {
    flex: 1,
    backgroundColor: '#E8E8E8',
    margin: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  fallbackText: {
    color: '#999',
    fontSize: 16,
    textAlign: 'center',
  },
});
