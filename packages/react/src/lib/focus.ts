/**
 * Runs `run` once a confirmation has finished closing.
 *
 * A confirmation (`useConfirm`) traps focus while it is open and hands it back to whatever asked
 * when it closes, a frame or more after its promise has answered. Anything that wants to put focus
 * somewhere else after the answer has to wait for that hand-back, or the hand-back undoes it. This
 * waits until no alert dialog is left in the document (for at most about a second), then runs.
 */
export function afterConfirmCloses(run: () => void): void {
  let frames = 0;
  const later = (next: () => void) =>
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(next)
      : setTimeout(next, 16);
  const tick = () => {
    frames += 1;
    if (document.querySelector('[role="alertdialog"]') && frames < 60) {
      later(tick);
      return;
    }
    run();
  };
  later(tick);
}

/**
 * Moves focus once a confirmation has finished closing.
 *
 * When the answer removes the control that asked (Delete takes its own row away, Convert swaps the
 * preview for a text area), focus has nowhere to go and falls to the page. This focuses `target()`,
 * the control that now stands where the old one was, once the confirmation is gone.
 */
export function focusAfterConfirm(target: () => HTMLElement | null | undefined): void {
  afterConfirmCloses(() => {
    const element = target();
    if (element?.isConnected) element.focus();
  });
}
