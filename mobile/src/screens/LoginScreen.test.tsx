import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from './LoginScreen';
import { useAuth } from '../contexts/AuthContext';

jest.mock('../contexts/AuthContext');

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockNavigation = {
  navigate: jest.fn(),
};

describe('LoginScreen', () => {
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      login: mockLogin,
      register: jest.fn(),
      logout: jest.fn(),
      refreshUser: jest.fn(),
    });
    jest.spyOn(Alert, 'alert').mockImplementation();
  });

  it('should render login form', () => {
    const { getByTestId, getByText } = render(<LoginScreen navigation={mockNavigation} />);

    expect(getByText('Sigil')).toBeTruthy();
    expect(getByText('Free Fitness for Everyone')).toBeTruthy();
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('login-button')).toBeTruthy();
  });

  it('should show error when fields are empty', async () => {
    const { getByTestId } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('should call login when form is valid', async () => {
    mockLogin.mockResolvedValue(undefined);
    const { getByTestId } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('should show error when login fails', async () => {
    mockLogin.mockRejectedValue(new Error('Invalid credentials'));
    const { getByTestId } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'wrongpassword');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Login Failed', 'Invalid credentials');
    });
  });

  it('should navigate to register screen', () => {
    const { getByTestId } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.press(getByTestId('register-link'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Register');
  });
});
