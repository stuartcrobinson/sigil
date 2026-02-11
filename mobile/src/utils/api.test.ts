import { api, ApiError } from './api';
import { storage } from './storage';

jest.mock('./storage');

const mockStorage = storage as jest.Mocked<typeof storage>;
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.getToken.mockResolvedValue(null);
  });

  describe('auth.login', () => {
    it('should login successfully', async () => {
      const mockResponse = {
        user: { id: 1, email: 'test@example.com', name: 'Test User' },
        token: 'test-token',
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.auth.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('should throw ApiError on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: 'Invalid credentials' }),
      });

      await expect(
        api.auth.login({ email: 'test@example.com', password: 'wrong' }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('auth.register', () => {
    it('should register successfully', async () => {
      const mockResponse = {
        user: { id: 1, email: 'new@example.com', name: 'New User' },
        token: 'new-token',
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await api.auth.register({
        email: 'new@example.com',
        password: 'password123',
        name: 'New User',
      });

      expect(result).toEqual(mockResponse);
    });
  });

  describe('auth.me', () => {
    it('should fetch current user with token', async () => {
      mockStorage.getToken.mockResolvedValue('test-token');
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const result = await api.auth.me();

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/me',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        }),
      );
    });
  });

  describe('users.getProfile', () => {
    it('should fetch user profile', async () => {
      const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const result = await api.users.getProfile(1);

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/users/1',
        expect.any(Object),
      );
    });
  });

  describe('users.updateProfile', () => {
    it('should update user profile', async () => {
      mockStorage.getToken.mockResolvedValue('test-token');
      const mockUser = { id: 1, email: 'test@example.com', name: 'Updated Name' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockUser,
      });

      const result = await api.users.updateProfile(1, { name: 'Updated Name' });

      expect(result).toEqual(mockUser);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/users/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ name: 'Updated Name' }),
        }),
      );
    });
  });
});
