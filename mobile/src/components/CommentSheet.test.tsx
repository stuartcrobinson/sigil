import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { CommentSheet } from './CommentSheet';
import * as interactionService from '../services/interactionService';

// Mock the interaction service
jest.mock('../services/interactionService');
const mockGetComments = interactionService.getComments as jest.MockedFunction<typeof interactionService.getComments>;
const mockAddComment = interactionService.addComment as jest.MockedFunction<typeof interactionService.addComment>;
const mockDeleteComment = interactionService.deleteComment as jest.MockedFunction<typeof interactionService.deleteComment>;

const sampleComments: interactionService.Comment[] = [
  {
    id: 1,
    text: 'Great run!',
    created_at: new Date(Date.now() - 5 * 60000).toISOString(), // 5 mins ago
    updated_at: new Date(Date.now() - 5 * 60000).toISOString(),
    user: { id: 10, name: 'Alice', photo_url: null },
  },
  {
    id: 2,
    text: 'Nice pace!',
    created_at: new Date(Date.now() - 2 * 60000).toISOString(), // 2 mins ago
    updated_at: new Date(Date.now() - 2 * 60000).toISOString(),
    user: { id: 20, name: 'Bob', photo_url: null },
  },
  {
    id: 3,
    text: 'Keep it up!',
    created_at: new Date(Date.now() - 60000).toISOString(), // 1 min ago
    updated_at: new Date(Date.now() - 60000).toISOString(),
    user: { id: 99, name: 'CurrentUser', photo_url: null }, // This is the current user
  },
];

const defaultProps = {
  visible: true,
  activityId: 42,
  currentUserId: 99,
  onClose: jest.fn(),
  onCommentCountChange: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetComments.mockResolvedValue({ comments: sampleComments, count: 3 });
  mockAddComment.mockResolvedValue({
    id: 100,
    text: 'New comment',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user: { id: 99, name: 'CurrentUser', photo_url: null },
  });
  mockDeleteComment.mockResolvedValue(undefined);
});

describe('CommentSheet', () => {
  describe('visibility and structure', () => {
    it('renders as a modal when visible is true', async () => {
      const { getByTestId } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        expect(getByTestId('comment-sheet')).toBeTruthy();
      });
    });

    it('shows Comments header with close button', async () => {
      const { getByText, getByTestId } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        expect(getByText('Comments')).toBeTruthy();
        expect(getByTestId('comment-sheet-close')).toBeTruthy();
      });
    });

    it('calls onClose when close button is pressed', async () => {
      const onClose = jest.fn();
      const { getByTestId } = render(<CommentSheet {...defaultProps} onClose={onClose} />);
      await waitFor(() => {
        expect(getByTestId('comment-sheet-close')).toBeTruthy();
      });
      fireEvent.press(getByTestId('comment-sheet-close'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('loading and fetching', () => {
    it('shows loading indicator while comments are fetching', async () => {
      // Keep the promise pending
      mockGetComments.mockReturnValue(new Promise(() => {}));
      const { getByTestId } = render(<CommentSheet {...defaultProps} />);
      expect(getByTestId('comment-sheet-loading')).toBeTruthy();
    });

    it('fetches comments on mount when visible', async () => {
      render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        expect(mockGetComments).toHaveBeenCalledWith(42);
      });
    });

    it('does not fetch comments when not visible', () => {
      render(<CommentSheet {...defaultProps} visible={false} />);
      expect(mockGetComments).not.toHaveBeenCalled();
    });

    it('re-fetches comments when visible changes to true', async () => {
      const { rerender } = render(<CommentSheet {...defaultProps} visible={false} />);
      expect(mockGetComments).not.toHaveBeenCalled();

      rerender(<CommentSheet {...defaultProps} visible={true} />);
      await waitFor(() => {
        expect(mockGetComments).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('displaying comments', () => {
    it('displays existing comments with user name and text', async () => {
      const { getByText } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        expect(getByText('Alice')).toBeTruthy();
        expect(getByText('Great run!')).toBeTruthy();
        expect(getByText('Bob')).toBeTruthy();
        expect(getByText('Nice pace!')).toBeTruthy();
        expect(getByText('CurrentUser')).toBeTruthy();
        expect(getByText('Keep it up!')).toBeTruthy();
      });
    });

    it('shows relative timestamps on comments', async () => {
      const { getByText } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        expect(getByText('5m ago')).toBeTruthy();
        expect(getByText('2m ago')).toBeTruthy();
        expect(getByText('1m ago')).toBeTruthy();
      });
    });

    it('shows user avatar initial for each comment', async () => {
      const { getAllByText } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        expect(getAllByText('A').length).toBeGreaterThan(0); // Alice's initial
        expect(getAllByText('B').length).toBeGreaterThan(0); // Bob's initial
        expect(getAllByText('C').length).toBeGreaterThan(0); // CurrentUser's initial
      });
    });
  });

  describe('empty state', () => {
    it('shows empty state when no comments exist', async () => {
      mockGetComments.mockResolvedValue({ comments: [], count: 0 });
      const { getByTestId, getByText } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        expect(getByTestId('comment-sheet-empty')).toBeTruthy();
        expect(getByText('No comments yet')).toBeTruthy();
        expect(getByText('Be the first to comment!')).toBeTruthy();
      });
    });
  });

  describe('adding comments', () => {
    it('has a text input and send button', async () => {
      const { getByTestId } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        expect(getByTestId('comment-sheet-input')).toBeTruthy();
        expect(getByTestId('comment-sheet-send')).toBeTruthy();
      });
    });

    it('send button is disabled when input is empty', async () => {
      const { getByTestId } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        const sendButton = getByTestId('comment-sheet-send');
        expect(sendButton.props.accessibilityState?.disabled || sendButton.props.disabled).toBeTruthy();
      });
    });

    it('send button is disabled when input is whitespace only', async () => {
      const { getByTestId } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        expect(getByTestId('comment-sheet-input')).toBeTruthy();
      });
      fireEvent.changeText(getByTestId('comment-sheet-input'), '   ');
      const sendButton = getByTestId('comment-sheet-send');
      expect(sendButton.props.accessibilityState?.disabled || sendButton.props.disabled).toBeTruthy();
    });

    it('enables send button when text is entered', async () => {
      const { getByTestId } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        expect(getByTestId('comment-sheet-input')).toBeTruthy();
      });
      fireEvent.changeText(getByTestId('comment-sheet-input'), 'Hello!');
      const sendButton = getByTestId('comment-sheet-send');
      // When enabled, disabled should be false or undefined
      const isDisabled = sendButton.props.accessibilityState?.disabled ?? sendButton.props.disabled ?? false;
      expect(isDisabled).toBe(false);
    });

    it('submits comment and clears input on send', async () => {
      const onCountChange = jest.fn();
      const { getByTestId } = render(
        <CommentSheet {...defaultProps} onCommentCountChange={onCountChange} />
      );
      await waitFor(() => {
        expect(getByTestId('comment-sheet-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('comment-sheet-input'), 'Hello!');
      await act(async () => {
        fireEvent.press(getByTestId('comment-sheet-send'));
      });

      await waitFor(() => {
        expect(mockAddComment).toHaveBeenCalledWith(42, 'Hello!');
      });
      // Input should be cleared
      expect(getByTestId('comment-sheet-input').props.value).toBe('');
      // Count change callback fires with +1
      expect(onCountChange).toHaveBeenCalledWith(1);
    });

    it('shows new comment immediately after submission (optimistic)', async () => {
      const { getByTestId, getByText } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        expect(getByTestId('comment-sheet-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('comment-sheet-input'), 'New comment');
      await act(async () => {
        fireEvent.press(getByTestId('comment-sheet-send'));
      });

      await waitFor(() => {
        expect(getByText('New comment')).toBeTruthy();
      });
    });
  });

  describe('deleting comments', () => {
    it('shows delete button only on own comments', async () => {
      const { getByTestId, queryByTestId } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        // Own comment (id=3, user.id=99 = currentUserId) should have delete button
        expect(getByTestId('comment-sheet-delete-3')).toBeTruthy();
        // Other users' comments should NOT have delete button
        expect(queryByTestId('comment-sheet-delete-1')).toBeNull();
        expect(queryByTestId('comment-sheet-delete-2')).toBeNull();
      });
    });

    it('removes comment from list on delete', async () => {
      const onCountChange = jest.fn();
      const { getByTestId, queryByText } = render(
        <CommentSheet {...defaultProps} onCommentCountChange={onCountChange} />
      );
      await waitFor(() => {
        expect(getByTestId('comment-sheet-delete-3')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('comment-sheet-delete-3'));
      });

      await waitFor(() => {
        expect(mockDeleteComment).toHaveBeenCalledWith(42, 3);
        expect(queryByText('Keep it up!')).toBeNull();
      });
      expect(onCountChange).toHaveBeenCalledWith(-1);
    });
  });

  describe('error handling', () => {
    it('shows error when comments fail to load', async () => {
      mockGetComments.mockRejectedValue(new Error('Network error'));
      const { getByTestId } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        expect(getByTestId('comment-sheet-error')).toBeTruthy();
      });
    });

    it('shows error when comment submission fails', async () => {
      mockAddComment.mockRejectedValue(new Error('Server error'));
      const { getByTestId } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        expect(getByTestId('comment-sheet-input')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('comment-sheet-input'), 'Will fail');
      await act(async () => {
        fireEvent.press(getByTestId('comment-sheet-send'));
      });

      await waitFor(() => {
        expect(getByTestId('comment-sheet-error')).toBeTruthy();
      });
    });

    it('shows error when comment deletion fails', async () => {
      mockDeleteComment.mockRejectedValue(new Error('Delete failed'));
      const { getByTestId } = render(<CommentSheet {...defaultProps} />);
      await waitFor(() => {
        expect(getByTestId('comment-sheet-delete-3')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('comment-sheet-delete-3'));
      });

      await waitFor(() => {
        expect(getByTestId('comment-sheet-error')).toBeTruthy();
      });
    });
  });
});
