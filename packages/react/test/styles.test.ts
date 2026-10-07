// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrastRatio } from '@subterra-technologies/blockletter';
import { beforeAll, describe, expect, it } from 'vitest';

/**
 * `styles.css` is the one thing Blockletter puts on a host's page outside its own markup, so it
 * is compiled here as `npm run build` compiles it and read back. Every rule has to stay inside
 * `.bl-root` or on a `bl:` class, every global name it defines has to be Blockletter's own, and
 * every `bl:` class the package writes has to come out the other end: Tailwind drops a class it
 * does not recognise (a misspelling, a colour the theme lacks) without a word.
 */
const packageRoot = fileURLToPath(new URL('..', import.meta.url));
const require = createRequire(import.meta.url);
const cliManifest = require.resolve('@tailwindcss/cli/package.json');
const cli = path.join(
  path.dirname(cliManifest),
  (JSON.parse(readFileSync(cliManifest, 'utf8')) as { bin: { tailwindcss: string } }).bin
    .tailwindcss,
);

interface CssNode {
  prelude: string;
  declarations: string[];
  children: CssNode[];
  parent: CssNode | null;
}

/** Just enough of a CSS parser for Tailwind's output: blocks, preludes and declarations. */
function parse(source: string): CssNode {
  const top: CssNode = { prelude: '', declarations: [], children: [], parent: null };
  const text = source.replace(/\/\*[\s\S]*?\*\//g, '');
  let current = top;
  let buffer = '';
  let quote: string | null = null;
  for (let index = 0; index < text.length; index++) {
    const char = text[index] ?? '';
    if (char === '\\') {
      buffer += char + (text[index + 1] ?? '');
      index++;
    } else if (quote) {
      buffer += char;
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
      buffer += char;
    } else if (char === '{') {
      const node: CssNode = {
        prelude: buffer.trim(),
        declarations: [],
        children: [],
        parent: current,
      };
      current.children.push(node);
      current = node;
      buffer = '';
    } else if (char === ';' || char === '}') {
      if (buffer.trim()) current.declarations.push(buffer.trim());
      buffer = '';
      if (char === '}') current = current.parent ?? top;
    } else {
      buffer += char;
    }
  }
  return top;
}

/** Splits a selector list on its top-level commas. */
function selectors(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let part = '';
  for (let index = 0; index < list.length; index++) {
    const char = list[index] ?? '';
    if (char === '\\') {
      part += char + (list[index + 1] ?? '');
      index++;
      continue;
    }
    if (char === '(' || char === '[') depth++;
    if (char === ')' || char === ']') depth--;
    if (char === ',' && depth === 0) {
      parts.push(part.trim());
      part = '';
    } else {
      part += char;
    }
  }
  return [...parts, part.trim()];
}

function walk(
  node: CssNode,
  visit: (node: CssNode, atRules: string[]) => void,
  atRules: string[] = [],
) {
  for (const child of node.children) {
    visit(child, atRules);
    if (!child.prelude.startsWith('@keyframes') && !child.prelude.startsWith('@property')) {
      walk(child, visit, child.prelude.startsWith('@') ? [...atRules, child.prelude] : atRules);
    }
  }
}

/** A class name as it appears in a selector: every character but `[A-Za-z0-9_-]` escaped. */
const asSelector = (name: string) => `.${name.replace(/[^\w-]/g, (char) => `\\${char}`)}`;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name));
}

let css = '';
let tree: CssNode;

beforeAll(() => {
  css = execFileSync(process.execPath, [cli, '--input', 'src/styles.css'], {
    cwd: packageRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  tree = parse(css);
});

describe('styles.css', () => {
  it('applies every rule inside .bl-root or to a bl: class', () => {
    const unscoped: string[] = [];
    walk(tree, (node, atRules) => {
      if (node.prelude.startsWith('@') || node.prelude.startsWith('&')) return;
      // Inside a style rule: nested under a selector that was itself checked.
      if (node.parent && !node.parent.prelude.startsWith('@') && node.parent.prelude) return;
      const inLayer = (name: string) => atRules.includes(`@layer ${name}`);
      for (const selector of selectors(node.prelude)) {
        if (selector.includes('.bl-root') || selector.includes('.bl\\:')) continue;
        // Tailwind's prefixed theme variables, in Blockletter's own layer.
        if (
          (selector === ':root' || selector === ':host') &&
          inLayer('blockletter') &&
          node.declarations.every((declaration) => declaration.startsWith('--bl-'))
        ) {
          continue;
        }
        // Tailwind's fallback for browsers without @property: its own --tw-* defaults.
        if (
          inLayer('properties') &&
          node.declarations.every((declaration) => declaration.startsWith('--tw-'))
        ) {
          continue;
        }
        unscoped.push(selector);
      }
    });
    expect(unscoped).toEqual([]);
  });

  it('names every keyframe bl-*, so none can clash with the host’s', () => {
    const names = [...css.matchAll(/@keyframes\s+([^\s{]+)/g)].map(([, name]) => name);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !name?.startsWith('bl-'))).toEqual([]);
  });

  it('registers no custom properties beyond Tailwind’s own --tw-* internals', () => {
    const names = [...css.matchAll(/@property\s+([^\s{]+)/g)].map(([, name]) => name);
    expect(names.filter((name) => !name?.startsWith('--tw-'))).toEqual([]);
  });

  it('declares only its own layer and Tailwind’s properties layer', () => {
    const layers = new Set<string>();
    for (const [, list] of css.matchAll(/@layer\s+([^{;]+)[{;]/g)) {
      for (const name of (list ?? '').split(',')) layers.add(name.trim());
    }
    expect([...layers].sort()).toEqual(['blockletter', 'properties']);
  });

  it('sets the light and dark design tokens on .bl-root', () => {
    const tokens = new Map<string, string[]>();
    walk(tree, (node, atRules) => {
      if (atRules.includes('@layer blockletter') && node.prelude.includes('.bl-root')) {
        tokens.set(node.prelude, node.declarations);
      }
    });
    const light = tokens.get('.bl-root') ?? [];
    const dark =
      tokens.get(".bl-root[data-theme='dark'], .dark .bl-root:not([data-theme='light'])") ?? [];
    for (const token of ['--bl-primary', '--bl-border', '--bl-ring', '--bl-danger-soft']) {
      expect(light.some((declaration) => declaration.startsWith(`${token}:`))).toBe(true);
      expect(dark.some((declaration) => declaration.startsWith(`${token}:`))).toBe(true);
    }
    expect(light).toContain('--bl-font-sans: ui-sans-serif, system-ui, sans-serif');
  });

  it('ships a neutral chrome that clears WCAG AA in both palettes', () => {
    const palettes = new Map<string, Record<string, string>>();
    walk(tree, (node, atRules) => {
      if (!atRules.includes('@layer blockletter') || !node.prelude.includes('.bl-root')) return;
      const values: Record<string, string> = {};
      for (const declaration of node.declarations) {
        const [name = '', ...rest] = declaration.split(':');
        if (name.startsWith('--bl-')) values[name.trim()] = rest.join(':').trim();
      }
      palettes.set(node.prelude.startsWith('.bl-root[') ? 'dark' : 'light', values);
    });
    const light = palettes.get('light') ?? {};
    // The dark palette overrides the light one; anything it leaves alone is inherited.
    const dark = { ...light, ...palettes.get('dark') };

    const channels = (hex: string) =>
      [1, 3, 5].map((at) => Number.parseInt(hex.slice(at, at + 2), 16));
    /** A colour at half strength over `background`: the focus halo `ring-ring/50` draws. */
    const half = (hex: string, background: string) =>
      `#${channels(hex)
        .map((value, index) => Math.round((value + (channels(background)[index] ?? 0)) / 2))
        .map((value) => value.toString(16).padStart(2, '0'))
        .join('')}`;

    for (const [name, tokens] of [
      ['light', light],
      ['dark', dark],
    ] as const) {
      const token = (key: string): string => {
        const value = tokens[`--bl-${key}`] ?? '';
        const reference = /^var\((--bl-[\w-]+)\)$/.exec(value)?.[1];
        return reference ? (tokens[reference] ?? '') : value;
      };
      for (const key of ['primary', 'primary-foreground', 'ring', 'canvas-mark']) {
        const [red = 0, green = 0, blue = 0] = channels(token(key));
        // Neutral: no hue to speak of, whatever host it sits in.
        expect(
          Math.max(red, green, blue) - Math.min(red, green, blue),
          `${name} ${key}`,
        ).toBeLessThanOrEqual(12);
      }
      const background = token('background');
      expect(contrastRatio(token('primary-foreground'), token('primary'))).toBeGreaterThanOrEqual(
        4.5,
      );
      // As text: the Button `link` variant.
      expect(contrastRatio(token('primary'), background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(token('foreground'), background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(token('muted-foreground'), background)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(half(token('ring'), background), background)).toBeGreaterThanOrEqual(3);
      // The canvas's marks sit on the email's white card, whatever the editor's palette.
      expect(contrastRatio(token('canvas-mark'), '#ffffff')).toBeGreaterThanOrEqual(3);
    }
    // Nothing of the palette Blockletter was extracted from is left.
    expect(css).not.toMatch(/#0e3542|#1a6b87|#082029|#7fc4dd|#cfe0e6/i);
  });

  it('generates every bl: class written in the package’s source', () => {
    const files = sourceFiles(path.join(packageRoot, 'src'));
    const scanned = files.filter((file) => /\.(ts|tsx)$/.test(file));
    // `@source` reads .ts and .tsx only: a class in any other file (bar a stylesheet, which
    // only talks about them) would be dropped.
    const unscanned = files.filter(
      (file) => !/\.(ts|tsx|css)$/.test(file) && /\bbl:/.test(readFileSync(file, 'utf8')),
    );
    expect(unscanned.map((file) => path.relative(packageRoot, file))).toEqual([]);

    const classes = new Set<string>();
    for (const file of scanned) {
      for (const match of readFileSync(file, 'utf8').matchAll(/'([^'\n]*)'|"([^"\n]*)"/g)) {
        for (const name of (match[1] ?? match[2] ?? '').split(/\s+/)) {
          // `group` and `peer` mark an element for other classes' variants and emit nothing.
          if (name.startsWith('bl:') && !/^bl:(group|peer)(\/[\w-]+)?$/.test(name)) {
            classes.add(name);
          }
        }
      }
    }
    expect(classes.size).toBeGreaterThan(300);
    expect([...classes].filter((name) => !css.includes(asSelector(name)))).toEqual([]);
  });
});
