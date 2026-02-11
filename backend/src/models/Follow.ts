export interface Follow {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: Date;
}

export interface CreateFollowInput {
  follower_id: number;
  following_id: number;
}

export interface FollowWithUserInfo {
  id: number;
  follower_id: number;
  following_id: number;
  created_at: Date;
  user_id: number;
  email: string;
  name: string;
  photo_url: string | null;
  bio: string | null;
  preferred_sports: string[] | null;
}
