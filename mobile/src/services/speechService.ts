/**
 * Audio pace announcements during running activities.
 * Uses expo-speech for TTS. Falls back to no-op in test/unsupported environments.
 */

let Speech: { speak: (text: string, options?: Record<string, unknown>) => void; stop: () => void; isSpeakingAsync?: () => Promise<boolean> } | null = null;

try {
  Speech = require('expo-speech');
} catch {
  // expo-speech not available (test env or web fallback)
}

export interface AnnouncementOptions {
  announceDistanceEveryM?: number;  // default 1000 (every 1km)
  announcePace?: boolean;            // default true
  announceTime?: boolean;            // default true
  language?: string;                 // default 'en'
  enabled?: boolean;                 // default true
}

const DEFAULT_OPTIONS: Required<AnnouncementOptions> = {
  announceDistanceEveryM: 1000,
  announcePace: true,
  announceTime: true,
  language: 'en',
  enabled: true,
};

let options: Required<AnnouncementOptions> = { ...DEFAULT_OPTIONS };
let lastAnnouncedDistance = 0;

export function configureAnnouncements(opts: AnnouncementOptions): void {
  options = { ...DEFAULT_OPTIONS, ...opts };
}

export function resetAnnouncements(): void {
  lastAnnouncedDistance = 0;
  options = { ...DEFAULT_OPTIONS };
}

export function getLastAnnouncedDistance(): number {
  return lastAnnouncedDistance;
}

/**
 * Format seconds into spoken form: "5 minutes 30 seconds"
 */
export function formatTimeSpoken(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (seconds > 0 && hours === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);

  return parts.join(' ') || '0 seconds';
}

/**
 * Format pace (seconds per km) into spoken form: "5 minutes 30 seconds per kilometer"
 */
export function formatPaceSpoken(secondsPerKm: number): string {
  if (!secondsPerKm || secondsPerKm <= 0 || !isFinite(secondsPerKm)) return '';
  const minutes = Math.floor(secondsPerKm / 60);
  const seconds = Math.round(secondsPerKm % 60);
  return `${minutes} ${minutes !== 1 ? 'minutes' : 'minute'} ${seconds} seconds per kilometer`;
}

/**
 * Format distance for spoken announcement
 */
export function formatDistanceSpoken(meters: number): string {
  const km = meters / 1000;
  if (km >= 1) {
    const rounded = Math.round(km * 10) / 10;
    return `${rounded} kilometer${rounded !== 1 ? 's' : ''}`;
  }
  return `${Math.round(meters)} meters`;
}

/**
 * Build the full announcement string for a distance milestone.
 */
export function buildAnnouncement(
  distanceMeters: number,
  paceSecondsPerKm: number,
  elapsedSeconds: number,
  opts?: AnnouncementOptions
): string {
  const merged = { ...options, ...opts };
  const parts: string[] = [];

  parts.push(formatDistanceSpoken(distanceMeters));

  if (merged.announceTime && elapsedSeconds > 0) {
    parts.push(`Time: ${formatTimeSpoken(elapsedSeconds)}`);
  }

  if (merged.announcePace && paceSecondsPerKm > 0 && isFinite(paceSecondsPerKm)) {
    parts.push(`Pace: ${formatPaceSpoken(paceSecondsPerKm)}`);
  }

  return parts.join('. ');
}

/**
 * Speak text aloud. No-op if speech not available or disabled.
 */
export function speak(text: string): void {
  if (!options.enabled || !Speech || !text) return;

  try {
    Speech.speak(text, {
      language: options.language,
      pitch: 1.0,
      rate: 0.9,
    });
  } catch {
    // Speech failed silently
  }
}

/**
 * Stop any current speech.
 */
export function stopSpeaking(): void {
  if (!Speech) return;
  try {
    Speech.stop();
  } catch {
    // ignore
  }
}

/**
 * Check if a distance announcement should be made and make it if so.
 * Call this on every GPS update. Returns true if an announcement was made.
 */
export function checkAndAnnounce(
  distanceMeters: number,
  paceSecondsPerKm: number,
  elapsedSeconds: number
): boolean {
  if (!options.enabled) return false;

  const threshold = options.announceDistanceEveryM;
  const nextMilestone = lastAnnouncedDistance + threshold;

  if (distanceMeters >= nextMilestone) {
    // Round to nearest milestone
    const milestoneDistance = Math.floor(distanceMeters / threshold) * threshold;
    lastAnnouncedDistance = milestoneDistance;

    const text = buildAnnouncement(milestoneDistance, paceSecondsPerKm, elapsedSeconds);
    speak(text);
    return true;
  }

  return false;
}
