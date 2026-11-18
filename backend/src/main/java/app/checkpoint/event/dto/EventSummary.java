package app.checkpoint.event.dto;

import app.checkpoint.event.Event;
import app.checkpoint.event.RsvpCounts;
import java.time.Instant;
import java.util.UUID;

/** One row in the organizer's event list. */
public record EventSummary(
        UUID id,
        String title,
        String location,
        Instant startsAt,
        Instant endsAt,
        int capacity,
        long confirmed,
        long waitlisted,
        long checkedIn) {

    public static EventSummary of(Event event, RsvpCounts counts) {
        return new EventSummary(event.getId(), event.getTitle(), event.getLocation(), event.getStartsAt(),
                event.getEndsAt(), event.getCapacity(),
                counts == null ? 0 : counts.getConfirmed(),
                counts == null ? 0 : counts.getWaitlisted(),
                counts == null ? 0 : counts.getCheckedIn());
    }
}
