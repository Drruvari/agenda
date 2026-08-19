import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  Keyboard,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import type { Repositories } from '@/data/repositories/repositories';
import type { AppSettings } from '@/data/schema/types';
import { DrawToolbar } from '@/features/todays-page/DrawToolbar';
import { InkCanvas, undoInkDocument } from '@/features/todays-page/InkCanvas';
import { EMPTY_INK, inkContentBottom, type InkDocument } from '@/features/todays-page/inkFormat';
import { DEFAULT_BRUSH, type InkBrush, type InkTool } from '@/features/todays-page/inkTools';
import { PageHeader } from '@/features/todays-page/PageHeader';
import { PageTextEditor, type PageTextEditorHandle } from '@/features/todays-page/PageTextEditor';
import { shareDailyPage } from '@/features/todays-page/shareDailyPage';
import { type DailyPageBlockState, useDailyPage } from '@/features/todays-page/useDailyPage';
import { triggerHaptic } from '@/lib/haptics';
import { useAppTheme } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';

type Mode = 'idle' | 'write' | 'draw';
type TextBlock = Extract<DailyPageBlockState, { type: 'text' }>;
type InkBlock = Extract<DailyPageBlockState, { type: 'ink' }>;

type Props = {
  date: string;
  repos: Repositories;
  settings: AppSettings;
  onCalendar: () => void;
  onError?: (message: string) => void;
  onPersisted?: () => void;
};

export function DailyPage({ date, repos, settings, onCalendar, onError, onPersisted }: Props) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const insets = useSafeAreaInsets();
  const { height, width } = useWindowDimensions();
  const editorRef = useRef<PageTextEditorHandle | null>(null);
  const textIdRef = useRef<string | undefined>(undefined);
  const inkIdRef = useRef<string | undefined>(undefined);
  const page = useDailyPage({ date, repos, onError, onPersisted });
  const [mode, setMode] = useState<Mode>('idle');
  const [tool, setTool] = useState<InkTool>('pen');
  const [brush, setBrush] = useState<InkBrush>(DEFAULT_BRUSH);
  const [redoInk, setRedoInk] = useState<InkBlock['ink']['strokes']>([]);
  const [liveBottom, setLiveBottom] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const textBlocks = page.blocks.filter((block): block is TextBlock => block.type === 'text');
  const inkBlocks = page.blocks.filter((block): block is InkBlock => block.type === 'ink');
  const body = useMemo(
    () =>
      textBlocks
        .map((block) => block.text)
        .filter(Boolean)
        .join('\n\n'),
    [textBlocks],
  );
  const ink = useMemo<InkDocument>(
    () => ({
      version: 1,
      strokes: inkBlocks.flatMap((block) => block.ink.strokes),
      view: { x: 0, y: 0, scale: 1 },
    }),
    [inkBlocks],
  );
  const canvasHeight = Math.max(
    height - insets.top - 110,
    inkContentBottom(ink.strokes) + 160,
    liveBottom + 160,
    720,
  );
  const toolbarBottom = keyboardHeight > 0 ? keyboardHeight + 8 : Math.max(insets.bottom, 8) + 8;

  useEffect(() => {
    textIdRef.current = textBlocks[0]?.id;
    inkIdRef.current = inkBlocks[0]?.id;
  }, [inkBlocks, textBlocks]);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => setKeyboardHeight(event.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const changeBody = (text: string) => {
    const id = textIdRef.current;
    if (!id) return;
    page.changeText(id, text, {
      continueNumberedLists: settings.editor.continueNumberedLists,
    });
    textBlocks.slice(1).forEach((block) => {
      if (block.text) page.changeText(block.id, '');
    });
  };

  const changeInk = (next: InkDocument) => {
    const id = inkIdRef.current;
    if (!id) return;
    page.changeInk(id, next);
    inkBlocks.slice(1).forEach((block) => {
      if (block.ink.strokes.length) page.changeInk(block.id, EMPTY_INK);
    });
  };

  const enterDraw = async () => {
    editorRef.current?.blur();
    Keyboard.dismiss();
    if (!inkIdRef.current) {
      const created = await page.insertBlock('ink', page.blocks.at(-1)?.id);
      if (created) inkIdRef.current = created.id;
    }
    setMode('draw');
    setTool('pen');
    triggerHaptic('selection');
  };

  const finishEditing = () => {
    editorRef.current?.blur();
    Keyboard.dismiss();
    setMode('idle');
    triggerHaptic('selection');
  };

  const undo = () => {
    const removed = ink.strokes.at(-1);
    if (!removed) return;
    setRedoInk((current) => [...current, removed]);
    changeInk(undoInkDocument(ink));
  };

  const redo = () => {
    const restored = redoInk.at(-1);
    if (!restored) return;
    setRedoInk((current) => current.slice(0, -1));
    changeInk({ ...ink, strokes: [...ink.strokes, restored] });
  };

  const exportPdf = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await shareDailyPage({ body, date, ink, mode: 'page' });
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Could not export page');
    } finally {
      setSharing(false);
    }
  };

  const clearPage = () =>
    Alert.alert('Clear page?', 'This removes its writing and drawing.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear page',
        style: 'destructive',
        onPress: () => void page.clear().then(finishEditing),
      },
    ]);

  const openMenu = () => {
    const actions = [
      {
        label: 'Share page',
        run: () => void Share.share({ message: body.trim() || 'Empty page' }),
      },
      { label: 'Export PDF', run: () => void exportPdf() },
      { label: 'Clear page', run: clearPage },
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...actions.map((action) => action.label), 'Cancel'],
          cancelButtonIndex: 3,
          destructiveButtonIndex: 2,
        },
        (index) => actions[index]?.run(),
      );
      return;
    }
    Alert.alert('Page', undefined, [
      ...actions.map((action, index) => ({
        text: action.label,
        style: index === 2 ? ('destructive' as const) : ('default' as const),
        onPress: action.run,
      })),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <View style={styles.root}>
      <View style={{ paddingTop: insets.top + 8 }}>
        <PageHeader
          date={date}
          drawing={mode === 'draw'}
          onCalendar={onCalendar}
          onDraw={() => void enterDraw()}
          onFinishDrawing={finishEditing}
          onMore={openMenu}
        />
      </View>

      {page.saveStatus === 'error' ? (
        <AnimatedPressable onPress={() => void page.retrySave()} style={styles.retry}>
          <Text style={styles.error}>Couldn’t save · Retry</Text>
        </AnimatedPressable>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: mode === 'draw' ? 108 : 48 },
        ]}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={mode !== 'draw' || settings.general.penOnlyDrawing}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.canvas, width >= 768 && styles.canvasTablet, { minHeight: canvasHeight }]}
        >
          <View
            pointerEvents={mode === 'draw' ? 'none' : 'auto'}
            style={[styles.editorLayer, { minHeight: canvasHeight }]}
          >
            <PageTextEditor
              key={date}
              ref={editorRef}
              editable={page.ready && mode !== 'draw'}
              font={settings.editor.font}
              fontSize={Math.max(17, settings.editor.fontSize)}
              highlight={settings.editor.renderMarkdown}
              minHeight={canvasHeight}
              onBlur={() => setMode((current) => (current === 'write' ? 'idle' : current))}
              onChangeText={changeBody}
              onFocus={() => setMode('write')}
              value={body}
            />
          </View>
          <View pointerEvents={mode === 'draw' ? 'auto' : 'none'} style={styles.inkLayer}>
            <InkCanvas
              document={ink}
              enabled={mode === 'draw'}
              onChange={(next) => {
                setRedoInk([]);
                changeInk(next);
              }}
              onLiveBottomChange={setLiveBottom}
              penOnly={settings.general.penOnlyDrawing}
              strokeColor={brush.color === 'primaryInk' ? theme.text : brush.color}
              strokeOpacity={brush.opacity}
              strokeStorageColor={brush.color}
              strokeWidth={brush.width}
              tool={tool}
            />
          </View>
        </View>
      </ScrollView>

      {mode === 'draw' ? (
        <View pointerEvents="box-none" style={[styles.toolbar, { bottom: toolbarBottom }]}>
          <DrawToolbar
            brush={brush}
            canRedo={redoInk.length > 0}
            canUndo={ink.strokes.length > 0}
            onBrushChange={setBrush}
            onRedo={redo}
            onToolChange={setTool}
            onUndo={undo}
            tool={tool}
          />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    retry: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 22 },
    error: { color: theme.danger, fontFamily: fonts.sansMedium, fontSize: 13 },
    scrollContent: { flexGrow: 1 },
    canvas: { width: '100%', alignSelf: 'center', paddingHorizontal: 22 },
    canvasTablet: { maxWidth: 720 },
    editorLayer: { zIndex: 1 },
    inkLayer: { position: 'absolute', inset: 0, left: 22, right: 22, zIndex: 2 },
    toolbar: { position: 'absolute', left: 14, right: 14, zIndex: 20 },
  });
}
