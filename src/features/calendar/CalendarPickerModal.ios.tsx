import { BottomSheet, Button, Column, Host, Row, Spacer, Text } from '@expo/ui';
import { DatePicker } from '@expo/ui/swift-ui';
import { datePickerStyle } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useAppAppearance } from '@/theme/AppThemeProvider';

import type { CalendarPickerModalProps } from './CalendarPickerModal.types';

export function CalendarPickerModal({
  onChange,
  onClose,
  value,
  visible,
}: CalendarPickerModalProps) {
  const { accent, colorScheme } = useAppAppearance();
  const [selection, setSelection] = useState(value);
  const [wasVisible, setWasVisible] = useState(visible);

  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setSelection(value);
  }

  const dismiss = () => {
    onClose();
  };

  return (
    <Host colorScheme={colorScheme} seedColor={accent} style={styles.host}>
      <BottomSheet isPresented={visible} onDismiss={dismiss}>
        <Column spacing={8} style={styles.content}>
          <Row alignment="center" spacing={4} style={styles.topBar}>
            <Spacer />
            <Text textStyle={{ fontSize: 17, fontWeight: '600' }}>Choose a date</Text>
            <Spacer />
            <Button
              label="Done"
              onPress={() => {
                onChange(selection);
                dismiss();
              }}
              variant="text"
            />
          </Row>

          <DatePicker
            displayedComponents={['date']}
            modifiers={[datePickerStyle('graphical')]}
            onDateChange={setSelection}
            selection={selection}
          />
        </Column>
      </BottomSheet>
    </Host>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFill,
    zIndex: 80,
    elevation: 80,
  },
  content: {
    width: '100%',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  topBar: {
    height: 44,
    paddingHorizontal: 4,
  },
});
