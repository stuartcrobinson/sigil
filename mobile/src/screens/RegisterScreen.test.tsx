import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import RegisterScreen from './RegisterScreen';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../contexts/AuthContext');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockNavigation = {
  navigate: jest.fn(),
};

describe('RegisterScreen', () => {
  const mockRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: jest.fn(),
      register: mockRegister,
      logout: jest.fn(),
      refreshUser: jest.fn(),
    });
    jest.spyOn(Alert, 'alert').mockImplementation();
  });

  it('should render registration form', () => {
    const { getByTestId, getByText } = render(<RegisterScreen navigation={mockNavigation} />);

    expect(getByText('Create Account')).toBeTruthy();
    expect(getByTestId('register-name-input')).toBeTruthy();
    expect(getByTestId('register-email-input')).toBeTruthy();
    expect(getByTestId('register-password-input')).toBeTruthy();
    expect(getByTestId('register-confirm-password-input')).toBeTruthy();
    expect(getByTestId('register-button')).toBeTruthy();
  });

  it('should show error when fields are empty', async () => {
    const { getByTestId } = render(<RegisterScreen navigation={mockNavigation} />);

    fireEvent.press(getByTestId('register-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should show error when passwords do not match', async () => {
    const { getByTestId } = render(<RegisterScreen navigation={mockNavigation} />);

    fireEvent.changeText(getByTestId('register-name-input'), 'Test User');
    fireEvent.changeText(getByTestId('register-email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('register-password-input'), 'password123');
    fireEvent.changeText(getByTestId('register-confirm-password-input'), 'password456');
    fireEvent.press(getByTestId('register-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Passwords do not match');
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should show error when password is too short', async () => {
    const { getByTestId } = render(<RegisterScreen navigation={mockNavigation} />);

    fireEvent.changeText(getByTestId('register-name-input'), 'Test User');
    fireEvent.changeText(getByTestId('register-email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('register-password-input'), 'pass');
    fireEvent.changeText(getByTestId('register-confirm-password-input'), 'pass');
    fireEvent.press(getByTestId('register-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Password must be at least 8 characters');
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('should call register when form is valid', async () => {
    mockRegister.mockResolvedValue(undefined);
    const { getByTestId } = render(<RegisterScreen navigation={mockNavigation} />);

    fireEvent.changeText(getByTestId('register-name-input'), 'Test User');
    fireEvent.changeText(getByTestId('register-email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('register-password-input'), 'password123');
    fireEvent.changeText(getByTestId('register-confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('register-button'));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('should show error when registration fails', async () => {
    mockRegister.mockRejectedValue(new Error('Email already in use'));
    const { getByTestId } = render(<RegisterScreen navigation={mockNavigation} />);

    fireEvent.changeText(getByTestId('register-name-input'), 'Test User');
    fireEvent.changeText(getByTestId('register-email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('register-password-input'), 'password123');
    fireEvent.changeText(getByTestId('register-confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('register-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Registration Failed', 'Email already in use');
    });
  });

  it('should navigate to login screen', () => {
    const { getByTestId } = render(<RegisterScreen navigation={mockNavigation} />);

    fireEvent.press(getByTestId('login-link'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Login');
  });
});
