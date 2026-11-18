import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AttendeeRow,
  BoothScanResult,
  BoothView,
  CheckInResult,
  ClubSummary,
  EventDetail,
  EventRequest,
  EventStats,
  EventSummary,
  MemberHistory,
  MemberSummary,
  PublicEvent,
  RsvpRequest,
  Sponsor,
  SponsorOverview,
  Ticket,
} from './models';

/**
 * Every call to the backend, in one place. All URLs are relative (/api/...), so the browser sends them
 * to the same origin as the app. In development the Angular dev server proxies them to the API; in
 * Docker, nginx does.
 */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  // Organizer: events
  events(): Observable<EventSummary[]> {
    return this.http.get<EventSummary[]>('/api/events');
  }

  event(id: string): Observable<EventDetail> {
    return this.http.get<EventDetail>(`/api/events/${id}`);
  }

  createEvent(request: EventRequest): Observable<EventDetail> {
    return this.http.post<EventDetail>('/api/events', request);
  }

  updateEvent(id: string, request: EventRequest): Observable<EventDetail> {
    return this.http.put<EventDetail>(`/api/events/${id}`, request);
  }

  attendees(eventId: string): Observable<AttendeeRow[]> {
    return this.http.get<AttendeeRow[]>(`/api/events/${eventId}/rsvps`);
  }

  stats(eventId: string): Observable<EventStats> {
    return this.http.get<EventStats>(`/api/events/${eventId}/stats`);
  }

  addSponsor(eventId: string, name: string): Observable<Sponsor> {
    return this.http.post<Sponsor>(`/api/events/${eventId}/sponsors`, { name });
  }

  removeSponsor(eventId: string, sponsorId: string): Observable<void> {
    return this.http.delete<void>(`/api/events/${eventId}/sponsors/${sponsorId}`);
  }

  sponsors(): Observable<SponsorOverview[]> {
    return this.http.get<SponsorOverview[]>('/api/sponsors');
  }

  // Organizer: check-in
  checkInByTicket(eventId: string, ticketCode: string): Observable<CheckInResult> {
    return this.http.post<CheckInResult>(`/api/events/${eventId}/check-ins/ticket`, { ticketCode });
  }

  checkInByCard(eventId: string, cardNumber: string): Observable<CheckInResult> {
    return this.http.post<CheckInResult>(`/api/events/${eventId}/check-ins/card`, { cardNumber });
  }

  checkInManually(eventId: string, rsvpId: string): Observable<CheckInResult> {
    return this.http.post<CheckInResult>(`/api/events/${eventId}/check-ins/rsvp/${rsvpId}`, {});
  }

  // Organizer: members and reports
  members(term?: string): Observable<MemberSummary[]> {
    return this.http.get<MemberSummary[]>('/api/members', { params: termParams(term) });
  }

  member(id: string): Observable<MemberHistory> {
    return this.http.get<MemberHistory>(`/api/members/${id}`);
  }

  unlinkCard(memberId: string): Observable<void> {
    return this.http.delete<void>(`/api/members/${memberId}/card`);
  }

  clubSummary(term?: string): Observable<ClubSummary> {
    return this.http.get<ClubSummary>('/api/reports/summary', { params: termParams(term) });
  }

  // Public: no login needed
  publicEvent(id: string): Observable<PublicEvent> {
    return this.http.get<PublicEvent>(`/api/public/events/${id}`);
  }

  rsvp(eventId: string, request: RsvpRequest): Observable<Ticket> {
    return this.http.post<Ticket>(`/api/public/events/${eventId}/rsvps`, request);
  }

  ticket(token: string): Observable<Ticket> {
    return this.http.get<Ticket>(`/api/public/tickets/${token}`);
  }

  cancelTicket(token: string): Observable<Ticket> {
    return this.http.post<Ticket>(`/api/public/tickets/${token}/cancel`, {});
  }

  booth(code: string): Observable<BoothView> {
    return this.http.get<BoothView>(`/api/booth/${code}`);
  }

  boothScan(code: string, ticketCode: string): Observable<BoothScanResult> {
    return this.http.post<BoothScanResult>(`/api/booth/${code}/scans`, { ticketCode });
  }
}

/** Download links for CSV exports. Plain links work because the browser sends the session cookie. */
export const exportUrls = {
  attendance: (term?: string) => `/api/reports/attendance.csv${term ? `?term=${encodeURIComponent(term)}` : ''}`,
  attendees: (eventId: string) => `/api/events/${eventId}/attendees.csv`,
  sponsorContacts: (eventId: string) => `/api/events/${eventId}/sponsor-leads.csv`,
};

function termParams(term?: string): HttpParams {
  return term ? new HttpParams().set('term', term) : new HttpParams();
}

/**
 * Turns an HTTP error into a sentence for the user. The backend answers with RFC 9457 problem details,
 * whose "detail" field is already written for people.
 */
export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return "Can't reach the server. Check your connection and try again.";
    }
    const detail = error.error?.detail;
    if (typeof detail === 'string' && detail.length > 0) {
      return detail;
    }
  }
  return fallback;
}

/** Field errors from a 400 validation response, keyed by field name. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (error instanceof HttpErrorResponse && error.status === 400 && error.error?.errors) {
    return error.error.errors as Record<string, string>;
  }
  return {};
}
