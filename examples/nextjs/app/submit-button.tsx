'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

/**
 * A form's submit button that says when the form's Server Action is running. It stays focusable
 * (`aria-disabled`, not `disabled`) so the keyboard is not thrown back to the top of the page.
 */
export function SubmitButton({
  children,
  pending: pendingLabel,
}: {
  children: ReactNode;
  pending: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="button button--primary"
      aria-disabled={pending}
      onClick={(event) => {
        if (pending) event.preventDefault();
      }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
