package app.checkpoint.sponsor.dto;

import java.util.UUID;

/** A sponsor as the organizer sees it. boothCode goes into the booth link shared with the sponsor. */
public record SponsorView(UUID id, String name, String boothCode, long leadCount) {
}
