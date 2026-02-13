import { API_URL } from '../utils/api';
import { getToken } from '../utils/storage';
import {
  Activity,
  CreateActivityRequest,
  UpdateActivityRequest,
  ActivitiesListResponse,
} from '../types/activity';

export const createActivity = async (data: CreateActivityRequest): Promise<Activity> => {
  const token = await getToken();
  if (!token) throw new Error('Not logged in — please log out and log back in');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/activities`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Save timed out — check your connection and try again');
    }
    throw new Error('Network error — check your connection');
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    let message = 'Failed to create activity';
    try {
      const json = JSON.parse(text);
      message = json.error || message;
    } catch {
      // Non-JSON error response (e.g. 502 HTML page from proxy)
      message = `Server error (${response.status})`;
    }
    throw new Error(message);
  }

  return response.json();
};

export const getActivity = async (activityId: number): Promise<Activity> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_URL}/activities/${activityId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch activity');
  }

  return response.json();
};

export const updateActivity = async (
  activityId: number,
  data: UpdateActivityRequest
): Promise<Activity> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_URL}/activities/${activityId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update activity');
  }

  return response.json();
};

export const deleteActivity = async (activityId: number): Promise<void> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(`${API_URL}/activities/${activityId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete activity');
  }
};

export interface ActivityFilters {
  user_id?: number;
  sport_type?: string;
  visibility?: string;
  limit?: number;
  offset?: number;
}

export const getActivities = async (filters?: ActivityFilters): Promise<ActivitiesListResponse> => {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const queryParams = new URLSearchParams();
  if (filters) {
    if (filters.user_id) queryParams.append('user_id', filters.user_id.toString());
    if (filters.sport_type) queryParams.append('sport_type', filters.sport_type);
    if (filters.visibility) queryParams.append('visibility', filters.visibility);
    if (filters.limit) queryParams.append('limit', filters.limit.toString());
    if (filters.offset) queryParams.append('offset', filters.offset.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString ? `${API_URL}/activities?${queryString}` : `${API_URL}/activities`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch activities');
  }

  return response.json();
};
