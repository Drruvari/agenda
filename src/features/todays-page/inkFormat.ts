import { createId } from '@/data/schema/ids';

export type InkPoint = {
  x: number;
  y: number;
  /** Pressure 0–1 when available from stylus. */
  p?: number;
};

export type InkStroke = {
  id: string;
  color: string;
  width: number;
  /** 0–1, used for highlighter strokes. Defaults to 1. */
  opacity?: number;
  points: InkPoint[];
};

export type InkView = {
  x: number;
  y: number;
  scale: number;
};

export type InkDocument = {
  version: 1;
  strokes: InkStroke[];
  view?: InkView;
};

export const EMPTY_INK: InkDocument = {
  version: 1,
  strokes: [],
  view: { x: 0, y: 0, scale: 1 },
};

export function createStroke(
  color: string,
  width: number,
  points: InkPoint[] = [],
  opacity = 1,
): InkStroke {
  return {
    id: createId(),
    color,
    width,
    ...(opacity < 1 ? { opacity } : {}),
    points,
  };
}

export function serializeInk(doc: InkDocument): string {
  return JSON.stringify({
    version: 1,
    strokes: doc.strokes.map((stroke) => ({
      id: stroke.id,
      color: stroke.color,
      width: stroke.width,
      ...(stroke.opacity != null && stroke.opacity < 1 ? { opacity: stroke.opacity } : {}),
      points: stroke.points.map((point) =>
        point.p == null ? { x: point.x, y: point.y } : { x: point.x, y: point.y, p: point.p },
      ),
    })),
    view: doc.view ?? { x: 0, y: 0, scale: 1 },
  } satisfies InkDocument);
}

export function parseInk(data: string | null | undefined): InkDocument {
  if (!data?.trim()) return { ...EMPTY_INK, strokes: [] };

  try {
    const raw = JSON.parse(data) as Partial<InkDocument>;
    if (raw.version !== 1 || !Array.isArray(raw.strokes)) {
      return { ...EMPTY_INK, strokes: [] };
    }

    const strokes: InkStroke[] = raw.strokes
      .map((stroke) => {
        if (!stroke || typeof stroke !== 'object') return null;
        const points = Array.isArray(stroke.points)
          ? stroke.points
              .filter(
                (point): point is InkPoint =>
                  !!point &&
                  typeof point === 'object' &&
                  typeof point.x === 'number' &&
                  typeof point.y === 'number',
              )
              .map((point) => ({
                x: point.x,
                y: point.y,
                ...(typeof point.p === 'number' ? { p: point.p } : {}),
              }))
          : [];

        if (points.length === 0) return null;

        return {
          id: typeof stroke.id === 'string' ? stroke.id : createId(),
          color: typeof stroke.color === 'string' ? stroke.color : '#000000',
          width: typeof stroke.width === 'number' && stroke.width > 0 ? stroke.width : 3,
          ...(typeof stroke.opacity === 'number' && stroke.opacity < 1
            ? { opacity: Math.max(0.05, Math.min(1, stroke.opacity)) }
            : {}),
          points,
        };
      })
      .filter((stroke): stroke is InkStroke => stroke != null);

    const view =
      raw.view &&
      typeof raw.view.x === 'number' &&
      typeof raw.view.y === 'number' &&
      typeof raw.view.scale === 'number'
        ? {
            x: raw.view.x,
            y: raw.view.y,
            scale: Math.min(4, Math.max(0.35, raw.view.scale)),
          }
        : { x: 0, y: 0, scale: 1 };

    return { version: 1, strokes, view };
  } catch {
    return { ...EMPTY_INK, strokes: [] };
  }
}

/** Lowest painted Y for strokes (includes half stroke width). */
export function inkContentBottom(
  strokes: InkStroke[],
  livePoints?: InkPoint[],
  liveWidth = 0,
): number {
  let maxY = 0;
  for (const stroke of strokes) {
    const pad = stroke.width * 0.5;
    for (const point of stroke.points) {
      maxY = Math.max(maxY, point.y + pad);
    }
  }
  if (livePoints && livePoints.length > 0) {
    const pad = liveWidth * 0.5;
    for (const point of livePoints) {
      maxY = Math.max(maxY, point.y + pad);
    }
  }
  return maxY;
}

/** Approximate distance from a world point to a polyline stroke. */
export function distanceToStroke(stroke: InkStroke, x: number, y: number): number {
  if (stroke.points.length === 0) return Number.POSITIVE_INFINITY;
  if (stroke.points.length === 1) {
    const point = stroke.points[0]!;
    return Math.hypot(point.x - x, point.y - y);
  }

  let best = Number.POSITIVE_INFINITY;
  for (let index = 1; index < stroke.points.length; index += 1) {
    const a = stroke.points[index - 1]!;
    const b = stroke.points[index]!;
    best = Math.min(best, distanceToSegment(x, y, a.x, a.y, b.x, b.y));
  }
  return best;
}

function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}
