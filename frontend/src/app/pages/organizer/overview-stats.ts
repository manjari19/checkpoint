import { EventSummary } from '../../core/models';
import { termOf } from '../../core/format';
import { KpiChange } from '../../shared/kpi-card';

export interface OverviewStats {
  termLabel: string;
  nextEvent: EventSummary | null;
  eventsThisTerm: number;
  upcomingCount: number;
  rsvps: number;
  waitlisted: number;
  checkedIn: number;
  /** Share of confirmed people who checked in, over this term's events that have ended. */
  turnout: number | null;
  /** Share of confirmed people who did not show up, over this term's events that have ended. */
  noShowRate: number | null;
  /** One value per recent event, oldest first, for the KPI sparklines. */
  spark: { rsvps: number[]; waitlisted: number[]; checkedIn: number[]; noShowRate: number[] };
  topEvents: { event: EventSummary; turnout: number }[];
  /** Recent events that have started, oldest first, for the attendance trend chart. */
  trend: EventSummary[];
}

const RECENT = 8;

/** Club-wide numbers for the overview page, computed from the event list. */
export function overviewStats(events: EventSummary[], now: Date): OverviewStats {
  const term = termOf(now);
  const starts = (e: EventSummary) => new Date(e.startsAt);
  const ends = (e: EventSummary) => new Date(e.endsAt);
  const sum = (list: EventSummary[], pick: (e: EventSummary) => number) => list.reduce((total, e) => total + pick(e), 0);

  const chronological = [...events].sort((a, b) => starts(a).getTime() - starts(b).getTime());
  const thisTerm = chronological.filter((e) => starts(e) >= term.start && starts(e) < term.end);
  const upcoming = chronological.filter((e) => ends(e) > now);
  const started = chronological.filter((e) => starts(e) <= now);
  const endedThisTerm = thisTerm.filter((e) => ends(e) <= now);
  const recent = started.slice(-RECENT);

  const endedConfirmed = sum(endedThisTerm, (e) => e.confirmed);
  const endedCheckedIn = sum(endedThisTerm, (e) => e.checkedIn);
  const noShowOf = (e: EventSummary) => (e.confirmed > 0 ? (e.confirmed - e.checkedIn) / e.confirmed : 0);

  return {
    termLabel: term.label,
    nextEvent: upcoming[0] ?? null,
    eventsThisTerm: thisTerm.length,
    upcomingCount: upcoming.length,
    rsvps: sum(thisTerm, (e) => e.confirmed),
    waitlisted: sum(upcoming, (e) => e.waitlisted),
    checkedIn: sum(thisTerm, (e) => e.checkedIn),
    turnout: endedConfirmed > 0 ? endedCheckedIn / endedConfirmed : null,
    noShowRate: endedConfirmed > 0 ? (endedConfirmed - endedCheckedIn) / endedConfirmed : null,
    spark: {
      rsvps: recent.map((e) => e.confirmed),
      waitlisted: recent.map((e) => e.waitlisted),
      checkedIn: recent.map((e) => e.checkedIn),
      noShowRate: recent.filter((e) => ends(e) <= now).map((e) => Math.round(noShowOf(e) * 100)),
    },
    topEvents: started
      .filter((e) => e.checkedIn > 0)
      .sort((a, b) => b.checkedIn - a.checkedIn)
      .slice(0, 5)
      .map((event) => ({ event, turnout: event.confirmed > 0 ? event.checkedIn / event.confirmed : 0 })),
    trend: recent,
  };
}

/**
 * Compares the latest event with the average of the events before it: "+12% vs. average event".
 * Null when there aren't two events to compare yet.
 */
export function changeVsAverage(values: number[], higherIsGood = true): KpiChange | null {
  if (values.length < 2) return null;
  const previous = values.slice(0, -1);
  const average = previous.reduce((a, b) => a + b, 0) / previous.length;
  if (average === 0) return null;
  const percent = Math.round(((values[values.length - 1] - average) / average) * 100);
  return describeChange(percent, '%', higherIsGood);
}

/** The same for values that are already percentages (like no-show rate), in percentage points. */
export function pointsVsAverage(values: number[], higherIsGood = true): KpiChange | null {
  if (values.length < 2) return null;
  const previous = values.slice(0, -1);
  const average = previous.reduce((a, b) => a + b, 0) / previous.length;
  return describeChange(Math.round(values[values.length - 1] - average), ' pts', higherIsGood);
}

function describeChange(amount: number, unit: string, higherIsGood: boolean): KpiChange {
  if (amount === 0) return { text: 'Same as avg event', direction: 'flat', good: true };
  const direction = amount > 0 ? 'up' : 'down';
  const sign = amount > 0 ? '+' : '−';
  return {
    text: `${sign}${Math.abs(amount)}${unit} vs. avg event`,
    direction,
    good: (amount > 0) === higherIsGood,
  };
}
