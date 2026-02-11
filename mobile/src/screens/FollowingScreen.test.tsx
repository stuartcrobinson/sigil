import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { FollowingScreen } from './FollowingScreen';
import * as socialService from '../services/socialService';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../services/socialService');
jest.mock('../contexts/AuthContext');

describe('FollowingScreen', () => {
  const mockUser = { id: 1, email: 'test@test.com', name: 'Test User' };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
  });

  it('renders loading indicator initially', () => {
    (socialService.getFollowing as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    const { getByTestId } = render(<FollowingScreen />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('displays following list', async () => {
    const mockFollowing = [
      {
        id: 2,
        name: 'Alice Smith',
        email: 'alice@test.com',
        bio: 'Runner',
        photo_url: null,
        preferred_sports: ['running', 'yoga'],
        followed_at: '2024-01-01',
      },
      {
        id: 3,
        name: 'Bob Jones',
        email: 'bob@test.com',
        bio: null,
        photo_url: null,
        preferred_sports: null,
        followed_at: '2024-01-02',
      },
    ];

    (socialService.getFollowing as jest.Mock).mockResolvedValue(mockFollowing);

    const { getByText, getByTestId } = render(<FollowingScreen />);

    await waitFor(() => {
      expect(getByText('Alice Smith')).toBeTruthy();
      expect(getByText('alice@test.com')).toBeTruthy();
      expect(getByText('Runner')).toBeTruthy();
      expect(getByText('running, yoga')).toBeTruthy();

      expect(getByText('Bob Jones')).toBeTruthy();
      expect(getByText('bob@test.com')).toBeTruthy();

      expect(getByTestId('following-2')).toBeTruthy();
      expect(getByTestId('following-3')).toBeTruthy();
    });
  });

  it('shows empty message when not following anyone', async () => {
    (socialService.getFollowing as jest.Mock).mockResolvedValue([]);

    const { getByTestId } = render(<FollowingScreen />);

    await waitFor(() => {
      expect(getByTestId('empty-message')).toBeTruthy();
    });
  });

  it('displays error message when loading fails', async () => {
    (socialService.getFollowing as jest.Mock).mockRejectedValue(
      new Error('Failed to load')
    );

    const { getByText, getByTestId } = render(<FollowingScreen />);

    await waitFor(() => {
      expect(getByTestId('error-message')).toBeTruthy();
      expect(getByText('Failed to load')).toBeTruthy();
      expect(getByTestId('retry-button')).toBeTruthy();
    });
  });

  it('retries loading on retry button press', async () => {
    (socialService.getFollowing as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([]);

    const { getByTestId, queryByTestId } = render(<FollowingScreen />);

    await waitFor(() => {
      expect(getByTestId('error-message')).toBeTruthy();
    });

    const retryButton = getByTestId('retry-button');
    fireEvent.press(retryButton);

    await waitFor(() => {
      expect(queryByTestId('error-message')).toBeNull();
      expect(getByTestId('empty-message')).toBeTruthy();
    });
  });

  it('calls getFollowing with correct user ID', async () => {
    (socialService.getFollowing as jest.Mock).mockResolvedValue([]);

    render(<FollowingScreen />);

    await waitFor(() => {
      expect(socialService.getFollowing).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
