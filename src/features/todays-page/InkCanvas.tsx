/* eslint-disable react-hooks/refs -- handlers read latest stroke refs by design */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, PointerType } from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import {
  createStroke,
  distanceToStroke,
  inkContentBottom,
  type InkDocument,
  type InkPoint,
  type InkStroke,
} from '@/features/todays-page/inkFormat';
import type { InkTool } from '@/features/todays-page/inkTools';
import { useAppTheme } from '@/theme';

type Props = {
  document: InkDocument;
  strokeColor: string;
  /** Color or semantic color role written into persisted strokes. */
  strokeStorageColor?: string;
  strokeWidth: number;
  strokeOpacity: number;
  penOnly: boolean;
  tool: InkTool;
  /** When false, ink still renders but does not capture touches. */
  enabled?: boolean;
  onChange: (next: InkDocument) => void;
  /** Live ink bottom Y while stroking (0 when idle) — used to grow the page. */
  onLiveBottomChange?: (bottom: number) => void;
};

const ERASE_HIT = 18;

/** Smooth quadratic path through stroke points (midpoint technique). */
function pointsToSvgPath(points: InkPoint[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const point = points[0]!;
    return `M ${point.x} ${point.y} L ${point.x + 0.01} ${point.y}`;
  }
  if (points.length === 2) {
    return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`;
  }

  let d = `M ${points[0]!.x} ${points[0]!.y}`;
  for (let index = 1; index < points.length - 1; index += 1) {
    const current = points[index]!;
    const next = points[index + 1]!;
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    d += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1]!;
  d += ` L ${last.x} ${last.y}`;
  return d;
}

function strokeWidthForPressure(base: number, pressure?: number) {
  if (pressure == null || Number.isNaN(pressure)) return base;
  return Math.max(1, base * (0.45 + 0.7 * Math.min(1, Math.max(0, pressure))));
}

export function InkCanvas({
  document,
  strokeColor,
  strokeStorageColor,
  strokeWidth,
  strokeOpacity,
  penOnly,
  tool,
  enabled = true,
  onChange,
  onLiveBottomChange,
}: Props) {
  const theme = useAppTheme();
  const strokes = document.strokes;
  const [livePoints, setLivePoints] = useState<InkPoint[]>([]);
  const [liveWidth, setLiveWidth] = useState(strokeWidth);
  const [liveOpacity, setLiveOpacity] = useState(strokeOpacity);
  const [layout, setLayout] = useState({ width: 1, height: 1 });

  const strokesRef = useRef(strokes);
  const livePointsRef = useRef<InkPoint[]>([]);
  const liveWidthRef = useRef(strokeWidth);
  const liveOpacityRef = useRef(strokeOpacity);
  const strokeColorRef = useRef(strokeColor);
  const strokeStorageColorRef = useRef(strokeStorageColor ?? strokeColor);
  const strokeWidthRef = useRef(strokeWidth);
  const strokeOpacityRef = useRef(strokeOpacity);
  const sessionRef = useRef(false);
  const penOnlyRef = useRef(penOnly);
  const onChangeRef = useRef(onChange);
  const onLiveBottomChangeRef = useRef(onLiveBottomChange);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    strokeColorRef.current = strokeColor;
    strokeStorageColorRef.current = strokeStorageColor ?? strokeColor;
    strokeWidthRef.current = strokeWidth;
    strokeOpacityRef.current = strokeOpacity;
  }, [strokeColor, strokeOpacity, strokeStorageColor, strokeWidth]);

  useEffect(() => {
    penOnlyRef.current = penOnly;
  }, [penOnly]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onLiveBottomChangeRef.current = onLiveBottomChange;
  }, [onLiveBottomChange]);

  const reportLiveBottom = useCallback((points: InkPoint[], width: number) => {
    if (points.length === 0) {
      onLiveBottomChangeRef.current?.(0);
      return;
    }
    onLiveBottomChangeRef.current?.(inkContentBottom([], points, width));
  }, []);

  const emit = useCallback((nextStrokes: InkStroke[]) => {
    onChangeRef.current({
      version: 1,
      strokes: nextStrokes,
      view: { x: 0, y: 0, scale: 1 },
    });
  }, []);

  const allowPointer = useCallback((pointerType: number) => {
    if (!penOnlyRef.current) return true;
    return pointerType === PointerType.STYLUS;
  }, []);

  const beginStroke = useCallback(
    (x: number, y: number, pointerType: number, pressure?: number) => {
      if (!allowPointer(pointerType)) return;
      const width = strokeWidthForPressure(strokeWidthRef.current, pressure);
      liveWidthRef.current = width;
      liveOpacityRef.current = strokeOpacityRef.current;
      setLiveWidth(width);
      setLiveOpacity(strokeOpacityRef.current);
      const points = [{ x, y, p: pressure }];
      livePointsRef.current = points;
      setLivePoints(points);
      sessionRef.current = true;
      reportLiveBottom(points, width);
    },
    [allowPointer, reportLiveBottom],
  );

  const moveStroke = useCallback(
    (x: number, y: number, pointerType: number, pressure?: number) => {
      if (!sessionRef.current) return;
      if (!allowPointer(pointerType)) return;
      const last = livePointsRef.current.at(-1);
      if (last && Math.hypot(last.x - x, last.y - y) < 0.45) return;
      const next = [...livePointsRef.current, { x, y, p: pressure }];
      livePointsRef.current = next;
      // Keep width reactive to pressure for a more natural pen feel.
      const width = strokeWidthForPressure(strokeWidthRef.current, pressure);
      liveWidthRef.current = width;
      setLiveWidth(width);
      setLivePoints(next);
      reportLiveBottom(next, width);
    },
    [allowPointer, reportLiveBottom],
  );

  const endStroke = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current = false;
    const points = livePointsRef.current;
    livePointsRef.current = [];
    setLivePoints([]);
    reportLiveBottom([], 0);
    if (points.length === 0) return;
    emit([
      ...strokesRef.current,
      createStroke(
        strokeStorageColorRef.current,
        liveWidthRef.current,
        points,
        liveOpacityRef.current,
      ),
    ]);
  }, [emit, reportLiveBottom]);

  const cancelStroke = useCallback(() => {
    if (!sessionRef.current) return;
    sessionRef.current = false;
    livePointsRef.current = [];
    setLivePoints([]);
    reportLiveBottom([], 0);
  }, [reportLiveBottom]);

  const eraseAt = useCallback(
    (x: number, y: number, pointerType: number) => {
      if (!allowPointer(pointerType)) return;
      const current = strokesRef.current;
      let hitId: string | null = null;
      let best = ERASE_HIT;
      for (const stroke of current) {
        const distance = distanceToStroke(stroke, x, y);
        const threshold = Math.max(ERASE_HIT, stroke.width * 2.5);
        if (distance <= threshold && distance < best) {
          best = distance;
          hitId = stroke.id;
        }
      }
      if (!hitId) return;
      emit(current.filter((stroke) => stroke.id !== hitId));
    },
    [allowPointer, emit],
  );

  // Stable bridges so gestures are not rebuilt every stroke.
  const beginStrokeJS = useCallback(
    (x: number, y: number, pointerType: number, pressure?: number) => {
      beginStroke(x, y, pointerType, pressure);
    },
    [beginStroke],
  );
  const moveStrokeJS = useCallback(
    (x: number, y: number, pointerType: number, pressure?: number) => {
      moveStroke(x, y, pointerType, pressure);
    },
    [moveStroke],
  );
  const endStrokeJS = useCallback(() => {
    endStroke();
  }, [endStroke]);
  const cancelStrokeJS = useCallback(() => {
    cancelStroke();
  }, [cancelStroke]);
  const eraseAtJS = useCallback(
    (x: number, y: number, pointerType: number) => {
      eraseAt(x, y, pointerType);
    },
    [eraseAt],
  );

  const inkGesture = useMemo(() => {
    const isInk = tool === 'pen' || tool === 'highlighter';
    const isErase = tool === 'eraser';

    return Gesture.Pan()
      .enabled(enabled && (isInk || isErase))
      .maxPointers(1)
      .averageTouches(false)
      .manualActivation(true)
      .onTouchesDown((event, state) => {
        'worklet';
        if (event.numberOfTouches < 1) {
          state.fail();
          return;
        }
        // Pen-only: let finger pass through to scroll / type.
        if (penOnly && event.pointerType !== PointerType.STYLUS) {
          state.fail();
          return;
        }
        state.activate();
      })
      .onStart((event) => {
        'worklet';
        if (isErase) {
          scheduleOnRN(eraseAtJS, event.x, event.y, event.pointerType);
          return;
        }
        scheduleOnRN(
          beginStrokeJS,
          event.x,
          event.y,
          event.pointerType,
          event.stylusData?.pressure,
        );
      })
      .onUpdate((event) => {
        'worklet';
        if (isErase) {
          scheduleOnRN(eraseAtJS, event.x, event.y, event.pointerType);
          return;
        }
        scheduleOnRN(moveStrokeJS, event.x, event.y, event.pointerType, event.stylusData?.pressure);
      })
      .onEnd(() => {
        'worklet';
        if (!isErase) scheduleOnRN(endStrokeJS);
      })
      .onFinalize((_event, success) => {
        'worklet';
        if (!success && !isErase) scheduleOnRN(cancelStrokeJS);
      });
  }, [beginStrokeJS, cancelStrokeJS, enabled, endStrokeJS, eraseAtJS, moveStrokeJS, penOnly, tool]);

  const livePath = useMemo(() => pointsToSvgPath(livePoints), [livePoints]);
  const committed = useMemo(
    () =>
      strokes.map((stroke) => ({
        id: stroke.id,
        color:
          stroke.color === 'primaryInk' ||
          (theme.isDark && (stroke.color === '#111111' || stroke.color === '#000000'))
            ? theme.text
            : stroke.color,
        width: stroke.width,
        opacity: stroke.opacity ?? 1,
        d: pointsToSvgPath(stroke.points),
      })),
    [strokes, theme.isDark, theme.text],
  );

  return (
    <View
      style={styles.root}
      pointerEvents={enabled ? 'auto' : 'none'}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) setLayout({ width, height });
      }}
    >
      <GestureDetector gesture={inkGesture}>
        <View style={styles.hit} collapsable={false}>
          <Svg width={layout.width} height={layout.height} style={styles.svg}>
            {committed.map((stroke) =>
              stroke.d ? (
                <Path
                  key={stroke.id}
                  d={stroke.d}
                  stroke={stroke.color}
                  strokeWidth={stroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeOpacity={stroke.opacity}
                  fill="none"
                />
              ) : null,
            )}
            {livePath ? (
              <Path
                d={livePath}
                stroke={strokeColor}
                strokeWidth={liveWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeOpacity={liveOpacity}
                fill="none"
              />
            ) : null}
          </Svg>
        </View>
      </GestureDetector>
    </View>
  );
}

export function undoInkDocument(doc: InkDocument): InkDocument {
  if (doc.strokes.length === 0) return doc;
  return { ...doc, strokes: doc.strokes.slice(0, -1) };
}

export function clearInkDocument(doc: InkDocument): InkDocument {
  return { ...doc, strokes: [] };
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  hit: {
    flex: 1,
  },
  svg: {
    flex: 1,
  },
});
