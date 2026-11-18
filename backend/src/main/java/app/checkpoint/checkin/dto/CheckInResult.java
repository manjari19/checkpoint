package app.checkpoint.checkin.dto;

import app.checkpoint.rsvp.CheckInMethod;
import java.time.Instant;
import java.util.UUID;

/**
 * The result of one scan. Every scan returns 200 with an outcome, because "already checked in" or
 * "on the waitlist" are normal answers at the door, not errors. The scanner shows the message as is.
 */
public record CheckInResult(
        Outcome outcome,
        String message,
        UUID rsvpId,
        String attendeeName,
        Instant checkedInAt,
        CheckInMethod method) {

    public enum Outcome {
        /** Checked in by this scan. */
        CHECKED_IN,
        /** Was already checked in earlier; checkedInAt says when. */
        ALREADY_CHECKED_IN,
        /** The RSVP is waitlisted or cancelled. */
        NOT_CONFIRMED,
        /** A real ticket, but for another of the club's events. */
        WRONG_EVENT,
        /** No such ticket, or the card is not linked to any member. */
        NOT_FOUND,
        /** The card belongs to a member who has no RSVP for this event. */
        NO_RSVP
    }

    public static CheckInResult of(Outcome outcome, String message) {
        return new CheckInResult(outcome, message, null, null, null, null);
    }
}
