import { API_URL } from '../utils/api';
import { getToken } from '../utils/storage';

export interface ActivityPhoto {
  id: number;
  activity_id: number;
  user_id: number;
  photo_url: string;
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  route_position_meters: number | null;
  taken_at: string | null;
  created_at: string;
}

export interface PhotosResponse {
  photos: ActivityPhoto[];
  count: number;
}

export interface AddPhotoRequest {
  photo_url: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
  route_position_meters?: number;
  taken_at?: string;
}

export const addPhoto = async (activityId: number, data: AddPhotoRequest): Promise<ActivityPhoto> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_URL}/activities/${activityId}/photos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to add photo');
  }

  return response.json();
};

export const getPhotos = async (activityId: number): Promise<PhotosResponse> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_URL}/activities/${activityId}/photos`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch photos');
  }

  return response.json();
};

export const deletePhoto = async (activityId: number, photoId: number): Promise<void> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_URL}/activities/${activityId}/photos/${photoId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete photo');
  }
};
