import { router } from 'expo-router';

import { Screen } from '@/components/layout/Screen';
import { Button } from '@/components/ui/button/Button';

type PlaceholderScreenProps = {
  description: string;
  dismissible?: boolean;
  title: string;
};

export function PlaceholderScreen({
  description,
  dismissible = false,
  title,
}: PlaceholderScreenProps) {
  const dismiss = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace('/');
  };

  return (
    <Screen title={title} description={description}>
      {dismissible ? <Button label="Done" onPress={dismiss} /> : null}
    </Screen>
  );
}
