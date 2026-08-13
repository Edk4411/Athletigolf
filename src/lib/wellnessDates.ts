export function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  const value = new Date(`${date}T12:00:00`);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

/** The selected day and the six preceding calendar days, oldest first. */
export function sevenDayWindow(endDate: string) {
  return Array.from({ length: 7 }, (_, index) => addDays(endDate, index - 6));
}

/** Monday through Sunday for the week containing the supplied local date. */
export function weekWindow(date: string) {
  const value = new Date(`${date}T12:00:00`);
  const mondayOffset = (value.getDay() + 6) % 7;
  const start = addDays(date, -mondayOffset);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function formatWeekRange(date: string) {
  const [start, end] = [weekWindow(date)[0], weekWindow(date)[6]];
  const startDate = new Date(`${start}T12:00:00`);
  const endDate = new Date(`${end}T12:00:00`);
  return `${startDate.getDate()}–${endDate.getDate()}/${String(endDate.getMonth() + 1).padStart(2, "0")}`;
}
