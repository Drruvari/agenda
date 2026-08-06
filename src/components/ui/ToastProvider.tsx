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
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { BlurSurface } from '@/components/ui/BlurSurface';
import { Icon, type IconName } from '@/components/ui/Icon';
import { type AgendaTheme, fonts, motion, rgba, useAppTheme } from '@/theme';

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

const MAX_WIDTH = 340;
const SWIPE_DISMISS = 36;

export function ToastProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const nextId = useRef(0);
  const [item, setItem] = useState<ToastItem | null>(null);

  const activeId = useSharedValue(0);
  const locking = useSharedValue(false);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-18);
  const scale = useSharedValue(0.94);
  const dragY = useSharedValue(0);
  const progress = useSharedValue(1);

  const clearItem = useCallback(
    (id: number) => {
      setItem((current) => (current?.id === id ? null : current));
      locking.set(false);
    },
    [locking],
  );

  const dismiss = useCallback(
    (id: number) => {
      if (locking.get() || activeId.get() !== id) return;
      locking.set(true);
      cancelAnimation(progress);
      opacity.set(
        withTiming(
          0,
          { duration: motion.duration.fast, easing: Easing.out(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(clearItem)(id);
          },
        ),
      );
      translateY.set(withTiming(reduceMotion ? 0 : -14, { duration: motion.duration.fast }));
      scale.set(withTiming(reduceMotion ? 1 : 0.96, { duration: motion.duration.fast }));
      dragY.set(withTiming(0, { duration: motion.duration.fast }));
    },
    [activeId, clearItem, dragY, locking, opacity, progress, reduceMotion, scale, translateY],
  );

  const showToast = useCallback(
    (message: string, options: ToastOptions = {}) => {
      nextId.current += 1;
      locking.set(false);
      setItem({
        id: nextId.current,
        message,
        subtitle: options.subtitle,
        actionLabel: options.actionLabel,
        onAction: options.onAction,
        durationMs: options.durationMs ?? (options.onAction ? 4200 : 2800),
        tone: options.tone ?? 'info',
      });
    },
    [locking],
  );

  useEffect(() => {
    if (!item) return;

    activeId.set(item.id);
    dragY.set(0);
    progress.set(1);
    opacity.set(0);
    translateY.set(reduceMotion ? 0 : -18);
    scale.set(reduceMotion ? 1 : 0.94);

    opacity.set(
      withTiming(1, {
        duration: reduceMotion ? motion.duration.instant : motion.duration.normal,
      }),
    );
    translateY.set(withSpring(0, motion.settle));
    scale.set(withSpring(1, motion.snappy));
    progress.set(
      withTiming(0, {
        duration: item.durationMs,
        easing: Easing.linear,
      }),
    );

    const timer = setTimeout(() => dismiss(item.id), item.durationMs);
    return () => {
      clearTimeout(timer);
      cancelAnimation(progress);
    };
  }, [activeId, dismiss, dragY, item, opacity, progress, reduceMotion, scale, translateY]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-8, 8])
        .failOffsetX([-24, 24])
        .onUpdate((event) => {
          dragY.set(Math.min(8, event.translationY));
        })
        .onEnd((event) => {
          if (event.translationY < -SWIPE_DISMISS || event.velocityY < -700) {
            runOnJS(dismiss)(activeId.get());
            return;
          }
          dragY.set(withSpring(0, motion.settle));
        }),
    [activeId, dismiss, dragY],
  );

  const shellStyle = useAnimatedStyle(() => ({
    opacity: opacity.get(),
    transform: [{ translateY: translateY.get() + dragY.get() }, { scale: scale.get() }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, progress.get())) * 100}%`,
  }));

  const contextValue = useMemo(() => ({ showToast }), [showToast]);
  const hasAction = Boolean(item?.actionLabel && item.onAction);
  const toneColor = item ? getToneColor(theme, item.tone) : theme.primary;
  const iconName: IconName =
    item?.tone === 'error' ? 'alert' : item?.tone === 'success' ? 'check' : 'info';
  const content = item ? (
    <>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: rgba(toneColor, 0.14) }]}>
          <Icon name={iconName} color={toneColor} size={16} stroke={2.4} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          onPress={() => dismiss(item.id)}
          style={styles.copy}
        >
          <Text numberOfLines={hasAction || item.subtitle ? 1 : 2} style={styles.title}>
            {item.message}
          </Text>
          {item.subtitle ? (
            <Text numberOfLines={1} style={styles.subtitle}>
              {item.subtitle}
            </Text>
          ) : null}
        </Pressable>

        {hasAction ? (
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={item.actionLabel}
            haptic="selection"
            hitSlop={6}
            onPress={() => {
              const action = item.onAction;
              dismiss(item.id);
              action?.();
            }}
            pressScale={0.96}
            style={styles.action}
          >
            <Text style={styles.actionLabel}>{item.actionLabel}</Text>
          </AnimatedPressable>
        ) : null}
      </View>

      <View style={styles.progressTrack}>
        <Animated.View
          style={[styles.progressFill, { backgroundColor: toneColor }, progressStyle]}
        />
      </View>
    </>
  ) : null;

  const contentStyle = [styles.content, hasAction ? styles.contentAction : styles.contentSimple];

  return (
    <ToastContext.Provider value={contextValue}>
      <View style={styles.root}>
        {children}
        {item ? (
          <View pointerEvents="box-none" style={[styles.position, { top: insets.top + 10 }]}>
            <GestureDetector gesture={pan}>
              <Animated.View style={[styles.shell, shellStyle]}>
                {Platform.OS === 'ios' ? (
                  <BlurSurface
                    borderRadius={999}
                    elevated
                    intensity={64}
                    overlayColor={theme.isDark ? rgba('#1C1C1E', 0.55) : rgba('#FFFFFF', 0.72)}
                    tint={theme.isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
                    style={styles.toast}
                    contentStyle={contentStyle}
                  >
                    {content}
                  </BlurSurface>
                ) : (
                  <View style={[styles.toast, styles.toastSolid, contentStyle]}>{content}</View>
                )}
              </Animated.View>
            </GestureDetector>
          </View>
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
    shell: {
      alignSelf: 'center',
      maxWidth: MAX_WIDTH,
    },
    toast: {
      shadowColor: '#000000',
      shadowOpacity: theme.isDark ? 0.45 : 0.18,
      shadowRadius: 28,
      shadowOffset: { width: 0, height: 14 },
      elevation: 16,
    },
    toastSolid: {
      backgroundColor: theme.isDark ? '#2C2C2E' : '#FFFFFF',
      borderRadius: 999,
      overflow: 'hidden',
    },
    content: {
      overflow: 'hidden',
      minWidth: 220,
    },
    contentAction: {
      paddingTop: 8,
      paddingBottom: 10,
      paddingLeft: 10,
      paddingRight: 8,
    },
    contentSimple: {
      paddingTop: 10,
      paddingBottom: 12,
      paddingHorizontal: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 36,
    },
    icon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    copy: {
      flexGrow: 1,
      flexShrink: 1,
      maxWidth: 200,
      minWidth: 96,
      justifyContent: 'center',
      gap: 2,
    },
    title: {
      color: titleColor,
      fontFamily: fonts.sansMedium,
      fontSize: 14,
      lineHeight: 18,
      letterSpacing: -0.1,
    },
    subtitle: {
      color: subtitleColor,
      fontFamily: fonts.sans,
      fontSize: 12,
      lineHeight: 15,
    },
    action: {
      flexShrink: 0,
      height: 34,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.primarySoft,
      borderRadius: 999,
    },
    actionLabel: {
      color: theme.primary,
      fontFamily: fonts.sansSemi,
      fontSize: 14,
      lineHeight: 18,
      letterSpacing: -0.1,
    },
    progressTrack: {
      position: 'absolute',
      left: 14,
      right: 14,
      bottom: 0,
      height: 2,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: theme.isDark ? rgba('#FFFFFF', 0.08) : rgba('#000000', 0.06),
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      opacity: 0.55,
    },
  });
}
