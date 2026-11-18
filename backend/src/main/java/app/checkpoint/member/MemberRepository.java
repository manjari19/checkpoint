package app.checkpoint.member;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MemberRepository extends JpaRepository<Member, UUID> {

    /**
     * Creates the member if no member with this email exists in the club yet.
     *
     * <p>Two people can RSVP with the same new email to two different events at the same moment.
     * Those requests hold different event locks, so "check, then insert" could insert twice.
     * ON CONFLICT DO NOTHING lets the database settle it: one insert wins, the other is a no-op.
     */
    @Modifying
    @Query(value = """
            insert into member (id, club_id, name, email, created_at)
            values (gen_random_uuid(), :clubId, :name, :email, now())
            on conflict on constraint member_email_per_club do nothing
            """, nativeQuery = true)
    void insertIfAbsent(@Param("clubId") UUID clubId, @Param("email") String email, @Param("name") String name);

    Optional<Member> findByClubIdAndEmail(UUID clubId, String email);

    Optional<Member> findByClubIdAndCardHash(UUID clubId, String cardHash);

    Optional<Member> findByIdAndClubId(UUID id, UUID clubId);

    /** One row per member with attendance totals for events starting in [from, to).
     * Members with no RSVPs in that range are left out. Used for the members table and the CSV export. */
    @Query(value = """
            select m.id                                                          as id,
                   m.name                                                        as name,
                   m.email                                                       as email,
                   m.card_hash is not null                                       as cardLinked,
                   count(r.id) filter (where r.status <> 'CANCELLED')            as rsvps,
                   count(r.id) filter (where r.checked_in_at is not null)        as attended,
                   count(r.id) filter (where r.status = 'CONFIRMED'
                                         and r.checked_in_at is null
                                         and e.ends_at < now())                  as noShows,
                   max(r.checked_in_at)                                          as lastAttendedAt
            from member m
                     left join (rsvp r join event e on e.id = r.event_id
                                 and e.starts_at >= :from and e.starts_at < :to)
                               on r.member_id = m.id
            where m.club_id = :clubId
            group by m.id
            having count(r.id) > 0
            order by lower(m.name), m.email
            """, nativeQuery = true)
    List<MemberAttendanceRow> attendanceSummary(@Param("clubId") UUID clubId, @Param("from") Instant from,
                                                @Param("to") Instant to);
}
