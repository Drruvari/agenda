import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AndroidSettingsSafeArea({ children }: PropsWithChildren) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.root}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
