import React from 'react';
import { render } from '@testing-library/react-native';
import { LiveRouteMap } from './LiveRouteMap';
import type { GpsPoint } from '../services/locationService';

// Mock react-native-maps (not available in test environment)
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
    }));
    return <View {...props} testID="mock-map-view" />;
  });
  MockMapView.displayName = 'MockMapView';
  const MockPolyline = (props: any) => <View {...props} testID="mock-polyline" />;
  MockPolyline.displayName = 'MockPolyline';
  const MockMarker = (props: any) => <View {...props} testID="mock-marker" />;
  MockMarker.displayName = 'MockMarker';

  return {
    __esModule: true,
    default: MockMapView,
    Polyline: MockPolyline,
    Marker: MockMarker,
  };
});

const mockPoints: GpsPoint[] = [
  { lat: 40.7829, lng: -73.9654, latitude: 40.7829, longitude: -73.9654, timestamp: 1000 },
  { lat: 40.7830, lng: -73.9655, latitude: 40.7830, longitude: -73.9655, timestamp: 6000 },
  { lat: 40.7832, lng: -73.9657, latitude: 40.7832, longitude: -73.9657, timestamp: 11000 },
];

describe('LiveRouteMap', () => {
  it('renders with testID', () => {
    const { getByTestId } = render(
      <LiveRouteMap routePoints={[]} isTracking={false} />
    );
    expect(getByTestId('live-route-map')).toBeTruthy();
  });

  it('renders map view when react-native-maps is available', () => {
    const { getByTestId } = render(
      <LiveRouteMap routePoints={mockPoints} isTracking={true} />
    );
    expect(getByTestId('mock-map-view')).toBeTruthy();
  });

  it('renders polyline when 2+ points are provided', () => {
    const { getByTestId } = render(
      <LiveRouteMap routePoints={mockPoints} isTracking={true} />
    );
    expect(getByTestId('mock-polyline')).toBeTruthy();
  });

  it('does not render polyline with fewer than 2 points', () => {
    const { queryByTestId } = render(
      <LiveRouteMap routePoints={[mockPoints[0]]} isTracking={true} />
    );
    expect(queryByTestId('mock-polyline')).toBeNull();
  });

  it('renders start marker when points exist', () => {
    const { getAllByTestId } = render(
      <LiveRouteMap routePoints={mockPoints} isTracking={true} />
    );
    // Should have at least 2 markers (start + current position)
    const markers = getAllByTestId('mock-marker');
    expect(markers.length).toBeGreaterThanOrEqual(2);
  });

  it('renders current position marker when tracking', () => {
    const { getAllByTestId } = render(
      <LiveRouteMap routePoints={mockPoints} isTracking={true} />
    );
    const markers = getAllByTestId('mock-marker');
    // Last marker should be the "current position" (blue)
    expect(markers.length).toBe(2); // start + current
  });

  it('does not render current position marker when not tracking', () => {
    const { getAllByTestId } = render(
      <LiveRouteMap routePoints={mockPoints} isTracking={false} />
    );
    const markers = getAllByTestId('mock-marker');
    // Only start marker, no current position marker
    expect(markers.length).toBe(1);
  });

  it('shows point count overlay', () => {
    const { getByText } = render(
      <LiveRouteMap routePoints={mockPoints} isTracking={true} />
    );
    expect(getByText('3 pts')).toBeTruthy();
  });

  it('renders with empty route points', () => {
    const { getByTestId, queryByTestId } = render(
      <LiveRouteMap routePoints={[]} isTracking={false} />
    );
    expect(getByTestId('live-route-map')).toBeTruthy();
    expect(queryByTestId('mock-polyline')).toBeNull();
  });

  it('handles custom testID', () => {
    const { getByTestId } = render(
      <LiveRouteMap routePoints={[]} isTracking={false} testID="custom-map" />
    );
    expect(getByTestId('custom-map')).toBeTruthy();
  });
});

describe('LiveRouteMap route simplification', () => {
  it('passes through routes with fewer than 200 points unchanged', () => {
    // With 3 points, no simplification should occur
    const { getByTestId } = render(
      <LiveRouteMap routePoints={mockPoints} isTracking={true} />
    );
    const polyline = getByTestId('mock-polyline');
    expect(polyline.props.coordinates.length).toBe(3);
  });

  it('simplifies routes with more than 200 points', () => {
    // Generate 250 points in a straight line
    const manyPoints: GpsPoint[] = Array.from({ length: 250 }, (_, i) => ({
      lat: 40.7829 + i * 0.0001,
      lng: -73.9654 + i * 0.0001,
      latitude: 40.7829 + i * 0.0001,
      longitude: -73.9654 + i * 0.0001,
      timestamp: i * 5000,
    }));

    const { getByTestId } = render(
      <LiveRouteMap routePoints={manyPoints} isTracking={true} />
    );
    const polyline = getByTestId('mock-polyline');
    // Straight line simplifies aggressively — should have far fewer than 250 points
    expect(polyline.props.coordinates.length).toBeLessThan(250);
    // But should have at least 2 (start and end)
    expect(polyline.props.coordinates.length).toBeGreaterThanOrEqual(2);
  });
});
