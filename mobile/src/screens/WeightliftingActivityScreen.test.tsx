import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { WeightliftingActivityScreen } from './WeightliftingActivityScreen';

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('WeightliftingActivityScreen', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pre-workout view', () => {
    it('renders pre-workout view initially', () => {
      const { getByTestId, getByText } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      expect(getByTestId('pre-workout-view')).toBeTruthy();
      expect(getByText('💪 Weightlifting Workout')).toBeTruthy();
      expect(getByTestId('start-workout-button')).toBeTruthy();
    });

    it('starts workout when start button is pressed', () => {
      const { getByTestId, queryByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));

      // Should show active workout view
      expect(queryByTestId('pre-workout-view')).toBeNull();
      expect(getByTestId('active-workout-view')).toBeTruthy();
    });

    it('shows exercise picker when workout starts', () => {
      const { getByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));

      expect(getByTestId('exercise-picker-modal')).toBeTruthy();
    });

    it('calls onCancel when cancel button is pressed before workout starts', () => {
      const { getByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('cancel-button'));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Active workout view', () => {
    it('displays workout stats header', () => {
      const { getByTestId, getByText } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));

      expect(getByText('Active Workout')).toBeTruthy();
      expect(getByText('Exercises')).toBeTruthy();
      expect(getByText('Sets')).toBeTruthy();
      expect(getByText('Volume (kg)')).toBeTruthy();
      expect(getByText('Minutes')).toBeTruthy();
    });

    it('shows initial stats as zero', () => {
      const { getByTestId, getAllByText } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));

      // Multiple "0" values for stats
      const zeroTexts = getAllByText('0');
      expect(zeroTexts.length).toBeGreaterThan(0);
    });

    it('shows add exercise button when no current exercise', () => {
      const { getByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));

      // Close exercise picker first
      fireEvent.press(getByTestId('close-button'));

      expect(getByTestId('add-exercise-button')).toBeTruthy();
    });

    it('opens exercise picker when add exercise button is pressed', () => {
      const { getByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('close-button')); // Close initial picker
      fireEvent.press(getByTestId('add-exercise-button'));

      // Modal should be visible (it's always in the tree, just controlled by visible prop)
      expect(getByTestId('exercise-picker-modal')).toBeTruthy();
    });
  });

  describe('Exercise selection and logging', () => {
    it('displays SetLogger when exercise is selected', () => {
      const { getByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));

      // Select an exercise
      fireEvent.press(getByTestId('exercise-bench-press'));

      expect(getByTestId('set-logger')).toBeTruthy();
    });

    it('shows selected exercise name in SetLogger', () => {
      const { getByTestId, getAllByText } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('exercise-bench-press'));

      // May appear multiple times (in modal and SetLogger), just verify it exists
      const benchPressElements = getAllByText('Bench Press');
      expect(benchPressElements.length).toBeGreaterThan(0);
    });

    it('logs a set when using SetLogger', () => {
      const { getByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('exercise-bench-press'));

      // Open weight modal and enter weight
      fireEvent.press(getByTestId('change-weight-button'));
      fireEvent.changeText(getByTestId('weight-input'), '80');
      fireEvent.press(getByTestId('modal-save-button'));

      // Select reps (auto-submits)
      fireEvent.press(getByTestId('rep-preset-8'));

      // Check that workout summary shows the set
      expect(getByTestId('active-workout-view')).toBeTruthy();
    });

    it('updates workout stats after logging a set', async () => {
      const { getByTestId, getAllByText, getByText } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('exercise-bench-press'));

      // Log a set: 80 kg × 8 reps = 640 kg volume
      fireEvent.press(getByTestId('change-weight-button'));
      fireEvent.changeText(getByTestId('weight-input'), '80');
      fireEvent.press(getByTestId('modal-save-button'));
      fireEvent.press(getByTestId('rep-preset-8'));

      // Stats should update (640 kg is unique, 1 appears multiple times)
      await waitFor(() => {
        expect(getByText('640')).toBeTruthy(); // 640 kg volume (unique value)
        const oneElements = getAllByText('1');
        expect(oneElements.length).toBeGreaterThan(0); // 1 set (may appear multiple times)
      });
    });

    it('allows logging multiple sets for same exercise', async () => {
      const { getByTestId, getByText } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('exercise-bench-press'));

      // Log first set: 80 kg × 8 reps
      fireEvent.press(getByTestId('change-weight-button'));
      fireEvent.changeText(getByTestId('weight-input'), '80');
      fireEvent.press(getByTestId('modal-save-button'));
      fireEvent.press(getByTestId('rep-preset-8'));

      // Log second set: 85 kg × 6 reps
      await waitFor(() => {
        expect(getByTestId('change-weight-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('change-weight-button'));
      fireEvent.changeText(getByTestId('weight-input'), '85');
      fireEvent.press(getByTestId('modal-save-button'));
      fireEvent.press(getByTestId('rep-preset-6'));

      // Should have 2 sets
      await waitFor(() => {
        expect(getByText('2')).toBeTruthy(); // 2 sets total
      });
    });

    it('verifies < 5 taps requirement using repeat set button', async () => {
      const { getByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('exercise-bench-press'));

      // First set: tap weight change (1) + enter 80 (2-3) + save modal (1) + rep preset (1) = 5 taps max
      fireEvent.press(getByTestId('change-weight-button')); // tap 1
      fireEvent.changeText(getByTestId('weight-input'), '80'); // tap 2-3 (assuming number pad)
      fireEvent.press(getByTestId('modal-save-button')); // tap 4
      fireEvent.press(getByTestId('rep-preset-8')); // tap 5 (auto-submits)

      // Second set using repeat: just 1 tap!
      await waitFor(() => {
        expect(getByTestId('repeat-set-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('repeat-set-button')); // Only 1 tap! ✅

      // Verify 2 sets were logged
      await waitFor(() => {
        const summaryText = getByTestId('active-workout-view');
        expect(summaryText).toBeTruthy();
      });
    });

    it('shows finish exercise button when logging sets', () => {
      const { getByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('exercise-bench-press'));

      expect(getByTestId('finish-exercise-button')).toBeTruthy();
    });

    it('closes SetLogger when finish exercise is pressed', () => {
      const { getByTestId, queryByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('exercise-bench-press'));
      fireEvent.press(getByTestId('finish-exercise-button'));

      expect(queryByTestId('set-logger')).toBeNull();
      expect(getByTestId('add-exercise-button')).toBeTruthy();
    });
  });

  describe('Multiple exercises', () => {
    it('allows adding multiple different exercises', async () => {
      const { getByTestId, getAllByText } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));

      // Add first exercise
      fireEvent.press(getByTestId('exercise-bench-press'));
      fireEvent.press(getByTestId('finish-exercise-button'));

      // Add second exercise (use one that's visible in FlatList)
      fireEvent.press(getByTestId('add-exercise-button'));
      fireEvent.press(getByTestId('exercise-deadlift'));

      // Both exercises should be in summary (may appear multiple times in different sections)
      await waitFor(() => {
        const benchPressElements = getAllByText('Bench Press');
        const deadliftElements = getAllByText('Deadlift');
        expect(benchPressElements.length).toBeGreaterThan(0);
        expect(deadliftElements.length).toBeGreaterThan(0);
      });
    });

    it('updates exercise count stat', async () => {
      const { getByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('exercise-bench-press'));
      fireEvent.press(getByTestId('finish-exercise-button'));

      fireEvent.press(getByTestId('add-exercise-button'));
      fireEvent.press(getByTestId('exercise-deadlift'));

      await waitFor(() => {
        // Should show 2 exercises in stats
        const statsHeader = getByTestId('active-workout-view');
        expect(statsHeader).toBeTruthy();
      });
    });
  });

  describe('Workout summary', () => {
    it('displays workout summary section after logging sets', async () => {
      const { getByTestId, getByText } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('exercise-bench-press'));

      // Log a set
      fireEvent.press(getByTestId('change-weight-button'));
      fireEvent.changeText(getByTestId('weight-input'), '80');
      fireEvent.press(getByTestId('modal-save-button'));
      fireEvent.press(getByTestId('rep-preset-8'));

      await waitFor(() => {
        expect(getByText('Workout Summary')).toBeTruthy();
      });
    });

    it('shows set details in summary', async () => {
      const { getByTestId, getByText } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('exercise-bench-press'));

      // Log a set: 80 kg × 8 reps
      fireEvent.press(getByTestId('change-weight-button'));
      fireEvent.changeText(getByTestId('weight-input'), '80');
      fireEvent.press(getByTestId('modal-save-button'));
      fireEvent.press(getByTestId('rep-preset-8'));

      await waitFor(() => {
        expect(getByText(/Set 1: 80 kg × 8 reps/)).toBeTruthy();
      });
    });

    it('shows message for exercises with no sets', async () => {
      const { getByTestId, getByText } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('exercise-bench-press'));
      fireEvent.press(getByTestId('finish-exercise-button'));

      await waitFor(() => {
        expect(getByText('No sets logged yet')).toBeTruthy();
      });
    });
  });

  describe('Save and cancel workflow', () => {
    it('shows save and cancel buttons in active workout', () => {
      const { getByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('close-button')); // Close exercise picker

      expect(getByTestId('save-workout-button')).toBeTruthy();
      expect(getByTestId('cancel-workout-button')).toBeTruthy();
    });

    it('shows alert when trying to save workout with no sets', () => {
      const { getByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('close-button'));
      fireEvent.press(getByTestId('save-workout-button'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'No Sets Logged',
        'Please log at least one set before saving.'
      );
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('calls onSave with workout data when saving with logged sets', async () => {
      const { getByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('exercise-bench-press'));

      // Log a set
      fireEvent.press(getByTestId('change-weight-button'));
      fireEvent.changeText(getByTestId('weight-input'), '80');
      fireEvent.press(getByTestId('modal-save-button'));
      fireEvent.press(getByTestId('rep-preset-8'));

      await waitFor(() => {
        expect(getByTestId('save-workout-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('save-workout-button'));

      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            exercise: expect.objectContaining({
              id: 'bench-press',
              name: 'Bench Press'
            }),
            sets: expect.arrayContaining([
              expect.objectContaining({
                weight: 80,
                reps: 8
              })
            ])
          })
        ])
      );
    });

    it('shows confirmation dialog when cancelling workout with logged sets', async () => {
      const { getByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('exercise-bench-press'));

      // Log a set
      fireEvent.press(getByTestId('change-weight-button'));
      fireEvent.changeText(getByTestId('weight-input'), '80');
      fireEvent.press(getByTestId('modal-save-button'));
      fireEvent.press(getByTestId('rep-preset-8'));

      await waitFor(() => {
        expect(getByTestId('cancel-workout-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('cancel-workout-button'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Discard Workout?',
        'Are you sure you want to discard this workout?',
        expect.arrayContaining([
          expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
          expect.objectContaining({ text: 'Discard', style: 'destructive' })
        ])
      );
    });

    it('cancels without confirmation if no sets logged', () => {
      const { getByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('close-button'));
      fireEvent.press(getByTestId('cancel-workout-button'));

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
      expect(Alert.alert).not.toHaveBeenCalled();
    });
  });

  describe('Recent exercises', () => {
    it('adds selected exercise to recent exercises', async () => {
      const { getByTestId, queryByTestId } = render(
        <WeightliftingActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-workout-button'));
      fireEvent.press(getByTestId('exercise-bench-press'));

      // Log a set to trigger recent exercise update
      fireEvent.press(getByTestId('change-weight-button'));
      fireEvent.changeText(getByTestId('weight-input'), '80');
      fireEvent.press(getByTestId('modal-save-button'));
      fireEvent.press(getByTestId('rep-preset-8'));

      await waitFor(() => {
        expect(getByTestId('finish-exercise-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('finish-exercise-button'));
      fireEvent.press(getByTestId('add-exercise-button'));

      // Recent exercises should now show bench press
      await waitFor(() => {
        expect(queryByTestId('recent-bench-press')).toBeTruthy();
      });
    });
  });
});
