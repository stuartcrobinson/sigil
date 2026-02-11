import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
  it('formats seconds under a minute', () => {
    expect(formatDuration(45)).toBe('0:45');
  });

  it('formats seconds over a minute', () => {
    expect(formatDuration(125)).toBe('2:05');
  });

  it('formats seconds over an hour', () => {
    expect(formatDuration(3665)).toBe('1:01:05');
  });

  it('handles zero seconds', () => {
    expect(formatDuration(0)).toBe('0:00');
  });

  it('throws error for negative duration', () => {
    expect(() => formatDuration(-10)).toThrow('Duration cannot be negative');
  });
});
