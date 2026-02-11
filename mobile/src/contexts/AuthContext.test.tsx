import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from './AuthContext';
import { api } from '../utils/api';
import { storage } from '../utils/storage';

jest.mock('../utils/api');
jest.mock('../utils/storage');

const mockApi = api as jest.Mocked<typeof api>;
const mockStorage = storage as jest.Mocked<typeof storage>;

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getToken.mockResolvedValue(null);
  });

  it('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const consoleError = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleError.mockRestore();
  });

  it('should initialize with no user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should load user from stored token on mount', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      photo: null,
      bio: null,
      preferred_sports: [],
      created_at: '2024-01-01T00:00:00.000Z',
    };

    mockStorage.getToken.mockResolvedValue('existing-token');
    mockApi.auth.me.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle login successfully', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      photo: null,
      bio: null,
      preferred_sports: [],
      created_at: '2024-01-01T00:00:00.000Z',
    };

    mockApi.auth.login.mockResolvedValue({
      user: mockUser,
      token: 'new-token',
    });
    mockStorage.setToken.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.login({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    expect(mockStorage.setToken).toHaveBeenCalledWith('new-token');
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle register successfully', async () => {
    const mockUser = {
      id: 1,
      email: 'new@example.com',
      name: 'New User',
      photo: null,
      bio: null,
      preferred_sports: [],
      created_at: '2024-01-01T00:00:00.000Z',
    };

    mockApi.auth.register.mockResolvedValue({
      user: mockUser,
      token: 'new-token',
    });
    mockStorage.setToken.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });
    });

    expect(mockStorage.setToken).toHaveBeenCalledWith('new-token');
    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle logout', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      photo: null,
      bio: null,
      preferred_sports: [],
      created_at: '2024-01-01T00:00:00.000Z',
    };

    mockStorage.getToken.mockResolvedValue('existing-token');
    mockApi.auth.me.mockResolvedValue(mockUser);
    mockStorage.removeToken.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    await act(async () => {
      await result.current.logout();
    });

    expect(mockStorage.removeToken).toHaveBeenCalled();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should handle refreshUser successfully', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Updated User',
      photo: null,
      bio: null,
      preferred_sports: [],
      created_at: '2024-01-01T00:00:00.000Z',
    };

    mockStorage.getToken.mockResolvedValue('existing-token');
    mockApi.auth.me.mockResolvedValue(mockUser);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Update mock to return different user
    const updatedUser = { ...mockUser, name: 'Refreshed User' };
    mockApi.auth.me.mockResolvedValue(updatedUser);

    await act(async () => {
      await result.current.refreshUser();
    });

    expect(result.current.user).toEqual(updatedUser);
  });

  it('should logout on refreshUser failure', async () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      name: 'Test User',
      photo: null,
      bio: null,
      preferred_sports: [],
      created_at: '2024-01-01T00:00:00.000Z',
    };

    mockStorage.getToken.mockResolvedValue('existing-token');
    mockApi.auth.me.mockResolvedValue(mockUser);
    mockStorage.removeToken.mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(result.current.user).toEqual(mockUser);
    });

    // Make refresh fail
    mockApi.auth.me.mockRejectedValue(new Error('Unauthorized'));

    await act(async () => {
      await expect(result.current.refreshUser()).rejects.toThrow();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });
});
