export type SportType = 'running' | 'walking' | 'biking' | 'weightlifting' | 'swimming' | 'yoga' | 'hit';
export type Visibility = 'public' | 'friends' | 'private';

export interface Activity {
  id: number;
  user_id: number;
  sport_type: SportType;
  title?: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  distance_meters?: number;
  visibility: Visibility;
  sport_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Enriched fields from feed endpoint
  user_name?: string;
  user_photo_url?: string | null;
  like_count?: number;
  high_five_count?: number;
  comment_count?: number;
  photo_count?: number;
}

export interface CreateActivityRequest {
  sport_type: SportType;
  title?: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  distance_meters?: number;
  visibility?: Visibility;
  sport_data?: Record<string, unknown>;
}

export interface UpdateActivityRequest {
  sport_type?: SportType;
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  duration_seconds?: number;
  distance_meters?: number;
  visibility?: Visibility;
  sport_data?: Record<string, unknown>;
}

export interface ActivitiesListResponse {
  activities: Activity[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
  };
}
