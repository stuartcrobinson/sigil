import { likeActivity, unlikeActivity, getLikes, addComment, getComments, deleteComment } from './interactionService';

const mockFetch = jest.fn();
global.fetch = mockFetch;

jest.mock('../utils/storage', () => ({
  getToken: jest.fn(() => Promise.resolve('test-token')),
}));

describe('interactionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('likeActivity', () => {
    it('should like an activity with default type', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1, like_type: 'like' }) });

      await likeActivity(1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/activities/1/like'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ like_type: 'like' }),
        })
      );
    });

    it('should high-five an activity', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ id: 1, like_type: 'high_five' }) });

      await likeActivity(1, 'high_five');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/activities/1/like'),
        expect.objectContaining({
          body: JSON.stringify({ like_type: 'high_five' }),
        })
      );
    });

    it('should throw on error response', async () => {
      mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Already liked' }) });

      await expect(likeActivity(1)).rejects.toThrow('Already liked');
    });

    it('should throw without auth token', async () => {
      const storage = require('../utils/storage');
      storage.getToken.mockResolvedValueOnce(null);

      await expect(likeActivity(1)).rejects.toThrow('No authentication token');
    });
  });

  describe('unlikeActivity', () => {
    it('should unlike an activity', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ message: 'removed' }) });

      await unlikeActivity(1);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/activities/1/like'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should throw on error response', async () => {
      mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Like not found' }) });

      await expect(unlikeActivity(1)).rejects.toThrow('Like not found');
    });
  });

  describe('getLikes', () => {
    it('should fetch likes for an activity', async () => {
      const mockData = {
        likes: [{ id: 1, like_type: 'like', user: { id: 1, name: 'Test' } }],
        like_count: 1,
        high_five_count: 0,
        total: 1,
      };
      mockFetch.mockResolvedValue({ ok: true, json: async () => mockData });

      const result = await getLikes(1);

      expect(result.like_count).toBe(1);
      expect(result.likes).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/activities/1/likes'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        })
      );
    });

    it('should throw on error', async () => {
      mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Not found' }) });

      await expect(getLikes(999)).rejects.toThrow('Not found');
    });
  });

  describe('addComment', () => {
    it('should add a comment', async () => {
      const mockComment = { id: 1, text: 'Great!', user: { id: 1, name: 'Test' } };
      mockFetch.mockResolvedValue({ ok: true, json: async () => mockComment });

      const result = await addComment(1, 'Great!');

      expect(result.text).toBe('Great!');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/activities/1/comments'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ text: 'Great!' }),
        })
      );
    });

    it('should throw on empty comment error', async () => {
      mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'Comment text is required' }) });

      await expect(addComment(1, '')).rejects.toThrow('Comment text is required');
    });
  });

  describe('getComments', () => {
    it('should fetch comments for an activity', async () => {
      const mockData = {
        comments: [{ id: 1, text: 'Nice!', user: { id: 1, name: 'Test' } }],
        count: 1,
      };
      mockFetch.mockResolvedValue({ ok: true, json: async () => mockData });

      const result = await getComments(1);

      expect(result.comments).toHaveLength(1);
      expect(result.count).toBe(1);
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ message: 'deleted' }) });

      await deleteComment(1, 5);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/activities/1/comments/5'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('should throw on permission error', async () => {
      mockFetch.mockResolvedValue({ ok: false, json: async () => ({ error: 'only delete your own' }) });

      await expect(deleteComment(1, 5)).rejects.toThrow('only delete your own');
    });
  });
});
