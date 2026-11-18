package app.checkpoint.event;

import static org.assertj.core.api.Assertions.assertThat;

import app.checkpoint.event.dto.EventStats.TimelinePoint;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class CheckInTimelineTest {

    private static final Duration FIFTEEN_MINUTES = Duration.ofMinutes(15);

    @Test
    void noCheckInsMeansAnEmptyTimeline() {
        assertThat(CheckInTimeline.build(List.of(), FIFTEEN_MINUTES)).isEmpty();
    }

    @Test
    void groupsCheckInsIntoBucketsAndKeepsEmptyBucketsInBetween() {
        List<TimelinePoint> points = CheckInTimeline.build(List.of(
                Instant.parse("2027-01-21T02:01:00Z"),
                Instant.parse("2027-01-21T02:14:59Z"),
                Instant.parse("2027-01-21T02:15:00Z"),
                Instant.parse("2027-01-21T02:50:00Z")), FIFTEEN_MINUTES);

        assertThat(points).extracting(TimelinePoint::bucketStart).containsExactly(
                Instant.parse("2027-01-21T02:00:00Z"),
                Instant.parse("2027-01-21T02:15:00Z"),
                Instant.parse("2027-01-21T02:30:00Z"),
                Instant.parse("2027-01-21T02:45:00Z"));
        assertThat(points).extracting(TimelinePoint::checkIns).containsExactly(2, 1, 0, 1);
        assertThat(points).extracting(TimelinePoint::cumulative).containsExactly(2, 3, 3, 4);
    }
}
