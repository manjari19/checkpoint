package app.checkpoint.sponsor;

import java.time.Instant;

/** A contact a sponsor collected: the attendee's name and email, and when their ticket was scanned. */
public interface SponsorLeadRow {

    String getSponsorName();

    String getName();

    String getEmail();

    Instant getScannedAt();
}
