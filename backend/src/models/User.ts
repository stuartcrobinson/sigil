export type SportType = 'running' | 'walking' | 'biking' | 'weightlifting' | 'swimming' | 'yoga' | 'hit';

export interface User {
  id: number;
  email: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  preferred_sports: SportType[];
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  photo_url?: string;
  bio?: string;
  preferred_sports?: SportType[];
}

export interface UpdateUserInput {
  name?: string;
  photo_url?: string;
  bio?: string;
  preferred_sports?: SportType[];
}

export interface UserWithPassword extends User {
  password_hash: string;
}
