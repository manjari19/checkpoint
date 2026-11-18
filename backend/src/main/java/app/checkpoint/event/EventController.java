package app.checkpoint.event;

import app.checkpoint.common.CsvResponses;
import app.checkpoint.event.dto.AttendeeRow;
import app.checkpoint.event.dto.EventDetail;
import app.checkpoint.event.dto.EventRequest;
import app.checkpoint.event.dto.EventStats;
import app.checkpoint.event.dto.EventSummary;
import app.checkpoint.organizer.CurrentOrganizer;
import app.checkpoint.sponsor.SponsorService;
import app.checkpoint.sponsor.dto.SponsorRequest;
import app.checkpoint.sponsor.dto.SponsorView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Events", description = "Organizer event management and dashboard")
@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService events;
    private final SponsorService sponsors;

    public EventController(EventService events, SponsorService sponsors) {
        this.events = events;
        this.sponsors = sponsors;
    }

    @Operation(summary = "List the club's events, newest first")
    @GetMapping
    public List<EventSummary> list(@AuthenticationPrincipal CurrentOrganizer me) {
        return events.list(me);
    }

    @Operation(summary = "Create an event")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public EventDetail create(@AuthenticationPrincipal CurrentOrganizer me, @Valid @RequestBody EventRequest request) {
        return events.create(me, request);
    }

    @Operation(summary = "Get an event with its sponsors and booth codes")
    @GetMapping("/{eventId}")
    public EventDetail get(@AuthenticationPrincipal CurrentOrganizer me, @PathVariable UUID eventId) {
        return events.detail(me, eventId);
    }

    @Operation(summary = "Update an event. Raising the capacity promotes people from the waitlist.")
    @PutMapping("/{eventId}")
    public EventDetail update(@AuthenticationPrincipal CurrentOrganizer me, @PathVariable UUID eventId,
                              @Valid @RequestBody EventRequest request) {
        return events.update(me, eventId, request);
    }

    @Operation(summary = "List everyone who RSVP'd, including the waitlist and cancellations")
    @GetMapping("/{eventId}/rsvps")
    public List<AttendeeRow> attendees(@AuthenticationPrincipal CurrentOrganizer me, @PathVariable UUID eventId) {
        return events.attendees(me, eventId);
    }

    @Operation(summary = "Download the attendee list as CSV")
    @GetMapping(value = "/{eventId}/attendees.csv", produces = "text/csv")
    public ResponseEntity<String> attendeesCsv(@AuthenticationPrincipal CurrentOrganizer me, @PathVariable UUID eventId) {
        return CsvResponses.download("attendees.csv", events.attendeesCsv(me, eventId));
    }

    @Operation(summary = "Dashboard numbers: RSVPs, waitlist, check-ins, no-show rate, check-ins over time")
    @GetMapping("/{eventId}/stats")
    public EventStats stats(@AuthenticationPrincipal CurrentOrganizer me, @PathVariable UUID eventId) {
        return events.stats(me, eventId);
    }

    @Operation(summary = "Add a sponsor. The response includes the booth code for their booth link.")
    @PostMapping("/{eventId}/sponsors")
    @ResponseStatus(HttpStatus.CREATED)
    public SponsorView addSponsor(@AuthenticationPrincipal CurrentOrganizer me, @PathVariable UUID eventId,
                                  @Valid @RequestBody SponsorRequest request) {
        return sponsors.add(me, eventId, request.name());
    }

    @Operation(summary = "Remove a sponsor and the contacts they collected")
    @DeleteMapping("/{eventId}/sponsors/{sponsorId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void removeSponsor(@AuthenticationPrincipal CurrentOrganizer me, @PathVariable UUID eventId,
                              @PathVariable UUID sponsorId) {
        sponsors.remove(me, eventId, sponsorId);
    }

    @Operation(summary = "Download every sponsor's collected contacts for this event as CSV")
    @GetMapping(value = "/{eventId}/sponsor-leads.csv", produces = "text/csv")
    public ResponseEntity<String> sponsorLeadsCsv(@AuthenticationPrincipal CurrentOrganizer me,
                                                  @PathVariable UUID eventId) {
        return CsvResponses.download("sponsor-contacts.csv", sponsors.leadsCsv(me, eventId));
    }
}
