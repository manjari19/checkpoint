// TypeScript shapes of the backend's JSON. Field names match the Java DTO records exactly.
// Dates arrive as ISO-8601 strings (Java Instant).

export type RsvpStatus = 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED';
export type CheckInMethod = 'QR' | 'CARD' | 'MANUAL';
export type EventCategory = 'NETWORKING' | 'WORKSHOP' | 'PANEL' | 'SOCIAL' | 'HACKATHON' | 'OTHER';

export const EVENT_CATEGORIES: { value: EventCategory; label: string }[] = [
  { value: 'NETWORKING', label: 'Networking' },
  { value: 'WORKSHOP', label: 'Workshop' },
  { value: 'PANEL', label: 'Panel' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'HACKATHON', label: 'Hackathon' },
  { value: 'OTHER', label: 'Other' },
];

export function categoryLabel(category: EventCategory): string {
  return EVENT_CATEGORIES.find((c) => c.value === category)?.label ?? 'Other';
}

export interface Organizer {
  id: string;
  clubId: string;
  clubName: string;
  email: string;
  displayName: string;
}

export interface EventSummary {
  id: string;
  title: string;
  location: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  category: EventCategory;
  confirmed: number;
  waitlisted: number;
  checkedIn: number;
}

export interface Sponsor {
  id: string;
  name: string;
  boothCode: string;
  leadCount: number;
}

export interface EventDetail extends EventSummary {
  description: string;
  sponsors: Sponsor[];
}

export interface EventRequest {
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  category: EventCategory;
  sponsors?: string[];
}

export interface AttendeeRow {
  rsvpId: string;
  memberId: string;
  name: string;
  email: string;
  status: RsvpStatus;
  waitlistPosition: number | null;
  rsvpAt: string;
  promotedAt: string | null;
  cancelledAt: string | null;
  checkedInAt: string | null;
  checkInMethod: CheckInMethod | null;
  sponsorOptIn: boolean;
  cardLinked: boolean;
}

export interface TimelinePoint {
  bucketStart: string;
  checkIns: number;
  cumulative: number;
}

export interface EventStats {
  eventId: string;
  capacity: number;
  confirmed: number;
  waitlisted: number;
  cancelled: number;
  checkedIn: number;
  checkedInByQr: number;
  checkedInByCard: number;
  noShows: number | null;
  noShowRate: number | null;
  eventStarted: boolean;
  eventEnded: boolean;
  bucketMinutes: number;
  timeline: TimelinePoint[];
}

export type CheckInOutcome =
  | 'CHECKED_IN'
  | 'ALREADY_CHECKED_IN'
  | 'NOT_CONFIRMED'
  | 'WRONG_EVENT'
  | 'NOT_FOUND'
  | 'NO_RSVP';

export interface CheckInResult {
  outcome: CheckInOutcome;
  message: string;
  rsvpId: string | null;
  attendeeName: string | null;
  checkedInAt: string | null;
  method: CheckInMethod | null;
}

export interface SponsorOverview {
  id: string;
  name: string;
  boothCode: string;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  leadCount: number;
}

export interface MemberSummary {
  id: string;
  name: string;
  email: string;
  cardLinked: boolean;
  rsvps: number;
  attended: number;
  noShows: number;
  lastAttendedAt: string | null;
}

export type HistoryOutcome = 'ATTENDED' | 'NO_SHOW' | 'UPCOMING' | 'WAITLISTED' | 'CANCELLED';

export interface MemberHistory {
  id: string;
  name: string;
  email: string;
  cardLinked: boolean;
  attended: number;
  noShows: number;
  events: {
    eventId: string;
    eventTitle: string;
    eventStartsAt: string;
    status: RsvpStatus;
    checkedInAt: string | null;
    outcome: HistoryOutcome;
  }[];
}

export interface ClubSummary {
  termId: string;
  termLabel: string;
  eventCount: number;
  uniqueAttendees: number;
  totalCheckIns: number;
  trend: { eventId: string; title: string; startsAt: string; confirmed: number; checkedIn: number }[];
  terms: { id: string; label: string }[];
}

export interface PublicEvent {
  id: string;
  clubName: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  category: EventCategory;
  spotsLeft: number;
  waitlistLength: number;
  rsvpOpen: boolean;
  sponsors: string[];
}

export interface RsvpRequest {
  name: string;
  email: string;
  sponsorOptIn: boolean;
  studentCardNumber: string | null;
  cardConsent: boolean;
}

export interface Ticket {
  manageToken: string;
  status: RsvpStatus;
  waitlistPosition: number | null;
  ticketCode: string | null;
  checkedInAt: string | null;
  attendeeName: string;
  attendeeEmail: string;
  cardLinked: boolean;
  sponsorOptIn: boolean;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  eventEndsAt: string;
  eventLocation: string;
  cancellable: boolean;
}

export interface BoothLead {
  name: string;
  email: string;
  scannedAt: string;
}

export interface BoothView {
  sponsorName: string;
  eventTitle: string;
  eventStartsAt: string;
  eventLocation: string;
  leads: BoothLead[];
}

export interface BoothScanResult {
  outcome: 'SAVED' | 'ALREADY_SAVED' | 'NOT_OPTED_IN' | 'NOT_FOUND';
  message: string;
  lead: BoothLead | null;
}
