import {
  setMockLocationProvider,
  clearMockLocationProvider,
  isMockMode,
  startTracking,
  stopTracking,
  getRoutePoints,
  isCurrentlyTracking,
  haversineDistance,
  totalRouteDistance,
  currentPace,
  formatPace,
  GpsPoint,
} from './locationService';

// Central Park simulated route (~1km going north)
const mockRoute: GpsPoint[] = [
  { lat: 40.7829, lng: -73.9654, timestamp: 1000000, speed: 3.0 },
  { lat: 40.7839, lng: -73.9654, timestamp: 1005000, speed: 3.1 },
  { lat: 40.7849, lng: -73.9654, timestamp: 1010000, speed: 3.0 },
  { lat: 40.7859, lng: -73.9654, timestamp: 1015000, speed: 2.9 },
  { lat: 40.7869, lng: -73.9654, timestamp: 1020000, speed: 3.0 },
  { lat: 40.7879, lng: -73.9654, timestamp: 1025000, speed: 3.1 },
  { lat: 40.7889, lng: -73.9654, timestamp: 1030000, speed: 3.0 },
  { lat: 40.7899, lng: -73.9654, timestamp: 1035000, speed: 2.8 },
  { lat: 40.7909, lng: -73.9654, timestamp: 1040000, speed: 3.0 },
  { lat: 40.7919, lng: -73.9654, timestamp: 1045000, speed: 3.2 },
];

describe('locationService', () => {
  afterEach(() => {
    stopTracking();
    clearMockLocationProvider();
  });

  describe('mock provider', () => {
    it('should enable mock mode', () => {
      expect(isMockMode()).toBe(false);
      setMockLocationProvider(mockRoute);
      expect(isMockMode()).toBe(true);
    });

    it('should clear mock mode', () => {
      setMockLocationProvider(mockRoute);
      clearMockLocationProvider();
      expect(isMockMode()).toBe(false);
    });
  });

  describe('tracking lifecycle', () => {
    it('should start and stop tracking', () => {
      setMockLocationProvider(mockRoute);
      const onPoint = jest.fn();

      startTracking(onPoint, { intervalMs: 10 });
      expect(isCurrentlyTracking()).toBe(true);

      stopTracking();
      expect(isCurrentlyTracking()).toBe(false);
    });

    it('should collect points during tracking', (done) => {
      setMockLocationProvider(mockRoute);
      const points: GpsPoint[] = [];

      startTracking((point) => {
        points.push(point);
        if (points.length >= 3) {
          const result = stopTracking();
          expect(result.length).toBeGreaterThanOrEqual(3);
          expect(result[0].lat).toBe(40.7829);
          done();
        }
      }, { intervalMs: 10 });
    });

    it('should return route points on stop', (done) => {
      setMockLocationProvider(mockRoute.slice(0, 3));
      let count = 0;

      startTracking(() => {
        count++;
        if (count >= 3) {
          const result = stopTracking();
          expect(result).toHaveLength(3);
          done();
        }
      }, { intervalMs: 10 });
    });

    it('should reset route points on new tracking session', () => {
      setMockLocationProvider(mockRoute);
      const onPoint = jest.fn();

      startTracking(onPoint, { intervalMs: 50 });
      stopTracking();

      // Start new session
      setMockLocationProvider(mockRoute);
      startTracking(onPoint, { intervalMs: 50 });
      expect(getRoutePoints()).toHaveLength(0); // fresh start
      stopTracking();
    });
  });

  describe('haversineDistance', () => {
    it('should calculate distance between NYC and LA', () => {
      const dist = haversineDistance(40.7128, -74.0060, 34.0522, -118.2437);
      // Actual: ~3,944km. Tight tolerance ±15km
      expect(dist).toBeGreaterThan(3930000);
      expect(dist).toBeLessThan(3960000);
    });

    it('should return 0 for same point', () => {
      expect(haversineDistance(40.7829, -73.9654, 40.7829, -73.9654)).toBe(0);
    });

    it('should calculate short distances accurately', () => {
      // 0.001 degrees lat at this latitude ≈ 111.2m
      const dist = haversineDistance(40.7829, -73.9654, 40.7839, -73.9654);
      expect(dist).toBeGreaterThan(108); // ±3m (~3%)
      expect(dist).toBeLessThan(114);
    });
  });

  describe('totalRouteDistance', () => {
    it('should calculate total distance of route', () => {
      const dist = totalRouteDistance(mockRoute);
      // 9 segments of ~111.2m each = ~1000.8m
      expect(dist).toBeGreaterThan(980); // ±3%
      expect(dist).toBeLessThan(1030);
    });

    it('should return 0 for single point', () => {
      expect(totalRouteDistance([mockRoute[0]])).toBe(0);
    });

    it('should return 0 for empty array', () => {
      expect(totalRouteDistance([])).toBe(0);
    });
  });

  describe('currentPace', () => {
    it('should calculate pace from GPS points', () => {
      const pace = currentPace(mockRoute);
      // ~45 seconds for ~1000m ≈ 45 sec/km — fast but the mock points are close
      expect(pace).toBeGreaterThan(0);
      expect(pace).toBeLessThan(600); // Under 10 min/km
    });

    it('should return 0 for single point', () => {
      expect(currentPace([mockRoute[0]])).toBe(0);
    });

    it('should return 0 for empty array', () => {
      expect(currentPace([])).toBe(0);
    });
  });

  describe('formatPace', () => {
    it('should format pace as M:SS', () => {
      expect(formatPace(300)).toBe('5:00');
      expect(formatPace(360)).toBe('6:00');
      expect(formatPace(270)).toBe('4:30');
    });

    it('should handle seconds with leading zero', () => {
      expect(formatPace(305)).toBe('5:05');
    });

    it('should not produce :60 seconds (rounds correctly at boundary)', () => {
      // 359.7 sec/km: old bug would produce "5:60", should be "6:00"
      expect(formatPace(359.7)).toBe('6:00');
      expect(formatPace(299.5)).toBe('5:00');
    });

    it('should return --:-- for 0', () => {
      expect(formatPace(0)).toBe('--:--');
    });

    it('should return --:-- for negative', () => {
      expect(formatPace(-100)).toBe('--:--');
    });

    it('should return --:-- for Infinity', () => {
      expect(formatPace(Infinity)).toBe('--:--');
    });

    it('should return --:-- for impossibly fast pace (GPS noise)', () => {
      expect(formatPace(10)).toBe('--:--');  // 0:10/km is not real
      expect(formatPace(29)).toBe('--:--');  // under threshold
    });

    it('should return --:-- for absurdly slow pace (standing still)', () => {
      expect(formatPace(1801)).toBe('--:--');  // over 30:00/km
      expect(formatPace(5000)).toBe('--:--');
    });

    it('should accept paces at the boundary', () => {
      expect(formatPace(30)).toBe('0:30');    // fastest valid pace
      expect(formatPace(1800)).toBe('30:00'); // slowest valid pace
    });
  });
});
