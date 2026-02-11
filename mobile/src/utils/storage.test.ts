import AsyncStorage from '@react-native-async-storage/async-storage';
import { storage } from './storage';

jest.mock('@react-native-async-storage/async-storage');

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('storage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getToken', () => {
    it('should return token when it exists', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('test-token');
      const token = await storage.getToken();
      expect(token).toBe('test-token');
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@sigil:auth_token');
    });

    it('should return null when token does not exist', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);
      const token = await storage.getToken();
      expect(token).toBeNull();
    });

    it('should return null and log error on failure', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));
      const token = await storage.getToken();
      expect(token).toBeNull();
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('setToken', () => {
    it('should store token', async () => {
      mockAsyncStorage.setItem.mockResolvedValue(undefined);
      await storage.setToken('new-token');
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@sigil:auth_token', 'new-token');
    });

    it('should throw error on failure', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));
      await expect(storage.setToken('new-token')).rejects.toThrow('Storage error');
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });

  describe('removeToken', () => {
    it('should remove token', async () => {
      mockAsyncStorage.removeItem.mockResolvedValue(undefined);
      await storage.removeToken();
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@sigil:auth_token');
    });

    it('should throw error on failure', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));
      await expect(storage.removeToken()).rejects.toThrow('Storage error');
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });
  });
});
