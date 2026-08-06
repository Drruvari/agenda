import { Stack } from 'expo-router';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      <Stack.Screen name="task-create" options={{ title: 'New task' }} />
      <Stack.Screen name="task-edit" options={{ title: 'Edit task' }} />
      <Stack.Screen name="routine-create" options={{ title: 'New routine' }} />
      <Stack.Screen name="quick-add" options={{ title: 'Quick add' }} />
      <Stack.Screen name="command-palette" options={{ title: 'Commands' }} />
    </Stack>
  );
}
