package app.checkpoint.checkin;

import app.checkpoint.checkin.dto.CheckInResult;
import app.checkpoint.checkin.dto.CheckInResult.Outcome;
import app.checkpoint.event.Event;
import app.checkpoint.event.EventService;
import app.checkpoint.member.CardNumberHasher;
import app.checkpoint.member.Member;
import app.checkpoint.member.MemberRepository;
import app.checkpoint.organizer.CurrentOrganizer;
import app.checkpoint.rsvp.CheckInMethod;
import app.checkpoint.rsvp.Rsvp;
import app.checkpoint.rsvp.RsvpRepository;
import app.checkpoint.rsvp.RsvpStatus;
import java.time.Clock;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Checks attendees in at the door.
 *
 * <p>Check-in does not need the event lock: it never changes who holds a seat. Double scans are
 * handled by one conditional UPDATE (see RsvpRepository.markCheckedIn), so two phones scanning the same
 * ticket at the same moment produce exactly one CHECKED_IN and one ALREADY_CHECKED_IN.
 */
@Service
public class CheckInService {

    private final EventService events;
    private final RsvpRepository rsvps;
    private final MemberRepository members;
    private final CardNumberHasher hasher;
    private final Clock clock;

    public CheckInService(EventService events, RsvpRepository rsvps, MemberRepository members,
                          CardNumberHasher hasher, Clock clock) {
        this.events = events;
        this.rsvps = rsvps;
        this.members = members;
        this.hasher = hasher;
        this.clock = clock;
    }

    @Transactional
    public CheckInResult byTicket(CurrentOrganizer me, UUID eventId, String ticketCode) {
        Event event = events.requireOwnEvent(me, eventId);
        Optional<Rsvp> found = rsvps.findByTicketCode(ticketCode.trim())
                .filter(r -> r.getEvent().getClub().getId().equals(me.clubId()));
        if (found.isEmpty()) {
            return CheckInResult.of(Outcome.NOT_FOUND, "This QR code isn't a ticket for any of your events.");
        }
        Rsvp rsvp = found.get();
        if (!rsvp.getEvent().getId().equals(event.getId())) {
            return CheckInResult.of(Outcome.WRONG_EVENT,
                    "This ticket is for a different event: " + rsvp.getEvent().getTitle() + ".");
        }
        return checkIn(rsvp, CheckInMethod.QR);
    }

    @Transactional
    public CheckInResult byCard(CurrentOrganizer me, UUID eventId, String cardNumber) {
        Event event = events.requireOwnEvent(me, eventId);
        String hash;
        try {
            hash = hasher.hash(cardNumber);
        } catch (IllegalArgumentException e) {
            return CheckInResult.of(Outcome.NOT_FOUND, e.getMessage());
        }
        Optional<Member> member = members.findByClubIdAndCardHash(me.clubId(), hash);
        if (member.isEmpty()) {
            return CheckInResult.of(Outcome.NOT_FOUND,
                    "This card isn't linked to anyone yet. Scan their QR ticket or find them in the attendee list.");
        }
        Optional<Rsvp> rsvp = rsvps.findByEventIdAndMemberIdAndStatusNot(event.getId(), member.get().getId(),
                RsvpStatus.CANCELLED);
        if (rsvp.isEmpty()) {
            return CheckInResult.of(Outcome.NO_RSVP, member.get().getName() + " doesn't have an RSVP for this event.");
        }
        return checkIn(rsvp.get(), CheckInMethod.CARD);
    }

    /** Fallback for attendees without their phone or card: an organizer picks them from the list. */
    @Transactional
    public CheckInResult manually(CurrentOrganizer me, UUID eventId, UUID rsvpId) {
        Event event = events.requireOwnEvent(me, eventId);
        return rsvps.findById(rsvpId)
                .filter(r -> r.getEvent().getId().equals(event.getId()))
                .map(r -> checkIn(r, CheckInMethod.MANUAL))
                .orElseGet(() -> CheckInResult.of(Outcome.NOT_FOUND, "RSVP not found for this event."));
    }

    private CheckInResult checkIn(Rsvp rsvp, CheckInMethod method) {
        UUID rsvpId = rsvp.getId();
        int changed = rsvps.markCheckedIn(rsvpId, clock.instant().truncatedTo(ChronoUnit.MICROS), method);
        // markCheckedIn clears the persistence context, so this reads the row as it is now in the database.
        Rsvp current = rsvps.findById(rsvpId).orElseThrow();
        String name = current.getMember().getName();

        if (changed == 1) {
            return new CheckInResult(Outcome.CHECKED_IN, name + " is checked in.", rsvpId, name,
                    current.getCheckedInAt(), method);
        }
        if (current.isCheckedIn()) {
            return new CheckInResult(Outcome.ALREADY_CHECKED_IN, name + " is already checked in.", rsvpId, name,
                    current.getCheckedInAt(), current.getCheckInMethod());
        }
        String reason = current.getStatus() == RsvpStatus.WAITLISTED
                ? " is on the waitlist and doesn't have a confirmed seat."
                : " cancelled their RSVP.";
        return new CheckInResult(Outcome.NOT_CONFIRMED, name + reason, rsvpId, name, null, null);
    }
}
