package app.checkpoint.sponsor;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SponsorRepository extends JpaRepository<Sponsor, UUID> {

    @EntityGraph(attributePaths = "event")
    Optional<Sponsor> findByBoothCode(String boothCode);
}
