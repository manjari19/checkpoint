package app.checkpoint.report.dto;

import app.checkpoint.member.MemberAttendanceRow;
import java.time.Instant;
import java.util.UUID;

/**
 * One member's attendance totals.
 *
 * @param rsvps    RSVPs that were not cancelled
 * @param attended events they checked in to
 * @param noShows  events that have ended where they had a confirmed seat but never checked in
 */
public record MemberSummary(UUID id, String name, String email, boolean cardLinked, long rsvps, long attended,
                            long noShows, Instant lastAttendedAt) {

    public static MemberSummary of(MemberAttendanceRow row) {
        return new MemberSummary(row.getId(), row.getName(), row.getEmail(), row.getCardLinked(), row.getRsvps(),
                row.getAttended(), row.getNoShows(), row.getLastAttendedAt());
    }
}
