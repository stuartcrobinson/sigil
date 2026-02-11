import {
  validateGPSCoordinate,
  validateRunningActivityData,
  calculateDistance,
  calculateTotalDistance,
  calculatePace,
  generateSplits,
  calculateElevation,
  GPSCoordinate,
  RunningActivityData
} from './runningUtils';

describe('runningUtils', () => {
  describe('validateGPSCoordinate', () => {
    it('should validate valid GPS coordinate', () => {
      const coord = {
        lat: 37.7749,
        lng: -122.4194,
        timestamp: '2026-02-10T10:00:00Z'
      };
      expect(validateGPSCoordinate(coord)).toBe(true);
    });

    it('should validate GPS coordinate with elevation', () => {
      const coord = {
        lat: 37.7749,
        lng: -122.4194,
        timestamp: '2026-02-10T10:00:00Z',
        elevation: 150
      };
      expect(validateGPSCoordinate(coord)).toBe(true);
    });

    it('should reject coordinate with invalid latitude (> 90)', () => {
      const coord = {
        lat: 95,
        lng: -122.4194,
        timestamp: '2026-02-10T10:00:00Z'
      };
      expect(validateGPSCoordinate(coord)).toBe(false);
    });

    it('should reject coordinate with invalid latitude (< -90)', () => {
      const coord = {
        lat: -100,
        lng: -122.4194,
        timestamp: '2026-02-10T10:00:00Z'
      };
      expect(validateGPSCoordinate(coord)).toBe(false);
    });

    it('should reject coordinate with invalid longitude (> 180)', () => {
      const coord = {
        lat: 37.7749,
        lng: 185,
        timestamp: '2026-02-10T10:00:00Z'
      };
      expect(validateGPSCoordinate(coord)).toBe(false);
    });

    it('should reject coordinate with invalid longitude (< -180)', () => {
      const coord = {
        lat: 37.7749,
        lng: -190,
        timestamp: '2026-02-10T10:00:00Z'
      };
      expect(validateGPSCoordinate(coord)).toBe(false);
    });

    it('should reject coordinate with invalid timestamp', () => {
      const coord = {
        lat: 37.7749,
        lng: -122.4194,
        timestamp: 'not-a-date'
      };
      expect(validateGPSCoordinate(coord)).toBe(false);
    });

    it('should reject coordinate with non-numeric elevation', () => {
      const coord = {
        lat: 37.7749,
        lng: -122.4194,
        timestamp: '2026-02-10T10:00:00Z',
        elevation: 'high'
      };
      expect(validateGPSCoordinate(coord)).toBe(false);
    });

    it('should reject null or undefined input', () => {
      expect(validateGPSCoordinate(null)).toBe(false);
      expect(validateGPSCoordinate(undefined)).toBe(false);
    });
  });

  describe('validateRunningActivityData', () => {
    it('should validate valid running activity data with route', () => {
      const data: RunningActivityData = {
        route: [
          { lat: 37.7749, lng: -122.4194, timestamp: '2026-02-10T10:00:00Z' },
          { lat: 37.7750, lng: -122.4195, timestamp: '2026-02-10T10:00:10Z' }
        ],
        pace: {
          average: '5:30',
          current: '5:20',
          max: '4:50',
          min: '6:10'
        }
      };
      expect(validateRunningActivityData(data)).toBe(true);
    });

    it('should validate empty running activity data', () => {
      const data: RunningActivityData = {};
      expect(validateRunningActivityData(data)).toBe(true);
    });

    it('should validate data with splits', () => {
      const data: RunningActivityData = {
        splits: [
          { distance: 1000, time: '5:25', pace: '5:25' },
          { distance: 2000, time: '5:35', pace: '5:35' }
        ]
      };
      expect(validateRunningActivityData(data)).toBe(true);
    });

    it('should validate data with elevation', () => {
      const data: RunningActivityData = {
        elevation: {
          gain: 120,
          loss: 80,
          max: 150,
          min: 10
        }
      };
      expect(validateRunningActivityData(data)).toBe(true);
    });

    it('should reject data with invalid route (not array)', () => {
      const data = {
        route: 'not-an-array'
      };
      expect(validateRunningActivityData(data)).toBe(false);
    });

    it('should reject data with invalid GPS coordinates in route', () => {
      const data = {
        route: [
          { lat: 37.7749, lng: -122.4194, timestamp: '2026-02-10T10:00:00Z' },
          { lat: 200, lng: -122.4195, timestamp: '2026-02-10T10:00:10Z' }
        ]
      };
      expect(validateRunningActivityData(data)).toBe(false);
    });

    it('should reject data with invalid pace structure', () => {
      const data = {
        pace: {
          average: 530  // Should be string, not number
        }
      };
      expect(validateRunningActivityData(data)).toBe(false);
    });

    it('should reject data with invalid splits (negative distance)', () => {
      const data = {
        splits: [
          { distance: -1000, time: '5:25', pace: '5:25' }
        ]
      };
      expect(validateRunningActivityData(data)).toBe(false);
    });

    it('should reject data with invalid elevation (negative gain)', () => {
      const data = {
        elevation: {
          gain: -10,
          loss: 80,
          max: 150,
          min: 10
        }
      };
      expect(validateRunningActivityData(data)).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    it('should calculate distance between two close coordinates', () => {
      const coord1: GPSCoordinate = {
        lat: 37.7749,
        lng: -122.4194,
        timestamp: '2026-02-10T10:00:00Z'
      };
      const coord2: GPSCoordinate = {
        lat: 37.7750,
        lng: -122.4195,
        timestamp: '2026-02-10T10:00:10Z'
      };

      const distance = calculateDistance(coord1, coord2);
      // Haversine for these coords: ~13.9m
      expect(distance).toBeGreaterThan(12);
      expect(distance).toBeLessThan(16);
    });

    it('should calculate zero distance for same coordinates', () => {
      const coord: GPSCoordinate = {
        lat: 37.7749,
        lng: -122.4194,
        timestamp: '2026-02-10T10:00:00Z'
      };

      const distance = calculateDistance(coord, coord);
      expect(distance).toBe(0);
    });

    it('should calculate distance between far coordinates', () => {
      const sanFrancisco: GPSCoordinate = {
        lat: 37.7749,
        lng: -122.4194,
        timestamp: '2026-02-10T10:00:00Z'
      };
      const newYork: GPSCoordinate = {
        lat: 40.7128,
        lng: -74.0060,
        timestamp: '2026-02-10T10:00:00Z'
      };

      const distance = calculateDistance(sanFrancisco, newYork);
      // SF to NYC is ~4,130 km via Haversine
      expect(distance).toBeGreaterThan(4_100_000);
      expect(distance).toBeLessThan(4_200_000);
    });
  });

  describe('calculateTotalDistance', () => {
    it('should calculate total distance from route', () => {
      const route: GPSCoordinate[] = [
        { lat: 37.7749, lng: -122.4194, timestamp: '2026-02-10T10:00:00Z' },
        { lat: 37.7750, lng: -122.4195, timestamp: '2026-02-10T10:00:10Z' },
        { lat: 37.7751, lng: -122.4196, timestamp: '2026-02-10T10:00:20Z' }
      ];

      const distance = calculateTotalDistance(route);
      // 2 segments of ~13.9m each = ~27.8m
      expect(distance).toBeGreaterThan(24);
      expect(distance).toBeLessThan(32);
    });

    it('should return 0 for route with single point', () => {
      const route: GPSCoordinate[] = [
        { lat: 37.7749, lng: -122.4194, timestamp: '2026-02-10T10:00:00Z' }
      ];

      const distance = calculateTotalDistance(route);
      expect(distance).toBe(0);
    });

    it('should return 0 for empty route', () => {
      const route: GPSCoordinate[] = [];
      const distance = calculateTotalDistance(route);
      expect(distance).toBe(0);
    });
  });

  describe('calculatePace', () => {
    it('should calculate pace for 1km in 5 minutes', () => {
      const pace = calculatePace(1000, 300); // 1000m in 300 seconds
      expect(pace).toBe('5:00');
    });

    it('should calculate pace for 5km in 30 minutes', () => {
      const pace = calculatePace(5000, 1800); // 5000m in 1800 seconds
      expect(pace).toBe('6:00');
    });

    it('should calculate pace for fast run (4:30/km)', () => {
      const pace = calculatePace(1000, 270); // 1000m in 270 seconds
      expect(pace).toBe('4:30');
    });

    it('should return "--:--" for zero distance', () => {
      const pace = calculatePace(0, 300);
      expect(pace).toBe('--:--');
    });

    it('should return "--:--" for zero time', () => {
      const pace = calculatePace(1000, 0);
      expect(pace).toBe('--:--');
    });

    it('should pad seconds with leading zero', () => {
      const pace = calculatePace(1000, 305); // Should be "5:05"
      expect(pace).toBe('5:05');
    });
  });

  describe('generateSplits', () => {
    it('should generate splits for route > 1km', () => {
      // Create a route of about 2.5km
      const route: GPSCoordinate[] = [];
      const startLat = 37.7749;
      const startLng = -122.4194;

      for (let i = 0; i <= 250; i++) {
        route.push({
          lat: startLat + (i * 0.0001), // Roughly 11m per 0.0001 degree
          lng: startLng + (i * 0.0001),
          timestamp: new Date(Date.now() + i * 10000).toISOString()
        });
      }

      const splits = generateSplits(route, 1000);
      expect(splits.length).toBeGreaterThan(0);
      expect(splits[0].distance).toBe(1000);
      expect(splits[0].time).toBeDefined();
      expect(splits[0].pace).toBeDefined();
    });

    it('should return empty array for short route', () => {
      const route: GPSCoordinate[] = [
        { lat: 37.7749, lng: -122.4194, timestamp: '2026-02-10T10:00:00Z' },
        { lat: 37.7750, lng: -122.4195, timestamp: '2026-02-10T10:00:10Z' }
      ];

      const splits = generateSplits(route, 1000);
      expect(splits).toEqual([]);
    });

    it('should return empty array for single point route', () => {
      const route: GPSCoordinate[] = [
        { lat: 37.7749, lng: -122.4194, timestamp: '2026-02-10T10:00:00Z' }
      ];

      const splits = generateSplits(route);
      expect(splits).toEqual([]);
    });
  });

  describe('calculateElevation', () => {
    it('should calculate elevation gain and loss', () => {
      const route: GPSCoordinate[] = [
        { lat: 37.7749, lng: -122.4194, timestamp: '2026-02-10T10:00:00Z', elevation: 10 },
        { lat: 37.7750, lng: -122.4195, timestamp: '2026-02-10T10:00:10Z', elevation: 30 },
        { lat: 37.7751, lng: -122.4196, timestamp: '2026-02-10T10:00:20Z', elevation: 20 },
        { lat: 37.7752, lng: -122.4197, timestamp: '2026-02-10T10:00:30Z', elevation: 40 }
      ];

      const elevation = calculateElevation(route);
      expect(elevation).not.toBeNull();
      expect(elevation!.gain).toBe(40); // 20 + 20
      expect(elevation!.loss).toBe(10);
      expect(elevation!.max).toBe(40);
      expect(elevation!.min).toBe(10);
    });

    it('should return null for route without elevation data', () => {
      const route: GPSCoordinate[] = [
        { lat: 37.7749, lng: -122.4194, timestamp: '2026-02-10T10:00:00Z' },
        { lat: 37.7750, lng: -122.4195, timestamp: '2026-02-10T10:00:10Z' }
      ];

      const elevation = calculateElevation(route);
      expect(elevation).toBeNull();
    });

    it('should handle route with partial elevation data', () => {
      const route: GPSCoordinate[] = [
        { lat: 37.7749, lng: -122.4194, timestamp: '2026-02-10T10:00:00Z', elevation: 10 },
        { lat: 37.7750, lng: -122.4195, timestamp: '2026-02-10T10:00:10Z' },
        { lat: 37.7751, lng: -122.4196, timestamp: '2026-02-10T10:00:20Z', elevation: 20 }
      ];

      const elevation = calculateElevation(route);
      expect(elevation).not.toBeNull();
      expect(elevation!.gain).toBe(10);
      expect(elevation!.loss).toBe(0);
    });

    it('should handle flat route (no elevation change)', () => {
      const route: GPSCoordinate[] = [
        { lat: 37.7749, lng: -122.4194, timestamp: '2026-02-10T10:00:00Z', elevation: 10 },
        { lat: 37.7750, lng: -122.4195, timestamp: '2026-02-10T10:00:10Z', elevation: 10 },
        { lat: 37.7751, lng: -122.4196, timestamp: '2026-02-10T10:00:20Z', elevation: 10 }
      ];

      const elevation = calculateElevation(route);
      expect(elevation).not.toBeNull();
      expect(elevation!.gain).toBe(0);
      expect(elevation!.loss).toBe(0);
      expect(elevation!.max).toBe(10);
      expect(elevation!.min).toBe(10);
    });
  });
});
