/** True when a same-day wall-clock time (e.g. "14:30" or "2:30 PM") is already past. */
export function isTimePast(time: string, now = new Date()): boolean {
  const trimmed = time.trim();
  const match12 = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed);
  const match24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed);
  let hours: number;
  let minutes: number;
  if (match12) {
    hours = Number(match12[1]) % 12;
    if (match12[3].toUpperCase() === 'PM') hours += 12;
    minutes = Number(match12[2]);
  } else if (match24) {
    hours = Number(match24[1]);
    minutes = Number(match24[2]);
  } else {
    return false;
  }
  const due = new Date(now);
  due.setHours(hours, minutes, 0, 0);
  return due.getTime() < now.getTime();
}
