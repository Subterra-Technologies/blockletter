import { isValidElement, type ReactNode } from 'react';

/**
 * The words in a React node, as its text would read on the page: what a name made from a label
 * ("Text formatting") needs when the label may be an element rather than a string.
 */
export function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') {
    return String(node);
  }
  if (Array.isArray(node)) return node.map((child: ReactNode) => textOf(child)).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}
