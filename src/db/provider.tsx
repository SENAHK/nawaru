import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { useEffect, useState, type ReactNode } from 'react';

import migrations from '../../drizzle/migrations';
import { db } from './client';
import { seedDatabase } from './seed';

let setup: Promise<void> | null = null;

/** Runs pending migrations, then seeds the database on first launch. Runs once. */
function setupDatabase(): Promise<void> {
  setup ??= migrate(db, migrations).then(() => seedDatabase(db));
  return setup;
}

type DatabaseStatus = { ready: boolean; error: Error | null };

export function useDatabaseSetup(): DatabaseStatus {
  const [status, setStatus] = useState<DatabaseStatus>({ ready: false, error: null });

  useEffect(() => {
    let active = true;
    setupDatabase().then(
      () => active && setStatus({ ready: true, error: null }),
      (error: unknown) =>
        active &&
        setStatus({
          ready: false,
          error: error instanceof Error ? error : new Error(String(error)),
        }),
    );
    return () => {
      active = false;
    };
  }, []);

  return status;
}

export function DatabaseGate({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: (error: Error) => ReactNode;
}) {
  const { ready, error } = useDatabaseSetup();
  if (error) return fallback(error);
  if (!ready) return null;
  return children;
}
