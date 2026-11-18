package app.checkpoint.event;

import app.checkpoint.club.ClubRepository;
import app.checkpoint.common.ConflictException;
import app.checkpoint.common.NotFoundException;
import app.checkpoint.common.SecureTokens;
import app.checkpoint.event.dto.AttendeeRow;
import app.checkpoint.event.dto.EventDetail;
import app.checkpoint.event.dto.EventRequest;
import app.checkpoint.event.dto.EventStats;
import app.checkpoint.event.dto.EventSummary;
import app.checkpoint.event.dto.PublicEventView;
import app.checkpoint.organizer.CurrentOrganizer;
import app.checkpoint.rsvp.CheckInMethod;
import app.checkpoint.rsvp.Rsvp;
import app.checkpoint.rsvp.RsvpRepository;
import app.checkpoint.rsvp.RsvpService;
import app.checkpoint.rsvp.RsvpStatus;
import app.checkpoint.sponsor.Sponsor;
import app.checkpoint.sponsor.SponsorLeadRepository;
import app.checkpoint.sponsor.dto.SponsorView;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventService {

    static final Duration TIMELINE_BUCKET = Duration.ofMinutes(15);

    private final EventRepository events;
    private final ClubRepository clubs;
    private final RsvpRepository rsvps;
    private final RsvpService rsvpService;
    private final SponsorLeadRepository leads;
    private final SecureTokens tokens;
    private final Clock clock;

    public EventService(EventRepository events, ClubRepository clubs, RsvpRepository rsvps, RsvpService rsvpService,
                        SponsorLeadRepository leads, SecureTokens tokens, Clock clock) {
        this.events = events;
        this.clubs = clubs;
        this.rsvps = rsvps;
        this.rsvpService = rsvpService;
        this.leads = leads;
        this.tokens = tokens;
        this.clock = clock;
    }

    /** Loads an event of the organizer's club. Events of other clubs look like they do not exist. */
    @Transactional(readOnly = true)
    public Event requireOwnEvent(CurrentOrganizer me, UUID eventId) {
        return events.findByIdAndClubId(eventId, me.clubId())
                .orElseThrow(() -> new NotFoundException("Event not found."));
    }

    @Transactional(readOnly = true)
    public List<EventSummary> list(CurrentOrganizer me) {
        Map<UUID, RsvpCounts> counts = events.countRsvpsByClub(me.clubId()).stream()
                .collect(Collectors.toMap(RsvpCounts::getEventId, Function.identity()));
        return events.findByClubIdOrderByStartsAtDesc(me.clubId()).stream()
                .map(event -> EventSummary.of(event, counts.get(event.getId())))
                .toList();
    }

    @Transactional
    public EventDetail create(CurrentOrganizer me, EventRequest request) {
        Event event = new Event(clubs.getReferenceById(me.clubId()), request.title(), request.description(),
                request.location(), request.startsAt(), request.endsAt(), request.capacity());
        request.sponsorsOrEmpty().stream().distinct()
                .forEach(name -> event.addSponsor(new Sponsor(event, name, tokens.longToken())));
        events.save(event);
        return detail(me, event.getId());
    }

    /**
     * Updates an event. Takes the same event lock as RSVPs and cancellations because changing the capacity
     * changes how many seats exist: lowering it below the confirmed count is refused, and raising it
     * promotes people from the waitlist into the new seats.
     */
    @Transactional
    public EventDetail update(CurrentOrganizer me, UUID eventId, EventRequest request) {
        Event event = events.findByIdForUpdate(eventId)
                .filter(e -> e.getClub().getId().equals(me.clubId()))
                .orElseThrow(() -> new NotFoundException("Event not found."));
        long confirmed = rsvps.countByEventIdAndStatus(eventId, RsvpStatus.CONFIRMED);
        if (request.capacity() < confirmed) {
            throw new ConflictException("Capacity can't be lower than the " + confirmed
                    + " people already confirmed. Ask some of them to cancel first.");
        }
        event.update(request.title(), request.description(), request.location(), request.startsAt(),
                request.endsAt(), request.capacity());
        rsvpService.fillOpenSeats(event, clock.instant());
        return detail(me, eventId);
    }

    @Transactional(readOnly = true)
    public EventDetail detail(CurrentOrganizer me, UUID eventId) {
        Event event = requireOwnEvent(me, eventId);
        return EventDetail.of(event, events.countRsvps(eventId), sponsorViews(event));
    }

    @Transactional(readOnly = true)
    public List<SponsorView> sponsorViews(Event event) {
        Map<UUID, Long> leadCounts = leads.countByEvent(event.getId()).stream()
                .collect(Collectors.toMap(SponsorLeadRepository.LeadCount::getSponsorId,
                        SponsorLeadRepository.LeadCount::getLeads));
        return event.getSponsors().stream()
                .map(s -> new SponsorView(s.getId(), s.getName(), s.getBoothCode(), leadCounts.getOrDefault(s.getId(), 0L)))
                .toList();
    }

    /** Attendee list: confirmed and waitlisted first (waitlist in queue order), cancelled last. */
    @Transactional(readOnly = true)
    public List<AttendeeRow> attendees(CurrentOrganizer me, UUID eventId) {
        requireOwnEvent(me, eventId);
        List<Rsvp> all = rsvps.findByEventIdOrderByCreatedAtAscIdAsc(eventId);
        int[] position = {0};
        return all.stream()
                .sorted((a, b) -> Integer.compare(a.getStatus().ordinal(), b.getStatus().ordinal()))
                .map(r -> AttendeeRow.of(r, r.getStatus() == RsvpStatus.WAITLISTED ? ++position[0] : null))
                .toList();
    }

    @Transactional(readOnly = true)
    public EventStats stats(CurrentOrganizer me, UUID eventId) {
        Event event = requireOwnEvent(me, eventId);
        RsvpCounts counts = events.countRsvps(eventId);
        List<Rsvp> checkedIn = rsvps.findByEventIdOrderByCreatedAtAscIdAsc(eventId).stream()
                .filter(Rsvp::isCheckedIn).toList();
        long byCard = checkedIn.stream().filter(r -> r.getCheckInMethod() == CheckInMethod.CARD).count();

        Instant now = clock.instant();
        boolean started = event.hasStarted(now);
        Long noShows = started ? counts.getConfirmed() - counts.getCheckedIn() : null;
        Double noShowRate = started && counts.getConfirmed() > 0
                ? (double) noShows / counts.getConfirmed() : null;

        return new EventStats(eventId, event.getCapacity(), counts.getConfirmed(), counts.getWaitlisted(),
                counts.getCancelled(), counts.getCheckedIn(), checkedIn.size() - byCard, byCard,
                noShows, noShowRate, started, event.hasEnded(now), (int) TIMELINE_BUCKET.toMinutes(),
                CheckInTimeline.build(rsvps.findCheckInTimes(eventId), TIMELINE_BUCKET));
    }

    @Transactional(readOnly = true)
    public PublicEventView publicView(UUID eventId) {
        Event event = events.findById(eventId).orElseThrow(() -> new NotFoundException("Event not found."));
        RsvpCounts counts = events.countRsvps(eventId);
        return new PublicEventView(event.getId(), event.getClub().getName(), event.getTitle(),
                event.getDescription(), event.getLocation(), event.getStartsAt(), event.getEndsAt(),
                event.getCapacity(), Math.max(0, event.getCapacity() - counts.getConfirmed()),
                counts.getWaitlisted(), !event.hasStarted(clock.instant()),
                event.getSponsors().stream().map(Sponsor::getName).toList());
    }
}
