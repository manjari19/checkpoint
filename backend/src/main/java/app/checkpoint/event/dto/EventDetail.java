package app.checkpoint.event.dto;

import app.checkpoint.event.Event;
import app.checkpoint.event.RsvpCounts;
import app.checkpoint.sponsor.dto.SponsorView;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** An event as the organizer sees it, including sponsor booth codes. */
public record EventDetail(
        UUID id,
        String title,
        String description,
        String location,
        Instant startsAt,
        Instant endsAt,
        int capacity,
        long confirmed,
        long waitlisted,
        long checkedIn,
        List<SponsorView> sponsors) {

    public static EventDetail of(Event event, RsvpCounts counts, List<SponsorView> sponsors) {
        return new EventDetail(event.getId(), event.getTitle(), event.getDescription(), event.getLocation(),
                event.getStartsAt(), event.getEndsAt(), event.getCapacity(),
                counts.getConfirmed(), counts.getWaitlisted(), counts.getCheckedIn(), sponsors);
    }
}
