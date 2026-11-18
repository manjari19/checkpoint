package app.checkpoint.sponsor;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/**
 * Sponsor leads are written with one SQL statement and read through projections, so every
 * method here is a native query on the sponsor_lead table.
 */
public interface SponsorLeadRepository extends Repository<SponsorLead, UUID> {

    /** Saves the lead. Returns 1 if it is new, 0 if this sponsor already had it (scanned twice). */
    @Modifying
    @Query(value = """
            insert into sponsor_lead (id, sponsor_id, rsvp_id, scanned_at)
            values (gen_random_uuid(), :sponsorId, :rsvpId, now())
            on conflict on constraint sponsor_lead_once do nothing
            """, nativeQuery = true)
    int insertIfAbsent(@Param("sponsorId") UUID sponsorId, @Param("rsvpId") UUID rsvpId);

    String LEADS_SQL = """
            select s.name as sponsorName, m.name as name, m.email as email, l.scanned_at as scannedAt
            from sponsor_lead l
                     join sponsor s on s.id = l.sponsor_id
                     join rsvp r on r.id = l.rsvp_id
                     join member m on m.id = r.member_id
            """;

    @Query(value = LEADS_SQL + " where s.id = :sponsorId order by l.scanned_at desc", nativeQuery = true)
    List<SponsorLeadRow> findBySponsor(@Param("sponsorId") UUID sponsorId);

    @Query(value = LEADS_SQL + " where s.event_id = :eventId order by s.name, l.scanned_at", nativeQuery = true)
    List<SponsorLeadRow> findByEvent(@Param("eventId") UUID eventId);

    @Query(value = """
            select s.id as sponsorId, count(l.id) as leads
            from sponsor s left join sponsor_lead l on l.sponsor_id = s.id
            where s.event_id = :eventId group by s.id
            """, nativeQuery = true)
    List<LeadCount> countByEvent(@Param("eventId") UUID eventId);

    interface LeadCount {
        UUID getSponsorId();

        long getLeads();
    }
}
