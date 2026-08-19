import { BlurTargetView } from 'expo-blur';
import { router } from 'expo-router';
import { type PropsWithChildren, type ReactNode, type RefObject, useMemo } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type View as NativeView,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { BlurSurface } from '@/components/ui/BlurSurface';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SettingsSection } from '@/components/ui/settings/SettingsSection';
import { useAppAppearance, useAppTheme } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { continuousCorner, layout, spacing } from '@/theme/tokens';
import { type } from '@/theme/type';

export { SettingsSection };

type SettingsHeaderProps = {
  title: string;
  /** Defaults to router.back() */
  onBack?: () => void;
  /** Trailing control (e.g. Done). Pass null to hide. */
  trailing?: ReactNode | null;
  showDone?: boolean;
};

export function SettingsHeader({ title, onBack, trailing, showDone = false }: SettingsHeaderProps) {
  const { accent } = useAppAppearance();
  const theme = useAppTheme();
  const styles = useMemo(() => createChromeStyles(theme), [theme]);

  const right =
    trailing !== undefined ? (
      trailing
    ) : showDone ? (
      <Pressable
        accessibilityLabel="Done"
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.doneButton,
          { backgroundColor: `${accent}1A` },
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.doneLabel, { color: accent }]}>Done</Text>
      </Pressable>
    ) : (
      <View style={styles.headerSpacer} />
    );

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel="Back"
        onPress={onBack ?? (() => router.back())}
        style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]}
      >
        <Icon name="back" size={24} color={theme.text} />
      </Pressable>
      <Text numberOfLines={1} style={styles.headerTitle}>
        {title}
      </Text>
      {right}
    </View>
  );
}

type SettingsScaffoldProps = PropsWithChildren<{
  title: string;
  description?: string;
  showDone?: boolean;
  trailing?: ReactNode | null;
  onBack?: () => void;
  /** Extra bottom padding for floating chrome (tab bar). */
  bottomInset?: number;
  scroll?: boolean;
  blurTargetRef?: RefObject<NativeView | null>;
  header?: ReactNode;
  footer?: ReactNode;
}>;

/** Shared settings page shell — matches hub header, background, and section spacing. */
export function SettingsScaffold({
  title,
  description,
  showDone = false,
  trailing,
  onBack,
  bottomInset,
  scroll = true,
  blurTargetRef,
  header,
  footer,
  children,
}: SettingsScaffoldProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useMemo(() => createChromeStyles(theme), [theme]);
  const padBottom = bottomInset ?? insets.bottom + spacing.xl;
  const resolvedHeader =
    header !== undefined ? (
      header
    ) : Platform.OS === 'ios' ? null : (
      <SettingsHeader title={title} onBack={onBack} showDone={showDone} trailing={trailing} />
    );

  const body = (
    <>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {children}
    </>
  );

  const content = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.scrollContent, { paddingBottom: padBottom }]}
    >
      {body}
    </ScrollView>
  ) : (
    <View style={[styles.scrollContent, styles.fill, { paddingBottom: padBottom }]}>{body}</View>
  );

  const usesStackHeader = header === null;
  const edges =
    Platform.OS === 'android' && usesStackHeader
      ? (['bottom', 'left', 'right'] as const)
      : Platform.OS === 'ios' || usesStackHeader
        ? (['left', 'right'] as const)
        : (['top', 'left', 'right'] as const);

  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      <BlurTargetView ref={blurTargetRef} style={styles.blurTarget}>
        {resolvedHeader}
        {content}
      </BlurTargetView>
      {footer}
    </SafeAreaView>
  );
}

export type SettingsTabItem<T extends string> = {
  value: T;
  label: string;
  icon: IconName;
};

type SettingsTabBarProps<T extends string> = {
  tabs: SettingsTabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  blurTarget?: RefObject<NativeView | null>;
};

/** Floating settings tab dock — same glass language as the planner BottomBar. */
export function SettingsTabBar<T extends string>({
  tabs,
  value,
  onChange,
  blurTarget,
}: SettingsTabBarProps<T>) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useMemo(() => createChromeStyles(theme), [theme]);
  const offset = Math.max(insets.bottom + spacing.sm, spacing.md);

  return (
    <View pointerEvents="box-none" style={[styles.tabBarWrap, { bottom: offset }]}>
      <BlurSurface
        blurTarget={blurTarget}
        intensity={85}
        overlayColor={theme.floating}
        tint="systemChromeMaterialDark"
        style={styles.tabBarSurface}
        contentStyle={styles.tabBar}
      >
        {tabs.map((item) => {
          const selected = value === item.value;
          return (
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              key={item.value}
              onPress={() => onChange(item.value)}
              style={({ pressed }) => [
                styles.tab,
                selected && styles.tabActive,
                pressed && styles.tabPressed,
              ]}
            >
              <Icon
                name={item.icon}
                size={20}
                color={selected ? theme.floatingText : theme.floatingTextMuted}
                stroke={selected ? 2 : 1.8}
              />
              <Text
                numberOfLines={1}
                style={[styles.tabLabel, selected ? styles.tabLabelActive : null]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </BlurSurface>
    </View>
  );
}

export function createChromeStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.background },
    blurTarget: { flex: 1 },
    fill: { flex: 1 },
    header: {
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: layout.screenPadding,
    },
    roundButton: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.section,
      borderRadius: 22,
    },
    headerTitle: {
      flex: 1,
      color: theme.text,
      ...type.title,
    },
    headerSpacer: { width: 44, height: 44 },
    doneButton: {
      height: 44,
      justifyContent: 'center',
      paddingHorizontal: 18,
      ...continuousCorner(22),
    },
    doneLabel: { ...type.rowLabel },
    description: {
      marginBottom: 18,
      color: theme.textSecondary,
      fontFamily: type.subtitle.fontFamily,
      fontSize: 15,
      lineHeight: 22,
    },
    scrollContent: {
      paddingHorizontal: layout.screenPadding,
      paddingTop: spacing.sm,
      gap: layout.sectionGap,
    },
    tabBarWrap: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      alignItems: 'center',
    },
    tabBarSurface: {
      width: '100%',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: 'rgba(255, 255, 255, 0.16)',
    },
    tabBar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      padding: 4,
      gap: 2,
    },
    tab: {
      flex: 1,
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingHorizontal: 2,
      borderRadius: 999,
    },
    tabActive: {
      backgroundColor: 'rgba(255, 255, 255, 0.14)',
    },
    tabPressed: {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    tabLabel: {
      color: theme.floatingTextMuted,
      fontFamily: type.caption.fontFamily,
      fontWeight: '500',
      fontSize: 10,
      letterSpacing: -0.1,
    },
    tabLabelActive: {
      color: theme.floatingText,
    },
    pressed: { opacity: 0.72 },
  });
}
