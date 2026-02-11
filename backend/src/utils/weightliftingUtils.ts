/**
 * Weightlifting Activity Utilities
 *
 * Utilities for validating and processing weightlifting workout data.
 */

export interface ExerciseSet {
  weight: number;        // in kg or lbs
  reps: number;          // number of repetitions
  rest_seconds?: number; // rest time after set
}

export interface Exercise {
  name: string;
  sets: ExerciseSet[];
}

export interface WeightliftingActivityData {
  exercises: Exercise[];
  total_volume?: number;   // total weight × reps across all sets
  total_sets?: number;     // total number of sets
  total_exercises?: number; // total number of exercises
}

/**
 * Validates exercise set data
 */
export function validateExerciseSet(set: any): set is ExerciseSet {
  if (!set || typeof set !== 'object') return false;

  // Weight must be positive number
  if (typeof set.weight !== 'number' || set.weight <= 0) {
    return false;
  }

  // Reps must be positive integer
  if (typeof set.reps !== 'number' || set.reps <= 0 || !Number.isInteger(set.reps)) {
    return false;
  }

  // Rest time is optional, but if present must be non-negative
  if (set.rest_seconds !== undefined) {
    if (typeof set.rest_seconds !== 'number' || set.rest_seconds < 0) {
      return false;
    }
  }

  return true;
}

/**
 * Validates exercise data
 */
export function validateExercise(exercise: any): exercise is Exercise {
  if (!exercise || typeof exercise !== 'object') return false;

  // Exercise name must be non-empty string
  if (typeof exercise.name !== 'string' || exercise.name.trim().length === 0) {
    return false;
  }

  // Sets must be non-empty array of valid sets
  if (!Array.isArray(exercise.sets) || exercise.sets.length === 0) {
    return false;
  }

  if (!exercise.sets.every(validateExerciseSet)) {
    return false;
  }

  return true;
}

/**
 * Validates weightlifting activity data structure
 */
export function validateWeightliftingActivityData(data: any): data is WeightliftingActivityData {
  if (!data || typeof data !== 'object') return false;

  // Exercises array is required
  if (!Array.isArray(data.exercises)) {
    return false;
  }

  // Must have at least one exercise
  if (data.exercises.length === 0) {
    return false;
  }

  // All exercises must be valid
  if (!data.exercises.every(validateExercise)) {
    return false;
  }

  // Optional fields validation
  if (data.total_volume !== undefined && (typeof data.total_volume !== 'number' || data.total_volume < 0)) {
    return false;
  }

  if (data.total_sets !== undefined && (typeof data.total_sets !== 'number' || data.total_sets < 0)) {
    return false;
  }

  if (data.total_exercises !== undefined && (typeof data.total_exercises !== 'number' || data.total_exercises < 0)) {
    return false;
  }

  return true;
}

/**
 * Calculates total volume for a single exercise (weight × reps × sets)
 */
export function calculateExerciseVolume(exercise: Exercise): number {
  return exercise.sets.reduce((total, set) => {
    return total + (set.weight * set.reps);
  }, 0);
}

/**
 * Calculates total volume for entire workout
 */
export function calculateTotalVolume(exercises: Exercise[]): number {
  return exercises.reduce((total, exercise) => {
    return total + calculateExerciseVolume(exercise);
  }, 0);
}

/**
 * Calculates total number of sets in workout
 */
export function calculateTotalSets(exercises: Exercise[]): number {
  return exercises.reduce((total, exercise) => {
    return total + exercise.sets.length;
  }, 0);
}

/**
 * Enriches weightlifting data with calculated totals
 */
export function enrichWeightliftingData(data: WeightliftingActivityData): WeightliftingActivityData {
  return {
    ...data,
    total_volume: calculateTotalVolume(data.exercises),
    total_sets: calculateTotalSets(data.exercises),
    total_exercises: data.exercises.length
  };
}

/**
 * Formats workout summary as human-readable string
 * Example: "3 exercises, 12 sets, 4,840 kg total volume"
 */
export function formatWorkoutSummary(data: WeightliftingActivityData): string {
  const enrichedData = enrichWeightliftingData(data);
  const parts = [];

  if (enrichedData.total_exercises) {
    parts.push(`${enrichedData.total_exercises} exercise${enrichedData.total_exercises !== 1 ? 's' : ''}`);
  }

  if (enrichedData.total_sets) {
    parts.push(`${enrichedData.total_sets} set${enrichedData.total_sets !== 1 ? 's' : ''}`);
  }

  if (enrichedData.total_volume) {
    parts.push(`${enrichedData.total_volume.toLocaleString()} kg total volume`);
  }

  return parts.join(', ');
}

/**
 * Counts the number of taps needed to log a set and checks if < 5.
 * Returns { meets: boolean, taps: number }.
 *
 * Tap counting rules:
 * - Repeat previous set exactly: 1 tap ("Repeat Set" button)
 * - Same weight, different reps: 2 taps (auto-fill weight + tap rep preset)
 * - New weight (1-2 digits) + reps: digit taps + 1 for rep preset + 1 for confirm = digits + 2
 * - New weight (3+ digits like 100, 225): digit taps + 1 for rep preset + 1 for confirm = digits + 2
 */
export function countTapsForSet(set: ExerciseSet, previousSet?: ExerciseSet): number {
  // Repeat previous set exactly: 1 tap
  if (previousSet && set.weight === previousSet.weight && set.reps === previousSet.reps) {
    return 1;
  }

  // Same weight, different reps: 2 taps (weight auto-filled + rep preset tap)
  if (previousSet && set.weight === previousSet.weight) {
    return 2;
  }

  // New weight: count digits needed to type it
  const weightStr = String(Math.round(set.weight));
  const digitTaps = weightStr.length; // Each digit = 1 tap
  // + 1 tap for rep preset + 1 tap for confirm
  return digitTaps + 2;
}

/**
 * Validates that a workout can be logged with < 5 taps per set.
 * Uses actual tap counting instead of always returning true.
 */
export function meetsQuickLoggingRequirement(set: ExerciseSet, previousSet?: ExerciseSet): boolean {
  return countTapsForSet(set, previousSet) < 5;
}
