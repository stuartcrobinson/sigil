import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Text } from '../components/Text';
import { showAlert } from '../utils/platformAlert';
import {
  GpsPoint,
  startTracking,
  stopTracking,
  getRoutePoints,
  totalRouteDistance,
  currentPace,
  formatPace,
  isCurrentlyTracking,
} from '../services/locationService';
import { createActivity } from '../services/activityService';
import { addPhoto } from '../services/photoService';
import { takePhoto } from '../services/cameraService';
import { checkAchievements } from '../services/statsService';
import { checkAndAnnounce, resetAnnouncements } from '../services/speechService';
import { LiveRouteMap } from '../components/LiveRouteMap';
import { CelebrationScreen } from './CelebrationScreen';
import { SportType } from '../types/activity';

import type { NewAchievement, NewPR } from '../services/statsService';

type ActivityState = 'idle' | 'tracking' | 'paused' | 'summary' | 'celebration';

interface RunningActivityScreenProps {
  onSave?: (activityId: number) => void;
  onCancel?: () => void;
}

export const RunningActivityScreen: React.FC<RunningActivityScreenProps> = ({
  onSave,
  onCancel,
}) => {
  const [state, setState] = useState<ActivityState>('idle');
  const [sportType, setSportType] = useState<SportType>('running');
  const [distance, setDistance] = useState(0);
  const [pace, setPace] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [routePoints, setRoutePoints] = useState<GpsPoint[]>([]);
  const [saving, setSaving] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [savedActivityId, setSavedActivityId] = useState<number | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [newAchievements, setNewAchievements] = useState<NewAchievement[]>([]);
  const [newPRs, setNewPRs] = useState<NewPR[]>([]);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const pausedSecondsRef = useRef(0);

  // Timer effect
  useEffect(() => {
    if (state === 'tracking') {
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const now = new Date();
          const totalMs = now.getTime() - startTimeRef.current.getTime();
          setElapsedSeconds(Math.floor(totalMs / 1000) + pausedSecondsRef.current);
        }
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  const handleGpsPoint = useCallback((point: GpsPoint) => {
    const points = getRoutePoints();
    const dist = totalRouteDistance(points);
    const paceVal = currentPace(points);
    setRoutePoints([...points]);
    setDistance(dist);
    setPace(paceVal);

    // Audio pace announcement at each km
    if (audioEnabled) {
      checkAndAnnounce(dist, paceVal, elapsedSeconds);
    }
  }, [audioEnabled, elapsedSeconds]);

  const handleStart = () => {
    startTimeRef.current = new Date();
    pausedSecondsRef.current = 0;
    setDistance(0);
    setPace(0);
    setElapsedSeconds(0);
    setRoutePoints([]);
    setNewAchievements([]);
    setNewPRs([]);
    resetAnnouncements();
    setState('tracking');
    startTracking(handleGpsPoint, { intervalMs: 5000, distanceIntervalM: 10 });
  };

  const handlePause = () => {
    pausedSecondsRef.current = elapsedSeconds;
    startTimeRef.current = null;
    setState('paused');
    const points = stopTracking();
    setRoutePoints(points);
  };

  const handleResume = () => {
    startTimeRef.current = new Date();
    setState('tracking');
    startTracking(handleGpsPoint, { intervalMs: 5000, distanceIntervalM: 10 });
  };

  const handleStop = () => {
    if (state === 'tracking') {
      const points = stopTracking();
      setRoutePoints(points);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setState('summary');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const startTime = new Date(Date.now() - elapsedSeconds * 1000).toISOString();

      const activity = await createActivity({
        sport_type: sportType,
        title: `${sportType.charAt(0).toUpperCase() + sportType.slice(1)} Activity`,
        start_time: startTime,
        end_time: now,
        duration_seconds: elapsedSeconds,
        distance_meters: Math.round(distance),
        visibility: 'public',
        sport_data: {
          route_points: routePoints,
          avg_pace: pace > 0 ? formatPace(pace) : null,
          total_distance_meters: Math.round(distance),
        },
      });

      setSavedActivityId(activity.id);

      // Check for new achievements and PRs
      try {
        const result = await checkAchievements(activity.user_id, {
          activity_id: activity.id,
          sport_type: sportType,
          distance_meters: Math.round(distance),
          duration_seconds: elapsedSeconds,
          start_time: startTime,
        });
        setNewAchievements(result.new_achievements);
        setNewPRs(result.new_personal_records);
      } catch {
        // Achievement check is non-critical, proceed to celebration
      }

      setState('celebration');
    } catch (error: any) {
      showAlert('Save Failed', error.message || 'Could not save activity');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (elapsedSeconds > 0) {
      showAlert(
        'Discard Activity?',
        'Are you sure you want to discard this activity?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: () => {
            if (isCurrentlyTracking()) stopTracking();
            setState('idle');
            onCancel?.();
          }},
        ]
      );
    } else {
      if (isCurrentlyTracking()) stopTracking();
      setState('idle');
      onCancel?.();
    }
  };

  const handleCamera = async () => {
    const photo = await takePhoto();
    if (!photo) return;

    // Get current GPS position for the photo
    const points = getRoutePoints();
    const lastPoint = points.length > 0 ? points[points.length - 1] : null;

    setPhotoCount(prev => prev + 1);

    // If activity is already saved, attach photo immediately
    if (savedActivityId) {
      try {
        await addPhoto(savedActivityId, {
          photo_url: photo.uri,
          latitude: lastPoint?.latitude,
          longitude: lastPoint?.longitude,
          route_position_meters: lastPoint ? totalRouteDistance(points) : undefined,
        });
      } catch {
        // Photo will be saved when activity is saved
      }
    }
  };

  const formatElapsed = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDist = (meters: number): string => {
    if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
    return `${Math.round(meters)} m`;
  };

  const sportOptions: { type: SportType; label: string; icon: string }[] = [
    { type: 'running', label: 'Run', icon: '🏃' },
    { type: 'walking', label: 'Walk', icon: '🚶' },
    { type: 'biking', label: 'Ride', icon: '🚴' },
  ];

  // Idle state - sport selector + start
  if (state === 'idle') {
    return (
      <View style={styles.container} testID="running-idle-view">
        <Text variant="title" style={styles.title}>Start Activity</Text>
        <Text style={styles.subtitle}>Choose your activity type</Text>

        <View style={styles.sportSelector} testID="sport-selector">
          {sportOptions.map(({ type, label, icon }) => (
            <TouchableOpacity
              key={type}
              style={[styles.sportButton, sportType === type && styles.sportButtonActive]}
              onPress={() => setSportType(type)}
              testID={`sport-${type}`}
            >
              <Text style={styles.sportIcon}>{icon}</Text>
              <Text style={[styles.sportLabel, sportType === type && styles.sportLabelActive]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={handleStart}
          testID="start-activity-button"
        >
          <Text style={styles.startButtonText}>Start {sportType.charAt(0).toUpperCase() + sportType.slice(1)}</Text>
        </TouchableOpacity>

        {onCancel && (
          <TouchableOpacity style={styles.backButton} onPress={onCancel} testID="back-button">
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Tracking or Paused state
  if (state === 'tracking' || state === 'paused') {
    return (
      <View style={styles.container} testID="running-tracking-view">
        {state === 'paused' && (
          <View style={styles.pausedBanner} testID="paused-banner">
            <Text style={styles.pausedText}>PAUSED</Text>
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.mainStat}>
            <Text style={styles.mainStatValue} testID="elapsed-time">
              {formatElapsed(elapsedSeconds)}
            </Text>
            <Text style={styles.mainStatLabel}>Duration</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statValue} testID="distance-display">
                {formatDist(distance)}
              </Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue} testID="pace-display">
                {pace > 0 ? `${formatPace(pace)}/km` : '--:--/km'}
              </Text>
              <Text style={styles.statLabel}>Pace</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue} testID="points-count">
                {routePoints.length}
              </Text>
              <Text style={styles.statLabel}>GPS Points</Text>
            </View>
          </View>
        </View>

        {/* Live route map - renders polyline on-device as GPS points arrive */}
        <LiveRouteMap
          routePoints={routePoints}
          isTracking={state === 'tracking'}
          testID="map-placeholder"
        />

        {/* Camera + Audio toggle during active tracking */}
        {state === 'tracking' && (
          <View style={styles.cameraRow}>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={handleCamera}
              testID="camera-button"
            >
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.cameraLabel}>
                Photo{photoCount > 0 ? ` (${photoCount})` : ''}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cameraButton, !audioEnabled && styles.audioButtonDisabled]}
              onPress={() => setAudioEnabled(prev => !prev)}
              testID="audio-toggle"
            >
              <Text style={styles.cameraIcon}>{audioEnabled ? '🔊' : '🔇'}</Text>
              <Text style={styles.cameraLabel}>Audio</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.controls}>
          {state === 'tracking' ? (
            <>
              <TouchableOpacity
                style={styles.pauseButton}
                onPress={handlePause}
                testID="pause-button"
              >
                <Text style={styles.controlButtonText}>Pause</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStop}
                testID="stop-button"
              >
                <Text style={styles.controlButtonText}>Stop</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={styles.resumeButton}
                onPress={handleResume}
                testID="resume-button"
              >
                <Text style={styles.controlButtonText}>Resume</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.stopButton}
                onPress={handleStop}
                testID="stop-button"
              >
                <Text style={styles.controlButtonText}>Finish</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  // Celebration state — shown after save with PRs/achievements
  if (state === 'celebration') {
    return (
      <CelebrationScreen
        sportType={sportType}
        durationSeconds={elapsedSeconds}
        distanceMeters={Math.round(distance)}
        paceDisplay={pace > 0 ? `${formatPace(pace)}/km` : '--:--/km'}
        newAchievements={newAchievements}
        newPRs={newPRs}
        onDone={() => {
          onSave?.(savedActivityId || 0);
        }}
      />
    );
  }

  // Summary state
  return (
    <View style={styles.container} testID="running-summary-view">
      <ScrollView style={styles.scrollView}>
        <Text variant="title" style={styles.summaryTitle}>Activity Complete!</Text>

        <View style={styles.summaryStats}>
          <View style={styles.summaryStatRow}>
            <Text style={styles.summaryStatLabel}>Sport</Text>
            <Text style={styles.summaryStatValue} testID="summary-sport">
              {sportType.charAt(0).toUpperCase() + sportType.slice(1)}
            </Text>
          </View>
          <View style={styles.summaryStatRow}>
            <Text style={styles.summaryStatLabel}>Duration</Text>
            <Text style={styles.summaryStatValue} testID="summary-duration">
              {formatElapsed(elapsedSeconds)}
            </Text>
          </View>
          <View style={styles.summaryStatRow}>
            <Text style={styles.summaryStatLabel}>Distance</Text>
            <Text style={styles.summaryStatValue} testID="summary-distance">
              {formatDist(distance)}
            </Text>
          </View>
          <View style={styles.summaryStatRow}>
            <Text style={styles.summaryStatLabel}>Avg Pace</Text>
            <Text style={styles.summaryStatValue} testID="summary-pace">
              {pace > 0 ? `${formatPace(pace)}/km` : '--:--/km'}
            </Text>
          </View>
          <View style={styles.summaryStatRow}>
            <Text style={styles.summaryStatLabel}>GPS Points</Text>
            <Text style={styles.summaryStatValue} testID="summary-points">
              {routePoints.length}
            </Text>
          </View>
          {photoCount > 0 && (
            <View style={styles.summaryStatRow}>
              <Text style={styles.summaryStatLabel}>Photos</Text>
              <Text style={styles.summaryStatValue} testID="summary-photos">
                {photoCount}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.summaryActions}>
        <TouchableOpacity
          style={styles.discardButton}
          onPress={handleDiscard}
          testID="discard-button"
        >
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          testID="save-activity-button"
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Activity'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollView: { flex: 1 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginTop: 60, color: '#333' },
  subtitle: { fontSize: 16, textAlign: 'center', color: '#666', marginTop: 8, marginBottom: 30 },
  sportSelector: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 40, paddingHorizontal: 20 },
  sportButton: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, backgroundColor: '#fff', borderWidth: 2, borderColor: '#E0E0E0', flex: 1 },
  sportButtonActive: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  sportIcon: { fontSize: 36, marginBottom: 8 },
  sportLabel: { fontSize: 16, fontWeight: '600', color: '#666' },
  sportLabelActive: { color: '#4CAF50' },
  startButton: { backgroundColor: '#4CAF50', paddingVertical: 18, borderRadius: 12, marginHorizontal: 30, marginBottom: 20 },
  startButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center' },
  backButton: { paddingVertical: 12, marginHorizontal: 30 },
  backButtonText: { color: '#666', fontSize: 16, textAlign: 'center' },
  pausedBanner: { backgroundColor: '#FF9800', paddingVertical: 8 },
  pausedText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  statsContainer: { paddingVertical: 24, paddingHorizontal: 20, backgroundColor: '#fff' },
  mainStat: { alignItems: 'center', marginBottom: 20 },
  mainStatValue: { fontSize: 56, fontWeight: 'bold', color: '#333', fontVariant: ['tabular-nums'] },
  mainStatLabel: { fontSize: 14, color: '#999', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '600', color: '#333' },
  statLabel: { fontSize: 12, color: '#999', marginTop: 4 },
  mapPlaceholder: { flex: 1, backgroundColor: '#E8E8E8', margin: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', minHeight: 200 },
  mapPlaceholderText: { color: '#999', fontSize: 16, textAlign: 'center' },
  cameraRow: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  cameraButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 3, elevation: 2, gap: 8 },
  cameraIcon: { fontSize: 20 },
  cameraLabel: { fontSize: 14, fontWeight: '600', color: '#333' },
  audioButtonDisabled: { opacity: 0.5 },
  controls: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  pauseButton: { flex: 1, backgroundColor: '#FF9800', paddingVertical: 16, borderRadius: 12 },
  resumeButton: { flex: 1, backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 12 },
  stopButton: { flex: 1, backgroundColor: '#F44336', paddingVertical: 16, borderRadius: 12 },
  controlButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  summaryTitle: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginTop: 40, marginBottom: 24, color: '#333' },
  summaryStats: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 20 },
  summaryStatRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  summaryStatLabel: { fontSize: 16, color: '#666' },
  summaryStatValue: { fontSize: 16, fontWeight: '600', color: '#333' },
  summaryActions: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E0E0E0' },
  discardButton: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#DDD' },
  discardButtonText: { color: '#666', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  saveButton: { flex: 2, backgroundColor: '#4CAF50', paddingVertical: 16, borderRadius: 12 },
  saveButtonDisabled: { backgroundColor: '#A5D6A7' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
});
