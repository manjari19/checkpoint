package app.checkpoint.event;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<Event, UUID> {

    /**
     * Loads the event and locks its row until the current transaction ends
     * (on PostgreSQL this is SELECT ... FOR NO KEY UPDATE).
     *
     * <p>A second transaction calling this for the same event waits here until the first one commits
     * or rolls back. That is what makes seat changes for one event happen one at a time.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Event e where e.id = :id")
    Optional<Event> findByIdForUpdate(@Param("id") UUID id);

    List<Event> findByClubIdOrderByStartsAtDesc(UUID clubId);

    Optional<Event> findByIdAndClubId(UUID id, UUID clubId);

    String COUNTS_SQL = """
            select e.id                                             as eventId,
                   count(r.id) filter (where r.status = 'CONFIRMED')       as confirmed,
                   count(r.id) filter (where r.status = 'WAITLISTED')      as waitlisted,
                   count(r.id) filter (where r.status = 'CANCELLED')       as cancelled,
                   count(r.id) filter (where r.checked_in_at is not null) as checkedIn
            from event e
                     left join rsvp r on r.event_id = e.id
            """;

    @Query(value = COUNTS_SQL + " where e.club_id = :clubId group by e.id", nativeQuery = true)
    List<RsvpCounts> countRsvpsByClub(@Param("clubId") UUID clubId);

    @Query(value = COUNTS_SQL + " where e.id = :eventId group by e.id", nativeQuery = true)
    RsvpCounts countRsvps(@Param("eventId") UUID eventId);

    /** Per-event totals for the club's events starting in [from, to), oldest first. Feeds the attendance trend chart. */
    @Query(value = """
            select e.id                                                   as eventId,
                   e.title                                                as title,
                   e.starts_at                                            as startsAt,
                   count(r.id) filter (where r.status = 'CONFIRMED')       as confirmed,
                   count(r.id) filter (where r.checked_in_at is not null) as checkedIn
            from event e
                     left join rsvp r on r.event_id = e.id
            where e.club_id = :clubId and e.starts_at >= :from and e.starts_at < :to
            group by e.id
            order by e.starts_at
            """, nativeQuery = true)
    List<EventAttendance> attendanceByEvent(@Param("clubId") UUID clubId, @Param("from") Instant from,
                                            @Param("to") Instant to);

    /** Number of different members who checked in to at least one event starting in [from, to). */
    @Query(value = """
            select count(distinct r.member_id)
            from rsvp r
                     join event e on e.id = r.event_id
            where e.club_id = :clubId and r.checked_in_at is not null
              and e.starts_at >= :from and e.starts_at < :to
            """, nativeQuery = true)
    long countUniqueAttendees(@Param("clubId") UUID clubId, @Param("from") Instant from, @Param("to") Instant to);

    interface EventAttendance {
        UUID getEventId();

        String getTitle();

        Instant getStartsAt();

        long getConfirmed();

        long getCheckedIn();
    }
}
