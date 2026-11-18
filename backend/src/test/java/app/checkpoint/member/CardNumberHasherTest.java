package app.checkpoint.member;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import app.checkpoint.config.AppProperties;
import java.time.ZoneId;
import org.junit.jupiter.api.Test;

class CardNumberHasherTest {

    private final CardNumberHasher hasher = hasherWithKey("test-key");

    @Test
    void sameCardAlwaysGivesTheSameHash() {
        assertThat(hasher.hash("301234567")).isEqualTo(hasher.hash("301234567"));
    }

    @Test
    void formattingDifferencesDoNotMatter() {
        assertThat(hasher.hash("301 234-567")).isEqualTo(hasher.hash("301234567"));
        assertThat(hasher.hash("ab12345")).isEqualTo(hasher.hash("AB12345"));
    }

    @Test
    void theHashDoesNotContainTheNumber() {
        String hash = hasher.hash("301234567");
        assertThat(hash).hasSize(64).doesNotContain("301234567");
    }

    @Test
    void differentKeysGiveDifferentHashesSoALeakedDatabaseIsNotEnough() {
        assertThat(hasherWithKey("another-key").hash("301234567")).isNotEqualTo(hasher.hash("301234567"));
    }

    @Test
    void obviouslyInvalidInputIsRejected() {
        assertThatThrownBy(() -> hasher.hash("12")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> hasher.hash("   ")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> hasher.hash(null)).isInstanceOf(IllegalArgumentException.class);
    }

    private static CardNumberHasher hasherWithKey(String key) {
        return new CardNumberHasher(new AppProperties("http://localhost", ZoneId.of("America/Vancouver"),
                "test@test.local", key, null));
    }
}
