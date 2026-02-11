import * as ImagePicker from 'expo-image-picker';

export interface PhotoResult {
  uri: string;
  width: number;
  height: number;
}

/**
 * Request camera and media library permissions.
 * Returns true if both are granted.
 */
export async function requestPermissions(): Promise<boolean> {
  const cameraResult = await ImagePicker.requestCameraPermissionsAsync();
  const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return cameraResult.granted && mediaResult.granted;
}

/**
 * Launch the camera and take a photo.
 * Returns the photo result or null if cancelled/denied.
 */
export async function takePhoto(): Promise<PhotoResult | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
  };
}

/**
 * Open the gallery/photo library and pick an image.
 * Returns the photo result or null if cancelled/denied.
 */
export async function pickFromGallery(): Promise<PhotoResult | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
  };
}
