type RandomSource = (byteCount: number) => Uint8Array;

// Fallback used outside the app (drizzle-kit, scripts). The app swaps in
// expo-crypto through `setRandomSource` when the database opens.
let randomBytes: RandomSource = (byteCount) => {
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) bytes[i] = Math.floor(Math.random() * 256);
  return bytes;
};

export function setRandomSource(source: RandomSource) {
  randomBytes = source;
}

/** UUID v7: 48-bit ms timestamp + random bits, so ids sort by creation time. */
export function uuidv7(now: number = Date.now()): string {
  const bytes = randomBytes(16);
  let timestamp = now;
  for (let i = 5; i >= 0; i--) {
    bytes[i] = timestamp % 256;
    timestamp = Math.floor(timestamp / 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
