import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { AgendaLogo } from '@/components/ui/AgendaLogo';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { fonts } from '@/theme/fonts';
import { continuousCorner, radius } from '@/theme/tokens';
import { type } from '@/theme/type';

import type { TodayAndroidHeaderProps } from './TodayAndroidHeader.types';

type MenuAction = {
  icon: IconName;
  label: string;
  onPress: () => void;
};

export function TodayAndroidHeader({
  calendarIndicator,
  isToday,
  onAdd,
  onCalendar,
  onInbox,
  onSearch,
  onSettings,
  onShowAll,
  onToday,
}: TodayAndroidHeaderProps) {
  const theme = useAppTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const fill = theme.control.fillQuaternary;

  const actions: MenuAction[] = [
    { icon: 'search', label: 'Search', onPress: onSearch },
    { icon: 'checklist', label: 'All items', onPress: onShowAll },
    { icon: 'inbox', label: 'Inbox', onPress: onInbox },
    { icon: 'settings', label: 'Settings', onPress: onSettings },
  ];

  return (
    <View style={styles.bar}>
      <View pointerEvents="none" style={styles.logoCenter}>
        <View accessibilityLabel="Agenda" accessible>
          <AgendaLogo color={theme.text} size={27} />
        </View>
      </View>

      <View style={styles.side}>
        {!isToday ? (
          <AnimatedPressable
            accessibilityLabel="Jump to today"
            accessibilityRole="button"
            onPress={onToday}
            pressScale={0.96}
            style={[styles.todayPill, { backgroundColor: fill }]}
          >
            <Text style={[styles.todayLabel, { color: theme.text }]}>Today</Text>
          </AnimatedPressable>
        ) : null}
      </View>

      <View style={[styles.cluster, { backgroundColor: fill }]}>
        <HeaderIcon
          indicator={calendarIndicator}
          label="Open calendar"
          name="calendar"
          onPress={onCalendar}
        />
        <HeaderIcon label="Add a task" name="add" onPress={onAdd} />
        <HeaderIcon label="More" name="more" onPress={() => setMenuOpen(true)} />
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
        transparent
        visible={menuOpen}
      >
        <View style={styles.backdrop}>
          <Pressable onPress={() => setMenuOpen(false)} style={StyleSheet.absoluteFill} />
          <View style={[styles.menu, { backgroundColor: theme.section }]}>
            {actions.map((action, index) => (
              <Pressable
                key={action.label}
                android_ripple={{ color: theme.control.pressed }}
                onPress={() => {
                  setMenuOpen(false);
                  action.onPress();
                }}
                style={[
                  styles.menuRow,
                  index < actions.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: theme.separator,
                  },
                ]}
              >
                <Icon color={theme.text} name={action.icon} size={20} />
                <Text style={[styles.menuLabel, { color: theme.text }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>
    </View>
  );
}

function HeaderIcon({
  indicator,
  label,
  name,
  onPress,
}: {
  indicator?: boolean;
  label: string;
  name: IconName;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  return (
    <AnimatedPressable
      accessibilityLabel={label}
      accessibilityRole="button"
      android_ripple={{ borderless: true, color: theme.control.pressed, radius: 18 }}
      onPress={onPress}
      pressScale={0.9}
      style={styles.iconButton}
    >
      <Icon color={theme.text} name={name} size={20} />
      {indicator ? (
        <View
          style={[styles.dot, { backgroundColor: theme.primary, borderColor: theme.background }]}
        />
      ) : null}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  logoCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  side: {
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  todayPill: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    justifyContent: 'center',
  },
  todayLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 17,
  },
  cluster: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 36,
    paddingHorizontal: 2,
    borderRadius: radius.pill,
    zIndex: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 12,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  menu: {
    width: 220,
    overflow: 'hidden',
    ...continuousCorner(16),
  },
  menuRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
  },
  menuLabel: {
    ...type.rowLabel,
  },
});
