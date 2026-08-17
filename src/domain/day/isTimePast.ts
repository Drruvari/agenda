/** True when a same-day wall-clock time (e.g. "14:30" or "2:30 PM") is already past. */
export function isTimePast(time: string, now = new Date()): boolean {
  const value = time.trim();

  const twelveHour = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value);
  if (twelveHour) {
    const hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2]);
    if (hour < 1 || hour > 12 || minute > 59) return false;

    let hours = hour % 12;
    if (twelveHour[3].toUpperCase() === 'PM') hours += 12;

    const due = new Date(now);
    due.setHours(hours, minute, 0, 0);
    return due.getTime() < now.getTime();
  }

  const twentyFourHour = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!twentyFourHour) {
    return false;
  }

  const hours = Number(twentyFourHour[1]);
  const minutes = Number(twentyFourHour[2]);
  if (hours > 23 || minutes > 59) return false;

  const due = new Date(now);
  due.setHours(hours, minutes, 0, 0);
  return due.getTime() < now.getTime();
}
