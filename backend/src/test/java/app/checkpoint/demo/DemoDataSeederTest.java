package app.checkpoint.demo;

import static org.assertj.core.api.Assertions.assertThat;

import app.checkpoint.common.SecureTokens;
import app.checkpoint.member.CardNumberHasher;
import app.checkpoint.support.IntegrationTest;
import java.time.Clock;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;

/** The demo seeder, run against the real schema (it is normally only active with the "demo" profile). */
class DemoDataSeederTest extends IntegrationTest {

    @Autowired
    JdbcTemplate jdbc;
    @Autowired
    PasswordEncoder passwordEncoder;
    @Autowired
    CardNumberHasher hasher;
    @Autowired
    SecureTokens tokens;
    @Autowired
    Clock clock;

    @Test
    void seedsABelievableClubOnceWithFakeCardNumbersOnly() {
        DemoDataSeeder seeder = new DemoDataSeeder(jdbc, passwordEncoder, hasher, tokens, clock);
        seeder.run(null);
        seeder.run(null); // a second run must not add anything

        String club = "(select club_id from organizer where email = '" + DemoDataSeeder.DEMO_EMAIL + "')";
        assertThat(jdbc.queryForObject("select count(*) from organizer where email = ?", Integer.class,
                DemoDataSeeder.DEMO_EMAIL)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select count(*) from member where club_id = " + club, Integer.class)).isEqualTo(120);
        assertThat(jdbc.queryForObject("select count(*) from event where club_id = " + club, Integer.class)).isEqualTo(10);

        // Every stored card hash belongs to a made-up number from the 29999... range.
        Set<String> fakeHashes = IntStream.rangeClosed(1, 120)
                .mapToObj(i -> hasher.hash(String.format("29999%09d", i)))
                .collect(Collectors.toSet());
        List<String> stored = jdbc.queryForList(
                "select card_hash from member where card_hash is not null and club_id = " + club, String.class);
        assertThat(stored).isNotEmpty().allMatch(fakeHashes::contains);

        // History looks real: people checked in, some didn't come, and full events had waitlists.
        String rsvps = "from rsvp r join event e on e.id = r.event_id where e.club_id = " + club;
        assertThat(jdbc.queryForObject("select count(*) " + rsvps + " and r.checked_in_at is not null", Integer.class)).isPositive();
        assertThat(jdbc.queryForObject("select count(*) " + rsvps + " and r.status = 'CONFIRMED' and r.checked_in_at is null"
                + " and e.ends_at < now()", Integer.class)).isPositive();
        assertThat(jdbc.queryForObject("select count(*) " + rsvps + " and r.status = 'WAITLISTED'", Integer.class)).isPositive();
        // Never more confirmed people than seats.
        assertThat(jdbc.queryForObject("select count(*) from event e where e.club_id = " + club
                + " and e.capacity < (select count(*) from rsvp r where r.event_id = e.id and r.status = 'CONFIRMED')",
                Integer.class)).isZero();
    }
}
