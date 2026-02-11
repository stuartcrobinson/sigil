import { addPhoto, getPhotos, deletePhoto } from './photoService';

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('../utils/storage', () => ({
  getToken: jest.fn(() => Promise.resolve('test-token')),
}));

describe('photoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('addPhoto', () => {
    it('should add a photo with GPS coordinates', async () => {
      const mockPhoto = {
        id: 1, photo_url: 'https://example.com/photo.jpg',
        latitude: 40.7829, longitude: -73.9654, route_position_meters: 1500,
      };
      mockFetch.mockResolvedValue({ ok: true, json: async () => mockPhoto });

      const result = await addPhoto(1, {
        photo_url: 'https://example.com/photo.jpg',
        latitude: 40.7829,
        longitude: -73.9654,
        route_position_meters: 1500,
      });

      expect(result.id).toBe(1);
      expect(result.latitude).toBe(40.7829);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/activities/1/photos'),
        expect.objectContaining({
          method: 'POST',
        })
      );
      // Verify request body contains exact GPS coordinates and photo URL (not just stringContaining)
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.photo_url).toBe('https://example.com/photo.jpg');
      expect(callBody.latitude).toBe(40.7829);
      expect(callBody.longitude).toBe(-73.9654);
      expect(callBody.route_position_meters).toBe(1500);
    });

    it('should add a photo without GPS', async () => {
      const mockPhoto = { id: 2, photo_url: 'https://example.com/photo.jpg' };
      mockFetch.mockResolvedValue({ ok: true, json: async () => mockPhoto });

      const result = await addPhoto(1, { photo_url: 'https://example.com/photo.jpg' });

      expect(result.id).toBe(2);
    });

    it('should add a photo with caption', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 3, caption: 'Sunset' }) });

      await addPhoto(1, { photo_url: 'https://example.com/photo.jpg', caption: 'Sunset' });

      // Verify request body contains exact caption value (not just stringContaining)
      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.photo_url).toBe('https://example.com/photo.jpg');
      expect(callBody.caption).toBe('Sunset');
    });

    it('should throw on error response', async () => {
      mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Activity not found' }) });

      await expect(addPhoto(999, { photo_url: 'test.jpg' })).rejects.toThrow('Activity not found');
    });

    it('should throw without auth token', async () => {
      const storage = require('../utils/storage');
      storage.getToken.mockResolvedValueOnce(null);

      await expect(addPhoto(1, { photo_url: 'test.jpg' })).rejects.toThrow('No authentication token');
    });
  });

  describe('getPhotos', () => {
    it('should fetch photos for an activity', async () => {
      const mockData = {
        photos: [
          { id: 1, photo_url: 'photo1.jpg', route_position_meters: 1000 },
          { id: 2, photo_url: 'photo2.jpg', route_position_meters: 3000 },
        ],
        count: 2,
      };
      mockFetch.mockResolvedValue({ ok: true, json: async () => mockData });

      const result = await getPhotos(1);

      expect(result.photos).toHaveLength(2);
      expect(result.count).toBe(2);
    });

    it('should return empty for activity with no photos', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ photos: [], count: 0 }) });

      const result = await getPhotos(1);

      expect(result.photos).toHaveLength(0);
      expect(result.count).toBe(0);
    });

    it('should throw on permission error', async () => {
      mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'no permission' }) });

      await expect(getPhotos(1)).rejects.toThrow('no permission');
    });
  });

  describe('deletePhoto', () => {
    it('should delete a photo', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ message: 'deleted' }) });

      await deletePhoto(1, 5);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/activities/1/photos/5'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should throw on permission error', async () => {
      mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'only your own' }) });

      await expect(deletePhoto(1, 5)).rejects.toThrow('only your own');
    });
  });
});
