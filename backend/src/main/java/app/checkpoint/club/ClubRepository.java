package app.checkpoint.club;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ClubRepository extends JpaRepository<Club, UUID> {
}
