import { useCallback, useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, Text, TextInput, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Icon, type IconName } from '@/components/ui/Icon';
import type { Repositories } from '@/data/repositories';
import type { AppSettings } from '@/data/schema/types';
import {
  clearInkDocument,
  InkCanvas,
  type InkTool,
  undoInkDocument,
} from '@/features/todays-page/InkCanvas';
import { useDailyPage } from '@/features/todays-page/useDailyPage';
import { triggerHaptic } from '@/lib/haptics';
import {
  type AgendaTheme,
  continuousCorner,
  editorFontFamily,
  fonts,
  useAppTheme,
} from '@/theme';

type Mode = 'type' | 'draw';

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
  const inputRef = useRef<TextInput | null>(null);
  const [mode, setMode] = useState<Mode>('type');
  const [tool, setTool] = useState<InkTool>('pen');
  const [textEditing, setTextEditing] = useState(false);

  const { body, ink, changeBody, changeInk, ready } = useDailyPage({
    date,
    repos,
    onError,
    onPersisted,
  });

  const inkColor = theme.text;

  useEffect(() => {
    onDrawingActiveChange?.(false);
  }, [date, mode, onDrawingActiveChange]);

  const switchMode = useCallback(
    (next: Mode) => {
      setMode(next);
      if (next === 'type') {
        setTextEditing(true);
        requestAnimationFrame(() => inputRef.current?.focus());
      } else {
        setTextEditing(false);
        inputRef.current?.blur();
      }
      triggerHaptic('selection');
    },
    [],
  );

  const undo = useCallback(() => {
    if (ink.strokes.length === 0) return;
    changeInk(undoInkDocument(ink));
    triggerHaptic('light');
  }, [changeInk, ink]);

  const clearInk = useCallback(() => {
    if (ink.strokes.length === 0) return;
    changeInk(clearInkDocument(ink));
    triggerHaptic('warning');
  }, [changeInk, ink]);

  const exportPage = useCallback(() => {
    void Share.share({
      message: body.trim() || 'Today’s page is empty.',
    });
  }, [body]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.heading}>Today’s page</Text>
        <View style={styles.actions}>
          <ToolButton
            name="writing"
            active={mode === 'type'}
            onPress={() => switchMode('type')}
            accessibilityLabel="Type on today’s page"
          />
          <ToolButton
            name="pencil"
            active={mode === 'draw' && tool === 'pen'}
            onPress={() => {
              if (mode !== 'draw') switchMode('draw');
              setTool('pen');
              triggerHaptic('selection');
            }}
            accessibilityLabel="Draw with pen"
          />
          <ToolButton
            name="eraser"
            active={mode === 'draw' && tool === 'eraser'}
            onPress={() => {
              if (mode !== 'draw') switchMode('draw');
              setTool('eraser');
              triggerHaptic('selection');
            }}
            accessibilityLabel="Eraser"
          />
          <ToolButton
            name="undo"
            disabled={ink.strokes.length === 0}
            onPress={undo}
            accessibilityLabel="Undo last stroke"
          />
          <ToolButton
            name="trash"
            disabled={ink.strokes.length === 0}
            onPress={clearInk}
            accessibilityLabel="Clear drawing"
          />
          <ToolButton name="fileExport" onPress={exportPage} accessibilityLabel="Export today’s page" />
        </View>
      </View>

      {mode === 'type' ? (
        settings.editor.renderMarkdown && !textEditing ? (
          <AnimatedPressable
            accessibilityLabel="Edit rendered markdown"
            onPress={() => {
              setTextEditing(true);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            pressScale={0.99}
            style={[
              styles.surface,
              {
                padding: settings.editor.pageMargin,
                minHeight: 256,
              },
            ]}
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
            onChangeText={(value) =>
              changeBody(value, {
                continueNumberedLists: settings.editor.continueNumberedLists,
              })
            }
            onBlur={() => setTextEditing(false)}
            multiline
            textAlignVertical="top"
            placeholder="Write something..."
            placeholderTextColor={theme.placeholder}
            style={[
              styles.surface,
              styles.input,
              {
                padding: settings.editor.pageMargin,
                fontFamily: editorFontFamily(settings.editor.font),
                fontSize: settings.editor.fontSize,
                lineHeight: Math.round(settings.editor.fontSize * 1.4),
              },
            ]}
          />
        )
      ) : (
        <View style={[styles.surface, styles.canvasShell]}>
          {ready ? (
            <InkCanvas
              key={date}
              document={ink}
              inkColor={inkColor}
              penOnly={settings.general.penOnlyDrawing}
              tool={tool}
              onChange={changeInk}
              onDrawingActiveChange={onDrawingActiveChange}
            />
          ) : (
            <View style={styles.canvasPlaceholder} />
          )}
          <Text style={styles.hint}>
            {settings.general.penOnlyDrawing
              ? 'Stylus to draw · two fingers to pan · pinch to zoom'
              : 'Draw with finger or stylus · two fingers to pan · pinch to zoom'}
          </Text>
        </View>
      )}
    </View>
  );
}

function ToolButton({
  name,
  active = false,
  disabled = false,
  onPress,
  accessibilityLabel,
}: {
  name: IconName;
  active?: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return (
    <AnimatedPressable
      disabled={disabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active, disabled }}
      hitSlop={4}
      haptic={active ? 'medium' : 'light'}
      pressScale={0.94}
      style={[
        styles.toolButton,
        active ? styles.toolButtonActive : styles.toolButtonIdle,
        disabled && styles.toolButtonDisabled,
      ]}
    >
      <Icon name={name} size={20} color={active ? theme.onPrimary : theme.primary} stroke={1.9} />
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
    heading: {
      fontFamily: fonts.serifItalic,
      fontSize: 20,
      lineHeight: 24,
      color: theme.text,
      flexShrink: 1,
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'flex-end',
      gap: 4,
      maxWidth: '70%',
    },
    toolButton: {
      width: 36,
      height: 36,
      ...continuousCorner(10),
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolButtonActive: {
      backgroundColor: theme.primary,
    },
    toolButtonIdle: {
      backgroundColor: theme.primarySoft,
    },
    toolButtonDisabled: {
      opacity: 0.35,
    },
    surface: {
      ...continuousCorner(16),
      backgroundColor: theme.card,
      overflow: 'hidden',
    },
    input: {
      minHeight: 256,
      fontFamily: fonts.sans,
      fontSize: 16,
      lineHeight: 22,
      color: theme.text,
      outlineStyle: 'none',
    } as const,
    canvasShell: {
      height: 320,
      position: 'relative',
    },
    canvasPlaceholder: {
      flex: 1,
      backgroundColor: theme.card,
    },
    hint: {
      position: 'absolute',
      left: 12,
      right: 12,
      bottom: 10,
      textAlign: 'center',
      fontFamily: fonts.sans,
      fontSize: 11,
      lineHeight: 14,
      color: theme.textTertiary,
    },
    markdownPreview: { gap: 2 },
    markdownLine: { color: theme.text },
    markdownHeading: { fontFamily: fonts.sansSemi, fontSize: 22 },
    markdownPlaceholder: {
      color: theme.placeholder,
      fontFamily: fonts.sans,
      fontSize: 16,
    },
  });
}
