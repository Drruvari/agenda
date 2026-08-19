import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedPressable } from '@/components/ui/AnimatedPressable';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useAppTheme } from '@/theme/AppThemeProvider';
import { fonts } from '@/theme/fonts';
import { spacing } from '@/theme/tokens';

type TabRoute = {
  key: string;
  name: string;
};

type Props = {
  state: { index: number; routes: TabRoute[] };
  navigation: {
    emit: (event: { type: string; target: string; canPreventDefault: boolean }) => {
      defaultPrevented: boolean;
    };
    navigate: (name: string, params?: object) => void;
  };
};

const MAIN_TABS: { name: string; label: string; icon: IconName }[] = [
  { name: '(today)', label: 'Agenda', icon: 'calendar' },
  { name: 'page', label: 'Page', icon: 'writing' },
  { name: 'library', label: 'Library', icon: 'notebook' },
];

export function AgendaTabBar({ state, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  function activate(name: string, key: string, focused: boolean) {
    const event = navigation.emit({
      type: 'tabPress',
      target: key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(name);
    }
  }

  const searchRoute = state.routes.find((route) => route.name === 'search');
  const searchFocused = searchRoute ? state.routes[state.index]?.name === 'search' : false;

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
      <View style={styles.row}>
        <View style={[styles.dock, { backgroundColor: theme.section }]}>
          {MAIN_TABS.map((tab) => {
            const route = state.routes.find((item) => item.name === tab.name);
            if (!route) return null;
            const focused = state.routes[state.index]?.key === route.key;
            const color = focused ? theme.text : theme.textSecondary;

            return (
              <AnimatedPressable
                accessibilityLabel={tab.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                haptic="selection"
                key={route.key}
                onPress={() => activate(route.name, route.key, focused)}
                pressScale={0.96}
                style={styles.item}
              >
                <View
                  style={[
                    styles.iconWell,
                    focused && { backgroundColor: theme.control.fillQuaternary },
                  ]}
                >
                  <Icon color={color} name={tab.icon} size={22} stroke={focused ? 2.2 : 1.8} />
                </View>
                <Text style={[styles.label, { color }]}>{tab.label}</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        {searchRoute ? (
          <AnimatedPressable
            accessibilityLabel="Search"
            accessibilityRole="tab"
            accessibilityState={{ selected: searchFocused }}
            haptic="selection"
            onPress={() => activate(searchRoute.name, searchRoute.key, searchFocused)}
            pressScale={0.94}
            style={[
              styles.search,
              {
                backgroundColor: searchFocused ? theme.control.fillQuaternary : theme.section,
              },
            ]}
          >
            <Icon
              color={searchFocused ? theme.text : theme.textSecondary}
              name="search"
              size={22}
              stroke={searchFocused ? 2.2 : 1.8}
            />
          </AnimatedPressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dock: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 6,
    gap: 2,
    borderRadius: 34,
  },
  item: {
    width: 72,
    alignItems: 'center',
    gap: 2,
  },
  iconWell: {
    width: 56,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: -0.1,
  },
  search: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
