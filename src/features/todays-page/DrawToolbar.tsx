import type { ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { BlurSurface } from '@/components/ui/BlurSurface';
import { Icon } from '@/components/ui/Icon';
import {
  HIGHLIGHT_BRUSHES,
  type InkBrush,
  type InkTool,
  PEN_BRUSHES,
} from '@/features/todays-page/inkTools';
import { type AgendaTheme, useAppTheme } from '@/theme';

type Props = {
  tool: InkTool;
  brush: InkBrush;
  canUndo: boolean;
  onToolChange: (tool: InkTool) => void;
  onBrushChange: (brush: InkBrush) => void;
  onUndo: () => void;
};

export function DrawToolbar({ tool, brush, canUndo, onToolChange, onBrushChange, onUndo }: Props) {
  const theme = useAppTheme();
  const styles = createStyles(theme);
  const brushes = tool === 'highlighter' ? HIGHLIGHT_BRUSHES : PEN_BRUSHES;

  const content = (
    <>
      <View style={styles.group}>
        <ToolChip
          active={tool === 'pen'}
          onPress={() => {
            onToolChange('pen');
            if (brush.kind !== 'pen') onBrushChange(PEN_BRUSHES[0]!);
          }}
          accessibilityLabel="Pen"
        >
          <Icon name="pencil" size={17} color={tool === 'pen' ? theme.onPrimary : theme.text} />
        </ToolChip>

        <ToolChip
          active={tool === 'highlighter'}
          onPress={() => {
            onToolChange('highlighter');
            if (brush.kind !== 'highlighter') onBrushChange(HIGHLIGHT_BRUSHES[0]!);
          }}
          accessibilityLabel="Highlighter"
        >
          <Icon
            name="highlight"
            size={17}
            color={tool === 'highlighter' ? theme.onPrimary : theme.text}
          />
        </ToolChip>
      </View>

      <View style={styles.divider} />

      <View style={styles.group}>
        {brushes.map((item) => {
          const selected = tool !== 'eraser' && brush.id === item.id;
          const isDarkInk =
            item.color.toLowerCase() === '#111111' || item.color.toLowerCase() === '#000000';
          return (
            <AnimatedPressable
              key={item.id}
              accessibilityLabel={item.label}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              haptic="selection"
              pressScale={0.9}
              onPress={() => {
                onToolChange(item.kind);
                onBrushChange(item);
              }}
              style={[styles.swatchHit, selected && styles.swatchHitSelected]}
            >
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: item.color,
                    opacity: item.kind === 'highlighter' ? 0.85 : 1,
                    borderWidth: isDarkInk && theme.isDark ? StyleSheet.hairlineWidth : 0,
                    borderColor: 'rgba(255,255,255,0.35)',
                  },
                ]}
              />
            </AnimatedPressable>
          );
        })}
      </View>

      <View style={styles.divider} />

      <View style={styles.group}>
        <ToolChip
          active={tool === 'eraser'}
          onPress={() => onToolChange('eraser')}
          accessibilityLabel="Eraser"
        >
          <Icon name="eraser" size={17} color={tool === 'eraser' ? theme.onPrimary : theme.text} />
        </ToolChip>

        <ToolChip
          active={false}
          disabled={!canUndo}
          onPress={onUndo}
          accessibilityLabel="Undo last stroke"
        >
          <Icon name="undo" size={17} color={canUndo ? theme.text : theme.textTertiary} />
        </ToolChip>
      </View>
    </>
  );

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {Platform.OS === 'ios' ? (
        <BlurSurface
          elevated={false}
          intensity={48}
          tint={theme.isDark ? 'dark' : 'light'}
          borderRadius={22}
          overlayColor={theme.isDark ? 'rgba(40,40,42,0.42)' : 'rgba(255,255,255,0.45)'}
          contentStyle={styles.bar}
          style={styles.shell}
        >
          {content}
        </BlurSurface>
      ) : (
        <View style={[styles.shell, styles.androidShell, styles.bar]}>{content}</View>
      )}
    </View>
  );
}

function ToolChip({
  active,
  disabled = false,
  onPress,
  accessibilityLabel,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  const theme = useAppTheme();
  const styles = createStyles(theme);

  return (
    <AnimatedPressable
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active, disabled }}
      haptic="selection"
      pressScale={0.92}
      onPress={onPress}
      style={[
        styles.chip,
        active ? styles.chipActive : styles.chipIdle,
        disabled && styles.chipDisabled,
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      maxWidth: '100%',
    },
    shell: {
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
      overflow: 'hidden',
    },
    androidShell: {
      backgroundColor: theme.isDark ? 'rgba(44,44,46,0.94)' : 'rgba(255,255,255,0.94)',
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 7,
      gap: 6,
    },
    group: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    chip: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: theme.primary,
    },
    chipIdle: {
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    },
    chipDisabled: {
      opacity: 0.35,
    },
    divider: {
      width: StyleSheet.hairlineWidth,
      height: 20,
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.1)',
      marginHorizontal: 2,
    },
    swatchHit: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchHitSelected: {
      borderWidth: 2,
      borderColor: theme.primary,
    },
    swatch: {
      width: 15,
      height: 15,
      borderRadius: 8,
    },
  });
}
