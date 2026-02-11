import { API_URL } from '../utils/api';
import { getToken } from '../utils/storage';

export interface Like {
  id: number;
  like_type: 'like' | 'high_five';
  created_at: string;
  user: { id: number; name: string; photo_url: string | null };
}

export interface LikesResponse {
  likes: Like[];
  like_count: number;
  high_five_count: number;
  total: number;
}

export interface Comment {
  id: number;
  text: string;
  created_at: string;
  updated_at: string;
  user: { id: number; name: string; photo_url: string | null };
}

export interface CommentsResponse {
  comments: Comment[];
  count: number;
}

export const likeActivity = async (activityId: number, likeType: 'like' | 'high_five' = 'like'): Promise<void> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_URL}/activities/${activityId}/like`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ like_type: likeType }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to like activity');
  }
};

export const unlikeActivity = async (activityId: number, likeType: 'like' | 'high_five' = 'like'): Promise<void> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_URL}/activities/${activityId}/like`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ like_type: likeType }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to unlike activity');
  }
};

export const getLikes = async (activityId: number): Promise<LikesResponse> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_URL}/activities/${activityId}/likes`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch likes');
  }

  return response.json();
};

export const addComment = async (activityId: number, text: string): Promise<Comment> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_URL}/activities/${activityId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add comment');
  }

  return response.json();
};

export const getComments = async (activityId: number): Promise<CommentsResponse> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_URL}/activities/${activityId}/comments`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch comments');
  }

  return response.json();
};

export const deleteComment = async (activityId: number, commentId: number): Promise<void> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_URL}/activities/${activityId}/comments/${commentId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete comment');
  }
};
