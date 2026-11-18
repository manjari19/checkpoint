package app.checkpoint.member;

import java.time.Instant;
import java.util.UUID;

/** Projection for MemberRepository.attendanceSummary. Spring Data fills it from the query's column aliases. */
public interface MemberAttendanceRow {

    UUID getId();

    String getName();

    String getEmail();

    boolean getCardLinked();

    long getRsvps();

    long getAttended();

    long getNoShows();

    Instant getLastAttendedAt();
}
