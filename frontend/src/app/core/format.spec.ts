import { dateBlock, firstName, formatPercent, fromLocalInput, greeting, termOf, toLocalInput } from './format';

describe('format', () => {
  it('maps dates to SFU terms', () => {
    expect(termOf(new Date(2027, 0, 21)).id).toBe('2027-spring');
    expect(termOf(new Date(2027, 4, 1)).label).toBe('Summer 2027');
    expect(termOf(new Date(2026, 11, 31)).id).toBe('2026-fall');
    expect(termOf(new Date(2026, 8, 1)).start).toEqual(new Date(2026, 8, 1));
    expect(termOf(new Date(2026, 8, 1)).end).toEqual(new Date(2027, 0, 1));
  });

  it('greets by time of day', () => {
    expect(greeting(8)).toBe('Good morning');
    expect(greeting(13)).toBe('Good afternoon');
    expect(greeting(19)).toBe('Good evening');
  });

  it('takes the first name and handles missing names', () => {
    expect(firstName('Ada Lovelace')).toBe('Ada');
    expect(firstName('  Grace  ')).toBe('Grace');
    expect(firstName(null)).toBe('');
  });

  it('formats percentages and missing values', () => {
    expect(formatPercent(0.256)).toBe('26%');
    expect(formatPercent(null)).toBe('–');
  });

  it('splits a date into day and month for the date block', () => {
    const block = dateBlock(new Date(2027, 0, 21, 19).toISOString());
    expect(block.day).toBe('21');
    expect(block.month.toLowerCase()).toContain('jan');
  });

  it('round-trips datetime-local values', () => {
    const iso = new Date(2027, 0, 21, 19, 30).toISOString();
    expect(toLocalInput(iso)).toBe('2027-01-21T19:30');
    expect(fromLocalInput('2027-01-21T19:30')).toBe(iso);
  });
});
