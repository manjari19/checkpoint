package app.checkpoint.sponsor;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SponsorRepository extends JpaRepository<Sponsor, UUID> {

    @EntityGraph(attributePaths = "event")
    Optional<Sponsor> findByBoothCode(String boothCode);

    /** Every sponsor across the club's events, newest event first, with how many contacts each collected. */
    @Query(value = """
            select s.id         as id,
                   s.name       as name,
                   s.booth_code as boothCode,
                   e.id         as eventId,
                   e.title      as eventTitle,
                   e.starts_at  as eventStartsAt,
                   count(l.id)  as leadCount
            from sponsor s
                     join event e on e.id = s.event_id
                     left join sponsor_lead l on l.sponsor_id = s.id
            where e.club_id = :clubId
            group by s.id, e.id
            order by e.starts_at desc, s.name
            """, nativeQuery = true)
    List<SponsorOverview> findOverviewByClub(@Param("clubId") UUID clubId);

    interface SponsorOverview {
        UUID getId();

        String getName();

        String getBoothCode();

        UUID getEventId();

        String getEventTitle();

        Instant getEventStartsAt();

        long getLeadCount();
    }
}
