import type { ReactNode } from 'react';

/**
 * Just enough TypeScript highlighting for the docs' short snippets: comments, strings and
 * keywords. Three colours, because a reader scans code for structure, not for a rainbow.
 */

const TOKEN =
  /(\/\/[^\n]*)|('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|\b(import|from|export|const|let|async|await|return|interface|extends|type|function|new|if|for|of)\b/g;

export function highlight(code: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  for (const match of code.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(code.slice(last, index));
    const [text, comment, string] = match;
    const kind = comment ? 'comment' : string ? 'string' : 'keyword';
    nodes.push(
      <span key={index} className={`pg-token pg-token--${kind}`}>
        {text}
      </span>,
    );
    last = index + text.length;
  }
  if (last < code.length) nodes.push(code.slice(last));
  return nodes;
}
