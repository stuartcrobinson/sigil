import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/api';
import { showAlert } from '../utils/platformAlert';
import { BuildInfo } from '../components/BuildInfo';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      await api.users.updateProfile(user.id, {
        name,
        bio: bio || null,
      });
      await refreshUser();
      setIsEditing(false);
      showAlert('Success', 'Profile updated successfully');
    } catch (error) {
      showAlert('Error', error instanceof Error ? error.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(user?.name || '');
    setBio(user?.bio || '');
    setIsEditing(false);
  };

  const handleLogout = () => {
    showAlert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <Text style={styles.email}>{user.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        {isEditing ? (
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            testID="name-input"
          />
        ) : (
          <Text style={styles.value} testID="name-display">
            {user.name}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Bio</Text>
        {isEditing ? (
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell us about yourself"
            multiline
            numberOfLines={4}
            testID="bio-input"
          />
        ) : (
          <Text style={styles.value} testID="bio-display">
            {user.bio || 'No bio yet'}
          </Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Member Since</Text>
        <Text style={styles.value}>{new Date(user.created_at).toLocaleDateString()}</Text>
      </View>

      <View style={styles.actions}>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, isSaving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              testID="save-button"
            >
              {isSaving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={handleCancel}
              testID="cancel-button"
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => setIsEditing(true)}
              testID="edit-button"
            >
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.dangerButton]}
              onPress={handleLogout}
              testID="logout-button"
            >
              <Text style={styles.buttonText}>Logout</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
      <BuildInfo />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  email: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  actions: {
    padding: 20,
    gap: 12,
  },
  button: {
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dangerButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
});
