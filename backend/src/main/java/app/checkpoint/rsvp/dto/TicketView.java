package app.checkpoint.rsvp.dto;

import app.checkpoint.event.Event;
import app.checkpoint.rsvp.Rsvp;
import app.checkpoint.rsvp.RsvpStatus;
import java.time.Instant;
import java.util.UUID;

/**
 * Everything the ticket page shows. Only the person holding the manage link can see this.
 *
 * @param ticketCode the value to encode in the QR code; null unless the RSVP is confirmed
 * @param waitlistPosition 1-based; null unless the RSVP is waitlisted
 */
public record TicketView(
        String manageToken,
        RsvpStatus status,
        Integer waitlistPosition,
        String ticketCode,
        Instant checkedInAt,
        String attendeeName,
        String attendeeEmail,
        boolean cardLinked,
        boolean sponsorOptIn,
        UUID eventId,
        String eventTitle,
        Instant eventStartsAt,
        Instant eventEndsAt,
        String eventLocation,
        boolean cancellable) {

    public static TicketView of(Rsvp rsvp, Integer waitlistPosition, Instant now) {
        Event event = rsvp.getEvent();
        boolean cancellable = rsvp.getStatus() != RsvpStatus.CANCELLED && !rsvp.isCheckedIn() && !event.hasStarted(now);
        return new TicketView(
                rsvp.getManageToken(),
                rsvp.getStatus(),
                waitlistPosition,
                rsvp.getStatus() == RsvpStatus.CONFIRMED ? rsvp.getTicketCode() : null,
                rsvp.getCheckedInAt(),
                rsvp.getMember().getName(),
                rsvp.getMember().getEmail(),
                rsvp.getMember().hasCard(),
                rsvp.isSponsorOptIn(),
                event.getId(),
                event.getTitle(),
                event.getStartsAt(),
                event.getEndsAt(),
                event.getLocation(),
                cancellable);
    }
}
