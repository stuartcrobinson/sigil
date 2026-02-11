import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from './Text';

describe('Text', () => {
  it('renders correctly with default body variant', () => {
    const { getByText } = render(<Text>Hello</Text>);
    expect(getByText('Hello')).toBeTruthy();
  });

  it('renders with title variant', () => {
    const { getByText } = render(<Text variant="title">Title Text</Text>);
    const element = getByText('Title Text');
    expect(element).toBeTruthy();
  });

  it('renders with subtitle variant', () => {
    const { getByText } = render(<Text variant="subtitle">Subtitle Text</Text>);
    const element = getByText('Subtitle Text');
    expect(element).toBeTruthy();
  });
});
