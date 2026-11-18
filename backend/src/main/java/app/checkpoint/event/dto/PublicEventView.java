package app.checkpoint.event.dto;

import app.checkpoint.event.EventCategory;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * What anyone with the RSVP link can see. No attendee data, no booth codes.
 *
 * @param spotsLeft  free confirmed seats; 0 means new RSVPs join the waitlist
 * @param rsvpOpen   false once the event has started
 */
public record PublicEventView(
        UUID id,
        String clubName,
        String title,
        String description,
        String location,
        Instant startsAt,
        Instant endsAt,
        int capacity,
        EventCategory category,
        long spotsLeft,
        long waitlistLength,
        boolean rsvpOpen,
        List<String> sponsors) {
}
