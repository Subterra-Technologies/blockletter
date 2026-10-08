/**
 * One email through Resend's REST API, with `fetch` and no SDK: any provider with an HTTP API
 * (Postmark, SendGrid, Amazon SES…) takes the same subject, HTML and text.
 * https://resend.com/docs/api-reference/emails/send-email
 */

export interface ResendEmail {
  /** "Name <address>", on a domain you have verified with Resend. */
  from: string;
  to: string[];
  subject: string;
  html: string;
  /** The plain-text part, for clients that will not show HTML. */
  text: string;
  headers?: Record<string, string>;
}

export async function sendWithResend(apiKey: string, email: ResendEmail): Promise<string> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(email),
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok || !body.id) {
    throw new Error(
      `Resend did not accept the email (${response.status}): ${body.message ?? response.statusText}`,
    );
  }
  return body.id;
}
