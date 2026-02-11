import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { SearchScreen } from './SearchScreen';
import * as socialService from '../services/socialService';

jest.mock('../services/socialService');

describe('SearchScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input and button', () => {
    const { getByTestId, getByText } = render(<SearchScreen />);

    expect(getByTestId('search-input')).toBeTruthy();
    expect(getByTestId('search-button')).toBeTruthy();
    expect(getByText('Search')).toBeTruthy();
  });

  it('shows initial prompt when no search performed', () => {
    const { getByTestId } = render(<SearchScreen />);

    expect(getByTestId('search-prompt')).toBeTruthy();
  });

  it('performs search when button pressed', async () => {
    const mockUsers = [
      {
        id: 1,
        name: 'Alice Smith',
        email: 'alice@test.com',
        bio: 'Runner',
        photo_url: null,
        preferred_sports: ['running'],
      },
    ];

    (socialService.searchUsers as jest.Mock).mockResolvedValue(mockUsers);

    const { getByTestId, getByText } = render(<SearchScreen />);

    const input = getByTestId('search-input');
    const button = getByTestId('search-button');

    fireEvent.changeText(input, 'Alice');
    fireEvent.press(button);

    await waitFor(() => {
      expect(socialService.searchUsers).toHaveBeenCalledWith('Alice');
      expect(getByText('Alice Smith')).toBeTruthy();
      expect(getByText('alice@test.com')).toBeTruthy();
      expect(getByText('Runner')).toBeTruthy();
      expect(getByText('running')).toBeTruthy();
    });
  });

  it('performs search when pressing enter on input', async () => {
    const mockUsers = [
      {
        id: 2,
        name: 'Bob Jones',
        email: 'bob@test.com',
        bio: null,
        photo_url: null,
        preferred_sports: null,
      },
    ];

    (socialService.searchUsers as jest.Mock).mockResolvedValue(mockUsers);

    const { getByTestId, getByText } = render(<SearchScreen />);

    const input = getByTestId('search-input');

    fireEvent.changeText(input, 'Bob');
    fireEvent(input, 'submitEditing');

    await waitFor(() => {
      expect(socialService.searchUsers).toHaveBeenCalledWith('Bob');
      expect(getByText('Bob Jones')).toBeTruthy();
      expect(getByText('bob@test.com')).toBeTruthy();
    });
  });

  it('shows loading indicator while searching', async () => {
    (socialService.searchUsers as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
    );

    const { getByTestId } = render(<SearchScreen />);

    const input = getByTestId('search-input');
    const button = getByTestId('search-button');

    fireEvent.changeText(input, 'test');
    fireEvent.press(button);

    expect(getByTestId('loading-indicator')).toBeTruthy();

    await waitFor(() => {
      expect(socialService.searchUsers).toHaveBeenCalled();
    });
  });

  it('displays error message when search fails', async () => {
    (socialService.searchUsers as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { getByTestId, getByText } = render(<SearchScreen />);

    const input = getByTestId('search-input');
    const button = getByTestId('search-button');

    fireEvent.changeText(input, 'test');
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByTestId('error-message')).toBeTruthy();
      expect(getByText('Network error')).toBeTruthy();
    });
  });

  it('shows error for empty query', async () => {
    const { getByTestId, getByText } = render(<SearchScreen />);

    const button = getByTestId('search-button');

    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('Please enter a search query')).toBeTruthy();
      expect(socialService.searchUsers).not.toHaveBeenCalled();
    });
  });

  it('shows empty results message when no users found', async () => {
    (socialService.searchUsers as jest.Mock).mockResolvedValue([]);

    const { getByTestId } = render(<SearchScreen />);

    const input = getByTestId('search-input');
    const button = getByTestId('search-button');

    fireEvent.changeText(input, 'nonexistent');
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByTestId('empty-results')).toBeTruthy();
    });
  });

  it('displays multiple search results', async () => {
    const mockUsers = [
      {
        id: 1,
        name: 'Alice Smith',
        email: 'alice@test.com',
        bio: null,
        photo_url: null,
        preferred_sports: null,
      },
      {
        id: 2,
        name: 'Alice Johnson',
        email: 'alice.j@test.com',
        bio: null,
        photo_url: null,
        preferred_sports: null,
      },
    ];

    (socialService.searchUsers as jest.Mock).mockResolvedValue(mockUsers);

    const { getByTestId, getByText } = render(<SearchScreen />);

    const input = getByTestId('search-input');
    const button = getByTestId('search-button');

    fireEvent.changeText(input, 'Alice');
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('Alice Smith')).toBeTruthy();
      expect(getByText('Alice Johnson')).toBeTruthy();
      expect(getByTestId('user-1')).toBeTruthy();
      expect(getByTestId('user-2')).toBeTruthy();
    });
  });

  it('updates results when performing new search', async () => {
    const mockUsers1 = [
      {
        id: 1,
        name: 'Alice Smith',
        email: 'alice@test.com',
        bio: null,
        photo_url: null,
        preferred_sports: null,
      },
    ];

    const mockUsers2 = [
      {
        id: 2,
        name: 'Bob Jones',
        email: 'bob@test.com',
        bio: null,
        photo_url: null,
        preferred_sports: null,
      },
    ];

    (socialService.searchUsers as jest.Mock)
      .mockResolvedValueOnce(mockUsers1)
      .mockResolvedValueOnce(mockUsers2);

    const { getByTestId, getByText, queryByText } = render(<SearchScreen />);

    const input = getByTestId('search-input');
    const button = getByTestId('search-button');

    // First search
    fireEvent.changeText(input, 'Alice');
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('Alice Smith')).toBeTruthy();
    });

    // Second search
    fireEvent.changeText(input, 'Bob');
    fireEvent.press(button);

    await waitFor(() => {
      expect(getByText('Bob Jones')).toBeTruthy();
      expect(queryByText('Alice Smith')).toBeNull();
    });
  });
});
