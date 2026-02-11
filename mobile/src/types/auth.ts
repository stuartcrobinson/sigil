export interface User {
  id: number;
  email: string;
  name: string;
  photo: string | null;
  bio: string | null;
  preferred_sports: string[];
  created_at: string;
}

export interface AuthTokens {
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface UpdateProfileRequest {
  name?: string;
  photo?: string | null;
  bio?: string | null;
  preferred_sports?: string[];
}
