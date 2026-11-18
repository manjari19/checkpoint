package app.checkpoint.demo;

import app.checkpoint.common.SecureTokens;
import app.checkpoint.member.CardNumberHasher;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Random;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Fills a separate demo club with a believable term of history, so the dashboards can be judged with
 * real-looking numbers. Only runs with the "demo" Spring profile (see scripts/demo-data.sh).
 *
 * <ul>
 *   <li>Its own club and organizer login (demo@checkpoint.local), so no existing club's data is touched.</li>
 *   <li>120 members with made-up names and example.com emails. Some have a linked student card; the card
 *       numbers are fake (29999000000001 and up) and, as always, only their hash is stored.</li>
 *   <li>8 past events this term with RSVPs, waitlists, cancellations, promotions, check-ins, no-shows and
 *       sponsor contacts, plus 2 upcoming events (one full with a waitlist).</li>
 * </ul>
 *
 * Rows are written with plain SQL because this is history: the services would rightly refuse to RSVP
 * to an event that has already happened. A fixed random seed makes every run produce the same club.
 * Runs once: if the demo organizer already exists, it does nothing.
 */
@Component
@Profile("demo")
@Order(2) // after BootstrapData, so an empty database still gets the normal club first
public class DemoDataSeeder implements ApplicationRunner {

    public static final String DEMO_EMAIL = "demo@checkpoint.local";
    public static final String DEMO_PASSWORD = "checkpoint-demo";

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);
    private static final ZoneId ZONE = ZoneId.of("America/Vancouver");
    private static final int MEMBER_COUNT = 120;

    private static final String[] FIRST_NAMES = {
        "Aisha", "Bea", "Camila", "Divya", "Elena", "Farah", "Grace", "Hana", "Imani", "Jia", "Kavya", "Leah",
        "Mei", "Nadia", "Olivia", "Priya", "Quinn", "Rosa", "Sana", "Tara", "Uma", "Valeria", "Wren", "Ximena",
        "Yara", "Zoe", "Amara", "Chloe", "Esther", "Ines", "Jasmine", "Lina", "Maya", "Noor", "Riya", "Sofia",
        "Talia", "Vivian", "Willa", "Yuna",
    };
    private static final String[] LAST_NAMES = {
        "Ahmed", "Brooks", "Chen", "Dhillon", "Espinoza", "Fraser", "Gill", "Huang", "Iyer", "Johal", "Kim",
        "Liu", "Mendes", "Nguyen", "Okafor", "Park", "Qureshi", "Reyes", "Sandhu", "Tanaka", "Usman", "Vargas",
        "Wong", "Xu", "Yamada", "Zhao", "Bains", "Costa", "Dube", "Grewal",
    };

    /** One event to create: when (days from today), how big, and how popular. */
    private record Plan(String title, String category, String location, int daysFromToday, int startHour,
                        int hours, int capacity, double demand, String[] sponsors) {
    }

    private static final List<Plan> PLANS = List.of(
        new Plan("Welcome Back Social", "SOCIAL", "SFU Burnaby, Convocation Mall", -70, 17, 3, 80, 0.85, new String[0]),
        new Plan("Intro to Git Workshop", "WORKSHOP", "SFU Burnaby, ASB 9705", -62, 18, 2, 40, 1.05, new String[0]),
        new Plan("Women in Tech Panel", "PANEL", "SFU Surrey, Galleria 3", -54, 18, 2, 60, 0.9,
                new String[] {"Fernwood Systems"}),
        new Plan("Resume Roast", "WORKSHOP", "SFU Burnaby, AQ 3149", -46, 17, 2, 35, 1.35, new String[0]),
        new Plan("Hack the Fall", "HACKATHON", "SFU Burnaby, Applied Sciences Atrium", -37, 10, 9, 50, 1.2,
                new String[] {"Quillstone Labs", "Tidewater Data Co."}),
        new Plan("Coffee Chats with Alumni", "NETWORKING", "SFU Vancouver, Harbour Centre 1400", -28, 18, 2, 45, 0.95,
                new String[] {"Harbourline Credit Union"}),
        new Plan("Interview Prep Workshop", "WORKSHOP", "SFU Burnaby, ASB 10900", -19, 18, 2, 40, 1.25, new String[0]),
        new Plan("Industry Mixer", "NETWORKING", "SFU Burnaby, Diamond Alumni Centre", -9, 18, 3, 70, 1.15,
                new String[] {"Fernwood Systems", "Quillstone Labs"}),
        new Plan("Mock Interview Night", "WORKSHOP", "SFU Burnaby, ASB 9896", 8, 18, 3, 30, 1.25,
                new String[] {"Tidewater Data Co."}),
        new Plan("End of Term Games Night", "SOCIAL", "SFU Burnaby, MBC Rotunda", 17, 18, 3, 60, 0.6, new String[0]));

    private final JdbcTemplate jdbc;
    private final PasswordEncoder passwordEncoder;
    private final CardNumberHasher cardHasher;
    private final SecureTokens tokens;
    private final Clock clock;

    private final Random random = new Random(2027);

    public DemoDataSeeder(JdbcTemplate jdbc, PasswordEncoder passwordEncoder, CardNumberHasher cardHasher,
                          SecureTokens tokens, Clock clock) {
        this.jdbc = jdbc;
        this.passwordEncoder = passwordEncoder;
        this.cardHasher = cardHasher;
        this.tokens = tokens;
        this.clock = clock;
    }

    private record DemoMember(UUID id, double engagement, boolean hasCard) {
    }

    private record Seat(DemoMember member, Instant rsvpAt) {
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        Integer existing = jdbc.queryForObject("select count(*) from organizer where email = ?", Integer.class, DEMO_EMAIL);
        if (existing != null && existing > 0) {
            log.info("Demo club already exists; not seeding again.");
            return;
        }
        Instant now = clock.instant();

        UUID clubId = UUID.randomUUID();
        jdbc.update("insert into club (id, name) values (?, ?)", clubId, "WiCS Demo Club");
        jdbc.update("insert into organizer (id, club_id, email, password_hash, display_name) values (?, ?, ?, ?, ?)",
                UUID.randomUUID(), clubId, DEMO_EMAIL, passwordEncoder.encode(DEMO_PASSWORD), "Maya Chen");

        List<DemoMember> members = createMembers(clubId, now);
        for (Plan plan : PLANS) {
            createEvent(clubId, plan, members, now);
        }
        log.info("Seeded demo club with {} members and {} events. Log in as {} / {}",
                members.size(), PLANS.size(), DEMO_EMAIL, DEMO_PASSWORD);
    }

    private List<DemoMember> createMembers(UUID clubId, Instant now) {
        List<DemoMember> members = new ArrayList<>();
        int cardSerial = 1;
        for (int i = 0; i < MEMBER_COUNT; i++) {
            // Walk the two name lists at different speeds, so all 120 combinations are different.
            String first = FIRST_NAMES[i % FIRST_NAMES.length];
            String last = LAST_NAMES[(i * 7 + i / FIRST_NAMES.length) % LAST_NAMES.length];
            String email = (first + "." + last + "@example.com").toLowerCase();

            // A few regulars come to almost everything; most people come now and then.
            double engagement = Math.pow(random.nextDouble(), 1.6);
            boolean hasCard = random.nextDouble() < 0.45;
            String cardHash = hasCard ? cardHasher.hash(String.format("29999%09d", cardSerial++)) : null;

            UUID id = UUID.randomUUID();
            jdbc.update("""
                    insert into member (id, club_id, name, email, card_hash, card_linked_at, created_at)
                    values (?, ?, ?, ?, ?, ?, ?)""",
                    id, clubId, first + " " + last, email, cardHash, hasCard ? ts(now.minus(Duration.ofDays(60))) : null,
                    ts(now.minus(Duration.ofDays(80))));
            members.add(new DemoMember(id, engagement, hasCard));
        }
        return members;
    }

    private void createEvent(UUID clubId, Plan plan, List<DemoMember> members, Instant now) {
        LocalDate day = LocalDate.ofInstant(now, ZONE).plusDays(plan.daysFromToday());
        Instant startsAt = day.atTime(LocalTime.of(plan.startHour(), 0)).atZone(ZONE).toInstant();
        Instant endsAt = startsAt.plus(Duration.ofHours(plan.hours()));
        boolean over = endsAt.isBefore(now);

        UUID eventId = UUID.randomUUID();
        jdbc.update("""
                insert into event (id, club_id, title, description, location, starts_at, ends_at, capacity, category, created_at)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                eventId, clubId, plan.title(), description(plan), plan.location(), ts(startsAt), ts(endsAt),
                plan.capacity(), plan.category(), ts(startsAt.minus(Duration.ofDays(21))));

        List<UUID> sponsorIds = new ArrayList<>();
        for (String name : plan.sponsors()) {
            UUID sponsorId = UUID.randomUUID();
            jdbc.update("insert into sponsor (id, event_id, name, booth_code) values (?, ?, ?, ?)",
                    sponsorId, eventId, name, tokens.longToken());
            sponsorIds.add(sponsorId);
        }

        // Who RSVPs, in the order they did it. RSVPs open two weeks before and close when it starts.
        int wanted = (int) Math.round(plan.capacity() * plan.demand());
        List<Seat> seats = pickAttendees(members, wanted).stream()
                .map(member -> new Seat(member, randomBetween(startsAt.minus(Duration.ofDays(14)),
                        startsAt.minus(Duration.ofHours(2)))))
                .sorted(Comparator.comparing(Seat::rsvpAt))
                .toList();

        // First come, first served; everyone after capacity joins the waitlist.
        List<Seat> confirmed = new ArrayList<>(seats.subList(0, Math.min(plan.capacity(), seats.size())));
        List<Seat> waitlist = new ArrayList<>(seats.subList(confirmed.size(), seats.size()));

        // About 6% of confirmed people cancel; each cancellation hands the seat to the next on the waitlist.
        List<Seat> cancelled = new ArrayList<>();
        List<Instant> cancelledAt = new ArrayList<>();
        List<Seat> promoted = new ArrayList<>();
        List<Instant> promotedAt = new ArrayList<>();
        for (Seat seat : List.copyOf(confirmed)) {
            if (random.nextDouble() < 0.06) {
                Instant when = randomBetween(seat.rsvpAt(), startsAt.minus(Duration.ofHours(1)));
                confirmed.remove(seat);
                cancelled.add(seat);
                cancelledAt.add(when);
                if (!waitlist.isEmpty()) {
                    Seat next = waitlist.removeFirst();
                    confirmed.add(next);
                    promoted.add(next);
                    promotedAt.add(when);
                }
            }
        }

        for (Seat seat : confirmed) {
            int index = promoted.indexOf(seat);
            UUID rsvpId = insertRsvp(eventId, seat, "CONFIRMED", index >= 0 ? promotedAt.get(index) : null, null);
            if (over) {
                checkInAndMeetSponsors(rsvpId, seat, startsAt, plan.hours(), sponsorIds);
            }
        }
        for (Seat seat : waitlist) {
            insertRsvp(eventId, seat, "WAITLISTED", null, null);
        }
        for (int i = 0; i < cancelled.size(); i++) {
            insertRsvp(eventId, cancelled.get(i), "CANCELLED", null, cancelledAt.get(i));
        }
    }

    /** Picks distinct members, favouring the more engaged ones. */
    private List<DemoMember> pickAttendees(List<DemoMember> members, int wanted) {
        List<DemoMember> pool = new ArrayList<>(members);
        List<DemoMember> picked = new ArrayList<>();
        while (picked.size() < wanted && !pool.isEmpty()) {
            DemoMember candidate = pool.get(random.nextInt(pool.size()));
            if (random.nextDouble() < 0.15 + candidate.engagement() * 0.85) {
                picked.add(candidate);
                pool.remove(candidate);
            }
        }
        return picked;
    }

    private UUID insertRsvp(UUID eventId, Seat seat, String status, Instant promotedAt, Instant cancelledAt) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                insert into rsvp (id, event_id, member_id, status, manage_token, ticket_code, sponsor_opt_in,
                                  created_at, promoted_at, cancelled_at)
                values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                id, eventId, seat.member().id(), status, tokens.longToken(), tokens.shortToken(),
                random.nextDouble() < 0.4, ts(seat.rsvpAt()), ts(promotedAt), ts(cancelledAt));
        return id;
    }

    /**
     * Decides whether a confirmed person showed up. Regulars nearly always come; occasional members are
     * likelier to be no-shows. Arrivals bunch up in the first half hour, like a real door.
     */
    private void checkInAndMeetSponsors(UUID rsvpId, Seat seat, Instant startsAt, int hours, List<UUID> sponsorIds) {
        double showChance = 0.62 + seat.member().engagement() * 0.33;
        if (random.nextDouble() > showChance) {
            return; // a no-show
        }
        long minutes = Math.round(Math.abs(random.nextGaussian()) * 22) - 10;
        minutes = Math.min(minutes, hours * 60L - 30);
        Instant arrived = startsAt.plus(Duration.ofMinutes(minutes)).plusSeconds(random.nextInt(60));
        String method = seat.member().hasCard() && random.nextDouble() < 0.7 ? "CARD"
                : random.nextDouble() < 0.88 ? "QR" : "MANUAL";
        jdbc.update("update rsvp set checked_in_at = ?, check_in_method = ? where id = ?", ts(arrived), method, rsvpId);

        Boolean optedIn = jdbc.queryForObject("select sponsor_opt_in from rsvp where id = ?", Boolean.class, rsvpId);
        if (!Boolean.TRUE.equals(optedIn)) {
            return;
        }
        for (UUID sponsorId : sponsorIds) {
            if (random.nextDouble() < 0.55) {
                jdbc.update("insert into sponsor_lead (id, sponsor_id, rsvp_id, scanned_at) values (?, ?, ?, ?)",
                        UUID.randomUUID(), sponsorId, rsvpId,
                        ts(arrived.plus(Duration.ofMinutes(10 + random.nextInt(hours * 50)))));
            }
        }
    }

    private static String description(Plan plan) {
        return switch (plan.category()) {
            case "WORKSHOP" -> "Hands-on session run by senior members. Bring a laptop. Snacks provided.";
            case "PANEL" -> "Four speakers from industry and research share how they got started, then take questions.";
            case "HACKATHON" -> "Build something in a day with a team of up to four. Meals, mentors and prizes.";
            case "NETWORKING" -> "Meet engineers, recruiters and alumni in a relaxed setting. Name tags at the door.";
            default -> "Come hang out, meet new people and grab some food.";
        };
    }

    private Instant randomBetween(Instant from, Instant to) {
        long span = Math.max(1, Duration.between(from, to).toSeconds());
        return from.plusSeconds((long) (random.nextDouble() * span));
    }

    private static Timestamp ts(Instant instant) {
        return instant == null ? null : Timestamp.from(instant);
    }
}
