package app.checkpoint.rsvp;

import app.checkpoint.common.ConflictException;
import app.checkpoint.common.NotFoundException;
import app.checkpoint.common.SecureTokens;
import app.checkpoint.event.Event;
import app.checkpoint.event.EventRepository;
import app.checkpoint.member.Member;
import app.checkpoint.member.MemberService;
import app.checkpoint.notification.RsvpNotification;
import app.checkpoint.notification.RsvpNotification.Kind;
import app.checkpoint.rsvp.dto.RsvpRequest;
import app.checkpoint.rsvp.dto.TicketView;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * RSVPs, cancellations and waitlist promotion.
 *
 * <h2>How seats stay correct under concurrency</h2>
 *
 * <p>The rule we must never break: an event never has more CONFIRMED RSVPs than its capacity, and a
 * freed seat always goes to the next person on the waitlist.
 *
 * <p>Every method here that can change who holds a seat starts by locking the event's row with
 * {@link EventRepository#findByIdForUpdate} (SELECT ... FOR UPDATE). Only one transaction can hold that
 * lock at a time, so for a given event these operations run one after another, never interleaved. A
 * second request for the same event simply waits at that line until the first one commits. Requests for
 * different events lock different rows and do not wait for each other.
 *
 * <p>Inside the lock, each step reads fresh data: PostgreSQL's default isolation level (READ COMMITTED)
 * gives every statement a new snapshot, so the seat count we read after getting the lock already
 * includes everything the previous lock holder committed.
 *
 * <p>Example: capacity 10, all 10 seats taken, and 3 people cancel at the same instant. The three cancel
 * transactions queue on the event lock. The first frees a seat and promotes 1 person (10 confirmed
 * again), then commits. The second does the same, then the third. Result: exactly 3 promoted.
 * Without the lock, all three could count "9 confirmed" at the same time and each promote enough people
 * to fill what they think are the open seats, overfilling the event.
 */
@Service
public class RsvpService {

    private static final Set<RsvpStatus> ACTIVE = EnumSet.of(RsvpStatus.CONFIRMED, RsvpStatus.WAITLISTED);

    private final EventRepository events;
    private final RsvpRepository rsvps;
    private final MemberService members;
    private final SecureTokens tokens;
    private final ApplicationEventPublisher publisher;
    private final Clock clock;

    public RsvpService(EventRepository events, RsvpRepository rsvps, MemberService members, SecureTokens tokens,
                       ApplicationEventPublisher publisher, Clock clock) {
        this.events = events;
        this.rsvps = rsvps;
        this.members = members;
        this.tokens = tokens;
        this.publisher = publisher;
        this.clock = clock;
    }

    /** Creates an RSVP: a confirmed seat if one is free, otherwise a place at the end of the waitlist. */
    @Transactional
    public TicketView rsvp(UUID eventId, RsvpRequest request) {
        // 1. Lock the event. Any other RSVP or cancel for this event now waits until we commit.
        Event event = events.findByIdForUpdate(eventId)
                .orElseThrow(() -> new NotFoundException("Event not found."));
        // Read the time after getting the lock, so waitlist order matches the order requests got the lock.
        Instant now = now();
        if (event.hasStarted(now)) {
            throw new ConflictException("RSVPs for this event are closed because it has already started.");
        }

        Member member = members.findOrCreate(event.getClub().getId(), request.email(), request.name());
        if (request.hasCardNumber()) {
            members.linkCard(member, request.studentCardNumber(), now);
        }
        if (rsvps.existsByEventIdAndMemberIdAndStatusIn(eventId, member.getId(), ACTIVE)) {
            throw new ConflictException(
                    "This email already has an RSVP for this event. Check your inbox for your ticket link.");
        }

        // 2. Count confirmed seats while holding the lock. Nobody else can change this count before we insert.
        long confirmed = rsvps.countByEventIdAndStatus(eventId, RsvpStatus.CONFIRMED);
        RsvpStatus status = confirmed < event.getCapacity() ? RsvpStatus.CONFIRMED : RsvpStatus.WAITLISTED;

        Rsvp rsvp = rsvps.save(new Rsvp(event, member, status, tokens.longToken(), tokens.shortToken(),
                request.sponsorOptIn(), now));

        Integer position = status == RsvpStatus.WAITLISTED ? positionOf(rsvp) : null;
        publisher.publishEvent(RsvpNotification.of(
                status == RsvpStatus.CONFIRMED ? Kind.CONFIRMED : Kind.WAITLISTED, rsvp, position));
        return TicketView.of(rsvp, position, now);
    }

    /**
     * Cancels the RSVP behind a ticket link. If it held a seat, the next person on the waitlist is promoted.
     * Cancelling twice is harmless: the second call just returns the cancelled ticket.
     */
    @Transactional
    public TicketView cancel(String manageToken) {
        // Find which event this ticket belongs to without loading the RSVP yet. If we loaded it now,
        // before the lock, we could act on a stale copy (for example, it was promoted a moment ago).
        UUID eventId = rsvps.findEventIdByManageToken(manageToken)
                .orElseThrow(() -> new NotFoundException("Ticket not found."));

        // 1. Lock the event, exactly like rsvp() does.
        Event event = events.findByIdForUpdate(eventId).orElseThrow();
        // 2. Lock the RSVP row too. Check-in does not take the event lock, so this stops a check-in from
        //    landing between our "is it checked in?" test and the cancel.
        Rsvp rsvp = rsvps.findByManageTokenForUpdate(manageToken).orElseThrow();
        Instant now = now();

        if (rsvp.getStatus() == RsvpStatus.CANCELLED) {
            return TicketView.of(rsvp, null, now);
        }
        if (rsvp.isCheckedIn()) {
            throw new ConflictException("You're already checked in, so this RSVP can't be cancelled.");
        }
        if (event.hasStarted(now)) {
            throw new ConflictException("This event has already started, so RSVPs can no longer be cancelled.");
        }

        boolean heldSeat = rsvp.getStatus() == RsvpStatus.CONFIRMED;
        rsvp.cancel(now);
        publisher.publishEvent(RsvpNotification.of(Kind.CANCELLED, rsvp, null));

        if (heldSeat) {
            fillOpenSeats(event, now);
        }
        return TicketView.of(rsvp, null, now);
    }

    /**
     * Promotes people from the front of the waitlist until the event is full or the waitlist is empty.
     * Used after a cancellation and after an organizer raises the capacity.
     *
     * <p>The caller must already hold the event lock from {@link EventRepository#findByIdForUpdate}.
     * Propagation.MANDATORY makes Spring throw if this is called outside a transaction, which would mean
     * no lock is held.
     *
     * @return the RSVPs that were promoted
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public List<Rsvp> fillOpenSeats(Event event, Instant now) {
        // This count runs after the cancel above: Hibernate flushes pending changes before a query, so the
        // just-cancelled RSVP is no longer counted as confirmed.
        long confirmed = rsvps.countByEventIdAndStatus(event.getId(), RsvpStatus.CONFIRMED);
        long openSeats = event.getCapacity() - confirmed;
        if (openSeats <= 0) {
            return List.of();
        }
        List<Rsvp> promoted = rsvps.findWaitlist(event.getId(), Limit.of((int) openSeats));
        for (Rsvp rsvp : promoted) {
            rsvp.promote(now);
            publisher.publishEvent(RsvpNotification.of(Kind.PROMOTED, rsvp, null));
        }
        return promoted;
    }

    @Transactional(readOnly = true)
    public TicketView getTicket(String manageToken) {
        Rsvp rsvp = rsvps.findByManageToken(manageToken)
                .orElseThrow(() -> new NotFoundException("Ticket not found."));
        Integer position = rsvp.getStatus() == RsvpStatus.WAITLISTED ? positionOf(rsvp) : null;
        return TicketView.of(rsvp, position, now());
    }

    private int positionOf(Rsvp rsvp) {
        return rsvps.waitlistPosition(rsvp.getEvent().getId(), rsvp.getCreatedAt(), rsvp.getId());
    }

    /** PostgreSQL stores microseconds, so drop the nanoseconds to keep the in-memory value equal to the stored one. */
    private Instant now() {
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }
}
