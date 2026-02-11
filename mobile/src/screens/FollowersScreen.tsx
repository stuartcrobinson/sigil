import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../components/Text';
import { getFollowers, FollowUser } from '../services/socialService';
import { useAuth } from '../contexts/AuthContext';

export function FollowersScreen() {
  const { user } = useAuth();
  const [followers, setFollowers] = useState<FollowUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFollowers();
  }, []);

  const loadFollowers = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const data = await getFollowers(user.id);
      setFollowers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load followers');
    } finally {
      setLoading(false);
    }
  };

  const renderFollower = ({ item }: { item: FollowUser }) => (
    <TouchableOpacity style={styles.userCard} testID={`follower-${item.id}`}>
      <Text style={styles.userName}>{item.name}</Text>
      <Text style={styles.userEmail}>{item.email}</Text>
      {item.bio && <Text style={styles.userBio}>{item.bio}</Text>}
      {item.preferred_sports && item.preferred_sports.length > 0 && (
        <Text style={styles.sports}>{item.preferred_sports.join(', ')}</Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" testID="loading-indicator" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.error} testID="error-message">
          {error}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadFollowers} testID="retry-button">
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={followers}
        renderItem={renderFollower}
        keyExtractor={(item) => item.id.toString()}
        ListEmptyComponent={
          <Text style={styles.emptyText} testID="empty-message">
            No followers yet
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  userCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 14,
    marginBottom: 8,
  },
  sports: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 32,
  },
  error: {
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
