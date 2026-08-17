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
import { View } from 'react-native';

import { useAppAppearance, useAppTheme } from '@/theme';

export function SmartSyntaxInfo() {
  const [isPresented, setIsPresented] = useState(false);
  const { accent, colorScheme } = useAppAppearance();
  const theme = useAppTheme();

  return (
    <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
      <Host
        colorScheme={colorScheme}
        ignoreSafeArea="all"
        matchContents
        seedColor={accent}
        style={{ width: 28, height: 28 }}
      >
          <Popover
          arrowEdge="trailing"
          attachmentAnchor="center"
          isPresented={isPresented}
          onIsPresentedChange={setIsPresented}
        >
          <Popover.Trigger>
            <Button
              label="Smart syntax"
              modifiers={[
                buttonStyle('plain'),
                controlSize('regular'),
                labelStyle('iconOnly'),
                frame({ width: 28, height: 28, alignment: 'center' }),
              ]}
              onPress={() => setIsPresented((open) => !open)}
              systemImage="info.circle"
            />
          </Popover.Trigger>
          <Popover.Content>
            <VStack
              alignment="leading"
              spacing={6}
              modifiers={[padding({ top: 12, bottom: 12, leading: 14, trailing: 14 })]}
            >
              <Text modifiers={[font({ size: 15, weight: 'semibold' })]}>Smart syntax</Text>
              <Text modifiers={[font({ size: 13 }), foregroundStyle(String(theme.textSecondary))]}>
                /event changes the item type
              </Text>
              <Text modifiers={[font({ size: 13 }), foregroundStyle(String(theme.textSecondary))]}>
                friday or tomorrow sets the date
              </Text>
              <Text modifiers={[font({ size: 13 }), foregroundStyle(String(theme.textSecondary))]}>
                14:30 and 1h set time and duration
              </Text>
              <Text modifiers={[font({ size: 13 }), foregroundStyle(String(theme.textSecondary))]}>
                #personal chooses a space
              </Text>
              <Text modifiers={[font({ size: 13 }), foregroundStyle(String(theme.textSecondary))]}>
                !, !!, or !!! sets priority
              </Text>
            </VStack>
          </Popover.Content>
        </Popover>
      </Host>
    </View>
  );
}
