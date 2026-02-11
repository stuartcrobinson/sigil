import {
  haversineDistance,
  totalDistance,
  cumulativeDistances,
  averagePace,
  calculateSplits,
  formatPace,
  validateRoutePoints,
  GpsPoint,
} from './gpsUtils';

describe('GPS Utils', () => {
  // A realistic ~1km route with known distances
  const centralParkPoints: GpsPoint[] = [
    { lat: 40.7829, lng: -73.9654, timestamp: 1000000, speed: 3.0 },
    { lat: 40.7839, lng: -73.9654, timestamp: 1030000, speed: 3.1 }, // ~111m north
    { lat: 40.7849, lng: -73.9654, timestamp: 1060000, speed: 3.0 }, // ~111m north
    { lat: 40.7859, lng: -73.9654, timestamp: 1090000, speed: 2.9 }, // ~111m north
    { lat: 40.7869, lng: -73.9654, timestamp: 1120000, speed: 3.0 }, // ~111m north
    { lat: 40.7879, lng: -73.9654, timestamp: 1150000, speed: 3.1 }, // ~111m north
    { lat: 40.7889, lng: -73.9654, timestamp: 1180000, speed: 3.0 }, // ~111m north
    { lat: 40.7899, lng: -73.9654, timestamp: 1210000, speed: 2.8 }, // ~111m north
    { lat: 40.7909, lng: -73.9654, timestamp: 1240000, speed: 3.0 }, // ~111m north
    { lat: 40.7919, lng: -73.9654, timestamp: 1270000, speed: 3.2 }, // ~111m north
  ];

  describe('haversineDistance', () => {
    it('should calculate distance between two points', () => {
      // NYC to LA: ~3,944km (actual: 3,944,422m)
      const distance = haversineDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(3930000); // ±15km tolerance
      expect(distance).toBeLessThan(3960000);
    });

    it('should return 0 for same point', () => {
      const distance = haversineDistance(40.7829, -73.9654, 40.7829, -73.9654);
      expect(distance).toBe(0);
    });

    it('should calculate short distance accurately', () => {
      // 0.001 degrees lat at this latitude ≈ 111.2 meters
      const distance = haversineDistance(40.7829, -73.9654, 40.7839, -73.9654);
      expect(distance).toBeGreaterThan(108); // ±3m tolerance (~3%)
      expect(distance).toBeLessThan(114);
    });

    it('should handle equator points', () => {
      const distance = haversineDistance(0, 0, 0, 1);
      // 1 degree of longitude at equator ≈ 111.32km
      expect(distance).toBeGreaterThan(111000);
      expect(distance).toBeLessThan(112000);
    });

    it('should handle negative coordinates', () => {
      const distance = haversineDistance(-33.8688, 151.2093, -37.8136, 144.9631);
      // Sydney to Melbourne: ~714km (actual: 714,032m)
      expect(distance).toBeGreaterThan(710000); // ±5km tolerance
      expect(distance).toBeLessThan(720000);
    });
  });

  describe('totalDistance', () => {
    it('should calculate total route distance', () => {
      const distance = totalDistance(centralParkPoints);
      // 9 segments of ~111.2m each = ~1000.8m
      expect(distance).toBeGreaterThan(980); // ±3% tolerance
      expect(distance).toBeLessThan(1030);
    });

    it('should return 0 for single point', () => {
      expect(totalDistance([centralParkPoints[0]])).toBe(0);
    });

    it('should return 0 for empty array', () => {
      expect(totalDistance([])).toBe(0);
    });

    it('should handle two points', () => {
      const distance = totalDistance(centralParkPoints.slice(0, 2));
      expect(distance).toBeGreaterThan(108); // ±3m (~3%)
      expect(distance).toBeLessThan(114);
    });
  });

  describe('cumulativeDistances', () => {
    it('should return cumulative distances at each point', () => {
      const distances = cumulativeDistances(centralParkPoints);
      expect(distances).toHaveLength(centralParkPoints.length);
      expect(distances[0]).toBe(0);
      // Each segment is ~111m, so cumulative should increase
      for (let i = 1; i < distances.length; i++) {
        expect(distances[i]).toBeGreaterThan(distances[i - 1]);
      }
      // Last should be total
      expect(distances[distances.length - 1]).toBeCloseTo(totalDistance(centralParkPoints), 1);
    });

    it('should start at 0', () => {
      const distances = cumulativeDistances(centralParkPoints.slice(0, 2));
      expect(distances[0]).toBe(0);
    });
  });

  describe('averagePace', () => {
    it('should calculate average pace in seconds per km', () => {
      const pace = averagePace(centralParkPoints);
      // 270 seconds for ~1000m = ~270 seconds/km
      expect(pace).toBeGreaterThan(200);
      expect(pace).toBeLessThan(400);
    });

    it('should return 0 for single point', () => {
      expect(averagePace([centralParkPoints[0]])).toBe(0);
    });

    it('should return 0 for empty array', () => {
      expect(averagePace([])).toBe(0);
    });
  });

  describe('calculateSplits', () => {
    it('should calculate per-km splits', () => {
      // Need a longer route for 1km splits
      const longRoute: GpsPoint[] = [];
      for (let i = 0; i < 100; i++) {
        longRoute.push({
          lat: 40.7829 + (i * 0.001), // ~111m per step
          lng: -73.9654,
          timestamp: 1000000 + (i * 30000), // 30 seconds per step
        });
      }
      // Total ~11km, 3000 seconds

      const splits = calculateSplits(longRoute, 1000);
      expect(splits.length).toBeGreaterThan(0);
      // Each split should have valid pace
      splits.forEach(split => {
        expect(split.pace_seconds_per_km).toBeGreaterThan(0);
        expect(split.distance_meters).toBeGreaterThan(0);
        expect(split.duration_seconds).toBeGreaterThan(0);
      });
    });

    it('should return empty for single point', () => {
      expect(calculateSplits([centralParkPoints[0]])).toHaveLength(0);
    });

    it('should return empty for empty array', () => {
      expect(calculateSplits([])).toHaveLength(0);
    });

    it('should include partial final split', () => {
      // Route less than 1km
      const splits = calculateSplits(centralParkPoints, 1000);
      expect(splits.length).toBe(1); // Just the partial split
      expect(splits[0].distance_meters).toBeLessThan(1100);
    });

    it('should handle custom split distance', () => {
      const splits = calculateSplits(centralParkPoints, 500);
      // ~1000m route with 500m splits = 2 splits
      expect(splits.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('formatPace', () => {
    it('should format pace as M:SS', () => {
      expect(formatPace(300)).toBe('5:00'); // 5 min/km
      expect(formatPace(360)).toBe('6:00');
      expect(formatPace(270)).toBe('4:30');
      expect(formatPace(285)).toBe('4:45');
    });

    it('should handle seconds with leading zero', () => {
      expect(formatPace(305)).toBe('5:05');
      expect(formatPace(301)).toBe('5:01');
    });

    it('should return --:-- for 0 pace', () => {
      expect(formatPace(0)).toBe('--:--');
    });

    it('should return --:-- for negative pace', () => {
      expect(formatPace(-100)).toBe('--:--');
    });

    it('should return --:-- for Infinity', () => {
      expect(formatPace(Infinity)).toBe('--:--');
    });
  });

  describe('validateRoutePoints', () => {
    it('should accept valid route points', () => {
      const result = validateRoutePoints([
        { lat: 40.7829, lng: -73.9654, timestamp: 1000 },
        { lat: 40.7839, lng: -73.9654, timestamp: 2000 },
      ]);
      expect(result).toBeNull();
    });

    it('should accept empty array', () => {
      expect(validateRoutePoints([])).toBeNull();
    });

    it('should reject non-array', () => {
      expect(validateRoutePoints('not an array')).toContain('must be an array');
      expect(validateRoutePoints(123)).toContain('must be an array');
      expect(validateRoutePoints(null)).toContain('must be an array');
    });

    it('should reject point without lat', () => {
      const result = validateRoutePoints([{ lng: 0, timestamp: 1000 }]);
      expect(result).toContain('lat');
    });

    it('should reject point with invalid lat', () => {
      expect(validateRoutePoints([{ lat: 91, lng: 0, timestamp: 1000 }])).toContain('lat');
      expect(validateRoutePoints([{ lat: -91, lng: 0, timestamp: 1000 }])).toContain('lat');
    });

    it('should reject point without lng', () => {
      const result = validateRoutePoints([{ lat: 0, timestamp: 1000 }]);
      expect(result).toContain('lng');
    });

    it('should reject point with invalid lng', () => {
      expect(validateRoutePoints([{ lat: 0, lng: 181, timestamp: 1000 }])).toContain('lng');
      expect(validateRoutePoints([{ lat: 0, lng: -181, timestamp: 1000 }])).toContain('lng');
    });

    it('should reject point without timestamp', () => {
      const result = validateRoutePoints([{ lat: 0, lng: 0 }]);
      expect(result).toContain('timestamp');
    });

    it('should reject negative timestamp', () => {
      const result = validateRoutePoints([{ lat: 0, lng: 0, timestamp: -1 }]);
      expect(result).toContain('timestamp');
    });

    it('should report index of invalid point', () => {
      const result = validateRoutePoints([
        { lat: 0, lng: 0, timestamp: 1000 },
        { lat: 'bad', lng: 0, timestamp: 2000 },
      ]);
      expect(result).toContain('[1]');
    });

    it('should reject non-object points', () => {
      expect(validateRoutePoints([null])).toContain('must be an object');
      expect(validateRoutePoints([42])).toContain('must be an object');
    });
  });
});
