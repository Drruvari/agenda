const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

function delimited(
  value: string,
  start: number,
  mark: string,
): { content: string; end: number } | null {
  if (!value.startsWith(mark, start)) return null;
  const from = start + mark.length;
  const end = value.indexOf(mark, from);
  if (end <= from) return null;
  if (value.slice(from, end).includes('\n')) return null;
  return { content: value.slice(from, end), end: end + mark.length };
}

export function inlineMarkdownToHtml(value: string): string {
  let html = '';
  let index = 0;

  while (index < value.length) {
    if (value[index] === '`') {
      const code = delimited(value, index, '`');
      if (code) {
        html += `<code>${escapeHtml(code.content)}</code>`;
        index = code.end;
        continue;
      }
    }

    const link = value.slice(index).match(/^\[([^\]]+)\]\(([^)\s]+)\)/);
    if (link) {
      html += `<a href="${escapeHtml(link[2]!)}">${inlineMarkdownToHtml(link[1]!)}</a>`;
      index += link[0].length;
      continue;
    }

    const strike = delimited(value, index, '~~');
    if (strike) {
      html += `<del>${inlineMarkdownToHtml(strike.content)}</del>`;
      index = strike.end;
      continue;
    }

    const strongEm = delimited(value, index, '***') ?? delimited(value, index, '___');
    if (strongEm) {
      html += `<strong><em>${inlineMarkdownToHtml(strongEm.content)}</em></strong>`;
      index = strongEm.end;
      continue;
    }

    const strong = delimited(value, index, '**') ?? delimited(value, index, '__');
    if (strong) {
      html += `<strong>${inlineMarkdownToHtml(strong.content)}</strong>`;
      index = strong.end;
      continue;
    }

    if (value[index] === '*' || value[index] === '_') {
      const italic = delimited(value, index, value[index]!);
      if (italic) {
        html += `<em>${inlineMarkdownToHtml(italic.content)}</em>`;
        index = italic.end;
        continue;
      }
    }

    html += escapeHtml(value[index]!);
    index += 1;
  }

  return html;
}

function closeList(html: string[], listType: 'ol' | 'ul' | null) {
  if (listType) html.push(`</${listType}>`);
  return null;
}

export function markdownToHtml(markdown: string) {
  if (!markdown) return '';
  const html: string[] = [];
  let listType: 'ol' | 'ul' | null = null;
  let taskList = false;

  const endList = () => {
    listType = closeList(html, listType);
    taskList = false;
  };

  for (const line of markdown.replace(/\n$/, '').split('\n')) {
    const task = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (task) {
      if (listType !== 'ul' || !taskList) {
        endList();
        html.push('<ul data-task="true">');
        listType = 'ul';
        taskList = true;
      }
      const checked = task[1] !== ' ';
      html.push(
        `<li data-checked="${checked}"><span class="check${checked ? ' on' : ''}" contenteditable="false"></span>${inlineMarkdownToHtml(task[2]!)}</li>`,
      );
      continue;
    }

    const unordered = line.match(/^[-*]\s+(.*)$/);
    const ordered = line.match(/^\d+\.\s+(.*)$/);
    const nextListType = unordered ? 'ul' : ordered ? 'ol' : null;
    if (nextListType) {
      if (listType !== nextListType || taskList) {
        endList();
        html.push(`<${nextListType}>`);
        listType = nextListType;
      }
      html.push(`<li>${inlineMarkdownToHtml((unordered ?? ordered)![1]!)}</li>`);
      continue;
    }

    endList();

    if (/^(?:---|\*\*\*|___)\s*$/.test(line)) {
      html.push('<hr>');
      continue;
    }

    const quote = line.match(/^>\s?(.*)$/);
    if (quote) {
      html.push(`<blockquote>${inlineMarkdownToHtml(quote[1]!) || '<br>'}</blockquote>`);
      continue;
    }

    const heading = line.match(/^(#{1,3})\s*(\S.*)$/);
    if (heading) {
      html.push(
        `<h${heading[1]!.length}>${inlineMarkdownToHtml(heading[2]!)}</h${heading[1]!.length}>`,
      );
      continue;
    }

    html.push(`<div>${inlineMarkdownToHtml(line) || '<br>'}</div>`);
  }

  endList();
  return html.join('');
}
