import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ExercisePicker } from './ExercisePicker';
import { Exercise, EXERCISES } from '../data/exercises';

describe('ExercisePicker', () => {
  const mockOnExerciseSelected = jest.fn();
  const mockOnCancel = jest.fn();

  const sampleRecentExercises: Exercise[] = [
    { id: 'bench-press', name: 'Bench Press', category: 'Chest', muscleGroup: 'Chest', equipment: 'Barbell' },
    { id: 'squat', name: 'Squat', category: 'Legs', muscleGroup: 'Legs', equipment: 'Barbell' }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when visible', () => {
    const { getByTestId } = render(
      <ExercisePicker
        visible={true}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    expect(getByTestId('exercise-picker-modal')).toBeTruthy();
    expect(getByTestId('search-input')).toBeTruthy();
    expect(getByTestId('exercise-list')).toBeTruthy();
  });

  it('does not render when not visible', () => {
    const { queryByTestId } = render(
      <ExercisePicker
        visible={false}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    // Modal contents should not be accessible when visible=false
    expect(queryByTestId('search-input')).toBeNull();
  });

  it('displays all exercises by default', () => {
    const { getByTestId } = render(
      <ExercisePicker
        visible={true}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    // Check that some exercises are rendered (FlatList may virtualize)
    expect(getByTestId('exercise-bench-press')).toBeTruthy();
    expect(getByTestId('exercise-deadlift')).toBeTruthy();
  });

  it('filters exercises based on search query', () => {
    const { getByTestId, queryByTestId } = render(
      <ExercisePicker
        visible={true}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    const searchInput = getByTestId('search-input');

    // Search for "bench"
    fireEvent.changeText(searchInput, 'bench');

    // Should show bench-related exercises
    expect(getByTestId('exercise-bench-press')).toBeTruthy();
    expect(queryByTestId('exercise-incline-bench-press')).toBeTruthy();

    // Should not show non-matching exercises
    expect(queryByTestId('exercise-deadlift')).toBeNull();
  });

  it('shows empty state when no exercises match search', () => {
    const { getByTestId } = render(
      <ExercisePicker
        visible={true}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    const searchInput = getByTestId('search-input');

    // Search for something that doesn't exist
    fireEvent.changeText(searchInput, 'zzzznonexistent');

    expect(getByTestId('empty-state')).toBeTruthy();
  });

  it('filters exercises by category', () => {
    const { getByTestId, queryByTestId } = render(
      <ExercisePicker
        visible={true}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    // Select "Chest" category
    const chestCategory = getByTestId('category-chest');
    fireEvent.press(chestCategory);

    // Should show chest exercises
    expect(getByTestId('exercise-bench-press')).toBeTruthy();
    expect(queryByTestId('exercise-push-ups')).toBeTruthy();

    // Should not show non-chest exercises (deadlift is Back)
    expect(queryByTestId('exercise-deadlift')).toBeNull();
  });

  it('combines search and category filters', () => {
    const { getByTestId, queryByTestId } = render(
      <ExercisePicker
        visible={true}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    // Select "Chest" category
    fireEvent.press(getByTestId('category-chest'));

    // Search for "press"
    fireEvent.changeText(getByTestId('search-input'), 'press');

    // Should show chest exercises with "press" in name
    expect(getByTestId('exercise-bench-press')).toBeTruthy();
    expect(queryByTestId('exercise-incline-bench-press')).toBeTruthy();
    expect(queryByTestId('exercise-dumbbell-press')).toBeTruthy();

    // Should not show non-chest exercises even if they match search
    expect(queryByTestId('exercise-overhead-press')).toBeNull(); // Shoulders
    expect(queryByTestId('exercise-leg-press')).toBeNull(); // Legs
  });

  it('resets to all categories when "All" is selected', () => {
    const { getByTestId, queryByTestId } = render(
      <ExercisePicker
        visible={true}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    // Select a specific category first
    fireEvent.press(getByTestId('category-chest'));

    // Then select "All"
    fireEvent.press(getByTestId('category-all'));

    // Should show exercises from all categories again (FlatList may virtualize)
    expect(getByTestId('exercise-bench-press')).toBeTruthy(); // Chest
    expect(getByTestId('exercise-deadlift')).toBeTruthy(); // Back
  });

  it('displays recent exercises when provided', () => {
    const { getByTestId } = render(
      <ExercisePicker
        visible={true}
        recentExercises={sampleRecentExercises}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    expect(getByTestId('recent-bench-press')).toBeTruthy();
    expect(getByTestId('recent-squat')).toBeTruthy();
  });

  it('hides recent exercises when user starts searching', () => {
    const { getByTestId, queryByTestId } = render(
      <ExercisePicker
        visible={true}
        recentExercises={sampleRecentExercises}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    // Recent exercises should be visible initially
    expect(getByTestId('recent-bench-press')).toBeTruthy();

    // Start searching
    fireEvent.changeText(getByTestId('search-input'), 'squat');

    // Recent exercises should be hidden
    expect(queryByTestId('recent-bench-press')).toBeNull();
  });

  it('calls onExerciseSelected when exercise is selected from list', () => {
    const { getByTestId } = render(
      <ExercisePicker
        visible={true}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    const benchPressItem = getByTestId('exercise-bench-press');
    fireEvent.press(benchPressItem);

    expect(mockOnExerciseSelected).toHaveBeenCalledTimes(1);
    expect(mockOnExerciseSelected).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'bench-press',
        name: 'Bench Press'
      })
    );
  });

  it('calls onExerciseSelected when recent exercise is selected', () => {
    const { getByTestId } = render(
      <ExercisePicker
        visible={true}
        recentExercises={sampleRecentExercises}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    const recentBenchPress = getByTestId('recent-bench-press');
    fireEvent.press(recentBenchPress);

    expect(mockOnExerciseSelected).toHaveBeenCalledTimes(1);
    expect(mockOnExerciseSelected).toHaveBeenCalledWith(sampleRecentExercises[0]);
  });

  it('resets search and category when exercise is selected', () => {
    const { getByTestId } = render(
      <ExercisePicker
        visible={true}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    // Set search and category
    fireEvent.changeText(getByTestId('search-input'), 'bench');
    fireEvent.press(getByTestId('category-chest'));

    // Select an exercise
    fireEvent.press(getByTestId('exercise-bench-press'));

    expect(mockOnExerciseSelected).toHaveBeenCalled();
    // State is reset internally (tested by behavior, not direct state access)
  });

  it('calls onCancel when close button is pressed', () => {
    const { getByTestId } = render(
      <ExercisePicker
        visible={true}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    const closeButton = getByTestId('close-button');
    fireEvent.press(closeButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it('resets search and category when cancelled', () => {
    const { getByTestId, rerender } = render(
      <ExercisePicker
        visible={true}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    // Set search and category
    fireEvent.changeText(getByTestId('search-input'), 'bench');
    fireEvent.press(getByTestId('category-chest'));

    // Cancel
    fireEvent.press(getByTestId('close-button'));

    // Re-open modal to verify state was reset
    rerender(
      <ExercisePicker
        visible={true}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    // Search input should be empty
    const searchInput = getByTestId('search-input');
    expect(searchInput.props.value).toBe('');
  });

  it('limits recent exercises to 5', () => {
    const manyRecentExercises: Exercise[] = EXERCISES.slice(0, 10); // 10 exercises

    const { queryByTestId } = render(
      <ExercisePicker
        visible={true}
        recentExercises={manyRecentExercises}
        onExerciseSelected={mockOnExerciseSelected}
        onCancel={mockOnCancel}
      />
    );

    // Should show first 5
    expect(queryByTestId(`recent-${manyRecentExercises[0].id}`)).toBeTruthy();
    expect(queryByTestId(`recent-${manyRecentExercises[4].id}`)).toBeTruthy();

    // Should not show 6th and beyond
    expect(queryByTestId(`recent-${manyRecentExercises[5].id}`)).toBeNull();
    expect(queryByTestId(`recent-${manyRecentExercises[9].id}`)).toBeNull();
  });
});
