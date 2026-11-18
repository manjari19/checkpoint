package app.checkpoint.rsvp;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RsvpRepository extends JpaRepository<Rsvp, UUID> {

    long countByEventIdAndStatus(UUID eventId, RsvpStatus status);

    boolean existsByEventIdAndMemberIdAndStatusIn(UUID eventId, UUID memberId, Collection<RsvpStatus> statuses);

    /** The next people in line, oldest RSVP first. Ties on the timestamp are broken by id so the order is stable. */
    @EntityGraph(attributePaths = {"member", "event"})
    @Query("""
            select r from Rsvp r
            where r.event.id = :eventId and r.status = app.checkpoint.rsvp.RsvpStatus.WAITLISTED
            order by r.createdAt, r.id
            """)
    List<Rsvp> findWaitlist(@Param("eventId") UUID eventId, Limit limit);

    /** 1-based position in the waitlist: the number of waitlisted RSVPs ahead of this one, plus one. */
    @Query("""
            select count(r) + 1 from Rsvp r
            where r.event.id = :eventId and r.status = app.checkpoint.rsvp.RsvpStatus.WAITLISTED
              and (r.createdAt < :createdAt or (r.createdAt = :createdAt and r.id < :id))
            """)
    int waitlistPosition(@Param("eventId") UUID eventId, @Param("createdAt") Instant createdAt, @Param("id") UUID id);

    @EntityGraph(attributePaths = {"member", "event"})
    Optional<Rsvp> findByManageToken(String manageToken);

    @EntityGraph(attributePaths = {"member", "event"})
    Optional<Rsvp> findByTicketCode(String ticketCode);

    /** Just the event id for a ticket link, without loading the RSVP into the persistence context. */
    @Query("select r.event.id from Rsvp r where r.manageToken = :token")
    Optional<UUID> findEventIdByManageToken(@Param("token") String token);

    /**
     * Locks one RSVP row (SELECT ... FOR UPDATE) so a concurrent check-in cannot slip in during a cancel.
     *
     * <p>No join fetch on purpose: in PostgreSQL, FOR UPDATE on a join locks the rows of every joined table,
     * which would also lock the event and member rows.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Rsvp r where r.manageToken = :token")
    Optional<Rsvp> findByManageTokenForUpdate(@Param("token") String token);

    @EntityGraph(attributePaths = {"member", "event"})
    Optional<Rsvp> findByEventIdAndMemberIdAndStatusNot(UUID eventId, UUID memberId, RsvpStatus status);

    @EntityGraph(attributePaths = "member")
    List<Rsvp> findByEventIdOrderByCreatedAtAscIdAsc(UUID eventId);

    /**
     * Marks an RSVP as checked in, but only if it is confirmed and not already checked in.
     *
     * <p>Returns the number of rows changed: 1 means this call checked the person in, 0 means it did not.
     * Because the condition and the write are one SQL statement, two staff scanning the same ticket at
     * the same moment cannot both "win": PostgreSQL re-checks the WHERE clause for the second update after
     * the first commits, finds checked_in_at already set, and changes nothing.
     */
    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Rsvp r set r.checkedInAt = :now, r.checkInMethod = :method
            where r.id = :id and r.status = app.checkpoint.rsvp.RsvpStatus.CONFIRMED and r.checkedInAt is null
            """)
    int markCheckedIn(@Param("id") UUID id, @Param("now") Instant now, @Param("method") CheckInMethod method);

    @Query("select r.checkedInAt from Rsvp r where r.event.id = :eventId and r.checkedInAt is not null order by r.checkedInAt")
    List<Instant> findCheckInTimes(@Param("eventId") UUID eventId);

    @EntityGraph(attributePaths = "event")
    List<Rsvp> findByMemberIdOrderByEventStartsAtDesc(UUID memberId);
}
