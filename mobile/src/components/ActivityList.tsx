import React from 'react';
import { FlatList, View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from './Text';
import { ActivityCard } from './ActivityCard';
import { Activity } from '../types/activity';

interface ActivityListProps {
  activities: Activity[];
  loading?: boolean;
  onActivityPress?: (activity: Activity) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  onEndReached?: () => void;
  testID?: string;
}

export function ActivityList({
  activities,
  loading = false,
  onActivityPress,
  onRefresh,
  refreshing = false,
  onEndReached,
  testID,
}: ActivityListProps) {
  if (loading && activities.length === 0) {
    return (
      <View style={styles.centerContainer} testID={`${testID}-loading`}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading activities...</Text>
      </View>
    );
  }

  if (activities.length === 0) {
    return (
      <View style={styles.centerContainer} testID={`${testID}-empty`}>
        <Text variant="subtitle" style={styles.emptyText}>
          No activities yet
        </Text>
        <Text style={styles.emptySubtext}>
          Start tracking your workouts to see them here!
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      testID={testID}
      data={activities}
      renderItem={({ item }) => (
        <ActivityCard
          activity={item}
          onPress={onActivityPress ? () => onActivityPress(item) : undefined}
          testID={`activity-card-${item.id}`}
        />
      )}
      keyExtractor={(item) => item.id.toString()}
      contentContainerStyle={styles.listContent}
      onRefresh={onRefresh}
      refreshing={refreshing}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.5}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyText: {
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
});
