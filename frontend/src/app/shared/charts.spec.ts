import { TestBed } from '@angular/core/testing';
import { BarChart, barPath, niceMax } from './bar-chart';
import { sparklinePoints } from './sparkline';
import { splitAccent } from './accent-title';

describe('chart helpers', () => {
  it('rounds axis maximums up to tidy numbers', () => {
    expect(niceMax(0)).toBe(1);
    expect(niceMax(7)).toBe(10);
    expect(niceMax(13)).toBe(20);
    expect(niceMax(42)).toBe(50);
    expect(niceMax(100)).toBe(100);
  });

  it('draws bars anchored on the baseline and skips empty ones', () => {
    expect(barPath(10, 50, 20, 100)).toMatch(/^M10 100V/);
    expect(barPath(10, 100, 20, 100)).toBe('');
  });

  it('scales sparkline points to the box, highest value at the top', () => {
    const points = sparklinePoints([0, 10, 5], 100, 40, 0);
    expect(points).toEqual([[0, 40], [50, 0], [100, 20]]);
    expect(sparklinePoints([], 100, 40)).toEqual([]);
  });

  it('puts the accent on the last word of a headline', () => {
    expect(splitAccent('Networking Night')).toEqual({ lead: 'Networking ', accent: 'Night' });
    expect(splitAccent('Hackathon')).toEqual({ lead: '', accent: 'Hackathon' });
  });
});

describe('BarChart', () => {
  it('shows a legend for two series and can switch to a table', async () => {
    const fixture = TestBed.createComponent(BarChart);
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

  it('has no legend for a single series', async () => {
    const fixture = TestBed.createComponent(BarChart);
    fixture.componentRef.setInput('labels', ['6:00']);
    fixture.componentRef.setInput('series', [{ name: 'Check-ins', color: '#000', values: [4] }]);
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.legend')).toBeNull();
  });
});
