import * as DocumentPicker from 'expo-document-picker';
import * as Print from 'expo-print';

export async function saveBackupFile(contents: string): Promise<void> {
  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `agenda-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export async function pickBackupFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
  if (result.canceled) return null;
  if (result.assets[0].file) return result.assets[0].file.text();
  return fetch(result.assets[0].uri).then((response) => response.text());
}

export async function printPage(html: string): Promise<void> {
  await Print.printAsync({ html });
}
