import {
  validateFlowType,
  validateDifficulty,
  validateYogaActivityData,
  formatYogaSummary,
  calculateDurationAccuracy,
  metTargetDuration,
  YogaActivityData
} from './yogaUtils';

describe('yogaUtils', () => {
  describe('validateFlowType', () => {
    it('should validate valid flow types', () => {
      expect(validateFlowType('vinyasa')).toBe(true);
      expect(validateFlowType('hatha')).toBe(true);
      expect(validateFlowType('yin')).toBe(true);
      expect(validateFlowType('restorative')).toBe(true);
      expect(validateFlowType('ashtanga')).toBe(true);
      expect(validateFlowType('bikram')).toBe(true);
      expect(validateFlowType('other')).toBe(true);
    });

    it('should reject invalid flow types', () => {
      expect(validateFlowType('invalid')).toBe(false);
      expect(validateFlowType('pilates')).toBe(false);
      expect(validateFlowType('')).toBe(false);
      expect(validateFlowType(123)).toBe(false);
      expect(validateFlowType(null)).toBe(false);
    });
  });

  describe('validateDifficulty', () => {
    it('should validate valid difficulty levels', () => {
      expect(validateDifficulty('beginner')).toBe(true);
      expect(validateDifficulty('intermediate')).toBe(true);
      expect(validateDifficulty('advanced')).toBe(true);
    });

    it('should reject invalid difficulty levels', () => {
      expect(validateDifficulty('expert')).toBe(false);
      expect(validateDifficulty('easy')).toBe(false);
      expect(validateDifficulty('')).toBe(false);
      expect(validateDifficulty(123)).toBe(false);
      expect(validateDifficulty(null)).toBe(false);
    });
  });

  describe('validateYogaActivityData', () => {
    it('should validate minimal valid yoga data', () => {
      const data: YogaActivityData = {};
      expect(validateYogaActivityData(data)).toBe(true);
    });

    it('should validate complete yoga data', () => {
      const data: YogaActivityData = {
        flow_type: 'vinyasa',
        difficulty: 'intermediate',
        poses: ['Downward Dog', 'Warrior I', 'Warrior II'],
        target_duration_minutes: 30,
        actual_duration_minutes: 32
      };
      expect(validateYogaActivityData(data)).toBe(true);
    });

    it('should validate data with flow type only', () => {
      const data: YogaActivityData = {
        flow_type: 'hatha'
      };
      expect(validateYogaActivityData(data)).toBe(true);
    });

    it('should validate data with difficulty only', () => {
      const data: YogaActivityData = {
        difficulty: 'beginner'
      };
      expect(validateYogaActivityData(data)).toBe(true);
    });

    it('should validate data with poses', () => {
      const data: YogaActivityData = {
        poses: ['Downward Dog', 'Tree Pose', 'Savasana']
      };
      expect(validateYogaActivityData(data)).toBe(true);
    });

    it('should reject data with invalid flow type', () => {
      const data = {
        flow_type: 'invalid-type'
      };
      expect(validateYogaActivityData(data)).toBe(false);
    });

    it('should reject data with invalid difficulty', () => {
      const data = {
        difficulty: 'expert'
      };
      expect(validateYogaActivityData(data)).toBe(false);
    });

    it('should reject data with poses not being an array', () => {
      const data = {
        poses: 'not-an-array'
      };
      expect(validateYogaActivityData(data)).toBe(false);
    });

    it('should reject data with empty pose strings', () => {
      const data = {
        poses: ['Downward Dog', '', 'Tree Pose']
      };
      expect(validateYogaActivityData(data)).toBe(false);
    });

    it('should reject data with whitespace-only pose strings', () => {
      const data = {
        poses: ['Downward Dog', '   ', 'Tree Pose']
      };
      expect(validateYogaActivityData(data)).toBe(false);
    });

    it('should reject data with negative target duration', () => {
      const data = {
        target_duration_minutes: -30
      };
      expect(validateYogaActivityData(data)).toBe(false);
    });

    it('should reject data with zero target duration', () => {
      const data = {
        target_duration_minutes: 0
      };
      expect(validateYogaActivityData(data)).toBe(false);
    });

    it('should reject data with negative actual duration', () => {
      const data = {
        actual_duration_minutes: -30
      };
      expect(validateYogaActivityData(data)).toBe(false);
    });

    it('should reject null or undefined input', () => {
      expect(validateYogaActivityData(null)).toBe(false);
      expect(validateYogaActivityData(undefined)).toBe(false);
    });
  });

  describe('formatYogaSummary', () => {
    it('should format complete yoga summary', () => {
      const data: YogaActivityData = {
        flow_type: 'vinyasa',
        difficulty: 'intermediate',
        actual_duration_minutes: 30,
        poses: ['Downward Dog', 'Warrior I', 'Warrior II']
      };
      const summary = formatYogaSummary(data);
      expect(summary).toBe('30 min Vinyasa Yoga (Intermediate) - 3 poses');
    });

    it('should format summary with target duration when no actual duration', () => {
      const data: YogaActivityData = {
        flow_type: 'hatha',
        target_duration_minutes: 45
      };
      const summary = formatYogaSummary(data);
      expect(summary).toBe('45 min Hatha Yoga');
    });

    it('should format summary without flow type', () => {
      const data: YogaActivityData = {
        actual_duration_minutes: 20,
        difficulty: 'beginner'
      };
      const summary = formatYogaSummary(data);
      expect(summary).toBe('20 min Yoga (Beginner)');
    });

    it('should format summary without difficulty', () => {
      const data: YogaActivityData = {
        flow_type: 'yin',
        actual_duration_minutes: 60
      };
      const summary = formatYogaSummary(data);
      expect(summary).toBe('60 min Yin Yoga');
    });

    it('should format summary with poses count', () => {
      const data: YogaActivityData = {
        actual_duration_minutes: 45,
        poses: ['Pose 1', 'Pose 2', 'Pose 3', 'Pose 4', 'Pose 5']
      };
      const summary = formatYogaSummary(data);
      expect(summary).toBe('45 min Yoga - 5 poses');
    });

    it('should format minimal summary', () => {
      const data: YogaActivityData = {};
      const summary = formatYogaSummary(data);
      expect(summary).toBe('Yoga');
    });

    it('should capitalize flow type names', () => {
      const data: YogaActivityData = {
        flow_type: 'restorative',
        actual_duration_minutes: 30
      };
      const summary = formatYogaSummary(data);
      expect(summary).toContain('Restorative Yoga');
    });
  });

  describe('calculateDurationAccuracy', () => {
    it('should return 0 for perfect match', () => {
      const accuracy = calculateDurationAccuracy(30, 30);
      expect(accuracy).toBe(0);
    });

    it('should calculate accuracy for slightly over target', () => {
      const accuracy = calculateDurationAccuracy(30, 33);
      expect(accuracy).toBe(10); // 3/30 * 100 = 10%
    });

    it('should calculate accuracy for slightly under target', () => {
      const accuracy = calculateDurationAccuracy(30, 27);
      expect(accuracy).toBe(10); // 3/30 * 100 = 10%
    });

    it('should calculate accuracy for way over target', () => {
      const accuracy = calculateDurationAccuracy(30, 60);
      expect(accuracy).toBe(100); // 30/30 * 100 = 100%
    });

    it('should calculate accuracy for way under target', () => {
      const accuracy = calculateDurationAccuracy(60, 30);
      expect(accuracy).toBe(50); // 30/60 * 100 = 50%
    });

    it('should cap accuracy at 100%', () => {
      const accuracy = calculateDurationAccuracy(30, 100);
      expect(accuracy).toBe(100);
    });

    it('should return 0 for invalid target duration', () => {
      const accuracy = calculateDurationAccuracy(0, 30);
      expect(accuracy).toBe(0);
    });
  });

  describe('metTargetDuration', () => {
    it('should return true for perfect match', () => {
      expect(metTargetDuration(30, 30)).toBe(true);
    });

    it('should return true for within 10% (slightly over)', () => {
      expect(metTargetDuration(30, 33)).toBe(true); // 10% over
    });

    it('should return true for within 10% (slightly under)', () => {
      expect(metTargetDuration(30, 27)).toBe(true); // 10% under
    });

    it('should return false for over 10% difference', () => {
      expect(metTargetDuration(30, 35)).toBe(false); // 16.7% over
    });

    it('should return false for way over target', () => {
      expect(metTargetDuration(30, 60)).toBe(false);
    });

    it('should return false for way under target', () => {
      expect(metTargetDuration(60, 30)).toBe(false);
    });

    it('should return true for exactly 10% difference', () => {
      expect(metTargetDuration(100, 110)).toBe(true);
      expect(metTargetDuration(100, 90)).toBe(true);
    });
  });
});
