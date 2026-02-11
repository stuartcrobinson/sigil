import React, { useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Text } from '../components/Text';
import { searchUsers, UserSearchResult } from '../services/socialService';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (query.trim().length === 0) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const users = await searchUsers(query);
      setResults(users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const renderUser = ({ item }: { item: UserSearchResult }) => (
    <TouchableOpacity style={styles.userCard} testID={`user-${item.id}`}>
      <Text style={styles.userName}>{item.name}</Text>
      <Text style={styles.userEmail}>{item.email}</Text>
      {item.bio && <Text style={styles.userBio}>{item.bio}</Text>}
      {item.preferred_sports && item.preferred_sports.length > 0 && (
        <Text style={styles.sports}>{item.preferred_sports.join(', ')}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users by name or email..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          testID="search-input"
          autoCapitalize="none"
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={handleSearch}
          testID="search-button"
          disabled={loading}
        >
          <Text style={styles.searchButtonText}>Search</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <Text style={styles.error} testID="error-message">
          {error}
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" testID="loading-indicator" />
      ) : (
        <FlatList
          data={results}
          renderItem={renderUser}
          keyExtractor={(item) => item.id.toString()}
          ListEmptyComponent={
            query.length > 0 ? (
              <Text style={styles.emptyText} testID="empty-results">
                No users found
              </Text>
            ) : (
              <Text style={styles.emptyText} testID="search-prompt">
                Search for users to connect with
              </Text>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginRight: 8,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  error: {
    color: '#FF3B30',
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
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
});
