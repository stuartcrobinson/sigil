import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { FollowersScreen } from './FollowersScreen';
import * as socialService from '../services/socialService';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../services/socialService');
jest.mock('../contexts/AuthContext');

describe('FollowersScreen', () => {
  const mockUser = { id: 1, email: 'test@test.com', name: 'Test User' };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
  });

  it('renders loading indicator initially', () => {
    (socialService.getFollowers as jest.Mock).mockImplementation(
      () => new Promise(() => {})
    );

    const { getByTestId } = render(<FollowersScreen />);
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('displays followers list', async () => {
    const mockFollowers = [
      {
        id: 2,
        name: 'Alice Smith',
        email: 'alice@test.com',
        bio: 'Runner',
        photo_url: null,
        preferred_sports: ['running'],
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

    (socialService.getFollowers as jest.Mock).mockResolvedValue(mockFollowers);

    const { getByText, getByTestId } = render(<FollowersScreen />);

    await waitFor(() => {
      expect(getByText('Alice Smith')).toBeTruthy();
      expect(getByText('alice@test.com')).toBeTruthy();
      expect(getByText('Runner')).toBeTruthy();
      expect(getByText('running')).toBeTruthy();

      expect(getByText('Bob Jones')).toBeTruthy();
      expect(getByText('bob@test.com')).toBeTruthy();

      expect(getByTestId('follower-2')).toBeTruthy();
      expect(getByTestId('follower-3')).toBeTruthy();
    });
  });

  it('shows empty message when no followers', async () => {
    (socialService.getFollowers as jest.Mock).mockResolvedValue([]);

    const { getByTestId } = render(<FollowersScreen />);

    await waitFor(() => {
      expect(getByTestId('empty-message')).toBeTruthy();
    });
  });

  it('displays error message when loading fails', async () => {
    (socialService.getFollowers as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { getByText, getByTestId } = render(<FollowersScreen />);

    await waitFor(() => {
      expect(getByTestId('error-message')).toBeTruthy();
      expect(getByText('Network error')).toBeTruthy();
      expect(getByTestId('retry-button')).toBeTruthy();
    });
  });

  it('retries loading on retry button press', async () => {
    (socialService.getFollowers as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([]);

    const { getByTestId, queryByTestId } = render(<FollowersScreen />);

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

  it('calls getFollowers with correct user ID', async () => {
    (socialService.getFollowers as jest.Mock).mockResolvedValue([]);

    render(<FollowersScreen />);

    await waitFor(() => {
      expect(socialService.getFollowers).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
