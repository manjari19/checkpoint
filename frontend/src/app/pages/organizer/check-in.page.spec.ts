import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CheckInPage, RESULT_MS } from './check-in.page';

describe('CheckInPage', () => {
  afterEach(() => vi.useRealTimers());

  it('clears a welcome after two seconds so the next person can scan', async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(CheckInPage);
    fixture.componentRef.setInput('eventId', 'e1');
    fixture.detectChanges();
    http.expectOne('/api/events').flush([]);
    http.expectOne('/api/events/e1/stats').flush(null);

    const page = fixture.componentInstance as unknown as { onScan(code: string): Promise<void>; result(): unknown };
    const scan = page.onScan('code-123');
    http.expectOne('/api/events/e1/check-ins/ticket').flush({
      outcome: 'CHECKED_IN', message: '', rsvpId: 'r1', attendeeName: 'Ada Lovelace', checkedInAt: '2027-01-22T02:42:00Z', method: 'QR',
    });
    await scan;
    expect(page.result()).toMatchObject({ tone: 'success', title: 'Welcome, Ada' });

    vi.advanceTimersByTime(RESULT_MS.success - 1);
    expect(page.result()).not.toBeNull();
    vi.advanceTimersByTime(1);
    expect(page.result()).toBeNull();
  });
});
