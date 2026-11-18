package app.checkpoint.checkin;

import app.checkpoint.checkin.dto.CardScanRequest;
import app.checkpoint.checkin.dto.CheckInResult;
import app.checkpoint.checkin.dto.TicketScanRequest;
import app.checkpoint.organizer.CurrentOrganizer;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Check-in", description = "Organizer scanner at the door")
@RestController
@RequestMapping("/api/events/{eventId}/check-ins")
public class CheckInController {

    private final CheckInService checkIns;

    public CheckInController(CheckInService checkIns) {
        this.checkIns = checkIns;
    }

    @Operation(summary = "Check in by scanning the QR code on a ticket")
    @PostMapping("/ticket")
    public CheckInResult byTicket(@AuthenticationPrincipal CurrentOrganizer me, @PathVariable UUID eventId,
                                  @Valid @RequestBody TicketScanRequest request) {
        return checkIns.byTicket(me, eventId, request.ticketCode());
    }

    @Operation(summary = "Check in by scanning the barcode on a linked student card")
    @PostMapping("/card")
    public CheckInResult byCard(@AuthenticationPrincipal CurrentOrganizer me, @PathVariable UUID eventId,
                                @Valid @RequestBody CardScanRequest request) {
        return checkIns.byCard(me, eventId, request.cardNumber());
    }

    @Operation(summary = "Check in an attendee picked from the attendee list")
    @PostMapping("/rsvp/{rsvpId}")
    public CheckInResult manually(@AuthenticationPrincipal CurrentOrganizer me, @PathVariable UUID eventId,
                                  @PathVariable UUID rsvpId) {
        return checkIns.manually(me, eventId, rsvpId);
    }
}
