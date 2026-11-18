package app.checkpoint.sponsor;

import app.checkpoint.event.Event;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import java.time.Instant;
import java.util.UUID;

/**
 * A sponsor at one event. Sponsors do not get accounts: the organizer shares a booth link that
 * contains the secret booth code, and anyone holding that link can use booth mode for this sponsor.
 */
@Entity
public class Sponsor {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Event event;

    private String name;

    private String boothCode;

    private Instant createdAt = Instant.now();

    protected Sponsor() {
    }

    public Sponsor(Event event, String name, String boothCode) {
        this.event = event;
        this.name = name.trim();
        this.boothCode = boothCode;
    }

    public UUID getId() {
        return id;
    }

    public Event getEvent() {
        return event;
    }

    public String getName() {
        return name;
    }

    public String getBoothCode() {
        return boothCode;
    }
}
