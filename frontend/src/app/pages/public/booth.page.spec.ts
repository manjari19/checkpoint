import { describeBoothScan } from './booth.page';

describe('describeBoothScan', () => {
  const lead = { name: 'Ada', email: 'ada@example.com', scannedAt: '2027-01-22T02:42:00Z' };

  it('confirms a saved contact', () => {
    expect(describeBoothScan({ outcome: 'SAVED', message: '', lead })).toMatchObject({ tone: 'success', title: 'Saved Ada' });
  });

  it('reveals nothing about attendees who did not opt in', () => {
    const card = describeBoothScan({ outcome: 'NOT_OPTED_IN', message: '', lead: null });
    expect(card.tone).toBe('danger');
    expect(card.detail).not.toContain('Ada');
  });

  it('flags repeat scans and foreign tickets', () => {
    expect(describeBoothScan({ outcome: 'ALREADY_SAVED', message: '', lead }).tone).toBe('warning');
    expect(describeBoothScan({ outcome: 'NOT_FOUND', message: 'Nope.', lead: null }).detail).toBe('Nope.');
  });
});
