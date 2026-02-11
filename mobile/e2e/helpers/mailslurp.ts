import { MailSlurp } from 'mailslurp-client';

/**
 * MailSlurp helper for email testing
 *
 * Usage:
 * const email = await createTestEmail();
 * // Use email.emailAddress for registration
 * const verificationLink = await waitForVerificationEmail(email.id);
 */

const apiKey = process.env.MAILSLURP_API_KEY;

if (!apiKey) {
  throw new Error('MAILSLURP_API_KEY environment variable is required for e2e tests');
}

const mailslurp = new MailSlurp({ apiKey });

export interface TestEmail {
  id: string;
  emailAddress: string;
}

/**
 * Creates a disposable email inbox for testing
 */
export async function createTestEmail(): Promise<TestEmail> {
  const inbox = await mailslurp.createInbox();
  return {
    id: inbox.id,
    emailAddress: inbox.emailAddress!,
  };
}

/**
 * Waits for an email to arrive in the inbox
 * @param inboxId - The inbox ID to monitor
 * @param timeoutMs - Maximum time to wait (default 30s)
 * @returns The received email
 */
export async function waitForEmail(inboxId: string, timeoutMs: number = 30000) {
  return await mailslurp.waitForLatestEmail(inboxId, timeoutMs, true);
}

/**
 * Extracts verification link from email body
 * @param emailBody - HTML or text email body
 * @returns Verification link URL
 */
export function extractVerificationLink(emailBody: string): string | null {
  // Match common verification link patterns
  const patterns = [
    /href="([^"]*verify[^"]*)"/i,
    /href="([^"]*confirm[^"]*)"/i,
    /(https?:\/\/[^\s]+verify[^\s]*)/i,
    /(https?:\/\/[^\s]+confirm[^\s]*)/i,
  ];

  for (const pattern of patterns) {
    const match = emailBody.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Waits for a verification email and extracts the link
 * @param inboxId - The inbox ID to monitor
 * @param timeoutMs - Maximum time to wait (default 30s)
 * @returns Verification link URL
 */
export async function waitForVerificationEmail(
  inboxId: string,
  timeoutMs: number = 30000
): Promise<string> {
  const email = await waitForEmail(inboxId, timeoutMs);

  const body = email.body || '';
  const link = extractVerificationLink(body);

  if (!link) {
    throw new Error('No verification link found in email');
  }

  return link;
}

/**
 * Deletes an inbox after tests
 */
export async function deleteTestEmail(inboxId: string): Promise<void> {
  await mailslurp.deleteInbox(inboxId);
}

/**
 * Cleans up all test emails created during a test run
 */
export async function cleanupAllTestEmails(): Promise<void> {
  const inboxes = await mailslurp.getAllInboxes();

  // Delete all inboxes (be careful - only use in test environments!)
  await Promise.all(
    inboxes.map((inbox) => mailslurp.deleteInbox(inbox.id))
  );
}
