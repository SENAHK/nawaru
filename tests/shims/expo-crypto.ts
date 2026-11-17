import { randomBytes } from 'node:crypto';

export const getRandomBytes = (byteCount: number) => new Uint8Array(randomBytes(byteCount));
