import { API_URL } from '../utils/api';
import { getToken } from '../utils/storage';

export interface Achievement {
  achievement_type: string;
  achievement_name: string;
  achievement_description: string;
  metadata?: Record<string, unknown>;
  achieved_at: string;
  activity_id?: number;
}

export interface AchievementDef {
  achievement_type: string;
  achievement_name: string;
  achievement_description: string;
  earned: boolean;
}

export interface AchievementsResponse {
  earned: Achievement[];
  all: AchievementDef[];
  total_earned: number;
  total_available: number;
}

export interface PersonalRecord {
  id: number;
  record_type: string;
  distance_meters: number;
  duration_seconds: number;
  pace_seconds_per_km: number;
  activity_id: number;
  sport_type: string;
  achieved_at: string;
  previous_record_seconds: number | null;
}

export interface StreaksResponse {
  current_streak: number;
  longest_streak: number;
  total_active_days: number;
  total_activities: number;
}

export interface SummaryPeriodData {
  activity_count: number;
  total_duration_seconds: number;
  total_distance_meters: number;
  active_days: number;
  sport_types_count?: number;
}

export interface SportBreakdown {
  sport_type: string;
  count: number;
  duration_seconds: number;
  distance_meters: number;
}

export interface SummaryResponse {
  period: string;
  current: SummaryPeriodData;
  previous: SummaryPeriodData;
  comparison: {
    activity_count_delta: number;
    duration_delta: number;
    distance_delta: number;
  };
  sport_breakdown: SportBreakdown[];
}

export interface NewPR {
  record_type: string;
  new_time: number;
  old_time: number | null;
  is_new: boolean;
}

export interface NewAchievement {
  achievement_type: string;
  achievement_name: string;
  is_new: boolean;
}

export interface CheckAchievementsResponse {
  new_achievements: NewAchievement[];
  new_personal_records: NewPR[];
  achievements_count: number;
  prs_count: number;
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  if (!token) throw new Error('No authentication token');

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  return response;
}

export const getAchievements = async (userId: number): Promise<AchievementsResponse> => {
  const response = await authFetch(`${API_URL}/users/${userId}/achievements`);
  return response.json();
};

export const getPersonalRecords = async (userId: number, sportType?: string): Promise<{ personal_records: PersonalRecord[] }> => {
  const url = sportType
    ? `${API_URL}/users/${userId}/personal-records?sport_type=${sportType}`
    : `${API_URL}/users/${userId}/personal-records`;
  const response = await authFetch(url);
  return response.json();
};

export const getStreaks = async (userId: number): Promise<StreaksResponse> => {
  const response = await authFetch(`${API_URL}/users/${userId}/streaks`);
  return response.json();
};

export const getSummary = async (userId: number, period: 'week' | 'month' | 'year' = 'week'): Promise<SummaryResponse> => {
  const response = await authFetch(`${API_URL}/users/${userId}/summary?period=${period}`);
  return response.json();
};

export const checkAchievements = async (
  userId: number,
  activityData?: {
    activity_id: number;
    sport_type: string;
    distance_meters: number;
    duration_seconds: number;
    start_time?: string;
  }
): Promise<CheckAchievementsResponse> => {
  const response = await authFetch(`${API_URL}/users/${userId}/check-achievements`, {
    method: 'POST',
    body: JSON.stringify(activityData || {}),
  });
  return response.json();
};
