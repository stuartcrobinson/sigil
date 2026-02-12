import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import type { GpsPoint } from '../services/locationService';

interface LiveRouteMapProps {
  routePoints: GpsPoint[];
  isTracking: boolean;
  testID?: string;
}

export const LiveRouteMap: React.FC<LiveRouteMapProps> = ({
  routePoints,
  testID = 'live-route-map',
}) => {
  return (
    <View style={styles.fallback} testID={testID}>
      <Text style={styles.fallbackText}>
        Route Map{'\n'}({routePoints.length} GPS points recorded)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
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
