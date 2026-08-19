import { describe, expect, it } from 'vitest';

import { tokenizeMarkdown } from './tokenizeMarkdown';

describe('tokenizeMarkdown', () => {
  it('preserves the source exactly', () => {
    const input = '##header\n\n- [ ] **Task**\n_test_ and `code`\n~~gone~~';

    const output = tokenizeMarkdown(input)
      .map((token) => token.text)
      .join('');

    expect(output).toBe(input);
  });

  it('styles headings and inline content independently', () => {
    expect(tokenizeMarkdown('##header\n_test_')).toEqual([
      {
        text: '##',
        kind: 'marker',
      },
      {
        text: 'header',
        kind: 'heading2',
      },
      {
        text: '\n',
      },
      {
        text: '_',
        kind: 'marker',
      },
      {
        text: 'test',
        kind: 'italic',
      },
      {
        text: '_',
        kind: 'marker',
      },
    ]);
  });

  it('styles block markers without changing their content', () => {
    expect(tokenizeMarkdown('- [ ] **Task**')).toEqual([
      {
        text: '- [ ] ',
        kind: 'marker',
      },
      {
        text: '**',
        kind: 'marker',
      },
      {
        text: 'Task',
        kind: 'bold',
      },
      {
        text: '**',
        kind: 'marker',
      },
    ]);
  });
});
