import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type IconName } from '@/components/ui/Icon';
import { SettingsRow } from '@/components/ui/settings/SettingsRow';
import { SettingsSection } from '@/components/ui/settings/SettingsSection';
import { useThemeStyles } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { layout, spacing } from '@/theme/tokens';

const sections: {
  title: string;
  rows: { label: string; icon: IconName; href: string }[];
}[] = [
  {
    title: 'Preferences',
    rows: [
      { label: 'General', icon: 'settings', href: '/settings/appearance' },
      { label: 'Editor', icon: 'typography', href: '/settings/editor' },
    ],
  },
  {
    title: 'Data',
    rows: [
      { label: 'Sync', icon: 'cloud', href: '/settings/sync' },
      { label: 'Export', icon: 'fileExport', href: '/settings/export' },
    ],
  },
  {
    title: 'Agenda',
    rows: [
      { label: 'Privacy', icon: 'lock', href: '/settings/privacy' },
      { label: 'Notifications', icon: 'bell', href: '/settings/notifications' },
      { label: 'About', icon: 'info', href: '/settings/about' },
    ],
  },
];

export function SettingsHubScreen() {
  const router = useRouter();
  const { styles } = useThemeStyles(createStyles);

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <SettingsSection key={section.title} title={section.title}>
            {section.rows.map((row, index) => (
              <SettingsRow
                icon={row.icon}
                key={row.href}
                label={row.label}
                last={index === section.rows.length - 1}
                onPress={() => router.push(row.href as never)}
              />
            ))}
          </SettingsSection>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    content: {
      paddingHorizontal: layout.screenPadding,
      paddingTop: spacing.md,
      paddingBottom: 28,
      gap: layout.sectionGap,
    },
  });
}
