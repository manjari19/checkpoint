import { CheckInResult, EventSummary } from '../../core/models';
import { describeCheckIn } from './check-in-result';
import { defaultCheckInEvent } from './check-in.page';
import { filterAttendees } from './event-dashboard.page';
import { attendanceRate } from './members.page';
import { changeVsAverage, overviewStats, pointsVsAverage } from './overview-stats';

function event(id: string, startsAt: string, extra: Partial<EventSummary> = {}): EventSummary {
  const end = new Date(new Date(startsAt).getTime() + 3 * 3600_000).toISOString();
  return { id, title: id, location: 'SFU', capacity: 20, category: 'SOCIAL', startsAt, endsAt: end,
    confirmed: 10, waitlisted: 0, checkedIn: 8, ...extra };
}

const result = (outcome: CheckInResult['outcome'], extra: Partial<CheckInResult> = {}): CheckInResult => ({
  outcome, message: 'Server message.', rsvpId: 'r', attendeeName: 'Ada Lovelace', checkedInAt: null, method: 'QR', ...extra,
});

describe('describeCheckIn', () => {
  it('welcomes by first name in green', () => {
    expect(describeCheckIn(result('CHECKED_IN'))).toMatchObject({ tone: 'success', title: 'Welcome, Ada' });
    expect(describeCheckIn(result('CHECKED_IN', { method: 'CARD' })).detail).toContain('student card');
  });

  it('shows the earlier check-in time in amber for a repeat scan', () => {
    const card = describeCheckIn(result('ALREADY_CHECKED_IN', { checkedInAt: '2027-01-22T02:42:00Z' }));
    expect(card.tone).toBe('warning');
    expect(card.title).toMatch(/^Already checked in at /);
  });

  it('says "Not on the list" in red for unknown codes and cards', () => {
    expect(describeCheckIn(result('NOT_FOUND'))).toMatchObject({ tone: 'danger', title: 'Not on the list', detail: 'Server message.' });
    expect(describeCheckIn(result('NO_RSVP')).title).toBe('Not on the list');
    expect(describeCheckIn(result('WRONG_EVENT')).title).toBe('Wrong event');
  });
});

describe('defaultCheckInEvent', () => {
  const past = event('past', '2027-01-01T02:00:00Z');
  const live = event('live', '2027-01-10T02:00:00Z');
  const next = event('next', '2027-02-01T02:00:00Z');

  it('prefers an event happening now, then the next one, then the latest', () => {
    expect(defaultCheckInEvent([past, live, next], new Date('2027-01-10T03:00:00Z'))?.id).toBe('live');
    expect(defaultCheckInEvent([past, live, next], new Date('2027-01-15T00:00:00Z'))?.id).toBe('next');
    expect(defaultCheckInEvent([past, live, next], new Date('2027-03-01T00:00:00Z'))?.id).toBe('next');
    expect(defaultCheckInEvent([], new Date())).toBeNull();
  });
});

describe('overviewStats', () => {
  it('adds up this term and ranks events by attendance', () => {
    const events = [
      event('sep', '2026-09-12T02:00:00Z', { confirmed: 20, checkedIn: 15 }),
      event('oct', '2026-10-10T02:00:00Z', { confirmed: 10, checkedIn: 5 }),
      event('summer', '2026-06-10T02:00:00Z', { confirmed: 40, checkedIn: 40 }),
      event('jan', '2027-01-22T02:00:00Z', { confirmed: 12, waitlisted: 6, checkedIn: 0 }),
    ];
    const stats = overviewStats(events, new Date('2026-11-17T12:00:00Z'));

    expect(stats.termLabel).toBe('Fall 2026');
    expect(stats.rsvps).toBe(30);
    expect(stats.checkedIn).toBe(20);
    expect(stats.waitlisted).toBe(6);
    // (30 confirmed - 20 checked in) / 30 confirmed
    expect(stats.noShowRate).toBeCloseTo(1 / 3);
    expect(stats.turnout).toBeCloseTo(2 / 3);
    expect(stats.eventsThisTerm).toBe(2);
    expect(stats.upcomingCount).toBe(1);
    expect(stats.nextEvent?.id).toBe('jan');
    expect(stats.topEvents.map((t) => t.event.id)).toEqual(['summer', 'sep', 'oct']);
    expect(stats.trend.map((e) => e.id)).toEqual(['summer', 'sep', 'oct']);
  });

  it('has no no-show rate before any event this term has ended', () => {
    expect(overviewStats([], new Date()).noShowRate).toBeNull();
  });

  it('compares the latest event with the average of the ones before', () => {
    // Average of 20 and 30 is 25; 30 is 20% higher.
    expect(changeVsAverage([20, 30, 30])).toEqual({ text: '+20% vs. avg event', direction: 'up', good: true });
    expect(changeVsAverage([5])).toBeNull();
    expect(changeVsAverage([0, 0, 4])).toBeNull();
    // For no-shows, going down is good news.
    expect(pointsVsAverage([30, 20, 18], false)).toEqual({ text: '−7 pts vs. avg event', direction: 'down', good: true });
    expect(pointsVsAverage([10, 10], false)?.direction).toBe('flat');
  });
});

describe('filterAttendees and attendanceRate', () => {
  const rows = [
    { name: 'Ada Lovelace', email: 'ada@example.com', status: 'CONFIRMED' },
    { name: 'Grace Hopper', email: 'grace@example.com', status: 'WAITLISTED' },
  ] as never[];

  it('filters by status and searches name and email', () => {
    expect(filterAttendees(rows, 'WAITLISTED', '')).toHaveLength(1);
    expect(filterAttendees(rows, 'all', 'GRACE@')).toHaveLength(1);
    expect(filterAttendees(rows, 'CONFIRMED', 'grace')).toHaveLength(0);
  });

  it('computes attendance out of decided events', () => {
    expect(attendanceRate({ attended: 3, noShows: 1 } as never)).toBe(0.75);
    expect(attendanceRate({ attended: 0, noShows: 0 } as never)).toBeNull();
  });
});
