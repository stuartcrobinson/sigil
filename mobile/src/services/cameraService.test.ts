import * as ImagePicker from 'expo-image-picker';
import { requestPermissions, takePhoto, pickFromGallery, PhotoResult } from './cameraService';

jest.mock('expo-image-picker');

const mockImagePicker = ImagePicker as jest.Mocked<typeof ImagePicker>;

const mockAsset: ImagePicker.ImagePickerAsset = {
  uri: 'file:///photo/test.jpg',
  width: 1920,
  height: 1080,
  type: 'image',
  fileName: 'test.jpg',
  fileSize: 500000,
  mimeType: 'image/jpeg',
  assetId: null,
  base64: null,
  duration: null,
  exif: null,
};

const grantedPermission: ImagePicker.PermissionResponse = {
  granted: true,
  status: ImagePicker.PermissionStatus.GRANTED,
  expires: 'never',
  canAskAgain: true,
};

const deniedPermission: ImagePicker.PermissionResponse = {
  granted: false,
  status: ImagePicker.PermissionStatus.DENIED,
  expires: 'never',
  canAskAgain: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('cameraService', () => {
  describe('requestPermissions', () => {
    it('returns true when both camera and media permissions are granted', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue(grantedPermission);
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue(grantedPermission);

      const result = await requestPermissions();
      expect(result).toBe(true);
      expect(mockImagePicker.requestCameraPermissionsAsync).toHaveBeenCalled();
      expect(mockImagePicker.requestMediaLibraryPermissionsAsync).toHaveBeenCalled();
    });

    it('returns false when camera permission is denied', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue(deniedPermission);
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue(grantedPermission);

      const result = await requestPermissions();
      expect(result).toBe(false);
    });

    it('returns false when media library permission is denied', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue(grantedPermission);
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue(deniedPermission);

      const result = await requestPermissions();
      expect(result).toBe(false);
    });

    it('returns false when both permissions are denied', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue(deniedPermission);
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue(deniedPermission);

      const result = await requestPermissions();
      expect(result).toBe(false);
    });
  });

  describe('takePhoto', () => {
    it('returns photo result when camera capture succeeds', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue(grantedPermission);
      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      const result = await takePhoto();
      expect(result).toEqual({
        uri: 'file:///photo/test.jpg',
        width: 1920,
        height: 1080,
      });
    });

    it('calls launchCameraAsync with correct options', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue(grantedPermission);
      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      await takePhoto();
      expect(mockImagePicker.launchCameraAsync).toHaveBeenCalledWith({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
    });

    it('returns null when user cancels camera', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue(grantedPermission);
      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: true,
        assets: [],
      });

      const result = await takePhoto();
      expect(result).toBeNull();
    });

    it('returns null when camera permission is denied', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue(deniedPermission);

      const result = await takePhoto();
      expect(result).toBeNull();
      expect(mockImagePicker.launchCameraAsync).not.toHaveBeenCalled();
    });

    it('returns null when assets array is empty', async () => {
      mockImagePicker.requestCameraPermissionsAsync.mockResolvedValue(grantedPermission);
      mockImagePicker.launchCameraAsync.mockResolvedValue({
        canceled: false,
        assets: [],
      });

      const result = await takePhoto();
      expect(result).toBeNull();
    });
  });

  describe('pickFromGallery', () => {
    it('returns photo result when gallery selection succeeds', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue(grantedPermission);
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      const result = await pickFromGallery();
      expect(result).toEqual({
        uri: 'file:///photo/test.jpg',
        width: 1920,
        height: 1080,
      });
    });

    it('calls launchImageLibraryAsync with correct options', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue(grantedPermission);
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [mockAsset],
      });

      await pickFromGallery();
      expect(mockImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });
    });

    it('returns null when user cancels gallery picker', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue(grantedPermission);
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: true,
        assets: [],
      });

      const result = await pickFromGallery();
      expect(result).toBeNull();
    });

    it('returns null when media library permission is denied', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue(deniedPermission);

      const result = await pickFromGallery();
      expect(result).toBeNull();
      expect(mockImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    });

    it('returns null when assets array is empty', async () => {
      mockImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue(grantedPermission);
      mockImagePicker.launchImageLibraryAsync.mockResolvedValue({
        canceled: false,
        assets: [],
      });

      const result = await pickFromGallery();
      expect(result).toBeNull();
    });
  });
});
