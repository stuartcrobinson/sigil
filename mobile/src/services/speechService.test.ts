import {
  formatTimeSpoken,
  formatPaceSpoken,
  formatDistanceSpoken,
  buildAnnouncement,
  checkAndAnnounce,
  resetAnnouncements,
  configureAnnouncements,
  getLastAnnouncedDistance,
  speak,
  stopSpeaking,
} from './speechService';

beforeEach(() => {
  resetAnnouncements();
});

describe('speechService', () => {
  describe('formatTimeSpoken', () => {
    it('should format seconds only', () => {
      expect(formatTimeSpoken(45)).toBe('45 seconds');
    });

    it('should format minutes and seconds', () => {
      expect(formatTimeSpoken(150)).toBe('2 minutes 30 seconds');
    });

    it('should format hours and minutes', () => {
      expect(formatTimeSpoken(3720)).toBe('1 hour 2 minutes');
    });

    it('should handle singular forms', () => {
      expect(formatTimeSpoken(61)).toBe('1 minute 1 second');
    });

    it('should handle zero', () => {
      expect(formatTimeSpoken(0)).toBe('0 seconds');
    });

    it('should format exact minutes without seconds', () => {
      expect(formatTimeSpoken(300)).toBe('5 minutes');
    });
  });

  describe('formatPaceSpoken', () => {
    it('should format normal pace', () => {
      const result = formatPaceSpoken(330);
      expect(result).toBe('5 minutes 30 seconds per kilometer');
    });

    it('should handle zero pace', () => {
      expect(formatPaceSpoken(0)).toBe('');
    });

    it('should handle negative pace', () => {
      expect(formatPaceSpoken(-1)).toBe('');
    });

    it('should handle Infinity', () => {
      expect(formatPaceSpoken(Infinity)).toBe('');
    });

    it('should handle singular minute', () => {
      const result = formatPaceSpoken(90);
      expect(result).toBe('1 minute 30 seconds per kilometer');
    });
  });

  describe('formatDistanceSpoken', () => {
    it('should format kilometers', () => {
      expect(formatDistanceSpoken(5000)).toBe('5 kilometers');
    });

    it('should format sub-kilometer in meters', () => {
      expect(formatDistanceSpoken(750)).toBe('750 meters');
    });

    it('should format 1 kilometer as singular', () => {
      expect(formatDistanceSpoken(1000)).toBe('1 kilometer');
    });

    it('should format fractional kilometers', () => {
      expect(formatDistanceSpoken(2500)).toBe('2.5 kilometers');
    });
  });

  describe('buildAnnouncement', () => {
    it('should build full announcement with distance, time, and pace', () => {
      const result = buildAnnouncement(1000, 300, 300);
      expect(result).toContain('1 kilometer');
      expect(result).toContain('Time:');
      expect(result).toContain('Pace:');
    });

    it('should respect announceTime=false option', () => {
      const result = buildAnnouncement(1000, 300, 300, { announceTime: false });
      expect(result).toContain('1 kilometer');
      expect(result).not.toContain('Time:');
      expect(result).toContain('Pace:');
    });

    it('should respect announcePace=false option', () => {
      const result = buildAnnouncement(1000, 300, 300, { announcePace: false });
      expect(result).toContain('1 kilometer');
      expect(result).toContain('Time:');
      expect(result).not.toContain('Pace:');
    });

    it('should handle zero elapsed time', () => {
      const result = buildAnnouncement(1000, 300, 0);
      expect(result).toContain('1 kilometer');
      expect(result).not.toContain('Time:');
    });
  });

  describe('checkAndAnnounce', () => {
    it('should announce at 1km milestone', () => {
      const announced = checkAndAnnounce(1050, 300, 300);
      expect(announced).toBe(true);
      expect(getLastAnnouncedDistance()).toBe(1000);
    });

    it('should not announce before threshold', () => {
      const announced = checkAndAnnounce(900, 300, 270);
      expect(announced).toBe(false);
      expect(getLastAnnouncedDistance()).toBe(0);
    });

    it('should announce successive milestones', () => {
      checkAndAnnounce(1050, 300, 300);
      expect(getLastAnnouncedDistance()).toBe(1000);

      const announced = checkAndAnnounce(2100, 310, 620);
      expect(announced).toBe(true);
      expect(getLastAnnouncedDistance()).toBe(2000);
    });

    it('should not re-announce same milestone', () => {
      checkAndAnnounce(1050, 300, 300);
      const announced = checkAndAnnounce(1200, 305, 360);
      expect(announced).toBe(false);
    });

    it('should respect custom distance interval', () => {
      configureAnnouncements({ announceDistanceEveryM: 500 });
      const announced = checkAndAnnounce(550, 300, 165);
      expect(announced).toBe(true);
      expect(getLastAnnouncedDistance()).toBe(500);
    });

    it('should not announce when disabled', () => {
      configureAnnouncements({ enabled: false });
      const announced = checkAndAnnounce(1050, 300, 300);
      expect(announced).toBe(false);
    });
  });

  describe('speak and stopSpeaking', () => {
    it('should not throw when expo-speech is not available', () => {
      expect(() => speak('test')).not.toThrow();
    });

    it('should not throw stopSpeaking when not available', () => {
      expect(() => stopSpeaking()).not.toThrow();
    });

    it('should not speak when disabled', () => {
      configureAnnouncements({ enabled: false });
      expect(() => speak('test')).not.toThrow();
    });

    it('should not speak empty string', () => {
      expect(() => speak('')).not.toThrow();
    });
  });

  describe('resetAnnouncements', () => {
    it('should reset distance tracking', () => {
      checkAndAnnounce(1050, 300, 300);
      expect(getLastAnnouncedDistance()).toBe(1000);
      resetAnnouncements();
      expect(getLastAnnouncedDistance()).toBe(0);
    });
  });
});
