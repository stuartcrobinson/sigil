import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { YogaTimer } from '../components/YogaTimer';
import { showAlert } from '../utils/platformAlert';

type YogaFlowType = 'vinyasa' | 'hatha' | 'yin' | 'restorative' | 'ashtanga' | 'bikram' | 'other';
type YogaDifficulty = 'beginner' | 'intermediate' | 'advanced';

interface YogaActivityScreenProps {
  onSave?: (data: {
    duration_minutes: number;
    flow_type?: YogaFlowType;
    difficulty?: YogaDifficulty;
    notes?: string;
  }) => void;
  onCancel?: () => void;
}

export const YogaActivityScreen: React.FC<YogaActivityScreenProps> = ({ onSave, onCancel }) => {
  const [targetMinutes, setTargetMinutes] = useState<number | undefined>(30);
  const [actualMinutes, setActualMinutes] = useState<number | null>(null);
  const [flowType, setFlowType] = useState<YogaFlowType | undefined>('vinyasa');
  const [difficulty, setDifficulty] = useState<YogaDifficulty | undefined>('intermediate');
  const [notes, setNotes] = useState('');
  const [sessionStarted, setSessionStarted] = useState(false);

  const flowTypes: YogaFlowType[] = ['vinyasa', 'hatha', 'yin', 'restorative', 'ashtanga', 'bikram', 'other'];
  const difficulties: YogaDifficulty[] = ['beginner', 'intermediate', 'advanced'];

  const handleTimerComplete = (elapsedMinutes: number) => {
    setActualMinutes(elapsedMinutes);
    setSessionStarted(false);
  };

  const handleSave = () => {
    if (!actualMinutes) {
      showAlert('Error', 'Please complete the session before saving');
      return;
    }

    const data = {
      duration_minutes: actualMinutes,
      flow_type: flowType,
      difficulty: difficulty,
      notes: notes.trim() || undefined
    };

    if (onSave) {
      onSave(data);
    }
  };

  const handleCancel = () => {
    if (sessionStarted) {
      showAlert(
        'Cancel Session',
        'Are you sure you want to cancel this session?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes', onPress: () => onCancel?.() }
        ]
      );
    } else {
      onCancel?.();
    }
  };

  return (
    <ScrollView style={styles.container} testID="yoga-activity-screen">
      <Text style={styles.title}>Yoga Session</Text>

      {/* Timer Section */}
      <View style={styles.section}>
        <YogaTimer
          targetMinutes={targetMinutes}
          onComplete={handleTimerComplete}
          onStart={() => setSessionStarted(true)}
        />
      </View>

      {/* Target Duration */}
      <View style={styles.section}>
        <Text style={styles.label}>Target Duration (minutes)</Text>
        <TextInput
          style={styles.input}
          testID="target-input"
          value={targetMinutes?.toString() || ''}
          onChangeText={(text) => {
            const num = parseInt(text);
            setTargetMinutes(isNaN(num) ? undefined : num);
          }}
          keyboardType="number-pad"
          placeholder="30"
          editable={!sessionStarted}
        />
      </View>

      {/* Flow Type */}
      <View style={styles.section}>
        <Text style={styles.label}>Flow Type</Text>
        <View style={styles.optionsContainer}>
          {flowTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.optionButton,
                flowType === type && styles.optionButtonSelected
              ]}
              onPress={() => setFlowType(type)}
              testID={`flow-type-${type}`}
              disabled={sessionStarted}
            >
              <Text
                style={[
                  styles.optionText,
                  flowType === type && styles.optionTextSelected
                ]}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Difficulty */}
      <View style={styles.section}>
        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.optionsContainer}>
          {difficulties.map((level) => (
            <TouchableOpacity
              key={level}
              style={[
                styles.optionButton,
                difficulty === level && styles.optionButtonSelected
              ]}
              onPress={() => setDifficulty(level)}
              testID={`difficulty-${level}`}
              disabled={sessionStarted}
            >
              <Text
                style={[
                  styles.optionText,
                  difficulty === level && styles.optionTextSelected
                ]}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.label}>Notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          testID="notes-input"
          value={notes}
          onChangeText={setNotes}
          placeholder="Add notes about your session..."
          multiline
          numberOfLines={4}
        />
      </View>

      {/* Action Buttons */}
      {actualMinutes && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            testID="save-button"
          >
            <Text style={styles.saveButtonText}>Save Session</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          testID="cancel-button"
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333'
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 15,
    borderRadius: 8,
    marginHorizontal: 15
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333'
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16
  },
  notesInput: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFFFFF'
  },
  optionButtonSelected: {
    backgroundColor: '#7C4DFF',
    borderColor: '#7C4DFF'
  },
  optionText: {
    fontSize: 14,
    color: '#666'
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  actions: {
    paddingHorizontal: 15,
    marginBottom: 15
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center'
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold'
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD'
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  }
});
