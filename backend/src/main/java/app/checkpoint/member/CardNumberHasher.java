package app.checkpoint.member;

import app.checkpoint.config.AppProperties;
import java.nio.charset.StandardCharsets;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.stereotype.Component;

/**
 * Turns a student card number into a keyed hash (HMAC-SHA256) so the raw number is never stored.
 *
 * <p>Why a keyed hash and not plain SHA-256: student numbers are short and predictable (for example
 * 9 digits). Anyone with a copy of the database could hash every possible number in seconds and
 * reverse a plain hash. With HMAC, they also need the secret key, which lives in the server's
 * environment and not in the database.
 *
 * <p>Why not encryption: we never need the number back. We only need to answer "is this the same
 * card as before?", which a hash answers without the ability to recover the number.
 */
@Component
public class CardNumberHasher {

    private static final String ALGORITHM = "HmacSHA256";

    private final SecretKeySpec key;

    public CardNumberHasher(AppProperties properties) {
        this.key = new SecretKeySpec(properties.cardHashKey().getBytes(StandardCharsets.UTF_8), ALGORITHM);
    }

    /**
     * Normalises a scanned or typed card number: keeps letters and digits, upper-cased, so
     * "301 234-567" and "301234567" hash to the same value.
     */
    public static String normalise(String cardNumber) {
        String cleaned = cardNumber == null ? "" : cardNumber.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        if (cleaned.length() < 5 || cleaned.length() > 32) {
            throw new IllegalArgumentException("That does not look like a student card number.");
        }
        return cleaned;
    }

    public String hash(String cardNumber) {
        try {
            Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(key);
            byte[] digest = mac.doFinal(normalise(cardNumber).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new IllegalStateException("HMAC-SHA256 is not available", e);
        }
    }
}
