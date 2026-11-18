package app.checkpoint.common;

import java.security.SecureRandom;
import java.util.Base64;
import org.springframework.stereotype.Component;

/** Generates unguessable, URL-safe random tokens for ticket links, QR codes and booth links. */
@Component
public class SecureTokens {

    private final SecureRandom random = new SecureRandom();

    /** 32 random bytes (256 bits), encoded as 43 URL-safe characters. */
    public String longToken() {
        return encode(32);
    }

    /** 16 random bytes (128 bits). Shorter so QR codes stay small and easy to scan. */
    public String shortToken() {
        return encode(16);
    }

    private String encode(int bytes) {
        byte[] buffer = new byte[bytes];
        random.nextBytes(buffer);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buffer);
    }
}
