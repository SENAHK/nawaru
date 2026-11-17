// Redirects native Expo modules to Node stand-ins so database code can run in tests.

import { registerHooks } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const shim = (name: string) => pathToFileURL(join(__dirname, 'shims', `${name}.ts`)).href;
const shims: Record<string, string> = {
  'expo-sqlite': shim('expo-sqlite'),
  'expo-crypto': shim('expo-crypto'),
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    const url = shims[specifier];
    return url ? { url, shortCircuit: true } : nextResolve(specifier, context);
  },
});
