import { BottomSheet, Button, Group, Host, List, Text } from '@expo/ui/swift-ui';
import { buttonStyle, padding, presentationDragIndicator, tint } from '@expo/ui/swift-ui/modifiers';
import { useState } from 'react';
import { Alert } from 'react-native';

import { useData } from '@/data';
import { defaultSpaceColor } from '@/features/library/spaceAppearance';
import { useAppAppearance } from '@/theme/AppThemeProvider';

type SpaceOption = { label: string; value: string };

const NONE_SPACE = '__none__';

export function IosChooseSpaceControl({
  onChange,
  spaces,
  value,
}: {
  onChange: (value: string) => void;
  spaces: SpaceOption[];
  value: string;
}) {
  const { accent, colorScheme } = useAppAppearance();
  const { repos, refresh } = useData();
  const [open, setOpen] = useState(false);
  const selected = spaces.find((option) => option.value === value)?.label ?? 'Inbox';
  const userSpaces = spaces.filter((option) => option.value !== NONE_SPACE);

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  const promptNewSpace = () => {
    setOpen(false);
    Alert.prompt(
      'New Space',
      'Give this Space a name.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (name?: string) => {
            const trimmed = name?.trim();
            if (!trimmed) return;
            void (async () => {
              const space = await repos.spaces.create({
                name: trimmed,
                color: defaultSpaceColor(accent),
                isPinned: true,
              });
              refresh();
              onChange(space.id);
            })();
          },
        },
      ],
      'plain-text',
    );
  };

  return (
    <Host colorScheme={colorScheme} ignoreSafeArea="all" matchContents seedColor={accent}>
      <BottomSheet
        anchor={
          <Button
            label={selected}
            modifiers={[buttonStyle('plain'), tint(accent)]}
            onPress={() => setOpen(true)}
          />
        }
        fitToContents
        isPresented={open}
        onIsPresentedChange={setOpen}
      >
        <Group modifiers={[presentationDragIndicator('visible'), padding({ all: 8 })]}>
          <List>
            <Text>Choose Space</Text>
            <Button
              label="Inbox"
              onPress={() => choose(NONE_SPACE)}
              {...(value === NONE_SPACE ? { systemImage: 'checkmark' as const } : {})}
            />
            {userSpaces.map((space) => (
              <Button
                key={space.value}
                label={space.label}
                onPress={() => choose(space.value)}
                {...(value === space.value ? { systemImage: 'checkmark' as const } : {})}
              />
            ))}
            <Button label="New Space" onPress={promptNewSpace} systemImage="plus" />
          </List>
        </Group>
      </BottomSheet>
    </Host>
  );
}
