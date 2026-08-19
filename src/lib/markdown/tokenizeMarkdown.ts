import type { MarkdownToken, MarkdownTokenKind } from './tokenizeMarkdown.types';

const INLINE_PATTERN =
  /(~~)([^~\n]+)(~~)|(`)([^`\n]+)(`)|(\*\*|__)([^\n]+?)(\7)|(\*|_)([^\n]+?)(\10)/g;

const HEADING_PATTERN = /^(#{1,3})(?!#)\s*/;

const BLOCK_MARKER_PATTERN = /^(\s*(?:[-*]\s+\[[ xX]\]|[-*]|\d+\.|>)\s*)/;

function getInlineMatch(match: RegExpMatchArray): {
  marker: string;
  content: string;
  kind: MarkdownTokenKind;
} | null {
  if (match[1] && match[2]) {
    return {
      marker: match[1],
      content: match[2],
      kind: 'strike',
    };
  }

  if (match[4] && match[5]) {
    return {
      marker: match[4],
      content: match[5],
      kind: 'code',
    };
  }

  if (match[7] && match[8]) {
    return {
      marker: match[7],
      content: match[8],
      kind: 'bold',
    };
  }

  if (match[10] && match[11]) {
    return {
      marker: match[10],
      content: match[11],
      kind: 'italic',
    };
  }

  return null;
}

function tokenizeInline(input: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];
  let cursor = 0;

  for (const match of input.matchAll(INLINE_PATTERN)) {
    const start = match.index ?? 0;

    if (start > cursor) {
      tokens.push({
        text: input.slice(cursor, start),
      });
    }

    const inline = getInlineMatch(match);

    if (!inline) {
      continue;
    }

    tokens.push(
      {
        text: inline.marker,
        kind: 'marker',
      },
      {
        text: inline.content,
        kind: inline.kind,
      },
      {
        text: inline.marker,
        kind: 'marker',
      },
    );

    cursor = start + match[0].length;
  }

  if (cursor < input.length) {
    tokens.push({
      text: input.slice(cursor),
    });
  }

  return tokens;
}

function getHeadingKind(level: number): MarkdownTokenKind {
  switch (level) {
    case 1:
      return 'heading1';

    case 2:
      return 'heading2';

    default:
      return 'heading3';
  }
}

function tokenizeLine(line: string): MarkdownToken[] {
  const heading = HEADING_PATTERN.exec(line);

  if (heading) {
    const marker = heading[0];
    const hashes = heading[1];

    if (hashes) {
      return [
        {
          text: marker,
          kind: 'marker',
        },
        {
          text: line.slice(marker.length),
          kind: getHeadingKind(hashes.length),
        },
      ];
    }
  }

  const blockMarker = BLOCK_MARKER_PATTERN.exec(line);

  if (blockMarker?.[1]) {
    const marker = blockMarker[1];

    return [
      {
        text: marker,
        kind: 'marker',
      },
      ...tokenizeInline(line.slice(marker.length)),
    ];
  }

  return tokenizeInline(line);
}

export function tokenizeMarkdown(input: string): MarkdownToken[] {
  const tokens: MarkdownToken[] = [];

  for (const part of input.split(/(\n)/)) {
    if (part === '\n') {
      tokens.push({ text: part });
      continue;
    }

    tokens.push(...tokenizeLine(part));
  }

  return tokens;
}
