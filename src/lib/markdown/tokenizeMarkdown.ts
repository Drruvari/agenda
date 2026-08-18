export type MarkdownTokenKind =
  'marker' | 'heading1' | 'heading2' | 'heading3' | 'bold' | 'italic' | 'code' | 'strike';

export type MarkdownToken = {
  text: string;
  kind?: MarkdownTokenKind;
};

const INLINE_PATTERN =
  /(~~)([^~\n]+)(~~)|(`)([^`\n]+)(`)|(\*\*|__)([^\n]+?)(\7)|(\*|_)([^\n]+?)(\10)/g;

function tokenizeInline(input: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  let cursor = 0;

  for (const match of input.matchAll(INLINE_PATTERN)) {
    const start = match.index ?? 0;
    if (start > cursor) tokens.push({ text: input.slice(cursor, start) });

    const marker = match[1] ?? match[4] ?? match[7] ?? match[10];
    const content = match[2] ?? match[5] ?? match[8] ?? match[11];
    const kind: MarkdownTokenKind = match[1]
      ? 'strike'
      : match[4]
        ? 'code'
        : match[7]
          ? 'bold'
          : 'italic';
    tokens.push({ text: marker!, kind: 'marker' });
    tokens.push({ text: content!, kind });
    tokens.push({ text: marker!, kind: 'marker' });
    cursor = start + match[0].length;
  }

  if (cursor < input.length) tokens.push({ text: input.slice(cursor) });
  return tokens;
}

/** Produces styled spans without adding, removing, or replacing source characters. */
export function tokenizeMarkdown(input: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];

  for (const part of input.split(/(\n)/)) {
    if (part === '\n') {
      tokens.push({ text: part });
      continue;
    }

    const heading = /^(#{1,3})(?!#)\s*/.exec(part);
    if (heading) {
      const level = heading[1]!.length as 1 | 2 | 3;
      tokens.push({ text: heading[0], kind: 'marker' });
      tokens.push({ text: part.slice(heading[0].length), kind: `heading${level}` });
      continue;
    }

    const blockMarker = /^(\s*(?:[-*]\s+\[[ xX]\]|[-*]|\d+\.|>)\s*)/.exec(part);
    if (blockMarker) {
      tokens.push({ text: blockMarker[1]!, kind: 'marker' });
      tokens.push(...tokenizeInline(part.slice(blockMarker[1]!.length)));
      continue;
    }

    tokens.push(...tokenizeInline(part));
  }

  return tokens;
}
