package app.checkpoint.report.dto;

import app.checkpoint.rsvp.RsvpStatus;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** One member's RSVPs across all of the club's events, newest first. */
public record MemberHistory(UUID id, String name, String email, boolean cardLinked, long attended, long noShows,
                            List<Entry> events) {

    public enum Outcome {
        ATTENDED, NO_SHOW, UPCOMING, WAITLISTED, CANCELLED
    }

    public record Entry(UUID eventId, String eventTitle, Instant eventStartsAt, RsvpStatus status,
                        Instant checkedInAt, Outcome outcome) {
    }
}
