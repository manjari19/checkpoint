package app.checkpoint.event;

import java.util.UUID;

/** Projection: how many RSVPs an event has in each state. */
public interface RsvpCounts {

    UUID getEventId();

    long getConfirmed();

    long getWaitlisted();

    long getCancelled();

    long getCheckedIn();
}
