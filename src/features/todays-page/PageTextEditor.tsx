import { type Ref, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, TextInput, type TextStyle, View } from 'react-native';

import { tokenizeMarkdown } from '@/lib/markdown/tokenizeMarkdown';
import { useAppTheme } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { editorFontFamily, fonts } from '@/theme/fonts';

export type PageTextEditorHandle = {
  blur: () => void;
  focus: () => void;
};

type Props = {
  ref?: Ref<PageTextEditorHandle | null>;
  value: string;
  editable: boolean;
  minHeight: number;
  fontSize: number;
  font: string;
  highlight: boolean;
  onChangeText: (value: string) => void;
  onBlur: () => void;
  onFocus: () => void;
};

export function PageTextEditor({
  ref,
  value,
  editable,
  minHeight,
  fontSize,
  font,
  highlight,
  onChangeText,
  onBlur,
  onFocus,
}: Props) {
  const theme = useAppTheme();
  const inputRef = useRef<TextInput>(null);
  const lineHeight = Math.round(fontSize * 1.35);
  const textStyle: TextStyle = {
    fontFamily: editorFontFamily(font) ?? fonts.sans,
    fontSize,
    lineHeight,
    color: theme.text,
  };
  const tokens = useMemo(() => (value ? tokenizeMarkdown(value) : []), [value]);

  useImperativeHandle(ref, () => ({
    blur: () => inputRef.current?.blur(),
    focus: () => inputRef.current?.focus(),
  }));

  return (
    <View style={{ minHeight }}>
      {highlight && value ? (
        <Text pointerEvents="none" style={[textStyle, styles.overlay, { minHeight }]}>
          {tokens.map((token, index) => (
            <Text key={`${index}-${token.kind ?? 'text'}`} style={tokenStyle(token.kind, theme)}>
              {token.text}
            </Text>
          ))}
        </Text>
      ) : null}
      <TextInput
        ref={inputRef}
        autoCapitalize="sentences"
        autoCorrect
        cursorColor={theme.text}
        editable={editable}
        multiline
        onBlur={onBlur}
        onChangeText={onChangeText}
        onFocus={onFocus}
        placeholder="Start writing…"
        placeholderTextColor={theme.placeholder}
        scrollEnabled={false}
        selectionColor={theme.primary}
        style={[
          textStyle,
          styles.input,
          {
            minHeight,
            color: highlight && value ? 'transparent' : theme.text,
            ...(Platform.OS === 'android'
              ? { includeFontPadding: false, paddingVertical: 0, textAlignVertical: 'top' }
              : null),
          },
        ]}
        textAlignVertical="top"
        underlineColorAndroid="transparent"
        value={value}
      />
    </View>
  );
}

function tokenStyle(kind: string | undefined, theme: AgendaTheme): TextStyle {
  switch (kind) {
    case 'marker':
      return { color: theme.textTertiary };
    case 'heading1':
    case 'heading2':
    case 'heading3':
      return { color: theme.text, fontFamily: fonts.sansSemi, fontWeight: '600' };
    case 'bold':
      return { fontFamily: fonts.sansSemi, fontWeight: '700' };
    case 'italic':
      return { fontStyle: 'italic' };
    case 'strike':
      return { textDecorationLine: 'line-through', color: theme.textSecondary };
    case 'code':
      return { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', color: theme.text };
    default:
      return { color: theme.text };
  }
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
  },
  input: {
    padding: 0,
    margin: 0,
    backgroundColor: 'transparent',
  },
});
