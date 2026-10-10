export type DurationUnit = "minutes" | "hours" | "days" | "weeks" | "months";
export function durationEnd(start: string, value: number, unit: DurationUnit) {
  const date = new Date(start);
  if (unit === "months") {
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() + value);
    const last = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate();
    date.setUTCDate(Math.min(day, last));
  } else {
    const minutes = { minutes: 1, hours: 60, days: 1440, weeks: 10080 }[unit];
    date.setTime(date.getTime() + value * minutes * 60000);
  }
  return date.toISOString();
}
export function durationLabel(start: string, end: string) {
  const minutes = Math.round(
    (new Date(end).getTime() - new Date(start).getTime()) / 60000,
  );
  const units = [
    [10080, "week"],
    [1440, "day"],
    [60, "hour"],
    [1, "minute"],
  ] as const;
  for (const [size, name] of units) {
    if (minutes >= size && minutes % size === 0) {
      const count = minutes / size;
      return `${count} ${name}${count === 1 ? "" : "s"}`;
    }
  }
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
