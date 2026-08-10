import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Icon } from '@/components/ui/Icon';
import type { Repositories } from '@/data/repositories';
import { formatLongDate } from '@/data/schema/ids';
import type { AppSettings } from '@/data/schema/types';
import { CanvasScrollbar } from '@/features/todays-page/CanvasScrollbar';
import { DrawToolbar } from '@/features/todays-page/DrawToolbar';
import { clearInkDocument, InkCanvas, undoInkDocument } from '@/features/todays-page/InkCanvas';
import { inkContentBottom } from '@/features/todays-page/inkFormat';
import { DEFAULT_BRUSH, type InkBrush, type InkTool } from '@/features/todays-page/inkTools';
import { useDailyPage } from '@/features/todays-page/useDailyPage';
import type { SaveStatus } from '@/features/todays-page/dailyNoteSession';
import { triggerHaptic } from '@/lib/haptics';
import { type AgendaTheme, continuousCorner, editorFontFamily, fonts, useAppTheme } from '@/theme';

/** Minimum paper height on the home card. */
const PAPER_MIN_HEIGHT = 280;
/** Home card stays compact — longer pages scroll inside. */
const CARD_MAX_HEIGHT = 320;
/** Always keep this much empty room under the lowest ink. */
const DRAW_BOTTOM_PAD = 168;
/** Extra bottom inset so strokes aren’t hidden under the floating bar. */
const TOOLBAR_CLEARANCE = 72;

type Props = {
  date: string;
  repos: Repositories;
  settings: AppSettings;
  onDrawingActiveChange?: (active: boolean) => void;
  onError?: (message: string) => void;
  onPersisted?: () => void;
};

export function TodaysPage({
  date,
  repos,
  settings,
  onDrawingActiveChange,
  onError,
  onPersisted,
}: Props) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput | null>(null);
  const fullInputRef = useRef<TextInput | null>(null);
  const fullScrollRef = useRef<ScrollView>(null);
  const cardScrollRef = useRef<ScrollView>(null);
  const fullScrollY = useSharedValue(0);
  const cardScrollY = useSharedValue(0);
  const fullScrollYRef = useRef(0);
  const cardScrollYRef = useRef(0);

  const [drawMode, setDrawMode] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tool, setTool] = useState<InkTool>('pen');
  const [brush, setBrush] = useState<InkBrush>(DEFAULT_BRUSH);
  const [textEditing, setTextEditing] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(PAPER_MIN_HEIGHT);
  const [liveBottom, setLiveBottom] = useState(0);

  const penOnly = settings.general.penOnlyDrawing;
  const locksParent = drawMode && !penOnly;

  const { body, ink, changeBody, changeInk, ready, saveStatus, recovered, retrySave } =
    useDailyPage({
      date,
      repos,
      onError,
      onPersisted,
    });

  const inkBottom = useMemo(() => inkContentBottom(ink.strokes), [ink.strokes]);

  const paperHeight = useMemo(() => {
    const contentBottom = Math.max(inkBottom, liveBottom);
    const withPad =
      contentBottom > 0 || drawMode
        ? Math.ceil(contentBottom + DRAW_BOTTOM_PAD + (drawMode ? TOOLBAR_CLEARANCE : 0))
        : PAPER_MIN_HEIGHT;
    const drawFloor = drawMode ? PAPER_MIN_HEIGHT + DRAW_BOTTOM_PAD : PAPER_MIN_HEIGHT;
    // Fullscreen fills the viewport; home card content can grow and scroll inside a max height.
    const viewportFloor = expanded && viewportHeight > 0 ? viewportHeight - 8 : 0;
    return Math.max(PAPER_MIN_HEIGHT, drawFloor, withPad, viewportFloor);
  }, [drawMode, expanded, inkBottom, liveBottom, viewportHeight]);

  const cardFrameHeight = Math.min(paperHeight, CARD_MAX_HEIGHT);

  const heightRef = useRef(PAPER_MIN_HEIGHT);

  useEffect(() => {
    onDrawingActiveChange?.(locksParent);
    return () => onDrawingActiveChange?.(false);
  }, [locksParent, onDrawingActiveChange]);

  useEffect(() => {
    const prev = heightRef.current;
    if (paperHeight > prev) {
      const delta = paperHeight - prev;
      if (expanded) {
        const next = fullScrollYRef.current + delta;
        fullScrollYRef.current = next;
        fullScrollY.value = next;
        fullScrollRef.current?.scrollTo({ y: next, animated: false });
      } else {
        // Keep the home card fixed height; scroll inside as the page grows.
        const next = cardScrollYRef.current + delta;
        cardScrollYRef.current = next;
        cardScrollY.value = next;
        cardScrollRef.current?.scrollTo({ y: next, animated: false });
      }
    }
    heightRef.current = paperHeight;
    setContentHeight(paperHeight);
  }, [cardScrollY, expanded, fullScrollY, paperHeight]);

  useEffect(() => {
    if (!drawMode) setLiveBottom(0);
  }, [drawMode]);

  const enterDrawMode = () => {
    inputRef.current?.blur();
    fullInputRef.current?.blur();
    setTextEditing(false);
    setTool('pen');
    setBrush(DEFAULT_BRUSH);
    setDrawMode(true);
    triggerHaptic('selection');
  };

  const enterTypeMode = (focus?: RefObject<TextInput | null>) => {
    setDrawMode(false);
    requestAnimationFrame(() => focus?.current?.focus());
    triggerHaptic('selection');
  };

  const toggleDraw = () => {
    if (drawMode) {
      setDrawMode(false);
      triggerHaptic('selection');
      return;
    }
    enterDrawMode();
  };

  const undo = () => {
    if (ink.strokes.length === 0) return;
    changeInk(undoInkDocument(ink));
    triggerHaptic('light');
  };

  const exportPage = () => {
    void Share.share({
      message: body.trim() || 'Today’s page is empty.',
    });
  };

  const openExpanded = () => {
    setExpanded(true);
    triggerHaptic('medium');
  };

  const closeExpanded = () => {
    setExpanded(false);
    triggerHaptic('selection');
  };

  const scrollToY = useCallback(
    (y: number) => {
      fullScrollYRef.current = y;
      fullScrollY.value = y;
      fullScrollRef.current?.scrollTo({ y, animated: false });
    },
    [fullScrollY],
  );

  const scrollCardToY = useCallback(
    (y: number) => {
      cardScrollYRef.current = y;
      cardScrollY.value = y;
      cardScrollRef.current?.scrollTo({ y, animated: false });
    },
    [cardScrollY],
  );

  const onFullScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      fullScrollYRef.current = y;
      fullScrollY.value = y;
    },
    [fullScrollY],
  );

  const onCardScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      cardScrollYRef.current = y;
      cardScrollY.value = y;
    },
    [cardScrollY],
  );

  const cardPaper = !expanded ? (
    <View style={[styles.cardFrame, { height: cardFrameHeight }]}>
      <ScrollView
        ref={cardScrollRef}
        style={styles.cardScroll}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!drawMode || penOnly}
        scrollEventThrottle={16}
        onScroll={onCardScroll}
      >
        <PaperSurface
          inputRef={inputRef}
          body={body}
          ink={ink}
          ready={ready}
          drawMode={drawMode}
          paperHeight={paperHeight}
          settings={settings}
          textEditing={textEditing}
          tool={tool}
          brush={brush}
          showToolbar={false}
          onBodyChange={(value) =>
            changeBody(value, {
              continueNumberedLists: settings.editor.continueNumberedLists,
            })
          }
          onInkChange={changeInk}
          onTextEditingChange={setTextEditing}
          onRequestType={() => enterTypeMode(inputRef)}
          onToolChange={setTool}
          onBrushChange={setBrush}
          onUndo={undo}
          onLiveBottomChange={setLiveBottom}
        />
      </ScrollView>

      <CanvasScrollbar
        contentHeight={paperHeight}
        viewportHeight={cardFrameHeight}
        scrollY={cardScrollY}
        onScrollTo={scrollCardToY}
      />

      {drawMode ? (
        <View style={styles.cardToolbarDock} pointerEvents="box-none">
          <DrawToolbar
            tool={tool}
            brush={brush}
            canUndo={ink.strokes.length > 0}
            onToolChange={setTool}
            onBrushChange={setBrush}
            onUndo={undo}
          />
        </View>
      ) : null}
    </View>
  ) : null;

  return (
    <>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.heading}>Today’s page</Text>
            <SaveStatusLabel
              recovered={recovered}
              status={saveStatus}
              onRetry={() => void retrySave()}
            />
          </View>
          <View style={styles.actions}>
            <HeaderButton
              name="pencil"
              active={drawMode}
              onPress={toggleDraw}
              accessibilityLabel={drawMode ? 'Done drawing' : 'Draw'}
            />
            <HeaderButton
              name="share"
              onPress={exportPage}
              accessibilityLabel="Share today’s page"
            />
            <HeaderButton
              name="expand"
              onPress={openExpanded}
              accessibilityLabel="Open today’s page full screen"
            />
          </View>
        </View>
        <View style={styles.body}>{cardPaper}</View>
      </View>

      <Modal
        visible={expanded}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeExpanded}
      >
        <GestureHandlerRootView style={styles.fullRoot}>
          <View style={[styles.fullRoot, { backgroundColor: theme.background }]}>
            <View style={[styles.fullHeader, { paddingTop: insets.top + 6 }]}>
              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel="Close full screen"
                haptic="selection"
                pressScale={0.94}
                onPress={closeExpanded}
                style={styles.fullHeaderBtn}
              >
                <Icon name="minimize" size={22} color={theme.text} />
              </AnimatedPressable>

              <View style={styles.fullTitleBlock}>
                <Text style={styles.fullEyebrow}>Today’s page</Text>
                <Text numberOfLines={1} style={styles.fullTitle}>
                  {formatLongDate(date)}
                </Text>
                <SaveStatusLabel
                  recovered={recovered}
                  status={saveStatus}
                  onRetry={() => void retrySave()}
                />
              </View>

              <AnimatedPressable
                accessibilityRole="button"
                accessibilityLabel={drawMode ? 'Switch to typing' : 'Draw'}
                accessibilityState={{ selected: drawMode }}
                haptic={drawMode ? 'medium' : 'light'}
                pressScale={0.94}
                onPress={toggleDraw}
                style={[styles.fullHeaderBtn, drawMode ? styles.fullHeaderBtnActive : null]}
              >
                <Icon name="pencil" size={22} color={drawMode ? theme.onPrimary : theme.text} />
              </AnimatedPressable>
            </View>

            <View
              style={styles.fullBody}
              onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
            >
              <ScrollView
                ref={fullScrollRef}
                style={styles.fullScroll}
                contentContainerStyle={styles.fullScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={!drawMode || penOnly}
                scrollEventThrottle={16}
                onScroll={onFullScroll}
              >
                <PaperSurface
                  inputRef={fullInputRef}
                  body={body}
                  ink={ink}
                  ready={ready}
                  drawMode={drawMode}
                  paperHeight={paperHeight}
                  settings={settings}
                  textEditing={textEditing}
                  tool={tool}
                  brush={brush}
                  showToolbar={false}
                  onBodyChange={(value) =>
                    changeBody(value, {
                      continueNumberedLists: settings.editor.continueNumberedLists,
                    })
                  }
                  onInkChange={changeInk}
                  onTextEditingChange={setTextEditing}
                  onRequestType={() => enterTypeMode(fullInputRef)}
                  onToolChange={setTool}
                  onBrushChange={setBrush}
                  onUndo={undo}
                  onLiveBottomChange={setLiveBottom}
                />
              </ScrollView>

              <CanvasScrollbar
                contentHeight={contentHeight}
                viewportHeight={viewportHeight}
                scrollY={fullScrollY}
                onScrollTo={scrollToY}
              />
            </View>

            <View style={[styles.fullFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              {drawMode ? (
                <View style={styles.footerToolbar} pointerEvents="box-none">
                  <DrawToolbar
                    tool={tool}
                    brush={brush}
                    canUndo={ink.strokes.length > 0}
                    onToolChange={setTool}
                    onBrushChange={setBrush}
                    onUndo={undo}
                  />
                </View>
              ) : null}

              <View style={styles.modeBar}>
                <ModePill
                  label="Type"
                  active={!drawMode}
                  onPress={() => enterTypeMode(fullInputRef)}
                />
                <ModePill label="Draw" active={drawMode} onPress={enterDrawMode} />
                <AnimatedPressable
                  accessibilityLabel="Clear drawing"
                  accessibilityState={{ disabled: ink.strokes.length === 0 }}
                  disabled={ink.strokes.length === 0}
                  haptic="warning"
                  pressScale={0.94}
                  onPress={() => changeInk(clearInkDocument(ink))}
                  style={[
                    styles.clearPill,
                    ink.strokes.length === 0 ? styles.clearPillDisabled : null,
                  ]}
                >
                  <Icon
                    name="trash"
                    size={16}
                    color={ink.strokes.length === 0 ? theme.textTertiary : theme.danger}
                  />
                  <Text
                    style={[
                      styles.clearLabel,
                      ink.strokes.length === 0 ? styles.clearLabelDisabled : null,
                    ]}
                  >
                    Clear
                  </Text>
                </AnimatedPressable>
              </View>
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}

function PaperSurface({
  inputRef,
  body,
  ink,
  ready,
  drawMode,
  paperHeight,
  settings,
  textEditing,
  tool,
  brush,
  showToolbar,
  onBodyChange,
  onInkChange,
  onTextEditingChange,
  onRequestType,
  onToolChange,
  onBrushChange,
  onUndo,
  onLiveBottomChange,
}: {
  inputRef: RefObject<TextInput | null>;
  body: string;
  ink: ReturnType<typeof useDailyPage>['ink'];
  ready: boolean;
  drawMode: boolean;
  paperHeight: number;
  settings: AppSettings;
  textEditing: boolean;
  tool: InkTool;
  brush: InkBrush;
  showToolbar: boolean;
  onBodyChange: (value: string) => void;
  onInkChange: (next: ReturnType<typeof useDailyPage>['ink']) => void;
  onTextEditingChange: (editing: boolean) => void;
  onRequestType: () => void;
  onToolChange: (tool: InkTool) => void;
  onBrushChange: (brush: InkBrush) => void;
  onUndo: () => void;
  onLiveBottomChange: (bottom: number) => void;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const margin = settings.editor.pageMargin;
  const showMarkdown = settings.editor.renderMarkdown && !textEditing && !drawMode;

  return (
    <View style={[styles.surface, { minHeight: paperHeight }]}>
      {showMarkdown ? (
        <AnimatedPressable
          accessibilityLabel="Edit today’s page"
          onPress={ready ? onRequestType : undefined}
          disabled={!ready}
          pressScale={0.995}
          style={[styles.textLayer, { padding: margin, minHeight: paperHeight }]}
          pointerEvents={drawMode || !ready ? 'none' : 'auto'}
        >
          <MarkdownPreview
            body={body}
            fontFamily={editorFontFamily(settings.editor.font)}
            fontSize={settings.editor.fontSize}
          />
        </AnimatedPressable>
      ) : (
        <TextInput
          ref={inputRef}
          value={body}
          editable={ready && !drawMode}
          onChangeText={onBodyChange}
          onFocus={() => onTextEditingChange(true)}
          onBlur={() => onTextEditingChange(false)}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
          placeholder="Write something..."
          placeholderTextColor={theme.placeholder}
          pointerEvents={drawMode ? 'none' : 'auto'}
          style={[
            styles.textLayer,
            styles.input,
            {
              padding: margin,
              minHeight: paperHeight,
              fontFamily: editorFontFamily(settings.editor.font),
              fontSize: settings.editor.fontSize,
              lineHeight: Math.round(settings.editor.fontSize * 1.4),
            },
          ]}
        />
      )}

      {ready ? (
        <InkCanvas
          document={ink}
          strokeColor={brush.color}
          strokeWidth={brush.width}
          strokeOpacity={brush.opacity}
          penOnly={settings.general.penOnlyDrawing}
          tool={tool}
          enabled={drawMode}
          onChange={onInkChange}
          onLiveBottomChange={onLiveBottomChange}
        />
      ) : null}

      {showToolbar ? (
        <View style={styles.toolbarDock} pointerEvents="box-none">
          <DrawToolbar
            tool={tool}
            brush={brush}
            canUndo={ink.strokes.length > 0}
            onToolChange={onToolChange}
            onBrushChange={onBrushChange}
            onUndo={onUndo}
          />
        </View>
      ) : null}
    </View>
  );
}

function SaveStatusLabel({
  recovered,
  status,
  onRetry,
}: {
  recovered: boolean;
  status: SaveStatus;
  onRetry: () => void;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  if (status === 'error') {
    return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel="Retry saving today’s page"
        haptic="warning"
        pressScale={0.98}
        onPress={onRetry}
      >
        <Text style={styles.saveError}>Couldn’t save — tap to retry</Text>
      </AnimatedPressable>
    );
  }

  if (recovered && (status === 'dirty' || status === 'saving')) {
    return <Text style={styles.saveMuted}>Recovered unsaved changes</Text>;
  }

  if (status === 'dirty' || status === 'saving') {
    return <Text style={styles.saveMuted}>Saving…</Text>;
  }

  if (status === 'saved') {
    return <Text style={styles.saveMuted}>Saved</Text>;
  }

  return null;
}

function HeaderButton({
  name,
  active = false,
  onPress,
  accessibilityLabel,
}: {
  name: 'pencil' | 'share' | 'expand';
  active?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      hitSlop={4}
      haptic={active ? 'medium' : 'light'}
      pressScale={0.94}
      style={[styles.headerBtn, active ? styles.headerBtnActive : styles.headerBtnIdle]}
    >
      <Icon name={name} size={22} color={active ? theme.onPrimary : theme.primary} />
    </AnimatedPressable>
  );
}

function ModePill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      haptic="selection"
      pressScale={0.97}
      style={[styles.modePill, active ? styles.modePillActive : styles.modePillIdle]}
    >
      <Text style={[styles.modePillLabel, active && styles.modePillLabelActive]}>{label}</Text>
    </AnimatedPressable>
  );
}

function MarkdownPreview({
  body,
  fontFamily,
  fontSize,
}: {
  body: string;
  fontFamily?: string;
  fontSize: number;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  if (!body.trim()) {
    return <Text style={styles.markdownPlaceholder}>Write something...</Text>;
  }

  return (
    <View style={styles.markdownPreview}>
      {body.split('\n').map((line, index) => {
        const heading = /^(#{1,3})\s+(.+)$/.exec(line);
        const bullet = /^[-*]\s+(.+)$/.exec(line);
        return (
          <Text
            key={`${index}-${line}`}
            style={[
              styles.markdownLine,
              { fontFamily, fontSize, lineHeight: Math.round(fontSize * 1.4) },
              heading ? styles.markdownHeading : null,
            ]}
          >
            {heading ? heading[2] : bullet ? `•  ${bullet[1]}` : line || ' '}
          </Text>
        );
      })}
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.section,
      ...continuousCorner(16),
      padding: 4,
      gap: 4,
      overflow: 'hidden',
    },
    header: {
      minHeight: 44,
      paddingLeft: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    headerCopy: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    heading: {
      fontFamily: fonts.serifItalic,
      fontSize: 20,
      lineHeight: 24,
      color: theme.text,
      flexShrink: 1,
    },
    saveMuted: {
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 16,
      color: theme.textSecondary,
    },
    saveError: {
      fontFamily: fonts.sansMedium,
      fontSize: 12,
      lineHeight: 16,
      color: theme.danger,
    },
    actions: {
      flexDirection: 'row',
      gap: 4,
    },
    headerBtn: {
      width: 44,
      height: 44,
      ...continuousCorner(12),
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBtnActive: {
      backgroundColor: theme.primary,
    },
    headerBtnIdle: {
      backgroundColor: theme.primarySoft,
    },
    body: {
      position: 'relative',
    },
    cardFrame: {
      maxHeight: CARD_MAX_HEIGHT,
      ...continuousCorner(16),
      overflow: 'hidden',
      position: 'relative',
    },
    cardScroll: {
      flex: 1,
    },
    cardToolbarDock: {
      position: 'absolute',
      left: 8,
      right: 36,
      bottom: 10,
      alignItems: 'center',
      zIndex: 2,
    },
    surface: {
      ...continuousCorner(20),
      backgroundColor: theme.card,
      overflow: 'hidden',
      position: 'relative',
    },
    textLayer: {
      width: '100%',
      zIndex: 0,
    },
    input: {
      fontFamily: fonts.sans,
      fontSize: 16,
      lineHeight: 22,
      color: theme.text,
      outlineStyle: 'none',
      backgroundColor: 'transparent',
    } as any,
    toolbarDock: {
      position: 'absolute',
      left: 8,
      right: 8,
      bottom: 12,
      alignItems: 'center',
      zIndex: 2,
    },
    markdownPreview: { gap: 2 },
    markdownLine: { color: theme.text },
    markdownHeading: { fontFamily: fonts.sansSemi, fontSize: 22 },
    markdownPlaceholder: {
      color: theme.placeholder,
      fontFamily: fonts.sans,
      fontSize: 16,
    },

    fullRoot: {
      flex: 1,
    },
    fullHeader: {
      paddingHorizontal: 16,
      paddingBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    fullHeaderBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.section,
    },
    fullHeaderBtnActive: {
      backgroundColor: theme.primary,
    },
    fullTitleBlock: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
    },
    fullEyebrow: {
      fontFamily: fonts.sansMedium,
      fontSize: 10,
      lineHeight: 12,
      color: theme.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      textAlign: 'center',
    },
    fullTitle: {
      fontFamily: fonts.serifItalic,
      fontSize: 20,
      lineHeight: 24,
      color: theme.text,
      textAlign: 'center',
    },
    fullBody: {
      flex: 1,
      paddingHorizontal: 12,
      paddingRight: 4,
      position: 'relative',
    },
    fullScroll: {
      flex: 1,
    },
    fullScrollContent: {
      flexGrow: 1,
      paddingBottom: 8,
      paddingRight: 8,
    },
    fullFooter: {
      paddingHorizontal: 16,
      paddingTop: 6,
      gap: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.separator,
      backgroundColor: theme.background,
    },
    footerToolbar: {
      alignItems: 'center',
    },
    modeBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      padding: 4,
      borderRadius: 999,
      backgroundColor: theme.section,
    },
    modePill: {
      flex: 1,
      height: 40,
      paddingHorizontal: 10,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    modePillActive: {
      backgroundColor: theme.primary,
    },
    modePillIdle: {
      backgroundColor: 'transparent',
    },
    modePillLabel: {
      fontFamily: fonts.sansSemi,
      fontSize: 15,
      color: theme.text,
    },
    modePillLabelActive: {
      color: theme.onPrimary,
    },
    clearPill: {
      height: 40,
      paddingHorizontal: 12,
      borderRadius: 999,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: theme.isDark ? 'rgba(255,59,48,0.18)' : 'rgba(255,59,48,0.12)',
    },
    clearPillDisabled: {
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    clearLabel: {
      fontFamily: fonts.sansMedium,
      fontSize: 14,
      color: theme.danger,
    },
    clearLabelDisabled: {
      color: theme.textTertiary,
    },
  });
}
