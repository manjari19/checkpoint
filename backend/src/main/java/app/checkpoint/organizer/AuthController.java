package app.checkpoint.organizer;

import app.checkpoint.organizer.dto.LoginRequest;
import app.checkpoint.organizer.dto.NewOrganizerRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Session login for organizers. After a successful login the browser holds an HttpOnly session cookie;
 * logout is handled by Spring Security at POST /api/auth/logout (see SecurityConfig).
 */
@Tag(name = "Auth", description = "Organizer login")
@RestController
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final OrganizerService organizers;
    private final SecurityContextHolderStrategy contextHolder = SecurityContextHolder.getContextHolderStrategy();

    public AuthController(AuthenticationManager authenticationManager,
                          SecurityContextRepository securityContextRepository, OrganizerService organizers) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.organizers = organizers;
    }

    @Operation(summary = "Log in. Returns 401 for a wrong email or password.")
    @PostMapping("/api/auth/login")
    public CurrentOrganizer login(@Valid @RequestBody LoginRequest login, HttpServletRequest request,
                                  HttpServletResponse response) {
        // Checks the password against the BCrypt hash. Throws BadCredentialsException (401) if wrong.
        Authentication checked = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(login.email(), login.password()));

        // Store our own principal in the session: the ids controllers need, and no password hash.
        CurrentOrganizer organizer = organizers.currentOrganizer(checked.getName());
        Authentication authenticated = UsernamePasswordAuthenticationToken.authenticated(
                organizer, null, List.of(new SimpleGrantedAuthority("ROLE_ORGANIZER")));

        // Give the logged-in user a new session id so a session id planted before login is useless
        // (session fixation protection).
        if (request.getSession(false) != null) {
            request.changeSessionId();
        }
        SecurityContext context = contextHolder.createEmptyContext();
        context.setAuthentication(authenticated);
        contextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
        return organizer;
    }

    @Operation(summary = "The logged-in organizer, or 401")
    @GetMapping("/api/auth/me")
    public CurrentOrganizer me(@AuthenticationPrincipal CurrentOrganizer me) {
        return me;
    }

    @Operation(summary = "Add another organizer to your club")
    @PostMapping("/api/organizers")
    @ResponseStatus(HttpStatus.CREATED)
    public CurrentOrganizer addOrganizer(@AuthenticationPrincipal CurrentOrganizer me,
                                         @Valid @RequestBody NewOrganizerRequest request) {
        return organizers.create(me, request);
    }
}
