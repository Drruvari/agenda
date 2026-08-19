import { useFonts } from 'expo-font';
import { Platform } from 'react-native';

const FONT_MAP = {
  'Switzer-Regular': require('../../assets/fonts/Switzer-Regular.ttf'),
  'Switzer-Medium': require('../../assets/fonts/Switzer-Medium.ttf'),
  'Switzer-Semibold': require('../../assets/fonts/Switzer-Semibold.ttf'),
};

/** iOS keeps San Francisco. Other platforms load the Agenda typefaces. */
export function useAgendaFonts(): boolean {
  const [loaded, error] = useFonts(FONT_MAP);
  if (Platform.OS === 'ios') return true;
  return loaded || Boolean(error);
}
