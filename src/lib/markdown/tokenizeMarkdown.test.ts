import { describe, expect, it } from 'vitest';

import { tokenizeMarkdown } from './tokenizeMarkdown';

describe('tokenizeMarkdown', () => {
  it('preserves the source exactly', () => {
    const input = '##header\n\n- [ ] **Task**\n_test_ and `code`\n~~gone~~';
    expect(
      tokenizeMarkdown(input)
        .map((token) => token.text)
        .join(''),
    ).toBe(input);
  });

  it('styles headings, inline content, and structural markers independently', () => {
    expect(tokenizeMarkdown('##header\n_test_')).toEqual([
      { text: '##', kind: 'marker' },
      { text: 'header', kind: 'heading2' },
      { text: '\n' },
      { text: '_', kind: 'marker' },
      { text: 'test', kind: 'italic' },
      { text: '_', kind: 'marker' },
    ]);
  });
});
