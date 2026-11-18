package app.checkpoint.sponsor;

import app.checkpoint.organizer.CurrentOrganizer;
import app.checkpoint.sponsor.SponsorRepository.SponsorOverview;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Events", description = "Organizer event management and dashboard")
@RestController
public class SponsorController {

    private final SponsorService sponsors;

    public SponsorController(SponsorService sponsors) {
        this.sponsors = sponsors;
    }

    @Operation(summary = "All sponsors across the club's events, with booth codes and contact counts")
    @GetMapping("/api/sponsors")
    public List<SponsorOverview> list(@AuthenticationPrincipal CurrentOrganizer me) {
        return sponsors.overview(me);
    }
}
