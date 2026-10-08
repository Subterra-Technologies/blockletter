import { useSyncExternalStore } from 'react';

const unchanging = () => () => undefined;

const onApple = (): boolean => {
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    navigator.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
};

/**
 * Whether shortcuts take Command rather than Control: on Apple's systems Control+B moves the
 * caret back a letter, as it does in every text field there. A server renders Control, and the
 * page corrects itself as it hydrates.
 */
export function useCommandKey(): boolean {
  return useSyncExternalStore(unchanging, onApple, () => false);
}
