import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from './HomeScreen';
import * as activityService from '../services/activityService';
import * as interactionService from '../services/interactionService';

jest.mock('../services/activityService');
jest.mock('../services/interactionService');

const mockActivityService = activityService as jest.Mocked<typeof activityService>;
const mockInteractionService = interactionService as jest.Mocked<typeof interactionService>;

const mockActivities = [
  {
    id: 1,
    user_id: 1,
    sport_type: 'running' as const,
    title: 'Morning Run',
    description: 'Great run!',
    start_time: '2024-02-10T07:00:00Z',
    duration_seconds: 1800,
    distance_meters: 5000,
    visibility: 'public' as const,
    created_at: '2024-02-10T07:00:00Z',
    updated_at: '2024-02-10T07:00:00Z',
    user_name: 'Alice',
    like_count: 3,
    high_five_count: 1,
    comment_count: 2,
    photo_count: 1,
  },
  {
    id: 2,
    user_id: 2,
    sport_type: 'yoga' as const,
    title: 'Evening Yoga',
    start_time: '2024-02-10T18:00:00Z',
    duration_seconds: 3600,
    visibility: 'public' as const,
    created_at: '2024-02-10T18:00:00Z',
    updated_at: '2024-02-10T18:00:00Z',
    user_name: 'Bob',
    like_count: 0,
    high_five_count: 0,
    comment_count: 0,
    photo_count: 0,
  },
];

describe('HomeScreen', () => {
  const mockNavigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockActivityService.getActivities.mockResolvedValue({
      activities: mockActivities,
      pagination: { limit: 50, offset: 0, total: 2 },
    });
  });

  it('shows loading state initially', () => {
    // Don't resolve the promise yet
    mockActivityService.getActivities.mockReturnValue(new Promise(() => {}));

    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);
    expect(getByTestId('home-loading')).toBeTruthy();
  });

  it('renders activity feed after loading', async () => {
    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByTestId('home-screen')).toBeTruthy();
      expect(getByTestId('activity-feed')).toBeTruthy();
    });
  });

  it('displays activity cards with correct data', async () => {
    const { getByText } = render(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Morning Run')).toBeTruthy();
      expect(getByText('Evening Yoga')).toBeTruthy();
    });
  });

  it('shows user names on activity cards', async () => {
    const { getByText } = render(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByText('Alice')).toBeTruthy();
      expect(getByText('Bob')).toBeTruthy();
    });
  });

  it('shows empty state when no activities', async () => {
    mockActivityService.getActivities.mockResolvedValue({
      activities: [],
      pagination: { limit: 50, offset: 0, total: 0 },
    });

    const { getByTestId, getByText } = render(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByTestId('empty-feed')).toBeTruthy();
      expect(getByText('No Activities Yet')).toBeTruthy();
    });
  });

  it('shows start activity FAB', async () => {
    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByTestId('start-activity-fab')).toBeTruthy();
    });
  });

  it('navigates to RunningActivity when FAB is pressed', async () => {
    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      fireEvent.press(getByTestId('start-activity-fab'));
      expect(mockNavigation.navigate).toHaveBeenCalledWith('RunningActivity');
    });
  });

  it('displays social counts on activity cards with correct values', async () => {
    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      const likeCount = getByTestId('activity-card-1-like-count');
      // Verify actual count value, not just existence
      expect(likeCount.props.children).toBe(3);
    });
  });

  it('handles like interaction and calls API', async () => {
    mockInteractionService.likeActivity.mockResolvedValue();

    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByTestId('activity-card-1-like-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('activity-card-1-like-button'));

    // Verify the API was called with correct arguments
    await waitFor(() => {
      expect(mockInteractionService.likeActivity).toHaveBeenCalledWith(1, 'like');
    });
  });

  it('handles high-five interaction and calls API', async () => {
    mockInteractionService.likeActivity.mockResolvedValue();

    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByTestId('activity-card-1-highfive-button')).toBeTruthy();
    });

    fireEvent.press(getByTestId('activity-card-1-highfive-button'));

    // Verify the API was called with correct arguments
    await waitFor(() => {
      expect(mockInteractionService.likeActivity).toHaveBeenCalledWith(1, 'high_five');
    });
  });

  it('calls getActivities on mount', async () => {
    render(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(mockActivityService.getActivities).toHaveBeenCalledWith({ limit: 50 });
    });
  });

  it('handles API errors gracefully', async () => {
    mockActivityService.getActivities.mockRejectedValue(new Error('Network error'));

    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);

    // Should show empty state, not crash
    await waitFor(() => {
      expect(getByTestId('empty-feed')).toBeTruthy();
    });
  });

  it('shows photo indicator when activity has photos', async () => {
    const { getByTestId } = render(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(getByTestId('activity-card-1-photo-indicator')).toBeTruthy();
    });
  });

  it('does not show photo indicator when activity has no photos', async () => {
    const { queryByTestId } = render(<HomeScreen navigation={mockNavigation} />);

    await waitFor(() => {
      expect(queryByTestId('activity-card-2-photo-indicator')).toBeNull();
    });
  });

  describe('CommentSheet integration', () => {
    beforeEach(() => {
      mockInteractionService.getComments.mockResolvedValue({ comments: [], count: 0 });
    });

    it('opens CommentSheet when comment button is pressed', async () => {
      const { getByTestId } = render(<HomeScreen navigation={mockNavigation} currentUserId={1} />);

      await waitFor(() => {
        expect(getByTestId('activity-card-1-comment-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('activity-card-1-comment-button'));

      await waitFor(() => {
        expect(getByTestId('home-comment-sheet')).toBeTruthy();
      });
    });

    it('closes CommentSheet when close button is pressed', async () => {
      const { getByTestId, queryByTestId } = render(
        <HomeScreen navigation={mockNavigation} currentUserId={1} />
      );

      await waitFor(() => {
        expect(getByTestId('activity-card-1-comment-button')).toBeTruthy();
      });

      // Open comment sheet
      fireEvent.press(getByTestId('activity-card-1-comment-button'));
      await waitFor(() => {
        expect(getByTestId('home-comment-sheet-close')).toBeTruthy();
      });

      // Close it
      fireEvent.press(getByTestId('home-comment-sheet-close'));
      await waitFor(() => {
        expect(queryByTestId('home-comment-sheet')).toBeNull();
      });
    });

    it('does not navigate when comment button opens sheet', async () => {
      const { getByTestId } = render(<HomeScreen navigation={mockNavigation} currentUserId={1} />);

      await waitFor(() => {
        expect(getByTestId('activity-card-1-comment-button')).toBeTruthy();
      });

      fireEvent.press(getByTestId('activity-card-1-comment-button'));

      // Should NOT navigate — should open sheet instead
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });
});
