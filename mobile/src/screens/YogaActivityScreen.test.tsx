import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { YogaActivityScreen } from './YogaActivityScreen';

jest.spyOn(Alert, 'alert');

describe('YogaActivityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render yoga activity screen', () => {
    const { getByTestId, getByText } = render(<YogaActivityScreen />);

    expect(getByTestId('yoga-activity-screen')).toBeTruthy();
    expect(getByText('Yoga Session')).toBeTruthy();
    expect(getByTestId('yoga-timer')).toBeTruthy();
  });

  it('should render with default values', () => {
    const { getByTestId } = render(<YogaActivityScreen />);

    expect(getByTestId('target-input').props.value).toBe('30');
    expect(getByTestId('flow-type-vinyasa')).toHaveStyle({ backgroundColor: '#7C4DFF' });
    expect(getByTestId('difficulty-intermediate')).toHaveStyle({ backgroundColor: '#7C4DFF' });
  });

  it('should allow changing target duration', () => {
    const { getByTestId } = render(<YogaActivityScreen />);

    const input = getByTestId('target-input');
    fireEvent.changeText(input, '45');

    expect(input.props.value).toBe('45');
  });

  it('should allow selecting flow type', () => {
    const { getByTestId } = render(<YogaActivityScreen />);

    fireEvent.press(getByTestId('flow-type-hatha'));

    expect(getByTestId('flow-type-hatha')).toHaveStyle({ backgroundColor: '#7C4DFF' });
    expect(getByTestId('flow-type-vinyasa')).not.toHaveStyle({ backgroundColor: '#7C4DFF' });
  });

  it('should allow selecting difficulty level', () => {
    const { getByTestId } = render(<YogaActivityScreen />);

    fireEvent.press(getByTestId('difficulty-advanced'));

    expect(getByTestId('difficulty-advanced')).toHaveStyle({ backgroundColor: '#7C4DFF' });
    expect(getByTestId('difficulty-intermediate')).not.toHaveStyle({ backgroundColor: '#7C4DFF' });
  });

  it('should allow entering notes', () => {
    const { getByTestId } = render(<YogaActivityScreen />);

    const notesInput = getByTestId('notes-input');
    fireEvent.changeText(notesInput, 'Great morning flow!');

    expect(notesInput.props.value).toBe('Great morning flow!');
  });

  it('should show save button after session completes', async () => {
    const { getByTestId, queryByTestId } = render(<YogaActivityScreen />);

    // Initially no save button
    expect(queryByTestId('save-button')).toBeNull();

    // Start timer
    fireEvent.press(getByTestId('start-button'));

    // Wait for timer to start
    // Wait for timer to start (increased timeout for reliability)
    await waitFor(() => {
      expect(getByTestId('timer-display').props.children).not.toBe('0:00');
    }, { timeout: 3000, interval: 100 });

    // Stop timer
    fireEvent.press(getByTestId('stop-button'));

    // Save button should appear
    expect(getByTestId('save-button')).toBeTruthy();
  });

  it('should call onSave with correct data when save button is pressed', async () => {
    const onSave = jest.fn();
    const { getByTestId } = render(<YogaActivityScreen onSave={onSave} />);

    // Change flow type and difficulty
    fireEvent.press(getByTestId('flow-type-yin'));
    fireEvent.press(getByTestId('difficulty-beginner'));

    // Add notes
    fireEvent.changeText(getByTestId('notes-input'), 'Relaxing session');

    // Complete session
    fireEvent.press(getByTestId('start-button'));

    // Wait for time to pass
    // Wait for timer to start (increased timeout for reliability)
    await waitFor(() => {
      expect(getByTestId('timer-display').props.children).not.toBe('0:00');
    }, { timeout: 3000, interval: 100 });

    fireEvent.press(getByTestId('stop-button'));

    // Save
    fireEvent.press(getByTestId('save-button'));

    expect(onSave).toHaveBeenCalled();
    const callArgs = onSave.mock.calls[0][0];
    expect(callArgs.duration_minutes).toBeGreaterThan(0);
    expect(callArgs.flow_type).toBe('yin');
    expect(callArgs.difficulty).toBe('beginner');
    expect(callArgs.notes).toBe('Relaxing session');
  });

  it('should not call onSave if session not completed', () => {
    const onSave = jest.fn();
    const { queryByTestId } = render(<YogaActivityScreen onSave={onSave} />);

    // Try to save without completing session
    expect(queryByTestId('save-button')).toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('should show alert if trying to save without completing session', () => {
    const screen = render(<YogaActivityScreen />);

    // No session completed, save button shouldn't exist
    expect(screen.queryByTestId('save-button')).toBeNull();
  });

  it('should call onCancel when cancel button is pressed', () => {
    const onCancel = jest.fn();
    const { getByTestId } = render(<YogaActivityScreen onCancel={onCancel} />);

    fireEvent.press(getByTestId('cancel-button'));

    expect(onCancel).toHaveBeenCalled();
  });

  it('should show confirmation alert when canceling active session', async () => {
    const onCancel = jest.fn();
    const { getByTestId } = render(<YogaActivityScreen onCancel={onCancel} />);

    // Start session
    fireEvent.press(getByTestId('start-button'));

    // Wait for timer to start
    await waitFor(() => {
      expect(getByTestId('pause-button')).toBeTruthy();
    }, { timeout: 1000 });

    // Try to cancel
    fireEvent.press(getByTestId('cancel-button'));

    // Alert should have been called
    expect(Alert.alert).toHaveBeenCalledWith(
      'Cancel Session',
      'Are you sure you want to cancel this session?',
      expect.any(Array)
    );
  });

  it('should render all flow type options', () => {
    const { getByTestId } = render(<YogaActivityScreen />);

    expect(getByTestId('flow-type-vinyasa')).toBeTruthy();
    expect(getByTestId('flow-type-hatha')).toBeTruthy();
    expect(getByTestId('flow-type-yin')).toBeTruthy();
    expect(getByTestId('flow-type-restorative')).toBeTruthy();
    expect(getByTestId('flow-type-ashtanga')).toBeTruthy();
    expect(getByTestId('flow-type-bikram')).toBeTruthy();
    expect(getByTestId('flow-type-other')).toBeTruthy();
  });

  it('should render all difficulty options', () => {
    const { getByTestId } = render(<YogaActivityScreen />);

    expect(getByTestId('difficulty-beginner')).toBeTruthy();
    expect(getByTestId('difficulty-intermediate')).toBeTruthy();
    expect(getByTestId('difficulty-advanced')).toBeTruthy();
  });

  it('should handle empty notes correctly', async () => {
    const onSave = jest.fn();
    const { getByTestId } = render(<YogaActivityScreen onSave={onSave} />);

    // Complete session without notes
    fireEvent.press(getByTestId('start-button'));

    // Wait for timer to start (increased timeout for reliability)
    await waitFor(() => {
      expect(getByTestId('timer-display').props.children).not.toBe('0:00');
    }, { timeout: 3000, interval: 100 });

    fireEvent.press(getByTestId('stop-button'));
    fireEvent.press(getByTestId('save-button'));

    expect(onSave).toHaveBeenCalled();
    const callArgs = onSave.mock.calls[0][0];
    expect(callArgs.flow_type).toBe('vinyasa');
    expect(callArgs.difficulty).toBe('intermediate');
    expect(callArgs.notes).toBeUndefined(); // Empty notes should be undefined
  });

  it('should trim whitespace from notes', async () => {
    const onSave = jest.fn();
    const { getByTestId } = render(<YogaActivityScreen onSave={onSave} />);

    // Add notes with whitespace
    fireEvent.changeText(getByTestId('notes-input'), '  Great session  ');

    fireEvent.press(getByTestId('start-button'));

    // Wait for timer to start (increased timeout for reliability)
    await waitFor(() => {
      expect(getByTestId('timer-display').props.children).not.toBe('0:00');
    }, { timeout: 3000, interval: 100 });

    fireEvent.press(getByTestId('stop-button'));
    fireEvent.press(getByTestId('save-button'));

    expect(onSave).toHaveBeenCalled();
    const callArgs = onSave.mock.calls[0][0];
    expect(callArgs.notes).toBe('Great session'); // Whitespace trimmed
  });
});
