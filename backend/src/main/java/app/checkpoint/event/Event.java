package app.checkpoint.event;

import app.checkpoint.club.Club;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import app.checkpoint.sponsor.Sponsor;

/**
 * An event run by a club.
 *
 * <p>The event row doubles as the lock for its seats: every operation that can change who holds a
 * confirmed seat first runs SELECT ... FOR UPDATE on this row. See RsvpService for details.
 */
@Entity
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    private Club club;

    private String title;

    private String description;

    private String location;

    private Instant startsAt;

    private Instant endsAt;

    private int capacity;

    @Enumerated(EnumType.STRING)
    private EventCategory category;

    private Instant createdAt = Instant.now();

    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("createdAt, name")
    private List<Sponsor> sponsors = new ArrayList<>();

    protected Event() {
    }

    public Event(Club club, String title, String description, String location,
                 Instant startsAt, Instant endsAt, int capacity, EventCategory category) {
        this.club = club;
        update(title, description, location, startsAt, endsAt, capacity, category);
    }

    public void update(String title, String description, String location,
                       Instant startsAt, Instant endsAt, int capacity, EventCategory category) {
        if (!endsAt.isAfter(startsAt)) {
            throw new IllegalArgumentException("The event must end after it starts.");
        }
        this.title = title.trim();
        this.description = description == null ? "" : description.trim();
        this.location = location.trim();
        this.startsAt = startsAt;
        this.endsAt = endsAt;
        this.capacity = capacity;
        this.category = category == null ? EventCategory.OTHER : category;
    }

    public void addSponsor(Sponsor sponsor) {
        sponsors.add(sponsor);
    }

    public boolean hasStarted(Instant now) {
        return !now.isBefore(startsAt);
    }

    public boolean hasEnded(Instant now) {
        return !now.isBefore(endsAt);
    }

    public UUID getId() {
        return id;
    }

    public Club getClub() {
        return club;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getLocation() {
        return location;
    }

    public Instant getStartsAt() {
        return startsAt;
    }

    public Instant getEndsAt() {
        return endsAt;
    }

    public int getCapacity() {
        return capacity;
    }

    public EventCategory getCategory() {
        return category;
    }

    public List<Sponsor> getSponsors() {
        return sponsors;
    }
}
