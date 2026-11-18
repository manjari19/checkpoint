package app.checkpoint.sponsor;

import app.checkpoint.common.CsvWriter;
import app.checkpoint.common.NotFoundException;
import app.checkpoint.common.SecureTokens;
import app.checkpoint.event.Event;
import app.checkpoint.event.EventService;
import app.checkpoint.organizer.CurrentOrganizer;
import app.checkpoint.sponsor.dto.SponsorView;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Organizer-side sponsor management: add and remove sponsors, export their collected contacts. */
@Service
public class SponsorService {

    private final EventService events;
    private final SponsorRepository sponsors;
    private final SponsorLeadRepository leads;
    private final SecureTokens tokens;

    public SponsorService(EventService events, SponsorRepository sponsors, SponsorLeadRepository leads,
                          SecureTokens tokens) {
        this.events = events;
        this.sponsors = sponsors;
        this.leads = leads;
        this.tokens = tokens;
    }

    @Transactional
    public SponsorView add(CurrentOrganizer me, UUID eventId, String name) {
        Event event = events.requireOwnEvent(me, eventId);
        Sponsor sponsor = sponsors.save(new Sponsor(event, name, tokens.longToken()));
        return new SponsorView(sponsor.getId(), sponsor.getName(), sponsor.getBoothCode(), 0);
    }

    /** Removes a sponsor. Their booth link stops working and their collected contacts are deleted. */
    @Transactional
    public void remove(CurrentOrganizer me, UUID eventId, UUID sponsorId) {
        Event event = events.requireOwnEvent(me, eventId);
        // orphanRemoval on Event.sponsors deletes the row; the database cascade deletes its leads.
        boolean removed = event.getSponsors().removeIf(sponsor -> sponsor.getId().equals(sponsorId));
        if (!removed) {
            throw new NotFoundException("Sponsor not found.");
        }
    }

    @Transactional(readOnly = true)
    public String leadsCsv(CurrentOrganizer me, UUID eventId) {
        events.requireOwnEvent(me, eventId);
        CsvWriter csv = new CsvWriter().row("sponsor", "name", "email", "scanned_at");
        leads.findByEvent(eventId).forEach(row ->
                csv.row(row.getSponsorName(), row.getName(), row.getEmail(), row.getScannedAt()));
        return csv.toString();
    }
}
