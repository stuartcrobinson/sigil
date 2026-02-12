import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Text } from '../components/Text';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  icon: string;
  title: string;
  description: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    icon: '🏃',
    title: 'Track Your Runs',
    description: 'GPS tracking, pace, distance, route maps — all the features you need. No paywall. Ever.',
  },
  {
    icon: '🤝',
    title: 'Connect With Friends',
    description: 'Follow athletes, give high-fives, comment on activities. A supportive community that celebrates every mile.',
  },
  {
    icon: '🏆',
    title: 'Earn Badges & PRs',
    description: 'Track your streaks, earn achievements, and beat your personal records. Everything Strava charges $80/year for — free forever.',
  },
];

interface OnboardingScreenProps {
  onComplete: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const isLastSlide = currentSlide === SLIDES.length - 1;
  const slide = SLIDES[currentSlide];

  const handleNext = () => {
    if (isLastSlide) {
      onComplete();
    } else {
      setCurrentSlide(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <View style={styles.container} testID="onboarding-screen">
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}
        testID="skip-button"
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <Text style={styles.icon} testID="slide-icon">{slide.icon}</Text>
        <Text style={styles.title} testID="slide-title">{slide.title}</Text>
        <Text style={styles.description} testID="slide-description">{slide.description}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDES.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, index === currentSlide && styles.dotActive]}
              testID={`dot-${index}`}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          testID="next-button"
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? "Let's Go!" : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 40,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 1,
    padding: 8,
  },
  skipText: {
    color: '#999',
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  icon: {
    fontSize: 80,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 17,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  footer: {
    paddingHorizontal: 30,
    alignItems: 'center',
  },
  dots: {
    flexDirection: 'row',
    marginBottom: 30,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#DDD',
  },
  dotActive: {
    backgroundColor: '#4CAF50',
    width: 24,
  },
  nextButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    width: width - 60,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default OnboardingScreen;
