package app.checkpoint.sponsor;

import app.checkpoint.common.NotFoundException;
import app.checkpoint.rsvp.Rsvp;
import app.checkpoint.rsvp.RsvpRepository;
import app.checkpoint.rsvp.RsvpStatus;
import app.checkpoint.sponsor.dto.BoothScanResult;
import app.checkpoint.sponsor.dto.BoothScanResult.Outcome;
import app.checkpoint.sponsor.dto.BoothView;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Sponsor booth mode. A sponsor scans an attendee's ticket QR to save their name and email,
 * but only if the attendee ticked "share my contact with sponsors" when they RSVP'd.
 */
@Service
public class BoothService {

    private final SponsorRepository sponsors;
    private final SponsorLeadRepository leads;
    private final RsvpRepository rsvps;

    public BoothService(SponsorRepository sponsors, SponsorLeadRepository leads, RsvpRepository rsvps) {
        this.sponsors = sponsors;
        this.leads = leads;
        this.rsvps = rsvps;
    }

    @Transactional(readOnly = true)
    public BoothView view(String boothCode) {
        Sponsor sponsor = requireSponsor(boothCode);
        return new BoothView(sponsor.getName(), sponsor.getEvent().getTitle(), sponsor.getEvent().getStartsAt(),
                sponsor.getEvent().getLocation(),
                leads.findBySponsor(sponsor.getId()).stream()
                        .map(row -> new BoothView.Lead(row.getName(), row.getEmail(), row.getScannedAt()))
                        .toList());
    }

    @Transactional
    public BoothScanResult scan(String boothCode, String ticketCode) {
        Sponsor sponsor = requireSponsor(boothCode);
        Optional<Rsvp> found = rsvps.findByTicketCode(ticketCode.trim())
                .filter(r -> r.getEvent().getId().equals(sponsor.getEvent().getId()))
                .filter(r -> r.getStatus() == RsvpStatus.CONFIRMED);
        if (found.isEmpty()) {
            return new BoothScanResult(Outcome.NOT_FOUND, "This isn't a valid ticket for this event.", null);
        }
        Rsvp rsvp = found.get();
        if (!rsvp.isSponsorOptIn()) {
            return new BoothScanResult(Outcome.NOT_OPTED_IN,
                    "This attendee chose not to share their contact details with sponsors.", null);
        }
        boolean isNew = leads.insertIfAbsent(sponsor.getId(), rsvp.getId()) == 1;
        BoothView.Lead lead = leads.findBySponsor(sponsor.getId()).stream()
                .filter(row -> row.getEmail().equals(rsvp.getMember().getEmail()))
                .map(row -> new BoothView.Lead(row.getName(), row.getEmail(), row.getScannedAt()))
                .findFirst().orElseThrow();
        String name = rsvp.getMember().getName();
        return isNew
                ? new BoothScanResult(Outcome.SAVED, "Saved " + name + "'s contact.", lead)
                : new BoothScanResult(Outcome.ALREADY_SAVED, "You already have " + name + "'s contact.", lead);
    }

    private Sponsor requireSponsor(String boothCode) {
        return sponsors.findByBoothCode(boothCode)
                .orElseThrow(() -> new NotFoundException("This booth link isn't valid. Ask the organizers for a new one."));
    }
}
