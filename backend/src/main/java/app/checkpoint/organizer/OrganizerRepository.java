package app.checkpoint.organizer;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizerRepository extends JpaRepository<Organizer, UUID> {

    @EntityGraph(attributePaths = "club")
    Optional<Organizer> findByEmail(String email);

    boolean existsByEmail(String email);
}
