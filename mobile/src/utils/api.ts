import { Platform } from 'react-native';
import { storage } from './storage';
import type { User, LoginRequest, RegisterRequest, UpdateProfileRequest } from '../types/auth';

// Environment-aware API URL
// For web: use production backend or localhost for development
// For mobile: use localhost (assumes backend running locally or ngrok tunnel)
const getApiBaseUrl = () => {
  if (Platform.OS === 'web') {
    // Check if we have an environment variable for production
    return process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
  }
  // Mobile uses localhost (TODO: update for production)
  return 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

// Export for use in services
export const API_URL = API_BASE_URL;

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchWithAuth(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await storage.getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(
      data?.error || 'Request failed',
      response.status,
      data,
    );
  }

  return response;
}

export const api = {
  auth: {
    async login(credentials: LoginRequest): Promise<{ user: User; token: string }> {
      const response = await fetchWithAuth('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });
      return response.json();
    },

    async register(data: RegisterRequest): Promise<{ user: User; token: string }> {
      const response = await fetchWithAuth('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response.json();
    },

    async me(): Promise<User> {
      const response = await fetchWithAuth('/auth/me');
      return response.json();
    },
  },

  users: {
    async getProfile(userId: number): Promise<User> {
      const response = await fetchWithAuth(`/users/${userId}`);
      return response.json();
    },

    async updateProfile(userId: number, data: UpdateProfileRequest): Promise<User> {
      const response = await fetchWithAuth(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return response.json();
    },
  },
};

export { ApiError };
