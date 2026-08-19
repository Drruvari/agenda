type WallClockTime = {
  hours: number;
  minutes: number;
};

function parseTwelveHourTime(value: string): WallClockTime | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value);

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);
  const minutes = Number(match[2]);

  if (hour < 1 || hour > 12 || minutes > 59) {
    return null;
  }

  let hours = hour % 12;

  if (match[3]?.toUpperCase() === 'PM') {
    hours += 12;
  }

  return {
    hours,
    minutes,
  };
}

function parseTwentyFourHourTime(value: string): WallClockTime | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return {
    hours,
    minutes,
  };
}

function parseWallClockTime(value: string): WallClockTime | null {
  return parseTwelveHourTime(value) ?? parseTwentyFourHourTime(value);
}

export function isTimePast(time: string, now = new Date()): boolean {
  const parsed = parseWallClockTime(time.trim());

  if (!parsed) {
    return false;
  }

  const due = new Date(now);

  due.setHours(parsed.hours, parsed.minutes, 0, 0);

  return due.getTime() < now.getTime();
}
