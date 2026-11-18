package app.checkpoint.rsvp;

import app.checkpoint.event.Event;
import app.checkpoint.member.Member;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import java.time.Instant;
import java.util.UUID;

/**
 * One member's RSVP to one event.
 *
 * <p>The status changes are methods on the entity (promote, cancel) so the allowed transitions live
 * in one place. Callers must hold the event lock before calling them; RsvpService does that.
 */
@Entity
public class Rsvp {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Event event;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Member member;

    @Enumerated(EnumType.STRING)
    private RsvpStatus status;

    private String manageToken;

    private String ticketCode;

    private boolean sponsorOptIn;

    private Instant createdAt;

    private Instant promotedAt;

    private Instant cancelledAt;

    private Instant checkedInAt;

    @Enumerated(EnumType.STRING)
    private CheckInMethod checkInMethod;

    protected Rsvp() {
    }

    public Rsvp(Event event, Member member, RsvpStatus status, String manageToken, String ticketCode,
                boolean sponsorOptIn, Instant now) {
        if (status == RsvpStatus.CANCELLED) {
            throw new IllegalArgumentException("A new RSVP cannot start cancelled");
        }
        this.event = event;
        this.member = member;
        this.status = status;
        this.manageToken = manageToken;
        this.ticketCode = ticketCode;
        this.sponsorOptIn = sponsorOptIn;
        this.createdAt = now;
    }

    /** Moves a waitlisted RSVP into a confirmed seat. */
    public void promote(Instant now) {
        if (status != RsvpStatus.WAITLISTED) {
            throw new IllegalStateException("Only waitlisted RSVPs can be promoted, this one is " + status);
        }
        status = RsvpStatus.CONFIRMED;
        promotedAt = now;
    }

    public void cancel(Instant now) {
        if (checkedInAt != null) {
            throw new IllegalStateException("A checked-in RSVP cannot be cancelled");
        }
        status = RsvpStatus.CANCELLED;
        cancelledAt = now;
    }

    public boolean isCheckedIn() {
        return checkedInAt != null;
    }

    public UUID getId() {
        return id;
    }

    public Event getEvent() {
        return event;
    }

    public Member getMember() {
        return member;
    }

    public RsvpStatus getStatus() {
        return status;
    }

    public String getManageToken() {
        return manageToken;
    }

    public String getTicketCode() {
        return ticketCode;
    }

    public boolean isSponsorOptIn() {
        return sponsorOptIn;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getPromotedAt() {
        return promotedAt;
    }

    public Instant getCancelledAt() {
        return cancelledAt;
    }

    public Instant getCheckedInAt() {
        return checkedInAt;
    }

    public CheckInMethod getCheckInMethod() {
        return checkInMethod;
    }
}
