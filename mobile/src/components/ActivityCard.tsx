import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from './Text';
import { Activity } from '../types/activity';

interface ActivityCardProps {
  activity: Activity;
  onPress?: () => void;
  onLike?: (activityId: number) => void;
  onHighFive?: (activityId: number) => void;
  onComment?: (activityId: number) => void;
  isLiked?: boolean;
  isHighFived?: boolean;
  testID?: string;
}

const formatDuration = (seconds?: number): string => {
  if (!seconds) return 'No duration';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
};

const formatDistance = (meters?: number): string => {
  if (!meters) return '';

  if (meters >= 1000) {
    const km = (meters / 1000).toFixed(2);
    return `${km} km`;
  }
  return `${meters.toFixed(0)} m`;
};

const getSportIcon = (sportType: string): string => {
  const icons: Record<string, string> = {
    running: '🏃',
    walking: '🚶',
    biking: '🚴',
    weightlifting: '🏋️',
    swimming: '🏊',
    yoga: '🧘',
    hit: '⚡',
  };
  return icons[sportType] || '💪';
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function ActivityCard({
  activity,
  onPress,
  onLike,
  onHighFive,
  onComment,
  isLiked = false,
  isHighFived = false,
  testID,
}: ActivityCardProps) {
  const [liked, setLiked] = useState(isLiked);
  const [highFived, setHighFived] = useState(isHighFived);
  const [likeCount, setLikeCount] = useState(activity.like_count ?? 0);
  const [highFiveCount, setHighFiveCount] = useState(activity.high_five_count ?? 0);

  const sportIcon = getSportIcon(activity.sport_type);
  const durationText = formatDuration(activity.duration_seconds);
  const distanceText = formatDistance(activity.distance_meters);
  const dateText = formatDate(activity.start_time);
  const commentCount = activity.comment_count ?? 0;
  const photoCount = activity.photo_count ?? 0;

  const handleLike = () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount(prev => newLiked ? prev + 1 : prev - 1);
    onLike?.(activity.id);
  };

  const handleHighFive = () => {
    const newHighFived = !highFived;
    setHighFived(newHighFived);
    setHighFiveCount(prev => newHighFived ? prev + 1 : prev - 1);
    onHighFive?.(activity.id);
  };

  const handleComment = () => {
    onComment?.(activity.id);
  };

  const content = (
    <View style={styles.card} testID={testID}>
      {/* Header with user info */}
      {activity.user_name && (
        <View style={styles.userRow}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {activity.user_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.userName} testID={`${testID}-user-name`}>{activity.user_name}</Text>
          <Text style={styles.date}>{dateText}</Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={styles.sportIcon}>{sportIcon}</Text>
        <View style={styles.headerText}>
          <Text variant="subtitle" style={styles.sportType}>
            {activity.sport_type.charAt(0).toUpperCase() + activity.sport_type.slice(1)}
          </Text>
          {activity.title && (
            <Text variant="body" style={styles.title}>
              {activity.title}
            </Text>
          )}
        </View>
        {!activity.user_name && <Text style={styles.date}>{dateText}</Text>}
      </View>

      <View style={styles.details}>
        {activity.duration_seconds !== undefined && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>{durationText}</Text>
          </View>
        )}
        {activity.distance_meters !== undefined && (
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Distance</Text>
            <Text style={styles.statValue}>{distanceText}</Text>
          </View>
        )}
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Privacy</Text>
          <Text style={styles.statValue}>
            {activity.visibility === 'public' ? '🌍' : activity.visibility === 'friends' ? '👥' : '🔒'}
          </Text>
        </View>
      </View>

      {activity.description && (
        <Text style={styles.description} numberOfLines={2}>
          {activity.description}
        </Text>
      )}

      {/* Social interaction bar */}
      <View style={styles.socialBar} testID={`${testID}-social-bar`}>
        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleLike}
          testID={`${testID}-like-button`}
        >
          <Text style={[styles.socialIcon, liked && styles.socialIconActive]}>
            {liked ? '❤️' : '🤍'}
          </Text>
          <Text style={[styles.socialCount, liked && styles.socialCountActive]} testID={`${testID}-like-count`}>
            {likeCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleHighFive}
          testID={`${testID}-highfive-button`}
        >
          <Text style={[styles.socialIcon, highFived && styles.socialIconActive]}>
            {highFived ? '🙌' : '🖐️'}
          </Text>
          <Text style={[styles.socialCount, highFived && styles.socialCountActive]} testID={`${testID}-highfive-count`}>
            {highFiveCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.socialButton}
          onPress={handleComment}
          testID={`${testID}-comment-button`}
        >
          <Text style={styles.socialIcon}>💬</Text>
          <Text style={styles.socialCount} testID={`${testID}-comment-count`}>
            {commentCount}
          </Text>
        </TouchableOpacity>

        {photoCount > 0 && (
          <View style={styles.socialButton} testID={`${testID}-photo-indicator`}>
            <Text style={styles.socialIcon}>📷</Text>
            <Text style={styles.socialCount} testID={`${testID}-photo-count`}>
              {photoCount}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} testID={`${testID}-touchable`}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  userName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sportIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  sportType: {
    fontWeight: '600',
    color: '#333',
  },
  title: {
    color: '#666',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  stat: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  description: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  socialBar: {
    flexDirection: 'row',
    paddingTop: 12,
    gap: 20,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  socialIcon: {
    fontSize: 18,
  },
  socialIconActive: {
    opacity: 1,
  },
  socialCount: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  socialCountActive: {
    color: '#F44336',
  },
});
