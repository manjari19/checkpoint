package app.checkpoint.organizer;

import java.io.Serializable;
import java.util.UUID;

/**
 * The logged-in organizer, stored in the HTTP session after login.
 * Controllers receive it with @AuthenticationPrincipal. It deliberately holds no password hash.
 */
public record CurrentOrganizer(UUID id, UUID clubId, String clubName, String email, String displayName)
        implements Serializable {
}
