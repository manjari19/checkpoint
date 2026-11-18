package app.checkpoint.report;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class TermTest {

    private static final ZoneId VANCOUVER = ZoneId.of("America/Vancouver");

    @Test
    void datesMapToSfuTerms() {
        assertThat(Term.containing(LocalDate.of(2027, 1, 20)).id()).isEqualTo("2027-spring");
        assertThat(Term.containing(LocalDate.of(2027, 4, 30)).id()).isEqualTo("2027-spring");
        assertThat(Term.containing(LocalDate.of(2027, 5, 1)).id()).isEqualTo("2027-summer");
        assertThat(Term.containing(LocalDate.of(2027, 9, 1)).id()).isEqualTo("2027-fall");
        assertThat(Term.containing(LocalDate.of(2027, 12, 31)).id()).isEqualTo("2027-fall");
    }

    @Test
    void termBoundariesUseTheClubsTimeZone() {
        // An evening event on April 30 in Vancouver is already May 1 in UTC, but still the Spring term locally.
        Instant lateApril = LocalDateTime.of(2027, 4, 30, 19, 0).atZone(VANCOUVER).toInstant();
        assertThat(lateApril.toString()).startsWith("2027-05-01");
        assertThat(Term.containing(lateApril, VANCOUVER).id()).isEqualTo("2027-spring");

        Term spring = Term.parse("2027-spring");
        assertThat(spring.start(VANCOUVER)).isEqualTo(LocalDate.of(2027, 1, 1).atStartOfDay(VANCOUVER).toInstant());
        assertThat(spring.end(VANCOUVER)).isEqualTo(LocalDate.of(2027, 5, 1).atStartOfDay(VANCOUVER).toInstant());
    }

    @Test
    void parsesAndLabelsTerms() {
        Term fall = Term.parse("2026-FALL");
        assertThat(fall.id()).isEqualTo("2026-fall");
        assertThat(fall.label()).isEqualTo("Fall 2026");
        assertThatThrownBy(() -> Term.parse("2026-winter")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Term.parse("fall")).isInstanceOf(IllegalArgumentException.class);
    }
}
