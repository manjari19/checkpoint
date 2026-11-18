package app.checkpoint.report.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Club-wide numbers for one term.
 *
 * @param uniqueAttendees different people who checked in to at least one event this term
 * @param totalCheckIns   check-ins across all events this term (one person at three events counts three)
 * @param trend           one point per event in the term, oldest first, for the attendance trend chart
 * @param terms           every term that has events, newest first, for the term picker
 */
public record ClubSummary(String termId, String termLabel, long eventCount, long uniqueAttendees,
                          long totalCheckIns, List<TrendPoint> trend, List<TermOption> terms) {

    public record TrendPoint(UUID eventId, String title, Instant startsAt, long confirmed, long checkedIn) {
    }

    public record TermOption(String id, String label) {
    }
}
