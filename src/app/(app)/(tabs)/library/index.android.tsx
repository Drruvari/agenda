import { useRouter } from 'expo-router';
import { type ReactNode, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/ui/Icon';
import { type AgendaItem, type DailyNote, type Space, useData } from '@/data';
import { useLibrary } from '@/features/library';
import { type AgendaTheme, continuousCorner, fonts, useThemeStyles } from '@/theme';

export default function LibraryScreen() {
  const router = useRouter();
  const { repos, revision } = useData();
  const { openCreateSpace } = useLibrary();
  const { styles } = useThemeStyles(createStyles);
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([repos.agenda.list(), repos.notes.list(), repos.spaces.list()]).then(
      ([nextItems, nextNotes, nextSpaces]) => {
        if (cancelled) return;
        setItems(nextItems);
        setNotes(nextNotes);
        setSpaces(nextSpaces.filter((space) => space.name.toLowerCase() !== 'inbox'));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [repos, revision]);

  const inboxCount = items.filter((item) => !item.spaceId).length;
  const completedCount = items.filter((item) => item.type === 'task' && item.completed).length;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text accessibilityRole="header" style={styles.title}>
          Library
        </Text>

        <Section title="Collections">
          <Row
            count={items.length}
            icon="checklist"
            label="All Items"
            onPress={() => router.push('/library/items')}
          />
          <Row
            count={inboxCount}
            icon="inbox"
            label="Inbox"
            onPress={() => router.push('/library/inbox')}
          />
          <Row
            count={completedCount}
            icon="completed"
            label="Completed"
            onPress={() => router.push('/library/completed')}
          />
          <Row
            count={notes.length}
            icon="notebook"
            label="Daily Notes"
            last
            onPress={() => router.push('/library/notes')}
          />
        </Section>

        <Section title="Spaces">
          {spaces.map((space) => (
            <Row
              color={space.color}
              icon="agenda"
              key={space.id}
              label={space.name}
              onPress={() => router.push(`/library/space/${space.id}` as never)}
              supporting={space.isPinned ? 'Pinned to Today' : 'Space'}
            />
          ))}
          <Row icon="add" label="Add Space" last onPress={openCreateSpace} />
        </Section>

        <Section title="App">
          <Row icon="settings" label="Settings" last onPress={() => router.push('/settings')} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ children, title }: { children: ReactNode; title: string }) {
  const { styles } = useThemeStyles(createStyles);
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  color,
  count,
  icon,
  label,
  last = false,
  onPress,
  supporting,
}: {
  color?: string;
  count?: number;
  icon: IconName;
  label: string;
  last?: boolean;
  onPress: () => void;
  supporting?: string;
}) {
  const { styles, theme } = useThemeStyles(createStyles);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.rowPressed]}
    >
      {color ? (
        <View style={[styles.swatch, { backgroundColor: color }]} />
      ) : (
        <View style={styles.iconWrap}>
          <Icon color={theme.textSecondary} name={icon} size={20} />
        </View>
      )}
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {supporting ? <Text style={styles.supporting}>{supporting}</Text> : null}
      </View>
      {count != null ? <Text style={styles.count}>{count}</Text> : null}
      <Icon color={theme.textTertiary} name="chevronRight" size={18} />
    </Pressable>
  );
}

function createStyles(theme: AgendaTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.background },
    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28, gap: 24 },
    title: {
      paddingHorizontal: 4,
      color: theme.text,
      fontFamily: fonts.sans,
      fontSize: 34,
      lineHeight: 41,
      fontWeight: '700',
      letterSpacing: -0.7,
    },
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
    swatch: {
      width: 14,
      height: 14,
      borderRadius: 7,
      marginHorizontal: 8,
    },
    copy: { flex: 1, minWidth: 0, gap: 2 },
    label: {
      color: theme.text,
      fontFamily: fonts.sansMedium,
      fontSize: 16,
      lineHeight: 22,
    },
    supporting: {
      color: theme.textSecondary,
      fontFamily: fonts.sans,
      fontSize: 12.5,
      lineHeight: 17,
    },
    count: {
      color: theme.textSecondary,
      fontFamily: fonts.sansMedium,
      fontSize: 15,
    },
  });
}
