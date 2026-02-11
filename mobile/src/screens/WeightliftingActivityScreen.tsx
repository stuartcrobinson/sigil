import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { ExercisePicker } from '../components/ExercisePicker';
import { SetLogger, ExerciseSet } from '../components/SetLogger';
import { Exercise } from '../data/exercises';

interface WorkoutExercise {
  exercise: Exercise;
  sets: ExerciseSet[];
}

interface WeightliftingActivityScreenProps {
  onSave: (workout: WorkoutExercise[]) => void;
  onCancel: () => void;
}

export const WeightliftingActivityScreen: React.FC<WeightliftingActivityScreenProps> = ({
  onSave,
  onCancel
}) => {
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [exercises, setExercises] = useState<WorkoutExercise[]>([]);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [recentExercises, setRecentExercises] = useState<Exercise[]>([]);

  useEffect(() => {
    if (workoutStarted && !workoutStartTime) {
      setWorkoutStartTime(new Date());
    }
  }, [workoutStarted, workoutStartTime]);

  const handleStartWorkout = () => {
    setWorkoutStarted(true);
    setShowExercisePicker(true);
  };

  const handleExerciseSelected = (exercise: Exercise) => {
    setCurrentExercise(exercise);
    setShowExercisePicker(false);

    // Check if exercise already exists in workout
    const existingExercise = exercises.find(e => e.exercise.id === exercise.id);
    if (!existingExercise) {
      // Add new exercise to workout
      setExercises([...exercises, { exercise, sets: [] }]);
    }
  };

  const handleSetLogged = (set: ExerciseSet) => {
    if (!currentExercise) return;

    setExercises(prevExercises => {
      return prevExercises.map(ex => {
        if (ex.exercise.id === currentExercise.id) {
          return {
            ...ex,
            sets: [...ex.sets, set]
          };
        }
        return ex;
      });
    });

    // Update recent exercises
    if (!recentExercises.find(e => e.id === currentExercise.id)) {
      setRecentExercises([currentExercise, ...recentExercises.slice(0, 4)]);
    }
  };

  const handleAddExercise = () => {
    setShowExercisePicker(true);
  };

  const handleFinishExercise = () => {
    setCurrentExercise(null);
  };

  const handleSaveWorkout = () => {
    if (exercises.length === 0 || exercises.every(ex => ex.sets.length === 0)) {
      Alert.alert('No Sets Logged', 'Please log at least one set before saving.');
      return;
    }

    onSave(exercises);
  };

  const handleCancelWorkout = () => {
    if (exercises.some(ex => ex.sets.length > 0)) {
      Alert.alert(
        'Discard Workout?',
        'Are you sure you want to discard this workout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => onCancel()
          }
        ]
      );
    } else {
      onCancel();
    }
  };

  const calculateWorkoutStats = () => {
    const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
    const totalVolume = exercises.reduce(
      (sum, ex) =>
        sum +
        ex.sets.reduce((setSum, set) => setSum + set.weight * set.reps, 0),
      0
    );
    const duration = workoutStartTime
      ? Math.floor((new Date().getTime() - workoutStartTime.getTime()) / 60000)
      : 0;

    return { totalSets, totalVolume, duration, exerciseCount: exercises.length };
  };

  const stats = calculateWorkoutStats();

  // Pre-workout view
  if (!workoutStarted) {
    return (
      <View style={styles.container} testID="pre-workout-view">
        <Text style={styles.title}>💪 Weightlifting Workout</Text>
        <Text style={styles.subtitle}>
          Track your exercises, sets, reps, and weight with ease
        </Text>

        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStartWorkout}
          testID="start-workout-button"
        >
          <Text style={styles.startButtonText}>Start Workout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButtonPre}
          onPress={onCancel}
          testID="cancel-button"
        >
          <Text style={styles.cancelButtonPreText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Active workout view
  return (
    <View style={styles.container} testID="active-workout-view">
      <ScrollView style={styles.scrollView}>
        {/* Workout Stats Header */}
        <View style={styles.statsHeader}>
          <Text style={styles.statsTitle}>Active Workout</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.exerciseCount}</Text>
              <Text style={styles.statLabel}>Exercises</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalSets}</Text>
              <Text style={styles.statLabel}>Sets</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.totalVolume.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Volume (kg)</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.duration}</Text>
              <Text style={styles.statLabel}>Minutes</Text>
            </View>
          </View>
        </View>

        {/* Current Exercise Set Logger */}
        {currentExercise && (
          <View style={styles.currentExerciseSection}>
            <SetLogger
              exerciseName={currentExercise.name}
              previousSet={
                exercises.find(ex => ex.exercise.id === currentExercise.id)?.sets.slice(-1)[0]
              }
              onSetLogged={handleSetLogged}
              onCancel={handleFinishExercise}
            />
            <TouchableOpacity
              style={styles.finishExerciseButton}
              onPress={handleFinishExercise}
              testID="finish-exercise-button"
            >
              <Text style={styles.finishExerciseButtonText}>Finish Exercise</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Add Exercise Button (shown when not logging) */}
        {!currentExercise && (
          <TouchableOpacity
            style={styles.addExerciseButton}
            onPress={handleAddExercise}
            testID="add-exercise-button"
          >
            <Text style={styles.addExerciseButtonText}>+ Add Exercise</Text>
          </TouchableOpacity>
        )}

        {/* Workout Summary */}
        {exercises.length > 0 && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Workout Summary</Text>
            {exercises.map((ex, index) => (
              <View key={`${ex.exercise.id}-${index}`} style={styles.summaryExercise}>
                <Text style={styles.summaryExerciseName}>{ex.exercise.name}</Text>
                {ex.sets.map((set, setIndex) => (
                  <Text key={setIndex} style={styles.summarySet}>
                    Set {setIndex + 1}: {set.weight} kg × {set.reps} reps
                  </Text>
                ))}
                {ex.sets.length === 0 && (
                  <Text style={styles.summaryNoSets}>No sets logged yet</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelWorkout}
          testID="cancel-workout-button"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveWorkout}
          testID="save-workout-button"
        >
          <Text style={styles.saveButtonText}>Finish Workout</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise Picker Modal */}
      <ExercisePicker
        visible={showExercisePicker}
        recentExercises={recentExercises}
        onExerciseSelected={handleExerciseSelected}
        onCancel={() => setShowExercisePicker(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  scrollView: {
    flex: 1
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 10,
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
    paddingHorizontal: 30
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 12,
    marginHorizontal: 30,
    marginBottom: 20
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  cancelButtonPre: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    marginHorizontal: 30
  },
  cancelButtonPreText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center'
  },
  statsHeader: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 15
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4
  },
  currentExerciseSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15
  },
  finishExerciseButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15
  },
  finishExerciseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  addExerciseButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    borderRadius: 12,
    marginHorizontal: 15,
    marginBottom: 15
  },
  addExerciseButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  summarySection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 20
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  summaryExercise: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  summaryExerciseName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  summarySet: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
    marginTop: 4
  },
  summaryNoSets: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    marginLeft: 10
  },
  actions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 10
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFFFFF'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  }
});
