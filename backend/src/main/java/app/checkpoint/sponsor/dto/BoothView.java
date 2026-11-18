package app.checkpoint.sponsor.dto;

import java.time.Instant;
import java.util.List;

/** What the sponsor sees in booth mode: their event and the contacts they have collected so far. */
public record BoothView(String sponsorName, String eventTitle, Instant eventStartsAt, String eventLocation,
                        List<Lead> leads) {

    public record Lead(String name, String email, Instant scannedAt) {
    }
}
