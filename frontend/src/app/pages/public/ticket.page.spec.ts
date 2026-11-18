import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Ticket } from '../../core/models';
import { TicketPage } from './ticket.page';

/** Lets an awaited HTTP call inside the component finish, then waits for the page to re-render. */
async function settle(fixture: { whenStable(): Promise<unknown> }): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}

const ticket: Ticket = {
  manageToken: 'tok', status: 'CONFIRMED', waitlistPosition: null, ticketCode: 'code-123', checkedInAt: null,
  attendeeName: 'Ada Lovelace', attendeeEmail: 'ada@example.com', cardLinked: false, sponsorOptIn: false,
  eventId: 'e1', eventTitle: 'Networking Night', eventStartsAt: '2027-01-22T02:00:00Z',
  eventEndsAt: '2027-01-22T05:00:00Z', eventLocation: 'SFU Burnaby', cancellable: true,
};

describe('TicketPage', () => {
  let http: HttpTestingController;

  async function render(value: Ticket) {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])] });
    http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(TicketPage);
    fixture.componentRef.setInput('token', 'tok');
    // Render once so the page requests its data. whenStable() here would wait for that request forever.
    fixture.detectChanges();
    http.expectOne('/api/public/tickets/tok').flush(value);
    await fixture.whenStable();
    return fixture;
  }

  const buttonWithText = (root: HTMLElement, text: string) =>
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.includes(text)) as HTMLButtonElement;

  it('asks for confirmation before cancelling', async () => {
    const fixture = await render(ticket);
    const el: HTMLElement = fixture.nativeElement;

    buttonWithText(el, 'Cancel RSVP').click();
    await fixture.whenStable();
    http.expectNone('/api/public/tickets/tok/cancel');
    expect(el.textContent).toContain('Your seat goes to the next person on the waitlist.');

    buttonWithText(el, 'Yes, cancel').click();
    await fixture.whenStable();
    http.expectOne('/api/public/tickets/tok/cancel').flush({ ...ticket, status: 'CANCELLED', ticketCode: null, cancellable: false });
    await settle(fixture);
    expect(el.textContent).toContain('This RSVP is cancelled.');
    expect(el.textContent).toContain('RSVP again');
  });

  it('keeps the spot when the member changes their mind', async () => {
    const fixture = await render(ticket);
    const el: HTMLElement = fixture.nativeElement;
    buttonWithText(el, 'Cancel RSVP').click();
    await fixture.whenStable();
    buttonWithText(el, 'Keep my spot').click();
    await fixture.whenStable();
    expect(buttonWithText(el, 'Cancel RSVP')).toBeTruthy();
  });

  it('shows the waitlist position instead of a QR code', async () => {
    const fixture = await render({ ...ticket, status: 'WAITLISTED', waitlistPosition: 4, ticketCode: null });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('app-qr-code')).toBeNull();
    expect(el.querySelector('.position')?.textContent).toContain('#4');
  });

  it('stamps a checked-in ticket', async () => {
    const fixture = await render({ ...ticket, checkedInAt: '2027-01-22T02:42:00Z', cancellable: false });
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ticket')?.classList).toContain('used');
    expect(el.querySelector('.stamp')?.textContent).toContain('Checked in');
  });
});
