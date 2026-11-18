package app.checkpoint.event.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Numbers for the event dashboard.
 *
 * @param noShows      confirmed but not checked in; null before the event starts
 * @param noShowRate   noShows / confirmed, between 0 and 1; null before the event starts or with no confirmed RSVPs
 * @param timeline     check-ins per time bucket, from the first check-in to the last
 */
public record EventStats(
        UUID eventId,
        int capacity,
        long confirmed,
        long waitlisted,
        long cancelled,
        long checkedIn,
        long checkedInByQr,
        long checkedInByCard,
        Long noShows,
        Double noShowRate,
        boolean eventStarted,
        boolean eventEnded,
        int bucketMinutes,
        List<TimelinePoint> timeline) {

    public record TimelinePoint(Instant bucketStart, int checkIns, int cumulative) {
    }
}
