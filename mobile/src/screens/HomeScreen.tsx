import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../components/Text';
import { ActivityCard } from '../components/ActivityCard';
import { CommentSheet } from '../components/CommentSheet';
import { getActivities } from '../services/activityService';
import { likeActivity, unlikeActivity } from '../services/interactionService';
import { Activity } from '../types/activity';
import { useFocusEffect } from '@react-navigation/native';

interface HomeScreenProps {
  navigation?: any;
  currentUserId?: number;
}

export default function HomeScreen({ navigation, currentUserId = 0 }: HomeScreenProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedActivities, setLikedActivities] = useState<Set<number>>(new Set());
  const [highFivedActivities, setHighFivedActivities] = useState<Set<number>>(new Set());
  const [commentSheetActivityId, setCommentSheetActivityId] = useState<number | null>(null);

  const fetchActivities = useCallback(async () => {
    try {
      const response = await getActivities({ limit: 50 });
      setActivities(response.activities);
    } catch (error) {
      // Silently handle — empty state will show
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchActivities();
    }, [fetchActivities])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchActivities();
  };

  const handleLike = async (activityId: number) => {
    try {
      if (likedActivities.has(activityId)) {
        await unlikeActivity(activityId, 'like');
        setLikedActivities(prev => {
          const next = new Set(prev);
          next.delete(activityId);
          return next;
        });
      } else {
        await likeActivity(activityId, 'like');
        setLikedActivities(prev => new Set(prev).add(activityId));
      }
    } catch {
      // Optimistic UI will revert on next refresh
    }
  };

  const handleHighFive = async (activityId: number) => {
    try {
      if (highFivedActivities.has(activityId)) {
        await unlikeActivity(activityId, 'high_five');
        setHighFivedActivities(prev => {
          const next = new Set(prev);
          next.delete(activityId);
          return next;
        });
      } else {
        await likeActivity(activityId, 'high_five');
        setHighFivedActivities(prev => new Set(prev).add(activityId));
      }
    } catch {
      // Optimistic UI will revert on next refresh
    }
  };

  const handleComment = (activityId: number) => {
    setCommentSheetActivityId(activityId);
  };

  const handleCommentCountChange = (delta: number) => {
    if (commentSheetActivityId === null) return;
    setActivities(prev =>
      prev.map(a =>
        a.id === commentSheetActivityId
          ? { ...a, comment_count: (a.comment_count ?? 0) + delta }
          : a
      )
    );
  };

  const handleStartActivity = () => {
    navigation?.navigate?.('RunningActivity');
  };

  if (loading) {
    return (
      <View style={styles.centered} testID="home-loading">
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container} testID="home-screen">
      <FlatList
        data={activities}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <ActivityCard
            activity={item}
            onLike={handleLike}
            onHighFive={handleHighFive}
            onComment={handleComment}
            isLiked={likedActivities.has(item.id)}
            isHighFived={highFivedActivities.has(item.id)}
            testID={`activity-card-${item.id}`}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#4CAF50"
            testID="refresh-control"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState} testID="empty-feed">
            <Text style={styles.emptyIcon}>🏃</Text>
            <Text variant="title" style={styles.emptyTitle}>No Activities Yet</Text>
            <Text style={styles.emptySubtitle}>
              Start your first activity or follow other athletes to see their workouts here.
            </Text>
          </View>
        }
        contentContainerStyle={activities.length === 0 ? styles.emptyContainer : undefined}
        testID="activity-feed"
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={handleStartActivity}
        testID="start-activity-fab"
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {commentSheetActivityId !== null && (
        <CommentSheet
          visible={true}
          activityId={commentSheetActivityId}
          currentUserId={currentUserId}
          onClose={() => setCommentSheetActivityId(null)}
          onCommentCountChange={handleCommentCountChange}
          testID="home-comment-sheet"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F5F5' },
  emptyContainer: { flexGrow: 1 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40, paddingTop: 80 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  emptySubtitle: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 22 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: -2 },
});
