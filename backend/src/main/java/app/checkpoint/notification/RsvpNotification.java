package app.checkpoint.notification;

import app.checkpoint.rsvp.Rsvp;
import java.time.Instant;

/**
 * "Send this person an email about their RSVP." Published inside a transaction and handled by
 * EmailNotifier after that transaction commits.
 *
 * <p>It carries every value the email needs, copied while the transaction is open. The email is sent on
 * another thread later, so it must not depend on lazy-loaded entities or re-read the database.
 */
public record RsvpNotification(
        Kind kind,
        String recipientEmail,
        String recipientName,
        String eventTitle,
        Instant eventStartsAt,
        String eventLocation,
        String manageToken,
        Integer waitlistPosition) {

    public enum Kind {
        CONFIRMED,
        WAITLISTED,
        PROMOTED,
        CANCELLED
    }

    public static RsvpNotification of(Kind kind, Rsvp rsvp, Integer waitlistPosition) {
        return new RsvpNotification(kind,
                rsvp.getMember().getEmail(),
                rsvp.getMember().getName(),
                rsvp.getEvent().getTitle(),
                rsvp.getEvent().getStartsAt(),
                rsvp.getEvent().getLocation(),
                rsvp.getManageToken(),
                waitlistPosition);
    }
}
