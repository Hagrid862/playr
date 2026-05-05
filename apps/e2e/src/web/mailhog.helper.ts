const MAILHOG_API = process.env.MAILHOG_API_URL || "http://localhost:8025";
const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 500;

interface MailHogMessage {
  ID: string;
  From: { Mailbox: string; Domain: string };
  To: { Mailbox: string; Domain: string }[];
  Content: {
    Headers: Record<string, string[]>;
    Body: string;
    Text: string;
  };
  Created: string;
}

interface MailHogResponse {
  total: number;
  count: number;
  start: number;
  items: MailHogMessage[];
}

export async function getOtpFromMailhog(email: string): Promise<string | null> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${MAILHOG_API}/api/v2/messages`);
      if (!response.ok) {
        console.warn(`MailHog API returned ${response.status}, retrying...`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      const data: MailHogResponse = await response.json();

      // Sort messages by creation date in descending order to get the newest first
      const sortedMessages = data.items.sort(
        (a, b) => new Date(b.Created).getTime() - new Date(a.Created).getTime(),
      );

      const message = sortedMessages.find((msg) =>
        msg.To.some(
          (to) =>
            `${to.Mailbox}@${to.Domain}`.toLowerCase() === email.toLowerCase(),
        ),
      );

      if (!message) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      const otp = extractOtp(message);
      if (otp) return otp;

      // OTP not found in email body, wait and retry
      await sleep(RETRY_DELAY_MS);
    } catch (error) {
      console.warn(`MailHog fetch attempt ${attempt + 1} failed:`, error);
      await sleep(RETRY_DELAY_MS);
    }
  }

  return null;
}

function extractOtp(message: MailHogMessage): string | null {
  // Try HTML body first
  if (message.Content?.Body) {
    const match = message.Content.Body.match(/(\d{8})/);
    if (match) return match[1];
  }

  // Fall back to plain text
  if (message.Content?.Text) {
    const match = message.Content.Text.match(/(\d{8})/);
    if (match) return match[1];
  }

  return null;
}

export async function deleteAllMailhogMessages(): Promise<void> {
  try {
    await fetch(`${MAILHOG_API}/api/v1/messages`, { method: "DELETE" });
  } catch (error) {
    console.warn("Failed to delete MailHog messages:", error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
