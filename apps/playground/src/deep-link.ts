/**
 * What the demo's address asks for, so a README or a message can link straight to one view:
 *
 * - `?org=makers-guild` — which sample organisation
 * - `?view=preview` — open on the email preview instead of the canvas
 * - `?tab=brand` — which inspector tab (`block`, `appearance`, `settings`, `brand`)
 * - `?block=banner` — select the first block of that type
 * - `?new=1` — open the New issue dialog
 * - `?theme=dark` — the editor's dark palette
 * - `?render=email` / `?render=text` — show only the email (or its plain-text version), as an
 *   inbox would receive it
 */
export interface DeepLink {
  org?: string;
  view?: 'canvas' | 'preview';
  tab?: 'block' | 'appearance' | 'settings' | 'brand';
  block?: string;
  newIssue: boolean;
  theme?: 'light' | 'dark';
  render?: 'email' | 'text';
}

const VIEWS = ['canvas', 'preview'] as const;
const TABS = ['block', 'appearance', 'settings', 'brand'] as const;
const RENDERS = ['email', 'text'] as const;
const THEMES = ['light', 'dark'] as const;

const oneOf = <T extends string>(values: readonly T[], value: string | null): T | undefined =>
  values.find((item) => item === value);

export function readDeepLink(search: string = window.location.search): DeepLink {
  const params = new URLSearchParams(search);
  const org = params.get('org')?.trim();
  const block = params.get('block')?.trim();
  const view = oneOf(VIEWS, params.get('view'));
  const tab = oneOf(TABS, params.get('tab'));
  const render = oneOf(RENDERS, params.get('render'));
  const theme = oneOf(THEMES, params.get('theme'));
  return {
    ...(org ? { org } : {}),
    ...(view ? { view } : {}),
    ...(tab ? { tab } : {}),
    ...(block ? { block } : {}),
    newIssue: params.get('new') === '1',
    ...(theme ? { theme } : {}),
    ...(render ? { render } : {}),
  };
}
