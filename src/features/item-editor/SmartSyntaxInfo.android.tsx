import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { fonts, useAppTheme } from '@/theme';

export function SmartSyntaxInfo() {
  const [visible, setVisible] = useState(false);
  const theme = useAppTheme();

  return (
    <>
      <Pressable
        accessibilityLabel="Smart syntax information"
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => setVisible(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Icon name="info" size={21} color={String(theme.textSecondary)} />
      </Pressable>
      <Modal
        animationType="fade"
        onRequestClose={() => setVisible(false)}
        statusBarTranslucent
        transparent
        visible={visible}
      >
        <Pressable style={styles.backdrop} onPress={() => setVisible(false)}>
          <View style={[styles.card, { backgroundColor: theme.section }]}>
            <Text style={[styles.title, { color: theme.text }]}>Smart syntax</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>/event changes type</Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              friday or tomorrow sets the date
            </Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              14:30 and 1h set time and duration
            </Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              #personal chooses a space
            </Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              !, !!, or !!! sets priority
            </Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  pressed: { opacity: 0.55 },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  card: {
    padding: 20,
    gap: 8,
    borderRadius: 20,
    elevation: 12,
  },
  title: {
    marginBottom: 4,
    fontFamily: fonts.sansSemi,
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 21,
  },
});
