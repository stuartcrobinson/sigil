import { API_URL } from '../utils/api';
import { getToken } from '../utils/storage';

export interface UserSearchResult {
  id: number;
  email: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  preferred_sports: string[] | null;
}

export interface FollowUser {
  id: number;
  email: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  preferred_sports: string[] | null;
  followed_at: string;
}

export const followUser = async (userId: number): Promise<void> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_URL}/social/users/${userId}/follow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to follow user');
  }
};

export const unfollowUser = async (userId: number): Promise<void> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_URL}/social/users/${userId}/unfollow`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to unfollow user');
  }
};

export const getFollowers = async (userId: number): Promise<FollowUser[]> => {
  const response = await fetch(`${API_URL}/social/users/${userId}/followers`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch followers');
  }

  const data = await response.json();
  return data.followers;
};

export const getFollowing = async (userId: number): Promise<FollowUser[]> => {
  const response = await fetch(`${API_URL}/social/users/${userId}/following`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch following');
  }

  const data = await response.json();
  return data.following;
};

export const searchUsers = async (query: string): Promise<UserSearchResult[]> => {
  const response = await fetch(`${API_URL}/social/search?q=${encodeURIComponent(query)}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to search users');
  }

  const data = await response.json();
  return data.users;
};
