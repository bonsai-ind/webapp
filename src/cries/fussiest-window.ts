// The fussiest window: the hour of day with the most cries. Ties resolve to the
// earliest hour. Drives the "Fussiest around HH:00" callout on the Cries screen.
export function fussiestWindow(hourly: number[]): { hour: number; count: number } {
  let hour = 0;
  let count = hourly[0] ?? 0;
  for (let h = 1; h < hourly.length; h++) {
    if (hourly[h] > count) {
      count = hourly[h];
      hour = h;
    }
  }
  return { hour, count };
}
