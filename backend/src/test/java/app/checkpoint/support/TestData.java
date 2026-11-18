package app.checkpoint.support;

import app.checkpoint.club.Club;
import app.checkpoint.club.ClubRepository;
import app.checkpoint.common.SecureTokens;
import app.checkpoint.event.Event;
import app.checkpoint.event.EventRepository;
import app.checkpoint.member.Member;
import app.checkpoint.member.MemberService;
import app.checkpoint.organizer.CurrentOrganizer;
import app.checkpoint.organizer.Organizer;
import app.checkpoint.organizer.OrganizerRepository;
import app.checkpoint.rsvp.CheckInMethod;
import app.checkpoint.rsvp.Rsvp;
import app.checkpoint.rsvp.RsvpRepository;
import app.checkpoint.rsvp.RsvpStatus;
import app.checkpoint.rsvp.dto.RsvpRequest;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.springframework.boot.test.context.TestComponent;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

/**
 * Creates test data. Every test makes its own club, so tests never see each other's data
 * and do not need to clean the database.
 */
@TestComponent
public class TestData {

    public static final String PASSWORD = "correct-horse-battery";

    private final ClubRepository clubs;
    private final OrganizerRepository organizers;
    private final EventRepository events;
    private final RsvpRepository rsvps;
    private final MemberService members;
    private final SecureTokens tokens;
    private final PasswordEncoder passwordEncoder;

    public TestData(ClubRepository clubs, OrganizerRepository organizers, EventRepository events,
                    RsvpRepository rsvps, MemberService members, SecureTokens tokens,
                    PasswordEncoder passwordEncoder) {
        this.clubs = clubs;
        this.organizers = organizers;
        this.events = events;
        this.rsvps = rsvps;
        this.members = members;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public CurrentOrganizer newClub() {
        String suffix = shortId();
        Club club = clubs.save(new Club("Test Club " + suffix));
        Organizer organizer = organizers.save(new Organizer(club, "organizer-" + suffix + "@test.local",
                passwordEncoder.encode(PASSWORD), "Organizer " + suffix));
        return new CurrentOrganizer(organizer.getId(), club.getId(), club.getName(), organizer.getEmail(),
                organizer.getDisplayName());
    }

    /** An event a month from now, so RSVPs and cancellations are open. */
    @Transactional
    public Event upcomingEvent(CurrentOrganizer me, int capacity) {
        Instant start = Instant.now().plus(Duration.ofDays(30));
        return eventAt(me, capacity, start);
    }

    /** An event that has already ended. */
    @Transactional
    public Event pastEvent(CurrentOrganizer me, int capacity, Instant start) {
        return eventAt(me, capacity, start);
    }

    private Event eventAt(CurrentOrganizer me, int capacity, Instant start) {
        return events.save(new Event(clubs.getReferenceById(me.clubId()), "Event " + shortId(), "",
                "SFU Burnaby", start, start.plus(Duration.ofHours(3)), capacity));
    }

    /**
     * Inserts an RSVP directly, bypassing RsvpService. Used to set up history for events that have already
     * happened, which the service would refuse because RSVPs close when an event starts.
     */
    @Transactional
    public Rsvp rsvpDirectly(Event event, String email, RsvpStatus status, boolean checkedIn) {
        Event managed = events.getReferenceById(event.getId());
        Member member = members.findOrCreate(event.getClub().getId(), email, email.substring(0, email.indexOf('@')));
        Rsvp rsvp = rsvps.save(new Rsvp(managed, member, status, tokens.longToken(), tokens.shortToken(), false,
                event.getStartsAt().minus(Duration.ofDays(7))));
        if (checkedIn) {
            rsvps.markCheckedIn(rsvp.getId(), event.getStartsAt().plus(Duration.ofMinutes(10)), CheckInMethod.QR);
        }
        return rsvp;
    }

    public static RsvpRequest rsvpRequest(String name) {
        return new RsvpRequest(name, name.toLowerCase().replace(' ', '.') + "-" + shortId() + "@test.local",
                false, null, false);
    }

    public static RsvpRequest rsvpRequest(String name, boolean sponsorOptIn, String cardNumber) {
        return new RsvpRequest(name, name.toLowerCase().replace(' ', '.') + "-" + shortId() + "@test.local",
                sponsorOptIn, cardNumber, cardNumber != null);
    }

    private static String shortId() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
