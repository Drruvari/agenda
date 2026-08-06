import { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, PointerType } from 'react-native-gesture-handler';
import { Canvas, Group, Path, Skia } from '@shopify/react-native-skia';
import { runOnJS } from 'react-native-reanimated';

import {
  createStroke,
  distanceToStroke,
  type InkDocument,
  type InkPoint,
  type InkStroke,
  type InkView,
} from '@/features/todays-page/inkFormat';

export type InkTool = 'pen' | 'eraser';

type Props = {
  document: InkDocument;
  inkColor: string;
  penOnly: boolean;
  tool: InkTool;
  onChange: (next: InkDocument) => void;
  onDrawingActiveChange?: (active: boolean) => void;
};

const MIN_SCALE = 0.4;
const MAX_SCALE = 4;
const BASE_WIDTH = 3.2;
const ERASE_HIT = 18;

type ViewState = InkView;

function pointsToPath(points: InkPoint[]) {
  const path = Skia.Path.Make();
  if (points.length === 0) return path;
  path.moveTo(points[0]!.x, points[0]!.y);
  for (let index = 1; index < points.length; index += 1) {
    path.lineTo(points[index]!.x, points[index]!.y);
  }
  return path;
}

function strokeWidthForPressure(base: number, pressure?: number) {
  if (pressure == null || Number.isNaN(pressure)) return base;
  return Math.max(1, base * (0.45 + 0.7 * Math.min(1, Math.max(0, pressure))));
}

function screenToWorld(x: number, y: number, view: ViewState) {
  return {
    x: (x - view.x) / view.scale,
    y: (y - view.y) / view.scale,
  };
}

export function InkCanvas({
  document,
  inkColor,
  penOnly,
  tool,
  onChange,
  onDrawingActiveChange,
}: Props) {
  const [strokes, setStrokes] = useState<InkStroke[]>(() => document.strokes);
  const [view, setView] = useState<ViewState>(() => document.view ?? { x: 0, y: 0, scale: 1 });
  const [livePoints, setLivePoints] = useState<InkPoint[]>([]);
  const [liveWidth, setLiveWidth] = useState(BASE_WIDTH);
  const [layout, setLayout] = useState({ width: 1, height: 1 });

  const strokesRef = useRef(strokes);
  const viewRef = useRef(view);
  const liveWidthRef = useRef(liveWidth);
  const sessionRef = useRef<'idle' | 'drawing'>('idle');
  const panOrigin = useRef({ tx: 0, ty: 0 });
  const pinchOrigin = useRef({ scale: 1, tx: 0, ty: 0, fx: 0, fy: 0 });

  strokesRef.current = strokes;
  viewRef.current = view;
  liveWidthRef.current = liveWidth;

  const emit = useCallback(
    (nextStrokes: InkStroke[], nextView: ViewState) => {
      onChange({ version: 1, strokes: nextStrokes, view: nextView });
    },
    [onChange],
  );

  const setActive = useCallback(
    (active: boolean) => {
      onDrawingActiveChange?.(active);
    },
    [onDrawingActiveChange],
  );

  const allowPointer = useCallback(
    (pointerType: PointerType) => {
      if (!penOnly) return true;
      return pointerType === PointerType.STYLUS;
    },
    [penOnly],
  );

  const beginStroke = useCallback(
    (x: number, y: number, pointerType: PointerType, pressure?: number) => {
      if (!allowPointer(pointerType)) return;
      const world = screenToWorld(x, y, viewRef.current);
      const width = strokeWidthForPressure(BASE_WIDTH, pressure);
      setLiveWidth(width);
      liveWidthRef.current = width;
      setLivePoints([{ ...world, p: pressure }]);
      sessionRef.current = 'drawing';
      setActive(true);
    },
    [allowPointer, setActive],
  );

  const moveStroke = useCallback(
    (x: number, y: number, pointerType: PointerType, pressure?: number) => {
      if (sessionRef.current !== 'drawing') return;
      if (!allowPointer(pointerType)) return;
      const world = screenToWorld(x, y, viewRef.current);
      setLivePoints((current) => {
        const last = current.at(-1);
        if (last && Math.hypot(last.x - world.x, last.y - world.y) < 0.7) return current;
        return [...current, { ...world, p: pressure }];
      });
    },
    [allowPointer],
  );

  const endStroke = useCallback(() => {
    if (sessionRef.current !== 'drawing') return;
    sessionRef.current = 'idle';
    setLivePoints((points) => {
      if (points.length > 0) {
        const stroke = createStroke(inkColor, liveWidthRef.current, points);
        const next = [...strokesRef.current, stroke];
        strokesRef.current = next;
        setStrokes(next);
        emit(next, viewRef.current);
      }
      return [];
    });
    setActive(false);
  }, [emit, inkColor, setActive]);

  const cancelStroke = useCallback(() => {
    if (sessionRef.current !== 'drawing') return;
    sessionRef.current = 'idle';
    setLivePoints([]);
    setActive(false);
  }, [setActive]);

  const eraseAt = useCallback(
    (x: number, y: number, pointerType: PointerType) => {
      if (!allowPointer(pointerType)) return;
      const world = screenToWorld(x, y, viewRef.current);
      const current = strokesRef.current;
      let hitId: string | null = null;
      let best = ERASE_HIT;
      for (const stroke of current) {
        const distance = distanceToStroke(stroke, world.x, world.y);
        const threshold = Math.max(ERASE_HIT, stroke.width * 2.5);
        if (distance <= threshold && distance < best) {
          best = distance;
          hitId = stroke.id;
        }
      }
      if (!hitId) return;
      const next = current.filter((stroke) => stroke.id !== hitId);
      strokesRef.current = next;
      setStrokes(next);
      emit(next, viewRef.current);
    },
    [allowPointer, emit],
  );

  const updatePan = useCallback((translationX: number, translationY: number) => {
    const next = {
      x: panOrigin.current.tx + translationX,
      y: panOrigin.current.ty + translationY,
      scale: viewRef.current.scale,
    };
    viewRef.current = next;
    setView(next);
  }, []);

  const updatePinch = useCallback((scaleFactor: number) => {
    const origin = pinchOrigin.current;
    const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, origin.scale * scaleFactor));
    const ratio = nextScale / origin.scale;
    const next = {
      scale: nextScale,
      x: origin.fx - (origin.fx - origin.tx) * ratio,
      y: origin.fy - (origin.fy - origin.ty) * ratio,
    };
    viewRef.current = next;
    setView(next);
  }, []);

  const persistView = useCallback(() => {
    emit(strokesRef.current, viewRef.current);
  }, [emit]);

  const drawGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(tool === 'pen')
        .maxPointers(1)
        .averageTouches(false)
        .activeOffsetX([-3, 3])
        .activeOffsetY([-3, 3])
        .onBegin((event) => {
          runOnJS(beginStroke)(event.x, event.y, event.pointerType, event.stylusData?.pressure);
        })
        .onUpdate((event) => {
          runOnJS(moveStroke)(event.x, event.y, event.pointerType, event.stylusData?.pressure);
        })
        .onEnd(() => {
          runOnJS(endStroke)();
        })
        .onTouchesCancelled(() => {
          runOnJS(cancelStroke)();
        }),
    [beginStroke, cancelStroke, endStroke, moveStroke, tool],
  );

  const eraseGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(tool === 'eraser')
        .maxPointers(1)
        .averageTouches(false)
        .activeOffsetX([-3, 3])
        .activeOffsetY([-3, 3])
        .onBegin((event) => {
          runOnJS(setActive)(true);
          runOnJS(eraseAt)(event.x, event.y, event.pointerType);
        })
        .onUpdate((event) => {
          runOnJS(eraseAt)(event.x, event.y, event.pointerType);
        })
        .onEnd(() => {
          runOnJS(setActive)(false);
        })
        .onFinalize(() => {
          runOnJS(setActive)(false);
        }),
    [eraseAt, setActive, tool],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .minPointers(2)
        .averageTouches(true)
        .onBegin(() => {
          panOrigin.current = {
            tx: viewRef.current.x,
            ty: viewRef.current.y,
          };
        })
        .onUpdate((event) => {
          runOnJS(updatePan)(event.translationX, event.translationY);
        })
        .onEnd(() => {
          runOnJS(persistView)();
        }),
    [persistView, updatePan],
  );

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .onBegin((event) => {
          pinchOrigin.current = {
            scale: viewRef.current.scale,
            tx: viewRef.current.x,
            ty: viewRef.current.y,
            fx: event.focalX,
            fy: event.focalY,
          };
        })
        .onUpdate((event) => {
          runOnJS(updatePinch)(event.scale);
        })
        .onEnd(() => {
          runOnJS(persistView)();
        }),
    [persistView, updatePinch],
  );

  const composed = useMemo(
    () =>
      Gesture.Simultaneous(
        Gesture.Exclusive(drawGesture, eraseGesture),
        panGesture,
        pinchGesture,
      ),
    [drawGesture, eraseGesture, panGesture, pinchGesture],
  );

  const livePath = useMemo(() => pointsToPath(livePoints), [livePoints]);
  const committed = useMemo(
    () =>
      strokes.map((stroke) => ({
        id: stroke.id,
        color: stroke.color,
        width: stroke.width,
        path: pointsToPath(stroke.points),
      })),
    [strokes],
  );

  return (
    <View
      style={styles.root}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width > 0 && height > 0) setLayout({ width, height });
      }}
    >
      <GestureDetector gesture={composed}>
        <View style={styles.hit} collapsable={false}>
          <Canvas style={{ width: layout.width, height: layout.height }}>
            <Group
              transform={[
                { translateX: view.x },
                { translateY: view.y },
                { scale: view.scale },
              ]}
            >
              {committed.map((stroke) => (
                <Path
                  key={stroke.id}
                  path={stroke.path}
                  color={stroke.color}
                  style="stroke"
                  strokeWidth={stroke.width}
                  strokeCap="round"
                  strokeJoin="round"
                />
              ))}
              {livePoints.length > 0 ? (
                <Path
                  path={livePath}
                  color={inkColor}
                  style="stroke"
                  strokeWidth={liveWidth}
                  strokeCap="round"
                  strokeJoin="round"
                />
              ) : null}
            </Group>
          </Canvas>
        </View>
      </GestureDetector>
    </View>
  );
}

/** Imperative helpers used by the page shell. */
export function undoInkDocument(doc: InkDocument): InkDocument {
  if (doc.strokes.length === 0) return doc;
  return { ...doc, strokes: doc.strokes.slice(0, -1) };
}

export function clearInkDocument(doc: InkDocument): InkDocument {
  return { ...doc, strokes: [] };
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 256,
    overflow: 'hidden',
  },
  hit: {
    flex: 1,
  },
});
