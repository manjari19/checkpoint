package app.checkpoint.sponsor;

import app.checkpoint.checkin.dto.TicketScanRequest;
import app.checkpoint.sponsor.dto.BoothScanResult;
import app.checkpoint.sponsor.dto.BoothView;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Sponsor booth mode. No login: the secret booth code in the URL identifies the sponsor. */
@Tag(name = "Sponsor booth", description = "Used by sponsors through their secret booth link")
@RestController
@RequestMapping("/api/booth/{boothCode}")
public class BoothController {

    private final BoothService booth;

    public BoothController(BoothService booth) {
        this.booth = booth;
    }

    @Operation(summary = "Sponsor and event details, with the contacts collected so far")
    @GetMapping
    public BoothView view(@PathVariable String boothCode) {
        return booth.view(boothCode);
    }

    @Operation(summary = "Scan an attendee's ticket QR to save their contact (only if they opted in)")
    @PostMapping("/scans")
    public BoothScanResult scan(@PathVariable String boothCode, @Valid @RequestBody TicketScanRequest request) {
        return booth.scan(boothCode, request.ticketCode());
    }
}
