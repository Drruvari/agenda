import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { useThemeStyles } from '@/theme/AppThemeProvider';
import type { AgendaTheme } from '@/theme/colors';
import { fonts } from '@/theme/fonts';
import { continuousCorner } from '@/theme/tokens';

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

export default function AndroidSettingsScreen() {
  const router = useRouter();
  const { styles, theme } = useThemeStyles(createStyles);

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.rows.map((row, index) => (
                <Pressable
                  accessibilityRole="button"
                  key={row.href}
                  onPress={() => router.push(row.href as never)}
                  style={({ pressed }) => [
                    styles.row,
                    index < section.rows.length - 1 && styles.rowBorder,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={styles.iconWrap}>
                    <Icon name={row.icon} size={20} color={theme.textSecondary} />
                  </View>
                  <Text style={styles.label}>{row.label}</Text>
                  <Icon name="chevronRight" size={18} color={theme.textTertiary} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28, gap: 24 },
    section: { gap: 8 },
    sectionTitle: {
      paddingHorizontal: 4,
      color: theme.textSecondary,
      fontFamily: fonts.sansSemi,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0.25,
      textTransform: 'uppercase',
    },
    card: {
      overflow: 'hidden',
      backgroundColor: theme.section,
      ...continuousCorner(16),
    },
    row: {
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      gap: 12,
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.separator,
    },
    rowPressed: { backgroundColor: theme.control.pressed },
    iconWrap: {
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9,
      backgroundColor: theme.control.fill,
    },
    label: {
      flex: 1,
      color: theme.text,
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      lineHeight: 22,
    },
  });
}
