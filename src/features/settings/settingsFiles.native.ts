import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export async function saveBackupFile(contents: string): Promise<void> {
  const date = new Date().toISOString().slice(0, 10);
  const file = new File(Paths.cache, `agenda-backup-${date}.json`);
  file.create({ overwrite: true });
  file.write(contents);
  if (!(await Sharing.isAvailableAsync())) throw new Error('File sharing is unavailable.');
  await Sharing.shareAsync(file.uri, {
    dialogTitle: 'Save Agenda backup',
    mimeType: 'application/json',
  });
}

export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  return new File(result.assets[0].uri).text();
}

export async function printPage(html: string): Promise<void> {
  await Print.printAsync({ html });
}
