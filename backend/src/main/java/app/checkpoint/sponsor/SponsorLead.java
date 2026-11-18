package app.checkpoint.sponsor;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import java.time.Instant;
import java.util.UUID;

/**
 * An attendee contact saved by a sponsor. Rows are inserted with one SQL statement in
 * SponsorLeadRepository.insertIfAbsent, so this mapping is read-only in practice.
 */
@Entity
public class SponsorLead {

    @Id
    private UUID id;

    private UUID sponsorId;

    private UUID rsvpId;

    private Instant scannedAt;

    protected SponsorLead() {
    }
}
