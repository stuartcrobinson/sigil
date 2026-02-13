import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function BuildInfo() {
  const buildTime = process.env.EXPO_PUBLIC_BUILD_TIME;
  const gitCommit = process.env.EXPO_PUBLIC_GIT_COMMIT;
  const deployEnv = process.env.EXPO_PUBLIC_DEPLOY_ENV;

  if (!buildTime && !gitCommit) return null;

  const isStaging = deployEnv === 'staging';

  const parts: string[] = [];
  if (deployEnv) parts.push(deployEnv.toUpperCase());
  if (gitCommit) parts.push(gitCommit);
  if (buildTime) parts.push(buildTime);

  return (
    <View style={[styles.container, isStaging && styles.stagingContainer]} testID="build-info">
      <Text style={[styles.text, isStaging && styles.stagingText]}>
        {parts.join(' | ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  stagingContainer: {
    backgroundColor: '#fff3cd',
    borderRadius: 4,
    marginHorizontal: 20,
  },
  text: {
    fontSize: 11,
    color: '#aaa',
  },
  stagingText: {
    color: '#856404',
    fontWeight: '600',
  },
});
