package app.checkpoint.rsvp;

public enum RsvpStatus {
    /** Holds one of the event's seats. */
    CONFIRMED,
    /** Waiting for a seat, in order of when they RSVP'd. */
    WAITLISTED,
    /** Gave up their seat or waitlist spot. Kept for history. */
    CANCELLED
}
