import { EventSummary } from '../core/models';
import { eventStatus } from './event-card';

const base: EventSummary = {
  id: '1', title: 'Night', location: 'SFU', capacity: 10, category: 'SOCIAL',
  startsAt: '2027-01-22T02:00:00Z', endsAt: '2027-01-22T05:00:00Z', confirmed: 4, waitlisted: 0, checkedIn: 0,
};

describe('eventStatus', () => {
  it('describes open, full, live and ended events', () => {
    const before = new Date('2027-01-20T00:00:00Z');
    expect(eventStatus(base, before).label).toBe('Open');
    expect(eventStatus({ ...base, confirmed: 10, waitlisted: 3 }, before)).toEqual({ label: 'Full · 3 waiting', tone: 'warning' });
    expect(eventStatus(base, new Date('2027-01-22T03:00:00Z')).label).toBe('Happening now');
    expect(eventStatus(base, new Date('2027-01-23T00:00:00Z')).label).toBe('Ended');
  });
});
