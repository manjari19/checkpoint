package app.checkpoint.member;

import app.checkpoint.club.Club;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import java.time.Instant;
import java.util.UUID;

/**
 * A person who has RSVP'd to at least one of a club's events, identified by email within the club.
 * Rows are created by MemberRepository.insertIfAbsent, so this entity has no public constructor.
 */
@Entity
public class Member {

    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Club club;

    private String name;

    private String email;

    private String cardHash;

    private Instant cardLinkedAt;

    private Instant createdAt;

    protected Member() {
    }

    public void linkCard(String cardHash, Instant now) {
        this.cardHash = cardHash;
        this.cardLinkedAt = now;
    }

    public boolean hasCard() {
        return cardHash != null;
    }

    public UUID getId() {
        return id;
    }

    public Club getClub() {
        return club;
    }

    public String getName() {
        return name;
    }

    public String getEmail() {
        return email;
    }

    public String getCardHash() {
        return cardHash;
    }
}
