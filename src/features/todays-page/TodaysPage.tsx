import { type ReactNode, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { Repositories } from '@/data/repositories';
import { formatLongDate } from '@/data/schema/ids';
import type { AppSettings } from '@/data/schema/types';
import type { SaveStatus } from '@/features/todays-page/dailyNoteSession';
import { DrawToolbar } from '@/features/todays-page/DrawToolbar';
import { clearInkDocument, InkCanvas, undoInkDocument } from '@/features/todays-page/InkCanvas';
import { inkContentBottom } from '@/features/todays-page/inkFormat';
import { DEFAULT_BRUSH, type InkBrush, type InkTool } from '@/features/todays-page/inkTools';
import { shareDailyPage } from '@/features/todays-page/shareDailyPage';
import { useDailyPage } from '@/features/todays-page/useDailyPage';
import { triggerHaptic } from '@/lib/haptics';
import { type AgendaTheme, continuousCorner, editorFontFamily, fonts, useAppTheme } from '@/theme';

const PREVIEW_HEIGHT = 320;
const SKETCH_MIN_HEIGHT = 260;
const SKETCH_GROW_STEP = 120;
const SKETCH_BOTTOM_PAD = 56;

type Props = {
  date: string;
  repos: Repositories;
  settings: AppSettings;
  onDrawingActiveChange?: (active: boolean) => void;
  onError?: (message: string) => void;
  onPersisted?: () => void;
};

type OpenMode = 'read' | 'text' | 'draw';
type Selection = { start: number; end: number };

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
  const { width } = useWindowDimensions();
  const inputRef = useRef<TextInput | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<OpenMode>('read');
  const [tool, setTool] = useState<InkTool>('pen');
  const [brush, setBrush] = useState<InkBrush>(DEFAULT_BRUSH);
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [redoInk, setRedoInk] = useState<ReturnType<typeof useDailyPage>['ink']['strokes']>([]);
  const [liveBottom, setLiveBottom] = useState(0);
  const [sharing, setSharing] = useState(false);

  const page = useDailyPage({ date, repos, onError, onPersisted });
  const { body, ink, changeBody, changeInk, ready, recovered, retrySave, saveStatus } = page;
  const hasText = body.trim().length > 0;
  const hasSketch = ink.strokes.length > 0;
  const isEmpty = !hasText && !hasSketch;
  const drawing = expanded && mode === 'draw';
  const textEditing = expanded && mode === 'text';
  const contentLong =
    body.length > 260 || body.split('\n').length > 7 || inkContentBottom(ink.strokes) > 150;
  const sketchHeight = Math.max(
    SKETCH_MIN_HEIGHT,
    Math.ceil(
      (Math.max(inkContentBottom(ink.strokes), liveBottom) + SKETCH_BOTTOM_PAD) / SKETCH_GROW_STEP,
    ) * SKETCH_GROW_STEP,
  );

  useEffect(() => {
    onDrawingActiveChange?.(drawing && !settings.general.penOnlyDrawing);
    return () => onDrawingActiveChange?.(false);
  }, [drawing, onDrawingActiveChange, settings.general.penOnlyDrawing]);

  useEffect(() => {
    if (expanded && mode === 'text') {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [expanded, mode]);

  const open = (nextMode: OpenMode = 'read') => {
    setMode(nextMode);
    setExpanded(true);
    triggerHaptic('medium');
    if (nextMode === 'text') requestAnimationFrame(() => inputRef.current?.focus());
  };

  const close = () => {
    Keyboard.dismiss();
    setMode('read');
    setExpanded(false);
    triggerHaptic('selection');
  };

  const enterText = () => {
    setMode('text');
    Keyboard.dismiss();
    requestAnimationFrame(() => inputRef.current?.focus());
    triggerHaptic('selection');
  };

  const enterDraw = () => {
    inputRef.current?.blur();
    Keyboard.dismiss();
    setMode('draw');
    setTool('pen');
    triggerHaptic('selection');
  };

  const finishEditing = () => {
    Keyboard.dismiss();
    inputRef.current?.blur();
    setMode('read');
    triggerHaptic('selection');
  };

  const updateInk = (next: typeof ink) => {
    setRedoInk([]);
    changeInk(next);
  };

  const undo = () => {
    const removed = ink.strokes.at(-1);
    if (!removed) return;
    setRedoInk((current) => [...current, removed]);
    changeInk(undoInkDocument(ink));
    triggerHaptic('light');
  };

  const redo = () => {
    const restored = redoInk.at(-1);
    if (!restored) return;
    setRedoInk((current) => current.slice(0, -1));
    changeInk({ ...ink, strokes: [...ink.strokes, restored] });
    triggerHaptic('light');
  };

  const applyTextFormat = (kind: 'heading' | 'bold' | 'italic' | 'bullet' | 'number' | 'check') => {
    const selected = body.slice(selection.start, selection.end);
    const lineStart = body.lastIndexOf('\n', Math.max(0, selection.start - 1)) + 1;
    const prefix =
      kind === 'heading' ? '# ' : kind === 'bullet' ? '- ' : kind === 'number' ? '1. ' : '☐ ';
    let replacement: string;
    let start = selection.start;
    let end = selection.end;
    if (kind === 'bold' || kind === 'italic') {
      const marker = kind === 'bold' ? '**' : '_';
      replacement = `${marker}${selected}${marker}`;
      start += marker.length;
      end = start + selected.length;
      changeBody(body.slice(0, selection.start) + replacement + body.slice(selection.end));
    } else {
      replacement = prefix;
      start = lineStart + prefix.length;
      end = start;
      changeBody(body.slice(0, lineStart) + replacement + body.slice(lineStart));
    }
    setSelection({ start, end });
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const shareText = () => void Share.share({ message: body.trim() || 'Today’s page is empty.' });
  const sharePdf = async (shareMode: 'page' | 'sketch') => {
    if (sharing) return;
    setSharing(true);
    try {
      await shareDailyPage({ body, date, ink, mode: shareMode });
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Could not share today’s page');
    } finally {
      setSharing(false);
    }
  };

  const confirmClear = () =>
    Alert.alert('Clear today’s page?', 'This removes its writing and drawing.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear page',
        style: 'destructive',
        onPress: () => {
          changeBody('');
          changeInk(clearInkDocument(ink));
        },
      },
    ]);

  const openMenu = () => {
    const options = ['Share as PDF', 'Share text', 'Clear page', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: 3, destructiveButtonIndex: 2, title: 'Today’s Page' },
        (index) => {
          if (index === 0) void sharePdf('page');
          if (index === 1) shareText();
          if (index === 2) confirmClear();
        },
      );
      return;
    }
    Alert.alert('Today’s Page', undefined, [
      { text: 'Share as PDF', onPress: () => void sharePdf('page') },
      {
        text: 'More options',
        onPress: () =>
          Alert.alert('More options', undefined, [
            { text: 'Share text', onPress: shareText },
            { text: 'Clear page', style: 'destructive', onPress: confirmClear },
            { text: 'Cancel', style: 'cancel' },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <>
      <View style={styles.section}>
        <View style={styles.previewHeader}>
          <View style={styles.headerCopy}>
            <Text style={styles.sectionTitle}>Today’s page</Text>
            <SaveStatusLabel
              recovered={recovered}
              status={saveStatus}
              onRetry={() => void retrySave()}
            />
          </View>
          <IconButton name="expand" label="Open today’s page" onPress={() => open('read')} />
        </View>

        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Open today’s page"
          disabled={!ready}
          onPress={() => open('read')}
          pressScale={0.995}
          style={styles.preview}
        >
          {isEmpty ? (
            <View style={styles.emptyPreview}>
              <Text style={styles.emptyTitle}>Write or sketch about today</Text>
              <View style={styles.emptyActions}>
                <InlineAction icon="typography" label="Write" onPress={() => open('text')} />
                <InlineAction icon="pencil" label="Draw" onPress={() => open('draw')} />
              </View>
            </View>
          ) : (
            <View style={styles.previewDocument}>
              {hasText ? (
                <MarkdownDocument
                  body={body.split('\n').slice(0, 7).join('\n')}
                  fontFamily={editorFontFamily(settings.editor.font)}
                  fontSize={17}
                  compact
                />
              ) : null}
              {hasSketch ? <InkPreview ink={ink} height={hasText ? 118 : 190} /> : null}
              {contentLong ? (
                <View style={styles.continueRow}>
                  <Text style={styles.continueLabel}>Continue editing</Text>
                  <Icon name="chevronDown" size={16} color={theme.textSecondary} />
                </View>
              ) : null}
            </View>
          )}
        </AnimatedPressable>
      </View>

      <Modal
        visible={expanded}
        animationType="slide"
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={close}
      >
        <GestureHandlerRootView style={styles.modalRoot}>
          <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
            <View style={styles.editorHeader}>
              <IconButton
                name={Platform.OS === 'android' ? 'back' : 'minimize'}
                label="Close today’s page"
                onPress={close}
              />
              <View style={styles.editorTitleBlock}>
                <Text style={styles.editorEyebrow}>
                  {mode === 'read' ? 'TODAY’S PAGE' : formatLongDate(date)}
                </Text>
                {mode === 'read' ? (
                  <Text style={styles.editorDate}>{formatLongDate(date)}</Text>
                ) : null}
                <SaveStatusLabel
                  recovered={recovered}
                  status={saveStatus}
                  onRetry={() => void retrySave()}
                />
              </View>
              {mode === 'read' ? (
                <IconButton name="more" label="Page options" onPress={openMenu} />
              ) : (
                <AnimatedPressable onPress={finishEditing} style={styles.doneButton}>
                  <Text style={styles.doneLabel}>Done</Text>
                </AnimatedPressable>
              )}
            </View>

            <ScrollView
              style={styles.documentScroll}
              contentContainerStyle={styles.documentScrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              showsVerticalScrollIndicator={false}
              scrollEnabled={!drawing || settings.general.penOnlyDrawing}
            >
              <View style={[styles.document, width >= 768 && styles.documentTablet]}>
                {textEditing ? (
                  <TextInput
                    ref={inputRef}
                    value={body}
                    editable={ready}
                    multiline
                    scrollEnabled={false}
                    selection={selection}
                    onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
                    onChangeText={(value) =>
                      changeBody(value, {
                        continueNumberedLists: settings.editor.continueNumberedLists,
                      })
                    }
                    placeholder="Write, sketch, think…"
                    placeholderTextColor={theme.placeholder}
                    textAlignVertical="top"
                    style={[
                      styles.editorInput,
                      { minHeight: hasSketch ? 48 : 170 },
                      {
                        fontFamily: editorFontFamily(settings.editor.font),
                        fontSize: Math.max(17, settings.editor.fontSize),
                      },
                    ]}
                  />
                ) : hasText ? (
                  <AnimatedPressable
                    accessibilityRole="button"
                    accessibilityLabel="Edit writing"
                    disabled={drawing}
                    onPress={enterText}
                    pressScale={0.998}
                    style={styles.markdownHit}
                  >
                    <MarkdownDocument
                      body={body}
                      fontFamily={editorFontFamily(settings.editor.font)}
                      fontSize={Math.max(17, settings.editor.fontSize)}
                    />
                  </AnimatedPressable>
                ) : !drawing ? (
                  <AnimatedPressable onPress={enterText} style={styles.emptyDocument}>
                    <Text style={styles.documentPlaceholder}>Write, sketch, think…</Text>
                  </AnimatedPressable>
                ) : null}

                {(hasSketch || drawing) && (
                  <View style={[styles.sketchBlock, { height: sketchHeight }]}>
                    {!hasSketch && drawing ? <Text style={styles.drawHint}>Draw here</Text> : null}
                    <InkCanvas
                      document={ink}
                      strokeColor={brush.color === 'primaryInk' ? theme.text : brush.color}
                      strokeStorageColor={brush.color}
                      strokeWidth={brush.width}
                      strokeOpacity={brush.opacity}
                      penOnly={settings.general.penOnlyDrawing}
                      tool={tool}
                      enabled={drawing}
                      onChange={updateInk}
                      onLiveBottomChange={setLiveBottom}
                    />
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={[styles.editorFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
              {textEditing ? (
                <TextToolbar onFormat={applyTextFormat} />
              ) : drawing ? (
                <DrawToolbar
                  tool={tool}
                  brush={brush}
                  canUndo={ink.strokes.length > 0}
                  canRedo={redoInk.length > 0}
                  onToolChange={setTool}
                  onBrushChange={setBrush}
                  onUndo={undo}
                  onRedo={redo}
                />
              ) : (
                <View style={styles.contextActions}>
                  <InlineAction icon="typography" label="Write" onPress={enterText} />
                  <InlineAction icon="pencil" label="Draw" onPress={enterDraw} />
                </View>
              )}
            </View>
          </View>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
}

function InkPreview({
  ink,
  height,
}: {
  ink: ReturnType<typeof useDailyPage>['ink'];
  height: number;
}) {
  return (
    <View style={{ height }} pointerEvents="none">
      <InkCanvas
        document={ink}
        strokeColor="transparent"
        strokeWidth={1}
        strokeOpacity={1}
        penOnly={false}
        tool="pen"
        enabled={false}
        onChange={() => undefined}
      />
    </View>
  );
}

function IconButton({
  name,
  label,
  onPress,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      haptic="selection"
      pressScale={0.92}
      style={styles.iconButton}
    >
      <Icon name={name} size={21} color={theme.text} />
    </AnimatedPressable>
  );
}

function InlineAction({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      haptic="selection"
      pressScale={0.94}
      style={styles.inlineAction}
    >
      <Icon name={icon} size={19} color={theme.primary} />
      <Text style={styles.inlineActionLabel}>{label}</Text>
    </AnimatedPressable>
  );
}

function TextToolbar({
  onFormat,
}: {
  onFormat: (kind: 'heading' | 'bold' | 'italic' | 'bullet' | 'number' | 'check') => void;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const tools: { label: string; kind: Parameters<typeof onFormat>[0] }[] = [
    { label: 'H1', kind: 'heading' },
    { label: 'B', kind: 'bold' },
    { label: 'I', kind: 'italic' },
    { label: '•', kind: 'bullet' },
    { label: '1.', kind: 'number' },
    { label: '☐', kind: 'check' },
  ];
  return (
    <View style={styles.textToolbar}>
      {tools.map((item) => (
        <AnimatedPressable
          key={item.kind}
          accessibilityRole="button"
          accessibilityLabel={item.kind}
          onPress={() => onFormat(item.kind)}
          pressScale={0.9}
          style={styles.textTool}
        >
          <Text
            style={[
              styles.textToolLabel,
              item.kind === 'bold' && styles.bold,
              item.kind === 'italic' && styles.italic,
            ]}
          >
            {item.label}
          </Text>
        </AnimatedPressable>
      ))}
    </View>
  );
}

function MarkdownDocument({
  body,
  fontFamily,
  fontSize,
  compact = false,
}: {
  body: string;
  fontFamily?: string;
  fontSize: number;
  compact?: boolean;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.markdownDocument, compact && styles.markdownDocumentCompact]}>
      {body.split('\n').map((source, index) => {
        const heading = /^(#{1,3})\s+(.+)$/.exec(source);
        const checklist = /^(?:[-*]\s+)?\[([ xX])\]\s+(.+)$/.exec(source);
        const symbolChecklist = /^([☐☑])\s+(.+)$/.exec(source);
        const bullet = /^[-*+]\s+(.+)$/.exec(source);
        const ordered = /^(\d+)[.)]\s+(.+)$/.exec(source);
        const key = `${index}-${source}`;

        if (!source) return <View key={key} style={styles.markdownSpacer} />;

        if (heading) {
          const level = heading[1]!.length;
          return (
            <Text
              key={key}
              style={[
                styles.markdownText,
                {
                  fontFamily: fonts.sansSemi,
                  fontSize: compact ? fontSize + (level === 1 ? 4 : 2) : fontSize + (4 - level) * 2,
                  lineHeight: compact ? fontSize + 10 : fontSize + (4 - level) * 2 + 8,
                },
              ]}
            >
              {renderInlineMarkdown(heading[2]!, styles)}
            </Text>
          );
        }

        if (checklist || symbolChecklist) {
          const checked = checklist
            ? checklist[1]!.toLowerCase() === 'x'
            : symbolChecklist![1] === '☑';
          const content = checklist ? checklist[2]! : symbolChecklist![2]!;
          return (
            <View key={key} style={styles.markdownRow}>
              <Text style={[styles.markdownMarker, { fontSize, lineHeight: fontSize + 8 }]}>
                {checked ? '☑' : '☐'}
              </Text>
              <Text
                style={[
                  styles.markdownText,
                  { fontFamily, fontSize, lineHeight: fontSize + 8 },
                  checked && styles.markdownChecked,
                ]}
              >
                {renderInlineMarkdown(content, styles)}
              </Text>
            </View>
          );
        }

        const marker = bullet ? '•' : ordered ? `${ordered[1]}.` : null;
        const content = bullet ? bullet[1]! : ordered ? ordered[2]! : source;
        return (
          <View key={key} style={marker ? styles.markdownRow : undefined}>
            {marker ? (
              <Text style={[styles.markdownMarker, { fontSize, lineHeight: fontSize + 8 }]}>
                {marker}
              </Text>
            ) : null}
            <Text style={[styles.markdownText, { fontFamily, fontSize, lineHeight: fontSize + 8 }]}>
              {renderInlineMarkdown(content, styles)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function renderInlineMarkdown(text: string, styles: ReturnType<typeof createStyles>): ReactNode[] {
  const nodes: ReactNode[] = [];
  const token = /(\*\*\*|___)(.+?)\1|\*\*(.+?)\*\*|__(.+?)__|\*([^*]+?)\*|_([^_]+?)_/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = token.exec(text)) != null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const content = match[2] ?? match[3] ?? match[4] ?? match[5] ?? match[6] ?? '';
    const bold = match[2] != null || match[3] != null || match[4] != null;
    const italic = match[2] != null || match[5] != null || match[6] != null;
    nodes.push(
      <Text
        key={`${match.index}-${content}`}
        style={[bold && styles.markdownBold, italic && styles.markdownItalic]}
      >
        {content}
      </Text>,
    );
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
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
  if (status === 'error')
    return (
      <AnimatedPressable onPress={onRetry}>
        <Text style={styles.saveError}>Couldn’t save — tap to retry</Text>
      </AnimatedPressable>
    );
  if (recovered && (status === 'dirty' || status === 'saving'))
    return <Text style={styles.saveMuted}>Recovered unsaved changes</Text>;
  if (status === 'dirty' || status === 'saving')
    return <Text style={styles.saveMuted}>Saving…</Text>;
  if (status === 'saved') return <Text style={styles.saveMuted}>Saved</Text>;
  return null;
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    section: {
      backgroundColor: 'transparent',
      overflow: 'visible',
    },
    previewHeader: {
      minHeight: 34,
      paddingHorizontal: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerCopy: { flex: 1, gap: 1 },
    sectionTitle: {
      fontFamily: fonts.serifItalic,
      fontSize: 22,
      lineHeight: 28,
      letterSpacing: -0.4,
      color: theme.text,
    },
    saveMuted: {
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 14,
      color: theme.textSecondary,
    },
    saveError: { fontFamily: fonts.sansMedium, fontSize: 11, color: theme.danger },
    iconButton: {
      width: 42,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 21,
    },
    preview: {
      height: PREVIEW_HEIGHT,
      marginTop: 8,
      padding: 16,
      backgroundColor: theme.section,
      ...continuousCorner(16),
      overflow: 'hidden',
    },
    emptyPreview: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
    emptyTitle: { fontFamily: fonts.sans, fontSize: 16, color: theme.textSecondary },
    emptyActions: { flexDirection: 'row', gap: 28 },
    inlineAction: {
      minHeight: 42,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 12,
      borderRadius: 21,
    },
    inlineActionLabel: { fontFamily: fonts.sansSemi, fontSize: 15, color: theme.text },
    previewDocument: { flex: 1 },
    continueRow: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingLeft: 20,
      paddingVertical: 4,
      backgroundColor: theme.section,
    },
    continueLabel: {
      fontFamily: fonts.sansMedium,
      fontSize: 13,
      color: theme.textSecondary,
    },
    modalRoot: { flex: 1, backgroundColor: theme.section },
    editorHeader: {
      minHeight: 64,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    editorTitleBlock: { flex: 1, alignItems: 'center' },
    editorEyebrow: {
      fontFamily: fonts.sansSemi,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.5,
      color: theme.text,
      textTransform: 'uppercase',
    },
    editorDate: {
      fontFamily: fonts.sans,
      fontSize: 13,
      lineHeight: 17,
      color: theme.textSecondary,
    },
    doneButton: { minWidth: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
    doneLabel: { fontFamily: fonts.sansSemi, fontSize: 16, color: theme.primary },
    documentScroll: { flex: 1 },
    documentScrollContent: { flexGrow: 1, paddingBottom: 40 },
    document: {
      width: '100%',
      maxWidth: 720,
      alignSelf: 'center',
      paddingHorizontal: 20,
      paddingTop: 20,
      backgroundColor: theme.section,
    },
    documentTablet: { paddingHorizontal: 28 },
    editorInput: {
      color: theme.text,
      lineHeight: 26,
      padding: 0,
      outlineStyle: 'none',
      backgroundColor: 'transparent',
    } as any,
    markdownHit: { minHeight: 48 },
    emptyDocument: { minHeight: 170 },
    documentPlaceholder: {
      fontFamily: fonts.sans,
      fontSize: 17,
      lineHeight: 26,
      color: theme.placeholder,
    },
    markdownDocument: { gap: 2 },
    markdownDocumentCompact: { maxHeight: 176, overflow: 'hidden' },
    markdownText: { flexShrink: 1, color: theme.text },
    markdownRow: { flexDirection: 'row', alignItems: 'flex-start' },
    markdownMarker: {
      width: 25,
      flexShrink: 0,
      fontFamily: fonts.sansMedium,
      color: theme.textSecondary,
    },
    markdownSpacer: { height: 10 },
    markdownBold: { fontFamily: fonts.sansSemi },
    markdownItalic: { fontFamily: fonts.serifItalic },
    markdownChecked: { color: theme.textSecondary, textDecorationLine: 'line-through' },
    sketchBlock: {
      position: 'relative',
      overflow: 'hidden',
    },
    drawHint: {
      position: 'absolute',
      alignSelf: 'center',
      top: 96,
      fontFamily: fonts.sans,
      fontSize: 15,
      color: theme.placeholder,
    },
    editorFooter: {
      minHeight: 62,
      paddingHorizontal: 14,
      paddingTop: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.separator,
      backgroundColor: theme.section,
    },
    contextActions: { flexDirection: 'row', justifyContent: 'space-around' },
    textToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    textTool: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
    textToolLabel: { fontFamily: fonts.sansMedium, fontSize: 16, color: theme.text },
    bold: { fontFamily: fonts.sansSemi },
    italic: { fontFamily: fonts.serifItalic },
  });
}
