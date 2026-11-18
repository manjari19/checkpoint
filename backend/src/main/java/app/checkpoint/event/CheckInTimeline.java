package app.checkpoint.event;

import app.checkpoint.event.dto.EventStats.TimelinePoint;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Groups check-in times into fixed-size buckets for the "check-ins over time" chart. */
public final class CheckInTimeline {

    private CheckInTimeline() {
    }

    /**
     * @param sortedTimes check-in times, oldest first
     * @param bucket      bucket size, for example 15 minutes
     * @return one point per bucket from the first check-in's bucket to the last, including empty buckets
     *         so the chart's time axis has no gaps
     */
    public static List<TimelinePoint> build(List<Instant> sortedTimes, Duration bucket) {
        if (sortedTimes.isEmpty()) {
            return List.of();
        }
        long bucketMillis = bucket.toMillis();
        long first = floor(sortedTimes.getFirst(), bucketMillis);
        long last = floor(sortedTimes.getLast(), bucketMillis);
        int[] counts = new int[(int) ((last - first) / bucketMillis) + 1];
        for (Instant time : sortedTimes) {
            counts[(int) ((floor(time, bucketMillis) - first) / bucketMillis)]++;
        }

        List<TimelinePoint> points = new ArrayList<>(counts.length);
        int cumulative = 0;
        for (int i = 0; i < counts.length; i++) {
            cumulative += counts[i];
            points.add(new TimelinePoint(Instant.ofEpochMilli(first + i * bucketMillis), counts[i], cumulative));
        }
        return points;
    }

    private static long floor(Instant time, long bucketMillis) {
        return Math.floorDiv(time.toEpochMilli(), bucketMillis) * bucketMillis;
    }
}
