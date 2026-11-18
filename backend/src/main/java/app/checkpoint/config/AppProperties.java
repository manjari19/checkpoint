package app.checkpoint.config;

import jakarta.validation.constraints.NotBlank;
import java.time.ZoneId;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Settings under the "checkpoint" prefix in application.yml.
 *
 * @param publicBaseUrl where the Angular app is served; used to build links in emails
 * @param timeZone      the club's local time zone, used for terms and email dates
 * @param mailFrom      sender address for outgoing email
 * @param cardHashKey   secret key for hashing student card numbers (see CardNumberHasher)
 * @param bootstrap     the first club and organizer account, created on an empty database
 */
@Validated
@ConfigurationProperties(prefix = "checkpoint")
public record AppProperties(
        @NotBlank String publicBaseUrl,
        ZoneId timeZone,
        @NotBlank String mailFrom,
        @NotBlank String cardHashKey,
        Bootstrap bootstrap) {

    public record Bootstrap(String clubName, String adminEmail, String adminPassword, String adminName) {
    }
}
