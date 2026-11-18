package app.checkpoint.rsvp;

import app.checkpoint.event.EventService;
import app.checkpoint.event.dto.PublicEventView;
import app.checkpoint.rsvp.dto.RsvpRequest;
import app.checkpoint.rsvp.dto.TicketView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Endpoints for members. No login: the event id and the secret ticket token act as the keys. */
@Tag(name = "Public", description = "RSVP page and ticket page, used by members without logging in")
@RestController
@RequestMapping("/api/public")
public class PublicController {

    private final EventService events;
    private final RsvpService rsvps;

    public PublicController(EventService events, RsvpService rsvps) {
        this.events = events;
        this.rsvps = rsvps;
    }

    @Operation(summary = "Public event details for the RSVP page")
    @GetMapping("/events/{eventId}")
    public PublicEventView event(@PathVariable UUID eventId) {
        return events.publicView(eventId);
    }

    @Operation(summary = "RSVP. Confirmed if there is a free seat, otherwise added to the waitlist.")
    @PostMapping("/events/{eventId}/rsvps")
    @ResponseStatus(HttpStatus.CREATED)
    public TicketView rsvp(@PathVariable UUID eventId, @Valid @RequestBody RsvpRequest request) {
        return rsvps.rsvp(eventId, request);
    }

    @Operation(summary = "View a ticket from the link in the confirmation email")
    @GetMapping("/tickets/{manageToken}")
    public TicketView ticket(@PathVariable String manageToken) {
        return rsvps.getTicket(manageToken);
    }

    @Operation(summary = "Cancel an RSVP. If it held a seat, the next person on the waitlist is promoted.")
    @PostMapping("/tickets/{manageToken}/cancel")
    public TicketView cancel(@PathVariable String manageToken) {
        return rsvps.cancel(manageToken);
    }
}
