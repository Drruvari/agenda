import { describe, expect, it } from 'vitest';

import { markdownToHtml } from '@/features/todays-page/richMarkdown';

describe('markdownToHtml', () => {
  it('renders compact headings and inline formatting without syntax markers', () => {
    expect(markdownToHtml('##header\n_italic_\n**bold**')).toBe(
      '<h2>header</h2><div><em>italic</em></div><div><strong>bold</strong></div>',
    );
  });

  it('renders bold, italic, strike, code, and links', () => {
    expect(
      markdownToHtml('**bold** and *italic* and ~~gone~~ and `code` and [Agenda](https://a.test)'),
    ).toBe(
      '<div><strong>bold</strong> and <em>italic</em> and <del>gone</del> and <code>code</code> and <a href="https://a.test">Agenda</a></div>',
    );
  });

  it('renders underscore bold and nested emphasis', () => {
    expect(markdownToHtml('__bold__ and ***both***')).toBe(
      '<div><strong>bold</strong> and <strong><em>both</em></strong></div>',
    );
  });

  it('leaves markdown characters inside code alone', () => {
    expect(markdownToHtml('`**not bold**`')).toBe('<div><code>**not bold**</code></div>');
  });

  it('renders bulleted and numbered lists', () => {
    expect(markdownToHtml('- first\n- second\n1. third')).toBe(
      '<ul><li>first</li><li>second</li></ul><ol><li>third</li></ol>',
    );
  });

  it('renders task lists, quotes, and rules', () => {
    expect(markdownToHtml('- [ ] todo\n- [x] done\n> quoted\n---')).toBe(
      '<ul data-task="true"><li data-checked="false"><span class="check" contenteditable="false"></span>todo</li><li data-checked="true"><span class="check on" contenteditable="false"></span>done</li></ul><blockquote>quoted</blockquote><hr>',
    );
  });

  it('keeps blank lines and escapes HTML', () => {
    expect(markdownToHtml('one\n\n<script>\n')).toBe(
      '<div>one</div><div><br></div><div>&lt;script&gt;</div>',
    );
  });
});
