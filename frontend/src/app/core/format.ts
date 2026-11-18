// Date, time and number formatting. Times are shown in the viewer's own time zone, which for a
// club's members and organizers is the club's city.

const dateFormat = new Intl.DateTimeFormat('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
const longDateFormat = new Intl.DateTimeFormat('en-CA', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
});
const timeFormat = new Intl.DateTimeFormat('en-CA', { hour: 'numeric', minute: '2-digit' });
const shortDateFormat = new Intl.DateTimeFormat('en-CA', { month: 'short', day: 'numeric' });
const monthFormat = new Intl.DateTimeFormat('en-CA', { month: 'short' });

export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

/** "Nov 8": short enough for chart labels on a phone. */
export function formatShortDate(iso: string): string {
  return shortDateFormat.format(new Date(iso)).replace('.', '');
}

export function formatLongDate(iso: string): string {
  return longDateFormat.format(new Date(iso));
}

export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

/** "6:00 – 9:00 p.m.": the shared a.m./p.m. is written once, which keeps it short on phones. */
export function formatTimeRange(startIso: string, endIso: string): string {
  return timeFormat.formatRange(new Date(startIso), new Date(endIso));
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)}, ${formatTime(iso)}`;
}

/** Parts for the square date block on event cards. */
export function dateBlock(iso: string): { day: string; month: string } {
  const date = new Date(iso);
  return { day: String(date.getDate()), month: monthFormat.format(date).replace('.', '') };
}

export function formatPercent(fraction: number | null | undefined): string {
  return fraction === null || fraction === undefined ? '–' : `${Math.round(fraction * 100)}%`;
}

/** "2026-11-17T18:30" for a datetime-local input, in the viewer's time zone. */
export function toLocalInput(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** The ISO instant for a datetime-local value, which the browser reads in the viewer's time zone. */
export function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

export function firstName(fullName: string | null | undefined): string {
  return (fullName ?? '').trim().split(/\s+/)[0] ?? '';
}

/** "Good morning" / "Good afternoon" / "Good evening" for the given hour. */
export function greeting(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** SFU terms: Spring (Jan–Apr), Summer (May–Aug), Fall (Sep–Dec). Matches the backend's Term. */
export function termOf(date: Date): { id: string; label: string; start: Date; end: Date } {
  const year = date.getFullYear();
  const startMonth = date.getMonth() >= 8 ? 8 : date.getMonth() >= 4 ? 4 : 0;
  const season = startMonth === 8 ? 'Fall' : startMonth === 4 ? 'Summer' : 'Spring';
  return {
    id: `${year}-${season.toLowerCase()}`,
    label: `${season} ${year}`,
    start: new Date(year, startMonth, 1),
    end: new Date(year, startMonth + 4, 1),
  };
}
