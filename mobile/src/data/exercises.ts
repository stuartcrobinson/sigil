// Exercise library for weightlifting
// Organized by primary muscle group for easy categorization

export interface Exercise {
  id: string;
  name: string;
  category: string;
  muscleGroup: string;
  equipment?: string;
}

export const EXERCISE_CATEGORIES = {
  CHEST: 'Chest',
  BACK: 'Back',
  LEGS: 'Legs',
  SHOULDERS: 'Shoulders',
  ARMS: 'Arms',
  CORE: 'Core',
  FULL_BODY: 'Full Body'
} as const;

export const EXERCISES: Exercise[] = [
  // Chest
  { id: 'bench-press', name: 'Bench Press', category: EXERCISE_CATEGORIES.CHEST, muscleGroup: 'Chest', equipment: 'Barbell' },
  { id: 'incline-bench-press', name: 'Incline Bench Press', category: EXERCISE_CATEGORIES.CHEST, muscleGroup: 'Chest', equipment: 'Barbell' },
  { id: 'dumbbell-press', name: 'Dumbbell Press', category: EXERCISE_CATEGORIES.CHEST, muscleGroup: 'Chest', equipment: 'Dumbbell' },
  { id: 'push-ups', name: 'Push-ups', category: EXERCISE_CATEGORIES.CHEST, muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { id: 'dips', name: 'Dips', category: EXERCISE_CATEGORIES.CHEST, muscleGroup: 'Chest', equipment: 'Bodyweight' },
  { id: 'cable-fly', name: 'Cable Fly', category: EXERCISE_CATEGORIES.CHEST, muscleGroup: 'Chest', equipment: 'Cable' },

  // Back
  { id: 'deadlift', name: 'Deadlift', category: EXERCISE_CATEGORIES.BACK, muscleGroup: 'Back', equipment: 'Barbell' },
  { id: 'pull-ups', name: 'Pull-ups', category: EXERCISE_CATEGORIES.BACK, muscleGroup: 'Back', equipment: 'Bodyweight' },
  { id: 'bent-over-row', name: 'Bent Over Row', category: EXERCISE_CATEGORIES.BACK, muscleGroup: 'Back', equipment: 'Barbell' },
  { id: 'dumbbell-row', name: 'Dumbbell Row', category: EXERCISE_CATEGORIES.BACK, muscleGroup: 'Back', equipment: 'Dumbbell' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', category: EXERCISE_CATEGORIES.BACK, muscleGroup: 'Back', equipment: 'Cable' },
  { id: 't-bar-row', name: 'T-Bar Row', category: EXERCISE_CATEGORIES.BACK, muscleGroup: 'Back', equipment: 'Barbell' },

  // Legs
  { id: 'squat', name: 'Squat', category: EXERCISE_CATEGORIES.LEGS, muscleGroup: 'Legs', equipment: 'Barbell' },
  { id: 'front-squat', name: 'Front Squat', category: EXERCISE_CATEGORIES.LEGS, muscleGroup: 'Legs', equipment: 'Barbell' },
  { id: 'leg-press', name: 'Leg Press', category: EXERCISE_CATEGORIES.LEGS, muscleGroup: 'Legs', equipment: 'Machine' },
  { id: 'lunges', name: 'Lunges', category: EXERCISE_CATEGORIES.LEGS, muscleGroup: 'Legs', equipment: 'Dumbbell' },
  { id: 'leg-curl', name: 'Leg Curl', category: EXERCISE_CATEGORIES.LEGS, muscleGroup: 'Legs', equipment: 'Machine' },
  { id: 'leg-extension', name: 'Leg Extension', category: EXERCISE_CATEGORIES.LEGS, muscleGroup: 'Legs', equipment: 'Machine' },
  { id: 'calf-raise', name: 'Calf Raise', category: EXERCISE_CATEGORIES.LEGS, muscleGroup: 'Legs', equipment: 'Machine' },

  // Shoulders
  { id: 'overhead-press', name: 'Overhead Press', category: EXERCISE_CATEGORIES.SHOULDERS, muscleGroup: 'Shoulders', equipment: 'Barbell' },
  { id: 'dumbbell-shoulder-press', name: 'Dumbbell Shoulder Press', category: EXERCISE_CATEGORIES.SHOULDERS, muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'lateral-raise', name: 'Lateral Raise', category: EXERCISE_CATEGORIES.SHOULDERS, muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'front-raise', name: 'Front Raise', category: EXERCISE_CATEGORIES.SHOULDERS, muscleGroup: 'Shoulders', equipment: 'Dumbbell' },
  { id: 'rear-delt-fly', name: 'Rear Delt Fly', category: EXERCISE_CATEGORIES.SHOULDERS, muscleGroup: 'Shoulders', equipment: 'Dumbbell' },

  // Arms
  { id: 'barbell-curl', name: 'Barbell Curl', category: EXERCISE_CATEGORIES.ARMS, muscleGroup: 'Biceps', equipment: 'Barbell' },
  { id: 'dumbbell-curl', name: 'Dumbbell Curl', category: EXERCISE_CATEGORIES.ARMS, muscleGroup: 'Biceps', equipment: 'Dumbbell' },
  { id: 'hammer-curl', name: 'Hammer Curl', category: EXERCISE_CATEGORIES.ARMS, muscleGroup: 'Biceps', equipment: 'Dumbbell' },
  { id: 'tricep-extension', name: 'Tricep Extension', category: EXERCISE_CATEGORIES.ARMS, muscleGroup: 'Triceps', equipment: 'Dumbbell' },
  { id: 'skull-crushers', name: 'Skull Crushers', category: EXERCISE_CATEGORIES.ARMS, muscleGroup: 'Triceps', equipment: 'Barbell' },
  { id: 'tricep-dips', name: 'Tricep Dips', category: EXERCISE_CATEGORIES.ARMS, muscleGroup: 'Triceps', equipment: 'Bodyweight' },

  // Core
  { id: 'plank', name: 'Plank', category: EXERCISE_CATEGORIES.CORE, muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'crunches', name: 'Crunches', category: EXERCISE_CATEGORIES.CORE, muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'leg-raises', name: 'Leg Raises', category: EXERCISE_CATEGORIES.CORE, muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'russian-twists', name: 'Russian Twists', category: EXERCISE_CATEGORIES.CORE, muscleGroup: 'Core', equipment: 'Bodyweight' },
  { id: 'hanging-knee-raises', name: 'Hanging Knee Raises', category: EXERCISE_CATEGORIES.CORE, muscleGroup: 'Core', equipment: 'Bodyweight' },

  // Full Body
  { id: 'burpees', name: 'Burpees', category: EXERCISE_CATEGORIES.FULL_BODY, muscleGroup: 'Full Body', equipment: 'Bodyweight' },
  { id: 'clean-and-jerk', name: 'Clean and Jerk', category: EXERCISE_CATEGORIES.FULL_BODY, muscleGroup: 'Full Body', equipment: 'Barbell' },
  { id: 'snatch', name: 'Snatch', category: EXERCISE_CATEGORIES.FULL_BODY, muscleGroup: 'Full Body', equipment: 'Barbell' },
  { id: 'thruster', name: 'Thruster', category: EXERCISE_CATEGORIES.FULL_BODY, muscleGroup: 'Full Body', equipment: 'Barbell' }
];

// Helper function to search exercises
export const searchExercises = (query: string): Exercise[] => {
  if (!query || query.trim() === '') {
    return EXERCISES;
  }

  const lowerQuery = query.toLowerCase();
  return EXERCISES.filter(
    exercise =>
      exercise.name.toLowerCase().includes(lowerQuery) ||
      exercise.category.toLowerCase().includes(lowerQuery) ||
      exercise.muscleGroup.toLowerCase().includes(lowerQuery) ||
      exercise.equipment?.toLowerCase().includes(lowerQuery)
  );
};

// Helper function to get exercises by category
export const getExercisesByCategory = (category: string): Exercise[] => {
  return EXERCISES.filter(exercise => exercise.category === category);
};
