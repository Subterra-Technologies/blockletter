import {
  periodLabel,
  renderEmail,
  suggestPeriod,
  todayIn,
} from '@subterra-technologies/blockletter';
import { DEFAULT_ORGANIZATION_ID, SAMPLE_ORGANIZATIONS } from './sample';

/**
 * The email on its own, for `?render=email` and `?render=text`: the sample organisation's
 * first issue rendered for this month, replacing the page the way an inbox shows a message.
 * It always shows the untouched sample, so a link to it shows everyone the same email.
 */
export async function renderEmailPage(
  kind: 'email' | 'text',
  organizationId = DEFAULT_ORGANIZATION_ID,
): Promise<void> {
  const organization =
    SAMPLE_ORGANIZATIONS.find((item) => item.id === organizationId) ?? SAMPLE_ORGANIZATIONS[0];
  if (!organization) return;
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const period = suggestPeriod(todayIn(timeZone));
  const document_ = await organization.starter(period);
  const email = renderEmail(document_, {
    ...organization.renderOptions,
    brand: organization.brand,
    issueLabel: `${periodLabel(period)} issue`,
  });

  if (kind === 'email') {
    document.open();
    document.write(email.html);
    document.close();
    return;
  }

  document.title = `${document_.subject} (plain text)`;
  const pre = document.createElement('pre');
  pre.textContent = email.text;
  pre.style.cssText =
    'margin:0 auto;padding:24px 16px;max-width:72ch;white-space:pre-wrap;word-wrap:break-word;' +
    'font:15px/1.55 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#111;';
  document.body.replaceChildren(pre);
  document.body.style.margin = '0';
  document.body.style.background = '#ffffff';
}
