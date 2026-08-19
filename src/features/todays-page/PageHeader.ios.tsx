import { Button, Host, Image } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  buttonBorderShape,
  buttonStyle,
  controlSize,
  frame,
  labelStyle,
} from '@expo/ui/swift-ui/modifiers';
import { StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { formatLongDate } from '@/data/schema/ids';
import { useAppAppearance, useAppTheme } from '@/theme/AppThemeProvider';
import { fonts } from '@/theme/fonts';

type Props = {
  date: string;
  drawing: boolean;
  onCalendar: () => void;
  onDraw: () => void;
  onFinishDrawing: () => void;
  onMore: () => void;
};

export function PageHeader({ date, drawing, onCalendar, onDraw, onFinishDrawing, onMore }: Props) {
  const { accent, colorScheme } = useAppAppearance();
  const theme = useAppTheme();
  const iconModifiers = [
    labelStyle('iconOnly'),
    frame({ width: 44, height: 44 }),
    buttonStyle('glass'),
    buttonBorderShape('circle'),
    controlSize('large'),
  ];

  return (
    <View style={styles.header}>
      <View style={styles.leading}>
        <Host
          colorScheme={colorScheme}
          ignoreSafeArea="all"
          matchContents
          seedColor={accent}
          style={styles.iconHost}
        >
          <Button
            label="Choose date"
            modifiers={[accessibilityLabel('Choose date'), ...iconModifiers]}
            onPress={onCalendar}
            systemImage="calendar"
          />
        </Host>
        <AnimatedPressable
          accessibilityLabel="Choose date"
          accessibilityRole="button"
          onPress={onCalendar}
          pressScale={0.98}
          style={styles.dateButton}
        >
          <Text numberOfLines={1} style={[styles.date, { color: theme.text }]}>
            {formatLongDate(date)}
          </Text>
        </AnimatedPressable>
      </View>

      <View style={styles.actions}>
        <Host
          colorScheme={colorScheme}
          ignoreSafeArea="all"
          matchContents
          seedColor={accent}
          style={styles.iconHost}
        >
          <Button
            label={drawing ? 'Finish drawing' : 'Draw on page'}
            modifiers={[
              accessibilityLabel(drawing ? 'Finish drawing' : 'Draw on page'),
              ...iconModifiers,
            ]}
            onPress={drawing ? onFinishDrawing : onDraw}
            systemImage={drawing ? 'checkmark' : 'pencil'}
          />
        </Host>
        <Host
          colorScheme={colorScheme}
          ignoreSafeArea="all"
          matchContents
          seedColor={accent}
          style={styles.iconHost}
        >
          <Button
            modifiers={[
              accessibilityLabel('Page options'),
              buttonStyle('glass'),
              buttonBorderShape('circle'),
              controlSize('large'),
            ]}
            onPress={onMore}
          >
            <Image systemName="ellipsis" modifiers={[frame({ width: 18, height: 18 })]} />
          </Button>
        </Host>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 22,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  leading: { minWidth: 0, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateButton: { minWidth: 0, flexShrink: 1, minHeight: 44, justifyContent: 'center' },
  date: { fontFamily: fonts.sans, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconHost: { width: 44, height: 44 },
});
