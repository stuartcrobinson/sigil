import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface YogaTimerProps {
  targetMinutes?: number;
  onComplete?: (elapsedMinutes: number) => void;
  onStart?: () => void;
}

export const YogaTimer: React.FC<YogaTimerProps> = ({ targetMinutes, onComplete, onStart }) => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const pausedTimeRef = useRef<number>(0);

  useEffect(() => {
    if (isRunning && !isPaused) {
      startTimeRef.current = Date.now() - (elapsedSeconds * 1000);

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef.current!) / 1000);
        setElapsedSeconds(elapsed);

        // Check if target reached
        if (targetMinutes && elapsed >= targetMinutes * 60) {
          clearInterval(intervalRef.current!);
          setIsRunning(false);
          setIsPaused(false);
          if (onComplete) {
            onComplete(parseFloat((elapsed / 60).toFixed(2)));
          }
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, targetMinutes]);

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
    if (onStart) {
      onStart();
    }
  };

  const handlePause = () => {
    setIsPaused(true);
    pausedTimeRef.current = elapsedSeconds;
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    if (onComplete) {
      onComplete(parseFloat((elapsedSeconds / 60).toFixed(2)));
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    setElapsedSeconds(0);
    pausedTimeRef.current = 0;
  };

  const handleComplete = () => {
    setIsRunning(false);
    setIsPaused(false);
    if (onComplete) {
      onComplete(parseFloat((elapsedSeconds / 60).toFixed(2)));
    }
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getTargetProgress = (): string => {
    if (!targetMinutes) return '';
    const targetSeconds = targetMinutes * 60;
    const progress = Math.min(100, (elapsedSeconds / targetSeconds) * 100);
    return `${Math.round(progress)}%`;
  };

  return (
    <View style={styles.container} testID="yoga-timer">
      <View style={styles.timeContainer}>
        <Text style={styles.timeText} testID="timer-display">
          {formatTime(elapsedSeconds)}
        </Text>
        {targetMinutes && (
          <Text style={styles.targetText} testID="target-display">
            Target: {targetMinutes} min ({getTargetProgress()})
          </Text>
        )}
      </View>

      <View style={styles.controls}>
        {!isRunning && elapsedSeconds === 0 && (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
            testID="start-button"
          >
            <Text style={styles.buttonText}>Start</Text>
          </TouchableOpacity>
        )}

        {isRunning && !isPaused && (
          <>
            <TouchableOpacity
              style={styles.pauseButton}
              onPress={handlePause}
              testID="pause-button"
            >
              <Text style={styles.buttonText}>Pause</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStop}
              testID="stop-button"
            >
              <Text style={styles.buttonText}>Finish</Text>
            </TouchableOpacity>
          </>
        )}

        {isPaused && (
          <>
            <TouchableOpacity
              style={styles.resumeButton}
              onPress={handleResume}
              testID="resume-button"
            >
              <Text style={styles.buttonText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStop}
              testID="stop-button"
            >
              <Text style={styles.buttonText}>Finish</Text>
            </TouchableOpacity>
          </>
        )}

        {!isRunning && elapsedSeconds > 0 && (
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleReset}
            testID="reset-button"
          >
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center'
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 30
  },
  timeText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: 'monospace'
  },
  targetText: {
    fontSize: 18,
    color: '#666',
    marginTop: 10
  },
  controls: {
    flexDirection: 'row',
    gap: 15
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8
  },
  pauseButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8
  },
  resumeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8
  },
  stopButton: {
    backgroundColor: '#F44336',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8
  },
  resetButton: {
    backgroundColor: '#9E9E9E',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 8
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold'
  }
});
