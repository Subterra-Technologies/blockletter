import 'server-only';

/**
 * Test emails through Resend's REST API, with `fetch` and no SDK: any provider with an HTTP API
 * takes the same subject, HTML and text. https://resend.com/docs/api-reference/emails/send-email
 *
 * Configured by RESEND_API_KEY, FROM and TO in `.env.local`. The key is read here, on the server,
 * and never reaches the browser.
 */

export type ResendSetup =
  { ready: true; apiKey: string; from: string; to: string[] } | { ready: false; missing: string[] };

export function resendSetup(): ResendSetup {
  const { RESEND_API_KEY, FROM, TO } = process.env;
  if (!RESEND_API_KEY || !FROM || !TO) {
    const missing = Object.entries({ RESEND_API_KEY, FROM, TO })
      .filter(([, value]) => !value)
      .map(([name]) => name);
    return { ready: false, missing };
  }
  const to = TO.split(',').map((address) => address.trim());
  return { ready: true, apiKey: RESEND_API_KEY, from: FROM, to };
}

export async function sendWithResend(
  setup: Extract<ResendSetup, { ready: true }>,
  email: { subject: string; html: string; text: string },
): Promise<string> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${setup.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: setup.from, to: setup.to, ...email }),
  });
  const body = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok || !body.id) {
    throw new Error(
      `Resend did not accept the email (${response.status}): ${body.message ?? response.statusText}`,
    );
  }
  return body.id;
}
