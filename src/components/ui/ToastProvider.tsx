import { BlurView } from 'expo-blur';
import { type PropsWithChildren, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { toast, Toaster } from 'sonner-native';

import { fonts, rgba, useAppAppearance, useAppTheme } from '@/theme';

type ToastTone = 'success' | 'error' | 'info';

type ToastOptions = {
  durationMs?: number;
  tone?: ToastTone;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastContextValue = {
  showToast: (message: string, options?: ToastOptions) => void;
};

export function showToast(message: string, options: ToastOptions = {}): void {
  const duration = options.durationMs ?? (options.onAction ? 4200 : 2800);
  const description = options.subtitle;
  const id = Date.now();
  const action =
    options.actionLabel && options.onAction
      ? {
          label: options.actionLabel,
          onClick: () => {
            options.onAction?.();
            toast.dismiss(id);
          },
        }
      : undefined;

  const common = { id, description, duration, action };

  if (options.tone === 'success') {
    toast.success(message, common);
    return;
  }
  if (options.tone === 'error') {
    toast.error(message, common);
    return;
  }
  toast(message, common);
}

/** Kept for existing call sites — sonner works outside React. */
export function useToast(): ToastContextValue {
  return useMemo(() => ({ showToast }), []);
}

/**
 * Sonner host. Mount once near the root (inside GestureHandlerRootView).
 * @see https://sonner-native.netlify.app/
 */
export function AgendaToaster() {
  const { colorScheme } = useAppAppearance();
  const theme = useAppTheme();
  const isAndroid = Platform.OS === 'android';
  const blurTint = theme.isDark ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight';
  const overlay = theme.isDark ? rgba('#1C1C1E', 0.45) : rgba('#FFFFFF', 0.55);
  // Android BlurView has no reliable backdrop without a blurTarget — use a solid surface.
  const toastBackground = isAndroid ? theme.card : 'transparent';

  return (
    <Toaster
      theme={colorScheme}
      position="top-center"
      richColors
      closeButton
      swipeToDismissDirection="up"
      duration={2800}
      toastOptions={{
        style: {
          borderRadius: 18,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: theme.separator,
          overflow: 'hidden',
          backgroundColor: toastBackground,
          ...(isAndroid
            ? {
                elevation: 8,
                shadowColor: '#000000',
                shadowOpacity: 0.25,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
              }
            : {}),
        },
        titleStyle: {
          fontFamily: fonts.sansMedium,
          fontSize: 14,
          letterSpacing: -0.1,
        },
        descriptionStyle: {
          fontFamily: fonts.sans,
          fontSize: 12,
          lineHeight: 16,
        },
        actionButtonStyle: {
          backgroundColor: theme.primarySoft,
          borderRadius: 999,
          paddingHorizontal: 12,
          height: 32,
          justifyContent: 'center',
        },
        actionButtonTextStyle: {
          fontFamily: fonts.sansSemi,
          fontSize: 13,
          color: theme.primary,
        },
        backgroundComponent: isAndroid ? undefined : (
          <>
            <BlurView intensity={72} tint={blurTint} style={StyleSheet.absoluteFill} />
            <View
              pointerEvents="none"
              style={[StyleSheet.absoluteFill, { backgroundColor: overlay }]}
            />
          </>
        ),
      }}
    />
  );
}

/** @deprecated No longer required — kept so older imports still typecheck if referenced. */
export function ToastProvider({ children }: PropsWithChildren) {
  return children;
}
