import { StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Icon, type IconName } from '@/components/ui/Icon';
import { formatLongDate } from '@/data/schema/ids';
import { fonts, useAppTheme } from '@/theme';

type Props = {
  date: string;
  drawing: boolean;
  onCalendar: () => void;
  onDraw: () => void;
  onFinishDrawing: () => void;
  onMore: () => void;
};

export function PageHeader({ date, drawing, onCalendar, onDraw, onFinishDrawing, onMore }: Props) {
  const theme = useAppTheme();
  return (
    <View style={styles.header}>
      <AnimatedPressable
        accessibilityLabel="Choose date"
        accessibilityRole="button"
        onPress={onCalendar}
        pressScale={0.96}
        style={[styles.dateButton, { backgroundColor: theme.control.fillQuaternary }]}
      >
        <Icon color={theme.primary} name="calendar" size={18} stroke={2.1} />
        <Text style={[styles.date, { color: theme.text }]}>{formatLongDate(date)}</Text>
      </AnimatedPressable>
      <View style={styles.actions}>
        <IconButton
          icon={drawing ? 'check' : 'pencil'}
          label={drawing ? 'Finish drawing' : 'Draw on page'}
          onPress={drawing ? onFinishDrawing : onDraw}
        />
        <IconButton icon="more" label="Page options" onPress={onMore} />
      </View>
    </View>
  );
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <AnimatedPressable
      accessibilityLabel={label}
      accessibilityRole="button"
      haptic="selection"
      onPress={onPress}
      pressScale={0.9}
      style={[styles.iconButton, { backgroundColor: theme.control.fillQuaternary }]}
    >
      <Icon color={theme.text} name={icon} size={20} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 22,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  dateButton: {
    minHeight: 42,
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 21,
  },
  date: { fontFamily: fonts.sans, fontSize: 24, lineHeight: 30, letterSpacing: -0.35 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
