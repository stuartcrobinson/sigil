import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import type { GpsPoint } from '../services/locationService';
import type { CapturedPhoto } from '../screens/RunningActivityScreen';

interface LiveRouteMapProps {
  routePoints: GpsPoint[];
  isTracking: boolean;
  photos?: CapturedPhoto[];
  testID?: string;
}

// Load Leaflet CSS + JS from CDN once
let leafletReady: Promise<void> | null = null;

function ensureLeaflet(): Promise<void> {
  if (leafletReady) return leafletReady;

  leafletReady = new Promise<void>((resolve) => {
    if ((window as any).L) {
      resolve();
      return;
    }

    // Load CSS
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => resolve();
    script.onerror = () => {
      leafletReady = null;
      resolve();
    };
    document.head.appendChild(script);
  });

  return leafletReady;
}

export const LiveRouteMap: React.FC<LiveRouteMapProps> = ({
  routePoints,
  isTracking,
  photos = [],
  testID = 'live-route-map',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);
  const photoMarkersRef = useRef<any[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  // Convert GpsPoint[] to [lat, lng] for Leaflet
  const coordinates = useMemo(() => {
    return routePoints.map(p => [
      (p as any).latitude ?? p.lat,
      (p as any).longitude ?? p.lng,
    ] as [number, number]);
  }, [routePoints]);

  const currentPosition = coordinates.length > 0 ? coordinates[coordinates.length - 1] : null;
  const startPosition = coordinates.length > 0 ? coordinates[0] : null;

  // Load Leaflet
  useEffect(() => {
    ensureLeaflet().then(() => setLoaded(true));
  }, []);

  // Initialize map
  useEffect(() => {
    if (!loaded || !containerRef.current || mapInstanceRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: false,
    }).setView([40.7128, -74.006], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      polylineRef.current = null;
      startMarkerRef.current = null;
      currentMarkerRef.current = null;
      photoMarkersRef.current = [];
    };
  }, [loaded]);

  // Update route polyline and markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    // Update polyline
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
    }
    if (coordinates.length >= 2) {
      polylineRef.current = L.polyline(coordinates, {
        color: '#FF4500',
        weight: 4,
        opacity: 0.9,
        lineJoin: 'round',
        lineCap: 'round',
      }).addTo(map);
    }

    // Start marker (green circle)
    if (startMarkerRef.current) {
      map.removeLayer(startMarkerRef.current);
    }
    if (startPosition) {
      startMarkerRef.current = L.circleMarker(startPosition, {
        radius: 8,
        fillColor: '#4CAF50',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1,
      }).bindPopup('Start').addTo(map);
    }

    // Current position marker (blue circle)
    if (currentMarkerRef.current) {
      map.removeLayer(currentMarkerRef.current);
    }
    if (currentPosition && isTracking) {
      currentMarkerRef.current = L.circleMarker(currentPosition, {
        radius: 10,
        fillColor: '#2196F3',
        color: '#fff',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.9,
      }).bindPopup('You are here').addTo(map);
    }

    // Pan to current position when tracking
    if (currentPosition && isTracking) {
      map.panTo(currentPosition, { animate: true, duration: 0.5 });
    } else if (coordinates.length >= 2 && polylineRef.current) {
      map.fitBounds(polylineRef.current.getBounds(), { padding: [30, 30] });
    } else if (currentPosition) {
      map.setView(currentPosition, 15);
    }
  }, [coordinates, currentPosition, startPosition, isTracking]);

  // Update photo markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = (window as any).L;
    if (!map || !L) return;

    // Remove old photo markers
    photoMarkersRef.current.forEach(m => map.removeLayer(m));
    photoMarkersRef.current = [];

    // Add new photo markers
    photos.filter(p => p.lat && p.lng).forEach((photo, i) => {
      const marker = L.circleMarker([photo.lat!, photo.lng!], {
        radius: 6,
        fillColor: '#FF9800',
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 1,
      }).bindPopup(`Photo ${i + 1}`).addTo(map);
      photoMarkersRef.current.push(marker);
    });
  }, [photos]);

  if (!loaded) {
    return (
      <View style={styles.container} testID={testID}>
        <View style={styles.loading}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container} testID={testID}>
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 200,
          borderRadius: 12,
        }}
      />
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
  pointCountOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1000,
  },
  pointCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E8E8E8',
    minHeight: 200,
    borderRadius: 12,
  },
  loadingText: {
    color: '#999',
    fontSize: 16,
  },
});
