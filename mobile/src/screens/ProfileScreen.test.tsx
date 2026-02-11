import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import ProfileScreen from './ProfileScreen';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';

jest.mock('../contexts/AuthContext');
jest.mock('../utils/api');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockApi = api as jest.Mocked<typeof api>;

describe('ProfileScreen', () => {
  const mockUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    photo: null,
    bio: 'Test bio',
    preferred_sports: [],
    created_at: '2024-01-01T00:00:00.000Z',
  };

  const mockLogout = jest.fn();
  const mockRefreshUser = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      refreshUser: mockRefreshUser,
    });
    jest.spyOn(Alert, 'alert').mockImplementation();
  });

  it('should render user profile', () => {
    const { getByTestId, getByText } = render(<ProfileScreen />);

    expect(getByText('Test User')).toBeTruthy();
    expect(getByText('test@example.com')).toBeTruthy();
    expect(getByTestId('name-display')).toBeTruthy();
    expect(getByTestId('bio-display')).toBeTruthy();
  });

  it('should enter edit mode when edit button is pressed', () => {
    const { getByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByTestId('edit-button'));

    expect(getByTestId('name-input')).toBeTruthy();
    expect(getByTestId('bio-input')).toBeTruthy();
    expect(getByTestId('save-button')).toBeTruthy();
    expect(getByTestId('cancel-button')).toBeTruthy();
  });

  it('should save profile changes', async () => {
    mockApi.users.updateProfile.mockResolvedValue({ ...mockUser, name: 'Updated Name' });
    mockRefreshUser.mockResolvedValue(undefined);
    const { getByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByTestId('edit-button'));
    fireEvent.changeText(getByTestId('name-input'), 'Updated Name');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(mockApi.users.updateProfile).toHaveBeenCalledWith(1, {
        name: 'Updated Name',
        bio: 'Test bio',
      });
      expect(mockRefreshUser).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Success', 'Profile updated successfully');
    });
  });

  it('should cancel editing', () => {
    const { getByTestId, queryByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByTestId('edit-button'));
    fireEvent.changeText(getByTestId('name-input'), 'Changed Name');
    fireEvent.press(getByTestId('cancel-button'));

    expect(queryByTestId('name-input')).toBeNull();
    expect(getByTestId('edit-button')).toBeTruthy();
  });

  it('should show error when update fails', async () => {
    mockApi.users.updateProfile.mockRejectedValue(new Error('Update failed'));
    const { getByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByTestId('edit-button'));
    fireEvent.changeText(getByTestId('name-input'), 'Updated Name');
    fireEvent.press(getByTestId('save-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Update failed');
    });
  });

  it('should show logout confirmation', () => {
    const { getByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByTestId('logout-button'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Logout',
      'Are you sure you want to logout?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Logout' }),
      ]),
    );
  });

  it('should show loading when user is null', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      login: jest.fn(),
      register: jest.fn(),
      logout: mockLogout,
      refreshUser: mockRefreshUser,
    });

    const { queryByTestId } = render(<ProfileScreen />);

    expect(queryByTestId('edit-button')).toBeNull();
  });
});
