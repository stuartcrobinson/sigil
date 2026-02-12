import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CelebrationScreen } from './CelebrationScreen';

describe('CelebrationScreen', () => {
  const mockOnDone = jest.fn();
  const defaultProps = {
    sportType: 'running',
    durationSeconds: 1800,
    distanceMeters: 5000,
    paceDisplay: '6:00/km',
    newAchievements: [],
    newPRs: [],
    onDone: mockOnDone,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render basic celebration without PRs or achievements', () => {
    const { getByTestId } = render(<CelebrationScreen {...defaultProps} />);

    expect(getByTestId('celebration-screen')).toBeTruthy();
    expect(getByTestId('celebration-title').props.children).toBe('Activity Saved!');
    expect(getByTestId('celebration-emoji').props.children).toBe('✅');
  });

  it('should show excitement when there are new achievements or PRs', () => {
    const { getByTestId } = render(
      <CelebrationScreen
        {...defaultProps}
        newAchievements={[{ achievement_type: 'first_5k', achievement_name: '5K Finisher', is_new: true }]}
      />
    );

    expect(getByTestId('celebration-title').props.children).toBe('Amazing Work!');
    expect(getByTestId('celebration-emoji').props.children).toBe('🎉');
  });

  it('should display activity stats', () => {
    const { getByTestId } = render(<CelebrationScreen {...defaultProps} />);

    const statsCard = getByTestId('celebration-stats');
    expect(statsCard).toBeTruthy();
  });

  it('should display new PRs', () => {
    const { getByTestId } = render(
      <CelebrationScreen
        {...defaultProps}
        newPRs={[
          { record_type: '5k', new_time: 1500, old_time: 1600, is_new: false },
          { record_type: 'fastest_pace', new_time: 300, old_time: null, is_new: true },
        ]}
      />
    );

    expect(getByTestId('new-prs-section')).toBeTruthy();
    expect(getByTestId('pr-5k')).toBeTruthy();
    expect(getByTestId('pr-fastest_pace')).toBeTruthy();
  });

  it('should show improvement for existing PRs', () => {
    const { getByTestId } = render(
      <CelebrationScreen
        {...defaultProps}
        newPRs={[{ record_type: '5k', new_time: 1500, old_time: 1600, is_new: false }]}
      />
    );

    expect(getByTestId('pr-improvement-5k')).toBeTruthy();
  });

  it('should show "First time!" for new PRs', () => {
    const { getByTestId, getByText } = render(
      <CelebrationScreen
        {...defaultProps}
        newPRs={[{ record_type: '5k', new_time: 1500, old_time: null, is_new: true }]}
      />
    );

    expect(getByText('First time!')).toBeTruthy();
  });

  it('should display new achievements with badges', () => {
    const { getByTestId } = render(
      <CelebrationScreen
        {...defaultProps}
        newAchievements={[
          { achievement_type: 'first_activity', achievement_name: 'First Steps', is_new: true },
          { achievement_type: 'first_run', achievement_name: 'Runner', is_new: true },
        ]}
      />
    );

    expect(getByTestId('new-achievements-section')).toBeTruthy();
    expect(getByTestId('achievement-first_activity')).toBeTruthy();
    expect(getByTestId('achievement-first_run')).toBeTruthy();
  });

  it('should not show PRs section when empty', () => {
    const { queryByTestId } = render(<CelebrationScreen {...defaultProps} />);

    expect(queryByTestId('new-prs-section')).toBeNull();
  });

  it('should not show achievements section when empty', () => {
    const { queryByTestId } = render(<CelebrationScreen {...defaultProps} />);

    expect(queryByTestId('new-achievements-section')).toBeNull();
  });

  it('should call onDone when Done button pressed', () => {
    const { getByTestId } = render(<CelebrationScreen {...defaultProps} />);

    fireEvent.press(getByTestId('celebration-done-button'));

    expect(mockOnDone).toHaveBeenCalledTimes(1);
  });

  it('should format duration correctly', () => {
    const { getByText } = render(
      <CelebrationScreen {...defaultProps} durationSeconds={3661} />
    );

    // 3661s = 1h 1m 1s → "1:01:01"
    expect(getByText('1:01:01')).toBeTruthy();
  });

  it('should format distance in km', () => {
    const { getByText } = render(
      <CelebrationScreen {...defaultProps} distanceMeters={10500} />
    );

    // 10500m → "10.50 km"
    expect(getByText('10.50 km')).toBeTruthy();
  });

  it('should format distance in meters when < 1km', () => {
    const { getByText } = render(
      <CelebrationScreen {...defaultProps} distanceMeters={750} />
    );

    // 750m → "750 m"
    expect(getByText('750 m')).toBeTruthy();
  });

  it('should display default props formatted values', () => {
    const { getByText } = render(<CelebrationScreen {...defaultProps} />);

    // 1800s = 30m 0s → "30:00"
    expect(getByText('30:00')).toBeTruthy();
    // 5000m → "5.00 km"
    expect(getByText('5.00 km')).toBeTruthy();
    // pace passed as prop
    expect(getByText('6:00/km')).toBeTruthy();
  });

  it('should handle both PRs and achievements together', () => {
    const { getByTestId } = render(
      <CelebrationScreen
        {...defaultProps}
        newAchievements={[{ achievement_type: 'first_5k', achievement_name: '5K Finisher', is_new: true }]}
        newPRs={[{ record_type: '5k', new_time: 1500, old_time: null, is_new: true }]}
      />
    );

    expect(getByTestId('new-prs-section')).toBeTruthy();
    expect(getByTestId('new-achievements-section')).toBeTruthy();
    expect(getByTestId('celebration-title').props.children).toBe('Amazing Work!');
  });
});
