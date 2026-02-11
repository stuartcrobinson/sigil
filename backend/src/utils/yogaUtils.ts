/**
 * Yoga Activity Utilities
 *
 * Utilities for validating and processing yoga session data.
 */

export type YogaFlowType = 'vinyasa' | 'hatha' | 'yin' | 'restorative' | 'ashtanga' | 'bikram' | 'other';
export type YogaDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface YogaActivityData {
  flow_type?: YogaFlowType;
  difficulty?: YogaDifficulty;
  poses?: string[];
  target_duration_minutes?: number;
  actual_duration_minutes?: number;
}

/**
 * Valid yoga flow types
 */
const VALID_FLOW_TYPES: YogaFlowType[] = [
  'vinyasa',
  'hatha',
  'yin',
  'restorative',
  'ashtanga',
  'bikram',
  'other'
];

/**
 * Valid difficulty levels
 */
const VALID_DIFFICULTIES: YogaDifficulty[] = [
  'beginner',
  'intermediate',
  'advanced'
];

/**
 * Validates yoga flow type
 */
export function validateFlowType(flowType: any): flowType is YogaFlowType {
  return typeof flowType === 'string' && VALID_FLOW_TYPES.includes(flowType as YogaFlowType);
}

/**
 * Validates yoga difficulty level
 */
export function validateDifficulty(difficulty: any): difficulty is YogaDifficulty {
  return typeof difficulty === 'string' && VALID_DIFFICULTIES.includes(difficulty as YogaDifficulty);
}

/**
 * Validates yoga activity data structure
 */
export function validateYogaActivityData(data: any): data is YogaActivityData {
  if (!data || typeof data !== 'object') return false;

  // Flow type is optional, but if present must be valid
  if (data.flow_type !== undefined && !validateFlowType(data.flow_type)) {
    return false;
  }

  // Difficulty is optional, but if present must be valid
  if (data.difficulty !== undefined && !validateDifficulty(data.difficulty)) {
    return false;
  }

  // Poses are optional, but if present must be array of non-empty strings
  if (data.poses !== undefined) {
    if (!Array.isArray(data.poses)) return false;
    if (!data.poses.every((pose: any) => typeof pose === 'string' && pose.trim().length > 0)) {
      return false;
    }
  }

  // Target duration is optional, but if present must be positive
  if (data.target_duration_minutes !== undefined) {
    if (typeof data.target_duration_minutes !== 'number' || data.target_duration_minutes <= 0) {
      return false;
    }
  }

  // Actual duration is optional, but if present must be positive
  if (data.actual_duration_minutes !== undefined) {
    if (typeof data.actual_duration_minutes !== 'number' || data.actual_duration_minutes <= 0) {
      return false;
    }
  }

  return true;
}

/**
 * Formats yoga session summary as human-readable string
 * Example: "30 min Vinyasa Yoga (Intermediate)"
 */
export function formatYogaSummary(data: YogaActivityData): string {
  const parts: string[] = [];

  // Duration
  if (data.actual_duration_minutes) {
    parts.push(`${data.actual_duration_minutes} min`);
  } else if (data.target_duration_minutes) {
    parts.push(`${data.target_duration_minutes} min`);
  }

  // Flow type
  if (data.flow_type) {
    const flowName = data.flow_type.charAt(0).toUpperCase() + data.flow_type.slice(1);
    parts.push(`${flowName} Yoga`);
  } else {
    parts.push('Yoga');
  }

  // Difficulty
  if (data.difficulty) {
    const difficultyName = data.difficulty.charAt(0).toUpperCase() + data.difficulty.slice(1);
    parts.push(`(${difficultyName})`);
  }

  // Poses count
  if (data.poses && data.poses.length > 0) {
    parts.push(`- ${data.poses.length} poses`);
  }

  return parts.join(' ');
}

/**
 * Calculates duration accuracy (how close actual was to target)
 * Returns percentage difference (0-100, where 0 is perfect match)
 */
export function calculateDurationAccuracy(targetMinutes: number, actualMinutes: number): number {
  if (targetMinutes <= 0) return 0;

  const difference = Math.abs(actualMinutes - targetMinutes);
  const percentageDiff = (difference / targetMinutes) * 100;

  return Math.min(100, percentageDiff);
}

/**
 * Checks if session met target duration (within 10% tolerance)
 */
export function metTargetDuration(targetMinutes: number, actualMinutes: number): boolean {
  const accuracy = calculateDurationAccuracy(targetMinutes, actualMinutes);
  return accuracy <= 10; // Within 10% is considered "met target"
}
