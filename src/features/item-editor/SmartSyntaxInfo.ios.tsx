import { Button, Host, Popover, Text, VStack } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  controlSize,
  font,
  foregroundStyle,
  frame,
  labelStyle,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';

import { useAppAppearance, useAppTheme } from '@/theme';

export function SmartSyntaxInfo() {
  const [isPresented, setIsPresented] = useState(false);
  const { accent, colorScheme } = useAppAppearance();
  const theme = useAppTheme();

  return (
    <Host
      colorScheme={colorScheme}
      ignoreSafeArea="all"
      seedColor={accent}
      style={{ width: 40, height: 40 }}
    >
      <Popover
        arrowEdge="bottom"
        attachmentAnchor="trailing"
        isPresented={isPresented}
        onIsPresentedChange={setIsPresented}
      >
        <Popover.Trigger>
          <Button
            label="Smart syntax"
            modifiers={[
              buttonStyle('plain'),
              controlSize('small'),
              labelStyle('iconOnly'),
              frame({ width: 40, height: 40, alignment: 'center' }),
            ]}
            onPress={() => setIsPresented(true)}
            systemImage="info.circle"
          />
        </Popover.Trigger>
        <Popover.Content>
          <VStack alignment="leading" spacing={7} modifiers={[padding({ all: 16 })]}>
            <Text modifiers={[font({ size: 16, weight: 'semibold' })]}>Smart syntax</Text>
            <Text modifiers={[foregroundStyle(String(theme.textSecondary))]}>
              /event changes the item type
            </Text>
            <Text modifiers={[foregroundStyle(String(theme.textSecondary))]}>
              friday or tomorrow sets the date
            </Text>
            <Text modifiers={[foregroundStyle(String(theme.textSecondary))]}>
              14:30 and 1h set time and duration
            </Text>
            <Text modifiers={[foregroundStyle(String(theme.textSecondary))]}>
              #personal chooses a space
            </Text>
            <Text modifiers={[foregroundStyle(String(theme.textSecondary))]}>
              !, !!, or !!! sets priority
            </Text>
          </VStack>
        </Popover.Content>
      </Popover>
    </Host>
  );
}
