import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';

export interface ExerciseSet {
  weight: number;
  reps: number;
  rest_seconds?: number;
}

interface SetLoggerProps {
  exerciseName: string;
  previousSet?: ExerciseSet;
  onSetLogged: (set: ExerciseSet) => void;
  onCancel?: () => void;
}

// Common rep presets for quick selection (1 tap)
const REP_PRESETS = [5, 6, 7, 8, 10, 12, 15, 20];

// Weight adjustment increments
const WEIGHT_INCREMENTS = [2.5, 5, 10, 20];

export const SetLogger: React.FC<SetLoggerProps> = ({
  exerciseName,
  previousSet,
  onSetLogged,
  onCancel
}) => {
  const [weight, setWeight] = useState<string>(previousSet?.weight.toString() || '');
  const [reps, setReps] = useState<number | null>(null);
  const [showWeightInput, setShowWeightInput] = useState(false);

  // Auto-fill weight from previous set for easy repeat
  useEffect(() => {
    if (previousSet) {
      setWeight(previousSet.weight.toString());
    }
  }, [previousSet]);

  const handleWeightAdjust = (increment: number) => {
    const currentWeight = parseFloat(weight) || 0;
    const newWeight = currentWeight + increment;
    setWeight(newWeight.toString());
  };

  const handleRepSelect = (repCount: number) => {
    setReps(repCount);

    // Auto-submit if weight is already set (achieves < 5 taps)
    const weightValue = parseFloat(weight);
    if (weightValue > 0) {
      submitSet(weightValue, repCount);
    }
  };

  const handleRepeatSet = () => {
    if (previousSet) {
      submitSet(previousSet.weight, previousSet.reps);
    }
  };

  const submitSet = (weightValue: number, repsValue: number) => {
    const set: ExerciseSet = {
      weight: weightValue,
      reps: repsValue
    };
    onSetLogged(set);

    // Reset reps for next set, keep weight
    setReps(null);
  };

  const handleManualSubmit = () => {
    const weightValue = parseFloat(weight);
    if (weightValue > 0 && reps && reps > 0) {
      submitSet(weightValue, reps);
    }
  };

  return (
    <View style={styles.container} testID="set-logger">
      <Text style={styles.title}>{exerciseName}</Text>

      {/* Weight Section */}
      <View style={styles.section}>
        <Text style={styles.label}>Weight (kg)</Text>

        <View style={styles.weightContainer}>
          <Text style={styles.weightDisplay} testID="weight-display">
            {weight || '0'} kg
          </Text>
          <TouchableOpacity
            style={styles.changeWeightButton}
            onPress={() => setShowWeightInput(true)}
            testID="change-weight-button"
          >
            <Text style={styles.changeWeightText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* Quick weight adjustment buttons */}
        <View style={styles.incrementsContainer}>
          {WEIGHT_INCREMENTS.map((increment) => (
            <React.Fragment key={increment}>
              <TouchableOpacity
                style={styles.incrementButton}
                onPress={() => handleWeightAdjust(-increment)}
                testID={`decrement-${increment}`}
              >
                <Text style={styles.incrementText}>-{increment}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.incrementButton}
                onPress={() => handleWeightAdjust(increment)}
                testID={`increment-${increment}`}
              >
                <Text style={styles.incrementText}>+{increment}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Rep Presets - 1 TAP PER REP SELECTION */}
      <View style={styles.section}>
        <Text style={styles.label}>Reps</Text>
        <View style={styles.repPresetsContainer}>
          {REP_PRESETS.map((repCount) => (
            <TouchableOpacity
              key={repCount}
              style={[
                styles.repPresetButton,
                reps === repCount && styles.repPresetButtonSelected
              ]}
              onPress={() => handleRepSelect(repCount)}
              testID={`rep-preset-${repCount}`}
            >
              <Text
                style={[
                  styles.repPresetText,
                  reps === repCount && styles.repPresetTextSelected
                ]}
              >
                {repCount}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Repeat Previous Set - 1 TAP TOTAL */}
      {previousSet && (
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.repeatButton}
            onPress={handleRepeatSet}
            testID="repeat-set-button"
          >
            <Text style={styles.repeatButtonText}>
              🔁 Repeat Last Set ({previousSet.weight} kg × {previousSet.reps})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actions}>
        {onCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onCancel}
            testID="cancel-button"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Weight Input Modal */}
      <Modal
        visible={showWeightInput}
        transparent
        animationType="fade"
        testID="weight-input-modal"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Weight</Text>
            <TextInput
              style={styles.weightInput}
              testID="weight-input"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholder="0"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowWeightInput(false)}
                testID="modal-cancel-button"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={() => setShowWeightInput(false)}
                testID="modal-save-button"
              >
                <Text style={styles.modalSaveText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 8
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333'
  },
  section: {
    marginBottom: 25
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333'
  },
  weightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  weightDisplay: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  changeWeightButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  changeWeightText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  incrementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  incrementButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  incrementText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333'
  },
  repPresetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  repPresetButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#DDD',
    minWidth: 60,
    alignItems: 'center'
  },
  repPresetButtonSelected: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800'
  },
  repPresetText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  repPresetTextSelected: {
    color: '#FFFFFF'
  },
  repeatButton: {
    backgroundColor: '#7C4DFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  repeatButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  actions: {
    marginTop: 10
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 300
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center'
  },
  weightInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 15,
    fontSize: 24,
    textAlign: 'center',
    marginBottom: 20
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    alignItems: 'center'
  },
  modalCancelText: {
    fontSize: 16,
    color: '#666'
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  modalSaveText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold'
  }
});
