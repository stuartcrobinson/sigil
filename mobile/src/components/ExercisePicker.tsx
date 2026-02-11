import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Modal
} from 'react-native';
import { Exercise, EXERCISES, searchExercises, EXERCISE_CATEGORIES } from '../data/exercises';

interface ExercisePickerProps {
  visible: boolean;
  recentExercises?: Exercise[];
  onExerciseSelected: (exercise: Exercise) => void;
  onCancel: () => void;
}

export const ExercisePicker: React.FC<ExercisePickerProps> = ({
  visible,
  recentExercises = [],
  onExerciseSelected,
  onCancel
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filter exercises based on search query and category
  const filteredExercises = useMemo(() => {
    let exercises = searchExercises(searchQuery);

    if (selectedCategory) {
      exercises = exercises.filter(ex => ex.category === selectedCategory);
    }

    return exercises;
  }, [searchQuery, selectedCategory]);

  const handleExerciseSelect = (exercise: Exercise) => {
    onExerciseSelected(exercise);
    // Reset state for next time
    setSearchQuery('');
    setSelectedCategory(null);
  };

  const handleCancel = () => {
    setSearchQuery('');
    setSelectedCategory(null);
    onCancel();
  };

  const categories = Object.values(EXERCISE_CATEGORIES);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      testID="exercise-picker-modal"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Select Exercise</Text>
          <TouchableOpacity
            onPress={handleCancel}
            testID="close-button"
            style={styles.closeButton}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            testID="search-input"
            placeholder="Search exercises..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Category Filter */}
        <View style={styles.categoriesContainer}>
          <TouchableOpacity
            style={[
              styles.categoryButton,
              selectedCategory === null && styles.categoryButtonSelected
            ]}
            onPress={() => setSelectedCategory(null)}
            testID="category-all"
          >
            <Text
              style={[
                styles.categoryButtonText,
                selectedCategory === null && styles.categoryButtonTextSelected
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map(category => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryButton,
                selectedCategory === category && styles.categoryButtonSelected
              ]}
              onPress={() => setSelectedCategory(category)}
              testID={`category-${category.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <Text
                style={[
                  styles.categoryButtonText,
                  selectedCategory === category && styles.categoryButtonTextSelected
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Exercises (shown when no search query) */}
        {!searchQuery && recentExercises.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Recent Exercises</Text>
            <View style={styles.recentExercises}>
              {recentExercises.slice(0, 5).map(exercise => (
                <TouchableOpacity
                  key={exercise.id}
                  style={styles.recentExerciseButton}
                  onPress={() => handleExerciseSelect(exercise)}
                  testID={`recent-${exercise.id}`}
                >
                  <Text style={styles.recentExerciseName}>{exercise.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Exercise List */}
        <FlatList
          data={filteredExercises}
          keyExtractor={item => item.id}
          testID="exercise-list"
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.exerciseItem}
              onPress={() => handleExerciseSelect(item)}
              testID={`exercise-${item.id}`}
            >
              <View>
                <Text style={styles.exerciseName}>{item.name}</Text>
                <Text style={styles.exerciseDetails}>
                  {item.category} • {item.equipment || 'N/A'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyState} testID="empty-state">
              <Text style={styles.emptyStateText}>
                No exercises found for "{searchQuery}"
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    padding: 8
  },
  closeButtonText: {
    fontSize: 24,
    color: '#666'
  },
  searchContainer: {
    padding: 15
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
    gap: 8,
    marginBottom: 15
  },
  categoryButton: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  categoryButtonSelected: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50'
  },
  categoryButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  categoryButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  recentSection: {
    paddingHorizontal: 15,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10
  },
  recentExercises: {
    gap: 8
  },
  recentExerciseButton: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2196F3'
  },
  recentExerciseName: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '600'
  },
  exerciseItem: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  exerciseDetails: {
    fontSize: 14,
    color: '#666'
  },
  emptyState: {
    padding: 40,
    alignItems: 'center'
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center'
  }
});
