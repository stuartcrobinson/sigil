import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ActivityCard } from './ActivityCard';
import { Activity } from '../types/activity';

describe('ActivityCard', () => {
  const mockActivity: Activity = {
    id: 1,
    user_id: 1,
    sport_type: 'running',
    title: 'Morning Run',
    description: 'Beautiful morning run in the park',
    start_time: '2024-02-10T07:00:00Z',
    end_time: '2024-02-10T08:00:00Z',
    duration_seconds: 3600,
    distance_meters: 5000,
    visibility: 'public',
    created_at: '2024-02-10T07:00:00Z',
    updated_at: '2024-02-10T07:00:00Z',
  };

  it('renders activity with all information', () => {
    const { getByText } = render(<ActivityCard activity={mockActivity} />);

    expect(getByText('Running')).toBeTruthy();
    expect(getByText('Morning Run')).toBeTruthy();
    expect(getByText('Beautiful morning run in the park')).toBeTruthy();
    expect(getByText('1h 0m')).toBeTruthy();
    expect(getByText('5.00 km')).toBeTruthy();
  });

  it('renders activity without optional fields', () => {
    const minimalActivity: Activity = {
      id: 2,
      user_id: 1,
      sport_type: 'yoga',
      start_time: '2024-02-10T09:00:00Z',
      visibility: 'private',
      created_at: '2024-02-10T09:00:00Z',
      updated_at: '2024-02-10T09:00:00Z',
    };

    const { getByText, queryByText } = render(<ActivityCard activity={minimalActivity} />);

    expect(getByText('Yoga')).toBeTruthy();
    expect(queryByText('Morning Run')).toBeNull();
    expect(queryByText('Beautiful morning run')).toBeNull();
  });

  it('calls onPress when card is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <ActivityCard activity={mockActivity} onPress={onPress} testID="activity-card" />
    );

    const touchable = getByTestId('activity-card-touchable');
    fireEvent.press(touchable);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not render as touchable when onPress is not provided', () => {
    const { queryByTestId } = render(<ActivityCard activity={mockActivity} testID="activity-card" />);

    expect(queryByTestId('activity-card-touchable')).toBeNull();
  });

  it('displays correct sport icon for different sports', () => {
    const activities: Activity[] = [
      { ...mockActivity, id: 1, sport_type: 'running' },
      { ...mockActivity, id: 2, sport_type: 'weightlifting' },
      { ...mockActivity, id: 3, sport_type: 'swimming' },
      { ...mockActivity, id: 4, sport_type: 'yoga' },
    ];

    activities.forEach((activity) => {
      const { getByText } = render(<ActivityCard activity={activity} />);
      expect(getByText(activity.sport_type.charAt(0).toUpperCase() + activity.sport_type.slice(1))).toBeTruthy();
    });
  });

  it('displays correct visibility icon', () => {
    const publicActivity: Activity = { ...mockActivity, visibility: 'public' };
    const friendsActivity: Activity = { ...mockActivity, visibility: 'friends' };
    const privateActivity: Activity = { ...mockActivity, visibility: 'private' };

    const { getByText: getPublicIcon } = render(<ActivityCard activity={publicActivity} />);
    expect(getPublicIcon('🌍')).toBeTruthy();

    const { getByText: getFriendsIcon } = render(<ActivityCard activity={friendsActivity} />);
    expect(getFriendsIcon('👥')).toBeTruthy();

    const { getByText: getPrivateIcon } = render(<ActivityCard activity={privateActivity} />);
    expect(getPrivateIcon('🔒')).toBeTruthy();
  });

  it('formats duration correctly for hours and minutes', () => {
    const activity = { ...mockActivity, duration_seconds: 3665 };
    const { getByText } = render(<ActivityCard activity={activity} />);
    expect(getByText('1h 1m')).toBeTruthy();
  });

  it('formats duration correctly for minutes only', () => {
    const activity = { ...mockActivity, duration_seconds: 125 };
    const { getByText } = render(<ActivityCard activity={activity} />);
    expect(getByText('2m 5s')).toBeTruthy();
  });

  it('formats duration correctly for seconds only', () => {
    const activity = { ...mockActivity, duration_seconds: 45 };
    const { getByText } = render(<ActivityCard activity={activity} />);
    expect(getByText('45s')).toBeTruthy();
  });

  it('formats distance in meters when less than 1km', () => {
    const activity = { ...mockActivity, distance_meters: 800 };
    const { getByText } = render(<ActivityCard activity={activity} />);
    expect(getByText('800 m')).toBeTruthy();
  });

  it('formats distance in kilometers when 1km or more', () => {
    const activity = { ...mockActivity, distance_meters: 5500 };
    const { getByText } = render(<ActivityCard activity={activity} />);
    expect(getByText('5.50 km')).toBeTruthy();
  });

  it('truncates long descriptions', () => {
    const longDescription = 'This is a very long description that should be truncated after a certain number of lines to prevent the card from becoming too tall and cluttering the feed.';
    const activity = { ...mockActivity, description: longDescription };
    const { getByText } = render(<ActivityCard activity={activity} />);

    const descriptionElement = getByText(longDescription);
    expect(descriptionElement.props.numberOfLines).toBe(2);
  });

  describe('Social Interactions', () => {
    const socialActivity: Activity = {
      ...mockActivity,
      like_count: 5,
      high_five_count: 3,
      comment_count: 7,
      photo_count: 2,
      user_name: 'Alice Runner',
    };

    it('displays social interaction bar', () => {
      const { getByTestId } = render(
        <ActivityCard activity={socialActivity} testID="card" />
      );
      expect(getByTestId('card-social-bar')).toBeTruthy();
    });

    it('displays like count from activity', () => {
      const { getByTestId } = render(
        <ActivityCard activity={socialActivity} testID="card" />
      );
      expect(getByTestId('card-like-count').props.children).toBe(5);
    });

    it('displays high-five count from activity', () => {
      const { getByTestId } = render(
        <ActivityCard activity={socialActivity} testID="card" />
      );
      expect(getByTestId('card-highfive-count').props.children).toBe(3);
    });

    it('displays comment count from activity', () => {
      const { getByTestId } = render(
        <ActivityCard activity={socialActivity} testID="card" />
      );
      expect(getByTestId('card-comment-count').props.children).toBe(7);
    });

    it('displays photo indicator when photos exist', () => {
      const { getByTestId } = render(
        <ActivityCard activity={socialActivity} testID="card" />
      );
      expect(getByTestId('card-photo-indicator')).toBeTruthy();
      expect(getByTestId('card-photo-count').props.children).toBe(2);
    });

    it('hides photo indicator when no photos', () => {
      const noPhotoActivity = { ...socialActivity, photo_count: 0 };
      const { queryByTestId } = render(
        <ActivityCard activity={noPhotoActivity} testID="card" />
      );
      expect(queryByTestId('card-photo-indicator')).toBeNull();
    });

    it('increments like count optimistically on press', () => {
      const onLike = jest.fn();
      const { getByTestId } = render(
        <ActivityCard activity={socialActivity} onLike={onLike} testID="card" />
      );

      expect(getByTestId('card-like-count').props.children).toBe(5);
      fireEvent.press(getByTestId('card-like-button'));
      expect(getByTestId('card-like-count').props.children).toBe(6);
      expect(onLike).toHaveBeenCalledWith(1);
    });

    it('decrements like count on second press (unlike)', () => {
      const onLike = jest.fn();
      const { getByTestId } = render(
        <ActivityCard activity={socialActivity} onLike={onLike} testID="card" />
      );

      fireEvent.press(getByTestId('card-like-button'));
      fireEvent.press(getByTestId('card-like-button'));
      expect(getByTestId('card-like-count').props.children).toBe(5);
      expect(onLike).toHaveBeenCalledTimes(2);
    });

    it('increments high-five count optimistically on press', () => {
      const onHighFive = jest.fn();
      const { getByTestId } = render(
        <ActivityCard activity={socialActivity} onHighFive={onHighFive} testID="card" />
      );

      fireEvent.press(getByTestId('card-highfive-button'));
      expect(getByTestId('card-highfive-count').props.children).toBe(4);
      expect(onHighFive).toHaveBeenCalledWith(1);
    });

    it('calls onComment with activity id', () => {
      const onComment = jest.fn();
      const { getByTestId } = render(
        <ActivityCard activity={socialActivity} onComment={onComment} testID="card" />
      );

      fireEvent.press(getByTestId('card-comment-button'));
      expect(onComment).toHaveBeenCalledWith(1);
    });

    it('shows user name when provided', () => {
      const { getByText } = render(
        <ActivityCard activity={socialActivity} testID="card" />
      );
      expect(getByText('Alice Runner')).toBeTruthy();
    });

    it('shows user avatar initial', () => {
      const { getByText } = render(
        <ActivityCard activity={socialActivity} testID="card" />
      );
      expect(getByText('A')).toBeTruthy();
    });

    it('hides user row when no user_name', () => {
      const { queryByTestId } = render(
        <ActivityCard activity={mockActivity} testID="card" />
      );
      expect(queryByTestId('card-user-name')).toBeNull();
    });

    it('defaults all counts to 0 when not provided', () => {
      const { getByTestId } = render(
        <ActivityCard activity={mockActivity} testID="card" />
      );
      expect(getByTestId('card-like-count').props.children).toBe(0);
      expect(getByTestId('card-highfive-count').props.children).toBe(0);
      expect(getByTestId('card-comment-count').props.children).toBe(0);
    });

    it('respects isLiked prop initial state', () => {
      const { getByTestId } = render(
        <ActivityCard activity={socialActivity} isLiked={true} testID="card" />
      );
      // When already liked, pressing unlikes (count goes from 5 to 4)
      fireEvent.press(getByTestId('card-like-button'));
      expect(getByTestId('card-like-count').props.children).toBe(4);
    });

    it('respects isHighFived prop initial state', () => {
      const { getByTestId } = render(
        <ActivityCard activity={socialActivity} isHighFived={true} testID="card" />
      );
      // When already high-fived, pressing un-high-fives (count goes from 3 to 2)
      fireEvent.press(getByTestId('card-highfive-button'));
      expect(getByTestId('card-highfive-count').props.children).toBe(2);
    });
  });
});
