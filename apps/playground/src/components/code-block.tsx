import { CopyButton } from './copy-button';
import { highlight } from './highlight';

/** A titled, highlighted snippet with a copy button: the code a developer would actually write. */
export function CodeBlock({ title, code }: { title: string; code: string }) {
  const source = code.trim();
  return (
    <figure className="pg-code">
      <figcaption className="pg-code__bar">
        <span className="pg-code__title">{title}</span>
        <CopyButton text={source} label="Copy code" />
      </figcaption>
      <pre className="pg-code__body">
        <code>
          {source.split('\n').map((line, index) => {
            const indent = line.length - line.trimStart().length;
            return (
              <span
                key={index}
                className="pg-code__line"
                style={{ paddingLeft: `${indent + 2}ch` }}
              >
                {highlight(line.trimStart())}
              </span>
            );
          })}
        </code>
      </pre>
    </figure>
  );
}
