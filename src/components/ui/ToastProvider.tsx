import { BlurView } from 'expo-blur';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutDown,
  FadeOutUp,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { Icon, type IconName } from '@/components/ui/Icon';
import { triggerHaptic } from '@/lib/haptics';
import { continuousCorner, fonts, useAppTheme } from '@/theme';

export type ToastTone = 'success' | 'error' | 'info';
export type ToastVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger';
export type ToastPlacement = 'top' | 'bottom';

export type ToastOptions = {
  durationMs?: number;
  tone?: ToastTone;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export type ToastHelpers = {
  hide: (id?: string | 'all') => void;
  show: (options: string | HeroToastOptions) => string;
};

export type HeroToastOptions = {
  id?: string;
  variant?: ToastVariant;
  placement?: ToastPlacement;
  label: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  onActionPress?: (helpers: ToastHelpers) => void;
  duration?: number | 'persistent';
  onShow?: () => void;
  onHide?: () => void;
};

type ToastRecord = HeroToastOptions & {
  id: string;
  variant: ToastVariant;
  placement: ToastPlacement;
  duration: number | 'persistent';
};

type Listener = (toasts: ToastRecord[]) => void;

let items: ToastRecord[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(items));
}

function subscribeToast(listener: Listener) {
  listeners.add(listener);
  listener(items);
  return () => {
    listeners.delete(listener);
  };
}

export function hideToast(id?: string | 'all') {
  if (id === 'all') {
    const removed = items;
    items = [];
    removed.forEach((item) => item.onHide?.());
    emit();
    return;
  }

  const target = id ?? items.at(-1)?.id;
  if (!target) return;
  const removed = items.find((item) => item.id === target);
  items = items.filter((item) => item.id !== target);
  removed?.onHide?.();
  emit();
}

export function dismissToast(id: string) {
  hideToast(id);
}

export function dismissAllToasts() {
  hideToast('all');
}

export function showHeroToast(options: string | HeroToastOptions): string {
  const input = typeof options === 'string' ? { label: options } : options;
  const id = input.id ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const record: ToastRecord = {
    ...input,
    id,
    variant: input.variant ?? 'default',
    placement: input.placement ?? 'top',
    duration: input.duration ?? 4000,
  };

  const replaced = items.find((item) => item.id === id);
  const next = [...items.filter((item) => item.id !== id), record];
  const evicted = next.slice(0, Math.max(0, next.length - 3));
  items = next.slice(-3);
  replaced?.onHide?.();
  evicted.forEach((item) => item.onHide?.());
  emit();
  input.onShow?.();
  return id;
}

export const toastManager = { show: showHeroToast, hide: hideToast };

export function showToast(message: string, options: ToastOptions = {}): string {
  const variants: Record<ToastTone, ToastVariant> = {
    success: 'success',
    error: 'danger',
    info: 'default',
  };
  return showHeroToast({
    label: message,
    description: options.subtitle,
    variant: variants[options.tone ?? 'info'],
    actionLabel: options.actionLabel,
    onActionPress: options.onAction
      ? ({ hide }) => {
          options.onAction?.();
          hide();
        }
      : undefined,
    duration: options.durationMs ?? (options.onAction ? 5000 : 3000),
  });
}

export function useToast() {
  return useMemo(() => ({ toast: toastManager, showToast }), []);
}

export function AgendaToaster() {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  useEffect(() => subscribeToast(setToasts), []);
  const content = <ToastViewport toasts={toasts} />;
  return Platform.OS === 'ios' ? <FullWindowOverlay>{content}</FullWindowOverlay> : content;
}

function ToastViewport({ toasts }: { toasts: ToastRecord[] }) {
  const insets = useSafeAreaInsets();
  const top = toasts.filter((item) => item.placement === 'top').toReversed();
  const bottom = toasts.filter((item) => item.placement === 'bottom').toReversed();

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, styles.viewport, { paddingTop: insets.top + 8 }]}
      >
        <ToastStack items={top} placement="top" />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        pointerEvents="box-none"
        style={[
          StyleSheet.absoluteFill,
          styles.bottomViewport,
          { paddingBottom: insets.bottom + 8 },
        ]}
      >
        <ToastStack items={bottom} placement="bottom" />
      </KeyboardAvoidingView>
    </>
  );
}

function ToastStack({
  items: stackItems,
  placement,
}: {
  items: ToastRecord[];
  placement: ToastPlacement;
}) {
  return (
    <View pointerEvents="box-none" style={styles.stack}>
      {stackItems.map((item, index) => (
        <AgendaToast key={item.id} item={item} index={index} placement={placement} />
      ))}
    </View>
  );
}

function AgendaToast({
  item,
  index,
  placement,
}: {
  item: ToastRecord;
  index: number;
  placement: ToastPlacement;
}) {
  const theme = useAppTheme();
  const dragY = useSharedValue(0);

  useEffect(() => {
    if (item.duration === 'persistent') return;
    const timeout = setTimeout(() => hideToast(item.id), item.duration);
    return () => clearTimeout(timeout);
  }, [item.duration, item.id]);

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .onUpdate((event) => {
      const towardEdge = placement === 'top' ? event.translationY : -event.translationY;
      dragY.value = towardEdge < 0 ? event.translationY : event.translationY * 0.15;
    })
    .onEnd((event) => {
      const distance = placement === 'top' ? event.translationY : -event.translationY;
      const velocity = placement === 'top' ? event.velocityY : -event.velocityY;
      if (distance < -40 || velocity < -650) {
        runOnJS(hideToast)(item.id);
        return;
      }
      dragY.value = withSpring(0, { damping: 18, stiffness: 220 });
    });

  const stackStyle = useAnimatedStyle(() => ({
    opacity: withTiming(index === 0 ? 1 : Math.max(0.64, 0.88 - index * 0.12)),
    transform: [
      { translateY: dragY.value + (placement === 'top' ? index * 8 : -index * 8) },
      { scale: withTiming(1 - index * 0.025) },
    ],
  }));
  const tone = toastTone(item.variant, theme);
  const entering = placement === 'top' ? FadeInUp : FadeInDown;
  const exiting = placement === 'top' ? FadeOutUp : FadeOutDown;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        entering={entering.springify().damping(20).stiffness(240).reduceMotion(ReduceMotion.System)}
        exiting={exiting.duration(220).reduceMotion(ReduceMotion.System)}
        pointerEvents={index === 0 ? 'auto' : 'none'}
        style={[styles.toastWrapper, { zIndex: 100 - index }]}
      >
        <Animated.View style={stackStyle}>
          <View style={[styles.shadow, Platform.OS === 'android' && { elevation: 8 }]}>
            {Platform.OS === 'ios' ? (
              <BlurView
                intensity={80}
                tint={theme.isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'}
                style={[styles.toast, { borderColor: theme.separator }]}
              >
                {index === 0 ? <ToastContent item={item} tone={tone} /> : null}
              </BlurView>
            ) : (
              <View
                style={[
                  styles.toast,
                  { backgroundColor: theme.card, borderColor: theme.separator },
                ]}
              >
                {index === 0 ? <ToastContent item={item} tone={tone} /> : null}
              </View>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function ToastContent({ item, tone }: { item: ToastRecord; tone: ReturnType<typeof toastTone> }) {
  const theme = useAppTheme();
  const handleAction = () => {
    triggerHaptic('selection');
    item.onActionPress?.({ hide: (id) => hideToast(id ?? item.id), show: showHeroToast });
  };

  return (
    <View style={styles.content}>
      <View style={[styles.icon, { backgroundColor: tone.background }]}>
        {item.icon ?? <Icon name={tone.icon} size={18} stroke={2.2} color={tone.foreground} />}
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={2} style={[styles.title, { color: theme.text }]}>
          {item.label}
        </Text>
        {item.description ? (
          <Text numberOfLines={2} style={[styles.subtitle, { color: theme.textSecondary }]}>
            {item.description}
          </Text>
        ) : null}
      </View>
      {item.actionLabel && item.onActionPress ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={handleAction}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: theme.primarySoft, opacity: pressed ? 0.65 : 1 },
          ]}
        >
          <Text style={[styles.actionText, { color: theme.primary }]}>{item.actionLabel}</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss notification"
          hitSlop={10}
          onPress={() => hideToast(item.id)}
          style={({ pressed }) => [styles.close, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Icon name="close" size={17} color={theme.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

function toastTone(variant: ToastVariant, theme: ReturnType<typeof useAppTheme>) {
  const tones: Record<ToastVariant, { icon: IconName; foreground: string; background: string }> = {
    default: { icon: 'info', foreground: theme.text, background: theme.section },
    accent: { icon: 'info', foreground: theme.primary, background: theme.primarySoft },
    success: { icon: 'check', foreground: theme.primary, background: theme.primarySoft },
    warning: { icon: 'warning', foreground: theme.danger, background: `${theme.danger}18` },
    danger: { icon: 'warning', foreground: theme.danger, background: `${theme.danger}18` },
  };
  return tones[variant];
}

const styles = StyleSheet.create({
  viewport: { alignItems: 'center', paddingHorizontal: 12 },
  bottomViewport: { alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: 12 },
  stack: { width: '100%', maxWidth: 430, minHeight: 78 },
  toastWrapper: { position: 'absolute', width: '100%' },
  shadow: {
    borderRadius: 18,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 7 },
      },
      android: { shadowColor: '#000000' },
    }),
  },
  toast: {
    minHeight: 58,
    overflow: 'hidden',
    ...continuousCorner(18),
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 10,
    paddingVertical: 10,
    gap: 10,
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontFamily: fonts.sansMedium, fontSize: 14, lineHeight: 18, letterSpacing: -0.1 },
  subtitle: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 16 },
  action: {
    minHeight: 34,
    minWidth: 52,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  actionText: { fontFamily: fonts.sansSemi, fontSize: 13 },
  close: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
