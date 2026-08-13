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
