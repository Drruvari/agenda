import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { formatLongDate } from '@/data/schema/ids';
import type { InkDocument, InkPoint } from '@/features/todays-page/inkFormat';
import { markdownToHtml } from '@/features/todays-page/richMarkdown';

type SharePageOptions = {
  body: string;
  date: string;
  ink: InkDocument;
  mode: 'page' | 'sketch';
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function pointsToPath(points: InkPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const point = points[0]!;
    return `M ${point.x} ${point.y} L ${point.x + 0.01} ${point.y}`;
  }
  if (points.length === 2) {
    return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`;
  }

  let path = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const point = points[index]!;
    const next = points[index + 1]!;
    path += ` Q ${point.x} ${point.y} ${(point.x + next.x) / 2} ${(point.y + next.y) / 2}`;
  }
  const last = points.at(-1)!;
  return `${path} L ${last.x} ${last.y}`;
}

function sketchSvg(ink: InkDocument): string {
  const maxX = Math.max(540, ...ink.strokes.flatMap((stroke) => stroke.points.map((p) => p.x)));
  const maxY = Math.max(180, ...ink.strokes.flatMap((stroke) => stroke.points.map((p) => p.y)));
  const paths = ink.strokes
    .map(
      (stroke) =>
        `<path d="${pointsToPath(stroke.points)}" fill="none" stroke="${escapeHtml(stroke.color)}" stroke-width="${stroke.width}" stroke-opacity="${stroke.opacity ?? 1}" stroke-linecap="round" stroke-linejoin="round" />`,
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(maxX)} ${Math.ceil(maxY)}" role="img" aria-label="Sketch" style="display:block;width:100%;height:auto;background:#fff">${paths}</svg>`;
}

function pageHtml({ body, date, ink, mode }: SharePageOptions): string {
  const includeText = mode === 'page' && body.trim().length > 0;
  const includeSketch = ink.strokes.length > 0;

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      @page { margin: 44px; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #1c1c1e; background: #fff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
      header { margin-bottom: 28px; padding-bottom: 16px; border-bottom: 1px solid #d1d1d6; }
      h1 { margin: 0 0 5px; font-family: Georgia, serif; font-size: 28px; font-style: italic; font-weight: 400; }
      .date { color: #636366; font-size: 13px; }
      .text { margin-bottom: 28px; font-size: 16px; line-height: 1.55; overflow-wrap: anywhere; }
      .text h1, .text h2, .text h3 { margin: 0 0 8px; font-weight: 650; }
      .text h1 { font-size: 26px; } .text h2 { font-size: 22px; } .text h3 { font-size: 18px; }
      .text div, .text blockquote, .text ul, .text ol { margin: 0 0 8px; }
      .text ul, .text ol { padding-left: 22px; }
      .text blockquote { border-left: 3px solid #d1d1d6; padding-left: 12px; color: #636366; }
      .text code { font-family: ui-monospace, monospace; background: #f2f2f7; padding: 1px 4px; border-radius: 4px; }
      .sketch { overflow: hidden; border: 1px solid #e5e5ea; border-radius: 12px; }
      .empty { color: #8e8e93; font-size: 15px; }
    </style>
  </head>
  <body>
    <header><h1>${mode === 'sketch' ? 'Sketch' : 'Today’s page'}</h1><div class="date">${escapeHtml(formatLongDate(date))}</div></header>
    ${includeText ? `<div class="text">${markdownToHtml(body.trim())}</div>` : ''}
    ${includeSketch ? `<div class="sketch">${sketchSvg(ink)}</div>` : mode === 'sketch' ? '<div class="empty">No sketch</div>' : ''}
  </body>
</html>`;
}

export async function shareDailyPage(options: SharePageOptions): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error('File sharing is unavailable on this device.');
  }

  const { uri } = await Print.printToFileAsync({ html: pageHtml(options) });
  await Sharing.shareAsync(uri, {
    dialogTitle: options.mode === 'sketch' ? 'Share sketch' : 'Share today’s page',
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
  });
}
