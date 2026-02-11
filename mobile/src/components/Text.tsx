import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

interface SigilTextProps extends TextProps {
  variant?: 'title' | 'subtitle' | 'body';
}

export function Text({ variant = 'body', style, ...props }: SigilTextProps) {
  const variantStyle = variant === 'title'
    ? styles.title
    : variant === 'subtitle'
    ? styles.subtitle
    : styles.body;

  return <RNText style={[variantStyle, style]} {...props} />;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  body: {
    fontSize: 14,
    color: '#333',
  },
});
