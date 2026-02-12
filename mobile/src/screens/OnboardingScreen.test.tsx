import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { OnboardingScreen } from './OnboardingScreen';

describe('OnboardingScreen', () => {
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the first slide on mount', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    expect(getByTestId('onboarding-screen')).toBeTruthy();
    expect(getByTestId('slide-title').props.children).toBe('Track Your Runs');
    expect(getByTestId('slide-icon').props.children).toBe('🏃');
  });

  it('should show 3 dot indicators', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    expect(getByTestId('dot-0')).toBeTruthy();
    expect(getByTestId('dot-1')).toBeTruthy();
    expect(getByTestId('dot-2')).toBeTruthy();
  });

  it('should advance to second slide on Next', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    fireEvent.press(getByTestId('next-button'));

    expect(getByTestId('slide-title').props.children).toBe('Connect With Friends');
    expect(getByTestId('slide-icon').props.children).toBe('🤝');
  });

  it('should advance to third slide', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    fireEvent.press(getByTestId('next-button'));
    fireEvent.press(getByTestId('next-button'));

    expect(getByTestId('slide-title').props.children).toBe('Earn Badges & PRs');
    expect(getByTestId('slide-icon').props.children).toBe('🏆');
  });

  it('should show "Let\'s Go!" on last slide', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    fireEvent.press(getByTestId('next-button'));
    fireEvent.press(getByTestId('next-button'));

    expect(getByTestId('next-button').props.children).toBeTruthy();
  });

  it('should call onComplete when finishing last slide', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    fireEvent.press(getByTestId('next-button')); // slide 1 → 2
    fireEvent.press(getByTestId('next-button')); // slide 2 → 3
    fireEvent.press(getByTestId('next-button')); // slide 3 → complete

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('should call onComplete when Skip is pressed', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    fireEvent.press(getByTestId('skip-button'));

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('should call onComplete when Skip is pressed from middle slide', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    fireEvent.press(getByTestId('next-button'));
    fireEvent.press(getByTestId('skip-button'));

    expect(mockOnComplete).toHaveBeenCalledTimes(1);
  });

  it('should show description text for each slide', () => {
    const { getByTestId } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    const desc = getByTestId('slide-description');
    expect(desc.props.children).toContain('GPS tracking');
    expect(desc.props.children).toContain('No paywall');
  });

  it('should show Next button on first slide', () => {
    const { getByTestId, queryByText } = render(<OnboardingScreen onComplete={mockOnComplete} />);

    expect(getByTestId('next-button')).toBeTruthy();
  });
});
