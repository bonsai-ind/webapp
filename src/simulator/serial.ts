const SERIAL_KEY = "hush.sim.serial";

// The simulator's immutable factory identity (its Serial Number), persisted so
// the simulated box survives reloads as the *same* device. `SIM-` prefix keeps
// simulated hardware distinguishable from real serials in the devices table.
export function getOrCreateSerial(): string {
  const existing = localStorage.getItem(SERIAL_KEY);
  if (existing) return existing;
  const serial = `SIM-${randomBlock(8)}`;
  localStorage.setItem(SERIAL_KEY, serial);
  return serial;
}

// Factory reset: forget the serial so the next boot mints a brand-new device.
export function resetSerial(): void {
  localStorage.removeItem(SERIAL_KEY);
}

function randomBlock(length: number): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}
