import { Host, Slider, Switch } from '@expo/ui';
import Constants from 'expo-constants';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { SegmentedControl } from '@/components/segmented-control';
import { Stepper } from '@/components/stepper';
import { TextField } from '@/components/text-field';
import { showToast } from '@/components/toast';
import { BackupError, importBackup } from '@/db/backup';
import { getAthlete, updateProfile } from '@/db/queries/profile';
import { useDbQuery } from '@/db/use-db-version';
import { pickBackup, shareBackup } from '@/features/settings/backup-files';
import { closeSession } from '@/features/timer/store';
import { formatDate } from '@/lib/format';
import { space, touch, useTheme } from '@/theme';

// S13 Settings (docs/screens.md).
export default function SettingsScreen() {
  const { colors } = useTheme();
  const athlete = useDbQuery(getAthlete, 'settings-athlete');
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!athlete) return null;
  const displayName = name ?? athlete.displayName;

  const saveName = () => {
    const trimmed = displayName.trim();
    if (trimmed && trimmed !== athlete.displayName) updateProfile({ displayName: trimmed });
    setName(null);
  };

  const exportData = async () => {
    setBusy(true);
    try {
      await shareBackup();
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const importData = async () => {
    try {
      const picked = await pickBackup();
      if (!picked) return;
      const exported = formatDate(new Date(picked.backup.exportedAt));
      Alert.alert(
        'Replace all data?',
        `${picked.name} (exported ${exported}, ${picked.rows} rows) replaces everything in the app. This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Replace',
            style: 'destructive',
            onPress: () => {
              try {
                // A running timer belongs to the data being replaced.
                closeSession();
                importBackup(picked.backup);
                showToast('Backup imported');
              } catch (error) {
                Alert.alert('Import failed', error instanceof Error ? error.message : String(error));
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Import failed',
        error instanceof BackupError || error instanceof Error ? error.message : String(error),
      );
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={styles.content}>
      <Section title="Profile">
        <Row label="Name">
          <View style={styles.inline}>
            <TextField
              value={displayName}
              onChangeText={setName}
              onEndEditing={saveName}
              returnKeyType="done"
              autoCapitalize="words"
              style={styles.input}
            />
          </View>
        </Row>
        <Row label="Bodyweight" hint="Used to show hangs as % of bodyweight">
          <View style={styles.inline}>
            <Stepper
              label="bodyweight"
              value={athlete.bodyweightKg}
              step={0.5}
              min={30}
              max={200}
              initial={70}
              format={(kg) => `${kg} kg`}
              inputHint="Kilograms"
              onChange={(bodyweightKg) => updateProfile({ bodyweightKg })}
            />
          </View>
        </Row>
        {athlete.bodyweightKg != null ? (
          <Button title="Clear bodyweight" variant="ghost" onPress={() => updateProfile({ bodyweightKg: null })} />
        ) : null}
      </Section>

      <Section title="Units">
        <Row label="Weight" hint={athlete.weightUnit === 'lbs' ? 'Loads still show in kg for now' : undefined}>
          <SegmentedControl
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lbs', label: 'lbs' },
            ]}
            value={athlete.weightUnit}
            onChange={(weightUnit) => updateProfile({ weightUnit })}
          />
        </Row>
        <Row label="Boulder grades">
          <SegmentedControl
            options={[
              { value: 'font', label: 'Font' },
              { value: 'v_scale', label: 'V-scale' },
            ]}
            value={athlete.boulderGradeSystem}
            onChange={(boulderGradeSystem) => updateProfile({ boulderGradeSystem })}
          />
        </Row>
        <Row label="Route grades">
          <SegmentedControl
            options={[
              { value: 'french', label: 'French' },
              { value: 'yds', label: 'YDS' },
            ]}
            value={athlete.routeGradeSystem}
            onChange={(routeGradeSystem) => updateProfile({ routeGradeSystem })}
          />
        </Row>
      </Section>

      <Section title="Appearance">
        <Row label="Theme">
          <SegmentedControl
            options={[
              { value: 'dark', label: 'Dark' },
              { value: 'light', label: 'Light' },
              { value: 'system', label: 'System' },
            ]}
            value={athlete.theme}
            onChange={(theme) => updateProfile({ theme })}
          />
        </Row>
      </Section>

      <Section title="Timer">
        <Row label="Get ready countdown">
          <View style={styles.inline}>
            <Stepper
              label="get ready countdown"
              value={athlete.prepCountdownS}
              min={5}
              max={30}
              format={(seconds) => `${seconds}s`}
              onChange={(prepCountdownS) => updateProfile({ prepCountdownS })}
            />
          </View>
        </Row>
        <Row label="Side switch rest">
          <View style={styles.inline}>
            <Stepper
              label="side switch rest"
              value={athlete.sideSwitchRestS}
              min={5}
              max={30}
              format={(seconds) => `${seconds}s`}
              onChange={(sideSwitchRestS) => updateProfile({ sideSwitchRestS })}
            />
          </View>
        </Row>
        <ToggleRow
          label="Sounds"
          value={athlete.timerSoundsEnabled}
          onChange={(timerSoundsEnabled) => updateProfile({ timerSoundsEnabled })}
        />
        <VolumeRow value={athlete.timerVolume} disabled={!athlete.timerSoundsEnabled} />
        <ToggleRow
          label="Haptics"
          value={athlete.hapticsEnabled}
          onChange={(hapticsEnabled) => updateProfile({ hapticsEnabled })}
        />
        <AppText variant="bodySm" color="textSecondary">
          Changes apply to the next exercise you open.
        </AppText>
      </Section>

      <Section title="Data">
        <AppText variant="bodySm" color="textSecondary">
          Everything is stored on this phone only. Export a backup regularly and keep it somewhere safe
          (Files, iCloud Drive, email).
        </AppText>
        <Button title="Export backup" variant="secondary" disabled={busy} onPress={exportData} />
        <Button title="Import backup" variant="secondary" onPress={importData} />
      </Section>

      <Section title="About">
        <Row label="Version">
          <AppText color="textSecondary">{Constants.expoConfig?.version ?? '–'}</AppText>
        </Row>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <AppText variant="label" color="textSecondary" accessibilityRole="header">
        {title}
      </AppText>
      <Card style={styles.card}>{children}</Card>
    </View>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <View style={styles.row}>
      <AppText variant="bodyStrong">{label}</AppText>
      <View style={styles.control}>{children}</View>
      {hint ? (
        <AppText variant="caption" color="textSecondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const VOLUME_SAVE_DELAY_MS = 300;

/** The slider follows the finger; the value is saved once it stops moving. */
function VolumeRow({ value, disabled }: { value: number; disabled: boolean }) {
  const { colors, scheme } = useTheme();
  const [draft, setDraft] = useState<number | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timeout.current) clearTimeout(timeout.current);
  }, []);
  const shown = draft ?? value;

  const change = (next: number) => {
    const rounded = Math.round(next);
    setDraft(rounded);
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      updateProfile({ timerVolume: rounded });
      setDraft(null);
    }, VOLUME_SAVE_DELAY_MS);
  };

  return (
    <Row label={`Sound volume · ${shown}%`}>
      <View style={styles.inline}>
        <Host style={styles.slider} seedColor={colors.accent} colorScheme={scheme}>
          <Slider value={shown} min={0} max={100} step={5} disabled={disabled} onValueChange={change} />
        </Host>
      </View>
    </Row>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  const { colors, scheme } = useTheme();
  return (
    <View style={styles.toggle}>
      <AppText variant="bodyStrong" style={styles.toggleLabel}>
        {label}
      </AppText>
      <Host matchContents seedColor={colors.accent} colorScheme={scheme}>
        <Switch value={value} onValueChange={onChange} />
      </Host>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: space[4], gap: space[6], paddingBottom: space[16] },
  section: { gap: space[2] },
  card: { gap: space[4] },
  row: { gap: space[2] },
  control: {},
  inline: { flexDirection: 'row' },
  input: { flex: 1 },
  slider: { flex: 1, height: touch.min },
  toggle: { flexDirection: 'row', alignItems: 'center', minHeight: touch.min },
  toggleLabel: { flex: 1 },
});
