import { Screen } from '@/components/layout/Screen';
import { NavigationLink } from '@/components/ui/NavigationLink';

export function NotFoundScreen() {
  return (
    <Screen title="Page not found" description="This route does not exist in the Agenda scaffold.">
      <NavigationLink href="/" label="Return to Today" />
    </Screen>
  );
}
