package app.checkpoint.event.dto;

import app.checkpoint.rsvp.CheckInMethod;
import app.checkpoint.rsvp.Rsvp;
import app.checkpoint.rsvp.RsvpStatus;
import java.time.Instant;
import java.util.UUID;

/** One RSVP in the organizer's attendee list for an event. */
public record AttendeeRow(
        UUID rsvpId,
        UUID memberId,
        String name,
        String email,
        RsvpStatus status,
        Integer waitlistPosition,
        Instant rsvpAt,
        Instant promotedAt,
        Instant cancelledAt,
        Instant checkedInAt,
        CheckInMethod checkInMethod,
        boolean sponsorOptIn,
        boolean cardLinked) {

    public static AttendeeRow of(Rsvp rsvp, Integer waitlistPosition) {
        return new AttendeeRow(rsvp.getId(), rsvp.getMember().getId(), rsvp.getMember().getName(),
                rsvp.getMember().getEmail(), rsvp.getStatus(), waitlistPosition, rsvp.getCreatedAt(),
                rsvp.getPromotedAt(), rsvp.getCancelledAt(), rsvp.getCheckedInAt(), rsvp.getCheckInMethod(),
                rsvp.isSponsorOptIn(), rsvp.getMember().hasCard());
    }
}
