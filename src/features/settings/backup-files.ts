import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { BackupError, exportBackup, validateBackup, type Backup } from '@/db/backup';
import { today } from '@/lib/dates';

/** Writes a backup to a temporary file and opens the iOS share sheet. */
export async function shareBackup(): Promise<void> {
  const file = new File(Paths.cache, `nawaru-backup-${today()}.json`);
  file.create({ overwrite: true });
  await file.write(JSON.stringify(exportBackup()));
  try {
    await Sharing.shareAsync(file.uri, { mimeType: 'application/json', UTI: 'public.json' });
  } finally {
    // The share sheet has copied what it needed by the time it closes.
    if (file.exists) file.delete();
  }
}

export type PickedBackup = { backup: Backup; rows: number; name: string };

/** Lets the athlete pick a backup file and checks it. Null when cancelled. */
export async function pickBackup(): Promise<PickedBackup | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const [asset] = result.assets;
  const file = new File(asset.uri);
  let data: unknown;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new BackupError('This file is not a Nawaru backup.');
  } finally {
    if (file.exists) file.delete();
  }
  return { ...validateBackup(data), name: asset.name };
}
