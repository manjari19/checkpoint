package app.checkpoint.organizer;

import app.checkpoint.club.Club;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import java.time.Instant;
import java.util.UUID;

/** A club executive who can log in, create events and run check-in. */
@Entity
public class Organizer {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Club club;

    private String email;

    private String passwordHash;

    private String displayName;

    private Instant createdAt = Instant.now();

    protected Organizer() {
    }

    public Organizer(Club club, String email, String passwordHash, String displayName) {
        this.club = club;
        this.email = email.trim().toLowerCase();
        this.passwordHash = passwordHash;
        this.displayName = displayName;
    }

    public UUID getId() {
        return id;
    }

    public Club getClub() {
        return club;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getDisplayName() {
        return displayName;
    }
}
