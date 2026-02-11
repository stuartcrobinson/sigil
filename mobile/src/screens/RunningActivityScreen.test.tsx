import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { RunningActivityScreen } from './RunningActivityScreen';
import * as locationService from '../services/locationService';
import * as activityService from '../services/activityService';

// Mock the services
jest.mock('../services/locationService');
jest.mock('../services/activityService');

const mockLocationService = locationService as jest.Mocked<typeof locationService>;
const mockActivityService = activityService as jest.Mocked<typeof activityService>;

describe('RunningActivityScreen', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockLocationService.isCurrentlyTracking.mockReturnValue(false);
    mockLocationService.getRoutePoints.mockReturnValue([]);
    mockLocationService.totalRouteDistance.mockReturnValue(0);
    mockLocationService.currentPace.mockReturnValue(0);
    mockLocationService.formatPace.mockReturnValue('--:--');
    mockLocationService.stopTracking.mockReturnValue([]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Idle State', () => {
    it('renders idle view with sport selector', () => {
      const { getByTestId, getByText } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      expect(getByTestId('running-idle-view')).toBeTruthy();
      expect(getByText('Start Activity')).toBeTruthy();
      expect(getByTestId('sport-selector')).toBeTruthy();
    });

    it('shows three sport options: Run, Walk, Ride', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      expect(getByTestId('sport-running')).toBeTruthy();
      expect(getByTestId('sport-walking')).toBeTruthy();
      expect(getByTestId('sport-biking')).toBeTruthy();
    });

    it('defaults to running sport type', () => {
      const { getByText } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      expect(getByText('Start Running')).toBeTruthy();
    });

    it('changes sport type when walking is selected', () => {
      const { getByTestId, getByText } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('sport-walking'));
      expect(getByText('Start Walking')).toBeTruthy();
    });

    it('changes sport type when biking is selected', () => {
      const { getByTestId, getByText } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('sport-biking'));
      expect(getByText('Start Biking')).toBeTruthy();
    });

    it('calls onCancel when back button is pressed', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('back-button'));
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('does not render back button when onCancel is not provided', () => {
      const { queryByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} />
      );

      expect(queryByTestId('back-button')).toBeNull();
    });
  });

  describe('Tracking State', () => {
    it('transitions to tracking when start button is pressed', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      expect(getByTestId('running-tracking-view')).toBeTruthy();
    });

    it('starts GPS tracking when activity begins', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      expect(mockLocationService.startTracking).toHaveBeenCalledWith(
        expect.any(Function),
        { intervalMs: 5000, distanceIntervalM: 10 }
      );
    });

    it('displays elapsed time', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      expect(getByTestId('elapsed-time')).toBeTruthy();
    });

    it('displays distance', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      expect(getByTestId('distance-display')).toBeTruthy();
    });

    it('displays pace', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      expect(getByTestId('pace-display')).toBeTruthy();
    });

    it('shows map placeholder', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      expect(getByTestId('map-placeholder')).toBeTruthy();
    });

    it('shows pause and stop buttons during tracking', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      expect(getByTestId('pause-button')).toBeTruthy();
      expect(getByTestId('stop-button')).toBeTruthy();
    });

    it('updates distance display with correct value when GPS point received', () => {
      const mockPoints = [
        { lat: 40.7829, lng: -73.9654, timestamp: 1000 },
        { lat: 40.7830, lng: -73.9655, timestamp: 6000 },
      ];
      mockLocationService.getRoutePoints.mockReturnValue(mockPoints);
      mockLocationService.totalRouteDistance.mockReturnValue(150);
      mockLocationService.currentPace.mockReturnValue(360);
      mockLocationService.formatPace.mockReturnValue('6:00');

      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));

      // Simulate GPS callback
      const gpsCallback = mockLocationService.startTracking.mock.calls[0][0];
      act(() => {
        gpsCallback(mockPoints[1]);
      });

      // Verify the distance display shows the correct value (150m)
      const distanceDisplay = getByTestId('distance-display');
      expect(distanceDisplay).toBeTruthy();
      expect(distanceDisplay.props.children).toBe('150 m');
    });

    it('updates pace display with correct value when GPS point received', () => {
      const mockPoints = [
        { lat: 40.7829, lng: -73.9654, timestamp: 1000 },
        { lat: 40.7830, lng: -73.9655, timestamp: 6000 },
      ];
      mockLocationService.getRoutePoints.mockReturnValue(mockPoints);
      mockLocationService.totalRouteDistance.mockReturnValue(1500);
      mockLocationService.currentPace.mockReturnValue(360);
      mockLocationService.formatPace.mockReturnValue('6:00');

      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));

      const gpsCallback = mockLocationService.startTracking.mock.calls[0][0];
      act(() => {
        gpsCallback(mockPoints[1]);
      });

      // Verify pace display shows formatted pace
      const paceDisplay = getByTestId('pace-display');
      expect(paceDisplay.props.children).toBe('6:00/km');
    });
  });

  describe('Pause/Resume', () => {
    it('shows paused banner when paused', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      fireEvent.press(getByTestId('pause-button'));

      expect(getByTestId('paused-banner')).toBeTruthy();
    });

    it('stops GPS tracking when paused', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      fireEvent.press(getByTestId('pause-button'));

      expect(mockLocationService.stopTracking).toHaveBeenCalled();
    });

    it('shows resume button when paused', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      fireEvent.press(getByTestId('pause-button'));

      expect(getByTestId('resume-button')).toBeTruthy();
    });

    it('resumes tracking when resume is pressed', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      fireEvent.press(getByTestId('pause-button'));
      fireEvent.press(getByTestId('resume-button'));

      // startTracking called twice: once on start, once on resume
      expect(mockLocationService.startTracking).toHaveBeenCalledTimes(2);
    });
  });

  describe('Summary State', () => {
    it('shows summary after stopping', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      fireEvent.press(getByTestId('stop-button'));

      expect(getByTestId('running-summary-view')).toBeTruthy();
    });

    it('displays summary stats', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      fireEvent.press(getByTestId('stop-button'));

      expect(getByTestId('summary-sport')).toBeTruthy();
      expect(getByTestId('summary-duration')).toBeTruthy();
      expect(getByTestId('summary-distance')).toBeTruthy();
      expect(getByTestId('summary-pace')).toBeTruthy();
      expect(getByTestId('summary-points')).toBeTruthy();
    });

    it('shows save and discard buttons', () => {
      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      fireEvent.press(getByTestId('stop-button'));

      expect(getByTestId('save-activity-button')).toBeTruthy();
      expect(getByTestId('discard-button')).toBeTruthy();
    });

    it('saves activity to backend when save is pressed', async () => {
      mockActivityService.createActivity.mockResolvedValue({
        id: 42,
        user_id: 1,
        sport_type: 'running',
        start_time: '2024-01-01T00:00:00Z',
        visibility: 'public',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      fireEvent.press(getByTestId('stop-button'));

      await act(async () => {
        fireEvent.press(getByTestId('save-activity-button'));
      });

      await waitFor(() => {
        expect(mockActivityService.createActivity).toHaveBeenCalledWith(
          expect.objectContaining({
            sport_type: 'running',
            visibility: 'public',
          })
        );
        expect(mockOnSave).toHaveBeenCalledWith(42);
      });
    });

    it('shows error alert when save fails', async () => {
      const alertSpy = jest.spyOn(Alert, 'alert');
      mockActivityService.createActivity.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      fireEvent.press(getByTestId('stop-button'));

      await act(async () => {
        fireEvent.press(getByTestId('save-activity-button'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Save Failed', 'Network error');
      });
    });

    it('shows confirmation dialog when discarding with elapsed time', () => {
      const alertSpy = jest.spyOn(Alert, 'alert');

      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));

      // Advance time so elapsed > 0
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      fireEvent.press(getByTestId('stop-button'));
      fireEvent.press(getByTestId('discard-button'));

      expect(alertSpy).toHaveBeenCalledWith(
        'Discard Activity?',
        'Are you sure you want to discard this activity?',
        expect.any(Array)
      );
    });
  });

  describe('Sport Type Selection', () => {
    it('saves activity with walking sport type', async () => {
      mockActivityService.createActivity.mockResolvedValue({
        id: 43,
        user_id: 1,
        sport_type: 'walking',
        start_time: '2024-01-01T00:00:00Z',
        visibility: 'public',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('sport-walking'));
      fireEvent.press(getByTestId('start-activity-button'));
      fireEvent.press(getByTestId('stop-button'));

      await act(async () => {
        fireEvent.press(getByTestId('save-activity-button'));
      });

      await waitFor(() => {
        expect(mockActivityService.createActivity).toHaveBeenCalledWith(
          expect.objectContaining({ sport_type: 'walking' })
        );
      });
    });

    it('saves activity with biking sport type', async () => {
      mockActivityService.createActivity.mockResolvedValue({
        id: 44,
        user_id: 1,
        sport_type: 'biking',
        start_time: '2024-01-01T00:00:00Z',
        visibility: 'public',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('sport-biking'));
      fireEvent.press(getByTestId('start-activity-button'));
      fireEvent.press(getByTestId('stop-button'));

      await act(async () => {
        fireEvent.press(getByTestId('save-activity-button'));
      });

      await waitFor(() => {
        expect(mockActivityService.createActivity).toHaveBeenCalledWith(
          expect.objectContaining({ sport_type: 'biking' })
        );
      });
    });
  });

  describe('GPS Data in Saved Activity', () => {
    it('includes route_points in sport_data when saving', async () => {
      const mockPoints = [
        { lat: 40.7829, lng: -73.9654, timestamp: 1000 },
        { lat: 40.7830, lng: -73.9655, timestamp: 6000 },
      ];
      mockLocationService.stopTracking.mockReturnValue(mockPoints);
      mockLocationService.getRoutePoints.mockReturnValue(mockPoints);
      mockActivityService.createActivity.mockResolvedValue({
        id: 45,
        user_id: 1,
        sport_type: 'running',
        start_time: '2024-01-01T00:00:00Z',
        visibility: 'public',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      });

      const { getByTestId } = render(
        <RunningActivityScreen onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      fireEvent.press(getByTestId('start-activity-button'));
      fireEvent.press(getByTestId('stop-button'));

      await act(async () => {
        fireEvent.press(getByTestId('save-activity-button'));
      });

      await waitFor(() => {
        expect(mockActivityService.createActivity).toHaveBeenCalledWith(
          expect.objectContaining({
            sport_data: expect.objectContaining({
              route_points: mockPoints,
            }),
          })
        );
      });
    });
  });
});
