import {
  validateExerciseSet,
  validateExercise,
  validateWeightliftingActivityData,
  calculateExerciseVolume,
  calculateTotalVolume,
  calculateTotalSets,
  enrichWeightliftingData,
  formatWorkoutSummary,
  meetsQuickLoggingRequirement,
  countTapsForSet,
  ExerciseSet,
  Exercise,
  WeightliftingActivityData
} from './weightliftingUtils';

describe('weightliftingUtils', () => {
  describe('validateExerciseSet', () => {
    it('should validate valid exercise set', () => {
      const set: ExerciseSet = {
        weight: 80,
        reps: 8,
        rest_seconds: 90
      };
      expect(validateExerciseSet(set)).toBe(true);
    });

    it('should validate set without rest time', () => {
      const set: ExerciseSet = {
        weight: 80,
        reps: 8
      };
      expect(validateExerciseSet(set)).toBe(true);
    });

    it('should reject set with zero weight', () => {
      const set = {
        weight: 0,
        reps: 8
      };
      expect(validateExerciseSet(set)).toBe(false);
    });

    it('should reject set with negative weight', () => {
      const set = {
        weight: -80,
        reps: 8
      };
      expect(validateExerciseSet(set)).toBe(false);
    });

    it('should reject set with zero reps', () => {
      const set = {
        weight: 80,
        reps: 0
      };
      expect(validateExerciseSet(set)).toBe(false);
    });

    it('should reject set with negative reps', () => {
      const set = {
        weight: 80,
        reps: -5
      };
      expect(validateExerciseSet(set)).toBe(false);
    });

    it('should reject set with non-integer reps', () => {
      const set = {
        weight: 80,
        reps: 8.5
      };
      expect(validateExerciseSet(set)).toBe(false);
    });

    it('should reject set with negative rest time', () => {
      const set = {
        weight: 80,
        reps: 8,
        rest_seconds: -30
      };
      expect(validateExerciseSet(set)).toBe(false);
    });

    it('should reject null or undefined input', () => {
      expect(validateExerciseSet(null)).toBe(false);
      expect(validateExerciseSet(undefined)).toBe(false);
    });
  });

  describe('validateExercise', () => {
    it('should validate valid exercise', () => {
      const exercise: Exercise = {
        name: 'Bench Press',
        sets: [
          { weight: 80, reps: 8 },
          { weight: 85, reps: 6 }
        ]
      };
      expect(validateExercise(exercise)).toBe(true);
    });

    it('should reject exercise with empty name', () => {
      const exercise = {
        name: '',
        sets: [{ weight: 80, reps: 8 }]
      };
      expect(validateExercise(exercise)).toBe(false);
    });

    it('should reject exercise with whitespace-only name', () => {
      const exercise = {
        name: '   ',
        sets: [{ weight: 80, reps: 8 }]
      };
      expect(validateExercise(exercise)).toBe(false);
    });

    it('should reject exercise with empty sets array', () => {
      const exercise = {
        name: 'Bench Press',
        sets: []
      };
      expect(validateExercise(exercise)).toBe(false);
    });

    it('should reject exercise with invalid set', () => {
      const exercise = {
        name: 'Bench Press',
        sets: [
          { weight: 80, reps: 8 },
          { weight: -85, reps: 6 }  // Invalid weight
        ]
      };
      expect(validateExercise(exercise)).toBe(false);
    });

    it('should reject exercise with sets not being an array', () => {
      const exercise = {
        name: 'Bench Press',
        sets: 'not-an-array'
      };
      expect(validateExercise(exercise)).toBe(false);
    });
  });

  describe('validateWeightliftingActivityData', () => {
    it('should validate valid weightlifting data', () => {
      const data: WeightliftingActivityData = {
        exercises: [
          {
            name: 'Bench Press',
            sets: [
              { weight: 80, reps: 8, rest_seconds: 90 },
              { weight: 85, reps: 6, rest_seconds: 90 }
            ]
          },
          {
            name: 'Squat',
            sets: [
              { weight: 100, reps: 10, rest_seconds: 120 }
            ]
          }
        ]
      };
      expect(validateWeightliftingActivityData(data)).toBe(true);
    });

    it('should validate data with calculated totals', () => {
      const data: WeightliftingActivityData = {
        exercises: [
          {
            name: 'Bench Press',
            sets: [{ weight: 80, reps: 8 }]
          }
        ],
        total_volume: 640,
        total_sets: 1,
        total_exercises: 1
      };
      expect(validateWeightliftingActivityData(data)).toBe(true);
    });

    it('should reject data with empty exercises array', () => {
      const data = {
        exercises: []
      };
      expect(validateWeightliftingActivityData(data)).toBe(false);
    });

    it('should reject data without exercises field', () => {
      const data = {};
      expect(validateWeightliftingActivityData(data)).toBe(false);
    });

    it('should reject data with invalid exercise', () => {
      const data = {
        exercises: [
          {
            name: 'Bench Press',
            sets: [{ weight: 80, reps: 8 }]
          },
          {
            name: '',  // Invalid: empty name
            sets: [{ weight: 100, reps: 10 }]
          }
        ]
      };
      expect(validateWeightliftingActivityData(data)).toBe(false);
    });

    it('should reject data with negative total volume', () => {
      const data = {
        exercises: [
          {
            name: 'Bench Press',
            sets: [{ weight: 80, reps: 8 }]
          }
        ],
        total_volume: -100
      };
      expect(validateWeightliftingActivityData(data)).toBe(false);
    });

    it('should reject data with negative total sets', () => {
      const data = {
        exercises: [
          {
            name: 'Bench Press',
            sets: [{ weight: 80, reps: 8 }]
          }
        ],
        total_sets: -1
      };
      expect(validateWeightliftingActivityData(data)).toBe(false);
    });
  });

  describe('calculateExerciseVolume', () => {
    it('should calculate volume for exercise with single set', () => {
      const exercise: Exercise = {
        name: 'Bench Press',
        sets: [
          { weight: 80, reps: 8 }
        ]
      };
      expect(calculateExerciseVolume(exercise)).toBe(640); // 80 × 8
    });

    it('should calculate volume for exercise with multiple sets', () => {
      const exercise: Exercise = {
        name: 'Bench Press',
        sets: [
          { weight: 80, reps: 8 },
          { weight: 85, reps: 6 },
          { weight: 90, reps: 4 }
        ]
      };
      // (80×8) + (85×6) + (90×4) = 640 + 510 + 360 = 1510
      expect(calculateExerciseVolume(exercise)).toBe(1510);
    });

    it('should return 0 for exercise with no sets', () => {
      const exercise: Exercise = {
        name: 'Bench Press',
        sets: []
      };
      expect(calculateExerciseVolume(exercise)).toBe(0);
    });
  });

  describe('calculateTotalVolume', () => {
    it('should calculate total volume across multiple exercises', () => {
      const exercises: Exercise[] = [
        {
          name: 'Bench Press',
          sets: [
            { weight: 80, reps: 8 },
            { weight: 85, reps: 6 }
          ]
        },
        {
          name: 'Squat',
          sets: [
            { weight: 100, reps: 10 },
            { weight: 110, reps: 8 }
          ]
        }
      ];
      // Bench: (80×8) + (85×6) = 640 + 510 = 1150
      // Squat: (100×10) + (110×8) = 1000 + 880 = 1880
      // Total: 1150 + 1880 = 3030
      expect(calculateTotalVolume(exercises)).toBe(3030);
    });

    it('should return 0 for empty exercises array', () => {
      expect(calculateTotalVolume([])).toBe(0);
    });
  });

  describe('calculateTotalSets', () => {
    it('should calculate total number of sets', () => {
      const exercises: Exercise[] = [
        {
          name: 'Bench Press',
          sets: [
            { weight: 80, reps: 8 },
            { weight: 85, reps: 6 },
            { weight: 90, reps: 4 }
          ]
        },
        {
          name: 'Squat',
          sets: [
            { weight: 100, reps: 10 },
            { weight: 110, reps: 8 }
          ]
        }
      ];
      expect(calculateTotalSets(exercises)).toBe(5); // 3 + 2
    });

    it('should return 0 for empty exercises array', () => {
      expect(calculateTotalSets([])).toBe(0);
    });
  });

  describe('enrichWeightliftingData', () => {
    it('should add calculated totals to data', () => {
      const data: WeightliftingActivityData = {
        exercises: [
          {
            name: 'Bench Press',
            sets: [
              { weight: 80, reps: 8 },
              { weight: 85, reps: 6 }
            ]
          },
          {
            name: 'Squat',
            sets: [
              { weight: 100, reps: 10 }
            ]
          }
        ]
      };

      const enriched = enrichWeightliftingData(data);
      expect(enriched.total_volume).toBe(2150); // (80×8)+(85×6)+(100×10)
      expect(enriched.total_sets).toBe(3);
      expect(enriched.total_exercises).toBe(2);
    });

    it('should override existing totals with calculated values', () => {
      const data: WeightliftingActivityData = {
        exercises: [
          {
            name: 'Bench Press',
            sets: [{ weight: 80, reps: 8 }]
          }
        ],
        total_volume: 9999,  // Wrong value, should be overwritten
        total_sets: 99,
        total_exercises: 99
      };

      const enriched = enrichWeightliftingData(data);
      expect(enriched.total_volume).toBe(640);
      expect(enriched.total_sets).toBe(1);
      expect(enriched.total_exercises).toBe(1);
    });
  });

  describe('formatWorkoutSummary', () => {
    it('should format complete workout summary', () => {
      const data: WeightliftingActivityData = {
        exercises: [
          {
            name: 'Bench Press',
            sets: [
              { weight: 80, reps: 8 },
              { weight: 85, reps: 6 }
            ]
          },
          {
            name: 'Squat',
            sets: [
              { weight: 100, reps: 10 }
            ]
          }
        ]
      };

      const summary = formatWorkoutSummary(data);
      expect(summary).toBe('2 exercises, 3 sets, 2,150 kg total volume');
    });

    it('should format summary with singular forms', () => {
      const data: WeightliftingActivityData = {
        exercises: [
          {
            name: 'Bench Press',
            sets: [{ weight: 80, reps: 8 }]
          }
        ]
      };

      const summary = formatWorkoutSummary(data);
      expect(summary).toBe('1 exercise, 1 set, 640 kg total volume');
    });

    it('should include thousand separators for large volumes', () => {
      const data: WeightliftingActivityData = {
        exercises: [
          {
            name: 'Squat',
            sets: [{ weight: 1000, reps: 10 }]
          }
        ]
      };

      const summary = formatWorkoutSummary(data);
      expect(summary).toContain('10,000 kg');
    });
  });

  describe('countTapsForSet', () => {
    it('should count 1 tap for repeating previous set exactly', () => {
      const previousSet: ExerciseSet = { weight: 80, reps: 8 };
      const currentSet: ExerciseSet = { weight: 80, reps: 8 };

      expect(countTapsForSet(currentSet, previousSet)).toBe(1);
    });

    it('should count 2 taps for same weight with different reps', () => {
      const previousSet: ExerciseSet = { weight: 80, reps: 8 };
      const currentSet: ExerciseSet = { weight: 80, reps: 6 };

      expect(countTapsForSet(currentSet, previousSet)).toBe(2);
    });

    it('should count 4 taps for 2-digit new weight (digits + 2)', () => {
      const newSet: ExerciseSet = { weight: 80, reps: 8 };
      // 2 digits + 1 rep preset + 1 confirm = 4 taps
      expect(countTapsForSet(newSet)).toBe(4);
    });

    it('should count 5 taps for 3-digit new weight (digits + 2)', () => {
      const newSet: ExerciseSet = { weight: 100, reps: 10 };
      // 3 digits + 1 rep preset + 1 confirm = 5 taps
      expect(countTapsForSet(newSet)).toBe(5);
    });

    it('should count 5 taps for different 3-digit weight from previous', () => {
      const previousSet: ExerciseSet = { weight: 80, reps: 8 };
      const currentSet: ExerciseSet = { weight: 100, reps: 10 };
      // Different weight: 3 digits + 1 rep + 1 confirm = 5
      expect(countTapsForSet(currentSet, previousSet)).toBe(5);
    });
  });

  describe('meetsQuickLoggingRequirement', () => {
    it('should confirm repeat set meets requirement (1 tap)', () => {
      const previousSet: ExerciseSet = { weight: 80, reps: 8 };
      const currentSet: ExerciseSet = { weight: 80, reps: 8 };

      expect(meetsQuickLoggingRequirement(currentSet, previousSet)).toBe(true);
    });

    it('should confirm same weight with different reps meets requirement (2 taps)', () => {
      const previousSet: ExerciseSet = { weight: 80, reps: 8 };
      const currentSet: ExerciseSet = { weight: 80, reps: 6 };

      expect(meetsQuickLoggingRequirement(currentSet, previousSet)).toBe(true);
    });

    it('should confirm 2-digit new weight meets requirement (4 taps < 5)', () => {
      const newSet: ExerciseSet = { weight: 80, reps: 8 };
      expect(meetsQuickLoggingRequirement(newSet)).toBe(true);
    });

    it('should FAIL for 3-digit new weight (5 taps >= 5)', () => {
      const newSet: ExerciseSet = { weight: 100, reps: 10 };
      // 3 digits + 1 rep preset + 1 confirm = 5 taps, NOT < 5
      expect(meetsQuickLoggingRequirement(newSet)).toBe(false);
    });

    it('should FAIL for different 3-digit weight from previous (5 taps >= 5)', () => {
      const previousSet: ExerciseSet = { weight: 80, reps: 8 };
      const currentSet: ExerciseSet = { weight: 225, reps: 5 };
      // 3 digits + 1 rep + 1 confirm = 5 taps
      expect(meetsQuickLoggingRequirement(currentSet, previousSet)).toBe(false);
    });
  });
});
