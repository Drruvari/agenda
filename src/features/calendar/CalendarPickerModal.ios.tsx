import { BottomSheet, Button, Column, Host, Row, Spacer, Text } from '@expo/ui';
import { DatePicker } from '@expo/ui/swift-ui';
import { datePickerStyle } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { useAppAppearance } from '@/theme';

type Props = {
  onChange: (date: Date) => void;
  onClose: () => void;
  value: Date;
  visible: boolean;
};

/** Native iOS calendar sheet — SwiftUI graphical DatePicker in Expo UI BottomSheet. */
export function CalendarPickerModal({ onChange, onClose, value, visible }: Props) {
  const { accent, colorScheme } = useAppAppearance();
  const [selection, setSelection] = useState(value);
  const [presented, setPresented] = useState(visible);

  if (!visible && !presented) {
    return null;
  }

  const dismiss = () => {
    setPresented(false);
    onClose();
  };

  return (
    <Host colorScheme={colorScheme} seedColor={accent} style={styles.host}>
      <BottomSheet isPresented={presented} onDismiss={dismiss}>
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
            onDateChange={(date) => {
              setSelection(date);
            }}
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
