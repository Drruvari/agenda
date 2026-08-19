import { Tabs } from 'expo-router';

import { AgendaTabBar } from '@/components/ui/AgendaTabBar';
import { useAppTheme } from '@/theme/AppThemeProvider';

export default function AndroidTabsLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      tabBar={(props) => (
        <AgendaTabBar navigation={props.navigation as never} state={props.state} />
      )}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background, flex: 1 },
      }}
    >
      <Tabs.Screen name="(today)" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="page" options={{ title: 'Page' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="search" options={{ title: 'Search' }} />
    </Tabs>
  );
}
