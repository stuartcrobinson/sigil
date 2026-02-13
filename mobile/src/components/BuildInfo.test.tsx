import React from 'react';
import { render } from '@testing-library/react-native';
import { BuildInfo } from './BuildInfo';

describe('BuildInfo', () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_BUILD_TIME;
    delete process.env.EXPO_PUBLIC_GIT_COMMIT;
    delete process.env.EXPO_PUBLIC_DEPLOY_ENV;
  });

  it('renders build info when env vars are set', () => {
    process.env.EXPO_PUBLIC_BUILD_TIME = '2026-02-12 14:30';
    process.env.EXPO_PUBLIC_GIT_COMMIT = 'abc1234';
    const { getByTestId, getByText } = render(<BuildInfo />);
    expect(getByTestId('build-info')).toBeTruthy();
    expect(getByText('abc1234 | 2026-02-12 14:30')).toBeTruthy();
  });

  it('renders nothing when no env vars are set', () => {
    const { queryByTestId } = render(<BuildInfo />);
    expect(queryByTestId('build-info')).toBeNull();
  });

  it('renders with only build time', () => {
    process.env.EXPO_PUBLIC_BUILD_TIME = '2026-02-12 14:30';
    const { getByText } = render(<BuildInfo />);
    expect(getByText('2026-02-12 14:30')).toBeTruthy();
  });

  it('renders environment label when set', () => {
    process.env.EXPO_PUBLIC_BUILD_TIME = '2026-02-12 14:30';
    process.env.EXPO_PUBLIC_GIT_COMMIT = 'abc1234';
    process.env.EXPO_PUBLIC_DEPLOY_ENV = 'staging';
    const { getByText } = render(<BuildInfo />);
    expect(getByText('STAGING | abc1234 | 2026-02-12 14:30')).toBeTruthy();
  });

  it('renders production label', () => {
    process.env.EXPO_PUBLIC_BUILD_TIME = '2026-02-12 14:30';
    process.env.EXPO_PUBLIC_GIT_COMMIT = 'abc1234';
    process.env.EXPO_PUBLIC_DEPLOY_ENV = 'production';
    const { getByText } = render(<BuildInfo />);
    expect(getByText('PRODUCTION | abc1234 | 2026-02-12 14:30')).toBeTruthy();
  });
});
