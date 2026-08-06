import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { type AgendaTheme, fonts, rgba, useAppTheme } from '@/theme';

type ToastTone = 'success' | 'error' | 'info';

type ToastOptions = {
  durationMs?: number;
  tone?: ToastTone;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastItem = Required<Pick<ToastOptions, 'durationMs' | 'tone'>> & {
  id: number;
  message: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-16));
  const [scale] = useState(() => new Animated.Value(0.96));
  const nextId = useRef(0);
  const [item, setItem] = useState<ToastItem | null>(null);

  const dismiss = useCallback(
    (id: number) => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -10, duration: 160, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.97, duration: 160, useNativeDriver: true }),
      ]).start(() => setItem((current) => (current?.id === id ? null : current)));
    },
    [opacity, scale, translateY],
  );

  const showToast = useCallback((message: string, options: ToastOptions = {}) => {
    nextId.current += 1;
    setItem({
      id: nextId.current,
      message,
      subtitle: options.subtitle,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
      durationMs: options.durationMs ?? (options.onAction ? 4500 : 3200),
      tone: options.tone ?? 'info',
    });
  }, []);

  useEffect(() => {
    if (!item) return;

    opacity.setValue(0);
    translateY.setValue(-16);
    scale.setValue(0.96);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(translateY, {
        toValue: 0,
        damping: 22,
        stiffness: 280,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        damping: 20,
        stiffness: 320,
        mass: 0.75,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => dismiss(item.id), item.durationMs);
    return () => clearTimeout(timer);
  }, [dismiss, item, opacity, scale, translateY]);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);
  const toneColor = item ? getToneColor(theme, item.tone) : theme.primary;
  const hasAction = Boolean(item?.actionLabel && item.onAction);
  const hasSubtitle = Boolean(item?.subtitle);
  const iconName: IconName =
    item?.tone === 'error' ? 'alert' : item?.tone === 'info' ? 'info' : 'check';

  return (
    <ToastContext.Provider value={contextValue}>
      <View style={styles.root}>
        {children}
        {item ? (
          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.position,
              {
                top: insets.top + 8,
                opacity,
                transform: [{ translateY }, { scale }],
              },
            ]}
          >
            <View
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={[
                styles.toast,
                hasAction ? styles.toastActionLayout : styles.toastSimpleLayout,
              ]}
            >
              {!hasAction ? (
                <View style={[styles.icon, { backgroundColor: rgba(toneColor, 0.12) }]}>
                  <Icon name={iconName} color={toneColor} size={18} stroke={2.2} />
                </View>
              ) : null}

              <Pressable
                accessibilityRole="button"
                onPress={() => dismiss(item.id)}
                style={styles.copy}
              >
                <Text numberOfLines={hasSubtitle ? 1 : 3} style={styles.title}>
                  {item.message}
                </Text>
                {item.subtitle ? (
                  <Text numberOfLines={1} style={styles.subtitle}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </Pressable>

              {hasAction ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={item.actionLabel}
                  hitSlop={6}
                  onPress={() => {
                    const action = item.onAction;
                    dismiss(item.id);
                    action?.();
                  }}
                  style={styles.action}
                >
                  <Text style={styles.actionLabel}>{item.actionLabel}</Text>
                </Pressable>
              ) : null}
            </View>
          </Animated.View>
        ) : null}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
}

function getToneColor(theme: AgendaTheme, tone: ToastTone): string {
  if (tone === 'success') return theme.success;
  if (tone === 'error') return theme.danger;
  return theme.primary;
}

function createStyles(theme: AgendaTheme) {
  const surface = theme.isDark ? '#2C2C2E' : '#FFFFFF';
  const titleColor = theme.isDark ? '#FFFFFF' : '#000000';
  const subtitleColor = theme.isDark ? rgba('#EBEBF5', 0.6) : rgba('#3C3C43', 0.6);

  return StyleSheet.create({
    root: { flex: 1 },
    position: {
      position: 'absolute',
      left: 16,
      right: 16,
      zIndex: 1000,
      alignItems: 'center',
    },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 52,
      maxWidth: 320,
      width: '100%',
      backgroundColor: surface,
      borderRadius: 999,
      shadowColor: '#000000',
      shadowOpacity: 0.15,
      shadowRadius: 32.5,
      shadowOffset: { width: 0, height: 12 },
      elevation: 12,
    },
    toastActionLayout: {
      paddingTop: 8,
      paddingBottom: 8,
      paddingLeft: 16,
      paddingRight: 8,
    },
    toastSimpleLayout: {
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    icon: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
    },
    copy: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
      gap: 4,
    },
    title: {
      color: titleColor,
      fontFamily: fonts.sansMedium,
      fontSize: 14,
      lineHeight: 17,
    },
    subtitle: {
      color: subtitleColor,
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 15,
    },
    action: {
      flexShrink: 0,
      height: 36,
      paddingHorizontal: 16,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primarySoft,
      borderRadius: 999,
    },
    actionLabel: {
      color: theme.primary,
      fontFamily: fonts.sansSemi,
      fontSize: 16,
      lineHeight: 20,
    },
  });
}
