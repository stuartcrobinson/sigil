import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { YogaTimer } from './YogaTimer';

describe('YogaTimer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render with initial state', () => {
    const { getByTestId } = render(<YogaTimer />);

    expect(getByTestId('yoga-timer')).toBeTruthy();
    expect(getByTestId('timer-display')).toHaveTextContent('0:00');
    expect(getByTestId('start-button')).toBeTruthy();
  });

  it('should render with target minutes', () => {
    const { getByTestId } = render(<YogaTimer targetMinutes={30} />);

    expect(getByTestId('target-display')).toHaveTextContent('Target: 30 min (0%)');
  });

  it('should start timer when start button is pressed', () => {
    const { getByTestId } = render(<YogaTimer />);

    fireEvent.press(getByTestId('start-button'));

    expect(getByTestId('pause-button')).toBeTruthy();
    expect(getByTestId('stop-button')).toBeTruthy();
  });

  it('should increment time when timer is running', () => {
    const { getByTestId } = render(<YogaTimer />);

    fireEvent.press(getByTestId('start-button'));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(getByTestId('timer-display').props.children).not.toBe('0:00');
  });

  it('should pause timer when pause button is pressed', () => {
    const { getByTestId } = render(<YogaTimer />);

    fireEvent.press(getByTestId('start-button'));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    fireEvent.press(getByTestId('pause-button'));

    expect(getByTestId('resume-button')).toBeTruthy();
    const pausedTime = getByTestId('timer-display').props.children;
    expect(pausedTime).not.toBe('0:00');

    // Advance while paused — timer should NOT change
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(getByTestId('timer-display').props.children).toBe(pausedTime);
  });

  it('should resume timer when resume button is pressed', () => {
    const { getByTestId } = render(<YogaTimer />);

    fireEvent.press(getByTestId('start-button'));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    fireEvent.press(getByTestId('pause-button'));
    const pausedTime = getByTestId('timer-display').props.children;

    fireEvent.press(getByTestId('resume-button'));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(getByTestId('timer-display').props.children).not.toBe(pausedTime);
  });

  it('should stop timer and call onComplete when finish button is pressed', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<YogaTimer onComplete={onComplete} />);

    fireEvent.press(getByTestId('start-button'));

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    fireEvent.press(getByTestId('stop-button'));

    expect(onComplete).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalledWith(expect.any(Number));
    const calledWith = onComplete.mock.calls[0][0];
    expect(calledWith).toBeGreaterThan(0);
    expect(getByTestId('reset-button')).toBeTruthy();
  });

  it('should reset timer when reset button is pressed', () => {
    const { getByTestId } = render(<YogaTimer />);

    fireEvent.press(getByTestId('start-button'));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    fireEvent.press(getByTestId('stop-button'));
    fireEvent.press(getByTestId('reset-button'));

    expect(getByTestId('timer-display')).toHaveTextContent('0:00');
    expect(getByTestId('start-button')).toBeTruthy();
  });

  it('should format time correctly for minutes and seconds', () => {
    const { getByTestId } = render(<YogaTimer />);

    fireEvent.press(getByTestId('start-button'));

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    const time = getByTestId('timer-display').props.children;
    expect(time).toMatch(/0:0[2-9]|0:[1-5][0-9]/);
  });

  it('should update target progress percentage', () => {
    const { getByTestId } = render(<YogaTimer targetMinutes={1} />);

    fireEvent.press(getByTestId('start-button'));

    act(() => {
      jest.advanceTimersByTime(30000); // 30 seconds = 50% of 1 minute
    });

    const displayElement = getByTestId('target-display');
    const displayText = Array.isArray(displayElement.props.children)
      ? displayElement.props.children.join('')
      : displayElement.props.children;
    expect(displayText).toContain('%');
    expect(displayText).not.toContain('(0%)');
  });

  it('should call onComplete when target time is reached', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<YogaTimer targetMinutes={0.05} onComplete={onComplete} />);

    fireEvent.press(getByTestId('start-button'));

    // 0.05 min = 3 seconds. Advance past that.
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(onComplete).toHaveBeenCalled();
  });

  it('should not auto-call onComplete when target is not set', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<YogaTimer onComplete={onComplete} />);

    fireEvent.press(getByTestId('start-button'));

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // onComplete should not be auto-called (no target set)
    expect(onComplete).not.toHaveBeenCalled();

    // But should be called when stop button is pressed
    fireEvent.press(getByTestId('stop-button'));
    expect(onComplete).toHaveBeenCalled();
  });

  it('should handle pause and stop correctly', () => {
    const onComplete = jest.fn();
    const { getByTestId } = render(<YogaTimer onComplete={onComplete} />);

    fireEvent.press(getByTestId('start-button'));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    const timeBeforePause = getByTestId('timer-display').props.children;
    expect(timeBeforePause).not.toBe('0:00');

    fireEvent.press(getByTestId('pause-button'));

    fireEvent.press(getByTestId('stop-button'));
    expect(onComplete).toHaveBeenCalled();
    expect(onComplete.mock.calls[0][0]).toBeGreaterThan(0);
  });

  it('should maintain accurate time across pause/resume cycles', () => {
    const { getByTestId } = render(<YogaTimer />);

    fireEvent.press(getByTestId('start-button'));

    // Run for 2 seconds
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    fireEvent.press(getByTestId('pause-button'));
    const timeAfterPause = getByTestId('timer-display').props.children;
    expect(timeAfterPause).not.toBe('0:00');

    // 3 seconds while paused — timer should NOT advance
    act(() => {
      jest.advanceTimersByTime(3000);
    });
    expect(getByTestId('timer-display').props.children).toBe(timeAfterPause);

    fireEvent.press(getByTestId('resume-button'));

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // Time should have advanced past paused time
    expect(getByTestId('timer-display').props.children).not.toBe(timeAfterPause);
  });
});
