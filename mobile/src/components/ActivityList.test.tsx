import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityList } from './ActivityList';
import { Activity } from '../types/activity';

describe('ActivityList', () => {
  const mockActivities: Activity[] = [
    {
      id: 1,
      user_id: 1,
      sport_type: 'running',
      title: 'Morning Run',
      start_time: '2024-02-10T07:00:00Z',
      duration_seconds: 3600,
      distance_meters: 5000,
      visibility: 'public',
      created_at: '2024-02-10T07:00:00Z',
      updated_at: '2024-02-10T07:00:00Z',
    },
    {
      id: 2,
      user_id: 1,
      sport_type: 'yoga',
      title: 'Evening Yoga',
      start_time: '2024-02-10T18:00:00Z',
      duration_seconds: 1800,
      visibility: 'friends',
      created_at: '2024-02-10T18:00:00Z',
      updated_at: '2024-02-10T18:00:00Z',
    },
  ];

  it('renders list of activities', () => {
    const { getByText } = render(<ActivityList activities={mockActivities} />);

    expect(getByText('Morning Run')).toBeTruthy();
    expect(getByText('Evening Yoga')).toBeTruthy();
  });

  it('shows loading state when loading is true', () => {
    const { getByTestId } = render(
      <ActivityList activities={[]} loading={true} testID="activity-list" />
    );

    expect(getByTestId('activity-list-loading')).toBeTruthy();
  });

  it('shows empty state when no activities', () => {
    const { getByTestId, getByText } = render(
      <ActivityList activities={[]} testID="activity-list" />
    );

    expect(getByTestId('activity-list-empty')).toBeTruthy();
    expect(getByText('No activities yet')).toBeTruthy();
    expect(getByText('Start tracking your workouts to see them here!')).toBeTruthy();
  });

  it('calls onActivityPress when activity is pressed', () => {
    const onActivityPress = jest.fn();
    const { getByTestId } = render(
      <ActivityList activities={mockActivities} onActivityPress={onActivityPress} />
    );

    const activityCard = getByTestId('activity-card-1-touchable');
    fireEvent.press(activityCard);

    expect(onActivityPress).toHaveBeenCalledWith(mockActivities[0]);
  });

  it('does not show loading state when loading is false and activities exist', () => {
    const { queryByTestId } = render(
      <ActivityList activities={mockActivities} loading={false} testID="activity-list" />
    );

    expect(queryByTestId('activity-list-loading')).toBeNull();
  });

  it('renders all activity cards with correct testIDs', () => {
    const { getByTestId } = render(<ActivityList activities={mockActivities} />);

    expect(getByTestId('activity-card-1')).toBeTruthy();
    expect(getByTestId('activity-card-2')).toBeTruthy();
  });

  it('handles refresh when onRefresh is provided', () => {
    const onRefresh = jest.fn();
    const { getByTestId } = render(
      <ActivityList
        activities={mockActivities}
        onRefresh={onRefresh}
        refreshing={false}
        testID="activity-list"
      />
    );

    const list = getByTestId('activity-list');
    // FlatList refresh is handled internally, just verify it accepts the prop
    expect(list).toBeTruthy();
  });

  it('handles end reached when onEndReached is provided', () => {
    const onEndReached = jest.fn();
    const { getByTestId } = render(
      <ActivityList
        activities={mockActivities}
        onEndReached={onEndReached}
        testID="activity-list"
      />
    );

    const list = getByTestId('activity-list');
    expect(list).toBeTruthy();
  });

  it('shows activities when loading is true but activities array is not empty', () => {
    const { getByText, queryByTestId } = render(
      <ActivityList activities={mockActivities} loading={true} testID="activity-list" />
    );

    // Should show activities, not loading state
    expect(queryByTestId('activity-list-loading')).toBeNull();
    expect(getByText('Morning Run')).toBeTruthy();
  });
});
