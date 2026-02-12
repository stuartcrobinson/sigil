import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '../components/Text';
import { NewAchievement, NewPR } from '../services/statsService';

interface CelebrationScreenProps {
  sportType: string;
  durationSeconds: number;
  distanceMeters: number;
  paceDisplay: string;
  newAchievements: NewAchievement[];
  newPRs: NewPR[];
  onDone: () => void;
}

const PR_LABELS: Record<string, string> = {
  '1k': '1K',
  '5k': '5K',
  '10k': '10K',
  'half_marathon': 'Half Marathon',
  'marathon': 'Marathon',
  'longest_run': 'Longest Run',
  'fastest_pace': 'Fastest Pace',
};

const ACHIEVEMENT_ICONS: Record<string, string> = {
  first_activity: '🎯',
  first_run: '🏃',
  first_5k: '🏅',
  first_10k: '🏅',
  half_marathon: '🥇',
  marathon: '🏆',
  total_50km: '🌟',
  total_100km: '💫',
  total_500km: '⭐',
  streak_7: '🔥',
  streak_30: '🔥',
  early_bird: '🌅',
  night_owl: '🌙',
  five_activities: '✅',
  ten_activities: '💪',
  fifty_activities: '🏋️',
  photo_first: '📸',
  social_butterfly: '🦋',
};

function formatDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatDistance(meters: number): string {
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

function formatPRTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const CelebrationScreen: React.FC<CelebrationScreenProps> = ({
  sportType,
  durationSeconds,
  distanceMeters,
  paceDisplay,
  newAchievements,
  newPRs,
  onDone,
}) => {
  const hasNewStuff = newAchievements.length > 0 || newPRs.length > 0;

  return (
    <View style={styles.container} testID="celebration-screen">
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.emoji} testID="celebration-emoji">
          {hasNewStuff ? '🎉' : '✅'}
        </Text>
        <Text style={styles.title} testID="celebration-title">
          {hasNewStuff ? 'Amazing Work!' : 'Activity Saved!'}
        </Text>

        {/* Stats summary */}
        <View style={styles.statsCard} testID="celebration-stats">
          <Text style={styles.sportType}>
            {sportType.charAt(0).toUpperCase() + sportType.slice(1)}
          </Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDuration(durationSeconds)}</Text>
              <Text style={styles.statLabel}>Duration</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatDistance(distanceMeters)}</Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{paceDisplay || '--:--'}</Text>
              <Text style={styles.statLabel}>Pace</Text>
            </View>
          </View>
        </View>

        {/* New PRs */}
        {newPRs.length > 0 && (
          <View style={styles.section} testID="new-prs-section">
            <Text style={styles.sectionTitle}>New Personal Records!</Text>
            {newPRs.map((pr, index) => (
              <View key={index} style={styles.prCard} testID={`pr-${pr.record_type}`}>
                <Text style={styles.prIcon}>🏆</Text>
                <View style={styles.prInfo}>
                  <Text style={styles.prLabel}>{PR_LABELS[pr.record_type] || pr.record_type}</Text>
                  <Text style={styles.prTime}>{formatPRTime(pr.new_time)}</Text>
                  {pr.old_time !== null && (
                    <Text style={styles.prImprovement} testID={`pr-improvement-${pr.record_type}`}>
                      Improved by {formatPRTime(pr.old_time - pr.new_time)}
                    </Text>
                  )}
                  {pr.old_time === null && (
                    <Text style={styles.prNew}>First time!</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* New achievements */}
        {newAchievements.length > 0 && (
          <View style={styles.section} testID="new-achievements-section">
            <Text style={styles.sectionTitle}>Badges Earned!</Text>
            {newAchievements.map((ach, index) => (
              <View key={index} style={styles.achievementCard} testID={`achievement-${ach.achievement_type}`}>
                <Text style={styles.achievementIcon}>
                  {ACHIEVEMENT_ICONS[ach.achievement_type] || '🏅'}
                </Text>
                <Text style={styles.achievementName}>{ach.achievement_name}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.doneButton}
        onPress={onDone}
        testID="celebration-done-button"
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  sportType: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  section: {
    width: '90%',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  prIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  prInfo: {
    flex: 1,
  },
  prLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  prTime: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F57C00',
  },
  prImprovement: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  prNew: {
    fontSize: 13,
    color: '#2196F3',
    fontWeight: '500',
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  achievementName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  doneButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    margin: 16,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default CelebrationScreen;
