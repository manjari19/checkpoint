import { TestBed } from '@angular/core/testing';
import { Toasts } from '../core/toast';
import { avatarTint, initials } from './avatar';
import { Confetti } from './confetti';
import { CountUp } from './count-up';
import { LineChart } from './line-chart';
import { smoothPath, sparklinePoints } from './sparkline';

describe('smoothPath', () => {
  it('never curves past the highest or lowest point', () => {
    const points = sparklinePoints([0, 10, 0, 10], 120, 40, 0);
    const numbers = smoothPath(points).match(/-?\d+(\.\d+)?/g)!.map(Number);
    const ys = numbers.filter((_, i) => i % 2 === 1);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(40);
  });

  it('draws straight lines for one or two points', () => {
    expect(smoothPath([[0, 0], [10, 5]])).toBe('M0 0 L10 5');
    expect(smoothPath([])).toBe('');
  });
});

describe('avatars', () => {
  it('uses first and last initials', () => {
    expect(initials('Ada Lovelace')).toBe('AL');
    expect(initials('Grace Brewster Hopper')).toBe('GH');
    expect(initials('Cher')).toBe('CH');
  });

  it('gives the same person the same color every time', () => {
    expect(avatarTint('Ada Lovelace')).toBe(avatarTint('Ada Lovelace'));
  });
});

describe('CountUp', () => {
  it('shows a waitlist position as it is the first time, without counting up from zero', async () => {
    const fixture = TestBed.createComponent(CountUp);
    fixture.componentRef.setInput('value', 4);
    fixture.componentRef.setInput('startAtValue', true);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toBe('4');
  });

  it('shows a dash when there is no value', async () => {
    const fixture = TestBed.createComponent(CountUp);
    fixture.componentRef.setInput('value', null);
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toBe('–');
  });
});

describe('Toasts', () => {
  it('keeps at most three and can dismiss one', () => {
    const toasts = TestBed.inject(Toasts);
    ['one', 'two', 'three', 'four'].forEach((m) => toasts.show(m));
    expect(toasts.items().map((t) => t.message)).toEqual(['two', 'three', 'four']);
    toasts.dismiss(toasts.items()[0].id);
    expect(toasts.items().map((t) => t.message)).toEqual(['three', 'four']);
  });
});

describe('Confetti', () => {
  it('sends pieces out in every direction', () => {
    const pieces = Confetti.burst(20);
    expect(pieces).toHaveLength(20);
    expect(pieces.some((p) => p.x < 0) && pieces.some((p) => p.x > 0)).toBe(true);
  });
});

describe('LineChart', () => {
  it('shows a legend for two series and can switch to a table', async () => {
    const fixture = TestBed.createComponent(LineChart);
    fixture.componentRef.setInput('labels', ['Sep 12', 'Oct 3']);
    fixture.componentRef.setInput('series', [
      { name: 'Confirmed', color: '#000', values: [20, 15] },
      { name: 'Checked in', color: '#111', values: [16, 9] },
    ]);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.legend')?.textContent).toContain('Checked in');

    (el.querySelector('button.toggle') as HTMLButtonElement).click();
    await fixture.whenStable();
    const cells = Array.from(el.querySelectorAll('td')).map((td) => td.textContent?.trim());
    expect(cells).toEqual(['Sep 12', '20', '16', 'Oct 3', '15', '9']);
  });
});
