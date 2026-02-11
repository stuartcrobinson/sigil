import { randomAddress, waitForEmail, extractLinks, deleteEmail } from 'mailpail';
import type { MailpailConfig, ReceivedEmail } from 'mailpail';

/**
 * Mailpail helper for email testing (replaces MailSlurp)
 *
 * Uses AWS SES inbound + S3 for disposable email addresses.
 * No subscriptions, no rate limits, pay-per-use.
 *
 * Required env vars:
 *   MAILPAIL_DOMAIN   — e.g. "test.sigil.app"
 *   MAILPAIL_S3_BUCKET — e.g. "sigil-test-emails"
 *   MAILPAIL_S3_PREFIX — e.g. "mailpail/" (optional, defaults to "mailpail/")
 *   AWS_REGION         — e.g. "us-east-1" (optional, defaults to us-east-1)
 */

const domain = process.env.MAILPAIL_DOMAIN;
const s3Bucket = process.env.MAILPAIL_S3_BUCKET;

if (!domain || !s3Bucket) {
  throw new Error(
    'MAILPAIL_DOMAIN and MAILPAIL_S3_BUCKET environment variables are required for e2e tests. ' +
    'See: https://github.com/AllyourbaseHQ/mailpail'
  );
}

const config: MailpailConfig = {
  domain,
  s3Bucket,
  s3Prefix: process.env.MAILPAIL_S3_PREFIX || 'mailpail/',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
};

export interface TestEmail {
  id: string;       // s3Key for cleanup
  emailAddress: string;
}

/**
 * Creates a disposable email address for testing.
 * Unlike MailSlurp, mailpail doesn't need to "create an inbox" —
 * any address @domain is accepted by SES and stored in S3.
 */
export async function createTestEmail(): Promise<TestEmail> {
  const address = randomAddress(config);
  return {
    id: address, // use address as ID for tracking
    emailAddress: address,
  };
}

/**
 * Waits for an email to arrive at the given address.
 */
export async function waitForEmailMessage(
  emailAddress: string,
  timeoutMs: number = 30000
): Promise<ReceivedEmail> {
  return await waitForEmail(config, {
    to: emailAddress,
    timeout: timeoutMs,
  });
}

/**
 * Extracts verification link from email body.
 * Matches common patterns: verify, confirm links.
 */
export function extractVerificationLink(emailBody: string): string | null {
  const patterns = [
    /href="([^"]*verify[^"]*)"/i,
    /href="([^"]*confirm[^"]*)"/i,
    /(https?:\/\/[^\s]+verify[^\s]*)/i,
    /(https?:\/\/[^\s]+confirm[^\s]*)/i,
  ];

  for (const pattern of patterns) {
    const match = emailBody.match(pattern);
    if (match && match[1]) {
      return match[1].replace(/&amp;/g, '&');
    }
  }

  return null;
}

/**
 * Waits for a verification email and extracts the link.
 */
export async function waitForVerificationEmail(
  emailAddress: string,
  timeoutMs: number = 30000
): Promise<string> {
  const email = await waitForEmailMessage(emailAddress, timeoutMs);

  // Try mailpail's link extractor first (handles HTML entities)
  const links = extractLinks(email);
  const verifyLink = links.find(
    (link) => /verify|confirm/i.test(link)
  );
  if (verifyLink) return verifyLink;

  // Fallback to pattern matching on raw HTML
  const link = extractVerificationLink(email.html || email.text);
  if (!link) {
    throw new Error('No verification link found in email');
  }
  return link;
}

/**
 * Cleans up a test email from S3.
 * For mailpail, we just need to delete the S3 object if it exists.
 * If no email was received (common for tests that don't trigger emails),
 * this is a no-op.
 */
export async function deleteTestEmail(emailAddressOrKey: string): Promise<void> {
  // If this looks like an S3 key, delete it directly
  if (emailAddressOrKey.includes('/')) {
    await deleteEmail(config, emailAddressOrKey);
  }
  // If it's an email address, we don't need to clean up —
  // mailpail addresses are ephemeral (no "inbox" to delete)
}

/**
 * Get the mailpail config (for advanced use cases).
 */
export function getMailpailConfig(): MailpailConfig {
  return config;
}
